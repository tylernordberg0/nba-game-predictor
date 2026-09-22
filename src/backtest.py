"""Reproduce every backtest number in the README.

    python -m src.backtest

Writes results/backtest_metrics.json and results/backtest_by_season.csv.

Evaluations (all respect time order; the model never trains on future games):
  * walk_forward (headline): for each season from 2017-18 on, train on every
    earlier season and predict that whole season. Pooled over ~10.7k games.
  * holdout: the notebook's method, first 80% of games by date to train, last 20% to test.
  * time_series_cv: sklearn TimeSeriesSplit with 5 expanding-window folds.
Baseline everywhere = always pick the home team.

Numbers can drift slightly between runs because the NBA occasionally revises
past box scores; data_pulled_through records the last game date used.
"""
import json

import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, brier_score_loss, log_loss
from sklearn.model_selection import TimeSeriesSplit, cross_val_score, train_test_split

from src import config
from src.data import load_game_logs
from src.features import FEATURES, build_game_table
from src.model import make_model

FIRST_TEST_SEASON = "2017-18"  # need at least two seasons of training data
CONFIDENCE_BUCKETS = [(0.50, 0.58), (0.58, 0.65), (0.65, 1.00)]  # matches the daily ratings


def walk_forward(games: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Per-season results plus every out-of-sample prediction."""
    rows, preds = [], []
    for season in sorted(s for s in games["SEASON"].unique() if s >= FIRST_TEST_SEASON):
        train, test = games[games["SEASON"] < season], games[games["SEASON"] == season]
        p = make_model().fit(train[FEATURES], train["HOME_TEAM_WINS"]).predict_proba(test[FEATURES])[:, 1]
        y = test["HOME_TEAM_WINS"]
        rows.append({"season": season, "games": len(test), "model_accuracy": accuracy_score(y, p > 0.5),
                     "home_baseline": y.mean(), "train_games": len(train)})
        preds.append(pd.DataFrame({"season": season, "y": y.values, "p": p}))
    return pd.DataFrame(rows), pd.concat(preds, ignore_index=True)


def main() -> None:
    today = config.today_eastern()
    logs = load_game_logs(config.seasons_through(today), today)
    games = build_game_table(logs)
    X, y = games[FEATURES], games["HOME_TEAM_WINS"]

    by_season, oos = walk_forward(games)
    conf = np.maximum(oos["p"], 1 - oos["p"])
    hit = (oos["p"] > 0.5) == oos["y"]
    calibration = [{"confidence": f"{lo:.0%}-{hi:.0%}", "games": int(k.sum()),
                    "accuracy": float(hit[k].mean()), "mean_confidence": float(conf[k].mean())}
                   for lo, hi in CONFIDENCE_BUCKETS for k in [(conf >= lo) & (conf < hi)]]

    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, shuffle=False)
    p_hold = make_model().fit(Xtr, ytr).predict_proba(Xte)[:, 1]
    tss = cross_val_score(make_model(), X, y, cv=TimeSeriesSplit(n_splits=5))

    metrics = {
        "data_pulled_through": games["GAME_DATE"].max().date().isoformat(),
        "total_games": len(games),
        "walk_forward": {
            "test_seasons": f"{by_season['season'].iloc[0]} to {by_season['season'].iloc[-1]}",
            "games": len(oos),
            "model_accuracy": float(hit.mean()),
            "home_baseline": float(oos["y"].mean()),
            "log_loss": float(log_loss(oos["y"], oos["p"])),
            "brier": float(brier_score_loss(oos["y"], oos["p"])),
            "calibration": calibration,
        },
        "holdout_80_20": {
            "train_games": len(Xtr), "test_games": len(Xte),
            "test_from": games["GAME_DATE"].iloc[len(Xtr)].date().isoformat(),
            "model_accuracy": float(accuracy_score(yte, p_hold > 0.5)),
            "home_baseline": float(yte.mean()),
        },
        "time_series_cv_5": {"fold_accuracy": [float(s) for s in tss], "mean": float(tss.mean())},
    }

    config.RESULTS_DIR.mkdir(exist_ok=True)
    config.BACKTEST_JSON.write_text(json.dumps(metrics, indent=2))
    by_season.to_csv(config.BACKTEST_SEASONS_CSV, index=False, float_format="%.4f")

    wf = metrics["walk_forward"]
    print(f"Walk-forward ({wf['test_seasons']}, {wf['games']:,} games): "
          f"{wf['model_accuracy']:.1%} vs home baseline {wf['home_baseline']:.1%}")
    print(by_season.to_string(index=False, float_format=lambda v: f"{v:.3f}"))
    h = metrics["holdout_80_20"]
    print(f"\n80/20 holdout: {h['model_accuracy']:.1%} vs {h['home_baseline']:.1%} ({h['test_games']:,} test games from {h['test_from']})")
    print(f"TimeSeriesSplit(5) mean: {tss.mean():.1%}")
    print("\nCalibration (walk-forward):")
    for c in calibration:
        print(f"  {c['confidence']:>8}: {c['games']:>5} games, accuracy {c['accuracy']:.1%} (avg confidence {c['mean_confidence']:.1%})")


if __name__ == "__main__":
    main()
