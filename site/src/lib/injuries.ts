// Live injuries from ESPN's public feed, fetched in the visitor's browser.
// The feed is unofficial: anything unexpected is treated as "unavailable"
// rather than guessed at. Notes are plain strings and are only ever rendered
// as text (React escapes them), never as HTML.
import type { Players, Rules } from "./data";
import { TEAM_ABBR } from "./teams";

export const ESPN_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries";

export type Role = "starter" | "rotation" | "bench" | "unknown";

export interface Injury {
  name: string;
  key: string; // normalized name, for matching against player minutes
  status: string; // "Out", "Day-To-Day", ...
  out: boolean;
  note: string;
  updated: string | null;
  minutes: number | null;
  role: Role;
}

export type InjuryMap = Record<string, Injury[]>;

/** 'Luka Dončić Jr.' -> 'luka doncic' (same as norm() in src/injuries.py). */
export function norm(name: string): string {
  const ascii = name.normalize("NFKD").replace(/[^\x00-\x7f]/g, "").toLowerCase();
  return ascii
    .replace(/[^a-z ]/g, "")
    .split(/\s+/)
    .filter((w) => w && !["jr", "sr", "ii", "iii", "iv"].includes(w))
    .join(" ");
}

function text(v: unknown, max: number): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

export function roleFor(minutes: number | null, rules: Rules): Role {
  if (minutes == null) return "unknown";
  if (minutes >= rules.starter_minutes) return "starter";
  if (minutes >= rules.rotation_minutes) return "rotation";
  return "bench";
}

/** Turn ESPN's response into team -> injuries. Throws if the shape isn't what we expect. */
export function parseInjuries(raw: unknown, players: Players | null, rules: Rules): InjuryMap {
  const teams = (raw as { injuries?: unknown })?.injuries;
  if (!Array.isArray(teams)) throw new Error("unexpected ESPN response");
  const out: InjuryMap = {};
  for (const team of teams) {
    const abbr = TEAM_ABBR[text(team?.displayName, 60)];
    if (!abbr) continue; // unknown team name: leave it out rather than guess
    const minutes = new Map((players?.teams[abbr] ?? []).map((p) => [p.key, p.min]));
    const list: Injury[] = [];
    for (const item of Array.isArray(team?.injuries) ? team.injuries : []) {
      const name = text(item?.athlete?.displayName, 80);
      const status = text(item?.status, 30);
      if (!name || !status) continue;
      const key = norm(name);
      const min = minutes.get(key) ?? null;
      list.push({
        name,
        key,
        status,
        out: status.toLowerCase() === "out",
        note: text(item?.shortComment, 300),
        updated: text(item?.date, 40) || null,
        minutes: min,
        role: roleFor(min, rules),
      });
    }
    list.sort((a, b) => Number(b.out) - Number(a.out) || (b.minutes ?? -1) - (a.minutes ?? -1));
    out[abbr] = list;
  }
  return out;
}

export async function fetchInjuries(players: Players | null, rules: Rules): Promise<InjuryMap> {
  const res = await fetch(ESPN_URL, { cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" });
  if (!res.ok) throw new Error(`ESPN returned HTTP ${res.status}`);
  return parseInjuries(await res.json(), players, rules);
}

export interface TeamSummary {
  missingMinutes: number | null; // null when no listed player has minutes on file
  startersOut: Injury[];
  line: string;
}

function countPhrase(list: Injury[], role: Role, label: string, many: string): string | null {
  const out = list.filter((i) => i.role === role && i.out).length;
  const dtd = list.filter((i) => i.role === role && !i.out).length;
  const parts: string[] = [];
  if (out) parts.push(`${out} ${out === 1 ? label : many} out`);
  if (dtd) parts.push(`${dtd} ${dtd === 1 ? label : many} day-to-day`);
  return parts.length ? parts.join(", ") : null;
}

/** "CHA missing 61 min/game: 2 starters out, 1 rotation player day-to-day." */
export function summarizeTeam(abbr: string, list: Injury[] | undefined): TeamSummary {
  const injuries = list ?? [];
  const startersOut = injuries.filter((i) => i.role === "starter" && i.out);
  if (!injuries.length) return { missingMinutes: 0, startersOut, line: `${abbr}: no one listed` };
  const known = injuries.filter((i) => i.minutes != null);
  const total = known.reduce((s, i) => s + (i.minutes ?? 0), 0);
  const phrases = [
    countPhrase(injuries, "starter", "starter", "starters"),
    countPhrase(injuries, "rotation", "rotation player", "rotation players"),
    countPhrase(injuries, "bench", "bench player", "bench players"),
  ].filter(Boolean);
  if (!known.length) {
    const out = injuries.filter((i) => i.out).length;
    return {
      missingMinutes: null,
      startersOut,
      line: `${abbr}: ${out} out, ${injuries.length - out} day-to-day (minutes not on file)`,
    };
  }
  return {
    missingMinutes: total,
    startersOut,
    line: `${abbr} missing ${Math.round(total)} min/game: ${phrases.join(", ")}`,
  };
}

/** Stable fingerprint of a team's list, for spotting what changed since the visitor last looked. */
export function injuryKeys(list: Injury[] | undefined): string[] {
  return (list ?? []).map((i) => `${i.key}|${i.status.toLowerCase()}`).sort();
}
