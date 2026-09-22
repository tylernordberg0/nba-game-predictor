"""Model training and single-game prediction."""
import pandas as pd
from sklearn.linear_model import LogisticRegression

from src.features import FEATURES, STAT_COLS

# Used only if a team has no recent games in the data (e.g. an expansion team).
# Roughly league-average values.
FALLBACK_FORM = {"PLUS_MINUS": 0, "EFG_PCT": 0.5, "AST_TO": 1.5,
                 "FT_RATE": 0.25, "OREB": 10, "DREB": 35}


def make_model() -> LogisticRegression:
    return LogisticRegression(random_state=42, max_iter=1000)


def train(games: pd.DataFrame) -> LogisticRegression:
    return make_model().fit(games[FEATURES], games["HOME_TEAM_WINS"])


def _team_values(form: pd.DataFrame, team_id: int) -> dict:
    if team_id not in form.index:
        return FALLBACK_FORM
    row = form.loc[team_id]
    return {c: row[c] if pd.notna(row[c]) else FALLBACK_FORM[c] for c in STAT_COLS}


def home_win_probability(model: LogisticRegression, form: pd.DataFrame,
                         home_id: int, away_id: int) -> float:
    """P(home team wins) from both teams' current 10-game form."""
    home, away = _team_values(form, home_id), _team_values(form, away_id)
    x = {}
    for c, short in zip(STAT_COLS, ["pm", "efg", "ast_to", "ftr", "oreb", "dreb"]):
        x[f"home_{short}_L10"] = home[c]
        x[f"away_{short}_L10"] = away[c]
    return float(model.predict_proba(pd.DataFrame([x], columns=FEATURES))[0][1])
