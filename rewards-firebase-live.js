// Firebase rewards ledger. Write access is limited to the administrator by Firestore rules.
// Never overwrites guildPrivate/rewardsBackup or the legacy browser ledger.
import {auth,db,refs,isAdmin,waitAuth,login,read,runTransaction,serverTimestamp,asJSON} from './party-firebase-shared.js';
const $=id=>document.getElementById(id),app=window.PARTY_REWARDS_APP;
const draftKey='party-guild-rewards-live-draft-v1',oldKey='party-guild-v12-rewards';
let rev=0,ready=false,locked=false,saving=false,pending=null,seq=0,storedSeq=0,legacyConflict=false,legacyData=null;
const controls=$('partyRewardsCloudControls'),status=$('partyRewardsCloudStatus'),source=$('partyRewardsImportFile');
const start=$('partyRewardsStart'),check=$('partyRewardsCheck'),backup=$('partyRewardsBackupDraft');
const btns=()=>{start.disabled=ready||locked||!isAdmin();check.disabled=ready||locked||!isAdmin();backup.disabled=!localStorage.getItem(draftKey)};
const note=(m,bad=false)=>{status.textContent=m;status.style.color=bad?'#ffb3ae':'#bbe5ce';};
const download=(value,name)=>{const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000)};
function validate(data){return app.validate(data)}
function freeze(message){ready=false;locked=true;app.lock();note('⛔ '+message+'\n변경 중 초안은 백업할 수 있어. 기존 Firebase 데이터를 강제로 덮어쓰지 않았어.',true);btns()}
function loadServer(v){app.set(v);ready=true;locked=false;app.unlock();note(`✅ Firebase 보상 장부 연결 완료 · 서버 버전 ${rev}\n이 화면에서 수정하면 Firebase에 자동 저장돼.`);btns()}
async function begin(){
 if(!isAdmin())return note('문주 계정으로 Google 로그인해 줘.',true);
 try{
  const [a,r]=await Promise.all([read(refs.attendance),read(refs.rewards)]);
  if(!a.exists()||!Array.isArray(a.data()?.data?.members))throw Error('Firebase 출석 원본을 읽을 수 없어.');
  app.setAttendance(a.data().data);
  if(r.exists()){
   const v=r.data();if(!Number.isSafeInteger(v.revision)||v.revision<1)throw Error('Firebase 보상 장부 버전이 예상과 달라.');
   const docData=validate(v.data);rev=v.revision;
   const draft=localStorage.getItem(draftKey);
   const canon=x=>Array.isArray(x)?x.map(canon):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canon(x[k])])):x;
   if(draft&&JSON.stringify(canon(validate(JSON.parse(draft))))!==JSON.stringify(canon(docData))){
    note('⚠️ 이 PC에 서버와 다른 미동기화 보상 초안이 있어. 강제 덮어쓰지 않을게. 우선 초안을 백업해 줘.',true);app.lock();locked=true;btns();return;
   }
   localStorage.removeItem(draftKey);loadServer(docData);return;
  }
  app.lock();ready=false;
  legacyConflict=false;legacyData=null;
  const legacy=await read(refs.legacyRewards);
  if(legacy.exists()&&legacy.data()?.data){legacyData=validate(legacy.data().data);}
  const old=localStorage.getItem(oldKey);
  if(old){
   try{
    const x=validate(JSON.parse(old));
    legacyConflict=!!legacyData&&JSON.stringify(canonComparable(x))!==JSON.stringify(canonComparable(legacyData));
    note(`Firebase 실사용 보상 장부 없음. PC 기록: 재화 ${x.balance}, 아이템 ${x.items.length}, 요청 ${x.requests.length}, 거래 ${x.ledger.length}.\n${legacyConflict?'⚠️ 예전 Firebase 보상 백업과 현재 PC 기록이 달라! 두 파일을 내려받아 비교한 후 사용할 JSON 파일을 선택해 줘.':'기록을 확인한 뒤 최초 등록을 진행해 줘.'} 기존 자료는 삭제하지 않아.`,legacyConflict);
   }catch(e){legacyConflict=!!legacyData;note('PC 보상 장부 확인 실패. 정상 JSON을 선택해 줘.',true)}
  }else{
   legacyConflict=!!legacyData;
   note(legacyData?'예전 Firebase 보상 백업이 있어. 기존 백업을 다운로드한 뒤 최초 등록할 JSON으로 선택해 줘.':'Firebase 보상 장부가 없어. 기존 PC 보상 JSON을 선택해 줘. 빈 장부는 만들지 않아.');
  }
 }catch(e){app.lock();note('Firebase 서버 조회 중단: '+(e.code||e.message),true)}finally{btns()}
}
function canonComparable(x){return Array.isArray(x)?x.map(canonComparable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonComparable(x[k])])):x;}
function localCandidate(){const file=source.files?.[0];return file;}
async function candidate(){if(legacyConflict&&!localCandidate())throw Error('기존 Firebase 백업과 PC 자료가 달라. 먼저 비교하고 등록할 JSON 파일을 선택해 줘.');let data;if(localCandidate()){const f=localCandidate();if(f.size>650000)throw Error('파일이 너무 커.');data=JSON.parse(await f.text());}else{const old=localStorage.getItem(oldKey);if(!old)throw Error('현재 PC에 보상 장부가 없어. 보상 JSON 파일을 선택해 줘.');data=JSON.parse(old);}return validate(data)}
start.onclick=async()=>{
 if(!isAdmin()||locked)return;
 start.disabled=true;
 try{
  const record=await candidate();
  if(!record.items.length&&!record.requests.length&&!record.ledger.length&&record.balance===0)throw Error('빈 보상 장부의 최초 등록은 중단했어.');
  const report=`게임 재화 ${record.balance}\n아이템 ${record.items.length}건 / 요청 ${record.requests.length}건 / 거래 ${record.ledger.length}건`;
  if(!confirm('Firebase에 보상 장부를 최초 등록할까?\n\n'+report+'\n\n기존 보상 PC 기록과 Firebase 기존 백업은 수정하지 않아.'))return;
  // Download a recovery copy; never silently mutate old browser record.
  download(record,'party-rewards-before-firebase-initial-'+new Date().toISOString().slice(0,10)+'.json');
  if(!confirm('백업 파일 다운로드를 확인했어?\n확인하지 못했다면 취소해 줘.'))return;
  await runTransaction(db,async tx=>{const s=await tx.get(refs.rewards);if(s.exists())throw Error('다른 곳에서 이미 보상 장부를 만들었어. 덮어쓰기를 차단했어.');tx.set(refs.rewards,{format:'party-rewards-live-v1',revision:1,data:asJSON(record),updatedAt:serverTimestamp()})});
  note('✅ 신규 Firebase 장부 등록 완료. 서버 재조회 중…');await begin();
 }catch(e){note('최초 등록 중단: '+(e.code||e.message),true)}finally{btns()}
};
check.onclick=()=>begin();
$('partyRewardsCloudLogin').onclick=async()=>{try{await login();await begin()}catch(e){note('관리자 로그인 오류: '+(e.code||e.message),true)}};
$('partyRewardsBackupLegacy').onclick=()=>{try{const raw=localStorage.getItem(oldKey);if(raw){const v=validate(JSON.parse(raw));download(v,'party-rewards-original-pc-'+new Date().toISOString().slice(0,10)+'.json')}if(legacyData)download(legacyData,'party-rewards-original-firebase-backup-'+new Date().toISOString().slice(0,10)+'.json');if(!raw&&!legacyData)throw Error('이 PC나 예전 Firebase에는 보상 기록이 없어.');note('기존 보상 기록 다운로드 요청 완료. 파일이 실제 저장됐는지 확인해 줘.')}catch(e){note('기존 백업 다운로드 실패: '+e.message,true)}};
backup.onclick=()=>{try{download(JSON.parse(localStorage.getItem(draftKey)),'party-rewards-unsynced-draft-'+new Date().toISOString().slice(0,10)+'.json');note('초안 백업 다운로드 요청 완료. 다운로드 폴더에서 실제 파일을 확인해 줘.')}catch(e){note('초안 백업 실패: '+e.message,true)}};
async function flush(){
 if(saving||!pending||locked||!ready)return;
 const next=pending;pending=null;const writingSeq=seq;const base=rev;
 saving=true;note('⏳ Firebase 보상 장부에 저장 중…');
 try{
  const data=validate(next);if(new Blob([JSON.stringify(data)]).size>650000)throw Error('장부가 650KB 이상이라 저장을 중단했어.');
  await runTransaction(db,async tx=>{const snap=await tx.get(refs.rewards);if(!snap.exists()||snap.data().revision!==base)throw Error('다른 탭에서 보상 장부가 변경됐어. 자동 덮어쓰기 방지.');tx.set(refs.rewards,{format:'party-rewards-live-v1',revision:base+1,data:asJSON(data),updatedAt:serverTimestamp()})});
  rev=base+1;storedSeq=writingSeq;
  const verify=await read(refs.rewards);
  if(!verify.exists()||verify.data().revision!==rev||JSON.stringify(verify.data().data)!==JSON.stringify(data)){
   // Firestore field order is not significant, so deep canonical compare below.
   const norm=x=>Array.isArray(x)?x.map(norm):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,norm(x[k])])):x;
   if(!verify.exists()||verify.data().revision!==rev||JSON.stringify(norm(verify.data().data))!==JSON.stringify(norm(data)))throw Error('서버 재조회와 저장 자료가 달라.');
  }
  if(!pending&&seq===writingSeq){localStorage.removeItem(draftKey);note('✅ Firebase 보상 자동 저장·서버 재조회 완료 · 버전 '+rev);$('saveMsg').textContent='✅ Firebase 저장 완료';}
 }catch(e){freeze('보상 저장 중단: '+(e.code||e.message))}
 finally{saving=false;btns();if(pending&&!locked)queueMicrotask(flush)}
}
window.PARTY_REWARDS_CLOUD={isReady:()=>ready&&!locked,enqueue(data){if(!ready||locked)return false;try{const clean=asJSON(validate(data));localStorage.setItem(draftKey,JSON.stringify(clean));pending=clean;seq++;$('saveMsg').textContent='Firebase 저장 대기';note('변경 중 · Firebase 저장 예약됨');btns();queueMicrotask(flush);return true}catch(e){freeze('보상 초안 저장 실패: '+e.message);return false}}};
window.addEventListener('beforeunload',e=>{if(localStorage.getItem(draftKey)){e.preventDefault();e.returnValue='';}});
await waitAuth();if(isAdmin())await begin();else note('문주 Google 로그인 후 서버 장부를 확인해 줘. 기존 PC 보상 기록을 자동으로 덮어쓰지 않아.');btns();
