(()=>{'use strict';
let items=Array.isArray(window.PARTY_LOTTERY_RESULTS)?structuredClone(window.PARTY_LOTTERY_RESULTS):[];
let incoming=null;const $=id=>document.getElementById(id);
function safe(v){return typeof v==='string'?v:''}
function validate(data){
 if(!data||!data.started_at_kst||!data.participants||typeof data.participants!=='object'||Array.isArray(data.participants)||!Array.isArray(data.winners))throw Error('v3.11 이상 추첨기의 결과 JSON 형식이 아니야.');
 const participants=Object.entries(data.participants);
 if(!participants.length||participants.some(([n,c])=>!n||!Number.isInteger(c)||c<1))throw Error('참가자 데이터가 올바르지 않아.');
 if(!data.winners.length)throw Error('당첨 내역이 없는 파일이야.');
 if(data.winners.some((w,i)=>!w||!Number.isInteger(w.round)||w.round!==i+1||typeof w.name!=='string'||!Object.hasOwn(data.participants,w.name)))throw Error('당첨자 데이터가 올바르지 않아.');
 const total=participants.reduce((s,[,c])=>s+c,0);
 if(total!==data.total_tickets)throw Error('총 추첨권이 참가자 기록과 일치하지 않아.');
 return {started_at_kst:safe(data.started_at_kst),participant_count:participants.length,total_tickets:total,
 settlement_period:safe(data.settlement_period),attendance_range:(data.attendance_range&&typeof data.attendance_range==='object'?{start:safe(data.attendance_range.start),end:safe(data.attendance_range.end)}:null),
 winners:data.winners.map(w=>({round:w.round,name:w.name,confirmed_at_kst:safe(w.confirmed_at_kst)}))};
}
function render(){
 const el=$('items');el.replaceChildren();
 if(!items.length){el.textContent='아직 등록한 결과가 없어.';return}
 items.forEach((item,i)=>{const row=document.createElement('div');row.className='row';row.style.marginBottom='12px';
 const desc=document.createElement('div');desc.textContent=`${item.settlement_period?item.settlement_period+" 정산 · ":""}${item.reward_name} · ${item.started_at_kst} · ${item.winners.length}명`;
 const del=document.createElement('button');del.className='danger';del.textContent='삭제';del.onclick=()=>{if(confirm('이 결과를 게시 목록에서 삭제할까?')){items.splice(i,1);render()}};
 row.append(desc,del);el.append(row)})
}
$('file').addEventListener('change',async e=>{
 incoming=null;try{const file=e.target.files[0];if(!file)return;incoming=validate(JSON.parse(await file.text()));
 $('preview').textContent=`정산 ${incoming.settlement_period||"미지정"} · 집계 ${incoming.attendance_range?.start||"?"} ~ ${incoming.attendance_range?.end||"?"} · 추첨 시작 ${incoming.started_at_kst} · 참여 ${incoming.participant_count}명 · 추첨권 ${incoming.total_tickets}장 · 당첨 ${incoming.winners.length}명`;
 }catch(err){$('preview').textContent='파일 확인 실패: '+err.message;}
});
$('add').onclick=()=>{
 if(!incoming){alert('올바른 추첨 결과 JSON을 먼저 선택해 줘.');return}
 const name=$('reward').value.trim();if(!name){alert('보상 이름을 입력해 줘.');return}
 const key=incoming.started_at_kst;
 if(items.some(x=>x.started_at_kst===key)&&!confirm('같은 시작 시각의 결과가 이미 있어. 그래도 추가할까?'))return;
 const next={...incoming,reward_name:name,post_title:$('postTitle').value.trim()||`${name} 분배 당첨자`,published_at:new Date().toISOString()};
 if(!confirm(`보상: ${name}\n당첨자: ${next.winners.map(w=>w.name).join(', ')}\n\n이 결과를 게시 목록에 추가할까?`))return;
 items.unshift(next);incoming=null;$('file').value='';$('reward').value='';$('postTitle').value='';$('preview').textContent='결과를 추가했어.';render();
};
$('download').onclick=()=>{
 const json=JSON.stringify(items).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
 const blob=new Blob(['window.PARTY_LOTTERY_RESULTS = '+json+';\n'],{type:'text/javascript;charset=utf-8'});
 const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='lottery-results-data.js';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
 $('status').textContent='다운로드 완료. 이제 GitHub 저장소 최상위에 lottery-results-data.js 파일을 업로드하고 Commit changes를 눌러야 홈페이지에 공개돼.';
};
render();
})();