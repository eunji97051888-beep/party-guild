/* 공지사항 편집기 - 기존 데이터 순서나 값을 손대지 않고 화면만 페이지로 나눔 */
(()=>{
 'use strict';
 const root=document.getElementById('noticeRows');
 const add=document.getElementById('addNotice');
 if(!root||!add)return;
 const PAGE_SIZE=5;
 let page=0;
 const tools=document.createElement('div'); tools.className='notice-pager-tools';
 const search=document.createElement('input');search.type='search';search.className='notice-search';search.placeholder='공지 제목 검색';search.setAttribute('aria-label','공지 제목 검색');
 const count=document.createElement('span');count.className='notice-pager-count';count.setAttribute('aria-live','polite');
 tools.append(search,count);root.before(tools);
 const bar=document.createElement('nav');bar.className='notice-pager-bar';bar.setAttribute('aria-label','공지사항 편집 페이지 이동');
 const prev=document.createElement('button');prev.type='button';prev.className='action alt';prev.textContent='‹ 이전';
 const info=document.createElement('span');info.className='notice-pager-info';info.setAttribute('aria-live','polite');
 const next=document.createElement('button');next.type='button';next.className='action alt';next.textContent='다음 ›';
 bar.append(prev,info,next);root.after(bar);
 const empty=document.createElement('p');empty.className='notice-empty-list';empty.textContent='일치하는 공지사항이 없어.';empty.hidden=true;bar.after(empty);
 function rows(){return [...root.children].filter(el=>el.classList.contains('notice-edit-card'))}
 function labelFor(el){
   const title=el.querySelector('.notice-title')?.value.trim()||'제목 없는 공지';
   const date=el.querySelector('.notice-date')?.value||'날짜 미설정';
   const pin=el.querySelector('.notice-pinned')?.checked?'📌 ':'';
   return pin+title+' · '+date;
 }
 function enhance(el){
   if(el.dataset.noticePaged)return;
   el.dataset.noticePaged='1';
   const head=el.querySelector('.notice-edit-head'),strong=head?.querySelector('strong');
   if(!strong)return;
   const toggle=document.createElement('button');toggle.type='button';toggle.className='notice-toggle';
   toggle.setAttribute('aria-expanded','false');
   strong.replaceWith(toggle);
   const refresh=()=>{
     const open=toggle.getAttribute('aria-expanded')==='true';
     toggle.textContent=labelFor(el)+(open?'  ▴ 닫기':'  ▾ 편집');
   };
   const setOpen=open=>{
     toggle.setAttribute('aria-expanded',String(Boolean(open)));
     el.classList.toggle('notice-collapse-card',!open);
     refresh();
   };
   setOpen(false);
   toggle.addEventListener('click',()=>setOpen(toggle.getAttribute('aria-expanded')!=='true'));
   ['.notice-title','.notice-date','.notice-pinned'].forEach(sel=>{
     el.querySelector(sel)?.addEventListener('input',()=>{refresh();render()});
     el.querySelector(sel)?.addEventListener('change',()=>{refresh();render()});
   });
   el.openNotice=()=>setOpen(true);
 }
 function ordered(){
   const query=search.value.trim().toLocaleLowerCase();
   return rows().filter(el=>!query||el.querySelector('.notice-title')?.value.toLocaleLowerCase().includes(query))
      .sort((a,b)=>Number(Boolean(b.querySelector('.notice-pinned')?.checked))-Number(Boolean(a.querySelector('.notice-pinned')?.checked))||
           (b.querySelector('.notice-date')?.value||'').localeCompare(a.querySelector('.notice-date')?.value||'')||
           rows().indexOf(b)-rows().indexOf(a));
 }
 function render(){
   const all=rows();all.forEach(enhance);
   const filtered=ordered();
   const totalPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
   page=Math.min(Math.max(0,page),totalPages-1);
   all.forEach(el=>{el.classList.add('notice-page-hidden');el.style.order='';});
   filtered.forEach((el,i)=>{
     el.style.order=String(i);
     el.classList.toggle('notice-page-hidden',Math.floor(i/PAGE_SIZE)!==page);
   });
   prev.disabled=page===0;next.disabled=page>=totalPages-1;
   info.textContent=`${page+1} / ${totalPages} 페이지 · 5개씩`;
   count.textContent=queryText(all.length,filtered.length,search.value.trim());
   empty.hidden=filtered.length>0;
 }
 function queryText(total,found,q){return q?`검색 ${found}개 / 전체 ${total}개`:`전체 ${total}개`}
 function go(p){page=p;render();tools.scrollIntoView({behavior:'smooth',block:'start'})}
 prev.addEventListener('click',()=>go(page-1));next.addEventListener('click',()=>go(page+1));
 search.addEventListener('input',()=>{page=0;render()});
 add.addEventListener('click',()=>{
   const added=rows().at(-1);
   if(!added)return;
   search.value='';
   render();
   const i=ordered().indexOf(added);
   if(i<0)return;
   page=Math.floor(i/PAGE_SIZE);render();added.openNotice?.();
   added.querySelector('.notice-title')?.focus();
 });
 let scheduled=false;
 const observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;render()})});
 observer.observe(root,{childList:true});
 render();
})();
