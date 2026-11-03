import {db,refs,isAdmin,waitAuth,login,read,runTransaction,serverTimestamp,asJSON} from './party-firebase-shared.js';
const $=id=>document.getElementById(id),status=$('status'),file=$('file');
let revision=null,candidate=window.PARTY_LOTTERY_BALANCES,locked=false;
const note=(s,bad=false)=>{status.textContent=s;status.style.color=bad?'#ffaaa7':'#bde7ca'};
function validate(x){if(!x||x.schema_version!==1||!Array.isArray(x.members)||x.members.length>500||typeof x.currency!=='string')throw Error('킵 잔액 자료 형식이 올바르지 않아.');let sum=0;const names=new Set();for(const m of x.members){if(typeof m.name!=='string'||!m.name.trim()||names.has(m.name)||!['awarded_coins','paid_coins','pending_coins'].every(k=>Number.isSafeInteger(m[k])&&m[k]>=0)||m.pending_coins!==m.awarded_coins-m.paid_coins)throw Error('킵 잔액 인원·계산 오류');sum+=m.pending_coins;names.add(m.name)}if(sum!==x.total_pending_coins)throw Error('이월 잔액 합계가 맞지 않아.');return x}
function preview(){try{const x=validate(candidate);$('preview').textContent=`정산 공개: ${x.members.length}명 · 미지급 합계 ${x.total_pending_coins.toLocaleString('ko-KR')} 주화 · 파일 기준 ${x.exported_at_kst||'미기록'}`;$('publish').disabled=revision===null||locked||!isAdmin()}catch(e){$('preview').textContent='자료 확인 필요: '+e.message;$('publish').disabled=true}}
async function check(){if(!isAdmin())return note('먼저 문주 Google 로그인해 줘.');try{const s=await read(refs.balances);revision=s.exists()?s.data().revision:0;if(!Number.isSafeInteger(revision)||revision<0)throw Error('버전 정보 오류');const old=s.exists()?s.data().data:null;if(old){validate(old);if(!candidate)candidate=old;note(`Firebase 공개 킵 잔액 버전 ${revision} · 저장 인원 ${old.members.length}명. 변경 파일을 선택하지 않으면 기존 파일 내용으로 게시하게 되니 먼저 자료를 확인해 줘.`);}else note('Firebase 공개 킵 잔액 문서가 없어. 현재 게시된 JS 파일을 기준으로 최초 등록 가능.');preview()}catch(e){locked=true;note('조회 중단: '+(e.code||e.message),true)}}
$('login').onclick=async()=>{try{await login();await check()}catch(e){note('로그인 실패: '+(e.code||e.message),true)}};
$('check').onclick=check;
file.onchange=async()=>{try{const f=file.files?.[0];if(!f)return;if(f.size>600000)throw Error('파일이 너무 커.');let t=await f.text();if(f.name.endsWith('.js')){const match=t.match(/^\s*window\.PARTY_LOTTERY_BALANCES\s*=\s*([\s\S]*?)\s*;?\s*$/);if(!match)throw Error('lottery-balances-data.js 파일 형식이 아니야.');t=match[1].trim().replace(/;\s*$/,'')}candidate=validate(JSON.parse(t));preview();note('업로드한 킵 잔액 데이터 검증 완료. Firebase 게시 버튼을 눌러야 반영돼.')}catch(e){candidate=null;preview();note('파일 오류: '+e.message,true)}};
$('publish').onclick=async()=>{
 if(!isAdmin()||revision===null||locked)return;
 try{
  const x=asJSON(validate(candidate));if(!x.members.length)throw Error('빈 이월 명단은 게시하지 않아.');
  if(!confirm(`Firebase 공개 킵 잔액 게시\n${x.members.length}명 · ${x.total_pending_coins} 주화\n서버 버전 ${revision} → ${revision+1}\n기존 GitHub 파일은 보존돼. 게시할까?`))return;
  const base=revision;await runTransaction(db,async tx=>{const s=await tx.get(refs.balances);if((s.exists()?s.data().revision:0)!==base)throw Error('다른 탭에서 장부가 변경됐어.');tx.set(refs.balances,{format:'party-lottery-balances-v1',revision:base+1,data:x,updatedAt:serverTimestamp()})});
  const snap=await read(refs.balances);if(!snap.exists()||snap.data().revision!==base+1)throw Error('서버 재조회 실패');revision=base+1;note('✅ Firebase 킵 잔액 게시 완료 · 버전 '+revision);preview();
 }catch(e){locked=true;preview();note('게시 실패/중단: '+(e.code||e.message)+' · 추가 저장 전 자료를 비교해 줘.',true)}
};
await waitAuth();if(isAdmin())await check();else note('Google 관리자 로그인 필요.');
