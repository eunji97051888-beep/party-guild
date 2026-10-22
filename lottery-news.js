(()=>{'use strict';const root=document.getElementById('lotteryNewsList');if(!root)return;
const items=Array.isArray(window.PARTY_LOTTERY_RESULTS)?window.PARTY_LOTTERY_RESULTS:[];
const valid=items.filter(x=>x&&Array.isArray(x.winners)&&x.winners.length);
if(!valid.length)return;
root.replaceChildren();
function key(x){return String(x.published_at||x.started_at_kst||'')}
function id(x){return 'draw-'+encodeURIComponent(String(x.started_at_kst||''))}
function date(x){const v=String(x.started_at_kst||x.published_at||'');const m=v.match(/(\\d{4})-(\\d{2})-(\\d{2})/);return m?`${Number(m[2])}/${Number(m[3])}`:'추첨 결과'}
for(const item of valid.sort((a,b)=>key(b).localeCompare(key(a))).slice(0,5)){
 const a=document.createElement('a');a.className='lottery-news-item';a.href='lottery-results.html#'+id(item);
 const d=document.createElement('span');d.className='lottery-news-date';d.textContent=date(item);
 const title=document.createElement('span');title.className='lottery-news-title';title.textContent=item.post_title||`${item.reward_name||'문파 보상'} 분배 당첨자`;
 const arrow=document.createElement('span');arrow.className='lottery-news-arrow';arrow.textContent='↗';
 a.append(d,title,arrow);root.append(a);
}
})();