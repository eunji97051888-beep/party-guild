(()=>{'use strict';
const KEY='party-guild-v11-attendance';
const PREF='party-lottery-periods-v1';
const byId=id=>document.getElementById(id);
const contentEl=byId('lotteryContent'), summary=byId('lotteryExportSummary'), button=byId('lotteryExportBtn');
const periodEl=byId('lotteryPeriod'),startEl=byId('lotteryStart'),endEl=byId('lotteryEnd');
if(!contentEl||!summary||!button||!periodEl||!startEl||!endEl)return;
function kstDate(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
function validDate(s){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'));}
function defaults(period){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(period))throw Error('정산 연월을 선택해 줘.');
 const [y,m]=period.split('-').map(Number);
 const last=new Date(Date.UTC(y,m,0)).toISOString().slice(0,10);
 // 2026-10-28 first settlement is already closed; 10/29-31 belong to November.
 let start=period==='2026-11'?'2026-10-29':period+'-01';
 const previous=new Date(Date.UTC(y,m-2,1)).toISOString().slice(0,7);
 const prevEnd=prefs()[previous]?.end;
 // If the prior month's actual cutoff was earlier than month-end, carry remaining days forward.
 if(prevEnd&&validDate(prevEnd)){
  const next=new Date(Date.parse(prevEnd+'T00:00:00Z')+86400000).toISOString().slice(0,10);
  if(next<=last)start=next;
 }
 return {start,end:last};
}
function prefs(){try{return JSON.parse(localStorage.getItem(PREF))||{}}catch{return {}}}
function savePref(){let v=prefs();v[periodEl.value]={start:startEl.value,end:endEl.value};localStorage.setItem(PREF,JSON.stringify(v));}
function initPeriod(period){periodEl.value=period;const p=prefs()[period]||defaults(period);startEl.value=p.start;endEl.value=p.end;savePref();update();}
function readState(){
 const raw=localStorage.getItem(KEY);
 if(!raw)throw Error('이 브라우저에 출석 장부가 없어. 출석 관리하던 PC에서 열어 줘.');
 const data=JSON.parse(raw);
 if(!Array.isArray(data?.members)||!Array.isArray(data?.sessions)||!data.attendance||typeof data.attendance!=='object')throw Error('출석 장부 형식이 올바르지 않아.');
 return data;
}
function contents(data){return [...new Set(data.sessions.map(s=>s.content).filter(x=>typeof x==='string'&&x))].sort((a,b)=>a.localeCompare(b,'ko'))}
function calculate(data,selected,period,start,end){
 if(!validDate(start)||!validDate(end)||start>end)throw Error('집계 시작일과 종료일을 다시 확인해 줘.');
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(period))throw Error('정산 연월을 선택해 줘.');
 const sessions=data.sessions.filter(s=>s.date>=start&&s.date<=end&&(selected==='all'||s.content===selected));
 const counts={};let unclassified=0,zeroTicketParticipations=0;
 for(const member of data.members){
  if(!member||member.active!==true||typeof member.name!=='string'||!member.name.trim())continue;
  let count=0;
  for(const session of sessions){
   if(data.attendance[session.id]?.[member.id]!=='present')continue;
   const mode=data.participationModes?.[session.id]?.[member.id];
   if(session.date>='2026-10-30'&&!mode)unclassified++;
   let tickets;
   if(session.date<'2026-10-30')tickets=1; // 기존 정산 기준 보존
   else if(session.content==='신기 쟁탈전'||session.content==='미혹의 정원')tickets=mode==='auto'?1:2;
   else tickets=mode==='clone'?0:1; // 요신토벌령 / 결계지방어
   count+=tickets;
   if(tickets===0)zeroTicketParticipations++;
  }
  if(count>0)counts[member.name.trim()]=(counts[member.name.trim()]||0)+count;
 }
 return {counts,sessions,eligible:Object.keys(counts).length,tickets:Object.values(counts).reduce((a,b)=>a+b,0),unclassified,zeroTicketParticipations};
}
function update(){
 try{
  const data=readState();const selected=contentEl.value;const existing=new Set([...contentEl.options].map(x=>x.value));
  const names=contents(data);
  for(const content of names)if(!existing.has(content)){const o=document.createElement('option');o.value=content;o.textContent=content;contentEl.append(o)}
  for(const o of [...contentEl.options])if(o.value!=='all'&&!names.includes(o.value))o.remove();
  if(selected!=='all'&&names.includes(selected))contentEl.value=selected;
  const result=calculate(data,contentEl.value,periodEl.value,startEl.value,endEl.value);
  summary.textContent=`${periodEl.value} 정산 · ${startEl.value} ~ ${endEl.value} · 집계 ${result.sessions.length}회차 · 추첨 대상 ${result.eligible}명 · 총 추첨권 ${result.tickets}장 (추첨권 0장·탈퇴자 제외)`+(result.unclassified?` · ⚠ 참여 방식 미확인 ${result.unclassified}건: 기본 직접 참여로 계산 중!`:``)+(result.zeroTicketParticipations?` · 분신 등록 0장 ${result.zeroTicketParticipations}건`:``);
  button.disabled=!result.eligible;
 }catch(error){summary.textContent=error.message;button.disabled=true;}
}
button.addEventListener('click',()=>{
 try{
  const data=readState();const period=periodEl.value,start=startEl.value,end=endEl.value;
  const result=calculate(data,contentEl.value,period,start,end);
  if(!result.eligible)throw Error('해당 기간의 추첨 대상자가 없어.');
  const list=result.sessions.map(s=>`${s.date} ${s.content} ${s.round||''}회차`).join('\n');
  const msg=`정산: ${period}\n기간: ${start} ~ ${end}\n콘텐츠: ${contentEl.options[contentEl.selectedIndex].text}\n집계 ${result.sessions.length}회차 · 추첨 대상 ${result.eligible}명 · 추첨권 ${result.tickets}장\n\n기준: 10/30부터 신기/미혹 직접 2장 · 오토 1장, 요신/결계 직접 1장 · 분신 0장\n${result.unclassified?`\n⚠ 참여 방식 미확인 ${result.unclassified}건은 직접 참여로 계산 중! 오토/분신 인원을 수정했는지 확인해.\n`:''}\n집계한 회차:\n${list||'없음'}\n\n기간이 이전 분배와 겹치지 않는지 확인했어?`;
  if(!confirm(msg))return;
  const payload={schema_version:2,settlement_period:period,attendance_range:{start,end},content_filter:contentEl.value,source_session_ids:result.sessions.map(s=>s.id),participants:result.counts};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;
  a.download=`파티_추첨명단_${period}_${start}_${end}.json`;
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
  savePref();
 }catch(error){alert('추첨 명단을 만들지 못했어: '+error.message)}
});
contentEl.addEventListener('change',update);
periodEl.addEventListener('change',()=>initPeriod(periodEl.value));
for(const el of [startEl,endEl])el.addEventListener('change',()=>{savePref();update()});
window.addEventListener('focus',update);
const today=kstDate();const initial=today>='2026-10-29'&&today<'2026-11-01'?'2026-11':today.slice(0,7);
initPeriod(initial);
})();
