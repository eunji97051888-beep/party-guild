(function(){'use strict';
const grid=document.getElementById('yechiGallery'), nav=document.getElementById('yechiPager');if(!grid||!nav)return;
const reports=Array.isArray(window.YECHI_REPORTS)?window.YECHI_REPORTS.filter(x=>x&&typeof x.title==='string'&&typeof x.image==='string'):[];
let page=0;const PER=4;
function render(){grid.replaceChildren();nav.replaceChildren();
if(!reports.length){const msg=document.createElement('p');msg.textContent='등록된 보고서가 아직 없어요.';grid.append(msg);return;}
reports.slice(page*PER,page*PER+PER).forEach((report,i)=>{
const b=document.createElement('button');b.type='button';b.className='yechi-tile';b.setAttribute('aria-label',report.title+' 크게 보기');
const img=document.createElement('img');img.src=report.image;img.alt=report.title;img.loading='lazy';
const title=document.createElement('span');title.textContent=report.title;b.append(img,title);b.addEventListener('click',()=>openReport(report));grid.append(b);
});
const total=Math.ceil(reports.length/PER);if(total<2)return;
const prev=document.createElement('button');prev.textContent='‹';prev.disabled=page===0;prev.onclick=()=>{page--;render()};nav.append(prev);
for(let i=0;i<total;i++){const b=document.createElement('button');b.textContent=String(i+1);if(i===page)b.classList.add('active');b.setAttribute('aria-label',(i+1)+'페이지');b.onclick=()=>{page=i;render()};nav.append(b)}
const next=document.createElement('button');next.textContent='›';next.disabled=page>=total-1;next.onclick=()=>{page++;render()};nav.append(next);
}
function openReport(item){const overlay=document.createElement('div');overlay.className='yechi-overlay';overlay.tabIndex=-1;
const panel=document.createElement('div');panel.className='yechi-dialog';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',item.title);
const header=document.createElement('div');header.className='yechi-dialog-head';const h=document.createElement('strong');h.textContent=item.title;
const close=document.createElement('button');close.type='button';close.textContent='✕ 닫기';close.setAttribute('aria-label','닫기');header.append(h,close);
const img=document.createElement('img');img.src=item.image;img.alt=item.title;panel.append(header,img);overlay.append(panel);document.body.append(overlay);document.body.style.overflow='hidden';
function dismiss(){overlay.remove();document.body.style.overflow='';document.removeEventListener('keydown',onKey)}
function onKey(e){if(e.key==='Escape')dismiss()}
close.onclick=dismiss;overlay.addEventListener('click',e=>{if(e.target===overlay)dismiss()});document.addEventListener('keydown',onKey);close.focus();}
render();
})();