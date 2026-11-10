import { describe, expect, it } from "vitest";
import {
  checkPrice,
  impliedProb,
  limitOdds,
  MIN_EDGE,
  parseAmerican,
  payout,
  toAmerican,
} from "./betting";
import vectors from "./betting.vectors.json";

// Vectors come from the Python functions: `python -m scripts.gen_math_vectors`.
describe("matches src/betting.py", () => {
  it("uses the same margin", () => {
    expect(MIN_EDGE).toBe(vectors.min_edge);
  });

  it(`implied_prob for ${vectors.implied_prob.length} prices`, () => {
    for (const [odds, expected] of vectors.implied_prob) {
      expect(impliedProb(odds)).toBeCloseTo(expected, 12);
    }
  });

  it(`payout for ${vectors.payout.length} price and stake pairs`, () => {
    for (const [odds, stake, expected] of vectors.payout) {
      expect(payout(odds, stake)).toBeCloseTo(expected, 9);
    }
  });

  it(`to_american for ${vectors.to_american.length} probabilities`, () => {
    const wrong = vectors.to_american.filter(([p, expected]) => toAmerican(p) !== expected);
    expect(wrong).toEqual([]);
  });

  it(`limit odds for ${vectors.limit.length} probabilities`, () => {
    const wrong = vectors.limit.filter(([p, expected]) => limitOdds(p) !== expected);
    expect(wrong).toEqual([]);
  });
});

describe("worked examples from the plan", () => {
  it("60% gives fair odds of -150", () => {
    expect(toAmerican(0.6)).toBe(-150);
  });
  it("GSW at 67.6% gives a limit of -182", () => {
    expect(limitOdds(0.676)).toBe(-182);
  });
  it("-150 implies 60.0% and +130 implies 43.5%", () => {
    expect(impliedProb(-150)).toBeCloseTo(0.6, 10);
    expect(impliedProb(130)).toBeCloseTo(0.4348, 4);
  });
  it("never implies more than the probability it was given", () => {
    for (let p = 0.02; p < 0.99; p += 0.0137) {
      expect(impliedProb(toAmerican(p))).toBeLessThanOrEqual(p + 1e-9);
    }
  });
});

describe("checkPrice follows the automatic-bet rule", () => {
  it("skips a price shorter than -250 (NYK 81.3% at -1040)", () => {
    expect(checkPrice(0.8129, -1040).kind).toBe("too_short");
  });
  it("flags a bet that loses money by the model's own number (CLE 72% at -650)", () => {
    const v = checkPrice(0.7201, -650);
    expect(v.kind).toBe("too_short");
    expect(checkPrice(0.7, -249).kind).toBe("negative_ev");
  });
  it("flags a price inside the 3-point margin", () => {
    expect(checkPrice(0.6845, -198).kind).toBe("below_margin");
  });
  it("accepts a fair price", () => {
    expect(checkPrice(0.676, -170).kind).toBe("fair");
  });
  it("warns when the edge is 8 points or more (TOR 71.9% at -156)", () => {
    const v = checkPrice(0.7191, -156);
    expect(v.kind).toBe("too_good");
    expect(v.edge).toBeCloseTo(0.1097, 3);
  });
  it("notes picks under the 60% bar", () => {
    expect(checkPrice(0.58, 110).underConfidence).toBe(true);
    expect(checkPrice(0.6, 110).underConfidence).toBe(false);
  });
});

describe("parseAmerican", () => {
  it("reads what people type", () => {
    expect(parseAmerican("-150")).toBe(-150);
    expect(parseAmerican("+130")).toBe(130);
    expect(parseAmerican(" 130 ")).toBe(130);
    expect(parseAmerican("−110")).toBe(-110);
  });
  it("rejects anything that isn't a price", () => {
    for (const bad of ["", "abc", "50", "-99", "1.5", "--150", "999999"]) {
      expect(parseAmerican(bad)).toBeNull();
    }
  });
});
