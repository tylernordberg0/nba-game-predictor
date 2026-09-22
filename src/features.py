"""Feature engineering: rolling 10-game team form.

Every feature is a team's average over its previous 10 games (minimum 3).
The key line is `x.shift(1).rolling(10)`: shift(1) drops the current game, so
a game's features only use games played strictly before it (no leakage).
The window is per team and spans seasons, so a team's first games of a season
use the end of the previous season.
"""
import pandas as pd

WINDOW = 10
MIN_GAMES = 3

STAT_COLS = ["PLUS_MINUS", "EFG_PCT", "AST_TO", "FT_RATE", "OREB", "DREB"]
SHORT = {"PLUS_MINUS": "pm", "EFG_PCT": "efg", "AST_TO": "ast_to",
         "FT_RATE": "ftr", "OREB": "oreb", "DREB": "dreb"}

# Order matters: the model is trained on columns in this order.
FEATURES = [f"{side}_{SHORT[c]}_L10" for c in STAT_COLS for side in ("home", "away")]


def add_box_score_stats(logs: pd.DataFrame) -> pd.DataFrame:
    """Per-game efficiency stats derived from the raw box score."""
    logs = logs.sort_values("GAME_DATE").reset_index(drop=True)
    logs["EFG_PCT"] = (logs["FGM"] + 0.5 * logs["FG3M"]) / logs["FGA"]  # 3s worth 1.5x
    logs["AST_TO"] = logs["AST"] / logs["TOV"].replace(0, 1)             # avoid divide-by-zero
    logs["FT_RATE"] = logs["FTA"] / logs["FGA"]
    logs["is_home"] = logs["MATCHUP"].str.contains("vs.", regex=False).astype(int)  # "BOS vs. NYK" = home, "BOS @ NYK" = away
    return logs


def add_rolling_features(logs: pd.DataFrame) -> pd.DataFrame:
    """Add <STAT>_L10 = mean of the team's previous 10 games (current game excluded)."""
    logs = add_box_score_stats(logs)
    for col in STAT_COLS:
        logs[f"{col}_L10"] = logs.groupby("TEAM_ID")[col].transform(
            lambda x: x.shift(1).rolling(WINDOW, min_periods=MIN_GAMES).mean()
        )
    return logs


def build_game_table(logs: pd.DataFrame) -> pd.DataFrame:
    """Turn two team-rows per game into one row per game with home_* and away_* features.

    Returns games in date order with GAME_ID, GAME_DATE, SEASON, team IDs, the
    12 FEATURES and the target HOME_TEAM_WINS. Games missing a feature (a team's
    first 1-2 games in the data) are dropped.
    """
    logs = add_rolling_features(logs)
    l10 = [f"{c}_L10" for c in STAT_COLS]

    home = logs[logs["is_home"] == 1][["GAME_ID", "GAME_DATE", "SEASON", "TEAM_ID", "WL"] + l10]
    home.columns = ["GAME_ID", "GAME_DATE", "SEASON", "HOME_TEAM_ID", "WL_home"] + [f"home_{SHORT[c]}_L10" for c in STAT_COLS]

    away = logs[logs["is_home"] == 0][["GAME_ID", "TEAM_ID"] + l10]
    away.columns = ["GAME_ID", "VISITOR_TEAM_ID"] + [f"away_{SHORT[c]}_L10" for c in STAT_COLS]

    games = home.merge(away, on="GAME_ID", how="inner")
    games["HOME_TEAM_WINS"] = (games["WL_home"] == "W").astype(int)
    return games.dropna(subset=FEATURES).reset_index(drop=True)


def current_team_form(logs: pd.DataFrame) -> pd.DataFrame:
    """Each team's form going into its NEXT game: the mean of its last 10 games
    INCLUDING the most recent one. Indexed by TEAM_ID, columns = STAT_COLS.

    (No shift here: when predicting tomorrow, the most recent game is already
    in the past. The original script reused the training rows' shifted values,
    which left every team's live features one game out of date.)
    """
    logs = add_box_score_stats(logs)
    form = logs.groupby("TEAM_ID")[STAT_COLS].transform(
        lambda x: x.rolling(WINDOW, min_periods=MIN_GAMES).mean()
    )
    form["TEAM_ID"] = logs["TEAM_ID"]
    return form.groupby("TEAM_ID").last()
