// PARTY GUILD | Deputy attendance only. Live attendance documents are the only content writes.
// Depends on the existing attendance-export-core.js (same converter as the owner's editor).
import {auth, db, refs, isAdmin as isOwner} from './party-firebase-shared.js';
import {GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import {doc,getDocFromServer,runTransaction,setDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';

const $=id=>document.getElementById(id);
const {attendance:privateRef,attendancePublic:publicRef}=refs;
const accessRef=doc(db,'guildPrivate','attendanceDeputyAccessV1');
const CONTENTS=['신기 쟁탈전','미혹의 정원','결계지방어','요신토벌령'];
const PVP=new Set(['신기 쟁탈전','미혹의 정원']);
const clone=x=>JSON.parse(JSON.stringify(x));
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const stripTime=payload=>{const {publishedAt,...rest}=payload||{};return rest;};
const bytes=x=>new TextEncoder().encode(JSON.stringify(x)).length;
const emailValid=x=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)&&x.length<=254;
const localDate=()=>{const parts=new Intl.DateTimeFormat('en-US',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Asia/Seoul'}).formatToParts(new Date());const d=Object.fromEntries(parts.map(p=>[p.type,p.value]));return `${d.year}-${d.month}-${d.day}`;};
let sessionToken=0, authorized=false, busy=false, server=null, currentId='', draft=new Map();
const status=(msg,type='')=>{const el=$('loginState');el.textContent=msg;el.className='status'+(type?' '+type:'');};
const msgError=e=>String(e?.code||e?.message||e||'알 수 없는 오류');
async function digest(raw){const buffer=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(canonical(raw))));return [...new Uint8Array(buffer)].map(x=>x.toString(16).padStart(2,'0')).join('');}
function validate(raw){
 if(!raw||raw.version!==1||!Array.isArray(raw.members)||!Array.isArray(raw.sessions)||raw.members.length<1||raw.members.length>500||raw.sessions.length<14||raw.sessions.length>5000||!raw.attendance||typeof raw.attendance!=='object'||Array.isArray(raw.attendance)||!raw.participationModes||typeof raw.participationModes!=='object'||Array.isArray(raw.participationModes))throw Error('출석 원본 형식이 예상과 다릅니다.');
 const ids=new Set();for(const m of raw.members){if(!m||typeof m.id!=='string'||!m.id||ids.has(m.id)||typeof m.name!=='string'||!m.name.trim()||typeof m.active!=='boolean')throw Error('문파원 정보 오류');ids.add(m.id);}
 const sids=new Set();for(const s of raw.sessions){if(!s||typeof s.id!=='string'||!s.id||sids.has(s.id)||!CONTENTS.includes(s.content)||!/^\d{4}-\d{2}-\d{2}$/.test(s.date||''))throw Error('회차 정보 오류');sids.add(s.id);}
 for(const [sid,row] of Object.entries(raw.attendance)){if(!sids.has(sid)||!row||typeof row!=='object'||Array.isArray(row))throw Error('출석 회차 참조 오류');for(const [id,value] of Object.entries(row))if(!ids.has(id)||!['present','absent','exempt'].includes(value))throw Error('출석 상태 오류');}
 for(const [sid,row] of Object.entries(raw.participationModes)){if(!sids.has(sid)||!row||typeof row!=='object'||Array.isArray(row))throw Error('참여 방식 회차 오류');for(const [id,value] of Object.entries(row))if(!ids.has(id)||!['direct','auto','clone'].includes(value))throw Error('참여 방식 오류');}
 return raw;
}
function output(raw){const make=window.PARTY_ATTENDANCE_EXPORT?.createPayload;if(typeof make!=='function')throw Error('공개 출석 변환기를 불러오지 못했습니다.');const payload=make(validate(raw));if(payload.version!==2||payload.sessions.length<14||bytes(payload)>350000)throw Error('공개 출석 자료의 형식 또는 용량을 확인해 주세요.');return payload;}
async function readPair(){
 const [pr,pu]=await Promise.all([getDocFromServer(privateRef),getDocFromServer(publicRef)]);
 if(!pr.exists()||!pu.exists())throw Error('기존 Firebase 비공개/공개 출석 문서가 없습니다. 새 문서를 생성하지 않았습니다.');
 const a=pr.data(),b=pu.data(),raw=validate(a.data);
 if(!Number.isSafeInteger(a.revision)||a.revision<1||!Number.isSafeInteger(b.revision)||b.revision<1||b.format!=='party-attendance-public-v2')throw Error('원본/공개 장부 버전을 확인해 주세요.');
 const hash=await digest(raw),preview=output(raw);
 if(b.sourceRevision!==a.revision||b.sourceDataHash!==hash||!equal(stripTime(b.payload),stripTime(preview)))throw Error('원본과 공개 장부 내용이 달라 안전을 위해 편집을 중단했습니다.');
 return {raw,revision:a.revision,publicRevision:b.revision,hash};
}
function isDeputyDate(m,date){const from=m.eligibleFrom||m.joinDate||'';return !!(from&&date<from);}
function sessionList(content){return server?.raw.sessions.filter(s=>s.content===content).sort((a,b)=>b.date.localeCompare(a.date)||Number(b.round||0)-Number(a.round||0))||[];}
function selections(){
 const content=$('contentFilter').value,select=$('sessionSelect'),items=sessionList(content);
 select.replaceChildren();
 for(const s of items){const opt=document.createElement('option');opt.value=s.id;opt.textContent=`${s.date} · ${s.round||'?'}회차${s.startTime?' · '+s.startTime:''}`;select.append(opt);}
 if(items.some(s=>s.id===currentId))select.value=currentId;else currentId=items[0]?.id||'';
 if(currentId)select.value=currentId;
 $('newRound').value=String(Math.max(0,...items.map(s=>Number(s.round)||0))+1);
 renderMembers();
}
function selectedSession(){return server?.raw.sessions.find(s=>s.id===currentId)||null;}
function stateOf(member,s){
 const override=draft.get(member.id);if(override)return override;
 const value=server.raw.attendance[s.id]?.[member.id]||'';
 const mode=server.raw.participationModes[s.id]?.[member.id]||'';
 if(value==='present')return PVP.has(s.content)?(mode==='auto'?'auto':mode==='direct'?'direct':'unconfirmed'):'present';
 return value;
}
function editableMembers(s){const attendance=server.raw.attendance[s.id]||{};return server.raw.members.filter(m=>(m.active||Object.prototype.hasOwnProperty.call(attendance,m.id))&&!isDeputyDate(m,s.date));}
function renderMembers(){
 const grid=$('members');grid.replaceChildren();const s=selectedSession();
 $('revisionChip').textContent=server?`원본 v${server.revision}`:'불러오기 필요';
 if(!s){$('sessionTitle').textContent='선택할 회차가 없습니다. 새 회차를 등록해 주세요.';$('attendanceCount').textContent='';renderDraft();return;}
 $('sessionTitle').textContent=`${s.content} · ${s.date} · ${s.round||'?'}회차`;
 const members=editableMembers(s);
 const statuses=PVP.has(s.content)?[['','미입력'],['unconfirmed','참여 · 방식 미확인'],['direct','직접 참여'],['auto','오토 참여'],['absent','불참'],['exempt','제외']]:[['','미입력'],['present','참여 (반오토 포함)'],['absent','불참'],['exempt','제외']];
 let present=0,absent=0;
 for(const member of members){
  const value=stateOf(member,s);if(['direct','auto','present','unconfirmed'].includes(value))present++;else if(value==='absent')absent++;
  const row=document.createElement('div');row.className='member';
  const left=document.createElement('div'),name=document.createElement('strong');name.textContent=member.name;left.append(name);
  if(!member.active){const small=document.createElement('small');small.textContent='탈퇴 · 기존 기록';left.append(small);}
  const select=document.createElement('select');select.setAttribute('aria-label',member.name+' 출석 상태');
  for(const [key,label] of statuses){const opt=document.createElement('option');opt.value=key;opt.textContent=label;select.append(opt);}
  select.value=value;
  select.addEventListener('change',()=>{const next=select.value,previous=server.raw.attendance[s.id]?.[member.id]||'',oldMode=server.raw.participationModes[s.id]?.[member.id]||'';
   // Sunday clone (legacy) is shown as participating but kept unchanged unless explicitly edited.
   const prevText=previous==='present'?(PVP.has(s.content)?(oldMode==='auto'?'auto':oldMode==='direct'?'direct':'unconfirmed'):'present'):previous;
   if(next===prevText)draft.delete(member.id);else draft.set(member.id,next);
   renderDraft();renderCount();});
  row.append(left,select);grid.append(row);
 }
 function renderCount(){let p=0,a=0;for(const m of members){const st=stateOf(m,s);if(['present','direct','auto','unconfirmed'].includes(st))p++;if(st==='absent')a++;}$('attendanceCount').textContent=`참여 ${p}명 · 불참 ${a}명 · 미입력/제외 ${members.length-p-a}명`;}
 renderCount();renderDraft();
}
function renderDraft(){const n=draft.size;$('draftState').textContent=n?`저장하지 않은 변경 ${n}명 · 다른 회차로 이동하기 전 저장해 주세요.`:'변경 없음 · 상태를 바꾸면 저장할 수 있습니다.';$('saveAttendanceBtn').disabled=busy||!authorized||!currentId||!n;}
function controls(){
 const user=auth.currentUser;
 $('signInBtn').hidden=!!user;$('signOutBtn').hidden=!user;
 $('loadBtn').disabled=busy||!authorized;
 $('attendancePanel').hidden=!authorized||!server;
 $('deputyPanel').hidden=!isOwner();
 $('roleChip').textContent=isOwner()?'문주':authorized?'부문주':user?'권한 없음':'로그인 필요';
 document.querySelectorAll('#deputyPanel input,#deputyPanel button,#attendancePanel input,#attendancePanel button,#attendancePanel select').forEach(el=>el.disabled=busy);
 renderDraft();
}
async function checkAccess(){
 const token=sessionToken,user=auth.currentUser;authorized=false;server=null;draft.clear();controls();
 if(!user){status('Google 로그인 후 권한을 확인합니다.');return;}
 if(isOwner()){
  authorized=true;
  try{const docSnap=await getDocFromServer(accessRef);const email=docSnap.exists()?String(docSnap.data().deputyEmail||''):'';$('deputyEmail').value=email;$('deputyState').textContent=email?'현재 승인된 부문주: '+email:'승인된 부문주가 없습니다.';}
  catch(e){$('deputyState').textContent='권한 설정 문서를 읽지 못했습니다. Firebase 규칙을 확인해 주세요. '+msgError(e);}
 }else{
  try{const snap=await getDocFromServer(accessRef);authorized=!!(user.emailVerified&&snap.exists()&&String(snap.data().deputyEmail||'').toLowerCase()===String(user.email||'').toLowerCase());}
  catch{authorized=false;}
 }
 if(token!==sessionToken)return;
 controls();
 if(!authorized){status('이 계정은 출석 관리 권한이 없습니다. 문주가 부문주 Google 이메일을 승인한 후 다시 로그인해 주세요.','error');return;}
 await load();
}
async function load(){
 if(!authorized||busy)return;
 if(draft.size&&!confirm('저장되지 않은 출석 변경이 있습니다. 취소하고 Firebase 최신 자료를 불러올까요?'))return;
 const token=sessionToken;busy=true;controls();status('Firebase 서버의 출석 원본과 공개 장부를 확인하고 있습니다…');
 try{
  const latest=await readPair();if(token!==sessionToken)return;
  server=latest;draft.clear();
  if(!currentId||!latest.raw.sessions.some(s=>s.id===currentId)){currentId='';$('contentFilter').value='신기 쟁탈전';}
  selections();status(`출석 장부를 불러왔습니다. ${latest.raw.members.filter(m=>m.active).length}명 / ${latest.raw.sessions.length}회차 · Firebase v${latest.revision}`,'ok');
 }catch(e){if(token!==sessionToken)return;server=null;draft.clear();status('불러오기 중단: '+msgError(e)+'\n기존 출석 기록은 변경하지 않았습니다.','error');}
 finally{busy=false;controls();}
}
function modeOf(s,value){return PVP.has(s.content)?value==='auto'?'auto':'direct':'direct';}

async function mutate(change){
 if(!authorized||busy||!server)return;
 const start=server,token=sessionToken;
 busy=true;controls();status('Firebase 원본과 공개 장부에 저장 중입니다…');
 try{
  let updated;
  await runTransaction(db,async tx=>{
   const aSnap=await tx.get(privateRef),bSnap=await tx.get(publicRef);
   if(!aSnap.exists()||!bSnap.exists())throw Error('출석 문서가 삭제되어 저장할 수 없습니다.');
   const a=aSnap.data(),b=bSnap.data();
   if(a.revision!==start.revision||b.revision!==start.publicRevision)throw Error('다른 관리자가 먼저 저장했습니다. 최신 장부를 다시 불러와 주세요.');
   const previous=validate(a.data),hash=await digest(previous);
   if(hash!==start.hash||b.sourceRevision!==a.revision||b.sourceDataHash!==hash||!equal(stripTime(b.payload),stripTime(output(previous))))throw Error('원본·공개 출석 버전이 달라 저장하지 않았습니다.');
   const next=clone(previous);change(next);validate(next);
   if(!equal(previous.members,next.members))throw Error('문파원 가입·탈퇴 정보는 이 화면에서 수정할 수 없습니다.');
   if(next.sessions.length<previous.sessions.length||next.sessions.length>previous.sessions.length+1)throw Error('기존 회차는 삭제할 수 없고 새 회차는 한 번에 하나만 추가할 수 있습니다.');
   if(!equal(next.sessions.slice(0,previous.sessions.length),previous.sessions))throw Error('기존 회차 변경은 허용하지 않습니다.');
   if(bytes(next)>750000)throw Error('출석 장부 크기 제한을 초과했습니다.');
   if(equal(previous,next))throw Error('변경된 항목이 없습니다.');
   const payload=output(next),newHash=await digest(next);
   tx.update(privateRef,{revision:a.revision+1,data:next,updatedAt:serverTimestamp()});
   tx.update(publicRef,{revision:b.revision+1,sourceRevision:a.revision+1,sourceDataHash:newHash,payload,updatedAt:serverTimestamp()});
   updated={revision:a.revision+1,publicRevision:b.revision+1,newHash,next};
  },{maxAttempts:1});
  if(token!==sessionToken)return;
  // No success message until both documents are read back from the server.
  const latest=await readPair();
  if(latest.revision!==updated.revision||latest.publicRevision!==updated.publicRevision||latest.hash!==updated.newHash||!equal(latest.raw,updated.next))throw Error('저장 후 서버 재조회가 일치하지 않습니다. 자동 덮어쓰기를 막았습니다.');
  server=latest;draft.clear();selections();
  status(`저장 완료: Firebase 비공개·공개 장부 동기화 확인 (버전 ${latest.revision})`,'ok');
 }catch(e){server=null;draft.clear();status('저장 중단: '+msgError(e)+'\n기존 기록을 강제로 덮어쓰지 않았습니다. "최신 출석 불러오기"를 다시 눌러 주세요.','error');}
 finally{busy=false;controls();}
}
$('signInBtn').onclick=async()=>{try{await signInWithPopup(auth,new GoogleAuthProvider());}catch(e){status('로그인 실패: '+msgError(e),'error');}};
$('signOutBtn').onclick=async()=>{try{await signOut(auth);}catch(e){status('로그아웃 실패: '+msgError(e),'error');}};
$('loadBtn').onclick=load;
$('contentFilter').onchange=()=>{if(draft.size&&!confirm('저장하지 않은 변경을 버리고 다른 콘텐츠로 이동할까요?')){const s=selectedSession();if(s)$('contentFilter').value=s.content;return;}draft.clear();currentId='';selections();};
$('sessionSelect').onchange=()=>{if(draft.size&&!confirm('저장하지 않은 변경을 버리고 회차를 변경할까요?')){$('sessionSelect').value=currentId;return;}draft.clear();currentId=$('sessionSelect').value;renderMembers();};
$('reloadSessionBtn').onclick=()=>{if(draft.size&&!confirm('저장되지 않은 출석 변경을 버릴까요?'))return;draft.clear();renderMembers();};
$('addRoundToggle').onclick=()=>{$('newRoundBox').hidden=!$('newRoundBox').hidden;$('newDate').value=localDate();};
$('cancelRoundBtn').onclick=()=>{$('newRoundBox').hidden=true;};
$('saveAttendanceBtn').onclick=async()=>{
 const s=selectedSession();if(!s||!draft.size)return;
 // Freeze user-visible draft while the transaction is pending.
 const changed=new Map(draft);
 await mutate(next=>{
  const ids=new Set(editableMembers(s).map(m=>m.id));
  for(const id of changed.keys())if(!ids.has(id))throw Error('출석 대상이 아닌 문파원은 변경할 수 없습니다.');
  const row=next.attendance[s.id]??={},modes=next.participationModes[s.id]??={};
  for(const [id,choice] of changed){
   if(choice==='direct'||choice==='auto'||choice==='present'){row[id]='present';modes[id]=modeOf(s,choice);}
   else if(choice==='unconfirmed'){row[id]='present';delete modes[id];}
   else if(choice==='absent'||choice==='exempt'){row[id]=choice;delete modes[id];}
   else{delete row[id];delete modes[id];}
  }
 });
};
$('createRoundBtn').onclick=async()=>{
 if(draft.size){status('먼저 현재 회차의 출석 변경을 저장해 주세요.','error');return;}
 const content=$('contentFilter').value,date=$('newDate').value,time=$('newTime').value,memo=$('newMemo').value.trim(),round=Number($('newRound').value);
 if(!CONTENTS.includes(content)||!/^(20\d{2})-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(date)||!Number.isSafeInteger(round)||round<1||round>9999||(time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))||memo.length>70){status('날짜·회차 번호·시간·메모를 확인해 주세요.','error');return;}
 if(server.raw.sessions.some(s=>s.content===content&&s.round===round)){status('이미 같은 콘텐츠에 등록된 회차 번호입니다.','error');return;}
 const id=crypto.randomUUID(),label=`${round}회차${time?' / '+time+' 시작':''}${memo?' / '+memo:''}`;
 await mutate(next=>{
  if(next.sessions.some(s=>s.content===content&&s.round===round))throw Error('회차 번호가 중복되었습니다.');
  next.sessions.push({id,content,date,round,startTime:time,memo,label});
 });
 if(server){currentId=id;$('newRoundBox').hidden=true;selections();}
};
$('deputyForm').onsubmit=async e=>{
 e.preventDefault();if(!isOwner()||busy)return;
 const email=$('deputyEmail').value.trim().toLowerCase();if(!emailValid(email))return $('deputyState').textContent='올바른 Google 이메일을 입력해 주세요.';
 if(!confirm(`${email} 계정에 출석 체크 권한을 부여할까요?`))return;
 busy=true;controls();
 try{await setDoc(accessRef,{deputyEmail:email,updatedAt:serverTimestamp()});$('deputyState').textContent='부문주 출석 권한 저장 완료: '+email;}
 catch(e){$('deputyState').textContent='권한 설정 실패: '+msgError(e)+' (Firestore 규칙을 확인해 주세요.)';}
 finally{busy=false;controls();}
};
$('revokeDeputyBtn').onclick=async()=>{
 if(!isOwner()||busy||!confirm('부문주의 출석 관리 권한을 회수할까요?'))return;
 busy=true;controls();
 try{await setDoc(accessRef,{deputyEmail:'',updatedAt:serverTimestamp()});$('deputyEmail').value='';$('deputyState').textContent='부문주 출석 관리 권한을 회수했습니다.';}
 catch(e){$('deputyState').textContent='권한 회수 실패: '+msgError(e);}
 finally{busy=false;controls();}
};
onAuthStateChanged(auth,async()=>{++sessionToken;authorized=false;server=null;draft.clear();controls();try{await checkAccess();}catch(e){status('인증 확인 실패: '+msgError(e),'error');}});
controls();
