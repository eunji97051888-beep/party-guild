(function(global){'use strict';
// 공개용 출석 자료 생성. 로컬 원본의 출석, 회차, 보상 장부는 수정하지 않는다.
const START='2026-10-30';
const PVP=new Set(['신기 쟁탈전','미혹의 정원']);
const CONTENTS=new Set(['신기 쟁탈전','미혹의 정원','요신토벌령','결계지방어']);
const safeName=value=>String(value??'').slice(0,35);
const safeLabel=value=>String(value??'').slice(0,120);
function createPayload(data){
 if(!data||!Array.isArray(data.members)||!Array.isArray(data.sessions)||!data.attendance||typeof data.attendance!=='object')throw Error('출석 JSON 형식을 확인해 줘.');
 const sessions=data.sessions.slice().filter(s=>s&&typeof s.id==='string'&&CONTENTS.has(s.content)&&/^\d{4}-\d{2}-\d{2}$/.test(s.date||'')).sort((a,b)=>a.date.localeCompare(b.date)).slice(-500).map(s=>{
  const members=data.members.filter(m=>m&&typeof m.id==='string'&&typeof m.name==='string'&&(m.active||Object.prototype.hasOwnProperty.call(data.attendance[s.id]||{},m.id))).map(m=>{
   const raw=data.attendance[s.id]?.[m.id];
   const status=['present','absent','exempt'].includes(raw)?raw:'missing';
   const entry={name:safeName(m.name)+(m.active?'':' (탈퇴)'),status};
   if(status!=='present')return entry;
   if(s.date<START){entry.mode='legacy';entry.tickets=1;return entry}
   const pv=PVP.has(s.content);
   const rawMode=data.participationModes?.[s.id]?.[m.id];
   const mode=(rawMode==='direct'||(pv&&rawMode==='auto')||(!pv&&rawMode==='clone'))?rawMode:'unconfirmed';
   entry.mode=mode;
   entry.tickets=pv?(mode==='auto'?1:2):(mode==='clone'?0:1);
   if(mode==='unconfirmed')entry.provisional=true; // 임시 계산값. 직접 참여 확정 아님.
   return entry;
  });
  return {content:safeName(s.content),date:safeName(s.date),label:safeLabel(s.label),round:Number.isInteger(s.round)&&s.round>0?s.round:null,startTime:/^([01]\d|2[0-3]):[0-5]\d$/.test(s.startTime||'')?s.startTime:'',members};
 });
 return {version:2,policyStart:START,publishedAt:new Date().toISOString(),sessions};
}
function sourceText(payload){return 'window.PARTY_PUBLIC_ATTENDANCE = '+JSON.stringify(payload).replace(/</g,'\\u003c').replace(/\u2028|\u2029/g,'')+';\n'}
function download(payload){
 const url=URL.createObjectURL(new Blob([sourceText(payload)],{type:'text/javascript;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='attendance-public-data.js';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function unconfirmedCount(payload){return payload.sessions.reduce((count,s)=>count+s.members.filter(m=>m.status==='present'&&m.mode==='unconfirmed').length,0)}
global.PARTY_ATTENDANCE_EXPORT={createPayload,sourceText,download,unconfirmedCount};
})(typeof window!=='undefined'?window:globalThis);
