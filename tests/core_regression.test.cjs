const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = { console };
context.window = context;
vm.createContext(context);

for (const file of ['js/core/trading.js', 'js/core/time.js', 'js/services/save.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename:file });
}

{
  const state = {
    capital: 10000,
    owned: { 한결전자:{ qty:-10, avg:100 } },
    loan: 0,
    realizedPnL: 0,
    trades: 0,
    shortsClosed: 0,
    usedLeverage: false,
  };
  const result = context.QT_TRADING.executeLimit(
    state,
    { name:'한결전자', side:'buy', qty:1, price:90 },
    90,
    { feeRate:0.00015, taxRate:0.0018, buyingPower:10000 },
  );
  assert.equal(result.ok, true);
  assert.equal(result.kind, 'cover');
  assert.equal(state.owned.한결전자.qty, -9, '지정가 매수가 공매도 포지션을 덮어쓰면 안 된다');
  assert.equal(state.trades, 1);
  assert.equal(state.shortsClosed, 1);
}

{
  const state = {
    capital: 10000,
    owned: {},
    loan: 0,
    realizedPnL: 0,
    trades: 0,
    shortsClosed: 0,
    usedLeverage: false,
  };
  const result = context.QT_TRADING.executeLimit(
    state,
    { name:'한결전자', side:'buy', qty:2, price:100 },
    100,
    { feeRate:0.00015, taxRate:0.0018, buyingPower:10000 },
  );
  assert.equal(result.kind, 'buy');
  assert.equal(state.owned.한결전자.qty, 2);
}

{
  const state = {
    capital: 1000000,
    owned: {},
    day: 7,
    tick: 81,
    selected: 0,
    speed: 2,
    chartMode: 'candle',
    news: [],
    newsSeq: 0,
    trades: 0,
    realizedPnL: 0,
    shortsClosed: 0,
    maxNetWorth: 1200000,
    watchlist: {},
    loan: 0,
    leverage: 1,
    usedLeverage: false,
    marginCalled: false,
    phase: 'open',
    paused: false,
    sessionTick: 11,
    sessionNews: [{ headline:'장중 이벤트', impact:-0.1 }],
    dayStartNW: 1050000,
    circuitBreakerTicks: 2,
    circuitBreakerTriggered: true,
    marketSessionReturn: -0.08,
    viNewsCount: 1,
    marketEvent: { text:'시장 충격', impact:-0.1 },
    breaking: { headline:'속보', impact:-0.1, timer:123 },
    _factionTradeCall: { stock:'한결전자', direction:1 },
    _raidTarget: 2,
    _obsessionIntrudedDay: 7,
    awaitingNextDay: false,
    pendingOrders: [],
    limitOrders: [],
    companyNews: [],
    life: { children:[] },
    economy: {},
    stocks: [{
      name:'한결전자',
      history:[{ o:100, h:101, l:99, c:100 }],
      listed:true,
      trend:0.001,
      sessionOpen:98,
      viTicks:1,
    }],
    netWorthHist:[1000000],
    bots:[],
  };
  const saved = context.QT_SAVE.createSnapshot(state);
  const loaded = context.QT_SAVE.normalizeSnapshot(JSON.parse(JSON.stringify(saved)));
  assert.equal(loaded.phase, 'open');
  assert.equal(loaded.paused, true, '장중 복원은 안전을 위해 일시정지 상태여야 한다');
  assert.equal(loaded.sessionTick, 11);
  assert.equal(loaded.dayStartNW, 1050000);
  assert.equal(loaded.circuitBreakerTicks, 2);
  assert.equal(loaded.sessionOpen.한결전자, 98);
  assert.equal(loaded.breaking.timer, undefined);
  assert.equal(loaded.marketEvent.text, '시장 충격');
  assert.equal(loaded.intraSession.factionTradeCall.stock, '한결전자');
  assert.equal(loaded.intraSession.raidTarget, 2);
}

{
  const legacy = context.QT_SAVE.normalizeSnapshot({ capital:1000, day:3 });
  assert.equal(legacy.phase, 'closed');
  assert.equal(legacy.sessionTick, 0);
}

{
  const encoded = context.QT_SAVE.encodeResult({
    day: 13,
    netWorth: 25000000,
    realizedPnL: 4000000,
    maxNetWorth: 28000000,
    partner: '나래',
    children: 1,
  });
  const result = context.QT_SAVE.decodeResult('#result=' + encoded);
  assert.equal(result.partner, '나래');
  assert.equal(result.children, 1);
  assert.equal(context.QT_SAVE.decodeResult('#result=' + encoded + 'broken'), null);
}

{
  const month = context.QT_TIME.monthInfo(13, 25);
  assert.equal(month.age, 26);
  assert.equal(month.month, 1);
  assert.equal(context.QT_TIME.monthlyInterest(1000000, 0.004), 4000);
}

console.log('core regression tests: ok');
