/* QuickTrade Life — 종목 탐색기·호가창 작업공간 UI */
(function (root) {
  'use strict';

  const STORAGE_KEY = 'qt_market_workspace_ui';
  let mounted = false;
  let handlers = {};
  let state = {
    stockMode:'all',
    stockQuery:'',
    stockExpanded:false,
    orderBookCollapsed:false,
  };

  function readState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
      state.stockMode = ['all', 'watch', 'owned'].includes(saved.stockMode) ? saved.stockMode : 'all';
      state.orderBookCollapsed = !!saved.orderBookCollapsed;
    } catch (error) {}
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        stockMode:state.stockMode,
        orderBookCollapsed:state.orderBookCollapsed,
      }));
    } catch (error) {}
  }

  function stockHost() { return document.getElementById('stock-browser-panel'); }

  function mount(options) {
    const host = stockHost();
    if (!host) return false;
    handlers = Object.assign({}, handlers, options || {});
    if (mounted) return true;
    readState();
    host.innerHTML = `<div class="window panel stock-browser-window">
      <div class="title-bar">
        <div class="title-bar-text">📋 종목 탐색기 <span class="stock-result-count" data-stock-count></span></div>
        <div class="workspace-title-actions"><button type="button" data-stock-expand aria-pressed="false">⛶ 크게 보기</button></div>
      </div>
      <div class="panel-toolbar stock-browser-toolbar">
        <label class="stock-search-label">🔎 <input id="stock-search" type="search" placeholder="종목명 검색" autocomplete="off"></label>
        <label>섹터 <select id="sector-filter"><option value="all">전체</option></select></label>
        <div class="stock-mode-buttons" role="group" aria-label="종목 표시 범위">
          <button type="button" data-stock-mode="all">전체</button>
          <button type="button" data-stock-mode="watch">⭐ 관심</button>
          <button type="button" data-stock-mode="owned">💼 보유</button>
        </div>
      </div>
      <div class="window-body scroll stock-browser-scroll"><ul id="stock-list" class="clean-list"></ul></div>
    </div>`;
    const search = document.getElementById('stock-search');
    search.addEventListener('input', () => {
      state.stockQuery = search.value.trim();
      notifyFilter();
    });
    host.querySelectorAll('[data-stock-mode]').forEach(button => {
      button.addEventListener('click', () => {
        state.stockMode = button.dataset.stockMode;
        syncStockMode();
        saveState();
        notifyFilter();
      });
    });
    host.querySelector('[data-stock-expand]').addEventListener('click', () => {
      setStockExpanded(!state.stockExpanded);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && state.stockExpanded) setStockExpanded(false);
    });
    syncStockMode();
    mounted = true;
    return true;
  }

  function initOrderBook() {
    const shell = document.getElementById('orderbook-shell');
    const button = document.getElementById('orderbook-toggle');
    if (!shell || !button) return false;
    button.addEventListener('click', () => {
      state.orderBookCollapsed = !state.orderBookCollapsed;
      syncOrderBook();
      saveState();
      if (handlers.onOrderBookToggle) handlers.onOrderBookToggle(state.orderBookCollapsed);
    });
    syncOrderBook();
    return true;
  }

  function syncOrderBook() {
    const shell = document.getElementById('orderbook-shell');
    const button = document.getElementById('orderbook-toggle');
    if (!shell || !button) return;
    shell.classList.toggle('is-collapsed', state.orderBookCollapsed);
    button.textContent = state.orderBookCollapsed ? '📊 호가창 펼치기' : '📊 호가창 접기';
    button.setAttribute('aria-expanded', String(!state.orderBookCollapsed));
  }

  function syncStockMode() {
    const host = stockHost();
    if (!host) return;
    host.querySelectorAll('[data-stock-mode]').forEach(button => {
      button.classList.toggle('active', button.dataset.stockMode === state.stockMode);
      button.setAttribute('aria-pressed', String(button.dataset.stockMode === state.stockMode));
    });
  }

  function notifyFilter() {
    if (handlers.onStockFilterChange) handlers.onStockFilterChange(filters());
  }

  function filters() {
    return { query:state.stockQuery.toLocaleLowerCase('ko-KR'), mode:state.stockMode };
  }

  function setStockExpanded(next) {
    const host = stockHost();
    if (!host) return false;
    state.stockExpanded = !!next;
    if (state.stockExpanded && root.QT_INFO_MARKET_PANEL) {
      root.QT_INFO_MARKET_PANEL.setExpanded(false);
    }
    host.classList.toggle('workspace-expanded', state.stockExpanded);
    document.body.classList.toggle('workspace-lock', state.stockExpanded);
    const button = host.querySelector('[data-stock-expand]');
    if (button) {
      button.textContent = state.stockExpanded ? '🗗 원래 크기' : '⛶ 크게 보기';
      button.setAttribute('aria-pressed', String(state.stockExpanded));
    }
    if (handlers.onStockLayoutChange) handlers.onStockLayoutChange(state.stockExpanded);
    return true;
  }

  function setStockCount(shown, total) {
    const count = stockHost() && stockHost().querySelector('[data-stock-count]');
    if (count) count.textContent = `· ${shown}/${total}`;
  }

  root.QT_MARKET_WORKSPACE = {
    mount,
    initOrderBook,
    filters,
    setStockCount,
    setStockExpanded,
    isStockExpanded:() => state.stockExpanded,
    isOrderBookCollapsed:() => state.orderBookCollapsed,
  };
})(window);
