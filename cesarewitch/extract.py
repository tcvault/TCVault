"""Phase 1 - candidate factor extraction for the Cesarewitch V2.0 rebuild.

One row per runner (95), pre-race attributes only (history strictly before the
Cesarewitch off-time). Price / OR-as-score / weight / draw / connections are NOT
extracted as candidates (brief s4.2); OR at entry is carried only as a reference column.

Usage: python3 -I extract.py  -> cesarewitch_runner_features.csv
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, pandas as pd
from load import load, RACES

Y6, Y2M, Y16 = 2640, 3520, 2640   # >=1m6f, >=2m thresholds (yards)
DATA_START = pd.Timestamp('2022-01-01')

def rtype(r):
    t = r['Type']
    if r['flat']: return 'flat_hcap' if r['hcap'] else 'flat_nonhcap'
    return {'h': 'hurdle', 'c': 'chase', 'b': 'bumper'}.get(t, 'other')

def clean_cls(x):
    return np.nan if (pd.isna(x) or x > 6) else float(x)

def pprop(pos, ran):
    """Finish position as proportion of field (1 = last / non-finisher)."""
    if pd.isna(ran) or ran <= 0: return np.nan
    if pd.isna(pos): return 1.0
    return pos / ran

def trend3(vals):
    """vals: oldest->newest finishing proportions. >0 improving."""
    v = [x for x in vals if pd.notna(x)]
    if len(v) < 3: return np.nan
    return v[0] - v[-1]

def form_figs(form):
    """Digits of the RFB Form string, oldest->newest. 0 (10th+ / unplaced) counts as 10; letters and separators skipped."""
    if not isinstance(form, str): return []
    return [10 if c == '0' else int(c) for c in form if c.isdigit()]

def extract():
    d = load()
    d['cls_c'] = d['cls'].map(clean_cls)
    d['rt'] = d.apply(rtype, axis=1) if False else [rtype(r) for r in d[['Type', 'flat', 'hcap']].to_dict('records')]
    d['pprop'] = [pprop(p, n) for p, n in zip(d['pos'], d['ran'])]
    by_horse = {h: g for h, g in d.groupby('horse', sort=False)}
    rows = []
    for yr, rid in RACES.items():
        race = d[d.Id == rid]
        rts, rdate = race['ts'].iloc[0], race['date'].iloc[0]
        N = len(race)
        for _, r in race.iterrows():
            g = by_horse[r['horse']]
            h = g[g['ts'] < rts].sort_values('ts')
            o = dict(year=yr, race_id=rid, horse=r['horse'], field_size=N, winner=int(r['pos'] == 1),
                     finish_pos=r['pos'], age=r['Age'], or_entry=r['orr'],
                     hist_months=(rdate - DATA_START).days / 30.4, n_prior_runs=len(h))
            fl = h[h['flat']]; jp = h[~h['flat']]
            if len(h):
                L = h.iloc[-1]
                o.update(l_pos=L['pos'], l_pprop=L['pprop'], l_btn=L['TotalBtn'], l_won=int(L['pos'] == 1),
                         l_class=L['cls_c'], l_type=L['rt'], l_yards=L['yards'],
                         l_staying=int(L['yards'] >= Y6) if pd.notna(L['yards']) else np.nan,
                         l_class_rel=(np.nan if pd.isna(L['cls_c']) else (1 if L['cls_c'] < 2 else 0 if L['cls_c'] == 2 else -1)),
                         l_days=(rdate - L['date']).days, l_field=L['ran'], l_going=L['Going'],
                         l_is_flat=int(L['flat']), l_is_hcap=int(L['hcap']))
                last_idx = h.index[-1]
            else:
                last_idx = None
            # runs 2 and 3 back
            for k in (2, 3):
                if len(h) >= k:
                    R = h.iloc[-k]
                    o.update({f'r{k}_pos': R['pos'], f'r{k}_pprop': R['pprop'], f'r{k}_btn': R['TotalBtn'],
                              f'r{k}_class': R['cls_c'], f'r{k}_type': R['rt'], f'r{k}_yards': R['yards']})
            # career staying record, Flat only, excluding the latest run
            fx = fl.drop(index=last_idx) if (last_idx is not None and last_idx in fl.index) else fl
            s16 = fx[fx['yards'] >= Y6]; s2 = fx[fx['yards'] >= Y2M]
            o.update(f_runs16=len(s16), f_wins16=int((s16['pos'] == 1).sum()), f_runs2m=len(s2),
                     f_wins2m=int((s2['pos'] == 1).sum()),
                     f_best_pos2m=(s2['pos'].min() if s2['pos'].notna().any() else np.nan),
                     f_winrate16=((s16['pos'] == 1).mean() if len(s16) else np.nan),
                     f_placerate16=((s16['pos'] <= 3).mean() if len(s16) else np.nan))
            js2 = jp[jp['yards'] >= Y2M]
            o.update(j_runs2m=len(js2), j_wins2m=int((js2['pos'] == 1).sum()), j_any=int(len(jp) > 0))
            # overall flat career (all flat runs incl. latest)
            n = len(fl)
            o.update(c_flat_runs=n, c_flat_wins=int((fl['pos'] == 1).sum()),
                     c_flat_winrate=((fl['pos'] == 1).mean() if n else np.nan),
                     c_flat_top3=((fl['pos'] <= 3).mean() if n else np.nan))
            fh = fl[fl['hcap']]
            o['c_flat_top3_hcap'] = (fh['pos'] <= 3).mean() if len(fh) else np.nan
            c12 = fl[fl['cls_c'] <= 2]
            o.update(c_cl12_runs=len(c12), c_cl12_winplace=int((c12['pos'] <= 3).sum()))
            won = fl[fl['pos'] == 1]
            o['c_best_class_won'] = won['cls_c'].min() if won['cls_c'].notna().any() else np.nan
            o['c_won_cl2plus_hcap'] = int(((won['cls_c'] <= 2) & won['hcap']).any())
            # trajectory
            last3 = h.iloc[-3:]['pprop'].tolist()
            o['form_trend3'] = trend3(last3)
            t = o['form_trend3']
            o['form_dir3'] = np.nan if pd.isna(t) else (1 if t > .1 else -1 if t < -.1 else 0)
            flor = fl[fl['orr'].notna()]
            if len(flor) >= 3 and pd.notna(r['orr']): o['or_chg3'] = r['orr'] - flor.iloc[-3]['orr']
            elif len(flor) >= 1 and pd.notna(r['orr']): o['or_chg3'] = np.nan
            w12 = fl[(fl['pos'] == 1) & (fl['date'] >= rdate - pd.Timedelta(days=365))]
            b12 = w12['cls_c'].min() if w12['cls_c'].notna().any() else np.nan
            o['best_class_won_12m'] = b12
            o['best_class_won_12m_gap'] = (b12 - o['c_best_class_won']) if pd.notna(b12) and pd.notna(o['c_best_class_won']) else np.nan
            # fitness
            cy = h[h['date'].dt.year == yr]
            o.update(runs_flat_cy=int(cy['flat'].sum()), runs_jumps_cy=int((~cy['flat']).sum()), runs_cy=len(cy))
            wins = h[h['pos'] == 1]
            o['days_since_win'] = (rdate - wins['date'].max()).days if len(wins) else np.nan
            o['runs_90d'] = int((h['date'] >= rdate - pd.Timedelta(days=90)).sum())
            o['wins_365d'] = int((wins['date'] >= rdate - pd.Timedelta(days=365)).sum())
            # dual purpose
            o.update(dual_cy=int(cy['flat'].any() and (~cy['flat']).any()),
                     dual_career=int(len(fl) > 0 and len(jp) > 0),
                     prop_flat=(len(fl) / len(h) if len(h) else np.nan))
            o['raceday_days_given'] = r['Days']
            # race-record-only attributes (Form string + Days + Age in the Cesarewitch entry itself)
            ff = form_figs(r['Form'])
            o['rr_last_fig'] = ff[-1] if ff else np.nan
            o['rr_form_trend3'] = (ff[-3] - ff[-1]) if len(ff) >= 3 else np.nan   # >0 improving (raw positions)
            o['rr_form_avg3'] = np.mean(ff[-3:]) if ff else np.nan
            o['rr_days'] = pd.to_numeric(r['Days'], errors='coerce')
            rows.append(o)
    return pd.DataFrame(rows)

if __name__ == '__main__':
    out = extract()
    here = os.path.dirname(os.path.abspath(__file__))
    out.to_csv(os.path.join(here, 'cesarewitch_runner_features.csv'), index=False)
    print(out.shape); print(out.groupby('year').agg(n=('horse', 'size'), w=('winner', 'sum')))
    print(out[out.winner == 1].T.to_string())
