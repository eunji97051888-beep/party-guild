import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import {getFirestore,doc,getDoc,setDoc} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
const config={apiKey:'AIzaSyD_JzuNnKKuc-NU26KatxO2jqZCUVAebPE',authDomain:'party-guild.firebaseapp.com',projectId:'party-guild',storageBucket:'party-guild.firebasestorage.app',messagingSenderId:'465332308360',appId:'1:465332308360:web:50b5663dc1563df3d6923d'};
const app=initializeApp(config),auth=getAuth(app),db=getFirestore(app);
const scheduleRef=doc(db,'publicContent','schedule');
const $=id=>document.getElementById(id);
const admin=!!$('firebaseSaveSchedule');
function status(msg,err=false){const el=$('firebaseScheduleStatus');if(el){el.textContent=msg;el.style.color=err?'#ffbfbd':'#bfe2bd';}}
function validate(e){return Array.isArray(e.days)&&e.days.length>0&&e.days.every(d=>Number.isInteger(d)&&d>=0&&d<=6)&&typeof e.time==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(e.time)&&typeof e.name==='string'&&e.name.trim().length>0&&typeof e.type==='string'&&e.type.trim().length>0;}
async function load(){try{const snap=await getDoc(scheduleRef);if(!snap.exists()){status('Firebase 일정이 아직 없어. 현재 GitHub 일정표를 그대로 유지하고 있어.');return;}
 const list=snap.data().events;if(!Array.isArray(list)||!list.every(validate))throw new Error('저장된 일정 형식을 확인해야 해.');
 if(admin){if(typeof window.PARTY_SET_SCHEDULE_EDITOR!=='function')throw new Error('기존 일정 편집기 로딩 실패');window.PARTY_SET_SCHEDULE_EDITOR(list);status('✅ 클라우드 일정을 불러왔어. 수정 후 Firebase에 일정 저장을 눌러줘.');}
 else {if(typeof window.PARTY_SET_SCHEDULE!=='function')throw new Error('홈페이지 일정 표시 로딩 실패');window.PARTY_SET_SCHEDULE(list);}
 }catch(e){console.error(e);status('Firebase 일정 불러오기 실패: '+e.message,true);}}
if(admin){
 const btn=$('firebaseSaveSchedule');
 onAuthStateChanged(auth,u=>{btn.disabled=!u;});
 btn.addEventListener('click',async()=>{
  if(!auth.currentUser){status('먼저 아래쪽 Google 로그인 버튼으로 로그인해 줘.',true);return;}
  const rows=[...$('rows').children];
  const events=rows.map(el=>({days:[...el.querySelectorAll('.week-check input[type="checkbox"]:checked')].map(x=>Number(x.value)),time:el.querySelector('.time').value,name:el.querySelector('.name').value.trim(),type:el.querySelector('.kind').value.trim()}));
  if(!events.every(validate)){status('저장 중단: 일정마다 요일·시간·이름·종류를 모두 입력해 줘.',true);return;}
  if(!confirm('요일별 일정 '+events.length+'개를 Firebase에 저장할까? 저장하면 방문자 화면에 바로 반영돼.'))return;
  btn.disabled=true;status('Firebase에 일정을 저장 중...');
  try{await setDoc(scheduleRef,{events,updatedAt:new Date().toISOString()});status('✅ 저장 성공! GitHub 파일 업로드 없이 홈페이지 일정에 반영돼.');}
  catch(e){console.error(e);status('일정 저장 실패: '+e.message,true);}
  finally{btn.disabled=!auth.currentUser;}
 });
}
load();
