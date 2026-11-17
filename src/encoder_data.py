"""Phase 3 training data (notes/phase3_plan.md, sections 1 and 3).

Three pieces the training loops in src/encoder.py use:

    load_train(root)            training players' qualified seasons as a tensor, plus who/when for each row
    mask_features(x, pool, ...) hide a share of each row's stats for masked-feature pretraining (Stage A)
                                and for light augmentation in contrastive training (Stage B)
    PairSampler(meta, ...)      batches of different players, two seasons each, for contrastive training

Training players only: validation players must be new to the encoder when it is scored.
Run this file to check everything: python encoder_data.py
"""

from pathlib import Path

import numpy as np
import pandas as pd
import torch

from baselines import Z, load


def load_train(root: Path) -> tuple[torch.Tensor, pd.DataFrame]:
    """Training players' qualified seasons.

    Returns X [n, 15] float32 (the 15 style z-scores) and meta [player_id, season],
    in the same row order, so row i of X is row i of meta.
    """
    df = load(root)
    df = df[df["split"] == "train"].reset_index(drop=True)
    X = torch.tensor(df[Z].to_numpy(dtype=np.float32))
    if not torch.isfinite(X).all():
        raise ValueError("training features contain NaN or inf")
    return X, df[["player_id", "season"]].copy()


def mask_features(x: torch.Tensor, pool: torch.Tensor, rate: float,
                  gen: torch.Generator | None = None) -> tuple[torch.Tensor, torch.Tensor]:
    """Hide `rate` of each row's features by swapping in the same feature from random pool rows.

    Swapping (instead of zeroing) keeps every column's values looking normal, so the model
    has to work out which values don't fit the rest of the row (the VIME idea).
    Returns (corrupted x, mask), where mask is 1.0 where a feature was hidden.
    """
    mask = torch.rand(x.shape, generator=gen) < rate
    rows = torch.randint(0, len(pool), x.shape, generator=gen)
    cols = torch.arange(x.shape[1]).expand_as(rows)
    replacement = pool[rows, cols]
    return torch.where(mask, replacement, x), mask.float()


class PairSampler:
    """Batches of `n_players` different players with two of their seasons each.

    The partner season is at least `min_gap` years from the anchor when the player has one,
    so the model can't win by learning "last year looks like this year". No player appears
    twice in a batch, because his second season would wrongly count as a negative.
    Players with one qualified season are left out (they are used in pretraining only).
    """

    def __init__(self, meta: pd.DataFrame, n_players: int = 256, min_gap: int = 2, seed: int = 2026):
        self.n_players, self.min_gap = n_players, min_gap
        self.rng = np.random.default_rng(seed)
        self.rows, self.seasons = [], []  # per eligible player: row indices into X, and their seasons
        for _, g in meta.groupby("player_id", sort=True):
            if len(g) >= 2:
                self.rows.append(g.index.to_numpy())
                self.seasons.append(g["season"].to_numpy())
        if len(self.rows) < n_players:
            raise ValueError(f"only {len(self.rows)} players with 2+ seasons, fewer than n_players={n_players}")

    def __len__(self) -> int:
        """Batches per epoch (the last partial batch is dropped so every batch has n_players)."""
        return len(self.rows) // self.n_players

    def _pair(self, p: int) -> tuple[int, int, bool]:
        rows, seasons = self.rows[p], self.seasons[p]
        a = self.rng.integers(len(rows))
        gaps = np.abs(seasons - seasons[a])
        far = np.flatnonzero(gaps >= self.min_gap)  # gap in season years, not row positions
        if len(far):
            return rows[a], rows[self.rng.choice(far)], True
        others = np.flatnonzero(np.arange(len(rows)) != a)
        return rows[a], rows[self.rng.choice(others)], False

    def __iter__(self):
        order = self.rng.permutation(len(self.rows))
        for b in range(len(self)):
            players = order[b * self.n_players:(b + 1) * self.n_players]
            pairs = [self._pair(p) for p in players]
            self.last_far_share = float(np.mean([f for _, _, f in pairs]))
            yield (torch.tensor([a for a, _, _ in pairs], dtype=torch.long),
                   torch.tensor([b_ for _, b_, _ in pairs], dtype=torch.long))


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    X, meta = load_train(root)
    splits = pd.read_parquet(root / "data" / "processed" / "splits.parquet", columns=["player_id", "split"])
    train_ids = set(splits.loc[splits["split"] == "train", "player_id"])

    print(f"X: {tuple(X.shape)}, players: {meta['player_id'].nunique():,}")
    if not set(meta["player_id"]) <= train_ids:
        raise ValueError("non-training players in the training data")
    print(f"column means in [{X.mean(0).min():.2f}, {X.mean(0).max():.2f}], "
          f"stds in [{X.std(0).min():.2f}, {X.std(0).max():.2f}] (expect about 0 and 1)")

    # masking
    gen = torch.Generator().manual_seed(2026)
    xc, m = mask_features(X, X, 0.25, gen)
    keep = m == 0
    if not torch.equal(xc[keep], X[keep]):
        raise ValueError("unmasked cells were changed")
    for j in range(X.shape[1]):
        if not torch.isin(xc[m[:, j] == 1, j], X[:, j]).all():
            raise ValueError(f"column {j}: a replacement value isn't from that column")
    print(f"masked share at rate 0.25: {m.mean():.3f}")

    # pair sampler
    s = PairSampler(meta, seed=2026)
    print(f"eligible players (2+ seasons): {len(s.rows):,}, batches per epoch: {len(s)}")
    pid = meta["player_id"].to_numpy()
    far = []
    for a, b in s:
        if len(set(pid[a.numpy()])) != len(a):
            raise ValueError("a player appears twice in a batch")
        if not (pid[a.numpy()] == pid[b.numpy()]).all() or (a == b).any():
            raise ValueError("a pair isn't two different seasons of the same player")
        far.append(s.last_far_share)
    print(f"pairs 2+ years apart: {np.mean(far):.1%}")
    a1, _ = next(iter(PairSampler(meta, seed=2026)))
    a2, _ = next(iter(PairSampler(meta, seed=2026)))
    if not torch.equal(a1, a2):
        raise ValueError("same seed gave different batches")
    print("All checks passed.")


if __name__ == "__main__":
    main()
