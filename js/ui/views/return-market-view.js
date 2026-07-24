/* QuickTrade Life — 월말 흐름 종료·다음 달 복귀 View */
(function (root) {
  'use strict';
  const views = root.QT_MONTH_CLOSE_VIEWS = root.QT_MONTH_CLOSE_VIEWS || {};
  views['return-market'] = {
    render(host, props, api) {
      host.innerHTML = `<div class="window close-window month-flow-window">
        <div class="title-bar close-bar"><div class="title-bar-text">✅ 이번 달 진행 완료</div></div>
        <div class="window-body month-flow-body month-return-body">
          ${api.progress()}
          <div class="month-return-icon">🔔</div>
          <h2>${api.nextMonthLabel()} 시장으로 돌아갈 준비가 됐습니다.</h2>
          <p>정산과 상태 변화, 인생 행동, 주요 사건 처리가 모두 끝났습니다. 다음 개장에서는 월말 계산이 다시 실행되지 않습니다.</p>
          <div class="close-actions"><button class="session-btn opening" data-month-close-finish>▶ ${api.nextMonthLabel()} 개장</button></div>
        </div>
      </div>`;
      host.querySelector('[data-month-close-finish]').addEventListener('click', api.finish);
    },
  };
})(window);
