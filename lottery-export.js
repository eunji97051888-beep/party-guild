(()=>{'use strict';
const KEY='party-guild-v11-attendance';
const contentEl=document.getElementById('lotteryContent');
const summary=document.getElementById('lotteryExportSummary');
const button=document.getElementById('lotteryExportBtn');
if(!contentEl||!summary||!button)return;
function readState(){
 const raw=localStorage.getItem(KEY);
 if(!raw)throw Error('이 브라우저에 출석 장부가 없어. 출석 관리하던 PC에서 열어 줘.');
 const data=JSON.parse(raw);
 if(!Array.isArray(data?.members)||!Array.isArray(data?.sessions)||!data.attendance||typeof data.attendance!=='object')
  throw Error('출석 장부 형식이 올바르지 않아.');
 return data;
}
function contents(data){return [...new Set(data.sessions.map(s=>s.content).filter(x=>typeof x==='string'&&x))].sort((a,b)=>a.localeCompare(b,'ko'));}
function calculate(data,selected){
 const sessions=data.sessions.filter(s=>selected==='all'||s.content===selected);
 const counts={};
 for(const member of data.members){
  if(!member||member.active!==true||typeof member.name!=='string'||!member.name.trim())continue;
  let count=0;
  for(const session of sessions){
   if(data.attendance[session.id]?.[member.id]==='present')count++;
  }
  if(count>0)counts[member.name.trim()]=(counts[member.name.trim()]||0)+count;
 }
 return {counts,sessionCount:sessions.length,eligible:Object.keys(counts).length,tickets:Object.values(counts).reduce((a,b)=>a+b,0)};
}
function update(){
 try{
  const data=readState();
  const selected=contentEl.value;
  const existing=new Set([...contentEl.options].map(x=>x.value));
  for(const content of contents(data)){
   if(!existing.has(content)){const option=document.createElement('option');option.value=content;option.textContent=content;contentEl.append(option);}
  }
  for(const option of [...contentEl.options])if(option.value!=='all'&&!contents(data).includes(option.value))option.remove();
  if(selected!=='all'&&contents(data).includes(selected))contentEl.value=selected;
  const result=calculate(data,contentEl.value);
  summary.textContent=`집계 ${result.sessionCount}회차 · 추첨 대상 ${result.eligible}명 · 총 추첨권 ${result.tickets}장 (탈퇴자·참석 0회 제외)`;
  button.disabled=!result.eligible;
 }catch(error){summary.textContent=error.message;button.disabled=true;}
}
button.addEventListener('click',()=>{
 try{
  const data=readState();
  const result=calculate(data,contentEl.value);
  if(!result.eligible)throw Error('추첨 대상자가 없어.');
  const message=`${contentEl.options[contentEl.selectedIndex].text}\n${result.sessionCount}회차 · ${result.eligible}명 · 추첨권 ${result.tickets}장\n\n이 명단을 내려받을까?`;
  if(!confirm(message))return;
  // The desktop draw program expects a flat {nickname: attendanceCount} JSON mapping.
  const json=JSON.stringify(result.counts,null,2);
  const blob=new Blob([json],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  const date=new Date();
  const stamp=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('');
  a.download=`파티_행운의전당_추첨명단_${stamp}.json`;
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
 }catch(error){alert('추첨 명단을 만들지 못했어: '+error.message);}
});
contentEl.addEventListener('change',update);
window.addEventListener('focus',update);
update();
})();