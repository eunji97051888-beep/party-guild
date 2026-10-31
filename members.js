(()=>{'use strict';
const KEY='party-guild-v11-attendance';const $=id=>document.getElementById(id);
const CONTENTS=['요신토벌령','결계지방어','미혹의 정원','신기 쟁탈전'];
const EMPTY=()=>({version:1,members:[],sessions:[],attendance:{},participationModes:{}});
let state;let activeSession=null;let sessionFilter="all";let editingSessionId=null;const roundSelection={};
const uid=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'m'+Date.now().toString(36)+Math.random().toString(36).slice(2);
const validDate=v=>typeof v==='string'&&(/^\d{4}-\d{2}-\d{2}$/.test(v)||v==='');
const beforeJoin=(m,s)=>!!m.joinDate&&s.date<(m.eligibleFrom||m.joinDate)&&!state.attendance[s.id]?.[m.id];
// 2026-10-30부터 새 정산 규칙. 기존 출석 값은 그대로 보존하며 참여 방식만 별도 저장한다.
const TICKET_START='2026-10-30';
const isPvP=s=>s.content==='신기 쟁탈전'||s.content==='미혹의 정원';
const ticketCount=(s,status,mode)=>status!=='present'?0:s.date<TICKET_START?1:isPvP(s)?(mode==='auto'?1:2):(mode==='clone'?0:1);

const nowDate=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const validRound=n=>Number.isSafeInteger(n)&&n>=1&&n<=9999;
const validTime=v=>typeof v==='string'&&(!v||/^([01]\d|2[0-3]):[0-5]\d$/.test(v));
// 이전 버전의 회차 메모에서 번호/시간/특이사항을 읽되, 원본 label은 별도로 보존한다.
function parseLegacyLabel(raw){
 let remainder=String(raw||'').trim();let round=0,startTime='';
 const roundMatch=remainder.match(/(\d{1,4})\s*회차/);
 if(roundMatch){round=Number(roundMatch[1]);remainder=remainder.replace(roundMatch[0],' ')}
 const timeMatch=remainder.match(/(오전|오후|아침|저녁|밤)?\s*(\d{1,2})\s*시\s*(?:(\d{1,2})\s*분)?\s*(?:시작)?/);
 const clockMatch=!timeMatch&&remainder.match(/\b(\d{1,2}):(\d{2})\s*(?:시작)?/);
 const matched=timeMatch||clockMatch;
 if(matched){
  let hour=Number(timeMatch?timeMatch[2]:clockMatch[1]);const minute=Number(timeMatch?(timeMatch[3]||0):clockMatch[2]);
  const daypart=timeMatch?(timeMatch[1]||''):'';
  // 기존 기록의 "8시"는 게임의 저녁 일정이므로 20시로 읽는다. 오전이 명시된 경우는 그대로 둔다.
  if(daypart==='오후'||daypart==='저녁'||daypart==='밤'||(!daypart&&timeMatch&&hour>=6&&hour<=11))hour=hour%12+12;
  if((daypart==='오전'||daypart==='아침')&&hour===12)hour=0;
  if(hour<=23&&minute<=59)startTime=String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0');
  remainder=remainder.replace(matched[0],' ');
 }
 return {round:validRound(round)?round:0,startTime,memo:remainder.replace(/^[\s/·|,–-]+|[\s/·|,–-]+$/g,'').replace(/\s*[/|·]\s*/g,' · ').trim()};
}
function formatSessionLabel(s){return `${s.round}회차${s.startTime?' / '+s.startTime+' 시작':''}${s.memo?' / '+s.memo:''}`}
function nextRound(content,skipId){return Math.max(0,...state.sessions.filter(s=>s.content===content&&s.id!==skipId).map(s=>s.round||0))+1}
function sessionDescription(s){return [s.date,s.startTime?s.startTime+' 시작':'시간 미정'].join(' · ')}
function attendanceCounts(s){const records=state.attendance[s.id]||{};let present=0,absent=0,exempt=0,missing=0;
 for(const m of state.members){if(!m.active&&!Object.prototype.hasOwnProperty.call(records,m.id))continue;if(beforeJoin(m,s))continue;
  const value=records[m.id];if(value==='present')present++;else if(value==='absent')absent++;else if(value==='exempt')exempt++;else missing++}
 return {present,absent,exempt,missing};}
function el(tag,className,value){const node=document.createElement(tag);if(className)node.className=className;if(value!==undefined)node.textContent=String(value);return node}
function editField(label,type,value,maxLength){const wrap=el('label');wrap.append(document.createTextNode(label));const input=document.createElement('input');input.type=type;input.value=value;if(maxLength)input.maxLength=maxLength;if(type==='number'){input.min='1';input.max='9999';input.step='1'}wrap.append(input);return {wrap,input}}
function safeData(x){if(!x||typeof x!=='object'||!Array.isArray(x.members)||!Array.isArray(x.sessions)||!x.attendance||typeof x.attendance!=='object'||Array.isArray(x.attendance))throw Error('문파원/회차/출석 자료 형식이 올바르지 않아.');
if(x.members.length>500||x.sessions.length>5000)throw Error('데이터 개수가 너무 많아.');const ids=new Set();const members=x.members.map(m=>{if(typeof m?.id!=='string'||!m.id||ids.has(m.id)||typeof m.name!=='string'||!m.name.trim()||m.name.length>35||typeof m.active!=='boolean')throw Error('문파원 정보가 올바르지 않아.');ids.add(m.id);if(m.joinDate!==undefined&&!validDate(m.joinDate))throw Error('가입일 형식 오류');if(m.eligibleFrom!==undefined&&!validDate(m.eligibleFrom))throw Error('출석 대상 시작일 형식 오류');return {id:m.id,name:m.name,active:m.active,joinDate:m.joinDate||'',eligibleFrom:m.eligibleFrom||''}});
const sessionIds=new Set();const sessions=x.sessions.map(s=>{if(typeof s?.id!=='string'||!s.id||sessionIds.has(s.id)||!CONTENTS.includes(s.content)||typeof s.date!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(s.date)||typeof s.label!=='string'||s.label.length>160)throw Error('회차 정보가 올바르지 않아.');
 if(s.round!==undefined&&!validRound(s.round))throw Error('회차 번호 형식 오류');if(s.startTime!==undefined&&!validTime(s.startTime))throw Error('시작 시간 형식 오류');if(s.memo!==undefined&&(typeof s.memo!=='string'||s.memo.length>80))throw Error('회차 메모 형식 오류');
 sessionIds.add(s.id);const old=parseLegacyLabel(s.label);return {id:s.id,content:s.content,date:s.date,label:s.label,round:s.round||old.round,startTime:s.startTime!==undefined?s.startTime:old.startTime,memo:s.memo!==undefined?s.memo:old.memo}});
 // 회차 번호가 없는 구버전 JSON도 복원 가능. 날짜순으로 고유 번호를 한 번만 할당한다.
 for(const content of CONTENTS){const used=new Set();const ordered=sessions.filter(s=>s.content===content).sort((a,b)=>a.date.localeCompare(b.date)||sessions.indexOf(a)-sessions.indexOf(b));for(const entry of ordered){let n=entry.round;if(!validRound(n)||used.has(n)){n=1;while(used.has(n)&&n<9999)n++}entry.round=n;used.add(n)}}
const attendance={};for(const [sessionId,records] of Object.entries(x.attendance)){if(!sessionIds.has(sessionId))continue;if(!records||typeof records!=='object'||Array.isArray(records))throw Error('출석 기록이 올바르지 않아.');attendance[sessionId]={};for(const [id,v] of Object.entries(records)){if(ids.has(id)&&['present','absent','exempt'].includes(v))attendance[sessionId][id]=v}}const participationModes={};const rawModes=x.participationModes||{};
if(typeof rawModes!=='object'||Array.isArray(rawModes))throw Error('참여 방식 기록 형식이 올바르지 않아.');
for(const [sessionId,modes] of Object.entries(rawModes)){
 if(!sessionIds.has(sessionId))continue;
 if(!modes||typeof modes!=='object'||Array.isArray(modes))throw Error('참여 방식 기록이 올바르지 않아.');
 for(const [memberId,mode] of Object.entries(modes)){
  if(ids.has(memberId)&&attendance[sessionId]?.[memberId]==='present'&&['direct','auto','clone'].includes(mode)){
   (participationModes[sessionId]??={})[memberId]=mode;
  }
 }
}
return {version:1,members,sessions,attendance,participationModes}};
try{state=safeData(JSON.parse(localStorage.getItem(KEY)||'null'))}catch{state=EMPTY()}
function save(){try{window.PARTY_HISTORY?.beforeSave(KEY,JSON.stringify(state));localStorage.setItem(KEY,JSON.stringify(state));$('saveStatus').textContent='이 브라우저에 저장됨';$('saveStatus').style.color='#e6c892';return true}catch(e){$('saveStatus').textContent='저장 실패! 백업 필요';alert('브라우저 저장에 실패했어: '+e.message);return false}}
function update(){save();render()}
function resetSelected(){if(activeSession&&!state.sessions.some(s=>s.id===activeSession))activeSession=null;if(!activeSession&&state.sessions.length)activeSession=state.sessions[0].id}
function render(){resetSelected();const members=state.members.filter(m=>m.active||$('showInactive').checked);$('memberCount').textContent=`재적 ${state.members.filter(m=>m.active).length}명 / 전체 ${state.members.length}명`;
const list=$('memberList');list.replaceChildren();if(!members.length){const p=document.createElement('p');p.className='muted';p.textContent='문파원을 먼저 추가해 줘.';list.append(p)}
for(const m of members){const line=document.createElement('div');line.className='memberrow'+(m.active?'':' inactive');const input=document.createElement('input');input.value=m.name;input.maxLength=35;input.setAttribute('aria-label','닉네임 수정');const btn=document.createElement('button');btn.className='btn secondary';btn.textContent='닉네임 저장';btn.onclick=()=>{const name=input.value.trim();if(!name){alert('닉네임을 입력해 줘.');return}if(state.members.some(other=>other.id!==m.id&&other.name.toLowerCase()===name.toLowerCase())){alert('이미 사용 중인 닉네임이야.');return}m.name=name;update()};const toggle=document.createElement('button');toggle.className='btn '+(m.active?'danger':'secondary');toggle.textContent=m.active?'탈퇴 처리':'복귀';toggle.onclick=()=>{if(m.active&&!confirm(`${m.name} 문파원을 탈퇴 처리할까? 과거 출석 기록은 보존돼.`))return;m.active=!m.active;update()};const dateWrap=document.createElement('label');dateWrap.className='member-date-field';dateWrap.textContent='가입일 ';const joined=document.createElement('input');joined.type='date';joined.value=m.joinDate||'';joined.title='기존 문파원은 날짜를 몰라도 비워둘 수 있어';dateWrap.append(joined);
const eligibleWrap=document.createElement('label');eligibleWrap.className='member-date-field';eligibleWrap.textContent='출석 대상 시작일 ';const eligible=document.createElement('input');eligible.type='date';eligible.value=m.eligibleFrom||'';eligible.title='가입 당일 콘텐츠 종료 후 합류했다면 다음 날을 선택';eligibleWrap.append(eligible);
const dateBtn=document.createElement('button');dateBtn.className='btn secondary';dateBtn.textContent='가입정보 저장';dateBtn.onclick=()=>{if(joined.value&&eligible.value&&eligible.value<joined.value){alert('출석 대상 시작일은 가입일보다 빠를 수 없어.');return}m.joinDate=joined.value;m.eligibleFrom=eligible.value;update()};
line.append(input,btn,dateWrap,eligibleWrap,dateBtn,toggle);if(!m.active){const tag=document.createElement('span');tag.textContent='탈퇴';tag.className='tag';line.append(tag)}list.append(line)}
renderSessionManager();
const session=state.sessions.find(s=>s.id===activeSession);
const bulk=$('confirmUnclassifiedBtn');
if(bulk){const unknown=session&&session.date>=TICKET_START?state.members.filter(m=>state.attendance[session.id]?.[m.id]==='present'&&!state.participationModes?.[session.id]?.[m.id]):[];bulk.style.display=unknown.length?'inline-block':'none';bulk.textContent=`미확인 ${unknown.length}명 직접 참여로 확정`;}
$('currentSessionLabel').textContent=session?`${session.content} · ${session.round}회차 · ${sessionDescription(session)}`:'회차를 선택해 줘';const area=$('attendanceArea');area.replaceChildren();if(session){const records=state.attendance[session.id]||{};const sessionMembers=state.members.filter(m=>m.active||Object.prototype.hasOwnProperty.call(records,m.id));if(!sessionMembers.length){const p=document.createElement('p');p.className='muted';p.textContent='먼저 문파원을 추가해 줘.';area.append(p)}for(const m of sessionMembers){
 const r=document.createElement('div');r.className='attendrow'+(session.date>=TICKET_START?' ticket-mode-row':'');
 const name=document.createElement('strong');name.textContent=m.name+(m.active?'':' (탈퇴)');
 const sel=document.createElement('select');sel.setAttribute('aria-label',m.name+' 출석');
 for(const [value,label] of [['','미입력'],['present','참석'],['absent','불참'],['exempt','제외']]){
  const o=document.createElement('option');o.value=value;o.textContent=label;sel.append(o)
 }
 sel.value=records[m.id]||'';
 const joinedLate=beforeJoin(m,session);
 if(joinedLate){sel.disabled=true;sel.title='가입 전: 출석 대상 아님';const na=document.createElement('span');na.className='prejoin-tag';na.textContent='가입 전';r.append(na)}
 sel.onchange=()=>{
  state.attendance[session.id]??={};
  if(sel.value)state.attendance[session.id][m.id]=sel.value;else delete state.attendance[session.id][m.id];
  state.participationModes??={};
  if(sel.value==='present'){
   (state.participationModes[session.id]??={})[m.id]='direct';
  }else if(state.participationModes[session.id]){
   delete state.participationModes[session.id][m.id];
  }
  update();
 };
 r.append(name,sel);
 if(session.date>=TICKET_START){
  const wrap=document.createElement('div');wrap.className='attendance-ticket-wrap';
  const mode=document.createElement('select');mode.setAttribute('aria-label',m.name+' 참여 방식');
  const choices=isPvP(session)?[['','⚠ 참여 방식 확인 필요'],['direct','직접 참여 · 2장'],['auto','오토 방어 · 1장']]:[['','⚠ 참여 방식 확인 필요'],['direct','직접 참여 · 1장'],['clone','분신 등록 · 0장']];
  for(const [value,label] of choices){const o=document.createElement('option');o.value=value;o.textContent=label;mode.append(o)}
  const stored=state.participationModes?.[session.id]?.[m.id];
  mode.value=choices.some(c=>c[0]===stored)?stored:'';
  const note=document.createElement('small');note.className='ticket-mode-note';
  if(sel.value!=='present')note.textContent='참석 체크 후 방식 선택';
  else if(!stored)note.textContent=`방식 확인 필요 · 추첨기는 임시 ${ticketCount(session,'present','direct')}장으로 계산`;
  else note.textContent=`추첨권 ${ticketCount(session,'present',mode.value)}장`;
  mode.disabled=sel.value!=='present'||joinedLate;
  mode.onchange=()=>{state.participationModes[session.id]??={};if(mode.value)state.participationModes[session.id][m.id]=mode.value;else delete state.participationModes[session.id][m.id];update()};
  wrap.append(mode,note);r.append(wrap);
 }
 area.append(r)
}}
const stats=$('statsBody');stats.replaceChildren();for(const m of state.members.filter(m=>m.active||$('showInactive').checked)){const counts={present:0,absent:0,exempt:0,missing:0,prejoin:0};for(const s of state.sessions){if(beforeJoin(m,s)){counts.prejoin++;continue}const v=state.attendance[s.id]?.[m.id];if(v==='present')counts.present++;else if(v==='absent')counts.absent++;else if(v==='exempt')counts.exempt++;else counts.missing++}const denom=counts.present+counts.absent;const cells=[m.name+(m.active?'':' (탈퇴)'),m.joinDate||'미확인',counts.present,counts.absent,counts.exempt,counts.missing,counts.prejoin,`${counts.present}/${denom}`,denom?Math.round(counts.present/denom*100)+'%':'—'];const tr=document.createElement('tr');for(const t of cells){const td=document.createElement('td');td.textContent=String(t);tr.append(td)}stats.append(tr)}
renderContentStats();}
function renderSessionManager(){
 const total=state.sessions.length;$('sessionTotal').textContent=`전체 ${total}회차`;
 const overview=$('sessionOverview');overview.replaceChildren();
 for(const content of CONTENTS){
  const sessions=state.sessions.filter(s=>s.content===content);
  const button=el('button','session-overview-button');button.type='button';button.setAttribute('aria-pressed',String(sessionFilter===content));
  button.append(el('span','session-overview-name',content),el('strong','session-overview-number',sessions.length?sessions.reduce((v,s)=>Math.max(v,s.round),0)+'회차':'0회차'));
  button.title=`${content} · 등록 ${sessions.length}건`;button.onclick=()=>{sessionFilter=sessionFilter===content?'all':content;renderSessionManager()};overview.append(button);
 }
 const filters=$('sessionFilter');filters.replaceChildren();
 for(const name of ['all',...CONTENTS]){const button=el('button','',name==='all'?'전체':name);button.type='button';button.setAttribute('aria-pressed',String(sessionFilter===name));button.onclick=()=>{sessionFilter=name;renderSessionManager()};filters.append(button)}
 const sorted=state.sessions.filter(s=>sessionFilter==='all'||s.content===sessionFilter).slice().sort((a,b)=>b.date.localeCompare(a.date)||(b.startTime||'').localeCompare(a.startTime||'')||b.round-a.round||CONTENTS.indexOf(a.content)-CONTENTS.indexOf(b.content));
 $('sessionVisibleCount').textContent=`${sorted.length}개 표시`;
 const list=$('sessionList');list.replaceChildren();
 if(!sorted.length)list.append(el('p','muted',total?'해당 콘텐츠에 등록된 회차가 없어.':'등록된 회차가 없어. 위에서 첫 회차를 만들어 줘.'));
 for(const s of sorted){
  const line=el('div','sessionrow'+(s.id===activeSession?' selected':''));
  const main=el('div','sessionrow-main');const info=el('div','session-info');
  const name=el('strong','session-name',s.content);const meta=el('span','session-meta',sessionDescription(s));info.append(name,meta);
  if(s.memo)info.append(el('span','session-note','메모 · '+s.memo));
  const counts=attendanceCounts(s);info.append(el('span','session-attendance',`참석 ${counts.present} · 불참 ${counts.absent} · 제외 ${counts.exempt} · 미입력 ${counts.missing}`));
  main.append(el('span','session-round-badge',`${s.round}회차`),info);
  const actions=el('div','session-row-actions');
  const choose=el('button','btn secondary',s.id===activeSession?'선택됨':'출석 체크');choose.type='button';choose.onclick=()=>{activeSession=s.id;editingSessionId=null;render();$('attendanceArea').scrollIntoView({block:'center',behavior:'smooth'})};
  const edit=el('button','btn secondary',editingSessionId===s.id?'수정 닫기':'수정');edit.type='button';edit.setAttribute('aria-expanded',String(editingSessionId===s.id));edit.onclick=()=>{editingSessionId=editingSessionId===s.id?null:s.id;renderSessionManager()};
  const del=el('button','btn danger','삭제');del.type='button';del.onclick=()=>{if(!confirm(`${s.content} ${s.round}회차 (${s.date})와 해당 출석 기록을 모두 삭제할까? JSON 백업이 없다면 복구할 수 없어.`))return;state.sessions=state.sessions.filter(x=>x.id!==s.id);delete state.attendance[s.id];if(state.participationModes)delete state.participationModes[s.id];if(activeSession===s.id)activeSession=null;editingSessionId=null;update();refreshDraftRound()};
  actions.append(choose,edit,del);line.append(main,actions);
  if(editingSessionId===s.id){const panel=el('div','session-edit');panel.append(el('h4','',`${s.content} · ${s.round}회차 수정`));const grid=el('div','session-edit-grid');
   const round=editField('회차 번호','number',s.round),date=editField('참여 날짜','date',s.date),time=editField('시작 시간','time',s.startTime),memo=editField('특이사항 메모','text',s.memo,60);memo.wrap.className='wide';grid.append(round.wrap,date.wrap,time.wrap,memo.wrap);panel.append(grid);
   const buttons=el('div','session-edit-buttons'),apply=el('button','btn primary','변경 저장'),cancel=el('button','btn secondary','취소');apply.type=cancel.type='button';
   apply.onclick=()=>{const n=Number(round.input.value);const d=date.input.value;const t=time.input.value;const m=memo.input.value.trim();if(!validRound(n)||!/^\d{4}-\d{2}-\d{2}$/.test(d)||!validTime(t)){alert('회차 번호(1~9999), 날짜, 시간을 확인해 줘.');return}if(state.sessions.some(other=>other.id!==s.id&&other.content===s.content&&other.round===n)){alert('해당 콘텐츠에 이미 같은 회차 번호가 있어.');return}s.round=n;s.date=d;s.startTime=t;s.memo=m;s.label=formatSessionLabel(s);editingSessionId=null;update();refreshDraftRound()};
   cancel.onclick=()=>{editingSessionId=null;renderSessionManager()};buttons.append(apply,cancel);panel.append(buttons);line.append(panel)}
  list.append(line);
 }
}
function refreshDraftRound(){$('sessionRound').value=String(nextRound($('contentSelect').value));updateSessionPreview()}
function updateSessionPreview(){const content=$('contentSelect').value,date=$('sessionDate').value,round=Number($('sessionRound').value),time=$('sessionTime').value,memo=$('sessionLabel').value.trim();
 $('sessionPreview').textContent=`등록 미리보기 · ${content} · ${validRound(round)?round+'회차':'회차 번호 확인'} · ${date||'날짜 미정'}${time?' · '+time+' 시작':''}${memo?' · '+memo:''}`;}
function renderContentStats(){
 const container=$('contentStats');container.replaceChildren();
 const visible=state.members.filter(m=>m.active||$('showInactive').checked);
 for(const content of CONTENTS){
  const sessions=state.sessions.filter(s=>s.content===content);
  const section=document.createElement('section');section.className='content-stat-card';
  const header=document.createElement('div');header.className='content-stat-head';
  const h=document.createElement('h3');h.textContent=content;
  const sub=document.createElement('span');sub.className='pill';sub.textContent=sessions.length+'회차';
  header.append(h,sub);section.append(header);
  // 회차별 상세보기: 콘텐츠별로 독립된 이전/다음 선택을 유지한다.
  const details=document.createElement('div');details.className='round-details';
  const ordered=sessions.slice().sort((a,b)=>a.round-b.round||a.date.localeCompare(b.date)||(a.startTime||'').localeCompare(b.startTime||''));
  if(!ordered.length){const note=document.createElement('p');note.className='muted';note.textContent='아직 등록된 회차가 없어.';details.append(note)}
  else{
   const wanted=roundSelection[content];let index=ordered.findIndex(v=>v.id===wanted);
   if(index<0)index=ordered.length-1;
   const selected=ordered[index];roundSelection[content]=selected.id;
   const nav=document.createElement('div');nav.className='round-nav';
   const prev=document.createElement('button');prev.type='button';prev.className='btn secondary round-btn';prev.textContent='‹ 이전';prev.disabled=index===0;
   prev.setAttribute('aria-label',content+' 이전 회차');prev.onclick=()=>{roundSelection[content]=ordered[index-1].id;renderContentStats()};
   const label=document.createElement('div');label.className='round-current';
   const title=document.createElement('strong');title.textContent=`${selected.round}회차 / 총 ${ordered.length}회차`;
   const date=document.createElement('small');date.textContent=sessionDescription(selected)+(selected.memo?' · '+selected.memo:'');
   label.append(title,date);
   const next=document.createElement('button');next.type='button';next.className='btn secondary round-btn';next.textContent='다음 ›';next.disabled=index===ordered.length-1;
   next.setAttribute('aria-label',content+' 다음 회차');next.onclick=()=>{roundSelection[content]=ordered[index+1].id;renderContentStats()};
   nav.append(prev,label,next);details.append(nav);
   const detailWrap=document.createElement('div');detailWrap.className='tablewrap';
   const detailTable=document.createElement('table');detailTable.className='round-table';
   const thead=document.createElement('thead');const headings=document.createElement('tr');
   for(const text of ['문파원','해당 회차 출석']){const th=document.createElement('th');th.textContent=text;headings.append(th)}
   thead.append(headings);detailTable.append(thead);
   const tbody=document.createElement('tbody');const counters={present:0,absent:0,exempt:0,missing:0};
   if(!visible.length){const tr=document.createElement('tr');const td=document.createElement('td');td.colSpan=2;td.textContent='문파원을 추가해 줘.';tr.append(td);tbody.append(tr)}
   for(const m of visible){
    const status=state.attendance[selected.id]?.[m.id]||'';
    const key=beforeJoin(m,selected)?'prejoin':['present','absent','exempt'].includes(status)?status:'missing';if(key!=='prejoin')counters[key]++;
    const tr=document.createElement('tr');const name=document.createElement('td');name.textContent=m.name+(m.active?'':' (탈퇴)');
    const cell=document.createElement('td');const badge=document.createElement('span');
    badge.className='attendance-state state-'+key;
    badge.textContent=({present:'참석',absent:'불참',exempt:'제외',missing:'미입력',prejoin:'가입 전'})[key];
    cell.append(badge);tr.append(name,cell);tbody.append(tr);
   }
   detailTable.append(tbody);detailWrap.append(detailTable);details.append(detailWrap);
   const totals=document.createElement('p');totals.className='round-totals';
   totals.textContent=`참석 ${counters.present}명 · 불참 ${counters.absent}명 · 제외 ${counters.exempt}명 · 미입력 ${counters.missing}명`;
   details.append(totals);
  }
  section.append(details);container.append(section);
 }
}
function addMembers(raw){const names=raw.split(/\r?\n/).map(n=>n.trim()).filter(Boolean);if(!names.length){alert('닉네임을 입력해 줘.');return}let skipped=[];let added=0;for(const name of names){if(name.length>35||state.members.some(m=>m.name.toLowerCase()===name.toLowerCase())){skipped.push(name);continue}state.members.push({id:uid(),name,active:true,joinDate:nowDate(),eligibleFrom:nowDate()});added++}update();if(skipped.length)alert(`${added}명 추가됨. 중복/긴 닉네임 ${skipped.length}명은 건너뜀: ${skipped.slice(0,8).join(', ')}`)}
$('memberName').addEventListener('keydown',e=>{if(e.key==='Enter')$('addMember').click()});$('addMember').onclick=()=>{addMembers($('memberName').value);$('memberName').value=''};$('bulkAdd').onclick=()=>{addMembers($('bulkNames').value);$('bulkNames').value=''};$('showInactive').onchange=render;
for(const text of CONTENTS){const opt=document.createElement('option');opt.value=text;opt.textContent=text;$('contentSelect').append(opt)}
$('sessionDate').value=nowDate();$('contentSelect').onchange=refreshDraftRound;
for(const id of ['sessionDate','sessionTime','sessionRound','sessionLabel'])$(id).addEventListener('input',updateSessionPreview);
$('addSession').onclick=()=>{const content=$('contentSelect').value,date=$('sessionDate').value,time=$('sessionTime').value,round=Number($('sessionRound').value),memo=$('sessionLabel').value.trim();
 if(!content||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!validTime(time)||!validRound(round)){alert('콘텐츠, 날짜, 회차 번호와 시작 시간을 확인해 줘.');return}
 if(state.sessions.some(s=>s.content===content&&s.round===round)){alert(`${content} ${round}회차는 이미 등록돼 있어. 다른 회차 번호를 선택해 줘.`);$('sessionRound').focus();return}
 const s={id:uid(),content,date,round,startTime:time,memo,label:''};s.label=formatSessionLabel(s);
 state.sessions.push(s);activeSession=s.id;editingSessionId=null;sessionFilter=content;$('sessionLabel').value='';$('sessionTime').value='';update();refreshDraftRound()};
refreshDraftRound();
$('backupBtn').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`party-attendance-${nowDate()}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000)};
$('restoreInput').onchange=async()=>{const file=$('restoreInput').files?.[0];if(!file)return;try{if(file.size>4*1024*1024)throw Error('백업 파일이 너무 커.');const incoming=safeData(JSON.parse(await file.text()));if(!confirm('현재 이 브라우저의 모든 문파원/회차/출석 데이터를 백업 파일 내용으로 바꿀까? 기존 기록은 덮어써져.'))return;const previous=state;state=incoming;if(!save()){state=previous;return}activeSession=null;editingSessionId=null;sessionFilter='all';render();refreshDraftRound();alert('백업을 불러왔어.')}catch(e){alert('백업을 불러오지 못했어: '+e.message)}finally{$('restoreInput').value=''}};
const bulkConfirm=$('confirmUnclassifiedBtn');
if(bulkConfirm)bulkConfirm.onclick=()=>{
 const session=state.sessions.find(s=>s.id===activeSession);if(!session||session.date<TICKET_START)return;
 const unknown=state.members.filter(m=>state.attendance[session.id]?.[m.id]==='present'&&!state.participationModes?.[session.id]?.[m.id]);
 if(!unknown.length){alert('참여 방식 미확인 참석자가 없어.');return}
 if(!confirm(`${session.content} ${session.date} · 참여 방식 미확인 ${unknown.length}명을 모두 직접 참여로 확정할까?\n실제로 오토·분신이었던 사람은 먼저 구분하거나 확정 후 반드시 수정해 줘.`))return;
 state.participationModes[session.id]??={};for(const m of unknown)state.participationModes[session.id][m.id]='direct';update();
};
render();})();