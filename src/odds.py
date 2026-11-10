"""DraftKings NBA moneylines from The Odds API (https://the-odds-api.com).

The key is read from ODDS_API_KEY in the environment, or from .env at the repo
root (gitignored). It is only ever sent to the API: never printed, logged or
saved, and error messages leave out the request URL because it contains the key.

One call costs 1 credit (1 market x 1 bookmaker); the free plan has 500 a month.
"""
import logging
import os
from datetime import datetime, timezone

import pandas as pd
import requests

from src.config import EASTERN, ODDS_CSV, ROOT

log = logging.getLogger(__name__)

URL = "https://api.the-odds-api.com/v4/sports/basketball_nba/odds"
BOOK = "draftkings"
ODDS_COLUMNS = ["date", "away", "home", "away_odds", "home_odds", "commence_time",
                "book", "book_updated", "fetched_at"]

# Team names as The Odds API and ESPN write them -> nba_api abbreviations.
TEAM_ABBR = {
    "Atlanta Hawks": "ATL", "Boston Celtics": "BOS", "Brooklyn Nets": "BKN",
    "Charlotte Hornets": "CHA", "Chicago Bulls": "CHI", "Cleveland Cavaliers": "CLE",
    "Dallas Mavericks": "DAL", "Denver Nuggets": "DEN", "Detroit Pistons": "DET",
    "Golden State Warriors": "GSW", "Houston Rockets": "HOU", "Indiana Pacers": "IND",
    "Los Angeles Clippers": "LAC", "LA Clippers": "LAC", "Los Angeles Lakers": "LAL",
    "Memphis Grizzlies": "MEM", "Miami Heat": "MIA", "Milwaukee Bucks": "MIL",
    "Minnesota Timberwolves": "MIN", "New Orleans Pelicans": "NOP", "New York Knicks": "NYK",
    "Oklahoma City Thunder": "OKC", "Orlando Magic": "ORL", "Philadelphia 76ers": "PHI",
    "Phoenix Suns": "PHX", "Portland Trail Blazers": "POR", "Sacramento Kings": "SAC",
    "San Antonio Spurs": "SAS", "Toronto Raptors": "TOR", "Utah Jazz": "UTA",
    "Washington Wizards": "WAS",
}


class OddsError(RuntimeError):
    pass


def api_key() -> str:
    key = os.environ.get("ODDS_API_KEY", "").strip()
    env = ROOT / ".env"
    if not key and env.exists():
        for line in env.read_text().splitlines():
            name, _, value = line.partition("=")
            if name.strip() == "ODDS_API_KEY":
                key = value.strip().strip('"').strip("'")
    if not key:
        raise OddsError("no ODDS_API_KEY in the environment or in .env")
    return key


def fetch_moneylines() -> pd.DataFrame:
    """One row per upcoming game that has DraftKings moneylines for both teams."""
    params = {"apiKey": api_key(), "bookmakers": BOOK, "markets": "h2h",
              "oddsFormat": "american", "dateFormat": "iso"}
    try:
        r = requests.get(URL, params=params, timeout=30)
    except requests.RequestException as e:
        raise OddsError(f"Odds API request failed ({type(e).__name__})") from None
    if r.status_code != 200:
        raise OddsError(f"Odds API returned HTTP {r.status_code}")
    try:
        events = r.json()
    except ValueError:
        raise OddsError("Odds API returned something that isn't JSON") from None
    log.info("Odds API credits remaining: %s", r.headers.get("x-requests-remaining", "?"))

    fetched = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    rows = []
    for ev in events:
        home, away = ev["home_team"], ev["away_team"]
        unknown = [n for n in (home, away) if n not in TEAM_ABBR]
        if unknown:
            raise OddsError(f"unknown team name(s) {unknown}; add them to TEAM_ABBR in src/odds.py")
        book = next((b for b in ev.get("bookmakers", []) if b.get("key") == BOOK), None)
        market = next((m for m in book.get("markets", []) if m.get("key") == "h2h"), None) if book else None
        if market is None:
            continue
        prices = {o["name"]: int(o["price"]) for o in market.get("outcomes", [])}
        if home not in prices or away not in prices:
            continue
        tip = pd.Timestamp(ev["commence_time"])
        rows.append({
            "date": tip.tz_convert(EASTERN).date().isoformat(),
            "away": TEAM_ABBR[away], "home": TEAM_ABBR[home],
            "away_odds": prices[away], "home_odds": prices[home],
            "commence_time": tip.tz_convert("UTC").strftime("%Y-%m-%dT%H:%M:%SZ"),
            "book": BOOK, "book_updated": market.get("last_update") or book.get("last_update"),
            "fetched_at": fetched,
        })
    return pd.DataFrame(rows, columns=ODDS_COLUMNS)


def save_odds(odds: pd.DataFrame) -> None:
    """Append this pull to results/odds.csv (prices only; no key)."""
    if odds.empty:
        return
    header = not ODDS_CSV.exists()
    odds[ODDS_COLUMNS].to_csv(ODDS_CSV, mode="a", header=header, index=False)
