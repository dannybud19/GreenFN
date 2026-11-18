"""Phase 6 "why similar" (notes/phase6_plan.md, section 3).

Explains a career comp with integrated gradients (Sundararajan et al., 2017) through the whole final
pipeline: encoder -> season centring -> career profile (centre and peak) -> career score.

For a pair (A, B), the score S(A, B) is differentiable in every season's 15 style z-scores. Integrated
gradients walks A's seasons from the baseline (0 = league average in every season) to his real values,
with B held fixed, and credits each feature with its share of S(A, B) - S(average, B). The same is done for
B with A fixed, and the two halves are averaged. Summed over seasons, that gives one number per feature:
positive = this stat makes them more alike than an average player would be.

Completeness (the attributions add up to the score change) is checked for every explanation.
"""

from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn.functional as F

from baselines import STYLE, Z

STEPS = 64


class DifferentiableCareer:
    """The Phase 5 chosen career score rebuilt in PyTorch so gradients reach the input stats."""

    def __init__(self, encoder, season_means: dict, centring_alpha: float, alpha: float, beta: float, scales: dict):
        self.enc = encoder.eval()
        self.means = {s: torch.tensor(m, dtype=torch.float32) for s, m in season_means.items()}
        self.ca, self.alpha, self.beta, self.sc = centring_alpha, alpha, beta, scales

    def season_emb(self, x: torch.Tensor, seasons: np.ndarray) -> torch.Tensor:
        """x: [..., n, 15] -> unit-length centred embeddings [..., n, d] (same maths as SeasonCentred)."""
        e = F.normalize(self.enc(x), dim=-1)
        m = torch.stack([self.means[int(s)] for s in seasons])
        return F.normalize(e - self.ca * m, dim=-1)

    def profile(self, x, seasons, weights, peak_idx):
        e = self.season_emb(x, seasons)
        w = torch.tensor(weights, dtype=torch.float32)
        centre = F.normalize((w[:, None] * e).sum(-2), dim=-1)
        peak = F.normalize(e[..., peak_idx, :].mean(-2), dim=-1)
        return centre, peak

    def score(self, pa, pb) -> torch.Tensor:
        (ca, pka), (cb, pkb) = pa, pb
        return (self.alpha * (ca * cb).sum(-1) / self.sc["centre"]
                + self.beta * (pka * pkb).sum(-1) / self.sc["peak"])


def player_inputs(df: pd.DataFrame, player_id: str, peak_seasons: int = 3) -> dict:
    """The same selection rules as career.build_profiles: qualified seasons, minutes weights, top 3 by BPM."""
    rows = df[df["player_id"] == player_id].sort_values("season")
    w = rows["mp"].to_numpy(dtype=float)
    return {"x": torch.tensor(rows[Z].to_numpy(dtype=np.float32)), "seasons": rows["season"].to_numpy(),
            "weights": w / w.sum(),
            "peak": np.argsort(-rows["bpm"].to_numpy(dtype=float))[:min(peak_seasons, len(rows))]}


def _ig_side(model: DifferentiableCareer, moving: dict, fixed_profile, steps: int) -> tuple[np.ndarray, float, float]:
    """Integrated gradients for one player's seasons, the other player's profile held fixed."""
    x = moving["x"]
    alphas = (torch.arange(steps, dtype=torch.float32) + 0.5) / steps        # midpoint rule
    path = (alphas[:, None, None] * x[None]).requires_grad_(True)             # [steps, n, 15]
    prof = model.profile(path, moving["seasons"], moving["weights"], moving["peak"])
    fixed = tuple(t.expand(steps, -1) for t in fixed_profile)
    s = model.score(prof, fixed)
    grad, = torch.autograd.grad(s.sum(), path)
    attr = (x * grad.mean(0)).detach().numpy()                                 # [n, 15]
    with torch.no_grad():
        full = model.score(model.profile(x, moving["seasons"], moving["weights"], moving["peak"]), fixed_profile).item()
        base = model.score(model.profile(torch.zeros_like(x), moving["seasons"], moving["weights"], moving["peak"]),
                           fixed_profile).item()
    return attr, full, base


def explain_pair(model: DifferentiableCareer, a: dict, b: dict, steps: int = STEPS) -> dict:
    """Per-feature attribution for the pair, plus the completeness check."""
    with torch.no_grad():
        pa = model.profile(a["x"], a["seasons"], a["weights"], a["peak"])
        pb = model.profile(b["x"], b["seasons"], b["weights"], b["peak"])
    attr_a, full, base_a = _ig_side(model, a, pb, steps)
    attr_b, _, base_b = _ig_side(model, b, pa, steps)
    per_feature = (attr_a.sum(0) + attr_b.sum(0)) / 2
    target = full - (base_a + base_b) / 2
    return {"score": full, "per_feature": dict(zip(STYLE, per_feature.tolist())),
            "completeness_error": float(abs(per_feature.sum() - target) / max(abs(target), 1e-9)),
            "attr_a": attr_a, "attr_b": attr_b}


def deletion_test(model: DifferentiableCareer, a: dict, b: dict, attribution: dict, k: int = 3,
                  n_random: int = 10, seed: int = 2026) -> tuple[float, float]:
    """Faithfulness: set the k most-credited features to league average (0) in A's seasons and measure the
    drop in score; compare with k random features. A faithful explanation's top features matter more."""
    with torch.no_grad():
        pb = model.profile(b["x"], b["seasons"], b["weights"], b["peak"])
        full = model.score(model.profile(a["x"], a["seasons"], a["weights"], a["peak"]), pb).item()

        def drop(cols):
            x = a["x"].clone()
            x[:, cols] = 0
            return full - model.score(model.profile(x, a["seasons"], a["weights"], a["peak"]), pb).item()

        names = list(attribution)
        top = [names.index(n) for n in sorted(names, key=lambda n: -attribution[n])[:k]]
        rng = np.random.default_rng(seed)
        rand = np.mean([drop(list(rng.choice(len(names), k, replace=False))) for _ in range(n_random)])
        return float(drop(top)), float(rand)
