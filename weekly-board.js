(()=>{'use strict';
const DAYS=['월','화','수','목','금','토','일'], KINDS={story:'story',boss:'boss',dragon:'dragon',garden:'garden',battle:'battle',reset:'reset',guild:'battle'};
const root=document.getElementById('partyWeeklyBoard');if(!root)return;
let shift=0;const editing=!!document.body.dataset.weeklyEditor;let selected=null;
const $=(tag,cl,txt)=>{const n=document.createElement(tag);if(cl)n.className=cl;if(txt!==undefined)n.textContent=txt;return n};
const data=()=>window.PARTY_WEEKLY_BOARD?.items||[];
function monday(){const t=new Date();t.setHours(12,0,0,0);t.setDate(t.getDate()-((t.getDay()+6)%7)+shift*7);return t}
function instances(){let all=[];for(const [idx,e] of data().entries()){
 if(!e||!Array.isArray(e.days))continue;
 for(const day of e.days){if(!Number.isInteger(day)||day<0||day>6)continue;
 const pos=e.placements?.[day]||{};let row=Math.min(12,Math.max(1,Number(pos.row)||0));if(!row)row=Math.min(12,Math.max(1,idx+1));
 const span=Math.max(1,Math.min(7-day,Math.round(Number(pos.span)||1)));
 all.push({e,day,row,span,idx});}}
 return all;
}
function render(){root.replaceChildren();const nav=$('div','weekly-board-nav'),prev=$('button','','← 이전 주'),next=$('button','','다음 주 →'),label=$('strong');prev.type=next.type='button';prev.onclick=()=>{shift--;render()};next.onclick=()=>{shift++;render()};const start=monday(),end=new Date(start);end.setDate(start.getDate()+6);label.textContent=`${start.getFullYear()}.${String(start.getMonth()+1).padStart(2,'0')}.${String(start.getDate()).padStart(2,'0')} ~ ${String(end.getMonth()+1).padStart(2,'0')}.${String(end.getDate()).padStart(2,'0')}`;nav.append(prev,label,next);root.append(nav);
 const scroll=$('div','weekly-board-scroll'),board=$('div','weekly-board-table'),heads=$('div','weekly-board-grid weekly-board-heads');const now=new Date();
 for(let day=0;day<7;day++){const d=new Date(start);d.setDate(start.getDate()+day);const h=$('div','weekly-board-head'+(d.toDateString()===now.toDateString()?' is-today':''));h.append($('b','',DAYS[day]),$('span','',`${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`));heads.append(h)}board.append(heads);
 const surface=$('div','weekly-board-surface');const all=instances();let totalRows=Math.max(8,...all.map(x=>x.row));totalRows=Math.min(14,totalRows);surface.style.setProperty('--board-rows',totalRows);
 for(let r=1;r<=totalRows;r++){for(let d=0;d<7;d++){const slot=$('div','weekly-board-slot');slot.style.gridColumn=String(d+1);slot.style.gridRow=String(r);if(editing){slot.dataset.day=String(d);slot.dataset.row=String(r);slot.addEventListener('dragover',ev=>{ev.preventDefault();ev.dataTransfer.dropEffect='move';slot.classList.add('drop-target')});slot.addEventListener('dragleave',()=>slot.classList.remove('drop-target'));slot.addEventListener('drop',ev=>{ev.preventDefault();slot.classList.remove('drop-target');let payload;try{payload=JSON.parse(ev.dataTransfer.getData('application/x-party-card')||ev.dataTransfer.getData('text/plain'))}catch{return}if(typeof payload.idx!=='number')return;const entry=data()[payload.idx];if(!entry)return;const src=Number(payload.day);entry.days=entry.days.filter(v=>v!==src);if(!entry.days.includes(d))entry.days.push(d);entry.days.sort((a,b)=>a-b);const old=entry.placements?.[src]||{};entry.placements={...(entry.placements||{})};delete entry.placements[src];entry.placements[d]={row:r,span:Math.min(Number(old.span)||1,7-d)};window.dispatchEvent(new CustomEvent('party-board-changed'));render()})}surface.append(slot)}}
 for(const {e,day,row,span,idx} of all){const kind=Object.hasOwn(KINDS,e.kind)?e.kind:'guild',card=$('div',`weekly-event kind-${kind}`);card.style.gridColumn=`${day+1} / span ${span}`;card.style.gridRow=String(row);card.style.zIndex=String(idx+2);const img=document.createElement('img');img.src=`board-icon-${KINDS[kind]}.png`;img.alt='';img.loading='lazy';img.onerror=()=>img.style.display='none';const content=$('div','weekly-event-main');content.append($('strong','',String(e.title||'일정')));if(e.subtitle)content.append($('small','',String(e.subtitle)));if(e.time)content.append($('div','weekly-event-time',`◷ ${String(e.time)}`));card.append(img,content);
 if(editing){card.draggable=true;card.classList.add('weekly-event-editable');card.title='드래그해서 위치 변경 · 클릭해서 길이/행 설정';card.addEventListener('dragstart',ev=>{ev.dataTransfer.setData('application/x-party-card',JSON.stringify({idx,day}));ev.dataTransfer.effectAllowed='move'});card.addEventListener('click',()=>{selected={idx,day};window.dispatchEvent(new CustomEvent('party-board-selected',{detail:{idx,day,row,span}}))});}
 surface.append(card)}board.append(surface);scroll.append(board);root.append(scroll,$('p','weekly-board-legend',editing?'카드를 빈 칸으로 드래그해서 이동 · 카드를 클릭하면 줄과 가로 길이를 조절할 수 있어.':'※ 매주 반복되는 문파 일정 · 모바일에서는 표를 좌우로 밀어봐.'));
}
window.addEventListener('party-board-refresh',render);render();
})();
