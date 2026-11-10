"""Who is out tonight: ESPN's injury feed plus each player's minutes per game.

The automatic bets use this for one check: when a price looks too good (an edge
of 8+ points), skip the bet if a starter (28+ minutes a game) on the picked team
is listed Out. ESPN's feed is unofficial, so if anything here fails, the caller
skips the bet (fails closed) rather than betting blind.
"""
import logging
import re
import unicodedata

import requests
from nba_api.stats.endpoints import leaguedashplayerstats

from src.odds import TEAM_ABBR

log = logging.getLogger(__name__)

ESPN_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries"
STARTER_MINUTES = 28.0


def norm(name: str) -> str:
    """'Luka Dončić Jr.' -> 'luka doncic' so ESPN and NBA spellings match."""
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"[^a-z ]", "", s)
    return " ".join(w for w in s.split() if w not in {"jr", "sr", "ii", "iii", "iv"})


def players_out() -> dict[str, list[str]]:
    """Team abbreviation -> names of players ESPN lists as Out."""
    r = requests.get(ESPN_URL, timeout=20)
    r.raise_for_status()
    out = {}
    for team in r.json()["injuries"]:
        abbr = TEAM_ABBR.get(team.get("displayName", ""))
        if abbr is None:
            raise RuntimeError(f"unknown ESPN team name {team.get('displayName')!r}")
        out[abbr] = [i["athlete"]["displayName"] for i in team.get("injuries", [])
                     if i.get("status") == "Out"]
    return out


def minutes_per_game(season: str) -> dict[tuple[str, str], float]:
    """(team, normalized player name) -> minutes per game this season (stats.nba.com)."""
    df = leaguedashplayerstats.LeagueDashPlayerStats(
        season=season, per_mode_detailed="PerGame", timeout=60).get_data_frames()[0]
    return {(r.TEAM_ABBREVIATION, norm(r.PLAYER_NAME)): float(r.MIN) for r in df.itertuples()}


def starters_out(team: str, out: dict[str, list[str]], minutes: dict[tuple[str, str], float]) -> list[str]:
    """Players on `team` listed Out who average STARTER_MINUTES or more."""
    names = []
    for name in out.get(team, []):
        mpg = minutes.get((team, norm(name)))
        if mpg is None:
            log.info("No minutes found for %s (%s); treated as not a starter", name, team)
        elif mpg >= STARTER_MINUTES:
            names.append(f"{name} ({mpg:.0f} min)")
    return names
