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
    # Keep `correct` as 1/0 (blank if unplayed); a float column would rewrite every
    # old row as 1.0/0.0 and make the git history look like past picks changed.
    df = df.assign(correct=pd.to_numeric(df["correct"]).astype("Int64"))
    df.to_csv(PREDICTIONS_CSV, index=False, float_format="%.4f")


def fill_results(preds: pd.DataFrame, logs: pd.DataFrame) -> pd.DataFrame:
    """Fill winner/correct for any unscored game that now has a result."""
    winners = logs.loc[logs["WL"] == "W"].set_index("GAME_ID")["TEAM_ABBREVIATION"]
    unscored = preds["winner"].isna() & preds["game_id"].isin(winners.index)
    preds.loc[unscored, "winner"] = preds.loc[unscored, "game_id"].map(winners)
    preds.loc[unscored, "correct"] = (preds.loc[unscored, "pick"] == preds.loc[unscored, "winner"]).astype(int)
    return preds


def print_results(preds: pd.DataFrame, newly: pd.Series) -> None:
    """Print each game scored in this run, grouped by date. If nothing new was
    scored (e.g. a second run the same day), show the most recent day with results."""
    scored = preds.dropna(subset=["winner"])
    if scored.empty:
        return
    dates = sorted(preds.loc[newly, "date"].unique()) if newly.any() else [scored["date"].max()]
    for d in dates:
        day = scored[scored["date"] == d].sort_values("confidence", ascending=False)
        c = int((day["correct"] == 1).sum())
        print(f"\nResults for {d}: {c}-{len(day) - c}")
        for r in day.itertuples():
            mark = "\u2713" if r.correct == 1 else "\u2717"
            print(f"  {mark} {r.away + ' @ ' + r.home:<11} picked {r.pick:<4} {r.confidence:>4.0%}   winner {r.winner}")


def record(preds: pd.DataFrame) -> tuple[int, int]:
    """(correct, scored) over all games that have a result."""
    scored = preds.dropna(subset=["correct"])
    return int(scored["correct"].sum()), len(scored)
