import { initializeApp, getApp, getApps } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
const config = {apiKey:'AIzaSyD_JzuNnKKuc-NU26KatxO2jqZCUVAebPE',authDomain:'party-guild.firebaseapp.com',projectId:'party-guild',storageBucket:'party-guild.firebasestorage.app',messagingSenderId:'465332308360',appId:'1:465332308360:web:50b5663dc1563df3d6923d'};
const OWNER_UID = 'KkmihHrjJ3X82JLrdzymrkEUZyE3';
const app = getApps().length ? getApp() : initializeApp(config);
const db = getFirestore(app), auth=getAuth(app);
const ref=doc(db,'publicContent','guildInfo');
const $=(id)=>document.getElementById(id);
const edit=!!$('guildInfoSave');
const status=(msg)=>{if($('guildInfoStatus')) $('guildInfoStatus').textContent=msg;};
const show=(info)=>{if(!info)return;
 const fields=edit?['quoteTitleInput','quoteSubtitleInput','note']:['quoteTitle','quoteSubtitle','note'];
 const values=[info.quoteTitle,info.quoteSubtitle,info.note];
 fields.forEach((id,i)=>{let el=$(id);if(!el||typeof values[i]!=='string')return;if(edit)el.value=values[i];else el.textContent=values[i];});
};
try {
 const snap=await getDoc(ref);
 if(snap.exists()){show(snap.data());status('☁ 저장된 문파 안내를 불러왔어.');}
 else status('아직 클라우드 문파 안내 없음 · 기존 안내 유지');
} catch(err){status('문파 안내 불러오기 실패: '+(err.message||err));}
if(edit){
 const btn=$('guildInfoSave');
 onAuthStateChanged(auth,user=>{
  btn.disabled=!(user && user.uid===OWNER_UID);
  if(user && user.uid===OWNER_UID){status('문주 로그인 확인 · 문파 안내를 저장할 수 있어.');}
  else status('문주 계정으로 Google 로그인하면 저장할 수 있어.');
 });
 btn.addEventListener('click',async()=>{
  const quoteTitle=$('quoteTitleInput').value.trim();
  const quoteSubtitle=$('quoteSubtitleInput').value.trim();
  const note=$('note').value.trim();
  if(!quoteTitle){status('큰 글씨를 입력해 줘.');return;}
  if(quoteTitle.length>100||quoteSubtitle.length>120||note.length>3000){status('글자 수 제한을 확인해 줘.');return;}
  if(!auth.currentUser || auth.currentUser.uid!==OWNER_UID){status('문주 로그인 후 저장할 수 있어.');return;}
  btn.disabled=true;status('저장하는 중...');
  try{await setDoc(ref,{quoteTitle,quoteSubtitle,note});status('✅ 문파 안내 저장 완료! 홈페이지에 반영돼.');}
  catch(err){status('❌ 저장 실패: '+(err.message||err));}
  finally{btn.disabled=!(auth.currentUser && auth.currentUser.uid===OWNER_UID);}
 });
}
