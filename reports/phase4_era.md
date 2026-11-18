# Phase 4 results: era removal

Validation split. Rules: `notes/phase2_eval_plan.md`, `notes/phase3_plan.md` and `notes/phase4_plan.md`. Validation also chose the method, its strength and the early-stopping epoch, so these numbers are optimistic; the unbiased numbers come from the test split once, at the end of v1.

Base: Phase 3's chosen encoder (embedding 32, temperature 0.05, pretraining). Two methods: the gradient reversal adversary (retrained, strength lambda) and season centring (no retraining, strength alpha). The control is lambda = 0, the Phase 3 model retrained. **Chosen: centring alpha 0.5** (met the era target with the best retrieval).

## Results (mean ± spread over seeds 2026, 2027, 2028)

| Metric | Chosen (centring alpha 0.5) | Control (Phase 3 retrained) | B2 cosine |
|---|---|---|---|
| Era probe, train + val, linear (Phase 2 metric; chance 0.20) | 0.227 ± 0.005 | 0.323 ± 0.004 | 0.190 |
| Era probe, validation only, linear | 0.231 ± 0.008 | 0.281 ± 0.005 | 0.176 |
| Era probe, validation only, nonlinear (boosted trees) | 0.319 ± 0.014 | 0.324 ± 0.015 | 0.430 |
| Non-adjacent hit@10 | 0.745 ± 0.006 | 0.746 ± 0.006 | 0.668 |
| Hit@10 | 0.855 ± 0.005 | 0.857 ± 0.004 | 0.778 |
| Next-season RMSE | 0.620 ± 0.003 | 0.620 ± 0.003 | 0.608 |
| Position probe (chance 0.20) | 0.657 ± 0.002 | 0.656 ± 0.001 | 0.661 |
| Cross-era share of top-10 comps | 0.723 ± 0.003 | 0.725 ± 0.004 | 0.744 |
| Stability ratio (lower is tighter) | 0.171 ± 0.001 | 0.165 ± 0.001 | 0.243 |

Persistence next-season RMSE: 0.610.

## Era translation test (feature note): decades among the top 10 comps (seed 2026)

| Player | Chosen | Control | B2 cosine |
|---|---|---|---|
| Stephen Curry | 3 | 4 | 4 |
| Magic Johnson | 5 | 5 | 5 |
| Larry Bird | 3 | 4 | 4 |

## Gate (phase4_plan.md section 7)

- PASS: Era probe (Phase 2 metric) at or below 0.25
- PASS: Non-adjacent hit@10 at or above 0.734 (control mean minus 0.012)
- PASS: Position probe well above chance (> 0.40)
- PASS: Stability check passes (all seeds)
- PASS: Control reproduces Phase 3 (mean non-adjacent hit@10 within 0.005 of 0.746)
- REPORTED: sanity comps marked and scored. Chosen 8 pass, 7 partial, 0 fail, mean 1.87; control 8 / 6 / 1, mean 1.80; B2 6 / 8 / 1, mean 1.70 (see Sanity summary)

If a line fails, it is recorded as a finding; the metric is not changed.

## Search (validation, mean ± spread over 3 seeds)

| Method | Strength | Era probe | Era probe (val only) | Non-adjacent hit@10 | Cross-era share | Next-season RMSE | Position | Mean epochs |
|---|---|---|---|---|---|---|---|---|
| adversary | lambda 0.0 | 0.323 ± 0.004 | 0.281 | 0.746 ± 0.006 | 0.725 | 0.620 | 0.656 | 77 |
| adversary | lambda 0.3 | 0.296 ± 0.022 | 0.256 | 0.741 ± 0.007 | 0.734 | 0.620 | 0.657 | 75 |
| adversary | lambda 1.0 | 0.292 ± 0.024 | 0.250 | 0.728 ± 0.012 | 0.741 | 0.618 | 0.657 | 67 |
| adversary | lambda 3.0 | 0.317 ± 0.015 | 0.275 | 0.727 ± 0.018 | 0.740 | 0.619 | 0.654 | 57 |
| centring | alpha 0.25 | 0.274 ± 0.002 | 0.248 | 0.743 ± 0.009 | 0.724 | 0.620 | 0.656 |  |
| centring | alpha 0.5 | 0.227 ± 0.005 | 0.231 | 0.745 ± 0.006 | 0.723 | 0.620 | 0.657 |  |
| centring | alpha 0.75 | 0.191 ± 0.006 | 0.217 | 0.739 ± 0.006 | 0.723 | 0.621 | 0.658 |  |
| centring | alpha 1.0 | 0.179 ± 0.002 | 0.228 | 0.732 ± 0.007 | 0.721 | 0.621 | 0.659 |  |

## Box-score correlation (chosen, seed 2026; top 2 PCA components; Bonferroni over 6 tests)

| PC | Stat | r | p (corrected) |
|---|---|---|---|
| 1 | rebound % (orb + drb) | +0.879 | 0 |
| 1 | ast_percent | -0.652 | 0 |
| 1 | x3p_ar | -0.512 | 0 |
| 2 | rebound % (orb + drb) | -0.139 | 1.9e-54 |
| 2 | ast_percent | -0.425 | 0 |
| 2 | x3p_ar | +0.232 | 9.4e-152 |

## Known-pair test (each in the other's top 5)

| Model | Pair | Result |
|---|---|---|
| Season-centred encoder alpha=0.5 s2026 | Michael Jordan / Kobe Bryant | partial |
| Season-centred encoder alpha=0.5 s2026 | Shaquille O'Neal / Dwight Howard | pass |
| Season-centred encoder alpha=0.5 s2026 | Steve Nash / Chris Paul | fail |
| Era encoder lambda=0.0 s2026 | Michael Jordan / Kobe Bryant | pass |
| Era encoder lambda=0.0 s2026 | Shaquille O'Neal / Dwight Howard | pass |
| Era encoder lambda=0.0 s2026 | Steve Nash / Chris Paul | fail |
| B2 cosine | Michael Jordan / Kobe Bryant | pass |
| B2 cosine | Shaquille O'Neal / Dwight Howard | pass |
| B2 cosine | Steve Nash / Chris Paul | fail |

## Sanity comps (top 5 comp players, best season match; seed 2026 models)

Judgement column is filled by `src/score_sanity.py --report reports/phase4_era.md` once every name is marked in `config/sanity_marks.json`.

### Kareem Abdul-Jabbar

| Model | Top 5 | Judgement |
|---|---|---|
| Season-centred encoder alpha=0.5 s2026 | Obi Toppin 2022, Kevin McHale 1987, Chris Bosh 2013, Rasheed Wallace 2001, Elton Brand 2006 | **partial** (1.5/5): Kevin McHale ~, Chris Bosh ~, Elton Brand ~ |
| Era encoder lambda=0.0 s2026 | Obi Toppin 2022, Chris Bosh 2013, Kevin McHale 1987, Rasheed Wallace 2001, Elton Brand 2006 | **partial** (1.5/5): Chris Bosh ~, Kevin McHale ~, Elton Brand ~ |
| B2 cosine | Rasheed Wallace 2001, Kevin McHale 1987, Al Horford 2014, Patrick Ewing 1990, Nenad Krstić 2009 | **partial** (1/5): Kevin McHale ~, Patrick Ewing ~ |

### Magic Johnson

| Model | Top 5 | Judgement |
|---|---|---|
| Season-centred encoder alpha=0.5 s2026 | Kevin Johnson 1992, Andre Miller 2001, Deron Williams 2009, Tyrese Haliburton 2023, Reggie Theus 1986 | **partial** (1.5/5): Andre Miller ~, Deron Williams ~, Tyrese Haliburton ~ |
| Era encoder lambda=0.0 s2026 | Kevin Johnson 1992, Andre Miller 2002, Deron Williams 2009, Reggie Theus 1986, John Stockton 1999 | **partial** (1.5/5): Andre Miller ~, Deron Williams ~, John Stockton ~ |
| B2 cosine | Kevin Johnson 1992, Andre Miller 2001, John Stockton 1994, Reggie Theus 1986, Deron Williams 2009 | **partial** (1.5/5): Andre Miller ~, John Stockton ~, Deron Williams ~ |

### Larry Bird

| Model | Top 5 | Judgement |
|---|---|---|
| Season-centred encoder alpha=0.5 s2026 | Stephen Curry 2023, Ray Allen 2001, Tyler Herro 2023, Clyde Drexler 1995, Antoine Walker 2001 | **partial** (1.5/5): Stephen Curry ~, Ray Allen ~, Antoine Walker ~ |
| Era encoder lambda=0.0 s2026 | Stephen Curry 2023, Ray Allen 2001, Tyler Herro 2023, Clyde Drexler 1995, Antoine Walker 2001 | **partial** (1.5/5): Stephen Curry ~, Ray Allen ~, Antoine Walker ~ |
| B2 cosine | Stephen Curry 2023, Ray Allen 2001, Khris Middleton 2020, Kevin Durant 2015, Rashard Lewis 2007 | **pass** (2/5): Stephen Curry ~, Ray Allen ~, Khris Middleton ~, Kevin Durant ~ |

### Isiah Thomas

| Model | Top 5 | Judgement |
|---|---|---|
| Season-centred encoder alpha=0.5 s2026 | Kelvin Ransey 1982, Larry Drew 1983, Robert Pack 1997, Monta Ellis 2012, Kenny Anderson 1994 | **partial** (0.5/5): Kenny Anderson ~ |
| Era encoder lambda=0.0 s2026 | Kelvin Ransey 1982, Larry Drew 1983, Monta Ellis 2012, Robert Pack 1997, Kenny Anderson 1994 | **partial** (0.5/5): Kenny Anderson ~ |
| B2 cosine | Brandon Jennings 2014, Greg Anthony 1996, Jrue Holiday 2013, Tim Hardaway 1996, Deron Williams 2014 | **partial** (1.5/5): Brandon Jennings ~, Tim Hardaway ✓ |

### Charles Barkley

| Model | Top 5 | Judgement |
|---|---|---|
| Season-centred encoder alpha=0.5 s2026 | Kevin Garnett 2006, Karl Malone 1997, Paul Millsap 2009, Shawn Kemp 1995, Domantas Sabonis 2022 | **pass** (2.5/5): Karl Malone ~, Paul Millsap ~, Shawn Kemp ✓, Domantas Sabonis ~ |
| Era encoder lambda=0.0 s2026 | Kevin Garnett 2006, Karl Malone 1997, Paul Millsap 2009, Buck Williams 1987, Domantas Sabonis 2022 | **pass** (2/5): Karl Malone ~, Paul Millsap ~, Buck Williams ~, Domantas Sabonis ~ |
| B2 cosine | Kenneth Faried 2012, Nenê 2007, Shawn Kemp 1995, Tyrone Hill 1994, Jalen Duren 2025 | **partial** (1.5/5): Kenneth Faried ~, Shawn Kemp ✓ |

### Michael Jordan

| Model | Top 5 | Judgement |
|---|---|---|
| Season-centred encoder alpha=0.5 s2026 | LeBron James 2012, Kobe Bryant 2015, Tracy McGrady 2005, Dominique Wilkins 1989, Grant Hill 1999 | **pass** (3/5): LeBron James ~, Kobe Bryant ✓, Tracy McGrady ~, Dominique Wilkins ~, Grant Hill ~ |
| Era encoder lambda=0.0 s2026 | Kobe Bryant 2003, LeBron James 2012, Tracy McGrady 2005, Dwyane Wade 2006, Grant Hill 1999 | **pass** (3/5): Kobe Bryant ✓, LeBron James ~, Tracy McGrady ~, Dwyane Wade ~, Grant Hill ~ |
| B2 cosine | Kobe Bryant 2000, George Gervin 1981, Tracy McGrady 2006, Kawhi Leonard 2026, Dwyane Wade 2012 | **pass** (3/5): Kobe Bryant ✓, George Gervin ~, Tracy McGrady ~, Kawhi Leonard ~, Dwyane Wade ~ |

### John Stockton

| Model | Top 5 | Judgement |
|---|---|---|
| Season-centred encoder alpha=0.5 s2026 | Chris Paul 2013, Maurice Cheeks 1982, Doc Rivers 1987, Andre Miller 2002, José Calderón 2007 | **pass** (2.5/5): Chris Paul ✓, Maurice Cheeks ~, Andre Miller ~, José Calderón ~ |
| Era encoder lambda=0.0 s2026 | Chris Paul 2013, Maurice Cheeks 1982, Andre Miller 2002, Brevin Knight 1998, José Calderón 2007 | **pass** (3/5): Chris Paul ✓, Maurice Cheeks ~, Andre Miller ~, Brevin Knight ~, José Calderón ~ |
| B2 cosine | Brevin Knight 1998, Terry Porter 1988, Paul Pressey 1989, José Calderón 2007, Allen Leavell 1980 | **partial** (1.5/5): Brevin Knight ~, Terry Porter ~, José Calderón ~ |

### Dennis Rodman

| Model | Top 5 | Judgement |
|---|---|---|
| Season-centred encoder alpha=0.5 s2026 | Larry Smith 1982, Jeff Foster 2006, Reggie Evans 2005, Tyson Chandler 2008, Andris Biedriņš 2008 | **pass** (2.5/5): Larry Smith ~, Jeff Foster ~, Reggie Evans ✓, Tyson Chandler ~ |
| Era encoder lambda=0.0 s2026 | Larry Smith 1982, Jeff Foster 2005, Reggie Evans 2011, Michael Cage 1990, Jamie Feick 1999 | **pass** (3/5): Larry Smith ~, Jeff Foster ~, Reggie Evans ✓, Michael Cage ~, Jamie Feick ~ |
| B2 cosine | Jeff Foster 2004, Charles Oakley 1990, Larry Micheaux 1985, Trevor Booker 2015, Nazr Mohammed 2008 | **partial** (1/5): Jeff Foster ~, Charles Oakley ~ |

### Shaquille O'Neal

| Model | Top 5 | Judgement |
|---|---|---|
| Season-centred encoder alpha=0.5 s2026 | Dwight Howard 2015, Tim Duncan 2004, Alonzo Mourning 1999, Steve Johnson 1983, Stanley Roberts 1992 | **pass** (2.5/5): Dwight Howard ✓, Tim Duncan ~, Alonzo Mourning ~, Stanley Roberts ~ |
| Era encoder lambda=0.0 s2026 | Tim Duncan 2004, Dwight Howard 2015, Alonzo Mourning 1997, Steve Johnson 1983, Chris Gatling 1995 | **pass** (2/5): Tim Duncan ~, Dwight Howard ✓, Alonzo Mourning ~ |
| B2 cosine | Steve Johnson 1983, Tim Duncan 2001, Dwight Howard 2015, Alonzo Mourning 1999, Chris Gatling 1995 | **pass** (2/5): Tim Duncan ~, Dwight Howard ✓, Alonzo Mourning ~ |

### Steve Nash

| Model | Top 5 | Judgement |
|---|---|---|
| Season-centred encoder alpha=0.5 s2026 | Jordan Farmar 2012, Kirk Hinrich 2004, Mark Price 1994, Steve Blake 2008, José Calderón 2009 | **partial** (1.5/5): Mark Price ✓, José Calderón ~ |
| Era encoder lambda=0.0 s2026 | Jordan Farmar 2012, Kirk Hinrich 2004, Steve Blake 2008, Anthony Goldwire 1997, Jameer Nelson 2009 | **fail** (0/5): no fair or partial comps |
| B2 cosine | Jordan Farmar 2012, Mark Price 1993, José Calderón 2009, Kenny Smith 1991, Jarrett Jack 2010 | **partial** (1.5/5): Mark Price ✓, José Calderón ~ |

### Kobe Bryant

| Model | Top 5 | Judgement |
|---|---|---|
| Season-centred encoder alpha=0.5 s2026 | Kawhi Leonard 2020, Bradley Beal 2019, Donovan Mitchell 2026, Bernard King 1991, Paul Pierce 2003 | **pass** (2.5/5): Kawhi Leonard ~, Bradley Beal ~, Donovan Mitchell ~, Bernard King ~, Paul Pierce ~ |
| Era encoder lambda=0.0 s2026 | Kawhi Leonard 2020, Bradley Beal 2019, Donovan Mitchell 2026, Michael Jordan 1990, Paul Pierce 2003 | **pass** (3/5): Kawhi Leonard ~, Bradley Beal ~, Donovan Mitchell ~, Michael Jordan ✓, Paul Pierce ~ |
| B2 cosine | Michael Jordan 1992, Kawhi Leonard 2020, Donovan Mitchell 2026, Russell Westbrook 2012, Bradley Beal 2020 | **pass** (2.5/5): Michael Jordan ✓, Kawhi Leonard ~, Donovan Mitchell ~, Bradley Beal ~ |

### LeBron James

| Model | Top 5 | Judgement |
|---|---|---|
| Season-centred encoder alpha=0.5 s2026 | Luka Dončić 2024, Dwyane Wade 2010, Grant Hill 1999, Michael Jordan 1989, Ja Morant 2022 | **pass** (2/5): Luka Dončić ~, Dwyane Wade ~, Grant Hill ~, Michael Jordan ~ |
| Era encoder lambda=0.0 s2026 | Grant Hill 1999, Luka Dončić 2024, Dwyane Wade 2010, Michael Jordan 1989, Ja Morant 2022 | **pass** (2/5): Grant Hill ~, Luka Dončić ~, Dwyane Wade ~, Michael Jordan ~ |
| B2 cosine | Dwyane Wade 2009, Luka Dončić 2021, Grant Hill 2000, Monta Ellis 2013, Michael Jordan 1989 | **pass** (2/5): Dwyane Wade ~, Luka Dončić ~, Grant Hill ~, Michael Jordan ~ |

### Stephen Curry

| Model | Top 5 | Judgement |
|---|---|---|
| Season-centred encoder alpha=0.5 s2026 | Mo Williams 2010, Ray Allen 2004, Mike James 2006, Jordan Farmar 2012, Jeff Hornacek 1993 | **partial** (1/5): Ray Allen ~, Jeff Hornacek ~ |
| Era encoder lambda=0.0 s2026 | Mo Williams 2010, Ray Allen 2004, Mike James 2006, Jordan Farmar 2012, Jeff Hornacek 1993 | **partial** (1/5): Ray Allen ~, Jeff Hornacek ~ |
| B2 cosine | Ray Allen 2004, Kyrie Irving 2012, Mark Price 1994, Damian Lillard 2021, Manu Ginóbili 2008 | **pass** (3/5): Ray Allen ~, Kyrie Irving ~, Mark Price ✓, Damian Lillard ✓ |

### Draymond Green

| Model | Top 5 | Judgement |
|---|---|---|
| Season-centred encoder alpha=0.5 s2026 | Rich Kelley 1981, Nate McMillan 1990, Earl Watson 2012, Cody Martin 2025, Scottie Pippen 2002 | **partial** (1/5): Scottie Pippen ✓ |
| Era encoder lambda=0.0 s2026 | Rich Kelley 1981, Scottie Pippen 2002, Cody Martin 2025, Earl Watson 2012, Chris Singleton 2013 | **partial** (1/5): Scottie Pippen ✓ |
| B2 cosine | Nemanja Bjelica 2022, Walter McCarty 1999, Earl Watson 2012, Anthony Carter 2009, Nate McMillan 1987 | **fail** (0/5): no fair or partial comps |

### Nikola Jokić

| Model | Top 5 | Judgement |
|---|---|---|
| Season-centred encoder alpha=0.5 s2026 | Kevin Garnett 2005, Arvydas Sabonis 1996, Greg Monroe 2012, Domantas Sabonis 2021, Karl Malone 1997 | **pass** (2/5): Arvydas Sabonis ✓, Greg Monroe ~, Domantas Sabonis ~ |
| Era encoder lambda=0.0 s2026 | Kevin Garnett 2005, Arvydas Sabonis 1996, Greg Monroe 2012, Domantas Sabonis 2021, Charles Barkley 1996 | **pass** (2/5): Arvydas Sabonis ✓, Greg Monroe ~, Domantas Sabonis ~ |
| B2 cosine | Alvan Adams 1981, Kevin Garnett 2005, LeBron James 2013, Domantas Sabonis 2021, Gorgui Dieng 2019 | **partial** (1.5/5): Alvan Adams ~, LeBron James ~, Domantas Sabonis ~ |

5 comp names still need a mark: `reports/phase4_unmarked_comps.json`.

## Sanity summary

Human judgements from `config/sanity_marks.json` (fair = 1, partial = 0.5, wrong = 0, summed over the top 5). Pass if the score is 2 or more, partial if above 0, fail if 0. Judged without looking at the stats; see `notes/sanity_judgements.md`.

| Model | Pass | Partial | Fail | Mean score (out of 5) |
|---|---|---|---|---|
| Season-centred encoder alpha=0.5 s2026 | 8 | 7 | 0 | 1.87 |
| Era encoder lambda=0.0 s2026 | 8 | 6 | 1 | 1.80 |
| B2 cosine | 6 | 8 | 1 | 1.70 |

## Findings

- **Season centring is chosen; the adversary failed.** Centring at alpha 0.5 brings the linear era probe from 0.323 to 0.227 (B2 0.190, chance 0.20) for almost no retrieval cost (non-adjacent hit@10 0.745 against the control's 0.746). No adversary setting reached the 0.25 target: its best was 0.292 at lambda 1.0, which already cost retrieval (0.728), and lambda 3.0 read 0.317. The encoder fools the head it trains against, but a fresh probe still finds the era, as the exploratory runs in the plan predicted.
- **The era is hidden from a linear reader, not removed.** A nonlinear probe on validation players still reads 0.319 for the chosen model (control 0.324). B2's raw z-scores read 0.430 on the same probe, so era information is present nonlinearly even in the hand-built features; within-season z-scores only hid it from a straight-line reader. Comps use cosine similarity, which is linear, so the linear probe is the relevant one for comps.
- **Comps don't cross eras more.** The cross-era share of top-10 comps barely moves (0.723 against 0.725), and in the era translation test Curry and Bird draw from 3 decades against 4 under the control (Magic stays at 5). Removing the shared season average doesn't by itself pull in players from other decades.
- **Sanity comps: first model with no fails.** 8 pass, 7 partial, 0 fail (mean 1.87) against the control's 8 / 6 / 1 (1.80) and B2's 6 / 8 / 1 (1.70). Nash moves from fail to partial (Mark Price returns, plus Calderon), and Barkley gains Shawn Kemp. Kobe loses Michael Jordan, which is why the Jordan and Kobe known pair drops from pass to partial. Five names (Haliburton, Tyson Chandler, Stanley Roberts, Bernard King, Karl Malone) were marked by Claude from researched consensus at Danny's request.
- **Everything else holds.** The control reproduces Phase 3 exactly (all three seeds to six decimals), position stays at 0.657, the stability check passes, and next-season error is unchanged (about 0.62, still worse than persistence's 0.610).
- **For Phase 5.** Era removal is met on the plan's linear measure but not in the comps themselves. Career profiles (centre, peak, spread) are the next lever; whether to also try a nonlinear era target is an open question for the Phase 5 plan.
