/* QuickTrade Life — 저장/복원 스냅샷과 읽기 전용 결과 공유 */
(function (root) {
  'use strict';

  const SAVE_VERSION = 2;
  const RESULT_VERSION = 1;

  function finite(value, fallback) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function cleanBreaking(value) {
    if (!value) return null;
    const copy = Object.assign({}, value);
    delete copy.timer;
    return copy;
  }

  function createSnapshot(state) {
    return {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      capital: state.capital,
      owned: state.owned,
      day: state.day,
      tick: state.tick,
      selected: state.selected,
      speed: state.speed,
      chartMode: state.chartMode,
      news: (state.news || []).slice(0, 40),
      newsSeq: state.newsSeq || 0,
      trades: state.trades,
      realizedPnL: state.realizedPnL,
      shortsClosed: state.shortsClosed,
      maxNetWorth: state.maxNetWorth,
      watchlist: state.watchlist,
      loan: state.loan,
      leverage: state.leverage,
      usedLeverage: state.usedLeverage,
      marginCalled: state.marginCalled,
      phase: state.phase,
      // 새로고침 직후 주문이 사용자의 확인 없이 진행되지 않도록 장중 저장은 일시정지로 복원한다.
      paused: state.phase === 'open' ? true : !!state.paused,
      sessionTick: state.sessionTick,
      sessionNews: state.sessionNews || [],
      sessionOpen: Object.fromEntries((state.stocks || []).map(stock => [stock.name, stock.sessionOpen])),
      dayStartNW: state.dayStartNW,
      circuitBreakerTicks: state.circuitBreakerTicks,
      circuitBreakerTriggered: state.circuitBreakerTriggered,
      marketSessionReturn: state.marketSessionReturn,
      viNewsCount: state.viNewsCount || 0,
      marketEvent: state.marketEvent || null,
      breaking: cleanBreaking(state.breaking),
      intraSession: {
        factionTradeCall: state._factionTradeCall || null,
        raidTarget: Number.isInteger(state._raidTarget) ? state._raidTarget : null,
        obsessionIntrudedDay: Number.isFinite(state._obsessionIntrudedDay) ? state._obsessionIntrudedDay : null,
      },
      awaitingNextDay: state.awaitingNextDay,
      pendingOrders: state.pendingOrders,
      limitOrders: state.limitOrders,
      companyNews: (state.companyNews || []).slice(0, 60),
      life: state.life,
      economy: state.economy,
      stocks: (state.stocks || []).map(stock => ({
        name: stock.name,
        history: stock.history.slice(-20),
        listed: stock.listed,
        trend: stock.trend,
        pendingIssue: stock.pendingIssue || null,
        issueCooldown: stock.issueCooldown,
        volume: stock.volume,
        delistCounter: stock.delistCounter,
        sessionOpen: stock.sessionOpen,
        viTicks: stock.viTicks || 0,
        viAnnouncedDay: stock.viAnnouncedDay,
        limitAnnouncedDay: stock.limitAnnouncedDay,
        factionFlowTicks: stock.factionFlowTicks || 0,
        factionFlowRate: stock.factionFlowRate || 0,
      })),
      netWorthHist: (state.netWorthHist || []).slice(-60),
      bots: (state.bots || []).map(bot => ({
        name: bot.name,
        leader: bot.leader,
        faction: bot.faction,
        portrait: bot.portrait,
        capital: bot.capital,
        owned: bot.owned,
        assets: bot.assets || [],
        relations: bot.relations || {},
        playerRelation: bot.playerRelation || 0,
        defense: bot.defense || 0,
        jailMonths: bot.jailMonths,
        criminalRecord: bot.criminalRecord,
        monthlyProfit: bot.monthlyProfit,
      })),
    };
  }

  function normalizeSnapshot(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('invalid_save');
    const data = Object.assign({ version:1 }, raw);
    data.day = Math.max(1, Math.floor(finite(data.day, 1)));
    data.tick = Math.max(0, Math.floor(finite(data.tick, 0)));
    data.selected = Math.max(0, Math.floor(finite(data.selected, 0)));
    data.speed = [1, 2, 4].includes(finite(data.speed, 1)) ? finite(data.speed, 1) : 1;
    data.chartMode = data.chartMode === 'candle' ? 'candle' : 'line';
    data.news = Array.isArray(data.news) ? data.news : [];
    data.newsSeq = Math.max(0, Math.floor(finite(data.newsSeq, 0)));
    data.phase = data.phase === 'open' ? 'open' : 'closed';
    data.sessionTick = Math.max(0, Math.floor(finite(data.sessionTick, 0)));
    data.sessionNews = Array.isArray(data.sessionNews) ? data.sessionNews : [];
    data.sessionOpen = data.sessionOpen && typeof data.sessionOpen === 'object' ? data.sessionOpen : {};
    data.dayStartNW = finite(data.dayStartNW, finite(data.capital, 0));
    data.circuitBreakerTicks = Math.max(0, Math.floor(finite(data.circuitBreakerTicks, 0)));
    data.circuitBreakerTriggered = !!data.circuitBreakerTriggered;
    data.marketSessionReturn = finite(data.marketSessionReturn, 0);
    data.viNewsCount = Math.max(0, Math.floor(finite(data.viNewsCount, 0)));
    data.intraSession = data.intraSession && typeof data.intraSession === 'object' ? data.intraSession : {};
    data.intraSession.factionTradeCall = data.intraSession.factionTradeCall || null;
    data.intraSession.raidTarget = Number.isInteger(data.intraSession.raidTarget) ? data.intraSession.raidTarget : null;
    data.intraSession.obsessionIntrudedDay = Number.isFinite(data.intraSession.obsessionIntrudedDay)
      ? data.intraSession.obsessionIntrudedDay : null;
    data.paused = data.phase === 'open' || !!data.paused;
    return data;
  }

  function checksum(text) {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function encodeResult(result) {
    const payload = {
      day: Math.max(1, Math.floor(finite(result.day, 1))),
      netWorth: Math.round(finite(result.netWorth, 0)),
      realizedPnL: Math.round(finite(result.realizedPnL, 0)),
      maxNetWorth: Math.round(finite(result.maxNetWorth, 0)),
      partner: String(result.partner || '').slice(0, 30),
      children: Math.max(0, Math.floor(finite(result.children, 0))),
    };
    const json = JSON.stringify(payload);
    return encodeURIComponent(JSON.stringify({ v:RESULT_VERSION, p:payload, k:checksum(json) }));
  }

  function decodeResult(hash) {
    const marker = '#result=';
    if (!hash || !hash.startsWith(marker)) return null;
    try {
      const envelope = JSON.parse(decodeURIComponent(hash.slice(marker.length)));
      if (!envelope || envelope.v !== RESULT_VERSION || !envelope.p) return null;
      if (envelope.k !== checksum(JSON.stringify(envelope.p))) return null;
      return envelope.p;
    } catch (error) {
      return null;
    }
  }

  root.QT_SAVE = { SAVE_VERSION, createSnapshot, normalizeSnapshot, encodeResult, decodeResult };
})(window);
