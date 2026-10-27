(function () {
  'use strict';
  var initial = window.PARTY_SURVEY_LINKS || {};
  var pvp = document.getElementById('pvp');
  var attendance = document.getElementById('attendance');
  var status = document.getElementById('status');
  pvp.value = initial.pvp || '';
  attendance.value = initial.attendance || '';
  function isValidForm(link) {
    if (!link) return true;
    try {
      var u = new URL(link);
      return u.protocol === 'https:' && (u.hostname === 'forms.gle' || (u.hostname === 'docs.google.com' && u.pathname.startsWith('/forms/')) || u.hostname === 'forms.google.com');
    } catch (e) { return false; }
  }
  document.getElementById('save').addEventListener('click', function () {
    var newPvp = pvp.value.trim();
    var newAttendance = attendance.value.trim();
    if (!isValidForm(newPvp) || !isValidForm(newAttendance)) {
      status.textContent = '구글 설문지 응답자 링크를 입력해 주세요. (forms.gle 또는 docs.google.com/forms/...)';
      status.style.color = '#ffafa2';
      return;
    }
    var content = '/* 파티 문파 설문 바로가기 - 문주가 관리하는 공개 응답자 링크 */\n' +
      'window.PARTY_SURVEY_LINKS = Object.freeze(' + JSON.stringify({ pvp: newPvp, attendance: newAttendance }, null, 2) + ');\n';
    var blob = new Blob([content], {type: 'application/javascript;charset=utf-8'});
    var obj = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = obj; a.download = 'survey-links.js'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(obj); }, 1000);
    status.style.color = '#a1edbe';
    status.textContent = '다운로드 완료! 파일을 GitHub 저장소에 같은 이름으로 업로드하면 반영돼.';
  });
})();
