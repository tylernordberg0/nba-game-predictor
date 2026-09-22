"""Paths, dates, and season helpers shared by every module.

All paths are relative to the repo root so the pipeline runs the same way on a
laptop and in GitHub Actions. All "today"/"yesterday" logic uses US Eastern
time, because NBA game dates are Eastern and CI runners are on UTC.
"""
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
SEASON_CACHE_DIR = DATA_DIR / "season_cache"
RESULTS_DIR = ROOT / "results"
FIGURES_DIR = ROOT / "figures"

PREDICTIONS_CSV = RESULTS_DIR / "predictions.csv"
BETS_CSV = RESULTS_DIR / "bets.csv"
BACKTEST_JSON = RESULTS_DIR / "backtest_metrics.json"
BACKTEST_SEASONS_CSV = RESULTS_DIR / "backtest_by_season.csv"

EASTERN = ZoneInfo("America/New_York")
FIRST_SEASON_START_YEAR = 2015

# Bump when the prediction logic changes, so the live record shows which
# version produced each pick. v1 = original script (team features lagged one
# game behind); v2 = features include each team's most recent game.
MODEL_VERSION = "v2"


def today_eastern() -> date:
    return datetime.now(EASTERN).date()


def season_label(start_year: int) -> str:
    """2025 -> '2025-26' (the format nba_api expects)."""
    return f"{start_year}-{str(start_year + 1)[-2:]}"


def season_for_date(d: date) -> str:
    """NBA season containing date d. From August on we count the upcoming season,
    which simply returns no games until opening night in late October."""
    return season_label(d.year if d.month >= 8 else d.year - 1)


def seasons_through(d: date) -> list[str]:
    """Every season from 2015-16 through the one containing d."""
    last = int(season_for_date(d)[:4])
    return [season_label(y) for y in range(FIRST_SEASON_START_YEAR, last + 1)]
