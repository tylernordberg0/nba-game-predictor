# Website

The public site for the NBA Game Predictor: three pages (Today, Bet checker, Results) built with React, Vite and TypeScript, deployed as static files on Vercel. It has no server, database or login.

## How data gets here

`python -m src.export_site` (run from the repo root, after `python -m src.run_daily`) writes `site/public/data/`:

| File | Contents |
|---|---|
| `site.json` | Today's games, the full live record, every simulated bet, the backtest |
| `players.json` | Minutes and points per game, used to label injuries (needs stats.nba.com) |
| `model.json` | The 12 coefficients, the intercept and each team's current form |

Injuries are fetched live in the visitor's browser from ESPN's public feed.

## Commands

```bash
cd site
npm ci            # install the pinned dependencies
npm run dev       # local dev server
npm test          # betting math against vectors from the Python code
npm run build     # type-check and build to dist/
npm run preview   # serve dist/ with the same security headers as Vercel
```

`src/lib/betting.ts` is a port of `src/betting.py`. To regenerate the test vectors after changing the Python math: `python -m scripts.gen_math_vectors`.

## Security

- No secrets live here. The Odds API key stays in `.env` at the repo root and is read only by the Python export.
- `vercel.json` sets a content security policy: scripts, styles and fonts from this site only, data from this site and `site.api.espn.com`, no embedding.
- ESPN text is rendered as plain text, never as HTML.
- Dependencies are pinned in `package-lock.json`; Dependabot checks them weekly.

## Daily job (macOS)

```bash
cp scripts/com.tyler.nbapredictor.plist ~/Library/LaunchAgents/
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.tyler.nbapredictor.plist
tail -f ~/Library/Logs/nbapredictor.log
```

To stop it:

```bash
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.tyler.nbapredictor.plist
rm ~/Library/LaunchAgents/com.tyler.nbapredictor.plist
```
