#!/usr/bin/env python3
"""Discover ASAJ publications, extract REVIEW-ONLY candidates; never alter live CSVs.

All outputs are untrusted proposals. A human must check original documents before
moving any numeric value into data/*.csv with verified=true.
"""
import argparse
import hashlib
import io
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse, urldefrag

import requests
from bs4 import BeautifulSoup
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
STAGING = ROOT / 'review' / 'asaj'
INDEX = STAGING / 'index.json'
SOURCES = {
    'rankings': 'https://asaj.com.jm/rankings',
    'resources': 'https://www.asaj.com.jm/resources',
    'events': 'https://www.asaj.com.jm/events/aggregator',
    'calendar': 'https://www.asaj.com.jm/calendar/2027',
}
HOSTS = {'asaj.com.jm', 'www.asaj.com.jm', 'liveresults.asaj.com.jm'}
EVENTS = ['50 Free','100 Free','100 Back','200 Breast','100 Fly','200 Fly','200 IM','400 IM']
MAX_PDFS = 20
MAX_BYTES = 15_000_000
TIMEOUT = 25

def official(url):
    p = urlparse(url)
    return p.scheme == 'https' and p.hostname in HOSTS

def get(session, url):
    if not official(url):
        raise ValueError('Not an approved official ASAJ URL: ' + url)
    response = session.get(url, timeout=TIMEOUT, allow_redirects=True, stream=True)
    response.raise_for_status()
    if not official(response.url):
        raise ValueError('Redirected outside official ASAJ domains: ' + response.url)
    chunks, size = [], 0
    for chunk in response.iter_content(65536):
        size += len(chunk)
        if size > MAX_BYTES:
            raise ValueError('Document too large')
        chunks.append(chunk)
    return response.url, b''.join(chunks)

def normalize(url):
    return urldefrag(url)[0]

def discover(html, base):
    soup = BeautifulSoup(html, 'html.parser')
    out = []
    for a in soup.select('a[href]'):
        url = normalize(urljoin(base, a['href']))
        if not official(url):
            continue
        label = ' '.join(a.get_text(' ', strip=True).split())[:160]
        if not label:
            label = urlparse(url).path.rsplit('/', 1)[-1]
        if re.search(r'\.pdf(?:\?|$)', url, re.I) or re.search(r'rank|carifta|qualif|select|result|meet|calendar', label, re.I):
            out.append({'url':url,'title':label})
    return sorted({x['url']:x for x in out}.values(), key=lambda x:x['url'])

def extract_candidates(pdf_bytes):
    reader = PdfReader(io.BytesIO(pdf_bytes))
    lines = []
    for i, page in enumerate(reader.pages[:100], 1):
        text = page.extract_text() or ''
        for line in text.splitlines():
            if re.search(r'\bAidan\s+Seaton\b', line, re.I):
                lines.append({'page':i,'text':line.strip()[:350]})
    return {'pages':len(reader.pages),'aidan_mentions':lines[:100],
            'extraction_note':'Candidate text only. Check original PDF tables, age, event, course and times manually.'}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--max-pdfs', type=int, default=MAX_PDFS)
    args = ap.parse_args()
    STAGING.mkdir(parents=True, exist_ok=True)
    previous = json.loads(INDEX.read_text()) if INDEX.exists() else {'documents':{}}
    previous_docs = previous.get('documents', {})
    documents = dict(previous_docs)
    failures = []
    session = requests.Session()
    session.headers['User-Agent'] = 'AidanCARIFTA-OfficialPublicationMonitor/1.0 (manual review; noncommercial)'
    pdfs = []
    for category, source in SOURCES.items():
        try:
            final, raw = get(session, source)
            links = discover(raw.decode('utf-8', errors='replace'), final)
            digest = hashlib.sha256(raw).hexdigest()
            documents[source] = {'category':category,'title':'ASAJ listing: '+category,'sha256':digest,
                                 'content_type':'html','links':links,'review_status':'listing_only'}
            for link in links:
                if re.search(r'\.pdf(?:\?|$)',link['url'],re.I):
                    pdfs.append((category,link))
        except Exception as exc:
            failures.append({'url':source,'error':str(exc)[:300]})
    seen = set()
    for category, link in pdfs:
        url = link['url']
        if url in seen: continue
        seen.add(url)
        if len(seen) > args.max_pdfs: break
        try:
            _, raw = get(session, url)
            if not raw.startswith(b'%PDF'):
                raise ValueError('Not a PDF document')
            digest = hashlib.sha256(raw).hexdigest()
            if documents.get(url,{}).get('sha256') == digest: continue
            details = extract_candidates(raw)
            documents[url] = {'category':category,'title':link['title'],'sha256':digest,
                              'content_type':'pdf','review_status':'needs_human_review',**details}
        except Exception as exc:
            failures.append({'url':url,'error':str(exc)[:300]})
    changed = sorted(k for k,v in documents.items() if previous_docs.get(k) != v)
    # Deterministic output: no volatile timestamp in tracked data.
    output = {'athlete_identity':'Aidan Seaton','identity_policy':'Club, school and national affiliation do not restrict matching.',
              'documents':dict(sorted(documents.items())),
              'new_or_changed_documents':changed,
              'review_policy':'No extracted figures are published automatically. Inspect the original ASAJ PDF and manually approve CSV changes.'}
    INDEX.write_text(json.dumps(output,indent=2,ensure_ascii=False)+'\n')
    print(f'Checked {len(SOURCES)} listings; indexed {len(documents)} records; {len(changed)} new/changed; {len(failures)} retrieval failures')
    if failures:
        print('Retrieval warnings:', json.dumps(failures,indent=2))
    # Fail if all source pages unavailable. Partial failures must not erase existing records.
    if len(failures) >= len(SOURCES) and not any(k in documents for k in SOURCES):
        raise SystemExit('All official source listings unavailable; preserved previous records')

if __name__ == '__main__':
    main()
