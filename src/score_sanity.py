"""Fill the sanity-report Judgement column from human marks (Phase 2, eval plan section 5).

Reads the per-player top-5 tables that src/evaluate.py writes into
reports/phase2_baselines.md, scores each model's top 5 against
config/sanity_marks.json, and writes the verdicts back into the report.

Scoring (decided 17 Nov 2026, see the eval plan change log):
    fair comp = 1, partial = 0.5, wrong = 0; score = sum over the top 5 (0 to 5)
    pass if score >= 2, partial if 0 < score < 2, fail if score == 0
B0 random is not judged. Re-run this after evaluate.py, which rewrites the report.
"""

import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "reports" / "phase2_baselines.md"
MARKS = ROOT / "config" / "sanity_marks.json"
POINTS = {"fair": 1.0, "partial": 0.5, "wrong": 0.0}
ROW = re.compile(r"^\| (B\w+ [^|]+?) \| ([^|]+?) \| *([^|]*?) *\|$")
SUMMARY_HEAD = "## Sanity summary"


def verdict(score: float) -> str:
    return "pass" if score >= 2 else ("partial" if score > 0 else "fail")


def load_marks() -> tuple[dict, dict]:
    raw = json.loads(MARKS.read_text())
    marks = {p: {n: POINTS[k] for k, names in v.items() for n in names} for p, v in raw["players"].items()}
    return marks, raw.get("aliases", {})


def main() -> None:
    marks, aliases = load_marks()
    lines = REPORT.read_text().splitlines()
    if SUMMARY_HEAD in lines:  # drop only the old summary section (up to the next "## " heading) so a re-run replaces it in place
        insert_at = lines.index(SUMMARY_HEAD)
        end = next((j for j in range(insert_at + 1, len(lines)) if lines[j].startswith("## ")), len(lines))
        del lines[insert_at:end]
    else:  # first run: the summary goes at the end of the report
        while lines and not lines[-1].strip():
            lines.pop()
        lines.append("")
        insert_at = len(lines)

    player, results, missing = None, {}, []
    for i, line in enumerate(lines):
        if line.startswith("### "):
            player = line[4:].strip()
            continue
        m = ROW.match(line)
        if not (player and m) or m.group(1).startswith("B0") or m.group(1) == "Model":
            continue
        if player not in marks:
            raise ValueError(f"no marks for sanity player {player!r}")
        model, comps = m.group(1).strip(), m.group(2).split(", ")
        score, hits = 0.0, []
        for item in comps:
            name = aliases.get(item.rsplit(" ", 1)[0], item.rsplit(" ", 1)[0])
            if name not in marks[player]:
                missing.append(f"{player}: {name}")
                continue
            p = marks[player][name]
            score += p
            if p:
                hits.append(name + (" ✓" if p == 1 else " ~"))
        v = verdict(score)
        reason = ", ".join(hits) if hits else "no fair or partial comps"
        lines[i] = f"| {model} | {m.group(2)} | **{v}** ({score:g}/5): {reason} |"
        results.setdefault(model, []).append((v, score))

    if missing:
        raise ValueError("comps with no mark (add them to config/sanity_marks.json):\n" + "\n".join(missing))

    table = ["| Model | Pass | Partial | Fail | Mean score (out of 5) |", "|---|---|---|---|---|"]
    for model, rs in results.items():
        c = Counter(v for v, _ in rs)
        table.append(f"| {model} | {c['pass']} | {c['partial']} | {c['fail']} | {sum(s for _, s in rs) / len(rs):.2f} |")
    section = [SUMMARY_HEAD, "",
               "Human judgements from `config/sanity_marks.json` (fair = 1, partial = 0.5, wrong = 0, summed over the top 5). "
               "Pass if the score is 2 or more, partial if above 0, fail if 0. Judged without looking at the stats; "
               "see `notes/sanity_judgements.md`.", "", *table, ""]
    lines[insert_at:insert_at] = section
    REPORT.write_text("\n".join(lines).rstrip("\n") + "\n")
    print("\n".join(table))
    print(f"Wrote {REPORT}")


if __name__ == "__main__":
    main()