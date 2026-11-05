"""Presentation-ready, evidence-only qualifying-period rivals view.

All arithmetic uses the exact hundredth-second values in ASAJ source rows.
A calculated position is never an official selection ranking.
"""
from collections import Counter, defaultdict
from decimal import Decimal, ROUND_HALF_UP


def s(time):
    parts=time.split(':')
    return Decimal(parts[-1])+(Decimal(parts[0])*60 if len(parts)>1 else 0)


def num(x):
    return float(x.quantize(Decimal('0.000001')))


def shown(x):
    return str(x.quantize(Decimal('.01'),rounding=ROUND_HALF_UP))


def name_parts(raw):
    if ',' in raw:
        last, given=(x.strip() for x in raw.split(',',1))
        return given.split()[0],last
    parts=raw.split()
    return parts[0],parts[-1]


def anonymize(rows):
    # First given name plus surname initial; collisions within the same event
    # expand to two surname letters. Do not emit original names in rivals_view.
    distinct={r['name'] for r in rows if not r['is_aidan']}
    bases=Counter((name_parts(n)[0].casefold(),name_parts(n)[1][:1].casefold()) for n in distinct)
    out=[]
    for r in rows:
        row={k:v for k,v in r.items() if k!='name'}
        if r['is_aidan']:row['short_name']='Aidan S.'
        else:
            first,last=name_parts(r['name'])
            length=2 if bases[(first.casefold(),last[:1].casefold())]>1 else 1
            row['short_name']=first+' '+last[:length]+'.'
        out.append(row)
    return out


def make_view(events, ladders, all_intel, conflicts, cutoff='2026-07-01'):
    grouped={'top_two':[],'close':[],'needs_swim':[]}
    watch=defaultdict(lambda:{'events':[],'count':0})
    for event in events:
        rows=sorted(ladders.get(event,[]),key=lambda r:(s(r['time']),r['name']))
        rows=anonymize([{**r,'rank':i+1} for i,r in enumerate(rows)])
        aidan=next((r for r in rows if r['is_aidan']),None)
        count=len(rows);second=rows[1] if count>=2 else None;third=rows[2] if count>=3 else None
        card={'event':event,'count':count,'rank':aidan['rank'] if aidan else None,'small_field':count<=5,
              'ladder':(rows[:5]+([aidan] if aidan and aidan['rank']>5 else [])) if aidan else [],
              'aidan':aidan,'second':second,'third':third}
        if aidan and aidan['rank']<=2:
            # Safety margin is measured against actual third place, not second.
            margin=s(third['time'])-s(aidan['time']) if third else None
            pct=margin/s(third['time'])*100 if third else None
            strong=pct is not None and pct>=5
            label=('Leading' if strong else 'Leading, keep pushing') if aidan['rank']==1 else ('Safe spot' if strong else 'Tight spot')
            card.update(kind='top_two',label=label,tier='green' if strong else 'amber',
                        margin_seconds=num(margin) if margin is not None else None,
                        margin_pct=num(pct) if pct is not None else None,
                        bar_pct=num(min(pct/Decimal(12)*100,Decimal(100))) if pct is not None else None)
        elif aidan:
            # Chase gap is relative to second place; 10% behind makes bar empty.
            gap=s(aidan['time'])-s(second['time']) if second else None
            pct=gap/s(second['time'])*100 if second else None
            close=max(Decimal(0),Decimal(100)-pct*10) if pct is not None else None
            label='So close' if pct is not None and pct<=1 else 'Reachable' if pct is not None and pct<=5 else 'Long way'
            card.update(kind='close',label=label,tier='green' if pct is not None and pct<=1 else 'amber' if pct is not None and pct<=5 else 'orange',
                        gap_seconds=num(gap) if gap is not None else None,gap_pct=num(pct) if pct is not None else None,bar_pct=num(close) if close is not None else None)
        else:
            # An earlier best is contextual only, never an eligible result.
            earlier=all_intel.get(event,{}).get('aidan')
            earlier=({k:earlier.get(k) for k in ('time','source_pdf','source_page')} if earlier and earlier.get('source_pdf') and earlier.get('source_page') else None)
            valid=count>=5 and second is not None
            off=(s(earlier['time'])-s(second['time']))/s(second['time'])*100 if valid and earlier else None
            card.update(kind='needs_swim',label='Needs a new swim',tier='amber',time_to_beat=second if valid else None,
                        earlier_best=earlier,percent_off=num(off) if off is not None else None,
                        insufficient_data=not valid,insufficient_text=f'Only {count} swimmers have results since 1 July.' if not valid else None)
        grouped[card['kind']].append(card)
        if count>=3:
            for row in rows[:2]:
                info=watch[row['short_name']];info['count']+=1;info['events'].append(event)
    grouped['top_two'].sort(key=lambda x:(x['margin_pct'] is None,-(x['margin_pct'] or 0)))
    grouped['close'].sort(key=lambda x:x['gap_pct'] if x['gap_pct'] is not None else float('inf'))
    grouped['needs_swim'].sort(key=lambda x:(x['insufficient_data'],x['percent_off'] if x['percent_off'] is not None else float('inf')))
    chases=grouped['close']
    excluded=[]
    for c in conflicts:
        dates=c['history_dates']+[v[k] for v in c['competitor_ranges'] for k in ('start','end')]
        if min(dates)<cutoff<=max(dates) and not c.get('resolved'):excluded.append(c['meet'])
    return {'groups':grouped,'summary':{'top_two_count':len(grouped['top_two']),
        'events_with_eligible_results':len(grouped['top_two'])+len(grouped['close']),
        'closest_chase':{'event':chases[0]['event'],'gap_seconds':chases[0]['gap_seconds']} if chases else None,
        'needs_swim_count':len(grouped['needs_swim'])},
        'watch':[{'short_name':k,**v} for k,v in sorted(watch.items(),key=lambda x:(-x[1]['count'],x[0])) if v['count']>=2][:4],
        'excluded_meets':excluded}
