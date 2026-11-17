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
- PENDING: sanity comps marked and scored (see `reports/phase4_unmarked_comps.json`)

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
| Season-centred encoder alpha=0.5 s2026 | Obi Toppin 2022, Kevin McHale 1987, Chris Bosh 2013, Rasheed Wallace 2001, Elton Brand 2006 | |
| Era encoder lambda=0.0 s2026 | Obi Toppin 2022, Chris Bosh 2013, Kevin McHale 1987, Rasheed Wallace 2001, Elton Brand 2006 | |
| B2 cosine | Rasheed Wallace 2001, Kevin McHale 1987, Al Horford 2014, Patrick Ewing 1990, Nenad Krstić 2009 | |

### Magic Johnson

| Model | Top 5 | Judgement |
|---|---|---|
| Season-centred encoder alpha=0.5 s2026 | Kevin Johnson 1992, Andre Miller 2001, Deron Williams 2009, Tyrese Haliburton 2023, Reggie Theus 1986 | |
| Era encoder lambda=0.0 s2026 | Kevin Johnson 1992, Andre Miller 2002, Deron Williams 2009, Reggie Theus 1986, John Stockton 1999 | |
| B2 cosine | Kevin Johnson 1992, Andre Miller 2001, John Stockton 1994, Reggie Theus 1986, Deron Williams 2009 | |

### Larry Bird

| Model | Top 5 | Judgement |
|---|---|---|
| Season-centred encoder alpha=0.5 s2026 | Stephen Curry 2023, Ray Allen 2001, Tyler Herro 2023, Clyde Drexler 1995, Antoine Walker 2001 | |
| Era encoder lambda=0.0 s2026 | Stephen Curry 2023, Ray Allen 2001, Tyler Herro 2023, Clyde Drexler 1995, Antoine Walker 2001 | |
| B2 cosine | Stephen Curry 2023, Ray Allen 2001, Khris Middleton 2020, Kevin Durant 2015, Rashard Lewis 2007 | |

### Isiah Thomas

| Model | Top 5 | Judgement |
|---|---|---|
| Season-centred encoder alpha=0.5 s2026 | Kelvin Ransey 1982, Larry Drew 1983, Robert Pack 1997, Monta Ellis 2012, Kenny Anderson 1994 | |
| Era encoder lambda=0.0 s2026 | Kelvin Ransey 1982, Larry Drew 1983, Monta Ellis 2012, Robert Pack 1997, Kenny Anderson 1994 | |
| B2 cosine | Brandon Jennings 2014, Greg Anthony 1996, Jrue Holiday 2013, Tim Hardaway 1996, Deron Williams 2014 | |

### Charles Barkley

| Model | Top 5 | Judgement |
|---|---|---|
| Season-centred encoder alpha=0.5 s2026 | Kevin Garnett 2006, Karl Malone 1997, Paul Millsap 2009, Shawn Kemp 1995, Domantas Sabonis 2022 | |
| Era encoder lambda=0.0 s2026 | Kevin Garnett 2006, Karl Malone 1997, Paul Millsap 2009, Buck Williams 1987, Domantas Sabonis 2022 | |
| B2 cosine | Kenneth Faried 2012, Nenê 2007, Shawn Kemp 1995, Tyrone Hill 1994, Jalen Duren 2025 | |

### Michael Jordan

| Model | Top 5 | Judgement |
|---|---|---|
| Season-centred encoder alpha=0.5 s2026 | LeBron James 2012, Kobe Bryant 2015, Tracy McGrady 2005, Dominique Wilkins 1989, Grant Hill 1999 | |
| Era encoder lambda=0.0 s2026 | Kobe Bryant 2003, LeBron James 2012, Tracy McGrady 2005, Dwyane Wade 2006, Grant Hill 1999 | |
| B2 cosine | Kobe Bryant 2000, George Gervin 1981, Tracy McGrady 2006, Kawhi Leonard 2026, Dwyane Wade 2012 | |

### John Stockton

| Model | Top 5 | Judgement |
|---|---|---|
| Season-centred encoder alpha=0.5 s2026 | Chris Paul 2013, Maurice Cheeks 1982, Doc Rivers 1987, Andre Miller 2002, José Calderón 2007 | |
| Era encoder lambda=0.0 s2026 | Chris Paul 2013, Maurice Cheeks 1982, Andre Miller 2002, Brevin Knight 1998, José Calderón 2007 | |
| B2 cosine | Brevin Knight 1998, Terry Porter 1988, Paul Pressey 1989, José Calderón 2007, Allen Leavell 1980 | |

### Dennis Rodman

| Model | Top 5 | Judgement |
|---|---|---|
| Season-centred encoder alpha=0.5 s2026 | Larry Smith 1982, Jeff Foster 2006, Reggie Evans 2005, Tyson Chandler 2008, Andris Biedriņš 2008 | |
| Era encoder lambda=0.0 s2026 | Larry Smith 1982, Jeff Foster 2005, Reggie Evans 2011, Michael Cage 1990, Jamie Feick 1999 | |
| B2 cosine | Jeff Foster 2004, Charles Oakley 1990, Larry Micheaux 1985, Trevor Booker 2015, Nazr Mohammed 2008 | |

### Shaquille O'Neal

| Model | Top 5 | Judgement |
|---|---|---|
| Season-centred encoder alpha=0.5 s2026 | Dwight Howard 2015, Tim Duncan 2004, Alonzo Mourning 1999, Steve Johnson 1983, Stanley Roberts 1992 | |
| Era encoder lambda=0.0 s2026 | Tim Duncan 2004, Dwight Howard 2015, Alonzo Mourning 1997, Steve Johnson 1983, Chris Gatling 1995 | |
| B2 cosine | Steve Johnson 1983, Tim Duncan 2001, Dwight Howard 2015, Alonzo Mourning 1999, Chris Gatling 1995 | |

### Steve Nash

| Model | Top 5 | Judgement |
|---|---|---|
| Season-centred encoder alpha=0.5 s2026 | Jordan Farmar 2012, Kirk Hinrich 2004, Mark Price 1994, Steve Blake 2008, José Calderón 2009 | |
| Era encoder lambda=0.0 s2026 | Jordan Farmar 2012, Kirk Hinrich 2004, Steve Blake 2008, Anthony Goldwire 1997, Jameer Nelson 2009 | |
| B2 cosine | Jordan Farmar 2012, Mark Price 1993, José Calderón 2009, Kenny Smith 1991, Jarrett Jack 2010 | |

### Kobe Bryant

| Model | Top 5 | Judgement |
|---|---|---|
| Season-centred encoder alpha=0.5 s2026 | Kawhi Leonard 2020, Bradley Beal 2019, Donovan Mitchell 2026, Bernard King 1991, Paul Pierce 2003 | |
| Era encoder lambda=0.0 s2026 | Kawhi Leonard 2020, Bradley Beal 2019, Donovan Mitchell 2026, Michael Jordan 1990, Paul Pierce 2003 | |
| B2 cosine | Michael Jordan 1992, Kawhi Leonard 2020, Donovan Mitchell 2026, Russell Westbrook 2012, Bradley Beal 2020 | |

### LeBron James

| Model | Top 5 | Judgement |
|---|---|---|
| Season-centred encoder alpha=0.5 s2026 | Luka Dončić 2024, Dwyane Wade 2010, Grant Hill 1999, Michael Jordan 1989, Ja Morant 2022 | |
| Era encoder lambda=0.0 s2026 | Grant Hill 1999, Luka Dončić 2024, Dwyane Wade 2010, Michael Jordan 1989, Ja Morant 2022 | |
| B2 cosine | Dwyane Wade 2009, Luka Dončić 2021, Grant Hill 2000, Monta Ellis 2013, Michael Jordan 1989 | |

### Stephen Curry

| Model | Top 5 | Judgement |
|---|---|---|
| Season-centred encoder alpha=0.5 s2026 | Mo Williams 2010, Ray Allen 2004, Mike James 2006, Jordan Farmar 2012, Jeff Hornacek 1993 | |
| Era encoder lambda=0.0 s2026 | Mo Williams 2010, Ray Allen 2004, Mike James 2006, Jordan Farmar 2012, Jeff Hornacek 1993 | |
| B2 cosine | Ray Allen 2004, Kyrie Irving 2012, Mark Price 1994, Damian Lillard 2021, Manu Ginóbili 2008 | |

### Draymond Green

| Model | Top 5 | Judgement |
|---|---|---|
| Season-centred encoder alpha=0.5 s2026 | Rich Kelley 1981, Nate McMillan 1990, Earl Watson 2012, Cody Martin 2025, Scottie Pippen 2002 | |
| Era encoder lambda=0.0 s2026 | Rich Kelley 1981, Scottie Pippen 2002, Cody Martin 2025, Earl Watson 2012, Chris Singleton 2013 | |
| B2 cosine | Nemanja Bjelica 2022, Walter McCarty 1999, Earl Watson 2012, Anthony Carter 2009, Nate McMillan 1987 | |

### Nikola Jokić

| Model | Top 5 | Judgement |
|---|---|---|
| Season-centred encoder alpha=0.5 s2026 | Kevin Garnett 2005, Arvydas Sabonis 1996, Greg Monroe 2012, Domantas Sabonis 2021, Karl Malone 1997 | |
| Era encoder lambda=0.0 s2026 | Kevin Garnett 2005, Arvydas Sabonis 1996, Greg Monroe 2012, Domantas Sabonis 2021, Charles Barkley 1996 | |
| B2 cosine | Alvan Adams 1981, Kevin Garnett 2005, LeBron James 2013, Domantas Sabonis 2021, Gorgui Dieng 2019 | |

5 comp names still need a mark: `reports/phase4_unmarked_comps.json`.

