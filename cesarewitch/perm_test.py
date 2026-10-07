"""Selection-bias control: how well would a 4-factor card do if the same Phase 2 selection procedure were run on
RANDOM winners? Winner labels are shuffled within each race; attributes and fields are unchanged."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, pandas as pd, warnings
warnings.filterwarnings('ignore')
from separation import analyse, EXCLUDE, CAT
from backtest import weights
HERE = os.path.dirname(os.path.abspath(__file__))
df0 = pd.read_csv(os.path.join(HERE, 'cesarewitch_runner_features.csv'))
cols = [c for c in df0.columns if c not in EXCLUDE and c not in CAT]
X = df0[cols].apply(pd.to_numeric, errors='coerce')
pct = X.groupby(df0.year).rank(pct=True)          # within-race percentile of every attribute
pct = pct.fillna(0.5)

def stat(df, rng=None):
    res = analyse(df, cols)
    res = res[res.verdict != 'REJECTED'].sort_values('effect', ascending=False)
    top = res.head(4)
    if len(top) < 4: return np.nan, np.nan
    w = weights(top.set_index('attr')['effect']) if False else (top.effect / top.effect.sum() * 100).values
    sc = sum(wi * (pct[a] if d == 'high' else 1 - pct[a]) for wi, a, d in zip(w, top.attr, top.dir))
    ranks = []
    for yr, g in df.groupby('year'):
        s = sc.loc[g.index]; wi = g.index[g.winner == 1][0]
        ranks.append(s.rank(ascending=False, method='average')[wi] / len(g))
    return np.mean(ranks), np.mean(np.array(ranks) <= .5)

obs = stat(df0)
rng = np.random.default_rng(7); sims = []
for i in range(300):
    d = df0.copy(); d['winner'] = 0
    for yr, g in d.groupby('year'): d.loc[rng.choice(g.index), 'winner'] = 1
    sims.append(stat(d))
s = np.array([x for x in sims if not np.isnan(x[0])])
print('observed mean winner rank pct / top-half rate:', np.round(obs, 3))
print('null mean rank pct: mean %.3f  5th pct %.3f' % (s[:, 0].mean(), np.percentile(s[:, 0], 5)))
print('P(null mean rank pct <= observed) = %.3f' % (s[:, 0] <= obs[0]).mean(), ' n=%d' % len(s))
print('P(null top-half rate >= observed) = %.3f' % (s[:, 1] >= obs[1]).mean())
