(()=>{'use strict';
const list=document.getElementById('activityNewsList'),pages=document.getElementById('activityNewsPages');if(!list)return;
const arr=Array.isArray(window.PARTY_ACTIVITY_NEWS)?window.PARTY_ACTIVITY_NEWS.filter(x=>x&&x.title).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(b.id||'').localeCompare(String(a.id||''))):[];
let page=1;const perPage=3;
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e}
function render(){list.replaceChildren();pages.replaceChildren();const total=Math.max(1,Math.ceil(arr.length/perPage));page=Math.max(1,Math.min(page,total));
if(!arr.length){list.append(el('p','activity-news-empty','아직 등록된 문파 활동 소식이 없어요. 첫 콘텐츠 소식을 기다립니다!'));return}
arr.slice((page-1)*perPage,page*perPage).forEach(post=>{
 const card=el('article','activity-news-card');const h=el('h4','',post.title);const meta=el('p','activity-news-meta',post.date||'');card.append(h,meta,el('div','activity-news-text',post.body||''));
 if(Array.isArray(post.photos)&&post.photos.length){const photos=el('div','activity-news-photos');post.photos.slice(0,3).forEach((src,i)=>{if(typeof src!=='string'||!/^data:image\/(jpeg|png|webp);base64,/i.test(src))return;const img=el('img');img.src=src;img.alt=post.title+' 첨부 사진 '+(i+1);img.loading='lazy';img.addEventListener('click',()=>{const modal=el('div','activity-photo-modal');modal.setAttribute('role','dialog');modal.setAttribute('aria-label','첨부 사진 확대');const full=el('img');full.src=src;full.alt=img.alt;const close=el('button','','×');close.setAttribute('aria-label','닫기');close.addEventListener('click',()=>modal.remove());modal.addEventListener('click',e=>{if(e.target===modal)modal.remove()});modal.append(full,close);document.body.append(modal)});photos.append(img)});card.append(photos)}
 const linkrow=el('div','activity-news-links');[['attendance','attendance-view.html','출석 현황 보기 →'],['rewards','rewards.html','보상 내역 보기 →']].forEach(([name,url,label])=>{if(post.link===name){const a=el('a','',label);a.href=url;linkrow.append(a)}});if(linkrow.childNodes.length)card.append(linkrow);list.append(card)});
function btn(label,p,active=false){const b=el('button','',label);b.type='button';if(active)b.setAttribute('aria-current','page');b.disabled=p===page;b.addEventListener('click',()=>{page=p;render()});pages.append(b)}
if(total>1){if(page>1)btn('‹',page-1);const start=Math.max(1,Math.min(page-2,total-4));for(let i=start;i<=Math.min(total,start+4);i++)btn(i,i,i===page);if(page<total)btn('›',page+1)}
}render()})();
