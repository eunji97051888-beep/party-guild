(()=>{'use strict';
const b=document.getElementById('publishAttendanceBtn');if(!b)return;
b.addEventListener('click',()=>{
 let data;try{data=JSON.parse(localStorage.getItem('party-guild-v11-attendance')||'null')}catch{}
 if(!data||!Array.isArray(data.members)||!Array.isArray(data.sessions)||!data.attendance){alert('이 PC에 출석 기록이 없어. 출석 관리 PC에서 실행해 줘.');return}
 if(!data.sessions.length){alert('아직 공개할 출석 회차가 없어.');return}
 if(!confirm('문파원의 닉네임과 회차별 참석·불참·제외·미입력 상태가 공개돼. 계속할까?'))return;
 const safeName=v=>String(v||'').slice(0,35);
 const safeLabel=v=>String(v||'').slice(0,120);
 const sessions=data.sessions.slice().filter(x=>x&&typeof x.id==='string'&&typeof x.content==='string'&&typeof x.date==='string').sort((a,b)=>a.date.localeCompare(b.date)).slice(-500).map(s=>({content:safeName(s.content),date:safeName(s.date),label:safeLabel(s.label),round:Number.isInteger(s.round)&&s.round>0?s.round:null,startTime:/^([01]\d|2[0-3]):[0-5]\d$/.test(s.startTime||'')?s.startTime:'',members:data.members.filter(m=>m&&typeof m.id==='string'&&typeof m.name==='string'&&(m.active||Object.prototype.hasOwnProperty.call(data.attendance[s.id]||{},m.id))).map(m=>({name:safeName(m.name)+(m.active?'':' (탈퇴)'),status:['present','absent','exempt'].includes(data.attendance[s.id]?.[m.id])?data.attendance[s.id][m.id]:'missing'}))}));
 const payload={version:1,publishedAt:new Date().toISOString(),sessions};
 const source='window.PARTY_PUBLIC_ATTENDANCE = '+JSON.stringify(payload).replace(/</g,'\\u003c').replace(/\u2028|\u2029/g,'')+';\n';
 const url=URL.createObjectURL(new Blob([source],{type:'text/javascript;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='attendance-public-data.js';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
 alert('공개용 attendance-public-data.js 다운로드 완료! GitHub 저장소 맨 위에 올리고 Commit changes를 눌러 줘.');
});})();
