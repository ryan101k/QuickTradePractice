/* QuickTrade Life — shared overlay lifecycle manager */
(function (root) {
  'use strict';

  function create(options) {
    const settings = Object.assign({
      hostId: 'life-event',
      hiddenDisplay: 'none',
      visibleDisplay: 'block',
      defaultClassName: 'event-host',
    }, options || {});

    const doc = settings.document || root.document || null;
    let sequence = 0;
    let active = null;
    let completing = false;

    function getHost(hostId) {
      if (typeof settings.getHost === 'function') return settings.getHost(hostId);
      return doc && typeof doc.getElementById === 'function'
        ? doc.getElementById(hostId) : null;
    }

    function snapshot() {
      if (!active) return null;
      return {
        token: active.token,
        id: active.id,
        type: active.type,
        hostId: active.hostId,
      };
    }

    function hideHost(host, clear) {
      if (!host) return;
      // life-event 호스트는 여러 종류의 팝업이 재사용한다. 이전 팝업이
      // 남긴 DOM0 위임 핸들러가 다음 팝업의 클릭을 가로채지 않게 한다.
      host.onclick = null;
      if (host.style) host.style.display = settings.hiddenDisplay;
      if (clear !== false) host.innerHTML = '';
    }

    function open(config) {
      const entry = Object.assign({}, config || {});
      const hostId = entry.hostId || settings.hostId;
      const host = getHost(hostId);
      if (!host) return { ok:false, reason:'missing_host', hostId };

      if (active && active.host !== host) hideHost(active.host, true);
      host.onclick = null;
      sequence += 1;
      active = {
        token: sequence,
        id: entry.id || `${entry.type || 'overlay'}:${sequence}`,
        type: entry.type || 'overlay',
        hostId,
        host,
        onComplete: typeof entry.onComplete === 'function' ? entry.onComplete : null,
        onClose: typeof entry.onClose === 'function' ? entry.onClose : null,
      };

      if (entry.className != null) host.className = entry.className;
      else if (!host.className && settings.defaultClassName) host.className = settings.defaultClassName;
      if (host.style) host.style.display = entry.display || settings.visibleDisplay;
      return Object.assign({ ok:true, host }, snapshot());
    }

    function adopt(config) {
      if (active) return Object.assign({ ok:true, host:active.host }, snapshot());
      return open(config);
    }

    function close(config) {
      const request = Object.assign({}, config || {});
      if (!active) {
        if (request.forceHost) hideHost(getHost(request.hostId || settings.hostId), request.clear);
        return false;
      }
      if (request.token != null && request.token !== active.token) return false;

      const closing = active;
      active = null;
      hideHost(closing.host, request.clear);
      if (closing.onClose) closing.onClose(request.reason || 'closed', closing);
      return true;
    }

    function complete(result, config) {
      const request = Object.assign({}, config || {});
      if (!active || completing) return false;
      if (request.token != null && request.token !== active.token) return false;

      completing = true;
      const completed = active;
      try {
        close({ token:completed.token, clear:request.clear, reason:'completed' });
        if (completed.onComplete) completed.onComplete(result, completed);
      } finally {
        completing = false;
      }
      return true;
    }

    function reset() {
      completing = false;
      if (active) close({ clear:true, reason:'reset' });
      else hideHost(getHost(settings.hostId), true);
    }

    return Object.freeze({
      open,
      adopt,
      close,
      complete,
      reset,
      current: snapshot,
      isOpen: () => !!active,
      host: () => active ? active.host : getHost(settings.hostId),
    });
  }

  root.QT_OVERLAY_MANAGER = Object.freeze({ create });
})(window);
