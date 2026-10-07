"""Generate the reusable V2.0 scorecard HTML from card_v2.json (no transcription by hand)."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
c = json.load(open(os.path.join(HERE, 'card_v2.json')))
NAMES = {'f_winrate16': ('Staying win rate', 'Career Flat wins ÷ Flat runs at 1m6f+ (2,640y+), excluding the latest run'),
         'dual_career': ('Jumps experience', 'Has run over hurdles/fences as well as on the Flat (career)'),
         'wins_365d': ('Wins in last 12 months', 'Winning runs, any code, in the 365 days before the race'),
         'form_trend3': ('Form trajectory', 'Finish-proportion 3 runs back minus latest (placing ÷ field size; positive = improving)')}
FACT = [dict(key=k, name=NAMES[k][0], desc=NAMES[k][1], bands=c['bands'][k], pts=c['card'][k], max=max(c['card'][k])) for k in c['card']]
html = open(os.path.join(HERE, 'scorecard_template.html')).read().replace('/*FACTORS*/[]', json.dumps(FACT))
open(os.path.join(HERE, 'Cesarewitch-V2.0-Reusable-Scorecard.html'), 'w').write(html)
print('ok', [f['max'] for f in FACT], sum(f['max'] for f in FACT))
