(() => {'use strict';
 const names=['일','월','화','수','목','금','토']; const $=id=>document.getElementById(id);const data=window.PARTY_DEFAULT||{events:[],note:'',image:'weekly.png'}; const now=new Date();let selected=now.getDay();
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
 $('note').textContent=data.note||'';$('weeklyImage').src=data.image||'weekly.png';
 function render(){let days=$('days');days.replaceChildren();names.forEach((name,i)=>{const btn=document.createElement('button');btn.className='day'+(i===selected?' active':'');btn.type='button';btn.textContent=name;btn.setAttribute('aria-pressed',String(i===selected));btn.onclick=()=>{selected=i;render()};days.append(btn)});$('selday').textContent=names[selected]+'요일 일정';const matches=(data.events||[]).filter(e=>Array.isArray(e.days)&&e.days.includes(selected)).sort((a,b)=>a.time.localeCompare(b.time));$('eventCount').textContent=`${matches.length}개 콘텐츠`;let el=$('events');el.replaceChildren();if(!matches.length){let d=document.createElement('div');d.className='empty';d.textContent='등록된 정기 일정이 없어요.';el.append(d)}matches.forEach(e=>{let card=document.createElement('div');card.className='event';let ico=document.createElement('span');ico.className='event-mark';ico.textContent=e.type?.includes('보스')?'⚔':'✦';let time=document.createElement('span');time.className='event-time';time.textContent=e.time;let text=document.createElement('div');text.className='event-content';let title=document.createElement('b');title.textContent=e.name;let type=document.createElement('small');type.textContent=e.type;text.append(title,type);card.append(ico,time,text);el.append(card)})}render();
 const overlay=$('lightbox');function close(){overlay.hidden=true;document.body.style.overflow=''}$('openImage').onclick=()=>{$('lightImg').src=$('weeklyImage').src;overlay.hidden=false;document.body.style.overflow='hidden'};$('closeImage').onclick=close;overlay.onclick=e=>{if(e.target===overlay)close()};document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
 const videos=$('videoList');let valid=Array.isArray(window.PARTY_VIDEOS)?window.PARTY_VIDEOS.filter(v=>/^[\w-]{11}$/.test(v.id)&&v.title):[];if(!valid.length){let empty=document.createElement('div');empty.className='video-empty';empty.textContent='아직 등록된 영상이 없어요. 실제 유튜브 링크를 등록하면 이곳에 표시됩니다.';videos.append(empty)}else valid.forEach(v=>{let a=document.createElement('a');a.className='video-card';a.href='https://www.youtube.com/watch?v='+encodeURIComponent(v.id);a.target='_blank';a.rel='noopener noreferrer';let img=document.createElement('img');img.loading='lazy';img.src='https://i.ytimg.com/vi/'+encodeURIComponent(v.id)+'/hqdefault.jpg';img.alt='영상 썸네일';let title=document.createElement('strong');title.textContent=v.title;a.append(img,title);videos.append(a)});
})();
