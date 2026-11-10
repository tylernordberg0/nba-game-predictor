import { useEffect, useMemo, useState } from "react";
import { useApp } from "../App";
import { AlertIcon, CheckIcon, CrossIcon } from "../components/icons";
import { InjuryList, InjuryStamp } from "../components/InjuryList";
import { Ticket } from "../components/Ticket";
import { checkPrice, impliedProb, MAX_FAVORITE, parseAmerican, payout, type Verdict } from "../lib/betting";
import type { Bet, Game } from "../lib/data";
import { dateLabel, fmtOdds, money, pct, points, stampET, timeET } from "../lib/format";
import { summarizeTeam } from "../lib/injuries";
import { loadSandbox, saveSandbox, type SandboxBet } from "../lib/store";

const CUSTOM = "custom";

const HEADLINE: Record<Verdict["kind"], string> = {
  fair: "Fair bet",
  below_margin: "Below the 3-point margin",
  negative_ev: "Loses money on average",
  too_short: "Too short to bet",
  too_good: "Looks too good",
};

function explain(v: Verdict, team: string, prob: number, odds: number): string {
  const gap = `${pct(prob)} against the price's ${pct(v.implied)}`;
  switch (v.kind) {
    case "fair":
      return `The model gives ${team} ${gap}: an edge of ${points(v.edge)} points, which clears the 3-point margin.`;
    case "below_margin":
      return `The model gives ${team} ${gap}. An edge of ${points(v.edge)} points is inside the 3-point margin that covers the model's overconfidence on strong picks.`;
    case "negative_ev":
      return `The model gives ${team} ${gap}. By the model's own number this bet loses ${money(Math.abs(v.ev), false)} per $1 on average, even when the pick is right.`;
    case "too_short":
      return `${fmtOdds(odds)} is shorter than the ${fmtOdds(MAX_FAVORITE)} cap: a $10 bet would win only ${money(payout(odds, 10), false)}. Heavy favorites are never bet.`;
    case "too_good":
      return `The model gives ${team} ${gap}: an edge of ${points(v.edge)} points. When the model and the sportsbook disagree by 8 points or more, the market usually knows something the model can't see.`;
  }
}

export function BetChecker({ preselect }: { preselect: string | null }) {
  const { site, injuries } = useApp();
  const { games, meta, record } = site;
  const first = games.find((g) => g.game_id === preselect) ?? games[0];

  const [gameId, setGameId] = useState<string>(first ? first.game_id : CUSTOM);
  const game: Game | undefined = games.find((g) => g.game_id === gameId);
  const [side, setSide] = useState<string>(first ? first.pick : "");
  const [oddsText, setOddsText] = useState<string>(first?.pick_odds != null ? String(first.pick_odds) : "");
  const [edited, setEdited] = useState(false);
  const [stakeText, setStakeText] = useState("10");
  const [probText, setProbText] = useState("60");
  const [sandbox, setSandbox] = useState<SandboxBet[]>(() => loadSandbox());

  // A link from the board can arrive after the page is already open.
  useEffect(() => {
    const g = games.find((x) => x.game_id === preselect);
    if (g) choose(g.game_id, g.pick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselect]);

  function priceFor(g: Game | undefined, team: string): number | null {
    if (!g?.odds) return null;
    return team === g.home ? g.odds.home : g.odds.away;
  }

  function choose(id: string, team?: string) {
    const g = games.find((x) => x.game_id === id);
    const t = g ? team ?? g.pick : "";
    setGameId(id);
    setSide(t);
    const price = priceFor(g, t);
    setOddsText(price != null ? String(price) : "");
    setEdited(false);
  }

  const prob = useMemo(() => {
    if (game) return side === game.home ? game.home_win_prob : 1 - game.home_win_prob;
    const p = Number(probText);
    return Number.isFinite(p) && p >= 1 && p <= 99 ? p / 100 : null;
  }, [game, side, probText]);

  const odds = parseAmerican(oddsText);
  const stake = Number(stakeText);
  const stakeOk = Number.isFinite(stake) && stake > 0 && stake <= 100000;
  const oddsError = oddsText.trim() !== "" && odds == null;
  const verdict = prob != null && odds != null ? checkPrice(prob, odds) : null;
  const morning = priceFor(game, side);
  const opponent = game ? (side === game.home ? game.away : game.home) : "";
  const teamLabel = game ? side : "your pick";

  const sideSummary = game && injuries.status === "ok" ? summarizeTeam(side, injuries.map[side]) : null;
  const starterOut = sideSummary ? sideSummary.startersOut : [];
  const noneListed =
    game && injuries.status === "ok" && !(injuries.map[side]?.length || injuries.map[opponent]?.length);

  const good = verdict?.kind === "fair" && !verdict.underConfidence && starterOut.length === 0;

  function addToSandbox() {
    if (prob == null || odds == null || !stakeOk) return;
    const bet: SandboxBet = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      placed_at: new Date().toISOString(),
      date: game?.date ?? meta.board_date,
      game_id: game?.game_id ?? null,
      matchup: game ? `${game.away} @ ${game.home}` : "Custom bet",
      pick: game ? side : "Custom",
      prob,
      odds,
      stake: Math.round(stake * 100) / 100,
    };
    const next = [...sandbox, bet];
    setSandbox(next);
    saveSandbox(next);
  }

  function removeFromSandbox(id: string) {
    const next = sandbox.filter((b) => b.id !== id);
    setSandbox(next);
    saveSandbox(next);
  }

  const winners = useMemo(() => new Map(record.filter((p) => p.winner).map((p) => [p.game_id, p.winner!])), [record]);
  const sandboxTickets: { bet: Bet; id: string }[] = sandbox
    .map((b, i) => {
      const winner = b.game_id ? winners.get(b.game_id) : undefined;
      const result = winner ? (winner === b.pick ? "W" : "L") : null;
      const q = impliedProb(b.odds);
      return {
        id: b.id,
        bet: {
          seq: i + 1, date: b.date, game_id: b.game_id ?? "", matchup: b.matchup, pick: b.pick,
          model_prob: b.prob, odds: b.odds, implied_prob: q, edge: b.prob - q, stake: b.stake,
          book: null, placed_at: b.placed_at, result: result as Bet["result"],
          profit: result === "W" ? payout(b.odds, b.stake) : result === "L" ? -b.stake : null,
          source: "manual" as const,
        },
      };
    })
    .reverse();

  return (
    <div className="page checker">
      <div className="page-head">
        <h1>Bet checker</h1>
        <p className="page-sub">
          Enter a moneyline and see what the model's rule says about it. This is the same math the automatic $10 bets
          use.
        </p>
      </div>

      <div className="checker-grid">
        <form className="panel checker-form" onSubmit={(e) => e.preventDefault()} noValidate>
          <div className="field">
            <label htmlFor="bc-game">Game</label>
            <select id="bc-game" value={gameId} onChange={(e) => choose(e.target.value)}>
              {games.map((g) => (
                <option key={g.game_id} value={g.game_id}>
                  {g.away} @ {g.home}
                  {g.tip ? ` · ${timeET(g.tip)} ET` : ""} · {dateLabel(g.date)}
                </option>
              ))}
              <option value={CUSTOM}>Custom: enter my own probability</option>
            </select>
          </div>

          {game ? (
            <fieldset className="field">
              <legend>Team to bet on</legend>
              <div className="seg">
                {[game.away, game.home].map((t) => {
                  const p = t === game.home ? game.home_win_prob : 1 - game.home_win_prob;
                  return (
                    <label key={t} className="seg-opt">
                      <input type="radio" name="bc-side" value={t} checked={side === t} onChange={() => choose(game.game_id, t)} />
                      <span>
                        <b>{t}</b> {pct(p)}
                        {t === game.pick ? <i>model's pick</i> : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ) : (
            <div className="field">
              <label htmlFor="bc-prob">Win probability</label>
              <div className="affix">
                <input
                  id="bc-prob" inputMode="decimal" autoComplete="off" value={probText}
                  onChange={(e) => setProbText(e.target.value)} aria-invalid={prob == null}
                  aria-describedby={prob == null ? "bc-prob-err" : undefined}
                />
                <span>%</span>
              </div>
              {prob == null && <p className="field-err" id="bc-prob-err">Enter a number from 1 to 99.</p>}
            </div>
          )}

          <div className="field-row">
            <div className="field">
              <label htmlFor="bc-odds">Moneyline</label>
              <input
                id="bc-odds" inputMode="text" autoComplete="off" spellCheck={false} placeholder="-150"
                value={oddsText}
                onChange={(e) => {
                  setOddsText(e.target.value);
                  setEdited(true);
                }}
                aria-invalid={oddsError} aria-describedby="bc-odds-help"
              />
            </div>
            <div className="field">
              <label htmlFor="bc-stake">Stake</label>
              <div className="affix affix-lead">
                <span>$</span>
                <input
                  id="bc-stake" inputMode="decimal" autoComplete="off" value={stakeText}
                  onChange={(e) => setStakeText(e.target.value)} aria-invalid={!stakeOk}
                />
              </div>
            </div>
          </div>
          <p className={oddsError ? "field-err" : "field-help"} id="bc-odds-help">
            {oddsError
              ? "American odds are −100 or lower, or +100 or higher. Try −150 or +130."
              : game && morning != null
                ? edited && odds !== morning
                  ? `Your price. DraftKings had ${fmtOdds(morning)} at ${stampET(game.odds?.fetched_at)}.`
                  : `DraftKings at ${stampET(game.odds?.fetched_at)}. Prices move: type the current one.`
                : game
                  ? "No DraftKings line was pulled for this game. Type a price to check it."
                  : "Type American odds, like −150 or +130."}
          </p>
          {!stakeOk && <p className="field-err">Enter a stake above $0.</p>}
          {edited && morning != null && odds !== morning && (
            <button type="button" className="btn btn-quiet" onClick={() => choose(gameId, side)}>
              Reset to the DraftKings price
            </button>
          )}
        </form>

        <section className="panel verdict" aria-live="polite" aria-label="Verdict">
          {verdict && prob != null && odds != null ? (
            <>
              <div className={`verdict-head ${good ? "is-fair" : verdict.kind === "too_good" ? "is-alert" : "is-no"}`}>
                {good ? <CheckIcon /> : verdict.kind === "too_good" ? <AlertIcon /> : <CrossIcon />}
                <h2>{verdict.kind === "fair" && !good ? "Fair price, but not a rule bet" : HEADLINE[verdict.kind]}</h2>
              </div>
              <p className="verdict-why">{explain(verdict, teamLabel, prob, odds)}</p>
              {verdict.underConfidence && (
                <p className="verdict-note">
                  The automatic rule only bets picks at 60% or more. The model gives {teamLabel} {pct(prob)}, so it
                  would not place this bet at any price.
                </p>
              )}
              {game && verdict.kind !== "too_good" && starterOut.length > 0 && (
                <p className="verdict-note">
                  <AlertIcon /> {side} has a starter listed out ({starterOut.map((i) => i.name).join(", ")}). The model
                  has not seen that absence.
                </p>
              )}

              <dl className="math">
                <div><dt>Model probability</dt><dd>{pct(prob)}</dd></div>
                <div><dt>Implied by {fmtOdds(odds)}</dt><dd>{pct(verdict.implied)}</dd></div>
                <div><dt>Edge</dt><dd>{points(verdict.edge)} pts</dd></div>
                <div><dt>Expected value per $1</dt><dd>{money(verdict.ev)}</dd></div>
                <div><dt>Fair odds</dt><dd>{fmtOdds(verdict.fair)}</dd></div>
                <div><dt>Bet only at</dt><dd>{verdict.limit != null ? `${fmtOdds(verdict.limit)} or better` : "–"}</dd></div>
                {stakeOk && (
                  <div><dt>{money(stake, false)} wins</dt><dd>{money(payout(odds, stake), false)}</dd></div>
                )}
              </dl>

              {game && verdict.kind === "too_good" && (
                <div className="toogood">
                  <h3>Check the injuries before trusting this price</h3>
                  {injuries.status === "error" && (
                    <p>Injuries are unavailable right now. Check the news for {side} before betting.</p>
                  )}
                  {starterOut.length > 0 && (
                    <p>
                      <strong>
                        {starterOut.map((i) => i.name).join(", ")} {starterOut.length === 1 ? "is" : "are"} out for {side}.
                      </strong>{" "}
                      The model has not seen that absence. The rule skips this bet.
                    </p>
                  )}
                  {noneListed && (
                    <p>
                      No injuries are listed for either team. Check the news anyway: late scratches and rest days can
                      post close to tip-off.
                    </p>
                  )}
                </div>
              )}

              <div className="verdict-actions">
                <button type="button" className="btn btn-primary" onClick={addToSandbox} disabled={!stakeOk}>
                  Add to my sandbox
                </button>
                <span className="disclaimer">Simulated bets · not betting advice</span>
              </div>
            </>
          ) : (
            <div className="verdict-empty">
              <h2>Enter a moneyline</h2>
              <p>
                The checker compares the model's probability with the price's break-even probability, then applies the
                rule: 60%+ confidence, no shorter than {fmtOdds(MAX_FAVORITE)}, and at least 3 points of edge.
              </p>
            </div>
          )}
        </section>
      </div>

      {game && (
        <section className="panel checker-inj">
          <h2>Injuries for {game.away} @ {game.home}</h2>
          <div className="inj-cols">
            <InjuryList team={side} state={injuries} />
            <InjuryList team={opponent} state={injuries} />
          </div>
          <InjuryStamp state={injuries} />
          <p className="small">The probability uses only team form: it does not move when a player is ruled out.</p>
        </section>
      )}

      <section className="sandbox">
        <h2>
          My sandbox <span className="count">{sandbox.length}</span>
        </h2>
        <p className="page-sub">
          Bets you add here are saved in this browser only. They never touch the site's record, and they settle when the
          next morning's results arrive.
        </p>
        {sandboxTickets.length === 0 ? (
          <p className="empty">Nothing here yet. Check a price above, then add it to see it as a ticket.</p>
        ) : (
          <div className="tickets tickets-wide">
            {sandboxTickets.map(({ bet, id }) => (
              <Ticket
                key={id} bet={bet} label="Sandbox"
                action={
                  <button type="button" className="link-btn" onClick={() => removeFromSandbox(id)}>
                    Remove<span className="sr-only"> {bet.pick} {fmtOdds(bet.odds)}</span>
                  </button>
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
