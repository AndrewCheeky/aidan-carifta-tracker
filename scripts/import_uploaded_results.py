#!/usr/bin/env python3
"""Conservative ASAJ HY-TEK results importer; rejects uncertain rows and seed sheets."""
import csv, hashlib, re, shutil, sys
from pathlib import Path
from datetime import datetime
import fitz
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'sources/asaj/2026'
OUT=ROOT/'data/race_history_2026.csv'
WEB=ROOT/'docs/asaj-pdfs'
FIELDS=['event','swimmer','age','club','time','course','meet_name','race_date','round','source_url','source_date','verified','source_pdf','source_page','meet_dates','date_precision']
EVENT_RE=re.compile(r'#\s*\d+\s+(?:(?:Boys|Girls|Mixed)\s+)?(?:(?:\d+[-&O\dU]+|\d+&O)\s+)?(50|100|200|400|800|1500)\s+Meter\s+(Free|Back|Breast|Fly|IM)\b',re.I)
ROW_RE=re.compile(r'\bSeaton,\s*Aidan\s+13\s+([A-Z0-9-]{2,12})\s+((?:\d+:)?\d{1,2}\.\d{2}|DQ|NS|SCR)\s*$',re.I)
DATE_RE=re.compile(r'(\d{1,2}/\d{1,2}/2026)(?:\s+to\s+(\d{1,2}/\d{1,2}/2026))?')
MEET_RE=re.compile(r'(2026[^\n]{4,110}?)\s+-\s+\d{1,2}/\d{1,2}/2026')
def iso(s,dayfirst=False):
 return datetime.strptime(s,'%d/%m/%Y' if dayfirst else '%m/%d/%Y').date().isoformat()
def parse(path):
 doc=fitz.open(path)
 first=doc[0].get_text(sort=True)
 header_lines=first.splitlines()
 header=header_lines[1].strip()+' Results'
 dayfirst='Walter Rogers' in header
 m=DATE_RE.search(header)
 if not m: raise ValueError('No verifiable 2026 meet dates')
 start=iso(m.group(1),dayfirst);end=iso(m.group(2) or m.group(1),dayfirst)
 meet=header.split(' - ')[0].strip()
 if not meet.startswith('2026 '):raise ValueError('No meet title')
 if re.search('psych|entry|seed|session report',meet,re.I):raise ValueError('Not final results')
 if not re.search(r'\bResults\b',first[:400],re.I):raise ValueError('Missing results heading')
 rows=[]; problems=[]
 for pgno,page in enumerate(doc,1):
  w=page.rect.width
  # HY-TEK three-column reports, each column has independent event/round headings.
  for ci in range(3):
   left=ci*w/3+3;right=(ci+1)*w/3-3
   lines=page.get_text(clip=fitz.Rect(left,57,right,page.rect.height-12),sort=True).splitlines()
   event=None;round_name='Finals';header_seen=False
   for line in lines:
    ev=EVENT_RE.search(line)
    if ev:
     event=f'{ev.group(1)} {ev.group(2).upper() if ev.group(2).lower()=='im' else ev.group(2).title()}';round_name='Preliminaries' if 'Prelim' in line else 'Finals';header_seen=True
    elif 'Prelim Time' in line or re.search(r'\bPreliminaries\b|eliminaries',line):round_name='Preliminaries'
    elif 'Finals Time' in line:round_name='Finals'
    elif re.fullmatch(r'\s*Finals\s*',line):round_name='Finals'
    if 'Seaton, Aidan' not in line:continue
    # relay listings, continuation without an event heading, and malformed rows are never accepted.
    if not header_seen or not event or 'Relay' in line:
     problems.append((pgno,'Unattributed or relay name mention',line.strip()));continue
    rm=ROW_RE.search(line.strip())
    if not rm:
     problems.append((pgno,'Unrecognized athlete row',line.strip()));continue
    club,t=rm.groups()
    if t in ('DQ','NS','SCR'):
     problems.append((pgno,'Excluded '+t,line.strip()));continue
    rows.append(dict(event=event,swimmer='Aidan Seaton',age='13',club=club,time=t,course='LCM',meet_name=meet,race_date=start,round=round_name,source_url='https://www.asaj.com.jm/',source_date=end,verified='true',source_pdf='asaj-pdfs/'+path.name,source_page=str(pgno),meet_dates=start if start==end else f'{start} to {end}',date_precision='exact' if start==end else 'meet_range'))
 return rows,problems

def main():
 SRC.mkdir(parents=True,exist_ok=True);WEB.mkdir(parents=True,exist_ok=True)
 allrows=[];rejected=[]
 for path in sorted(SRC.glob('*.pdf')):
  try:
   rows,problems=parse(path)
   if not rows:
    rejected.append((path.name,'No attributable finished races',problems));continue
   allrows+=rows
   rejected.extend((path.name,*p) for p in problems)
   shutil.copy2(path,WEB/path.name)
   print(path.name,':',len(rows),'verified race rows')
  except Exception as exc:
   rejected.append((path.name,str(exc)));print('HELD',path.name,exc)
 # Deduplicate by exact source/round/event/time; preserve preliminary and final swims.
 unique={ (r['source_pdf'],r['event'],r['round'],r['time']):r for r in allrows }
 rows=sorted(unique.values(),key=lambda r:(r['race_date'],r['meet_name'],r['event'],r['round'],r['time']))
 with OUT.open('w',newline='') as f:
  writer=csv.DictWriter(f,fieldnames=FIELDS);writer.writeheader();writer.writerows(rows)
 review=ROOT/'review/asaj';review.mkdir(parents=True,exist_ok=True)
 (review/'pdf_import_report.txt').write_text('Published race rows: '+str(len(rows))+'\n\nHeld mentions/files:\n'+'\n'.join(map(str,rejected))+'\n')
 print('Total verified rows:',len(rows),'held findings:',len(rejected))
 if not rows:sys.exit('No verified races extracted; publication blocked')
if __name__=='__main__':main()
