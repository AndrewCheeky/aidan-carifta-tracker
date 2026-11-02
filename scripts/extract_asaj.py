#!/usr/bin/env python3
"""Review-only parser for official ASAJ HY-TEK top-ten rankings and CARIFTA tables."""
import io, re
from pypdf import PdfReader

EVENTS = {'FREE':'Free','FREESTYLE':'Free','BACK':'Back','BACKSTROKE':'Back','BREAST':'Breast','BREASTSTROKE':'Breast','FLY':'Fly','BUTTERFLY':'Fly','IM':'IM','I MEDLEY':'IM','INDIVIDUAL MEDLEY':'IM'}
HEADING = re.compile(r'^\s*(Boys|Girls)\s+(\d+)(?:\s*[-–]\s*(\d+)|\s*&\s*Under)?\s+(50|100|200|400|800|1500)\s*m?\s+(Free(?:style)?|Back(?:stroke)?|Breast(?:stroke)?|Fly|Butterfly|IM)\s*$',re.I)
RANK_ROW = re.compile(r'^\s*(\d{1,2})\*?\s+(\d\d/\d\d/\d{4})\s+(.+)$')
ATHLETE = re.compile(r'Aidan\s+Seaton',re.I)
TIME = re.compile(r'(?<![\d:])(?:\d{1,2}:)?\d{1,2}\.\d{2}(?!\d)')
STD_ROW = re.compile(r'^\s*(50|100|200|400|800|1500)\s*m?\s+(FREESTYLE|BACKSTROKE|BREASTSTROKE|BUTTERFLY|I\s+MEDLEY)\s+(.+)$',re.I)
STD_TIME = re.compile(r'\d{2}:\d{2}\.\d{2}')

def extract(pdf_bytes, source_url, digest, category):
    reader = PdfReader(io.BytesIO(pdf_bytes)); out=[]
    for page_no,page in enumerate(reader.pages,1):
        # Plain extraction preserves the HY-TEK row sequence; layout mode may create enormous whitespace.
        lines=(page.extract_text() or '').splitlines()
        group=None; event=None
        is_standards=any('QUALIFYING LONG COURSE STANDARDS - CARIFTA 2027' in s.upper() for s in lines)
        for line_no,raw in enumerate(lines,1):
            s=' '.join(raw.split()); heading=HEADING.fullmatch(s)
            if heading:
                sex,lo,hi,dist,stroke=heading.groups()
                group={'gender':sex,'age_group':f'{lo}-{hi}' if hi else (f'{lo} & Under' if 'Under' in s else lo)}
                event=f'{dist} {EVENTS[stroke.upper()]}'
                continue
            if is_standards:
                m=STD_ROW.match(s)
                if m:
                    dist,stroke,tail=m.groups(); vals=STD_TIME.findall(tail)
                    # 12 columns for ordinary rows; 8 for 800/1500 (11-12 blank).
                    offset=4 if dist in ('800','1500') and len(vals)==8 else 0
                    if len(vals) not in (8,12): continue
                    j=6-offset
                    out.append({'kind':'carifta_2027_boys_13_14_standard','event':f'{dist} {EVENTS[stroke.upper().replace("  "," ")]}',
                                'age_group':'13-14','gender':'Boys','course':'LCM',
                                'a_time':vals[j][1:] if vals[j].startswith('0') else vals[j], 'b_time':vals[j+1][1:] if vals[j+1].startswith('0') else vals[j+1],
                                'page':page_no,'line':line_no,'evidence':s[:350],
                                'source_url':source_url,'sha256':digest,'verified':False,
                                'review_reason':'Confirm ASAJ CARIFTA 2027 Boys 13-14 A/B columns before approval.'})
                continue
            if group and event and ATHLETE.search(s) and not RANK_ROW.match(s):
                out.append({'kind':'aidan_result_candidate','event':event,'age_group':group['age_group'],
                            'times_on_line':TIME.findall(s),'page':page_no,'line':line_no,
                            'evidence':s[:350],'source_url':source_url,'sha256':digest,
                            'verified':False,'review_reason':'Non-HY-TEK row, manually verify result.'})
                continue
            if not group or not event:
                # Generic meet PDFs: preserve name-bearing evidence without inventing event context.
                if ATHLETE.search(s):
                    out.append({'kind':'aidan_result_candidate','event':event,'age_group':group['age_group'] if group else None,
                                'times_on_line':TIME.findall(s),'page':page_no,'line':line_no,
                                'evidence':s[:350],'source_url':source_url,'sha256':digest,
                                'verified':False,'review_reason':'Confirm result versus seed, course, event and age.'})
                continue
            m=RANK_ROW.match(s)
            if not m: continue
            rank,date,tail=m.groups()
            # HY-TEK's standard extraction can concatenate meet, club, name and age.
            # Restrict athlete results to a name followed by an age and time, and L course marker.
            name=ATHLETE.search(tail)
            if name:
                suffix=tail[name.end():]
                age_time=re.search(r'^\s*(\d{1,2})\s*('+TIME.pattern+r')\s+L\b',suffix)
                if not age_time: continue
                age,swim_time=age_time.group(1,2)
                out.append({'kind':'aidan_rank','event':event,**group,'rank':int(rank),'swimmer':'Aidan Seaton',
                            'age':int(age),'time':swim_time,'course':'LCM','result_date':date,
                            'page':page_no,'line':line_no,'evidence':s[:350],
                            'source_url':source_url,'sha256':digest,'verified':False,
                            'review_reason':'Verify original HY-TEK table, result and source URL before publishing.'})
            # Capture all ranked 11-12 swimmers aged exactly 12, for review and future comparisons.
            if group['gender'].lower()=='boys' and group['age_group']=='11-12':
                # Only stage a row if its age/time/course and name can be parsed confidently.
                mt=re.search(r'([A-Za-z][A-Za-z\-\' ]{2,}?)\s+(12)\s*('+TIME.pattern+r')\s+L\b',tail)
                if mt:
                    out.append({'kind':'boys_age_12_rank','event':event,**group,'rank':int(rank),
                                'unresolved_name_field':mt.group(1).strip()[-90:],'age':12,'time':mt.group(3),'course':'LCM',
                                'result_date':date,'page':page_no,'line':line_no,'evidence':s[:350],
                                'source_url':source_url,'sha256':digest,'verified':False,
                                'review_reason':'Review name boundary and rank against original HY-TEK table.'})
    return out
