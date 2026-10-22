(()=>{'use strict';const el=document.getElementById('lotteryResults');if(!el)return;
const entries=Array.isArray(window.PARTY_LOTTERY_RESULTS)?window.PARTY_LOTTERY_RESULTS:[];
function text(tag,cls,value){const e=document.createElement(tag);if(cls)e.className=cls;e.textContent=value??'';return e}
function time(v){if(!v)return '미기록';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(d)}
if(!entries.length)return;
el.replaceChildren();
for(const item of [...entries].sort((a,b)=>String(b.published_at||b.started_at_kst||'').localeCompare(String(a.published_at||a.started_at_kst||'')))){
 const box=text('article','result','');box.append(text('h3','',item.reward_name||'보상 추첨'));
 box.append(text('p','muted',`추첨 시작: ${time(item.started_at_kst)} · 참여 ${item.participant_count||0}명 · 추첨권 ${item.total_tickets||0}장 · 당첨 ${item.winners?.length||0}명`));
 const grid=text('div','winners','');
 for(const w of item.winners||[]){const cell=text('div','winner','');cell.append(text('b','',`${w.round}차`),text('strong','',w.name));if(w.confirmed_at_kst)cell.append(text('div','muted',`확정: ${time(w.confirmed_at_kst)}`));grid.append(cell)}
 box.append(grid);el.append(box);
}
})();