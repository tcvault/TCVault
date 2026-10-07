"""Phases 3, 4 and 6 - V2.0 Anchored 100: weights, bands, compression pre-check, backtest, LOYO, k/lambda.

Price-blind: nothing here reads SP / odds. Weights come from Phase 2 effect sizes (std_sep x consistency),
bands from the pooled 95-runner distribution (never from the winners' values).
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
FACTORS = ['f_winrate16', 'dual_career', 'wins_365d', 'form_trend3']   # selection rationale in the build audit
# Pooled-distribution band edges (lower bounds, ascending quality). Quartile-style, rounded; >=5% of pool each.
BANDS = {
    'f_winrate16': [('0 wins at 1m6f+', -9, 0.0),          # value == 0
                    ('>0 to 20%', 0.0, 0.20), ('>20% to 40%', 0.20, 0.40), ('>40%', 0.40, 9)],
    'dual_career': [('Flat only', -1, 0.5), ('Flat + jumps', 0.5, 9)],
    'wins_365d':   [('0 wins', -1, 0.5), ('1 win', 0.5, 1.5), ('2 wins', 1.5, 2.5), ('3+ wins', 2.5, 99)],
    'form_trend3': [('declining (<=-0.20)', -9, -0.20), ('stable (-0.20 to 0.10]', -0.20, 0.10),
                    ('improving (0.10 to 0.30]', 0.10, 0.30), ('strong rise (>0.30)', 0.30, 9)],
}

def band_index(f, x):
    """Index of band (0 = lowest). Intervals are (lo, hi]; the first band also takes its own lo (value 0 for win rate)."""
    for i, (_, lo, hi) in enumerate(BANDS[f]):
        if f == 'f_winrate16' and i == 0:
            if x <= 0.0: return 0
            continue
        if lo < x <= hi: return i
    return len(BANDS[f]) - 1

def effects():
    r = pd.read_csv(os.path.join(HERE, 'phase2_separation.csv')).set_index('attr')
    return r.loc[FACTORS, 'effect']

def weights(eff, floor=5, cap=40):
    w = eff / eff.sum() * 100
    fixed = {}
    for _ in range(10):
        over = [f for f in w.index if (w[f] > cap or w[f] < floor) and f not in fixed]
        if not over: break
        for f in over: fixed[f] = cap if w[f] > cap else floor
        free = [f for f in w.index if f not in fixed]
        rem = 100 - sum(fixed.values())
        w = pd.Series({f: fixed.get(f, eff[f] / eff[free].sum() * rem) for f in w.index})
    # largest-remainder rounding to 100
    fl = np.floor(w); rem = int(round(100 - fl.sum()))
    order = (w - fl).sort_values(ascending=False).index[:rem]
    out = fl.copy(); out[order] += 1
    return out.astype(int)

def band_points(f, wt, floor=1):
    n = len(BANDS[f])
    return [round(floor + (wt - floor) * i / (n - 1)) for i in range(n)]

def build_card(w):
    return {f: band_points(f, int(w[f])) for f in FACTORS}

def score(df, card):
    """Per-runner factor points with active-field mean imputation for NA; returns df with pts_*, na_*, total."""
    out = df.copy()
    for f in FACTORS:
        pts = out[f].map(lambda x: np.nan if pd.isna(x) else card[f][band_index(f, x)])
        out['na_' + f] = pts.isna()
        mean_by_race = pts.groupby(out['year']).transform('mean')
        out['pts_' + f] = pts.fillna(mean_by_race).fillna((min(card[f]) + max(card[f])) / 2)
    out['total'] = out[['pts_' + f for f in FACTORS]].sum(axis=1)
    out['n_na'] = out[['na_' + f for f in FACTORS]].sum(axis=1)
    return out

def probs(total, k, lam=0.0):
    z = np.exp(k * (total - total.max()) / 100.0)
    p = z / z.sum()
    return ((1 - lam) * p + lam / len(p)).values

def race_stats(g, card):
    s = g['total']; rank = s.rank(ascending=False, method='average')
    wi = g.index[g.winner == 1][0]
    q1, q3 = s.quantile(.25), s.quantile(.75)
    comp = {}
    for f in FACTORS:
        mx = max(card[f])
        if mx < 10: continue
        pts = g['pts_' + f]; levels = sorted(set(card[f]), reverse=True)[:2]
        top2 = pts.isin(levels).mean() if len(card[f]) > 2 else (pts == mx).mean()  # 2-band factor: top band only (audit s6.4)
        comp[f] = top2
    return dict(winner=g.loc[wi, 'horse'], N=len(g), rank_avg=rank[wi], rank_min=s.rank(ascending=False, method='min')[wi],
                win_score=s[wi], top_score=s.max(), range=s.max() - s.min(), iqr=q3 - q1,
                gate=bool(s.max() - s.min() >= 20 and q3 - q1 >= 8 and all(v < .70 for v in comp.values())), comp=comp)

def calibration(sc, ks=np.arange(2.0, 8.01, .5), lams=np.round(np.arange(0, .2001, .02), 2)):
    rows = []
    for k in ks:
        ll, br, lead_p, lead_hit, yr_ll = [], [], [], [], []
        for yr, g in sc.groupby('year'):
            p = probs(g['total'], k); w = (g.winner == 1).values
            ll.append(-np.log(p[w][0])); br.append(((p - w) ** 2).sum())
            lead_p.append(p.max()); lead_hit.append(float(w[np.argmax(g['total'].values)]))
            yr_ll.append(-np.log(p[w][0]))
        rows.append(dict(k=k, logloss=np.mean(ll), brier=np.mean(br), avg_leader_p=np.mean(lead_p),
                         leader_strike=np.mean(lead_hit), ll_sd_by_year=np.std(yr_ll), ll_by_year='/'.join(f'{x:.2f}' for x in yr_ll)))
    ck = pd.DataFrame(rows)
    return ck

def lam_cal(sc, k):
    rows = []
    for lam in np.round(np.arange(0, .2001, .02), 2):
        ll, br = [], []
        for yr, g in sc.groupby('year'):
            p = probs(g['total'], k, lam); w = (g.winner == 1).values
            ll.append(-np.log(p[w][0])); br.append(((p - w) ** 2).sum())
        rows.append(dict(lam=lam, logloss=np.mean(ll), brier=np.mean(br)))
    return pd.DataFrame(rows)

def loyo(df, eff_fn):
    """Leave-one-year-out: recompute weights from the other three years' winners, score the held-out year with
    the SAME pooled band edges. Returns held-out winner ranks."""
    from separation import analyse
    out = []
    for yr in sorted(df.year.unique()):
        tr = df[df.year != yr]
        res = analyse(tr, FACTORS).set_index('attr')
        w = weights(res.loc[FACTORS, 'effect'])
        card = build_card(w)
        te = score(df[df.year == yr].copy(), card)
        st = race_stats(te, card)
        out.append(dict(held_out=yr, weights='/'.join(str(w[f]) for f in FACTORS), rank=st['rank_avg'], N=st['N']))
    return pd.DataFrame(out)

def main():
    df = pd.read_csv(os.path.join(HERE, 'cesarewitch_runner_features.csv'))
    eff = effects(); w = weights(eff); card = build_card(w)
    print('effects', eff.round(3).to_dict()); print('weights', w.to_dict()); print('card', card)
    sc = score(df, card)
    # band pre-check on pooled field
    print('\nPooled band occupancy')
    for f in FACTORS:
        idx = df[f].map(lambda x: np.nan if pd.isna(x) else band_index(f, x))
        occ = idx.value_counts(normalize=True).sort_index()
        print(f, {BANDS[f][int(i)][0]: f'{v*100:.0f}%' for i, v in occ.items()}, 'NA', int(df[f].isna().sum()))
    res = []
    for yr, g in sc.groupby('year'):
        st = race_stats(g, card); res.append(st)
        print(yr, {k: (round(v, 2) if isinstance(v, float) else v) for k, v in st.items() if k != 'comp'},
              {k: round(v, 2) for k, v in st['comp'].items()})
    sc.sort_values(['year', 'total'], ascending=[True, False]).to_csv(os.path.join(HERE, 'backtest_ranked_fields.csv'), index=False)
    ck = calibration(sc); ck.to_csv(os.path.join(HERE, 'calibration_k.csv'), index=False)
    print(ck.round(3).to_string())
    kstar = float(ck.loc[ck.logloss.idxmin(), 'k']); print('k*(LL)', kstar, 'k*(Brier)', ck.loc[ck.brier.idxmin(), 'k'])
    lc = lam_cal(sc, kstar); lc.to_csv(os.path.join(HERE, 'calibration_lambda.csv'), index=False); print(lc.round(4).to_string())
    print(loyo(df, None).to_string())
    json.dump(dict(weights={f: int(w[f]) for f in FACTORS}, card=card, bands={f: [b[0] for b in BANDS[f]] for f in FACTORS}),
              open(os.path.join(HERE, 'card_v2.json'), 'w'), indent=1)
if __name__ == '__main__': main()
