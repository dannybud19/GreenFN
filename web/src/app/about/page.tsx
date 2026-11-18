import type { Metadata } from "next";
import { loadMeta } from "@/lib/data.server";

export const metadata: Metadata = { title: "About" };

export default async function AboutPage() {
  const meta = await loadMeta();
  return (
    <div className="mx-auto max-w-2xl space-y-8 leading-relaxed">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">About GreenFN</h1>
        <p className="mt-3 text-lg text-muted">
          GreenFN finds NBA players whose whole careers have the same shape, even when they played decades apart. It
          compares careers, not single seasons, and it can explain each match.
        </p>
      </header>

      <section aria-labelledby="how">
        <h2 id="how" className="text-xl font-semibold">
          How it works
        </h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>
            <strong>Seasons.</strong> Every qualified season is described by style stats such as shot volume,
            rebounding, assists and steals, each measured against the rest of the league that year.
          </li>
          <li>
            <strong>Encoder.</strong> A small neural network turns a season into a short list of numbers, trained so
            that different seasons of the same player land close together.
          </li>
          <li>
            <strong>Era centring.</strong> The average of each season is subtracted, so a player is described relative
            to his own league and comps can cross decades.
          </li>
          <li>
            <strong>Career profiles.</strong> Each player gets a centre (his typical season), a peak (his best
            seasons) and a spread (how consistent he was). Two players are close when their centres and peaks are close.
          </li>
          <li>
            <strong>The slider.</strong> Lambda adds a preference for similar consistency. At zero only style
            matters; higher values favour careers with a similar spread.
          </li>
          <li>
            <strong>Why similar.</strong> Integrated gradients credit each stat with its share of the match, so you can
            see which stats made two players alike and which pulled them apart.
          </li>
        </ol>
      </section>

      <section aria-labelledby="results">
        <h2 id="results" className="text-xl font-semibold">
          How well it works
        </h2>
        <p className="mt-2 text-sm text-muted">Numbers come from the project reports on the validation split.</p>
        <dl className="mt-3 divide-y divide-border rounded-lg border border-border bg-card">
          {[
            ["Coverage", "2,467 players, 14,672 seasons (1980 to 2026)"],
            [
              "Career profiles vs best-season matching (split-half hit@10)",
              "0.981 vs 0.916: a player's two half-careers find each other far more reliably.",
            ],
            [
              "Sanity comps (pass / partial / fail)",
              "11 / 4 / 0 for career comps, vs 6 / 8 / 1 for the best Phase 2 baseline. These are human judgements.",
            ],
            ["Era probe after season centring (chance 0.20)", "0.227, down from 0.323"],
            [
              "Explanation checks",
              "Completeness error 0.106% on average. In the deletion test, removing a pair's top 3 stats hurt the match more than removing random ones in 300 of 300 pairs.",
            ],
          ].map(([term, value]) => (
            <div key={term} className="px-4 py-3">
              <dt className="text-sm text-muted">{term}</dt>
              <dd className="mt-0.5 font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="limits">
        <h2 id="limits" className="text-xl font-semibold">
          Honest limits
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>Nash and Chris Paul is the one known pair that no method finds.</li>
          <li>Era is removed for a linear reader, not entirely: a nonlinear probe can still find traces of the decade.</li>
          <li>Kareem Abdul-Jabbar&apos;s data starts in 1980, so most of his career is missing.</li>
          <li>The model is one training run (one seed).</li>
          <li>
            The sanity marks are human judgements: Danny&apos;s own, plus researched consensus that he delegated and
            reviewed.
          </li>
          <li>Validation numbers also chose the settings, so they are optimistic.</li>
        </ul>
      </section>

      <section aria-labelledby="data">
        <h2 id="data" className="text-xl font-semibold">
          Data and code
        </h2>
        <p className="mt-2">{meta.attribution}</p>
        <p className="mt-2">
          The app publishes only derived outputs (comps, scores, breakdowns and map points), not raw stat tables. The
          code and reports are on{" "}
          <a className="underline" href="https://github.com/dannybud19/GreenFN">
            GitHub
          </a>
          .
        </p>
      </section>
    </div>
  );
}
