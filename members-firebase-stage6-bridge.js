// PARTY · Firebase attendance stage 5: two-document atomic sandbox sync.
// ONLY: guildPrivate/attendanceLiveV1
//       publicContent/attendancePublicLiveV1
// Operates on new pre-launch documents; pre-existing production HTML and old localStorage remain unchanged.
import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import {getFirestore,doc,getDocFromServer,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
const firebaseConfig={apiKey:'AIzaSyD_JzuNnKKuc-NU26KatxO2jqZCUVAebPE',authDomain:'party-guild.firebaseapp.com',projectId:'party-guild',storageBucket:'party-guild.firebasestorage.app',messagingSenderId:'465332308360',appId:'1:465332308360:web:50b5663dc1563df3d6923d'};
const ADMIN_UID='KkmihHrjJ3X82JLrdzymrkEUZyE3';
const LOCAL_KEY='party-guild-firebase-stage6-draft-20261103';
const DIRTY_KEY='party-guild-firebase-stage6-unsynced-20261103';
const app=getApps().find(a=>a.name==='party-attendance-stage6')||initializeApp(firebaseConfig,'party-attendance-stage6');
const auth=getAuth(app),db=getFirestore(app);
const privateRef=doc(db,'guildPrivate','attendanceLiveV1');
const publicRef=doc(db,'publicContent','attendancePublicLiveV1');
const $=id=>document.getElementById(id);
const status=$('s6Status');
const importStatus=$('s6ImportStatus');
let busy=false,opened=false,blocked=false,checked=false,revision=0,publicRevision=0,emptyConfirmed=false,importData=null;
let writing=false,pending=null,timer=null,latestWrite=0,backedUp=false,knownPublicHash='';
const admin=()=>auth.currentUser?.uid===ADMIN_UID;
const setStatus=message=>{status.textContent=message;};
function pill(text,isError=false){const e=$('saveStatus');if(!e)return;e.textContent=text;e.style.color=isError?'#ffaaa7':'#c9efce';}
const clone=x=>JSON.parse(JSON.stringify(x));
function validate(data){
 if(!data||data.version!==1||!Array.isArray(data.members)||!Array.isArray(data.sessions)||!data.attendance||typeof data.attendance!=='object'||Array.isArray(data.attendance)||!data.participationModes||typeof data.participationModes!=='object'||Array.isArray(data.participationModes))throw Error('출석 장부 형식이 잘못됐어.');
 const ids=new Set(),sessions=new Set();
 if(data.members.length<1||data.members.length>500||data.sessions.length<14||data.sessions.length>5000)throw Error('인원·회차가 클라우드 장부 예상 범위를 벗어났어.');
 for(const m of data.members){if(!m||typeof m.id!=='string'||!m.id||ids.has(m.id)||typeof m.name!=='string'||!m.name.trim())throw Error('문파원 ID/닉네임 오류');ids.add(m.id);}
 for(const s of data.sessions){if(!s||typeof s.id!=='string'||!s.id||sessions.has(s.id)||typeof s.date!=='string')throw Error('회차 ID/날짜 오류');sessions.add(s.id);}
 for(const [sid,rows] of Object.entries(data.attendance)){
  if(!sessions.has(sid)||!rows||typeof rows!=='object'||Array.isArray(rows))throw Error('출석 회차 연결 오류');
  for(const [id,v] of Object.entries(rows))if(!ids.has(id)||!['present','absent','exempt'].includes(v))throw Error('문파원 출석 연결 오류');
 }
 for(const [sid,rows] of Object.entries(data.participationModes)){
  if(!sessions.has(sid)||!rows||typeof rows!=='object'||Array.isArray(rows))throw Error('참여 방식 연결 오류');
  for(const [id,v] of Object.entries(rows))if(!ids.has(id)||!['direct','auto','clone'].includes(v))throw Error('참여 방식 대상 오류');
 }
 return data;
}
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const publicWithoutTimestamp=payload=>{const {publishedAt,...rest}=payload||{};return rest;};
async function hash(data){const array=new TextEncoder().encode(JSON.stringify(canonical(data)));const bytes=await crypto.subtle.digest('SHA-256',array);return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');}
function publicPayload(raw){
 const payload=window.PARTY_ATTENDANCE_EXPORT?.createPayload(validate(raw));
 if(!payload||payload.version!==2||!Array.isArray(payload.sessions)||payload.sessions.length<14)throw Error('공개 출석 변환에 실패했어.');
 const size=new TextEncoder().encode(JSON.stringify(payload)).length;
 if(size>350000)throw Error('공개 출석 자료가 350KB를 초과해. 분할이 필요해.');
 return payload;
}
function lock(message){
 blocked=true;clearTimeout(timer);
 const main=document.querySelector('main.shell');if(main)main.inert=true;
 setStatus('🔴 '+message+'\n편집이 잠겼어. 상단의 클라우드 초안 JSON 백업을 먼저 받아 줘. 기존 운영 URL은 변경되지 않아.');
 pill('충돌/오류 · 편집 잠금',true);controls();
}
function controls(){
 $('s6Login').disabled=busy||opened||!!auth.currentUser;
 $('s6Check').disabled=busy||opened||!admin();
 $('s6Open').disabled=busy||opened||!checked||!admin();
 $('s6Backup').disabled=!localStorage.getItem(LOCAL_KEY);
 $('s6Init').disabled=busy||opened||!admin()||!emptyConfirmed||!importData;
 $('s6JsonInput').disabled=busy||opened;
}
function backup(){
 const raw=localStorage.getItem(LOCAL_KEY);if(!raw){setStatus('백업할 클라우드 초안이 없어.');return;}
 try{const json=JSON.stringify(JSON.parse(raw),null,2),url=URL.createObjectURL(new Blob([json],{type:'application/json;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='party-attendance-stage6-test-backup-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
  backedUp=true;setStatus('✓ 클라우드 초안 JSON 백업 다운로드 요청 완료. 브라우저 다운로드 목록에서 실제 파일이 저장됐는지 확인해 줘.');
 }catch(e){setStatus('백업 실패: '+e.message);}
}
$('s6Backup').onclick=backup;
function classic(name){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=name;s.onload=resolve;s.onerror=()=>reject(Error('클라우드 편집기 파일을 불러올 수 없어: '+name));document.body.append(s);});}
async function getAndCheck(){
 const [pr,pu]=await Promise.all([getDocFromServer(privateRef),getDocFromServer(publicRef)]);
 if(!pr.exists())throw Error('새 출석 원본 문서가 없어. 새로 만들거나 복원하지 않아.');
 if(!pu.exists())throw Error('공개 전환 준비 문서가 없어. 원본과 공개 문서를 모두 확인해 줘.');
 const a=pr.data(),b=pu.data();
 if(!Number.isSafeInteger(a.revision)||a.revision<1||!Number.isSafeInteger(b.revision)||b.revision<1||b.format!=='party-attendance-public-v2')throw Error('전환 준비 문서의 버전 또는 형식이 예상과 달라.');
 const raw=validate(a.data),preview=publicPayload(raw),rawHash=await hash(raw);
 if(b.sourceRevision!==a.revision||b.sourceDataHash!==rawHash||!equal(publicWithoutTimestamp(b.payload),publicWithoutTimestamp(preview)))throw Error('새 출석 원본과 공개 전환 준비 문서가 달라. 기존 데이터가 서로 달라 최초 등록이나 수정을 중단했어. 절대 자동 덮어쓰지 않아.');
 return {raw,privateRev:a.revision,publicRev:b.revision,rawHash};
}
$('s6JsonInput').onchange=async()=>{
 importData=null;emptyConfirmed=false;checked=false;
 const file=$('s6JsonInput').files?.[0];if(!file){importStatus.textContent='파일을 선택하지 않았어.';controls();return;}
 try{
  if(file.size>750000)throw Error('출석 파일 크기가 750KB를 초과해.');
  const raw=validate(JSON.parse(await file.text()));
  const nov=raw.sessions.filter(s=>s.date==='2026-11-01');
  if(!nov.some(s=>s.content==='요신토벌령')||!nov.some(s=>s.content==='결계지방어'))throw Error('11월 1일 두 콘텐츠 회차가 없어. 최신 백업을 선택해 줘.');
  if(raw.sessions.length<14||raw.members.length<55)throw Error('최신 14회차 또는 55명 기록보다 적어. 오래된 백업일 수 있어.');
  const rawHash=await hash(raw),output=publicPayload(raw);
  const tickets=output.sessions.reduce((n,s)=>n+s.members.reduce((a,m)=>a+(m.tickets||0),0),0);
  importData={raw,rawHash};
  importStatus.textContent=`✓ 서버에 아직 전송하지 않았어. ${file.name}\n등록 ${raw.members.length}명 · ${raw.sessions.length}회차 · 추첨권 전체 ${tickets}장\n원본 검증값 SHA-256: ${rawHash.slice(0,22)}…\n다음으로 '두 Firebase 문서 상태 확인'을 눌러 줘.`;
 }catch(e){importStatus.textContent='🔴 파일 검사 중단: '+e.message;}
 controls();
};
$('s6Init').onclick=async()=>{
 if(!admin()||busy||opened||!emptyConfirmed||!importData)return;
 const {raw,rawHash}=importData;
 if(!confirm(`새 Firebase 출석 관리 장부와 공개 문서를 *최초 1회 생성*할까?\n\n문파원 ${raw.members.length}명 / ${raw.sessions.length}회차\n\n기존 홈페이지·브라우저 출석·3~5단계 시험문서는 수정하지 않아.\n이 새 공개 준비 URL을 아는 사람은 닉네임·출석 상태를 볼 수 있어.`))return;
 busy=true;checked=false;emptyConfirmed=false;controls();
 try{
  const payload=publicPayload(raw);
  await runTransaction(db,async tx=>{
   const a=await tx.get(privateRef),b=await tx.get(publicRef);
   if(a.exists()||b.exists())throw Error('이미 Firebase 장부가 생성됐어. 최초 등록을 중단했어. 다시 상태를 확인해 줘.');
   tx.set(privateRef,{revision:1,data:raw,schemaVersion:1,createdFrom:'approved-local-json',updatedAt:serverTimestamp()});
   tx.set(publicRef,{format:'party-attendance-public-v2',revision:1,sourceRevision:1,sourceDataHash:rawHash,payload,updatedAt:serverTimestamp()});
  },{maxAttempts:1});
  const [a,b]=await Promise.all([getDocFromServer(privateRef),getDocFromServer(publicRef)]);
  if(!a.exists()||!b.exists()||a.data().revision!==1||b.data().revision!==1||b.data().sourceRevision!==1||b.data().sourceDataHash!==rawHash||!equal(a.data().data,raw)||!equal(b.data().payload,payload))throw Error('저장은 요청됐지만 서버 재조회 검증이 통과하지 않았어. 더 이상 저장하지 말고 화면을 보내줘.');
  checked=true;revision=1;publicRevision=1;knownPublicHash=rawHash;
  setStatus(`✅ Firebase 신규 장부 최초 등록 및 서버 재조회 일치\n${raw.sessions.length}회차 · 관리자/공개 각 버전 1\n이제 Firebase 편집기를 열 수 있어.`);
  importStatus.textContent='✓ 최초 등록 완료 · 재등록 및 덮어쓰기 차단됨';
 }catch(e){setStatus('🔴 최초 등록 결과 확인 필요: '+(e.code||e.message)+'\n반복 등록하지 말고 문서 상태 확인부터 다시 눌러 줘.');}
 finally{busy=false;controls();}
};
onAuthStateChanged(auth,user=>{
 if(opened&&!admin())lock('로그인 계정이 변경되어 시험 편집을 중지했어.');
 else if(!opened){checked=false;emptyConfirmed=false;setStatus(admin()?'✓ 관리자 인증 완료. 두 전환 준비 문서 상태 확인을 눌러 줘.':user?'이 계정은 문주 관리자 UID가 아니야.':'Google 관리자 로그인이 필요해.');}
 controls();
});
$('s6Login').onclick=async()=>{busy=true;controls();try{await signInWithPopup(auth,new GoogleAuthProvider())}catch(e){setStatus('로그인 실패: '+(e.code||e.message))}finally{busy=false;controls();}};
$('s6Check').onclick=async()=>{
 if(!admin()||opened)return;busy=true;checked=false;emptyConfirmed=false;controls();
 try{
  const [a,b]=await Promise.all([getDocFromServer(privateRef),getDocFromServer(publicRef)]);
  if(!a.exists()&&!b.exists()){
   emptyConfirmed=true;setStatus('✓ 새 Firebase 출석 문서 2개 모두 비어 있어. 최신 JSON 파일을 선택한 뒤 최초 등록할 수 있어.');
  }else if(a.exists()&&b.exists()){
   const result=await getAndCheck();checked=true;revision=result.privateRev;publicRevision=result.publicRev;knownPublicHash=result.rawHash;
   setStatus(`✅ 새 Firebase 관리자·공개 장부 서로 일치\n관리자 버전 ${revision} · 공개 버전 ${publicRevision} · ${result.raw.sessions.length}회차\n이제 Firebase 편집기 열기를 눌러 줘. 기존 운영 페이지는 여전히 그대로야.`);
  }else throw Error('두 문서 중 하나만 존재해. 안전을 위해 저장을 중단했어.');
 }catch(e){setStatus('🔴 상태 확인 중단: '+(e.code||e.message)+'\n어떤 문서도 수정하지 않았어.');}
 finally{busy=false;controls();}
};
$('s6Open').onclick=async()=>{
 if(!admin()||!checked||opened)return;busy=true;controls();
 try{
  // Re-check both server documents; do not trust previous button's stale snapshot.
  const src=await getAndCheck();
  if(src.privateRev!==revision||src.publicRev!==publicRevision||src.rawHash!==knownPublicHash)throw Error('확인 후 다른 탭에서 전환 준비 문서가 변경됐어. 상태부터 다시 확인해 줘.');
  if(localStorage.getItem(DIRTY_KEY)==='1'){
   if(!backedUp)throw Error('이 브라우저에 미동기화 클라우드 초안이 있어. 상단에서 JSON을 백업하고 다시 열어 줘.');
   if(!confirm('이전 편집의 미동기화 초안이 남아 있어. JSON 파일 백업을 확인했지?\n초안을 버리고 Firebase 서버의 두 전환 준비 문서에서 다시 시작할까?'))return;
  }
  localStorage.setItem(LOCAL_KEY,JSON.stringify(clone(src.raw)));
  localStorage.removeItem(DIRTY_KEY);
  await classic('members-firebase-stage6-editor.js?v=stage6-20261103');
  opened=true;document.body.classList.add('stage6-ready');window.dispatchEvent(new Event('focus'));
  setStatus(`✅ 6단계 클라우드 장부 열기 완료 · ${src.raw.members.length}명 / ${src.raw.sessions.length}회차\n클라우드 편집기에서 저장하면 비공개/공개 전환 준비 문서에 동시에 저장돼.\n다른 탭에서 새 Firebase 공개 화면을 열어 두고 확인해 봐.`);
  pill('클라우드 장부 준비 · 자동 동기화');
 }catch(e){checked=false;setStatus('편집기 열기 중단: '+(e.code||e.message)+'\n데이터를 덮어쓰지 않았어.');}
 finally{busy=false;controls();}
};
function schedule(data){
 if(!opened||blocked||!admin())return;
 try{
  pending=clone(validate(data));localStorage.setItem(DIRTY_KEY,'1');latestWrite++;
  setStatus('🟡 출석 변경됨 · Firebase 비공개+공개 동시 저장 대기 중…');pill('두 전환 준비 문서 동기화 대기');
  clearTimeout(timer);timer=setTimeout(flush,700);
 }catch(e){lock('편집 데이터 검증 실패: '+e.message);}
 controls();
}
async function flush(){
 if(writing||!pending||blocked||!admin()||!opened)return;
 const data=pending;pending=null;const writeNo=latestWrite;
 writing=true;setStatus('⏳ 두 Firebase 전환 준비 문서에 트랜잭션 저장 중…');pill('Firebase 동기화 중');
 try{
  const expectedPrivate=revision,expectedPublic=publicRevision;
  const output=publicPayload(data),newHash=await hash(data);
  const size=new TextEncoder().encode(JSON.stringify(data)).length;
  if(size>750000)throw Error('비공개 출석 데이터가 750KB를 초과했어. 분할 전에는 저장할 수 없어.');
  await runTransaction(db,async tx=>{
   const a=await tx.get(privateRef),b=await tx.get(publicRef);
   if(!a.exists()||!b.exists())throw Error('출석 원본 또는 공개 문서가 없어졌어.');
   const oldA=a.data(),oldB=b.data();
   if(oldA.revision!==expectedPrivate||oldB.revision!==expectedPublic)throw Error('다른 탭에서 클라우드 장부 또는 공개 문서가 변경됐어. 덮어쓰지 않아.');
   if(oldB.sourceRevision!==expectedPrivate||oldB.sourceDataHash!==knownPublicHash)throw Error('출석 원본과 공개 버전이 예상과 달라. 덮어쓰지 않아.');
   // Integrity verification before any write: ensure the previous public version reflects the previous private version.
   if(await hash(oldA.data)!==knownPublicHash)throw Error('서버의 비공개 출석 데이터가 예상과 달라. 충돌을 막았어.');
   tx.update(privateRef,{revision:expectedPrivate+1,data,updatedAt:serverTimestamp()});
   tx.update(publicRef,{revision:expectedPublic+1,sourceRevision:expectedPrivate+1,sourceDataHash:newHash,payload:output,updatedAt:serverTimestamp()});
  },{maxAttempts:1});
  revision=expectedPrivate+1;publicRevision=expectedPublic+1;knownPublicHash=newHash;
  // Force reads from the backend before reporting success.
  const [a,b]=await Promise.all([getDocFromServer(privateRef),getDocFromServer(publicRef)]);
  if(!a.exists()||!b.exists()||a.data().revision!==revision||b.data().revision!==publicRevision||b.data().sourceRevision!==revision||b.data().sourceDataHash!==newHash||!equal(a.data().data,data)||!equal(b.data().payload,output))throw Error('서버에서 재조회한 출석 원본 또는 공개 문서가 저장 데이터와 일치하지 않아.');
  if(!pending&&writeNo===latestWrite){localStorage.removeItem(DIRTY_KEY);setStatus(`✅ 비공개·공개 전환 준비 문서 동시 저장 성공 / 서버 재조회 일치\n출석 원본 버전 ${revision} · 공개 게시 버전 ${publicRevision} · 공개 화면 자동 갱신됨.`);pill('✅ Firebase 2문서 동기화 완료');}
  else{setStatus(`✓ 앞선 변경 저장 성공(원본 ${revision} / 공개 ${publicRevision}) · 다음 변경 대기 중…`);pill('다음 변경 저장 대기');}
 }catch(e){pending=data;lock('Firebase 동시 저장 실패/충돌: '+(e.code||e.message));}
 finally{writing=false;controls();if(pending&&!blocked){clearTimeout(timer);timer=setTimeout(flush,200);}}
}
window.PARTY_STAGE6_SYNC=schedule;
window.addEventListener('beforeunload',e=>{if(localStorage.getItem(DIRTY_KEY)==='1'){e.preventDefault();e.returnValue='';}});
controls();
