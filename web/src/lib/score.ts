import type { Profiles } from "./data";

/**
 * Career score of every player against player i (phase7_plan.md section 4; src/career.py CareerScore is the reference):
 *   alpha * cos(centre) / s_centre + beta * cos(peak) / s_peak - lambda * |spread gap| / s_spread
 * Centres and peaks are unit length, so the cosine is a dot product. Player i himself gets -Infinity.
 */
export function careerScores(p: Profiles, i: number, lambda: number): Float64Array {
  const n = p.ids.length;
  const out = new Float64Array(n);
  const { alpha, beta } = p.weights;
  const ci = p.centre[i];
  const pi = p.peak[i];
  const kc = alpha / p.scales.centre;
  const kp = beta / p.scales.peak;
  const ks = lambda / p.scales.spread;
  for (let j = 0; j < n; j++) {
    if (j === i) {
      out[j] = -Infinity;
      continue;
    }
    const cj = p.centre[j];
    const pj = p.peak[j];
    let dc = 0;
    let dp = 0;
    for (let d = 0; d < ci.length; d++) {
      dc += ci[d] * cj[d];
      dp += pi[d] * pj[d];
    }
    out[j] = kc * dc + kp * dp - (lambda ? ks * Math.abs(p.spread[i] - p.spread[j]) : 0);
  }
  return out;
}

/** Indices of the k highest scores, best first (ties go to the lower index). -Infinity is never returned. */
export function topK(scores: ArrayLike<number>, k: number): number[] {
  const best: number[] = [];
  for (let j = 0; j < scores.length; j++) {
    if (scores[j] === -Infinity) continue;
    let pos = best.length;
    while (pos > 0 && scores[best[pos - 1]] < scores[j]) pos--;
    if (pos < k) {
      best.splice(pos, 0, j);
      if (best.length > k) best.pop();
    }
  }
  return best;
}
