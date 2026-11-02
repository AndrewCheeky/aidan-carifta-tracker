#!/usr/bin/env python3
"""Fail closed: only publish validated official performances and standards."""
import csv, json, re, html
from pathlib import Path
from datetime import date, datetime
ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'data'; DOCS=ROOT/'docs'; DOCS.mkdir(exist_ok=True)
EVENTS=json.loads((DATA/'athlete.json').read_text())['events']
OFFICIAL_HOSTS={'asaj.com.jm','www.asaj.com.jm','liveresults.asaj.com.jm'}
from urllib.parse import urlparse

def seconds(s):
    s=s.strip()
    if not re.fullmatch(r'(?:\d+:)?\d{1,2}\.\d{2}',s): raise ValueError('Invalid swim time '+repr(s))
    p=s.split(':'); return round(float(p[-1])+(int(p[0])*60 if len(p)==2 else 0),2)

def fmt(s):
    if s is None: return 'Pending'
    sign='−' if s<0 else '+'
    s=abs(s); m=int(s//60); rem=s-m*60
    return sign+(f'{m}:{rem:05.2f}' if m else f'{rem:.2f}s')

def verified(row):
    url=row.get('source_url','').strip(); host=urlparse(url).hostname
    if row.get('verified','').strip().lower()!='true': return False
    if host not in OFFICIAL_HOSTS or not row.get('source_date','').strip(): raise ValueError('Verified row requires official ASAJ URL and source date: '+str(row))
    date.fromisoformat(row['source_date']); return True

def load(name,allow_other_events=False):
    with (DATA/name).open(newline='') as f: rows=list(csv.DictReader(f))
    out=[]
    for r in rows:
        if not verified(r): continue
        if r['event'] not in EVENTS and not allow_other_events: raise ValueError('Unknown event: '+r['event'])
        if r.get('course')!='LCM': raise ValueError('Non-long-course row')
        seconds(r['time']);out.append(r)
    return out

perf=load('performances.csv'); standards=load('standards.csv'); ranks=load('rankings.csv'); emerging=[r for r in load('emerging_boys12.csv',allow_other_events=True)]
for r in standards:
    if r['age_group']!='13-14' or r['gender'].lower()!='boys': raise ValueError('Wrong qualification age/gender')
for r in ranks:
    if not r['age'].isdigit() or int(r['age'])<0: raise ValueError('Invalid age')
    if not r['rank'].isdigit() or int(r['rank'])<1: raise ValueError('Invalid rank')
for r in perf:
    if ' '.join(r['swimmer'].casefold().split())!='aidan seaton': raise ValueError('Performance not Aidan Seaton')

# Separate verified 2026 race history from ASAJ top-times rankings.
history=[]
with (DATA/'race_history_2026.csv').open(newline='') as f:
    for r in csv.DictReader(f):
        if not verified(r):continue
        if r['swimmer'].strip().casefold()!='aidan seaton':raise ValueError('Race history swimmer mismatch')
        if not re.fullmatch(r'(?:50|100|200|400|800|1500) (?:Free|Back|Breast|Fly|IM)',r['event']):raise ValueError('Invalid race history event: '+r['event'])
        if r['course']!='LCM':raise ValueError('Race history must be LCM')
        if not r['meet_name'].strip() or r['round'] not in ('Finals','Preliminaries'):raise ValueError('Missing or invalid meet/round')
        source_file=r.get('source_pdf','')
        if not source_file.startswith('asaj-pdfs/') or '/' in source_file[10:] or not (DOCS/source_file).is_file():raise ValueError('Missing official PDF evidence: '+source_file)
        if not r.get('source_page','').isdigit():raise ValueError('Missing PDF page reference')
        if not r['age'].isdigit():raise ValueError('Invalid swimmer age')
        race_day=date.fromisoformat(r['race_date'])
        if race_day.year!=2026:raise ValueError('Outside 2026 race history')
        seconds(r['time'])
        history.append({k:r[k] for k in ('event','swimmer','age','club','time','course','meet_name','race_date','round','source_url','source_pdf','source_page','meet_dates','date_precision')})

# Third-place national benchmarks are from the dated ASAJ ranking snapshot,
# not inferred from the limited Aidan-only rankings.csv file.
with (DATA/'third_place_boys13_14.csv').open(newline='') as f:
    third_rows=list(csv.DictReader(f))
third_by_event={}
for t in third_rows:
    if t['event'] not in EVENTS or t['event'] in third_by_event: raise ValueError('Invalid/duplicate third-place event')
    if t['rank']!='3' or t['course']!='LCM' or t['ranking_date']!='2026-09-29': raise ValueError('Invalid podium ranking metadata')
    if not t['swimmer'].strip() or not t['source_url'].startswith('https://asaj.com.jm/'): raise ValueError('Invalid third-place source')
    if t['source_pdf']!='reference/asaj/General Rankings 29-09-2026.pdf' or not (ROOT/t['source_pdf']).is_file(): raise ValueError('Missing third-place PDF')
    seconds(t['time']); third_by_event[t['event']]=t
by_event={e:[] for e in EVENTS}
for r in perf: by_event[r['event']].append(r)
for r in history:
    if r['event'] in by_event: by_event[r['event']].append(r)
results=[]
for e in EVENTS:
    a=min(by_event[e],key=lambda r:seconds(r['time'])) if by_event[e] else None
    asec=seconds(a['time']) if a else None
    std={r['standard_type']:r for r in standards if r['event']==e}
    rr=sorted((r for r in ranks if r['event']==e and r['age'] in ('13','14')),key=lambda r:int(r['rank']))
    own=next((r for r in rr if r['swimmer'].casefold()=='aidan seaton'),None)
    third=third_by_event.get(e)
    boys12=[]
    if asec is not None:
        for r in (ranks+emerging):
            if r['event']==e and r['age']=='12' and abs(seconds(r['time'])-asec)/asec<=0.10:
                boys12.append({'name':r['swimmer'],'club':r['club'],'time':r['time'],'difference':fmt(seconds(r['time'])-asec),'source_url':r['source_url']})
    results.append({'event':e,'personal_best':a['time'] if a else None,'pb_source':a['source_url'] if a else None,'pb_evidence_pdf':a.get('source_pdf') if a else None,'pb_evidence_page':a.get('source_page') if a else None,'standards':{k:{'time':v['time'],'difference':fmt(asec-seconds(v['time'])) if asec is not None else None,'met':asec<=seconds(v['time']) if asec is not None else None,'source_url':v['source_url']} for k,v in std.items()},'rank':int(own['rank']) if own else None,'podium_gap':fmt(asec-seconds(third['time'])) if asec is not None and third else None,'third_place':{'swimmer':third['swimmer'],'time':third['time'],'ranking_date':third['ranking_date'],'source_url':third['source_url']} if third else None,'boys12':boys12})
history.sort(key=lambda r:(r['race_date'],r['event'],seconds(r['time'])))
meets=json.loads((DATA/'meets.json').read_text()); sources=json.loads((DATA/'official_sources.json').read_text())
for meet in meets:
    if urlparse(meet['url']).hostname not in OFFICIAL_HOSTS: raise ValueError('Unofficial meet URL')
    if date.fromisoformat(meet['start'])>date.fromisoformat(meet['end']): raise ValueError('Bad meet date')
output={'athlete':json.loads((DATA/'athlete.json').read_text()),'events':results,'race_history_2026':history,'meets':meets,'sources':sources,'built_at':datetime.now().astimezone().isoformat(timespec='seconds'),'warning':'Only rows explicitly verified against ASAJ are published; empty fields mean not yet verified.'}
(DOCS/'data.json').write_text(json.dumps(output,indent=2,ensure_ascii=False))
print('Built',len(results),'events;',len(perf),'verified personal bests;',len(standards),'standards;',len(ranks),'rankings')
