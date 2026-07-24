/* QuickTrade Life — 생활 상태 변화 View */
(function (root) {
  'use strict';
  const views = root.QT_MONTH_CLOSE_VIEWS = root.QT_MONTH_CLOSE_VIEWS || {};
  views['life-status'] = {
    render(host, props, api) {
      const changes = props.changes || [];
      host.innerHTML = `<div class="window close-window month-flow-window">
        <div class="title-bar life-bar"><div class="title-bar-text">🧭 이번 달 삶의 변화</div></div>
        <div class="window-body month-flow-body">
          ${api.progress()}
          <p class="month-flow-intro">금전 정산과 분리해 실제로 달라진 상태만 보여줍니다.</p>
          <div class="month-change-list">${changes.map(change => `
            <div class="month-change-row ${change.delta > 0 ? 'positive' : change.delta < 0 ? 'negative' : ''}">
              <span class="month-change-icon">${change.icon || '•'}</span>
              <span><b>${change.label}</b>${change.detail ? `<small>${change.detail}</small>` : ''}</span>
              <strong>${change.beforeText == null ? change.before : change.beforeText} → ${change.afterText == null ? change.after : change.afterText}</strong>
            </div>`).join('')}</div>
          <div class="close-actions"><button class="session-btn opening" data-month-close-next>다음 단계</button></div>
        </div>
      </div>`;
      host.querySelector('[data-month-close-next]').addEventListener('click', api.next);
    },
  };
})(window);
