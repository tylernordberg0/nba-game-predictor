"""One-time conversion of the original JSON history (results/archive/*.json,
kept unmodified) into results/predictions.csv and results/bets.csv.

Picks and probabilities are copied exactly. Game IDs are looked up from the
NBA game logs by date + home team, and results are filled from those logs.
predicted_at, book and placed_at were never recorded, so they stay blank.

    python -m scripts.convert_legacy_history
"""
import json

import pandas as pd

from src.betting import COLUMNS as BET_COLUMNS, save_bets, score_bets
from src.config import RESULTS_DIR, seasons_through, today_eastern
from src.data import load_game_logs
from src.tracking import COLUMNS as PRED_COLUMNS, fill_results, save_predictions

ARCHIVE = RESULTS_DIR / "archive"


def main() -> None:
    logs = load_game_logs(seasons_through(today_eastern()), today_eastern())
    logs["date"] = logs["GAME_DATE"].dt.strftime("%Y-%m-%d")
    home_rows = logs[logs["MATCHUP"].str.contains("vs.", regex=False)]
    game_id = home_rows.set_index(["date", "TEAM_ABBREVIATION"])["GAME_ID"]

    rows = []
    for d, picks in json.loads((ARCHIVE / "predictions_history.json").read_text()).items():
        for p in picks:
            away, home = p["matchup"].split(" @ ")
            rows.append({"date": d, "game_id": game_id[(d, home)], "away": away, "home": home,
                         "pick": p["pick"], "home_win_prob": p["prob"], "confidence": p["confidence"],
                         "model_version": "v1", "predicted_at": None, "winner": None, "correct": None})
    preds = fill_results(pd.DataFrame(rows, columns=PRED_COLUMNS), logs)
    save_predictions(preds)

    rows = []
    for d, day in json.loads((ARCHIVE / "bets_history.json").read_text())["daily_bets"].items():
        for b in day["bets"]:
            away, home = b["matchup"].split(" @ ")
            q = -b["odds"] / (-b["odds"] + 100) if b["odds"] < 0 else 100 / (b["odds"] + 100)
            rows.append({"date": d, "game_id": game_id[(d, home)], "matchup": b["matchup"], "pick": b["pick"],
                         "model_prob": b["confidence"], "odds": b["odds"], "opp_odds": None,
                         "implied_prob": q, "novig_prob": None, "edge": b["confidence"] - q,
                         "stake": b["stake"], "book": None, "placed_at": None, "result": None, "profit": None})
    save_bets(score_bets(pd.DataFrame(rows, columns=BET_COLUMNS), preds))
    print(f"Converted {len(preds)} predictions and {len(rows)} bets.")


if __name__ == "__main__":
    main()
