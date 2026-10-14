(function(){
  'use strict';
  if ('serviceWorker' in navigator) {
    window.addEventListener('load',function(){navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(function(err){console.warn('PWA service worker registration failed',err);});});
  }
  var installed=function(){return window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;};
  if(installed()) return;
  var deferredPrompt=null;
  var float=document.createElement('aside');
  float.id='partyPwaFloat';
  float.setAttribute('aria-label','파티 문파 앱 설치 안내');
  float.innerHTML='<img class="party-pwa-mark" src="party-icon-192.png" alt=""><span class="party-pwa-copy"><span class="party-pwa-title">파티 문파 바로가기</span><span class="party-pwa-sub">홈 화면에서 앱처럼 열어요!</span></span><button id="partyPwaInstall" type="button">설치</button><button id="partyPwaDismiss" type="button" aria-label="설치 안내 닫기">×</button>';
  document.body.appendChild(float);
  var guide=document.createElement('div');
  guide.id='partyPwaGuide';guide.setAttribute('role','dialog');guide.setAttribute('aria-modal','true');guide.setAttribute('aria-label','홈 화면에 추가 안내');
  guide.innerHTML='<div class="pwa-guide-card"><h3>📱 파티 문파 홈 화면에 추가</h3><p id="partyPwaInstructions"></p><button type="button" id="partyPwaClose">확인</button></div>';
  document.body.appendChild(guide);
  var ua=navigator.userAgent.toLowerCase();
  var isIOS=/iphone|ipad|ipod/.test(ua);
  var isAndroid=/android/.test(ua);
  var dismissed=false;
  try{dismissed=sessionStorage.getItem('partyPwaDismissed')==='yes';}catch(e){}
  if(dismissed)float.hidden=true;
  document.getElementById('partyPwaDismiss').addEventListener('click',function(){float.hidden=true;try{sessionStorage.setItem('partyPwaDismissed','yes');}catch(e){}});
  var showGuide=function(){
    var msg=isIOS?'Safari의 공유 버튼(□↑)을 누른 다음 「홈 화면에 추가」를 선택해 주세요.':isAndroid?'Chrome의 ⋮ 메뉴에서 「홈 화면에 추가」 또는 「앱 설치」를 선택해 주세요.':'브라우저의 메뉴에서 「홈 화면에 추가」 또는 「설치」를 선택해 주세요.';
    document.getElementById('partyPwaInstructions').textContent=msg;guide.dataset.open='true';
  };
  document.getElementById('partyPwaClose').addEventListener('click',function(){guide.dataset.open='false';});
  guide.addEventListener('click',function(e){if(e.target===guide)guide.dataset.open='false';});
  window.addEventListener('beforeinstallprompt',function(event){event.preventDefault();deferredPrompt=event;});
  window.addEventListener('appinstalled',function(){deferredPrompt=null;float.hidden=true;guide.dataset.open='false';});
  document.getElementById('partyPwaInstall').addEventListener('click',async function(){
    if(installed()){float.hidden=true;return;}
    if(!deferredPrompt){showGuide();return;}
    var prompt=deferredPrompt;deferredPrompt=null;
    try{await prompt.prompt();await prompt.userChoice;}catch(err){showGuide();}
  });
})();
