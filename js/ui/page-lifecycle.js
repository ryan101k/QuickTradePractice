/* =========================================================================
 * QuickTrade Life · 페이지 이탈/복귀 감지
 * 게임 상태를 직접 소유하지 않고, app.js가 전달한 콜백만 호출한다.
 * ========================================================================= */
(function (root) {
  'use strict';

  let mounted = false;
  let pausedDuringLeave = false;
  let handlers = {
    onLeave: null,
    onReturn: null,
  };

  function leave(source) {
    if (typeof handlers.onLeave !== 'function') return;
    const changed = handlers.onLeave({ source });
    if (changed !== false) pausedDuringLeave = true;
  }

  function returnToPage(source) {
    if (!pausedDuringLeave) return;
    pausedDuringLeave = false;
    if (typeof handlers.onReturn === 'function') handlers.onReturn({ source });
  }

  function handleVisibility() {
    if (root.document.visibilityState === 'hidden') leave('visibilitychange');
    else returnToPage('visibilitychange');
  }

  function mount(options = {}) {
    handlers = {
      onLeave: typeof options.onLeave === 'function' ? options.onLeave : null,
      onReturn: typeof options.onReturn === 'function' ? options.onReturn : null,
    };
    if (mounted) return true;
    if (!root.document || typeof root.document.addEventListener !== 'function'
      || typeof root.addEventListener !== 'function') return false;

    root.document.addEventListener('visibilitychange', handleVisibility);
    root.addEventListener('pagehide', () => leave('pagehide'));
    root.addEventListener('pageshow', () => returnToPage('pageshow'));
    root.addEventListener('blur', () => leave('blur'));
    root.addEventListener('focus', () => returnToPage('focus'));
    mounted = true;
    return true;
  }

  root.QT_PAGE_LIFECYCLE = Object.freeze({
    mount,
    isMounted: () => mounted,
  });
})(window);
