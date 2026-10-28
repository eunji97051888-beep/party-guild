(()=>{
  'use strict';
  const list = document.getElementById('coinMembers');
  const search = document.getElementById('coinSearch');
  const total = document.getElementById('coinTotal');
  const published = document.getElementById('coinPublished');
  if(!list || !search || !total || !published) return;
  const source = window.PARTY_LOTTERY_BALANCES;
  const members = source && Array.isArray(source.members) ? source.members : [];
  const fmt = n => Number(n || 0).toLocaleString('ko-KR');
  if (!members.length){
    total.textContent = '아직 공개된 보상 이월 장부가 없습니다.';
    published.textContent = '장부 미등록';
    list.replaceChildren();
    const p = document.createElement('p');p.className='muted';
    p.textContent = '첫 보상 분배 후 문주가 공개용 장부를 올리면 이곳에서 확인할 수 있습니다.';
    list.append(p);
    search.disabled = true;
    return;
  }
  total.textContent = `전체 미지급 이월 잔액 ${fmt(source.total_pending_coins)} 문파주화 · 기록 ${fmt(members.length)}명`;
  published.textContent = `장부 업데이트: ${String(source.exported_at_kst||'미기록').replace('T',' ').slice(0,19)} (KST)`;
  function render(){
    const q = search.value.trim().toLocaleLowerCase('ko-KR');
    const subset = members.filter(m => String(m.name||'').toLocaleLowerCase('ko-KR').includes(q));
    const grid = document.createElement('div');grid.className = 'coin-members';
    for (const m of subset){
      const card = document.createElement('article');card.className='coin-member';
      const title = document.createElement('h3');title.textContent=String(m.name||'');
      const bal = document.createElement('div');bal.className='coin-balance';
      bal.textContent = `${fmt(m.pending_coins)} 문파주화`;
      const small = document.createElement('p');small.className='coin-sub';
      small.textContent = `누적 당첨 ${fmt(m.awarded_coins)} · 지급 완료 ${fmt(m.paid_coins)} 주화`;
      const status = document.createElement('div');status.className='coin-status';
      status.textContent = Number(m.pending_coins)>0 ? '킵(미지급) 잔액' : '지급 완료 · 이월 없음';
      card.append(title,bal,small,status);grid.append(card);
    }
    list.replaceChildren();
    if(!subset.length){const msg=document.createElement('p');msg.className='muted';msg.textContent='검색한 닉네임의 당첨 기록이 없습니다.';list.append(msg)}
    else list.append(grid);
  }
  search.addEventListener('input',render);
  render();
})();
