"""Download the sumitrodatta NBA/ABA/BAA stats dataset from Kaggle into data/raw/."""

from pathlib import Path

DATASET = "sumitrodatta/nba-aba-baa-stats"
RAW_DIR = Path(__file__).resolve().parents[1] / "data" / "raw"


def main() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    existing = sorted(RAW_DIR.glob("*.csv"))
    if existing:
        print(f"{len(existing)} CSVs already in {RAW_DIR}; skipping download.")
        return

    # Imported here because `import kaggle` authenticates immediately.
    from kaggle.api.kaggle_api_extended import KaggleApi

    api = KaggleApi()
    api.authenticate()
    print(f"Downloading {DATASET} -> {RAW_DIR}")
    api.dataset_download_files(DATASET, path=str(RAW_DIR), unzip=True, quiet=False)
    for f in sorted(RAW_DIR.glob("*.csv")):
        print(f"  {f.name}  ({f.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
