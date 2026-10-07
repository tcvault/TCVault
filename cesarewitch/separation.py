"""Phase 2 - separation analysis + correlation filter (brief s5)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
EXCLUDE = {'year','race_id','horse','field_size','winner','finish_pos','or_entry','hist_months','n_prior_runs',
           'l_going','raceday_days_given','rr_days'}   # reference / banned-by-4.2 columns
CAT = {'l_type','r2_type','r3_type'}

def band_conc(x, direction=1):
    """Share of the pooled field in the TOP TWO bands in the favourable direction (V4.4 compression
    definition). <=6 distinct values -> each value is a band; otherwise 5 equal-width bands."""
    v = x.dropna()
    if v.nunique() <= 1: return 1.0
    if v.nunique() == 2:                       # binary: entry-condition test = prevalence of the favourable level
        return float((v == (v.max() if direction == 1 else v.min())).mean())
    b = v.rank(method='dense') if v.nunique() <= 6 else pd.cut(v, 5, labels=False) + 1
    top = b.max()
    if direction == -1: b = top + 1 - b
    bands = sorted(b.unique(), reverse=True)[:2]
    return float(b.isin(bands).mean())

def analyse(df, cols):
    rows = []
    for c in cols:
        x = pd.to_numeric(df[c], errors='coerce')
        pr, ss, side, n = [], [], [], 0
        for yr, g in df.groupby('year'):
            xv = x.loc[g.index]; w = g.index[g.winner == 1][0]
            if pd.isna(xv[w]): continue
            n += 1
            valid = xv.dropna()
            pr.append(((valid < xv[w]).sum() + .5 * (valid == xv[w]).sum() - .5) / max(len(valid) - 0, 1))  # midrank pct
            q1, q3 = valid.quantile(.25), valid.quantile(.75); iqr = q3 - q1
            if iqr == 0: iqr = valid.std() if valid.std() > 0 else np.nan
            ss.append((xv[w] - valid.median()) / iqr if pd.notna(iqr) else np.nan)
            med = valid.median(); side.append(np.sign(xv[w] - med))
        if n < 3: continue
        pr = np.array(pr); ss = np.array(ss, float)
        avg_pct, avg_ss = pr.mean() * 100, np.nanmean(ss)
        up = (np.array(side) > 0).sum(); dn = (np.array(side) < 0).sum()
        # direction: majority side (ties-at-median count for neither)
        direction = 1 if avg_pct >= 50 else -1
        binary = valid_all = x.dropna().nunique() == 2
        if binary:
            fav = x.max() if direction == 1 else x.min()
            consist = int(sum(x.loc[g.index[g.winner == 1][0]] == fav for _, g in df.groupby('year')))
        else:
            consist = int((np.array(side) == direction).sum())
        # effective percentile in chosen direction
        eff = avg_pct if direction == 1 else 100 - avg_pct
        conc = band_conc(x, direction)
        fw = np.nanmean([pd.concat([x.loc[g.index], (g.finish_pos.fillna(g.field_size+1))],axis=1).corr(method='spearman').iloc[0,1] for _,g in df.groupby('year')]) * (1 if direction==-1 else -1)
        c1 = eff > 60; c2 = consist >= 3; c3 = conc < .70
        c1, c2, c3 = bool(c1), bool(c2), bool(c3); npass = int(c1) + int(c2) + int(c3)
        rows.append(dict(attr=c, n_winners=n, avg_pct=round(avg_pct, 1), eff_pct=round(eff, 1), std_sep=round(avg_ss, 2),
                         dir='high' if direction == 1 else 'low', consistent_yrs=f'{consist}/{n}',
                         top2_conc=round(conc * 100), pass_pct=c1, pass_dir=c2, pass_comp=c3,
                         verdict='STRONG' if npass == 3 else 'CONDITIONAL' if npass == 2 else 'REJECTED',
                         fieldwide_rho=round(fw,2), pct_by_year='/'.join(f'{p*100:.0f}' for p in pr), effect=abs(avg_ss) * consist / n if pd.notna(avg_ss) else np.nan))
    return pd.DataFrame(rows)

def main():
    df = pd.read_csv(os.path.join(HERE, 'cesarewitch_runner_features.csv'))
    cols = [c for c in df.columns if c not in EXCLUDE and c not in CAT]
    res = analyse(df, cols)
    res = res.sort_values(['verdict', 'effect'], key=lambda s: s.map({'STRONG': 0, 'CONDITIONAL': 1, 'REJECTED': 2}) if s.name == 'verdict' else -s).reset_index(drop=True)
    # robustness: drop 2022 (censored ~9-month history)
    r23 = analyse(df[df.year != 2022], cols)[['attr', 'eff_pct', 'consistent_yrs', 'verdict']].rename(
        columns={'eff_pct': 'eff_pct_ex22', 'consistent_yrs': 'consist_ex22', 'verdict': 'verdict_ex22'})
    res = res.merge(r23, on='attr', how='left')
    # correlation filter among STRONG+CONDITIONAL
    cand = res[res.verdict != 'REJECTED'].attr.tolist()
    X = df[cand].apply(pd.to_numeric, errors='coerce')
    corr = X.corr(method='spearman')
    keep, dropped = [], {}
    order = res[res.verdict != 'REJECTED'].sort_values('effect', ascending=False).attr.tolist()
    for a in order:
        hit = [k for k in keep if abs(corr.loc[a, k]) > .70]
        if hit: dropped[a] = hit[0]
        else: keep.append(a)
    res['corr_filter'] = res.attr.map(lambda a: 'KEEP' if a in keep else (f'drop (rho>0.70 vs {dropped[a]})' if a in dropped else '-'))
    res.to_csv(os.path.join(HERE, 'phase2_separation.csv'), index=False)
    corr.to_csv(os.path.join(HERE, 'phase2_spearman.csv'))
    pd.set_option('display.width', 250, 'display.max_rows', 200, 'display.max_columns', 30)
    print(res.drop(columns=['pass_pct','pass_dir','pass_comp','n_winners']).to_string())
    print('\nKEEP:', keep)
if __name__ == '__main__': main()
