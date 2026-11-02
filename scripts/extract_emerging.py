#!/usr/bin/env python3
"""Extract official Boys 11-12 top-ten age-12 rows, never infer missing rankings."""
import csv,re
from pathlib import Path
import fitz
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'reference/asaj/General Rankings 29-09-2026.pdf'
url='https://asaj.com.jm/swimming/general-rankings-29-09-2026.pdf/@@download/file'
records=[];section=None
pattern=re.compile(r'^([1-9]|10)\s*\n(\d{2}/\d{2}/\d{4}[^\n]*)\n([A-Z0-9-]+)\n([^\n]+)\n(\d{1,2})\n\s*((?:\d+:)?\d{1,2}\.\d{2}) L',re.M)
for page in fitz.open(source):
    text=page.get_text()
    boundaries=list(re.finditer(r'Boys (11-12|13-14) (50|100|200|400|800|1500) (Free|Back|Breast|Fly|IM)',text))
    # carry forward section from preceding page
    previous=0
    for boundary in boundaries+[None]:
        chunk=text[previous:boundary.start() if boundary else len(text)]
        if section and section[0]=='11-12':
            for m in pattern.finditer(chunk):
                rank,meet,club,name,age,time=m.groups()
                if age!='12':continue
                event=section[1]+' '+section[2]
                records.append(dict(event=event,swimmer=name.strip(),age=age,club=club,rank=rank,time=time,course='LCM',source_url=url,source_date='2026-09-29',verified='true'))
        if boundary:
            section=boundary.groups();previous=boundary.end()
with (ROOT/'data/emerging_boys12.csv').open('w',newline='') as f:
    writer=csv.DictWriter(f,fieldnames=['event','swimmer','age','club','rank','time','course','source_url','source_date','verified']);writer.writeheader();writer.writerows(records)
print('Extracted',len(records),'official Boys 11-12 age-12 rankings')
