// Cloud-only analytics + dashboard. Never copy into legacy localStorage or modify documents.
import {refs,waitAuth,isAdmin,login,read,onSnapshot} from './party-firebase-shared.js';
const $=id=>document.getElementById(id);
function signInButton(container,done){
 const btn=document.createElement('button');btn.type='button';btn.textContent='🔒 문주 Google 로그인';btn.style.cssText='margin:8px 0;padding:10px 15px;border-radius:8px;background:#e8bd75;color:#172233;border:0;font-weight:700;cursor:pointer';
 btn.onclick=async()=>{btn.disabled=true;try{await login();btn.remove();await done()}catch(e){container.textContent='관리자 로그인 실패: '+(e.message||e)}finally{btn.disabled=false}};
 container.append(document.createElement('br'),btn);
}
async function start(){const page=document.body.dataset.partyCloudPage;
 if(!page)return;
 const msg=$('source')||$('partyDashOrigin');
 if(!msg)return;
 let watching=false;const reload=async()=>{
  if(!isAdmin()){msg.textContent='보안상 서버 출석·보상 원본은 문주에게만 표시돼.';signInButton(msg,reload);return;}
  msg.textContent='Firebase 서버 기록을 불러오는 중…';
  try{
   const attSnap=await read(refs.attendance);if(!attSnap.exists())throw Error('Firebase 출석 원본이 없어.');
   const att=attSnap.data().data;if(!Array.isArray(att?.members)||!Array.isArray(att?.sessions))throw Error('출석 형식 확인 실패');
   let rw=null;
   if(page!=='stats'){
    const rewardSnap=await read(refs.rewards);if(rewardSnap.exists()){rw=rewardSnap.data().data;if(!Array.isArray(rw?.requests))throw Error('보상 장부 형식 확인 실패')}
   }
   window.dispatchEvent(new CustomEvent('party-cloud-analytics',{detail:{attendance:att,rewards:rw,attendanceRevision:attSnap.data().revision,rewardsReady:!!rw}}));
   if(!watching){
    watching=true;onSnapshot(refs.attendance,()=>reload(),e=>{msg.textContent='Firebase 출석 실시간 감시 오류: '+(e.code||e.message)});
    if(page!=='stats')onSnapshot(refs.rewards,()=>reload(),e=>{msg.textContent='Firebase 보상 실시간 감시 오류: '+(e.code||e.message)});
   }
  }catch(e){msg.textContent='⚠️ Firebase 자료 확인 실패: '+(e.code||e.message)+' · 기존 PC 장부로 자동 대체하지 않아.';}
 };
 await waitAuth();await reload();
 if(page==='stats'||page==='priority'){
  const button=$('refresh')||$('reload');button?.addEventListener('click',e=>{e.stopImmediatePropagation();reload()},true);
 }
 if(page==='dashboard')$('partyDashRefresh')?.addEventListener('click',e=>{e.stopImmediatePropagation();reload()},true);
 // All server reads after auth. No non-admin exposure of guild-private data.
}
start();
