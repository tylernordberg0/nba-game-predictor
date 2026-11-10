import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { InjuryState } from "./components/InjuryList";
import { loadPlayers, loadSite, type Game, type Players, type SiteData } from "./lib/data";
import { dateLabel, stampET } from "./lib/format";
import { fetchInjuries, injuryKeys } from "./lib/injuries";
import { href, Link, useRoute, type Route } from "./lib/router";
import { loadSeen, saveSeen, type Seen } from "./lib/store";
import { BetChecker } from "./pages/BetChecker";
import { Results } from "./pages/Results";
import { Today } from "./pages/Today";

const INJURY_REFRESH_MS = 5 * 60 * 1000;
const DATA_REFRESH_MS = 10 * 60 * 1000;
const CLOCK_MS = 30 * 1000;

/** What moved since this visitor last looked at a game. */
export interface Change {
  price?: { from: number | null; to: number | null };
  injuries: string[]; // names newly listed or with a new status
}

interface AppState {
  site: SiteData;
  players: Players | null;
  injuries: InjuryState;
  now: number;
  changes: Record<string, Change>;
  markSeen: (game: Game) => void;
}

const Ctx = createContext<AppState | null>(null);
export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside provider");
  return v;
}

const TABS: { route: Route; label: string }[] = [
  { route: "today", label: "Today" },
  { route: "bet-checker", label: "Bet checker" },
  { route: "results", label: "Results" },
];

const TITLES: Record<Route, string> = {
  today: "NBA Game Predictor",
  "bet-checker": "Bet checker · NBA Game Predictor",
  results: "Results · NBA Game Predictor",
};

export function App() {
  const { route, search } = useRoute();
  const [site, setSite] = useState<SiteData | null>(null);
  const [failed, setFailed] = useState(false);
  const [players, setPlayers] = useState<Players | null>(null);
  const [injuries, setInjuries] = useState<InjuryState>({ status: "loading" });
  const [now, setNow] = useState(() => Date.now());
  const [seen, setSeen] = useState<Seen | null>(null);
  const playersRef = useRef<Players | null>(null);

  useEffect(() => {
    document.title = TITLES[route];
  }, [route]);

  // Daily data, re-checked now and then so an open tab picks up a new export.
  useEffect(() => {
    let alive = true;
    const pull = () =>
      loadSite()
        .then((d) => alive && (setSite(d), setFailed(false)))
        .catch(() => alive && setFailed(true));
    pull();
    loadPlayers().then((p) => {
      if (!alive) return;
      playersRef.current = p;
      setPlayers(p);
    });
    const id = window.setInterval(() => document.visibilityState === "visible" && pull(), DATA_REFRESH_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), CLOCK_MS);
    return () => window.clearInterval(id);
  }, []);

  // Live injuries from ESPN. A failure shows "injuries unavailable"; it never blocks the picks.
  const rules = site?.meta.rules;
  useEffect(() => {
    if (!rules) return;
    let alive = true;
    const pull = () =>
      fetchInjuries(playersRef.current, rules)
        .then((map) => alive && setInjuries({ status: "ok", map, fetchedAt: new Date().toISOString() }))
        .catch(() => alive && setInjuries((prev) => (prev.status === "ok" ? prev : { status: "error" })));
    pull();
    const id = window.setInterval(() => document.visibilityState === "visible" && pull(), INJURY_REFRESH_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [rules, players]);

  // Remember what this visitor has seen, so later changes can be flagged.
  const boardDate = site?.meta.board_date;
  useEffect(() => {
    if (boardDate) setSeen(loadSeen(boardDate));
  }, [boardDate]);

  useEffect(() => {
    if (!site || !seen) return;
    // First sight of a game or a team's list becomes the baseline; nothing is flagged yet.
    const next: Seen = { ...seen, prices: { ...seen.prices }, injuries: { ...seen.injuries } };
    let dirty = false;
    for (const g of site.games) {
      if (!(g.game_id in next.prices)) {
        next.prices[g.game_id] = g.pick_odds;
        dirty = true;
      }
      if (injuries.status === "ok") {
        for (const t of [g.away, g.home]) {
          if (!(t in next.injuries)) {
            next.injuries[t] = injuryKeys(injuries.map[t]);
            dirty = true;
          }
        }
      }
    }
    if (dirty) {
      setSeen(next);
      saveSeen(next);
    }
  }, [site, seen, injuries]);

  const changes = useMemo(() => {
    const out: Record<string, Change> = {};
    if (!site || !seen) return out;
    for (const g of site.games) {
      const c: Change = { injuries: [] };
      if (g.game_id in seen.prices && seen.prices[g.game_id] !== g.pick_odds) {
        c.price = { from: seen.prices[g.game_id], to: g.pick_odds };
      }
      if (injuries.status === "ok") {
        for (const t of [g.away, g.home]) {
          const before = seen.injuries[t];
          if (!before) continue;
          for (const i of injuries.map[t] ?? []) {
            if (!before.includes(`${i.key}|${i.status.toLowerCase()}`)) c.injuries.push(i.name);
          }
        }
      }
      if (c.price || c.injuries.length) out[g.game_id] = c;
    }
    return out;
  }, [site, seen, injuries]);

  const markSeen = useCallback(
    (g: Game) => {
      setSeen((prev) => {
        if (!prev) return prev;
        const next: Seen = {
          ...prev,
          prices: { ...prev.prices, [g.game_id]: g.pick_odds },
          injuries: { ...prev.injuries },
        };
        if (injuries.status === "ok") {
          for (const t of [g.away, g.home]) next.injuries[t] = injuryKeys(injuries.map[t]);
        }
        saveSeen(next);
        return next;
      });
    },
    [injuries],
  );

  const state = useMemo<AppState | null>(
    () => (site ? { site, players, injuries, now, changes, markSeen } : null),
    [site, players, injuries, now, changes, markSeen],
  );

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="topbar">
        <div className="topbar-in">
          <Link to={href("today")} className="brand">NBA Game Predictor</Link>
          <p className="updated">
            {site ? (
              <>
                Updated {stampET(site.meta.generated_at)}
                {site.meta.results_through ? ` · results through ${dateLabel(site.meta.results_through)}` : ""}
              </>
            ) : failed ? "Data unavailable" : "Loading…"}
          </p>
          <nav aria-label="Pages" className="tabs">
            {TABS.map((t) => (
              <Link key={t.route} to={href(t.route)} className="tab" aria-current={route === t.route ? "page" : undefined}>
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main id="main" tabIndex={-1}>
        {state ? (
          <Ctx.Provider value={state}>
            {route === "today" && <Today />}
            {route === "bet-checker" && <BetChecker preselect={search.get("game")} />}
            {route === "results" && <Results />}
          </Ctx.Provider>
        ) : failed ? (
          <div className="page">
            <div className="notice notice-alert" role="alert">
              <strong>The site's data didn't load.</strong> Check your connection and reload the page. The picks and
              the record are also in the public repository.
            </div>
          </div>
        ) : (
          <div className="page" aria-busy="true">
            <div className="skeleton" />
          </div>
        )}
      </main>

      <footer className="footer">
        <div className="footer-in">
          <p>
            A personal data-science project by Tyler Nordberg, for education and entertainment. Not betting or
            financial advice. All bets are simulated; no real money is placed. Past results don't predict future
            results.
          </p>
          <p>
            Not affiliated with the NBA, its teams, ESPN, DraftKings or The Odds API. If gambling is a problem for you
            or someone you know, call 1-800-MY-RESET.
          </p>
          <p>
            <a href="https://github.com/tylernordberg0/nba-game-predictor" rel="noopener">Code and data on GitHub</a>
          </p>
        </div>
      </footer>
    </>
  );
}
