import {initializeApp,getApps,getApp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {getAuth,onAuthStateChanged,GoogleAuthProvider,signInWithPopup,signOut} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
const config={apiKey:'AIzaSyD_JzuNnKKuc-NU26KatxO2jqZCUVAebPE',authDomain:'party-guild.firebaseapp.com',projectId:'party-guild',storageBucket:'party-guild.firebasestorage.app',messagingSenderId:'465332308360',appId:'1:465332308360:web:50b5663dc1563df3d6923d'};
const ADMIN_UID='KkmihHrjJ3X82JLrdzymrkEUZyE3';
const login=document.getElementById('partyHeaderSignIn');
const logout=document.getElementById('partyHeaderSignOut');
const account=document.getElementById('partyHeaderAccount');
const admin=document.getElementById('partyAdminShortcut');
const host=document.getElementById('partyHeaderAuth');
if(login&&logout&&account&&admin&&host){
 const status=document.createElement('span');status.className='party-header-auth-note';status.setAttribute('role','status');host.appendChild(status);
 const say=message=>{status.textContent=message||'';};
 const sync=user=>{
   login.hidden=!!user;logout.hidden=!user;account.hidden=!user;
   account.textContent=user?(user.displayName||user.email||'로그인됨'):'';
   account.title=user?.email||'';
   admin.hidden=user?.uid!==ADMIN_UID;
 };
 sync(null);
 try{
   const app=getApps().length?getApp():initializeApp(config);
   const auth=getAuth(app);
   onAuthStateChanged(auth,user=>{sync(user);say('');},err=>{sync(null);say('로그인 상태 확인 오류: '+err.message);});
   login.addEventListener('click',async()=>{
     login.disabled=true;say('Google 로그인 창을 여는 중…');
     try{const provider=new GoogleAuthProvider();await signInWithPopup(auth,provider);say('');}
     catch(err){console.error('파티 Google 로그인 실패',err);say('로그인 실패: '+(err.code||err.message||'알 수 없는 오류')+' · Chrome/Safari에서 직접 열고 다시 시도해 주세요.');}
     finally{login.disabled=false;}
   });
   logout.addEventListener('click',async()=>{
     logout.disabled=true;try{await signOut(auth);say('로그아웃했어.');}
     catch(err){say('로그아웃 실패: '+(err.code||err.message));}
     finally{logout.disabled=false;}
   });
 }catch(err){console.error('파티 인증 모듈 초기화 실패',err);say('인증 초기화 오류: '+err.message);}
}
