# Phase 3 results: neural season encoder

Validation split. Rules: `notes/phase2_eval_plan.md` and `notes/phase3_plan.md`. Validation also chose the setting and the early-stopping epoch, so encoder numbers here are optimistic; the unbiased numbers come from the test split once, at the end of v1.

Chosen setting: embedding size 32, temperature 0.05, pretraining yes (best mean validation non-adjacent hit@10 over 3 seeds).

## Results (mean ± spread over seeds 2026, 2027, 2028)

| Metric | Encoder | B2 cosine | Better |
|---|---|---|---|
| Hit@10 | 0.857 ± 0.004 | 0.778 | encoder |
| MRR | 0.646 ± 0.003 | 0.561 | encoder |
| Non-adjacent hit@10 | 0.746 ± 0.006 | 0.668 | encoder |
| Next-season RMSE | 0.620 ± 0.003 | 0.608 | B2 |
| Era balanced acc. (chance 0.20) | 0.323 ± 0.004 | 0.190 |  |
| Position balanced acc. (chance 0.20) | 0.656 ± 0.001 | 0.661 | B2 |

Persistence next-season RMSE: 0.610. Encoder vs persistence: +1.7%.

## Stability check (validation)

Mean cosine distance between consecutive seasons of the same player vs random pairs of different players. Pass if consecutive pairs are closer.

| Model | Consecutive | Random | Ratio | Pass |
|---|---|---|---|---|
| Encoder | 0.061 ± 0.002 | 0.371 ± 0.013 | 0.165 ± 0.001 | yes (all seeds) |
| B2 cosine | 0.242 | 0.994 | 0.243 | yes |

## Gate (phase3_plan.md section 7)

- PASS: Beats B2 on non-adjacent hit@10
- FAIL: Beats B2 on next-season RMSE
- FAIL: Beats persistence on next-season RMSE
- PASS: Stability check passes (all seeds)
- PASS: Position probe well above chance (> 0.40)
- REPORTED: sanity comps marked and scored. Encoder (seed 2026) 8 pass, 6 partial, 1 fail, mean 1.80 out of 5; B2 6 / 8 / 1, mean 1.70 (see Sanity summary)

If a line fails, it is recorded as a finding; the metric is not changed.

## Search (validation, mean ± spread over 3 seeds)

| Embedding size | Temperature | Pretraining | Non-adjacent hit@10 | Next-season RMSE | Hit@10 | Mean epochs |
|---|---|---|---|---|---|---|
| 32 | 0.05 | yes | 0.746 ± 0.006 | 0.620 ± 0.003 | 0.857 | 77 |
| 32 | 0.1 | yes | 0.736 ± 0.006 | 0.620 ± 0.002 | 0.844 | 63 |
| 16 | 0.05 | yes | 0.733 ± 0.009 | 0.624 ± 0.001 | 0.843 | 82 |
| 16 | 0.1 | yes | 0.727 ± 0.008 | 0.625 ± 0.001 | 0.835 | 66 |
| 16 | 0.2 | yes | 0.724 ± 0.012 | 0.629 ± 0.001 | 0.840 | 88 |
| 32 | 0.05 | no | 0.718 ± 0.009 | 0.620 ± 0.001 | 0.834 | 69 |
| 32 | 0.2 | yes | 0.717 ± 0.009 | 0.624 ± 0.002 | 0.833 | 61 |
| 16 | 0.05 | no | 0.715 ± 0.021 | 0.623 ± 0.001 | 0.827 | 77 |
| 32 | 0.1 | no | 0.710 ± 0.005 | 0.620 ± 0.002 | 0.825 | 60 |
| 32 | 0.2 | no | 0.705 ± 0.007 | 0.624 ± 0.004 | 0.826 | 71 |
| 16 | 0.1 | no | 0.705 ± 0.011 | 0.623 ± 0.003 | 0.822 | 76 |
| 16 | 0.2 | no | 0.682 ± 0.005 | 0.625 ± 0.002 | 0.800 | 56 |
| 8 | 0.1 | yes | 0.637 ± 0.018 | 0.634 ± 0.002 | 0.758 | 68 |
| 8 | 0.05 | no | 0.637 ± 0.005 | 0.633 ± 0.002 | 0.751 | 58 |
| 8 | 0.05 | yes | 0.635 ± 0.004 | 0.633 ± 0.002 | 0.759 | 83 |
| 8 | 0.1 | no | 0.632 ± 0.002 | 0.634 ± 0.002 | 0.749 | 68 |
| 8 | 0.2 | yes | 0.627 ± 0.033 | 0.634 ± 0.001 | 0.743 | 69 |
| 8 | 0.2 | no | 0.624 ± 0.012 | 0.634 ± 0.003 | 0.747 | 53 |

## Box-score correlation (seed 2026 model, top 2 PCA components, Bonferroni over 6 tests)

| PC | Stat | r | p (corrected) |
|---|---|---|---|
| 1 | rebound % (orb + drb) | +0.879 | 0 |
| 1 | ast_percent | -0.655 | 0 |
| 1 | x3p_ar | -0.516 | 0 |
| 2 | rebound % (orb + drb) | -0.127 | 2e-45 |
| 2 | ast_percent | -0.413 | 0 |
| 2 | x3p_ar | +0.208 | 9e-122 |

## Known-pair test (each in the other's top 5)

| Model | Pair | Result |
|---|---|---|
| Encoder d=32 t=0.05 pre s2026 | Michael Jordan / Kobe Bryant | pass |
| Encoder d=32 t=0.05 pre s2026 | Shaquille O'Neal / Dwight Howard | pass |
| Encoder d=32 t=0.05 pre s2026 | Steve Nash / Chris Paul | fail |
| B2 cosine | Michael Jordan / Kobe Bryant | pass |
| B2 cosine | Shaquille O'Neal / Dwight Howard | pass |
| B2 cosine | Steve Nash / Chris Paul | fail |

## Sanity comps (top 5 comp players, best season match; encoder = seed 2026 model)

Judgement column is filled by `src/score_sanity.py --report reports/phase3_encoder.md` once every name is marked in `config/sanity_marks.json`.

### Kareem Abdul-Jabbar

| Model | Top 5 | Judgement |
|---|---|---|
| Encoder d=32 t=0.05 pre s2026 | Obi Toppin 2022, Chris Bosh 2013, Kevin McHale 1987, Rasheed Wallace 2001, Elton Brand 2006 | **partial** (1.5/5): Chris Bosh ~, Kevin McHale ~, Elton Brand ~ |
| B2 cosine | Rasheed Wallace 2001, Kevin McHale 1987, Al Horford 2014, Patrick Ewing 1990, Nenad Krstić 2009 | **partial** (1/5): Kevin McHale ~, Patrick Ewing ~ |

### Magic Johnson

| Model | Top 5 | Judgement |
|---|---|---|
| Encoder d=32 t=0.05 pre s2026 | Kevin Johnson 1992, Andre Miller 2002, Deron Williams 2009, Reggie Theus 1986, John Stockton 1999 | **partial** (1.5/5): Andre Miller ~, Deron Williams ~, John Stockton ~ |
| B2 cosine | Kevin Johnson 1992, Andre Miller 2001, John Stockton 1994, Reggie Theus 1986, Deron Williams 2009 | **partial** (1.5/5): Andre Miller ~, John Stockton ~, Deron Williams ~ |

### Larry Bird

| Model | Top 5 | Judgement |
|---|---|---|
| Encoder d=32 t=0.05 pre s2026 | Stephen Curry 2023, Ray Allen 2001, Tyler Herro 2023, Clyde Drexler 1995, Antoine Walker 2001 | **partial** (1.5/5): Stephen Curry ~, Ray Allen ~, Antoine Walker ~ |
| B2 cosine | Stephen Curry 2023, Ray Allen 2001, Khris Middleton 2020, Kevin Durant 2015, Rashard Lewis 2007 | **pass** (2/5): Stephen Curry ~, Ray Allen ~, Khris Middleton ~, Kevin Durant ~ |

### Isiah Thomas

| Model | Top 5 | Judgement |
|---|---|---|
| Encoder d=32 t=0.05 pre s2026 | Kelvin Ransey 1982, Larry Drew 1983, Monta Ellis 2012, Robert Pack 1997, Kenny Anderson 1994 | **partial** (0.5/5): Kenny Anderson ~ |
| B2 cosine | Brandon Jennings 2014, Greg Anthony 1996, Jrue Holiday 2013, Tim Hardaway 1996, Deron Williams 2014 | **partial** (1.5/5): Brandon Jennings ~, Tim Hardaway ✓ |

### Charles Barkley

| Model | Top 5 | Judgement |
|---|---|---|
| Encoder d=32 t=0.05 pre s2026 | Kevin Garnett 2006, Karl Malone 1997, Paul Millsap 2009, Buck Williams 1987, Domantas Sabonis 2022 | **pass** (2/5): Karl Malone ~, Paul Millsap ~, Buck Williams ~, Domantas Sabonis ~ |
| B2 cosine | Kenneth Faried 2012, Nenê 2007, Shawn Kemp 1995, Tyrone Hill 1994, Jalen Duren 2025 | **partial** (1.5/5): Kenneth Faried ~, Shawn Kemp ✓ |

### Michael Jordan

| Model | Top 5 | Judgement |
|---|---|---|
| Encoder d=32 t=0.05 pre s2026 | Kobe Bryant 2003, LeBron James 2012, Tracy McGrady 2005, Dwyane Wade 2006, Grant Hill 1999 | **pass** (3/5): Kobe Bryant ✓, LeBron James ~, Tracy McGrady ~, Dwyane Wade ~, Grant Hill ~ |
| B2 cosine | Kobe Bryant 2000, George Gervin 1981, Tracy McGrady 2006, Kawhi Leonard 2026, Dwyane Wade 2012 | **pass** (3/5): Kobe Bryant ✓, George Gervin ~, Tracy McGrady ~, Kawhi Leonard ~, Dwyane Wade ~ |

### John Stockton

| Model | Top 5 | Judgement |
|---|---|---|
| Encoder d=32 t=0.05 pre s2026 | Chris Paul 2013, Maurice Cheeks 1982, Andre Miller 2002, Brevin Knight 1998, José Calderón 2007 | **pass** (3/5): Chris Paul ✓, Maurice Cheeks ~, Andre Miller ~, Brevin Knight ~, José Calderón ~ |
| B2 cosine | Brevin Knight 1998, Terry Porter 1988, Paul Pressey 1989, José Calderón 2007, Allen Leavell 1980 | **partial** (1.5/5): Brevin Knight ~, Terry Porter ~, José Calderón ~ |

### Dennis Rodman

| Model | Top 5 | Judgement |
|---|---|---|
| Encoder d=32 t=0.05 pre s2026 | Larry Smith 1982, Jeff Foster 2005, Reggie Evans 2011, Michael Cage 1990, Jamie Feick 1999 | **pass** (3/5): Larry Smith ~, Jeff Foster ~, Reggie Evans ✓, Michael Cage ~, Jamie Feick ~ |
| B2 cosine | Jeff Foster 2004, Charles Oakley 1990, Larry Micheaux 1985, Trevor Booker 2015, Nazr Mohammed 2008 | **partial** (1/5): Jeff Foster ~, Charles Oakley ~ |

### Shaquille O'Neal

| Model | Top 5 | Judgement |
|---|---|---|
| Encoder d=32 t=0.05 pre s2026 | Tim Duncan 2004, Dwight Howard 2015, Alonzo Mourning 1997, Steve Johnson 1983, Chris Gatling 1995 | **pass** (2/5): Tim Duncan ~, Dwight Howard ✓, Alonzo Mourning ~ |
| B2 cosine | Steve Johnson 1983, Tim Duncan 2001, Dwight Howard 2015, Alonzo Mourning 1999, Chris Gatling 1995 | **pass** (2/5): Tim Duncan ~, Dwight Howard ✓, Alonzo Mourning ~ |

### Steve Nash

| Model | Top 5 | Judgement |
|---|---|---|
| Encoder d=32 t=0.05 pre s2026 | Jordan Farmar 2012, Kirk Hinrich 2004, Steve Blake 2008, Anthony Goldwire 1997, Jameer Nelson 2009 | **fail** (0/5): no fair or partial comps |
| B2 cosine | Jordan Farmar 2012, Mark Price 1993, José Calderón 2009, Kenny Smith 1991, Jarrett Jack 2010 | **partial** (1.5/5): Mark Price ✓, José Calderón ~ |

### Kobe Bryant

| Model | Top 5 | Judgement |
|---|---|---|
| Encoder d=32 t=0.05 pre s2026 | Kawhi Leonard 2020, Bradley Beal 2019, Donovan Mitchell 2026, Michael Jordan 1990, Paul Pierce 2003 | **pass** (3/5): Kawhi Leonard ~, Bradley Beal ~, Donovan Mitchell ~, Michael Jordan ✓, Paul Pierce ~ |
| B2 cosine | Michael Jordan 1992, Kawhi Leonard 2020, Donovan Mitchell 2026, Russell Westbrook 2012, Bradley Beal 2020 | **pass** (2.5/5): Michael Jordan ✓, Kawhi Leonard ~, Donovan Mitchell ~, Bradley Beal ~ |

### LeBron James

| Model | Top 5 | Judgement |
|---|---|---|
| Encoder d=32 t=0.05 pre s2026 | Grant Hill 1999, Luka Dončić 2024, Dwyane Wade 2010, Michael Jordan 1989, Ja Morant 2022 | **pass** (2/5): Grant Hill ~, Luka Dončić ~, Dwyane Wade ~, Michael Jordan ~ |
| B2 cosine | Dwyane Wade 2009, Luka Dončić 2021, Grant Hill 2000, Monta Ellis 2013, Michael Jordan 1989 | **pass** (2/5): Dwyane Wade ~, Luka Dončić ~, Grant Hill ~, Michael Jordan ~ |

### Stephen Curry

| Model | Top 5 | Judgement |
|---|---|---|
| Encoder d=32 t=0.05 pre s2026 | Mo Williams 2010, Ray Allen 2004, Mike James 2006, Jordan Farmar 2012, Jeff Hornacek 1993 | **partial** (1/5): Ray Allen ~, Jeff Hornacek ~ |
| B2 cosine | Ray Allen 2004, Kyrie Irving 2012, Mark Price 1994, Damian Lillard 2021, Manu Ginóbili 2008 | **pass** (3/5): Ray Allen ~, Kyrie Irving ~, Mark Price ✓, Damian Lillard ✓ |

### Draymond Green

| Model | Top 5 | Judgement |
|---|---|---|
| Encoder d=32 t=0.05 pre s2026 | Rich Kelley 1981, Scottie Pippen 2002, Cody Martin 2025, Earl Watson 2012, Chris Singleton 2013 | **partial** (1/5): Scottie Pippen ✓ |
| B2 cosine | Nemanja Bjelica 2022, Walter McCarty 1999, Earl Watson 2012, Anthony Carter 2009, Nate McMillan 1987 | **fail** (0/5): no fair or partial comps |

### Nikola Jokić

| Model | Top 5 | Judgement |
|---|---|---|
| Encoder d=32 t=0.05 pre s2026 | Kevin Garnett 2005, Arvydas Sabonis 1996, Greg Monroe 2012, Domantas Sabonis 2021, Charles Barkley 1996 | **pass** (2/5): Arvydas Sabonis ✓, Greg Monroe ~, Domantas Sabonis ~ |
| B2 cosine | Alvan Adams 1981, Kevin Garnett 2005, LeBron James 2013, Domantas Sabonis 2021, Gorgui Dieng 2019 | **partial** (1.5/5): Alvan Adams ~, LeBron James ~, Domantas Sabonis ~ |

27 encoder comp names still need a mark: `reports/phase3_unmarked_comps.json`.

## Sanity summary

Human judgements from `config/sanity_marks.json` (fair = 1, partial = 0.5, wrong = 0, summed over the top 5). Pass if the score is 2 or more, partial if above 0, fail if 0. Judged without looking at the stats; see `notes/sanity_judgements.md`.

| Model | Pass | Partial | Fail | Mean score (out of 5) |
|---|---|---|---|---|
| Encoder d=32 t=0.05 pre s2026 | 8 | 6 | 1 | 1.80 |
| B2 cosine | 6 | 8 | 1 | 1.70 |

## Findings

- **Identity: the encoder wins.** Mean validation non-adjacent hit@10 is 0.746 against B2's 0.668, and 36 of the 54 search runs beat B2 on it (none at embedding size 8). These numbers are optimistic, because validation also chose the setting and the stopping epoch; test gives the unbiased figure at the end of v1.
- **Next-season forecasting: the encoder loses.** Its RMSE is 0.620 against B2's 0.608 and persistence's 0.610, and no run out of 54 got below 0.617. Training pulls a player's seasons together, so neighbours become players with a similar overall identity, not players at the same stage of change, and their year-to-year changes forecast worse. Recorded as a finding; the metric is unchanged.
- **Era: the encoder reveals it.** The era probe reads 0.323 for the encoder against 0.190 for B2 (chance 0.20). The raw z-scores showed no linear era signal, but the encoder learned stat combinations that do. This is the problem Phase 4's gradient-reversal head targets.
- **Stability: much tighter.** Consecutive seasons sit at 0.165 of the random-pair distance, against 0.243 for B2.
- **Sanity comps: slightly better.** 8 pass against B2's 6, mean 1.80 against 1.70. Gains: Rodman (Reggie Evans), Stockton (Chris Paul plus four partials), Jokic (Arvydas Sabonis), Draymond (Scottie Pippen, his first fair comp), Barkley and Kobe. Losses: Nash fails (Mark Price drops out) and Curry falls to partial (Lillard and Price drop out). The 27 encoder-only names were marked by Claude from researched consensus at Danny's request, not by Danny, so this comparison is less independent than Phase 2's.
- **Known pairs: unchanged.** Jordan and Kobe pass, Shaq and Howard pass, Nash and Paul still fail.
- **Chosen setting:** embedding size 32, temperature 0.05, with pretraining. At sizes 16 and 32, pretraining beat no pretraining for every temperature, and lower temperatures did best; size 8 was clearly worse.
