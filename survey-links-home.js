/* 공개 홈페이지에서는 유효한 설문 링크만 엽니다. 개인 응답/스프레드시트 링크는 사용하지 않습니다. */
(function () {
  'use strict';
  var links = window.PARTY_SURVEY_LINKS || {};
  function validForm(url) {
    try {
      var parsed = new URL(url);
      return parsed.protocol === 'https:' && (
        parsed.hostname === 'forms.gle' ||
        (parsed.hostname === 'docs.google.com' && /^\/forms\//.test(parsed.pathname)) ||
        (parsed.hostname === 'forms.google.com')
      );
    } catch (e) { return false; }
  }
  document.querySelectorAll('[data-survey-link]').forEach(function (el) {
    var type = el.getAttribute('data-survey-link');
    var url = typeof links[type] === 'string' ? links[type].trim() : '';
    var status = el.querySelector('[data-survey-status]');
    if (validForm(url)) {
      el.href = url;
      el.target = '_blank';
      el.rel = 'noopener noreferrer';
      el.removeAttribute('aria-disabled');
      el.title = type === 'pvp' ? 'PvP 전력 등록 설문 열기' : '주간 콘텐츠 참석 설문 열기';
      if (status) status.textContent = '설문지 작성하기 ↗';
    } else {
      el.setAttribute('aria-disabled', 'true');
      el.addEventListener('click', function (event) { event.preventDefault(); });
    }
  });
})();
