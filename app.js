(() => {'use strict';
 const names=['일','월','화','수','목','금','토']; const $=id=>document.getElementById(id);const data=window.PARTY_DEFAULT||{events:[],note:'',image:'weekly.png'}; const now=new Date();let selected=now.getDay();let activeEvents=Array.isArray(data.events)?data.events:[];
 const fmt=n=>String(n).padStart(2,'0'); $('date').textContent=`매주 반복 일정  |  ${now.getFullYear()}년 ${fmt(now.getMonth()+1)}월 ${fmt(now.getDate())}일 · ${names[selected]}요일`;
 $('quoteTitle').textContent=data.quoteTitle??'함께 즐기고 웃는 우리 문파';
 $('quoteSubtitle').textContent=data.quoteSubtitle??'✦ 즐거운 게임, 배려하는 소통 ✦';

 const notices=Array.isArray(data.notices)?data.notices:[];
 const noticeRoot=$('noticeItems');
 const sortedNotices=notices.slice().sort((a,b)=>Number(Boolean(b.pinned))-Number(Boolean(a.pinned))||(b.date||'').localeCompare(a.date||''));
 $('noticeCount').textContent=sortedNotices.length+'개 공지';
 if(!sortedNotices.length){const empty=document.createElement('p');empty.className='notice-empty';empty.textContent='등록된 공지사항이 아직 없어요.';noticeRoot.append(empty)}
 for(const n of sortedNotices){
  const item=document.createElement('article');item.className='notice-entry';
  const heading=document.createElement('div');heading.className='notice-entry-heading';
  if(n.pinned){const mark=document.createElement('span');mark.className='notice-pin';mark.textContent='중요';heading.append(mark)}
  const title=document.createElement('h4');title.textContent=n.title||'';heading.append(title);
  if(n.date){const date=document.createElement('time');date.textContent=n.date;date.dateTime=n.date;heading.append(date)}
  const contents=document.createElement('p');contents.textContent=n.body||'';
  item.append(heading,contents);noticeRoot.append(item);
 }
 $('note').textContent=data.note||'';const plannerImage=data.image||'weekly.png';$('weeklyImage').src=plannerImage+(plannerImage.includes('?')?'&':'?')+'v='+Date.now();
 function render(){let days=$('days');days.replaceChildren();names.forEach((name,i)=>{const btn=document.createElement('button');btn.className='day'+(i===selected?' active':'');btn.type='button';btn.textContent=name;btn.setAttribute('aria-pressed',String(i===selected));btn.onclick=()=>{selected=i;render()};days.append(btn)});$('selday').textContent=names[selected]+'요일 일정';const matches=activeEvents.filter(e=>Array.isArray(e.days)&&e.days.includes(selected)).sort((a,b)=>a.time.localeCompare(b.time));$('eventCount').textContent=`${matches.length}개 콘텐츠`;let el=$('events');el.replaceChildren();if(!matches.length){let d=document.createElement('div');d.className='empty';d.textContent='등록된 정기 일정이 없어요.';el.append(d)}matches.forEach(e=>{let card=document.createElement('div');card.className='event';let ico=document.createElement('span');ico.className='event-mark';ico.textContent=e.type?.includes('보스')?'⚔':'✦';let time=document.createElement('span');time.className='event-time';time.textContent=e.time;let text=document.createElement('div');text.className='event-content';let title=document.createElement('b');title.textContent=e.name;let type=document.createElement('small');type.textContent=e.type;text.append(title,type);card.append(ico,time,text);el.append(card)})}render();window.PARTY_SET_SCHEDULE=events=>{if(Array.isArray(events)){activeEvents=events;render();}};
 const overlay=$('lightbox');function close(){overlay.hidden=true;document.body.style.overflow=''}$('openImage').onclick=()=>{$('lightImg').src=$('weeklyImage').src;overlay.hidden=false;document.body.style.overflow='hidden'};$('closeImage').onclick=close;overlay.onclick=e=>{if(e.target===overlay)close()};document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
 const links=$('resourceLinks'),sites=$('siteCards'),videos=$('videoList');
 function safeUrl(value){try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)?u.href:null;}catch{return null;}}
 function youtubeID(v){if(/^[\w-]{11}$/.test(v.id||''))return v.id;try{const u=new URL(v.url);const h=u.hostname.replace(/^www\./,'');let id=h==='youtu.be'?u.pathname.split('/')[1]:(u.searchParams.get('v')||u.pathname.split('/')[2]);return /^[\w-]{11}$/.test(id||'')?id:null;}catch{return null;}}
 let currentVideos=[],videoIndex=0;
 function paintVideos(){videos.replaceChildren();const prev=$('videoPrev'),next=$('videoNext'),position=$('videoPosition');const max=Math.min(3,window.innerWidth<650?1:window.innerWidth<1050?2:3);const limit=Math.max(0,currentVideos.length-max);videoIndex=Math.min(videoIndex,limit);prev.disabled=videoIndex===0;next.disabled=videoIndex>=limit;position.textContent=currentVideos.length?`${videoIndex+1}–${Math.min(videoIndex+max,currentVideos.length)} / ${currentVideos.length}`:'영상 없음';
  if(!currentVideos.length){const e=document.createElement('div');e.className='video-empty';e.textContent='아직 등록된 영상이 없어요.';videos.append(e);return;}
  for(const v of currentVideos.slice(videoIndex,videoIndex+max)){const a=document.createElement('a');a.className='video-card';a.href='https://www.youtube.com/watch?v='+encodeURIComponent(v.id);a.target='_blank';a.rel='noopener noreferrer';const img=document.createElement('img');img.loading='lazy';img.src='https://i.ytimg.com/vi/'+v.id+'/hqdefault.jpg';img.alt='유튜브 썸네일';const t=document.createElement('strong');t.textContent=v.title;a.append(img,t);videos.append(a);}
 }
 $('videoPrev').onclick=()=>{videoIndex=Math.max(0,videoIndex-1);paintVideos();};$('videoNext').onclick=()=>{videoIndex=Math.min(currentVideos.length-1,videoIndex+1);paintVideos();};window.addEventListener('resize',paintVideos);
 window.PARTY_RENDER_MEDIA=(resources,videoItems)=>{
  links.replaceChildren();sites.replaceChildren();
  for(const r of resources||[]){const href=safeUrl(r.url);if(!href||!r.title)continue;
   const a=document.createElement('a');a.className='resource-link';a.href=href;a.target='_blank';a.rel='noopener noreferrer';a.textContent='↗ '+r.title;links.append(a);
   const card=document.createElement('a');card.className='site-card';card.href=href;card.target='_blank';card.rel='noopener noreferrer';
   const art=document.createElement('div');art.className='site-art';const image=safeUrl(r.image||'');if(image){const img=document.createElement('img');img.src=image;img.loading='lazy';img.alt='';img.onerror=()=>{img.remove();art.textContent='✦ PARTY LINKS';};art.append(img);}else art.textContent='✦ PARTY LINKS';
   const body=document.createElement('div');body.className='site-body';const h=document.createElement('strong');h.textContent=r.title;const description=document.createElement('p');description.textContent=r.description||new URL(href).hostname;body.append(h,description);card.append(art,body);sites.append(card);
  }
  if(!sites.children.length){const p=document.createElement('p');p.className='notice-empty';p.textContent='등록된 추천 사이트가 아직 없어요.';sites.append(p);}
  currentVideos=(videoItems||[]).map(v=>({title:v.title,id:youtubeID(v)})).filter(v=>v.title&&v.id);videoIndex=0;paintVideos();
 };
 window.PARTY_RENDER_MEDIA(Array.isArray(data.resources)?data.resources:[],Array.isArray(data.videos)?data.videos:(window.PARTY_VIDEOS||[]));

})();
