import {initializeApp,getApps,getApp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import {getFirestore,doc,getDoc,setDoc} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
const cfg={apiKey:'AIzaSyD_JzuNnKKuc-NU26KatxO2jqZCUVAebPE',authDomain:'party-guild.firebaseapp.com',projectId:'party-guild',storageBucket:'party-guild.firebasestorage.app',messagingSenderId:'465332308360',appId:'1:465332308360:web:50b5663dc1563df3d6923d'};
const app=getApps().length?getApp():initializeApp(cfg),auth=getAuth(app),db=getFirestore(app);
const $=id=>document.getElementById(id),admin=Boolean($('firebaseSaveResources'));
const refs={link:doc(db,'publicContent','resources'),video:doc(db,'publicContent','videos')};
const urlOK=value=>{try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!!u.hostname}catch{return false}};
function youtubeID(value){try{const u=new URL(value),h=u.hostname.toLowerCase().replace(/^www\./,'').replace(/^m\./,'');let id='';if(h==='youtu.be')id=u.pathname.split('/')[1]||'';else if(['youtube.com','youtube-nocookie.com','music.youtube.com'].includes(h)){if(u.pathname==='/watch')id=u.searchParams.get('v')||'';else if(/^\/(shorts|embed|live)\//.test(u.pathname))id=u.pathname.split('/')[2]||'';}return /^[\w-]{11}$/.test(id)?id:null;}catch{return null}}
function state(kind,msg,error=false){const el=$(kind==='link'?'firebaseResourceStatus':'firebaseVideoStatus');if(el){el.textContent=msg;el.style.color=error?'#ffb8b8':'#bfe2bd'}}
let loaded={link:null,video:null};const fallback=window.PARTY_DEFAULT||{};
async function load(kind){try{const snap=await getDoc(refs[kind]);if(!snap.exists()){state(kind,'기존 GitHub '+(kind==='link'?'자료실':'영상')+'을 유지하고 있어.');return;}
const arr=snap.data().items;if(!Array.isArray(arr))throw Error('데이터 형식 오류');loaded[kind]=arr;
if(admin){if(typeof window.PARTY_SET_MEDIA_EDITOR==='function')window.PARTY_SET_MEDIA_EDITOR(kind,arr);state(kind,'✅ Firebase 자료를 불러왔어.');}
else{const links=loaded.link??fallback.resources??[];const videos=loaded.video??fallback.videos??window.PARTY_VIDEOS??[];window.PARTY_RENDER_MEDIA?.(links,videos);}
}catch(e){console.error(e);state(kind,'불러오기 실패: '+e.message,true)}}
if(admin){onAuthStateChanged(auth,user=>{for(const kind of ['link','video'])$(kind==='link'?'firebaseSaveResources':'firebaseSaveVideos').disabled=!user;});
for(const kind of ['link','video'])$(kind==='link'?'firebaseSaveResources':'firebaseSaveVideos').onclick=async()=>{
if(!auth.currentUser){state(kind,'먼저 공지 영역에서 Google 로그인해 줘.',true);return;}
const root=$(kind==='link'?'linkRows':'videoRows');const items=[...root.children].map(node=>({title:node.querySelector('.item-title').value.trim(),url:node.querySelector('.item-url').value.trim(),...(kind==='link'?{description:node.querySelector('.item-description').value.trim(),image:node.querySelector('.item-image').value.trim()}:{} )}));
if(items.some(v=>!v.title||!urlOK(v.url)||(kind==='link'&&v.image&&!urlOK(v.image))||(kind==='video'&&!youtubeID(v.url)))){state(kind,'제목·주소를 확인해 줘. 유튜브는 실제 영상 링크만 가능해.',true);return;}
const button=$(kind==='link'?'firebaseSaveResources':'firebaseSaveVideos');if(!confirm((kind==='link'?'자료실':'유튜브 영상')+' '+items.length+'개를 Firebase에 저장할까?'))return;
button.disabled=true;state(kind,'저장 중...');try{await setDoc(refs[kind],{items,updatedAt:new Date().toISOString()});loaded[kind]=items;state(kind,'✅ 저장 완료! GitHub 업로드 없이 홈페이지에 반영돼.');}catch(e){console.error(e);state(kind,'저장 실패: '+e.message,true)}finally{button.disabled=!auth.currentUser;}
};}
await Promise.all([load('link'),load('video')]);
