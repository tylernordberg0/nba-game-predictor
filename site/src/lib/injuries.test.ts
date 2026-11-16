import { describe, expect, it } from "vitest";
import type { Players, Rules } from "./data";
import { parseInjuries, summarizeTeam } from "./injuries";

const rules: Rules = {
  min_confidence: 0.6, min_edge: 0.03, max_favorite: -250, too_good_edge: 0.08, auto_stake: 10,
  starter_share: 0.5, starter_minutes: 28, rotation_minutes: 15,
};
const row = (name: string, min: number, gp: number, gs?: number) => ({ name, key: name.toLowerCase(), min, pts: 10, gp, gs });
const players: Players = {
  season: "2026-27",
  updated_at: "2026-11-16T14:00:00Z",
  teams: {
    GSW: [row("Stephen Curry", 26.3, 10, 10), row("Gui Santos", 18.6, 10, 6), row("Al Horford", 17.2, 11, 1), row("Deep Bench", 6, 8, 0)],
  },
  last_season: { "injured star": row("Injured Star", 34, 60, 58) },
};
const feed = (team: string, names: string[]) => ({
  injuries: [{ displayName: team, injuries: names.map((n) => ({ athlete: { displayName: n }, status: "Out", shortComment: "x" })) }],
});

describe("starter means started at least half his games, not minutes", () => {
  const gsw = parseInjuries(feed("Golden State Warriors", ["Stephen Curry", "Gui Santos", "Al Horford", "Deep Bench"]), players, rules).GSW;
  const role = (n: string) => gsw.find((i) => i.name === n)!.role;

  it("Curry at 26 minutes with 10 starts in 10 games is a starter", () => {
    expect(role("Stephen Curry")).toBe("starter");
  });
  it("6 starts in 10 games is a starter; 1 in 11 is rotation; a 6-minute player is bench", () => {
    expect(role("Gui Santos")).toBe("starter");
    expect(role("Al Horford")).toBe("rotation");
    expect(role("Deep Bench")).toBe("bench");
  });
  it("counts starters out in the team line", () => {
    expect(summarizeTeam("GSW", gsw).startersOut.map((i) => i.name)).toEqual(["Stephen Curry", "Gui Santos"]);
  });
  it("uses last season for a player with no games yet, and says so", () => {
    const mil = parseInjuries(feed("Milwaukee Bucks", ["Injured Star", "Total Unknown"]), players, rules).MIL;
    expect(mil[0]).toMatchObject({ name: "Injured Star", role: "starter", lastSeason: true });
    expect(mil[1]).toMatchObject({ name: "Total Unknown", role: "unknown", minutes: null });
  });
  it("falls back to 28+ minutes when an old export has no starts", () => {
    const old: Players = { ...players, teams: { GSW: [row("Stephen Curry", 26.3, 10), row("Big Minutes", 31, 10)] }, last_season: undefined };
    const list = parseInjuries(feed("Golden State Warriors", ["Stephen Curry", "Big Minutes"]), old, rules).GSW;
    expect(list.find((i) => i.name === "Big Minutes")!.role).toBe("starter");
    expect(list.find((i) => i.name === "Stephen Curry")!.role).toBe("rotation");
  });
});
