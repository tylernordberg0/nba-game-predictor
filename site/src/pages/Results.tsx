import { useMemo, useState } from "react";
import { useApp } from "../App";
import {
  BankrollChart, CalibrationChart, CalibrationTable, ChartFrame, LineKey, SeasonChart, SeasonTable,
} from "../components/Charts";
import { CheckIcon, CrossIcon } from "../components/icons";
import { betRecord, pickRecord, wilson, type Bet, type Pick } from "../lib/data";
import { dateLabel, fmtOdds, money, pct, plural, points, stampET } from "../lib/format";

const SECTIONS = [
  ["live", "Live record"],
  ["backtest", "Backtest"],
  ["calibration", "Calibration"],
  ["bets", "Simulated bets"],
  ["method", "Method and limits"],
] as const;

const BANDS = [
  { id: "all", label: "All confidence levels", test: (_: number) => true },
  { id: "65", label: "65%+ (Best bet)", test: (c: number) => c >= 0.65 },
  { id: "58", label: "58–65% (Good)", test: (c: number) => c >= 0.58 && c < 0.65 },
  { id: "50", label: "Under 58% (Lean, Toss-up)", test: (c: number) => c < 0.58 },
];

function describe(p: Pick): string {
  const base = `${dateLabel(p.date)} · ${p.away} @ ${p.home} · picked ${p.pick} at ${pct(p.confidence)}`;
  if (p.correct == null) return `${base} · not final yet`;
  return `${base} · ${p.winner} won · ${p.correct === 1 ? "correct" : "wrong"}`;
}

function PickGrid({ picks }: { picks: Pick[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const byDate = useMemo(() => {
    const m = new Map<string, Pick[]>();
    for (const p of picks) m.set(p.date, [...(m.get(p.date) ?? []), p]);
    return [...m.entries()];
  }, [picks]);
  const current = picks.find((p) => p.game_id === selected);

  if (!picks.length) return <p className="empty">No picks match these filters. Widen the dates or choose all confidence levels.</p>;
  return (
    <div className="grid-wrap">
      <ol className="pick-days">
        {byDate.map(([date, list], idx) => {
          const r = pickRecord(list);
          const version = list[0].model_version;
          const newVersion = idx === 0 || byDate[idx - 1][1][0].model_version !== version;
          return (
            <li key={date} className={`pick-day ${newVersion ? "has-version" : ""}`}>
              {newVersion && (
                <span className="pick-version">{version === "v1" ? "v1 · February test, original script" : `${version} · current model`}</span>
              )}
              <span className="pick-date">{dateLabel(date)}</span>
              <span className="pick-cells">
                {list.map((p) => (
                  <button
                    key={p.game_id} type="button"
                    className={`pick-cell ${p.correct == null ? "is-open" : p.correct === 1 ? "is-win" : "is-loss"}`}
                    aria-pressed={selected === p.game_id} aria-label={describe(p)}
                    onClick={() => setSelected(selected === p.game_id ? null : p.game_id)}
                  >
                    {p.correct == null ? <span className="dot" /> : p.correct === 1 ? <CheckIcon /> : <CrossIcon />}
                  </button>
                ))}
              </span>
              <span className="pick-tally">{r.n ? `${r.wins}–${r.losses}` : "open"}</span>
            </li>
          );
        })}
      </ol>
      <p className="pick-detail" role="status">
        {current ? (
          <>
            <strong>{current.away} @ {current.home}</strong>, {dateLabel(current.date)}. Picked {current.pick} at{" "}
            {pct(current.confidence)}.{" "}
            {current.correct == null ? "Not final yet." : `${current.winner} won: ${current.correct === 1 ? "correct" : "wrong"}.`}{" "}
            {current.predicted_at ? `Saved ${stampET(current.predicted_at)}.` : "Made by the original script, which didn't record a time."}
          </>
        ) : (
          "Select a square to see the game, the pick and when it was saved."
        )}
      </p>
    </div>
  );
}

function BetRows({ label, bets }: { label: string; bets: Bet[] }) {
  const s = betRecord(bets);
  return (
    <tr>
      <th scope="row">{label}</th>
      <td className="num col-opt">{s.n}{s.open ? ` (+${s.open} open)` : ""}</td>
      <td className="num">{s.n ? `${s.wins}–${s.losses}` : "–"}</td>
      <td className="num">{s.n ? money(s.staked, false) : "–"}</td>
      <td className="num">{s.n ? money(s.profit) : "–"}</td>
      <td className="num">{s.roi != null ? `${points(s.roi)}%` : "–"}</td>
    </tr>
  );
}

export function Results() {
  const { site } = useApp();
  const { record, bets, backtest, meta } = site;
  const wf = backtest.walk_forward;
  const dates = record.map((p) => p.date).sort();
  const [version, setVersion] = useState("all");
  const [band, setBand] = useState("all");
  const [from, setFrom] = useState(dates[0] ?? "");
  const [to, setTo] = useState(dates[dates.length - 1] ?? "");

  const filtered = useMemo(() => {
    const test = BANDS.find((b) => b.id === band)!.test;
    return record.filter(
      (p) => (version === "all" || p.model_version === version) && test(p.confidence) && (!from || p.date >= from) && (!to || p.date <= to),
    );
  }, [record, version, band, from, to]);
  const rec = pickRecord(filtered);
  const ci = wilson(rec.wins, rec.n);
  const versions = [...new Set(record.map((p) => p.model_version))];
  const isFiltered = version !== "all" || band !== "all" || from !== dates[0] || to !== dates[dates.length - 1];

  const auto = bets.filter((b) => b.source === "auto");
  const manual = bets.filter((b) => b.source === "manual");
  const feb = bets.filter((b) => b.date.startsWith("2026-02") && b.result != null);
  const febPos = betRecord(feb.filter((b) => b.edge > 0));
  const febNeg = betRecord(feb.filter((b) => b.edge <= 0));
  const all = betRecord(bets);
  const margins = backtest.by_season.map((r) => (r.model_accuracy - r.home_baseline) * 100);

  return (
    <div className="page results">
      <nav className="toc" aria-label="On this page">
        <p className="toc-title">On this page</p>
        <ul>
          {SECTIONS.map(([id, label]) => (
            <li key={id}><a href={`#${id}`}>{label}</a></li>
          ))}
        </ul>
      </nav>

      <div className="doc">
        <div className="page-head">
          <h1>Results</h1>
          <p className="lede">
            The model picks winners about 63% of the time in a nine-season backtest, against 56% for always picking
            the home team. That is real but modest, and it is not the same as beating a sportsbook. Every pick and
            every simulated bet is below, losses included.
          </p>
        </div>

        <section id="live" aria-labelledby="h-live">
          <h2 id="h-live">Live record</h2>
          <p>
            Each square is one pick, saved before tip-off and never edited afterwards. The first 51 come from a
            one-week test in February 2026 with the original script (v1); the rest are the current model (v2), which
            runs each morning.
          </p>

          <div className="filters" role="group" aria-label="Filter the live record">
            <div className="field">
              <label htmlFor="f-version">Model</label>
              <select id="f-version" value={version} onChange={(e) => setVersion(e.target.value)}>
                <option value="all">All versions</option>
                {versions.map((v) => (
                  <option key={v} value={v}>{v === "v1" ? "v1 · February test" : `${v} · current`}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="f-band">Confidence</label>
              <select id="f-band" value={band} onChange={(e) => setBand(e.target.value)}>
                {BANDS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="f-from">From</label>
              <input id="f-from" type="date" value={from} min={dates[0]} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="f-to">To</label>
              <input id="f-to" type="date" value={to} min={from || undefined} max={dates[dates.length - 1]} onChange={(e) => setTo(e.target.value)} />
            </div>
            {isFiltered && (
              <button
                type="button" className="btn btn-quiet"
                onClick={() => {
                  setVersion("all");
                  setBand("all");
                  setFrom(dates[0] ?? "");
                  setTo(dates[dates.length - 1] ?? "");
                }}
              >
                Clear filters
              </button>
            )}
          </div>

          <p className="tally" role="status">
            <span className="tally-fig">{rec.n ? `${rec.wins}–${rec.losses}` : "0–0"}</span>
            <span>
              {rec.rate != null ? `${pct(rec.rate)} correct over ${plural(rec.n, "scored pick")}` : "no scored picks"}
              {ci ? `. With this few games the 95% range is ${pct(ci[0], 0)} to ${pct(ci[1], 0)}` : ""}
              {filtered.length > rec.n ? `. ${plural(filtered.length - rec.n, "pick")} not final yet` : ""}.
            </span>
          </p>
          <PickGrid picks={filtered} />
          <p className="small">
            Results through {dateLabel(meta.results_through)}. The v1 script had a bug: its live features left out each
            team's most recent game. v2 fixes that; the backtest was never affected.
          </p>
        </section>

        <section id="backtest" aria-labelledby="h-backtest">
          <h2 id="h-backtest">Backtest</h2>
          <p>
            Each season is predicted by a model trained only on the seasons before it, so the model never sees the
            future. Over {wf.games.toLocaleString("en-US")} games it was right {pct(wf.model_accuracy)} of the time. Always picking
            the home team gets {pct(wf.home_baseline)}.
          </p>
          <ChartFrame
            title="Accuracy by season, walk-forward"
            legend={<><LineKey color="var(--series)" label="Model" /><LineKey color="var(--series-context)" label="Always pick the home team" /></>}
            table={<SeasonTable rows={backtest.by_season} />}
            caption={`The model beats the baseline in all ${backtest.by_season.length} seasons, by ${Math.min(...margins).toFixed(1)} to ${Math.max(...margins).toFixed(1)} points. The axis starts at 50%, a coin flip.`}
          >
            {(w) => <SeasonChart rows={backtest.by_season} width={w} />}
          </ChartFrame>
          <div className="table-wrap">
            <table className="data">
              <caption>Three ways of testing, all in time order</caption>
              <thead>
                <tr><th scope="col">Evaluation</th><th scope="col" className="num">Games</th><th scope="col" className="num">Model</th><th scope="col" className="num">Always home</th></tr>
              </thead>
              <tbody>
                <tr><th scope="row">Season-by-season walk-forward ({wf.test_seasons})</th><td className="num">{wf.games.toLocaleString("en-US")}</td><td className="num">{pct(wf.model_accuracy)}</td><td className="num">{pct(wf.home_baseline)}</td></tr>
                <tr><th scope="row">80/20 holdout (from {dateLabel(backtest.holdout_80_20.test_from)}, {backtest.holdout_80_20.test_from.slice(0, 4)})</th><td className="num">{backtest.holdout_80_20.test_games.toLocaleString("en-US")}</td><td className="num">{pct(backtest.holdout_80_20.model_accuracy)}</td><td className="num">{pct(backtest.holdout_80_20.home_baseline)}</td></tr>
                <tr><th scope="row">5-fold time-series split (mean)</th><td className="num">{backtest.total_games.toLocaleString("en-US")}</td><td className="num">{pct(backtest.time_series_cv_5.mean)}</td><td className="num">–</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section id="calibration" aria-labelledby="h-calibration">
          <h2 id="h-calibration">Calibration</h2>
          <p>
            A 70% pick should win about 70% of the time. In the backtest the model is close, and slightly
            overconfident on its strongest picks. That gap is why a bet needs 3 points of margin over the price.
          </p>
          <ChartFrame
            title="What the model said against what happened"
            legend={
              <>
                <span className="key"><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="5" fill="var(--series)" /></svg>Share of picks that won</span>
                <span className="key"><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" fill="var(--surface)" stroke="var(--series-context)" strokeWidth="2" /></svg>Model's average confidence</span>
              </>
            }
            table={<CalibrationTable bands={wf.calibration} />}
            caption="About a third of games are close to coin flips for this model, which is why the board labels them Toss-up or Lean."
          >
            {(w) => <CalibrationChart bands={wf.calibration} width={w} />}
          </ChartFrame>
        </section>

        <section id="bets" aria-labelledby="h-bets">
          <h2 id="h-bets">Simulated bets</h2>
          <p className="disclaimer">Simulated bets · not betting advice · no real money is placed</p>
          <p>
            Picking winners and finding good prices are different problems. Automatic bets are the clean test of the
            rule: every qualifying pick gets the same $10 at the morning DraftKings price. Manual bets were typed in by
            hand, with stakes from $10 to $100, so their dollar result mostly reflects bet sizing.
          </p>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th scope="col">Bets</th><th scope="col" className="num col-opt">Settled</th><th scope="col" className="num">Record</th><th scope="col" className="num">Staked</th><th scope="col" className="num">Profit</th><th scope="col" className="num">Return</th></tr>
              </thead>
              <tbody>
                <BetRows label="Automatic ($10 each)" bets={auto} />
                <BetRows label="Manual" bets={manual} />
                <BetRows label="All" bets={bets} />
              </tbody>
            </table>
          </div>
          <p>
            {all.n} settled bets is far too few to show an edge in either direction.
            {auto.length === 0 ? " No automatic bet has qualified yet; the rule started on Nov 10, 2026." : ""} The record
            uses the morning price, and prices and injury lists can change after that.
          </p>

          <ChartFrame
            title="Running profit, all settled bets"
            table={<BetTable bets={bets} />}
            caption="One line because there is one bankroll. Hover or tab through the bets; the table view lists every ticket."
          >
            {(w) => <BankrollChart bets={bets} width={w} />}
          </ChartFrame>

          {feb.length > 0 && (
            <>
              <h3>The February lesson</h3>
              <p>
                The first simulator chose bets by confidence alone and ignored the price. Reviewing those {feb.length}{" "}
                bets afterwards: some were heavy favorites like CLE at {fmtOdds(-650)}, which needs an 86.7% win chance to
                break even when the model gave 72%. Those bets lose money on average even when they win. The checker
                and the automatic rule now compare every pick with its price first.
              </p>
              <div className="table-wrap">
                <table className="data">
                  <caption>February bets, split by whether the model's probability beat the price</caption>
                  <thead>
                    <tr><th scope="col">Group</th><th scope="col" className="num">Bets</th><th scope="col" className="num">Record</th><th scope="col" className="num">Profit or loss</th></tr>
                  </thead>
                  <tbody>
                    <tr><th scope="row">Model probability above the implied probability</th><td className="num">{febPos.n}</td><td className="num">{febPos.wins}–{febPos.losses}</td><td className="num">{money(febPos.profit)}</td></tr>
                    <tr><th scope="row">Model probability below the implied probability</th><td className="num">{febNeg.n}</td><td className="num">{febNeg.wins}–{febNeg.losses}</td><td className="num">{money(febNeg.profit)}</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="small">Fourteen bets prove nothing either way. The point is the method, not the dollars.</p>
            </>
          )}
        </section>

        <section id="method" aria-labelledby="h-method">
          <h2 id="h-method">Method and limits</h2>
          <h3>How a pick is made</h3>
          <p>
            A logistic regression is retrained each morning on every regular-season game since 2015-16. It has 12
            inputs: for the home team and the away team, the average over their last 10 games of point differential,
            effective field-goal percentage, assist-to-turnover ratio, free-throw rate, offensive rebounds and
            defensive rebounds. A game's inputs use only games played before it.
          </p>
          <h3>How a pick becomes a bet</h3>
          <ol>
            <li>The pick is 60% or more.</li>
            <li>DraftKings has a moneyline, and it is no shorter than {fmtOdds(meta.rules.max_favorite)}.</li>
            <li>The model's probability is at least 3 points above the price's implied probability.</li>
            <li>If that edge is 8 points or more, no starter on the picked team is listed out.</li>
          </ol>
          <h3>What the model cannot see</h3>
          <ul>
            <li>Injuries, rest days and trades, until they show up in the next 10 games. This is its biggest blind spot, and why the site lists injuries beside every pick.</li>
            <li>Opponent strength and pace: rebounds are raw counts and nothing is adjusted.</li>
            <li>Roster changes over the summer: early-season picks lean on the end of last season.</li>
          </ul>
          <p>
            The site never claims to beat the market. Backtest numbers can move by a few tenths of a point between runs
            because the NBA sometimes revises old box scores; these were pulled through {dateLabel(backtest.data_pulled_through)},{" "}
            {backtest.data_pulled_through.slice(0, 4)}.
          </p>
        </section>
      </div>
    </div>
  );
}

function BetTable({ bets }: { bets: Bet[] }) {
  return (
    <table className="data data-dense">
      <thead>
        <tr>
          <th scope="col" className="num">No.</th><th scope="col">Date</th><th scope="col">Game</th><th scope="col">Pick</th>
          <th scope="col" className="num">Price</th><th scope="col" className="num">Implied</th><th scope="col" className="num">Model</th>
          <th scope="col" className="num">Edge</th><th scope="col" className="num">Stake</th><th scope="col">Type</th><th scope="col">Result</th><th scope="col" className="num">Profit or loss</th>
        </tr>
      </thead>
      <tbody>
        {bets.map((b) => (
          <tr key={b.seq}>
            <td className="num">{b.seq}</td>
            <td>{dateLabel(b.date)}</td>
            <td>{b.matchup}</td>
            <th scope="row">{b.pick}</th>
            <td className="num">{fmtOdds(b.odds)}</td>
            <td className="num">{pct(b.implied_prob)}</td>
            <td className="num">{pct(b.model_prob)}</td>
            <td className="num">{points(b.edge)}</td>
            <td className="num">{money(b.stake, false)}</td>
            <td>{b.source === "auto" ? "Automatic" : "Manual"}</td>
            <td>
              {b.result == null ? "Open" : (
                <span className={`mark ${b.result === "W" ? "is-win" : "is-loss"}`}>
                  {b.result === "W" ? <CheckIcon /> : <CrossIcon />}
                  {b.result === "W" ? "Won" : "Lost"}
                </span>
              )}
            </td>
            <td className="num">{b.profit != null ? money(b.profit) : "–"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
