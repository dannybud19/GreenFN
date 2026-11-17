# Sanity judgements (Phase 2)

How the Judgement column in `reports/phase2_baselines.md` was decided. Marks are in `config/sanity_marks.json`; `src/score_sanity.py` turns them into verdicts.

## Method

1. For each of the 15 sanity players, every name that B1 to B4 put in the top 5 was collected (B0 random is not judged).
2. Each name was marked **fair** (✓), **partial** (~) or **wrong** (✗) **without looking at the stats**. Judging comps with the same stats the models use would be circular.
3. Danny's own opinion comes first and is final. He marked Larry Bird in full, plus Al Horford (Kareem) and Penny Hardaway, John Stockton and James Harden (Magic).
4. For the rest, Claude suggested a mark from external consensus (articles, interviews, forum comparison threads) or, for role players with no comparison anywhere, from playing style. Danny reviewed every suggestion and confirmed it or changed it.
5. Changes after review: Magic Johnson for Stockton moved from ✗ to ~; James Harden for Magic moved from ✗ to ~; Khris Middleton for Bird moved from ✓ to ~.

## Scoring

| Mark | Points |
|---|---|
| ✓ fair | 1 |
| ~ partial | 0.5 |
| ✗ wrong | 0 |

Score = sum over a model's top 5 (0 to 5). **Pass** if 2 or more, **partial** if above 0, **fail** if 0.

## Results (validation-era sanity players)

| Player | B1 | B2 | B3 | B3w | B4 |
|---|---|---|---|---|---|
| Kareem Abdul-Jabbar | fail (0) | partial (1) | partial (0.5) | fail (0) | fail (0) |
| Magic Johnson | partial (1) | partial (1.5) | pass (2) | pass (2.5) | partial (1) |
| Larry Bird | partial (1.5) | pass (2) | partial (0.5) | partial (1) | partial (1) |
| Isiah Thomas | partial (0.5) | partial (1.5) | partial (1.5) | partial (1.5) | partial (1.5) |
| Charles Barkley | partial (1.5) | partial (1.5) | partial (1.5) | partial (0.5) | partial (1.5) |
| Michael Jordan | pass (2) | pass (3) | pass (2) | pass (3) | pass (2) |
| John Stockton | pass (2) | partial (1.5) | pass (3) | partial (1) | pass (2) |
| Dennis Rodman | partial (0.5) | partial (1) | partial (0.5) | partial (1.5) | partial (0.5) |
| Shaquille O'Neal | pass (2) | pass (2) | pass (2) | pass (2) | partial (1.5) |
| Steve Nash | fail (0) | partial (1.5) | fail (0) | fail (0) | fail (0) |
| Kobe Bryant | partial (1.5) | pass (2.5) | partial (1.5) | pass (2) | partial (0.5) |
| LeBron James | partial (1.5) | pass (2) | partial (0.5) | partial (1) | partial (1) |
| Stephen Curry | pass (3) | pass (3) | pass (2) | pass (2) | pass (3) |
| Draymond Green | partial (1) | fail (0) | partial (0.5) | partial (0.5) | partial (1.5) |
| Nikola Jokić | partial (1) | partial (1.5) | partial (1.5) | pass (2) | partial (1) |

## Findings

- **B2 cosine is the best baseline on the sanity check**: 6 pass, 1 fail, mean 1.70 out of 5. It is also the only baseline that beats persistence on next-season error.
- **Strong across models:** Jordan (Kobe is in the top 5 for B1 to B3w; B4 misses him), Curry (Lillard in every model, Mark Price in B1 and B2) and Shaq (Dwight Howard in every model; B4 scores only partial because the rest of its top 5 is weaker).
- **Weak across models:** Kareem (late-career centre; no model finds a comparable star centre), Nash (fails in 4 of 5; only B2 finds Mark Price, and his usual comps Stockton and Chris Paul never appear, matching the Nash and Paul known-pair failure) and Rodman (outlier; only partial rebounders).
- **Draymond:** no fair comp in any model. His value (defence, passing, low scoring) isn't well captured by box-score rates.
- Most comps from the raw z-scores are role players who share a stat shape with the star but not his level or role. That is the gap the learned encoder in Phase 3 has to close.

## Main sources for the consensus marks

- Kobe as the closest comp to Jordan: [CBS Sports (Steve Kerr)](https://www.cbssports.com/nba/news/steve-kerr-explains-why-kobe-bryant-not-lebron-is-closest-thing-to-michael-jordan), [Bleacher Report (Magic Johnson)](https://bleacherreport.com/articles/2890046-magic-johnson-explains-why-kobe-bryant-is-closest-player-to-michael-jordan)
- Harden and Magic: [Bleacher Report (Doc Rivers comparison)](https://bleacherreport.com/articles/10061229-76ers-james-harden-on-doc-rivers-magic-johnson-comparison-im-james-harden)
- Penny as the next Magic: [ClutchPoints](https://clutchpoints.com/5-players-dubbed-the-next-magic-johnson-where-are-they-now)
- Jokić and Sabonis: [FloHoops](https://flohoops.com/articles/6470826-nikola-jokic-is-a-modern-day-arvydas-sabonis); Jokić and LeBron: [ESPN](https://www.espn.com/nba/story/_/id/30993984/why-nikola-jokic-drawing-comparisons-lebron-james-luka-doncic)
- Shaq and Howard: [Bleacher Report](https://bleacherreport.com/articles/1314104-shaquille-oneal-vs-dwight-howard-comparing-the-games-of-two-lakers-big-men)
- Chris Paul and Stockton: [Thunderous Intentions](https://thunderousintentions.com/2019/08/22/okc-thunder-chris-paul-vs-john-stockton)
- Curry and Mark Price: [Sportskeeda (Isiah Thomas)](https://sportskeeda.com/basketball/news-steph-curry-done-something-uniquely-different-league-isiah-thomas-heaps-praise-steph-curry-s-shooting-compares-favorably-mark-price); Curry and Ray Allen: [RealGM](https://basketball.realgm.com/wiretap/241589/Ray-Allen-Stephen-Curry-In-His-Own-Category-As-Shooter-On-Way-To-Being-Best-Ever)
- Barkley and Kemp: [Heavy](https://heavy.com/sports/charles-barkley-shawn-kemp-zion-williamson-brevin-knight-scoop-b/)
- LeBron and Luka: [ESPN](https://global.espn.com/nba/story/_/id/29728195/nba-playoffs-why-luka-doncic-getting-compared-lebron-magic-bird)
- Next Kobe lists: [Sportskeeda](https://sportskeeda.com/basketball/who-s-next-kobe-bryant-looking-5-nba-players-can-emulate-la-lakers-legend); SGA and Jordan: [Bolavip (Tracy McGrady)](https://bolavip.com/en/nba/magic-legend-tracy-mcgrady-makes-bold-comparison-between-shai-gilgeous-alexander-and-nba-michael-jordan-and-kobe-bryant)

Many ✗ marks on role players are judgement calls (no published comparison exists), not sourced claims.