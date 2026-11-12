// PARTY · Shared, permission-limited member management.
// No local roster is used as the source of truth. All writes are two-document transactions.
import {auth,db,refs,isAdmin as isOwner} from './party-firebase-shared.js';
import {GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import {doc,getDocFromServer,runTransaction,setDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
const $=id=>document.getElementById(id);
const accessRef=doc(db,'guildPrivate','memberAccessV1');
const {attendance:privateRef,attendancePublic:publicRef}=refs;
let authorized=false,busy=false,snapshot=null,session=0;
const json=x=>JSON.parse(JSON.stringify(x));
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const withoutTime=payload=>{const {publishedAt,...rest}=payload||{};return rest;};
const message=(text)=>{$('loginState').textContent=text;};
const dateKST=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const emailValid=x=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)&&x.length<=254;
const sizeBytes=x=>new TextEncoder().encode(JSON.stringify(x)).length;
async function hash(data){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(canonical(data))));return [...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,'0')).join('');}
function validated(data){
 if(!data||data.version!==1||!Array.isArray(data.members)||!Array.isArray(data.sessions)||!data.attendance||typeof data.attendance!=='object'||Array.isArray(data.attendance)||!data.participationModes||typeof data.participationModes!=='object'||Array.isArray(data.participationModes))throw Error('서버 장부의 형식이 올바르지 않습니다.');
 if(data.members.length<1||data.members.length>500||data.sessions.length<14||data.sessions.length>5000)throw Error('서버 장부 크기가 예상 범위에서 벗어났습니다.');
 const ids=new Set();for(const m of data.members){if(typeof m.id!=='string'||!m.id||ids.has(m.id)||typeof m.name!=='string'||!m.name.trim()||typeof m.active!=='boolean')throw Error('문파원 ID 또는 닉네임 형식 오류');ids.add(m.id);}
 return data;
}
function output(data){const make=window.PARTY_ATTENDANCE_EXPORT?.createPayload;if(typeof make!=='function')throw Error('공개 출석 변환기를 불러오지 못했습니다.');const payload=make(data);if(sizeBytes(payload)>350000)throw Error('공개 장부 크기 제한을 초과했습니다.');return payload;}
async function readPair(){
 const [pa,pu]=await Promise.all([getDocFromServer(privateRef),getDocFromServer(publicRef)]);
 if(!pa.exists()||!pu.exists())throw Error('Firebase의 운영 또는 공개 출석 원본이 없습니다.');
 const a=pa.data(),b=pu.data(),raw=validated(a.data);
 if(!Number.isSafeInteger(a.revision)||a.revision<1||!Number.isSafeInteger(b.revision)||b.revision<1||b.format!=='party-attendance-public-v2')throw Error('장부 버전이나 공개 형식이 예상과 다릅니다.');
 const digest=await hash(raw);
 if(b.sourceRevision!==a.revision||b.sourceDataHash!==digest||!same(withoutTime(b.payload),withoutTime(output(raw))))throw Error('운영 장부와 공개 장부가 일치하지 않아 편집을 막았습니다. 기존 데이터를 덮어쓰지 않습니다.');
 return {raw,revision:a.revision,publicRevision:b.revision,digest};
}
function controls(){
 const current=auth.currentUser;
 $('signInBtn').hidden=!!current;
 $('signOutBtn').hidden=!current;
 $('loadBtn').disabled=busy||!authorized;
 $('memberPanel').hidden=!authorized;
 $('deputyPanel').hidden=!isOwner();
 $('roleChip').textContent=isOwner()?'문주':authorized?'부문주':current?'권한 없음':'로그인 필요';
 document.querySelectorAll('#memberPanel button,#memberPanel input,#memberPanel textarea,#deputyPanel button,#deputyPanel input').forEach(el=>el.disabled=busy);
}
async function access(){
 const loginCycle=session;
 const user=auth.currentUser;
 if(!user){authorized=false;snapshot=null;controls();message('Google 계정으로 로그인하면 관리 권한을 확인합니다.');return;}
 if(isOwner()){
  authorized=true;
  try{const docSnap=await getDocFromServer(accessRef);$('deputyEmail').value=docSnap.exists()?String(docSnap.data().deputyEmail||''):'';$('deputyState').textContent=docSnap.exists()&&docSnap.data().deputyEmail?'현재 승인된 부문주: '+docSnap.data().deputyEmail:'현재 승인된 부문주가 없습니다.';}
  catch(e){$('deputyState').textContent='권한 목록을 읽지 못했습니다. Firebase 규칙을 확인해 주세요. '+(e.code||e.message);}
 }else{
  try{
   const docSnap=await getDocFromServer(accessRef);
   authorized=!!(user.emailVerified&&docSnap.exists()&&String(docSnap.data().deputyEmail||'').toLowerCase()===String(user.email||'').toLowerCase());
  }catch{authorized=false;}
 }
 if(loginCycle!==session)return;
 controls();
 if(!authorized){snapshot=null;message('이 계정에는 문파원 관리 권한이 없습니다. 문주가 부문주 Google 이메일을 등록한 뒤 다시 로그인해 주세요.');return;}
 await load();
}
async function load(){
 if(!authorized||busy)return;
 const loginCycle=session;
 busy=true;controls();message('Firebase 서버에서 최신 명단을 불러오는 중입니다…');
 try{const latest=await readPair();if(loginCycle!==session)return;snapshot=latest;render();message(`Firebase 서버 원본을 불러왔습니다. 총 ${snapshot.raw.members.length}명 / 재적 ${snapshot.raw.members.filter(m=>m.active).length}명`);}
 catch(e){if(loginCycle!==session)return;snapshot=null;$('roster').replaceChildren();message('명단을 열 수 없습니다: '+(e.code||e.message));}
 finally{busy=false;controls();}
}
function render(){
 const rows=$('roster');rows.replaceChildren();
 const members=snapshot?.raw.members||[];
 $('memberCount').textContent=`재적 ${members.filter(m=>m.active).length}명 / 전체 ${members.length}명`;
 $('revisionChip').textContent=snapshot?`원본 v${snapshot.revision}`:'로드 필요';
 const visible=members.filter(m=>m.active||$('showFormer').checked);
 if(!visible.length){const p=document.createElement('p');p.className='muted';p.textContent='표시할 문파원이 없습니다.';rows.append(p);return;}
 for(const m of visible){
  const row=document.createElement('div');row.className='member'+(m.active?'':' inactive');
  const details=document.createElement('div');details.className='detail';
  const name=document.createElement('input');name.value=m.name;name.maxLength=35;name.setAttribute('aria-label','문파원 닉네임');
  const dateLabel=document.createElement('label');dateLabel.textContent='가입일';
  const joined=document.createElement('input');joined.type='date';joined.value=m.joinDate||'';dateLabel.append(joined);
  const eligibleLabel=document.createElement('label');eligibleLabel.textContent='출석 집계 시작일';
  const eligible=document.createElement('input');eligible.type='date';eligible.value=m.eligibleFrom||'';eligibleLabel.append(eligible);
  details.append(dateLabel,eligibleLabel);
  const save=document.createElement('button');save.className='secondary';save.textContent='수정 저장';
  save.addEventListener('click',()=>mutate(d=>{
   const target=d.members.find(x=>x.id===m.id);if(!target)throw Error('선택한 문파원이 더 이상 명단에 없습니다.');
   const next=name.value.trim();if(!next||next.length>35)throw Error('닉네임은 1~35자여야 합니다.');
   if(d.members.some(x=>x.id!==m.id&&x.name.toLocaleLowerCase('ko')===next.toLocaleLowerCase('ko')))throw Error('동일한 닉네임이 이미 있습니다.');
   target.name=next;target.joinDate=joined.value;target.eligibleFrom=eligible.value;
  }));
  const toggle=document.createElement('button');toggle.className=m.active?'danger':'secondary';toggle.textContent=m.active?'탈퇴 처리':'복귀';
  toggle.addEventListener('click',()=>{
   if(!confirm(m.active?`${m.name}님을 탈퇴 처리할까요? 과거 출석 기록은 유지됩니다.`:`${m.name}님을 복귀 처리할까요?`))return;
   mutate(d=>{const target=d.members.find(x=>x.id===m.id);if(!target)throw Error('이 문파원이 더 이상 명단에 없습니다.');target.active=!target.active;});
  });
  row.append(name,save,toggle,details);rows.append(row);
 }
}
async function mutate(transform){
 if(busy||!authorized||!snapshot)return;
 const basis=snapshot,token=session;
 busy=true;controls();message('Firebase 원본 및 공개 장부를 동시에 저장하는 중입니다…');
 try{
  let nextResult;
  await runTransaction(db,async tx=>{
   const pr=await tx.get(privateRef),pu=await tx.get(publicRef);
   if(!pr.exists()||!pu.exists())throw Error('원본 또는 공개 장부가 없습니다.');
   const a=pr.data(),b=pu.data();
   if(a.revision!==basis.revision||b.revision!==basis.publicRevision)throw Error('다른 관리자에 의해 명단이 수정됐습니다. 최신 자료를 불러온 뒤 다시 진행해 주세요.');
   const previous=validated(a.data);
   if(await hash(previous)!==basis.digest||b.sourceRevision!==basis.revision||b.sourceDataHash!==basis.digest)throw Error('서버 장부가 다른 내용으로 바뀌었습니다. 저장하지 않았습니다.');
   const next=json(previous);transform(next);validated(next);
   if(next.members.length>500)throw Error('문파원 최대 500명을 초과했습니다.');
   if(!same(next.sessions,previous.sessions)||!same(next.attendance,previous.attendance)||!same(next.participationModes,previous.participationModes))throw Error('출석/회차 기록 변경은 허용되지 않습니다.');
   if(sizeBytes(next)>750000)throw Error('비공개 장부 용량 제한을 초과했습니다.');
   if(same(next.members,previous.members))throw Error('변경된 문파원 정보가 없습니다.');
   const payload=output(next),digest=await hash(next);
   tx.update(privateRef,{revision:a.revision+1,data:next,updatedAt:serverTimestamp()});
   tx.update(publicRef,{revision:b.revision+1,sourceRevision:a.revision+1,sourceDataHash:digest,payload,updatedAt:serverTimestamp()});
   nextResult={next,digest,revision:a.revision+1,publicRevision:b.revision+1,payload};
  },{maxAttempts:1});
  if(token!==session)return;
  const check=await readPair();
  if(check.revision!==nextResult.revision||check.publicRevision!==nextResult.publicRevision||check.digest!==nextResult.digest||!same(check.raw,nextResult.next))throw Error('저장 후 확인된 서버 버전이 일치하지 않습니다. 추가 편집을 중단합니다.');
  snapshot=check;render();message('저장 완료! Firebase 비공개·공개 장부 동기화 및 서버 재조회가 일치합니다.');
 }catch(e){snapshot=null;$('roster').replaceChildren();message('저장 중단: '+(e.code||e.message)+'\n기존 출석 기록을 임의로 덮어쓰지 않았습니다. 최신 명단을 다시 불러와 주세요.');}
 finally{busy=false;controls();}
}
function add(raw){
 const names=raw.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 if(!names.length){message('추가할 닉네임을 입력해 주세요.');return;}
 if(names.some(n=>n.length>35))return message('닉네임은 35자를 넘을 수 없습니다.');
 const unique=new Set(names.map(n=>n.toLocaleLowerCase('ko')));
 if(unique.size!==names.length)return message('추가 명단 안에 중복 닉네임이 있습니다.');
 mutate(d=>{
  const existing=new Set(d.members.map(m=>m.name.toLocaleLowerCase('ko')));
  for(const name of names){if(existing.has(name.toLocaleLowerCase('ko')))throw Error('이미 등록된 닉네임: '+name);}
  const date=dateKST();
  for(const name of names){const id='m'+crypto.randomUUID().replace(/-/g,'');d.members.push({id,name,active:true,joinDate:date,eligibleFrom:date});}
 });
}
$('signInBtn').onclick=async()=>{try{await signInWithPopup(auth,new GoogleAuthProvider());}catch(e){message('로그인 실패: '+(e.code||e.message));}};
$('signOutBtn').onclick=async()=>{try{await signOut(auth);}catch(e){message('로그아웃 실패: '+(e.code||e.message));}};
$('loadBtn').onclick=load;
$('showFormer').onchange=render;
$('addBtn').onclick=()=>add($('newMember').value);
$('newMember').addEventListener('keydown',e=>{if(e.key==='Enter'){$('addBtn').click();}});
$('bulkBtn').onclick=()=>add($('bulkMembers').value);
$('deputyForm').onsubmit=async event=>{
 event.preventDefault();if(!isOwner()||busy)return;
 const email=$('deputyEmail').value.trim().toLowerCase();if(!emailValid(email))return $('deputyState').textContent='올바른 Google 이메일을 입력해 주세요.';
 if(email.toLowerCase()===String(auth.currentUser?.email||'').toLowerCase())return $('deputyState').textContent='본인 계정은 이미 문주 권한을 가지고 있습니다.';
 if(!confirm(`${email} 계정에 문파원 관리 권한을 부여할까요?`))return;
 busy=true;controls();
 try{await setDoc(accessRef,{deputyEmail:email,updatedAt:serverTimestamp()});$('deputyState').textContent='부문주 권한 저장 완료: '+email;}
 catch(e){$('deputyState').textContent='권한 저장 실패: '+(e.code||e.message)+' (Firestore 규칙 확인 필요)';}
 finally{busy=false;controls();}
};
$('revokeDeputyBtn').onclick=async()=>{
 if(!isOwner()||busy)return;
 if(!confirm('부문주 권한을 회수할까요? 이후 해당 계정의 저장은 거부됩니다.'))return;
 busy=true;controls();
 try{await setDoc(accessRef,{deputyEmail:'',updatedAt:serverTimestamp()});$('deputyEmail').value='';$('deputyState').textContent='부문주 권한 회수 완료';}
 catch(e){$('deputyState').textContent='회수 실패: '+(e.code||e.message);}
 finally{busy=false;controls();}
};
onAuthStateChanged(auth,async()=>{
 const current=++session;authorized=false;snapshot=null;controls();
 try{await access();}catch(e){if(current===session)message('로그인 상태 확인 실패: '+(e.code||e.message));}
});
controls();
