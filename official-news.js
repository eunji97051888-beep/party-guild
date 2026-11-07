// PARTY guild official game notices · Cloud first, verified local JSON fallback.
(()=>{'use strict';
const box=document.getElementById('officialNewsList'),stamp=document.getElementById('officialNewsUpdated');
if(!box)return;
const official='https://forum.kakaogames.com/dokkaebi/postList/?code=notice';
const safe=url=>{try{const u=new URL(url);return u.protocol==='https:'&&u.hostname==='forum.kakaogames.com'&&u.pathname.replace(/\/$/,'')==='/dokkaebi/postView'&&u.searchParams.get('code')==='notice'&&/^\d+$/.test(u.searchParams.get('id')||'')?u.href:null}catch{return null}};
let data=null,page=0,cloudLoaded=false;
function msg(message,link){box.replaceChildren();const p=document.createElement('p');p.className='official-news-empty';p.textContent=message;box.append(p);if(link){const a=document.createElement('a');a.href=official;a.target='_blank';a.rel='noopener noreferrer';a.textContent='공식 공지 열기 ↗';box.append(a)}}
function draw(){
 const items=Array.isArray(data?.items)?data.items.filter(x=>x&&typeof x.title==='string'&&safe(x.url)):[];
 if(!items.length){msg('공식 공지 확인을 준비 중이에요. 공식 커뮤니티에서 최신 공지를 확인해 주세요.',true);return}
 const pageSize=3,pages=Math.ceil(items.length/pageSize);page=Math.min(page,pages-1);box.replaceChildren();
 for(const x of items.slice(page*pageSize,(page+1)*pageSize)){
  const a=document.createElement('a');a.className='official-news-item';a.href=safe(x.url);a.target='_blank';a.rel='noopener noreferrer';
  const b=document.createElement('span');b.className='official-news-label';b.textContent='공식 공지';
  const t=document.createElement('span');t.className='official-news-title';t.textContent=x.title;
  const arrow=document.createElement('span');arrow.className='official-news-arrow';arrow.textContent='↗';a.append(b,t,arrow);box.append(a);
 }
 if(pages>1){const nav=document.createElement('nav');nav.className='official-news-pages';nav.setAttribute('aria-label','공식 공지 페이지');
 const btn=(label,target,disabled,current)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=disabled;if(current){b.classList.add('is-active');b.setAttribute('aria-current','page')}b.onclick=()=>{page=target;draw()};nav.append(b)};
 btn('‹',Math.max(0,page-1),page===0,false);for(let i=0;i<pages;i++)btn(String(i+1),i,false,i===page);btn('›',Math.min(pages-1,page+1),page===pages-1,false);box.append(nav)}
 if(data.updated_at&&stamp){const dt=new Date(data.updated_at);if(!Number.isNaN(+dt))stamp.textContent='마지막 확인 '+dt.toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})+' (한국시간)'+(cloudLoaded?' · Firebase':'');}
}
// Existing GitHub archive is retained as a fallback if Firebase is offline or uninitialized.
fetch('official-news.json?ts='+Math.floor(Date.now()/3600000),{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('file');return r.json()}).then(x=>{if(!cloudLoaded){data=x;draw()}}).catch(()=>{if(!cloudLoaded)msg('기존 공지 파일을 불러오지 못했어요. 서버를 확인하는 중이에요.',true)});
(async()=>{
 try{
  const {db,onSnapshot}=await import('./party-firebase-shared.js');
  const {doc}=await import('https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js');
  onSnapshot(doc(db,'publicContent','officialNewsLiveV1'),snap=>{
   if(snap.exists()&&snap.data().format==='party-official-news-v1'&&Array.isArray(snap.data().data?.items)&&snap.data().data.items.length){
    cloudLoaded=true;data=snap.data().data;page=0;draw();
   }
  },error=>{console.warn('Official news Firebase read; using GitHub fallback:',error?.code||error)});
 }catch(e){console.warn('Official news cloud unavailable; using GitHub fallback.',e?.message||e)}
})();
})();
