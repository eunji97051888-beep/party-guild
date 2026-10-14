(function(){
  'use strict';
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function(){navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(function(err){console.warn('PWA service worker registration failed',err);});});
  }
  var deferredPrompt = null;
  var btn = document.createElement('button');
  btn.id = 'partyPwaInstall'; btn.type='button'; btn.className='btn outline'; btn.textContent='📱 홈 화면에 추가';
  var target = document.querySelector('.hero-actions');
  if(target) target.appendChild(btn);
  else return;
  var guide = document.createElement('div');guide.id='partyPwaGuide';guide.setAttribute('role','dialog');guide.setAttribute('aria-modal','true');guide.setAttribute('aria-label','홈 화면에 추가 안내');
  guide.innerHTML='<div class="pwa-guide-card"><h3>📱 파티 문파 홈 화면에 추가</h3><p id="partyPwaInstructions"></p><button type="button" id="partyPwaClose">확인</button></div>';
  document.body.appendChild(guide);
  var ua=navigator.userAgent.toLowerCase();
  var isIOS=/iphone|ipad|ipod/.test(ua);
  var isAndroid=/android/.test(ua);
  var installed=function(){return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone===true;};
  if(installed()) {btn.style.display='none';return;}
  var showGuide=function(){
    var msg=isIOS?'Safari에서 아래 공유 버튼(□↑)을 누른 다음 「홈 화면에 추가」를 선택해 주세요.':isAndroid?'Chrome 오른쪽 위 ⋮ 메뉴에서 「홈 화면에 추가」 또는 「앱 설치」를 선택해 주세요.':'브라우저의 메뉴에서 「홈 화면에 추가」 또는 「설치」를 선택해 주세요.';
    document.getElementById('partyPwaInstructions').textContent=msg;guide.dataset.open='true';
  };
  document.getElementById('partyPwaClose').addEventListener('click',function(){guide.dataset.open='false';});
  guide.addEventListener('click',function(e){if(e.target===guide)guide.dataset.open='false';});
  window.addEventListener('beforeinstallprompt',function(event){event.preventDefault();deferredPrompt=event;});
  window.addEventListener('appinstalled',function(){deferredPrompt=null;btn.style.display='none';guide.dataset.open='false';});
  btn.addEventListener('click',async function(){
    if(installed()){btn.style.display='none';return;}
    if(!deferredPrompt){showGuide();return;}
    var prompt=deferredPrompt;deferredPrompt=null;
    try {await prompt.prompt();await prompt.userChoice;}catch(err){showGuide();}
  });
})();