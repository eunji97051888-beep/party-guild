(()=>{'use strict';
const button=document.getElementById('publishAttendanceBtn');if(!button)return;
button.addEventListener('click',()=>{
 try{
  let data;try{data=JSON.parse(localStorage.getItem('party-guild-v11-attendance')||'null')}catch{throw Error('출석 기록을 읽지 못했어. JSON 백업을 확인해 줘.')}
  if(!data?.sessions?.length)throw Error('이 PC에 공개할 출석 회차가 없어.');
  const api=window.PARTY_ATTENDANCE_EXPORT;
  if(!api)throw Error('출석 공개 생성 모듈을 읽지 못했어. 새로고침 후 다시 시도해 줘.');
  const payload=api.createPayload(data);
  const unconfirmed=api.unconfirmedCount(payload);
  if(!confirm('문파원 닉네임과 회차별 참석·불참, 10월 30일 이후 참여 방식 및 추첨권이 공개돼. 계속할까?'))return;
  if(unconfirmed&&!confirm(`참여 방식 미확인 ${unconfirmed}건이 있어. 공개 화면에는 "확인 필요"와 임시 추첨권으로 표시돼. 계속 내보낼까?`))return;
  api.download(payload);
  alert('공개용 attendance-public-data.js 다운로드 완료! GitHub 저장소 최상위에 업로드하고 Commit changes를 눌러 줘.');
 }catch(error){alert('공개 파일 생성 실패: '+error.message)}
});
})();
