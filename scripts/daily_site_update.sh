#!/bin/zsh
# Daily job: score yesterday, pick today, place automatic bets, export the
# site's JSON, then commit and push so Vercel redeploys.
#
#   ./scripts/daily_site_update.sh            # run it by hand
#   launchd runs it each morning (scripts/com.tyler.nbapredictor.plist)
#
# If the picks step fails (for example stats.nba.com times out), nothing is
# exported or pushed and the site keeps yesterday's data, clearly dated.
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

cd "${0:A:h}/.."
PY="venv/bin/python"

echo "=== $(date '+%Y-%m-%d %H:%M:%S') daily update ==="
"$PY" -m src.run_daily
"$PY" -m src.export_site

git add results/predictions.csv results/bets.csv results/odds.csv results/auto_bets_log.csv site/public/data
if git diff --cached --quiet; then
  echo "Nothing new to commit."
  exit 0
fi
git commit -m "Daily update $(date '+%Y-%m-%d')"
git push
echo "Pushed. Vercel will redeploy in about a minute."
