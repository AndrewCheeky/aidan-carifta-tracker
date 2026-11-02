"""Parse user-pasted SwimCloud tables from a GitHub issue, create review-only CSV changes."""
import csv, io, os, re, sys
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse
ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'data'; REPORT=ROOT/'review/swimcloud/paste_report.txt'
FIELDS=['event','course','time','meet_name','race_date','source_url','source_type','verification_status','round','swimmer']
def cell(s):
    s=s.strip().strip('*').strip()
    m=re.search(r'\[([^]]+)\]\((https?://[^)]+)\)',s)
    return (m.group(1).replace('**','').strip(),m.group(2)) if m else (s.replace('**','').strip(),'')
def parse(body):
    match=re.search(r'<!-- SWIMCLOUD_PASTE_START -->(.*?)<!-- SWIMCLOUD_PASTE_END -->',body,re.S)
    if not match: raise ValueError('Missing paste delimiters')
    text=match.group(1).strip(); rows=[]
    for line in text.splitlines():
        if not line.strip():continue
        if line.lstrip().startswith('|'):
            cols=[x.strip() for x in line.strip().strip('|').split('|')]
        else: cols=[x.strip() for x in line.split('\t')]
        if len(cols)<4:continue
        if all(re.fullmatch(r':?-{2,}:?',x.strip()) for x in cols if x.strip()):continue
        if cols[0].lower().strip('* ') in ('event','events'):continue
        # SwimCloud copy may include blank spacer column after time.
        if len(cols)>=5 and not cols[2]:cols.pop(2)
        ev,_=cell(cols[0]);tm,url=cell(cols[1]);meet,meet_url=cell(cols[2]);dt,_=cell(cols[3])
        if not url and len(cols)>4:
            _,url=cell(cols[4])
        course=re.search(r'\b(LCM|SCM)\b',ev,re.I)
        if not course:raise ValueError('Missing SCM/LCM in event: '+ev)
        ev=re.sub(r'\s+(?:LCM|SCM)\b','',ev,flags=re.I).strip()
        if not re.fullmatch(r'(?:50|100|200|400|800|1500)\s+(?:Free|Back|Breast|Fly|IM)',ev,re.I):raise ValueError('Invalid event: '+ev)
        if not re.fullmatch(r'\d{1,2}(?::\d{1,2})?\.\d{2}',tm):raise ValueError('Invalid time: '+tm)
        try: date=datetime.strptime(dt,'%b %d, %Y').date()
        except ValueError:
            try:date=datetime.strptime(dt,'%B %d, %Y').date()
            except ValueError:date=datetime.strptime(dt,'%Y-%m-%d').date()
        if date.year<2000 or date.year>datetime.now().year+1:raise ValueError('Unexpected race date')
        if url and (urlparse(url).scheme!='https' or urlparse(url).hostname not in ('www.swimcloud.com','swimcloud.com')):raise ValueError('Invalid SwimCloud source link')
        if not url and meet_url:url=meet_url
        if url and (urlparse(url).scheme!='https' or urlparse(url).hostname not in ('www.swimcloud.com','swimcloud.com')):raise ValueError('Invalid SwimCloud source link')
        if not meet:raise ValueError('Missing meet')
        rows.append(dict(event=ev.title().replace('Im','IM'),course=course.group(1).upper(),time=tm,meet_name=meet,race_date=date.isoformat(),source_url=url,source_type='SwimCloud user-supplied',verification_status='Supplementary, not ASAJ-verified',round='Unspecified',swimmer='Aidan Seaton'))
    if not rows:raise ValueError('No valid race rows found')
    if len(rows)>100:raise ValueError('Submit at most 100 rows at a time')
    return rows
def norm(x):return re.sub(r'[^a-z0-9]','',str(x).lower())
def key(r):return (norm(r['event']),r['course'].upper(),norm(r['meet_name']),r['race_date'],norm(r.get('round') or 'Unspecified'))
def main():
    rows=parse(os.environ.get('ISSUE_BODY',''))
    with (DATA/'swimcloud_supplemental.csv').open(newline='') as f: existing=list(csv.DictReader(f))
    with (DATA/'race_history_2026.csv').open(newline='') as f:official=list(csv.DictReader(f))
    seen={(key(r),r['time']) for r in existing}; additions=[];skipped=[];held=[]
    for r in rows:
        if (key(r),r['time']) in seen:
            skipped.append(r);continue
        # Meet date in official CSV may be approximate: compare meet/event/course/time without trusting date.
        possible=[o for o in official if norm(o['event'])==norm(r['event']) and o['course'].upper()==r['course'] and (norm(o['meet_name'])==norm(r['meet_name']) or r['time']==o['time'])]
        if possible:
            held.append((r,'Potential ASAJ overlap: '+', '.join(o['time']+' '+o['meet_name'] for o in possible[:3])));continue
        # Same meet/event/course/date with different time can be a different round, but round unknown: hold.
        if any(key(e)==key(r) for e in existing):
            held.append((r,'Existing SwimCloud swim in same meet/event/date, round unspecified'));continue
        additions.append(r);seen.add((key(r),r['time']))
    if additions:
        with (DATA/'swimcloud_supplemental.csv').open('w',newline='') as f:
            w=csv.DictWriter(f,fieldnames=FIELDS);w.writeheader();w.writerows(existing+additions)
    REPORT.parent.mkdir(parents=True,exist_ok=True)
    lines=[f'Parsed: {len(rows)}',f'New: {len(additions)}',f'Already present: {len(skipped)}',f'Held for review: {len(held)}','', 'New entries:']
    lines += [f"{r['race_date']} {r['event']} {r['course']} {r['time']} {r['meet_name']}" for r in additions]
    lines += ['','Held entries:']+[f"{r['race_date']} {r['event']} {r['course']} {r['time']} | {why}" for r,why in held]
    REPORT.write_text('\n'.join(lines)+'\n')
    print('\n'.join(lines))
if __name__=='__main__':
    try:main()
    except (ValueError,KeyError) as e:print('IMPORT ERROR:',e,file=sys.stderr);sys.exit(1)
