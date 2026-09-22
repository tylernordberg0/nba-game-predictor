"""The public live record: results/predictions.csv, one row per predicted game.

Rows are appended before tip-off (predicted_at is a UTC timestamp) and the
winner/correct columns are filled in on a later run once results are posted.
Existing picks are never modified; only the result columns get filled in.
"""
import pandas as pd

from src.config import PREDICTIONS_CSV

COLUMNS = ["date", "game_id", "away", "home", "pick", "home_win_prob", "confidence",
           "model_version", "predicted_at", "winner", "correct"]


def load_predictions() -> pd.DataFrame:
    if not PREDICTIONS_CSV.exists():
        return pd.DataFrame(columns=COLUMNS)
    return pd.read_csv(PREDICTIONS_CSV, dtype={"game_id": str, "date": str})


def save_predictions(df: pd.DataFrame) -> None:
    PREDICTIONS_CSV.parent.mkdir(parents=True, exist_ok=True)
    df = df[COLUMNS].sort_values(["date", "confidence"], ascending=[True, False])
    df.to_csv(PREDICTIONS_CSV, index=False, float_format="%.4f")


def fill_results(preds: pd.DataFrame, logs: pd.DataFrame) -> pd.DataFrame:
    """Fill winner/correct for any unscored game that now has a result."""
    winners = logs.loc[logs["WL"] == "W"].set_index("GAME_ID")["TEAM_ABBREVIATION"]
    unscored = preds["winner"].isna() & preds["game_id"].isin(winners.index)
    preds.loc[unscored, "winner"] = preds.loc[unscored, "game_id"].map(winners)
    preds.loc[unscored, "correct"] = (preds.loc[unscored, "pick"] == preds.loc[unscored, "winner"]).astype(int)
    return preds


def record(preds: pd.DataFrame) -> tuple[int, int]:
    """(correct, scored) over all games that have a result."""
    scored = preds.dropna(subset=["correct"])
    return int(scored["correct"].sum()), len(scored)
