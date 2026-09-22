"""Download and cache team game logs from the NBA stats API (via nba_api)."""
import logging
import time
from datetime import date, datetime

import pandas as pd
from nba_api.stats.endpoints import scoreboardv2, teamgamelogs
from nba_api.stats.static import teams

from src.config import SEASON_CACHE_DIR, season_for_date

log = logging.getLogger(__name__)


def _fetch_season(season: str, retries: int = 3) -> pd.DataFrame:
    for attempt in range(1, retries + 1):
        try:
            time.sleep(1)  # be polite to stats.nba.com
            df = teamgamelogs.TeamGameLogs(
                season_nullable=season,
                season_type_nullable="Regular Season",
                timeout=60,
            ).get_data_frames()[0]
            df["SEASON"] = season
            return df
        except Exception as e:  # network errors, timeouts, API hiccups
            log.warning("Fetching %s failed (attempt %d/%d): %s", season, attempt, retries, e)
            time.sleep(5 * attempt)
    raise RuntimeError(f"Could not fetch {season} from the NBA API")


def load_game_logs(seasons: list[str], today: date) -> pd.DataFrame:
    """One row per team per regular-season game, for all requested seasons.

    Completed seasons are cached forever. The current season is re-downloaded
    once per day, since new games are added daily. If a download fails we fall
    back to a stale cache (with a warning) rather than training without the season.
    """
    SEASON_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    current = season_for_date(today)
    frames = []
    for season in seasons:
        path = SEASON_CACHE_DIR / f"{season}.pkl"
        fresh = path.exists() and (
            season != current
            or datetime.fromtimestamp(path.stat().st_mtime).date() == today
        )
        if fresh:
            frames.append(pd.read_pickle(path))
            continue
        try:
            df = _fetch_season(season)
            df.to_pickle(path)
            log.info("Fetched %s (%d rows)", season, len(df))
        except RuntimeError:
            if not path.exists():
                raise
            log.warning("Using stale cache for %s", season)
            df = pd.read_pickle(path)
        frames.append(df)

    logs = pd.concat([f for f in frames if len(f)], ignore_index=True)
    logs["GAME_DATE"] = pd.to_datetime(logs["GAME_DATE"])
    return logs


def get_schedule(d: date) -> pd.DataFrame:
    """Games on date d: GAME_ID, HOME_TEAM_ID, VISITOR_TEAM_ID, GAME_STATUS_ID
    (1 = not started, 2 = in progress, 3 = final)."""
    games = scoreboardv2.ScoreboardV2(game_date=d.strftime("%Y-%m-%d"), timeout=60).get_data_frames()[0]
    return games[["GAME_ID", "HOME_TEAM_ID", "VISITOR_TEAM_ID", "GAME_STATUS_ID"]].drop_duplicates("GAME_ID")


def team_abbreviations() -> dict[int, str]:
    return {t["id"]: t["abbreviation"] for t in teams.get_teams()}
