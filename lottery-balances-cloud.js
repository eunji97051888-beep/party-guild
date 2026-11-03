(()=>{'use strict';
const list=document.getElementById('coinMembers'),search=document.getElementById('coinSearch'),total=document.getElementById('coinTotal'),published=document.getElementById('coinPublished');if(!list||!search||!total||!published)return;
let source=window.PARTY_LOTTERY_BALANCES;
const mk=(tag,cls,value)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(value!==undefined)el.textContent=String(value);return el};
const asCoins=x=>{const n=Number(x);return Number.isSafeInteger(n)&&n>=0?n:0};
const fmt=x=>asCoins(x).toLocaleString('ko-KR');
function card(m){const el=mk('article','coin-member'),name=mk('strong','coin-name',m.name),coins=mk('strong','coin-balance',`${fmt(m.pending)} 문파주화`),sub=mk('p','coin-sub',`누적 당첨 ${fmt(m.awarded)} · 지급 완료 ${fmt(m.paid)} 주화`),tag=mk('div','coin-status',m.pending?'이월 중 · 미지급 잔액':'지급 완료 · 이월 없음');el.append(name,coins,sub,tag);return el;}
function group(members,title){const h=mk('h3','coin-group-title',title);list.append(h);if(!members.length){list.append(mk('p','muted','해당하는 문파원이 없어.'));return}const grid=mk('div','coin-members');members.forEach(m=>grid.append(card(m)));list.append(grid)}
function render(){
 const raw=Array.isArray(source?.members)?source.members:[];
 const members=raw.map(m=>({name:String(m?.name||'').trim(),pending:asCoins(m.pending_coins),awarded:asCoins(m.awarded_coins),paid:asCoins(m.paid_coins)})).filter(m=>m.name&&(m.pending||m.awarded||m.paid));
 const pending=members.filter(m=>m.pending>0).sort((a,b)=>b.pending-a.pending||a.name.localeCompare(b.name,'ko'));
 const completed=members.filter(m=>m.pending===0).sort((a,b)=>a.name.localeCompare(b.name,'ko'));
 total.textContent=members.length?`현재 이월 중 ${pending.length}명 · 이월 합계 ${fmt(pending.reduce((x,m)=>x+m.pending,0))} 문파주화`:'아직 공개된 보상 이월 장부가 없습니다.';
 published.textContent=source?.exported_at_kst?`장부 기준: ${source.exported_at_kst}`:'장부 미등록';
 list.replaceChildren();const q=search.value.trim().toLocaleLowerCase('ko');
 if(q){const found=members.filter(m=>m.name.toLocaleLowerCase('ko').includes(q));group(found,`검색 결과 ${found.length}명`);return}
 group(pending,`현재 이월 중 · ${pending.length}명`);
 if(completed.length){const details=mk('details','coin-completed'),summary=mk('summary','',`지급 완료 · ${completed.length}명 (보기)`),grid=mk('div','coin-members');completed.forEach(m=>grid.append(card(m)));details.append(summary,grid);list.append(details)}
}
search.addEventListener('input',render);
window.addEventListener('party-lottery-balances',e=>{source=e.detail;render()});render();
})();
