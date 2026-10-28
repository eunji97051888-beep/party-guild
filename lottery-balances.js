(()=>{
  'use strict';
  const list = document.getElementById('coinMembers');
  const search = document.getElementById('coinSearch');
  const total = document.getElementById('coinTotal');
  const published = document.getElementById('coinPublished');
  if (!list || !search || !total || !published) return;

  const source = window.PARTY_LOTTERY_BALANCES;
  const raw = source && Array.isArray(source.members) ? source.members : [];
  const asCoins = value => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
  };
  const fmt = number => asCoins(number).toLocaleString('ko-KR');
  const members = raw.map(m => ({
    name: String(m && m.name || '').trim(),
    pending: asCoins(m && m.pending_coins),
    awarded: asCoins(m && m.awarded_coins),
    paid: asCoins(m && m.paid_coins)
  })).filter(m => m.name && (m.pending > 0 || m.awarded > 0 || m.paid > 0));

  if (!members.length) {
    total.textContent = '아직 공개된 보상 이월 장부가 없습니다.';
    published.textContent = '장부 미등록';
    list.replaceChildren();
    const message = document.createElement('p');
    message.className = 'muted';
    message.textContent = '첫 보상 분배 후 문주가 공개용 장부를 올리면 이곳에서 확인할 수 있습니다.';
    list.append(message);
    search.disabled = true;
    return;
  }

  const pendingMembers = members.filter(m => m.pending > 0)
    .sort((a,b) => b.pending-a.pending || a.name.localeCompare(b.name,'ko'));
  const completedMembers = members.filter(m => m.pending === 0)
    .sort((a,b) => a.name.localeCompare(b.name,'ko'));
  const pendingTotal = pendingMembers.reduce((sum,m) => sum + m.pending, 0);
  total.textContent = `현재 이월 ${fmt(pendingTotal)} 문파주화 · 이월 ${pendingMembers.length}명 / 전체 당첨 ${members.length}명`;
  published.textContent = `장부 업데이트: ${String(source.exported_at_kst||'미기록').replace('T',' ').slice(0,19)} (KST)`;

  const message = text => {
    const p = document.createElement('p');
    p.className = 'muted coin-empty';
    p.textContent = text;
    return p;
  };
  const card = m => {
    const article = document.createElement('article');
    article.className = 'coin-member';
    if (m.pending === 0) article.classList.add('coin-member-completed');
    const name = document.createElement('h3');
    name.textContent = m.name;
    const balance = document.createElement('div');
    balance.className = 'coin-balance';
    balance.textContent = `${fmt(m.pending)} 문파주화`;
    const details = document.createElement('p');
    details.className = 'coin-sub';
    details.textContent = `누적 당첨 ${fmt(m.awarded)} · 지급 완료 ${fmt(m.paid)} 주화`;
    const status = document.createElement('div');
    status.className = 'coin-status';
    status.textContent = m.pending > 0 ? '이월 중 · 미지급 잔액' : '지급 완료 · 이월 없음';
    article.append(name, balance, details, status);
    return article;
  };
  const grid = items => {
    const div = document.createElement('div');
    div.className = 'coin-members';
    items.forEach(m => div.append(card(m)));
    return div;
  };
  const groupTitle = title => {
    const h3 = document.createElement('h3');
    h3.className = 'coin-group-title';
    h3.textContent = title;
    return h3;
  };

  function render(){
    const query = search.value.trim().toLocaleLowerCase('ko-KR');
    list.replaceChildren();
    if (query){
      const found = members.filter(m => m.name.toLocaleLowerCase('ko-KR').includes(query));
      list.append(groupTitle(`검색 결과 ${found.length}명`));
      list.append(found.length ? grid(found) : message('검색한 닉네임의 당첨 기록이 없습니다.'));
      return;
    }

    list.append(groupTitle(`현재 이월 중 · ${pendingMembers.length}명`));
    list.append(pendingMembers.length ? grid(pendingMembers) : message('현재 이월 중인 문파원이 없습니다.'));

    if (completedMembers.length){
      const details = document.createElement('details');
      details.className = 'coin-completed';
      const summary = document.createElement('summary');
      const text = document.createElement('strong');
      text.textContent = `지급 완료 · ${completedMembers.length}명`;
      const toggle = document.createElement('span');
      toggle.className = 'coin-completed-toggle';
      const open = document.createElement('span');
      open.className = 'coin-toggle-open';
      open.textContent = '보기 ▾';
      const close = document.createElement('span');
      close.className = 'coin-toggle-close';
      close.textContent = '접기 ▴';
      toggle.append(open,close);
      summary.append(text,toggle);
      details.append(summary,grid(completedMembers));
      list.append(details);
    }
  }
  search.addEventListener('input',render);
  render();
})();
