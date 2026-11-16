# Phase 2 baseline results

Validation split, qualified seasons. Rules: notes/phase2_eval_plan.md. Produced by `python src/evaluate.py`.

Queries: retrieval 2,189, non-adjacent 2,107, next-season 1,758. Era and position probes use train + validation, 5-fold grouped by player.

| Model | Hit@10 | MRR | Non-adjacent Hit@10 | Next-season RMSE | vs persistence | Era bal. acc. | Position bal. acc. |
|---|---|---|---|---|---|---|---|
| B0 random | 0.042 | 0.022 | 0.034 | 0.652 | +6.8% | n/a | n/a |
| B1 Euclidean | 0.798 | 0.576 | 0.678 | 0.610 | +0.0% | 0.190 | 0.661 |
| B2 cosine | 0.778 | 0.561 | 0.668 | 0.608 | -0.4% | 0.190 | 0.661 |
| B3 CARMELO-style | 0.762 | 0.543 | 0.644 | 0.614 | +0.7% | 0.190 | 0.661 |
| B3w CARMELO 3-season | 0.964 | 0.893 | 0.826 | 0.625 | +2.5% | 0.186 | 0.674 |
| B4 PCA | 0.737 | 0.480 | 0.608 | 0.614 | +0.6% | 0.188 | 0.642 |

Persistence RMSE (predict t+1 = t): 0.610. Negative 'vs persistence' = better than persistence.
Era chance = 0.200 (5 decades). Position chance = 0.200 (5 positions). B1, B2 and B3 share the same representation (the 15 z-scores), so their probe scores are identical; they differ only in how similarity is measured.

Caveat: B3w's retrieval scores are inflated. Its vector for season t blends seasons t, t-1 and t-2, so two seasons of the same player share raw data (even two years apart). Compare B3w on next-season error and the sanity comps, not on retrieval.

## Gate

- Beat B0 on retrieval: 5 of 5 (B1 Euclidean, B2 cosine, B3 CARMELO-style, B3w CARMELO 3-season, B4 PCA)
- Beat persistence on next-season error: B2 cosine

## Box-score correlation (top 2 PCA components, Bonferroni-corrected p over 6 tests)

Close to automatic for these baselines (built from the same stats); a real test from Phase 3.

| Model | PC | Stat | r | p (Bonferroni) |
|---|---|---|---|---|
| B1 Euclidean | 1 | rebound % (orb + drb) | +0.857 | 0 |
| B1 Euclidean | 1 | ast_percent | -0.576 | 0 |
| B1 Euclidean | 1 | x3p_ar | -0.532 | 0 |
| B1 Euclidean | 2 | rebound % (orb + drb) | +0.183 | 3.9e-94 |
| B1 Euclidean | 2 | ast_percent | -0.011 | 1 |
| B1 Euclidean | 2 | x3p_ar | -0.069 | 8.2e-14 |
| B2 cosine | 1 | rebound % (orb + drb) | +0.857 | 0 |
| B2 cosine | 1 | ast_percent | -0.576 | 0 |
| B2 cosine | 1 | x3p_ar | -0.532 | 0 |
| B2 cosine | 2 | rebound % (orb + drb) | +0.183 | 3.9e-94 |
| B2 cosine | 2 | ast_percent | -0.011 | 1 |
| B2 cosine | 2 | x3p_ar | -0.069 | 8.2e-14 |
| B3 CARMELO-style | 1 | rebound % (orb + drb) | +0.857 | 0 |
| B3 CARMELO-style | 1 | ast_percent | -0.576 | 0 |
| B3 CARMELO-style | 1 | x3p_ar | -0.532 | 0 |
| B3 CARMELO-style | 2 | rebound % (orb + drb) | +0.183 | 3.9e-94 |
| B3 CARMELO-style | 2 | ast_percent | -0.011 | 1 |
| B3 CARMELO-style | 2 | x3p_ar | -0.069 | 8.2e-14 |
| B3w CARMELO 3-season | 1 | rebound % (orb + drb) | +0.863 | 0 |
| B3w CARMELO 3-season | 1 | ast_percent | -0.588 | 0 |
| B3w CARMELO 3-season | 1 | x3p_ar | -0.534 | 0 |
| B3w CARMELO 3-season | 2 | rebound % (orb + drb) | +0.199 | 5e-111 |
| B3w CARMELO 3-season | 2 | ast_percent | -0.039 | 6e-05 |
| B3w CARMELO 3-season | 2 | x3p_ar | -0.085 | 8e-21 |
| B4 PCA | 1 | rebound % (orb + drb) | +0.857 | 0 |
| B4 PCA | 1 | ast_percent | -0.576 | 0 |
| B4 PCA | 1 | x3p_ar | -0.532 | 0 |
| B4 PCA | 2 | rebound % (orb + drb) | +0.184 | 4.6e-95 |
| B4 PCA | 2 | ast_percent | -0.011 | 1 |
| B4 PCA | 2 | x3p_ar | -0.068 | 1e-13 |

## Known-pair test (each in the other's top 5)

| Model | Michael Jordan / Kobe Bryant | Shaquille O'Neal / Dwight Howard | Steve Nash / Chris Paul |
|---|---|---|---|
| B0 random | fail | fail | fail |
| B1 Euclidean | partial | pass | fail |
| B2 cosine | pass | pass | fail |
| B3 CARMELO-style | partial | pass | fail |
| B3w CARMELO 3-season | partial | partial | fail |
| B4 PCA | fail | pass | fail |

## Sanity comps (top 5 comp players, best season match)

Judge each against its pass test in the feature note: pass, partial or fail, with a one-line reason. Hold-outs are excluded from the pool.

### Kareem Abdul-Jabbar

| Model | Top 5 | Judgement |
|---|---|---|
| B0 random | John Long 1987, Markieff Morris 2015, D.J. Augustin 2022, Jay Vincent 1984, Greg Ostertag 2006 | |
| B1 Euclidean | Brad Sellers 1987, Predrag Drobnjak 2002, Nenad Krstić 2009, Joe Barry Carroll 1982, Terry Tyler 1989 | |
| B2 cosine | Rasheed Wallace 2001, Kevin McHale 1987, Al Horford 2014, Patrick Ewing 1990, Nenad Krstić 2009 | |
| B3 CARMELO-style | Predrag Drobnjak 2002, Robert Parish 1984, Herb Williams 1987, Terrence Jones 2016, Brad Sellers 1987 | |
| B3w CARMELO 3-season | Roy Hinson 1988, Melvin Turpin 1987, Rasheed Wallace 2001, Mark Blount 2008, Chucky Brown 1991 | |
| B4 PCA | Pat Cummings 1984, Predrag Drobnjak 2002, Terry Mills 1992, Brad Sellers 1987, Nenad Krstić 2009 | |

### Magic Johnson

| Model | Top 5 | Judgement |
|---|---|---|
| B0 random | Jaren Jackson Jr. 2025, John Salmons 2013, Frank Brickowski 1989, Bob Hansen 1992, Shawne Williams 2008 | |
| B1 Euclidean | Kevin Johnson 1992, Andre Miller 2001, Reggie Theus 1986, Deron Williams 2009, Sam Cassell 2000 | |
| B2 cosine | Kevin Johnson 1992, Andre Miller 2001, John Stockton 1994, Reggie Theus 1986, Deron Williams 2009 | |
| B3 CARMELO-style | Kevin Johnson 1990, Andre Miller 2001, Deron Williams 2010, John Stockton 2002, James Harden 2023 | |
| B3w CARMELO 3-season | Kevin Johnson 1991, Deron Williams 2010, John Stockton 1999, Andre Miller 2002, Anfernee Hardaway 1996 | |
| B4 PCA | Kevin Johnson 1992, Andre Miller 2002, Deron Williams 2009, Reggie Theus 1986, Rod Strickland 1994 | |

### Larry Bird

| Model | Top 5 | Judgement |
|---|---|---|
| B0 random | Gerald Wilkins 1989, Bill Cartwright 1982, Anfernee Hardaway 2002, George Lynch 1995, Aaron Gordon 2021 | |
| B1 Euclidean | Stephen Curry 2023, Ray Allen 2001, Jayson Tatum 2021, Clyde Drexler 1995, Dominique Wilkins 1991 | |
| B2 cosine | Stephen Curry 2023, Ray Allen 2001, Khris Middleton 2020, Kevin Durant 2015, Rashard Lewis 2007 | |
| B3 CARMELO-style | Clyde Drexler 1990, Anfernee Hardaway 1997, Jamal Murray 2020, Desmond Bane 2024, Kawhi Leonard 2023 | |
| B3w CARMELO 3-season | Clyde Drexler 1995, Kyrie Irving 2023, Scottie Pippen 1997, Stephen Curry 2026, Ray Allen 2004 | |
| B4 PCA | Kawhi Leonard 2024, Glenn Robinson 2002, Rudy Gay 2011, Julius Erving 1987, Kobe Bryant 2000 | |

### Isiah Thomas

| Model | Top 5 | Judgement |
|---|---|---|
| B0 random | Luis Scola 2016, Russell Westbrook 2015, Timothé Luwawu-Cabarrot 2017, P.J. Tucker 2016, Robert Pack 1993 | |
| B1 Euclidean | Brandon Jennings 2014, Jrue Holiday 2013, Monta Ellis 2012, Eddie Johnson 1982, Greg Anthony 1996 | |
| B2 cosine | Brandon Jennings 2014, Greg Anthony 1996, Jrue Holiday 2013, Tim Hardaway 1996, Deron Williams 2014 | |
| B3 CARMELO-style | Eddie Johnson 1982, Jrue Holiday 2013, Derek Harper 1992, Tim Hardaway 1996, Greg Anthony 1996 | |
| B3w CARMELO 3-season | Jrue Holiday 2017, T.J. Ford 2009, D'Angelo Russell 2022, Tim Hardaway 1996, Dennis Schröder 2017 | |
| B4 PCA | Jrue Holiday 2013, Tim Hardaway 1996, Greg Anthony 1996, Stephon Marbury 1998, Larry Drew 1984 | |

### Charles Barkley

| Model | Top 5 | Judgement |
|---|---|---|
| B0 random | Vincent Askew 1992, Gerald Green 2019, LaPhonso Ellis 1993, Carl Landry 2008, Darryl Dawkins 1982 | |
| B1 Euclidean | Nenê 2007, Paul Millsap 2009, Clarence Weatherspoon 2000, Tiago Splitter 2015, Joakim Noah 2011 | |
| B2 cosine | Kenneth Faried 2012, Nenê 2007, Shawn Kemp 1995, Tyrone Hill 1994, Jalen Duren 2025 | |
| B3 CARMELO-style | Nenê 2007, Paul Millsap 2009, Steve Johnson 1985, Marc Gasol 2009, Clarence Weatherspoon 2000 | |
| B3w CARMELO 3-season | Nenê 2007, Bison Dele 1996, Chris Gatling 1993, Tiago Splitter 2015, Karl Malone 1995 | |
| B4 PCA | Nenê 2007, Tiago Splitter 2015, Karl Malone 1996, Julius Erving 1983, Clarence Weatherspoon 2000 | |

### Michael Jordan

| Model | Top 5 | Judgement |
|---|---|---|
| B0 random | Ricky Davis 2008, Christian Laettner 2000, Isaiah Stewart 2023, Nick Anderson 1998, Eddie Johnson 1990 | |
| B1 Euclidean | James Worthy 1992, Caris LeVert 2021, Kobe Bryant 2009, George Gervin 1981, Clyde Drexler 1988 | |
| B2 cosine | Kobe Bryant 2000, George Gervin 1981, Tracy McGrady 2006, Kawhi Leonard 2026, Dwyane Wade 2012 | |
| B3 CARMELO-style | Kobe Bryant 2004, Dwyane Wade 2013, Kawhi Leonard 2026, Carmelo Anthony 2007, James Worthy 1992 | |
| B3w CARMELO 3-season | Kobe Bryant 2004, Dwyane Wade 2013, George Gervin 1982, Tracy McGrady 2004, Shai Gilgeous-Alexander 2024 | |
| B4 PCA | James Worthy 1992, Dwyane Wade 2012, Clyde Drexler 1988, Tracy McGrady 2003, Dominique Wilkins 1989 | |

### John Stockton

| Model | Top 5 | Judgement |
|---|---|---|
| B0 random | Leandro Barbosa 2010, Dana Barros 1998, Olden Polynice 1988, Sundiata Gaines 2012, Elton Brand 2001 | |
| B1 Euclidean | José Calderón 2007, Brevin Knight 1998, Chris Paul 2022, Spud Webb 1987, Micheal Williams 1992 | |
| B2 cosine | Brevin Knight 1998, Terry Porter 1988, Paul Pressey 1989, José Calderón 2007, Allen Leavell 1980 | |
| B3 CARMELO-style | José Calderón 2007, Chris Paul 2022, Brevin Knight 1998, Magic Johnson 1984, Deron Williams 2008 | |
| B3w CARMELO 3-season | Brevin Knight 1998, Doc Rivers 1987, Magic Johnson 1986, Spud Webb 1988, Eric Snow 1998 | |
| B4 PCA | Brevin Knight 1998, Darrell Armstrong 1999, José Calderón 2007, Chris Paul 2022, Elliot Perry 1995 | |

### Dennis Rodman

| Model | Top 5 | Judgement |
|---|---|---|
| B0 random | Larry Bird 1984, Nikoloz Tskitishvili 2003, Jahmai Mashack 2026, DeShawn Stevenson 2009, Steve Kerr 2001 | |
| B1 Euclidean | Nazr Mohammed 2008, Jeff Foster 2004, Kevin Willis 1988, Major Jones 1982, Cliff Levingston 1985 | |
| B2 cosine | Jeff Foster 2004, Charles Oakley 1990, Larry Micheaux 1985, Trevor Booker 2015, Nazr Mohammed 2008 | |
| B3 CARMELO-style | Jeff Foster 2004, Nazr Mohammed 2008, Tim Perry 1990, Žan Tabak 1996, Kevin Willis 1988 | |
| B3w CARMELO 3-season | Jeff Foster 2006, Nazr Mohammed 2004, Larry Smith 1983, Žan Tabak 1996, Michael Cage 1992 | |
| B4 PCA | Nazr Mohammed 2004, Keith Closs 2000, Andris Biedriņš 2007, Dale Davis 2001, Luke Kornet 2025 | |

### Shaquille O'Neal

| Model | Top 5 | Judgement |
|---|---|---|
| B0 random | Robin Lopez 2020, P.J. Tucker 2018, Sharone Wright 1997, Andre Miller 2014, Dana Barros 1995 | |
| B1 Euclidean | Steve Johnson 1983, Dwight Howard 2015, Chris Gatling 1995, Tim Duncan 2004, Alonzo Mourning 1999 | |
| B2 cosine | Steve Johnson 1983, Tim Duncan 2001, Dwight Howard 2015, Alonzo Mourning 1999, Chris Gatling 1995 | |
| B3 CARMELO-style | Alonzo Mourning 1999, Tim Duncan 2004, Dwight Howard 2015, Steve Johnson 1986, Chris Gatling 1995 | |
| B3w CARMELO 3-season | Alonzo Mourning 1999, Steve Johnson 1984, Dwight Howard 2015, Otis Thorpe 1985, Eddy Curry 2003 | |
| B4 PCA | Chris Gatling 1995, Steve Johnson 1983, Dwight Howard 2015, Alonzo Mourning 1999, Otis Thorpe 1985 | |

### Steve Nash

| Model | Top 5 | Judgement |
|---|---|---|
| B0 random | Norm Nixon 1989, Larry Bird 1983, Gary Grant 1993, Cliff Levingston 1990, Bogdan Bogdanović 2021 | |
| B1 Euclidean | Hubert Davis 1994, Dana Barros 2000, Patty Mills 2017, Bogdan Bogdanović 2021, Seth Curry 2017 | |
| B2 cosine | Jordan Farmar 2012, Mark Price 1993, José Calderón 2009, Kenny Smith 1991, Jarrett Jack 2010 | |
| B3 CARMELO-style | Hubert Davis 1994, Patty Mills 2017, Dana Barros 2000, Bogdan Bogdanović 2021, Matthew Dellavedova 2017 | |
| B3w CARMELO 3-season | Steve Blake 2006, Anthony Goldwire 1998, Howard Eisley 2001, Erick Strickland 2004, Mike Iuzzolino 1993 | |
| B4 PCA | Hubert Davis 1994, Seth Curry 2017, Anthony Goldwire 1996, Patty Mills 2017, Dana Barros 2000 | |

### Kobe Bryant

| Model | Top 5 | Judgement |
|---|---|---|
| B0 random | Rasho Nesterović 2004, Marvin Webster 1981, Mike Miller 2010, Kiki Vandeweghe 1985, Jimmy Butler 2013 | |
| B1 Euclidean | Bradley Beal 2019, Kawhi Leonard 2020, Donovan Mitchell 2026, Russell Westbrook 2012, David Thompson 1982 | |
| B2 cosine | Michael Jordan 1992, Kawhi Leonard 2020, Donovan Mitchell 2026, Russell Westbrook 2012, Bradley Beal 2020 | |
| B3 CARMELO-style | Bradley Beal 2019, Richard Jefferson 2008, Donovan Mitchell 2026, Michael Redd 2008, Kawhi Leonard 2020 | |
| B3w CARMELO 3-season | Donovan Mitchell 2026, Bradley Beal 2021, Danny Granger 2011, Gilbert Arenas 2007, Kawhi Leonard 2021 | |
| B4 PCA | Glenn Robinson 2002, Norman Powell 2026, Khris Middleton 2017, Bradley Beal 2019, Gordon Hayward 2016 | |

### LeBron James

| Model | Top 5 | Judgement |
|---|---|---|
| B0 random | Kevin Durant 2017, Malcolm Brogdon 2019, Trent Tucker 1993, Chris Paul 2020, Marquis Daniels 2008 | |
| B1 Euclidean | Monta Ellis 2012, Caris LeVert 2021, Tracy McGrady 2005, Dwyane Wade 2017, Luka Dončić 2021 | |
| B2 cosine | Dwyane Wade 2009, Luka Dončić 2021, Grant Hill 2000, Monta Ellis 2013, Michael Jordan 1989 | |
| B3 CARMELO-style | Monta Ellis 2012, Caris LeVert 2021, Dejounte Murray 2024, Tracy McGrady 2005, Ricky Davis 2003 | |
| B3w CARMELO 3-season | Monta Ellis 2013, Dwyane Wade 2017, Caris LeVert 2021, De'Aaron Fox 2024, Toni Kukoč 2000 | |
| B4 PCA | Luka Dončić 2024, Monta Ellis 2012, Dejounte Murray 2024, Toni Kukoč 1999, Caris LeVert 2021 | |

### Stephen Curry

| Model | Top 5 | Judgement |
|---|---|---|
| B0 random | Elden Campbell 1995, Jerryd Bayless 2018, Purvis Short 1988, Kevin Ollie 2006, Otis Smith 1990 | |
| B1 Euclidean | Kyrie Irving 2018, Ray Allen 2004, Damian Lillard 2019, Jameer Nelson 2009, Mark Price 1994 | |
| B2 cosine | Ray Allen 2004, Kyrie Irving 2012, Mark Price 1994, Damian Lillard 2021, Manu Ginóbili 2008 | |
| B3 CARMELO-style | Damian Lillard 2019, Kyrie Irving 2018, Jameer Nelson 2009, Manu Ginóbili 2008, Ray Allen 2004 | |
| B3w CARMELO 3-season | Damian Lillard 2020, Kyrie Irving 2018, Jeff Hornacek 1993, Mo Williams 2010, Kyle Lowry 2017 | |
| B4 PCA | Kyrie Irving 2018, Jamal Murray 2026, Damian Lillard 2016, Darius Garland 2025, Ray Allen 2004 | |

### Draymond Green

| Model | Top 5 | Judgement |
|---|---|---|
| B0 random | Mason Plumlee 2020, Gilbert Arenas 2004, Antonio Harvey 1995, DerMarr Johnson 2001, Aaron Nesmith 2024 | |
| B1 Euclidean | Robert Horry 1997, Paul Millsap 2021, Carey Scurry 1986, Taylor Hendricks 2026, Onyeka Okongwu 2026 | |
| B2 cosine | Nemanja Bjelica 2022, Walter McCarty 1999, Earl Watson 2012, Anthony Carter 2009, Nate McMillan 1987 | |
| B3 CARMELO-style | Anthony Carter 2005, Stanley Johnson 2021, Coby Dietrick 1981, Robert Horry 1997, Junior Harrington 2007 | |
| B3w CARMELO 3-season | Coby Dietrick 1981, Chris Singleton 2013, Deni Avdija 2023, Paul Pressey 1985, Al-Farouq Aminu 2016 | |
| B4 PCA | Kevin Garnett 2016, George Lynch 1999, Robert Horry 1997, Paul Millsap 2021, Carey Scurry 1986 | |

### Nikola Jokić

| Model | Top 5 | Judgement |
|---|---|---|
| B0 random | Kurt Nimphius 1983, Michael Doleac 2004, Tree Rollins 1986, Mike Iuzzolino 1992, Andre Miller 2005 | |
| B1 Euclidean | Gorgui Dieng 2019, Alvan Adams 1981, Frank Brickowski 1991, Greg Monroe 2012, Christian Laettner 2001 | |
| B2 cosine | Alvan Adams 1981, Kevin Garnett 2005, LeBron James 2013, Domantas Sabonis 2021, Gorgui Dieng 2019 | |
| B3 CARMELO-style | Frank Brickowski 1991, Christian Laettner 2001, Alvan Adams 1981, Gorgui Dieng 2019, Arvydas Sabonis 2003 | |
| B3w CARMELO 3-season | Alvan Adams 1981, Arvydas Sabonis 2003, Frank Brickowski 1991, Greg Monroe 2012, Kelly Olynyk 2022 | |
| B4 PCA | Frank Brickowski 1991, Gorgui Dieng 2019, Christian Laettner 2001, Vlade Divac 1992, Paul Millsap 2011 | |

