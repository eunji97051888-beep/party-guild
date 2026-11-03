// PARTY Guild Firebase balances admin: never silently republish stale GitHub balances over live Firebase.
import {db,refs,isAdmin,waitAuth,login,read,runTransaction,serverTimestamp,asJSON} from './party-firebase-shared.js';
const $=id=>document.getElementById(id),status=$('status'),file=$('file');
let revision=null,candidate=null,serverData=null,locked=false,fileChosen=false;
const staticCandidate=window.PARTY_LOTTERY_BALANCES||null;
const note=(s,bad=false)=>{status.textContent=s;status.style.color=bad?'#ffaaa7':'#bde7ca'};
function validate(x){
 if(!x||x.schema_version!==1||!Array.isArray(x.members)||!x.members.length||x.members.length>500||typeof x.currency!=='string'||!Number.isSafeInteger(x.total_pending_coins)||x.total_pending_coins<0)throw Error('킵 잔액 자료 형식이 올바르지 않아.');
 let sum=0;const names=new Set();
 for(const m of x.members){
  if(typeof m.name!=='string'||!m.name.trim()||names.has(m.name)||!['awarded_coins','paid_coins','pending_coins'].every(k=>Number.isSafeInteger(m[k])&&m[k]>=0)||m.pending_coins!==m.awarded_coins-m.paid_coins)throw Error('킵 잔액 인원·계산 오류');
  sum+=m.pending_coins;names.add(m.name);
 }
 if(sum!==x.total_pending_coins)throw Error('이월 잔액 합계가 맞지 않아.');
 return asJSON(x);
}
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
function preview(){
 try{
  const x=validate(candidate);
  const source=fileChosen?'직접 선택한 새 파일':revision>0?'Firebase 현재 서버 원본':'GitHub 기존 공개 파일';
  $('preview').textContent=`${source}: ${x.members.length}명 · 미지급 합계 ${x.total_pending_coins.toLocaleString('ko-KR')} 주화 · 파일 기준 ${x.exported_at_kst||'미기록'}`;
  // Already-published data is for viewing, not a candidate for a new publish.
  $('publish').disabled=revision===null||locked||!isAdmin()||(revision>0&&!fileChosen)||(revision>0&&serverData&&same(serverData,x));
 }catch(e){$('preview').textContent='자료 확인 필요: '+e.message;$('publish').disabled=true;}
}
async function check(){
 if(!isAdmin())return note('먼저 문주 Google 로그인해 줘.');
 try{
  const s=await read(refs.balances);revision=s.exists()?s.data()?.revision:0;
  if(!Number.isSafeInteger(revision)||revision<0)throw Error('버전 정보 오류');
  serverData=s.exists()?validate(s.data().data):null;
  if(!fileChosen)candidate=serverData||staticCandidate;
  if(serverData){
   note(`✅ Firebase 현재 공개 킵 잔액 버전 ${revision} · ${serverData.members.length}명 · 미지급 ${serverData.total_pending_coins.toLocaleString('ko-KR')} 주화.\n현재 서버 원본을 기본으로 보여줘. 다음 게시를 하려면 반드시 변경된 최신 파일을 직접 선택해 줘.`);
  }else note('Firebase 공개 킵 잔액 문서가 없어. 기존 GitHub 공개 장부를 검토해 최초 게시할 수 있어.');
  preview();
 }catch(e){locked=true;note('조회 중단: '+(e.code||e.message),true);preview();}
}
$('login').onclick=async()=>{try{await login();await check()}catch(e){note('로그인 실패: '+(e.code||e.message),true)}};
$('check').onclick=check;
file.onchange=async()=>{
 try{
  const f=file.files?.[0];if(!f)return;
  if(f.size>600000)throw Error('파일이 너무 커.');
  let t=await f.text();
  if(f.name.toLowerCase().endsWith('.js')){
   const match=t.match(/^\s*window\.PARTY_LOTTERY_BALANCES\s*=\s*([\s\S]*?)\s*;?\s*$/);
   if(!match)throw Error('lottery-balances-data.js 파일 형식이 아니야.');
   t=match[1].trim().replace(/;\s*$/,'');
  }
  const next=validate(JSON.parse(t));
  if(serverData&&same(serverData,next))throw Error('서버 기록과 동일한 자료야. 다시 게시할 필요 없어.');
  if(serverData&&next.exported_at_kst&&serverData.exported_at_kst&&next.exported_at_kst<serverData.exported_at_kst)throw Error('서버보다 오래된 킵 장부야. 덮어쓰지 않을게.');
  candidate=next;fileChosen=true;preview();
  note('✅ 선택한 새 킵 잔액 파일 검증 완료 · Firebase 게시 버튼을 눌러야 반영돼.');
 }catch(e){candidate=serverData||staticCandidate;fileChosen=false;preview();note('파일 오류/게시 차단: '+e.message,true)}
};
$('publish').onclick=async()=>{
 if(!isAdmin()||revision===null||locked||(revision>0&&!fileChosen))return;
 try{
  const x=asJSON(validate(candidate));
  if(serverData&&same(serverData,x))throw Error('현재 서버와 동일한 장부야.');
  if(serverData&&x.exported_at_kst&&serverData.exported_at_kst&&x.exported_at_kst<serverData.exported_at_kst)throw Error('서버보다 오래된 파일로는 게시할 수 없어.');
  if(!confirm(`Firebase 공개 킵 잔액 게시\n${x.members.length}명 · ${x.total_pending_coins} 주화\n서버 버전 ${revision} → ${revision+1}\n기존 GitHub 파일과 서버 변경 전 자료는 삭제하지 않아. 게시할까?`))return;
  $('publish').disabled=true;
  const base=revision;
  await runTransaction(db,async tx=>{
   const s=await tx.get(refs.balances);
   if((s.exists()?s.data().revision:0)!==base)throw Error('다른 탭에서 장부가 변경됐어.');
   tx.set(refs.balances,{format:'party-lottery-balances-v1',revision:base+1,data:x,updatedAt:serverTimestamp()});
  });
  const snap=await read(refs.balances);
  if(!snap.exists()||snap.data().revision!==base+1||!same(snap.data().data,x))throw Error('서버 재조회 자료 불일치');
  revision=base+1;serverData=x;fileChosen=false;candidate=x;file.value='';
  note('✅ Firebase 킵 잔액 게시·서버 재조회 완료 · 버전 '+revision);preview();
 }catch(e){locked=true;preview();note('게시 실패/중단: '+(e.code||e.message)+' · 추가 저장 전에 서버 자료를 비교해 줘.',true)}
};
await waitAuth();if(isAdmin())await check();else note('Google 관리자 로그인 필요.');
