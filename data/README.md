# Data

Nothing in this folder is committed; it is rebuilt locally.

- `season_cache/`: team game logs from the NBA stats API (via [`nba_api`](https://github.com/swar/nba_api)),
  one pickle per season. Created automatically by `python -m src.run_daily` or `python -m src.backtest`.
  The first run downloads all seasons since 2015-16 (about a minute).
  Not committed because NBA.com's terms don't allow redistributing its data.
- `raw/kaggle/`: only needed for the exploration notebook. Download
  [NBA games data](https://www.kaggle.com/datasets/nathanlauga/nba-games) from Kaggle and put
  `games.csv` here. Not committed: the dataset's license is listed as "Unknown".
