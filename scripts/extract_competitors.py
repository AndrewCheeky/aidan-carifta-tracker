#!/usr/bin/env python3
"""Extract explicitly gendered individual HY-TEK result rows from local ASAJ PDFs.
Mixed-sex heats are held rather than guessing gender. Meet-range dates are not race dates.
"""
import csv,re
from pathlib import Path
from datetime import datetime
import fitz
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'sources/asaj/2026'
OUT=ROOT/'data/asaj_competitor_results.csv'
FIELDS=['event','swimmer','gender','age','club','time','course','meet_name','meet_start','meet_end','round','source_pdf','source_page','source_url','verified','date_precision']
EVENT=re.compile(r'^#\s*\d+\s+(Boys|Girls|Mixed)(?:\s+\S+)?\s+(50|100|200|400|800|1500)\s+Meter\s+(Free|Back|Breast|Fly|IM)\b',re.I)
# Age group headings may contain 11-12 or 13-14; parse event from the end of the heading instead.
EVENT=re.compile(r'^#\s*\d+\s+(Boys|Girls|Mixed).*?\b(50|100|200|400|800|1500)\s+Meter\s+(Free|Back|Breast|Fly|IM)\b',re.I)
ROW=re.compile(r'^\s*\d+\s+(.+?,\s*[^,]+?)\s+(\d{1,2})\s+([A-Z0-9-]{2,12})\s+((?:\d+:)?\d{1,2}\.\d{2})\s*$')
DATE=re.compile(r'(\d{1,2}/\d{1,2}/2026)(?:\s+to\s+(\d{1,2}/\d{1,2}/2026))?')
def parse(path):
 doc=fitz.open(path); first=doc[0].get_text(sort=True);head='\n'.join(first.splitlines()[:5]);match=DATE.search(head)
 if not match or not re.search(r'\bResults\b',head,re.I):raise ValueError('Unverified meet header')
 dayfirst='Walter Rogers' in head
 def iso(s):return datetime.strptime(s,'%d/%m/%Y' if dayfirst else '%m/%d/%Y').date().isoformat()
 start,end=iso(match.group(1)),iso(match.group(2) or match.group(1))
 meet=first.splitlines()[2].split(' - ')[0].strip()
 rows=[];held=0
 for page_num,page in enumerate(doc,1):
  for col in range(3):
   lines=page.get_text(clip=fitz.Rect(col*page.rect.width/3+3,57,(col+1)*page.rect.width/3-3,page.rect.height-12),sort=True).splitlines()
   event=None;gender=None;round_name='Finals'
   for line in lines:
    em=EVENT.search(line.strip())
    if em:
     gender,dist,stroke=em.groups();event=f'{dist} {stroke.upper() if stroke.lower()=="im" else stroke.title()}'
     round_name='Preliminaries' if 'Prelim' in line else 'Finals'
     continue
    if 'Prelim Time' in line or line.strip()=='Preliminaries':round_name='Preliminaries'
    elif 'Finals Time' in line or line.strip()=='Finals':round_name='Finals'
    rm=ROW.match(line)
    if not rm:continue
    if not event or gender=='Mixed':held+=1;continue
    name,age,club,time=rm.groups()
    # Only complete ranked individual rows, with explicit gender and a finish time.
    rows.append(dict(event=event,swimmer=' '.join(name.split()),gender=gender,age=age,club=club,time=time,course='LCM',meet_name=meet,meet_start=start,meet_end=end,round=round_name,source_pdf='asaj-pdfs/'+path.name,source_page=str(page_num),source_url='https://www.asaj.com.jm/',verified='true',date_precision='exact' if start==end else 'meet_range'))
 return rows,held

def main():
 allrows=[];held=[]
 for path in sorted(SRC.glob('*.pdf')):
  try:
   rows,n=parse(path);allrows.extend(rows);held.append(f'{path.name}: {len(rows)} rows, {n} mixed/unattributed held')
  except Exception as exc:held.append(f'{path.name}: held, {exc}')
 # One physical race appears once, even if PDF extraction repeats it.
 unique={(r['source_pdf'],r['source_page'],r['event'],r['swimmer'],r['round'],r['time']):r for r in allrows}
 with OUT.open('w',newline='') as f:
  w=csv.DictWriter(f,fieldnames=FIELDS);w.writeheader();w.writerows(sorted(unique.values(),key=lambda r:(r['meet_start'],r['event'],r['swimmer'],r['round'])))
 (ROOT/'review/asaj/competitor_import_report.txt').write_text('\n'.join(held)+f'\nTotal: {len(unique)} rows\n')
 print('\n'.join(held));print('Published competitor rows:',len(unique))
if __name__=='__main__':main()
