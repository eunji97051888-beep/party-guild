(()=>{'use strict';
// 공개용 파일만 읽는다. 관리자 저장 데이터/Firebase/출석 기록은 변경하지 않는다.
const $=id=>document.getElementById(id);
const area=$('attendView'),stamp=$('stamp'),dateSelect=$('dateSelect'),dateMeta=$('dateMeta');
const older=$('olderDate'),newer=$('newerDate');
const dialog=$('attendanceDialog'),dialogTitle=$('dialogTitle'),dialogSubtitle=$('dialogSubtitle');
const roundNav=$('roundNav'),summaryBar=$('statusSummary'),filterArea=$('statusFilters'),memberList=$('memberList'),modeGuide=$('modeGuide');
const order=['요신토벌령','결계지방어','미혹의 정원','신기 쟁탈전'];
const labels={present:'참석',absent:'불참',exempt:'제외',missing:'미입력'};
const displayOrder=['present','absent','exempt','missing'];
const TICKET_START='2026-10-30';
const isPvP=s=>s.content==='신기 쟁탈전'||s.content==='미혹의 정원';
const showModes=s=>s.date>=TICKET_START;
function modeInfo(member,session){
 if(statusKey(member.status)!=='present')return null;
 if(!showModes(session))return {kind:'legacy',text:'기존 기준 · 1장',tickets:1};
 const pv=isPvP(session),mode=member.mode;
 if(mode==='direct')return {kind:'direct',text:`직접 참여 · ${pv?2:1}장`,tickets:pv?2:1};
 if(pv&&mode==='auto')return {kind:'auto',text:'오토 방어 · 1장',tickets:1};
 if(!pv&&mode==='clone')return {kind:'clone',text:'분신 등록 · 0장',tickets:0};
 return {kind:'unconfirmed',text:`방식 확인 필요 · 임시 ${pv?2:1}장`,tickets:pv?2:1};
}
function modeStats(session){
 const info={direct:0,auto:0,clone:0,unconfirmed:0,provisional:0,tickets:0};
 for(const member of session.members||[]){const m=modeInfo(member,session);if(!m)continue;info.tickets+=m.tickets;if(m.kind in info)info[m.kind]++;if(m.kind==='unconfirmed')info.provisional+=m.tickets;}
 return info;
}
const mk=(tag,cls,content)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(content!==undefined)n.textContent=String(content);return n};
const statusKey=raw=>Object.prototype.hasOwnProperty.call(labels,raw)?raw:'missing';
const dateText=raw=>{if(!/^\d{4}-\d\d-\d\d$/.test(raw||''))return raw||'날짜 미지정';const d=new Date(raw+'T12:00:00');return Number.isNaN(d.getTime())?raw:d.toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric',weekday:'short'})};
const stat=s=>{const result={present:0,absent:0,exempt:0,missing:0};for(const m of s.members||[])result[statusKey(m.status)]++;return result};
const requestedDate=new URLSearchParams(window.location.search).get('date')||'';
let sessions=[],dates=[],activeDate='',activeSession=null,activeFilter='all',lastOpener=null;
function showError(message){stamp.textContent=message;area.replaceChildren(mk('p','empty','잠시 후 새로고침해 줘. 계속된다면 공개 출석 파일을 확인해야 해.'));dateSelect.disabled=older.disabled=newer.disabled=true;}
function prepare(raw){
 if(!raw||!Array.isArray(raw.sessions)){showError('공개 출석 데이터를 불러오지 못했어.');return}
 sessions=raw.sessions.filter(s=>s&&typeof s.content==='string'&&Array.isArray(s.members)).map((s,index)=>({...s,_index:index}));
 if(!sessions.length){showError('아직 공개된 출석 회차가 없어.');return}
 dates=[...new Set(sessions.map(s=>s.date||'날짜 미지정'))].sort((a,b)=>b.localeCompare(a));
 let published='';try{published=new Date(raw.publishedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}catch{}
 stamp.textContent='마지막 게시: '+(published||'날짜 확인 불가')+' · 공개된 회차 '+sessions.length+'건';
 dateSelect.replaceChildren(...dates.map(date=>{const opt=mk('option','',dateText(date));opt.value=date;return opt}));
 activeDate=dates.includes(requestedDate)?requestedDate:dates[0];dateSelect.value=activeDate;renderDate();
}
function latestFirst(a,b){return (b.date||'').localeCompare(a.date||'')||b._index-a._index}
// 카드의 회차 번호와 상세 창의 번호를 모두 '해당 콘텐츠의 전체 누적 회차'로 맞춘다.
function sessionChronology(a,b){
 if(Number.isSafeInteger(a.round)&&a.round>0&&Number.isSafeInteger(b.round)&&b.round>0)return a.round-b.round;
 return (a.date||'').localeCompare(b.date||'')||a._index-b._index;
}
function contentRoundIndex(s){
 const sorted=sessions.filter(item=>item.content===s.content).sort(sessionChronology);
 return {number:Number.isSafeInteger(s.round)&&s.round>0?s.round:sorted.findIndex(item=>item._index===s._index)+1,total:sorted.length};
}
function renderDate(){
 dateSelect.value=activeDate;const position=dates.indexOf(activeDate);
 older.disabled=position===dates.length-1;newer.disabled=position===0;
 const inDate=sessions.filter(s=>(s.date||'날짜 미지정')===activeDate);
 const byContent=new Map();for(const s of inDate){if(!byContent.has(s.content))byContent.set(s.content,[]);byContent.get(s.content).push(s)}
 const contents=[...byContent.keys()].sort((a,b)=>{
  const x=order.indexOf(a),y=order.indexOf(b);
  return (x<0?999:x)-(y<0?999:y)||a.localeCompare(b);
 });
 dateMeta.textContent=`${dateText(activeDate)} · ${contents.length}개 콘텐츠 / ${inDate.length}개 회차`;
 area.replaceChildren();
 if(!contents.length){area.append(mk('p','empty','선택한 날짜의 공개 기록이 없어.'));return}
 for(const content of contents){const entries=byContent.get(content).sort(latestFirst),s=entries[0],count=stat(s);
  const round=contentRoundIndex(s);
  const card=mk('section','overview-card'+(contents.length===1?' one':''));
  const heading=mk('div','card-heading'),text=mk('div'),h2=mk('h2','',content),sub=mk('div','round-label',s.label||'회차 정보 없음'),pill=mk('span','round-pill',round.number+'회차');
  text.append(h2,sub);heading.append(text,pill);card.append(heading);
  const stats=mk('div','card-stats');for(const key of displayOrder){const item=mk('div','card-stat '+key);item.append(mk('strong','',count[key]),mk('span','',labels[key]));stats.append(item)}card.append(stats);
  if(showModes(s)){const m=modeStats(s);const detail=mk('p','card-ticket-info',`추첨권 합계 ${m.tickets}장${m.unconfirmed?` · 방식 확인 필요 ${m.unconfirmed}명 (임시 포함)`:''}`);card.append(detail)}
  const view=mk('button','view-button','출석 현황 크게 보기 ↗');view.type='button';view.setAttribute('aria-label',`${content} ${dateText(activeDate)} 출석 현황 크게 보기`);view.addEventListener('click',()=>openDetail(s,view));card.append(view);
  area.append(card);
 }
}
function openDetail(s,opener){
 lastOpener=opener;activeSession=s;activeFilter='all';renderDetail();
 if(typeof dialog.showModal==='function'){dialog.showModal();document.body.style.overflow='hidden';$('closeDialog').focus()}
 else{dialog.setAttribute('open','');document.body.style.overflow='hidden'}
}
function renderDetail(){
 const s=activeSession;if(!s)return;
 const ofContent=sessions.filter(item=>item.content===s.content).sort(sessionChronology);
 const idx=ofContent.findIndex(item=>item._index===s._index);
 dialogTitle.textContent=s.content;
 dialogSubtitle.textContent=dateText(s.date)+' · '+(s.label||`${Number.isSafeInteger(s.round)&&s.round>0?s.round:idx+1}회차`);
 roundNav.replaceChildren();
 const prev=mk('button','','‹ 이전 회차');prev.type='button';prev.disabled=idx<=0;
 const current=mk('span','',`${Number.isSafeInteger(s.round)&&s.round>0?s.round:idx+1}회차 / 총 ${ofContent.length}회차`);
 const next=mk('button','','다음 회차 ›');next.type='button';next.disabled=idx>=ofContent.length-1;
 prev.addEventListener('click',()=>{activeSession=ofContent[idx-1];activeFilter='all';renderDetail()});
 next.addEventListener('click',()=>{activeSession=ofContent[idx+1];activeFilter='all';renderDetail()});
 roundNav.append(prev,current,next);
 const info=modeStats(s);
 modeGuide.textContent=showModes(s)?`${isPvP(s)?'직접 2장 · 오토 방어 1장':'직접 1장 · 분신 등록 0장'} · 참석자 추첨권 합계 ${info.tickets}장${info.unconfirmed?` (참여 방식 미확인 ${info.unconfirmed}명 · 임시 계산 포함)`:''}`:'10월 30일 이전 회차 · 기존 기준 (참석 1회당 1장)';
 const totals=stat(s);summaryBar.replaceChildren();
 for(const key of displayOrder){const item=mk('div','summary-item '+key);item.append(mk('strong','',totals[key]),mk('span','',labels[key]));summaryBar.append(item)}
 renderFilters();renderMembers();
}
function renderFilters(){
 filterArea.replaceChildren();const options=[['all','전체'],...displayOrder.map(k=>[k,labels[k]])];
 for(const [value,label] of options){const btn=mk('button','',label);btn.type='button';btn.setAttribute('aria-pressed',String(activeFilter===value));btn.addEventListener('click',()=>{activeFilter=value;renderFilters();renderMembers()});filterArea.append(btn)}
}
function renderMembers(){
 memberList.replaceChildren();const members=(activeSession?.members||[]).filter(m=>activeFilter==='all'||statusKey(m.status)===activeFilter);
 if(!members.length){memberList.append(mk('p','filter-empty','해당 상태인 문파원이 없어.'));return}
 for(const member of members){
  const row=mk('div','member-row'),name=mk('span','member-name',member.name||'이름 없음'),key=statusKey(member.status),status=mk('span','state '+key,labels[key]);
  const tags=mk('span','member-tags');tags.append(status);
  const detail=modeInfo(member,activeSession);if(detail){tags.append(mk('span','mode-tag '+detail.kind,detail.text))}
  row.append(name,tags);memberList.append(row)
 }
}
function closeDetail(){if(dialog.open&&typeof dialog.close==='function')dialog.close();else{dialog.removeAttribute('open');document.body.style.overflow='';lastOpener?.focus()}}
$('closeDialog').addEventListener('click',closeDetail);$('bottomCloseDialog').addEventListener('click',closeDetail);
dialog.addEventListener('close',()=>{document.body.style.overflow='';lastOpener?.focus()});
dialog.addEventListener('click',e=>{if(e.target===dialog)closeDetail()});
dateSelect.addEventListener('change',()=>{activeDate=dateSelect.value;renderDate()});
older.addEventListener('click',()=>{const idx=dates.indexOf(activeDate);if(idx<dates.length-1){activeDate=dates[idx+1];renderDate()}});
newer.addEventListener('click',()=>{const idx=dates.indexOf(activeDate);if(idx>0){activeDate=dates[idx-1];renderDate()}});
// 매 페이지 진입 시 공개용 JS를 한 번만 새로 읽는다. GitHub Pages 파일 갱신 후 낡은 캐시 방지.
const script=document.createElement('script');
script.src='attendance-public-data.js?loaded='+Date.now();
script.onload=()=>prepare(window.PARTY_PUBLIC_ATTENDANCE);
script.onerror=()=>showError('공개 출석 파일을 불러오지 못했어.');
document.body.append(script);
})();
