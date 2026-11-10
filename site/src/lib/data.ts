// Shapes of the JSON files written by src/export_site.py.

export interface Rules {
  min_confidence: number;
  min_edge: number;
  max_favorite: number;
  too_good_edge: number;
  auto_stake: number;
  starter_minutes: number;
  rotation_minutes: number;
}

export interface Meta {
  generated_at: string;
  export_date: string;
  board_date: string;
  results_through: string | null;
  model_version: string;
  odds_fetched_at: string | null;
  rules: Rules;
}

export interface GameOdds {
  away: number;
  home: number;
  book: string;
  book_updated: string | null;
  fetched_at: string;
}

export interface Game {
  game_id: string;
  date: string;
  away: string;
  home: string;
  pick: string;
  home_win_prob: number;
  confidence: number;
  rating: string;
  predicted_at: string | null;
  winner: string | null;
  correct: 0 | 1 | null;
  fair_odds: number;
  limit_odds: number;
  tip: string | null;
  odds: GameOdds | null;
  pick_odds: number | null;
  implied_prob: number | null;
  edge: number | null;
  decision: { action: "bet" | "skip" | "pending"; reason: string; source: string };
}

export interface Pick {
  date: string;
  game_id: string;
  away: string;
  home: string;
  pick: string;
  confidence: number;
  model_version: string;
  predicted_at: string | null;
  winner: string | null;
  correct: 0 | 1 | null;
}

export interface Bet {
  seq: number;
  date: string;
  game_id: string;
  matchup: string;
  pick: string;
  model_prob: number;
  odds: number;
  implied_prob: number;
  edge: number;
  stake: number;
  book: string | null;
  placed_at: string | null;
  result: "W" | "L" | null;
  profit: number | null;
  source: "auto" | "manual";
}

export interface CalibrationBand {
  confidence: string;
  games: number;
  accuracy: number;
  mean_confidence: number;
}

export interface SeasonRow {
  season: string;
  games: number;
  model_accuracy: number;
  home_baseline: number;
  train_games: number;
}

export interface Backtest {
  data_pulled_through: string;
  total_games: number;
  walk_forward: {
    test_seasons: string;
    games: number;
    model_accuracy: number;
    home_baseline: number;
    log_loss: number;
    brier: number;
    calibration: CalibrationBand[];
  };
  holdout_80_20: { train_games: number; test_games: number; test_from: string; model_accuracy: number; home_baseline: number };
  time_series_cv_5: { fold_accuracy: number[]; mean: number };
  by_season: SeasonRow[];
}

export interface SiteData {
  meta: Meta;
  games: Game[];
  record: Pick[];
  bets: Bet[];
  backtest: Backtest;
}

export interface PlayerRow {
  name: string;
  key: string;
  min: number;
  pts: number;
  gp: number;
}

export interface Players {
  season: string;
  updated_at: string;
  teams: Record<string, PlayerRow[]>;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`${path} returned HTTP ${res.status}`);
  return (await res.json()) as T;
}

export function loadSite(): Promise<SiteData> {
  return getJson<SiteData>("/data/site.json");
}

/** Player minutes are optional: without them injuries still list, just unlabeled. */
export async function loadPlayers(): Promise<Players | null> {
  try {
    const p = await getJson<Players>("/data/players.json");
    return p && typeof p.teams === "object" ? p : null;
  } catch {
    return null;
  }
}

// ---- small summaries used on more than one page ----

export interface WinLoss {
  wins: number;
  losses: number;
  n: number;
  rate: number | null;
}

export function pickRecord(picks: Pick[]): WinLoss {
  const scored = picks.filter((p) => p.correct != null);
  const wins = scored.filter((p) => p.correct === 1).length;
  return { wins, losses: scored.length - wins, n: scored.length, rate: scored.length ? wins / scored.length : null };
}

export interface BetSummary extends WinLoss {
  staked: number;
  profit: number;
  roi: number | null;
  open: number;
}

export function betRecord(bets: Bet[]): BetSummary {
  const settled = bets.filter((b) => b.result != null);
  const wins = settled.filter((b) => b.result === "W").length;
  const staked = settled.reduce((s, b) => s + b.stake, 0);
  const profit = settled.reduce((s, b) => s + (b.profit ?? 0), 0);
  return {
    wins,
    losses: settled.length - wins,
    n: settled.length,
    rate: settled.length ? wins / settled.length : null,
    staked,
    profit,
    roi: staked ? profit / staked : null,
    open: bets.length - settled.length,
  };
}

/** 95% Wilson interval for a win rate: honest about small samples. */
export function wilson(wins: number, n: number): [number, number] | null {
  if (!n) return null;
  const z = 1.96;
  const p = wins / n;
  const d = 1 + (z * z) / n;
  const mid = (p + (z * z) / (2 * n)) / d;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [mid - half, mid + half];
}
