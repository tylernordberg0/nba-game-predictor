"""Interactive betting simulator: log hypothetical bets on today's picks and
score them once games are final. Records go to results/bets.csv.

    python -m src.betting

Odds are typed in by hand from a sportsbook before tip-off; the time you log
them is saved in placed_at. Selection rule (unchanged from the original
simulator): every pick with model confidence >= 60% is offered.

Vig: a sportsbook's two prices imply probabilities that add up to more than
100% (e.g. -110/-110 -> 52.4% + 52.4%). If you also enter the opponent's odds,
we divide out that overround to get a no-vig probability and measure edge
against it; otherwise edge is measured against the vig-inclusive price, which
is the bar a bet actually has to clear.
"""
from datetime import datetime, timezone

import pandas as pd

from src.config import BETS_CSV, today_eastern
from src.tracking import load_predictions

MIN_CONFIDENCE = 0.60
COLUMNS = ["date", "game_id", "matchup", "pick", "model_prob", "odds", "opp_odds",
           "implied_prob", "novig_prob", "edge", "stake", "book", "placed_at", "result", "profit"]


def implied_prob(american: int) -> float:
    """Break-even win probability of American odds (vig included).
    -150 -> 150/250 = 0.600; +130 -> 100/230 = 0.435."""
    return -american / (-american + 100) if american < 0 else 100 / (american + 100)


def payout(american: int, stake: float) -> float:
    """Profit on a winning bet (stake not included)."""
    return stake * (american / 100 if american > 0 else 100 / -american)


def load_bets() -> pd.DataFrame:
    if not BETS_CSV.exists():
        return pd.DataFrame(columns=COLUMNS)
    return pd.read_csv(BETS_CSV, dtype={"game_id": str, "date": str, "result": str, "book": str, "placed_at": str})


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


def ask_int(prompt: str, allow_blank: bool = False) -> int | None | str:
    s = input(prompt).strip()
    if s.lower() == "s":
        return "skip"
    if allow_blank and not s:
        return None
    try:
        return int(s)
    except ValueError:
        return "skip"


def main() -> None:
    today = today_eastern().isoformat()
    preds = load_predictions()
    bets = score_bets(load_bets(), preds)

    todays = preds[(preds["date"] == today) & (preds["confidence"] >= MIN_CONFIDENCE)]
    if todays.empty:
        print(f"No saved picks >= {MIN_CONFIDENCE:.0%} confidence for {today}. Run `python -m src.run_daily` first.")
    elif (bets["date"] == today).any():
        print("Bets already logged today:")
        print(bets[bets["date"] == today][["matchup", "pick", "odds", "stake"]].to_string(index=False))
    else:
        book = input("Sportsbook you're taking odds from: ").strip()
        new = []
        for p in todays.itertuples():
            matchup = f"{p.away} @ {p.home}"
            print(f"\n{matchup}: {p.pick} ({p.confidence:.1%})")
            odds = ask_int(f"  Odds for {p.pick} (e.g. -110, +150), or 's' to skip: ")
            if odds == "skip":
                continue
            opp = ask_int("  Opponent's odds (optional, Enter to skip): ", allow_blank=True)
            opp = None if opp == "skip" else opp
            q = implied_prob(odds)
            novig = q / (q + implied_prob(opp)) if opp is not None else None
            edge = p.confidence - (novig if novig is not None else q)
            ev = p.confidence * payout(odds, 1) - (1 - p.confidence)
            print(f"  Implied {q:.1%}" + (f", no-vig {novig:.1%}" if novig is not None else "")
                  + f" | model {p.confidence:.1%} | edge {edge:+.1%} | model EV per $1: {ev:+.3f}")
            if ev < 0:
                print("  Note: by the model's own probability this bet loses money on average.")
            try:
                stake = float(input("  Stake: $").strip())
            except ValueError:
                print("  Invalid amount, skipped.")
                continue
            new.append({"date": today, "game_id": p.game_id, "matchup": matchup, "pick": p.pick,
                        "model_prob": p.confidence, "odds": odds, "opp_odds": opp, "implied_prob": q,
                        "novig_prob": novig, "edge": edge, "stake": stake, "book": book,
                        "placed_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                        "result": None, "profit": None})
        if new:
            bets = pd.concat([bets, pd.DataFrame(new)], ignore_index=True)
            print(f"\nLogged {len(new)} bets, ${sum(b['stake'] for b in new):.2f} staked.")

    save_bets(bets)
    settled = bets.dropna(subset=["result"])
    if len(settled):
        wagered, profit = settled["stake"].sum(), settled["profit"].sum()
        w = (settled["result"] == "W").sum()
        print(f"\nAll-time: {w}-{len(settled) - w} | wagered ${wagered:.2f} | P/L {'+' if profit >= 0 else '-'}${abs(profit):.2f} | ROI {profit / wagered:+.1%}")


if __name__ == "__main__":
    main()
