(()=>{'use strict';
  const section=document.getElementById('announcements');
  const list=document.getElementById('noticeItems');
  if(!section||!list) return;
  const button=document.createElement('button');
  button.type='button'; button.className='portal-mobile-notice-button';
  button.setAttribute('aria-controls','noticeItems');
  section.append(button);
  const isMobile=()=>window.matchMedia('(max-width: 600px)').matches;
  function update(){
    const count=list.children.length;
    button.hidden=!isMobile()||count<=2;
    button.textContent=section.classList.contains('portal-mobile-expanded')?'접기 ↑':`공지 전체 보기 (${count}개) ↓`;
    button.setAttribute('aria-expanded',String(section.classList.contains('portal-mobile-expanded')));
  }
  button.addEventListener('click',()=>{section.classList.toggle('portal-mobile-expanded'); update();});
  // Deep links to announcements should never hide older posts from the visitor.
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[href="#announcements"]');
    if(link&&isMobile()&&list.children.length>2){section.classList.add('portal-mobile-expanded');update();}
  });
  new MutationObserver(update).observe(list,{childList:true});
  window.addEventListener('resize',update,{passive:true});
  if(location.hash==='#announcements'&&isMobile()) section.classList.add('portal-mobile-expanded');
  update();
})();
