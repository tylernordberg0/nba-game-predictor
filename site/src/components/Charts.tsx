// The three Results charts, drawn as plain SVG. Each one has a hover and
// keyboard readout, and a table view with the same numbers.
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { Bet, CalibrationBand, SeasonRow } from "../lib/data";
import { fmtOdds, money, pct } from "../lib/format";

const SERIES = "var(--series)";
const CONTEXT = "var(--series-context)";
const GRID = "var(--chart-grid)";
const AXIS = "var(--chart-axis)";

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
    ro.observe(el);
    setW(Math.floor(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

interface Tip {
  x: number;
  y: number;
  body: ReactNode;
}

function TooltipBox({ tip, width }: { tip: Tip | null; width: number }) {
  if (!tip) return null;
  const flip = tip.x > width / 2;
  return (
    <div
      className="chart-tip"
      role="status"
      style={{ left: flip ? undefined : tip.x + 12, right: flip ? width - tip.x + 12 : undefined, top: Math.max(0, tip.y - 12) }}
    >
      {tip.body}
    </div>
  );
}

export function ChartFrame(props: {
  title: string;
  caption: ReactNode;
  legend?: ReactNode;
  table: ReactNode;
  children: (width: number) => ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);
  const [ref, width] = useWidth<HTMLDivElement>();
  const id = useId();
  return (
    <figure className="chart">
      <div className="chart-top">
        <figcaption id={id}>
          <span className="chart-title">{props.title}</span>
        </figcaption>
        <button type="button" className="btn btn-quiet btn-small" aria-pressed={showTable} onClick={() => setShowTable(!showTable)}>
          {showTable ? "Show chart" : "Show table"}
        </button>
      </div>
      {!showTable && props.legend ? <div className="chart-legend">{props.legend}</div> : null}
      <div ref={ref} className="chart-body" aria-labelledby={id}>
        {showTable ? <div className="table-wrap">{props.table}</div> : width > 0 ? props.children(width) : null}
      </div>
      <p className="chart-caption">{props.caption}</p>
    </figure>
  );
}

export const LineKey = ({ color, label }: { color: string; label: string }) => (
  <span className="key">
    <svg width="18" height="10" aria-hidden="true"><line x1="1" y1="5" x2="17" y2="5" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>
    {label}
  </span>
);

// ---------- Backtest by season: model vs always-home ----------

export function SeasonChart({ rows, width }: { rows: SeasonRow[]; width: number }) {
  const [tip, setTip] = useState<Tip | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const narrow = width < 560;
  const m = { l: 44, r: narrow ? 58 : 132, t: 14, b: 34 };
  const h = 300;
  const iw = Math.max(40, width - m.l - m.r);
  const ih = h - m.t - m.b;
  const lo = 0.5;
  const hi = 0.7;
  const x = (i: number) => m.l + (rows.length === 1 ? iw / 2 : (i / (rows.length - 1)) * iw);
  const y = (v: number) => m.t + (1 - (v - lo) / (hi - lo)) * ih;
  const path = (key: "model_accuracy" | "home_baseline") => rows.map((r, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(r[key]).toFixed(1)}`).join(" ");
  const ticks = [0.5, 0.55, 0.6, 0.65, 0.7];
  const last = rows[rows.length - 1];
  const every = narrow ? 2 : 1;

  const show = (i: number) => {
    const r = rows[i];
    setActive(i);
    setTip({
      x: x(i),
      y: y(r.model_accuracy),
      body: (
        <>
          <div className="tip-head">{r.season}</div>
          <div className="tip-row"><LineKey color={SERIES} label="Model" /><b>{pct(r.model_accuracy)}</b></div>
          <div className="tip-row"><LineKey color={CONTEXT} label="Always home" /><b>{pct(r.home_baseline)}</b></div>
          <div className="tip-foot">{r.games.toLocaleString("en-US")} games · trained on {r.train_games.toLocaleString("en-US")}</div>
        </>
      ),
    });
  };
  const hide = () => {
    setActive(null);
    setTip(null);
  };

  return (
    <div className="chart-plot" onPointerLeave={hide}>
      <svg width={width} height={h} role="img" aria-label="Backtest accuracy by season: the model against always picking the home team">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={m.l + iw} y1={y(t)} y2={y(t)} stroke={t === lo ? AXIS : GRID} strokeWidth="1" />
            <text x={m.l - 8} y={y(t)} dy="0.32em" textAnchor="end" className="tick">{pct(t, 0)}</text>
          </g>
        ))}
        {rows.map((r, i) =>
          i % every === 0 || i === rows.length - 1 ? (
            <text key={r.season} x={x(i)} y={h - 10} textAnchor="middle" className="tick">{narrow ? `'${r.season.slice(2, 4)}` : r.season}</text>
          ) : null,
        )}
        {active != null && <line x1={x(active)} x2={x(active)} y1={m.t} y2={m.t + ih} stroke={AXIS} strokeWidth="1" />}
        <path d={path("home_baseline")} fill="none" stroke={CONTEXT} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <path d={path("model_accuracy")} fill="none" stroke={SERIES} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {[rows.length - 1, ...(active != null && active !== rows.length - 1 ? [active] : [])].map((i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(rows[i].home_baseline)} r="5" fill={CONTEXT} stroke="var(--surface)" strokeWidth="2" />
            <circle cx={x(i)} cy={y(rows[i].model_accuracy)} r="5" fill={SERIES} stroke="var(--surface)" strokeWidth="2" />
          </g>
        ))}
        <text x={x(rows.length - 1) + 12} y={y(last.model_accuracy)} dy="0.32em" className="end-label">
          {narrow ? pct(last.model_accuracy) : `Model ${pct(last.model_accuracy)}`}
        </text>
        <text x={x(rows.length - 1) + 12} y={y(last.home_baseline)} dy="0.32em" className="end-label end-label-muted">
          {narrow ? pct(last.home_baseline) : `Always home ${pct(last.home_baseline)}`}
        </text>
        {rows.map((r, i) => {
          const half = rows.length > 1 ? iw / (rows.length - 1) / 2 : iw / 2;
          return (
            <rect
              key={r.season} x={x(i) - half} y={m.t} width={half * 2} height={ih + m.b} fill="transparent" tabIndex={0}
              className="hit" aria-label={`${r.season}: model ${pct(r.model_accuracy)}, always home ${pct(r.home_baseline)}, ${r.games} games`}
              onPointerEnter={() => show(i)} onPointerMove={() => show(i)} onFocus={() => show(i)} onBlur={hide}
            />
          );
        })}
      </svg>
      <TooltipBox tip={tip} width={width} />
    </div>
  );
}

export function SeasonTable({ rows }: { rows: SeasonRow[] }) {
  return (
    <table className="data">
      <thead>
        <tr><th scope="col">Season</th><th scope="col" className="num">Games</th><th scope="col" className="num">Model</th><th scope="col" className="num">Always home</th><th scope="col" className="num">Margin</th><th scope="col" className="num">Trained on</th></tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.season}>
            <th scope="row">{r.season}</th>
            <td className="num">{r.games.toLocaleString("en-US")}</td>
            <td className="num">{pct(r.model_accuracy)}</td>
            <td className="num">{pct(r.home_baseline)}</td>
            <td className="num">+{((r.model_accuracy - r.home_baseline) * 100).toFixed(1)} pts</td>
            <td className="num">{r.train_games.toLocaleString("en-US")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---------- Calibration: what the model said vs what happened ----------

const BAND_NAME: Record<string, string> = {
  "50%-58%": "50–58% · Toss-up and Lean",
  "58%-65%": "58–65% · Good",
  "65%-100%": "65%+ · Best bet",
};

export function CalibrationChart({ bands, width }: { bands: CalibrationBand[]; width: number }) {
  const [tip, setTip] = useState<Tip | null>(null);
  const narrow = width < 560;
  const rowH = narrow ? 64 : 52;
  const m = { l: narrow ? 12 : 196, r: 24, t: 10, b: 32 };
  const h = m.t + bands.length * rowH + m.b;
  const iw = Math.max(40, width - m.l - m.r);
  const lo = 0.5;
  const hi = 0.8;
  const x = (v: number) => m.l + ((v - lo) / (hi - lo)) * iw;
  const ticks = [0.5, 0.6, 0.7, 0.8];

  return (
    <div className="chart-plot" onPointerLeave={() => setTip(null)}>
      <svg width={width} height={h} role="img" aria-label="Calibration: average confidence against the share of picks that won, by confidence band">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={m.t} y2={h - m.b} stroke={GRID} strokeWidth="1" />
            <text x={x(t)} y={h - 10} textAnchor="middle" className="tick">{pct(t, 0)}</text>
          </g>
        ))}
        {bands.map((b, i) => {
          const cy = m.t + i * rowH + (narrow ? rowH * 0.66 : rowH / 2);
          const show = () =>
            setTip({
              x: x(b.accuracy),
              y: cy,
              body: (
                <>
                  <div className="tip-head">{BAND_NAME[b.confidence] ?? b.confidence}</div>
                  <div className="tip-row"><span className="key">Won</span><b>{pct(b.accuracy)}</b></div>
                  <div className="tip-row"><span className="key">Average confidence</span><b>{pct(b.mean_confidence)}</b></div>
                  <div className="tip-foot">{b.games.toLocaleString("en-US")} games</div>
                </>
              ),
            });
          return (
            <g key={b.confidence}>
              <text x={narrow ? m.l : m.l - 16} y={narrow ? m.t + i * rowH + 16 : cy} dy={narrow ? 0 : "0.32em"} textAnchor={narrow ? "start" : "end"} className="row-label">
                {BAND_NAME[b.confidence] ?? b.confidence}
              </text>
              <line x1={x(b.accuracy)} x2={x(b.mean_confidence)} y1={cy} y2={cy} stroke={CONTEXT} strokeWidth="2" strokeLinecap="round" />
              <circle cx={x(b.mean_confidence)} cy={cy} r="5" fill="var(--surface)" stroke={CONTEXT} strokeWidth="2" />
              <circle cx={x(b.accuracy)} cy={cy} r="6" fill={SERIES} stroke="var(--surface)" strokeWidth="2" />
              <text x={x(b.accuracy) - 12} y={cy} dy="0.32em" textAnchor="end" className="end-label">{pct(b.accuracy)}</text>
              <rect
                x={m.l} y={cy - rowH / 2 + 4} width={iw} height={rowH - 8} fill="transparent" tabIndex={0} className="hit"
                aria-label={`${b.confidence}: won ${pct(b.accuracy)}, average confidence ${pct(b.mean_confidence)}, ${b.games} games`}
                onPointerEnter={show} onPointerMove={show} onFocus={show} onBlur={() => setTip(null)}
              />
            </g>
          );
        })}
      </svg>
      <TooltipBox tip={tip} width={width} />
    </div>
  );
}

export function CalibrationTable({ bands }: { bands: CalibrationBand[] }) {
  return (
    <table className="data">
      <thead>
        <tr><th scope="col">Confidence band</th><th scope="col" className="num">Games</th><th scope="col" className="num">Average confidence</th><th scope="col" className="num">Won</th><th scope="col" className="num">Gap</th></tr>
      </thead>
      <tbody>
        {bands.map((b) => (
          <tr key={b.confidence}>
            <th scope="row">{BAND_NAME[b.confidence] ?? b.confidence}</th>
            <td className="num">{b.games.toLocaleString("en-US")}</td>
            <td className="num">{pct(b.mean_confidence)}</td>
            <td className="num">{pct(b.accuracy)}</td>
            <td className="num">{((b.accuracy - b.mean_confidence) * 100).toFixed(1)} pts</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---------- Bankroll: running profit across settled bets ----------

export function BankrollChart({ bets, width }: { bets: Bet[]; width: number }) {
  const [tip, setTip] = useState<Tip | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const settled = bets.filter((b) => b.result != null && b.profit != null);
  let run = 0;
  const pts = settled.map((b) => ({ bet: b, total: (run += b.profit ?? 0) }));
  const values = [0, ...pts.map((p) => p.total)];
  const pad = Math.max(10, (Math.max(...values) - Math.min(...values)) * 0.12);
  const lo = Math.min(...values) - pad;
  const hi = Math.max(...values) + pad;
  const m = { l: 52, r: 76, t: 14, b: 34 };
  const h = 280;
  const iw = Math.max(40, width - m.l - m.r);
  const ih = h - m.t - m.b;
  const n = pts.length;
  const x = (i: number) => m.l + (n ? (i / n) * iw : 0); // i = 0 is the start, before any bet
  const y = (v: number) => m.t + (1 - (v - lo) / (hi - lo)) * ih;
  if (!n) return <p className="empty">No settled bets yet.</p>;

  let d = `M${x(0)},${y(0)}`;
  pts.forEach((p, i) => (d += ` L${x(i + 1).toFixed(1)},${y(p.total).toFixed(1)}`));
  const area = `${d} L${x(n)},${y(0)} Z`;
  const step = Math.max(20, Math.round((hi - lo) / 5 / 20) * 20);
  const ticks: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) ticks.push(t);
  const end = pts[n - 1];

  const show = (i: number) => {
    const p = pts[i];
    setActive(i);
    setTip({
      x: x(i + 1),
      y: y(p.total),
      body: (
        <>
          <div className="tip-head">Bet {i + 1} · {p.bet.date}</div>
          <div className="tip-row"><span className="key">{p.bet.matchup}, {p.bet.pick} {fmtOdds(p.bet.odds)}</span></div>
          <div className="tip-row"><span className="key">{p.bet.result === "W" ? "Won" : "Lost"} on {money(p.bet.stake, false)}</span><b>{money(p.bet.profit ?? 0)}</b></div>
          <div className="tip-row"><span className="key">Running total</span><b>{money(p.total)}</b></div>
        </>
      ),
    });
  };
  const hide = () => {
    setActive(null);
    setTip(null);
  };

  return (
    <div className="chart-plot" onPointerLeave={hide}>
      <svg width={width} height={h} role="img" aria-label={`Running profit across ${n} settled simulated bets, ending at ${money(end.total)}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={m.l + iw} y1={y(t)} y2={y(t)} stroke={t === 0 ? AXIS : GRID} strokeWidth="1" />
            <text x={m.l - 8} y={y(t)} dy="0.32em" textAnchor="end" className="tick">{t === 0 ? "$0" : `${t < 0 ? "−" : "+"}$${Math.abs(t)}`}</text>
          </g>
        ))}
        <text x={m.l} y={h - 10} className="tick">Start</text>
        <text x={m.l + iw} y={h - 10} textAnchor="end" className="tick">Bet {n}</text>
        <path d={area} fill={SERIES} opacity="0.1" />
        <path d={d} fill="none" stroke={SERIES} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {active != null && <line x1={x(active + 1)} x2={x(active + 1)} y1={m.t} y2={m.t + ih} stroke={AXIS} strokeWidth="1" />}
        {[n - 1, ...(active != null && active !== n - 1 ? [active] : [])].map((i) => (
          <circle key={i} cx={x(i + 1)} cy={y(pts[i].total)} r="5" fill={SERIES} stroke="var(--surface)" strokeWidth="2" />
        ))}
        <text x={x(n) + 12} y={y(end.total)} dy="0.32em" className="end-label">{money(end.total)}</text>
        {pts.map((p, i) => (
          <rect
            key={p.bet.seq} x={x(i + 1) - iw / n / 2} y={m.t} width={iw / n} height={ih + m.b} fill="transparent" tabIndex={0} className="hit"
            aria-label={`Bet ${i + 1}, ${p.bet.matchup}, ${p.bet.pick} at ${p.bet.odds}: ${p.bet.result === "W" ? "won" : "lost"} ${money(p.bet.profit ?? 0)}, running total ${money(p.total)}`}
            onPointerEnter={() => show(i)} onPointerMove={() => show(i)} onFocus={() => show(i)} onBlur={hide}
          />
        ))}
      </svg>
      <TooltipBox tip={tip} width={width} />
    </div>
  );
}
