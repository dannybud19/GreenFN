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
- PENDING: sanity comps marked and scored (see `reports/phase3_unmarked_comps.json`)

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
| Encoder d=32 t=0.05 pre s2026 | Obi Toppin 2022, Chris Bosh 2013, Kevin McHale 1987, Rasheed Wallace 2001, Elton Brand 2006 | |
| B2 cosine | Rasheed Wallace 2001, Kevin McHale 1987, Al Horford 2014, Patrick Ewing 1990, Nenad Krstić 2009 | |

### Magic Johnson

| Model | Top 5 | Judgement |
|---|---|---|
| Encoder d=32 t=0.05 pre s2026 | Kevin Johnson 1992, Andre Miller 2002, Deron Williams 2009, Reggie Theus 1986, John Stockton 1999 | |
| B2 cosine | Kevin Johnson 1992, Andre Miller 2001, John Stockton 1994, Reggie Theus 1986, Deron Williams 2009 | |

### Larry Bird

| Model | Top 5 | Judgement |
|---|---|---|
| Encoder d=32 t=0.05 pre s2026 | Stephen Curry 2023, Ray Allen 2001, Tyler Herro 2023, Clyde Drexler 1995, Antoine Walker 2001 | |
| B2 cosine | Stephen Curry 2023, Ray Allen 2001, Khris Middleton 2020, Kevin Durant 2015, Rashard Lewis 2007 | |

### Isiah Thomas

| Model | Top 5 | Judgement |
|---|---|---|
| Encoder d=32 t=0.05 pre s2026 | Kelvin Ransey 1982, Larry Drew 1983, Monta Ellis 2012, Robert Pack 1997, Kenny Anderson 1994 | |
| B2 cosine | Brandon Jennings 2014, Greg Anthony 1996, Jrue Holiday 2013, Tim Hardaway 1996, Deron Williams 2014 | |

### Charles Barkley

| Model | Top 5 | Judgement |
|---|---|---|
| Encoder d=32 t=0.05 pre s2026 | Kevin Garnett 2006, Karl Malone 1997, Paul Millsap 2009, Buck Williams 1987, Domantas Sabonis 2022 | |
| B2 cosine | Kenneth Faried 2012, Nenê 2007, Shawn Kemp 1995, Tyrone Hill 1994, Jalen Duren 2025 | |

### Michael Jordan

| Model | Top 5 | Judgement |
|---|---|---|
| Encoder d=32 t=0.05 pre s2026 | Kobe Bryant 2003, LeBron James 2012, Tracy McGrady 2005, Dwyane Wade 2006, Grant Hill 1999 | |
| B2 cosine | Kobe Bryant 2000, George Gervin 1981, Tracy McGrady 2006, Kawhi Leonard 2026, Dwyane Wade 2012 | |

### John Stockton

| Model | Top 5 | Judgement |
|---|---|---|
| Encoder d=32 t=0.05 pre s2026 | Chris Paul 2013, Maurice Cheeks 1982, Andre Miller 2002, Brevin Knight 1998, José Calderón 2007 | |
| B2 cosine | Brevin Knight 1998, Terry Porter 1988, Paul Pressey 1989, José Calderón 2007, Allen Leavell 1980 | |

### Dennis Rodman

| Model | Top 5 | Judgement |
|---|---|---|
| Encoder d=32 t=0.05 pre s2026 | Larry Smith 1982, Jeff Foster 2005, Reggie Evans 2011, Michael Cage 1990, Jamie Feick 1999 | |
| B2 cosine | Jeff Foster 2004, Charles Oakley 1990, Larry Micheaux 1985, Trevor Booker 2015, Nazr Mohammed 2008 | |

### Shaquille O'Neal

| Model | Top 5 | Judgement |
|---|---|---|
| Encoder d=32 t=0.05 pre s2026 | Tim Duncan 2004, Dwight Howard 2015, Alonzo Mourning 1997, Steve Johnson 1983, Chris Gatling 1995 | |
| B2 cosine | Steve Johnson 1983, Tim Duncan 2001, Dwight Howard 2015, Alonzo Mourning 1999, Chris Gatling 1995 | |

### Steve Nash

| Model | Top 5 | Judgement |
|---|---|---|
| Encoder d=32 t=0.05 pre s2026 | Jordan Farmar 2012, Kirk Hinrich 2004, Steve Blake 2008, Anthony Goldwire 1997, Jameer Nelson 2009 | |
| B2 cosine | Jordan Farmar 2012, Mark Price 1993, José Calderón 2009, Kenny Smith 1991, Jarrett Jack 2010 | |

### Kobe Bryant

| Model | Top 5 | Judgement |
|---|---|---|
| Encoder d=32 t=0.05 pre s2026 | Kawhi Leonard 2020, Bradley Beal 2019, Donovan Mitchell 2026, Michael Jordan 1990, Paul Pierce 2003 | |
| B2 cosine | Michael Jordan 1992, Kawhi Leonard 2020, Donovan Mitchell 2026, Russell Westbrook 2012, Bradley Beal 2020 | |

### LeBron James

| Model | Top 5 | Judgement |
|---|---|---|
| Encoder d=32 t=0.05 pre s2026 | Grant Hill 1999, Luka Dončić 2024, Dwyane Wade 2010, Michael Jordan 1989, Ja Morant 2022 | |
| B2 cosine | Dwyane Wade 2009, Luka Dončić 2021, Grant Hill 2000, Monta Ellis 2013, Michael Jordan 1989 | |

### Stephen Curry

| Model | Top 5 | Judgement |
|---|---|---|
| Encoder d=32 t=0.05 pre s2026 | Mo Williams 2010, Ray Allen 2004, Mike James 2006, Jordan Farmar 2012, Jeff Hornacek 1993 | |
| B2 cosine | Ray Allen 2004, Kyrie Irving 2012, Mark Price 1994, Damian Lillard 2021, Manu Ginóbili 2008 | |

### Draymond Green

| Model | Top 5 | Judgement |
|---|---|---|
| Encoder d=32 t=0.05 pre s2026 | Rich Kelley 1981, Scottie Pippen 2002, Cody Martin 2025, Earl Watson 2012, Chris Singleton 2013 | |
| B2 cosine | Nemanja Bjelica 2022, Walter McCarty 1999, Earl Watson 2012, Anthony Carter 2009, Nate McMillan 1987 | |

### Nikola Jokić

| Model | Top 5 | Judgement |
|---|---|---|
| Encoder d=32 t=0.05 pre s2026 | Kevin Garnett 2005, Arvydas Sabonis 1996, Greg Monroe 2012, Domantas Sabonis 2021, Charles Barkley 1996 | |
| B2 cosine | Alvan Adams 1981, Kevin Garnett 2005, LeBron James 2013, Domantas Sabonis 2021, Gorgui Dieng 2019 | |

27 encoder comp names still need a mark: `reports/phase3_unmarked_comps.json`.

