(()=>{
 'use strict';
 const PER_PAGE=5;
 function createPager(rootId, label, addId){
   const root=document.getElementById(rootId),add=document.getElementById(addId);
   if(!root||!add)return;
   let page=0, lastCount=0, reloadPending=false;
   const bar=document.createElement('div');bar.className='media-editor-pager';bar.setAttribute('aria-label',label+' 페이지 이동');
   const prev=document.createElement('button');prev.type='button';prev.className='action alt';prev.textContent='‹ 이전';
   const detail=document.createElement('span');detail.className='media-pager-details';detail.setAttribute('aria-live','polite');
   const next=document.createElement('button');next.type='button';next.className='action alt';next.textContent='다음 ›';
   bar.append(prev,detail,next);root.after(bar);
   const rows=()=>Array.from(root.children).filter(el=>el.classList.contains('notice-edit-card'));
   function enhance(el){
     if(el.dataset.mediaPaged)return;
     el.dataset.mediaPaged='yes';
     const header=el.querySelector('.notice-edit-head');const title=el.querySelector('.item-title');
     if(!header||!title)return;
     const strong=header.querySelector('strong');if(!strong)return;
     const toggle=document.createElement('button');toggle.type='button';toggle.className='media-edit-toggle';toggle.setAttribute('aria-expanded','false');
     strong.replaceWith(toggle);
     const updateLabel=()=>{toggle.textContent=(title.value.trim()||'제목 없는 항목')+'  ▾ 편집';};
     updateLabel();title.addEventListener('input',updateLabel);
     const setOpen=open=>{el.classList.toggle('media-item-closed',!open);toggle.setAttribute('aria-expanded',String(open));toggle.textContent=(title.value.trim()||'제목 없는 항목')+(open?'  ▴ 닫기':'  ▾ 편집');};
     setOpen(false);
     toggle.addEventListener('click',()=>setOpen(el.classList.contains('media-item-closed')));
     el.openForPage=()=>setOpen(true);
     // The header delete action is intentionally retained.
   }
   function render(){
     const items=rows();items.forEach(enhance);
     const pages=Math.max(1,Math.ceil(items.length/PER_PAGE));page=Math.min(Math.max(page,0),pages-1);
     items.forEach((el,i)=>{el.classList.toggle('media-page-hidden',Math.floor(i/PER_PAGE)!==page)});
     prev.disabled=page===0;next.disabled=page>=pages-1;
     detail.textContent=items.length+'개 · '+(page+1)+' / '+pages+' 페이지 (5개씩)';
     lastCount=items.length;
   }
   prev.addEventListener('click',()=>{page--;render();bar.scrollIntoView({behavior:'smooth',block:'nearest'})});
   next.addEventListener('click',()=>{page++;render();bar.scrollIntoView({behavior:'smooth',block:'nearest'})});
   add.addEventListener('click',()=>{
     const items=rows();if(items.length>lastCount){page=Math.ceil(items.length/PER_PAGE)-1;render();items.at(-1)?.openForPage?.();items.at(-1)?.querySelector('.item-title')?.focus()}
   });
   // Firebase loads and deletes insert/remove rows; no existing value is removed by pagination.
   const observer=new MutationObserver(()=>{
     if(reloadPending)return;reloadPending=true;
     queueMicrotask(()=>{reloadPending=false;const count=rows().length;
       if(count>lastCount+1)page=0;
       render();});
   });
   observer.observe(root,{childList:true});
   render();
 }
 createPager('linkRows','자료실','addLink');
 createPager('videoRows','유튜브','addVideo');
})();
