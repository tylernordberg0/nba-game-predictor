"""Interactive betting simulator: log hypothetical bets on today's picks and
score them once games are final. Records go to results/bets.csv.

    python -m src.betting

Odds are typed in by hand from a sportsbook before tip-off; the time you log
them is saved in placed_at. Selection rule (unchanged from the original
simulator): every pick with model confidence >= 60% is offered.

Only the moneyline odds for the team you're betting on are asked for. Edge is
the model's probability minus the implied probability of those odds, vig
included, since that's the bar the bet has to clear. (Older rows may also have
opp_odds/novig_prob from when the opponent's price was entered; new bets leave
them blank.)

Before asking for odds, each pick shows its fair odds (the model's probability
as a price) and its limit: the worst odds still worth taking, where the model's
probability is MIN_EDGE above the implied probability. The margin covers the
model's slight overconfidence on strong picks (backtest: 65%+ picks averaged
73.6% confidence and won 71.8%). Odds worse than the limit get a warning and
are only logged if you confirm.

Typos never skip a bet: blank or invalid input is asked again. A game is only
skipped when you type 's'. Each bet is saved as soon as it's entered, and you
can run the command again later the same day to bet on picks you skipped.
"""
import math
from datetime import datetime, timezone

import pandas as pd

from src.config import BETS_CSV, today_eastern
from src.tracking import load_predictions

MIN_CONFIDENCE = 0.60
MIN_EDGE = 0.03  # model probability must beat the implied probability by this much
COLUMNS = ["date", "game_id", "matchup", "pick", "model_prob", "odds", "opp_odds",
           "implied_prob", "novig_prob", "edge", "stake", "book", "placed_at", "result", "profit", "source"]


def implied_prob(american: int) -> float:
    """Break-even win probability of American odds (vig included).
    -150 -> 150/250 = 0.600; +130 -> 100/230 = 0.435."""
    return -american / (-american + 100) if american < 0 else 100 / (american + 100)


def to_american(prob: float) -> int:
    """Odds whose implied probability is `prob`, rounded toward the bettor-favourable
    side so the result never implies more than `prob`. 0.60 -> -150; 0.40 -> +150."""
    raw = -prob / (1 - prob) * 100 if prob >= 0.5 else (1 - prob) / prob * 100
    return math.ceil(round(raw, 6))  # round first so float noise (-149.99999...) can't shift it


def payout(american: int, stake: float) -> float:
    """Profit on a winning bet (stake not included)."""
    return stake * (american / 100 if american > 0 else 100 / -american)


def load_bets() -> pd.DataFrame:
    if not BETS_CSV.exists():
        return pd.DataFrame(columns=COLUMNS)
    bets = pd.read_csv(BETS_CSV, dtype={"game_id": str, "date": str, "result": str, "book": str, "placed_at": str})
    # `source` (auto = placed by src.auto_bet, manual = typed into nbabet) was added
    # later; every bet before it was manual.
    bets["source"] = bets["source"].fillna("manual") if "source" in bets else "manual"
    return bets


def save_bets(bets: pd.DataFrame) -> None:
    bets = bets.copy()
    for c in ["model_prob", "implied_prob", "novig_prob", "edge", "stake", "profit"]:
        bets[c] = pd.to_numeric(bets[c])
    bets[COLUMNS].to_csv(BETS_CSV, index=False, float_format="%.4f")


def score_bets(bets: pd.DataFrame, preds: pd.DataFrame) -> pd.DataFrame:
    """Settle any open bet whose game has a result in predictions.csv."""
    winners = preds.dropna(subset=["winner"]).set_index("game_id")["winner"]
    for i, b in bets[bets["result"].isna()].iterrows():
        if b["game_id"] in winners.index:
            won = winners[b["game_id"]] == b["pick"]
            bets.loc[i, "result"] = "W" if won else "L"
            bets.loc[i, "profit"] = payout(int(b["odds"]), b["stake"]) if won else -b["stake"]
    return bets


def money(x: float) -> str:
    return f"{'+' if x >= 0 else '-'}${abs(x):.2f}"


def report_bets(bets: pd.DataFrame, newly: pd.Series) -> None:
    """Print each bet settled in this run, grouped by date. If none were settled
    now, show the most recent day of settled bets."""
    settled = bets.dropna(subset=["result"])
    if settled.empty:
        return
    dates = sorted(bets.loc[newly, "date"].unique()) if newly.any() else [settled["date"].max()]
    for d in dates:
        day = settled[settled["date"] == d]
        w = int((day["result"] == "W").sum())
        print(f"\nBets for {d}: {w}-{len(day) - w}, {money(day['profit'].sum())} on ${day['stake'].sum():.2f} staked")
        for b in day.itertuples():
            print(f"  {b.result} {b.matchup:<11} {b.pick:<4} {int(b.odds):+5d}  ${b.stake:>6.2f}  {money(b.profit):>9}")


def print_record(bets: pd.DataFrame) -> None:
    """All-time betting record, split into automatic and manual bets when both exist."""
    settled = bets.dropna(subset=["result"])
    if settled.empty:
        return
    print()
    groups = [("Bets all-time", settled)]
    if settled["source"].nunique() > 1:
        groups += [(f"  {src.capitalize()}", g) for src, g in settled.groupby("source")]
    for label, g in groups:
        wagered, profit = g["stake"].sum(), g["profit"].sum()
        w = int((g["result"] == "W").sum())
        print(f"{label}: {w}-{len(g) - w} | wagered ${wagered:.2f} | P/L {money(profit)} | ROI {profit / wagered:+.1%}")


def settle(bets: pd.DataFrame, preds: pd.DataFrame) -> pd.DataFrame:
    """Settle open bets that now have a result, and print what was settled."""
    was_open = bets["result"].isna().copy()
    bets = score_bets(bets, preds)
    report_bets(bets, was_open & bets["result"].notna())
    return bets


def ask_book(last: str | None) -> str:
    """Sportsbook name. Enter reuses the last one you logged."""
    prompt = f"Sportsbook [{last}]: " if last else "Sportsbook you're taking odds from: "
    while True:
        book = input(prompt).strip()
        if book:
            return book
        if last:
            return last


def ask_odds(team: str) -> int | None:
    """American moneyline odds for `team`, or None if you type 's'."""
    while True:
        s = input(f"  Moneyline odds for {team} (e.g. -110, +150), or 's' to skip: ").strip()
        if s.lower() == "s":
            return None
        try:
            odds = int(s.replace(" ", ""))
        except ValueError:
            print("  Enter a whole number like -110 or +150.")
            continue
        if -100 < odds < 100:
            print("  American odds are -100 or lower, or +100 or higher.")
            continue
        return odds


def ask_yes_no(prompt: str) -> bool:
    """Asks again until the answer is y or n, so a stray Enter decides nothing."""
    while True:
        s = input(prompt).strip().lower()
        if s in ("y", "yes"):
            return True
        if s in ("n", "no"):
            return False
        print("  Type y or n.")


def ask_stake() -> float | None:
    """Stake in dollars, or None if you type 's'."""
    while True:
        s = input("  Stake: $").strip()
        if s.lower() == "s":
            return None
        try:
            stake = float(s.lstrip("$").replace(",", ""))
        except ValueError:
            print("  Enter an amount like 10 or 25.50 (or 's' to skip this bet).")
            continue
        if not math.isfinite(stake) or stake <= 0:
            print("  Stake must be more than $0.")
            continue
        return round(stake, 2)


def main() -> None:
    today = today_eastern().isoformat()
    preds = load_predictions()
    bets = settle(load_bets(), preds)

    todays = preds[(preds["date"] == today) & (preds["confidence"] >= MIN_CONFIDENCE)]
    logged_today = bets[bets["date"] == today]
    remaining = todays[~todays["game_id"].isin(logged_today["game_id"])]
    if todays.empty:
        print(f"No saved picks >= {MIN_CONFIDENCE:.0%} confidence for {today}. Run `python -m src.run_daily` first.")
    elif remaining.empty:
        print("You've logged a bet on every qualifying pick today:")
        print(logged_today[["matchup", "pick", "odds", "stake"]].to_string(index=False))
    else:
        if len(logged_today):
            print(f"Already logged {len(logged_today)} bet(s) today; showing the {len(remaining)} pick(s) without one.")
        books = bets["book"].dropna()
        book = ask_book(books.iloc[-1] if len(books) else None)
        n, staked = 0, 0.0
        for p in remaining.itertuples():
            matchup = f"{p.away} @ {p.home}"
            limit_prob = p.confidence - MIN_EDGE
            limit = to_american(limit_prob)
            print(f"\n{matchup}: {p.pick} ({p.confidence:.1%}) | fair {to_american(p.confidence):+d}"
                  f" | bet only at {limit:+d} or better")
            odds = ask_odds(p.pick)
            if odds is None:
                print("  Skipped.")
                continue
            q = implied_prob(odds)
            edge = p.confidence - q
            ev = p.confidence * payout(odds, 1) - (1 - p.confidence)
            print(f"  Implied {q:.1%} | model {p.confidence:.1%} | edge {edge:+.1%} | model EV per $1: {ev:+.3f}")
            if q > limit_prob:
                why = ("loses money on average by the model's own probability" if ev < 0
                       else f"has less than the {MIN_EDGE:.0%} margin the model needs")
                print(f"  Worse than the {limit:+d} limit: this bet {why}.")
                if not ask_yes_no("  Bet anyway? (y/n): "):
                    print("  Skipped.")
                    continue
            stake = ask_stake()
            if stake is None:
                print("  Skipped.")
                continue
            row = {"date": today, "game_id": p.game_id, "matchup": matchup, "pick": p.pick,
                   "model_prob": p.confidence, "odds": odds, "opp_odds": None, "implied_prob": q,
                   "novig_prob": None, "edge": edge, "stake": stake, "book": book,
                   "placed_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                   "result": None, "profit": None, "source": "manual"}
            bets.loc[len(bets)] = [row[c] for c in COLUMNS]
            save_bets(bets)  # saved right away, so Ctrl+C later doesn't lose it
            n, staked = n + 1, staked + stake
            print(f"  Logged {p.pick} {odds:+d}, ${stake:.2f}.")
        if n:
            print(f"\nLogged {n} bet(s), ${staked:.2f} staked.")

    save_bets(bets)
    print_record(bets)


if __name__ == "__main__":
    main()
