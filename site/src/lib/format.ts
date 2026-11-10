const ET = "America/New_York";
const MINUS = "−";

/** American odds with a real minus sign: -150 -> "−150", 130 -> "+130". */
export function fmtOdds(odds: number | null | undefined): string {
  if (odds == null) return "no line";
  return odds > 0 ? `+${odds}` : `${MINUS}${Math.abs(odds)}`;
}

export function pct(x: number, digits = 1): string {
  return `${(x * 100).toFixed(digits)}%`;
}

/** Signed percentage points: 0.0888 -> "+8.9", -0.0994 -> "−9.9". */
export function points(x: number, digits = 1): string {
  const v = (Math.abs(x) * 100).toFixed(digits);
  return `${x < 0 ? MINUS : "+"}${v}`;
}

export function money(x: number, signed = true): string {
  const v = `$${Math.abs(x).toFixed(2)}`;
  if (!signed) return v;
  return `${x < 0 ? MINUS : "+"}${v}`;
}

const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: ET, hour: "numeric", minute: "2-digit" });
const dateFmt = new Intl.DateTimeFormat("en-US", { timeZone: ET, month: "short", day: "numeric" });
const dayFmt = new Intl.DateTimeFormat("en-US", { timeZone: ET, weekday: "short", month: "short", day: "numeric" });
const isoFmt = new Intl.DateTimeFormat("en-CA", { timeZone: ET, year: "numeric", month: "2-digit", day: "2-digit" });

/** "7:40 PM" in US Eastern time. */
export function timeET(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : timeFmt.format(d);
}

/** "Nov 9, 9:25 AM ET" for a UTC timestamp. */
export function stampET(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${dateFmt.format(d)}, ${timeFmt.format(d)} ET`;
}

/** A calendar date "2026-11-09" (already Eastern) -> "Nov 9". */
export function dateLabel(ymd: string | null | undefined, withWeekday = false): string {
  if (!ymd) return "";
  const d = new Date(`${ymd}T12:00:00-05:00`);
  return Number.isNaN(d.getTime()) ? ymd : (withWeekday ? dayFmt : dateFmt).format(d);
}

/** Today's date in US Eastern time as "YYYY-MM-DD". */
export function todayET(now = new Date()): string {
  return isoFmt.format(now);
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
