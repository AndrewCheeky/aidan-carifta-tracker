#!/usr/bin/env python3
"""Discover official 2026 ASAJ result PDFs and stage evidence, never publish guesses."""
import argparse, hashlib, io, json, re, sys
from pathlib import Path
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'review/asaj/full_year_2026.json'
LISTINGS=['https://www.asaj.com.jm/events','https://www.asaj.com.jm/resources','https://www.asaj.com.jm/calendar/2026','https://www.asaj.com.jm/events/aggregator']
ALLOWED={'asaj.com.jm','www.asaj.com.jm','liveresults.asaj.com.jm'}
NAME=re.compile(r'\bAidan\s+Seaton\b',re.I)
RESULT=re.compile(r'results?|final|session|meet|championship|invitational|development',re.I)
YEAR=re.compile(r'2026|26(?:[-_ ]|%20)',re.I)
PDF=re.compile(r'\.pdf(?:/|$)',re.I)

def safe(url):
    p=urlparse(url)
    return p.scheme=='https' and p.hostname in ALLOWED

def download(session,url,limit=18000000):
    if not safe(url): raise ValueError('Non-ASAJ URL')
    with session.get(url,timeout=35,stream=True) as r:
        r.raise_for_status()
        if not safe(r.url): raise ValueError('Redirect outside ASAJ')
        chunks=[]; n=0
        for chunk in r.iter_content(65536):
            n+=len(chunk)
            if n>limit: raise ValueError('Too large')
            chunks.append(chunk)
        return r.url,b''.join(chunks)

def pdf_url(url):
    m=PDF.search(urlparse(url).path)
    if not m:return None
    p=urlparse(url)
    return f'{p.scheme}://{p.netloc}{p.path[:m.start()+4]}/@@download/file'

def discover(session):
    urls={}; errors=[]
    for listing in LISTINGS:
        try:
            final,body=download(session,listing)
            soup=BeautifulSoup(body,'html.parser')
            for a in soup.select('a[href]'):
                href=urljoin(final,a['href']); title=a.get_text(' ',strip=True)
                if not safe(href):continue
                target=pdf_url(href)
                if target and YEAR.search(href+' '+title) and RESULT.search(href+' '+title):
                    urls[target]={'url':target,'title':title or href,'discovered_from':listing}
        except Exception as e:errors.append({'listing':listing,'error':str(e)[:180]})
    return list(urls.values()),errors

def evidence(pdf,source):
    reader=PdfReader(io.BytesIO(pdf)); hits=[]; page_errors=[]
    for page_num,page in enumerate(reader.pages,1):
        try: lines=(page.extract_text(extraction_mode='layout') or '').splitlines()
        except Exception:
            try:lines=(page.extract_text() or '').splitlines()
            except Exception as e:page_errors.append({'page':page_num,'error':str(e)[:120]});continue
        for i,line in enumerate(lines):
            if NAME.search(line):
                # Context is evidence only: never infer event, race, or time from adjacent text.
                hits.append({'page':page_num,'line':i+1,'context':'\n'.join(x.strip() for x in lines[max(0,i-4):min(len(lines),i+5)])[:1300],
                             'review_status':'UNVERIFIED','note':'Confirm event, swim time, date, course and final/heat vs seed in original PDF'})
    return {'pages':len(reader.pages),'aidan_mentions':hits,'page_errors':page_errors}

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--max-pdfs',type=int,default=75)
    ap.add_argument('--pdf',action='append',default=[],help='Official locally supplied meet-results PDF for additional review')
    args=ap.parse_args();session=requests.Session();session.headers['User-Agent']='AidanASAJ2026Review/1.0'
    found,errors=discover(session); documents=[]
    for item in found[:args.max_pdfs]:
        try:
            _,raw=download(session,item['url'])
            if not raw.startswith(b'%PDF'):raise ValueError('Not PDF bytes')
            documents.append({**item,'sha256':hashlib.sha256(raw).hexdigest(),**evidence(raw,item['url'])})
        except Exception as e:errors.append({'url':item['url'],'error':str(e)[:180]})
    for path in args.pdf:
        f=Path(path);raw=f.read_bytes()
        if not raw.startswith(b'%PDF'):raise ValueError(f'Not PDF: {f}')
        documents.append({'url':'local-review:'+f.name,'title':f.name,'sha256':hashlib.sha256(raw).hexdigest(),**evidence(raw,str(f))})
    OUT.parent.mkdir(parents=True,exist_ok=True)
    payload={'year':2026,'swimmer':'Aidan Seaton','status':'REVIEW_ONLY','discovery_limit':args.max_pdfs,
             'discovered_pdf_count':len(found),'processed_pdf_count':len(documents),
             'total_aidan_mentions':sum(len(d['aidan_mentions']) for d in documents),
             'documents':documents,'retrieval_warnings':errors,
             'publication_policy':'Evidence is not a race result. Confirm each swim against original official results before entering data/race_history_2026.csv.'}
    OUT.write_text(json.dumps(payload,indent=2,ensure_ascii=False)+'\n')
    print(f"2026 official PDFs discovered: {len(found)}; processed: {len(documents)}; Aidan mentions: {payload['total_aidan_mentions']}; warnings: {len(errors)}")
    for d in documents:print(f"{d['title'][:85]}: {len(d['aidan_mentions'])} mentions")
    if errors:print('Warnings:',json.dumps(errors[:15],indent=2))
if __name__=='__main__':main()
