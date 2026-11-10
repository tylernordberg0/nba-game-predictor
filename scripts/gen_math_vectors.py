"""Write test vectors from the Python betting math, so the site's TypeScript
port can be checked against them (site/src/lib/betting.test.ts).

    python -m scripts.gen_math_vectors
"""
import json

from src.betting import MIN_EDGE, implied_prob, payout, to_american
from src.config import ROOT

odds = [o for o in range(-2000, 1001) if abs(o) >= 100]
probs = [round(i / 10000, 4) for i in range(100, 9901)]
vectors = {
    "min_edge": MIN_EDGE,
    "implied_prob": [[o, implied_prob(o)] for o in odds],
    "payout": [[o, s, payout(o, s)] for o in odds[::7] for s in (1, 10, 25.5, 100)],
    "to_american": [[p, to_american(p)] for p in probs],
    "limit": [[p, to_american(p - MIN_EDGE)] for p in probs if p - MIN_EDGE > 0.01],
}
out = ROOT / "site" / "src" / "lib" / "betting.vectors.json"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(vectors, separators=(",", ":")) + "\n")
print(f"wrote {out.relative_to(ROOT)}: " + ", ".join(f"{k} {len(v)}" for k, v in vectors.items() if isinstance(v, list)))
