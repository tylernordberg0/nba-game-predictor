---
version: 1
slug: "site"
primary_target: "site"
related_targets: []
---

# Site surface brief (Today, Bet checker, Results)

**Scope and mode.** The whole v1 site under `site/`. Today and Bet checker are Operate surfaces; Results is Read. Code-led build.

**Audience and job.** A hiring manager on a laptop, alone, a few minutes. They check tonight's picks against the price, test a moneyline, and read the full record with its baselines. Outcome: "he's rigorous and honest."

**Constraints.** Static files only; data from `site/public/data/`; injuries live from ESPN in the browser. No team logos, no player photos, no live scores. Every bet list carries "Simulated bets · not betting advice". Navigation, tabs, tables, inputs and buttons stay standard web controls.

## Direction contract

THESIS: Tonight's games as a live departures board, with every bet a timestamped ticket that never changes. Refuses the sportsbook grid of neon odds cards and the dashboard of KPI tiles.

OWN-WORLD: Ink near-black top bar and board on a cool light-panel ground with white surfaces; slate and steel gray for structure. One alert yellow, used only for changes and things needing attention. Muted green and red with ✓/✗, in the record only. Condensed gate-board grotesque for headline numbers, tabular monospaced figures on the board, uppercase tracked column labels, plain UI sans for prose. Tickets are segmented stubs.

STORY: The visitor sees the model commit before tip-off, sees the price decide whether a pick becomes a bet, then finds every pick, losses included, with sample sizes and the home-team baseline.

FIRST VIEWPORT: Today at 1440 wide. Ink top bar: name, "Updated 9:41 AM ET · results through Nov 9", tabs Today / Bet checker / Results. Left two-thirds: the board (tip time, game, pick, confidence, DraftKings price, edge, status), sorted by tip-off. Right third: today's tickets, then skipped picks with one-line reasons. Full-width strip under the board: live record with sample size, backtest 62.8% vs 56.0% baseline, betting record. Primary action: open a row, or check a price.

SIGNATURE: The board updates in place. Rows rerank by tip-off and status (scheduled, bet or skip, tipped off, final ✓/✗); a moved price or new injury flashes yellow and keeps a CHANGED label until the visitor has seen it. Reduced motion: a static highlight.

FORM: Catalog world `vernacular-ephemera-boarding-pass-and-gate-board`, chosen by the user on Nov 10, 2026 in an earlier direction round and pinned in the plan doc ("The design direction is already chosen ... Don't re-roll it"); list position not recorded. seed:63d7b3b88de55aa8

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- Finish review and DESIGN.md are deferred to the post-v1 polish pass, by the plan's build order ("After v1: design review with Impeccable").
- Honest risk: the world comes from airports. If a screen reads as a travel app first, pull back to palette and type.
