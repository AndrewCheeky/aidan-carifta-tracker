#!/usr/bin/env python3
"""Prepare reviewable CSVs from bundled ASAJ source PDFs; never self-approve."""
import csv, hashlib, json, sys
from pathlib import Path
from datetime import date
from extract_asaj import extract
ROOT=Path(__file__).resolve().parents[1]
R=ROOT/'reference/asaj'; D=ROOT/'data'
SOURCES=[('General Rankings 29-09-2026.pdf','https://asaj.com.jm/swimming/general-rankings-29-09-2026.pdf/@@download/file','2026-09-29'),('Carifta 2027 QT.pdf','https://www.asaj.com.jm/resources/carifta-2027-qt.pdf/@@download/file','2026-06-25')]
# Source URL for uploaded qualification PDF is not independently confirmed. Require human supplied official URL.
urlfile=ROOT/'review/asaj/qualification_source_url.txt'
if urlfile.exists():
 url=urlfile.read_text().strip()
 if not (url.startswith('https://asaj.com.jm/') or url.startswith('https://www.asaj.com.jm/')):sys.exit('Invalid official qualification source URL')
 SOURCES[1]=(SOURCES[1][0],url,SOURCES[1][2])
else:sys.exit('Create review/asaj/qualification_source_url.txt with the exact official ASAJ URL for Carifta 2027 QT.pdf before publishing.')
rank_pdf=R/SOURCES[0][0]; qt_pdf=R/SOURCES[1][0]
if not rank_pdf.is_file() or not qt_pdf.is_file():sys.exit('Missing official reference PDFs')
def candidates(p,url):
 b=p.read_bytes();return extract(b,url,hashlib.sha256(b).hexdigest(),'reference')
ranks=candidates(rank_pdf,SOURCES[0][1]);stds=candidates(qt_pdf,SOURCES[1][1]); events=json.loads((D/'athlete.json').read_text())['events']
byevent={r['event']:r for r in ranks if r['kind']=='aidan_rank' and r['event'] in events and r.get('age_group')=='13-14' and r['age'] in (13,14)}
by_std={r['event']:r for r in stds if r['kind']=='carifta_2027_boys_13_14_standard' and r['event'] in events}
if len(byevent)<5 or len(by_std)!=len(events):sys.exit(f'Insufficient extracted data: {len(byevent)} Aidan events, {len(by_std)} standards')
perf=[]; ranking=[]; standards=[]
for event in events:
 if event in byevent:
  r=byevent[event];common={'event':event,'swimmer':'Aidan Seaton','age':str(r['age']),'club':'','time':r['time'],'course':'LCM','source_url':SOURCES[0][1],'source_date':SOURCES[0][2],'verified':'true'}
  perf.append({**common,'source_type':'ASAJ top time (not independently verified lifetime PB)'})
  ranking.append({**common,'rank':str(r['rank'])})
 if event in by_std:
  r=by_std[event]
  for key in ('A','B'):
   standards.append({'event':event,'age_group':'13-14','gender':'Boys','standard_type':key,'time':r[key.lower()+'_time'],'course':'LCM','source_url':SOURCES[1][1],'source_date':SOURCES[1][2],'verified':'true'})
# Write to review staging only. Human must review every CSV and merge a separate publication PR.
stage=ROOT/'review/asaj/publish_candidate';stage.mkdir(parents=True,exist_ok=True)
for name,rows,fields in [('performances.csv',perf,['event','swimmer','age','club','time','course','source_url','source_date','source_type','verified']),('rankings.csv',ranking,['event','swimmer','age','club','rank','time','course','source_url','source_date','verified']),('standards.csv',standards,['event','age_group','gender','standard_type','time','course','source_url','source_date','verified'])]:
 with (stage/name).open('w',newline='') as f:
  w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows(rows)
print(f'Prepared for manual review: {len(perf)} ASAJ top times, {len(ranking)} own rankings, {len(standards)} CARIFTA standards. No published CSVs changed.')
