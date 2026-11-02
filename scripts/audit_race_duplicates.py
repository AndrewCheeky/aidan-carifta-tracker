#!/usr/bin/env python3
"""Conservative duplicate-candidate audit. Does not modify results."""
import csv,collections,pathlib,re
path=pathlib.Path(__file__).resolve().parents[1]/'data/race_history_2026.csv'
rows=list(csv.DictReader(path.open(newline='',encoding='utf-8-sig')))
def norm(s):return re.sub(r'[^a-z0-9]','',str(s).lower())
def key(r):return tuple(norm(r.get(x,'')) for x in ('swimmer','event','course','meet_name','round','time'))
groups=collections.defaultdict(list)
for i,r in enumerate(rows,2):groups[key(r)].append(i)
dups=[v for v in groups.values() if len(v)>1]
print(f'{len(rows)} race records; {len(dups)} exact-key duplicate groups')
for v in dups:print('Possible duplicate CSV lines:',', '.join(map(str,v)))
print('Same-time swims at different meets and different rounds are intentionally distinct.')
