"""Export everything the website shows to site/public/data/ as JSON.

    python -m src.export_site                  # normal: run after `nbapred`
    python -m src.export_site --no-nba         # skip the two stats.nba.com steps
    python -m src.export_site --refresh-odds   # pull DraftKings prices again (1 credit)

Writes three files:
  site.json     today's games (pick, rating, odds, fair and limit odds, bet or
                skip), the full live record, every bet, and the backtest
  players.json  minutes and points per game for every player (labels injuries)
  model.json    the 12 coefficients, the intercept and each team's current form

site.json is built only from the CSVs in results/, so it always matches the
record. players.json and model.json need stats.nba.com; if that fails, the
previous files are kept and a warning is printed.

The Odds API key is never written anywhere: only prices are exported, and the
output is checked for the key before the run finishes.
"""
import argparse
import json
import math
from datetime import datetime, timezone

import pandas as pd

from src import config
from src.auto_bet import AUTO_STAKE, MAX_FAVORITE, TOO_GOOD_EDGE
from src.betting import MIN_CONFIDENCE, MIN_EDGE, implied_prob, load_bets, to_american
from src.odds import ODDS_COLUMNS, OddsError, api_key, fetch_moneylines, save_odds
from src.tracking import load_predictions

SITE_DATA_DIR = config.ROOT / "site" / "public" / "data"
STARTER_MINUTES = 28.0   # same cutoff as src/injuries.py
ROTATION_MINUTES = 15.0


def rating(conf: float) -> str:
    """Same bands as src/run_daily.py."""
    if conf >= 0.65:
        return "BEST BET"
    if conf >= 0.58:
        return "Good"
    if conf >= 0.52:
        return "Lean"
    return "Toss-up"


def clean(value):
    """NaN/NaT -> None and numpy types -> plain Python, so json.dumps is strict."""
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    if value is pd.NaT or (not isinstance(value, (str, bool, int, float)) and pd.isna(value)):
        return None
    if hasattr(value, "item"):
        return value.item()
    return value


def now_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def load_odds() -> pd.DataFrame:
    if not config.ODDS_CSV.exists():
        return pd.DataFrame(columns=ODDS_COLUMNS)
    return pd.read_csv(config.ODDS_CSV, dtype={"date": str})


def load_auto_log() -> pd.DataFrame:
    if not config.AUTO_BET_LOG.exists():
        return pd.DataFrame(columns=["date", "game_id", "decision", "reason", "checked_at"])
    return pd.read_csv(config.AUTO_BET_LOG, dtype={"game_id": str, "date": str}).fillna({"reason": ""})


def maybe_pull_odds(odds: pd.DataFrame, day: str, has_open_picks: bool, refresh: bool) -> pd.DataFrame:
    """`nbapred` only pulls odds when a pick is 60%+. The board shows a price for
    every game, so pull once here if today has none yet (or when asked to refresh)."""
    have = (odds["date"] == day).any()
    if not has_open_picks or (have and not refresh):
        return odds
    try:
        fresh = fetch_moneylines()
    except OddsError as e:
        print(f"  Couldn't get odds: {e}. The site will show picks without prices.")
        return odds
    save_odds(fresh)
    print(f"  Pulled {len(fresh)} DraftKings moneylines.")
    return load_odds()


def build_games(preds: pd.DataFrame, odds: pd.DataFrame, bets: pd.DataFrame,
                log: pd.DataFrame, day: str) -> list[dict]:
    games = []
    for p in preds[preds["date"] == day].itertuples():
        g = {
            "game_id": p.game_id, "date": p.date, "away": p.away, "home": p.home, "pick": p.pick,
            "home_win_prob": round(float(p.home_win_prob), 4), "confidence": round(float(p.confidence), 4),
            "rating": rating(float(p.confidence)), "predicted_at": clean(p.predicted_at),
            "winner": clean(p.winner), "correct": None if pd.isna(p.correct) else int(p.correct),
            "fair_odds": to_american(float(p.confidence)),
            "limit_odds": to_american(float(p.confidence) - MIN_EDGE),
            "tip": None, "odds": None, "pick_odds": None, "implied_prob": None, "edge": None,
        }
        line = odds[(odds["date"] == day) & (odds["away"] == p.away) & (odds["home"] == p.home)]
        if len(line):
            o = line.sort_values("fetched_at").iloc[-1]  # latest pull
            price = int(o["home_odds"] if p.pick == p.home else o["away_odds"])
            q = implied_prob(price)
            g.update({
                "tip": o["commence_time"],
                "odds": {"away": int(o["away_odds"]), "home": int(o["home_odds"]), "book": o["book"],
                         "book_updated": clean(o["book_updated"]), "fetched_at": o["fetched_at"]},
                "pick_odds": price, "implied_prob": round(q, 4), "edge": round(float(p.confidence) - q, 4),
            })

        bet = bets[bets["game_id"] == p.game_id]
        logged = log[(log["date"] == day) & (log["game_id"] == p.game_id)]
        if len(bet):
            g["decision"] = {"action": "bet", "reason": "", "source": bet.iloc[0]["source"]}
        elif len(logged):
            row = logged.iloc[-1]
            g["decision"] = {"action": row["decision"], "reason": row["reason"], "source": "auto"}
        elif p.confidence < MIN_CONFIDENCE:
            g["decision"] = {"action": "skip", "reason": f"under the {MIN_CONFIDENCE:.0%} confidence bar", "source": "auto"}
        elif g["odds"] is None:
            g["decision"] = {"action": "skip", "reason": "no DraftKings moneyline", "source": "auto"}
        else:
            g["decision"] = {"action": "pending", "reason": "not checked yet", "source": "auto"}
        games.append(g)
    return games


def build_site(day: str, refresh_odds: bool, pull_odds: bool) -> dict:
    preds = load_predictions()
    bets = load_bets()
    log = load_auto_log()
    odds = load_odds()

    # The board shows today's picks if they exist, otherwise the latest saved day.
    dates = sorted(preds["date"].unique())
    board_date = day if day in dates else (dates[-1] if dates else day)
    open_picks = preds[(preds["date"] == day) & preds["winner"].isna()]
    if pull_odds:
        odds = maybe_pull_odds(odds, day, len(open_picks) > 0, refresh_odds)

    scored = preds.dropna(subset=["winner"])
    record = [{
        "date": r.date, "game_id": r.game_id, "away": r.away, "home": r.home, "pick": r.pick,
        "confidence": round(float(r.confidence), 4), "model_version": r.model_version,
        "predicted_at": clean(r.predicted_at), "winner": clean(r.winner),
        "correct": None if pd.isna(r.correct) else int(r.correct),
    } for r in preds.itertuples()]

    bet_rows = [{
        "seq": i + 1,  # position in results/bets.csv; never reused
        "date": b.date, "game_id": b.game_id, "matchup": b.matchup, "pick": b.pick,
        "model_prob": round(float(b.model_prob), 4), "odds": int(b.odds),
        "implied_prob": round(float(b.implied_prob), 4), "edge": round(float(b.edge), 4),
        "stake": round(float(b.stake), 2), "book": clean(b.book), "placed_at": clean(b.placed_at),
        "result": clean(b.result), "profit": None if pd.isna(b.profit) else round(float(b.profit), 4),
        "source": b.source,
    } for i, b in enumerate(bets.itertuples())]

    backtest = json.loads(config.BACKTEST_JSON.read_text())
    seasons = pd.read_csv(config.BACKTEST_SEASONS_CSV)
    backtest["by_season"] = [{k: clean(v) for k, v in row.items()} for row in seasons.to_dict("records")]

    day_odds = odds[odds["date"] == board_date]
    return {
        "meta": {
            "generated_at": now_utc(),
            "export_date": day,               # Eastern date the export ran
            "board_date": board_date,         # date of the games on the board
            "results_through": scored["date"].max() if len(scored) else None,
            "model_version": config.MODEL_VERSION,
            "odds_fetched_at": day_odds["fetched_at"].max() if len(day_odds) else None,
            "rules": {
                "min_confidence": MIN_CONFIDENCE, "min_edge": MIN_EDGE, "max_favorite": MAX_FAVORITE,
                "too_good_edge": TOO_GOOD_EDGE, "auto_stake": AUTO_STAKE,
                "starter_minutes": STARTER_MINUTES, "rotation_minutes": ROTATION_MINUTES,
            },
        },
        "games": build_games(preds, odds, bets, log, board_date),
        "record": record,
        "bets": bet_rows,
        "backtest": backtest,
    }


def build_players(day) -> dict:
    """Minutes and points per game by team, from stats.nba.com (Mac only)."""
    from nba_api.stats.endpoints import leaguedashplayerstats

    from src.injuries import norm
    season = config.season_for_date(day)
    df = leaguedashplayerstats.LeagueDashPlayerStats(
        season=season, per_mode_detailed="PerGame", timeout=60).get_data_frames()[0]
    teams: dict[str, list] = {}
    for r in df.itertuples():
        teams.setdefault(r.TEAM_ABBREVIATION, []).append({
            "name": r.PLAYER_NAME, "key": norm(r.PLAYER_NAME),
            "min": round(float(r.MIN), 1), "pts": round(float(r.PTS), 1), "gp": int(r.GP),
        })
    for roster in teams.values():
        roster.sort(key=lambda p: p["min"], reverse=True)
    return {"season": season, "updated_at": now_utc(), "teams": dict(sorted(teams.items()))}


def build_model(day) -> dict:
    """Coefficients plus each team's current form, so the browser can compute
    a win probability itself (used by the head-to-head page)."""
    from src.data import load_game_logs, team_abbreviations
    from src.features import FEATURES, SHORT, build_game_table, current_team_form
    from src.model import train
    logs = load_game_logs(config.seasons_through(day), day)
    logs = logs[logs["GAME_DATE"].dt.date < day]
    games = build_game_table(logs)
    model = train(games)
    abbr = team_abbreviations()
    form = current_team_form(logs)
    return {
        "updated_at": now_utc(), "trained_games": int(len(games)),
        "data_through": games["GAME_DATE"].max().date().isoformat(),
        "features": FEATURES,
        "coefficients": [round(float(c), 8) for c in model.coef_[0]],
        "intercept": round(float(model.intercept_[0]), 8),
        "form": {abbr[t]: {SHORT[c]: round(float(row[c]), 5) for c in SHORT}
                 for t, row in form.iterrows() if t in abbr and not row.isna().any()},
    }


def write_json(name: str, data: dict) -> None:
    SITE_DATA_DIR.mkdir(parents=True, exist_ok=True)
    text = json.dumps(data, indent=1, allow_nan=False, ensure_ascii=False)
    tmp = SITE_DATA_DIR / f".{name}.tmp"
    tmp.write_text(text + "\n", encoding="utf-8")
    tmp.replace(SITE_DATA_DIR / name)  # replace in one step: never a half-written file
    print(f"  wrote site/public/data/{name} ({len(text) / 1024:.1f} KB)")


def assert_no_key() -> None:
    """Stop if the Odds API key somehow ended up in an exported file."""
    try:
        key = api_key()
    except OddsError:
        return  # no key on this machine, so nothing to leak
    for path in SITE_DATA_DIR.glob("*.json"):
        if key in path.read_text(encoding="utf-8"):
            path.unlink()
            raise SystemExit(f"STOPPED: the Odds API key was found in {path.name}; the file was deleted.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--no-nba", action="store_true", help="skip players.json and model.json (no stats.nba.com calls)")
    parser.add_argument("--no-odds", action="store_true", help="never call The Odds API")
    parser.add_argument("--refresh-odds", action="store_true", help="pull prices again even if today already has them")
    args = parser.parse_args()

    day = config.today_eastern()
    print(f"Exporting site data for {day}")
    site = build_site(day.isoformat(), args.refresh_odds, pull_odds=not args.no_odds)
    write_json("site.json", site)

    if not args.no_nba:
        for name, build in (("players.json", build_players), ("model.json", build_model)):
            try:
                write_json(name, build(day))
            except Exception as e:  # stats.nba.com timeouts and blocks
                print(f"  WARNING: {name} not updated ({type(e).__name__}: {e}); keeping the previous file.")

    assert_no_key()
    m = site["meta"]
    priced = sum(1 for g in site["games"] if g["odds"])
    print(f"Board date {m['board_date']}: {len(site['games'])} games, {priced} with prices; "
          f"{len(site['record'])} picks and {len(site['bets'])} bets in the record.")


if __name__ == "__main__":
    main()
