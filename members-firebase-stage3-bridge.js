// 파티 출석 3단계 - 운영 분리 시험본
// 운영 사이트의 localStorage key 및 Firestore 문서에는 절대 쓰지 않음.
import {initializeApp, getApps} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import {getFirestore,doc,getDocFromServer,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
const cfg={apiKey:'AIzaSyD_JzuNnKKuc-NU26KatxO2jqZCUVAebPE',authDomain:'party-guild.firebaseapp.com',projectId:'party-guild',storageBucket:'party-guild.firebasestorage.app',messagingSenderId:'465332308360',appId:'1:465332308360:web:50b5663dc1563df3d6923d'};
const ADMIN='KkmihHrjJ3X82JLrdzymrkEUZyE3';
const LOCAL_KEY='party-guild-firebase-stage3-draft-20261103';
const DIRTY_KEY='party-guild-firebase-stage3-unsynced-20261103';
const app=getApps().find(x=>x.name==='party-attendance-stage3')||initializeApp(cfg,'party-attendance-stage3');
const auth=getAuth(app), db=getFirestore(app);
const source=doc(db,'guildPrivate','attendanceStaging_20261103');
const sandbox=doc(db,'guildPrivate','attendanceEditorSandbox_20261103');
const $=id=>document.getElementById(id), stat=$('s3Status');
let exists=null, checked=false, opened=false, busy=false, blocked=false, revision=0;
let pending=null, writing=false, timer=null, latestWrite=0;
const admin=()=>auth.currentUser?.uid===ADMIN;
const msg=t=>{stat.textContent=t;};
const count=d=>`${d.members?.length||0}명 / ${d.sessions?.length||0}회차`;
const deepCopy=x=>JSON.parse(JSON.stringify(x));
function validate(d){
 if(!d||d.version!==1||!Array.isArray(d.members)||!Array.isArray(d.sessions)||!d.attendance||typeof d.attendance!=='object'||!d.participationModes||typeof d.participationModes!=='object')throw Error('출석 데이터 형식 오류');
 const ids=new Set(d.members.map(m=>m.id)),sessions=new Set(d.sessions.map(s=>s.id));
 if(ids.size!==d.members.length||sessions.size!==d.sessions.length||d.members.length>500||d.sessions.length>5000)throw Error('인원·회차 또는 중복 ID 오류');
 for(const [sid, rows] of Object.entries(d.attendance)){
  if(!sessions.has(sid)||!rows||typeof rows!=='object')throw Error('회차 출석 연결 오류');
  for(const id of Object.keys(rows))if(!ids.has(id))throw Error('문파원 출석 연결 오류');
 }
 return d;
}
const canon=x=>Array.isArray(x)?x.map(canon):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canon(x[k])])):x;
const same=(a,b)=>JSON.stringify(canon(a))===JSON.stringify(canon(b));
function controls(){
 $('s3Login').disabled=busy||opened||!!auth.currentUser;
 $('s3Check').disabled=busy||opened||!admin();
 $('s3Create').disabled=busy||opened||!admin()||!checked||exists!==false;
 $('s3Open').disabled=busy||opened||!admin()||!checked||exists!==true;
 $('s3Backup').disabled=!localStorage.getItem(LOCAL_KEY);
}
function loadClassicScript(name){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=name;s.onload=resolve;s.onerror=()=>reject(Error(name+' 로드 실패'));document.body.append(s)})}
function backup(){const raw=localStorage.getItem(LOCAL_KEY);if(!raw){msg('시험 초안이 없어.');return}
 const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(JSON.parse(raw),null,2)],{type:'application/json'}));a.href=url;a.download='party-attendance-stage3-unsynced-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)}
$('s3Backup').onclick=backup;
onAuthStateChanged(auth,user=>{
 if(opened&&!admin()){blocked=true;document.querySelector('main.shell').inert=true;msg('관리자 로그인 상태가 변경됐어. 시험 편집 잠금. 초안 백업 후 다시 시작해 줘.');}
 else if(admin())msg('✓ 관리자 인증 완료. 시험 문서 조회 버튼을 눌러 줘.');
 else msg(user?'이 계정은 관리자가 아니야.':'Google 로그인해 줘.');
 exists=null;checked=false;controls();
});
$('s3Login').onclick=async()=>{try{busy=true;controls();await signInWithPopup(auth,new GoogleAuthProvider())}catch(e){msg('로그인 실패: '+(e.code||e.message))}finally{busy=false;controls()}};
$('s3Check').onclick=async()=>{
 if(!admin())return;busy=true;controls();
 try{const s=await getDocFromServer(sandbox);exists=s.exists();checked=true;
  msg(exists?'✓ 기존 시험 장부가 있어. 시험 장부 열기를 눌러줘.':'✓ 시험 장부가 아직 없어. 최초 생성 버튼으로 2단계 백업의 복사본을 만들 수 있어.');
 }catch(e){exists=null;checked=false;msg('시험 문서 조회 실패: '+(e.code||e.message)+'\nFirestore 규칙을 바꾸지 말고 알려줘.');}finally{busy=false;controls()}
};
$('s3Create').onclick=async()=>{
 if(!admin()||!checked||exists!==false)return;
 if(!confirm('2단계 검증된 출석 장부를 새로운 Firebase 시험 문서로 복사할까?\n운영 출석과 기존 2단계 백업은 수정하지 않아.'))return;
 busy=true;controls();
 try{
 await runTransaction(db,async tx=>{
  const t=await tx.get(sandbox),s=await tx.get(source);
  if(t.exists())throw Error('시험 문서가 이미 있어. 덮어쓰지 않아.');
  if(!s.exists())throw Error('2단계 원본 백업이 없어.');
  const data=validate(s.data().data);
  if(data.members.length!==55||data.sessions.length!==14)throw Error('2단계 백업 55명/14회차가 아니야.');
  tx.set(sandbox,{revision:1,data:deepCopy(data),createdAt:serverTimestamp(),updatedAt:serverTimestamp(),stage:'isolated-attendance-editor-test'});
 },{maxAttempts:3});
 exists=true;checked=true;msg('✓ Firebase 시험 장부 최초 생성 성공. 이제 시험 장부 열기를 눌러줘.');
 }catch(e){exists=null;checked=false;msg('시험 장부 생성 실패 또는 중복 차단: '+(e.code||e.message)+'\n다시 조회해 줘.');}finally{busy=false;controls()}
};
function scheduleSave(data){
 if(!opened||blocked||!admin())return;
 try{
  pending=deepCopy(validate(data));localStorage.setItem(DIRTY_KEY,'1');latestWrite++;
  msg('🟡 시험 출석 변경됨 · Firebase 자동 저장 대기 중…');
  clearTimeout(timer);timer=setTimeout(flush,700);
 }catch(e){blocked=true;document.querySelector('main.shell').inert=true;msg('데이터 검증 실패. 편집 잠금: '+e.message+'\n상단에서 시험 초안을 백업해 줘.');}
 controls();
}
async function flush(){
 if(writing||!pending||blocked||!admin())return;
 const data=pending;pending=null;const writeNo=latestWrite;
 writing=true;msg('⏳ Firebase 시험 문서에 저장 중…');
 try{
  const rev=revision;
  await runTransaction(db,async tx=>{
   const snap=await tx.get(sandbox);
   if(!snap.exists())throw Error('시험 문서가 삭제됐어.');
   const cloud=snap.data();if(cloud.revision!==rev)throw Error('다른 탭/기기에서 시험 문서가 변경됐어. 자동 덮어쓰기를 중단했어.');
   tx.update(sandbox,{data,revision:rev+1,updatedAt:serverTimestamp()});
  },{maxAttempts:1});
  revision=rev+1;
  // Force a new server read; never claim success based only on the write acknowledgement.
  const read=await getDocFromServer(sandbox);
  if(!read.exists()||read.data().revision!==revision||!same(read.data().data,data))throw Error('서버 재조회 결과 불일치 또는 버전 변경');
  if(!pending&&writeNo===latestWrite){localStorage.removeItem(DIRTY_KEY);msg('✅ Firebase 시험 문서 자동 저장·서버 재조회 완료 · 버전 '+revision);}
  else msg('✓ 이전 변경 저장 완료 · 다음 변경 자동 저장 대기 중…');
 }catch(e){
  blocked=true;pending=data;
  document.querySelector('main.shell').inert=true;
  msg('🔴 Firebase 자동 저장 실패/충돌: '+(e.code||e.message)+'\n시험 편집을 잠갔어. 상단의 시험 초안 JSON 백업을 먼저 받아 줘. 운영 데이터는 영향 없어.');
 }finally{writing=false;controls();if(pending&&!blocked){clearTimeout(timer);timer=setTimeout(flush,200)}}
}
window.PARTY_STAGE3_SYNC=scheduleSave;
$('s3Open').onclick=async()=>{
 if(!admin()||!checked||exists!==true||opened)return;
 busy=true;controls();
 try{
  const docSnap=await getDocFromServer(sandbox);
  if(!docSnap.exists())throw Error('시험 문서가 없어.');
  const payload=docSnap.data(),data=validate(payload.data);
  if(!Number.isSafeInteger(payload.revision)||payload.revision<1)throw Error('시험 문서 버전 오류');
  if(localStorage.getItem(DIRTY_KEY)==='1'){
   msg('⚠ 이전 시험 편집에서 Firebase에 보내지 못한 로컬 초안이 있어. 먼저 위의 시험 초안 JSON 백업을 내려받아 줘.\n이 상태에서는 자동으로 다른 자료로 덮지 않아.');
   if(!confirm('미동기화 시험 초안이 남아 있어!\n미리 별도로 JSON 백업을 받았고, 미동기화 초안을 버리고 Firebase 시험 장부로 다시 시작할까?'))return;
  }
  revision=payload.revision;
  localStorage.setItem(LOCAL_KEY,JSON.stringify(deepCopy(data)));
  localStorage.removeItem(DIRTY_KEY);
  await loadClassicScript('members-firebase-stage3-editor.js?v=1');
  opened=true;document.body.classList.add('stage3-ready');
  msg(`✅ Firebase 시험 장부 불러오기 성공 · ${count(data)} · 버전 ${revision}\n아래에서 시험용 출석을 수정하면 0.7초 후 Firebase 시험 문서에 자동 저장해. 실제 운영 장부에는 영향이 없어.`);
 }catch(e){msg('시험 장부 열기 실패: '+(e.code||e.message))}finally{busy=false;controls()}
};
window.addEventListener('beforeunload',e=>{if(localStorage.getItem(DIRTY_KEY)==='1'){e.preventDefault();e.returnValue='';}});
controls();
