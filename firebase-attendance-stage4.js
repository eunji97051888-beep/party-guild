// Stage 4: only reads the admin's STAGE 3 sandbox and publishes a sanitized public TRIAL document.
// Production Firestore paths, production JS, and production localStorage are untouched.
import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import {getFirestore,doc,getDocFromServer,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
const cfg={apiKey:'AIzaSyD_JzuNnKKuc-NU26KatxO2jqZCUVAebPE',authDomain:'party-guild.firebaseapp.com',projectId:'party-guild',storageBucket:'party-guild.firebasestorage.app',messagingSenderId:'465332308360',appId:'1:465332308360:web:50b5663dc1563df3d6923d'};
const ADMIN_UID='KkmihHrjJ3X82JLrdzymrkEUZyE3';
const app=getApps().find(a=>a.name==='party-attendance-stage4-admin')||initializeApp(cfg,'party-attendance-stage4-admin');
const auth=getAuth(app), db=getFirestore(app);
const sourceRef=doc(db,'guildPrivate','attendanceEditorSandbox_20261103');
const publicRef=doc(db,'publicContent','attendancePublicSandbox_20261103');
const $=id=>document.getElementById(id);
const isAdmin=()=>auth.currentUser?.uid===ADMIN_UID;
let src=null, publicDoc=null, publicChecked=false, busy=false;
const writeStatus=(id,message,error=false)=>{const e=$(id);e.textContent=message;e.style.color=error?'#ffbfbd':'#bff0cf'};
const api=()=>window.PARTY_ATTENDANCE_EXPORT;
function valid(data){
 if(!data||data.version!==1||!Array.isArray(data.members)||!Array.isArray(data.sessions)||!data.attendance||!data.participationModes)throw Error('출석 장부 형식이 올바르지 않아.');
 const ids=new Set(data.members.map(m=>m.id)), rounds=new Set(data.sessions.map(s=>s.id));
 if(ids.size!==data.members.length||rounds.size!==data.sessions.length||data.members.length<1||data.sessions.length<14)throw Error('문파원/회차 중복 또는 누락 (14회차 미만).');
 for(const [key,m] of Object.entries(data.attendance)){
  if(!rounds.has(key)||typeof m!=='object'||!m)throw Error('출석 회차 연결 이상');
  for(const id of Object.keys(m))if(!ids.has(id))throw Error('출석 문파원 연결 이상');
 }
 for(const [key,m] of Object.entries(data.participationModes)){
  if(!rounds.has(key)||typeof m!=='object'||!m)throw Error('참여 방식 회차 연결 이상');
  for(const id of Object.keys(m))if(!ids.has(id))throw Error('참여 방식 문파원 연결 이상');
 }
 return data;
}
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
async function digest(v){
 const data=new TextEncoder().encode(JSON.stringify(canonical(v)));
 const bytes=await crypto.subtle.digest('SHA-256',data);
 return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function controls(){
 $('login').disabled=busy||isAdmin();
 $('source').disabled=busy||!isAdmin();
 $('check').disabled=busy||!isAdmin();
 $('publish').disabled=busy||!isAdmin()||!src||!publicChecked;
}
function summary(payload){
 const rows=payload.sessions.flatMap(s=>s.members.filter(m=>m.status==='present').map(m=>({...m,date:s.date,content:s.content})));
 const confirmed=rows.filter(m=>m.mode==='direct').length;
 const auto=rows.filter(m=>m.mode==='auto').length;
 const unchecked=rows.filter(m=>m.mode==='unconfirmed').length;
 const tickets=rows.reduce((sum,m)=>sum+(m.tickets||0),0);
 return [['회차',payload.sessions.length],['참석',rows.length],['직접',confirmed],['오토',auto],['방식 미확인',unchecked],['추첨권 합계',tickets]];
}
function renderSummary(payload){const root=$('sourceStats');root.replaceChildren();for(const [k,v] of summary(payload)){const b=document.createElement('div');b.className='stat';const n=document.createElement('strong');n.textContent=v;const title=document.createElement('span');title.textContent=k;b.append(n,title);root.append(b)}root.hidden=false;}
function extract(raw){const payload=api()?.createPayload(valid(raw));if(!payload||payload.version!==2)throw Error('공개 자료 변환 기능을 불러오지 못했어.');
 const size=new TextEncoder().encode(JSON.stringify(payload)).length;
 if(size>350000)throw Error('공개 데이터 크기가 350KB를 초과했어. 여러 문서로 분할해야 해.');
 return payload;
}
onAuthStateChanged(auth,user=>{
 // Never silently reuse data and controls across different auth sessions.
 src=null;publicDoc=null;publicChecked=false;$('sourceStats').hidden=true;
 writeStatus('authStatus',isAdmin()?'✓ Firebase 관리자 인증 완료':user?'이 Google 계정은 관리자로 승인되지 않았어.':'Google 관리자 계정으로 로그인해 줘.',!!user&&!isAdmin());
 writeStatus('sourceStatus','');writeStatus('publicStatus','미확인');writeStatus('publishStatus','');controls();
});
$('login').onclick=async()=>{busy=true;controls();try{await signInWithPopup(auth,new GoogleAuthProvider())}catch(e){writeStatus('authStatus','Google 로그인 실패: '+(e.code||e.message),true)}finally{busy=false;controls()}};
$('source').onclick=async()=>{
 if(!isAdmin())return;busy=true;controls();src=null;publicChecked=false;
 try{
  const snap=await getDocFromServer(sourceRef);if(!snap.exists())throw Error('3단계 시험 장부가 없어. 먼저 3단계에서 시험 장부를 만들어 줘.');
  const d=snap.data(),rev=d.revision;if(!Number.isSafeInteger(rev)||rev<1)throw Error('시험 장부 버전이 올바르지 않아.');
  const payload=extract(d.data),hash=await digest(d.data);
  src={rev,hash,payload};renderSummary(payload);
  writeStatus('sourceStatus',`✓ Firebase 서버 시험 장부 조회 성공 · 버전 ${rev} · ${payload.sessions.length}회차\n원본 검증값 ${hash.slice(0,18)}…\n공개 변환에는 닉네임·출석 상태·참여 방식·추첨권 외 내부 정보가 들어가지 않아.`);
  writeStatus('publishStatus','② 공개 문서 상태를 확인한 뒤 시험 게시할 수 있어.');
 }catch(e){writeStatus('sourceStatus','조회 실패: '+(e.code||e.message)+'\nFirebase 규칙을 바꾸지 말고 알려줘.',true)}finally{busy=false;controls()}
};
$('check').onclick=async()=>{
 if(!isAdmin())return;busy=true;controls();publicChecked=false;
 try{
  const snap=await getDocFromServer(publicRef);publicDoc=snap.exists()?snap.data():null;
  if(publicDoc&&(!Number.isSafeInteger(publicDoc.revision)||publicDoc.revision<1))throw Error('공개 시험 문서 버전 오류');
  publicChecked=true;
  writeStatus('publicStatus',publicDoc?`✓ 공개 시험 문서 있음 · 게시 버전 ${publicDoc.revision}, 출처 장부 버전 ${publicDoc.sourceRevision}\n다시 게시하면 같은 시험 문서만 갱신돼.`:'✓ 공개 시험 문서 없음 · 첫 게시가 가능해.');
 }catch(e){publicDoc=null;writeStatus('publicStatus','시험 문서 상태 조회 실패: '+(e.code||e.message),true)}finally{busy=false;controls()}
};
$('publish').onclick=async()=>{
 if(!isAdmin()||!src||!publicChecked||busy)return;
 const preview=src, known=publicDoc;
 const message=known?'기존 공개 *시험 문서*의 내용을 새 버전으로 바꿀까?\n운영 출석 문서는 변경하지 않아.':'출석 명단이 Firebase 공개 *시험 문서*에 게시돼.\n이 시험 URL에 접속한 누구나 닉네임과 출석 기록을 볼 수 있어.\n운영 홈페이지 메뉴에는 연결되지 않아.';
 if(!confirm(message))return;
 busy=true;controls();writeStatus('publishStatus','⏳ 서버 시험 장부 재확인·게시 트랜잭션 진행 중…');
 try{
  let nextRev=0;
  await runTransaction(db,async tx=>{
   const s=await tx.get(sourceRef),p=await tx.get(publicRef);
   if(!s.exists())throw Error('원본 시험 문서가 없어.');
   const d=s.data();if(d.revision!==preview.rev||await digest(d.data)!==preview.hash)throw Error('시험 편집기의 내용이 조회 이후 바뀌었어. 다시 조회하고 비교해야 해.');
   if(!!p.exists()!==!!known)throw Error('공개 시험 문서의 존재 상태가 변경됐어. 다시 확인해 줘.');
   if(p.exists()&&p.data().revision!==known.revision)throw Error('공개 시험 문서가 다른 기기에서 갱신됐어. 덮어쓰지 않을게.');
   nextRev=p.exists()?p.data().revision+1:1;
   tx.set(publicRef,{format:'party-attendance-public-v2',revision:nextRev,sourceRevision:preview.rev,sourceDataHash:preview.hash,payload:preview.payload,updatedAt:serverTimestamp()});
  },{maxAttempts:3});
  const again=await getDocFromServer(publicRef);
  const record=again.data();if(!again.exists()||record.revision!==nextRev||record.sourceDataHash!==preview.hash||JSON.stringify(record.payload)!==JSON.stringify(preview.payload))throw Error('서버 재조회 결과가 게시 원본과 일치하지 않아.');
  publicDoc=record;publicChecked=true;
  writeStatus('publicStatus',`✓ 공개 시험 문서 확인됨 · 게시 버전 ${nextRev}`);
  writeStatus('publishStatus',`✅ Firebase 시험 게시 성공 · 서버 재조회 일치 · ${preview.payload.sessions.length}회차 · 시험 게시 버전 ${nextRev}\n이제 아래 Firebase 공개 화면 보기를 눌러 확인해 줘.`);
 }catch(e){src=null;publicDoc=null;publicChecked=false;writeStatus('publishStatus','🔴 게시 중단: '+(e.code||e.message)+'\n안전 장치가 충돌 또는 권한 문제를 감지했어. 규칙을 바꾸지 말고 이 메시지를 보내줘.',true)}finally{busy=false;controls()}
};
controls();
