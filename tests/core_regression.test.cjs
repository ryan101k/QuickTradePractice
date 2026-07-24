const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

(async () => {
const root = path.resolve(__dirname, '..');
const context = { console, QT_DATA:{ WORLD_MALE_NPCS:[] } };
context.window = context;
vm.createContext(context);

{
  const bgmDocumentListeners = {};
  const bgmWindowListeners = {};
  let mobileAudio;
  class MobileAudioContext {
    constructor() {
      this.state = 'suspended';
      this.destination = {};
      this.resumeCalls = 0;
      this.currentTime = 0;
      mobileAudio = this;
    }
    createGain() {
      return { gain:{ value:0 }, connect(){} };
    }
    createDynamicsCompressor() {
      return {
        threshold:{ value:0 }, knee:{ value:0 }, ratio:{ value:0 },
        attack:{ value:0 }, release:{ value:0 }, connect(){},
      };
    }
    async resume() {
      this.resumeCalls++;
      this.state = 'running';
    }
  }
  const bgmContext = {
    console,
    AudioContext:MobileAudioContext,
    setInterval,
    clearInterval,
    setTimeout,
    document:{
      visibilityState:'visible',
      addEventListener(type, listener) { bgmDocumentListeners[type] = listener; },
    },
    addEventListener(type, listener) { bgmWindowListeners[type] = listener; },
  };
  bgmContext.window = bgmContext;
  vm.createContext(bgmContext);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/bgm.js'), 'utf8'), bgmContext, { filename:'js/bgm.js' });
  assert.equal(bgmContext.QT_BGM.engine(), 'webaudio', 'Tone/SAM이 없어도 WebAudio 폴백을 제공해야 한다');
  assert.equal(await bgmContext.QT_BGM.unlock(), true, '모바일 사용자 동작에서 AudioContext를 명시적으로 재개해야 한다');
  assert.equal(bgmContext.QT_BGM.state(), 'running');
  assert.equal(typeof bgmContext.QT_BGM.playCharacter, 'function', '캐릭터 전용 보컬 선택 API를 제공해야 한다');
  assert.ok(bgmContext.QT_BGM.characterVoices.includes('sera'), '윤세라 보컬 프리셋이 등록돼야 한다');
  assert.ok(bgmContext.QT_BGM.characterVoices.includes('narae'), '나래 보컬 프리셋이 등록돼야 한다');
  bgmContext.QT_BGM.setEnabled(true);
  assert.equal(bgmContext.QT_BGM.play('market_normal', true), true);
  mobileAudio.state = 'suspended';
  const resumeCalls = mobileAudio.resumeCalls;
  bgmDocumentListeners.pointerdown();
  bgmDocumentListeners.pointerdown();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(mobileAudio.resumeCalls, resumeCalls + 1, '동시에 들어온 모바일 복구 요청은 하나로 합쳐야 한다');
  assert.equal(bgmContext.QT_BGM.current(), 'market_normal', '잠금 복구 뒤에도 최신 트랙 요청을 유지해야 한다');
  bgmContext.QT_BGM.stop();
  bgmContext.QT_BGM.setEnabled(false);
}

for (const file of [
  'js/core/trading.js',
  'js/core/time.js',
  'js/core/campaign.js',
  'js/relationship_group.js',
  'js/family.js',
  'js/health.js',
  'js/business.js',
  'js/business_romance.js',
  'js/freedom_trio.js',
  'js/services/save.js',
  'js/ui/page-lifecycle.js',
  'js/ui/market-workspace.js',
  'js/ui/info-market-panel.js',
  'js/ui/month-close-flow.js',
  'js/campaign_endings.js',
  'js/rivals.js',
]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename:file });
}

{
  const life={};
  const state=context.QT_BUSINESS_ROMANCE.ensure(life);
  assert.equal(context.QT_BUSINESS_ROMANCE.identity(life,'office').displayName,'박 매니저','공개 전에는 실명 대신 직함을 보여야 한다');
  const businesses={owned:context.QT_BUSINESS_ROMANCE.IDS.map((id,index)=>({
    id:`biz-${id}`,typeId:context.QT_BUSINESS_ROMANCE.profile(id).businessId,managerId:id,
    months:6,level:2,lastNet:1000000,totalProfit:10000000,reputation:70,
  }))};
  context.QT_BUSINESS_ROMANCE.IDS.forEach(id=>{state.staff[id].bond=30;});
  assert.equal(context.QT_BUSINESS_ROMANCE.monthly(life,{day:1,totalNet:4000000,businessState:businesses,hasPartner:false,met:[]}),null);
  assert.equal(context.QT_BUSINESS_ROMANCE.monthly(life,{day:2,totalNet:4000000,businessState:businesses,hasPartner:false,met:[]}),null);
  const reveal=context.QT_BUSINESS_ROMANCE.monthly(life,{day:3,totalNet:4000000,businessState:businesses,hasPartner:false,met:[]});
  assert.equal(reveal.kind,'reveal','네 사업을 연속 흑자 운영하면 얼굴 공개 이벤트가 자연 발생해야 한다');
  const revealed=context.QT_BUSINESS_ROMANCE.resolve(life,reveal,'meet',100000000);
  assert.equal(revealed.revealed,true);
  assert.equal(context.QT_BUSINESS_ROMANCE.identity(life,reveal.staffId).displayName,revealed.character.name,'공개 뒤에는 실명과 데이트 캐릭터 정보가 열려야 한다');
}

{
  const life={businessRomance:null};
  const businesses={owned:[{
    id:'commerce',typeId:'commerce',managerId:'office',months:2,level:1,
    lastNet:1200000,totalProfit:2400000,reputation:55,
  }]};
  const temptation=context.QT_BUSINESS_ROMANCE.monthly(life,{day:2,totalNet:1200000,businessState:businesses,hasPartner:true,met:[]});
  assert.equal(temptation.kind,'temptation','연인이 있을 때 익명 담당자의 유혹 연락이 와야 한다');
  const bad=context.QT_BUSINESS_ROMANCE.resolve(life,temptation,'meet',20000000);
  assert.equal(bad.badEnding,true,'선을 넘으면 확정 불륜 함정이어야 한다');
  assert.equal(bad.breakupAll||bad.blackmail,true,'함정은 관계 파탄 또는 금전 협박으로 확정되어야 한다');
}

{
  const romance=context.QT_BUSINESS_ROMANCE;
  const life={met:[{name:'박지수',status:'friend',affection:30,trust:15}]};
  const state=romance.ensure(life);
  state.staff.office.revealed=true;
  const businesses={owned:[{
    id:'commerce',typeId:'commerce',managerId:'office',months:5,level:2,
    lastNet:1000000,totalProfit:10000000,reputation:70,
  }]};
  const personal=romance.monthly(life,{day:1,totalNet:1000000,businessState:businesses,hasPartner:false,met:life.met});
  assert.equal(personal.kind,'personal-story','얼굴 공개 뒤 호감·신뢰 조건을 채우면 개인 업무 이야기가 자연 발생해야 한다');
  const result=romance.resolve(life,personal,'share',10000000);
  assert.equal(result.personalStory,true);
  assert.equal(state.staff.office.storyChapter,1);
  assert.equal(result.affection>0&&result.trust>0,true,'개인 이야기 선택은 일반 관계 수치에도 반영돼야 한다');
  assert.equal(typeof result.reply,'string','개인 이야기는 담당자별 말투로 된 응답을 반환해야 한다');
  for(const profile of romance.IDS){
    for(const story of romance.PERSONAL_STORIES[profile]){
      assert.equal(fs.existsSync(path.join(root,story.scene.replace('./',''))),true,`${story.scene} 개인 컷씬이 실제로 존재해야 한다`);
    }
  }
}

{
  const romance=context.QT_BUSINESS_ROMANCE;
  const life={met:romance.IDS.map(id=>({
    name:romance.profile(id).name,status:'friend',affection:60,trust:40,
  }))};
  const state=romance.ensure(life);
  romance.IDS.forEach(id=>{state.staff[id].revealed=true;state.staff[id].storyChapter=2;});
  const businesses={owned:romance.IDS.map(id=>({
    id:`biz-${id}`,typeId:romance.profile(id).businessId,managerId:id,months:8,level:3,
    lastNet:1500000,totalProfit:30000000,reputation:75,
  }))};
  let chapter=romance.monthly(life,{day:1,totalNet:6000000,businessState:businesses,hasPartner:false,met:life.met});
  assert.equal(chapter.chapterId,'boardroom_pact');
  romance.resolve(life,chapter,'equal_board',100000000);
  chapter=romance.monthly(life,{day:2,totalNet:6000000,businessState:businesses,hasPartner:false,met:life.met});
  assert.equal(chapter.chapterId,'hostile_takeover');
  romance.resolve(life,chapter,'protect_all',100000000);
  chapter=romance.monthly(life,{day:3,totalNet:6000000,businessState:businesses,hasPartner:false,met:life.met});
  assert.equal(chapter.chapterId,'after_hours_rules');
  romance.resolve(life,chapter,'clear_rules',100000000);
  const progress=romance.progressSummary(life);
  assert.equal(progress.chapter,3);
  assert.equal(progress.synergy>=65&&progress.governance>=58&&progress.boundary>=55,true,'이사회 엔딩은 세 가지 공동 지표를 실제로 쌓아야 한다');
  const ending=romance.monthly(life,{day:4,totalNet:6000000,businessState:businesses,hasPartner:false,met:life.met,partnerNames:[]});
  assert.equal(ending.kind,'quartet-ending','개인·공동 이야기를 마친 뒤 4인 세트 엔딩이 자연 발생해야 한다');
  for(const file of ['event-business-quartet-boardroom.png','event-business-quartet-crisis.png','event-business-quartet-afterhours.png']){
    assert.equal(fs.existsSync(path.join(root,'assets',file)),true,`${file} 공동 컷씬이 실제로 존재해야 한다`);
  }
}

{
  const freedom=context.QT_FREEDOM_TRIO;
  const life={
    met:freedom.NAMES.map(name=>({name,status:'friend',affection:70,trust:45})),
    partner:{name:'채원'},
    polycule:{members:[]},
  };
  const state=freedom.ensure(life);
  Object.keys(freedom.PERSONAL_EVENTS).forEach(id=>{state.personal[id]='seen';});
  assert.equal(freedom.eligibility(life).ok,true,'개인 이벤트와 관계 조건을 채우면 힐링 세트 루트가 열려야 한다');
  assert.equal(freedom.start(life).ok,true);
  for(const choiceId of ['honest','boundaries','threeletters','home']){
    assert.ok(freedom.apply(life,choiceId),'힐링 루트의 네 장 선택을 모두 처리할 수 있어야 한다');
  }
  assert.equal(state.ending.tone,'good');
  assert.ok(['bright_home','small_days'].includes(state.ending.id),'좋은 결말은 화려한 직업과 소박한 생활을 함께 유지해야 한다');
  assert.equal(state.rest>=75,true,'따뜻한 선택은 안식감을 실제 수치로 쌓아야 한다');
  const recovery=freedom.recovery(life);
  assert.equal(recovery.happy>0,true);
  assert.equal(recovery.stress<0,true,'힐링 공동생활은 월마다 스트레스를 실제로 낮춰야 한다');
  assert.equal(recovery.income,300000,'공동생활 수입은 소박한 생활비 수준이어야 한다');
  for(const event of Object.values(freedom.PERSONAL_EVENTS)){
    assert.equal(fs.existsSync(path.join(root,event.scene.replace('./',''))),true,`${event.scene} 개인 컷씬이 실제로 존재해야 한다`);
  }
}

assert.equal(typeof context.QT_PAGE_LIFECYCLE.mount, 'function', '페이지 이탈 자동 일시정지 연결 API를 제공해야 한다');

{
  const pageListeners = {};
  const windowListeners = {};
  const pageContext = {
    console,
    document:{
      visibilityState:'visible',
      addEventListener(type, listener) { pageListeners[type] = listener; },
    },
    addEventListener(type, listener) { windowListeners[type] = listener; },
  };
  pageContext.window = pageContext;
  vm.createContext(pageContext);
  vm.runInContext(
    fs.readFileSync(path.join(root, 'js/ui/page-lifecycle.js'), 'utf8'),
    pageContext,
    { filename:'js/ui/page-lifecycle.js' },
  );

  let leaveCount = 0;
  let returnCount = 0;
  assert.equal(pageContext.QT_PAGE_LIFECYCLE.mount({
    onLeave() { leaveCount++; return true; },
    onReturn() { returnCount++; },
  }), true);
  windowListeners.blur();
  assert.equal(leaveCount, 1, '다른 창으로 이동하면 장 정지 콜백을 호출해야 한다');
  windowListeners.focus();
  assert.equal(returnCount, 1, '게임 창으로 돌아오면 복귀 알림 콜백을 호출해야 한다');

  pageContext.document.visibilityState = 'hidden';
  pageListeners.visibilitychange();
  pageContext.document.visibilityState = 'visible';
  pageListeners.visibilitychange();
  assert.equal(leaveCount, 2, '모바일 앱·탭 전환도 장 정지 콜백을 호출해야 한다');
  assert.equal(returnCount, 2);
}

{
  const life = {};
  const business = context.QT_BUSINESS;
  const legacyState = business.ensure(life);
  assert.deepEqual(Array.from(legacyState.owned), [], '사업 데이터가 없는 구버전 세이브도 빈 장부로 복원해야 한다');

  const opened = business.start(life, 'commerce', 3);
  assert.equal(opened.ok, true);
  assert.equal(opened.manager.name, '박지수');
  assert.equal(opened.manager.portrait, 'mob-office-neutral.png');
  assert.equal(business.start(life, 'commerce', 3).ok, false, '같은 사업체를 중복 설립하면 안 된다');

  const month = business.monthly(life, { phaseId:'boom', day:3, random:()=>0 });
  assert.equal(month.reports.length, 1);
  assert.equal(month.reports[0].manager, '박지수');
  assert.equal(Number.isFinite(month.net), true);
  assert.equal(month.event.businessEvent, true);
  const view = business.eventView(life, month.event);
  assert.equal(view.portrait, './assets/characters/mob-office-sad.png');
  const beforeReputation = view.item.reputation;
  const decision = business.resolveEvent(life, month.event, 'absorb');
  assert.equal(decision.ok, true);
  assert.equal(decision.cash, -1200000);
  assert.equal(decision.business.reputation > beforeReputation, true);
  assert.equal(business.assetValue(life) > 0, true, '사업체 매각가치는 총재산에 포함할 수 있어야 한다');

  const assignedPortraits = business.TYPES.map(type => business.staffOf(type.managerId).portrait);
  assert.deepEqual(Array.from(assignedPortraits), [
    'mob-office-neutral.png','mob-creative-neutral.png','mob-corporate.png','mob-medical.png',
  ]);
  for (const portrait of assignedPortraits) {
    assert.equal(fs.existsSync(path.join(root, 'assets', 'characters', portrait)), true, `${portrait} 모브 이미지가 실제로 존재해야 한다`);
  }
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
    loan: 0,
    realizedPnL: 0,
    trades: 0,
    shortsClosed: 0,
  };
  const result = context.QT_TRADING.executeSell(
    state,
    { name:'한결전자', qty:100, price:1000 },
    { feeRate:0.00015, taxRate:0.0018, allowShort:true, shortSellingPower:2000000 },
  );
  assert.equal(result.ok, true, '세력 하락 작전에 동참할 때 미보유 종목도 자동 공매도할 수 있어야 한다');
  assert.equal(result.kind, 'short');
  assert.equal(state.owned.한결전자.qty, -100);
  assert.equal(state.trades, 1);
}

{
  const lowStress = { health:82, stress:70, fitness:10, happy:50, conditions:[] };
  context.QT_HEALTH.monthly(lowStress, { age:20, jobRisk:0, debtRatio:0, happy:50, random:()=>0 });
  assert.equal(lowStress.conditions.includes('burnout'), false, '스트레스가 임계치에 쌓이기 전에는 번아웃 진단이 나오면 안 된다');

  const highStress = { health:82, stress:90, fitness:10, happy:50, conditions:[] };
  context.QT_HEALTH.monthly(highStress, { age:20, jobRisk:0, debtRatio:0, happy:50, random:()=>0 });
  assert.equal(highStress.conditions.includes('burnout'), true, '고스트레스 상태에서는 번아웃 진단 후보가 열려야 한다');
  context.QT_HEALTH.treat(highStress);
  for (let month = 0; month < 11; month++) {
    highStress.stress = 95;
    context.QT_HEALTH.monthly(highStress, { age:20, jobRisk:0, debtRatio:0, happy:50, random:()=>0 });
  }
  assert.equal(highStress.conditions.includes('burnout'), false, '번아웃 치료 뒤 12개월 동안 즉시 재발하면 안 된다');
}

{
  const appSource = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
  assert.match(appSource, /const LIFE_ACTIONS_PER_MONTH = 4;/, '월 행동력은 4회여야 한다');
  assert.doesNotMatch(appSource, /data-act="career-train"/, '중복된 직무교육 버튼은 제거돼야 한다');
  assert.match(appSource, /id === 'study'[\s\S]{0,160}CAREER\.train/, '자기계발이 직무 능력 성장을 대신해야 한다');
  assert.match(appSource, /allowShort:true,shortSellingPower:power/, '세력 자동 공매도는 실제 공매도 체결 경로를 사용해야 한다');
  assert.match(appSource, /class="life-action-money"/, '장 마감 행동 화면에서 보유 현금이 항상 보여야 한다');
  assert.match(appSource, /room\.lastIncomingDay=S\.day/, '상대가 실제로 먼저 연락한 날짜를 기록해야 한다');
  assert.match(appSource, /answeredDay>=unansweredDay/, '답장한 연락은 방치로 판정하면 안 된다');
  assert.match(appSource, /if \(m\.idleMonths < 2\) return;/, '실제 수신 연락을 두 달 이상 방치한 경우에만 관계 감소가 시작돼야 한다');
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
    dayStartCapital: 910000,
    dayStartRealizedPnL: 120000,
    monthCloseContext: {
      version:1, active:true, currentIndex:1, completedSteps:['month-close-summary'],
      report:{ year:2026, month:7 }, lifeChanges:[{ label:'건강', before:82, after:78 }],
      relationshipChanges:[], familyChanges:[], careerChanges:[], forcedEvents:[], terminal:null,
      steps:[{type:'view',name:'month-close-summary',props:{}},{type:'view',name:'life-status',props:{}}],
    },
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
    life: { children:[], business:{ owned:[{ id:'commerce', typeId:'commerce', managerId:'office', level:1 }] } },
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
  assert.equal(loaded.dayStartCapital, 910000);
  assert.equal(loaded.dayStartRealizedPnL, 120000);
  assert.equal(loaded.monthCloseContext.currentIndex, 1, '월말 View 진행 위치가 저장돼야 한다');
  assert.deepEqual(Array.from(loaded.monthCloseContext.completedSteps), ['month-close-summary']);
  assert.equal(loaded.circuitBreakerTicks, 2);
  assert.equal(loaded.sessionOpen.한결전자, 98);
  assert.equal(loaded.breaking.timer, undefined);
  assert.equal(loaded.marketEvent.text, '시장 충격');
  assert.equal(loaded.intraSession.factionTradeCall.stock, '한결전자');
  assert.equal(loaded.intraSession.raidTarget, 2);
  assert.equal(loaded.life.business.owned[0].managerId, 'office', '사업체와 담당 직원은 저장 데이터에 포함돼야 한다');
}

{
  const workspace = context.QT_MARKET_WORKSPACE;
  assert.equal(typeof workspace.mount, 'function');
  assert.equal(typeof workspace.initOrderBook, 'function');
  assert.equal(typeof workspace.filters, 'function');
  assert.equal(typeof workspace.setStockExpanded, 'function');
}

{
  const panel = context.QT_INFO_MARKET_PANEL;
  assert.deepEqual(Array.from(panel.TABS.map(tab => tab.id)), [
    'owned', 'life', 'chat', 'issue', 'news', 'rank', 'ach',
  ], '내 정보 & 시장 탭 순서는 모듈에서 관리해야 한다');
  assert.deepEqual(Array.from(panel.FILTERS.map(filter => filter.id)), [
    'all', 'stock', 'market', 'mine', 'watch',
  ], '뉴스 필터 정의는 패널 모듈에서 관리해야 한다');
}

{
  const flow = context.QT_MONTH_CLOSE_FLOW;
  const simple = flow.build({
    report:{ year:2026, month:7 },
    lifeChanges:[],
    relationshipChanges:[],
    familyChanges:[],
    careerChanges:[],
  });
  assert.deepEqual(Array.from(simple.steps.map(step => step.name)), [
    'month-close-summary', 'life-action', 'important-events', 'return-market',
  ]);
  assert.equal(flow.current(simple).name, 'month-close-summary');
  flow.advance(simple);
  assert.equal(flow.current(simple).name, 'life-action');
  assert.deepEqual(Array.from(simple.completedSteps), ['month-close-summary']);

  const busy = flow.build({
    report:{}, lifeChanges:[{label:'건강'}], relationshipChanges:[{name:'나래'}],
    familyChanges:[{title:'자녀 진학'}], careerChanges:[{title:'승진'}], terminal:{type:'death'},
  });
  assert.deepEqual(Array.from(busy.steps.map(step => step.name)), [
    'month-close-summary', 'life-status', 'relationship-monthly', 'family-monthly', 'career-business',
    'life-action', 'important-events', 'terminal',
  ]);
  const restored = flow.normalize(JSON.parse(JSON.stringify(busy)));
  assert.equal(restored.active, true);
  assert.equal(restored.steps.length, 8);
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
    partners: ['나래', '한채린', '윤세라'],
    children: 1,
  });
  const result = context.QT_SAVE.decodeResult('#result=' + encoded);
  assert.equal(result.partner, '나래');
  assert.deepEqual(Array.from(result.partners), ['나래', '한채린', '윤세라']);
  assert.equal(result.children, 1);
  assert.equal(context.QT_SAVE.decodeResult('#result=' + encoded + 'broken'), null);
}

{
  const life = {
    relationship:'dating',
    partner:{ name:'강유진', job:'경찰', personality:'caring' },
    met:[
      { name:'강유진', status:'partner', affection:75 },
      { name:'한채린', status:'polycule', affection:70 },
      { name:'윤세라', status:'polycule', affection:68 },
      { name:'비밀연인', status:'lover', affection:55 },
    ],
    polycule:{ active:true, members:[{ name:'한채린' }, '윤세라'], trust:70 },
    dangerousTrioBond:{ active:true, members:['강유진','한채린','윤세라'] },
    lovers:[{ name:'비밀연인' }],
    affection:75,
  };
  assert.deepEqual(Array.from(context.QT_RELATIONSHIPS.names(life)), ['강유진','한채린','윤세라']);
  assert.equal(context.QT_RELATIONSHIPS.isPartner(life,'윤세라'), true, '보조 연인도 현재 연인으로 판정해야 한다');
  assert.equal(context.QT_RELATIONSHIPS.label(life,'한채린'), '위험한 결핍 공생');
  assert.equal(context.QT_RELATIONSHIPS.secretLovers(life)[0].name, '비밀연인');
  assert.deepEqual(
    Array.from(life.relationshipGroup.members, member => Object.keys(member).sort()),
    [['joinedDay','name'],['joinedDay','name'],['joinedDay','name']],
    '실제 관계 구성원 데이터에는 주연인 역할이 없어야 한다',
  );

  const removed = context.QT_RELATIONSHIPS.removeMember(life,'강유진','ex');
  assert.equal(removed.removed, true);
  assert.equal(life.relationship, 'dating', '주 연인 한 명이 빠져도 남은 다자 관계를 해제하면 안 된다');
  assert.equal(life.partner.name, '한채린');
  assert.deepEqual(Array.from(context.QT_RELATIONSHIPS.names(life)), ['한채린','윤세라']);

  const committed=context.QT_RELATIONSHIPS.commit(life,5);
  assert.equal(committed.spouseName,null,'다인 공동생활 서약에서 특정 구성원을 배우자/주연인으로 올리면 안 된다');
  assert.equal(life.relationship,'married','구버전 이벤트에는 공동생활 서약을 married로 투영한다');
  const budget=context.QT_RELATIONSHIPS.monthlyHousehold(life,{
    incomeOf:()=>10000000,
    personalityOf:()=>({money:-0.1,happy:2}),
    housingCost:500000,
    children:1,
  });
  assert.equal(budget.contribution<=budget.need,true,'구성원이 늘어도 공동예산 분담금은 실제 생활비를 넘으면 안 된다');
  assert.equal(budget.lifestyleCost,250000,'생활 성향 지출은 인원수 합계가 아니라 가구 평균이어야 한다');
  const beforeMembers=context.QT_RELATIONSHIPS.names(life).length;
  context.QT_RELATIONSHIPS.registerConflict(life,30,'테스트 갈등',null,6);
  assert.equal(context.QT_RELATIONSHIPS.names(life).length,beforeMembers,'갈등은 자동 이별로 이어지면 안 된다');
  life.relationshipGroup.agreement.publicity='private';
  life.relationshipGroup.exposure=100;
  const exposed=context.QT_RELATIONSHIPS.monthlyPublicity(life,{month:7,random:()=>0});
  assert.equal(exposed.type,'exposed');
  assert.equal(life.relationshipGroup.agreement.publicity,'exposed');
  context.QT_RELATIONSHIPS.setPublicity(life,'public',8);
  assert.equal(context.QT_RELATIONSHIPS.publicityLabel(life),'공개 관계');

  const plan=context.QT_FAMILY.startPlan(life,'birth',{caregivers:['나',...context.QT_RELATIONSHIPS.caregiverNames(life)]});
  assert.equal(plan.ok,true);
  for(let month=0;month<9;month++)context.QT_FAMILY.monthly(life);
  assert.deepEqual(Array.from(life.children[0].caregivers),['나','한채린','윤세라']);
}

{
  const month = context.QT_TIME.monthInfo(13, 25);
  assert.equal(month.age, 26);
  assert.equal(month.month, 1);
  assert.equal(context.QT_TIME.monthlyInterest(1000000, 0.004), 4000);
}

{
  const protectedStatus = context.QT_CAMPAIGN.attackStatus({
    month:3, totalWealth:100000000, monthlyProfit:20000000, rank:1,
  });
  assert.equal(protectedStatus.unlocked, false, '초반 보호 기간에는 큰돈을 벌어도 공격이 잠겨야 한다');
  const unlocked = context.QT_CAMPAIGN.attackStatus({
    month:4, totalWealth:30000000, monthlyProfit:0, rank:5,
  });
  assert.equal(unlocked.unlocked, true);
}

{
  const bot = {
    capital:5000000, assets:[], peakWorth:30000000, initialWorth:30000000,
    pressure:75, credibility:25, reactionStage:'stable', reactionHistory:[],
  };
  const reaction = context.QT_CAMPAIGN.updateRival(bot, 5000000, 8);
  assert.equal(reaction.after, 'collapse');
  const faction = { level:2, members:[{ injuredMonths:0 }, { injuredMonths:0 }] };
  const eligibility = context.QT_CAMPAIGN.bankruptcyEligibility(bot, 5000000, faction);
  assert.equal(eligibility.ready, true);
}

{
  const life = {
    faction:{
      name:'테스트 연합', level:2, members:[{ injuredMonths:0 }, { injuredMonths:0 }],
      assets:[], diplomacy:[], bankruptcies:[], fund:0, wins:0, xp:0,
    },
  };
  const bots = [{
    name:'🧪 테스트', leader:'문 박사', faction:'테스트 세력', capital:1000000,
    assets:[], owned:{}, peakWorth:10000000, initialWorth:10000000,
    pressure:90, credibility:10, reactionStage:'collapse', reactionHistory:[], bankrupt:false,
  }];
  vm.runInContext('Math.random = () => 0', context);
  const result = context.QT_RIVALS.bankruptRival(life, bots, 0, 100000000, 1000000, 12);
  assert.equal(result.success, true);
  assert.equal(bots[0].bankrupt, true);
  assert.equal(context.QT_CAMPAIGN.campaignProgress(bots).complete, true);
}

{
  const life = {};
  const first = context.QT_CAMPAIGN.updatePlayerSolvency(life, {
    totalWealth:-1000, liquidWorth:-1000, debt:5000,
  });
  const second = context.QT_CAMPAIGN.updatePlayerSolvency(life, {
    totalWealth:-1000, liquidWorth:-1000, debt:5000,
  });
  assert.equal(first.bankrupt, false);
  assert.equal(second.bankrupt, true);
}

{
  const familyLife = {
    partner:{ name:'나래', affection:80 },
    met:[
      { name:'나래', status:'partner', affection:80 },
      { name:'한채린', status:'polycule', affection:75 },
    ],
    relationship:'dating',
    polycule:{ active:true, members:[{ name:'한채린' }], trust:70 },
    children:[{ name:'하늘', caregivers:['나','나래','한채린'] }],
    affection:80, familyBond:70, health:80, morality:70, criminalRecord:0,
  };
  const happy = context.QT_CAMPAIGN_ENDINGS.build('victory', familyLife, {
    totalWealth:150000000, debt:0, path:'legal',
  });
  assert.equal(happy.id, 'victory_happy');
  assert.deepEqual(Array.from(happy.partnerNames), ['나래','한채린']);
  assert.equal(happy.lines.some(line => line.includes('나래·한채린')), true);
  assert.equal(happy.lines.some(line => line.includes('하늘')), true);
  assert.equal(happy.lines.some(line => line.includes('나·나래·한채린')), true);
  const normal = context.QT_CAMPAIGN_ENDINGS.build('victory', {
    children:[], health:80, morality:70, criminalRecord:0,
  }, { totalWealth:150000000, debt:0, path:'network' });
  assert.equal(normal.id, 'victory_normal');
}

console.log('core regression tests: ok');
})();
