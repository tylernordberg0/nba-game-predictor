// Per-visitor state kept in this browser only: what the visitor has already
// seen on the board, and their sandbox bets. Storage can be blocked or full,
// so every read and write is guarded and the site works without it.

const SEEN_KEY = "nbapred.seen.v1";
const SANDBOX_KEY = "nbapred.sandbox.v1";

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: the page still works, it just won't remember */
  }
}

/** What the visitor last saw: the price per game and the injury list per team. */
export interface Seen {
  board_date: string;
  prices: Record<string, number | null>;
  injuries: Record<string, string[]>;
}

export function loadSeen(boardDate: string): Seen {
  const s = read<Seen>(SEEN_KEY);
  if (s && s.board_date === boardDate && s.prices && s.injuries) return s;
  return { board_date: boardDate, prices: {}, injuries: {} };
}

export const saveSeen = (s: Seen) => write(SEEN_KEY, s);

export interface SandboxBet {
  id: string;
  placed_at: string;
  date: string;
  game_id: string | null;
  matchup: string;
  pick: string;
  prob: number;
  odds: number;
  stake: number;
}

export function loadSandbox(): SandboxBet[] {
  const list = read<SandboxBet[]>(SANDBOX_KEY);
  return Array.isArray(list) ? list.filter((b) => b && typeof b.odds === "number" && typeof b.stake === "number") : [];
}

export const saveSandbox = (list: SandboxBet[]) => write(SANDBOX_KEY, list.slice(-50));
