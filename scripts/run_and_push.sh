#!/usr/bin/env bash
# Run the daily pipeline locally and push the updated record to GitHub.
# (stats.nba.com blocks GitHub-hosted runners, so the daily job runs from a
# home machine instead.) Schedule it with cron or launchd for ~11am ET.
set -euo pipefail
cd "$(dirname "$0")/.."
source venv/bin/activate
git pull --ff-only --quiet
python -m src.run_daily
python -m src.make_figures
git add results/predictions.csv figures/
git diff --cached --quiet || git commit -m "Daily predictions $(TZ=America/New_York date +%F)"
git push --quiet
