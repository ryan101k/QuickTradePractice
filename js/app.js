/* =========================================================================
 *  QuickTrade Pro — 애플리케이션 로직
 *  엔진(가격 시뮬레이션) + UI 렌더 + 트레이딩 + AI 라이벌 + 업적/저장
 * ========================================================================= */
(function () {
'use strict';

const D = window.QT_DATA;
const PORTFOLIO = window.QT_PORTFOLIO;
const TRADING = window.QT_TRADING;
const TIME = window.QT_TIME;
const CAMPAIGN = window.QT_CAMPAIGN;
const RELATIONSHIPS = window.QT_RELATIONSHIPS;
const CAMPAIGN_ENDINGS = window.QT_CAMPAIGN_ENDINGS;
const SAVE = window.QT_SAVE;
const LOAN = window.QT_LOAN;
const RIVALS = window.QT_RIVALS;
const FACTION_CAMPAIGN = window.QT_FACTION_CAMPAIGN;
const EXPERTS = window.QT_EXPERTS;
const ROMANCE = window.QT_ROMANCE;
const STORIES = window.QT_CHARACTER_STORIES;
const CHAR_TRAITS = window.QT_CHARACTER_TRAITS;
const CROSS_EVENTS = window.QT_CHARACTER_CROSS_EVENTS;
const ROMANCE_ROUTES = window.QT_ROMANCE_ROUTES;
const DANGEROUS_TRIO = window.QT_DANGEROUS_TRIO;
const FREEDOM_TRIO = window.QT_FREEDOM_TRIO;
const CHILDHOOD_CIRCLE = window.QT_CHILDHOOD_CIRCLE;
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
const BUSINESS = window.QT_BUSINESS;
const BUSINESS_ROMANCE = window.QT_BUSINESS_ROMANCE;
const HOUSING = window.QT_HOUSING;
const LIFE_FINANCE = window.QT_LIFE_FINANCE;
const WEALTH = window.QT_WEALTH;
const COMPANY = window.QT_COMPANY;
const PAGE_LIFECYCLE = window.QT_PAGE_LIFECYCLE;
const MARKET_WORKSPACE = window.QT_MARKET_WORKSPACE;
const INFO_MARKET_PANEL = window.QT_INFO_MARKET_PANEL;
const MONTH_CLOSE_FLOW = window.QT_MONTH_CLOSE_FLOW;
const MONTH_CLOSE_VIEWS = window.QT_MONTH_CLOSE_VIEWS || {};
const MARKET_BALANCE = window.QT_MARKET_BALANCE;
// 분리 View 파일이 캐시·로딩 순서 문제로 누락돼도 핵심 행동 단계는
// 절대 건너뛰지 않는다. 외부 View가 정상 등록됐으면 이 fallback은 쓰지 않는다.
if (!MONTH_CLOSE_VIEWS['life-action']) {
  MONTH_CLOSE_VIEWS['life-action'] = {
    render(host, props, api) {
      const remaining=api.actionsRemaining();
      host.innerHTML = `<div class="window close-window month-flow-window life-action-flow-window">
        <div class="title-bar life-action-flow-bar"><div class="title-bar-text">🎬 이번 달 인생 행동</div></div>
        <div class="life-action-wallet">${api.wallet()}</div>
        <div class="window-body month-flow-body">
          ${api.progress()}
          <div class="life-action-overview">${api.overview()}</div>
          ${api.lifeHubHTML()}
          <div class="close-actions">
            <button class="session-btn opening" data-month-close-next ${remaining>0?'disabled':''}>${remaining>0 ? `일정 ${remaining}회 더 선택해야 진행할 수 있습니다` : '4주 일정 완료 · 주요 사건 확인'}</button>
          </div>
        </div>
      </div>`;
      api.wireLifeHub(host);
      host.querySelector('[data-month-close-next]').addEventListener('click', api.next);
    },
  };
}
const NEWS_ANCHOR = window.QT_NEWS_ANCHOR;

/* ------------------------------------------------------------------ 설정 */
const CFG = {
  START_CAPITAL: 1000000,   // 시작 자본금
  TICK_MS: 4500,            // 기본 1배속 틱 간격(ms) — 템포를 낮춰 덜 정신없게
  DAILY_LIMIT: 0.30,        // ETF·특수자산 비상 한도(일반주는 시총별 월간 한도 사용)
  FEE_RATE: 0.00015,        // 매매 수수료 0.015%
  TAX_RATE: 0.0018,         // 매도 거래세 0.18%
  HISTORY_LEN: 60,          // 종목 히스토리 보관 길이
  TICKS_PER_DAY: 20,        // 한 달 장세를 구성하는 틱 수
  DELIST_PRICE: 100,        // 이 가격 미만 지속 시 상장폐지 위험
  NEWS_MAX: 40,             // 뉴스 로그 최대 보관
  MARGIN_MONTHLY_INTEREST: 0.004, // 신용융자 월 이자 0.4%
  MAINT_MARGIN: 0.25,       // 유지증거금율 (자기자본/롱평가액) 미만 시 반대매매
  SHORT_MAX_LEVERAGE: 2.0,  // 순자산 대비 최대 공매도 노출
  SHORT_MAINT_MARGIN: 0.30, // 숏 유지증거금율
  BREAKING_MIN: 0.07,       // 실제 반영 충격이 이 이상이면 긴급속보 대상
  NEWS_MIN: 0.025,          // 실제 반영 충격이 이 이상이면 뉴스·기업 리포트에 기록
  MARKET_CIRCUIT: -0.10,    // 시장 평균이 시초가 대비 -10%면 서킷브레이커
  CIRCUIT_TICKS: 2,         // 서킷브레이커 정지 틱
  BREAKING_MS: 11000,       // 긴급속보 자동 닫힘(ms)
  BREAKING_INSESSION_PROB: 0.03, // 장중 속보 등장 확률(아주 가끔). 나머지 뉴스는 마감 리포트에서 몰아 봄
  INTRA_HELP_PROB: 0.05,         // 장중 인맥·연인·지인이 도움을 주는 확률(틱당)
  RAID_PROB: 0.025,              // 장중 라이벌이 공격해오는 확률(틱당) — 세력 있으면 즉시 역공 가능
};

const CAP_META = {
  // sigma는 '틱당', sessionLimit은 한 달(20틱) 전체 한도다.
  large: { label: '대형', sigma: 0.0060, issueMul: 0.16, tickLimit: 0.018, sessionLimit: 0.08, issueChance: 0.05, badge: '🏛️' },
  mid:   { label: '중형', sigma: 0.0100, issueMul: 0.27, tickLimit: 0.032, sessionLimit: 0.13, issueChance: 0.08, badge: '🏢' },
  small: { label: '소형', sigma: 0.0160, issueMul: 0.42, tickLimit: 0.055, sessionLimit: 0.20, issueChance: 0.12, badge: '🎲' },
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
  dayStartCapital: CFG.START_CAPITAL,
  dayStartRealizedPnL: 0,
  monthCloseContext: null,      // 장 마감 계산 결과와 View 큐 진행 상태
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
    firstCareerPool: [],     // 가정·학창생활로 만들어진 첫 정규직 후보
    prologue: {              // 실패한 학창 관계 뒤 은둔·단기 알바로 버티는 도입부
      stage: 'origin',       // origin | shut_in | support | career
      careerUnlocked: false,
      firstCareerStarted: false,
      candidateJobs: [],
    },
    job: 'none',             // 직업 id
    happy: 50,               // 행복도 0~100
    charm: 0,                // 매력(연애 진행도)
    relationship: 'single',  // 구버전 호환용 파생 상태
    partner: null,           // 구버전 스토리 호환용 대표 캐시(우선권 없음)
    relationshipGroup: null, // 실제 관계 상태: 동등한 구성원·합의·공동생활·공개도
    lovers: [],              // 양다리 상대 목록 (문어발) — 적발 위험
    polycule: { active:false, members:[], trust:0 }, // 모두가 합의한 다자연애/하렘 루트
    dangerousTrio: { active:false, stage:0, stability:50, axes:{balance:0,containment:0,fracture:0}, history:[], ending:null },
    freedomTrio: { active:false, stage:0, harmony:50, axes:{freedom:0,career:0,control:0}, history:[], personal:{}, ending:null, aftermathIndex:0 },
    childhoodCircle: { anchor:null, schoolId:null, stage:'dormant', pressure:0, trust:0, seen:{}, route:null, pending:null },
    childhoodNightContract: null, // 소꿉친구와 하룻밤 뒤 다른 상대를 택했는지 추적
    seraHousing: null,        // cohabit | separate | reject — 위험한 3인조 편입 조건
    outsideFearResolved: false, // 윤세라 작업실 사건 전까지 자발적인 외출을 피한다
    met: [],                 // 한 번이라도 만난 사람 (헤어져도 기억한다) — rememberPerson() 참고
    properties: [],          // [{id, name, emoji, value, rent}]
    passiveAssets: [],       // 주식 외 월 현금흐름 자산 [{id, boughtAt}]
    luxuryGoods: [],         // 생활공간에 전시되는 사치·취향 자산 id
    investmentMentor: {skill:0,sessions:0,unlocks:[]}, // 나래 투자 컨설팅 숙련
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
    business: null,            // 독립 사업체·직원·월간 보고
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
    monthActions: {},         // 월별 행동 횟수 { "day:action": count } (구버전 true는 1회로 읽음)
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
    trend: rand(-0.0025, 0.0025), // 체감 가능한 개별 추세(월간 누적)
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
  const limits = MARKET_BALANCE
    ? MARKET_BALANCE.limits(meta)
    : { tickUp:meta.tickLimit, tickDown:meta.tickLimit, sessionUp:meta.sessionLimit, sessionDown:meta.sessionLimit };
  const tickRate = clamp(rawRate, -limits.tickDown, limits.tickUp);
  let projected = prev * (1 + tickRate);
  const low = open * (1 - limits.sessionDown);
  const high = open * (1 + limits.sessionUp);
  projected = clamp(projected, low, high);
  const rate = projected / prev - 1;
  return {
    rate,
    vi: rawRate > limits.tickUp + 0.00001 || rawRate < -limits.tickDown - 0.00001,
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
  const playerPositionGross=Object.entries(S.owned||{}).reduce((sum,[name,pos])=>{
    const held=S.stocks.find(item=>item.name===name);
    return sum+(held&&pos&&pos.qty?Math.abs(pos.qty)*priceOf(name):0);
  },0);
  S.stocks.forEach(stock => {
    if (!stock.listed || stock.type === 'etf' || stock.type === 'macro') return;   // 지수·경제자산은 아래에서 별도 처리
    const meta = CAP_META[stock.cap];

    // 개별 종목은 월 시초가 대비 -10%에 닿으면 남은 장 동안 거래를 정지한다.
    // 손실 하한은 명확히 막되, 상승은 종목 크기에 맞춰 더 크게 열어 둔다.
    if (stock.downsideCircuitDay === S.day) {
      pushCandle(stock, 0);
      idxCount++;
      return;
    }

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
    const playerPosition=S.owned&&S.owned[stock.name];
    const positionValue=playerPosition&&playerPosition.qty?Math.abs(playerPosition.qty)*priceOf(stock.name):0;
    const holdingBias=MARKET_BALANCE&&MARKET_BALANCE.positionBias
      ? MARKET_BALANCE.positionBias(playerPosition,meta,playerPositionGross?positionValue/playerPositionGross:0)
      : 0;
    const rawRateBase = stock.trend + noise + issueImpact + marketImpact + economyTrend + factionFlow + holdingBias;
    const rawRate = MARKET_BALANCE ? MARKET_BALANCE.shapeRate(rawRateBase) : rawRateBase;
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
        const limits=MARKET_BALANCE ? MARKET_BALANCE.limits(meta) : {tickUp:meta.tickLimit,tickDown:meta.tickLimit};
        logCompanyNews(stock.name, `변동성 완화장치 발동 · ${meta.label}주 상승 ${pct(limits.tickUp)} / 하락 ${pct(-limits.tickDown)}`, 0);
      }
    }
    if (bounded.limitHit && stock.limitAnnouncedDay !== S.day) {
      stock.limitAnnouncedDay = S.day;
      const limits=MARKET_BALANCE ? MARKET_BALANCE.limits(meta) : {sessionUp:meta.sessionLimit,sessionDown:meta.sessionLimit};
      logCompanyNews(stock.name, `${meta.label}주 월간 가격제한폭 도달 · 상승 ${pct(limits.sessionUp)} / 하락 ${pct(-limits.sessionDown)}`, changeRate);
    }

    // 5) 추세는 서서히 평균회귀 + 가끔 방향 전환
    stock.trend = clamp(stock.trend * 0.97 + rand(-0.00065, 0.00065), -0.0045, 0.0045);

    pushCandle(stock, changeRate);
    const currentPrice=stock.history[stock.history.length-1].c;
    const sessionReturn=currentPrice/(stock.sessionOpen||currentPrice)-1;
    if(sessionReturn<=-0.0995&&stock.downsideCircuitDay!==S.day){
      stock.downsideCircuitDay=S.day;
      logCompanyNews(stock.name,'종목 서킷브레이커 발동 · 월 시초가 대비 -10% · 이번 달 남은 거래 정지',-0.10);
      if((S.viNewsCount||0)<3){
        S.viNewsCount=(S.viNewsCount||0)+1;
        addNews(`⛔ ${stock.name} -10% 종목 서킷브레이커 · 이번 달 거래 정지`,'bad');
      }
    }
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
  (social.contacts || []).forEach(c => {
    const role=SOCIAL.role(c);
    if((c.trust||0)>=25&&['banker','lawyer','official'].includes(role.id))helpers.push({t:'contact',p:c,role});
  });
  if(FREEDOM_TRIO&&FREEDOM_TRIO.marketRumorAvailable(L)){
    FREEDOM_TRIO.NAMES.forEach(name=>{
      const person=metRecord(L,name);
      if(person&&!['ex','deceased'].includes(person.status))helpers.push({t:'freedom-rumor',p:person});
    });
  }
  RELATIONSHIPS.consensualMembers(L)
    .filter(person=>!FREEDOM_TRIO||!FREEDOM_TRIO.NAMES.includes(person.name))
    .forEach(person=>helpers.push({t:'partner',p:person}));
  if (!helpers.length) return;
  runIntraHelp(pick(helpers));
}

function runIntraHelp(h) {
  const L = S.life, p = h.p, name = p.name;
  if (h.t === 'contact' && h.role && !p.emoji) p.emoji = h.role.icon;   // 인맥은 역할 아이콘을 아바타로
  if (h.t === 'contact') {
    const role = h.role || {};
    if (role.id === 'banker') { L.creditScore = clamp((L.creditScore || 600) + 5, 300, 950); showHelpCard(p, `🏦 <b>${name}</b> <span class="muted">· 은행원</span><br>"신용 관리 팁 드릴게요. 무리한 빚투는 조심하세요. <span class="up">(신용 +5)</span>"`); return; }
    if (role.id === 'lawyer' || role.id === 'official') { L.legalShield = (L.legalShield || 0) + 1; showHelpCard(p, `⚖️ <b>${name}</b> <span class="muted">· ${role.name}</span><br>"혹시 모를 법적 위험, 제가 챙겨뒀어요. <span class="up">(법적 방패 +1)</span>"`); return; }
    showHelpCard(p, `${role.icon || '🤝'} <b>${name}</b><br>"요즘 시장 분위기, 한번 참고해 보세요."`);
    return;
  }
  if(h.t==='freedom-rumor'){
    const good=Math.random()<.62,s=tipStock(good)||pick(S.stocks.filter(stock=>stock.listed&&stock.type!=='etf'));
    if(!s)return;
    const accurate=!!s.pendingIssue&&s.pendingIssue.impact!=null;
    const direction=accurate?(s.pendingIssue.impact>=0?'매수세가 붙을':'매물이 늘어날'):(good?'관심이 몰릴':'분위기가 식을');
    const lines={
      '채원':`공항 라운지에서 ${s.name} 쪽 사람들 얘기가 계속 들렸어요. 곧 ${direction} 것 같아요. 주문은 직접 판단해요.`,
      '유나':`${s.name} 캠페인 반응이 업계에서 먼저 바뀌고 있어요. 차트에는 늦게 보일 수 있으니 ${direction} 가능성만 기억해요.`,
      '소희':`공연 후원 일정표에서 ${s.name} 이름이 평소보다 자주 보였어요. 시장에서 ${direction} 조짐인지 확인해 봐요.`,
    };
    showHelpCard(p,`📡 <b>${name}</b> <span class="muted">· 자유인 3인조의 생활 소문</span><br>"${lines[name]}"`,()=>goBuy(s.name),'📈 차트 확인');
    return;
  }
  if (h.t === 'partner') {
    L.happy = clamp((L.happy || 50) + 4, 0, 100);
    const lines = ['"무리하지 말고 당신 페이스대로 해요."', '"오늘 저녁은 내가 준비할게요. 힘내요!"', '"수익보다 당신 건강이 더 중요해요."', '"잘하고 있어요. 나는 당신을 믿어요."'];
    showHelpCard(p, `💕 <b>${name}</b><br>"${pick(lines)}" <span class="up">(행복 +4)</span>`);
    return;
  }
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
function closeHelpCard() {
  const h = $('help-host');
  if (h) { h.style.display = 'none'; h.innerHTML = ''; }
  S._helpActive = false;
  S._raidTarget = null;
  autoResumeFromPopup();
  autoSave();
}

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
  if(NEWS_ANCHOR)NEWS_ANCHOR.breaking({
    headline:item.headline,target:item.target,impact:item.impact,
  });
  speak(`긴급 뉴스입니다. ${item.headline}. ${item.target}에 ${item.impact>=.035?'상승':item.impact<=-.035?'하락':'중립'} 압력이 예상됩니다.`);
  S.breaking.timer = setTimeout(closeBreaking, CFG.BREAKING_MS);
}

function closeBreaking() {
  if (S.breaking && S.breaking.timer) clearTimeout(S.breaking.timer);
  S.breaking = null;
  renderBreaking();
  syncBGM(true);
  autoResumeFromPopup();
  if (S.phase === 'open' && (S._factionTradeCall || S._raidTarget != null)) restoreIntradayPopup();
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
  if (S.monthCloseContext && S.monthCloseContext.active) {
    renderCurrentMonthCloseStep();
    flashToast('📋 이번 달 마감 절차를 먼저 완료하세요', 'neutral');
    return;
  }
  if (!S.life || !S.life.started) {
    flashToast('🏠 먼저 가정환경과 학창생활을 정해 인생을 시작하세요', 'bad');
    startLifeSetup();
    return;
  }
  if (S.awaitingNextDay) S.day++;       // 마감 후 개장이면 다음 달로 넘어감
  S.awaitingNextDay = false;
  S.phase = 'open';
  S.paused = false;
  S._backgroundPaused = false;
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
  S.dayStartCapital = S.capital;
  S.dayStartRealizedPnL = S.realizedPnL || 0;
  closeReport();                        // 마감 리포트 닫기
  addNews(`📅 ${dateInfo(S.day).label} 개장`, 'neutral');
  const outlook = ECONOMY.outlook(S.economy);
  const sectorNames = ids => ids.map(id => (D.SECTORS[id] || {}).name || id).join('·');
  const strong = sectorNames(outlook.strong.slice(0, 2));
  const weak = sectorNames(outlook.weak.slice(0, 2));
  const outlookText = `${outlook.text}${strong ? ` · 강세 ${strong}` : ''}${weak ? ` · 약세 ${weak}` : ''}`;
  addNews(`📰 월간 경제전망 — ${outlookText}`, outlook.monthlyMarket >= 0 ? 'good' : 'bad');
  S.sessionNews.push({ headline:outlookText, target:'경제 국면', impact:outlook.monthlyMarket, market:true });
  if(NEWS_ANCHOR)NEWS_ANCHOR.monthly({
    date:dateInfo(S.day).label,text:outlook.text,strong,weak,impact:outlook.monthlyMarket,
  });
  speak(`달월 뉴스입니다. ${outlook.text}${strong?` 강세 업종은 ${strong}.`:''}${weak?` 약세 업종은 ${weak}.`:''}`);
  flashToast(`🔔 ${dateInfo(S.day).label} 장 개장! 행운을 빕니다`, 'good');
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
  const beforeClose = captureMonthCloseState();
  // 월말 정산: 신규 상장 / 배당(3개월마다) / 신용이자
  maybeNewListing();
  if (endedDay % 3 === 0) payDividends();
  let marginInterest = 0;
  if (S.loan > 0) {
    marginInterest = TIME.monthlyInterest(S.loan, CFG.MARGIN_MONTHLY_INTEREST);
    S.loan += marginInterest;
    if (marginInterest > 0) addNews(`🏦 신용이자 ${won(marginInterest)}원 발생 (빚 ${won(S.loan)})`, 'bad');
  }
  S._preSettleNW = netWorthClean();     // 정산 전(=순수 투자 성과) 순자산
  settleMonth();                        // 월급/월세/부동산/개인대출 정산
  recordMonthEndWorldNews();            // 팝업 대신 월말 정산 뉴스에 포함
  const afterClose = captureMonthCloseState();
  S.monthCloseContext = createMonthCloseContext(endedDay, beforeClose, afterClose, marginInterest);
  addNews(`🔔 ${dateInfo(endedDay).label} 장 마감`, 'neutral');
  playSound('sell');

  renderAll();
  renderMarketPhase();
  renderCurrentMonthCloseStep();
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
function rollWorldBreaking(){
  if(Math.random()>.42)return null;
  let item={...pick(WORLD_BREAKING)};
  if(Math.random()<.55){const stock=pick(S.stocks.filter(s=>s.listed&&s.type!=='etf'));if(stock){const good=Math.random()<.52;item={headline:`${stock.name}, ${good?'대규모 신규 계약·투자 계획 발표':'실적 전망 하향·경영진 긴급회의'}`,target:stock.name,impact:good?.14:-.14};}}
  return item;
}
function recordMonthEndWorldNews(){
  const item=rollWorldBreaking();if(!item)return;
  S.sessionNews.push(item);
  addNews(`🌐 월말 속보 · ${item.headline}`,item.impact>=0?'good':'bad');
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
        : `🔔 ${dateInfo(S.awaitingNextDay ? S.day + 1 : S.day).label} 개장`;
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

function captureMonthCloseState() {
  const L = S.life;
  const career = CAREER.ensure(L);
  return {
    capital: S.capital,
    netWorth: netWorthClean(),
    totalWealth: totalWealth(),
    realizedPnL: S.realizedPnL || 0,
    happy: L.happy || 0,
    stress: L.stress || 0,
    health: L.health || 0,
    fitness: L.fitness || 0,
    creditScore: L.creditScore || 0,
    morality: L.morality == null ? 60 : L.morality,
    guilt: L.guilt || 0,
    familyBond: L.familyBond || 0,
    parentAge: L.parentAge || 0,
    parentHealth: L.parentHealth || 0,
    job: L.job,
    career: {
      months: career.months || 0,
      level: career.level || 0,
      skill: career.skill || 0,
      performance: career.performance || 0,
      reputation: career.reputation || 0,
    },
    conditions: (L.conditions || []).slice(),
    relationships: Object.fromEntries((L.met || []).map(person => [person.name, {
      name: person.name,
      status: person.status,
      affection: person.affection || 0,
      trust: person.trust || 0,
      obsession: person.obsession || 0,
      dangerLevel: person.dangerLevel || 0,
      portrait: person.portrait,
      mood: person.mood,
    }])),
    children: Object.fromEntries((L.children || []).map(child => [child.id, {
      name: child.name,
      ageMonths: child.ageMonths || 0,
      bond: child.bond || 0,
      happy: child.happy || 0,
      health: child.health || 0,
    }])),
  };
}

function scalarMonthChanges(before, after) {
  const definitions = [
    ['happy', '행복', '😊'],
    ['stress', '스트레스', '🫥'],
    ['health', '건강', '❤️'],
    ['fitness', '체력·운동 습관', '🏃'],
    ['creditScore', '신용점수', '💳'],
    ['morality', '도덕성', '⚖️'],
    ['guilt', '죄책감', '🕯️'],
    ['familyBond', '가족 유대', '👨‍👩‍👧'],
    ['parentHealth', '부모님 건강', '👵'],
  ];
  const changes = definitions.flatMap(([key, label, icon]) => {
    const from = Math.round(before[key] || 0), to = Math.round(after[key] || 0);
    return from === to ? [] : [{ key, label, icon, before:from, after:to, delta:to-from }];
  });
  const beforeConditions = new Set(before.conditions || []);
  const afterConditions = new Set(after.conditions || []);
  afterConditions.forEach(id => {
    if (!beforeConditions.has(id)) {
      const condition = HEALTH.CONDITIONS.find(item => item.id === id);
      changes.push({
        key:`condition:${id}`, label:'새 질환', icon:(condition && condition.icon) || '🏥',
        beforeText:'없음', afterText:(condition && condition.name) || id, delta:-1,
      });
    }
  });
  beforeConditions.forEach(id => {
    if (!afterConditions.has(id)) {
      const condition = HEALTH.CONDITIONS.find(item => item.id === id);
      changes.push({
        key:`recovery:${id}`, label:'질환 회복', icon:'💊',
        beforeText:(condition && condition.name) || id, afterText:'회복', delta:1,
      });
    }
  });
  Object.entries(after.children || {}).forEach(([id, child]) => {
    const previous = (before.children || {})[id];
    if (!previous) {
      changes.push({ key:`child:${id}`, label:`${child.name} 가족 합류`, icon:'👶', beforeText:'없음', afterText:'새 가족', delta:1 });
    } else if (child.ageMonths !== previous.ageMonths && child.ageMonths % 12 === 0) {
      changes.push({ key:`child-age:${id}`, label:`${child.name} 성장`, icon:'🎂', beforeText:`${previous.ageMonths}개월`, afterText:`${child.ageMonths}개월`, delta:1 });
    }
  });
  if (Math.floor(after.parentAge) !== Math.floor(before.parentAge)) {
    changes.push({ key:'parentAge', label:'부모님 나이', icon:'🕰️', before:Math.floor(before.parentAge), after:Math.floor(after.parentAge), delta:-1 });
  }
  return changes;
}

function relationshipMonthChanges(before, after) {
  const names = new Set([
    ...Object.keys(before.relationships || {}),
    ...Object.keys(after.relationships || {}),
  ]);
  const changes = [];
  names.forEach(name => {
    const oldRec = (before.relationships || {})[name];
    const newRec = (after.relationships || {})[name];
    if (!oldRec && newRec) {
      changes.push({
        name, portrait:characterPortrait(newRec), summary:'이번 달 새롭게 알게 된 인물',
        detail:`현재 관계 ${newRec.status || '지인'} · 호감 ${Math.round(newRec.affection)}`,
      });
      return;
    }
    if (!oldRec || !newRec) return;
    const affection = Math.round(newRec.affection - oldRec.affection);
    const trust = Math.round(newRec.trust - oldRec.trust);
    const danger = Math.round(
      (newRec.obsession || newRec.dangerLevel || 0) - (oldRec.obsession || oldRec.dangerLevel || 0)
    );
    const statusChanged = oldRec.status !== newRec.status;
    if (!statusChanged && Math.max(Math.abs(affection), Math.abs(trust), Math.abs(danger)) < 5) return;
    const parts = [];
    if (statusChanged) parts.push(`${oldRec.status || '지인'} → ${newRec.status || '지인'}`);
    if (affection) parts.push(`호감 ${affection > 0 ? '+' : ''}${affection}`);
    if (trust) parts.push(`신뢰 ${trust > 0 ? '+' : ''}${trust}`);
    if (danger) parts.push(`위험 ${danger > 0 ? '+' : ''}${danger}`);
    changes.push({
      name, portrait:characterPortrait(newRec),
      summary:statusChanged ? '관계 단계가 달라졌습니다' : (affection + trust >= 0 ? '관계가 가까워졌습니다' : '관계가 멀어졌습니다'),
      detail:parts.join(' · '),
    });
  });
  return changes;
}

function careerMonthChanges(before, after, settle) {
  const changes = [];
  if (settle.incident) changes.push({
    icon:settle.incident.emoji || '🚑', title:`${settle.incident.job} 근무 사고`,
    desc:settle.incident.text,
    detail:`총비용 ${won(settle.incident.cost)}원 · 현금 지출 ${won(settle.incident.cashPaid)}원 · 사고채무 +${won(settle.incident.debtAdded)}원`,
    tone:'bad',
  });
  if (settle.career && settle.career.promotion) changes.push({
    icon:'🎉', title:`${settle.career.promotion} 승진`,
    desc:'경력과 업무 능력을 인정받았습니다.',
    detail:`축하금 +${won(settle.career.bonus || 0)}원`, tone:'good',
  });
  if (before.job !== after.job) changes.push({
    icon:'📦', title:'직업 상태 변화',
    desc:`${(D.JOBS.find(job => job.id === before.job) || {}).name || before.job} → ${(D.JOBS.find(job => job.id === after.job) || {}).name || after.job}`,
    detail:'다음 인생 행동에서 이직·자기계발·자격증을 선택할 수 있습니다.', tone:'bad',
  });
  (settle.businessReports || []).filter(report => Math.abs(report.net || 0) >= 1000000).forEach(report => {
    const manager=BUSINESS_ROMANCE?BUSINESS_ROMANCE.identity(S.life,report.managerId):null;
    changes.push({
      icon:report.icon || '🏪', title:`${report.name} 월간 보고`,
      desc:`담당 ${manager?manager.displayName:report.manager} · 매출 ${won(report.sales)}원`,
      detail:`비용 ${won(report.cost)}원 · 순익 ${report.net >= 0 ? '+' : ''}${won(report.net)}원`,
      tone:report.net >= 0 ? 'good' : 'bad',
    });
  });
  return changes;
}

function familyMonthChanges(settle) {
  const family = settle.family || {};
  const changes = [];
  if (family.birth) {
    changes.push({
      icon:'👶', title:`${family.birth.name}이(가) 가족이 되었습니다`,
      desc:'출산·입양 절차가 끝나 새 가족과의 생활이 시작됩니다.',
      detail:`이번 달 공동생활·양육비 ${won(family.cost || 0)}원`, tone:'good',
    });
  }
  (family.news || []).forEach(text => {
    if (family.birth && text.includes(family.birth.name)) return;
    const health = text.includes('건강') || text.includes('돌봄');
    changes.push({
      icon:health ? '🏥' : text.includes('🎂') ? '🎂' : '🏠',
      title:health ? '부모님 돌봄 변화' : '가족의 이번 달 소식',
      desc:text.replace(/^[^\p{L}\p{N}]+/u, ''),
      detail:family.cost ? `공동생활·양육비 ${won(family.cost)}원` : '',
      tone:health ? 'bad' : 'good',
    });
  });
  return changes;
}

function majorMonthNews() {
  const seen = new Map();
  (S.sessionNews || []).forEach(item => {
    const current = seen.get(item.headline);
    if (!current || Math.abs(item.impact || 0) > Math.abs(current.impact || 0)) seen.set(item.headline, item);
  });
  return [...seen.values()].sort((a, b) => Math.abs(b.impact || 0) - Math.abs(a.impact || 0)).slice(0, 6);
}

function createMonthCloseContext(day, before, after, marginInterest) {
  const settle = S._settle || {};
  const finance = settle.finance || {};
  const salaryIncome = Math.max(0, settle.salary || 0);
  const propertyIncome = Math.max(0, settle.rent || 0);
  const passiveIncome = Math.max(0, settle.passive || 0);
  const businessIncome = settle.businessNet || 0;
  const sharedIncome = (settle.partner || 0) + (settle.factionBiz || 0) - (settle.factionUpkeep || 0);
  const tax = (finance.tax || 0) + (finance.propertyTax || 0);
  const insurance = finance.premiums || 0;
  const pension = finance.pensionContribution || 0;
  const livingCost = (settle.housingExpense || 0) + (settle.familyCost || 0)
    + Math.max(0, -((settle.relationshipBudget || {}).net || 0));
  const loanInterest = (marginInterest || 0) + (settle.lifeInterest || 0);
  const incidentCost = (settle.incident && settle.incident.cost) || 0;
  const totalIncome = salaryIncome + propertyIncome + passiveIncome
    + Math.max(0, businessIncome) + Math.max(0, sharedIncome)
    + (finance.pensionPayout || 0) + (finance.incomeBenefit || 0);
  const totalExpense = tax + insurance + pension + livingCost + loanInterest + incidentCost
    + Math.max(0, -businessIncome) + Math.max(0, -sharedIncome);
  const info = dateInfo(day);
  const report = {
    year:info.year, month:info.month, label:info.label,
    startNetWorth:S.dayStartNW,
    endNetWorth:after.netWorth,
    netWorthChange:after.netWorth - S.dayStartNW,
    tradingPnL:(S._preSettleNW == null ? after.netWorth : S._preSettleNW) - S.dayStartNW,
    realizedPnL:(S.realizedPnL || 0) - (S.dayStartRealizedPnL || 0),
    cashChange:after.capital - (S.dayStartCapital == null ? before.capital : S.dayStartCapital),
    salary:settle.salary || 0,
    tax, insurance, pension, livingCost, loanInterest,
    propertyIncome, passiveIncome, businessIncome, sharedIncome, incidentCost,
    totalIncome, totalExpense, majorNews:majorMonthNews(),
  };
  let terminal = null;
  if (settle.died) terminal = { type:'death', age:info.age };
  else if (settle.campaignBankrupt) terminal = { type:'bankruptcy', reason:settle.campaignBankruptcyReason };
  else if (settle.captivity) terminal = { type:'captivity', personName:settle.captivityPerson };
  return MONTH_CLOSE_FLOW.build({
    id:`month-close:${day}`,
    day,
    report,
    before,
    after,
    lifeChanges:scalarMonthChanges(before, after),
    relationshipChanges:relationshipMonthChanges(before, after),
    familyChanges:familyMonthChanges(settle),
    careerChanges:careerMonthChanges(before, after, settle),
    forcedEvents:(S._importantEvents || []).map(event => event.title || event.type || 'event'),
    terminal,
  });
}

function monthCloseProgress() {
  const ctx = S.monthCloseContext;
  if (!ctx || !ctx.steps) return '';
  const position = Math.min(ctx.currentIndex + 1, ctx.steps.length);
  return `<div class="month-flow-progress"><span style="width:${Math.round(position / ctx.steps.length * 100)}%"></span><b>${position}/${ctx.steps.length}</b></div>`;
}

function restoreRequiredLifeActionStep(ctx) {
  if (!ctx || !ctx.active || !Array.isArray(ctx.steps)) return false;
  const lifeIndex=ctx.steps.findIndex(step=>step&&step.name==='life-action');
  if(lifeIndex<0)return false;
  const actionCount=lifeActionCount(ctx.day);
  if(ctx.currentIndex>lifeIndex&&(!ctx.lifeActionConfirmed||actionCount<LIFE_ACTIONS_PER_MONTH)){
    ctx.currentIndex=lifeIndex;
    ctx.lifeActionConfirmed=false;
    ctx.completedSteps=(ctx.completedSteps||[]).filter(name=>name!=='life-action');
    S._monthCloseEventPhase=false;
    S._monthCloseRandomEvent=false;
    return true;
  }
  return false;
}

function renderCurrentMonthCloseStep() {
  const ctx = S.monthCloseContext;
  if (!ctx || !ctx.active) return;
  restoreRequiredLifeActionStep(ctx);
  const step = MONTH_CLOSE_FLOW.current(ctx);
  if (!step) return;
  const host = $('market-close');
  if (!host) return;
  if (step.name === 'important-events') {
    host.style.display = 'none';
    host.innerHTML = '';
    S._monthCloseEventPhase = true;
    if (ctx.currentRandomEvent) {
      S._monthCloseRandomEvent = true;
      showLifeEvent(ctx.currentRandomEvent);
    } else {
      showNextImportantEvent(!!ctx.currentImportantEvent);
    }
    return;
  }
  if (step.name === 'terminal') {
    host.style.display = 'none';
    host.innerHTML = '';
    const terminal = ctx.terminal;
    const resuming = !!ctx.terminalShown;
    ctx.terminalShown = true;
    S._monthCloseEventPhase = false;
    autoSave();
    if (terminal.type === 'death') showDeathScreen(terminal.age, resuming);
    else if (terminal.type === 'bankruptcy') showCampaignBankruptcyEnding(terminal.reason, resuming);
    else if (terminal.type === 'captivity') {
      const person = metRecord(S.life, terminal.personName);
      if (person && person.name === '윤세라') showCaptivityEnding(person);
      else if (person) showDangerousHeroineEnding(person);
    }
    return;
  }
  const view = MONTH_CLOSE_VIEWS[step.name];
  if (!view) { advanceMonthCloseFlow(); return; }
  host.style.display = 'block';
  view.render(host, step.props || {}, {
    next:advanceMonthCloseFlow,
    finish:finishMonthCloseFlow,
    progress:monthCloseProgress,
    lifeHubHTML,
    wireLifeHub,
    actionsRemaining:lifeActionRemaining,
    wallet:() => `<span class="life-action-money"><small>지금 쓸 수 있는 돈</small><b>💵 ${won(S.capital)}원</b></span><span class="life-action-worth"><small>금융·집·사업·연금−개인대출</small><b>💼 총 재산 ${won(totalWealth())}원</b></span>`,
    overview:() => {
      const L = S.life, job = jobOf();
      const condition=L.health<35?'치료 필요':L.stress>=70?'과로 위험':L.health>=70&&L.stress<45?'좋음':'보통';
      return `<span>남은 행동 <b>${lifeActionRemaining()}/${LIFE_ACTIONS_PER_MONTH}</b></span><span>${job.emoji} ${job.name}</span><span>컨디션 <b>${condition}</b></span>`;
    },
    nextMonthLabel:() => dateInfo(S.day + 1).label,
  });
}

function advanceMonthCloseFlow() {
  const ctx = S.monthCloseContext;
  if (!ctx || !ctx.active) return;
  if(restoreRequiredLifeActionStep(ctx)){
    autoSave();
    renderCurrentMonthCloseStep();
    return;
  }
  const step=MONTH_CLOSE_FLOW.current(ctx);
  if(step&&step.name==='life-action'){
    const remaining=lifeActionRemaining();
    if(remaining>0){
      flashToast(`📅 ${remaining}주 일정이 남았습니다. 행동을 모두 선택해야 다음 단계로 진행됩니다`,'neutral');
      renderCurrentMonthCloseStep();
      return;
    }
    ctx.lifeActionConfirmed=true;
  }
  MONTH_CLOSE_FLOW.advance(ctx);
  S._monthCloseEventPhase = false;
  autoSave();
  renderCurrentMonthCloseStep();
}

function finishMonthCloseFlow() {
  const ctx = S.monthCloseContext;
  if (ctx) {
    if (!ctx.completedSteps.includes('return-market')) ctx.completedSteps.push('return-market');
    ctx.active = false;
  }
  S.monthCloseContext = null;
  S._monthCloseEventPhase = false;
  closeReport();
  autoSave();
  openMarket();
}

function resolveMonthCloseTerminal() {
  const ctx = S.monthCloseContext;
  if (ctx) {
    if (!ctx.completedSteps.includes('terminal')) ctx.completedSteps.push('terminal');
    ctx.active = false;
  }
  S.monthCloseContext = null;
  S._monthCloseEventPhase = false;
  S._monthCloseRandomEvent = false;
}

/* 구버전 마감 리포트. 새 월말 큐를 복원할 수 없는 저장에만 폴백한다. */
function renderCloseReportLegacy(day) {
  const current = captureMonthCloseState();
  S.monthCloseContext = createMonthCloseContext(day, current, current, 0);
  renderCurrentMonthCloseStep();
}

function renderCloseReport(day) {
  if (S.monthCloseContext && S.monthCloseContext.active) {
    renderCurrentMonthCloseStep();
    return;
  }
  renderCloseReportLegacy(day);
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
  return TIME.monthInfo(dayNum, LIFE.START_AGE);
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
  if(c.personality==='caring'&&['nurse','teacher','civil'].includes(jobOf().id))return 6;
  if(c.personality==='free'&&['civil','accountant'].includes(jobOf().id))return-4;
  return 0;
}

// 총 재산 = 투자 순자산 + 실물·사업·주거 자산 + 연금 − 개인 대출
function wealthBreakdown() {
  const L = S.life;
  if (!L) return WEALTH.breakdown({liquid:netWorthClean()});
  LOAN.ensure(L);
  const finance=LIFE_FINANCE.ensure(L);
  const propVal = L.properties.reduce((s, p) => s + p.value, 0);
  const passiveVal = (L.passiveAssets || []).reduce((s, a) => {
    const item = D.PASSIVE_ASSETS.find(x => x.id === a.id);
    return s + (item ? Math.round(item.price * item.resaleRate) : 0);
  }, 0);
  const businessVal = BUSINESS ? BUSINESS.assetValue(L) : 0;
  // 세력 운영 투자는 회수할 수 없는 조직 인프라 비용이므로 개인 순자산에 포함하지 않는다.
  return WEALTH.breakdown({
    liquid:netWorthClean(),
    property:propVal,
    passive:passiveVal,
    business:businessVal,
    housing:HOUSING.assetValue(L),
    pension:finance.pensionBalance,
    personalDebt:L.loan,
  });
}
function totalWealth() {
  return wealthBreakdown().total;
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

function rollPartnerIncident(L, partner, per) {
  if (!partner || Math.random() >= (per.incident || 0)) return null;
  const incidents = {
    frugal:   { text: '공동 지출을 상의 없이 지나치게 줄여 크게 다퉜다.', cash: 300000, affection: -7, happy: -4 },
    ambitious:{ text: '중요한 기념일보다 일을 택해 관계가 뒷전이 됐다.', cash: 0, affection: -12, happy: -7 },
    homebody: { text: '연락 없이 늦게 들어온 일을 두고 불안과 오해가 커졌다.', cash: 0, affection: -9, happy: -5 },
    caring:   { text: '상대를 챙기느라 지친 마음을 숨기다 한꺼번에 터뜨렸다.', cash: 0, affection: -8, happy: -6 },
    cold:     { text: '힘든 날에도 무심한 태도를 보여 관계가 급격히 식었다.', cash: 0, affection: -13, happy: -8 },
    lavish:   { text: '상의 없이 큰돈을 써 카드 대금과 신뢰 문제가 생겼다.', cash: -Math.round(rand(1200000, 5000000)), affection: -12, happy: -5 },
    free:     { text: '밤새 연락이 끊기고 다른 사람과 있었다는 의심을 샀다.', cash: 0, affection: -15, happy: -9 }
  };
  const ev = incidents[partner.personality] || incidents.caring;
  S.capital += ev.cash;
  L.affection = Math.max(0, (L.affection || 0) + ev.affection);
  const record=metRecord(L,partner.name);if(record)record.affection=Math.max(0,(record.affection||0)+ev.affection);
  L.happy = clamp(L.happy + ev.happy, 0, 100);
  return ev;
}

// 월말 정산: 월급 + 월세 + 부동산 시세상승 − 대출이자 − 직업사고 + 연애상대 효과 − 행복감소
function settleMonth() {
  const L = S.life;
  S._importantEvents = [];
  S.economy = ECONOMY.ensure(S.economy);
  LOAN.ensure(L);
  RELATIONSHIPS.ensure(L);
  HOUSING.ensure(L);
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
    if (asset.id === 'deposit') base = Math.max(asset.monthlyIncome,Math.round(asset.price * Math.max(.018, ECONOMY.ensure(S.economy).baseRate / 100) / 12 * 2));
    const gross = Math.max(0, Math.round(base * (1 + rand(-(asset.variance || 0), asset.variance || 0))));
    b.passive += Math.max(0, gross - (asset.maintenance || 0));
  });
  if (b.passive > 0) S.capital += b.passive;

  // 2-2) 독립 사업체 정산 — 세력 장부와 분리하고, 담당 직원이 중요한 문제만 직접 보고한다.
  if (BUSINESS) {
    const businessMonth=BUSINESS.monthly(L,{phaseId:S.economy.id,day:S.day,random:Math.random});
    b.businessSales=businessMonth.sales;
    b.businessCost=businessMonth.cost;
    b.businessNet=businessMonth.net;
    b.businessReports=businessMonth.reports;
    if(b.businessNet>=0)S.capital+=b.businessNet;
    else{
      const loss=Math.abs(b.businessNet),paid=Math.min(Math.max(0,S.capital),loss);
      S.capital-=paid;
      b.businessDebt=Math.max(0,loss-paid);
      if(b.businessDebt)LOAN.addDebt(L,b.businessDebt,'사업체 운영손실');
    }
    businessMonth.reports.forEach(report=>{
      const manager=BUSINESS_ROMANCE?BUSINESS_ROMANCE.identity(L,report.managerId):null;
      addNews(`${report.icon} [사업] ${manager?manager.displayName:report.manager} 보고 · ${report.name} 매출 ${won(report.sales)} · 비용 ${won(report.cost)} · 순익 ${report.net>=0?'+':''}${won(report.net)}원`,report.net>=0?'good':'bad');
    });
    if(businessMonth.event)queueImportantEvent(Object.assign({type:'business',icon:'🏪'},businessMonth.event));
    if(BUSINESS_ROMANCE){
      const romanceEvent=BUSINESS_ROMANCE.monthly(L,{
        day:S.day,totalNet:businessMonth.net,businessState:BUSINESS.ensure(L),
        hasPartner:RELATIONSHIPS.consensualMembers(L).length>0,
        partnerNames:RELATIONSHIPS.names(L),met:ensureMet(L),
        rivalName:(S.bots||[]).filter(bot=>!bot.bankrupt&&bot.name!=='장태식').sort((a,b)=>(b.pressure||0)-(a.pressure||0))[0]?.name,
      });
      if(romanceEvent)queueImportantEvent(romanceEvent);
    }
  }

  // 2-3) 세력 조직원 정산 — 실제 구성원이 만든 수입과 급여·운영비를 함께 처리한다.
  if (L.faction && L.faction.level) {
    const factionMonth = RIVALS.settleFaction(L, S.capital);
    S.capital = factionMonth.cash;
    b.factionBiz = factionMonth.income;
    b.factionUpkeep = factionMonth.upkeep;
    factionMonth.events.forEach(text => addNews(`👥 [세력] ${text}`, text.includes('떠났') || text.includes('밀려') ? 'bad' : 'neutral'));
  }

  // 3) 금융사별 이자·신용등급·추심 단계 갱신
  const passiveResaleValue = (L.passiveAssets || []).reduce((sum, owned) => { const a=D.PASSIVE_ASSETS.find(x=>x.id===owned.id); return sum+(a?Math.round(a.price*a.resaleRate):0); },0);
  const businessResaleValue=BUSINESS?BUSINESS.assetValue(L):0;
  const assetValue = L.properties.reduce((sum, p) => sum + p.value, 0) + passiveResaleValue + businessResaleValue + Math.max(0, netWorthClean());
  const debtResult = LOAN.settleMonth(L, Math.max(0, b.salary + b.rent + b.passive + (b.businessNet||0) + (b.factionBiz||0) - (b.factionUpkeep||0)), assetValue, ECONOMY.loanMultiplier(S.economy));
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

  // 5) 동등한 관계 구성원의 공동생활 예산. 인원수만큼 돈이 복제되지 않도록 실제 생활비까지만 분담한다.
  const relationshipMembers=RELATIONSHIPS.consensualMembers(L);
  if (relationshipMembers.length) {
    const housingQuote=HOUSING.quote(HOUSING.home(L),L.housing.tenure);
    const budget=RELATIONSHIPS.monthlyHousehold(L,{
      incomeOf:partnerIncomeNow,
      personalityOf:person=>D.PERSONALITIES[person.personality]||{},
      housingCost:housingQuote.monthly,
      children:(L.children||[]).length,
    });
    b.partner=budget.net;b.relationshipBudget=budget;
    S.capital+=budget.net;
    L.happy=clamp(L.happy+budget.happiness,0,100);
    relationshipMembers.forEach(person=>{const record=metRecord(L,person.name);if(record)record.mood=budget.net<0?'sad':(record.affection||0)>=60?'happy':'neutral';});
    if(budget.net||budget.contribution||budget.lifestyleCost){
      addNews(`🏠 관계 공동예산 · ${RELATIONSHIPS.joinNames(relationshipMembers)} 분담 +${won(budget.contribution)}원 · 공동생활 지출 -${won(budget.lifestyleCost)}원 · 순액 ${budget.net>=0?'+':''}${won(budget.net)}원`,budget.net>=0?'good':'bad');
    }
    const trioStable=!!(L.dangerousTrioBond&&L.dangerousTrioBond.active);
    if(!trioStable){
      const incidentPartner=pick(relationshipMembers),incidentPer=D.PERSONALITIES[(incidentPartner||{}).personality]||{};
      const incident=rollPartnerIncident(L,incidentPartner,incidentPer);
      if(incident){
        b.partnerIncident=incident;
        RELATIONSHIPS.registerConflict(L,9,'월간 관계 갈등',incidentPartner.name,S.day);
        addNews(`⚡ ${incidentPartner.name}님과의 관계 갈등: ${incident.text}${incident.cash<0?` · ${won(-incident.cash)}원 지출`:''}`,'bad');
        flashToast(`⚡ ${incidentPartner.name}님과 관계 재협상 필요`,'bad');
        queueImportantEvent({type:'love',icon:'⚡',title:`${incidentPartner.name}님과 관계 재협상`,desc:incident.text,detail:'갑작스러운 이별 대신 그룹 긴장도와 당사자 신뢰가 반영됐습니다.',tone:'bad',personName:incidentPartner.name});
      }
    }
  }

  // 5-1) 비합의 관계 발각. 캐릭터를 확률로 퇴장시키지 않고 신뢰·평판·그룹 긴장도에 책임을 남긴다.
  if (relationshipMembers.length && L.lovers && L.lovers.length) {
    const catchChance = Math.min(0.55, 0.15 * L.lovers.length);
    if (Math.random() < catchChance) {
      const committed=RELATIONSHIPS.ensure(L).relationshipGroup.status==='committed';
      const partnerName=RELATIONSHIPS.joinNames(relationshipMembers);
      const kind=committed?'비합의 관계':'숨긴 관계';
      const loverNames = L.lovers.map(x => x.name).join(', ');
      L.lovers.forEach(x => { const r = metRecord(L, x.name); if (r) r.status = 'ex'; });
      L.lovers = [];
      const severity=committed?30:22,repLoss=committed?12:8;
      RELATIONSHIPS.registerConflict(L,severity,`${kind} 발각`,null,S.day);
      relationshipMembers.forEach(person=>{const record=metRecord(L,person.name);if(record)record.trust=clamp((record.trust||0)-10,0,100);});
      L.charm=Math.floor(L.charm*.72);L.happy=clamp(L.happy-(committed?25:18),0,100);
      SOCIAL.ensure(L).reputation=clamp(SOCIAL.ensure(L).reputation-repLoss,0,100);
      b.scandal={negotiation:true,committed,partnerName,loverNames};
      addNews(`😱 ${kind} 발각 · ${loverNames}와의 비합의 관계는 정리됐고 ${partnerName}님과 긴급 재협상이 시작됐습니다`,'bad');
      flashToast(`😱 ${kind} 발각 · 관계 긴장도 급등`,'bad');
      playSound('crash');
      queueImportantEvent({
        type:'love',icon:'😱',title:`${kind} 발각`,
        desc:`${partnerName}님은 즉시 이별하는 대신 모든 사실을 공개하고 관계 규칙을 다시 쓰라고 요구했습니다.`,
        detail:`그룹 긴장도 +${severity} · 평판 -${repLoss} · 구성원 신뢰 하락 · ${loverNames}와의 비합의 관계 정리`,tone:'bad'
      });
    }
  }

  // 5-2) 인간관계 유지 — 오래 안 만나면 사이가 식고, 가끔 근황이 들려온다
  updateRelationships(L);
  queueAvailableStories(L);
  const captivityPerson = updateObsession(L);
  if (captivityPerson) {
    b.captivity = true;
    b.captivityPerson = captivityPerson.name;
  }
  updateMoralityState(L);

  // 6) 행복 자연 감소
  L.happy = clamp(L.happy - LIFE.HAPPY_DECAY, 0, 100);

  if (info.month === 1 && S.day > 1) addNews(`🎂 생일! 만 ${info.age}세가 되었습니다`, 'good');
  if (b.salary > 0) addNews(`💼 월급 ${won(b.salary)}원 입금 (${job.name})`, 'good');
  else if (b.salary < 0) addNews(`📉 ${job.name} 적자 ${won(b.salary)}원`, 'bad');
  if (b.rent > 0) addNews(`🏠 월세 수입 ${won(b.rent)}원`, 'good');
  if (b.passive > 0) addNews(`💸 주식 외 자동수입 ${won(b.passive)}원 입금`, 'good');
  if (b.businessDebt) addNews(`🏪 사업체 적자 중 현금 부족분 ${won(b.businessDebt)}원이 운영채무로 전환됐습니다`, 'bad');
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
  S.bots.forEach(bot=>botNetWorth(bot)); // 보유 주식 평가액을 세력 재무건전성 계산에 동기화
  RIVALS.settleBots(S.bots).forEach(t => rivalNews.push(t));
  RIVALS.botsFight(S.bots).forEach(t => rivalNews.push(t));
  const attackStatus=factionAttackStatus();
  const attack = attackStatus.unlocked
    ? RIVALS.defendAttack(L, RIVALS.attackPlayer(S.bots, Math.max(0, totalWealth()), S.day))
    : null;
  if (attack) {
    registerFactionAttack(attack.attacker);
    L._attackedRecently=3;
    const seraScout=metRecord(L,'윤세라');
    if(seraScout)queueYujinInvestigation(L.seraHousing,attack.attacker);
    if(seraScout&&L.seraIntelHelper&&!attack.caught&&!attack.blocked&&(seraScout.obsession||0)<90&&Math.random()<.28){
      attack.caught=true;attack.blocked=true;attack.loss=0;
      attack.message+=` 윤세라가 예전에 빼낸 송금책의 동선을 알아보고 피해를 막았습니다.`;
    }
    if (!attack.caught && attack.loss > 0) {
      const cashLoss = Math.min(Math.max(0, S.capital), attack.loss);
      S.capital -= cashLoss;
      if (attack.loss > cashLoss) LOAN.addDebt(L, attack.loss - cashLoss, '라이벌 공작 피해채무');
      L.happy = clamp(L.happy - 5, 0, 100);
    }
    const defended=attack.caught||attack.blocked;
    if(!metRecord(L,'윤세라')&&!defended){
      L.seraRescueOrigin={ready:true,attacker:attack.attacker,loss:attack.loss||0,day:S.day};
    }
    rivalNews.push(`⚔️ [나 대상] ${attack.message}`);
    addNews(`⚔️ ${attack.message}`, defended ? 'good' : 'bad');
    flashToast(`⚔️ ${attack.message}`, defended ? 'good' : 'bad');
    queueImportantEvent({ type:'faction', scene:'./assets/pixel-event-faction-court-v1.png', icon:defended?'🛡️':'⚔️', title:'라이벌이 나를 노렸습니다', desc:attack.message, detail:attack.caught ? '상대의 공작이 적발되어 직접 피해를 피했습니다.' : attack.blocked ? '내 세력이 공격을 포착하고 피해를 완전히 막았습니다.' : `직접 손실 ${won(attack.loss || 0)}원이 반영됐습니다.`, tone:defended ? 'good' : 'bad' });
  }
  queueFactionStoryProgress();
  queueFactionRankEnding();
  rivalNews.forEach(t => S.rivalFeed.unshift({ day: S.day, text: t }));
  if (S.rivalFeed.length > 50) S.rivalFeed.length = 50;
  // 봇별 순자산 추이 기록 (라이벌 차트용)
  S.bots.forEach(b => { b.nwHist = b.nwHist || []; b.nwHist.push(Math.round(botNetWorth(b))); if (b.nwHist.length > 48) b.nwHist.shift(); });
  S._myNwHist = S._myNwHist || []; S._myNwHist.push(Math.round(netWorthClean())); if (S._myNwHist.length > 48) S._myNwHist.shift();
  monthlyRivalMessages(L);
  const housingResult = HOUSING.monthly(L, ECONOMY.livingMultiplier(S.economy));
  b.housingExpense = housingResult.expense || 0;
  b.housing = housingResult;
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
  b.health = healthResult;
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
  b.career = careerResult;
  if (careerResult.promotion) {
    S.capital += careerResult.bonus;
    addNews(`🎉 ${job.name} ${careerResult.promotion} 승진 · 축하금 ${won(careerResult.bonus)}원`, 'good');
    flashToast(`🎉 ${careerResult.promotion} 승진!`, 'good'); celebrate();
    queueImportantEvent({ type:'job', icon:'🎉', title:`${careerResult.promotion} 승진`, desc:`${job.name}에서 경력과 능력을 인정받았습니다.`, detail:`축하금 ${won(careerResult.bonus)}원이 입금됐습니다.`, tone:'good' });
  }
  const familyResult = FAMILY.monthly(L);
  familyResult.cost = Math.round(familyResult.cost * ECONOMY.livingMultiplier(S.economy));
  b.familyCost = familyResult.cost || 0;
  b.family = familyResult;
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
    income: Math.max(0, b.salary + b.rent + b.passive + (b.businessNet||0)),
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
  const publicityResult=RELATIONSHIPS.monthlyPublicity(L,{month:S.day});
  if(publicityResult){
    const social=SOCIAL.ensure(L);social.reputation=clamp(social.reputation+(publicityResult.reputationDelta||0),0,100);
    addNews(`${publicityResult.type==='exposed'?'📸':'🤝'} ${publicityResult.text}`,publicityResult.reputationDelta<0?'bad':'good');
    if(publicityResult.type==='exposed')queueImportantEvent({type:'love',icon:'📸',title:'비공개 관계가 먼저 소문났다',desc:publicityResult.text,detail:`평판 ${publicityResult.reputationDelta} · 그룹 긴장도 증가 · 관계 공개 여부를 다시 정할 수 있습니다.`,tone:'bad'});
  }
  monthlySocialMessages(L);
  monthlyFactionMemberMessages(L);
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
  b.solvency=CAMPAIGN.updatePlayerSolvency(L,{
    totalWealth:totalWealth(),
    liquidWorth:netWorthClean(),
    debt:(L.loan||0)+(S.loan||0),
    reason:b.debtGameOver?'채무 추심과 연체가 한계에 도달해 모든 회생 수단이 중단됐습니다.':'자산을 처분해도 부채와 의무지출을 두 달 연속 감당하지 못했습니다.'
  });
  b.campaignBankruptcyReason=b.debtGameOver
    ?'채무 추심과 연체가 한계에 도달해 모든 회생 수단이 중단됐습니다.'
    :b.solvency.reason;
  b.campaignBankrupt=(b.debtGameOver||b.solvency.bankrupt)&&!L.campaignSolvency.endingSeen;
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
  host.innerHTML=`<div class="window life-window"><div class="title-bar life-bar"><div class="title-bar-text">🎒 인생 시작 2/2 · 학창시절은 어땠을까?</div></div><div class="window-body"><img class="life-scene-banner" src="./assets/life-origin-school.png" alt="방과 후 여러 동아리와 친구 사이에서 진로를 고민하는 장면"><div class="origin-selected">${bg?`${bg.icon} ${bg.name}에서 자랐습니다.`:''}</div><p class="life-intro">학창시절 선택이 강점과 훗날 지원할 진로를 좁히고, 졸업 뒤에도 연락하는 친구 한 명을 만듭니다. 하지만 학교를 떠난 직후에는 곧바로 번듯한 직장에 들어가지 못합니다.</p><div class="event-options">${SCHOOL_LIVES.map(v=>`<button class="event-opt origin-choice" data-school-life="${v.id}"><b>${v.icon} ${v.name}</b><span>${v.desc}</span><small>${v.result}</small></button>`).join('')}</div></div></div>`;
  host.querySelectorAll('[data-school-life]').forEach(b=>b.addEventListener('click',()=>chooseSchoolLife(b.dataset.schoolLife)));
}
function chooseSchoolLife(id){
  const school=ORIGIN&&ORIGIN.school(id);if(!school)return;const L=S.life;L.schoolLife=id;L.originNarrativeVersion=2;applyOriginStats(school);
  const childhood=school.childhood||{},heroine=D.CHARACTERS.find(person=>person.name===childhood.heroine),ally=(D.WORLD_MALE_NPCS||[]).find(person=>person.name===childhood.ally);
  if(ally){
    const friend=SOCIAL.addContact(L,{name:ally.name,role:'schoolfriend',origin:'school',originKey:'school-best-friend',relationLabel:school.friendTag,trust:60,favor:2,schoolTag:school.friendTag,worldNpcId:ally.id,freeRecruit:true});
    L.originFriend={kind:'ally',name:friend.name,npcId:ally.id,contactId:friend.id,schoolId:id};
  }
  const pastClub=ORIGIN&&ORIGIN.PAST_CLUB;
  if(pastClub&&CHILDHOOD_CIRCLE){
    pastClub.members.forEach(name=>{
      const master=D.CHARACTERS.find(person=>person.name===name);if(!master)return;
      const former=rememberPerson({...master,childhoodFriend:true,formerClubEx:true,schoolTag:`${pastClub.name} 전 연인`},'ex');
      former.status='ex';former.childhoodFriend=true;former.formerClubEx=true;former.schoolTag=`${pastClub.name} 전 연인`;
      former.blockedByPlayer=true;former.contactUnlocked=false;former.contactDay=null;former.affection=Math.max(8,Math.min(former.affection||8,18));former.trust=Math.max(4,Math.min(former.trust||4,12));
      ensureCourtship(former).interactions=0;
    });
    const anchor=heroine&&metRecord(L,heroine.name);
    if(anchor)CHILDHOOD_CIRCLE.register(L,anchor,id);
  }
  const social=SOCIAL.ensure(L),father=social.contacts.find(contact=>contact.role==='father'),guardian=social.contacts.find(contact=>contact.role==='guardian');
  const warning=father||guardian;
  if(warning){
    const line=father
      ?'학교 때 일은 이제 놓고 살아라. 지나간 사람들 연락처는 차단해 두고, 집에만 있지 말고 밖에 나가 네 생활부터 만들어.'
      :'학교 때 동아리 일처럼 혼자 감당하지 마. 돈 문제든 사람 문제든 이상하면 먼저 연락해.';
    pushPersonMessage(L,warning,line,false);
  }
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
  const pool=originCareerCandidates(),job=D.JOBS.find(j=>j.id==='parttime')||D.JOBS.find(j=>j.id==='none');
  L.firstCareerPool=[...new Set(pool)];
  L.prologue={stage:'shut_in',careerUnlocked:false,firstCareerStarted:false,candidateJobs:[...L.firstCareerPool]};
  L.job=job.id;L.lifeView='origin';CAREER.switchJob(L,job.id);L.started=true;
  const bg=ORIGIN&&ORIGIN.family(L.familyBackground),school=ORIGIN&&ORIGIN.school(L.schoolLife),social=SOCIAL.ensure(L);
  const contacts=social.contacts.filter(c=>c.origin).map(c=>`${SOCIAL.role(c).icon} ${c.name}`).join(' · ');
  const host=$('life-modal');host.style.display='flex';host.className='life-modal-host';
  host.innerHTML=`<div class="window life-window"><div class="title-bar life-bar"><div class="title-bar-text">🌒 프롤로그 · 문을 잠근 뒤</div></div><div class="window-body"><img class="life-scene-banner" src="./assets/life-origin-school.png" alt="불이 꺼진 방에서 휴대전화를 뒤집어 둔 밤"><div class="origin-timeline"><div>${bg.icon}<b>${bg.name}</b></div><i>→</i><div>${school.icon}<b>${school.name}</b></div><i>→</i><div>🌒<b>멈춘 생활</b></div></div><div class="event-title">졸업 뒤, 한동안 집 밖으로 나갈 이유를 만들지 못했습니다.</div><div class="event-desc">생활경제연구회에서 끝내 정리하지 못한 관계와 실패가 겹친 뒤 연락처를 차단하고 방 안에 머물렀습니다. 사람 없는 새벽 시간의 편의점 대타와 집에서 받는 단기 의뢰만으로 월세와 식비를 버팁니다. 지금의 직업은 경력이 아니라 <b>${job.name}</b>입니다.</div><div class="important-event-detail">과거가 남긴 정규직 후보 ${L.firstCareerPool.length}개 · 투자지원 등록 뒤 지원 가능<br>남아 있는 연락처 · ${contacts}</div><button id="origin-start" class="session-btn opening">불이 켜진 휴대전화를 확인한다</button></div></div>`;
  addNews(`🌒 은둔 생활 시작 · ${job.name}와 단기 의뢰로 생활비를 버팁니다`,'neutral');
  $('origin-start').addEventListener('click',()=>{celebrate();checkAchievements();renderMarketPhase();renderAll();showOriginFriendReferral();autoSave();});
  autoSave();
}

function unlockPrologueCareer(){
  const L=S.life;if(!L)return;
  L.prologue=Object.assign({stage:'shut_in',careerUnlocked:false,firstCareerStarted:false,candidateJobs:[...(L.firstCareerPool||[])]},L.prologue||{});
  L.prologue.stage='support';L.prologue.careerUnlocked=true;
}

function showOriginFriendReferral(){
  const host=$('life-modal'),origin=S.life.originFriend,school=ORIGIN&&ORIGIN.school(S.life.schoolLife);
  const contact=origin&&SOCIAL.ensure(S.life).contacts.find(item=>item.id===origin.contactId);
  if(!host||!contact){S.life.tutorialSeen=true;unlockPrologueCareer();closeLifeModal();renderAll();autoSave();return;}
  const npc=(D.WORLD_MALE_NPCS||[]).find(item=>item.id===origin.npcId)||{name:contact.name,portrait:'mob-faction-intel.png',job:'학창시절 친구'};
  const lines=[
    [contact.name,school&&school.guideLine||'돈 버는 법 알려 달라 했지? 괜찮은 투자지원 프로그램을 찾았어.'],
    ['플레이어','갑자기 웬 투자지원 프로그램이야? 너 이런 거 챙겨 주는 성격 아니잖아.'],
    [contact.name,'무료 교육에 초보 지원금도 있대. 대신 첫 등록은 직접 가야 한대.'],
    ['플레이어','온라인으로 하면 안 되냐고 물어봐 줘.'],
    [contact.name,'또 집에만 있으려고? 출근 말고 네 발로 나가는 게 언제였는지도 기억 안 나잖아.'],
    ['플레이어','그 얘기는 하지 마.'],
    [contact.name,'알아. 그래서 억지로라도 예약해 둔 거야. 네가 먼저 들어 보고 괜찮으면 나한테 요약 좀 해 줘.'],
    ['플레이어','역시 공짜로 부려 먹으려는 거였네.'],
    [contact.name,'그것도 있고… 후기 보니까 상담 담당자가 설명도 잘하고 꽤 예쁘다더라.'],
    ['플레이어','그게 진짜 목적이지? 궁금하면 네가 직접 가.'],
    [contact.name,'처음부터 둘이 들이대면 영업하러 온 줄 알잖아. 네가 교육부터 들어 보고 자연스럽게 분위기 좀 봐 줘.'],
    ['플레이어','투자를 배우라는 건지 번호를 받아 오라는 건지 하나만 해.'],
    [contact.name,'투자가 먼저지. 너 옛날 동아리 일 겪고도 사람부터 보면 진짜 답 없다. 이번에는 돈 얘기만 잘 듣고 와. 주소 보냈다.'],
  ];
  S._originReferralIndex=0;
  const render=()=>{
    const index=S._originReferralIndex||0,shown=lines.slice(0,index+1);
    host.style.display='flex';host.className='life-modal-host';
    host.innerHTML=`<div class="window event-window legacy-window tutorial-choice-window"><div class="title-bar"><div class="title-bar-text">📱 ${school.friendTag}의 수상한 소개</div></div><div class="window-body"><div class="date-profile"><img class="char-portrait" src="./assets/characters/${npc.portrait}" alt="${contact.name}"><div class="dp-info"><strong>${contact.name}</strong> · ${school.friendTag}<br><span class="muted">${npc.job}</span></div></div><div class="origin-chat-log">${shown.map(([speaker,text])=>`<div class="story-dialogue ${speaker==='플레이어'?'player-line':''}"><b>${speaker}</b> “${text}”</div>`).join('')}</div><div class="event-options">${index<lines.length-1?'<button id="origin-referral-next" class="event-opt">다음 메시지</button>':'<button id="origin-referral-go" class="event-opt hot">📍 투자지원센터로 간다</button><button id="origin-referral-skip" class="event-opt">설명은 나중에 듣고 바로 시작한다</button>'}</div></div></div>`;
    const next=$('origin-referral-next');if(next)next.addEventListener('click',()=>{S._originReferralIndex++;render();});
    const go=$('origin-referral-go');if(go)go.addEventListener('click',()=>{S.life.referralSeen=true;showTutorial();});
    const skip=$('origin-referral-skip');if(skip)skip.addEventListener('click',()=>{S.life.referralSeen=true;S.life.tutorialSeen=true;unlockPrologueCareer();closeLifeModal();renderAll();autoSave();});
  };
  render();
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
  const prologue=S.life.prologue||{},enteringCareer=S.life.job==='parttime'&&!prologue.firstCareerStarted;
  if(isChange&&enteringCareer&&!prologue.careerUnlocked){flashToast('📱 투자지원 등록을 마치면 처음 정규직에 지원할 수 있습니다','neutral');return;}
  const candidateIds=new Set(prologue.candidateJobs&&prologue.candidateJobs.length?prologue.candidateJobs:S.life.firstCareerPool||[]);
  const focusedJobs=D.JOBS.filter(j=>enteringCareer?(j.id===S.life.job||candidateIds.has(j.id)):(CORE_JOB_IDS.includes(j.id)||j.id===S.life.job));
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
         <p class="life-intro">${enteringCareer?'가정환경과 학창생활이 남긴 후보입니다. 단기 알바로 버티던 생활을 끝내고 첫 정규직에 지원합니다.':isChange ? '주요 인물들의 직장·업계와 실제로 연결되는 핵심 직군만 표시됩니다. 지원하면 <b>합격 확률</b>로 성패가 갈립니다.' : '첫 직업은 가정환경과 학창생활에 따라 자동으로 정해집니다.'}</p>
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
    const firstCareer=S.life.job==='parttime'&&S.life.prologue&&!S.life.prologue.firstCareerStarted;
    S.life.job = id;
    CAREER.switchJob(S.life, id);
    if(firstCareer){S.life.prologue.firstCareerStarted=true;S.life.prologue.stage='career';}
    addNews(`✅ ${target.name} 이직 성공! (합격 확률 ${chance}%)`, 'good');
    flashToast(firstCareer?`✅ 첫 정규직 · ${target.name} 합격!`:`✅ ${target.name} 합격!`, 'good'); celebrate(); playSound('buy');
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
  const taesik=rememberPerson(Object.assign({},D.SPECIAL_CHARACTERS.taesik),'friend');unlockPersonalContact(taesik);taesik.affection=Math.max(18,taesik.affection||0);taesik.trust=Math.max(0,taesik.trust||0);
  LEGACY.push(L,dateInfo(S.day).age,'🔥','장태식의 제안을 받아 막장 인생을 시작했다','justice');closeLifeModal();addNews('🔥 장태식의 제안을 받아들임 · 현금 3천만원, 사채 1억5천만원, 전과 1범','bad');flashToast('🔥 막장 인생이 시작됐습니다','bad');renderAll();renderMarketPhase();autoSave();
}

function showTutorial() {
  if (seraLoopActive()) { showSeraLoopTutorial(); return; }
  const host = $('life-modal'); if (!host) return;
  host.className = 'life-modal-host';
  const n = D.SPECIAL_CHARACTERS.narae;
  host.style.display = 'flex';
  host.innerHTML =
    `<div class="window event-window legacy-window tutorial-choice-window">
       <div class="title-bar"><div class="title-bar-text">🧭 투자지원센터 · 나래와의 첫 만남</div></div>
       <div class="window-body">
         <img class="life-scene-banner guide-scene-banner" src="./assets/life-guide.png" alt="나래가 게임을 안내하는 장면">
         <div class="date-profile"><img class="char-portrait" src="${characterPortrait(n,'happy')}" alt="나래">
           <div class="dp-info"><strong>나래</strong> · 투자교육 매니저<br><span class="muted">“전화로 세 번이나 온라인 전환을 물어본 분 맞죠? 그래도 여기까지 오셨네요.”</span></div></div>
         <div class="event-desc">센터 입구에서 한참 서성이는 동안 나래가 직접 내려왔습니다. 사람 많은 로비를 피해 옆 계단으로 안내한 뒤, 초보 투자자용 신청서와 시장 화면이 놓인 빈 자리를 가리켰습니다.</div>
         <div class="event-options">
           <button id="tutorial-listen" class="event-opt">📖 네, 설명을 들을게요</button>
           <button id="tutorial-skip" class="event-opt">📋 설명은 건너뛰고 지원 등록만 할게요</button>
         </div>
       </div>
     </div>`;
  const choose = listen => {
    S.life.tutorialSeen = true;
    S.life.tutorialMet = true;
    unlockPrologueCareer();
    const firstMeeting=rememberPerson({...n,metThrough:'investment-support'},'acquaintance');
    firstMeeting.status='acquaintance';firstMeeting.affection=Math.min(firstMeeting.affection||0,5);firstMeeting.trust=Math.min(firstMeeting.trust||0,5);
    firstMeeting.contactUnlocked=false;firstMeeting.interactions=Math.min(firstMeeting.interactions||0,1);
    const origin=S.life.originFriend,friend=origin&&SOCIAL.ensure(S.life).contacts.find(item=>item.id===origin.contactId);
    if(friend)pushPersonMessage(S.life,friend,'그래서 설명은 잘 들었고? …번호는 됐냐? 아니, 투자지원 담당자 연락처 말이야.',false);
    autoSave();
    if (listen) startNaraeTutorial();
    else { closeLifeModal();renderAll();autoSave(); }
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
  RELATIONSHIPS.startRelationship(L,rec,S.day);
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
         <div class="event-title">처음 보는 아침인데, 세라는 이미 집 안에 있었습니다.</div>
         <div class="event-desc">새로 고른 가족과 학창 시절 이야기를 듣고도 세라는 놀라지 않았습니다. 현관에는 열쇠 두 개가 놓여 있고, 당신이 아직 말하지 않은 일정까지 냉장고에 적혀 있습니다.</div>
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
  { target:'[data-tab="life"]', title:'장마감 후 인생 행동', text:'마감 뒤에는 자유시간 4회로 데이트·취미·경력·인맥·가족 행동을 선택해요. 월급·빚·부동산도 함께 정산됩니다. 친구 소개로 온 지원 등록은 여기까지예요. 이제 직접 투자해 보세요.' },
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
           <button id="tutorial-tour-next" class="session-btn opening">${index === NARAE_TUTORIAL_STEPS.length - 1 ? '지원 등록 완료 · 투자 시작' : '다음'}</button>
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
  unlockPrologueCareer();
  ensureSeraLoopPartner();
  renderAll();
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
        <div><b>상한가·하한가</b><span>게임의 돈 버는 체감을 위해 상승 한도는 넓고 하락 한도는 좁게 적용되는 월간 가격 제한</span></div>
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
      • 취미의 <b>자기계발</b>과 자격증으로 능력을 키우면 <b>승진</b>과 이직에 유리합니다.`) +
    sec('💘', '사람과 관계', `
      • 혼자 하는 외출에서는 새로운 연락처가 생기지 않습니다. 사람과의 약속은 각자의 이야기에서 연락처를 교환한 뒤 잡을 수 있습니다.<br>
      • 같은 사람을 여러 번 만나도 어떤 태도를 보였는지에 따라 다음 대화가 달라집니다. 가까워지면 자연스럽게 둘만의 약속이나 고백이 이어집니다.<br>
      • 연애 중 다른 관계를 숨기면 말과 행동이 서로에게 전해질 수 있습니다. 이별 뒤에도 함께 겪은 일은 사라지지 않습니다.`) +
    sec('🤝', '인맥', `
      • 업계 모임에서 선배·은행원·변호사·기자 등을 만날 수 있습니다.<br>
      • 한두 번의 부탁보다 평소 쌓은 신뢰가 중요합니다. 가까워진 사람은 필요한 순간 먼저 손을 내밀기도 합니다.`) +
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

function showDeathScreen(age, resuming = false) {
  if (S.timer) { clearInterval(S.timer); S.timer = null; }
  S.phase = 'closed'; S.paused = true;
  const lifeBenefit = LIFE_FINANCE.deathBenefit(S.life);
  const legacy = HEALTH.inheritance(totalWealth() + lifeBenefit);
  S._legacy = legacy;
  const heir = FAMILY.bestHeir(S.life);
  S._heir = heir;
  const ending = LEGACY.ending(S.life,{wealth:legacy.gross,trades:S.trades,realized:S.realizedPnL});
  if (!resuming) LEGACY.push(S.life,age,ending.icon,`${ending.name} 엔딩을 맞았다`,'ending');
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
  resolveMonthCloseTerminal();
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
const EVENT_CAT = { job: '직업', love: '연애', debt: '빚', life: '일상', family: '자녀·가족', business:'사업' };
const LIFE_SCENE_IMAGES = {
  market: './assets/pixel-event-market-v1.png',
  job: './assets/pixel-event-career-v1.png',
  career: './assets/pixel-event-career-v1.png',
  love: './assets/pixel-event-love-conflict-v1.png',
  debt: './assets/pixel-event-debt-property-v1.png',
  home: './assets/pixel-event-debt-property-v1.png',
  property: './assets/pixel-event-market-v1.png',
  life: './assets/pixel-event-family-life-v1.png',
  family: './assets/pixel-event-family-life-v1.png',
  network: './assets/pixel-event-family-life-v1.png',
  business: './assets/pixel-event-business-v1.png',
  faction: './assets/pixel-event-faction-court-v1.png',
  court: './assets/pixel-event-faction-court-v1.png',
  incident: './assets/pixel-event-health-incident-v1.png',
  health: './assets/pixel-event-health-incident-v1.png',
};
function lifeSceneImage(key) { return LIFE_SCENE_IMAGES[key] || LIFE_SCENE_IMAGES.life; }
function importantEventPriority(event) {
  if(event.factionStory==='first_attack'||event.factionStory==='legal_result')return 100;
  if(event.factionVictory||event.captivity||event.type==='ending')return 95;
  if(event.type==='debt'||event.type==='incident'||event.dangerousHeroineEvent)return 85;
  if(event.yujinInvestigation)return 80;
  if(event.storyBridge)return 78;
  if(event.groupConfession)return 76;
  if(event.childhoodCircleEvent||event.dangerousTrioPrelude||event.dangerousTrioStart||event.freedomTrioStart||event.freedomGuildEvent||event.freedomCounselingEvent||event.freedomFirstOuting)return 75;
  if(event.crossEventId||event.story||event.bondEncounter)return 55;
  if(event.businessRomanceEvent)return 45;
  if(event.businessEvent)return 40;
  if(event.monthlyMessage)return event.targetType==='rival'?30:event.targetType==='subordinate'?25:20;
  return 50;
}
function importantEventKey(event) {
  if(event.factionStory)return`faction:${event.factionStory}`;
  if(event.yujinInvestigation)return'yujin:first-investigation';
  if(event.dangerousTrioPrelude)return`dangerous:prelude:${event.dangerousTrioPrelude}`;
  if(event.freedomCounselingEvent)return`freedom:counseling:${event.eventId}`;
  if(event.freedomFirstOuting)return'freedom:first-outing';
  if(event.groupConfession)return`group-confession:${event.groupId}`;
  if(event.crossEventId)return`cross:${event.crossEventId}`;
  if(event.monthlyMessage)return`message:${event.targetType}:${event.targetId!=null?event.targetId:event.personName||''}`;
  if(event.businessEvent)return`business:${event.businessId}:${event.eventId}`;
  if(event.story)return`story:${event.personName}`;
  return'';
}
function importantEventRouteGroup(event){
  if(!event)return null;
  if(event.childhoodCircleEvent)return'childhood';
  if(event.dangerousTrioPrelude||event.dangerousTrioStart||event.dangerousTrioChapter)return'dangerous';
  if(event.freedomTrioStart||event.freedomTrioChapter)return'freedom';
  if(event.businessRomanceEvent&&['quartet-story','quartet-ending'].includes(event.kind))return'business';
  return null;
}
function routeEventAllowed(event){
  const id=importantEventRouteGroup(event),routes=window.QT_ROMANCE_ROUTES&&S.life&&QT_ROMANCE_ROUTES.ensure(S.life);
  if(!id||!routes)return true;
  if(routes.active&&routes.active!==id)return false;
  if((routes.completed[id]||routes.failed[id])&&(
    event.dangerousTrioStart||event.freedomTrioStart||
    (event.childhoodCircleEvent==='reunion')||
    (event.businessRomanceEvent&&event.kind==='quartet-story')
  ))return false;
  return true;
}
function queueImportantEvent(event) {
  S._importantEvents = S._importantEvents || [];
  if(!routeEventAllowed(event))return;
  const key=importantEventKey(event);
  if(key&&S._importantEvents.some(item=>importantEventKey(item)===key))return;
  event._priority=importantEventPriority(event);
  const insertAt=S._importantEvents.findIndex(item=>(item._priority||importantEventPriority(item))<event._priority);
  if(insertAt<0)S._importantEvents.push(event);else S._importantEvents.splice(insertAt,0,event);
  if(S._importantEvents.length>12)S._importantEvents.length=12;
}
function closeLifeWorkspaceLayers() {
  document.body.querySelectorAll(':scope > .life-workspace-layer').forEach(layer=>{
    layer.hidden=true;
    layer.querySelectorAll('[data-life-panel]').forEach(panel=>panel.hidden=true);
  });
}
function prepareLifeEventOverlay(phoneMode) {
  closeLifeWorkspaceLayers();
  const dateHost=$('date-host');
  if(dateHost&&dateHost.style.display==='block'){dateHost.style.display='none';dateHost.innerHTML='';}
  const host=$('life-event');
  if(host)host.className=phoneMode?'event-host phone-event-host':'event-host';
}

function showNextImportantEvent(resumeCurrent = false) {
  prepareLifeEventOverlay(false);
  const queue = S._importantEvents || [];
  const ctx = S._monthCloseEventPhase && S.monthCloseContext && S.monthCloseContext.active
    ? S.monthCloseContext : null;
  let event = null;
  if (resumeCurrent && ctx && ctx.currentImportantEvent) {
    event = ctx.currentImportantEvent;
  } else {
    if (ctx) ctx.currentImportantEvent = null;
    event = queue.shift();
    while(event&&!routeEventAllowed(event))event=queue.shift();
    if (ctx && event) {
      ctx.currentImportantEvent = event;
      autoSave();
    }
  }
  if (!event) {
    if (S._monthCloseEventPhase) {
      const opened = maybeLifeEvent();
      if (opened) {
        S._monthCloseRandomEvent = true;
        if (ctx) {
          ctx.currentRandomEvent = S._curEvent || null;
          autoSave();
        }
      }
      else advanceMonthCloseFlow();
      return;
    }
    maybeLifeEvent();
    return;
  }
  if (event.childhoodCircleEvent) { showChildhoodCircleEvent(event.childhoodCircleEvent); return; }
  if (event.dangerousTrioPrelude) { showDangerousTrioPrelude(event.dangerousTrioPrelude); return; }
  if (event.dangerousTrioStart) { startDangerousTrioRoute(true); return; }
  if (event.dangerousTrioChapter) { showDangerousTrioStory(); return; }
  if (event.dangerousTrioAftermath) { showDangerousTrioAftermath(); return; }
  if (event.freedomTrioStart) { startFreedomTrioRoute(true); return; }
  if (event.freedomGuildEvent) { showFreedomGuildEvent(event.freedomGuildEvent); return; }
  if (event.freedomTrioChapter) { showFreedomTrioStory(); return; }
  if (event.freedomTrioAftermath) { showFreedomTrioAftermath(); return; }
  if (event.freedomCounselingEvent) { showFreedomCounselingEvent(event.eventId); return; }
  if (event.freedomFirstOuting) { showFreedomFirstOuting(); return; }
  if (event.freedomPersonalEvent) { showFreedomPersonalEvent(event.eventId); return; }
  if (event.groupConfession) { showGroupConfession(event); return; }
  if (event.yujinInvestigation) { showYujinInvestigation(false); return; }
  if (event.factionStory) { showFactionMentorPhoneStory(event.factionStory); return; }
  if (event.factionVictory) { showFactionVictoryEnding(); return; }
  if (event.businessEvent) { showBusinessReport(event); return; }
  if (event.businessRomanceEvent) { showBusinessRomanceEvent(event); return; }
  if (event.monthlyMessage) { prepareLifeEventOverlay(true); showMonthlyMessagePopup(event); return; }
  if (event.bondEncounter) { showBondEncounter(event); return; }
  if (event.dangerousHeroineEvent) { showDangerousHeroineEvent(event.dangerousHeroineEvent); return; }
  if (event.crossEventId) { showCrossCharacterEvent(event.crossEventId); return; }
  if (event.story && event.personName) {
    const rec = metRecord(S.life, event.personName);
    if (rec && STORIES.get(rec) && STORIES.next(rec)) { S._storyFromQueue = true; showCharacterStory(event.personName); return; }
  }
  if (ctx && MONTH_CLOSE_VIEWS['major-event']) {
    const marketHost = $('market-close');
    const lifeHost = $('life-event');
    if (lifeHost) { lifeHost.style.display = 'none'; lifeHost.innerHTML = ''; }
    marketHost.style.display = 'block';
    MONTH_CLOSE_VIEWS['major-event'].render(marketHost, {
      event:Object.assign({ scene:lifeSceneImage(event.type) }, event),
      remaining:queue.length,
    }, {
      progress:monthCloseProgress,
      next:() => {
        marketHost.style.display = 'none';
        marketHost.innerHTML = '';
        showNextImportantEvent();
      },
    });
    return;
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

function showBusinessReport(event){
  const host=$('life-event'),view=BUSINESS&&BUSINESS.eventView(S.life,event);
  if(!host||!view){showNextImportantEvent();return;}
  S._businessReport=event;
  const item=view.item,manager=view.manager,type=view.type,issue=view.event;
  const managerIdentity=BUSINESS_ROMANCE?BUSINESS_ROMANCE.identity(S.life,manager.id):null;
  const managerName=managerIdentity?managerIdentity.displayName:manager.name;
  const managerPortrait=managerIdentity&&managerIdentity.introduced?managerIdentity.portrait:view.portrait;
  const managerScene=managerIdentity&&managerIdentity.introduced?managerIdentity.scene:'';
  host.style.display='block';
  host.innerHTML=`<div class="window event-window business-report-window">
    <div class="title-bar event-bar"><div class="title-bar-text">${type.icon} 사업체 긴급 보고 · 선택 필요</div></div>
    <div class="window-body">
      ${managerScene?`<img class="business-reveal-scene" src="${managerScene}" alt="${managerName} 사업 보고 장면">`:''}
      <div class="date-profile"><img class="char-portrait" id="business-manager-portrait" src="${managerPortrait}" alt="${managerName}"><div><strong>${managerName} · ${manager.role}</strong><br><span class="muted">${type.name} 담당 · 규모 ${item.level}단계 · 평판 ${Math.round(item.reputation)} · 직원 사기 ${Math.round(item.morale)}${managerIdentity&&!managerIdentity.revealed?' · 개인 연락망 잠김':''}</span></div></div>
      <div class="event-title">${issue.title}</div>
      <div class="story-dialogue"><b>${managerName}</b> “${issue.line}”</div>
      <div class="event-desc">${issue.desc}</div>
      <div class="event-options">${view.choices.map(choice=>{const poor=choice.cash<0&&S.capital<Math.abs(choice.cash),cost=choice.cash<0?`<span class="opt-sub">현금 -${won(Math.abs(choice.cash))}${poor?' · 현금 부족':''}</span>`:'';return`<button class="event-opt" data-business-choice="${choice.id}" ${poor?'disabled':''}>${choice.text}${cost}</button>`;}).join('')}</div>
      <div class="event-outcome" id="business-report-outcome"></div>
    </div>
  </div>`;
  host.querySelectorAll('[data-business-choice]').forEach(button=>button.addEventListener('click',()=>resolveBusinessReport(button.dataset.businessChoice)));
}

function resolveBusinessReport(choiceId){
  const pending=S._businessReport,host=$('life-event');
  if(!pending||!host||!BUSINESS)return;
  const view=BUSINESS.eventView(S.life,pending),choice=view&&view.choices.find(item=>item.id===choiceId);
  if(!view||!choice){showNextImportantEvent();return;}
  if(choice.cash<0&&S.capital<Math.abs(choice.cash)){flashToast(`💸 현금 ${won(Math.abs(choice.cash))}원이 필요합니다`,'bad');return;}
  const result=BUSINESS.resolveEvent(S.life,pending,choiceId);
  if(!result.ok){flashToast(result.message||'사업 결정을 처리하지 못했습니다','bad');return;}
  S.capital+=result.cash;
  if(BUSINESS_ROMANCE)BUSINESS_ROMANCE.applyDecision(S.life,result.manager.id,(view.event.choices.find(item=>item.id===choiceId)||{}).effects);
  const managerIdentity=BUSINESS_ROMANCE?BUSINESS_ROMANCE.identity(S.life,result.manager.id):null;
  const managerName=managerIdentity?managerIdentity.displayName:result.manager.name;
  const portrait=$('business-manager-portrait');if(portrait)portrait.src=managerIdentity&&managerIdentity.introduced?managerIdentity.portrait:result.portrait;
  const options=host.querySelector('.event-options');if(options)options.innerHTML='';
  const cashText=result.cash?` · 현금 ${result.cash>0?'+':'-'}${won(Math.abs(result.cash))}`:'';
  $('business-report-outcome').innerHTML=`<div class="story-dialogue"><b>${managerName}</b> “${result.outcome}”</div><div class="oc-changes">${result.detail}${cashText}${managerIdentity?` · 숨은 신뢰 ${managerIdentity.bond}/100`:''}</div><button id="business-report-confirm" class="session-btn opening">보고 확인 · 다음 사건 보기</button>`;
  addNews(`${result.type.icon} [사업 결정] ${managerName} · ${result.outcome}${cashText}`,result.cash>=0?'good':'neutral');
  $('business-report-confirm').addEventListener('click',()=>{host.style.display='none';host.innerHTML='';S._businessReport=null;renderCapital();renderLifePanel();autoSave();showNextImportantEvent();});
  renderCapital();renderLifePanel();autoSave();
}

function showBusinessRomanceEvent(event){
  const host=$('life-event'),view=BUSINESS_ROMANCE&&BUSINESS_ROMANCE.view(S.life,event,S.capital);
  if(!host||!view){showNextImportantEvent();return;}
  S._businessRomanceEvent=event;
  const identity=view.identity;
  const singlePortrait=view.portrait||(identity&&identity.revealed?identity.portrait:
    identity?BUSINESS.portraitPath(identity.id,'neutral'):'');
  const portraits=view.portraits
    ?`<div class="business-quartet-scene">${view.portraits.map((src,index)=>`<img src="${src}" alt="${BUSINESS_ROMANCE.identity(S.life,BUSINESS_ROMANCE.IDS[index]).displayName}">`).join('')}</div>`
    :singlePortrait?`<img class="business-reveal-scene" src="${singlePortrait}" alt="${identity?identity.displayName:view.title} 이벤트 장면">`:'';
  const speaker=identity?identity.displayName:'네 명의 담당자';
  const dialogueBlock=view.dialogues&&view.dialogues.length
    ?`<div class="business-board-dialogues">${view.dialogues.map(([name,line])=>`<div class="business-board-dialogue"><b>${name}</b><span>“${line}”</span></div>`).join('')}</div>`
    :`<div class="story-dialogue"><b>${speaker}</b> “${view.line}”</div>`;
  host.style.display='block';
  host.innerHTML=`<div class="window event-window business-romance-window ${view.kind==='temptation'?'business-trap-window':''}">
    <div class="title-bar event-bar"><div class="title-bar-text">${view.icon} 사업 인연 · 뜻밖의 연락</div></div>
    <div class="window-body">
      ${portraits}
      <div class="event-title">${view.title}</div>
      ${dialogueBlock}
      <div class="event-desc">${view.desc}</div>
      ${identity?`<div class="important-event-detail">${identity.style} · ${identity.revealed?'이제 업무 밖에서도 얼굴과 이름을 숨기지 않습니다':'아직 업무용 직함과 가려진 얼굴만 알고 있습니다'}</div>`:''}
      <div class="event-options">${view.choices.map(choice=>`<button class="event-opt" data-business-romance-choice="${choice.id}">${choice.text}</button>`).join('')}</div>
      <div class="event-outcome" id="business-romance-outcome"></div>
    </div>
  </div>`;
  host.querySelectorAll('[data-business-romance-choice]').forEach(button=>button.addEventListener('click',()=>resolveBusinessRomanceEvent(button.dataset.businessRomanceChoice)));
}

function resolveBusinessRomanceEvent(choiceId){
  const pending=S._businessRomanceEvent,host=$('life-event');
  if(!pending||!host||!BUSINESS_ROMANCE)return;
  if(pending.kind==='management-collapse'&&!S._businessBadRetry){
    S._businessBadRetry={
      capital:S.capital,
      business:JSON.parse(JSON.stringify(BUSINESS.ensure(S.life))),
      romance:JSON.parse(JSON.stringify(BUSINESS_ROMANCE.ensure(S.life))),
      bond:S.life.businessQuartetBond?JSON.parse(JSON.stringify(S.life.businessQuartetBond)):null
    };
  }
  const result=BUSINESS_ROMANCE.resolve(S.life,pending,choiceId,S.capital);
  if(!result.ok){flashToast(result.message||'사업 인연 선택을 처리하지 못했습니다','bad');return;}
  if(result.cash>0)S.capital+=result.cash;
  else if(result.cash<0){
    const loss=Math.abs(result.cash),paid=Math.min(Math.max(0,S.capital),loss),debt=loss-paid;
    S.capital-=paid;
    if(debt)LOAN.addDebt(S.life,debt,result.managementRescue?'사업 구조조정 자금':'사업 담당자 사건 수습금');
  }
  if(result.breakupAll){
    RELATIONSHIPS.consensualMembers(S.life).slice().forEach(person=>RELATIONSHIPS.removeMember(S.life,person.name,'ex'));
    (S.life.lovers||[]).forEach(person=>{const rec=metRecord(S.life,person.name);if(rec)rec.status='ex';});
    S.life.lovers=[];
    S.life.happy=clamp(S.life.happy-25,0,100);
    S.life.stress=clamp((S.life.stress||0)+25,0,100);
  }
  if(result.badEnding){
    if(result.managementBadEnding){
      LEGACY.push(S.life,dateInfo(S.day).age,'📉',`${result.title} · 사업관리 실패 배드엔딩`,'career');
    }else{
      changeMorality(-22,'사업 담당자 사건의 함정에 들어갔습니다');
      S.life.guilt=clamp((S.life.guilt||0)+35,0,100);
      LEGACY.push(S.life,dateInfo(S.day).age,'🕳️',`${result.title} · 사업 인연 배드엔딩`,'love');
    }
  }
  if(result.businessCollapse&&BUSINESS){
    const businessState=BUSINESS.ensure(S.life),romanceState=BUSINESS_ROMANCE.ensure(S.life);
    businessState.owned.forEach(item=>{
      if(BUSINESS_ROMANCE.IDS.includes(item.specialManagerId)){
        item.specialManagerId=null;item.managerId='internal';
        item.reputation=clamp((item.reputation||45)-18,0,100);
        item.morale=clamp((item.morale||65)-22,0,100);
        item.momentum=Math.min(item.momentum||0,-.18);
      }
    });
    BUSINESS_ROMANCE.IDS.forEach(id=>{
      const staff=romanceState.staff[id];staff.hired=false;staff.assignedBusinessId=null;staff.rival=true;
    });
    S.life.businessQuartetBond=null;
  }
  if(result.revealed&&result.character){
    const rec=rememberPerson(result.character,'friend');
    unlockPersonalContact(rec);
    rec.affection=Math.max(rec.affection||0,result.affection||0);
    rec.trust=Math.max(rec.trust||0,result.trust||0);
    rec.businessHeroineId=pending.staffId;
    if(result.businessSuitor)rec.businessSuitor=true;
    pushPersonMessage(S.life,rec,`${rec.name}이에요. 업무 밖에서 부를 때는 이제 직함 말고 이름으로 불러요.`,false);
  }
  if(result.personalStory&&result.staffId){
    const profile=BUSINESS_ROMANCE.profile(result.staffId);
    const rec=metRecord(S.life,profile.name)||rememberPerson(BUSINESS_ROMANCE.asCharacter(result.staffId),'friend');
    unlockPersonalContact(rec);
    rec.affection=clamp((rec.affection||0)+(result.affection||0),0,100);
    rec.trust=clamp((rec.trust||0)+(result.trust||0),0,100);
    pushPersonMessage(S.life,rec,`${result.text} 다음에는 업무 보고가 아니라, 제 얘기도 들으러 와요.`,false);
    LEGACY.push(S.life,dateInfo(S.day).age,profile.emoji,`${profile.name} · ${result.title}`,'love');
  }
  if(result.rivalRefused){
    const group=RELATIONSHIPS.ensure(S.life).relationshipGroup;
    group.stability=clamp(group.stability+6,0,100);
    if(!result.loyaltyTest)group.tension=clamp(group.tension+4,0,100);
    const rival=BUSINESS_ROMANCE.profile(result.staffId);
    LEGACY.push(S.life,dateInfo(S.day).age,'🧱',`${result.loyaltyTest?rival.alias:rival.name}의 ${result.loyaltyTest?'대표 검증 통과':'유혹을 거절'} · ${result.currentPartner}과의 관계 유지`,'love');
  }
  if(result.groupStory){
    BUSINESS_ROMANCE.IDS.forEach(id=>{
      const profile=BUSINESS_ROMANCE.profile(id);
      const rec=metRecord(S.life,profile.name)||rememberPerson(BUSINESS_ROMANCE.asCharacter(id),'friend');
      unlockPersonalContact(rec);
      rec.affection=clamp((rec.affection||0)+(result.affectionEach||0),0,100);
      rec.trust=clamp((rec.trust||0)+(result.trustEach||0),0,100);
    });
    LEGACY.push(S.life,dateInfo(S.day).age,'🏢',`${result.title} · 사업 담당자 공동 이사회`,'career');
  }
  if(result.rivalCounter&&result.rivalName){
    const rival=(S.bots||[]).find(bot=>bot.name===result.rivalName);
    if(rival){
      rival.pressure=clamp((rival.pressure||0)+(choiceId==='counter'?18:10),0,100);
      rival.credibility=clamp((rival.credibility==null?100:rival.credibility)-(choiceId==='counter'?12:6),0,100);
      S.rivalFeed=S.rivalFeed||[];
      S.rivalFeed.unshift({day:S.day,text:`🏢 [사업 4인조 역공] ${rival.name} · 압박 ${Math.round(rival.pressure)} · 신뢰도 ${Math.round(rival.credibility)}`});
    }
  }
  if(result.chaerinCross){
    const known=metRecord(S.life,'한채린');
    if(!known){
      S.life.chaerinBoardGlimpse=true;
      S.life.chaerinBoardGlimpseChoice=choiceId;
      addNews('👑 네 책임자를 노린 거액의 스카우트 제안 뒤에 한채린이라는 이름이 남았습니다 · 나래가 사교모임에서 직접 확인하자고 했습니다','neutral');
    }else{
      known.affection=clamp((known.affection||0)+(choiceId==='refuse'?11:4),0,100);
      known.trust=clamp((known.trust||0)+(choiceId==='seat'?7:3),0,100);
      known.businessQuartetRivalry=(known.businessQuartetRivalry||0)+1;
      known.lastSpecialFollowupDay=S.day;
      known.chaerinDefiance=(known.chaerinDefiance||0)+(choiceId==='refuse'?2:1);
      addBondInteraction(known,'business-board');
      if(CHAR_TRAITS)CHAR_TRAITS.change(known,choiceId==='refuse'?12:5);
      known.secretaryNote=choiceId==='refuse'?'내 계약서를 면전에서 돌려준 사람은 처음이네. 다음에도 비위 맞추면 오늘 한 말 전부 취소한 걸로 알겠어.':'투자자 자리만 주고 사람은 못 건드리게 한다? 적어도 아첨은 아니네. 다음에는 네 말로 직접 조건을 정해.';
      addNews(`📇 한채린 비서실 전달: “${known.secretaryNote}”`,'neutral');
    }
  }
  if(result.soloEnding){
    LEGACY.push(S.life,dateInfo(S.day).age,'💍',`${result.title} · 사업 담당자 순애엔딩`,'love');
    celebrate();
  }
  if(result.quartet)result.text+=' 네 사람의 공동 이야기는 끝났지만, 사적인 대답은 다음 연락에서 따로 묻기로 했습니다.';
  const options=host.querySelector('.event-options');if(options)options.innerHTML='';
  const cashText=result.cash<0
    ?`<br><b class="down">합의·수습 비용 ${won(Math.abs(result.cash))}원${S.capital<=0?' · 부족액은 채무 처리':''}</b>`
    :result.cash>0?`<br><b class="up">사업 현금 유입 +${won(result.cash)}원</b>`:'';
  const retry=result.managementBadEnding?'<button id="business-romance-retry" class="session-btn opening">↩️ 사업을 방치하기 전 선택으로 돌아간다</button>':'';
  $('business-romance-outcome').innerHTML=`<div class="oc-text ${result.tone==='bad'?'down':result.tone==='good'?'up':''}">${result.badEnding?`<b>BAD END · ${result.title}</b><br>`:''}${result.text}${result.reply?`<div class="story-dialogue"><b>${BUSINESS_ROMANCE.profile(result.staffId).name}</b> “${result.reply}”</div>`:''}${cashText}${result.meta?`<div class="oc-changes">${result.meta}</div>`:''}</div>${retry}<button id="business-romance-confirm" class="session-btn ${result.managementBadEnding?'':'opening'}">기록하고 다음 사건 보기</button>`;
  addNews(`${result.badEnding?'🕳️':result.quartet||result.groupStory?'🏢':result.revealed?'🎭':'💼'} ${result.text}`,result.tone||'neutral');
  $('business-romance-confirm').addEventListener('click',()=>{
    host.style.display='none';host.innerHTML='';S._businessRomanceEvent=null;S._businessBadRetry=null;
    renderCapital();renderLifePanel();autoSave();showNextImportantEvent();
  });
  const retryButton=$('business-romance-retry');if(retryButton)retryButton.addEventListener('click',retryBusinessManagementEnding);
  renderCapital();renderLifePanel();autoSave();
}

function activateBusinessQuartetBond(){
  if(!BUSINESS_ROMANCE)return;
  BUSINESS_ROMANCE.IDS.forEach(id=>{
    const rec=rememberPerson(BUSINESS_ROMANCE.asCharacter(id),'polycule');
    rec.affection=Math.max(rec.affection||0,75);rec.trust=Math.max(rec.trust||0,55);
    RELATIONSHIPS.addMember(S.life,rec,S.day);
  });
  const members=BUSINESS_ROMANCE.IDS.map(id=>BUSINESS_ROMANCE.profile(id).name);
  const first=metRecord(S.life,members[0]);
  if(first){S.life.relationship='dating';S.life.partner=Object.assign({},first,{mood:'happy'});first.status='partner';}
  const group=RELATIONSHIPS.ensure(S.life).relationshipGroup;
  group.agreement.publicity='private';group.agreement.cohabiting=true;
  S.life.businessQuartetBond={active:true,since:S.day,members};
  LEGACY.push(S.life,dateInfo(S.day).age,'🏢','네 개의 명함 · 사업 담당자 4인 세트엔딩','love');
  addNews('🏢 네 책임자의 고백을 받아들였습니다 · 공동 경영과 관계를 분리한 4인 연애 시작','good');
  celebrate();
}

function retryBusinessManagementEnding(){
  const checkpoint=S._businessBadRetry,event=S._businessRomanceEvent;if(!checkpoint||!event)return;
  S.capital=checkpoint.capital;
  S.life.business=JSON.parse(JSON.stringify(checkpoint.business));
  S.life.businessRomance=JSON.parse(JSON.stringify(checkpoint.romance));
  S.life.businessQuartetBond=checkpoint.bond?JSON.parse(JSON.stringify(checkpoint.bond)):null;
  if(S.life.romanceRoutes){delete S.life.romanceRoutes.failed.business;S.life.romanceRoutes.active=null;}
  S._businessBadRetry=null;
  showBusinessRomanceEvent(event);renderCapital();renderLifePanel();autoSave();
}

function openMonthlyMessageScreen(host){
  if(!host)return false;
  const screen=host.querySelector('.phone-chat-screen');
  const opener=host.querySelector('#monthly-message-open');
  if(!screen)return false;
  screen.hidden=false;
  screen.classList.add('open');
  if(opener)opener.setAttribute('aria-expanded','true');
  const log=screen.querySelector('.phone-chat-log');
  if(log)log.scrollTop=0;
  return true;
}
function showMonthlyMessagePopup(event){
  const host=$('life-event');if(!host)return;
  const L=S.life,isSubordinate=event.targetType==='subordinate',isContact=event.targetType==='contact'||isSubordinate,isRival=event.targetType==='rival';
  const target=isContact?(SOCIAL.ensure(L).contacts||[]).find(c=>c.id===event.targetId)
    :isRival?(S.bots||[])[Number(event.targetId)]
    :metRecord(L,event.personName);
  if(!isContact&&!isRival&&target&&FREEDOM_TRIO&&!FREEDOM_TRIO.canContact(L,target.name)){showNextImportantEvent();return;}
  if(!target){showNextImportantEvent();return;}
  const role=isContact?SOCIAL.role(target):null;
  const title=isContact?`${role.icon} ${target.name}`:target.name;
  const avatar=isContact?`<span class="message-popup-avatar">${role.icon}</span>`
    :isRival&&target.portrait?`<img class="char-portrait" src="./assets/characters/${target.portrait}" alt="${target.leader}">`
    :isRival?`<span class="message-popup-avatar">📈</span>`
    :`<img class="char-portrait" src="${characterPortrait(target)}" alt="${target.name}">`;
  const choices=isRival&&RIVALS.contactReplyOptions
    ? RIVALS.contactReplyOptions(target,event.rivalMessage)
    : isContact&&SOCIAL.contactReplyOptions
    ? SOCIAL.contactReplyOptions(target,event.text)
    : !isContact&&window.QT_CHAT&&QT_CHAT.replyOptions
      ? QT_CHAT.replyOptions(target,event.text)
      : isContact
        ? [{id:'warm',text:'다정하게 안부를 답한다'},{id:'advice',text:'고민을 솔직하게 말한다'},{id:'meet',text:'다음 달에 만나자고 한다'},{id:'brief',text:'짧게 답장한다'}]
        : [{id:'warm',text:'다정하게 답한다'},{id:'brief',text:'짧게 안부만 답한다'},{id:'boundary',text:'연락의 선을 분명히 한다'},{id:'ignore',text:'읽고 답하지 않는다'}];
  S._monthlyMessage={event,target,isContact,isRival,isSubordinate,choices};
  host.style.display='block';
  const now=dateInfo(S.day);
  const appName=isRival?'Market Wire':isSubordinate?'작전실':'QuickTalk';
  const appIcon=isRival?'📊':isSubordinate?'🛡️':'💬';
  const replyLabel=isRival?'상대의 의도를 읽고 대응을 고르세요.':isSubordinate?'보고를 확인하고 지시를 내리세요.':'이 메시지에 어떻게 답할까요?';
  host.innerHTML=`<div class="phone-notification-stage"><div class="phone-shell"><div class="phone-status"><span>${now.month}월 장 마감</span><span>●●● 100%</span></div><div class="phone-lock-time"><b>${String(now.month).padStart(2,'0')}:00</b><small>${now.year}년 ${now.month}월 · 월말 알림</small></div><button type="button" class="phone-notification-card" id="monthly-message-open" aria-controls="monthly-message-screen" aria-expanded="false"><span class="phone-app-icon">${appIcon}</span><span><small>${appName} · 지금</small><b>${title}</b><em>${event.text}</em></span><i>›</i></button><div class="phone-chat-screen" id="monthly-message-screen" hidden><header>${avatar}<span><b>${title}</b><small>${isRival?`${target.faction} · 적대 세력`:isSubordinate?'내 세력 · 직속 부하':isContact?(target.relationLabel||role.name):relationTag(L,target.name)}</small></span></header><div class="phone-chat-log"><div class="phone-date-chip">${now.year}년 ${now.month}월 · 장 마감 후</div><div class="phone-bubble incoming">${event.text}</div><div class="phone-typing"><i></i><i></i><i></i></div><div class="phone-reply-label">${replyLabel}</div><div class="phone-reply-options">${choices.map(choice=>`<button type="button" data-monthly-reply="${choice.id}">${choice.text}</button>`).join('')}</div><div class="event-outcome" id="message-event-outcome"></div></div></div></div></div>`;
  host.onclick=click=>{
    const opener=click.target.closest('#monthly-message-open');
    if(opener&&host.contains(opener)){openMonthlyMessageScreen(host);return;}
    const reply=click.target.closest('[data-monthly-reply]');
    if(reply&&host.contains(reply))resolveMonthlyMessage(reply.dataset.monthlyReply);
  };
}
function resolveMonthlyMessage(kind){
  const pending=S._monthlyMessage,host=$('life-event');if(!pending||!host)return;
  const choice=(pending.choices||[]).find(item=>item.id===kind);
  const replyOptions={popup:true,incoming:pending.event.text,text:choice&&choice.text};
  const result=pending.isRival?replyToRival(pending.target,kind,pending.event.rivalMessage,replyOptions)
    :pending.isContact?replyToContact(pending.target,kind,replyOptions)
    :replyToPerson(pending.target,kind,replyOptions);
  if(!result||!result.ok)return;
  const options=host.querySelector('.phone-reply-options');if(options)options.innerHTML='';
  const room=personChat(S.life,pending.target.name);room.unread=0;
  const unlock=!pending.isContact&&!pending.isRival&&courtshipReadiness(pending.target).ready?`<div class="oc-changes">💘 ${pending.target.name}님이 다음에는 미리 약속을 잡아 만나자고 말했습니다.</div>`:'';
  $('message-event-outcome').innerHTML=`<div class="phone-bubble mine">${result.text}</div>${result.answer?`<div class="phone-bubble incoming followup">${result.answer}</div>`:''}${result.meta?`<div class="oc-changes">${result.meta}</div>`:''}${unlock}<button id="message-event-confirm" class="phone-chat-confirm">대화 닫기 · 다음 알림</button>`;
  $('message-event-confirm').addEventListener('click',()=>{host.style.display='none';host.innerHTML='';S._monthlyMessage=null;renderLifePanel();renderChatPanel();autoSave();showNextImportantEvent();});
}

const BOND_ENCOUNTER_SCENES=[
  {icon:'☕',title:'퇴근 뒤 우연한 합석',scene:'./assets/date-result-normal.png',desc:'전에 나눈 이야기가 생각났다며 잠깐 차를 마시자고 했습니다.'},
  {icon:'🌂',title:'비 오는 날의 재회',scene:'./assets/relationship-friend.png',desc:'갑작스러운 비를 피하다 같은 처마 아래에서 다시 마주쳤습니다.'},
  {icon:'📚',title:'서로의 취향을 발견한 날',scene:'./assets/life-network.png',desc:'지난 대화에서 말한 취향을 기억하고 먼저 이야기를 꺼냈습니다.'},
  {icon:'🥡',title:'늦은 저녁의 안부',scene:'./assets/date-route-friend.png',desc:'각자 바쁜 하루를 끝낸 뒤 간단한 저녁을 함께 먹게 됐습니다.'}
];
function queueBondEncounter(L){
  const pool=ensureMet(L).filter(r=>
    (!FREEDOM_TRIO||FREEDOM_TRIO.canMeetOffline(L,r.name))&&
    r.status==='friend'&&hasPersonalContact(r)&&
    !courtshipReadiness(r).ready&&r.lastBondEncounterDay!==S.day
  );
  if(!pool.length||Math.random()>.55)return;
  const r=pick(pool);r.lastBondEncounterDay=S.day;
  queueImportantEvent({bondEncounter:true,personName:r.name,sceneIndex:Math.floor(Math.random()*BOND_ENCOUNTER_SCENES.length)});
}
function showBondEncounter(event){
  const host=$('life-event'),r=metRecord(S.life,event.personName);
  if(r&&FREEDOM_TRIO&&!FREEDOM_TRIO.canMeetOffline(S.life,r.name)){showNextImportantEvent();return;}
  if(!host||!r){showNextImportantEvent();return;}
  const scene=BOND_ENCOUNTER_SCENES[event.sceneIndex]||BOND_ENCOUNTER_SCENES[0],per=D.PERSONALITIES[r.personality]||{};
  S._bondEncounter={event,r,scene};
  host.style.display='block';
  host.innerHTML=`<div class="window event-window"><div class="title-bar event-bar"><div class="title-bar-text">${scene.icon} 다시 마주친 사람</div></div><div class="window-body"><img class="life-scene-banner" src="${scene.scene}" alt="${scene.title} 장면"><div class="date-profile"><img class="char-thumb" src="${characterPortrait(r)}" alt="${r.name}"><div><strong>${r.name} · ${r.job}</strong><br><span class="muted">${per.emoji||''}${per.name||''} · ${hasPersonalContact(r)?courtshipProgress(r):contactProgress(r)}</span></div></div><div class="event-title">${scene.title}</div><div class="event-desc">${scene.desc} 무엇을 이야기할까요?</div><div class="event-options"><button class="event-opt" data-bond-choice="listen">상대가 요즘 어떻게 지내는지 끝까지 듣는다</button><button class="event-opt" data-bond-choice="memory">지난 대화를 기억하고 먼저 꺼낸다</button><button class="event-opt" data-bond-choice="invite">다음에는 둘이 제대로 외출하자고 제안한다</button></div><div id="bond-encounter-outcome" class="event-outcome"></div></div></div>`;
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
  const gainedContact=r.name==='윤세라'?unlockPersonalContact(r):contactReadiness(r).ready&&unlockPersonalContact(r);
  if(gainedContact)pushPersonMessage(S.life,r,r.name==='윤세라'?'이제 번호도 저장했으니, 없어지면 바로 알겠네요.':'오늘은 연락처를 드려도 될 것 같아요. 다음에는 미리 약속해요.',false);
  const ready=courtshipReadiness(r);
  host.querySelector('.event-options').innerHTML='';
  $('bond-encounter-outcome').innerHTML=`<div class="story-dialogue"><b>${r.name}</b> “${text}”</div><div class="oc-changes">호감 ${affection>=0?'+':''}${affection} · 신뢰 ${trust>=0?'+':''}${trust}</div>${gainedContact?`<div class="oc-text up"><b>📱 개인 연락처 교환</b><br>${r.name}님이 직접 번호를 건넸습니다.</div>`:''}${ready.ready?`<div class="oc-text up">다음에는 우연이 아니라 약속을 잡아 만나도 좋을 것 같습니다.</div>`:''}<button id="bond-encounter-confirm" class="session-btn opening">확인 · 다음 사건 보기</button>`;
  $('bond-encounter-confirm').addEventListener('click',()=>{host.style.display='none';host.innerHTML='';S._bondEncounter=null;renderLifePanel();autoSave();showNextImportantEvent();});
}

function showCrossCharacterEvent(eventId) {
  const event = CROSS_EVENTS && CROSS_EVENTS.get(eventId,S.life);
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

function noteChaerinSupportRefusal(L,source){
  if(!BUSINESS||!BUSINESS_ROMANCE)return null;
  const state=BUSINESS_ROMANCE.ensure(L);
  state.chaerinSupportRefusals=(state.chaerinSupportRefusals||0)+1;
  if(L.dangerousTrioBond&&L.dangerousTrioBond.active)L.dangerousTrioBond.chaerinSupportRefusals=state.chaerinSupportRefusals;
  if(state.chaerinReferralGiven)return{text:'채린은 이미 소개한 책임자와 사업체부터 제대로 굴리라며 추가 송금을 거뒀습니다.',given:false};
  if(state.chaerinSupportRefusals<2)return{text:'채린은 송금 확인 화면을 한참 바라보다가 “다음에도 거절하면 진짜 아무것도 안 줘”라고 메시지를 남겼습니다.',given:false};
  if(!BUSINESS_ROMANCE.chaerinAccess(L)){
    state.chaerinReferralPending=true;
    return{text:'채린은 사람을 소개해 주겠다고 했지만, “네가 지금 만나는 사람들 이야기부터 끝내. 내 사람은 그다음 장이야”라며 명함을 다시 넣었습니다.',given:false,pending:true};
  }
  const candidates=BUSINESS_ROMANCE.IDS.filter(id=>{
    const profile=BUSINESS_ROMANCE.profile(id),staff=BUSINESS_ROMANCE.staffState(L,id);
    return profile&&staff&&!staff.hired&&!BUSINESS.owned(L,profile.businessId);
  });
  const staffId=candidates[0]||BUSINESS_ROMANCE.IDS.find(id=>!BUSINESS_ROMANCE.staffState(L,id).hired);
  if(!staffId){
    state.chaerinReferralGiven=true;
    return{text:'채린은 “사람도 사업도 이미 다 받아 놓고 뭘 더 거절해”라며 이번에는 정말 전화를 끊었습니다.',given:false};
  }
  const profile=BUSINESS_ROMANCE.profile(staffId);
  const introduced=BUSINESS_ROMANCE.introduce(L,staffId);
  if(!introduced)return null;
  let business=BUSINESS.owned(L,profile.businessId),gifted=false;
  if(!business){
    const opened=BUSINESS.start(L,profile.businessId,S.day);
    if(opened.ok){business=opened.business;gifted=true;}
  }
  if(business&&!business.specialManagerId){
    BUSINESS_ROMANCE.recruit(L,staffId,business.id);
    BUSINESS.assignSpecialManager(L,business.id,staffId);
  }
  const staff=BUSINESS_ROMANCE.staffState(L,staffId);
  staff.chaerinReferral=true;staff.bond=Math.max(staff.bond||0,10);staff.trust=Math.max(staff.trust||0,5);
  state.chaerinReferralGiven=true;state.chaerinReferralStaffId=staffId;state.chaerinReferralSource=source||'support-refusal';
  state.chaerinReferralPending=false;
  const type=BUSINESS.typeOf(profile.businessId);
  const text=`채린은 잠시 말이 없다가 “그래, 내 돈은 그렇게 싫다 이거지. 그럼 사람이나 하나 소개해 줄게”라고 했습니다. ${profile.alias}을 책임자로 붙인 ${type?type.name:'사업체'}${gifted?'를 통째로 넘겼습니다':'의 운영권을 넘겼습니다'}.`;
  addNews(`👑 한채린의 소개 · ${profile.alias}과 ${type?type.name:'사업체'} 운영 시작`,'good');
  return{text,given:true,staffId,businessId:business&&business.id};
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
  if(r.name==='한채린'&&CHAR_TRAITS){
    const defiant=(choice.affection||0)>0;
    CHAR_TRAITS.change(r,defiant?Math.min(10,choice.affection||0):-6);
    if(defiant)r.chaerinDefiance=(r.chaerinDefiance||0)+1;
  }
  if(choice.danger){
    if(r.name==='윤세라')r.obsession=clamp((r.obsession||0)+choice.danger,0,100);
    else r.dangerLevel=clamp((r.dangerLevel||0)+choice.danger,0,100);
  }
  if(choice.mutualObsession)r.mutualObsession=(r.mutualObsession||0)+choice.mutualObsession;
  if(choice.flags)Object.assign(r,choice.flags);
  if(choice.cash)S.capital=Math.max(0,S.capital+choice.cash);
  if(choice.happy)S.life.happy=clamp(S.life.happy+choice.happy,0,100);
  r.dangerEvents=r.dangerEvents||{};r.dangerEvents[pending.id]='seen';
  const refusalIds=new Set(['chaerin_warning','chaerin_control','chaerin_daily1','chaerin_romance','chaerin_romance2','chaerin_romance3']);
  const referral=r.name==='한채린'&&choiceIndex===0&&refusalIds.has(pending.id)
    ?noteChaerinSupportRefusal(S.life,`chaerin-event:${pending.id}`):null;
  const options=host.querySelector('.event-options');if(options)options.innerHTML='';
  $('danger-heroine-outcome').innerHTML=`<div class="oc-text">${choice.result}</div>${referral?`<div class="important-event-detail ${referral.given?'up':'neutral'}">${referral.text}</div>`:''}<div class="oc-changes">호감 ${choice.affection>=0?'+':''}${choice.affection||0} · 신뢰 ${choice.trust>=0?'+':''}${choice.trust||0}${choice.danger?` · 위험도 ${choice.danger>0?'+':''}${choice.danger}`:''}${choice.cash?` · ${choice.cash>0?'수입 +':'지출 '}${won(Math.abs(choice.cash))}`:''}</div><button id="danger-heroine-confirm" class="session-btn opening">확인 · 다음 사건 보기</button>`;
  $('danger-heroine-confirm').addEventListener('click',()=>{host.style.display='none';host.innerHTML='';S._dangerousHeroineEvent=null;renderLifePanel();autoSave();showNextImportantEvent();});
}

function showFreedomCounselingEvent(eventId){
  const event=FREEDOM_TRIO&&FREEDOM_TRIO.counselingEvent(eventId),host=$('life-event');
  if(!event||!host){showNextImportantEvent();return;}
  const r=metRecord(S.life,event.name);if(!r){showNextImportantEvent();return;}
  S._freedomCounselingEvent={id:eventId,event,r};
  const mode=FREEDOM_TRIO.storyMode(S.life),relation=FREEDOM_TRIO.relationshipMode(S.life);
  const modeLine=mode==='rescue'
    ?'세 사람은 당신을 억지로 끌어내지 않습니다. 먼저 각자의 무너지는 순간을 전화로 나누며, 현관까지 갈 이유를 함께 만듭니다.'
    :mode==='guarded'
      ?'위험한 세 사람은 새 연락처를 경계하고 있습니다. 이 통화는 구원 경쟁이 아니라, 서로의 생활을 침범하지 않는 새 관계의 시작입니다.'
      :'화려한 직업 뒤의 고민은 약속 장소보다 먼저 휴대폰 대화창에서 시작됩니다.';
  const relationLine=relation.exclusive
    ?'<div class="important-event-detail">세 사람은 당신에게 연인이 있다는 사실을 알고 있습니다. 유나는 농담처럼 던진 선을 바로 거두고, 채원과 소희도 “그 사람이 불안해질 일은 만들지 말자”고 먼저 정리합니다.</div>'
    :'';
  host.style.display='block';
  host.innerHTML=`<div class="phone-notification-stage freedom-counseling-stage"><div class="phone-shell"><div class="phone-status"><span>QuickTalk · 음성통화</span><span>●●●</span></div><div class="phone-chat-screen open"><header><img class="char-thumb" src="${characterPortrait(r)}" alt="${r.name}"><span><b>${r.name}</b><small>${r.guildNickname||'게임 친구'} · ${r.job}</small></span></header><div class="phone-chat-log"><div class="phone-date-chip">${event.icon} ${event.title}</div><div class="phone-bubble incoming">${event.desc}</div>${event.lines.map((line,index)=>`<div class="phone-bubble ${index===1?'mine':'incoming'}">${line}</div>`).join('')}<div class="event-desc">${modeLine}</div>${relationLine}<div class="phone-reply-label">어떻게 대화를 이어 갈까요?</div><div class="phone-reply-options">${event.choices.map(choice=>`<button type="button" data-freedom-counseling="${choice.id}">${choice.text}</button>`).join('')}</div><div class="event-outcome" id="freedom-counseling-outcome"></div></div></div></div></div>`;
  host.querySelectorAll('[data-freedom-counseling]').forEach(button=>button.addEventListener('click',()=>resolveFreedomCounselingEvent(button.dataset.freedomCounseling)));
}
function resolveFreedomCounselingEvent(choiceId){
  const pending=S._freedomCounselingEvent,host=$('life-event');if(!pending||!host)return;
  const result=FREEDOM_TRIO.applyCounseling(S.life,pending.id,choiceId);if(!result)return;
  const options=host.querySelector('.phone-reply-options');if(options)options.innerHTML='';
  $('freedom-counseling-outcome').innerHTML=`<div class="phone-bubble mine">${result.choice.text}</div><div class="phone-bubble incoming followup">${result.choice.result}</div><div class="oc-changes">호감 +${result.choice.affection||0} · 신뢰 +${result.choice.trust||0} · 파티의 온기 +${result.choice.warmth||0}</div>${result.complete?'<div class="important-event-detail up">세 사람의 고민을 모두 들었습니다. 이제 화면 밖에서 만나자는 약속을 잡을 수 있습니다.</div>':''}<button id="freedom-counseling-confirm" class="phone-chat-confirm">통화를 마친다 · 다음 알림</button>`;
  addNews(`${result.event.icon} ${result.event.name}의 고민 상담 · 약속보다 먼저 이어진 통화`,'good');
  $('freedom-counseling-confirm').addEventListener('click',()=>{host.style.display='none';host.innerHTML='';S._freedomCounselingEvent=null;renderLifePanel();autoSave();showNextImportantEvent();});
  renderLifePanel();autoSave();
}
function showFreedomFirstOuting(){
  const host=$('life-event'),event=FREEDOM_TRIO&&FREEDOM_TRIO.FIRST_OUTING;if(!host||!event){showNextImportantEvent();return;}
  const mode=FREEDOM_TRIO.storyMode(S.life),sera=metRecord(S.life,'윤세라');
  const sendoff=sera&&S.life.seraHousing==='cohabit'
    ?`<div class="trio-dialogue freedom-sendoff"><img src="${characterPortrait(sera)}" alt="윤세라"><div><b>윤세라 · 현관</b><p>“게임은 내 취향이 아니라서 따라가진 않을게요. 그래도 당신이 약속 때문에라도 스스로 밖에 나가겠다고 하니까… 다행이에요. 늦으면 연락만 해요.”</p></div></div>`
    :mode==='rescue'
      ?'<div class="phone-shell outside-fear-phone"><div class="phone-chat-screen open"><div class="phone-chat-log"><div class="phone-bubble incoming"><b>채원</b> 문을 열 때까지 통화 중이에요. 말 안 해도 돼요.</div><div class="phone-bubble incoming"><b>유나</b> 사진 보내지 마요. 골목 끝 편의점만 지나오면 돼요.</div><div class="phone-bubble incoming"><b>소희</b> 현관 앞 다섯 분도 외출에 포함이에요. 기다릴게요.</div></div></div></div>'
      :'<div class="important-event-detail">약속 장소와 귀가 시간은 휴대폰으로 먼저 나눴습니다. 세 사람 모두 자신의 일정 사이에서 이 저녁을 비워 두었습니다.</div>';
  host.style.display='block';
  host.innerHTML=`<div class="window event-window freedom-trio-window"><div class="title-bar event-bar"><div class="title-bar-text">${event.icon} ${event.title}</div></div><div class="window-body"><img class="life-scene-banner" src="${event.scene}" alt="${event.title}"><div class="event-title">${event.title}</div><div class="event-desc">${event.desc}</div>${sendoff}<div class="event-options"><button class="event-opt" data-freedom-first-outing="call">세 사람의 통화를 켜 둔 채 현관문을 연다</button><button class="event-opt" data-freedom-first-outing="alone">공유받은 길을 따라 혼자 약속 장소까지 간다</button></div><div class="event-outcome" id="freedom-first-outing-outcome"></div></div></div>`;
  host.querySelectorAll('[data-freedom-first-outing]').forEach(button=>button.addEventListener('click',()=>resolveFreedomFirstOuting(button.dataset.freedomFirstOuting)));
}
function resolveFreedomFirstOuting(choiceId){
  const host=$('life-event'),result=FREEDOM_TRIO&&FREEDOM_TRIO.applyFirstOuting(S.life);if(!host||!result)return;
  const dangerousPartners=DANGEROUS_HEROINE_NAMES.map(name=>metRecord(S.life,name)).filter(person=>person&&RELATIONSHIPS.isPartner(S.life,person.name));
  let yujinNotice='';
  if(dangerousPartners.length){
    S._freedomRevealReturn={partnerNames:dangerousPartners.map(person=>person.name),trio:!!(S.life.dangerousTrioBond&&S.life.dangerousTrioBond.active)};
    const yujin=metRecord(S.life,'강유진');
    if(yujin){
      yujinNotice=S._freedomRevealReturn.trio
        ?'세라 씨에게 들었어요. 게임 모임 상대가 여자 세 명이었다면서요. 모임을 방해하진 않을 테니 끝나면 귀가 연락은 해요.'
        :'게임 친구가 여자 세 명인 건 방금 알았네요. 경찰로 묻는 건 아니에요. 다만 집에 돌아오면… 이야기는 듣고 싶어요.';
      pushPersonMessage(S.life,yujin,yujinNotice,false);
    }
  }else S._freedomRevealReturn=null;
  const rescue=result.mode==='rescue'
    ?'<div class="important-event-detail up">세 사람 중 누구도 당신을 끌어내지 않았습니다. 세 통의 연락이 끊기지 않는 동안 스스로 문을 열었습니다. 돌아오는 길에는 다음 약속도 갈 수 있을 것 같다는 생각이 처음 들었습니다.</div>'
    :result.mode==='guarded'
      ?'<div class="important-event-detail">위험한 3인조는 이 만남을 경계 대상으로 기록했습니다. 자유인 세 사람은 맞서 싸우지 않고, 연락과 외출의 경계를 먼저 확인합니다.</div>'
      :'';
  const options=host.querySelector('.event-options');if(options)options.innerHTML='';
  $('freedom-first-outing-outcome').innerHTML=`<div class="oc-text up">${choiceId==='call'?'현관에서 식탁까지 통화가 한 번도 끊기지 않았습니다.':'누구에게도 증명하지 않고 약속 장소에 도착했습니다.'} 냄비가 끓는 동안에야 네 사람은 서로의 직업을 웃으며 이야기했습니다.</div>${rescue}${yujinNotice?`<div class="phone-bubble incoming followup"><b>📱 강유진</b><br>${yujinNotice}</div>`:''}<button id="freedom-first-outing-confirm" class="session-btn opening">${S._freedomRevealReturn?'집으로 돌아간다':'첫 모임을 마친다'}</button>`;
  addNews('🏠 자유인 3인조 첫 오프라인 모임 · 연락에서 현실의 약속으로','good');
  $('freedom-first-outing-confirm').addEventListener('click',()=>{
    if(S._freedomRevealReturn){showFreedomRevealHomecoming();return;}
    host.style.display='none';host.innerHTML='';renderLifePanel();autoSave();showNextImportantEvent();
  });
  renderLifePanel();autoSave();
}

function showFreedomPersonalEvent(eventId){
  const event=FREEDOM_TRIO&&FREEDOM_TRIO.personalEvent(eventId),host=$('life-event');
  if(!event||!host){showNextImportantEvent();return;}
  const r=metRecord(S.life,event.name);if(!r){showNextImportantEvent();return;}
  S._freedomPersonalEvent={id:eventId,event,r};
  host.style.display='block';
  host.innerHTML=`<div class="window event-window trio-route-window"><div class="title-bar event-bar"><div class="title-bar-text">${event.icon} ${event.name} 개인 이벤트</div></div><div class="window-body"><img class="life-scene-banner" src="${event.scene}" alt="${event.title} 컷신"><div class="date-profile"><img class="char-thumb" src="${characterPortrait(r)}" alt="${r.name}"><div><strong>${r.name} · ${r.job}</strong><br><span class="muted">${relationTag(S.life,r.name)} · 호감 ${Math.round(r.affection||0)} · 신뢰 ${Math.round(r.trust||0)}</span></div></div><div class="event-title">${event.title}</div><div class="event-desc">${event.desc}</div><div class="event-options">${event.choices.map(choice=>{const poor=choice.cash<0&&S.capital<Math.abs(choice.cash),cost=choice.cash?`<span class="opt-sub">현금 ${choice.cash>0?'+':'-'}${won(Math.abs(choice.cash))}${poor?' · 현금 부족':''}</span>`:'';return`<button class="event-opt" data-freedom-personal="${choice.id}" ${poor?'disabled':''}>${choice.text}${cost}</button>`;}).join('')}</div><div id="freedom-personal-outcome" class="event-outcome"></div></div></div>`;
  host.querySelectorAll('[data-freedom-personal]').forEach(button=>button.addEventListener('click',()=>resolveFreedomPersonalEvent(button.dataset.freedomPersonal)));
}
function resolveFreedomPersonalEvent(choiceId){
  const pending=S._freedomPersonalEvent,host=$('life-event');if(!pending||!host)return;
  const preview=pending.event.choices.find(choice=>choice.id===choiceId);if(!preview)return;
  if(preview.cash<0&&S.capital<Math.abs(preview.cash)){flashToast('💸 현금이 부족합니다','bad');return;}
  const result=FREEDOM_TRIO.applyPersonal(S.life,pending.id,choiceId);if(!result)return;
  if(result.choice.cash)S.capital+=result.choice.cash;
  if(result.choice.happy)S.life.happy=clamp((S.life.happy||0)+result.choice.happy,0,100);
  if(result.choice.stress)S.life.stress=clamp((S.life.stress||0)+result.choice.stress,0,100);
  addBondInteraction(result.r,`personal-${pending.id}`);
  const options=host.querySelector('.event-options');if(options)options.innerHTML='';
  $('freedom-personal-outcome').innerHTML=`<div class="story-dialogue"><b>${result.r.name}</b> “${result.choice.result}”</div><div class="oc-changes">호감 ${result.choice.affection>=0?'+':''}${result.choice.affection||0} · 신뢰 ${result.choice.trust>=0?'+':''}${result.choice.trust||0} · 안식감 ${result.choice.rest>=0?'+':''}${result.choice.rest||0}${result.choice.happy?` · 행복 ${result.choice.happy>0?'+':''}${result.choice.happy}`:''}${result.choice.stress?` · 스트레스 ${result.choice.stress>0?'+':''}${result.choice.stress}`:''}${result.choice.cash?` · 현금 ${result.choice.cash>0?'+':'-'}${won(Math.abs(result.choice.cash))}`:''}</div><button id="freedom-personal-confirm" class="session-btn opening">확인 · 다음 사건 보기</button>`;
  addNews(`${result.event.icon} ${result.event.title} · ${result.choice.text}`,result.choice.tag==='control'?'bad':'good');
  $('freedom-personal-confirm').addEventListener('click',()=>{host.style.display='none';host.innerHTML='';S._freedomPersonalEvent=null;renderCapital();renderLifePanel();autoSave();showNextImportantEvent();});
  renderCapital();renderLifePanel();autoSave();
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
  if (!D.LIFE_EVENTS || Math.random() > LIFE.EVENT_PROB) return false;
  const L = S.life;
  if (L.children && L.children.length && Math.random() < .45) {
    const childEvent = CHILD_EVENTS.make(L);
    if (childEvent) { showLifeEvent(childEvent); return true; }
  }
  const eventPartner=pick(RELATIONSHIPS.consensualMembers(L));
  const ctx = { job:L.job,loan:L.loan,rel:L.relationship,happy:L.happy,stress:L.stress||0,charm:L.charm,affection:L.affection||0,pers:eventPartner&&eventPartner.personality,partnerJob:eventPartner&&eventPartner.job,partnerName:eventPartner&&eventPartner.name,partnerNames:RELATIONSHIPS.names(L),hasLovers:!!(L.lovers&&L.lovers.length),familyPlan:!!L.familyPlan,dangerousTrioLiving:!!(L.dangerousTrioBond&&L.dangerousTrioBond.active),morality:L.morality==null?60:L.morality,guilt:L.guilt||0,makjang:!!L.makjang,hasShark:(L.loans||[]).some(x=>x.illegal),naraeKnown:!!L.tutorialMet,seraKnown:!!metRecord(L,'윤세라'),seraRescueReady:!!(L.seraRescueOrigin&&L.seraRescueOrigin.ready),day:S.day,lastBurnoutEventDay:L.lastBurnoutEventDay };
  const seraIntro = (D.LIFE_EVENTS || []).find(e => e.id === 'life_rainy_canvas');
  if (!ctx.seraKnown && seraIntro && (!seraIntro.cond||seraIntro.cond(ctx)) && Math.random() < 0.32) {
    showLifeEvent(seraIntro);
    return true;
  }
  const jobSpecific = (D.CAREER_EVENTS || []).filter(e => Array.isArray(e.jobs) && e.jobs.includes(L.job) && (!e.cond || e.cond(ctx)));
  if (jobSpecific.length && Math.random() < 0.65) {
    showLifeEvent(pick(jobSpecific));
    return true;
  }
  const pool = (D.LIFE_EVENTS || []).concat(D.ROMANCE_EVENTS || [], D.CAREER_EVENTS || []).filter(e => !e.cond || e.cond(ctx));
  if (pool.length) { showLifeEvent(pick(pool)); return true; }
  return false;
}

function showLifeEvent(ev) {
  const host = $('life-event'); if (!host) return;
  const L = S.life;
  S._curEvent = ev;
  // 연애 사건은 '누구와의' 일인지 얼굴과 말투까지 같이 보여준다
  let who = '';
  const eventPartner=ev.personName&&RELATIONSHIPS.consensualMembers(L).find(person=>person.name===ev.personName)
    ||(ev.cat==='love'?pick(RELATIONSHIPS.consensualMembers(L)):null);
  S._curEventPartnerName=eventPartner&&eventPartner.name;
  if (ev.cat === 'love' && eventPartner) {
    const per = D.PERSONALITIES[eventPartner.personality] || {};
    const prof = ROMANCE.profileOf(eventPartner);
    const record=metRecord(L,eventPartner.name),affection=record&&record.affection!=null?record.affection:L.affection;
    who = `<div class="date-profile">
       <img class="char-thumb" src="${characterPortrait(eventPartner)}" alt="${eventPartner.name}">
       <div class="dp-info"><strong>${eventPartner.name}</strong> · ${eventPartner.job} · ${stageBadge(affection)}<br>
         <span class="muted">${per.emoji || ''}${per.name || ''}${prof ? ` · 🗣️ ${prof.style}` : ''}</span></div>
     </div>`;
  }
  host.style.display = 'block';
  host.innerHTML =
    `<div class="window event-window">
       <div class="title-bar event-bar"><div class="title-bar-text">❗ 사건 발생 · ${EVENT_CAT[ev.cat] || ''}</div></div>
       <div class="window-body">
         <img class="life-scene-banner" src="${ev.scene || lifeSceneImage(ev.cat)}" alt="${EVENT_CAT[ev.cat] || '인생'} 사건 장면">
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
  if (eff.stress != null) { L.stress = clamp((L.stress || 0) + eff.stress, 0, 100); changes.push(`스트레스 ${eff.stress >= 0 ? '+' : ''}${eff.stress}`); }
  if (eff.charm != null) { L.charm = Math.max(0, L.charm + eff.charm); changes.push(`매력 ${eff.charm >= 0 ? '+' : ''}${eff.charm}`); }
  if (eff.affection != null) {
    const members=RELATIONSHIPS.consensualMembers(L),targets=S._curEventPartnerName?members.filter(person=>person.name===S._curEventPartnerName):members;
    targets.forEach(person=>{const record=metRecord(L,person.name);if(record)record.affection=Math.max(0,(record.affection||0)+eff.affection);});
    L.affection=Math.max(0,(L.affection||0)+eff.affection);RELATIONSHIPS.ensure(L);
    changes.push(`친밀도 ${eff.affection >= 0 ? '+' : ''}${eff.affection}`);
  }
  if (eff.morality != null) { changeMorality(eff.morality); changes.push(`도덕성 ${eff.morality >= 0 ? '+' : ''}${eff.morality}`); }
  if (eff.guilt != null) { L.guilt=clamp((L.guilt||0)+eff.guilt,0,100);changes.push(`죄책감 ${eff.guilt>=0?'+':''}${eff.guilt}`); }
  if(eff.outsideFearResolved){
    L.outsideFearResolved=true;
    changes.push('🚪 <b>그날 이후, 현관 앞에서 발이 멈추지 않았습니다</b>');
  }
  if (eff.meetSera && !metRecord(L, '윤세라')) {
    const rec = rememberPerson(Object.assign({}, D.SPECIAL_CHARACTERS.sera), 'friend');
    rec.affection = Math.max(rec.affection || 0, 22);
    rec.trust = Math.max(rec.trust || 0, 12);
    rec.obsession = Math.max(rec.obsession || 0, 55);
    rec.pickedUpAfterRuin=true;
    L.seraIntelHelper=true;
    if(L.seraRescueOrigin)L.seraRescueOrigin.ready=false;
    pushPersonMessage(L, rec, '데려와 줘서 고마워요. 그 세력 사람들, 돈을 옮길 때 같은 길을 써요. 다음에는 내가 먼저 알려줄게요.', false);
    changes.push('🖤 <b>윤세라를 거두고 연락처·세력 정보 조력을 얻음</b>');
    addNews('🖤 경쟁 세력에게 모든 것을 잃은 윤세라를 데려왔습니다', 'good');
  }
  if(eff.seraHousing){
    const trio=DANGEROUS_TRIO&&DANGEROUS_TRIO.ensure(L);
    L.seraHousing=eff.seraHousing;
    if(trio)trio.lockedOut=eff.seraHousing!=='cohabit';
    if(eff.seraHousing==='cohabit'){
      if(window.QT_ROMANCE_ROUTES)QT_ROMANCE_ROUTES.engage(L,'dangerous','sera_cohabit');
      L.seraCohabitingSince=S.day;
      changes.push('🏠 <b>윤세라와 한집에서 살기 시작함</b>');
    }else{
      if(window.QT_ROMANCE_ROUTES)QT_ROMANCE_ROUTES.decline(L,'dangerous',`sera_${eff.seraHousing}`);
      L.seraCohabitingSince=null;
      if(eff.seraHousing==='reject'&&L.seraRescueOrigin)L.seraRescueOrigin.ready=false;
      changes.push('🚪 <b>윤세라에게 따로 지낼 곳을 마련해 줌</b>');
    }
    if(queueYujinInvestigation(eff.seraHousing,L.seraRescueOrigin&&L.seraRescueOrigin.attacker)){
      changes.push('👮‍♀️ <b>피해 자금 수사를 맡은 경찰의 방문 조사 예정</b>');
    }
  }
  if (eff.familyOrigin && !L.familyPlan) {
    const members=RELATIONSHIPS.consensualMembers(L),other=eff.familyOrigin==='affair'&&L.lovers&&L.lovers.length?L.lovers[0].name:(members[0]&&members[0].name);
    const result=FAMILY.startPlan(L,'birth',{origin:eff.familyOrigin,otherParent:other,caregivers:[L.playerName,...RELATIONSHIPS.caregiverNames(L)],secret:!!eff.familySecret});
    if(result.ok)changes.push(`👶 <b>${eff.familyOrigin==='affair'?'혼외자':'혼전임신'} 출산까지 9개월</b>`);
  }
  if (eff.endRelationshipChance && L.relationship !== 'single') {
    const severity=Math.max(5,Math.round(eff.endRelationshipChance*30));
    RELATIONSHIPS.registerConflict(L,severity,'인생 사건으로 인한 관계 갈등',S._curEventPartnerName,S.day);
    changes.push(`⚡ <b class="down">관계 긴장도 +${severity} · 재협상 필요</b>`);
  }
  return changes;
}

function resolveEvent(i) {
  const ev = S._curEvent; if (!ev) return;
  const opt = ev.options[i];
  const changes = applyEventEffects(opt.effects || {});
  if (ev.id === 'life_burnout' || ev.id === 'career_burnout_leave') S.life.lastBurnoutEventDay = S.day;
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
  if (S._monthCloseRandomEvent) {
    S._monthCloseRandomEvent = false;
    if (S.monthCloseContext) S.monthCloseContext.currentRandomEvent = null;
    advanceMonthCloseFlow();
  } else if (S.phase === 'closed' && S.monthCloseContext && S.monthCloseContext.active) {
    renderCurrentMonthCloseStep();
  } else if (S.phase === 'closed' && $('market-close') && $('market-close').style.display === 'block') {
    renderCloseReport(S.day);
  }
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
  if(!['game','study'].includes(id)&&!freeOutingUnlocked(S.life)){showOutsideFearModal();return;}
  if (S.capital < h.cost) { flashToast('💸 현금이 부족합니다', 'bad'); playSound('error'); return; }
  S.capital -= h.cost;
  S.life.happy = clamp(S.life.happy + h.happy, 0, 100);
  S.life.charm += h.charm;
  S.life.hobbiesDone++;
  let careerText = '';
  if (id === 'study') {
    const career = CAREER.train(S.life);
    careerText = ` · 직무 능력 ${Math.round(career.skill)}`;
  }
  if (id === 'gym') HEALTH.exercise(S.life);
  else if (id === 'travel' || id === 'game') HEALTH.rest(S.life);
  flashToast(`${h.emoji} ${h.name}! 행복 +${h.happy}${h.charm ? ` 매력 +${h.charm}` : ''}${careerText}`, 'good');
  checkRelationship(); afterLifeAction('취미');
  if(id==='game'&&FREEDOM_TRIO){
    const guildEventId=FREEDOM_TRIO.playGuild(S.life);
    if(guildEventId){
      const eventHost=$('life-event');
      if(eventHost&&eventHost.style.display==='block')queueImportantEvent({freedomGuildEvent:guildEventId});
      else showFreedomGuildEvent(guildEventId);
    }
  }
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

function lifestylePrestige(L=S.life){
  const goods=L.luxuryGoods||[];
  return goods.reduce((sum,id)=>{const item=(D.LUXURY_GOODS||[]).find(g=>g.id===id);return sum+(item?item.prestige:0);},0)
    +Math.min(25,Math.floor(HOUSING.assetValue(L)/100000000)*3);
}

function investmentMentorState(L=S.life){
  if(!L.investmentMentor||typeof L.investmentMentor!=='object')L.investmentMentor={skill:0,sessions:0,unlocks:[]};
  const state=L.investmentMentor;
  state.skill=clamp(Number(state.skill)||0,0,100);state.sessions=Math.max(0,Math.floor(Number(state.sessions)||0));
  state.escortedSessions=Math.max(0,Math.floor(Number(state.escortedSessions)||0));
  state.unlocks=[];
  if(state.skill>=20)state.unlocks.push('국면 읽기');
  if(state.skill>=45)state.unlocks.push('수급 방향');
  if(state.skill>=70)state.unlocks.push('이슈 조기 감지');
  return state;
}

function investmentInsightHTML(){
  const state=investmentMentorState(),phase=ECONOMY.phase(S.economy);
  if(state.skill<20)return'<div class="asset-empty">이번 달 시장 노트는 아직 비어 있습니다.</div>';
  const lines=[`<div><b>🌐 국면 읽기</b><span>${phase.icon} ${phase.name} 흐름 · 앞으로 약 ${S.economy.monthsLeft}개월</span></div>`];
  if(state.skill>=45){
    const picks=S.stocks.filter(stock=>stock.listed&&stock.type!=='etf').slice().sort((a,b)=>Math.abs(b.trend||0)-Math.abs(a.trend||0)).slice(0,3);
    lines.push(`<div><b>📊 수급 방향</b><span>${picks.map(stock=>`${stock.name} ${stock.trend>=0?'매수 우위':'매도 우위'}`).join(' · ')||'뚜렷한 쏠림 없음'}</span></div>`);
  }
  if(state.skill>=70){
    const watched=S.stocks.filter(stock=>stock.listed&&stock.pendingIssue).slice(0,2);
    lines.push(`<div><b>🔎 이슈 조기 감지</b><span>${watched.length?watched.map(stock=>`${stock.name}에 평소와 다른 움직임`).join(' · '):'현재 뚜렷한 이상 징후 없음'}</span></div>`);
  }
  return`<div class="investment-insights">${lines.join('')}</div>`;
}

function doNaraeConsulting(){
  const cost=500000,state=investmentMentorState(),shutIn=!freeOutingUnlocked(S.life);
  if(S.capital<cost){flashToast('💸 컨설팅 비용 500,000원이 필요합니다','bad');return;}
  S.capital-=cost;state.sessions++;state.skill=clamp(state.skill+12,0,100);
  if(shutIn)state.escortedSessions++;
  const before=new Set(state.unlocks);investmentMentorState();
  const unlocked=state.unlocks.filter(name=>!before.has(name));
  addNews(`📘 나래 투자 컨설팅${shutIn?' · 센터 현장 출석':''} · 투자 감각 ${state.skill>=70?'통찰':state.skill>=45?'분석':state.skill>=20?'기초':'입문'} 단계${unlocked.length?` · ${unlocked.join('·')} 습득`:''}`,'good');
  if(shutIn){
    const host=$('life-event');
    if(host){
      host.style.display='block';
      host.innerHTML=`<div class="window event-window"><div class="title-bar event-bar"><div class="title-bar-text">📘 투자지원센터 · 현장 상담</div></div><div class="window-body"><img class="life-scene-banner" src="./assets/life-guide.png" alt="나래가 센터 입구까지 마중 나온 장면"><div class="date-profile"><img class="char-portrait" src="${characterPortrait(D.SPECIAL_CHARACTERS.narae,'happy')}" alt="나래"><div><strong>나래 · 투자교육 매니저</strong><br><span class="muted">“온라인 변경은 안 된다고 했죠. 그래도 엘리베이터까지는 내려왔네요.”</span></div></div><div class="event-desc">약속 시간이 지나기 전에 나래가 건물 1층까지 찾아왔습니다. 사람 많은 길을 피해서 걷고, 센터에서도 출입문과 가장 가까운 자리를 비워 두었습니다. 차트를 읽는 시간보다 집 밖에 머문 시간이 더 길게 느껴졌습니다.</div><div class="oc-changes">투자 감각 +12${unlocked.length?` · ${unlocked.join(' · ')} 습득`:''} · 나래의 동행 상담 ${state.escortedSessions}회</div><button id="narae-consult-confirm" class="session-btn opening">상담을 마치고 집으로 돌아간다</button></div></div>`;
      $('narae-consult-confirm').addEventListener('click',()=>{host.style.display='none';host.innerHTML='';afterLifeAction('경력');});
      autoSave();return;
    }
  }
  flashToast(unlocked.length?`📘 ${unlocked.join(' · ')}을 배웠습니다`:'📘 시장을 읽는 감각이 늘었습니다','good');
  afterLifeAction('경력');
}

function pixelHomeHTML(L=S.life){
  const home=HOUSING.home(L),goods=L.luxuryGoods||[],tier=home.id==='parents'?'family':home.id==='gosiwon'||home.id==='basement'?'small':['premium','mansion'].includes(home.id)?'luxury':'normal';
  if(L.dangerousTrioBond&&L.dangerousTrioBond.active){
    return `<div class="shared-home-scene" aria-label="위험한 세 사람과 공동생활 중인 자취방"><img class="life-scene-banner" src="./assets/event-trio-meeting-5_2.png" alt="강유진 한채린 윤세라와 자취방에서 맞은 아침"><span>🦂 자취방 공동생활 · 월세 면제 · 이사 잠금</span></div>`;
  }
  const sera=metRecord(L,'윤세라'),seraHere=!!(sera&&L.seraHousing==='cohabit');
  const furniture=[
    '<i class="px-window"></i>','<i class="px-bed"></i>','<i class="px-table"></i>',
    goods.includes('gaming')?'<i class="px-gaming">🖥️</i>':'',
    goods.includes('watch')?'<i class="px-display">⌚</i>':'',
    goods.includes('art')?'<i class="px-art">🖼️</i>':'',
    goods.includes('car')?'<i class="px-car">🏎️</i>':'',
    goods.includes('yacht')?'<i class="px-yacht">🛥️</i>':'',
  ].join('');
  return `<div class="pixel-home ${tier}" aria-label="${home.name} 생활공간"><div class="px-wall"></div><div class="px-floor"></div>${furniture}<i class="px-player">🧍</i>${seraHere?'<i class="px-sera" title="윤세라">🧎‍♀️</i>':''}<span>${home.icon} ${home.name} · ${HOUSING.TENURES[L.housing.tenure].name}${seraHere?' · 윤세라와 동거 중':''}</span></div>`;
}

function showHomeLifeModal(){
  const host=$('life-event'),L=S.life;if(!host)return;
  L.luxuryGoods=Array.isArray(L.luxuryGoods)?L.luxuryGoods:[];
  const indoor=D.HOBBIES.filter(h=>['game','study'].includes(h.id));
  const goods=(D.LUXURY_GOODS||[]).filter(g=>!L.luxuryGoods.includes(g.id));
  const sera=metRecord(L,'윤세라'),seraHere=!!(sera&&L.seraHousing==='cohabit'),trioHere=!!(L.dangerousTrioBond&&L.dangerousTrioBond.active);
  const trioHome=trioHere?`<div class="route-sep">네 사람이 같은 자취방에서 보내는 시간</div><div class="home-action-grid"><button class="life-btn" data-trio-home="late-morning">☕ 비좁은 늦은 아침 <small>행복 +7 · 스트레스 -7 · 체력 +2</small></button><button class="life-btn" data-trio-home="quiet-night">📺 소파에 붙어 조용히 쉰다 <small>행복 +5 · 스트레스 -12 · 체력 +4</small></button><button class="life-btn" data-trio-home="rules">🔑 귀가·동행 규칙을 다시 정한다 <small>공생 안정도 +6 · 집착 -3</small></button></div>`:'';
  const seraHome=seraHere&&!trioHere?`<div class="route-sep">세라와 한집에서 보내는 시간</div><div class="date-profile sera-home-profile"><img class="char-portrait" src="${characterPortrait(sera,'happy')}" alt="집에서 쉬고 있는 윤세라"><div><strong>윤세라 · 동거 중</strong><br><span class="muted">“오늘은 어디 안 가도 되는 거죠? 그러면… 뭘 같이 할지 제가 골라도 돼요?”</span></div></div><div class="home-action-grid"><button class="life-btn" data-act="sera-home" data-sera-home="late-morning">☕ 늦은 아침을 같이 보낸다 <small>행복 +8 · 신뢰 +3 · 집착 +1</small></button><button class="life-btn" data-act="sera-home" data-sera-home="keys">🔑 열쇠와 귀가 약속을 다시 정한다 <small>행복 +5 · 신뢰 +5 · 집착 -4</small></button><button class="life-btn" data-act="sera-home" data-sera-home="studio">🎨 세라의 작업을 옆에서 지켜본다 <small>행복 +6 · 호감 +5</small></button></div>`:'';
  host.style.display='block';
  host.innerHTML=`<div class="window event-window home-life-window"><div class="title-bar event-bar"><div class="title-bar-text">🏠 오늘은 집에서</div><div class="title-bar-controls"><button aria-label="Close" id="home-life-x"></button></div></div><div class="window-body">${pixelHomeHTML(L)}<div class="home-life-summary"><b>${trioHere?'비좁지만 네 사람이 합의한 집':L.luxuryGoods.length?'내 취향이 보이는 공간':'아직 소박한 생활공간'}</b><small>보유품 ${L.luxuryGoods.length}개 · 현재 행복 ${Math.round(L.happy||0)}/100 · 스트레스 ${Math.round(L.stress||0)}/100</small></div><div class="route-sep">이번 주를 집에서 보내기</div><div class="home-action-grid"><button class="life-btn" data-act="rest">🛌 아무 일정 없이 푹 쉰다 <small>${trioHere?'공동생활 휴식 장면':'생활비 30,000 · 스트레스 -22 · 건강 +3'}${seraHere&&!trioHere?' · 세라와 쉬는 방식 선택':''}</small></button><button class="life-btn" data-act="decompress">🌿 휴대폰을 끄고 마음을 정리한다 <small>비용 없음 · 스트레스 -16 · 행복 +3</small></button>${indoor.map(h=>`<button class="life-btn" data-act="hobby" data-id="${h.id}">${h.emoji} ${h.name} <small>${won(h.cost)}</small></button>`).join('')}</div>${trioHome}${seraHome}<div class="route-sep">돈을 번 흔적 남기기 <span class="muted">구매는 자유시간을 쓰지 않음</span></div><div class="luxury-shop">${goods.length?goods.map(g=>`<button data-luxury-buy="${g.id}" ${S.capital<g.price?'disabled':''}><span>${g.emoji}</span><b>${g.name}</b><small>${g.desc}<br>${won(g.price)}원</small></button>`).join(''):'<div class="asset-empty">모든 생활 컬렉션을 갖췄습니다.</div>'}</div><button id="home-life-close" class="session-btn">밖으로 나가기</button></div></div>`;
  wireLifeHub(host);
  host.querySelectorAll('[data-luxury-buy]').forEach(button=>button.addEventListener('click',()=>buyLuxuryGood(button.dataset.luxuryBuy)));
  host.querySelectorAll('[data-trio-home]').forEach(button=>button.addEventListener('click',()=>resolveDangerousTrioHomeMoment(button.dataset.trioHome)));
  const close=()=>{host.style.display='none';host.innerHTML='';};
  $('home-life-x').addEventListener('click',close);$('home-life-close').addEventListener('click',()=>{close();doDate();});
}

const DANGEROUS_TRIO_HOME_MOMENTS={
  'late-morning':{icon:'☕',title:'네 사람 몫의 늦은 아침',scene:'./assets/event-trio-meeting-5_2.png',desc:'작은 탁자에 네 사람 몫의 컵이 겨우 올라갑니다. 유진은 수면 시간을 확인하고, 채린은 더 큰 집 이야기를 꺼냈다가 당신 눈치를 보며 멈추고, 세라는 오늘 아무도 나가지 않는다는 말만 기다립니다.',happy:7,stress:-7,health:2,stability:3,obsession:0},
  'quiet-night':{icon:'📺',title:'누구도 보고하지 않는 밤',scene:'./assets/event-trio-meeting-6.png',desc:'텔레비전 소리만 켜 둔 채 네 사람이 좁은 소파에 붙어 앉았습니다. 유진은 사건 기록을 덮고, 채린은 비서실 전화를 끊고, 세라는 당신이 같은 화면을 보고 있다는 사실만 몇 번이나 확인합니다.',happy:5,stress:-12,health:4,stability:4,obsession:-1},
  rules:{icon:'🔑',title:'열린 문을 위한 규칙',scene:'./assets/event-trio-meeting-7.png',desc:'늦은 귀가를 신고나 추적으로 다루지 않고, 정한 시간까지 기다린 뒤 한 번만 연락하기로 다시 적었습니다. 세 사람 모두 불만스러워했지만 각자의 열쇠를 현관 그릇에 내려놓았습니다.',happy:3,stress:-4,health:0,stability:6,obsession:-3},
};
function resolveDangerousTrioHomeMoment(id){
  if(lifeActionExhausted()){flashToast(`📅 이번 달 자유시간 ${LIFE_ACTIONS_PER_MONTH}회를 모두 사용했습니다`,'neutral');return;}
  const L=S.life,bond=L.dangerousTrioBond,moment=DANGEROUS_TRIO_HOME_MOMENTS[id],host=$('life-event');
  if(!bond||!bond.active||!moment||!host)return;
  L.happy=clamp((L.happy||0)+moment.happy,0,100);L.stress=clamp((L.stress||0)+moment.stress,0,100);L.health=clamp((L.health||0)+moment.health,0,100);
  const state=DANGEROUS_TRIO.ensure(L);state.stability=clamp((state.stability||0)+moment.stability,0,100);
  DANGEROUS_HEROINE_NAMES.forEach(name=>{const r=metRecord(L,name);if(r)r.obsession=clamp((r.obsession||0)+moment.obsession,0,100);});
  addNews(`${moment.icon} 위험한 세 사람과 집에서 보낸 하루 · 체력 ${moment.health>=0?'+':''}${moment.health} · 공생 안정도 +${moment.stability}`,'good');
  host.innerHTML=`<div class="window event-window"><div class="title-bar event-bar"><div class="title-bar-text">${moment.icon} 공동생활 · 자취방</div></div><div class="window-body"><img class="life-scene-banner" src="${moment.scene}" alt="${moment.title}"><div class="event-title">${moment.title}</div><div class="event-desc">${moment.desc}</div><div class="oc-changes">행복 +${moment.happy} · 스트레스 ${moment.stress} · 체력 +${moment.health} · 공생 안정도 +${moment.stability} · 집착 ${moment.obsession}</div><button id="trio-home-confirm" class="session-btn opening">같은 집의 하루를 마친다</button></div></div>`;
  $('trio-home-confirm').addEventListener('click',()=>{host.style.display='none';host.innerHTML='';afterLifeAction('휴식');});
  autoSave();
}

const SERA_HOME_MOMENTS={
  'late-morning':{icon:'☕',title:'늦은 오전, 두 사람 몫의 컵',scene:'./assets/event-sera-shoulder-confession.png',desc:'세라는 먼저 깨어 있었지만 깨우지 않았습니다. 식어 버린 커피를 다시 데우고, 당신이 일어날 때까지 소파 끝에 기대 있었습니다. 오늘만큼은 어디 있었는지 묻는 대신 같은 창밖을 봅니다.',happy:8,stress:-8,affection:4,trust:3,obsession:1,line:'깨울까 봐 몇 번이나 참았어요. 같이 늦잠 자는 것도… 동거하는 사람만 할 수 있는 거네요.'},
  keys:{icon:'🔑',title:'감시가 아니라 돌아올 약속',scene:'./assets/event-sera-lip-confession.png',desc:'서로의 열쇠를 빼앗지 않고, 늦는 날에는 한 줄만 남기기로 정했습니다. 세라는 몇 번이나 예외 상황을 묻다가 마지막에는 열쇠를 현관 그릇에 내려놓았습니다.',happy:5,stress:-5,affection:3,trust:5,obsession:-4,line:'모르는 시간을 견디는 게 약속이라면… 해볼게요. 대신 꼭 돌아온다고 말해줘요.'},
  studio:{icon:'🎨',title:'작업하는 사람의 옆자리',scene:'./assets/event-sera-7.png',desc:'세라는 당신을 그리지 않는 그림을 일부러 꺼냈습니다. 붓을 씻고 색을 고르는 동안 아무 말도 하지 않아도 되는 시간이 이어집니다. 완성된 그림 구석에는 결국 두 사람 몫의 작은 의자가 생겼습니다.',happy:6,stress:-5,affection:5,trust:2,obsession:2,line:'안 보고 있어도 여기 있는 거 알아요. 그게 이렇게 조용할 수 있는 건지 처음 알았어요.'},
};

function resolveSeraHomeMoment(id){
  if(lifeActionExhausted()){flashToast(`📅 이번 달 자유시간 ${LIFE_ACTIONS_PER_MONTH}회를 모두 사용했습니다`,'neutral');return;}
  const L=S.life,r=metRecord(L,'윤세라'),moment=SERA_HOME_MOMENTS[id],host=$('life-event');
  if(!r||L.seraHousing!=='cohabit'||!moment||!host)return;
  L.happy=clamp((L.happy||0)+moment.happy,0,100);L.stress=clamp((L.stress||0)+moment.stress,0,100);
  r.affection=clamp((r.affection||0)+moment.affection,0,100);r.trust=clamp((r.trust||0)+moment.trust,0,100);r.obsession=clamp((r.obsession||0)+moment.obsession,0,100);
  pushPersonMessage(L,r,moment.line,false);
  addNews(`${moment.icon} 윤세라와 집에서 보낸 하루 · 행복 +${moment.happy} · 신뢰 +${moment.trust}`,'good');
  host.innerHTML=`<div class="window event-window"><div class="title-bar event-bar"><div class="title-bar-text">${moment.icon} 윤세라와 집에서</div></div><div class="window-body"><img class="life-scene-banner" src="${moment.scene}" alt="${moment.title}"><div class="event-title">${moment.title}</div><div class="event-desc">${moment.desc}</div><div class="story-dialogue"><b>윤세라</b> “${moment.line}”</div><div class="oc-changes">행복 +${moment.happy} · 스트레스 ${moment.stress} · 호감 +${moment.affection} · 신뢰 +${moment.trust} · 집착 ${moment.obsession>=0?'+':''}${moment.obsession}</div><button id="sera-home-confirm" class="session-btn opening">같은 집의 하루를 마친다</button></div></div>`;
  $('sera-home-confirm').addEventListener('click',()=>{host.style.display='none';host.innerHTML='';afterLifeAction('휴식');});
  autoSave();
}

function incomeWorkOptions(){
  const job=jobOf(),career=CAREER.ensure(S.life),repeat=monthActionCount('수입');
  const fatigue=Math.max(.65,1-repeat*.12);
  const regularMonthly=job.variable?(job.variable[0]+job.variable[1])/2:(job.salary||0);
  const overtimeBase=clamp(Math.round(Math.max(700000,regularMonthly*.42)),700000,3500000);
  const gigBase=clamp(Math.round(550000+(career.skill||0)*20000+(S.life.charm||0)*4000),550000,2500000);
  const dayBase=1000000;
  const scaled=value=>Math.max(100000,Math.round(value*fatigue/10000)*10000);
  return [
    {id:'overtime',icon:job.id==='none'?'🏪':'🧰',name:job.id==='none'?'주말 매장 대타':'본업 추가 근무',pay:scaled(overtimeBase),stress:8,happy:-3,
      desc:job.id==='none'?'급하게 빈 근무표를 메워 확실한 일당을 받습니다.':`${job.name} 경력을 살려 추가 근무나 단기 프로젝트를 맡습니다.`},
    {id:'gig',icon:'💻',name:'온라인 단기 의뢰',pay:scaled(gigBase),stress:5,happy:-1,skill:1,
      desc:'현재 직무 능력과 매력을 활용해 번역·문서·디자인·상담 같은 짧은 의뢰를 처리합니다.'},
    {id:'daywork',icon:'📦',name:'하루 일당 업무',pay:scaled(dayBase),stress:10,happy:-2,
      desc:'행사 설치, 창고 정리, 배달 보조처럼 조건 없이 바로 시작할 수 있는 일을 합니다.'},
  ];
}

function showIncomeWorkModal(){
  const host=$('life-event');if(!host)return;
  const options=incomeWorkOptions(),repeat=monthActionCount('수입');
  host.style.display='block';
  host.innerHTML=`<div class="window event-window income-work-window"><div class="title-bar event-bar"><div class="title-bar-text">💵 이번 주 돈 벌기</div><div class="title-bar-controls"><button aria-label="Close" id="income-work-x"></button></div></div><div class="window-body"><div class="home-life-summary"><b>현재 현금 ${won(S.capital)}원</b><small>이번 달 수입 행동 ${repeat}회 · ${repeat?`반복 피로로 이번 보수 ${Math.round(Math.max(.65,1-repeat*.12)*100)}%`:'첫 수입 행동은 보수 100%'}</small></div><div class="event-desc">자유시간 1회를 사용해 즉시 현금을 받습니다. 초반 자금이 부족할 때 투자금이나 생활비를 직접 마련할 수 있습니다.</div><div class="event-options">${options.map(option=>`<button class="event-opt" data-income-work="${option.id}"><b>${option.icon} ${option.name} · +${won(option.pay)}원</b><span>${option.desc}</span><small>스트레스 +${option.stress}${option.skill?' · 직무 능력 +1':''}</small></button>`).join('')}<button class="event-opt" id="income-work-close">이번 주는 다른 일을 한다</button></div></div></div>`;
  const close=()=>{host.style.display='none';host.innerHTML='';};
  host.querySelectorAll('[data-income-work]').forEach(button=>button.addEventListener('click',()=>resolveIncomeWork(button.dataset.incomeWork)));
  $('income-work-x').addEventListener('click',close);$('income-work-close').addEventListener('click',close);
}

function resolveIncomeWork(id){
  if(lifeActionExhausted()){flashToast(`📅 이번 달 자유시간 ${LIFE_ACTIONS_PER_MONTH}회를 모두 사용했습니다`,'neutral');return;}
  const option=incomeWorkOptions().find(item=>item.id===id);if(!option)return;
  S.capital+=option.pay;
  S.life.stress=clamp((S.life.stress||0)+option.stress,0,100);
  S.life.happy=clamp((S.life.happy||0)+(option.happy||0),0,100);
  if(option.skill){const career=CAREER.ensure(S.life);career.skill=clamp((career.skill||0)+option.skill,0,100);}
  addNews(`${option.icon} ${option.name} 완료 · 현금 +${won(option.pay)}원 · 스트레스 +${option.stress}`,'good');
  flashToast(`${option.icon} +${won(option.pay)}원 · 바로 입금됐습니다`,'good');
  const host=$('life-event');if(host){host.style.display='none';host.innerHTML='';}
  afterLifeAction('수입');
}

function buyLuxuryGood(id){
  const item=(D.LUXURY_GOODS||[]).find(g=>g.id===id),L=S.life;if(!item)return;
  L.luxuryGoods=Array.isArray(L.luxuryGoods)?L.luxuryGoods:[];
  if(L.luxuryGoods.includes(id))return;
  if(S.capital<item.price){flashToast(`💸 ${won(item.price)}원이 필요합니다`,'bad');return;}
  S.capital-=item.price;L.luxuryGoods.push(id);
  SOCIAL.ensure(L).reputation=clamp(SOCIAL.ensure(L).reputation+Math.max(1,Math.round(item.prestige/5)),0,100);
  addNews(`${item.emoji} ${item.name} 구입 · 생활공간에 배치`,'good');flashToast(`${item.emoji} 집에 새 물건이 생겼습니다`,'good');
  renderCapital();renderLifePanel();autoSave();showHomeLifeModal();
}

function doRestMonth() {
  if(S.life.dangerousTrioBond&&S.life.dangerousTrioBond.active){resolveDangerousTrioHomeMoment('quiet-night');return;}
  const sera=metRecord(S.life,'윤세라');
  if(sera&&S.life.seraHousing==='cohabit'){showSeraRestModal(sera);return;}
  S.capital -= Math.min(Math.max(0,S.capital),30000);
  HEALTH.rest(S.life); flashToast('🛌 푹 쉬었습니다 · 스트레스 -22 · 건강 +3', 'good'); afterLifeAction('휴식');
}
function showSeraRestModal(sera){
  const host=$('life-event');if(!host)return;
  host.style.display='block';
  host.innerHTML=`<div class="window event-window"><div class="title-bar event-bar"><div class="title-bar-text">🛌 윤세라와 쉬는 밤</div><div class="title-bar-controls"><button aria-label="Close" id="sera-rest-x"></button></div></div><div class="window-body"><img class="life-scene-banner" src="./assets/event-sera-shoulder-confession.png" alt="소파에서 어깨를 맞대고 쉬는 윤세라"><div class="event-title">세라는 불을 끈 뒤에도 현관과 휴대전화를 번갈아 봅니다.</div><div class="event-desc">“그냥 자도 돼요. 제가 보고 있을게요.” 안심시키는 말인지, 감시하겠다는 말인지 구분하기 어렵습니다. 이번 밤의 규칙을 정할 수 있습니다.</div><div class="event-options"><button class="event-opt" data-sera-rest="open"><b>🌅 휴대전화를 엎어 두고 같은 소파에서 쉰다</b><span>서로 깨어 있는지 확인하지 않고 아침까지 기다립니다.</span><small>행복 +8 · 신뢰 +5 · 집착 -4</small></button><button class="event-opt hot" data-sera-rest="locked"><b>🔐 오늘만 같이 문을 잠그자고 한다</b><span>세라가 하려던 말을 당신이 먼저 꺼냅니다.</span><small>행복 +10 · 호감 +6 · 상호집착 +1</small></button><button class="event-opt" data-sera-rest="alone"><b>🚪 오늘은 각자 방에서 쉬자고 한다</b><span>혼자 있을 시간도 동거의 약속에 포함시킵니다.</span><small>행복 -3 · 신뢰 +2 · 집착 +4</small></button></div></div></div>`;
  const close=()=>{host.style.display='none';host.innerHTML='';showHomeLifeModal();};
  $('sera-rest-x').addEventListener('click',close);
  host.querySelectorAll('[data-sera-rest]').forEach(button=>button.addEventListener('click',()=>resolveSeraRest(sera,button.dataset.seraRest)));
}
function resolveSeraRest(sera,choice){
  const L=S.life,host=$('life-event');if(!host)return;
  const outcomes={
    open:{happy:8,affection:3,trust:5,obsession:-4,text:'세라는 몇 번이나 눈을 떴지만 당신의 휴대전화에는 손대지 않았습니다. 아침에 당신이 먼저 이름을 부르자 그제야 어깨의 힘을 풉니다.',line:'안 확인해도 돌아와 있었네요. 다음에도… 한 번쯤은 기다려볼게요.'},
    locked:{happy:10,affection:6,trust:3,obsession:5,mutual:1,text:'당신이 안쪽 잠금장치를 먼저 걸자 세라가 당황해 손을 멈춥니다. 누가 누구를 붙잡았는지 따지지 않은 채 같은 침묵 속에서 잠이 듭니다.',line:'잠깐만요. 왜 당신이 먼저 그래요? 이러면 제가 말려야 하는 쪽이잖아요.'},
    alone:{happy:-3,affection:-2,trust:2,obsession:4,text:'세라는 닫힌 방문 앞에 한참 앉아 있었지만 열쇠를 쓰지는 않았습니다. 혼자 쉬는 데 성공했어도, 문 아래의 그림자는 새벽까지 사라지지 않습니다.',line:'들어가진 않을게요. 대신 여기 있는 것까지 싫다고 하지는 말아줘요.'},
  };
  const out=outcomes[choice];if(!out)return;
  S.capital-=Math.min(Math.max(0,S.capital),30000);HEALTH.rest(L);
  L.happy=clamp((L.happy||0)+out.happy,0,100);sera.affection=clamp((sera.affection||0)+out.affection,0,100);sera.trust=clamp((sera.trust||0)+out.trust,0,100);sera.obsession=clamp((sera.obsession||0)+out.obsession,0,100);
  if(out.mutual)sera.mutualObsession=(sera.mutualObsession||0)+out.mutual;
  pushPersonMessage(L,sera,out.line,false);
  addNews(`🛌 윤세라와 동거 휴식 · 행복 ${out.happy>=0?'+':''}${out.happy} · 집착 ${out.obsession>=0?'+':''}${out.obsession}`,'neutral');
  host.innerHTML=`<div class="window event-window"><div class="title-bar event-bar"><div class="title-bar-text">🌙 같은 집에서 맞은 아침</div></div><div class="window-body"><img class="life-scene-banner" src="./assets/event-sera-shoulder-confession.png" alt="윤세라와 함께 쉰 다음 날 아침"><div class="event-desc">${out.text}</div><div class="story-dialogue"><b>윤세라</b> “${out.line}”</div><div class="oc-changes">스트레스 -22 · 건강 +3 · 행복 ${out.happy>=0?'+':''}${out.happy} · 호감 ${out.affection>=0?'+':''}${out.affection} · 신뢰 +${out.trust} · 집착 ${out.obsession>=0?'+':''}${out.obsession}${out.mutual?' · 상호집착 +1':''}</div><button id="sera-rest-confirm" class="session-btn opening">아침 일정을 시작한다</button></div></div>`;
  $('sera-rest-confirm').addEventListener('click',()=>{host.style.display='none';host.innerHTML='';afterLifeAction('휴식');});
  autoSave();
}
function doDecompressMonth() {
  HEALTH.decompress(S.life);S.life.happy=clamp((S.life.happy||0)+3,0,100);
  flashToast('🌿 휴대폰을 끄고 쉬었습니다 · 스트레스 -16 · 행복 +3','good');afterLifeAction('휴식');
}

function doFamilyPlan(method) {
  const L=S.life,group=RELATIONSHIPS.ensure(L).relationshipGroup,members=RELATIONSHIPS.consensualMembers(L);
  if (!members.length||!group.agreement.cohabiting) { flashToast('🏠 관계 구성원과 공동생활 합의가 먼저 필요합니다', 'neutral'); return; }
  if(group.stability<35||group.tension>=75){flashToast('⚡ 현재 관계 긴장도가 높아 공동양육 합의를 시작할 수 없습니다','bad');return;}
  if (!HOUSING.canAddChild(S.life)) { flashToast(`🏠 ${HOUSING.home(S.life).name}에는 가족이 더 살 공간이 없습니다`, 'bad'); return; }
  const preview = method === 'adopt' ? 12000000 : 5000000;
  if (S.capital < preview) { flashToast(`💸 초기 비용 ${won(preview)}원 부족`, 'bad'); return; }
  const result = FAMILY.startPlan(L, method,{origin:'family_agreement',caregivers:[L.playerName,...RELATIONSHIPS.caregiverNames(L)]});
  if (!result.ok) { flashToast(result.message, 'neutral'); return; }
  S.capital -= result.plan.cost;
  addNews(`👶 ${result.plan.method} 가족 계획 시작 · ${result.plan.months}개월 후`, 'good');
  flashToast(`👶 ${result.plan.method} 계획을 시작했습니다`, 'good'); afterLifeAction('가족');
}

function doRelationshipPublicity(mode){
  const L=S.life,result=RELATIONSHIPS.setPublicity(L,mode,S.day);if(!result)return;
  const social=SOCIAL.ensure(L);social.reputation=clamp(social.reputation+(result.reputationDelta||0),0,100);
  const names=RELATIONSHIPS.summary(L);
  addNews(mode==='public'?`📣 ${names}님과 관계를 당사자 합의로 공개했습니다`:`🔒 ${names}님과 관계를 비공개 합의로 전환했습니다`,mode==='public'?'good':'neutral');
  flashToast(mode==='public'?'📣 관계를 직접 공개했습니다':'🔒 관계를 비공개로 전환했습니다',mode==='public'?'good':'neutral');
  renderLifePanel();autoSave();if(S.phase==='closed'&&$('market-close')&&$('market-close').style.display==='block')renderCloseReport(S.day);
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

function doCertification(id) {
  const cert=CAREER.CERTS.find(x=>x.id===id);if(!cert)return;
  if(CAREER.ensure(S.life).certifications.includes(id)){flashToast('이미 보유한 자격입니다','neutral');return;}
  if(S.capital<cert.cost){flashToast(`💸 응시·교육비 ${won(cert.cost)}원 부족`,'bad');return;}
  S.capital-=cert.cost;CAREER.certify(S.life,id);addNews(`${cert.icon} ${cert.name} 자격 취득`,'good');
  flashToast(`${cert.icon} ${cert.name} 취득!`,'good');afterLifeAction('경력');
}

function doMoveHousing(id,tenure) {
  if(S.life.dangerousTrioBond&&S.life.dangerousTrioBond.active){
    flashToast('🦂 세 사람과 정한 공동생활 거점은 자취방으로 고정되어 있습니다','neutral');return;
  }
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
function showIndustryGatherings(){
  const host=$('life-event');if(!host||!SOCIAL)return;
  const social=SOCIAL.ensure(S.life),introduced=BUSINESS_ROMANCE?BUSINESS_ROMANCE.ensure(S.life).staff:{};
  const businessAccess=BUSINESS_ROMANCE&&BUSINESS_ROMANCE.chaerinAccess(S.life);
  const naraeGuide=social.industry.meetings===0
    ?'“사교모임은 비싼 사람을 바로 만나는 곳이 아니에요. 처음 두어 번은 누가 누구에게 먼저 인사하고, 어떤 명함을 끝까지 남기는지만 보세요.”'
    :social.industry.meetings===1
      ?'“오늘은 이름을 팔려고 하지 말고 지난번에 본 얼굴 하나만 기억해 보세요. 인맥은 명함 수보다 다시 알아보는 데서 시작해요.”'
      :social.industry.meetings===2
        ?'“이제 분위기는 알겠죠? 다음부터는 모임이 끝나도 바로 가지 마세요. 제가 따로 부르면 이유 묻지 말고 따라와요.”'
        :'“아는 얼굴이 생겼으면 이제 누가 자리를 만들고 누가 사람을 시험하는지도 보일 거예요. 끝난 뒤 제 신호도 놓치지 말고요.”';
  host.style.display='block';
  host.innerHTML=`<div class="window event-window resume-window"><div class="title-bar event-bar"><div class="title-bar-text">🥂 사교 모임 · 업계 소개</div><div class="title-bar-controls"><button aria-label="Close" id="industry-gathering-x"></button></div></div><div class="window-body"><div class="date-profile"><img class="char-thumb" src="${characterPortrait(D.SPECIAL_CHARACTERS.narae,'neutral')}" alt="나래"><div><strong>나래 · 인맥 수업</strong><br><span class="muted">${naraeGuide}</span></div></div><div class="event-desc">처음에는 공개 네트워킹에서 얼굴과 분위기를 익히고, 다시 불리는 횟수가 늘수록 더 안쪽의 자리가 열립니다.</div>${businessAccess?'':'<div class="important-event-detail">특별 책임자들은 한채린의 업계 인맥입니다. 채린과 친구 이상이 되기 전에는 같은 모임에 참석해도 정식 소개까지 이어지지 않습니다.</div>'}<div class="date-glance"><span>사회 평판 ${Math.round(social.reputation)}</span><span>사교 실적 ${social.industry.standing}</span><span>참석 ${social.industry.meetings}회</span><span>아는 얼굴 ${Object.values(introduced).filter(item=>item.introduced).length}/4명</span></div><div class="resume-grid">${SOCIAL.INDUSTRY_GATHERINGS.map(g=>{const status=SOCIAL.gatheringStatus(S.life,g.id),remaining=g.candidates.filter(id=>!introduced[id]||!introduced[id].introduced),hints=businessAccess?remaining.map(id=>{const p=BUSINESS_ROMANCE&&BUSINESS_ROMANCE.profile(id);return p?`${p.rivalFirm} ${p.role}`:'업계 인물';}).join(' · '):g.candidates.length?'한채린의 소개가 있어야 이름이 공개됩니다':'';return`<button class="resume-card" data-industry-gathering="${g.id}" ${status.available&&S.capital>=g.cost?'':'disabled'}><span>${g.icon}</span><b>${g.name} · ${g.tier}등급</b><small>${g.desc}</small><em>${hints||'익숙한 얼굴들이 모이는 자리'}</em><strong>${won(g.cost)}${!status.available?` · ${status.reason}`:S.capital<g.cost?' · 현금 부족':''}</strong></button>`;}).join('')}</div><button id="industry-gathering-close" class="session-btn">이번 달은 참가하지 않는다</button></div></div>`;
  const close=()=>{host.style.display='none';host.innerHTML='';};
  host.querySelectorAll('[data-industry-gathering]').forEach(button=>button.addEventListener('click',()=>attendIndustryGathering(button.dataset.industryGathering)));
  $('industry-gathering-x').addEventListener('click',close);$('industry-gathering-close').addEventListener('click',close);
}
function attendIndustryGathering(id){
  const gathering=SOCIAL.INDUSTRY_GATHERINGS.find(item=>item.id===id);if(!gathering)return;
  if(S.capital<gathering.cost){flashToast(`💸 참가비 ${won(gathering.cost)}원이 필요합니다`,'bad');return;}
  const result=SOCIAL.attendIndustry(S.life,id);
  if(!result.ok){flashToast(result.message,'neutral');return;}
  S.capital-=gathering.cost;
  let message=`${gathering.icon} ${gathering.name} 참가 · 사교 실적 ${result.standing}`;
  if(result.introduced&&BUSINESS_ROMANCE){
    const person=BUSINESS_ROMANCE.introduce(S.life,result.introduced);
    message=`${person.emoji} ${person.name} 소개 · ${person.rivalFirm} ${person.role}`;
    addNews(`${message} · 자산·사업 관리실에서 특별 책임자 계약 가능`,'good');
  }else if(result.chaerinRequired){
    message='모임 안쪽에서 얼굴을 가린 책임자들을 봤지만 한채린의 소개가 없어 명함은 받지 못했습니다';
    addNews(`🥂 ${message}`,'neutral');
  }else addNews(message,'good');
  flashToast(result.introduced?`새 업계 인물을 소개받았습니다: ${BUSINESS_ROMANCE.identity(S.life,result.introduced).displayName}`:message,result.chaerinRequired?'neutral':'good');
  const host=$('life-event');if(host){host.style.display='none';host.innerHTML='';}
  const chaerin=metRecord(S.life,'한채린');
  if(!chaerin&&gathering.tier>=1&&SOCIAL.ensure(S.life).industry.meetings>=3&&S.life.chaerinLeadLastDay!==S.day){
    showNaraeChaerinLead(gathering,result.introduced);
    return;
  }
  if(chaerin&&chaerin.chaerinContractTorn&&!hasPersonalContact(chaerin)&&!chaerin.chaerinRouteClosed&&chaerin.lastSpecialFollowupDay!==S.day){
    showChaerinGatheringFollowup(D.SPECIAL_CHARACTERS.chaerin,chaerin,gathering);
    return;
  }
  afterLifeAction('인맥');
}

function showNaraeChaerinLead(gathering,introducedId){
  const host=$('life-event');if(!host)return;
  S.life.chaerinLeadLastDay=S.day;
  S._chaerinLead={gathering,introducedId};
  host.style.display='block';
  host.innerHTML=`<div class="window event-window"><div class="title-bar event-bar"><div class="title-bar-text">📘 나래의 인맥 수업 · 끝난 뒤의 초대</div><div class="title-bar-controls"><button aria-label="Close" id="chaerin-lead-x"></button></div></div><div class="window-body"><div class="date-profile"><img class="char-thumb" src="${characterPortrait(D.SPECIAL_CHARACTERS.narae,'neutral')}" alt="나래"><div><strong>나래</strong><br><span class="muted">“오늘은 명함보다 사람 보는 법을 배울 차례예요.”</span></div></div><div class="event-desc">모임이 끝나자 나래는 로비가 아니라 전용 엘리베이터 쪽으로 걷습니다. 방금까지 당신을 없는 사람 취급하던 참석자 몇 명이 그쪽을 보고 먼저 길을 비킵니다.</div><div class="story-dialogue"><b>나래</b> “위층에 업계에서 유명한 ‘신입 털이’가 있어요. 말려들지 말고 구경만 하려면 지금 따라와요. 싫으면 오늘 배운 것만 챙겨서 돌아가도 되고요.”</div><div class="event-options"><button class="event-opt opening" id="chaerin-lead-follow"><b>나래를 따라 전용 엘리베이터에 탄다</b><span>이름이 공개되지 않은 후원자의 자리를 구경합니다.</span></button><button class="event-opt" id="chaerin-lead-leave"><b>오늘은 여기까지 하고 돌아간다</b><span>다음 사교모임에서 다시 기회를 기다립니다.</span></button></div></div></div>`;
  const leave=()=>{host.style.display='none';host.innerHTML='';S._chaerinLead=null;afterLifeAction('인맥');};
  $('chaerin-lead-follow').addEventListener('click',()=>showChaerinIndustryEncounter(gathering,introducedId));
  [$('chaerin-lead-x'),$('chaerin-lead-leave')].forEach(button=>button.addEventListener('click',leave));
  autoSave();
}

function showChaerinIndustryEncounter(gathering,introducedId){
  const host=$('life-event'),c=D.SPECIAL_CHARACTERS&&D.SPECIAL_CHARACTERS.chaerin;if(!host||!c)return;
  const sera=metRecord(S.life,'윤세라'),yujin=metRecord(S.life,'강유진'),seraAtHome=!!(sera&&S.life.seraHousing==='cohabit');
  S._chaerinIndustry={c,gathering,introducedId,sera,yujin,seraAtHome};
  const caseLink=sera&&yujin
    ?'<div class="hub-note bad-friends-note"><b>같은 차명계좌를 보는 세 사람</b><br>유진이 건넨 수사 자료에는 한채린 계열 경호사의 이름이, 세라가 보관한 원본 장부에는 그 회사가 피해자 동선을 사들인 기록이 남아 있습니다. 아직 셋은 한자리에 모이지 않았지만 같은 사건의 서로 다른 끝을 잡고 있습니다.</div>'
    :sera
      ?'<div class="hub-note bad-friends-note"><b>윤세라가 알아본 문장</b><br>초대장 하단의 계열사 로고를 본 세라가 “저 회사가 예전에 피해자 주소를 샀어요. 저 여자는 모른 척할 수도 있고, 정말 모를 수도 있어요”라는 메시지를 보냈습니다.</div>'
      :yujin
        ?'<div class="hub-note bad-friends-note"><b>강유진의 수사 메모</b><br>유진의 차명계좌 수사 메모에서 본 계열사 이름이 행사 후원사 명단에도 적혀 있습니다. 채린은 당신이 그 이름을 알아봤다는 사실부터 눈치챘습니다.</div>'
        :'';
  host.style.display='block';
  host.innerHTML=`<div class="window event-window chaerin-industry-window"><div class="title-bar event-bar"><div class="title-bar-text">👑 ${gathering.name} · 신입을 구경하는 사람</div></div><div class="window-body"><img class="life-scene-banner" src="./assets/event-chaerin-contract.png" alt="사교모임의 후원자로 나타난 한채린"><div class="event-title">위층에서 당신은 순식간에 모임의 구경거리가 됐습니다.</div><div class="event-desc">나래가 잠시 자리를 비운 사이, 업계에서 신입을 골라내기로 유명한 참석자들이 실적과 집안과 자산을 번갈아 묻습니다. 제대로 답할 틈도 없이 웃음이 번집니다. 그때 한채린이 잔을 든 채 다가와 그들을 먼저 비웃습니다.</div>${caseLink}<div class="story-dialogue"><b>한채린</b> “그 질문에 답한다고 여기 사람이 되는 줄 알았어? 정말 순진하네. 그래도 저 사람들보다 네 표정이 더 재미있으니까, 잠깐 빌려갈게.”</div><div class="event-desc">채린은 당신을 구해준 사람처럼 보이지만, 호의가 아니라 새 장난감을 발견한 얼굴입니다. 인사도 받지 않은 채 전용 엘리베이터를 가리킵니다.</div><div class="event-options"><button class="event-opt opening" id="chaerin-elevator-next">한채린을 따라 엘리베이터에 탄다</button><button class="event-opt" id="chaerin-elevator-leave">나래를 기다리겠다며 돌아선다</button></div></div></div>`;
  $('chaerin-elevator-next').addEventListener('click',showChaerinElevatorProposal);
  $('chaerin-elevator-leave').addEventListener('click',()=>{host.style.display='none';host.innerHTML='';S._chaerinIndustry=null;S._chaerinLead=null;afterLifeAction('인맥');});
}

function showChaerinElevatorProposal(){
  const pending=S._chaerinIndustry,host=$('life-event');if(!pending||!host)return;
  host.innerHTML=`<div class="window event-window chaerin-industry-window"><div class="title-bar event-bar"><div class="title-bar-text">👑 한채린 · 내려가는 엘리베이터</div></div><div class="window-body"><img class="life-scene-banner" src="./assets/event-chaerin-2.png" alt="엘리베이터 문 사이로 제안을 건네는 한채린"><div class="event-title">문이 닫히기 직전, 채린이 계약서 한 장을 내밉니다.</div><div class="event-desc">내용은 후원처럼 보이지만 당신의 투자 계좌와 일정, 만나는 사람까지 비서실에 보고하는 조건입니다. 채린은 펜을 건네면서 이미 대답을 알고 있다는 듯 웃습니다.</div><div class="story-dialogue"><b>한채린</b> “서명하면 방금 너를 웃음거리로 만든 사람들은 다시는 네 이름도 못 불러. 이런 기회는 두 번 설명 안 해.”</div><div class="event-options"><button class="event-opt" data-chaerin-first="accept"><b>계약을 받아들인다</b><span>지금의 모욕을 끝내기 위해 채린의 보호를 택합니다.</span></button><button class="event-opt" data-chaerin-first="polite"><b>고맙지만 어렵다며 정중하게 돌려준다</b><span>예의를 지킨 채 조건을 거절합니다.</span></button><button class="event-opt opening" data-chaerin-first="tear"><b>계약서를 읽은 자리에서 찢는다</b><span>보호도 평가도 필요 없다고 말합니다.</span></button></div><div id="chaerin-industry-outcome" class="event-outcome"></div></div></div>`;
  host.querySelectorAll('[data-chaerin-first]').forEach(button=>button.addEventListener('click',()=>resolveChaerinIndustryEncounter(button.dataset.chaerinFirst)));
}

function resolveChaerinIndustryEncounter(choice){
  const pending=S._chaerinIndustry,host=$('life-event');if(!pending||!host)return;
  const outcomes={
    accept:{line:'정말 서명하네. 미안하지만 이제 재미없어졌어. 그 계약은 효력 없으니까 들고 꺼져.',text:'채린은 서명한 종이를 돌려주고 엘리베이터의 닫힘 버튼을 누릅니다. 이름도 연락처도 남지 않았습니다.',tone:'neutral'},
    polite:{line:'거절까지 남이 가르쳐준 말처럼 하네. 그 정도 예의는 아래층에서 실컷 봤어.',text:'채린은 계약서를 받자마자 코웃음을 칩니다. 엘리베이터 문이 닫히고, 둘 사이에는 아무 인연도 생기지 않았습니다.',tone:'neutral'},
    tear:{line:'…그걸 찢어? 내 앞에서? 좋아. 화가 풀릴 때까지 몇 번은 데리고 다녀야겠네.',text:'채린은 처음으로 웃음을 거두고 찢어진 조각을 직접 주워 담습니다. 수행원이 아니라 자기 번호가 없는 비서실 카드 한 장만 바닥에 내려놓습니다.',tone:'good'},
  };
  const outcome=outcomes[choice]||outcomes.polite;
  let rec=null;
  S.life.chaerinEncounterAttempts=(S.life.chaerinEncounterAttempts||0)+1;
  if(choice==='tear'){
    rec=rememberPerson(pending.c,'acquaintance');
    rec.affection=Math.max(rec.affection||0,12);rec.trust=Math.max(rec.trust||0,4);
    rec.dangerLevel=clamp((rec.dangerLevel||0)+8,0,100);
    rec.secretaryContact=true;rec.contactChannel='비서실 카드';rec.specialFollowupInterest='open';
    rec.lastSpecialFollowupDay=S.day;rec.chaerinFirstOrigin='narae-industry-tutorial';rec.chaerinFirstAnswer=choice;
    rec.chaerinContractTorn=true;rec.chaerinDefiance=(rec.chaerinDefiance||0)+3;
    addBondInteraction(rec,'torn-contract');
    if(CHAR_TRAITS)CHAR_TRAITS.change(rec,14);
    addNews(`👑 한채린의 계약서를 찢었습니다 · 다음 사교모임에 비서실 카드가 다시 도착합니다`,'good');
  }else{
    S.life.chaerinLastRejectedProposal=choice;
    addNews(`🥂 한채린의 이름도 듣지 못한 채 엘리베이터에서 헤어졌습니다`,'neutral');
  }
  const options=host.querySelector('.event-options');if(options)options.innerHTML='';
  $('chaerin-industry-outcome').innerHTML=`${choice==='tear'?'<img class="life-scene-banner" src="./assets/event-chaerin-1.png" alt="찢어진 계약서를 사이에 둔 한채린">':''}<div class="story-dialogue"><b>한채린</b> “${outcome.line}”</div><div class="event-desc">${outcome.text}</div><button id="chaerin-industry-confirm" class="session-btn opening">${choice==='tear'?'찢어진 조각을 남겨두고 나온다':'다음 층에서 내린다'}</button>`;
  $('chaerin-industry-confirm').addEventListener('click',()=>{
    host.style.display='none';host.innerHTML='';S._chaerinIndustry=null;S._chaerinLead=null;
    afterLifeAction('인맥');
  });
  autoSave();
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

function showOriginAllyPlacement(contactId){
  const contact=(SOCIAL.ensure(S.life).contacts||[]).find(c=>c.id===contactId),npc=contact&&(D.WORLD_MALE_NPCS||[]).find(n=>n.id===contact.worldNpcId),host=$('life-event');
  if(!contact||!npc||!host||contact.recruitedTo)return;
  const faction=RIVALS.ensureFaction(S.life),businesses=BUSINESS?BUSINESS.ensure(S.life).owned:[];
  host.style.display='block';
  host.innerHTML=`<div class="window event-window"><div class="title-bar event-bar"><div class="title-bar-text">🎒 ${contact.name}에게 함께하자고 말하기</div><div class="title-bar-controls"><button aria-label="Close" id="origin-ally-x"></button></div></div><div class="window-body"><div class="date-profile"><img class="char-portrait" src="./assets/characters/${npc.portrait}" alt="${npc.name}"><div><strong>${npc.name} · ${contact.relationLabel}</strong><br><span class="muted">${npc.job} · 영입비 0원</span></div></div><div class="story-dialogue"><b>${npc.name}</b> “우리가 언제 계약서 보고 친구 했냐. 내가 필요한 자리를 말해.”</div><div class="event-options">${faction.level&&faction.members.length<faction.capacity?`<button class="event-opt" data-origin-ally="faction">🛡️ ${faction.name}에 합류시킨다<span class="opt-sub">영입비 0원 · 기존 전문 능력과 월 수입 적용</span></button>`:''}${businesses.map(item=>{const type=BUSINESS.typeOf(item.typeId);return`<button class="event-opt" data-origin-ally="business" data-business="${item.id}">${type.icon} ${type.name}에 합류시킨다<span class="opt-sub">영입비 0원 · 직원 1명과 사기 보너스</span></button>`;}).join('')}${!faction.level&&!businesses.length?'<div class="asset-empty">세력을 만들거나 사업체를 시작한 뒤 다시 부를 수 있습니다.</div>':''}<button class="event-opt" id="origin-ally-close">아직은 각자 자리에서 지낸다</button></div></div></div>`;
  host.querySelectorAll('[data-origin-ally]').forEach(button=>button.addEventListener('click',()=>placeOriginAlly(contact,npc,button.dataset.originAlly,button.dataset.business)));
  const close=()=>{host.style.display='none';host.innerHTML='';};$('origin-ally-x').addEventListener('click',close);$('origin-ally-close').addEventListener('click',close);
}

function placeOriginAlly(contact,npc,kind,businessId){
  if(contact.recruitedTo)return;
  if(kind==='business'){
    const item=BUSINESS&&BUSINESS.owned(S.life,businessId);
    if(!item||item.employees>=BUSINESS.staffCapacity(item)){flashToast('해당 사업체의 정원이 부족합니다','bad');return;}
    item.employees++;item.morale=clamp(item.morale+8,0,100);item.hiredStaff=item.hiredStaff||[];item.hiredStaff.push(`origin-${npc.id}`);
    contact.recruitedTo=`business:${item.id}`;
    addNews(`🎒 소꿉친구 ${npc.name}, ${BUSINESS.typeOf(item.typeId).name} 합류 · 영입비 0원`,'good');
  }else{
    const faction=RIVALS.ensureFaction(S.life);
    if(!faction.level||faction.members.length>=faction.capacity){flashToast('세력 정원이 부족합니다','bad');return;}
    faction.mobCounter=(faction.mobCounter||0)+1;
    faction.members.push({uid:`origin-${npc.id}`,sourceId:`origin-${npc.id}`,name:npc.name,role:npc.role,portrait:npc.portrait,loyalty:92,upkeep:0,stats:{...(npc.stats||{})},named:true,desc:`영입비와 급여를 요구하지 않는 ${contact.relationLabel}`,injuredMonths:0});
    RIVALS.ensureFaction(S.life);contact.recruitedTo='faction';
    addNews(`🎒 소꿉친구 ${npc.name}, ${faction.name} 합류 · 영입비 0원`,'good');
  }
  const host=$('life-event');if(host){host.style.display='none';host.innerHTML='';}flashToast(`🤝 ${npc.name}이 대가 없이 합류했습니다`,'good');renderLifePanel();autoSave();
}
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
  const retiredHeroines=new Set(['하은','수아','다은','혜진','아린']);
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
  if(L.relationshipGroup&&Array.isArray(L.relationshipGroup.members)){
    L.relationshipGroup.members.forEach(member=>{if(member&&renames[member.name])member.name=renames[member.name];});
    L.relationshipGroup.members=L.relationshipGroup.members.filter(member=>!retiredHeroines.has(typeof member==='string'?member:member&&member.name));
  }
  if(L.relationshipGroup&&renames[L.relationshipGroup.spouseName])L.relationshipGroup.spouseName=renames[L.relationshipGroup.spouseName];
  if(L.relationshipGroup&&retiredHeroines.has(L.relationshipGroup.spouseName))L.relationshipGroup.spouseName=null;
  fix(L.partner);
  if(L.partner&&retiredHeroines.has(L.partner.name)){L.partner=null;L.relationship='single';}
  L.lovers = (L.lovers || []).map(fix).filter(x => !retiredHeroines.has(x.name)&&(!L.partner || x.name !== L.partner.name));
  L.met = L.met.map(fix).filter(person=>!retiredHeroines.has(person.name));
  L.met.forEach(m=>{if(['강유진','한채린'].includes(m.name)){m.obsession=0;m.obsessionGrowth=0;}});
  (L.memories || []).forEach(m => { if (m && renames[m.name]) m.name = renames[m.name]; });
  // 명부가 없던 세이브 — 지금 만나고 있는 사람들부터 채워 넣는다
  const seed = (p, status) => {
    if (!p || L.met.some(m => m.name === p.name)) return;
    L.met.push(Object.assign({ affection: 0, dates: 0, firstDay: S.day, lastDay: S.day }, p, { status }));
  };
  seed(L.partner, 'partner');
  (L.lovers || []).forEach(x => seed(x, 'lover'));
  RELATIONSHIPS.ensure(L);
}

/* ---- 만난 사람 기억(인간관계 명부) ----
 * 한 번 만난 사람의 기록은 남지만, 전 연인은 플레이어가 차단한 연락처로 분리한다. */
function ensureMet(L) { if (!Array.isArray(L.met)) L.met = []; return L.met; }
function metRecord(L, name) { return ensureMet(L).find(m => m.name === name); }

const CONTACT_RULES={affection:12,trust:6,interactions:2,months:1};
const COURTSHIP_RULES={affection:15,trust:8,interactions:3,months:1};
function establishedContactStatus(status){return['partner','lover','casual','polycule'].includes(status);}
function ensureCourtship(rec){
  if(!rec)return rec;
  if(!Number.isFinite(rec.firstDay))rec.firstDay=S.day;
  if(!Number.isFinite(rec.interactions)){
    const established=establishedContactStatus(rec.status);
    rec.interactions=established?Math.max(3,rec.dates||0):Math.max(0,rec.dates||0);
  }
  if(rec.status==='ex'){
    rec.blockedByPlayer=true;
    rec.contactUnlocked=false;
    return rec;
  }
  if(typeof rec.contactUnlocked!=='boolean'){
    const months=Math.max(0,S.day-rec.firstDay);
    rec.contactUnlocked=rec.name==='윤세라'||!!rec.childhoodFriend||establishedContactStatus(rec.status)||
      (rec.status==='friend'&&(rec.interactions||0)>=CONTACT_RULES.interactions&&(rec.trust||0)>=CONTACT_RULES.trust&&months>=CONTACT_RULES.months);
  }
  return rec;
}
function knownMonths(rec){return Math.max(0,S.day-ensureCourtship(rec).firstDay);}
function hasPersonalContact(rec){return!!(ensureCourtship(rec)&&rec.contactUnlocked);}
function contactReadiness(rec){
  ensureCourtship(rec);
  if(hasPersonalContact(rec))return{ready:true,missing:[],months:knownMonths(rec)};
  const missing=[];
  if((rec.affection||0)<CONTACT_RULES.affection)missing.push(`호감 ${Math.round(rec.affection||0)}/${CONTACT_RULES.affection}`);
  if((rec.trust||0)<CONTACT_RULES.trust)missing.push(`신뢰 ${Math.round(rec.trust||0)}/${CONTACT_RULES.trust}`);
  if((rec.interactions||0)<CONTACT_RULES.interactions)missing.push(`교류 ${rec.interactions||0}/${CONTACT_RULES.interactions}`);
  if(knownMonths(rec)<CONTACT_RULES.months)missing.push(`알게 된 기간 ${knownMonths(rec)}/${CONTACT_RULES.months}개월`);
  return{ready:missing.length===0,missing,months:knownMonths(rec)};
}
function contactProgress(rec){
  const r=contactReadiness(rec);
  return r.ready?'📱 개인적인 연락을 건네도 어색하지 않습니다':'서로 얼굴과 말투를 알아가는 중입니다';
}
function unlockPersonalContact(rec){
  if(!rec||rec.status==='ex')return false;
  const was=hasPersonalContact(rec);
  rec.contactUnlocked=true;
  if(!Number.isFinite(rec.contactDay))rec.contactDay=S.day;
  if(rec.status==='acquaintance')rec.status='friend';
  return!was;
}
function courtshipReadiness(rec){
  ensureCourtship(rec);
  const established=establishedContactStatus(rec.status);
  const missing=[];
  if(!hasPersonalContact(rec))missing.push('연락처 교환');
  if((rec.affection||0)<COURTSHIP_RULES.affection)missing.push(`호감 ${Math.round(rec.affection||0)}/${COURTSHIP_RULES.affection}`);
  if((rec.trust||0)<COURTSHIP_RULES.trust)missing.push(`신뢰 ${Math.round(rec.trust||0)}/${COURTSHIP_RULES.trust}`);
  if((rec.interactions||0)<COURTSHIP_RULES.interactions)missing.push(`교류 ${rec.interactions||0}/${COURTSHIP_RULES.interactions}`);
  if(knownMonths(rec)<COURTSHIP_RULES.months)missing.push(`알게 된 기간 ${knownMonths(rec)}/${COURTSHIP_RULES.months}개월`);
  return{ready:established||missing.length===0,missing,months:knownMonths(rec)};
}
function courtshipProgress(rec){
  const r=courtshipReadiness(rec);
  return r.ready?'💘 둘만의 약속을 꺼내도 좋을 만큼 가까워졌습니다':'아직은 서두르지 않고 서로를 알아가는 중입니다';
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
            childhoodFriend:!!c.childhoodFriend, schoolTag:c.schoolTag, contactUnlocked:c.name==='윤세라'||!!c.childhoodFriend||!!c.contactUnlocked,
            dates: 0, interactions:0, status: 'acquaintance', firstDay: S.day };
    met.push(rec);
  }
  if (status) rec.status = status;
  ensureCourtship(rec);
  if(c.childhoodFriend){rec.childhoodFriend=true;rec.contactUnlocked=true;}
  if(c.contactUnlocked||c.name==='윤세라'||establishedContactStatus(rec.status))unlockPersonalContact(rec);
  if(!DANGEROUS_HEROINE_NAMES.includes(rec.name)){rec.obsession=0;rec.obsessionGrowth=0;}
  if(CHAR_TRAITS)CHAR_TRAITS.ensure(rec);
  rec.lastDay = S.day;
  return rec;
}

function queueYujinInvestigation(housing,attacker){
  const L=S.life;if(!L||metRecord(L,'강유진')||L.yujinInvestigationSeen||L.yujinInvestigation&&L.yujinInvestigation.ready)return false;
  L.yujinInvestigation={
    ready:true,
    housing:housing||L.seraHousing||'reject',
    attacker:attacker||L.seraRescueOrigin&&L.seraRescueOrigin.attacker||RIVALS.ensureFaction(L).firstAttacker||'경쟁 세력',
    queuedDay:S.day,
  };
  queueImportantEvent({yujinInvestigation:true,type:'court',scene:'./assets/event-yujin-rain-rescue.png'});
  return true;
}

function showYujinInvestigation(manual){
  const L=S.life,host=$('life-event'),c=D.SPECIAL_CHARACTERS&&D.SPECIAL_CHARACTERS.yujin;
  if(!host||!c)return;
  const sera=metRecord(L,'윤세라'),housing=L.seraHousing||L.yujinInvestigation&&L.yujinInvestigation.housing||'reject';
  const cohabit=!!(sera&&housing==='cohabit'),separate=!!(sera&&housing==='separate');
  const seraPartner=!!(sera&&RELATIONSHIPS.isPartner(L,'윤세라'));
  S._yujinInvestigation={manual:!!manual,c,sera,housing};
  const scene=cohabit
    ?`<div class="investigation-door-cast"><div class="date-profile"><img class="char-thumb" src="${characterPortrait(c)}" alt="강유진"><div><strong>강유진 · 담당 수사관</strong><br><span class="muted">차명계좌·정산금 유용 사건</span></div></div><div class="date-profile"><img class="char-thumb" src="${characterPortrait(sera)}" alt="윤세라"><div><strong>윤세라 · 현재 동거인</strong><br><span class="muted">피해자이자 내부 송금 기록 제보자</span></div></div></div><div class="story-dialogue"><b>강유진</b> “윤세라 씨 주소를 확인하러 왔는데, 왜 당신 집이 나옵니까?”</div><div class="story-dialogue"><b>윤세라</b> “갈 곳이 없어서 같이 사는 건데요. 경찰한테 허락도 받아야 해요?”</div><div class="story-dialogue"><b>강유진</b> “허락 문제가 아닙니다. 두 분은 동거인입니까? 아니면… 애인입니까?”</div>`
    :separate
      ?`<div class="date-profile"><img class="char-thumb" src="${characterPortrait(c)}" alt="강유진"><div><strong>강유진 · 담당 수사관</strong><br><span class="muted">차명계좌·정산금 유용 사건</span></div></div><div class="story-dialogue"><b>강유진</b> “윤세라 씨가 임시 숙소의 비상 연락처로 당신 번호를 적었습니다. 같이 살지는 않는다면서, 무슨 관계입니까?”</div>`
      :`<div class="date-profile"><img class="char-thumb" src="${characterPortrait(c)}" alt="강유진"><div><strong>강유진 · 담당 수사관</strong><br><span class="muted">실종 피해자·차명계좌 확인</span></div></div><div class="story-dialogue"><b>강유진</b> “폐작업실에서 윤세라 씨를 마지막으로 본 사람이 당신입니다. 지원 연락처만 두고 왔다고 했죠. 그 뒤로 연락은 없었습니까?”</div>`;
  const choices=cohabit
    ?`<button class="event-opt" data-yujin-first="plain"><b>“지금은 동거인입니다. 갈 곳이 없어서 데려왔어요.”</b><span>관계를 부풀리지 않고 사실과 사건 기록을 넘깁니다.</span></button><button class="event-opt" data-yujin-first="protect"><b>“친구고, 제가 책임지고 보호하고 있습니다.”</b><span>세라를 다시 조사 대상처럼 다루지 말라고 선을 긋습니다.</span></button><button class="event-opt" data-yujin-first="challenge"><b>“${seraPartner?'애인 맞습니다.':'애인이라면'} 수사가 달라집니까?”</b><span>유진이 굳이 관계를 확인한 이유를 되묻습니다.</span></button>`
    :`<button class="event-opt" data-yujin-first="plain"><b>알고 있는 송금 기록과 마지막 행적을 전부 말한다</b><span>피해자이자 참고인으로 정식 조사에 협조합니다.</span></button><button class="event-opt" data-yujin-first="protect"><b>세라가 다시 이용당하지 않게 먼저 보호해 달라고 한다</b><span>수사보다 피해자 안전을 우선해 달라고 요구합니다.</span></button><button class="event-opt" data-yujin-first="challenge"><b>내가 왜 의심받는지부터 설명하라고 한다</b><span>담당 수사관의 의도와 확보한 증거를 확인합니다.</span></button>`;
  host.style.display='block';
  host.innerHTML=`<div class="window event-window yujin-investigation-window"><div class="title-bar event-bar"><div class="title-bar-text">👮‍♀️ 경쟁 세력 피해 수사 · 주거지 확인</div></div><div class="window-body"><img class="life-scene-banner" src="./assets/event-yujin-rain-rescue.png" alt="사건 수사를 위해 찾아온 강유진"><div class="event-title">${cohabit?'현관문은 세라가 먼저 열었습니다.':'담당 수사관이 당신을 참고인으로 찾았습니다.'}</div><div class="event-desc">${L.yujinInvestigation&&L.yujinInvestigation.attacker||'경쟁 세력'}의 차명계좌를 조사하던 강유진이 정산금 피해자 명단과 당신의 거래 기록이 겹친 것을 발견했습니다. 신고하러 찾아간 만남이 아니라, 수사가 먼저 집 앞까지 온 순간입니다.</div>${scene}<div class="event-options">${choices}</div><div id="yujin-investigation-outcome" class="event-outcome"></div></div></div>`;
  host.querySelectorAll('[data-yujin-first]').forEach(button=>button.addEventListener('click',()=>resolveYujinInvestigation(button.dataset.yujinFirst)));
}

function resolveYujinInvestigation(choice){
  const pending=S._yujinInvestigation,host=$('life-event'),L=S.life;if(!pending||!host)return;
  const rec=rememberPerson(pending.c,'acquaintance'),sera=pending.sera,cohabit=!!(sera&&pending.housing==='cohabit');
  const effects={
    plain:{affection:4,trust:7,danger:-2,line:'기록은 확인했습니다. 당분간은 업무용 번호로만 연락하죠. 다음 조사 때는 경찰서 밖에서 이야기할 수도 있고요.'},
    protect:{affection:6,trust:5,danger:2,line:'본인도 피해자인데 다른 사람부터 지키겠다는 겁니까? 그런 사람일수록 어느 순간 혼자 무너집니다. 다음 연락은 꼭 받으세요.'},
    challenge:{affection:7,trust:3,danger:4,line:'수사는 달라지지 않습니다. 다만 누가 누구를 보호하는지는 알아야 하니까요. 지금 대답하기 싫으면 다음 조사에서 다시 묻겠습니다.'},
  };
  const effect=effects[choice]||effects.plain;
  rec.affection=clamp(Math.max(rec.affection||0,effect.affection),0,100);
  rec.trust=clamp(Math.max(rec.trust||0,effect.trust),0,100);
  rec.dangerLevel=clamp((rec.dangerLevel||0)+effect.danger,0,100);
  rec.officialContact=true;rec.investigationRole='담당 수사관';rec.specialFollowupInterest='open';
  rec.lastSpecialFollowupDay=S.day;rec.yujinFirstAnswer=choice;rec.yujinCaseOrigin='rival-funds';
  addBondInteraction(rec,'official-investigation');
  if(cohabit){
    L.dangerousBadFriendsEncounters=(L.dangerousBadFriendsEncounters||0)+1;
    rec.dangerousBadFriendsSeed=true;sera.dangerousBadFriendsSeed=true;
    if(choice==='protect'){sera.affection=clamp((sera.affection||0)+3,0,100);sera.obsession=clamp((sera.obsession||0)+3,0,100);}
    else if(choice==='challenge'){sera.affection=clamp((sera.affection||0)+5,0,100);sera.obsession=clamp((sera.obsession||0)+5,0,100);}
    else sera.trust=clamp((sera.trust||0)+2,0,100);
  }
  L.yujinInvestigationSeen=true;
  if(L.yujinInvestigation)L.yujinInvestigation.ready=false;
  addNews(`👮‍♀️ 강유진이 경쟁 세력 피해 사건의 담당 수사관으로 나타났습니다${cohabit?' · 윤세라 동거 확인':''}`,'neutral');
  const seraReply=cohabit?`<div class="story-dialogue"><b>윤세라</b> “경찰님, 다음에는 영장 없으면 남의 애인 여부부터 묻지 마세요.”</div><div class="story-dialogue"><b>강유진</b> “세라 씨도 다음에는 남의 말을 대신 정하지 말고요. 그리고 아직 애인이라고 답한 적 없습니다.”</div>`:'';
  const options=host.querySelector('.event-options');if(options)options.innerHTML='';
  $('yujin-investigation-outcome').innerHTML=`<div class="story-dialogue"><b>강유진</b> “${effect.line}”</div>${seraReply}<div class="oc-changes">강유진 · 공식 사건 연락만 가능 · 호감 ${effect.affection} · 신뢰 ${effect.trust}<br>개인 연락처는 후속 수사와 사적인 대화를 거쳐야 열립니다.</div><button id="yujin-investigation-confirm" class="session-btn opening">업무용 명함을 받아 둔다</button>`;
  $('yujin-investigation-confirm').addEventListener('click',()=>{
    host.style.display='none';host.innerHTML='';S._yujinInvestigation=null;
    renderLifePanel();autoSave();
    if(pending.manual)afterLifeAction('인맥');else showNextImportantEvent();
  });
  autoSave();
}

function meetSpecialPerson(id) {
  const c = D.SPECIAL_CHARACTERS && D.SPECIAL_CHARACTERS[id];
  if (!c) return;
  const known=metRecord(S.life,c.name);
  if(id==='yujin'&&!known){showYujinInvestigation(true);return;}
  if(id==='chaerin'&&!known){flashToast('📘 나래의 인맥 수업을 따라 사교모임에 몇 차례 나가면 더 안쪽의 자리를 볼 수 있습니다','neutral');return;}
  if(known&&!hasPersonalContact(known)){
    showSpecialFollowupMeet(id,c,known);
    return;
  }
  const host = $('life-event'); if (!host) return;
  S._specialMeet = c;
  const intro = id === 'yujin' ? '사건 상담을 마친 뒤, 강유진이 업무용 명함을 건넸습니다. “급한 일이면 이쪽으로요. 개인적인 용건은… 아직 곤란하고요.”'
    : id === 'sera' ? '새벽 고민방에서 몇 시간 대화한 윤세라가 말합니다. “오늘 나간 뒤에도… 갑자기 사라지진 않을 거죠?”'
    : '사교모임이 끝난 뒤 한채린은 비서실 명함을 치우지 않은 당신을 다시 불렀습니다. 채린이 잔을 내려놓습니다. “이번에도 고개 숙이면 여기서 끝이야. 지난번처럼 내 말부터 끊어봐.”';
  const choices=id==='sera'
    ? `<button class="event-opt" data-special-rel="friend">친구로 연락을 이어간다</button><button class="event-opt" data-special-rel="acquaintance">필요할 때만 연락한다</button><button class="event-opt" data-special-rel="casual">🌙 오늘 함께 밤을 보낸다</button>`
    : `<button class="event-opt" data-special-rel="followup">다음에 다시 이야기할 여지를 남긴다</button><button class="event-opt" data-special-rel="acquaintance">업무상 인사만 나눈다</button>`;
  host.style.display='block';
  host.innerHTML=`<div class="window event-window"><div class="title-bar event-bar"><div class="title-bar-text">${c.emoji} 특별한 만남</div></div><div class="window-body"><div class="date-profile"><img class="char-thumb" src="${characterPortrait(c)}" alt="${c.name}"><div><strong>${c.name} · ${c.age}세 · ${c.job}</strong><br><span class="muted">${(D.PERSONALITIES[c.personality]||{}).name}</span></div></div><div class="event-desc">${intro}</div><div class="event-options">${choices}</div></div></div>`;
  host.querySelectorAll('[data-special-rel]').forEach(b=>b.addEventListener('click',()=>resolveSpecialMeet(b.dataset.specialRel)));
}
function resolveSpecialMeet(status) {
  const c=S._specialMeet;if(!c)return;
  const isSera=c.name==='윤세라';
  const rec=rememberPerson(c,isSera?status:'acquaintance');
  rec.affection=isSera?(status==='friend'?22:status==='casual'?28:10):Math.max(rec.affection||0,status==='followup'?8:4);
  rec.trust=isSera?(status==='friend'?12:4):Math.max(rec.trust||0,status==='followup'?4:2);
  addBondInteraction(rec,'special-meeting');
  if(isSera){
    unlockPersonalContact(rec);
    rec.obsession=Math.min(100,(rec.obsession||0)+(status==='casual'?18:status==='friend'?6:0));
    if(status==='casual')awakenDangerousHeroine(rec,'night');
    pushPersonMessage(S.life,rec,status==='casual'?'가볍게라고 했지만… 연락은 매일 해도 되는 거죠?':'번호 저장했어요. 먼저 사라지지만 말아요.',false);
    addNews(`${c.emoji} ${c.name}님과 ${status==='friend'?'친구가':status==='casual'?'가벼운 관계가':'연락하는 사이가'} 됐습니다`,'neutral');
  }else{
    rec.lastSpecialFollowupDay=S.day;
    rec.specialFollowupInterest=status==='followup'?'open':'formal';
    addNews(`${c.emoji} ${c.name}님과 ${status==='followup'?'다음 만남의 여지를 남겼습니다':'업무상 인사를 나눴습니다'}`,'neutral');
    flashToast('명함 뒷면에 다음 약속의 날짜를 받아냈습니다','neutral');
  }
  const h=$('life-event');if(h){h.style.display='none';h.innerHTML='';}S._specialMeet=null;afterLifeAction('인맥');
}

function showChaerinGatheringFollowup(c,rec,gathering){
  const host=$('life-event');if(!host||!c||!rec)return;
  const count=(rec.specialFollowupCount||0)+1;
  S._chaerinGatheringFollowup={c,rec,gathering,count};
  const scenes={
    1:{
      image:'./assets/event-chaerin-9.png',
      title:'빌린 장난감',
      desc:'다음 모임의 입구에서 채린은 인사 대신 자기 재킷을 당신 어깨에 걸칩니다. 사람들은 당신을 새 투자자가 아니라 채린이 데려온 장식품처럼 봅니다.',
      line:'“계약서는 찢었어도 내가 부르면 왔네. 오늘은 말하지 말고 옆에 있어. 네 표정이 저 사람들보다 볼 만하니까.”',
      choices:[
        ['defy','재킷을 벗어 돌려주고 소개할 거면 이름부터 제대로 부르라고 한다'],
        ['endure','사람들 앞에서는 참되 돌아가는 차 안에서 사과를 요구한다'],
        ['scheme','장식품인 척하며 참석자들의 거래 이야기를 전부 기억한다'],
      ],
    },
    2:{
      image:'./assets/event-chaerin-contract.png',
      title:'두 번째 신입 털이',
      desc:'채린은 당신을 데리고 다니며 만나는 사람마다 “계약서를 읽기는 하는데 처세는 모르는 신입”이라고 소개합니다. 웃음이 터질 때마다 당신 쪽을 보며 얼마나 참는지 확인합니다.',
      line:'“화났어? 여기서 따지면 네 평판이 망가지고, 참으면 내가 재미없어져. 이번에는 뭘 고를 건데?”',
      choices:[
        ['defy','채린의 말을 끊고 이 자리에서 제일 처세를 모르는 건 사람을 장난감처럼 쓰는 후원자라고 한다'],
        ['endure','모임이 끝날 때까지 기다린 뒤 다시는 이런 소개를 하지 말라고 선을 긋는다'],
        ['scheme','채린보다 먼저 웃고 신입 털이들의 허점을 거래 조건으로 바꾼다'],
      ],
    },
  };
  if(count>=3){
    host.style.display='block';
    host.innerHTML=`<div class="window event-window chaerin-industry-window"><div class="title-bar event-bar"><div class="title-bar-text">👑 한채린 · 세 번째 모임의 끝</div></div><div class="window-body"><img class="life-scene-banner" src="./assets/event-chaerin-4.png" alt="처음으로 표정을 잃은 한채린"><div class="event-title">이번에는 웃음이 먼저 멈췄습니다.</div><div class="event-desc">모임이 끝난 뒤에도 채린은 사람들 앞에서 당신의 실패를 하나씩 늘어놓습니다. 돌아서려는 손목까지 붙잡고 “계약을 찢을 때는 멋있더니 이 정도도 못 버티냐”고 낮게 웃습니다. 억눌렀던 화가 올라오지만, 아직 멈출 수 있습니다.</div><div class="event-options"><button class="event-opt" data-chaerin-break="leave"><b>아무 말 없이 손을 빼고 떠난다</b><span>다시는 비서실의 초대에 응하지 않습니다.</span></button><button class="event-opt" data-chaerin-break="endure"><b>끝까지 손을 내리고 다시는 사람들 앞에서 시험하지 말라고 한다</b><span>분노는 참되 관계의 선을 직접 정합니다.</span></button><button class="event-opt bad" data-chaerin-break="strike"><b>손목을 뿌리치다 실수로 뺨을 때린다</b><span>둘 다 넘지 말았어야 할 선을 넘습니다.</span></button></div><div id="chaerin-break-outcome" class="event-outcome"></div></div></div>`;
    host.querySelectorAll('[data-chaerin-break]').forEach(button=>button.addEventListener('click',()=>resolveChaerinGatheringBreak(button.dataset.chaerinBreak)));
    return;
  }
  const scene=scenes[count]||scenes[2];
  host.style.display='block';
  host.innerHTML=`<div class="window event-window chaerin-industry-window"><div class="title-bar event-bar"><div class="title-bar-text">👑 한채린 · ${count}번째 동행</div></div><div class="window-body"><img class="life-scene-banner" src="${scene.image}" alt="${scene.title}"><div class="event-title">${scene.title}</div><div class="event-desc">${scene.desc}</div><div class="story-dialogue"><b>한채린</b> ${scene.line}</div><div class="event-options">${scene.choices.map(choice=>`<button class="event-opt" data-chaerin-followup="${choice[0]}">${choice[1]}</button>`).join('')}</div></div></div>`;
  host.querySelectorAll('[data-chaerin-followup]').forEach(button=>button.addEventListener('click',()=>resolveChaerinGatheringFollowup(button.dataset.chaerinFollowup)));
}

function resolveChaerinGatheringFollowup(kind){
  const pending=S._chaerinGatheringFollowup,host=$('life-event');if(!pending||!host)return;
  const {rec,count}=pending;
  const gains={
    defy:{affection:8,trust:4,danger:8,signature:10,defiance:2,line:'사람들 앞에서 내 말을 끊어? …좋아. 다음에는 더 참기 어려운 자리를 골라줄게.'},
    endure:{affection:4,trust:8,danger:2,signature:2,defiance:1,line:'참는 건 재미없는데, 끝나고 나서도 내 눈 보고 따지는 건 조금 낫네.'},
    scheme:{affection:6,trust:5,danger:6,signature:7,defiance:1,line:'장난감인 척하면서 남의 패를 외웠네. 생각보다 오래 데리고 다녀도 되겠어.'},
  };
  const gain=gains[kind]||gains.endure;
  rec.affection=clamp((rec.affection||0)+gain.affection,0,100);
  rec.trust=clamp((rec.trust||0)+gain.trust,0,100);
  rec.dangerLevel=clamp((rec.dangerLevel||0)+gain.danger,0,100);
  rec.chaerinDefiance=(rec.chaerinDefiance||0)+gain.defiance;
  rec.specialFollowupCount=count;rec.lastSpecialFollowupDay=S.day;
  addBondInteraction(rec,`chaerin-gathering-${kind}`);
  if(CHAR_TRAITS)CHAR_TRAITS.change(rec,gain.signature);
  addNews(`👑 한채린이 당신을 ${count}번째 사교모임 동행으로 데리고 다녔습니다`,'neutral');
  host.querySelector('.event-options').innerHTML='';
  host.querySelector('.window-body').insertAdjacentHTML('beforeend',`<div class="event-outcome"><div class="story-dialogue"><b>한채린</b> “${gain.line}”</div><button id="chaerin-followup-confirm" class="session-btn opening">모임을 빠져나온다</button></div>`);
  $('chaerin-followup-confirm').addEventListener('click',()=>{host.style.display='none';host.innerHTML='';S._chaerinGatheringFollowup=null;afterLifeAction('인맥');});
  autoSave();
}

function resolveChaerinGatheringBreak(kind){
  const pending=S._chaerinGatheringFollowup,host=$('life-event');if(!pending||!host)return;
  const rec=pending.rec;
  rec.specialFollowupCount=Math.max(3,rec.specialFollowupCount||0);rec.lastSpecialFollowupDay=S.day;
  addBondInteraction(rec,`chaerin-breaking-point-${kind}`);
  let result='',tone='neutral';
  if(kind==='leave'){
    rec.chaerinRouteClosed=true;rec.secretaryContact=false;rec.contactUnlocked=false;rec.contactChannel='차단한 비서실 번호';
    rec.affection=clamp((rec.affection||0)-10,0,100);rec.trust=clamp((rec.trust||0)+3,0,100);
    result='<div class="story-dialogue"><b>한채린</b> “그래. 이게 정상이지. …그런데 왜 이번에는 내가 버려진 것 같지?”</div><div class="event-desc">채린은 따라오지 않습니다. 다음 날 비서실 번호도 더는 연결되지 않고, 사교모임에서 마주쳐도 서로 모르는 사람처럼 지나칩니다.</div>';
    addNews('🚪 한채린의 반복된 시험에서 떠났습니다 · 개인 관계 종료','neutral');
  }else if(kind==='endure'){
    rec.chaerinBreakChoice='boundary';rec.affection=clamp((rec.affection||0)+6,0,100);rec.trust=clamp((rec.trust||0)+12,0,100);
    rec.dangerLevel=clamp((rec.dangerLevel||0)+4,0,100);unlockPersonalContact(rec);
    result='<div class="story-dialogue"><b>한채린</b> “끝까지 안 때리네. 재미없어야 하는데… 네가 정한 선을 내가 지키는 건 처음이라 더 짜증 나.”</div><div class="event-desc">채린은 비서실 카드를 찢고 자기 휴대폰에 직접 번호를 입력합니다. 공개적인 시험은 끝났지만, 대등한 관계를 견디는 법은 이제부터 배워야 합니다.</div>';
    pushPersonMessage(S.life,rec,'오늘 일은 내가 잘못했어. 사과는 만나서 할게. 대신 답장은 네가 직접 해.',false);
    addNews('📱 한채린과 공개적인 시험을 끝내고 개인 연락처를 교환했습니다','good');tone='good';
  }else{
    rec.chaerinBreakChoice='accidental-slap';rec.chaerinSubmissionAwakened=true;
    rec.affection=clamp((rec.affection||0)+2,0,100);rec.trust=clamp((rec.trust||0)-4,0,100);
    rec.dangerLevel=clamp((rec.dangerLevel||0)+22,0,100);rec.chaerinDefiance=(rec.chaerinDefiance||0)+4;
    unlockPersonalContact(rec);if(CHAR_TRAITS)CHAR_TRAITS.change(rec,22);
    result='<div class="story-dialogue"><b>한채린</b> “……다 나가.”</div><div class="event-desc">실수였다는 말도 사과도 늦었습니다. 채린은 경호원과 수행원을 모두 내보낸 뒤 붉어진 뺨을 감싼 채, 화를 내야 한다는 말을 혼잣말처럼 되풀이합니다. 이 선택은 잘못된 선을 넘었고 둘의 관계에도 위험한 흔적을 남겼습니다.</div>';
    addNews('⚠️ 한채린과의 세 번째 동행에서 넘지 말아야 할 선을 넘었습니다','bad');tone='bad';
  }
  host.querySelector('.event-options').innerHTML='';
  $('chaerin-break-outcome').innerHTML=`${result}<button id="chaerin-break-confirm" class="session-btn opening">${kind==='strike'?'그 자리를 떠나려 한다':'대화를 끝낸다'}</button>`;
  $('chaerin-break-confirm').addEventListener('click',()=>kind==='strike'?showChaerinAwakening(rec):finishChaerinGatheringBreak());
  autoSave();
}

function showChaerinAwakening(rec){
  const host=$('life-event');if(!host)return;
  host.innerHTML=`<div class="window event-window chaerin-industry-window"><div class="title-bar event-bar"><div class="title-bar-text">👑 한채린 · 화가 나야 하는데</div></div><div class="window-body"><img class="life-scene-banner" src="./assets/event-chaerin-5.png" alt="처음 느낀 감정에 혼란스러운 한채린"><div class="event-title">엘리베이터 문이 열리기 전에 채린이 다시 당신을 부릅니다.</div><div class="story-dialogue"><b>한채린</b> “잘못한 건 너야. 당장 내보내야 하는데… 왜 네가 한 말만 계속 남지? 사과는 하지 마. 지금 들으면 진짜 재미없어질 것 같으니까.”</div><div class="event-desc">채린은 계약서 대신 자기 휴대폰을 내밉니다. 굴복하고 싶은 욕구를 애정으로 착각하기 시작한 순간이며, 두 사람 모두 그 위험을 모른 척할 수 없습니다.</div><button id="chaerin-awakening-confirm" class="session-btn opening">개인 번호를 저장한다</button></div></div>`;
  $('chaerin-awakening-confirm').addEventListener('click',()=>{
    pushPersonMessage(S.life,rec,'내일 연락해. 오늘 일은 없던 일로 하지 말고, 네가 왜 화났는지 처음부터 전부 말해.',false);
    addNews('📱 한채린이 비서실을 거치지 않은 개인 번호를 건넸습니다','neutral');
    finishChaerinGatheringBreak();
  });
}

function finishChaerinGatheringBreak(){
  const host=$('life-event');if(host){host.style.display='none';host.innerHTML='';}
  S._chaerinGatheringFollowup=null;
  afterLifeAction('인맥');
}

function showSpecialFollowupMeet(id,c,rec){
  const host=$('life-event');if(!host)return;
  const sera=metRecord(S.life,'윤세라');
  const seraAtHome=!!(sera&&S.life.seraHousing==='cohabit');
  const yujin=metRecord(S.life,'강유진');
  S._specialFollowup={id,c,rec,seraAtHome,yujinKnown:!!yujin};
  const count=(rec.specialFollowupCount||0)+1;
  let intro='',interruption='';
  if(id==='yujin'){
    intro=count===1
      ? '유진은 추가 진술을 받겠다며 경찰서 정문이 아니라 사건 현장 맞은편의 조용한 카페를 골랐습니다. 서류에는 차명계좌와 윤세라의 거처가 적혀 있지만, 질문은 당신이 공격 뒤에도 혼자 버티고 있는지에 더 오래 머뭅니다.'
      : '수사에 필요한 진술은 이미 끝났습니다. 그런데도 유진은 업무용 명함 뒤에 다음 시간을 적어 왔습니다. 사건이 없어도 다시 만날 수 있는지, 보호할 이유가 없어도 곁에 있고 싶은지를 처음으로 구분하려 합니다.';
    interruption=seraAtHome
      ? '<div class="hub-note bad-friends-note"><b>세라와 동거 중</b><br>카페 밖에는 세라가 먼저 와 있었습니다. 유진이 “참고인 조사를 따라오는 동거인은 처음 보네요”라고 하자 세라는 “애인인지 두 번이나 물어보는 담당 경찰도 처음 봤어요”라고 받아칩니다. 유진은 사적인 질문이 아니었다고 부정하면서도 귀가할 때까지 두 사람을 따라옵니다.</div>'
      : '';
  }else{
    intro=count===1
      ? '다음 사교모임이 끝나자 채린은 수행원과 참석자를 전부 내보냈습니다. 지난번 당신이 밀어낸 낮은 의자는 사라졌고 자기 상석만 하나 남아 있습니다. 채린은 앉지 않은 채, 당신이 또 자기 말을 끊어주기를 기다립니다.'
      : '비서실이 잡은 공식 일정은 이미 끝났습니다. 채린은 개인 번호가 적힌 휴대전화를 테이블 위에 두고도 건네지 않습니다. 고분고분 연락처를 달라고 하면 그대로 치우고, 자기 방식이 답답하다고 잘라 말하면 넘길 생각입니다.';
    if(seraAtHome&&yujin){
      interruption='<div class="hub-note bad-friends-note"><b>차명계좌 사건의 세 번째 끝</b><br>약속 장소 밖에는 세라와 유진이 따로 와 있었습니다. 세라는 “채린 씨 계열사가 내 주소를 샀어요”라고 말하고, 유진은 “해당 자료는 수사기관에 먼저 제출하세요”라고 경고합니다. 채린은 “둘 다 내 약속을 추적해놓고 누가 스토커인지부터 정하자”고 받아치면서도 계열사 원장을 테이블에 내려놓습니다.</div>';
    }else if(seraAtHome){
      interruption='<div class="hub-note bad-friends-note"><b>세라와 동거 중</b><br>채린이 보낸 차량이 집 앞에 서기 전부터 세라가 초대장 속 계열사 로고를 알아봤습니다. 채린이 “남의 일정을 훔쳐보는 사람이 나를 의심해?”라고 하자 세라는 “돈 주고 남의 주소를 산 사람보다는 싸게 알아냈네요”라고 답합니다. 둘은 서로를 싫어한다면서도 같은 차명계좌 장부를 펼칩니다.</div>';
    }else if(yujin){
      interruption='<div class="hub-note bad-friends-note"><b>강유진의 공식 요청</b><br>채린의 수행원이 문을 닫기 직전, 유진이 보낸 계열사 자료 제출 요구서가 도착했습니다. 채린은 종이를 읽지도 않고 당신 앞으로 밀며 “경찰관한테는 절차대로 답할 거야. 너는 네 말로 뭘 원하는지 말해”라고 합니다.</div>';
    }else interruption='';
  }
  const name=id==='yujin'?'강유진':'한채린';
  const progress=contactReadiness(rec);
  host.style.display='block';
  host.innerHTML=`<div class="window event-window"><div class="title-bar event-bar"><div class="title-bar-text">${c.emoji} ${name} · ${count}번째 후속 약속</div><div class="title-bar-controls"><button aria-label="Close" id="special-followup-close"></button></div></div><div class="window-body"><div class="date-profile"><img class="char-thumb" src="${characterPortrait(c)}" alt="${name}"><div><strong>${name} · ${id==='yujin'?'업무용 연락만 가능':'비서실 연락만 가능'}</strong><br><span class="muted">${progress.missing.join(' · ')||'조금 더 솔직한 대화가 필요합니다'}</span></div></div><div class="event-desc">${intro}</div>${interruption}<div class="event-options"><button class="event-opt" data-special-followup="open">${id==='yujin'?'조사가 끝난 뒤에도 다시 만나자고 한다':'“번호 줄 거면 주고, 시험할 거면 그만 불러”라고 말을 끊는다'}</button><button class="event-opt" data-special-followup="practical">${id==='yujin'?'공식 신고와 개인 비상연락의 선을 함께 정한다':'계열사 차명계좌 원장부터 내놓으라고 요구한다'}</button><button class="event-opt" data-special-followup="formal">${id==='yujin'?'오늘은 사건 이야기만 하고 돌아간다':'비서실을 칭찬하며 채린의 결정에 따르겠다고 한다'}</button><button class="event-opt" id="special-followup-cancel">다음으로 미룬다</button></div></div></div>`;
  host.querySelectorAll('[data-special-followup]').forEach(b=>b.addEventListener('click',()=>resolveSpecialFollowupMeet(b.dataset.specialFollowup)));
  [$('special-followup-close'),$('special-followup-cancel')].forEach(b=>{if(b)b.addEventListener('click',closeSpecialFollowupMeet);});
}
function closeSpecialFollowupMeet(){
  const host=$('life-event');if(host){host.style.display='none';host.innerHTML='';}
  S._specialFollowup=null;
}
function resolveSpecialFollowupMeet(kind){
  const pending=S._specialFollowup;if(!pending)return;
  const {id,c,rec,seraAtHome}=pending;
  const gain=id==='chaerin'
    ?kind==='open'?{affection:9,trust:4,signature:10,defiance:2}:kind==='practical'?{affection:6,trust:8,signature:7,defiance:1}:{affection:-3,trust:1,signature:-4,defiance:0}
    :kind==='open'?{affection:6,trust:4}:kind==='practical'?{affection:4,trust:5}:{affection:3,trust:3};
  rec.affection=clamp((rec.affection||0)+gain.affection,0,100);
  rec.trust=clamp((rec.trust||0)+gain.trust,0,100);
  if(id==='chaerin'){
    rec.chaerinDefiance=(rec.chaerinDefiance||0)+(gain.defiance||0);
    if(CHAR_TRAITS)CHAR_TRAITS.change(rec,gain.signature||0);
  }
  rec.specialFollowupCount=(rec.specialFollowupCount||0)+1;
  rec.lastSpecialFollowupDay=S.day;
  addBondInteraction(rec,`special-followup-${kind}`);
  if(seraAtHome){
    S.life.dangerousBadFriendsEncounters=(S.life.dangerousBadFriendsEncounters||0)+1;
    rec.dangerousBadFriendsSeed=true;
  }
  const ready=contactReadiness(rec);
  let result='';
  if(ready.ready){
    unlockPersonalContact(rec);
    if(id==='yujin'){rec.officialContact=false;rec.personalContactReason='후속 수사 뒤 사적인 번호 교환';}
    result=id==='yujin'
      ? '유진이 업무용 명함을 거두고 개인 번호를 직접 찍어줍니다. “사건이 없어도 연락해요. 대신 답이 늦다고 순찰차부터 보내지는 않을게요.”'
      : '채린이 비서실 카드를 구겨 버리고 자기 휴대폰을 내밉니다. “말 잘 들으라고 주는 번호 아니야. 다음에도 내 말이 마음에 안 들면 비서 말고 나한테 직접 끊어.”';
    pushPersonMessage(S.life,rec,id==='yujin'?'집에는 잘 들어갔어요? 이건 업무 확인 아니에요.':'내 번호 저장했죠? 비서에게 답장하면 이번 약속은 없던 일로 할게요.',false);
    addNews(`📱 ${rec.name}과 개인 연락처를 교환했습니다`,'good');
  }else{
    result=`대화는 전보다 길어졌지만 개인 번호는 아직 받지 못했습니다. 헤어지기 전, ${rec.name}은 다음에 비워둘 날짜 하나를 말해줬습니다.`;
    addNews(`${c.emoji} ${rec.name}과 ${rec.specialFollowupCount}번째 후속 만남을 가졌습니다`,'neutral');
  }
  closeSpecialFollowupMeet();
  flashToast(result,ready.ready?'good':'neutral');
  afterLifeAction('인맥');
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
  '다은':'event-daeun-cake.png','혜진':'event-hyejin-blackout.png','소희':'event-sohee-backstage.png','아린':'event-arin-first-snow.png','나영':'event-nayoung-wrist-v2.png','미래':'event-mirae-launch.png'
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

function ensureChildhoodCircleCast(){
  if(!CHILDHOOD_CIRCLE||CHILDHOOD_CIRCLE.ensure(S.life).removed)return[];
  return CHILDHOOD_CIRCLE.MEMBERS.map(name=>{
    const def=D.CHARACTERS.find(person=>person.name===name);if(!def)return null;
    const rec=metRecord(S.life,name)||rememberPerson(def,'acquaintance');
    rec.childhoodFriend=true;
    rec.oldClassmate=true;rec.formerClubEx=true;
    rec.oldCircleRole=(CHILDHOOD_CIRCLE.META[name]||{}).role;
    rec.affection=Math.max(rec.affection||0,name===CHILDHOOD_CIRCLE.ensure(S.life).anchor?18:12);
    rec.trust=Math.max(rec.trust||0,name===CHILDHOOD_CIRCLE.ensure(S.life).anchor?34:18);
    ensureCourtship(rec).interactions=Math.max(1,rec.interactions||0);
    return rec;
  }).filter(Boolean);
}
function removeChildhoodCircleFromGame(){
  const L=S.life,state=CHILDHOOD_CIRCLE.ensure(L),names=new Set(CHILDHOOD_CIRCLE.MEMBERS);
  state.removed=true;state.route='cut_past';state.stage='removed';state.pending=null;
  L.childhoodNightContract=null;
  L.met=ensureMet(L).filter(person=>!names.has(person.name));
  if(Array.isArray(L.lovers))L.lovers=L.lovers.filter(person=>!names.has(person.name));
  if(L.partner&&names.has(L.partner.name))L.partner=null;
  if(L.relationshipGroup&&Array.isArray(L.relationshipGroup.members)){
    L.relationshipGroup.members=L.relationshipGroup.members.filter(member=>!names.has(typeof member==='string'?member:member&&member.name));
  }
  if(L.polycule&&Array.isArray(L.polycule.members))L.polycule.members=L.polycule.members.filter(person=>!names.has(person.name));
  const chats=ensureChats(L);names.forEach(name=>delete chats[name]);
  S._importantEvents=(S._importantEvents||[]).filter(event=>!event.childhoodCircleEvent);
  if(S._dateCandidate&&names.has(S._dateCandidate.name))closeDateModal();
}
function childhoodCircleNarrative(state){
  if(!state)return{title:'오래된 인연',detail:'다섯의 관계가 아직 모습을 드러내지 않았습니다.',tone:''};
  if(state.route==='never_graduate')return{title:'끝나지 않은 졸업식',detail:'다섯은 잘못까지 사랑이었다고 덮고 보호 계획을 다시 가동했습니다. 이제 윤세라의 집착조차 단순하고 솔직해 보입니다.',tone:'down'};
  if(state.route==='old_promise')return{title:'처음이 아닌 첫날',detail:'다섯이 각자의 잘못을 인정하고 관리자 권한을 돌려준 뒤, 과거가 아닌 오늘의 동의로 여섯의 관계를 시작했습니다.',tone:'up'};
  if(state.route==='cut_past')return{title:'닫힌 졸업앨범',detail:'주인공은 사과를 받아도 관계를 돌려줄 의무는 없다고 선언하고 마침내 졸업했습니다.',tone:'muted'};
  if((state.pressure||0)>=75)return{title:'보호 계획 재가동',detail:'일정·약·평판·동선·계정이 다시 맞물립니다. 한 사람의 집착보다 훨씬 조용하게 일상이 잠기고 있습니다.',tone:'down'};
  if((state.pressure||0)>=45)return{title:'다섯 명의 작은 간섭',detail:'각자는 작은 도움이라고 부르지만, 다섯 역할이 합쳐지면 주인공의 선택지가 하나씩 사라집니다.',tone:''};
  if(state.stage==='pact')return{title:'보호 계획서',detail:'외부 세력이 계정을 악용했어도 통제 체계를 만든 책임은 다섯에게 있습니다. 이제 각자가 자기 몫을 인정해야 합니다.',tone:''};
  if(state.stage==='reunited')return{title:'실패한 첫 하렘 단체방',detail:'모두 알고 시작했던 관계입니다. 문제는 사랑의 수가 아니라, 다섯이 주인공의 끝내겠다는 말을 지웠다는 데 있습니다.',tone:'up'};
  return{title:'폐쇄됐던 생활경제연구회',detail:'합의로 시작해 공동 통제로 끝난 여섯의 첫 연애가 아직 복구되지 않은 기록으로 남아 있습니다.',tone:''};
}
function showChildhoodCircleEvent(eventId){
  const view=CHILDHOOD_CIRCLE&&CHILDHOOD_CIRCLE.event(eventId),host=$('life-event');
  if(!view||!host){showNextImportantEvent();return;}
  const people=ensureChildhoodCircleCast(),state=CHILDHOOD_CIRCLE.ensure(S.life),mood=childhoodCircleNarrative(state);
  S._childhoodCircleEvent=eventId;
  const speakers=view.speakers.map(([name,line])=>{
    const person=people.find(item=>item.name===name);
    return`<div class="trio-dialogue"><img src="${characterPortrait(person)}" alt="${name}"><div><b>${name} · ${(CHILDHOOD_CIRCLE.META[name]||{}).role||'소꿉친구'}</b><p>“${line}”</p></div></div>`;
  }).join('');
  host.style.display='block';
  host.innerHTML=`<div class="window event-window trio-route-window childhood-circle-window">
    <div class="title-bar event-bar"><div class="title-bar-text">${view.icon} 한 번씩 헤어진 다섯 · ${view.title}</div></div>
    <div class="window-body">
      <img class="life-scene-banner" src="${view.scene}" alt="${view.title} 이벤트 장면">
      <div class="important-event-detail ${mood.tone}"><b>${mood.title}</b><br>${mood.detail}</div>
      <div class="event-desc">${view.desc}</div>
      <div class="trio-dialogues">${speakers}</div>
      <div class="event-options">${view.choices.map(choice=>`<button class="event-opt" data-childhood-choice="${choice.id}">${choice.text}</button>`).join('')}</div>
      <div class="event-outcome" id="childhood-circle-outcome"></div>
    </div>
  </div>`;
  host.querySelectorAll('[data-childhood-choice]').forEach(button=>button.addEventListener('click',()=>resolveChildhoodCircleEvent(button.dataset.childhoodChoice)));
}
function activateChildhoodCircleBond(route){
  const L=S.life,people=CHILDHOOD_CIRCLE.MEMBERS.map(name=>metRecord(L,name)).filter(Boolean);
  if(people.length!==CHILDHOOD_CIRCLE.MEMBERS.length)return;
  const main=people[0],poly=ensurePolycule(L),dangerous=route==='never_graduate';
  L.relationship='dating';
  L.partner=Object.assign({},main,{mood:dangerous?'angry':'happy'});
  L.affection=Math.round(people.reduce((sum,person)=>sum+(person.affection||0),0)/people.length);
  main.status='partner';
  poly.active=true;
  poly.mode=dangerous?'childhood_circle_never_graduate':'childhood_circle_old_promise';
  poly.tone=dangerous?'nostalgic_possession':'old_friends';
  poly.trust=Math.round(CHILDHOOD_CIRCLE.ensure(L).trust);
  poly.members=people.slice(1).map(person=>{
    person.status='polycule';
    return{name:person.name,job:person.job,personality:person.personality,age:person.age,emoji:person.emoji,gender:person.gender,portrait:person.portrait};
  });
  L.childhoodCircleBond={active:true,since:S.day,route,members:CHILDHOOD_CIRCLE.MEMBERS.slice(),pressure:CHILDHOOD_CIRCLE.ensure(L).pressure};
  people.forEach(person=>RELATIONSHIPS.addMember(L,person,S.day));
  const group=RELATIONSHIPS.ensure(L).relationshipGroup;
  group.agreement.cohabiting=dangerous;
  group.agreement.publicity=dangerous?'private':'public';
  FAMILY.syncCaregivers(L,RELATIONSHIPS.caregiverNames(L));
}
function resolveChildhoodCircleEvent(choiceId){
  const eventId=S._childhoodCircleEvent,view=CHILDHOOD_CIRCLE&&CHILDHOOD_CIRCLE.event(eventId);
  const choice=view&&view.choices.find(item=>item.id===choiceId);if(!choice)return;
  const people=ensureChildhoodCircleCast();
  if(eventId==='reunion'&&choice.id==='sever'){
    CHILDHOOD_CIRCLE.resolve(S.life,eventId,choice);
    removeChildhoodCircleFromGame();
    const out=$('childhood-circle-outcome'),options=out&&out.parentElement.querySelector('.event-options');if(options)options.innerHTML='';
    out.innerHTML='<div class="story-ending"><b>🚪 단체방을 나갔습니다.</b><br>다섯 사람의 연락처, 만남 후보, 개인 사건과 세트 사건이 이번 인생에서 모두 사라집니다. 과거를 다시 부르는 우연도 발생하지 않습니다.</div><button id="childhood-circle-confirm" class="session-btn opening">이 인생에서는 다시 만나지 않는다</button>';
    addNews('🚪 닫힌 단체방 · 실패한 첫 하렘의 다섯과 완전히 단절했습니다','neutral');
    $('childhood-circle-confirm').addEventListener('click',()=>{const host=$('life-event');if(host){host.style.display='none';host.innerHTML='';}S._childhoodCircleEvent=null;renderLifePanel();autoSave();showNextImportantEvent();});
    renderLifePanel();autoSave();return;
  }
  people.forEach(person=>{
    person.affection=clamp((person.affection||0)+(choice.affection||0),0,100);
    person.trust=clamp((person.trust||0)+(choice.trust||0),0,100);
    addBondInteraction(person,'childhood-circle');
    if(eventId==='reunion')person.status=choice.id==='sever'?'acquaintance':'friend';
  });
  const state=CHILDHOOD_CIRCLE.resolve(S.life,eventId,choice);
  if(eventId==='motel_boundary'&&choice.rivalMotive){
    registerFactionMotive(
      'childhood_circle',
      '졸업 직전 조작 사건의 발주자',
      '지방 보관소의 원본 로그에서 경쟁 세력이 동아리 계정을 조작하고 성과 자료를 빼돌린 흔적이 발견됐다. 다섯 사람의 이별은 그 공작의 부수 피해였다.'
    );
  }
  if(eventId==='graduation'&&['old_promise','never_graduate'].includes(state.route))activateChildhoodCircleBond(state.route);
  if(eventId==='graduation'&&state.route==='cut_past')people.forEach(person=>person.status='acquaintance');
  const ending=eventId==='graduation'
    ?state.route==='never_graduate'
      ?'<div class="story-ending down"><b>🎓 끝나지 않은 졸업식</b><br>다섯은 전원 연인이 되었습니다. 외출과 연락은 늘 오래된 기억의 검증을 거치며, 새로 생긴 모습은 다섯이 기억하는 “원래 당신” 쪽으로 되돌려집니다.</div>'
      :state.route==='old_promise'
        ?'<div class="story-ending"><b>🧷 처음이 아닌 첫날</b><br>다섯은 각자의 잘못을 인정하고 관리자 권한을 돌려준 뒤, 오늘의 동의로 전원 연인이 되었습니다.</div>'
        :'<div class="story-ending"><b>📕 닫힌 졸업앨범</b><br>주인공은 과거의 소유권을 거절했습니다. 다섯은 옛 동창으로 남았고 단체방은 다시 조용해졌습니다.</div>'
    :'';
  const reaction=choice.id==='present'?'다섯은 불만스러운 눈으로 서로를 보다가, 이번만큼은 현재의 대답을 먼저 듣기로 했습니다.'
    :choice.id==='rewind'?'다섯은 각자 자신이 가장 정상이라고 주장하면서도, 주인공을 예전 자리로 돌려놓는 일에는 완벽하게 합의했습니다.'
    :'단체방 알림이 차례로 꺼졌습니다. 아무도 붙잡지 않았지만 다섯 모두 마지막 접속 시간을 확인했습니다.';
  const out=$('childhood-circle-outcome'),options=out&&out.parentElement.querySelector('.event-options');if(options)options.innerHTML='';
  const changedMood=childhoodCircleNarrative(state);
  out.innerHTML=`<div class="oc-text">${reaction}</div><div class="oc-changes ${changedMood.tone}"><b>${changedMood.title}</b> · ${changedMood.detail}</div>${ending}<button id="childhood-circle-confirm" class="session-btn opening">확인</button>`;
  addNews(`${view.icon} 한 번씩 헤어진 다섯 · ${view.title}`,choice.id==='rewind'?'bad':choice.id==='present'?'good':'neutral');
  $('childhood-circle-confirm').addEventListener('click',()=>{
    const host=$('life-event');if(host){host.style.display='none';host.innerHTML='';}
    S._childhoodCircleEvent=null;renderLifePanel();autoSave();showNextImportantEvent();
  });
  renderLifePanel();autoSave();
}

function showCharacterStory(name){
  const r=metRecord(S.life,name),story=r&&STORIES.get(r),chapter=r&&STORIES.next(r);if(!r||!story)return;
  if(FREEDOM_TRIO&&!FREEDOM_TRIO.canMeetOffline(S.life,r.name))return;
  if(!chapter){flashToast(STORIES.ensure(r).completed?'📖 이 사람과 나눌 이야기는 모두 들었습니다':'📖 아직은 꺼내지 않은 이야기가 있는 것 같습니다','neutral');return;}
  const host=$('life-event');if(!host)return;S._storyPerson=r;host.style.display='block';
  const continuity=STORIES.context?STORIES.context(r,chapter):'';
  const chapterScene=chapter.scene?`./assets/${chapter.scene}`:characterEventScene(r.name,chapter.index);
  host.innerHTML=`<div class="window event-window"><div class="title-bar event-bar"><div class="title-bar-text">📖 ${r.name} · ${chapter.title}</div><div class="title-bar-controls"><button aria-label="Close" id="story-x"></button></div></div><div class="window-body"><img class="life-scene-banner" src="${chapterScene}" alt="${r.name} 특별 이벤트 장면"><div class="date-profile"><img class="char-portrait" src="${characterPortrait(r,chapter.index===1?'sad':'neutral')}" alt="${r.name}"><div><strong>${chapter.title}</strong><br><span class="muted">${story.theme}</span></div></div>${continuity?`<div class="story-continuity">🧷 ${continuity}</div>`:''}<div class="event-desc">${chapter.desc}</div>${chapter.speaker?`<div class="story-dialogue"><b>${r.name}</b> “${chapter.speaker}”</div>`:''}<div class="event-options">${chapter.choices.map(c=>`<button class="event-opt" data-story-choice="${c.id}">${c.text}</button>`).join('')}<button class="event-opt" id="story-close">지금은 답하지 않는다</button></div><div class="event-outcome" id="story-outcome"></div></div></div>`;
  host.querySelectorAll('[data-story-choice]').forEach(b=>b.addEventListener('click',()=>resolveCharacterStory(b.dataset.storyChoice)));
  [$('story-x'),$('story-close')].forEach(b=>{if(b)b.addEventListener('click',closeCharacterStory);});
}
function closeCharacterStory(){
  const h=$('life-event');if(h){h.style.display='none';h.innerHTML='';}
  S._storyPerson=null;
  if(S._storyFromQueue){S._storyFromQueue=false;showNextImportantEvent();return;}
  if(S.phase==='closed'&&S.monthCloseContext&&S.monthCloseContext.active)renderCurrentMonthCloseStep();
}
/* 호감도 조건이 충족되면 개인 스토리를 클릭 없이 자동으로 꺼내 온다 —
 * 챕터마다 한 번만 제시하고, 미뤄두면 인맥 목록의 📖 버튼으로 다시 볼 수 있다. */
function queueAvailableStories(L){
  ensureMet(L).forEach(m=>{
    if(FREEDOM_TRIO&&!FREEDOM_TRIO.canMeetOffline(L,m.name))return;
    const active=RELATIONSHIPS.isPartner(L,m.name)||['friend','casual','partner','polycule','lover'].includes(m.status);
    if(!active)return;
    const st=STORIES.get(m);if(!st)return;
    const chapter=STORIES.next(m);if(!chapter)return;              // 호감도 조건 충족 & 미완결
    const state=STORIES.ensure(m);
    if((state.offeredChapter==null?-1:state.offeredChapter)>=state.chapter)return;  // 이번 챕터는 이미 자동 제시함
    state.offeredChapter=state.chapter;
    queueImportantEvent({type:'love',story:true,personName:m.name,scene:chapter.scene?`./assets/${chapter.scene}`:characterEventScene(m.name,chapter.index),icon:'📖',
      title:`${m.name}와의 이야기 · ${chapter.title}`,
      desc:`${m.name}와(과)의 사이가 깊어지자, 지금까지 보이지 않던 사정이 드러나기 시작했습니다.`,
      detail:`평소와 다른 연락이 왔습니다. ${m.name}에게는 아직 끝내지 못한 이야기가 있는 것 같습니다.`,tone:'neutral'});
  });
}
function resolveCharacterStory(choice){
  const r=S._storyPerson,result=r&&STORIES.apply(r,choice);if(!result)return;
  if(r.name==='한채린'&&CHAR_TRAITS){
    const delta=result.choice.trait==='command'?12:result.choice.trait==='conspire'?6:result.choice.trait==='equal'?2:0;
    if(delta)CHAR_TRAITS.change(r,delta);
    if(result.choice.trait==='command')r.chaerinDefiance=(r.chaerinDefiance||0)+1;
  }
  if(r.childhoodFriend&&CHILDHOOD_CIRCLE){
    const circle=CHILDHOOD_CIRCLE.ensure(S.life);
    circle.pressure=clamp((circle.pressure||0)+(result.choice.obsession||0),0,100);
    circle.trust=clamp((circle.trust||0)+(result.choice.trait==='present'?6:result.choice.trait==='rewind'?1:-4),0,100);
  }
  if(!S._storyFromQueue)markMonthAction('인맥');
  const out=$('story-outcome'),opts=out&&out.parentElement.querySelector('.event-options');if(opts)opts.innerHTML='';
  const storyScene=result.choice.tone==='good'?'storyGood':result.choice.tone==='bad'?'storyBad':'storyNeutral';
  const authored=window.QT_CHARACTER_DIALOGUE&&QT_CHARACTER_DIALOGUE.line(r,storyScene);
  const reaction=result.choice.reaction||authored||(result.choice.tone==='good'?'당신이 자기 편이라는 사실을 오래 기억하겠다고 했습니다.':result.choice.tone==='bad'?'필요할 때 외면당한 일을 쉽게 잊지 못할 것 같습니다.':'당신의 방식에 동의하진 않지만 결과를 지켜보기로 했습니다.');
  const lifeChanges=result.choice.effects?applyEventEffects(result.choice.effects):[];
  const endingScene=result.completed&&result.ending?characterStoryEndingScene(r,result.ending):null;
  const ending=result.completed&&result.ending?`<div class="story-ending">${endingScene?`<img class="relationship-scene" src="${endingScene}" alt="${result.ending.title} 엔딩 컷신">`:''}<b>📕 ${result.ending.title}</b><br>${result.ending.text}</div>`:'';
  const risk=dangerousRiskMeta(r);
  out.innerHTML=`<div class="oc-text"><b class="${result.choice.tone==='good'?'up':result.choice.tone==='bad'?'down':''}">${r.name}의 반응:</b> “${reaction}”${result.completed?'<br><b>개인 스토리 완결</b>':''}</div><div class="oc-changes">호감 ${result.choice.affection>=0?'+':''}${result.choice.affection} · 신뢰 ${result.choice.trust>=0?'+':''}${result.choice.trust}${risk?` · ${risk.label} ${result.choice.obsession>=0?'+':''}${result.choice.obsession}`:''}${lifeChanges.length?` · ${lifeChanges.join(' · ')}`:''}</div>${ending}<button id="story-confirm" class="session-btn opening">확인</button>`;
  pushPersonMessage(S.life,r,reaction,false);addNews(`📖 ${r.name} 개인 스토리 · ${result.chapter.title}`,result.choice.tone);$('story-confirm').addEventListener('click',closeCharacterStory);renderLifePanel();autoSave();
}
function characterStoryEndingScene(r,ending){
  if(!r||!ending)return null;
  if(r.name==='강유진')return{
    dangerous_dependence:'./assets/event-yujin-1111.png',
    accomplice:'./assets/event-yujin-night-call.png',
    equal:'./assets/event-yujin-riverside-date.png'
  }[ending.route]||'./assets/event-yujin-rain-rescue.png';
  if(r.name==='한채린')return{
    private_submission:'./assets/event-chaerin-golden-cage-ending.png',
    boardroom_pair:'./assets/event-chaerin-thrown-contract.png',
    equal:'./assets/event-chaerin-private-dinner.png'
  }[ending.route]||'./assets/event-chaerin-contract.png';
  if(r.name!=='윤세라')return null;
  return{
    mutual_salvation:'./assets/event-sera-story.png',
    mutual_captivity:'./assets/event-sera-mutual-captivity.png',
    shared_cage:'./assets/event-sera-mutual-captivity.png',
    anchored:'./assets/event-sera-shoulder-confession.png',
    distance:'./assets/event-sera-1.png'
  }[ending.route]||'./assets/event-sera-story.png';
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
  if(!mine){room.unread=(room.unread||0)+1;room.lastIncomingDay=S.day;}
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
  '한채린':['이번 주말 비워둬. 싫으면 지난번처럼 내 말 끊고 직접 거절해. 비서한테 핑계 대면 끝이야.','네가 전에 말한 문제, 사람 붙여서 해결했어. 고맙다고 비위 맞추면 다 취소할 거야.','일정 하나 보냈어. 그대로 따르면 재미없고, 마음에 안 들면 네가 다시 짜.'],
  '윤세라':['오늘은 어디 갔어요? 답장 천천히 해도 돼요. 그냥 무사한지만 궁금해서요.','편의점에 새 디저트 나왔어요. 친구끼리 하나씩 나눠 먹는 건 평범한 일이죠?','잠이 안 오면 연락해요. 저도 보통 깨어 있으니까 부담 갖지 마요.']
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
    {text:'영수증을 채린 앞에 던지고 내 일정에서 손 떼라고 한다',result:'채린은 불쾌한 표정으로 영수증을 구기면서도 비서에게 “앞으로는 반드시 물어봐. 저 사람이 또 화내야 하잖아”라고 지시했습니다.',affection:9,trust:8,danger:-3},
    {text:'편하니 앞으로도 맡기겠다며 고맙다고 한다',result:'채린은 눈에 띄게 흥미를 잃었습니다. 예약과 결제는 계속됐지만 당신은 특별한 사람이 아니라 관리하기 쉬운 자산에 가까워졌습니다.',affection:-4,trust:1,danger:6}
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
    {text:'장부를 찢고 사람에게 가격 매기는 버릇부터 고치라고 명령한다',result:'채린은 화를 내면서도 찢어진 종이를 한 장 챙겼습니다. 새 장부 첫 줄에는 “본인 동의”, 둘째 줄에는 “싫다고 말할 권리”가 추가됐습니다.',affection:11,trust:9,danger:-4},
    {text:'채린이 정한 생활을 받아들이고 지원에 감사한다',result:'모든 비용이 사라진 대신 당신의 일정도 줄었습니다. 채린은 만족하기보다 “이렇게 쉽게 받으면 재미없는데”라며 먼저 자리를 떴습니다.',affection:-5,trust:1,danger:9}
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
    {text:'계약서를 채린 쪽으로 던지고 내 생활에서 당장 손 떼라고 명령한다',result:'채린은 찢어진 계약서를 바라보다 웃었습니다. “그래, 그 말 들으려고 어디까지 허락하나 봤어.” 거친 거절이 오히려 관계의 선이 됐습니다.',affection:12,trust:9,danger:-7},
    {text:'내 생활을 전부 채린에게 맡기고 시키는 대로 하겠다고 한다',result:'다음 날 계좌와 집과 일정에 채린의 사람이 붙었습니다. 그러나 채린은 원하는 것을 얻은 사람보다 시험이 너무 쉽게 끝난 사람처럼 냉담해졌습니다.',affection:-6,danger:12}
  ]},
  sera_romance:{name:'윤세라',kind:'romance',min:55,scene:'./assets/event-sera-doorstep.png',icon:'🖤',title:'윤세라 · 우연을 그만둔 밤',desc:'연애나 하룻밤 이후, 세라는 더 이상 우연인 척하지 않습니다. 당신이 어디에 있는지 알고 싶은 마음을 사랑의 권리라고 부르기 시작했습니다.',choices:[
    {text:'연락 시간과 방문 규칙을 분명히 정한다',result:'세라는 싫어했지만 규칙을 메시지 상단에 고정했습니다. 아직은 약속이 집착보다 강합니다.',trust:7,danger:-10},
    {text:'불안하지 않게 항상 위치를 공유한다',result:'세라는 안심했습니다. 그리고 그 안심을 잃지 않기 위해 더 많은 것을 요구하기 시작했습니다.',affection:10,danger:18}
  ]},
  sera_reverse_outing:{name:'윤세라',kind:'romance',min:60,after:'sera_romance',scene:'./assets/event-sera-8.png',icon:'☔',title:'윤세라 · 너무 풀어준 외출',desc:'함께 걷는 내내 세라는 쇼윈도 반사로 뒤를 확인하고, 횡단보도마다 당신 소매를 붙들었습니다. 결국 “이런 건 잘못된 집착인 거 알아요. 오늘은 많이 참았어요”라고 사과하려는데, 당신의 대답이 예상과 달랐습니다.',choices:[
    {text:'“이 정도면 너무 풀어준 거 아니야? 아까 세 번이나 날 놓쳤잖아.”',result:'세라는 두 손을 모은 채 정말로 말문이 막혔습니다. “제가… 사과할 차례 아니었어요? 왜 당신이 더 이상한 말을 해요.” 처음으로 세라 쪽이 관계의 속도를 무서워했습니다.',affection:12,trust:4,danger:10,mutualObsession:1,flags:{seraReverseCourtship:true}},
    {text:'집착인 건 맞지만 오늘은 숨기지 말고 내 옆에서 걷자고 한다',result:'세라는 부끄러워하면서도 더는 우연을 연기하지 않았습니다. 손을 잡기 전에는 먼저 물었고, 놓쳐도 뛰어오지 않고 이름을 불렀습니다.',affection:8,trust:11,danger:-7,flags:{seraOutingBoundary:true}},
    {text:'잘못인 걸 알면 다음부터 따라오기 전에 먼저 연락하라고 한다',result:'세라는 당황한 얼굴로 고개를 끄덕였습니다. 그날 밤 위치 사진 대신 “같이 나가도 돼요?”라는 짧은 메시지가 왔습니다.',affection:5,trust:13,danger:-10,flags:{seraOutingBoundary:true}}
  ]},

  /* ── 강유진 · 일상/연애 외출 진행 ── (단정한 존댓말, 확인 질문, 보호가 통제로) */
  yujin_daily1:{name:'강유진',kind:'friend',min:27,after:'yujin_friend',scene:'./assets/event-yujin-riverside-date.png',icon:'🛒',title:'강유진 · 비번 날의 장보기',desc:'유진이 사복 차림으로 마트 앞에 서 있었습니다. “오늘은 근무 아니에요. 그냥… 혼자 장 보기 싫어서요.” 카트를 미는 내내 당신 냉장고 사정까지 확인 질문이 이어집니다.',choices:[
    {text:'같이 저녁 재료만 고르고 각자 계산한다',result:'유진은 “이게 친구 사이 적정 거리죠”라며 자기 몫을 따로 계산했습니다. 확인 질문은 많았지만 선은 지켰습니다.',affection:6,trust:9,happy:3,cash:-40000},
    {text:'유진이 당신 반찬까지 다 챙기게 둔다',result:'유진은 당신 일주일 식단을 통째로 계획했습니다. “끼니는 안전의 기본이에요.” 편했지만 냉장고 안까지 유진이 관리하게 됐습니다.',affection:9,trust:3,danger:8,cash:-70000}
  ]},
  yujin_daily2:{name:'강유진',kind:'friend',min:43,after:'yujin_warning',scene:'./assets/event-yujin-night-call.png',icon:'🌃',title:'강유진 · 야간근무 끝의 새벽 산책',desc:'교대를 마친 유진이 “집에 바로 가면 잠이 안 와서요”라며 새벽 강변을 함께 걷자고 합니다. 늘 남을 지키던 사람이 처음으로 자기 얘기를 꺼낼 듯 말 듯 합니다.',choices:[
    {text:'오늘은 경찰 말고 그냥 유진 얘기를 듣는다',result:'유진은 한참 망설이다 “구하지 못한 사람 꿈을 자주 꿔요”라고 털어놨습니다. 보호자 역할을 잠깐 내려놓은 밤이었습니다.',affection:7,trust:12,happy:2},
    {text:'피곤할 텐데 데려다주겠다며 동선을 챙긴다',result:'유진은 웃으며 “보호받는 것도 나쁘지 않네요”라고 했지만, 다음 날부터 당신의 새벽 귀가를 자기 일정에 넣었습니다.',affection:6,trust:4,danger:9}
  ]},
  yujin_romance2:{name:'강유진',kind:'romance',min:62,after:'yujin_romance',scene:'./assets/event-yujin-rain-rescue.png',icon:'🧳',title:'강유진 · 연인의 첫 여행, 실시간 위치',desc:'첫 커플 여행 첫날, 유진이 “위험한 동네도 있으니까 서로 위치 공유만 켜 둬요”라고 제안합니다. 걱정과 통제의 경계에 선 제안입니다.',choices:[
    {text:'여행 중엔 정해진 시간에만 연락하자고 정한다',result:'유진은 아쉬워하면서도 “불안은 제 몫이니 제가 관리할게요”라고 했습니다. 여행 내내 위치 대신 사진을 주고받았습니다.',trust:11,danger:-12,happy:4,cash:-300000},
    {text:'서로 안심되게 위치를 계속 공유한다',result:'유진은 눈에 띄게 편안해졌습니다. 다만 당신이 잠깐 신호가 끊긴 30분 동안, 유진은 이미 근처 지구대 번호를 찾고 있었습니다.',affection:9,danger:14,cash:-300000}
  ]},
  yujin_romance3:{name:'강유진',kind:'romance',min:72,after:'yujin_romance2',scene:'./assets/event-yujin-safehouse-ending.png',icon:'🔑',title:'강유진 · 열쇠와 비상 계획',desc:'유진이 당신 집 여벌 열쇠와 함께 “당신에게 무슨 일이 생기면 제가 1순위로 움직이게 해줘요”라는 비상 위임장을 내밉니다. 사랑인지 관제인지 구분이 흐려집니다.',choices:[
    {text:'열쇠는 받되 위임 범위는 응급 상황으로 못 박는다',result:'유진은 조항을 하나하나 줄이면서도 끝내 웃었습니다. “딱 여기까지. 대신 이 선은 제가 목숨 걸고 지킬게요.”',trust:13,danger:-14},
    {text:'전부 유진이 판단하도록 맡긴다',result:'유진은 처음으로 완전히 안도했습니다. 그날부터 당신의 병원·직장·가족 연락은 모두 유진을 거치게 됐습니다.',affection:12,danger:20}
  ]},

  /* ── 한채린 · 일상/연애 외출 진행 ── (격식 있는 반말·명령형, 관계를 가치·계약으로) */
  chaerin_daily1:{name:'한채린',kind:'friend',min:27,after:'chaerin_friend',scene:'./assets/event-chaerin-private-dinner.png',icon:'🛍️',title:'한채린 · 스타일링이라는 이름의 외출',desc:'채린이 폐점 후 백화점을 통째로 열어 두고 불렀습니다. “네 옷차림이 내 옆에 어울릴 수준은 돼야지. 착각하지 말고, 이건 투자야.”',choices:[
    {text:'“네 취향부터 별로야”라고 잘라 말하고 내 옷을 직접 고른다',result:'채린은 수행원들 앞에서 처음으로 면박을 듣고도 웃음을 참지 못했습니다. “그래, 그 말투 유지해. 옷은 네가 골라.”',affection:11,trust:8},
    {text:'채린이 골라 주는 대로 전부 받고 잘 어울리냐고 묻는다',result:'채린은 거울보다 휴대전화를 먼저 봤습니다. “시키는 대로 할 거면 굳이 내가 올 필요 없었네.” 선물은 남았지만 관심은 줄었습니다.',affection:-4,trust:1,danger:5}
  ]},
  chaerin_daily2:{name:'한채린',kind:'friend',min:43,after:'chaerin_warning',scene:'./assets/event-chaerin-thrown-contract.png',icon:'⛵',title:'한채린 · 주말 별장 초대',desc:'채린이 “주말 비워 뒀어. 이유는 도착해서 말해”라며 별장으로 불렀습니다. 수행원을 모두 물린 이상한 주말, 채린은 평소보다 말이 적습니다.',choices:[
    {text:'“외롭다고 말도 못 해서 사람을 납치하냐”고 면박을 준다',result:'채린은 화를 내다가 결국 “그래, 외로워서 불렀어. 됐어?”라고 처음으로 목적 없는 부탁을 인정했습니다.',affection:12,trust:10,danger:3},
    {text:'채린이 편할 때까지 아무것도 묻지 않고 시중을 든다',result:'채린은 편안해하기보다 점점 말이 없어졌습니다. 돌아가는 차 안에서 “다음에는 내가 하라는 것부터 거절해”라고 통보했습니다.',affection:-3,trust:2,danger:5}
  ]},
  chaerin_romance2:{name:'한채린',kind:'romance',min:62,after:'chaerin_romance',scene:'./assets/event-chaerin-contract.png',icon:'🥂',title:'한채린 · 재벌가 행사의 파트너',desc:'채린이 그룹 행사에 “내 파트너”로 당신을 세웁니다. 카메라와 임원들 앞에서, 채린은 당신을 소개하는 방식으로 관계의 지분을 정하려 합니다.',choices:[
    {text:'대본을 접어 채린에게 돌려주고 내 소개는 내가 한다고 선언한다',result:'임원들 앞에서 계획이 틀어졌는데도 채린은 숨기지 못하고 웃었습니다. “그래, 저 사람은 내 말 안 들어. 그래서 내 옆에 세웠어.”',affection:12,trust:11},
    {text:'채린이 짜 준 대본대로 완벽하게 연기한다',result:'행사는 완벽했고 기사도 좋았습니다. 하지만 채린은 당신을 연인보다 관리 가능한 자산처럼 대했고, 축하 연락도 비서에게 맡겼습니다.',affection:-5,danger:9,cash:2000000}
  ]},
  chaerin_romance3:{name:'한채린',kind:'romance',min:72,after:'chaerin_romance2',scene:'./assets/event-chaerin-golden-cage-ending.png',icon:'📜',title:'한채린 · 서명 앞의 두 사람',desc:'채린이 혼전 계약서와 후계 구도 편입 서류를 나란히 내밉니다. “네 인생을 내 장부에 넣어 줄게. 대신 이제 네 결정은 내 결재를 거쳐.”',choices:[
    {text:'소유 조항을 찢고 “네가 내 허락부터 받아”라고 명령한다',result:'채린은 망가진 계약서 위에 휴대전화를 내려놓고 웃었습니다. “이제야 청혼 같네. 밖에서는 내가, 여기서는 네가 결정해.”',affection:14,trust:12,danger:5},
    {text:'전부 채린의 설계대로 서명하고 고맙다고 한다',result:'부족할 것 없는 삶과 함께 모든 결재권이 채린에게 넘어갔습니다. 그런데 채린의 방문은 줄었습니다. 이미 완전히 굽힌 사람에게 확인받을 것은 남지 않았기 때문입니다.',affection:-8,danger:14,cash:5000000}
  ]},

  /* ── 윤세라 · 일상/연애 외출 진행 ── (조심스러운 존댓말, 말줄임·반복, 불안한 집착) */
  sera_daily1:{name:'윤세라',kind:'friend',min:27,after:'sera_friend',scene:'./assets/event-sera-three-chairs.png',icon:'🎨',title:'윤세라 · 작업실에 초대한 오후',desc:'세라가 처음으로 자기 작업실 문을 열었습니다. “여기… 아무도 안 들여요. 당신이 처음이에요.” 벽 한쪽엔 당신을 닮은 스케치가 몇 장 보입니다.',choices:[
    {text:'그림은 예쁘지만 나 몰래 그리진 말라고 부드럽게 말한다',result:'세라는 얼굴이 빨개져 “다음엔… 앞에서 그릴게요. 도망 안 가면요”라며 스케치를 상자에 넣었습니다.',affection:5,trust:11,danger:-4},
    {text:'모델이 되어 주겠다며 오래 앉아 준다',result:'세라는 몇 시간이고 붓을 놓지 않았습니다. “이 시간이 안 끝났으면… 아, 이상한 말 했죠?” 행복해 보였지만 눈이 자꾸 문을 확인했습니다.',affection:9,trust:4,danger:7,happy:4}
  ]},
  sera_daily2:{name:'윤세라',kind:'friend',min:43,after:'sera_warning',scene:'./assets/event-sera-convenience-date.png',icon:'🌌',title:'윤세라 · 목적지 없는 새벽 드라이브',desc:'세라가 “어디든 좋아요. 그냥… 지금 당신이랑만 있고 싶어서”라며 새벽 드라이브를 청합니다. 라디오도 끄고, 세라는 몇 번이나 당신 표정을 살핍니다.',choices:[
    {text:'좋았던 밤이라고 말해 주되 집 앞에서 인사한다',result:'세라는 “오늘은 여기까지… 맞죠? 그래도 괜찮아요”라며 스스로 문을 닫았습니다. 헤어짐을 견디는 연습을 조금 한 밤이었습니다.',affection:6,trust:10,danger:-5,cash:-50000},
    {text:'날이 밝을 때까지 계속 달린다',result:'세라는 처음으로 크게 웃었습니다. 다만 해가 뜨자 “이 밤이 끝나면 또 혼자죠?”라며 당신 소매를 오래 놓지 못했습니다.',affection:10,danger:10,happy:3,cash:-50000}
  ]},
  sera_romance2:{name:'윤세라',kind:'romance',min:66,after:'sera_reverse_outing',scene:'./assets/event-sera-7.png',icon:'📷',title:'윤세라 · 우리라는 증거',desc:'세라가 같은 방에서 찍은 셀카와 커플 계정을 보여 줍니다. “우리가 진짜라는 걸… 남들도 알면 제가 덜 불안할 것 같아서요. 이상한가요?” 사진 속 세라는 행복하지만, 게시 시각은 당신 일정표와 정확히 맞아 있습니다.',choices:[
    {text:'우리 관계는 남에게 증명할 필요 없다고 안심시킨다',result:'세라는 울먹이며 “그 말… 저장해도 돼요? 불안할 때 볼게요”라고 했습니다. 증거 대신 약속을 믿어 보기로 했습니다.',trust:10,danger:-10,flags:{seraProofBoundary:true}},
    {text:'세라가 안심하게 커플 공개와 실시간 기록을 전부 받아들인다',result:'세라는 환하게 웃으며 프로필을 바꿨습니다. 그날부터 사진이 없는 시간은 “왜 안 올렸어요?”라는 질문으로 돌아왔고, 다른 연락처는 사진 밖으로 밀려나기 시작했습니다.',affection:10,danger:16,flags:{seraPublicProof:true}}
  ]},
  sera_romance3:{name:'윤세라',kind:'romance',min:74,after:'sera_romance2',scene:'./assets/event-sera-mutual-captivity.png',icon:'🔑',title:'윤세라 · 복사한 열쇠 두 개',desc:'세라가 손바닥 위에 똑같은 열쇠 두 개를 올려놓습니다. “하나는 당신 것, 하나는 제 것. 언제든 들어오는 권리 말고… 언제든 돌아올 수 있다는 뜻이면 안 돼요?”',choices:[
    {text:'열쇠는 돌려주고 올 때는 꼭 먼저 연락하자고 정한다',result:'세라는 한참 손을 떨다 열쇠를 내려놓았습니다. “먼저 연락하는 것도… 사랑이라고 생각할게요.” 집착보다 약속을 택한 밤입니다.',trust:12,danger:-13},
    {text:'서로 언제든 들어올 수 있게 열쇠를 하나씩 나눠 갖는다',result:'세라는 열쇠 하나를 당신 손에 직접 쥐여 줬습니다. 다음 날부터 누가 누구를 기다리는지 구분하기 어려운 생활이 시작됐습니다.',affection:12,danger:20,mutualObsession:1,flags:{hasHomeKey:true}}
  ]}
};
function isDangerousHeroine(person){return!!person&&DANGEROUS_HEROINE_NAMES.includes(person.name);}
function dangerousRomanceActive(L,r){
  if(!isDangerousHeroine(r))return false;
  const partner=RELATIONSHIPS.isPartner(L,r.name);
  return partner||r.status==='casual'||!!r.spentNight||!!r.dangerAwakened;
}
function awakenDangerousHeroine(r,source){
  if(!isDangerousHeroine(r))return;
  r.dangerAwakened=true;r.dangerSource=source||r.dangerSource||'romance';
  if(source==='night'){r.spentNight=true;r.nightsTogether=(r.nightsTogether||0)+1;}
  if(r.name==='윤세라')r.obsession=Math.max(58,r.obsession||0);
  else r.dangerLevel=Math.max(28,r.dangerLevel||0);
}
const GROUP_CONFESSION_SCENES={
  dangerous:{
    icon:'🦂',title:'제1장 마지막 · 네 번째 열쇠를 받을 사람',scene:'./assets/event-trio-secure-home-ending.png',
    desc:'세 사람의 개인사와 악우 사건이 모두 끝난 뒤에야 같은 메시지가 도착했습니다. 유진은 보호를, 채린은 권력을, 세라는 집을 핑계로 쓰지 않고 처음으로 네 사람이 함께 사는 관계를 묻습니다.',
    line:'“이번에는 구해 주거나 사 주거나 따라온다는 말 말고 물을게요. 우리 셋과 같이 살래요?”',
    accept:'네 번째 열쇠를 받아 공동생활을 시작한다',reject:'세 사람의 열쇠를 전부 돌려준다',
  },
  freedom:{
    icon:'🏠',title:'제2장 마지막 · 말없이 늘어난 슬리퍼',scene:'./assets/event-freedom-trio-homecoming.png',
    desc:'게임에서 시작한 고민 상담과 각자의 개인사, 네 사람의 귀가 이야기가 모두 끝났습니다. 채원·유나·소희는 누구 한 명을 고르라는 대신 현관에 놓인 네 번째 슬리퍼를 가리킵니다.',
    line:'“우리 셋 다 같은 마음이에요. 싫으면 오늘 치울게요. 좋으면 그냥 여기 두고요.”',
    accept:'네 번째 슬리퍼를 신고 작은 집에 남는다',reject:'슬리퍼를 치우고 혼자 돌아간다',
  },
  business:{
    icon:'🏢',title:'제3장 마지막 · 결재가 끝난 뒤의 네 이름',scene:'./assets/event-business-quartet-afterhours.png',
    desc:'자유인 3인조의 이야기를 지나 사업이 안정된 뒤, 네 책임자의 개인사와 다섯 번의 공동 이사회까지 모두 끝났습니다. 아무도 고용과 사랑을 거래하지 않는다는 규칙 아래 네 사람이 마지막 안건을 올립니다.',
    line:'“이 안건은 부결돼도 인사평가에 남지 않습니다. 그래도 네 사람 모두 같은 답을 기다리고 있어요.”',
    accept:'업무 밖에서 네 사람의 고백을 받아들인다',reject:'마지막 사적 안건을 부결한다',
  },
};
function groupRomanceModule(id){
  if(id==='dangerous')return DANGEROUS_TRIO;
  if(id==='freedom')return FREEDOM_TRIO;
  if(id==='business')return BUSINESS_ROMANCE;
  return null;
}
function groupRomanceEnding(id,kind){
  const module=groupRomanceModule(id);
  return module&&typeof module.romanceEnding==='function'?module.romanceEnding(kind):null;
}
function groupStoryComplete(id,L=S.life){
  if(id==='dangerous')return !!(DANGEROUS_TRIO&&DANGEROUS_TRIO.storyComplete(L));
  if(id==='freedom')return !!(FREEDOM_TRIO&&FREEDOM_TRIO.storyComplete(L));
  if(id==='business')return !!(BUSINESS_ROMANCE&&BUSINESS_ROMANCE.storyComplete(L));
  if(id==='childhood'){
    const state=CHILDHOOD_CIRCLE&&CHILDHOOD_CIRCLE.ensure(L);
    return !!(state&&(state.stage==='complete'||state.stage==='removed'||state.route));
  }
  return false;
}
function groupConfessionReady(id,L=S.life){
  if(!ROMANCE_ROUTES||!ROMANCE_ROUTES.groupConfessionAvailable(L,id))return false;
  if(id==='dangerous')return !!(DANGEROUS_TRIO&&DANGEROUS_TRIO.confessionReady(L));
  if(id==='freedom')return !!(FREEDOM_TRIO&&FREEDOM_TRIO.confessionReady(L));
  if(id==='business')return !!(BUSINESS_ROMANCE&&BUSINESS_ROMANCE.confessionReady(L));
  return false;
}
function lockGroupRomance(id,reason){
  if(!ROMANCE_ROUTES||!id)return null;
  const result=ROMANCE_ROUTES.lockRomance(S.life,id,reason);
  const meta=ROMANCE_ROUTES.META[id];
  if(meta)meta.members.forEach(name=>{
    const person=metRecord(S.life,name);
    if(person&&!['ex','deceased'].includes(person.status)&&!RELATIONSHIPS.isPartner(S.life,name))person.status='friend';
  });
  return result;
}
function queueGroupConfession(L){
  if(!ROMANCE_ROUTES)return false;
  for(const id of ['dangerous','freedom','business']){
    if(!groupConfessionReady(id,L))continue;
    const confession=ROMANCE_ROUTES.confession(L,id);
    if(confession&&['queued','accepted','rejected'].includes(confession.status))continue;
    ROMANCE_ROUTES.setConfession(L,id,'queued');
    queueImportantEvent({groupConfession:true,groupId:id});
    return true;
  }
  return false;
}
function showGroupConfession(event){
  const id=event.groupId,meta=GROUP_CONFESSION_SCENES[id],host=$('life-event');
  if(!meta||!host||!groupConfessionReady(id)){showNextImportantEvent();return;}
  host.style.display='block';
  host.innerHTML=`<div class="window event-window trio-route-window group-confession-window"><div class="title-bar event-bar"><div class="title-bar-text">${meta.icon} ${meta.title}</div></div><div class="window-body"><img class="life-scene-banner" src="${meta.scene}" alt="${meta.title}"><div class="event-desc">${meta.desc}</div><div class="story-dialogue"><b>${ROMANCE_ROUTES.META[id].members.join(' · ')}</b> ${meta.line}</div><div class="event-options"><button class="event-opt opening" data-group-confession="accept"><b>${meta.accept}</b></button><button class="event-opt hot" data-group-confession="reject"><b>${meta.reject}</b><span>공동생활 직전의 거절은 이 그룹 고유 배드엔딩으로 이어집니다.</span></button></div><div class="event-outcome" id="group-confession-outcome"></div></div></div>`;
  S._groupConfession=id;
  host.querySelectorAll('[data-group-confession]').forEach(button=>button.addEventListener('click',()=>resolveGroupConfession(button.dataset.groupConfession)));
}
function showGroupRouteBadEnding(id,kind,context={}){
  const ending=groupRomanceEnding(id,kind),host=$('life-modal');
  if(!ending||!host)return false;
  S.paused=true;
  S.life.groupRouteBadEnding={groupId:id,kind,day:S.day,partner:context.partner||null,target:context.target||null};
  host.style.display='flex';host.className='life-modal-host group-route-ending-host';
  const names=ROMANCE_ROUTES.META[id].members.join(' · ');
  host.innerHTML=`<div class="window event-window captivity-ending-window"><div class="title-bar"><div class="title-bar-text">${ending.icon} ${ending.title}</div></div><div class="window-body"><img class="life-scene-banner" src="${ending.scene}" alt="${ending.title}"><div class="event-title">${ending.quote}</div><div class="event-desc">${ending.text}</div><div class="story-dialogue"><b>${names}</b>${context.partner?` · ${context.partner}의 순애 약속`:''}${context.target?` · ${context.target}에게 향한 두 번째 선택`:''}</div><div class="important-event-detail down">${ending.detail}</div><button id="group-ending-rewind" class="session-btn opening">↩️ 이 선택을 하기 전으로 돌아간다</button><button id="group-ending-restart" class="hot">🔁 완전히 새 인생 시작</button></div></div>`;
  $('group-ending-rewind').addEventListener('click',()=>{
    S.life.groupRouteBadEnding=null;S.paused=false;host.style.display='none';host.innerHTML='';host.className='life-modal-host';
    if(kind==='cohabitation_refusal')showGroupConfession({groupId:id});
    else closeDateModal();
    pauseUISync();renderLifePanel();autoSave();
  });
  $('group-ending-restart').addEventListener('click',()=>{localStorage.removeItem(LS_KEY);location.reload();});
  addNews(`${ending.icon} BAD END · ${ending.title}`,'bad');playSound('crash');autoSave();
  return true;
}
function resolveGroupConfession(choice){
  const id=S._groupConfession,host=$('life-event'),meta=GROUP_CONFESSION_SCENES[id];
  if(!id||!host||!meta)return;
  const options=host.querySelector('.event-options');if(options)options.innerHTML='';
  if(choice==='reject'){
    showGroupRouteBadEnding(id,'cohabitation_refusal');
    return;
  }else{
    ROMANCE_ROUTES.setConfession(S.life,id,'accepted');
    if(id==='dangerous')activateDangerousTrioBond();
    else if(id==='freedom')activateFreedomTrioBond(FREEDOM_TRIO.ensure(S.life).ending.id);
    else activateBusinessQuartetBond();
    $('group-confession-outcome').innerHTML=`<div class="oc-text up">${meta.accept}. 앞 장의 개인사와 합의가 공동 관계의 규칙으로 이어집니다.</div><button id="group-confession-confirm" class="session-btn opening">새 관계를 확인한다</button>`;
  }
  $('group-confession-confirm').addEventListener('click',()=>{S._groupConfession=null;closeLifeEvent();renderLifePanel();autoSave();showNextImportantEvent();});
  autoSave();
}
function queueNaturalDangerousEvents(L){
  if(DANGEROUS_TRIO){
    DANGEROUS_TRIO.resolveUnavailable(L);
    const state=DANGEROUS_TRIO.ensure(L);
    const prelude=DANGEROUS_TRIO.queuePrelude(L,S.day);
    if(prelude)queueImportantEvent({dangerousTrioPrelude:prelude.id});
    else if(DANGEROUS_TRIO.queue(L))queueImportantEvent({dangerousTrioStart:true});
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
function queueNaturalFreedomEvents(L){
  if(!FREEDOM_TRIO)return;
  FREEDOM_TRIO.resolveUnavailable(L);
  const counselingId=FREEDOM_TRIO.queueCounseling(L);
  if(counselingId){queueImportantEvent({freedomCounselingEvent:true,eventId:counselingId});return;}
  if(FREEDOM_TRIO.queueFirstOuting(L)){queueImportantEvent({freedomFirstOuting:true});return;}
  const personalId=FREEDOM_TRIO.queuePersonal(L);
  if(personalId){queueImportantEvent({freedomPersonalEvent:true,eventId:personalId});return;}
  const state=FREEDOM_TRIO.ensure(L);
  if(FREEDOM_TRIO.queue(L))queueImportantEvent({freedomTrioStart:true});
  else if(state.active&&state.encountered&&state.lastChapterDay!==S.day){
    state.lastChapterDay=S.day;queueImportantEvent({freedomTrioChapter:true});
  }
  const businessState=BUSINESS_ROMANCE&&BUSINESS_ROMANCE.ensure(L);
  if(FREEDOM_TRIO.storyComplete(L)&&businessState&&businessState.chaerinReferralPending&&!businessState.chaerinReferralGiven){
    const referral=noteChaerinSupportRefusal(L,'freedom-story-complete');
    if(referral)addNews(`👑 자유인 3인조의 장이 끝난 뒤 · ${referral.text}`,referral.given?'good':'neutral');
  }
}
function monthlyFreedomTrioAftermath(L){
  const bond=L.freedomTrioBond;if(!bond||!bond.active||!FREEDOM_TRIO)return;
  const state=FREEDOM_TRIO.ensure(L),event=FREEDOM_TRIO.nextAftermath(L);
  if(state.lastRecoveryDay!==S.day){
    state.lastRecoveryDay=S.day;
    const recovery=FREEDOM_TRIO.recovery?FREEDOM_TRIO.recovery(L):{happy:3,stress:-4,health:0,income:300000};
    L.happy=clamp((L.happy||0)+(recovery.happy||0),0,100);
    L.stress=clamp((L.stress||0)+(recovery.stress||0),0,100);
    L.health=clamp((L.health||0)+(recovery.health||0),0,100);
    S.capital+=recovery.income||0;
    bond.totalIncome=(bond.totalIncome||0)+(recovery.income||0);
    bond.totalStressRecovered=(bond.totalStressRecovered||0)+Math.max(0,-(recovery.stress||0));
  }
  if(event&&bond.lastAftermathDay!==S.day){
    bond.lastAftermathDay=S.day;queueImportantEvent({freedomTrioAftermath:true});return;
  }
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
    ['한채린','둘 다 조용히 해. 이 좁은 집을 고른 건 쟤야. 내 지원은 거절했으니 규칙도 직접 책임지게 둬.'],
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
    if(FREEDOM_TRIO&&!FREEDOM_TRIO.canContact(L,r.name))return;
    if(r.status==='ex'){ensureCourtship(r);return;}
    const active=RELATIONSHIPS.isPartner(L,r.name)||['acquaintance','friend','casual','lover','polycule'].includes(r.status);
    if(!active)return;
    if(!hasPersonalContact(r))return;
    const safeDangerFriend=isDangerousHeroine(r)&&r.status==='friend'&&!dangerousRomanceActive(L,r);
    const risk=dangerousRiskMeta(r),obsession=risk?risk.value:0;
    const gettingCloser=['acquaintance','friend'].includes(r.status)&&!courtshipReadiness(r).ready;
    const earlyContact=!r.childhoodFriend&&r.name!=='윤세라'&&!establishedContactStatus(r.status)&&
      ((r.affection||0)<25||(r.trust||0)<12||(r.interactions||0)<4);
    const chance=safeDangerFriend?(r.name==='윤세라'?.72:earlyContact?.10:.16):earlyContact?.10:gettingCloser?.18:.22+(obsession/170)+(r.special?.12:0);
    if(Math.random()>chance)return;
    const ctx={tag:relationTag(L,r.name),personality:r.personality,special:r.special,
      obsession,affection:r.affection||0,idleMonths:r.idleMonths||0,
      earlyContact,
      married:RELATIONSHIPS.ensure(L).relationshipGroup.status==='committed'&&RELATIONSHIPS.isPartner(L,r.name),marketMood:mood};
    const childhoodLine=window.QT_CHILDHOOD_CIRCLE&&QT_CHILDHOOD_CIRCLE.line(r,'incoming');
    const line=safeDangerFriend?pick(DANGEROUS_FRIEND_LINES[r.name]):childhoodLine||(window.QT_CHAT&&QT_CHAT.incoming(r,ctx))||'가끔은 먼저 연락해줘요.';
    arrivals.push({r,line});
  });
  arrivals.sort(()=>Math.random()-.5).slice(0,1).forEach(({r,line})=>{
    pushPersonMessage(L,r,line,false);
    queueImportantEvent({monthlyMessage:true,targetType:'person',personName:r.name,text:line});
  });
}
function monthlySocialMessages(L){
  const arrivals=[];
  (SOCIAL.ensure(L).contacts||[]).forEach(c=>{
    if(SOCIAL.isSubordinate&&SOCIAL.isSubordinate(c))return;
    const isConcernedParent=['father','guardian'].includes(c.role)&&L.originNarrativeVersion===2;
    const chance=isConcernedParent?.42:c.role==='mother'?.24:c.role==='schoolfriend'?.18:.08;
    if(Math.random()>chance)return;
    arrivals.push(c);
  });
  arrivals.sort(()=>Math.random()-.5).slice(0,1).forEach(c=>{
    const line=SOCIAL.contactLine(c);pushPersonMessage(L,c,line,false);
    queueImportantEvent({monthlyMessage:true,targetType:'contact',targetId:c.id,text:line});
  });
}
function showFreedomGuildEvent(eventId){
  const event=FREEDOM_TRIO&&FREEDOM_TRIO.guildEvent(eventId),host=$('life-event');if(!event||!host)return;
  S._freedomGuildEvent=eventId;host.style.display='block';
  const members=FREEDOM_TRIO.GUILD_MEMBERS.map(member=>`<div class="trio-dialogue"><span class="pixel-news-avatar">${member.avatar}</span><div><b>${member.nickname}</b><p>“${member.line}”</p></div></div>`).join('');
  host.innerHTML=`<div class="window event-window freedom-trio-window"><div class="title-bar event-bar"><div class="title-bar-text">🎮 온라인 길드 · ${event.title}</div></div><div class="window-body"><img class="life-scene-banner" src="${event.scene}" alt="${event.title}"><div class="trio-dialogues">${members}</div><div class="event-desc">${event.desc}</div><div class="important-event-detail">첫 실제 외출 전 · 게임한 밤 ${FREEDOM_TRIO.ensure(S.life).gameSessions}회 · 파티의 온기 ${Math.round(FREEDOM_TRIO.ensure(S.life).guildWarmth)}</div><div class="event-options">${event.choices.map(choice=>`<button class="event-opt" data-guild-choice="${choice.id}">${choice.text}</button>`).join('')}</div><div class="event-outcome" id="freedom-guild-outcome"></div></div></div>`;
  host.querySelectorAll('[data-guild-choice]').forEach(button=>button.addEventListener('click',()=>resolveFreedomGuildEvent(button.dataset.guildChoice)));
}
function resolveFreedomGuildEvent(choiceId){
  const eventId=S._freedomGuildEvent,result=FREEDOM_TRIO&&FREEDOM_TRIO.resolveGuild(S.life,eventId,choiceId),host=$('life-event');if(!result||!host)return;
  if(result.reveal){
    FREEDOM_TRIO.NAMES.forEach(name=>{
      const character=D.CHARACTERS.find(person=>person.name===name);if(!character)return;
      const rec=rememberPerson(character,'friend');rec.affection=Math.max(rec.affection||0,20);rec.trust=Math.max(rec.trust||0,18);rec.guildFriend=true;unlockPersonalContact(rec);
      const guild=FREEDOM_TRIO.GUILD_MEMBERS.find(member=>member.name===name);rec.guildNickname=guild&&guild.nickname;
      pushPersonMessage(S.life,rec,`${guild.nickname} 말고 ${name}(이)라고 불러도 돼요. 그래도 게임에서는 원래대로 불러줘요.`,false);
    });
    addNews('🎮 막차요정·무보정·쉼표의 정체가 영상통화에서 채원·유나·소희로 공개됐습니다','good');
  }
  const options=host.querySelector('.event-options');if(options)options.innerHTML='';
  $('freedom-guild-outcome').innerHTML=`<div class="oc-text ${result.choice.warmth<0?'down':'up'}">${result.choice.result}</div><div class="oc-changes">파티의 온기 ${result.choice.warmth>=0?'+':''}${result.choice.warmth}</div><button id="freedom-guild-confirm" class="session-btn opening">${result.reveal?'세 사람의 연락처를 확인한다':'게임을 종료한다'}</button>`;
  $('freedom-guild-confirm').addEventListener('click',()=>{
    S._freedomGuildEvent=null;
    host.style.display='none';host.innerHTML='';renderLifePanel();autoSave();
  });
  renderLifePanel();autoSave();
}
function showFreedomRevealHomecoming(){
  const pending=S._freedomRevealReturn,host=$('life-event');if(!pending||!host)return;
  const romantic=DANGEROUS_HEROINE_NAMES.map(name=>metRecord(S.life,name)).filter(person=>person&&RELATIONSHIPS.isPartner(S.life,person.name));
  const cast=pending.trio?DANGEROUS_HEROINE_NAMES.map(name=>metRecord(S.life,name)).filter(Boolean):romantic;
  if(!cast.length){S._freedomRevealReturn=null;host.style.display='none';host.innerHTML='';return;}
  const reactions={
    '강유진':'게임 친구의 성별을 보고할 의무는 없어요. 나도 알아요. 그래도 여자 셋이었다는 말을 남한테 먼저 들으니까 기분이 좋지는 않네요.',
    '한채린':'막차요정, 무보정, 쉼표. 별명부터 너무 안심시켰네. 그래서 셋 중 누구 옆에 앉았죠? 대답을 강요하는 건 아니고, 틀리면 기분 나쁠 뿐이야.',
    '윤세라':'밖에 나갈 수 있어서 다행이라고 생각했어요. 정말로요. 그런데 여자 세 명이라고는 안 했잖아요. 다음에도 보내줄 수 있게, 오늘 이야기는 전부 해줘요.'
  };
  const rows=cast.map(person=>`<div class="trio-dialogue"><img src="${characterPortrait(person)}" alt="${person.name}"><div><b>${person.name}</b><p>“${reactions[person.name]}”</p></div></div>`).join('');
  host.style.display='block';
  host.innerHTML=`<div class="window event-window trio-route-window"><div class="title-bar event-bar"><div class="title-bar-text">🏠 게임 모임 뒤, 불 켜진 집</div></div><div class="window-body"><img class="life-scene-banner" src="./assets/event-sera-three-chairs.png" alt="게임 모임 뒤 집에서 기다리던 위험한 인연"><div class="event-desc">세 사람은 모임을 방해하지 않았습니다. 대신 현관문이 닫히자, 보내줄 때 삼킨 불안과 알림으로 먼저 들은 사실을 각자의 방식으로 꺼냅니다.</div><div class="trio-dialogues">${rows}</div><div class="event-options"><button class="event-opt" data-freedom-return="honest">현장에서 처음 알았고 게임 친구로 저녁만 먹었다고 차분히 설명한다</button><button class="event-opt" data-freedom-return="tease">“질투했어?”라고 웃으며 먼저 묻는다</button><button class="event-opt" data-freedom-return="boundary">게임 친구의 성별까지 사전 보고하지는 않겠다고 선을 긋는다</button></div><div class="event-outcome" id="freedom-return-outcome"></div></div></div>`;
  host.querySelectorAll('[data-freedom-return]').forEach(button=>button.addEventListener('click',()=>resolveFreedomRevealHomecoming(button.dataset.freedomReturn,cast)));
}
function resolveFreedomRevealHomecoming(choiceId,cast){
  const effects={
    honest:{affection:2,trust:5,obsession:-2,happy:3,text:'당신이 처음부터 끝까지 숨기지 않고 말하자 질문은 심문이 아니라 대화가 됐습니다. 세라는 다음 외출도 보내주겠다고 했고, 유진과 채린은 각자의 확인 수단을 한 걸음 물렸습니다.'},
    tease:{affection:5,trust:1,obsession:4,happy:5,text:'부정하는 목소리가 세 방향에서 겹쳤습니다. 아무도 질투라는 말을 인정하지 않았지만, 그날 밤 세 사람의 연락은 평소보다 오래 이어졌습니다.'},
    boundary:{affection:-1,trust:4,obsession:-5,happy:1,text:'분위기는 잠시 차가워졌지만 누구도 모임을 취소하라고 말하지 못했습니다. 당신이 다시 밖으로 나갈 수 있게 된 일을 지키는 것이 관계를 안심시키는 것보다 먼저라는 경계가 남았습니다.'}
  };
  const effect=effects[choiceId]||effects.honest;
  cast.forEach(person=>{
    person.affection=clamp((person.affection||0)+effect.affection,0,100);
    person.trust=clamp((person.trust||0)+effect.trust,0,100);
    if(person.name==='윤세라')person.obsession=clamp((person.obsession||0)+effect.obsession,0,100);
  });
  S.life.happy=clamp((S.life.happy||0)+effect.happy,0,100);
  const options=$('life-event').querySelector('.event-options');if(options)options.innerHTML='';
  $('freedom-return-outcome').innerHTML=`<div class="oc-text">${effect.text}</div><div class="oc-changes">위험한 인연 호감 ${effect.affection>=0?'+':''}${effect.affection} · 신뢰 +${effect.trust}${cast.some(person=>person.name==='윤세라')?` · 윤세라 집착 ${effect.obsession>=0?'+':''}${effect.obsession}`:''}</div><button id="freedom-return-confirm" class="session-btn opening">오늘 이야기를 마친다</button>`;
  addNews('🏠 자유인 3인조 첫 모임 뒤 · 위험한 인연에게 숨기지 않은 귀가','neutral');
  $('freedom-return-confirm').addEventListener('click',()=>{S._freedomRevealReturn=null;closeLifeEvent();renderLifePanel();autoSave();showNextImportantEvent();});
  renderLifePanel();autoSave();
}
function monthlyRivalMessages(L){
  if(!RIVALS||!RIVALS.contactMessage)return;
  const faction=RIVALS.ensureFaction(L);
  const live=(S.bots||[]).map((bot,index)=>({bot,index})).filter(({bot})=>bot.contactUnlocked&&!bot.bankrupt);
  if(!live.length)return;
  const first=!Number.isFinite(L.lastRivalMessageDay);
  if(!first&&S.day-L.lastRivalMessageDay<1)return;
  if(!first&&Math.random()>.78)return;
  const recent=(faction.lastAttacker&&live.find(entry=>entry.bot.name===faction.lastAttacker))||null;
  const entry=recent||pick(live);
  const stocks=(S.stocks||[]).filter(stock=>stock.listed&&stock.type!=='etf'&&stock.history&&stock.history.length);
  let stock=null;
  if(stocks.length){
    const ranked=stocks.map(item=>({item,change:changeInfo(item).rate*100}));
    ranked.sort((a,b)=>entry.bot.style==='value'?a.change-b.change:entry.bot.style==='momentum'?Math.abs(b.change)-Math.abs(a.change):Math.random()-.5);
    stock=ranked[0];
  }
  const message=RIVALS.contactMessage(entry.bot,{day:S.day,contactReason:entry.bot.contactReason,lastAttacker:faction.lastAttacker,stock:{name:stock&&stock.item.name,change:stock&&stock.change}});
  L.lastRivalMessageDay=S.day;
  pushPersonMessage(L,entry.bot,message.text,false);
  queueImportantEvent({monthlyMessage:true,targetType:'rival',targetId:entry.index,text:message.text,rivalMessage:message});
}

function unlockRivalContact(bot,reason){
  if(!bot)return false;
  const first=!bot.contactUnlocked;
  bot.contactUnlocked=true;
  if(!Number.isFinite(bot.contactDay))bot.contactDay=S.day;
  if(!bot.contactReason)bot.contactReason=reason||'market_contact';
  return first;
}

function monthlyFactionMemberMessages(L){
  const faction=RIVALS.ensureFaction(L);
  if(!faction.level||!faction.members.length||Math.random()>.48)return;
  const member=faction.members.find(item=>(item.injuredMonths||0)<=0);
  if(!member)return;
  const contact=(SOCIAL.ensure(L).contacts||[]).find(item=>item.factionMemberId===member.sourceId);
  if(!contact)return;
  const women=ensureMet(L).filter(person=>(!FREEDOM_TRIO||FREEDOM_TRIO.canContact(L,person.name))&&person.gender!=='m'&&['friend','casual','partner','lover','polycule'].includes(person.status));
  const partners=RELATIONSHIPS.names(L);
  const loan=(L.loan||0)+(S.loan||0);
  let message;
  const sera=metRecord(L,'윤세라'),circle=L.childhoodCircleBond&&L.childhoodCircleBond.active;
  const businessWomen=BUSINESS_ROMANCE?BUSINESS_ROMANCE.IDS.filter(id=>BUSINESS_ROMANCE.staffState(L,id).hired):[];
  if(circle&&sera&&['friend','casual','partner','lover','polycule'].includes(sera.status))message='목숨이 여러 개입니까? 집에는 스토커가 열쇠를 들고 있고, 소꿉친구 다섯은 출입 기록을 맞춰 보고 있습니다. 신고해야죠. 아니, 경찰도 같이 저러네. 이 나라는 망했습니다.';
  else if(businessWomen.length===4)message='형님, 직원은 왜 전부 여자입니까? 우연이라고 하기엔 유통·제작·계약·현장까지 정확히 한 명씩인데요. 회사 조직도인지 소개팅 명단인지 저도 이제 모르겠습니다.';
  else if(circle)message='형님, 차라리 조직 생활할 때가 더 좋았습니다. 적은 밖에 있고 보고서라도 남기죠. 저 다섯 분은 형님 과거와 현재를 동시에 포위하고 있습니다.';
  else if(sera&&sera.yandere)message='세력 보고보다 먼저 묻겠습니다. 왜 윤세라 씨가 사무실 예비 열쇠를 갖고 있습니까? 정보원과 스토커는 종이 한 장 차이입니다.';
  else if(women.length>=5)message=`형님, 여사친이 ${women.length}명이나 되는데 일정표는 제가 봐도 위험합니다. 칼보다 단체 채팅방이 먼저 터지겠어요.`;
  else if(partners.length>=2)message=`형님 연애 사정은 안 묻겠습니다. 다만 ${partners.join(', ')} 쪽 일정과 작전 일정이 겹치면 저도 미리 알아야 합니다.`;
  else if(loan>=20000000)message=`빚이 ${won(loan)}원입니다. 체면보다 현금흐름부터 지키죠. 이번 달엔 공격보다 방어가 먼저입니다.`;
  else if((L.stress||0)>=75)message='형님, 요즘 답장이 짧고 판단도 급합니다. 오늘 작전은 제가 볼 테니 한 번 쉬십시오.';
  else if(faction.lastAttacker)message=`${faction.lastAttacker} 쪽 움직임 다시 잡았습니다. 바로 치진 말고, 형님 신호 올 때까지 기록부터 모으겠습니다.`;
  else message='이번 달은 조용합니다. 조용할 때 사람과 돈줄을 챙겨두는 게 세력 운영입니다.';
  pushPersonMessage(L,contact,message,false);
  queueImportantEvent({monthlyMessage:true,targetType:'subordinate',targetId:contact.id,text:message});
}

function monthlyChildhoodCircleBond(L){
  const bond=L.childhoodCircleBond,state=CHILDHOOD_CIRCLE&&CHILDHOOD_CIRCLE.ensure(L);
  if(!bond||!bond.active||!state)return;
  const people=CHILDHOOD_CIRCLE.MEMBERS.map(name=>metRecord(L,name)).filter(Boolean);
  if(bond.route==='never_graduate'){
    const outsider=ensureMet(L).find(person=>!CHILDHOOD_CIRCLE.MEMBERS.includes(person.name)&&['partner','lover','polycule','casual'].includes(person.status));
    const seraOutsider=outsider&&outsider.name==='윤세라';
    const pressureGain=outsider?(seraOutsider?16:12):3;
    state.pressure=clamp(state.pressure+pressureGain,0,100);
    bond.pressure=state.pressure;
    L.stress=clamp((L.stress||0)+(outsider?6:2),0,100);
    L.happy=clamp((L.happy||0)+1,0,100);
    if(outsider){
      const watcher=pick(people);
      const line=CHILDHOOD_CIRCLE.line(watcher,'boundary')||'새로 만난 사람이 네 과거까지 아는 건 아니잖아.';
      const prefix=seraOutsider?'주워 온 애한테 집 열쇠까지 줬더라. 걔가 네 위치를 찾는 동안 우리는 걔가 언제부터 따라왔는지 전부 맞춰 봤어.':'우리가 먼저였다는 말은 안 할게. 대신 이것만 기억해.';
      pushPersonMessage(L,watcher,`${prefix} ${line}`,false);
      addNews(`🎓 ${outsider.name}와(과)의 새 관계를 눈치챈 옛 동아리 전 연인 다섯이 연락·출입·결제 기록을 하나로 합쳤습니다`,'bad');
    }else if(Math.random()<.55){
      const watcher=pick(people),line=CHILDHOOD_CIRCLE.line(watcher,'incoming');
      if(line){pushPersonMessage(L,watcher,line,false);addNews(`📱 ${watcher.name}: ${line}`,'neutral');}
    }
    if(state.pressure>=85)addNews('🧷 다섯의 연락과 간섭이 일상을 덮기 시작했습니다. 현재의 선택보다 학창 시절의 습관을 더 진짜로 취급합니다','bad');
  }else if(bond.route==='old_promise'){
    state.pressure=clamp(state.pressure-3,0,100);
    state.trust=clamp(state.trust+2,0,100);
    bond.pressure=state.pressure;
    L.stress=clamp((L.stress||0)-1,0,100);
    if(Math.random()<.3){
      const friend=pick(people),line=CHILDHOOD_CIRCLE.line(friend,'warm');
      if(line)pushPersonMessage(L,friend,line,false);
    }
  }
}

function monthlyChildhoodForeshadow(L){
  if(!CHILDHOOD_CIRCLE||!CHILDHOOD_CIRCLE.foreshadow)return;
  const hint=CHILDHOOD_CIRCLE.foreshadow(L,S.day);if(!hint)return;
  if(hint.direct){
    const contact=(SOCIAL.ensure(L).contacts||[]).find(person=>['father','guardian','mother'].includes(person.role));
    if(contact)pushPersonMessage(L,contact,hint.text.replace(/^“|”$/g,''),false);
  }
  addNews(`${hint.icon} ${hint.title} · ${hint.text}`,'neutral');
}

function updateRelationships(L) {
  const met = ensureMet(L).filter(person=>!FREEDOM_TRIO||FREEDOM_TRIO.canContact(L,person.name));
  if (!met.length) return;
  const partnerNames = new Set(RELATIONSHIPS.names(L));
  const faded = [];
  met.forEach(m => {
    const activeJob=partnerNames.has(m.name)||['friend','casual','lover','polycule'].includes(m.status);
    if(activeJob){const jm=relationshipJobMod(m);m.affection=clamp((m.affection||0)+Math.sign(jm)*Math.min(2,Math.ceil(Math.abs(jm)/8)),0,100);}
    if (partnerNames.has(m.name)) { m.idleMonths = 0; return; }
    const room=personChat(L,m.name);
    const unansweredDay=Math.max(0,room.lastIncomingDay||0);
    const answeredDay=Math.max(0,room.lastReplyDay||0);
    // 단순히 장만 진행했다고 관계가 식지 않는다. 도착한 연락을 두 달 이상
    // 실제로 답하지 않았을 때만 방치로 판정한다.
    if(!unansweredDay||answeredDay>=unansweredDay){m.idleMonths=0;return;}
    m.idleMonths=Math.max(1,S.day-unansweredDay);
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
  const reachable = met.filter(m => m.status!=='ex'&&hasPersonalContact(m)&&(m.affection || 0) > 0);
  if (reachable.length && Math.random() < 0.3) {
    const who = pick(reachable);
    const line = ROMANCE.momentLine(who, 'news');
    if (line) addNews(`📮 ${who.name}: ${line}`, 'neutral');
  }
  monthlyRelationshipMessages(L);
  queueBondEncounter(L);
  updateCharacterSignatureSystems(L);
  monthlyChildhoodForeshadow(L);
  const childhoodEvent=CHILDHOOD_CIRCLE&&CHILDHOOD_CIRCLE.monthly(L);
  if(childhoodEvent)queueImportantEvent({childhoodCircleEvent:childhoodEvent});
  const crossEvent = CROSS_EVENTS && CROSS_EVENTS.monthly(L);
  if (crossEvent) queueImportantEvent({ crossEventId:crossEvent.id, storyBridge:!!crossEvent.storyBridge });
  queueNaturalDangerousEvents(L);
  queueNaturalFreedomEvents(L);
  queueGroupConfession(L);
  monthlyDangerousTrioAftermath(L);
  monthlyFreedomTrioAftermath(L);
  monthlyChildhoodCircleBond(L);
  const poly=ensurePolycule(L);
  if(poly.active&&poly.members.length){
    if((poly.mode==='dangerous_trio'||poly.mode==='dangerous_trio_success')&&DANGEROUS_TRIO){
      const warning=DANGEROUS_TRIO.monthly(L),trio=DANGEROUS_TRIO.ensure(L);poly.trust=Math.round(trio.stability);
      if(warning)addNews(`🦂 ${warning}`,'bad');
    }else if(poly.mode==='freedom_trio_success'&&FREEDOM_TRIO){
      const warning=FREEDOM_TRIO.monthly(L),trio=FREEDOM_TRIO.ensure(L);poly.trust=Math.round(trio.harmony);
      if(warning)addNews(`🛫 ${warning}`,'neutral');
    }else if((poly.mode==='childhood_circle_never_graduate'||poly.mode==='childhood_circle_old_promise')&&CHILDHOOD_CIRCLE){
      poly.trust=Math.round(CHILDHOOD_CIRCLE.ensure(L).trust);
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
 '한채린':['자기 명령을 거절해주길 기다린다','아첨하는 사람은 이름조차 기억하지 않던 채린이, 자기 말을 끊고 계약을 돌려보내는 당신의 무례를 사적인 애정으로 기다리기 시작했습니다.'],
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
  if(!CHAR_TRAITS)return;const active=new Set(['friend','casual','partner','lover','polycule']),results=CHAR_TRAITS.monthly(L,signatureContext(L));results.forEach(x=>{if((!FREEDOM_TRIO||FREEDOM_TRIO.canContact(L,x.rec.name))&&x.changed)signatureEvent(x);});
  ensureMet(L).forEach(r=>{if(!active.has(r.status)||(FREEDOM_TRIO&&!FREEDOM_TRIO.canContact(L,r.name)))return;const s=CHAR_TRAITS.system(r.name),st=CHAR_TRAITS.ensure(r);if(!s||!st)return;const stage=CHAR_TRAITS.stageOf(s,st.value);if(stage<3)return;
    if(r.name==='강유진'){r.menhera=true;r.affection=clamp((r.affection||0)+3,0,100);L.legalShield=Math.min(5,(L.legalShield||0)+1);L.stress=clamp((L.stress||0)+1,0,100);r.protectionEnjoyed=true;}
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

function seraStoryRoute(r){
  const state=r&&r.story;
  return r&&r.seraEndingRoute||state&&state.ending&&state.ending.route||null;
}
function seraCaptivityVariant(L,r,origin){
  if(origin==='club')return'club';
  const route=seraStoryRoute(r);
  const mutual=route==='mutual_captivity'
    &&RELATIONSHIPS.isPartner(L,r.name)
    &&(L.seraHousing==='cohabit'||r.hasHomeKey)
    &&(r.trust||0)>=45
    &&(r.mutualObsession||0)>=3;
  if(mutual)return'mutual';
  if(r.seraPublicProof)return'proof';
  if(route==='distance'||(r.seraRupture||0)>=3)return'abandonment';
  return'closed';
}
function updateObsession(L) {
  let captivity=null;
  ensureMet(L).forEach(r=>{
    if(L.dangerousTrioBond&&L.dangerousTrioBond.active&&isDangerousHeroine(r))return;
    if(r.name!=='윤세라'){if(!isDangerousHeroine(r)){r.obsession=0;r.obsessionGrowth=0;}return;}
    const specialObs=true;
    const active=dangerousRomanceActive(L,r);
    if(!active)return;
    const before=r.obsession||0;
    const neglect=Math.max(0,(r.idleMonths||0)-1);
    const loopGrace=r.name==='윤세라'&&L.seraLoop&&L.seraLoop.active&&(L.seraLoop.grace||0)>0;
    const storyRoute=seraStoryRoute(r);
    if(storyRoute==='mutual_salvation'){
      r.obsession=clamp(before-(neglect>=3?2:7),28,100);
      r.obsessionGrowth=1;
      if(r.obsession<70)r.yandere=false;
      if(before>=70&&r.obsession<70)queueImportantEvent({type:'love',scene:'./assets/event-sera-shoulder-confession.png',icon:'🌅',title:'윤세라 · 기다린 뒤의 귀가',desc:'세라는 위치를 확인하러 나오지 않고 약속한 시간까지 집에서 기다렸습니다. 당신도 약속대로 돌아와 문을 직접 열었습니다.',detail:'집착이 사랑의 증명 대신, 말할 수 있는 불안으로 내려오기 시작했습니다.',tone:'good'});
      return;
    }
    const growth=r.obsessionGrowth||(specialObs?5:r.personality==='obsessive'?4:1);
    const anchoredDelta=storyRoute==='anchored'?(neglect>=2?1+neglect:-3):null;
    r.obsession=clamp(before+(loopGrace?1:anchoredDelta==null?growth+(r.status==='casual'?5:3)+neglect*2:anchoredDelta),0,100);
    if(loopGrace)L.seraLoop.grace=Math.max(0,L.seraLoop.grace-1);
    if(r.name==='윤세라'&&r.obsession>=70)r.yandere=true; // 구버전 세이브·이미 임계치를 넘긴 기록 호환
    if(before<45&&r.obsession>=45)queueImportantEvent({type:'love',icon:'📱',title:`${r.name}의 확인`,desc:'답장이 늦자 부재중 전화와 메시지가 반복해서 쌓였습니다.',detail:'집착이 관심의 수준을 넘어 통제로 변하기 시작했습니다. 요구를 들어주거나 애매한 관계를 유지하면 더 빨리 올라갈 수 있습니다.',tone:'bad'});
    if(before<70&&r.obsession>=70){
      if(r.name==='윤세라'){r.yandere=true;queueImportantEvent({type:'love',scene:'./assets/event-sera-doorstep.png',icon:'🖤',title:'윤세라 · 얀데레 전환',desc:'새벽 두 시, 알려준 적 없는 집 앞에 세라가 서 있었습니다. “이제 우연인 척 안 해도 되죠?”',detail:'이후 병원·직장·취미·다른 사람과의 외출에도 세라가 나타날 수 있습니다. 관계를 끊는 것만으로는 즉시 멈추지 않습니다.',tone:'bad'});}
      else queueImportantEvent({type:'love',icon:'🚪',title:`${r.name}가 집 앞에 왔다`,desc:'알려준 적 없는 일정과 장소를 알고 기다리고 있었습니다.',detail:'관계를 분명히 정리하거나 주변 사람에게 도움을 구해야 할 위험 단계입니다.',tone:'bad'});
    }
    if(r.obsession>=95&&!L.captivityEnding){
      const storyState=r.story,traits=storyState&&storyState.traits||{};
      const mutualInProgress=storyState&&!storyState.completed
        &&(traits.fuse||0)>=2
        &&(traits.fuse||0)>Math.max(traits.anchor||0,traits.sever||0);
      if(mutualInProgress){
        r.obsession=94;
        if(!r.mutualThresholdSeen){
          r.mutualThresholdSeen=true;
          queueImportantEvent({type:'love',scene:'./assets/event-sera-lip-confession.png',icon:'🗝️',title:'윤세라 · 누가 먼저 잠그는지',desc:'세라가 현관 앞에서 열쇠를 숨기려다 멈췄습니다. 당신이 이미 안쪽 잠금장치에 손을 올리고 있었기 때문입니다.',detail:'“잠깐만요. 왜 당신이 먼저 그래요? 이러면… 제가 말려야 하는 쪽이잖아요.”',tone:'neutral'});
        }
      }else{
        L.captivityEnding=true;
        r.seraEndingVariant=seraCaptivityVariant(L,r);
        captivity=r;
      }
    }
  });
  ensureMet(L).filter(r=>!(L.dangerousTrioBond&&L.dangerousTrioBond.active)&&['강유진','한채린'].includes(r.name)&&dangerousRomanceActive(L,r)).forEach(r=>{
    const before=r.dangerLevel||28,signature=CHAR_TRAITS&&CHAR_TRAITS.ensure(r),sig=signature?signature.value||0:0;
    const pressure=r.name==='강유진'
      ? 5+Math.floor((L.stress||0)/30)+Math.floor(sig/35)+((L.loan||0)>0?2:0)
      : 4+Math.floor(sig/35)+Math.min(4,r.chaerinDefiance||0)+((r.story&&r.story.traits&&r.story.traits.command)||0)+(S.capital<0?1:0);
    r.dangerLevel=clamp(before+pressure,0,100);
    if(before<55&&r.dangerLevel>=55)queueImportantEvent({type:'love',scene:r.name==='강유진'?'./assets/event-yujin-night-call.png':'./assets/event-chaerin-thrown-contract.png',icon:r.name==='강유진'?'🚨':'👑',title:`${r.name} · 보호가 소유로 바뀌는 지점`,desc:r.name==='강유진'?'당신을 위험에서 떼어놓겠다는 유진의 계획이 직장과 연락처와 외출까지 포함하기 시작했습니다.':'채린의 지원이 계좌와 집과 일정의 결정권까지 가져가기 시작했습니다.',detail:'도움을 받는 동안 당신이 직접 결정할 수 있는 일이 눈에 띄게 줄었습니다.',tone:'bad'});
    if(before<78&&r.dangerLevel>=78)queueImportantEvent({type:'love',scene:r.name==='강유진'?'./assets/event-yujin-safehouse-ending.png':'./assets/event-chaerin-golden-cage-ending.png',icon:'🔐',title:`${r.name} · 출구가 줄어든다`,desc:r.name==='강유진'?'유진이 마련한 보호 숙소의 출입 기록에 당신 이름만 남았습니다.':'채린이 마련한 펜트하우스에서 당신 명의의 카드와 열쇠가 하나씩 작동을 멈췄습니다.',detail:'잠긴 문과 멈춘 카드가 더 늘어나기 전에 관계의 선을 다시 세워야 합니다.',tone:'bad'});
    if(r.dangerLevel>=95&&!L.captivityEnding){L.captivityEnding=true;captivity=r;}
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
    const moralPartner=pick(RELATIONSHIPS.consensualMembers(L)),per=D.PERSONALITIES[(moralPartner||{}).personality]||{};
    const sensitivity=['caring','frugal','homebody'].includes(per.key)?7:['free','lavish'].includes(per.key)?2:4;
    L.guilt=clamp(L.guilt+sensitivity,0,100);
    if(moralPartner&&L.guilt>=45&&Math.random()<.35){
      if(per.key==='obsessive'){
        const r=metRecord(L,moralPartner.name);if(r)r.obsession=clamp((r.obsession||0)+7,0,100);
        queueImportantEvent({type:'love',icon:'🖤',title:`${moralPartner.name}의 뒤틀린 안심`,desc:'잘못을 털어놓자 상대는 비난하는 대신 “이제 나한테 약점이 생겼네요”라고 말했습니다.',detail:'죄책감은 줄지 않았고 상대의 집착이 증가했습니다.',tone:'bad'});
      }else{
        RELATIONSHIPS.registerConflict(L,sensitivity,'도덕성 갈등',moralPartner.name,S.day);L.stress=clamp((L.stress||0)+5,0,100);
        queueImportantEvent({type:'love',icon:'⚡',title:`${moralPartner.name}와 도덕성 갈등`,desc:`${per.name||'상대'} 성향의 연인은 최근 선택들을 더는 모른 척하기 어렵다고 말했습니다.`,detail:`그룹 긴장도 +${sensitivity} · 스트레스 +5 · 죄책감 ${Math.round(L.guilt)}`,tone:'bad'});
      }
    }
  }
  if(L.guilt>=80){L.happy=clamp(L.happy-6,0,100);L.stress=clamp(L.stress+8,0,100);addNews('🌫️ 쌓인 죄책감 때문에 잠을 이루지 못했습니다','bad');}
}

function rewindDangerousRelationship(r){
  const L=S.life;
  RELATIONSHIPS.removeMember(L,r.name,'friend');
  const poly=ensurePolycule(L);
  if(!poly.members.length){poly.active=false;poly.mode=null;poly.trust=0;}
  r.status='friend';r.spentNight=false;r.nightsTogether=0;r.dangerAwakened=false;r.dangerSource=null;
  if(r.name==='윤세라'){
    r.obsession=55;r.yandere=false;r.mutualObsession=0;r.mutualCaptivityReady=false;r.mutualThresholdSeen=false;
    r.seraEndingVariant=null;r.seraPublicProof=false;r.seraReverseCourtship=false;r.seraEndingRoute='anchored';
    if(r.story&&r.story.ending)r.story.ending={route:'anchored',title:'윤세라 · 돌아올 시간을 아는 사람',text:'위험한 결말 직전으로 돌아와, 잠금장치 대신 기다릴 시간과 연락 약속을 다시 정했습니다.'};
  }else r.dangerLevel=42;
  L.captivityEnding=false;L.dangerousEnding=null;L.seraIntrusionDay=null;
  S.paused=false;
  resolveMonthCloseTerminal();
  addNews(`↩️ ${r.name}와 위험해지기 전, 친구 관계를 택한 시점으로 돌아갔습니다`,'neutral');
  autoSave();location.reload();
}
function showDangerousHeroineEnding(r){
  if(S.timer){clearInterval(S.timer);S.timer=null;}S.phase='closed';S.paused=true;
  const host=$('life-modal');if(!host)return;
  const yujin=r.name==='강유진',scene=yujin?'./assets/event-yujin-safehouse-ending.png':'./assets/event-chaerin-golden-cage-ending.png';
  const L=S.life;L.dangerousEnding={name:r.name,day:S.day};
  host.style.display='flex';host.className='life-modal-host captivity-meta-host';
  host.innerHTML=`<div class="window event-window captivity-ending-window"><div class="title-bar"><div class="title-bar-text">🔒 ${r.name} 배드엔딩 · ${yujin?'보호관찰':'황금 계약'}</div></div><div class="window-body"><img class="life-scene-banner" src="${scene}" alt="${r.name} 전용 감금엔딩 컷신"><div class="date-profile"><img class="char-portrait" src="${characterPortrait(r,'sad')}" alt="${r.name}"><div><strong>${r.name}</strong><br><span class="down">빠져나갈 문이 보이지 않습니다</span></div></div><div class="event-title">${yujin?'“밖이 위험한데 왜 굳이 나가려고 해요?”':'“네가 고를 수 있는 건 내가 준비한 것들뿐이야.”'}</div><div class="event-desc">${yujin?'유진은 사건과 빚과 위협에서 당신을 완벽히 분리했습니다. 문제는 그 안전가옥의 외출 허가도 유진이 쥐고 있다는 것입니다.':'채린은 빚과 집과 직업을 모두 해결했습니다. 대신 계좌, 열쇠, 일정표 어디에도 채린의 승인 없이 열리는 출구가 남지 않았습니다.'}</div><div class="important-event-detail">뒤늦게 경계를 세우려 했지만 이미 열쇠와 계좌와 연락처는 상대의 손에 넘어가 있었습니다.</div><button id="danger-ending-rewind" class="session-btn opening">↩️ 위험해지기 전 관계 선택으로 돌아가기</button><button id="danger-ending-restart" class="hot">🔁 완전히 새 인생 시작</button></div></div>`;
  $('danger-ending-rewind').addEventListener('click',()=>rewindDangerousRelationship(r));
  $('danger-ending-restart').addEventListener('click',()=>{localStorage.removeItem(LS_KEY);location.reload();});
  autoSave();playSound('crash');
}

function showCaptivityEnding(r,origin){
  if(S.timer){clearInterval(S.timer);S.timer=null;}S.phase='closed';S.paused=true;
  const host=$('life-modal');if(!host)return;host.style.display='flex';
  if(r.name!=='윤세라'){
    host.innerHTML=`<div class="window event-window"><div class="title-bar"><div class="title-bar-text">🔒 배드엔딩 · 닫힌 방</div></div><div class="window-body"><div class="date-profile"><img class="char-portrait" src="${characterPortrait(r,'sad')}" alt="${r.name}"><div><strong>${r.name}</strong><br><span class="down">집착 ${Math.round(r.obsession||100)}/100</span></div></div><div class="event-title">“이제 아무도 우리 사이를 방해하지 못해.”</div><div class="event-desc">반복된 통제 요구를 방치한 끝에 일상이 완전히 끊겼습니다. 이것은 사랑의 결말이 아니라 관계의 경고를 무시한 결과입니다.</div><button id="captivity-restart" class="hot">🔁 새 인생 시작</button></div></div>`;
    $('captivity-restart').addEventListener('click',()=>{localStorage.removeItem(LS_KEY);location.reload();});
    autoSave();playSound('crash');return;
  }
  const variant=origin||r.seraEndingVariant||seraCaptivityVariant(S.life,r);
  const mutual=variant==='mutual';
  const copies={
    club:{title:'지워진 밤',scene:'./assets/event-sera-doorstep.png',alt:'기억이 끊긴 밤의 윤세라',quote:'“즐거웠어요? 기억 안 나면 더 좋고요.”',desc:'클럽 입장 버튼을 누른 뒤의 기억이 없습니다. 눈을 뜬 곳은 세라와 살던 집이지만 휴대전화의 다른 연락처와 현관 손잡이가 사라져 있습니다. 세라는 애초에 혼자 나가는 선택 같은 건 없었다며 부서진 버튼 조각을 보여줍니다.'},
    proof:{title:'사진 밖에서 지워진 사람',scene:'./assets/event-sera-7.png',alt:'둘만의 사진을 남기는 윤세라',quote:'“사진에 없는 시간은 우리한테 필요 없잖아요.”',desc:'커플 계정에는 행복한 두 사람의 사진이 매일 올라옵니다. 대신 사진에 나오지 않는 친구, 직장, 세력 연락처는 하나씩 차단됐고 당신이 비어 있던 시간은 세라가 고른 사진으로 덮였습니다. 세상에는 완벽한 연인만 남았지만, 그 사진을 올리는 사람이 누구인지는 더는 중요하지 않습니다.'},
    abandonment:{title:'비어 있던 작업실',scene:'./assets/event-sera-1.png',alt:'비 내리는 골목의 윤세라',quote:'“이번에는 제가 먼저 버려질 이유가 없게 했어요.”',desc:'세라를 두고 말없이 떠났던 날들이 반복된 뒤, 이번에는 세라 쪽이 흔적 없이 사라졌습니다. 며칠 뒤 정신을 차린 곳은 처음 만났던 작업실을 그대로 옮긴 방입니다. 파산 통지서 자리에는 당신 이름이, 문밖의 빗소리 자리에는 세라의 발소리가 있습니다.'},
    mutual:{title:'서로 잠근 문',scene:'./assets/event-sera-mutual-captivity.png',alt:'두 개의 열쇠를 내미는 윤세라',quote:'“이번에는 제가 먼저 잠근 게 아니에요. 우리 둘이 같이 한 거예요.”',desc:'세라가 당신을 가둔 것도, 당신이 세라를 붙잡은 것도 아닙니다. 두 사람은 바깥에서 잃은 것과 서로에게 구해진 밤을 전부 이야기한 뒤, 두 개의 열쇠를 안쪽에 내려놓았습니다. 누가 구원자고 누가 피해자인지 지워진 채, 둘만의 생활은 가장 다정하고 가장 닫힌 모양으로 완성됩니다.'},
    closed:{title:'닫힌 방',scene:'./assets/event-sera-doorstep.png',alt:'잠긴 방 앞에 선 윤세라',quote:'“이제 아무도 우리 사이를 방해하지 못해.”',desc:'세라는 휴대전화와 열쇠를 치우고, 당신이 알던 일상의 흔적을 하나씩 지웠습니다. 이것은 사랑의 결말이 아니라 경고와 경계를 계속 미룬 결과입니다.'}
  };
  const copy=copies[variant]||copies.closed;
  const rescuers=mutual?[]:captivityRescuers(S.life);
  const rescueButtons=rescuers.map(rescuer=>`<button class="event-opt ${rescuer.success?'':'hot'}" data-captivity-rescue="${rescuer.id}">${rescuer.icon} ${rescuer.label}<small>${rescuer.hint}</small></button>`).join('');
  host.className='life-modal-host captivity-meta-host';
  S.life.dangerousEnding={name:r.name,variant,day:S.day};
  host.innerHTML=`<div class="window event-window captivity-ending-window"><div class="title-bar"><div class="title-bar-text">🔒 윤세라 ${mutual?'다크엔딩':'배드엔딩'} · ${copy.title}</div></div><div class="window-body"><img class="life-scene-banner" src="${copy.scene}" alt="${copy.alt}"><div class="date-profile"><img class="char-portrait" src="${characterPortrait(r,mutual?'happy':'sad')}" alt="${r.name}"><div><strong>${r.name}</strong><br><span class="${mutual?'muted':'down'}">${mutual?'상호집착 '+Math.round(r.mutualObsession||0)+' · 두 사람이 고른 폐쇄':'집착 '+Math.round(r.obsession||100)+'/100 · 얀데레 고착'}</span></div></div><div class="event-title">${copy.quote}</div><div class="event-desc" id="captivity-ending-text">${copy.desc}</div>${rescueButtons?`<div class="captivity-rescue-box"><b>문 밖에서 움직이는 사람들</b><div class="event-options">${rescueButtons}</div></div>`:mutual?'<div class="important-event-detail">구조 신호는 없습니다. 문밖에서 누군가 이름을 불러도, 두 사람 모두 서로의 대답만 듣고 있습니다.</div>':'<div class="important-event-detail">남겨 둔 증거도, 위기를 알아챌 만큼 가까운 사람도 없습니다.</div>'}<button id="captivity-rewind" class="session-btn opening">↩️ ${mutual?'문을 열어두는 약속으로 돌아가기':'위험해지기 전 관계 선택으로 돌아가기'}</button><button id="captivity-restart" class="hot">🔁 완전히 새 인생 시작</button></div></div>`;
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
  RELATIONSHIPS.removeMember(L,r.name,'ex');
  L.lovers=(L.lovers||[]).filter(person=>person.name!==r.name);
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
  resolveMonthCloseTerminal();
  LEGACY.push(S.life,dateInfo(S.day).age,copy.icon,`${copy.title}로 윤세라의 감금에서 탈출했다`,'love');
  host.className='life-modal-host';
  host.innerHTML=`<div class="window event-window"><div class="title-bar"><div class="title-bar-text">${copy.icon} 감금엔딩 분기 · 구조 성공</div></div><div class="window-body"><img class="life-scene-banner" src="${rescuerId==='yujin'?'./assets/event-yujin-rain-rescue.png':'./assets/life-faction-war.png'}" alt="${copy.title}"><div class="event-title">${copy.title}</div><div class="event-desc">${copy.text}</div><div class="important-event-detail">윤세라와 강제 이별 · 집착 ${r.obsession}/100 · 스트레스 +12<br>세라는 사라진 것이 아닙니다. 남겨 둔 증거와 보호망에 따라 이후 재등장 방식이 달라집니다.</div><button id="captivity-rescue-continue" class="session-btn opening">구조 이후의 삶 계속하기</button></div></div>`;
  $('captivity-rescue-continue').addEventListener('click',()=>{resolveMonthCloseTerminal();closeLifeModal();renderAll();renderMarketPhase();autoSave();});
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
  if(L.freedomTrioBond&&L.freedomTrioBond.active&&FREEDOM_TRIO&&FREEDOM_TRIO.NAMES.includes(name))return'작은 집의 연인';
  const relationshipLabel=RELATIONSHIPS.label(L,name);if(relationshipLabel)return relationshipLabel;
  const rec = metRecord(L, name);
  if (!rec) return '아는 사람';
  return rec.status === 'ex' ? '전 연인' : rec.status === 'friend' ? '친구' : rec.status === 'casual' ? '가벼운 관계' : '아는 사람';
}
function ensurePolycule(L){return RELATIONSHIPS.ensure(L).polycule;}
function relationshipImage(L,name){
  const tag=relationTag(L,name);
  if(tag==='위험한 결핍 공생')return'./assets/event-trio-secure-home-ending.png';
  if(tag==='작은 집의 연인')return'./assets/event-freedom-trio-home.png';
  if(tag==='합의한 다자연애')return'./assets/relationship-polycule.png';
  if(tag==='배우자')return'./assets/relationship-married.png';
  if(tag==='연인'||tag==='몰래 만나는 중')return'./assets/relationship-dating.png';
  if(tag==='가벼운 관계')return'./assets/relationship-casual.png';
  return'./assets/relationship-friend.png';
}

function renderChatPanel(){
  const host=$('chat-panel');if(!host||!S.life)return;const L=S.life;
  const knownPeople=ensureMet(L).filter(r=>!FREEDOM_TRIO||FREEDOM_TRIO.canContact(L,r.name));
  const blockedPeople=knownPeople.filter(r=>r.status==='ex').map(r=>{ensureCourtship(r);return r;});
  const people=knownPeople.filter(r=>r.status!=='ex'&&hasPersonalContact(r));
  const contacts=(SOCIAL.ensure(L).contacts||[]).slice().sort((a,b)=>{
    const priority=c=>SOCIAL.isSubordinate&&SOCIAL.isSubordinate(c)?0:['mother','father','guardian'].includes(c.role)?1:c.role==='schoolfriend'?2:3;
    return priority(a)-priority(b)||(b.trust||0)-(a.trust||0);
  });
  const subordinateContacts=contacts.filter(c=>SOCIAL.isSubordinate&&SOCIAL.isSubordinate(c));
  const networkContacts=contacts.filter(c=>!SOCIAL.isSubordinate||!SOCIAL.isSubordinate(c));
  const rivals=(S.bots||[]).map((bot,index)=>({bot,index})).filter(({bot})=>
    bot.contactUnlocked||((((L.chats||{})[bot.name]||{}).messages||[]).length>0)
  );
  if(S._chatRival!=null){
    const entry=rivals.find(item=>item.index===Number(S._chatRival));
    if(!entry){S._chatRival=null;return renderChatPanel();}
    const bot=entry.bot,room=personChat(L,bot.name);room.unread=0;
    const avatar=bot.portrait?`<img src="./assets/characters/${bot.portrait}" alt="${bot.leader}">`:`<span class="contact-avatar">📈</span>`;
    host.innerHTML=`<div class="chat-room rival-chat-room"><button id="chat-back">↩ 연락처</button><div class="contact-chat-head">${avatar}<div><b>${bot.name}</b> · ${bot.faction}<br><small>시장 경쟁자 · 관계 ${Math.round(bot.playerRelation||0)} · 지난달 손익 ${won(bot.monthlyProfit||0)}</small></div></div><div class="chat-log">${room.messages.length?room.messages.map(m=>`<div class="chat-bubble ${m.mine?'mine':''}"><small>${m.mine?'나':bot.leader} · ${dateInfo(m.day).year}년 ${dateInfo(m.day).month}월</small><br>${m.text}</div>`).join(''):'<span class="muted">아직 시장에 관한 연락이 없습니다.</span>'}</div><div class="chat-readonly-note">📊 경쟁자는 종목 수급·손익·세력 상황에 따라 월말에 먼저 연락합니다.</div></div>`;
    $('chat-back').addEventListener('click',()=>{S._chatRival=null;renderChatPanel();});
    const log=host.querySelector('.chat-log');if(log)log.scrollTop=log.scrollHeight;return;
  }
  if(S._chatContact){
    const c=contacts.find(x=>x.id===S._chatContact);if(!c){S._chatContact=null;return renderChatPanel();}
    const room=personChat(L,c.name),r=SOCIAL.role(c),subordinate=SOCIAL.isSubordinate&&SOCIAL.isSubordinate(c);room.unread=0;
    const member=subordinate?(RIVALS.ensureFaction(L).members||[]).find(item=>item.sourceId===c.factionMemberId):null;
    host.innerHTML=`<div class="chat-room contact-room ${subordinate?'subordinate-chat-room':''}"><button id="chat-back">↩ 연락처</button><div class="contact-chat-head"><span>${r.icon}</span><div><b>${c.name}</b> · ${c.relationLabel||r.name}<br><small>${subordinate?`부하 신뢰 ${Math.round(c.trust||0)}${member?` · 충성도 ${Math.round(member.loyalty||0)}`:''}`:`신뢰 ${Math.round(c.trust||0)} · 호의 ${c.favor||0}`}</small></div></div><div class="chat-log">${room.messages.length?room.messages.map(m=>`<div class="chat-bubble ${m.mine?'mine':''}"><small>${m.mine?'나':c.name} · ${dateInfo(m.day).year}년 ${dateInfo(m.day).month}월</small><br>${m.text}</div>`).join(''):'<span class="muted">아직 대화가 없습니다.</span>'}</div><div class="chat-readonly-note">${subordinate?'🛡️ 상황 보고는 월말 작전실 알림에서 확인하고 지시할 수 있습니다.':'🔒 연락은 장 마감 후 월말 팝업에서 한 번만 답할 수 있습니다.'}</div></div>`;
    $('chat-back').addEventListener('click',()=>{S._chatContact=null;renderChatPanel();});
    const log=host.querySelector('.chat-log');if(log)log.scrollTop=log.scrollHeight;return;
  }
  if(S._chatPerson){
    const r=metRecord(L,S._chatPerson);if(!r||r.status==='ex'||(FREEDOM_TRIO&&!FREEDOM_TRIO.canContact(L,r.name))){S._chatPerson=null;return renderChatPanel();}
    const room=personChat(L,r.name);room.unread=0;
    const ttsOn=S.ttsOn&&VOICE;
    const risk=dangerousRiskMeta(r);
    host.innerHTML=`<div class="chat-room"><button id="chat-back">↩ 연락처</button><img class="relationship-scene" src="${relationshipImage(L,r.name)}" alt="${relationTag(L,r.name)} 관계 장면"><div class="date-profile"><img class="char-thumb" src="${characterPortrait(r)}" alt="${r.name}"><div><b>${r.name}</b> · ${relationTag(L,r.name)}<br><span class="muted">호감 ${Math.round(r.affection||0)} · 신뢰 ${Math.round(r.trust||0)} · 교류 ${ensureCourtship(r).interactions||0}회${risk?` · ${risk.icon}${risk.label} ${Math.round(risk.value)}`:''}</span></div></div><div class="chat-log">${room.messages.length?room.messages.map((m,mi)=>`<div class="chat-bubble ${m.mine?'mine':''}"><small>${m.mine?'나':r.name} · ${dateInfo(m.day).year}년 ${dateInfo(m.day).month}월</small><br>${m.text}${m.mine||!ttsOn?'':`<button class="bubble-tts" data-msg-i="${mi}" title="${r.name} 목소리로 듣기" aria-label="음성 재생">🔊</button>`}</div>`).join(''):'<span class="muted">아직 대화가 없습니다.</span>'}</div><div class="chat-readonly-note">${S.phase==='open'?'📈 장중에는 대화 기록만 볼 수 있습니다. 새 연락은 장 마감 뒤 도착합니다.':'🔒 이번 달 연락은 월말 팝업에서 한 번만 답할 수 있습니다.'}</div></div>`;
    $('chat-back').addEventListener('click',()=>{if(VOICE)VOICE.cancel();S._chatPerson=null;renderChatPanel();});
    host.querySelectorAll('.bubble-tts').forEach(b=>b.addEventListener('click',ev=>{ev.stopPropagation();const m=room.messages[+b.dataset.msgI];if(m)speakPerson(r,m.text);}));
    const log=host.querySelector('.chat-log');if(log)log.scrollTop=log.scrollHeight;return;
  }
  const contactRow=c=>{const room=personChat(L,c.name),last=room.messages[room.messages.length-1],r=SOCIAL.role(c),subordinate=SOCIAL.isSubordinate&&SOCIAL.isSubordinate(c);return`<button class="chat-contact social-chat-contact ${subordinate?'subordinate-chat-contact':''}" data-chat-contact="${c.id}"><span class="contact-avatar">${r.icon}</span><span><b>${c.name}</b> · ${c.relationLabel||r.name}<br><span class="chat-preview">${last?last.text:subordinate?'아직 새 상황 보고가 없습니다.':'먼저 안부를 물어보세요.'}</span></span>${room.unread?`<span class="chat-unread">${room.unread}</span>`:''}</button>`;};
  const subordinateRows=subordinateContacts.map(contactRow).join('');
  const contactRows=networkContacts.map(contactRow).join('');
  const romanceRows=people.map(r=>{const room=personChat(L,r.name),last=room.messages[room.messages.length-1];return`<button class="chat-contact" data-chat-person="${r.name}"><img src="${characterPortrait(r)}" alt="${r.name}"><span><b>${r.name}</b> · ${relationTag(L,r.name)}<br><span class="chat-preview">${last?last.text:'대화를 시작해보세요.'}</span></span>${room.unread?`<span class="chat-unread">${room.unread}</span>`:''}</button>`;}).join('');
  const blockedRows=blockedPeople.map(r=>`<button class="chat-contact blocked-chat-contact" disabled><img src="${characterPortrait(r,'sad')}" alt="${r.name}"><span><b>${r.name}</b> · 전 연인<br><span class="chat-preview">내가 차단한 연락처 · 메시지 수신 안 함</span></span><span class="blocked-contact-mark">🚫</span></button>`).join('');
  const rivalRows=rivals.map(({bot,index})=>{const room=personChat(L,bot.name),last=room.messages[room.messages.length-1],avatar=bot.portrait?`<img src="./assets/characters/${bot.portrait}" alt="${bot.leader}">`:`<span class="contact-avatar">📈</span>`;return`<button class="chat-contact rival-chat-contact" data-chat-rival="${index}">${avatar}<span><b>${bot.name}</b> · ${bot.bankrupt?'파산·해산':bot.faction}<br><span class="chat-preview">${last?last.text:'아직 직접 연락은 없습니다.'}</span></span>${room.unread?`<span class="chat-unread">${room.unread}</span>`:''}</button>`;}).join('');
  host.innerHTML=`<div class="chat-list"><div class="hub-note">연락처는 적대 세력, 내 부하, 사적인 인맥과 연애 관계로 나뉩니다. 서로 다른 관계의 말투와 답장 선택지는 섞이지 않습니다.</div>${rivalRows?`<div class="chat-group-title">⚔️ 적대 세력</div>${rivalRows}`:''}${subordinateRows?`<div class="chat-group-title">🛡️ 내 세력·부하 보고</div>${subordinateRows}`:''}${contactRows?`<div class="chat-group-title">🏠 가족·친구·인맥</div>${contactRows}`:''}${romanceRows?`<div class="chat-group-title">💕 친구·연애 관계</div>${romanceRows}`:''}${blockedRows?`<div class="chat-group-title blocked-group-title">🚫 내가 차단한 연락처</div>${blockedRows}`:''}${!rivalRows&&!subordinateRows&&!contactRows&&!romanceRows&&!blockedRows?'<span class="muted">아직 저장된 연락처가 없습니다.</span>':''}</div>`;
  host.onclick=click=>{
    const rival=click.target.closest('[data-chat-rival]');
    if(rival&&host.contains(rival)){
      S._chatPerson=null;S._chatContact=null;S._chatRival=Number(rival.dataset.chatRival);
      renderChatPanel();autoSave();return;
    }
    const contact=click.target.closest('[data-chat-contact]');
    if(contact&&host.contains(contact)){
      S._chatPerson=null;S._chatRival=null;S._chatContact=contact.dataset.chatContact;
      renderChatPanel();autoSave();return;
    }
    const person=click.target.closest('[data-chat-person]');
    if(person&&host.contains(person)){
      S._chatContact=null;S._chatRival=null;S._chatPerson=person.dataset.chatPerson;
      renderChatPanel();autoSave();
      // 방을 열면 상대의 최근 메시지를 그 인물 목소리로 읽어준다(사람이 부르듯)
      const rr=metRecord(L,person.dataset.chatPerson),rm=rr&&personChat(L,rr.name);
      const last=rm&&[...rm.messages].reverse().find(m=>!m.mine);
      if(last)speakPerson(rr,last.text);
    }
  };
}
function replyToRival(bot,kind,message,options){
  const L=S.life,room=personChat(L,bot.name);options=options||{};
  if(room.lastReplyDay===S.day&&!options.popup){flashToast('📱 이번 달에는 이미 답장했습니다','neutral');return{ok:false};}
  room.lastReplyDay=S.day;
  const text=options.text||'수급과 장부를 다시 확인해보겠습니다.';
  pushPersonMessage(L,bot,text,true);
  const result=RIVALS.resolveContact(bot,kind,message)||{};
  unlockRivalContact(bot,'player_reply');
  const mentor=investmentMentorState(L);
  if(result.intel)mentor.skill=clamp(mentor.skill+result.intel,0,100);
  if(result.reputation)SOCIAL.ensure(L).reputation=clamp(SOCIAL.ensure(L).reputation+result.reputation,0,100);
  if(result.stress)L.stress=clamp((L.stress||0)+result.stress,0,100);
  if(result.reply)pushPersonMessage(L,bot,result.reply,false);
  S.rivalFeed=S.rivalFeed||[];
  S.rivalFeed.unshift({day:S.day,text:`📞 [${bot.faction}] ${text} · ${result.reply||'답변 없음'}`});
  if(S.rivalFeed.length>50)S.rivalFeed.length=50;
  if(!options.popup)renderChatPanel();renderLifePanel();autoSave();
  return{ok:true,text,answer:result.reply||'',meta:result.meta||''};
}
function replyToContact(c,kind,options){
  const L=S.life,room=personChat(L,c.name);options=options||{};
  if(room.lastReplyDay===S.day&&!options.popup){flashToast('📱 이번 달에는 이미 답장했습니다','neutral');return{ok:false};}
  room.lastReplyDay=S.day;
  const text=options.text||SOCIAL.contactAnswer(c,kind,options.incoming);pushPersonMessage(L,c,text,true);
  const subordinate=SOCIAL.isSubordinate&&SOCIAL.isSubordinate(c);
  if(subordinate){
    const faction=RIVALS.ensureFaction(L);
    const member=(faction.members||[]).find(item=>item.sourceId===c.factionMemberId);
    const gain={ack:2,order:3,protect:5,question:3}[kind]||1;
    c.trust=clamp((c.trust||0)+gain,0,100);
    if(member)member.loyalty=clamp((member.loyalty||50)+(kind==='protect'?4:kind==='order'?1:2),0,100);
    if(kind==='question')faction.intel=clamp((faction.intel||0)+.015,0,.65);
    const answers={
      ack:['알겠습니다. 변동 생기면 바로 다시 보고드리겠습니다.','확인했습니다. 지시 전까지 대기하겠습니다.'],
      order:['명령 확인했습니다. 인원에게도 같은 기준으로 전달하겠습니다.','정보부터 확보하고 움직이겠습니다. 결과로 보고드리죠.'],
      protect:['걱정 마십시오. 그래도 제가 빠져야 할 때는 먼저 보고하고 철수하겠습니다.','부하 목숨까지 챙기는 대장이라 다행입니다. 무리하지 않고 돌아오겠습니다.'],
      question:['근거 자료와 예상 동선을 다시 묶어서 보내겠습니다. 한 시간만 주십시오.','추측은 빼고 확인된 것만 정리해 다시 보고드리겠습니다.'],
    };
    const answer=pick(answers[kind]||answers.ack);pushPersonMessage(L,c,answer,false);
    const meta=`부하 신뢰 +${gain}${member?` · 충성도 ${Math.round(member.loyalty||0)}`:''}${kind==='question'?' · 세력 정보 +2%':''}`;
    if(!options.popup)renderChatPanel();renderLifePanel();autoSave();
    return{ok:true,text,answer,meta};
  }
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
  if(room.lastReplyDay===S.day&&!options.popup){flashToast('📱 이번 달에는 이미 답장했습니다','neutral');return{ok:false};}
  room.lastReplyDay=S.day;
  const text=options.text||(window.QT_CHAT&&QT_CHAT.playerReply(kind,options.incoming,r))||
    {warm:'오늘 정신이 없었어. 그래도 네 연락 보니까 좋다.',brief:'응, 확인했어. 나중에 연락할게.',boundary:'연락이 늦을 수 있어. 재촉하거나 위치를 확인하는 건 하지 말아줘.',ignore:'(읽음)'}[kind];
  pushPersonMessage(L,r,text,true);r.idleMonths=0;
  let seraHappy=0;
  if(kind==='warm'){r.affection=Math.min(100,(r.affection||0)+3);r.trust=Math.min(100,(r.trust||0)+2);if(r.name==='윤세라'){r.obsession=Math.min(100,(r.obsession||0)+3);seraHappy=4;}}
  else if(kind==='boundary'){r.trust=Math.min(100,(r.trust||0)+2);if(r.name==='윤세라'){r.obsession=Math.max(0,(r.obsession||0)-4);seraHappy=-2;}else if(isDangerousHeroine(r))r.dangerLevel=Math.max(0,(r.dangerLevel||0)-6);}
  else if(kind==='ignore'){r.affection=Math.max(0,(r.affection||0)-2);if(r.name==='윤세라'){r.obsession=Math.min(100,(r.obsession||0)+7);seraHappy=-5;}}
  else if(kind==='brief'&&r.name==='윤세라')seraHappy=1;
  if(r.name==='윤세라'&&seraHappy)L.happy=clamp((L.happy||0)+seraHappy,0,100);
  if(kind!=='ignore')addBondInteraction(r,`message-${kind}`);
  let answer='';
  if(kind!=='ignore'){
    const ctx={tag:relationTag(L,r.name),personality:r.personality,special:r.special,obsession:r.obsession||0,
      earlyContact:r.name!=='윤세라'&&!r.childhoodFriend&&((r.affection||0)<25||(r.trust||0)<12||(r.interactions||0)<4)};
    answer=(window.QT_CHAT&&QT_CHAT.partnerAnswer(r,kind,ctx))||
      (kind==='boundary'?'알겠어요. 약속한 선은 지켜볼게요.':kind==='warm'?'먼저 연락해줘서 기뻐요.':'별일 없었어요. 당신은 오늘 어땠어요?');
    if(answer)pushPersonMessage(L,r,answer,false);
  }
  const meta=r.name==='윤세라'&&seraHappy?`윤세라의 집착 문자는 스트레스 대신 행복에 남았습니다 · 행복 ${seraHappy>0?'+':''}${seraHappy}`:'';
  if(!options.popup)renderChatPanel();renderLifePanel();autoSave();return{ok:true,text,answer,meta};
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
  const lifestyle=lifestylePrestige(L),personality=(S._dateCandidate||{}).personality;
  s += ['lavish','ambitious','free'].includes(personality)?Math.min(16,lifestyle*.35):Math.min(5,lifestyle*.1);
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

function freeOutingUnlocked(L=S.life){
  return !!(L&&(L.outsideFearResolved||L.freedomRescueComplete));
}

function showOutsideFearModal(){
  const L=S.life,host=$('date-host');if(!L||!host)return;
  S._outsideFearPromptCount=Math.max(0,S._outsideFearPromptCount||0)+1;
  const nudge=L.tutorialMet
    ?`<div class="phone-shell outside-fear-phone"><div class="phone-status"><span>투자지원센터</span><span>방금</span></div><div class="phone-chat-screen open"><header><span class="phone-app-icon">📘</span><span><b>나래 매니저</b><small>예약 안내</small></span></header><div class="phone-chat-log"><div class="phone-bubble incoming">${S._outsideFearPromptCount<=1?'다음 상담도 온라인 변경은 안 돼요. 현관까지만 나오세요. 제가 1층에서 기다릴게요.':'또 현관 앞에서 돌아갔죠? 괜찮으니까 다음 상담 날에는 엘리베이터만 타요. 나머지는 제가 같이 갈게요.'}</div></div></div></div>`
    :'';
  host.style.display='block';
  host.innerHTML=`<div class="window event-window place-encounter-window outside-fear-window"><div class="title-bar event-bar"><div class="title-bar-text">🚪 현관 앞에서 멈춘 주말</div><div class="title-bar-controls"><button aria-label="Close" id="outside-fear-x"></button></div></div><div class="window-body"><img class="dating-banner date-scene" src="${dateSceneImage('solo')}" alt="문 앞에서 외출을 망설이는 장면"><div class="event-title">아직은 밖에 나가기가 무섭다.</div><div class="event-desc">출근이나 시간을 정해 둔 상담은 어떻게든 버티지만, 아무도 기다리지 않는 곳으로 혼자 나가려니 예전 일이 다시 떠오릅니다. 손잡이를 잡은 채 한참 서 있다가 신발을 벗었습니다.</div>${nudge}<div class="event-options"><button class="event-opt" id="outside-fear-close">오늘은 문을 잠그고 돌아간다</button></div></div></div>`;
  const close=()=>{host.style.display='none';host.innerHTML='';};
  $('outside-fear-x').addEventListener('click',close);
  $('outside-fear-close').addEventListener('click',close);
}

function doDate() {
  if(!freeOutingUnlocked(S.life)){showOutsideFearModal();syncBGM();return;}
  if(S.life.dangerousTrioBond&&S.life.dangerousTrioBond.active&&(S.life.health||0)<12){
    flashToast('🦂 체력이 너무 낮아 세 사람이 현관에서 외출을 막았습니다. 먼저 집에서 쉬어야 합니다','bad');return;
  }
  S._dateCompanion={type:'solo',name:'혼자',scoreMod:0,costMul:1};
  showRouteModal();
  syncBGM();
}

// 사람 카드 한 장 (연인/아는 사람/새 소개팅 상대 공용)
function personCardHTML(c, head, attrs, cls, detail) {
  const per = D.PERSONALITIES[c.personality] || {};
  return `<button class="route-card ${cls || ''}" ${attrs}>
       <div class="rc-head">${head}</div>
       <div class="rc-person"><img class="char-thumb" src="${characterPortrait(c)}" alt="${c.name}"><span><strong>${c.emoji || ''}${c.name}</strong><small>${c.job} · ${per.emoji || ''}${per.name || ''}</small>${detail?`<em>${detail}</em>`:''}</span></div>
     </button>`;
}

function dateOpeningLine(c,rec) {
  if(c.name==='윤세라'){
    const seraLine=window.QT_CHARACTER_DIALOGUE&&QT_CHARACTER_DIALOGUE.line(c,'incoming');
    if(seraLine)return seraLine;
  }
  const early=!rec||(!hasPersonalContact(rec)&&(rec.affection||0)<25);
  if(early){
    const first={
      ambitious:'아까 같은 자리에 있었죠? 저는 아직 일정이 있어서, 잠깐만 이야기해요.',
      cold:'무슨 일로 말을 거신 거죠? 일단 들어는 볼게요.',
      lavish:'처음 보는 분과 오래 이야기하는 편은 아닌데… 용건이 뭐예요?',
      free:'아까부터 몇 번 마주쳤네요. 인사 정도는 해도 되겠죠?',
      homebody:'사람 많은 곳은 조금 불편해서요. 잠깐이면 괜찮아요.',
      frugal:'굳이 비싼 데 갈 필요는 없어요. 아직 서로 잘 모르니까요.',
      caring:'아까 도와주신 분 맞죠? 감사하다는 말은 하고 싶었어요.',
      obsessive:'…저를 기억하고 있었네요. 아직은 그 정도면 됐어요.',
    };
    return first[c.personality]||'아까 마주쳤던 분이죠? 우선 인사부터 할까요.';
  }
  const authored=window.QT_CHARACTER_DIALOGUE&&QT_CHARACTER_DIALOGUE.line(c,'incoming');
  if(authored)return authored;
  const fallback={
    ambitious:'시간은 비워 뒀어요. 오늘은 어떤 모습을 보여 줄 건가요?',
    cold:'긴 설명은 됐어요. 편하게 있다 가죠.',
    lavish:'평범한 하루로 끝내진 않을 거죠?',
    free:'계획은 나중에요. 일단 재밌는 데부터 가요.',
    homebody:'시끄러운 곳보다는 오래 이야기할 수 있는 곳이 좋아요.',
    frugal:'무리해서 쓰지 않아도 돼요. 같이 걷는 것도 좋으니까.',
    caring:'오늘은 당신 이야기를 듣고 싶어요. 천천히 말해요.',
    obsessive:'늦지 않았네요… 기다리고 있었어요.',
  };
  return fallback[c.personality]||'왔네요. 오늘은 천천히 이야기해 봐요.';
}

function dateApproachChoices(c,mode) {
  const byKey=new Map(D.DATE_APPROACHES.map(a=>[a.key,a]));
  const preferred=Array.isArray(c.best)?c.best:[];
  const sceneKeys=mode==='encounter'
    ? ['humor','sincere','listen','plan']
    : mode==='outing'
      ? ['listen','vulnerable','humor','sincere']
      : ['plan','vulnerable','direct','flex','push'];
  const keys=mode==='encounter'
    ? sceneKeys
    : [...new Set([...preferred.slice(0,2),...sceneKeys,...D.DATE_APPROACHES.map(a=>a.key)])];
  return keys.map(key=>{
    const original=byKey.get(key);
    if(!original)return null;
    if(mode==='encounter'&&key==='plan')return{...original,label:'다음에 마주치면 인사하자고 한다',cost:0,desc:'연락처를 요구하지 않고 다음 인사를 기약한다'};
    return original;
  }).filter(Boolean).slice(0,4);
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

const SOLO_OUTINGS=[
  {id:'walk',icon:'🌳',name:'공원과 동네 산책',cost:20000,happy:3,stress:-10,health:1,fitness:2,desc:'사람을 찾지 않고 걷다가 벤치에서 잠깐 쉽니다.'},
  {id:'bookstore',icon:'📚',name:'서점과 조용한 카페',cost:70000,happy:6,stress:-8,careerSkill:1,desc:'읽고 싶던 책을 고르고 혼자 생각을 정리합니다.'},
  {id:'culture',icon:'🎬',name:'영화·전시 한 편',cost:120000,happy:10,stress:-7,desc:'누구를 만나기 위한 일정이 아니라 온전히 취향을 위한 외출입니다.'},
  {id:'marketwalk',icon:'🏙️',name:'상권과 거리 둘러보기',cost:50000,happy:4,stress:-5,mentorSkill:2,desc:'가게와 사람들의 소비 흐름을 보며 시장 감각을 익힙니다.'},
];

function resolveSoloOuting(id){
  const outing=SOLO_OUTINGS.find(item=>item.id===id);if(!outing)return;
  if(lifeActionExhausted()){flashToast(`📅 이번 달 자유시간 ${LIFE_ACTIONS_PER_MONTH}회를 모두 사용했습니다`,'neutral');return;}
  if(S.capital<outing.cost){flashToast(`💸 ${won(outing.cost)}원이 필요합니다`,'bad');return;}
  const L=S.life;S.capital-=outing.cost;
  L.happy=clamp((L.happy||0)+outing.happy,0,100);
  L.stress=clamp((L.stress||0)+outing.stress,0,100);
  if(outing.health)L.health=clamp((L.health||0)+outing.health,0,100);
  if(outing.fitness)L.fitness=clamp((L.fitness||0)+outing.fitness,0,100);
  if(outing.careerSkill){const career=CAREER.ensure(L);career.skill=clamp((career.skill||0)+outing.careerSkill,0,100);}
  if(outing.mentorSkill){const mentor=investmentMentorState(L);mentor.skill=clamp((mentor.skill||0)+outing.mentorSkill,0,100);}
  addNews(`${outing.icon} ${outing.name} · 관계·연락처 변화 없음`,'neutral');
  flashToast(`${outing.icon} 혼자 시간을 보냈습니다 · 스트레스 ${outing.stress} · 행복 +${outing.happy}`,'good');
  closeDateModal();afterLifeAction('취미');
}

// 외출 고르기 — 혼자 보내는 시간 / 연락처를 교환한 사람과의 약속 / 차단 기록
function showRouteModal() {
  const host = $('date-host'); if (!host) return;
  const L = S.life;
  ensureMet(L);
  const currentPartners=RELATIONSHIPS.consensualMembers(L);
  const inRel = currentPartners.length > 0;
  S._dateCompanion={type:'solo',name:'혼자',scoreMod:0,costMul:1};
  const formerPartners = L.met.filter(m => m.status === 'ex').map(m=>{ensureCourtship(m);return m;});
  S._dateKnown = L.met.filter(m =>
    m.status !== 'ex'&&hasPersonalContact(m)&&!RELATIONSHIPS.isPartner(L,m.name)&&
    (!FREEDOM_TRIO||FREEDOM_TRIO.canMeetOffline(L,m.name))
  ).map(candidateFromRecord);

  let cards = `<div class="route-sep">🚶 혼자 하는 외출</div><div class="date-place-grid">${SOLO_OUTINGS.map(outing=>
    `<button class="route-card place-card solo-outing-card" data-solo-outing="${outing.id}"><div class="rc-head">${outing.icon} ${outing.name}</div><small>${outing.desc}</small><em>${won(outing.cost)} · 행복 +${outing.happy} · 스트레스 ${outing.stress}</em></button>`
  ).join('')}<button class="route-card place-card club-relief-card" data-club-night><div class="rc-head">🍸 클럽</div></button></div>`;
  S._datePartners=currentPartners;
  if (inRel) {
    cards += `<div class="route-sep">💕 현재 관계</div><div class="date-person-grid">`;
    cards += currentPartners.map((person,index)=>{
      const record=metRecord(L,person.name),affection=record&&record.affection!=null?record.affection:L.affection||0;
      return personCardHTML(Object.assign({ age:person.age||28 },person),
        `💞 ${relationTag(L,person.name)}과 데이트`,
        `data-partner-i="${index}"`, 'partner-card', `함께 보내는 저녁 · 친밀도 ${Math.max(0,affection)} · ${won(D.RELATIONSHIP.DATE_COST)}`);
    }).join('')+'</div>';
  }
  if (S._dateKnown.length) {
    cards += `<div class="route-sep">📱 약속할 수 있는 사람</div><div class="date-person-grid">`;
    cards += S._dateKnown.map((c, i) => {
      const readiness=courtshipReadiness(c),friendOnly=FREEDOM_TRIO&&FREEDOM_TRIO.NAMES.includes(c.name)&&FREEDOM_TRIO.relationshipMode(L).exclusive,idle=c.idleMonths>=3?` · ${c.idleMonths}개월 만`:'';
      return personCardHTML(c, `${friendOnly?'🤝 친구 외출':readiness.ready?'💘 데이트 가능':'📱 친분 외출'} · ${relationTag(L,c.name)}`,
        `data-known="${i}"`, 'known-card', `호감 ${Math.round(c.affection||0)} · ${friendOnly?'현재 단독 연인을 존중하는 친구 관계':readiness.ready?'마음을 확인할 때':'서로 연락처를 교환한 사이'}${idle}`);
    }).join('')+'</div>';
  }
  if (formerPartners.length) {
    cards += `<div class="route-sep">🚫 차단한 전 연인</div><div class="date-person-grid">`;
    cards += formerPartners.map(c => personCardHTML(c,
      '🚫 내가 차단한 연락처', 'disabled', 'known-card ex-card blocked-ex-card', '메시지 수신 안 함 · 외출에서 다시 만나지 않음')).join('')+'</div>';
  }
  host.style.display = 'block';
  host.innerHTML =
    `<div class="window event-window date-picker-window">
       <div class="title-bar event-bar"><div class="title-bar-text">🌆 이번 주, 어디서 시간을 보낼까?</div>
         <div class="title-bar-controls"><button aria-label="Close" id="route-x"></button></div></div>
       <div class="window-body">
         <img class="dating-banner date-scene" src="${currentDateSceneImage()}" alt="이번 주 외출 풍경">
         <div class="date-picker-lead">이번 주에는 누구를 만나기보다, 내가 갈 곳부터 정해 보기로 했습니다.</div>
         <div class="route-list">${cards}</div>
       </div>
     </div>`;
  host.querySelectorAll('[data-solo-outing]').forEach(button=>button.addEventListener('click',()=>resolveSoloOuting(button.dataset.soloOuting)));
  const clubNightButton=host.querySelector('[data-club-night]');
  if(clubNightButton)clubNightButton.addEventListener('click',showClubNight);
  host.querySelectorAll('.route-card').forEach(b => b.addEventListener('click', () => {
    if (b.hasAttribute('data-club-night')||b.hasAttribute('data-solo-outing')) return;
    if (b.dataset.partnerI != null) {
      S._dateRoute = null;
      const person=S._datePartners[+b.dataset.partnerI];
      S._dateCandidate = Object.assign({ age: person.age || 28 }, person);
      showDateModal(S._dateCandidate, null);
      return;
    }
    if (b.dataset.known != null) {
      S._dateRoute = null;
      S._dateCandidate = S._dateKnown[+b.dataset.known];
      showDateModal(S._dateCandidate, null);
    }
  }));
  const x = $('route-x'); if (x) x.addEventListener('click', closeDateModal);
}

function showDateModal(c, route) {
  const host = $('date-host'); if (!host) return;
  Object.assign(c, ROMANCE_META[c.personality] || ROMANCE_META.caring, c);
  const per = D.PERSONALITIES[c.personality] || {};
  const L = S.life;
  const withPartner = !route && RELATIONSHIPS.isPartner(L,c.name);
  const known = !route && !withPartner;
  const rec = metRecord(L, c.name);
  const established=rec&&['casual','lover','polycule','ex'].includes(rec.status);
  const freedomFriendOnly=!!(rec&&FREEDOM_TRIO&&FREEDOM_TRIO.NAMES.includes(rec.name)&&FREEDOM_TRIO.relationshipMode(L).exclusive&&!withPartner);
  const businessRivalLocked=c.special==='business'&&!withPartner&&(
    !BUSINESS_ROMANCE||!BUSINESS_ROMANCE.canRomance(L,c.name)
  );
  S._dateMode=withPartner?'date':!rec?'encounter':!freedomFriendOnly&&(established||courtshipReadiness(rec).ready)&&!businessRivalLocked?'date':'outing';
  const modeLabel=S._dateMode==='encounter'?'첫 조우':S._dateMode==='outing'?'친분 외출':'데이트';
  const prof = ROMANCE.profileOf(c);   // 말투·사연 (인물 전용 목소리가 있을 때만)
  const gLabel = (D.GENDER_LABEL || {})[c.gender] || '';
  const age=Number.isFinite(Number(c.age))?` · 만 ${Math.round(Number(c.age))}세`:'';
  const openingLine=dateOpeningLine(c,rec);
  // 감당 못 하는 선택지는 비활성화해서 '돈 없어서 아무것도 못 하고 갇히는' 상황을 막는다
  const base = dateBaseCost();
  S._dateApproaches=dateApproachChoices(c,S._dateMode);
  const opts = S._dateApproaches.map((a, i) => {
    const total = base + (a.cost || 0);
    const poor = S.capital < total;
    return `<button class="event-opt" data-i="${i}" ${poor ? 'disabled' : ''}><span>${a.emoji} ${a.label}</span>${a.cost?`<small>추가 ${won(a.cost)}</small>`:''}${poor?`<small class="down">현금 ${won(total)} 필요</small>`:''}</button>`;
  }).join('');
  const broke = S.capital < base;
  const glance=rec
    ? `<span>${stageBadge(rec.affection)}</span><span>호감 ${Math.round(rec.affection||0)}</span><span>신뢰 ${Math.round(rec.trust||0)}</span>`
    : '<span>오늘 처음 만남</span>';
  const detail=rec
    ? `${relationTag(L,c.name)} · ${businessRivalLocked?'사적인 이야기는 피한 채 업무 이야기만 이어가고 있습니다':hasPersonalContact(rec)?courtshipProgress(rec):contactProgress(rec)}`
    : '서로 이름과 얼굴을 처음 확인한 자리입니다.';
  host.style.display = 'block';
  host.innerHTML =
    `<div class="window event-window date-focus-window">
       <div class="title-bar event-bar"><div class="title-bar-text">${S._dateMode==='date'?'💘':'🌱'} ${withPartner ? `${relationTag(L,c.name)}와 데이트` : known ? `${c.name}님과 ${modeLabel}` : (route ? `${route.emoji} ${route.name} · 첫 조우` : modeLabel)}</div>
         <div class="title-bar-controls"><button aria-label="Close" id="date-x"></button></div></div>
       <div class="window-body">
         <div class="date-focus-top">
           <img id="date-event-scene" class="dating-banner date-scene" src="${currentDateSceneImage()}" alt="데이트 시작 장면">
           <div class="date-focus-person">
             <img id="date-portrait" class="char-portrait" src="${characterPortrait(c)}" alt="${c.name}">
             <div><strong>${c.emoji||''}${c.name}</strong><small>${c.job} · ${per.emoji||''}${per.name||''}${gLabel?` · ${gLabel}`:''}${age}</small><blockquote>“${openingLine}”</blockquote></div>
           </div>
         </div>
         <div class="date-glance"><b>${modeLabel}</b>${glance}<span>예상 ${won(base)}</span></div>
         <details class="date-more"><summary>인물과 관계 정보 보기</summary><div><b>관심사</b> ${(c.interests||[]).join(' · ')||'아직 모름'}<br><b>중요 가치</b> ${c.value||'신뢰'}${prof?`<br><b>말투</b> ${prof.style}<br><b>배경</b> ${prof.background}`:''}<br><b>현재 관계</b> ${detail}</div></details>
         ${broke ? `<div class="event-desc down">💸 현금이 ${won(base)}원 이상 있어야 만날 수 있어요. 창을 닫고 돈을 마련한 뒤 다시 오세요.</div>` : ''}
         <div class="date-prompt">어떻게 시간을 보낼까?</div>
         <div class="event-options date-choice-grid">${opts}</div>
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
  const c = S._dateCandidate, a = (S._dateApproaches||D.DATE_APPROACHES)[i];
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
    early: c.name!=='윤세라'&&(!prevRec||!hasPersonalContact(prevRec)||(prevRec.affection||0)<25),
  });
  const preference = (c.best || []).includes(a.key) ? '선택한 방식이 상대의 연애 성향과 잘 맞았다.' : '상대는 접근 방식보다 진심을 더 지켜보는 눈치다.';
  const relationContext = relationshipDateLine(L, c);
  const msg = `${scene}<br><br><b>${voiceLine}</b><br>${relationContext}<br>${preference}`;
  speakPerson(c, voiceLine);   // 데이트 상대의 대사를 그 인물 목소리로 들려준다
  L.charm = Math.max(0, L.charm + dCharm);
  L.happy = clamp(L.happy + dHappy, 0, 100);
  const withPartner = RELATIONSHIPS.isPartner(L,c.name);
  if (withPartner) L.affection = Math.max(0, (L.affection || 0) + bondGain);
  L.memories = L.memories || [];
  L.memories.unshift({ day: S.day, name: c.name, tier, approach: a.label });
  L.memories = L.memories.slice(0, 5);

  // 만난 사람은 명부에 남는다 — 헤어져도, 실패해도 기억한다
  const rec = rememberPerson(c);
  const hadContact=hasPersonalContact(rec);
  const beforeAff = rec.affection || 0;
  if(dateMode==='date')rec.dates = (rec.dates || 0) + 1;
  rec.affection = Math.max(0, beforeAff + bondGain);
  rec.trust=clamp((rec.trust||0)+trustGain,0,100);
  addBondInteraction(rec,dateMode);
  rec.age = c.age; rec.job = c.job;
  rec.idleMonths = 0;   // 방금 만났으니 소원해짐 카운터 초기화
  let gainedContact=false;
  if(c.name==='윤세라')gainedContact=unlockPersonalContact(rec);
  else if(tier!=='실패'&&contactReadiness(rec).ready)gainedContact=unlockPersonalContact(rec);

  // 사이가 한 단계 올라갔으면(또는 내려갔으면) 알려준다
  let stageNote = '';
  const beforeStage = affectionStage(beforeAff), afterStage = affectionStage(rec.affection);
  if (beforeStage.key !== afterStage.key) {
    const up = rec.affection > beforeAff;
    stageNote = `<br>${up ? '📈' : '📉'} <b class="${up ? 'up' : 'down'}">${c.name}님과의 사이: ${beforeStage.emoji}${beforeStage.label} → ${afterStage.emoji}${afterStage.label}</b> <span class="muted">${afterStage.desc}</span>`;
  }

  let extra = stageNote;
  const readyStory=STORIES.next(rec);if(readyStory)extra+=`<br>📖 <b class="up">${c.name}님에게 아직 끝내지 못한 이야기가 있는 듯합니다.</b>`;
  const perC = D.PERSONALITIES[c.personality] || {};
  if(dateMode!=='date'){
    const readiness=courtshipReadiness(rec);
    if(gainedContact){
      pushPersonMessage(L,rec,rec.name==='윤세라'?'찾았네요. 이제 제 번호도 저장해요. 답장은 늦어도 되니까… 없어지지만 말고요.':'오늘은 연락처를 드려도 될 것 같아요. 다음에는 미리 약속하고 봐요.',false);
      extra+=`<br>📱 <b class="up">${c.name}님과 개인 연락처를 교환했습니다.</b>`;
    }else if(!hadContact&&!hasPersonalContact(rec)){
      extra+=`<br>🌱 <span class="muted">${dateMode==='encounter'?'첫인사를 나누고 얼굴을 익혔습니다':'아직 연락처를 건네기에는 조심스러운 사이입니다'}. ${contactProgress(rec)}</span>`;
    }
    extra+=readiness.ready
      ? `<br>💘 <b class="up">${c.name}님이 다음에는 미리 약속을 잡아 만나자고 말했습니다.</b>`
      : hasPersonalContact(rec)?`<br><span class="muted">${courtshipProgress(rec)}</span>`:'';
  } else if (L.relationship === 'single') {
    // 연애 여부는 플레이어가 선택. 상대 성격에 따라 '먼저 고백(적극)' vs '내가 고백(소극)'이 갈린다
    const eligible = (tier === '성공' && (rec.affection || 0) >= 60 && (rec.trust||0)>=18 && (rec.dates || 0) >= 3 && knownMonths(rec)>=3);
    const routeGroup=ROMANCE_ROUTES&&ROMANCE_ROUTES.memberGroup(c.name);
    const groupStoryDone=!routeGroup||groupStoryComplete(routeGroup,L);
    const groupRomanceOpen=!routeGroup||ROMANCE_ROUTES.romanceAvailable(L,routeGroup);
    if(eligible&&routeGroup&&!groupRomanceOpen){
      extra+=`<br>🤝 <span class="muted">${c.name}님과는 이미 연애가 아닌 관계로 결론을 냈습니다. 오늘도 그 선을 바꾸지 않습니다.</span>`;
      S._romance={name:c.name,forward:false,groupId:routeGroup,html:'<div class="romance-choice"><button id="romance-friend" class="life-btn">🤝 친구로 지낸다</button><button id="romance-skip" class="life-btn">⏳ 오늘은 돌아간다</button></div>'};
    }else if(eligible&&routeGroup&&!groupStoryDone){
      extra+=`<br>💗 <b>${c.name}님은 아직 자기 이야기를 끝내지 못한 채, 당신이 무슨 말을 할지 기다리고 있습니다.</b><br><span class="muted">지금 먼저 고백하면 이 사람 한 명을 택하는 순애 루트가 되며, 그룹 쪽 공동 고백은 오지 않습니다.</span>`;
      S._romance={name:c.name,forward:false,groupId:routeGroup,premature:true,chance:0,html:
        '<div class="romance-choice"><button id="romance-confess" class="life-btn hot">💌 지금 고백한다</button><button id="romance-friend" class="life-btn">🤝 지금 관계를 지킨다</button><button id="romance-skip" class="life-btn">⏳ 이야기가 끝날 때까지 기다린다</button></div>'};
    }else if (eligible) {
      const forward = perC.forward === true || (perC.confess != null ? perC.confess >= 0.6 : false);
      if (forward) {
        extra += `<br>💗 <b class="up">${c.name}님이 "우리 이제 사귈래요?"라며 먼저 고백했어요!</b>`;
        S._romance = { name: c.name, forward: true, html:
          `<div class="romance-choice"><button id="romance-accept" class="life-btn hot">💕 받아준다</button><button id="romance-friend" class="life-btn">🤝 친구로 지낸다</button><button id="romance-casual" class="life-btn">${isDangerousHeroine(c)?'🌙 함께 밤을 보낸다':'🌙 가볍게 만난다'}</button><button id="romance-decline" class="life-btn">🙅 거절한다</button></div>` };
      } else {
        const ch = clamp((perC.confess != null ? perC.confess : 0.5) + ((rec.affection || 0) - 60) / 140+(rec.trust||0)/500, 0.25, 0.92);
        extra += `<br>💗 <b>${c.name}님은 대답을 재촉하지 않은 채 당신의 다음 말을 기다리고 있습니다.</b>`;
        S._romance = { name: c.name, forward: false, chance: ch, html:
          `<div class="romance-choice"><button id="romance-confess" class="life-btn hot">💌 고백한다</button><button id="romance-friend" class="life-btn">🤝 친구가 된다</button><button id="romance-casual" class="life-btn">${isDangerousHeroine(c)?'🌙 함께 밤을 보낸다':'🌙 가볍게 만난다'}</button><button id="romance-skip" class="life-btn">⏳ 아직 아니다</button></div>` };
      }
    } else if (tier === '성공') {
      extra += `<br>🌱 <span class="muted">오늘은 관계에 이름을 붙이기보다 조금 더 오래 함께 있는 편이 자연스럽습니다.</span>`;
      const casualReady=(rec.dates||0)>=2&&(rec.affection||0)>=35&&knownMonths(rec)>=2;
      S._romance={name:c.name,forward:false,html:`<div class="romance-choice"><button id="romance-friend" class="life-btn">🤝 친구로 지낸다</button>${casualReady?`<button id="romance-casual" class="life-btn">${isDangerousHeroine(c)?'🌙 함께 밤을 보낸다':'🌙 가볍게 만난다'}</button>`:''}<button id="romance-skip" class="life-btn">⏳ 더 알아본다</button></div>`};
    }
  } else if (!withPartner && tier === '성공') {
    L.lovers = L.lovers || [];
    const poly=ensurePolycule(L);
    const alreadyPoly=poly.active&&poly.members.some(x=>x.name===c.name);
    const alreadyLover = L.lovers.some(x => x.name === c.name);
    const proposal = proposalResult(c, rec, tier);
    const devotion=activePureDevotion(L);
    if(devotion&&c.name!==devotion.name&&proposal.attempted){
      showPureRouteAffairEnding(c);
      return;
    }
    if(c.special==='business'&&rec.businessSuitor&&proposal.attempted){
      rec.status='friend';
      rec.businessHaremProgress=(rec.businessHaremProgress||0)+(proposal.accepted?1:0);
      const businessState=BUSINESS_ROMANCE&&BUSINESS_ROMANCE.ensure(L);
      if(businessState)businessState.managementRisk=clamp((businessState.managementRisk||0)+(proposal.accepted?7:-2),0,100);
      extra+=proposal.accepted
        ?`<br>🏢 <b class="down">${c.name}님은 기존 연인을 알고도 물러서지 않았습니다. 비밀 연인으로 숨지 않고 사업 4인조 공동 경쟁 후보로 남습니다.</b>`
        :`<br>📋 <span class="muted">${c.name}님은 거절을 업무 불이익으로 돌리지 않고 다음 이사회에서 다시 보자며 물러났습니다.</span>`;
    } else if(poly.active&&!alreadyPoly&&proposal.attempted){
      if(poly.mode==='dangerous_trio'&&DANGEROUS_TRIO&&!DANGEROUS_TRIO.compatibleCandidate(c.name)){
        rec.trust=Math.max(0,(rec.trust||0)-3);
        extra+=`<br>🦂 <span class="muted">${c.name}님은 세 사람 사이의 날 선 침묵을 살피다 더 가까이 오지 않기로 했습니다.</span>`;
      }else{
      const accepts=polyculeCandidateFits(L,c)&&(rec.trust||0)>=35&&(poly.trust||0)>=40;
      if(accepts){const member={name:c.name,job:c.job,personality:c.personality,age:c.age,emoji:c.emoji,gender:c.gender,portrait:c.portrait};poly.members.push(member);poly.trust=Math.min(100,(poly.trust||0)+5);rec.status='polycule';RELATIONSHIPS.addMember(L,rec,S.day);extra+=`<br>🌈 <b class="up">${c.name}님은 기존 구성원과 같은 <b>${groupToneLabel(relationshipGroupTone(c))}</b> 결이어서 동등한 관계 구성원으로 합류했습니다.</b>`;}
      else{rec.trust=Math.max(0,(rec.trust||0)-3);extra+=`<br>🛑 <span class="muted">${c.name}님은 테이블에 앉아 있던 사람들의 표정을 확인한 뒤 조용히 자리를 떴습니다.</span>`;}
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
  if(kind==='casual'&&CHILDHOOD_CIRCLE&&CHILDHOOD_CIRCLE.MEMBERS.includes(c.name)){
    return{chastity:0,text:'“우리 사이에 새삼 허락이 필요해?” 거절이 아니라, 이 밤을 또 과거처럼 모른 척할 것인지 되묻습니다.'};
  }
  if(kind==='casual'&&FREEDOM_TRIO&&FREEDOM_TRIO.NAMES.includes(c.name)){
    const refusal={
      '채원':'“비행 끝나고 지친다고 아무 품에나 기대진 않아요. 나를 쉬운 사람으로 봤다면 오늘은 여기까지예요.”',
      '유나':'“화려하게 보이는 직업이랑 가볍게 사는 건 다른 얘기예요. 그런 제안 받을 거였으면 당신한테 내 진짜 모습을 안 보여줬어요.”',
      '소희':'“무대에서는 감정을 빌려도, 내 마음까지 하룻밤 빌려주진 않아요.”',
    }[c.name];
    return{chastity:100,text:refusal};
  }
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
  div.innerHTML=`<img class="relationship-scene" src="./assets/event-trio-secure-home-ending.png" alt="세 연인이 약속 장소를 찾아온 장면"><b class="down">🦂 약속 장소에 먼저 와 있던 세 사람</b><p>${blockers.join('와(과) ')}가 빈 의자 하나를 남겨 둔 채 당신을 기다리고 있습니다.</p><div class="important-event-detail">“새로운 약속이 있으면 우리한테도 소개해 줘야죠. 숨길 생각은 아니었죠?”</div><button id="trio-block-confirm" class="session-btn opening">세 사람이 있는 집으로 돌아간다</button>`;
  box.appendChild(div);$('trio-block-confirm').addEventListener('click',closeDateModal);playSound('crash');autoSave();
}
function activeChildhoodNightContract(){
  const contract=S.life&&S.life.childhoodNightContract;
  return contract&&contract.active&&!contract.ended?contract:null;
}
function advancedRelationshipGroup(){
  const L=S.life;
  if(L.dangerousTrioBond&&L.dangerousTrioBond.active)return{name:'위험한 결핍 3인조',icon:'🦂',line:'세라가 약속 버튼을 지웠고, 유진과 채린은 모르는 척 퇴로를 막았습니다.'};
  if(L.businessQuartetBond&&L.businessQuartetBond.active)return{name:'가면을 벗은 공동창업자 4인조',icon:'🏢',line:'네 사람의 일정·차량·계약 관리망이 약속 자체를 취소 처리했습니다.'};
  if(L.freedomTrioBond&&L.freedomTrioBond.active)return{name:'화려한 하루 뒤의 3인조',icon:'🏠',line:'세 사람은 싸우지 않고 당신을 집으로 데려가, 오늘의 충동을 관계의 결론으로 만들지 못하게 했습니다.'};
  return null;
}
function showChildhoodGroupIntervention(triggerName){
  const group=advancedRelationshipGroup(),contract=activeChildhoodNightContract();if(!group||!contract)return false;
  contract.active=false;contract.protectedBy=group.name;contract.ended=true;
  const circle=CHILDHOOD_CIRCLE.ensure(S.life);circle.pressure=clamp((circle.pressure||0)-10,0,100);
  closeDateModal();
  const host=$('life-event');if(!host)return true;host.style.display='block';
  host.innerHTML=`<div class="window event-window"><div class="title-bar"><div class="title-bar-text">${group.icon} 끊겨 버린 약속</div></div><div class="window-body"><img class="life-scene-banner" src="./assets/pixel-event-childhood-pact-v1.png" alt="현재 관계가 과거의 재발을 막는 장면"><div class="event-title">${group.name}이 먼저 움직였습니다.</div><div class="event-desc">${contract.anchorName}와의 밤 이후 ${triggerName}에게 향하던 약속은 성립하지 않았습니다. ${group.line}</div><div class="important-event-detail up">오래된 단체방에는 더 이상 새 메시지가 올라오지 않았습니다.</div><button id="childhood-group-intervention-confirm" class="session-btn opening">현재의 관계로 돌아간다</button></div></div>`;
  $('childhood-group-intervention-confirm').addEventListener('click',()=>{host.style.display='none';host.innerHTML='';renderLifePanel();autoSave();});
  autoSave();return true;
}
function showChildhoodRelapseEnding(triggerName,triggerType){
  const L=S.life,contract=activeChildhoodNightContract();if(!contract||triggerName===contract.anchorName)return false;
  const circle=CHILDHOOD_CIRCLE.ensure(L),checkpoint={pressure:circle.pressure,stress:L.stress};
  circle.pressure=100;L.stress=clamp((L.stress||0)+30,0,100);contract.breached=true;
  closeDateModal();
  const host=$('life-event');if(!host)return true;host.style.display='block';
  ensureChildhoodCircleCast();
  const people=CHILDHOOD_CIRCLE.MEMBERS.join('·');
  host.innerHTML=`<div class="window event-window captivity-ending-window"><div class="title-bar"><div class="title-bar-text">🎓 BAD END · 한 번으로 끝난 적 없던 사이</div></div><div class="window-body"><img class="life-scene-banner" src="./assets/pixel-event-childhood-graduation-v1.png" alt="끝나지 않은 졸업식"><div class="event-title">“가볍게라고 말한 건 너뿐이었어.”</div><div class="event-desc">${contract.anchorName}와 밤을 보낸 뒤 ${triggerType==='club'?'클럽에서 낯선 사람과 다시 밤을 보낸 사실':`${triggerName}에게 같은 관계를 제안한 사실`}이 다섯 사람의 기록망에 동시에 잡혔습니다. 누구도 독점 관계를 요구한 적은 없지만, 다섯에게 그 밤은 학창 시절의 관계가 다시 시작됐다는 합의였습니다.</div><div class="trio-dialogues">${CHILDHOOD_CIRCLE.MEMBERS.map(name=>{const person=metRecord(L,name);return`<div class="trio-dialogue"><img src="${characterPortrait(person,'sad')}" alt="${name}"><div><b>${name}</b><p>“우리는 네가 또 모르는 척할 때를 대비해서 전부 남겨 뒀어.”</p></div></div>`;}).join('')}</div><div class="important-event-detail down">${people} 전원 · 회귀 압력 최대 · 현재의 관계 선택권 상실</div><button id="childhood-relapse-retry" class="session-btn opening">↩️ 다른 사람에게 가기 전으로 돌아간다</button><button id="childhood-relapse-accept" class="hot">🎓 끝나지 않은 졸업식 엔딩을 받아들인다</button></div></div>`;
  $('childhood-relapse-retry').addEventListener('click',()=>{circle.pressure=checkpoint.pressure;L.stress=checkpoint.stress;contract.breached=false;host.style.display='none';host.innerHTML='';renderLifePanel();autoSave();});
  $('childhood-relapse-accept').addEventListener('click',()=>{contract.ended=true;circle.route='never_graduate';circle.stage='complete';ensureChildhoodCircleCast();activateChildhoodCircleBond('never_graduate');host.style.display='none';host.innerHTML='';addNews('🎓 BAD END · 한 번으로 끝난 적 없던 사이','bad');renderLifePanel();autoSave();});
  playSound('crash');autoSave();return true;
}

function activePureDevotion(L=S.life){
  if(!ROMANCE_ROUTES)return null;
  const row=ROMANCE_ROUTES.devotion(L);
  return row&&row.active&&RELATIONSHIPS.isPartner(L,row.name)?row:null;
}
function beginPureRomance(c,groupId,source){
  startDating(c);
  if(ROMANCE_ROUTES&&groupId)ROMANCE_ROUTES.beginDevotion(S.life,groupId,c.name,source||'player_confession');
  addNews(`💍 ${c.name} 한 사람을 택한 순애 루트가 시작됐습니다 · ${ROMANCE_ROUTES.META[groupId].name} 공동 고백 차단`,'good');
}
function showPureRouteAffairEnding(target){
  const devotion=activePureDevotion();
  if(!devotion||!target||target.name===devotion.name)return false;
  return showGroupRouteBadEnding(devotion.groupId,'pure_affair',{partner:devotion.name,target:target.name});
}

function romanceResolve(kind, confirmed) {
  const c = S._dateCandidate; if (!c) return;
  if(confirmed&&S.life.dangerousTrioBond&&S.life.dangerousTrioBond.active&&!isDangerousHeroine(c)&&['accept','confess','casual'].includes(kind)){showTrioBlocksAffair(c);return;}
  if(!confirmed){previewRomanceChoice(kind);return;}
  if(['accept','confess','casual'].includes(kind)&&showPureRouteAffairEnding(c))return;
  const rec = rememberPerson(c);
  const preview=$('date-outcome')&&$('date-outcome').querySelector('.relation-preview');if(preview)preview.remove();
  if(kind==='casual'&&CHILDHOOD_CIRCLE&&CHILDHOOD_CIRCLE.MEMBERS.includes(c.name)){
    const contract=activeChildhoodNightContract();
    if(contract&&c.name!==contract.anchorName){
      if(showChildhoodGroupIntervention(c.name))return;
      showChildhoodRelapseEnding(c.name,'casual');return;
    }
    rec.status='casual';rec.spentNight=true;rec.nightsTogether=(rec.nightsTogether||0)+1;
    rec.affection=clamp((rec.affection||0)+10,0,100);rec.trust=clamp((rec.trust||0)+3,0,100);
    const circle=CHILDHOOD_CIRCLE.ensure(S.life);circle.pressure=clamp(circle.pressure+22,0,100);circle.stage='relapse';
    S.life.childhoodNightContract={active:true,anchorName:c.name,day:S.day,ended:false,breached:false};
    CHILDHOOD_CIRCLE.MEMBERS.forEach(name=>{const person=metRecord(S.life,name);if(person)pushPersonMessage(S.life,person,name===c.name?'가볍게라고 해도 돼. 우리 사이가 정말 한 번으로 끝난 적은 없었잖아.':`${c.name}한테 들었어. 이번에는 우리 중 누구도 나중에 몰랐다고 하지 않을 거야.`,false);});
    const out=$('date-outcome'),div=document.createElement('div');div.className='oc-text down';
    div.innerHTML=`🌙 <b>${c.name}은 한 번도 거절할 생각이 없었습니다.</b><br>“우리 사이에 새삼 허락이 필요해?”<br><span class="muted">그 밤을 가볍게 부른 사람은 당신뿐이었습니다. 다음 날부터 오래된 단체방이 다시 움직이기 시작합니다.</span>`;
    out.appendChild(div);const btn=document.createElement('button');btn.className='session-btn opening';btn.textContent='예전처럼 같은 방에서 아침을 맞는다';btn.addEventListener('click',closeDateModal);out.appendChild(btn);
    S._romance=null;renderLifePanel();autoSave();return;
  }
  if(kind==='casual'&&FREEDOM_TRIO&&FREEDOM_TRIO.NAMES.includes(c.name)){
    const reaction=relationshipReaction(c,rec,'casual');
    rec.affection=Math.max(0,(rec.affection||0)-12);
    rec.trust=Math.max(0,(rec.trust||0)-15);
    rec.freedomCasualRefused=true;
    pushPersonMessage(S.life,rec,'아까 말은 분명히 해둘게요. 천천히 진지하게 알아갈 생각이 아니면 다시 제안하지 말아요.',false);
    const out=$('date-outcome'),div=document.createElement('div');
    div.className='oc-text down';div.innerHTML=`🛑 <b>${c.name}이 가벼운 만남을 단호하게 거절했습니다.</b><br>${reaction.text}<br><span class="muted">상대는 더 설명하지 않고 먼저 자리에서 일어났습니다.</span>`;
    out.appendChild(div);
    const btn=document.createElement('button');btn.className='session-btn opening';btn.textContent='선을 받아들이고 돌아간다';btn.addEventListener('click',closeDateModal);out.appendChild(btn);
    S._romance=null;renderLifePanel();autoSave();return;
  }
  const romanceState=S._romance||{},routeGroup=ROMANCE_ROUTES&&ROMANCE_ROUTES.memberGroup(c.name);
  const prematureConfession=kind==='confess'&&routeGroup&&!groupStoryComplete(routeGroup,S.life);
  const rejectedIncoming=routeGroup&&romanceState.forward&&['decline','friend'].includes(kind);
  let resultHTML = '';
  if(prematureConfession){
    beginPureRomance(c,routeGroup,'player_confession_before_group_story_complete');
    resultHTML=`💍 <b class="up">${c.name}님에게 먼저 고백해 두 사람의 순애를 시작했습니다.</b><br><span class="muted">남은 그룹 사건은 이어지지만 ${ROMANCE_ROUTES.META[routeGroup].name}의 공동 고백은 오지 않습니다. 이 약속을 둔 채 다른 사람을 유혹하면 불륜 배드엔딩으로 이어집니다.</span>`;
  } else if (kind === 'accept') {
    if(routeGroup)beginPureRomance(c,routeGroup,'accepted_individual_confession');
    else startDating(c);
    resultHTML = `💕 <b class="up">${c.name}님의 고백을 받아 연애를 시작했어요!</b>`;
  } else if (kind === 'decline') {
    if(rejectedIncoming)lockGroupRomance(routeGroup,'incoming_individual_confession_rejected');
    rec.affection = Math.max(0, (rec.affection || 0) - 15);
    resultHTML = `🙅 <span class="muted">${c.name}님의 고백을 정중히 거절했다. 사이가 조금 어색해졌다.</span>`;
  } else if (kind === 'confess') {
    const ok = routeGroup||Math.random() < ((S._romance && S._romance.chance) || 0.5);
    if (ok) {
      if(routeGroup)beginPureRomance(c,routeGroup,'player_confession');
      else startDating(c);
      resultHTML = `💕 <b class="up">고백 성공! ${c.name}님과 연애를 시작했어요!</b>${routeGroup?`<br><span class="muted">${c.name} 한 사람을 고른 순애 루트로 고정됐습니다.</span>`:''}`;
    }
    else { rec.affection = Math.max(0, (rec.affection || 0) - 8); resultHTML = `🫸 <b class="down">${c.name}님이 "아직 그런 사이는 아닌 것 같아요"라며 거절했다.</b>`; playSound('error'); }
  } else if (kind === 'friend') {
    if(rejectedIncoming)lockGroupRomance(routeGroup,'incoming_individual_confession_rejected_as_friend');
    rec.status='friend';rec.trust=Math.min(100,(rec.trust||0)+12);rec.affection=Math.max(15,(rec.affection||0)-4);
    resultHTML=`🤝 <b>${c.name}님과 연애 대신 가까운 친구가 되기로 했습니다.</b>${rejectedIncoming?`<br><span class="muted">${ROMANCE_ROUTES.META[routeGroup].name}의 연애 분기도 함께 닫혔습니다.</span>`:''}`;
  } else if (kind === 'casual') {
    const per=D.PERSONALITIES[c.personality]||{},chastity=rec.chastity==null?(per.chastity==null?55:per.chastity):rec.chastity;
    const accepts=Math.random()<clamp(.82-chastity*.006+(c.personality==='free'?.18:0),.18,.9);
    if(accepts){
      const contract=activeChildhoodNightContract();
      if(contract&&c.name!==contract.anchorName){
        if(showChildhoodGroupIntervention(c.name))return;
        showChildhoodRelapseEnding(c.name,'casual');return;
      }
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
  S._dateCompanion = null; S._dateFriends = null; S._dateContacts = null; S._datePartners = null;
  if (S.phase === 'closed' && $('market-close') && $('market-close').style.display === 'block') renderCloseReport(S.day);
}

// 연애 시작 (특정 상대 지정) — 데이트 성공/취미 누적 공용
function startDating(partnerObj) {
  const L = S.life;
  const rec = rememberPerson(partnerObj, 'partner');
  RELATIONSHIPS.startRelationship(L,rec,S.day);
  rec.status='partner';rec.mood='happy';
  if(isDangerousHeroine(rec))awakenDangerousHeroine(rec,'relationship');
  L.happy = clamp(L.happy + 15, 0, 100);
  const per = D.PERSONALITIES[rec.personality] || {};
  addNews(`💕 ${rec.name}(${rec.job}·${per.name})님과 연애 시작!`, 'good');
  flashToast(`💕 ${rec.name}님과 연애 시작!`, 'good');
  celebrate(); playSound('buy');
}

/* 이별 처리 공용 — 헤어진 상대는 명부에 '전 연인' 기록으로 남고 연락처는 차단한다.
 * charmPenalty: 매력에 곱할 비율, happyPenalty: 행복 감소치 */
function breakUp(charmPenalty, happyPenalty) {
  const L = S.life;
  const name = L.partner ? L.partner.name : '연인';
  const devotion=ROMANCE_ROUTES&&ROMANCE_ROUTES.devotion(L);
  if(devotion&&devotion.active)ROMANCE_ROUTES.endDevotion(L,devotion.groupId,'breakup');
  if (L.partner) {
    const rec = rememberPerson(L.partner, 'ex');
    rec.affection = Math.max(0, Math.round((L.affection || 0) * 0.5));   // 미련은 절반쯤 남는다
    const parting = ROMANCE.momentLine(L.partner, 'parting');
    if (parting) addNews(`💔 ${name}: ${parting}`, 'bad');
  }
  L.relationship = 'single';
  const poly=ensurePolycule(L);poly.members.forEach(x=>{const r=metRecord(L,x.name);if(r)r.status='ex';});poly.active=false;poly.members=[];poly.trust=0;
  if(L.dangerousTrioBond&&L.dangerousTrioBond.active){DANGEROUS_HEROINE_NAMES.forEach(n=>{const r=metRecord(L,n);if(r)r.status='ex';});removeDangerousTrioFaction(L);L.dangerousTrioBond=null;}
  if(L.freedomTrioBond&&L.freedomTrioBond.active){FREEDOM_TRIO.NAMES.forEach(n=>{const r=metRecord(L,n);if(r)r.status='ex';});L.freedomTrioBond=null;}
  ensureMet(L).filter(rec=>rec.status==='ex').forEach(ensureCourtship);
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
         <div class="event-desc">${married ? `이혼하면 재산분할·위자료로 <b class="down">약 ${won(alimony)}원</b>이 나가고, 주변에 소문이 날 수 있어요.` : `상대에게 관계를 끝내겠다고 말합니다.`} 정말 진행할까요?<br><span class="muted">${resistNote}</span></div>
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
  const name = breakUp(resisted ? 0.45 : 0.75, resisted ? 30 : 18);   // 상대는 차단된 '전 연인' 기록으로 남는다
  addNews(`💔 ${married ? '이혼' : '이별'} · ${text} 정리 비용 ${won(cost)}원`, 'bad');
  playSound('error');
  const out = $('breakup-outcome');
  const optWrap = $('life-event').querySelector('.event-options'); if (optWrap) optWrap.innerHTML = '';
  out.innerHTML =
    `<div class="oc-text">💔 ${text}</div>` +
    `<div class="oc-changes">정리 비용 -${won(cost)}${resisted ? ' · 평판 -8' : ''} · 매력·행복 감소</div>` +
    `<div class="oc-text muted" style="margin-top:4px">${name}님은 '전 연인' 기록으로 남고 연락처는 차단했습니다. 새 메시지는 도착하지 않습니다.</div>` +
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
  if(L.dangerousTrioBond&&L.dangerousTrioBond.active){
    flashToast('🦂 세 사람은 한 사람을 중심으로 한 결혼·서약 형식을 받지 않습니다','neutral');return;
  }
  const members=RELATIONSHIPS.consensualMembers(L);
  if (!members.length||RELATIONSHIPS.ensure(L).relationshipGroup.status!=='dating') { flashToast('먼저 관계를 시작하세요', 'neutral'); return; }
  if (L.charm < R.MARRY_AT) { flashToast(`매력이 더 필요해요 (${Math.floor(L.charm)}/${R.MARRY_AT})`, 'neutral'); return; }
  if (S.capital < R.WEDDING_COST) { flashToast(`💸 결혼식 비용 ${won(R.WEDDING_COST)}원 부족`, 'bad'); playSound('error'); return; }
  S.capital -= R.WEDDING_COST;
  RELATIONSHIPS.commit(L,S.day);
  FAMILY.syncCaregivers(L,RELATIONSHIPS.caregiverNames(L));
  L.happy = clamp(L.happy + 30, 0, 100);
  const names=RELATIONSHIPS.joinNames(members),commitLabel=members.length>1?'공동생활 서약':'결혼';
  addNews(`💍 ${names}님과 ${commitLabel}! 누구도 주연인으로 두지 않는 가족 합의를 맺었습니다 🎉`, 'good');
  flashToast(`💍 ${names}님과 ${commitLabel}! 🎉`, 'good');
  celebrate({ particleCount: 220, spread: 110 });
  setTimeout(() => celebrate({ angle: 60, origin: { x: 0 } }), 250);
  setTimeout(() => celebrate({ angle: 120, origin: { x: 1 } }), 400);
  playSound('buy'); afterLifeAction('가족');
}

function relationshipGroupTone(person){
  if(!person)return'exclusive';
  if(person.name==='나래'||person.special==='tutorial'||person.personality==='obsessive'||person.special==='obsessive')return'exclusive';
  if(['free','lavish'].includes(person.personality))return'freedom';
  if(['cold','ambitious'].includes(person.personality))return'independent';
  return'home';
}
function groupToneLabel(tone){return{freedom:'자유·비독점',independent:'독립·거리 존중',home:'생활 공동체',exclusive:'독점 관계'}[tone]||tone;}
function groupToneCompatible(a,b){return a===b||(a==='freedom'&&b==='independent')||(a==='independent'&&b==='freedom');}
function polyculeCandidateFits(L,candidate){
  const tone=relationshipGroupTone(candidate),existing=RELATIONSHIPS.consensualMembers(L);
  if(tone==='exclusive'||!existing.length)return false;
  return existing.every(person=>groupToneCompatible(relationshipGroupTone(person),tone));
}
function showPolyculeProposal(){
  const L=S.life,members=RELATIONSHIPS.consensualMembers(L),p=members[0];if(!p)return;const poly=ensurePolycule(L),host=$('life-event');if(!host)return;
  const tones=members.map(relationshipGroupTone),tone=tones[0],records=members.map(person=>metRecord(L,person.name)).filter(Boolean);
  const ready=tones.every(value=>value!=='exclusive'&&groupToneCompatible(tone,value))&&(L.affection||0)>=60&&records.every(rec=>(rec.trust||0)>=35);
  host.style.display='block';host.innerHTML=`<div class="window event-window"><div class="title-bar event-bar"><div class="title-bar-text">🌈 한 식탁의 대화</div><div class="title-bar-controls"><button aria-label="Close" id="poly-x"></button></div></div><div class="window-body"><img class="life-scene-banner" src="./assets/relationship-polycule.png" alt="여러 사람이 한 식탁에 앉아 대화하는 장면"><div class="date-profile"><img class="char-portrait" src="${characterPortrait(p,'neutral')}" alt="${RELATIONSHIPS.joinNames(members)}"><div><strong>${RELATIONSHIPS.joinNames(members)}</strong><br><span class="muted">${groupToneLabel(tone)}</span></div></div><div class="event-desc">지금 곁에 있는 사람들은 서로의 자리를 어떻게 받아들이고 있는지 처음으로 한 식탁에서 이야기합니다.</div><div class="important-event-detail">${ready?'누구도 말을 피하지 않았습니다. 이제 각자의 뜻을 직접 확인할 차례입니다.':'대화는 몇 번이나 끊겼습니다. 오늘은 결론을 내리지 않는 편이 나아 보입니다.'}</div><div class="event-options"><button class="event-opt" id="poly-go" ${ready?'':'disabled'}>서로의 뜻을 끝까지 듣는다</button><button class="event-opt" id="poly-cancel">오늘은 여기까지 이야기한다</button></div><div class="event-outcome" id="poly-outcome"></div></div></div>`;
  $('poly-go').addEventListener('click',resolvePolyculeProposal);[$('poly-x'),$('poly-cancel')].forEach(b=>b.addEventListener('click',closeLifeEvent));
}
function resolvePolyculeProposal(){
  const L=S.life,members=RELATIONSHIPS.consensualMembers(L),poly=ensurePolycule(L),tone=relationshipGroupTone(members[0]),records=members.map(person=>metRecord(L,person.name)).filter(Boolean),ok=members.length&&members.every(person=>groupToneCompatible(tone,relationshipGroupTone(person))&&relationshipGroupTone(person)!=='exclusive')&&(L.affection||0)>=60&&records.every(rec=>(rec.trust||0)>=35);
  const opts=$('poly-outcome').parentElement.querySelector('.event-options');if(opts)opts.innerHTML='';
  if(ok){poly.active=true;poly.mode='compatibility';poly.tone=tone;poly.trust=55;$('poly-outcome').innerHTML=`<div class="oc-text up">${RELATIONSHIPS.joinNames(members)}님은 누구도 대신 대답하지 않은 채 각자의 자리를 인정했습니다.</div><button id="poly-confirm">확인</button>`;addNews(`🌈 ${RELATIONSHIPS.joinNames(members)}님과 서로의 관계를 솔직하게 이야기했습니다`,'good');}
  else{$('poly-outcome').innerHTML=`<div class="oc-text down">몇 사람은 침묵했고, 몇 사람은 먼저 자리를 떴습니다. 오늘은 관계를 바꾸지 않기로 했습니다.</div><button id="poly-confirm">확인</button>`;addNews('🌈 식탁의 대화가 결론 없이 끝났습니다','neutral');}
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
  const referral=result.choice.id==='roles'?noteChaerinSupportRefusal(S.life,'shared-home-aftermath'):null;
  $('trio-aftermath-outcome').innerHTML=`<div class="oc-text">${result.choice.result}</div>${referral?`<div class="important-event-detail ${referral.given?'up':'neutral'}">${referral.text}</div>`:''}<div class="oc-changes">공생 안정도 ${result.choice.stability>=0?'+':''}${result.choice.stability||0}${result.choice.obsession?` · 세 사람 집착 ${result.choice.obsession>0?'+':''}${result.choice.obsession}`:''}${result.choice.faction?` · 세력 경험 +${result.choice.faction}`:''}</div><button id="trio-aftermath-confirm" class="session-btn opening">후일담을 기록하고 다음 사건 보기</button>`;
  $('trio-aftermath-confirm').addEventListener('click',()=>{host.style.display='none';host.innerHTML='';renderLifePanel();autoSave();showNextImportantEvent();});
}
function enlistDangerousTrioFaction(L){
  const bond=L.dangerousTrioBond;if(!bond||!bond.active)return;
  const faction=RIVALS.ensureFaction(L);faction.level=Math.max(1,faction.level||0);faction.trioCapacityBonus=1;
  if(FACTION_CAMPAIGN)FACTION_CAMPAIGN.activateSpecial(L,'underground');
  const sera=metRecord(L,'윤세라'),sourceId='trio-sera';
  if(sera&&!faction.members.some(member=>member.sourceId===sourceId)){
    faction.members.push({uid:`${sourceId}-${S.day}`,sourceId,name:'윤세라',role:'intel',portrait:sera.portrait,gender:sera.gender,
      loyalty:100,upkeep:0,stats:{defense:.02,intel:.17,income:250000},named:true,trioCouncil:true,desc:'사람의 습관과 배신 징후를 추적하는 공동생활 정보원.',injuredMonths:0});
  }
  L.legalShield=Math.max(1,L.legalShield||0);
  bond.supportRoles={yujin:'조직 밖 법적 방어·비상 연락',chaerin:'지원 제안 거절·사업 인맥 연결',sera:'세력 정보원'};
  bond.factionJoined=true;bond.chaerinCashAccepted=false;
  RIVALS.ensureFaction(L);
}
function removeDangerousTrioFaction(L){
  const faction=RIVALS.ensureFaction(L);
  faction.members=(faction.members||[]).filter(member=>!member.trioCouncil);
  faction.trioCapacityBonus=0;
  faction.assets=(faction.assets||[]).filter(asset=>!asset.trioHome);
  RIVALS.ensureFaction(L);
}

function firstSubordinateWitness(){
  const L=S.life,social=SOCIAL.ensure(L),faction=RIVALS.ensureFaction(L);
  const contacts=(social.contacts||[]).filter(contact=>SOCIAL.isSubordinate(contact));
  const contact=contacts.find(item=>/첫 부하/.test(item.relationLabel||''))||contacts.find(item=>item.factionMemberId)||contacts[0]||null;
  const members=faction.members||[];
  const member=contact
    ?members.find(item=>item.sourceId===contact.factionMemberId||item.uid===contact.factionMemberId||item.name===contact.name)
    :members.find(item=>/^mentor-/.test(item.sourceId||''))||members[0];
  const name=(contact&&contact.name)||(member&&member.name)||'겁먹은 행동대원';
  return{name,contact,member,portrait:member?characterPortrait(member):emojiAvatar({emoji:'🕶️'})};
}

function lockDangerousTrioHome(L){
  const current=HOUSING.ensure(L),already=current.id==='starter'&&current.tenure==='monthly';
  const refund=already?0:Math.round(HOUSING.assetValue(L)*(current.tenure==='owned'?.98:1));
  if(refund>0)S.capital+=refund;
  L.housing={id:'starter',tenure:'monthly',depositPaid:0,assetValue:0,months:0,starterLease:true,starterLeaseAssetAdjusted:true,trioLocked:true};
  if(!already)addNews(`🏠 기존 거주 계약을 정리하고 자취방으로 돌아왔습니다${refund?` · 주거 자산 ${won(refund)}원 회수`:''}`,'neutral');
  return refund;
}
function trioWitness(){
  const L=S.life,taesik=metRecord(L,'장태식');
  if(L.makjang||taesik)return{name:'장태식',portrait:characterPortrait(D.SPECIAL_CHARACTERS.taesik,'angry'),line:'저 미친 여자들 제발 어디 방생하지 말고 네가 평생 책임져. 나도 살면서 이런 조합은 처음 본다.'};
  const witness=firstSubordinateWitness();
  if(witness.member||witness.contact)return{...witness,line:'대장님, 저 셋 제발 밖에 방생하지 말고 여기서 풀어요. 라이벌보다 무섭습니다.'};
  return{...witness,line:'형님, 저 셋 제발 밖에 방생하지 말고 여기서 풀어요. 남들은 좀 살게요.'};
}
function dangerousTrioSpeaker(s,witness){
  const subordinate=s.name==='첫 부하'||s.name==='목격자';
  const person=subordinate?witness:metRecord(S.life,s.name);
  return{
    name:subordinate?witness.name:s.name,
    line:s.name==='목격자'?witness.line:s.line,
    portrait:subordinate?witness.portrait:characterPortrait(person)
  };
}
function showDangerousTrioPrelude(eventId){
  if(!DANGEROUS_TRIO)return;
  const host=$('life-event'),event=DANGEROUS_TRIO.nextPrelude(S.life);
  if(!host||!event||event.id!==eventId){closeLifeEvent();showNextImportantEvent();return;}
  const state=DANGEROUS_TRIO.ensure(S.life),witness=firstSubordinateWitness();
  const phase=['서로 경계함','서로의 결핍을 알아챔','싸우면서 편들기 시작함'][state.preludeStage]||'악우가 됨';
  const speakers=event.speakers.map(s=>{
    const row=dangerousTrioSpeaker(s,witness);
    return`<div class="trio-dialogue"><img src="${row.portrait}" alt="${row.name}"><div><b>${row.name}</b><p>“${row.line}”</p></div></div>`;
  }).join('');
  host.style.display='block';
  host.innerHTML=`<div class="window event-window trio-route-window"><div class="title-bar event-bar"><div class="title-bar-text">${event.icon} ${event.title}</div><div class="title-bar-controls"><button aria-label="Close" id="trio-prelude-x"></button></div></div><div class="window-body"><img class="life-scene-banner" src="${event.scene}" alt="${event.title} 사건"><div class="trio-meter"><span>세 사람의 현재 거리</span><b class="${state.stability<30?'down':'up'}">${phase}</b></div><div class="event-desc">${event.desc}</div><div class="trio-dialogues">${speakers}</div><div class="event-options">${event.choices.map(choice=>`<button class="event-opt" data-trio-prelude-choice="${choice.id}">${choice.text}</button>`).join('')}<button class="event-opt" id="trio-prelude-later">오늘은 회의를 끝낸다</button></div><div class="event-outcome" id="trio-prelude-outcome"></div></div></div>`;
  host.querySelectorAll('[data-trio-prelude-choice]').forEach(button=>button.addEventListener('click',()=>resolveDangerousTrioPrelude(button.dataset.trioPreludeChoice)));
  [$('trio-prelude-x'),$('trio-prelude-later')].forEach(button=>button.addEventListener('click',()=>{DANGEROUS_TRIO.deferPrelude(S.life,S.day);closeLifeEvent();autoSave();}));
}
function resolveDangerousTrioPrelude(choiceId){
  const result=DANGEROUS_TRIO.applyPrelude(S.life,choiceId);if(!result)return;
  result.state.lastPreludeDay=S.day;
  const host=$('life-event'),options=host&&host.querySelector('.event-options');if(options)options.innerHTML='';
  $('trio-prelude-outcome').innerHTML=`<div class="oc-text">${result.choice.result}</div><div class="oc-changes">세 사람의 공조 ${result.choice.stability>=0?'+':''}${result.choice.stability} · 신뢰 ${result.choice.trust>=0?'+':''}${result.choice.trust}</div>${result.complete?'<div class="important-event-detail up">셋은 끝내 친해졌다는 말을 하지 않았습니다. 대신 서로의 잘못을 가장 먼저 지적하고, 외부가 한 사람을 건드리면 나머지 둘이 먼저 움직이는 악우가 됐습니다.</div>':''}<button id="trio-prelude-confirm" class="session-btn opening">회의를 마친다</button>`;
  addNews(`${result.event.icon} 강유진·한채린·윤세라 · ${result.event.title}`,result.choice.stability<0?'bad':'neutral');
  $('trio-prelude-confirm').addEventListener('click',()=>{closeLifeEvent();renderLifePanel();showNextImportantEvent();});
  renderLifePanel();autoSave();
}
function dangerousTrioCast(){
  return DANGEROUS_TRIO.NAMES.map(name=>metRecord(S.life,name)).filter(Boolean);
}
function showDangerousTrioRoute(){
  if(!DANGEROUS_TRIO)return;const host=$('life-event');if(!host)return;
  const L=S.life,state=DANGEROUS_TRIO.ensure(L),check=DANGEROUS_TRIO.eligibility(L),cast=dangerousTrioCast();
  if(state.active){showDangerousTrioStory();return;}
  const castHtml=cast.map(r=>`<div class="trio-person"><img src="${characterPortrait(r)}" alt="${r.name}"><b>${r.name}</b><small>${relationTag(L,r.name)}</small></div>`).join('');
  const progress=`<div class="trio-requirement ${check.badFriendsFormed?'ready':''}"><b>세 사람</b><span>${check.badFriendsFormed?'서로를 욕하면서도 같은 자료를 들고 왔습니다':'서로의 잘못을 따지느라 아직 같은 편이라고 인정하지 않습니다'}</span></div>`+check.rows.map(row=>`<div class="trio-requirement ${row.ready?'ready':''}"><b>${row.name}</b><span>${row.ready?'시선을 피하지 않고 자리에 남았습니다':'아직 같은 방에 오래 머물 생각은 없어 보입니다'}</span></div>`).join('');
  const ending=state.ending?`<div class="story-ending"><b>📕 ${state.ending.title}</b><br>${state.ending.text}</div>`:'';
  host.style.display='block';
  host.innerHTML=`<div class="window event-window trio-route-window"><div class="title-bar event-bar"><div class="title-bar-text">🦂 세 사람의 낯선 동석</div><div class="title-bar-controls"><button aria-label="Close" id="trio-x"></button></div></div><div class="window-body"><img class="life-scene-banner" src="${state.ending&&state.ending.scene||'./assets/event-trio-647.png'}" alt="강유진 한채린 윤세라가 같은 방에 모인 장면"><div class="trio-cast">${castHtml}</div><div class="event-desc">서로를 믿지 않던 유진, 채린, 세라가 한 테이블에 앉았습니다. 셋은 각자 자신이 가장 정상이라고 주장하면서도 누구도 먼저 자리를 뜨지 않습니다.</div>${ending||`<div class="trio-requirements">${progress}</div><div class="important-event-detail">${check.ok?'세 사람 모두 당신의 말을 기다리고 있습니다.':'몇 번이나 대화가 끊기고 의자가 밀려났습니다. 오늘은 아직 셋을 붙잡아 둘 수 없을 것 같습니다.'}</div><button id="trio-start" class="session-btn ${check.ok?'opening':''}" ${check.ok?'':'disabled'}>세 사람과 이야기를 시작한다</button>`}</div></div>`;
  $('trio-x').addEventListener('click',closeLifeEvent);
  const start=$('trio-start');if(start)start.addEventListener('click',startDangerousTrioRoute);
}
function startDangerousTrioRoute(auto){
  const result=DANGEROUS_TRIO.start(S.life);if(!result.ok){if(auto)showNextImportantEvent();else flashToast('세 사람은 아직 같은 자리에 오래 머물 생각이 없습니다','neutral');return;}
  addNews('🦂 서로의 잘잘못과 취향까지 알아버린 강유진·한채린·윤세라가 처음으로 같은 편을 자처했습니다','bad');
  autoSave();showDangerousTrioStory();
}
function showDangerousTrioStory(){
  const chapter=DANGEROUS_TRIO.next(S.life),host=$('life-event');if(!chapter||!host){closeLifeEvent();showNextImportantEvent();return;}
  const state=DANGEROUS_TRIO.ensure(S.life),witness=trioWitness();
  const speakers=chapter.speakers.map(s=>{
    const row=dangerousTrioSpeaker(s,witness);
    return`<div class="trio-dialogue"><img src="${row.portrait}" alt="${row.name}"><div><b>${row.name}</b><p>“${row.line}”</p></div></div>`;
  }).join('');
  host.style.display='block';
  host.innerHTML=`<div class="window event-window trio-route-window"><div class="title-bar event-bar"><div class="title-bar-text">${chapter.icon} ${chapter.title}</div><div class="title-bar-controls"><button aria-label="Close" id="trio-story-x"></button></div></div><div class="window-body"><img class="life-scene-banner" src="${chapter.scene}" alt="${chapter.title} 이벤트 컷신"><div class="trio-meter"><span>세 사람의 분위기</span><b class="${state.stability<30?'down':'up'}">${state.stability<30?'금방이라도 깨질 듯함':'묘하게 맞물림'}</b></div><div class="event-desc">${chapter.desc}</div><div class="trio-dialogues">${speakers}</div><div class="event-options">${chapter.choices.map(choice=>`<button class="event-opt" data-trio-choice="${choice.id}">${choice.text}</button>`).join('')}<button class="event-opt" id="trio-story-later">지금은 셋을 돌려보낸다</button></div><div class="event-outcome" id="trio-outcome"></div></div></div>`;
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
  const scene=host.querySelector('.life-scene-banner');if(scene&&result.ending&&result.ending.scene)scene.src=result.ending.scene;
  const ending=result.ending?`<div class="story-ending ${result.ending.tone==='bad'?'down':''}"><b>📕 ${result.ending.title}</b><br>${result.ending.text}</div>`:'';
  const success=result.ending&&result.ending.id==='bad_friends'?`<div class="important-event-detail up">세 사람의 모든 이야기가 끝났습니다. 다음 장에서 세 사람이 먼저 네 번째 열쇠를 받을지 묻습니다.</div>`:'';
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
  if(S.life.romanceRoutes){delete S.life.romanceRoutes.failed.dangerous;delete S.life.romanceRoutes.completed.dangerous;delete S.life.romanceRoutes.declined.dangerous;S.life.romanceRoutes.active='dangerous';}
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
  L.dangerousTrioBond={active:true,since:S.day,members:DANGEROUS_HEROINE_NAMES.slice(),clubEscapeAttempts:0,chaerinSupportRefusals:0,chaerinCashAccepted:false};
  people.forEach(person=>RELATIONSHIPS.addMember(L,person,S.day));const group=RELATIONSHIPS.ensure(L).relationshipGroup;group.agreement.cohabiting=true;group.agreement.publicity='public';
  FAMILY.syncCaregivers(L,RELATIONSHIPS.caregiverNames(L));
  lockDangerousTrioHome(L);
  enlistDangerousTrioFaction(L);
  const refusal=noteChaerinSupportRefusal(L,'shared-home-formation');
  addNews('🦂 공동생활 성립 · 세라만 세력 정보원으로 합류했고, 유진은 조직 밖 법적 방어를 맡았습니다. 채린의 집과 생활비 제안은 정중히 거절했습니다','good');
  if(refusal)addNews(`👑 ${refusal.text}`,'neutral');
}

function freedomTrioCast(){
  return FREEDOM_TRIO?FREEDOM_TRIO.NAMES.map(name=>metRecord(S.life,name)).filter(Boolean):[];
}
function startFreedomTrioRoute(auto){
  if(!FREEDOM_TRIO){if(auto)showNextImportantEvent();return;}
  const result=FREEDOM_TRIO.start(S.life);
  if(!result.ok){if(auto)showNextImportantEvent();else flashToast('세 사람은 아직 함께 귀가할 만큼 가까운 사이가 아닙니다','neutral');return;}
  addNews('🏠 채원·유나·소희가 화려한 일정을 마치고 같은 귀가길에 올랐습니다','good');
  autoSave();showFreedomTrioStory();
}
function showFreedomTrioStory(){
  const chapter=FREEDOM_TRIO&&FREEDOM_TRIO.next(S.life),host=$('life-event');
  if(!chapter||!host){closeLifeEvent();showNextImportantEvent();return;}
  const state=FREEDOM_TRIO.ensure(S.life);
  const speakers=chapter.speakers.map(s=>{const person=metRecord(S.life,s.name);return`<div class="trio-dialogue"><img src="${characterPortrait(person)}" alt="${s.name}"><div><b>${s.name}</b><p>“${s.line}”</p></div></div>`;}).join('');
  host.style.display='block';
  host.innerHTML=`<div class="window event-window trio-route-window freedom-trio-window"><div class="title-bar event-bar"><div class="title-bar-text">${chapter.icon} ${chapter.title}</div><div class="title-bar-controls"><button aria-label="Close" id="freedom-story-x"></button></div></div><div class="window-body"><img class="life-scene-banner" src="${chapter.scene}" alt="${chapter.title} 이벤트 컷신"><div class="trio-meter"><span>세 사람의 분위기</span><b class="${state.harmony<30?'down':'up'}">${state.harmony<30?'서로 눈치를 보는 중':'말없이도 편안함'}</b></div><div class="event-desc">${chapter.desc}</div><div class="trio-dialogues">${speakers}</div><div class="event-options">${chapter.choices.map(choice=>{const poor=choice.cash<0&&S.capital<Math.abs(choice.cash),cost=choice.cash?`<span class="opt-sub">현금 -${won(Math.abs(choice.cash))}${poor?' · 현금 부족':''}</span>`:'';return`<button class="event-opt" data-freedom-choice="${choice.id}" ${poor?'disabled':''}>${choice.text}${cost}</button>`;}).join('')}<button class="event-opt" id="freedom-story-later">오늘은 각자 쉬고 다음에 이야기한다</button></div><div class="event-outcome" id="freedom-outcome"></div></div></div>`;
  host.querySelectorAll('[data-freedom-choice]').forEach(button=>button.addEventListener('click',()=>resolveFreedomTrioStory(button.dataset.freedomChoice)));
  [$('freedom-story-x'),$('freedom-story-later')].forEach(button=>button.addEventListener('click',closeLifeEvent));
}
function freedomTrioCheckpoint(){
  const L=S.life;
  return{
    state:JSON.parse(JSON.stringify(FREEDOM_TRIO.ensure(L))),capital:S.capital,relationship:L.relationship,
    partner:L.partner?JSON.parse(JSON.stringify(L.partner)):null,affection:L.affection,
    relationshipGroup:L.relationshipGroup?JSON.parse(JSON.stringify(L.relationshipGroup)):null,
    polycule:JSON.parse(JSON.stringify(ensurePolycule(L))),
    bond:L.freedomTrioBond?JSON.parse(JSON.stringify(L.freedomTrioBond)):null,
    people:FREEDOM_TRIO.NAMES.map(name=>{const r=metRecord(L,name);return r&&{name,status:r.status,affection:r.affection,trust:r.trust};}).filter(Boolean)
  };
}
function registerFactionMotive(source,title,detail,preferredName){
  const L=S.life,faction=RIVALS.ensureFaction(L);
  faction.personalMotives=faction.personalMotives||[];
  if(faction.personalMotives.some(m=>m.source===source))return;
  const viable=(S.bots||[]).filter(bot=>!bot.bankrupt&&bot.name!=='장태식');
  const target=viable.find(bot=>preferredName&&bot.name.includes(preferredName))
    ||viable.slice().sort((a,b)=>(b.pressure||0)-(a.pressure||0))[0];
  if(!target)return;
  faction.personalMotives.push({source,title,detail,target:target.name,day:S.day,resolved:false});
  addNews(`🕵️ 배후 특정 · ${target.name} — ${title}`,'bad');
}
function resolveFreedomTrioStory(choiceId){
  const chapter=FREEDOM_TRIO.next(S.life),choice=chapter&&chapter.choices.find(item=>item.id===choiceId);if(!choice)return;
  if(choice.cash<0&&S.capital<Math.abs(choice.cash)){flashToast('💸 이 선택에 필요한 현금이 부족합니다','bad');return;}
  const chapterIndex=FREEDOM_TRIO.ensure(S.life).stage;
  S._freedomRetry=freedomTrioCheckpoint();
  const result=FREEDOM_TRIO.apply(S.life,choiceId);if(!result)return;
  if(chapterIndex===1&&result.choice.tag!=='control'){
    registerFactionMotive(
      'freedom_trio',
      '세 사람의 사생활을 거래한 세력',
      '유나의 허위 기사, 채원의 일정 유출, 소희 공연의 투자 철회가 한 경쟁 세력의 공작비에서 나왔다. 세 사람의 소박한 일상을 되찾으려면 그 정보망부터 끊어야 한다.',
      '라이브'
    );
  }
  if(result.choice.cash)S.capital+=result.choice.cash;
  if(result.choice.happy)S.life.happy=clamp((S.life.happy||0)+result.choice.happy,0,100);
  if(result.choice.stress)S.life.stress=clamp((S.life.stress||0)+result.choice.stress,0,100);
  const host=$('life-event'),options=host.querySelector('.event-options');if(options)options.innerHTML='';
  if(result.ending&&result.ending.tone==='bad')applyFreedomTrioBadEnding();
  const ending=result.ending?`<div class="story-ending ${result.ending.tone==='bad'?'down':''}"><img class="relationship-scene" src="${result.ending.scene}" alt="${result.ending.title} 엔딩"><b>📕 ${result.ending.title}</b><br>${result.ending.text}</div>`:'';
  const success=result.ending&&result.ending.tone==='good'?`<div class="important-event-detail up">세 사람의 개인사와 작은 집 이야기가 모두 끝났습니다. 다음 장에서 세 사람이 먼저 네 번째 슬리퍼를 남길지 묻습니다.</div>`:'';
  const retry=result.ending&&result.ending.tone==='bad'?'<button id="freedom-retry" class="session-btn opening">↩️ 마지막 선택 다시 하기</button>':'';
  $('freedom-outcome').innerHTML=`<div class="oc-text">${result.choice.result}</div><div class="oc-changes">관계 조화 ${result.choice.harmony>=0?'+':''}${result.choice.harmony} · 안식감 ${result.choice.rest>=0?'+':''}${result.choice.rest||0} · 세 사람 신뢰 ${result.choice.trust>=0?'+':''}${result.choice.trust||0}${result.choice.happy?` · 행복 ${result.choice.happy>0?'+':''}${result.choice.happy}`:''}${result.choice.stress?` · 스트레스 ${result.choice.stress>0?'+':''}${result.choice.stress}`:''}${result.choice.cash?` · 현금 -${won(Math.abs(result.choice.cash))}`:''}</div>${ending}${success}${retry}<button id="freedom-confirm" class="session-btn ${result.ending&&result.ending.tone==='bad'?'':'opening'}">${result.ending?'엔딩 확인':'이번 사건을 마친다'}</button>`;
  addNews(`${result.chapter.icon} 작은 집의 세 사람 · ${result.chapter.title}`,result.choice.tag==='control'?'bad':'good');
  const retryBtn=$('freedom-retry');if(retryBtn)retryBtn.addEventListener('click',retryFreedomTrioChoice);
  $('freedom-confirm').addEventListener('click',()=>{closeLifeEvent();renderCapital();renderLifePanel();if(!result.ending)showNextImportantEvent();});
  renderCapital();renderLifePanel();autoSave();
}
function applyFreedomTrioBadEnding(){
  const L=S.life,names=FREEDOM_TRIO.NAMES;
  names.forEach(name=>{const r=metRecord(L,name);if(r)r.status='ex';});
  names.forEach(name=>RELATIONSHIPS.removeMember(L,name,'ex'));
  const poly=ensurePolycule(L);poly.members=(poly.members||[]).filter(person=>!names.includes(person.name));if(!poly.members.length){poly.active=false;poly.mode=null;poly.trust=0;}
  L.freedomTrioBond=null;
}
function retryFreedomTrioChoice(){
  const checkpoint=S._freedomRetry;if(!checkpoint)return;const L=S.life;
  L.freedomTrio=JSON.parse(JSON.stringify(checkpoint.state));S.capital=checkpoint.capital;L.relationship=checkpoint.relationship;
  if(L.romanceRoutes){delete L.romanceRoutes.failed.freedom;delete L.romanceRoutes.completed.freedom;L.romanceRoutes.active='freedom';}
  L.partner=checkpoint.partner?JSON.parse(JSON.stringify(checkpoint.partner)):null;L.affection=checkpoint.affection;
  L.relationshipGroup=checkpoint.relationshipGroup?JSON.parse(JSON.stringify(checkpoint.relationshipGroup)):null;
  L.polycule=JSON.parse(JSON.stringify(checkpoint.polycule));L.freedomTrioBond=checkpoint.bond?JSON.parse(JSON.stringify(checkpoint.bond)):null;
  checkpoint.people.forEach(saved=>{const r=metRecord(L,saved.name);if(r){r.status=saved.status;r.affection=saved.affection;r.trust=saved.trust;}});
  showFreedomTrioStory();renderCapital();renderLifePanel();autoSave();
}
function activateFreedomTrioBond(endingId){
  const L=S.life,people=FREEDOM_TRIO.NAMES.map(name=>metRecord(L,name)).filter(Boolean);if(people.length!==3)return;
  const existingMembers=RELATIONSHIPS.consensualMembers(L).slice(),main=people[0],others=people.slice(1),poly=ensurePolycule(L);
  L.relationship='dating';L.partner=Object.assign({},main,{mood:'happy'});L.affection=Math.round(people.reduce((sum,r)=>sum+(r.affection||0),0)/3);main.status='partner';
  poly.active=true;poly.mode='freedom_trio_success';poly.tone='freedom';poly.trust=Math.round(FREEDOM_TRIO.ensure(L).harmony);
  const added=others.map(r=>{r.status='polycule';return{name:r.name,job:r.job,personality:r.personality,age:r.age,emoji:r.emoji,gender:r.gender,portrait:r.portrait};});
  if(window.QT_ROMANCE_ROUTES)QT_ROMANCE_ROUTES.preserveMembers(L,[...existingMembers,...added]);else poly.members=added;
  L.freedomTrioBond={active:true,since:S.day,endingId,members:FREEDOM_TRIO.NAMES.slice(),totalIncome:0,totalStressRecovered:0};
  people.forEach(person=>RELATIONSHIPS.addMember(L,person,S.day));const group=RELATIONSHIPS.ensure(L).relationshipGroup;group.agreement.cohabiting=endingId!=='world_tour';group.agreement.publicity='private';
  if(group.agreement.cohabiting)FAMILY.syncCaregivers(L,RELATIONSHIPS.caregiverNames(L));
  addNews(`🏠 ${endingId==='bright_home'?'화려한 날 뒤의 불 켜진 집':'네 사람의 작은 저녁'} 엔딩 · 채원·유나·소희와 힐링 공동생활이 시작됐습니다`,'good');
}
function showFreedomTrioAftermath(){
  const event=FREEDOM_TRIO&&FREEDOM_TRIO.nextAftermath(S.life),host=$('life-event');
  if(!event||!host){showNextImportantEvent();return;}
  const speakers=event.speakers.map(s=>{const r=metRecord(S.life,s.name);return`<div class="trio-dialogue"><img src="${characterPortrait(r)}" alt="${s.name}"><div><b>${s.name}</b><p>“${s.line}”</p></div></div>`;}).join('');
  host.style.display='block';
  host.innerHTML=`<div class="window event-window trio-route-window freedom-trio-window"><div class="title-bar event-bar"><div class="title-bar-text">${event.icon} 작은 집의 후일담 · 선택 필요</div></div><div class="window-body"><img class="life-scene-banner" src="${event.scene}" alt="${event.title}"><div class="event-title">${event.title}</div><div class="event-desc">${event.desc}</div><div class="trio-dialogues">${speakers}</div><div class="event-options">${event.choices.map(choice=>{const poor=choice.cash<0&&S.capital<Math.abs(choice.cash);return`<button class="event-opt" data-freedom-aftermath="${choice.id}" ${poor?'disabled':''}>${choice.text}${choice.cash?`<span class="opt-sub">현금 -${won(Math.abs(choice.cash))}${poor?' · 현금 부족':''}</span>`:''}</button>`;}).join('')}</div><div class="event-outcome" id="freedom-aftermath-outcome"></div></div></div>`;
  host.querySelectorAll('[data-freedom-aftermath]').forEach(button=>button.addEventListener('click',()=>resolveFreedomTrioAftermath(button.dataset.freedomAftermath)));
}
function resolveFreedomTrioAftermath(choiceId){
  const event=FREEDOM_TRIO.nextAftermath(S.life),choice=event&&event.choices.find(item=>item.id===choiceId),host=$('life-event');if(!choice||!host)return;
  if(choice.cash<0&&S.capital<Math.abs(choice.cash)){flashToast('💸 현금이 부족합니다','bad');return;}
  const result=FREEDOM_TRIO.applyAftermath(S.life,choiceId);if(!result)return;
  if(result.choice.cash)S.capital+=result.choice.cash;if(result.choice.income)S.capital+=result.choice.income;
  if(result.choice.happy)S.life.happy=clamp((S.life.happy||0)+result.choice.happy,0,100);
  if(result.choice.stress)S.life.stress=clamp((S.life.stress||0)+result.choice.stress,0,100);
  const options=host.querySelector('.event-options');if(options)options.innerHTML='';
  $('freedom-aftermath-outcome').innerHTML=`<div class="oc-text">${result.choice.result}</div><div class="oc-changes">관계 조화 ${result.choice.harmony>=0?'+':''}${result.choice.harmony||0} · 안식감 ${result.choice.rest>=0?'+':''}${result.choice.rest||0}${result.choice.happy?` · 행복 ${result.choice.happy>0?'+':''}${result.choice.happy}`:''}${result.choice.stress?` · 스트레스 ${result.choice.stress>0?'+':''}${result.choice.stress}`:''}${result.choice.cash?` · 현금 -${won(Math.abs(result.choice.cash))}`:''}${result.choice.income?` · 생활 수입 +${won(result.choice.income)}`:''}</div><button id="freedom-aftermath-confirm" class="session-btn opening">후일담을 기록하고 다음 사건 보기</button>`;
  $('freedom-aftermath-confirm').addEventListener('click',()=>{host.style.display='none';host.innerHTML='';renderCapital();renderLifePanel();autoSave();showNextImportantEvent();});
  renderCapital();autoSave();
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

function startBusiness(typeId){
  if(!BUSINESS)return;
  const type=BUSINESS.typeOf(typeId);if(!type)return;
  if(S.capital<type.cost){flashToast(`💸 ${type.name} 설립에 ${won(type.cost)}원이 필요합니다`,'bad');return;}
  const result=BUSINESS.start(S.life,typeId,S.day);
  if(!result.ok){flashToast(result.message,'neutral');return;}
  S.capital-=result.cost;
  const identity=BUSINESS_ROMANCE?BUSINESS_ROMANCE.identity(S.life,result.manager.id):null;
  const managerName=identity?identity.displayName:result.manager.name;
  addNews(`${type.icon} ${type.name} 설립 · ${managerName} ${result.manager.role} 배치`,'good');
  flashToast(`${type.icon} ${type.name}을 시작했습니다 · 담당 ${managerName}`,'good');
  celebrate();afterLifeAction('사업');
}

function changeBusinessStrategy(id,strategyId){
  if(!BUSINESS)return;
  const result=BUSINESS.setStrategy(S.life,id,strategyId);
  if(!result.ok){flashToast(result.message,'bad');return;}
  const type=BUSINESS.typeOf(result.business.typeId);
  const manager=BUSINESS.staffOf(result.business.managerId);
  addNews(`${result.strategy.icon} ${type.name} 운영 방침 변경 · ${result.strategy.name} · ${manager.name} 담당`,'neutral');
  flashToast(`${result.strategy.icon} 다음 달부터 ${result.strategy.name}`,'good');
  renderLifePanel();autoSave();
}

function showClubNight(){
  const host=$('date-host');if(!host)return;
  const cost=180000;
  const canGo=S.capital>=cost;
  host.innerHTML=`<div class="window event-window place-encounter-window"><div class="title-bar event-bar"><div class="title-bar-text">🍸 클럽 입구</div><div class="title-bar-controls"><button aria-label="Close" id="club-night-x"></button></div></div><div class="window-body"><img class="dating-banner date-scene" src="${dateSceneImage('solo')}" alt="클럽의 붐비는 밤"><div class="event-title">내가 왜 여기까지 왔지?</div><div class="event-desc">문이 열릴 때마다 음악과 낯선 웃음소리가 쏟아집니다. 집으로 돌아가기 싫어서 여기까지 왔지만, 들어가서 무엇을 원하는지는 스스로도 모르겠습니다.</div><div class="important-event-detail">입장과 술값 ${won(cost)}원</div><div class="event-options"><button class="event-opt" id="club-night-go" ${canGo?'':'disabled'}>문을 열고 들어간다</button><button class="event-opt" id="club-night-back">그냥 집으로 돌아간다</button></div>${canGo?'':`<div class="event-desc down">지갑을 확인하고 발길을 돌렸습니다.</div>`}<div id="club-night-outcome" class="event-outcome"></div></div></div>`;
  const close=()=>showRouteModal();
  $('club-night-x').addEventListener('click',close);
  $('club-night-back').addEventListener('click',close);
  if(canGo)$('club-night-go').addEventListener('click',resolveClubNight);
}

function resolveClubNight(){
  const cost=180000;if(S.capital<cost)return;
  const sera=metRecord(S.life,'윤세라');
  const seraLivesHere=sera&&(S.life.seraHousing==='cohabit'||(S.life.seraHousing==null&&sera.pickedUpAfterRuin));
  if(seraLivesHere&&S.life.dangerousTrioBond&&S.life.dangerousTrioBond.active){
    resolveDangerousTrioClubAttempt();return;
  }
  if(activeChildhoodNightContract()){showChildhoodRelapseEnding('클럽의 낯선 사람','club');return;}
  const L=S.life;
  S.capital-=cost;
  L.stress=clamp((L.stress||0)-20,0,100);
  L.fitness=Math.max(0,(L.fitness||0)-2);
  L.health=clamp((L.health||0)-1,0,100);
  L.happy=clamp((L.happy||0)+5,0,100);
  const names=['지아','수빈','민서','하린','은채','다솜'];
  const name=pick(names);
  const exchanges=[
    {incoming:'어제 잘 들어갔어요? 다음 주에도 거기 갈 것 같은데.',reply:'어제는 고마웠어요. 하지만 다시 만날 생각은 없어요. 좋은 하루 보내요.'},
    {incoming:'어제 같이 찍은 사진 보내줄까요?',reply:'사진은 괜찮아요. 어제는 고마웠지만 연락을 이어가지는 않을게요.'},
    {incoming:'잠깐이었지만 재밌었어요. 또 볼래요?',reply:'저도 즐거웠어요. 그래도 다시 만나는 건 어려울 것 같아요. 잘 지내요.'},
  ];
  const exchange=pick(exchanges);
  addNews(`🍸 클럽에서 ${name}와 잠깐 어울렸습니다 · 스트레스 -20 · 체력 -2`,'neutral');
  const outcome=$('club-night-outcome');
  if(outcome)outcome.innerHTML=`<div class="phone-shell club-after-phone"><div class="phone-status"><span>다음 날</span><span>●●● 82%</span></div><div class="phone-chat-screen open"><header><span class="phone-app-icon">💬</span><span><b>저장하지 않은 번호</b><small>QuickTalk · 방금</small></span></header><div class="phone-chat-log"><div class="phone-bubble incoming">${exchange.incoming}</div><div class="phone-bubble mine">${exchange.reply}</div></div></div></div><div class="oc-changes">관계·연락처 변화 없음 · 스트레스 -20 · 체력 -2 · 건강 -1 · 행복 +5</div><button id="club-night-confirm" class="session-btn opening">답장을 보내고 휴대폰을 넣는다</button>`;
  const go=$('club-night-go'),back=$('club-night-back');if(go)go.disabled=true;if(back)back.disabled=true;
  $('club-night-confirm').addEventListener('click',()=>{closeDateModal();afterLifeAction('휴식');});
  autoSave();
}

function resolveDangerousTrioClubAttempt(){
  const L=S.life,bond=L.dangerousTrioBond,host=$('date-host');if(!bond||!bond.active||!host)return;
  bond.clubEscapeAttempts=Math.max(0,bond.clubEscapeAttempts||0)+1;
  if(bond.clubEscapeAttempts>=3){
    closeDateModal();showDangerousTrioClubEnding();return;
  }
  const witness=firstSubordinateWitness(),target=pick(DANGEROUS_HEROINE_NAMES);
  const second=bond.clubEscapeAttempts===2;
  const line=second
    ?`대장님, 제가 왜 이런 것까지 보고하는지 모르겠는데 ${target} 님께서 약국에서 몇 박스나 사 갔습니다. 오늘 들어가시면 정말 그러다 죽습니다.`
    :'대장님, 오늘은 진짜 들어가시면 안 됩니다. 세 분이 교대로 현관과 차량을 보고 있습니다. 제가 택시 잡았으니 그냥 집에 가십시오.';
  L.health=clamp((L.health||0)-2,0,100);L.happy=clamp((L.happy||0)-2,0,100);
  addNews(`🛑 클럽 입구에서 ${witness.name}에게 붙잡혀 귀가했습니다 · 공동생활 경고 ${bond.clubEscapeAttempts}/2`,'neutral');
  host.innerHTML=`<div class="window event-window place-encounter-window"><div class="title-bar event-bar"><div class="title-bar-text">🛑 세 사람보다 먼저 도착한 부하</div></div><div class="window-body"><img class="dating-banner date-scene" src="${second?'./assets/event-trio-meeting-7.png':'./assets/event-trio-meeting-6.png'}" alt="클럽에 들어가지 못하고 공동생활 거처로 돌아가는 밤"><div class="date-profile"><img class="char-portrait" src="${witness.portrait}" alt="${witness.name}"><div><strong>${witness.name}</strong><br><span class="down">공동생활 비상 보고 · ${bond.clubEscapeAttempts}/2</span></div></div><div class="story-dialogue"><b>${witness.name}</b> “${line}”</div><div class="event-desc">${second?'부하는 휴대전화를 빼앗듯 택시 기사에게 주소를 보여 줬습니다. 현관에는 세 사람 모두 불을 켜 둔 채 기다리고 있습니다. 한 번 더 같은 선택을 하면 경고로 끝나지 않습니다.':'클럽 문은 열어 보지도 못했습니다. 부하는 세 사람 중 누구에게 들키기 전에 돌아가야 한다며 당신을 택시에 밀어 넣었습니다.'}</div><div class="oc-changes">자유시간 1회 사용 · 체력 -2 · 행복 -2 · 클럽 비용 없음</div><button id="trio-club-warning-confirm" class="session-btn opening">부하에게 끌려 집으로 돌아간다</button></div></div>`;
  $('trio-club-warning-confirm').addEventListener('click',()=>{closeDateModal();afterLifeAction('취미');});
  autoSave();
}

function showDangerousTrioClubEnding(){
  if(S.timer){clearInterval(S.timer);S.timer=null;}S.phase='closed';S.paused=true;
  const L=S.life,host=$('life-modal');if(!host)return;
  L.captivityEnding=true;L.dangerousEnding={name:'위험한 결핍 3인조',variant:'club_shared_home',day:S.day};
  host.style.display='flex';host.className='life-modal-host captivity-meta-host';
  host.innerHTML=`<div class="window event-window captivity-ending-window"><div class="title-bar"><div class="title-bar-text">🔒 공동생활 배드엔딩 · 세 사람이 합의한 외출 금지</div></div><div class="window-body"><img class="life-scene-banner" src="./assets/event-trio-bed-ending.png" alt="세 사람의 반복 경고를 무시한 뒤 잠긴 방"><div class="event-title">“두 번이나 말로 돌려보냈잖아요.”</div><div class="event-desc">세 번째로 클럽 문을 열려던 밤의 기억은 거기서 끊겼습니다. 눈을 뜬 자취방에는 유진의 귀가 기록, 채린의 출입 계약, 세라가 모아 둔 열쇠가 나란히 놓였습니다. 늘 서로를 말리던 세 사람은 이번 한 번만큼은 당신을 밖에 내보내지 않는 데 완전히 합의했습니다.</div><div class="story-dialogue"><b>강유진</b> “보호 조치예요.” <b>한채린</b> “두 번이면 선택은 충분히 줬어.” <b>윤세라</b> “이제 나갈 버튼은 없어요.”</div><div class="important-event-detail down">공동생활 경고 3회 · 클럽 선택 잠금 · 세 사람 공동 감금엔딩</div><button id="trio-club-rewind" class="session-btn opening">↩️ 두 번째 경고를 받아들인 시점으로 돌아가기</button><button id="trio-club-restart" class="hot">🔁 완전히 새 인생 시작</button></div></div>`;
  $('trio-club-rewind').addEventListener('click',rewindDangerousTrioClub);
  $('trio-club-restart').addEventListener('click',()=>{localStorage.removeItem(LS_KEY);location.reload();});
  autoSave();playSound('crash');
}

function rewindDangerousTrioClub(){
  const L=S.life,bond=L.dangerousTrioBond;if(bond)bond.clubEscapeAttempts=1;
  L.captivityEnding=false;L.dangerousEnding=null;S.paused=false;
  resolveMonthCloseTerminal();closeLifeModal();renderAll();renderMarketPhase();autoSave();
}

function businessApplicants(item){
  const type=BUSINESS.typeOf(item.typeId),score=Math.round(item.reputation+item.level*8+(item.months||0));
  const generic=[
    {id:`${item.id}-junior`,icon:'🧑‍💻',name:'신입 지원자',career:'관련 프로젝트 1년 · 빠른 학습',hint:'낮은 채용비, 성장형 인재',min:0},
    {id:`${item.id}-field`,icon:'🧰',name:'현장 경력자',career:`${type.name} 유사업종 4년`,hint:'즉시 전력, 안정적인 실무',min:35},
    {id:`${item.id}-lead`,icon:'📊',name:'팀장급 지원자',career:'팀 운영 7년 · 위기 대응 경험',hint:'높은 평판의 사업체에만 지원',min:65},
  ];
  return generic.filter(candidate=>score>=candidate.min&&!item.hiredStaff.includes(candidate.id));
}

function recruitBusinessStaff(id){
  if(!BUSINESS)return;
  const item=BUSINESS.owned(S.life,id),cost=item&&BUSINESS.hireCost(item);
  if(!item)return;
  if(item.employees>=BUSINESS.staffCapacity(item)){flashToast('현재 규모의 직원 정원이 가득 찼습니다','neutral');return;}
  const applicants=businessApplicants(item),host=$('life-event');
  if(!host||!applicants.length){flashToast('현재 조건에 맞는 지원자가 없습니다. 사업 평판을 올려보세요.','neutral');return;}
  const type=BUSINESS.typeOf(item.typeId);
  S._businessRecruit={id,cost};
  host.style.display='block';
  host.innerHTML=`<div class="window event-window resume-window"><div class="title-bar event-bar"><div class="title-bar-text">📄 ${type.name} · 직원 모집</div><div class="title-bar-controls"><button aria-label="Close" id="business-recruit-x"></button></div></div><div class="window-body"><div class="event-title">도착한 이력서 ${applicants.length}건</div><div class="event-desc">사업 평판과 규모가 높아질수록 더 숙련된 지원자가 나타납니다. 일부 지원자는 이름과 얼굴을 공개하지 않았으며, 이력과 면접 힌트만 확인할 수 있습니다.</div><div class="resume-grid">${applicants.map(candidate=>`<button class="resume-card ${candidate.mystery?'mystery':''}" data-business-applicant="${candidate.id}"><span>${candidate.icon}</span><b>${candidate.name}</b><small>${candidate.career}</small><em>“${candidate.hint}”</em><strong>채용·교육 ${won(cost)}</strong></button>`).join('')}</div><button id="business-recruit-close" class="session-btn">이번에는 보류</button></div></div>`;
  host.querySelectorAll('[data-business-applicant]').forEach(button=>button.addEventListener('click',()=>finishBusinessRecruit(button.dataset.businessApplicant)));
  const close=()=>{host.style.display='none';host.innerHTML='';S._businessRecruit=null;};
  $('business-recruit-x').addEventListener('click',close);$('business-recruit-close').addEventListener('click',close);
}

function finishBusinessRecruit(candidateId){
  const pending=S._businessRecruit;if(!pending||!BUSINESS)return;
  const item=BUSINESS.owned(S.life,pending.id),candidate=item&&businessApplicants(item).find(entry=>entry.id===candidateId);
  if(!item||!candidate)return;
  if(S.capital<pending.cost){flashToast(`💸 채용·교육비 ${won(pending.cost)}원이 필요합니다`,'bad');return;}
  const result=BUSINESS.hire(S.life,pending.id,candidateId);
  if(!result.ok){flashToast(result.message,'neutral');return;}
  S.capital-=result.cost;
  const label=candidate.mystery?'신원 비공개 경력자':candidate.name;
  addNews(`👥 ${result.type.name} ${label} 채용 · 현재 ${result.business.employees}/${BUSINESS.staffCapacity(result.business)}명`,'good');
  flashToast(`👥 ${label} 채용 완료`,'good');
  const host=$('life-event');if(host){host.style.display='none';host.innerHTML='';}S._businessRecruit=null;
  afterLifeAction('사업');
}

function showSpecialManagerRecruit(id){
  if(!BUSINESS||!BUSINESS_ROMANCE)return;
  const item=BUSINESS.owned(S.life,id),host=$('life-event');if(!item||!host)return;
  const state=BUSINESS_ROMANCE.ensure(S.life),type=BUSINESS.typeOf(item.typeId);
  const candidates=BUSINESS_ROMANCE.IDS.filter(staffId=>{
    const staff=state.staff[staffId];
    return staff.introduced&&!staff.hired&&BUSINESS.compatibleManager(item,staffId);
  });
  host.style.display='block';
  host.innerHTML=`<div class="window event-window resume-window"><div class="title-bar event-bar"><div class="title-bar-text">🤝 ${type.name} · 특별 책임자 계약</div><div class="title-bar-controls"><button aria-label="Close" id="special-manager-x"></button></div></div><div class="window-body"><div class="event-desc">특별 책임자는 공개 채용 지원자가 아닙니다. 사교 모임에서 정식 소개를 받은 경쟁자를 업종별로 영입합니다. 처음에는 직급과 가린 얼굴로만 일하며, 큰 위기에서 실적보다 사람을 먼저 지켜 줬을 때 본명과 얼굴을 공개합니다.</div>${candidates.length?`<div class="resume-grid">${candidates.map(staffId=>{const p=BUSINESS_ROMANCE.profile(staffId),identity=BUSINESS_ROMANCE.identity(S.life,staffId);return`<button class="resume-card" data-special-manager="${staffId}"><img class="char-portrait" src="${identity.portrait||p.maskedScene}" alt="${identity.displayName}"><b>${identity.displayName}</b><small>${p.rivalFirm} · ${p.role}</small><em>“${p.style}”</em><strong>전속 계약금 ${won(2500000)}</strong></button>`;}).join('')}</div>`:`<div class="asset-empty">이 업종에 맞는 새 소개 인물이 없습니다. 가족·인맥의 사교 모임 등급을 올려 먼저 소개받으세요.</div>`}<button id="special-manager-close" class="session-btn">닫기</button></div></div>`;
  const close=()=>{host.style.display='none';host.innerHTML='';};
  host.querySelectorAll('[data-special-manager]').forEach(button=>button.addEventListener('click',()=>finishSpecialManagerRecruit(id,button.dataset.specialManager)));
  $('special-manager-x').addEventListener('click',close);$('special-manager-close').addEventListener('click',close);
}

function finishSpecialManagerRecruit(businessId,staffId){
  const fee=2500000;if(S.capital<fee){flashToast(`💸 전속 계약금 ${won(fee)}원이 필요합니다`,'bad');return;}
  const route=BUSINESS_ROMANCE.recruit(S.life,staffId,businessId);
  if(!route.ok){flashToast(route.message,'neutral');return;}
  const assigned=BUSINESS.assignSpecialManager(S.life,businessId,staffId);
  if(!assigned.ok){flashToast(assigned.message,'bad');return;}
  S.capital-=fee;
  addNews(`🤝 ${route.profile.name}, ${assigned.type.name} 특별 책임자 전속 계약 · 다른 특별 책임자와 업계 경쟁 시작`,'good');
  flashToast(`${route.profile.name}을 특별 책임자로 영입했습니다`,'good');
  const host=$('life-event');if(host){host.style.display='none';host.innerHTML='';}
  afterLifeAction('사업');
}

function expandBusiness(id){
  if(!BUSINESS)return;
  const cost=BUSINESS.expansionCost(S.life,id),item=BUSINESS.owned(S.life,id),type=item&&BUSINESS.typeOf(item.typeId);
  if(!item||!type)return;
  if(item.level>=5){flashToast('이미 최대 규모입니다','neutral');return;}
  if(S.capital<cost){flashToast(`💸 사업 확장에 ${won(cost)}원이 필요합니다`,'bad');return;}
  const result=BUSINESS.expand(S.life,id);
  if(!result.ok){flashToast(result.message,'neutral');return;}
  S.capital-=result.cost;
  addNews(`${type.icon} ${type.name} ${result.business.level}단계 확장 · ${won(result.cost)}원 투자`,'good');
  flashToast(`${type.icon} ${type.name} 규모 ${result.business.level}단계`,'good');
  afterLifeAction('사업');
}

function closeBusinessOperation(id){
  if(!BUSINESS)return;
  const item=BUSINESS.owned(S.life,id),type=item&&BUSINESS.typeOf(item.typeId);
  if(!item||!type)return;
  const value=BUSINESS.resaleValue(S.life,id);
  if(!window.confirm(`${type.name} 운영을 종료하고 ${won(value)}원을 회수할까요? 담당 직원은 사업 장부에서 퇴사 처리됩니다.`))return;
  const result=BUSINESS.close(S.life,id);
  if(!result.ok){flashToast(result.message,'bad');return;}
  S.capital+=result.value;
  addNews(`${type.icon} ${type.name} 운영 종료 · ${won(result.value)}원 회수`,'neutral');
  flashToast(`${type.name} 운영을 종료했습니다`,'neutral');
  afterLifeAction('사업');
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
  unlockRivalContact(target,'player_operation');
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

/* ---- 세력 메인 캠페인: 시장 주목 → 첫 피습 → 세력 창설 → 경쟁 세력 파산 → 인생 결말 ---- */
function factionAttackStatus() {
  const faction=FACTION_CAMPAIGN.ensure(S.life);
  const myWorth=netWorthClean();
  const rank=1+S.bots.filter(bot=>!bot.bankrupt&&botNetWorth(bot)>myWorth).length;
  const monthlyProfit=S._preSettleNW==null?0:S._preSettleNW-(S.dayStartNW||S._preSettleNW);
  const current=CAMPAIGN.attackStatus({month:S.day,totalWealth:totalWealth(),monthlyProfit,rank});
  if(current.unlocked&&!faction.attackUnlocked){
    faction.attackUnlocked=true;
    faction.attackUnlockedDay=S.day;
    faction.attackUnlockReason=current.reason;
    addNews(`👁️ 시장 주목도 상승 · ${current.reason} 경쟁 세력이 당신을 추적하기 시작합니다.`, 'bad');
  }
  return{...current,unlocked:!!faction.attackUnlocked||current.unlocked};
}

function registerFactionAttack(attacker) {
  if (!FACTION_CAMPAIGN || !S.life || !attacker) return;
  const rival=(S.bots||[]).find(bot=>bot===attacker||bot.name===(attacker.name||attacker));
  if(rival)unlockRivalContact(rival,'rival_attack');
  const result = FACTION_CAMPAIGN.onAttack(S.life, attacker.name || attacker, S.day);
  if (!result.queued) return;
  queueImportantEvent({ factionStory:'first_attack', type:'faction', scene:lifeSceneImage('faction') });
  addNews(`📱 ${result.attacker}에게서 공격 직후 연락이 왔습니다`, 'bad');
}

function queueFactionStoryProgress() {
  if (!FACTION_CAMPAIGN || !S.life) return;
  const due = FACTION_CAMPAIGN.takeDueStory(S.life, S.day);
  if (due) queueImportantEvent({ factionStory:due, type:'faction', scene:lifeSceneImage('faction') });
}

function queueFactionRankEnding() {
  if (!FACTION_CAMPAIGN || !S.life) return;
  const faction = FACTION_CAMPAIGN.ensure(S.life);
  if (faction.endingSeen || faction.endingQueued) return;
  const result = FACTION_CAMPAIGN.checkVictory(S.life, S.bots, S.day);
  if (!result.ready) return;
  faction.endingQueued = true;
  queueImportantEvent({ factionVictory:true, type:'faction', scene:lifeSceneImage('faction') });
  addNews(`🏆 경쟁 세력 ${result.defeated}/${result.total}곳 파산 · 세력전 승리`, 'good');
  celebrate();
}

function closeFactionStory() {
  const host = $('life-event');
  if (host) { host.style.display='none'; host.innerHTML=''; }
  renderLifePanel();
  autoSave();
  showNextImportantEvent();
}

function showFactionMentorPhoneStory(stage){
  if(stage!=='first_attack'){showFactionStory(stage);return;}
  const host=$('life-event');if(!host||!FACTION_CAMPAIGN)return;
  const faction=FACTION_CAMPAIGN.ensure(S.life),t=D.SPECIAL_CHARACTERS.taesik;
  host.style.display='block';
  host.innerHTML=`<div class="window event-window faction-mentor-window">
    <div class="title-bar event-bar"><div class="title-bar-text">📱 저장하지 않은 번호 · 첫 공격 직후</div></div>
    <div class="window-body">
      <img class="life-scene-banner" src="${lifeSceneImage('faction')}" alt="첫 공격 뒤 장태식에게 연락이 온 장면">
      <div class="phone-shell faction-mentor-phone"><div class="phone-status"><span>공격 직후</span><span>●●● 61%</span></div><div class="phone-chat-screen open"><header><img class="char-thumb" src="${characterPortrait(t,'neutral')}" alt="장태식"><span><b>저장하지 않은 번호</b><small>QuickTalk · 지금</small></span></header><div class="phone-chat-log"><div class="phone-bubble incoming">혼자서 돈 좀 번다고 시장이 네 편이 되는 건 아니다. 이번엔 돈만 잃었지만 다음엔 사람을 잃는다.</div></div></div></div>
      <div class="event-desc"><b>${faction.firstAttacker}</b>에게 처음 공격받은 직후, 피해 규모와 상대 이름까지 아는 낯선 사람이 연락해 왔습니다.</div>
      <div class="event-options">
        <button class="event-opt" data-mentor-first="number">내 번호는 어떻게 알았습니까?<span class="opt-sub">상대의 정보력을 확인합니다</span></button>
        <button class="event-opt" data-mentor-first="identity">당신 누구야. 공격한 놈과 한패입니까?<span class="opt-sub">정체와 목적을 추궁합니다</span></button>
        <button class="event-opt" data-mentor-first="help">방법이 있다면 먼저 말해보세요<span class="opt-sub">즉시 해결책을 요구합니다</span></button>
      </div>
      <div id="faction-mentor-outcome" class="event-outcome"></div>
    </div>
  </div>`;
  host.querySelectorAll('[data-mentor-first]').forEach(button=>button.addEventListener('click',()=>resolveFactionMentorPhone(button.dataset.mentorFirst)));
}

function resolveFactionMentorPhone(choice){
  const host=$('life-event'),faction=FACTION_CAMPAIGN.ensure(S.life);if(!host)return;
  faction.firstResponse=choice;
  faction.tempDefense=Math.max(faction.tempDefense||0,.22);
  const options=host.querySelector('.event-options');if(options)options.innerHTML='';
  const opener=choice==='number'
    ?'“다 방법이 있다. 네가 뭘 샀는지 아는 놈들이 네 번호 하나를 모르겠냐.”'
    :choice==='identity'
      ?'“한패였으면 경고부터 했겠나. 장태식이다. 예전엔 저쪽 사람을 가르쳤고, 지금은 네가 얼마나 버티나 보고 있다.”'
      :'“좋아. 신고서부터 찾는 놈보다는 말이 빠르군. 대신 사람을 받으면 끝까지 책임져라.”';
  $('faction-mentor-outcome').innerHTML=`<div class="phone-bubble incoming followup">${opener}<br><br>“스승으로 모시라는 소리는 안 한다. 길 하나를 골라. 거기에 맞는 놈 하나를 붙여주지. 그놈을 부하로 세울 수 있으면 네 세력의 시작이다.”</div><div class="event-options">${Object.values(FACTION_CAMPAIGN.PATHS).map(path=>{const member=FACTION_CAMPAIGN.FOUNDING_MEMBERS[path.id];return`<button class="event-opt" data-mentor-path="${path.id}"><b>${path.icon} ${path.name}</b><span>${path.mentor}</span><small>${member.name} · ${member.desc}</small></button>`;}).join('')}</div>`;
  host.querySelectorAll('[data-mentor-path]').forEach(button=>button.addEventListener('click',()=>foundFactionFromMentor(button.dataset.mentorPath)));
}

function foundFactionFromMentor(pathId){
  const result=FACTION_CAMPAIGN.foundWithMentor(S.life,pathId);
  if(pathId==='legal')changeMorality(4,'합법 투자조합 창설 원칙을 세웠습니다');
  if(pathId==='underground')changeMorality(-6,'지하 세력의 규칙을 받아들였습니다');
  LEGACY.push(S.life,dateInfo(S.day).age,result.path.icon,`${result.path.name} 창설 · 장태식의 첫 제자`,'faction');
  SOCIAL.addContact(S.life,{id:`faction-${result.member.sourceId}`,name:result.member.name,role:'subordinate',origin:'faction',originKey:`faction-${result.member.sourceId}`,relationLabel:'첫 부하 · 상황 보고',trust:55,favor:1,factionMemberId:result.member.sourceId});
  addNews(`${result.path.icon} ${result.path.factionName} 창설 · 장태식의 소개로 ${result.member.name} 합류`,'good');
  const contact=SOCIAL.ensure(S.life).contacts.find(item=>item.originKey===`faction-${result.member.sourceId}`);
  pushPersonMessage(S.life,contact,'형님, 장 선생님한테 얘기 들었습니다. 오늘부터 제가 먼저 상황 보고드리겠습니다.',false);
  flashToast(`${result.path.factionName} 창설 · 첫 부하 ${result.member.name} 합류`,'good');
  closeFactionStory();
}

function showFactionStory(stage) {
  const host=$('life-event');if(!host||!FACTION_CAMPAIGN)return;
  const faction=FACTION_CAMPAIGN.ensure(S.life);
  host.style.display='block';
  if(stage==='legal_result'){
    const n=D.SPECIAL_CHARACTERS.narae;
    host.innerHTML=`<div class="window event-window">
      <div class="title-bar event-bar"><div class="title-bar-text">⚖️ 세력 캠페인 · 합법 대응의 결과</div></div>
      <div class="window-body">
        <img class="life-scene-banner" src="${lifeSceneImage('faction')}" alt="나래가 공격 기록과 신고 결과를 정리하는 장면">
        <div class="date-profile"><img class="char-portrait" src="${characterPortrait(n,'sad')}" alt="나래"><div><strong>나래 · 투자교육 매니저</strong><br><span class="muted">증권사 기록·감독기관 신고·법률 대응</span></div></div>
        <div class="event-title">“피해 기록은 남겼고 다음 공격을 알아챌 장치도 만들었어요.”</div>
        <div class="event-desc">나래의 신고로 상대 세력의 불법 행동은 수사 위험을 안게 됐고, 임시 방첩망도 확보했습니다. 하지만 이미 사라진 돈과 다음 공격까지 대신 되돌려 줄 수는 없었습니다.</div>
        <div class="important-event-detail">합법 대응은 방어와 처벌에 강하지만, 시장에서 당신 대신 움직일 사람까지 만들어 주지는 못합니다.</div>
        <button id="faction-meet-taesik" class="session-btn opening">장태식에게서 온 연락을 확인한다</button>
      </div>
    </div>`;
    $('faction-meet-taesik').addEventListener('click',showFactionMentorChoice);
    return;
  }

  const attacker=S.bots.find(bot=>bot.name===faction.firstAttacker);
  const attackerLine=attacker?RIVALS.reactionLine(attacker,'wary'):'“혼자 움직이는 계좌치고는 제법이군. 하지만 혼자 버티는 데는 한계가 있어.”';
  host.innerHTML=`<div class="window event-window">
    <div class="title-bar event-bar"><div class="title-bar-text">⚔️ 세력 캠페인 · 혼자라는 약점</div></div>
    <div class="window-body">
      <img class="life-scene-banner" src="${lifeSceneImage('faction')}" alt="첫 세력 공격 직후 도착한 연락">
      <div class="date-profile">${attacker&&attacker.portrait?`<img class="char-portrait" src="./assets/characters/${attacker.portrait}" alt="${attacker.name}">`:'<span class="message-popup-avatar">⚔️</span>'}<div><strong>${faction.firstAttacker||'경쟁 세력'}</strong><br><span class="down">첫 번째 직접 공격</span></div></div>
      <div class="event-title">${attackerLine}</div>
      <div class="event-desc">공격자는 피해가 우연이 아니었다는 사실을 일부러 알려 왔습니다. 시장에는 돈만 많은 사람이 아니라 정보와 사람을 함께 움직이는 조직이 있습니다.</div>
      <div class="event-options">
        <button class="event-opt" data-faction-first="question">왜 나를 노렸는지 묻는다<span class="opt-sub">공격자의 의도를 확인한 뒤 나래에게 기록을 넘깁니다</span></button>
        <button class="event-opt" data-faction-first="report">답하지 않고 나래에게 연락을 전달한다<span class="opt-sub">증거를 보존하고 합법 대응을 시작합니다</span></button>
      </div>
      <div id="faction-first-outcome" class="event-outcome"></div>
    </div>
  </div>`;
  host.querySelectorAll('[data-faction-first]').forEach(button=>button.addEventListener('click',()=>resolveFactionFirstAttack(button.dataset.factionFirst)));
}

function resolveFactionFirstAttack(choice) {
  const host=$('life-event');if(!host||!FACTION_CAMPAIGN)return;
  const faction=FACTION_CAMPAIGN.completeFirstAttack(S.life,S.day,choice);
  faction.tempDefense=Math.max(faction.tempDefense||0,.22);
  const n=D.SPECIAL_CHARACTERS.narae;
  const options=host.querySelector('.event-options');if(options)options.innerHTML='';
  const opener=choice==='question'
    ?`${faction.firstAttacker}은 “돈, 정보, 사람 중 하나라도 없으면 결국 누군가의 먹잇감이 된다”고 답한 뒤 연락을 끊었습니다.`
    :'답장은 보내지 않았습니다. 연락 원문과 거래 기록을 그대로 보존했습니다.';
  $('faction-first-outcome').innerHTML=`<div class="date-profile"><img class="char-thumb" src="${characterPortrait(n,'neutral')}" alt="나래"><div><b>나래</b><br><span class="muted">합법 대응을 준비합니다</span></div></div><div class="oc-text">${opener}<br><br>“제가 증권사 기록과 신고 절차부터 맡을게요. 싸우기 전에, 상대가 다시는 모른 척하지 못할 증거를 남겨야 해요.”</div><button id="faction-first-confirm" class="session-btn opening">나래에게 대응을 맡긴다 · 다음 달 결과 확인</button>`;
  $('faction-first-confirm').addEventListener('click',closeFactionStory);
}

function showFactionMentorChoice() {
  const host=$('life-event');if(!host)return;
  const t=D.SPECIAL_CHARACTERS.taesik;
  host.innerHTML=`<div class="window event-window">
    <div class="title-bar event-bar"><div class="title-bar-text">🦈 세력 캠페인 · 장태식의 수업</div></div>
    <div class="window-body">
      <img class="life-scene-banner" src="${lifeSceneImage('faction')}" alt="장태식이 세력 조직도를 펼쳐 보이는 장면">
      <div class="date-profile"><img class="char-portrait" src="${characterPortrait(t,'neutral')}" alt="장태식"><div><strong>장태식 · 태식 사채라인</strong><br><span class="muted">시장 뒤편의 조직 운영자</span></div></div>
      <div class="event-title">“세력은 돈 많은 놈들 모임이 아니야. 정보 줄 사람, 대신 협상할 사람, 끝까지 남을 사람이 있어야 세력이지.”</div>
      <div class="event-desc">장태식은 나래의 방식이 틀린 것은 아니라고 말했습니다. 다만 법은 공격자를 처벌할 수 있어도 당신 대신 시장에서 움직이지는 못합니다. 이제 어떤 조직을 만들지 결정해야 합니다.</div>
      <div class="event-options">
        ${Object.values(FACTION_CAMPAIGN.PATHS).map(path=>`<button class="event-opt" data-faction-path="${path.id}"><b>${path.icon} ${path.name}</b><span>${path.mentor}</span></button>`).join('')}
      </div>
    </div>
  </div>`;
  host.querySelectorAll('[data-faction-path]').forEach(button=>button.addEventListener('click',()=>chooseFactionCampaignPath(button.dataset.factionPath)));
}

function chooseFactionCampaignPath(pathId) {
  const result=FACTION_CAMPAIGN.choosePath(S.life,pathId);
  if(pathId==='legal')changeMorality(4,'합법 투자연합 창설 원칙을 세웠습니다');
  if(pathId==='underground')changeMorality(-6,'지하 세력의 규칙을 받아들였습니다');
  LEGACY.push(S.life,dateInfo(S.day).age,result.path.icon,`${result.path.name} 창설을 준비했다`,'faction');
  addNews(`${result.path.icon} 세력 노선 결정 · ${result.path.name} · 첫 거점 창설 비용 지원`, 'good');
  flashToast(`${result.path.factionName} 창설 준비 완료 · 월말 메뉴에서 첫 거점을 마련하세요`, 'good');
  closeFactionStory();
}

function showFactionVictoryEnding() {
  const host=$('life-event');if(!host||!FACTION_CAMPAIGN)return;
  const faction=FACTION_CAMPAIGN.ensure(S.life);
  FACTION_CAMPAIGN.recordEnding(S.life);
  const ending=CAMPAIGN_ENDINGS.build('victory',S.life,{
    totalWealth:totalWealth(),debt:(S.loan||0)+(S.life.loan||0),path:faction.path
  });
  CAMPAIGN_ENDINGS.record(S.life,ending,S.day);
  faction.endingQueued=false;
  const age=dateInfo(S.day).age;
  LEGACY.push(S.life,age,ending.icon,`${ending.title} 엔딩 · 경쟁 세력 전부 파산`,'ending');
  const progress=CAMPAIGN.campaignProgress(S.bots);
  host.style.display='block';
  host.innerHTML=`<div class="window event-window">
    <div class="title-bar event-bar"><div class="title-bar-text">${ending.icon} 메인 엔딩 · ${ending.title}</div></div>
    <div class="window-body">
      <img class="life-scene-banner" src="${lifeSceneImage('faction')}" alt="${ending.title} 엔딩 장면">
      <div class="event-title">${ending.icon} ${ending.summary}</div>
      <div class="event-desc">${ending.lines.map(line=>`<p>${line}</p>`).join('')}</div>
<div class="important-event-detail"><b>${faction.name}</b> · 경쟁 세력 ${progress.defeated}/${progress.total}곳 파산<br>최종 총자산 ${won(ending.wealth)}원 · ${ending.partnerNames&&ending.partnerNames.length?`함께한 사람 ${RELATIONSHIPS.joinNames(ending.partnerNames)}`:'현재 관계 구성원 없음'} · 자녀 ${ending.children}명</div>
      <p class="hint">${ending.happy?'관계와 자산 상태가 해피엔딩을 만들었습니다.':'승리는 달성했지만 관계·건강·자산 상태에 따라 노멀엔딩이 기록됐습니다.'} 자유 플레이는 계속할 수 있습니다.</p>
      <button id="faction-ending-continue" class="session-btn opening">엔딩을 기록하고 계속 플레이</button>
    </div>
  </div>`;
  $('faction-ending-continue').addEventListener('click',()=>{
    addNews(`${ending.icon} ${ending.title} 엔딩 달성 · 게임 계속`, 'good');
    celebrate();closeFactionStory();
  });
}

function showCampaignBankruptcyEnding(reason, resuming = false) {
  if(!CAMPAIGN_ENDINGS||!S.life)return;
  if(S.timer){clearInterval(S.timer);S.timer=null;}
  S.phase='closed';S.paused=true;
  const faction=FACTION_CAMPAIGN.ensure(S.life);
  const ending=CAMPAIGN_ENDINGS.build('bankruptcy',S.life,{
    totalWealth:totalWealth(),debt:(S.loan||0)+(S.life.loan||0),path:faction.path,reason
  });
  if (!resuming) CAMPAIGN_ENDINGS.record(S.life,ending,S.day);
  const age=dateInfo(S.day).age;
  if (!resuming) LEGACY.push(S.life,age,ending.icon,`${ending.title} 엔딩 · 플레이어 파산`,'ending');
  const host=$('life-modal');if(!host)return;
  host.style.display='flex';host.className='life-modal-host';
  host.innerHTML=`<div class="window event-window">
    <div class="title-bar"><div class="title-bar-text">${ending.icon} 메인 엔딩 · ${ending.title}</div></div>
    <div class="window-body">
      <img class="life-scene-banner" src="./assets/life-debt-crisis.png" alt="${ending.title} 엔딩 장면">
      <div class="event-title">${ending.icon} ${ending.summary}</div>
      <div class="event-desc">${ending.lines.map(line=>`<p>${line}</p>`).join('')}</div>
<div class="important-event-detail">최종 총자산 ${won(ending.wealth)}원 · 부채 ${won(ending.debt)}원<br>${ending.partnerNames&&ending.partnerNames.length?`함께 남은 사람 ${RELATIONSHIPS.joinNames(ending.partnerNames)}`:'현재 관계 구성원 없음'} · 자녀 ${ending.children}명</div>
      <p class="hint">${ending.happy?'파산했지만 관계와 가족이 재기의 해피엔딩을 만들었습니다.':'관계와 자산 상태에 따라 파산 노멀엔딩이 기록됐습니다.'}</p>
      <button id="bankruptcy-ending-continue" class="session-btn opening">엔딩 이후 자유 플레이</button>
      <button id="bankruptcy-ending-reset">새 인생 시작</button>
    </div>
  </div>`;
  $('bankruptcy-ending-continue').addEventListener('click',()=>{
    S.life.campaignSolvency.endingSeen=true;
    S.life.campaignSolvency.bankrupt=false;
    S.life.campaignSolvency.insolventMonths=0;
    resolveMonthCloseTerminal();
    closeLifeModal();renderAll();renderMarketPhase();autoSave();
    addNews(`${ending.icon} ${ending.title} 엔딩 이후 재기 모드 시작`,'neutral');
  });
  $('bankruptcy-ending-reset').addEventListener('click',hardReset);
  autoSave();
}

function doFactionAction(kind, targetIndex) {
  const L=S.life;
  let result;
  if(kind==='build')result=RIVALS.buildFaction(L,S.capital);
  else if(kind==='bankrupt')result=RIVALS.bankruptRival(L,S.bots,targetIndex,S.capital,botNetWorth(S.bots[targetIndex]),S.day);
  else if(kind==='negotiate')result=RIVALS.negotiate(L,S.bots,targetIndex,S.capital,S.day);
  else result=RIVALS.revenge(L,S.bots,targetIndex,S.capital);
  if(!result.ok){flashToast(`⛔ ${result.message}`,'bad');return;}
  if(kind!=='build'&&S.bots[targetIndex])unlockRivalContact(S.bots[targetIndex],`faction_${kind}`);
  S.capital=result.cash;
  const icon=kind==='build'?'🛡️':kind==='bankrupt'?'🏦':kind==='negotiate'?'🤝':'🔥';
  addNews(`${icon} ${result.message}`,result.success===false?'bad':'good');
  S.rivalFeed=S.rivalFeed||[];S.rivalFeed.unshift({day:S.day,text:`${icon} [${kind==='build'?'세력':kind==='bankrupt'?'파산작전':kind==='negotiate'?'협상':'역공'}] ${result.message}`});
  flashToast(result.message,result.success===false?'neutral':'good');
  if(kind==='bankrupt'&&result.success){
    const faction=RIVALS.ensureFaction(L);
    (faction.personalMotives||[]).forEach(motive=>{
      if(motive.target===S.bots[targetIndex].name)motive.resolved=true;
    });
    result.campaignComplete=CAMPAIGN.campaignProgress(S.bots).complete;
  }
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
      <div class="event-desc">현재 구성원 <b>${faction.members.length}/${faction.capacity}명</b> · 모집 평판 <b>${faction.recruitReputation||0}</b>. 세력 단계·역공 실적·기존 구성원의 충성도가 높아질수록 더 숙련된 지원자와 이름 있는 인물이 나타납니다. 아직 자격이 닿지 않는 사람은 목록에도 공개되지 않습니다.</div>
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
  const title=kind==='build'?'🛡️ 세력 확장 보고':kind==='recruit'?'👥 영입 결과':kind==='bankrupt'?'🏦 최종 파산 작전 보고':kind==='negotiate'?'🤝 휴전 협상 결과':'🔥 역공 작전 보고';
  const target=result.target;
  const targetReaction=target?`<div class="date-profile">${target.portrait?`<img class="char-portrait" src="./assets/characters/${target.portrait}" alt="${target.name}">`:'<span class="message-popup-avatar">⚔️</span>'}<div><strong>${target.name} · ${target.faction}</strong><br><span class="${target.bankrupt?'down':'muted'}">${RIVALS.reactionLine(target,target.bankrupt?'bankrupt':target.reactionStage||'stable')}</span></div></div>`:'';
  host.style.display='block';
  host.innerHTML=`<div class="window event-window">
    <div class="title-bar event-bar"><div class="title-bar-text">${title}</div></div>
    <div class="window-body">
      <img class="life-scene-banner" src="${lifeSceneImage('faction')}" alt="세력이 라이벌의 금융 공격에 대응하는 작전실 장면">
      ${targetReaction}
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
  $('faction-outcome-close').addEventListener('click',()=>{
    host.style.display='none';host.innerHTML='';
    if(result.campaignComplete)showFactionVictoryEnding();
  });
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
  const others = S.bots.filter(bot => !bot.bankrupt && (bot.jailMonths || 0) <= 0).sort(() => Math.random() - .5)
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
  const verb = call.direction > 0 ? '공동 매수' : '공동 공매도';
  const expected = call.direction > 0 ? '매수세를 모아 가격을 끌어올린다' : '매도·공매도 물량을 모아 가격을 누른다';
  host.style.display='block';
  autoPauseForPopup();
  host.innerHTML=`<div class="window event-window">
    <div class="title-bar event-bar"><div class="title-bar-text">📡 세력 작전실 연락 · ${verb}</div><div class="title-bar-controls"><button aria-label="Close" id="faction-call-x"></button></div></div>
    <div class="window-body">
      <img class="life-scene-banner" src="${lifeSceneImage('faction')}" alt="세력들이 공동 매매를 논의하는 작전실">
      <div class="event-title">${call.proposer}: “${call.stock}, 이번 달 흐름이면 지금 ${call.direction > 0 ? '모아야' : '줄여야'} 합니다.”</div>
      <div class="event-desc"><b>${call.stock}</b> · ${(D.SECTORS[stock.sector] || {}).name || stock.sector} · ${CAP_META[stock.cap].label}주<br>${call.participants.join(' · ')} 측도 ${verb}에 가담합니다. 작전이 시작되면 3틱 동안 주문이 나뉘어 들어가 ${expected}는 흐름이 생깁니다.</div>
      <div class="event-options">
        <button class="event-opt" data-faction-call="follow">🤝 나도 동참한다 <span class="opt-sub">${call.direction > 0 ? '현금의 10% 범위에서 자동 매수' : '보유분 25% 자동 매도 · 미보유 시 공매도 한도의 10% 자동 공매도'}</span></button>
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
  if (pos && pos.qty > 0) {
    const qty=Math.max(1,Math.floor(pos.qty*.25));
    const result=TRADING.executeSell(S,{name:stock.name,qty,price},{
      feeRate:CFG.FEE_RATE,taxRate:CFG.TAX_RATE,allowShort:false,
    });
    return result.ok ? `${result.qty}주 자동 매도` : '보유분 자동 매도 실패';
  }
  const power=shortSellingPower();
  const budget=Math.min(power*.10,5000000);
  const qty=Math.floor(budget/(price*(1+CFG.FEE_RATE)));
  if(qty<1)return '공매도 한도가 부족해 개인 계좌는 관망';
  const result=TRADING.executeSell(S,{name:stock.name,qty,price},{
    feeRate:CFG.FEE_RATE,taxRate:CFG.TAX_RATE,allowShort:true,shortSellingPower:power,
  });
  return result.ok ? `${result.qty}주 자동 공매도` : '공매도 한도 부족으로 개인 계좌는 관망';
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
  const verb=call.direction>0?'공동 매수':'공동 공매도';
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
  date:'데이트', hobby:'취미', rest:'휴식', decompress:'휴식', 'sera-home':'휴식',
  'income-work':'수입',
  cert:'경력', changejob:'경력', 'investment-consult':'경력',
  'contact-meet':'인맥', 'contact-nurture':'인맥', 'contact-ask':'인맥', 'meet-special':'인맥', 'person-request':'인맥',
  'business-start':'사업', 'business-hire':'사업', 'business-expand':'사업', 'business-close':'사업', 'business-strategy':'사업',
  rival:'라이벌', faction:'라이벌', 'faction-recruit':'라이벌', polycule:'데이트', marry:'가족', 'child-bond':'가족', 'child-edu':'가족', 'parent-care':'가족', 'family-plan':'가족'
};
const LIFE_ACTIONS_PER_MONTH = 4;
function monthActionKey(group) { return `${S.day}:${group}`; }
function monthActionUsed(group) {
  S.life.monthActions = S.life.monthActions || {};
  return monthActionCount(group) > 0;
}
function monthActionCount(group,day=S.day) {
  if(!S.life)return 0;
  S.life.monthActions = S.life.monthActions || {};
  const value=S.life.monthActions[`${day}:${group}`];
  return value === true ? 1 : Math.max(0,Number(value)||0);
}
function markMonthAction(group) {
  if (!group) return;
  S.life.monthActions = S.life.monthActions || {};
  S.life.monthActions[monthActionKey(group)] = monthActionCount(group) + 1;
}
function lifeActionCount(day=S.day) {
  if (!S.life) return 0;
  S.life.monthActions = S.life.monthActions || {};
  const prefix = `${day}:`;
  return Object.keys(S.life.monthActions).filter(key => key.startsWith(prefix)).reduce((sum,key)=>{
    const value=S.life.monthActions[key];
    return sum+(value===true?1:Math.max(0,Number(value)||0));
  },0);
}
function lifeActionRemaining() { return Math.max(0, LIFE_ACTIONS_PER_MONTH - lifeActionCount()); }
function lifeActionExhausted() { return lifeActionRemaining() <= 0; }
function monthlyGroupForAction(action) { return MONTHLY_ACTION_GROUPS[action] || null; }
function maybeSeraIntrusion(context){
  const L=S.life,r=L&&metRecord(L,'윤세라');if(L&&L.dangerousTrioBond&&L.dangerousTrioBond.active)return;if(!r||!dangerousRomanceActive(L,r)||!r.yandere||(r.obsession||0)<65||L.seraIntrusionDay===S.day||Math.random()>.82)return;
  const host=$('life-event');if(!host||host.style.display==='block')return;L.seraIntrusionDay=S.day;
  const places={데이트:'다른 사람을 만나기로 한 장소 맞은편에서',취미:'취미 모임 출입구에서',휴식:'집으로 돌아오는 골목에서',경력:'직장 건물 로비에서',인맥:'약속 장소의 바로 옆 테이블에서',가족:'가족과 함께 있던 장소 근처에서',라이벌:'세력 사무실 앞에서'};
  const place=places[context]||((L.conditions||[]).length?'병원 접수대 건너편에서':'밖에서 돌아오는 길에');
  host.style.display='block';
  host.innerHTML=`<div class="window event-window"><div class="title-bar event-bar"><div class="title-bar-text">🖤 어디를 가도 윤세라</div></div><div class="window-body"><img class="life-scene-banner" src="./assets/event-sera-doorstep.png" alt="윤세라가 기다리는 장면"><div class="event-title down">“진짜 우연이에요. 그렇게 믿어주면 안 돼요?”</div><div class="event-desc">${place} 세라가 이미 기다리고 있었습니다. 일정과 목적지를 말한 적은 없습니다.</div><div class="important-event-detail">집착 ${Math.round(r.obsession||0)}/100 · 대응에 따라 행복도가 달라집니다</div><div class="event-options"><button class="event-opt" data-sera-response="key">열쇠 이미 줬는데 돈 아깝게 왜 밖에서 기다려?</button><button class="event-opt" data-sera-response="reverse">나도 네가 어디 있는지 궁금했어</button><button class="event-opt" data-sera-response="placate">오늘만 함께 간다</button><button class="event-opt" data-sera-response="boundary">따라오지 말라고 분명히 경고한다</button><button class="event-opt" data-sera-response="report">증거를 남기고 신고·도움을 요청한다</button></div></div></div>`;
  host.querySelectorAll('[data-sera-response]').forEach(b=>b.addEventListener('click',()=>resolveSeraIntrusion(r,b.dataset.seraResponse)));playSound('crash');
}
function resolveSeraIntrusion(r,choice){
  const L=S.life;
  let happyDelta=0;
  if(choice==='key'){r.affection=clamp((r.affection||0)+7,0,100);r.obsession=clamp((r.obsession||0)+3,0,100);r.hasHomeKey=true;happyDelta=4;pushPersonMessage(L,r,'그러네. 내가 들어가서 기다리면 되는 거였어요. 열쇠, 절대 잃어버리지 않을게요.',false);}
  else if(choice==='reverse'){r.affection=clamp((r.affection||0)+9,0,100);r.obsession=clamp((r.obsession||0)+5,0,100);r.mutualObsession=(r.mutualObsession||0)+1;happyDelta=7;pushPersonMessage(L,r,'그 말 다시 해줘요. 나만 찾고 있었던 게 아니라고.',false);}
  else if(choice==='placate'){r.affection=clamp((r.affection||0)+4,0,100);r.obsession=clamp((r.obsession||0)+7,0,100);happyDelta=2;pushPersonMessage(L,r,'역시 결국 나랑 같이 있어주는구나.',false);}
  else if(choice==='boundary'){r.affection=Math.max(0,(r.affection||0)-7);r.obsession=clamp((r.obsession||0)+(Math.random()<.45?4:-6),0,100);happyDelta=-3;pushPersonMessage(L,r,'그 선은 누가 정한 건데요?',false);}
  else{const hasProtection=!!((D.SPECIAL_CHARACTERS.yujin&&metRecord(L,'강유진'))||SOCIAL.ensure(L).contacts.some(c=>SOCIAL.role(c).id==='official'));r.obsession=Math.max(0,(r.obsession||0)-(hasProtection?24:12));r.affection=Math.max(0,(r.affection||0)-18);r.reported=true;if(r.obsession<65)r.yandere=false;happyDelta=-6;pushPersonMessage(L,r,hasProtection?'경찰까지 부를 줄은 몰랐네. 그래도 끝난 건 아니에요.':'신고했다고 내가 모를 줄 알았어요?',false);}
  L.happy=clamp((L.happy||0)+happyDelta,0,100);
  addNews(`🖤 윤세라의 집착에 대응했습니다 · 행복 ${happyDelta>=0?'+':''}${happyDelta}`,'neutral');
  closeLifeEvent();renderLifePanel();autoSave();
}
function dangerousTrioFollowsOuting(group){
  const L=S.life,bond=L&&L.dangerousTrioBond;
  if(!bond||!bond.active||!['데이트','취미','휴식','경력','인맥','라이벌'].includes(group))return;
  if(Math.random()>.62)return;
  const shuffled=DANGEROUS_HEROINE_NAMES.slice().sort(()=>Math.random()-.5),count=Math.random()<.58?1:2,names=shuffled.slice(0,count);
  const place={데이트:'약속 장소',취미:'취미 모임',휴식:'산책길',경력:'직장 근처',인맥:'만남 장소',라이벌:'세력 거점'}[group]||'외출 장소';
  addNews(`🦂 ${place}에는 이미 ${names.join('와(과) ')}가 있었습니다. “우연이 겹쳤네.”`,'neutral');
  names.forEach(name=>{const r=metRecord(L,name);if(r)pushPersonMessage(L,r,name==='강유진'?'순찰 동선이 겹친 것뿐이에요. 끝나면 같이 가요.':name==='한채린'?'경호팀이 여기로 오라길래 왔어. 네 일정 때문은 아니야.':`나도 여기 올 생각이었어요. 믿어줘요. 이번에는 진짜로.`,false);});
  flashToast(`🦂 이번 외출에는 ${names.join('·')} 동행`,'neutral');
}
function applyDangerousTrioLivingFatigue(group){
  const L=S.life,bond=L&&L.dangerousTrioBond;if(!bond||!bond.active||!group)return;
  const outside=['데이트','취미','경력','인맥','사업','라이벌'].includes(group);
  const drain=outside?4:group==='휴식'?1:2;
  L.health=clamp((L.health||0)-drain,0,100);
  bond.totalHealthDrain=(bond.totalHealthDrain||0)+drain;
  addNews(`🦂 공동생활 일정 조율${outside?'과 동행':' 때문에'} 체력 -${drain}`,'neutral');
}
function afterLifeAction(monthlyGroup) {
  markMonthAction(monthlyGroup);
  applyDangerousTrioLivingFatigue(monthlyGroup);
  dangerousTrioFollowsOuting(monthlyGroup);
  maybeSeraIntrusion(monthlyGroup);
  renderCapital(); renderLifePanel(); checkAchievements(); autoSave();
  const homeHost=$('life-event');
  if(homeHost&&homeHost.querySelector('.home-life-window')){homeHost.style.display='none';homeHost.innerHTML='';}
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
  const career=CAREER.ensure(L);
  HOUSING.ensure(L);
  const businessState = BUSINESS ? BUSINESS.ensure(L) : {owned:[],lastNet:0};
  const finance = LIFE_FINANCE.ensure(L);
  const activePolicies = LIFE_FINANCE.active(L);
  const social = SOCIAL.ensure(L);
  const justice = JUSTICE.ensure(L);
  const legacyState = LEGACY.ensure(L);
  const relationGroup=RELATIONSHIPS.ensure(L).relationshipGroup;
  const relationshipMembers=RELATIONSHIPS.consensualMembers(L);
  const pName = RELATIONSHIPS.joinNames(relationshipMembers);
  const relLabel = relationGroup.status==='committed' ? `🏠 ${pName}님과 공동생활 서약`
    : relationshipMembers.length ? `💕 ${pName}님과 연애 중` : '🙍 솔로';
  const hearts = '❤️'.repeat(Math.max(0, Math.round(L.happy / 20))) || '🖤';
  const propVal = L.properties.reduce((s, p) => s + p.value, 0);
  const passiveOwned = L.passiveAssets || [];
  const passiveExpected = passiveOwned.reduce((sum, owned) => { const a=D.PASSIVE_ASSETS.find(x=>x.id===owned.id); return sum+(a?Math.max(0,a.monthlyIncome-a.maintenance):0); },0);
  const businessValue=BUSINESS?BUSINESS.assetValue(L):0;
  const wealth=wealthBreakdown();
  const charmHint = L.relationship === 'single' ? `(연애까지 ${R.DATING_AT})`
    : RELATIONSHIPS.ensure(L).relationshipGroup.status==='dating' ? `(공동생활 서약까지 ${R.MARRY_AT})` : '';
  const risk = jobRiskTier(job);
  let partnerRow = '';
  if (relationshipMembers.length) {
    partnerRow = `<img class="relationship-scene" src="${relationshipImage(L,relationshipMembers[0].name)}" alt="${relLabel} 장면">`;
    partnerRow += relationshipMembers.map(person=>{
    const per = D.PERSONALITIES[person.personality] || {};
    const g = (D.GENDER_LABEL || {})[person.gender] || '';
    const prof = ROMANCE.profileOf(person);
    const moneyLabel = person.moneyStyle === 'support' ? '필요할 때 지원' : person.moneyStyle === 'dependent' ? '지출 유발' : '각자 관리';
    const partnerRec=metRecord(L,person.name),risk=partnerRec&&dangerousRiskMeta(partnerRec);
    const personalityNow=risk&&risk.value>=45?`${risk.label}이 강해진 상태`:per.name||'';
    const affection=partnerRec&&partnerRec.affection!=null?partnerRec.affection:L.affection;
    return `<div class="life-partner"><img class="char-thumb" src="${characterPortrait(person)}" alt="${person.name}"><strong>${person.name}${g ? ` (${g})` : ''} · ${relationTag(L,person.name)} · ${person.job} · ${stageBadge(affection)}<br><span class="muted">${per.emoji || ''}${personalityNow} · 💰 ${moneyLabel} · 직업 궁합 ${relationshipJobMod(person)>=0?'+':''}${relationshipJobMod(person)} · 용서 성향 ${Math.round((per.forgive || 0) * 100)}%${prof ? `<br>🗣️ ${prof.style}` : ''}</span></strong></div>`;
    }).join('');
  }
  if (L.lovers && L.lovers.length) {
    partnerRow += `<div class="life-stat"><span>양다리 😈</span><strong class="down">${L.lovers.map(x => (x.emoji || '💔') + x.name).join(', ')} <span class="muted">(발각 주의!)</span></strong></div>`;
  }
  if(relationshipMembers.length)partnerRow+=`<div class="life-stat"><span>관계 합의 🌈</span><strong class="${relationGroup.tension>=60?'down':'up'}">${RELATIONSHIPS.publicityLabel(L)} · ${relationGroup.agreement.cohabiting?'공동생활':'각자 생활'} · 안정도 ${Math.round(relationGroup.stability)} · 긴장도 ${Math.round(relationGroup.tension)}</strong></div>`;
  const met = ensureMet(L).filter(person=>!FREEDOM_TRIO||FREEDOM_TRIO.canContact(L,person.name));
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
      ${L.familyPlan?`<div class="life-stat"><span>가족 계획</span><strong>👶 ${L.familyPlan.method} · ${L.familyPlan.months}개월 남음 · 양육 합의 ${(L.familyPlan.caregivers||[]).join('·')}</strong></div>`:''}
      <div class="life-stat"><span>자녀</span><strong>${L.children.length}명</strong></div>
      ${L.children.length?`<div class="life-props">${L.children.map(c=>{const t=FAMILY.traitOf(c),origin=c.origin==='affair'?'혼외자':c.origin==='premarital'?'혼전 출생':c.origin==='casual'?'가벼운 만남에서 태어남':'';return `${t.icon}<b>${c.name}</b> ${FAMILY.childAge(c).label}·${FAMILY.stage(c)}·유대 ${Math.round(c.bond)} · 양육자 ${FAMILY.caregiverLabel(c)}${origin?` · <span class="${c.secret?'down':'muted'}">${origin}${c.secret?' · 비밀':''}</span>`:''}`}).join('<br>')}</div>`:''}
     ${L.conditions.length ? `<div class="life-stat"><span>질환</span><strong class="down">${HEALTH.conditionDetails(L).map(c=>c.icon+c.name).join(' · ')}</strong></div>` : ''}
      <div class="life-stat"><span>관계</span><strong>${relLabel}</strong></div>
      ${L.relationship !== 'single' ? `<div class="life-stat"><span>친밀도</span><strong>${Math.max(0,L.affection||0)}</strong></div>` : ''}
      ${relationGroup.lastBudget&&relationshipMembers.length?`<div class="life-stat"><span>공동생활 예산</span><strong>분담 +${won(relationGroup.lastBudget.contribution)} · 생활성향 지출 -${won(relationGroup.lastBudget.lifestyleCost)} · 순액 ${relationGroup.lastBudget.net>=0?'+':''}${won(relationGroup.lastBudget.net)}</strong></div>`:''}
     ${partnerRow}
     <div class="life-stat"><span>매력</span><strong>${Math.floor(L.charm)} <span class="muted">${charmHint}</span></strong></div>
     <div class="life-stat"><span>투자용 부동산</span><strong>${L.properties.length}채 · ${won(propVal)}원</strong></div>
     <div class="life-stat"><span>주식 외 자동수입</span><strong class="up">월 예상 ${won(passiveExpected)}원 · ${passiveOwned.length}개 자산</strong></div>
     <div class="life-stat"><span>운영 사업체</span><strong class="${(businessState.lastNet||0)>=0?'up':'down'}">${businessState.owned.length}곳 · 지난달 ${(businessState.lastNet||0)>=0?'+':''}${won(businessState.lastNet||0)}원 · 매각가치 ${won(businessValue)}원</strong></div>
     ${businessState.owned.length?`<div class="life-props">${businessState.owned.map(item=>{const type=BUSINESS.typeOf(item.typeId),manager=BUSINESS.staffOf(item.managerId),identity=BUSINESS_ROMANCE&&BUSINESS_ROMANCE.identity(L,manager.id);return`${type.icon}<b>${type.name}</b> ${item.level}단계 · ${identity?identity.displayName:manager.name} · 평판 ${Math.round(item.reputation)} · 사기 ${Math.round(item.morale)}`;}).join('<br>')}</div>`:''}
     <div class="life-stat"><span>개인 대출</span><strong class="${L.loan > 0 ? 'down' : ''}">${won(L.loan)}원</strong></div>
     <div class="life-stat"><span>신용등급</span><strong class="${L.creditScore < 500 ? 'down' : ''}">${LOAN.grade(L.creditScore)} · ${Math.round(L.creditScore)}점</strong></div>
     ${L.jailMonths > 0 ? `<div class="life-stat"><span>신분</span><strong class="down">🔒 수감 중 · ${L.jailMonths}개월 남음</strong></div>` : ''}
     ${L.criminalRecord > 0 ? `<div class="life-stat"><span>전과</span><strong class="down">${L.criminalRecord}범</strong></div>` : ''}
     ${L.collectionLevel ? `<div class="life-stat"><span>추심 상태</span><strong class="down">${['','상환 독촉','방문 추심','위험한 추심'][L.collectionLevel]}</strong></div>` : ''}
     <div class="life-stat total"><span>총 재산</span><strong>${won(wealth.total)}원</strong></div>
     <div class="life-props wealth-breakdown">금융 ${won(wealth.liquid)} + 투자부동산 ${won(wealth.property)} + 자동수입 자산 ${won(wealth.passive)} + 사업 ${won(wealth.business)} + 주거 ${won(wealth.housing)} + 연금 ${won(wealth.pension)} − 개인대출 ${won(wealth.personalDebt)}</div>
     ${L.properties.length ? '<div class="life-props">' + L.properties.map(p => `${p.emoji}${p.name}`).join(' · ') + '</div>' : ''}`;
}

/* ---- 마감 리포트에 들어갈 '이번 달 행동' 허브 ---- */
function storyProgressHTML(L) {
  const rows=ensureMet(L).filter(r=>(!FREEDOM_TRIO||FREEDOM_TRIO.canMeetOffline(L,r.name))&&STORIES.get(r)&&['friend','casual','partner','polycule','lover'].includes(r.status)).map(r=>{
    const story=STORIES.get(r),state=STORIES.ensure(r),next=STORIES.next(r);
    const title=state.completed?(state.ending&&state.ending.title||'마무리된 이야기'):story.chapters[state.chapter].title;
    const bars=story.chapters.map((_,i)=>`<i class="${i<state.chapter?'done':i===state.chapter&&next?'ready':''}"></i>`).join('');
    return `<div class="story-progress-card"><strong>${r.emoji||'📖'} ${r.name}</strong><div><div class="story-track" aria-label="${r.name}과 이어진 이야기">${bars}</div><small>${state.completed?title:next?'평소와 다른 연락이 올 것 같습니다':`${title} · 아직 꺼내지 않은 이야기`}</small></div></div>`;
  });
  const circle=CHILDHOOD_CIRCLE&&CHILDHOOD_CIRCLE.ensure(L);
  const circleMood=childhoodCircleNarrative(circle);
  const circleRow=circle&&circle.anchor?`<div class="story-progress-card childhood-circle-progress"><strong>🎓 한 번씩 헤어진 다섯</strong><div><small class="${circleMood.tone}"><b>${circleMood.title}</b> · ${circleMood.detail}</small></div></div>`:'';
  return rows.length||circleRow?`<div class="story-progress-list"><div class="hub-title">📖 이어지는 인물 이야기</div>${circleRow}${rows.slice(0,5).join('')}</div>`:'';
}

function lifeHubHTML() {
  const L = S.life, R = D.RELATIONSHIP;
  const relationGroup=RELATIONSHIPS.ensure(L).relationshipGroup;
  const relationshipMembers=RELATIONSHIPS.consensualMembers(L);
  LOAN.ensure(L);
  HEALTH.ensure(L);
  FAMILY.ensure(L);
  const career=CAREER.ensure(L);
  HOUSING.ensure(L);
  const businessState=BUSINESS?BUSINESS.ensure(L):{owned:[]};
  const finance = LIFE_FINANCE.ensure(L);
  const social = SOCIAL.ensure(L);
  const justice = JUSTICE.ensure(L);
  const hobbyBtns = D.HOBBIES.filter(h=>!['game','study'].includes(h.id)).map(h => `<button class="life-btn" data-act="hobby" data-id="${h.id}">${h.emoji} ${h.name} <small>${won(h.cost)}</small></button>`).join('');
  const propBtns = D.PROPERTIES.map(p => {
    const annualYield=p.price>0?p.rent*12/p.price*100:0;
    return `<button class="life-btn asset-action" data-act="prop" data-id="${p.id}">${p.emoji} ${p.name}<small>매입 ${won(p.price)} · 월 임대 ${won(p.rent)} · 연 ${annualYield.toFixed(1)}%</small></button>`;
  }).join('');
  const passiveBtns = D.PASSIVE_ASSETS.map(a => {
    const count=(L.passiveAssets||[]).filter(x=>x.id===a.id).length, net=Math.max(0,a.monthlyIncome-a.maintenance);
    return `<button class="life-btn asset-action" data-act="passive-buy" data-id="${a.id}">${a.emoji} ${a.name} 매입 <small>${won(a.price)} · 월 순수입 ${won(net)} · ${a.desc}</small></button>${count?`<button class="life-btn hot asset-action" data-act="passive-sell" data-id="${a.id}">${a.emoji} ${a.name} 1개 매각 <small>${count}개 보유 · ${won(Math.round(a.price*a.resaleRate))} 회수</small></button>`:''}`;
  }).join('');
  const businessBox=BUSINESS?BUSINESS.TYPES.map(type=>{
    const item=BUSINESS.owned(L,type.id),manager=BUSINESS.staffOf(item?item.managerId:'internal');
    const identity=BUSINESS_ROMANCE?BUSINESS_ROMANCE.identity(L,manager.id):null;
    const managerName=identity?identity.displayName:manager.name;
    const managerPortrait=identity&&identity.introduced?identity.portrait:null;
    if(item){
      const plan=BUSINESS.projected(item,S.economy.id),expandCost=BUSINESS.expansionCost(L,item.id),resale=BUSINESS.resaleValue(L,item.id);
      const capacity=BUSINESS.staffCapacity(item),hireCost=BUSINESS.hireCost(item);
      const staffEffect=BUSINESS.staffEffect(item);
      const hirePreview=BUSINESS.projected({...item,employees:item.employees+1,hiredStaff:[...(item.hiredStaff||[]),`${item.id}-junior`]},S.economy.id);
      const expandedPreview=BUSINESS.projected({...item,level:Math.min(5,item.level+1),morale:Math.min(100,item.morale+4),momentum:Math.min(.5,item.momentum+.08)},S.economy.id);
      const strategy=BUSINESS.strategyOf(item.strategy);
      const strategyButtons=Object.values(BUSINESS.STRATEGIES).map(option=>`<button class="${option.id===strategy.id?'active':''}" data-act="business-strategy" data-business="${item.id}" data-strategy="${option.id}" title="${option.desc}">${option.icon} ${option.name}</button>`).join('');
      return`<article class="asset-business-card"><div class="faction-member business-staff"><img src="${managerPortrait||BUSINESS.portraitPath(manager.id,item.lastNet<0?'sad':item.lastNet>1000000?'happy':'neutral')}" alt="${managerName}"><span><b>${type.icon} ${type.name} · ${item.level}단계</b><small>${managerName} · ${manager.role}${identity?' · 전속 특별 책임자':' · 일반 운영'}<br>직원 ${item.employees}/${capacity}명 · 직원 매출 기여 +${Math.round(staffEffect.salesBonus*100)}% · 월 인건비 ${won(staffEffect.wages)}<br>사기 ${Math.round(item.morale)} · 평판 ${Math.round(item.reputation)}<br>지난달 매출 ${won(item.lastSales)} · 비용 ${won(item.lastCost)} · <b class="${item.lastNet>=0?'up':'down'}">순익 ${item.lastNet>=0?'+':''}${won(item.lastNet)}</b><br>다음 달 기준 예상 ${plan.net>=0?'+':''}${won(plan.net)} · ${strategy.icon} ${strategy.name}</small></span></div><div class="business-strategy-row" aria-label="${type.name} 운영 방침">${strategyButtons}</div><div class="asset-card-actions"><button class="life-btn" data-act="business-manager" data-business="${item.id}" ${item.specialManagerId?'disabled':''}>🤝 특별 책임자 <small>${item.specialManagerId?`${managerName} 전속 계약 중`:'사교 모임 소개 인물 중 한 명을 선택'}</small></button><button class="life-btn" data-act="business-hire" data-business="${item.id}" ${item.employees>=capacity?'disabled':''}>👥 일반 직원 모집 <small>${item.employees>=capacity?'현재 정원 완료':`채용·교육 ${won(hireCost)} · 최소 예상 순익 +${won(Math.max(0,hirePreview.net-plan.net))}`}</small></button><button class="life-btn" data-act="business-expand" data-business="${item.id}" ${item.level>=5?'disabled':''}>🏗️ 확장 <small>${item.level>=5?'최대 규모':`${won(expandCost)} · ${item.level+1}단계 · 예상 순익 ${expandedPreview.net>=0?'+':''}${won(expandedPreview.net)}`}</small></button><button class="life-btn hot" data-act="business-close" data-business="${item.id}">🚪 운영 종료 <small>${won(resale)} 회수</small></button></div></article>`;
    }
    return`<article class="asset-business-card unopened"><div class="faction-member business-staff"><img src="${BUSINESS.portraitPath('internal','neutral')}" alt="내부 운영팀"><span><b>🧑‍💼 사업 설립 준비</b><small>설립 직후에는 일반 운영팀이 맡습니다. 특별 책임자는 사교 모임에서 소개받고 별도로 전속 계약합니다.<br>${type.icon} ${type.name} · 월 기준 예상 ${won(type.baseSales-type.fixedCost)} · ${type.desc}</small></span></div><div class="asset-card-actions"><button class="life-btn asset-action" data-act="business-start" data-business="${type.id}">${type.icon} 사업 설립 <small>${won(type.cost)} · 내부 운영팀 배치</small></button></div></article>`;
  }).join(''):'';
  const propertyValue=L.properties.reduce((sum,item)=>sum+(item.value||0),0);
  const propertyIncome=L.properties.reduce((sum,item)=>sum+(item.rent||0),0);
  const passiveOwned=L.passiveAssets||[];
  const passiveValue=passiveOwned.reduce((sum,owned)=>{
    const asset=D.PASSIVE_ASSETS.find(item=>item.id===owned.id);
    return sum+(asset?Math.round(asset.price*asset.resaleRate):0);
  },0);
  const passiveIncome=passiveOwned.reduce((sum,owned)=>{
    const asset=D.PASSIVE_ASSETS.find(item=>item.id===owned.id);
    return sum+(asset?Math.max(0,asset.monthlyIncome-asset.maintenance):0);
  },0);
  const businessValue=BUSINESS?BUSINESS.assetValue(L):0;
  const propertyOwned=L.properties.length
    ?`<div class="owned-asset-list">${L.properties.map(item=>`<div><span>${item.emoji||'🏠'} <b>${item.name}</b></span><small>시세 ${won(item.value)} · 월 임대 ${won(item.rent||0)}</small></div>`).join('')}</div>`
    :'<div class="asset-empty">보유한 투자용 부동산이 없습니다.</div>';
  const assetPortfolioStrip=`<div class="asset-portfolio-strip">
    <div><span>🏢 투자 부동산</span><b>${L.properties.length}채 · ${won(propertyValue)}</b><small>월 임대 +${won(propertyIncome)}</small></div>
    <div><span>💸 자동수입 자산</span><b>${passiveOwned.length}개 · ${won(passiveValue)}</b><small>월 예상 +${won(passiveIncome)}</small></div>
    <div><span>🏪 운영 사업체</span><b>${businessState.owned.length}곳 · ${won(businessValue)}</b><small class="${(businessState.lastNet||0)>=0?'up':'down'}">지난달 ${(businessState.lastNet||0)>=0?'+':''}${won(businessState.lastNet||0)}</small></div>
  </div>`;
  const job = jobOf();
  const monthlyIncome = job.variable ? Math.max(0, (job.variable[0] + job.variable[1]) / 2) : job.salary;
  const loanBtns = LOAN.offers(L, monthlyIncome).map(o => {
    const amt = Math.min(o.available, o.illegal ? 30000000 : 10000000);
    const rate = (o.monthlyRate * 100).toFixed(1);
    return `<button class="life-btn ${o.illegal ? 'hot' : ''}" data-act="loan" data-provider="${o.id}" data-amt="${Math.floor(amt)}" ${o.approved ? '' : 'disabled'}>${o.icon} ${o.tier} <small>${o.approved ? `+${won(amt)} · 월 ${rate}%` : `거절 · ${o.minScore}점 필요`}</small></button>`;
  }).join('');
  const dangerousHomeLocked=!!(L.dangerousTrioBond&&L.dangerousTrioBond.active);
  const canCommit = !dangerousHomeLocked&&relationGroup.status==='dating' && L.charm >= R.MARRY_AT;
  const partnerTag = relationshipMembers.length ? `<span class="muted">💕 ${RELATIONSHIPS.joinNames(relationshipMembers)} · 동등한 구성원 ${relationshipMembers.length}명 · 안정도 ${Math.round(relationGroup.stability)} · 긴장도 ${Math.round(relationGroup.tension)} · </span>` : '';
  const poly=ensurePolycule(L),trioBond=L.dangerousTrioBond,freedomBond=L.freedomTrioBond,childhoodBond=L.childhoodCircleBond;
  const polyBtn=trioBond&&trioBond.active
    ? `<span class="down">🦂 결핍 공생 연애 · 강유진·한채린·윤세라 전원 연인 · 외출 동행 활성</span>`
    : freedomBond&&freedomBond.active
      ? `<span class="up">🏠 작은 집의 연인 · 채원·유나·소희 전원 연인 · 힐링 공동생활 중 · 회복한 스트레스 ${Math.round(freedomBond.totalStressRecovered||0)} · 누적 생활수입 ${won(freedomBond.totalIncome||0)}</span>`
    : childhoodBond&&childhoodBond.active
      ? `<span class="${childhoodBond.route==='never_graduate'?'down':'up'}">🎓 ${childhoodBond.route==='never_graduate'?'끝나지 않은 졸업식 · 보호 계획이 다시 일상을 잠그는 중':'처음이 아닌 첫날 · 다섯이 책임을 인정하고 현재의 경계를 지키는 중'} · 예린·보라·서연·나영·미래 전원 연인</span>`
    : relationshipMembers.length===1&&!poly.active
      ? `<button class="life-btn" data-act="polycule">🌈 일반 다자연애 제안</button>`
      : poly.active?`<span class="up">🌈 합의형 관계 진행 중 · 추가 구성원 ${poly.members.length}명 · 신뢰 ${poly.trust}</span>`:'';
  const publicityBtns=relationshipMembers.length>1
    ? relationGroup.agreement.publicity==='public'
      ? `<button class="life-btn" data-act="relationship-publicity" data-mode="private">🔒 관계를 비공개 합의로 전환</button>`
      : `<button class="life-btn hot" data-act="relationship-publicity" data-mode="public">📣 관계를 직접 공개 <small>소문보다 먼저 알리고 안정도 회복</small></button>`
    :'';
  const commitment=relationGroup.status==='committed'?`<span class="up">🏠 ${RELATIONSHIPS.joinNames(relationshipMembers)} 공동생활 서약 중</span>`:'';
  const relBtns = partnerTag+commitment+`<button class="life-btn" data-act="date">🚶 외출·사람 만나기 <small>${won(R.DATE_COST)}</small></button>`+
    (canCommit?`<button class="life-btn hot" data-act="marry">🏠 공동생활 서약 <small>${won(R.WEDDING_COST)} · 다인 관계는 누구도 주연인으로 지정하지 않음</small></button>`:'')+
    polyBtn+publicityBtns;
  const faction=FACTION_CAMPAIGN?FACTION_CAMPAIGN.ensure(L):RIVALS.ensureFaction(L);
  const myRankWorth=netWorthClean();
  const rivalValues=S.bots.map((b,i)=>{
    const value=botNetWorth(b);CAMPAIGN.ensureRival(b,value);const reaction=CAMPAIGN.updateRival(b,value,S.day);
    return{index:i,name:b.name,value,bot:b,bankrupt:!!b.bankrupt,stage:reaction.after};
  });
  const playerRank=1+rivalValues.filter(item=>!item.bankrupt&&item.value>myRankWorth).length;
  const campaignProgress=FACTION_CAMPAIGN?FACTION_CAMPAIGN.progress(L,S.bots):null;
  const stageNames={stable:'평온',wary:'경계',defensive:'방어',desperate:'절박',collapse:'붕괴 직전',bankrupt:'파산·해산'};
  const rivalSelect = `<select id="rival-target">${rivalValues.map(item=>`<option value="${item.index}" ${item.bankrupt?'disabled':''}>${item.bankrupt?'☠️':'⚔️'} ${item.name} · ${won(item.value)} · ${stageNames[item.stage]||item.stage} · 압박 ${Math.round(item.bot.pressure||0)} / 신용 ${Math.round(item.bot.credibility==null?100:item.bot.credibility)}${item.bot.settlementOffer?` · 휴전금 ${won(item.bot.settlementOffer)}`:''}</option>`).join('')}</select>`;
  const rivalBtns = RIVALS.ACTIONS.map(a=>`<button class="life-btn ${a.illegal?'hot':''}" data-act="rival" data-rival-action="${a.id}" ${L.jailMonths>0?'disabled':''}>${a.label} <small>${won(a.cost)} · ${a.desc}</small></button>`).join('');
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
  const attackStatus=factionAttackStatus();
  const campaignGoal=campaignProgress
    ?`<div class="faction-status">🏆 <b>메인 목표 · 경쟁 세력 전부 파산</b><br>파산·해산 <b class="${campaignProgress.complete?'up':''}">${campaignProgress.defeated}/${campaignProgress.total}곳</b> · 남은 세력 ${campaignProgress.remaining}곳 · 현재 순자산 랭킹 ${playerRank}위${campaignProgress.complete?'<br><b class="up">✓ 세력전 메인 엔딩 달성</b>':`<br>${attackStatus.unlocked?'👁️ 경쟁 세력이 당신을 위험한 상대로 인식했습니다.':`🔒 공격 보호 기간 · ${attackStatus.reason}`}`}</div>`
    :'';
  const motiveGoal=(faction.personalMotives||[]).length
    ?`<div class="faction-status"><b>🎯 개인적인 전쟁</b>${faction.personalMotives.map(motive=>`<br><span class="${motive.resolved?'up':'down'}">${motive.resolved?'✓':'•'} ${motive.title} · ${motive.target}</span><br><small>${motive.detail}</small>`).join('')}</div>`
    :'';
  const campaignLocked=['locked','attacked','legal_wait'].includes(faction.storyStage);
  const queuedFactionStory=(S._importantEvents||[]).find(event=>event.factionStory);
  const factionCampaignNote=faction.storyStage==='attacked'
    ?`📨 첫 공격 대응 사건이 주요 사건 <b>1순위</b>로 대기 중입니다.${queuedFactionStory?'':' 장 마감 사건 단계에서 바로 이어집니다.'}`
    :faction.storyStage==='legal_wait'
      ?`⚖️ 나래가 신고 결과를 기다리는 중입니다. ${faction.legalResultQueued||queuedFactionStory?'<b>장태식 연락 사건이 1순위로 대기 중</b>':'다음 달 장 마감에 장태식의 연락이 먼저 도착합니다.'}`
      :'🔒 경쟁 세력의 첫 직접 공격을 받으면 나래·장태식 사건을 거쳐 세력을 만들 수 있습니다.';
  const factionStatus=`<div class="faction-status">🛡️ <b>${faction.name}</b> · 단계 ${faction.level}/5 · 구성원 ${faction.members.length}/${faction.capacity}명 · 방어 ${Math.round(faction.defense*100)}% · 정보 ${Math.round((faction.intel||0)*100)}% · 역공 ${faction.wins}승<br>${FACTION_CAMPAIGN?FACTION_CAMPAIGN.stageText(L):''}${faction.level?`<br>월 예상: 거점·사업 <b class="up">+${won(faction.projectedGross||0)}</b> · 운영비 <b class="down">-${won(faction.projectedUpkeep||0)}</b> · 순익 <b class="${(faction.projectedNet||0)>=0?'up':'down'}">${(faction.projectedNet||0)>=0?'+':''}${won(faction.projectedNet||0)}</b>`:''}${faction.assets&&faction.assets.length?`<br>거점: ${faction.assets.map(a=>a.icon+a.name).join(' · ')}`:''}${faction.lastAttacker?`<br>최근 공격자: ${faction.lastAttacker}`:''}${lastTrade}</div>`;
  const factionControls=campaignLocked
    ?`<div class="hub-note">${factionCampaignNote}</div>`
    :faction.storyStage==='forming'&&!faction.level
      ?'<button class="life-btn hot" data-act="faction" data-faction="build">🏗️ 창립 거점 마련 <small>스토리 지원 적용 · 세력 정식 출범</small></button>'
      :`<button class="life-btn" data-act="faction" data-faction="build">🏗️ ${faction.level?'세력 강화·정원 확장':'내 세력 만들기'}</button><button class="life-btn" data-act="faction-recruit" ${faction.level&&faction.members.length<faction.capacity?'':'disabled'}>👥 인원 모집 <small>${faction.members.length}/${faction.capacity}명 · 일반 인력/특별 아군</small></button><button class="life-btn hot" data-act="faction" data-faction="revenge" ${faction.level&&faction.members.length?'':'disabled'}>🔥 선택한 라이벌 압박 <small>현금·사업가치·신용을 낮추고 반응을 끌어냅니다</small></button><button class="life-btn" data-act="faction" data-faction="negotiate" ${faction.level?'':'disabled'}>🤝 휴전 협상 수락 <small>도착한 휴전금을 받는 대신 상대가 3개월 재정비</small></button><button class="life-btn hot" data-act="faction" data-faction="bankrupt" ${faction.level>=2&&faction.members.filter(m=>(m.injuredMonths||0)<=0).length>=2?'':'disabled'}>🏦 최종 파산 압박 <small>세력 2단계·활동 인원 2명·상대 약화 필요</small></button>${fundBox}`;
  const factionBox=`${campaignGoal}${motiveGoal}${factionStatus}${factionMembers?`<div class="faction-members">${factionMembers}</div>`:faction.level?'<div class="hub-note">구성원이 없어도 거점 기본 수입은 발생합니다. 인원을 모집하면 사업 수익과 방어력이 함께 늘어납니다.</div>':''}${factionControls}`;
  const planBtns = relationshipMembers.length&&relationGroup.agreement.cohabiting&&!L.familyPlan ? `<button class="life-btn" data-act="family-plan" data-method="birth">👶 공동양육 출산 계획 <small>5,000,000 · 현재 구성원 전원 양육자 등록</small></button><button class="life-btn" data-act="family-plan" data-method="adopt">🫶 공동양육 입양 신청 <small>12,000,000 · 현재 구성원 전원 양육자 등록</small></button>` : '';
  const childBtns = L.children.map(c=>`<button class="life-btn" data-act="child-bond" data-child="${c.id}">🫶 ${c.name}와 시간 보내기 <small>200,000</small></button><button class="life-btn" data-act="child-edu" data-child="${c.id}">📚 ${c.name} 교육 투자 <small>1,000,000</small></button>`).join('');
  const certBtns = CAREER.CERTS.filter(c=>!CAREER.ensure(L).certifications.includes(c.id)).map(c=>`<button class="life-btn" data-act="cert" data-cert="${c.id}">${c.icon} ${c.name} <small>${won(c.cost)}</small></button>`).join('');
  const currentHousingRefund=Math.round(HOUSING.assetValue(L)*(L.housing.tenure==='owned'?.98:1));
  const housingBtns = HOUSING.HOMES.flatMap(h=>Object.values(HOUSING.TENURES).filter(t=>h.id!=='parents'||t.id==='monthly').map(t=>{const q=HOUSING.quote(h,t.id),current=h.id===L.housing.id&&t.id===L.housing.tenure,needed=Math.max(0,q.upfront-currentHousingRefund);return`<button class="life-btn ${current?'hot':''}" data-act="move" data-home="${h.id}" data-tenure="${t.id}" ${dangerousHomeLocked||current?'disabled':''}>${h.icon}${t.icon} ${h.name} · ${t.name} <small>${dangerousHomeLocked?(current?'공동생활 거점 · 월세 0원':'세 사람과 공동생활 중에는 이사 불가'):current?'현재 거주 중':`보증금·집값 교체 실부담 ${won(needed)} · 월 ${won(q.monthly)}`}</small></button>`;})).join('');
  const insuranceBtns = LIFE_FINANCE.POLICIES.map(p => finance.policies.includes(p.id)
    ? `<button class="life-btn hot" data-act="insurance-cancel" data-policy="${p.id}">${p.icon} ${p.name} 해지 <small>월 ${won(p.premium)}</small></button>`
    : `<button class="life-btn" data-act="insurance" data-policy="${p.id}">${p.icon} ${p.name} <small>${p.desc} · 월 ${won(p.premium)}</small></button>`).join('');
  const pensionBtns = [.05,.09,.15].map(rate=>`<button class="life-btn ${Math.abs(finance.pensionRate-rate)<.001?'hot':''}" data-act="pension" data-rate="${rate}">연금 ${Math.round(rate*100)}%</button>`).join('');
  const contactBtns = social.contacts.filter(c=>!SOCIAL.isSubordinate||!SOCIAL.isSubordinate(c)).map(c=>{const r=SOCIAL.role(c);const ready=c.trust>=30&&c.favor>=1;return `<button class="life-btn" data-act="contact-nurture" data-contact="${c.id}">${r.icon} ${c.name} 만나기 <small>신뢰 ${c.trust}/30 · 호의 ${c.favor} · 300,000</small></button><button class="life-btn ${ready?'hot':''}" data-act="contact-ask" data-contact="${c.id}" ${ready?'':'disabled'}>🙏 ${r.benefit} 부탁 <small>${ready?'가능':'신뢰30·호의1 필요'}</small></button>${c.freeRecruit&&!c.recruitedTo?`<button class="life-btn hot" data-act="origin-ally" data-contact="${c.id}">🎒 ${c.name}에게 합류 제안 <small>사업체·세력 영입비 0원</small></button>`:''}`}).join('');
  const specialMet = id => ensureMet(L).some(m => m.special === id);
  const specialRecord=id=>ensureMet(L).find(m=>m.special===id);
  const canSpecialFollowup=rec=>!!(rec&&rec.status==='acquaintance'&&!hasPersonalContact(rec)&&rec.lastSpecialFollowupDay!==S.day);
  const yujinRecord=specialRecord('police');
  const sctx = specialRouteContext(L);
  const specialMeetBtns = [
    (!specialMet('police') && (L.yujinInvestigation&&L.yujinInvestigation.ready||justice.case || L.criminalRecord > 0 || sctx.attacked)) ? '<button class="life-btn hot" data-act="meet-special" data-special="yujin">👮‍♀️ 강유진의 방문 조사에 응한다 <small>경쟁 세력 피해 자금·윤세라 거처 확인</small></button>' :
      canSpecialFollowup(yujinRecord)?`<button class="life-btn hot" data-act="meet-special" data-special="yujin">👮‍♀️ 강유진의 후속 수사에 응한다 <small>${(yujinRecord.specialFollowupCount||0)+1}번째 대화 · 공식 연락에서 개인 연락으로</small></button>`:''
  ].join('');
  const personalBtns = ensureMet(L).filter(m=>(!FREEDOM_TRIO||FREEDOM_TRIO.canContact(L,m.name))&&['friend','casual','partner','polycule','lover'].includes(m.status)).map(m=>{const sig=CHAR_TRAITS&&CHAR_TRAITS.label(m);return`<button class="life-btn" data-act="person-request" data-person="${m.name}">🙏 ${m.name}에게 부탁하기 <small>${relationTag(L,m.name)} · 호감 ${Math.round(m.affection||0)}${m.childhoodFriend?' · 소꿉친구':''}${sig?` · ${sig}`:''}</small></button>`;}).join('');
  const courtBtns=justice.case?`<div class="court-status">⚖️ <b>${justice.case.crime}</b> · <b class="down">${justice.case.phase}</b> 단계 · ${justice.case.months}개월 남음<br><span class="muted">${justice.case.phase==='수사'?'변호사를 미리 선임하면 유리합니다':justice.case.phase==='기소'?'변호사 등급이 불기소 확률에 영향':'⚠️ 재판 전략 3가지 중 하나를 꼭 선택하세요'}</span></div><button class="life-btn" data-act="lawyer" data-tier="public">국선변호인</button><button class="life-btn" data-act="lawyer" data-tier="standard">전문 변호사 <small>5,000,000</small></button><button class="life-btn" data-act="lawyer" data-tier="elite">대형 로펌 <small>20,000,000</small></button>${justice.case.phase==='재판'?'<button class="life-btn" data-act="court" data-strategy="plea">혐의 인정·선처</button><button class="life-btn" data-act="court" data-strategy="contest">무죄 다툼</button><button class="life-btn" data-act="court" data-strategy="cooperate">수사 협조</button>':''}`:'<span class="muted">진행 중인 사건 없음</span>';
  const treatment=HEALTH.treatmentOffer(L);
  const actionUsed = lifeActionCount();
  const actionLeft = lifeActionRemaining();
  const mentor=investmentMentorState(L);
  const shutInOuting=!freeOutingUnlocked(L);
  const weekLabel = actionLeft > 0 ? `${actionUsed + 1}주차 일정 선택` : '이번 달 일정 완료';
  const quickBtns=`<button class="life-btn daily-choice home" data-act="home-life">🏠 집에서 보내기 <small>휴식·게임·공부·생활공간 꾸미기</small></button><button class="life-btn daily-choice outing" data-act="date">🌆 목적을 정해 외출하기 <small>장소·취미·약속을 먼저 선택</small></button><button class="life-btn daily-choice earning" data-act="income-work">💵 이번 주 돈 벌기 <small>추가 근무·단기 의뢰·일당 업무</small></button>`;
  const workspaceLaunchers=`<div class="life-workspace-launchers">
    <button data-life-window="wellbeing"><span>🌿</span><b>생활·건강</b><small>외부 취미·검진·관계 약속</small></button>
    <button data-life-window="social"><span>👨‍👩‍👧</span><b>가족·인맥</b><small>가족·친구·개인 이야기</small></button>
    <button data-life-window="power"><span>⚔️</span><b>세력·법정</b><small>조직·라이벌·진행 사건</small></button>
    <button data-life-window="investment"><span>📘</span><b>투자 컨설팅</b><small>나래의 분석 노트 · ${mentor.skill>=70?'통찰':mentor.skill>=45?'분석':mentor.skill>=20?'기초':'입문'}</small></button>
    <button data-life-window="career"><span>📈</span><b>경력 관리</b><small>이직·자격증</small></button>
    <button data-life-window="housing"><span>🏠</span><b>거주지</b><small>월세·전세·매매</small></button>
    <button data-life-window="assets"><span>🏢</span><b>자산·사업</b><small>부동산·사업체·직원 모집</small></button>
  </div>`;
  const lifeWorkspaces=`<div class="life-workspace-layer" hidden>
    <section class="life-workspace-window" data-life-panel="wellbeing" hidden><header><div><span>🌿</span><b>생활·건강</b><small>밖에서 하는 취미, 건강관리, 관계 약속</small></div><button data-life-window-close aria-label="닫기">×</button></header><img class="hub-scene-banner" src="${lifeSceneImage('health')}" alt="생활과 건강 관리"><div class="workspace-content"><div class="hub-note">게임과 자기계발은 집에서, 운동·외식·여행은 이곳에서 일정을 잡습니다.</div><div class="workspace-card-grid">${hobbyBtns}<button class="life-btn" data-act="checkup">🏥 건강검진 <small>500,000</small></button><button class="life-btn" data-act="treat" ${treatment?'':'disabled'}>💊 ${treatment?`${treatment.name} 치료 · ${won(treatment.cost)}`:'현재 필요한 치료 없음'}</button>${relBtns}</div></div></section>
    <section class="life-workspace-window" data-life-panel="social" hidden><header><div><span>👨‍👩‍👧</span><b>가족·인맥</b><small>가까운 사람과 보내는 시간</small></div><button data-life-window-close aria-label="닫기">×</button></header><img class="hub-scene-banner" src="${lifeSceneImage('network')}" alt="가족과 인맥 모임"><div class="workspace-content"><div class="workspace-card-grid">${planBtns}${childBtns}<button class="life-btn" data-act="parent-care">👵 부모님 돌봄 <small>1,500,000</small></button><button class="life-btn" data-act="contact-meet">🍽️ 일반 업계 모임 <small>주요 인맥 연락처 만들기</small></button><button class="life-btn hot" data-act="industry-gathering">🥂 사교 모임 등급 <small>실적·평판을 쌓아 특별 책임자 소개받기</small></button>${specialMeetBtns}${personalBtns}${contactBtns}</div></div></section>
    <section class="life-workspace-window" data-life-panel="power" hidden><header><div><span>⚔️</span><b>세력·라이벌·법정</b><small>${justice.case?'진행 중인 사건 있음':'조직 운영과 경쟁 대응'}</small></div><button data-life-window-close aria-label="닫기">×</button></header><img class="hub-scene-banner" src="${justice.case?lifeSceneImage('court'):lifeSceneImage('faction')}" alt="${justice.case?'법정 심리':'세력 작전실'}"><div class="workspace-content">${factionBox}<div class="route-sep">경쟁 세력 선택</div>${rivalSelect}<div class="workspace-card-grid">${rivalBtns}${courtBtns}</div></div></section>
    <section class="life-workspace-window" data-life-panel="investment" hidden><header><div><span>📘</span><b>나래의 투자 컨설팅</b><small>${shutInOuting?'센터가 잡아 둔 대면 일정':'시장 화면을 함께 읽는 정기 상담'}</small></div><button data-life-window-close aria-label="닫기">×</button></header><img class="hub-scene-banner" src="./assets/life-guide.png" alt="나래의 투자 컨설팅"><div class="workspace-content"><div class="date-profile"><img class="char-portrait" src="${characterPortrait(D.SPECIAL_CHARACTERS.narae,'neutral')}" alt="나래"><div><strong>나래 · 투자교육 매니저</strong><br><span class="muted">“${shutInOuting?'또 화상으로 바꾸려고 했죠? 현관까지만 나오세요. 제가 1층에 있을게요.':'정답을 찍어드리진 않아요. 대신 무엇을 먼저 봐야 하는지는 알려드릴게요.'}”</span></div></div><div class="home-life-summary"><b>투자 감각 · ${mentor.skill>=70?'통찰':mentor.skill>=45?'분석':mentor.skill>=20?'기초':'입문'}</b><small>상담 ${mentor.sessions}회${mentor.escortedSessions?` · 나래가 마중 나온 날 ${mentor.escortedSessions}회`:''} · 배운 항목 ${mentor.unlocks.length?mentor.unlocks.join(' · '):'기초 화면 읽기'}</small></div>${investmentInsightHTML()}<div class="workspace-card-grid"><button class="life-btn" data-act="investment-consult">📚 ${shutInOuting?'센터 현장 상담에 출석한다':'월간 컨설팅 받기'} <small>500,000 · 이번 달 경력 행동 사용</small></button></div></div></section>
    <section class="life-workspace-window" data-life-panel="career" hidden><header><div><span>📈</span><b>경력 관리</b><small>${jobOf().name} · 능력 ${Math.round(career.skill||0)}</small></div><button data-life-window-close aria-label="닫기">×</button></header><img class="hub-scene-banner" src="${lifeSceneImage('career')}" alt="경력 관리 장면"><div class="workspace-content"><div class="hub-note">직장은 이직으로 바꾸고, 자격증은 지원 가능한 직업과 직무 능력을 넓힙니다.</div><div class="workspace-card-grid"><button class="life-btn" data-act="changejob">💼 이직 알아보기</button>${certBtns}</div></div></section>
    <section class="life-workspace-window" data-life-panel="housing" hidden><header><div><span>🏠</span><b>거주지 선택</b><small>현재 ${HOUSING.home(L).name} · ${HOUSING.TENURES[L.housing.tenure].name}</small></div><button data-life-window-close aria-label="닫기">×</button></header><img class="hub-scene-banner" src="${dangerousHomeLocked?'./assets/event-trio-meeting-5_2.png':lifeSceneImage('home')}" alt="거주지 선택 장면"><div class="workspace-content"><div class="hub-note">${dangerousHomeLocked?'강유진·한채린·윤세라와 합의한 공동생활 거점입니다. 자취방 월세는 사라지지만 관계가 유지되는 동안 이사할 수 없습니다.':'월세는 초기 부담이 작고, 전세는 보증금을 맡기는 대신 월 부담이 낮습니다. 매매 주택에는 월 임대료가 없습니다.'}</div><div class="workspace-card-grid">${housingBtns}</div></div></section>
    <section class="life-workspace-window" data-life-panel="assets" hidden><header><div><span>🏢</span><b>자산·사업 관리실</b><small>서로 다른 업종을 동시에 운영하고 직원을 모집할 수 있습니다.</small></div><button data-life-window-close aria-label="닫기">×</button></header><img class="hub-scene-banner" src="${lifeSceneImage('business')}" alt="자산과 사업을 관리하는 사무실"><div class="workspace-content">${assetPortfolioStrip}<nav class="workspace-tabs"><button data-workspace-tab="business" class="active">사업체·직원</button><button data-workspace-tab="property">투자 부동산</button><button data-workspace-tab="income">자동수입</button><button data-workspace-tab="finance">금융·보장</button></nav><div data-workspace-page="business"><div class="hub-note">각 업종은 매출 구조와 경기 민감도가 다릅니다. 직원을 늘리면 매출 여력이 커지지만 매달 인건비도 증가합니다.</div><div class="asset-business-grid">${businessBox}</div></div><div data-workspace-page="property" hidden>${propertyOwned}<div class="asset-action-grid">${propBtns}</div></div><div data-workspace-page="income" hidden><div class="asset-action-grid">${passiveBtns}</div></div><div data-workspace-page="finance" hidden><div class="hub-btns">${loanBtns}<button class="life-btn" data-act="repay">상환${L.loan>0?' '+won(L.loan):''}</button>${insuranceBtns}${pensionBtns}</div></div></div></section>
  </div>`;
  return `
    <div class="life-hub">
      <div class="hub-title">🎬 ${weekLabel} <span class="muted">주요 행동 ${actionUsed}/${LIFE_ACTIONS_PER_MONTH} · 남은 자유시간 ${actionLeft}회</span></div>
      <div class="life-time-progress" aria-label="이번 달 자유시간 사용 현황">${Array.from({length:LIFE_ACTIONS_PER_MONTH},(_,i)=>`<span class="${i<actionUsed?'used':i===actionUsed?'available current':'available'}">${i<actionUsed?'✓':i+1+'주차'}</span>`).join('')}</div>
      <div class="hub-quick">${quickBtns}</div>
      ${workspaceLaunchers}
      <div class="hub-note">한 달에 자유시간 4회를 사용하며 같은 행동도 다시 선택할 수 있습니다. 돈이 부족하면 추가 근무·단기 의뢰·일당 업무로 현금을 먼저 만들 수 있고, 같은 수입 행동을 반복하면 피로 때문에 보수가 조금씩 줄어듭니다.</div>
      ${storyProgressHTML(L)}
      ${assetPortfolioStrip}
      <div class="month-action-status">${['데이트','취미','휴식','수입','경력','인맥','사업','가족','라이벌'].map(g=>{const count=monthActionCount(g);return`<span class="${count?'done':''}">${count?`×${count}`:'○'} ${g}</span>`;}).join('')}</div>
      ${lifeWorkspaces}
    </div>`;
}

function wireLifeHub(host) {
  document.body.querySelectorAll(':scope > .life-workspace-layer').forEach(layer=>layer.remove());
  const workspaceLayer=host.querySelector('.life-workspace-layer');
  const closeWorkspace=()=>{
    if(!workspaceLayer)return;
    workspaceLayer.hidden=true;
    workspaceLayer.querySelectorAll('[data-life-panel]').forEach(panel=>panel.hidden=true);
  };
  host.querySelectorAll('[data-life-window]').forEach(button=>button.addEventListener('click',()=>{
    if(!workspaceLayer)return;
    workspaceLayer.hidden=false;
    workspaceLayer.querySelectorAll('[data-life-panel]').forEach(panel=>panel.hidden=panel.dataset.lifePanel!==button.dataset.lifeWindow);
  }));
  host.querySelectorAll('[data-life-window-close]').forEach(button=>button.addEventListener('click',closeWorkspace));
  if(workspaceLayer)workspaceLayer.addEventListener('click',event=>{if(event.target===workspaceLayer)closeWorkspace();});
  host.querySelectorAll('[data-workspace-tab]').forEach(button=>button.addEventListener('click',()=>{
    const panel=button.closest('[data-life-panel]');
    panel.querySelectorAll('[data-workspace-tab]').forEach(tab=>tab.classList.toggle('active',tab===button));
    panel.querySelectorAll('[data-workspace-page]').forEach(page=>page.hidden=page.dataset.workspacePage!==button.dataset.workspaceTab);
  }));
  host.querySelectorAll('.life-btn').forEach(b => {
    const group=monthlyGroupForAction(b.dataset.act);
    if(group&&lifeActionExhausted()){
      b.disabled=true;b.classList.add('month-used');b.title='이번 달 자유시간을 모두 사용했습니다';
      const small=b.querySelector('small');if(small)small.textContent='자유시간 모두 사용';
    }
  });
  host.querySelectorAll('.life-btn').forEach(b => b.addEventListener('click', () => {
    const act = b.dataset.act;
    const monthlyGroup=monthlyGroupForAction(act);
    if(monthlyGroup&&lifeActionExhausted()){flashToast(`📅 이번 달 자유시간 ${LIFE_ACTIONS_PER_MONTH}회를 모두 사용했습니다`,'neutral');return;}
    // 큰 관리 창 안에서 새 모달을 열면 관리 창의 높은 z-index에 가려진다.
    // 별도 팝업으로 이어지는 행동은 먼저 관리 창을 닫아 한 화면에 한 레이어만 남긴다.
    if(new Set([
      'home-life','income-work','origin-ally','meet-special','person-request',
      'business-start','business-hire','business-manager','business-expand','business-close','business-strategy','industry-gathering',
      'faction-recruit','date','marry','polycule','changejob','rival','faction'
    ]).has(act))closeWorkspace();
    if (act === 'home-life') showHomeLifeModal();
    else if (act === 'income-work') showIncomeWorkModal();
    else if (act === 'investment-consult') doNaraeConsulting();
    else if (act === 'hobby') doHobby(b.dataset.id);
    else if (act === 'prop') buyProperty(b.dataset.id);
    else if (act === 'passive-buy') buyPassiveAsset(b.dataset.id);
    else if (act === 'passive-sell') sellPassiveAsset(b.dataset.id);
    else if (act === 'business-start') startBusiness(b.dataset.business);
    else if (act === 'business-hire') recruitBusinessStaff(b.dataset.business);
    else if (act === 'business-manager') showSpecialManagerRecruit(b.dataset.business);
    else if (act === 'business-expand') expandBusiness(b.dataset.business);
    else if (act === 'business-close') closeBusinessOperation(b.dataset.business);
    else if (act === 'business-strategy') changeBusinessStrategy(b.dataset.business,b.dataset.strategy);
    else if (act === 'loan') takeLoan(b.dataset.provider, +b.dataset.amt);
    else if (act === 'repay') repayLoan();
    else if (act === 'checkup') doHealthCheckup();
    else if (act === 'treat') doTreatment();
    else if (act === 'rest') doRestMonth();
    else if (act === 'decompress') doDecompressMonth();
    else if (act === 'sera-home') resolveSeraHomeMoment(b.dataset.seraHome);
    else if (act === 'family-plan') doFamilyPlan(b.dataset.method);
    else if (act === 'child-bond') doChildBond(b.dataset.child);
    else if (act === 'child-edu') doChildEducation(b.dataset.child);
    else if (act === 'parent-care') doParentCare();
    else if (act === 'cert') doCertification(b.dataset.cert);
    else if (act === 'move') doMoveHousing(b.dataset.home,b.dataset.tenure);
    else if (act === 'insurance') doInsurance(b.dataset.policy);
    else if (act === 'insurance-cancel') cancelInsurance(b.dataset.policy);
    else if (act === 'pension') setPensionRate(+b.dataset.rate);
    else if (act === 'contact-meet') meetContact();
    else if (act === 'industry-gathering') showIndustryGatherings();
    else if (act === 'contact-nurture') nurtureContact(b.dataset.contact);
    else if (act === 'contact-ask') askContact(b.dataset.contact);
    else if (act === 'origin-ally') showOriginAllyPlacement(b.dataset.contact);
    else if (act === 'meet-special') meetSpecialPerson(b.dataset.special);
    else if (act === 'person-request') showPersonRequest(b.dataset.person);
    else if (act === 'lawyer') hireCourtLawyer(b.dataset.tier);
    else if (act === 'court') chooseCourtStrategy(b.dataset.strategy);
    else if (act === 'rival') doRivalAction(b.dataset.rivalAction, +($('rival-target') ? $('rival-target').value : 0));
    else if (act === 'faction') doFactionAction(b.dataset.faction, +($('rival-target') ? $('rival-target').value : 0));
    else if (act === 'faction-recruit') showFactionRecruitment();
    else if (act === 'faction-entrust') entrustFaction(+b.dataset.amt);
    else if (act === 'date') doDate();
    else if (act === 'marry') doMarriage();
    else if (act === 'relationship-publicity') doRelationshipPublicity(b.dataset.mode);
    else if (act === 'polycule') showPolyculeProposal();
    else if (act === 'changejob') showJobModal(true);
  }));
  // 월말 창에는 좌우 이동 transform이 있어 그 안의 fixed 요소도 620px 폭에 갇힌다.
  // 모든 핸들러를 연결한 뒤 관리 레이어만 body로 올려 큰 화면을 온전히 사용한다.
  if(workspaceLayer)document.body.appendChild(workspaceLayer);
}

/* ------------------------------------------------------------------ AI 라이벌 */
function runBots() {
  const live = S.stocks.filter(s => s.listed);
  S.bots.forEach(bot => {
    if (bot.bankrupt || bot.jailMonths > 0) return;
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
  if (!factionAttackStatus().unlocked) return;
  if (Math.random() > CFG.RAID_PROB) return;
  const L = S.life; if (!L) return;
  const targets = S.bots.filter(b => !b.bankrupt && b.jailMonths <= 0 && (!b.truceUntil||b.truceUntil<=S.day) && (b.aggression || 0) >= 0.22);
  if (!targets.length) return;
  const attacker = pick(targets);
  unlockRivalContact(attacker,'rival_attack');
  const idx = S.bots.indexOf(attacker);
  const worth = Math.max(0, totalWealth());
  const illegal = attacker.aggression > 0.4 && Math.random() < 0.5;
  let loss = Math.round(Math.max(100000, worth * rand(0.008, illegal ? 0.055 : 0.03)));

  // 세력 방어 적용
  const f = RIVALS.ensureFaction(L);
  f.lastAttacker = attacker.name;
  registerFactionAttack(attacker);
  L._attackedRecently = 3;   // 최근 피습 → 경찰(강유진) 조우 조건
  if(metRecord(L,'윤세라'))queueYujinInvestigation(L.seraHousing,attacker);
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
  if (!bot || bot.bankrupt) {if(bot)bot.marketHoldingsValue=0;return 0;}
  let v = bot.capital;
  let marketHoldingsValue=0;
  Object.keys(bot.owned).forEach(name => {
    const s = S.stocks.find(x => x.name === name);
    if (s && s.listed) {
      const value=bot.owned[name] * s.history[s.history.length - 1].c;
      v += value;marketHoldingsValue+=value;
    }
  });
  bot.marketHoldingsValue=marketHoldingsValue;
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
  const result = TRADING.executeLimit(S, o, price, {
    feeRate: CFG.FEE_RATE,
    taxRate: CFG.TAX_RATE,
    buyingPower: buyingPower(),
  });
  if (!result.ok) return false;
  if (result.kind === 'cover') {
    addNews(`🐻 [지정가 체결] ${o.name} ${result.qty}주 숏 커버 @${won(price)} (실현 ${won(result.realized)})`, result.realized >= 0 ? 'good' : 'bad');
    flashToast(`🐻 지정가 숏 청산 · ${o.name} ${result.qty}주`, result.realized >= 0 ? 'good' : 'bad');
    playSound(result.realized >= 0 ? 'buy' : 'error');
  } else if (result.kind === 'buy') {
    addNews(`🟢 [지정가 체결] ${o.name} ${result.qty}주 매수 @${won(price)}`, 'good');
    flashToast(`🟢 지정가 매수 체결 · ${o.name} ${result.qty}주 @${won(price)}`, 'good');
    playSound('buy');
  } else {
    addNews(`🔴 [지정가 체결] ${o.name} ${result.qty}주 매도 @${won(price)} (실현 ${won(result.realized)})`, result.realized >= 0 ? 'good' : 'bad');
    flashToast(`🔴 지정가 매도 체결 · 실현 ${won(result.realized)}원`, result.realized >= 0 ? 'good' : 'bad');
    playSound('sell');
  }
  return true;
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
  const result = TRADING.executeBuy(S, { name:stock.name, qty, price }, {
    feeRate: CFG.FEE_RATE,
    buyingPower: buyingPower(),
  });
  if (!result.ok) {
    flashToast(result.kind === 'cover' ? '💸 청산할 자본금이 부족합니다' : '💸 매수여력이 부족합니다', 'bad');
    playSound('error');
    return;
  }
  if (result.kind === 'cover') {
    addNews(`🐻 ${stock.name} ${result.qty}주 숏 커버 @${won(price)} (실현 ${won(result.realized)})`, result.realized >= 0 ? 'good' : 'bad');
    flashToast(`숏 청산 · 실현손익 ${won(result.realized)}원`, result.realized >= 0 ? 'good' : 'bad');
    playSound(result.realized >= 0 ? 'buy' : 'error');
  } else {
    addNews(`🟢 ${stock.name} ${result.qty}주 매수 @${won(price)}${result.borrowed > 0 ? ` (신용 ${won(result.borrowed)})` : ''}`, 'neutral');
    flashToast(`매수 체결 · ${stock.name} ${result.qty}주${result.borrowed > 0 ? ' ⚡신용' : ''}`, 'good');
    playSound('buy'); speak('매수 체결');
  }
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

  const result = TRADING.executeSell(S, { name:stock.name, qty, price }, {
    feeRate: CFG.FEE_RATE,
    taxRate: CFG.TAX_RATE,
    allowShort: false,
  });
  if (!result.ok) { flashToast('보유 수량이 부족합니다', 'bad'); playSound('error'); return; }
  addNews(`🔴 ${stock.name} ${result.qty}주 매도 @${won(price)} (실현 ${won(result.realized)})`, result.realized >= 0 ? 'good' : 'bad');
  flashToast(`매도 체결 · 실현손익 ${won(result.realized)}원`, result.realized >= 0 ? 'good' : 'bad');
  playSound('sell'); speak('매도 체결');
  afterTrade();
}

// 공매도 진입: 현재가로 빌려 팔아 현금(담보) 확보
function openShort(stock, qty, price) {
  const power = shortSellingPower();
  const result = TRADING.executeSell(S, { name:stock.name, qty, price }, {
    feeRate: CFG.FEE_RATE,
    taxRate: CFG.TAX_RATE,
    allowShort: true,
    shortSellingPower: power,
  });
  if (!result.ok) {
    flashToast(`🐻 공매도 한도 초과 · 가능 ${won(shortSellingPower())}원`, 'bad');
    playSound('error');
    return;
  }
  addNews(`🐻 ${stock.name} ${result.qty}주 공매도 진입 @${won(price)}`, 'neutral');
  flashToast(`공매도 진입 · ${stock.name} ${result.qty}주`, 'bad');
  playSound('sell');
  afterTrade();
}

// 공매도 청산(숏 커버): 되사서 갚음
function coverShort(stock, qty, price) {
  const result = TRADING.executeBuy(S, { name:stock.name, qty, price }, {
    feeRate: CFG.FEE_RATE,
    buyingPower: buyingPower(),
  });
  if (!result.ok) { flashToast('💸 청산할 자본금이 부족합니다', 'bad'); playSound('error'); return; }
  addNews(`🐻 ${stock.name} ${result.qty}주 숏 커버 @${won(price)} (실현 ${won(result.realized)})`, result.realized >= 0 ? 'good' : 'bad');
  flashToast(`숏 청산 · 실현손익 ${won(result.realized)}원`, result.realized >= 0 ? 'good' : 'bad');
  playSound(result.realized >= 0 ? 'buy' : 'error');
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
  renderPendingOrders();
  renderLimitOrders();
  renderOrderBook();
  renderCapital();
  renderInfoMarketPanel();
  renderChart();
  renderPortfolioChart();
  updateCost();
}

function renderInfoMarketPanel() {
  renderOwned();
  renderIssues();
  renderNews();
  renderLeaderboard();
  renderNetWorthChart();
  renderLifePanel();
  renderChatPanel();
}

function renderInfoMarketTab(name) {
  const renderers = {
    owned:renderOwned,
    life:renderLifePanel,
    chat:renderChatPanel,
    issue:renderIssues,
    news:renderNews,
    rank:() => { renderLeaderboard(); renderNetWorthChart(); },
    ach:renderAchievements,
  };
  if (renderers[name]) renderers[name]();
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
           `<li class="${n.cls}"><span class="cr-when">${dateInfo(n.day).label}</span> ${n.text}</li>`).join('')}</ul>`
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
  const sectorFilter = $('sector-filter').value;
  const workspaceFilter = MARKET_WORKSPACE.filters();
  const visible = live.filter(stock => {
    if (sectorFilter !== 'all' && stock.sector !== sectorFilter) return false;
    if (workspaceFilter.query && !`${stock.name} ${(D.SECTORS[stock.sector] || {}).name || ''}`.toLocaleLowerCase('ko-KR').includes(workspaceFilter.query)) return false;
    if (workspaceFilter.mode === 'watch' && !S.watchlist[stock.name]) return false;
    if (workspaceFilter.mode === 'owned' && !S.owned[stock.name]) return false;
    return true;
  });
  visible.forEach((stock) => {
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
      `<span class="stock-identity"><span class="tag" style="background:${sec.color}">${sec.name}</span><strong>${stock.name}</strong>${badge}</span>` +
      `<span class="stock-quote"><span class="price ${ci.up ? 'up' : 'down'}">${won(ci.cur)}원</span><span class="chg ${ci.up ? 'up' : 'down'}">${ci.up ? '▲' : '▼'} ${pct(ci.rate)}</span></span>` +
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
  if (!visible.length) {
    el.innerHTML = '<li class="stock-list-empty">조건에 맞는 종목이 없습니다.<small>검색어·섹터·관심/보유 필터를 바꿔보세요.</small></li>';
  }
  MARKET_WORKSPACE.setStockCount(visible.length, live.length);
}

function toggleWatch(name) {
  if (S.watchlist[name]) delete S.watchlist[name];
  else S.watchlist[name] = true;
  renderStockList();
}

function renderOwned() {
  const items = Object.keys(S.owned).map(name => {
    const pos = S.owned[name];
    const price = priceOf(name);
    const short = pos.qty <= 0;
    const quantity = Math.abs(pos.qty);
    const pl = short ? (pos.avg - price) * quantity : (price - pos.avg) * quantity;
    const rate = pos.avg ? (short ? (pos.avg - price) : (price - pos.avg)) / pos.avg : 0;
    return {
      name, short, profit:pl >= 0, qtyText:`${quantity}주`,
      priceText:won(price), avgText:won(pos.avg), rateText:pct(rate),
      plText:`${pl >= 0 ? '+' : ''}${won(pl)}원`,
    };
  });
  INFO_MARKET_PANEL.renderOwned(items, name => {
    const live = S.stocks.filter(stock => stock.listed);
    const index = live.findIndex(stock => stock.name === name);
    if (index >= 0) { S.selected = index; renderAll(); }
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
  const outlook = ECONOMY.outlook(S.economy);
  const strong = outlook.strong.slice(0, 2).map(id => (D.SECTORS[id] || {}).name || id).join('·');
  const weak = outlook.weak.slice(0, 2).map(id => (D.SECTORS[id] || {}).name || id).join('·');
  const items = S.stocks.filter(stock => stock.listed && stock.pendingIssue && stock.pendingIssue.impact).map(stock => {
    const iss = stock.pendingIssue;
    const meta = CAP_META[stock.cap] || CAP_META.mid;
    const effective = Math.abs(iss.impact * meta.issueMul);
    const strength = effective >= .07 ? '강함' : effective >= .035 ? '보통' : '약함';
    return {
      name:stock.name, text:iss.text, good:iss.impact >= 0, strength,
      limitText:(()=>{
        const limits=MARKET_BALANCE ? MARKET_BALANCE.limits(meta) : {sessionUp:meta.sessionLimit,sessionDown:meta.sessionLimit};
        return `${meta.label}주 월 한도 +${Math.round(limits.sessionUp*100)}% / -${Math.round(limits.sessionDown*100)}%`;
      })(),
    };
  });
  INFO_MARKET_PANEL.renderIssues({
    macro:{
      good:outlook.monthlyMarket >= 0,
      title:outlook.text,
      detail:`금리·물가와 경기 국면이 한 달 동안 누적 반영됩니다${strong ? ` · 강세 ${strong}` : ''}${weak ? ` · 약세 ${weak}` : ''}`,
    },
    items,
  }, goBuy);
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
  const list = newsFeed(S.newsFilter).slice(0, 40);
  INFO_MARKET_PANEL.renderNews({
    ticker:newsFeed('all').slice(0, 12)
      .map(item => item.kind === 'stock' ? `${item.name} — ${item.text}` : item.text).join('  ◆  '),
    filter:S.newsFilter,
    items:list.map(item => ({
      ...item,
      dateLabel:dateInfo(item.day).label,
      held:item.kind === 'stock' && !!S.owned[item.name],
      arrow:item.impact > 0 ? '▲' : item.impact < 0 ? '▼' : '·',
      impactText:item.kind === 'stock' ? pct(item.impact) : '',
    })),
  }, { onStock:showCompanyReport });
}

function setNewsFilter(f) {
  S.newsFilter = f;
  renderNews();
}

// 오른쪽 패널의 '뉴스' 탭을 열고 그쪽으로 스크롤
function openNewsTab() {
  renderNews();
  INFO_MARKET_PANEL.activate('news', { scroll:true });
}

function renderLeaderboard() {
  const players = [
    { name: '🧑 나(You)', value: netWorthClean(), me: true },
    ...S.bots.map(b => ({ name: b.name, portrait:b.portrait, faction:b.faction, value: botNetWorth(b), profit: b.monthlyProfit || 0, jail: b.jailMonths || 0, crime: b.criminalRecord || 0, bankrupt:!!b.bankrupt, stage:b.reactionStage||'stable', bot: b })),
  ].sort((a, b) => b.value - a.value);
  const viewPlayers = players.map((p, i) => {
    const medal = ['🥇', '🥈', '🥉', '4️⃣'][i] || (i + 1);
    const plRate = (p.value - CFG.START_CAPITAL) / CFG.START_CAPITAL;
    let tail = '';
    if (!p.me) {
      const stageLabel=({stable:'평온',wary:'경계',defensive:'방어',desperate:'절박',collapse:'붕괴 직전',bankrupt:'파산·해산'})[p.stage]||p.stage;
      const flags = (p.bankrupt ? ' <span class="down">☠️ 파산·해산</span>' : ` <span class="muted">반응 ${stageLabel}</span>`) + (p.jail > 0 ? ` <span class="down">⛓️수감 ${p.jail}개월</span>` : '') + (p.crime > 0 ? ` <span class="muted">🚨전과 ${p.crime}</span>` : '');
      tail = ` <span class="${p.profit >= 0 ? 'up' : 'down'}">전월 ${p.profit >= 0 ? '+' : ''}${won(p.profit)}</span>${flags} <span class="muted bot-toggle">▼ 보유</span>`;
    }
    return {
      medal, name:p.name, faction:p.faction,
      avatar:!p.me && p.portrait ? `<img class="leader-avatar" src="./assets/characters/${p.portrait}" alt="">` : '',
      valueText:won(p.value), rateText:pct(plRate), profitClass:plRate >= 0 ? 'up' : 'down',
      rowClass:p.me ? 'me' : `bot-row${p.bankrupt ? ' bankrupt' : ''}`,
      tail, detailHTML:p.me ? '' : botHoldingsHTML(p.bot),
    };
  });
  S._rank = players.findIndex(p => p.me) + 1;
  INFO_MARKET_PANEL.renderRanking({
    players:viewPlayers,
    feed:(S.rivalFeed || []).slice(0, 30).map(item => ({
      text:item.text,
      dateLabel:dateInfo(item.day).label,
      cls:/타격|손실|적발|수감|사고/.test(item.text) ? 'bad' : (/대박|횡재|막아냈|\+/.test(item.text) ? 'good' : 'neutral'),
    })),
  });
  renderBotNwChart();
}

// 봇이 지금 무엇을 들고 있는지 — 현금 + 보유 종목(평가액 순)
function botHoldingsHTML(bot) {
  if (!bot) return '';
  if (bot.bankrupt) return `<div class="bd-inner"><b class="down">☠️ ${bot.bankruptDay||S.day}개월차 파산·해산</b><div class="muted">${bot.bankruptcyReason||'영업과 투자 활동이 종료됐습니다.'}</div></div>`;
  const holds = Object.keys(bot.owned || {}).map(name => {
    const s = S.stocks.find(x => x.name === name);
    const price = s ? s.history[s.history.length - 1].c : 0;
    return { name, qty: bot.owned[name], val: bot.owned[name] * price, listed: !!(s && s.listed) };
  }).filter(h => h.qty > 0).sort((a, b) => b.val - a.val);
  const cashLine = `💵 현금 ${won(bot.capital)}`;
  const assets=(bot.assets||[]).map(a=>`<div class="bd-row"><span>${a.icon||'🏢'}${a.name}</span><span>${won(a.value||0)}</span></div>`).join('');
  const relation=`<div class="muted">🗣️ 나와의 관계 ${(bot.playerRelation||0)>=30?'동맹':(bot.playerRelation||0)<=-25?'적대':'중립'} · 방어 ${Math.round((bot.defense||0)*100)}% · 반응 ${bot.reactionStage||'stable'} · 압박 ${Math.round(bot.pressure||0)} · 신용 ${Math.round(bot.credibility==null?100:bot.credibility)}</div>`;
  if (!holds.length) return `<div class="bd-inner">${cashLine}${relation}${assets?`<div class="bd-title">🏙️ 보유 건물·사업</div>${assets}`:'<div class="muted">보유 종목·사업자산 없음</div>'}</div>`;
  const rows = holds.slice(0, 10).map(h =>
    `<div class="bd-row"><span>${h.listed ? '' : '🚫'}${h.name}</span><span>${h.qty.toLocaleString('ko-KR')}주 · ${won(h.val)}</span></div>`).join('');
  return `<div class="bd-inner">${cashLine}${relation}<div class="bd-title">📦 보유 종목 ${holds.length}개</div>${rows}${assets?`<div class="bd-title">🏙️ 보유 건물·사업</div>${assets}`:''}</div>`;
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

// 지금 화면에 맞는 트랙을 고른다.
// 관계 그룹은 같은 연애곡을 돌려쓰지 않고 각자의 중심 정서를 가진다.
function relationshipBGM(text) {
  const copy = String(text || '');
  if (/사업 4인조|특별 책임자|박지수|한이슬|차서윤|오혜린/.test(copy)) return 'group_business';
  if (/자유인 3인조|게임 길드|막차요정|무보정|쉼표|채원|유나|소희/.test(copy)) return 'group_freedom';
  if (/소꿉친구|졸업앨범|끝나지 않은 졸업식|예린|보라|서연|나영|미래\s*·|미래와|미래의/.test(copy)) return 'group_childhood';
  if (/위험한 3인조|결핍 공생|강유진|한채린|윤세라/.test(copy)) return 'group_dangerous';
  if (/나래|투자교육|투자 컨설팅/.test(copy)) return 'narae';
  return null;
}
function bgmScene() {
  const dateHost = $('date-host'), eventHost = $('life-event');
  const dateOpen = dateHost && dateHost.style.display === 'block';
  const lifeEventOpen = eventHost && eventHost.style.display === 'block';
  const visibleText = `${dateOpen ? dateHost.textContent || '' : ''} ${lifeEventOpen ? eventHost.textContent || '' : ''}`;
  const relationshipTrack = relationshipBGM(visibleText);
  if (relationshipTrack) return relationshipTrack;
  if (dateOpen) return 'dreamy';
  if (S.breaking) return 'news';
  if (!S.life || !S.life.started) return 'title';
  if (lifeEventOpen) {
    const eventText = eventHost.textContent || '';
    if (/위험|공격|습격|파산|감금|추심|경찰|법정/.test(eventText)) return 'market_bear';
    if (/연애|데이트|고백|결혼|가족|친구|추억/.test(eventText)) return 'dreamy';
  }
  if (S.phase !== 'open') {
    const closedRotation = ['market_normal', 'dreamy', 'title'];
    return closedRotation[Math.abs((S.day || 1) - 1) % closedRotation.length];
  }

  const trend = S.bgmMarketTrend || 0;
  if (trend >= 0.007) return 'market_bull';
  if (trend <= -0.007) return 'market_bear';
  return 'market_normal';
}
function bgmCharacter() {
  const eventHost = $('life-event');
  const dateHost = $('date-host');
  const eventText = eventHost && eventHost.style.display === 'block' ? eventHost.textContent || '' : '';
  const dateText = dateHost && dateHost.style.display === 'block' ? dateHost.textContent || '' : '';
  const visibleText = `${eventText} ${dateText}`;
  if (visibleText.includes('윤세라')) return 'sera';
  if (visibleText.includes('한채린')) return 'chaerin';
  if (visibleText.includes('강유진')) return 'yujin';
  if (visibleText.includes('나래')) return 'narae';
  return null;
}
function syncBGM(force) {
  if (!BGM || !S.bgmOn) return;
  if (!force && Date.now() < bgmStingUntil) return;
  const scene = bgmScene();
  const character = bgmCharacter();
  if (character && BGM.playCharacter) BGM.playCharacter(character, scene, !!force);
  else BGM.play(scene, !!force);
}
function renderBGMStatus() {
  const btn = $('bgm-toggle');
  if (!btn || !BGM) return;
  const engine = BGM.engine ? BGM.engine() : 'webaudio';
  const state = BGM.state ? BGM.state() : 'unknown';
  const playback = BGM.debug ? BGM.debug() : null;
  btn.dataset.engine = engine;
  btn.dataset.audioState = state;
  btn.dataset.track = playback && playback.playing || BGM.current && BGM.current() || '';
  btn.dataset.loopActive = playback && playback.timerActive ? 'true' : 'false';
  btn.title = S.bgmOn
    ? `배경음악 켜짐 · ${engine === 'sam+tone' ? 'SAM 보컬 + Tone.js' : 'WebAudio 호환 모드'} · ${state}${playback&&playback.playing?` · ${playback.playing}`:''}`
    : '배경음악 켜기';
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
async function toggleBGM(on) {
  if (!BGM) return;
  S.bgmOn = on == null ? !S.bgmOn : !!on;
  if (!S.bgmOn) {
    BGM.setEnabled(false);
  } else {
    // 잠금을 먼저 풀고 한 번만 시작한다. setEnabled(true)와 syncBGM()이 동시에
    // 재생을 예약하면 모바일에서 트랙이 두 번 초기화되며 무음으로 굳을 수 있다.
    const unlocked = !BGM.unlock || await BGM.unlock();
    if (!unlocked) {
      S.bgmOn = false;
      BGM.setEnabled(false);
      flashToast('모바일 브라우저가 음악 재생을 막았습니다. 음악 버튼을 다시 눌러주세요.', 'bad');
    } else {
      BGM.setEnabled(true);
      syncBGM(true);
      setTimeout(renderBGMStatus, 450);
    }
  }
  const btn = $('bgm-toggle');
  if (btn) { btn.textContent = S.bgmOn ? '🎵 음악 ON' : '🎵 음악 OFF'; btn.classList.toggle('on', S.bgmOn); }
  renderBGMStatus();
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
  BGM.setEnabled(false);
  const btn = $('bgm-toggle');
  if (btn) { btn.textContent = '🎵 음악 ON'; btn.classList.add('on'); }
  let armed = true;
  const disarm = () => {
    if (!armed) return false;
    armed = false;
    document.removeEventListener('pointerdown', arm);
    document.removeEventListener('touchend', arm);
    document.removeEventListener('keydown', arm);
    return true;
  };
  const arm = () => {
    if (!disarm()) return;
    // 클릭/터치의 기본 동작과 게임 버튼 click이 먼저 끝나게 한다.
    setTimeout(async () => {
      const unlocked = !BGM.unlock || await BGM.unlock();
      if (unlocked) {
        BGM.setEnabled(true);
        syncBGM(true);
      }
      else {
        S.bgmOn = false;
        BGM.setEnabled(false);
        const failedBtn = $('bgm-toggle');
        if (failedBtn) { failedBtn.textContent = '🎵 음악 OFF'; failedBtn.classList.remove('on'); }
      }
      setTimeout(renderBGMStatus, 450);
    }, 0);
  };
  if (window.PointerEvent) document.addEventListener('pointerdown', arm, { passive:true });
  else document.addEventListener('touchend', arm, { passive:true });
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
  const list = allAchievements();
  const cnt = Object.keys(S.unlocked).length;
  INFO_MARKET_PANEL.renderAchievements(list.map(item => ({
    icon:item.icon, name:item.name, desc:item.desc, done:!!S.unlocked[item.id],
  })), `${cnt}/${list.length}`);
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
    localStorage.setItem(LS_KEY, JSON.stringify(SAVE.createSnapshot(S)));
  } catch (e) { /* 용량 초과 등 무시 */ }
}

function loadSave() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const d = SAVE.normalizeSnapshot(JSON.parse(raw));
    S.capital = d.capital; S.owned = migrateOwnedNames(d.owned); S.day = d.day || 1; S.tick = d.tick || 0;
    S.selected = d.selected; S.speed = d.speed; S.chartMode = d.chartMode;
    S.news = d.news; S.newsSeq = d.newsSeq;
    S.trades = d.trades || 0; S.realizedPnL = d.realizedPnL || 0; S.shortsClosed = d.shortsClosed || 0;
    S.maxNetWorth = d.maxNetWorth || CFG.START_CAPITAL; S.watchlist = d.watchlist || {};
    S.loan = d.loan || 0; S.leverage = d.leverage || 1;
    S.usedLeverage = !!d.usedLeverage; S.marginCalled = !!d.marginCalled;
    S.phase = d.phase;
    S.paused = d.paused;
    S.sessionTick = d.sessionTick;
    S.sessionNews = d.sessionNews;
    S.dayStartNW = d.dayStartNW;
    S.dayStartCapital = d.dayStartCapital;
    S.dayStartRealizedPnL = d.dayStartRealizedPnL;
    S.monthCloseContext = MONTH_CLOSE_FLOW.normalize(d.monthCloseContext);
    S.circuitBreakerTicks = d.circuitBreakerTicks;
    S.circuitBreakerTriggered = d.circuitBreakerTriggered;
    S.marketSessionReturn = d.marketSessionReturn;
    S.viNewsCount = d.viNewsCount;
    S.marketEvent = d.marketEvent || null;
    S.breaking = d.breaking ? Object.assign({}, d.breaking, { timer:null }) : null;
    S._importantEvents = d.importantEvents;
    S._factionTradeCall = d.intraSession.factionTradeCall;
    S._raidTarget = d.intraSession.raidTarget;
    S._obsessionIntrudedDay = d.intraSession.obsessionIntrudedDay;
    S.awaitingNextDay = !!d.awaitingNextDay;   // 저장 시점이 마감 후였다면 개장 버튼이 다음달로
    S.pendingOrders = Array.isArray(d.pendingOrders) ? d.pendingOrders : [];
    S.limitOrders = Array.isArray(d.limitOrders) ? d.limitOrders : [];
    S.companyNews = Array.isArray(d.companyNews) ? d.companyNews : [];
    S.life = Object.assign(newLife(), d.life || {});
    S.economy = ECONOMY.ensure(d.economy);
    LOAN.ensure(S.life); HEALTH.ensure(S.life); FAMILY.ensure(S.life);
    CAREER.ensure(S.life); HOUSING.ensure(S.life); LIFE_FINANCE.ensure(S.life);
    if (BUSINESS) BUSINESS.ensure(S.life);
    CHILD_EVENTS.ensure(S.life); SOCIAL.ensure(S.life); JUSTICE.ensure(S.life); LEGACY.ensure(S.life);
    if (APTITUDE) APTITUDE.ensure(S.life);
    if (typeof S.life.partner === 'string') S.life.partner = null;   // 구버전 세이브(문자열 상대) 호환
    migrateLifePeople(S.life);
    S.netWorthHist = d.netWorthHist && d.netWorthHist.length ? d.netWorthHist : [S.capital];
    (d.stocks || []).forEach(sv => {
      const savedName = (D.COMPANY_NAME_MIGRATIONS || {})[sv.name] || sv.name;
      const s = S.stocks.find(x => x.name === savedName);
      if (s && sv.history && sv.history.length) {
        s.history = sv.history;
        s.listed = sv.listed !== false;
        s.trend = Number.isFinite(sv.trend) ? sv.trend : s.trend;
        s.pendingIssue = sv.pendingIssue || null;
        s.issueCooldown = Number.isFinite(sv.issueCooldown) ? sv.issueCooldown : s.issueCooldown;
        s.volume = Number.isFinite(sv.volume) ? sv.volume : s.volume;
        s.delistCounter = Number.isFinite(sv.delistCounter) ? sv.delistCounter : s.delistCounter;
        s.sessionOpen = Number.isFinite(sv.sessionOpen) ? sv.sessionOpen : d.sessionOpen[savedName];
        s.viTicks = Number.isFinite(sv.viTicks) ? sv.viTicks : 0;
        s.viAnnouncedDay = sv.viAnnouncedDay == null ? null : sv.viAnnouncedDay;
        s.limitAnnouncedDay = sv.limitAnnouncedDay == null ? null : sv.limitAnnouncedDay;
        s.factionFlowTicks = Number.isFinite(sv.factionFlowTicks) ? sv.factionFlowTicks : 0;
        s.factionFlowRate = Number.isFinite(sv.factionFlowRate) ? sv.factionFlowRate : 0;
      }
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

/* URL 공유는 세이브 복원이 아니라 검증 가능한 읽기 전용 결과 카드다. */
function shareURL() {
  const partners=RELATIONSHIPS.names(S.life||{});
  const result = {
    day: S.day,
    netWorth: totalWealth(),
    realizedPnL: S.realizedPnL,
    maxNetWorth: S.maxNetWorth,
    partner: partners[0] || '',
    partners,
    children: S.life && Array.isArray(S.life.children) ? S.life.children.length : 0,
  };
  const url = location.origin + location.pathname + '#result=' + SAVE.encodeResult(result);
  navigator.clipboard.writeText(url).then(
    () => flashToast('🔗 읽기 전용 결과 링크가 복사되었습니다', 'good'),
    () => flashToast('클립보드 복사 실패', 'bad')
  );
}

function showSharedResult() {
  const result = SAVE.decodeResult(location.hash);
  if (!result) return false;
  const host = $('life-modal');
  if (!host) return false;
  const info = dateInfo(result.day);
  const returnRate = CFG.START_CAPITAL > 0 ? result.netWorth / CFG.START_CAPITAL - 1 : 0;
  host.style.display = 'flex';
  host.className = 'life-modal-host';
  host.innerHTML = `<div class="window event-window">
    <div class="title-bar"><div class="title-bar-text">🔗 QuickTrade 읽기 전용 결과</div>
      <div class="title-bar-controls"><button aria-label="Close" id="shared-result-x"></button></div></div>
    <div class="window-body">
      <div class="important-event-icon">📊</div>
      <h2>${info.label}의 투자 기록</h2>
      <div class="important-event-detail">
        총자산 <b>${won(result.netWorth)}원</b> · 시작 대비 <b class="${returnRate >= 0 ? 'up' : 'down'}">${pct(returnRate)}</b><br>
        실현손익 ${won(result.realizedPnL)}원 · 최고 투자 순자산 ${won(result.maxNetWorth)}원<br>
        ${result.partners&&result.partners.length ? `연인·배우자 ${RELATIONSHIPS.joinNames(result.partners)}` : '현재 공개된 연인·배우자 없음'} · 자녀 ${result.children}명
      </div>
      <p class="muted">이 링크는 저장 데이터를 덮어쓰지 않으며 결과만 보여 줍니다.</p>
      <button id="shared-result-close" class="session-btn opening">내 게임으로 돌아가기</button>
    </div>
  </div>`;
  const close = () => { history.replaceState(null, '', location.pathname + location.search); closeLifeModal(); };
  $('shared-result-x').addEventListener('click', close);
  $('shared-result-close').addEventListener('click', close);
  return true;
}

function restoreIntradayPopup() {
  if (S.phase !== 'open') return;
  if (S.breaking) {
    renderBreaking();
    return;
  }
  if (S._factionTradeCall) {
    showFactionTradeCall();
    return;
  }
  if (S._raidTarget != null) {
    const attacker = S.bots[S._raidTarget];
    if (!attacker) { S._raidTarget = null; return; }
    const faction = RIVALS.ensureFaction(S.life);
    const canRevenge = faction.level >= 1 && faction.members.length > 0;
    const cost = 500000 + faction.level * 250000;
    showHelpCard(
      { name:attacker.name, portrait:attacker.portrait },
      `⚔️ <b>${attacker.name}의 장중 공격 기록</b><br>공격 피해는 저장됐습니다. 아직 역공 여부를 선택할 수 있습니다.`,
      canRevenge ? doRaidRevenge : null,
      canRevenge ? `🔥 역공 (작전비 ${won(cost)})` : null,
    );
  }
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
  S._backgroundPaused = false;
  $('pause-btn').textContent = S.paused ? '▶ 재개' : '⏸ 일시정지';
  renderSessionProgress();
  flashToast(S.paused ? '⏸ 일시정지됨' : '▶ 재개', 'neutral');
}

function pauseForPageLeave() {
  if (S.phase !== 'open') return false;
  // 팝업 때문에 잠시 멈춘 상태도 백그라운드 잠금으로 승격한다.
  // 그래야 팝업 타이머가 닫히며 장을 다시 진행시키지 않는다.
  if (S.paused && !S._autoPaused) return false;
  S.paused = true;
  S._autoPaused = false;
  S._backgroundPaused = true;
  pauseUISync();
  return true;
}

function notifyPageReturn() {
  if (!S._backgroundPaused || S.phase !== 'open' || !S.paused) return;
  pauseUISync();
  flashToast('⏸ 다른 화면을 보는 동안 장을 멈췄습니다 · 재개 버튼을 눌러 계속하세요', 'neutral');
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
  if (!PAGE_LIFECYCLE || !PAGE_LIFECYCLE.mount({
    onLeave:pauseForPageLeave,
    onReturn:notifyPageReturn,
  })) throw new Error('페이지 이탈 시 자동 일시정지를 초기화할 수 없습니다.');
  if (!MARKET_WORKSPACE || !MARKET_WORKSPACE.mount({
    onStockFilterChange:renderStockList,
    onStockLayoutChange:renderStockList,
  }) || !MARKET_WORKSPACE.initOrderBook()) {
    throw new Error('종목 탐색기와 호가창 작업공간을 초기화할 수 없습니다.');
  }
  if (!INFO_MARKET_PANEL || !INFO_MARKET_PANEL.mount({
    onNewsFilter:setNewsFilter,
    onTabChange:renderInfoMarketTab,
    onLayoutChange:renderInfoMarketTab,
  })) throw new Error('내 정보 & 시장 패널을 초기화할 수 없습니다.');
  S.economy = ECONOMY.ensure(S.economy);
  buildStocks();
  buildBots();
  loadAchievements();
  const loaded = loadSave();
  if (!S.life) S.life = newLife();     // 새 게임
  applySeraLoopResidue();
  LOAN.ensure(S.life); HEALTH.ensure(S.life); FAMILY.ensure(S.life);
  if (BUSINESS) BUSINESS.ensure(S.life);
  if (BUSINESS_ROMANCE) BUSINESS_ROMANCE.ensure(S.life);
  if (NEWS_ANCHOR) NEWS_ANCHOR.mount();
  if (APTITUDE) APTITUDE.ensure(S.life);
  if (seraLoopActive()) ensureSeraLoopPartner();
  fillSectorFilter();
  wire();
  $('leverage-select').value = String(S.leverage);
  renderAchievements();
  renderAll();
  setSpeed(S.speed || 1);
  toggleChartBtn();
  restoreBGMPref();
  renderMarketPhase();
  if (S.phase === 'open') {
    S.paused = true;
    pauseUISync();
    restoreIntradayPopup();
  } else if (S.monthCloseContext && S.monthCloseContext.active) {
    renderCurrentMonthCloseStep();
  }
  if (!S.life.started) {
    startLifeSetup();
    flashToast('🎬 QuickTrade Life! 가정환경과 학창생활에서 인생을 시작하세요', 'neutral');
  } else if(S.life.originNarrativeVersion===2&&!S.life.tutorialSeen) {
    S.life.referralSeen?showTutorial():showOriginFriendReferral();
  } else if (loaded) {
    flashToast(S.phase === 'open'
      ? `💾 ${dateInfo(S.day).label} 장중 상태 복원 · 안전하게 일시정지됨`
      : S.monthCloseContext && S.monthCloseContext.active
        ? '💾 월말 진행 상태 복원 · 완료한 정산은 다시 실행되지 않습니다'
        : '💾 저장된 인생 불러옴 · 🔔 장 열림으로 다음 달 시작', 'good');
  } else {
    flashToast('🎮 🔔 장 열림 버튼으로 이번 달을 시작하세요', 'neutral');
  }
  showSharedResult();
}

window.addEventListener('load', boot);
})();
