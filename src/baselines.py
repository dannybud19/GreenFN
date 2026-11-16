"""Phase 2 similarity baselines (notes/phase2_eval_plan.md, section 6).

Every baseline has the same interface, so src/evaluate.py (and the Phase 3 neural
encoder) can be scored the same way:

    model.fit(train_df)               # learn anything it needs from training seasons
    model.embed(df) -> np.ndarray     # one vector per row of df
    model.similarity(A, B) -> matrix  # higher = more similar, shape (len(A), len(B))
    model.neighbours(queries, candidates, k) -> DataFrame of top-k matches

Inputs are qualified player-seasons with the 15 style z-scores.
Run this file for a quick sanity check: top 10 comps for one player-season.
"""

from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.decomposition import PCA

STYLE = [
    "fga_per_100_poss", "x3p_ar", "f_tr",
    "ts_percent", "x3p_percent_shrunk", "x2p_percent_shrunk", "ft_percent_shrunk",
    "usg_percent", "ast_percent", "tov_percent",
    "orb_percent", "drb_percent",
    "stl_percent", "blk_percent", "pf_per_100_poss",
]
Z = [f"z_{c}" for c in STYLE]

# CARMELO forum weights mapped to our features; unknowns default to 2 (Phase 2 plan).
CARMELO_WEIGHTS = {
    "ts_percent": 5, "usg_percent": 5, "ast_percent": 4,
    "ft_percent_shrunk": 2.5, "x3p_ar": 2.5, "stl_percent": 2.5,
    "orb_percent": 2, "drb_percent": 2, "blk_percent": 2,
}
SEED = 2026


class Baseline:
    name = "base"

    def fit(self, train: pd.DataFrame) -> "Baseline":
        return self

    def embed(self, df: pd.DataFrame) -> np.ndarray:
        return df[Z].to_numpy(dtype=float)

    def similarity(self, a: np.ndarray, b: np.ndarray) -> np.ndarray:
        raise NotImplementedError

    def neighbours(self, queries: pd.DataFrame, candidates: pd.DataFrame, k: int = 10,
                   chunk: int = 512) -> pd.DataFrame:
        """Top-k candidates for each query (by DataFrame index). A row never matches itself."""
        qe, ce = self.embed(queries), self.embed(candidates)
        cand_idx = candidates.index.to_numpy()
        out = []
        for start in range(0, len(queries), chunk):
            sims = self.similarity(qe[start:start + chunk], ce)
            q_idx = queries.index.to_numpy()[start:start + chunk]
            sims[q_idx[:, None] == cand_idx[None, :]] = -np.inf  # no self-match
            top = np.argsort(-sims, axis=1)[:, :k]
            for row, q in enumerate(q_idx):
                for rank, c in enumerate(top[row], start=1):
                    out.append((q, cand_idx[c], rank, sims[row, c]))
        return pd.DataFrame(out, columns=["query", "candidate", "rank", "similarity"])


class B0Random(Baseline):
    """Random ranking: what chance looks like on every metric."""
    name = "B0 random"

    def __init__(self, seed: int = SEED):
        self.rng = np.random.default_rng(seed)

    def similarity(self, a, b):
        return self.rng.random((len(a), len(b)))


class B1Euclidean(Baseline):
    name = "B1 Euclidean"

    def similarity(self, a, b):
        d2 = (a ** 2).sum(1)[:, None] + (b ** 2).sum(1)[None, :] - 2 * a @ b.T
        return -np.sqrt(np.clip(d2, 0, None))


class B2Cosine(Baseline):
    name = "B2 cosine"

    def similarity(self, a, b):
        an = a / np.linalg.norm(a, axis=1, keepdims=True).clip(1e-12)
        bn = b / np.linalg.norm(b, axis=1, keepdims=True).clip(1e-12)
        return an @ bn.T


class B3Carmelo(Baseline):
    """CARMELO-style score: 100 - k * sum(w_i * |dz_i|), k set so the average training pair scores 0."""
    name = "B3 CARMELO-style"

    def __init__(self, n_pairs: int = 200_000, seed: int = SEED):
        self.w = np.array([CARMELO_WEIGHTS.get(c, 2.0) for c in STYLE])
        self.n_pairs, self.seed, self.k = n_pairs, seed, None

    def fit(self, train):
        e = self.embed(train)
        rng = np.random.default_rng(self.seed)
        i, j = rng.integers(0, len(e), self.n_pairs), rng.integers(0, len(e), self.n_pairs)
        keep = i != j
        mean_dist = (np.abs(e[i[keep]] - e[j[keep]]) * self.w).sum(1).mean()
        self.k = 100.0 / mean_dist  # so 100 - k * mean_dist = 0
        return self

    def similarity(self, a, b):
        if self.k is None:
            raise RuntimeError("call fit() first")
        out = np.empty((len(a), len(b)))
        for i in range(len(a)):  # row by row keeps memory small
            out[i] = 100.0 - self.k * (np.abs(b - a[i]) * self.w).sum(1)
        return out


class B3wCarmeloWindow(B3Carmelo):
    """B3 on a CARMELO-style profile: seasons t, t-1, t-2 weighted 3/2/1.

    Only the player's own qualified seasons inside `df` are used, so pass the full set
    of qualified seasons for the split (the split is by player, so history stays inside it).
    Missing earlier seasons are skipped and the weights renormalised.
    """
    name = "B3w CARMELO 3-season"
    WEIGHTS = {0: 3.0, 1: 2.0, 2: 1.0}  # years back -> weight

    def embed(self, df):
        z = df[["player_id", "season"] + Z]
        lookup = z.set_index(["player_id", "season"])[Z]
        total = np.zeros((len(df), len(Z)))
        wsum = np.zeros(len(df))
        for back, w in self.WEIGHTS.items():
            keys = pd.MultiIndex.from_arrays([z["player_id"], z["season"] - back])
            vals = lookup.reindex(keys).to_numpy(dtype=float)
            present = ~np.isnan(vals).any(1)
            total[present] += w * vals[present]
            wsum[present] += w
        return total / wsum[:, None]


class B4PCA(B1Euclidean):
    """Euclidean distance in PCA space (components covering ~90% of training variance)."""
    name = "B4 PCA"

    def __init__(self, variance: float = 0.90):
        self.pca = PCA(n_components=variance, svd_solver="full")

    def fit(self, train):
        self.pca.fit(train[Z].to_numpy(dtype=float))
        return self

    def embed(self, df):
        return self.pca.transform(df[Z].to_numpy(dtype=float))


ALL = [B0Random, B1Euclidean, B2Cosine, B3Carmelo, B3wCarmeloWindow, B4PCA]


def load(root: Path) -> pd.DataFrame:
    """Qualified seasons with their split, in a stable order."""
    seasons = pd.read_parquet(root / "data" / "processed" / "player_seasons.parquet")
    splits = pd.read_parquet(root / "data" / "processed" / "splits.parquet", columns=["player_id", "split"])
    df = seasons[seasons["qualified"]].merge(splits, on="player_id", validate="m:1")
    return df.sort_values(["player_id", "season"]).reset_index(drop=True)


def player_comps(model: Baseline, query: pd.DataFrame, pool: pd.DataFrame, n: int = 10) -> pd.DataFrame:
    """Top-n comp *players* (best-matching season each), excluding the query player."""
    nb = model.neighbours(query, pool[pool["player_id"] != query["player_id"].iloc[0]], k=300)
    nb = nb.merge(pool[["player", "player_id", "season"]], left_on="candidate", right_index=True)
    nb = nb.sort_values("similarity", ascending=False).drop_duplicates("player_id").head(n)
    return nb[["player", "season", "similarity"]].reset_index(drop=True)


def main() -> None:
    """Sanity check: Michael Jordan 1991 under every baseline (hold-outs excluded from the pool)."""
    import json
    root = Path(__file__).resolve().parents[1]
    df = load(root)
    holdouts = {p["player_id"] for p in json.loads((root / "config" / "holdout.json").read_text())["players"]}
    pool = df[~df["player_id"].isin(holdouts)]
    train = pool[pool["split"] == "train"]
    query = pool[(pool["player_id"] == "jordami01") & (pool["season"] == 1991)]
    if query.empty:
        raise ValueError("Jordan 1991 not found among qualified, non-hold-out seasons")

    for cls in ALL:
        model = cls().fit(train)
        print(f"\n{model.name}" + (f"  (k = {model.k:.4f})" if getattr(model, "k", None) else "")
              + (f"  ({model.pca.n_components_} components)" if isinstance(model, B4PCA) else ""))
        print(player_comps(model, query, pool).to_string(index=False))


if __name__ == "__main__":
    main()
