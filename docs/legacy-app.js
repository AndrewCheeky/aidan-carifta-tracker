let DATA=null, TAB='visual';
let TREND_SELECTION={event:null,course:'LCM'};

// Multi-swimmer controls use imported ASAJ results; never reuse Aidan's individual rankings or standards for another swimmer.
let SWIMMER_SELECTION={name:'Aidan Seaton',gender:'Boys',age:13,category:'13–14'};
const asajRoster=d=>{
 const map=new Map();
 for(const r of d.asaj_competitor_results||[]){
  const name=String(r.swimmer||'').trim(),gender=String(r.gender||'').trim(),age=Number(r.age);
  if(!name||!['Boys','Girls'].includes(gender)||!Number.isInteger(age)||age<1||age>25)continue;
  const key=gender+'|'+name.toLowerCase();
  if(!map.has(key))map.set(key,{name,gender,ages:new Set()});
  map.get(key).ages.add(age);
 }
 const primary={name:d.athlete?.name||'Aidan Seaton',gender:'Boys',ages:new Set([13])};
 map.set('Boys|'+primary.name.toLowerCase(),primary);
 return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name));
};
function setupSwimmerControls(){
 const host=document.getElementById('swimmer-controls');if(!host||!DATA)return;
 const roster=asajRoster(DATA);
 const names=roster.filter(x=>x.gender===SWIMMER_SELECTION.gender);
 const nameOptions=names.map(x=>`<option value="${esc(x.name)}" ${x.name===SWIMMER_SELECTION.name?'selected':''}>${esc(x.name)}</option>`).join('');
 host.innerHTML=`<div class="selector-title">Swimmer profile · ASAJ results</div><div class="selector-grid"><label>Primary swimmer<select id="swimmer-name">${nameOptions}</select></label><label>Gender<select id="swimmer-gender"><option ${SWIMMER_SELECTION.gender==='Boys'?'selected':''}>Boys</option><option ${SWIMMER_SELECTION.gender==='Girls'?'selected':''}>Girls</option></select></label><label>Recorded age<select id="swimmer-age">${Array.from({length:14},(_,i)=>i+7).map(n=>`<option value="${n}" ${n===SWIMMER_SELECTION.age?'selected':''}>${n}</option>`).join('')}</select></label><label>Age category<select id="swimmer-category">${['9–10','11–12','13–14','15–17','18–25'].map(v=>`<option ${v===SWIMMER_SELECTION.category?'selected':''}>${v}</option>`).join('')}</select></label></div><p class="selector-note">Category ${esc(SWIMMER_SELECTION.category)} · Emerging age ${Number(SWIMMER_SELECTION.category.split('–')[0])-1} · Ages are recorded at meets, not verified championship eligibility.</p>`;
 const name=host.querySelector('#swimmer-name'),gender=host.querySelector('#swimmer-gender'),age=host.querySelector('#swimmer-age'),category=host.querySelector('#swimmer-category');
 name.onchange=()=>{SWIMMER_SELECTION.name=name.value;const found=roster.find(x=>x.name===name.value&&x.gender===SWIMMER_SELECTION.gender);if(found?.ages.size)SWIMMER_SELECTION.age=Math.max(...found.ages);setupSwimmerControls();render();};
 gender.onchange=()=>{SWIMMER_SELECTION.gender=gender.value;SWIMMER_SELECTION.name=asajRoster(DATA).find(x=>x.gender===gender.value)?.name||'';setupSwimmerControls();render();};
 age.onchange=()=>{SWIMMER_SELECTION.age=Number(age.value);render();};
 category.onchange=()=>{SWIMMER_SELECTION.category=category.value;render();setupSwimmerControls();};
}
function renderSelectedSwimmer(d){
 const sel=SWIMMER_SELECTION, min=Number(sel.category.split('–')[0]),max=Number(sel.category.split('–')[1]);
 const rows=(d.asaj_competitor_results||[]).filter(r=>r.gender===sel.gender&&r.swimmer?.toLowerCase()===sel.name.toLowerCase()&&Number(r.age)===sel.age&&trendSeconds(r.time)!==null);
 const group=(d.asaj_competitor_results||[]).filter(r=>r.gender===sel.gender&&Number(r.age)>=min&&Number(r.age)<=max&&trendSeconds(r.time)!==null);
 const younger=(d.asaj_competitor_results||[]).filter(r=>r.gender===sel.gender&&Number(r.age)===min-1&&trendSeconds(r.time)!==null);
 const keys=[...new Set(rows.map(r=>r.event+'|'+r.course))].sort();
 // Meet titles are taken from the imported source PDF filename when the extractor supplies a generic 'Results' heading.
 const meets=new Map();
 for(const r of rows){
  const source=String(r.source_pdf||'');
  const fallback=source.split('/').pop().replace(/\.pdf$/i,'').replace(/[-_]+/g,' ').trim();
  const raw=String(r.meet_name||'').trim();
  const title=raw&&!/^results?$/i.test(raw)?raw:(fallback||'Meet name unavailable');
  const start=String(r.meet_start||'').trim(),end=String(r.meet_end||'').trim();
  const key=[source||title,start,end].join('|');
  if(!meets.has(key))meets.set(key,{title,start,end,source,events:new Set(),count:0});
  const meet=meets.get(key);meet.events.add(r.event+' '+r.course);meet.count++;
 }
 const meetRows=[...meets.values()].sort((a,b)=>a.start.localeCompare(b.start)).map(m=>`<tr><td>${esc(m.title)}</td><td>${esc(m.start||'Date unavailable')}${m.end&&m.end!==m.start?' to '+esc(m.end):''}</td><td>${m.count}</td><td>${m.source?`<a href="${encodeURI(esc(m.source))}" target="_blank" rel="noopener noreferrer">ASAJ PDF</a>`:'Unavailable'}</td></tr>`).join('');
 const meetSummary=`<section class="panel"><h3>ASAJ meets with recorded results</h3><p>${meets.size} distinct imported meet source(s) for ${esc(sel.name)} at recorded age ${sel.age}. Dates are imported meet dates and may not identify the exact race day.</p>${meets.size?`<div class="table-wrap">${table(['Meet','Recorded meet date(s)','Results','Source'],[meetRows])}</div>`:'<p>No meets found for the selected swimmer and recorded age.</p>'}</section>`;
 const cards=keys.map(key=>{const [event,course]=key.split('|'), swims=rows.filter(r=>r.event===event&&r.course===course).sort((a,b)=>String(a.meet_start).localeCompare(String(b.meet_start)));
 const pb=swims.reduce((a,b)=>trendSeconds(a.time)<=trendSeconds(b.time)?a:b),latest=swims.at(-1),delta=trendSeconds(latest.time)-trendSeconds(pb.time);
 const peers=group.filter(r=>r.event===event&&r.course===course),emerging=younger.filter(r=>r.event===event&&r.course===course);
 const unique=arr=>new Set(arr.map(r=>r.swimmer.toLowerCase())).size;
 const sourced=r=>r.source_pdf?`<a target="_blank" rel="noopener" href="${encodeURI(esc(r.source_pdf))}#page=${esc(r.source_page||1)}">ASAJ PDF</a>`:'Source unavailable';
 return `<section class="panel"><h3>${esc(event)} · ${esc(course)}</h3><div class="cards">${card('PB (imported ASAJ)',esc(pb.time))}${card('Latest',esc(latest.time))}${card('Latest vs PB',`${Math.abs(delta).toFixed(2)}s ${delta<-.005?'faster':delta>.005?'slower':'equal'}`)}${card('Documented swims',swims.length)}</div><p>PB meet date: ${esc(pb.meet_start||'Unavailable')} · ${sourced(pb)} · ${unique(peers)} age-category competitors · ${unique(emerging)} emerging age ${min-1} competitors</p>${table(['Meet date','Round','Time','Age','Source'],swims.map(r=>`<tr><td>${esc(r.meet_start||'Unknown')}</td><td>${esc(r.round||'')}</td><td>${esc(r.time)}</td><td>${esc(r.age)}</td><td>${sourced(r)}</td></tr>`))}</section>`;
 }).join('');
 return `<section class="panel"><h2>${esc(sel.name)} · ${esc(sel.gender)} age ${sel.age}</h2><p>ASAJ imported race results only. Comparison category ${esc(sel.category)}; emerging age ${min-1}. Results reflect the ages recorded at meets. Race dates may represent meet dates rather than exact swim dates.</p><p><strong>${rows.length} recorded results</strong> across ${keys.length} event/course combinations. Other athletes' CARIFTA qualification, Goodwill selection, USA classification and September ranking cannot be inferred from Aidan's records.</p></section>${meetSummary}${cards||'<section class="panel">No matching imported ASAJ results for this swimmer at the selected recorded age. Try another age or swimmer.</section>'}`;
}

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=(url,label='ASAJ source')=>url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`:'Pending';
const value=x=>x===null||x===undefined||x===''?'<span class="pending">Pending verification</span>':esc(x);
const card=(label,val)=>`<div class="card"><div class="label">${esc(label)}</div><div class="value">${val}</div></div>`;
const table=(headers,rows)=>`<table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
// Independent rankings from the imported ASAJ meet results, not an official ASAJ ranking.
function calculatedJamaicaRankings(d,ages=[13,14]){
 const secs=t=>{const parts=String(t||'').split(':').map(Number);return parts.length<=2&&parts.every(Number.isFinite)&&parts.every(n=>n>=0)?parts.reduce((a,b)=>a*60+b,0):null;};
 const byEvent=new Map();
 function add(event,swimmer,time,source,page,club){
  const n=secs(time);if(n===null||!event||!swimmer)return;
  const normalized=swimmer.toLowerCase().replace(/[^a-z]/g,'');
  const key=normalized==='aidanseaton'?'aidanseaton':normalized;
  if(!byEvent.has(event))byEvent.set(event,new Map());
  const group=byEvent.get(event),old=group.get(key);
  if(!old||n<old.seconds)group.set(key,{swimmer,time,seconds:n,source,page,club});
 }
 for(const r of d.asaj_competitor_results||[]){
  if(r.gender!=='Boys'||!ages.includes(Number(r.age))||r.course!=='LCM'||String(r.verified).toLowerCase()!=='true'||!r.source_pdf)continue;
  add(r.event,r.swimmer,r.time,r.source_pdf,r.source_page,r.club);
 }
 // Only include Aidan's race history in his own 13–14 age bracket.
 if(ages.includes(13))for(const r of d.race_history_2026||[]){
  if(r.course!=='LCM'||Number(r.age)!==13||!r.source_pdf)continue;
  add(r.event,'Aidan Seaton',r.time,r.source_pdf,r.source_page,r.club);
 }
 return byEvent;
}
function renderCalculatedJamaicaRankings(d){
 const byEvent=calculatedJamaicaRankings(d);
 const acquired=acquiredClassificationData(d);
 const boys12=calculatedJamaicaRankings(d,[12]);
 const events=[...new Set([...(d.events||[]).map(e=>e.event),...byEvent.keys(),...acquired.rows.map(r=>r.event)])].sort();
 const entries=events.map(event=>{
  const swimmers=[...(byEvent.get(event)?.values()||[])].sort((a,b)=>a.seconds-b.seconds||a.swimmer.localeCompare(b.swimmer));
  const aidan=swimmers.find(r=>r.swimmer.toLowerCase().replace(/[^a-z]/g,'')==='aidanseaton');
  const rank=aidan?1+swimmers.filter(r=>r.seconds<aidan.seconds-0.00001).length:null;
  const younger=[...(boys12.get(event)?.values()||[])].sort((a,b)=>a.seconds-b.seconds||a.swimmer.localeCompare(b.swimmer));
  // Hypothetical placement: Aidan is 13, so he is not part of the actual age-12 ranking.
  const rank12=aidan&&younger.length?1+younger.filter(r=>r.seconds<aidan.seconds-0.00001).length:null;
  return {event,swimmers,aidan,rank,younger,rank12};
 });
 const linkPDF=r=>r?.source?`<a href="${encodeURI(esc(r.source))}#page=${encodeURIComponent(r.page||1)}" target="_blank" rel="noopener">ASAJ PDF</a>`:'Unavailable';
 const details=entries.map((e,i)=>`<details id="rank-field-${i}" class="panel" style="margin-top:1rem"><summary><strong>${esc(e.event)} · Boys 13–14 calculated field (${e.swimmers.length})</strong></summary><div class="table-wrap">${table(['Rank','Swimmer','Best LCM','Club','Evidence'],e.swimmers.map(r=>`<tr><td>${1+e.swimmers.filter(x=>x.seconds<r.seconds-0.00001).length}</td><td>${esc(r.swimmer)}</td><td>${esc(r.time)}</td><td>${esc(r.club||'')}</td><td>${linkPDF(r)}</td></tr>`))}</div></details>`).join('');
 const combined=entries.flatMap(e=>{const classified=acquired.rows.filter(r=>r.event===e.event);return (classified.length?classified:[null]).map(r=>({e,r}));});
 return `<section class="panel"><h2>Calculated Jamaica Rankings · Boys 13–14 LCM</h2><p><strong>Independent calculation, not official ASAJ rankings.</strong> Fastest documented ASAJ result per swimmer and event, using the imported 2026 meet PDFs; all imported meet dates are included. Ages are those recorded at each meet, so this is not a championship-age eligibility list. Missing meets, mixed/unattributed results and results not imported can change these positions. Ties share a rank.</p><p><strong>Against Boys 12:</strong> hypothetical placement of Aidan's best time among verified 12-year-old swimmers, not an official ranking or an age-eligible placing.</p>${acquired.classificationSummary}<div class="table-wrap">${table(['Event','Course','PB','Date attained','USA level','CARIFTA Time Standard','Calculated rank','Against Boys 12','Swimmers with verified results','Leader','Leader time','Aidan evidence'],combined.map(({e,r})=>{const i=entries.indexOf(e);const lcm=!r||r.course==='LCM';return `<tr><td>${esc(e.event)}</td><td>${esc(r?.course||'LCM')}</td><td>${esc(r?.time||e.aidan?.time||'—')}</td><td>${esc(r?.date?r.date+(r.exact?'':' (approx.)'):'—')}</td><td>${r?.level==='Not available'?'—':esc(r?.level||'—')}</td><td>${r?.carifta==='A'||r?.carifta==='B'||r?.carifta==='Below B'?esc(r.carifta):'—'}</td><td>${!lcm?'—':e.rank===null?'—':`<a href="#rank-field-${i}" class="rank-field-link" data-rank-target="rank-field-${i}" aria-label="View ranked competitors for ${esc(e.event)}">${e.rank}</a>`}</td><td>${!lcm||e.rank12===null?'—':`${e.rank12} of ${e.younger.length+1}`}</td><td>${lcm?e.swimmers.length:'—'}</td><td>${lcm&&e.swimmers[0]?esc(e.swimmers[0].swimmer):'—'}</td><td>${lcm&&e.swimmers[0]?esc(e.swimmers[0].time):'—'}</td><td>${lcm?linkPDF(e.aidan):'—'}</td></tr>`;}))}</div>${details}</section>`;
}
document.addEventListener('click',event=>{const link=event.target.closest('a.rank-field-link');if(!link)return;const target=document.getElementById(link.dataset.rankTarget);if(target)target.open=true;});
function renderCompetition(d){
 const profile=renderSelectedSwimmer(d);
 const younger=(d.events||[]).flatMap(e=>(e.boys12||[]).map(b=>({event:e.event,...b})));
 const unique=new Set(younger.map(x=>String(x.name||'').toLowerCase()));
 const emerging=`<section class="panel"><h2>Boys 12 · Emerging competition</h2><div class="table-wrap">${table(['Event','Swimmer','Official time','Difference'],younger.length?younger.map(b=>`<tr><td>${overviewEventLink(b.event)}</td><td>${esc(b.name)}</td><td>${esc(b.time)}</td><td>${esc(b.difference)}</td></tr>`):['<tr><td colspan="4">No verified Boys 12 results within ±10% in the available ASAJ top ten.</td></tr>'])}</div><p>${younger.length} event comparisons · ${unique.size} unique swimmers; only available official top-ten entries.</p></section>`;
 return `<div class="competition-view"><h2>Competition · ASAJ results and emerging swimmers</h2>${profile}${emerging}</div>`;
}
function render(){if(!DATA)return;document.getElementById('swimmer-controls').hidden=TAB!=='competition';if(TAB==='competition'){document.querySelector('#content').innerHTML=renderCompetition(DATA);document.querySelector('#status').textContent='Competition · ASAJ results and emerging swimmers';return;} if(TAB==='jamaica'&&(SWIMMER_SELECTION.name!=='Aidan Seaton'||SWIMMER_SELECTION.gender!=='Boys'||SWIMMER_SELECTION.age!==13||SWIMMER_SELECTION.category!=='13–14')){document.querySelector('#content').innerHTML='<section class="panel"><h2>Jamaica Rankings · Aidan Seaton only</h2><p>This tab is disabled for other swimmer profiles until individual official ranking records can be verified. Select Aidan Seaton, Boys, age 13, category 13–14 to view the rankings.</p></section>';document.querySelector('#status').textContent='Jamaica Rankings unavailable for selected swimmer';return;} if(SWIMMER_SELECTION.name!=='Aidan Seaton'||SWIMMER_SELECTION.gender!=='Boys'||SWIMMER_SELECTION.age!==13||SWIMMER_SELECTION.category!=='13–14'){document.querySelector('#content').innerHTML=renderSelectedSwimmer(DATA);document.querySelector('#status').textContent='ASAJ imported results · Selection-specific standards not inferred';return;}let html='';const ev=DATA.events;
if(TAB==='championship'){html=renderChampionshipShortlist(DATA);
}else if(TAB==='intelligence'){html=renderIntelligence(DATA);
}else if(TAB==='progress'){html=renderAllEventProgress(DATA);
}else if(TAB==='trends'){html=renderTrends(DATA);
}else if(TAB==='visual'){
const sec=t=>{if(!t)return null;const a=String(t).replace(/^\+/,'').split(':').map(Number);return a.every(Number.isFinite)?a.reduce((v,x)=>v*60+x,0):null};
const gap=e=>e.second_place&&e.personal_best?sec(e.personal_best)-sec(e.second_place.time):null;
const pctGap=e=>gap(e)===null?null:100*gap(e)/sec(e.second_place.time);
const fmtGap=n=>n===null?'Not verified':(n<0?Math.abs(n).toFixed(2)+'s ahead':n.toFixed(2)+'s behind');
// Use exactly the same imported, verified LCM dataset as Jamaica Rankings.
const calculated=calculatedJamaicaRankings(DATA);
const current=ev.map(e=>{
 const swimmers=[...(calculated.get(e.event)?.values()||[])].sort((a,b)=>a.seconds-b.seconds||a.swimmer.localeCompare(b.swimmer));
 const aidan=swimmers.find(r=>r.swimmer.toLowerCase().replace(/[^a-z]/g,'')==='aidanseaton');
 // Second place is the second DISTINCT swimmer, not the historical September snapshot.
 const second=swimmers[1];
 const diff=aidan&&second?aidan.seconds-second.seconds:null;
 const percent=diff!==null&&second.seconds>0?100*diff/second.seconds:null;
 return {event:e.event,swimmers,aidan,second,diff,percent};
});
const known=current.filter(e=>e.percent!==null).sort((a,b)=>Math.abs(a.percent)-Math.abs(b.percent));
const closest=known[0]||null;
const ranked=ev.filter(e=>Number.isFinite(e.rank));const bestRank=ranked.length?Math.min(...ranked.map(e=>e.rank)):null;
const maxGap=Math.max(1,...known.map(e=>Math.abs(e.percent)));
const row=e=>`<tr><td>${overviewEventLink(e.event)}</td><td>${value(e.rank)}</td><td>${value(e.personal_best)}</td><td>${e.second_place?esc(e.second_place.swimmer):'Pending'}</td><td>${e.second_place?esc(e.second_place.time):'Pending'}</td><td class="${gap(e)!==null&&gap(e)<0?'good':''}">${pctGap(e)===null?'Unavailable':`${Math.abs(pctGap(e)).toFixed(2)}% ${gap(e)<0?'ahead':'behind'} (${fmtGap(gap(e))})`}</td></tr>`;
const bars=current.map(e=>`<div class="visual-bar-row"><span>${overviewEventLink(e.event)}</span><div class="visual-bar-track"><div class="visual-bar-fill ${e.diff===null?'':e.diff<0?'ahead':e.percent<6?'under-six':'six-plus'}" style="width:${e.percent===null?0:Math.max(2,100*Math.abs(e.percent)/maxGap).toFixed(1)}%"></div></div><strong>${e.percent===null?'Comparison unavailable':`${Math.abs(e.percent).toFixed(2)}% ${e.diff<0?'ahead':'behind'} · ${Math.abs(e.diff).toFixed(2)}s ${e.diff<0?'ahead':e.diff>0?'behind':'equal'}`}</strong></div>`).join('');
const younger=ev.flatMap(e=>e.boys12.map(b=>({event:e.event,...b})));const unique=new Set(younger.map(x=>x.name));
html=`<div class="visual-head"><div><div class="visual-eyebrow">🇯🇲 TORNADOES SWIM CLUB · BOYS 13–14</div><h2>Aidan Seaton <span>Performance Snapshot</span></h2><p>Official ASAJ rankings: 29 September 2026 · Calculated comparisons from imported verified results</p></div><div class="visual-title">CARIFTA 2027<br><span>At a glance</span></div></div>

<div class="visual-metrics"><div><small>Best September national rank</small><strong>${bestRank===null?'Pending':bestRank+'th'}</strong><span>${esc(ranked.find(e=>e.rank===bestRank)?.event||'')}</span></div><div><small>Closest to calculated 2nd</small><strong>${closest?Math.abs(closest.diff).toFixed(2)+'s':'Pending'}</strong><span>${closest?esc(closest.event)+(closest.diff<0?' · ahead':' · behind'):''}</span></div><div><small>Tracked events</small><strong>${ev.length}</strong><span>Verified meet or ranking events</span></div><div><small>Boys 13–14 competitors</small><strong>${new Set([...(calculatedJamaicaRankings(DATA,[13,14]).values())].flatMap(m=>[...m.keys()]).filter(k=>k!=='aidanseaton')).size}</strong><span>Unique imported verified rivals</span></div><div><small>Emerging Boys 12</small><strong>${unique.size}</strong><span>Within ±10% of verified times</span></div></div>
${renderCompetitiveStrength(DATA)}
<div class="visual-columns"><section class="visual-panel"><h3>All documented events · September ranking comparison</h3><div class="visual-scroll">${table(['Event','Sep rank','Aidan best LCM','2nd-place swimmer','2nd-place time','Gap'],ev.map(row))}</div><p class="visual-foot">Includes every verified individual event in the uploaded 2026 meet history, plus events documented in the September rankings. Missing ranks and podium benchmarks are not estimated.</p></section><section class="visual-panel"><h3>Gap to calculated 2nd place · % of benchmark</h3><div class="visual-bars">${bars||'No verified second-place benchmarks yet'}</div><p class="visual-foot">All documented events are listed. Green = ahead of second place; orange = behind by less than 6%; red = behind by 6% or more; no bar = insufficient verified competitor data. Calculated from imported ASAJ Boys 13–14 LCM results, not an official national ranking.</p></section></div>
<div class="visual-disclaimer">Independent visual overview · Not an ASAJ selection or ranking publication · No estimated times · Calculated comparisons depend on the available imported ASAJ meet results; missing competitor results can change positions.</div>`;
}else if(TAB==='carifta'){
const c=DATA.carifta_criteria||{}, qualified=ev.filter(e=>e.carifta?.A_met||e.carifta?.B_met).length;
html=`<div class="cards">${card('Date-verified qualifying events',qualified)}${card('Selection priority','Provisional Sep snapshot')}${card('Final team selection','Not confirmed')}</div><div class="notice"><strong>CARIFTA 2027 selection criteria:</strong> Only official LCM swims from ${esc(c.qualifying_period_start||'2026-07-01')} through the final local qualifying meet are eligible. Its closing date is not yet verified. Earlier 2026 results remain in Race History but cannot qualify for CARIFTA 2027. A/B standard alone does not guarantee selection. September 29 rankings are shown as a provisional comparison, not a current 1st/2nd-place selection rank. A September snapshot does not establish whether a swim occurred after July 1.</div><div class="panel"><h2>CARIFTA 2027 | Qualification and selection</h2>${table(['Event','Eligible LCM best (from Jul 2026)','A standard / gap','B standard / gap','Time qualification','Sep 2026 rank','Provisional priority','Selection priority','Evidence'],ev.map(e=>{const q=e.carifta||{}, A=e.standards.A, B=e.standards.B;return `<tr><td>${esc(e.event)}</td><td>${value(q.eligible_best)}</td><td>${A?esc(A.time)+' / '+value(q.A_gap):'Pending'}</td><td>${B?esc(B.time)+' / '+value(q.B_gap):'Pending'}</td><td>${value(q.standard_status)}</td><td>${value(q.provisional_snapshot_rank)}</td><td>${value(q.provisional_selection_priority)}</td><td>${value(q.selection_priority)}</td><td>${q.eligible_source_pdf?`<a href="${encodeURI(esc(q.eligible_source_pdf))}#page=${esc(q.eligible_source_page)}" target="_blank" rel="noopener">Official meet PDF</a>`:'No eligible dated result verified'}</td></tr>`}))}</div><div class="panel"><h2>ASAJ selection rules and limitations</h2><p><strong>Priority 1:</strong> A-standard swimmers ranked 1st or 2nd in a qualifying event, followed by B-standard swimmers in the 11–12 age group, then B-standard swimmers aged 13 and over ranked 1st or 2nd.</p><p><strong>Limits:</strong> Eight swimmers per gender and age group, 36 swimmers overall. Eligible A-standard swimmers ranked 1st/2nd are prioritized before B-standard swimmers, regardless of how many B times another swimmer has. Within the same selection tier, tie-breakers count qualifying events ranked 1st/2nd, then AQUA points. Relay additions have separate conditions.</p><p><strong>Pending verification:</strong> Current ASAJ qualifying-period rankings, final qualifying-meet date, all-team candidate results, eligibility, AQUA points and ASAJ Council ratification. These are required before any credible team-selection projection.</p><p><a href="${esc(c.source_pdf||'carifta-documents/2026 Carifta Criteria.pdf')}" target="_blank" rel="noopener">Official CARIFTA selection criteria (PDF)</a></p></div>`;
}else if(TAB==='goodwill'){
const g=DATA.goodwill||{}, ge=g.events||[];
const aCount=ge.filter(e=>e.standards.A.met===true).length, bCount=ge.filter(e=>e.standards.B.met===true).length;
html=`<div class="cards">${card('Goodwill 2026 A standards',aCount)}${card('Goodwill 2026 B standards',bCount)}${card('Selection status','Not confirmed')}</div><div class="notice">Official 2026 Boys 13–14 standards, not 2027 standards. This is a historical 2026 comparison, not a forecast or confirmation of team selection. September 29 rankings were published after Goodwill 2026 and cannot retrospectively establish qualifying-period selection rank. ASAJ considers eligible SCM and LCM times, but this tracker currently compares verified LCM times only. Times must fall in the qualifying window, beginning 1 December 2025 and ending at the final local qualifying meet; the exact closing date was not provided. A or B standard alone does not secure selection.</div><div class="panel"><h2>Goodwill 2026 | Boys 13–14</h2>${table(['Event','Verified LCM best','A standard','Gap to A','B standard','Gap to B','Sep 2026 rank','Selection projection','Evidence'],ge.map(e=>`<tr><td>${esc(e.event)}</td><td>${value(e.personal_best)}</td><td>${esc(e.standards.A.time)}</td><td>${value(e.standards.A.gap)}</td><td>${esc(e.standards.B.time)}</td><td>${value(e.standards.B.gap)}</td><td>${value(e.snapshot_rank)}</td><td>${value(e.selection_priority)}</td><td>${e.pb_evidence_pdf?`<a href="${encodeURI(esc(e.pb_evidence_pdf))}#page=${esc(e.pb_evidence_page)}" target="_blank" rel="noopener">Meet PDF</a>`:link(e.pb_source,'ASAJ ranking')}</td></tr>`))}</div><div class="panel"><h2>ASAJ Goodwill 2026 selection criteria</h2><p><strong>Priority 1:</strong> Swimmers must achieve A (considered first) or B standard and rank 1st or 2nd in at least one individual event. Maximum four swimmers per age group, subject to tiebreakers. <strong>Priority 2:</strong> If only two or three swimmers qualify, relay selection may fill places; the additional swimmer must achieve at least one B standard. Rankings use ASAJ Hy-Tek records. Eligibility, registration, passport and availability requirements apply, and the ASAJ Council ratifies final selection.</p><p><a href="goodwill-documents/2026%20Goodwill%20Qualifying%20Times.pdf" target="_blank">2026 qualifying times</a> · <a href="goodwill-documents/Goodwill%202026%20Criteria%2011%20%26%20Over.pdf" target="_blank">2026 selection criteria</a></p><p><strong>Important:</strong> The official documents supplied cover 2026, not Goodwill 2027. Do not treat these as future standards.</p></div>`;
}else if(TAB==='jamaica'){
 const secs=t=>{const a=String(t||'').split(':').map(Number);return a.length<=2&&a.every(Number.isFinite)?a.reduce((v,x)=>v*60+x,0):null;};
 const gap=e=>e.second_place&&e.personal_best?secs(e.personal_best)-secs(e.second_place.time):null;
 const pctGap=e=>gap(e)===null?null:100*gap(e)/secs(e.second_place.time);
 const fmtGap=n=>n===null?'Not verified':(n<0?Math.abs(n).toFixed(2)+'s ahead':n.toFixed(2)+'s behind');
 html=renderCalculatedJamaicaRankings(DATA)+`<div class="cards">${card('Official snapshot ranked events',ev.filter(e=>e.rank!==null).length)}${card('Second-place gaps verified',ev.filter(e=>e.second_place&&e.personal_best).length)}${card('Boys 12 in range',ev.reduce((n,e)=>n+(e.boys12||[]).length,0))}</div><div class="panel"><h2>Official ASAJ ranking snapshot · 29 September 2026</h2><p>The ASAJ snapshot below is historical. It is separate from the calculated ranking above and does not reflect later results. Gaps compare Aidan's documented best against the snapshot's second-place benchmark.</p>${table(['Event','Fastest verified LCM time','ASAJ rank (Sep 2026)','2nd-place swimmer','2nd-place time','Gap to 2nd (%)'],ev.map(e=>`<tr><td>${esc(e.event)}</td><td>${value(e.personal_best)}</td><td>${value(e.rank)}</td><td>${e.second_place?esc(e.second_place.swimmer):value(null)}</td><td>${e.second_place?esc(e.second_place.time):value(null)}</td><td>${pctGap(e)===null?'Unavailable':`${Math.abs(pctGap(e)).toFixed(2)}% ${gap(e)<0?'ahead':'behind'} (${fmtGap(gap(e))})`}</td></tr>`))}</div>`;
 }else if(TAB==='history'){
const races=DATA.race_history_2026||[];
html=`<div class="cards">${card('Verified 2026 swims',races.length)}${card('Meets represented',new Set(races.map(r=>r.meet_name)).size)}</div><div class="panel"><h2>Aidan's verified 2026 race history</h2><p>Only finished swims extracted from uploaded official ASAJ results PDFs appear here. For multi-day meets, the date shown is the meet range, not the exact race day. Seed times, entries and uncertain matches are excluded.</p>${table(['Date','Meet','Event','Round','Time','Club / team','Evidence'],races.length?races.map(r=>`<tr><td>${esc(r.meet_dates||r.race_date)}</td><td>${esc(r.meet_name)}</td><td>${esc(r.event)}</td><td>${esc(r.round)}</td><td>${esc(r.time)}</td><td>${esc(r.club)}</td><td>${r.source_pdf?`<a href="${encodeURI(esc(r.source_pdf))}#page=${esc(r.source_page)}" target="_blank" rel="noopener">Official PDF p.${esc(r.source_page)}</a>`:link(r.source_url)}</td></tr>`):['<tr><td colspan="7">Pending verification of individual 2026 meet results.</td></tr>'])}</div>`;
}else if(TAB==='upload'){
html=`<div class="panel"><h2>Upload official ASAJ meet results</h2><p>Upload new <strong>2026 meet-results PDFs</strong> to GitHub. You must be signed in with repository write access. This public dashboard does not collect credentials or store uploads.</p><p><a href="https://github.com/AndrewCheeky/aidan-carifta-tracker/upload/main/sources/asaj/2026" target="_blank" rel="noopener noreferrer">Open secure GitHub PDF upload</a></p><ol><li>Select one or more official ASAJ results PDFs.</li><li>Commit directly to <strong>main</strong>.</li><li>GitHub Actions runs <strong>Import uploaded ASAJ meet PDFs</strong>, checks the evidence and requests automatic merging.</li><li>Once merged, refresh this dashboard to see the results.</li></ol><p>Seed sheets, relay listings, disqualifications and uncertain results are held back. Multi-day meets display their date range, not an invented race date.</p><p><a href="https://github.com/AndrewCheeky/aidan-carifta-tracker/actions/workflows/import-uploaded-pdfs.yml" target="_blank" rel="noopener noreferrer">View import status and audit logs</a></p></div>`;
}else if(TAB==='swimcloud'){
const existing=DATA.race_history_2026||[];
const key=r=>[String(r.event||'').toLowerCase().replace(/[^a-z0-9]/g,''),String(r.course||'').toUpperCase(),String(r.time||'').trim(),String(r.round||'').toLowerCase(),String(r.meet_name||'').toLowerCase().replace(/[^a-z0-9]/g,'')].join('|');
const counts=new Map();existing.forEach(r=>counts.set(key(r),(counts.get(key(r))||0)+1));
const dupes=[...counts.values()].reduce((n,v)=>n+Math.max(0,v-1),0);
const supplemental=DATA.swimcloud_supplemental||[];
const supplementalRows=supplemental.map(r=>`<tr><td>${esc(r.event)} ${esc(r.course)}</td><td>${esc(r.time)}</td><td>${esc(r.meet_name)}</td><td>${esc(r.race_date)}</td><td>${r.source_url?`<a href="${esc(r.source_url)}" target="_blank" rel="noopener noreferrer">SwimCloud result</a>`:"Not linked"}</td></tr>`);
html=`<div class="cards">${card('ASAJ race records',existing.length)}${card('Exact-key duplicate candidates',dupes)}${card('SwimCloud imports','Review required')}</div><div class="panel"><h2>Historical SwimCloud times · 2023–2026</h2><p>${supplemental.length} user-supplied results, kept separate from ASAJ-verified race history. These are not independently verified, do not affect official qualification or ranking, and may overlap with ASAJ results. LCM and SCM are distinct.</p><div class="visual-scroll">${table(['Event / course','Time','Meet','Date','Source'],supplementalRows)}</div></div><div class="panel"><h2>Duplicate protection</h2><p>Review matches on event, course, time, meet and round, then confirm swimmer and race date. Identical times in different meets are <strong>not</strong> automatically duplicates. Different rounds in the same meet remain distinct. Conflicts and ambiguous matches require manual review.</p><p>Existing CSV exact-key duplicate candidates: <strong>${dupes}</strong>. This is a preliminary audit, not a guarantee that all duplicates have been identified.</p></div>`;
}else if(TAB==='meets'){
const today=new Date().toISOString().slice(0,10);html=`<div class="panel"><h2>ASAJ Upcoming Meets & Milestones</h2><p>Official calendar listings do not establish that Aidan is entered.</p>${table(['Meet / milestone','Dates','Listing','Official source'],DATA.meets.filter(m=>m.end>=today).map(m=>`<tr><td>${esc(m.name)}</td><td>${esc(m.start)}${m.start===m.end?'':' to '+esc(m.end)}</td><td>${esc(m.status)}</td><td>${link(m.url)}</td></tr>`))}</div>`;
}else{html=`<div class="panel"><h2>Official documents and verification status</h2>${table(['Dataset','Document','Publication','Status','Link'],Object.entries(DATA.sources).map(([k,s])=>`<tr><td>${esc(k)}</td><td>${esc(s.document)}</td><td>${value(s.published)}</td><td>${esc(s.status)}</td><td>${link(s.url)}</td></tr>`))}</div><div class="notice">All athlete times, rankings and standards require a source URL, source date, exact event and course match, and an explicit verification flag. No estimated or seed-only times are accepted as verified personal bests.</div>`}
document.querySelector('#content').innerHTML=html;document.querySelector('#status').textContent=`Data generated: ${DATA.built_at} · Official-only validation enabled`;
}
document.querySelectorAll('nav button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('nav button').forEach(x=>x.classList.remove('active'));b.classList.add('active');TAB=b.dataset.tab;if(TAB!=='competition'&&SWIMMER_SELECTION.name!=='Aidan Seaton'){SWIMMER_SELECTION={name:'Aidan Seaton',gender:'Boys',age:13,category:'13–14'};setupSwimmerControls();}render()}));
fetch('legacy-data.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Data not found');return r.json()}).then(d=>{DATA=d;setupSwimmerControls();render()}).catch(e=>document.querySelector('#status').textContent='Unable to load verified data: '+e.message);

// Race-by-race trends. Meet start dates are placement proxies where exact race days are unknown.
const trendSeconds=t=>{const parts=String(t||'').split(':').map(Number);return parts.length&&parts.every(Number.isFinite)?parts.reduce((v,n)=>v*60+n,0):null};
const trendTime=n=>{if(n===null||!Number.isFinite(n))return 'Pending';const m=Math.floor(n/60),ss=(n%60).toFixed(2).padStart(5,'0');return m?`${m}:${ss}`:ss};
const trendEventNames=d=>[...new Set([...(d.athlete?.events||[]),...(d.events||[]).map(e=>e.event),...(d.race_history_2026||[]).map(r=>r.event),...(d.swimcloud_supplemental||[]).map(r=>r.event)])].sort();
const trendSwims=(d,event,course)=>{
 const official=(d.race_history_2026||[]).filter(r=>r.event===event&&r.course===course&&trendSeconds(r.time)!==null).map(r=>({...r,origin:'ASAJ verified',date:r.race_date,precision:r.date_precision||'exact'}));
 const supplementary=(d.swimcloud_supplemental||[]).filter(r=>r.event===event&&r.course===course&&trendSeconds(r.time)!==null).map(r=>({...r,origin:'SwimCloud supplied (unverified)',date:r.race_date,precision:'exact'}));
 // Same meet, time and course can appear in both sources; preserve official version when matched.
 const normalize=x=>String(x||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const filtered=supplementary.filter(r=>!official.some(o=>o.event===r.event&&o.course===r.course&&Math.abs(trendSeconds(o.time)-trendSeconds(r.time))<.005&&(normalize(o.meet_name).includes(normalize(r.meet_name))||normalize(r.meet_name).includes(normalize(o.meet_name))) ));
 return [...official,...filtered].sort((a,b)=>String(a.date).localeCompare(String(b.date))|| (a.origin==='ASAJ verified'?-1:1));
};
function renderTrends(d){
 const names=trendEventNames(d);
 const summary=names.flatMap(name=>['LCM','SCM'].map(course=>{
  const swims=trendSwims(d,name,course), first=swims[0],last=swims.at(-1),change=swims.length>1?trendSeconds(last.time)-trendSeconds(first.time):null;
  return `<tr><td><a href="#trends" class="trend-event-link" data-event="${esc(name)}" data-course="${course}">${esc(name)}</a></td><td>${course}</td><td>${swims.length}</td><td>${first?esc(first.time):'—'}</td><td>${last?esc(last.time):'—'}</td><td>${change===null?'—':`${change>0?'+':''}${change.toFixed(2)}s`}</td><td>${change===null?'Insufficient history':change<0?'Improved':change>0?'Slower latest swim':'Unchanged'}</td></tr>`;
 }));
 return `<div class="panel"><h2>Performance Trends · all ${names.length} documented events</h2><p>Official ASAJ results and user-supplied SwimCloud results are shown as distinct series. SwimCloud data is supplementary and not independently verified. SCM and LCM are never mixed or converted. ASAJ meet-range dates are approximate.</p><div id="trend-detail"></div></div><div class="panel"><h2>All-event progress summary · both courses</h2><p>First-to-latest changes include supplementary SwimCloud times and must not be treated as independently verified qualification evidence.</p><div class="visual-scroll">${table(['Event','Course','Swims','First','Latest','Change','Assessment'],summary)}</div></div><div class="notice">Training reference only. Qualification and national rankings continue to use their separate official-source rules.</div>`;
}
function drawTrendDetail(targetOverride){
 const target=targetOverride||document.getElementById('trend-detail');if(!target||!DATA)return;
 const name=TREND_SELECTION.event||trendEventNames(DATA)[0],course=TREND_SELECTION.course;
 const swims=trendSwims(DATA,name,course);
 if(!swims.length){target.innerHTML='<p class="pending">No recorded swims for this event and course.</p>';return;}
 const vals=swims.map(r=>trendSeconds(r.time));let pb=Infinity;
 const bests=vals.map(v=>(pb=Math.min(pb,v)));
 const low=Math.min(...vals)-2,high=Math.max(...vals)+2,w=740,h=250,left=65,right=18,top=22,bottom=46;
 const xx=i=>left+(swims.length===1?(w-left-right)/2:i*(w-left-right)/(swims.length-1)),yy=v=>top+(high-v)*(h-top-bottom)/(high-low);
 const line=arr=>arr.map((v,i)=>`${i?'L':'M'}${xx(i).toFixed(1)},${yy(v).toFixed(1)}`).join(' ');
 const grid=Array.from({length:5},(_,i)=>{const v=low+(high-low)*i/4,y=yy(v);return `<line x1="${left}" y1="${y}" x2="${w-right}" y2="${y}" stroke="currentColor" opacity=".12"/><text x="${left-8}" y="${y+4}" text-anchor="end" fill="currentColor" font-size="12">${trendTime(v)}</text>`}).join('');
 const dots=swims.map((r,i)=>`<circle cx="${xx(i)}" cy="${yy(vals[i])}" r="5" fill="${r.origin==='ASAJ verified'?'#e3a300':'#6e80ef'}"><title>${esc(r.meet_name)} · ${esc(r.origin)} · ${esc(r.time)} · ${esc(r.date)}</title></circle>`).join('');
 const change=swims.length>1?vals.at(-1)-vals[0]:null;
 const official=swims.filter(r=>r.origin==='ASAJ verified');
  // Calculate comparison positions from documented ASAJ Boys 13–14 LCM results.
  // One fastest swim per competitor per event, never mixing courses.
  const competitors=new Map();
  if(course==='LCM')for(const r of (DATA.asaj_competitor_results||[])){
   if(r.event!==name||r.course!=='LCM'||r.gender!=='Boys'||![13,14].includes(Number(r.age))||String(r.verified).toLowerCase()!=='true')continue;
   const who=String(r.swimmer||'').trim().toLowerCase();
   if(!who||who==='aidan seaton'||who==='seaton, aidan')continue;
   const t=trendSeconds(r.time);if(t===null)continue;
   if(!competitors.has(who)||t<competitors.get(who))competitors.set(who,t);
  }
  const leaders=[...competitors.values()].sort((a,b)=>a-b).slice(0,2);
  const bestShown=Math.min(...vals);
  const rankGap=(t,place)=>{
   if(t===undefined)return card(`${place} place (imported ASAJ)`, 'Unavailable');
   const seconds=bestShown-t,pct=100*seconds/t;
   const direction=seconds>.005?'behind':seconds<-.005?'ahead':'level';
   return card(`${place} place (imported ASAJ)`,`${Math.abs(pct).toFixed(2)}% ${direction} · ${Math.abs(seconds).toFixed(2)}s ${direction}`);
  };
  const cards=`<div class="cards">${card('ASAJ swims',official.length)}${rankGap(leaders[0],'First')}${rankGap(leaders[1],'Second')}${card('Best shown (mixed sources)',trendTime(bestShown))}${card('First to latest',change===null?'Insufficient history':`${change>0?'+':''}${change.toFixed(2)}s ${change<0?'faster':change>0?'slower':'unchanged'}`)}</div>`;
 target.innerHTML=cards+`<div class="trend-chart"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(name)} ${esc(course)} race times and personal-best progression" preserveAspectRatio="xMidYMid meet">${grid}<path d="${line(bests)}" fill="none" stroke="#24a47c" stroke-width="3" stroke-dasharray="7 5"/><path d="${line(vals)}" fill="none" stroke="#e3a300" stroke-width="2" opacity=".65"/>${dots}<text x="${left}" y="${h-13}" fill="currentColor" font-size="12">Earliest recorded swim</text><text x="${w-right}" y="${h-13}" text-anchor="end" fill="currentColor" font-size="12">Latest recorded swim</text></svg></div><p><strong style="color:#e3a300">● ASAJ verified</strong> · <strong style="color:#6e80ef">● SwimCloud supplied, unverified</strong> · <strong style="color:#24a47c">- - Best recorded progression (mixed sources)</strong></p><div class="visual-scroll">${table(['Meet / date','Round','Time','Verification','Source'],swims.map(r=>`<tr><td>${esc(r.meet_name)}<small> · ${esc(r.meet_dates||r.date)}${r.precision==='meet_range'?' (approx.)':''}</small></td><td>${esc(r.round||'Unspecified')}</td><td>${esc(r.time)}</td><td>${esc(r.origin)}</td><td>${r.origin==='ASAJ verified'&&r.source_pdf?`<a href="${encodeURI(esc(r.source_pdf))}#page=${esc(r.source_page)}" target="_blank" rel="noopener">Official PDF p.${esc(r.source_page)}</a>`:r.source_url?link(r.source_url,'SwimCloud result'):'Not linked'}</td></tr>`))}</div>`;
}
// The main render replaces the tab content, so install controls after every render.
const originalRender=render;render=function(){originalRender();if(TAB==='trends'){document.querySelectorAll('.trend-event-link').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();TREND_SELECTION.event=el.dataset.event;TREND_SELECTION.course=el.dataset.course||TREND_SELECTION.course;drawTrendDetail();document.getElementById('trend-detail')?.scrollIntoView({behavior:'smooth',block:'start'});}));document.querySelectorAll('.trend-course-link').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();TREND_SELECTION.course=el.dataset.course;drawTrendDetail();}));drawTrendDetail();}};

// Coaching heuristic only: independent of official qualification and rankings.
// All gap comparisons use the same imported ASAJ Boys 13–14 LCM ranking dataset.
function swimOpportunityRows(d,metrics){
 const rankings=calculatedJamaicaRankings(d);
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 // Distinct ASAJ competitors only. Multiple swims by one swimmer count once.
 // Pace uses the earliest and latest documented meet for each rival, and only
 // when both are on different dates. Meet-start dates are approximations.
 const histories=new Map();
 for(const r of d.asaj_competitor_results||[]){
  if(r.gender!=='Boys'||![13,14].includes(Number(r.age))||r.course!=='LCM'||String(r.verified).toLowerCase()!=='true'||!r.source_pdf)continue;
  const who=String(r.swimmer||'').toLowerCase().replace(/[^a-z]/g,'');
  const seconds=trendSeconds(r.time),date=String(r.meet_start||'');
  if(!who||who==='aidanseaton'||seconds===null||!/^\d{4}-\d{2}-\d{2}$/.test(date))continue;
  const key=r.event+'|'+who;
  if(!histories.has(key))histories.set(key,new Map());
  const byDate=histories.get(key),old=byDate.get(date);
  if(old===undefined||seconds<old)byDate.set(date,seconds);
 }
 return metrics.filter(m=>m.course==='LCM').map(m=>{
  const ranked=[...(rankings.get(m.name)?.values()||[])].sort((a,b)=>a.seconds-b.seconds);
  const aidan=ranked.find(r=>r.swimmer.toLowerCase().replace(/[^a-z]/g,'')==='aidanseaton');
  const second=ranked[1];
  if(!aidan||!second||ranked.length<2)return {...m,opportunity:null,reason:'Insufficient verified competitor results'};
  const gapPct=100*(aidan.seconds-second.seconds)/second.seconds;
  // A smaller gap is better; a lead earns full points.
  const gapScore=30*(1-clamp(gapPct,0,10)/10);
  const recent=m.swims.slice(-3).map(r=>trendSeconds(r.time)).filter(Number.isFinite);
  const trendPct=recent.length>=2?100*(recent[0]-recent.at(-1))/recent[0]:null;
  const trendScore=trendPct===null?null:25*clamp((trendPct+3)/6,0,1);
  const historyPct=m.swims.length>=2?100*(m.first-m.best)/m.first:null;
  const potentialScore=historyPct===null?null:15*clamp(historyPct/6,0,1);
  // Density is the number of documented rivals within 10% of Aidan's time.
  // This measures relevant competition, rather than all entrants in the event.
  const rivals=ranked.filter(r=>r.swimmer.toLowerCase().replace(/[^a-z]/g,'')!=='aidanseaton');
  const closeRivals=rivals.filter(r=>r.seconds<=aidan.seconds*1.10).length;
  // Smooth diminishing penalty; 0 close rivals = 15, 20+ = 0.
  const densityScore=15*(1-clamp(Math.log1p(closeRivals)/Math.log1p(20),0,1));
  const paceSamples=[];
  for(const r of rivals){
   const key=m.name+'|'+r.swimmer.toLowerCase().replace(/[^a-z]/g,'');
   const byDate=histories.get(key);
   if(!byDate||byDate.size<2)continue;
   const dates=[...byDate.keys()].sort(),first=byDate.get(dates[0]),last=byDate.get(dates.at(-1));
   const days=(Date.parse(dates.at(-1))-Date.parse(dates[0]))/86400000;
   if(days<14||first<=0)continue;
   // Normalized percentage improvement per 90 days, capped to avoid
   // over-weighting a single rapid change from a short observation window.
   paceSamples.push(clamp(100*(first-last)/first*90/days,-5,5));
  }
  // Require at least two independently tracked competitors for pace evidence.
  // Otherwise use a neutral 7.5/15 rather than assuming slow rivals.
  const pacePct=paceSamples.length>=2?paceSamples.reduce((x,y)=>x+y,0)/paceSamples.length:null;
  const paceScore=pacePct===null?7.5:15*(1-clamp((pacePct+2)/4,0,1));
  if(trendScore===null||potentialScore===null)return {...m,opportunity:null,reason:'Insufficient dated race history',gapPct,second,closeRivals,pacePct};
  const opportunity=gapScore+trendScore+potentialScore+densityScore+paceScore;
  return {...m,opportunity,gapPct,second,gapScore,trendScore,potentialScore,densityScore,paceScore,trendPct,historyPct,closeRivals,pacePct,paceSampleCount:paceSamples.length,competitorCount:rivals.length,reason:pacePct===null?'Rival pace unavailable; neutral weighting':'Coaching estimate'};
 }).sort((a,b)=>(b.opportunity??-1)-(a.opportunity??-1));
}
function renderSwimOpportunity(d,metrics){
 const results=swimOpportunityRows(d,metrics);
 const rows=results.map(r=>`<tr><td>${esc(r.name)}</td><td>${r.opportunity===null?'Unavailable':`<strong>${r.opportunity.toFixed(0)}/100</strong>`}</td><td>${r.gapPct===undefined?'Unavailable':`${Math.abs(r.gapPct).toFixed(2)}% ${r.gapPct>0?'behind':r.gapPct<0?'ahead':'level'}`}</td><td>${r.trendPct===undefined?'Unavailable':`${r.trendPct>=0?'+':''}${r.trendPct.toFixed(2)}%`}</td><td>${r.historyPct===undefined?'Unavailable':`${r.historyPct.toFixed(2)}%`}</td><td>${r.closeRivals===undefined?'Unavailable':`${r.closeRivals} within 10% (${r.competitorCount} documented rivals)`}</td><td>${r.pacePct===undefined||r.pacePct===null?'Insufficient history':`${r.pacePct>=0?'+':''}${r.pacePct.toFixed(2)}% per 90 days (${r.paceSampleCount} rivals)`}</td><td>${esc(r.reason||'Coaching estimate')}</td></tr>`);
 return `<section class="panel"><h2>Opportunity Score · LCM</h2><p>A coaching priority indicator, not a national ranking or prediction. Higher scores favour a smaller gap to second place, stronger personal improvement, fewer nearby competitors and slower-improving rivals.</p><div class="visual-scroll">${table(['Event','Opportunity score','Gap to calculated 2nd','Recent trend','Historical PB improvement','Nearby competition','Rival improvement pace','Evidence'],rows)}</div><p class="muted">Weights: competitive gap 30%, recent improvement 25%, historical event progress 15%, nearby competitor density 15%, rival improvement pace 15%. Density counts distinct imported ASAJ Boys 13–14 LCM swimmers within 10% of Aidan's best verified time, not total entries. Rival pace compares earliest and latest documented meets (at least 14 days apart) and requires two rivals with repeat results; otherwise a neutral score is used. Meet dates may be approximate. Imported meets are incomplete, so a low competitor count does not prove a weak field. Recent and historical Aidan trends may include supplementary SwimCloud results. Scores are coaching heuristics, not validated probabilities.</p></section>`;
}

// Competitive Strength Profile: comparative, evidence-limited LCM radar.
// Uses the same fastest-per-swimmer ASAJ ranking source as Jamaica Rankings.
function renderCompetitiveStrength(d){
 const disciplines=[['Free','Free'],['Back','Back'],['Breast','Breast'],['Fly','Fly'],['IM','IM']];
 const groups=[['13–14',[13,14]],['Boys 12',[12]],['Combined',[12,13,14]]];
 const escName=s=>String(s||'').toLowerCase().replace(/[^a-z]/g,'');
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const byGroup=groups.map(([label,ages])=>{
  const rankings=calculatedJamaicaRankings(d,ages);
  // Aidan's benchmark is always his own ASAJ verified LCM result, independent of rival age.
  const own=calculatedJamaicaRankings(d,[13,14]);
  const perDiscipline=disciplines.map(([short,token])=>{
   const events=[...own.keys()].filter(name=>name.split(' ').slice(1).join(' ')===token);
   const eventRows=[];
   for(const event of events){
    const aidan=own.get(event)?.get('aidanseaton');
    if(!aidan)continue;
    const rivals=[...(rankings.get(event)?.entries()||[])].filter(([key])=>key!=='aidanseaton').map(([,r])=>r);
    if(rivals.length<2)continue; // No meaningful comparison from an isolated rival.
    const faster=rivals.filter(r=>r.seconds<aidan.seconds-.00001).length;
    const percentile=100*(1-faster/rivals.length);
    const leader=Math.min(...rivals.map(r=>r.seconds));
    const gap=100*(aidan.seconds-leader)/leader;
    const gapScore=100*(1-clamp(gap,0,10)/10);
    const close=rivals.filter(r=>r.seconds<=aidan.seconds*1.10).length;
    const densityScore=100*(1-clamp(Math.log1p(close)/Math.log1p(20),0,1));
    // Rival pace is assessed only with repeated, dated ASAJ swims, not inferred from a PB.
    const rivalIds=new Set(rivals.map(r=>escName(r.swimmer)));
    const histories=new Map();
    for(const r of d.asaj_competitor_results||[]){
     if(r.event!==event||r.course!=='LCM'||r.gender!=='Boys'||!ages.includes(Number(r.age))||String(r.verified).toLowerCase()!=='true'||!r.source_pdf)continue;
     const id=escName(r.swimmer),day=String(r.meet_start||'');
     if(!rivalIds.has(id)||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(day))continue;
     const time=trendSeconds(r.time);if(time===null)continue;
     if(!histories.has(id))histories.set(id,new Map());
     const h=histories.get(id);h.set(day,Math.min(h.get(day)??Infinity,time));
    }
    const pace=[];
    for(const h of histories.values()){
     const dates=[...h.keys()].sort();if(dates.length<2)continue;
     const days=(Date.parse(dates.at(-1))-Date.parse(dates[0]))/86400000;
     if(days<14)continue;
     pace.push(clamp(100*(h.get(dates[0])-h.get(dates.at(-1)))/h.get(dates[0])*90/days,-5,5));
    }
    const paceAverage=pace.length>=2?pace.reduce((a,b)=>a+b,0)/pace.length:null;
    const paceScore=paceAverage===null?50:100*(1-clamp((paceAverage+2)/4,0,1));
    const score=.4*percentile+.3*gapScore+.2*densityScore+.1*paceScore;
    eventRows.push({event,score,faster,rivals:rivals.length,gap,close,paceAverage});
   }
   return {name:short,events:eventRows,score:eventRows.length?eventRows.reduce((a,b)=>a+b.score,0)/eventRows.length:null};
  });
  return {label,disciplines:perDiscipline};
 });
 const centerX=170,centerY=153,radius=106;
 const point=(i,r)=>`${(centerX+Math.cos(-Math.PI/2+i*2*Math.PI/5)*r).toFixed(1)},${(centerY+Math.sin(-Math.PI/2+i*2*Math.PI/5)*r).toFixed(1)}`;
 const grid=[20,40,60,80,100].map(v=>`<polygon points="${Array.from({length:5},(_,i)=>point(i,radius*v/100)).join(' ')}" fill="none" stroke="currentColor" stroke-opacity=".16"/>`).join('');
 const axes=disciplines.map(([,name],i)=>`<line x1="${centerX}" y1="${centerY}" x2="${point(i,radius).replace(',','" y2="')}" stroke="currentColor" stroke-opacity=".18"/>`).join('');
 const labels=[[170,22],[305,105],[264,291],[76,291],[34,105]];
 const svgLabels=disciplines.map(([name],i)=>`<text x="${labels[i][0]}" y="${labels[i][1]}" text-anchor="middle" font-size="14" fill="currentColor">${name}</text>`).join('');
 const panels=byGroup.map((g,idx)=>{
  const valid=g.disciplines.filter(x=>x.score!==null);
  const shape=valid.length===5?`<polygon points="${g.disciplines.map((x,i)=>point(i,radius*x.score/100)).join(' ')}" fill="#0891b2" fill-opacity=".25" stroke="#0891b2" stroke-width="2.5"/>`:'';
  const dots=g.disciplines.map((x,i)=>x.score===null?'':`<circle cx="${point(i,radius*x.score/100).split(',')[0]}" cy="${point(i,radius*x.score/100).split(',')[1]}" r="4" fill="#0891b2"/>`).join('');
  const details=g.disciplines.map(x=>`<details class="panel"><summary><strong>${esc(x.name)} · ${x.score===null?'Unavailable':x.score.toFixed(0)+'/100'}</strong> (${x.events.length} comparable events)</summary>${x.events.length?`<div class="table-wrap">${table(['Event','Score','Faster rivals','Leader gap','Rivals within 10%','Rival pace / 90 days'],x.events.map(e=>`<tr><td>${overviewEventLink(e.event)}</td><td>${e.score.toFixed(0)}</td><td>${e.faster} of ${e.rivals}</td><td>${e.gap>0?e.gap.toFixed(2)+'% behind':Math.abs(e.gap).toFixed(2)+'% ahead'}</td><td>${e.close}</td><td>${e.paceAverage===null?'Insufficient history':e.paceAverage.toFixed(2)+'%'}</td></tr>`))}</div>`:'<p>Insufficient imported verified LCM competitors for a meaningful comparison.</p>'}</details>`).join('');
  return `<div class="strength-group" data-strength-group="${idx}" ${idx?'hidden':''}><div style="max-width:460px;margin:auto"><svg viewBox="0 0 340 315" role="img" aria-label="${esc(g.label)} competitive strength radar">${grid}${axes}${shape}${dots}${svgLabels}</svg></div><p class="muted">${valid.length} of 5 disciplines have sufficient imported competitor evidence. Missing disciplines are not scored.</p><div class="strength-details">${details}</div></div>`;
 }).join('');
 return `<section class="panel"><h2>Competitive Strength Profile · LCM</h2><p>How Aidan compares with documented Jamaican competitors across Free, Back, Breast, Fly and IM. Higher scores indicate a stronger competitive position, not a predicted result.</p><label for="strength-age-group">Compare against </label><select id="strength-age-group" aria-label="Competitive strength age group"><option value="0">Boys 13–14</option><option value="1">Boys 12</option><option value="2">Combined 12–14</option></select>${panels}<p class="muted">Score: ranking percentile 40%, gap to fastest rival 30%, nearby competitor density 20%, rival improvement pace 10%. Each documented event contributes equally within its stroke. Requires at least two imported rivals per event. Rival pace with insufficient history is neutral. Based on available ASAJ-verified LCM results across all imported meet dates, not the CARIFTA selection period or an official ranking. Age is recorded at the meet.</p></section>`;
}
// All-event small multiples. Faster swim times are better; first/latest are chronological.
function renderAllEventProgress(d){
 const metrics=['LCM','SCM'].flatMap(course=>intelligenceMetrics(d,course));
 const eligible=metrics.filter(m=>m.pct!==null);
 const strongest=[...eligible].sort((a,b)=>b.pct-a.pct).slice(0,3);
 const slower=metrics.filter(m=>m.recentChange!==null&&m.recentChange<-.005).sort((a,b)=>a.recentChange-b.recentChange).slice(0,3);
 const bestDate=m=>{
  const matches=m.swims.filter(r=>Math.abs(trendSeconds(r.time)-m.best)<.005);
  const r=matches.sort((a,b)=>String(a.date).localeCompare(String(b.date)))[0];
  return r?`${esc(r.date||'Date unavailable')}${r.precision==='meet_range'?' (approx.)':''}`:'Date unavailable';
 };
 const pbAge=m=>{
  const matches=m.swims.filter(r=>Math.abs(trendSeconds(r.time)-m.best)<.005);
  const dated=matches.filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(String(r.date||'')) && r.precision!=='meet_range').sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  if(!dated.length)return 'Days since PB unavailable (date not exact)';
  const [y,mo,day]=dated[0].date.split('-').map(Number);
  const stamp=Date.UTC(y,mo-1,day),today=new Date(),now=Date.UTC(today.getFullYear(),today.getMonth(),today.getDate());
  const days=Math.round((now-stamp)/86400000);
  return days>=0?`${days} day${days===1?'':'s'} since PB`:'PB date is in the future';
 };
 const pbSourceLink=m=>{
  const pb=m.swims.filter(r=>Math.abs(trendSeconds(r.time)-m.best)<.005).sort((a,b)=>String(a.date).localeCompare(String(b.date)))[0];
  if(!pb)return '';
  if(pb.origin==='ASAJ verified'&&pb.source_pdf){
   const url=encodeURI(String(pb.source_pdf))+(pb.source_page?`#page=${encodeURIComponent(pb.source_page)}`:'');
   return `<small><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">View PB race result (ASAJ PDF)</a></small>`;
  }
  if(pb.source_url&&/^https?:\/\//i.test(pb.source_url))return `<small><a href="${esc(pb.source_url)}" target="_blank" rel="noopener noreferrer">View PB race result (SwimCloud)</a></small>`;
  return '<small>PB source link unavailable</small>';
 };
 const pbGap=m=>{
  const diff=m.latest-m.best;
  return Math.abs(diff)<.005?'Latest equals PB':`${Math.abs(diff).toFixed(2)}s ${diff>0?'slower than PB':'faster than PB'}`;
 };
 const summary=`<div class="intel-cards"><section class="intel-card"><h3>Historical strengths</h3><ol>${strongest.map(m=>`<li>${esc(m.name)} (${m.course}) · ${m.pct.toFixed(1)}% faster</li>`).join('')||'<li>Insufficient history</li>'}</ol></section><section class="intel-card"><h3>Recent performance to review</h3><ul>${slower.map(m=>`<li>${esc(m.name)} (${m.course}) · ${Math.abs(m.recentChange).toFixed(2)}s slower over last ${Math.min(3,m.swims.length)} races</li>`).join('')||'<li>No slower recent trends in recorded results</li>'}</ul></section><section class="intel-card"><h3>Coach discussion</h3><p>Review race pacing, starts, turns and training load before interpreting slower times. Prioritize repeatable gains.</p></section></div>`;
 const rows=metrics.map(m=>{
  const us=(d.usa_motivational||[]).find(x=>x.event===m.name&&x.course===m.course&&x.gender==='Boys'&&x.age_group==='13-14');
  let classification='Unclassified';
  if(us){classification='Below B';for(const band of ['B','BB','A','AA','AAA','AAAA']){const threshold=usaSeconds(us[band]);if(threshold!==null&&m.best<=threshold)classification=band;}}
  // The attainment date is the earliest documented result reaching the CURRENT level,
  // not necessarily the date of the all-time personal best.
  const levelThreshold=us&&['B','BB','A','AA','AAA','AAAA'].includes(classification)?usaSeconds(us[classification]):null;
  const qualifyingSwims=levelThreshold===null?[]:m.swims.filter(r=>trendSeconds(r.time)<=levelThreshold+.005).sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));
  const attained=qualifyingSwims[0];
  const classificationDate=attained?`${esc(attained.date||'Date unavailable')}${attained.precision==='meet_range'?' (meet date, approx.)':''}`:'Date not documented';
  const classLabel=classification==='Unclassified'?'Classification unavailable':classification==='Below B'?'Below B standard':`${classification} classification`;

  const first=m.swims[0],last=m.swims.at(-1),delta=m.latest-m.first;
  const status=m.pct===null?'Insufficient history':delta<-.005?'Faster':delta>.005?'Slower':'Unchanged';
  const recent=m.recentChange===null?'Insufficient history':m.recentChange>.005?`Faster by ${m.recentChange.toFixed(2)}s`:m.recentChange<-.005?`Slower by ${Math.abs(m.recentChange).toFixed(2)}s`:'Unchanged';
  return `<article class="panel" id="swim-${esc(m.course)}-${esc(m.name).replace(/[^a-zA-Z0-9]/g,'-')}"><h3><a href="#trends" class="progress-event-link" data-event="${esc(m.name)}" data-course="${m.course}" aria-label="View detailed race history for ${esc(m.name)} ${m.course}">${esc(m.name)} · ${m.course}</a></h3><p class="swim-classification-line"><strong>Current USA classification: ${esc(classLabel)}</strong><span>First attained: ${classificationDate}</span></p><div class="swim-inline-detail" hidden></div><div class="intel-stats"><div><small>Personal best (recorded)</small><strong>${trendTime(m.best)}</strong><small>${bestDate(m)}</small>${pbSourceLink(m)}</div><div><small>Latest vs PB</small><strong>${pbGap(m)}</strong><small>${pbAge(m)}</small></div><div><small>First → latest</small><strong>${trendTime(m.first)} → ${trendTime(m.latest)}</strong></div><div><small>Recent trend</small><strong>${recent}</strong></div></div><div class="intel-chart">${intelligenceLine(m)}</div><p>${m.swims.length} documented result(s) · ${m.pct===null?'Insufficient history':`${m.pct.toFixed(1)}% first-to-latest improvement`} · ${status}</p><p class="muted">PB includes documented ASAJ and supplementary SwimCloud results; source and date precision remain as recorded.</p></article>`;
 }).join('');
 return `<div class="panel"><h2>Swim Intelligence · all-event progress</h2><p>Separate LCM and SCM race histories. Performance Intelligence summarizes historical strengths and recent patterns; a slower race is not a diagnosis.</p>${summary}${renderSwimOpportunity(d,metrics)}<p><strong>Chart key:</strong> Green segments = faster; red = slower; amber = unchanged. Yellow dots = ASAJ verified; blue = SwimCloud supplied (unverified). SCM and LCM are never combined.</p></div>${rows||'<div class="panel">No recorded races.</div>'}<div class="notice">Dates marked approximate are ASAJ meet-start dates. Supplementary swims are not qualification evidence. PB is the fastest documented result, not necessarily the latest result.</div>`;
}

// Intelligence uses only documented race results and the September 2026 Jamaica ranking snapshot.
// A national ranking second-place time is NOT a CARIFTA medal benchmark.
function intelligenceMetrics(d,course){
 return trendEventNames(d).map(name=>{
  const swims=trendSwims(d,name,course), vals=swims.map(r=>trendSeconds(r.time));
  if(!vals.length)return null;
  const first=vals[0],latest=vals.at(-1),best=Math.min(...vals),pct=vals.length>1?(first-latest)/first*100:null;
  const recent=vals.slice(-3),recentChange=recent.length>=2?recent[0]-recent.at(-1):null;
  const e=(d.events||[]).find(x=>x.event===name);
  const third=course==='LCM'&&e?.second_place?trendSeconds(e.second_place.time):null;
  const gap=third===null?null:best-third;
  const B=course==='LCM'&&e?.standards?.B?trendSeconds(e.standards.B.time):null;
  return {name,course,swims,first,latest,best,pct,recentChange,third,gap,B,bgap:B===null?null:best-B};
 }).filter(Boolean);
}
function intelligenceLine(m){
 const v=m.swims.map(r=>trendSeconds(r.time)),W=440,H=170,L=44,R=12,T=14,B=28,lo=Math.min(...v)-1,hi=Math.max(...v)+1;
 const x=i=>L+(v.length===1?.5:i/(v.length-1))*(W-L-R),y=n=>T+(n-lo)/(hi-lo)*(H-T-B);
 const grid=[0,.5,1].map(f=>{const t=lo+(hi-lo)*f;return `<line x1="${L}" y1="${y(t)}" x2="${W-R}" y2="${y(t)}" stroke="currentColor" opacity=".12"/><text x="${L-5}" y="${y(t)+4}" text-anchor="end" fill="currentColor" font-size="11">${trendTime(t)}</text>`}).join('');
 const segments=v.slice(1).map((n,i)=>{const change=n-v[i],c=change<-.005?'#20a46d':change>.005?'#d35b66':'#c18b20';return `<line x1="${x(i)}" y1="${y(v[i])}" x2="${x(i+1)}" y2="${y(n)}" stroke="${c}" stroke-width="3"/>`}).join('');
 const dots=m.swims.map((r,i)=>`<circle cx="${x(i)}" cy="${y(v[i])}" r="4.5" fill="${r.origin==='ASAJ verified'?'#e3a300':'#6e80ef'}"><title>${esc(r.date)} · ${esc(r.time)} · ${esc(r.origin)}</title></circle>`).join('');
 return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(m.name)} ${m.course} chronological race times">${grid}${segments}${dots}<text x="${L}" y="${H-6}" font-size="11" fill="currentColor">${esc(m.swims[0].date)}</text><text x="${W-R}" y="${H-6}" text-anchor="end" font-size="11" fill="currentColor">${esc(m.swims.at(-1).date)}</text></svg>`;
}
// An ASAJ result with a meet-range date is date-eligible only if the entire
// documented meet falls inside the qualifying window. Never infer a race day.
function cariftaDateEvidence(swim,start,end){
 if(swim.origin!=='ASAJ verified'||!/^(\d{4}-\d{2}-\d{2})$/.test(start||''))return null;
 const iso=/^\d{4}-\d{2}-\d{2}$/;
 let first=swim.date,last=swim.date;
 if(swim.precision==='meet_range'){
  const dates=String(swim.meet_dates||'').match(/\d{4}-\d{2}-\d{2}/g);
  if(!dates||dates.length<2)return null;
  [first,last]=dates;
 }else if(swim.precision!=='exact')return null;
 if(!iso.test(first||'')||!iso.test(last||'')||first>last)return null;
 if(first<start||(end&&last>end))return null;
 return {first,last,approx:swim.precision==='meet_range'};
}
// Championship strategy: show only events supported by recorded times and a sourced B standard.
// This is a relative planning score, never a medal probability or selection forecast.
function championshipOpportunities(d,meet){
 const standards=meet==='CARIFTA'?(d.events||[]):(d.goodwill?.events||[]);
 const all=intelligenceMetrics(d,'LCM');
 return standards.map(e=>{
  const m=all.find(x=>x.name===e.event);
  const entry=usaSeconds(e.standards?.B?.time);
  if(!m||!Number.isFinite(m.best)||entry===null||entry<=0)return null;
  // Qualifying evidence can be an exact race date or a wholly eligible official meet range.
  let best=m.best, bestDate=null, classification=null;
  if(meet==='CARIFTA'){
   const start=d.carifta_criteria?.qualifying_period_start;
   const end=d.carifta_criteria?.qualifying_period_end;
   if(!/^\d{4}-\d{2}-\d{2}$/.test(start||''))return null;
   const eligible=trendSwims(d,e.event,'LCM').filter(x=>cariftaDateEvidence(x,start,end)&&Number.isFinite(trendSeconds(x.time)));
   if(!eligible.length)return null;
   eligible.sort((x,y)=>trendSeconds(x.time)-trendSeconds(y.time));
   best=trendSeconds(eligible[0].time);
   bestDate=eligible[0].date;
   var bestDateRange=cariftaDateEvidence(eligible[0],start,end);
   const us=(d.usa_motivational||[]).find(x=>x.event===e.event&&x.course==='LCM'&&x.gender==='Boys'&&x.age_group==='13-14');
   if(us){classification='Below B';for(const level of ['B','BB','A','AA','AAA','AAAA']){const threshold=usaSeconds(us[level]);if(threshold!==null&&best<=threshold)classification=level;}}
  }
  const gap=best-entry;
  const comp=(d.asaj_competitor_results||[]).filter(x=>x.event===e.event&&x.course==='LCM'&&x.gender==='Boys'&&['13','14'].includes(String(x.age))&&x.swimmer&&!/seaton/i.test(x.swimmer));
  const unique=new Map();
  comp.forEach(x=>{const key=x.swimmer.trim().toLowerCase(),t=usaSeconds(x.time);if(t!==null&&(!unique.has(key)||t<unique.get(key)))unique.set(key,t)});
  const field=unique.size;
  // Boys 12 emerging competitors come from the existing verified rankings comparison.
  // Count distinct swimmers for this event, excluding Aidan; the ±10% window
  // has already been applied by the ASAJ rankings builder.
  const rankEvent=(d.events||[]).find(x=>x.event===e.event);
  const boys12=new Set((rankEvent?.boys12||[]).map(x=>String(x.name||x.swimmer||'').trim().toLowerCase()).filter(x=>x&&!/seaton/.test(x))).size;
  const nearby=[...unique.values()].filter(t=>Math.abs(t-best)/best<=.05).length;
  const trend=Number.isFinite(m.recentChange)?m.recentChange:null;
  // Entry readiness: 60 points, recent trend: 25, observed field density: 15.
  // No competitor coverage earns zero field points, not a fictitious low-competition bonus.
  const entryScore=Math.max(0,Math.min(60,60-60*Math.max(0,gap)/entry));
  const trendScore=trend===null?0:Math.max(0,Math.min(25,12.5+trend*5));
  const fieldScore=field?15/(1+nearby/3):0;
  if(meet!=='CARIFTA'){const bestSwims=trendSwims(d,e.event,'LCM').filter(x=>Math.abs(trendSeconds(x.time)-best)<.011&&/^\d{4}-\d{2}-\d{2}/.test(String(x.date)));bestDate=bestSwims.length?bestSwims.at(-1).date:null;}
  const ageDays=bestDate&&(!bestDateRange||!bestDateRange.approx)?Math.max(0,Math.floor((Date.now()-Date.parse(bestDate+'T00:00:00Z'))/86400000)):null;
  const aStandard=usaSeconds(e.standards?.A?.time);
  const cariftaLevel=meet==='CARIFTA'?(aStandard!==null&&best<=aStandard?'A':best<=entry?'B':'Below B'):null;
  return {event:e.event,best,bestDate,bestDateRange,ageDays,classification,cariftaLevel,aStandard,entry,gap,trend,nearby,field,boys12,entryScore,trendScore,fieldScore,score:entryScore+trendScore+fieldScore};
 }).filter(Boolean).sort((a,b)=>b.score-a.score).slice(0,5);
}
// Complete documented classifications, independent of the five-event strategy score.
function acquiredClassificationData(d){
 const rows=[];
 const start=d.carifta_criteria?.qualifying_period_start;
 const end=d.carifta_criteria?.qualifying_period_end;
 for(const course of ['LCM','SCM']){
  for(const m of intelligenceMetrics(d,course)){
   const ordered=[...m.swims].filter(x=>Number.isFinite(trendSeconds(x.time))).sort((a,b)=>trendSeconds(a.time)-trendSeconds(b.time));
   if(!ordered.length)continue;
   const pb=ordered[0],time=trendSeconds(pb.time);
   const usa=(d.usa_motivational||[]).find(x=>x.event===m.name&&x.course===course&&x.gender==='Boys'&&x.age_group==='13-14');
   let level='Not available';
   if(usa){level='Below B';for(const band of ['B','BB','A','AA','AAA','AAAA']){const threshold=usaSeconds(usa[band]);if(threshold!==null&&time<=threshold)level=band;}}
   const exact=pb.precision==='exact'&&/^\d{4}-\d{2}-\d{2}$/.test(pb.date||'');
   const qualifying=m.swims.filter(x=>course==='LCM'&&cariftaDateEvidence(x,start,end)&&Number.isFinite(trendSeconds(x.time))).sort((a,b)=>trendSeconds(a.time)-trendSeconds(b.time));
   const standard=(d.events||[]).find(x=>x.event===m.name)?.standards;
   let carifta='Not assessed';
   if(course==='LCM'&&standard){
    if(!qualifying.length)carifta='No ASAJ result with fully eligible race/meet dates';
    else{
     const eligibleTime=trendSeconds(qualifying[0].time);
     if(usaSeconds(standard.A?.time)!==null&&eligibleTime<=usaSeconds(standard.A.time))carifta='A';
     else if(usaSeconds(standard.B?.time)!==null&&eligibleTime<=usaSeconds(standard.B.time))carifta='B';
     else carifta='Below B';
    }
   }
   rows.push({event:m.name,course,time:pb.time,date:pb.date,exact,origin:pb.origin,level,carifta});
  }
 }
 rows.sort((a,b)=>a.course.localeCompare(b.course)||a.event.localeCompare(b.event));
 const countBy=(field,values)=>values.map(([value,label])=>({label,count:rows.filter(r=>r[field]===value).length})).filter(x=>x.count).map(x=>`${esc(x.label)}${x.count}`).join(' · ');
 const usaCounts=countBy('level',[['AAAA','AAAA'],['AAA','AAA'],['AA','AA'],['A','A'],['BB','BB'],['B','B'],['Below B','Below B ']]);
 const cariftaCounts=countBy('carifta',[['A','A'],['B','B'],['Below B','Below B ']]);
 const classificationSummary=`<div class="classification-totals"><span>USA Swimming: ${usaCounts||'—'}</span><span>CARIFTA: ${cariftaCounts||'—'}</span></div>`;
 return {rows,classificationSummary};
}
// Use the identical imported ASAJ best-per-swimmer ranking pool as Jamaica Rankings.
// The 12-year-old comparison is hypothetical, not an official CARIFTA age-group rank.
function strategyCalculatedField(d,event){
 const older=[...(calculatedJamaicaRankings(d,[13,14]).get(event)?.values()||[])];
 const younger=[...(calculatedJamaicaRankings(d,[12]).get(event)?.values()||[])];
 const key=r=>String(r.swimmer||'').toLowerCase().replace(/[^a-z]/g,'');
 const aidan=older.find(r=>key(r)==='aidanseaton');
 if(!aidan)return null;
 const competitors=new Map();
 for(const r of [...older,...younger]){
  const k=key(r);
  if(!k||k==='aidanseaton')continue;
  const prev=competitors.get(k);
  if(!prev||r.seconds<prev.seconds)competitors.set(k,r);
 }
 const faster=[...competitors.values()].filter(r=>r.seconds<aidan.seconds-0.00001);
 const olderFaster=older.filter(r=>key(r)!=='aidanseaton'&&r.seconds<aidan.seconds-0.00001).length;
 const youngerFaster=younger.filter(r=>key(r)!=='aidanseaton'&&r.seconds<aidan.seconds-0.00001).length;
 return {rank:1+olderFaster,olderFaster,youngerFaster,combinedFaster:faster.length,combinedRank:1+faster.length,fieldSize:competitors.size+1};
}
function renderChampionshipShortlist(d){
 const panel=meet=>{
  const rows=championshipOpportunities(d,meet);
  if(!rows.length)return `<section class="panel"><h3>${meet} · Top five priorities</h3><p>No events have a qualifying-period, date-supported, ASAJ-verified LCM time and a sourced B standard.</p></section>`;
  const cards=rows.map((r,i)=>{
   const direction=r.trend===null?'No recent trend':r.trend>0.005?'Faster':r.trend<-.005?'Slower':'Stable';
   const change=r.trend===null?'':` · ${Math.abs(r.trend).toFixed(2)}s`;
   const gap=r.gap<=0?`${Math.abs(r.gap).toFixed(2)}s faster than CARIFTA B standard`:`${r.gap.toFixed(2)}s slower than CARIFTA B standard`;
   return `<article class="intel-card"><h3>${i+1}. <a href="#trends" class="strategy-event-link" data-event="${esc(r.event)}">${esc(r.event)}</a> <strong>${r.score.toFixed(0)}/100</strong></h3><p><strong>${trendTime(r.best)}</strong> best · ${r.bestDateRange?.approx?`eligible meet ${esc(r.bestDateRange.first)} to ${esc(r.bestDateRange.last)} (exact race day unknown)`:(r.ageDays===null?'Date unavailable':`${r.ageDays} days since eligible swim (${esc(r.bestDate)})`)}</p>${meet==='CARIFTA'?`<p><strong>CARIFTA:</strong> ${gap}</p><p><strong>USA Swimming:</strong> ${esc(r.classification||'Unavailable')}</p>`:`<p>${gap}</p>`}<p>Recent: ${direction}${change}</p>${meet==='CARIFTA'?(()=>{const field=strategyCalculatedField(d,r.event);return field?`<p><strong>Calculated rank (Boys 13–14):</strong> ${field.rank} · ${field.olderFaster} faster</p><p><strong>Faster swimmers (Boys 13–14 + Boys 12):</strong> ${field.combinedFaster} · hypothetical combined position ${field.combinedRank} of ${field.fieldSize}</p>`:`<p><strong>Calculated rank:</strong> Unavailable · no comparable imported ranking evidence</p>`;})():''}<p>ASAJ Boys 13–14: ${r.field} swimmers · ${r.nearby} within ±5%</p><p>ASAJ Boys 12: ${r.boys12} within ±10%</p><p class="muted">Entry ${r.entryScore.toFixed(0)}/60 · Trend ${r.trendScore.toFixed(0)}/25 · Field ${r.fieldScore.toFixed(0)}/15</p></article>`;
  }).join('');
  return `<section class="panel"><h2>${meet} · Top five event priorities</h2><div class="intel-cards">${cards}</div></section>`;
 };
 return `<section class="panel"><h2>🏆 CARIFTA + Goodwill Event Strategy</h2><p>Ranked event priorities, not qualification listings. Scores combine entry readiness (60), recent performance (25), and ASAJ competitor density (15).</p></section>${panel('CARIFTA')}${panel('Goodwill')}<p class="muted">CARIFTA: only ASAJ-verified LCM swims with exact race dates or complete meet ranges inside the qualifying window specified in the loaded criteria (${esc(d.carifta_criteria?.qualifying_period_start||'start unavailable')} to ${esc(d.carifta_criteria?.qualifying_period_end||'closing date not confirmed')}). CARIFTA A/B labels reflect time standards only, not top-two national ranking, two-event qualification, or team selection. USA classification is developmental, not selection eligibility. Recent trends may include supplementary results. Goodwill: available 2026 B standards, historical reference only. Competitor counts cover imported ASAJ results, not championship entries. Planning scores are not medal probabilities.</p>`;
}

function renderIntelligence(d){
 const metrics=['LCM','SCM'].flatMap(course=>intelligenceMetrics(d,course));
 const eligible=metrics.filter(m=>m.pct!==null);
 const strengths=[...eligible].sort((a,b)=>b.pct-a.pct).slice(0,3);
 const recentSlower=metrics.filter(m=>m.recentChange!==null&&m.recentChange<-.005).sort((a,b)=>a.recentChange-b.recentChange).slice(0,3);
 const snapshot=metrics.filter(m=>m.course==='LCM'&&m.gap!==null).sort((a,b)=>a.gap/a.third-b.gap/b.third).slice(0,5);
 const fmt=m=>`${esc(m.name)} <small>(${m.course})</small>`;
 const strong=strengths.map(m=>`<li>${fmt(m)} · ${m.pct.toFixed(1)}% faster from first to latest</li>`).join('');
 const focus=recentSlower.length?recentSlower.map(m=>`<li>${fmt(m)} · latest is ${Math.abs(m.recentChange).toFixed(2)}s slower than the first of the last ${Math.min(3,m.swims.length)} recorded races; review race context with coach</li>`).join(''):'<li>No slower recent trends detected among events with at least two results.</li>';
 const opp=snapshot.map(m=>`<tr><td>${fmt(m)}</td><td>${trendTime(m.best)}</td><td>${trendTime(m.third)}</td><td class="${m.gap<=0?'good':''}">${Math.abs(100*m.gap/m.third).toFixed(2)}% ${m.gap<0?'ahead':'behind'} (${m.gap>0?'+':''}${m.gap.toFixed(2)}s)</td><td>${m.bgap===null?'Unavailable':`${m.bgap>0?'+':''}${m.bgap.toFixed(2)}s`}</td></tr>`);
 const rows=metrics.map(m=>`<tr><td>${fmt(m)}</td><td>${m.swims.length}</td><td>${trendTime(m.best)}</td><td>${m.pct===null?'Not enough history':`${m.pct>0?'+':''}${m.pct.toFixed(1)}%`}</td><td>${m.recentChange===null?'Not enough history':`${m.recentChange>0?'Faster':m.recentChange<0?'Slower':'Unchanged'} (${Math.abs(m.recentChange).toFixed(2)}s)`}</td></tr>`);
 return `<div class="intel-head"><div><div class="visual-eyebrow">AIDAN SEATON · TRAINING DECISION SUPPORT</div><h2>Performance Intelligence</h2><p>Documented strengths, recent trends and evidence-based priorities. Not a medal prediction.</p></div><div class="intel-toggle"><label>Inspect course <select id="intel-course"><option value="LCM">LCM (50m)</option><option value="SCM">SCM (25m)</option></select></label></div></div>
 <div class="intel-cards"><section class="intel-card"><h3>🏆 Closest national podium comparisons</h3><p>September 2026 Jamaica ranking snapshot, LCM only.</p><ol>${snapshot.slice(0,3).map(m=>`<li>${fmt(m)} · ${m.gap>0?m.gap.toFixed(2)+'s behind':Math.abs(m.gap).toFixed(2)+'s ahead'}</li>`).join('')||'<li>No verified snapshot benchmarks</li>'}</ol></section>
 <section class="intel-card"><h3>💪 Historical strengths</h3><p>Largest first-to-latest percentage gains.</p><ol>${strong||'<li>Insufficient data</li>'}</ol></section>
 <section class="intel-card"><h3>🎯 Review opportunities</h3><p>Recent race times moving slower, not a diagnosis.</p><ul>${focus}</ul></section>
 <section class="intel-card"><h3>💡 Coach discussion</h3><ul><li>Review splits, turns, starts and race pacing where available.</li><li>Check training load and taper before interpreting slower races.</li><li>Prioritize events with verified qualification gaps and repeatable improvement.</li></ul></section></div>
 <div class="intel-layout"><section class="panel"><h2>Event analysis</h2><p>Official 2027 B-standard gap is shown separately from the September 2026 national second-place comparison. Neither represents a CARIFTA bronze-medal time.</p><div class="visual-scroll">${table(['Event','Course','Swims','Best shown','First → latest','Recent trend'],rows)}</div></section><section class="panel"><h2>Selected event · real race timeline</h2><label>Event <select id="intel-event"></select></label><div id="intel-detail"></div><p class="muted">Green segments = faster; red = slower; amber = unchanged. Yellow dots = ASAJ verified; blue = SwimCloud supplied. SCM and LCM never combined.</p></section></div>
 <div class="panel"><h2>Closest documented national second-place comparisons</h2><p>Jamaica rankings dated 29 September 2026. This is <strong>not</strong> CARIFTA finals or medal evidence. Qualification and team selection require additional verification.</p><div class="visual-scroll">${table(['Event','Best shown LCM*','National 2nd (Sep)','Gap to national 2nd (%)','2027 CARIFTA B gap*'],opp)}</div><p class="muted">*Best shown may include unverified SwimCloud data. B gap is a mathematical comparison only; eligible race dates and official selection rules still apply.</p></div><div class="notice">Medal opportunity ranking unavailable until actual CARIFTA finalist and bronze-medal results for the correct age group are sourced. No benchmark or intermediate swim time has been invented.</div>`;
}
function drawIntelligence(){
 if(!DATA)return;const course=document.getElementById('intel-course')?.value||'LCM',all=intelligenceMetrics(DATA,course),sel=document.getElementById('intel-event'),target=document.getElementById('intel-detail');if(!sel||!target)return;
 const previous=sel.value;sel.innerHTML=all.map(m=>`<option value="${esc(m.name)}">${esc(m.name)}</option>`).join('');if(all.some(m=>m.name===previous))sel.value=previous;
 const draw=()=>{const m=all.find(x=>x.name===sel.value);if(!m){target.innerHTML='<p>No recorded swims.</p>';return;}target.innerHTML=`<div class="intel-stats"><div><small>Earliest</small><strong>${trendTime(m.first)}</strong></div><div><small>Latest</small><strong>${trendTime(m.latest)}</strong></div><div><small>Best shown</small><strong>${trendTime(m.best)}</strong></div></div><div class="intel-chart">${intelligenceLine(m)}</div><p>${m.swims.length} documented result(s) · ${m.pct===null?'Insufficient history for a trend':`${m.pct.toFixed(1)}% first-to-latest improvement`}</p>`};sel.onchange=draw;draw();
}
const renderWithIntelligence=render;render=function(){renderWithIntelligence();if(TAB==='intelligence'){const c=document.getElementById('intel-course');if(c)c.onchange=drawIntelligence;drawIntelligence();}};


// USA Swimming 2024-2028 age-group motivational benchmarks. Never treat as CARIFTA qualification.
const usaSeconds=x=>{if(!x)return null;const p=String(x).split(':').map(Number);return p.every(Number.isFinite)?p.reduce((a,b)=>a*60+b,0):null};
const USA_LEVELS=['B','BB','A','AA','AAA','AAAA'];
function renderMotivational(d){
 const data=d.usa_motivational||[], metrics=['LCM','SCM'].flatMap(c=>intelligenceMetrics(d,c));
 const rows=metrics.map(m=>{
  const std=data.find(r=>r.event===m.name&&r.course===m.course&&r.age_group==='13-14'&&r.gender==='Boys');
  const best=m.best;const bestSeconds=typeof best==='number'?best:usaSeconds(best);
  const matching=m.swims.filter(r=>Math.abs(trendSeconds(r.time)-bestSeconds)<.005);
  const achieved=matching[0];
  const achievedDate=achieved?.date?esc(achieved.date)+(achieved.precision!=='exact'?' (meet start; approximate)':''): 'Date unavailable';
  const achievedSource=achieved?.origin==='ASAJ verified'?'ASAJ verified':achieved?'SwimCloud supplied (unverified)':'Source unavailable';
  const dateCell=`<td>${achievedDate}<br><small>${achievedSource}</small></td>`;
  if(!std||bestSeconds===null)return `<tr><td>${esc(m.name)}</td><td>${m.course}</td><td>${trendTime(best)}</td>${dateCell}<td>Unavailable</td><td>Official course standard not loaded</td></tr>`;
  let level='Below B';for(const l of USA_LEVELS){if(bestSeconds<=usaSeconds(std[l]))level=l;}
  const next=level==='AAAA'?null:USA_LEVELS[level==='Below B'?0:USA_LEVELS.indexOf(level)+1];
  const gap=next?Math.max(0,bestSeconds-usaSeconds(std[next])):null;
  return `<tr><td>${esc(m.name)}</td><td>${m.course}</td><td>${trendTime(best)}</td>${dateCell}<td><strong>${level}</strong></td><td>${next?`${gap.toFixed(2)}s to ${next}`:'AAAA achieved'}</td></tr>`;
 });
 const source='https://www.usaswimming.org/times/popular-resources/time-standards';
 return `<section class="panel"><h2>USA Swimming motivational standards</h2><p>2024–2028, Boys 13–14. These are developmental comparisons, <strong>not</strong> CARIFTA selection or medal benchmarks. The best shown can include supplementary SwimCloud times. SCM standards remain unavailable until verified data is loaded.</p><div class="visual-scroll">${table(['Event','Course','Best shown','Achieved on / source','Level','Next level gap'],rows)}</div><p class="muted"><a href="${source}" target="_blank" rel="noopener noreferrer">USA Swimming official standards</a> · Age-group 13–14, LCM only. Achievement date is the recorded date of the fastest shown swim; ASAJ meet-start dates are marked approximate. Classification uses the fastest recorded time, not eligibility or age at the time of the swim.</p></section>`;
}
function renderCompetitiveSnapshot(d){
 const rows=d.events.filter(e=>e.second_place&&e.second_place.time).map(e=>{
  const t=usaSeconds(e.personal_best),p=usaSeconds(e.second_place.time),gap=t===null||p===null?null:t-p;
  return `<tr><td>${esc(e.event)} LCM</td><td>${esc(e.personal_best||'Unavailable')}</td><td>${esc(e.second_place.swimmer||'Unavailable')}</td><td>${esc(e.second_place.time)}</td><td>${gap===null?'Unavailable':`${Math.abs(100*gap/p).toFixed(2)}% ${gap<0?'ahead':'behind'} (${gap>0?'+':''}${gap.toFixed(2)}s)`}</td></tr>`;
 });
 return `<section class="panel"><h2>Competitor benchmark snapshot</h2><p>Comparison against the documented second-place swimmer in the Jamaica rankings of 29 September 2026. These are not live head-to-head results or CARIFTA finalist benchmarks.</p><div class="visual-scroll">${table(['Event','Aidan shown','National 2nd swimmer','National 2nd time','Gap to 2nd (%)'],rows)}</div><p class="muted">Gaining or losing ground requires at least two dated, comparable competitor snapshots. Until those are available, relative trend is <strong>insufficient data</strong>, not assumed to be improving.</p></section>`;
}
const renderWithStandards=render;
render=function(){renderWithStandards();if(TAB==='intelligence'){
 const main=document.getElementById('content')||document.querySelector('main');
 if(main){const wrap=document.createElement('div');wrap.innerHTML=renderMotivational(DATA)+renderCompetitiveSnapshot(DATA);main.appendChild(wrap);}
}};

// Strategy event names open their corresponding Performance Trends graph.
document.addEventListener('click',e=>{const a=e.target.closest('.strategy-event-link');if(!a)return;e.preventDefault();TREND_SELECTION.event=a.dataset.event;TREND_SELECTION.course='LCM';const tab=document.querySelector('[data-tab="trends"]');if(tab)tab.click();else{TAB='trends';render();}});

// Swim Intelligence links reveal race details inline without leaving or replacing this tab.
document.addEventListener('click',event=>{
 const anchor=event.target.closest?.('.progress-event-link');if(!anchor)return;
 event.preventDefault();
 const panel=anchor.closest('article');
 const detail=panel?.querySelector('.swim-inline-detail');
 if(!detail||!DATA)return;
 if(!detail.hidden){detail.hidden=true;anchor.setAttribute('aria-expanded','false');return;}
 document.querySelectorAll('.swim-inline-detail').forEach(el=>{el.hidden=true;});
 document.querySelectorAll('.progress-event-link').forEach(el=>el.setAttribute('aria-expanded','false'));
 TREND_SELECTION.event=anchor.dataset.event;
 TREND_SELECTION.course=anchor.dataset.course;
 detail.hidden=false;
 anchor.setAttribute('aria-expanded','true');
 drawTrendDetail(detail);
 detail.scrollIntoView({behavior:'smooth',block:'nearest'});
});

// Keep the radar selector functional after the tab re-renders.
document.addEventListener('change',e=>{if(e.target?.id!=='strength-age-group')return;document.querySelectorAll('.strength-group').forEach((el,i)=>{el.hidden=i!==Number(e.target.value);});});


// Overview navigation reuses the Swim Intelligence event panels and their inline graphs.
function overviewEventLink(event,course='LCM'){
 return `<a href="#swim-intelligence" class="overview-event-link" data-event="${esc(event)}" data-course="${esc(course)}">${esc(event)}</a>`;
}
document.addEventListener('click',event=>{
 const anchor=event.target.closest?.('.overview-event-link');if(!anchor)return;
 event.preventDefault();
 const name=anchor.dataset.event,course=anchor.dataset.course||'LCM';
 const nav=document.querySelector('nav button[data-tab="progress"]');
 if(nav)nav.click();else{TAB='progress';render();}
 const link=[...document.querySelectorAll('.progress-event-link')].find(x=>x.dataset.event===name&&x.dataset.course===course);
 if(link){link.click();link.closest('article')?.scrollIntoView({behavior:'smooth',block:'start'});}
 else document.querySelector('#content')?.scrollIntoView({behavior:'smooth',block:'start'});
});

// Collapsible primary navigation. Existing tab handlers remain authoritative.
(function setupDashboardMenu(){
 const toggle=document.getElementById('dashboard-menu-toggle');
 const nav=document.getElementById('dashboard-nav');
 if(!toggle||!nav)return;
 function setOpen(open){nav.classList.toggle('menu-open',open);toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Close navigation menu':'Open navigation menu');}
 toggle.addEventListener('click',()=>setOpen(!nav.classList.contains('menu-open')));
 nav.addEventListener('click',e=>{if(e.target.closest('button[data-tab]'))setOpen(false);});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')setOpen(false);});
 document.addEventListener('click',e=>{if(!nav.contains(e.target)&&!toggle.contains(e.target))setOpen(false);});
})();
