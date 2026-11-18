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

## Phase 3 addendum (17 Nov 2026)

The Phase 3 encoder (embedding size 32, temperature 0.05, pretraining, seed 2026) brought 27 comp names that weren't yet marked (`reports/phase3_unmarked_comps.json`). **Danny delegated these to Claude**, so unlike the Phase 2 marks they were not reviewed by him. Same rules: researched consensus first, playing style when no comparison exists, never the stats.

| Mark | Names |
|---|---|
| ✓ fair | Reggie Evans (Rodman), Scottie Pippen (Draymond) |
| ~ partial | Chris Bosh, Elton Brand (Kareem); Antoine Walker (Bird); Kenny Anderson (Isiah); Buck Williams, Domantas Sabonis (Barkley); LeBron James, Grant Hill (Jordan); Maurice Cheeks, Andre Miller (Stockton); Jamie Feick (Rodman); Paul Pierce (Kobe) |
| ✗ wrong | Obi Toppin (Kareem); Tyler Herro (Bird); Kelvin Ransey, Robert Pack (Isiah); Kevin Garnett (Barkley); Kirk Hinrich, Jameer Nelson (Nash); Ja Morant (LeBron); Mike James, Jordan Farmar (Curry); Rich Kelley, Cody Martin (Draymond); Charles Barkley (Jokic) |

Result: encoder 8 pass, 6 partial, 1 fail (mean 1.80) against B2's 6 / 8 / 1 (mean 1.70). Because Claude marked the encoder-only names, treat this comparison as less independent than Phase 2's; Danny can overrule any mark on the comp-check page.

Sources for the ✓ marks and the Grant Hill partial:
- Reggie Evans and Rodman: [Hoops Habit](https://hoopshabit.com/2013/04/30/brooklyn-nets-is-reggie-evans-turning-into-todays-dennis-rodman), [Nets Takeover (Gerald Wallace's comparison)](https://netstakeover.blogspot.com/2013/12/gerald-wallace-compares-reggie-evans-to.html)
- Draymond and Pippen: [NBC Sports Bay Area (Steve Kerr)](https://nbcsportsbayarea.com/nba/golden-state-warriors/steve-kerr-compares-draymond-green-scottie-pippen-dennis-rodman/1836762)
- Grant Hill as "the next Jordan": [Mitch Albom](https://www.mitchalbom.com/heir-vs-airthe-next-jordan-goes-up-against-the-original/), [IBTimes](https://www.ibtimes.com/five-players-who-were-hailed-next-michael-jordan-3147418)
- Paul Pierce and Kobe as rivals: [Bleacher Report](https://bleacherreport.com/articles/532807-paul-pierce-and-kobe-bryant-the-truth-and-the-mamba)

The other partial and wrong marks have no published comparison; they are judgement calls on playing style.

## Phase 4 addendum (18 Nov 2026)

Five new comp names from the Phase 4 models, marked by Claude (delegated by Danny), same rules.

| Name | For | Mark | Basis |
|---|---|---|---|
| Tyrese Haliburton | Magic Johnson | ~ | Compared to Magic by Tracy McGrady, and Magic gave him a nickname; but a 6'5" guard, not a 6'9" point guard |
| Tyson Chandler | Dennis Rodman | ✓ | Claude suggested ~ (studied Rodman's rebounding, but a shot-blocking centre); **Danny overrode it to ✓ on 18 Nov** |
| Stanley Roberts | Shaquille O'Neal | ~ | Huge low-post centre (Shaq's LSU teammate), nowhere near his level; same call as Eddy Curry |
| Bernard King | Kobe Bryant | ~ | Elite volume-scoring wing, but a forward from an earlier era |
| Karl Malone | Nikola Jokic | ✗ | Scoring power forward, not a passing centre |

Result: chosen model (season centring, alpha 0.5) 8 pass, 7 partial, 0 fail, mean 1.90 after Danny's override (1.87 before).

Sources:
- [Yardbarker: Tracy McGrady compares Haliburton to Magic Johnson](https://www.yardbarker.com/nba/articles/tracy_mcgrady_compares_tyrese_haliburton_to_magic_johnson_but_urges_pacers_guard_to_follow_jason_kidds_footsteps_to_superstardom/s1_17667_42384017)
- [8 Points, 9 Seconds: Magic Johnson's nickname for Haliburton](https://8points9seconds.com/tyrese-haliburton-magic-johnson-starting-5-netflix)
- [The SportsRush: Tyson Chandler studied Rodman's rebounding](https://thesportsrush.com/nba-news-en-route-to-187576101-career-mavericks-legend-studied-dennis-rodmans-manic-rebounding-and-learned-to-crash-the-boards/)
- [RealGM: Bernard King, the NBA's invisible genius](https://basketball.realgm.com/article/227128/Bernard-King-The-NBAs-Invisible-Genius)

## Phase 5 addendum (18 Nov 2026)

27 new names from the career-level comps, marked by Claude (delegated by Danny), same rules.

| Mark | Names |
|---|---|
| ✓ fair | Tyrese Haliburton (Nash), Zion Williamson (Shaq), Anthony Edwards (Kobe) |
| ~ partial | Pau Gasol (Kareem); Steve Nash (Magic); Baron Davis (Isiah); Jeff Ruland (Barkley); Donovan Mitchell (Jordan); Kevin Porter (Stockton); Joey Dorsey, Michael Smith (Rodman); Amar'e Stoudemire (Shaq); Scott Skiles (Nash); Kyle Anderson (Draymond); DeMarcus Cousins, Joel Embiid (Jokic) |
| ✗ wrong | Larry Nance (Kareem); Kemba Walker (Bird); Ray Williams (Isiah); Nikola Jokic (Barkley); Kevin Johnson (Stockton); Shai Gilgeous-Alexander (LeBron); Reggie Theus, Sam Cassell (Curry); Carlos Terry, Juan Toscano-Anderson, Vlade Divac (Draymond) |

Result: chosen career score 11 pass, 4 partial, 0 fail, mean 2.17.

Sources for the ✓ marks and Kyle Anderson:
- [TrueHoop: Is Tyrese Haliburton the new Steve Nash?](https://www.truehoop.com/p/is-tyrese-haliburton-the-new-steve)
- [Yahoo Sports: Zion Williamson is the Shaquille O'Neal of the small-ball era](https://sports.yahoo.com/zion-williamson-is-the-shaquille-oneal-of-nba-small-ball-221842083.html)
- [The Ringer: Zion Williamson and Shaquille O'Neal](https://www.theringer.com/nba/2020/2/25/21151896/zion-williamson-shaquille-oneal-pelicans-lakers)
- [Sports Illustrated: Julius Randle compares Anthony Edwards to Kobe Bryant](https://www.si.com/nba/julius-randle-praise-anthony-edwards-confidence-kobe-bryant-comparison-timberwolves)
- [Sports Illustrated: Why Anthony Edwards reminds Charles Barkley of Jordan and Kobe](https://www.si.com/nba/2024/04/27/anthony-edwards-reminds-charles-barkley-michael-jordan-kobe-bryant)
- [EssentiallySports: Draymond Green could pass the torch to Kyle Anderson](https://www.essentiallysports.com/nba-active-basketball-news-uncertain-on-warriors-future-draymond-green-could-pass-the-torch-to-thirty-yo-star-kyle-anderson)

