/* QuickTrade Life — 인생 행동 선택 View */
(function (root) {
  'use strict';
  const views = root.QT_MONTH_CLOSE_VIEWS = root.QT_MONTH_CLOSE_VIEWS || {};
  views['life-action'] = {
    render(host, props, api) {
      host.innerHTML = `<div class="window close-window month-flow-window life-action-flow-window">
        <div class="title-bar life-action-flow-bar"><div class="title-bar-text">🎬 이번 달 인생 행동</div></div>
        <div class="window-body month-flow-body">
          ${api.progress()}
          <div class="life-action-overview">${api.overview()}</div>
          ${api.lifeHubHTML()}
          <div class="close-actions">
            <button class="session-btn opening" data-month-close-next>${api.actionsRemaining() > 0 ? `남은 행동 ${api.actionsRemaining()}회 포기하고 주요 사건으로` : '행동 완료 · 주요 사건 확인'}</button>
          </div>
        </div>
      </div>`;
      api.wireLifeHub(host);
      host.querySelector('[data-month-close-next]').addEventListener('click', api.next);
    },
  };
})(window);
