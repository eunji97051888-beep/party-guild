import {initializeApp,getApp,getApps} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {getAuth,onAuthStateChanged,GoogleAuthProvider,signInWithPopup} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import {getFirestore,doc,getDoc,setDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import {getStorage,ref,uploadBytes,getDownloadURL} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-storage.js';
const config={apiKey:'AIzaSyD_JzuNnKKuc-NU26KatxO2jqZCUVAebPE',authDomain:'party-guild.firebaseapp.com',projectId:'party-guild',storageBucket:'party-guild.firebasestorage.app',messagingSenderId:'465332308360',appId:'1:465332308360:web:50b5663dc1563df3d6923d'};
const app=getApps().length?getApp():initializeApp(config),auth=getAuth(app),db=getFirestore(app),storage=getStorage(app);
const docRef=doc(db,'publicContent','weeklyPlanner');
const OWNER_UID='KkmihHrjJ3X82JLrdzymrkEUZyE3';
const img=document.getElementById('weeklyImage'),light=document.getElementById('lightImg');
if(img){try{const snap=await getDoc(docRef);if(snap.exists()&&typeof snap.data().path==='string'&&snap.data().path.startsWith('weekly-planner/')){const url=await getDownloadURL(ref(storage,snap.data().path));img.src=url;if(light)light.src=url}}catch(err){console.warn('주간 플래너 클라우드 로드 실패. 기존 weekly.png 사용:',err)}}
