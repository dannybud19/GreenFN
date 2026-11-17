"""Phase 3 neural season encoder (notes/phase3_plan.md, sections 2 and 3).

    SeasonEncoder      15 style z-scores -> d-dimensional embedding (plus the two training heads)
    pretrain()         Stage A: masked-feature reconstruction
    train_contrastive  Stage B: InfoNCE on same-player season pairs, early stopping on
                       validation non-adjacent hit@10
    NeuralEncoder      wraps a trained encoder in the Phase 2 Baseline interface
                       (fit / embed / similarity), so src/evaluate.py scores it unchanged

Training uses training players only; validation is only used to decide when to stop.
Run this file for one smoke run (d=16, temperature 0.1, with pretraining, seed 2026).
"""

import copy
import random
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn.functional as F
from torch import nn

from baselines import Z, Baseline, load
from encoder_data import PairSampler, load_train, mask_features

N_FEATURES = len(Z)


def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)


# ---------- model ----------

class SeasonEncoder(nn.Module):
    """Encoder 15 -> 128 -> 128 -> d, plus a reconstruction head (Stage A) and a projection head (Stage B)."""

    def __init__(self, dim: int = 16, hidden: int = 128):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(N_FEATURES, hidden), nn.LayerNorm(hidden), nn.ReLU(),
            nn.Linear(hidden, hidden), nn.LayerNorm(hidden), nn.ReLU(),
            nn.Linear(hidden, dim),
        )
        self.reconstruct = nn.Sequential(nn.Linear(dim, 64), nn.ReLU(), nn.Linear(64, N_FEATURES))
        self.project = nn.Sequential(nn.Linear(dim, 64), nn.ReLU(), nn.Linear(64, 32))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.encoder(x)


# ---------- Stage A: masked-feature pretraining ----------

def masked_mse(pred: torch.Tensor, target: torch.Tensor, mask: torch.Tensor) -> torch.Tensor:
    """Mean squared error on the hidden features only."""
    return ((pred - target) ** 2 * mask).sum() / mask.sum().clamp(min=1)


def pretrain(model: SeasonEncoder, X: torch.Tensor, X_val: torch.Tensor, epochs: int = 50,
             batch: int = 256, lr: float = 1e-3, rate: float = 0.25, seed: int = 2026) -> list[dict]:
    """Train encoder + reconstruction head to fill in masked features. Returns per-epoch losses."""
    gen = torch.Generator().manual_seed(seed)
    opt = torch.optim.Adam(list(model.encoder.parameters()) + list(model.reconstruct.parameters()), lr=lr)
    # fixed validation corruption, so epochs are comparable
    xv, mv = mask_features(X_val, X_val, rate, torch.Generator().manual_seed(seed + 1))
    zero_baseline = masked_mse(torch.zeros_like(X_val), X_val, mv).item()  # predict the season mean
    history = []
    for epoch in range(epochs):
        model.train()
        order = torch.randperm(len(X), generator=gen)
        total = 0.0
        for start in range(0, len(X), batch):
            x = X[order[start:start + batch]]
            xc, m = mask_features(x, X, rate, gen)
            loss = masked_mse(model.reconstruct(model(xc)), x, m)
            opt.zero_grad()
            loss.backward()
            opt.step()
            total += loss.item() * len(x)
        model.eval()
        with torch.no_grad():
            val = masked_mse(model.reconstruct(model(xv)), X_val, mv).item()
        history.append({"epoch": epoch + 1, "train": total / len(X), "val": val, "predict_0": zero_baseline})
    return history


# ---------- Stage B: contrastive training ----------

def info_nce(z1: torch.Tensor, z2: torch.Tensor, temperature: float) -> torch.Tensor:
    """InfoNCE / NT-Xent: each row of z1 must pick out its partner in z2 among the 2N - 1 other rows."""
    z = F.normalize(torch.cat([z1, z2]), dim=1)
    sim = z @ z.T / temperature
    n = len(z1)
    sim.fill_diagonal_(float("-inf"))  # a row is never its own partner
    target = torch.cat([torch.arange(n, 2 * n), torch.arange(0, n)])
    return F.cross_entropy(sim, target)


def train_contrastive(model: SeasonEncoder, X: torch.Tensor, meta: pd.DataFrame, val: pd.DataFrame,
                      temperature: float = 0.1, epochs: int = 100, patience: int = 10, lr: float = 1e-3,
                      rate: float = 0.15, seed: int = 2026) -> list[dict]:
    """Stage B. Keeps the weights with the best validation non-adjacent hit@10."""
    from evaluate import retrieval  # imported here to avoid a circular import at module load

    gen = torch.Generator().manual_seed(seed)
    sampler = PairSampler(meta, seed=seed)
    opt = torch.optim.Adam(list(model.encoder.parameters()) + list(model.project.parameters()), lr=lr)
    wrapper = NeuralEncoder.from_model(model)
    best, best_state, since_best, history = -1.0, None, 0, []
    for epoch in range(epochs):
        model.train()
        losses = []
        for a, b in sampler:
            va, _ = mask_features(X[a], X, rate, gen)
            vb, _ = mask_features(X[b], X, rate, gen)
            loss = info_nce(model.project(model(va)), model.project(model(vb)), temperature)
            opt.zero_grad()
            loss.backward()
            opt.step()
            losses.append(loss.item())
        model.eval()
        score = retrieval(wrapper, val, non_adjacent=True)["hit10"]
        history.append({"epoch": epoch + 1, "loss": float(np.mean(losses)), "val_nonadj_hit10": score})
        if score > best:
            best, best_state, since_best = score, copy.deepcopy(model.state_dict()), 0
        else:
            since_best += 1
            if since_best >= patience:
                break
    model.load_state_dict(best_state)
    return history


# ---------- Phase 2 interface ----------

class NeuralEncoder(Baseline):
    """The encoder behind the Phase 2 interface. Embeddings are L2-normalised; similarity is cosine."""

    def __init__(self, dim: int = 16, temperature: float = 0.1, pretraining: bool = True, seed: int = 2026,
                 root: Path | None = None):
        self.dim, self.temperature, self.pretraining, self.seed = dim, temperature, pretraining, seed
        self.root = root or Path(__file__).resolve().parents[1]
        self.name = f"Encoder d={dim} t={temperature} {'pre' if pretraining else 'nopre'} s{seed}"
        self.model, self.history = None, {}

    @classmethod
    def from_model(cls, model: SeasonEncoder) -> "NeuralEncoder":
        obj = cls.__new__(cls)
        obj.model, obj.name = model, "Encoder (in training)"
        return obj

    def fit(self, train: pd.DataFrame = None, val: pd.DataFrame = None) -> "NeuralEncoder":
        """Train from scratch on training players. `train` is ignored (load_train is the single source);
        `val` (validation qualified seasons) is used for the Stage A check and early stopping."""
        set_seed(self.seed)
        X, meta = load_train(self.root)
        if val is None:
            df = load(self.root)
            val = df[df["split"] == "val"].reset_index(drop=True)
        X_val = torch.tensor(val[Z].to_numpy(dtype=np.float32))
        self.model = SeasonEncoder(self.dim)
        if self.pretraining:
            self.history["pretrain"] = pretrain(self.model, X, X_val, seed=self.seed)
        self.history["contrastive"] = train_contrastive(self.model, X, meta, val, self.temperature, seed=self.seed)
        return self

    def embed(self, df: pd.DataFrame) -> np.ndarray:
        self.model.eval()
        with torch.no_grad():
            e = self.model(torch.tensor(df[Z].to_numpy(dtype=np.float32)))
        return F.normalize(e, dim=1).numpy().astype(float)

    def similarity(self, a: np.ndarray, b: np.ndarray) -> np.ndarray:
        return a @ b.T  # cosine, since embeddings are unit length

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        torch.save({"state": self.model.state_dict(), "dim": self.dim, "temperature": self.temperature,
                    "pretraining": self.pretraining, "seed": self.seed, "history": self.history}, path)


def main() -> None:
    """Smoke run: one setting, one seed. The full 18 x 3 search lives in src/evaluate_encoder.py."""
    from evaluate import next_season, retrieval

    root = Path(__file__).resolve().parents[1]
    df = load(root)
    val = df[df["split"] == "val"].reset_index(drop=True)
    enc = NeuralEncoder(dim=16, temperature=0.1, pretraining=True, seed=2026).fit(val=val)

    pre = enc.history["pretrain"]
    print(f"Stage A: val masked MSE {pre[0]['val']:.3f} (epoch 1) -> {pre[-1]['val']:.3f} (epoch {len(pre)}); "
          f"predicting 0 gives {pre[-1]['predict_0']:.3f}")
    con = enc.history["contrastive"]
    best = max(con, key=lambda h: h["val_nonadj_hit10"])
    print(f"Stage B: {len(con)} epochs, best val non-adjacent hit@10 {best['val_nonadj_hit10']:.3f} at epoch {best['epoch']}")

    ret, na, ns = retrieval(enc, val), retrieval(enc, val, non_adjacent=True), next_season(enc, val)
    print(f"Validation: hit@10 {ret['hit10']:.3f}, MRR {ret['mrr']:.3f}, non-adjacent hit@10 {na['hit10']:.3f}, "
          f"next-season RMSE {ns['rmse']:.3f} (persistence {ns['persistence']:.3f})")
    print("B2 cosine for reference: hit@10 0.778, MRR 0.561, non-adjacent 0.668, next-season RMSE 0.608")
    out = root / "models" / "encoder_smoke_d16_t0.1_pre_s2026.pt"
    enc.save(out)
    print(f"Saved {out}")


if __name__ == "__main__":
    main()
