// PARTY guild · shared Firebase client. No writes are performed by this module.
import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import {getFirestore,doc,getDocFromServer,onSnapshot,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
const config={apiKey:'AIzaSyD_JzuNnKKuc-NU26KatxO2jqZCUVAebPE',authDomain:'party-guild.firebaseapp.com',projectId:'party-guild',storageBucket:'party-guild.firebasestorage.app',messagingSenderId:'465332308360',appId:'1:465332308360:web:50b5663dc1563df3d6923d'};
const ADMIN_UID='KkmihHrjJ3X82JLrdzymrkEUZyE3';
const app=getApps().find(a=>a.name==='party-integrated-live-v1')||initializeApp(config,'party-integrated-live-v1');
const auth=getAuth(app),db=getFirestore(app);
const refs={attendance:doc(db,'guildPrivate','attendanceLiveV1'),attendancePublic:doc(db,'publicContent','attendancePublicLiveV1'),rewards:doc(db,'guildPrivate','rewardsLiveV1'),legacyRewards:doc(db,'guildPrivate','rewardsBackup'),draws:doc(db,'publicContent','lotteryResultsLiveV1'),balances:doc(db,'publicContent','lotteryBalancesLiveV1')};
const isAdmin=()=>auth.currentUser?.uid===ADMIN_UID;
function waitAuth(){return new Promise(resolve=>{const unsub=onAuthStateChanged(auth,()=>{unsub();resolve(auth.currentUser)});});}
async function login(){if(isAdmin())return true;await signInWithPopup(auth,new GoogleAuthProvider());if(!isAdmin())throw Error('문주 관리자 계정으로 로그인해야 해.');return true;}
async function read(ref){return getDocFromServer(ref);}
function asJSON(obj){return JSON.parse(JSON.stringify(obj));}
export {auth,db,refs,isAdmin,waitAuth,login,read,onSnapshot,runTransaction,serverTimestamp,asJSON};
