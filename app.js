/* Single authoritative UI source: root app.js; scripts/build.py publishes docs/app.js. */
'use strict';
let DATA=null, COMPETITORS=null, TAB='today', SNAPSHOTS=[], EVENT_FILTER='all';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const secs=t=>{if(!t)return null;const s=String(t).trim(),p=s.split(':');if(p.length>2||!p.every(v=>/^\d+(?:\.\d+)?$/.test(v)))return null;return p.reduce((a,b)=>a*60+Number(b),0)};
const time=n=>Number.isFinite(n)?(n>=60?`${Math.floor(n/60)}:${(n%60).toFixed(2).padStart(5,'0')}`:`${n.toFixed(2)}s`):'—';
const gap=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)?Math.max(0,a-b):null;
const gapText=n=>Number.isFinite(n)?(n===0?'0.00s to go':`${n.toFixed(2)}s to go`):'Not available';
const a=(url,label,page)=>url?`<a href="${esc(url)}${page?'#page='+encodeURIComponent(page):''}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`:'Source not supplied';
const pdf=(path,label,page)=>path?a(path,label,page):'Source not supplied';
const source=e=>e.pb_evidence_pdf?pdf(e.pb_evidence_pdf,'ASAJ result',e.pb_evidence_page):a(e.pb_source,'ASAJ ranking source');
const standard=e=>e.standards?.B;
const calculated=e=>DATA?.calculated_intelligence?.[e.event]||null;
const currentPB=e=>calculated(e)?.aidan?.time||e.personal_best;
const currentSecond=e=>calculated(e)?.second;
const second=e=>currentSecond(e)||e.second_place;
const snapshotGap=e=>gap(secs(currentPB(e)),secs(currentSecond(e)?.time));
const standardGap=e=>gap(secs(currentPB(e)),secs(standard(e)?.time));
const qi=e=>DATA?.qualifying_intelligence?.[e.event]||null;
const eligible=e=>qi(e)?.aidan||null;
const eligibleGap=e=>eligible(e)?gap(secs(eligible(e).time),secs(standard(e)?.time)):null;
const qualifyingSecondGap=e=>eligible(e)&&qi(e)?.second?gap(secs(eligible(e).time),secs(qi(e).second.time)):null;
const secured=e=>!!eligible(e)&&eligibleGap(e)===0&&qi(e)?.rank!==null&&qi(e)?.rank<=2;
const needsFresh=e=>!eligible(e);
const byPriority=()=>DATA.events.filter(e=>!secured(e)&&eligible(e)&&standard(e)&&qi(e)?.second).map(e=>({...e,bGap:eligibleGap(e),sGap:qualifyingSecondGap(e)})).filter(e=>e.bGap!==null&&e.sGap!==null).sort((x,y)=>(x.bGap+x.sGap)-(y.bGap+y.sGap));
const dateText=s=>s?new Date(`${s}T12:00:00`).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'Date unavailable';
function datedSwims(e){return (DATA.race_history_2026||[]).filter(r=>r.event===e.event&&r.course==='LCM'&&r.source_pdf&&r.date_precision==='exact'&&r.race_date?.startsWith('2026')&&secs(r.time)!==null).sort((x,y)=>x.race_date.localeCompare(y.race_date));}
function improvement(e){const rows=datedSwims(e);if(rows.length<2)return null;const first=secs(rows[0].time),best=Math.min(...rows.map(r=>secs(r.time)));return {delta:first-best,baseline:first,first:rows[0],best};}
function progress(e){const imp=improvement(e),b=secs(standard(e)?.time);if(!imp||!Number.isFinite(b)||imp.baseline<=b)return null;const current=imp.best;return Math.max(0,Math.min(100,(imp.baseline-current)/(imp.baseline-b)*100));}
function nextMeet(){const today=new Date();today.setHours(0,0,0,0);return (DATA.meets||[]).find(m=>new Date(m.end+'T23:59:59')>=today)}
function meetCountdown(m){if(!m)return null;const now=new Date();now.setHours(0,0,0,0);return Math.max(0,Math.ceil((new Date(m.start+'T00:00:00')-now)/86400000))}
function focus(){return byPriority().slice(0,3)}
function competitorSource(r,label='ASAJ PDF'){return r?.source_pdf?pdf(r.source_pdf,label,r.source_page):'Source unavailable'}
function trendLabel(r){if(!r||r.change_seconds===null)return 'Not enough dated history';if(r.change_seconds<0)return `${Math.abs(r.change_seconds).toFixed(2)}s faster across dated meets`;if(r.change_seconds>0)return `${r.change_seconds.toFixed(2)}s slower across dated meets`;return 'No change across dated meets'}
function gapToSecondText(e){
 const q=qi(e),own=eligible(e),runner=q?.second;
 if(!own)return 'No eligible swim yet';
 if(q.rank===1){
  if(runner)return `You're #1 · ${Math.max(0,secs(runner.time)-secs(own.time)).toFixed(2)}s lead`;
  const all=calculated(e)?.second;
  return all?`You're #1 in qualifying data · ${Math.max(0,secs(all.time)-secs(own.time)).toFixed(2)}s lead vs all-date second`:`You're #1 in available qualifying data · no second-place result`;
 }
 return runner?gapText(qualifyingSecondGap(e)):'No qualifying-period second-place benchmark';
}
function eventCard(e){
 const q=qi(e),own=eligible(e),b=eligibleGap(e),s=qualifyingSecondGap(e),all=calculated(e),pb=all?.aidan,pct=progress(e);
 const status=secured(e)?'Secured · B met and calculated top 2':needsFresh(e)?'Needs a fresh swim':b===0?'CARIFTA B standard met':b!==null&&b<=1.5?'Within 1.5s of B':'Keep building';
 const summary=`<div class="event-summary"><span><strong>Qualifying rank:</strong> ${q?.rank?'#'+q.rank+' of '+q.count:'—'}</span><span><strong>To B:</strong> ${b===0?'Standard met':gapText(b)}</span><span><strong>To second:</strong> ${gapToSecondText(e)}</span></div>`;
 return `<article class="event-card" id="event-${esc(e.event.replace(/\s+/g,'-'))}"><h3><a class="event-swim-link" href="#swim" data-swim-event="${esc(e.event)}" aria-label="View ${esc(e.event)} race history in Swim Intelligence">${esc(e.event)} · LCM <span aria-hidden="true">↗</span></a></h3><span class="status-label">${esc(status)}</span>${summary}
 <div class="metric-grid"><div><small>Eligible best (from 1 Jul 2026)</small><strong>${own?esc(own.time):'No eligible swim yet'}</strong><small>${own?`${dateText(own.date)} · ${competitorSource(own,'ASAJ result')}`:''}</small></div>
 <div><small>Overall PB</small><strong>${esc(currentPB(e)||'—')}</strong><small>${pb?.date?dateText(pb.date):'Date not confirmed'} · ${competitorSource(pb,'PB source')}</small></div></div>
 <details><summary>Sources and details</summary><p>All-imported calculated rank: ${all?.rank?'#'+all.rank+' of '+all.count:'—'} · ${competitorSource(pb,'ASAJ source')}</p><p>Official ASAJ rank, 29 Sep 2026: ${e.rank?'#'+e.rank:'—'} · ${a(e.pb_source,'ASAJ snapshot')}</p><p>Qualifying-period calculated rank: ${q?.rank?'#'+q.rank+' of '+q.count:'—'} · ${competitorSource(own,'Eligible source')}</p><p>CARIFTA B benchmark: ${esc(standard(e)?.time||'—')} · ${a(standard(e)?.source_url,'Standard source')}</p><p>Second-place qualifying evidence: ${competitorSource(q?.second,'ASAJ result')}</p><p>All-date leader: ${all?.leader?esc(shortName(all.leader.name))+' · '+esc(all.leader.time):'—'} · ${competitorSource(all?.leader)}</p>${pct===null?'':`<p>Documented improvement toward B: ${pct.toFixed(0)}%</p><div class="bar" role="progressbar" aria-valuenow="${pct.toFixed(0)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct.toFixed(0)}%"></span></div>`}</details></article>`;
}
function shortName(raw){const name=String(raw||'').trim();if(!name)return '—';if(name.toLowerCase().includes('seaton')&&name.toLowerCase().includes('aidan'))return 'Aidan S.';if(name.includes(',')){const [last,first]=name.split(',').map(x=>x.trim());return (first.split(/\s+/)[0]||'Swimmer')+' '+(last[0]||'')+'.'}const bits=name.split(/\s+/);return bits[0]+' '+(bits.at(-1)?.[0]||'')+'.'}

// Five-discipline competitive diagram. Derived solely from verified LCM ranks.
// Score = 100 * (competitors - rank) / (competitors - 1); no ranking => no score.
const DISCIPLINES=[['Freestyle','Free'],['Backstroke','Back'],['Breaststroke','Breast'],['Butterfly','Fly'],['Individual medley','IM']];
function disciplineScores(){return DISCIPLINES.map(([label,stroke])=>{const rows=DATA.events.filter(e=>e.event.endsWith(stroke)||e.event.endsWith(' '+stroke)).map(e=>({event:e.event,rank:calculated(e)?.rank,count:calculated(e)?.count})).filter(r=>r.rank&&r.count>1);if(!rows.length)return {label,score:null,events:[]};return {label,score:rows.reduce((a,r)=>a+100*(r.count-r.rank)/(r.count-1),0)/rows.length,events:rows};});}
function strengthDiagram(){const ds=disciplineScores(),cx=160,cy=150,R=110,pt=(i,r)=>{const angle=-Math.PI/2+i*2*Math.PI/5;return [cx+Math.cos(angle)*r,cy+Math.sin(angle)*r]},poly=points=>points.map(([x,y])=>`${x.toFixed(1)},${y.toFixed(1)}`).join(' ');const rings=[.25,.5,.75,1].map(t=>`<polygon points="${poly(ds.map((_,i)=>pt(i,R*t)))}" fill="none" stroke="#c5dce5" stroke-width="1"/>`).join('');const axes=ds.map((_,i)=>{const [x,y]=pt(i,R);return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#b4d1dc"/>`}).join('');const labels=ds.map((d,i)=>{const [x,y]=pt(i,R+23);return `<text x="${x}" y="${y}" text-anchor="middle" font-size="11" font-weight="650" fill="#16354b">${esc(d.label==='Individual medley'?'IM':d.label)}</text>`}).join('');const valid=ds.filter(d=>d.score!==null);const area=valid.length===5?`<polygon points="${poly(ds.map((d,i)=>pt(i,R*d.score/100)))}" fill="#12a5a255" stroke="#087e88" stroke-width="3"/>`:'';const dots=ds.map((d,i)=>d.score===null?'':(()=>{const [x,y]=pt(i,R*d.score/100);return `<circle cx="${x}" cy="${y}" r="5" fill="#087e88" stroke="white" stroke-width="2"/>`})()).join('');return `<section class="panel strength-panel"><h2>Five-event competitive strength profile</h2><p class="subtle">Freestyle, Backstroke, Breaststroke, Butterfly and IM. Calculated from imported verified ASAJ LCM ranks. Higher means a stronger relative position among documented competitors, not a CARIFTA qualification score.</p><div class="strength-layout"><svg viewBox="0 0 320 310" role="img" aria-label="Five-discipline relative competitive strength diagram">${rings}${axes}${area}${dots}${labels}</svg><div class="strength-legend">${ds.map(d=>`<p><strong>${esc(d.label)}:</strong> ${d.score===null?'Insufficient comparable results':d.score.toFixed(0)+' / 100'} <small>(${d.events.length} evidenced event${d.events.length===1?'':'s'})</small></p>`).join('')}</div></div><p class="subtle">Method: average of (competitors − calculated rank) ÷ (competitors − 1) × 100 across documented events in each discipline. An incomplete discipline is left unscored, never estimated. See Events for the underlying rankings and ASAJ evidence.</p></section>`;}
// Rivals profile: age-at-meet 13-14, age-at-meet 12, or combined. These are
// historical ASAJ age-at-meet cohorts, NOT a forecast of next year's eligibility.
const RIVAL_GROUPS=[['Boys 13–14',new Set([13,14])],['Boys 12',new Set([12])],['Combined Boys 12–14',new Set([12,13,14])]];
function rivalDisciplineScores(group){
 const ages=RIVAL_GROUPS[group]?.[1]||RIVAL_GROUPS[0][1];
 const rows=Array.isArray(COMPETITORS)?COMPETITORS:[];
 return DISCIPLINES.map(([label,stroke])=>{
  const events=[];
  for(const e of DATA.events){
   if(!(e.event.endsWith(stroke)||e.event.endsWith(' '+stroke)))continue;
   const best=new Map();
   for(const r of rows){
    if(r.event!==e.event||r.course!=='LCM'||r.gender!=='Boys'||!ages.has(Number(r.age))||String(r.verified).toLowerCase()!=='true'||!r.source_pdf||!r.source_page)continue;
    const t=secs(r.time);if(t===null)continue;
    const key=String(r.swimmer||'').trim().toLowerCase();if(!key)continue;
    if(!best.has(key)||t<best.get(key).seconds)best.set(key,{name:r.swimmer,time:r.time,seconds:t,source_pdf:r.source_pdf,source_page:r.source_page});
   }
   // Aidan is the benchmark even when his current age is not represented by
   // a particular historical cohort. Do not count him twice.
   for(const key of [...best.keys()])if(key.includes('seaton')&&key.includes('aidan'))best.delete(key);
   const pb=calculated(e)?.aidan,aidanTime=secs(pb?.time);
   if(aidanTime===null||!pb?.source_pdf||!pb?.source_page||best.size===0)continue;
   const competitors=[...best.values()].sort((a,b)=>a.seconds-b.seconds);
   const ahead=competitors.filter(r=>r.seconds<aidanTime).length;
   const rank=ahead+1,count=competitors.length+1;
   const score=100*(count-rank)/(count-1);
   events.push({event:e.event,rank,count,score,pb,leader:competitors[0]});
  }
  return {label,events,score:events.length?events.reduce((sum,r)=>sum+r.score,0)/events.length:null};
 });
}
function rivalsStrengthDiagram(group=0){
 const ds=rivalDisciplineScores(group),cx=160,cy=145,R=105;
 const point=(i,r)=>{const angle=-Math.PI/2+i*2*Math.PI/5;return `${(cx+Math.cos(angle)*r).toFixed(1)},${(cy+Math.sin(angle)*r).toFixed(1)}`};
 const polygon=(values)=>values.map((r,i)=>point(i,r)).join(' ');
 const grid=[.25,.5,.75,1].map(t=>`<polygon points="${polygon(ds.map(()=>R*t))}" fill="none" stroke="#b7d3dc"/>`).join('');
 const axes=ds.map((_,i)=>`<line x1="${cx}" y1="${cy}" x2="${point(i,R).replace(',','" y2="')}" stroke="#b7d3dc"/>`).join('');
 const shape=ds.every(d=>d.score!==null)?`<polygon points="${polygon(ds.map(d=>R*d.score/100))}" fill="#0d948833" stroke="#087e88" stroke-width="3"/>`:'';
 const dots=ds.map((d,i)=>d.score===null?'':`<circle cx="${point(i,R*d.score/100).replace(',','" cy="')}" r="4" fill="#087e88"/>`).join('');
 const labels=ds.map((d,i)=>`<text x="${point(i,R+23).replace(',','" y="')}" text-anchor="middle" font-size="12" fill="#16354b">${esc(d.label==='Individual medley'?'IM':d.label)}</text>`).join('');
 return `<section class="panel strength-panel"><h2>Five-event competitive strength profile · Rivals</h2><p>Compare Aidan with documented ASAJ LCM swimmers from each age-at-meet group, including Boys 12 who may age up. Each competitor's fastest verified time per event is used once.</p><label for="rival-age-group">Comparison group</label> <select id="rival-age-group">${RIVAL_GROUPS.map(([name],i)=>`<option value="${i}" ${i===group?'selected':''}>${esc(name)}</option>`).join('')}</select><div class="strength-layout"><svg viewBox="0 0 320 300" role="img" aria-label="Five-stroke comparative strength for ${esc(RIVAL_GROUPS[group][0])}">${grid}${axes}${shape}${dots}${labels}</svg><div class="strength-legend">${ds.map(d=>`<p><strong>${esc(d.label)}</strong>: ${d.score===null?'Insufficient verified comparisons':d.score.toFixed(0)+' / 100'} <small>(${d.events.length} documented events)</small>${d.events.map(e=>`<small class="rival-evidence">${esc(e.event)} · calculated #${e.rank} of ${e.count} · ${competitorSource(e.pb,'Aidan ASAJ PB')} · ${competitorSource(e.leader,'Rival ASAJ result')}</small>`).join('')}</p>`).join('')}</div></div><p class="subtle">Method: each event scores 100 × (competitor count − Aidan rank) ÷ (competitor count − 1); discipline score averages evidenced events. This is historical age at meet, not confirmed future age-group eligibility or an official ranking. Missing disciplines are not estimated.</p></section>`;
}
function swimIntelligence(){
 const history=[...(DATA.race_history_2026||[]).map(r=>({...r,origin:'ASAJ'})),...(DATA.swimcloud_supplemental||[]).map(r=>({...r,origin:'SwimCloud'}))];
 const events=[...new Set(history.map(r=>r.event))].sort();
 return `<section class="panel"><h2>Swim Intelligence · Performance history</h2><p>Explore recorded race times, PB progression and source evidence by event and course. LCM and SCM remain separate; SwimCloud is supplementary and not CARIFTA qualifying evidence.</p></section>${events.map(event=>`<section class="panel swim-event-section" data-swim-section="${esc(event)}"><h3>${esc(event)}</h3>${['LCM','SCM'].map(course=>{
  const rows=history.filter(r=>r.event===event&&r.course===course&&secs(r.time)!==null&&r.race_date).sort((a,b)=>a.race_date.localeCompare(b.race_date));
  if(!rows.length)return '';
  const values=rows.map(r=>secs(r.time)),min=Math.min(...values),max=Math.max(...values),spread=Math.max(1,max-min),w=300,h=110;
  const points=rows.map((r,i)=>`${20+(rows.length===1?0:i*(w-40)/(rows.length-1))},${10+(secs(r.time)-min)/spread*(h-20)}`).join(' ');
  const fastest=rows.reduce((a,b)=>secs(a.time)<secs(b.time)?a:b);
  return `<details><summary>${course} · ${rows.length} documented race(s) · PB ${esc(fastest.time)}</summary><svg class="swim-history-chart" viewBox="0 0 300 110" role="img" aria-label="${esc(event)} ${course} time history, faster times appear higher"><line x1="20" y1="10" x2="20" y2="100" stroke="#a4becb"/><polyline points="${points}" fill="none" stroke="#087e88" stroke-width="3"/>${rows.map((r,i)=>`<circle cx="${20+(rows.length===1?0:i*260/(rows.length-1))}" cy="${10+(secs(r.time)-min)/spread*90}" r="3.5" fill="${r.origin==='ASAJ'?'#087e88':'#d49b00'}"/>`).join('')}</svg><div class="swim-races">${rows.map(r=>`<p>${dateText(r.race_date)} · <strong>${esc(r.time)}</strong> · ${esc(r.origin)} · ${r.source_pdf?pdf(r.source_pdf,'Source PDF',r.source_page):a(r.source_url,'Supplemental source')}</p>`).join('')}</div></details>`;
 }).join('')}</section>`).join('')}`;
}
function eventAnalytics(){const ranked=DATA.events.map(e=>{const i=calculated(e),b=standardGap(e),s=snapshotGap(e);return {e,i,b,s,score:Number.isFinite(b)&&Number.isFinite(s)?b+s:null}});return `<section class="panel"><h2>Competition intelligence · Events</h2><p>Event opportunities use the combined seconds to B and to calculated second place. Smaller totals indicate a closer pair of benchmarks, not guaranteed selection.</p><div class="analytics-grid">${ranked.filter(x=>x.score!==null).sort((a,b)=>a.score-b.score).map(x=>`<div class="analytics-item"><strong>${esc(x.e.event)}</strong><span>Calculated #${x.i?.rank??'—'} of ${x.i?.count??'—'}</span><span>B: ${gapText(x.b)} · Top 2: ${gapText(x.s)}</span><span>Combined: ${x.score.toFixed(2)}s · ${competitorSource(x.i?.aidan,'ASAJ PB')} · ${competitorSource(x.i?.second,'2nd place')} · ${a(standard(x.e)?.source_url,'B standard')}</span></div>`).join('')||'<p>No fully evidenced comparisons.</p>'}</div></section>`;}
function rankingHistory(){if(SNAPSHOTS.length<2)return `<p>Needs a second dated, verified ranking snapshot to show a trend. The 29 September 2026 official ranking remains historical.</p>`;const sorted=[...SNAPSHOTS].sort((a,b)=>a.date.localeCompare(b.date));const last=sorted.at(-1),prev=sorted.at(-2);return `<p>Comparing verified ranking snapshots: ${esc(prev.date)} and ${esc(last.date)}. A positive change in the gap means it widened.</p><div class="table-wrap"><table><thead><tr><th>Event</th><th>Earlier gap to 2nd</th><th>Later gap to 2nd</th><th>Movement</th></tr></thead><tbody>${DATA.events.map(e=>{const a=prev.events?.[e.event],b=last.events?.[e.event];if(!a||!b||a.gap_to_second===null||b.gap_to_second===null)return '';const change=b.gap_to_second-a.gap_to_second;return `<tr><td>${esc(e.event)}</td><td>${a.gap_to_second.toFixed(2)}s · ${a.source?pdf(a.source,'Evidence',a.page):'—'}</td><td>${b.gap_to_second.toFixed(2)}s · ${b.source?pdf(b.source,'Evidence',b.page):'—'}</td><td>${Math.abs(change)<.005?'Unchanged':change<0?'Closing':'Widening'} (${Math.abs(change).toFixed(2)}s)</td></tr>`}).join('')||'<tr><td colspan="4">No matching verified gaps in both snapshots</td></tr>'}</tbody></table></div>`;}

// Classification totals are calculated from sourced LCM results and loaded standards.
// USA counts use each event's highest achieved motivational level; CARIFTA counts
// use only qualifying-period eligible ASAJ results, with A taking precedence over B.
function classificationTotals(){
 const usaLevels=['AAAA','AAA','AA','A','BB','B'];
 const usa=Object.fromEntries(usaLevels.map(level=>[level,[]]));
 const carifta={A:[],B:[]};
 for(const e of DATA.events){
  const pb=calculated(e)?.aidan;
  const usaStandard=(DATA.usa_motivational||[]).find(r=>r.event===e.event&&r.course==='LCM'&&r.age_group==='13-14'&&r.gender==='Boys');
  const pbSeconds=secs(pb?.time);
  if(pb?.source_pdf&&pb?.source_page&&pbSeconds!==null&&usaStandard){
   const level=usaLevels.find(l=>secs(usaStandard[l])!==null&&pbSeconds<=secs(usaStandard[l]));
   if(level)usa[level].push(e);
  }
  const eligibleBest=eligible(e), eligibleSeconds=secs(eligibleBest?.time);
  if(eligibleBest?.source_pdf&&eligibleBest?.source_page&&eligibleSeconds!==null){
   if(secs(e.standards?.A?.time)!==null&&eligibleSeconds<=secs(e.standards.A.time))carifta.A.push(e);
   else if(secs(e.standards?.B?.time)!==null&&eligibleSeconds<=secs(e.standards.B.time))carifta.B.push(e);
  }
 }
 const usaText=usaLevels.filter(l=>usa[l].length).map(l=>`${l} ${usa[l].length}`).join(' · ')||'None recorded';
 const cariftaText=['A','B'].filter(l=>carifta[l].length).map(l=>`${l} ${carifta[l].length}`).join(' · ')||'None recorded';
 return `<div class="classification-totals"><p><strong>USA Swimming levels met:</strong> ${esc(usaText)}</p><p><strong>CARIFTA standards met (eligible LCM):</strong> ${esc(cariftaText)}</p><details><summary>Classification evidence</summary>${usaLevels.filter(l=>usa[l].length).map(l=>`<p><strong>USA ${l}:</strong> ${usa[l].map(e=>`${esc(e.event)} · ${competitorSource(calculated(e)?.aidan,'ASAJ PB')}`).join(' · ')}</p>`).join('')}${['A','B'].filter(l=>carifta[l].length).map(l=>`<p><strong>CARIFTA ${l}:</strong> ${carifta[l].map(e=>`${esc(e.event)} · ${competitorSource(eligible(e),'Eligible ASAJ result')} · ${a(e.standards?.[l]?.source_url,'Standard')}`).join(' · ')}</p>`).join('')}</details></div>`;
}
// Achievements are derived only from exact-dated, PDF-linked ASAJ LCM results.
// No estimates, converted times, or supplemental SwimCloud performances.
function verifiedAchievements(){
 const out=[];
 for(const e of DATA.events){
  const rows=datedSwims(e).filter(r=>r.date_precision==='exact'&&r.race_date&&r.source_pdf&&r.source_page).sort((a,b)=>a.race_date.localeCompare(b.race_date));
  let previous=Infinity, previousRow=null;
  for(const r of rows){
   const n=secs(r.time);
   if(n===null)continue;
   if(n<previous-0.0001){
    if(previousRow)out.push({type:'Personal best',event:e.event,date:r.race_date,time:r.time,improvement:previous-n,prior:previousRow.time,source_pdf:r.source_pdf,source_page:r.source_page});
    previous=n;previousRow=r;
   }
  }
  const q=eligible(e),std=standard(e),qSeconds=secs(q?.time),bSeconds=secs(std?.time);
  if(q&&q.source_pdf&&q.source_page&&qSeconds!==null&&bSeconds!==null&&qSeconds<=bSeconds){
   out.push({type:'CARIFTA B standard met',event:e.event,date:q.date||null,time:q.time,source_pdf:q.source_pdf,source_page:q.source_page,standard_url:std.source_url});
  }
  if(secured(e)&&q?.source_pdf&&q?.source_page){
   out.push({type:'Calculated top-two qualifying position',event:e.event,date:q.date||null,time:q.time,source_pdf:q.source_pdf,source_page:q.source_page});
  }
 }
 return out.sort((a,b)=>(b.date||'').localeCompare(a.date||'')||a.event.localeCompare(b.event));
}
// Achievement rules (all require exact dated, PDF/page-linked ASAJ LCM evidence):
// Hero: greatest positive margin under the qualifying B time, otherwise largest
// improvement between consecutive verified PBs. No ranking or time is estimated.
// Journey: every exact-dated race in 2026 for the hero event, with sources.
// Next up: unmet B standard or second-place qualifying benchmark, ordered by
// the smallest strictly positive time difference, never inventing a target.
// Download: local PNG contains only Aidan S., verified event/time, badge and source.
const hundredths=n=>Number.isFinite(n)?(Math.round(n*100)/100).toFixed(2):null;
function achievementHero(all){
 const candidates=[];
 for(const e of DATA.events){
  const q=eligible(e),b=standard(e),qt=secs(q?.time),bt=secs(b?.time);
  if(q?.source_pdf&&q?.source_page&&q?.date&&qt!==null&&bt!==null&&qt<=bt){
   candidates.push({type:'Standard met',event:e.event,time:q.time,date:q.date,metric:bt-qt,metricText:`${hundredths(bt-qt)}s inside B standard`,source_pdf:q.source_pdf,source_page:q.source_page,standard_url:b.source_url,rank:qi(e)?.rank});
  }
 }
 for(const x of all.filter(x=>x.type==='Personal best'&&x.improvement>0))candidates.push({...x,type:'Season-best drop',metric:x.improvement,metricText:`${hundredths(x.improvement)}s improvement`,rank:qi(DATA.events.find(e=>e.event===x.event))?.rank});
 return candidates.sort((x,y)=>y.metric-x.metric||x.event.localeCompare(y.event))[0]||null;
}
function achievementNextUp(){
 const locked=[];
 for(const e of DATA.events){
  const q=eligible(e),qt=secs(q?.time),bt=secs(standard(e)?.time),runner=qi(e)?.second,rt=secs(runner?.time);
  if(!q?.source_pdf||!q?.source_page||qt===null)continue;
  if(bt!==null&&qt>bt)locked.push({event:e.event,label:'CARIFTA B',seconds:qt-bt,source:standard(e)?.source_url});
  if(rt!==null&&qt>rt)locked.push({event:e.event,label:'Calculated top two',seconds:qt-rt,source_pdf:runner.source_pdf,source_page:runner.source_page});
 }
 return locked.sort((x,y)=>x.seconds-y.seconds||x.event.localeCompare(y.event)).slice(0,3);
}
const ACHIEVEMENT_ICONS={'Personal best':'🏊','Standard met':'🏅','CARIFTA B standard met':'🏅','Calculated top-two qualifying position':'🏆','Season-best drop':'📉'};
function achievementPanel(){
 const all=verifiedAchievements(),hero=achievementHero(all),next=achievementNextUp();
 const counts=[['Personal best','New PB',all.filter(x=>x.type==='Personal best').length],['CARIFTA B standard met','Standard met',all.filter(x=>x.type==='CARIFTA B standard met').length],['Calculated top-two qualifying position','Top-two',all.filter(x=>x.type==='Calculated top-two qualifying position').length],['Season-best drop','Season-best drop',all.filter(x=>x.type==='Personal best'&&x.improvement>0).length]];
 return `<section class="panel achievement-panel"><div class="achievement-heading"><h2>Achievements · Aidan's milestones</h2><details class="achievement-info"><summary aria-label="How achievements are verified">ⓘ</summary><p>Every milestone uses exact-dated ASAJ LCM results linked to its source. Calculated rankings are not official selection. See How to read this tracker.</p></details></div><p>Every second earned deserves celebrating!</p>
 ${hero?`<div class="achievement-hero"><span class="achievement-icon" aria-hidden="true">${ACHIEVEMENT_ICONS[hero.type]}</span><div><strong>${esc(hero.type)} · biggest verified milestone</strong><h3>${esc(hero.event)} · ${esc(hero.time)}</h3><p>${esc(hero.metricText)}${hero.rank?` · Calculated qualifying rank #${hero.rank}`:''}</p><p>${dateText(hero.date)} · ${pdf(hero.source_pdf,'ASAJ result',hero.source_page)}${hero.standard_url?' · '+a(hero.standard_url,'B standard'):''}</p><button type="button" id="download-achievement">Download card (PNG)</button></div></div>`:'<p>No eligible milestone with exact-dated ASAJ evidence.</p>'}
 <div class="achievement-badges">${counts.map(([type,label,n])=>`<div class="achievement-badge ${type==='Personal best'?'pb':type==='CARIFTA B standard met'?'standard':type==='Calculated top-two qualifying position'?'top-two':'drop'}"><span aria-hidden="true">${ACHIEVEMENT_ICONS[type]}</span><strong>${n}</strong><span>${esc(label)}</span></div>`).join('')}</div>
 <div class="achievement-next"><h3>Next up · milestones to unlock</h3>${next.length?next.map(x=>`<div class="achievement-locked">🔒 <strong>${esc(x.event)} · ${esc(x.label)}</strong> · ${hundredths(x.seconds)}s to go · ${x.source?a(x.source,'Standard source'):pdf(x.source_pdf,'ASAJ rival source',x.source_page)}</div>`).join(''):'<p>No sourced, unmet milestones currently available.</p>'}</div>
 <details><summary>Milestone timeline · ${all.length} documented achievements</summary>${all.length?all.slice(0,30).map((x,i)=>`<div class="achievement-entry"><div><strong>${ACHIEVEMENT_ICONS[x.type]||'🏅'} ${esc(x.type)}</strong> · ${esc(x.event)} · ${esc(x.time)}${x.improvement?` · ${hundredths(x.improvement)}s faster than ${esc(x.prior)}`:''}<small>${x.date?dateText(x.date):'Exact race date not established'} · ${pdf(x.source_pdf,'ASAJ PDF',x.source_page)}${x.standard_url?' · '+a(x.standard_url,'CARIFTA standard'):''}</small></div><button type="button" data-achievement="${i}" aria-label="Copy ${esc(x.event)} achievement">Copy</button></div>`).join(''):'<p>No documented milestones available.</p>'}</details></section>`;
}
function downloadAchievementCard(){
 const hero=achievementHero(verifiedAchievements());if(!hero||!hero.source_pdf||!hero.source_page)return;
 const canvas=document.createElement('canvas');canvas.width=960;canvas.height=540;const ctx=canvas.getContext('2d');if(!ctx)return;
 ctx.fillStyle='#f4fbfc';ctx.fillRect(0,0,960,540);ctx.fillStyle='#0b526c';ctx.font='bold 38px system-ui';ctx.fillText('Aidan S. · Verified achievement',50,80);
 ctx.font='bold 30px system-ui';ctx.fillText(hero.type,50,150);ctx.font='bold 52px system-ui';ctx.fillText(hero.event,50,230);
 ctx.fillStyle='#087e88';ctx.font='bold 72px system-ui';ctx.fillText(hero.time,50,330);
 ctx.fillStyle='#16354b';ctx.font='28px system-ui';ctx.fillText(hero.metricText,50,390);
 ctx.font='20px system-ui';ctx.fillText(`ASAJ: ${hero.source_pdf} · page ${hero.source_page}`,50,460);
 const link=document.createElement('a');link.download='aidan-s-verified-achievement.png';link.href=canvas.toDataURL('image/png');link.click();
}
function animateAchievementCount(){
 if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
 // Count only already-verified badge totals; never animate or alter race times.
 document.querySelectorAll('.achievement-badge strong').forEach(el=>{
  const final=Number(el.textContent);if(!Number.isInteger(final)||final<=0)return;
  const start=performance.now();
  function frame(now){const ratio=Math.min(1,(now-start)/550);el.textContent=String(ratio===1?final:Math.floor(final*ratio));if(ratio<1)requestAnimationFrame(frame)}requestAnimationFrame(frame);
 });
}
function renderToday(){
 const m=nextMeet(),fs=focus(),b=byPriority().slice().sort((x,y)=>x.bGap-y.bGap)[0],t=byPriority().slice().sort((x,y)=>x.sGap-y.sGap)[0];
 const improvements=DATA.events.filter(e=>!secured(e)).map(e=>({e,im:improvement(e)})).filter(x=>x.im&&x.im.delta>0).sort((a,b)=>b.im.delta-a.im.delta);
 const securedEvents=DATA.events.filter(secured),fresh=DATA.events.filter(needsFresh);
 const targets=[...new Map([...fs,...fresh].map(e=>[e.event,e])).values()].slice(0,5);
 return `<section class="panel"><h2>Today · Swim readiness</h2>${m?`<h3>Next: ${esc(m.name)}</h3><p><strong>${meetCountdown(m)} days until ${dateText(m.start)}</strong> · ${dateText(m.start)} to ${dateText(m.end)} · ${a(m.url,'ASAJ calendar')}</p>`:'<p>No upcoming meet in the published calendar.</p>'}</section>
 <section class="panel"><h2>Secured · calculated qualifying position</h2>${classificationTotals()}${securedEvents.map(e=>`<div class="list-row"><strong>${esc(e.event)}</strong> · B standard met · ${gapToSecondText(e)} · ${competitorSource(eligible(e),'ASAJ qualifying result')}</div>`).join('')||'<p>None currently supported by the imported qualifying results.</p>'}<p class="subtle">Calculated from imported qualifying-period evidence, not official selection. Limited field sizes may affect rankings.</p></section>
 <section class="grid" aria-label="Three highlights"><div class="mini-card"><small>Closest to B time</small><strong>${esc(b?.event||'—')}</strong><p>${b?gapText(b.bGap):'No eligible comparison'}</p>${b?a(standard(b)?.source_url,'B standard'):''}</div><div class="mini-card"><small>Closest to top 2</small><strong>${esc(t?.event||'—')}</strong><p>${t?gapToSecondText(t):'No eligible comparison'}</p>${t?competitorSource(qi(t)?.second,'ASAJ second-place source'):''}</div><div class="mini-card"><small>Biggest recent improvement</small><strong>${esc(improvements[0]?.e.event||'—')}</strong><p>${improvements[0]?`${improvements[0].im.delta.toFixed(2)}s faster`:'Not enough dated history'}</p>${improvements[0]?pdf(improvements[0].im.first.source_pdf,'ASAJ baseline',improvements[0].im.first.source_page):''}</div></section>
 <section class="panel"><h2>Needs a fresh swim</h2>${fresh.map(e=>`<div class="list-row">${esc(e.event)} · No qualifying-period result · ${a(standard(e)?.source_url,'B standard')}</div>`).join('')||'<p>All tracked events have qualifying-period results.</p>'}</section>
 <section class="panel"><h2>Focus this month</h2><p class="subtle">Smallest combined eligible seconds to B and to calculated second; secured events excluded.</p>${fs.map(e=>`<div class="list-row"><strong>${esc(e.event)}</strong> · B ${gapText(e.bGap)} · Second ${gapToSecondText(e)} · ${competitorSource(qi(e)?.second,'ASAJ second')}</div>`).join('')||'<p>Not enough verified qualifying comparisons.</p>'}</section>
 <section class="panel"><h2>Season progress · 2026</h2>${DATA.events.map(e=>({e,im:improvement(e)})).filter(x=>x.im&&x.im.delta>0).sort((a,b)=>b.im.delta-a.im.delta).slice(0,5).map(x=>`<div class="list-row"><strong>${esc(x.e.event)}</strong> · ${x.im.delta.toFixed(2)}s faster than earliest dated ASAJ swim · ${pdf(x.im.first.source_pdf,'First result',x.im.first.source_page)} · ${competitorSource(calculated(x.e)?.aidan,'PB source')}</div>`).join('')||'<p>Not enough dated ASAJ LCM history.</p>'}</section>
 <section class="panel"><h2>Upcoming meets · Suggested targets</h2>${(DATA.meets||[]).filter(x=>new Date(x.end+'T23:59:59')>=new Date()).map(x=>`<details><summary>${esc(x.name)} · ${dateText(x.start)}</summary><p>${a(x.url,'ASAJ calendar')} · Check the meet’s event list.</p>${targets.map(e=>`<p>${esc(e.event)} · B ${esc(standard(e)?.time||'—')} · ${a(standard(e)?.source_url,'ASAJ standard')}</p>`).join('')}</details>`).join('')||'<p>No upcoming published meets.</p>'}</section>${achievementPanel()}${strengthDiagram()}`;
}
function renderEvents(){const options=[['all','All'],['secured','Secured'],['fresh','Needs a fresh swim'],['second','Closest to 2nd']];let rows=DATA.events.slice();if(EVENT_FILTER==='secured')rows=rows.filter(secured);if(EVENT_FILTER==='fresh')rows=rows.filter(needsFresh);if(EVENT_FILTER==='second')rows=byPriority().slice().sort((a,b)=>a.sGap-b.sGap).slice(0,5);return `<section class="panel"><h2>Events · Qualifying progress</h2><p>Calculated rankings are not official. Each event separates eligible swims from overall PBs; open Sources and details for evidence.</p><div class="filter-chips" role="group" aria-label="Filter events">${options.map(([key,label])=>`<button type="button" data-event-filter="${key}" aria-pressed="${EVENT_FILTER===key}">${label}</button>`).join('')}</div><p class="subtle">${rows.length} event(s) shown</p></section><div class="event-grid">${rows.map(eventCard).join('')}</div>`;}
function rivalTrend(name,event){const rows=(COMPETITORS||[]).filter(r=>r.gender==='Boys'&&r.course==='LCM'&&r.event===event&&r.swimmer.toLowerCase().replace(/[^a-z]/g,'')===name.toLowerCase().replace(/[^a-z]/g,'')&&r.meet_start&&r.source_pdf).sort((a,b)=>a.meet_start.localeCompare(b.meet_start));const dates=[...new Set(rows.map(r=>r.meet_start))];if(dates.length<2)return 'Not enough history';const first=Math.min(...rows.filter(r=>r.meet_start===dates[0]).map(r=>secs(r.time))),last=Math.min(...rows.filter(r=>r.meet_start===dates.at(-1)).map(r=>secs(r.time)));return `${last<first?'Improved':last>first?'Slower':'Unchanged'} across dated ASAJ results: ${time(Math.abs(last-first))} · ${pdf(rows[0].source_pdf,'First source',rows[0].source_page)} · ${pdf(rows.at(-1).source_pdf,'Latest source',rows.at(-1).source_page)}`}
// Per-event rival comparison: documented LCM PBs only, one entry per swimmer.
// Age 12 swimmers are included only when their verified time is faster than Aidan's.
function rivalEventChart(e){
 const intel=calculated(e), aidan=intel?.aidan, aidanSeconds=secs(aidan?.time);
 if(aidanSeconds===null||!aidan?.source_pdf)return `<p class="subtle">Verified Aidan PB unavailable for this comparison.</p>`;
 const rows=[{name:'Aidan Seaton',time:aidan.time,seconds:aidanSeconds,kind:'aidan',source_pdf:aidan.source_pdf,source_page:aidan.source_page}];
 for(const [kind,record] of [['first',intel?.leader],['second',intel?.second]]){
  if(record&&secs(record.time)!==null&&record.source_pdf&&record.source_page&& !rows.some(x=>x.name.toLowerCase()===String(record.name).toLowerCase()))
   rows.push({...record,seconds:secs(record.time),kind});
 }
 const twelve=new Map();
 for(const r of (COMPETITORS||[])){
  if(r.event!==e.event||r.course!=='LCM'||r.gender!=='Boys'||Number(r.age)!==12||String(r.verified).toLowerCase()!=='true'||!r.source_pdf||!r.source_page)continue;
  const t=secs(r.time),key=String(r.swimmer||'').trim().toLowerCase();
  if(!key||key.includes('aidan')&&key.includes('seaton')||t===null||t>=aidanSeconds)continue;
  if(!twelve.has(key)||t<twelve.get(key).seconds)twelve.set(key,{name:r.swimmer,time:r.time,seconds:t,kind:'age12',source_pdf:r.source_pdf,source_page:r.source_page});
 }
 rows.push(...[...twelve.values()].sort((a,b)=>a.seconds-b.seconds));
 const minimum=Math.min(...rows.map(r=>r.seconds)),maximum=Math.max(...rows.map(r=>r.seconds));
 const low=Math.max(0,minimum-1),high=maximum+1,span=high-low;
 const labels={aidan:'Aidan',first:'13–14 first',second:'13–14 second',age12:'Boys 12 · faster'};
 return `<div class="rival-event-chart" role="group" aria-label="${esc(e.event)} verified LCM time comparison"><p class="subtle">Shorter bars mean faster times. Each swimmer's fastest imported verified LCM time is used; Boys 12 appear only if faster than Aidan.</p>${rows.map(r=>{
  const width=Math.max(2,100*(r.seconds-low)/span);
  const diff=r.seconds-aidanSeconds;
  const comparison=r.kind==='aidan'?'Reference PB':diff<0?`${Math.abs(diff).toFixed(2)}s faster than Aidan`:diff>0?`${diff.toFixed(2)}s slower than Aidan`:'Same time as Aidan';
  return `<div class="rival-chart-row"><div class="rival-chart-head"><span><strong>${esc(shortName(r.name))}</strong> <small>${esc(labels[r.kind])}</small></span><span><strong>${esc(r.time)}</strong> <small>${esc(comparison)}</small></span></div><div class="rival-chart-track"><div class="rival-chart-bar ${esc(r.kind)}" style="width:${width.toFixed(2)}%"></div></div><div class="rival-chart-evidence">${competitorSource(r,'ASAJ PDF · page '+r.source_page)}</div></div>`;
 }).join('')}</div>`;
}
function renderRivals(){return `<section class="panel"><h2>Rivals · Calculated from imported ASAJ LCM results</h2><p>First and second place are determined from each swimmer's fastest documented result in the imported Boys 13–14 data. Progress compares their earliest and latest separately dated meets, not just their lifetime PB. The recorded age is age at the meet, so these are not official current-age rankings.</p></section>${COMPETITORS?rivalsStrengthDiagram(Number(window.RIVAL_GROUP||0)):'<section class="panel">Loading comparison data…</section>'}<div class="event-grid">${DATA.events.map(e=>{const intel=calculated(e);return `<article class="event-card"><h3>${esc(e.event)} · LCM</h3>${rivalEventChart(e)}<p><strong>Aidan calculated rank:</strong> ${intel?.rank?`#${intel.rank} of ${intel.count}`:'Not available'} · Official 29 Sep: ${e.rank==null?'—':'#'+e.rank}</p>${[intel?.leader,intel?.second].map((r,i)=>`<p><strong>${i+1}${i===0?'st':'nd'}:</strong> ${r?`${esc(shortName(r.name))} · ${esc(r.time)} · ${competitorSource(r)}<br><span class="subtle">${esc(trendLabel(r))} ${r.dated_meets>=2?`· ${competitorSource(r.first_result,'First dated meet')} · ${competitorSource(r.last_result,'Last dated meet')}`:''}</span>`:'Insufficient imported evidence'}</p>`).join('')}</article>`}).join('')}</div><section class="panel"><h2>Boys 12 watchlist</h2><p>Documented Boys 12 LCM performances within ±10% of Aidan's current PB. Future age-group eligibility must be checked separately.</p>${DATA.events.map(e=>{const base=secs(currentPB(e)),rows=(e.boys12||[]).filter(r=>base&&Math.abs(secs(r.time)-base)/base<=.1);return rows.length?`<details><summary>${esc(e.event)} · ${rows.length} swimmer(s)</summary>${rows.map(r=>`<p>${esc(shortName(r.name))} · ${esc(r.time)} · ${time(Math.abs(secs(r.time)-base))} ${secs(r.time)<base?'faster':'slower'} · ${pdf(r.source_pdf,'ASAJ source',r.source_page)}</p>`).join('')}</details>`:''}).join('')}</section>`}
function renderEvidence(){const race=DATA.race_history_2026||[],scm=DATA.swimcloud_supplemental||[];return `<section class="panel"><h2>Evidence & verification</h2><p>Historical evidence is presented below.</p><p>Official ASAJ source results and ranking snapshots are distinguished from supplementary SwimCloud results. ${a('carifta-documents/2026 Carifta Criteria.pdf','CARIFTA criteria')} · ${a('reference/asaj/General Rankings 29-09-2026.pdf','29 Sep ranking PDF')}</p><p>Ranking trend: ${rankingHistory()}</p></section><section class="panel"><h3>2026 ASAJ race history · LCM</h3><div class="table-wrap"><table><thead><tr><th>Event</th><th>Time</th><th>Meet date</th><th>Evidence</th></tr></thead><tbody>${race.map(r=>`<tr><td>${esc(r.event)}</td><td>${esc(r.time)}</td><td>${dateText(r.race_date)}${r.date_precision==='meet_range'?' (meet range)':''}</td><td>${pdf(r.source_pdf,'ASAJ PDF',r.source_page)}</td></tr>`).join('')}</tbody></table></div></section><section class="panel"><h3>SwimCloud supplemental · LCM / SCM separated</h3><p>Supplemental results are not verified CARIFTA qualifying evidence.</p>${['LCM','SCM'].map(course=>`<details><summary>${course} · ${scm.filter(r=>r.course===course).length} record(s)</summary><div class="table-wrap"><table><thead><tr><th>Event</th><th>Time</th><th>Date</th><th>Source</th></tr></thead><tbody>${scm.filter(r=>r.course===course).map(r=>`<tr><td>${esc(r.event)}</td><td>${esc(r.time)}</td><td>${dateText(r.race_date)}</td><td>${a(r.source_url,'SwimCloud')}</td></tr>`).join('')}</tbody></table></div></details>`).join('')}</section>`}
function renderSwim(){return swimIntelligence()}
function renderAdmin(){return `<section class="panel"><h2>Upload ASAJ PDFs</h2><p>Administrative ingestion is handled through the existing GitHub Actions workflow. The public site has no upload backend.</p><p>${a('https://github.com/AndrewCheeky/aidan-carifta-tracker/actions','Open repository Actions')}</p></section>`}
function celebrateNewVerifiedAchievements(){
 try{
  const key='aidan_verified_achievements_v1';
  const ids=verifiedAchievements().map(x=>[x.type,x.event,x.date,x.time,x.source_pdf,x.source_page].join('|'));
  const previous=localStorage.getItem(key);
  localStorage.setItem(key,JSON.stringify(ids));
  if(previous===null||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
  const old=new Set(JSON.parse(previous));
  const added=ids.filter(x=>!old.has(x));
  if(!added.length)return;
  const notice=document.createElement('div');notice.className='achievement-celebration';notice.setAttribute('role','status');notice.textContent=`🏅 ${added.length} newly documented achievement${added.length===1?'':'s'}! View Today → Achievements.`;
  document.body.appendChild(notice);notice.addEventListener('animationend',()=>notice.remove(),{once:true});const burst=document.createElement('div');burst.className='achievement-confetti';burst.setAttribute('aria-hidden','true');burst.textContent='🎉 ✨ 🎊 ✨ 🎉';document.body.appendChild(burst);burst.addEventListener('animationend',()=>burst.remove(),{once:true});
 }catch(_){/* Local storage can be disabled; achievements remain visible. */}
}
function render(){if(!DATA)return;const pages={today:renderToday,events:renderEvents,rivals:renderRivals,evidence:renderEvidence,swim:renderSwim,admin:renderAdmin};$('content').innerHTML=(pages[TAB]||renderToday)();$('status').textContent=TAB==='rivals'&&!COMPETITORS?'Loading verified rival history…':`Viewing ${TAB.charAt(0).toUpperCase()+TAB.slice(1)}`;if(TAB==='today'){document.getElementById('download-achievement')?.addEventListener('click',downloadAchievementCard);animateAchievementCount()}document.querySelectorAll('[data-achievement]').forEach(b=>b.addEventListener('click',()=>{const x=verifiedAchievements()[Number(b.dataset.achievement)];if(!x)return;const message=`Aidan Seaton · ${x.type} · ${x.event} · ${x.time}${x.date?' · '+x.date:''} · ASAJ evidence: ${x.source_pdf}${x.source_page?' page '+x.source_page:''}`;navigator.clipboard?.writeText(message).then(()=>{b.textContent='Copied'}).catch(()=>{b.textContent='Copy unavailable'})}));document.querySelectorAll('[data-swim-event]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();const selected=link.dataset.swimEvent;setTab('swim');const section=[...document.querySelectorAll('[data-swim-section]')].find(el=>el.dataset.swimSection===selected);if(section){const lcm=[...section.querySelectorAll('details')].find(el=>el.querySelector('summary')?.textContent.trim().startsWith('LCM'));if(lcm)lcm.open=true;section.scrollIntoView({block:'start',behavior:'instant'});}}));document.querySelectorAll('[data-event-filter]').forEach(b=>b.addEventListener('click',()=>{EVENT_FILTER=b.dataset.eventFilter;render()}));if(TAB==='rivals')$('rival-age-group')?.addEventListener('change',e=>{window.RIVAL_GROUP=Number(e.target.value);render()});if(TAB==='rivals'&&!COMPETITORS)fetch('competitors.json').then(r=>{if(!r.ok)throw Error('Competitor data unavailable');return r.json()}).then(x=>{COMPETITORS=x;render()}).catch(e=>{$('status').textContent=e.message})}
function setTab(tab){if(!['today','events','rivals','swim','evidence','admin'].includes(tab)||tab==='admin'&&!new URLSearchParams(location.search).has('admin'))tab='today';TAB=tab;history.replaceState(null,'',location.pathname+location.search+'#'+tab);document.querySelectorAll('nav button[data-tab]').forEach(b=>{const active=b.dataset.tab===tab;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active))});$('dashboard-nav').classList.remove('open');$('menu-toggle').setAttribute('aria-expanded','false');render();window.scrollTo({top:0,behavior:'instant'})}
function wireNav(){const menu=$('dashboard-nav'),toggle=$('menu-toggle');toggle.addEventListener('click',()=>{const open=menu.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open))});menu.addEventListener('click',e=>{const b=e.target.closest('button[data-tab]');if(b)setTab(b.dataset.tab)});document.addEventListener('click',e=>{if(!menu.contains(e.target)&&!toggle.contains(e.target)){menu.classList.remove('open');toggle.setAttribute('aria-expanded','false')}});document.addEventListener('keydown',e=>{if(e.key==='Escape'){menu.classList.remove('open');toggle.setAttribute('aria-expanded','false');toggle.focus()}});if(new URLSearchParams(location.search).has('admin'))menu.querySelector('[data-tab="admin"]').hidden=false}
async function start(){wireNav();try{const [data,meta]=await Promise.all([fetch('data.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Data unavailable');return r.json()}),fetch('ranking_snapshots.json').then(r=>r.ok?r.json():[])]);DATA=data;SNAPSHOTS=meta;celebrateNewVerifiedAchievements();const requested=location.hash.slice(1);if(['events','rivals','swim','evidence'].includes(requested)||requested==='admin'&&new URLSearchParams(location.search).has('admin'))setTab(requested);else render()}catch(e){$('status').textContent='Unable to load verified data: '+e.message}}
document.addEventListener('DOMContentLoaded',start);
