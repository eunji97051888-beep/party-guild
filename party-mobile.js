/* Navigation only: no localStorage/Firebase or form modifications. */
(()=>{'use strict';
 const button=document.createElement('button');
 button.type='button';button.className='party-mobile-top';button.textContent='↑';button.title='맨 위로';button.setAttribute('aria-label','맨 위로 이동');
 button.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
 document.body.append(button);
})();
