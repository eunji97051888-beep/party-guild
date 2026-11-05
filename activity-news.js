(()=>{'use strict';
const list=document.getElementById('activityNewsList'),pages=document.getElementById('activityNewsPages');if(!list)return;
let arr=Array.isArray(window.PARTY_ACTIVITY_NEWS)?window.PARTY_ACTIVITY_NEWS.filter(x=>x&&x.title).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(b.id||'').localeCompare(String(a.id||''))):[];
let page=1;const perPage=3;let latestAttendance=null;
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e}
function render(){list.replaceChildren();pages.replaceChildren();const entries=latestAttendance?[latestAttendance,...arr]:arr;const total=Math.max(1,Math.ceil(entries.length/perPage));page=Math.max(1,Math.min(page,total));
if(!entries.length){list.append(el('p','activity-news-empty','아직 등록된 문파 활동 소식이 없어요. 첫 콘텐츠 소식을 기다립니다!'));return}
entries.slice((page-1)*perPage,page*perPage).forEach(post=>{
 const card=el('article','activity-news-card');const h=el('h4','',post.title);const meta=el('p','activity-news-meta',post.date||'');card.append(h,meta,el('div','activity-news-text',post.body||''));
 if(Array.isArray(post.photos)&&post.photos.length){const photos=el('div','activity-news-photos');post.photos.slice(0,3).forEach((src,i)=>{if(typeof src!=='string'||!/^data:image\/(jpeg|png|webp);base64,/i.test(src))return;const img=el('img');img.src=src;img.alt=post.title+' 첨부 사진 '+(i+1);img.loading='lazy';img.addEventListener('click',()=>{const modal=el('div','activity-photo-modal');modal.setAttribute('role','dialog');modal.setAttribute('aria-label','첨부 사진 확대');const full=el('img');full.src=src;full.alt=img.alt;const close=el('button','','×');close.setAttribute('aria-label','닫기');close.addEventListener('click',()=>modal.remove());modal.addEventListener('click',e=>{if(e.target===modal)modal.remove()});modal.append(full,close);document.body.append(modal)});photos.append(img)});card.append(photos)}
 const linkrow=el('div','activity-news-links');[['attendance','attendance-view.html','출석 현황 보기 →'],['rewards','rewards.html','보상 내역 보기 →']].forEach(([name,url,label])=>{if(post.link===name){const a=el('a','',post.live?'최신 출석 현황 보기 →':name==='attendance'?'해당 날짜 출석 보기 →':label);a.href=url+(!post.live&&name==='attendance'&&/^\d{4}-\d{2}-\d{2}$/.test(String(post.date||''))?'?date='+encodeURIComponent(post.date):'');linkrow.append(a)}});if(linkrow.childNodes.length)card.append(linkrow);list.append(card)});
function btn(label,p,active=false){const b=el('button','',label);b.type='button';if(active)b.setAttribute('aria-current','page');b.disabled=p===page;b.addEventListener('click',()=>{page=p;render()});pages.append(b)}
if(total>1){if(page>1)btn('‹',page-1);const start=Math.max(1,Math.min(page-2,total-4));for(let i=start;i<=Math.min(total,start+4);i++)btn(i,i,i===page);if(page<total)btn('›',page+1)}
}
window.addEventListener('party-content-activity-changed',event=>{const next=event.detail;if(!Array.isArray(next))return;arr=next.filter(x=>x&&x.title).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(b.id||'').localeCompare(String(a.id||'')));page=1;render()});
// The latest attendance is a temporary public shortcut, not a saved news post.
// Older manually-authored news and its original dates remain unchanged.
(async()=>{try{
 const {initializeApp,getApps}=await import('https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js');
 const {getFirestore,doc,onSnapshot}=await import('https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js');
 const config={apiKey:'AIzaSyD_JzuNnKKuc-NU26KatxO2jqZCUVAebPE',authDomain:'party-guild.firebaseapp.com',projectId:'party-guild',storageBucket:'party-guild.firebasestorage.app',messagingSenderId:'465332308360',appId:'1:465332308360:web:50b5663dc1563df3d6923d'};
 const app=getApps().find(a=>a.name==='party-activity-attendance-public')||initializeApp(config,'party-activity-attendance-public');
 onSnapshot(doc(getFirestore(app),'publicContent','attendancePublicLiveV1'),snap=>{
  if(!snap.exists())return;
  const payload=snap.data()?.payload;
  if(!Array.isArray(payload?.sessions))return;
  const dated=payload.sessions.filter(s=>s&&/^\d{4}-\d{2}-\d{2}$/.test(s.date||'')&&typeof s.content==='string'&&Array.isArray(s.members));
  if(!dated.length)return;
  const recentDate=dated.reduce((max,s)=>s.date>max?s.date:max,'');
  const manualLatest=arr.some(p=>p.link==='attendance'&&p.date===recentDate);
  if(manualLatest){latestAttendance=null;render();return;}
  const recent=dated.filter(s=>s.date===recentDate);
  const description=recent.map(s=>`${s.content} ${s.members.filter(m=>m.status==='present').length}명 참석`).join(' · ');
  latestAttendance={id:'firebase-latest-attendance',date:recentDate,title:`${recentDate} 최신 콘텐츠 출석 현황`,body:description,link:'attendance',live:true};
  page=1;render();
 },err=>console.warn('최신 출석 소식 표시 실패 (기존 활동 소식은 유지):',err));
 }catch(e){console.warn('최신 출석 소식 연결 실패 (기존 활동 소식은 유지):',e)}
})();
render()})();
