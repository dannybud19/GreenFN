# Phase 5 results: career profiles

Validation split, seed 2026 to 2028 base models (Phase 4: season centring alpha 0.5). Rules: `notes/phase5_plan.md` and earlier plans. Validation also chose the method, so these numbers are optimistic; test gives the unbiased numbers once, at the end of v1.

**Chosen: Career a=0.25 b=0.75 lambda=0.0** (highest mean split-half hit@10).

## Results (validation, mean ± spread over 3 seeds)

| Method | Split-half hit@10 | Split-half MRR | Cross-era share of comps | Mean spread gap of comps |
|---|---|---|---|---|
| Chosen: Career a=0.25 b=0.75 lambda=0.0 | 0.981 ± 0.007 | 0.900 ± 0.008 | 0.748 | 0.0286 |
| Centre only (alpha 1, lambda 0) | 0.974 ± 0.004 | 0.909 ± 0.006 | 0.738 | 0.0287 |
| Best season match (Phases 2 to 4 reference) | 0.916 ± 0.009 | 0.695 ± 0.012 | 0.720 | 0.0300 |

Split-half: each validation player with 4+ qualified seasons is split into two pseudo-players (alternating seasons); a hit means one half finds the other in its top 10.

## Career shape (seed 2026; spread percentile among pool players with 4+ seasons, lower = more consistent)

| Player | Seasons in data | Spread | Percentile |
|---|---|---|---|
| John Stockton | 19 | 0.0173 | 0% |
| LeBron James | 23 | 0.0379 | 13% |
| Kareem Abdul-Jabbar | 10 | 0.0658 | 48% |
| Dennis Rodman | 13 | 0.0516 | 29% |
| Stephen Curry | 16 | 0.0524 | 30% |

## Lambda effect (consistency slider; chosen weights, validation players, seed 2026)

| lambda | Mean spread gap of top 10 | Overlap with lambda 0 top 10 | Stockton's top 5 (spread) |
|---|---|---|---|
| 0.0 | 0.0284 | 100% | Chris Paul (0.039), Kevin Porter (0.005), Micheal Williams (0.022), Maurice Cheeks (0.029), Kevin Johnson (0.031) |
| 0.25 | 0.0144 | 65% | Micheal Williams (0.022), Kevin Porter (0.005), Maurice Cheeks (0.029), Chris Paul (0.039), Brevin Knight (0.028) |
| 0.5 | 0.0098 | 49% | Micheal Williams (0.022), Kevin Porter (0.005), Keith Jennings (0.014), Maurice Cheeks (0.029), Raül López (0.018) |
| 1.0 | 0.0063 | 35% | Micheal Williams (0.022), Raül López (0.018), Isaiah Collier (0.017), Keith Jennings (0.014), Othell Wilson (0.018) |

## Gate (phase5_plan.md section 7)

- PASS: Chosen method beats the best-season reference on split-half hit@10
- PASS: Lambda effect is explainable: mean spread gap of comps falls as lambda rises
- PASS: Career shape: Stockton's spread is below the median (low spread)
- PENDING: sanity comps marked and scored, no sanity player failing (see `reports/phase5_unmarked_comps.json`)

If a line fails, it is recorded as a finding; the metric is not changed.

## Search (validation, mean ± spread over 3 seeds)

| Method | Split-half hit@10 | Split-half MRR | Cross-era share | Spread gap |
|---|---|---|---|---|
| Career a=0.25 b=0.75 lambda=0.0 | 0.981 ± 0.007 | 0.900 ± 0.008 | 0.748 | 0.0286 |
| Career a=0.5 b=0.5 lambda=0.0 | 0.980 ± 0.005 | 0.910 ± 0.007 | 0.743 | 0.0285 |
| Career a=0.75 b=0.25 lambda=0.0 | 0.978 ± 0.004 | 0.916 ± 0.006 | 0.740 | 0.0285 |
| Career a=0.0 b=1.0 lambda=0.0 | 0.978 ± 0.006 | 0.879 ± 0.007 | 0.749 | 0.0289 |
| Wasserstein (Sinkhorn, eps 0.05) | 0.975 ± 0.007 | 0.896 ± 0.006 | 0.734 | 0.0271 |
| Career a=1.0 b=0.0 lambda=0.0 | 0.974 ± 0.004 | 0.909 ± 0.006 | 0.738 | 0.0287 |
| Best season match | 0.916 ± 0.009 | 0.695 ± 0.012 | 0.720 | 0.0300 |
| Career a=0.75 b=0.25 lambda=0.25 | 0.900 ± 0.014 | 0.769 ± 0.023 | 0.747 | 0.0143 |
| Career a=0.5 b=0.5 lambda=0.25 | 0.898 ± 0.014 | 0.768 ± 0.023 | 0.748 | 0.0145 |
| Career a=0.0 b=1.0 lambda=0.25 | 0.897 ± 0.007 | 0.744 ± 0.013 | 0.754 | 0.0151 |
| Career a=0.25 b=0.75 lambda=0.25 | 0.896 ± 0.013 | 0.759 ± 0.014 | 0.753 | 0.0148 |
| Career a=1.0 b=0.0 lambda=0.25 | 0.895 ± 0.016 | 0.763 ± 0.024 | 0.743 | 0.0143 |
| Career a=0.5 b=0.5 lambda=0.5 | 0.789 ± 0.023 | 0.620 ± 0.029 | 0.757 | 0.0097 |
| Career a=0.25 b=0.75 lambda=0.5 | 0.787 ± 0.022 | 0.611 ± 0.030 | 0.756 | 0.0099 |
| Career a=0.75 b=0.25 lambda=0.5 | 0.787 ± 0.022 | 0.617 ± 0.033 | 0.755 | 0.0096 |
| Career a=1.0 b=0.0 lambda=0.5 | 0.786 ± 0.018 | 0.613 ± 0.032 | 0.755 | 0.0095 |
| Career a=0.0 b=1.0 lambda=0.5 | 0.780 ± 0.018 | 0.602 ± 0.029 | 0.761 | 0.0101 |
| Career a=0.75 b=0.25 lambda=1.0 | 0.631 ± 0.033 | 0.435 ± 0.037 | 0.768 | 0.0064 |
| Career a=0.5 b=0.5 lambda=1.0 | 0.631 ± 0.035 | 0.436 ± 0.037 | 0.767 | 0.0064 |
| Career a=0.25 b=0.75 lambda=1.0 | 0.629 ± 0.032 | 0.435 ± 0.036 | 0.766 | 0.0065 |
| Career a=1.0 b=0.0 lambda=1.0 | 0.628 ± 0.030 | 0.429 ± 0.034 | 0.768 | 0.0064 |
| Career a=0.0 b=1.0 lambda=1.0 | 0.626 ± 0.035 | 0.432 ± 0.032 | 0.768 | 0.0067 |

## Known-pair test (player level, each in the other's top 5)

| Model | Pair | Result |
|---|---|---|
| Career a=0.25 b=0.75 lambda=0.0 | Michael Jordan / Kobe Bryant | pass |
| Career a=0.25 b=0.75 lambda=0.0 | Shaquille O'Neal / Dwight Howard | pass |
| Career a=0.25 b=0.75 lambda=0.0 | Steve Nash / Chris Paul | fail |
| Best season match | Michael Jordan / Kobe Bryant | partial |
| Best season match | Shaquille O'Neal / Dwight Howard | pass |
| Best season match | Steve Nash / Chris Paul | fail |

## Sanity comps (top 5 comp players, whole careers; seed 2026)

Judgement column is filled by `src/score_sanity.py --report reports/phase5_career.md` once every name is marked in `config/sanity_marks.json`. Seasons in brackets are each comp's career span.

### Kareem Abdul-Jabbar

| Model | Top 5 | Judgement |
|---|---|---|
| Career a=0.25 b=0.75 lambda=0.0 | Kevin McHale 1981, Elton Brand 2000, Larry Nance 1982, Pau Gasol 2002, Patrick Ewing 1986 | |
| Best season match | Obi Toppin 2021, Kevin McHale 1981, Chris Bosh 2004, Rasheed Wallace 1996, Elton Brand 2000 | |

### Magic Johnson

| Model | Top 5 | Judgement |
|---|---|---|
| Career a=0.25 b=0.75 lambda=0.0 | Tyrese Haliburton 2021, Kevin Johnson 1988, John Stockton 1985, Deron Williams 2006, Steve Nash 1997 | |
| Best season match | Kevin Johnson 1988, Andre Miller 2000, Deron Williams 2006, Tyrese Haliburton 2021, Reggie Theus 1980 | |

### Larry Bird

| Model | Top 5 | Judgement |
|---|---|---|
| Career a=0.25 b=0.75 lambda=0.0 | Stephen Curry 2010, Ray Allen 1997, Kevin Durant 2008, Kyrie Irving 2012, Kemba Walker 2012 | |
| Best season match | Stephen Curry 2010, Ray Allen 1997, Tyler Herro 2020, Clyde Drexler 1984, Antoine Walker 1997 | |

### Isiah Thomas

| Model | Top 5 | Judgement |
|---|---|---|
| Career a=0.25 b=0.75 lambda=0.0 | Tim Hardaway 1990, Kenny Anderson 1992, Baron Davis 2000, Ray Williams 1980, Stephon Marbury 1997 | |
| Best season match | Kelvin Ransey 1981, Larry Drew 1981, Robert Pack 1992, Monta Ellis 2006, Kenny Anderson 1992 | |

### Charles Barkley

| Model | Top 5 | Judgement |
|---|---|---|
| Career a=0.25 b=0.75 lambda=0.0 | Karl Malone 1986, Nikola Jokić 2016, Jeff Ruland 1982, Shawn Kemp 1990, Kevin Garnett 1996 | |
| Best season match | Kevin Garnett 1996, Karl Malone 1986, Paul Millsap 2007, Shawn Kemp 1990, Domantas Sabonis 2017 | |

### Michael Jordan

| Model | Top 5 | Judgement |
|---|---|---|
| Career a=0.25 b=0.75 lambda=0.0 | Kobe Bryant 1997, Dwyane Wade 2004, Shai Gilgeous-Alexander 2019, Donovan Mitchell 2018, Kawhi Leonard 2012 | |
| Best season match | LeBron James 2004, Kobe Bryant 1997, Tracy McGrady 1998, Dominique Wilkins 1983, Grant Hill 1995 | |

### John Stockton

| Model | Top 5 | Judgement |
|---|---|---|
| Career a=0.25 b=0.75 lambda=0.0 | Chris Paul 2006, Kevin Porter 1980, Micheal Williams 1991, Maurice Cheeks 1980, Kevin Johnson 1988 | |
| Best season match | Chris Paul 2006, Maurice Cheeks 1980, Doc Rivers 1984, Andre Miller 2000, José Calderón 2006 | |

### Dennis Rodman

| Model | Top 5 | Judgement |
|---|---|---|
| Career a=0.25 b=0.75 lambda=0.0 | Jeff Foster 2001, Larry Smith 1981, Michael Smith 1995, Andris Biedriņš 2006, Joey Dorsey 2011 | |
| Best season match | Larry Smith 1981, Jeff Foster 2001, Reggie Evans 2003, Tyson Chandler 2002, Andris Biedriņš 2006 | |

### Shaquille O'Neal

| Model | Top 5 | Judgement |
|---|---|---|
| Career a=0.25 b=0.75 lambda=0.0 | Tim Duncan 1998, Dwight Howard 2005, Alonzo Mourning 1993, Amar'e Stoudemire 2003, Zion Williamson 2020 | |
| Best season match | Dwight Howard 2005, Tim Duncan 1998, Alonzo Mourning 1993, Steve Johnson 1982, Stanley Roberts 1992 | |

### Steve Nash

| Model | Top 5 | Judgement |
|---|---|---|
| Career a=0.25 b=0.75 lambda=0.0 | José Calderón 2006, Mark Price 1987, Kenny Smith 1988, Tyrese Haliburton 2021, Scott Skiles 1988 | |
| Best season match | Jordan Farmar 2007, Kirk Hinrich 2004, Mark Price 1987, Steve Blake 2004, José Calderón 2006 | |

### Kobe Bryant

| Model | Top 5 | Judgement |
|---|---|---|
| Career a=0.25 b=0.75 lambda=0.0 | Donovan Mitchell 2018, Michael Jordan 1985, Anthony Edwards 2021, Paul Pierce 1999, Bradley Beal 2013 | |
| Best season match | Kawhi Leonard 2012, Bradley Beal 2013, Donovan Mitchell 2018, Bernard King 1981, Paul Pierce 1999 | |

### LeBron James

| Model | Top 5 | Judgement |
|---|---|---|
| Career a=0.25 b=0.75 lambda=0.0 | Dwyane Wade 2004, Luka Dončić 2019, Grant Hill 1995, Michael Jordan 1985, Shai Gilgeous-Alexander 2019 | |
| Best season match | Luka Dončić 2019, Dwyane Wade 2004, Grant Hill 1995, Michael Jordan 1985, Ja Morant 2020 | |

### Stephen Curry

| Model | Top 5 | Judgement |
|---|---|---|
| Career a=0.25 b=0.75 lambda=0.0 | Mark Price 1987, Manu Ginóbili 2003, Reggie Theus 1980, Sam Cassell 1994, Kyrie Irving 2012 | |
| Best season match | Mo Williams 2004, Ray Allen 1997, Mike James 2003, Jordan Farmar 2007, Jeff Hornacek 1987 | |

### Draymond Green

| Model | Top 5 | Judgement |
|---|---|---|
| Career a=0.25 b=0.75 lambda=0.0 | Carlos Terry 1981, Robert Horry 1993, Vlade Divac 1990, Kyle Anderson 2016, Juan Toscano-Anderson 2021 | |
| Best season match | Rich Kelley 1980, Nate McMillan 1987, Earl Watson 2002, Cody Martin 2020, Scottie Pippen 1988 | |

### Nikola Jokić

| Model | Top 5 | Judgement |
|---|---|---|
| Career a=0.25 b=0.75 lambda=0.0 | Kevin Garnett 1996, Charles Barkley 1985, Karl Malone 1986, DeMarcus Cousins 2011, Joel Embiid 2017 | |
| Best season match | Kevin Garnett 1996, Arvydas Sabonis 1996, Greg Monroe 2011, Domantas Sabonis 2017, Karl Malone 1986 | |

27 comp names still need a mark: `reports/phase5_unmarked_comps.json`.

