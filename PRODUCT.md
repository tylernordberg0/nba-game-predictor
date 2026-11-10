# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React + Vite + TypeScript, built as static files and deployed on Vercel (Hobby plan). No server, database or login. The site reads JSON that the Python pipeline writes each morning on the owner's Mac into `site/public/data/`; injuries are fetched live in the browser from ESPN's public feed.

## Users

Primary: an interviewer or hiring manager evaluating Tyler Nordberg. The role may be data science/analytics, software engineering or a sports/betting company (not yet known). They open the link on a laptop, on their own, before or after the interview, and have a few minutes to click around. Secondary: Tyler, checking the day's picks and the running record.

## Product Purpose

An NBA game predictor. Each morning a logistic regression trained on every game since 2015-16 predicts the day's winners from each team's last 10 games, compares each pick with the DraftKings moneyline, and logs a simulated $10 bet only when the price is fair. The site shows that work live and lets a visitor test it. Success: the visitor leaves saying the author is rigorous and honest.

## Positioning

Honesty over hype. Every pick is timestamped before tip-off and never edited; accuracy is reported with a season-by-season walk-forward backtest against an always-pick-the-home-team baseline, with calibration and sample sizes; the betting record separates picking winners from finding fair prices. The site never claims to beat the market.

## Operating Context

The pipeline (`nbapred`) runs on the Mac each morning: it scores yesterday's games, settles bets, retrains, saves today's picks, pulls DraftKings odds and places the automatic bets, then the export pushes JSON to GitHub and Vercel redeploys. Odds are a morning snapshot; injuries change during the day; games tip off in the evening, US Eastern time.

## Capabilities and Constraints

- v1 pages: Today, Bet checker, Results. Head-to-head comes after v1.
- Model: 12 features (home and away 10-game averages of plus/minus, eFG%, AST/TO, FT rate, OREB, DREB). It sees no player, injury or rest information.
- Ratings: 65%+ BEST BET, 58%+ Good, 52%+ Lean, below that Toss-up.
- Automatic bets: $10, only when confidence is 60%+, the price is no shorter than -250, and the model's probability beats the implied probability by 3+ points; an edge of 8+ points also needs no starter (28+ minutes a game) listed Out.
- Bets are simulated; no real money is placed.
- Terminology: pick, confidence, moneyline, implied probability, edge, fair odds, limit, walk-forward, calibration.
- Undecided: a public site name beyond "NBA Game Predictor"; custom domain.

## Brand Commitments

Name: NBA Game Predictor. Not affiliated with the NBA, its teams, ESPN or DraftKings. Teams appear as abbreviations and names only: no team logos and no player photos.

Every page carries a footer disclaimer: a personal data-science project for education and entertainment; not betting or financial advice; all bets simulated, no real money; past results don't predict future results; not affiliated with the NBA, its teams, ESPN, DraftKings or The Odds API; the current national problem-gambling helpline (1-800-MY-RESET as of Nov 2026). A short "Simulated bets · not betting advice" line sits beside every bet verdict and bet list.

## Evidence on Hand

- `results/predictions.csv`: live record. 51 picks from Feb 6–12, 2026 (33–18, made by the original v1 script) plus v2 picks since Nov 5, 2026, each with a pre-tip-off timestamp.
- `results/backtest_metrics.json`, `results/backtest_by_season.csv`: 62.8% vs 56.0% home baseline over 10,739 games (2017-18 to 2025-26); calibration 52.2% / 61.0% / 71.8% for the 50–58% / 58–65% / 65%+ confidence bands; the model beats the baseline in all 9 seasons.
- `results/bets.csv`: 16 manual bets (Feb and Nov 2026) and automatic bets from Nov 2026, with odds, edge, stake and result.
- `results/odds.csv`, `results/auto_bets_log.csv`: every odds pull, and every automatic-bet decision with its reason.
- `figures/`: backtest, live accuracy and bankroll charts (README versions).
- Absent, and never to be invented: a long-run betting edge, user counts, testimonials, endorsements.

## Product Principles

1. Show the record, losses included, before any claim.
2. Every number carries its sample size and its baseline.
3. A probability is not a bet: the price decides.
4. Timestamped and never edited: the site does not rewrite history.
5. Say plainly what the model cannot see.
