// V22: the gate is drawn before Firebase libraries load, so a failed import cannot leave a blank page.
const ADMIN_UID='KkmihHrjJ3X82JLrdzymrkEUZyE3';
let gate=document.getElementById('partyAdminGate');
if(!gate){gate=document.createElement('div');gate.id='partyAdminGate';document.body.append(gate);}
gate.style.cssText='position:fixed;inset:0;z-index:999999;background:#111a30;color:#f1d3a1;display:grid;place-items:center;padding:18px;font-family:sans-serif;text-align:center';
const shell=document.createElement('section');shell.style.maxWidth='440px';
const heading=document.createElement('h2');heading.textContent='⚔ 문주 전용 관리자';
const status=document.createElement('p');status.textContent='로그인 상태를 확인하는 중…';
const login=document.createElement('button');login.type='button';login.textContent='문주 Google 로그인';login.hidden=true;login.style.cssText='padding:13px 18px;border-radius:8px;background:#d6ad66;color:#211708;font-weight:800;border:0;cursor:pointer';
const home=document.createElement('p');const link=document.createElement('a');link.href='index.html';link.textContent='← 홈페이지';link.style.color='#f6d5a0';home.append(link);
shell.append(heading,status,login,home);gate.replaceChildren(shell);
try {
 const [{initializeApp,getApps,getApp},{getAuth,onAuthStateChanged,GoogleAuthProvider,signInWithPopup}]=await Promise.all([
   import('https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js'),
   import('https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js')]);
 const cfg={apiKey:'AIzaSyD_JzuNnKKuc-NU26KatxO2jqZCUVAebPE',authDomain:'party-guild.firebaseapp.com',projectId:'party-guild',storageBucket:'party-guild.firebasestorage.app',messagingSenderId:'465332308360',appId:'1:465332308360:web:50b5663dc1563df3d6923d'};
 const app=getApps().length?getApp():initializeApp(cfg),auth=getAuth(app);
 onAuthStateChanged(auth,user=>{
   if(user?.uid===ADMIN_UID){document.body.classList.remove('party-admin-await-auth');gate.remove();}
   else {status.textContent=user?'현재 Google 계정은 문주 계정이 아니야.':'문주 Google 계정으로 로그인해 줘.';login.hidden=!!user;}
 },err=>{status.textContent='인증 확인 실패: '+err.message;login.hidden=false;});
 login.addEventListener('click',async()=>{login.disabled=true;status.textContent='Google 로그인 중…';try{await signInWithPopup(auth,new GoogleAuthProvider());}catch(e){status.textContent='Google 로그인 실패: '+e.message;}finally{login.disabled=false;}});
}catch(e){status.textContent='인증 모듈 실행 오류: '+(e?.message||String(e));login.hidden=true;}
