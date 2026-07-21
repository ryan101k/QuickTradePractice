/* =========================================================================
 *  QuickTrade Pro — 애플리케이션 로직
 *  엔진(가격 시뮬레이션) + UI 렌더 + 트레이딩 + AI 라이벌 + 업적/저장
 * ========================================================================= */
(function () {
'use strict';

const D = window.QT_DATA;

/* ------------------------------------------------------------------ 설정 */
const CFG = {
  START_CAPITAL: 1000000,   // 시작 자본금
  TICK_MS: 3000,            // 기본 1배속 틱 간격(ms)
  DAILY_LIMIT: 0.30,        // 상한가/하한가 ±30%
  FEE_RATE: 0.00015,        // 매매 수수료 0.015%
  TAX_RATE: 0.0018,         // 매도 거래세 0.18%
  HISTORY_LEN: 60,          // 종목 히스토리 보관 길이
  TICKS_PER_DAY: 20,        // 몇 틱마다 하루(day) 증가
  DELIST_PRICE: 100,        // 이 가격 미만 지속 시 상장폐지 위험
  NEWS_MAX: 40,             // 뉴스 로그 최대 보관
  MARGIN_INTEREST: 0.004,   // 신용융자 일 이자 0.4%/day
  MAINT_MARGIN: 0.25,       // 유지증거금율 (자기자본/롱평가액) 미만 시 반대매매
  BREAKING_MIN: 0.12,       // 이 이상 |impact| 회사 이슈면 긴급속보 대상
  BREAKING_MS: 11000,       // 긴급속보 자동 닫힘(ms)
  BREAKING_INSESSION_PROB: 0.045, // 장중 속보 등장 확률(아주 가끔). 나머지 뉴스는 마감 리포트에서 몰아 봄
};

const CAP_META = {
  large: { label: '대형', sigma: 0.018, issueMul: 0.5, badge: '🏛️' },
  mid:   { label: '중형', sigma: 0.032, issueMul: 1.0, badge: '🏢' },
  small: { label: '소형', sigma: 0.055, issueMul: 1.5, badge: '🎲' },
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
  dayStartNW: CFG.START_CAPITAL, // 개장 시점 순자산(당월 손익 계산용)
  life: null,                 // 인생 상태(직업/행복/관계/부동산/대출) — boot 에서 초기화
};

/* 인생 모드 설정 */
const LIFE = {
  START_AGE: 25,              // 시작 나이
  HAPPY_DECAY: 2,            // 매달 자연 감소하는 행복
  PROP_APPRECIATE: [0.0, 0.02], // 매달 부동산 시세 상승률 범위
  LIFE_LOAN_INTEREST: 0.02,  // 개인 대출 월 이자 2%
  EVENT_PROB: 0.5,           // 장 마감 때 선택지 이벤트가 뜰 확률
};

function newLife() {
  return {
    started: false,          // 직업 선택 완료 여부
    job: 'none',             // 직업 id
    happy: 50,               // 행복도 0~100
    charm: 0,                // 매력(연애 진행도)
    relationship: 'single',  // single | dating | married
    partner: null,           // 상대 이름
    properties: [],          // [{id, name, emoji, value, rent}]
    loan: 0,                 // 개인 대출 잔액
    hobbiesDone: 0,
    dates: 0,
  };
}

/* ------------------------------------------------------------------ 유틸 */
const $ = id => document.getElementById(id);
const won = n => Math.round(n).toLocaleString('ko-KR');
const pct = n => (n >= 0 ? '+' : '') + (n * 100).toFixed(2) + '%';
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

function weightedPick(list) {
  const total = list.reduce((s, e) => s + (e.weight || 1), 0);
  let r = Math.random() * total;
  for (const e of list) { r -= (e.weight || 1); if (r <= 0) return e; }
  return list[list.length - 1];
}

/* ------------------------------------------------------------------ 초기화 */
function buildStocks() {
  S.stocks = D.COMPANY_MASTER.map(m => ({
    ...m,
    history: [{ o: m.price, h: m.price, l: m.price, c: m.price }],
    trend: rand(-0.004, 0.004),   // 완만한 개별 추세(드리프트)
    pendingIssue: null,
    volume: Math.floor(rand(1e5, 1e7)),
    delistCounter: 0,
    listed: true,
  }));
}

function buildBots() {
  const personas = [
    { name: '🤖 개미봇',      style: 'random' },   // 무작정 단타
    { name: '📊 퀀트김',      style: 'momentum' }, // 상승 추세 추종
    { name: '🐢 존버박',      style: 'value' },     // 저PBR 소형주 홀딩
  ];
  S.bots = personas.map(p => ({
    ...p,
    capital: CFG.START_CAPITAL,
    owned: {},
  }));
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

  S.stocks.forEach(stock => {
    if (!stock.listed) return;
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
    let changeRate = stock.trend + noise + issueImpact + marketImpact;

    // 4) 상한가/하한가 제한
    changeRate = clamp(changeRate, -CFG.DAILY_LIMIT, CFG.DAILY_LIMIT);

    // 5) 추세는 서서히 평균회귀 + 가끔 방향 전환
    stock.trend = stock.trend * 0.95 + rand(-0.002, 0.002);

    const prev = stock.history[stock.history.length - 1].c;
    let next = Math.max(1, Math.round(prev * (1 + changeRate)));

    // 6) OHLC 캔들 기록
    const o = prev;
    const c = next;
    const wig = Math.abs(changeRate) * prev * 0.4;
    const h = Math.round(Math.max(o, c) + rand(0, wig));
    const l = Math.round(Math.max(1, Math.min(o, c) - rand(0, wig)));
    stock.history.push({ o, h, l, c });
    if (stock.history.length > CFG.HISTORY_LEN) stock.history.shift();

    stock.volume = Math.floor(stock.volume * rand(0.6, 1.5));

    // 7) 급등/급락 알림
    if (changeRate >= 0.20) flashToast(`🚀 ${stock.name} 급등! ${pct(changeRate)}`, 'good');
    else if (changeRate <= -0.20) flashToast(`⚠️ ${stock.name} 급락! ${pct(changeRate)}`, 'bad');

    // 8) 상장폐지 카운트 (소형주 한정)
    if (stock.cap === 'small' && c < CFG.DELIST_PRICE) {
      stock.delistCounter++;
      if (stock.delistCounter >= 3) delist(stock);
    } else {
      stock.delistCounter = 0;
    }
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
  if (S.loan <= 0) return;
  const lv = longValue();
  const equity = netWorthClean();               // 이미 빚 차감된 자기자본
  // 자기자본이 롱평가액의 유지증거금율 미만이면 강제청산
  if (lv > 0 && equity < lv * CFG.MAINT_MARGIN) {
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

function pickExperts() {
  const names = [...D.EXPERTS].sort(() => Math.random() - 0.5).slice(0, 3);
  return names.map(name => {
    const bull = Math.random() < 0.5;                            // 전망은 순수 랜덤(엇갈림)
    const comment = bull ? pick(D.EXPERT_BULL) : pick(D.EXPERT_BEAR);
    return { name, bull, comment };
  });
}

function showBreaking(item, isAlert) {
  if (S.breaking && S.breaking.timer) clearTimeout(S.breaking.timer);
  const experts = pickExperts();
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
       <span class="ex-name">${e.name}</span>
       <span class="ex-view ${e.bull ? 'up' : 'down'}">${e.bull ? '📈 상승 전망' : '📉 하락 전망'}</span>
       <span class="ex-cmt">"${e.comment}"</span>
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
       </div>
     </div>`;
  const btn = $('breaking-close');
  if (btn) btn.addEventListener('click', closeBreaking);
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
  if (S.phase === 'open') {
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
  if (pauseBtn) pauseBtn.disabled = (S.phase !== 'open');
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
  const news = [...seen.values()].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)).slice(0, 15);
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
      if (!n.experts) n.experts = pickExperts();
      detail.innerHTML =
        `<div class="experts-title">🎙️ 전문가 긴급 진단 (제각각입니다, 참고만!)</div>
         <ul class="clean-list experts">` +
        n.experts.map(e =>
          `<li class="expert">
             <span class="ex-name">${e.name}</span>
             <span class="ex-view ${e.bull ? 'up' : 'down'}">${e.bull ? '📈 상승 전망' : '📉 하락 전망'}</span>
             <span class="ex-cmt">"${e.comment}"</span>
           </li>`).join('') + '</ul>';
      detail.classList.add('open');
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
  const info = dateInfo(S.day);
  const b = { salary: 0, rent: 0, lifeInterest: 0, partner: 0, incident: null, breakup: false };
  const job = jobOf();

  // 1) 월급 (사업가/유튜버는 변동 · 적자 가능)
  b.salary = job.variable ? Math.round(rand(job.variable[0], job.variable[1])) : job.salary;
  S.capital += b.salary;

  // 2) 부동산 월세 + 시세 상승
  L.properties.forEach(p => {
    b.rent += p.rent;
    p.value = Math.round(p.value * (1 + rand(LIFE.PROP_APPRECIATE[0], LIFE.PROP_APPRECIATE[1])));
  });
  if (b.rent > 0) S.capital += b.rent;

  // 3) 개인 대출 이자
  if (L.loan > 0) { b.lifeInterest = Math.round(L.loan * LIFE.LIFE_LOAN_INTEREST); L.loan += b.lifeInterest; }

  // 4) 직업 리스크 사고 → 빚 발생 (고소득일수록 위험이 큼)
  if (job.risk && job.incidents && job.incidents.length && Math.random() < job.risk) {
    const inc = pick(job.incidents);
    const cost = Math.round(rand(inc.cost[0], inc.cost[1]));
    L.loan += cost;
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
    S.capital += b.partner;
    L.happy = clamp(L.happy + (per.happy || 0), 0, 100);
    if (b.partner) addNews(`💑 ${nm}(${per.name}) 가계 ${b.partner >= 0 ? '기여 +' : ''}${won(b.partner)}원`, b.partner >= 0 ? 'good' : 'bad');
    // 자유로운(바람둥이) 성격은 연애 중 이별 위험
    if (!married && per.breakup && Math.random() < per.breakup) {
      addNews(`💔 ${nm}님과 이별했습니다...`, 'bad');
      flashToast(`💔 ${nm}님과 이별...`, 'bad');
      L.relationship = 'single'; L.charm = Math.floor(L.charm * 0.5);
      L.happy = clamp(L.happy - 15, 0, 100); L.partner = null; b.breakup = true;
    }
  }

  // 6) 행복 자연 감소
  L.happy = clamp(L.happy - LIFE.HAPPY_DECAY, 0, 100);

  if (info.month === 1 && S.day > 1) addNews(`🎂 생일! 만 ${info.age}세가 되었습니다`, 'good');
  if (b.salary > 0) addNews(`💼 월급 ${won(b.salary)}원 입금 (${job.name})`, 'good');
  else if (b.salary < 0) addNews(`📉 ${job.name} 적자 ${won(b.salary)}원`, 'bad');
  if (b.rent > 0) addNews(`🏠 월세 수입 ${won(b.rent)}원`, 'good');
  if (b.lifeInterest > 0) addNews(`💳 개인 대출이자 ${won(b.lifeInterest)}원 (빚 ${won(L.loan)})`, 'bad');
  if (b.incident) { addNews(`🚑 [${job.name}] ${b.incident.text} — 빚 ${won(b.incident.cost)}원 발생`, 'bad'); flashToast(`🚑 사고! ${b.incident.text}`, 'bad'); playSound('crash'); }
  S._settle = b;
}

/* ---- 직업 선택 모달 ---- */
function showJobModal(isChange) {
  const host = $('life-modal'); if (!host) return;
  const rows = D.JOBS.map(j =>
    `<li class="job-row" data-id="${j.id}">
       <span class="job-emoji">${j.emoji}</span>
       <span class="job-main"><strong>${j.name}</strong> <span class="risk-tag">${jobRiskTier(j).icon}${jobRiskTier(j).label}</span><br><span class="muted">${j.desc}</span></span>
       <span class="job-sal">${jobIncomeLabel(j)}</span>
     </li>`).join('');
  host.style.display = 'block';
  host.innerHTML =
    `<div class="window life-window">
       <div class="title-bar life-bar"><div class="title-bar-text">${isChange ? '💼 이직하기' : '🎬 인생 시작 — 직업을 선택하세요'}</div>
         ${isChange ? '<div class="title-bar-controls"><button aria-label="Close" id="job-x"></button></div>' : ''}</div>
       <div class="window-body">
         <p class="life-intro">${isChange ? '새 직업을 고르면 다음 달부터 월급이 바뀝니다.' : '만 25세, 시드 100만원으로 인생 시작! 직업을 골라 매달 월급을 받으세요.'}</p>
         <ul class="clean-list job-list">${rows}</ul>
       </div>
     </div>`;
  host.querySelectorAll('.job-row').forEach(li => li.addEventListener('click', () => chooseJob(li.dataset.id)));
  const x = $('job-x'); if (x) x.addEventListener('click', closeLifeModal);
}
function closeLifeModal() { const h = $('life-modal'); if (h) { h.style.display = 'none'; h.innerHTML = ''; } }

/* ---- 선택지 이벤트 (직업/연애/빚/일상) ---- */
const EVENT_CAT = { job: '직업', love: '연애', debt: '빚', life: '일상' };
function resolveAmt(v) { return Array.isArray(v) ? Math.round(rand(v[0], v[1])) : v; }

function maybeLifeEvent() {
  if (!D.LIFE_EVENTS || Math.random() > LIFE.EVENT_PROB) return;
  const L = S.life;
  const ctx = { job: L.job, loan: L.loan, rel: L.relationship, happy: L.happy, charm: L.charm };
  const pool = D.LIFE_EVENTS.filter(e => !e.cond || e.cond(ctx));
  if (pool.length) showLifeEvent(pick(pool));
}

function showLifeEvent(ev) {
  const host = $('life-event'); if (!host) return;
  S._curEvent = ev;
  host.style.display = 'block';
  host.innerHTML =
    `<div class="window event-window">
       <div class="title-bar event-bar"><div class="title-bar-text">❗ 사건 발생 · ${EVENT_CAT[ev.cat] || ''}</div></div>
       <div class="window-body">
         <div class="event-title">${ev.emoji} ${ev.title}</div>
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
  if (eff.debt != null) { const v = resolveAmt(eff.debt); L.loan = Math.max(0, L.loan + v); if (v) changes.push(`빚 <b class="${v >= 0 ? 'down' : 'up'}">${v >= 0 ? '+' : ''}${won(v)}</b>`); }
  if (eff.happy != null) { L.happy = clamp(L.happy + eff.happy, 0, 100); changes.push(`행복 ${eff.happy >= 0 ? '+' : ''}${eff.happy}`); }
  if (eff.charm != null) { L.charm = Math.max(0, L.charm + eff.charm); changes.push(`매력 ${eff.charm >= 0 ? '+' : ''}${eff.charm}`); }
  if (eff.endRelationshipChance && L.relationship !== 'single' && Math.random() < eff.endRelationshipChance) {
    const nm = L.partner ? L.partner.name : '연인';
    L.relationship = 'single'; L.partner = null; L.charm = Math.floor(L.charm * 0.5); L.happy = clamp(L.happy - 10, 0, 100);
    changes.push(`💔 <b class="down">${nm}와 이별</b>`);
  }
  return changes;
}

function resolveEvent(i) {
  const ev = S._curEvent; if (!ev) return;
  const opt = ev.options[i];
  const changes = applyEventEffects(opt.effects || {});
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
  flashToast(`${h.emoji} ${h.name}! 행복 +${h.happy}${h.charm ? ` 매력 +${h.charm}` : ''}`, 'good');
  checkRelationship(); afterLifeAction();
}

function doDate() {
  const R = D.RELATIONSHIP;
  if (S.life.relationship === 'married') { flashToast('💍 이미 결혼했어요!', 'neutral'); return; }
  if (S.capital < R.DATE_COST) { flashToast('💸 데이트할 현금이 부족합니다', 'bad'); playSound('error'); return; }
  S.capital -= R.DATE_COST;
  let gain = Math.round(rand(R.DATE_CHARM[0], R.DATE_CHARM[1]));
  const per = S.life.partner ? D.PERSONALITIES[S.life.partner.personality] : null;
  if (per) gain = Math.max(1, gain + (per.charm || 0));   // 상대 성격이 매력 획득에 영향
  S.life.charm += gain;
  S.life.happy = clamp(S.life.happy + R.DATE_HAPPY + (per ? (per.happy || 0) : 0), 0, 100);
  S.life.dates++;
  flashToast(`💘 데이트! 매력 +${gain}`, 'good');
  checkRelationship(); afterLifeAction();
}

function checkRelationship() {
  const L = S.life, R = D.RELATIONSHIP;
  if (L.relationship === 'single' && L.charm >= R.DATING_AT) {
    L.relationship = 'dating';
    L.partner = Object.assign({}, pick(D.CHARACTERS));   // 상대 캐릭터(직업·성격) 배정
    L.happy = clamp(L.happy + 15, 0, 100);
    const per = D.PERSONALITIES[L.partner.personality] || {};
    addNews(`💕 ${L.partner.name}(${L.partner.job}·${per.name})님과 연애 시작!`, 'good');
    flashToast(`💕 ${L.partner.name}님과 연애 시작!`, 'good');
    celebrate(); playSound('buy');
  }
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

function takeLoan(amt) {
  amt = Math.floor(amt); if (amt < 1) return;
  S.life.loan += amt; S.capital += amt;
  addNews(`💳 개인 대출 ${won(amt)}원 (빚 ${won(S.life.loan)})`, 'bad');
  flashToast(`💳 ${won(amt)}원 대출 실행`, 'neutral');
  afterLifeAction();
}

function repayLoan() {
  const L = S.life;
  if (L.loan <= 0) { flashToast('갚을 빚이 없습니다', 'neutral'); return; }
  const pay = Math.min(L.loan, S.capital);
  if (pay <= 0) { flashToast('💸 갚을 현금이 없습니다', 'bad'); return; }
  L.loan -= pay; S.capital -= pay;
  flashToast(`💳 ${won(pay)}원 상환 (남은 빚 ${won(L.loan)})`, 'good');
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
    partnerRow = `<div class="life-stat"><span>상대</span><strong>${L.partner.emoji || '❤️'} ${L.partner.name} · ${L.partner.job} · ${per.emoji || ''}${per.name || ''}</strong></div>`;
  }
  el.innerHTML =
    `<div class="life-stat"><span>나이/시점</span><strong>${info.label}</strong></div>
     <div class="life-stat"><span>직업</span><strong>${job.emoji} ${job.name} <span class="risk-tag">${risk.icon}${risk.label}</span></strong></div>
     <div class="life-stat"><span>월 수입</span><strong>${jobIncomeLabel(job)}</strong></div>
     <div class="life-stat"><span>행복도</span><strong>${hearts} ${Math.round(L.happy)}/100</strong></div>
     <div class="life-stat"><span>관계</span><strong>${relLabel}</strong></div>
     ${partnerRow}
     <div class="life-stat"><span>매력</span><strong>${Math.floor(L.charm)} <span class="muted">${charmHint}</span></strong></div>
     <div class="life-stat"><span>부동산</span><strong>${L.properties.length}채 · ${won(propVal)}원</strong></div>
     <div class="life-stat"><span>개인 대출</span><strong class="${L.loan > 0 ? 'down' : ''}">${won(L.loan)}원</strong></div>
     <div class="life-stat total"><span>총 재산</span><strong>${won(totalWealth())}원</strong></div>
     ${L.properties.length ? '<div class="life-props">' + L.properties.map(p => `${p.emoji}${p.name}`).join(' · ') + '</div>' : ''}`;
}

/* ---- 마감 리포트에 들어갈 '이번 달 행동' 허브 ---- */
function lifeHubHTML() {
  const L = S.life, R = D.RELATIONSHIP;
  const hobbyBtns = D.HOBBIES.map(h => `<button class="life-btn" data-act="hobby" data-id="${h.id}">${h.emoji} ${h.name} <small>${won(h.cost)}</small></button>`).join('');
  const propBtns = D.PROPERTIES.map(p => `<button class="life-btn" data-act="prop" data-id="${p.id}">${p.emoji} ${p.name} <small>${won(p.price)}</small></button>`).join('');
  const loanBtns = D.LOAN_OPTIONS.map(a => `<button class="life-btn" data-act="loan" data-amt="${a}">💳 +${won(a)}</button>`).join('');
  const canMarry = L.relationship === 'dating' && L.charm >= R.MARRY_AT;
  const perName = L.partner ? (D.PERSONALITIES[L.partner.personality] || {}).name : '';
  const partnerTag = L.partner ? `<span class="muted">${L.partner.emoji || ''}${L.partner.name}·${L.partner.job}·${perName} · </span>` : '';
  const relBtns = L.relationship === 'married'
    ? `<span class="muted">💍 ${L.partner.name}님과 결혼 생활 중</span>`
    : partnerTag + `<button class="life-btn" data-act="date">💘 데이트 <small>${won(R.DATE_COST)}</small></button>` +
      (canMarry ? `<button class="life-btn hot" data-act="marry">💍 결혼하기 <small>${won(R.WEDDING_COST)}</small></button>` : '');
  return `
    <div class="life-hub">
      <div class="hub-title">🎬 이번 달 인생 행동 <span class="muted">(현금 결제 · 여러 번 가능)</span></div>
      <div class="hub-group"><span class="hub-label">🎨 취미</span><div class="hub-btns">${hobbyBtns}</div></div>
      <div class="hub-group"><span class="hub-label">💘 연애</span><div class="hub-btns">${relBtns}</div></div>
      <div class="hub-group"><span class="hub-label">🏠 부동산</span><div class="hub-btns">${propBtns}</div></div>
      <div class="hub-group"><span class="hub-label">💳 금융</span><div class="hub-btns">${loanBtns}<button class="life-btn" data-act="repay">상환${L.loan > 0 ? ' ' + won(L.loan) : ''}</button><button class="life-btn" data-act="changejob">💼 이직</button></div></div>
    </div>`;
}

function wireLifeHub(host) {
  host.querySelectorAll('.life-btn').forEach(b => b.addEventListener('click', () => {
    const act = b.dataset.act;
    if (act === 'hobby') doHobby(b.dataset.id);
    else if (act === 'prop') buyProperty(b.dataset.id);
    else if (act === 'loan') takeLoan(+b.dataset.amt);
    else if (act === 'repay') repayLoan();
    else if (act === 'date') doDate();
    else if (act === 'marry') doMarriage();
    else if (act === 'changejob') showJobModal(true);
  }));
}

/* ------------------------------------------------------------------ AI 라이벌 */
function runBots() {
  const live = S.stocks.filter(s => s.listed);
  S.bots.forEach(bot => {
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
      const qty = Math.max(1, Math.floor((bot.capital * rand(0.1, 0.3)) / price));
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
  const s = S.stocks.find(x => x.name === name);
  return s && s.listed ? s.history[s.history.length - 1].c : 0;
}

/* 순자산 = 현금 + 롱 평가액 + 숏 미실현손익 − 신용융자(빚)
   (공매도 진입 시 매도대금이 이미 S.capital 에 유입돼 있으므로,
    숏은 진입가 대비 미실현손익 (avg-price)*|qty| 만 더한다) */
function netWorthClean() {
  let v = S.capital;
  Object.keys(S.owned).forEach(name => {
    const pos = S.owned[name];
    const p = priceOf(name);
    if (pos.qty >= 0) v += pos.qty * p;                    // 롱 평가액
    else v += (pos.avg - p) * Math.abs(pos.qty);           // 숏 미실현손익(담보금은 capital에 이미 포함)
  });
  return v - S.loan;
}

// 롱 포지션 총 평가액
function longValue() {
  let v = 0;
  Object.keys(S.owned).forEach(name => {
    const pos = S.owned[name];
    if (pos.qty > 0) v += pos.qty * priceOf(name);
  });
  return v;
}

// 신용 매수여력 = 현금 × 배율 − 현재 빚
function buyingPower() {
  return Math.max(0, S.capital * S.leverage - S.loan);
}

/* ------------------------------------------------------------------ 트레이딩 */
function curStock() { return S.stocks.filter(s => s.listed)[S.selected] || S.stocks.filter(s => s.listed)[0]; }

function buy(qty) {
  if (S.phase !== 'open') { flashToast('🔒 장 마감 상태입니다. 먼저 개장하세요', 'bad'); return; }
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
  if (S.phase !== 'open') { flashToast('🔒 장 마감 상태입니다. 먼저 개장하세요', 'bad'); return; }
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
    li.innerHTML =
      `<span class="star" data-name="${stock.name}">${star}</span>` +
      `<span class="tag" style="background:${sec.color}">${sec.name}</span>` +
      `<strong>${stock.name}</strong> ` +
      `<span class="cap-badge">${CAP_META[stock.cap].badge}</span>` +
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
  $('sel-name').textContent = stock.name;
  $('sel-price').textContent = won(price) + '원';
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

function autoSave() {
  try {
    const data = {
      capital: S.capital, owned: S.owned, day: S.day, tick: S.tick,
      trades: S.trades, realizedPnL: S.realizedPnL, shortsClosed: S.shortsClosed,
      maxNetWorth: S.maxNetWorth, watchlist: S.watchlist,
      loan: S.loan, leverage: S.leverage, usedLeverage: S.usedLeverage, marginCalled: S.marginCalled,
      awaitingNextDay: S.awaitingNextDay, life: S.life,
      stocks: S.stocks.map(s => ({ name: s.name, history: s.history.slice(-20), listed: s.listed, trend: s.trend })),
      netWorthHist: S.netWorthHist.slice(-60),
      bots: S.bots.map(b => ({ name: b.name, capital: b.capital, owned: b.owned })),
    };
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch (e) { /* 용량 초과 등 무시 */ }
}

function loadSave() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    S.capital = d.capital; S.owned = d.owned || {}; S.day = d.day || 1; S.tick = d.tick || 0;
    S.trades = d.trades || 0; S.realizedPnL = d.realizedPnL || 0; S.shortsClosed = d.shortsClosed || 0;
    S.maxNetWorth = d.maxNetWorth || CFG.START_CAPITAL; S.watchlist = d.watchlist || {};
    S.loan = d.loan || 0; S.leverage = d.leverage || 1;
    S.usedLeverage = !!d.usedLeverage; S.marginCalled = !!d.marginCalled;
    S.awaitingNextDay = !!d.awaitingNextDay;   // 저장 시점이 마감 후였다면 개장 버튼이 다음달로
    S.life = Object.assign(newLife(), d.life || {});
    if (typeof S.life.partner === 'string') S.life.partner = null;   // 구버전 세이브(문자열 상대) 호환
    S.netWorthHist = d.netWorthHist && d.netWorthHist.length ? d.netWorthHist : [S.capital];
    (d.stocks || []).forEach(sv => {
      const s = S.stocks.find(x => x.name === sv.name);
      if (s && sv.history && sv.history.length) { s.history = sv.history; s.listed = sv.listed !== false; s.trend = sv.trend || s.trend; }
    });
    if (d.bots) d.bots.forEach((bv, i) => { if (S.bots[i]) { S.bots[i].capital = bv.capital; S.bots[i].owned = bv.owned || {}; } });
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
  $('qty-buy').addEventListener('input', updateCost);
  $('qty-sell').addEventListener('input', updateCost);
  $('pause-btn').addEventListener('click', togglePause);
  $('session-btn').addEventListener('click', () => { S.phase === 'open' ? closeMarket() : openMarket(); });
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
  buildStocks();
  buildBots();
  loadAchievements();
  const loaded = loadSave();
  if (!S.life) S.life = newLife();     // 새 게임
  fillSectorFilter();
  wire();
  $('leverage-select').value = String(S.leverage);
  renderAchievements();
  renderAll();
  setSpeed(1);
  toggleChartBtn();
  renderMarketPhase();
  if (!S.life.started) {
    showJobModal(false);               // 인생 시작 — 직업 선택부터
    flashToast('🎬 QuickTrade Life! 직업을 선택하고 인생을 시작하세요', 'neutral');
  } else if (loaded) {
    flashToast('💾 저장된 인생 불러옴 · 🔔 장 열림으로 이번 달 시작', 'good');
  } else {
    flashToast('🎮 🔔 장 열림 버튼으로 이번 달을 시작하세요', 'neutral');
  }
}

window.addEventListener('load', boot);
})();
