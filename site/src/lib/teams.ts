// Team names as ESPN and The Odds API write them -> the abbreviations the
// model uses (same table as TEAM_ABBR in src/odds.py).
export const TEAM_ABBR: Record<string, string> = {
  "Atlanta Hawks": "ATL", "Boston Celtics": "BOS", "Brooklyn Nets": "BKN",
  "Charlotte Hornets": "CHA", "Chicago Bulls": "CHI", "Cleveland Cavaliers": "CLE",
  "Dallas Mavericks": "DAL", "Denver Nuggets": "DEN", "Detroit Pistons": "DET",
  "Golden State Warriors": "GSW", "Houston Rockets": "HOU", "Indiana Pacers": "IND",
  "Los Angeles Clippers": "LAC", "LA Clippers": "LAC", "Los Angeles Lakers": "LAL",
  "Memphis Grizzlies": "MEM", "Miami Heat": "MIA", "Milwaukee Bucks": "MIL",
  "Minnesota Timberwolves": "MIN", "New Orleans Pelicans": "NOP", "New York Knicks": "NYK",
  "Oklahoma City Thunder": "OKC", "Orlando Magic": "ORL", "Philadelphia 76ers": "PHI",
  "Phoenix Suns": "PHX", "Portland Trail Blazers": "POR", "Sacramento Kings": "SAC",
  "San Antonio Spurs": "SAS", "Toronto Raptors": "TOR", "Utah Jazz": "UTA",
  "Washington Wizards": "WAS",
};

export const TEAM_CITY: Record<string, string> = {
  ATL: "Atlanta", BOS: "Boston", BKN: "Brooklyn", CHA: "Charlotte", CHI: "Chicago",
  CLE: "Cleveland", DAL: "Dallas", DEN: "Denver", DET: "Detroit", GSW: "Golden State",
  HOU: "Houston", IND: "Indiana", LAC: "LA Clippers", LAL: "LA Lakers", MEM: "Memphis",
  MIA: "Miami", MIL: "Milwaukee", MIN: "Minnesota", NOP: "New Orleans", NYK: "New York",
  OKC: "Oklahoma City", ORL: "Orlando", PHI: "Philadelphia", PHX: "Phoenix", POR: "Portland",
  SAC: "Sacramento", SAS: "San Antonio", TOR: "Toronto", UTA: "Utah", WAS: "Washington",
};

export const city = (abbr: string) => TEAM_CITY[abbr] ?? abbr;
