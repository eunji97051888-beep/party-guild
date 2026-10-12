import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,onAuthStateChanged,signOut} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import {getFirestore,doc,getDoc,setDoc} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
const config={apiKey:'AIzaSyD_JzuNnKKuc-NU26KatxO2jqZCUVAebPE',authDomain:'party-guild.firebaseapp.com',projectId:'party-guild',storageBucket:'party-guild.firebasestorage.app',messagingSenderId:'465332308360',appId:'1:465332308360:web:50b5663dc1563df3d6923d'};
const app=initializeApp(config),auth=getAuth(app),db=getFirestore(app);
const noticeRef=doc(db,'publicContent','notices');
const $=id=>document.getElementById(id);
const isAdminPage=!!$('firebaseSaveNotice');
function status(text,err=false){const el=$('firebaseNoticeStatus');if(el){el.textContent=text;el.style.color=err?'#ffbfbd':'#bfe2bd';}}
function order(ns){return ns.slice().sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned)||(b.date||'').localeCompare(a.date||''));}
function render(ns){const root=$('noticeItems');if(!root)return;root.replaceChildren();$('noticeCount').textContent=ns.length+'개 공지';if(!ns.length){const p=document.createElement('p');p.className='notice-empty';p.textContent='등록된 공지사항이 아직 없어요.';root.append(p);}for(const n of order(ns)){const item=document.createElement('article');item.className='notice-entry';const h=document.createElement('div');h.className='notice-entry-heading';if(n.pinned){const mark=document.createElement('span');mark.className='notice-pin';mark.textContent='중요';h.append(mark);}const t=document.createElement('h4');t.textContent=n.title;h.append(t);if(n.date){const d=document.createElement('time');d.textContent=n.date;d.dateTime=n.date;h.append(d);}const p=document.createElement('p');p.textContent=n.body;item.append(h,p);root.append(item);}}
let cloudPresent=false;
async function load(){try{const snap=await getDoc(noticeRef);if(!snap.exists()){status('Firebase 공지는 아직 없어. 현재 GitHub 공지를 유지 중이야.');return;}const data=snap.data();if(!Array.isArray(data.notices))throw new Error('클라우드 공지 형식이 잘못됐어.');cloudPresent=true;if(isAdminPage){const root=$('noticeRows');root.replaceChildren();for(const n of data.notices){const b=$('addNotice');b.click();const node=root.lastElementChild;node.querySelector('.notice-title').value=n.title||'';node.querySelector('.notice-body').value=n.body||'';node.querySelector('.notice-date').value=n.date||'';node.querySelector('.notice-pinned').checked=!!n.pinned;}status('Firebase에 저장된 공지를 불러왔어. 수정 후 Firebase 저장 버튼을 눌러줘.');}else render(data.notices);}catch(e){console.error(e);status('Firebase 공지를 불러오지 못했어: '+e.message,true);}}
if(isAdminPage){
 $('firebaseSaveNotice').disabled=true;
 $('firebaseSignIn').onclick=async()=>{try{await signInWithPopup(auth,new GoogleAuthProvider());}catch(e){status('로그인 실패: '+e.message,true);}};
 $('firebaseSignOut').onclick=async()=>{await signOut(auth);};
 onAuthStateChanged(auth,user=>{const el=$('firebaseAccount');if(user){el.textContent='로그인됨: '+(user.email||'Google 사용자');$('firebaseSignIn').hidden=true;$('firebaseSignOut').hidden=false;$('firebaseSaveNotice').disabled=false;}else{el.textContent='로그인이 필요해.';$('firebaseSignIn').hidden=false;$('firebaseSignOut').hidden=true;$('firebaseSaveNotice').disabled=true;}});
 $('firebaseSaveNotice').onclick=async()=>{if(!auth.currentUser){status('먼저 Google 로그인을 해줘.',true);return;}const list=[...$('noticeRows').children].map(el=>({title:el.querySelector('.notice-title').value.trim(),body:el.querySelector('.notice-body').value.trim(),date:el.querySelector('.notice-date').value,pinned:el.querySelector('.notice-pinned').checked}));if(list.some(n=>!n.title||!n.body)){status('모든 공지의 제목과 내용을 입력하거나 빈 공지를 삭제해 줘.',true);return;}const button=$('firebaseSaveNotice');button.disabled=true;try{await setDoc(noticeRef,{notices:list,updatedAt:new Date().toISOString()});cloudPresent=true;status('✅ Firebase에 공지를 저장했어! GitHub 업로드 없이 홈페이지에 반영돼.');}catch(e){console.error(e);status('저장 실패: '+e.message,true);}finally{button.disabled=false;}};
}
load();
