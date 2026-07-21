/* =========================================================================
 *  QuickTrade Pro — 애플리케이션 로직
 *  엔진(가격 시뮬레이션) + UI 렌더 + 트레이딩 + AI 라이벌 + 업적/저장
 * ========================================================================= */
(function () {
'use strict';

const D = window.QT_DATA;
const PORTFOLIO = window.QT_PORTFOLIO;
const LOAN = window.QT_LOAN;
const RIVALS = window.QT_RIVALS;
const EXPERTS = window.QT_EXPERTS;
const ROMANCE = window.QT_ROMANCE;
const HEALTH = window.QT_HEALTH;
const FAMILY = window.QT_FAMILY;
const CHILD_EVENTS = window.QT_CHILD_EVENTS;
const SOCIAL = window.QT_SOCIAL;
const JUSTICE = window.QT_JUSTICE;
const LEGACY = window.QT_LEGACY;
const CAREER = window.QT_CAREER;
const ECONOMY = window.QT_ECONOMY;
const HOUSING = window.QT_HOUSING;
const LIFE_FINANCE = window.QT_LIFE_FINANCE;

/* ------------------------------------------------------------------ 설정 */
const CFG = {
  START_CAPITAL: 1000000,   // 시작 자본금
  TICK_MS: 4500,            // 기본 1배속 틱 간격(ms) — 템포를 낮춰 덜 정신없게
  DAILY_LIMIT: 0.30,        // 상한가/하한가 ±30%
  FEE_RATE: 0.00015,        // 매매 수수료 0.015%
  TAX_RATE: 0.0018,         // 매도 거래세 0.18%
  HISTORY_LEN: 60,          // 종목 히스토리 보관 길이
  TICKS_PER_DAY: 20,        // 몇 틱마다 하루(day) 증가
  DELIST_PRICE: 100,        // 이 가격 미만 지속 시 상장폐지 위험
  NEWS_MAX: 40,             // 뉴스 로그 최대 보관
  MARGIN_INTEREST: 0.004,   // 신용융자 일 이자 0.4%/day
  MAINT_MARGIN: 0.25,       // 유지증거금율 (자기자본/롱평가액) 미만 시 반대매매
  SHORT_MAX_LEVERAGE: 2.0,  // 순자산 대비 최대 공매도 노출
  SHORT_MAINT_MARGIN: 0.30, // 숏 유지증거금율
  BREAKING_MIN: 0.12,       // 이 이상 |impact| 회사 이슈면 긴급속보 대상
  BREAKING_MS: 11000,       // 긴급속보 자동 닫힘(ms)
  BREAKING_INSESSION_PROB: 0.03, // 장중 속보 등장 확률(아주 가끔). 나머지 뉴스는 마감 리포트에서 몰아 봄
};

const CAP_META = {
  large: { label: '대형', sigma: 0.018, issueMul: 0.5, badge: '🏛️' },
  mid:   { label: '중형', sigma: 0.032, issueMul: 1.0, badge: '🏢' },
  small: { label: '소형', sigma: 0.055, issueMul: 1.5, badge: '🎲' },
  etf:   { label: 'ETF',  sigma: 0.010, issueMul: 0.0, badge: '📊' },
};

/* ------------------------------------------------------------------ 상태 */
const S = {
  capital: CFG.START_CAPITAL,
  stocks: [],                 // 살아있는 종목 [{...master, history, trend, pendingIssue, volume, delistCounter}]
  owned: {},                  // { name: { qty, avg } }  qty<0 이면 공매도 포지션
  selected: 0,
  tick: 0,
  day: 1,
  paused: false,
  speed: 1,                   // 1 | 2 | 4
  timer: null,
  news: [],                   // [{text, cls, day}]
  netWorthHist: [CFG.START_CAPITAL],
  trades: 0,
  realizedPnL: 0,
  shortsClosed: 0,
  maxNetWorth: CFG.START_CAPITAL,
  watchlist: {},              // { name: true }
  soundOn: true,
  bgmOn: false,               // 배경음악 (브라우저 정책상 사용자가 켜야 시작)
  ttsOn: false,
  chartMode: 'line',          // 'line' | 'candle'
  bots: [],                   // AI 라이벌
  unlocked: {},               // 해금된 업적 { id: true } (localStorage)
  marketEvent: null,          // 이번 틱 시장 이벤트
  leverage: 1,                // 신용 배율 1x/2x/3x/5x
  loan: 0,                    // 신용융자(빚) 잔액
  usedLeverage: false,        // 레버리지 매수 경험(업적)
  marginCalled: false,        // 반대매매 경험(업적)
  breaking: null,             // 현재 표시 중인 긴급속보 {headline, target, experts:[], timer}
  phase: 'closed',            // 'closed'(개장 대기/마감) | 'open'(장중)
  sessionTick: 0,             // 이번 장(세션) 경과 틱
  sessionNews: [],            // 이번 장에서 발생한 주요 뉴스(마감 리포트용)
  awaitingNextDay: false,     // 마감 후 '다음달 개장' 대기 상태
  pendingOrders: [],          // 장 마감 중 걸어둔 예약주문 [{id, name, side, qty}] — 다음 개장 시초가에 체결
  dayStartNW: CFG.START_CAPITAL, // 개장 시점 순자산(당월 손익 계산용)
  life: null,                 // 인생 상태(직업/행복/관계/부동산/대출) — boot 에서 초기화
  economy: null,              // 장기 경제 국면
};

/* 인생 모드 설정 */
const LIFE = {
  START_AGE: 25,              // 시작 나이
  HAPPY_DECAY: 2,            // 매달 자연 감소하는 행복
  PROP_APPRECIATE: [0.0, 0.02], // 매달 부동산 시세 상승률 범위
  LIFE_LOAN_INTEREST: 0.02,  // 개인 대출 월 이자 2%
  EVENT_PROB: 0.72,          // 장 마감 때 선택지 이벤트가 뜰 확률
};

function newLife() {
  return {
    started: false,          // 직업 선택 완료 여부
    job: 'none',             // 직업 id
    happy: 50,               // 행복도 0~100
    charm: 0,                // 매력(연애 진행도)
    relationship: 'single',  // single | dating | married
    partner: null,           // 메인 연애 상대(객체)
    lovers: [],              // 양다리 상대 목록 (문어발) — 적발 위험
    met: [],                 // 한 번이라도 만난 사람 (헤어져도 기억한다) — rememberPerson() 참고
    properties: [],          // [{id, name, emoji, value, rent}]
    loan: 0,                 // 개인 대출 잔액
    creditScore: 720,        // 신용점수(0~1000)
    loans: [],               // 금융사별 대출 목록
    collectionLevel: 0,      // 0 정상 ~ 3 방문추심
    sharkMonths: 0,          // 불법 사채 유지 개월
    jailMonths: 0,           // 수감 잔여 개월
    criminalRecord: 0,       // 적발 횟수
    health: 82,               // 건강 0~100
    stress: 22,               // 스트레스 0~100
    fitness: 10,              // 체력·운동 습관
    conditions: [],           // 진단된 질환 id
    generation: 1,            // 가문 세대
    checkups: 0,
    playerName: '나',         // 현재 세대 주인공
    children: [],             // 자녀 목록
    familyPlan: null,         // 출산·입양 대기
    parentAge: 58,
    parentHealth: 78,
    familyBond: 35,
    career: null,
    housing: null,
    finance: null,
    social: null,
    justice: null,
    legacy: null,
    tutorialSeen: false,
    tutorialMet: false,
    makjang: false,
    hobbiesDone: 0,
    dates: 0,
    affection: 0,
    memories: [],
  };
}

/* ------------------------------------------------------------------ 유틸 */
const $ = id => document.getElementById(id);
const won = n => Math.round(n).toLocaleString('ko-KR');
const pct = n => (n >= 0 ? '+' : '') + (n * 100).toFixed(2) + '%';
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// ETF 레버리지 배율 라벨
function levLabel(lev) {
  if (lev > 1) return lev + 'x';
  if (lev === -1) return '인버스';
  if (lev < -1) return Math.abs(lev) + 'x인버스';
  return '1x';
}

function weightedPick(list) {
  const total = list.reduce((s, e) => s + (e.weight || 1), 0);
  let r = Math.random() * total;
  for (const e of list) { r -= (e.weight || 1); if (r <= 0) return e; }
  return list[list.length - 1];
}

/* ------------------------------------------------------------------ 초기화 */
function buildStocks() {
  const normal = D.COMPANY_MASTER.map(m => ({
    ...m,
    history: [{ o: m.price, h: m.price, l: m.price, c: m.price }],
    trend: rand(-0.004, 0.004),   // 완만한 개별 추세(드리프트)
    pendingIssue: null,
    volume: Math.floor(rand(1e5, 1e7)),
    delistCounter: 0,
    listed: true,
  }));
  // ETF: 시장 지수를 배율(lev)만큼 추종. sector 'etf', cap 'etf'
  const etfs = (D.ETFS || []).map(m => ({
    sector: 'etf', cap: 'etf', vol: 1, type: 'etf',
    ...m,
    history: [{ o: m.price, h: m.price, l: m.price, c: m.price }],
    trend: 0,
    pendingIssue: null,
    volume: Math.floor(rand(1e6, 5e7)),
    delistCounter: 0,
    listed: true,
  }));
  S.stocks = normal.concat(etfs);
}

function buildBots() {
  S.bots = RIVALS.createBots();
}

/* ------------------------------------------------------------------ 이벤트 배정 */
function rollIssue(stock) {
  // 30% 확률로 별일 없음, 나머지는 회사/섹터 이벤트 풀에서 선택
  const pool = [];
  D.EVENTS_NONE.forEach(e => pool.push(e));
  D.EVENTS_COMPANY_GOOD.forEach(e => pool.push({ ...e, type: 'good' }));
  D.EVENTS_COMPANY_BAD.forEach(e => pool.push({ ...e, type: 'bad' }));
  D.EVENTS_SECTOR.filter(e => e.sector === stock.sector)
    .forEach(e => pool.push({ ...e, type: e.impact >= 0 ? 'good' : 'bad' }));
  return weightedPick(pool);
}

// OHLC 캔들 한 개 기록 (일반주/ETF 공용)
function pushCandle(stock, changeRate) {
  const prev = stock.history[stock.history.length - 1].c;
  const o = prev;
  const c = Math.max(1, Math.round(prev * (1 + changeRate)));
  const wig = Math.abs(changeRate) * prev * 0.4;
  const h = Math.round(Math.max(o, c) + rand(0, wig));
  const l = Math.round(Math.max(1, Math.min(o, c) - rand(0, wig)));
  stock.history.push({ o, h, l, c });
  if (stock.history.length > CFG.HISTORY_LEN) stock.history.shift();
}

/* ------------------------------------------------------------------ 가격 갱신(핵심) */
function tick() {
  if (S.paused || S.phase !== 'open') return;
  S.tick++;
  S.sessionTick++;
  S._breakCand = [];   // 이번 틱 긴급속보 후보

  // 시장 전체 이벤트: 약 6% 확률로 발생
  S.marketEvent = Math.random() < 0.06 ? weightedPick(D.EVENTS_MARKET) : null;
  const marketImpact = S.marketEvent ? S.marketEvent.impact : 0;
  if (S.marketEvent) {
    addNews(S.marketEvent.text, S.marketEvent.type === 'good' ? 'good' : 'bad');
    const mItem = { headline: S.marketEvent.text, target: '시장 전체', impact: S.marketEvent.impact, market: true };
    S._breakCand.push(mItem);
    S.sessionNews.push(mItem);   // 마감 리포트에 기록
  }

  // (A) 일반 종목 갱신 + 시장 지수(평균 등락률) 집계
  let idxSum = 0, idxCount = 0;
  S.stocks.forEach(stock => {
    if (!stock.listed || stock.type === 'etf') return;   // ETF는 (B)에서 지수 추종으로 처리
    const meta = CAP_META[stock.cap];

    // 1) 대기 중이던 이슈를 이번 틱에 반영
    let issueImpact = 0;
    if (stock.pendingIssue && stock.pendingIssue.impact) {
      issueImpact = stock.pendingIssue.impact * meta.issueMul;
    }

    // 2) 다음 틱용 새 이슈 배정
    stock.pendingIssue = rollIssue(stock);
    // 큰 이슈면 긴급속보 후보 + 마감 리포트 기록 (다음 틱에 반영될 예정 → 미리 베팅 기회)
    if (stock.pendingIssue && Math.abs(stock.pendingIssue.impact) >= CFG.BREAKING_MIN) {
      const nItem = { headline: `${stock.name} — ${stock.pendingIssue.text}`, target: stock.name, impact: stock.pendingIssue.impact };
      S._breakCand.push(nItem);
      S.sessionNews.push(nItem);
    }

    // 3) 랜덤 노이즈(삼각분포로 0 근처가 잦게) + 추세 + 이슈 + 시장
    const noise = (Math.random() + Math.random() - 1) * meta.sigma * stock.vol;
    let changeRate = stock.trend + noise + issueImpact + marketImpact + ECONOMY.stockImpact(S.economy, stock.sector);

    // 4) 상한가/하한가 제한
    changeRate = clamp(changeRate, -CFG.DAILY_LIMIT, CFG.DAILY_LIMIT);

    // 5) 추세는 서서히 평균회귀 + 가끔 방향 전환
    stock.trend = stock.trend * 0.95 + rand(-0.002, 0.002);

    pushCandle(stock, changeRate);
    stock.volume = Math.floor(stock.volume * rand(0.6, 1.5));
    idxSum += changeRate; idxCount++;

    // 상장폐지 카운트 (소형주 한정)
    if (stock.cap === 'small' && stock.history[stock.history.length - 1].c < CFG.DELIST_PRICE) {
      stock.delistCounter++;
      if (stock.delistCounter >= 3) delist(stock);
    } else {
      stock.delistCounter = 0;
    }
  });

  // (B) ETF: 시장 지수 등락률 × 레버리지 배율(인버스는 반대) + 약간의 추적오차
  const indexReturn = idxCount ? idxSum / idxCount : 0;
  S.stocks.forEach(stock => {
    if (!stock.listed || stock.type !== 'etf') return;
    const lev = stock.lev || 1;
    const noise = (Math.random() + Math.random() - 1) * 0.0012;   // 추적오차 최소화 → 레버리지가 또렷이 보이게
    const lim = CFG.DAILY_LIMIT * Math.max(1, Math.abs(lev));
    const changeRate = clamp(indexReturn * lev + noise, -lim, lim);
    pushCandle(stock, changeRate);
    stock.volume = Math.floor(stock.volume * rand(0.6, 1.5));
  });

  // 반대매매(마진콜) 체크
  checkMarginCall();

  // 긴급속보 후보 처리(가장 임팩트 큰 것 하나)
  triggerBreaking();

  runBots();

  const nw = netWorthClean();
  S.netWorthHist.push(nw);
  if (S.netWorthHist.length > 120) S.netWorthHist.shift();
  S.maxNetWorth = Math.max(S.maxNetWorth, nw);

  checkAchievements();
  renderAll();
  autoSave();

  // 세션 시간이 다 되면 자동 장 마감
  if (S.sessionTick >= CFG.TICKS_PER_DAY) closeMarket();
}

/* ------------------------------------------------------------------ 배당/상폐/신규상장 */
function payDividends() {
  let total = 0;
  Object.keys(S.owned).forEach(name => {
    const pos = S.owned[name];
    const stock = S.stocks.find(s => s.name === name);
    if (stock && stock.div && pos.qty > 0) {
      const d = Math.round(stock.history[stock.history.length - 1].c * (stock.div / 4) * pos.qty);
      total += d;
    }
  });
  if (total > 0) {
    S.capital += total;
    addNews(`💵 배당금 ${won(total)}원 입금`, 'good');
    flashToast(`💵 배당금 ${won(total)}원 입금!`, 'good');
  }
}

function delist(stock) {
  stock.listed = false;
  addNews(`🚨 ${stock.name} 상장폐지! 휴지조각이 되었습니다`, 'bad');
  flashToast(`🚨 ${stock.name} 상장폐지!`, 'bad');
  // 보유분은 0원 처리
  if (S.owned[stock.name] && S.owned[stock.name].qty > 0) delete S.owned[stock.name];
  playSound('crash');
}

function maybeNewListing() {
  if (Math.random() > 0.35) return;
  const delisted = S.stocks.filter(s => !s.listed);
  if (delisted.length === 0) return;
  const s = pick(delisted);
  s.listed = true;
  s.price = Math.round(rand(1000, 8000));
  s.history = [{ o: s.price, h: s.price, l: s.price, c: s.price }];
  s.delistCounter = 0;
  addNews(`🆕 ${s.name} 신규 재상장! 따상 노려볼까`, 'good');
}

/* ------------------------------------------------------------------ 마진콜(반대매매) */
function checkMarginCall() {
  const margin = PORTFOLIO.marginState(S, CFG.MAINT_MARGIN, CFG.SHORT_MAINT_MARGIN);
  // 자기자본이 롱평가액의 유지증거금율 미만이면 강제청산
  if (margin.longCall) {
    // 롱 포지션 전량 시장가 청산
    Object.keys(S.owned).forEach(name => {
      const pos = S.owned[name];
      if (pos.qty > 0) {
        const p = priceOf(name);
        const gross = p * pos.qty;
        const proceeds = gross - Math.round(gross * (CFG.FEE_RATE + CFG.TAX_RATE));
        S.realizedPnL += (p - pos.avg) * pos.qty;
        const repay = Math.min(S.loan, proceeds);
        S.loan -= repay;
        S.capital += proceeds - repay;
        delete S.owned[name];
      }
    });
    // 남은 빚은 현금으로 상환
    if (S.loan > 0) { const r = Math.min(S.loan, S.capital); S.loan -= r; S.capital -= r; }
    S.marginCalled = true;
    addNews('☠️ 반대매매 발생! 신용 포지션이 강제 청산되었습니다', 'bad');
    showBreaking({ headline: '☠️ 반대매매(마진콜)! 강제 청산', target: '내 계좌', impact: -0.3, market: true }, true);
    playSound('crash');
    return;
  }

  // 공매도 손실로 자기자본이 숏 평가액의 유지증거금율 아래로 내려가면 강제 숏커버
  if (margin.shortCall) {
    Object.keys(S.owned).forEach(name => {
      const pos = S.owned[name];
      if (pos.qty < 0) {
        const qty = Math.abs(pos.qty);
        const p = priceOf(name);
        const gross = p * qty;
        const fee = Math.round(gross * CFG.FEE_RATE);
        S.capital -= gross + fee;
        S.realizedPnL += (pos.avg - p) * qty - fee;
        delete S.owned[name];
      }
    });
    S.marginCalled = true;
    addNews('☠️ 숏 마진콜 발생! 공매도 포지션이 강제 청산되었습니다', 'bad');
    showBreaking({ headline: '☠️ 숏 마진콜! 공매도 강제 청산', target: '내 계좌', impact: -0.3, market: true }, true);
    playSound('crash');
  }
}

/* ------------------------------------------------------------------ 긴급 속보 + 전문가 */
function triggerBreaking() {
  const cand = S._breakCand || [];
  if (!cand.length) return;
  // 이미 속보가 떠 있으면 유지 (장중 팝업 남발 방지)
  if (S.breaking) return;
  // 장중 속보는 아주 가끔만 — 대부분의 뉴스는 장 마감 리포트에서 몰아 본다
  if (Math.random() > CFG.BREAKING_INSESSION_PROB) return;
  // 가장 임팩트가 큰 사건 하나만 속보로
  const chosen = cand.reduce((a, b) => Math.abs(b.impact) > Math.abs(a.impact) ? b : a);
  showBreaking(chosen);
}

function pickExperts(item) { return EXPERTS.reports(item, 3); }

function showBreaking(item, isAlert) {
  if (S.breaking && S.breaking.timer) clearTimeout(S.breaking.timer);
  const experts = pickExperts(item);
  S.breaking = { ...item, experts, timer: null };
  renderBreaking();
  playSound(isAlert ? 'crash' : (item.impact >= 0 ? 'buy' : 'sell'));
  S.breaking.timer = setTimeout(closeBreaking, CFG.BREAKING_MS);
}

function closeBreaking() {
  if (S.breaking && S.breaking.timer) clearTimeout(S.breaking.timer);
  S.breaking = null;
  renderBreaking();
}

function renderBreaking() {
  const host = $('breaking');
  if (!S.breaking) { host.style.display = 'none'; host.innerHTML = ''; return; }
  const b = S.breaking;
  const rows = b.experts.map(e =>
    `<li class="expert">
       <span class="ex-name">${e.icon} ${e.name} <small>${e.firm} · ${e.style}</small></span>
       <span class="ex-view ${e.bull ? 'up' : 'down'}">${e.bull ? '📈 비중확대' : '📉 비중축소'} · 확신 ${e.confidence}% · ${e.horizon}</span>
       <span class="ex-cmt"><b>판단</b> ${e.thesis}<br><b>확인</b> ${e.catalyst}<br><b>위험</b> ${e.risk}</span>
     </li>`).join('');
  host.style.display = 'block';
  host.innerHTML =
    `<div class="window breaking-window">
       <div class="title-bar breaking-bar">
         <div class="title-bar-text">🚨 긴급 속보 · BREAKING NEWS</div>
         <div class="title-bar-controls"><button aria-label="Close" id="breaking-close"></button></div>
       </div>
       <div class="window-body">
         <div class="breaking-headline">${b.headline}</div>
         <div class="breaking-target">📌 대상: <strong>${b.target}</strong></div>
         <div class="experts-title">🎙️ 전문가 긴급 진단 (제각각입니다, 참고만!)</div>
         <ul class="clean-list experts">${rows}</ul>
         ${isStockName(b.target) ? `<button class="gobuy-btn" id="breaking-buy">📈 ${b.target} 구매하러 가기</button>` : ''}
       </div>
     </div>`;
  const btn = $('breaking-close');
  if (btn) btn.addEventListener('click', closeBreaking);
  const gb = $('breaking-buy');
  if (gb) gb.addEventListener('click', () => goBuy(b.target));
}

// 종목 이름이 실제 상장 종목인지
function isStockName(name) { return S.stocks.some(s => s.listed && s.name === name); }

// 해당 종목 선택 + 차트로 이동 (열려있는 속보/리포트 닫기)
function goBuy(name) {
  const live = S.stocks.filter(s => s.listed);
  const i = live.findIndex(s => s.name === name);
  if (i < 0) { flashToast('해당 종목을 찾을 수 없습니다', 'neutral'); return; }
  S.selected = i;
  if (S.breaking) closeBreaking();
  closeReport();
  renderAll();
  flashToast(`📈 ${name} 선택 · 차트 표시`, 'neutral');
}

/* ------------------------------------------------------------------ 장 개장/마감 */
function openMarket() {
  if (S.phase === 'open') return;
  if (S.awaitingNextDay) S.day++;       // 마감 후 개장이면 다음 날로 넘어감
  S.awaitingNextDay = false;
  S.phase = 'open';
  S.paused = false;
  S.sessionTick = 0;
  S.sessionNews = [];
  S.dayStartNW = netWorthClean();
  closeReport();                        // 마감 리포트 닫기
  addNews(`📅 ${S.day}일차 개장`, 'neutral');
  flashToast(`🔔 ${S.day}일차 장 개장! 행운을 빕니다`, 'good');
  playSound('buy');
  setSpeed(S.speed);                    // 타이머 시작
  $('pause-btn').textContent = '⏸ 일시정지';
  renderMarketPhase();
  runPendingOrders();                   // 마감 중 걸어둔 예약주문을 시초가로 체결
  renderAll();
}

function closeMarket() {
  if (S.phase !== 'open') return;
  S.phase = 'closed';
  S.awaitingNextDay = true;
  if (S.timer) { clearInterval(S.timer); S.timer = null; }
  if (S.breaking) closeBreaking();

  const endedDay = S.day;
  // 장 마감 정산: 신규 상장 / 배당(3일마다) / 신용이자
  maybeNewListing();
  if (endedDay % 3 === 0) payDividends();
  if (S.loan > 0) {
    const interest = Math.round(S.loan * CFG.MARGIN_INTEREST);
    S.loan += interest;
    if (interest > 0) addNews(`🏦 신용이자 ${won(interest)}원 발생 (빚 ${won(S.loan)})`, 'bad');
  }
  S._preSettleNW = netWorthClean();     // 정산 전(=순수 투자 성과) 순자산
  settleMonth();                        // 월급/월세/부동산/개인대출 정산
  addNews(`🔔 ${dateInfo(endedDay).label} 장 마감`, 'neutral');
  playSound('sell');

  renderAll();
  renderMarketPhase();
  renderCloseReport(endedDay);          // 마감 리포트(뉴스 골라보기) 표시
  maybeLifeEvent();                     // 이번 달 선택지 이벤트(있으면 리포트 위로 팝업)
  autoSave();
}

function renderMarketPhase() {
  const btn = $('session-btn');
  const badge = $('phase-badge');
  const open = S.phase === 'open';
  if (open) {
    if (btn) { btn.textContent = '🔴 장 마감'; btn.className = 'session-btn closing'; }
    if (badge) { badge.textContent = '🟢 장중'; badge.className = 'phase-badge open'; }
  } else {
    if (btn) {
      btn.textContent = `🔔 ${S.awaitingNextDay ? S.day + 1 : S.day}일차 개장`;
      btn.className = 'session-btn opening';
    }
    if (badge) { badge.textContent = '🔒 장 마감'; badge.className = 'phase-badge'; }
  }
  const pauseBtn = $('pause-btn');
  if (pauseBtn) pauseBtn.disabled = !open;
  // 마감 중에는 즉시 체결 대신 예약주문
  const buyBtn = $('buy-btn'), sellBtn = $('sell-btn');
  if (buyBtn) buyBtn.textContent = open ? '매수 (B)' : '📌 매수 예약 (B)';
  if (sellBtn) sellBtn.textContent = open ? '매도 (S)' : '📌 매도 예약 (S)';
  // 마감 리포트를 닫아도 다시 열 수 있게
  const reportBtn = $('report-btn');
  if (reportBtn) reportBtn.style.display = (!open && S.awaitingNextDay) ? '' : 'none';
  renderPendingOrders();
  syncBGM();   // 장중 ↔ 마감 트랙 전환
}

/* 장 마감 리포트: 그날의 뉴스를 골라서 전문가 진단까지 볼 수 있다 */
function renderCloseReport(day) {
  const host = $('market-close');
  if (!host) return;
  const nwNow = netWorthClean();
  const investPL = (S._preSettleNW != null ? S._preSettleNW : nwNow) - S.dayStartNW; // 월급 제외한 순수 투자손익
  // 같은 헤드라인은 가장 강한 것 하나로 합치고, 임팩트 큰 순 주요 뉴스만 추린다
  const seen = new Map();
  S.sessionNews.forEach(n => {
    const cur = seen.get(n.headline);
    if (!cur || Math.abs(n.impact) > Math.abs(cur.impact)) seen.set(n.headline, n);
  });
  const totalCnt = seen.size;
  const news = [...seen.values()].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)).slice(0, 6);
  const items = news.length
    ? news.map((n, i) =>
        `<li class="report-news ${n.impact >= 0 ? 'good' : 'bad'}" data-i="${i}">
           <span class="rn-head">${n.impact >= 0 ? '📈' : '📉'} ${n.headline}</span>
           <span class="rn-meta">${n.target} · ${pct(n.impact)} <span class="muted">(클릭 → 전문가 진단)</span></span>
           <div class="rn-detail" id="rn-detail-${i}"></div>
         </li>`).join('')
    : '<li class="muted" style="cursor:default">📭 오늘은 특별한 뉴스가 없는 조용한 하루였습니다.</li>';

  const st = S._settle || {};
  const settleBits = [];
  if (st.salary) settleBits.push(`${st.salary >= 0 ? '월급' : '적자'} <b class="${st.salary >= 0 ? 'up' : 'down'}">${st.salary >= 0 ? '+' : ''}${won(st.salary)}</b>`);
  if (st.rent) settleBits.push(`월세 <b class="up">+${won(st.rent)}</b>`);
  if (st.partner) settleBits.push(`배우자 <b class="${st.partner >= 0 ? 'up' : 'down'}">${st.partner >= 0 ? '+' : ''}${won(st.partner)}</b>`);
  if (st.incident) settleBits.push(`🚑사고 <b class="down">-${won(st.incident.cost)}</b>`);
  if (st.scandal) {
    const kind = st.scandal.wasMarried ? '불륜' : '양다리';
    settleBits.push(st.scandal.forgiven
      ? `😰${kind}발각 <b class="down">용서받음 · 친밀도 급락</b>`
      : `😱${kind}발각 <b class="down">${st.scandal.settle ? `-${won(st.scandal.settle)}` : '이별'}${st.scandal.fired ? ' +해고' : ''}</b>`);
  }
  if (st.lifeInterest) settleBits.push(`대출이자 <b class="down">-${won(st.lifeInterest)}</b>`);
  const info = dateInfo(day);
  const nextInfo = dateInfo(day + 1);

  host.style.display = 'block';
  host.innerHTML =
    `<div class="window close-window">
       <div class="title-bar close-bar">
         <div class="title-bar-text">🔔 ${info.label} 마감 리포트</div>
         <div class="title-bar-controls"><button aria-label="Close" id="close-report-x"></button></div>
       </div>
       <div class="window-body">
         <div class="close-summary">
           <div class="cash-big">💰 보유 현금 <strong>${won(S.capital)}원</strong></div>
           <div>당월 투자손익 <strong class="${investPL >= 0 ? 'up' : 'down'}">${investPL >= 0 ? '+' : ''}${won(investPL)}원</strong></div>
           <div>마감 순자산 <strong>${won(nwNow)}원</strong></div>
           <div>총 재산 <strong>${won(totalWealth())}원</strong></div>
           ${S.life && S.life.loan > 0 ? `<div>개인 대출 <strong class="down">${won(S.life.loan)}원</strong></div>` : ''}
           ${settleBits.length ? `<div class="settle-line">월말 정산 · ${settleBits.join(' · ')}</div>` : ''}
         </div>
         <div class="close-news-title">📰 이번 달 주요 뉴스 — 골라서 읽어보세요${totalCnt > news.length ? ` <span class="muted" style="color:#ccd">(주요 ${news.length}건 / 총 ${totalCnt}건)</span>` : ''}</div>
         <ul class="clean-list close-news">${items}</ul>
         ${lifeHubHTML()}
         <div class="close-actions">
           <button id="next-day-btn" class="session-btn opening">▶ 다음 달 개장 (${nextInfo.label})</button>
           <button id="close-report-btn">리포트 닫기</button>
         </div>
       </div>
     </div>`;
  wireLifeHub(host);

  // 뉴스 클릭 → 전문가 진단 토글
  host.querySelectorAll('.report-news').forEach(li => {
    li.addEventListener('click', () => {
      const i = +li.dataset.i;
      const detail = $(`rn-detail-${i}`);
      if (!detail) return;
      if (detail.innerHTML) { detail.innerHTML = ''; detail.classList.remove('open'); return; }
      const n = news[i];
      if (!n.experts) n.experts = pickExperts(n);
      detail.innerHTML =
        `<div class="experts-title">🎙️ 전문가 긴급 진단 (제각각입니다, 참고만!)</div>
         <ul class="clean-list experts">` +
        n.experts.map(e =>
          `<li class="expert">
             <span class="ex-name">${e.icon} ${e.name} <small>${e.firm} · ${e.style}</small></span>
             <span class="ex-view ${e.bull ? 'up' : 'down'}">${e.bull ? '📈 비중확대' : '📉 비중축소'} · 확신 ${e.confidence}% · ${e.horizon}</span>
             <span class="ex-cmt"><b>판단</b> ${e.thesis}<br><b>확인</b> ${e.catalyst}<br><b>위험</b> ${e.risk}</span>
           </li>`).join('') + '</ul>' +
        (isStockName(n.target) ? `<button class="gobuy-btn" data-buy="${n.target}">📈 ${n.target} 구매하러 가기</button>` : '');
      detail.classList.add('open');
      const gb = detail.querySelector('.gobuy-btn');
      if (gb) gb.addEventListener('click', (e) => { e.stopPropagation(); goBuy(gb.dataset.buy); });
    });
  });

  const x = $('close-report-x');
  if (x) x.addEventListener('click', closeReport);
  const closeBtn = $('close-report-btn');
  if (closeBtn) closeBtn.addEventListener('click', closeReport);
  const nextBtn = $('next-day-btn');
  if (nextBtn) nextBtn.addEventListener('click', openMarket);
}

function closeReport() {
  const host = $('market-close');
  if (host) { host.style.display = 'none'; host.innerHTML = ''; }
}

// 리포트를 닫아버려도 마감 중이면 언제든 다시 열 수 있다 (인생 허브가 리포트 안에 있으므로 중요)
function reopenReport() {
  if (S.phase === 'open') { flashToast('장중에는 마감 리포트가 없습니다', 'neutral'); return; }
  renderCloseReport(S.day);
}

/* ------------------------------------------------------------------ 인생(LIFE) 모드 */
// 장 1회 = 1개월. day(개월수)로부터 나이/년/월 계산
function dateInfo(dayNum) {
  const m = Math.max(1, dayNum);
  const yearsPassed = Math.floor((m - 1) / 12);
  const age = LIFE.START_AGE + yearsPassed;
  const month = ((m - 1) % 12) + 1;
  return { age, year: yearsPassed + 1, month, label: `만 ${age}세 · ${month}월` };
}

function jobOf() { return D.JOBS.find(j => j.id === (S.life && S.life.job)) || D.JOBS[0]; }

// 총 재산 = 투자 순자산 + 부동산 시세 − 개인 대출
function totalWealth() {
  const L = S.life;
  if (!L) return netWorthClean();
  LOAN.ensure(L);
  const propVal = L.properties.reduce((s, p) => s + p.value, 0);
  return netWorthClean() + propVal - L.loan;
}

// 축하 연출(canvas-confetti) — 라이브러리 없으면 조용히 무시
function celebrate(opts) {
  if (typeof window.confetti !== 'function') return;
  try { window.confetti(Object.assign({ particleCount: 130, spread: 75, origin: { y: 0.6 } }, opts || {})); } catch (e) {}
}

function jobIncomeLabel(j) {
  if (j.variable) return `월 ${won(j.variable[0])}~${won(j.variable[1])}`;
  return j.salary ? `월 ${won(j.salary)}원` : '월급 0';
}

// 월말 정산: 월급 + 월세 + 부동산 시세상승 − 대출이자 − 직업사고 + 연애상대 효과 − 행복감소
function settleMonth() {
  const L = S.life;
  S.economy = ECONOMY.ensure(S.economy);
  LOAN.ensure(L);
  const info = dateInfo(S.day);
  const b = { salary: 0, rent: 0, lifeInterest: 0, partner: 0, incident: null, breakup: false };
  const job = jobOf();

  // 1) 월급 (사업가/유튜버는 변동 · 적자 가능)
  const wasJailed = L.jailMonths > 0;
  b.salary = wasJailed ? 0 : Math.round(CAREER.salary(job, L) * ECONOMY.salaryMultiplier(S.economy));
  S.capital += b.salary;
  if (wasJailed) {
    L.jailMonths--;
    L.happy = clamp(L.happy - 12, 0, 100);
    addNews(`🔒 수감 생활로 이번 달 월급을 받지 못했습니다 · 남은 형기 ${L.jailMonths}개월`, 'bad');
  }

  // 2) 부동산 월세 + 시세 상승
  L.properties.forEach(p => {
    b.rent += p.rent;
    p.value = Math.round(p.value * (1 + ECONOMY.propertyReturn(S.economy)));
  });
  if (b.rent > 0) S.capital += b.rent;

  // 3) 금융사별 이자·신용등급·추심 단계 갱신
  const assetValue = L.properties.reduce((sum, p) => sum + p.value, 0) + Math.max(0, netWorthClean());
  const debtResult = LOAN.settleMonth(L, Math.max(0, b.salary + b.rent), assetValue, ECONOMY.loanMultiplier(S.economy));
  b.lifeInterest = debtResult.interest;
  b.debtResult = debtResult;

  // 4) 직업 리스크 사고 → 빚 발생 (고소득일수록 위험이 큼)
  if (job.risk && job.incidents && job.incidents.length && Math.random() < job.risk) {
    const inc = pick(job.incidents);
    const cost = Math.round(rand(inc.cost[0], inc.cost[1]));
    LOAN.addDebt(L, cost, `${job.name} 사고채무`);
    b.incident = { text: inc.text, cost };
  }

  // 5) 연애/결혼 상대의 월간 경제·행복 효과 (직업·성격에 따라 돈을 받거나 잃음)
  if (L.relationship !== 'single' && L.partner) {
    const nm = L.partner.name;
    const per = D.PERSONALITIES[L.partner.personality] || {};
    const married = L.relationship === 'married';
    const share = Math.round((L.partner.income || 0) * (married ? 0.5 : 0.08));   // 소득 분담(맞벌이/데이트)
    const base = L.partner.income || 1500000;
    const persoMoney = Math.round(base * (per.money || 0) * (married ? 1 : 0.4));  // 성격에 따른 가감
    b.partner = share + persoMoney;
    L.partner.mood = b.partner < 0 || (per.happy||0) < 0 ? 'sad' : (L.affection||0) >= 60 ? 'happy' : 'neutral';
    S.capital += b.partner;
    L.happy = clamp(L.happy + (per.happy || 0), 0, 100);
    if (b.partner) addNews(`💑 ${nm}(${per.name}) 가계 ${b.partner >= 0 ? '기여 +' : ''}${won(b.partner)}원`, b.partner >= 0 ? 'good' : 'bad');
    // 자유로운(바람둥이) 성격은 연애 중 이별 위험
    if (!married && per.breakup && Math.random() < per.breakup) {
      breakUp(0.5, 15);
      addNews(`💔 ${nm}님과 이별했습니다... (아는 사람으로 남아 다시 만날 수 있어요)`, 'bad');
      flashToast(`💔 ${nm}님과 이별...`, 'bad');
      b.breakup = true;
    }
  }

  // 5-1) 양다리·불륜 발각
  //   결혼 전이면 법적으로 남남이다 — 위자료도 해고도 없고, 관계와 평판만 무너진다.
  //   결혼했을 때만 위자료·해고 위험이 붙는다. 상대 성격에 따라 용서받고 이어갈 수도 있다.
  if (L.relationship !== 'single' && L.lovers && L.lovers.length && !b.breakup) {
    const catchChance = Math.min(0.55, 0.15 * L.lovers.length);
    if (Math.random() < catchChance) {
      const wasMarried = L.relationship === 'married';
      const per2 = D.PERSONALITIES[(L.partner || {}).personality] || {};
      // 친밀도가 높을수록 조금 더 용서받는다. 불륜(기혼)은 용서 확률이 절반.
      const forgiveChance = Math.min(0.8, (per2.forgive || 0) + Math.max(0, (L.affection || 0) - 40) / 400) * (wasMarried ? 0.5 : 1);
      const forgiven = Math.random() < forgiveChance;
      const partnerName = L.partner ? L.partner.name : '연인';
      const kind = wasMarried ? '불륜' : '양다리';
      const loverNames = L.lovers.map(x => x.name).join(', ');
      L.lovers.forEach(x => { const r = metRecord(L, x.name); if (r) r.status = 'ex'; });
      L.lovers = [];

      if (forgiven) {
        // 관계는 유지되지만 친밀도·행복·매력에 큰 타격
        L.affection = Math.max(0, Math.round((L.affection || 0) * 0.3));
        L.charm = Math.floor(L.charm * 0.75);
        L.happy = clamp(L.happy - 18, 0, 100);
        SOCIAL.ensure(L).reputation -= 5;
        b.scandal = { fired: false, settle: 0, wasMarried, forgiven: true, partnerName };
        addNews(`😰 ${kind} 발각! 하지만 ${partnerName}님(${per2.name})은 이번 한 번만 넘어가 주었습니다 (${loverNames}와는 정리)`, 'bad');
        flashToast(`😰 ${kind} 발각… ${partnerName}님이 겨우 참아줬다`, 'bad');
      } else if (wasMarried) {
        // 결혼 상태에서의 불륜 — 이혼·위자료, 직장에도 소문이 난다
        const fired = (L.job && L.job !== 'none') && Math.random() < 0.4;
        const settle = Math.round(rand(2000000, 12000000));
        LOAN.addDebt(L, settle, '이혼 위자료·합의금');
        if (fired) L.job = 'none';
        SOCIAL.ensure(L).reputation -= 15;
        breakUp(0.4, 30);
        b.scandal = { fired, settle, wasMarried, forgiven: false, partnerName };
        addNews(`😱 불륜 발각! 이혼 + ${fired ? '회사에서 해고 + ' : ''}위자료 ${won(settle)}원`, 'bad');
        flashToast(`😱 불륜 발각!${fired ? ' 해고까지...' : ''}`, 'bad');
      } else {
        // 결혼 전 양다리 — 돈이 오갈 일은 없다. 이별 + 소문(평판·매력) 타격
        SOCIAL.ensure(L).reputation -= 8;
        breakUp(0.4, 25);
        b.scandal = { fired: false, settle: 0, wasMarried, forgiven: false, partnerName };
        addNews(`😱 양다리 발각! ${partnerName}님과 이별하고 ${loverNames}와의 관계도 끝났습니다 (소문이 돌아 평판 하락)`, 'bad');
        flashToast(`😱 양다리 발각! 모두와 이별...`, 'bad');
      }
      playSound('crash');
    }
  }

  // 5-2) 인간관계 유지 — 오래 안 만나면 사이가 식고, 가끔 근황이 들려온다
  updateRelationships(L);

  // 6) 행복 자연 감소
  L.happy = clamp(L.happy - LIFE.HAPPY_DECAY, 0, 100);

  if (info.month === 1 && S.day > 1) addNews(`🎂 생일! 만 ${info.age}세가 되었습니다`, 'good');
  if (b.salary > 0) addNews(`💼 월급 ${won(b.salary)}원 입금 (${job.name})`, 'good');
  else if (b.salary < 0) addNews(`📉 ${job.name} 적자 ${won(b.salary)}원`, 'bad');
  if (b.rent > 0) addNews(`🏠 월세 수입 ${won(b.rent)}원`, 'good');
  if (b.lifeInterest > 0) addNews(`💳 개인 대출이자 ${won(b.lifeInterest)}원 (빚 ${won(L.loan)})`, 'bad');
  if (b.debtResult && b.debtResult.message) addNews(b.debtResult.message, b.debtResult.collectionLevel >= 2 ? 'bad' : 'neutral');
  if (b.incident) { addNews(`🚑 [${job.name}] ${b.incident.text} — 빚 ${won(b.incident.cost)}원 발생`, 'bad'); flashToast(`🚑 사고! ${b.incident.text}`, 'bad'); playSound('crash'); }
  S._settle = b;
  RIVALS.settleBots(S.bots).forEach(text => addNews(text, text.includes('+') ? 'good' : 'bad'));
  const attack = RIVALS.attackPlayer(S.bots, Math.max(0, totalWealth()));
  if (attack) {
    if (!attack.caught && attack.loss > 0) {
      const cashLoss = Math.min(Math.max(0, S.capital), attack.loss);
      S.capital -= cashLoss;
      if (attack.loss > cashLoss) LOAN.addDebt(L, attack.loss - cashLoss, '라이벌 공작 피해채무');
      L.happy = clamp(L.happy - 5, 0, 100);
    }
    addNews(`⚔️ ${attack.message}`, attack.caught ? 'good' : 'bad');
    flashToast(`⚔️ ${attack.message}`, attack.caught ? 'good' : 'bad');
  }
  const housingResult = HOUSING.monthly(L, ECONOMY.livingMultiplier(S.economy));
  if (housingResult.expense > 0) {
    const paid=Math.min(Math.max(0,S.capital),housingResult.expense);S.capital-=paid;
    if(housingResult.expense>paid)LOAN.addDebt(L,housingResult.expense-paid,'주거비 연체');
    addNews(`${housingResult.home.icon} ${housingResult.home.name} 주거비 ${won(housingResult.expense)}원`,'neutral');
  }
  L.health=clamp(L.health+housingResult.health,0,100);L.stress=clamp(L.stress+housingResult.stress+housingResult.commute*.25,0,100);L.charm=Math.max(0,L.charm+housingResult.charm*.08);
  const healthResult = HEALTH.monthly(L, {
    age: info.age, jobRisk: job.risk || 0,
    debtRatio: L.loan / Math.max(1, Math.max(0, b.salary + b.rent) * 12),
    jailed: wasJailed, happy: L.happy,
  });
  healthResult.news.forEach(text => addNews(text, 'bad'));
  const careerResult = CAREER.monthly(L, job, { health:L.health, stress:L.stress });
  if (careerResult.promotion) {
    S.capital += careerResult.bonus;
    addNews(`🎉 ${job.name} ${careerResult.promotion} 승진 · 축하금 ${won(careerResult.bonus)}원`, 'good');
    flashToast(`🎉 ${careerResult.promotion} 승진!`, 'good'); celebrate();
  }
  const familyResult = FAMILY.monthly(L);
  familyResult.cost = Math.round(familyResult.cost * ECONOMY.livingMultiplier(S.economy));
  if (familyResult.cost > 0) {
    const paid = Math.min(Math.max(0, S.capital), familyResult.cost);
    S.capital -= paid;
    if (familyResult.cost > paid) LOAN.addDebt(L, familyResult.cost - paid, '양육·교육비');
    addNews(`👨‍👩‍👧 이번 달 양육·교육비 ${won(familyResult.cost)}원`, 'neutral');
  }
  familyResult.news.forEach(text => addNews(text, text.includes('건강') ? 'bad' : 'good'));
  if (familyResult.birth) { L.happy = clamp(L.happy + 20,0,100); celebrate({particleCount:180}); }
  const financeResult = LIFE_FINANCE.monthly(L, {
    age: info.age,
    income: Math.max(0, b.salary + b.rent),
    propertyValue: L.properties.reduce((sum, p) => sum + p.value, 0),
    unemployed: L.job === 'none',
  });
  const financeIncome = financeResult.pensionPayout + financeResult.incomeBenefit;
  const financeExpense = financeResult.premiums + financeResult.tax + financeResult.propertyTax + financeResult.pensionContribution;
  S.capital += financeIncome;
  const financePaid = Math.min(Math.max(0, S.capital), financeExpense);
  S.capital -= financePaid;
  if (financeExpense > financePaid) LOAN.addDebt(L, financeExpense - financePaid, '보험료·세금·연금 미납');
  if (financeResult.premiums) addNews(`🛡️ 보험료 ${won(financeResult.premiums)}원`, 'neutral');
  if (financeResult.tax + financeResult.propertyTax) addNews(`🧾 소득세·재산세 ${won(financeResult.tax + financeResult.propertyTax)}원`, 'neutral');
  if (financeResult.pensionContribution) addNews(`🏦 연금 적립 ${won(financeResult.pensionContribution)}원`, 'neutral');
  if (financeResult.pensionPayout) addNews(`👴 연금 수령 +${won(financeResult.pensionPayout)}원`, 'good');
  if (financeResult.incomeBenefit) addNews(`🧰 실직 소득보장 +${won(financeResult.incomeBenefit)}원`, 'good');
  b.finance = financeResult;
  const socialResult = SOCIAL.monthly(L);
  socialResult.news.forEach(text=>addNews(text,'good'));
  const justiceResult=JUSTICE.monthly(L,SOCIAL.legalShield(L)+(L.legalShield||0)*.03);
  justiceResult.news.forEach(text=>addNews(text,text.includes('무죄')||text.includes('불기소')?'good':'bad'));
  if(justiceResult.verdict&&justiceResult.verdict.fine){const paid=Math.min(Math.max(0,S.capital),justiceResult.verdict.fine);S.capital-=paid;if(justiceResult.verdict.fine>paid)LOAN.addDebt(L,justiceResult.verdict.fine-paid,'형사 벌금 미납');}
  const layoffExempt = ['none','civil','teacher','doctor','nurse','lawyer','accountant','ceo','youtuber'];
  if (!layoffExempt.includes(job.id) && Math.random() < ECONOMY.layoffRisk(S.economy, job.risk)) {
    L.job = 'none'; CAREER.switchJob(L, 'none'); L.happy = clamp(L.happy-14,0,100);
    addNews(`📦 ${ECONOMY.phase(S.economy).name} 여파로 ${job.name}에서 해고됐습니다`, 'bad');
    flashToast('📦 경기 악화로 해고됐습니다', 'bad');
  }
  const economyResult = ECONOMY.monthly(S.economy);
  if (economyResult.changed) {
    addNews(`${economyResult.changed.to.icon} 경제 국면 전환: ${economyResult.changed.from.name} → ${economyResult.changed.to.name}`, economyResult.changed.to.market>=0?'good':'bad');
    flashToast(`${economyResult.changed.to.icon} ${economyResult.changed.to.name} 진입`, economyResult.changed.to.market>=0?'good':'bad');
  }
  LEGACY.monthly(L,{age:info.age,month:info.month,job:L.job,jobName:jobOf().name,children:L.children.length,record:L.criminalRecord||0,wealth:totalWealth(),relationship:L.relationship});
  if (healthResult.died) setTimeout(() => showDeathScreen(info.age), 700);
  if (b.debtResult && b.debtResult.gameOver) setTimeout(showDebtGameOver, 500);
}

/* ---- 직업 선택 / 이직 모달 ---- */
// 이직 합격 확률(%) — 목표 난이도 vs 현재 경력
function jobHireChance(target) {
  const cur = jobOf();
  return Math.round(clamp(85 - (target.difficulty || 0) + (cur.difficulty || 0) * 0.4, 5, 95));
}

function showJobModal(isChange) {
  const host = $('life-modal'); if (!host) return;
  const rows = D.JOBS.map(j => {
    const extra = isChange
      ? (j.id === S.life.job ? '<span class="risk-tag">현재 직업</span>' : `<span class="risk-tag">합격 ${jobHireChance(j)}%</span>`)
      : `<span class="risk-tag">${jobRiskTier(j).icon}${jobRiskTier(j).label}</span>`;
    return `<li class="job-row" data-id="${j.id}">
       <span class="job-emoji">${j.emoji}</span>
       <span class="job-main"><strong>${j.name}</strong> ${extra}<br><span class="muted">${j.desc}</span></span>
       <span class="job-sal">${jobIncomeLabel(j)}</span>
     </li>`;
  }).join('');
  host.style.display = 'block';
  host.innerHTML =
    `<div class="window life-window">
       <div class="title-bar life-bar"><div class="title-bar-text">${isChange ? '💼 이직 도전' : '🎬 인생 시작 — 직업을 선택하세요'}</div>
         ${isChange ? '<div class="title-bar-controls"><button aria-label="Close" id="job-x"></button></div>' : ''}</div>
       <div class="window-body">
         <p class="life-intro">${isChange ? '지원할 직업을 고르면 <b>합격 확률</b>로 성패가 갈립니다. 고소득일수록 합격이 어려워요.' : '만 25세, 시드 100만원으로 인생 시작! 직업을 골라 매달 월급을 받으세요.'}</p>
         <ul class="clean-list job-list">${rows}</ul>
       </div>
     </div>`;
  host.querySelectorAll('.job-row').forEach(li => li.addEventListener('click', () => isChange ? attemptJobChange(li.dataset.id) : chooseJob(li.dataset.id)));
  const x = $('job-x'); if (x) x.addEventListener('click', closeLifeModal);
}

// 이직 시도 — 합격 확률로 성공/실패
function attemptJobChange(id) {
  const target = D.JOBS.find(j => j.id === id); if (!target) return;
  if (id === S.life.job) { flashToast('이미 그 직업이에요', 'neutral'); return; }
  const chance = jobHireChance(target);
  closeLifeModal();
  if (Math.random() * 100 < chance) {
    S.life.job = id;
    CAREER.switchJob(S.life, id);
    addNews(`✅ ${target.name} 이직 성공! (합격 확률 ${chance}%)`, 'good');
    flashToast(`✅ ${target.name} 합격!`, 'good'); celebrate(); playSound('buy');
  } else {
    S.life.happy = clamp(S.life.happy - 4, 0, 100);
    addNews(`❌ ${target.name} 이직 실패 — 서류 탈락 (합격 확률 ${chance}%)`, 'bad');
    flashToast(`❌ ${target.name} 탈락...`, 'bad'); playSound('error');
  }
  checkAchievements(); renderMarketPhase(); renderAll(); autoSave();
  if (S.phase === 'closed' && $('market-close') && $('market-close').style.display === 'block') renderCloseReport(S.day);
}
function closeLifeModal() { const h = $('life-modal'); if (h) { h.style.display = 'none'; h.innerHTML = ''; } }

function showDebtGameOver() {
  if (S.timer) { clearInterval(S.timer); S.timer = null; }
  S.phase = 'closed'; S.paused = true;
  const host = $('life-modal'); if (!host) return;
  host.style.display = 'flex';
  host.innerHTML = `<div class="window event-window">
    <div class="title-bar"><div class="title-bar-text">🦈 장태식이 찾아왔다 · 사채의 끝</div></div>
    <div class="window-body">
      <div class="date-profile"><img class="char-portrait" src="${characterPortrait(D.SPECIAL_CHARACTERS.taesik,'angry')}" alt="장태식"><div class="dp-info"><strong>장태식</strong> · 사채 추심 책임자<br><span class="muted">“돈이 없으면 인생을 담보로 갚아. 선택해.”</span></div></div>
      <div class="event-title">감당할 수 없는 불법 사채</div>
      <div class="event-desc">석 달 넘게 불어난 사채와 추심을 버티지 못했습니다.<br>최종 채무: <strong class="down">${won(S.life.loan)}원</strong></div>
      <p class="hint">여기서 끝낼 수도 있고, 더 위험한 돈과 전과를 안고 ‘막장 인생’으로 계속할 수도 있습니다.</p>
      <button id="debt-makjang" class="hot">🔥 장태식의 제안 수락 · 막장 인생 시작</button>
      <button id="debt-restart">☠️ 포기하고 새 인생 시작</button>
    </div></div>`;
  const makjang=$('debt-makjang');if(makjang)makjang.addEventListener('click',startMakjangLife);
  const restart = $('debt-restart');
  if (restart) restart.addEventListener('click', () => { localStorage.removeItem(LS_KEY); location.reload(); });
  autoSave(); playSound('crash');
}

function startMakjangLife(){
  const L=S.life;LOAN.ensure(L);L.makjang=true;L.job='none';CAREER.switchJob(L,'none');L.creditScore=80;L.criminalRecord=(L.criminalRecord||0)+1;L.sharkMonths=0;L.collectionLevel=3;L.happy=12;L.health=Math.min(L.health,55);L.stress=95;
  L.loans=[{id:'taesik-'+Date.now(),providerId:'shark',name:'장태식의 목숨값',tier:'불법 사채',balance:150000000,monthlyRate:.10,illegal:true}];LOAN.sync(L);S.capital=30000000;S.phase='closed';S.paused=false;
  LEGACY.push(L,dateInfo(S.day).age,'🔥','장태식의 제안을 받아 막장 인생을 시작했다','justice');closeLifeModal();addNews('🔥 막장 인생 루트 시작 · 현금 3천만원, 사채 1억5천만원, 전과 1범','bad');flashToast('🔥 막장 인생이 시작됐습니다','bad');renderAll();renderMarketPhase();autoSave();
}

function showTutorial(){
  const host=$('life-modal');if(!host)return;const n=D.SPECIAL_CHARACTERS.narae;host.style.display='flex';host.innerHTML=`<div class="window event-window legacy-window"><div class="title-bar"><div class="title-bar-text">🧭 나래의 QuickTrade 입문 안내</div></div><div class="window-body"><div class="date-profile"><img class="char-portrait" src="${characterPortrait(n,'happy')}" alt="나래"><div class="dp-info"><strong>나래</strong> · 투자교육 매니저<br><span class="muted">“처음이면 핵심만 짚어드릴게요. 모르는 건 천천히 익혀도 괜찮아요.”</span></div></div><div class="legacy-ledger"><div>🔔 <strong>장 열림 한 번이 한 달</strong>입니다. 장중에 매매하고 마감 뒤 인생 행동을 합니다.</div><div>📈 월급만 믿으면 라이벌을 이기기 어렵습니다. 투자·경력·인맥을 함께 키우세요.</div><div>💳 대출은 신용등급별로 조건이 다르고 사채는 월 10% 복리와 추심 위험이 있습니다.</div><div>⚖️ 불법 공작은 수사와 재판으로 이어집니다. 돈이 많아도 감옥에 갈 수 있습니다.</div><div>💾 모든 선택은 자동 저장되며 죽은 뒤 자녀에게 세대 계승이 가능합니다.</div></div><button id="tutorial-start" class="session-btn opening">💼 설명 고마워 · 직업 선택</button></div></div>`;
  $('tutorial-start').addEventListener('click',()=>{S.life.tutorialSeen=true;showJobModal(false);autoSave();});
}

function showDeathScreen(age) {
  if (S.timer) { clearInterval(S.timer); S.timer = null; }
  S.phase = 'closed'; S.paused = true;
  const lifeBenefit = LIFE_FINANCE.deathBenefit(S.life);
  const legacy = HEALTH.inheritance(totalWealth() + lifeBenefit);
  S._legacy = legacy;
  const heir = FAMILY.bestHeir(S.life);
  S._heir = heir;
  const ending = LEGACY.ending(S.life,{wealth:legacy.gross,trades:S.trades,realized:S.realizedPnL});
  LEGACY.push(S.life,age,ending.icon,`${ending.name} 엔딩을 맞았다`,'ending');
  const lifeHistory=LEGACY.ensure(S.life).timeline.slice().sort((a,b)=>a.age-b.age);
  const host = $('life-modal'); if (!host) return;
  host.style.display = 'flex';
  host.innerHTML = `<div class="window event-window legacy-window">
    <div class="title-bar"><div class="title-bar-text">🌅 한 인생의 끝 · ${S.life.generation}대</div></div>
    <div class="window-body">
      <div class="event-title">향년 ${age}세</div>
      <div class="event-desc"><strong>${ending.icon} ${ending.name}</strong><br>${ending.desc}</div>
      <p>직업 <b>${jobOf().name}</b> · 거래 ${S.trades}회 · 전과 ${S.life.criminalRecord||0}회</p>
      <div class="legacy-ledger">
        <div>최종 재산 <strong>${won(legacy.gross)}원</strong></div>
        ${lifeBenefit ? `<div>생명보험금 <strong class="up">+${won(lifeBenefit)}원</strong></div>` : ''}
        <div>상속 정산 <strong class="down">-${won(legacy.tax)}원 (${Math.round(legacy.rate*100)}%)</strong></div>
        <div>다음 세대 시드 <strong class="up">${won(legacy.net)}원</strong></div>
      </div>
      <p>후계자: <strong>${heir ? `${FAMILY.traitOf(heir).icon} ${heir.name} · ${FAMILY.traitOf(heir).name}` : '먼 친척에게 계승'}</strong></p>
      <details open><summary>📜 인생 연대기 · ${lifeHistory.length}개 기록</summary><div class="legacy-ledger">${lifeHistory.map(e=>`<div><span>${e.icon} ${e.age}세</span> <strong>${e.text}</strong></div>`).join('')}</div></details>
      ${LEGACY.ensure(S.life).dynasty.length?`<details><summary>🌳 가문 기록 · 이전 ${LEGACY.ensure(S.life).dynasty.length}세대</summary><div class="legacy-ledger">${LEGACY.ensure(S.life).dynasty.map(x=>`<div>${x.icon} ${x.generation}대 ${x.name} · ${x.ending} · ${won(x.wealth)}원</div>`).join('')}</div></details>`:''}
      <p class="hint">주식·부동산·채무를 정리한 뒤 다음 세대가 순자산을 상속합니다. 업적과 라이벌 역사는 유지됩니다.</p>
      <button id="next-generation">🌳 ${heir ? heir.name+'로 ' : ''}${S.life.generation+1}대 이어하기</button>
    </div></div>`;
  $('next-generation').addEventListener('click', startNextGeneration);
  autoSave(); playSound('sell');
}

function startNextGeneration() {
  const nextGeneration = (S.life.generation || 1) + 1;
  const inherited = (S._legacy || HEALTH.inheritance(totalWealth())).net;
  S.capital = inherited; S.owned = {}; S.loan = 0; S.day = 1; S.tick = 0;
  S.realizedPnL = 0; S.netWorthHist = [inherited]; S.maxNetWorth = inherited;
  const previousLife=S.life;
  const previousEnding=(LEGACY.ENDINGS.find(e=>e.id===LEGACY.ensure(previousLife).ending)||LEGACY.ENDINGS[LEGACY.ENDINGS.length-1]);
  const dynasty=LEGACY.archive(previousLife,{generation:previousLife.generation,name:previousLife.playerName,ending:previousEnding.name,icon:previousEnding.icon,wealth:(S._legacy||{}).gross||totalWealth()});
  S.life = newLife(); S.life.generation = nextGeneration;LEGACY.ensure(S.life).dynasty=dynasty;
  if (S._heir) {
    const trait = FAMILY.traitOf(S._heir);
    S.life.playerName = S._heir.name;
    S.life.heritage = { trait: trait.id, talent: S._heir.talent, education: S._heir.education, bond: S._heir.bond };
    S.life.charm += Math.min(15, Math.floor(S._heir.education / 10));
    S.life.happy = clamp(45 + Math.floor(S._heir.bond / 5), 35, 75);
  }
  HEALTH.ensure(S.life); LOAN.ensure(S.life);
  FAMILY.ensure(S.life);
  closeLifeModal(); renderAll(); renderMarketPhase(); autoSave();
  showJobModal(false);
  flashToast(`🌳 ${nextGeneration}대 시작 · 상속 ${won(inherited)}원`, 'good');
}

/* ---- 선택지 이벤트 (직업/연애/빚/일상) ---- */
const EVENT_CAT = { job: '직업', love: '연애', debt: '빚', life: '일상', family: '자녀·가족' };
function resolveAmt(v) { return Array.isArray(v) ? Math.round(rand(v[0], v[1])) : v; }

function maybeLifeEvent() {
  if (!D.LIFE_EVENTS || Math.random() > LIFE.EVENT_PROB) return;
  const L = S.life;
  if (L.children && L.children.length && Math.random() < .45) {
    const childEvent = CHILD_EVENTS.make(L);
    if (childEvent) { showLifeEvent(childEvent); return; }
  }
  const ctx = { job:L.job,loan:L.loan,rel:L.relationship,happy:L.happy,charm:L.charm,affection:L.affection||0,pers:L.partner&&L.partner.personality };
  const pool = (D.LIFE_EVENTS || []).concat(D.ROMANCE_EVENTS || [], D.CAREER_EVENTS || []).filter(e => !e.cond || e.cond(ctx));
  if (pool.length) showLifeEvent(pick(pool));
}

function showLifeEvent(ev) {
  const host = $('life-event'); if (!host) return;
  const L = S.life;
  S._curEvent = ev;
  // 연애 사건은 '누구와의' 일인지 얼굴과 말투까지 같이 보여준다
  let who = '';
  if (ev.cat === 'love' && L.partner) {
    const per = D.PERSONALITIES[L.partner.personality] || {};
    const prof = ROMANCE.profileOf(L.partner);
    who = `<div class="date-profile">
       <img class="char-thumb" src="${characterPortrait(L.partner)}" alt="${L.partner.name}">
       <div class="dp-info"><strong>${L.partner.name}</strong> · ${L.partner.job} · ${stageBadge(L.affection)}<br>
         <span class="muted">${per.emoji || ''}${per.name || ''}${prof ? ` · 🗣️ ${prof.style}` : ''}</span></div>
     </div>`;
  }
  host.style.display = 'block';
  host.innerHTML =
    `<div class="window event-window">
       <div class="title-bar event-bar"><div class="title-bar-text">❗ 사건 발생 · ${EVENT_CAT[ev.cat] || ''}</div></div>
       <div class="window-body">
         <div class="event-title">${ev.emoji} ${ev.title}</div>
         ${who}
         <div class="event-desc">${ev.desc}</div>
         <div class="event-options">
           ${ev.options.map((o, i) => `<button class="event-opt" data-i="${i}">${o.text}</button>`).join('')}
         </div>
         <div class="event-outcome" id="event-outcome"></div>
       </div>
     </div>`;
  host.querySelectorAll('.event-opt').forEach(b => b.addEventListener('click', () => resolveEvent(+b.dataset.i)));
}

function applyEventEffects(eff) {
  const L = S.life, changes = [];
  if (eff.cash != null) { const v = resolveAmt(eff.cash); S.capital += v; if (v) changes.push(`현금 <b class="${v >= 0 ? 'up' : 'down'}">${v >= 0 ? '+' : ''}${won(v)}</b>`); }
  if (eff.debt != null) {
    const v = resolveAmt(eff.debt);
    if (v >= 0) LOAN.addDebt(L, v, '인생 이벤트 채무'); else LOAN.repay(L, -v);
    if (v) changes.push(`빚 <b class="${v >= 0 ? 'down' : 'up'}">${v >= 0 ? '+' : ''}${won(v)}</b>`);
  }
  if (eff.happy != null) { L.happy = clamp(L.happy + eff.happy, 0, 100); changes.push(`행복 ${eff.happy >= 0 ? '+' : ''}${eff.happy}`); }
  if (eff.charm != null) { L.charm = Math.max(0, L.charm + eff.charm); changes.push(`매력 ${eff.charm >= 0 ? '+' : ''}${eff.charm}`); }
  if (eff.affection != null) { L.affection = Math.max(0, (L.affection || 0) + eff.affection); changes.push(`친밀도 ${eff.affection >= 0 ? '+' : ''}${eff.affection}`); }
  if (eff.endRelationshipChance && L.relationship !== 'single') {
    // 성격이 너그럽거나 친밀도가 높으면 같은 잘못에도 관계가 안 깨질 수 있다
    const per = D.PERSONALITIES[(L.partner || {}).personality] || {};
    const resist = (per.forgive || 0) * 0.6 + Math.max(0, (L.affection || 0) - 40) / 500;
    const chance = Math.max(0, eff.endRelationshipChance * (1 - Math.min(0.85, resist)));
    if (Math.random() < chance) {
      const nm = breakUp(0.5, 10);
      changes.push(`💔 <b class="down">${nm}와 이별</b>`);
    }
  }
  return changes;
}

function resolveEvent(i) {
  const ev = S._curEvent; if (!ev) return;
  const opt = ev.options[i];
  const changes = applyEventEffects(opt.effects || {});
  if (ev.childId && opt.childEffects) {
    if (opt.childEffects.cash != null) changes.push(...applyEventEffects({cash:opt.childEffects.cash}));
    changes.push(...CHILD_EVENTS.apply(S.life, ev.childId, opt.childEffects));
  }
  addNews(`${ev.emoji} ${ev.title} — ${opt.text}`, 'neutral');
  const host = $('life-event');
  const optWrap = host.querySelector('.event-options'); if (optWrap) optWrap.innerHTML = '';
  const out = $('event-outcome');
  out.innerHTML =
    `<div class="oc-text">${opt.outcome}</div>` +
    (changes.length ? `<div class="oc-changes">${changes.join(' · ')}</div>` : '') +
    `<button id="event-confirm" class="session-btn opening">확인</button>`;
  const cf = $('event-confirm'); if (cf) cf.addEventListener('click', closeLifeEvent);
  renderCapital(); renderLifePanel(); checkAchievements(); autoSave();
}

function closeLifeEvent() {
  const host = $('life-event'); if (host) { host.style.display = 'none'; host.innerHTML = ''; }
  S._curEvent = null;
  if (S.phase === 'closed' && $('market-close') && $('market-close').style.display === 'block') renderCloseReport(S.day);
}

function chooseJob(id) {
  const job = D.JOBS.find(j => j.id === id); if (!job) return;
  const first = !S.life.started;
  S.life.job = id;
  CAREER.switchJob(S.life, id);
  S.life.started = true;
  closeLifeModal();
  flashToast(`${job.emoji} 직업: ${job.name}`, 'good');
  addNews(first ? `💼 ${job.name}(으)로 사회생활 시작!` : `💼 ${job.name}(으)로 이직!`, 'neutral');
  if (first) celebrate();
  checkAchievements();
  renderMarketPhase(); renderAll(); autoSave();
  if (S.phase === 'closed' && $('market-close') && $('market-close').style.display === 'block') renderCloseReport(S.day);
}

/* ---- 마감 후 인생 행동 ---- */
function doHobby(id) {
  const h = D.HOBBIES.find(x => x.id === id); if (!h) return;
  if (S.capital < h.cost) { flashToast('💸 현금이 부족합니다', 'bad'); playSound('error'); return; }
  S.capital -= h.cost;
  S.life.happy = clamp(S.life.happy + h.happy, 0, 100);
  S.life.charm += h.charm;
  S.life.hobbiesDone++;
  if (id === 'gym') HEALTH.exercise(S.life);
  else if (id === 'travel' || id === 'game') HEALTH.rest(S.life);
  flashToast(`${h.emoji} ${h.name}! 행복 +${h.happy}${h.charm ? ` 매력 +${h.charm}` : ''}`, 'good');
  checkRelationship(); afterLifeAction();
}

function doHealthCheckup() {
  const cost = 500000;
  if (S.capital < cost) { flashToast('💸 검진 비용 500,000원이 필요합니다', 'bad'); return; }
  S.capital -= cost;
  const found = HEALTH.checkup(S.life);
  flashToast(found.length ? `🏥 검진 결과: ${found.map(x=>x.name).join(', ')}` : '🏥 특별한 이상이 없습니다', found.length ? 'bad' : 'good');
  afterLifeAction();
}

function doTreatment() {
  const offer = HEALTH.treatmentOffer(S.life);
  if (!offer) { flashToast('치료가 필요한 질환이 없습니다', 'neutral'); return; }
  const claim = LIFE_FINANCE.treatmentCost(S.life, offer.cost);
  if (S.capital < claim.pay) { flashToast(`💸 본인부담 치료비 ${won(claim.pay)}원 부족`, 'bad'); return; }
  S.capital -= claim.pay; HEALTH.treat(S.life);
  if (claim.covered) addNews(`🛡️ ${claim.plan.name} 보험금 ${won(claim.covered)}원 지급`, 'good');
  addNews(`🏥 ${offer.name} 치료 완료 · 건강 회복`, 'good');
  flashToast(`🏥 ${offer.name} 치료 완료`, 'good'); afterLifeAction();
}

function doRestMonth() {
  S.capital -= Math.min(Math.max(0,S.capital),300000);
  HEALTH.rest(S.life); flashToast('🛌 충분히 쉬어 스트레스가 줄었습니다', 'good'); afterLifeAction();
}

function doFamilyPlan(method) {
  if (S.life.relationship !== 'married') { flashToast('💍 결혼 후 가족 계획을 세울 수 있습니다', 'neutral'); return; }
  if (!HOUSING.canAddChild(S.life)) { flashToast(`🏠 ${HOUSING.home(S.life).name}에는 가족이 더 살 공간이 없습니다`, 'bad'); return; }
  const preview = method === 'adopt' ? 12000000 : 5000000;
  if (S.capital < preview) { flashToast(`💸 초기 비용 ${won(preview)}원 부족`, 'bad'); return; }
  const result = FAMILY.startPlan(S.life, method);
  if (!result.ok) { flashToast(result.message, 'neutral'); return; }
  S.capital -= result.plan.cost;
  addNews(`👶 ${result.plan.method} 가족 계획 시작 · ${result.plan.months}개월 후`, 'good');
  flashToast(`👶 ${result.plan.method} 계획을 시작했습니다`, 'good'); afterLifeAction();
}

function doChildEducation(id) {
  const cost=1000000;if(S.capital<cost){flashToast('💸 교육비 1,000,000원 부족','bad');return;}
  const child=FAMILY.educate(S.life,id,cost);if(!child)return;S.capital-=cost;
  flashToast(`📚 ${child.name} 교육 투자 · 역량 ${Math.round(child.education)}`,'good');afterLifeAction();
}

function doChildBond(id) {
  const cost=200000;if(S.capital<cost){flashToast('💸 가족 활동비 200,000원 부족','bad');return;}
  const child=FAMILY.bond(S.life,id);if(!child)return;S.capital-=cost;S.life.happy=clamp(S.life.happy+5,0,100);
  flashToast(`🫶 ${child.name}와 시간을 보냈습니다 · 유대 ${Math.round(child.bond)}`,'good');afterLifeAction();
}

function doParentCare() {
  const cost=1500000;if(S.capital<cost){flashToast('💸 부모님 돌봄 비용 1,500,000원 부족','bad');return;}
  S.capital-=cost;FAMILY.careParents(S.life);S.life.happy=clamp(S.life.happy+4,0,100);
  flashToast('👵 부모님 병원과 생활을 챙겼습니다','good');afterLifeAction();
}

function doCareerTraining() {
  const cost=700000;if(S.capital<cost){flashToast('💸 교육비 700,000원 부족','bad');return;}
  S.capital-=cost;const c=CAREER.train(S.life);S.life.happy=clamp(S.life.happy-2,0,100);
  flashToast(`📈 직무교육 완료 · 능력 ${Math.round(c.skill)}`,'good');afterLifeAction();
}

function doCertification(id) {
  const cert=CAREER.CERTS.find(x=>x.id===id);if(!cert)return;
  if(CAREER.ensure(S.life).certifications.includes(id)){flashToast('이미 보유한 자격입니다','neutral');return;}
  if(S.capital<cert.cost){flashToast(`💸 응시·교육비 ${won(cert.cost)}원 부족`,'bad');return;}
  S.capital-=cert.cost;CAREER.certify(S.life,id);addNews(`${cert.icon} ${cert.name} 자격 취득`,'good');
  flashToast(`${cert.icon} ${cert.name} 취득!`,'good');afterLifeAction();
}

function doMoveHousing(id) {
  const target=HOUSING.HOMES.find(h=>h.id===id);if(!target)return;
  const current=HOUSING.ensure(S.life),refund=Math.round((current.depositPaid||0)*.97),needed=Math.max(0,target.deposit-refund);
  if(S.capital<needed){flashToast(`💸 이사에 ${won(needed)}원 필요`,'bad');return;}
  const result=HOUSING.move(S.life,id);S.capital+=result.refund-result.cost;S.life.happy=clamp(S.life.happy+3,0,100);
  addNews(`${target.icon} ${target.name}으로 이사 · 보증금 ${won(target.deposit)}원`,'good');flashToast(`${target.icon} 이사 완료!`,'good');afterLifeAction();
}

function doInsurance(id) {
  const plan = LIFE_FINANCE.subscribe(S.life, id);
  if (!plan) { flashToast('이미 가입했거나 선택할 수 없는 보험입니다', 'neutral'); return; }
  addNews(`${plan.icon} ${plan.name} 가입 · 월 ${won(plan.premium)}원`, 'good');
  flashToast(`${plan.icon} ${plan.name} 가입`, 'good'); afterLifeAction();
}

function cancelInsurance(id) {
  const plan = LIFE_FINANCE.POLICIES.find(p => p.id === id);
  LIFE_FINANCE.cancel(S.life, id);
  flashToast(`${plan ? plan.name : '보험'} 해지`, 'neutral'); afterLifeAction();
}

function setPensionRate(rate) {
  LIFE_FINANCE.setPensionRate(S.life, rate);
  flashToast(`🏦 연금 적립률 ${Math.round(rate * 100)}%로 변경`, 'good'); afterLifeAction();
}

function meetContact() {
  const cost=500000;if(S.capital<cost){flashToast('💸 모임 참가비 500,000원 부족','bad');return;}
  const c=SOCIAL.meet(S.life);if(!c){flashToast('현재 만날 수 있는 주요 인맥을 모두 알게 됐습니다','neutral');return;}
  S.capital-=cost;const r=SOCIAL.role(c);addNews(`${r.icon} ${r.name} ${c.name}과(와) 알게 됐습니다`,'good');flashToast(`${r.icon} 새 인맥: ${c.name}`,'good');afterLifeAction();
}
function nurtureContact(id){const cost=300000;if(S.capital<cost){flashToast('💸 만남 비용 300,000원 부족','bad');return;}const c=SOCIAL.nurture(S.life,id);if(!c)return;S.capital-=cost;flashToast(`🤝 ${c.name} 신뢰 ${c.trust}`,'good');afterLifeAction();}
function askContact(id){const r=SOCIAL.ask(S.life,id);if(!r.ok){flashToast(r.message,'neutral');return;}const e=r.effect;if(e.cash)S.capital+=e.cash;if(e.credit)S.life.creditScore=clamp(S.life.creditScore+e.credit,300,950);if(e.careerSkill)CAREER.ensure(S.life).skill+=e.careerSkill;if(e.reputation)SOCIAL.ensure(S.life).reputation+=e.reputation;if(e.recordShield)S.life.legalShield=(S.life.legalShield||0)+e.recordShield;addNews(`${SOCIAL.role(r.contact).icon} ${r.contact.name}: ${e.text}`,'good');flashToast(e.text,'good');afterLifeAction();}
function hireCourtLawyer(tier){const preview={public:0,standard:5000000,elite:20000000}[tier];if(S.capital<preview){flashToast(`💸 선임비 ${won(preview)}원 부족`,'bad');return;}const r=JUSTICE.hire(S.life,tier);if(!r)return;S.capital-=r.cost;flashToast(`⚖️ ${r.name} 선임`,'good');afterLifeAction();}
function chooseCourtStrategy(strategy){if(!JUSTICE.choose(S.life,strategy)){flashToast('재판 단계에서 선택할 수 있습니다','neutral');return;}flashToast('⚖️ 재판 전략을 제출했습니다','good');afterLifeAction();}

const ROMANCE_META = {
  frugal:{interests:['산책','재테크','집밥'],value:'안정과 신뢰',best:['sincere','plan','listen']},
  ambitious:{interests:['자기계발','전시회','여행'],value:'성장과 성취',best:['plan','direct','sincere']},
  homebody:{interests:['영화','요리','보드게임'],value:'편안한 일상',best:['listen','sincere','vulnerable']},
  caring:{interests:['맛집','봉사','카페'],value:'배려와 대화',best:['listen','vulnerable','sincere']},
  cold:{interests:['독서','미술관','러닝'],value:'독립성과 존중',best:['listen','humor']},
  lavish:{interests:['쇼핑','파인다이닝','공연'],value:'경험과 즐거움',best:['flex','direct','humor']},
  free:{interests:['페스티벌','여행','클럽'],value:'자유와 자극',best:['humor','push','direct']},
};
function characterPortrait(c, mood) {
  const master = c && D.CHARACTERS.find(x => x.name === c.name);
  const special = c && D.SPECIAL_CHARACTERS && Object.values(D.SPECIAL_CHARACTERS).find(x => x.name === c.name || x.id === c.id);
  const file = (c && c.portrait) || (master && master.portrait) || (special && special.portrait);
  const emotion = mood || (c && c.mood) || 'neutral';
  const stem = file && file.replace(/-(neutral|happy|sad|angry)\.webp$/,'').replace(/\.webp$/,'');
  const emotionFile = stem ? `${stem}-${emotion}.webp` : file;
  return emotionFile ? `./assets/characters/${emotionFile}` : '';
}

/* 구버전 세이브 보정 — 초상화 성별을 맞추며 바뀐 이름을 따라가고, 로스터의 성별·초상화를 다시 붙인다 */
function migrateLifePeople(L) {
  const renames = D.CHARACTER_NAME_MIGRATIONS || {};
  const fix = p => {
    if (!p || typeof p !== 'object') return p;
    if (renames[p.name]) { p.name = renames[p.name]; delete p.portrait; }
    const master = D.CHARACTERS.find(x => x.name === p.name);
    if (master) { p.gender = master.gender; p.emoji = master.emoji; p.portrait = master.portrait; }
    return p;
  };
  if (!Array.isArray(L.met)) L.met = [];
  fix(L.partner);
  L.lovers = (L.lovers || []).map(fix).filter(x => !L.partner || x.name !== L.partner.name);
  L.met = L.met.map(fix);
  (L.memories || []).forEach(m => { if (m && renames[m.name]) m.name = renames[m.name]; });
  // 명부가 없던 세이브 — 지금 만나고 있는 사람들부터 채워 넣는다
  const seed = (p, status) => {
    if (!p || L.met.some(m => m.name === p.name)) return;
    L.met.push(Object.assign({ affection: 0, dates: 0, firstDay: S.day, lastDay: S.day }, p, { status }));
  };
  seed(L.partner, 'partner');
  (L.lovers || []).forEach(x => seed(x, 'lover'));
}

/* ---- 만난 사람 기억(인간관계 명부) ----
 * 한 번 만난 사람은 헤어져도 사라지지 않는다. 나이·성격·초상화·호감도를 그대로 들고 있다가
 * 다음 데이트 화면에 '아는 사람'으로 다시 나타난다. */
function ensureMet(L) { if (!Array.isArray(L.met)) L.met = []; return L.met; }
function metRecord(L, name) { return ensureMet(L).find(m => m.name === name); }

function rememberPerson(c, status) {
  const L = S.life, met = ensureMet(L);
  let rec = met.find(m => m.name === c.name);
  if (!rec) {
    rec = { name: c.name, gender: c.gender, emoji: c.emoji, job: c.job, age: c.age,
            income: c.income, personality: c.personality, portrait: c.portrait,
            affection: 0, dates: 0, status: 'acquaintance', firstDay: S.day };
    met.push(rec);
  }
  if (status) rec.status = status;
  rec.lastDay = S.day;
  return rec;
}

/* 호감도 단계 — 사람마다 따로 쌓인다 (어색한 사이 → 알아가는 중 → 썸 → 진지한 사이 → 깊은 사이) */
function affectionStage(v) {
  const stages = D.AFFECTION_STAGES || [];
  let cur = stages[0] || { label: '', emoji: '', desc: '' };
  stages.forEach(s => { if ((v || 0) >= s.min) cur = s; });
  return cur;
}
function stageBadge(v) {
  const s = affectionStage(v);
  return `${s.emoji || ''}${s.label || ''}`;
}

/* 매달 인간관계 갱신 — 연락이 끊기면 사이가 식고, 아는 사람의 근황이 들려온다.
 * 연인·배우자는 따로 관리되므로 여기서는 그 외 사람들만 다룬다. */
function updateRelationships(L) {
  const met = ensureMet(L);
  if (!met.length) return;
  const partnerName = L.partner && L.partner.name;
  const faded = [];
  met.forEach(m => {
    if (m.name === partnerName) { m.idleMonths = 0; return; }
    m.idleMonths = (m.idleMonths || 0) + 1;
    if (m.idleMonths < 2) return;
    // 몰래 만나는 사이는 더 빨리 식는다 (자주 못 보니까)
    const isLover = (L.lovers || []).some(x => x.name === m.name);
    const before = m.affection || 0;
    m.affection = Math.max(0, before - (isLover ? 4 : 2));
    if (affectionStage(m.affection).key !== affectionStage(before).key) faded.push(m.name);
    // 완전히 식은 양다리 상대는 알아서 떠난다
    if (isLover && m.affection <= 0) {
      L.lovers = L.lovers.filter(x => x.name !== m.name);
      m.status = 'ex';
      addNews(`💔 ${m.name}님이 연락을 끊었습니다. "이런 식이면 못 만나겠어."`, 'bad');
    }
  });
  if (faded.length) addNews(`🕸️ 한동안 못 만난 ${faded.join(', ')}님과 사이가 조금 멀어졌습니다`, 'neutral');

  // 아직 연이 남아 있는 사람 중 한 명의 근황 (30% 확률) — 완전히 식은 사이는 소식도 끊긴다
  const reachable = met.filter(m => (m.affection || 0) > 0);
  if (reachable.length && Math.random() < 0.3) {
    const who = pick(reachable);
    const line = ROMANCE.momentLine(who, 'news');
    if (line) addNews(`📮 ${who.name}: ${line}`, 'neutral');
  }
}

// 지금 이 사람과 어떤 사이인가 — 명부 카드에 붙는 배지
function relationTag(L, name) {
  if (L.partner && L.partner.name === name) return L.relationship === 'married' ? '배우자' : '연인';
  if ((L.lovers || []).some(x => x.name === name)) return '몰래 만나는 중';
  const rec = metRecord(L, name);
  return rec && rec.status === 'ex' ? '전 연인' : '아는 사람';
}

// 이미 아는 사람인가 (연인·양다리 상대·명부 등재자)
function isKnownPerson(L, name) {
  return (L.partner && L.partner.name === name) ||
         (L.lovers || []).some(x => x.name === name) ||
         !!metRecord(L, name);
}

// 데이트 상대 프로필 생성 (이름·나이·직업·성격) — 경로(route)에 따라 성향 풀이 다름
// 이미 아는 사람은 새 소개팅 상대로 다시 뽑지 않는다(같은 사람이 초면인 척 등장하던 버그).
function makeCandidate(route, exclude) {
  const L = S.life;
  if (route && route.fixed && D.SPECIAL_CHARACTERS[route.fixed]) {
    const fixed=Object.assign({},D.SPECIAL_CHARACTERS[route.fixed]);
    Object.assign(fixed,ROMANCE_META[fixed.personality]||ROMANCE_META.caring);
    return fixed;
  }
  let pool = D.CHARACTERS;
  if (route && Array.isArray(route.pool) && route.pool.length) {
    const filtered = D.CHARACTERS.filter(c => route.pool.includes(c.personality));
    if (filtered.length) pool = filtered;
  }
  const taken = exclude || [];
  // 아는 사람이 초면인 척 다시 소개되지 않도록, 정말 처음 보는 사람만 뽑는다
  const fresh = pool.filter(c => !isKnownPerson(L, c.name) && !taken.includes(c.name));
  if (!fresh.length) return null;   // 로스터를 다 만났다 — 새로 소개받을 사람 없음
  const c = Object.assign({}, pick(fresh));
  c.age = 23 + Math.floor(Math.random() * 18);   // 만 23~40세
  Object.assign(c, ROMANCE_META[c.personality] || ROMANCE_META.caring);
  if (route && route.office) c.job = '사내 동료';  // 사내연애: 같은 회사 동료
  return c;
}

// 명부에 기록된 사람을 데이트 상대 객체로 되살린다 (나이·직업·초상화 그대로)
function candidateFromRecord(rec) {
  const master = D.CHARACTERS.find(x => x.name === rec.name) || {};
  const c = Object.assign({}, master, rec);
  Object.assign(c, ROMANCE_META[c.personality] || ROMANCE_META.caring);
  return c;
}

// 데이트 성공 점수: 내 매력 + 직업(능력) + 접근방식 + 경로 보정 + 운
function dateScore(approach) {
  const L = S.life, job = jobOf();
  let s = Math.min(L.charm, 120) * 0.5;           // 매력 (최대 60)
  s += job.dateBonus || 0;                        // 직업/능력 (0~25)
  s += approach.mod || 0;                         // 접근 방식 고정 보정
  const meta = ROMANCE_META[(S._dateCandidate || {}).personality] || {};
  s += (meta.best || []).includes(approach.key) ? 14 : -3;
  s += (S._dateRoute && S._dateRoute.scoreMod) || 0;  // 경로 난이도 보정
  s += (S._dateCandidate && S._dateCandidate.romanceDifficulty) || 0;
  // 이미 아는 사람이면 쌓아온 호감도만큼 수월해진다 (최대 +20)
  const rec = S._dateCandidate && metRecord(L, S._dateCandidate.name);
  if (rec) s += Math.min(20, (rec.affection || 0) * 0.15);
  if (approach.flexReward) s += (S.capital >= (approach.cost || 0) + dateBaseCost()) ? approach.flexReward : -15;
  if (approach.variance) s += rand(-approach.variance, approach.variance);
  s += rand(0, 25);                               // 기본 운
  return s;
}

// 이번 데이트의 기본 비용(경로별로 다름, 연인 데이트는 기본값)
function dateBaseCost() { return S._dateRoute ? (S._dateRoute.cost || D.RELATIONSHIP.DATE_COST) : D.RELATIONSHIP.DATE_COST; }

// 데이트 버튼 → 데이트 상대/경로 고르기 (솔로: 소개팅 / 연애·결혼 중: 연인 or 새 사람=양다리)
function doDate() { showRouteModal(); syncBGM(); }

// 사람 카드 한 장 (연인/아는 사람/새 소개팅 상대 공용)
function personCardHTML(c, head, attrs, cls) {
  const per = D.PERSONALITIES[c.personality] || {};
  const g = (D.GENDER_LABEL || {})[c.gender] || '';
  const age = c.age ? ` · 만 ${c.age}세` : '';
  const prof = ROMANCE.profileOf(c);
  return `<button class="route-card ${cls || ''}" ${attrs}>
       <div class="rc-head">${head}</div>
       <div class="rc-person"><img class="char-thumb" src="${characterPortrait(c)}" alt="${c.name}"><span><strong>${c.emoji || ''}${c.name}</strong>${g ? ` · ${g}` : ''}${age} · ${c.job}<br>${per.emoji || ''}${per.name || ''}${prof ? ` <span class="muted">· 🗣️ ${prof.style}</span>` : ''}</span></div>
     </button>`;
}

// 상대 고르기 — 연인 / 이미 아는 사람 / 경로별 새 소개팅 상대
function showRouteModal() {
  const host = $('date-host'); if (!host) return;
  const L = S.life;
  ensureMet(L);
  const inRel = L.relationship !== 'single' && L.partner;
  const routes = D.DATE_ROUTES.filter(r => !r.needsJob || (L.job && L.job !== 'none'));
  // 같은 화면에 같은 사람이 두 번 뜨지 않도록 경로별로 순차 배정
  // 후보 풀이 좁은 경로부터 배정해야 넓은 경로가 먼저 사람을 채가지 않는다 (표시 순서는 원래대로)
  const taken = [];
  const poolSize = r => Array.isArray(r.pool) && r.pool.length ? r.pool.length : 99;
  const assigned = new Map();
  routes.slice().sort((a, b) => poolSize(a) - poolSize(b)).forEach(r => {
    const cand = makeCandidate(r, taken);
    if (cand) { taken.push(cand.name); assigned.set(r.key, cand); }
  });
  S._dateOffers = routes.filter(r => assigned.has(r.key)).map(r => ({ route: r, cand: assigned.get(r.key) }));

  // 이미 아는 사람들 — 연인은 따로, 양다리 상대·전 연인·그냥 아는 사람은 여기에
  S._dateKnown = L.met.filter(m => !(L.partner && L.partner.name === m.name)).map(candidateFromRecord);

  let cards = '';
  if (inRel) {
    cards += personCardHTML(Object.assign({ age: L.partner.age || 28 }, L.partner),
      `💞 ${L.relationship === 'married' ? '배우자' : '연인'}과 데이트 <span class="muted">비용 ${won(D.RELATIONSHIP.DATE_COST)} · 친밀도 ${Math.max(0, L.affection || 0)}</span>`,
      'data-partner="1"', 'partner-card');
  }
  if (S._dateKnown.length) {
    cards += `<div class="route-sep">📇 아는 사람 다시 만나기 <span class="muted">비용 ${won(D.RELATIONSHIP.DATE_COST)}</span></div>`;
    cards += S._dateKnown.map((c, i) => {
      const tag = relationTag(L, c.name);
      const idle = c.idleMonths >= 3 ? ` · <span class="down">${c.idleMonths}개월째 못 봄</span>` : '';
      return personCardHTML(c, `${tag === '몰래 만나는 중' ? '😈' : tag === '전 연인' ? '💔' : '🙂'} ${tag} · ${stageBadge(c.affection)} <span class="muted">호감도 ${Math.round(c.affection || 0)} · ${c.dates || 0}번 만남${idle}</span>`,
        `data-known="${i}"`, 'known-card');
    }).join('');
  }
  if (S._dateOffers.length) {
    cards += `<div class="route-sep">💘 새로운 사람 만나기</div>`;
    cards += S._dateOffers.map((o, i) =>
      personCardHTML(o.cand, `${o.route.emoji} ${o.route.name} <span class="muted">${o.route.desc} · 비용 ${won(o.route.cost)}</span>`,
        `data-i="${i}"`)).join('');
  } else {
    cards += `<div class="route-sep muted">더 이상 새로 소개받을 사람이 없어요. 아는 사람을 다시 만나보세요.</div>`;
  }
  const title = inRel ? '💘 누구와 만날까?' : '💘 소개팅 — 누구를 만날까?';
  const hint = inRel ? '연인과 데이트하거나 아는 사람·새로운 사람을 몰래 만날 수도 있어요. 양다리는 발각 위험!'
    : '한 번 만난 사람은 계속 기억해요. 경로에 따라 새로 만나는 사람이 달라집니다.';
  host.style.display = 'block';
  host.innerHTML =
    `<div class="window event-window">
       <div class="title-bar event-bar"><div class="title-bar-text">${title}</div>
         <div class="title-bar-controls"><button aria-label="Close" id="route-x"></button></div></div>
       <div class="window-body">
         <img class="dating-banner" src="./assets/dating-lounge.png" alt="레트로 소개팅 라운지">
         <div class="event-desc">${hint}</div>
         <div class="route-list">${cards}</div>
       </div>
     </div>`;
  host.querySelectorAll('.route-card').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.partner) {
      S._dateRoute = null;
      S._dateCandidate = Object.assign({ age: L.partner.age || 28 }, L.partner);
      showDateModal(S._dateCandidate, null);
      return;
    }
    if (b.dataset.known != null) {
      S._dateRoute = null;
      S._dateCandidate = S._dateKnown[+b.dataset.known];
      showDateModal(S._dateCandidate, null);
      return;
    }
    const o = S._dateOffers[+b.dataset.i];
    S._dateCandidate = o.cand; S._dateRoute = o.route;
    showDateModal(o.cand, o.route);
  }));
  const x = $('route-x'); if (x) x.addEventListener('click', closeDateModal);
}

function showDateModal(c, route) {
  const host = $('date-host'); if (!host) return;
  Object.assign(c, ROMANCE_META[c.personality] || ROMANCE_META.caring, c);
  const per = D.PERSONALITIES[c.personality] || {};
  const L = S.life;
  const withPartner = !route && L.partner && L.partner.name === c.name;
  const known = !route && !withPartner;
  const rec = metRecord(L, c.name);
  const prof = ROMANCE.profileOf(c);   // 말투·사연 (인물 전용 목소리가 있을 때만)
  const gLabel = (D.GENDER_LABEL || {})[c.gender] || '';
  // 감당 못 하는 선택지는 비활성화해서 '돈 없어서 아무것도 못 하고 갇히는' 상황을 막는다
  const base = dateBaseCost();
  const opts = D.DATE_APPROACHES.map((a, i) => {
    const total = base + (a.cost || 0);
    const poor = S.capital < total;
    return `<button class="event-opt" data-i="${i}" ${poor ? 'disabled' : ''}>${a.emoji} ${a.label}<span class="opt-sub">${a.desc}${a.cost ? ` · 추가 ${won(a.cost)}원` : ''}${poor ? ` · 💸 현금 ${won(total)}원 필요` : ''}</span></button>`;
  }).join('');
  const broke = S.capital < base;
  host.style.display = 'block';
  host.innerHTML =
    `<div class="window event-window">
       <div class="title-bar event-bar"><div class="title-bar-text">💘 ${withPartner ? (L.relationship === 'married' ? '배우자와 데이트' : '연인과 데이트') : known ? `${relationTag(L, c.name)} 다시 만나기` : (route ? route.emoji + ' ' + route.name : '데이트')}</div>
         <div class="title-bar-controls"><button aria-label="Close" id="date-x"></button></div></div>
       <div class="window-body">
         <img class="dating-banner compact" src="./assets/dating-lounge.png" alt="레트로 데이트 라운지">
         <div class="date-profile">
           <img id="date-portrait" class="char-portrait" src="${characterPortrait(c)}" alt="${c.name}">
           <div class="dp-info"><strong>${c.emoji || ''}${c.name}</strong>${gLabel ? ` · ${gLabel}` : ''} · 만 ${c.age}세<br>
             <span class="muted">${c.job} · ${per.emoji || ''}${per.name || ''}${prof ? ` · 🗣️ ${prof.style}` : ''}</span><br>
             <span class="muted">관심사 ${(c.interests || []).join(' · ')} · 중요 가치 ${c.value || '신뢰'}</span>
             ${prof ? `<br><span class="muted">📖 ${prof.background}</span>` : ''}
             ${rec ? `<br><span class="muted">${stageBadge(rec.affection)} · ${rec.dates || 0}번 만남 · 호감도 ${Math.round(rec.affection || 0)}</span>` : '<br><span class="muted">🫥 오늘 처음 만나는 사람</span>'}</div>
         </div>
         <div class="event-desc">내 매력 <b>${Math.floor(S.life.charm)}</b> · 직업 매력 <b>+${jobOf().dateBonus || 0}</b>${route && route.scoreMod ? ` · 경로 <b>${route.scoreMod > 0 ? '+' : ''}${route.scoreMod}</b>` : ''} · 데이트 비용 <b>${won(dateBaseCost())}</b></div>
         ${broke ? `<div class="event-desc down">💸 현금이 ${won(base)}원 이상 있어야 만날 수 있어요. 창을 닫고 돈을 마련한 뒤 다시 오세요.</div>` : ''}
         <div class="event-options">${opts}</div>
         <div class="close-actions">
           <button id="date-back">↩ 다른 사람 고르기</button>
           <button id="date-cancel">닫기</button>
         </div>
         <div class="event-outcome" id="date-outcome"></div>
       </div>
     </div>`;
  host.querySelectorAll('.event-opt').forEach(b => b.addEventListener('click', () => resolveDate(+b.dataset.i)));
  const back = $('date-back'); if (back) back.addEventListener('click', showRouteModal);
  [$('date-x'), $('date-cancel')].forEach(b => { if (b) b.addEventListener('click', closeDateModal); });
}

function resolveDate(i) {
  const L = S.life, R = D.RELATIONSHIP;
  const c = S._dateCandidate, a = D.DATE_APPROACHES[i];
  if (!c || !a) return;
  const cost = dateBaseCost() + (a.cost || 0);
  if (S.capital < cost) { flashToast('💸 현금이 부족합니다', 'bad'); playSound('error'); return; }
  S.capital -= cost;
  L.dates++;

  const score = dateScore(a);
  let tier, dCharm, dHappy;
  if (score >= 70) { tier = '성공'; dCharm = Math.round(rand(12, 22)); dHappy = 10; }
  else if (score >= 45) { tier = '보통'; dCharm = Math.round(rand(4, 9)); dHappy = 3; }
  else { tier = '실패'; dCharm = -Math.round(rand(3, 8)); dHappy = -5; }
  c.mood = tier === '성공' ? 'happy' : tier === '실패' ? (score < 25 ? 'angry' : 'sad') : 'neutral';
  const datePortrait=$('date-portrait');if(datePortrait)datePortrait.src=characterPortrait(c,c.mood);
  const scene = pick(D.DATE_LINES[tier] || ['...']);
  const prevRec = metRecord(L, c.name);
  const voiceLine = ROMANCE.dateLine(c, tier, a.key, c.name, {
    first: !prevRec,                       // 처음 만나는 사람이면 첫인사부터
    affection: (prevRec && prevRec.affection) || 0,
  });
  const preference = (c.best || []).includes(a.key) ? '선택한 방식이 상대의 연애 성향과 잘 맞았다.' : '상대는 접근 방식보다 진심을 더 지켜보는 눈치다.';
  const msg = `${scene}<br><br><b>${voiceLine}</b><br>${preference}`;
  L.charm = Math.max(0, L.charm + dCharm);
  L.happy = clamp(L.happy + dHappy, 0, 100);
  const withPartner = L.partner && L.partner.name === c.name;
  if (withPartner) L.affection = Math.max(0, (L.affection || 0) + dCharm);
  L.memories = L.memories || [];
  L.memories.unshift({ day: S.day, name: c.name, tier, approach: a.label });
  L.memories = L.memories.slice(0, 5);

  // 만난 사람은 명부에 남는다 — 헤어져도, 실패해도 기억한다
  const rec = rememberPerson(c);
  const beforeAff = rec.affection || 0;
  rec.dates = (rec.dates || 0) + 1;
  rec.affection = Math.max(0, beforeAff + dCharm);
  rec.age = c.age; rec.job = c.job;
  rec.idleMonths = 0;   // 방금 만났으니 소원해짐 카운터 초기화

  // 사이가 한 단계 올라갔으면(또는 내려갔으면) 알려준다
  let stageNote = '';
  const beforeStage = affectionStage(beforeAff), afterStage = affectionStage(rec.affection);
  if (beforeStage.key !== afterStage.key) {
    const up = rec.affection > beforeAff;
    stageNote = `<br>${up ? '📈' : '📉'} <b class="${up ? 'up' : 'down'}">${c.name}님과의 사이: ${beforeStage.emoji}${beforeStage.label} → ${afterStage.emoji}${afterStage.label}</b> <span class="muted">${afterStage.desc}</span>`;
  }

  let extra = stageNote;
  if (L.relationship === 'single') {
    if (tier !== '실패' && L.charm >= R.DATING_AT) {
      const confess = ROMANCE.momentLine(c, 'confess');
      startDating(c);
      extra += `<br>💕 <b class="up">${c.name}님과 연애를 시작했어요!</b>${confess ? `<br>${c.name}: ${confess}` : ''}`;
    }
  } else if (!withPartner && tier === '성공') {
    L.lovers = L.lovers || [];
    if (!L.lovers.some(x => x.name === c.name)) {
      L.lovers.push({ name: c.name, job: c.job, personality: c.personality, age: c.age, emoji: c.emoji, gender: c.gender, portrait: c.portrait });
      rec.status = 'lover';
      extra += `<br>💘 <b class="down">${c.name}님과도 몰래 만나기 시작… 양다리! (발각 주의)</b>`;
    } else {
      extra += `<br>😈 <span class="down">${c.name}님과 몰래 만남을 이어갔다. (${stageBadge(rec.affection)})</span>`;
    }
  }
  addNews(`💘 ${c.name}와의 데이트 — ${tier}`, tier === '실패' ? 'bad' : 'good');
  playSound(tier === '실패' ? 'error' : 'buy');

  const host = $('date-host');
  const ow = host.querySelector('.event-options'); if (ow) ow.innerHTML = '';
  const ca = host.querySelector('.close-actions'); if (ca) ca.remove();   // 결과가 나오면 '다른 사람 고르기'는 감춘다
  const changes = [`매력 ${dCharm >= 0 ? '+' : ''}${dCharm}`, `행복 ${dHappy >= 0 ? '+' : ''}${dHappy}`, `현금 -${won(cost)}`];
  $('date-outcome').innerHTML =
    `<div class="oc-text"><b class="${tier === '실패' ? 'down' : 'up'}">[${tier}]</b> ${msg}${extra}</div>` +
    `<div class="oc-changes">${changes.join(' · ')}</div>` +
    `<button id="date-confirm" class="session-btn opening">확인</button>`;
  const cf = $('date-confirm'); if (cf) cf.addEventListener('click', closeDateModal);
  renderCapital(); renderLifePanel(); checkAchievements(); autoSave();
}

function closeDateModal() {
  const h = $('date-host'); if (h) { h.style.display = 'none'; h.innerHTML = ''; }
  syncBGM();   // 데이트 트랙 → 원래 장면 트랙으로
  S._dateCandidate = null; S._dateRoute = null; S._dateOffers = null;
  if (S.phase === 'closed' && $('market-close') && $('market-close').style.display === 'block') renderCloseReport(S.day);
}

// 연애 시작 (특정 상대 지정) — 데이트 성공/취미 누적 공용
function startDating(partnerObj) {
  const L = S.life;
  L.relationship = 'dating';
  L.partner = Object.assign({}, partnerObj);
  L.partner.mood = 'happy';
  L.lovers = (L.lovers || []).filter(x => x.name !== L.partner.name);   // 애인이 됐으면 양다리 목록에서 뺀다
  const rec = rememberPerson(L.partner, 'partner');
  L.affection = Math.round(rec.affection || 0);   // 그동안 쌓은 호감도를 이어받는다
  L.happy = clamp(L.happy + 15, 0, 100);
  const per = D.PERSONALITIES[L.partner.personality] || {};
  addNews(`💕 ${L.partner.name}(${L.partner.job}·${per.name})님과 연애 시작!`, 'good');
  flashToast(`💕 ${L.partner.name}님과 연애 시작!`, 'good');
  celebrate(); playSound('buy');
}

/* 이별 처리 공용 — 헤어진 상대는 명부에 '전 연인'으로 남아 다시 만날 수 있다.
 * charmPenalty: 매력에 곱할 비율, happyPenalty: 행복 감소치 */
function breakUp(charmPenalty, happyPenalty) {
  const L = S.life;
  const name = L.partner ? L.partner.name : '연인';
  if (L.partner) {
    const rec = rememberPerson(L.partner, 'ex');
    rec.affection = Math.max(0, Math.round((L.affection || 0) * 0.5));   // 미련은 절반쯤 남는다
    const parting = ROMANCE.momentLine(L.partner, 'parting');
    if (parting) addNews(`💔 ${name}: ${parting}`, 'bad');
  }
  L.relationship = 'single';
  L.partner = null;
  L.affection = 0;
  if (charmPenalty != null) L.charm = Math.floor(L.charm * charmPenalty);
  if (happyPenalty) L.happy = clamp(L.happy - happyPenalty, 0, 100);
  return name;
}

// 취미 등으로 매력이 임계치를 넘으면 자동으로 연애 시작(랜덤 상대)
function checkRelationship() {
  const L = S.life, R = D.RELATIONSHIP;
  if (L.relationship !== 'single' || L.charm < R.DATING_AT) return;
  // 아는 사람이 있으면 그중 호감도가 가장 높은 사람과, 없으면 새로 만난 사람과 시작
  const known = ensureMet(L).slice().sort((a, b) => (b.affection || 0) - (a.affection || 0))[0];
  const who = (known && (known.affection || 0) >= 20 ? candidateFromRecord(known) : null)
    || makeCandidate() || (known ? candidateFromRecord(known) : null);
  if (who) startDating(who);
}

function doMarriage() {
  const L = S.life, R = D.RELATIONSHIP;
  if (L.relationship !== 'dating') { flashToast('먼저 연애부터 시작하세요', 'neutral'); return; }
  if (L.charm < R.MARRY_AT) { flashToast(`매력이 더 필요해요 (${Math.floor(L.charm)}/${R.MARRY_AT})`, 'neutral'); return; }
  if (S.capital < R.WEDDING_COST) { flashToast(`💸 결혼식 비용 ${won(R.WEDDING_COST)}원 부족`, 'bad'); playSound('error'); return; }
  S.capital -= R.WEDDING_COST;
  L.relationship = 'married';
  L.happy = clamp(L.happy + 30, 0, 100);
  addNews(`💍 ${L.partner.name}님과 결혼! 축하합니다 🎉`, 'good');
  flashToast(`💍 ${L.partner.name}님과 결혼! 🎉`, 'good');
  celebrate({ particleCount: 220, spread: 110 });
  setTimeout(() => celebrate({ angle: 60, origin: { x: 0 } }), 250);
  setTimeout(() => celebrate({ angle: 120, origin: { x: 1 } }), 400);
  playSound('buy'); afterLifeAction();
}

function buyProperty(id) {
  const p = D.PROPERTIES.find(x => x.id === id); if (!p) return;
  if (S.capital < p.price) { flashToast(`💸 현금 부족 (${won(p.price)}원 필요)`, 'bad'); playSound('error'); return; }
  S.capital -= p.price;
  S.life.properties.push({ id: p.id, name: p.name, emoji: p.emoji, value: p.price, rent: p.rent });
  addNews(`🏠 ${p.name} 매입! 월세 ${won(p.rent)}원 확보`, 'good');
  flashToast(`${p.emoji} ${p.name} 매입 완료!`, 'good');
  celebrate(); afterLifeAction();
}

function takeLoan(providerId, amt) {
  const job = jobOf();
  const monthlyIncome = job.variable ? Math.max(0, (job.variable[0] + job.variable[1]) / 2) : job.salary;
  const result = LOAN.borrow(S.life, providerId, amt, monthlyIncome);
  if (!result.ok) { flashToast(`⛔ ${result.message}`, 'bad'); playSound('error'); return; }
  S.capital += result.amount;
  addNews(`${result.offer.icon} ${result.offer.tier} ${result.offer.name}에서 ${won(result.amount)}원 대출`, result.offer.illegal ? 'bad' : 'neutral');
  flashToast(`${result.offer.icon} ${won(result.amount)}원 대출 실행`, result.offer.illegal ? 'bad' : 'neutral');
  afterLifeAction();
}

function repayLoan() {
  const L = S.life;
  if (L.loan <= 0) { flashToast('갚을 빚이 없습니다', 'neutral'); return; }
  const pay = Math.min(L.loan, S.capital);
  if (pay <= 0) { flashToast('💸 갚을 현금이 없습니다', 'bad'); return; }
  const paid = LOAN.repay(L, pay); S.capital -= paid;
  flashToast(`💳 ${won(paid)}원 상환 (남은 빚 ${won(L.loan)})`, 'good');
  afterLifeAction();
}

function doRivalAction(actionId, targetIndex) {
  const target = S.bots[targetIndex]; if (!target) return;
  const oldJail=S.life.jailMonths||0,oldRecord=S.life.criminalRecord||0;
  const player = { cash: S.capital, jailMonths: S.life.jailMonths || 0, criminalRecord: S.life.criminalRecord || 0 };
  const result = RIVALS.act(player, target, actionId);
  if (!result.ok) { flashToast(`⛔ ${result.message}`, 'bad'); return; }
  S.capital = player.cash;
  S.life.jailMonths = player.jailMonths;
  S.life.criminalRecord = player.criminalRecord;
  if (result.detected) {
    S.life.jailMonths=oldJail;S.life.criminalRecord=oldRecord;
    const action=RIVALS.ACTIONS.find(a=>a.id===actionId);
    JUSTICE.openCase(S.life,actionId==='rig'?'불법 시세조종':'명예훼손·업무방해',actionId==='rig'?.85:.6,result.jail,result.fine);
    S.capital+=result.fine;
    LOAN.ensure(S.life); HEALTH.ensure(S.life); FAMILY.ensure(S.life);
    S.life.creditScore = clamp(S.life.creditScore - 120, 0, 1000);
    addNews(`🚔 수사 개시! 즉시 처벌되지 않고 수사·재판 절차가 시작됩니다.`, 'bad'); playSound('crash');
  } else {
    addNews(`⚔️ ${result.message}`, result.success ? 'good' : 'neutral');
  }
  flashToast(result.detected ? `🚔 ${result.message}` : `⚔️ ${result.message}`, result.detected ? 'bad' : (result.success ? 'good' : 'neutral'));
  afterLifeAction();
}

function afterLifeAction() {
  renderCapital(); renderLifePanel(); checkAchievements(); autoSave();
  if (S.phase === 'closed' && $('market-close') && $('market-close').style.display === 'block') renderCloseReport(S.day);
}

/* ---- 인생 상태 패널(오른쪽 '인생' 탭) ---- */
function renderLifePanel() {
  const el = $('life-panel'); if (!el || !S.life) return;
  const L = S.life, R = D.RELATIONSHIP, info = dateInfo(S.day), job = jobOf();
  S.economy = ECONOMY.ensure(S.economy);
  LOAN.ensure(L);
  HEALTH.ensure(L);
  FAMILY.ensure(L);
  CAREER.ensure(L);
  HOUSING.ensure(L);
  const finance = LIFE_FINANCE.ensure(L);
  const activePolicies = LIFE_FINANCE.active(L);
  const social = SOCIAL.ensure(L);
  const justice = JUSTICE.ensure(L);
  const legacyState = LEGACY.ensure(L);
  const pName = L.partner ? L.partner.name : '';
  const relLabel = L.relationship === 'married' ? `💍 ${pName}님과 결혼`
    : L.relationship === 'dating' ? `💕 ${pName}님과 연애 중` : '🙍 솔로';
  const hearts = '❤️'.repeat(Math.max(0, Math.round(L.happy / 20))) || '🖤';
  const propVal = L.properties.reduce((s, p) => s + p.value, 0);
  const charmHint = L.relationship === 'single' ? `(연애까지 ${R.DATING_AT})`
    : L.relationship === 'dating' ? `(결혼까지 ${R.MARRY_AT})` : '';
  const risk = jobRiskTier(job);
  let partnerRow = '';
  if (L.partner) {
    const per = D.PERSONALITIES[L.partner.personality] || {};
    const g = (D.GENDER_LABEL || {})[L.partner.gender] || '';
    const prof = ROMANCE.profileOf(L.partner);
    partnerRow = `<div class="life-partner"><img class="char-thumb" src="${characterPortrait(L.partner)}" alt="${L.partner.name}"><strong>${L.partner.name}${g ? ` (${g})` : ''} · ${L.partner.job} · ${stageBadge(L.affection)}<br><span class="muted">${per.emoji || ''}${per.name || ''} · 용서 성향 ${Math.round((per.forgive || 0) * 100)}%${prof ? `<br>🗣️ ${prof.style}` : ''}</span></strong></div>`;
  }
  if (L.lovers && L.lovers.length) {
    partnerRow += `<div class="life-stat"><span>양다리 😈</span><strong class="down">${L.lovers.map(x => (x.emoji || '💔') + x.name).join(', ')} <span class="muted">(발각 주의!)</span></strong></div>`;
  }
  const met = ensureMet(L);
  if (met.length) {
    partnerRow += `<div class="life-stat"><span>아는 사람 📇</span><strong>${met.length}명</strong></div>` +
      `<div class="life-props">${met.map(m => `${m.emoji || '🙂'}<b>${m.name}</b> ${relationTag(L, m.name)} · ${stageBadge(m.affection)} ${Math.round(m.affection || 0)}${m.idleMonths >= 3 ? ` <span class="muted">(${m.idleMonths}개월째 연락 없음)</span>` : ''}`).join('<br>')}</div>`;
  }
  el.innerHTML =
    `<div class="life-stat"><span>나이/시점</span><strong>${info.label}</strong></div>
     <div class="life-stat"><span>경제 국면</span><strong>${ECONOMY.phase(S.economy).icon} ${ECONOMY.phase(S.economy).name} · ${S.economy.monthsLeft}개월 예상</strong></div>
     <div class="life-stat"><span>실거주</span><strong>${HOUSING.home(L).icon} ${HOUSING.home(L).name} · 정원 ${HOUSING.home(L).capacity}명</strong></div>
     <div class="life-stat"><span>주거비</span><strong>${won(HOUSING.home(L).rent+HOUSING.home(L).manage)}원/월 · 보증금 ${won(L.housing.depositPaid||0)}</strong></div>
     <div class="life-stat"><span>보험</span><strong>${activePolicies.length ? activePolicies.map(p=>p.icon+p.name).join(' · ') : '미가입'}</strong></div>
     <div class="life-stat"><span>연금</span><strong>${won(finance.pensionBalance)}원 · 소득의 ${Math.round(finance.pensionRate*100)}%</strong></div>
     <div class="life-stat"><span>누적 세금</span><strong>${won(finance.taxesPaid)}원</strong></div>
     <div class="life-stat"><span>인맥</span><strong>${social.contacts.length}명 · 평판 ${Math.round(social.reputation)}</strong></div>
     ${justice.case?`<div class="life-stat"><span>형사사건</span><strong class="down">⚖️ ${justice.case.crime} · ${justice.case.phase}</strong></div>`:''}
     <div class="life-stat"><span>연대기</span><strong>📜 ${legacyState.timeline.length}개 기록 · 가문 ${legacyState.dynasty.length+1}대</strong></div>
     ${finance.claims ? `<div class="life-stat"><span>보험금 수령</span><strong class="up">${won(finance.claims)}원</strong></div>` : ''}
     <div class="life-stat"><span>경기 설명</span><strong class="muted">${ECONOMY.phase(S.economy).desc}</strong></div>
     <div class="life-stat"><span>직업</span><strong>${job.emoji} ${job.name} <span class="risk-tag">${risk.icon}${risk.label}</span></strong></div>
     <div class="life-stat"><span>직급</span><strong>📈 ${CAREER.rank(L)} · 경력 ${CAREER.ensure(L).months}개월</strong></div>
     <div class="life-stat"><span>직무능력</span><strong>${Math.round(CAREER.ensure(L).skill)} · 성과 ${Math.round(CAREER.ensure(L).performance)} · 평판 ${Math.round(CAREER.ensure(L).reputation)}</strong></div>
     ${CAREER.ensure(L).certifications.length?`<div class="life-stat"><span>자격</span><strong>${CAREER.ensure(L).certifications.map(id=>(CAREER.CERTS.find(c=>c.id===id)||{}).icon+(CAREER.CERTS.find(c=>c.id===id)||{}).name).join(' · ')}</strong></div>`:''}
     <div class="life-stat"><span>월 수입</span><strong>${jobIncomeLabel(job)}</strong></div>
     <div class="life-stat"><span>행복도</span><strong>${hearts} ${Math.round(L.happy)}/100</strong></div>
     <div class="life-stat"><span>건강</span><strong class="${L.health < 35 ? 'down' : ''}">❤️ ${Math.round(L.health)}/100</strong></div>
     <div class="life-stat"><span>스트레스</span><strong class="${L.stress > 70 ? 'down' : ''}">🧠 ${Math.round(L.stress)}/100</strong></div>
     <div class="life-stat"><span>체력</span><strong>🏃 ${Math.round(L.fitness)}/100</strong></div>
     <div class="life-stat"><span>세대</span><strong>🌳 ${L.generation}대</strong></div>
     <div class="life-stat"><span>주인공</span><strong>${L.playerName}</strong></div>
     <div class="life-stat"><span>가족 유대</span><strong>🏡 ${Math.round(L.familyBond)}/100</strong></div>
     ${L.generation===1?`<div class="life-stat"><span>부모님</span><strong class="${L.parentHealth<35?'down':''}">만 ${Math.floor(L.parentAge)}세 · 건강 ${Math.round(L.parentHealth)}</strong></div>`:''}
     ${L.familyPlan?`<div class="life-stat"><span>가족 계획</span><strong>👶 ${L.familyPlan.method} · ${L.familyPlan.months}개월 남음</strong></div>`:''}
     <div class="life-stat"><span>자녀</span><strong>${L.children.length}명</strong></div>
     ${L.children.length?`<div class="life-props">${L.children.map(c=>{const t=FAMILY.traitOf(c);return `${t.icon}<b>${c.name}</b> ${FAMILY.childAge(c).label}·${FAMILY.stage(c)}·유대 ${Math.round(c.bond)}`}).join('<br>')}</div>`:''}
     ${L.conditions.length ? `<div class="life-stat"><span>질환</span><strong class="down">${HEALTH.conditionDetails(L).map(c=>c.icon+c.name).join(' · ')}</strong></div>` : ''}
     <div class="life-stat"><span>관계</span><strong>${relLabel}</strong></div>
     ${L.relationship !== 'single' ? `<div class="life-stat"><span>친밀도</span><strong>${Math.max(0,L.affection||0)}</strong></div>` : ''}
     ${partnerRow}
     <div class="life-stat"><span>매력</span><strong>${Math.floor(L.charm)} <span class="muted">${charmHint}</span></strong></div>
     <div class="life-stat"><span>부동산</span><strong>${L.properties.length}채 · ${won(propVal)}원</strong></div>
     <div class="life-stat"><span>개인 대출</span><strong class="${L.loan > 0 ? 'down' : ''}">${won(L.loan)}원</strong></div>
     <div class="life-stat"><span>신용등급</span><strong class="${L.creditScore < 500 ? 'down' : ''}">${LOAN.grade(L.creditScore)} · ${Math.round(L.creditScore)}점</strong></div>
     ${L.jailMonths > 0 ? `<div class="life-stat"><span>신분</span><strong class="down">🔒 수감 중 · ${L.jailMonths}개월 남음</strong></div>` : ''}
     ${L.criminalRecord > 0 ? `<div class="life-stat"><span>전과</span><strong class="down">${L.criminalRecord}범</strong></div>` : ''}
     ${L.collectionLevel ? `<div class="life-stat"><span>추심 상태</span><strong class="down">${['','상환 독촉','방문 추심','위험한 추심'][L.collectionLevel]}</strong></div>` : ''}
     <div class="life-stat total"><span>총 재산</span><strong>${won(totalWealth())}원</strong></div>
     ${L.properties.length ? '<div class="life-props">' + L.properties.map(p => `${p.emoji}${p.name}`).join(' · ') + '</div>' : ''}`;
}

/* ---- 마감 리포트에 들어갈 '이번 달 행동' 허브 ---- */
function lifeHubHTML() {
  const L = S.life, R = D.RELATIONSHIP;
  LOAN.ensure(L);
  HEALTH.ensure(L);
  FAMILY.ensure(L);
  CAREER.ensure(L);
  HOUSING.ensure(L);
  const finance = LIFE_FINANCE.ensure(L);
  const social = SOCIAL.ensure(L);
  const justice = JUSTICE.ensure(L);
  const hobbyBtns = D.HOBBIES.map(h => `<button class="life-btn" data-act="hobby" data-id="${h.id}">${h.emoji} ${h.name} <small>${won(h.cost)}</small></button>`).join('');
  const propBtns = D.PROPERTIES.map(p => `<button class="life-btn" data-act="prop" data-id="${p.id}">${p.emoji} ${p.name} <small>${won(p.price)}</small></button>`).join('');
  const job = jobOf();
  const monthlyIncome = job.variable ? Math.max(0, (job.variable[0] + job.variable[1]) / 2) : job.salary;
  const loanBtns = LOAN.offers(L, monthlyIncome).map(o => {
    const amt = Math.min(o.available, o.illegal ? 30000000 : 10000000);
    const rate = (o.monthlyRate * 100).toFixed(1);
    return `<button class="life-btn ${o.illegal ? 'hot' : ''}" data-act="loan" data-provider="${o.id}" data-amt="${Math.floor(amt)}" ${o.approved ? '' : 'disabled'}>${o.icon} ${o.tier} <small>${o.approved ? `+${won(amt)} · 월 ${rate}%` : `거절 · ${o.minScore}점 필요`}</small></button>`;
  }).join('');
  const canMarry = L.relationship === 'dating' && L.charm >= R.MARRY_AT;
  const perName = L.partner ? (D.PERSONALITIES[L.partner.personality] || {}).name : '';
  const partnerTag = L.partner ? `<span class="muted">${L.partner.emoji || ''}${L.partner.name}·${L.partner.job}·${perName} · </span>` : '';
  const relBtns = L.relationship === 'married'
    ? `<span class="muted">💍 ${L.partner.name}님과 결혼 생활 중</span>`
    : partnerTag + `<button class="life-btn" data-act="date">💘 데이트 <small>${won(R.DATE_COST)}</small></button>` +
      (canMarry ? `<button class="life-btn hot" data-act="marry">💍 결혼하기 <small>${won(R.WEDDING_COST)}</small></button>` : '');
  const rivalSelect = `<select id="rival-target">${S.bots.map((b,i)=>`<option value="${i}">${b.name} · ${won(botNetWorth(b))}</option>`).join('')}</select>`;
  const rivalBtns = RIVALS.ACTIONS.map(a=>`<button class="life-btn ${a.illegal?'hot':''}" data-act="rival" data-rival-action="${a.id}" ${L.jailMonths>0?'disabled':''}>${a.label} <small>${won(a.cost)} · ${a.desc}</small></button>`).join('');
  const planBtns = L.relationship==='married'&&!L.familyPlan ? `<button class="life-btn" data-act="family-plan" data-method="birth">👶 출산 계획 <small>5,000,000</small></button><button class="life-btn" data-act="family-plan" data-method="adopt">🫶 입양 신청 <small>12,000,000</small></button>` : '';
  const childBtns = L.children.map(c=>`<button class="life-btn" data-act="child-bond" data-child="${c.id}">🫶 ${c.name}와 시간 보내기 <small>200,000</small></button><button class="life-btn" data-act="child-edu" data-child="${c.id}">📚 ${c.name} 교육 투자 <small>1,000,000</small></button>`).join('');
  const certBtns = CAREER.CERTS.filter(c=>!CAREER.ensure(L).certifications.includes(c.id)).map(c=>`<button class="life-btn" data-act="cert" data-cert="${c.id}">${c.icon} ${c.name} <small>${won(c.cost)}</small></button>`).join('');
  const housingBtns = HOUSING.HOMES.filter(h=>h.id!==L.housing.id).map(h=>`<button class="life-btn" data-act="move" data-home="${h.id}">${h.icon} ${h.name} <small>보증금 ${won(h.deposit)} · 월 ${won(h.rent+h.manage)}</small></button>`).join('');
  const insuranceBtns = LIFE_FINANCE.POLICIES.map(p => finance.policies.includes(p.id)
    ? `<button class="life-btn hot" data-act="insurance-cancel" data-policy="${p.id}">${p.icon} ${p.name} 해지 <small>월 ${won(p.premium)}</small></button>`
    : `<button class="life-btn" data-act="insurance" data-policy="${p.id}">${p.icon} ${p.name} <small>${p.desc} · 월 ${won(p.premium)}</small></button>`).join('');
  const pensionBtns = [.05,.09,.15].map(rate=>`<button class="life-btn ${Math.abs(finance.pensionRate-rate)<.001?'hot':''}" data-act="pension" data-rate="${rate}">연금 ${Math.round(rate*100)}%</button>`).join('');
  const contactBtns = social.contacts.map(c=>{const r=SOCIAL.role(c);return `<button class="life-btn" data-act="contact-nurture" data-contact="${c.id}">${r.icon} ${c.name} 만나기 <small>신뢰 ${c.trust} · 호의 ${c.favor} · 300,000</small></button><button class="life-btn" data-act="contact-ask" data-contact="${c.id}">🙏 ${c.name}에게 부탁</button>`}).join('');
  const courtBtns=justice.case?`<span class="muted">${justice.case.crime} · ${justice.case.phase}</span><button class="life-btn" data-act="lawyer" data-tier="public">국선변호인</button><button class="life-btn" data-act="lawyer" data-tier="standard">전문 변호사 <small>5,000,000</small></button><button class="life-btn" data-act="lawyer" data-tier="elite">대형 로펌 <small>20,000,000</small></button>${justice.case.phase==='재판'?'<button class="life-btn" data-act="court" data-strategy="plea">혐의 인정·선처</button><button class="life-btn" data-act="court" data-strategy="contest">무죄 다툼</button><button class="life-btn" data-act="court" data-strategy="cooperate">수사 협조</button>':''}`:'<span class="muted">진행 중인 사건 없음</span>';
  const treatment=HEALTH.treatmentOffer(L);
  const quickBtns=`<button class="life-btn" data-act="date">💘 데이트</button><button class="life-btn" data-act="rest">🛌 쉬기 <small>300,000</small></button><button class="life-btn" data-act="career-train">📚 직무교육 <small>700,000</small></button>${treatment?`<button class="life-btn hot" data-act="treat">💊 ${treatment.name} 치료</button>`:''}${L.loan>0?`<button class="life-btn hot" data-act="repay">💳 대출 상환</button>`:''}`;
  return `
    <div class="life-hub">
      <div class="hub-title">🎬 이번 달에 할 일 <span class="muted">필요한 것만 하고 바로 다음 달로 넘어가세요</span></div>
      <div class="hub-quick">${quickBtns}</div>
      <details class="hub-more"><summary>🧰 다른 행동 보기</summary>
        <details class="hub-section"><summary>🎨 취미·건강·연애</summary><div class="hub-btns">${hobbyBtns}<button class="life-btn" data-act="checkup">🏥 건강검진 <small>500,000</small></button><button class="life-btn" data-act="treat">💊 치료${treatment?' · '+treatment.name+' '+won(treatment.cost):''}</button>${relBtns}</div></details>
        <details class="hub-section"><summary>📈 경력·주거</summary><div class="hub-btns"><button class="life-btn" data-act="changejob">💼 이직</button><button class="life-btn" data-act="career-train">📚 직무교육</button>${certBtns}${housingBtns}</div></details>
        <details class="hub-section"><summary>👨‍👩‍👧 가족·인맥</summary><div class="hub-btns">${planBtns}${childBtns}<button class="life-btn" data-act="parent-care">👵 부모님 돌봄 <small>1,500,000</small></button><button class="life-btn" data-act="contact-meet">🍽️ 업계 모임</button>${contactBtns}</div></details>
        <details class="hub-section"><summary>💳 금융·보험·부동산</summary><div class="hub-btns">${loanBtns}<button class="life-btn" data-act="repay">상환${L.loan>0?' '+won(L.loan):''}</button>${insuranceBtns}${pensionBtns}${propBtns}</div></details>
        <details class="hub-section" ${justice.case?'open':''}><summary>⚔️ 라이벌·법정${justice.case?' · 진행 중 사건 있음':''}</summary><div class="hub-btns">${rivalSelect}${rivalBtns}${courtBtns}</div></details>
      </details>
    </div>`;
}

function wireLifeHub(host) {
  host.querySelectorAll('.life-btn').forEach(b => b.addEventListener('click', () => {
    const act = b.dataset.act;
    if (act === 'hobby') doHobby(b.dataset.id);
    else if (act === 'prop') buyProperty(b.dataset.id);
    else if (act === 'loan') takeLoan(b.dataset.provider, +b.dataset.amt);
    else if (act === 'repay') repayLoan();
    else if (act === 'checkup') doHealthCheckup();
    else if (act === 'treat') doTreatment();
    else if (act === 'rest') doRestMonth();
    else if (act === 'family-plan') doFamilyPlan(b.dataset.method);
    else if (act === 'child-bond') doChildBond(b.dataset.child);
    else if (act === 'child-edu') doChildEducation(b.dataset.child);
    else if (act === 'parent-care') doParentCare();
    else if (act === 'career-train') doCareerTraining();
    else if (act === 'cert') doCertification(b.dataset.cert);
    else if (act === 'move') doMoveHousing(b.dataset.home);
    else if (act === 'insurance') doInsurance(b.dataset.policy);
    else if (act === 'insurance-cancel') cancelInsurance(b.dataset.policy);
    else if (act === 'pension') setPensionRate(+b.dataset.rate);
    else if (act === 'contact-meet') meetContact();
    else if (act === 'contact-nurture') nurtureContact(b.dataset.contact);
    else if (act === 'contact-ask') askContact(b.dataset.contact);
    else if (act === 'lawyer') hireCourtLawyer(b.dataset.tier);
    else if (act === 'court') chooseCourtStrategy(b.dataset.strategy);
    else if (act === 'rival') doRivalAction(b.dataset.rivalAction, +($('rival-target') ? $('rival-target').value : 0));
    else if (act === 'date') doDate();
    else if (act === 'marry') doMarriage();
    else if (act === 'changejob') showJobModal(true);
  }));
}

/* ------------------------------------------------------------------ AI 라이벌 */
function runBots() {
  const live = S.stocks.filter(s => s.listed);
  S.bots.forEach(bot => {
    if (bot.jailMonths > 0) return;
    if (Math.random() > 0.6) return; // 매 틱 거래하진 않음
    let target;
    if (bot.style === 'random') target = pick(live);
    else if (bot.style === 'momentum') {
      target = live.reduce((best, s) => trendOf(s) > trendOf(best) ? s : best, live[0]);
    } else { // value: 저가 소형주 선호
      const cheap = live.filter(s => s.cap !== 'large');
      target = cheap.length ? pick(cheap) : pick(live);
    }
    const price = target.history[target.history.length - 1].c;
    const has = bot.owned[target.name];
    // 결정: 오르는 추세면 매수, 아니면 매도
    const bullish = trendOf(target) >= 0;
    if (bullish && bot.capital > price * 10) {
      const qty = Math.max(1, Math.floor((bot.capital * rand(0.1, Math.min(0.45, 0.22 * (bot.skill || 1)))) / price));
      bot.capital -= qty * price;
      bot.owned[target.name] = (has || 0) + qty;
    } else if (has) {
      bot.capital += has * price;
      delete bot.owned[target.name];
    }
  });
}

function trendOf(stock) {
  const h = stock.history;
  if (h.length < 2) return 0;
  return (h[h.length - 1].c - h[h.length - 2].c) / h[h.length - 2].c;
}

function botNetWorth(bot) {
  let v = bot.capital;
  Object.keys(bot.owned).forEach(name => {
    const s = S.stocks.find(x => x.name === name);
    if (s && s.listed) v += bot.owned[name] * s.history[s.history.length - 1].c;
  });
  return v;
}

/* ------------------------------------------------------------------ 순자산 */
function priceOf(name) {
  return PORTFOLIO.currentPrice(S.stocks, name);
}

/* 순자산 = 현금 + 롱 평가액 − 숏 현재 상환가치 − 신용융자(빚)
   공매도 진입 시 받은 매도대금은 이미 현금에 포함되어 있다. */
function netWorthClean() {
  return PORTFOLIO.netWorth(S);
}

// 롱 포지션 총 평가액
function longValue() {
  return PORTFOLIO.positionValues(S).long;
}

// 신용 매수여력 = 현금 × 배율 − 현재 빚
function buyingPower() {
  return PORTFOLIO.longBuyingPower(S, S.leverage);
}

function shortSellingPower() {
  return PORTFOLIO.shortSellingPower(S, CFG.SHORT_MAX_LEVERAGE);
}

/* ------------------------------------------------------------------ 트레이딩 */
function curStock() { return S.stocks.filter(s => s.listed)[S.selected] || S.stocks.filter(s => s.listed)[0]; }

/* ---- 예약주문: 장 마감 중에 걸어두고 다음 개장 시초가에 체결 ---- */
function queueOrder(side, qty) {
  const stock = curStock();
  if (!stock) return;
  qty = Math.floor(qty);
  if (!(qty >= 1)) { flashToast('수량을 1주 이상 입력하세요', 'neutral'); return; }
  S.pendingOrders = S.pendingOrders || [];
  if (S.pendingOrders.length >= 20) { flashToast('예약주문은 최대 20건까지 가능합니다', 'bad'); return; }
  // 같은 종목·같은 방향은 한 건으로 합친다
  const same = S.pendingOrders.find(o => o.name === stock.name && o.side === side);
  if (same) same.qty += qty;
  else S.pendingOrders.push({ id: 'po' + Date.now() + Math.random().toString(36).slice(2, 6), name: stock.name, side, qty });
  const label = side === 'buy' ? '매수' : '매도';
  flashToast(`📌 ${stock.name} ${qty}주 ${label} 예약 · 다음 개장 시초가 체결`, 'good');
  playSound('buy');
  renderPendingOrders(); autoSave();
}

function cancelOrder(id) {
  S.pendingOrders = (S.pendingOrders || []).filter(o => o.id !== id);
  flashToast('예약주문을 취소했습니다', 'neutral');
  renderPendingOrders(); autoSave();
}

// 개장 직후 실행 — 예약주문을 시초가(직전 종가)로 순서대로 체결
function runPendingOrders() {
  const orders = S.pendingOrders || [];
  if (!orders.length) return;
  S.pendingOrders = [];
  orders.forEach(o => {
    const live = S.stocks.filter(s => s.listed);
    const i = live.findIndex(s => s.name === o.name);
    if (i < 0) { addNews(`📌 예약주문 실패 · ${o.name} 상장폐지`, 'bad'); return; }
    const prevSelected = S.selected, prevTrades = S.trades;
    S.selected = i;
    if (o.side === 'buy') buy(o.qty); else sell(o.qty);
    S.selected = prevSelected;
    // buy/sell 은 체결에 성공해야 trades 를 올린다 — 안 올랐으면 자금·수량 부족으로 불발
    if (S.trades === prevTrades) {
      addNews(`📌 예약주문 불발 · ${o.name} ${o.qty}주 ${o.side === 'buy' ? '매수' : '매도'} (자금·수량 부족)`, 'bad');
    }
  });
  flashToast(`📌 예약주문 ${orders.length}건 처리 완료`, 'neutral');
  renderPendingOrders();
}

function renderPendingOrders() {
  const el = $('pending-orders');
  if (!el) return;
  const orders = S.pendingOrders || [];
  if (!orders.length) { el.style.display = 'none'; el.innerHTML = ''; return; }
  el.style.display = 'block';
  el.innerHTML = `<div class="po-title">📌 예약주문 ${orders.length}건 <span class="muted">다음 개장 시초가에 체결</span></div>` +
    orders.map(o => {
      const price = priceOf(o.name);
      return `<div class="po-row"><span class="${o.side === 'buy' ? 'up' : 'down'}">${o.side === 'buy' ? '매수' : '매도'}</span>
        <strong>${o.name}</strong> ${o.qty}주 <span class="muted">(현재가 ${won(price)}원 · 약 ${won(price * o.qty)}원)</span>
        <button class="po-cancel" data-id="${o.id}">취소</button></div>`;
    }).join('');
  el.querySelectorAll('.po-cancel').forEach(b => b.addEventListener('click', () => cancelOrder(b.dataset.id)));
}

function buy(qty) {
  if (S.life && S.life.jailMonths > 0) { flashToast(`🔒 수감 중 · ${S.life.jailMonths}개월 남음`, 'bad'); return; }
  if (S.phase !== 'open') return queueOrder('buy', qty);   // 장 마감 중 → 예약주문
  const stock = curStock();
  if (!stock) return;
  qty = Math.floor(qty);
  if (qty < 1) return;
  const price = priceOf(stock.name);
  const gross = price * qty;
  const fee = Math.round(gross * CFG.FEE_RATE);
  const cost = gross + fee;

  const pos = S.owned[stock.name];
  // 공매도 포지션 청산(숏 커버)
  if (pos && pos.qty < 0) return coverShort(stock, qty, price);

  // 신용 매수여력 체크 (현금 × 배율 − 빚)
  if (cost > buyingPower()) { flashToast('💸 매수여력이 부족합니다', 'bad'); playSound('error'); return; }
  // 현금으로 먼저 지불하고, 모자라면 신용융자로 차입
  const cashUsed = Math.min(cost, S.capital);
  const borrowed = cost - cashUsed;
  S.capital -= cashUsed;
  if (borrowed > 0) { S.loan += borrowed; S.usedLeverage = true; }
  if (pos && pos.qty > 0) {
    const totalQty = pos.qty + qty;
    pos.avg = (pos.avg * pos.qty + gross) / totalQty;
    pos.qty = totalQty;
  } else {
    S.owned[stock.name] = { qty, avg: price };
  }
  S.trades++;
  addNews(`🟢 ${stock.name} ${qty}주 매수 @${won(price)}${borrowed > 0 ? ` (신용 ${won(borrowed)})` : ''}`, 'neutral');
  flashToast(`매수 체결 · ${stock.name} ${qty}주${borrowed > 0 ? ' ⚡신용' : ''}`, 'good');
  playSound('buy'); speak('매수 체결');
  afterTrade();
}

function sell(qty) {
  if (S.life && S.life.jailMonths > 0) { flashToast(`🔒 수감 중 · ${S.life.jailMonths}개월 남음`, 'bad'); return; }
  if (S.phase !== 'open') return queueOrder('sell', qty);   // 장 마감 중 → 예약주문
  const stock = curStock();
  if (!stock) return;
  qty = Math.floor(qty);
  if (qty < 1) return;
  const price = priceOf(stock.name);
  const pos = S.owned[stock.name];

  // 보유분이 없거나 부족하면 → 공매도 진입
  if (!pos || pos.qty <= 0) return openShort(stock, qty, price);
  if (pos.qty < qty) { flashToast('보유 수량이 부족합니다', 'bad'); playSound('error'); return; }

  const gross = price * qty;
  const fee = Math.round(gross * CFG.FEE_RATE);
  const tax = Math.round(gross * CFG.TAX_RATE);
  const proceeds = gross - fee - tax;
  // 매도 대금으로 신용융자(빚)부터 자동 상환
  if (S.loan > 0) {
    const repay = Math.min(S.loan, proceeds);
    S.loan -= repay;
    S.capital += proceeds - repay;
  } else {
    S.capital += proceeds;
  }
  const realized = (price - pos.avg) * qty - fee - tax;
  S.realizedPnL += realized;
  pos.qty -= qty;
  if (pos.qty === 0) delete S.owned[stock.name];
  S.trades++;
  addNews(`🔴 ${stock.name} ${qty}주 매도 @${won(price)} (실현 ${won(realized)})`, realized >= 0 ? 'good' : 'bad');
  flashToast(`매도 체결 · 실현손익 ${won(realized)}원`, realized >= 0 ? 'good' : 'bad');
  playSound('sell'); speak('매도 체결');
  afterTrade();
}

// 공매도 진입: 현재가로 빌려 팔아 현금(담보) 확보
function openShort(stock, qty, price) {
  const gross = price * qty;
  const fee = Math.round(gross * CFG.FEE_RATE);
  if (gross + fee > shortSellingPower()) {
    flashToast(`🐻 공매도 한도 초과 · 가능 ${won(shortSellingPower())}원`, 'bad');
    playSound('error');
    return;
  }
  // 담보로 현금 유입
  S.capital += gross - fee;
  const pos = S.owned[stock.name];
  if (pos && pos.qty < 0) {
    const totalQty = pos.qty - qty;
    pos.avg = (pos.avg * Math.abs(pos.qty) + gross) / Math.abs(totalQty);
    pos.qty = totalQty;
  } else {
    S.owned[stock.name] = { qty: -qty, avg: price };
  }
  S.trades++;
  addNews(`🐻 ${stock.name} ${qty}주 공매도 진입 @${won(price)}`, 'neutral');
  flashToast(`공매도 진입 · ${stock.name} ${qty}주`, 'bad');
  playSound('sell');
  afterTrade();
}

// 공매도 청산(숏 커버): 되사서 갚음
function coverShort(stock, qty, price) {
  const pos = S.owned[stock.name];
  const shortQty = Math.abs(pos.qty);
  qty = Math.min(qty, shortQty);
  const gross = price * qty;
  const fee = Math.round(gross * CFG.FEE_RATE);
  const cost = gross + fee;
  if (S.capital < cost) { flashToast('💸 청산할 자본금이 부족합니다', 'bad'); playSound('error'); return; }
  S.capital -= cost;
  const realized = (pos.avg - price) * qty - fee;   // 숏은 하락해야 이익
  S.realizedPnL += realized;
  pos.qty += qty;
  if (pos.qty === 0) delete S.owned[stock.name];
  S.trades++;
  S.shortsClosed++;
  addNews(`🐻 ${stock.name} ${qty}주 숏 커버 @${won(price)} (실현 ${won(realized)})`, realized >= 0 ? 'good' : 'bad');
  flashToast(`숏 청산 · 실현손익 ${won(realized)}원`, realized >= 0 ? 'good' : 'bad');
  playSound(realized >= 0 ? 'buy' : 'error');
  afterTrade();
}

function afterTrade() { renderAll(); autoSave(); checkAchievements(); }

function buyMax() {
  const stock = curStock(); if (!stock) return;
  const price = priceOf(stock.name);
  const q = Math.floor(buyingPower() / (price * (1 + CFG.FEE_RATE)));
  $('qty-buy').value = Math.max(1, q);
  updateCost();
}
function sellMax() {
  const stock = curStock(); if (!stock) return;
  const pos = S.owned[stock.name];
  $('qty-sell').value = pos && pos.qty > 0 ? pos.qty : 1;
  updateCost();
}

/* ------------------------------------------------------------------ 렌더 */
function renderAll() {
  renderStockList();
  renderOwned();
  renderPendingOrders();
  renderCapital();
  renderIssues();
  renderNews();
  renderLeaderboard();
  renderChart();
  renderPortfolioChart();
  renderNetWorthChart();
  renderLifePanel();
  updateCost();
}

function changeInfo(stock) {
  const h = stock.history;
  const cur = h[h.length - 1].c;
  const prev = h.length > 1 ? h[h.length - 2].c : cur;
  const diff = cur - prev;
  const rate = prev ? diff / prev : 0;
  return { cur, prev, diff, rate, up: diff >= 0 };
}

function renderStockList() {
  const el = $('stock-list');
  el.innerHTML = '';
  const live = S.stocks.filter(s => s.listed);
  const filter = $('sector-filter').value;
  live.forEach((stock) => {
    if (filter !== 'all' && stock.sector !== filter) return;
    const ci = changeInfo(stock);
    const sec = D.SECTORS[stock.sector];
    const idx = live.indexOf(stock);
    const li = document.createElement('li');
    li.className = 'stock-row' + (idx === S.selected ? ' selected' : '');
    const star = S.watchlist[stock.name] ? '⭐' : '☆';
    const badge = stock.type === 'etf'
      ? `<span class="lev-badge ${stock.lev < 0 ? 'inv' : ''}">${levLabel(stock.lev)}</span>`
      : `<span class="cap-badge">${CAP_META[stock.cap].badge}</span>`;
    li.innerHTML =
      `<span class="star" data-name="${stock.name}">${star}</span>` +
      `<span class="tag" style="background:${sec.color}">${sec.name}</span>` +
      `<strong>${stock.name}</strong> ` +
      badge +
      `<span class="price ${ci.up ? 'up' : 'down'}">${won(ci.cur)}원</span> ` +
      `<span class="chg ${ci.up ? 'up' : 'down'}">${ci.up ? '▲' : '▼'} ${pct(ci.rate)}</span>`;
    li.addEventListener('click', (e) => {
      if (e.target.classList.contains('star')) {
        toggleWatch(stock.name); return;
      }
      S.selected = idx; renderAll();
    });
    el.appendChild(li);
  });
}

function toggleWatch(name) {
  if (S.watchlist[name]) delete S.watchlist[name];
  else S.watchlist[name] = true;
  renderStockList();
}

function renderOwned() {
  const el = $('owned-list');
  el.innerHTML = '';
  const names = Object.keys(S.owned);
  if (names.length === 0) { el.innerHTML = '<li class="muted">보유 종목이 없습니다</li>'; return; }
  names.forEach(name => {
    const pos = S.owned[name];
    const price = priceOf(name);
    const li = document.createElement('li');
    if (pos.qty > 0) {
      const val = pos.qty * price;
      const cost = pos.qty * pos.avg;
      const pl = val - cost;
      const rate = cost ? pl / cost : 0;
      li.innerHTML = `<strong>${name}</strong> ${pos.qty}주 · 평단 ${won(pos.avg)} ` +
        `<span class="${pl >= 0 ? 'up' : 'down'}">${pl >= 0 ? '+' : ''}${won(pl)} (${pct(rate)})</span>`;
    } else {
      const pl = (pos.avg - price) * Math.abs(pos.qty);
      const rate = pos.avg ? (pos.avg - price) / pos.avg : 0;
      li.innerHTML = `<span class="short-badge">공매도</span> <strong>${name}</strong> ${Math.abs(pos.qty)}주 · 진입 ${won(pos.avg)} ` +
        `<span class="${pl >= 0 ? 'up' : 'down'}">${pl >= 0 ? '+' : ''}${won(pl)} (${pct(rate)})</span>`;
    }
    li.addEventListener('click', () => {
      const live = S.stocks.filter(s => s.listed);
      const i = live.findIndex(s => s.name === name);
      if (i >= 0) { S.selected = i; renderAll(); }
    });
    el.appendChild(li);
  });
}

function renderCapital() {
  const nw = netWorthClean();
  const totalPL = nw - CFG.START_CAPITAL;
  const rate = totalPL / CFG.START_CAPITAL;
  $('capital').textContent = won(S.capital);
  $('networth').textContent = won(nw);
  const plEl = $('total-pl');
  plEl.textContent = `${totalPL >= 0 ? '+' : ''}${won(totalPL)}원 (${pct(rate)})`;
  plEl.className = totalPL >= 0 ? 'up' : 'down';
  $('day-badge').textContent = dateInfo(S.day).label;
  $('realized').textContent = won(S.realizedPnL);
  const debtEl = $('debt');
  if (debtEl) {
    debtEl.textContent = won(S.loan);
    debtEl.className = 'stat-val' + (S.loan > 0 ? ' down' : '');
  }
  const bpEl = $('buying-power');
  if (bpEl) bpEl.textContent = won(buyingPower());
}

function renderIssues() {
  const el = $('issue-list');
  el.innerHTML = '';
  const live = S.stocks.filter(s => s.listed);
  live.forEach(stock => {
    if (!stock.pendingIssue || !stock.pendingIssue.impact) return;
    const iss = stock.pendingIssue;
    const li = document.createElement('li');
    const cls = iss.impact >= 0 ? 'good' : 'bad';
    li.innerHTML = `<strong>${stock.name}</strong> <span class="${cls}">${iss.text} (${pct(iss.impact)})</span> <span class="muted">→ 다음 틱 반영</span>`;
    el.appendChild(li);
  });
  if (!el.children.length) el.innerHTML = '<li class="muted">대기 중인 이슈 없음</li>';
}

function addNews(text, cls) {
  S.news.unshift({ text, cls: cls || 'neutral', day: S.day });
  if (S.news.length > CFG.NEWS_MAX) S.news.pop();
}
function renderNews() {
  // 티커
  const ticker = $('news-ticker');
  const latest = S.news.slice(0, 12).map(n => n.text).join('  ◆  ');
  ticker.textContent = latest || '장이 열렸습니다. 행운을 빕니다 📈';
  // 로그
  const el = $('news-log');
  el.innerHTML = '';
  S.news.slice(0, 30).forEach(n => {
    const li = document.createElement('li');
    li.className = n.cls;
    li.innerHTML = `<span class="muted">[${n.day}일]</span> ${n.text}`;
    el.appendChild(li);
  });
}

function renderLeaderboard() {
  const el = $('leaderboard');
  el.innerHTML = '';
  const players = [
    { name: '🧑 나(You)', value: netWorthClean(), me: true },
    ...S.bots.map(b => ({ name: b.name, value: botNetWorth(b) })),
  ].sort((a, b) => b.value - a.value);
  players.forEach((p, i) => {
    const li = document.createElement('li');
    const medal = ['🥇', '🥈', '🥉', '4️⃣'][i] || (i + 1);
    const plRate = (p.value - CFG.START_CAPITAL) / CFG.START_CAPITAL;
    li.className = p.me ? 'me' : '';
    li.innerHTML = `${medal} <strong>${p.name}</strong> ${won(p.value)}원 ` +
      `<span class="${plRate >= 0 ? 'up' : 'down'}">(${pct(plRate)})</span>`;
    el.appendChild(li);
  });
  // 내 순위 저장
  S._rank = players.findIndex(p => p.me) + 1;
}

/* ------------------------------------------------------------------ 차트 */
let priceChart, pieChart, nwChart;

function renderChart() {
  const stock = curStock();
  if (!stock) return;
  const ctx = $('price-chart').getContext('2d');
  const h = stock.history;
  const labels = h.map((_, i) => i);
  const sec = D.SECTORS[stock.sector];

  if (S.chartMode === 'line') {
    const data = h.map(x => x.c);
    if (!priceChart || priceChart.config.type !== 'line') {
      if (priceChart) priceChart.destroy();
      priceChart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: [{ label: stock.name, data, borderColor: sec.color, backgroundColor: sec.color + '22', fill: true, tension: 0.25, pointRadius: 0, borderWidth: 2 }] },
        options: chartOpts(stock.name),
      });
    } else {
      priceChart.data.labels = labels;
      priceChart.data.datasets[0].data = data;
      priceChart.data.datasets[0].label = stock.name;
      priceChart.data.datasets[0].borderColor = sec.color;
      priceChart.data.datasets[0].backgroundColor = sec.color + '22';
      priceChart.update('none');
    }
  } else {
    // 캔들: floating bar 로 근사 구현 (몸통 = [open,close])
    const bodies = h.map(x => [Math.min(x.o, x.c), Math.max(x.o, x.c)]);
    const colors = h.map(x => x.c >= x.o ? 'rgba(220,38,38,0.85)' : 'rgba(37,99,235,0.85)');
    if (priceChart) priceChart.destroy();
    priceChart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: stock.name + ' (캔들)', data: bodies, backgroundColor: colors, borderColor: colors, borderWidth: 1, barPercentage: 0.6 }] },
      options: chartOpts(stock.name),
    });
  }
}

function chartOpts(title) {
  return {
    responsive: true, maintainAspectRatio: false, animation: false,
    plugins: { legend: { display: true, labels: { font: { size: 11 } } }, title: { display: false } },
    scales: { y: { beginAtZero: false, ticks: { callback: v => won(v) } }, x: { display: false } },
  };
}

function renderPortfolioChart() {
  const ctx = $('pie-chart').getContext('2d');
  const labels = ['현금'];
  const data = [Math.max(0, S.capital)];
  const colors = ['#94a3b8'];
  Object.keys(S.owned).forEach(name => {
    const pos = S.owned[name];
    if (pos.qty <= 0) return;
    const s = S.stocks.find(x => x.name === name);
    labels.push(name);
    data.push(pos.qty * priceOf(name));
    colors.push(s ? D.SECTORS[s.sector].color : '#000');
  });
  if (!pieChart) {
    pieChart = new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 1 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { font: { size: 10 }, boxWidth: 12 } } } },
    });
  } else {
    pieChart.data.labels = labels;
    pieChart.data.datasets[0].data = data;
    pieChart.data.datasets[0].backgroundColor = colors;
    pieChart.update('none');
  }
}

function renderNetWorthChart() {
  const ctx = $('nw-chart').getContext('2d');
  const data = S.netWorthHist;
  const labels = data.map((_, i) => i);
  const up = data[data.length - 1] >= CFG.START_CAPITAL;
  const color = up ? '#dc2626' : '#2563eb';
  if (!nwChart) {
    nwChart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [{ label: '순자산', data, borderColor: color, backgroundColor: color + '22', fill: true, tension: 0.25, pointRadius: 0, borderWidth: 2 }] },
      options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => won(v) } }, x: { display: false } } },
    });
  } else {
    nwChart.data.labels = labels;
    nwChart.data.datasets[0].data = data;
    nwChart.data.datasets[0].borderColor = color;
    nwChart.data.datasets[0].backgroundColor = color + '22';
    nwChart.update('none');
  }
}

/* ------------------------------------------------------------------ 비용 표시 */
function updateCost() {
  const stock = curStock(); if (!stock) return;
  const price = priceOf(stock.name);
  const qb = parseInt($('qty-buy').value) || 0;
  const qs = parseInt($('qty-sell').value) || 0;
  const buyGross = price * qb;
  const buyFee = Math.round(buyGross * CFG.FEE_RATE);
  const buyCost = buyGross + buyFee;
  const onMargin = buyCost > S.capital && S.leverage > 1;
  $('cost-buy').textContent = `비용: ${won(buyCost)}원 (수수료 ${won(buyFee)})${onMargin ? ' ⚡신용' : ''}`;
  const sellGross = price * qs;
  const sellFee = Math.round(sellGross * CFG.FEE_RATE);
  const sellTax = Math.round(sellGross * CFG.TAX_RATE);
  $('cost-sell').textContent = `수령: ${won(sellGross - sellFee - sellTax)}원 (세금+수수료 ${won(sellFee + sellTax)})`;
  $('sel-name').textContent = stock.name + (stock.type === 'etf' ? ` [${levLabel(stock.lev)}]` : '');
  $('sel-price').textContent = won(price) + '원';

  // 선택 종목 실시간 평가손익
  const pnlEl = $('pos-pnl');
  if (pnlEl) {
    const pos = S.owned[stock.name];
    if (pos && pos.qty !== 0) {
      let pl, rate, label;
      if (pos.qty > 0) {
        pl = (price - pos.avg) * pos.qty; rate = pos.avg ? (price - pos.avg) / pos.avg : 0;
        label = `${pos.qty}주 · 평단 ${won(pos.avg)}`;
      } else {
        pl = (pos.avg - price) * Math.abs(pos.qty); rate = pos.avg ? (pos.avg - price) / pos.avg : 0;
        label = `공매도 ${Math.abs(pos.qty)}주 · 진입 ${won(pos.avg)}`;
      }
      pnlEl.innerHTML = `📌 <strong>${stock.name}</strong> 보유 ${label} · 평가손익 <b class="${pl >= 0 ? 'up' : 'down'}">${pl >= 0 ? '+' : ''}${won(pl)}원 (${pct(rate)})</b>`;
    } else {
      pnlEl.innerHTML = `📌 <strong>${stock.name}</strong> · 미보유`;
    }
  }
}

/* ------------------------------------------------------------------ 토스트/사운드/TTS */
function flashToast(msg, cls) {
  const box = document.createElement('div');
  box.className = 'toast ' + (cls || '');
  box.textContent = msg;
  $('toast-area').appendChild(box);
  setTimeout(() => box.classList.add('show'), 10);
  setTimeout(() => { box.classList.remove('show'); setTimeout(() => box.remove(), 300); }, 2200);
}

/* ------------------------------------------------------------------ 배경음악 */
const BGM = window.QT_BGM;

// 지금 화면에 맞는 트랙을 고른다 (데이트 > 마감 리포트 > 장중)
function bgmScene() {
  const dateOpen = $('date-host') && $('date-host').style.display === 'block';
  if (dateOpen) return 'date';
  return S.phase === 'open' ? 'market' : 'closed';
}
function syncBGM() {
  if (!BGM || !S.bgmOn) return;
  BGM.play(bgmScene());
}
function toggleBGM(on) {
  if (!BGM) return;
  S.bgmOn = on == null ? !S.bgmOn : !!on;
  BGM.setEnabled(S.bgmOn);
  if (S.bgmOn) BGM.play(bgmScene(), true);
  const btn = $('bgm-toggle');
  if (btn) { btn.textContent = S.bgmOn ? '🎵 음악 ON' : '🎵 음악 OFF'; btn.classList.toggle('on', S.bgmOn); }
  try { localStorage.setItem('qt_bgm', JSON.stringify({ on: S.bgmOn, vol: BGM.getVolume() })); } catch (e) {}
}

/* 저장된 음악 설정 복원. 브라우저가 사용자 조작 전 재생을 막으므로,
 * 켜져 있던 경우엔 첫 클릭/터치 때 실제로 재생을 시작한다. */
function restoreBGMPref() {
  if (!BGM) return;
  let pref = {};
  try { pref = JSON.parse(localStorage.getItem('qt_bgm')) || {}; } catch (e) {}
  if (pref.vol != null) BGM.setVolume(pref.vol);
  const volEl = $('bgm-vol'); if (volEl) volEl.value = Math.round(BGM.getVolume() * 100);
  if (!pref.on) { toggleBGM(false); return; }
  S.bgmOn = true;
  BGM.setEnabled(true);
  const btn = $('bgm-toggle');
  if (btn) { btn.textContent = '🎵 음악 ON'; btn.classList.add('on'); }
  const arm = () => { syncBGM(); document.removeEventListener('pointerdown', arm); document.removeEventListener('keydown', arm); };
  document.addEventListener('pointerdown', arm);
  document.addEventListener('keydown', arm);
}

let audioCtx;
function playSound(kind) {
  if (!S.soundOn) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    const map = { buy: 660, sell: 440, error: 180, crash: 90 };
    o.type = kind === 'crash' ? 'sawtooth' : 'square';
    o.frequency.value = map[kind] || 500;
    g.gain.setValueAtTime(0.06, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
    o.start(); o.stop(audioCtx.currentTime + 0.18);
  } catch (e) { /* noop */ }
}

function speak(text) {
  if (!S.ttsOn || !('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  window.speechSynthesis.speak(u);
}

/* ------------------------------------------------------------------ 업적 */
function allAchievements() { return D.ACHIEVEMENTS.concat(D.LIFE_ACHIEVEMENTS || []); }

function checkAchievements() {
  const L = S.life || newLife();
  const ctx = {
    netWorth: netWorthClean(), capital: S.capital, realizedPnL: S.realizedPnL,
    trades: S.trades, maxNetWorth: S.maxNetWorth, shortsClosed: S.shortsClosed,
    day: S.day, rank: S._rank, usedLeverage: S.usedLeverage, marginCalled: S.marginCalled,
    hasJob: L.started && L.job !== 'none', propCount: L.properties.length,
    relationship: L.relationship, happy: L.happy,
  };
  allAchievements().forEach(a => {
    if (!S.unlocked[a.id] && a.check(ctx)) {
      S.unlocked[a.id] = true;
      flashToast(`${a.icon} 업적 달성: ${a.name}`, 'good');
      playSound('buy');
      saveAchievements();
    }
  });
  renderAchievements();
}

function renderAchievements() {
  const el = $('achievement-list');
  if (!el) return;
  el.innerHTML = '';
  const list = allAchievements();
  list.forEach(a => {
    const li = document.createElement('li');
    const done = S.unlocked[a.id];
    li.className = done ? 'ach done' : 'ach';
    li.innerHTML = `<span class="ach-icon">${done ? a.icon : '🔒'}</span> <strong>${a.name}</strong> — <span class="muted">${a.desc}</span>`;
    el.appendChild(li);
  });
  const cnt = Object.keys(S.unlocked).length;
  $('ach-count').textContent = `${cnt}/${list.length}`;
}

/* ------------------------------------------------------------------ 저장/로드 */
const LS_KEY = 'quicktrade_pro_save';
const LS_ACH = 'quicktrade_pro_ach';

function migrateOwnedNames(owned) {
  const migrated = {};
  Object.entries(owned || {}).forEach(([oldName, pos]) => {
    const name = (D.COMPANY_NAME_MIGRATIONS || {})[oldName] || oldName;
    migrated[name] = pos;
  });
  return migrated;
}

function autoSave() {
  try {
    const data = {
      capital: S.capital, owned: S.owned, day: S.day, tick: S.tick,
      trades: S.trades, realizedPnL: S.realizedPnL, shortsClosed: S.shortsClosed,
      maxNetWorth: S.maxNetWorth, watchlist: S.watchlist,
      loan: S.loan, leverage: S.leverage, usedLeverage: S.usedLeverage, marginCalled: S.marginCalled,
      awaitingNextDay: S.awaitingNextDay, pendingOrders: S.pendingOrders, life: S.life, economy: S.economy,
      stocks: S.stocks.map(s => ({ name: s.name, history: s.history.slice(-20), listed: s.listed, trend: s.trend })),
      netWorthHist: S.netWorthHist.slice(-60),
      bots: S.bots.map(b => ({ name: b.name, capital: b.capital, owned: b.owned, jailMonths: b.jailMonths, criminalRecord: b.criminalRecord, monthlyProfit: b.monthlyProfit })),
    };
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch (e) { /* 용량 초과 등 무시 */ }
}

function loadSave() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    S.capital = d.capital; S.owned = migrateOwnedNames(d.owned); S.day = d.day || 1; S.tick = d.tick || 0;
    S.trades = d.trades || 0; S.realizedPnL = d.realizedPnL || 0; S.shortsClosed = d.shortsClosed || 0;
    S.maxNetWorth = d.maxNetWorth || CFG.START_CAPITAL; S.watchlist = d.watchlist || {};
    S.loan = d.loan || 0; S.leverage = d.leverage || 1;
    S.usedLeverage = !!d.usedLeverage; S.marginCalled = !!d.marginCalled;
    S.awaitingNextDay = !!d.awaitingNextDay;   // 저장 시점이 마감 후였다면 개장 버튼이 다음달로
    S.pendingOrders = Array.isArray(d.pendingOrders) ? d.pendingOrders : [];
    S.life = Object.assign(newLife(), d.life || {});
    S.economy = ECONOMY.ensure(d.economy);
    LOAN.ensure(S.life); HEALTH.ensure(S.life); FAMILY.ensure(S.life);
    CAREER.ensure(S.life); HOUSING.ensure(S.life); LIFE_FINANCE.ensure(S.life);
    CHILD_EVENTS.ensure(S.life); SOCIAL.ensure(S.life); JUSTICE.ensure(S.life); LEGACY.ensure(S.life);
    if (typeof S.life.partner === 'string') S.life.partner = null;   // 구버전 세이브(문자열 상대) 호환
    migrateLifePeople(S.life);
    S.netWorthHist = d.netWorthHist && d.netWorthHist.length ? d.netWorthHist : [S.capital];
    (d.stocks || []).forEach(sv => {
      const savedName = (D.COMPANY_NAME_MIGRATIONS || {})[sv.name] || sv.name;
      const s = S.stocks.find(x => x.name === savedName);
      if (s && sv.history && sv.history.length) { s.history = sv.history; s.listed = sv.listed !== false; s.trend = sv.trend || s.trend; }
    });
    if (d.bots) d.bots.forEach((bv, i) => {
      const bot = S.bots.find(x => x.name === bv.name) || S.bots[i];
      if (bot) Object.assign(bot, bv, { owned: migrateOwnedNames(bv.owned) });
    });
    return true;
  } catch (e) { return false; }
}

function loadAchievements() {
  try { S.unlocked = JSON.parse(localStorage.getItem(LS_ACH)) || {}; } catch (e) { S.unlocked = {}; }
}
function saveAchievements() {
  try { localStorage.setItem(LS_ACH, JSON.stringify(S.unlocked)); } catch (e) {}
}

function hardReset() {
  if (!confirm('정말 초기화할까요? 저장된 진행 상황이 삭제됩니다. (업적은 유지)')) return;
  localStorage.removeItem(LS_KEY);
  location.reload();
}

/* URL 공유용 스냅샷 */
function shareURL() {
  const snap = { c: S.capital, d: S.day, o: S.owned, p: S.realizedPnL };
  const url = location.origin + location.pathname + '#s=' + encodeURIComponent(JSON.stringify(snap));
  navigator.clipboard.writeText(url).then(
    () => flashToast('🔗 공유 링크가 복사되었습니다', 'good'),
    () => flashToast('클립보드 복사 실패', 'bad')
  );
}

/* ------------------------------------------------------------------ 컨트롤 배선 */
function setSpeed(mult) {
  S.speed = mult;
  if (S.timer) { clearInterval(S.timer); S.timer = null; }
  if (S.phase === 'open') S.timer = setInterval(tick, CFG.TICK_MS / mult);   // 장중일 때만 진행
  document.querySelectorAll('.speed-btn').forEach(b => b.classList.toggle('active', +b.dataset.speed === mult));
}
function togglePause() {
  if (S.phase !== 'open') { flashToast('🔒 장이 열려 있지 않습니다', 'neutral'); return; }
  S.paused = !S.paused;
  $('pause-btn').textContent = S.paused ? '▶ 재개' : '⏸ 일시정지';
  flashToast(S.paused ? '⏸ 일시정지됨' : '▶ 재개', 'neutral');
}

function wire() {
  $('buy-btn').addEventListener('click', () => buy(parseInt($('qty-buy').value)));
  $('sell-btn').addEventListener('click', () => sell(parseInt($('qty-sell').value)));
  $('buy-max').addEventListener('click', buyMax);
  $('sell-max').addEventListener('click', sellMax);
  $('qty-buy').addEventListener('input', () => { $('amt-buy').value = ''; updateCost(); });
  $('qty-sell').addEventListener('input', updateCost);
  // 금액 입력 → 살 수 있는 수량 자동 계산
  $('amt-buy').addEventListener('input', () => {
    const stock = curStock(); if (!stock) return;
    const price = priceOf(stock.name);
    const amt = parseInt($('amt-buy').value) || 0;
    $('qty-buy').value = price > 0 ? Math.max(0, Math.floor(amt / price)) : 0;
    updateCost();
  });
  $('pause-btn').addEventListener('click', togglePause);
  $('session-btn').addEventListener('click', () => { S.phase === 'open' ? closeMarket() : openMarket(); });
  $('report-btn').addEventListener('click', reopenReport);
  document.querySelectorAll('.speed-btn').forEach(b => b.addEventListener('click', () => setSpeed(+b.dataset.speed)));
  $('sector-filter').addEventListener('change', renderStockList);
  $('leverage-select').addEventListener('change', e => {
    S.leverage = parseInt(e.target.value);
    flashToast(S.leverage > 1 ? `⚡ 신용 ${S.leverage}배 설정 (빚투 주의!)` : '신용 미사용(1배)', S.leverage > 1 ? 'bad' : 'neutral');
    renderCapital(); updateCost();
  });
  $('chart-line').addEventListener('click', () => { S.chartMode = 'line'; renderChart(); toggleChartBtn(); });
  $('chart-candle').addEventListener('click', () => { S.chartMode = 'candle'; renderChart(); toggleChartBtn(); });
  $('sound-toggle').addEventListener('change', e => S.soundOn = e.target.checked);
  $('bgm-toggle').addEventListener('click', () => toggleBGM());
  $('bgm-vol').addEventListener('input', e => {
    if (!BGM) return;
    BGM.setVolume(+e.target.value / 100);
    try { localStorage.setItem('qt_bgm', JSON.stringify({ on: S.bgmOn, vol: BGM.getVolume() })); } catch (err) {}
  });
  $('tts-toggle').addEventListener('change', e => S.ttsOn = e.target.checked);
  $('save-btn').addEventListener('click', () => { autoSave(); flashToast('💾 저장 완료', 'good'); });
  $('share-btn').addEventListener('click', shareURL);
  $('reset-btn').addEventListener('click', hardReset);

  // 키보드 단축키
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'b') buy(parseInt($('qty-buy').value));
    else if (e.key === 's') sell(parseInt($('qty-sell').value));
    else if (e.key === 'o') { S.phase === 'open' ? closeMarket() : openMarket(); }
    else if (e.key === ' ') { e.preventDefault(); togglePause(); }
    else if (e.key === 'ArrowDown') { S.selected = Math.min(S.selected + 1, S.stocks.filter(s=>s.listed).length - 1); renderAll(); }
    else if (e.key === 'ArrowUp') { S.selected = Math.max(S.selected - 1, 0); renderAll(); }
  });
}

function toggleChartBtn() {
  $('chart-line').classList.toggle('active', S.chartMode === 'line');
  $('chart-candle').classList.toggle('active', S.chartMode === 'candle');
}

function fillSectorFilter() {
  const sel = $('sector-filter');
  Object.keys(D.SECTORS).forEach(k => {
    const o = document.createElement('option');
    o.value = k; o.textContent = D.SECTORS[k].name;
    sel.appendChild(o);
  });
}

/* ------------------------------------------------------------------ 부트 */
function boot() {
  S.economy = ECONOMY.ensure(S.economy);
  buildStocks();
  buildBots();
  loadAchievements();
  const loaded = loadSave();
  if (!S.life) S.life = newLife();     // 새 게임
  LOAN.ensure(S.life); HEALTH.ensure(S.life); FAMILY.ensure(S.life);
  fillSectorFilter();
  wire();
  $('leverage-select').value = String(S.leverage);
  renderAchievements();
  renderAll();
  setSpeed(1);
  toggleChartBtn();
  restoreBGMPref();
  renderMarketPhase();
  if (!S.life.started) {
    if(!S.life.tutorialSeen)showTutorial();else showJobModal(false);
    flashToast('🎬 QuickTrade Life! 직업을 선택하고 인생을 시작하세요', 'neutral');
  } else if (loaded) {
    flashToast('💾 저장된 인생 불러옴 · 🔔 장 열림으로 이번 달 시작', 'good');
  } else {
    flashToast('🎮 🔔 장 열림 버튼으로 이번 달을 시작하세요', 'neutral');
  }
}

window.addEventListener('load', boot);
})();
