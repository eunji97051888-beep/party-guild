import {initializeApp,getApps,getApp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,onAuthStateChanged,signOut} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import {getFirestore,doc,getDoc,setDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
const config={apiKey:'AIzaSyD_JzuNnKKuc-NU26KatxO2jqZCUVAebPE',authDomain:'party-guild.firebaseapp.com',projectId:'party-guild',storageBucket:'party-guild.firebasestorage.app',messagingSenderId:'465332308360',appId:'1:465332308360:web:50b5663dc1563df3d6923d'};
const app=getApps().find(a=>a.name==='party-attendance-cloud')||initializeApp(config,'party-attendance-cloud');
const auth=getAuth(app),db=getFirestore(app),backupRef=doc(db,'guildPrivate','attendanceBackup');
const KEY='party-guild-v11-attendance';
const $=id=>document.getElementById(id), status=$('cloudAttendanceStatus');
const login=$('cloudAttendanceLogin'),logout=$('cloudAttendanceLogout'),upload=$('cloudAttendanceUpload'),restore=$('cloudAttendanceRestore');
function note(t,error=false){status.textContent=t;status.style.color=error?'#ffadad':'#a9e3c0'}
function validate(v){
 if(!v||typeof v!=='object'||!Array.isArray(v.members)||!Array.isArray(v.sessions)||!v.attendance||typeof v.attendance!=='object'||Array.isArray(v.attendance))throw Error('출석 백업 형식이 올바르지 않아.');
 if(v.members.length>500||v.sessions.length>5000)throw Error('기록 개수가 허용 범위를 넘어.');
 for(const m of v.members){if(typeof m.id!=='string'||typeof m.name!=='string'||typeof m.active!=='boolean')throw Error('문파원 데이터 형식 오류');}
 for(const s of v.sessions){if(typeof s.id!=='string'||typeof s.content!=='string'||typeof s.date!=='string'||typeof s.label!=='string')throw Error('회차 데이터 형식 오류');}
 return v;
}
function downloadBackup(raw){const blob=new Blob([raw],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='party-attendance-before-cloud-restore-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000)}
function busy(is){upload.disabled=is||!auth.currentUser;restore.disabled=is||!auth.currentUser;login.disabled=is;logout.disabled=is}
onAuthStateChanged(auth,u=>{upload.disabled=restore.disabled=!u;login.hidden=!!u;logout.hidden=!u;note(u?'Google 로그인 완료 · 클라우드 백업 또는 복원을 선택할 수 있어.':'Google 로그인 후 사용할 수 있어.');});
login.onclick=async()=>{try{busy(true);await signInWithPopup(auth,new GoogleAuthProvider());}catch(e){note('로그인 실패: '+e.message,true)}finally{busy(false)}};
logout.onclick=async()=>{try{await signOut(auth)}catch(e){note('로그아웃 실패: '+e.message,true)}};
upload.onclick=async()=>{if(!auth.currentUser)return note('먼저 로그인해 줘.',true);let raw;try{raw=localStorage.getItem(KEY);if(!raw)throw Error('현재 브라우저에는 저장된 출석 기록이 없어.');const parsed=validate(JSON.parse(raw));if(!parsed.members.length&&!parsed.sessions.length)throw Error('문파원과 출석 기록이 비어 있어. 빈 데이터는 업로드하지 않을게.');if(new Blob([raw]).size>700000)throw Error('기록이 700KB를 초과했어. JSON 백업을 사용해 줘.');}catch(e){return note(e.message,true)}
 if(!confirm('현재 PC의 출석 기록을 Firebase 클라우드에 백업할까? 기존 클라우드 출석 백업이 있다면 덮어써져.'))return;
 try{busy(true);await setDoc(backupRef,{data:JSON.parse(raw),updatedAt:serverTimestamp(),schemaVersion:1});note('☁ 클라우드 백업 완료! 이제 다른 PC에서 불러올 수 있어.')}catch(e){note('클라우드 백업 실패: '+e.message,true)}finally{busy(false)}};
restore.onclick=async()=>{if(!auth.currentUser)return note('먼저 로그인해 줘.',true);try{busy(true);const snap=await getDoc(backupRef);if(!snap.exists())throw Error('아직 클라우드 출석 백업이 없어.');const incoming=validate(snap.data().data);const raw=JSON.stringify(incoming);if(!confirm('클라우드 기록으로 이 PC의 출석 기록을 교체할까? 기존 기록은 먼저 JSON 파일로 다운로드돼.'))return;
 const old=localStorage.getItem(KEY);if(old){try{downloadBackup(old)}catch(e){throw Error('기존 기록 백업 다운로드 실패. 복원 중단: '+e.message)}}
 try{localStorage.setItem(KEY,raw)}catch(e){throw Error('브라우저 저장 실패: '+e.message)}
 note('복원 완료. 새로고침해 출석 목록을 불러올게.');location.reload();
 }catch(e){note('클라우드 불러오기 실패: '+e.message,true)}finally{busy(false)}};
