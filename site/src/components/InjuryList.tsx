import { summarizeTeam, type Injury } from "../lib/injuries";
import { stampET } from "../lib/format";

const ROLE_LABEL = { starter: "Starter", rotation: "Rotation", bench: "Bench", unknown: "" } as const;

export type InjuryState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ok"; map: Record<string, Injury[]>; fetchedAt: string };

/** Who is out or day-to-day for one team. Names and status only: no photos. */
export function InjuryList({ team, state, highlight }: { team: string; state: InjuryState; highlight?: string[] }) {
  if (state.status === "loading") return <p className="inj-note">{team}: loading injuries…</p>;
  if (state.status === "error") return <p className="inj-note">{team}: injuries unavailable</p>;
  const list = state.map[team] ?? [];
  const summary = summarizeTeam(team, list);
  return (
    <div className="inj">
      <p className="inj-line">{summary.line}</p>
      {list.length > 0 && (
        <ul className="inj-list">
          {list.map((i) => (
            <li key={i.key} className={highlight?.includes(i.name) ? "is-new" : undefined}>
              <span className="inj-name">{i.name}</span>
              <span className={`inj-status ${i.out ? "is-out" : ""}`}>{i.status}</span>
              <span className="inj-role">
                {i.minutes != null ? `${ROLE_LABEL[i.role]} · ${i.minutes.toFixed(0)} min` : "minutes not on file"}
              </span>
              {i.note ? <span className="inj-detail">{i.note}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function InjuryStamp({ state }: { state: InjuryState }) {
  if (state.status !== "ok") return null;
  return <p className="inj-stamp">Injuries from ESPN, checked {stampET(state.fetchedAt)}. They can change up to tip-off.</p>;
}
