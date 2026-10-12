import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,onAuthStateChanged,signOut} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import {getFirestore,doc,getDoc,setDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';

// 공개 가능한 Firebase 웹 앱 설정. 실제 접근 권한은 Firestore 보안 규칙에서 강제함.
const config={apiKey:'AIzaSyD_JzuNnKKuc-NU26KatxO2jqZCUVAebPE',authDomain:'party-guild.firebaseapp.com',projectId:'party-guild',storageBucket:'party-guild.firebasestorage.app',messagingSenderId:'465332308360',appId:'1:465332308360:web:50b5663dc1563df3d6923d'};
const app=getApps().find(a=>a.name==='party-rewards-cloud')||initializeApp(config,'party-rewards-cloud');
const auth=getAuth(app),db=getFirestore(app),backupRef=doc(db,'guildPrivate','rewardsBackup');
const KEY='party-guild-v12-rewards';
const $=id=>document.getElementById(id);
const status=$('cloudRewardsStatus'),login=$('cloudRewardsLogin'),logout=$('cloudRewardsLogout'),upload=$('cloudRewardsUpload'),restore=$('cloudRewardsRestore');
let working=false;
function note(t,error=false){status.textContent=t;status.style.color=error?'#ffadad':'#a9e3c0'}
const backupLabel='보상 장부';
function recordSummary(v){
 if(!v||typeof v!=='object')return '내용 확인 불가';
 return `아이템 ${v.items.length}개 · 구매 요청 ${v.requests.length}건 · 장부 기록 ${v.ledger.length}건`;
}
function cloudDescription(d){
 const stamp=d?.updatedAt?.toDate?.();
 const when=stamp?stamp.toLocaleString('ko-KR'): '백업 시각 미기록';
 return `${when} · ${recordSummary(d.data)}`;
}
let latestCloud=null;
async function showCloudInfo(){
 if(!auth.currentUser)return;
 try{const snap=await getDoc(backupRef);latestCloud=snap.exists()?snap.data():null;note(latestCloud?`☁ 마지막 클라우드 백업: ${cloudDescription(latestCloud)}`:'☁ 아직 클라우드 백업이 없어.');}
 catch(e){note('클라우드 백업 상태 확인 실패: '+e.message,true)}
}

function validate(s){
 if(!s||s.version!==1||!Number.isSafeInteger(s.balance)||s.balance<0||!Array.isArray(s.items)||!Array.isArray(s.requests)||!Array.isArray(s.ledger)||s.items.length>1000||s.requests.length>10000||s.ledger.length>30000)throw Error('보상 장부 데이터 형식 오류');
 for(const i of s.items){if(typeof i.id!=='string'||typeof i.name!=='string'||i.name.length>80||!Number.isSafeInteger(i.price)||i.price<0||!Number.isSafeInteger(i.stock)||i.stock<0)throw Error('아이템 형식 오류')}
 for(const r of s.requests){if(typeof r.id!=='string'||typeof r.memberId!=='string'||typeof r.memberName!=='string'||typeof r.itemName!=='string'||!Number.isSafeInteger(r.qty)||r.qty<1||!['requested','purchased','paid'].includes(r.status)||typeof r.date!=='string'||(r.price!==undefined&&(!Number.isSafeInteger(r.price)||r.price<0)))throw Error('지급 요청 형식 오류')}
 for(const l of s.ledger){if(typeof l.date!=='string'||typeof l.note!=='string'||!Number.isSafeInteger(l.change)||!Number.isSafeInteger(l.after))throw Error('장부 기록 형식 오류')}
 return s;
}
function buttons(){const logged=!!auth.currentUser;login.hidden=logged;logout.hidden=!logged;login.disabled=working;logout.disabled=working;upload.disabled=working||!logged;restore.disabled=working||!logged}
function busy(v){working=v;buttons()}
function downloadBackup(raw){const blob=new Blob([raw],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='party-rewards-before-cloud-restore-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000)}
onAuthStateChanged(auth,u=>{buttons();note(u?'클라우드 백업 상태 확인 중…':'Google 로그인 후 사용할 수 있어.');if(u)showCloudInfo();else latestCloud=null});
login.onclick=async()=>{try{busy(true);await signInWithPopup(auth,new GoogleAuthProvider())}catch(e){note('로그인 실패: '+e.message,true)}finally{busy(false)}};
logout.onclick=async()=>{try{await signOut(auth)}catch(e){note('로그아웃 실패: '+e.message,true)}};
upload.onclick=async()=>{
 if(!auth.currentUser)return note('먼저 로그인해 줘.',true);
 let raw,parsed;
 try{raw=localStorage.getItem(KEY);if(!raw)throw Error('이 브라우저에는 아직 보상 장부 저장 기록이 없어.');parsed=validate(JSON.parse(raw));if(parsed.items.length===0&&parsed.requests.length===0&&parsed.ledger.length===0&&parsed.balance===0)throw Error('비어 있는 장부는 클라우드에 백업하지 않을게.');if(new Blob([raw]).size>700000)throw Error('장부가 700KB를 초과했어. JSON 파일로 먼저 보관하고 문의해 줘.')}catch(e){return note(e.message,true)}
 try{const snap=await getDoc(backupRef);latestCloud=snap.exists()?snap.data():null;}catch(e){return note('덮어쓰기 전 클라우드 상태 확인 실패: '+e.message,true)}
 if(!confirm(latestCloud?`현재 PC의 ${recordSummary(parsed)} 기록으로 클라우드 보상 백업을 덮어쓸까?\n\n기존 클라우드 백업: ${cloudDescription(latestCloud)}\n\n기존 백업 내용은 교체돼.`:`현재 PC의 ${recordSummary(parsed)} 기록을 처음으로 클라우드에 백업할까?`))return;
 try{busy(true);await setDoc(backupRef,{data:parsed,updatedAt:serverTimestamp(),schemaVersion:1});await showCloudInfo()}catch(e){note('클라우드 백업 실패: '+e.message,true)}finally{busy(false)}
};
restore.onclick=async()=>{
 if(!auth.currentUser)return note('먼저 로그인해 줘.',true);
 try{busy(true);const snap=await getDoc(backupRef);if(!snap.exists())throw Error('클라우드에 보상 장부 백업이 아직 없어.');const incoming=validate(snap.data().data),raw=JSON.stringify(incoming);
 if(!confirm(`클라우드 보상 장부를 이 PC에 불러올까?\n\n${cloudDescription(snap.data())}\n\n현재 PC 장부는 교체되며, 기존 기록이 있으면 JSON 다운로드를 먼저 시도해.`))return;
 const old=localStorage.getItem(KEY);if(old){try{downloadBackup(old)}catch(e){throw Error('기존 장부 JSON 백업 다운로드 실패. 복원을 중단했어: '+e.message)}}
 try{localStorage.setItem(KEY,raw)}catch(e){throw Error('브라우저 장부 저장 실패: '+e.message)}
 note('☁ 불러오기 완료! 변경된 장부를 보여주기 위해 새로고침할게.');location.reload();
 }catch(e){note('클라우드 불러오기 실패: '+e.message,true)}finally{busy(false)}
};
