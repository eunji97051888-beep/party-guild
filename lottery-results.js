(()=>{'use strict';
const el=document.getElementById('lotteryResults'),filter=document.getElementById('lotteryMonthFilter');if(!el)return;
const entries=Array.isArray(window.PARTY_LOTTERY_RESULTS)?window.PARTY_LOTTERY_RESULTS:[];
const monthOf=item=>/^\d{4}-\d{2}$/.test(item.settlement_period||'')?item.settlement_period:String(item.started_at_kst||'').slice(0,7);
function text(tag,cls,value){const e=document.createElement(tag);if(cls)e.className=cls;e.textContent=value??'';return e}
function time(v){if(!v)return '미기록';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(d)}
function render(){
 const selected=filter?.value||'all';
 const shown=entries.filter(item=>selected==='all'||monthOf(item)===selected)
  .sort((a,b)=>String(b.published_at||b.started_at_kst||'').localeCompare(String(a.published_at||a.started_at_kst||'')));
 el.replaceChildren();
 if(!shown.length){el.append(text('div','empty','선택한 정산 월에 공개된 추첨 결과가 없습니다.'));return}
 for(const item of shown){
  const box=text('article','result','');box.id='draw-'+encodeURIComponent(String(item.started_at_kst||''));
  box.append(text('h3','',item.post_title||item.reward_name||'보상 추첨'));
  const range=item.attendance_range;
  const rangeText=range?.start&&range?.end?` · 집계 ${range.start} ~ ${range.end}`:'';
  box.append(text('p','muted',`정산 ${monthOf(item)||'미지정'}${rangeText} · 추첨 시작: ${time(item.started_at_kst)} · 참여 ${item.participant_count||0}명 · 추첨권 ${item.total_tickets||0}장 · 당첨 ${item.winners?.length||0}명`));
  const grid=text('div','winners','');
  for(const w of item.winners||[]){const cell=text('div','winner','');cell.append(text('b','',`${w.round}차`),text('strong','',w.name));if(w.confirmed_at_kst)cell.append(text('div','muted',`확정: ${time(w.confirmed_at_kst)}`));grid.append(cell)}
  box.append(grid);el.append(box);
 }
 if(location.hash){try{document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView()}catch(e){}}
}
if(filter){for(const m of [...new Set(entries.map(monthOf).filter(v=>/^\d{4}-\d{2}$/.test(v)))].sort().reverse()){
 const o=document.createElement('option');o.value=m;o.textContent=`${m.slice(0,4)}년 ${Number(m.slice(5))}월 정산`;filter.append(o)}
 filter.addEventListener('change',render)}
render();
})();
