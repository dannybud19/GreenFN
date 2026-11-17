"""Phase 4 era-adversarial encoder (notes/phase4_plan.md, sections 2 and 3).

The Phase 3 encoder learned stat combinations that give away the decade (era probe 0.323, chance 0.20).
Phase 4 adds an adversary: a small "era head" that tries to predict the decade from the embedding,
connected through a gradient reversal layer (Ganin and Lempitsky, 2015). The head is trained to
predict the decade well; the reversed gradient trains the encoder to make that prediction fail,
while the contrastive loss keeps it recognising players.

    GradReverse            identity on the way forward, multiplies the gradient by -lambda on the way back
    EraHead                embedding -> 64 -> 5 decades
    train_contrastive_adv  Phase 3's Stage B plus the adversary, lambda ramped up from 0
    EraAdversarialEncoder  NeuralEncoder with the adversary; lambda = 0 reproduces Phase 3 exactly
    SeasonCentred          the second method: subtract alpha x the season's average training embedding
                           from every embedding (no retraining), then renormalise

Stage A (masked pretraining) is unchanged. Training players only; validation decides when to stop.
Run this file for one smoke run (lambda 1.0, seed 2026, Phase 3's chosen setting).
"""

import copy
import math
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn.functional as F
from torch import nn

from baselines import Z, Baseline, load
from encoder import NeuralEncoder, SeasonEncoder, info_nce, pretrain, set_seed
from encoder_data import PairSampler, load_train, mask_features

DECADES = [1980, 1990, 2000, 2010, 2020]

# Phase 3's chosen setting (reports/phase3_encoder.md); Phase 4 only adds lambda.
DIM, TEMPERATURE, PRETRAINING = 32, 0.05, True


def decade_index(seasons: pd.Series) -> torch.Tensor:
    """Decade label, same rule as the era probe in evaluate.py: 2020 to 2026 count as the 2020s."""
    dec = np.minimum((seasons.to_numpy() // 10) * 10, 2020)
    return torch.tensor([DECADES.index(d) for d in dec], dtype=torch.long)


class GradReverse(torch.autograd.Function):
    @staticmethod
    def forward(ctx, x, lam):
        ctx.lam = lam
        return x.view_as(x)

    @staticmethod
    def backward(ctx, grad):
        return -ctx.lam * grad, None


class EraHead(nn.Module):
    """hidden = 0 gives a linear head (the same kind of model as the era probe); otherwise one hidden layer."""

    def __init__(self, dim: int, hidden: int = 64):
        super().__init__()
        self.net = (nn.Linear(dim, len(DECADES)) if hidden == 0 else
                    nn.Sequential(nn.Linear(dim, hidden), nn.ReLU(), nn.Linear(hidden, len(DECADES))))

    def forward(self, z: torch.Tensor, lam: float) -> torch.Tensor:
        return self.net(GradReverse.apply(z, lam))


def ramp(progress: float, lam_max: float) -> float:
    """Ganin's schedule: lambda grows smoothly from 0 to lam_max, so the encoder learns players first."""
    return lam_max * (2.0 / (1.0 + math.exp(-10.0 * progress)) - 1.0)


def train_contrastive_adv(model: SeasonEncoder, head: EraHead, X: torch.Tensor, meta: pd.DataFrame,
                          decades: torch.Tensor, val: pd.DataFrame, temperature: float, lam_max: float,
                          epochs: int = 100, patience: int = 10, lr: float = 1e-3, rate: float = 0.15,
                          head_lr_mult: float = 1.0, seed: int = 2026) -> list[dict]:
    """Phase 3 Stage B plus the era adversary. Keeps the weights with the best validation non-adjacent hit@10."""
    from evaluate import retrieval

    gen = torch.Generator().manual_seed(seed)
    sampler = PairSampler(meta, seed=seed)
    opt = torch.optim.Adam([
        {"params": list(model.encoder.parameters()) + list(model.project.parameters()), "lr": lr},
        {"params": head.parameters(), "lr": lr * head_lr_mult},  # a faster head keeps the adversary strong
    ])
    wrapper = NeuralEncoder.from_model(model)
    total_steps, step = epochs * len(sampler), 0
    best, best_state, since_best, history = -1.0, None, 0, []
    for epoch in range(epochs):
        model.train()
        head.train()
        nce_l, era_l, era_acc, lams = [], [], [], []
        for a, b in sampler:
            lam = ramp(step / total_steps, lam_max)
            va, _ = mask_features(X[a], X, rate, gen)
            vb, _ = mask_features(X[b], X, rate, gen)
            za, zb = model(va), model(vb)
            nce = info_nce(model.project(za), model.project(zb), temperature)
            logits = head(torch.cat([za, zb]), lam)
            target = torch.cat([decades[a], decades[b]])
            era = F.cross_entropy(logits, target)
            loss = nce + era  # the head minimises era loss; the reversed gradient pushes the encoder the other way
            opt.zero_grad()
            loss.backward()
            opt.step()
            step += 1
            nce_l.append(nce.item())
            era_l.append(era.item())
            era_acc.append((logits.argmax(1) == target).float().mean().item())
            lams.append(lam)
        model.eval()
        score = retrieval(wrapper, val, non_adjacent=True)["hit10"]
        history.append({"epoch": epoch + 1, "loss": float(np.mean(nce_l)), "era_loss": float(np.mean(era_l)),
                        "era_head_acc": float(np.mean(era_acc)), "lambda": float(np.mean(lams)),
                        "val_nonadj_hit10": score})
        if score > best:
            best, best_state, since_best = score, copy.deepcopy(model.state_dict()), 0
        else:
            since_best += 1
            if since_best >= patience:
                break
    model.load_state_dict(best_state)
    return history


class EraAdversarialEncoder(NeuralEncoder):
    """Phase 3 encoder trained with the era adversary. lam_max = 0 gives exactly the Phase 3 model."""

    def __init__(self, lam_max: float = 1.0, seed: int = 2026, dim: int = DIM, temperature: float = TEMPERATURE,
                 pretraining: bool = PRETRAINING, root: Path | None = None):
        super().__init__(dim=dim, temperature=temperature, pretraining=pretraining, seed=seed, root=root)
        self.lam_max = lam_max
        self.name = f"Era encoder lambda={lam_max} s{seed}"

    def fit(self, train: pd.DataFrame = None, val: pd.DataFrame = None) -> "EraAdversarialEncoder":
        set_seed(self.seed)
        X, meta = load_train(self.root)
        decades = decade_index(meta["season"])
        if val is None:
            df = load(self.root)
            val = df[df["split"] == "val"].reset_index(drop=True)
        X_val = torch.tensor(val[Z].to_numpy(dtype=np.float32))
        self.model = SeasonEncoder(self.dim)
        if self.pretraining:
            self.history["pretrain"] = pretrain(self.model, X, X_val, seed=self.seed)
        head = EraHead(self.dim)  # created after Stage A so the encoder's initial weights match Phase 3
        self.history["contrastive"] = train_contrastive_adv(self.model, head, X, meta, decades, val,
                                                            self.temperature, self.lam_max, seed=self.seed)
        return self

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        torch.save({"state": self.model.state_dict(), "dim": self.dim, "temperature": self.temperature,
                    "pretraining": self.pretraining, "seed": self.seed, "lam_max": self.lam_max,
                    "history": self.history}, path)


class SeasonCentred(Baseline):
    """Era removal after training. Each season's average (unit-length) embedding over training players is
    subtracted, scaled by alpha, so a season is described relative to its own league that year.
    alpha = 0 is the base encoder; alpha = 1 removes every season's average entirely."""

    def __init__(self, base: NeuralEncoder, alpha: float):
        self.base, self.alpha = base, alpha
        self.name = f"Season-centred encoder alpha={alpha} s{getattr(base, 'seed', '')}"
        self.means = None

    def fit(self, train: pd.DataFrame) -> "SeasonCentred":
        e = self.base.embed(train)
        seasons = train["season"].to_numpy()
        self.means = {s: e[seasons == s].mean(0) for s in np.unique(seasons)}
        return self

    def embed(self, df: pd.DataFrame) -> np.ndarray:
        e = self.base.embed(df)
        missing = set(df["season"]) - set(self.means)
        if missing:
            raise ValueError(f"no training players in seasons {sorted(missing)}")
        e = e - self.alpha * np.stack([self.means[s] for s in df["season"].to_numpy()])
        return e / np.linalg.norm(e, axis=1, keepdims=True).clip(1e-12)

    def similarity(self, a: np.ndarray, b: np.ndarray) -> np.ndarray:
        return a @ b.T


def main() -> None:
    """Smoke run: the lambda = 0 control (Phase 3 retrained, seed 2026), then season centring at alpha 0.5
    on top of it. The adversary itself is exercised by `evaluate_era.py search --quick`."""
    from evaluate import era_and_position, next_season, retrieval

    root = Path(__file__).resolve().parents[1]
    df = load(root)
    train = df[df["split"] == "train"].reset_index(drop=True)
    val = df[df["split"] == "val"].reset_index(drop=True)
    trval = df[df["split"].isin(["train", "val"])].reset_index(drop=True)
    base = EraAdversarialEncoder(lam_max=0.0, seed=2026).fit(val=val)
    for model in (base, SeasonCentred(base, 0.5).fit(train)):
        na, ns, pr = retrieval(model, val, non_adjacent=True), next_season(model, val), era_and_position(model, trval)
        print(f"{model.name}: non-adjacent hit@10 {na['hit10']:.3f}, next-season RMSE {ns['rmse']:.3f}, "
              f"era probe {pr['era']:.3f}, position probe {pr['position']:.3f}")
    print("Expected roughly: control era about 0.32, centred era about 0.24, non-adjacent within about 0.01 of each other")
    out = root / "models" / "era_smoke_lambda0_s2026.pt"
    base.save(out)
    print(f"Saved {out}")


if __name__ == "__main__":
    main()
