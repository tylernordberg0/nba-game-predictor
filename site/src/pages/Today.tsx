import { useMemo, useRef, useState } from "react";
import { useApp, type Change } from "../App";
import { AlertIcon, ArrowIcon, CheckIcon, ChevronIcon, CrossIcon } from "../components/icons";
import { InjuryList, InjuryStamp } from "../components/InjuryList";
import { Ticket } from "../components/Ticket";
import { ruleLimit } from "../lib/betting";
import { betRecord, pickRecord, type Game } from "../lib/data";
import { dateLabel, fmtOdds, money, pct, plural, points, stampET, timeET, todayET } from "../lib/format";
import { href, Link } from "../lib/router";
import { city } from "../lib/teams";
import { useFlip } from "../lib/useFlip";

type Phase = "scheduled" | "tipped" | "final";

function phaseOf(g: Game, now: number, boardIsPast: boolean): Phase {
  if (g.winner) return "final";
  if (boardIsPast) return "tipped";
  return g.tip && Date.parse(g.tip) <= now ? "tipped" : "scheduled";
}

const PHASE_ORDER: Record<Phase, number> = { scheduled: 0, tipped: 1, final: 2 };

function StatusTag({ game, phase }: { game: Game; phase: Phase }) {
  if (phase === "final") {
    const ok = game.correct === 1;
    return (
      <span className={`status status-final ${ok ? "is-win" : "is-loss"}`}>
        {ok ? <CheckIcon /> : <CrossIcon />}
        Final · {game.winner} won
      </span>
    );
  }
  if (phase === "tipped") {
    return <span className="status status-tipped">Tipped off{game.decision.action === "bet" ? " · bet on" : ""}</span>;
  }
  if (game.decision.action === "bet") return <span className="status status-bet">Bet $10</span>;
  if (game.decision.action === "pending") return <span className="status status-skip">Not checked</span>;
  const why = shortReason(game.decision.reason);
  return <span className="status status-skip">Skip{why ? ` · ${why}` : ""}</span>;
}

/** The log's one-line reason, cut down to fit a board cell. The full reason is in the row. */
function shortReason(reason: string): string {
  if (reason.includes("shorter than")) return "too short";
  if (reason.includes("worse than")) return "past limit";
  if (reason.includes("confidence bar")) return "under 60%";
  if (reason.includes("no DraftKings")) return "no line";
  if (reason.includes("too good")) return "injury check";
  if (reason.includes("already started")) return "started";
  if (reason.includes("already has a bet")) return "has a bet";
  return "";
}

function changeText(c: Change): string {
  const parts: string[] = [];
  if (c.price) parts.push("price moved");
  if (c.injuries.length) parts.push(c.injuries.length === 1 ? "new injury" : `${c.injuries.length} new injuries`);
  return parts.join(" · ");
}

function BoardRow({ game, phase }: { game: Game; phase: Phase }) {
  const { injuries, changes, markSeen } = useApp();
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState<Change | null>(null); // what had changed when the row was opened
  const change = changes[game.game_id];
  const panelId = `game-${game.game_id}`;
  const limit = ruleLimit(game.confidence);

  const toggle = () => {
    if (!open && change) {
      setShown(change);
      markSeen(game); // opening the row is "seeing" the change
    }
    setOpen(!open);
  };

  return (
    <div
      className={`row ${open ? "is-open" : ""} ${change ? "is-changed" : ""}`}
      role="row"
      data-flip={game.game_id}
      data-phase={phase}
    >
      <div className="row-main">
        <span className="cell c-tip fig" role="cell">
          {game.tip ? timeET(game.tip) : <span className="dim">TBD</span>}
        </span>
        <span className="cell c-game" role="cell">
          <span className="matchup">
            {game.away} <span className="at">@</span> {game.home}
          </span>
          <span className="cities">
            {city(game.away)} at {city(game.home)}
          </span>
          {change && (
            <span className="changed">
              <AlertIcon />
              Changed · {changeText(change)}
            </span>
          )}
        </span>
        <span className="cell c-pick" role="cell">
          <span className="pick">{game.pick}</span>
          <span className="rating" data-rating={game.rating}>{game.rating}</span>
        </span>
        <span className="cell c-conf fig" role="cell">{pct(game.confidence)}</span>
        <span className={`cell c-price fig ${change?.price ? "is-moved" : ""}`} role="cell">
          {game.pick_odds != null ? fmtOdds(game.pick_odds) : <span className="dim">no line</span>}
        </span>
        <span className="cell c-edge fig" role="cell">
          {game.edge != null ? points(game.edge) : <span className="dim">–</span>}
        </span>
        <span className="cell c-status" role="cell">
          <StatusTag game={game} phase={phase} />
        </span>
        <span className="cell c-more" role="cell">
          <button type="button" className="expander" aria-expanded={open} aria-controls={panelId} onClick={toggle}>
            <span className="sr-only">
              {open ? "Hide" : "Show"} details for {game.away} at {game.home}
            </span>
            <ChevronIcon />
          </button>
        </span>
      </div>

      {open && (
        <div className="row-detail" id={panelId}>
          {shown && (shown.price || shown.injuries.length > 0) && (
            <p className="detail-change">
              <AlertIcon />
              <span>
                Since you last looked:{" "}
                {shown.price ? `the price moved from ${fmtOdds(shown.price.from)} to ${fmtOdds(shown.price.to)}` : ""}
                {shown.price && shown.injuries.length ? "; " : ""}
                {shown.injuries.length ? `new on the injury list: ${shown.injuries.join(", ")}` : ""}.
              </span>
            </p>
          )}
          <div className="detail-grid">
            <dl className="facts">
              <div>
                <dt>Model</dt>
                <dd>
                  {game.pick} {pct(game.confidence)}
                </dd>
              </div>
              <div>
                <dt>DraftKings price</dt>
                <dd>{game.pick_odds != null ? fmtOdds(game.pick_odds) : "no line"}</dd>
              </div>
              <div>
                <dt>Implied probability</dt>
                <dd>{game.implied_prob != null ? pct(game.implied_prob) : "–"}</dd>
              </div>
              <div>
                <dt>Edge</dt>
                <dd>{game.edge != null ? `${points(game.edge)} pts` : "–"}</dd>
              </div>
              <div>
                <dt>Fair odds</dt>
                <dd>{fmtOdds(game.fair_odds)}</dd>
              </div>
              <div>
                <dt>Bet only at</dt>
                <dd>{limit != null ? `${fmtOdds(limit)} or better` : "never: under 60%"}</dd>
              </div>
            </dl>
            <div className="detail-why">
              <p className="why">
                <strong>
                  {game.decision.action === "bet" ? "Bet placed." : game.decision.action === "skip" ? "No bet:" : "Not checked yet."}
                </strong>{" "}
                {game.decision.action === "skip" ? `${game.decision.reason}.` : ""}
                {game.decision.action === "bet" && limit != null ? `The price beat the ${fmtOdds(limit)} limit.` : ""}
              </p>
              <p className="small">
                {game.predicted_at ? `Pick saved ${stampET(game.predicted_at)}. ` : ""}
                {game.odds?.fetched_at ? `Price pulled ${stampET(game.odds.fetched_at)}; it may have moved since.` : ""}
              </p>
              <Link to={href("bet-checker", { game: game.game_id })} className="btn btn-on-ink">
                Check a price for this game <ArrowIcon />
              </Link>
            </div>
          </div>
          <div className="detail-inj">
            <h3>Injuries</h3>
            <div className="inj-cols">
              <InjuryList team={game.away} state={injuries} highlight={shown?.injuries} />
              <InjuryList team={game.home} state={injuries} highlight={shown?.injuries} />
            </div>
            <InjuryStamp state={injuries} />
            <p className="small">The probability uses only team form. It does not know about any of these absences.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function Today() {
  const { site, now } = useApp();
  const { meta, games, bets, record, backtest } = site;
  const today = todayET(new Date(now));
  const boardIsPast = meta.board_date < today;
  const boardRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    const withPhase = games.map((g) => ({ game: g, phase: phaseOf(g, now, boardIsPast) }));
    return withPhase.sort(
      (a, b) =>
        PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase] ||
        (a.game.tip ? Date.parse(a.game.tip) : Infinity) - (b.game.tip ? Date.parse(b.game.tip) : Infinity) ||
        b.game.confidence - a.game.confidence,
    );
  }, [games, now, boardIsPast]);
  useFlip(boardRef, rows.map((r) => r.game.game_id).join(","));

  const todaysBets = bets.filter((b) => b.date === meta.board_date);
  const skipped = games.filter((g) => g.decision.action !== "bet");
  const latestSettled = bets.filter((b) => b.result != null).slice(-2).reverse();

  const live = pickRecord(record);
  const v2 = pickRecord(record.filter((p) => p.model_version !== "v1"));
  const betsAll = betRecord(bets);
  const wf = backtest.walk_forward;

  const stale = meta.export_date < today;
  const offDay = !stale && meta.board_date < meta.export_date;

  return (
    <div className="page today">
      {stale && (
        <div className="notice notice-alert" role="status">
          <AlertIcon />
          <span>
            <strong>Showing data from {dateLabel(meta.export_date, true)}.</strong> Today's update hasn't run yet, so
            these are not today's games.
          </span>
        </div>
      )}
      {offDay && (
        <div className="notice" role="status">
          <span>
            <strong>No picks for today.</strong> Showing the last game day, {dateLabel(meta.board_date, true)}.
          </span>
        </div>
      )}

      <div className="page-head">
        <h1>{boardIsPast ? `Games for ${dateLabel(meta.board_date, true)}` : "Tonight's games"}</h1>
        <p className="page-sub">
          {boardIsPast ? "" : `${dateLabel(meta.board_date, true)} · `}
          {plural(games.length, "game")} · all times Eastern · picks saved before tip-off and never edited
        </p>
      </div>

      <div className="today-grid">
        <div className="main-col">
        <section className="board" aria-label="Today's board">
          {games.length === 0 ? (
            <div className="board-empty">
              <p className="board-empty-title">No games on the board</p>
              <p>The model posts its picks on game days, each morning before tip-off.</p>
              <Link to={href("results")} className="btn btn-on-ink">See the full record <ArrowIcon /></Link>
            </div>
          ) : (
            <div role="table" aria-label="Today's games, sorted by tip-off" ref={boardRef}>
              <div className="row-head" role="row">
                <span role="columnheader" className="cell c-tip">Tip (ET)</span>
                <span role="columnheader" className="cell c-game">Game</span>
                <span role="columnheader" className="cell c-pick">Pick</span>
                <span role="columnheader" className="cell c-conf" aria-label="Confidence">Conf.</span>
                <span role="columnheader" className="cell c-price">DraftKings</span>
                <span role="columnheader" className="cell c-edge">Edge</span>
                <span role="columnheader" className="cell c-status">Status</span>
                <span role="columnheader" className="cell c-more"><span className="sr-only">Details</span></span>
              </div>
              {rows.map(({ game, phase }) => (
                <BoardRow key={game.game_id} game={game} phase={phase} />
              ))}
            </div>
          )}
          {games.length > 0 && (
            <p className="board-foot">
              Edge is the model's probability minus the price's implied probability, in points. Prices are a snapshot
              {meta.odds_fetched_at ? ` from ${stampET(meta.odds_fetched_at)}` : ""}. Best bet, Good, Lean and Toss-up are
              confidence bands, not bets: the price decides. A row is flagged Changed when its price or injury list
              moves after your first visit. Final results arrive the next morning.
            </p>
          )}
        </section>

        <section className="strip" aria-label="Track record">
          <div className="strip-cell">
            <h2>Live record</h2>
            <p className="strip-fig">
              {live.wins}–{live.losses}
              <span>{live.rate != null ? pct(live.rate) : ""}</span>
            </p>
            <p className="strip-note">
              {plural(live.n, "pick")} scored, every one saved before tip-off. Current model (v2): {v2.wins}–{v2.losses}{" "}
              over {plural(v2.n, "pick")}. Too few to judge on their own.
            </p>
          </div>
          <div className="strip-cell">
            <h2>Backtest</h2>
            <p className="strip-fig">
              {pct(wf.model_accuracy)}
              <span>vs {pct(wf.home_baseline)} always picking home</span>
            </p>
            <p className="strip-note">
              {wf.games.toLocaleString("en-US")} games, {wf.test_seasons.replace(" to ", " to ")}. Each season predicted by a
              model trained only on earlier seasons.
            </p>
          </div>
          <div className="strip-cell">
            <h2>Simulated bets</h2>
            <p className="strip-fig">
              {betsAll.wins}–{betsAll.losses}
              <span>
                {money(betsAll.profit)} on {money(betsAll.staked, false)} staked
              </span>
            </p>
            <p className="strip-note">
              {plural(betsAll.n, "settled bet")}. That is far too few to show an edge either way; no real money is placed.
            </p>
          </div>
          <Link to={href("results")} className="strip-link">
            Full record and method <ArrowIcon />
          </Link>
        </section>
        </div>

        <aside className="side" aria-label="Today's bets">
          <section>
            <h2>
              Today's tickets <span className="count">{todaysBets.length}</span>
            </h2>
            <p className="disclaimer">Simulated bets · not betting advice</p>
            {todaysBets.length > 0 ? (
              <div className="tickets">{todaysBets.map((b) => <Ticket key={b.seq} bet={b} />)}</div>
            ) : (
              <>
                <p className="empty">
                  {games.length ? "No bets today: no pick cleared the rule at its price." : "No bets today."} A pick
                  needs 60%+ confidence, a price no shorter than {fmtOdds(meta.rules.max_favorite)} and a 3-point
                  margin over the price.
                </p>
                {latestSettled.length > 0 && (
                  <>
                    <h3 className="side-sub">Latest settled tickets</h3>
                    <div className="tickets">{latestSettled.map((b) => <Ticket key={b.seq} bet={b} />)}</div>
                  </>
                )}
              </>
            )}
          </section>

          {skipped.length > 0 && (
            <section>
              <h2>
                Skipped <span className="count">{skipped.length}</span>
              </h2>
              <ul className="skips">
                {skipped.map((g) => (
                  <li key={g.game_id}>
                    <span className="skip-pick">
                      <b>{g.pick}</b> {pct(g.confidence)}
                    </span>
                    <span className="skip-game">{g.away} @ {g.home}</span>
                    <span className="skip-why">{g.decision.reason}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>

    </div>
  );
}
