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
# ASAJ CARIFTA criteria ratified 2025-12-03, supplied as 2026 Carifta Criteria.pdf.
# For CARIFTA 2027, only dated LCM performances from 2026-07-01 qualify.
# The final local qualifying meet date and up-to-date qualifying-period rankings
# have not been supplied: fail closed on selection priority and team selection.
CARIFTA_START=date(2026,7,1)
CARIFTA_CRITERIA={
 'document':'2026 Carifta Criteria.pdf',
 'ratified':'2025-12-03',
 'competition':'CARIFTA 2027',
 'qualifying_period_start':CARIFTA_START.isoformat(),
 'qualifying_period_end':None,
 'course':'LCM',
 'automatic_selection':'A standard and ranking 1st or 2nd; then B standard and ranking 1st or 2nd, subject to team limits',
 'age_group_gender_cap':8,
 'team_cap':36,
 'tie_breakers':['Number of standard-qualified events ranked 1st or 2nd','AQUA points from fastest qualifying event'],
 'relay':'Conditional: age group with 3 or 4 automatic qualifiers; qualifying relay projection and B-standard minimum required',
 'eligibility':'ASAJ registration, nationality/passport or residency, availability, and ASAJ Council ratification must be checked',
 'ranking_note':'September 2026 snapshot ranks are not selection-period final rankings',
 'source_pdf':'carifta-documents/2026 Carifta Criteria.pdf',
 'selection_confirmed':False,
 'provisional_ranking_date':'2026-09-29',
 'provisional_ranking_source':'reference/asaj/General Rankings 29-09-2026.pdf',
 'provisional_only':True
}
def qualifying_date(r):
    # Meet-range starts before July 1 are excluded unless independently
    # verified as including July 1; never infer the actual race day.
    try: return date.fromisoformat(r['race_date'])>=CARIFTA_START
    except (ValueError,KeyError): return False

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
    eligible=[r for r in history if r['event']==e and qualifying_date(r)]
    # Ranking PDF is dated in the window, but does not establish the date
    # of the underlying swim. It cannot establish qualification eligibility.
    eligible_best=min(eligible,key=lambda r:seconds(r['time'])) if eligible else None
    eligible_sec=seconds(eligible_best['time']) if eligible_best else None
    qualified_A=('A' in std and eligible_sec is not None and eligible_sec<=seconds(std['A']['time']))
    qualified_B=('B' in std and eligible_sec is not None and eligible_sec<=seconds(std['B']['time']))
    # September ASAJ ranking is a historical snapshot, not a qualifying-period
    # final ranking. Never convert a missing ranking into a verified position.
    snapshot_rank=int(own['rank']) if own else None
    snapshot_top2=snapshot_rank is not None and snapshot_rank<=2
    provisional_priority=('A-standard / top-2 snapshot' if qualified_A and snapshot_top2 else
                          'B-standard / top-2 snapshot' if qualified_B and snapshot_top2 else
                          'Time met; September snapshot rank outside top 2' if (qualified_A or qualified_B) and snapshot_rank is not None else
                          'Time met; no September snapshot rank' if (qualified_A or qualified_B) else
                          'No qualifying time yet')
    carifta={
      'eligible_best':eligible_best['time'] if eligible_best else None,
      'eligible_source_pdf':eligible_best['source_pdf'] if eligible_best else None,
      'eligible_source_page':eligible_best['source_page'] if eligible_best else None,
      'eligible_meet':eligible_best['meet_name'] if eligible_best else None,
      'standard_status':'A achieved' if qualified_A else 'B achieved' if qualified_B else 'Not yet achieved' if eligible_best else 'No date-verified eligible swim',
      'A_met':qualified_A,'B_met':qualified_B,
      'A_gap':fmt(eligible_sec-seconds(std['A']['time'])) if eligible_sec is not None and 'A' in std else None,
      'B_gap':fmt(eligible_sec-seconds(std['B']['time'])) if eligible_sec is not None and 'B' in std else None,
      'selection_priority':'Pending current qualifying-period ranking and eligibility verification',
      'selection_projection':'Not determinable: current rankings, eligible competitors, AQUA points and team-wide entries unavailable',
      'ranking_verified_for_selection':False,
      'provisional_ranking_date':'2026-09-29',
      'provisional_snapshot_rank':snapshot_rank,
      'provisional_top_two':snapshot_top2,
      'provisional_selection_priority':provisional_priority
    }
    results.append({'carifta':carifta,'event':e,'personal_best':a['time'] if a else None,'pb_source':a['source_url'] if a else None,'pb_evidence_pdf':a.get('source_pdf') if a else None,'pb_evidence_page':a.get('source_page') if a else None,'standards':{k:{'time':v['time'],'difference':fmt(asec-seconds(v['time'])) if asec is not None else None,'met':asec<=seconds(v['time']) if asec is not None else None,'source_url':v['source_url']} for k,v in std.items()},'rank':int(own['rank']) if own else None,'podium_gap':fmt(asec-seconds(third['time'])) if asec is not None and third else None,'third_place':{'swimmer':third['swimmer'],'time':third['time'],'ranking_date':third['ranking_date'],'source_url':third['source_url']} if third else None,'boys12':boys12})
history.sort(key=lambda r:(r['race_date'],r['event'],seconds(r['time'])))
meets=json.loads((DATA/'meets.json').read_text()); sources=json.loads((DATA/'official_sources.json').read_text())
for meet in meets:
    if urlparse(meet['url']).hostname not in OFFICIAL_HOSTS: raise ValueError('Unofficial meet URL')
    if date.fromisoformat(meet['start'])>date.fromisoformat(meet['end']): raise ValueError('Bad meet date')
goodwill=json.loads((DATA/'goodwill_2026_boys13_14.json').read_text())
for event,limits in goodwill['standards'].items():
    if event not in ('50 Free','100 Free','200 Free','50 Back','100 Back','50 Breast','100 Breast','50 Fly','100 Fly','200 IM'): raise ValueError('Unknown Goodwill event')
    for t in limits.values(): seconds(t)
goodwill['ranking_snapshot']={'date':'2026-09-29','source_pdf':'reference/asaj/General Rankings 29-09-2026.pdf','status':'Historical comparison only: September 2026 is after the 2026 Goodwill qualifying window; cannot establish 2026 selection ranking or eligibility.','selection_confirmed':False}
goodwill['events']=[{'event':r['event'],'personal_best':r['personal_best'],'pb_source':r['pb_source'],'pb_evidence_pdf':r['pb_evidence_pdf'],'pb_evidence_page':r['pb_evidence_page'],'snapshot_rank':r['rank'],'snapshot_top_two':r['rank'] is not None and r['rank']<=2,'snapshot_date':'2026-09-29','selection_priority':'Not determinable from post-competition September snapshot','standards':{k:{'time':t,'gap':fmt(seconds(r['personal_best'])-seconds(t)) if r['personal_best'] else None,'met':seconds(r['personal_best'])<=seconds(t) if r['personal_best'] else None} for k,t in goodwill['standards'][r['event']].items()}} for r in results if r['event'] in goodwill['standards']]
with (DATA/'swimcloud_supplemental.csv').open(newline='') as f:
    swimcloud_supplemental=list(csv.DictReader(f))
for sr in swimcloud_supplemental:
    url=(sr.get('source_url') or '').strip()
    host=urlparse(url).hostname
    # Pasted tables may omit result links. Keep these explicitly unverified.
    if (url and (urlparse(url).scheme!='https' or host not in ('www.swimcloud.com','swimcloud.com'))) or sr.get('swimmer')!='Aidan Seaton' or sr.get('course') not in ('SCM','LCM'):
        raise ValueError(f"Invalid supplemental result at {sr.get('race_date','?')} {sr.get('event','?')} {sr.get('course','?')}: check swimmer, course and source_url")
    seconds(sr['time']);date.fromisoformat(sr['race_date'])
output={'athlete':json.loads((DATA/'athlete.json').read_text()),'events':results,'race_history_2026':history,'swimcloud_supplemental':swimcloud_supplemental,'goodwill':goodwill,'carifta_criteria':CARIFTA_CRITERIA,'meets':meets,'sources':sources,'built_at':datetime.now().astimezone().isoformat(timespec='seconds'),'warning':'Only rows explicitly verified against ASAJ are published; empty fields mean not yet verified.'}
(DOCS/'data.json').write_text(json.dumps(output,indent=2,ensure_ascii=False))
print('Built',len(results),'events;',len(perf),'verified personal bests;',len(standards),'standards;',len(ranks),'rankings')
