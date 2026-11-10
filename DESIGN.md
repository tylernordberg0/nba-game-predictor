---
name: NBA Game Predictor
description: Tonight's NBA picks on an ink board, every simulated bet a ticket, the full record with its baselines.
colors:
  ink: "#0d1217"
  ink-2: "#141b23"
  ink-3: "#1d2630"
  ink-line: "#2b3743"
  on-ink: "#f4f6f8"
  on-ink-2: "#adb9c6"
  on-ink-3: "#8795a4"
  panel: "#e9edf1"
  surface: "#ffffff"
  line: "#d0d8e0"
  line-2: "#e3e8ed"
  control: "#7f8d9b"
  text: "#0d1217"
  text-2: "#3f4c59"
  text-3: "#566472"
  alert: "#ffd60a"
  alert-ink: "#1c1600"
  alert-wash: "#fff6c7"
  win: "#1f6f4a"
  win-bg: "#dff0e7"
  win-on-ink: "#7ed3a6"
  loss: "#a33c34"
  loss-bg: "#f7e4e1"
  loss-on-ink: "#f19a90"
  series: "#0d1217"
  series-context: "#8795a4"
  chart-grid: "#e3e8ed"
  chart-axis: "#b4bfca"
  focus: "#0d1217"
typography:
  display:
    fontFamily: "\"Barlow Condensed\", \"Barlow\", system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "0.01em"
  figure-large:
    fontFamily: "\"Barlow Condensed\", \"Barlow\", system-ui, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "0.01em"
  headline:
    fontFamily: "\"Barlow Condensed\", \"Barlow\", system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "0.02em"
  board-code:
    fontFamily: "\"Barlow Condensed\", \"Barlow\", system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.02em"
  title:
    fontFamily: "\"Barlow Condensed\", \"Barlow\", system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "0.03em"
  lede:
    fontFamily: "\"Barlow\", system-ui, -apple-system, \"Segoe UI\", sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "\"Barlow\", system-ui, -apple-system, \"Segoe UI\", sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  body-small:
    fontFamily: "\"Barlow\", system-ui, -apple-system, \"Segoe UI\", sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "\"Barlow\", system-ui, -apple-system, \"Segoe UI\", sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    letterSpacing: "0.1em"
  figure:
    fontFamily: "\"Chivo Mono\", ui-monospace, \"SF Mono\", Menlo, monospace"
    fontSize: "0.9375rem"
    fontWeight: 400
    letterSpacing: "-0.01em"
    fontFeature: "\"tnum\""
rounded:
  tag: "3px"
  radius: "4px"
  container: "6px"
  pill: "999px"
spacing:
  gutter-narrow: "16px"
  gutter: "24px"
  page: "1392px"
components:
  topbar:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    height: "60px"
  tab:
    textColor: "{colors.on-ink-2}"
    padding: "0 14px"
    height: "44px"
  tab-active:
    textColor: "{colors.on-ink}"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.radius}"
    padding: "0 18px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.ink-3}"
  button-primary-disabled:
    backgroundColor: "{colors.line}"
    textColor: "{colors.text-3}"
  button-quiet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.radius}"
    padding: "0 18px"
    height: "44px"
  button-on-ink:
    textColor: "{colors.on-ink}"
    rounded: "{rounded.radius}"
    padding: "0 18px"
    height: "44px"
  button-on-ink-hover:
    backgroundColor: "{colors.ink-3}"
  button-small:
    padding: "0 12px"
    height: "32px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.radius}"
    padding: "0 12px"
    height: "44px"
  board:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.container}"
  board-row-open:
    backgroundColor: "{colors.ink-2}"
  status-bet:
    backgroundColor: "{colors.on-ink}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tag}"
    padding: "5px 9px"
  changed-tag:
    backgroundColor: "{colors.alert}"
    textColor: "{colors.alert-ink}"
    rounded: "{rounded.tag}"
    padding: "3px 8px 3px 6px"
  notice:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.radius}"
    padding: "12px 16px"
  notice-alert:
    backgroundColor: "{colors.alert}"
    textColor: "{colors.alert-ink}"
  ticket:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.container}"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.container}"
    padding: "24px"
  count:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  pick-cell-win:
    backgroundColor: "{colors.win-bg}"
    textColor: "{colors.win}"
    rounded: "{rounded.tag}"
    size: "30px"
  pick-cell-loss:
    backgroundColor: "{colors.loss-bg}"
    textColor: "{colors.loss}"
    rounded: "{rounded.tag}"
    size: "30px"
  chart-tip:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.radius}"
    padding: "8px 10px"
---

# Design System: NBA Game Predictor

## Overview

**Creative North Star: "The Gate Board"**

The site borrows from the departures board and the boarding pass. Tonight's games sit on one ink-black board, sorted by tip-off, with times and prices in monospaced figures and team abbreviations in a condensed uppercase face. Each simulated bet is a white ticket stub with dashed tear lines and a stamp that is added once the game settles. Everything around the board is quiet: a cool gray page, white panels, thin gray rules.

The system is nearly monochrome. Ink and gray carry the structure, one yellow marks what has changed or needs a second look, and a muted green and red mark settled results. Density is high on the board and in tables, and looser on the Results page, which reads as a document with a contents list, long-form text and three charts.

Teams appear as abbreviations and city names only. There are no team logos, no player photos and no illustrations; the only pictures are five small line icons and the charts. The site is light-only for now: the stylesheet declares `color-scheme: light` and has no dark-theme tokens.

**Key Characteristics:**
- One ink board on a cool light ground; white surfaces for everything else.
- Three voices in type: condensed uppercase for names and headline figures, monospace for numbers, plain sans for prose.
- One alert yellow, kept for changes and warnings.
- Green and red only on settled results, always paired with a check or a cross.
- Flat surfaces separated by 1px lines; two small shadows in the whole site.
- Standard web controls: links as tabs, native select and inputs, real tables.

## Colors

A near-monochrome palette of ink and cool grays, with one yellow and one muted green and red pair. All values live in `:root` in `site/src/styles.css`.

### Primary
- **Board Ink** (`ink`, #0d1217): the top bar, the board, primary buttons, chart tooltips, the count pill, the main chart series, the focus ring and the 2px rule above each Results section heading. The same value is the main text color (`text`).
- **Open Row Ink** (`ink-2`, #141b23): the background of a board row while its detail is open.
- **Raised Ink** (`ink-3`, #1d2630): hover fill for primary buttons, on-ink buttons and the row expander.
- **Board Rule** (`ink-line`, #2b3743): 1px dividers between board rows and inside an open row.
- **Board White** (`on-ink`, #f4f6f8), **Board Gray** (`on-ink-2`, #adb9c6), **Board Dim** (`on-ink-3`, #8795a4): the three text levels on ink. White for picks and figures, gray for secondary lines, dim for column labels and the "@" between teams.

### Secondary
- **Alert Yellow** (`alert`, #ffd60a) with **Alert Ink** text (`alert-ink`, #1c1600): the Changed tag on a board row, the "since you last looked" line and new-injury lines inside an open row, a moved price (yellow figure on ink), the stale-data and load-failure notices, and the header of a "looks too good" verdict. The skip link also uses it.
- **Alert Wash** (`alert-wash`, #fff6c7): the pale fill of the injury-check box under a "looks too good" verdict, with a 1px Alert Yellow border.
- A changed row also carries a 7% tint of the yellow (`rgb(255 214 10 / 0.07)`) that flashes from 42% on arrival.

### Tertiary
- **Win Green** (`win`, #1f6f4a) on **Win Tint** (`win-bg`, #dff0e7), and **Loss Red** (`loss`, #a33c34) on **Loss Tint** (`loss-bg`, #f7e4e1): settled results on light surfaces. Ticket stamps, pick-grid squares and the result column of the bets table.
- **Win on Ink** (`win-on-ink`, #7ed3a6) and **Loss on Ink** (`loss-on-ink`, #f19a90): the same meaning on the board, for a final game's status.

### Neutral
- **Panel Gray** (`panel`, #e9edf1): the page background, the selected team option and the open pick square.
- **Surface White** (`surface`, #ffffff): tickets, panels, the record strip, charts, tables, inputs.
- **Rule Gray** (`line`, #d0d8e0) and **Faint Rule** (`line-2`, #e3e8ed): container borders and list dividers; the fainter one between table rows.
- **Control Gray** (`control`, #7f8d9b): the border of inputs, selects, team options and quiet buttons.
- **Text** (`text`, #0d1217), **Text Gray** (`text-2`, #3f4c59), **Text Dim** (`text-3`, #566472): body text, secondary text, and labels, captions and help text.
- **Chart colors**: `series` (#0d1217) for the model, `series-context` (#8795a4) for the baseline or comparison, `chart-grid` (#e3e8ed) and `chart-axis` (#b4bfca) for gridlines and the zero or floor line.

### Named Rules
**The Yellow Means Look Rule.** Alert Yellow is reserved for changes and things that need attention: a moved price, a new injury, stale data, a price that looks too good. It is never decoration, never a brand color and never a button fill. If nothing has changed and nothing needs checking, the screen has no yellow on it.

**The Record Only Rule.** Green and red mean a settled result, won or lost, and nothing else. They appear only in the record (ticket stamps, the pick grid, the bets table, a final game on the board) and always with a check or cross icon beside them, so the meaning never depends on color alone. Money figures stay in the text color whether positive or negative. Two uses in the current build fall outside this rule and should not be copied: the green check badge on a fair-price verdict in the Bet checker, and Loss Red on invalid form fields.

**The Ink Is the Brand Rule.** There is no accent color for emphasis. Emphasis on the light ground is ink; emphasis on the board is white. The one filled tag on the board, "Bet $10", is white with ink text.

## Typography

**Display Font:** Barlow Condensed, weights 600 and 700 (with Barlow, system-ui, sans-serif)
**Body Font:** Barlow, weights 400, 500 and 600 (with system-ui, -apple-system, Segoe UI, sans-serif)
**Label/Mono Font:** Chivo Mono, weights 400 and 700 (with ui-monospace, SF Mono, Menlo, monospace)

All three are self-hosted through @fontsource, Latin subset only.

**Character:** A condensed uppercase grotesque for names and headline numbers, a plain sans for sentences, and a monospace with tabular figures for every number a visitor might compare. The pairing reads as signage and printed tickets, not as a magazine.

### Hierarchy
- **Display** (Barlow Condensed 600, 2.5rem, line-height 1.05, 0.01em, uppercase; 2rem under 760px): the one h1 on each page.
- **Large figure** (Barlow Condensed 600, 2.75rem, line-height 1.05): the three record-strip figures and the Results tally.
- **Headline** (Barlow Condensed 600, 1.875rem, line-height 1.1, 0.02em, uppercase): Results section headings. Verdict headings, the empty-board title and the team on a ticket use 2rem.
- **Board code** (Barlow Condensed 600, 1.75rem, line-height 1, 0.02em): the matchup on a board row. The pick is 700 at 1.5rem. Both step down to 1.5rem at 760px and 1.25rem at 520px.
- **Title** (Barlow Condensed 600, 1.375rem, line-height 1.1, 0.03em, uppercase): side-column and panel headings, and the brand in the top bar at 700 with 0.04em.
- **Lede** (Barlow 400, 1.1875rem, line-height 1.5, max 62ch): the opening paragraph of Results.
- **Body** (Barlow 400, 1rem, line-height 1.5): prose. Secondary text is 0.9375rem; captions, help text and footnotes are 0.8125rem. Prose is capped at 60 to 72ch.
- **Label** (Barlow 600, 0.6875rem, 0.08 to 0.1em, uppercase): board and table column headers, fact labels, ticket headers, record-strip headings. Ticket fact labels drop to 0.625rem.
- **Figure** (Chivo Mono 400, 0.9375rem, -0.01em, tabular-nums): times, prices, percentages, edges and money. Confidence on the board, the profit in a ticket stamp and a moved price use 700. Table and ticket figures are 0.8125 to 0.875rem.

### Named Rules
**The Numbers in Mono Rule.** Any figure that sits in a column or beside another figure is Chivo Mono with tabular numerals, right-aligned in tables. Headline figures (a record, an accuracy rate) are the exception and use Barlow Condensed.

**The Condensed Is for Names Rule.** Barlow Condensed is used for team abbreviations, headings and headline figures, always at 1.125rem or larger. Sentences are never set in it.

## Layout

The page is a centered column up to 1392px wide (`--page`) with a 24px gutter (`--gutter`), dropping to 16px under 760px. Page padding is 28px above and 56px below. The top bar and footer share the same width and gutter. The body is a flex column, so the footer stays at the bottom on short pages.

Each page has its own grid:

- **Today:** two columns, `2fr` and a side column of at least 300px, with a 24px gap. The board and the three-cell record strip stack in the main column; tickets and skipped picks sit in the side column.
- **Bet checker:** a form panel 300 to 420px wide beside a verdict panel that takes the rest, 24px gap. An injuries panel and the sandbox ticket grid (cards of at least 320px) run full width below.
- **Results:** a 200px sticky contents list beside a document column capped at 880px, 48px gap. Sections are 56px apart with 16px between their blocks.

The board row is an eight-column grid: tip time (88px), game, pick, confidence (84px), price (92px), edge (64px), status, and a 44px expander. Rows are at least 76px tall with 12px column gaps.

Spacing has no token scale. The values in use are 4, 6, 8, 10, 12, 16, 20, 24 and 28px inside components, and 24, 40, 48 and 56px between blocks.

Responsive behavior, by breakpoint:

- **1280px:** Today becomes one column; the side column becomes two columns under the board.
- **900px:** Results becomes one column and its contents list becomes a wrapped row of underlined links; the Bet checker stacks; the record strip stacks; the open-row detail stacks.
- **760px:** the board drops the price and edge columns (both remain in the open row) and the rating line; status moves to a second line under the game; the top bar wraps into brand, update time, then full-width tabs.
- **520px:** the board tightens again and hides city names; ticket facts wrap from five columns to three; table cells tighten and optional columns hide; form field pairs stack.

Wide tables scroll sideways inside their own container; the page itself never scrolls horizontally.

## Elevation & Depth

The system is flat. Depth comes from tone: the ink board against the gray page, white surfaces against the gray page, and 1px borders. An open board row shifts one step lighter in ink instead of lifting.

### Shadow Vocabulary
- **Ticket edge** (`box-shadow: 0 1px 2px rgb(13 18 23 / 0.05)`): tickets only, a faint paper edge.
- **Tooltip lift** (`box-shadow: 0 6px 16px rgb(13 18 23 / 0.18)`): the chart tooltip, the one element that floats above the page.
- **Selection ring** (`box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--ink)`): the selected square in the pick grid.
- **Inset marks**: the active tab has a 3px inset underline; a selected team option and an invalid input have a 1px inset line that doubles their border.
- **Scroll edge**: a scrollable table shows a soft 12px ink gradient (14% opacity) at whichever side has more to scroll.

### Named Rules
**The Flat Board Rule.** Nothing on the page is raised to look important. Containers sit at rest with a 1px border and no shadow; only a ticket and a tooltip cast one.

## Shapes

Corners are small and squared. Controls, notices, tooltips and ticket stamps use 4px (`--radius`). Containers (the board, tickets, panels, the record strip, charts, table wraps) use 6px. Small tags (status, Changed, pick squares, highlighted injury lines) use 3px. Only the count pill (999px) and round marks (the verdict icon badge, the open-pick dot) are fully round.

Borders are 1px solid gray on the light ground and 1px `ink-line` on the board. Tickets use 1px dashed lines between their segments, like tear lines on a stub. The ticket stamp has a 2px border in its own text color, solid when settled and dashed while open. Results section headings sit under a 2px ink rule.

Icons come from one set of five (check, cross, chevron, alert triangle, arrow): 16px grid, 2px stroke, round caps and joins, drawn in the current text color.

## Components

### Buttons
Plain and rectangular; weight comes from fill, not from size or shadow.
- **Shape:** gently squared (4px radius), 44px tall, 18px side padding, Barlow 600 at 0.9375rem. A small variant is 32px tall with 12px padding at 0.8125rem.
- **Primary:** ink fill with white text. Used once per view, for the action the verdict supports ("Add to my sandbox" on a rule bet). Disabled: `line` fill with `text-3` text.
- **Quiet:** white fill with a 1px Control Gray border. Used for resets, filters and the chart "Show table" toggle.
- **On ink:** transparent with a 1px `on-ink-3` border and white text, for actions inside the board.
- **Hover / Focus:** primary lightens to `ink-3`; quiet darkens its border to ink; on-ink fills with `ink-3` and brightens its border. Hover styles apply to fine pointers only. Pressing scales the button to 0.97 over 140ms. Focus is a 2px outline offset 2px: ink on light surfaces, white inside the top bar and the board.
- **Link button:** underlined `text-2` text with no box, for "Remove" on a sandbox ticket.

### Status tags and chips
- **Status (board):** uppercase 0.75rem label at 600 with 0.06em tracking. "Bet $10" is a filled tag (white on ink, 3px radius, 5px 9px padding). Skip, tipped-off and final states are plain text with no box; a final game takes the on-ink green or red with a check or cross.
- **Changed tag:** Alert Yellow fill, Alert Ink text, alert icon at 13px, 0.6875rem uppercase, 3px radius. It stays on the row until the visitor opens it.
- **Count pill:** ink fill, white Chivo Mono at 0.75rem, fully round, beside a section heading.
- **Rating:** an uppercase 0.6875rem label under the pick. Best bet and Good are white; Lean and Toss-up are dim.

### Cards / Containers
- **Corner Style:** 6px.
- **Background:** Surface White on the Panel Gray page; the board is ink.
- **Shadow Strategy:** none, except the ticket edge (see Elevation & Depth).
- **Border:** 1px `line`.
- **Internal Padding:** 24px for panels (18px 16px under 760px), 20px 24px for record-strip cells, 16px 20px for charts and the pick grid, 16px for the filter bar.
- **Notice:** a white 4px-radius bar with a 1px border and 12px 16px padding; the alert variant is solid Alert Yellow with an alert icon.

### Inputs / Fields
- **Style:** 44px tall, white, 1px Control Gray border, 4px radius, 12px side padding, 1rem text. Number fields (moneyline, stake, probability) are set in Chivo Mono. Labels are Barlow 600 at 0.8125rem above the field; help text is 0.8125rem in `text-3` below. Selects and date inputs are native.
- **Team choice:** two bordered options holding a native radio, the abbreviation in Barlow Condensed 700 and the model's probability in mono. The selected option takes an ink border doubled by a 1px inset line and a Panel Gray fill.
- **Focus:** the global 2px ink outline, offset 2px.
- **Error:** the border turns Loss Red with a 1px inset line, and the message below is 0.8125rem Loss Red at 500. (This is one of the two uses outside the Record Only Rule.)

### Navigation
- **Top bar:** ink, 60px minimum height. Brand at left (Barlow Condensed 700, 1.375rem, uppercase), then the update time in `on-ink-2` at 0.8125rem, then three text tabs pushed right.
- **Tabs:** real links, Barlow 500, `on-ink-2` at rest, white on hover. The current page is white with a 3px white underline drawn inside the bar's bottom edge. Color and underline change over 160ms.
- **Mobile:** under 760px the bar wraps to three lines and the tabs run full width.
- **Contents list (Results):** a sticky list of plain links with 1px dividers, `text-2` at rest and `text` on hover, under a small uppercase label.
- **Footer:** a 1px top rule, then the disclaimer, affiliation and helpline text and the repository link at 0.8125rem in `text-2`.

### The Board
The signature component. A single ink container holding a header row of dim uppercase labels and one row per game, divided by 1px `ink-line`. Each row shows the tip time in mono, the matchup in condensed type with city names beneath, the pick and its rating, then confidence, price and edge in right-aligned mono, a status, and a chevron expander (40px, rotates 180 degrees when open). A footnote inside the board explains edge, the price snapshot and the Changed flag.

- **Order:** scheduled games first, then tipped-off, then final; by tip time within each. When the order changes, rows slide to their new place (280ms, `cubic-bezier(0.77, 0, 0.175, 1)`, transform only).
- **Changed:** when a price or injury list moves after the visitor's first look, the row flashes yellow once (1400ms) and settles to a 7% yellow tint; the Changed tag appears under the matchup and a moved price turns yellow. Opening the row counts as seeing it: the tag clears, and a yellow line at the top of the detail says what moved. New injury lines are highlighted yellow.
- **Open row:** the row turns `ink-2` and reveals a detail area that fades in and drops 6px over 180ms. It holds a six-item fact grid (label above mono value), the bet decision in a sentence, timestamps, an on-ink button to the Bet checker, and both teams' injuries.
- **Reduced motion:** no slide, no flash, no fade; a changed row shows a static 14% yellow tint.
- **Empty:** a 2rem condensed title, one sentence and an on-ink button.

### Ticket
A bet as a stub in four segments divided by dashed lines: a header with the sequence number in mono ("No. 016"), the bet type and the date; the picked team in 2rem condensed type with the matchup beneath and the stamp at right; five facts (price, implied, model, edge, stake) in dashed-divided cells; and a footer line with the placement time and sportsbook. The stamp is a 2px bordered box: "Open" dashed and gray, "Won" green with a check and the profit, "Lost" red with a cross and the loss. A ticket is never restyled after it is written; only the stamp changes.

### Record strip
A white three-cell bar under the board: live record, backtest, simulated bets. Each cell has an uppercase label, one large condensed figure with its comparison beside it in body type, and a note giving the sample size. A full-width link row closes the strip.

### Verdict panel
The Bet checker's answer. A heading row with a 28px icon and a 2rem condensed heading, a one-paragraph reason at 1.0625rem, then a two-column list of the arithmetic (label left, mono value right, faint rules between). A fair price shows a check on a round green badge; a declined price shows a cross on a round gray badge; a price that looks too good replaces the heading row with a full-width Alert Yellow band and adds an Alert Wash box asking the visitor to check injuries. The "Simulated bets · not betting advice" line sits beside the action button.

### Pick grid
One row per game day: the date, a run of 30px squares, and the day's tally in mono. A won pick is a green check on Win Tint, a lost pick a red cross on Loss Tint, an open pick a gray dot on Panel Gray. Each square is a button; the selected one takes the ink selection ring and its details appear in a line below the grid. A small uppercase label marks where the model version changes.

### Tables
Real tables on a white surface with a 1px border and 6px corners. Header cells are uppercase labels; row headers are 600; numeric cells are right-aligned mono; rows are divided by `line-2`. A dense variant (7px 10px padding, no wrapping) holds the full bet list. Results in a table are a check or cross with the word, in green or red.

### Charts
Three plain SVG charts, each in a white bordered frame with a title, a "Show table" toggle that swaps the plot for the same numbers as a table, a legend and a caption. The model is always ink and the comparison always `series-context` gray: no other chart colors are used. Lines are 2px with round joins, points are 5px circles ringed in white, gridlines are `chart-grid`, the baseline is `chart-axis`, and series are labeled at their right end instead of relying on the legend. Hovering or tabbing through a chart shows an ink tooltip with mono values.

## Do's and Don'ts

### Do:
- **Do** keep Alert Yellow (#ffd60a) for changes and things that need attention, with Alert Ink (#1c1600) text on it.
- **Do** pair every green or red result with a check or cross icon and the word (Won, Lost, Final).
- **Do** set comparable numbers in Chivo Mono with tabular numerals, right-aligned in tables.
- **Do** show teams as abbreviations in Barlow Condensed, with city names in plain text where there is room.
- **Do** put the board, and anything that belongs to it, on ink; put everything else on white surfaces over the Panel Gray page.
- **Do** separate surfaces with 1px lines and tone, using 6px corners for containers, 4px for controls and 3px for tags.
- **Do** keep controls standard: links for tabs, native selects, radios and date inputs, real tables, 44px minimum height.
- **Do** give every chart a table view and end-of-line labels, with the model in ink and the comparison in gray.
- **Do** honor reduced motion with a static state for every animation.
- **Do** keep the "Simulated bets · not betting advice" line beside every bet list and verdict, as a small uppercase label in `text-3`.

### Don't:
- **Don't** use team logos, team colors or player photos anywhere.
- **Don't** use yellow for decoration, branding, buttons or headings.
- **Don't** use green or red outside the record: not for positive or negative money, not for edges, not for chart lines, not for buttons.
- **Don't** add a dark theme or dark-mode tokens yet; the site is light-only for now.
- **Don't** add a second accent color. Emphasis is ink on light and white on ink.
- **Don't** add shadows to containers. Only tickets and the chart tooltip cast one.
- **Don't** set sentences in Barlow Condensed or prose numbers in mono.
- **Don't** restyle a ticket after it is written; a settled bet gains a stamp and nothing else changes.
- **Don't** let the page scroll sideways; wide tables scroll inside their own frame.
