import {definitions,db,isAdmin,login,waitAuth,read,runTransaction,serverTimestamp,validate,same} from './party-content-cloud-core.js';
const $=id=>document.getElementById(id),groups=['home','activity','weekly'];
let authorized=false,reviewed=false,candidates={};
const note=(text,err=false)=>{const s=$('state');s.textContent=text;s.style.color=err?'#ffb7b2':'#bcebc9'};
function local(){return {home:window.PARTY_DEFAULT,activity:window.PARTY_ACTIVITY_NEWS,weekly:window.PARTY_WEEKLY_BOARD}}
function prepare(){const result={};for(const k of groups)result[k]=validate(k,local()[k]);return result;}
try{candidates=prepare();$('source').textContent=`공지 ${candidates.home.notices.length}개 / 반복 일정 ${candidates.home.events.length}개 / 활동 소식 ${candidates.activity.length}개 / 주간 플래너 ${candidates.weekly.items.length}개 · 자료실 ${candidates.home.resources.length}개 · 유튜브 ${candidates.home.videos.length}개`;}catch(e){$('source').textContent='현재 GitHub 자료 형식 오류: '+e.message;note('최초 등록 불가. 자료를 확인해 줘.',true)}
async function check(){reviewed=false;$('import').disabled=true;if(!isAdmin())return note('문주 Google 로그인이 필요해.',true);try{candidates=prepare();let lines=[],missing=[];for(const k of groups){const s=await read(definitions[k].ref);if(s.exists()){const v=validate(k,s.data().data);lines.push(`✓ ${definitions[k].name}: Firebase 버전 ${s.data().revision} 이미 존재${same(v,candidates[k])?' (GitHub 내용과 일치)':' (GitHub 내용과 다름 · 덮어쓰기 금지)'}`)}else{missing.push(k);lines.push(`○ ${definitions[k].name}: 새 문서 등록 가능`)}}reviewed=true;$('import').disabled=!missing.length;note(lines.join('
')+'

'+(missing.length?`최초 등록 대상 ${missing.length}종 · 이미 존재하는 문서는 절대 수정하지 않아.`:'3종 모두 서버에 존재해. 최초 등록 불필요.'))}catch(e){note('서버 확인 중단: '+(e.code||e.message),true)}}
$('login').onclick=async()=>{try{await login();authorized=true;await check()}catch(e){note('관리자 로그인 실패: '+(e.code||e.message),true)}};
$('check').onclick=check;
$('import').onclick=async()=>{
 if(!isAdmin()||!reviewed)return;const btn=$('import');btn.disabled=true;
 if(!confirm('현재 GitHub 공개 자료를 Firebase 새 문서에 최초 등록할까?
이미 Firebase에 있는 문서는 수정하지 않아.
기존 출석·보상·행운의전당 자료는 변경하지 않아.')){await check();return}
 try{const prepared=prepare(),created=[];
 await runTransaction(db,async tx=>{
  const snaps=[];for(const k of groups)snaps.push(await tx.get(definitions[k].ref));
  // Existing documents are never overwritten. If their content differs from GitHub, abort rather than silently replacing it.
  for(let i=0;i<groups.length;i++){const k=groups[i];if(snaps[i].exists()&&!same(validate(k,snaps[i].data().data),prepared[k]))throw Error(definitions[k].name+'의 기존 서버 자료가 GitHub 내용과 달라. 이 상태로 최초 등록을 진행하지 않아.');}
  for(let i=0;i<groups.length;i++){const k=groups[i];if(!snaps[i].exists()){tx.set(definitions[k].ref,{format:'party-content-'+k+'-v1',revision:1,data:prepared[k],updatedAt:serverTimestamp()});created.push(k)}}
 });
 for(const k of groups){const s=await read(definitions[k].ref);if(!s.exists()||!same(validate(k,s.data().data),prepared[k]))throw Error('서버 재조회 검증 실패: '+definitions[k].name);}
 note(`✅ Firebase 최초 등록·서버 재조회 완료 · 신규 생성 ${created.length}종
이제 기존 문주편집기·활동 소식·주간 플래너 편집기에서 Firebase 저장을 사용할 수 있어.`);reviewed=false;
 }catch(e){note('⛔ 최초 등록/검증 중단: '+(e.code||e.message)+'
다른 버튼을 누르기 전에 서버 상태를 다시 확인해 줘.',true)}
 finally{$('import').disabled=true}
};
await waitAuth();if(isAdmin())await check();else note('문주 Google 로그인 후 서버 상태 확인을 눌러 줘.');
