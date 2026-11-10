import type { ReactNode } from "react";
import type { Bet } from "../lib/data";
import { fmtOdds, money, pct, points, stampET, dateLabel } from "../lib/format";
import { CheckIcon, CrossIcon } from "./icons";

/** A bet as a segmented stub. Once written it is never edited: only the stamp is added. */
export function Ticket({ bet, label, action }: { bet: Bet; label?: string; action?: ReactNode }) {
  const settled = bet.result != null;
  const won = bet.result === "W";
  return (
    <article className="ticket" data-result={bet.result ?? "open"}>
      <header className="ticket-head">
        <span className="ticket-seq">No. {String(bet.seq).padStart(3, "0")}</span>
        <span className="ticket-source">{label ?? (bet.source === "auto" ? "Automatic" : "Manual")}</span>
        <span className="ticket-date">{dateLabel(bet.date)}</span>
      </header>
      <div className="ticket-main">
        <div className="ticket-pick">
          <span className="ticket-team">{bet.pick}</span>
          <span className="ticket-game">{bet.matchup}</span>
        </div>
        <div className={`stamp ${settled ? (won ? "stamp-win" : "stamp-loss") : "stamp-open"}`}>
          {settled ? won ? <CheckIcon /> : <CrossIcon /> : null}
          <span>{settled ? (won ? "Won" : "Lost") : "Open"}</span>
          {settled && bet.profit != null ? <b>{money(bet.profit)}</b> : null}
        </div>
      </div>
      <dl className="ticket-facts">
        <div><dt>Price</dt><dd>{fmtOdds(bet.odds)}</dd></div>
        <div><dt>Implied</dt><dd>{pct(bet.implied_prob)}</dd></div>
        <div><dt>Model</dt><dd>{pct(bet.model_prob)}</dd></div>
        <div><dt>Edge</dt><dd>{points(bet.edge)}</dd></div>
        <div><dt>Stake</dt><dd>{money(bet.stake, false)}</dd></div>
      </dl>
      <footer className="ticket-foot">
        {bet.placed_at ? `Placed ${stampET(bet.placed_at)}` : "Time not recorded (original script)"}
        {bet.book ? ` · ${bet.book === "draftkings" ? "DraftKings" : bet.book}` : ""}
        {action}
      </footer>
    </article>
  );
}
