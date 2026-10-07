"""Shared loader for RFB career files (Latin-1, BOM, DD-Mon-YY)."""
import glob, os, re
import numpy as np, pandas as pd

UP = '/root/.claude/uploads/0d348b38-8700-5ff0-9f3e-a85fcc63fa3a'
CACHE = '/tmp/claude-0/-home-user-TCVault/0d348b38-8700-5ff0-9f3e-a85fcc63fa3a/scratchpad/all.pkl'
RACES = {2022: 44842126, 2023: 45213126, 2024: 45577128, 2025: 45941119}
FRAC = {'¼': .25, '½': .5, '¾': .75}

def parse_btn(s):
    """Beaten distance (lengths) from RFB DstBtn notation."""
    if s is None or (isinstance(s, float) and np.isnan(s)): return np.nan
    s = str(s).replace('Â', '').strip().lower()   # files are UTF-8 bytes read as Latin-1
    if s == '': return np.nan
    named = {'nse': .05, 'shd': .1, 'sht-hd': .1, 'hd': .2, 'nk': .3, 'dh': 0.0, 'dist': 30.0}
    if s in named: return named[s]
    t = s
    for k, v in FRAC.items():
        t = t.replace(k, '+%s' % v)
    try:
        return sum(float(x) for x in t.split('+') if x != '')
    except ValueError:
        return np.nan

def load(files=None):
    if files is None and os.path.exists(CACHE):
        return pd.read_pickle(CACHE)
    fs = files or sorted(glob.glob(UP + '/*RFB*.csv'))
    parts = []
    for f in fs:
        d = pd.read_csv(f, encoding='latin-1', low_memory=False)
        d.columns = [c.replace('ï»¿', '').replace('﻿', '') for c in d.columns]
        parts.append(d)
    d = pd.concat(parts, ignore_index=True).drop_duplicates()
    d['date'] = pd.to_datetime(d['RaceDate'], format='%d-%b-%y')
    d['ts'] = pd.to_datetime(d['date'].dt.strftime('%Y-%m-%d') + ' ' + d['RaceTime'].fillna('00:00').astype(str), errors='coerce')
    d['ts'] = d['ts'].fillna(d['date'])
    d['flat'] = d['Type'].isna() | (d['Type'].astype(str).str.strip() == '')
    d['pos'] = pd.to_numeric(d['FPos'], errors='coerce')
    d['btn'] = d['DstBtn'].map(parse_btn)
    d['hcap'] = d['Race'].astype(str).str.contains('Handicap|Nursery', case=False)
    d['cls'] = pd.to_numeric(d['Class'], errors='coerce')
    d['yards'] = pd.to_numeric(d['Yards'], errors='coerce')
    d['orr'] = pd.to_numeric(d['OR'], errors='coerce')
    d['ran'] = pd.to_numeric(d['Ran'], errors='coerce')
    d['horse'] = d['HorseName'].astype(str).str.strip()
    d = d.sort_values(['ts', 'Id']).reset_index(drop=True)
    d.to_pickle(CACHE)
    return d
if __name__ == '__main__':
    d = load(); print(d.shape, d.date.min(), d.date.max())
    for y, i in RACES.items():
        r = d[d.Id == i]; print(y, len(r), r.Race.iloc[0], r.Going.iloc[0], r.yards.iloc[0], r.cls.iloc[0], r.AgeLimit.iloc[0], (r.pos == 1).sum(), r[r.pos==1].horse.tolist())
