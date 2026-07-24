/* QuickTrade Life — 월간 관계 정리 View */
(function (root) {
  'use strict';
  const views = root.QT_MONTH_CLOSE_VIEWS = root.QT_MONTH_CLOSE_VIEWS || {};
  views['relationship-monthly'] = {
    render(host, props, api) {
      const changes = props.changes || [];
      host.innerHTML = `<div class="window close-window month-flow-window">
        <div class="title-bar relationship-flow-bar"><div class="title-bar-text">💬 월간 관계 정리</div></div>
        <div class="window-body month-flow-body">
          ${api.progress()}
          <p class="month-flow-intro">변화 폭이 큰 인물과 다음 달까지 이어질 문제만 정리했습니다.</p>
          <div class="relationship-month-grid">${changes.map(change => `
            <article class="relationship-month-card">
              ${change.portrait ? `<img src="${change.portrait}" alt="${change.name}">` : '<span class="relationship-placeholder">👤</span>'}
              <div><h3>${change.name}</h3><p>${change.summary}</p><small>${change.detail || ''}</small></div>
            </article>`).join('')}</div>
          <div class="close-actions"><button class="session-btn opening" data-month-close-next>다음 단계</button></div>
        </div>
      </div>`;
      host.querySelector('[data-month-close-next]').addEventListener('click', api.next);
    },
  };
})(window);
