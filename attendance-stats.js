(()=>{'use strict';
const KEY='party-guild-v11-attendance';
const CONTENTS=['요신토벌령','결계지방어','미혹의 정원','신기 쟁탈전'];
const $=id=>document.getElementById(id);
const countKeys=['present','absent','exempt','missing'];
let data=null, hasData=false;
function read(){/* Firebase 자료는 관리자 인증 후 party-cloud-analytics 이벤트로만 받음 */}
window.addEventListener('party-cloud-analytics',e=>{const x=e.detail.attendance;if(!Array.isArray(x?.members)||!Array.isArray(x?.sessions))return;data=x;hasData=true;render();});
function counts(sessions,member){const c={present:0,absent:0,exempt:0,missing:0};for(const s of sessions){const status=data.attendance[s.id]?.[member.id];if(status==='present'||status==='absent'||status==='exempt')c[status]++;else c.missing++}return c}
function rate(c){const total=c.present+c.absent;return total?Math.round(c.present/total*100):null}
function cell(tr,v){const td=document.createElement('td');td.textContent=String(v);tr.append(td);return td}
function percentCell(tr,v){const td=cell(tr,v===null?'—':v+'%');if(v!==null){const bar=document.createElement('div');bar.className='bar';const fill=document.createElement('i');fill.style.width=v+'%';bar.append(fill);td.append(bar)}return td}
function render(){const has=hasData&&data;$('source').textContent=!has?'🔒 Firebase 출석 원본을 확인 중이야. 관리자 로그인이 필요할 수 있어.':'✅ Firebase 운영 출석 원본으로 분석 중 (읽기 전용)';
const content=$('content').value,filter=$('q').value.trim().toLowerCase(),inactive=$('inactive').checked;
const members=has?data.members.filter(m=>m&&typeof m.id==='string'&&typeof m.name==='string'&&(inactive||m.active===true)):[];
const sessions=has?data.sessions.filter(s=>s&&CONTENTS.includes(s.content)&&typeof s.id==='string'&&(content==='all'||s.content===content)):[];
const shown=members.filter(m=>m.name.toLowerCase().includes(filter));
$('sessionCount').textContent=has?sessions.length+'회':'기록 없음';$('memberCount').textContent=has?data.members.filter(m=>m.active===true).length+'명':'기록 없음';
const sum={present:0,absent:0,exempt:0,missing:0};for(const m of members){const c=counts(sessions,m);for(const k of countKeys)sum[k]+=c[k]}
$('recordCount').textContent=has?(sum.present+sum.absent+sum.exempt)+'건':'기록 없음';$('rate').textContent=!has?'기록 없음':(rate(sum)===null?'—':rate(sum)+'%');
const rankings=shown.map(m=>({m,c:counts(sessions,m)}));rankings.sort((a,b)=>(rate(b.c)??-1)-(rate(a.c)??-1)||b.c.present-a.c.present||a.m.name.localeCompare(b.m.name,'ko'));
const rows=$('rows');rows.replaceChildren();if(!rankings.length){const tr=document.createElement('tr');const td=cell(tr,has?'조건에 맞는 문파원이 없어.':'출석 기록 없음');td.colSpan=7;rows.append(tr)}
for(let i=0;i<rankings.length;i++){const {m,c}=rankings[i],r=rate(c),tr=document.createElement('tr');cell(tr,r===null?'—':i+1);cell(tr,m.name+(m.active?'':' (탈퇴)'));for(const k of countKeys)cell(tr,c[k]);percentCell(tr,r);rows.append(tr)}
const by=$('byContent');by.replaceChildren();for(const name of CONTENTS){if(content!=='all'&&content!==name)continue;const ss=sessions.filter(s=>s.content===name),c={present:0,absent:0,exempt:0,missing:0};for(const m of members){const n=counts(ss,m);for(const k of countKeys)c[k]+=n[k]}const tr=document.createElement('tr');cell(tr,name);cell(tr,ss.length);for(const k of countKeys)cell(tr,c[k]);percentCell(tr,rate(c));by.append(tr)}}
$('content').addEventListener('change',render);$('q').addEventListener('input',render);$('inactive').addEventListener('change',render);$('refresh').addEventListener('click',()=>{render()});render();
})();