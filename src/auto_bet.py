"""Automatic $10 bets on fairly priced picks. Runs at the end of `nbapred`.

A saved pick gets a simulated $10 bet only if all of these hold:
  1. model confidence >= MIN_CONFIDENCE (60%), the same bar as `nbabet`
  2. today's odds pull has a DraftKings moneyline for the picked team
  3. the price is no shorter than MAX_FAVORITE (-250): heavy favorites pay too little
  4. the price is at or better than the limit: model probability >= implied + MIN_EDGE
  5. an edge of TOO_GOOD_EDGE (8 points) or more also needs no starter on the
     picked team listed Out; if that check can't run, the bet is skipped
  6. the game hasn't started and has no bet yet (manual or automatic)

These are simulated bets in results/bets.csv (source = auto); no money is placed.
Every decision, bet or skip, goes to results/auto_bets_log.csv with its reason.
"""
from datetime import datetime, timezone

import pandas as pd

from src.betting import COLUMNS, MIN_CONFIDENCE, MIN_EDGE, implied_prob, payout, to_american
from src.config import AUTO_BET_LOG, season_for_date
from src.odds import OddsError, fetch_moneylines, save_odds

AUTO_STAKE = 10.0
MAX_FAVORITE = -250
TOO_GOOD_EDGE = 0.08
LOG_COLUMNS = ["date", "game_id", "matchup", "pick", "model_prob", "odds", "edge",
               "decision", "reason", "checked_at"]


def _injury_check(day: str):
    """Returns a function team -> starters listed Out, or raises if the data can't be loaded."""
    from src.injuries import minutes_per_game, players_out, starters_out
    out = players_out()
    minutes = minutes_per_game(season_for_date(pd.Timestamp(day).date()))
    return lambda team: starters_out(team, out, minutes)


def run_auto_bets(picks: pd.DataFrame, bets: pd.DataFrame, day: str, dry_run: bool) -> pd.DataFrame:
    print(f"\nAutomatic ${AUTO_STAKE:.0f} bets for {day}" + ("  (dry run: preview only)" if dry_run else ""))
    if picks.empty or "confidence" not in picks:
        print("  No saved picks for today.")
        return bets
    picks = picks[picks["confidence"] >= MIN_CONFIDENCE].sort_values("confidence", ascending=False)
    if picks.empty:
        print(f"  No picks at {MIN_CONFIDENCE:.0%} or higher today.")
        return bets
    try:
        odds = fetch_moneylines()
    except OddsError as e:
        print(f"  Couldn't get odds: {e}. No automatic bets placed.")
        return bets
    if not dry_run:
        save_odds(odds)

    now = datetime.now(timezone.utc)
    stamp = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    has_bet = set(bets.loc[bets["date"] == day, "game_id"])
    injury_check, injury_error = None, None
    log_rows, placed = [], 0

    for p in picks.itertuples():
        matchup = f"{p.away} @ {p.home}"
        game = odds[(odds["date"] == day) & (odds["home"] == p.home) & (odds["away"] == p.away)]
        price, edge, reason = None, None, None
        if p.game_id in has_bet:
            reason = "already has a bet"
        elif game.empty:
            reason = "no DraftKings moneyline"
        else:
            g = game.iloc[0]
            price = int(g["home_odds"] if p.pick == p.home else g["away_odds"])
            q = implied_prob(price)
            edge = p.confidence - q
            limit = to_american(p.confidence - MIN_EDGE)
            if pd.Timestamp(g["commence_time"]) <= now:
                reason = "game already started"
            elif price < MAX_FAVORITE:
                reason = f"{price:+d} is shorter than the {MAX_FAVORITE} cap"
            elif q > p.confidence - MIN_EDGE:
                reason = f"{price:+d} is worse than the {limit:+d} limit"
            elif edge >= TOO_GOOD_EDGE:
                if injury_check is None and injury_error is None:
                    try:
                        injury_check = _injury_check(day)
                    except Exception as e:  # ESPN or stats.nba.com unavailable
                        injury_error = type(e).__name__
                if injury_error:
                    reason = f"edge {edge:+.1%} looks too good and the injury check failed ({injury_error})"
                else:
                    starters = injury_check(p.pick)
                    if starters:
                        reason = f"edge {edge:+.1%} looks too good: {', '.join(starters)} out"

        decision = "skip" if reason else "bet"
        log_rows.append({"date": day, "game_id": p.game_id, "matchup": matchup, "pick": p.pick,
                         "model_prob": p.confidence, "odds": price, "edge": edge,
                         "decision": decision, "reason": reason or "", "checked_at": stamp})
        if reason:
            print(f"  skip {p.pick:<4} {matchup:<11} {p.confidence:>4.0%}  {reason}")
            continue
        q = implied_prob(price)
        row = {"date": day, "game_id": p.game_id, "matchup": matchup, "pick": p.pick,
               "model_prob": p.confidence, "odds": price, "opp_odds": None, "implied_prob": q,
               "novig_prob": None, "edge": edge, "stake": AUTO_STAKE, "book": "draftkings",
               "placed_at": stamp, "result": None, "profit": None, "source": "auto"}
        bets.loc[len(bets)] = [row[c] for c in COLUMNS]
        has_bet.add(p.game_id)
        placed += 1
        print(f"  BET  {p.pick:<4} {matchup:<11} {p.confidence:>4.0%}  {price:+d} "
              f"(implied {q:.1%}, edge {edge:+.1%}, wins ${payout(price, AUTO_STAKE):.2f})")

    print(f"  {placed} placed, {len(log_rows) - placed} skipped.")
    if not dry_run:
        _save_log(pd.DataFrame(log_rows, columns=LOG_COLUMNS))
    return bets


def _save_log(new: pd.DataFrame) -> None:
    """Keep the latest decision per game: a rerun replaces that day's earlier rows."""
    if AUTO_BET_LOG.exists():
        old = pd.read_csv(AUTO_BET_LOG, dtype={"game_id": str, "date": str})
        keys = set(zip(new["date"], new["game_id"]))
        old = old[[(d, g) not in keys for d, g in zip(old["date"], old["game_id"])]]
        new = pd.concat([old, new], ignore_index=True)
    new.to_csv(AUTO_BET_LOG, index=False, float_format="%.4f")
