/* QuickTrade Life — 직업·사업 중요 변화 View */
(function (root) {
  'use strict';
  const views = root.QT_MONTH_CLOSE_VIEWS = root.QT_MONTH_CLOSE_VIEWS || {};
  views['career-business'] = {
    render(host, props, api) {
      const changes = props.changes || [];
      host.innerHTML = `<div class="window close-window month-flow-window">
        <div class="title-bar career-flow-bar"><div class="title-bar-text">💼 직업·사업 관리</div></div>
        <div class="window-body month-flow-body">
          ${api.progress()}
          <div class="career-month-list">${changes.map(change => `
            <article class="career-month-card ${change.tone || ''}">
              <span>${change.icon || '💼'}</span>
              <div><h3>${change.title}</h3><p>${change.desc || ''}</p><small>${change.detail || ''}</small></div>
            </article>`).join('')}</div>
          <div class="close-actions"><button class="session-btn opening" data-month-close-next>인생 행동 선택</button></div>
        </div>
      </div>`;
      host.querySelector('[data-month-close-next]').addEventListener('click', api.next);
    },
  };
})(window);
