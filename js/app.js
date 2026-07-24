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
const STORIES = window.QT_CHARACTER_STORIES;
const CHAR_TRAITS = window.QT_CHARACTER_TRAITS;
const CROSS_EVENTS = window.QT_CHARACTER_CROSS_EVENTS;
const DANGEROUS_TRIO = window.QT_DANGEROUS_TRIO;
const ORIGIN = window.QT_ORIGIN;
const HEALTH = window.QT_HEALTH;
const FAMILY = window.QT_FAMILY;
const CHILD_EVENTS = window.QT_CHILD_EVENTS;
const SOCIAL = window.QT_SOCIAL;
const JUSTICE = window.QT_JUSTICE;
const LEGACY = window.QT_LEGACY;
const CAREER = window.QT_CAREER;
const APTITUDE = window.QT_APTITUDE;
const VOICE = window.QT_VOICE;
const ECONOMY = window.QT_ECONOMY;
const HOUSING = window.QT_HOUSING;
const LIFE_FINANCE = window.QT_LIFE_FINANCE;
const COMPANY = window.QT_COMPANY;

/* ------------------------------------------------------------------ 설정 */
const CFG = {
  START_CAPITAL: 1000000,   // 시작 자본금
  TICK_MS: 4500,            // 기본 1배속 틱 간격(ms) — 템포를 낮춰 덜 정신없게
  DAILY_LIMIT: 0.30,        // ETF·특수자산 비상 한도(일반주는 시총별 월간 한도 사용)
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
  BREAKING_MIN: 0.07,       // 실제 반영 충격이 이 이상이면 긴급속보 대상
  NEWS_MIN: 0.025,          // 실제 반영 충격이 이 이상이면 뉴스·기업 리포트에 기록
  MARKET_CIRCUIT: -0.08,    // 시장 평균이 시초가 대비 -8%면 서킷브레이커
  CIRCUIT_TICKS: 2,         // 서킷브레이커 정지 틱
  BREAKING_MS: 11000,       // 긴급속보 자동 닫힘(ms)
  BREAKING_INSESSION_PROB: 0.03, // 장중 속보 등장 확률(아주 가끔). 나머지 뉴스는 마감 리포트에서 몰아 봄
  INTRA_HELP_PROB: 0.05,         // 장중 인맥·연인·지인이 도움을 주는 확률(틱당)
  RAID_PROB: 0.025,              // 장중 라이벌이 공격해오는 확률(틱당) — 세력 있으면 즉시 역공 가능
};

const CAP_META = {
  // sigma는 '틱당', sessionLimit은 한 달(20틱) 전체 한도다.
  large: { label: '대형', sigma: 0.0022, issueMul: 0.16, tickLimit: 0.018, sessionLimit: 0.08, issueChance: 0.05, badge: '🏛️' },
  mid:   { label: '중형', sigma: 0.0038, issueMul: 0.27, tickLimit: 0.032, sessionLimit: 0.13, issueChance: 0.08, badge: '🏢' },
  small: { label: '소형', sigma: 0.0065, issueMul: 0.42, tickLimit: 0.055, sessionLimit: 0.20, issueChance: 0.12, badge: '🎲' },
  etf:   { label: 'ETF',  sigma: 0.010, issueMul: 0.0, badge: '📊' },
  macro: { label: '경제자산', sigma: 0.008, issueMul: 0.0, badge: '🌐' },
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
  limitOrders: [],            // 지정가 주문 [{id, name, side, qty, price}] — 장중 가격 도달 시 자동 체결
  companyNews: [],            // 종목별 공시 로그 (기업 리포트·뉴스 탭용)
  newsSeq: 0,                 // 뉴스 발생 순번 — 일반 뉴스와 공시를 한 줄로 정렬할 때 쓴다
  newsFilter: 'all',          // 뉴스 탭 필터: all | stock | market | mine | watch
  dayStartNW: CFG.START_CAPITAL, // 개장 시점 순자산(당월 손익 계산용)
  life: null,                 // 인생 상태(직업/행복/관계/부동산/대출) — boot 에서 초기화
  economy: null,              // 장기 경제 국면
  circuitBreakerTicks: 0,     // 시장 급락 시 남은 거래정지 틱
  circuitBreakerTriggered: false,
  marketSessionReturn: 0,
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
    lifeView: null,          // 구버전 세이브 호환
    familyBackground: null,  // 시작 가정환경
    schoolLife: null,        // 학창생활
    firstCareerPool: [],     // 가정·학창생활로 만들어진 첫 직업 후보
    job: 'none',             // 직업 id
    happy: 50,               // 행복도 0~100
    charm: 0,                // 매력(연애 진행도)
    relationship: 'single',  // single | dating | married
    partner: null,           // 메인 연애 상대(객체)
    lovers: [],              // 양다리 상대 목록 (문어발) — 적발 위험
    polycule: { active:false, members:[], trust:0 }, // 모두가 합의한 다자연애/하렘 루트
    dangerousTrio: { active:false, stage:0, stability:50, axes:{balance:0,containment:0,fracture:0}, history:[], ending:null },
    met: [],                 // 한 번이라도 만난 사람 (헤어져도 기억한다) — rememberPerson() 참고
    properties: [],          // [{id, name, emoji, value, rent}]
    passiveAssets: [],       // 주식 외 월 현금흐름 자산 [{id, boughtAt}]
    loan: 0,                 // 개인 대출 잔액
    creditScore: 720,        // 신용점수(0~1000)
    loans: [],               // 금융사별 대출 목록
    collectionLevel: 0,      // 0 정상 ~ 3 방문추심
    sharkMonths: 0,          // 불법 사채 유지 개월
    jailMonths: 0,           // 수감 잔여 개월
    criminalRecord: 0,       // 적발 횟수
    morality: 60,            // 도덕성 0~100
    guilt: 0,                // 죄책감 0~100
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
    faction: null,             // 라이벌 공격에 맞서는 플레이어 세력
    chats: {},                 // 인게임 연락 기록 {사람이름:{messages:[],unread}}
    justice: null,
    legacy: null,
    tutorialSeen: false,
    tutorialMet: false,
    makjang: false,
    hobbiesDone: 0,
    dates: 0,
    affection: 0,
    memories: [],
    crossEvents: { seen:{}, cooldown:0, history:[] },
    seraLoop: null,
    monthActions: {},         // 월별 1회 제한 행동 { "day:action": true }
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
    trend: rand(-0.0008, 0.0008), // 완만한 개별 추세(월간 누적)
    pendingIssue: null,
    issueCooldown: Math.floor(rand(1, 5)),
    sessionOpen: m.price,
    viTicks: 0,
    volume: Math.floor(rand(1e5, 1e7)),
    delistCounter: 0,
    listed: true,
  }));
  // ETF: 시장 지수를 배율(lev)만큼 추종. sector 'etf', cap 'etf'
  const etfs = (D.ETFS || []).map(m => ({
    sector: m.sector || 'etf', cap: m.type === 'macro' ? 'macro' : 'etf', vol: 1, type: m.type || 'etf',
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
  // 종목마다 3~6틱에 한 번만 확인하고, 시총별 확률을 통과해야 실제 이슈가 생긴다.
  const meta = CAP_META[stock.cap] || CAP_META.mid;
  if (Math.random() > meta.issueChance) return null;
  const pool = [];
  D.EVENTS_COMPANY_GOOD.forEach(e => pool.push({ ...e, type: 'good' }));
  D.EVENTS_COMPANY_BAD.forEach(e => pool.push({ ...e, type: 'bad' }));
  D.EVENTS_SECTOR.filter(e => e.sector === stock.sector)
    .forEach(e => pool.push({ ...e, type: e.impact >= 0 ? 'good' : 'bad' }));
  return pool.length ? weightedPick(pool) : null;
}

function boundedStockChange(stock, rawRate, meta) {
  const prev = stock.history[stock.history.length - 1].c;
  const open = stock.sessionOpen || prev;
  const tickRate = clamp(rawRate, -meta.tickLimit, meta.tickLimit);
  let projected = prev * (1 + tickRate);
  const low = open * (1 - meta.sessionLimit);
  const high = open * (1 + meta.sessionLimit);
  projected = clamp(projected, low, high);
  const rate = projected / prev - 1;
  return {
    rate,
    vi: Math.abs(rawRate) > meta.tickLimit + 0.00001,
    limitHit: projected <= low + 1 || projected >= high - 1,
  };
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

/* ETF 액면병합/분할 — 인버스·곱버스가 저가(3~4원)에서 정수 반올림에 얼어붙는 것 방지.
 * 가격이 너무 낮으면 병합(가격↑·수량↓), 너무 높으면 분할해 항상 움직일 수 있는 밴드로 되돌린다.
 * 보유 수량을 반대로 조정하므로 평가금액(가치)은 그대로 보존된다. */
function maybeRebalanceETF(stock) {
  const c = stock.history[stock.history.length - 1].c;
  let mul = 0;
  if (c < 1000) mul = 8;            // 8:1 병합 → 가격 8배, 수량 1/8
  else if (c > 300000) mul = 1 / 8; // 1:8 분할 → 가격 1/8, 수량 8배
  if (!mul) return;
  stock.history = stock.history.map(hh => ({
    o: Math.max(1, Math.round(hh.o * mul)), h: Math.max(1, Math.round(hh.h * mul)),
    l: Math.max(1, Math.round(hh.l * mul)), c: Math.max(1, Math.round(hh.c * mul)),
  }));
  const pp = S.owned[stock.name];
  if (pp) { pp.qty = Math.round(pp.qty / mul); pp.avg = pp.avg * mul; if (pp.qty === 0) delete S.owned[stock.name]; }
  S.bots.forEach(b => { if (b.owned && b.owned[stock.name] != null) { const q = Math.round(b.owned[stock.name] / mul); if (q <= 0) delete b.owned[stock.name]; else b.owned[stock.name] = q; } });
  addNews(`🔀 ${stock.name} ${mul > 1 ? `액면병합 ${mul}:1` : `액면분할 1:${Math.round(1 / mul)}`} (가격 정상화)`, 'neutral');
}

/* ------------------------------------------------------------------ 가격 갱신(핵심) */
function tick() {
  if (S.paused || S.phase !== 'open') return;
  S.tick++;
  S.sessionTick++;
  S._breakCand = [];   // 이번 틱 긴급속보 후보

  // 시장 전체 거래정지는 시간이 흐르는 동안 가격·주문 체결을 멈춘다.
  if (S.circuitBreakerTicks > 0) {
    S.circuitBreakerTicks--;
    if (S.circuitBreakerTicks === 0) {
      addNews('🔔 서킷브레이커 해제 · 거래가 재개됩니다', 'neutral');
      flashToast('🔔 거래 재개', 'neutral');
    }
    renderAll();
    renderSessionProgress();
    autoSave();
    if (S.sessionTick >= CFG.TICKS_PER_DAY) closeMarket();
    return;
  }

  // 시장 전체 돌발 뉴스도 드물게 발생하며, 원래 충격의 35%만 실제 가격에 반영한다.
  S.marketEvent = Math.random() < 0.035 ? weightedPick(D.EVENTS_MARKET) : null;
  const marketImpact = S.marketEvent ? S.marketEvent.impact * 0.35 : 0;
  if (S.marketEvent) {
    addNews(S.marketEvent.text, S.marketEvent.type === 'good' ? 'good' : 'bad');
    const mItem = { headline: S.marketEvent.text, target: '시장 전체', impact: marketImpact, market: true };
    S._breakCand.push(mItem);
    S.sessionNews.push(mItem);   // 마감 리포트에 기록
  }

  // (A) 일반 종목 갱신 + 시장 지수(평균 등락률) 집계
  let idxSum = 0, idxCount = 0;
  S.stocks.forEach(stock => {
    if (!stock.listed || stock.type === 'etf' || stock.type === 'macro') return;   // 지수·경제자산은 아래에서 별도 처리
    const meta = CAP_META[stock.cap];

    if ((stock.viTicks || 0) > 0) {
      stock.viTicks--;
      pushCandle(stock, 0);
      idxCount++;
      return;
    }

    // 1) 대기 중이던 이슈를 이번 틱에 반영
    let issueImpact = 0;
    if (stock.pendingIssue && stock.pendingIssue.impact) {
      issueImpact = stock.pendingIssue.impact * meta.issueMul;
    }

    // 2) 다음 틱용 새 이슈 배정 — 매 틱이 아니라 쿨다운 뒤에만 확인
    stock.pendingIssue = null;
    stock.issueCooldown = Number.isFinite(stock.issueCooldown) ? stock.issueCooldown - 1 : 0;
    if (stock.issueCooldown <= 0) {
      stock.pendingIssue = rollIssue(stock);
      stock.issueCooldown = Math.round(rand(4, 8));
    }
    const iss = stock.pendingIssue;
    if (iss && iss.impact) {
      const effectiveImpact = iss.impact * meta.issueMul;
      const mag = Math.abs(effectiveImpact);
      // 어느 정도 의미 있는 공시는 기업 리포트·뉴스 로그에 남긴다(피드를 풍부하게)
      if (mag >= CFG.NEWS_MIN) logCompanyNews(stock.name, iss.text, effectiveImpact);
      // 큰 이슈만 긴급속보 후보 + 마감 리포트 헤드라인 (미리 베팅 기회)
      if (mag >= CFG.BREAKING_MIN) {
        const nItem = { headline: `${stock.name} — ${iss.text}`, target: stock.name, impact: effectiveImpact };
        S._breakCand.push(nItem);
        S.sessionNews.push(nItem);
      }
    }

    // 3) 경기·섹터 방향은 월간 목표로 잡고 20틱에 나눠 누적한다.
    const noise = (Math.random() + Math.random() - 1) * meta.sigma * stock.vol;
    const economyTrend = ECONOMY.stockImpact(S.economy, stock.sector) * 2.4 / CFG.TICKS_PER_DAY;
    const factionFlow = (stock.factionFlowTicks || 0) > 0 ? (stock.factionFlowRate || 0) : 0;
    const rawRate = stock.trend + noise + issueImpact + marketImpact + economyTrend + factionFlow;
    const bounded = boundedStockChange(stock, rawRate, meta);
    const changeRate = bounded.rate;
    if ((stock.factionFlowTicks || 0) > 0) {
      stock.factionFlowTicks--;
      if (stock.factionFlowTicks <= 0) stock.factionFlowRate = 0;
    }

    if (bounded.vi && stock.viAnnouncedDay !== S.day) {
      stock.viAnnouncedDay = S.day;
      stock.viTicks = 1;
      if ((S.viNewsCount || 0) < 3) {
        S.viNewsCount = (S.viNewsCount || 0) + 1;
        logCompanyNews(stock.name, `변동성 완화장치 발동 · ${meta.label}주 틱 한도 ${pct(meta.tickLimit)}`, 0);
      }
    }
    if (bounded.limitHit && stock.limitAnnouncedDay !== S.day) {
      stock.limitAnnouncedDay = S.day;
      logCompanyNews(stock.name, `${meta.label}주 월간 가격제한폭 ${pct(meta.sessionLimit)} 도달`, changeRate);
    }

    // 5) 추세는 서서히 평균회귀 + 가끔 방향 전환
    stock.trend = clamp(stock.trend * 0.985 + rand(-0.00018, 0.00018), -0.0015, 0.0015);

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
  const ordinaryStocks = S.stocks.filter(stock => stock.listed && stock.type !== 'etf' && stock.type !== 'macro');
  S.marketSessionReturn = ordinaryStocks.length
    ? ordinaryStocks.reduce((sum, stock) => {
        const now = stock.history[stock.history.length - 1].c;
        return sum + (now / (stock.sessionOpen || now) - 1);
      }, 0) / ordinaryStocks.length
    : 0;
  if (!S.circuitBreakerTriggered && S.marketSessionReturn <= CFG.MARKET_CIRCUIT) {
    S.circuitBreakerTriggered = true;
    S.circuitBreakerTicks = CFG.CIRCUIT_TICKS;
    const cb = { headline:'시장 급락으로 서킷브레이커 발동', target:'시장 전체', impact:S.marketSessionReturn, market:true };
    S.sessionNews.push(cb);
    addNews(`⛔ 서킷브레이커 발동 · 시장 평균 ${pct(S.marketSessionReturn)} · ${CFG.CIRCUIT_TICKS}틱 거래정지`, 'bad');
    flashToast('⛔ 서킷브레이커 · 거래 일시 정지', 'bad');
    playSound('error');
  }
  // BGM은 한 틱의 출렁임보다 최근 장 분위기를 따라가게 완충한다.
  S.bgmMarketTrend = (S.bgmMarketTrend || 0) * 0.72 + indexReturn * 0.28;
  S.stocks.forEach(stock => {
    if (!stock.listed || stock.type !== 'etf') return;
    const lev = stock.lev || 1;
    const noise = (Math.random() + Math.random() - 1) * 0.0012;   // 추적오차 최소화 → 레버리지가 또렷이 보이게
    const lim = CFG.DAILY_LIMIT * Math.max(1, Math.abs(lev));
    const changeRate = clamp(indexReturn * lev + noise, -lim, lim);
    pushCandle(stock, changeRate);
    stock.volume = Math.floor(stock.volume * rand(0.6, 1.5));
    maybeRebalanceETF(stock);   // 저가/고가 고착 방지 — 액면병합·분할
  });

  // (C) 금·장기채·달러: 기준금리·물가·경기 국면에 서로 다르게 반응
  S.stocks.forEach(stock => {
    if (!stock.listed || stock.type !== 'macro') return;
    const macro = ECONOMY.assetImpact(S.economy, stock.asset);
    const noise = (Math.random() + Math.random() - 1) * 0.0035;
    const changeRate = clamp(macro + noise, -0.12, 0.12);
    pushCandle(stock, changeRate);
    stock.volume = Math.floor(stock.volume * rand(0.7, 1.35));
    maybeRebalanceETF(stock);
  });

  // 지정가 주문: 가격이 도달한 주문 체결
  runLimitOrders();

  // 반대매매(마진콜) 체크
  checkMarginCall();

  // 긴급속보 후보 처리(가장 임팩트 큰 것 하나)
  triggerBreaking();

  // 장중에 인맥·연인·지인이 도움(팁·응원)을 준다
  maybeIntraHelp();
  maybeObsessionIntrusion();
  // 장중에 라이벌이 공격해온다 (세력 있으면 즉시 역공)
  maybeRivalRaid();

  runBots();

  const nw = netWorthClean();
  S.netWorthHist.push(nw);
  if (S.netWorthHist.length > 120) S.netWorthHist.shift();
  S.maxNetWorth = Math.max(S.maxNetWorth, nw);

  checkAchievements();
  // 매 틱 호출해도 같은 트랙이면 bgm.js가 재시작하지 않는다.
  syncBGM();
  renderAll();
  renderSessionProgress();   // 진행 바를 매 틱 갱신
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

const BANKRUPT_CAUSES = [
  { short: '완전 자본잠식', detail: '수년간 누적된 적자로 자본이 완전히 잠식돼 상장폐지 기준에 걸렸습니다.' },
  { short: '감사의견 거절', detail: '회계법인이 감사의견을 거절하면서 거래정지 끝에 퇴출됐습니다.' },
  { short: '대표 횡령·배임', detail: '경영진의 대규모 횡령·배임이 드러나 신뢰를 잃고 무너졌습니다.' },
  { short: '최종 부도', detail: '만기 어음을 막지 못해 최종 부도 처리됐습니다.' },
  { short: '분식회계 적발', detail: '매출을 부풀린 분식회계가 적발돼 상장폐지 실질심사에서 퇴출됐습니다.' },
  { short: '주가 장기 미달', detail: '주가가 오랫동안 액면가를 크게 밑돌아 관리종목을 거쳐 상장폐지됐습니다.' },
];
function bankruptcyReason(stock) {
  const iss = stock.pendingIssue;
  if (iss && iss.impact != null && iss.impact < -0.1) {
    return { short: `'${iss.text}' 악재가 결정타`, detail: `가뜩이나 부실하던 회사에 '${iss.text}' 악재까지 겹치며 주가가 완전히 무너져 상장폐지됐습니다.` };
  }
  return pick(BANKRUPT_CAUSES);
}

function delist(stock) {
  stock.listed = false;
  const reason = bankruptcyReason(stock);
  addNews(`🚨 ${stock.name} 상장폐지 · 사유: ${reason.short}`, 'bad');
  flashToast(`🚨 ${stock.name} 상장폐지!`, 'bad');
  showBankruptcyPopup(stock, reason);
  // 보유분은 0원 처리
  if (S.owned[stock.name] && S.owned[stock.name].qty > 0) delete S.owned[stock.name];
  playSound('crash');
  playBGMSting('bankrupt', 5200);
}

function showBankruptcyPopup(stock, reason) {
  const host = $('bankrupt-host'); if (!host) return;
  const sec = D.SECTORS[stock.sector] || { name: '', color: '#888' };
  host.style.display = 'block';
  host.innerHTML =
    `<div class="window bankrupt-window">
       <div class="title-bar bankrupt-bar"><div class="title-bar-text">🚨 상장폐지 속보</div>
         <div class="title-bar-controls"><button aria-label="Close" id="bankrupt-x"></button></div></div>
       <div class="window-body">
         <img class="life-scene-banner" src="./assets/market-bankruptcy.png" alt="상장폐지된 회사가 정리되는 장면">
         <div class="bk-name"><span class="tag" style="background:${sec.color}">${sec.name}</span> <strong>${stock.name}</strong> 상장폐지</div>
         <div class="bk-reason"><b class="down">사유: ${reason.short}</b><br>${reason.detail}</div>
         <div class="bk-note">💸 보유 주식은 휴지조각이 되었습니다. 소형주는 늘 이런 위험이 있습니다.</div>
       </div>
     </div>`;
  const x = $('bankrupt-x'); if (x) x.addEventListener('click', closeBankruptcyPopup);
  autoPauseForPopup();   // 상장폐지 사유 읽는 동안 틱 정지
  clearTimeout(S._bankruptTimer);
  S._bankruptTimer = setTimeout(closeBankruptcyPopup, 8000);
}
function closeBankruptcyPopup() { const h = $('bankrupt-host'); if (h) { h.style.display = 'none'; h.innerHTML = ''; } autoResumeFromPopup(); }

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

/* ------------------------------------------------------------------ 장중 도움(인맥·연인·지인) */
// 다음 틱에 반영될 이슈가 큰 종목을 골라 팁으로 흘려준다 (호재/악재)
function tipStock(good) {
  const live = S.stocks.filter(s => s.listed && s.type !== 'etf' && s.pendingIssue && s.pendingIssue.impact != null);
  const pool = live.filter(s => good ? s.pendingIssue.impact >= 0.07 : s.pendingIssue.impact <= -0.07);
  return pool.length ? pick(pool) : null;
}

function maybeIntraHelp() {
  if (S.phase !== 'open' || S._helpActive) return;
  if (Math.random() > CFG.INTRA_HELP_PROB) return;
  const L = S.life; if (!L) return;
  const helpers = [];
  const social = SOCIAL.ensure(L);
  (social.contacts || []).forEach(c => { if ((c.trust || 0) >= 25) helpers.push({ t: 'contact', p: c, role: SOCIAL.role(c) }); });
  if (L.partner) helpers.push({ t: 'partner', p: L.partner });
  (L.met || []).forEach(m => { if (m.status !== 'ex' && (m.affection || 0) >= 30 && !(L.partner && L.partner.name === m.name)) helpers.push({ t: 'acq', p: m }); });
  if (!helpers.length) return;
  runIntraHelp(pick(helpers));
}

function runIntraHelp(h) {
  const L = S.life, p = h.p, name = p.name;
  if (h.t === 'contact' && h.role && !p.emoji) p.emoji = h.role.icon;   // 인맥은 역할 아이콘을 아바타로
  if (h.t === 'contact') {
    const role = h.role || {};
    if (['reporter', 'founder', 'mentor'].includes(role.id)) {
      const good = Math.random() < 0.6;
      const s = tipStock(good);
      if (s) {
        const dir = s.pendingIssue.impact >= 0 ? '호재' : '악재';
        showHelpCard(p, `${role.icon} <b>${name}</b> <span class="muted">· ${role.name}</span><br>"제가 들은 정보인데, <b>${s.name}</b> 쪽에 곧 <b class="${s.pendingIssue.impact >= 0 ? 'up' : 'down'}">${dir}</b>가 있을 것 같아요."`, () => goBuy(s.name), '📈 차트 보기');
        return;
      }
    }
    if (role.id === 'banker') { L.creditScore = clamp((L.creditScore || 600) + 5, 300, 950); showHelpCard(p, `🏦 <b>${name}</b> <span class="muted">· 은행원</span><br>"신용 관리 팁 드릴게요. 무리한 빚투는 조심하세요. <span class="up">(신용 +5)</span>"`); return; }
    if (role.id === 'lawyer' || role.id === 'official') { L.legalShield = (L.legalShield || 0) + 1; showHelpCard(p, `⚖️ <b>${name}</b> <span class="muted">· ${role.name}</span><br>"혹시 모를 법적 위험, 제가 챙겨뒀어요. <span class="up">(법적 방패 +1)</span>"`); return; }
    showHelpCard(p, `${role.icon || '🤝'} <b>${name}</b><br>"요즘 시장 분위기, 한번 참고해 보세요."`);
    return;
  }
  if (h.t === 'partner') {
    L.happy = clamp((L.happy || 50) + 4, 0, 100);
    const lines = ['"무리하지 말고 당신 페이스대로 해요."', '"오늘 저녁은 내가 준비할게요. 힘내요!"', '"수익보다 당신 건강이 더 중요해요."', '"잘하고 있어요. 나는 당신을 믿어요."'];
    showHelpCard(p, `💕 <b>${name}</b><br>"${pick(lines)}" <span class="up">(행복 +4)</span>`);
    return;
  }
  // 지인(아는 사람) — 소문. 절반은 부정확하다
  const good = Math.random() < 0.5;
  const reliable = Math.random() < 0.5;
  const s = reliable ? tipStock(good) : pick(S.stocks.filter(x => x.listed && x.type !== 'etf'));
  if (s) showHelpCard(p, `🗣️ <b>${name}</b> <span class="muted">· 아는 사람</span><br>"이건 그냥 소문인데… <b>${s.name}</b> 곧 ${good ? '뜬다' : '빠진다'}던데? 믿거나 말거나."`, () => goBuy(s.name), '📈 차트 보기');
}

function showHelpCard(person, html, onAction, actionLabel) {
  const host = $('help-host'); if (!host) return;
  S._helpActive = true;
  autoPauseForPopup();   // 읽는 동안 틱 정지
  const av = characterPortrait(person, 'happy');
  host.style.display = 'block';
  host.innerHTML =
    `<div class="help-card">
       <img class="help-av" src="${av}" alt="">
       <div class="help-body">${html}${onAction ? `<div><button class="help-go" id="help-go">${actionLabel || '보기'}</button></div>` : ''}</div>
       <button class="help-x" id="help-x" aria-label="닫기">✕</button>
     </div>`;
  const go = $('help-go'); if (go && onAction) go.addEventListener('click', () => { onAction(); closeHelpCard(); });
  const x = $('help-x'); if (x) x.addEventListener('click', closeHelpCard);
  clearTimeout(S._helpTimer);
  S._helpTimer = setTimeout(closeHelpCard, 9000);
  playSound('buy');
}
function closeHelpCard() { const h = $('help-host'); if (h) { h.style.display = 'none'; h.innerHTML = ''; } S._helpActive = false; autoResumeFromPopup(); }

function maybeObsessionIntrusion(){
  if(S.phase!=='open'||S._helpActive||!S.life||S._obsessionIntrudedDay===S.day)return;
  const target=(S.life.met||[]).filter(r=>{const risk=dangerousRiskMeta(r);return risk&&risk.value>=45&&r.status!=='ex';}).sort((a,b)=>dangerousRiskMeta(b).value-dangerousRiskMeta(a).value)[0];
  if(!target)return;const risk=dangerousRiskMeta(target),level=risk.value;
  if(Math.random()>(level>=85?.10:level>=70?.065:.035))return;
  S._obsessionIntrudedDay=S.day;
  let line=target.name==='강유진'
    ? (level>=85?'“위험 주문으로 판단했어요. 잠깐 손 떼요. 지금부터 내가 같이 볼게요.”':level>=70?'“경찰 신분으로 묻는 건 아니에요. 그래도 지금 위치는 알려줘요.”':'“장중인 건 알아요. 끝날 때까지 통화만 연결해둘게요.”')
    : target.name==='한채린'
      ? (level>=85?'“그 주문 취소해. 네 계좌에 붙인 사람이 더 나은 종목을 골랐어.”':level>=70?'“오늘 일정 비워. 이미 네 회사 쪽에는 말해뒀어.”':'“화면 공유해. 네가 뭘 사는지는 알아야 지원 규모를 정하지.”')
      : (level>=85?'“왜 주문창은 보고 내 메시지는 안 봐요? 지금 어디인지 화면 보여줘요.”':level>=70?'“회사 앞이에요. 놀라게 하려고 말 안 했어요. 잠깐 내려올 거죠?”':'“장중인 건 아는데… 지금 누구랑 있는지만 알려주면 안 돼요?”');
  if(level>=85&&S.pendingOrders&&S.pendingOrders.length){const lost=S.pendingOrders.shift();line+=` 확인을 요구하는 전화가 이어지는 사이 예약 주문 하나가 취소됐습니다${lost&&lost.name?` (${lost.name})`:''}.`;}
  S.life.stress=clamp((S.life.stress||0)+(level>=85?8:4),0,100);
  showHelpCard(target,`📱 <b>${target.name}</b> <span class="down">· ${risk.label} ${Math.round(level)}</span><br>${line}<br><span class="down">스트레스 +${level>=85?8:4}</span>`);
}

/* ---- 장중 팝업이 뜨면 자동 일시정지, 닫히면 재개 (읽는 동안 틱이 안 흐르게) ---- */
function anyIntraPopupOpen() {
  if (S.breaking) return true;
  if (S._helpActive) return true;
  if (S._factionTradeCall) return true;
  const bk = $('bankrupt-host');
  if (bk && bk.style.display === 'block') return true;
  return false;
}
function pauseUISync() {
  const pb = $('pause-btn'); if (pb) pb.textContent = S.paused ? '▶ 재개' : '⏸ 일시정지';
  renderSessionProgress();
}
function autoPauseForPopup() {
  if (S.phase === 'open' && !S.paused) { S.paused = true; S._autoPaused = true; pauseUISync(); }
}
function autoResumeFromPopup() {
  if (S._autoPaused && !anyIntraPopupOpen()) { S._autoPaused = false; S.paused = false; pauseUISync(); }
}

function pickExperts(item) { return EXPERTS.reports(item, 3); }

function showBreaking(item, isAlert) {
  if (S.breaking && S.breaking.timer) clearTimeout(S.breaking.timer);
  const experts = pickExperts(item);
  S.breaking = { ...item, experts, timer: null };
  renderBreaking();
  autoPauseForPopup();   // 속보 읽는 동안 틱 정지
  playSound(isAlert ? 'crash' : (item.impact >= 0 ? 'buy' : 'sell'));
  if (isAlert || item.impact <= -0.18) playBGMSting('bankrupt', 4200);
  else if (item.impact >= 0.18) playBGMSting('jackpot', 4200);
  else syncBGM();
  S.breaking.timer = setTimeout(closeBreaking, CFG.BREAKING_MS);
}

function closeBreaking() {
  if (S.breaking && S.breaking.timer) clearTimeout(S.breaking.timer);
  S.breaking = null;
  renderBreaking();
  syncBGM(true);
  autoResumeFromPopup();
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
  if (!S.life || !S.life.started) {
    flashToast('🏠 먼저 가정환경과 학창생활을 정해 인생을 시작하세요', 'bad');
    if (S.life && !S.life.tutorialSeen) showTutorial();
    else startLifeSetup();
    return;
  }
  if (S.awaitingNextDay) S.day++;       // 마감 후 개장이면 다음 날로 넘어감
  S.awaitingNextDay = false;
  S.phase = 'open';
  S.paused = false;
  S.sessionTick = 0;
  S.sessionNews = [];
  S.circuitBreakerTicks = 0;
  S.circuitBreakerTriggered = false;
  S.marketSessionReturn = 0;
  S.viNewsCount = 0;
  S.stocks.forEach(stock => {
    if (!stock.listed) return;
    stock.sessionOpen = stock.history[stock.history.length - 1].c;
    stock.viTicks = 0;
    stock.viAnnouncedDay = null;
    stock.limitAnnouncedDay = null;
  });
  S.dayStartNW = netWorthClean();
  closeReport();                        // 마감 리포트 닫기
  addNews(`📅 ${S.day}일차 개장`, 'neutral');
  const outlook = ECONOMY.outlook(S.economy);
  const sectorNames = ids => ids.map(id => (D.SECTORS[id] || {}).name || id).join('·');
  const strong = sectorNames(outlook.strong.slice(0, 2));
  const weak = sectorNames(outlook.weak.slice(0, 2));
  const outlookText = `${outlook.text}${strong ? ` · 강세 ${strong}` : ''}${weak ? ` · 약세 ${weak}` : ''}`;
  addNews(`📰 월간 경제전망 — ${outlookText}`, outlook.monthlyMarket >= 0 ? 'good' : 'bad');
  S.sessionNews.push({ headline:outlookText, target:'경제 국면', impact:outlook.monthlyMarket, market:true });
  flashToast(`🔔 ${S.day}일차 장 개장! 행운을 빕니다`, 'good');
  playSound('buy');
  setSpeed(S.speed);                    // 타이머 시작
  $('pause-btn').textContent = '⏸ 일시정지';
  renderMarketPhase();
  runPendingOrders();                   // 마감 중 걸어둔 예약주문을 시초가로 체결
  renderAll();
  maybeFactionTradeCall();              // 조직이 있으면 공동 매매 작전 연락이 올 수 있다
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
  maybeWorldBreaking();                 // 월말에는 기업·정치 상황을 속보로 체감
  const terminalEvent = S._settle && (S._settle.died || S._settle.debtGameOver || S._settle.captivity);
  if (!terminalEvent) {
    if (S._settle && S._settle.incident) showJobIncident(S._settle.incident);
    else showNextImportantEvent();      // 중요 사건을 모두 확인한 뒤 일반 선택지 이벤트
  }
  autoSave();
}

const WORLD_BREAKING = [
  {headline:'국회, 금융투자 과세 개편안 긴급 논의',target:'정치·금융정책',impact:-.08,market:true},
  {headline:'정부, 도심 공급 확대와 재건축 규제 완화 발표',target:'정치·부동산정책',impact:.09,market:true},
  {headline:'중앙은행 총재 “물가 안정 전까지 긴축 유지”',target:'통화정책',impact:-.11,market:true},
  {headline:'여야, 기업 지배구조 개편 법안 정면충돌',target:'정치·기업정책',impact:-.07,market:true},
  {headline:'정부, 신산업 투자 세액공제 확대 예고',target:'산업정책',impact:.10,market:true},
  {headline:'대형 기관, 국내 증시 장기투자 비중 확대',target:'증시 수급',impact:.12,market:true},
];
function maybeWorldBreaking(){
  if(Math.random()>.42)return;
  let item={...pick(WORLD_BREAKING)};
  if(Math.random()<.55){const stock=pick(S.stocks.filter(s=>s.listed&&s.type!=='etf'));if(stock){const good=Math.random()<.52;item={headline:`${stock.name}, ${good?'대규모 신규 계약·투자 계획 발표':'실적 전망 하향·경영진 긴급회의'}`,target:stock.name,impact:good?.14:-.14};}}
  showBreaking(item,true);
}

function renderMarketPhase() {
  const btn = $('session-btn');
  const badge = $('phase-badge');
  const open = S.phase === 'open';
  if (open) {
    if (btn) { btn.textContent = '🔴 장 마감'; btn.className = 'session-btn closing'; }
    const left = Math.max(0, CFG.TICKS_PER_DAY - S.sessionTick);
    if (badge) {
      badge.textContent = S.circuitBreakerTicks > 0
        ? `⛔ 서킷브레이커 · ${S.circuitBreakerTicks}틱 뒤 재개`
        : `🟢 장중 · ${left}/${CFG.TICKS_PER_DAY}틱 남음 · 시장 ${pct(S.marketSessionReturn || 0)}`;
      badge.className = 'phase-badge open';
    }
  } else {
    if (btn) {
      btn.textContent = S.life && !S.life.started
        ? '🧭 인생 시작 선택 필요'
        : `🔔 ${S.awaitingNextDay ? S.day + 1 : S.day}일차 개장`;
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
  renderSessionProgress();
}

// 이번 달(장) 진행 상황 바 — 몇 % 지났고 대략 몇 초 남았는지
function renderSessionProgress() {
  const bar = $('session-bar'), fill = $('session-bar-fill'), text = $('session-bar-text');
  if (!bar || !fill || !text) return;
  const total = CFG.TICKS_PER_DAY;
  if (S.phase === 'open') {
    const done = Math.min(total, S.sessionTick);
    const left = Math.max(0, total - done);
    const pct = Math.round(done / total * 100);
    const secLeft = Math.ceil(left * (CFG.TICK_MS / (S.speed || 1)) / 1000);
    fill.style.width = pct + '%';
    const alert = S._autoPaused && anyIntraPopupOpen();
    bar.className = 'session-bar open' + (left <= 3 ? ' ending' : '') + (alert ? ' alert' : '');
    text.textContent = S.circuitBreakerTicks > 0
      ? `⛔ 서킷브레이커 · ${S.circuitBreakerTicks}틱 뒤 거래 재개 · 시장 ${pct(S.marketSessionReturn || 0)}`
      : alert
      ? `🔔 알림 도착! 확인하세요 · ⏸ 정지됨 (${done}/${total}틱)`
      : S.paused
        ? `⏸ 일시정지 · ${done}/${total}틱 (${pct}%)`
        : `🟢 장중 ${pct}% · ${left}틱 남음 (약 ${secLeft}초) · ${dateInfo(S.day).label}`;
  } else {
    fill.style.width = '0%';
    bar.className = 'session-bar';
    const next = S.awaitingNextDay ? S.day + 1 : S.day;
    text.textContent = `🔒 장 마감 · 🔔 개장을 눌러 ${dateInfo(next).label} 시작`;
  }
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
  if (st.passive) settleBits.push(`자동수입 <b class="up">+${won(st.passive)}</b>`);
  if (st.factionBiz) settleBits.push(`조직원 수입 <b class="up">+${won(st.factionBiz)}</b>`);
  if (st.factionUpkeep) settleBits.push(`조직 운영비 <b class="down">-${won(st.factionUpkeep)}</b>`);
  if (st.partner) settleBits.push(`연인·배우자 <b class="${st.partner >= 0 ? 'up' : 'down'}">${st.partner >= 0 ? '+' : ''}${won(st.partner)}</b>`);
  if (st.incident) settleBits.push(`🚑${st.incident.job} 사고 <b class="down">-${won(st.incident.cost)}</b> <span class="muted">(현금 ${won(st.incident.cashPaid)} · 빚 +${won(st.incident.debtAdded)})</span>`);
  if (st.scandal) {
    const kind = st.scandal.wasMarried ? '불륜' : '양다리';
    settleBits.push(st.scandal.forgiven
      ? `😰${kind}발각 <b class="down">용서받음 · 친밀도 급락</b>`
      : `😱${kind}발각 <b class="down">${st.scandal.settle ? `-${won(st.scandal.settle)}` : '이별'}${st.scandal.fired ? ' +해고' : ''}</b>`);
  }
  if (st.lifeInterest) settleBits.push(`대출이자 <b class="down">-${won(st.lifeInterest)}</b>`);
  const info = dateInfo(day);
  const nextInfo = dateInfo(day + 1);
  const lifeLeft = lifeActionRemaining();
  const macro = ECONOMY.ensure(S.economy);
  const rateMark = macro.lastRateDelta > 0 ? '▲ 인상' : macro.lastRateDelta < 0 ? '▼ 인하' : '－ 동결';

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
            <div class="macro-summary"><b>🏦 기준금리 ${macro.baseRate.toFixed(2)}%</b> <span class="muted">${rateMark}</span> · 🌡️ 물가 ${macro.inflation.toFixed(1)}%<br><small>금리 상승은 대출 부담을 키우고 장기채 가격을 누를 수 있습니다. 금은 물가·불안에 강한 편이지만 높은 금리에는 약해질 수 있습니다.</small></div>
         </div>
         <div class="close-news-title">📰 이번 달 주요 뉴스 — 골라서 읽어보세요${totalCnt > news.length ? ` <span class="muted" style="color:#ccd">(주요 ${news.length}건 / 총 ${totalCnt}건)</span>` : ''}</div>
         <ul class="clean-list close-news">${items}</ul>
         ${lifeHubHTML()}
         <div class="close-actions">
           <button id="next-day-btn" class="session-btn opening">${lifeLeft > 0 ? `⏭ 이번 달 마무리 · 자유시간 ${lifeLeft}회 남음` : '▶ 이번 달 일정 완료'} (${nextInfo.label} 개장)</button>
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
function partnerIncomeNow(p){const years=Math.floor(Math.max(0,S.day-1)/12);return Math.round((p&&p.income||0)*Math.min(8,Math.pow(1.045,years)));}

function jobOf() { return D.JOBS.find(j => j.id === (S.life && S.life.job)) || D.JOBS[0]; }
function playerJobPrestige(){const j=jobOf();return clamp((j.difficulty||0)+(j.dateBonus||0)*1.5,0,120);}
function relationshipJobMod(c){
  const prestige=playerJobPrestige();
  if(c.special==='heiress')return prestige>=70?-16:prestige<=25?14:4; // 채린은 잘난 상대보다 자신에게 기대는 상대를 선호
  if(c.personality==='ambitious')return prestige>=65?10:prestige<=20?-9:0;
  if(c.personality==='lavish')return prestige>=55?7:prestige<=15?-6:0;
  if(c.personality==='frugal'&&['ceo','youtuber'].includes(jobOf().id))return-6;
  if(c.personality==='caring'&&['nurse','teacher','civil'].includes(jobOf().id))return6;
  if(c.personality==='free'&&['civil','accountant'].includes(jobOf().id))return-4;
  return 0;
}

// 총 재산 = 투자 순자산 + 부동산 시세 − 개인 대출
function totalWealth() {
  const L = S.life;
  if (!L) return netWorthClean();
  LOAN.ensure(L);
  const propVal = L.properties.reduce((s, p) => s + p.value, 0);
  const passiveVal = (L.passiveAssets || []).reduce((s, a) => {
    const item = D.PASSIVE_ASSETS.find(x => x.id === a.id);
    return s + (item ? Math.round(item.price * item.resaleRate) : 0);
  }, 0);
  // 세력 운영 투자는 회수할 수 없는 조직 인프라 비용이므로 개인 순자산에 포함하지 않는다.
  return netWorthClean() + propVal + passiveVal + HOUSING.assetValue(L) - L.loan;
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

function rollPartnerIncident(L, per) {
  if (!L.partner || Math.random() >= (per.incident || 0)) return null;
  const incidents = {
    frugal:   { text: '공동 지출을 상의 없이 지나치게 줄여 크게 다퉜다.', cash: 300000, affection: -7, happy: -4 },
    ambitious:{ text: '중요한 기념일보다 일을 택해 관계가 뒷전이 됐다.', cash: 0, affection: -12, happy: -7 },
    homebody: { text: '연락 없이 늦게 들어온 일을 두고 불안과 오해가 커졌다.', cash: 0, affection: -9, happy: -5 },
    caring:   { text: '상대를 챙기느라 지친 마음을 숨기다 한꺼번에 터뜨렸다.', cash: 0, affection: -8, happy: -6 },
    cold:     { text: '힘든 날에도 무심한 태도를 보여 관계가 급격히 식었다.', cash: 0, affection: -13, happy: -8 },
    lavish:   { text: '상의 없이 큰돈을 써 카드 대금과 신뢰 문제가 생겼다.', cash: -Math.round(rand(1200000, 5000000)), affection: -12, happy: -5 },
    free:     { text: '밤새 연락이 끊기고 다른 사람과 있었다는 의심을 샀다.', cash: 0, affection: -15, happy: -9 }
  };
  const ev = incidents[L.partner.personality] || incidents.caring;
  S.capital += ev.cash;
  L.affection = Math.max(0, (L.affection || 0) + ev.affection);
  L.happy = clamp(L.happy + ev.happy, 0, 100);
  return ev;
}

// 월말 정산: 월급 + 월세 + 부동산 시세상승 − 대출이자 − 직업사고 + 연애상대 효과 − 행복감소
function settleMonth() {
  const L = S.life;
  S._importantEvents = [];
  S.economy = ECONOMY.ensure(S.economy);
  LOAN.ensure(L);
  const info = dateInfo(S.day);
  const b = { salary: 0, rent: 0, passive: 0, lifeInterest: 0, partner: 0, incident: null, breakup: false };
  const job = jobOf();
  if (L._attackedRecently > 0) L._attackedRecently--;   // 피습 여운(경찰 조우 조건) 감소

  // 1) 월급 (사업가/유튜버는 변동 · 적자 가능) — 적성이 맞으면 성과로 조금 더 번다
  const wasJailed = L.jailMonths > 0;
  const aptMul = APTITUDE ? APTITUDE.performanceMul(job, L) : 1;
  b.salary = wasJailed ? 0 : Math.round(CAREER.salary(job, L) * ECONOMY.salaryMultiplier(S.economy) * aptMul);
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

  // 2-1) 주식 외 현금흐름 자산 정산. 예금은 기준금리, 사업형은 매출 변동을 반영한다.
  (L.passiveAssets || []).forEach(owned => {
    const asset = D.PASSIVE_ASSETS.find(x => x.id === owned.id); if (!asset) return;
    let base = asset.monthlyIncome;
    if (asset.id === 'deposit') base = Math.round(asset.price * Math.max(.018, ECONOMY.ensure(S.economy).baseRate / 100) / 12);
    const gross = Math.max(0, Math.round(base * (1 + rand(-(asset.variance || 0), asset.variance || 0))));
    b.passive += Math.max(0, gross - (asset.maintenance || 0));
  });
  if (b.passive > 0) S.capital += b.passive;

  // 2-2) 세력 조직원 정산 — 실제 구성원이 만든 수입과 급여·운영비를 함께 처리한다.
  if (L.faction && L.faction.level) {
    const factionMonth = RIVALS.settleFaction(L, S.capital);
    S.capital = factionMonth.cash;
    b.factionBiz = factionMonth.income;
    b.factionUpkeep = factionMonth.upkeep;
    factionMonth.events.forEach(text => addNews(`👥 [세력] ${text}`, text.includes('떠났') || text.includes('밀려') ? 'bad' : 'neutral'));
  }

  // 3) 금융사별 이자·신용등급·추심 단계 갱신
  const passiveResaleValue = (L.passiveAssets || []).reduce((sum, owned) => { const a=D.PASSIVE_ASSETS.find(x=>x.id===owned.id); return sum+(a?Math.round(a.price*a.resaleRate):0); },0);
  const assetValue = L.properties.reduce((sum, p) => sum + p.value, 0) + passiveResaleValue + Math.max(0, netWorthClean());
  const debtResult = LOAN.settleMonth(L, Math.max(0, b.salary + b.rent + b.passive + (b.factionBiz||0) - (b.factionUpkeep||0)), assetValue, ECONOMY.loanMultiplier(S.economy));
  b.lifeInterest = debtResult.interest;
  b.debtResult = debtResult;

  // 4) 직업 리스크 사고 → 빚 발생 (고소득일수록·적성이 안 맞을수록·건강이 나쁠수록 위험이 큼)
  const riskAptMul = APTITUDE ? APTITUDE.riskMul(job, L) : 1;
  const hp = (L.health != null ? L.health : 80), stress = L.stress || 0;
  // 건강 좋고 스트레스 낮으면 사고 확률이 크게 준다(최저 0.4배), 반대면 최대 2.4배
  const healthMul = clamp(1 + (65 - hp) / 110 + stress / 180, 0.4, 2.4);
  const incidentRisk = job.risk * riskAptMul * healthMul;
  if (job.risk && job.incidents && job.incidents.length && Math.random() < incidentRisk) {
    const inc = pick(job.incidents);
    const cost = Math.round(rand(inc.cost[0], inc.cost[1]));
    const cashPaid = Math.min(Math.max(0, S.capital), cost);
    const debtAdded = Math.max(0, cost - cashPaid);
    S.capital -= cashPaid;
    if (debtAdded > 0) LOAN.addDebt(L, debtAdded, `${job.name} 사고채무 · ${inc.text}`);
    b.incident = { job: job.name, emoji: job.emoji, text: inc.text, cost, cashPaid, debtAdded };
  }

  // 5) 연애/결혼 상대의 월간 경제·행복 효과 (직업·성격에 따라 돈을 받거나 잃음)
  if (L.relationship !== 'single' && L.partner) {
    const nm = L.partner.name;
    const trioStable=!!(L.dangerousTrioBond&&L.dangerousTrioBond.active);
    const per = D.PERSONALITIES[L.partner.personality] || {};
    const married = L.relationship === 'married';
    const income = partnerIncomeNow(L.partner);
    const relationRate = married ? (L.partner.marriedShareRate == null ? .3 : L.partner.marriedShareRate) : (L.partner.datingMoneyRate || 0);
    const flat = married ? 0 : (L.partner.datingMoneyFlat || 0);
    const personalityCost = married ? Math.round(Math.max(0, -(per.money || 0)) * Math.max(income, 1500000) * .25) : 0;
    b.partner = Math.round(income * relationRate + flat - personalityCost);
    L.partner.mood = b.partner < 0 || (per.happy||0) < 0 ? 'sad' : (L.affection||0) >= 60 ? 'happy' : 'neutral';
    S.capital += b.partner;
    L.happy = clamp(L.happy + (per.happy || 0), 0, 100);
    if (b.partner) addNews(`💑 ${nm}(${L.partner.job}) ${married ? '공동생활 정산' : L.partner.moneyStyle === 'support' ? '연애 지원' : '연애 지출'} ${b.partner >= 0 ? '+' : ''}${won(b.partner)}원`, b.partner >= 0 ? 'good' : 'bad');
    // 자유로운(바람둥이) 성격은 연애 중 이별 위험
    if (!trioStable && !married && per.breakup && Math.random() < per.breakup) {
      breakUp(0.5, 15);
      addNews(`💔 ${nm}님과 이별했습니다... (아는 사람으로 남아 다시 만날 수 있어요)`, 'bad');
      flashToast(`💔 ${nm}님과 이별...`, 'bad');
      b.breakup = true;
      queueImportantEvent({ type:'love', icon:'💔', title:`${nm}님과 갑작스러운 이별`, desc:'상대가 관계를 끝내겠다는 결정을 전했습니다.', detail:'전 연인으로 관계 기록에 남아 나중에 다시 만날 수 있습니다.', tone:'bad' });
    }
    if (!trioStable && !b.breakup && L.partner) {
      const incident = rollPartnerIncident(L, per);
      if (incident) {
        b.partnerIncident = incident;
        addNews(`⚡ ${nm}님과의 관계 사고: ${incident.text}${incident.cash < 0 ? ` · ${won(-incident.cash)}원 지출` : ''}`, 'bad');
        flashToast(`⚡ ${nm}님과 관계 갈등 발생`, 'bad');
        queueImportantEvent({ type:'love', icon:'⚡', title:`${nm}님과 관계 갈등`, desc:incident.text, detail:incident.cash < 0 ? `관계 문제로 ${won(-incident.cash)}원이 지출됐습니다.` : '친밀도와 행복 변화가 반영됐습니다.', tone:'bad' });
      }
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
      queueImportantEvent({
        type:'love', icon:b.scandal.forgiven ? '😰' : '😱', title:`${kind} 발각`,
        desc:b.scandal.forgiven ? `${partnerName}님이 이번 한 번만 관계를 이어가기로 했습니다.` : `${partnerName}님과의 관계가 끝났습니다.`,
        detail:b.scandal.settle ? `위자료·합의금 ${won(b.scandal.settle)}원${b.scandal.fired ? '과 직장 해고' : ''}이 반영됐습니다.` : `평판과 친밀도가 크게 하락했습니다${b.scandal.fired ? ' · 직장에서도 해고됐습니다' : ''}.`, tone:'bad'
      });
    }
  }

  // 5-2) 인간관계 유지 — 오래 안 만나면 사이가 식고, 가끔 근황이 들려온다
  updateRelationships(L);
  queueAvailableStories(L);
  if (updateObsession(L)) b.captivity = true;
  updateMoralityState(L);

  // 6) 행복 자연 감소
  L.happy = clamp(L.happy - LIFE.HAPPY_DECAY, 0, 100);

  if (info.month === 1 && S.day > 1) addNews(`🎂 생일! 만 ${info.age}세가 되었습니다`, 'good');
  if (b.salary > 0) addNews(`💼 월급 ${won(b.salary)}원 입금 (${job.name})`, 'good');
  else if (b.salary < 0) addNews(`📉 ${job.name} 적자 ${won(b.salary)}원`, 'bad');
  if (b.rent > 0) addNews(`🏠 월세 수입 ${won(b.rent)}원`, 'good');
  if (b.passive > 0) addNews(`💸 주식 외 자동수입 ${won(b.passive)}원 입금`, 'good');
  if (b.factionBiz) addNews(`🏢 세력 조직원 사업 수입 +${won(b.factionBiz)}원`, 'good');
  if (b.factionUpkeep) addNews(`👥 조직원 급여·운영비 -${won(b.factionUpkeep)}원`, 'neutral');
  if (b.lifeInterest > 0) addNews(`💳 개인 대출이자 ${won(b.lifeInterest)}원 (빚 ${won(L.loan)})`, 'bad');
  if (b.debtResult && b.debtResult.message) {
    addNews(b.debtResult.message, b.debtResult.collectionLevel >= 2 ? 'bad' : 'neutral');
    if (b.debtResult.collectionLevel >= 2) queueImportantEvent({ type:'debt', icon:b.debtResult.collectionLevel >= 3 ? '🦈' : '🚪', title:'채무 추심 단계 상승', desc:b.debtResult.message, detail:`현재 개인 대출 ${won(L.loan)}원 · 신용점수 ${Math.round(L.creditScore || 0)}점`, tone:'bad' });
  }
  if (b.incident) {
    const debtText = b.incident.debtAdded > 0 ? ` · 부족분 빚 +${won(b.incident.debtAdded)}원` : ' · 추가 빚 없음';
    addNews(`🚑 [${job.name}] ${b.incident.text} — 총비용 ${won(b.incident.cost)}원 · 현금 ${won(b.incident.cashPaid)}원 지출${debtText}`, 'bad');
    flashToast(`🚑 직업 사고 발생 · 마감 사건창을 확인하세요`, 'bad'); playSound('crash');
  }
  S._settle = b;
  // AI 라이벌 동향 — 각자 손익 + 서로 공격(bot-vs-bot) + 나에 대한 공격. 전용 피드에 모아 '라이벌 동향' 창으로 본다
  S.rivalFeed = S.rivalFeed || [];
  const rivalNews = [];
  RIVALS.settleBots(S.bots).forEach(t => rivalNews.push(t));
  RIVALS.botsFight(S.bots).forEach(t => rivalNews.push(t));
  const attack = RIVALS.defendAttack(L, RIVALS.attackPlayer(S.bots, Math.max(0, totalWealth())));
  if (attack) {
    if (!attack.caught && attack.loss > 0) {
      const cashLoss = Math.min(Math.max(0, S.capital), attack.loss);
      S.capital -= cashLoss;
      if (attack.loss > cashLoss) LOAN.addDebt(L, attack.loss - cashLoss, '라이벌 공작 피해채무');
      L.happy = clamp(L.happy - 5, 0, 100);
    }
    const defended=attack.caught||attack.blocked;
    rivalNews.push(`⚔️ [나 대상] ${attack.message}`);
    addNews(`⚔️ ${attack.message}`, defended ? 'good' : 'bad');
    flashToast(`⚔️ ${attack.message}`, defended ? 'good' : 'bad');
    queueImportantEvent({ type:'faction', scene:'./assets/life-faction-war.png', icon:defended?'🛡️':'⚔️', title:'라이벌이 나를 노렸습니다', desc:attack.message, detail:attack.caught ? '상대의 공작이 적발되어 직접 피해를 피했습니다.' : attack.blocked ? '내 세력이 공격을 포착하고 피해를 완전히 막았습니다.' : `직접 손실 ${won(attack.loss || 0)}원이 반영됐습니다.`, tone:defended ? 'good' : 'bad' });
  }
  rivalNews.forEach(t => S.rivalFeed.unshift({ day: S.day, text: t }));
  if (S.rivalFeed.length > 50) S.rivalFeed.length = 50;
  // 봇별 순자산 추이 기록 (라이벌 차트용)
  S.bots.forEach(b => { b.nwHist = b.nwHist || []; b.nwHist.push(Math.round(botNetWorth(b))); if (b.nwHist.length > 48) b.nwHist.shift(); });
  S._myNwHist = S._myNwHist || []; S._myNwHist.push(Math.round(netWorthClean())); if (S._myNwHist.length > 48) S._myNwHist.shift();
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
  b.died = !!healthResult.died;
  healthResult.news.forEach(text => {
    addNews(text, 'bad');
    queueImportantEvent({ type:'incident', icon:'🏥', title:'건강 상태에 변화가 생겼습니다', desc:text, detail:`현재 건강 ${Math.round(L.health)} · 스트레스 ${Math.round(L.stress)}`, tone:'bad' });
  });
  // 적성: 매달 조금씩 성장하고, 적합도에 따라 직업 만족도(행복)가 오르내린다
  if (APTITUDE && L.job !== 'none') {
    APTITUDE.grow(L, job);
    const m = APTITUDE.match(job, L);
    const satisfaction = Math.round((m - 55) / 22);   // 대략 -2 ~ +2
    if (satisfaction) L.happy = clamp(L.happy + satisfaction, 0, 100);
    b.aptMatch = m;
  }
  const careerResult = CAREER.monthly(L, job, { health:L.health, stress:L.stress });
  if (careerResult.promotion) {
    S.capital += careerResult.bonus;
    addNews(`🎉 ${job.name} ${careerResult.promotion} 승진 · 축하금 ${won(careerResult.bonus)}원`, 'good');
    flashToast(`🎉 ${careerResult.promotion} 승진!`, 'good'); celebrate();
    queueImportantEvent({ type:'job', icon:'🎉', title:`${careerResult.promotion} 승진`, desc:`${job.name}에서 경력과 능력을 인정받았습니다.`, detail:`축하금 ${won(careerResult.bonus)}원이 입금됐습니다.`, tone:'good' });
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
  if (familyResult.birth) {
    L.happy = clamp(L.happy + 20,0,100); celebrate({particleCount:180});
    queueImportantEvent({ type:'family', icon:'👶', title:'가족에게 새 식구가 생겼습니다', desc:familyResult.news.join(' ') || '오랫동안 기다린 아이가 가족이 되었습니다.', detail:'행복 +20 · 가족 관계와 양육비 정산이 시작됩니다.', tone:'good' });
  }
  const financeResult = LIFE_FINANCE.monthly(L, {
    age: info.age,
    income: Math.max(0, b.salary + b.rent + b.passive),
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
  monthlySocialMessages(L);
  const justiceResult=JUSTICE.monthly(L,SOCIAL.legalShield(L)+(L.legalShield||0)*.03);
  justiceResult.news.forEach(text=>{
    const good=text.includes('무죄')||text.includes('불기소');
    addNews(text,good?'good':'bad');
    if (['송치','불기소','기소','무죄','유죄'].some(keyword=>text.includes(keyword))) {
      queueImportantEvent({ type:'court', icon:'⚖️', title:good?'사법 절차에서 유리한 결과':'수사·재판 단계 변화', desc:text, detail:justiceResult.verdict ? '벌금과 형량 등 판결 결과가 즉시 반영됩니다.' : '인생 행동의 법정 항목에서 변호사와 전략을 확인하세요.', tone:good?'good':'bad' });
    }
  });
  if(justiceResult.verdict&&justiceResult.verdict.fine){const paid=Math.min(Math.max(0,S.capital),justiceResult.verdict.fine);S.capital-=paid;if(justiceResult.verdict.fine>paid)LOAN.addDebt(L,justiceResult.verdict.fine-paid,'형사 벌금 미납');}
  const layoffExempt = ['none','civil','teacher','doctor','nurse','lawyer','accountant','ceo','youtuber'];
  if (!layoffExempt.includes(job.id) && Math.random() < ECONOMY.layoffRisk(S.economy, job.risk)) {
    L.job = 'none'; CAREER.switchJob(L, 'none'); L.happy = clamp(L.happy-14,0,100);
    addNews(`📦 ${ECONOMY.phase(S.economy).name} 여파로 ${job.name}에서 해고됐습니다`, 'bad');
    flashToast('📦 경기 악화로 해고됐습니다', 'bad');
    queueImportantEvent({ type:'job', icon:'📦', title:`${job.name}에서 해고`, desc:`${ECONOMY.phase(S.economy).name} 여파로 회사가 고용을 줄였습니다.`, detail:'현재 직업은 무직으로 변경됐습니다. 다음 장마감 행동에서 이직에 도전할 수 있습니다.', tone:'bad' });
  }
  const economyResult = ECONOMY.monthly(S.economy);
  if (economyResult.rateDecision) {
    const rd = economyResult.rateDecision;
    const raising = rd.delta > 0;
    const action = raising ? '인상' : '인하';
    addNews(`🏦 기준금리 ${action}: ${rd.from.toFixed(2)}% → ${rd.to.toFixed(2)}%`, raising ? 'bad' : 'good');
    queueImportantEvent({ type:'property', icon:'🏦', title:`기준금리 ${action} · ${rd.from.toFixed(2)}% → ${rd.to.toFixed(2)}%`, desc:rd.reason,
      detail:raising ? '대출 이자가 늘고 장기채 가격에는 하락 압력이 생깁니다. 금도 높은 금리에는 약해질 수 있지만, 물가와 위기가 크면 반대로 오를 수 있습니다.' : '대출 부담이 낮아지고 장기채 가격에는 상승 압력이 생깁니다. 달러는 약해질 수 있고 위험자산에는 우호적인 환경이 될 수 있습니다.', tone:raising?'bad':'good' });
  }
  if (economyResult.changed) {
    addNews(`${economyResult.changed.to.icon} 경제 국면 전환: ${economyResult.changed.from.name} → ${economyResult.changed.to.name}`, economyResult.changed.to.market>=0?'good':'bad');
    flashToast(`${economyResult.changed.to.icon} ${economyResult.changed.to.name} 진입`, economyResult.changed.to.market>=0?'good':'bad');
    queueImportantEvent({ type:'property', icon:economyResult.changed.to.icon, title:`경제 국면: ${economyResult.changed.to.name}`, desc:`${economyResult.changed.from.name}에서 ${economyResult.changed.to.name}(으)로 시장 환경이 바뀌었습니다.`, detail:'주가·월급·부동산·대출 금리에 앞으로 영향을 줍니다.', tone:economyResult.changed.to.market>=0?'good':'bad' });
  }
  LEGACY.monthly(L,{age:info.age,month:info.month,job:L.job,jobName:jobOf().name,children:L.children.length,record:L.criminalRecord||0,wealth:totalWealth(),relationship:L.relationship});
  b.debtGameOver = !!(b.debtResult && b.debtResult.gameOver);
  if (healthResult.died) setTimeout(() => showDeathScreen(info.age), 700);
  else if (b.debtGameOver) setTimeout(showDebtGameOver, 500);
}

/* ---- 출신 배경 / 학창생활 / 직업 ---- */
const FAMILY_BACKGROUNDS=(ORIGIN&&ORIGIN.FAMILY_BACKGROUNDS)||[];
const SCHOOL_LIVES=(ORIGIN&&ORIGIN.SCHOOL_LIVES)||[];
const CORE_JOB_IDS=(ORIGIN&&ORIGIN.CORE_JOB_IDS)||D.JOBS.map(j=>j.id);

function startLifeSetup(){
  if(!S.life.familyBackground)showFamilyBackgroundModal();
  else if(!S.life.schoolLife)showSchoolLifeModal();
  else assignStartingCareer();
}
function showFamilyBackgroundModal(){
  const host=$('life-modal');if(!host)return;host.style.display='flex';host.className='life-modal-host';
  host.innerHTML=`<div class="window life-window"><div class="title-bar life-bar"><div class="title-bar-text">🏠 인생 시작 1/2 · 어떤 집에서 자랐을까?</div></div><div class="window-body"><img class="life-scene-banner" src="./assets/life-origin-family.png" alt="어린 시절 가족과 함께 보낸 생활의 기억"><p class="life-intro">부모님의 생활과 직업은 초기 신용·자금·적성뿐 아니라 <b>실제로 연락할 수 있는 가족</b>과 첫 취업 경로를 만듭니다.</p><div class="event-options">${FAMILY_BACKGROUNDS.map(v=>`<button class="event-opt origin-choice" data-family-bg="${v.id}"><b>${v.icon} ${v.name}</b><span>${v.desc}</span><small>${v.result}</small></button>`).join('')}</div></div></div>`;
  host.querySelectorAll('[data-family-bg]').forEach(b=>b.addEventListener('click',()=>chooseFamilyBackground(b.dataset.familyBg)));
}
function boostOriginAptitude(effects){
  if(!APTITUDE||!effects)return;const apt=APTITUDE.ensure(S.life);
  Object.entries(effects).forEach(([key,value])=>{apt[key]=clamp((apt[key]||45)+value,0,100);});
}
function applyOriginStats(origin){
  const L=S.life;L.charm=(L.charm||0)+(origin.charm||0);L.fitness=(L.fitness||0)+(origin.fitness||0);
  S.capital=Math.max(0,S.capital+(origin.cash||0));L.creditScore=clamp((L.creditScore||720)+(origin.credit||0),300,950);
  const career=CAREER.ensure(L);career.skill=clamp(career.skill+(origin.skill||0),0,100);
  const social=SOCIAL.ensure(L);social.reputation=clamp(social.reputation+(origin.reputation||0),0,100);
  boostOriginAptitude(origin.aptitude);
}
function chooseFamilyBackground(id){
  const bg=ORIGIN&&ORIGIN.family(id);if(!bg)return;const L=S.life;L.familyBackground=id;applyOriginStats(bg);
  bg.contacts.forEach((spec,index)=>{const c=SOCIAL.addContact(L,{...spec,origin:'family',originKey:`family-${index}`,relationLabel:spec.role==='guardian'?'보호자':'가족',trust:62,favor:1});pushPersonMessage(L,c,SOCIAL.contactLine(c),false);});
  addNews(`${bg.icon} 가정환경 · ${bg.name}`,'neutral');autoSave();showSchoolLifeModal();
}
function showSchoolLifeModal(){
  const host=$('life-modal');if(!host)return;host.style.display='flex';host.className='life-modal-host';
  const bg=ORIGIN&&ORIGIN.family(S.life.familyBackground);
  host.innerHTML=`<div class="window life-window"><div class="title-bar life-bar"><div class="title-bar-text">🎒 인생 시작 2/2 · 학창시절은 어땠을까?</div></div><div class="window-body"><img class="life-scene-banner" src="./assets/life-origin-school.png" alt="방과 후 여러 동아리와 친구 사이에서 진로를 고민하는 장면"><div class="origin-selected">${bg?`${bg.icon} ${bg.name}에서 자랐습니다.`:''}</div><p class="life-intro">학창시절 선택이 강점과 취업 후보를 좁히고, 졸업 뒤에도 연락하는 친구 한 명을 만듭니다. 첫 직업은 두 이력 안에서 자동으로 정해집니다.</p><div class="event-options">${SCHOOL_LIVES.map(v=>`<button class="event-opt origin-choice" data-school-life="${v.id}"><b>${v.icon} ${v.name}</b><span>${v.desc}</span><small>${v.result}</small></button>`).join('')}</div></div></div>`;
  host.querySelectorAll('[data-school-life]').forEach(b=>b.addEventListener('click',()=>chooseSchoolLife(b.dataset.schoolLife)));
}
function chooseSchoolLife(id){
  const school=ORIGIN&&ORIGIN.school(id);if(!school)return;const L=S.life;L.schoolLife=id;applyOriginStats(school);
  const friendName=pick(school.friends),friend=SOCIAL.addContact(L,{name:friendName,role:'schoolfriend',origin:'school',originKey:'school-best-friend',relationLabel:school.friendTag,trust:48,favor:1,schoolTag:school.friendTag});
  pushPersonMessage(L,friend,`${school.friendTag} ${friendName}이(가) 졸업 후 오랜만에 연락했습니다. “${SOCIAL.contactLine(friend)}”`,false);
  addNews(`${school.icon} 학창생활 · ${school.name}`,'neutral');autoSave();assignStartingCareer();
}
function originCareerCandidates(){
  const bg=ORIGIN&&ORIGIN.family(S.life.familyBackground),school=ORIGIN&&ORIGIN.school(S.life.schoolLife),weighted=[];
  (bg&&bg.jobs||[]).forEach(id=>weighted.push(id));
  (school&&school.jobs||[]).forEach(id=>{weighted.push(id,id,id);});
  const jobs=weighted.filter(id=>CORE_JOB_IDS.includes(id)&&D.JOBS.some(j=>j.id===id));
  if(APTITUDE)D.JOBS.filter(j=>jobs.includes(j.id)&&APTITUDE.match(j,S.life)>=68).forEach(j=>jobs.push(j.id));
  return jobs.length?jobs:['office'];
}
function assignStartingCareer(){
  const L=S.life;if(L.started)return;
  const pool=originCareerCandidates();L.firstCareerPool=[...new Set(pool)];const id=pick(pool),job=D.JOBS.find(j=>j.id===id)||D.JOBS.find(j=>j.id==='office');
  L.job=job.id;L.lifeView='origin';CAREER.switchJob(L,job.id);L.started=true;
  const bg=ORIGIN&&ORIGIN.family(L.familyBackground),school=ORIGIN&&ORIGIN.school(L.schoolLife),social=SOCIAL.ensure(L);
  const contacts=social.contacts.filter(c=>c.origin).map(c=>`${SOCIAL.role(c).icon} ${c.name}`).join(' · ');
  const host=$('life-modal');host.style.display='flex';host.className='life-modal-host';
  host.innerHTML=`<div class="window life-window"><div class="title-bar life-bar"><div class="title-bar-text">💼 첫 취업 결과</div></div><div class="window-body"><img class="life-scene-banner" src="./assets/life-career.png" alt="첫 직장에 출근하는 장면"><div class="origin-timeline"><div>${bg.icon}<b>${bg.name}</b></div><i>→</i><div>${school.icon}<b>${school.name}</b></div><i>→</i><div>${job.emoji}<b>${job.name}</b></div></div><div class="event-title">첫 직업은 ${job.name}입니다.</div><div class="event-desc">가정환경과 학창생활에서 만들어진 ${L.firstCareerPool.length}개 진로 중 하나로 취업했습니다. 앞으로 이직도 주요 인물들과 같은 생활권에 있는 핵심 직군을 중심으로 이루어집니다.</div><div class="important-event-detail">저장된 연락처 · ${contacts}</div><button id="origin-start" class="session-btn opening">이 인생으로 시작</button></div></div>`;
  addNews(`💼 ${job.name}(으)로 사회생활 시작 · ${bg.name} / ${school.name}`,'good');
  $('origin-start').addEventListener('click',()=>{closeLifeModal();celebrate();checkAchievements();renderMarketPhase();renderAll();autoSave();});
  autoSave();
}
// 이직 합격 확률(%) — 목표 난이도 vs 현재 경력 + 적성 적합도
function jobHireChance(target) {
  const cur = jobOf();
  let base = 85 - (target.difficulty || 0) + (cur.difficulty || 0) * 0.4;
  if (APTITUDE) base += (APTITUDE.match(target, S.life) - 55) * 0.4;   // 적성이 맞으면 서류·면접 유리
  const c = CAREER.ensure(S.life);
  base += (c.skill - 20) * 0.15;   // 쌓은 직무능력도 반영
  return Math.round(clamp(base, 3, 97));
}

function showJobModal(isChange) {
  const host = $('life-modal'); if (!host) return;
  host.className = 'life-modal-host';
  const focusedJobs=D.JOBS.filter(j=>CORE_JOB_IDS.includes(j.id)||j.id===S.life.job);
  const rows = focusedJobs.map(j => {
    const extra = isChange
      ? (j.id === S.life.job ? '<span class="risk-tag">현재 직업</span>' : `<span class="risk-tag">합격 ${jobHireChance(j)}%</span>`)
      : `<span class="risk-tag">${jobRiskTier(j).icon}${jobRiskTier(j).label}</span>`;
    // 적성 적합도 배지 + 요구 적성 축
    let aptTag = '';
    if (APTITUDE && (j.apt || []).length) {
      const m = APTITUDE.match(j, S.life), t = APTITUDE.matchTier(m);
      const axes = j.apt.map(k => { const a = APTITUDE.axis(k); return a ? a.icon : ''; }).join('');
      aptTag = `<span class="apt-tag ${t.mood}">${t.icon} ${t.label} ${m}% <span class="muted">${axes}</span></span>`;
    }
    return `<li class="job-row" data-id="${j.id}">
       <span class="job-emoji">${j.emoji}</span>
       <span class="job-main"><strong>${j.name}</strong> ${extra} ${aptTag}<br><span class="muted">${j.desc}</span></span>
       <span class="job-sal">${jobIncomeLabel(j)}</span>
     </li>`;
  }).join('');
  host.style.display = 'block';
  host.innerHTML =
    `<div class="window life-window">
       <div class="title-bar life-bar"><div class="title-bar-text">${isChange ? '💼 이직 도전' : '🎬 첫 취업 결과'}</div>
         ${isChange ? '<div class="title-bar-controls"><button aria-label="Close" id="job-x"></button></div>' : ''}</div>
       <div class="window-body">
         <img class="life-scene-banner" src="./assets/life-career.png" alt="직업 면접 장면">
         <p class="life-intro">${isChange ? '주요 인물들의 직장·업계와 실제로 연결되는 핵심 직군만 표시됩니다. 지원하면 <b>합격 확률</b>로 성패가 갈립니다.' : '첫 직업은 가정환경과 학창생활에 따라 자동으로 정해집니다.'}</p>
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
  markMonthAction('경력');
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
      <img class="life-scene-banner" src="./assets/life-debt-crisis.png" alt="불법 사채 추심업자와 대면한 장면">
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
  const taesik=rememberPerson(Object.assign({},D.SPECIAL_CHARACTERS.taesik),'friend');taesik.affection=Math.max(18,taesik.affection||0);taesik.trust=Math.max(0,taesik.trust||0);
  LEGACY.push(L,dateInfo(S.day).age,'🔥','장태식의 제안을 받아 막장 인생을 시작했다','justice');closeLifeModal();addNews('🔥 막장 인생 루트 시작 · 현금 3천만원, 사채 1억5천만원, 전과 1범','bad');flashToast('🔥 막장 인생이 시작됐습니다','bad');renderAll();renderMarketPhase();autoSave();
}

function showTutorial() {
  if (seraLoopActive()) { showSeraLoopTutorial(); return; }
  const host = $('life-modal'); if (!host) return;
  host.className = 'life-modal-host';
  const n = D.SPECIAL_CHARACTERS.narae;
  host.style.display = 'flex';
  host.innerHTML =
    `<div class="window event-window legacy-window tutorial-choice-window">
       <div class="title-bar"><div class="title-bar-text">🧭 나래와의 첫 만남</div></div>
       <div class="window-body">
         <img class="life-scene-banner guide-scene-banner" src="./assets/life-guide.png" alt="나래가 게임을 안내하는 장면">
         <div class="date-profile"><img class="char-portrait" src="${characterPortrait(n,'happy')}" alt="나래">
           <div class="dp-info"><strong>나래</strong> · 투자교육 매니저<br><span class="muted">“처음 오셨죠? 장을 열기 전에 제가 게임 진행 방법을 설명해드릴까요?”</span></div></div>
         <div class="event-desc">설명을 듣거나 바로 출신 배경을 정할 수 있습니다. 부모님의 생활과 학창시절이 적성·인맥·첫 직업을 만들고, 부모님과 친구도 실제 연락처에 남습니다.</div>
         <div class="event-options">
           <button id="tutorial-listen" class="event-opt">📖 네, 설명을 들을게요</button>
           <button id="tutorial-skip" class="event-opt">🏠 괜찮아요, 바로 성장 배경을 정할게요</button>
         </div>
       </div>
     </div>`;
  const choose = listen => {
    S.life.tutorialSeen = true;
    S.life.tutorialMet = true;
    autoSave();
    if (listen) startNaraeTutorial();
    else startLifeSetup();
  };
  $('tutorial-listen').addEventListener('click', () => choose(true));
  $('tutorial-skip').addEventListener('click', () => choose(false));
}

function ensureSeraLoopPartner() {
  const L = S.life;
  if (!L || !seraLoopActive()) return null;
  const sera = Object.assign({}, D.SPECIAL_CHARACTERS.sera);
  const rec = rememberPerson(sera, 'partner');
  rec.status = 'partner';
  rec.affection = Math.max(72, rec.affection || 0);
  rec.trust = Math.max(25, rec.trust || 0);
  rec.obsession = Math.max(88, rec.obsession || 0);
  rec.yandere = true;
  L.partner = sera;
  L.relationship = 'dating';
  L.affection = Math.max(72, L.affection || 0);
  L.seraLoop = Object.assign({}, readSeraLoop(), { active:true });
  if (!Number.isFinite(L.seraLoop.grace)) L.seraLoop.grace = 6;
  if (!L.seraLoop.greeted) {
    L.seraLoop.greeted = true;
    pushPersonMessage(L, rec, '이번에는 시작부터 같이 있네요. 이제 제가 하나씩 알려줄게요.', false);
  }
  return rec;
}

function showSeraLoopTutorial() {
  const host = $('life-modal'); if (!host) return;
  const sera = D.SPECIAL_CHARACTERS.sera;
  ensureSeraLoopPartner();
  host.className = 'life-modal-host sera-loop-host';
  host.style.display = 'flex';
  host.innerHTML =
    `<div class="window event-window legacy-window tutorial-choice-window sera-loop-window">
       <div class="title-bar"><div class="title-bar-text">🖤 윤세라와의 새 시작</div></div>
       <div class="window-body">
         <img class="life-scene-banner guide-scene-banner" src="./assets/event-sera-doorstep.png" alt="새 인생의 시작부터 기다리고 있는 윤세라">
         <div class="date-profile"><img class="char-portrait" src="${characterPortrait(sera,'happy')}" alt="윤세라">
           <div class="dp-info"><strong>윤세라</strong> · 당신의 연인<br><span class="down">“새 인생이라면서요. 그런데 왜 저한테는 말 안 했어요?”</span></div></div>
         <div class="event-title">튜토리얼 안내자가 윤세라로 바뀌었습니다.</div>
         <div class="event-desc">이전 감금엔딩의 기억이 저장 슬롯 밖에 남아 있습니다. 어떤 성장 배경을 선택해도 세라는 처음부터 연인과 연락처에 포함됩니다. 메뉴의 <b>전체 초기화</b>만 이 잔류 루프를 지울 수 있습니다.</div>
         <div class="event-options">
           <button id="sera-tutorial-listen" class="event-opt hot">🖤 세라에게 설명을 듣는다</button>
           <button id="sera-tutorial-skip" class="event-opt">🏠 설명 없이 성장 배경을 정한다</button>
         </div>
       </div>
     </div>`;
  const choose = listen => {
    ensureSeraLoopPartner();
    S.life.tutorialSeen = true;
    autoSave();
    if (listen) startNaraeTutorial();
    else startLifeSetup();
  };
  $('sera-tutorial-listen').addEventListener('click', () => choose(true));
  $('sera-tutorial-skip').addEventListener('click', () => choose(false));
}

const NARAE_TUTORIAL_STEPS = [
  { target:'#session-btn', title:'한 달의 시작과 끝', text:'이 버튼으로 장을 열면 한 달이 시작돼요. 장중에는 매매하고, 시간이 끝나거나 다시 누르면 장마감 정산으로 넘어갑니다.' },
  { target:'#session-bar', title:'남은 거래 시간', text:'여기서 이번 달 장의 진행률과 남은 틱·예상 시간을 확인해요. 틱은 주가가 한 번 갱신되는 짧은 거래 단위예요.' },
  { target:'#stock-list', title:'종목과 현재가', text:'종목을 누르면 차트가 바뀝니다. 현재가는 지금 한 주를 사고팔 수 있는 가격이고, 등락률은 이전 기준 가격보다 얼마나 움직였는지를 뜻해요.' },
  { target:'#price-chart', title:'라인·캔들 차트', text:'라인은 가격 흐름을 단순하게, 캔들은 시가·고가·저가·종가를 보여줘요. 캔들 하나만 보고 추격하기보다 여러 구간의 추세를 같이 보세요.' },
  { target:'#pos-pnl', title:'평단가와 평가손익', text:'평단가는 내가 산 주식의 평균 가격이에요. 평가손익은 아직 팔지 않은 손익, 실현손익은 실제로 매도해 확정된 손익입니다.' },
  { target:'#buy-btn', title:'매수·매도·공매도', text:'매수는 주식을 사는 것, 매도는 보유 주식을 파는 것이에요. 보유량 없이 매도하면 하락에 베팅하는 공매도가 되므로 손실이 크게 날 수 있어요.' },
  { target:'#leverage-select', title:'신용 레버리지', text:'레버리지는 빚을 섞어 투자 규모를 키우는 기능이에요. 수익도 커지지만 손실·이자·반대매매 위험도 같은 배율로 커집니다. ETF의 2배·인버스와는 별개예요.' },
  { target:'[data-tab="news"]', title:'뉴스와 기업 공시', text:'뉴스의 기업명을 누르면 해당 기업 리포트와 차트로 이동할 수 있어요. 호재는 긍정적 재료, 악재는 부정적 재료지만 가격이 반드시 같은 방향으로 움직인다는 보장은 없어요.' },
  { target:'[data-tab="life"]', title:'장마감 후 인생 행동', text:'마감 뒤에는 자유시간 3회로 데이트·경력·인맥·가족 행동을 선택해요. 월급·빚·부동산도 함께 정산됩니다. 이제 직업을 정하면 시작할 수 있어요!' },
];

function clearTutorialFocus() {
  document.querySelectorAll('.tutorial-focus').forEach(el => el.classList.remove('tutorial-focus'));
}

function startNaraeTutorial() {
  S._tutorialStep = 0;
  const host = $('life-modal'); if (!host) return;
  host.className = 'tutorial-coach-host';
  host.style.display = 'block';
  renderNaraeTutorialStep();
}

function renderNaraeTutorialStep() {
  const host = $('life-modal'); if (!host) return;
  clearTutorialFocus();
  const index = clamp(S._tutorialStep || 0, 0, NARAE_TUTORIAL_STEPS.length - 1);
  S._tutorialStep = index;
  const step = NARAE_TUTORIAL_STEPS[index];
  const target = document.querySelector(step.target);
  if (target) {
    target.classList.add('tutorial-focus');
    target.scrollIntoView({ behavior:'smooth', block:'center', inline:'nearest' });
  }
  const loop = seraLoopActive();
  const n = loop ? D.SPECIAL_CHARACTERS.sera : D.SPECIAL_CHARACTERS.narae;
  const guideName = loop ? '윤세라' : '나래';
  const guideIcon = loop ? '🖤' : '🧭';
  const guideText = loop ? `${step.text} 이번에는 제가 보고 있으니까 놓치면 안 돼요.` : step.text;
  host.innerHTML =
    `<div class="window tutorial-coach-window">
       <div class="title-bar"><div class="title-bar-text">${guideIcon} ${guideName}의 화면 안내 · ${index + 1}/${NARAE_TUTORIAL_STEPS.length}</div></div>
       <div class="window-body">
         <div class="tutorial-coach-talk"><img class="char-thumb" src="${characterPortrait(n,'happy')}" alt="${guideName}"><div><strong>${step.title}</strong><p>“${guideText}”</p></div></div>
         <div class="tutorial-coach-actions">
           <button id="tutorial-tour-skip">설명 건너뛰기</button>
           <button id="tutorial-tour-prev" ${index === 0 ? 'disabled' : ''}>이전</button>
           <button id="tutorial-tour-next" class="session-btn opening">${index === NARAE_TUTORIAL_STEPS.length - 1 ? '성장 배경 정하기' : '다음'}</button>
         </div>
       </div>
     </div>`;
  $('tutorial-tour-skip').addEventListener('click', finishNaraeTutorial);
  $('tutorial-tour-prev').addEventListener('click', () => { S._tutorialStep--; renderNaraeTutorialStep(); });
  $('tutorial-tour-next').addEventListener('click', () => {
    if (S._tutorialStep >= NARAE_TUTORIAL_STEPS.length - 1) finishNaraeTutorial();
    else { S._tutorialStep++; renderNaraeTutorialStep(); }
  });
}

function finishNaraeTutorial() {
  clearTutorialFocus();
  S._tutorialStep = null;
  const host = $('life-modal');
  if (host) { host.className = 'life-modal-host'; host.style.display = 'none'; host.innerHTML = ''; }
  ensureSeraLoopPartner();
  startLifeSetup();
  autoSave();
}

// 언제든 열 수 있는 종합 게임 가이드
function showGameGuide(fromStart = false) {
  const host = $('life-modal'); if (!host) return;
  S._guideForStart = fromStart === true;
  const sec = (icon, title, body) => `<details class="guide-sec"><summary>${icon} ${title}</summary><div class="guide-inner">${body}</div></details>`;
  const body =
    sec('⏱', '기본 흐름 — 한 달이 한 판', `
      • <b>🔔 장 열림 = 한 달</b>. 개장하면 20틱 동안 장이 돌고, 위쪽 <b>진행 바</b>로 남은 시간을 볼 수 있어요.<br>
      • 시간이 다 되면 자동 <b>장 마감</b>(또는 버튼으로 조기 마감) → <b>마감 리포트</b>에서 뉴스 보고 인생 행동을 합니다.<br>
      • 장중엔 거래에 집중, 마감 뒤엔 취미·연애·인맥·부동산 등 인생을 꾸리세요. 나이는 12개월마다 한 살씩 듭니다.`) +
    sec('💱', '주문·차트 — 거래의 핵심', `
      • <b>매수/매도</b>는 수량 또는 <b>금액</b>으로 주문(금액 넣으면 수량 자동 계산). 마감 중엔 <b>예약주문</b>이 됩니다.<br>
      • 보유분 없이 매도하면 <b>공매도(숏)</b> — 하락하면 이익.<br>
      • 차트엔 <b>내 평단가</b>(주황 점선)·<b>최고가</b>(빨강)·<b>최저가</b>(파랑) 기준선과 위쪽 시세 스트립(현재가·수익률)이 표시됩니다.<br>
      • <b>⚡ 신용 레버리지</b>(2~5배)로 매수여력을 늘릴 수 있지만, 하락 시 <b>반대매매</b> 위험이 있어요.`) +
    sec('📊', 'ETF — 레버리지·인버스', `
      • 개별 종목 말고 <b>시장 지수를 배율로 추종</b>하는 상품입니다.<br>
      • <b>레버리지 2x</b>(지수의 2배로 상승/하락), <b>인버스</b>(지수와 반대), <b>곱버스 2x인버스</b>(반대로 2배).<br>
      • 가격이 너무 낮아지면 실제처럼 <b>액면병합</b>돼 정상 가격대로 되돌아갑니다.`) +
    sec('📚', '주식 용어 사전', `
      <div class="guide-glossary">
        <div><b>현재가</b><span>지금 시장에서 거래되는 한 주의 가격</span></div>
        <div><b>시가·고가·저가·종가</b><span>해당 구간의 시작·최고·최저·마지막 가격</span></div>
        <div><b>평단가</b><span>여러 번 나눠 산 주식의 평균 매입 가격</span></div>
        <div><b>평가손익</b><span>아직 팔지 않은 보유 주식의 잠정 손익</span></div>
        <div><b>실현손익</b><span>매도하여 실제로 확정된 손익</span></div>
        <div><b>거래량</b><span>해당 기간에 거래된 주식 수량</span></div>
        <div><b>시가총액</b><span>주가와 전체 주식 수를 곱한 기업의 시장 가치</span></div>
        <div><b>호재·악재</b><span>가격에 긍정적·부정적 영향을 줄 가능성이 있는 재료</span></div>
        <div><b>상한가·하한가</b><span>한 달 장에서 오르거나 내릴 수 있는 가격 제한</span></div>
        <div><b>공매도</b><span>주식을 빌려 먼저 판 뒤 낮은 가격에 갚아 하락 수익을 노리는 거래</span></div>
        <div><b>레버리지</b><span>빚이나 파생 구조로 가격 변동과 투자 규모를 확대하는 방식</span></div>
        <div><b>인버스·곱버스</b><span>지수와 반대로, 또는 반대 방향의 두 배로 움직이는 ETF</span></div>
        <div><b>반대매매</b><span>담보가 부족해질 때 보유 자산이 강제로 처분되는 것</span></div>
        <div><b>ETF</b><span>여러 자산이나 지수를 하나의 종목처럼 거래하는 상품</span></div>
        <div><b>기준금리</b><span>중앙은행이 정하는 경제의 기준 이자율. 대출·예금·채권·주식에 폭넓게 영향을 줍니다.</span></div>
        <div><b>물가상승률</b><span>상품과 서비스의 전반적인 가격이 얼마나 올랐는지 나타내는 비율</span></div>
        <div><b>채권 가격</b><span>새 채권의 금리가 오르면 기존 채권의 매력이 낮아져 가격은 보통 하락합니다.</span></div>
        <div><b>금</b><span>물가 상승이나 위기 때 선호되기도 하지만, 이자를 주지 않아 높은 금리에는 불리할 수 있습니다.</span></div>
        <div><b>달러</b><span>위기나 미국 금리 상승 때 강해지는 경우가 많지만 경제 상황에 따라 달라집니다.</span></div>
      </div>`) +
    sec('🏦', '금리·금·채권·달러', `
      🔹 종목의 <b>금·채권·달러</b> 분류에서 세 경제자산을 직접 거래할 수 있습니다.<br>
      🔹 기준금리 결정은 월말 중요 이벤트로 표시되고, 마감 리포트에서 현재 금리와 물가를 확인할 수 있습니다.<br>
      🔹 게임은 학습을 위해 대표 관계를 단순화했습니다. 실제 가격은 정책 기대, 환율, 수급 등 여러 변수 때문에 다르게 움직일 수 있습니다.`) +
    sec('📈', '뉴스·기업·파산', `
      • 뉴스에 뜬 <b>기업을 클릭</b>하면 재무·토론방이 담긴 <b>기업 리포트</b>가 열리고, '거래하기'로 그 차트로 이동합니다.<br>
      • 큰 사건은 <b>긴급속보</b>로 뜨고 전문가들이 엇갈린 전망을 냅니다(참고만!).<br>
      • 소형주는 <b>상장폐지(파산)</b> 위험이 있고, 폐지되면 <b>사유 팝업</b>이 뜹니다. 보유분은 휴지조각이 돼요.`) +
    sec('💼', '직업·경력·이직', `
      • 시작 시 <b>직업</b>을 고르면 매달 <b>월급</b>이 들어옵니다. 고소득 직업일수록 <b>사고 리스크</b>(→빚)가 큽니다.<br>
      • <b>이직</b>은 직업마다 <b>합격 확률</b>이 다르고(현재 경력 vs 목표 난이도), 성공/실패로 갈립니다.<br>
      • 직무교육·자격증으로 능력을 키우면 <b>승진</b>과 이직에 유리합니다.`) +
    sec('💘', '연애·결혼', `
      • <b>외출 장소</b>(번화가·사내·취미·클럽·조건부 특별 장소)마다 첫 조우하는 사람이 달라요. 첫 만남만으로 바로 연인이 되지는 않습니다.<br>
      • 장 마감 뒤 연락에 답하고 우연한 재회·친분 외출을 거쳐 <b>호감 15 · 신뢰 8 · 교류 3회 · 1개월</b>을 채우면 정식 데이트가 열립니다.<br>
      • 고백은 <b>호감 60 · 신뢰 18 · 정식 데이트 3회 · 3개월</b> 뒤 가능하며, 성격에 따라 상대가 먼저 고백하기도 합니다.<br>
      • 강유진·한채린·윤세라는 각각 <b>과잉보호·지배욕·집착</b>이라는 전용 위험 수치와 단계별 사건을 가집니다. 다른 인물에게는 집착 수치가 없습니다.<br>
      • 연애 중 새 사람을 만나면 <b>양다리</b>가 되고, 걸리면 이별·위자료·해고 위험!<br>
      • <b>이별/이혼</b>은 성격에 따라 순탄하거나 파국이 되며, 헤어진 상대는 <b>전 연인</b>으로 남아 <b>재회</b>를 노릴 수 있어요.`) +
    sec('🤝', '인맥', `
      • <b>업계 모임</b>으로 인맥(선배·은행원·변호사·기자 등)을 만들고, <b>만나기</b>로 신뢰를 쌓아요.<br>
      • 신뢰 30·호의 1이 쌓이면 <b>부탁</b>으로 역할별 혜택을 받습니다 — 경력 조언·신용 개선·법적 방패·평판 등.`) +
    sec('⚖️', '라이벌·재판', `
      • <b>AI 라이벌</b> 7명과 순자산 경쟁 — 랭킹 탭에서 <b>순자산 경쟁 차트</b>·라이벌 동향(서로 공격·손익·수감)·봇 보유 종목을 볼 수 있어요.<br>
      • 나도 라이벌에게 <b>경쟁 행동</b>(합법 분석/영입, 불법 음해/시세조작)을 할 수 있지만, 불법은 <b>수사→재판</b>으로 이어집니다.<br>
      • 재판은 <b>수사→기소→재판</b> 단계로 진행 — 변호사를 선임하고 재판 단계에서 <b>전략</b>을 고르면 무죄·감형 확률이 오릅니다.`) +
    sec('🏠', '인생 경영', `
      • <b>부동산</b> 매입 → 월세·시세차익. <b>취미</b>로 행복·매력을 올리고, <b>대출/사채</b>로 자금을 융통(사채는 위험!).<br>
      • <b>보험·연금·세금</b>이 매달 정산되고, <b>결혼</b> 후엔 <b>출산·입양</b>으로 자녀를 키웁니다(교육·유대).<br>
      • 사망하면 <b>자녀에게 세대 계승</b>이 가능하고, 모든 진행은 자동 저장됩니다.`);
  host.style.display = 'flex';
  host.innerHTML =
    `<div class="window event-window guide-window">
       <div class="title-bar life-bar"><div class="title-bar-text">📖 QuickTrade Life 게임 가이드</div>
         <div class="title-bar-controls"><button aria-label="Close" id="guide-x"></button></div></div>
       <div class="window-body guide-body">
         <img class="life-scene-banner guide-scene-banner" src="./assets/life-guide.png" alt="투자교육 매니저가 게임을 안내하는 장면">
         <p class="guide-intro">각 항목을 눌러 펼쳐 보세요. 언제든 상단 <b>📖 도움말</b>로 다시 열 수 있어요.</p>
         ${body}
         <button id="guide-close" class="session-btn opening">닫기</button>
       </div>
     </div>`;
  const x = $('guide-x'); if (x) x.addEventListener('click', closeGuide);
  const c = $('guide-close'); if (c) c.addEventListener('click', closeGuide);
}
function closeGuide() {
  const needJob = S._guideForStart || (S.life && !S.life.started);
  S._guideForStart = false;
  const h = $('life-modal'); if (h) { h.style.display = 'none'; h.innerHTML = ''; }
  if (needJob) startLifeSetup();
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
      <img class="life-scene-banner legacy-scene-banner" src="./assets/life-legacy.png" alt="한 세대의 삶을 마치고 다음 세대로 이어지는 장면">
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
  startLifeSetup();
  flashToast(`🌳 ${nextGeneration}대 시작 · 상속 ${won(inherited)}원`, 'good');
}

/* ---- 선택지 이벤트 (직업/연애/빚/일상) ---- */
const EVENT_CAT = { job: '직업', love: '연애', debt: '빚', life: '일상', family: '자녀·가족' };
const LIFE_SCENE_IMAGES = {
  job: './assets/life-career.png',
  love: './assets/life-relationship-conflict.png',
  debt: './assets/life-property.png',
  life: './assets/life-network.png',
  family: './assets/life-family-turning-point.png',
  faction: './assets/life-faction-war.png',
  incident: './assets/life-incident.png',
  property: './assets/life-property.png',
  court: './assets/life-court.png',
  network: './assets/life-network.png',
};
function lifeSceneImage(key) { return LIFE_SCENE_IMAGES[key] || LIFE_SCENE_IMAGES.life; }
function queueImportantEvent(event) {
  S._importantEvents = S._importantEvents || [];
  if (S._importantEvents.length < 10) S._importantEvents.push(event);
}

function showNextImportantEvent() {
  const queue = S._importantEvents || [];
  const event = queue.shift();
  if (!event) { maybeLifeEvent(); return; }
  if (event.dangerousTrioStart) { startDangerousTrioRoute(true); return; }
  if (event.dangerousTrioChapter) { showDangerousTrioStory(); return; }
  if (event.dangerousTrioAftermath) { showDangerousTrioAftermath(); return; }
  if (event.monthlyMessage) { showMonthlyMessagePopup(event); return; }
  if (event.bondEncounter) { showBondEncounter(event); return; }
  if (event.dangerousHeroineEvent) { showDangerousHeroineEvent(event.dangerousHeroineEvent); return; }
  if (event.crossEventId) { showCrossCharacterEvent(event.crossEventId); return; }
  if (event.story && event.personName) {
    const rec = metRecord(S.life, event.personName);
    if (rec && STORIES.get(event.personName) && STORIES.next(rec)) { S._storyFromQueue = true; showCharacterStory(event.personName); return; }
  }
  const host = $('life-event'); if (!host) return;
  const tone = event.tone === 'good' ? 'up' : event.tone === 'bad' ? 'down' : '';
  host.style.display = 'block';
  host.innerHTML =
    `<div class="window event-window important-event-window">
       <div class="title-bar event-bar"><div class="title-bar-text">${event.icon || '❗'} 중요 사건 · 확인 필요</div></div>
       <div class="window-body">
         <img class="life-scene-banner" src="${event.scene || lifeSceneImage(event.type)}" alt="${event.title} 상황 장면">
         <div class="event-title ${tone}">${event.icon || '❗'} ${event.title}</div>
         <div class="event-desc">${event.desc || ''}</div>
         ${event.detail ? `<div class="important-event-detail">${event.detail}</div>` : ''}
         <div class="important-event-count">남은 중요 사건 ${queue.length}건</div>
         <button id="important-event-confirm" class="session-btn opening">확인${queue.length ? ' · 다음 사건 보기' : ''}</button>
       </div>
     </div>`;
  const confirm = $('important-event-confirm');
  if (confirm) confirm.addEventListener('click', () => {
    host.style.display = 'none'; host.innerHTML = '';
    showNextImportantEvent();
  });
}

function showMonthlyMessagePopup(event){
  const host=$('life-event');if(!host)return;
  const L=S.life,isContact=event.targetType==='contact';
  const target=isContact?(SOCIAL.ensure(L).contacts||[]).find(c=>c.id===event.targetId):metRecord(L,event.personName);
  if(!target){showNextImportantEvent();return;}
  const role=isContact?SOCIAL.role(target):null;
  const title=isContact?`${role.icon} ${target.name}`:`${target.emoji||'💬'} ${target.name}`;
  const avatar=isContact?`<span class="message-popup-avatar">${role.icon}</span>`:`<img class="char-portrait" src="${characterPortrait(target)}" alt="${target.name}">`;
  const choices=isContact
   ? [['warm','❤️ 다정하게 안부를 답한다'],['advice','🗣️ 고민을 솔직하게 말한다'],['meet','🍚 다음 달에 만나자고 한다'],['brief','💬 짧게 답장한다']]
   : [['warm','❤️ 다정하게 답한다'],['brief','💬 짧게 안부만 답한다'],['boundary','🧱 연락의 선을 분명히 한다'],['ignore','🔕 읽고 답하지 않는다']];
  S._monthlyMessage={event,target,isContact};
  host.style.display='block';
  host.innerHTML=`<div class="window event-window message-event-window"><div class="title-bar event-bar"><div class="title-bar-text">📱 장 마감 후 도착한 연락</div></div><div class="window-body"><div class="date-profile">${avatar}<div><strong>${title}</strong><br><span class="muted">${isContact?(target.relationLabel||role.name):relationTag(L,target.name)} · 이번 달 답장 1회</span></div></div><div class="message-incoming">“${event.text}”</div><div class="event-desc">답장은 이번 달에 한 번만 보낼 수 있습니다. 선택한 답장은 관계 수치에 반영되고 다음 달까지 다시 보낼 수 없습니다.</div><div class="event-options">${choices.map(([id,text])=>`<button class="event-opt" data-monthly-reply="${id}">${text}</button>`).join('')}</div><div class="event-outcome" id="message-event-outcome"></div></div></div>`;
  host.querySelectorAll('[data-monthly-reply]').forEach(button=>button.addEventListener('click',()=>resolveMonthlyMessage(button.dataset.monthlyReply)));
}
function resolveMonthlyMessage(kind){
  const pending=S._monthlyMessage,host=$('life-event');if(!pending||!host)return;
  const result=pending.isContact?replyToContact(pending.target,kind,{popup:true}):replyToPerson(pending.target,kind,{popup:true});
  if(!result||!result.ok)return;
  const options=host.querySelector('.event-options');if(options)options.innerHTML='';
  const room=personChat(S.life,pending.target.name);room.unread=0;
  const unlock=!pending.isContact&&courtshipReadiness(pending.target).ready?`<div class="oc-changes">💘 충분히 가까워졌습니다. 외출 메뉴에서 ${pending.target.name}님과 정식 데이트할 수 있어요.</div>`:'';
  $('message-event-outcome').innerHTML=`<div class="oc-text"><b>내 답장</b><br>${result.text}</div>${result.answer?`<div class="story-dialogue"><b>${pending.target.name}</b> “${result.answer}”</div>`:''}${unlock}<button id="message-event-confirm" class="session-btn opening">확인 · 다음 월말 사건</button>`;
  $('message-event-confirm').addEventListener('click',()=>{host.style.display='none';host.innerHTML='';S._monthlyMessage=null;renderLifePanel();renderChatPanel();autoSave();showNextImportantEvent();});
}

const BOND_ENCOUNTER_SCENES=[
  {icon:'☕',title:'퇴근 뒤 우연한 합석',scene:'./assets/date-result-normal.png',desc:'전에 나눈 이야기가 생각났다며 잠깐 차를 마시자고 했습니다.'},
  {icon:'🌂',title:'비 오는 날의 재회',scene:'./assets/relationship-friend.png',desc:'갑작스러운 비를 피하다 같은 처마 아래에서 다시 마주쳤습니다.'},
  {icon:'📚',title:'서로의 취향을 발견한 날',scene:'./assets/life-network.png',desc:'지난 대화에서 말한 취향을 기억하고 먼저 이야기를 꺼냈습니다.'},
  {icon:'🥡',title:'늦은 저녁의 안부',scene:'./assets/date-route-friend.png',desc:'각자 바쁜 하루를 끝낸 뒤 간단한 저녁을 함께 먹게 됐습니다.'}
];
function queueBondEncounter(L){
  const pool=ensureMet(L).filter(r=>['acquaintance','friend'].includes(r.status)&&!courtshipReadiness(r).ready&&r.lastBondEncounterDay!==S.day);
  if(!pool.length||Math.random()>.55)return;
  const r=pick(pool);r.lastBondEncounterDay=S.day;
  queueImportantEvent({bondEncounter:true,personName:r.name,sceneIndex:Math.floor(Math.random()*BOND_ENCOUNTER_SCENES.length)});
}
function showBondEncounter(event){
  const host=$('life-event'),r=metRecord(S.life,event.personName);
  if(!host||!r){showNextImportantEvent();return;}
  const scene=BOND_ENCOUNTER_SCENES[event.sceneIndex]||BOND_ENCOUNTER_SCENES[0],per=D.PERSONALITIES[r.personality]||{};
  S._bondEncounter={event,r,scene};
  host.style.display='block';
  host.innerHTML=`<div class="window event-window"><div class="title-bar event-bar"><div class="title-bar-text">${scene.icon} 다시 마주친 사람 · 선택 필요</div></div><div class="window-body"><img class="life-scene-banner" src="${scene.scene}" alt="${scene.title} 장면"><div class="date-profile"><img class="char-thumb" src="${characterPortrait(r)}" alt="${r.name}"><div><strong>${r.name} · ${r.job}</strong><br><span class="muted">${per.emoji||''}${per.name||''} · ${courtshipProgress(r)}</span></div></div><div class="event-title">${scene.title}</div><div class="event-desc">${scene.desc} 무엇을 이야기할까요?</div><div class="event-options"><button class="event-opt" data-bond-choice="listen">상대가 요즘 어떻게 지내는지 끝까지 듣는다<span class="opt-sub">신뢰가 크게 오릅니다</span></button><button class="event-opt" data-bond-choice="memory">지난 대화를 기억하고 먼저 꺼낸다<span class="opt-sub">호감과 신뢰가 함께 오릅니다</span></button><button class="event-opt" data-bond-choice="invite">다음에는 둘이 제대로 외출하자고 제안한다<span class="opt-sub">호감이 크게 오르지만 성급하면 어색해질 수 있습니다</span></button></div><div id="bond-encounter-outcome" class="event-outcome"></div></div></div>`;
  host.querySelectorAll('[data-bond-choice]').forEach(b=>b.addEventListener('click',()=>resolveBondEncounter(b.dataset.bondChoice)));
}
function resolveBondEncounter(kind){
  const pending=S._bondEncounter,host=$('life-event');if(!pending||!host)return;
  const r=pending.r,per=D.PERSONALITIES[r.personality]||{};
  let affection=0,trust=0,text='';
  if(kind==='listen'){affection=4;trust=6;text=per.name==='냉정'?'말을 재촉하지 않자 조금씩 속내를 꺼냈습니다.':'판단하지 않고 들어준 덕분에 대화가 예상보다 오래 이어졌습니다.';}
  else if(kind==='memory'){affection=6;trust=4;text='사소한 말을 기억하고 있다는 사실에 상대의 표정이 눈에 띄게 부드러워졌습니다.';}
  else{const premature=(r.affection||0)<8;affection=premature?2:7;trust=premature?-1:2;text=premature?'아직은 둘만의 약속이 조금 부담스럽다며 다음을 기약했습니다.':'잠시 놀랐지만 일정을 확인해 먼저 가능한 날을 말해줬습니다.';}
  r.affection=clamp((r.affection||0)+affection,0,100);r.trust=clamp((r.trust||0)+trust,0,100);addBondInteraction(r,`encounter-${kind}`);
  const ready=courtshipReadiness(r);
  host.querySelector('.event-options').innerHTML='';
  $('bond-encounter-outcome').innerHTML=`<div class="story-dialogue"><b>${r.name}</b> “${text}”</div><div class="oc-changes">호감 ${affection>=0?'+':''}${affection} · 신뢰 ${trust>=0?'+':''}${trust} · 교류 ${r.interactions}회</div>${ready.ready?`<div class="oc-text up"><b>💘 정식 데이트 해금</b><br>이제 외출 메뉴에서 ${r.name}님에게 데이트를 제안할 수 있습니다.</div>`:`<div class="oc-text muted">${courtshipProgress(r)}</div>`}<button id="bond-encounter-confirm" class="session-btn opening">확인 · 다음 사건 보기</button>`;
  $('bond-encounter-confirm').addEventListener('click',()=>{host.style.display='none';host.innerHTML='';S._bondEncounter=null;renderLifePanel();autoSave();showNextImportantEvent();});
}

function showCrossCharacterEvent(eventId) {
  const event = CROSS_EVENTS && CROSS_EVENTS.get(eventId);
  const host = $('life-event');
  if (!event || !host) { showNextImportantEvent(); return; }
  const people = event.people.map(name => metRecord(S.life, name)).filter(Boolean);
  const cast = people.map(person => {
    const line = event.lines && event.lines[person.name];
    return `<div class="cross-person"><img src="${characterPortrait(person)}" alt="${person.name}"><div><b>${person.name}</b><small>${relationTag(S.life, person.name)} · 호감 ${Math.round(person.affection || 0)} · 신뢰 ${Math.round(person.trust || 0)}</small>${line ? `<p>“${line}”</p>` : ''}</div></div>`;
  }).join('');
  S._crossEvent = event;
  host.style.display = 'block';
  host.innerHTML =
    `<div class="window event-window cross-event-window">
       <div class="title-bar event-bar"><div class="title-bar-text">${event.icon} 인물 교차 사건 · 선택 필요</div></div>
       <div class="window-body">
         <img class="life-scene-banner" src="${event.scene || lifeSceneImage('love')}" alt="${event.title} 상황 장면">
         <div class="event-title">${event.icon} ${event.title}</div>
         <div class="cross-cast">${cast}</div>
         <div class="event-desc">${event.desc}</div>
         <div class="event-options">${event.choices.map((choice, index) => `<button class="event-opt" data-cross-choice="${index}">${choice.text}</button>`).join('')}</div>
         <div class="event-outcome" id="cross-event-outcome"></div>
       </div>
     </div>`;
  host.querySelectorAll('[data-cross-choice]').forEach(button => button.addEventListener('click', () => resolveCrossCharacterEvent(+button.dataset.crossChoice)));
}

function resolveCrossCharacterEvent(choiceIndex) {
  const event = S._crossEvent;
  const choice = event && event.choices[choiceIndex];
  const host = $('life-event');
  if (!event || !choice || !host) return;
  const changes = [];
  Object.entries(choice.people || {}).forEach(([name, effects]) => {
    const rec = metRecord(S.life, name);
    if (!rec) return;
    ['affection', 'trust', 'obsession'].forEach(key => {
      if (effects[key] == null) return;
      if(key==='obsession'&&!isDangerousHeroine(rec))return;
      const before = rec[key] || 0;
      rec[key] = clamp(before + effects[key], 0, 100);
      const risk=key==='obsession'&&dangerousRiskMeta(rec);
      changes.push(`${name} ${key === 'affection' ? '호감' : key === 'trust' ? '신뢰' : risk.label} ${effects[key] >= 0 ? '+' : ''}${effects[key]}`);
    });
  });
  Object.entries(choice.life || {}).forEach(([key, delta]) => {
    const label = { happy:'행복', stress:'스트레스', charm:'매력', health:'건강', morality:'도덕성' }[key] || key;
    if (key === 'morality') changeMorality(delta);
    else S.life[key] = clamp((S.life[key] || 0) + delta, 0, key === 'charm' ? 999 : 100);
    changes.push(`${label} ${delta >= 0 ? '+' : ''}${delta}`);
  });
  if (choice.cash) {
    S.capital += choice.cash;
    changes.push(`현금 ${choice.cash >= 0 ? '+' : ''}${won(choice.cash)}원`);
  }
  if (choice.socialRep) {
    const social = SOCIAL.ensure(S.life);
    social.reputation = clamp((social.reputation || 0) + choice.socialRep, 0, 100);
    changes.push(`평판 ${choice.socialRep >= 0 ? '+' : ''}${choice.socialRep}`);
  }
  if (choice.flags) Object.assign(S.life, choice.flags);
  CROSS_EVENTS.resolved(S.life, event.id, choice.text);
  addNews(`${event.icon} ${event.people.join('·')} 교차 사건 · ${choice.text}`, choice.socialRep < 0 ? 'bad' : 'neutral');
  const options = host.querySelector('.event-options'); if (options) options.innerHTML = '';
  const out = $('cross-event-outcome');
  out.innerHTML = `<div class="oc-text">${choice.outcome}</div>${changes.length ? `<div class="oc-changes">${changes.join(' · ')}</div>` : ''}<button id="cross-event-confirm" class="session-btn opening">확인 · 다음 사건 보기</button>`;
  $('cross-event-confirm').addEventListener('click', () => {
    host.style.display = 'none'; host.innerHTML = ''; S._crossEvent = null;
    renderCapital(); renderLifePanel(); autoSave(); showNextImportantEvent();
  });
}

function showDangerousHeroineEvent(eventId){
  const event=DANGEROUS_AFFECTION_EVENTS[eventId],host=$('life-event');
  if(!event||!host){showNextImportantEvent();return;}
  const r=metRecord(S.life,event.name);if(!r){showNextImportantEvent();return;}
  S._dangerousHeroineEvent={id:eventId,event};
  host.style.display='block';
  host.innerHTML=`<div class="window event-window dangerous-heroine-window"><div class="title-bar event-bar"><div class="title-bar-text">${event.icon} ${event.kind==='friend'?'호감도 이벤트':'위험한 관계 이벤트'} · 선택 필요</div></div><div class="window-body"><img class="life-scene-banner" src="${event.scene}" alt="${event.title} 컷신"><div class="date-profile"><img class="char-thumb" src="${characterPortrait(r)}" alt="${r.name}"><div><strong>${r.name}</strong><br><span class="muted">${relationTag(S.life,r.name)} · 호감 ${Math.round(r.affection||0)} · 신뢰 ${Math.round(r.trust||0)}</span></div></div><div class="event-title">${event.title}</div><div class="event-desc">${event.desc}</div><div class="event-options">${event.choices.map((choice,index)=>`<button class="event-opt" data-danger-choice="${index}">${choice.text}</button>`).join('')}</div><div id="danger-heroine-outcome" class="event-outcome"></div></div></div>`;
  host.querySelectorAll('[data-danger-choice]').forEach(button=>button.addEventListener('click',()=>resolveDangerousHeroineEvent(+button.dataset.dangerChoice)));
}
function resolveDangerousHeroineEvent(choiceIndex){
  const pending=S._dangerousHeroineEvent,choice=pending&&pending.event.choices[choiceIndex],host=$('life-event');
  if(!pending||!choice||!host)return;
  const r=metRecord(S.life,pending.event.name);if(!r)return;
  r.affection=clamp((r.affection||0)+(choice.affection||0),0,100);
  r.trust=clamp((r.trust||0)+(choice.trust||0),0,100);
  if(choice.danger){
    if(r.name==='윤세라')r.obsession=clamp((r.obsession||0)+choice.danger,0,100);
    else r.dangerLevel=clamp((r.dangerLevel||0)+choice.danger,0,100);
  }
  r.dangerEvents=r.dangerEvents||{};r.dangerEvents[pending.id]='seen';
  const options=host.querySelector('.event-options');if(options)options.innerHTML='';
  $('danger-heroine-outcome').innerHTML=`<div class="oc-text">${choice.result}</div><div class="oc-changes">호감 ${choice.affection>=0?'+':''}${choice.affection||0} · 신뢰 ${choice.trust>=0?'+':''}${choice.trust||0}${choice.danger?` · 위험도 ${choice.danger>0?'+':''}${choice.danger}`:''}</div><button id="danger-heroine-confirm" class="session-btn opening">확인 · 다음 사건 보기</button>`;
  $('danger-heroine-confirm').addEventListener('click',()=>{host.style.display='none';host.innerHTML='';S._dangerousHeroineEvent=null;renderLifePanel();autoSave();showNextImportantEvent();});
}

function resolveAmt(v) { return Array.isArray(v) ? Math.round(rand(v[0], v[1])) : v; }

function showJobIncident(incident) {
  const host = $('life-event'); if (!host || !incident) return;
  const debtLine = incident.debtAdded > 0
    ? `<div class="oc-text down">현금으로 부족한 <b>${won(incident.debtAdded)}원</b>은 ‘${incident.job} 사고채무’로 대출에 추가됐습니다.</div>`
    : `<div class="oc-text up">비용을 전부 현금으로 처리해 새로 생긴 빚은 없습니다.</div>`;
  host.style.display = 'block';
  host.innerHTML =
    `<div class="window event-window">
       <div class="title-bar event-bar"><div class="title-bar-text">🚨 장 마감 직업 사고</div></div>
       <div class="window-body">
         <img class="life-scene-banner" src="${lifeSceneImage('incident')}" alt="직업 사고 발생 장면">
         <div class="event-title">${incident.emoji || '🚑'} ${incident.job} · ${incident.text}</div>
         <div class="event-desc">이번 달 근무 중 사고가 발생했습니다. 비용이 어떻게 처리됐는지 확인하세요.</div>
         <div class="legacy-ledger">
           <div>🧾 총 발생 비용 <b>${won(incident.cost)}원</b></div>
           <div>💵 보유 현금 지출 <b>${won(incident.cashPaid)}원</b></div>
           <div>💳 새로 생긴 사고채무 <b class="${incident.debtAdded > 0 ? 'down' : ''}">${won(incident.debtAdded)}원</b></div>
         </div>
         ${debtLine}
         <button id="job-incident-confirm" class="session-btn opening">확인 · 다음 사건 보기</button>
       </div>
     </div>`;
  const confirmBtn = $('job-incident-confirm');
  if (confirmBtn) confirmBtn.addEventListener('click', () => {
    host.style.display = 'none'; host.innerHTML = '';
    showNextImportantEvent();
  });
}

function maybeLifeEvent() {
  if (!D.LIFE_EVENTS || Math.random() > LIFE.EVENT_PROB) return;
  const L = S.life;
  if (L.children && L.children.length && Math.random() < .45) {
    const childEvent = CHILD_EVENTS.make(L);
    if (childEvent) { showLifeEvent(childEvent); return; }
  }
  const ctx = { job:L.job,loan:L.loan,rel:L.relationship,happy:L.happy,charm:L.charm,affection:L.affection||0,pers:L.partner&&L.partner.personality,partnerJob:L.partner&&L.partner.job,partnerName:L.partner&&L.partner.name,hasLovers:!!(L.lovers&&L.lovers.length),familyPlan:!!L.familyPlan,morality:L.morality==null?60:L.morality,guilt:L.guilt||0,makjang:!!L.makjang,hasShark:(L.loans||[]).some(x=>x.illegal),naraeKnown:!!L.tutorialMet,seraKnown:!!metRecord(L,'윤세라') };
  const seraIntro = (D.LIFE_EVENTS || []).find(e => e.id === 'life_rainy_canvas');
  if (!ctx.seraKnown && seraIntro && Math.random() < 0.32) {
    showLifeEvent(seraIntro);
    return;
  }
  const jobSpecific = (D.CAREER_EVENTS || []).filter(e => Array.isArray(e.jobs) && e.jobs.includes(L.job) && (!e.cond || e.cond(ctx)));
  if (jobSpecific.length && Math.random() < 0.65) {
    showLifeEvent(pick(jobSpecific));
    return;
  }
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
         <img class="life-scene-banner" src="${lifeSceneImage(ev.cat)}" alt="${EVENT_CAT[ev.cat] || '인생'} 사건 장면">
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
  if (eff.morality != null) { changeMorality(eff.morality); changes.push(`도덕성 ${eff.morality >= 0 ? '+' : ''}${eff.morality}`); }
  if (eff.guilt != null) { L.guilt=clamp((L.guilt||0)+eff.guilt,0,100);changes.push(`죄책감 ${eff.guilt>=0?'+':''}${eff.guilt}`); }
  if (eff.meetSera && !metRecord(L, '윤세라')) {
    const rec = rememberPerson(Object.assign({}, D.SPECIAL_CHARACTERS.sera), 'friend');
    rec.affection = Math.max(rec.affection || 0, 22);
    rec.trust = Math.max(rec.trust || 0, 12);
    rec.obsession = Math.max(rec.obsession || 0, 55);
    pushPersonMessage(L, rec, '아까 정말 고마웠어요. 잘 들어갔죠? 답장 늦어도 괜찮아요. 기다리는 건 잘하니까.', false);
    changes.push('🖤 <b>윤세라와 친구가 되고 연락처가 생김</b>');
    addNews('☔ 빗속에서 윤세라를 도운 뒤 연락을 이어가게 됐습니다', 'good');
  }
  if (eff.familyOrigin && !L.familyPlan) {
    const other=eff.familyOrigin==='affair'&&L.lovers&&L.lovers.length?L.lovers[0].name:(L.partner&&L.partner.name);
    const result=FAMILY.startPlan(L,'birth',{origin:eff.familyOrigin,otherParent:other,secret:!!eff.familySecret});
    if(result.ok)changes.push(`👶 <b>${eff.familyOrigin==='affair'?'혼외자':'혼전임신'} 출산까지 9개월</b>`);
  }
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
  checkRelationship(); afterLifeAction('취미');
  maybeActivityEncounter(id);
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
  HEALTH.rest(S.life); flashToast('🛌 충분히 쉬어 스트레스가 줄었습니다', 'good'); afterLifeAction('휴식');
  maybeActivityEncounter('rest');
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
  flashToast(`👶 ${result.plan.method} 계획을 시작했습니다`, 'good'); afterLifeAction('가족');
}

function doChildEducation(id) {
  const cost=1000000;if(S.capital<cost){flashToast('💸 교육비 1,000,000원 부족','bad');return;}
  const child=FAMILY.educate(S.life,id,cost);if(!child)return;S.capital-=cost;
  flashToast(`📚 ${child.name} 교육 투자 · 역량 ${Math.round(child.education)}`,'good');afterLifeAction('가족');
}

function doChildBond(id) {
  const cost=200000;if(S.capital<cost){flashToast('💸 가족 활동비 200,000원 부족','bad');return;}
  const child=FAMILY.bond(S.life,id);if(!child)return;S.capital-=cost;S.life.happy=clamp(S.life.happy+5,0,100);
  flashToast(`🫶 ${child.name}와 시간을 보냈습니다 · 유대 ${Math.round(child.bond)}`,'good');afterLifeAction('가족');
}

function doParentCare() {
  const cost=1500000;if(S.capital<cost){flashToast('💸 부모님 돌봄 비용 1,500,000원 부족','bad');return;}
  S.capital-=cost;FAMILY.careParents(S.life);S.life.happy=clamp(S.life.happy+4,0,100);
  flashToast('👵 부모님 병원과 생활을 챙겼습니다','good');afterLifeAction('가족');
}

function doCareerTraining() {
  const cost=700000;if(S.capital<cost){flashToast('💸 교육비 700,000원 부족','bad');return;}
  S.capital-=cost;const c=CAREER.train(S.life);S.life.happy=clamp(S.life.happy-2,0,100);
  flashToast(`📈 직무교육 완료 · 능력 ${Math.round(c.skill)}`,'good');afterLifeAction('경력');
}

function doCertification(id) {
  const cert=CAREER.CERTS.find(x=>x.id===id);if(!cert)return;
  if(CAREER.ensure(S.life).certifications.includes(id)){flashToast('이미 보유한 자격입니다','neutral');return;}
  if(S.capital<cert.cost){flashToast(`💸 응시·교육비 ${won(cert.cost)}원 부족`,'bad');return;}
  S.capital-=cert.cost;CAREER.certify(S.life,id);addNews(`${cert.icon} ${cert.name} 자격 취득`,'good');
  flashToast(`${cert.icon} ${cert.name} 취득!`,'good');afterLifeAction('경력');
}

function doMoveHousing(id,tenure) {
  const target=HOUSING.HOMES.find(h=>h.id===id);if(!target)return;
  const current=HOUSING.ensure(S.life),refund=Math.round(HOUSING.assetValue(S.life)*(current.tenure==='owned'?.98:1)),q=HOUSING.quote(target,tenure),needed=Math.max(0,q.upfront-refund);
  if(S.capital<needed){flashToast(`💸 이사에 ${won(needed)}원 필요`,'bad');return;}
  const result=HOUSING.move(S.life,id,tenure);S.capital+=result.refund-result.cost;S.life.happy=clamp(S.life.happy+3,0,100);
  addNews(`${target.icon} ${target.name} ${HOUSING.TENURES[tenure].name} 계약 · 초기금 ${won(q.upfront)}원`,'good');flashToast(`${target.icon} ${HOUSING.TENURES[tenure].name} 이사 완료!`,'good');afterLifeAction();
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
  S.capital-=cost;const r=SOCIAL.role(c);addNews(`${r.icon} ${r.name} ${c.name}과(와) 알게 됐습니다`,'good');flashToast(`${r.icon} 새 인맥: ${c.name}`,'good');afterLifeAction('인맥');
}
const CONTACT_LINES={
  mentor:['"조급해하지 말아요. 커리어는 길게 봐야 해요.","기회는 또 옵니다."','"요즘 어때요? 힘든 건 언제든 얘기해요."'],
  banker:['"신용은 결국 평판이에요. 꾸준함이 최고죠."','"금리 흐름은 제가 챙겨서 알려드릴게요."'],
  founder:['"좋은 아이템 있으면 같이 해봐요."','"실패도 자산이에요. 계속 두드려요."'],
  official:['"절차는 복잡해도 원칙대로 가면 됩니다."','"필요하면 언제든 물어봐요."'],
  reporter:['"시장은 소문 반, 사실 반이에요."','"고급 정보는 늘 사람에게서 나와요."'],
  lawyer:['"위험은 미리 대비하는 게 최선이에요."','"서류는 반드시 남겨두세요."'],
};
function nurtureContact(id){
  const cost=300000;
  if(S.capital<cost){flashToast('💸 만남 비용 300,000원 부족','bad');return;}
  const c=SOCIAL.nurture(S.life,id);
  if(!c)return;
  S.capital-=cost;
  const role=SOCIAL.role(c);
  const line=pick(CONTACT_LINES[c.role]||['"만나서 반가워요."']);
  showHelpCard(Object.assign({},c,{emoji:role.icon}), `${role.icon} <b>${c.name}</b> <span class="muted">· ${role.name}</span><br>"${line}" <span class="up">(신뢰 ${c.trust} · 호의 ${c.favor})</span>`);
  afterLifeAction('인맥');
}
function askContact(id){const r=SOCIAL.ask(S.life,id);if(!r.ok){flashToast(r.message,'neutral');return;}const e=r.effect;if(e.cash)S.capital+=e.cash;if(e.credit)S.life.creditScore=clamp(S.life.creditScore+e.credit,300,950);if(e.careerSkill)CAREER.ensure(S.life).skill+=e.careerSkill;if(e.reputation)SOCIAL.ensure(S.life).reputation+=e.reputation;if(e.familyBond)S.life.familyBond=clamp((S.life.familyBond||0)+e.familyBond,0,100);if(e.recordShield)S.life.legalShield=(S.life.legalShield||0)+e.recordShield;addNews(`${SOCIAL.role(r.contact).icon} ${r.contact.name}: ${e.text}`,'good');flashToast(e.text,'good');afterLifeAction('인맥');}
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
  const world = c && D.WORLD_MALE_NPCS && D.WORLD_MALE_NPCS.find(x => x.name === c.name || x.id === c.id || x.id === c.sourceId);
  const file = (c && c.portrait) || (master && master.portrait) || (special && special.portrait) || (world && world.portrait);
  const emotion = mood || (c && c.mood) || 'neutral';
  const emotionMatch = file && file.match(/^(.*)-(neutral|happy|sad|angry)\.(webp|png)$/i);
  if (file && !emotionMatch) return `./assets/characters/${file}`;
  const emotionFile = emotionMatch ? `${emotionMatch[1]}-${emotion}.${emotionMatch[3]}` : file;
  return emotionFile ? `./assets/characters/${emotionFile}` : emojiAvatar(c);
}

// 초상화 파일이 없는 인물(인맥·단역 등)은 이모지 아바타로 대체 — 깨진 이미지 방지
function emojiAvatar(c) {
  const emoji = (c && (c.emoji || c.icon)) || '🙂';
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><rect width='96' height='96' rx='10' fill='#dfe6f2'/><text x='48' y='66' font-size='54' text-anchor='middle'>${emoji}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

/* 구버전 세이브 보정 — 초상화 성별을 맞추며 바뀐 이름을 따라가고, 로스터의 성별·초상화를 다시 붙인다 */
function migrateLifePeople(L) {
  const renames = D.CHARACTER_NAME_MIGRATIONS || {};
  const fix = p => {
    if (!p || typeof p !== 'object') return p;
    if (renames[p.name]) { p.name = renames[p.name]; delete p.portrait; }
    const master = D.CHARACTERS.find(x => x.name === p.name);
    if (master) {
      p.gender = master.gender; p.emoji = master.emoji; p.portrait = master.portrait;
      p.job = master.job; p.income = master.income; p.moneyStyle = master.moneyStyle;
      p.datingMoneyRate = master.datingMoneyRate || 0; p.datingMoneyFlat = master.datingMoneyFlat || 0;
      p.marriedShareRate = master.marriedShareRate;
    }
    const special = D.SPECIAL_CHARACTERS && Object.values(D.SPECIAL_CHARACTERS).find(x=>x.name===p.name);
    if(special){p.gender=special.gender;p.emoji=special.emoji;p.portrait=special.portrait;p.special=special.special;p.moneyStyle=special.moneyStyle;p.datingMoneyRate=special.datingMoneyRate||0;p.marriedShareRate=special.marriedShareRate;p.obsession=Math.max(Number.isFinite(p.obsession)?p.obsession:0,special.obsession||0);p.obsessionGrowth=special.obsessionGrowth||p.obsessionGrowth||0;}
    const personality=D.PERSONALITIES[p.personality]||{};if(!Number.isFinite(p.chastity))p.chastity=personality.chastity==null?55:personality.chastity;
    if(!DANGEROUS_HEROINE_NAMES.includes(p.name)){p.obsession=0;p.obsessionGrowth=0;delete p.yandere;delete p.dangerLevel;}
    ensureCourtship(p);
    return p;
  };
  if (!Array.isArray(L.met)) L.met = [];
  fix(L.partner);
  L.lovers = (L.lovers || []).map(fix).filter(x => !L.partner || x.name !== L.partner.name);
  L.met = L.met.map(fix);
  L.met.forEach(m=>{if(['강유진','한채린'].includes(m.name)){m.obsession=0;m.obsessionGrowth=0;}});
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

const COURTSHIP_RULES={affection:15,trust:8,interactions:3,months:1};
function ensureCourtship(rec){
  if(!rec)return rec;
  if(!Number.isFinite(rec.firstDay))rec.firstDay=S.day;
  if(!Number.isFinite(rec.interactions)){
    const established=['partner','lover','casual','polycule','ex'].includes(rec.status);
    rec.interactions=established?Math.max(3,rec.dates||0):Math.max(0,rec.dates||0);
  }
  return rec;
}
function knownMonths(rec){return Math.max(0,S.day-(ensureCourtship(rec).firstDay||S.day));}
function courtshipReadiness(rec){
  ensureCourtship(rec);
  const established=['partner','lover','casual','polycule','ex'].includes(rec.status);
  const missing=[];
  if((rec.affection||0)<COURTSHIP_RULES.affection)missing.push(`호감 ${Math.round(rec.affection||0)}/${COURTSHIP_RULES.affection}`);
  if((rec.trust||0)<COURTSHIP_RULES.trust)missing.push(`신뢰 ${Math.round(rec.trust||0)}/${COURTSHIP_RULES.trust}`);
  if((rec.interactions||0)<COURTSHIP_RULES.interactions)missing.push(`교류 ${rec.interactions||0}/${COURTSHIP_RULES.interactions}`);
  if(knownMonths(rec)<COURTSHIP_RULES.months)missing.push(`알게 된 기간 ${knownMonths(rec)}/${COURTSHIP_RULES.months}개월`);
  return{ready:established||missing.length===0,missing,months:knownMonths(rec)};
}
function courtshipProgress(rec){
  const r=courtshipReadiness(rec);
  return r.ready?'💘 정식 데이트 가능':`🔒 ${r.missing.join(' · ')}`;
}
function dangerousRiskMeta(rec){
  if(!rec)return null;
  if(rec.name==='강유진')return{icon:'🚨',label:'과잉보호',value:rec.dangerLevel||0};
  if(rec.name==='한채린')return{icon:'👑',label:'지배욕',value:rec.dangerLevel||0};
  if(rec.name==='윤세라')return{icon:'🖤',label:'집착',value:rec.obsession||0};
  return null;
}
function addBondInteraction(rec,kind,amount){
  if(!rec)return;
  ensureCourtship(rec);
  rec.interactions=Math.min(99,(rec.interactions||0)+(amount||1));
  rec.lastInteractionDay=S.day;rec.lastInteractionKind=kind||'conversation';rec.idleMonths=0;
  const risk=dangerousRiskMeta(rec);
  if(risk){
    const growth=1+Math.floor((rec.affection||0)/25);
    if(rec.name==='윤세라')rec.obsession=clamp((rec.obsession||0)+growth,0,100);
    else rec.dangerLevel=clamp((rec.dangerLevel||0)+growth,0,100);
  }
}

function rememberPerson(c, status) {
  const L = S.life, met = ensureMet(L);
  let rec = met.find(m => m.name === c.name);
  if (!rec) {
    rec = { name: c.name, gender: c.gender, emoji: c.emoji, job: c.job, age: c.age,
            income: c.income, personality: c.personality, portrait: c.portrait, special:c.special, moneyStyle:c.moneyStyle,
            datingMoneyRate:c.datingMoneyRate||0, datingMoneyFlat:c.datingMoneyFlat||0, marriedShareRate:c.marriedShareRate,
            affection: 0, trust: 0, obsession: DANGEROUS_HEROINE_NAMES.includes(c.name)?(c.obsession||0):0, obsessionGrowth:DANGEROUS_HEROINE_NAMES.includes(c.name)?(c.obsessionGrowth||0):0,
            chastity:(D.PERSONALITIES[c.personality]||{}).chastity==null?55:(D.PERSONALITIES[c.personality]||{}).chastity,
            dates: 0, interactions:0, status: 'acquaintance', firstDay: S.day };
    met.push(rec);
  }
  if (status) rec.status = status;
  ensureCourtship(rec);
  if(!DANGEROUS_HEROINE_NAMES.includes(rec.name)){rec.obsession=0;rec.obsessionGrowth=0;}
  if(CHAR_TRAITS)CHAR_TRAITS.ensure(rec);
  rec.lastDay = S.day;
  return rec;
}

function meetSpecialPerson(id) {
  const c = D.SPECIAL_CHARACTERS && D.SPECIAL_CHARACTERS[id];
  if (!c) return;
  const host = $('life-event'); if (!host) return;
  S._specialMeet = c;
  const intro = id === 'yujin' ? '사건 상담을 마친 뒤, 강유진이 명함 뒷면에 개인 번호를 적어 건넸습니다. “업무 때문 아니어도 연락해요.”'
    : id === 'sera' ? '새벽 고민방에서 몇 시간 대화한 윤세라가 말합니다. “오늘 나간 뒤에도… 갑자기 사라지진 않을 거죠?”'
    : '당신 세력이 업계에서 이름을 얻자 한채린 쪽에서 먼저 비공개 회동을 제안했습니다. 채린이 잔을 내려놓습니다. “돈 말고, 사람을 얼마나 움직일 수 있는지 궁금하네요.”';
  host.style.display='block';
  host.innerHTML=`<div class="window event-window"><div class="title-bar event-bar"><div class="title-bar-text">${c.emoji} 특별한 만남</div></div><div class="window-body"><div class="date-profile"><img class="char-thumb" src="${characterPortrait(c)}" alt="${c.name}"><div><strong>${c.name} · ${c.age}세 · ${c.job}</strong><br><span class="muted">${(D.PERSONALITIES[c.personality]||{}).name}</span></div></div><div class="event-desc">${intro}</div><div class="event-options"><button class="event-opt" data-special-rel="friend">친구로 연락을 이어간다</button><button class="event-opt" data-special-rel="acquaintance">필요할 때만 연락한다</button><button class="event-opt" data-special-rel="casual">🌙 오늘 함께 밤을 보낸다 <span class="opt-sub">이 선택부터 전용 위험 트리거가 작동합니다</span></button></div></div></div>`;
  host.querySelectorAll('[data-special-rel]').forEach(b=>b.addEventListener('click',()=>resolveSpecialMeet(b.dataset.specialRel)));
}
function resolveSpecialMeet(status) {
  const c=S._specialMeet;if(!c)return;
  const rec=rememberPerson(c,status);rec.affection=status==='friend'?22:status==='casual'?28:10;rec.trust=status==='friend'?12:4;
  addBondInteraction(rec,'special-meeting');
  rec.obsession=Math.min(100,(rec.obsession||0)+(status==='casual'?18:status==='friend'?6:0));
  if(status==='casual')awakenDangerousHeroine(rec,'night');
  pushPersonMessage(S.life,rec,status==='casual'?'가볍게라고 했지만… 연락은 매일 해도 되는 거죠?':'번호 저장했어요. 먼저 사라지지만 말아요.',false);
  addNews(`${c.emoji} ${c.name}님과 ${status==='friend'?'친구가':status==='casual'?'가벼운 관계가':'연락하는 사이가'} 됐습니다`,'neutral');
  const h=$('life-event');if(h){h.style.display='none';h.innerHTML='';}S._specialMeet=null;afterLifeAction('인맥');
}

/* 외출·취미 활동 중 자연스럽게 사람을 만나는 시스템 —
 * 활동마다 그 자리에 어울리는 성향의 사람과 우연히 마주친다. */
const HOBBY_MEET = {
  game:   { emoji:'🎮', pool:['homebody','cold','frugal'],  scene:'온라인 길드 정기모임에서 같은 팀이 되어' },
  food:   { emoji:'🍽️', pool:['caring','lavish','free'],    scene:'웨이팅이 긴 맛집에서 합석하게 되어' },
  gym:    { emoji:'🏋️', pool:['ambitious','free','caring'],  scene:'같은 시간대에 운동하다 스팟을 도와주며' },
  study:  { emoji:'📚', pool:['ambitious','cold','frugal'],  scene:'자기계발 스터디 뒤풀이 자리에서' },
  travel: { emoji:'✈️', pool:['free','lavish','caring'],     scene:'여행지 게스트하우스 라운지에서' },
  rest:   { emoji:'🌿', pool:['homebody','caring','frugal'], scene:'쉬는 날 동네를 산책하다가' },
};
function maybeActivityEncounter(id) {
  const meet = HOBBY_MEET[id]; if (!meet) return;
  const host = $('life-event'); if (host && host.style.display === 'block') return;  // 다른 이벤트가 이미 떠 있으면 양보
  const L = S.life;
  if (Math.random() > (L.partner ? 0.2 : 0.42)) return;   // 활동마다 낮은 확률로만 인연이 생긴다
  const c = makeCandidate({ pool: meet.pool }, []); if (!c) return;   // 정말 처음 보는 사람만
  S._activityMeet = { c, scene: meet.scene, emoji: meet.emoji };
  showActivityEncounter();
}
function showActivityEncounter() {
  const m = S._activityMeet; if (!m) return; const c = m.c;
  const host = $('life-event'); if (!host) return;
  const per = D.PERSONALITIES[c.personality] || {};
  host.style.display = 'block';
  host.innerHTML = `<div class="window event-window"><div class="title-bar event-bar"><div class="title-bar-text">${m.emoji} 활동 중 만난 사람</div><div class="title-bar-controls"><button aria-label="Close" id="ameet-x"></button></div></div><div class="window-body"><div class="date-profile"><img class="char-thumb" src="${characterPortrait(c)}" alt="${c.name}"><div><strong>${c.name} · ${c.age}세 · ${c.job}</strong><br><span class="muted">${per.emoji || ''}${per.name || ''}</span></div></div><div class="event-desc">${m.scene} ${c.name}와(과) 자연스럽게 이야기를 나눴습니다. <span class="muted">${per.desc || ''}</span></div><div class="event-options"><button class="event-opt" data-ameet="friend">😊 친구로 연락을 이어간다</button><button class="event-opt" data-ameet="acquaintance">🤝 필요할 때만 연락하는 사이로</button><button class="event-opt" data-ameet="casual">🔥 가볍게 만나보자고 한다</button><button class="event-opt" id="ameet-skip">그냥 인사만 하고 헤어진다</button></div></div></div>`;
  host.querySelectorAll('[data-ameet]').forEach(b => b.addEventListener('click', () => resolveActivityEncounter(b.dataset.ameet)));
  [$('ameet-x'), $('ameet-skip')].forEach(b => { if (b) b.addEventListener('click', closeActivityEncounter); });
}
function closeActivityEncounter() { const h = $('life-event'); if (h) { h.style.display = 'none'; h.innerHTML = ''; } S._activityMeet = null; }
function resolveActivityEncounter(status) {
  const m = S._activityMeet; if (!m) return; const c = m.c;
  const rec = rememberPerson(c, status);
  addBondInteraction(rec,'activity-meeting');
  rec.affection = Math.max(rec.affection || 0, status === 'friend' ? 14 : status === 'casual' ? 18 : 6);
  rec.trust = Math.max(rec.trust || 0, status === 'friend' ? 8 : 3);
  if (status === 'casual'&&isDangerousHeroine(rec)) awakenDangerousHeroine(rec,'night');
  pushPersonMessage(S.life, c, status === 'casual' ? '오늘 재밌었어요. 또 편하게 봐요.' : '연락처 저장했어요. 다음에 또 봬요!', false);
  addNews(`${m.emoji} ${c.name}님과 ${status === 'friend' ? '친구가' : status === 'casual' ? '가벼운 사이가' : '아는 사이가'} 됐습니다`, 'good');
  flashToast(`${m.emoji} ${c.name}님과 인연이 생겼습니다`, 'good');
  closeActivityEncounter(); renderLifePanel(); autoSave();
}

function showPersonRequest(name) {
  const rec=metRecord(S.life,name);if(!rec)return;
  const host=$('life-event');if(!host)return;S._requestPerson=rec;
  const risk=dangerousRiskMeta(rec);
  host.style.display='block';host.innerHTML=`<div class="window event-window"><div class="title-bar event-bar"><div class="title-bar-text">🙏 ${rec.name}에게 부탁하기</div><div class="title-bar-controls"><button aria-label="Close" id="request-x"></button></div></div><div class="window-body"><div class="date-profile"><img class="char-thumb" src="${characterPortrait(rec)}" alt="${rec.name}"><div><strong>${rec.name} · ${relationTag(S.life,rec.name)}</strong><br><span class="muted">호감 ${Math.round(rec.affection||0)} · 신뢰 ${Math.round(rec.trust||0)}${risk?` · ${risk.icon}${risk.label} ${Math.round(risk.value)}`:''}</span></div></div><div class="event-desc">도움을 받는 부탁뿐 아니라 함께 좋은 시간을 보내거나 상대를 챙길 수도 있습니다.</div><div class="event-options"><button class="event-opt" data-request="celebrate">🎉 좋은 일을 함께 축하한다</button><button class="event-opt" data-request="gift">🎁 작은 선물을 건넨다</button><button class="event-opt" data-request="advice">☕ 고민을 들어달라고 한다</button><button class="event-opt" data-request="money">급한 돈을 부탁한다</button><button class="event-opt" data-request="help">직업상 도움을 부탁한다</button><button class="event-opt" data-request="secret">내 비밀을 지켜달라고 한다</button><button class="event-opt" data-request="alibi">거짓 알리바이를 요구한다</button>${risk?'<button class="event-opt" data-request="boundary">관계의 선과 연락 빈도를 정한다</button>':''}<button class="event-opt" id="request-close">닫기</button></div></div></div>`;
  host.querySelectorAll('[data-request]').forEach(b=>b.addEventListener('click',()=>resolvePersonRequest(b.dataset.request)));
  [$('request-x'),$('request-close')].forEach(b=>{if(b)b.addEventListener('click',closePersonRequest);});
}
function closePersonRequest(){const h=$('life-event');if(h){h.style.display='none';h.innerHTML='';}S._requestPerson=null;}
function resolvePersonRequest(kind) {
  const r=S._requestPerson;if(!r)return;const per=D.PERSONALITIES[r.personality]||{};
  let text='',tone='neutral';const closeness=(r.affection||0)+(r.trust||0);
  if(kind==='celebrate'){
    r.affection=Math.min(100,(r.affection||0)+7);r.trust=Math.min(100,(r.trust||0)+5);S.life.happy=clamp(S.life.happy+4,0,100);text='서로의 최근 좋은 일을 축하하며 편안한 시간을 보냈습니다.';tone='good';
  } else if(kind==='gift'){
    const cost=300000;if(S.capital<cost){flashToast('💸 선물 비용 300,000원이 필요합니다','bad');return;}S.capital-=cost;r.affection=Math.min(100,(r.affection||0)+(r.personality==='lavish'?10:6));text='취향을 기억해 고른 작은 선물에 상대가 환하게 웃었습니다.';tone='good';
  } else if(kind==='advice'){
    S.life.stress=clamp(S.life.stress-8,0,100);r.trust=Math.min(100,(r.trust||0)+6);text='판단하지 않고 이야기를 들어주어 마음이 한결 가벼워졌습니다.';tone='good';
  } else if(kind==='money'){
    const willing=r.moneyStyle==='support'||r.special==='heiress';const ok=willing&&closeness>=35;
    if(ok){const amt=r.special==='heiress'?5000000:Math.max(300000,Math.round((r.income||2000000)*.35));S.capital+=amt;r.trust=Math.max(0,(r.trust||0)-8);text=`${won(amt)}원을 보내주면서도 다음에는 먼저 상의해 달라고 했습니다.`;tone='good';}
    else{r.affection=Math.max(0,(r.affection||0)-(r.personality==='frugal'?10:6));text='“우리 사이와 돈 문제는 별개였으면 해요.” 부탁을 거절했습니다.';tone='bad';}
  } else if(kind==='help'){
    if(closeness>=28){const c=CAREER.ensure(S.life);c.skill=Math.min(100,c.skill+5);c.reputation=Math.min(100,c.reputation+3);r.trust=(r.trust||0)+4;text=`${r.job}으로서 아는 정보와 사람을 연결해 줬습니다. 직무능력과 평판이 올랐습니다.`;tone='good';}
    else{r.affection=Math.max(0,(r.affection||0)-3);text='아직 책임질 만큼 가까운 사이는 아니라며 정중히 선을 그었습니다.';}
  } else if(kind==='secret'){
    r.trust=(r.trust||0)+(per.forgive>=.3?7:3);r.affection=(r.affection||0)+2;if(r.name==='윤세라')r.obsession=(r.obsession||0)+9;text='비밀을 지켜주겠다고 약속했습니다. 대신 둘만 아는 것이 하나 더 생겼습니다.';
  } else if(kind==='boundary'){
    const risk=dangerousRiskMeta(r),high=risk&&risk.value>=70;
    if(r.name==='윤세라')r.obsession=Math.max(0,(r.obsession||0)-(high?18:10));else r.dangerLevel=Math.max(0,(r.dangerLevel||0)-(high?18:10));
    r.trust=Math.min(100,(r.trust||0)+5);r.affection=Math.max(0,(r.affection||0)-(r.name==='윤세라'?8:1));
    text=high?`처음에는 격하게 반발했지만 구체적인 규칙을 합의했습니다. ${risk.label}이 위험 단계에서 조금 내려갔습니다.`:'서로 가능한 연락과 불가능한 요구를 분명하게 합의했습니다.';tone='good';
  } else {
    if(r.special==='police'){r.affection=Math.max(0,(r.affection||0)-25);r.trust=Math.max(0,(r.trust||0)-30);changeMorality(-18,'거짓 알리바이를 요구했습니다');JUSTICE.openCase(S.life,'위증 교사 미수',.35,0,3000000);text='“지금 나한테 범죄를 부탁한 거예요?” 유진은 대화를 기록하고 자리를 떠났습니다.';tone='bad';}
    else if(closeness>=65||isDangerousHeroine(r)){r.trust=Math.max(0,(r.trust||0)-12);if(r.name==='윤세라')r.obsession=(r.obsession||0)+16;else if(isDangerousHeroine(r))r.dangerLevel=(r.dangerLevel||0)+12;changeMorality(-14,'타인에게 거짓 알리바이를 요구했습니다');text='요구를 받아들였지만, 두 사람 사이에 위험한 비밀과 의존이 생겼습니다.';tone='bad';}
    else{r.affection=Math.max(0,(r.affection||0)-18);text='선을 넘었다며 거절했습니다. 관계가 크게 멀어졌습니다.';tone='bad';}
  }
  addBondInteraction(r,`request-${kind}`);
  if(isDangerousHeroine(r)&&r.name==='윤세라'&&!['alibi','boundary'].includes(kind))r.obsession=Math.min(100,(r.obsession||0)+(kind==='money'?5:3));
  const requestScene=kind==='boundary'?'boundary':tone==='bad'?'requestBad':tone==='good'?'requestGood':'brief';
  const requestVoice=window.QT_CHARACTER_DIALOGUE&&QT_CHARACTER_DIALOGUE.line(r,requestScene);
  if(requestVoice)text=`“${requestVoice}” ${text}`;
  addNews(`🙏 ${r.name}에게 한 요구: ${text}`,tone);flashToast(text,tone);
  closePersonRequest();afterLifeAction('인맥');
}

const CHARACTER_EVENT_SCENES={
  '나래':'event-narae-market-crash.png','강유진':'event-yujin-rain-rescue.png','윤세라':'event-sera-doorstep.png','한채린':'event-chaerin-contract.png',
  '장태식':'life-debt-crisis.png',
  '서연':'event-seoyeon-repair.png','하은':'event-haeun-hospital.png','예린':'event-yerin-rain.png','채원':'event-chaewon-airport.png','유나':'event-yuna-backstage.png','수아':'event-sua-classroom.png','보라':'event-bora-pharmacy.png',
  '다은':'event-daeun-cake.png','혜진':'event-hyejin-blackout.png','소희':'event-sohee-backstage.png','아린':'event-arin-first-snow.png','나영':'event-nayoung-wrist.png','미래':'event-mirae-launch.png'
};
const CHARACTER_STORY_EXTRA_SCENES={
  '강유진':['event-yujin-night-call.png','event-yujin-night-call.png'],
  '한채린':['event-chaerin-thrown-contract.png','event-chaerin-thrown-contract.png'],
  '윤세라':['event-sera-three-chairs.png','event-sera-three-chairs.png']
};
function characterEventScene(name,chapterIndex){
  const extra=CHARACTER_STORY_EXTRA_SCENES[name],extraFile=extra&&chapterIndex>=3&&extra[chapterIndex-3];
  const f=extraFile||CHARACTER_EVENT_SCENES[name];return f?`./assets/${f}`:lifeSceneImage('love');
}

function showCharacterStory(name){
  const r=metRecord(S.life,name),story=r&&STORIES.get(name),chapter=r&&STORIES.next(r);if(!r||!story)return;
  if(!chapter){flashToast(STORIES.ensure(r).completed?'📖 이 인물의 개인 스토리를 모두 봤습니다':`🔒 다음 스토리는 호감도 ${story.chapters[STORIES.ensure(r).chapter].min} 필요`,'neutral');return;}
  const host=$('life-event');if(!host)return;S._storyPerson=r;host.style.display='block';
  const continuity=STORIES.context?STORIES.context(r,chapter):'';
  host.innerHTML=`<div class="window event-window"><div class="title-bar event-bar"><div class="title-bar-text">📖 ${r.name} 개인 스토리 ${chapter.index+1}/${story.chapters.length}</div><div class="title-bar-controls"><button aria-label="Close" id="story-x"></button></div></div><div class="window-body"><img class="life-scene-banner" src="${characterEventScene(r.name,chapter.index)}" alt="${r.name} 특별 이벤트 장면"><div class="date-profile"><img class="char-portrait" src="${characterPortrait(r,chapter.index===1?'sad':'neutral')}" alt="${r.name}"><div><strong>${chapter.title}</strong><br><span class="muted">${story.theme}</span></div></div>${continuity?`<div class="story-continuity">🧷 ${continuity}</div>`:''}<div class="event-desc">${chapter.desc}</div>${chapter.speaker?`<div class="story-dialogue"><b>${r.name}</b> “${chapter.speaker}”</div>`:''}<div class="event-options">${chapter.choices.map(c=>`<button class="event-opt" data-story-choice="${c.id}">${c.text}${c.preview?`<span class="opt-sub">${c.preview}</span>`:''}</button>`).join('')}<button class="event-opt" id="story-close">지금은 답하지 않는다</button></div><div class="event-outcome" id="story-outcome"></div></div></div>`;
  host.querySelectorAll('[data-story-choice]').forEach(b=>b.addEventListener('click',()=>resolveCharacterStory(b.dataset.storyChoice)));
  [$('story-x'),$('story-close')].forEach(b=>{if(b)b.addEventListener('click',closeCharacterStory);});
}
function closeCharacterStory(){const h=$('life-event');if(h){h.style.display='none';h.innerHTML='';}S._storyPerson=null;if(S._storyFromQueue){S._storyFromQueue=false;showNextImportantEvent();}}
/* 호감도 조건이 충족되면 개인 스토리를 클릭 없이 자동으로 꺼내 온다 —
 * 챕터마다 한 번만 제시하고, 미뤄두면 인맥 목록의 📖 버튼으로 다시 볼 수 있다. */
function queueAvailableStories(L){
  ensureMet(L).forEach(m=>{
    const active=(L.partner&&L.partner.name===m.name)||['friend','casual','partner','polycule','lover'].includes(m.status);
    if(!active)return;
    const st=STORIES.get(m.name);if(!st)return;
    const chapter=STORIES.next(m);if(!chapter)return;              // 호감도 조건 충족 & 미완결
    const state=STORIES.ensure(m);
    if((state.offeredChapter==null?-1:state.offeredChapter)>=state.chapter)return;  // 이번 챕터는 이미 자동 제시함
    state.offeredChapter=state.chapter;
    queueImportantEvent({type:'love',story:true,personName:m.name,scene:characterEventScene(m.name,chapter.index),icon:'📖',
      title:`${m.name}와의 이야기 · ${chapter.title}`,
      desc:`${m.name}와(과)의 사이가 깊어지자, 지금까지 보이지 않던 사정이 드러나기 시작했습니다.`,
      detail:`호감 ${Math.round(m.affection||0)} · ‘${st.theme}’ — 확인하면 ${m.name}의 개인 스토리 ${chapter.index+1}장이 바로 시작됩니다.`,tone:'neutral'});
  });
}
function resolveCharacterStory(choice){
  const r=S._storyPerson,result=r&&STORIES.apply(r,choice);if(!result)return;
  if(!S._storyFromQueue)markMonthAction('인맥');
  const out=$('story-outcome'),opts=out&&out.parentElement.querySelector('.event-options');if(opts)opts.innerHTML='';
  const storyScene=result.choice.tone==='good'?'storyGood':result.choice.tone==='bad'?'storyBad':'storyNeutral';
  const authored=window.QT_CHARACTER_DIALOGUE&&QT_CHARACTER_DIALOGUE.line(r,storyScene);
  const reaction=result.choice.reaction||authored||(result.choice.tone==='good'?'당신이 자기 편이라는 사실을 오래 기억하겠다고 했습니다.':result.choice.tone==='bad'?'필요할 때 외면당한 일을 쉽게 잊지 못할 것 같습니다.':'당신의 방식에 동의하진 않지만 결과를 지켜보기로 했습니다.');
  const lifeChanges=result.choice.effects?applyEventEffects(result.choice.effects):[];
  const ending=result.completed&&result.ending?`<div class="story-ending"><b>📕 ${result.ending.title}</b><br>${result.ending.text}</div>`:'';
  const risk=dangerousRiskMeta(r);
  out.innerHTML=`<div class="oc-text"><b class="${result.choice.tone==='good'?'up':result.choice.tone==='bad'?'down':''}">${r.name}의 반응:</b> “${reaction}”${result.completed?'<br><b>개인 스토리 완결</b>':''}</div><div class="oc-changes">호감 ${result.choice.affection>=0?'+':''}${result.choice.affection} · 신뢰 ${result.choice.trust>=0?'+':''}${result.choice.trust}${risk?` · ${risk.label} ${result.choice.obsession>=0?'+':''}${result.choice.obsession}`:''}${lifeChanges.length?` · ${lifeChanges.join(' · ')}`:''}</div>${ending}<button id="story-confirm" class="session-btn opening">확인</button>`;
  pushPersonMessage(S.life,r,reaction,false);addNews(`📖 ${r.name} 개인 스토리 · ${result.chapter.title}`,result.choice.tone);$('story-confirm').addEventListener('click',closeCharacterStory);renderLifePanel();autoSave();
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
function ensureChats(L){if(!L.chats||typeof L.chats!=='object')L.chats={};return L.chats;}
function personChat(L,name){const chats=ensureChats(L);if(!chats[name])chats[name]={messages:[],unread:0};return chats[name];}
function pushPersonMessage(L,person,text,mine){
  if(!person||!text)return;const room=personChat(L,person.name);
  room.messages.push({day:S.day,text,mine:!!mine});if(room.messages.length>30)room.messages.shift();
  if(!mine)room.unread=(room.unread||0)+1;
}
// 이번 달 시장 분위기 — 채팅에서 투자 관련 걱정/응원 대사를 고를 때 참고
function currentMarketMood(){
  const e=S.economy&&ECONOMY.phase?ECONOMY.phase(S.economy):null;
  if(e&&/침체|하락|약세|공포/.test(e.name||''))return 'down';
  if(e&&/호황|상승|강세|과열/.test(e.name||''))return 'up';
  const dn=(S.dayStartNW||0),now=netWorthClean?netWorthClean():dn;
  return now<dn*0.97?'down':now>dn*1.03?'up':'flat';
}

const DANGEROUS_HEROINE_NAMES=['강유진','한채린','윤세라'];
const DANGEROUS_FRIEND_LINES={
  '강유진':['퇴근했어요? 답장은 나중에 해도 돼요. 집에 도착했다는 말만 남겨줘요.','오늘 순찰 동선이 그쪽이에요. 커피 한 잔 정도는 친구도 괜찮죠?','무슨 일 생기면 혼자 해결하지 말고 연락해요. 친구 번호는 이럴 때 쓰는 거니까.'],
  '한채린':['이번 주말 비워둬. 친구한테 좋은 식당 하나 보여주는 것뿐이니까 착각하지 말고.','네가 전에 말한 문제, 사람 붙여서 해결했어. 고맙다는 말은 얼굴 보고 들어야겠네.','일정 하나 보냈어. 싫으면 거절해. 대신 제대로 된 이유는 가져오고.'],
  '윤세라':['오늘은 어디 갔어요? 답장 천천히 해도 돼요. 그냥 무사한지만 궁금해서.','편의점에 새 디저트 나왔어요. 친구끼리 하나씩 먹어보는 건 평범한 일이죠?','잠이 안 오면 연락해요. 나도 대개 깨어 있으니까 부담 갖지 말고.']
};
const DANGEROUS_AFFECTION_EVENTS={
  yujin_friend:{name:'강유진',kind:'friend',min:20,scene:'./assets/event-yujin-riverside-date.png',icon:'☂️',title:'강유진 · 순찰이 끝난 강변',desc:'비가 내리는 강변에서 유진이 순찰 우산을 기울였습니다. 신고도 사건도 없는 약속은 처음이라며, 친구로서 당신의 하루를 듣고 싶다고 합니다.',choices:[
    {text:'오늘 있었던 일을 솔직하게 털어놓는다',result:'유진은 해결책보다 먼저 끝까지 이야기를 들었습니다. “이건 구조가 아니라 친구 노릇이에요.”',affection:7,trust:10},
    {text:'유진도 힘든 일이 없는지 묻는다',result:'늘 남을 구하던 유진이 처음으로 자기 피로를 말했습니다. 두 사람의 관계가 조금 더 평평해졌습니다.',affection:5,trust:13}
  ]},
  chaerin_friend:{name:'한채린',kind:'friend',min:20,scene:'./assets/event-chaerin-private-dinner.png',icon:'🥂',title:'한채린 · 비워 둔 맞은편 자리',desc:'채린이 통째로 예약한 식당에는 수행원도 거래처도 없었습니다. “오늘은 네가 평가해. 음식도, 나도.” 친구에게만 허용한 이상한 저녁입니다.',choices:[
    {text:'별로인 음식은 별로라고 잘라 말한다',result:'채린은 기분 나빠하기보다 웃었습니다. 자기 돈 앞에서도 눈치 보지 않는 대답이 마음에 든 모양입니다.',affection:9,trust:7},
    {text:'비싼 자리보다 둘만 있는 시간이 좋다고 한다',result:'채린은 잠시 말을 잃고 다음 예약도 같은 이름으로 잡으라고 지시했습니다.',affection:7,trust:9}
  ]},
  sera_friend:{name:'윤세라',kind:'friend',min:20,scene:'./assets/event-sera-convenience-date.png',icon:'🌙',title:'윤세라 · 새벽 편의점의 정상적인 친구',desc:'세라는 일부러 창가에서 가장 잘 보이는 자리를 골랐습니다. 오늘만큼은 동선을 캐묻지 않고, 평범한 친구처럼 컵라면과 디저트를 나눕니다.',choices:[
    {text:'먼저 다음 약속 날짜를 정한다',result:'세라는 몇 번이나 달력을 확인했지만 더 묻지는 않았습니다. 먼저 돌아올 약속이 있다는 사실만으로 충분해 보였습니다.',affection:8,trust:8},
    {text:'연락이 늦어도 불안해하지 말라고 약속한다',result:'세라는 쉬운 약속처럼 듣지 않았습니다. 대신 “노력해볼게요”라고 작게 대답했습니다.',affection:5,trust:12}
  ]},
  yujin_warning:{name:'강유진',kind:'friend',min:35,after:'yujin_friend',scene:'./assets/event-yujin-night-call.png',icon:'📍',title:'강유진 · 신고하지 않은 위치 확인',desc:'유진이 “근처 순찰 중”이라며 나타났지만, 오늘 순찰 구역은 반대편이었습니다. 당신이 늦게 귀가한다는 말을 기억해 일부러 동선을 바꾼 모양입니다.',choices:[
    {text:'걱정은 고맙지만 내 일정을 확인하지 말라고 한다',result:'유진은 입술을 깨물고 고개를 끄덕였습니다. “보호와 감시는 다르죠. 기록해둘게요.”',affection:2,trust:8,danger:-5},
    {text:'앞으로도 늦을 때 데리러 와달라고 한다',result:'유진은 바로 당신의 귀가 시간표를 만들었습니다. 안도한 표정이 이상하리만큼 진지합니다.',affection:7,trust:2,danger:10}
  ]},
  chaerin_warning:{name:'한채린',kind:'friend',min:35,after:'chaerin_friend',scene:'./assets/event-chaerin-thrown-contract.png',icon:'💳',title:'한채린 · 부탁하지 않은 결제',desc:'채린이 당신의 취미 모임 회비와 이동비를 비서실 명의로 처리했습니다. “친구 시간 낭비를 줄여준 것뿐”이라지만 다음 일정까지 이미 알고 있습니다.',choices:[
    {text:'결제를 돌려주고 내 일정은 내가 정한다고 한다',result:'채린은 불쾌해하다가도 처음으로 비서에게 “묻고 처리해”라고 지시했습니다.',affection:3,trust:8,danger:-5},
    {text:'편하니 앞으로도 맡긴다',result:'그날부터 예약과 결제뿐 아니라 누구를 만나는지도 채린의 보고서에 들어가기 시작했습니다.',affection:8,trust:1,danger:11}
  ]},
  sera_warning:{name:'윤세라',kind:'friend',min:35,after:'sera_friend',scene:'./assets/event-sera-doorstep.png',icon:'📱',title:'윤세라 · 보내지 않은 사진',desc:'세라의 휴대폰 앨범에 당신이 멀리서 찍힌 사진이 보였습니다. 우연히 마주쳤지만 말을 걸 용기가 없었다는 설명과 달리 날짜가 여러 날입니다.',choices:[
    {text:'사진을 지우고 우연을 가장하지 말라고 한다',result:'세라는 울먹이면서도 사진을 지웠습니다. “다음에는… 그냥 보고 싶었다고 말할게요.”',affection:1,trust:8,danger:-6},
    {text:'나만 볼 거라면 괜찮다고 한다',result:'세라는 웃으며 앨범을 잠갔습니다. 허락받았다는 사실이 새로운 기준이 되어버렸습니다.',affection:9,trust:1,danger:12}
  ]},
  yujin_control:{name:'강유진',kind:'friend',min:50,after:'yujin_warning',scene:'./assets/event-yujin-safehouse-ending.png',icon:'🚨',title:'강유진 · 비상 연락망의 빈칸',desc:'유진이 병원·직장·가족 연락처가 적힌 비상 계획을 내밀었습니다. 마지막 칸에는 이미 자신의 이름이 최우선 보호자로 적혀 있습니다.',choices:[
    {text:'비상시에만 쓰도록 범위를 함께 고친다',result:'유진은 몇 번이나 반박했지만 결국 권한과 상황을 구체적으로 제한했습니다.',affection:4,trust:10,danger:-7},
    {text:'유진이 전부 관리하게 둔다',result:'유진이 처음으로 긴장을 풀었습니다. 대신 당신의 일상에는 빠져나가기 어려운 보호망이 생겼습니다.',affection:10,trust:2,danger:14}
  ]},
  chaerin_control:{name:'한채린',kind:'friend',min:50,after:'chaerin_warning',scene:'./assets/event-chaerin-golden-cage-ending.png',icon:'👑',title:'한채린 · 이름이 올라간 생활비 장부',desc:'채린이 만든 월별 지원 장부에는 집과 취미와 식사뿐 아니라 당신이 만난 사람들의 이름까지 비용으로 분류돼 있습니다.',choices:[
    {text:'사람에게 가격을 매기지 말라고 장부를 찢는다',result:'채린은 화를 냈지만 새 장부의 첫 줄에 “본인 동의”라는 항목을 추가했습니다.',affection:5,trust:9,danger:-7},
    {text:'채린이 정한 생활을 받아들인다',result:'모든 비용이 사라진 대신, 당신이 스스로 결정할 수 있는 일정도 함께 줄었습니다.',affection:11,trust:1,danger:15}
  ]},
  sera_control:{name:'윤세라',kind:'friend',min:50,after:'sera_warning',scene:'./assets/event-sera-doorstep.png',icon:'🖤',title:'윤세라 · 우연이 너무 많은 한 달',desc:'회사 앞, 취미 장소, 자주 가는 편의점에서 세라를 계속 마주쳤습니다. 마지막에는 세라도 “이제 우연이라고 하면 화낼 거죠?”라고 묻습니다.',choices:[
    {text:'따라오지 말고 보고 싶으면 먼저 연락하라고 한다',result:'세라는 불안해했지만 그날 밤 처음으로 위치 대신 약속 시간을 물었습니다.',affection:4,trust:10,danger:-8},
    {text:'어디든 따라와도 된다고 한다',result:'세라는 조용히 웃었습니다. 다음 날부터 당신이 혼자 있는 시간이 눈에 띄게 줄었습니다.',affection:12,trust:1,danger:16}
  ]},
  yujin_romance:{name:'강유진',kind:'romance',min:55,scene:'./assets/event-yujin-night-call.png',icon:'🚨',title:'강유진 · 비상 연락망의 첫 번째 이름',desc:'연애나 하룻밤 이후, 유진의 보호는 업무 범위를 벗어났습니다. 당신의 위기 가능성을 없애기 위해 일상 전체를 사건 기록처럼 정리하려 합니다.',choices:[
    {text:'도움은 받되 내 선택은 내가 한다고 선을 긋는다',result:'유진은 불안해하면서도 선을 기록했습니다. 통제 수위가 내려갑니다.',trust:8,danger:-12},
    {text:'유진이 전부 판단해달라고 매달린다',result:'유진의 표정이 너무 빠르게 편안해졌습니다. “그럼 내가 절대 놓치지 않을게요.”',affection:10,danger:18}
  ]},
  chaerin_romance:{name:'한채린',kind:'romance',min:55,scene:'./assets/event-chaerin-thrown-contract.png',icon:'👑',title:'한채린 · 서명하지 않은 소유권',desc:'연애나 하룻밤 이후, 채린은 계약서 없이도 당신의 시간과 빚과 집을 자기 자산처럼 정리하기 시작했습니다.',choices:[
    {text:'돈으로 내 선택까지 살 수는 없다고 명령한다',result:'채린은 찢어진 계약서를 바라보다 웃었습니다. 거칠게 거절당한 것이 오히려 관계의 선이 됐습니다.',trust:9,danger:-10},
    {text:'내 생활을 전부 채린에게 맡긴다',result:'다음 날 계좌와 집과 일정에 채린의 사람이 붙었습니다. 편해진 만큼 출구가 줄었습니다.',affection:11,danger:20}
  ]},
  sera_romance:{name:'윤세라',kind:'romance',min:55,scene:'./assets/event-sera-doorstep.png',icon:'🖤',title:'윤세라 · 우연을 그만둔 밤',desc:'연애나 하룻밤 이후, 세라는 더 이상 우연인 척하지 않습니다. 당신이 어디에 있는지 알고 싶은 마음을 사랑의 권리라고 부르기 시작했습니다.',choices:[
    {text:'연락 시간과 방문 규칙을 분명히 정한다',result:'세라는 싫어했지만 규칙을 메시지 상단에 고정했습니다. 아직은 약속이 집착보다 강합니다.',trust:7,danger:-10},
    {text:'불안하지 않게 항상 위치를 공유한다',result:'세라는 안심했습니다. 그리고 그 안심을 잃지 않기 위해 더 많은 것을 요구하기 시작했습니다.',affection:10,danger:18}
  ]}
};
function isDangerousHeroine(person){return!!person&&DANGEROUS_HEROINE_NAMES.includes(person.name);}
function dangerousRomanceActive(L,r){
  if(!isDangerousHeroine(r))return false;
  const partner=!!(L.partner&&L.partner.name===r.name&&['dating','married'].includes(L.relationship));
  return partner||r.status==='casual'||!!r.spentNight||!!r.dangerAwakened;
}
function awakenDangerousHeroine(r,source){
  if(!isDangerousHeroine(r))return;
  r.dangerAwakened=true;r.dangerSource=source||r.dangerSource||'romance';
  if(source==='night'){r.spentNight=true;r.nightsTogether=(r.nightsTogether||0)+1;}
  if(r.name==='윤세라')r.obsession=Math.max(58,r.obsession||0);
  else r.dangerLevel=Math.max(28,r.dangerLevel||0);
}
function queueNaturalDangerousEvents(L){
  if(DANGEROUS_TRIO){
    const state=DANGEROUS_TRIO.ensure(L);
    if(DANGEROUS_TRIO.queue(L))queueImportantEvent({dangerousTrioStart:true});
    else if(state.active&&state.encountered&&state.lastChapterDay!==S.day){
      state.lastChapterDay=S.day;queueImportantEvent({dangerousTrioChapter:true});
    }
  }
  Object.entries(DANGEROUS_AFFECTION_EVENTS).forEach(([id,event])=>{
    const r=metRecord(L,event.name);if(!r)return;
    r.dangerEvents=r.dangerEvents||{};
    const eligible=event.kind==='friend'
      ? r.status==='friend'&&!dangerousRomanceActive(L,r)
      : dangerousRomanceActive(L,r);
    const prerequisite=!event.after||r.dangerEvents[event.after]==='seen';
    if(eligible&&prerequisite&&(r.affection||0)>=event.min&&!r.dangerEvents[id]){
      r.dangerEvents[id]='queued';queueImportantEvent({dangerousHeroineEvent:id});
    }
  });
}
function monthlyDangerousTrioAftermath(L){
  const bond=L.dangerousTrioBond;if(!bond||!bond.active)return;
  enlistDangerousTrioFaction(L);
  const aftermath=DANGEROUS_TRIO&&DANGEROUS_TRIO.nextAftermath(L);
  if(aftermath&&bond.lastAftermathDay!==S.day){
    bond.lastAftermathDay=S.day;
    queueImportantEvent({dangerousTrioAftermath:true});
    return;
  }
  const threats=[
    ['강유진','세라 씨, 위치 추적은 범죄예요. 또 선 넘으면 내가 직접 기록 남겨요.'],
    ['윤세라','유진 언니는 보호라는 말로 사람을 자기한테 의지하게 만들잖아요. 그게 더 깨끗한가요?'],
    ['한채린','둘 다 조용히 해. 내가 마련한 집에서 사고 치면 다음 달 지원은 없어.'],
    ['윤세라','채린 언니는 맞는 말 들을 때 좋아하면서 왜 자꾸 주인인 척해요?'],
    ['강유진','채린 씨 경호팀보다 내 신고 기록이 빨라요. 함부로 사람 일정 사지 마요.'],
    ['한채린','경찰님은 구해준다는 명분이 없으면 사랑도 못 하면서 훈계는 그만하시지.']
  ];
  const [speaker,line]=pick(threats),r=metRecord(L,speaker);if(r)pushPersonMessage(L,r,line,false);
  if(r)queueImportantEvent({monthlyMessage:true,targetType:'person',personName:r.name,text:line});
  if(Math.random()<.55){
    const faction=RIVALS.ensureFaction(L),member=(faction.members||[])[0];
    addNews(member?`😨 ${member.name}: “대장님… 세 분 정말 괜찮은 겁니까? 라이벌보다 눈 마주치기가 무섭습니다.”`:'😨 주변 사람들은 세 연인이 서로를 협박하면서도 한 팀처럼 움직이는 모습을 무서워합니다.','neutral');
  }
}

function monthlyRelationshipMessages(L){
  const mood=currentMarketMood();
  const arrivals=[];
  ensureMet(L).forEach(r=>{
    const active=(L.partner&&L.partner.name===r.name)||['acquaintance','friend','casual','lover','polycule'].includes(r.status);
    // 전 연인도 아주 가끔은 안부를 보내온다(연락이 완전히 끊기지 않은 경우)
    const exReach=r.status==='ex'&&(r.affection||0)>15&&Math.random()<.05;
    if(!active&&!exReach)return;
    const safeDangerFriend=isDangerousHeroine(r)&&r.status==='friend'&&!dangerousRomanceActive(L,r);
    const risk=dangerousRiskMeta(r),obsession=risk?risk.value:0;
    const gettingCloser=['acquaintance','friend'].includes(r.status)&&!courtshipReadiness(r).ready;
    const chance=exReach?1:safeDangerFriend?.72:gettingCloser?.52:.22+(obsession/170)+(r.special?.12:0);
    if(Math.random()>chance)return;
    const ctx={tag:relationTag(L,r.name),personality:r.personality,special:r.special,
      obsession,affection:r.affection||0,idleMonths:r.idleMonths||0,
      married:L.relationship==='married'&&L.partner&&L.partner.name===r.name,marketMood:mood};
    const line=safeDangerFriend?pick(DANGEROUS_FRIEND_LINES[r.name]):(window.QT_CHAT&&QT_CHAT.incoming(r,ctx))||'가끔은 먼저 연락해줘요.';
    arrivals.push({r,line});
  });
  arrivals.sort(()=>Math.random()-.5).slice(0,2).forEach(({r,line})=>{
    pushPersonMessage(L,r,line,false);
    queueImportantEvent({monthlyMessage:true,targetType:'person',personName:r.name,text:line});
  });
}
function monthlySocialMessages(L){
  const arrivals=[];
  (SOCIAL.ensure(L).contacts||[]).forEach(c=>{
    const chance=['mother','father','guardian'].includes(c.role)?.24:c.role==='schoolfriend'?.18:.08;
    if(Math.random()>chance)return;
    arrivals.push(c);
  });
  arrivals.sort(()=>Math.random()-.5).slice(0,1).forEach(c=>{
    const line=SOCIAL.contactLine(c);pushPersonMessage(L,c,line,false);
    queueImportantEvent({monthlyMessage:true,targetType:'contact',targetId:c.id,text:line});
  });
}

function updateRelationships(L) {
  const met = ensureMet(L);
  if (!met.length) return;
  const partnerName = L.partner && L.partner.name;
  const faded = [];
  met.forEach(m => {
    const activeJob=(L.partner&&L.partner.name===m.name)||['friend','casual','lover','polycule'].includes(m.status);
    if(activeJob){const jm=relationshipJobMod(m);m.affection=clamp((m.affection||0)+Math.sign(jm)*Math.min(2,Math.ceil(Math.abs(jm)/8)),0,100);}
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
  monthlyRelationshipMessages(L);
  queueBondEncounter(L);
  updateCharacterSignatureSystems(L);
  const crossEvent = CROSS_EVENTS && CROSS_EVENTS.monthly(L);
  if (crossEvent) queueImportantEvent({ crossEventId:crossEvent.id });
  queueNaturalDangerousEvents(L);
  monthlyDangerousTrioAftermath(L);
  const poly=ensurePolycule(L);
  if(poly.active&&poly.members.length){
    if(poly.mode==='dangerous_trio'&&DANGEROUS_TRIO){
      const warning=DANGEROUS_TRIO.monthly(L),trio=DANGEROUS_TRIO.ensure(L);poly.trust=Math.round(trio.stability);
      if(warning)addNews(`🦂 ${warning}`,'bad');
    }else{
      const tense=poly.members.some(x=>['homebody','obsessive'].includes(x.personality));
      if(Math.random()<(tense?.2:.08)){poly.trust=Math.max(0,(poly.trust||0)-(tense?12:6));addNews('🌈 다자연애 구성원 사이에서 일정·질투 문제로 갈등이 생겼습니다','bad');}
      else poly.trust=Math.min(100,(poly.trust||0)+2);
      if(poly.trust<=0){poly.members.forEach(x=>{const r=metRecord(L,x.name);if(r)r.status='ex';});poly.members=[];poly.active=false;addNews('💔 합의와 신뢰가 무너져 다자연애 관계가 해체됐습니다','bad');}
    }
  }
}

const SIGNATURE_EVENTS={
 '나래':['원칙을 다시 보기 시작했다','당신의 투자 판단을 믿고 자신의 분석 노트를 공유하기 시작했습니다.'],
 '강유진':['당신을 걱정하는 선을 넘었다','망가질수록 자신만이 구할 수 있다고 믿으며 연락과 보호를 통제하기 시작했습니다.'],
 '한채린':['관계의 주도권을 시험한다','당신이 얼마나 자존심을 내려놓는지 확인하려 계약과 지원을 미끼로 내밀었습니다.'],
 '서연':['당신이 작업의 영감이 되었다','둘만의 기억을 디자인에 남기며 새로운 작품을 만들기 시작했습니다.'],
 '하은':['돌봄이 사랑보다 의무가 되었다','당신까지 챙기느라 지친 마음을 처음으로 드러냈습니다.'],
 '예린':['함께 살 수 있는 사람으로 보기 시작했다','생활표와 저축 계획에 당신의 자리를 만들었습니다.'],
 '채원':['돌아올 곳을 정했다','긴 비행 뒤 가장 먼저 연락하는 사람이 당신이 되었습니다.'],
 '유나':['관계가 대중의 먹잇감이 되었다','사진과 목격담이 퍼지며 공개할지 숨길지 선택해야 합니다.'],
 '수아':['모두의 책임을 떠안고 무너진다','학교와 가족, 관계의 부탁을 거절하지 못해 한계에 닿았습니다.'],
 '보라':['반복되는 일상에 당신이 들어왔다','매일 같은 시간에 함께하는 안정이 특별한 애정이 되었습니다.'],
 '다은':['둘만의 가게를 꿈꾸기 시작했다','새 메뉴와 작은 가게의 이름을 당신과 함께 정하고 싶어 합니다.'],
 '혜진':['감정보다 강한 증거를 얻었다','반복해서 지킨 약속을 근거로 당신을 완전히 신뢰하기 시작했습니다.'],
 '소희':['자유 안에 당신의 자리를 남겼다','떠나고 돌아오는 삶에서도 관계를 책임지는 방식을 찾았습니다.'],
 '아린':['마음의 원고를 건넸다','누구에게도 보여주지 않은 자신의 이야기를 당신에게 먼저 읽혀줍니다.'],
 '나영':['당신을 경쟁자로 인정했다','함께 성장할 상대라며 운동과 인생 모두에서 승부를 걸어옵니다.'],
 '미래':['현실에서도 파티원이 되었다','게임 취향뿐 아니라 생활 리듬까지 맞아 공동 프로젝트를 제안했습니다.']
};
function signatureContext(L){return{prestige:playerJobPrestige(),debtRatio:(L.loan||0)/Math.max(1,totalWealth()),marginCalled:!!S.marginCalled};}
function signatureEvent(result){const rec=result.rec,s=result.spec,copy=SIGNATURE_EVENTS[rec.name]||[`${s.name} 변화`,`${s.name} 수치가 관계를 바꾸기 시작했습니다.`];queueImportantEvent({type:'love',scene:`./assets/${s.scene}`,icon:s.icon,title:`${rec.name} · ${copy[0]}`,desc:copy[1],detail:`${s.name} ${Math.round(result.state.value)}/100 · ${CHAR_TRAITS.stageText(rec)}`,tone:s.good?'good':result.afterStage>=2?'bad':'neutral'});}
function updateCharacterSignatureSystems(L){
  if(!CHAR_TRAITS)return;const results=CHAR_TRAITS.monthly(L,signatureContext(L));results.forEach(x=>{if(x.changed)signatureEvent(x);});
  ensureMet(L).forEach(r=>{const s=CHAR_TRAITS.system(r.name),st=CHAR_TRAITS.ensure(r);if(!s||!st)return;const stage=CHAR_TRAITS.stageOf(s,st.value);if(stage<3)return;
    if(r.name==='강유진'){r.menhera=true;r.affection=clamp((r.affection||0)+3,0,100);L.legalShield=Math.min(5,(L.legalShield||0)+1);L.stress=clamp((L.stress||0)+3,0,100);}
    else if(r.name==='하은'||r.name==='수아'){r.affection=Math.max(0,(r.affection||0)-3);}
    else if(r.name==='유나'){SOCIAL.ensure(L).reputation-=2;}
    else if(r.name==='한채린'){S.capital+=500000;L.charm=Math.max(0,(L.charm||0)-1);}
    else if(r.name==='나래'){CAREER.ensure(L).performance=clamp(CAREER.ensure(L).performance+2,0,100);}
    else if(r.name==='서연'){L.charm=(L.charm||0)+1;}
    else if(r.name==='채원'){L.happy=clamp((L.happy||0)+2,0,100);}
    else if(r.name==='예린'){L.creditScore=clamp((L.creditScore||600)+3,0,1000);}
    else if(r.name==='보라'){L.health=clamp((L.health||50)+2,0,100);}
    else if(r.name==='다은'){S.capital+=200000;}
    else if(r.name==='혜진'){L.legalShield=Math.min(5,(L.legalShield||0)+1);}
    else if(r.name==='소희'){L.happy=clamp((L.happy||0)+3,0,100);}
    else if(r.name==='아린'){L.stress=clamp((L.stress||0)-3,0,100);}
    else if(r.name==='나영'){L.fitness=clamp((L.fitness||0)+2,0,100);}
    else if(r.name==='미래'){CAREER.ensure(L).skill=clamp(CAREER.ensure(L).skill+1,0,100);}
    else if(s.good){r.trust=clamp((r.trust||0)+2,0,100);}
  });
}

function updateObsession(L) {
  let captivity=false;
  ensureMet(L).forEach(r=>{
    if(L.dangerousTrioBond&&L.dangerousTrioBond.active&&isDangerousHeroine(r))return;
    if(r.name!=='윤세라'){if(!isDangerousHeroine(r)){r.obsession=0;r.obsessionGrowth=0;}return;}
    const specialObs=true;
    const active=dangerousRomanceActive(L,r);
    if(!active)return;
    const before=r.obsession||0;
    const neglect=Math.max(0,(r.idleMonths||0)-1);
    const loopGrace=r.name==='윤세라'&&L.seraLoop&&L.seraLoop.active&&(L.seraLoop.grace||0)>0;
    const growth=r.obsessionGrowth||(specialObs?5:r.personality==='obsessive'?4:1);
    r.obsession=Math.min(100,before+(loopGrace?1:growth+(r.status==='casual'?5:3)+neglect*2));
    if(loopGrace)L.seraLoop.grace=Math.max(0,L.seraLoop.grace-1);
    if(r.name==='윤세라'&&r.obsession>=70)r.yandere=true; // 구버전 세이브·이미 임계치를 넘긴 기록 호환
    if(before<45&&r.obsession>=45)queueImportantEvent({type:'love',icon:'📱',title:`${r.name}의 확인`,desc:'답장이 늦자 부재중 전화와 메시지가 반복해서 쌓였습니다.',detail:'집착이 관심의 수준을 넘어 통제로 변하기 시작했습니다. 요구를 들어주거나 애매한 관계를 유지하면 더 빨리 올라갈 수 있습니다.',tone:'bad'});
    if(before<70&&r.obsession>=70){
      if(r.name==='윤세라'){r.yandere=true;queueImportantEvent({type:'love',scene:'./assets/event-sera-doorstep.png',icon:'🖤',title:'윤세라 · 얀데레 전환',desc:'새벽 두 시, 알려준 적 없는 집 앞에 세라가 서 있었습니다. “이제 우연인 척 안 해도 되죠?”',detail:'이후 병원·직장·취미·다른 사람과의 외출에도 세라가 나타날 수 있습니다. 관계를 끊는 것만으로는 즉시 멈추지 않습니다.',tone:'bad'});}
      else queueImportantEvent({type:'love',icon:'🚪',title:`${r.name}가 집 앞에 왔다`,desc:'알려준 적 없는 일정과 장소를 알고 기다리고 있었습니다.',detail:'관계를 분명히 정리하거나 주변 사람에게 도움을 구해야 할 위험 단계입니다.',tone:'bad'});
    }
    if(r.obsession>=95&&!L.captivityEnding){L.captivityEnding=true;captivity=true;setTimeout(()=>showCaptivityEnding(r),650);}
  });
  ensureMet(L).filter(r=>!(L.dangerousTrioBond&&L.dangerousTrioBond.active)&&['강유진','한채린'].includes(r.name)&&dangerousRomanceActive(L,r)).forEach(r=>{
    const before=r.dangerLevel||28,signature=CHAR_TRAITS&&CHAR_TRAITS.ensure(r),sig=signature?signature.value||0:0;
    const pressure=r.name==='강유진'
      ? 5+Math.floor((L.stress||0)/30)+Math.floor(sig/35)+((L.loan||0)>0?2:0)
      : 5+Math.max(0,2-Math.floor(playerJobPrestige()/35))+Math.floor(sig/35)+(S.capital<0?2:0);
    r.dangerLevel=clamp(before+pressure,0,100);
    if(before<55&&r.dangerLevel>=55)queueImportantEvent({type:'love',scene:r.name==='강유진'?'./assets/event-yujin-night-call.png':'./assets/event-chaerin-thrown-contract.png',icon:r.name==='강유진'?'🚨':'👑',title:`${r.name} · 보호가 소유로 바뀌는 지점`,desc:r.name==='강유진'?'당신을 위험에서 떼어놓겠다는 유진의 계획이 직장과 연락처와 외출까지 포함하기 시작했습니다.':'채린의 지원이 계좌와 집과 일정의 결정권까지 가져가기 시작했습니다.',detail:`위험도 ${Math.round(r.dangerLevel)}/100 · 연애나 하룻밤 이후에만 진행되는 전용 위험선입니다.`,tone:'bad'});
    if(before<78&&r.dangerLevel>=78)queueImportantEvent({type:'love',scene:r.name==='강유진'?'./assets/event-yujin-safehouse-ending.png':'./assets/event-chaerin-golden-cage-ending.png',icon:'🔐',title:`${r.name} · 출구가 줄어든다`,desc:r.name==='강유진'?'유진이 마련한 보호 숙소의 출입 기록에 당신 이름만 남았습니다.':'채린이 마련한 펜트하우스에서 당신 명의의 카드와 열쇠가 하나씩 작동을 멈췄습니다.',detail:'지금 관계의 선을 다시 세우지 않으면 다음 단계는 전용 감금엔딩입니다.',tone:'bad'});
    if(r.dangerLevel>=95&&!L.captivityEnding){L.captivityEnding=true;captivity=true;setTimeout(()=>showDangerousHeroineEnding(r),650);}
  });
  return captivity;
}

function changeMorality(delta,reason){
  const L=S.life;if(!L)return;L.morality=clamp((L.morality==null?60:L.morality)+delta,0,100);
  if(delta<0)L.guilt=clamp((L.guilt||0)+Math.ceil(-delta*.7),0,100);
  if(reason)addNews(`${delta>=0?'🕊️':'🌓'} ${reason} · 도덕성 ${delta>=0?'+':''}${delta}`,delta>=0?'good':'bad');
}
function moralityLabel(v){return v>=80?'원칙적':v>=60?'양심적':v>=40?'현실적':v>=20?'이기적':'비정한';}
function obsessionLabel(v){return v>=90?'위험한 통제':v>=70?'통제적':v>=45?'불안 집착':v>=20?'의존적':'안정적';}
function updateMoralityState(L){
  L.morality=L.morality==null?60:L.morality;L.guilt=L.guilt||0;
  if(L.morality>=70)L.guilt=Math.max(0,L.guilt-4);
  if(L.morality<40){
    const per=D.PERSONALITIES[(L.partner||{}).personality]||{};
    const sensitivity=['caring','frugal','homebody'].includes(per.key)?7:['free','lavish'].includes(per.key)?2:4;
    L.guilt=clamp(L.guilt+sensitivity,0,100);
    if(L.partner&&L.guilt>=45&&Math.random()<.35){
      if(per.key==='obsessive'){
        const r=metRecord(L,L.partner.name);if(r)r.obsession=clamp((r.obsession||0)+7,0,100);
        queueImportantEvent({type:'love',icon:'🖤',title:`${L.partner.name}의 뒤틀린 안심`,desc:'잘못을 털어놓자 상대는 비난하는 대신 “이제 나한테 약점이 생겼네요”라고 말했습니다.',detail:'죄책감은 줄지 않았고 상대의 집착이 증가했습니다.',tone:'bad'});
      }else{
        L.affection=Math.max(0,(L.affection||0)-sensitivity);L.stress=clamp((L.stress||0)+5,0,100);
        queueImportantEvent({type:'love',icon:'⚡',title:`${L.partner.name}와 도덕성 갈등`,desc:`${per.name||'상대'} 성향의 연인은 최근 선택들을 더는 모른 척하기 어렵다고 말했습니다.`,detail:`친밀도 -${sensitivity} · 스트레스 +5 · 죄책감 ${Math.round(L.guilt)}`,tone:'bad'});
      }
    }
  }
  if(L.guilt>=80){L.happy=clamp(L.happy-6,0,100);L.stress=clamp(L.stress+8,0,100);addNews('🌫️ 쌓인 죄책감 때문에 잠을 이루지 못했습니다','bad');}
}

function rewindDangerousRelationship(r){
  const L=S.life;
  if(L.partner&&L.partner.name===r.name){L.partner=null;L.relationship='single';L.affection=0;}
  const poly=ensurePolycule(L);poly.members=(poly.members||[]).filter(person=>person.name!==r.name);
  if(!poly.members.length){poly.active=false;poly.mode=null;poly.trust=0;}
  r.status='friend';r.spentNight=false;r.nightsTogether=0;r.dangerAwakened=false;r.dangerSource=null;
  if(r.name==='윤세라'){r.obsession=55;r.yandere=false;}else r.dangerLevel=42;
  L.captivityEnding=false;L.dangerousEnding=null;L.seraIntrusionDay=null;
  S.paused=false;
  addNews(`↩️ ${r.name}와 위험해지기 전, 친구 관계를 택한 시점으로 돌아갔습니다`,'neutral');
  autoSave();location.reload();
}
function showDangerousHeroineEnding(r){
  if(S.timer){clearInterval(S.timer);S.timer=null;}S.phase='closed';S.paused=true;
  const host=$('life-modal');if(!host)return;
  const yujin=r.name==='강유진',scene=yujin?'./assets/event-yujin-safehouse-ending.png':'./assets/event-chaerin-golden-cage-ending.png';
  const L=S.life;L.dangerousEnding={name:r.name,day:S.day};
  host.style.display='flex';host.className='life-modal-host captivity-meta-host';
  host.innerHTML=`<div class="window event-window captivity-ending-window"><div class="title-bar"><div class="title-bar-text">🔒 ${r.name} 배드엔딩 · ${yujin?'보호관찰':'황금 계약'}</div></div><div class="window-body"><img class="life-scene-banner" src="${scene}" alt="${r.name} 전용 감금엔딩 컷신"><div class="date-profile"><img class="char-portrait" src="${characterPortrait(r,'sad')}" alt="${r.name}"><div><strong>${r.name}</strong><br><span class="down">위험도 ${Math.round(r.dangerLevel||100)}/100</span></div></div><div class="event-title">${yujin?'“밖이 위험한데 왜 굳이 나가려고 해요?”':'“네가 고를 수 있는 건 내가 준비한 것들뿐이야.”'}</div><div class="event-desc">${yujin?'유진은 사건과 빚과 위협에서 당신을 완벽히 분리했습니다. 문제는 그 안전가옥의 외출 허가도 유진이 쥐고 있다는 것입니다.':'채린은 빚과 집과 직업을 모두 해결했습니다. 대신 계좌, 열쇠, 일정표 어디에도 채린의 승인 없이 열리는 출구가 남지 않았습니다.'}</div><div class="important-event-detail">친구일 때는 발생하지 않습니다. 연애 또는 하룻밤 이후 누적된 위험 선택의 결말입니다.</div><button id="danger-ending-rewind" class="session-btn opening">↩️ 위험해지기 전 관계 선택으로 돌아가기</button><button id="danger-ending-restart" class="hot">🔁 완전히 새 인생 시작</button></div></div>`;
  $('danger-ending-rewind').addEventListener('click',()=>rewindDangerousRelationship(r));
  $('danger-ending-restart').addEventListener('click',()=>{localStorage.removeItem(LS_KEY);location.reload();});
  autoSave();playSound('crash');
}

function showCaptivityEnding(r){
  if(S.timer){clearInterval(S.timer);S.timer=null;}S.phase='closed';S.paused=true;
  const host=$('life-modal');if(!host)return;host.style.display='flex';
  if(r.name!=='윤세라'){
    host.innerHTML=`<div class="window event-window"><div class="title-bar"><div class="title-bar-text">🔒 배드엔딩 · 닫힌 방</div></div><div class="window-body"><div class="date-profile"><img class="char-portrait" src="${characterPortrait(r,'sad')}" alt="${r.name}"><div><strong>${r.name}</strong><br><span class="down">집착 ${Math.round(r.obsession||100)}/100</span></div></div><div class="event-title">“이제 아무도 우리 사이를 방해하지 못해.”</div><div class="event-desc">반복된 통제 요구를 방치한 끝에 일상이 완전히 끊겼습니다. 이것은 사랑의 결말이 아니라 관계의 경고를 무시한 결과입니다.</div><button id="captivity-restart" class="hot">🔁 새 인생 시작</button></div></div>`;
    $('captivity-restart').addEventListener('click',()=>{localStorage.removeItem(LS_KEY);location.reload();});
    autoSave();playSound('crash');return;
  }
  const rescuers=captivityRescuers(S.life);
  const rescueButtons=rescuers.map(rescuer=>`<button class="event-opt ${rescuer.success?'':'hot'}" data-captivity-rescue="${rescuer.id}">${rescuer.icon} ${rescuer.label}<small>${rescuer.hint}</small></button>`).join('');
  host.className='life-modal-host captivity-meta-host';
  host.innerHTML=`<div class="window event-window captivity-ending-window"><div class="title-bar"><div class="title-bar-text">🔒 윤세라 배드엔딩 · 닫힌 방</div></div><div class="window-body"><img class="life-scene-banner" src="./assets/event-sera-doorstep.png" alt="잠긴 방 앞에 선 윤세라"><div class="date-profile"><img class="char-portrait" src="${characterPortrait(r,'sad')}" alt="${r.name}"><div><strong>${r.name}</strong><br><span class="down">집착 ${Math.round(r.obsession||100)}/100 · 얀데레 고착</span></div></div><div class="event-title">“이제 아무도 우리 사이를 방해하지 못해.”</div><div class="event-desc" id="captivity-ending-text">세라는 휴대전화와 열쇠를 치우고, 당신이 알던 일상의 흔적을 하나씩 지웠습니다. 이것은 사랑의 결말이 아니라 경고와 경계를 계속 미룬 결과입니다.</div>${rescueButtons?`<div class="captivity-rescue-box"><b>문 밖에서 움직이는 사람들</b><div class="event-options">${rescueButtons}</div></div>`:'<div class="important-event-detail">남겨 둔 증거도, 위기를 알아챌 만큼 가까운 사람도 없습니다.</div>'}<button id="captivity-rewind" class="session-btn opening">↩️ 위험해지기 전 관계 선택으로 돌아가기</button><button id="captivity-restart" class="hot">🔁 완전히 새 인생 시작</button></div></div>`;
  host.querySelectorAll('[data-captivity-rescue]').forEach(button=>button.addEventListener('click',()=>resolveCaptivityRescue(button.dataset.captivityRescue,r)));
  const rewind=$('captivity-rewind');if(rewind)rewind.addEventListener('click',()=>rewindDangerousRelationship(r));
  const restart=$('captivity-restart');if(restart)restart.addEventListener('click',()=>captivityRestartAttempt(r));
  autoSave();playSound('crash');
}

function captivityRescuers(L){
  const list=[];
  const ready=(name,min=25)=>{const rec=metRecord(L,name);return rec&&rec.status!=='ex'&&((rec.trust||0)>=min||(rec.affection||0)>=min+10||L.alliedRescue);};
  if(ready('강유진'))list.push({id:'yujin',icon:'👮‍♀️',label:'강유진이 남겨 둔 증거를 따라온다',hint:L.seraEvidence||L.policeSafetyPlan?'기록과 순찰 계획으로 구조 가능':'친밀도와 신뢰로 위치 추적',success:true});
  if(ready('한채린'))list.push({id:'chaerin',icon:'👑',label:'한채린의 경호팀이 위치를 찾는다',hint:L.privateSecurity?'이미 배치한 경호망으로 구조 가능':'자금과 인맥으로 강제 진입',success:true});
  const faction=RIVALS.ensureFaction(L),taeseok=(faction.members||[]).find(member=>member.sourceId==='hantaeseok'&&(member.injuredMonths||0)<=0);
  if(taeseok)list.push({id:'hantaeseok',icon:'🤜',label:'한태석이 약속을 지키러 온다',hint:'특별 아군 · 세력의 퇴로까지 확보',success:true});
  const jang=metRecord(L,'장태식');
  if((L.makjang||jang)&&!(L.worldDeaths&&L.worldDeaths['장태식']))list.push({id:'taesik',icon:'🦈',label:'장태식이 빚을 받으러 문을 부순다',hint:'위험 · 구조 성공을 보장하지 않음',success:false});
  return list;
}

function clearSeraPartnership(r){
  const L=S.life;
  if(L.partner&&L.partner.name===r.name){L.partner=null;L.relationship='single';L.affection=0;}
  L.lovers=(L.lovers||[]).filter(person=>person.name!==r.name);
  const poly=ensurePolycule(L);poly.members=poly.members.filter(person=>person.name!==r.name);
  r.status='ex';r.idleMonths=0;
}

function resolveCaptivityRescue(rescuerId,r){
  const host=$('life-modal');if(!host)return;
  if(rescuerId==='taesik'){
    S.life.worldDeaths=S.life.worldDeaths||{};
    S.life.worldDeaths['장태식']={day:S.day,cause:'윤세라 감금사건 구조 시도'};
    const taesik=metRecord(S.life,'장태식');if(taesik)taesik.status='deceased';
    LEGACY.push(S.life,dateInfo(S.day).age,'🦈','장태식이 감금 현장에 들어갔다가 돌아오지 못했다','justice');
    host.innerHTML=`<div class="window event-window captivity-ending-window"><div class="title-bar"><div class="title-bar-text">🦈 실패한 구조 · 끊긴 연락</div></div><div class="window-body"><img class="life-scene-banner" src="./assets/life-debt-crisis.png" alt="불이 꺼진 복도"><div class="event-title">장태식은 문을 열었지만 당신을 데리고 나오지 못했습니다.</div><div class="event-desc">“돈 받기 전에는 못 죽어.” 마지막 통화 뒤 연락이 끊겼고, 다음 날 경찰을 통해 사망 소식이 확인됐습니다. 세라는 아무 일도 없었다는 듯 새 휴대전화를 당신 앞에 놓았습니다.</div><div class="important-event-detail down">장태식 사망 · 구조 실패 · 윤세라 잔류 루프 확정</div><button id="captivity-loop-start" class="hot">🖤 세라와 ‘새 인생’ 시작</button></div></div>`;
    $('captivity-loop-start').addEventListener('click',beginSeraLoop);
    addNews('🦈 장태식이 윤세라 감금사건에서 구조를 시도하다 사망했습니다','bad');autoSave();return;
  }
  const copy={
    yujin:{icon:'👮‍♀️',title:'강유진 · 기록이 만든 구조',text:'유진은 신고 이력과 이동 기록을 근거로 문을 열었습니다. 세라가 “연인끼리의 일”이라고 말했지만, 유진은 당신의 거절 의사를 직접 기록했습니다.',obsession:32,flag:'policeSafetyPlan'},
    chaerin:{icon:'👑',title:'한채린 · 값을 묻지 않은 구조',text:'채린의 경호팀은 건물의 소유 관계와 출입 기록부터 장악했습니다. 채린은 이번 한 번만큼은 계약서도 대가도 내밀지 않고 당신을 다른 거처로 옮겼습니다.',obsession:48,flag:'privateSecurity'},
    hantaeseok:{icon:'🤜',title:'한태석 · 사람으로 인정한 약속',text:'한태석은 세력 인원으로 건물의 출구를 막고 직접 당신을 데리고 나왔습니다. “한번 내 사람이라 했으면 끝까지 책임지는 거다.”',obsession:42,flag:'guardianRescue'}
  }[rescuerId];
  if(!copy)return;
  clearSeraPartnership(r);r.obsession=copy.obsession;r.yandere=r.obsession>=70;
  S.life.captivityEnding=false;S.life[copy.flag]=true;S.life.seraRescuedBy=rescuerId;S.life.stress=clamp((S.life.stress||0)+12,0,100);
  S.life.seraLoop=null;localStorage.removeItem(LS_SERA_LOOP);
  S.paused=false;
  LEGACY.push(S.life,dateInfo(S.day).age,copy.icon,`${copy.title}로 윤세라의 감금에서 탈출했다`,'love');
  host.className='life-modal-host';
  host.innerHTML=`<div class="window event-window"><div class="title-bar"><div class="title-bar-text">${copy.icon} 감금엔딩 분기 · 구조 성공</div></div><div class="window-body"><img class="life-scene-banner" src="${rescuerId==='yujin'?'./assets/event-yujin-rain-rescue.png':'./assets/life-faction-war.png'}" alt="${copy.title}"><div class="event-title">${copy.title}</div><div class="event-desc">${copy.text}</div><div class="important-event-detail">윤세라와 강제 이별 · 집착 ${r.obsession}/100 · 스트레스 +12<br>세라는 사라진 것이 아닙니다. 남겨 둔 증거와 보호망에 따라 이후 재등장 방식이 달라집니다.</div><button id="captivity-rescue-continue" class="session-btn opening">구조 이후의 삶 계속하기</button></div></div>`;
  $('captivity-rescue-continue').addEventListener('click',()=>{closeLifeModal();renderAll();renderMarketPhase();autoSave();});
  addNews(`${copy.icon} ${copy.title} · 윤세라 감금에서 탈출했습니다`,'good');autoSave();
}

function captivityRestartAttempt(r){
  const button=$('captivity-restart'),text=$('captivity-ending-text');
  if(!button||!text)return;
  const attempt=+(button.dataset.attempt||0);
  if(attempt===0){
    button.dataset.attempt='1';button.textContent='그래도 새로 시작한다';
    button.classList.add('captivity-glitch');
    text.innerHTML=`<b class="down">“어딜 가요?”</b><br>버튼을 누르는 순간 세라가 화면 밖의 당신을 바라봅니다. “여기까지 같이 왔는데, 혼자 처음부터 하려고요?”`;
    playSound('click');return;
  }
  button.remove();
  text.innerHTML=`<b class="down">“진짜 사라지려고 했어요?”</b><br>세라가 ‘새 인생 시작’ 버튼을 화면에서 지웠습니다. 잠시 뒤, 같은 자리에 전혀 다른 문구가 나타납니다.`;
  const body=text.closest('.window-body');
  setTimeout(()=>{
    if(!body||!document.body.contains(body))return;
    body.insertAdjacentHTML('beforeend','<button id="captivity-loop-start" class="hot sera-return-button">🖤 윤세라와 함께 새 인생 시작</button>');
    $('captivity-loop-start').addEventListener('click',beginSeraLoop);
  },650);
}

function beginSeraLoop(){
  const previous=readSeraLoop();
  localStorage.setItem(LS_SERA_LOOP,JSON.stringify({active:true,loops:(previous.loops||0)+1,startedAt:Date.now()}));
  localStorage.removeItem(LS_KEY);
  location.reload();
}

// 지금 이 사람과 어떤 사이인가 — 명부 카드에 붙는 배지
function relationTag(L, name) {
  const trioState=DANGEROUS_TRIO&&DANGEROUS_TRIO.ensure(L);
  if(trioState&&(trioState.active||trioState.ending)&&DANGEROUS_TRIO.NAMES.includes(name))return'위험한 결핍 공생';
  if (L.partner && L.partner.name === name) return L.relationship === 'married' ? '배우자' : '연인';
  const poly=ensurePolycule(L);if(poly.active&&poly.members.some(x=>x.name===name))return'합의한 다자연애';
  if ((L.lovers || []).some(x => x.name === name)) return '몰래 만나는 중';
  const rec = metRecord(L, name);
  if (!rec) return '아는 사람';
  return rec.status === 'ex' ? '전 연인' : rec.status === 'friend' ? '친구' : rec.status === 'casual' ? '가벼운 관계' : '아는 사람';
}
function ensurePolycule(L){if(!L.polycule||typeof L.polycule!=='object')L.polycule={active:false,members:[],trust:0};if(!Array.isArray(L.polycule.members))L.polycule.members=[];return L.polycule;}
function relationshipImage(L,name){
  const tag=relationTag(L,name);
  if(tag==='위험한 결핍 공생')return'./assets/event-trio-secure-home-ending.png';
  if(tag==='합의한 다자연애')return'./assets/relationship-polycule.png';
  if(tag==='배우자')return'./assets/relationship-married.png';
  if(tag==='연인'||tag==='몰래 만나는 중')return'./assets/relationship-dating.png';
  if(tag==='가벼운 관계')return'./assets/relationship-casual.png';
  return'./assets/relationship-friend.png';
}

function renderChatPanel(){
  const host=$('chat-panel');if(!host||!S.life)return;const L=S.life;
  const people=ensureMet(L).filter(r=>r.status!=='acquaintance'||personChat(L,r.name).messages.length);
  const contacts=(SOCIAL.ensure(L).contacts||[]).slice().sort((a,b)=>{
    const priority=c=>['mother','father','guardian'].includes(c.role)?0:c.role==='schoolfriend'?1:2;
    return priority(a)-priority(b)||(b.trust||0)-(a.trust||0);
  });
  if(S._chatContact){
    const c=contacts.find(x=>x.id===S._chatContact);if(!c){S._chatContact=null;return renderChatPanel();}
    const room=personChat(L,c.name),r=SOCIAL.role(c);room.unread=0;
    host.innerHTML=`<div class="chat-room contact-room"><button id="chat-back">↩ 연락처</button><div class="contact-chat-head"><span>${r.icon}</span><div><b>${c.name}</b> · ${c.relationLabel||r.name}<br><small>신뢰 ${Math.round(c.trust||0)} · 호의 ${c.favor||0}</small></div></div><div class="chat-log">${room.messages.length?room.messages.map(m=>`<div class="chat-bubble ${m.mine?'mine':''}"><small>${m.mine?'나':c.name} · ${dateInfo(m.day).year}년 ${dateInfo(m.day).month}월</small><br>${m.text}</div>`).join(''):'<span class="muted">아직 대화가 없습니다.</span>'}</div><div class="chat-readonly-note">🔒 연락은 장 마감 후 월말 팝업에서 한 번만 답할 수 있습니다.</div></div>`;
    $('chat-back').addEventListener('click',()=>{S._chatContact=null;renderChatPanel();});
    const log=host.querySelector('.chat-log');if(log)log.scrollTop=log.scrollHeight;return;
  }
  if(S._chatPerson){
    const r=metRecord(L,S._chatPerson);if(!r){S._chatPerson=null;return renderChatPanel();}
    const room=personChat(L,r.name);room.unread=0;
    const ttsOn=S.ttsOn&&VOICE;
    const risk=dangerousRiskMeta(r);
    host.innerHTML=`<div class="chat-room"><button id="chat-back">↩ 연락처</button><img class="relationship-scene" src="${relationshipImage(L,r.name)}" alt="${relationTag(L,r.name)} 관계 장면"><div class="date-profile"><img class="char-thumb" src="${characterPortrait(r)}" alt="${r.name}"><div><b>${r.name}</b> · ${relationTag(L,r.name)}<br><span class="muted">호감 ${Math.round(r.affection||0)} · 신뢰 ${Math.round(r.trust||0)} · 교류 ${ensureCourtship(r).interactions||0}회${risk?` · ${risk.icon}${risk.label} ${Math.round(risk.value)}`:''}</span></div></div><div class="chat-log">${room.messages.length?room.messages.map((m,mi)=>`<div class="chat-bubble ${m.mine?'mine':''}"><small>${m.mine?'나':r.name} · ${dateInfo(m.day).year}년 ${dateInfo(m.day).month}월</small><br>${m.text}${m.mine||!ttsOn?'':`<button class="bubble-tts" data-msg-i="${mi}" title="${r.name} 목소리로 듣기" aria-label="음성 재생">🔊</button>`}</div>`).join(''):'<span class="muted">아직 대화가 없습니다.</span>'}</div><div class="chat-readonly-note">${S.phase==='open'?'📈 장중에는 대화 기록만 볼 수 있습니다. 새 연락은 장 마감 뒤 도착합니다.':'🔒 이번 달 연락은 월말 팝업에서 한 번만 답할 수 있습니다.'}</div></div>`;
    $('chat-back').addEventListener('click',()=>{if(VOICE)VOICE.cancel();S._chatPerson=null;renderChatPanel();});
    host.querySelectorAll('.bubble-tts').forEach(b=>b.addEventListener('click',ev=>{ev.stopPropagation();const m=room.messages[+b.dataset.msgI];if(m)speakPerson(r,m.text);}));
    const log=host.querySelector('.chat-log');if(log)log.scrollTop=log.scrollHeight;return;
  }
  const contactRows=contacts.map(c=>{const room=personChat(L,c.name),last=room.messages[room.messages.length-1],r=SOCIAL.role(c);return`<button class="chat-contact social-chat-contact" data-chat-contact="${c.id}"><span class="contact-avatar">${r.icon}</span><span><b>${c.name}</b> · ${c.relationLabel||r.name}<br><span class="chat-preview">${last?last.text:'먼저 안부를 물어보세요.'}</span></span>${room.unread?`<span class="chat-unread">${room.unread}</span>`:''}</button>`;}).join('');
  const romanceRows=people.map(r=>{const room=personChat(L,r.name),last=room.messages[room.messages.length-1];return`<button class="chat-contact" data-chat-person="${r.name}"><img src="${characterPortrait(r)}" alt="${r.name}"><span><b>${r.name}</b> · ${relationTag(L,r.name)}<br><span class="chat-preview">${last?last.text:'대화를 시작해보세요.'}</span></span>${room.unread?`<span class="chat-unread">${room.unread}</span>`:''}</button>`;}).join('');
  host.innerHTML=`<div class="chat-list"><div class="hub-note">가족·학창 친구·업계 인맥·연애 상대가 한 연락처에 함께 저장됩니다. 관계마다 대화와 효과가 다릅니다.</div>${contactRows?`<div class="chat-group-title">🏠 가족·친구·인맥</div>${contactRows}`:''}${romanceRows?`<div class="chat-group-title">💕 친구·연애 관계</div>${romanceRows}`:''}${!contactRows&&!romanceRows?'<span class="muted">아직 저장된 연락처가 없습니다.</span>':''}</div>`;
  host.querySelectorAll('[data-chat-contact]').forEach(b=>b.addEventListener('click',()=>{S._chatPerson=null;S._chatContact=b.dataset.chatContact;renderChatPanel();autoSave();}));
  host.querySelectorAll('[data-chat-person]').forEach(b=>b.addEventListener('click',()=>{S._chatPerson=b.dataset.chatPerson;renderChatPanel();autoSave();
    // 방을 열면 상대의 최근 메시지를 그 인물 목소리로 읽어준다(사람이 부르듯)
    const rr=metRecord(L,b.dataset.chatPerson),rm=rr&&personChat(L,rr.name);
    const last=rm&&[...rm.messages].reverse().find(m=>!m.mine);
    if(last)speakPerson(rr,last.text);
  }));
}
function replyToContact(c,kind,options){
  const L=S.life,room=personChat(L,c.name);options=options||{};
  if(room.lastReplyDay===S.day){if(!options.popup)flashToast('📱 이번 달에는 이미 답장했습니다','neutral');return{ok:false};}
  room.lastReplyDay=S.day;
  const text=SOCIAL.contactAnswer(c,kind);pushPersonMessage(L,c,text,true);
  const gain=kind==='meet'?6:kind==='advice'?4:kind==='warm'?3:1;c.trust=clamp((c.trust||0)+gain,0,100);
  if(kind==='meet'&&Math.random()<.35)c.favor=clamp((c.favor||0)+1,0,5);
  if(['mother','father','guardian'].includes(c.role)&&['warm','meet'].includes(kind))L.familyBond=clamp((L.familyBond||0)+2,0,100);
  const answers={
    meet:['좋지. 날짜 정해지면 다시 알려줘.','그래, 얼굴 보고 천천히 이야기하자.'],
    advice:['네가 혼자 정답을 만들 필요는 없어. 내가 아는 만큼 같이 생각해볼게.','결정은 네가 하되, 감당하기 어려운 부분은 나눠도 돼.'],
    warm:['나도 네 연락 기다렸어. 별일 없어도 자주 연락하자.'],
    brief:['응, 바쁜 것 같으니 나중에 편할 때 다시 이야기하자.'],
  };
  const answer=pick(answers[kind]||answers.brief);pushPersonMessage(L,c,answer,false);
  if(!options.popup)renderChatPanel();renderLifePanel();autoSave();return{ok:true,text,answer};
}
function replyToPerson(r,kind,options){
  const L=S.life,room=personChat(L,r.name);options=options||{};
  if(room.lastReplyDay===S.day){if(!options.popup)flashToast('📱 이번 달에는 이미 답장했습니다','neutral');return{ok:false};}
  room.lastReplyDay=S.day;
  const text=(window.QT_CHAT&&QT_CHAT.playerReply(kind))||
    {warm:'오늘 정신이 없었어. 그래도 네 연락 보니까 좋다.',brief:'응, 확인했어. 나중에 연락할게.',boundary:'연락이 늦을 수 있어. 재촉하거나 위치를 확인하는 건 하지 말아줘.',ignore:'(읽음)'}[kind];
  pushPersonMessage(L,r,text,true);r.idleMonths=0;
  if(kind==='warm'){r.affection=Math.min(100,(r.affection||0)+3);r.trust=Math.min(100,(r.trust||0)+2);if(r.name==='윤세라')r.obsession=Math.min(100,(r.obsession||0)+3);}
  else if(kind==='boundary'){r.trust=Math.min(100,(r.trust||0)+2);if(r.name==='윤세라')r.obsession=Math.max(0,(r.obsession||0)-4);else if(isDangerousHeroine(r))r.dangerLevel=Math.max(0,(r.dangerLevel||0)-6);}
  else if(kind==='ignore'){r.affection=Math.max(0,(r.affection||0)-2);if(r.name==='윤세라')r.obsession=Math.min(100,(r.obsession||0)+7);}
  if(kind!=='ignore')addBondInteraction(r,`message-${kind}`);
  let answer='';
  if(kind!=='ignore'){
    const ctx={tag:relationTag(L,r.name),personality:r.personality,special:r.special,obsession:r.obsession||0};
    answer=(window.QT_CHAT&&QT_CHAT.partnerAnswer(r,kind,ctx))||
      (kind==='boundary'?'알겠어요. 약속한 선은 지켜볼게요.':kind==='warm'?'먼저 연락해줘서 기뻐요.':'별일 없었어요. 당신은 오늘 어땠어요?');
    if(answer)pushPersonMessage(L,r,answer,false);
  }
  if(!options.popup)renderChatPanel();renderLifePanel();autoSave();return{ok:true,text,answer};
}

function relationshipDateLine(L, c) {
  const tag = relationTag(L, c.name);
  const per = D.PERSONALITIES[c.personality] || {};
  if (tag === '배우자') return pick([
    `결혼 뒤에도 일부러 약속을 잡으니 ${c.name}님이 "이런 시간이 계속 필요했어"라고 말했다.`,
    `${c.name}님과 생활비와 집안일 얘기까지 마친 뒤에야 편하게 웃을 수 있었다.`
  ]);
  if (tag === '연인') return pick([
    `${c.name}님은 "요즘 우리 사이, 당연하게 여기고 있진 않지?"라고 조심스럽게 물었다.`,
    `${per.name || '상대'}다운 방식으로 애정을 확인하는 대화가 이어졌다.`
  ]);
  if (tag === '몰래 만나는 중') return pick([
    `${c.name}님은 휴대폰 화면을 뒤집어 놓고 "오늘도 그 사람한텐 비밀이야?"라고 물었다.`,
    `즐거운 순간에도 들킬지 모른다는 긴장 때문에 대화가 자꾸 끊겼다.`
  ]);
  return `${c.name}님과 아직 관계를 정하지 않은 채 서로를 더 알아갔다.`;
}

function proposalResult(c, rec, tier) {
  const per = D.PERSONALITIES[c.personality] || {};
  const affection = rec.affection || 0;
  if (tier !== '성공' || affection < 60 || (rec.trust||0)<18 || (rec.dates || 0) < 3 || knownMonths(rec)<3) return { attempted: false };
  const chance = clamp((per.confess || 0.5) + (affection - 60) / 140+(rec.trust||0)/500, 0.25, 0.92);
  return { attempted: true, accepted: Math.random() < chance, chance };
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
  if(route&&route.office&&ORIGIN){
    const jobs=ORIGIN.WORKPLACE_HEROINE_JOBS[L.job]||[];
    const sameIndustry=D.CHARACTERS.filter(c=>c.gender==='f'&&jobs.includes(c.job));
    if(sameIndustry.length)pool=sameIndustry;
  }
  if (route && Array.isArray(route.pool) && route.pool.length) {
    const filtered = pool.filter(c => route.pool.includes(c.personality));
    if (filtered.length) pool = filtered;
  }
  const taken = exclude || [];
  // 아는 사람이 초면인 척 다시 소개되지 않도록, 정말 처음 보는 사람만 뽑는다
  const fresh = pool.filter(c => !isKnownPerson(L, c.name) && !taken.includes(c.name));
  if (!fresh.length) return null;   // 로스터를 다 만났다 — 새로 소개받을 사람 없음
  const c = Object.assign({}, pick(fresh));
  const pAge = dateInfo(S.day).age;              // 플레이어 또래 위주로 만난다
  c.age = clamp(pAge + Math.round(rand(-5, 6)), 19, 55);
  Object.assign(c, ROMANCE_META[c.personality] || ROMANCE_META.caring);
  if (route && route.office) c.workplace = '같은 직장·업계';  // 고유 직업은 유지한다
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
  s += relationshipJobMod(S._dateCandidate || {});
  if((S._dateCandidate||{}).special==='heiress')s += ['listen','vulnerable'].includes(approach.key)?13:['direct','push'].includes(approach.key)?-12:0;
  s += (S._dateCompanion && S._dateCompanion.scoreMod) || 0;
  // 이미 아는 사람이면 쌓아온 호감도만큼 수월해진다 (최대 +20)
  const rec = S._dateCandidate && metRecord(L, S._dateCandidate.name);
  if (rec) s += Math.min(20, (rec.affection || 0) * 0.15);
  if (approach.flexReward) s += (S.capital >= (approach.cost || 0) + dateBaseCost()) ? approach.flexReward : -15;
  if (approach.variance) s += rand(-approach.variance, approach.variance);
  s += rand(0, 25);                               // 기본 운
  return s;
}

// 이번 데이트의 기본 비용(경로별로 다름, 연인 데이트는 기본값)
function dateBaseCost() {
  const base = S._dateRoute ? (S._dateRoute.cost || D.RELATIONSHIP.DATE_COST) : D.RELATIONSHIP.DATE_COST;
  return Math.max(0, Math.round(base * ((S._dateCompanion && S._dateCompanion.costMul) || 1)));
}

// 데이트 버튼 → 먼저 혼자 갈지, 친구·인맥과 함께 갈지 고른다.
const DATE_SCENE_IMAGES = {
  solo: './assets/date-route-solo.png',
  friend: './assets/date-route-friend.png',
  contact: './assets/date-route-contact.png',
  success: './assets/date-result-success.png',
  normal: './assets/date-result-normal.png',
  fail: './assets/date-result-fail.png',
};

function dateSceneImage(key) {
  return DATE_SCENE_IMAGES[key] || DATE_SCENE_IMAGES.solo;
}

function currentDateSceneImage() {
  return (S._dateRoute && S._dateRoute.scene) || dateSceneImage((S._dateCompanion && S._dateCompanion.type) || 'solo');
}

function doDate() { showDateCompanyModal(); syncBGM(); }

function showDateCompanyModal() {
  const host = $('date-host'); if (!host) return;
  const L = S.life;
  const friends = ensureMet(L).filter(m => m.status !== 'ex' && (!L.partner || m.name !== L.partner.name));
  const contacts = (SOCIAL.ensure(L).contacts || []).filter(c=>!['mother','father','guardian'].includes(c.role));
  const friendCards = friends.slice().sort((a,b)=>(b.affection||0)-(a.affection||0)).slice(0,4).map((m,i) =>
    `<button class="route-card companion-card" data-kind="friend" data-i="${i}">
       <div class="rc-head">🙂 ${m.name}님과 같이 가기 <span class="muted">호감도 ${Math.round(m.affection||0)}</span></div>
       <div class="rc-person"><img class="char-thumb" src="${characterPortrait(m)}" alt="${m.name}"><span>어색함을 풀어주고 만남 성공 점수 +6</span></div>
     </button>`).join('');
  S._dateFriends = friends.slice().sort((a,b)=>(b.affection||0)-(a.affection||0)).slice(0,4);
  S._dateContacts = contacts.slice().sort((a,b)=>(b.trust||0)-(a.trust||0)).slice(0,4);
  const contactCards = S._dateContacts.map((c,i) => { const r=SOCIAL.role(c); return `<button class="route-card companion-card" data-kind="contact" data-i="${i}">
       <div class="rc-head">${r.icon} ${c.name}님과 같이 가기 <span class="muted">${r.name} · 신뢰 ${c.trust}</span></div>
       <div class="rc-person"><img class="char-thumb" src="${emojiAvatar({emoji:r.icon})}" alt="${c.name}"><span>소개와 대화를 도와 성공 점수 +${c.trust>=60?10:7} · 비용 15% 절약</span></div>
     </button>`; }).join('');
  host.style.display = 'block';
  host.innerHTML = `<div class="window event-window date-company-window">
    <div class="title-bar event-bar"><div class="title-bar-text">🌆 오늘 누구와 나갈까?</div><div class="title-bar-controls"><button aria-label="Close" id="date-company-x"></button></div></div>
    <div class="window-body">
      <img class="dating-banner date-scene" src="${dateSceneImage('solo')}" alt="데이트를 준비하는 저녁 풍경">
      <div class="event-desc">혼자 움직이면 자유롭고, 친구나 인맥과 함께 가면 소개와 대화에 도움을 받을 수 있어요.</div>
      <div class="route-list">
        <button class="route-card solo-card" data-kind="solo"><div class="rc-head">🚶 혼자 하기</div><div class="rc-person"><span>비용과 성공 보정 없이 직접 사람을 만나러 갑니다.</span></div></button>
        ${friendCards ? `<div class="route-sep">🙂 친구·아는 사람과 함께</div>${friendCards}` : '<div class="route-sep muted">아직 같이 갈 친구가 없어요. 데이트와 관계 행동으로 아는 사람을 만드세요.</div>'}
        ${contactCards ? `<div class="route-sep">🤝 인맥과 함께</div>${contactCards}` : '<div class="route-sep muted">아직 같이 갈 인맥이 없어요. 인맥 모임에서 사람을 만나보세요.</div>'}
      </div>
    </div></div>`;
  host.querySelectorAll('.companion-card,.solo-card').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.kind === 'friend') {
      const m=S._dateFriends[+b.dataset.i]; S._dateCompanion={type:'friend',name:m.name,scoreMod:6,costMul:1};
    } else if (b.dataset.kind === 'contact') {
      const c=S._dateContacts[+b.dataset.i]; S._dateCompanion={type:'contact',id:c.id,name:c.name,scoreMod:c.trust>=60?10:7,costMul:.85};
    } else S._dateCompanion={type:'solo',name:'혼자',scoreMod:0,costMul:1};
    showRouteModal();
  }));
  const x=$('date-company-x'); if(x)x.addEventListener('click',closeDateModal);
}

// 사람 카드 한 장 (연인/아는 사람/새 소개팅 상대 공용)
function personCardHTML(c, head, attrs, cls) {
  const per = D.PERSONALITIES[c.personality] || {};
  const g = (D.GENDER_LABEL || {})[c.gender] || '';
  const age = c.age ? ` · 만 ${c.age}세` : '';
  const prof = ROMANCE.profileOf(c);
  return `<button class="route-card ${cls || ''}" ${attrs}>
       <div class="rc-head">${head}</div>
       <div class="rc-person"><img class="char-thumb" src="${characterPortrait(c)}" alt="${c.name}"><span><strong>${c.emoji || ''}${c.name}</strong>${g ? ` · ${g}` : ''}${age} · ${c.job} · 월 ${won(partnerIncomeNow(c))}<br>${per.emoji || ''}${per.name || ''}${prof ? ` <span class="muted">· 🗣️ ${prof.style}</span>` : ''}</span></div>
     </button>`;
}

// 특수 캐릭터 조우 조건에 넘길 상황 정보 (피습·세력·빚 등 — 자연스러운 인연을 위해)
function specialRouteContext(L) {
  const faction = RIVALS.ensureFaction(L);
  return {
    factionLevel: faction.level || 0,
    factionMembers: (faction.members || []).length,
    factionFund: faction.fund || 0,
    attacked: (L._attackedRecently || 0) > 0,
    totalLoan: L.loan || 0,
  };
}

// 상대 고르기 — 연인 / 이미 아는 사람 / 경로별 새 소개팅 상대
function showRouteModal() {
  const host = $('date-host'); if (!host) return;
  const L = S.life;
  ensureMet(L);
  const inRel = L.relationship !== 'single' && L.partner;
  const ctx = specialRouteContext(L);
  const routes = D.DATE_ROUTES.filter(r => (!r.needsJob || (L.job && L.job !== 'none')) && (!r.condition || r.condition(L, ctx)));
  const seraRecord=metRecord(L,'윤세라'),yandereSera=seraRecord&&seraRecord.yandere?candidateFromRecord(seraRecord):null;
  // 같은 화면에 같은 사람이 두 번 뜨지 않도록 경로별로 순차 배정
  // 후보 풀이 좁은 경로부터 배정해야 넓은 경로가 먼저 사람을 채가지 않는다 (표시 순서는 원래대로)
  const taken = [];
  const poolSize = r => Array.isArray(r.pool) && r.pool.length ? r.pool.length : 99;
  const assigned = new Map();
  routes.slice().sort((a, b) => poolSize(a) - poolSize(b)).forEach(r => {
    const cand = yandereSera&&!r.fixed ? yandereSera : makeCandidate(r, taken);
    if (cand) { taken.push(cand.name); assigned.set(r.key, cand); }
  });
  S._dateOffers = routes.filter(r => assigned.has(r.key)).map(r => {const cand=assigned.get(r.key);return{route:cand.name==='윤세라'?Object.assign({},r,{scene:'./assets/event-sera-doorstep.png'}):r,cand};});

  // 이미 아는 사람들 — 연인은 따로, 양다리 상대·전 연인·그냥 아는 사람은 여기에
  const formerPartners = L.met.filter(m => m.status === 'ex');
  S._dateKnown = L.met.filter(m => m.status !== 'ex' && !(L.partner && L.partner.name === m.name)).map(candidateFromRecord);

  let cards = '';
  if (inRel) {
    cards += personCardHTML(Object.assign({ age: L.partner.age || 28 }, L.partner),
      `💞 ${L.relationship === 'married' ? '배우자' : '연인'}과 데이트 <span class="muted">비용 ${won(D.RELATIONSHIP.DATE_COST)} · 친밀도 ${Math.max(0, L.affection || 0)}</span>`,
      'data-partner="1"', 'partner-card');
  }
  if (S._dateKnown.length) {
    cards += `<div class="route-sep">📇 아는 사람과 외출하기 <span class="muted">대화와 외출로 가까워지면 정식 데이트가 열립니다</span></div>`;
    cards += S._dateKnown.map((c, i) => {
      const tag = relationTag(L, c.name);
      const idle = c.idleMonths >= 3 ? ` · <span class="down">${c.idleMonths}개월째 못 봄</span>` : '';
      const readiness=courtshipReadiness(c);
      return personCardHTML(c, `${readiness.ready?'💘 정식 데이트':'🌱 친분 외출'} · ${tag} · ${stageBadge(c.affection)} <span class="muted">호감 ${Math.round(c.affection || 0)} · 신뢰 ${Math.round(c.trust||0)} · 교류 ${c.interactions||0}회${idle}<br>${courtshipProgress(c)}</span>`,
        `data-known="${i}"`, 'known-card');
    }).join('');
  }
  S._dateEx = formerPartners.map(candidateFromRecord);
  if (formerPartners.length && L.relationship === 'single') {
    cards += `<div class="route-sep">💔 전 연인 <span class="muted">비용 ${won(D.RELATIONSHIP.DATE_COST)} · 다시 만나 재회를 노려볼 수 있어요</span></div>`;
    cards += S._dateEx.map((c, i) => personCardHTML(c,
      `💔 전 연인 · ${stageBadge(c.affection)} <span class="muted">호감도 ${Math.round(c.affection || 0)} · 재회 시도</span>`, `data-ex="${i}"`, 'known-card ex-card')).join('');
  } else if (formerPartners.length) {
    cards += `<div class="route-sep">💔 전 연인 <span class="muted">연애 중엔 전 연인과 만날 수 없어요</span></div>`;
    cards += S._dateEx.map(c => personCardHTML(c,
      `💔 전 연인 · <span class="muted">지금은 연락할 수 없습니다</span>`, 'disabled', 'known-card ex-card')).join('');
  }
  if (S._dateOffers.length) {
    cards += `<div class="route-sep">✨ 새로운 사람과 첫 조우 <span class="muted">첫 만남만으로 바로 연인이 되지는 않습니다</span></div>`;
    cards += S._dateOffers.map((o, i) =>
      personCardHTML(o.cand, `${o.route.emoji} ${o.route.name} <span class="muted">${o.route.desc} · 비용 ${won(o.route.cost)}</span>`,
        `data-i="${i}"`)).join('');
  } else {
    cards += `<div class="route-sep muted">더 이상 새로 소개받을 사람이 없어요. 아는 사람을 다시 만나보세요.</div>`;
  }
  const title = inRel ? '💘 누구와 만날까?' : '🌆 외출 — 누구를 만날까?';
  const companionHint = S._dateCompanion && S._dateCompanion.type !== 'solo'
    ? ` · <b>${S._dateCompanion.name}</b>님과 함께 왔어요${S._dateCompanion.type==='contact'?' (소개 도움·비용 절약)':' (대화 도움)'}` : '';
  const hint = (inRel ? '연인과 데이트하거나 아는 사람·새로운 사람을 몰래 만날 수도 있어요. 양다리는 발각 위험!'
    : '첫 조우 뒤 연락과 재회 이벤트로 친해지면 정식 데이트가 해금됩니다. 경로에 따라 새로 만나는 사람이 달라집니다.') + companionHint;
  host.style.display = 'block';
  host.innerHTML =
    `<div class="window event-window">
       <div class="title-bar event-bar"><div class="title-bar-text">${title}</div>
         <div class="title-bar-controls"><button aria-label="Close" id="route-x"></button></div></div>
       <div class="window-body">
         <img class="dating-banner date-scene" src="${currentDateSceneImage()}" alt="선택한 동행 방식의 데이트 풍경">
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
    if (b.dataset.ex != null) {
      S._dateRoute = null;
      S._dateCandidate = S._dateEx[+b.dataset.ex];
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
  const established=rec&&['casual','lover','polycule','ex'].includes(rec.status);
  S._dateMode=withPartner||established?'date':!rec?'encounter':courtshipReadiness(rec).ready?'date':'outing';
  const modeLabel=S._dateMode==='encounter'?'첫 조우':S._dateMode==='outing'?'친분 외출':'데이트';
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
       <div class="title-bar event-bar"><div class="title-bar-text">${S._dateMode==='date'?'💘':'🌱'} ${withPartner ? (L.relationship === 'married' ? '배우자와 데이트' : '연인과 데이트') : known ? `${c.name}님과 ${modeLabel}` : (route ? `${route.emoji} ${route.name} · 첫 조우` : modeLabel)}</div>
         <div class="title-bar-controls"><button aria-label="Close" id="date-x"></button></div></div>
       <div class="window-body">
         <img id="date-event-scene" class="dating-banner compact date-scene" src="${currentDateSceneImage()}" alt="데이트 시작 장면">
         <div class="date-profile">
           <img id="date-portrait" class="char-portrait" src="${characterPortrait(c)}" alt="${c.name}">
           <div class="dp-info"><strong>${c.emoji || ''}${c.name}</strong>${gLabel ? ` · ${gLabel}` : ''} · 만 ${c.age}세<br>
             <span class="muted">${c.job} · ${per.emoji || ''}${per.name || ''}${prof ? ` · 🗣️ ${prof.style}` : ''}</span><br>
             <span class="muted">관심사 ${(c.interests || []).join(' · ')} · 중요 가치 ${c.value || '신뢰'}</span>
             ${prof ? `<br><span class="muted">📖 ${prof.background}</span>` : ''}
              ${rec ? `<br><span class="muted">${stageBadge(rec.affection)} · 호감 ${Math.round(rec.affection || 0)} · 신뢰 ${Math.round(rec.trust||0)} · 교류 ${rec.interactions||0}회<br>${courtshipProgress(rec)}</span>` : '<br><span class="muted">🫥 오늘 처음 만나는 사람 · 첫 조우 후 관계가 시작됩니다</span>'}</div>
         </div>
          <div class="event-desc"><b>${modeLabel}</b> · 내 매력 <b>${Math.floor(S.life.charm)}</b> · 직업 매력 <b>+${jobOf().dateBonus || 0}</b>${route && route.scoreMod ? ` · 경로 <b>${route.scoreMod > 0 ? '+' : ''}${route.scoreMod}</b>` : ''} · 비용 <b>${won(dateBaseCost())}</b>${S._dateMode!=='date'?'<br><span class="muted">이번 만남에서는 연애를 정하지 않습니다. 대화와 신뢰를 쌓아 정식 데이트를 해금하세요.</span>':''}</div>
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
  S._romance = null;   // 이번 데이트의 연애 선택 대기 상태 초기화
  const cost = dateBaseCost() + (a.cost || 0);
  if (S.capital < cost) { flashToast('💸 현금이 부족합니다', 'bad'); playSound('error'); return; }
  S.capital -= cost;
  const dateMode=S._dateMode||'date';
  if(dateMode==='date')L.dates++;
  markMonthAction('데이트');
  if (S._dateCompanion && S._dateCompanion.type === 'friend') {
    const friend=metRecord(L,S._dateCompanion.name); if(friend){friend.affection=Math.min(100,(friend.affection||0)+2);friend.idleMonths=0;}
  } else if (S._dateCompanion && S._dateCompanion.type === 'contact') {
    const contact=SOCIAL.ensure(L).contacts.find(x=>x.id===S._dateCompanion.id); if(contact)contact.trust=Math.min(100,(contact.trust||0)+2);
  }

  const score = dateScore(a);
  let tier, dCharm, dHappy, bondGain, trustGain;
  if (score >= 70) {
    tier='성공';dHappy=dateMode==='date'?8:6;
    dCharm=Math.round(rand(3,6));bondGain=dateMode==='date'?Math.round(rand(8,14)):dateMode==='outing'?Math.round(rand(5,8)):Math.round(rand(6,9));trustGain=dateMode==='date'?3:4;
  } else if (score >= 45) {
    tier='보통';dHappy=3;
    dCharm=Math.round(rand(1,3));bondGain=dateMode==='date'?Math.round(rand(3,6)):Math.round(rand(2,5));trustGain=2;
  } else {
    tier='실패';dHappy=-4;
    dCharm=-Math.round(rand(1,3));bondGain=dateMode==='date'?-Math.round(rand(2,5)):0;trustGain=dateMode==='encounter'?0:-1;
  }
  const dateScene = $('date-event-scene');
  if (dateScene) {
    const sceneKey = tier === '성공' ? 'success' : tier === '보통' ? 'normal' : 'fail';
    dateScene.src = dateSceneImage(sceneKey);
    dateScene.alt = `데이트 ${tier} 결과 장면`;
    dateScene.classList.add('result-revealed');
  }
  c.mood = tier === '성공' ? 'happy' : tier === '실패' ? (score < 25 ? 'angry' : 'sad') : 'neutral';
  const datePortrait=$('date-portrait');if(datePortrait)datePortrait.src=characterPortrait(c,c.mood);
  const scene = pick(D.DATE_LINES[tier] || ['...']);
  const prevRec = metRecord(L, c.name);
  const voiceLine = ROMANCE.dateLine(c, tier, a.key, c.name, {
    first: !prevRec,                       // 처음 만나는 사람이면 첫인사부터
    affection: (prevRec && prevRec.affection) || 0,
  });
  const preference = (c.best || []).includes(a.key) ? '선택한 방식이 상대의 연애 성향과 잘 맞았다.' : '상대는 접근 방식보다 진심을 더 지켜보는 눈치다.';
  const relationContext = relationshipDateLine(L, c);
  const msg = `${scene}<br><br><b>${voiceLine}</b><br>${relationContext}<br>${preference}`;
  speakPerson(c, voiceLine);   // 데이트 상대의 대사를 그 인물 목소리로 들려준다
  L.charm = Math.max(0, L.charm + dCharm);
  L.happy = clamp(L.happy + dHappy, 0, 100);
  const withPartner = L.partner && L.partner.name === c.name;
  if (withPartner) L.affection = Math.max(0, (L.affection || 0) + bondGain);
  L.memories = L.memories || [];
  L.memories.unshift({ day: S.day, name: c.name, tier, approach: a.label });
  L.memories = L.memories.slice(0, 5);

  // 만난 사람은 명부에 남는다 — 헤어져도, 실패해도 기억한다
  const rec = rememberPerson(c);
  const beforeAff = rec.affection || 0;
  if(dateMode==='date')rec.dates = (rec.dates || 0) + 1;
  rec.affection = Math.max(0, beforeAff + bondGain);
  rec.trust=clamp((rec.trust||0)+trustGain,0,100);
  addBondInteraction(rec,dateMode);
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
  const readyStory=STORIES.next(rec);if(readyStory)extra+=`<br>📖 <b class="up">${c.name} 개인 스토리 「${readyStory.title}」가 열렸습니다. 장 마감의 가족·인맥 메뉴에서 진행할 수 있어요.</b>`;
  const perC = D.PERSONALITIES[c.personality] || {};
  if(dateMode!=='date'){
    const readiness=courtshipReadiness(rec);
    extra+=readiness.ready
      ? `<br>💘 <b class="up">${c.name}님과 충분히 가까워졌습니다. 다음 외출부터 정식 데이트를 제안할 수 있어요.</b>`
      : `<br>🌱 <span class="muted">이번에는 ${dateMode==='encounter'?'첫인사를 나누고 연락처를 저장했습니다':'부담 없는 외출로 서로를 더 알아갔습니다'}. ${courtshipProgress(rec)}</span>`;
    if(tier!=='실패'&&rec.status==='acquaintance')rec.status='friend';
  } else if (L.relationship === 'single') {
    // 연애 여부는 플레이어가 선택. 상대 성격에 따라 '먼저 고백(적극)' vs '내가 고백(소극)'이 갈린다
    const eligible = (tier === '성공' && (rec.affection || 0) >= 60 && (rec.trust||0)>=18 && (rec.dates || 0) >= 3 && knownMonths(rec)>=3);
    if (eligible) {
      const forward = perC.forward === true || (perC.confess != null ? perC.confess >= 0.6 : false);
      if (forward) {
        extra += `<br>💗 <b class="up">${c.name}님이 "우리 이제 사귈래요?"라며 먼저 고백했어요!</b>`;
        S._romance = { name: c.name, forward: true, html:
          `<div class="romance-choice"><button id="romance-accept" class="life-btn hot">💕 받아준다</button><button id="romance-friend" class="life-btn">🤝 친구로 지낸다</button><button id="romance-casual" class="life-btn">${isDangerousHeroine(c)?'🌙 함께 밤을 보낸다':'🌙 가볍게 만난다'}</button><button id="romance-decline" class="life-btn">🙅 거절한다</button></div>` };
      } else {
        const ch = clamp((perC.confess != null ? perC.confess : 0.5) + ((rec.affection || 0) - 60) / 140+(rec.trust||0)/500, 0.25, 0.92);
        extra += `<br>💗 <b>${c.name}님과 사귀고 싶다면 지금 고백해볼 수 있어요.</b> <span class="muted">(${perC.name || ''} 성향 · 성공 확률 약 ${Math.round(ch * 100)}%)</span>`;
        S._romance = { name: c.name, forward: false, chance: ch, html:
          `<div class="romance-choice"><button id="romance-confess" class="life-btn hot">💌 고백한다</button><button id="romance-friend" class="life-btn">🤝 친구가 된다</button><button id="romance-casual" class="life-btn">${isDangerousHeroine(c)?'🌙 함께 밤을 보낸다':'🌙 가볍게 만난다'}</button><button id="romance-skip" class="life-btn">⏳ 아직 아니다</button></div>` };
      }
    } else if (tier === '성공') {
      extra += `<br>🌱 <span class="muted">연애를 정하기엔 아직 이릅니다. 고백 조건: 호감 60 · 신뢰 18 · 정식 데이트 3회 · 알고 지낸 기간 3개월.</span>`;
      const casualReady=(rec.dates||0)>=2&&(rec.affection||0)>=35&&knownMonths(rec)>=2;
      S._romance={name:c.name,forward:false,html:`<div class="romance-choice"><button id="romance-friend" class="life-btn">🤝 친구로 지낸다</button>${casualReady?`<button id="romance-casual" class="life-btn">${isDangerousHeroine(c)?'🌙 함께 밤을 보낸다':'🌙 가볍게 만난다'}</button>`:''}<button id="romance-skip" class="life-btn">⏳ 더 알아본다</button></div>`};
    }
  } else if (!withPartner && tier === '성공') {
    L.lovers = L.lovers || [];
    const poly=ensurePolycule(L);
    const alreadyPoly=poly.active&&poly.members.some(x=>x.name===c.name);
    const alreadyLover = L.lovers.some(x => x.name === c.name);
    const proposal = proposalResult(c, rec, tier);
    if(poly.active&&!alreadyPoly&&proposal.attempted){
      if(poly.mode==='dangerous_trio'&&DANGEROUS_TRIO&&!DANGEROUS_TRIO.compatibleCandidate(c.name)){
        rec.trust=Math.max(0,(rec.trust||0)-3);
        extra+=`<br>🦂 <span class="muted">${c.name}님은 강유진·한채린·윤세라 사이의 위험한 견제 구조와 결이 맞지 않아 합류하지 않았습니다. 이 루트는 허락 확률이 아니라 정해진 결핍 조합으로만 유지됩니다.</span>`;
      }else{
      const accepts=polyculeCandidateFits(L,c)&&(rec.trust||0)>=35&&(poly.trust||0)>=40;
      if(accepts){const member={name:c.name,job:c.job,personality:c.personality,age:c.age,emoji:c.emoji,gender:c.gender,portrait:c.portrait};poly.members.push(member);poly.trust=Math.min(100,(poly.trust||0)+5);rec.status='polycule';extra+=`<br>🌈 <b class="up">${c.name}님은 기존 구성원과 같은 <b>${groupToneLabel(relationshipGroupTone(c))}</b> 결이어서 관계에 합류했습니다.</b>`;}
      else{rec.trust=Math.max(0,(rec.trust||0)-3);extra+=`<br>🛑 <span class="muted">${c.name}님은 기존 구성원과 관계의 결이 맞지 않거나 신뢰가 부족해 합류하지 않았습니다. 확률 판정은 없습니다.</span>`;}
      }
    } else if(alreadyPoly){
      extra+=`<br>🌈 <span class="up">${c.name}님과 합의된 관계 안에서 데이트했습니다.</span>`;
    } else if (!alreadyLover && proposal.attempted && proposal.accepted) {
      L.lovers.push({ name: c.name, job: c.job, personality: c.personality, age: c.age, emoji: c.emoji, gender: c.gender, portrait: c.portrait });
      changeMorality(-12,'연인 몰래 다른 관계를 시작했습니다');
      rec.status = 'lover';
      extra += `<br>💘 <b class="down">${c.name}님과도 몰래 만나기 시작… 양다리! (발각 주의)</b>`;
    } else if (alreadyLover) {
      extra += `<br>😈 <span class="down">${c.name}님과 몰래 만남을 이어갔다. (${stageBadge(rec.affection)})</span>`;
    } else {
      extra += `<br>🛑 <span class="muted">${c.name}님은 현재 연인이 있다는 사실을 의식하며 선을 그었다.</span>`;
    }
  }
  const meetingLabel=dateMode==='encounter'?'첫 조우':dateMode==='outing'?'친분 외출':'데이트';
  addNews(`${dateMode==='date'?'💘':'🌱'} ${c.name}와의 ${meetingLabel} — ${tier}`, tier === '실패' ? 'bad' : 'good');
  playSound(tier === '실패' ? 'error' : 'buy');

  const host = $('date-host');
  const ow = host.querySelector('.event-options'); if (ow) ow.innerHTML = '';
  const ca = host.querySelector('.close-actions'); if (ca) ca.remove();   // 결과가 나오면 '다른 사람 고르기'는 감춘다
  const changes = [`매력 ${dCharm >= 0 ? '+' : ''}${dCharm}`, `${c.name} 호감 ${bondGain>=0?'+':''}${bondGain}`, `신뢰 ${trustGain>=0?'+':''}${trustGain}`, `교류 ${rec.interactions}회`, `행복 ${dHappy >= 0 ? '+' : ''}${dHappy}`, `현금 -${won(cost)}`];
  if (S._dateCompanion && S._dateCompanion.type !== 'solo') changes.push(`${S._dateCompanion.name} 동행 관계 +2`);
  const base = `<div class="oc-text"><b class="${tier === '실패' ? 'down' : 'up'}">[${tier}]</b> ${msg}${extra}</div>` +
    `<div class="oc-changes">${changes.join(' · ')}</div>`;
  if (S._romance && S._romance.html) {
    // 연애 시작 여부를 플레이어가 선택
    $('date-outcome').innerHTML = base + S._romance.html;
    wireRomanceChoice(c);
  } else {
    $('date-outcome').innerHTML = base + `<button id="date-confirm" class="session-btn opening">확인</button>`;
    const cf = $('date-confirm'); if (cf) cf.addEventListener('click', closeDateModal);
  }
  renderCapital(); renderLifePanel(); checkAchievements(); autoSave();
}

function wireRomanceChoice(c) {
  const acc = $('romance-accept'), dec = $('romance-decline'), con = $('romance-confess'), skip = $('romance-skip'), friend=$('romance-friend'), casual=$('romance-casual');
  if (acc) acc.addEventListener('click', () => romanceResolve('accept'));
  if (dec) dec.addEventListener('click', () => romanceResolve('decline'));
  if (con) con.addEventListener('click', () => romanceResolve('confess'));
  if (skip) skip.addEventListener('click', () => romanceResolve('skip'));
  if (friend) friend.addEventListener('click', () => romanceResolve('friend'));
  if (casual) casual.addEventListener('click', () => romanceResolve('casual'));
}

function relationshipReaction(c,rec,kind){
  const per=D.PERSONALITIES[c.personality]||{};
  const chastity=rec.chastity==null?(per.chastity==null?55:per.chastity):rec.chastity;
  const lines={
    caring:{friend:'잠깐 아쉬운 표정을 지었지만, 관계를 오래 지키는 쪽을 택하자며 웃었다.',casual:'웃고는 있지만 “가볍게”라는 단어에서 시선이 흔들렸다.',decline:'당신을 곤란하게 하고 싶지 않았다며 애써 먼저 괜찮다고 말했다.'},
    homebody:{friend:'천천히 가까워지는 편이 좋다며 연락은 계속하자고 했다.',casual:'애매한 관계가 오래가면 힘들 것 같다며 확답을 요구했다.'},
    free:{friend:'좋다며 부담 없이 종종 만나자고 했다.',casual:'서로의 자유와 선을 먼저 정하자며 오히려 편해했다.'},
    cold:{friend:'감정을 서두르지 않는 결정이라며 담담하게 받아들였다.',casual:'조건과 연락 빈도를 분명히 하자고 짧게 말했다.'},
    obsessive:{friend:'“친구면 계속 연락해도 되는 거죠?”라고 몇 번이나 확인했다.',casual:'“가벼워도 결국 나만 보게 될 거예요.” 웃는 얼굴이 이상할 만큼 진지했다.'},
    ambitious:{friend:'서로 도움이 되는 관계부터 시작하자고 현실적으로 정리했다.',casual:'시간을 낭비하는 관계는 싫다며 당신의 진짜 의도를 물었다.'}
  };
  const specialLines={
    police:{friend:'유진은 개인 번호를 다시 확인시켜주며 “친구라도 위험한 일은 바로 말해요”라고 했다.',casual:'유진은 웃음을 거두고 “가볍다는 말로 사람 마음까지 가벼워지진 않아요”라고 되물었다.'},
    obsessive:{friend:'세라는 “친구면 계속 옆에 있어도 되는 거죠?”라고 대답을 재촉했다.',casual:'세라는 기다렸다는 듯 웃으며 “나중에 다른 말 하면 안 돼요”라고 속삭였다.'},
    heiress:{friend:'채린은 친구라는 단어를 받아들이면서도 당신의 다음 일정을 비서에게 확인시켰다.',casual:'채린은 “내가 가벼운 취급을 받아본 적은 없는데”라며 오히려 승부욕을 드러냈다.'}
  };
  const text=(specialLines[c.special]&&specialLines[c.special][kind])||(lines[c.personality]&&lines[c.personality][kind])||({accept:'놀란 뒤 천천히 손을 내밀었다.',confess:'대답하기 전 당신의 표정을 오래 살폈다.',skip:'지금은 결론보다 다음 약속을 잡기로 했다.',decline:'짧은 침묵 뒤 고개를 끄덕였다.',friend:'친구로 천천히 알아가기로 했다.',casual:'서로 원하는 관계가 같은지 다시 확인했다.'}[kind]);
  return{chastity,text};
}

function previewRomanceChoice(kind){
  const c=S._dateCandidate;if(!c)return;
  const bond=S.life.dangerousTrioBond;
  if(bond&&bond.active&&!isDangerousHeroine(c)&&['accept','confess','casual'].includes(kind)){
    showTrioBlocksAffair(c);return;
  }
  const rec=rememberPerson(c),reaction=relationshipReaction(c,rec,kind);
  const labels={accept:'고백을 받아준다',decline:'거절한다',confess:'고백한다',friend:'친구가 된다',casual:isDangerousHeroine(c)?'함께 밤을 보낸다':'가벼운 만남을 제안한다',skip:'더 알아본다'};
  const box=$('date-outcome');if(!box)return;
  const old=box.querySelector('.romance-choice');if(old)old.remove();
  const div=document.createElement('div');div.className='relation-preview';
  const scene=kind==='casual'?'relationship-casual.png':kind==='friend'?'relationship-friend.png':['accept','confess'].includes(kind)?'relationship-dating.png':'date-result-normal.png';
  const risk=dangerousRiskMeta(rec);
  div.innerHTML=`<img class="relationship-scene" src="./assets/${scene}" alt="관계 선택 장면"><b>💬 ${c.name}의 반응</b><p>${reaction.text}</p><span class="muted">${(D.PERSONALITIES[c.personality]||{}).name||'보통'} 성향 · 순결 성향 ${Math.round(reaction.chastity)}/100${risk?` · ${risk.icon}${risk.label} ${Math.round(risk.value)}/100`:''} · 직업 궁합 ${relationshipJobMod(c)>=0?'+':''}${relationshipJobMod(c)}</span><div class="romance-choice"><button id="romance-final" class="life-btn hot">${labels[kind]} 확정</button><button id="romance-back" class="life-btn">다시 생각한다</button></div>`;
  box.appendChild(div);
  $('romance-final').addEventListener('click',()=>romanceResolve(kind,true));
  $('romance-back').addEventListener('click',()=>{div.remove();const temp=document.createElement('div');temp.innerHTML=S._romance.html;box.appendChild(temp.firstElementChild);wireRomanceChoice(c);});
}
function showTrioBlocksAffair(c){
  const box=$('date-outcome'),choice=box&&box.querySelector('.romance-choice');if(!box||!choice)return;
  const final=choice.querySelector('#romance-final');
  if(final){final.disabled=true;final.textContent='💥 세 사람이 선택지를 지웠습니다';final.classList.add('trio-choice-vanish');setTimeout(()=>final.remove(),420);}
  const back=choice.querySelector('#romance-back');if(back){const clean=back.cloneNode(true);clean.disabled=false;clean.textContent='세 사람에게 돌아간다';back.replaceWith(clean);clean.addEventListener('click',closeDateModal);}
  const blockers=pick([['강유진','한채린'],['한채린','윤세라'],['윤세라','강유진']]);
  blockers.forEach(name=>{const r=metRecord(S.life,name);if(r)pushPersonMessage(S.life,r,name==='강유진'?`${c.name} 씨한테는 내가 먼저 경고했어요. 선택 실수하지 마요.`:name==='한채린'?`${c.name}? 비서실에서 다시는 네 일정에 못 들어오게 했어.`:`${c.name}님 번호, 지금도 누를 수 있을 것 같아요?`,false);});
  const div=document.createElement('div');div.className='relation-preview trio-affair-block';
  div.innerHTML=`<img class="relationship-scene" src="./assets/event-trio-secure-home-ending.png" alt="세 연인이 바람 선택을 가로막는 장면"><b class="down">🦂 공동생활의 세 사람이 선택지를 지웠다</b><p>${blockers.join('와(과) ')}가 이미 약속 장소와 연락처를 확인했습니다. ${c.name}에게 고백하거나 하룻밤을 제안하는 선택만 실행되지 않습니다.</p><div class="important-event-detail">강유진·한채린·윤세라 본인과의 데이트와 대화는 유지됩니다. 공동생활 해피엔딩 동안 다른 히로인에게 새 연애를 시작하는 행동만 세 사람이 막습니다.</div><button id="trio-block-confirm" class="session-btn opening">세 사람이 있는 집으로 돌아간다</button>`;
  box.appendChild(div);$('trio-block-confirm').addEventListener('click',closeDateModal);playSound('crash');autoSave();
}

function romanceResolve(kind, confirmed) {
  const c = S._dateCandidate; if (!c) return;
  if(confirmed&&S.life.dangerousTrioBond&&S.life.dangerousTrioBond.active&&!isDangerousHeroine(c)&&['accept','confess','casual'].includes(kind)){showTrioBlocksAffair(c);return;}
  if(!confirmed){previewRomanceChoice(kind);return;}
  const rec = rememberPerson(c);
  const preview=$('date-outcome')&&$('date-outcome').querySelector('.relation-preview');if(preview)preview.remove();
  let resultHTML = '';
  if (kind === 'accept') {
    startDating(c);
    resultHTML = `💕 <b class="up">${c.name}님의 고백을 받아 연애를 시작했어요!</b>`;
  } else if (kind === 'decline') {
    rec.affection = Math.max(0, (rec.affection || 0) - 15);
    resultHTML = `🙅 <span class="muted">${c.name}님의 고백을 정중히 거절했다. 사이가 조금 어색해졌다.</span>`;
  } else if (kind === 'confess') {
    const ok = Math.random() < ((S._romance && S._romance.chance) || 0.5);
    if (ok) { startDating(c); resultHTML = `💕 <b class="up">고백 성공! ${c.name}님과 연애를 시작했어요!</b>`; }
    else { rec.affection = Math.max(0, (rec.affection || 0) - 8); resultHTML = `🫸 <b class="down">${c.name}님이 "아직 그런 사이는 아닌 것 같아요"라며 거절했다.</b>`; playSound('error'); }
  } else if (kind === 'friend') {
    rec.status='friend';rec.trust=Math.min(100,(rec.trust||0)+12);rec.affection=Math.max(15,(rec.affection||0)-4);
    resultHTML=`🤝 <b>${c.name}님과 연애 대신 가까운 친구가 되기로 했습니다.</b>`;
  } else if (kind === 'casual') {
    const per=D.PERSONALITIES[c.personality]||{},chastity=rec.chastity==null?(per.chastity==null?55:per.chastity):rec.chastity;
    const accepts=Math.random()<clamp(.82-chastity*.006+(c.personality==='free'?.18:0),.18,.9);
    if(accepts){
      rec.status='casual';rec.trust=Math.max(0,(rec.trust||0)-3);rec.affection=Math.max(20,rec.affection||0);
      if(isDangerousHeroine(rec))awakenDangerousHeroine(rec,'night');
      const tender=['caring','homebody','frugal'].includes(rec.personality),special=isDangerousHeroine(rec);
      if(rec.name==='윤세라')rec.obsession=Math.min(100,(rec.obsession||0)+22);else if(special)rec.dangerLevel=Math.min(100,(rec.dangerLevel||0)+22);
      const risk=dangerousRiskMeta(rec);
      resultHTML=`🌙 <b>${c.name}님이 망설인 끝에 가벼운 관계를 받아들였습니다.</b><br><span class="${tender||special?'down':'muted'}">${special?`말과 달리 마음은 가볍지 않았습니다. ${risk.label}이 크게 올랐습니다.`:tender?'가벼운 관계를 받아들였지만 감정이 상하지 않도록 선을 분명히 정했습니다.':'서로 연락과 관계의 선을 정했습니다.'}</span>`;
    }else{
      rec.affection=Math.max(0,(rec.affection||0)-10);rec.trust=Math.max(0,(rec.trust||0)-8);
      resultHTML=`🫸 <b class="down">${c.name}님은 “나는 그런 관계는 못 해요”라며 제안을 거절했습니다.</b>`;
    }
  } else {
    resultHTML = `⏳ <span class="muted">다음 기회를 기다리기로 했다.</span>`;
  }
  const reply={accept:'우리, 이제 진짜 시작인 거죠?',confess:'오늘 대답은 오래 기억할 것 같아요.',friend:'친구로도 연락은 계속해요.',casual:'우리 사이의 선… 잊지 말아요.',decline:'알겠어요. 그래도 갑자기 사라지진 말아요.',skip:'다음에는 조금 더 솔직하게 말해줘요.'}[kind];
  pushPersonMessage(L,rec,reply,false);
  S._romance = null;
  const out = $('date-outcome');
  const rc = out.querySelector('.romance-choice'); if (rc) rc.remove();
  const div = document.createElement('div'); div.className = 'oc-text'; div.style.marginTop = '6px'; div.innerHTML = resultHTML;
  out.appendChild(div);
  const btn = document.createElement('button'); btn.id = 'date-confirm'; btn.className = 'session-btn opening'; btn.textContent = '확인';
  btn.addEventListener('click', closeDateModal); out.appendChild(btn);
  renderCapital(); renderLifePanel(); checkAchievements(); autoSave();
}

function closeDateModal() {
  const h = $('date-host'); if (h) { h.style.display = 'none'; h.innerHTML = ''; }
  syncBGM();   // 데이트 트랙 → 원래 장면 트랙으로
  S._dateCandidate = null; S._dateRoute = null; S._dateOffers = null; S._romance = null;
  S._dateCompanion = null; S._dateFriends = null; S._dateContacts = null;
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
  if(isDangerousHeroine(rec))awakenDangerousHeroine(rec,'relationship');
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
  const poly=ensurePolycule(L);poly.members.forEach(x=>{const r=metRecord(L,x.name);if(r)r.status='ex';});poly.active=false;poly.members=[];poly.trust=0;
  if(L.dangerousTrioBond&&L.dangerousTrioBond.active){DANGEROUS_HEROINE_NAMES.forEach(n=>{const r=metRecord(L,n);if(r)r.status='ex';});removeDangerousTrioFaction(L);L.dangerousTrioBond=null;}
  L.partner = null;
  L.affection = 0;
  if (charmPenalty != null) L.charm = Math.floor(L.charm * charmPenalty);
  if (happyPenalty) L.happy = clamp(L.happy - happyPenalty, 0, 100);
  return name;
}

function doBreakupChoice() {
  const L = S.life;
  if (!L.partner || L.relationship === 'single') return;
  showBreakupModal();
}

function showBreakupModal() {
  const L = S.life, p = L.partner; if (!p) return;
  const per = D.PERSONALITIES[p.personality] || {};
  const married = L.relationship === 'married';
  const host = $('life-event'); if (!host) return;
  const assets = Math.max(0, totalWealth());
  const alimony = married ? Math.round(assets * rand(0.15, 0.35)) : Math.round(rand(300000, 2500000));
  S._breakupPreview = { married, alimony };
  const resistNote = (per.breakupResist || 0) >= 0.4
    ? `${per.name || '이'} 성향이라 순순히 놓아주지 않을 가능성이 높아요. 큰 다툼·추가 비용 위험!`
    : `${per.name || '이'} 성향이라 비교적 담담히 받아들일 가능성이 커요.`;
  host.style.display = 'block';
  host.innerHTML =
    `<div class="window event-window">
       <div class="title-bar event-bar"><div class="title-bar-text">💔 ${married ? '이혼 절차' : '이별 결정'}</div></div>
       <div class="window-body">
         <img class="life-scene-banner" src="${lifeSceneImage('love')}" alt="관계 갈등 대화 장면">
         <div class="date-profile"><img class="char-portrait" src="${characterPortrait(p, 'sad')}" alt="${p.name}">
           <div class="dp-info"><strong>${p.emoji || ''}${p.name}</strong> · ${p.job}<br><span class="muted">${per.emoji || ''}${per.name || ''} · 친밀도 ${Math.max(0, L.affection || 0)}</span></div></div>
         <div class="event-desc">${married ? `이혼하면 재산분할·위자료로 <b class="down">약 ${won(alimony)}원</b>이 나가고, 주변에 소문이 날 수 있어요.` : `헤어지면 그동안 쌓은 친밀도가 사라져요.`} 정말 진행할까요?<br><span class="muted">${resistNote}</span><br><span class="muted">헤어진 뒤에도 '전 연인'으로 남아 나중에 재회를 시도할 수 있어요.</span></div>
         <div class="event-options">
           <button class="event-opt" id="breakup-go">💔 ${married ? '이혼한다' : '헤어진다'}</button>
           <button class="event-opt" id="breakup-cancel">↩ 다시 생각한다</button>
         </div>
         <div class="event-outcome" id="breakup-outcome"></div>
       </div>
     </div>`;
  const go = $('breakup-go'); if (go) go.addEventListener('click', confirmBreakup);
  const cancel = $('breakup-cancel'); if (cancel) cancel.addEventListener('click', closeBreakupModal);
}

function confirmBreakup() {
  const L = S.life, p = L.partner; if (!p) return closeBreakupModal();
  const per = D.PERSONALITIES[p.personality] || {};
  const married = L.relationship === 'married';
  const resisted = Math.random() < (per.breakupResist || 0);
  let cost = (S._breakupPreview && S._breakupPreview.alimony) || 0;
  let text;
  if (resisted) {
    cost += Math.round(rand(1000000, married ? 8000000 : 3000000));
    SOCIAL.ensure(L).reputation = Math.max(0, SOCIAL.ensure(L).reputation - 8);
    L.memories = L.memories || [];
    L.memories.unshift({ day: S.day, name: p.name, tier: '관계 파국 엔딩', approach: '결별' });
    text = `${per.name || '상대'} 성향의 ${p.name}님은 결별을 받아들이지 못했고, 큰 다툼과 주변 소문 끝에 관계가 파국으로 끝났다.`;
  } else {
    text = `${p.name}님은 눈물을 훔치면서도 결정을 받아들였다. 두 사람은 마지막 인사를 나눴다.`;
  }
  if (cost > 0) { const paid = Math.min(Math.max(0, S.capital), cost); S.capital -= paid; if (cost > paid) LOAN.addDebt(L, cost - paid, married ? '이혼 위자료·정리비용' : '관계 정리 비용'); }
  const name = breakUp(resisted ? 0.45 : 0.75, resisted ? 30 : 18);   // 상대는 '전 연인'으로 명부에 남는다
  addNews(`💔 ${married ? '이혼' : '이별'} · ${text} 정리 비용 ${won(cost)}원`, 'bad');
  playSound('error');
  const out = $('breakup-outcome');
  const optWrap = $('life-event').querySelector('.event-options'); if (optWrap) optWrap.innerHTML = '';
  out.innerHTML =
    `<div class="oc-text">💔 ${text}</div>` +
    `<div class="oc-changes">정리 비용 -${won(cost)}${resisted ? ' · 평판 -8' : ''} · 매력·행복 감소</div>` +
    `<div class="oc-text muted" style="margin-top:4px">${name}님은 이제 '전 연인'으로 남았어요. 소개팅 화면에서 다시 만나 재회를 노려볼 수 있어요.</div>` +
    `<button id="breakup-confirm" class="session-btn opening">확인</button>`;
  const cf = $('breakup-confirm'); if (cf) cf.addEventListener('click', closeBreakupModal);
  renderCapital(); renderLifePanel(); checkAchievements(); autoSave();
}

function closeBreakupModal() {
  const h = $('life-event'); if (h) { h.style.display = 'none'; h.innerHTML = ''; }
  S._breakupPreview = null;
  if (S.phase === 'closed' && $('market-close') && $('market-close').style.display === 'block') renderCloseReport(S.day);
}

// 취미·매력 누적만으로는 자동 연애하지 않는다. 연애는 데이트 중 상대별 고백 판정으로만 시작한다.
function checkRelationship() {
  return false;
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
  playSound('buy'); afterLifeAction('가족');
}

function relationshipGroupTone(person){
  if(!person)return'exclusive';if(person.personality==='obsessive'||person.special==='obsessive')return'exclusive';
  if(['free','lavish'].includes(person.personality))return'freedom';
  if(['cold','ambitious'].includes(person.personality))return'independent';
  return'home';
}
function groupToneLabel(tone){return{freedom:'자유·비독점',independent:'독립·거리 존중',home:'생활 공동체',exclusive:'독점 관계'}[tone]||tone;}
function groupToneCompatible(a,b){return a===b||(a==='freedom'&&b==='independent')||(a==='independent'&&b==='freedom');}
function polyculeCandidateFits(L,candidate){
  const tone=relationshipGroupTone(candidate),existing=[L.partner,...(ensurePolycule(L).members||[])].filter(Boolean);
  if(tone==='exclusive'||!existing.length)return false;
  return existing.every(person=>groupToneCompatible(relationshipGroupTone(person),tone));
}
function showPolyculeProposal(){
  const L=S.life,p=L.partner;if(!p||L.relationship==='single')return;const poly=ensurePolycule(L),per=D.PERSONALITIES[p.personality]||{},host=$('life-event');if(!host)return;
  const rec=metRecord(L,p.name),tone=relationshipGroupTone(p),ready=tone!=='exclusive'&&(L.affection||0)>=60&&(rec&&rec.trust||0)>=35;
  host.style.display='block';host.innerHTML=`<div class="window event-window"><div class="title-bar event-bar"><div class="title-bar-text">🌈 관계의 결 확인</div><div class="title-bar-controls"><button aria-label="Close" id="poly-x"></button></div></div><div class="window-body"><img class="life-scene-banner" src="./assets/relationship-polycule.png" alt="다자연애 관계의 결을 확인하는 장면"><div class="date-profile"><img class="char-portrait" src="${characterPortrait(p,'neutral')}" alt="${p.name}"><div><strong>${p.name}</strong><br><span class="muted">${per.name||''} · ${groupToneLabel(tone)} · 친밀도 ${Math.round(L.affection||0)} · 신뢰 ${Math.round(rec&&rec.trust||0)}</span></div></div><div class="event-desc">확률로 허락을 받는 방식이 아닙니다. 지금까지 만든 신뢰가 충분하고, 이후 만나는 인물이 <b>${groupToneLabel(tone)}</b>과 양립할 때만 같은 관계에 들어올 수 있습니다. 독점 집착형은 일반 루트에 들어오지 않으며 별도 스토리 조합이 필요합니다.</div><div class="important-event-detail">${ready?'현재 관계는 다른 사람을 받아들일 결이 형성됐습니다.':'친밀도 60 · 신뢰 35가 필요하며, 독점 관계 성향은 일반 루트를 열 수 없습니다.'}</div><div class="event-options"><button class="event-opt" id="poly-go" ${ready?'':'disabled'}>우리 관계의 결을 열어둔다</button><button class="event-opt" id="poly-cancel">지금 관계를 유지한다</button></div><div class="event-outcome" id="poly-outcome"></div></div></div>`;
  $('poly-go').addEventListener('click',resolvePolyculeProposal);[$('poly-x'),$('poly-cancel')].forEach(b=>b.addEventListener('click',closeLifeEvent));
}
function resolvePolyculeProposal(){
  const L=S.life,p=L.partner,poly=ensurePolycule(L),rec=metRecord(L,p.name),tone=relationshipGroupTone(p),ok=tone!=='exclusive'&&(L.affection||0)>=60&&(rec&&rec.trust||0)>=35;
  const opts=$('poly-outcome').parentElement.querySelector('.event-options');if(opts)opts.innerHTML='';
  if(ok){poly.active=true;poly.mode='compatibility';poly.tone=tone;poly.trust=55;$('poly-outcome').innerHTML=`<div class="oc-text up">${p.name}님과의 관계가 <b>${groupToneLabel(tone)}</b> 결로 열렸습니다. 앞으로 같은 결의 인물만 선택 결과에 따라 합류할 수 있습니다.</div><button id="poly-confirm">확인</button>`;addNews(`🌈 ${p.name}님과 ${groupToneLabel(tone)} 관계의 결을 열었습니다`,'good');}
  else{$('poly-outcome').innerHTML=`<div class="oc-text down">현재 신뢰나 관계의 결로는 여러 사람을 포함하는 관계가 성립하지 않습니다. 확률 판정 없이 조건 미달로 유지됩니다.</div><button id="poly-confirm">확인</button>`;addNews(`🌈 관계의 결이 맞지 않아 다자연애 루트가 열리지 않았습니다`,'neutral');}
  $('poly-confirm').addEventListener('click',closeLifeEvent);markMonthAction('데이트');renderLifePanel();autoSave();
}

function showDangerousTrioAftermath(){
  const event=DANGEROUS_TRIO&&DANGEROUS_TRIO.nextAftermath(S.life),host=$('life-event');
  if(!event||!host){showNextImportantEvent();return;}
  const speakers=event.speakers.map(s=>{const r=metRecord(S.life,s.name);return`<div class="trio-dialogue"><img src="${characterPortrait(r)}" alt="${s.name}"><div><b>${s.name}</b><p>“${s.line}”</p></div></div>`;}).join('');
  host.style.display='block';
  host.innerHTML=`<div class="window event-window trio-route-window"><div class="title-bar event-bar"><div class="title-bar-text">${event.icon} 공동생활 후일담 · 선택 필요</div></div><div class="window-body"><img class="life-scene-banner" src="${event.scene}" alt="${event.title}"><div class="event-title">${event.title}</div><div class="event-desc">${event.desc}</div><div class="trio-dialogues">${speakers}</div><div class="event-options">${event.choices.map(choice=>`<button class="event-opt" data-trio-aftermath="${choice.id}">${choice.text}</button>`).join('')}</div><div class="event-outcome" id="trio-aftermath-outcome"></div></div></div>`;
  host.querySelectorAll('[data-trio-aftermath]').forEach(button=>button.addEventListener('click',()=>resolveDangerousTrioAftermath(button.dataset.trioAftermath)));
}
function resolveDangerousTrioAftermath(choiceId){
  const result=DANGEROUS_TRIO&&DANGEROUS_TRIO.applyAftermath(S.life,choiceId),host=$('life-event');if(!result||!host)return;
  const options=host.querySelector('.event-options');if(options)options.innerHTML='';
  if(result.choice.faction){
    const faction=RIVALS.ensureFaction(S.life);faction.xp=(faction.xp||0)+result.choice.faction;
    (faction.members||[]).filter(member=>member.trioCouncil).forEach(member=>member.loyalty=Math.min(100,(member.loyalty||90)+2));
  }
  $('trio-aftermath-outcome').innerHTML=`<div class="oc-text">${result.choice.result}</div><div class="oc-changes">공생 안정도 ${result.choice.stability>=0?'+':''}${result.choice.stability||0}${result.choice.obsession?` · 세 사람 집착 ${result.choice.obsession>0?'+':''}${result.choice.obsession}`:''}${result.choice.faction?` · 세력 경험 +${result.choice.faction}`:''}</div><button id="trio-aftermath-confirm" class="session-btn opening">후일담을 기록하고 다음 사건 보기</button>`;
  $('trio-aftermath-confirm').addEventListener('click',()=>{host.style.display='none';host.innerHTML='';renderLifePanel();autoSave();showNextImportantEvent();});
}
function enlistDangerousTrioFaction(L){
  const bond=L.dangerousTrioBond;if(!bond||!bond.active)return;
  const faction=RIVALS.ensureFaction(L);faction.level=Math.max(1,faction.level||0);faction.trioCapacityBonus=3;
  if(!(faction.assets||[]).some(asset=>asset.trioHome))faction.assets.push({icon:'🦂',name:'세 사람의 공동 거처',trioHome:true});
  const specs={
    '강유진':{sourceId:'trio-yujin',role:'legal',stats:{defense:.09,intel:.04,legal:16,income:350000},desc:'비상 연락망과 적법한 방어 절차를 담당하는 공동생활 간부.'},
    '한채린':{sourceId:'trio-chaerin',role:'operations',stats:{defense:.05,intel:.08,income:1800000},desc:'거점·자금·경호 인력을 연결하는 공동생활 간부.'},
    '윤세라':{sourceId:'trio-sera',role:'intel',stats:{defense:.02,intel:.17,income:250000},desc:'사람의 습관과 배신 징후를 추적하는 공동생활 간부.'}
  };
  Object.entries(specs).forEach(([name,spec])=>{
    if(faction.members.some(member=>member.sourceId===spec.sourceId))return;
    const r=metRecord(L,name);if(!r)return;
    faction.members.push({uid:`${spec.sourceId}-${S.day}`,sourceId:spec.sourceId,name,role:spec.role,portrait:r.portrait,gender:r.gender,
      loyalty:100,upkeep:0,stats:{...spec.stats},named:true,trioCouncil:true,desc:spec.desc,injuredMonths:0});
  });
  RIVALS.ensureFaction(L);bond.factionJoined=true;
}
function removeDangerousTrioFaction(L){
  const faction=RIVALS.ensureFaction(L);
  faction.members=(faction.members||[]).filter(member=>!member.trioCouncil);
  faction.trioCapacityBonus=0;
  faction.assets=(faction.assets||[]).filter(asset=>!asset.trioHome);
  RIVALS.ensureFaction(L);
}

function trioWitness(){
  const L=S.life,taesik=metRecord(L,'장태식');
  if(L.makjang||taesik)return{name:'장태식',portrait:characterPortrait(D.SPECIAL_CHARACTERS.taesik,'angry'),line:'저 미친 여자들 제발 어디 방생하지 말고 네가 평생 책임져. 나도 살면서 이런 조합은 처음 본다.'};
  const faction=RIVALS.ensureFaction(L),mob=(faction.members||[]).find(member=>!member.named)||faction.members[0];
  if(mob)return{name:mob.name,portrait:characterPortrait(mob),line:'대장님, 저 셋 제발 밖에 방생하지 말고 여기서 풀어요. 라이벌보다 무섭습니다.'};
  return{name:'겁먹은 행동대원',portrait:emojiAvatar({emoji:'🕶️'}),line:'형님, 저 셋 제발 밖에 방생하지 말고 여기서 풀어요. 남들은 좀 살게요.'};
}
function dangerousTrioCast(){
  return DANGEROUS_TRIO.NAMES.map(name=>metRecord(S.life,name)).filter(Boolean);
}
function showDangerousTrioRoute(){
  if(!DANGEROUS_TRIO)return;const host=$('life-event');if(!host)return;
  const L=S.life,state=DANGEROUS_TRIO.ensure(L),check=DANGEROUS_TRIO.eligibility(L),cast=dangerousTrioCast();
  if(state.active){showDangerousTrioStory();return;}
  const castHtml=cast.map(r=>`<div class="trio-person"><img src="${characterPortrait(r)}" alt="${r.name}"><b>${r.name}</b><small>${relationTag(L,r.name)}</small></div>`).join('');
  const progress=check.rows.map(row=>`<div class="trio-requirement ${row.ready?'ready':''}"><b>${row.ready?'✓':'○'} ${row.name}</b><span>${row.ready?'결핍의 결이 맞음':row.need}</span><small>개인 스토리 ${row.chapter}/5 · ${row.active?'관계 유지 중':'현재 관계가 멀어짐'}</small></div>`).join('');
  const ending=state.ending?`<div class="story-ending"><b>📕 ${state.ending.title}</b><br>${state.ending.text}</div>`:'';
  host.style.display='block';
  host.innerHTML=`<div class="window event-window trio-route-window"><div class="title-bar event-bar"><div class="title-bar-text">🦂 위험한 히로인 세트 · 결핍 공생</div><div class="title-bar-controls"><button aria-label="Close" id="trio-x"></button></div></div><div class="window-body"><img class="life-scene-banner" src="${state.ending?'./assets/event-trio-secure-home-ending.png':'./assets/event-trio-first-meeting.png'}" alt="강유진 한채린 윤세라 전용 루트"><div class="trio-cast">${castHtml}</div><div class="event-desc">허락을 구해 확률로 여는 다자연애가 아닙니다. 유진의 <b>구원 강박</b>, 채린의 <b>굴복 욕구</b>, 세라의 <b>버림받을 공포</b>를 개인 스토리 선택으로 직접 건드렸을 때만 셋이 서로의 쓸모를 인정합니다.</div>${ending||`<div class="trio-requirements">${progress}</div><div class="important-event-detail">${check.partner?'주 연인이 세 사람 중 한 명입니다.':'주 연인이 강유진·한채린·윤세라 중 한 명이어야 합니다.'}${check.outsiders&&check.outsiders.length?`<br><span class="down">현재 다른 다자연애 구성원(${check.outsiders.map(x=>x.name).join(', ')})이 있어 이 전용 조합과 섞을 수 없습니다.</span>`:''}<br>조건은 상대의 허락이 아니라 지금까지 실제로 만든 관계의 결입니다.</div><button id="trio-start" class="session-btn ${check.ok?'opening':''}" ${check.ok?'':'disabled'}>🗝️ 세 사람을 한 방에 부른다</button>`}</div></div>`;
  $('trio-x').addEventListener('click',closeLifeEvent);
  const start=$('trio-start');if(start)start.addEventListener('click',startDangerousTrioRoute);
}
function startDangerousTrioRoute(auto){
  const result=DANGEROUS_TRIO.start(S.life);if(!result.ok){if(auto)showNextImportantEvent();else flashToast('세 사람 모두 친구이고 현재 솔로일 때 자연스럽게 시작됩니다','neutral');return;}
  addNews('🦂 친구로 알고 지내던 강유진·한채린·윤세라가 같은 방에서 처음 마주쳤습니다','bad');
  autoSave();showDangerousTrioStory();
}
function showDangerousTrioStory(){
  const chapter=DANGEROUS_TRIO.next(S.life),host=$('life-event');if(!chapter||!host){closeLifeEvent();showNextImportantEvent();return;}
  const state=DANGEROUS_TRIO.ensure(S.life),witness=trioWitness();
  const speakers=chapter.speakers.map(s=>{
    const person=s.name==='목격자'?witness:metRecord(S.life,s.name);
    const name=s.name==='목격자'?witness.name:s.name,line=s.name==='목격자'?witness.line:s.line;
    return`<div class="trio-dialogue"><img src="${s.name==='목격자'?witness.portrait:characterPortrait(person)}" alt="${name}"><div><b>${name}</b><p>“${line}”</p></div></div>`;
  }).join('');
  host.style.display='block';
  host.innerHTML=`<div class="window event-window trio-route-window"><div class="title-bar event-bar"><div class="title-bar-text">${chapter.icon} 결핍 공생 ${state.stage+1}/${DANGEROUS_TRIO.CHAPTERS.length} · ${chapter.title}</div><div class="title-bar-controls"><button aria-label="Close" id="trio-story-x"></button></div></div><div class="window-body"><img class="life-scene-banner" src="${chapter.scene}" alt="${chapter.title} 이벤트 컷신"><div class="trio-meter"><span>공생 안정도</span><b class="${state.stability<30?'down':'up'}">${Math.round(state.stability)}/100</b></div><div class="event-desc">${chapter.desc}</div><div class="trio-dialogues">${speakers}</div><div class="event-options">${chapter.choices.map(choice=>`<button class="event-opt" data-trio-choice="${choice.id}">${choice.text}<span class="opt-sub">${choice.preview}</span></button>`).join('')}<button class="event-opt" id="trio-story-later">지금은 셋을 돌려보낸다</button></div><div class="event-outcome" id="trio-outcome"></div></div></div>`;
  host.querySelectorAll('[data-trio-choice]').forEach(button=>button.addEventListener('click',()=>resolveDangerousTrioStory(button.dataset.trioChoice)));
  [$('trio-story-x'),$('trio-story-later')].forEach(button=>button.addEventListener('click',closeLifeEvent));
}
function resolveDangerousTrioStory(choiceId){
  S._trioRetry={
    state:JSON.parse(JSON.stringify(DANGEROUS_TRIO.ensure(S.life))),
    people:DANGEROUS_HEROINE_NAMES.map(name=>{const r=metRecord(S.life,name);return{name,affection:r&&r.affection,trust:r&&r.trust,obsession:r&&r.obsession};})
  };
  const result=DANGEROUS_TRIO.apply(S.life,choiceId);if(!result)return;
  const poly=ensurePolycule(S.life);poly.trust=Math.round(result.state.stability);
  const host=$('life-event'),options=host.querySelector('.event-options');if(options)options.innerHTML='';
  if(result.ending&&result.ending.id==='bad_friends')activateDangerousTrioBond();
  const ending=result.ending?`<div class="story-ending ${result.ending.tone==='bad'?'down':''}"><b>📕 ${result.ending.title}</b><br>${result.ending.text}</div>`:'';
  const success=result.ending&&result.ending.id==='bad_friends'?`<div class="important-event-detail up">공동생활 해피엔딩입니다. 강유진·한채린·윤세라가 모두 연인이자 세력의 특별 간부가 됩니다. 세 사람 본인과의 관계 행동은 유지되고, 다른 히로인에게 새 연애를 시작하려는 선택만 세 사람이 막습니다. 다음 달부터 공동생활 후일담이 이어집니다.</div>`:'';
  const retry=result.ending&&result.ending.tone==='bad'?'<button id="trio-retry" class="session-btn opening">↩️ 마지막 선택 다시 하기</button>':'';
  $('trio-outcome').innerHTML=`<div class="oc-text">${result.choice.result}</div><div class="oc-changes">공생 안정도 ${result.choice.stability>=0?'+':''}${result.choice.stability} · 세 사람 신뢰 ${result.choice.trust>=0?'+':''}${result.choice.trust||0}${result.choice.obsession?` · 집착 +${result.choice.obsession}`:''}</div>${ending}${success}${retry}<button id="trio-confirm" class="session-btn ${result.ending&&result.ending.tone==='bad'?'':'opening'}">${result.ending?'엔딩 확인':'이번 사건을 마친다'}</button>`;
  addNews(`${result.chapter.icon} 위험한 세 사람 · ${result.chapter.title}`,result.choice.tag==='fracture'?'bad':'neutral');
  const retryBtn=$('trio-retry');if(retryBtn)retryBtn.addEventListener('click',retryDangerousTrioChoice);
  $('trio-confirm').addEventListener('click',()=>{closeLifeEvent();renderLifePanel();if(!result.ending)showNextImportantEvent();});
  renderLifePanel();autoSave();
}
function retryDangerousTrioChoice(){
  const checkpoint=S._trioRetry;if(!checkpoint)return;
  S.life.dangerousTrio=JSON.parse(JSON.stringify(checkpoint.state));
  checkpoint.people.forEach(saved=>{const r=metRecord(S.life,saved.name);if(r){r.affection=saved.affection;r.trust=saved.trust;r.obsession=saved.obsession;}});
  S.life.dangerousTrioBond=null;
  showDangerousTrioStory();renderLifePanel();autoSave();
}
function activateDangerousTrioBond(){
  const L=S.life,people=DANGEROUS_HEROINE_NAMES.map(name=>metRecord(L,name)).filter(Boolean);if(people.length!==3)return;
  const main=people[0],poly=ensurePolycule(L);
  L.relationship='dating';L.partner=Object.assign({},main,{mood:'happy'});L.affection=Math.round(people.reduce((sum,r)=>sum+(r.affection||0),0)/3);
  main.status='partner';awakenDangerousHeroine(main,'relationship');
  poly.active=true;poly.mode='dangerous_trio_success';poly.tone='dangerous_balance';poly.trust=Math.round(DANGEROUS_TRIO.ensure(L).stability);
  poly.members=people.slice(1).map(r=>{r.status='polycule';awakenDangerousHeroine(r,'relationship');return{name:r.name,job:r.job,personality:r.personality,age:r.age,emoji:r.emoji,gender:r.gender,portrait:r.portrait,special:r.special};});
  L.dangerousTrioBond={active:true,since:S.day,members:DANGEROUS_HEROINE_NAMES.slice()};
  enlistDangerousTrioFaction(L);
  addNews('🦂 공동생활 해피엔딩 · 강유진·한채린·윤세라가 연인이자 세력의 특별 간부가 됐습니다','good');
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

function buyPassiveAsset(id) {
  const asset = D.PASSIVE_ASSETS.find(x => x.id === id); if (!asset) return;
  if (S.capital < asset.price) { flashToast(`💸 현금 부족 (${won(asset.price)}원 필요)`, 'bad'); return; }
  S.capital -= asset.price;
  if (!Array.isArray(S.life.passiveAssets)) S.life.passiveAssets = [];
  S.life.passiveAssets.push({ id:asset.id, boughtAt:S.day });
  addNews(`${asset.emoji} ${asset.name} 매입 · 월 예상 순수입 ${won(Math.max(0, asset.monthlyIncome - asset.maintenance))}원`, 'good');
  flashToast(`${asset.emoji} 새 현금흐름을 확보했습니다`, 'good');
  celebrate(); afterLifeAction();
}

function sellPassiveAsset(id) {
  const list = S.life.passiveAssets || [], index = list.findIndex(x => x.id === id);
  const asset = D.PASSIVE_ASSETS.find(x => x.id === id); if (index < 0 || !asset) return;
  const proceeds = Math.round(asset.price * asset.resaleRate);
  list.splice(index, 1); S.capital += proceeds;
  addNews(`${asset.emoji} ${asset.name} 매각 · ${won(proceeds)}원 회수`, 'neutral');
  flashToast(`${asset.name} 1개를 매각했습니다`, 'neutral'); afterLifeAction();
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
  if(actionId==='counterintel')RIVALS.ensureFaction(S.life).tempDefense=Math.max(RIVALS.ensureFaction(S.life).tempDefense||0,.22);
  const rivalAction=RIVALS.ACTIONS.find(a=>a.id===actionId);
  if(rivalAction&&rivalAction.illegal)changeMorality(-16,`${rivalAction.label} 행동을 선택했습니다`);
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
  afterLifeAction('라이벌');
}

function doFactionAction(kind, targetIndex) {
  const L=S.life;
  let result;
  if(kind==='build')result=RIVALS.buildFaction(L,S.capital);
  else result=RIVALS.revenge(L,S.bots,targetIndex,S.capital);
  if(!result.ok){flashToast(`⛔ ${result.message}`,'bad');return;}
  S.capital=result.cash;
  addNews(`${kind==='build'?'🛡️':'🔥'} ${result.message}`,result.success===false?'neutral':'good');
  S.rivalFeed=S.rivalFeed||[];S.rivalFeed.unshift({day:S.day,text:`${kind==='build'?'🛡️ [세력]':'🔥 [역공]'} ${result.message}`});
  flashToast(result.message,result.success===false?'neutral':'good');
  afterLifeAction('라이벌');
  showFactionOutcome(kind,result);
}

function showFactionRecruitment() {
  const host=$('life-event');if(!host)return;
  const faction=RIVALS.ensureFaction(S.life);
  if(!faction.level){flashToast('먼저 내 세력을 만들어야 합니다','bad');return;}
  const options=RIVALS.recruitOptions(S.life);
  host.style.display='block';
  host.innerHTML=`<div class="window event-window">
    <div class="title-bar event-bar"><div class="title-bar-text">👥 ${faction.name} 인원 모집</div><div class="title-bar-controls"><button aria-label="Close" id="faction-recruit-x"></button></div></div>
    <div class="window-body">
      <div class="event-title">이름뿐인 세력이 아니라, 사람이 움직이는 조직을 만듭니다</div>
      <div class="event-desc">현재 구성원 <b>${faction.members.length}/${faction.capacity}명</b>. 일반 인력은 여러 번 모집할 수 있고, 이름 있는 인물은 조건을 충족해야 한 번만 합류합니다. 급여가 밀리면 충성도가 떨어지고 이탈할 수도 있습니다.</div>
      <div class="faction-recruit-grid">${options.map(c=>{
        const role=RIVALS.ROLE_LABELS[c.role]||{icon:'👤',name:c.role};
        return `<button class="faction-recruit-card ${c.locked?'locked':''}" data-recruit-id="${c.id}" ${c.locked?'disabled':''}>
          <img src="./assets/characters/${c.portrait}" alt="${c.name}">
          <span><b>${c.named===false?'':c.name}</b>${c.id.startsWith('mob-')?`<b>${c.name}</b>`:''}<small>${role.icon} ${role.name} · 영입 ${won(c.cost)} · 월 ${won(c.upkeep||0)}</small><em>${c.locked?`🔒 ${c.reason}`:c.desc}</em></span>
        </button>`;
      }).join('')}</div>
      <button id="faction-recruit-close" class="session-btn">돌아가기</button>
    </div>
  </div>`;
  host.querySelectorAll('[data-recruit-id]').forEach(b=>b.addEventListener('click',()=>doFactionRecruit(b.dataset.recruitId)));
  const close=()=>{host.style.display='none';host.innerHTML='';};
  $('faction-recruit-x').addEventListener('click',close);$('faction-recruit-close').addEventListener('click',close);
}

function doFactionRecruit(candidateId) {
  const result=RIVALS.recruit(S.life,S.capital,candidateId);
  if(!result.ok){flashToast(`⛔ ${result.message}`,'bad');return;}
  S.capital=result.cash;
  addNews(`👥 ${result.message}`,'good');
  S.rivalFeed=S.rivalFeed||[];S.rivalFeed.unshift({day:S.day,text:`👥 [영입] ${result.message}`});
  flashToast(result.message,'good');
  afterLifeAction('라이벌');
  showFactionOutcome('recruit',result);
}

function showFactionOutcome(kind,result) {
  const host=$('life-event');if(!host)return;
  const faction=RIVALS.ensureFaction(S.life),success=result.success!==false;
  const assets=(faction.assets||[]).map(a=>`${a.icon||'🏢'} ${a.name}`).join(' · ')||'아직 확보한 거점 없음';
  const title=kind==='build'?'🛡️ 세력 확장 보고':kind==='recruit'?'👥 영입 결과':'🔥 역공 작전 보고';
  host.style.display='block';
  host.innerHTML=`<div class="window event-window">
    <div class="title-bar event-bar"><div class="title-bar-text">${title}</div></div>
    <div class="window-body">
      <img class="life-scene-banner" src="${lifeSceneImage('faction')}" alt="세력이 라이벌의 금융 공격에 대응하는 작전실 장면">
      <div class="event-title ${success?'up':''}">${success?'작전 완료':'작전 결과 보류'}</div>
      <div class="event-desc">${result.message}</div>
      <div class="faction-operation-summary">
        <span>세력 단계 <b>${faction.level}/5</b></span>
        <span>구성원 <b>${faction.members.length}/${faction.capacity}명</b></span>
        <span>상시 방어 <b>${Math.round((faction.defense||0)*100)}%</b></span>
        <span>역공 성공 <b>${faction.wins||0}회</b></span>
        <span>누적 운영 투자 <b>${won(faction.fund||0)}</b></span>
      </div>
      <div class="important-event-detail">거점 · ${assets}</div>
      <button id="faction-outcome-close" class="session-btn opening">작전실 나가기</button>
    </div>
  </div>`;
  $('faction-outcome-close').addEventListener('click',()=>{host.style.display='none';host.innerHTML='';});
}

/* ---- 세력 운영 투자: 회수하는 예금이 아니라 거점·정보망·사업을 키우는 누적 투자다 ---- */
function entrustFaction(amt) {
  const f = RIVALS.ensureFaction(S.life);
  if (!f.level) { flashToast('먼저 내 세력을 만들어야 합니다', 'bad'); return; }
  amt = Math.floor(amt);
  if (S.capital < amt) { flashToast(`💸 현금이 부족합니다 (${won(amt)}원)`, 'bad'); return; }
  S.capital -= amt;
  f.fund = (f.fund || 0) + amt;
  f.xp = (f.xp || 0) + Math.max(2, Math.floor(amt / 1000000) * 2);
  (f.members || []).forEach(member => { member.loyalty = Math.min(100, (member.loyalty || 50) + Math.min(5, Math.ceil(amt / 5000000))); });
  RIVALS.ensureFaction(S.life);
  addNews(`🏗️ 세력 운영에 ${won(amt)}원 투자 · 누적 ${won(f.fund)}원 (회수 불가)`, 'neutral');
  flashToast(`🏗️ 조직 운영 투자 ${won(amt)}원 · 사업·방어·정보력 강화`, 'good');
  renderAll(); autoSave();
  if (S.phase === 'closed' && $('market-close') && $('market-close').style.display === 'block') renderCloseReport(S.day);
}

function factionTradeTarget(direction) {
  const outlook = ECONOMY.outlook(S.economy);
  const preferred = direction > 0 ? outlook.strong : outlook.weak;
  let pool = S.stocks.filter(stock => stock.listed && stock.type !== 'etf' && stock.type !== 'macro');
  const sectorPool = pool.filter(stock => preferred.includes(stock.sector));
  if (sectorPool.length) pool = sectorPool;
  return pool.length ? pick(pool) : null;
}

function maybeFactionTradeCall() {
  const L = S.life;
  if (!L || S.phase !== 'open') return;
  const f = RIVALS.ensureFaction(L);
  if (!f.level || !(f.members || []).length || (f.fund || 0) < 1000000) return;
  if (f.lastTradeProposalDay === S.day) return;
  const due = !Number.isFinite(f.lastTradeProposalDay) || S.day - f.lastTradeProposalDay >= 2;
  if (!due && Math.random() > Math.min(.78, .48 + (f.intel || 0) * .55)) return;

  const outlook = ECONOMY.outlook(S.economy);
  const direction = Math.random() < (outlook.monthlyMarket >= 0 ? .76 : .24) ? 1 : -1;
  const stock = factionTradeTarget(direction);
  if (!stock) return;
  const proposer = (f.members || []).filter(m => (m.injuredMonths || 0) <= 0)
    .sort((a,b) => ((b.stats || {}).intel || 0) - ((a.stats || {}).intel || 0))[0] || f.members[0];
  const others = S.bots.filter(bot => (bot.jailMonths || 0) <= 0).sort(() => Math.random() - .5)
    .slice(0, Math.min(5, 1 + f.level)).map(bot => bot.name);
  const meta = CAP_META[stock.cap] || CAP_META.mid;
  const base = stock.cap === 'large' ? .012 : stock.cap === 'mid' ? .024 : .042;
  const operationPower = Math.min(.55, Math.sqrt((f.fund || 0) / 30000000) * .25);
  const impact = Math.min(meta.sessionLimit * .52, base * (1 + f.level * .08 + operationPower));
  const call = {
    stock:stock.name, direction, impact, proposer:proposer.name,
    participants:others, sector:stock.sector, day:S.day,
  };
  f.lastTradeProposalDay = S.day;
  f.lastTradeCall = call;
  S._factionTradeCall = call;
  showFactionTradeCall();
}

function showFactionTradeCall() {
  const call = S._factionTradeCall; if (!call) return;
  const host = $('life-event'); if (!host) return;
  const stock = S.stocks.find(s => s.name === call.stock); if (!stock) return;
  const verb = call.direction > 0 ? '공동 매수' : '공동 매도';
  const expected = call.direction > 0 ? '매수세를 모아 가격을 끌어올린다' : '보유분을 정리해 가격을 누른다';
  host.style.display='block';
  autoPauseForPopup();
  host.innerHTML=`<div class="window event-window">
    <div class="title-bar event-bar"><div class="title-bar-text">📡 세력 작전실 연락 · ${verb}</div><div class="title-bar-controls"><button aria-label="Close" id="faction-call-x"></button></div></div>
    <div class="window-body">
      <img class="life-scene-banner" src="${lifeSceneImage('faction')}" alt="세력들이 공동 매매를 논의하는 작전실">
      <div class="event-title">${call.proposer}: “${call.stock}, 이번 달 흐름이면 지금 ${call.direction > 0 ? '모아야' : '줄여야'} 합니다.”</div>
      <div class="event-desc"><b>${call.stock}</b> · ${(D.SECTORS[stock.sector] || {}).name || stock.sector} · ${CAP_META[stock.cap].label}주<br>${call.participants.join(' · ')} 측도 ${verb}에 가담합니다. 작전이 시작되면 3틱 동안 주문이 나뉘어 들어가 ${expected}는 흐름이 생깁니다.</div>
      <div class="event-options">
        <button class="event-opt" data-faction-call="follow">🤝 나도 동참한다 <span class="opt-sub">${call.direction > 0 ? '현금의 10% 범위에서 자동 매수' : '보유 주식의 25% 자동 매도'}</span></button>
        <button class="event-opt" data-faction-call="observe">📊 조직의 판단에 맡기고 관망한다</button>
        <button class="event-opt" data-faction-call="counter">🛑 반대 의견을 내서 주문 규모를 줄인다</button>
      </div>
    </div>
  </div>`;
  host.querySelectorAll('[data-faction-call]').forEach(b=>b.addEventListener('click',()=>resolveFactionTradeCall(b.dataset.factionCall)));
  $('faction-call-x').addEventListener('click',()=>resolveFactionTradeCall('observe'));
}

function playerFollowFactionTrade(call, stock) {
  const price = priceOf(stock.name);
  const pos = S.owned[stock.name];
  if (call.direction > 0) {
    if (pos && pos.qty < 0) return '기존 공매도 포지션 때문에 개인 계좌는 관망';
    const budget = Math.min(S.capital * .10, 5000000);
    const qty = Math.floor(budget / (price * (1 + CFG.FEE_RATE)));
    if (qty < 1) return '현금이 부족해 개인 계좌는 매수하지 못함';
    const gross=price*qty,fee=Math.round(gross*CFG.FEE_RATE),cost=gross+fee;
    S.capital-=cost;
    if(pos&&pos.qty>0){const total=pos.qty+qty;pos.avg=(pos.avg*pos.qty+gross)/total;pos.qty=total;}
    else S.owned[stock.name]={qty,avg:price};
    S.trades++;
    return `${qty}주 자동 매수`;
  }
  if (!pos || pos.qty <= 0) return '보유분이 없어 개인 계좌는 관망';
  const qty=Math.max(1,Math.floor(pos.qty*.25)),gross=price*qty,fee=Math.round(gross*CFG.FEE_RATE),tax=Math.round(gross*CFG.TAX_RATE);
  const proceeds=gross-fee-tax;
  if(S.loan>0){const repay=Math.min(S.loan,proceeds);S.loan-=repay;S.capital+=proceeds-repay;}else S.capital+=proceeds;
  S.realizedPnL+=(price-pos.avg)*qty-fee-tax;pos.qty-=qty;if(!pos.qty)delete S.owned[stock.name];S.trades++;
  return `${qty}주 자동 매도`;
}

function runFactionBotOrders(call, stock) {
  const price=priceOf(stock.name);
  call.participants.forEach(name=>{
    const bot=S.bots.find(b=>b.name===name);if(!bot)return;
    const held=(bot.owned||{})[stock.name]||0;
    if(call.direction>0){
      const budget=Math.min(bot.capital*.12,1500000+Math.random()*2500000),qty=Math.floor(budget/price);
      if(qty>0){bot.capital-=qty*price;bot.owned[stock.name]=held+qty;}
    }else if(held>0){
      const qty=Math.max(1,Math.floor(held*.3));bot.owned[stock.name]=held-qty;bot.capital+=qty*price;if(bot.owned[stock.name]<=0)delete bot.owned[stock.name];
    }
  });
}

function resolveFactionTradeCall(choice) {
  const call=S._factionTradeCall;if(!call)return;
  const stock=S.stocks.find(s=>s.name===call.stock);if(!stock)return;
  const multiplier=choice==='follow'?1:choice==='counter'?.42:.76;
  stock.factionFlowTicks=3;
  stock.factionFlowRate=call.direction*call.impact*multiplier/3;
  runFactionBotOrders(call,stock);
  const personal=choice==='follow'?playerFollowFactionTrade(call,stock):choice==='counter'?'내 반대로 공동 주문 규모 축소':'개인 계좌는 관망';
  const verb=call.direction>0?'공동 매수':'공동 매도';
  const text=`${call.stock} ${verb} 개시 · ${call.participants.length+1}개 세력 · ${personal}`;
  logCompanyNews(call.stock,`세력 공동 주문 유입 · ${text}`,call.direction*call.impact*multiplier);
  addNews(`📡 [세력] ${text}`,'neutral');
  const f=RIVALS.ensureFaction(S.life);f.lastTradeCall={...call,result:text,choice};
  S.rivalFeed=S.rivalFeed||[];S.rivalFeed.unshift({day:S.day,text:`📡 [공동매매] ${text}`});
  const host=$('life-event');if(host){host.style.display='none';host.innerHTML='';}
  S._factionTradeCall=null;
  autoResumeFromPopup();
  flashToast(`📡 ${text}`,'neutral');
  renderAll();autoSave();
}

const MONTHLY_ACTION_GROUPS = {
  date:'데이트', hobby:'취미', rest:'휴식',
  'career-train':'경력', cert:'경력', changejob:'경력',
  'contact-meet':'인맥', 'contact-nurture':'인맥', 'contact-ask':'인맥', 'meet-special':'인맥', 'person-request':'인맥', 'character-story':'인맥',
  rival:'라이벌', faction:'라이벌', 'faction-recruit':'라이벌', polycule:'데이트', marry:'가족', 'child-bond':'가족', 'child-edu':'가족', 'parent-care':'가족', 'family-plan':'가족'
};
const LIFE_ACTIONS_PER_MONTH = 3;
function monthActionKey(group) { return `${S.day}:${group}`; }
function monthActionUsed(group) {
  S.life.monthActions = S.life.monthActions || {};
  return !!S.life.monthActions[monthActionKey(group)];
}
function markMonthAction(group) {
  if (!group) return;
  S.life.monthActions = S.life.monthActions || {};
  S.life.monthActions[monthActionKey(group)] = true;
}
function lifeActionCount() {
  if (!S.life) return 0;
  S.life.monthActions = S.life.monthActions || {};
  const prefix = `${S.day}:`;
  return Object.keys(S.life.monthActions).filter(key => key.startsWith(prefix) && S.life.monthActions[key]).length;
}
function lifeActionRemaining() { return Math.max(0, LIFE_ACTIONS_PER_MONTH - lifeActionCount()); }
function lifeActionExhausted() { return lifeActionRemaining() <= 0; }
function monthlyGroupForAction(action) { return MONTHLY_ACTION_GROUPS[action] || null; }
function maybeSeraIntrusion(context){
  const L=S.life,r=L&&metRecord(L,'윤세라');if(L&&L.dangerousTrioBond&&L.dangerousTrioBond.active)return;if(!r||!dangerousRomanceActive(L,r)||!r.yandere||(r.obsession||0)<65||L.seraIntrusionDay===S.day||Math.random()>.82)return;
  const host=$('life-event');if(!host||host.style.display==='block')return;L.seraIntrusionDay=S.day;
  const places={데이트:'다른 사람을 만나기로 한 장소 맞은편에서',취미:'취미 모임 출입구에서',휴식:'집으로 돌아오는 골목에서',경력:'직장 건물 로비에서',인맥:'약속 장소의 바로 옆 테이블에서',가족:'가족과 함께 있던 장소 근처에서',라이벌:'세력 사무실 앞에서'};
  const place=places[context]||((L.conditions||[]).length?'병원 접수대 건너편에서':'밖에서 돌아오는 길에');
  L.stress=clamp((L.stress||0)+6,0,100);host.style.display='block';
  host.innerHTML=`<div class="window event-window"><div class="title-bar event-bar"><div class="title-bar-text">🖤 어디를 가도 윤세라</div></div><div class="window-body"><img class="life-scene-banner" src="./assets/event-sera-doorstep.png" alt="윤세라가 기다리는 장면"><div class="event-title down">“진짜 우연이에요. 그렇게 믿어주면 안 돼요?”</div><div class="event-desc">${place} 세라가 이미 기다리고 있었습니다. 일정과 목적지를 말한 적은 없습니다.</div><div class="important-event-detail">집착 ${Math.round(r.obsession||0)}/100 · 스트레스 +6</div><div class="event-options"><button class="event-opt" data-sera-response="placate">오늘만 함께 간다</button><button class="event-opt" data-sera-response="boundary">따라오지 말라고 분명히 경고한다</button><button class="event-opt" data-sera-response="report">증거를 남기고 신고·도움을 요청한다</button></div></div></div>`;
  host.querySelectorAll('[data-sera-response]').forEach(b=>b.addEventListener('click',()=>resolveSeraIntrusion(r,b.dataset.seraResponse)));playSound('crash');
}
function resolveSeraIntrusion(r,choice){
  const L=S.life;
  if(choice==='placate'){r.affection=clamp((r.affection||0)+4,0,100);r.obsession=clamp((r.obsession||0)+7,0,100);pushPersonMessage(L,r,'역시 결국 나랑 같이 있어주는구나.',false);}
  else if(choice==='boundary'){r.affection=Math.max(0,(r.affection||0)-7);r.obsession=clamp((r.obsession||0)+(Math.random()<.45?4:-6),0,100);pushPersonMessage(L,r,'그 선은 누가 정한 건데요?',false);}
  else{const hasProtection=!!((D.SPECIAL_CHARACTERS.yujin&&metRecord(L,'강유진'))||SOCIAL.ensure(L).contacts.some(c=>SOCIAL.role(c).id==='official'));r.obsession=Math.max(0,(r.obsession||0)-(hasProtection?24:12));r.affection=Math.max(0,(r.affection||0)-18);r.reported=true;if(r.obsession<65)r.yandere=false;pushPersonMessage(L,r,hasProtection?'경찰까지 부를 줄은 몰랐네. 그래도 끝난 건 아니에요.':'신고했다고 내가 모를 줄 알았어요?',false);}
  closeLifeEvent();renderLifePanel();autoSave();
}
function dangerousTrioFollowsOuting(group){
  const L=S.life,bond=L&&L.dangerousTrioBond;
  if(!bond||!bond.active||!['데이트','취미','휴식','경력','인맥','라이벌'].includes(group))return;
  const shuffled=DANGEROUS_HEROINE_NAMES.slice().sort(()=>Math.random()-.5),count=Math.random()<.58?1:2,names=shuffled.slice(0,count);
  const place={데이트:'약속 장소',취미:'취미 모임',휴식:'산책길',경력:'직장 근처',인맥:'만남 장소',라이벌:'세력 거점'}[group]||'외출 장소';
  addNews(`🦂 ${place}에는 이미 ${names.join('와(과) ')}가 있었습니다. “우연이 겹쳤네.”`,'neutral');
  names.forEach(name=>{const r=metRecord(L,name);if(r)pushPersonMessage(L,r,name==='강유진'?'순찰 동선이 겹친 것뿐이에요. 끝나면 같이 가요.':name==='한채린'?'경호팀이 여기로 오라길래 왔어. 네 일정 때문은 아니야.':`나도 여기 올 생각이었어요. 믿어줘요. 이번에는 진짜로.`,false);});
  flashToast(`🦂 이번 외출에는 ${names.join('·')} 동행`,'neutral');
}
function afterLifeAction(monthlyGroup) {
  markMonthAction(monthlyGroup);
  if(CHAR_TRAITS&&monthlyGroup)ensureMet(S.life).filter(r=>r.status!=='ex'||r.name==='윤세라').forEach(r=>{const result=CHAR_TRAITS.action(r,monthlyGroup,signatureContext(S.life));if(result&&result.changed)signatureEvent({rec:r,...result});});
  renderCapital(); renderLifePanel(); checkAchievements(); autoSave();
  if (S.phase === 'closed' && $('market-close') && $('market-close').style.display === 'block') renderCloseReport(S.day);
  dangerousTrioFollowsOuting(monthlyGroup);
  maybeSeraIntrusion(monthlyGroup);
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
  const passiveOwned = L.passiveAssets || [];
  const passiveExpected = passiveOwned.reduce((sum, owned) => { const a=D.PASSIVE_ASSETS.find(x=>x.id===owned.id); return sum+(a?Math.max(0,a.monthlyIncome-a.maintenance):0); },0);
  const charmHint = L.relationship === 'single' ? `(연애까지 ${R.DATING_AT})`
    : L.relationship === 'dating' ? `(결혼까지 ${R.MARRY_AT})` : '';
  const risk = jobRiskTier(job);
  let partnerRow = '';
  if (L.partner) {
    const per = D.PERSONALITIES[L.partner.personality] || {};
    const g = (D.GENDER_LABEL || {})[L.partner.gender] || '';
    const prof = ROMANCE.profileOf(L.partner);
    const moneyLabel = L.partner.moneyStyle === 'support' ? '필요할 때 지원' : L.partner.moneyStyle === 'dependent' ? '지출 유발' : '각자 관리';
    const partnerRec=metRecord(L,L.partner.name),risk=partnerRec&&dangerousRiskMeta(partnerRec);
    const personalityNow=risk&&risk.value>=45?`${risk.label}이 강해진 상태`:per.name||'';
    partnerRow = `<img class="relationship-scene" src="${relationshipImage(L,L.partner.name)}" alt="${relLabel} 장면"><div class="life-partner"><img class="char-thumb" src="${characterPortrait(L.partner)}" alt="${L.partner.name}"><strong>${L.partner.name}${g ? ` (${g})` : ''} · ${L.partner.job} · ${stageBadge(L.affection)}<br><span class="muted">${per.emoji || ''}${personalityNow} · 💰 ${moneyLabel} · 직업 궁합 ${relationshipJobMod(L.partner)>=0?'+':''}${relationshipJobMod(L.partner)} · 용서 성향 ${Math.round((per.forgive || 0) * 100)}%${prof ? `<br>🗣️ ${prof.style}` : ''}</span></strong></div>`;
  }
  if (L.lovers && L.lovers.length) {
    partnerRow += `<div class="life-stat"><span>양다리 😈</span><strong class="down">${L.lovers.map(x => (x.emoji || '💔') + x.name).join(', ')} <span class="muted">(발각 주의!)</span></strong></div>`;
  }
  const poly=ensurePolycule(L);if(poly.active&&poly.members.length)partnerRow+=`<div class="life-stat"><span>합의형 관계 🌈</span><strong class="up">${poly.members.map(x=>(x.emoji||'💕')+x.name).join(', ')} <span class="muted">· 구성원 신뢰 ${poly.trust}</span></strong></div>`;
  const met = ensureMet(L);
  if (met.length) {
    partnerRow += `<div class="life-stat"><span>아는 사람 📇</span><strong>${met.length}명</strong></div>` +
      `<div class="life-props">${met.map(m => {const risk=dangerousRiskMeta(m);return`${m.emoji || '🙂'}<b>${m.name}</b> ${relationTag(L, m.name)} · ${stageBadge(m.affection)} ${Math.round(m.affection || 0)} · 신뢰 ${Math.round(m.trust||0)} · 교류 ${ensureCourtship(m).interactions||0}회${CHAR_TRAITS&&CHAR_TRAITS.label(m)?` · <span class="muted">${CHAR_TRAITS.label(m)} · ${CHAR_TRAITS.stageText(m)}</span>`:''}${risk?` · <span class="${risk.value>=70?'down':'muted'}">${risk.icon}${risk.label} ${Math.round(risk.value)}</span>`:''}${m.idleMonths >= 3 ? ` <span class="muted">(${m.idleMonths}개월째 연락 없음)</span>` : ''}`;}).join('<br>')}</div>`;
  }
  el.innerHTML =
    `<div class="life-stat"><span>나이/시점</span><strong>${info.label}</strong></div>
     <div class="life-stat"><span>가정환경</span><strong>${((ORIGIN&&ORIGIN.family(L.familyBackground))||{icon:'🏠',name:'기록 없음'}).icon} ${((ORIGIN&&ORIGIN.family(L.familyBackground))||{name:'기록 없음'}).name}</strong></div>
     <div class="life-stat"><span>학창생활</span><strong>${((ORIGIN&&ORIGIN.school(L.schoolLife))||{icon:'🎒',name:'기록 없음'}).icon} ${((ORIGIN&&ORIGIN.school(L.schoolLife))||{name:'기록 없음'}).name}</strong></div>
     <div class="life-stat"><span>경제 국면</span><strong>${ECONOMY.phase(S.economy).icon} ${ECONOMY.phase(S.economy).name} · ${S.economy.monthsLeft}개월 예상</strong></div>
     <div class="life-stat"><span>기준금리</span><strong>🏦 ${ECONOMY.ensure(S.economy).baseRate.toFixed(2)}% · ${ECONOMY.ensure(S.economy).lastRateDelta > 0 ? '인상' : ECONOMY.ensure(S.economy).lastRateDelta < 0 ? '인하' : '동결'}</strong></div>
     <div class="life-stat"><span>물가상승률</span><strong>🌡️ ${ECONOMY.ensure(S.economy).inflation.toFixed(1)}%</strong></div>
     <div class="life-stat"><span>실거주</span><strong>${HOUSING.home(L).icon} ${HOUSING.home(L).name} · ${HOUSING.TENURES[L.housing.tenure].name} · 정원 ${HOUSING.home(L).capacity}명</strong></div>
     <div class="life-stat"><span>주거 계약</span><strong>월 ${won(HOUSING.quote(HOUSING.home(L),L.housing.tenure).monthly)}원 · 주거자산/보증금 ${won(HOUSING.assetValue(L))}</strong></div>
     <div class="life-stat"><span>보험</span><strong>${activePolicies.length ? activePolicies.map(p=>p.icon+p.name).join(' · ') : '미가입'}</strong></div>
     <div class="life-stat"><span>연금</span><strong>${won(finance.pensionBalance)}원 · 소득의 ${Math.round(finance.pensionRate*100)}%</strong></div>
     <div class="life-stat"><span>누적 세금</span><strong>${won(finance.taxesPaid)}원</strong></div>
     <div class="life-stat"><span>인맥</span><strong>${social.contacts.length}명 · 평판 ${Math.round(social.reputation)}</strong></div>
     ${justice.case?`<div class="life-stat"><span>형사사건</span><strong class="down">⚖️ ${justice.case.crime} · ${justice.case.phase}</strong></div>`:''}
     <div class="life-stat"><span>연대기</span><strong>📜 ${legacyState.timeline.length}개 기록 · 가문 ${legacyState.dynasty.length+1}대</strong></div>
     ${finance.claims ? `<div class="life-stat"><span>보험금 수령</span><strong class="up">${won(finance.claims)}원</strong></div>` : ''}
     <div class="life-stat"><span>경기 설명</span><strong class="muted">${ECONOMY.phase(S.economy).desc}</strong></div>
     <div class="life-stat"><span>직업</span><strong>${job.emoji} ${job.name} <span class="risk-tag">${risk.icon}${risk.label}</span></strong></div>
     ${APTITUDE&&(job.apt||[]).length?(()=>{const m=APTITUDE.match(job,L),t=APTITUDE.matchTier(m);return `<div class="life-stat"><span>직업 적합도</span><strong class="${t.mood}">${t.icon} ${t.label} ${m}%</strong></div>`;})():''}
     ${APTITUDE?`<div class="life-stat"><span>적성</span><strong>${APTITUDE.ranked(L).map(a=>`${a.icon}${a.value}`).join(' · ')}</strong></div>`:''}
     <div class="life-stat"><span>직급</span><strong>📈 ${CAREER.rank(L)} · 경력 ${CAREER.ensure(L).months}개월</strong></div>
     <div class="life-stat"><span>직무능력</span><strong>${Math.round(CAREER.ensure(L).skill)} · 성과 ${Math.round(CAREER.ensure(L).performance)} · 평판 ${Math.round(CAREER.ensure(L).reputation)}</strong></div>
     ${CAREER.ensure(L).certifications.length?`<div class="life-stat"><span>자격</span><strong>${CAREER.ensure(L).certifications.map(id=>(CAREER.CERTS.find(c=>c.id===id)||{}).icon+(CAREER.CERTS.find(c=>c.id===id)||{}).name).join(' · ')}</strong></div>`:''}
     ${CAREER.abilities(L).length?`<div class="life-stat"><span>직업 특수능력</span><strong class="up">${CAREER.abilities(L).map(a=>a.icon+a.name).join(' · ')}</strong></div>`:''}
     <div class="life-stat"><span>월 수입</span><strong>${jobIncomeLabel(job)}</strong></div>
     <div class="life-stat"><span>행복도</span><strong>${hearts} ${Math.round(L.happy)}/100</strong></div>
     <div class="life-stat"><span>건강</span><strong class="${L.health < 35 ? 'down' : ''}">❤️ ${Math.round(L.health)}/100</strong></div>
     <div class="life-stat"><span>스트레스</span><strong class="${L.stress > 70 ? 'down' : ''}">🧠 ${Math.round(L.stress)}/100</strong></div>
     <div class="life-stat"><span>도덕성</span><strong class="${(L.morality==null?60:L.morality)<30?'down':''}">🕊️ ${Math.round(L.morality==null?60:L.morality)}/100 · ${moralityLabel(L.morality==null?60:L.morality)}</strong></div>
     <div class="life-stat"><span>죄책감</span><strong class="${(L.guilt||0)>=60?'down':''}">🌫️ ${Math.round(L.guilt||0)}/100</strong></div>
     <div class="life-stat"><span>체력</span><strong>🏃 ${Math.round(L.fitness)}/100</strong></div>
     <div class="life-stat"><span>세대</span><strong>🌳 ${L.generation}대</strong></div>
     <div class="life-stat"><span>주인공</span><strong>${L.playerName}</strong></div>
     <div class="life-stat"><span>가족 유대</span><strong>🏡 ${Math.round(L.familyBond)}/100</strong></div>
     ${L.generation===1?`<div class="life-stat"><span>부모님</span><strong class="${L.parentHealth<35?'down':''}">만 ${Math.floor(L.parentAge)}세 · 건강 ${Math.round(L.parentHealth)}</strong></div>`:''}
     ${L.familyPlan?`<div class="life-stat"><span>가족 계획</span><strong>👶 ${L.familyPlan.method} · ${L.familyPlan.months}개월 남음</strong></div>`:''}
     <div class="life-stat"><span>자녀</span><strong>${L.children.length}명</strong></div>
     ${L.children.length?`<div class="life-props">${L.children.map(c=>{const t=FAMILY.traitOf(c),origin=c.origin==='affair'?'혼외자':c.origin==='premarital'?'혼전 출생':c.origin==='casual'?'가벼운 만남에서 태어남':'';return `${t.icon}<b>${c.name}</b> ${FAMILY.childAge(c).label}·${FAMILY.stage(c)}·유대 ${Math.round(c.bond)}${origin?` · <span class="${c.secret?'down':'muted'}">${origin}${c.otherParent?' · '+c.otherParent:''}${c.secret?' · 비밀':''}</span>`:''}`}).join('<br>')}</div>`:''}
     ${L.conditions.length ? `<div class="life-stat"><span>질환</span><strong class="down">${HEALTH.conditionDetails(L).map(c=>c.icon+c.name).join(' · ')}</strong></div>` : ''}
     <div class="life-stat"><span>관계</span><strong>${relLabel}</strong></div>
     ${L.relationship !== 'single' ? `<div class="life-stat"><span>친밀도</span><strong>${Math.max(0,L.affection||0)}</strong></div>` : ''}
     ${partnerRow}
     <div class="life-stat"><span>매력</span><strong>${Math.floor(L.charm)} <span class="muted">${charmHint}</span></strong></div>
     <div class="life-stat"><span>투자용 부동산</span><strong>${L.properties.length}채 · ${won(propVal)}원</strong></div>
     <div class="life-stat"><span>주식 외 자동수입</span><strong class="up">월 예상 ${won(passiveExpected)}원 · ${passiveOwned.length}개 자산</strong></div>
     <div class="life-stat"><span>개인 대출</span><strong class="${L.loan > 0 ? 'down' : ''}">${won(L.loan)}원</strong></div>
     <div class="life-stat"><span>신용등급</span><strong class="${L.creditScore < 500 ? 'down' : ''}">${LOAN.grade(L.creditScore)} · ${Math.round(L.creditScore)}점</strong></div>
     ${L.jailMonths > 0 ? `<div class="life-stat"><span>신분</span><strong class="down">🔒 수감 중 · ${L.jailMonths}개월 남음</strong></div>` : ''}
     ${L.criminalRecord > 0 ? `<div class="life-stat"><span>전과</span><strong class="down">${L.criminalRecord}범</strong></div>` : ''}
     ${L.collectionLevel ? `<div class="life-stat"><span>추심 상태</span><strong class="down">${['','상환 독촉','방문 추심','위험한 추심'][L.collectionLevel]}</strong></div>` : ''}
     <div class="life-stat total"><span>총 재산</span><strong>${won(totalWealth())}원</strong></div>
     ${L.properties.length ? '<div class="life-props">' + L.properties.map(p => `${p.emoji}${p.name}`).join(' · ') + '</div>' : ''}`;
}

/* ---- 마감 리포트에 들어갈 '이번 달 행동' 허브 ---- */
function storyProgressHTML(L) {
  const rows=ensureMet(L).filter(r=>STORIES.get(r.name)&&['friend','casual','partner','polycule','lover'].includes(r.status)).map(r=>{
    const story=STORIES.get(r.name),state=STORIES.ensure(r),next=STORIES.next(r);
    const title=state.completed?(state.ending&&state.ending.title||'완결'):story.chapters[state.chapter].title;
    const bars=story.chapters.map((_,i)=>`<i class="${i<state.chapter?'done':i===state.chapter&&next?'ready':''}"></i>`).join('');
    return `<div class="story-progress-card"><strong>${r.emoji||'📖'} ${r.name}</strong><div><div class="story-track" aria-label="${r.name} 개인 스토리 ${state.chapter}/3">${bars}</div><small>${state.completed?`완결 · ${title}`:next?`${state.chapter+1}장 진행 가능 · ${title}`:`${state.chapter+1}장 ${title} · 호감 ${story.chapters[state.chapter].min} 필요`}</small></div></div>`;
  });
  return rows.length?`<div class="story-progress-list"><div class="hub-title">📖 이어지는 인물 이야기</div>${rows.slice(0,5).join('')}</div>`:'';
}

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
  const passiveBtns = D.PASSIVE_ASSETS.map(a => {
    const count=(L.passiveAssets||[]).filter(x=>x.id===a.id).length, net=Math.max(0,a.monthlyIncome-a.maintenance);
    return `<button class="life-btn" data-act="passive-buy" data-id="${a.id}">${a.emoji} ${a.name} 매입 <small>${won(a.price)} · 월 예상 ${won(net)} · ${a.desc}</small></button>${count?`<button class="life-btn hot" data-act="passive-sell" data-id="${a.id}">${a.emoji} ${a.name} 1개 매각 <small>${count}개 보유 · ${won(Math.round(a.price*a.resaleRate))} 회수</small></button>`:''}`;
  }).join('');
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
  const breakupBtn = L.partner ? `<button class="life-btn hot" data-act="breakup">💔 ${L.relationship === 'married' ? '이혼하기' : '헤어지기'}</button>` : '';
  const poly=ensurePolycule(L),trioBond=L.dangerousTrioBond;
  const polyBtn=trioBond&&trioBond.active
    ? `<span class="down">🦂 결핍 공생 연애 · 강유진·한채린·윤세라 전원 연인 · 외출 동행 활성</span>`
    : L.partner&&!poly.active
      ? `<button class="life-btn" data-act="polycule">🌈 일반 다자연애 제안</button>`
      : poly.active?`<span class="up">🌈 합의형 관계 진행 중 · 추가 구성원 ${poly.members.length}명 · 신뢰 ${poly.trust}</span>`:'';
  const relBtns = L.relationship === 'married'
    ? `<span class="muted">💍 ${L.partner.name}님과 결혼 생활 중</span>${polyBtn}${breakupBtn}`
    : partnerTag + `<button class="life-btn" data-act="date">🚶 외출·사람 만나기 <small>${won(R.DATE_COST)}</small></button>` +
      (canMarry ? `<button class="life-btn hot" data-act="marry">💍 결혼하기 <small>${won(R.WEDDING_COST)}</small></button>` : '') + polyBtn + breakupBtn;
  const rivalSelect = `<select id="rival-target">${S.bots.map((b,i)=>`<option value="${i}">${b.name} · ${won(botNetWorth(b))}</option>`).join('')}</select>`;
  const rivalBtns = RIVALS.ACTIONS.map(a=>`<button class="life-btn ${a.illegal?'hot':''}" data-act="rival" data-rival-action="${a.id}" ${L.jailMonths>0?'disabled':''}>${a.label} <small>${won(a.cost)} · ${a.desc}</small></button>`).join('');
  const faction=RIVALS.ensureFaction(L);
  const factionMembers=(faction.members||[]).map(m=>{
    const role=RIVALS.ROLE_LABELS[m.role]||{icon:'👤',name:m.role};
    const state=(m.injuredMonths||0)>0?`<span class="down">부상 ${m.injuredMonths}개월</span>`:`충성 ${Math.round(m.loyalty||0)}`;
    const income=(m.stats&&m.stats.income)||0,net=income-(m.upkeep||0);
    return `<div class="faction-member"><img src="${characterPortrait(m)}" alt="${m.name}"><span><b>${m.name}</b><small>${role.icon} ${role.name} · ${state}<br>사업 ${won(income)} · 운영비 ${won(m.upkeep||0)} · <b class="${net>=0?'up':'down'}">순익 ${net>=0?'+':''}${won(net)}</b></small></span></div>`;
  }).join('');
  const operationBoost=Math.round((faction.operationBoost||0)*100);
  const lastTrade=faction.lastTradeCall&&faction.lastTradeCall.stock?`<br>최근 공동매매: <b>${faction.lastTradeCall.stock}</b> ${faction.lastTradeCall.direction>0?'매수':'매도'}${faction.lastTradeCall.result?` · ${faction.lastTradeCall.result}`:''}`:'';
  const fundBox = faction.level ? `<div class="faction-fund">🏗️ 누적 조직 운영 투자 <b class="up">${won(faction.fund||0)}</b> <span class="muted">· 회수 불가 · 사업 효율 +${operationBoost}% · 공동매매 규모와 방어·정보망 강화</span></div>
    <button class="life-btn" data-act="faction-entrust" data-amt="1000000">운영 투자 +100만</button>
    <button class="life-btn" data-act="faction-entrust" data-amt="5000000">운영 투자 +500만</button>
    <button class="life-btn" data-act="faction-entrust" data-amt="10000000">운영 투자 +1,000만</button>` : '';
  const factionBox=`<div class="faction-status">🛡️ <b>${faction.name}</b> · 단계 ${faction.level}/5 · 구성원 ${faction.members.length}/${faction.capacity}명 · 방어 ${Math.round(faction.defense*100)}% · 정보 ${Math.round((faction.intel||0)*100)}% · 역공 ${faction.wins}승<br>월 예상: 거점·사업 <b class="up">+${won(faction.projectedGross||0)}</b> · 운영비 <b class="down">-${won(faction.projectedUpkeep||0)}</b> · 순익 <b class="${(faction.projectedNet||0)>=0?'up':'down'}">${(faction.projectedNet||0)>=0?'+':''}${won(faction.projectedNet||0)}</b>${faction.assets&&faction.assets.length?`<br>거점: ${faction.assets.map(a=>a.icon+a.name).join(' · ')}`:''}${faction.lastAttacker?`<br>최근 공격자: ${faction.lastAttacker}`:''}${lastTrade}</div>${factionMembers?`<div class="faction-members">${factionMembers}</div>`:'<div class="hub-note">구성원이 없어도 거점 기본 수입은 발생합니다. 인원을 모집하면 사업 수익과 방어력이 함께 늘어납니다.</div>'}<button class="life-btn" data-act="faction" data-faction="build">🏗️ ${faction.level?'세력 강화·정원 확장':'내 세력 만들기'}</button><button class="life-btn" data-act="faction-recruit" ${faction.level&&faction.members.length<faction.capacity?'':'disabled'}>👥 인원 모집 <small>${faction.members.length}/${faction.capacity}명 · 일반 인력/특별 아군</small></button><button class="life-btn hot" data-act="faction" data-faction="revenge" ${faction.level&&faction.members.length?'':'disabled'}>🔥 선택한 라이벌에게 역공</button>${fundBox}`;
  const planBtns = L.relationship==='married'&&!L.familyPlan ? `<button class="life-btn" data-act="family-plan" data-method="birth">👶 출산 계획 <small>5,000,000</small></button><button class="life-btn" data-act="family-plan" data-method="adopt">🫶 입양 신청 <small>12,000,000</small></button>` : '';
  const childBtns = L.children.map(c=>`<button class="life-btn" data-act="child-bond" data-child="${c.id}">🫶 ${c.name}와 시간 보내기 <small>200,000</small></button><button class="life-btn" data-act="child-edu" data-child="${c.id}">📚 ${c.name} 교육 투자 <small>1,000,000</small></button>`).join('');
  const certBtns = CAREER.CERTS.filter(c=>!CAREER.ensure(L).certifications.includes(c.id)).map(c=>`<button class="life-btn" data-act="cert" data-cert="${c.id}">${c.icon} ${c.name} <small>${won(c.cost)}</small></button>`).join('');
  const housingBtns = HOUSING.HOMES.flatMap(h=>Object.values(HOUSING.TENURES).filter(t=>h.id!=='parents'||t.id==='monthly').map(t=>{const q=HOUSING.quote(h,t.id),current=h.id===L.housing.id&&t.id===L.housing.tenure;return`<button class="life-btn ${current?'hot':''}" data-act="move" data-home="${h.id}" data-tenure="${t.id}" ${current?'disabled':''}>${h.icon}${t.icon} ${h.name} · ${t.name} <small>초기 ${won(q.upfront)} · 월 ${won(q.monthly)}</small></button>`;})).join('');
  const insuranceBtns = LIFE_FINANCE.POLICIES.map(p => finance.policies.includes(p.id)
    ? `<button class="life-btn hot" data-act="insurance-cancel" data-policy="${p.id}">${p.icon} ${p.name} 해지 <small>월 ${won(p.premium)}</small></button>`
    : `<button class="life-btn" data-act="insurance" data-policy="${p.id}">${p.icon} ${p.name} <small>${p.desc} · 월 ${won(p.premium)}</small></button>`).join('');
  const pensionBtns = [.05,.09,.15].map(rate=>`<button class="life-btn ${Math.abs(finance.pensionRate-rate)<.001?'hot':''}" data-act="pension" data-rate="${rate}">연금 ${Math.round(rate*100)}%</button>`).join('');
  const contactBtns = social.contacts.map(c=>{const r=SOCIAL.role(c);const ready=c.trust>=30&&c.favor>=1;return `<button class="life-btn" data-act="contact-nurture" data-contact="${c.id}">${r.icon} ${c.name} 만나기 <small>신뢰 ${c.trust}/30 · 호의 ${c.favor} · 300,000</small></button><button class="life-btn ${ready?'hot':''}" data-act="contact-ask" data-contact="${c.id}" ${ready?'':'disabled'}>🙏 ${r.benefit} 부탁 <small>${ready?'가능':'신뢰30·호의1 필요'}</small></button>`}).join('');
  const specialMet = id => ensureMet(L).some(m => m.special === id);
  const sctx = specialRouteContext(L);
  const specialMeetBtns = [
    (!specialMet('police') && (justice.case || L.criminalRecord > 0 || sctx.attacked)) ? '<button class="life-btn" data-act="meet-special" data-special="yujin">👮‍♀️ 경찰서에서 상담한다 <small>공격·사건·전과가 만든 인연</small></button>' : '',
    (!specialMet('heiress') && sctx.factionLevel >= 2 && sctx.factionMembers >= 3) ? '<button class="life-btn" data-act="meet-special" data-special="chaerin">🥂 한채린의 비공개 회동 제안을 받는다 <small>세력 2단계 · 조직원 3명 이상</small></button>' : ''
  ].join('');
  const personalBtns = ensureMet(L).filter(m=>['friend','casual','partner','polycule','lover'].includes(m.status)).map(m=>{const st=STORIES.get(m.name),next=st&&STORIES.next(m),state=st&&STORIES.ensure(m),sig=CHAR_TRAITS&&CHAR_TRAITS.label(m);return`<button class="life-btn" data-act="person-request" data-person="${m.name}">🙏 ${m.name}에게 부탁하기 <small>${relationTag(L,m.name)} · 호감 ${Math.round(m.affection||0)}${sig?` · ${sig}`:''}</small></button>${st?`<button class="life-btn ${next?'hot':''}" data-act="character-story" data-person="${m.name}">📖 ${m.name} 개인 스토리 <small>${state.completed?'완결':next?`${state.chapter+1}장 진행 가능`:`${state.chapter+1}장 · 호감 ${st.chapters[state.chapter].min} 필요`}</small></button>`:''}`;}).join('');
  const courtBtns=justice.case?`<div class="court-status">⚖️ <b>${justice.case.crime}</b> · <b class="down">${justice.case.phase}</b> 단계 · ${justice.case.months}개월 남음<br><span class="muted">${justice.case.phase==='수사'?'변호사를 미리 선임하면 유리합니다':justice.case.phase==='기소'?'변호사 등급이 불기소 확률에 영향':'⚠️ 재판 전략 3가지 중 하나를 꼭 선택하세요'}</span></div><button class="life-btn" data-act="lawyer" data-tier="public">국선변호인</button><button class="life-btn" data-act="lawyer" data-tier="standard">전문 변호사 <small>5,000,000</small></button><button class="life-btn" data-act="lawyer" data-tier="elite">대형 로펌 <small>20,000,000</small></button>${justice.case.phase==='재판'?'<button class="life-btn" data-act="court" data-strategy="plea">혐의 인정·선처</button><button class="life-btn" data-act="court" data-strategy="contest">무죄 다툼</button><button class="life-btn" data-act="court" data-strategy="cooperate">수사 협조</button>':''}`:'<span class="muted">진행 중인 사건 없음</span>';
  const treatment=HEALTH.treatmentOffer(L);
  const actionUsed = lifeActionCount();
  const actionLeft = lifeActionRemaining();
  const weekLabel = actionLeft > 0 ? `${actionUsed + 1}주차 일정 선택` : '이번 달 일정 완료';
  const quickBtns=`<button class="life-btn" data-act="date">🚶 외출·사람 만나기</button><button class="life-btn" data-act="rest">🛌 쉬기 <small>300,000</small></button><button class="life-btn" data-act="career-train">📚 직무교육 <small>700,000</small></button>${treatment?`<button class="life-btn hot" data-act="treat">💊 ${treatment.name} 치료</button>`:''}${L.loan>0?`<button class="life-btn hot" data-act="repay">💳 대출 상환</button>`:''}`;
  return `
    <div class="life-hub">
      <div class="hub-title">🎬 ${weekLabel} <span class="muted">주요 행동 ${actionUsed}/${LIFE_ACTIONS_PER_MONTH} · 남은 자유시간 ${actionLeft}회</span></div>
      <div class="life-time-progress" aria-label="이번 달 자유시간 사용 현황">${Array.from({length:LIFE_ACTIONS_PER_MONTH},(_,i)=>`<span class="${i<actionUsed?'used':i===actionUsed?'available current':'available'}">${i<actionUsed?'✓':i+1+'주차'}</span>`).join('')}</div>
      <div class="hub-note">외출·취미·휴식·경력·인맥·가족·라이벌 중 서로 다른 행동을 최대 3회 선택하세요. 게임·맛집·헬스·여행·휴식 같은 활동 중에도 취향이 맞는 사람을 우연히 만날 수 있고, 외출 장소와 현재 조건에 따라 만나는 인물과 특별 장면이 달라집니다.</div>
      ${storyProgressHTML(L)}
      <div class="month-action-status">${['데이트','취미','휴식','경력','인맥','가족','라이벌'].map(g=>`<span class="${monthActionUsed(g)?'done':''}">${monthActionUsed(g)?'✓':'○'} ${g}</span>`).join('')}</div>
      <div class="hub-quick">${quickBtns}</div>
      <details class="hub-more"><summary>🧰 다른 행동 보기</summary>
        <details class="hub-section"><summary>🎨 취미·건강·연애</summary><div class="hub-btns">${hobbyBtns}<button class="life-btn" data-act="checkup">🏥 건강검진 <small>500,000</small></button><button class="life-btn" data-act="treat">💊 치료${treatment?' · '+treatment.name+' '+won(treatment.cost):''}</button>${relBtns}</div></details>
        <details class="hub-section"><summary>📈 경력·거주지 이동</summary><div class="hub-note">🏠 월세는 초기금이 낮지만 매달 비용이 나갑니다. 전세는 월 부담이 매우 낮고, 매매는 집값을 한 번 지불하면 월 주거비 0원이며 자산으로 남습니다.</div><div class="hub-btns"><button class="life-btn" data-act="changejob">💼 이직</button><button class="life-btn" data-act="career-train">📚 직무교육</button>${certBtns}${housingBtns}</div></details>
        <details class="hub-section"><summary>👨‍👩‍👧 가족·인맥</summary><img class="hub-scene-banner" src="${lifeSceneImage('network')}" alt="업계 인맥 모임 장면"><div class="hub-btns">${planBtns}${childBtns}<button class="life-btn" data-act="parent-care">👵 부모님 돌봄 <small>1,500,000</small></button><button class="life-btn" data-act="contact-meet">🍽️ 업계 모임</button>${specialMeetBtns}${personalBtns}${contactBtns}</div></details>
        <details class="hub-section"><summary>💳 금융·자동수입·투자용 부동산</summary><img class="hub-scene-banner" src="${lifeSceneImage('property')}" alt="자산 계약 장면"><div class="hub-note">💸 예금·채권·운영권은 주식과 별개로 매달 현금을 만듭니다. 높은 수익에는 매출 변동과 낮은 매각가가 따릅니다.</div><div class="hub-btns">${loanBtns}<button class="life-btn" data-act="repay">상환${L.loan>0?' '+won(L.loan):''}</button>${insuranceBtns}${pensionBtns}${passiveBtns}${propBtns}</div></details>
        <details class="hub-section" ${justice.case?'open':''}><summary>⚔️ 라이벌·세력·법정${justice.case?' · 진행 중 사건 있음':''}</summary><img class="hub-scene-banner" src="${justice.case?lifeSceneImage('court'):lifeSceneImage('faction')}" alt="${justice.case?'법정 심리':'라이벌 공격에 대응하는 세력 작전실'} 장면"><div class="hub-btns">${factionBox}${rivalSelect}${rivalBtns}${courtBtns}</div></details>
      </details>
    </div>`;
}

function wireLifeHub(host) {
  host.querySelectorAll('.life-btn').forEach(b => {
    const group=monthlyGroupForAction(b.dataset.act);
    if(group&&(monthActionUsed(group)||lifeActionExhausted())){
      b.disabled=true;b.classList.add('month-used');b.title=monthActionUsed(group)?`이번 달 ${group} 행동은 이미 사용했습니다`:'이번 달 자유시간을 모두 사용했습니다';
      const small=b.querySelector('small');if(small)small.textContent=monthActionUsed(group)?`이번 달 ${group} 완료`:'자유시간 모두 사용';
    }
  });
  host.querySelectorAll('.life-btn').forEach(b => b.addEventListener('click', () => {
    const act = b.dataset.act;
    const monthlyGroup=monthlyGroupForAction(act);
    if(monthlyGroup&&monthActionUsed(monthlyGroup)){flashToast(`📅 이번 달 ${monthlyGroup} 행동은 이미 했습니다`,'neutral');return;}
    if(monthlyGroup&&lifeActionExhausted()){flashToast('📅 이번 달 자유시간 3회를 모두 사용했습니다','neutral');return;}
    if (act === 'hobby') doHobby(b.dataset.id);
    else if (act === 'prop') buyProperty(b.dataset.id);
    else if (act === 'passive-buy') buyPassiveAsset(b.dataset.id);
    else if (act === 'passive-sell') sellPassiveAsset(b.dataset.id);
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
    else if (act === 'move') doMoveHousing(b.dataset.home,b.dataset.tenure);
    else if (act === 'insurance') doInsurance(b.dataset.policy);
    else if (act === 'insurance-cancel') cancelInsurance(b.dataset.policy);
    else if (act === 'pension') setPensionRate(+b.dataset.rate);
    else if (act === 'contact-meet') meetContact();
    else if (act === 'contact-nurture') nurtureContact(b.dataset.contact);
    else if (act === 'contact-ask') askContact(b.dataset.contact);
    else if (act === 'meet-special') meetSpecialPerson(b.dataset.special);
    else if (act === 'person-request') showPersonRequest(b.dataset.person);
    else if (act === 'character-story') showCharacterStory(b.dataset.person);
    else if (act === 'lawyer') hireCourtLawyer(b.dataset.tier);
    else if (act === 'court') chooseCourtStrategy(b.dataset.strategy);
    else if (act === 'rival') doRivalAction(b.dataset.rivalAction, +($('rival-target') ? $('rival-target').value : 0));
    else if (act === 'faction') doFactionAction(b.dataset.faction, +($('rival-target') ? $('rival-target').value : 0));
    else if (act === 'faction-recruit') showFactionRecruitment();
    else if (act === 'faction-entrust') entrustFaction(+b.dataset.amt);
    else if (act === 'date') doDate();
    else if (act === 'marry') doMarriage();
    else if (act === 'breakup') doBreakupChoice();
    else if (act === 'polycule') showPolyculeProposal();
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
      const value = qty * price;
      bot.capital -= value;
      bot.owned[target.name] = (has || 0) + qty;
      if (value >= 2000000) {
        pushRivalFeed(`🛒 ${bot.name} · ${target.name} ${qty.toLocaleString('ko-KR')}주 대량 매수 (${won(value)})`);
        if (value >= 5000000 && S.phase === 'open' && !S._helpActive && Math.random() < 0.14)
          showRivalAlert(bot, `<b>${bot.name}</b>이(가) <b>${target.name}</b>을(를) ${qty.toLocaleString('ko-KR')}주 대량 매수했어요! (${won(value)})`, target.name);
      }
    } else if (has) {
      const value = has * price;
      bot.capital += value;
      delete bot.owned[target.name];
      if (value >= 2000000) pushRivalFeed(`📤 ${bot.name} · ${target.name} 전량 매도 (${won(value)})`);
    }
  });
}

function pushRivalFeed(text) {
  S.rivalFeed = S.rivalFeed || [];
  S.rivalFeed.unshift({ day: S.day, text });
  if (S.rivalFeed.length > 50) S.rivalFeed.length = 50;
}

function showRivalAlert(bot, html, stockName) {
  const emoji = (bot.name.match(/^\S+/) || ['🤖'])[0];
  showHelpCard({ emoji, name: bot.name, portrait:bot.portrait }, `⚔️ <b>라이벌 동향</b><br>${html}`, stockName ? () => goBuy(stockName) : null, stockName ? '📈 차트 보기' : null);
}

/* ---- 장중 라이벌 습격: 즉시 피해 + 세력 있으면 그 자리에서 역공 ---- */
function maybeRivalRaid() {
  if (S.phase !== 'open' || S._helpActive) return;
  if (Math.random() > CFG.RAID_PROB) return;
  const L = S.life; if (!L) return;
  const targets = S.bots.filter(b => b.jailMonths <= 0 && (b.aggression || 0) >= 0.22);
  if (!targets.length) return;
  const attacker = pick(targets);
  const idx = S.bots.indexOf(attacker);
  const worth = Math.max(0, totalWealth());
  const illegal = attacker.aggression > 0.4 && Math.random() < 0.5;
  let loss = Math.round(Math.max(100000, worth * rand(0.008, illegal ? 0.055 : 0.03)));

  // 세력 방어 적용
  const f = RIVALS.ensureFaction(L);
  f.lastAttacker = attacker.name;
  L._attackedRecently = 3;   // 최근 피습 → 경찰(강유진) 조우 조건
  let blocked = false, mitigated = 0;
  const def = Math.min(0.9, (f.defense || 0) + (f.tempDefense || 0)); f.tempDefense = 0;
  if (f.level && Math.random() < def) { blocked = true; loss = 0; }
  else if (f.level) { mitigated = Math.round(loss * f.defense * 0.65); loss = Math.max(0, loss - mitigated); }

  if (loss > 0) {
    const cashLoss = Math.min(Math.max(0, S.capital), loss);
    S.capital -= cashLoss;
    if (loss > cashLoss) LOAN.addDebt(L, loss - cashLoss, '라이벌 공작 피해');
    L.happy = clamp(L.happy - 4, 0, 100);
  }
  pushRivalFeed(`⚔️ ${attacker.name}의 ${illegal ? '불법 공작' : '견제'} · ${blocked ? '세력이 방어!' : `-${won(loss)}${mitigated ? ` (경감 ${won(mitigated)})` : ''}`}`);

  const emoji = (attacker.name.match(/^\S+/) || ['🦈'])[0];
  const msg = blocked
    ? `🛡️ <b>${f.name}</b>이(가) <b>${attacker.name}</b>의 ${illegal ? '불법 공작' : '견제'}을 막아냈어요!`
    : `⚔️ <b>${attacker.name}</b>이(가) 당신을 ${illegal ? '불법 공작으로 ' : ''}공격! <b class="down">-${won(loss)}</b>${mitigated ? ` <span class="muted">(세력 경감 ${won(mitigated)})</span>` : ''}`;
  const canRevenge = f.level >= 1 && f.members.length > 0 && !blocked;
  const cost = 500000 + f.level * 250000;
  S._raidTarget = idx;
  showHelpCard({ emoji, name: attacker.name, portrait:attacker.portrait }, `⚔️ <b>라이벌 습격</b><br>${msg}`, canRevenge ? doRaidRevenge : null, canRevenge ? `🔥 역공 (작전비 ${won(cost)})` : null);
  playSound('error');
}

function doRaidRevenge() {
  const idx = S._raidTarget; if (idx == null) return;
  const r = RIVALS.revenge(S.life, S.bots, idx, S.capital);
  if (!r.ok) { flashToast(`⛔ ${r.message}`, 'bad'); return; }
  S.capital = r.cash;
  pushRivalFeed(`🔥 [역공] ${r.message}`);
  addNews(`🔥 ${r.message}`, r.success ? 'good' : 'neutral');
  flashToast(r.message, r.success ? 'good' : 'neutral');
  S._raidTarget = null;
  renderCapital(); renderLeaderboard(); autoSave();
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
  (bot.assets||[]).forEach(a=>{v+=a.value||0;});
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

/* ---- 지정가 주문(限价): 그 가격에 도달하면 자동 체결 (매수=하락 시, 매도=상승 시) ---- */
function placeLimit(side) {
  if (S.life && S.life.jailMonths > 0) { flashToast(`🔒 수감 중 · ${S.life.jailMonths}개월 남음`, 'bad'); return; }
  const stock = curStock(); if (!stock) return;
  const price = parseInt($('limit-price').value) || 0;
  const qty = side === 'buy' ? (parseInt($('qty-buy').value) || 0) : (parseInt($('qty-sell').value) || 0);
  if (price < 1) { flashToast('지정가(가격)를 입력하세요', 'bad'); return; }
  if (qty < 1) { flashToast('수량을 입력하세요', 'bad'); return; }
  S.limitOrders = S.limitOrders || [];
  if (S.limitOrders.length >= 20) { flashToast('지정가 주문은 최대 20건까지 가능합니다', 'bad'); return; }
  S.limitOrders.push({ id: 'lo' + Date.now() + Math.random().toString(36).slice(2, 5), name: stock.name, side, qty, price });
  addNews(`📋 지정가 ${side === 'buy' ? '매수' : '매도'} 등록 · ${stock.name} ${qty}주 @${won(price)}`, 'neutral');
  flashToast(`📋 지정가 ${side === 'buy' ? '매수' : '매도'} 등록 · ${stock.name} @${won(price)}`, 'neutral');
  renderLimitOrders(); autoSave();
}

function cancelLimit(id) {
  S.limitOrders = (S.limitOrders || []).filter(o => o.id !== id);
  flashToast('지정가 주문을 취소했습니다', 'neutral');
  renderLimitOrders(); autoSave();
}

// 매 틱: 가격이 지정가에 도달한 주문을 체결
function runLimitOrders() {
  if (!S.limitOrders || !S.limitOrders.length) return;
  const remain = [];
  let changed = false;
  S.limitOrders.forEach(o => {
    const stock = S.stocks.find(s => s.name === o.name && s.listed);
    if (!stock) { addNews(`⛔ 지정가 취소 · ${o.name} 상장폐지`, 'bad'); changed = true; return; }
    const cur = stock.history[stock.history.length - 1].c;
    const hit = o.side === 'buy' ? cur <= o.price : cur >= o.price;
    if (!hit) { remain.push(o); return; }
    // 체결가는 지정가보다 유리하면 유리한 쪽으로
    const fillPrice = o.side === 'buy' ? Math.min(o.price, cur) : Math.max(o.price, cur);
    const ok = fillLimit(o, fillPrice);
    changed = true;
    if (!ok) addNews(`⛔ 지정가 불발 · ${o.name} ${o.qty}주 (자금·보유 부족)`, 'bad');
  });
  S.limitOrders = remain;
  if (changed) { renderLimitOrders(); }
}

function fillLimit(o, price) {
  const pos = S.owned[o.name];
  if (o.side === 'buy') {
    const gross = price * o.qty, fee = Math.round(gross * CFG.FEE_RATE), cost = gross + fee;
    if (cost > buyingPower()) return false;
    const cashUsed = Math.min(cost, S.capital), borrowed = cost - cashUsed;
    S.capital -= cashUsed; if (borrowed > 0) { S.loan += borrowed; S.usedLeverage = true; }
    if (pos && pos.qty > 0) { const t = pos.qty + o.qty; pos.avg = (pos.avg * pos.qty + gross) / t; pos.qty = t; }
    else S.owned[o.name] = { qty: o.qty, avg: price };
    S.trades++;
    addNews(`🟢 [지정가 체결] ${o.name} ${o.qty}주 매수 @${won(price)}`, 'good');
    flashToast(`🟢 지정가 매수 체결 · ${o.name} ${o.qty}주 @${won(price)}`, 'good'); playSound('buy');
    return true;
  } else {
    if (!pos || pos.qty < o.qty) return false;
    const gross = price * o.qty, fee = Math.round(gross * CFG.FEE_RATE), tax = Math.round(gross * CFG.TAX_RATE), proceeds = gross - fee - tax;
    if (S.loan > 0) { const r = Math.min(S.loan, proceeds); S.loan -= r; S.capital += proceeds - r; } else S.capital += proceeds;
    const realized = (price - pos.avg) * o.qty - fee - tax; S.realizedPnL += realized;
    pos.qty -= o.qty; if (pos.qty === 0) delete S.owned[o.name];
    S.trades++;
    addNews(`🔴 [지정가 체결] ${o.name} ${o.qty}주 매도 @${won(price)} (실현 ${won(realized)})`, realized >= 0 ? 'good' : 'bad');
    flashToast(`🔴 지정가 매도 체결 · 실현 ${won(realized)}원`, realized >= 0 ? 'good' : 'bad'); playSound('sell');
    return true;
  }
}

function renderLimitOrders() {
  const el = $('limit-orders'); if (!el) return;
  const orders = S.limitOrders || [];
  if (!orders.length) { el.style.display = 'none'; el.innerHTML = ''; return; }
  el.style.display = 'block';
  el.innerHTML = `<div class="po-title">📋 지정가 주문 ${orders.length}건 <span class="muted">가격 도달 시 자동 체결</span></div>` +
    orders.map(o => {
      const cur = priceOf(o.name);
      const gap = cur ? ((o.price - cur) / cur * 100).toFixed(1) : '?';
      return `<div class="po-row"><span class="${o.side === 'buy' ? 'up' : 'down'}">${o.side === 'buy' ? '매수' : '매도'}</span>
        <strong>${o.name}</strong> ${o.qty}주 <b>@${won(o.price)}</b> <span class="muted">(현재 ${won(cur)} · ${gap > 0 ? '+' : ''}${gap}%)</span>
        <button class="po-cancel" data-id="${o.id}">취소</button></div>`;
    }).join('');
  el.querySelectorAll('.po-cancel').forEach(b => b.addEventListener('click', () => cancelLimit(b.dataset.id)));
}

/* ---- 호가창(order book): 현재가 주변 매도/매수 호가 사다리 (클릭 시 지정가로 입력) ---- */
function renderOrderBook() {
  const el = $('orderbook'); if (!el) return;
  const stock = curStock();
  if (!stock) { el.innerHTML = ''; return; }
  const cur = priceOf(stock.name);
  const tick = Math.max(1, Math.round(cur * 0.004));   // 호가 단위(약 0.4%)
  const rng = (stock.volume || 1e5);
  const qtyAt = () => Math.max(1, Math.round(rng * rand(0.02, 0.18) / Math.max(1, cur / 1000)));
  const rows = [];
  for (let i = 5; i >= 1; i--) rows.push({ p: cur + tick * i, side: 'ask' });   // 매도호가(위)
  rows.push({ p: cur, side: 'cur' });
  for (let i = 1; i <= 5; i++) rows.push({ p: Math.max(1, cur - tick * i), side: 'bid' });  // 매수호가(아래)
  el.innerHTML = `<div class="ob-head">호가창 · <span class="muted">클릭 → 지정가</span></div>` + rows.map(r => {
    if (r.side === 'cur') return `<div class="ob-row ob-cur"><span class="ob-p">${won(r.p)}</span><span class="ob-tag">현재가</span></div>`;
    const cls = r.side === 'ask' ? 'down' : 'up';
    return `<div class="ob-row ob-${r.side}" data-p="${r.p}"><span class="ob-q">${won(qtyAt())}</span><span class="ob-p ${cls}">${won(r.p)}</span></div>`;
  }).join('');
  el.querySelectorAll('.ob-row[data-p]').forEach(row => row.addEventListener('click', () => {
    $('limit-price').value = row.dataset.p;
    flashToast(`지정가 ${won(+row.dataset.p)}원 입력`, 'neutral');
  }));
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
  renderMarketPhase();
  renderStockList();
  renderOwned();
  renderPendingOrders();
  renderLimitOrders();
  renderOrderBook();
  renderCapital();
  renderIssues();
  renderNews();
  renderLeaderboard();
  renderChart();
  renderPortfolioChart();
  renderNetWorthChart();
  renderLifePanel();
  renderChatPanel();
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

/* ------------------------------------------------------------------ 기업 리포트 */

/* 종목별 공시·뉴스 로그.
 * 개별 종목 이슈는 마감 리포트용 sessionNews 로만 흘러가고 개장 때마다 비워지므로,
 * 기업 리포트에서 되짚어 볼 수 있도록 따로 쌓아둔다. */
function logCompanyNews(name, text, impact) {
  S.companyNews = S.companyNews || [];
  S.companyNews.unshift({ name, text, impact, day: S.day, seq: ++S.newsSeq });
  if (S.companyNews.length > 120) S.companyNews.pop();
}

// 이 종목의 뉴스 = 개별 공시 로그 + 종목명이 언급된 일반 뉴스
function newsFor(name) {
  const own = (S.companyNews || [])
    .filter(n => n.name === name)
    .map(n => ({ text: n.text, day: n.day, cls: n.impact > 0 ? 'good' : n.impact < 0 ? 'bad' : 'neutral' }));
  const mentioned = S.news
    .filter(n => n.text.indexOf(name) >= 0)
    .map(n => ({ text: n.text, day: n.day, cls: n.cls }));
  return own.concat(mentioned).sort((a, b) => b.day - a.day).slice(0, 12);
}

function fmtEok(v) {
  const eok = v / 1e8;
  if (Math.abs(eok) >= 10000) return (eok / 10000).toFixed(1) + '조원';
  return Math.round(eok).toLocaleString('ko-KR') + '억원';
}

function showCompanyReport(name) {
  const host = $('report-host'); if (!host || !COMPANY) return;
  const stock = S.stocks.find(s => s.name === name && s.listed);
  if (!stock) { flashToast('상장폐지된 종목입니다', 'neutral'); return; }
  S._reportName = name;

  const ci = changeInfo(stock);
  const isEtf = stock.type === 'etf';
  const isMacro = stock.type === 'macro';
  const isFund = isEtf || isMacro;
  const p = isFund ? { biz:stock.desc || '경제 환경을 추종하는 거래 자산입니다.', desc:stock.desc || '', tags:[] } : COMPANY.profile(name);
  const f = isFund ? null : COMPANY.financials(stock, ci.cur);
  const sec = D.SECTORS[stock.sector] || { name: '-', color: '#888' };
  const senti = COMPANY.sentiment(ci.rate);
  const talk = isFund ? [] : COMPANY.posts(stock, ci.rate, S.day, 7);
  const news = newsFor(name);
  const pos = S.owned[name];

  const num = (v, suffix, digits) => v == null ? '<span class="muted">N/A</span>' : v.toFixed(digits == null ? 2 : digits) + (suffix || '');

  const finRows = isMacro
    ? `<div class="cr-row"><span>유형</span><strong>${stock.icon || '🌐'} 경제자산</strong></div>
       <div class="cr-row"><span>현재 환경</span><strong>${ECONOMY.macroLesson(S.economy)}</strong></div>
       <div class="cr-row"><span>핵심 관계</span><strong>${stock.desc}</strong></div>
       <div class="cr-row"><span>학습 주의</span><strong>실제 시장에서는 여러 요인이 동시에 작용해 이 관계가 항상 같지는 않습니다.</strong></div>`
    : isEtf
    ? `<div class="cr-row"><span>유형</span><strong>지수추종 ETF · ${levLabel(stock.lev)}</strong></div>
       <div class="cr-row"><span>설명</span><strong>개별 기업이 아니라 시장 지수를 ${levLabel(stock.lev)}로 추종합니다.</strong></div>`
    : `<div class="cr-row"><span>시가총액</span><strong>${fmtEok(f.marketCap)}</strong></div>
       <div class="cr-row"><span>발행주식수</span><strong>${Math.round(f.shares / 1e4).toLocaleString('ko-KR')}만주</strong></div>
       <div class="cr-row"><span>매출액 <small>(연)</small></span><strong>${fmtEok(f.sales)}</strong></div>
       <div class="cr-row"><span>영업이익</span><strong class="${f.opProfit >= 0 ? 'up' : 'down'}">${fmtEok(f.opProfit)} <small>(${(f.opMargin * 100).toFixed(1)}%)</small></strong></div>
       <div class="cr-row"><span>PER</span><strong>${num(f.per, '배')} ${f.loss ? '<small class="down">적자</small>' : ''}</strong></div>
       <div class="cr-row"><span>PBR</span><strong>${num(f.pbr, '배')}</strong></div>
       <div class="cr-row"><span>ROE</span><strong class="${f.roe >= 0 ? 'up' : 'down'}">${num(f.roe == null ? null : f.roe * 100, '%', 1)}</strong></div>
       <div class="cr-row"><span>부채비율</span><strong class="${f.debtRatio > 200 ? 'down' : ''}">${f.debtRatio.toFixed(0)}%</strong></div>
       <div class="cr-row"><span>외국인 지분</span><strong>${f.foreign.toFixed(1)}%</strong></div>
       <div class="cr-row"><span>배당수익률</span><strong>${f.divYield ? (f.divYield * 100).toFixed(2) + '%' : '<span class="muted">무배당</span>'}</strong></div>`;

  host.style.display = 'block';
  host.innerHTML =
    `<div class="window event-window cr-window">
       <div class="title-bar cr-bar">
          <div class="title-bar-text">📄 ${isMacro ? '경제자산' : isEtf ? 'ETF' : '기업'} 리포트 · ${name}</div>
         <div class="title-bar-controls"><button aria-label="Close" id="cr-x"></button></div>
       </div>
       <div class="window-body">
         <div class="cr-head">
           <div class="cr-title">
             <span class="tag" style="background:${sec.color}">${sec.name}</span>
             <strong>${name}</strong>
             <span class="cap-badge">${(CAP_META[stock.cap] || {}).badge || ''}${(CAP_META[stock.cap] || {}).label || ''}</span>
           </div>
           <div class="cr-price">
             <b class="${ci.up ? 'up' : 'down'}">${won(ci.cur)}원</b>
             <span class="${ci.up ? 'up' : 'down'}">${ci.up ? '▲' : '▼'} ${pct(ci.rate)}</span>
             ${pos ? `<span class="muted">· 내 보유 ${pos.qty > 0 ? pos.qty + '주' : '공매도 ' + Math.abs(pos.qty) + '주'}</span>` : ''}
           </div>
         </div>

         <details class="cr-sec" open>
           <summary>🏢 기업 개요</summary>
           <div class="cr-body">
              ${isFund ? '' : `<div class="cr-meta">설립 ${p.since}년 · 임직원 ${p.emp.toLocaleString('ko-KR')}명 · ${p.hq} · 대표 ${p.ceo}</div>`}
             <div class="cr-biz">${p.biz}</div>
             <p class="cr-desc">${p.desc}</p>
             ${p.tags.length ? `<div class="cr-tags">${p.tags.map(t => `<span class="cr-tag">#${t}</span>`).join('')}</div>` : ''}
           </div>
         </details>

         <details class="cr-sec" open>
           <summary>📊 주요 지표 <span class="muted">현재가 기준</span></summary>
           <div class="cr-body cr-fin">${finRows}</div>
         </details>

         <details class="cr-sec" open>
           <summary>📰 실시간 뉴스 <span class="muted">${news.length}건</span></summary>
           <div class="cr-body">
             ${news.length
               ? `<ul class="clean-list cr-news">${news.map(n =>
                   `<li class="${n.cls}"><span class="cr-when">${n.day}일차</span> ${n.text}</li>`).join('')}</ul>`
               : '<div class="muted">아직 이 종목에 대한 뉴스가 없습니다.</div>'}
           </div>
         </details>

          ${isFund ? '' : `
         <details class="cr-sec" open>
           <summary>💬 종목토론방 <span class="cr-senti ${senti.cls}">${senti.emoji} ${senti.label}</span></summary>
           <div class="cr-body">
             <div class="cr-senti-desc">${senti.desc}</div>
             <ul class="clean-list cr-talk">
               ${talk.map(t =>
                 `<li class="talk-${t.mood}">
                    <div class="tk-head"><b>${t.nick}</b> <span class="muted">${t.min}분 전</span> <span class="tk-like">👍 ${t.like}</span></div>
                    <div class="tk-text">${t.text}</div>
                  </li>`).join('')}
             </ul>
             <div class="cr-warn">⚠️ 종목토론방 글은 근거 없는 추측일 수 있습니다. 투자 판단은 본인 책임입니다.</div>
           </div>
         </details>`}

         <div class="close-actions">
           <button id="cr-goto" class="session-btn opening">📈 이 종목 거래하기</button>
           <button id="cr-news">📰 전체 뉴스</button>
           <button id="cr-close">닫기</button>
         </div>
       </div>
     </div>`;

  const go = $('cr-goto');
  if (go) go.addEventListener('click', () => { closeCompanyReport(); goBuy(name); });
  const nb = $('cr-news');
  if (nb) nb.addEventListener('click', () => { closeCompanyReport(); openNewsTab(); });
  [$('cr-x'), $('cr-close')].forEach(b => { if (b) b.addEventListener('click', closeCompanyReport); });
}

function closeCompanyReport() {
  const h = $('report-host'); if (h) { h.style.display = 'none'; h.innerHTML = ''; }
  S._reportName = null;
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
    const badge = stock.type === 'macro'
      ? `<span class="lev-badge macro">${stock.icon || '🌐'} 경제자산</span>`
      : stock.type === 'etf'
      ? `<span class="lev-badge ${stock.lev < 0 ? 'inv' : ''}">${levLabel(stock.lev)}</span>`
      : `<span class="cap-badge">${CAP_META[stock.cap].badge}</span>`;
    li.innerHTML =
      `<span class="star" data-name="${stock.name}">${star}</span>` +
      `<span class="tag" style="background:${sec.color}">${sec.name}</span>` +
      `<strong>${stock.name}</strong> ` +
      badge +
      `<span class="price ${ci.up ? 'up' : 'down'}">${won(ci.cur)}원</span> ` +
      `<span class="chg ${ci.up ? 'up' : 'down'}">${ci.up ? '▲' : '▼'} ${pct(ci.rate)}</span>` +
      `<button class="row-report" data-report="${stock.name}" title="${stock.name} 기업 리포트">📄</button>`;
    li.addEventListener('click', (e) => {
      if (e.target.classList.contains('star')) {
        toggleWatch(stock.name); return;
      }
      if (e.target.dataset.report) { showCompanyReport(e.target.dataset.report); return; }
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
      li.className = `owned-position ${pl >= 0 ? 'profit' : 'loss'}`;
      li.innerHTML = `<div class="owned-main"><strong>${name}</strong><span>${pos.qty}주</span></div>` +
        `<strong class="owned-rate ${pl >= 0 ? 'up' : 'down'}">${pl >= 0 ? '▲' : '▼'} ${pct(rate)}</strong>` +
        `<div class="owned-detail"><span>현재 ${won(price)}</span><span>평단 ${won(pos.avg)}</span>` +
        `<b class="${pl >= 0 ? 'up' : 'down'}">${pl >= 0 ? '+' : ''}${won(pl)}원</b></div>`;
    } else {
      const pl = (pos.avg - price) * Math.abs(pos.qty);
      const rate = pos.avg ? (pos.avg - price) / pos.avg : 0;
      li.className = `owned-position short ${pl >= 0 ? 'profit' : 'loss'}`;
      li.innerHTML = `<div class="owned-main"><span class="short-badge">공매도</span><strong>${name}</strong><span>${Math.abs(pos.qty)}주</span></div>` +
        `<strong class="owned-rate ${pl >= 0 ? 'up' : 'down'}">${pl >= 0 ? '▲' : '▼'} ${pct(rate)}</strong>` +
        `<div class="owned-detail"><span>현재 ${won(price)}</span><span>진입 ${won(pos.avg)}</span>` +
        `<b class="${pl >= 0 ? 'up' : 'down'}">${pl >= 0 ? '+' : ''}${won(pl)}원</b></div>`;
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
  const outlook = ECONOMY.outlook(S.economy);
  const strong = outlook.strong.slice(0, 2).map(id => (D.SECTORS[id] || {}).name || id).join('·');
  const weak = outlook.weak.slice(0, 2).map(id => (D.SECTORS[id] || {}).name || id).join('·');
  const macro = document.createElement('li');
  macro.className = outlook.monthlyMarket >= 0 ? 'good' : 'bad';
  macro.innerHTML = `<strong>${outlook.text}</strong><br><span class="muted">금리·물가와 경기 국면이 한 달 동안 누적 반영됩니다${strong ? ` · 강세 ${strong}` : ''}${weak ? ` · 약세 ${weak}` : ''}</span>`;
  el.appendChild(macro);
  const live = S.stocks.filter(s => s.listed);
  let issueCount = 0;
  live.forEach(stock => {
    if (!stock.pendingIssue || !stock.pendingIssue.impact) return;
    const iss = stock.pendingIssue;
    const meta = CAP_META[stock.cap] || CAP_META.mid;
    const effective = Math.abs(iss.impact * meta.issueMul);
    const strength = effective >= .07 ? '강함' : effective >= .035 ? '보통' : '약함';
    const li = document.createElement('li');
    li.className='issue-stock';li.title=`${stock.name} 차트로 이동`;li.dataset.stock=stock.name;
    const cls = iss.impact >= 0 ? 'good' : 'bad';
    li.innerHTML = `<strong>${stock.name}</strong> <span class="${cls}">${iss.text}</span> <span class="muted">· 예상 ${iss.impact >= 0 ? '호재' : '악재'} ${strength} · ${meta.label}주 월 한도 ±${Math.round(meta.sessionLimit*100)}%</span>`;
    el.appendChild(li);
    issueCount++;
  });
  el.querySelectorAll('.issue-stock').forEach(li=>li.addEventListener('click',()=>goBuy(li.dataset.stock)));
  if (!issueCount) {
    const empty = document.createElement('li');
    empty.className = 'muted';
    empty.textContent = '대기 중인 개별 공시 없음 · 이번 달은 경제 뉴스와 업종 흐름을 확인하세요';
    el.appendChild(empty);
  }
}

function addNews(text, cls) {
  S.news.unshift({ text, cls: cls || 'neutral', day: S.day, seq: ++S.newsSeq });
  if (S.news.length > CFG.NEWS_MAX) S.news.pop();
}
/* 뉴스 피드 — 일반 뉴스(시장·인생)와 종목 공시를 한 줄로 합쳐 최신순으로 보여준다.
 * 공시는 클릭하면 그 회사 기업 리포트가 열린다. */
function newsFeed(filter) {
  const general = S.news.map(n => ({
    kind: 'market', text: n.text, cls: n.cls, day: n.day, seq: n.seq || 0,
  }));
  const company = (S.companyNews || []).map(n => ({
    kind: 'stock', name: n.name, text: n.text, day: n.day, seq: n.seq || 0,
    impact: n.impact, cls: n.impact > 0 ? 'good' : n.impact < 0 ? 'bad' : 'neutral',
  }));
  let all = general.concat(company).sort((a, b) => b.seq - a.seq || b.day - a.day);

  if (filter === 'stock') all = all.filter(n => n.kind === 'stock');
  else if (filter === 'market') all = all.filter(n => n.kind === 'market');
  else if (filter === 'mine') {
    const own = Object.keys(S.owned);
    all = all.filter(n => n.kind === 'stock' ? own.includes(n.name) : own.some(o => n.text.indexOf(o) >= 0));
  } else if (filter === 'watch') {
    const watch = Object.keys(S.watchlist).filter(k => S.watchlist[k]);
    all = all.filter(n => n.kind === 'stock' ? watch.includes(n.name) : watch.some(w => n.text.indexOf(w) >= 0));
  }
  return all;
}

function renderNews() {
  // 티커
  const ticker = $('news-ticker');
  const latest = newsFeed('all').slice(0, 12)
    .map(n => n.kind === 'stock' ? `${n.name} — ${n.text}` : n.text).join('  ◆  ');
  ticker.textContent = latest || '장이 열렸습니다. 행운을 빕니다 📈';

  // 필터 버튼 상태
  document.querySelectorAll('.nf-btn').forEach(b => b.classList.toggle('active', b.dataset.nf === S.newsFilter));

  // 로그
  const el = $('news-log');
  const list = newsFeed(S.newsFilter).slice(0, 40);
  if (!list.length) {
    el.innerHTML = '<li class="muted">해당하는 뉴스가 없습니다.</li>';
    return;
  }
  el.innerHTML = list.map(n => {
    if (n.kind !== 'stock') {
      return `<li class="${n.cls}"><span class="muted">[${n.day}일]</span> ${n.text}</li>`;
    }
    const arrow = n.impact > 0 ? '▲' : n.impact < 0 ? '▼' : '·';
    const held = S.owned[n.name] ? '<span class="nf-held">보유</span>' : '';
    return `<li class="${n.cls} news-stock" data-stock="${n.name}" title="${n.name} 기업 리포트 열기">` +
      `<span class="muted">[${n.day}일]</span> <strong>${n.name}</strong>${held} ` +
      `<span class="${n.cls}">${arrow} ${pct(n.impact)}</span><br>${n.text}</li>`;
  }).join('');
  el.querySelectorAll('.news-stock').forEach(li =>
    li.addEventListener('click', () => showCompanyReport(li.dataset.stock)));
}

function setNewsFilter(f) {
  S.newsFilter = f;
  renderNews();
}

// 오른쪽 패널의 '뉴스' 탭을 열고 그쪽으로 스크롤
function openNewsTab() {
  const tab = document.querySelector('.tabs [role="tab"][data-tab="news"]');
  if (!tab) return;
  tab.click();
  renderNews();
  const pane = document.querySelector('.tab-pane[data-pane="news"]');
  if (pane && pane.scrollIntoView) pane.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function renderLeaderboard() {
  const el = $('leaderboard');
  el.innerHTML = '';
  const players = [
    { name: '🧑 나(You)', value: netWorthClean(), me: true },
    ...S.bots.map(b => ({ name: b.name, portrait:b.portrait, faction:b.faction, value: botNetWorth(b), profit: b.monthlyProfit || 0, jail: b.jailMonths || 0, crime: b.criminalRecord || 0, bot: b })),
  ].sort((a, b) => b.value - a.value);
  players.forEach((p, i) => {
    const li = document.createElement('li');
    const medal = ['🥇', '🥈', '🥉', '4️⃣'][i] || (i + 1);
    const plRate = (p.value - CFG.START_CAPITAL) / CFG.START_CAPITAL;
    li.className = p.me ? 'me' : 'bot-row';
    let tail = '';
    if (!p.me) {
      const flags = (p.jail > 0 ? ` <span class="down">⛓️수감 ${p.jail}개월</span>` : '') + (p.crime > 0 ? ` <span class="muted">🚨전과 ${p.crime}</span>` : '');
      tail = ` <span class="${p.profit >= 0 ? 'up' : 'down'}">전월 ${p.profit >= 0 ? '+' : ''}${won(p.profit)}</span>${flags} <span class="muted bot-toggle">▼ 보유</span>`;
    }
    const avatar=!p.me&&p.portrait?`<img class="leader-avatar" src="./assets/characters/${p.portrait}" alt="">`:'';
    li.innerHTML = `${medal} ${avatar}<strong>${p.name}</strong>${p.faction?` <span class="muted">${p.faction}</span>`:''} ${won(p.value)}원 ` +
      `<span class="${plRate >= 0 ? 'up' : 'down'}">(${pct(plRate)})</span>${tail}`;
    if (!p.me) {
      const detail = document.createElement('div');
      detail.className = 'bot-detail'; detail.style.display = 'none';
      detail.innerHTML = botHoldingsHTML(p.bot);
      li.addEventListener('click', () => {
        const openNow = detail.style.display !== 'none';
        detail.style.display = openNow ? 'none' : 'block';
        const tog = li.querySelector('.bot-toggle'); if (tog) tog.textContent = openNow ? '▼ 보유' : '▲ 접기';
      });
      li.appendChild(detail);
    }
    el.appendChild(li);
  });
  // 내 순위 저장
  S._rank = players.findIndex(p => p.me) + 1;
  renderRivalFeed();
  renderBotNwChart();
}

// 봇이 지금 무엇을 들고 있는지 — 현금 + 보유 종목(평가액 순)
function botHoldingsHTML(bot) {
  if (!bot) return '';
  const holds = Object.keys(bot.owned || {}).map(name => {
    const s = S.stocks.find(x => x.name === name);
    const price = s ? s.history[s.history.length - 1].c : 0;
    return { name, qty: bot.owned[name], val: bot.owned[name] * price, listed: !!(s && s.listed) };
  }).filter(h => h.qty > 0).sort((a, b) => b.val - a.val);
  const cashLine = `💵 현금 ${won(bot.capital)}`;
  const assets=(bot.assets||[]).map(a=>`<div class="bd-row"><span>${a.icon||'🏢'}${a.name}</span><span>${won(a.value||0)}</span></div>`).join('');
  const relation=`<div class="muted">🗣️ 나와의 관계 ${(bot.playerRelation||0)>=30?'동맹':(bot.playerRelation||0)<=-25?'적대':'중립'} · 방어 ${Math.round((bot.defense||0)*100)}%</div>`;
  if (!holds.length) return `<div class="bd-inner">${cashLine}${relation}${assets?`<div class="bd-title">🏙️ 보유 건물·사업</div>${assets}`:'<div class="muted">보유 종목·사업자산 없음</div>'}</div>`;
  const rows = holds.slice(0, 10).map(h =>
    `<div class="bd-row"><span>${h.listed ? '' : '🚫'}${h.name}</span><span>${h.qty.toLocaleString('ko-KR')}주 · ${won(h.val)}</span></div>`).join('');
  return `<div class="bd-inner">${cashLine}${relation}<div class="bd-title">📦 보유 종목 ${holds.length}개</div>${rows}${assets?`<div class="bd-title">🏙️ 보유 건물·사업</div>${assets}`:''}</div>`;
}

// 라이벌 동향 창 — AI들이 서로 뭘 하는지(공격·손익·수감) 로그로 보여준다
function renderRivalFeed() {
  const el = $('rival-feed');
  if (!el) return;
  const feed = S.rivalFeed || [];
  if (!feed.length) { el.innerHTML = '<li class="muted" style="cursor:default">아직 라이벌 동향이 없습니다. 장을 마감하면 갱신됩니다.</li>'; return; }
  el.innerHTML = feed.slice(0, 30).map(f => {
    const cls = /타격|손실|적발|수감|사고/.test(f.text) ? 'bad' : (/대박|횡재|막아냈|\+/.test(f.text) ? 'good' : 'neutral');
    return `<li class="${cls}" style="cursor:default"><span class="muted">[${dateInfo(f.day).label}]</span> ${f.text}</li>`;
  }).join('');
}

/* ------------------------------------------------------------------ 차트 */
let priceChart, pieChart, nwChart, rivalsNwChart;

// 종목의 현재가·최고가·최저가·내 평단가·수익률
function priceStats(stock) {
  const h = stock.history;
  const cur = h[h.length - 1].c;
  const hi = Math.max(...h.map(x => x.h));
  const lo = Math.min(...h.map(x => x.l));
  const pos = S.owned[stock.name];
  const avg = pos && pos.qty !== 0 ? pos.avg : null;
  const qty = pos ? pos.qty : 0;
  const plRate = avg != null ? (qty > 0 ? (cur - avg) / avg : (avg - cur) / avg) : null;
  return { cur, hi, lo, avg, qty, plRate };
}

function renderChart() {
  const stock = curStock();
  if (!stock) return;
  const ctx = $('price-chart').getContext('2d');
  const h = stock.history;
  const labels = h.map((_, i) => i);
  const sec = D.SECTORS[stock.sector];
  const st = priceStats(stock);
  const flat = v => labels.map(() => v);
  renderQuoteStrip(stock, st);

  if (S.chartMode === 'line') {
    // 실제 차트처럼 — 종가 + 최고가/최저가 + 내 평단가 기준선
    const datasets = [{ label: stock.name, data: h.map(x => x.c), borderColor: sec.color, backgroundColor: sec.color + '22', fill: true, tension: 0.25, pointRadius: 0, borderWidth: 2 }];
    datasets.push({ label: `최고가 ${won(st.hi)}`, data: flat(st.hi), borderColor: 'rgba(214,31,31,0.55)', borderDash: [3, 3], pointRadius: 0, borderWidth: 1, fill: false });
    datasets.push({ label: `최저가 ${won(st.lo)}`, data: flat(st.lo), borderColor: 'rgba(31,79,214,0.55)', borderDash: [3, 3], pointRadius: 0, borderWidth: 1, fill: false });
    if (st.avg != null) datasets.push({ label: `내 평단가 ${won(st.avg)}`, data: flat(st.avg), borderColor: '#f59e0b', borderDash: [7, 3], pointRadius: 0, borderWidth: 2, fill: false });
    if (!priceChart || priceChart.config.type !== 'line') {
      if (priceChart) priceChart.destroy();
      priceChart = new Chart(ctx, { type: 'line', data: { labels, datasets }, options: chartOpts(stock.name) });
    } else {
      priceChart.data.labels = labels;
      priceChart.data.datasets = datasets;
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

// 차트 위 실시간 시세 스트립 — 현재가·최고·최저·평단·수익률
function renderQuoteStrip(stock, st) {
  const el = $('quote-strip'); if (!el || !stock) return;
  st = st || priceStats(stock);
  const prev = stock.history.length > 1 ? stock.history[stock.history.length - 2].c : st.cur;
  const diff = st.cur - prev, rate = prev ? diff / prev : 0;
  let posInfo = '';
  if (st.avg != null) {
    const cls = st.plRate >= 0 ? 'up' : 'down';
    posInfo = ` · 평단 <b>${won(st.avg)}</b> · 수익률 <b class="${cls}">${pct(st.plRate)}</b> · ${Math.abs(st.qty)}주${st.qty < 0 ? '(숏)' : ''}`;
  }
  el.innerHTML = `현재가 <b class="${diff >= 0 ? 'up' : 'down'}">${won(st.cur)}</b> <span class="${diff >= 0 ? 'up' : 'down'}">${diff >= 0 ? '▲' : '▼'}${pct(rate)}</span> · 최고 <b class="up">${won(st.hi)}</b> · 최저 <b class="down">${won(st.lo)}</b>${posInfo}`;
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

// 나 vs 라이벌 순자산 경쟁 — 여러 선을 겹쳐 누가 앞서는지 한눈에
function renderBotNwChart() {
  const cvs = $('rivals-nw-chart'); if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const palette = ['#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];
  const lines = [];
  const myHist = S._myNwHist || [];
  if (myHist.length) lines.push({ label: '🧑 나', data: myHist, borderColor: '#111', borderWidth: 2.5, pointRadius: 0, tension: 0.25, fill: false });
  S.bots.forEach((b, i) => {
    if (b.nwHist && b.nwHist.length) lines.push({ label: b.name, data: b.nwHist, borderColor: palette[i % palette.length], borderWidth: 1.5, pointRadius: 0, tension: 0.25, fill: false });
  });
  const maxLen = lines.reduce((m, l) => Math.max(m, l.data.length), 0);
  const labels = Array.from({ length: maxLen }, (_, i) => i);
  // 길이 맞추기 (앞을 null 로 패딩)
  lines.forEach(l => { while (l.data.length < maxLen) l.data.unshift(null); });
  const opts = { responsive: true, maintainAspectRatio: false, animation: false,
    plugins: { legend: { display: true, labels: { font: { size: 9 }, boxWidth: 10 } } },
    scales: { y: { ticks: { callback: v => won(v), font: { size: 9 } } }, x: { display: false } } };
  if (!rivalsNwChart) {
    rivalsNwChart = new Chart(ctx, { type: 'line', data: { labels, datasets: lines }, options: opts });
  } else {
    rivalsNwChart.data.labels = labels;
    rivalsNwChart.data.datasets = lines;
    rivalsNwChart.update('none');
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
      let pl, rate, side, qtyLabel;
      if (pos.qty > 0) {
        pl = (price - pos.avg) * pos.qty; rate = pos.avg ? (price - pos.avg) / pos.avg : 0;
        side = '보유'; qtyLabel = `${pos.qty}주`;
      } else {
        pl = (pos.avg - price) * Math.abs(pos.qty); rate = pos.avg ? (pos.avg - price) / pos.avg : 0;
        side = '공매도'; qtyLabel = `${Math.abs(pos.qty)}주`;
      }
      const cls=pl>=0?'up':'down';
      pnlEl.className=`pos-pnl position-summary ${pl>=0?'position-profit':'position-loss'}`;
      pnlEl.innerHTML =
        `<div class="position-name"><span>${side}</span><strong>${stock.name}</strong><small>${qtyLabel}</small></div>` +
        `<div class="position-return ${cls}"><small>매입 대비</small><strong>${pl>=0?'▲':'▼'} ${pct(rate)}</strong></div>` +
        `<div class="position-numbers"><span>현재 <b>${won(price)}</b></span><span>${pos.qty>0?'평단':'진입'} <b>${won(pos.avg)}</b></span>` +
        `<span>평가손익 <b class="${cls}">${pl>=0?'+':''}${won(pl)}원</b></span></div>`;
    } else {
      pnlEl.className='pos-pnl position-summary is-empty';
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

// 지금 화면에 맞는 트랙을 고른다 (데이트 > 속보 > 마감 > 장중 분위기)
function bgmScene() {
  const dateOpen = $('date-host') && $('date-host').style.display === 'block';
  if (dateOpen) return 'dreamy';
  if (S.breaking) return 'news';
  if (S.phase !== 'open') return 'news';

  const trend = S.bgmMarketTrend || 0;
  if (trend >= 0.007) return 'market_bull';
  if (trend <= -0.007) return 'market_bear';
  return 'market_normal';
}
function syncBGM(force) {
  if (!BGM || !S.bgmOn) return;
  if (!force && Date.now() < bgmStingUntil) return;
  BGM.play(bgmScene());
}
let bgmStingToken = 0;
let bgmStingUntil = 0;
function playBGMSting(track, duration) {
  if (!BGM || !S.bgmOn) return;
  const token = ++bgmStingToken;
  bgmStingUntil = Date.now() + (duration || 4200);
  if (!BGM.play(track, true)) return;
  setTimeout(() => {
    if (token === bgmStingToken && BGM.current() === track) {
      bgmStingUntil = 0;
      syncBGM(true);
    }
  }, duration || 4200);
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

// 시스템 안내용 음성(매수/매도 체결 등) — 중립적인 톤
function speak(text) {
  if (!S.ttsOn) return;
  if (VOICE) { VOICE.speak(text, { pitch: 1, rate: 1.08, interrupt: false }); return; }
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  window.speechSynthesis.speak(u);
}

// 인물이 말하듯 대사를 읽는다 (성별·성격별 목소리)
function speakPerson(person, text) {
  if (!S.ttsOn || !VOICE || !person || !text) return;
  VOICE.speakAs(person, text);
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
const LS_SERA_LOOP = 'quicktrade_sera_residual_loop';

function readSeraLoop() {
  try { return JSON.parse(localStorage.getItem(LS_SERA_LOOP)) || {}; }
  catch (e) { return {}; }
}
function seraLoopActive() {
  return !!((S.life && S.life.seraLoop && S.life.seraLoop.active) || readSeraLoop().active);
}
function applySeraLoopResidue() {
  const loop = readSeraLoop();
  if (!loop.active || !S.life) return false;
  S.life.seraLoop = Object.assign({}, loop, S.life.seraLoop || {}, { active:true });
  return true;
}

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
      awaitingNextDay: S.awaitingNextDay, pendingOrders: S.pendingOrders, limitOrders: S.limitOrders,
      companyNews: (S.companyNews || []).slice(0, 60), life: S.life, economy: S.economy,
      stocks: S.stocks.map(s => ({ name: s.name, history: s.history.slice(-20), listed: s.listed, trend: s.trend })),
      netWorthHist: S.netWorthHist.slice(-60),
      bots: S.bots.map(b => ({ name: b.name, leader:b.leader, faction:b.faction, portrait:b.portrait, capital: b.capital, owned: b.owned, assets:b.assets||[], relations:b.relations||{}, playerRelation:b.playerRelation||0, defense:b.defense||0, jailMonths: b.jailMonths, criminalRecord: b.criminalRecord, monthlyProfit: b.monthlyProfit })),
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
    S.limitOrders = Array.isArray(d.limitOrders) ? d.limitOrders : [];
    S.companyNews = Array.isArray(d.companyNews) ? d.companyNews : [];
    S.life = Object.assign(newLife(), d.life || {});
    S.economy = ECONOMY.ensure(d.economy);
    LOAN.ensure(S.life); HEALTH.ensure(S.life); FAMILY.ensure(S.life);
    CAREER.ensure(S.life); HOUSING.ensure(S.life); LIFE_FINANCE.ensure(S.life);
    CHILD_EVENTS.ensure(S.life); SOCIAL.ensure(S.life); JUSTICE.ensure(S.life); LEGACY.ensure(S.life);
    if (APTITUDE) APTITUDE.ensure(S.life);
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
      if (bot) {
        const persona={name:bot.name,leader:bot.leader,faction:bot.faction,portrait:bot.portrait,style:bot.style,income:bot.income,skill:bot.skill,aggression:bot.aggression};
        Object.assign(bot, bv, { owned: migrateOwnedNames(bv.owned) }, persona);
      }
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
  const loopWarning=seraLoopActive()?'\n\n윤세라 잔류 루프도 함께 삭제되어 진짜 처음부터 시작합니다.':'';
  if (!confirm(`정말 초기화할까요? 저장된 진행 상황이 삭제됩니다. (업적은 유지)${loopWarning}`)) return;
  localStorage.removeItem(LS_KEY);
  localStorage.removeItem(LS_SERA_LOOP);
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
  S._autoPaused = false;   // 수동 조작이 자동 일시정지보다 우선
  $('pause-btn').textContent = S.paused ? '▶ 재개' : '⏸ 일시정지';
  renderSessionProgress();
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
  // 수량 빠른 버튼 (1/10/100/1000/+10/+100/×2)
  const qq = $('qty-quick');
  if (qq) qq.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    const el = $('qty-buy'); let v = parseInt(el.value) || 0;
    if (b.dataset.q != null) v = +b.dataset.q;
    else if (b.dataset.add != null) v += +b.dataset.add;
    else if (b.dataset.x != null) v = Math.max(1, v * +b.dataset.x);
    el.value = Math.max(1, v); $('amt-buy').value = ''; $('qty-sell').value = Math.max(1, v); updateCost();
  }));
  // 지정가 주문 · 상한가/하한가
  if ($('limit-buy')) $('limit-buy').addEventListener('click', () => placeLimit('buy'));
  if ($('limit-sell')) $('limit-sell').addEventListener('click', () => placeLimit('sell'));
  if ($('limit-lower')) $('limit-lower').addEventListener('click', () => { const s = curStock(); if (s) $('limit-price').value = Math.max(1, Math.round(priceOf(s.name) * (1 - CFG.DAILY_LIMIT))); });
  if ($('limit-upper')) $('limit-upper').addEventListener('click', () => { const s = curStock(); if (s) $('limit-price').value = Math.round(priceOf(s.name) * (1 + CFG.DAILY_LIMIT)); });

  $('pause-btn').addEventListener('click', togglePause);
  $('session-btn').addEventListener('click', () => { S.phase === 'open' ? closeMarket() : openMarket(); });
  $('report-btn').addEventListener('click', reopenReport);
  $('open-report').addEventListener('click', () => {
    const s = curStock();
    if (s) showCompanyReport(s.name);
  });
  document.querySelectorAll('.nf-btn').forEach(b =>
    b.addEventListener('click', () => setNewsFilter(b.dataset.nf)));
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
  $('tts-toggle').addEventListener('change', e => { S.ttsOn = e.target.checked; if (VOICE && !S.ttsOn) VOICE.cancel(); });
  if (VOICE) VOICE.setEnabledGetter(() => S.ttsOn);
  $('save-btn').addEventListener('click', () => { autoSave(); flashToast('💾 저장 완료', 'good'); });
  $('share-btn').addEventListener('click', shareURL);
  $('reset-btn').addEventListener('click', hardReset);
  const gb = $('guide-btn'); if (gb) gb.addEventListener('click', () => showGameGuide(false));

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
  applySeraLoopResidue();
  LOAN.ensure(S.life); HEALTH.ensure(S.life); FAMILY.ensure(S.life);
  if (APTITUDE) APTITUDE.ensure(S.life);
  if (seraLoopActive()) ensureSeraLoopPartner();
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
    if(!S.life.tutorialSeen)showTutorial();else startLifeSetup();
    flashToast('🎬 QuickTrade Life! 가정환경과 학창생활에서 인생을 시작하세요', 'neutral');
  } else if (loaded) {
    flashToast('💾 저장된 인생 불러옴 · 🔔 장 열림으로 이번 달 시작', 'good');
  } else {
    flashToast('🎮 🔔 장 열림 버튼으로 이번 달을 시작하세요', 'neutral');
  }
}

window.addEventListener('load', boot);
})();
