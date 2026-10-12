(()=>{'use strict';
const root=document.getElementById('noticeItems');if(!root)return;
const modal=document.createElement('div');modal.className='party-notice-modal';modal.hidden=true;
modal.innerHTML='<section class="party-notice-dialog" role="dialog" aria-modal="true" aria-labelledby="partyModalTitle"><header class="party-notice-modal-head"><div><div class="party-notice-modal-meta" id="partyModalMeta"></div><h2 id="partyModalTitle"></h2></div><button type="button" class="party-modal-close" aria-label="공지 닫기">✕</button></header><div class="party-notice-modal-body" id="partyModalBody"></div></section>';
document.body.append(modal);
let priorFocus=null;
const close=()=>{if(modal.hidden)return;modal.hidden=true;document.body.classList.remove('party-notice-modal-open');if(priorFocus?.isConnected)priorFocus.focus();};
modal.querySelector('.party-modal-close').addEventListener('click',close);
modal.addEventListener('click',e=>{if(e.target===modal)close();});
document.addEventListener('keydown',e=>{if(modal.hidden)return;if(e.key==='Escape')close();if(e.key==='Tab'){const btn=modal.querySelector('.party-modal-close');e.preventDefault();btn.focus();}});
function enhance(){for(const item of root.querySelectorAll('.notice-entry')){
 if(item.dataset.partyPopupReady==='1')continue;
 const title=item.querySelector('.notice-entry-heading h4');if(!title)continue;
 item.dataset.partyPopupReady='1'; const button=document.createElement('button');button.type='button';button.className='party-notice-open';button.textContent=title.textContent;
 title.replaceChildren(button);
 button.addEventListener('click',()=>{priorFocus=button;
  document.getElementById('partyModalTitle').textContent=button.textContent;
  const pin=item.querySelector('.notice-pin')?.textContent || '';
  const date=item.querySelector('time')?.textContent || '';
  document.getElementById('partyModalMeta').textContent=[pin,date].filter(Boolean).join(' · ');
  document.getElementById('partyModalBody').textContent=item.querySelector('p')?.textContent || '내용이 없습니다.';
  modal.hidden=false;document.body.classList.add('party-notice-modal-open');modal.querySelector('.party-modal-close').focus();
 });
}}
new MutationObserver(enhance).observe(root,{childList:true});enhance();
})();
