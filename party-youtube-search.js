/* Search YouTube only on a user's click; approval publishes using the existing Firebase editor. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const root=$('partyYoutubeTool');if(!root)return;
 const keyEl=$('partyYoutubeApiKey'),queryEl=$('partyYoutubeQuery'),sortEl=$('partyYoutubeSort');
 const searchBtn=$('partyYoutubeSearch'),moreBtn=$('partyYoutubeMore'),addBtn=$('partyYoutubeAdd');
 const resultsEl=$('partyYoutubeResults'),statusEl=$('partyYoutubeStatus'),countEl=$('partyYoutubeCount');
 const keySave=$('partyYoutubeRememberKey'),keyClear=$('partyYoutubeClearKey');
 const STORAGE_KEY='partyGuildYoutubeSearchApiKeyV1';
 const VALID_ID=/^[A-Za-z0-9_-]{11}$/;
 let results=[],selected=new Map(),nextPageToken='',loading=false,requestSeq=0;
 let activeQuery='',activeSort='date';
 try{keyEl.value=localStorage.getItem(STORAGE_KEY)||''}catch{}
 const status=(message,error=false)=>{statusEl.textContent=message;statusEl.style.color=error?'#ffb9ae':'#bce3c8'};
 const decodeText=value=>{
  // YouTube's snippet titles may contain HTML entities.
  const doc=new DOMParser().parseFromString(String(value||''),'text/html');
  return (doc.body.textContent||'').replace(/\s+/g,' ').trim();
 };
 const getId=url=>{
  try{const u=new URL(url),h=u.hostname.toLowerCase().replace(/^(www\.|m\.)/,'');
   let id='';if(h==='youtu.be')id=u.pathname.split('/')[1]||'';
   else if(h==='youtube.com'||h==='youtube-nocookie.com'||h==='music.youtube.com'){
    if(u.pathname==='/watch')id=u.searchParams.get('v')||'';
    else if(/^\/(shorts|embed|live)\//.test(u.pathname))id=u.pathname.split('/')[2]||'';
   }
   return VALID_ID.test(id)?id:null;
  }catch{return null}
 };
 const registered=()=>new Set([...$('videoRows').querySelectorAll('.item-url')].map(x=>getId(x.value)).filter(Boolean));
 const count=()=>{countEl.textContent=`선택 ${selected.size}개 / 검색 ${results.length}개`;addBtn.disabled=loading||selected.size===0};
 const render=()=>{
  const exists=registered();resultsEl.replaceChildren();
  for(const video of results){
   const label=document.createElement('label');label.className='party-youtube-result';
   const duplicate=exists.has(video.id);if(duplicate)label.classList.add('is-registered');
   const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=selected.has(video.id);checkbox.disabled=duplicate;
   checkbox.setAttribute('aria-label',video.title+' 선택');
   checkbox.addEventListener('change',()=>{if(checkbox.checked)selected.set(video.id,video);else selected.delete(video.id);count()});
   const thumb=document.createElement('img');thumb.loading='lazy';thumb.alt='';thumb.src=`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
   const info=document.createElement('div');info.className='party-youtube-info';
   const heading=document.createElement('strong');heading.textContent=video.title;
   const desc=document.createElement('small');desc.textContent=duplicate?'이미 편집기에 등록된 영상':video.channel+' · '+video.date;
   const link=document.createElement('a');link.href='https://www.youtube.com/watch?v='+video.id;link.target='_blank';link.rel='noopener noreferrer';link.textContent='유튜브에서 확인 ↗';
   info.append(heading,desc,link);label.append(checkbox,thumb,info);resultsEl.append(label);
  }
  count();moreBtn.hidden=!nextPageToken||results.length>=100;
 };
 const friendlyError=(http,error)=>{
  const reason=error?.errors?.[0]?.reason||error?.status||'';
  if(http===403&&/quota/i.test(String(reason)))return '오늘 유튜브 검색 API 할당량을 모두 사용했어. 내일 다시 검색해 줘.';
  if(http===403||http===401)return 'API 키 권한을 확인해 줘. YouTube Data API v3 활성화 및 GitHub Pages 웹사이트 제한이 필요해.';
  if(http===400)return '유튜브 API 키 또는 검색 설정을 확인해 줘.';
  return '유튜브 검색에 실패했어 ('+http+'). 잠시 뒤 다시 시도해 줘.';
 };
 async function search(more=false){
  const key=keyEl.value.trim();const query=queryEl.value.trim();
  if(!key)return status('먼저 YouTube Data API v3 전용 API 키를 입력해 줘.',true);
  if(!query)return status('검색어를 입력해 줘.',true);
  if(loading)return;
  if(more&&(!nextPageToken||query!==activeQuery||sortEl.value!==activeSort))return;
  if(!more){results=[];selected.clear();nextPageToken='';activeQuery=query;activeSort=sortEl.value;render()}
  const current=++requestSeq;loading=true;searchBtn.disabled=true;moreBtn.disabled=true;addBtn.disabled=true;
  status(more?'다음 영상 검색 중…':'유튜브 최신 영상 검색 중…');
  try{
   const url=new URL('https://www.googleapis.com/youtube/v3/search');
   for(const [k,v] of Object.entries({key,part:'snippet',type:'video',q:query,maxResults:'15',order:activeSort,relevanceLanguage:'ko',regionCode:'KR',safeSearch:'moderate'}))url.searchParams.set(k,v);
   if(more)url.searchParams.set('pageToken',nextPageToken);
   const response=await fetch(url.toString(),{referrerPolicy:'strict-origin-when-cross-origin'});
   const body=await response.json();
   if(!response.ok)throw Object.assign(new Error(friendlyError(response.status,body.error)),{reported:true});
   if(current!==requestSeq)return;
   const ids=new Set(results.map(v=>v.id));
   for(const entry of body.items||[]){
    const id=entry.id?.videoId,info=entry.snippet;
    if(!VALID_ID.test(id)||!info||ids.has(id))continue;
    const date=info.publishedAt?new Date(info.publishedAt).toLocaleDateString('ko-KR'):'날짜 미확인';
    results.push({id,title:decodeText(info.title).slice(0,120)||'제목 없는 영상',channel:decodeText(info.channelTitle),date});ids.add(id);
   }
   nextPageToken=body.nextPageToken||'';render();
   status(results.length?`영상 ${results.length}개를 불러왔어. 원하는 영상만 체크해 줘.`:'검색 결과가 없어. 검색어를 바꿔 봐.');
  }catch(err){console.warn('[PARTY] YouTube search:',err.message||err);status(err.reported?err.message:'네트워크 오류로 검색하지 못했어. 연결을 확인해 줘.',true)}
  finally{loading=false;searchBtn.disabled=false;moreBtn.disabled=false;count()}
 }
 keySave.addEventListener('click',()=>{
  const key=keyEl.value.trim();if(!key)return status('저장할 API 키를 입력해 줘.',true);
  try{localStorage.setItem(STORAGE_KEY,key);status('이 브라우저에 검색용 API 키를 저장했어. GitHub나 Firebase에는 저장되지 않아.')}
  catch{status('브라우저 저장이 차단되어 있어. 이 탭에서는 계속 검색할 수 있어.',true)}
 });
 keyClear.addEventListener('click',()=>{keyEl.value='';try{localStorage.removeItem(STORAGE_KEY)}catch{}status('이 브라우저에 저장한 API 키를 삭제했어.')});
 searchBtn.addEventListener('click',()=>search(false));moreBtn.addEventListener('click',()=>search(true));
 queryEl.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();search(false)}});
 sortEl.addEventListener('change',()=>{results=[];selected.clear();nextPageToken='';render();status('정렬 기준을 바꿨어. 다시 검색 버튼을 눌러 줘.')});
 addBtn.addEventListener('click',()=>{
  const cloudSave=$('partyHomeCloudSave'),addVideo=$('addVideo');
  if(!cloudSave||cloudSave.disabled||!addVideo||addVideo.disabled||$('videoRows').inert){
   return status('먼저 상단의 Google 관리자 로그인 → Firebase 연결 완료를 확인해 줘.',true);
  }
  const exists=registered();const pending=[...selected.values()].filter(v=>!exists.has(v.id));
  if(!pending.length){selected.clear();render();return status('선택한 영상은 모두 이미 등록되어 있어.')}
  if($('videoRows').children.length+pending.length>150)return status('등록 영상은 최대 150개야. 기존 목록을 정리한 뒤 다시 시도해 줘.',true);
  // The editor prepends rows; insert oldest first so newest videos remain at the top.
  pending.reverse();
  for(const video of pending){addVideo.click();const row=$('videoRows').firstElementChild;
   if(!row||!row.querySelector('.item-title'))return status('편집기에 영상을 추가하지 못했어. 새로고침 후 다시 시도해 줘.',true);
   row.querySelector('.item-title').value=video.title;
   row.querySelector('.item-url').value='https://www.youtube.com/watch?v='+video.id;
  }
  selected.clear();render();
  status(`${pending.length}개 영상을 편집기에 추가했어. Firebase 저장 확인창을 진행하면 홈페이지에도 반영돼.`);
  // Reuse existing revision check, audit history, verification and confirmation.
  cloudSave.click();
 });
 render();
})();
