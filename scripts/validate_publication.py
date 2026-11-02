#!/usr/bin/env python3
"""Fail closed unless published CSV rows exactly match bundled ASAJ source extraction."""
import csv, hashlib, json, sys
from pathlib import Path
from extract_asaj import extract
ROOT=Path(__file__).resolve().parents[1]
D=ROOT/'data'
R=ROOT/'reference/asaj'
URL=(ROOT/'review/asaj/qualification_source_url.txt').read_text().strip()
if URL != 'https://www.asaj.com.jm/resources/carifta-2027-qt.pdf/@@download/file':
    sys.exit('Qualification URL differs from approved official ASAJ source')
rank_path=R/'General Rankings 29-09-2026.pdf'
qt_path=R/'Carifta 2027 QT.pdf'
def records(path,url):
    b=path.read_bytes()
    if not b.startswith(b'%PDF-'):sys.exit(f'Not a PDF: {path}')
    return extract(b,url,hashlib.sha256(b).hexdigest(),'reference')
rank=records(rank_path,'https://asaj.com.jm/swimming/general-rankings-29-09-2026.pdf/@@download/file')
std=records(qt_path,URL)
events=set(json.loads((D/'athlete.json').read_text())['events'])
def load(name):
    with (D/name).open(newline='') as f:return list(csv.DictReader(f))
performances=load('performances.csv'); rankings=load('rankings.csv'); standards=load('standards.csv')
source_ranks={(r['event'],str(r['rank']),r['time'],str(r['age'])) for r in rank if r['kind']=='aidan_rank' and r['event'] in events and r.get('age_group')=='13-14' and r['age'] in (13,14)}
source_std={(r['event'],kind,r[kind.lower()+'_time']) for r in std if r['kind']=='carifta_2027_boys_13_14_standard' and r['event'] in events for kind in ('A','B')}
if len(standards)!=len(source_std) or len(standards)!=2*len(events):sys.exit('Missing or duplicate standards')
if len(rankings)!=len(source_ranks) or len(performances)!=len(source_ranks):sys.exit('Missing or duplicate ranking rows')
for r in rankings:
    if (r['event'],r['rank'],r['time'],r['age']) not in source_ranks or r['swimmer']!='Aidan Seaton' or r['course']!='LCM' or r['verified'].lower()!='true':sys.exit('Ranking mismatch')
for r in performances:
    if not any((r['event'],r['time'],r['age'])==(a,b,c) for a,_,b,c in source_ranks) or r['swimmer']!='Aidan Seaton' or r['course']!='LCM' or r['verified'].lower()!='true' or 'top time' not in r['source_type'].lower():sys.exit('Performance mismatch')
for r in standards:
    if (r['event'],r['standard_type'],r['time']) not in source_std or r['age_group']!='13-14' or r['gender']!='Boys' or r['course']!='LCM' or r['verified'].lower()!='true' or r['source_url']!=URL:sys.exit('Standard mismatch')
print(f'PASS: {len(rankings)} rankings, {len(performances)} top times, {len(standards)} standards exactly match ASAJ PDF extraction')
