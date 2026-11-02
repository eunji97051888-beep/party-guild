// PARTYGUILD FIREBASE ATTENDANCE DRY RUN / NO WRITES.
// This file deliberately imports NO Firestore write/delete operations.
import { initializeApp, getApp, getApps } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import { getFirestore, doc, getDocFromServer } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';

// Firebase Web config is a public identifier, not a secret credential. Access is controlled by Firestore rules.
const cfg = {
  apiKey: 'AIzaSyD_JzuNnKKuc-NU26KatxO2jqZCUVAebPE',
  authDomain: 'party-guild.firebaseapp.com',
  projectId: 'party-guild',
  storageBucket: 'party-guild.firebasestorage.app',
  messagingSenderId: '465332308360',
  appId: '1:465332308360:web:50b5663dc1563df3d6923d'
};
const app = getApps().find(a => a.name === 'party-safe-check') || initializeApp(cfg, 'party-safe-check');
const auth = getAuth(app);
const db = getFirestore(app);
const get = (id) => document.getElementById(id);
let localData = null;
let remoteData = null;
let reportText = '';

function asText(id, message, status = '') {
  const el = get(id);
  el.textContent = message;
  el.className = 'line ' + status;
}
function statsInto(id, values) {
  const target = get(id);
  target.replaceChildren();
  const items = [
    ['문파원', values.members], ['활동 인원', values.active], ['누적 회차', values.sessions],
    ['참석 기록', values.present], ['직접 구분', values.direct], ['오토 구분', values.auto]
  ];
  for (const [label, value] of items) {
    const card = document.createElement('div');card.className = 'stat';
    const num = document.createElement('b');num.textContent = String(value);
    const name = document.createElement('span');name.textContent = label;
    card.append(num, name);target.append(card);
  }
  target.hidden = false;
}
function validate(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.members) || !Array.isArray(data.sessions) || !data.attendance || typeof data.attendance !== 'object' || Array.isArray(data.attendance)) {
    throw new Error('문파원·회차·출석 자료의 구조가 올바르지 않아.');
  }
  if (data.members.length > 500 || data.sessions.length > 5000) throw new Error('기대보다 많은 자료가 들어 있어. 확인이 필요해.');
  const mIds = data.members.map(m=>m?.id).filter(x=>typeof x==='string');
  const sIds = data.sessions.map(s=>s?.id).filter(x=>typeof x==='string');
  if (mIds.length!==data.members.length || sIds.length!==data.sessions.length || new Set(mIds).size!==mIds.length || new Set(sIds).size!==sIds.length) throw new Error('고유 ID가 없거나 중복돼 있어.');
  return data;
}
function stats(data) {
  const allStatus = Object.values(data.attendance).flatMap(x=>Object.values(x||{}));
  const allModes = Object.values(data.participationModes||{}).flatMap(x=>Object.values(x||{}));
  return {
    members: data.members.length, active: data.members.filter(x=>x.active).length,
    sessions: data.sessions.length, present: allStatus.filter(x=>x==='present').length,
    direct: allModes.filter(x=>x==='direct').length, auto: allModes.filter(x=>x==='auto').length
  };
}
function refresh() {
  get('compareBtn').disabled = !localData || !remoteData;
  get('copyBtn').hidden = true;
  get('compareReport').hidden = true;
  reportText = '';
}
get('localInput').addEventListener('change', async () => {
  localData = null;refresh();get('localStats').hidden = true;
  const file = get('localInput').files?.[0];if(!file)return;
  try{
    if(file.size > 1000000) throw new Error('1MB 초과 파일은 이 점검 도구에서 읽지 않아.');
    localData = validate(JSON.parse(await file.text()));
    statsInto('localStats',stats(localData));
    const recent = localData.sessions.filter(s=>s.date==='2026-11-01');
    const have = new Set(recent.map(s=>s.content));
    asText('localStatus',`✓ JSON 확인 완료 · 11/1 요신토벌령 ${have.has('요신토벌령')?'있음':'없음'} / 결계지방어 ${have.has('결계지방어')?'있음':'없음'}`,'success');
  } catch(e) { asText('localStatus',`JSON 읽기 실패: ${e.message}`,'error'); }
  refresh();
});

onAuthStateChanged(auth,user=>{
  get('loginBtn').hidden=!!user;get('logoutBtn').hidden=!user;
  get('readBtn').disabled=!user;
  if(user)asText('cloudStatus','✓ Firebase Google 로그인 확인. 클라우드 백업 읽기 버튼을 눌러줘.','success');
  else {remoteData=null;get('cloudStats').hidden=true;asText('cloudStatus','Google 로그인 후 클라우드 백업을 읽을 수 있어.');refresh();}
});
get('loginBtn').addEventListener('click',async()=>{
  get('loginBtn').disabled=true;
  try{await signInWithPopup(auth,new GoogleAuthProvider());}
  catch(e){asText('cloudStatus','로그인 실패: '+(e?.code||e?.message||'알 수 없는 오류'),'error');}
  finally{get('loginBtn').disabled=false;}
});
get('logoutBtn').addEventListener('click',async()=>{await signOut(auth);});
get('readBtn').addEventListener('click',async()=>{
  if(!auth.currentUser)return;
  get('readBtn').disabled=true;remoteData=null;get('cloudStats').hidden=true;refresh();
  asText('cloudStatus','기존 클라우드 백업을 서버에서 읽는 중이야…');
  try{
    const snapshot=await getDocFromServer(doc(db,'guildPrivate','attendanceBackup'));
    if(!snapshot.exists()){
      asText('cloudStatus','클라우드에 이전 출석 백업 문서가 없어. 오류는 아니고 새 출석 데이터 이전 방식부터 설계해야 해.','warn');
    } else {
      const raw=snapshot.data();remoteData=validate(raw?.data);
      statsInto('cloudStats',stats(remoteData));
      const t=raw?.updatedAt?.toDate?.();
      asText('cloudStatus',`✓ 기존 클라우드 백업 읽기 성공 · 저장 시각: ${t?t.toLocaleString('ko-KR'):'기록 없음'}`,'success');
    }
  } catch(e) {
    const code=e?.code||'unknown';
    asText('cloudStatus',`Firestore 읽기 실패 (${code}). 기존 데이터와 규칙은 수정하지 않았어.`,'error');
  }
  get('readBtn').disabled=!auth.currentUser;
  refresh();
});
function countDiff(a,b) {
  const keys=new Set([...Object.keys(a||{}),...Object.keys(b||{})]);
  let different=0;for(const k of keys){if((a||{})[k] !== (b||{})[k])different++;}
  return different;
}
function inspectDiff(local,cloud) {
  const lMem=new Map(local.members.map(x=>[x.id,x]));
  const cMem=new Map(cloud.members.map(x=>[x.id,x]));
  const lSes=new Map(local.sessions.map(x=>[x.id,x]));
  const cSes=new Map(cloud.sessions.map(x=>[x.id,x]));
  const sharedSessions=[...lSes.keys()].filter(id=>cSes.has(id));
  let changedAttendance=0,changedModes=0;
  for (const id of sharedSessions){
    changedAttendance+=countDiff(local.attendance[id],cloud.attendance[id]);
    changedModes+=countDiff(local.participationModes?.[id],cloud.participationModes?.[id]);
  }
  const lines=[
    '=== 파티 문파 출석 백업 비교 / 읽기 전용 ===',
    `최신 JSON: ${local.members.length}명 / ${local.sessions.length}회차`,
    `Firebase 과거 백업: ${cloud.members.length}명 / ${cloud.sessions.length}회차`,
    '',
    `최신 JSON에만 있는 문파원 ID: ${[...lMem.keys()].filter(id=>!cMem.has(id)).length}개`,
    `Firebase에만 있는 문파원 ID: ${[...cMem.keys()].filter(id=>!lMem.has(id)).length}개`,
    `공통 문파원의 닉네임·활동 상태 변경: ${[...lMem.keys()].filter(id=>cMem.has(id)&& (lMem.get(id).name!==cMem.get(id).name || lMem.get(id).active!==cMem.get(id).active)).length}건`,
    `최신 JSON에만 있는 회차: ${[...lSes.keys()].filter(id=>!cSes.has(id)).length}개`,
    `Firebase에만 있는 회차: ${[...cSes.keys()].filter(id=>!lSes.has(id)).length}개`,
    `공통 회차의 출석 상태 차이: ${changedAttendance}건`,
    `공통 회차의 참여 방식 차이: ${changedModes}건`,
    '',
    '※ 차이 건수는 백업 시점 차이일 수 있고, 자료 손상을 뜻하지 않아.',
    '※ 이 점검 페이지는 Firestore 쓰기·복원·삭제 기능이 없어.',
    '※ 비교 이후에도 현재 홈페이지는 기존 방식 그대로 운영돼.'
  ];
  return lines.join('\n');
}
get('compareBtn').addEventListener('click',()=>{
  if(!localData||!remoteData)return;
  try{
    reportText=inspectDiff(localData,remoteData);
    get('compareReport').textContent=reportText;get('compareReport').hidden=false;
    get('copyBtn').hidden=false;
    asText('compareStatus','✓ 비교 완료. 아래 숫자만 캡처하거나 복사해서 전달해 줘.','success');
  }catch(e){asText('compareStatus','비교 실패: '+e.message,'error');}
});
get('copyBtn').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(reportText);asText('compareStatus','✓ 결과 요약 복사 완료','success');}
  catch{asText('compareStatus','복사가 차단됐어. 아래 결과를 직접 선택해서 복사해 줘.','warn');}
});
