"""Who is out tonight: ESPN's injury feed plus each player's minutes per game.

The automatic bets use this for one check: when a price looks too good (an edge
of 8+ points), skip the bet if a player on the picked team who averages 28+
minutes a game is listed Out. The website labels players differently: there a
"starter" is someone who has started at least half his games (load_player_stats),
because minutes mislabel starters on short minutes. The betting rule deliberately
stays on minutes. ESPN's feed is unofficial, so if anything here fails, the caller
skips the bet (fails closed) rather than betting blind.
"""
import logging
import re
import time
import unicodedata

import requests
from nba_api.stats.endpoints import leaguedashplayerstats

from src.odds import TEAM_ABBR

log = logging.getLogger(__name__)

ESPN_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries"
STARTER_MINUTES = 28.0  # the betting rule's cutoff
STARTER_SHARE = 0.5  # the website's label: started at least half of the games played


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


def is_starter(games_started: float, games_played: float) -> bool:
    """A starter has started at least half the games he has played."""
    return games_played > 0 and games_started / games_played >= STARTER_SHARE


def _season_stats(season: str) -> dict[tuple[str, str], dict]:
    """(team, normalized name) -> per-game stats plus games started, for one season.

    stats.nba.com has no games-started column, but the same endpoint filtered to
    "Starters" returns each player's numbers from only the games he started, so
    GP in that result is his games started.
    """
    kw = dict(season=season, per_mode_detailed="PerGame", timeout=60)
    everyone = leaguedashplayerstats.LeagueDashPlayerStats(**kw).get_data_frames()[0]
    time.sleep(1)  # be polite to stats.nba.com
    started = leaguedashplayerstats.LeagueDashPlayerStats(
        starter_bench_nullable="Starters", **kw).get_data_frames()[0]
    starts = dict(zip(started["PLAYER_ID"], started["GP"]))
    out = {}
    for r in everyone.itertuples():
        gp, gs = int(r.GP), int(starts.get(r.PLAYER_ID, 0))
        out[(r.TEAM_ABBREVIATION, norm(r.PLAYER_NAME))] = {
            "name": r.PLAYER_NAME, "key": norm(r.PLAYER_NAME), "min": round(float(r.MIN), 1),
            "pts": round(float(r.PTS), 1), "gp": gp, "gs": gs, "starter": is_starter(gs, gp),
        }
    return out


def previous_season(season: str) -> str:
    """'2026-27' -> '2025-26'."""
    start = int(season[:4]) - 1
    return f"{start}-{str(start + 1)[-2:]}"


def load_player_stats(season: str) -> tuple[dict[tuple[str, str], dict], dict[str, dict]]:
    """Returns (this season by (team, name), last season by name).

    Last season is only a fallback for players with no games yet this season:
    a starter who has been out since opening night isn't in this season's
    numbers at all, and the site should still label him. It is looked up by name alone because he may have changed teams. If last
    season can't be loaded, the fallback is simply empty.
    """
    current = _season_stats(season)
    try:
        time.sleep(1)
        last = {name: row for (_, name), row in _season_stats(previous_season(season)).items()}
    except Exception as e:  # the fallback is optional
        log.warning("Last season's starts not loaded (%s); no fallback for players without games", type(e).__name__)
        last = {}
    played = {name for (_, name) in current}
    return current, {name: row for name, row in last.items() if name not in played}


def minutes_per_game(season: str) -> dict[tuple[str, str], float]:
    """(team, normalized player name) -> minutes per game this season (stats.nba.com)."""
    df = leaguedashplayerstats.LeagueDashPlayerStats(
        season=season, per_mode_detailed="PerGame", timeout=60).get_data_frames()[0]
    return {(r.TEAM_ABBREVIATION, norm(r.PLAYER_NAME)): float(r.MIN) for r in df.itertuples()}


def starters_out(team: str, out: dict[str, list[str]], minutes: dict[tuple[str, str], float]) -> list[str]:
    """Players on `team` listed Out who average STARTER_MINUTES or more (the betting rule)."""
    names = []
    for name in out.get(team, []):
        mpg = minutes.get((team, norm(name)))
        if mpg is None:
            log.info("No minutes found for %s (%s); treated as not a starter", name, team)
        elif mpg >= STARTER_MINUTES:
            names.append(f"{name} ({mpg:.0f} min)")
    return names
