// 파티 문파 안전 복구 2단계. 승인된 관리자가 직접 클릭할 때만
// guildPrivate/attendanceStaging_20261103 에 '없을 때만' 한 번 저장한다.
// 운영 attendanceBackup / 공지 / 공개 출석 / 로컬 저장소를 수정하지 않는다.
import {initializeApp, getApps} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import {getFirestore, doc, getDocFromServer, runTransaction, serverTimestamp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
const cfg={
 apiKey:'AIzaSyD_JzuNnKKuc-NU26KatxO2jqZCUVAebPE',authDomain:'party-guild.firebaseapp.com',projectId:'party-guild',
 storageBucket:'party-guild.firebasestorage.app',messagingSenderId:'465332308360',appId:'1:465332308360:web:50b5663dc1563df3d6923d'
};
const ADMIN_UID='KkmihHrjJ3X82JLrdzymrkEUZyE3';
const DOC_COLLECTION='guildPrivate', DOC_ID='attendanceStaging_20261103';
const app=getApps().find(a=>a.name==='party-attendance-safe-stage2')||initializeApp(cfg,'party-attendance-safe-stage2');
const auth=getAuth(app),db=getFirestore(app),target=doc(db,DOC_COLLECTION,DOC_ID),$=id=>document.getElementById(id);
let local=null,localHash='',fileName='',existing=null,remoteChecked=false,working=false;
function info(id,message,style=''){const el=$(id);el.textContent=message;el.className='line '+style;}
function isAdmin(){return auth.currentUser?.uid===ADMIN_UID}
function ready(){
 $('loginBtn').hidden=!!auth.currentUser;$('logoutBtn').hidden=!auth.currentUser;
 $('checkBtn').disabled=working||!isAdmin();
 $('uploadBtn').disabled=working||!isAdmin()||!local||!remoteChecked||existing!==false;
 $('verifyBtn').disabled=working||!isAdmin()||!local||!remoteChecked||existing!==true;
 $('localFile').disabled=working;
}
function validate(d){
 if(!d||d.version!==1||!Array.isArray(d.members)||!Array.isArray(d.sessions)||!d.attendance||typeof d.attendance!=='object'||Array.isArray(d.attendance))throw Error('출석 JSON 구조가 올바르지 않아.');
 if(d.members.length!==55||d.sessions.length!==14)throw Error('검증한 55명·14회차 파일과 달라. 새로운 파일이라면 먼저 확인이 필요해.');
 const mIds=new Set(),sIds=new Set();
 for(const m of d.members){if(typeof m?.id!=='string'||typeof m.name!=='string'||typeof m.active!=='boolean'||mIds.has(m.id))throw Error('문파원 ID/형식 중복 또는 오류');mIds.add(m.id)}
 for(const s of d.sessions){if(typeof s?.id!=='string'||typeof s.content!=='string'||typeof s.date!=='string'||typeof s.label!=='string'||sIds.has(s.id))throw Error('회차 ID/형식 중복 또는 오류');sIds.add(s.id)}
 const nov1=d.sessions.filter(s=>s.date==='2026-11-01');
 if(nov1.length!==2||!nov1.some(s=>s.content==='요신토벌령'&&s.round===4)||!nov1.some(s=>s.content==='결계지방어'&&s.round===4))throw Error('11월 1일 요신토벌령/결계지방어 4회차가 둘 다 있어야 해.');
 for(const [sid,rows] of Object.entries(d.attendance)){
  if(!sIds.has(sid)||!rows||typeof rows!=='object'||Array.isArray(rows))throw Error('출석 회차 연결 오류');
  for(const [mid,v] of Object.entries(rows))if(!mIds.has(mid)||!['present','absent','exempt'].includes(v))throw Error('출석 상태/문파원 연결 오류');
 }
 if(d.participationModes!==undefined){
  if(!d.participationModes||typeof d.participationModes!=='object'||Array.isArray(d.participationModes))throw Error('참여 방식 구조 오류');
  for(const [sid,rows] of Object.entries(d.participationModes)){
   if(!sIds.has(sid)||!rows||typeof rows!=='object'||Array.isArray(rows))throw Error('참여 방식 회차 오류');
   for(const [mid,mode] of Object.entries(rows)){
    if(!mIds.has(mid)||d.attendance[sid]?.[mid]!=='present'||!['direct','auto','clone'].includes(mode))throw Error('참여 방식과 출석 상태가 일치하지 않아.');
   }
  }
 }
 return d;
}
function stats(d){
 const a=Object.values(d.attendance).flatMap(x=>Object.values(x||{}));
 const modes=Object.values(d.participationModes||{}).flatMap(x=>Object.values(x||{}));
 return [['문파원',d.members.length],['활동 인원',d.members.filter(m=>m.active).length],['회차',d.sessions.length],['참석',a.filter(x=>x==='present').length],['직접',modes.filter(x=>x==='direct').length],['오토',modes.filter(x=>x==='auto').length]];
}
function statsTo(d){$('localStats').replaceChildren();for(const [label,value] of stats(d)){const card=document.createElement('div');card.className='stat';const b=document.createElement('b');b.textContent=String(value);const span=document.createElement('span');span.textContent=label;card.append(b,span);$('localStats').append(card)}$('localStats').hidden=false;}
// 객체 키 정렬: Firestore로 다시 읽었을 때 맵의 키 순서가 바뀌어도 논리적으로 같은 데이터인지 검사한다.
function canonical(value){
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
 return value;
}
function normalized(d){return JSON.stringify(canonical(d))}
async function sha256(text){const bytes=new TextEncoder().encode(text),digest=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('')}
function diffSummary(localData,remoteData){
 const lines=[];
 for(const [k,n] of stats(localData)){
  const other=Object.fromEntries(stats(remoteData))[k];lines.push(`${k}: 로컬 ${n} / Firebase ${other} ${n===other?'✓':'⚠'}`);
 }
 return lines.join('\n');
}
$('localFile').addEventListener('change',async()=>{
 local=null;localHash='';fileName='';$('localStats').hidden=true;$('hashStatus').textContent='';$('verifyDetail').hidden=true;
 const file=$('localFile').files?.[0];$('filename').textContent=file?.name||'선택된 파일 없음';
 if(!file){ready();return}
 try{
  if(file.size>850000||file.size<1000)throw Error('파일 크기가 예상 범위를 벗어나.');
  const parsed=validate(JSON.parse(await file.text()));
  const payload=normalized(parsed);if(new TextEncoder().encode(payload).length>850000)throw Error('파일이 Firebase 문서 저장 한도에 너무 가까워.');
  const hash=await sha256(payload);
  local=parsed;localHash=hash;fileName=file.name;
  statsTo(parsed);info('localStatus','✓ 최신 14회차 JSON 확인 완료 · 11/1 회차 두 개 있음','ok');
  $('hashStatus').textContent='파일 내용 SHA-256: '+hash.slice(0,16)+'… (저장 후 일치 검사에 사용)';
 }catch(e){info('localStatus','파일 확인 실패: '+e.message,'err')}
 ready();
});
onAuthStateChanged(auth,user=>{
 existing=null;remoteChecked=false;
 if(isAdmin())info('authStatus','✓ 관리자 계정 인증 완료','ok');
 else if(user)info('authStatus','⚠ 이 계정은 관리자 UID와 달라. 저장 및 조회를 막았어.','warn');
 else info('authStatus','Google 로그인이 필요해.');
 info('cloudStatus','이 계정으로 시험 저장 위치를 아직 확인하지 않았어.');
 ready();
});
$('loginBtn').onclick=async()=>{try{await signInWithPopup(auth,new GoogleAuthProvider())}catch(e){info('authStatus','로그인 실패: '+(e.code||e.message),'err')}};
$('logoutBtn').onclick=async()=>{try{await signOut(auth)}catch(e){info('authStatus','로그아웃 실패: '+e.message,'err')}};
$('checkBtn').onclick=async()=>{
 if(!isAdmin())return;working=true;remoteChecked=false;existing=null;ready();info('cloudStatus','Firebase 서버에서 시험 문서를 확인 중…');
 try{
  const s=await getDocFromServer(target);
  existing=s.exists();remoteChecked=true;
  info('cloudStatus',existing?'⚠ 시험 문서가 이미 있어. 절대 덮어쓰지 않아. 아래 재조회 검사로 내용만 확인할 수 있어.':'✓ 별도 시험 문서가 비어 있어. 이제 최초 1회 저장 가능해. (운영 문서는 그대로)',''+(existing?'warn':'ok'));
 }catch(e){info('cloudStatus',`읽기 실패 (${e.code||e.message}). 쓰기 금지 상태야. 규칙을 임의로 바꾸지 말고 알려줘.`,'err')}
 finally{working=false;ready()}
};
$('uploadBtn').onclick=async()=>{
 if(working||!isAdmin()||!local||!remoteChecked||existing!==false)return;
 if(!window.confirm(`관리자 전용 별도 시험 문서에 최신 출석 ${local.sessions.length}회차를 처음 저장할까?\n\n저장 위치: ${DOC_COLLECTION}/${DOC_ID}\n기존 attendanceBackup, 홈페이지, GitHub, 브라우저 기록은 수정하지 않아.\n해당 시험 문서가 이미 존재하면 덮어쓰지 않고 중단해.`))return;
 working=true;ready();info('uploadStatus','Firebase 트랜잭션으로 중복 문서가 없는지 재검사하는 중…');
 try{
  // 트랜잭션은 문서를 읽은 다음 비어 있을 때만 생성. 경쟁 상태에도 기존 문서는 수정하지 않는다.
  const payload=JSON.parse(JSON.stringify(local)),fingerprint=localHash;
  await runTransaction(db,async t=>{
   const s=await t.get(target);
   if(s.exists())throw Error('이미 시험 문서가 있어. 덮어쓰지 않고 중단했어.');
   t.set(target,{schemaVersion:1,data:payload,sha256:fingerprint,createdAt:serverTimestamp(),stage:'attendance-first-import-2026-11-03'});
  },{maxAttempts:3});
  existing=true;remoteChecked=true;
  info('uploadStatus','✓ 시험 문서 최초 저장 요청 성공. 이제 서버에서 다시 읽어서 일치 여부를 확인해 줘.','ok');
  info('cloudStatus','✓ 별도 시험 문서 생성됨. 덮어쓰기는 차단돼 있어.','ok');
 }catch(e){existing=null;remoteChecked=false;info('uploadStatus',`저장 실패 또는 안전 중단 (${e.code||e.message}). 운영 데이터는 건드리지 않았어. 위치 확인부터 다시 진행해 줘.`,'err')}
 finally{working=false;ready()}
};
$('verifyBtn').onclick=async()=>{
 if(!isAdmin()||!local||!remoteChecked||existing!==true||working)return;
 working=true;ready();$('verifyDetail').hidden=true;info('verifyStatus','Firebase 서버에서 다시 읽어 원본과 대조 중…');
 try{
  const s=await getDocFromServer(target);
  if(!s.exists())throw Error('시험 문서가 없어.');
  const cloud=s.data();const d=validate(cloud.data);
  const freshHash=await sha256(normalized(d));const ok=freshHash===localHash&&cloud.sha256===localHash;
  $('verifyDetail').textContent=diffSummary(local,d)+'\n\n로컬 SHA-256: '+localHash.slice(0,20)+'…\nFirebase SHA-256: '+freshHash.slice(0,20)+'…\n저장 메타데이터: '+String(cloud.sha256||'없음').slice(0,20)+'…';
  $('verifyDetail').hidden=false;
  if(ok)info('verifyStatus','✅ 서버 재조회 성공 · 파일 내용과 Firebase 내용 완전 일치! 운영 데이터는 변경하지 않았어.','ok');
  else info('verifyStatus','⚠ 서버 재조회는 성공했지만 내용이 일치하지 않아. 아무 작업도 더 하지 말고 이 결과를 알려줘.','warn');
 }catch(e){info('verifyStatus',`서버 검증 실패 (${e.code||e.message}). 다른 자료는 건드리지 않았어.`,'err')}
 finally{working=false;ready()}
};
ready();
