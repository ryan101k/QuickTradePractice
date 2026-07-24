/* QuickTrade Life — 우측 '내 정보 & 시장' 패널 View */
(function (root) {
  'use strict';

  const TABS = [
    { id:'owned', label:'보유' },
    { id:'life', label:'인생' },
    { id:'chat', label:'📱연락' },
    { id:'issue', label:'이슈' },
    { id:'news', label:'뉴스' },
    { id:'rank', label:'랭킹' },
    { id:'ach', label:'업적' },
  ];
  const FILTERS = [
    { id:'all', label:'전체' },
    { id:'stock', label:'📄 종목공시' },
    { id:'market', label:'💹 시장·인생' },
    { id:'mine', label:'💼 보유' },
    { id:'watch', label:'⭐ 관심' },
  ];

  let mounted = false;
  let activeTab = 'owned';
  let expanded = false;
  let handlers = {};

  function host() { return document.getElementById('info-market-panel'); }
  function pane(id) { return host() && host().querySelector(`[data-pane="${id}"]`); }

  function mount(options) {
    const el = host();
    if (!el) return false;
    handlers = Object.assign({}, handlers, options || {});
    if (mounted) return true;
    el.innerHTML = `<div class="window panel info-market-window">
      <div class="title-bar">
        <div class="title-bar-text">💼 내 정보 & 시장</div>
        <div class="workspace-title-actions"><button type="button" data-info-expand aria-pressed="false">⛶ 크게 보기</button></div>
      </div>
      <menu role="tablist" class="tabs info-market-tabs">
        ${TABS.map(tab => `<li role="tab" aria-selected="${tab.id === activeTab}" data-tab="${tab.id}"><a href="#">${tab.label}</a></li>`).join('')}
      </menu>
      <div class="window-body tab-body scroll">
        <div class="tab-pane active" data-pane="owned"><ul id="owned-list" class="clean-list"></ul></div>
        <div class="tab-pane" data-pane="life"><div id="life-panel" class="life-panel"></div></div>
        <div class="tab-pane" data-pane="chat"><div id="chat-panel" class="chat-panel"></div></div>
        <div class="tab-pane" data-pane="issue"><ul id="issue-list" class="clean-list"></ul></div>
        <div class="tab-pane" data-pane="news">
          <div class="news-filters" id="news-filters">
            ${FILTERS.map(filter => `<button class="nf-btn${filter.id === 'all' ? ' active' : ''}" data-nf="${filter.id}">${filter.label}</button>`).join('')}
          </div>
          <ul id="news-log" class="clean-list news-log"></ul>
        </div>
        <div class="tab-pane" data-pane="rank">
          <ul id="leaderboard" class="clean-list leaderboard"></ul>
          <div class="mini-chart-wrap"><span class="mini-label">🏁 나 vs 라이벌 순자산 경쟁</span><canvas id="rivals-nw-chart"></canvas></div>
          <div class="rival-feed-wrap">
            <div class="mini-label">⚔️ 라이벌 동향 (서로 공격·손익·수감)</div>
            <ul id="rival-feed" class="clean-list rival-feed"></ul>
          </div>
          <div class="mini-chart-wrap"><span class="mini-label">내 순자산 추이</span><canvas id="nw-chart"></canvas></div>
        </div>
        <div class="tab-pane" data-pane="ach">
          <div class="ach-header">달성 <span id="ach-count">0/0</span></div>
          <ul id="achievement-list" class="clean-list"></ul>
        </div>
      </div>
    </div>`;
    el.querySelectorAll('[role="tab"][data-tab]').forEach(tab => {
      tab.addEventListener('click', event => {
        event.preventDefault();
        activate(tab.dataset.tab);
      });
    });
    el.querySelectorAll('[data-nf]').forEach(button => {
      button.addEventListener('click', () => {
        if (handlers.onNewsFilter) handlers.onNewsFilter(button.dataset.nf);
      });
    });
    el.querySelector('[data-info-expand]').addEventListener('click', () => setExpanded(!expanded));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && expanded) setExpanded(false);
    });
    mounted = true;
    return true;
  }

  function setExpanded(next) {
    const el = host();
    if (!el) return false;
    expanded = !!next;
    if (expanded && root.QT_MARKET_WORKSPACE) root.QT_MARKET_WORKSPACE.setStockExpanded(false);
    el.classList.toggle('workspace-expanded', expanded);
    document.body.classList.toggle('workspace-lock', expanded);
    const button = el.querySelector('[data-info-expand]');
    if (button) {
      button.textContent = expanded ? '🗗 원래 크기' : '⛶ 크게 보기';
      button.setAttribute('aria-pressed', String(expanded));
    }
    if (handlers.onLayoutChange) handlers.onLayoutChange(activeTab, expanded);
    return true;
  }

  function activate(name, options) {
    const el = host();
    if (!el || !TABS.some(tab => tab.id === name)) return false;
    activeTab = name;
    el.querySelectorAll('[role="tab"][data-tab]').forEach(tab => {
      tab.setAttribute('aria-selected', String(tab.dataset.tab === name));
    });
    el.querySelectorAll('.tab-pane[data-pane]').forEach(item => {
      item.classList.toggle('active', item.dataset.pane === name);
    });
    if (handlers.onTabChange) handlers.onTabChange(name);
    const target = pane(name);
    if (options && options.scroll && target && target.scrollIntoView) {
      target.scrollIntoView({ behavior:'smooth', block:'center' });
    }
    return true;
  }

  function renderOwned(items, onSelect) {
    const el = document.getElementById('owned-list');
    if (!el) return;
    if (!items.length) {
      el.innerHTML = '<li class="muted">보유 종목이 없습니다</li>';
      return;
    }
    el.innerHTML = items.map(item => `<li class="owned-position ${item.short ? 'short ' : ''}${item.profit ? 'profit' : 'loss'}" data-owned="${item.name}">
      <div class="owned-main">${item.short ? '<span class="short-badge">공매도</span>' : ''}<strong>${item.name}</strong><span>${item.qtyText}</span></div>
      <strong class="owned-rate ${item.profit ? 'up' : 'down'}">${item.profit ? '▲' : '▼'} ${item.rateText}</strong>
      <div class="owned-detail"><span>현재 ${item.priceText}</span><span>${item.short ? '진입' : '평단'} ${item.avgText}</span>
      <b class="${item.profit ? 'up' : 'down'}">${item.plText}</b></div>
    </li>`).join('');
    el.querySelectorAll('[data-owned]').forEach(row => {
      row.addEventListener('click', () => onSelect && onSelect(row.dataset.owned));
    });
  }

  function renderIssues(model, onSelect) {
    const el = document.getElementById('issue-list');
    if (!el) return;
    const macro = model.macro;
    el.innerHTML = `<li class="${macro.good ? 'good' : 'bad'}"><strong>${macro.title}</strong><br><span class="muted">${macro.detail}</span></li>`
      + model.items.map(item => `<li class="issue-stock" title="${item.name} 차트로 이동" data-stock="${item.name}">
        <strong>${item.name}</strong> <span class="${item.good ? 'good' : 'bad'}">${item.text}</span>
        <span class="muted">· 예상 ${item.good ? '호재' : '악재'} ${item.strength} · ${item.limitText}</span>
      </li>`).join('')
      + (!model.items.length ? '<li class="muted">대기 중인 개별 공시 없음 · 이번 달은 경제 뉴스와 업종 흐름을 확인하세요</li>' : '');
    el.querySelectorAll('[data-stock]').forEach(row => {
      row.addEventListener('click', () => onSelect && onSelect(row.dataset.stock));
    });
  }

  function renderNews(model, actions) {
    const ticker = document.getElementById('news-ticker');
    if (ticker) ticker.textContent = model.ticker || '장이 열렸습니다. 행운을 빕니다 📈';
    const el = host();
    if (!el) return;
    el.querySelectorAll('[data-nf]').forEach(button => {
      button.classList.toggle('active', button.dataset.nf === model.filter);
    });
    const log = document.getElementById('news-log');
    if (!log) return;
    if (!model.items.length) {
      log.innerHTML = '<li class="muted">해당하는 뉴스가 없습니다.</li>';
      return;
    }
    log.innerHTML = model.items.map(item => item.kind === 'stock'
      ? `<li class="${item.cls} news-stock" data-stock="${item.name}" title="${item.name} 기업 리포트 열기">
          <span class="muted">[${item.dateLabel}]</span> <strong>${item.name}</strong>${item.held ? '<span class="nf-held">보유</span>' : ''}
          <span class="${item.cls}">${item.arrow} ${item.impactText}</span><br>${item.text}</li>`
      : `<li class="${item.cls}"><span class="muted">[${item.dateLabel}]</span> ${item.text}</li>`
    ).join('');
    log.querySelectorAll('[data-stock]').forEach(row => {
      row.addEventListener('click', () => actions && actions.onStock && actions.onStock(row.dataset.stock));
    });
  }

  function renderRanking(model) {
    const el = document.getElementById('leaderboard');
    if (!el) return;
    el.innerHTML = model.players.map(player => `<li class="${player.rowClass}">
      ${player.medal} ${player.avatar || ''}<strong>${player.name}</strong>${player.faction ? ` <span class="muted">${player.faction}</span>` : ''}
      ${player.valueText}원 <span class="${player.profitClass}">(${player.rateText})</span>${player.tail || ''}
      ${player.detailHTML ? `<div class="bot-detail" hidden>${player.detailHTML}</div>` : ''}
    </li>`).join('');
    el.querySelectorAll('.bot-row').forEach(row => {
      row.addEventListener('click', () => {
        const detail = row.querySelector('.bot-detail');
        if (!detail) return;
        detail.hidden = !detail.hidden;
        const toggle = row.querySelector('.bot-toggle');
        if (toggle) toggle.textContent = detail.hidden ? '▼ 보유' : '▲ 접기';
      });
    });
    const feed = document.getElementById('rival-feed');
    if (!feed) return;
    feed.innerHTML = model.feed.length
      ? model.feed.map(item => `<li class="${item.cls}" style="cursor:default"><span class="muted">[${item.dateLabel}]</span> ${item.text}</li>`).join('')
      : '<li class="muted" style="cursor:default">아직 라이벌 동향이 없습니다. 장을 마감하면 갱신됩니다.</li>';
  }

  function renderAchievements(items, countText) {
    const list = document.getElementById('achievement-list');
    const count = document.getElementById('ach-count');
    if (!list || !count) return;
    list.innerHTML = items.map(item => `<li class="${item.done ? 'ach done' : 'ach'}">
      <span class="ach-icon">${item.done ? item.icon : '🔒'}</span> <strong>${item.name}</strong> — <span class="muted">${item.desc}</span>
    </li>`).join('');
    count.textContent = countText;
  }

  root.QT_INFO_MARKET_PANEL = {
    TABS,
    FILTERS,
    mount,
    activate,
    setExpanded,
    isExpanded:() => expanded,
    current:() => activeTab,
    renderOwned,
    renderIssues,
    renderNews,
    renderRanking,
    renderAchievements,
  };
})(window);
