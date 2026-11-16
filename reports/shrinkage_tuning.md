# Shrinkage prior tuning

Correlation between a player's shrunk percentage in season t and his raw percentage in season t+1.
Training players only; season t qualified; season t+1 needs at least 100 3PA, 200 2PA or 100 FTA. Higher is better.

| Stat | Pairs | k=5 | k=10 | k=25 | k=50 | k=100 | k=200 | k=400 | k=800 | Best k | Previous k |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 3P% | 3,730 | 0.3608 | 0.3664 | 0.3736 | 0.3772 | 0.3757 | 0.3622 | 0.3260 | 0.2623 | 50 | 100 |
| 2P% | 6,576 | 0.7049 | 0.7063 | 0.7097 | 0.7138 | 0.7185 | 0.7207 | 0.7136 | 0.6856 | 200 | 100 |
| FT% | 5,435 | 0.8040 | 0.8053 | 0.8069 | 0.8061 | 0.8004 | 0.7853 | 0.7539 | 0.6916 | 25 | 50 |
