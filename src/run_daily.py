"""Daily pipeline: score past picks, retrain, predict today's games.

    python -m src.run_daily                 # normal daily run
    python -m src.run_daily --dry-run       # print picks, write nothing
    python -m src.run_daily --date 2026-02-13 --dry-run
        # replay a past date: only games before that date are used to train and
        # build features, so it shows what the model would have picked then

Steps:
  1. Load game logs (cached) and fill in results for earlier unscored picks.
  2. Retrain logistic regression on every completed game.
  3. Predict today's games from each team's last-10-game form.
  4. Append the picks to results/predictions.csv, unless today is already
     saved or yesterday's games aren't all final (then features would be stale).
"""
import argparse
import logging
from datetime import date, datetime, timedelta, timezone

import pandas as pd

from src import config
from src.data import get_schedule, load_game_logs, team_abbreviations
from src.features import build_game_table, current_team_form
from src.model import home_win_probability, train
from src.tracking import fill_results, load_predictions, record, save_predictions


def rating(conf: float) -> str:
    if conf >= 0.65:
        return "BEST BET"
    if conf >= 0.58:
        return "Good"
    if conf >= 0.52:
        return "Lean"
    return "Toss-up"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--date", type=date.fromisoformat, help="predict this date instead of today (YYYY-MM-DD)")
    parser.add_argument("--dry-run", action="store_true", help="don't write results/predictions.csv")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    real_today = config.today_eastern()
    day = args.date or real_today
    replay = day != real_today
    dry_run = args.dry_run or replay  # never write a replayed date into the live record

    print("Loading game logs...")
    logs = load_game_logs(config.seasons_through(day), real_today)
    logs = logs[logs["GAME_DATE"].dt.date < day]  # only games already played by `day`

    # 1. Score earlier picks
    preds = load_predictions()
    preds = fill_results(preds, logs)
    yesterday = (day - timedelta(days=1)).isoformat()
    y = preds[preds["date"] == yesterday]
    yesterday_complete = y["winner"].notna().all()
    if len(y):
        c, n = int(y["correct"].sum()), int(y["correct"].notna().sum())
        print(f"\nYesterday ({yesterday}): {c}-{n - c}" + ("" if yesterday_complete else f"  ({len(y) - n} game(s) not final yet)"))

    # 2. Train
    games = build_game_table(logs)
    model = train(games)
    print(f"Model trained on {len(games):,} games")

    # 3. Predict
    schedule = get_schedule(day)
    new_rows = []
    if schedule.empty:
        print(f"\nNo games scheduled on {day}.")
    else:
        form = current_team_form(logs)
        abbr = team_abbreviations()
        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        for g in schedule.itertuples():
            p = home_win_probability(model, form, g.HOME_TEAM_ID, g.VISITOR_TEAM_ID)
            home, away = abbr.get(g.HOME_TEAM_ID, "UNK"), abbr.get(g.VISITOR_TEAM_ID, "UNK")
            new_rows.append({
                "date": day.isoformat(), "game_id": g.GAME_ID, "away": away, "home": home,
                "pick": home if p > 0.5 else away, "home_win_prob": p, "confidence": max(p, 1 - p),
                "model_version": config.MODEL_VERSION, "predicted_at": now,
                "winner": None, "correct": None,
            })
        new_rows.sort(key=lambda r: r["confidence"], reverse=True)

        print(f"\nPredictions for {day}")
        print(f"{'Matchup':<14}{'Pick':<7}{'Conf':>7}  Rating")
        for r in new_rows:
            print(f"{r['away'] + ' @ ' + r['home']:<14}{r['pick']:<7}{r['confidence']:>7.1%}  {rating(r['confidence'])}")

    # 4. Save
    already_saved = (preds["date"] == day.isoformat()).any()
    if dry_run:
        print("\n(dry run: nothing written)")
    else:
        if new_rows and already_saved:
            print("\nPredictions for today were already saved earlier; keeping the originals.")
        elif new_rows and not yesterday_complete:
            print("\nNOT saving today's picks: yesterday's results aren't all final, so team form "
                  "would be stale. Run again later.")
        elif new_rows:
            preds = pd.concat([preds, pd.DataFrame(new_rows)], ignore_index=True)
            print(f"\nSaved {len(new_rows)} predictions.")
        save_predictions(preds)  # also persists any newly filled results

    c, n = record(preds)
    if n:
        print(f"\nLive record: {c}-{n - c} ({c / n:.1%}) over {preds.dropna(subset=['correct'])['date'].nunique()} days")


if __name__ == "__main__":
    main()
