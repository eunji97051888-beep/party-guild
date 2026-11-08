// PARTY content cloud v2: three independent documents, no legacy writes.
import {db,isAdmin,login,waitAuth,read,onSnapshot,runTransaction,serverTimestamp,asJSON} from './party-firebase-shared.js';
import {doc} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
const definitions={
 home:{name:'문파 공지·안내·일정·자료실·유튜브',ref:doc(db,'publicContent','siteHomeLiveV1'),history:'siteHome'},
 activity:{name:'문파 활동 소식',ref:doc(db,'publicContent','activityNewsLiveV1'),history:'activityNews'},
 weekly:{name:'주간 플래너',ref:doc(db,'publicContent','weeklyBoardLiveV1'),history:'weeklyBoard'},
 builds:{name:'검증 도술빌드',ref:doc(db,'publicContent','partyBuildsLiveV1'),history:'partyBuilds'}
};
function validate(kind,v){
 if(kind==='home'){
  if(!v||typeof v!=='object'||!Array.isArray(v.events)||!Array.isArray(v.notices)||!Array.isArray(v.resources)||!Array.isArray(v.videos)||typeof v.note!=='string'||v.events.length>150||v.notices.length>300||v.resources.length>150||v.videos.length>150)throw Error('문파 안내 데이터 구조 오류');
  if(v.notices.some(n=>!n||typeof n.title!=='string'||typeof n.body!=='string')||v.events.some(e=>!e||!Array.isArray(e.days)))throw Error('공지 또는 일정 형식 오류');
 }else if(kind==='activity'){
  if(!Array.isArray(v)||v.length>180||v.some(p=>!p||typeof p.id!=='string'||typeof p.title!=='string'||typeof p.date!=='string'||!Array.isArray(p.photos)||p.photos.length>3))throw Error('활동 소식 데이터 구조 오류');
  if(v.some(p=>p.photos.some(x=>typeof x!=='string'||!/^data:image\/(jpeg|png|webp);base64,/i.test(x))))throw Error('소식 사진 자료 오류');
 }else if(kind==='builds'){
  if(!Array.isArray(v)||v.length>120||v.some(p=>!p||typeof p.id!=='string'||!p.id||typeof p.title!=='string'||!p.title.trim()||p.title.length>100||typeof p.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(p.date)||typeof p.body!=='string'||p.body.length>5000||typeof p.image!=='string'))throw Error('도술빌드 데이터 구조 오류');
  const ids=v.map(p=>p.id);if(new Set(ids).size!==ids.length)throw Error('빌드 식별자가 중복됐어.');
  if(v.some(p=>p.image && !/^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(p.image) && !/^(?:\.\/?|[\w-])[\w./%()\- ]+\.(?:png|jpg|jpeg|webp)(?:\?v=\d+)?$/i.test(p.image)))throw Error('이미지 자료 형식 오류');
 }else if(kind==='weekly'){
  if(!v||v.version!==2||!Array.isArray(v.items)||v.items.length>60||v.items.some(i=>!i||typeof i.title!=='string'||!i.title.trim()||!Array.isArray(i.days)||i.days.some(d=>!Number.isInteger(d)||d<0||d>6)))throw Error('플래너 데이터 형식 오류');
 }else throw Error('알 수 없는 장부 종류');
 const data=asJSON(v);const bytes=new Blob([JSON.stringify(data)]).size;
 if(bytes>700000)throw Error('데이터가 '+Math.round(bytes/1024)+'KB로 커서 Firebase 안전 한도(700KB)를 넘었어. 사진을 줄이거나 별도 파일 저장이 필요해. 이번 자료는 저장하지 않았어.');
 return data;
}
function canonical(x){if(Array.isArray(x))return x.map(canonical);if(x&&typeof x==='object')return Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])]));return x;}
function same(a,b){return JSON.stringify(canonical(a))===JSON.stringify(canonical(b));}
async function save(kind,data,revision){
 if(!isAdmin())throw Error('문주 관리자 로그인이 필요해.');
 const def=definitions[kind],clean=validate(kind,data);
 if(!Number.isSafeInteger(revision)||revision<1)throw Error('기존 서버 문서의 버전을 먼저 조회해.');
 const audit=doc(db,'guildPrivate',`contentHistory_${def.history}_${String(revision).padStart(8,'0')}`);
 await runTransaction(db,async tx=>{
  const current=await tx.get(def.ref),prior=await tx.get(audit);
  if(!current.exists()||current.data().revision!==revision)throw Error('다른 탭의 변경이 감지되어 저장을 차단했어. 서버 데이터를 다시 확인해.');
  if(prior.exists())throw Error('기존 백업 버전이 있어서 기록을 덮어쓰지 않아.');
  tx.set(audit,{format:'party-content-history-v1',kind,revision,data:current.data().data,archivedAt:serverTimestamp()});
  tx.set(def.ref,{format:'party-content-'+kind+'-v1',revision:revision+1,data:clean,updatedAt:serverTimestamp()});
 });
 const checked=await read(def.ref);
 if(!checked.exists()||checked.data().revision!==revision+1||!same(checked.data().data,clean))throw Error('서버 재조회 일치 검증 실패. 다시 저장하기 전에 문서를 확인해.');
 return revision+1;
}
export {db,definitions,isAdmin,login,waitAuth,read,onSnapshot,runTransaction,serverTimestamp,validate,same,save};
