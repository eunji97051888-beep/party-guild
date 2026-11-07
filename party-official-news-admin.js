// PARTY official notices one-click controller · Firebase admin + localhost collector
import {db,isAdmin,login,waitAuth,runTransaction,serverTimestamp} from './party-firebase-shared.js';
import {doc,getDocFromServer} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';

const OFFICIAL='https://forum.kakaogames.com';
const LOCAL='http://127.0.0.1:8765';
const DEST=doc(db,'publicContent','officialNewsLiveV1');
const root=document.querySelector('main');
if(root){
 const panel=document.createElement('section');
 panel.className='panel edit-panel';
 panel.style.cssText='border:1px solid #b89a62;margin:14px 0;padding:18px;border-radius:12px;background:#253148;color:#f6dca8';
 panel.innerHTML=`<h2 style="margin:0 0 9px">📰 게임 공식 공지 · 버튼 한 번으로 갱신</h2>
  <p style="line-height:1.7">처음 한 번만 Windows 수집기 보조 프로그램을 설치하면, 이후에는 CMD·GitHub 업로드 없이 최신 공식 공지를 수집하고 Firebase에 게시해. <strong>설치한 PC가 켜져 있어야 해.</strong></p>
  <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center">
   <button type="button" id="partyNewsOneClick" style="padding:12px 17px;border-radius:8px;border:0;background:#e7bb75;color:#152032;font-weight:800;cursor:pointer">🔄 공식 공지 지금 업데이트</button>
   <button type="button" id="partyNewsServerCheck" style="padding:12px 17px;border-radius:8px;border:1px solid #b89a62;background:#374966;color:#f6dca8;font-weight:800;cursor:pointer">☁ Firebase 저장 상태 확인 (수집 안 함)</button>
   <a href="index.html#official-news" style="color:#f6dca8">홈페이지 공지 확인 ↗</a>
  </div>
  <p id="partyNewsOneClickStatus" role="status" style="margin-top:14px;color:#e3dfd4;white-space:pre-wrap">준비 완료. Windows 보조 수집기가 실행 중이면 버튼 한 번으로 갱신할 수 있어.</p>`;
 const first=root.querySelector('.panel');
 if(first)first.before(panel);else root.prepend(panel);
 const btn=panel.querySelector('#partyNewsOneClick');
 const check=panel.querySelector('#partyNewsServerCheck');
 const status=panel.querySelector('#partyNewsOneClickStatus');
 const say=(t,err=false)=>{status.textContent=t;status.style.color=err?'#ffb8ac':'#bdf0ce'};
 let busy=false;
 const safe=(u)=>{try{const v=new URL(u);return v.protocol==='https:'&&v.hostname==='forum.kakaogames.com'&&v.pathname.replace(/\/$/,'')==='/dokkaebi/postView'&&v.searchParams.get('code')==='notice'&&/^\d+$/.test(v.searchParams.get('id')||'')?`${OFFICIAL}/dokkaebi/postView/?code=notice&id=${v.searchParams.get('id')}`:null}catch{return null}};
 const clean=(x)=>{
  if(!x||!Array.isArray(x.items)||x.items.length<1||x.items.length>30)throw Error('수집 결과가 비었거나 비정상적이어서 기존 공지를 유지했어.');
  const seen=new Set(),items=[];
  for(const n of x.items){const title=String(n?.title||'').replace(/\s+/g,' ').trim(),url=safe(n?.url);if(title.length>=4&&title.length<=200&&url&&!seen.has(url)){items.push({title,url});seen.add(url)}}
  if(!items.length)throw Error('정상적인 공식 공지 링크가 없어서 게시하지 않았어.');
  return {updated_at:typeof x.updated_at==='string'&&Number.isFinite(Date.parse(x.updated_at))?x.updated_at:new Date().toISOString(),items:items.slice(0,12)};
 };
 // Firestore can reorder object fields; compare the meaningful ordered title/url pairs only.
 // An identical notice list must not be rejected because JSON property insertion order changed.
 function same(a,b){
  if(!Array.isArray(a?.items)||!Array.isArray(b?.items)||a.items.length!==b.items.length)return false;
  return a.items.every((n,i)=>String(n?.title||'')===String(b.items[i]?.title||'')&&String(n?.url||'')===String(b.items[i]?.url||''));
 }
 async function serverState(){
  // Explicit server read: do not mistake a cached older snapshot for failed post-write verification.
  const snap=await getDocFromServer(DEST);
  if(!snap.exists())return {exists:false,revision:0,data:null};
  const obj=snap.data();
  if(obj?.format!=='party-official-news-v1')throw Error('서버에 다른 형식의 공지 문서가 있어. 수정하지 않았어.');
  return {exists:true,revision:obj.revision||0,data:obj.data||null};
 }
 check.addEventListener('click',async()=>{
  if(busy)return;busy=true;check.disabled=true;btn.disabled=true;
  try{
   const state=await serverState();
   if(!state.exists){say('☁ 아직 Firebase 공지 게시 문서가 없어. 기존 GitHub 공지를 계속 표시 중이야.');return;}
   const count=Array.isArray(state.data?.items)?state.data.items.length:0;
   const date=state.data?.updated_at&&Number.isFinite(Date.parse(state.data.updated_at))?new Date(state.data.updated_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):'확인 불가';
   say(`✅ Firebase 공지 저장 확인 · 버전 ${state.revision} · ${count}개 · 수집 시각 ${date}\n이 버튼은 수집·저장하지 않고 서버 상태만 확인했어.`);
  }catch(e){say('⛔ 서버 조회 실패: '+(e?.code||e?.message||e),true)}
  finally{busy=false;check.disabled=false;btn.disabled=false}
 });
 async function publish(data){
  const prior=await getDocFromServer(DEST);
  const previous=prior.exists()?prior.data():null;
  if(previous&&previous.format!=='party-official-news-v1')throw Error('서버에 다른 형식의 공지 문서가 있어. 안전을 위해 덮어쓰지 않았어.');
  const prevData=previous?.data;
  if(prevData&&same(prevData,data))return {unchanged:true,count:data.items.length};
  if(prevData&&Date.parse(prevData.updated_at)>Date.parse(data.updated_at)+300000)throw Error('서버 공지가 수집 결과보다 최신이어서 덮어쓰지 않았어.');
  const revision=Number.isSafeInteger(previous?.revision)?previous.revision:0;
  const history=revision?doc(db,'guildPrivate',`officialNewsHistory_${String(revision).padStart(8,'0')}`):null;
  await runTransaction(db,async tx=>{
   const now=await tx.get(DEST);
   if(now.exists()!==!!previous||(now.exists()&&now.data().revision!==revision))throw Error('다른 탭에서 공지가 바뀌었어. 새로 고친 후 다시 눌러줘.');
   let oldHistory=null;
   if(history){oldHistory=await tx.get(history);if(oldHistory.exists())throw Error('기존 백업 문서가 있어 덮어쓰기를 중단했어.');}
   if(history)tx.set(history,{format:'party-official-news-history-v1',revision,data:prevData,archivedAt:serverTimestamp()});
   tx.set(DEST,{format:'party-official-news-v1',revision:revision+1,data,updatedAt:serverTimestamp()});
  });
  const verified=await serverState();
  if(!verified.exists||verified.revision!==revision+1||!same(verified.data,data))throw Error('서버 재조회에서 게시 결과를 확인하지 못했어. 중복 수집하지 말고 먼저 「Firebase 저장 상태 확인」을 눌러 줘.');
  return {unchanged:false,count:data.items.length,revision:revision+1};
 }
 async function collect(){
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),240000);
  try{
   const health=await fetch(`${LOCAL}/health`,{cache:'no-store',signal:controller.signal});
   if(!health.ok)throw Error('Windows 보조 수집기가 응답하지 않아. 보조 프로그램 설치와 실행 상태를 확인해 줘.');
   const state=await health.json();if(!state.ready)throw Error('보조 수집기에서 기존 CMD의 scripts/collect_official_news.py 파일을 찾지 못했어.');
   say('공식 사이트를 브라우저로 확인하는 중… 잠시 창이 열릴 수 있어.');
   const res=await fetch(`${LOCAL}/collect`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',cache:'no-store',signal:controller.signal});
   const obj=await res.json();if(!res.ok||!obj.ok)throw Error(obj.error||'수집기 실행 오류');
   return clean(obj.data);
  }finally{clearTimeout(timeout)}
 }
 btn.addEventListener('click',async()=>{
  if(busy)return;busy=true;btn.disabled=true;check.disabled=true;
  try{
   if(!isAdmin()){say('문주 Google 계정을 확인하는 중…');await login();}
   if(!isAdmin())throw Error('문주 관리자 계정으로 로그인해야 해.');
   say('PC 보조 수집기 연결 확인 중…');
   const data=await collect();
   say(`${data.items.length}개를 가져왔어. Firebase에 안전하게 저장하는 중…`);
   const result=await publish(data);
   if(result.unchanged)say(`✅ 공식 공지 ${result.count}개 확인 · 기존 공지와 동일해 변경하지 않았어.`);
   else say(`✅ 공식 공지 ${result.count}개 서버 저장 완료 · 버전 ${result.revision} · 홈페이지에도 자동 반영돼.`);
  }catch(e){
   const msg=e?.name==='AbortError'?'수집 제한 시간을 넘었어. 기존 서버 공지는 유지됐어.':(e?.code||e?.message||String(e));
   const help=/fetch|network|failed/i.test(msg)?'Windows 보조 프로그램이 실행 중인지 확인해 줘. 브라우저가 로컬 네트워크 접근을 물으면 허용해야 해.':'해당 오류를 확인하고 재시도해 줘.';
   say(`⛔ 공지 갱신 실패: ${msg}\n${help}`,true);
  }finally{busy=false;btn.disabled=false;check.disabled=false}
 });
 waitAuth().then(()=>{if(isAdmin())say('✅ 관리자 로그인 확인됨 · 공식 공지 갱신 버튼을 사용할 수 있어.');});
}
