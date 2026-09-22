"""Generate the README charts in figures/ from the files in results/.

    python -m src.make_figures        (run src.backtest first for chart 1)
"""
import json

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from src.config import BACKTEST_JSON, BACKTEST_SEASONS_CSV, FIGURES_DIR
from src.betting import load_bets
from src.tracking import load_predictions

BLUE, GRAY, INK, INK_2, GRID, SURFACE = "#2a78d6", "#8a8984", "#0b0b0b", "#52514e", "#e6e5e1", "#fcfcfb"

plt.rcParams.update({
    "figure.facecolor": SURFACE, "axes.facecolor": SURFACE, "savefig.facecolor": SURFACE,
    "axes.edgecolor": GRID, "axes.labelcolor": INK_2, "xtick.color": INK_2, "ytick.color": INK_2,
    "text.color": INK, "axes.grid": True, "grid.color": GRID, "grid.linewidth": 0.8,
    "axes.spines.top": False, "axes.spines.right": False, "axes.spines.left": False,
    "font.size": 10, "axes.titlesize": 12, "axes.titleweight": "bold", "axes.titlelocation": "left",
})


def _pct(ax, step=0.02):
    ax.yaxis.set_major_locator(matplotlib.ticker.MultipleLocator(step))
    ax.yaxis.set_major_formatter(matplotlib.ticker.PercentFormatter(1.0, decimals=0))


def _titles(ax, title, subtitle):
    ax.set_title(title, pad=22)
    ax.text(0, 1.02, subtitle, transform=ax.transAxes, color=INK_2, fontsize=9, va="bottom")


def _money(v, plus=False):
    sign = "−" if v < 0 else ("+" if plus and v > 0 else "")
    return f"{sign}\\${abs(v):,.0f}" if not plus else f"{sign}\\${abs(v):,.2f}"


def backtest_by_season() -> None:
    s = pd.read_csv(BACKTEST_SEASONS_CSV)
    wf = json.loads(BACKTEST_JSON.read_text())["walk_forward"]
    x = np.arange(len(s))
    fig, ax = plt.subplots(figsize=(8, 4.2))
    ax.plot(x, s["home_baseline"], color=GRAY, lw=2, ls="--", marker="o", ms=6, label="Always pick home team")
    ax.plot(x, s["model_accuracy"], color=BLUE, lw=2, marker="o", ms=7, label="Model", zorder=3,
            markeredgecolor=SURFACE, markeredgewidth=1.5)
    ax.text(x[-1] + 0.15, s["model_accuracy"].iloc[-1], "Model", color=INK, va="center", fontsize=9)
    ax.text(x[-1] + 0.15, s["home_baseline"].iloc[-1], "Home team", color=INK_2, va="center", fontsize=9)
    ax.set_xticks(x, s["season"], rotation=0, fontsize=8.5)
    ax.set_xlim(-0.4, len(s) - 0.1)
    ax.set_ylim(0.5, 0.68)
    _pct(ax)
    ax.set_ylabel("Accuracy")
    _titles(ax, f"Backtest: {wf['model_accuracy']:.1%} vs {wf['home_baseline']:.1%} for always picking home", "Each season predicted by a model trained only on earlier seasons")
    ax.legend(loc="lower left", frameon=False, fontsize=9)
    fig.tight_layout()
    fig.savefig(FIGURES_DIR / "backtest_by_season.png", dpi=150)
    plt.close(fig)


def live_accuracy() -> None:
    p = load_predictions().dropna(subset=["correct"])
    wf = json.loads(BACKTEST_JSON.read_text())["walk_forward"]["model_accuracy"]
    daily = p.groupby("date")["correct"].agg(["sum", "count"]).cumsum()
    acc = daily["sum"] / daily["count"]
    se = np.sqrt(acc * (1 - acc) / daily["count"])  # normal-approx 95% interval
    dates = pd.to_datetime(daily.index)

    fig, ax = plt.subplots(figsize=(8, 4.2))
    ax.fill_between(dates, (acc - 1.96 * se).clip(0, 1), (acc + 1.96 * se).clip(0, 1),
                    color=BLUE, alpha=0.12, lw=0, label="95% interval")
    ax.axhline(wf, color=GRAY, ls="--", lw=1.5, label=f"Backtest accuracy ({wf:.1%})")
    ax.plot(dates, acc, color=BLUE, lw=2, marker="o", ms=7, markeredgecolor=SURFACE,
            markeredgewidth=1.5, label="Live cumulative accuracy", zorder=3)
    c, n = int(daily["sum"].iloc[-1]), int(daily["count"].iloc[-1])
    ax.annotate(f"{c}-{n - c} ({c / n:.1%})", (dates[-1], acc.iloc[-1]), xytext=(8, 0),
                textcoords="offset points", va="center", fontsize=9, color=INK)
    ax.set_ylim(0.3, 1.0)
    _pct(ax, 0.1)
    ax.xaxis.set_major_formatter(matplotlib.dates.DateFormatter("%b %-d"))
    ax.set_ylabel("Cumulative accuracy")
    _titles(ax, f"Live test: {n} games, picked before tip-off", "Wide interval = small sample; not distinguishable from the backtest")
    ax.legend(loc="lower right", frameon=False, fontsize=9)
    fig.tight_layout()
    fig.savefig(FIGURES_DIR / "live_accuracy.png", dpi=150)
    plt.close(fig)


def bankroll() -> None:
    b = load_bets().dropna(subset=["result"]).reset_index(drop=True)
    pl = b["profit"].astype(float).cumsum()
    x = np.arange(1, len(b) + 1)
    fig, ax = plt.subplots(figsize=(8, 4.2))
    ax.axhline(0, color=INK_2, lw=1)
    ax.step(np.r_[0, x], np.r_[0, pl], where="post", color=BLUE, lw=2)
    won = b["result"] == "W"
    ax.scatter(x[won], pl[won], s=40, color=BLUE, zorder=3, edgecolor=SURFACE, lw=1.5, label="Win")
    ax.scatter(x[~won], pl[~won], s=40, facecolor=SURFACE, edgecolor=BLUE, lw=1.5, zorder=3, label="Loss")
    ax.annotate(_money(pl.iloc[-1], plus=True) + f" on \\${b['stake'].sum():.0f} wagered", (x[-1], pl.iloc[-1]),
                xytext=(-10, 0), textcoords="offset points", ha="right", va="center", fontsize=9, color=INK)
    ax.yaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda v, _: _money(v)))
    ax.set_xlabel("Bet number")
    ax.set_ylabel("Cumulative profit")
    ax.set_xticks(x)
    _titles(ax, f"Betting simulator: {len(b)} hand-logged bets", "Too few bets to tell skill from luck; stakes varied (\\$10–\\$100)")
    ax.legend(loc="lower left", frameon=False, fontsize=9)
    fig.tight_layout()
    fig.savefig(FIGURES_DIR / "bankroll.png", dpi=150)
    plt.close(fig)


def main() -> None:
    FIGURES_DIR.mkdir(exist_ok=True)
    backtest_by_season()
    live_accuracy()
    bankroll()
    print(f"Wrote figures to {FIGURES_DIR}")


if __name__ == "__main__":
    main()
