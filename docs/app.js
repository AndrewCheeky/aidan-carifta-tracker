let DATA=null, TAB='carifta';
let TREND_SELECTION={event:null,course:'LCM'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=(url,label='ASAJ source')=>url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`:'Pending';
const value=x=>x===null||x===undefined||x===''?'<span class="pending">Pending verification</span>':esc(x);
const card=(label,val)=>`<div class="card"><div class="label">${esc(label)}</div><div class="value">${val}</div></div>`;
const table=(headers,rows)=>`<table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
function render(){if(!DATA)return;let html='';const ev=DATA.events;
if(TAB==='championship'){html=renderChampionshipShortlist(DATA);
}else if(TAB==='intelligence'){html=renderIntelligence(DATA);
}else if(TAB==='progress'){html=renderAllEventProgress(DATA);
}else if(TAB==='trends'){html=renderTrends(DATA);
}else if(TAB==='visual'){
const sec=t=>{if(!t)return null;const a=String(t).replace(/^\+/,'').split(':').map(Number);return a.every(Number.isFinite)?a.reduce((v,x)=>v*60+x,0):null};
const gap=e=>e.third_place&&e.personal_best?sec(e.personal_best)-sec(e.third_place.time):null;
const fmtGap=n=>n===null?'Not verified':(n<0?Math.abs(n).toFixed(2)+'s ahead':n.toFixed(2)+'s behind');
const known=ev.filter(e=>gap(e)!==null).sort((a,b)=>Math.abs(gap(a))-Math.abs(gap(b)));
const closest=known.find(e=>gap(e)>=0)||known[0];
const ranked=ev.filter(e=>Number.isFinite(e.rank));const bestRank=ranked.length?Math.min(...ranked.map(e=>e.rank)):null;
const maxGap=Math.max(1,...known.map(e=>Math.abs(gap(e))));
const row=e=>`<tr><td>${esc(e.event)}</td><td>${value(e.rank)}</td><td>${value(e.personal_best)}</td><td>${e.third_place?esc(e.third_place.swimmer):'Pending'}</td><td>${e.third_place?esc(e.third_place.time):'Pending'}</td><td class="${gap(e)!==null&&gap(e)<0?'good':''}">${fmtGap(gap(e))}</td></tr>`;
const bars=ev.map(e=>`<div class="visual-bar-row"><span>${esc(e.event)}</span><div class="visual-bar-track"><div class="visual-bar-fill ${gap(e)<0?'ahead':''}" style="width:${gap(e)===null?0:Math.max(2,100*Math.abs(gap(e))/maxGap).toFixed(1)}%"></div></div><strong>${gap(e)===null?'No official 3rd-place benchmark':fmtGap(gap(e))}</strong></div>`).join('');
const younger=ev.flatMap(e=>e.boys12.map(b=>({event:e.event,...b})));const unique=new Set(younger.map(x=>x.name));
html=`<div class="visual-head"><div><div class="visual-eyebrow">🇯🇲 TORNADOES SWIM CLUB · BOYS 13–14</div><h2>Aidan Seaton <span>Performance Snapshot</span></h2><p>Official ASAJ rankings: 29 September 2026 · Live verified best-time comparisons</p></div><div class="visual-title">CARIFTA 2027<br><span>At a glance</span></div></div>
<div class="visual-metrics"><div><small>Best September national rank</small><strong>${bestRank===null?'Pending':bestRank+'th'}</strong><span>${esc(ranked.find(e=>e.rank===bestRank)?.event||'')}</span></div><div><small>Closest to September podium</small><strong>${closest?Math.abs(gap(closest)).toFixed(2)+'s':'Pending'}</strong><span>${closest?esc(closest.event)+(gap(closest)<0?' · ahead':' · behind'):''}</span></div><div><small>Tracked events</small><strong>${ev.length}</strong><span>Verified meet or ranking events</span></div><div><small>Emerging Boys 12</small><strong>${unique.size}</strong><span>Within ±10% of verified times</span></div></div>
<div class="visual-columns"><section class="visual-panel"><h3>All documented events · September ranking comparison</h3><div class="visual-scroll">${table(['Event','Sep rank','Aidan best LCM','3rd-place swimmer','3rd-place time','Gap'],ev.map(row))}</div><p class="visual-foot">Includes every verified individual event in the uploaded 2026 meet history, plus events documented in the September rankings. Missing ranks and podium benchmarks are not estimated.</p></section><section class="visual-panel"><h3>Gap to 3rd place · seconds</h3><div class="visual-bars">${bars||'No verified third-place benchmarks yet'}</div><p class="visual-foot">All documented events are listed. Red = behind September benchmark; green = faster; no bar = benchmark unavailable. This is not a current national ranking.</p></section></div>
<div class="visual-bottom"><section class="visual-panel"><h3>Boys 12 · Emerging competition</h3><div class="visual-scroll">${table(['Event','Swimmer','Official time','Difference'],younger.length?younger.slice(0,20).map(b=>`<tr><td>${esc(b.event)}</td><td>${esc(b.name)}</td><td>${esc(b.time)}</td><td>${esc(b.difference)}</td></tr>`):['<tr><td colspan="4">No verified Boys 12 results within ±10% in the available ASAJ top ten.</td></tr>'])}</div><p class="visual-foot">${younger.length} event comparisons · ${unique.size} unique swimmers; only available official top-ten entries.</p></section><section class="visual-panel"><h3>Key takeaways</h3><p>${closest?`Closest podium comparison: <strong>${esc(closest.event)}</strong>, ${fmtGap(gap(closest))}.`:'Third-place comparison pending.'}</p><p>${unique.size} unique younger swimmers within the ±10% comparison window.</p><p>CARIFTA selection also requires eligible qualifying-period times and current selection rankings.</p></section><section class="visual-panel"><h3>Next steps</h3><ol><li>Focus on the smallest verified gaps.</li><li>Upload new official ASAJ meet results.</li><li>Update rankings as new official snapshots are released.</li></ol></section></div>
<div class="visual-disclaimer">Independent visual overview · Not an ASAJ selection or ranking publication · No estimated times · Snapshot and latest performance dates may differ.</div>`;
}else if(TAB==='carifta'){
const c=DATA.carifta_criteria||{}, qualified=ev.filter(e=>e.carifta?.A_met||e.carifta?.B_met).length;
html=`<div class="cards">${card('Date-verified qualifying events',qualified)}${card('Selection priority','Provisional Sep snapshot')}${card('Final team selection','Not confirmed')}</div><div class="notice"><strong>CARIFTA 2027 selection criteria:</strong> Only official LCM swims from ${esc(c.qualifying_period_start||'2026-07-01')} through the final local qualifying meet are eligible. Its closing date is not yet verified. Earlier 2026 results remain in Race History but cannot qualify for CARIFTA 2027. A/B standard alone does not guarantee selection. September 29 rankings are shown as a provisional comparison, not a current 1st/2nd-place selection rank. A September snapshot does not establish whether a swim occurred after July 1.</div><div class="panel"><h2>CARIFTA 2027 | Qualification and selection</h2>${table(['Event','Eligible LCM best (from Jul 2026)','A standard / gap','B standard / gap','Time qualification','Sep 2026 rank','Provisional priority','Selection priority','Evidence'],ev.map(e=>{const q=e.carifta||{}, A=e.standards.A, B=e.standards.B;return `<tr><td>${esc(e.event)}</td><td>${value(q.eligible_best)}</td><td>${A?esc(A.time)+' / '+value(q.A_gap):'Pending'}</td><td>${B?esc(B.time)+' / '+value(q.B_gap):'Pending'}</td><td>${value(q.standard_status)}</td><td>${value(q.provisional_snapshot_rank)}</td><td>${value(q.provisional_selection_priority)}</td><td>${value(q.selection_priority)}</td><td>${q.eligible_source_pdf?`<a href="${encodeURI(esc(q.eligible_source_pdf))}#page=${esc(q.eligible_source_page)}" target="_blank" rel="noopener">Official meet PDF</a>`:'No eligible dated result verified'}</td></tr>`}))}</div><div class="panel"><h2>ASAJ selection rules and limitations</h2><p><strong>Priority 1:</strong> A-standard swimmers ranked 1st or 2nd in a qualifying event, followed by B-standard swimmers in the 11–12 age group, then B-standard swimmers aged 13 and over ranked 1st or 2nd.</p><p><strong>Limits:</strong> Eight swimmers per gender and age group, 36 swimmers overall. Tie-breakers consider the number of qualified events ranked 1st/2nd, then AQUA points. Relay additions have separate conditions.</p><p><strong>Pending verification:</strong> Current ASAJ qualifying-period rankings, final qualifying-meet date, all-team candidate results, eligibility, AQUA points and ASAJ Council ratification. These are required before any credible team-selection projection.</p><p><a href="${esc(c.source_pdf||'carifta-documents/2026 Carifta Criteria.pdf')}" target="_blank" rel="noopener">Official CARIFTA selection criteria (PDF)</a></p></div>`;
}else if(TAB==='goodwill'){
const g=DATA.goodwill||{}, ge=g.events||[];
const aCount=ge.filter(e=>e.standards.A.met===true).length, bCount=ge.filter(e=>e.standards.B.met===true).length;
html=`<div class="cards">${card('Goodwill 2026 A standards',aCount)}${card('Goodwill 2026 B standards',bCount)}${card('Selection status','Not confirmed')}</div><div class="notice">Official 2026 Boys 13–14 standards, not 2027 standards. This is a historical 2026 comparison, not a forecast or confirmation of team selection. September 29 rankings were published after Goodwill 2026 and cannot retrospectively establish qualifying-period selection rank. ASAJ considers eligible SCM and LCM times, but this tracker currently compares verified LCM times only. Times must fall in the qualifying window, beginning 1 December 2025 and ending at the final local qualifying meet; the exact closing date was not provided. A or B standard alone does not secure selection.</div><div class="panel"><h2>Goodwill 2026 | Boys 13–14</h2>${table(['Event','Verified LCM best','A standard','Gap to A','B standard','Gap to B','Sep 2026 rank','Selection projection','Evidence'],ge.map(e=>`<tr><td>${esc(e.event)}</td><td>${value(e.personal_best)}</td><td>${esc(e.standards.A.time)}</td><td>${value(e.standards.A.gap)}</td><td>${esc(e.standards.B.time)}</td><td>${value(e.standards.B.gap)}</td><td>${value(e.snapshot_rank)}</td><td>${value(e.selection_priority)}</td><td>${e.pb_evidence_pdf?`<a href="${encodeURI(esc(e.pb_evidence_pdf))}#page=${esc(e.pb_evidence_page)}" target="_blank" rel="noopener">Meet PDF</a>`:link(e.pb_source,'ASAJ ranking')}</td></tr>`))}</div><div class="panel"><h2>ASAJ Goodwill 2026 selection criteria</h2><p><strong>Priority 1:</strong> Swimmers must achieve A (considered first) or B standard and rank 1st or 2nd in at least one individual event. Maximum four swimmers per age group, subject to tiebreakers. <strong>Priority 2:</strong> If only two or three swimmers qualify, relay selection may fill places; the additional swimmer must achieve at least one B standard. Rankings use ASAJ Hy-Tek records. Eligibility, registration, passport and availability requirements apply, and the ASAJ Council ratifies final selection.</p><p><a href="goodwill-documents/2026%20Goodwill%20Qualifying%20Times.pdf" target="_blank">2026 qualifying times</a> · <a href="goodwill-documents/Goodwill%202026%20Criteria%2011%20%26%20Over.pdf" target="_blank">2026 selection criteria</a></p><p><strong>Important:</strong> The official documents supplied cover 2026, not Goodwill 2027. Do not treat these as future standards.</p></div>`;
}else if(TAB==='jamaica'){
html=`<div class="cards">${card('Ranked events',ev.filter(e=>e.rank!==null).length)}${card('Podium gaps verified',ev.filter(e=>e.podium_gap!==null).length)}${card('Boys 12 in range',ev.reduce((n,e)=>n+e.boys12.length,0))}</div><div class="panel"><h2>Jamaica National Rankings</h2><p>Third-place benchmarks and listed ranks are from the official ASAJ Boys 13–14 long-course rankings dated 29 September 2026. Gaps use Aidan’s fastest verified time, including later meet results. A negative gap (−) means Aidan is faster than the September third-place benchmark; it does not imply an updated official rank.</p>${table(['Event','Fastest verified LCM time','ASAJ rank (Sep 2026)','3rd-place swimmer','3rd-place time','Gap to 3rd','Boys 12 within ±10%','Boys 13 within ±5%'],ev.map(e=>`<tr><td>${esc(e.event)}</td><td>${value(e.personal_best)}</td><td>${value(e.rank)}</td><td>${e.third_place?esc(e.third_place.swimmer):value(null)}</td><td>${e.third_place?esc(e.third_place.time):value(null)}</td><td>${value(e.podium_gap)}</td><td>${e.boys12.length?e.boys12.length:'No age-12 swimmer within ±10% in available ASAJ top ten'}</td><td>${(e.boys13||[]).length?(e.boys13||[]).length:'No Boys 13 competitor within ±5% in extracted gender-specific ASAJ results'}</td></tr>`))}</div><div class="panel"><h2>Boys 13 | Same-age competitors within ±5%</h2><p>Extracted official ASAJ individual results for Boys 13 within ±5% of Aidan’s fastest verified LCM time; Aidan is excluded. Best time per swimmer across supplied meets. Mixed-sex events are held where gender cannot be verified. Meet ranges are not exact race dates.</p>${table(['Event','Swimmer','Club','Official time','Difference','Source'],ev.flatMap(e=>(e.boys13||[]).map(b=>`<tr><td>${esc(e.event)}</td><td>${esc(b.name)}</td><td>${esc(b.club)}</td><td>${esc(b.time)}</td><td>${esc(b.difference)}</td><td>${b.source_pdf?`<a href="${encodeURI(esc(b.source_pdf))}#page=${esc(b.source_page)}" target="_blank" rel="noopener">Meet PDF</a>`:link(b.source_url)}</td></tr>`)).length?ev.flatMap(e=>(e.boys13||[]).map(b=>`<tr><td>${esc(e.event)}</td><td>${esc(b.name)}</td><td>${esc(b.club)}</td><td>${esc(b.time)}</td><td>${esc(b.difference)}</td><td>${b.source_pdf?`<a href="${encodeURI(esc(b.source_pdf))}#page=${esc(b.source_page)}" target="_blank" rel="noopener">Meet PDF</a>`:link(b.source_url)}</td></tr>`)):[`<tr><td colspan="6">No verified Boys 13 competitor results within ±5% in the currently available ASAJ dataset.</td></tr>`])}</div><div class="panel"><h2>Boys 12 | Emerging competitors</h2><p>Eligible only within ±10% of Aidan's verified time. Differences are shown in seconds or minutes:seconds, never percentages.</p>${table(['Event','Swimmer','Club','Official time','Difference','Source'],ev.flatMap(e=>e.boys12.map(b=>`<tr><td>${esc(e.event)}</td><td>${esc(b.name)}</td><td>${esc(b.club)}</td><td>${esc(b.time)}</td><td>${esc(b.difference)}</td><td>${b.source_pdf?`<a href="${encodeURI(esc(b.source_pdf))}#page=${esc(b.source_page)}" target="_blank" rel="noopener">Meet PDF</a>`:link(b.source_url)}</td></tr>`)).length?ev.flatMap(e=>e.boys12.map(b=>`<tr><td>${esc(e.event)}</td><td>${esc(b.name)}</td><td>${esc(b.club)}</td><td>${esc(b.time)}</td><td>${esc(b.difference)}</td><td>${b.source_pdf?`<a href="${encodeURI(esc(b.source_pdf))}#page=${esc(b.source_page)}" target="_blank" rel="noopener">Meet PDF</a>`:link(b.source_url)}</td></tr>`)):[`<tr><td colspan="6">Pending verification of official Boys 12 rankings and Aidan's event times.</td></tr>`])}</div>`;
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
document.querySelectorAll('nav button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('nav button').forEach(x=>x.classList.remove('active'));b.classList.add('active');TAB=b.dataset.tab;render()}));
fetch('data.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Data not found');return r.json()}).then(d=>{DATA=d;render()}).catch(e=>document.querySelector('#status').textContent='Unable to load verified data: '+e.message);

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
 const cards=`<div class="cards">${card('ASAJ swims',official.length)}${card('SwimCloud supplied',swims.length-official.length)}${card('Best shown (mixed sources)',trendTime(Math.min(...vals)))}${card('First to latest',change===null?'Insufficient history':`${change>0?'+':''}${change.toFixed(2)}s ${change<0?'faster':change>0?'slower':'unchanged'}`)}</div>`;
 target.innerHTML=cards+`<div class="trend-chart"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(name)} ${esc(course)} race times and personal-best progression" preserveAspectRatio="xMidYMid meet">${grid}<path d="${line(bests)}" fill="none" stroke="#24a47c" stroke-width="3" stroke-dasharray="7 5"/><path d="${line(vals)}" fill="none" stroke="#e3a300" stroke-width="2" opacity=".65"/>${dots}<text x="${left}" y="${h-13}" fill="currentColor" font-size="12">Earliest recorded swim</text><text x="${w-right}" y="${h-13}" text-anchor="end" fill="currentColor" font-size="12">Latest recorded swim</text></svg></div><p><strong style="color:#e3a300">● ASAJ verified</strong> · <strong style="color:#6e80ef">● SwimCloud supplied, unverified</strong> · <strong style="color:#24a47c">- - Best recorded progression (mixed sources)</strong></p><div class="visual-scroll">${table(['Meet / date','Round','Time','Verification','Source'],swims.map(r=>`<tr><td>${esc(r.meet_name)}<small> · ${esc(r.meet_dates||r.date)}${r.precision==='meet_range'?' (approx.)':''}</small></td><td>${esc(r.round||'Unspecified')}</td><td>${esc(r.time)}</td><td>${esc(r.origin)}</td><td>${r.origin==='ASAJ verified'&&r.source_pdf?`<a href="${encodeURI(esc(r.source_pdf))}#page=${esc(r.source_page)}" target="_blank" rel="noopener">Official PDF p.${esc(r.source_page)}</a>`:r.source_url?link(r.source_url,'SwimCloud result'):'Not linked'}</td></tr>`))}</div>`;
}
// The main render replaces the tab content, so install controls after every render.
const originalRender=render;render=function(){originalRender();if(TAB==='trends'){document.querySelectorAll('.trend-event-link').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();TREND_SELECTION.event=el.dataset.event;TREND_SELECTION.course=el.dataset.course||TREND_SELECTION.course;drawTrendDetail();document.getElementById('trend-detail')?.scrollIntoView({behavior:'smooth',block:'start'});}));document.querySelectorAll('.trend-course-link').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();TREND_SELECTION.course=el.dataset.course;drawTrendDetail();}));drawTrendDetail();}};

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
 const summary=`<div class="intel-cards"><section class="intel-card"><h3>Historical strengths</h3><ol>${strongest.map(m=>`<li>${esc(m.name)} (${m.course}) · ${m.pct.toFixed(1)}% faster</li>`).join('')||'<li>Insufficient history</li>'}</ol></section><section class="intel-card"><h3>Recent performance to review</h3><ul>${slower.map(m=>`<li>${esc(m.name)} (${m.course}) · ${Math.abs(m.recentChange).toFixed(2)}s slower over last ${Math.min(3,m.swims.length)} races</li>`).join('')||'<li>No slower recent trends in recorded results</li>'}</ul></section><section class="intel-card"><h3>Coach discussion</h3><p>Review race pacing, starts, turns and training load before interpreting slower times. Prioritize repeatable gains.</p></section></div>`;
 const rows=metrics.map(m=>{
  const first=m.swims[0],last=m.swims.at(-1),delta=m.latest-m.first;
  const status=m.pct===null?'Insufficient history':delta<-.005?'Faster':delta>.005?'Slower':'Unchanged';
  const recent=m.recentChange===null?'Insufficient history':m.recentChange>.005?`Faster by ${m.recentChange.toFixed(2)}s`:m.recentChange<-.005?`Slower by ${Math.abs(m.recentChange).toFixed(2)}s`:'Unchanged';
  return `<article class="panel" id="swim-${esc(m.course)}-${esc(m.name).replace(/[^a-zA-Z0-9]/g,'-')}"><h3><a href="#trends" class="progress-event-link" data-event="${esc(m.name)}" data-course="${m.course}" aria-label="View detailed race history for ${esc(m.name)} ${m.course}">${esc(m.name)} · ${m.course}</a></h3><div class="swim-inline-detail" hidden></div><div class="intel-stats"><div><small>Personal best (recorded)</small><strong>${trendTime(m.best)}</strong><small>${bestDate(m)}</small></div><div><small>First → latest</small><strong>${trendTime(m.first)} → ${trendTime(m.latest)}</strong></div><div><small>Recent trend</small><strong>${recent}</strong></div></div><div class="intel-chart">${intelligenceLine(m)}</div><p>${m.swims.length} documented result(s) · ${m.pct===null?'Insufficient history':`${m.pct.toFixed(1)}% first-to-latest improvement`} · ${status}</p><p class="muted">PB includes documented ASAJ and supplementary SwimCloud results; source and date precision remain as recorded.</p></article>`;
 }).join('');
 return `<div class="panel"><h2>Swim Intelligence · all-event progress</h2><p>Separate LCM and SCM race histories. Performance Intelligence summarizes historical strengths and recent patterns; a slower race is not a diagnosis.</p>${summary}<p><strong>Chart key:</strong> Green segments = faster; red = slower; amber = unchanged. Yellow dots = ASAJ verified; blue = SwimCloud supplied (unverified). SCM and LCM are never combined.</p></div>${rows||'<div class="panel">No recorded races.</div>'}<div class="notice">Dates marked approximate are ASAJ meet-start dates. Supplementary swims are not qualification evidence. PB is the fastest documented result, not necessarily the latest result.</div>`;
}

// Intelligence uses only documented race results and the September 2026 Jamaica ranking snapshot.
// A national ranking third-place time is NOT a CARIFTA medal benchmark.
function intelligenceMetrics(d,course){
 return trendEventNames(d).map(name=>{
  const swims=trendSwims(d,name,course), vals=swims.map(r=>trendSeconds(r.time));
  if(!vals.length)return null;
  const first=vals[0],latest=vals.at(-1),best=Math.min(...vals),pct=vals.length>1?(first-latest)/first*100:null;
  const recent=vals.slice(-3),recentChange=recent.length>=2?recent[0]-recent.at(-1):null;
  const e=(d.events||[]).find(x=>x.event===name);
  const third=course==='LCM'&&e?.third_place?trendSeconds(e.third_place.time):null;
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
// Championship strategy: show only events supported by recorded times and a sourced B standard.
// This is a relative planning score, never a medal probability or selection forecast.
function championshipOpportunities(d,meet){
 const standards=meet==='CARIFTA'?(d.events||[]):(d.goodwill?.events||[]);
 const all=intelligenceMetrics(d,'LCM');
 return standards.map(e=>{
  const m=all.find(x=>x.name===e.event);
  const entry=usaSeconds(e.standards?.B?.time);
  if(!m||!Number.isFinite(m.best)||entry===null||entry<=0)return null;
  // CARIFTA selection requires an official, exactly dated LCM result in the qualifying window.
  // Do not treat historical PBs, supplementary swims, or approximate meet dates as eligible.
  let best=m.best, bestDate=null, classification=null;
  if(meet==='CARIFTA'){
   const start=d.carifta_criteria?.qualifying_period_start;
   const end=d.carifta_criteria?.qualifying_period_end;
   if(!/^\d{4}-\d{2}-\d{2}$/.test(start||''))return null;
   const eligible=trendSwims(d,e.event,'LCM').filter(x=>x.origin==='ASAJ verified'&&x.precision==='exact'&&/^\d{4}-\d{2}-\d{2}$/.test(x.date||'')&&x.date>=start&&(!end||x.date<=end)&&Number.isFinite(trendSeconds(x.time)));
   if(!eligible.length)return null;
   eligible.sort((x,y)=>trendSeconds(x.time)-trendSeconds(y.time));
   best=trendSeconds(eligible[0].time);
   bestDate=eligible[0].date;
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
  const ageDays=bestDate?Math.max(0,Math.floor((Date.now()-Date.parse(bestDate+'T00:00:00Z'))/86400000)):null;
  return {event:e.event,best,bestDate,ageDays,classification,entry,gap,trend,nearby,field,boys12,entryScore,trendScore,fieldScore,score:entryScore+trendScore+fieldScore};
 }).filter(Boolean).sort((a,b)=>b.score-a.score).slice(0,5);
}
function renderChampionshipShortlist(d){
 const panel=meet=>{
  const rows=championshipOpportunities(d,meet);
  if(!rows.length)return `<section class="panel"><h3>${meet} · Top five priorities</h3><p>No events have a qualifying-period, exactly dated, ASAJ-verified LCM time and a sourced B standard.</p></section>`;
  const cards=rows.map((r,i)=>{
   const direction=r.trend===null?'No recent trend':r.trend>0.005?'Faster':r.trend<-.005?'Slower':'Stable';
   const change=r.trend===null?'':` · ${Math.abs(r.trend).toFixed(2)}s`;
   const gap=r.gap<=0?`${Math.abs(r.gap).toFixed(2)}s inside B`:`${r.gap.toFixed(2)}s to B`;
   return `<article class="intel-card"><h3>${i+1}. <a href="#trends" class="strategy-event-link" data-event="${esc(r.event)}">${esc(r.event)}</a> <strong>${r.score.toFixed(0)}/100</strong></h3><p><strong>${trendTime(r.best)}</strong> best · ${r.ageDays===null?"Date unavailable":`${r.ageDays} days since fastest (${esc(r.bestDate)})`} · ${gap}${meet==='CARIFTA'?` · USA level: <strong>${esc(r.classification||'Unavailable')}</strong>`:''}</p><p>Recent: ${direction}${change}</p><p>ASAJ Boys 13–14: ${r.field} swimmers · ${r.nearby} within ±5%</p><p>ASAJ Boys 12: ${r.boys12} within ±10%</p><p class="muted">Entry ${r.entryScore.toFixed(0)}/60 · Trend ${r.trendScore.toFixed(0)}/25 · Field ${r.fieldScore.toFixed(0)}/15</p></article>`;
  }).join('');
  return `<section class="panel"><h2>${meet} · Top five event priorities</h2><div class="intel-cards">${cards}</div></section>`;
 };
 return `<section class="panel"><h2>🏆 CARIFTA + Goodwill Event Strategy</h2><p>Ranked event priorities, not qualification listings. Scores combine entry readiness (60), recent performance (25), and ASAJ competitor density (15).</p></section>${panel('CARIFTA')}${panel('Goodwill')}<p class="muted">CARIFTA: only exact-date ASAJ-verified LCM swims from 1 July 2026; qualifying period closing date remains unverified. USA classification is developmental, not selection eligibility. Recent trends may include supplementary results. Goodwill: available 2026 B standards, historical reference only. Competitor counts cover imported ASAJ results, not championship entries. Planning scores are not medal probabilities.</p>`;
}

function renderIntelligence(d){
 const metrics=['LCM','SCM'].flatMap(course=>intelligenceMetrics(d,course));
 const eligible=metrics.filter(m=>m.pct!==null);
 const strengths=[...eligible].sort((a,b)=>b.pct-a.pct).slice(0,3);
 const recentSlower=metrics.filter(m=>m.recentChange!==null&&m.recentChange<-.005).sort((a,b)=>a.recentChange-b.recentChange).slice(0,3);
 const snapshot=metrics.filter(m=>m.course==='LCM'&&m.gap!==null).sort((a,b)=>a.gap-b.gap).slice(0,5);
 const fmt=m=>`${esc(m.name)} <small>(${m.course})</small>`;
 const strong=strengths.map(m=>`<li>${fmt(m)} · ${m.pct.toFixed(1)}% faster from first to latest</li>`).join('');
 const focus=recentSlower.length?recentSlower.map(m=>`<li>${fmt(m)} · latest is ${Math.abs(m.recentChange).toFixed(2)}s slower than the first of the last ${Math.min(3,m.swims.length)} recorded races; review race context with coach</li>`).join(''):'<li>No slower recent trends detected among events with at least two results.</li>';
 const opp=snapshot.map(m=>`<tr><td>${fmt(m)}</td><td>${trendTime(m.best)}</td><td>${trendTime(m.third)}</td><td class="${m.gap<=0?'good':''}">${m.gap>0?'+':''}${m.gap.toFixed(2)}s</td><td>${m.bgap===null?'Unavailable':`${m.bgap>0?'+':''}${m.bgap.toFixed(2)}s`}</td></tr>`);
 const rows=metrics.map(m=>`<tr><td>${fmt(m)}</td><td>${m.swims.length}</td><td>${trendTime(m.best)}</td><td>${m.pct===null?'Not enough history':`${m.pct>0?'+':''}${m.pct.toFixed(1)}%`}</td><td>${m.recentChange===null?'Not enough history':`${m.recentChange>0?'Faster':m.recentChange<0?'Slower':'Unchanged'} (${Math.abs(m.recentChange).toFixed(2)}s)`}</td></tr>`);
 return `<div class="intel-head"><div><div class="visual-eyebrow">AIDAN SEATON · TRAINING DECISION SUPPORT</div><h2>Performance Intelligence</h2><p>Documented strengths, recent trends and evidence-based priorities. Not a medal prediction.</p></div><div class="intel-toggle"><label>Inspect course <select id="intel-course"><option value="LCM">LCM (50m)</option><option value="SCM">SCM (25m)</option></select></label></div></div>
 <div class="intel-cards"><section class="intel-card"><h3>🏆 Closest national podium comparisons</h3><p>September 2026 Jamaica ranking snapshot, LCM only.</p><ol>${snapshot.slice(0,3).map(m=>`<li>${fmt(m)} · ${m.gap>0?m.gap.toFixed(2)+'s behind':Math.abs(m.gap).toFixed(2)+'s ahead'}</li>`).join('')||'<li>No verified snapshot benchmarks</li>'}</ol></section>
 <section class="intel-card"><h3>💪 Historical strengths</h3><p>Largest first-to-latest percentage gains.</p><ol>${strong||'<li>Insufficient data</li>'}</ol></section>
 <section class="intel-card"><h3>🎯 Review opportunities</h3><p>Recent race times moving slower, not a diagnosis.</p><ul>${focus}</ul></section>
 <section class="intel-card"><h3>💡 Coach discussion</h3><ul><li>Review splits, turns, starts and race pacing where available.</li><li>Check training load and taper before interpreting slower races.</li><li>Prioritize events with verified qualification gaps and repeatable improvement.</li></ul></section></div>
 <div class="intel-layout"><section class="panel"><h2>Event analysis</h2><p>Official 2027 B-standard gap is shown separately from the September 2026 national third-place comparison. Neither represents a CARIFTA bronze-medal time.</p><div class="visual-scroll">${table(['Event','Course','Swims','Best shown','First → latest','Recent trend'],rows)}</div></section><section class="panel"><h2>Selected event · real race timeline</h2><label>Event <select id="intel-event"></select></label><div id="intel-detail"></div><p class="muted">Green segments = faster; red = slower; amber = unchanged. Yellow dots = ASAJ verified; blue = SwimCloud supplied. SCM and LCM never combined.</p></section></div>
 <div class="panel"><h2>Closest documented national third-place comparisons</h2><p>Jamaica rankings dated 29 September 2026. This is <strong>not</strong> CARIFTA finals or medal evidence. Qualification and team selection require additional verification.</p><div class="visual-scroll">${table(['Event','Best shown LCM*','National 3rd (Sep)','Gap to national 3rd','2027 CARIFTA B gap*'],opp)}</div><p class="muted">*Best shown may include unverified SwimCloud data. B gap is a mathematical comparison only; eligible race dates and official selection rules still apply.</p></div><div class="notice">Medal opportunity ranking unavailable until actual CARIFTA finalist and bronze-medal results for the correct age group are sourced. No benchmark or intermediate swim time has been invented.</div>`;
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
 const rows=d.events.filter(e=>e.third_place&&e.third_place.time).map(e=>{
  const t=usaSeconds(e.personal_best),p=usaSeconds(e.third_place.time),gap=t===null||p===null?null:t-p;
  return `<tr><td>${esc(e.event)} LCM</td><td>${esc(e.personal_best||'Unavailable')}</td><td>${esc(e.third_place.swimmer||'Unavailable')}</td><td>${esc(e.third_place.time)}</td><td>${gap===null?'Unavailable':`${gap>0?'+':''}${gap.toFixed(2)}s`}</td></tr>`;
 });
 return `<section class="panel"><h2>Competitor benchmark snapshot</h2><p>Comparison against the documented third-place swimmer in the Jamaica rankings of 29 September 2026. These are not live head-to-head results or CARIFTA bronze benchmarks.</p><div class="visual-scroll">${table(['Event','Aidan shown','National 3rd swimmer','National 3rd time','Gap'],rows)}</div><p class="muted">Gaining or losing ground requires at least two dated, comparable competitor snapshots. Until those are available, relative trend is <strong>insufficient data</strong>, not assumed to be improving.</p></section>`;
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
