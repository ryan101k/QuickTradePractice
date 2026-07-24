const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = { console, QT_DATA:{ WORLD_MALE_NPCS:[] } };
context.window = context;
vm.createContext(context);

for (const file of [
  'js/core/trading.js',
  'js/core/time.js',
  'js/core/campaign.js',
  'js/relationship_group.js',
  'js/family.js',
  'js/business.js',
  'js/services/save.js',
  'js/campaign_endings.js',
  'js/rivals.js',
]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename:file });
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
  assert.equal(loaded.circuitBreakerTicks, 2);
  assert.equal(loaded.sessionOpen.한결전자, 98);
  assert.equal(loaded.breaking.timer, undefined);
  assert.equal(loaded.marketEvent.text, '시장 충격');
  assert.equal(loaded.intraSession.factionTradeCall.stock, '한결전자');
  assert.equal(loaded.intraSession.raidTarget, 2);
  assert.equal(loaded.life.business.owned[0].managerId, 'office', '사업체와 담당 직원은 저장 데이터에 포함돼야 한다');
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
