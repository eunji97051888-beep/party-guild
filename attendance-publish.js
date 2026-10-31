// v3.19: Chrome file picker saves a fixed filename and can overwrite the chosen file.
// No changes to attendance, mode, ticket calculation, or historical records.
(()=>{'use strict';
const button=document.getElementById('publishAttendanceBtn');
if(!button)return;
let savedHandle=null; // Reused until the editor tab is closed.
let working=false;
async function saveFile(payload,api){
 const content=api.sourceText(payload);
 if(typeof window.showSaveFilePicker==='function'){
  // The first click opens a Save As dialog. Choose the existing file to replace it.
  // Later clicks in the same tab reuse that file instead of creating (1), (2), etc.
  if(!savedHandle){
   savedHandle=await window.showSaveFilePicker({
    suggestedName:'attendance-public-data.js',
    types:[{description:'JavaScript attendance data',accept:{'text/javascript':['.js']}}],
    excludeAcceptAllOption:false
   });
  }
  try{
   const writer=await savedHandle.createWritable();
   await writer.write(content);
   await writer.close();
  }catch(err){
   // Permission may have been revoked or the old target may have disappeared.
   savedHandle=null;
   throw err;
  }
  return 'saved';
 }
 // Browser fallback: default downloads cannot overwrite an existing file.
 api.download(payload);
 return 'downloaded';
}
button.addEventListener('click',async()=>{
 if(working)return;
 try{
  let data;
  try{data=JSON.parse(localStorage.getItem('party-guild-v11-attendance')||'null')}
  catch{throw Error('출석 기록을 읽지 못했어. JSON 백업을 확인해 줘.')}
  if(!data?.sessions?.length)throw Error('이 PC에 공개할 출석 회차가 없어.');
  const api=window.PARTY_ATTENDANCE_EXPORT;
  if(!api)throw Error('출석 공개 생성 모듈을 읽지 못했어. 새로고침 후 다시 시도해 줘.');
  const payload=api.createPayload(data);
  const unconfirmed=api.unconfirmedCount(payload);
  if(!confirm('문파원 닉네임과 회차별 참석·불참, 10월 30일 이후 참여 방식 및 추첨권이 공개돼. 계속할까?'))return;
  if(unconfirmed&&!confirm(`참여 방식 미확인 ${unconfirmed}건이 있어. 공개 화면에는 "확인 필요"와 임시 추첨권으로 표시돼. 계속 내보낼까?`))return;
  working=true;
  button.disabled=true;
  const result=await saveFile(payload,api);
  if(result==='saved'){
   alert('attendance-public-data.js 저장 완료! 기존 파일을 선택했다면 덮어쓰기까지 끝났어. 이 파일을 GitHub 저장소 최상위에 올려줘.');
  }else{
   alert('브라우저가 파일 덮어쓰기를 지원하지 않아 일반 다운로드했어. Chrome 최신 버전에서 문주편집기를 다시 열어줘.');
  }
 }catch(error){
  if(error?.name==='AbortError')return; // User canceled the Save As dialog.
  alert('공개 파일 저장 실패: '+error.message);
 }finally{
  working=false;
  button.disabled=false;
 }
});
})();
