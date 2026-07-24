/* QuickTrade Life — 월말 공통 주요 사건 View */
(function (root) {
  'use strict';
  const views = root.QT_MONTH_CLOSE_VIEWS = root.QT_MONTH_CLOSE_VIEWS || {};
  views['major-event'] = {
    render(host, props, api) {
      const event = props.event || {};
      const tone = event.tone === 'good' ? 'up' : event.tone === 'bad' ? 'down' : '';
      host.innerHTML = `<div class="window close-window month-flow-window major-event-view">
        <div class="title-bar event-bar"><div class="title-bar-text">${event.icon || '📌'} 주요 사건</div></div>
        <div class="window-body month-flow-body">
          ${api.progress()}
          ${event.scene ? `<img class="life-scene-banner" src="${event.scene}" alt="${event.title || '주요 사건'} 장면">` : ''}
          <div class="event-title ${tone}">${event.icon || '📌'} ${event.title || '이번 달 주요 사건'}</div>
          <div class="event-desc">${event.desc || ''}</div>
          ${event.detail ? `<div class="important-event-detail">${event.detail}</div>` : ''}
          <div class="important-event-count">남은 주요 사건 ${props.remaining || 0}건</div>
          <div class="close-actions"><button class="session-btn opening" data-major-event-next>확인${props.remaining ? ' · 다음 사건' : ''}</button></div>
        </div>
      </div>`;
      host.querySelector('[data-major-event-next]').addEventListener('click', api.next);
    },
  };
})(window);
