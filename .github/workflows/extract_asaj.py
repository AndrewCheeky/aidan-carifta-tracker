#!/usr/bin/env python3
"""Conservative, review-only extraction from ASAJ PDF documents.

Never marks extracted data verified. Ambiguous event/course/age remain unknown.
"""
import io
import re
from pypdf import PdfReader

EVENT_PATTERNS = [
    ('50 Free', r'\b50\s*(?:m|meter|metre)?\s*free(?:style)?\b'),
    ('100 Free', r'\b100\s*(?:m|meter|metre)?\s*free(?:style)?\b'),
    ('100 Back', r'\b100\s*(?:m|meter|metre)?\s*back(?:stroke)?\b'),
    ('200 Breast', r'\b200\s*(?:m|meter|metre)?\s*breast(?:stroke)?\b'),
    ('100 Fly', r'\b100\s*(?:m|meter|metre)?\s*(?:fly|butterfly)\b'),
    ('200 Fly', r'\b200\s*(?:m|meter|metre)?\s*(?:fly|butterfly)\b'),
    ('200 IM', r'\b200\s*(?:m|meter|metre)?\s*(?:IM|individual\s+medley)\b'),
    ('400 IM', r'\b400\s*(?:m|meter|metre)?\s*(?:IM|individual\s+medley)\b'),
]
TIME = re.compile(r'(?<![\d:])(?:[0-9]{1,2}:)?[0-5]?[0-9]\.\d{2}(?!\d)')
NAME = re.compile(r'\bAidan\s+Seaton\b', re.I)
AGE12 = re.compile(r'\b(?:boys?|male)\s*(?:age\s*)?12\b|\b12\s*(?:years?|yr)\s*(?:old)?\s*(?:boys?|male)\b', re.I)
AGE1314 = re.compile(r'\b(?:boys?|male)\s*(?:age\s*)?13\s*[-–/]\s*14\b', re.I)

def extract(pdf_bytes, source_url, digest, category):
    reader = PdfReader(io.BytesIO(pdf_bytes))
    candidates = []
    for page_no, page in enumerate(reader.pages, 1):
        lines = (page.extract_text(extraction_mode='layout') or '').splitlines()
        event = None
        age_group = None
        for line_no, line in enumerate(lines, 1):
            s = ' '.join(line.split())
            if not s:
                continue
            hits = [label for label, pat in EVENT_PATTERNS if re.search(pat, s, re.I)]
            if len(hits) == 1:
                event = hits[0]
            elif len(hits) > 1:
                event = None
            if AGE12.search(s): age_group = '12'
            elif AGE1314.search(s): age_group = '13-14'
            # Name-bearing lines only: no cross-row time assignment.
            if NAME.search(s):
                times = TIME.findall(s)
                candidates.append({
                    'kind':'aidan_result_candidate', 'event':event if len(hits) <= 1 else None,
                    'age_group':age_group, 'times_on_line':times,
                    'page':page_no, 'line':line_no, 'evidence':s[:400],
                    'source_url':source_url, 'sha256':digest, 'source_category':category,
                    'verified':False, 'review_reason':'Confirm result vs seed, event, age, course, affiliation and time against original PDF.'
                })
            # Standards cannot safely be assigned from arbitrary PDF table rows.
            # Flag likely lines for manual checking, not structured qualification times.
            elif category == 'resources' and ('qualif' in s.lower() or 'standard' in s.lower()) and len(TIME.findall(s)):
                candidates.append({'kind':'standards_table_candidate', 'event':event,
                                   'page':page_no, 'line':line_no, 'evidence':s[:400],
                                   'source_url':source_url, 'sha256':digest, 'verified':False,
                                   'review_reason':'Confirm 2027, Boys 13-14, LCM, standard type and column alignment.'})
    return candidates
