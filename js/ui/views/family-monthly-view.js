/* QuickTrade Life — 가족·자녀 중요 변화 View */
(function (root) {
  'use strict';
  const views = root.QT_MONTH_CLOSE_VIEWS = root.QT_MONTH_CLOSE_VIEWS || {};
  views['family-monthly'] = {
    render(host, props, api) {
      const changes = props.changes || [];
      host.innerHTML = `<div class="window close-window month-flow-window">
        <div class="title-bar family-flow-bar"><div class="title-bar-text">👨‍👩‍👧 가족·자녀 월간 정리</div></div>
        <div class="window-body month-flow-body">
          ${api.progress()}
          <p class="month-flow-intro">출산, 성장, 부모님 건강처럼 확인할 가치가 큰 변화가 있었어요.</p>
          <div class="career-month-list">${changes.map(change => `
            <article class="career-month-card ${change.tone || ''}">
              <span>${change.icon || '🏠'}</span>
              <div><h3>${change.title}</h3><p>${change.desc || ''}</p>${change.detail ? `<small>${change.detail}</small>` : ''}</div>
            </article>`).join('')}</div>
          <div class="close-actions"><button class="session-btn opening" data-month-close-next>다음 단계</button></div>
        </div>
      </div>`;
      host.querySelector('[data-month-close-next]').addEventListener('click', api.next);
    },
  };
})(window);
