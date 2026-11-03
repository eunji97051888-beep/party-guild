import {definitions,isAdmin,waitAuth,login,read,validate,save,same} from './party-content-cloud-core.js';
const $=id=>document.getElementById(id);
const kind=$('partyHomeCloudArea')?'home':$('partyActivityCloudStatus')?'activity':$('partyWeeklyCloudStatus')?'weekly':null;
if(kind){
 const cap={home:'Home',activity:'Activity',weekly:'Weekly'}[kind],api=()=>kind==='home'?window.PARTY_GUILD_HOME_EDITOR:kind==='activity'?window.PARTY_ACTIVITY_EDITOR:window.PARTY_WEEKLY_EDITOR;
 const status=$('party'+cap+'CloudStatus'),saveButton=$('party'+cap+'CloudSave'),loginButton=$('party'+cap+'CloudLogin'),loadButton=$('party'+cap+'CloudLoad');
 let revision=null,blocked=false,busy=false,queued=false,lastData=null;
 const msg=(s,bad=false)=>{status.textContent=s;status.style.color=bad?'#ffb0a7':'#bee8bd'};
 const controls=()=>{saveButton.disabled=!isAdmin()||revision===null||blocked||busy;loadButton.disabled=busy;};
 function lock(on){try{api()?.lock(on)}catch(e){msg('편집기 잠금 오류: '+e.message,true)}controls()}
 async function load(){
  if(!isAdmin()){lock(true);return msg('Google 문주 계정으로 로그인한 뒤 Firebase 장부를 불러와 줘.');}
  if(busy)return;
  lock(true);msg('Firebase 최신 자료를 확인하는 중…');
  try{
   if(!api())throw Error('기존 편집기가 로딩되지 않았어.');
   const snap=await read(definitions[kind].ref);
   if(!snap.exists()){revision=null;msg('☁ 이 콘텐츠의 Firebase 최초 등록이 아직 없어. 「3종 최초 등록」을 먼저 1회 진행해 줘.',true);return;}
   const val=snap.data(),data=validate(kind,val.data);
   if(!Number.isSafeInteger(val.revision)||val.revision<1)throw Error('서버 장부 버전 오류');
   revision=val.revision;api().set(data);lastData=data;blocked=false;lock(false);
   msg('✅ Firebase '+definitions[kind].name+' 연결 완료 · 서버 버전 '+revision+' · 편집 후 Firebase 저장 가능');
  }catch(e){blocked=true;revision=null;lock(true);msg('⛔ 서버 장부 불러오기 실패: '+(e.code||e.message)+' · 다른 데이터로 덮어쓰지 않았어.',true)}
  finally{controls()}
 }
 async function publish(){
  if(!isAdmin()||revision===null||blocked||busy){if(busy)queued=true;return;}
  busy=true;controls();
  try{
   const data=validate(kind,await api().get());
   if(same(data,lastData)){msg('✅ 서버에 저장된 내용과 같아 · 추가 저장 필요 없음');return;}
   if(kind!=='activity'&&!confirm('Firebase에 변경사항을 게시할까?\n기존 서버 버전 '+revision+' → '+(revision+1)+'\n이전 버전은 관리자 백업 문서로 보존돼.'))return;
   msg('Firebase에 저장하고 서버에서 재조회 중…');
   const next=await save(kind,data,revision);revision=next;lastData=data;
   msg('✅ Firebase 저장·서버 검증 완료 · 버전 '+revision+' · 공개 홈페이지 자동 갱신');
  }catch(e){blocked=true;lock(true);msg('⛔ 저장 중단: '+(e.code||e.message)+' · 초안이 화면에 남아 있어. 새로고침하지 말고 JS/JSON 백업을 받아 줘.',true)}
  finally{busy=false;controls();if(queued&&!blocked){queued=false;publish()}else queued=false}
 }
 loginButton.onclick=async()=>{try{await login();await load()}catch(e){msg('로그인 실패: '+(e.code||e.message),true)}};
 loadButton.onclick=async()=>{if(lastData){try{const draft=await api()?.get();if(draft&&!same(draft,lastData)&&!confirm('현재 편집 중인 내용은 서버 자료로 교체돼. 백업을 받아뒀는지 확인한 뒤 다시 읽을까?'))return;}catch(e){if(!confirm('현재 편집 내용을 확인하지 못했어. 서버 자료로 다시 읽어 초안을 버릴까?'))return;}}await load()};
 saveButton.onclick=publish;
 if(kind==='activity')window.addEventListener('party-activity-editor-changed',()=>{if(revision!==null&&!blocked)publish()});
 lock(true);await waitAuth();await load();
}
