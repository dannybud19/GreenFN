"""Phase 5 career profiles (notes/phase5_plan.md, sections 2 and 3).

Until now every comparison was season against season: a player's comps were the players whose single
best-matching season was closest (Phases 2 to 4 sanity comps). Phase 5 compares whole careers.

    season embeddings   Phase 4's chosen model: the Phase 3 encoder with season centring (alpha 0.5)
    Profile             per player: centre (minutes-weighted average season), peak (average of his top 3
                        seasons by BPM), spread (how far his seasons sit from his centre: low = consistent)
    CareerScore         alpha x cos(centres) + beta x cos(peaks) - lambda x |spread difference|, each term in
                        standard deviations over training-player pairs so the weights are comparable;
                        lambda is the consistency slider
    Wasserstein         a second method: optimal-transport distance between the two careers' full sets of
                        seasons (Sinkhorn), so every season counts, not just summaries
    BestSeasonMatch     the Phases 2 to 4 method, kept as the reference: max similarity over season pairs

Everything here is computed from saved models; nothing is trained.
"""

from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

PEAK_SEASONS = 3


@dataclass
class Profile:
    player_id: str
    player: str
    seasons: np.ndarray      # season years
    emb: np.ndarray          # [n, d] unit-length season embeddings
    weights: np.ndarray      # minutes share per season (sums to 1)
    centre: np.ndarray       # unit-length
    peak: np.ndarray         # unit-length
    spread: float            # minutes-weighted mean cosine distance of seasons from the centre
    decade: int              # decade of the median season (2020s capped as in the era probe)


def _unit(v: np.ndarray) -> np.ndarray:
    return v / max(np.linalg.norm(v), 1e-12)


def build_profiles(model, df: pd.DataFrame, min_seasons: int = 1) -> list[Profile]:
    """One profile per player in df (qualified seasons only). `model` is any object with embed(df)."""
    df = df.sort_values(["player_id", "season"]).reset_index(drop=True)
    emb = model.embed(df)
    emb = emb / np.linalg.norm(emb, axis=1, keepdims=True).clip(1e-12)
    out = []
    for pid, idx in df.groupby("player_id", sort=True).indices.items():
        if len(idx) < min_seasons:
            continue
        rows = df.iloc[idx]
        e = emb[idx]
        w = rows["mp"].to_numpy(dtype=float)
        w = w / w.sum()
        centre = _unit((w[:, None] * e).sum(0))
        top = np.argsort(-rows["bpm"].to_numpy(dtype=float))[:min(PEAK_SEASONS, len(idx))]
        peak = _unit(e[top].mean(0))
        spread = float((w * (1 - e @ centre)).sum())
        med = int(np.median(rows["season"]))
        out.append(Profile(pid, rows["player"].iloc[0], rows["season"].to_numpy(), e, w, centre, peak, spread,
                           min((med // 10) * 10, 2020)))
    return out


def split_halves(df: pd.DataFrame, min_seasons: int = 4) -> pd.DataFrame:
    """Each player with min_seasons+ qualified seasons becomes two pseudo-players (alternating seasons),
    named <id>#A and <id>#B, for the split-half identity test."""
    df = df.sort_values(["player_id", "season"])
    counts = df.groupby("player_id")["season"].transform("size")
    df = df[counts >= min_seasons].copy()
    order = df.groupby("player_id").cumcount()
    df["player_id"] = df["player_id"] + np.where(order % 2 == 0, "#A", "#B")
    return df.reset_index(drop=True)


# ---------- similarity methods: each returns a [len(queries), len(candidates)] matrix, higher = more similar ----------

def scales(train_profiles: list[Profile]) -> dict:
    """Standard deviations over all pairs of training players: centre cosine, peak cosine, spread gap.
    Dividing by these puts the three terms of CareerScore on one scale."""
    C = np.stack([p.centre for p in train_profiles])
    P = np.stack([p.peak for p in train_profiles])
    s = np.array([p.spread for p in train_profiles])
    iu = np.triu_indices(len(train_profiles), 1)
    return {"centre": float((C @ C.T)[iu].std()), "peak": float((P @ P.T)[iu].std()),
            "spread": float(np.abs(s[:, None] - s[None, :])[iu].std())}


class CareerScore:
    def __init__(self, alpha: float, beta: float, lam: float, sc: dict):
        self.alpha, self.beta, self.lam, self.sc = alpha, beta, lam, sc
        self.name = f"Career a={alpha} b={beta} lambda={lam}"

    def matrix(self, q: list[Profile], c: list[Profile]) -> np.ndarray:
        C = lambda ps, f: np.stack([getattr(p, f) for p in ps])
        s = (self.alpha * (C(q, "centre") @ C(c, "centre").T) / self.sc["centre"]
             + self.beta * (C(q, "peak") @ C(c, "peak").T) / self.sc["peak"])
        if self.lam:
            sq, sp = np.array([p.spread for p in q]), np.array([p.spread for p in c])
            s = s - self.lam * np.abs(sq[:, None] - sp[None, :]) / self.sc["spread"]
        return s


class BestSeasonMatch:
    """Phases 2 to 4: two players are as similar as their single closest pair of seasons."""
    name = "Best season match"

    def matrix(self, q: list[Profile], c: list[Profile]) -> np.ndarray:
        out = np.empty((len(q), len(c)))
        allc = np.concatenate([p.emb for p in c])
        owner = np.repeat(np.arange(len(c)), [len(p.emb) for p in c])
        starts = np.r_[0, np.cumsum([len(p.emb) for p in c])[:-1]]
        for i, p in enumerate(q):
            sims = (p.emb @ allc.T).max(0)
            out[i] = np.maximum.reduceat(sims, starts)
        return out


class Wasserstein:
    """Entropic optimal transport (Sinkhorn) between two careers' season sets, minutes-weighted,
    cost = cosine distance. Similarity = minus the transport cost."""

    def __init__(self, eps: float = 0.05, iters: int = 200, chunk: int = 4):
        self.eps, self.iters, self.chunk = eps, iters, chunk
        self.name = f"Wasserstein (Sinkhorn, eps {eps})"

    @staticmethod
    def _pad(ps: list[Profile]) -> tuple[np.ndarray, np.ndarray]:
        n, d = max(len(p.emb) for p in ps), ps[0].emb.shape[1]
        E, W = np.zeros((len(ps), n, d)), np.zeros((len(ps), n))
        for i, p in enumerate(ps):
            E[i, :len(p.emb)], W[i, :len(p.emb)] = p.emb, p.weights
        return E, W

    def matrix(self, q: list[Profile], c: list[Profile]) -> np.ndarray:
        Eq, Wq = self._pad(q)
        Ec, Wc = self._pad(c)
        out = np.empty((len(q), len(c)))
        for s in range(0, len(q), self.chunk):
            eq, wq = Eq[s:s + self.chunk], Wq[s:s + self.chunk]
            cost = 1 - np.einsum("qnd,cmd->qcnm", eq, Ec)              # [Q, C, n, m]
            K = np.exp(-cost / self.eps)
            a, b = wq[:, None, :], Wc[None, :, :]                       # [Q,1,n], [1,C,m]
            u = np.ones(K.shape[:3])
            for _ in range(self.iters):
                v = b / np.maximum(np.einsum("qcnm,qcn->qcm", K, u), 1e-300)
                u = a / np.maximum(np.einsum("qcnm,qcm->qcn", K, v), 1e-300)
            plan = u[..., None] * K * v[:, :, None, :]
            out[s:s + self.chunk] = -(plan * cost).sum((2, 3))
        return out


# ---------- helpers for evaluation ----------

def top_k(method, q: list[Profile], c: list[Profile], k: int = 10, exclude_self: bool = True) -> list[list[int]]:
    """Indices into c of each query's top-k, skipping the query's own player (and his other half)."""
    m = method.matrix(q, c)
    base = lambda pid: pid.split("#")[0]
    res = []
    for i, p in enumerate(q):
        row = m[i].copy()
        if exclude_self:
            row[[j for j, cp in enumerate(c) if base(cp.player_id) == base(p.player_id)]] = -np.inf
        res.append(list(np.argsort(-row)[:k]))
    return res


def split_half_retrieval(method, halves: list[Profile]) -> dict:
    """Each half searches every other half; success = the same player's other half. Hit@10 and MRR."""
    m = method.matrix(halves, halves)
    ids = [h.player_id for h in halves]
    pos = {pid: i for i, pid in enumerate(ids)}
    hits, rr = [], []
    for i, pid in enumerate(ids):
        partner = pos[pid[:-1] + ("B" if pid.endswith("A") else "A")]
        row = m[i].copy()
        row[i] = -np.inf
        rank = 1 + int((row > row[partner]).sum())
        hits.append(rank <= 10)
        rr.append(1 / rank)
    return {"hit10": float(np.mean(hits)), "mrr": float(np.mean(rr)), "queries": len(ids)}
