(()=>{'use strict';
const $=id=>document.getElementById(id),fmt=n=>n.toLocaleString('ko-KR');
const CAP_KEY='party-guild-member-capacity-v1';
function capacity(){try{const n=Number(localStorage.getItem(CAP_KEY));return Number.isSafeInteger(n)&&n>0&&n<=999?n:36}catch{return 36}}
function put(id,text){const el=$(id);if(el)el.textContent=text;}
let current=null;
function render(){if(!current)return;const a=current.attendance,r=current.rewards,active=a.members.filter(m=>m?.active===true).length;
 put('partyDashMembers',fmt(active)+' / '+fmt(capacity())+'명');put('partyDashMembersHint','Firebase 전체 누적 '+fmt(a.members.length)+'명 · 정원 '+fmt(capacity())+'명');
 put('partyDashSessions',fmt(a.sessions.length)+'회');
 put('partyDashBalance',r?fmt(r.balance):'미등록');put('partyDashPending',r?fmt(r.requests.filter(x=>x.status==='purchased').length)+'건':'미등록');
 put('partyDashOrigin',`✅ Firebase 출석 원본 버전 ${current.attendanceRevision} · 보상 ${r?'연결됨':'최초 등록 필요'} · ${new Date().toLocaleString('ko-KR')}`);
}
function capEdit(){const hint=$('partyDashMembersHint');if(!hint)return;const wrap=document.createElement('div');wrap.style.cssText='display:flex;gap:6px;margin-top:8px;align-items:center;flex-wrap:wrap';const input=document.createElement('input');input.type='number';input.min='1';input.max='999';input.value=capacity();input.style.cssText='width:65px;background:#202c40;color:#fff;border:1px solid #8d7949;border-radius:5px';input.id='partyDashCapacityInput';const b=document.createElement('button');b.textContent='정원 변경 (이 PC)';b.style.cssText='font-size:12px;padding:6px;border:1px solid #c8a76b;border-radius:5px;background:#302c2a;color:#ecd7ae';b.onclick=()=>{const n=Number(input.value);if(!Number.isInteger(n)||n<1||n>999||current&&n<current.attendance.members.filter(m=>m.active).length){alert('정원은 현재 활동 인원 이상, 999명 이하여야 해.');return}localStorage.setItem(CAP_KEY,String(n));render()};wrap.append(input,b);hint.after(wrap)}
window.addEventListener('party-cloud-analytics',e=>{current=e.detail;render()});
document.addEventListener('DOMContentLoaded',()=>{capEdit();put('partyDashOrigin','Firebase 문주 데이터 확인 중…');});
})();
