// Publish draw results to an independent public document; explicit admin action only.
import {db,refs,isAdmin,waitAuth,login,read,runTransaction,serverTimestamp,asJSON} from './party-firebase-shared.js';
const $=id=>document.getElementById(id),status=$('partyLotteryAdminStatus'),btn=$('partyLotteryPublish');let revision=null,blocked=false;
const note=(t,bad=false)=>{status.textContent=t;status.style.color=bad?'#ffafa8':'#b8e8c2'};
const editor=()=>window.PARTY_LOTTERY_EDITOR;
function guard(){if(!editor()){note('추첨 편집기를 초기화할 수 없어.',true);blocked=true;return false}return true}
async function statusCheck(){
 if(!isAdmin())return note('문주 Google 로그인 필요. 저장 기능은 잠겨 있어.');
 try{const snap=await read(refs.draws);revision=snap.exists()?snap.data().revision:0;if(!Number.isSafeInteger(revision)||revision<0)throw Error('문서 버전 형식 오류');
  if(snap.exists()){
   const cloud=snap.data().data;if(!Array.isArray(cloud))throw Error('결과 목록 형식 오류');
   if(!guard())return;
   const old=editor().get();const extra=old.filter(x=>!cloud.some(y=>y.started_at_kst===x.started_at_kst));
   if(extra.length){blocked=true;btn.disabled=true;note('⚠️ 지금 GitHub 공개 파일에 Firebase에 없는 결과가 있어. 자동 덮어쓰기를 차단했어. 현 상태를 백업하고 정리해야 해.',true);return;}
   editor().set(cloud);note('✅ Firebase 추첨 결과 '+cloud.length+'건 읽음 · 서버 버전 '+revision+' · 편집 및 게시 가능');
  }else note('Firebase 당첨 결과 게시물이 없어. 현재 공개된 GitHub 파일의 결과를 기준으로 최초 게시할 수 있어.');
  document.querySelector('main.wrap').inert=false;btn.disabled=false;
 }catch(e){blocked=true;note('Firebase 결과 조회 실패: '+(e.code||e.message),true)}
}
$('partyLotteryLogin').onclick=async()=>{try{await login();await statusCheck()}catch(e){note('로그인 실패: '+(e.code||e.message),true)}};
$('partyLotteryCheck').onclick=statusCheck;
btn.onclick=async()=>{
 if(!isAdmin()||blocked||revision===null||!guard())return;
 const items=editor().get();if(!Array.isArray(items)||!items.length)return note('게시할 추첨 결과가 없어. 빈 목록으로 덮어쓰지 않아.',true);
 if(new Blob([JSON.stringify(items)]).size>650000)return note('당첨 결과가 너무 커. 별도 분할이 필요해.',true);
 if(!confirm(`Firebase 공개 결과 게시\n결과 ${items.length}건 / 현재 서버 버전 ${revision}\n기존 GitHub 결과 파일은 삭제하지 않아. 계속할까?`))return;
 btn.disabled=true;
 try{
  const prev=revision;
  await runTransaction(db,async tx=>{const s=await tx.get(refs.draws);if((s.exists()?s.data().revision:0)!==prev)throw Error('다른 탭의 변경을 감지했어. 덮어쓰기 중단.');tx.set(refs.draws,{format:'party-lottery-results-v1',revision:prev+1,data:asJSON(items),updatedAt:serverTimestamp()})});
  const check=await read(refs.draws);if(!check.exists()||check.data().revision!==prev+1)throw Error('Firebase 재조회에서 새 버전이 확인되지 않아.');
  revision=prev+1;note('✅ Firebase 행운의전당 당첨 결과 게시 완료 · 버전 '+revision+' · 공개 페이지 자동 갱신');
 }catch(e){blocked=true;note('게시 중단: '+(e.code||e.message)+' · 다시 게시하기 전에 화면을 새로 열어 자료를 비교해 줘.',true)}finally{btn.disabled=blocked}
};
(document.querySelector('main.wrap')||document.body).inert=true;
await waitAuth();if(isAdmin())await statusCheck();else note('문주 관리자 로그인 후 Firebase 결과를 확인할 수 있어.');
