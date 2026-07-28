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
  const marketContext={console};
  marketContext.window=marketContext;
  vm.createContext(marketContext);
  vm.runInContext(fs.readFileSync(path.join(root,'js/events_market.js'),'utf8'),marketContext,{filename:'js/events_market.js'});
  const balance=marketContext.QT_MARKET_BALANCE;
  assert.equal(balance.shapeRate(.0004),.006,'작은 양봉도 최소 +0.6%로 체감돼야 한다');
  assert.ok(balance.shapeRate(.01)>Math.abs(balance.shapeRate(-.01))*3,'같은 원시 폭이면 상승이 하락보다 크게 보여야 한다');
  assert.ok(balance.positionBias({qty:10},{sigma:.004},.5)>0,'플레이어가 매수한 종목에는 우호 수급이 붙어야 한다');
  assert.ok(balance.positionBias({qty:-10},{sigma:.004},.5)<0,'공매도 포지션의 우호 수급 방향은 반대여야 한다');
  const limits=balance.limits({tickLimit:.02,sessionLimit:.10});
  assert.ok(limits.tickUp>limits.tickDown&&limits.sessionUp>limits.sessionDown,'상승 가격제한폭은 하락 제한폭보다 넓어야 한다');
  assert.equal(limits.sessionDown,.10,'개별 종목의 월 하락 하한은 -10% 서킷이어야 한다');
  assert.ok(Math.abs(limits.sessionUp-.30)<1e-9,'상승 여력은 같은 기본 한도의 3배까지 열려야 한다');
}

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
    PointerEvent:function PointerEvent(){},
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
  for(const track of ['group_dangerous','group_freedom','group_business','group_childhood','narae']){
    assert.ok(bgmContext.QT_BGM.tracks.includes(track),`${track} 관계 그룹 전용 BGM이 등록돼야 한다`);
  }
  bgmContext.QT_BGM.setEnabled(true);
  assert.equal(bgmContext.QT_BGM.play('market_normal', true), true);
  const sameTrackTicks=bgmContext.QT_BGM.debug().schedulerTicks;
  assert.equal(bgmContext.QT_BGM.play('market_normal', true), true);
  assert.equal(bgmContext.QT_BGM.debug().schedulerTicks,sameTrackTicks,'같은 곡 강제 동기화는 루프를 처음부터 재시작하면 안 된다');
  mobileAudio.state = 'suspended';
  const resumeCalls = mobileAudio.resumeCalls;
  bgmDocumentListeners.pointerdown();
  bgmDocumentListeners.pointerdown();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(mobileAudio.resumeCalls, resumeCalls + 1, '동시에 들어온 모바일 복구 요청은 하나로 합쳐야 한다');
  assert.equal(bgmContext.QT_BGM.current(), 'market_normal', '잠금 복구 뒤에도 최신 트랙 요청을 유지해야 한다');
  mobileAudio.state='suspended';
  assert.equal(bgmContext.QT_BGM.play('group_freedom',true),true);
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(bgmContext.QT_BGM.debug().playing,'group_freedom','정지 중 장면이 바뀌면 복구 뒤 이전 곡이 아니라 최신 그룹곡을 시작해야 한다');
  bgmContext.QT_BGM.stop();
  bgmContext.QT_BGM.setEnabled(false);
}

for (const file of [
  'js/characters.js',
  'js/interaction_profiles.js',
  'js/origin_story.js',
  'js/core/trading.js',
  'js/core/time.js',
  'js/core/campaign.js',
  'js/romance_route_guard.js',
  'js/relationship_group.js',
  'js/childhood_circle.js',
  'js/character_stories.js',
  'js/character_traits.js',
  'js/dangerous_trio.js',
  'js/character_cross_events.js',
  'js/character_chemistry.js',
  'js/family.js',
  'js/health.js',
  'js/housing.js',
  'js/life_finance.js',
  'js/wealth.js',
  'js/chat_lines.js',
  'js/social_network.js',
  'js/career.js',
  'js/business.js',
  'js/business_romance.js',
  'js/relationship_social.js',
  'js/freedom_trio.js',
  'js/group_chat.js',
  'js/services/save.js',
  'js/ui/page-lifecycle.js',
  'js/ui/market-workspace.js',
  'js/ui/info-market-panel.js',
  'js/ui/month-close-flow.js',
  'js/campaign_endings.js',
  'js/rivals.js',
  'js/faction_campaign.js',
]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename:file });
}

{
  const housing=context.QT_HOUSING;
  const starterLife={};
  housing.ensure(starterLife);
  assert.equal(housing.assetValue(starterLife),0,'시작 현금에서 내지 않은 자취방 보증금은 총재산에 더하지 않아야 한다');
  const legacyLife={housing:{id:'starter',tenure:'monthly',depositPaid:3000000,assetValue:3000000,months:4,starterLease:true}};
  housing.ensure(legacyLife);
  assert.equal(housing.assetValue(legacyLife),0,'구버전 무료 시작 보증금도 한 번 보정해야 한다');
  const paidLife={housing:{id:'studio',tenure:'monthly',depositPaid:10000000,assetValue:10000000,months:2}};
  assert.equal(housing.assetValue(paidLife),10000000,'실제로 낸 주거 보증금은 자산으로 유지해야 한다');

  const wealth=context.QT_WEALTH.breakdown({
    liquid:10000000,property:3000000,passive:2000000,business:4000000,housing:1000000,pension:500000,personalDebt:6000000,
  });
  assert.equal(wealth.total,14000000,'총재산은 금융·실물에서 개인대출을 한 번만 차감해야 한다');
  assert.equal(wealth.pension,undefined,'종료된 연금 항목은 총재산 명세에 남지 않아야 한다');

  const legacyFinanceLife={finance:{policies:[],pensionBalance:2700000,pensionRate:.15}};
  assert.equal(context.QT_LIFE_FINANCE.removeLegacyPension(legacyFinanceLife),2700000,'기존 연금 적립금은 현금 환급액으로 반환해야 한다');
  assert.equal(context.QT_LIFE_FINANCE.removeLegacyPension(legacyFinanceLife),0,'같은 저장 데이터의 연금을 두 번 환급하면 안 된다');
  const financeMonth=context.QT_LIFE_FINANCE.monthly(legacyFinanceLife,{age:38,income:5000000,propertyValue:0,unemployed:false});
  assert.equal(financeMonth.pensionContribution,undefined,'월 정산에서 연금 납입이 다시 생기면 안 된다');
  assert.equal(financeMonth.pensionPayout,undefined,'엔딩형 게임에 연금 수령 정산을 남기면 안 된다');
}

{
  const traits=context.QT_CHARACTER_TRAITS;
  const acquaintance={name:'서연',status:'acquaintance',signature:{key:'inspiration',value:49}};
  const former={name:'서연',status:'ex',signature:{key:'inspiration',value:49}};
  const friend={name:'서연',status:'friend',signature:{key:'inspiration',value:49}};
  const life={met:[acquaintance,former,friend],happy:80,health:70,stress:20};
  const changes=traits.monthly(life,{});
  assert.equal(typeof traits.action,'undefined','관계없는 플레이어 행동으로 인물 신뢰를 바꾸는 API는 없어야 한다');
  assert.equal(acquaintance.signature.value,49,'연락처도 없는 지인은 월간 인연 수치가 자동 상승하면 안 된다');
  assert.equal(former.signature.value,49,'차단한 전 연인의 인연 수치는 자동 상승하면 안 된다');
  assert.ok(friend.signature.value>49,'실제 친구 관계는 월간 관계 맥락의 영향을 받을 수 있어야 한다');
  assert.equal(changes.length,1,'활성 관계에서 단계가 바뀐 인물만 사건 후보가 되어야 한다');
}

{
  const routes=context.QT_ROMANCE_ROUTES,life={day:7,met:[],polycule:{active:false,members:[]}};
  assert.equal(routes.begin(life,'dangerous').ok,true,'한 번에 한 그룹 루트만 진행을 시작해야 한다');
  assert.equal(routes.canStart(life,'freedom').reason,'another_route','진행 중인 그룹이 있으면 다른 그룹 사건의 역주행을 막아야 한다');
  routes.complete(life,'dangerous','bad_friends','good');
  assert.equal(routes.canStart(life,'freedom').ok,true,'앞 그룹을 완료하면 다음 그룹 루트를 진행할 수 있어야 한다');
  assert.equal(routes.begin(life,'freedom').ok,true);
  routes.complete(life,'freedom','small_days','good');
  routes.lockRomance(life,'freedom','test_rejection');
  assert.equal(routes.romanceAvailable(life,'freedom'),false,'그룹 고백 거절은 해당 그룹의 연애만 영구 닫아야 한다');
  assert.equal(!!routes.ensure(life).completed.freedom,true,'연애를 닫아도 이미 끝낸 그룹 이야기는 지워지면 안 된다');
  assert.equal(!!routes.ensure(life).declined.freedom,false,'연애 거절을 그룹 자체 삭제와 같은 상태로 취급하면 안 된다');
  const pureLife={day:8,met:[],polycule:{active:false,members:[]}};
  assert.equal(routes.beginDevotion(pureLife,'dangerous','강유진','test_player_confession').ok,true,'플레이어의 개인 고백은 그룹 거절이 아니라 개인 순애 약속으로 기록돼야 한다');
  assert.equal(routes.devotion(pureLife,'dangerous').name,'강유진','순애 루트의 상대를 그룹 진행 장부에서 찾을 수 있어야 한다');
  assert.equal(routes.groupConfessionAvailable(pureLife,'dangerous'),false,'개인 순애를 고르면 상대 측 공동 고백만 막혀야 한다');
  assert.equal(routes.romanceAvailable(pureLife,'dangerous'),true,'개인 순애는 그룹 전체의 인물 관계를 삭제하는 영구 연애 잠금과 달라야 한다');
  assert.equal(routes.setPath(pureLife,'dangerous','pure','강유진','test_branch').ok,true,'개인서사 분기에서 순애 상대를 전역 노선으로 기록할 수 있어야 한다');
  assert.equal(routes.path(pureLife,'dangerous').name,'강유진','순애 노선은 선택한 인물을 잃지 않아야 한다');
  assert.equal(routes.setPath(pureLife,'dangerous','group',null,'conflict').ok,false,'한 번 정한 순애·공동 관계 노선을 다른 개인서사에서 덮어쓰면 안 된다');
  const groupPathLife={day:8,met:[]};
  assert.equal(routes.setPath(groupPathLife,'dangerous','group',null,'test_branch').ok,true,'하렘 선택은 특정 대표 연인 없이 공동 관계 노선으로 기록돼야 한다');
  assert.equal(routes.path(groupPathLife,'dangerous').path,'group');
  const activeRouteLife={day:8,met:[]};
  routes.begin(activeRouteLife,'freedom');
  assert.equal(routes.groupConfessionAvailable(activeRouteLife,'dangerous'),false,'another active group must block an earlier group confession');
  routes.setConfession(activeRouteLife,'dangerous','queued');
  routes.clearQueuedConfession(activeRouteLife,'dangerous');
  assert.equal(routes.confession(activeRouteLife,'dangerous'),null,'a lost confession reservation must be recoverable');
  const legacyEarlyLock={day:9,romanceRoutes:{version:3,romanceLocked:{dangerous:{reason:'player_confessed_before_group_story_complete'}},confessions:{dangerous:{status:'rejected',reason:'player_confessed_before_group_story_complete'}}}};
  routes.ensure(legacyEarlyLock);
  assert.equal(routes.romanceAvailable(legacyEarlyLock,'dangerous'),true,'이전 버전의 성급한 고백 잠금은 새 순애 규칙에 맞게 자동 해제돼야 한다');
  life.partner={name:'강유진'};life.polycule.members=[{name:'한채린'},{name:'윤세라'}];
  routes.preserveMembers(life,[{name:'채원'},{name:'유나'},{name:'소희'}]);
  assert.deepEqual(Array.from(life.polycule.members,x=>x.name).sort(),['소희','윤세라','유나','채원','한채린'].sort(),'후속 그룹이 성립해도 기존 그룹 구성원을 덮어쓰면 안 된다');
  const axisLife={day:4,met:[],freedomTrio:{guildStage:3,firstOuting:'seen'},businessRomance:{staff:{}},polycule:{active:false,members:[]}};
  routes.engage(axisLife,'business','test');
  assert.equal(routes.center(axisLife),'business','앞선 인연이 없으면 사업 4인조가 인간관계 중심축이 될 수 있어야 한다');
  routes.engage(axisLife,'freedom','test');
  assert.equal(routes.center(axisLife),'freedom','사업 4인조보다 우선인 자유인 3인조가 나타나면 중심축이 승격돼야 한다');
  routes.engage(axisLife,'dangerous','test');
  assert.equal(routes.center(axisLife),'dangerous','위험 3인조를 거르지 않았다면 최우선 인간관계 중심축이 돼야 한다');
  routes.engage(axisLife,'childhood','test');
  assert.equal(routes.center(axisLife),'dangerous','후순위 그룹이 생겨도 이미 성립한 위험 3인조 중심축을 밀어내면 안 된다');
  routes.decline(axisLife,'dangerous','test_skip');
  assert.equal(routes.center(axisLife),'freedom','위험 3인조를 거르면 이미 이어진 자유인 3인조가 중심축을 이어받아야 한다');
  assert.equal(routes.canStart(axisLife,'dangerous').reason,'declined','명시적으로 거른 상위 그룹이 뒤늦게 중심 루트로 되살아나면 안 된다');
  const crossSource=fs.readFileSync(path.join(root,'js/character_cross_events.js'),'utf8');
  for(const id of ['group_dangerous_freedom_first_table','group_dangerous_freedom_table','group_freedom_business_contract','group_business_childhood_audit','group_childhood_dangerous_truth']){
    assert.match(crossSource,new RegExp(id),`${id} 그룹 대치 사건이 있어야 한다`);
  }
  const cross=context.QT_CHARACTER_CROSS_EVENTS;
  const dangerousNames=['강유진','한채린','윤세라'],freedomNames=['채원','유나','소희'];
  const friendLife={
    day:12,dangerousTrio:{badFriendsFormed:true},freedomTrio:{guildStage:3,gameSessions:6,guildWarmth:55,firstOuting:'seen',identityState:'revealed',dangerousDisclosureComplete:false},
    met:[...dangerousNames,...freedomNames].map(name=>({name,status:'friend',affection:45,trust:35})),
  };
  const friendIntro=cross.get('group_dangerous_freedom_first_table',friendLife);
  assert.equal(context.QT_FREEDOM_TRIO.storyMode(friendLife),'guarded','위험 3인조가 악우로 남아 있어도 자유인 3인조는 후순위 구원자가 아니라 경계 대상이 돼야 한다');
  assert.equal(friendIntro.condition(friendLife),false,'공동생활 사실을 직접 밝히기 전에는 광기 3인과 자유인 3인의 대면이 성급하게 열리면 안 된다');
  friendLife.freedomTrio.dangerousDisclosureComplete=true;
  assert.equal(friendIntro.condition(friendLife),true,'중반 관계 공개가 끝나면 광기 3인과 자유인 3인의 첫 대면이 열려야 한다');
  assert.match(friendIntro.title,/친구라기엔 너무 많이 아는/,'친구 루트에서는 연인이 아니라 지나치게 가까운 악우로 반응해야 한다');
  assert.equal(cross.monthly(friendLife).id,'group_dangerous_freedom_first_table','후속 그룹 첫 대면은 일반 무작위 교차 사건보다 먼저 예약돼야 한다');
  cross.resolved(friendLife,'group_dangerous_freedom_first_table','테스트');
  friendLife.freedomTrioBond={active:true};
  assert.equal(cross.get('group_dangerous_freedom_table',friendLife).condition(friendLife),true,'친구 악우도 자유인 공동생활의 귀가 경계 사건에 참여해야 한다');
  assert.match(cross.get('group_dangerous_freedom_table',friendLife).desc,/친구라는 이름으로 귀가 보고서/,'친구 루트 후속 대치는 연인용 대사를 재사용하면 안 된다');
  const haremLife={
    day:12,dangerousTrio:{badFriendsFormed:true},dangerousTrioBond:{active:true},
    freedomTrio:{guildStage:3,gameSessions:6,guildWarmth:55,firstOuting:'seen',identityState:'revealed',dangerousDisclosureComplete:true},
    met:[...dangerousNames,...freedomNames].map(name=>({name,status:'friend',affection:45,trust:35})),
  };
  assert.equal(cross.get('group_dangerous_freedom_first_table',haremLife).condition(haremLife),true,'위험 3인조 공동연애 중에도 자유인 첫 실제 모임 뒤 그룹 대치가 이어져야 한다');
  assert.match(cross.get('group_dangerous_freedom_first_table',haremLife).title,/여섯 개의 신발/,'공동연애 루트에서는 동거 중인 위험 3인조의 경계가 첫 만남에 드러나야 한다');
  const legacyPayLife={faction:{level:1,members:[{uid:'mentor-intel-1',sourceId:'mentor-intel',name:'강도윤',upkeep:280000,trioBaseUpkeep:140000,trioHazardPayRate:2,stats:{income:550000}}],assets:[],diplomacy:[],fund:0}};
  context.QT_RIVALS.ensureFaction(legacyPayLife);
  assert.equal(legacyPayLife.faction.members[0].upkeep,140000,'이전 버전에서 실제 반영된 위험수당은 원래 급여로 복구돼야 한다');
  assert.equal('trioBaseUpkeep' in legacyPayLife.faction.members[0],false,'복구 뒤 임시 급여 표식도 제거해야 한다');
  const appSource=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
  const indexSource=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.ok(indexSource.indexOf('js/interaction_profiles.js')<indexSource.indexOf('js/app.js'),'상호작용 프로필은 app.js보다 먼저 로드돼야 한다');
  assert.match(appSource,/INTERACTION_PROFILES\.dateChoices/,'외출 선택지는 성향별 프로필 모듈에서 받아야 한다');
  assert.match(appSource,/INTERACTION_PROFILES\.requestOptions/,'부탁 선택지는 친밀도와 성향에 맞춰 구성해야 한다');
  assert.match(appSource,/function relationshipBGM\(text\)/,'화면의 관계 그룹을 전용 BGM으로 분류해야 한다');
  for(const track of ['group_business','group_freedom','group_childhood','group_dangerous','narae']){
    assert.match(appSource,new RegExp(`return '${track}'`),`${track} 전용 분위기가 실제 장면 선택에 연결돼야 한다`);
  }
  assert.match(appSource,/CROSS_EVENTS\.get\(eventId,S\.life\)/,'교차 사건은 현재 친구·연인 상태에 맞춘 변형을 렌더링해야 한다');
  assert.match(appSource,/dangerousDisclosurePending/,'광기 3인 공동생활 사실은 첫 정모 직후가 아니라 중반 공개 대기로 기록돼야 한다');
  assert.match(crossSource,/dangerousDisclosureComplete/,'광기 3인과 자유인 3인의 첫 대면은 중반 관계 공개를 마쳐야 열려야 한다');
  assert.match(appSource,/if\(event\.storyBridge\)return 78/,'후속 그룹 첫 대면은 정식 그룹 루트 시작보다 먼저 보여야 한다');
  assert.match(appSource,/while\(event&&!routeEventAllowed\(event\)\)\{[\s\S]{0,120}releaseImportantEventReservation\(event\);[\s\S]{0,80}event=queue\.shift\(\);/,'조건이 사라진 그룹 사건은 예약 상태를 해제하고 중요 사건 큐에서 건너뛰어야 한다');
  assert.match(appSource,/function showGroupConfession\(event\)/,'그룹의 모든 이야기가 끝난 뒤 별도 선고백 알림을 보여줘야 한다');
  assert.match(appSource,/CHEMISTRY\.monthly\(L,S\.day\)/,'캐릭터 캐미 사건은 월말 중요 사건 큐에서 별도 쿨다운으로 검사해야 한다');
  assert.match(appSource,/CHEMISTRY\.applyActionFatigue\(L,group,S\.day\)/,'다중 관계의 생활 피로는 광기 3인뿐 아니라 성립한 모든 그룹 행동에 적용돼야 한다');
  assert.match(appSource,/player_confession_before_group_story_complete/,'그룹 사건 도중 플레이어가 먼저 고백하면 개인 순애 루트로 기록돼야 한다');
  assert.match(appSource,/showGroupRouteBadEnding\(id,'cohabitation_refusal'\)/,'공동생활 제안을 거절하면 그룹별 배드엔딩으로 직행해야 한다');
  assert.match(appSource,/showPureRouteAffairEnding\(c\)/,'개인 순애 뒤 다른 사람을 유혹하면 불륜 배드엔딩 판정을 거쳐야 한다');
  assert.match(appSource,/t:'freedom-rumor'/,'장중 인물발 주식 소문은 자유인 3인조에게 모아야 한다');
  assert.doesNotMatch(appSource,/t: 'acq'/,'일반 지인이 무작위 종목 팁을 주는 기존 경로를 다시 열면 안 된다');
  assert.doesNotMatch(appSource,/data-act="character-story"/,'행동창에 개인 스토리 직접 실행 버튼을 다시 만들면 안 된다');
  assert.doesNotMatch(appSource,/장 진행 가능/,'개인 스토리는 진행 버튼 대신 다음 중요 사건 대기로 안내해야 한다');
  assert.doesNotMatch(appSource,/친구가 알려준 초보 투자지원 프로그램의 담당자입니다/,'첫 만남 장면에 개발자 시점의 나래 관계 설명을 노출하면 안 된다');
  assert.doesNotMatch(appSource,/(?:choice|c)\.preview/,'서사 선택지 아래에 결과 미리보기를 다시 렌더링하면 안 된다');
  assert.doesNotMatch(appSource,/고백 조건:|전용 위험 트리거가 작동|세트 루트가 종료|공동생활 해피엔딩입니다|힐링 공동생활 해피엔딩입니다/,'관계 장면에서 공략 조건이나 결과 해설을 직접 노출하면 안 된다');
  assert.doesNotMatch(appSource,/상담을 더 받으면 .*열립니다|다음 외출부터 정식 데이트|헤어진 뒤에도 .*재회를 시도/,'행동 결과나 다음 진행 방법을 설명하는 문구를 다시 노출하면 안 된다');
  const lifeEventSource=fs.readFileSync(path.join(root,'js/events_life.js'),'utf8');
  const businessRomanceSource=fs.readFileSync(path.join(root,'js/business_romance.js'),'utf8');
  assert.doesNotMatch(lifeEventSource,/훗날 .*루트가 열|공동생활 루트가 닫|위험한 3인조 역시 이번 인생/,'인생 사건 결과가 이후 관계 공략법을 설명하면 안 된다');
  assert.doesNotMatch(businessRomanceSource,/하렘 루트에서 사용할/,'사업 인연의 반응이 시스템상 편입 방법을 설명하면 안 된다');
}

{
  const chemistry=context.QT_CHARACTER_CHEMISTRY;
  assert.match(fs.readFileSync(path.join(root,'index.html'),'utf8'),/js\/character_chemistry\.js/,'캐릭터 캐미 모듈이 앱보다 먼저 로드돼야 한다');
  assert.ok(chemistry.EVENTS.length>=20,'그룹별·그룹 너머·소진 사건이 충분히 다양한 텍스트 캐미 뱅크로 구성돼야 한다');
  const dangerousLife={
    health:80,met:[
      {name:'강유진',status:'polycule',affection:70,trust:55},
      {name:'한채린',status:'polycule',affection:70,trust:55},
      {name:'윤세라',status:'polycule',affection:70,trust:55,obsession:65},
    ],
    dangerousTrioBond:{active:true,members:[{name:'강유진'},{name:'한채린'},{name:'윤세라'}]},
    relationshipGroup:{status:'dating',members:[{name:'강유진'},{name:'한채린'},{name:'윤세라'}],agreement:{cohabiting:true}},
  };
  assert.equal(chemistry.eligible(dangerousLife,chemistry.get('dangerous_handcuff_theft',dangerousLife),1),true,'수갑 캐미는 광기 3인 공동생활과 해당 연인 관계가 모두 성립해야 열린다');
  const dangerousFatigue=chemistry.applyActionFatigue(dangerousLife,'데이트',1);
  assert.equal(dangerousFatigue.drain,4,'광기 3인 공동생활 외출은 기존 체력 소모 4를 유지해야 한다');
  assert.equal(dangerousLife.health,76,'다중 관계 행동 피로는 실제 건강 자원에 반영돼야 한다');
  dangerousLife.met.find(person=>person.name==='한채린').status='ex';
  assert.equal(chemistry.eligible(dangerousLife,chemistry.get('dangerous_handcuff_theft',dangerousLife),2),false,'전연인이나 사망자가 포함된 캐미는 저장된 그룹 플래그가 남아도 발생하면 안 된다');

  const freedomLife={
    health:80,met:chemistry.FREEDOM.map(name=>({name,status:'polycule',affection:65,trust:55})),
    freedomTrio:{identityState:'revealed',harmony:72},
    freedomTrioBond:{active:true,members:chemistry.FREEDOM.map(name=>({name}))},
    relationshipGroup:{status:'dating',members:chemistry.FREEDOM.map(name=>({name})),agreement:{cohabiting:false}},
  };
  assert.equal(chemistry.applyActionFatigue(freedomLife,'데이트',2).drain,2,'자유인 3인 관계도 엇갈린 일정 때문에 외출 체력이 소모돼야 한다');
  assert.equal(chemistry.applyActionFatigue(freedomLife,'휴식',2).drain,0,'자유인 그룹에서 명시적으로 쉬는 행동까지 체력을 깎으면 안 된다');
  chemistry.ensure(freedomLife).totalDrain=9;
  assert.equal(chemistry.eligible(freedomLife,chemistry.get('freedom_chaewon_tonic_bag',freedomLife),3),true,'누적 피로가 쌓이면 채원의 보양식 가방 반개그 사건이 열려야 한다');
  freedomLife.health=28;
  const hospital=chemistry.monthly(freedomLife,4,()=>0.99);
  assert.equal(hospital.id,'fatigue_group_hospital','저체력 병원 사건은 일반 확률과 쿨다운보다 우선해야 한다');
  assert.match(hospital.title,/오랜만에 만났을 뿐/,'병원 사건은 자유인 그룹의 핑계와 분위기에 맞는 변형 대사를 사용해야 한다');
  chemistry.resolved(freedomLife,hospital.id,'회복일',4);
  assert.equal(chemistry.eligible(freedomLife,chemistry.get(hospital.id,freedomLife),5),false,'반복 병원 사건도 최소 쿨다운 전에는 다시 발생하면 안 된다');

  const sixLife={
    health:50,met:[...chemistry.DANGEROUS,...chemistry.FREEDOM].map(name=>({name,status:'polycule',affection:70,trust:60,obsession:name==='윤세라'?70:0})),
    dangerousTrioBond:{active:true},freedomTrioBond:{active:true},
    freedomTrio:{identityState:'revealed',harmony:70},
    relationshipGroup:{status:'dating',members:[...chemistry.DANGEROUS,...chemistry.FREEDOM].map(name=>({name})),agreement:{cohabiting:true}},
  };
  chemistry.ensure(sixLife).totalDrain=14;
  assert.equal(chemistry.eligible(sixLife,chemistry.get('six_chat_summons',sixLife),9),true,'광기·자유 확장 관계에서만 두 단체방의 동시 호출 사건이 열려야 한다');
  assert.equal(chemistry.eligible(sixLife,chemistry.get('fatigue_leader_rationing',sixLife),9),true,'두 그룹 이상과 충분한 누적 피로가 있을 때만 리더 배급 협상이 열려야 한다');

  const crossLife={met:[
    {name:'한채린',status:'partner',affection:70,trust:55},
    {name:'유나',status:'friend',affection:45,trust:40},
  ],partner:{name:'한채린'}};
  const rightsEvent=chemistry.get('cross_chaerin_yuna_rights',crossLife);
  assert.equal(chemistry.eligible(crossLife,rightsEvent,3),true,'그룹 밖 캐미는 관련 인물 중 연인 한 명과 친구·지인 한 명 구도에서 열려야 한다');
  crossLife.met.find(person=>person.name==='유나').status='partner';
  crossLife.relationshipGroup.members.push({name:'유나'});
  assert.equal(chemistry.eligible(crossLife,rightsEvent,3),false,'6인 합의가 아닌데 서로 다른 그룹 인물 둘이 동시에 연인인 교차 캐미를 열면 안 된다');

  const generalLife={
    health:70,met:[{name:'나래',status:'partner'},{name:'서연',status:'polycule'}],
    relationshipGroup:{status:'dating',members:[{name:'나래'},{name:'서연'}],agreement:{cohabiting:false}},
    polycule:{active:true,members:[{name:'서연'}],trust:70},
  };
  assert.equal(chemistry.activeGroups(generalLife)[0],'general','전용 세트가 아닌 일반 합의 다자연애도 생활 피로 시스템에서 빠지면 안 된다');
  assert.equal(chemistry.applyActionFatigue(generalLife,'데이트',4).drain,2,'일반 다자연애 외출에도 완만한 체력 소모가 적용돼야 한다');
}

{
  const stories=context.QT_CHARACTER_STORIES;
  const yujinStory=stories.get('강유진'),seraStory=stories.get('윤세라'),chaerinStory=stories.get('한채린');
  assert.equal(yujinStory.chapters.length,9,'강유진 개인 스토리는 추가 일러를 쓰는 9장 분량이어야 한다');
  assert.equal(chaerinStory.chapters.length,10,'한채린 개인 스토리는 첫 계약부터 왕관을 내려놓는 밤까지 10장 분량이어야 한다');
  assert.ok([...yujinStory.chapters,...chaerinStory.chapters].every(chapter=>Number.isFinite(chapter.min)&&chapter.scene),'강유진·한채린의 모든 장에는 조건과 컷신 자리가 있어야 한다');
  assert.ok(yujinStory.chapters.slice(0,3).every(chapter=>chapter.phase==='friend')&&yujinStory.chapters.slice(3).every(chapter=>chapter.requiresRelationship),'강유진은 3장까지 친구 이야기이고 이후는 실제 연인 전용이어야 한다');
  assert.ok(seraStory.chapters.slice(0,3).every(chapter=>chapter.phase==='friend')&&seraStory.chapters.slice(3).every(chapter=>chapter.requiresRelationship),'윤세라는 잠긴 작업실까지 친구 이야기이고 이후는 실제 연인 전용이어야 한다');
  assert.ok(chaerinStory.chapters.slice(0,4).every(chapter=>chapter.phase==='friend')&&chaerinStory.chapters.slice(4).every(chapter=>chapter.requiresRelationship),'한채린은 화해의 갈림길까지 친구 이야기이고 이후는 실제 연인 전용이어야 한다');
  assert.match(yujinStory.chapters[0].desc,/순찰 구역을 벗어나[\s\S]*귀가 시간을 확인했던 전화/,'강유진 개인 1장은 앞서 발생한 위치 확인 위험 신호에서 이어져야 한다');
  assert.match(chaerinStory.chapters[0].desc,/법인카드 사건 뒤/,'한채린 개인 1장은 앞서 통제권을 넘긴 법인카드 위험 신호에서 이어져야 한다');
  assert.equal(seraStory.chapters[0].title,'열두 통을 지운 밤','윤세라 개인 1장은 외출 해금 뒤의 절제 시도로 이어져야 한다');
  assert.match(seraStory.chapters[0].desc,/함께 편의점까지 걸었던 날[\s\S]*몰래 찍은 사진을 지운 사건 뒤/,'윤세라 개인 1장은 문밖 외출과 사진 위험 신호를 모두 기억해야 한다');
  assert.doesNotMatch(seraStory.chapters[0].desc,/아직 모릅니다/,'윤세라가 이미 들은 플레이어의 바깥 공포를 다시 모르는 것으로 되돌리면 안 된다');
  for(const scene of ['event-yujin-1.png','event-yujin-2.png','event-yujin-night-3.png','event-yujin-5135.png','event-yujin-14.png']){
    assert.ok(yujinStory.chapters.some(chapter=>chapter.scene===scene),`강유진 추가 일러 ${scene}가 개인 스토리에 배치돼야 한다`);
    assert.ok(fs.existsSync(path.join(root,'assets',scene)),`강유진 추가 일러 ${scene} 파일이 있어야 한다`);
  }
  for(const scene of ['event-chaerin-1.png','event-chaerin-2.png','event-chaerin-4.png','event-chaerin-5.png','event-chaerin-8.png','event-chaerin-9.png','event-chaerin-10.png']){
    assert.ok(chaerinStory.chapters.some(chapter=>chapter.scene===scene),`한채린 추가 일러 ${scene}가 개인 스토리에 배치돼야 한다`);
    assert.ok(fs.existsSync(path.join(root,'assets',scene)),`한채린 추가 일러 ${scene} 파일이 있어야 한다`);
  }
  const storyAppSource=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
  assert.match(storyAppSource,/dangerous_dependence:'\.\/assets\/event-yujin-1111\.png'/,'강유진 위험한 의존 완결에는 전용 내면 독백 컷신을 써야 한다');
  assert.match(yujinStory.chapters[1].speaker,/필요|부를 이유/,'강유진의 친구 구간부터 사건이 끝나 자신이 필요 없어지는 불안을 드러내야 한다');
  assert.match(yujinStory.chapters[5].speaker,/기뻤|구하려/,'강유진의 연인 구간에는 플레이어가 자신을 필요로 할 때 안도하는 구원 강박 자각이 있어야 한다');
  const finish=(name,routeChoice)=>{
    const rec={name,status:'partner',affection:100,trust:100,dangerLevel:0};
    if(stories.ROMANCE_BRANCH_SCENES[name])stories.chooseRomancePath(rec,'pure');
    const chapterCount=stories.get(name).chapters.length;
    for(let chapter=0;chapter<chapterCount;chapter++){
      const choice=name==='한채린'?routeChoice:chapter===0?'support':routeChoice;
      const result=context.QT_CHARACTER_STORIES.apply(rec,choice);
      assert.ok(result,`${name} ${chapter+1}장이 진행돼야 한다`);
    }
    return rec;
  };
  assert.equal(finish('강유진','depend').yujinEndingRoute,'dangerous_dependence','강유진의 의존 선택은 위험한 보호 엔딩으로 이어져야 한다');
  assert.equal(finish('강유진','boundary').yujinEndingRoute,'equal','강유진과 경계를 지키면 대등한 순애 엔딩이어야 한다');
  assert.equal(finish('한채린','command').chaerinEndingRoute,'private_submission','한채린의 사적 명령 선택은 왕관을 내려놓는 엔딩으로 이어져야 한다');
  assert.equal(finish('한채린','equal').chaerinEndingRoute,'equal','한채린과 같은 자리를 고르면 대등한 순애 엔딩이어야 한다');
  const gated={name:'강유진',status:'friend',affection:100,trust:50,dangerEvents:{}};
  assert.equal(stories.next(gated),null,'광기 3인 개인 아크는 친구 호감 컷씬과 첫 위험 신호를 건너뛰고 시작하면 안 된다');
  gated.dangerEvents.yujin_warning='seen';
  assert.ok(stories.next(gated),'첫 위험 신호를 확인한 뒤에는 중복 컷씬 대신 정식 개인 아크가 이어져야 한다');
  for(const choice of ['support','boundary','boundary'])assert.ok(stories.apply(gated,choice),'강유진의 친구 구간 세 장은 연애 전에도 진행돼야 한다');
  assert.equal(stories.next(gated),null,'강유진의 친구 구간이 끝나면 관계 노선을 정하기 전까지 후반부가 진행되면 안 된다');
  assert.equal(stories.availability(gated).reason,'romance-branch','친구 구간 완료 뒤에는 순애·공동 관계 분기를 먼저 제시해야 한다');
  stories.chooseRomancePath(gated,'group');
  assert.equal(stories.next(gated).phase,'group','공동 관계를 택하면 공식 연인이 아니어도 공통서사를 준비하는 후반부가 이어져야 한다');
  assert.equal(gated.status,'friend','공동 관계 준비가 대표 연인 상태를 임의로 덮어쓰면 안 된다');
  assert.doesNotMatch(stories.next(gated).desc,/연인이 된 뒤/,'공동 관계 후반부가 이미 둘만의 연인인 것처럼 서술되면 안 된다');

  const pureYujin={name:'강유진',status:'partner',affection:100,trust:80,story:{chapter:3,completed:false,history:[],traits:{},variant:'adult',romancePath:'pure'}};
  assert.equal(stories.next(pureYujin).phase,'lover','순애를 택한 인물에게만 실제 연인 후반부가 열려야 한다');
  const platonicChaerin={name:'한채린',status:'friend',affection:100,trust:80,story:{chapter:4,completed:false,history:[],traits:{},variant:'adult',romancePath:'platonic'}};
  assert.equal(stories.next(platonicChaerin).phase,'platonic','순애에서 선택받지 않은 세트 인물은 친구 후반부로 이어져야 한다');
  assert.doesNotMatch(stories.next(platonicChaerin).desc,/연인이 된 뒤/,'친구 후반부에 연인 전용 문구가 남으면 안 된다');
  for(const name of ['강유진','한채린','윤세라']){
    for(const path of ['group','platonic']){
      const rec={name,story:{romancePath:path,chapter:stories.RELATIONSHIP_START[name],history:[],traits:{}}};
      const story=stories.get(rec),tail=story.chapters.slice(story.relationshipStart);
      assert.doesNotMatch(JSON.stringify(tail),/연인/ ,`${name}의 ${path} 후반부 설명·대사·선택지에는 둘만의 연인 표현이 남으면 안 된다`);
    }
  }

  const generalFriend={name:'서연',status:'friend',affection:100,trust:60};
  assert.ok(stories.apply(generalFriend,'support'));
  assert.ok(stories.apply(generalFriend,'support'));
  assert.equal(stories.availability(generalFriend).reason,'relationship','일반 개인 스토리 완결도 친구 상태에서 연인 결말처럼 진행되면 안 된다');
  generalFriend.status='partner';
  assert.equal(stories.next(generalFriend).phase,'finale','일반 개인 스토리 마지막 장은 연인 관계 뒤에 열려야 한다');
  const legacyFriend={name:'강유진',status:'friend',affection:100,story:{chapter:9,completed:true,history:[],traits:{depend:5},variant:'adult',ending:{route:'dangerous_dependence'}}};
  assert.equal(stories.availability(legacyFriend).reason,'relationship-complete','구버전 친구 상태의 연인 완결은 삭제하지 말고 관계 성립까지 확정을 보류해야 한다');
  stories.chooseRomancePath(legacyFriend,'group');
  assert.equal(stories.availability(legacyFriend).reason,'completed','구버전 완결 기록도 관계 노선을 이관하면 정상 완결로 인정해야 한다');
}

{
  const trio=context.QT_DANGEROUS_TRIO;
  const pureRouteLife={
    day:8,seraHousing:'cohabit',partner:{name:'강유진'},polycule:{active:false,members:[]},
    met:['강유진','한채린','윤세라'].map(name=>({name,status:name==='강유진'?'partner':'friend',affection:90,trust:80,story:{chapter:10,completed:true,history:[],traits:{},romancePath:name==='강유진'?'pure':'platonic',ending:{route:name==='강유진'?'equal':name==='한채린'?'equal':'anchored'}}}))
  };
  context.QT_ROMANCE_ROUTES.setPath(pureRouteLife,'dangerous','pure','강유진','test_story_branch');
  const pureChapters=trio.chaptersFor(pureRouteLife);
  assert.equal(pureChapters.length,3,'순애 노선의 공통서사는 하렘 공동생활 6장을 그대로 재생하지 않고 별도 악우 동맹 3장으로 진행돼야 한다');
  assert.match(pureChapters[0].desc,/강유진과의 연애/,'순애 공통서사는 선택한 연인을 명확히 표시해야 한다');
  assert.match(pureChapters[2].choices[0].text,/순애를 지키며/,'순애 공통서사의 결론은 연애와 친구 동맹을 분리해야 한다');
  trio.ensure(pureRouteLife).badFriendsFormed=true;
  assert.equal(trio.eligibility(pureRouteLife).ok,true,'순애 선택 뒤에도 세 사람의 악우 공통서사는 교착 없이 시작할 수 있어야 한다');
  assert.equal(trio.start(pureRouteLife).ok,true);
  assert.equal(pureRouteLife.met.find(person=>person.name==='강유진').status,'partner','순애 공통서사가 선택한 연인을 친구 상태로 되돌리면 안 된다');
  assert.match(trio.romanceEnding('cohabitation_refusal').title,/공동생활 배드엔딩/,'위험한 3인조가 공동생활 거절 엔딩을 직접 소유해야 한다');
  assert.match(trio.romanceEnding('pure_affair').detail,/불륜 시도/,'위험한 3인조가 순애 위반 엔딩을 직접 소유해야 한다');
  const endings={강유진:'dangerous_dependence',한채린:'private_submission',윤세라:'anchored'};
  const life={
    day:9,seraHousing:'cohabit',partner:{name:'강유진'},polycule:{active:false,members:[]},
    yujinInvestigationSeen:true,
    faction:{level:1,members:[{uid:'mentor-intel-1',sourceId:'mentor-intel',name:'강도윤',upkeep:140000,loyalty:78}]},
    met:trio.NAMES.map(name=>({name,status:'friend',affection:85,trust:70,story:{chapter:5,completed:true,history:[],traits:{},variant:'adult',ending:{route:endings[name],title:name}}}))
  };
  assert.equal(trio.PRELUDES.length,2,'위험 3인조의 취향 폭로와 잘잘못 재판은 중복 없이 한 악우 사건으로 합쳐져야 한다');
  assert.equal(trio.CHAPTERS.length,6,'위험 3인조 그룹 본편은 공조·개인 결말 양보 3장·위기·공동생활 합의의 6장이어야 한다');
  assert.deepEqual(trio.CHAPTERS.filter(chapter=>chapter.focus).map(chapter=>chapter.focus),trio.NAMES,'각 개인 아크의 결론이 그룹 안의 인물별 양보 장면으로 한 번씩 이어져야 한다');
  const sharedHomeChapter=trio.CHAPTERS.at(-1);
  assert.match(sharedHomeChapter.desc,/유진·채린·세라.*먼저 요청/,'공동생활 거점 고정은 플레이어의 고집이 아니라 세 사람의 공동 요청이어야 한다');
  assert.match(sharedHomeChapter.choices.find(choice=>choice.id==='badfriends').result,/플레이어의 고집이 아니라 세 사람이 서로에게 요구한 안전장치/,'공동생활 성립 결과에도 집 고정의 주체를 명확히 남겨야 한다');
  assert.equal(trio.AFTERMATH.length,5,'공동생활 후일담은 규칙뿐 아니라 돌봄과 자발적 귀가까지 5개월을 다뤄야 한다');
  const blockedPreludeLife=JSON.parse(JSON.stringify(life));
  context.QT_ROMANCE_ROUTES.begin(blockedPreludeLife,'freedom');
  assert.equal(trio.preludeEligibility(blockedPreludeLife).ok,false,'another group route must block the dangerous trio prelude');
  assert.equal(trio.preludeEligibility(blockedPreludeLife).guard.reason,'another_route');
  trio.ensure(blockedPreludeLife).queued=true;
  trio.cancelQueue(blockedPreludeLife);
  assert.equal(trio.ensure(blockedPreludeLife).queued,false,'a lost dangerous trio start must be retryable');
  const legacyActive={dangerousTrio:{active:true,encountered:true,stage:3,stability:82,axes:{balance:3,containment:0,fracture:0},history:[
    {stage:0,choice:'roles',tag:'balance'},{stage:1,choice:'same',tag:'balance'},{stage:2,choice:'thank',tag:'balance'}
  ]}};
  const migrated=trio.ensure(legacyActive);
  assert.equal(migrated.version,trio.VERSION,'구버전 4장 진행 저장은 새 광기 3인조 스키마로 한 번만 이관돼야 한다');
  assert.equal(migrated.stage,1,'구버전 진행 저장은 이미 본 공조 장 뒤의 새 개인 결말 양보 장부터 이어져야 한다');
  assert.equal(migrated.history.length,1,'구버전의 중복 정상 논쟁과 후반 장 선택을 새 그룹 축에 이중 반영하면 안 된다');
  assert.equal(trio.eligibility(life).ok,false,'세 사람이 악우가 되기 전에 정식 공동 루트가 먼저 열리면 안 된다');
  trio.PRELUDES.forEach((event,index)=>{
    life.day=9+index;
    assert.equal(trio.queuePrelude(life,life.day).id,event.id,`${event.title} 사건이 순서대로 예약돼야 한다`);
    assert.ok(trio.applyPrelude(life,event.choices[0].id),`${event.title} 선택이 적용돼야 한다`);
  });
  assert.equal(trio.ensure(life).badFriendsFormed,true,'세 사건 뒤 셋은 정식 루트 이전부터 악우가 돼야 한다');
  assert.equal(trio.eligibility(life).ok,true,'위험 3인조는 세 개인 결핍 루트를 완성하고 윤세라와 동거하면 시작돼야 한다');
  assert.equal(trio.start(life).ok,true);
  while(trio.next(life))trio.apply(life,trio.next(life).choices.find(choice=>choice.tag==='balance').id);
  assert.equal(trio.ensure(life).ending.id,'bad_friends','균형 선택은 위험 3인조 악우 공동생활 결말이어야 한다');
  assert.equal(Object.keys(trio.ensure(life).personalConcessions).sort().join('|'),Array.from(trio.NAMES).sort().join('|'),'세 사람 모두 개인 결말을 그룹 관계 안에서 다시 선택한 기록이 남아야 한다');
  assert.ok(context.QT_ROMANCE_ROUTES.ensure(life).completed.dangerous,'그룹 엔딩은 공통 진행 장부에 완료로 기록돼야 한다');

  const failedLife={
    day:20,seraHousing:'cohabit',partner:{name:'강유진'},polycule:{active:false,members:[]},
    yujinInvestigationSeen:true,faction:{level:1,members:[{uid:'unit',name:'부하'}]},
    met:trio.NAMES.map(name=>({name,status:'friend',affection:85,trust:70,story:{completed:true,ending:{route:endings[name],title:name}}}))
  };
  trio.PRELUDES.forEach((event,index)=>{failedLife.day=20+index;trio.queuePrelude(failedLife,failedLife.day);trio.applyPrelude(failedLife,event.choices[0].id);});
  assert.equal(trio.start(failedLife).ok,true);
  while(trio.next(failedLife)){
    const chapter=trio.next(failedLife),choice=chapter===trio.CHAPTERS.at(-1)?chapter.choices.find(item=>item.id==='goldencage'):chapter.choices.find(item=>item.tag==='balance');
    trio.apply(failedLife,choice.id);
  }
  assert.equal(trio.ensure(failedLife).ending.id,'shared_home_failed','공동생활 최종 합의가 실패하면 즉시 실패 배드엔딩이어야 한다');
  assert.match(trio.ensure(failedLife).ending.scene,/event-trio-bed-ending/,'공동생활 성립 실패는 새 잠금방 컷신을 사용해야 한다');

  life.dangerousTrioBond={active:true,members:trio.NAMES.slice()};
  life.polycule={active:true,members:[{name:'한채린'},{name:'윤세라'}]};
  const freedom=context.QT_FREEDOM_TRIO;
  assert.match(freedom.romanceEnding('cohabitation_refusal').title,/공동 관계 배드엔딩/,'자유인 3인조가 비동거 공동 관계 거절 엔딩을 직접 소유해야 한다');
  assert.match(freedom.romanceEnding('pure_affair').detail,/순애 약속 위반/,'자유인 3인조가 순애 위반 엔딩을 직접 소유해야 한다');
  freedom.NAMES.forEach(name=>life.met.push({name,status:'friend',affection:80,trust:60}));
  const freedomState=freedom.ensure(life);
  freedomState.guildStage=freedom.GUILD_EVENTS.length;
  freedom.COUNSELING_EVENTS.forEach(event=>freedomState.counseling[event.id]='seen');
  freedomState.firstOuting='seen';
  Object.keys(freedom.PERSONAL_EVENTS).forEach(id=>freedomState.personal[id]='seen');
  assert.equal(freedom.eligibility(life).ok,true,'완료된 위험 3인조 뒤에는 자유인 3인조가 자연스럽게 편입될 수 있어야 한다');
  assert.equal(freedom.start(life).ok,true);
  while(freedom.next(life))freedom.apply(life,freedom.next(life).choices.find(choice=>choice.tag!=='control').id);
  assert.equal(freedom.ensure(life).ending.tone,'good','통제하지 않는 선택은 자유인 3인조 힐링 결말이어야 한다');
  assert.ok(context.QT_ROMANCE_ROUTES.ensure(life).completed.freedom,'편입된 자유인 그룹도 완료 상태를 남겨야 한다');
}

{
  const career=context.QT_CAREER;
  const life={career:{jobId:'office',months:4,level:1,skill:50,reputation:40,performance:60,certifications:['finance','security']},job:'office'};
  career.ensure(life);
  assert.equal(life.job,'office','상태 조회만으로 외부 마이그레이션 전의 life.job을 임의 변경하지 않아야 한다');
  assert.equal(life.career.jobId,'none','구버전 직업 경력 id는 운영 역량 상태로 정규화돼야 한다');
  assert.ok(career.businessEffects(life).salesMultiplier>1,'운영 역량은 사업 매출에 실제 보정을 줘야 한다');
  assert.ok(career.businessEffects(life).costMultiplier<1,'사업 회계 교육은 사업 비용을 실제로 줄여야 한다');
  assert.ok(career.factionEffects(life).defenseBonus>=.12,'위기관리 교육은 세력 방어에 실제 보정을 줘야 한다');
}

{
  const life={};
  const starter=context.QT_HOUSING.ensure(life);
  assert.equal(starter.id,'starter','새 게임은 부모님 집이 아니라 월세 자취방에서 시작해야 한다');
  assert.equal(starter.tenure,'monthly');
  assert.ok(context.QT_HOUSING.monthly(life,1).expense>0,'시작 자취방은 매달 실제 월세가 나가야 한다');
  life.dangerousTrioBond={active:true};
  assert.equal(context.QT_HOUSING.monthly(life,1).expense,0,'위험 3인조 공동생활이 성립한 자취방은 월세가 사라져야 한다');
  assert.equal(context.QT_HOUSING.move(life,'premium','owned'),null,'공동생활 중에는 다른 집으로 이사할 수 없어야 한다');
  const housingAppSource=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
  assert.match(housingAppSource,/trioLockReason:'dangerous-trio-request'/,'저장 상태에도 세 사람의 요청으로 집이 고정됐다는 사유를 기록해야 한다');
  assert.match(housingAppSource,/유진·채린·세라가 요청한 거점 합의로 이사 불가/,'주택 UI가 플레이어 선택이 아니라 세 사람의 요청 때문에 잠겼다고 설명해야 한다');
}

{
  const life={dangerousTrioBond:{active:true},playerName:'나',met:[],children:[]};
  assert.equal(context.QT_FAMILY.startPlan(life,'birth',{caregivers:['강유진','한채린','윤세라']}).ok,true,'위험 3인조 공동생활도 명시적인 가족 계획은 시작할 수 있어야 한다');
  for(let month=0;month<9;month++)context.QT_FAMILY.monthly(life);
  assert.equal(life.familyRouteLock,'dangerous','공동생활에서 아이가 생기면 위험 3인조 가족 루트로 고정돼야 한다');
  assert.equal(context.QT_ROMANCE_ROUTES.canStart(life,'freedom').reason,'family_route_locked','아이 출생 뒤 다른 관계 그룹은 새로 편입될 수 없어야 한다');
}

{
  const profiles=context.QT_INTERACTION_PROFILES;
  const approaches=['sincere','listen','humor','plan','vulnerable','direct','flex','push']
    .map(key=>({key,label:key,emoji:'·',mod:0,cost:0}));
  const frugal=profiles.dateChoices({name:'미래',personality:'frugal'},'outing',approaches,{trust:8});
  const free=profiles.dateChoices({name:'유나',personality:'free'},'outing',approaches,{trust:8});
  assert.equal(frugal.length,4,'성향별 외출은 네 가지 선택지를 유지해야 한다');
  assert.notDeepEqual(Array.from(frugal,x=>x.label),Array.from(free,x=>x.label),'알뜰형과 자유형에게 같은 외출 선택지를 보여주면 안 된다');
  assert.ok(frugal.every(choice=>choice.profileFit),'성향별 외출에는 인물 적합도 표식이 있어야 한다');

  const calmYujin={name:'강유진',personality:'caring',status:'partner',dangerAwakened:true,story:{traits:{}}};
  const awakenedYujin={...calmYujin,story:{traits:{depend:2}}};
  assert.equal(profiles.awakeningState(calmYujin).awakened,false,'연애 시작만으로 강유진의 구원 강박이 각성하면 안 된다');
  assert.equal(profiles.awakeningState(awakenedYujin).awakened,true,'의존 선택이 누적되면 강유진의 구원 강박 외출이 열려야 한다');
  assert.notDeepEqual(
    Array.from(profiles.dateChoices(calmYujin,'date',approaches,{trust:40}),x=>x.label),
    Array.from(profiles.dateChoices(awakenedYujin,'date',approaches,{trust:40}),x=>x.label),
    '강유진의 각성 전후 외출 선택지는 달라야 한다'
  );
  assert.notEqual(
    profiles.requestOptions(calmYujin,{closeness:80,trust:50,risk:{value:50},morality:60})[0].label,
    profiles.requestOptions(awakenedYujin,{closeness:80,trust:50,risk:{value:50},morality:60})[0].label,
    '강유진의 각성 전후 부탁 문구도 달라야 한다'
  );
  assert.equal(profiles.awakeningState({name:'한채린',dangerAwakened:true,story:{traits:{}}}).awakened,false,'일반 연애만으로 한채린의 굴복 욕구가 각성하면 안 된다');
  assert.equal(profiles.awakeningState({name:'한채린',status:'friend',chaerinSubmissionAwakened:true}).awakened,false,'한채린의 각성 사건이 있어도 친구 상태에서는 연인용 상호작용을 열면 안 된다');
  assert.equal(profiles.awakeningState({name:'한채린',status:'partner',chaerinSubmissionAwakened:true}).awakened,true,'한채린의 명시적 각성 사건과 연인 관계가 함께 성립하면 전용 상호작용을 열어야 한다');
  assert.equal(profiles.awakeningState({name:'윤세라',dangerAwakened:true,story:{traits:{}}}).awakened,false,'일반 연애만으로 윤세라의 극단 상호작용이 열리면 안 된다');
  assert.equal(profiles.awakeningState({name:'윤세라',spentNight:true}).awakened,true,'윤세라의 명시적 밤 사건 뒤에는 각성 상호작용이 열려야 한다');

  const earlyKinds=profiles.requestOptions({name:'서연',personality:'caring'},{closeness:12,trust:4,morality:60}).map(x=>x.kind);
  assert.deepEqual(Array.from(earlyKinds),['celebrate','gift','advice'],'낮은 친분에는 일상적인 부탁만 보여야 한다');
  const closeKinds=profiles.requestOptions({name:'미래',personality:'frugal',moneyStyle:'support'},{closeness:70,trust:55,morality:60}).map(x=>x.kind);
  assert.ok(closeKinds.includes('help')&&closeKinds.includes('secret')&&closeKinds.includes('money'),'신뢰가 쌓인 지원형 인물에게만 깊은 부탁이 열려야 한다');
  const policeKinds=profiles.requestOptions({name:'강유진',personality:'caring',special:'police'},{closeness:100,trust:80,morality:10}).map(x=>x.kind);
  assert.ok(!policeKinds.includes('alibi')&&!policeKinds.includes('money'),'강유진에게 불법 알리바이나 개인 돈 부탁을 기본 메뉴로 보여주면 안 된다');
  const darkKinds=profiles.requestOptions({name:'한채린',personality:'ambitious',special:'heiress'},{closeness:100,trust:80,morality:10}).map(x=>x.kind);
  assert.ok(darkKinds.includes('alibi'),'낮은 도덕성과 높은 신뢰가 함께 있을 때만 위험한 부탁이 열려야 한다');
}

{
  const mealOptions=context.QT_CHAT.replyOptions({name:'테스트'},'밥은 챙겨 먹었어?');
  assert.match(mealOptions.find(option=>option.id==='warm').text,/먹|식사/,'식사 안부에는 식사에 맞는 답을 해야 한다');
  const inviteOptions=context.QT_CHAT.replyOptions({name:'테스트'},'이번 주에 커피 마시러 갈래?');
  assert.match(inviteOptions.find(option=>option.id==='warm').text,/시간|보자/,'만남 제안에는 약속에 맞는 답을 해야 한다');
  context.QT_CHARACTER_DIALOGUE={line:()=> '처음부터 당신이 보고 싶고 사랑해요.'};
  const earlyPerson={name:'일반 인물',status:'friend',affection:14,trust:8,interactions:2,personality:'caring'};
  const earlyIncoming=context.QT_CHAT.incoming(earlyPerson,{tag:'친구',earlyContact:true,personality:'caring'});
  assert.notEqual(earlyIncoming,'처음부터 당신이 보고 싶고 사랑해요.','낮은 친분에서는 인물별 호감 대사를 바로 쓰면 안 된다');
  assert.doesNotMatch(earlyIncoming,/사랑|보고 싶|기대/,'연락처를 막 받은 단계의 선연락은 정중한 안부여야 한다');
  assert.equal(context.QT_CHAT.incoming({name:'윤세라',status:'friend'},{tag:'친구',earlyContact:true}),'처음부터 당신이 보고 싶고 사랑해요.','윤세라는 초반부터 과한 선연락을 하는 예외여야 한다');
  assert.match(context.QT_CHAT.partnerAnswer(earlyPerson,'warm',{earlyContact:true}),/감사|다음/,'초기 답장 반응도 연애 대사가 아니라 정중한 말투여야 한다');
  delete context.QT_CHARACTER_DIALOGUE;
  const parent={role:'mother'};
  const parentOptions=context.QT_SOCIAL.contactReplyOptions(parent,'집에 올 때 필요한 거 있으면 말해.');
  assert.match(parentOptions.find(option=>option.id==='meet').text,/집|밥/,'가족의 귀가 연락에는 방문 약속으로 답해야 한다');
}

{
  const circle=context.QT_CHILDHOOD_CIRCLE;
  assert.deepEqual(Array.from(circle.MEMBERS),['예린','보라','서연','나영','미래'],'소꿉친구 세트는 다섯 명으로 고정돼야 한다');
  assert.deepEqual(Array.from(context.QT_ORIGIN.PAST_CLUB.members),Array.from(circle.MEMBERS),'옛 동아리 전 연인 명단은 관계 세트와 일치해야 한다');
  assert.ok(context.QT_ORIGIN.SCHOOL_LIVES.every(school=>school.childhood.ally&&school.guideLine),'모든 학창 생활에는 고정 남자 친구와 투자 소개 대사가 있어야 한다');
  assert.equal(context.QT_ORIGIN.FIXED_SCHOOL_LIFE_ID,'collapsed_club','새 게임의 학교 과거는 선택지가 아닌 고정 기록이어야 한다');
  assert.equal(context.QT_ORIGIN.fixedSchool().childhood.ally,'시우','은둔 프롤로그에서 연락하는 학교 친구는 시우로 고정돼야 한다');
  const anchor={name:'나영',status:'friend',affection:35,trust:40};
  const life={met:[anchor]};
  circle.register(life,anchor,'athletics');
  assert.equal(anchor.childhoodFriend,true);
  assert.equal(anchor.formerClubEx,true);
  assert.equal(life.childhoodCircle.pastIncident,'mock_investment_account');
  assert.equal(life.childhoodCircle.pastStructure,'failed_shared_harem','과거는 순차 연애가 아니라 서로 알고 시작한 실패한 공동 연애여야 한다');
  assert.equal(life.childhoodCircle.collectiveFault,'protective_plan','파국의 주된 책임은 다섯의 보호 계획으로 기록돼야 한다');
  assert.equal(life.childhoodCircle.playerFault,'conflict_avoidance','플레이어 책임은 기만이 아니라 갈등 회피로 제한해야 한다');
  assert.ok(circle.MEMBERS.every(name=>!/첫 연인|두 번째|세 번째|네 번째|마지막 연인/.test(circle.META[name].role)),'다섯의 역할에 순차 전 연인 설정이 남으면 안 된다');
  assert.equal(circle.storyFor(anchor).length,3,'소꿉친구는 성인 초면과 다른 전용 3장 이야기를 가져야 한다');
  assert.equal(context.QT_CHARACTER_STORIES.get(anchor).variant,'childhood');
  assert.equal(context.QT_CHARACTER_STORIES.get({name:'나영'}).variant,'adult','같은 인물의 성인 초면 이야기는 별도 변형을 유지해야 한다');
  const stories=context.QT_CHARACTER_STORIES;
  const salvationSera={name:'윤세라',status:'partner',affection:100,trust:60,obsession:55};
  stories.chooseRomancePath(salvationSera,'pure');
  assert.equal(stories.get(salvationSera).chapters.length,8,'윤세라 개인 루트는 다른 인물 분량의 기준이 되는 8장이어야 한다');
  while(stories.next(salvationSera))stories.apply(salvationSera,'anchor');
  assert.equal(salvationSera.story.ending.route,'mutual_salvation','열린 문을 반복해 고르면 윤세라 상호구원 순애가 완성돼야 한다');
  const mutualSera={name:'윤세라',status:'partner',affection:100,trust:60,obsession:20};
  stories.chooseRomancePath(mutualSera,'pure');
  while(stories.next(mutualSera))stories.apply(mutualSera,'fuse');
  assert.equal(mutualSera.story.ending.route,'mutual_captivity','서로의 폐쇄를 반복해 고르면 상호감금 결말이 준비돼야 한다');
  assert.ok(mutualSera.mutualObsession>=5&&mutualSera.mutualCaptivityReady,'상호감금은 플레이어의 역집착 누적과 열쇠 상태를 남겨야 한다');
  assert.match(circle.line(anchor,'first'),/도망|출구/,'나영의 소꿉친구 첫 대사는 자신이 출구를 막은 책임을 인정해야 한다');
  const reunion=circle.event('reunion');
  assert.match(reunion.desc,/서로 알고 동의|보호 계획/,'재회 사건은 실패한 첫 하렘과 다섯의 책임을 명시해야 한다');
  const shadowAnchor={name:'예린',status:'ex',affection:10,trust:8};
  const shadowLife={day:1,met:[shadowAnchor]};
  circle.register(shadowLife,shadowAnchor,'student_council');
  const shadows=[2,4,6,8].map(day=>{shadowLife.day=day;return circle.foreshadow(shadowLife,day);});
  assert.ok(shadows.every(Boolean),'소꿉친구가 전면에 나오기 전에도 두 달 간격으로 차단 알림·감시 흔적이 이어져야 한다');
  assert.match(shadows.map(hint=>hint.text).join(' '),/단체방|공유 달력|상비약|우산/,'소꿉친구 복선은 문자 한 종류가 아니라 연락·생활·동선 감시로 달라야 한다');
  assert.equal(circle.monthly(shadowLife),null,'소꿉친구 5인은 최종 확장 전까지 복선만 남고 본편에 직접 등장하면 안 된다');
  shadowLife.devChildhoodFinale=true;
  assert.equal(circle.monthly(shadowLife),'reunion','개발용 최종장 플래그에서만 보존된 소꿉친구 사건을 검증할 수 있어야 한다');
  circle.resolve(shadowLife,'reunion',reunion.choices.find(choice=>choice.id==='present'));
  assert.equal(context.QT_ROMANCE_ROUTES.center(shadowLife),'childhood','다른 구원축을 전부 거른 인생에서는 소꿉친구 5인조가 중심축이 돼야 한다');
  const freedomExists={day:8,met:[{...shadowAnchor}],freedomTrio:{guildStage:1}};
  circle.register(freedomExists,freedomExists.met[0],'student_council');
  [2,4,6,8].forEach(day=>circle.foreshadow(freedomExists,day));
  assert.equal(circle.monthly(freedomExists),null,'자유인 3인조 인연이 이미 생겼다면 소꿉친구 복선이 곧바로 중심 루트 시작으로 바뀌면 안 된다');
  const severedLife={met:[{...anchor}]};
  circle.register(severedLife,severedLife.met[0],'athletics');
  circle.resolve(severedLife,'reunion',reunion.choices.find(choice=>choice.id==='sever'));
  assert.equal(severedLife.childhoodCircle.removed,true,'단체방 초대를 거부하면 소꿉친구 세트가 영구 이탈해야 한다');
  assert.equal(circle.monthly(severedLife),null,'영구 이탈한 소꿉친구 사건은 다시 예약되면 안 된다');
  circle.resolve(life,'reunion',reunion.choices[1]);
  assert.equal(life.childhoodCircle.stage,'reunited');
  assert.ok(life.childhoodCircle.pressure>0,'과거로 돌아가는 선택은 회귀 압력을 올려야 한다');
  const accountableLife={met:[{...anchor}]};
  circle.register(accountableLife,accountableLife.met[0],'athletics');
  circle.resolve(accountableLife,'reunion',reunion.choices[0]);
  assert.ok(accountableLife.childhoodCircle.accountability>0,'현재의 경계를 택하면 다섯의 책임 인정 판정이 올라야 한다');
  assert.match(circle.event('sera_collision').speakers[0][1],/계좌·약·가족·진로/,'윤세라는 공동 통제와 대비돼 상대적으로 솔직한 집착으로 보여야 한다');
  const graduation=circle.event('graduation');
  circle.resolve(life,'graduation',graduation.choices[1]);
  assert.equal(life.childhoodCircle.route,'never_graduate','위험 선택은 끝나지 않은 졸업식 결말로 이어져야 한다');
}

{
  const social=context.QT_RELATIONSHIP_SOCIAL;
  const life={
    day:12,relationship:'dating',partner:{name:'윤세라'},
    relationshipGroup:{status:'dating',members:[{name:'윤세라'},{name:'소희'},{name:'유나'}],agreement:{publicity:'public',cohabiting:false},stability:68},
    met:[
      {name:'윤세라',status:'polycule'},
      {name:'소희',status:'polycule'},
      {name:'유나',status:'polycule'},
    ],
    dangerousTrioBond:{active:true,members:['강유진','한채린','윤세라']},
    faction:{level:3,firstAttacker:'🦁 태양',defense:.2,members:[]},
    business:{owned:[{id:'one'},{id:'two'},{id:'three'}]},
    lovers:[],
  };
  const state=social.refresh(life,{businessCount:3});
  assert.equal(state.partnerCount,3,'관계 사회 상태는 실제 관계 구성원 수를 별도로 계산해야 한다');
  assert.equal(state.celebrityPartnerCount,2,'유나·소희의 대중 노출 위험을 일반 관계와 구분해야 한다');
  assert.equal(state.hasPreviouslyAttackedPartner,true,'윤세라는 과거 세력 피해자 태그를 가져야 한다');
  assert.ok(state.factionTargetRisk>=70,'유명인·세력 피해자 관계는 적대 세력의 표적 위험을 높여야 한다');
  const father=social.fatherReaction(life);
  assert.match(father.text,/학교 때 그 다섯한테서 겨우 벗어난/,'아버지는 현재 관계를 걱정할 때 소꿉친구 5인 사건을 명시적으로 기억해야 한다');
  assert.equal(social.fatherReaction(life),null,'아버지의 강한 관계 반응은 매달 반복되면 안 된다');

  const confrontation=social.seraConfrontation(life,'🦁 태양');
  const confrontationView=social.view(life,confrontation);
  assert.match(confrontationView.desc,/“윤세라\? 누구였지\.”/,'윤세라가 아니라 공격 세력이 피해자를 기억하지 못해야 한다');
  assert.match(confrontationView.line,/그 많은 피해자 이름을 우리가 어떻게 다 기억/,'상대는 플레이어가 기록을 들이민 뒤에야 과거 피해자를 알아봐야 한다');
  const confronted=social.resolve(life,confrontation,'name');
  assert.match(confronted.text,/망각 자체가 이 세력을 무너뜨릴 이유/,'세력의 망각은 플레이어가 복수할 개인적 동기로 이어져야 한다');
  assert.equal(social.seraConfrontation(life,'🦁 태양'),null,'확인한 윤세라 피해 사건은 반복 예약되면 안 된다');

  const publicEvent=social.celebrityDisclosure(life);
  assert.deepEqual(Array.from(publicEvent.names).sort(),['소희','유나'],'유명인 공개 사건은 현재 관계에 포함된 인물만 다뤄야 한다');
  assert.match(social.view(life,publicEvent).title,/장중 긴급 속보/,'유나·소희가 함께 공개되면 투자 게임의 긴급 뉴스로 보여야 한다');
  const awareness=social.rivalAwareness(life,{leader:'태양'},{businessCount:3});
  assert.equal(awareness.stage,'threat','성장한 세력과 복합 관계를 가진 플레이어는 전면전 대상으로 재분류돼야 한다');
  assert.match(social.relationshipAttackText(life,{leader:'수빈'},{businessCount:3}),/연예 기사|팬 계정|광고주/,'경쟁 세력의 공격은 현재 관계의 약점을 실제 수단으로 이용해야 한다');
}

{
  const appSource=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
  assert.match(appSource,/childhoodNightContract/,'소꿉친구 하룻밤 계약 상태가 저장돼야 한다');
  assert.match(appSource,/QT_ROMANCE_ROUTES\.engage\(L,'dangerous','sera_cohabit'\)/,'윤세라와 동거하면 위험 3인조가 인간관계 중심축으로 먼저 기록돼야 한다');
  assert.match(appSource,/QT_ROMANCE_ROUTES\.decline\(L,'dangerous'/,'윤세라와 동거하지 않으면 위험 3인조 중심축을 거른 상태로 남겨야 한다');
  assert.match(appSource,/monthlyChildhoodForeshadow\(L\)/,'소꿉친구가 전면 등장하기 전에도 월간 감시·연락 복선이 계속 처리돼야 한다');
  const relationshipUpdate=appSource.slice(appSource.indexOf('function updateRelationships'),appSource.indexOf('const SIGNATURE_EVENTS'));
  assert.doesNotMatch(relationshipUpdate,/CHILDHOOD_CIRCLE&&CHILDHOOD_CIRCLE\.monthly/,'현재 본편 월간 처리에서 소꿉친구 최종장 사건을 직접 예약하면 안 된다');
  assert.doesNotMatch(relationshipUpdate,/monthlyChildhoodCircleBond\(L\)/,'현재 본편에서 소꿉친구 5인의 직접 간섭 루프를 실행하면 안 된다');
  assert.match(appSource,/showChildhoodRelapseEnding\('클럽의 낯선 사람','club'\)/,'계약 뒤 클럽 하룻밤은 즉시 배드엔딩으로 연결돼야 한다');
  assert.match(appSource,/removeChildhoodCircleFromGame\(\)/,'단체방 거부 시 다섯 명을 게임 시스템에서 제거해야 한다');
  assert.doesNotMatch(appSource,/function makeCandidate/,'외출의 무작위 새 만남이 없어야 제거된 다섯 명도 후보로 재등장하지 않는다');
  assert.match(appSource,/showRelationshipSocialEvent/,'관계의 사회 반응은 설명 문서가 아니라 실제 선택 사건으로 연결돼야 한다');
  assert.match(fs.readFileSync(path.join(root,'index.html'),'utf8'),/js\/relationship_social\.js/,'관계 사회 반응 모듈이 앱보다 먼저 로드돼야 한다');
}

const finishFreedomForBusiness=life=>{
  life.freedomTrio={onlineOnlyComplete:true};
  return life;
};

{
  assert.equal(context.QT_BUSINESS_ROMANCE.introduce({},'office'),null,'한채린과 친구·연인·공동생활 관계가 아니면 사업 4인조 소개를 직접 열 수 없어야 한다');
  const independentLife={met:[],faction:{level:3},business:{owned:[]}};
  assert.ok(context.QT_BUSINESS_ROMANCE.introduce(independentLife,'office'),'충분한 독립 세력을 만든 플레이어는 자유인 결말 전에도 가명 특별 직원을 배치할 수 있어야 한다');
  const life={met:[{name:'한채린',status:'friend'}]};
  const romance=context.QT_BUSINESS_ROMANCE,state=romance.ensure(life);
  assert.ok(romance.introduce(life,'office'),'한채린과 가까워지면 초반 보상으로 사업 책임자 소개가 열려야 한다');
  assert.equal(romance.identity(life,'office').displayName,'박 매니저','자유인 결말 전에는 소개받은 직원도 가명만 보여야 한다');
  assert.equal(romance.identity(life,'office').portrait,null,'자유인 결말 전에는 소개받은 직원의 얼굴을 보여주면 안 된다');
  state.staff.office.revealed=true;
  assert.equal(romance.identity(life,'office').portrait,null,'잘못 저장된 조기 공개 상태가 있어도 자유인 결말 전에는 얼굴을 가려야 한다');
  state.staff.office.revealed=false;
  assert.equal(romance.recruit(life,'office','commerce').ok,true);
  state.staff.office.bond=30;
  state.staff.office.humanFirstCount=1;
  const businesses={owned:[{id:'commerce',typeId:'commerce',managerId:'office',specialManagerId:'office',months:6,level:2,lastNet:1000000,totalProfit:10000000,reputation:70}]};
  assert.equal(romance.monthly(life,{day:1,businessState:businesses,partnerNames:[],met:[]}),null,'사업체와 특별 직원은 있어도 자유인 결말 전에는 얼굴 공개 사건이 나오면 안 된다');
  assert.equal(romance.monthly(life,{day:2,businessState:businesses,partnerNames:[],met:[]}),null,'자유인 결말 전에는 사업 4인조 개인·공통 사건을 계속 막아야 한다');
  finishFreedomForBusiness(life);
  assert.equal(context.QT_BUSINESS_ROMANCE.identity(life,'office').displayName,'박 매니저','공개 전에는 실명 대신 직함을 보여야 한다');
  assert.equal(romance.identity(life,'office').displayName,'박 매니저','소개 뒤에도 역할 붕괴 사건 전에는 직함과 가린 얼굴을 유지해야 한다');
  const reveal=romance.monthly(life,{day:3,businessState:businesses,partnerNames:[],met:[]});
  assert.equal(reveal.kind,'reveal','사람을 우선한 위기 대응과 연속 흑자 뒤 얼굴 공개 이벤트가 발생해야 한다');
  const revealed=romance.resolve(life,reveal,'meet',100000000);
  assert.equal(revealed.revealed,true);
  assert.match(revealed.text,/연애 가능성이 열립니다/,'연락처 교환 직후 바로 연애하지 않고 개인 이야기를 요구해야 한다');
  state.staff.office.storyChapter=3;
  assert.equal(romance.canRomance(life,'박지수'),false,'연인이 없는 플레이어에게 사업 4인조 연애가 열리면 안 된다');
  assert.equal(context.QT_ROMANCE_ROUTES.engaged(life,'business'),false,'싱글 플레이어의 특별 책임자 고용·정체 공개는 연애 그룹 진입으로 기록되면 안 된다');
  const businessAppSource=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
  assert.match(businessAppSource,/managerPortrait=identity&&identity\.introduced\?\(identity\.portrait\|\|identity\.maskedScene\):null/,'가명 특별 직원에게는 얼굴 대신 가림 이미지를 선택해야 한다');
  assert.match(businessAppSource,/identity\?managerPortrait:BUSINESS\.portraitPath/,'특별 직원의 사업 카드가 일반 직원 초상화 대체 경로로 얼굴을 노출하면 안 된다');
  assert.match(businessAppSource,/managerScene=managerIdentity&&managerIdentity\.revealed\?managerIdentity\.scene:''/,'일반 사업 보고에서도 정체 공개 전 전신 장면으로 얼굴을 노출하면 안 된다');
  assert.match(businessAppSource,/function showBusinessRomanceEvent\(event\)\{\s*if\(!BUSINESS_ROMANCE\|\|!BUSINESS_ROMANCE\.prerequisiteComplete\(S\.life\)\)/,'이전 저장에 대기 중인 사업 4인조 사건도 자유인 결말 전에는 화면에 열리면 안 된다');
}

{
  const romance=context.QT_BUSINESS_ROMANCE;
  const life=finishFreedomForBusiness({met:[]}),state=romance.ensure(life);
  ['office','creative','corporate'].forEach(id=>Object.assign(state.staff[id],{introduced:true,hired:true}));
  const retaliation=romance.monthly(life,{day:1,businessState:{owned:[]},partnerNames:[],met:[],rivalName:'테스트 적대 세력'});
  assert.equal(retaliation.kind,'market-retaliation','유능한 책임자 셋 이상을 고용하면 경쟁 세력이 경제 보복해야 한다');
  const counter=romance.resolve(life,retaliation,'counter',10000000);
  assert.equal(counter.rivalCounter,true);
  const chaerinLife=finishFreedomForBusiness({met:[]}),chaerinState=romance.ensure(chaerinLife);
  ['office','creative'].forEach(id=>Object.assign(chaerinState.staff[id],{introduced:true,hired:true,revealed:true}));
  const chaerinEvent=romance.monthly(chaerinLife,{day:1,businessState:{owned:[]},partnerNames:[],met:chaerinLife.met});
  assert.equal(chaerinEvent.kind,'chaerin-board','한채린을 모르더라도 책임자가 둘 이상이면 이름과 스카우트 방식만 먼저 드러나야 한다');
}

{
  const socialLife={};
  assert.equal(context.QT_SOCIAL.attendIndustry(socialLife,'lounge').ok,false,'사교 실적 없이 상위 모임에 바로 갈 수 없어야 한다');
  context.QT_SOCIAL.attendIndustry(socialLife,'open',()=>0);
  const blocked=context.QT_SOCIAL.attendIndustry(socialLife,'lounge',()=>0);
  assert.equal(blocked.introduced,null,'한채린과 친구가 되기 전에는 사업 4인조를 정식 소개받으면 안 된다');
  assert.equal(blocked.chaerinRequired,true,'가려진 책임자를 봐도 한채린의 소개가 필요하다는 상태를 반환해야 한다');
  socialLife.met=[{name:'한채린',status:'friend'}];
  const lounge=context.QT_SOCIAL.attendIndustry(socialLife,'lounge',()=>0);
  assert.equal(lounge.introduced,'office','한채린과 연결된 상위 업계 모임은 초반에도 가명 특별 직원을 소개할 수 있어야 한다');
  assert.equal(context.QT_BUSINESS_ROMANCE.identity(socialLife,'office').portrait,null,'초반 업계 소개만으로 특별 직원 얼굴이 공개되면 안 된다');
}

{
  const romance=context.QT_BUSINESS_ROMANCE;
  const life=finishFreedomForBusiness({met:[{name:'박지수',status:'friend',affection:45,trust:25}]});
  const state=romance.ensure(life);
  Object.assign(state.staff.office,{introduced:true,hired:true,revealed:true,bond:35});
  const businesses={owned:[{
    id:'commerce',typeId:'commerce',managerId:'office',specialManagerId:'office',months:5,level:2,
    lastNet:1000000,totalProfit:10000000,reputation:70,
  }]};
  const personal=romance.monthly(life,{day:1,businessState:businesses,partnerNames:[],met:life.met});
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
  const life=finishFreedomForBusiness({met:romance.IDS.map(id=>({name:romance.profile(id).name,status:'friend',affection:80,trust:60}))});
  const state=romance.ensure(life);
  romance.IDS.forEach(id=>Object.assign(state.staff[id],{introduced:true,hired:true,revealed:true,storyChapter:3,bond:50}));
  assert.equal(romance.canRomance(life,'박지수'),false,'사업 4인조는 연인이 없는 플레이어에게 연애 후보가 되면 안 된다');
  life.met.push({name:'나래',status:'partner'});
  life.partner={name:'나래'};
  state.staff.office.temptationSeen=true;
  state.staff.creative.temptationSeen=false;
  const businesses={owned:[
    {id:'commerce',typeId:'commerce',managerId:'office',specialManagerId:'office',months:8,lastNet:1000000},
    {id:'studio',typeId:'studio',managerId:'creative',specialManagerId:'creative',months:8,lastNet:1000000},
  ]};
  const temptation=romance.monthly(life,{day:1,businessState:businesses,partnerNames:['나래'],met:life.met});
  assert.equal(temptation.kind,'temptation','기존 연인이 있을 때만 사업 책임자의 실제 비밀 제안이 발생해야 한다');
  assert.equal(temptation.pureTest,undefined,'한 사람과 사귈 때의 유혹도 충성도 테스트로 위장하면 안 된다');
  const suitor=romance.resolve(life,temptation,'meet',20000000);
  assert.equal(suitor.businessSuitor,true,'유혹 수락은 기존 연인을 내보내지 않고 비밀 관계를 시작해야 한다');
  assert.equal(state.staff.creative.secretAffair,true);
  assert.equal(suitor.rivalTakeover,undefined,'사업 담당자가 기존 연인의 자리를 강제로 빼앗으면 안 된다');
  assert.equal(romance.canRomance(life,'한이슬'),true,'비밀 관계를 수락한 담당자만 기존 연인이 있을 때 연애 진행이 가능해야 한다');
  const pureLife=finishFreedomForBusiness({met:[{name:'나래',status:'partner'}]}),pureState=romance.ensure(pureLife);
  pureLife.partner={name:'나래'};
  assert.match(romance.romanceEnding('cohabitation_refusal').detail,/경영권.*상실/,'사업 4인조가 공동 관계 거절 엔딩을 직접 소유해야 한다');
  assert.match(romance.romanceEnding('pure_affair').detail,/대표 해임/,'사업 4인조가 순애 위반 엔딩을 직접 소유해야 한다');
  Object.assign(pureState.staff.corporate,{introduced:true,hired:true,revealed:true,storyChapter:1,bond:35});
  const pureBusiness={owned:[{id:'advisory',typeId:'advisory',managerId:'corporate',specialManagerId:'corporate',months:6,lastNet:1000000,reputation:70,morale:70}]};
  const loyalty=romance.monthly(pureLife,{day:1,businessState:pureBusiness,partnerNames:['나래'],met:pureLife.met});
  assert.equal(loyalty.kind,'temptation');
  const loyaltyResult=romance.resolve(pureLife,loyalty,'boundary',20000000);
  assert.equal(loyaltyResult.loyaltyTest,false);
  assert.equal(pureState.staff.corporate.supportOnly,true,'유혹을 거절하면 연애 분기만 닫고 공개된 전문 매니저로 남아야 한다');
  assert.equal(pureState.staff.corporate.revealed,true);
  state.staff.corporate.secretAffair=true;state.staff.medical.secretAffair=true;state.managementRisk=50;
  const failing={owned:[
    {id:'advisory',typeId:'advisory',managerId:'corporate',specialManagerId:'corporate',months:8,lastNet:-1000000,reputation:25,morale:28},
    {id:'care',typeId:'care',managerId:'medical',specialManagerId:'medical',months:8,lastNet:-2000000,reputation:24,morale:25},
  ]};
  const collapse=romance.monthly(life,{day:3,businessState:failing,partnerNames:['박지수'],met:life.met});
  assert.equal(collapse.kind,'management-collapse','사적 경쟁 중 사업을 방치하면 경영 실패 분기가 열려야 한다');
  const badManagement=romance.resolve(life,collapse,'romance_first',20000000);
  assert.equal(badManagement.managementBadEnding,true,'사업 4인조의 배드엔딩은 불륜 폭로가 아니라 사업관리 실패여야 한다');

  const chapterLife={day:20,met:[
    ...romance.IDS.map(id=>({name:romance.profile(id).name,status:'friend',affection:85,trust:70})),
    {name:'강유진',status:'partner',affection:80,trust:60},
  ]};
  finishFreedomForBusiness(chapterLife);
  chapterLife.partner={name:'강유진'};
  const chapterState=romance.ensure(chapterLife);chapterState.chaerinBoardSeen=true;
  chapterState.retaliationSeen=true;
  romance.IDS.forEach(id=>Object.assign(chapterState.staff[id],{introduced:true,hired:true,revealed:true,storyChapter:3,bond:70,trust:60,secretAffair:true,temptationSeen:true}));
  const stableBusinesses={owned:[
    ...romance.IDS.map((id,index)=>({
    id:`biz-${id}`,typeId:romance.profile(id).businessId,managerId:id,specialManagerId:id,months:8,level:3,lastNet:1500000,totalProfit:10000000,reputation:70,morale:70,
    })),
    ...[0,1,2,3].map(index=>({id:`ordinary-${index}`,typeId:'commerce',managerId:'internal',months:8,level:2,lastNet:700000,totalProfit:5000000,reputation:65,morale:65})),
  ]};
  const contextFor=day=>({day,businessState:stableBusinesses,partnerNames:['강유진'],met:chapterLife.met});
  const firstQuartetChapter=romance.monthly(chapterLife,contextFor(20));
  assert.equal(firstQuartetChapter.kind,'quartet-story','자유인 3인조 완료와 무관하게 기존 연인·네 비밀 관계·안정된 사업을 갖추면 공동 감사가 열려야 한다');
  romance.resolve(chapterLife,firstQuartetChapter,'open_records',50000000);
  const disclosure=romance.monthly(chapterLife,contextFor(21));
  assert.equal(disclosure.chapterId,'disclosure_vote');
  romance.resolve(chapterLife,disclosure,'disclose_everyone',50000000);
  for(const [day,choice] of [[22,'work_only'],[23,'public_dates'],[24,'separate_funds']]){
    const event=romance.monthly(chapterLife,contextFor(day));
    assert.equal(event.kind,'quartet-story');
    romance.resolve(chapterLife,event,choice,50000000);
  }
  const finalEvent=romance.monthly(chapterLife,contextFor(25));
  assert.equal(finalEvent.chapterId,'final_audit');
  const quartetResult=romance.resolve(chapterLife,finalEvent,'sign_final_audit',50000000);
  assert.equal(quartetResult.quartet,true,'사업 4인조 마지막 공동 이야기는 전원 고백 대기 신호를 반환해야 한다');
  assert.equal(chapterState.quartet.route,'disclosure');
  assert.equal(romance.storyComplete(chapterLife),true,'공개와 3개월 보호관찰, 최종 감사를 끝내야 사업 4인조 장 완료로 판정해야 한다');
  assert.equal(romance.confessionReady(chapterLife),true,'최종 감사 완료 뒤에만 네 사람 쪽 고백이 열려야 한다');
  assert.ok(context.QT_ROMANCE_ROUTES.ensure(chapterLife).completed.business,'사업 4인조 이야기 완성은 공통 그룹 장부에 기록돼야 한다');
  romance.QUARTET_CHAPTERS.forEach(chapter=>assert.equal(fs.existsSync(path.join(root,chapter.scene.replace('./',''))),true,`${chapter.scene} 공동 컷씬이 실제로 존재해야 한다`));

  const turncoatLife={day:8,partner:{name:'나래'},met:[
    {name:'나래',status:'partner',affection:80,trust:70},
    {name:'박지수',status:'friend',affection:90,trust:70},
  ]};
  finishFreedomForBusiness(turncoatLife);
  const turncoatState=romance.ensure(turncoatLife);
  Object.assign(turncoatState,{retaliationSeen:true,chaerinBoardSeen:true});
  Object.assign(turncoatState.staff.office,{introduced:true,hired:true,revealed:true,storyChapter:3,bond:75,trust:65,secretAffair:true,temptationSeen:true});
  const turncoatBusiness={owned:[{id:'commerce',managerId:'office',specialManagerId:'office',months:10,level:3,lastNet:2000000,totalProfit:20000000,reputation:75,morale:75}]};
  const turncoat=romance.monthly(turncoatLife,{day:8,businessState:turncoatBusiness,partnerNames:['나래'],met:turncoatLife.met});
  assert.equal(turncoat.kind,'turncoat-offer','한 명과만 비밀 관계가 깊어지면 기존 관계를 직접 정리하는 전향 연애 선택이 열려야 한다');
  const turncoatResult=romance.resolve(turncoatLife,turncoat,'confess_and_leave',50000000);
  assert.equal(turncoatResult.turncoat,true);
  assert.equal(turncoatResult.breakupAll,true);

  const quartetOnlyLife=JSON.parse(JSON.stringify(chapterLife));
  delete quartetOnlyLife.businessRomance;
  delete quartetOnlyLife.romanceRoutes;
  const quartetOnlyState=romance.ensure(quartetOnlyLife);
  quartetOnlyState.retaliationSeen=true;quartetOnlyState.chaerinBoardSeen=true;
  romance.IDS.forEach(id=>Object.assign(quartetOnlyState.staff[id],{introduced:true,hired:true,revealed:true,storyChapter:3,bond:70,trust:60,secretAffair:true,temptationSeen:true}));
  romance.resolve(quartetOnlyLife,{kind:'quartet-story',chapterId:'secret_audit',day:30},'open_records',50000000);
  romance.resolve(quartetOnlyLife,{kind:'quartet-story',chapterId:'disclosure_vote',day:31},'choose_quartet',50000000);
  quartetOnlyLife.partner=null;
  quartetOnlyLife.met.find(person=>person.name==='강유진').status='ex';
  const quartetOnlyNext=romance.monthly(quartetOnlyLife,{day:32,businessState:stableBusinesses,partnerNames:[],met:quartetOnlyLife.met});
  assert.equal(quartetOnlyNext.chapterId,'final_audit','기존 관계를 정리하고 네 사람만 선택한 루트는 3개월 확장 검증을 건너뛰고 최종 감사로 가야 한다');

  const badLife=JSON.parse(JSON.stringify(quartetOnlyLife));
  delete badLife.businessRomance;delete badLife.romanceRoutes;
  const badState=romance.ensure(badLife);
  romance.IDS.forEach(id=>Object.assign(badState.staff[id],{introduced:true,hired:true,revealed:true,storyChapter:3,secretAffair:true}));
  const doubleLedger=romance.resolve(badLife,{kind:'quartet-story',chapterId:'secret_audit',day:40},'deny_records',50000000);
  assert.equal(doubleLedger.businessRouteBadEnding,true,'공동 감사에서 기록을 부정하면 이중장부 배드엔딩으로 끝나야 한다');
}

{
  const freedom=context.QT_FREEDOM_TRIO;
  const freedomAppSource=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
  const styleSource=fs.readFileSync(path.join(root,'css/style.css'),'utf8');
  const freedomQueueBody=freedomAppSource.match(/function queueNaturalFreedomEvents\(L\)\{[\s\S]*?\n\}/)[0];
  assert.ok(freedomQueueBody.indexOf('dangerousDisclosureReady')<freedomQueueBody.indexOf('FREEDOM_TRIO.queue(L)')&&freedomQueueBody.indexOf('FREEDOM_TRIO.queue(L)')<freedomQueueBody.indexOf('queuePersonal'),'자유인 큐는 관계 공개 → 공통 도입 → 개인사 교차 진행 순서여야 한다');
  assert.match(freedomAppSource,/if\(freedomPersonalStoryManaged\(m,L\)\)return/,'자유인 전용 개인사가 열린 뒤 일반 캐릭터 개인서사를 동시에 큐에 넣으면 안 된다');
  assert.match(freedomAppSource,/function showFreedomGuildEvent[\s\S]*?phone-notification-stage freedom-guild-stage/,'자유인 온라인 길드 사건도 공통 휴대폰 UI를 사용해야 한다');
  assert.match(freedomAppSource,/function showFirstCloseGuildTutorial[\s\S]*?phone-chat-screen open/,'첫 자유인 접속 장면도 공통 휴대폰 대화 화면을 사용해야 한다');
  assert.match(freedomAppSource,/function showOriginFriendReferral[\s\S]*?phone-notification-stage origin-referral-stage/,'초반 친구 메시지를 열었을 때도 자유인과 같은 전체 휴대폰 UI를 사용해야 한다');
  assert.doesNotMatch(freedomAppSource,/speaker==='플레이어'\?'outgoing':'incoming'/,'초반 휴대폰 발신 말풍선은 다른 클래스명을 사용하면 안 된다');
  assert.match(styleSource,/\.freedom-main-chat-shell\s*\{\s*width:min\(390px,100%\)/,'자유인 본편 휴대폰 폭은 다른 휴대폰과 같아야 한다');
  assert.match(freedomAppSource,/querySelector\('\.event-options,\.phone-reply-options'\)/,'자유인 본편 답장 뒤에는 휴대폰 선택지도 닫혀야 한다');
  const playFreedomPersonalCheckpoint=life=>{
    let next;
    while((next=freedom.nextPersonalEvent(life)))assert.ok(freedom.applyPersonal(life,next.id,next.event.choices[0].id),`${next.event.name} 개인사를 공통 본편 전에 완료할 수 있어야 한다`);
  };
  const guildLife={met:[]};
  assert.equal(freedom.canMeetOffline(guildLife,'채원'),false,'게임 정체 공개 전에는 자유인 3인조를 오프라인에서 만날 수 없어야 한다');
  assert.equal(freedom.canContact(guildLife,'채원'),false,'정모 전에는 실명 연락처가 열리면 안 된다');
  assert.equal(freedom.playGuild(guildLife),null);
  const firstGuild=freedom.playGuild(guildLife);
  assert.equal(firstGuild,'first_party','집에서 게임을 두 번 하면 닉네임 길드 첫 사건이 열려야 한다');
  const firstResult=freedom.resolveGuild(guildLife,firstGuild,'pace');
  assert.equal(firstResult.state.guildStage,1);
  assert.equal(firstResult.state.guildJoined,true,'첫 파티를 지키면 다음 접속 길드에 가입해야 한다');
  assert.equal(firstResult.state.guildName,'다음 접속');
  freedom.playGuild(guildLife);
  assert.equal(freedom.playGuild(guildLife),'quiet_guild');
  freedom.resolveGuild(guildLife,'quiet_guild','soup');
  freedom.playGuild(guildLife);
  assert.equal(freedom.playGuild(guildLife),null,'첫 공격과 광기 3인조 진입 판단 전에는 게임을 반복해도 현실 정모가 열리면 안 된다');
  assert.equal(freedom.ensure(guildLife).meetupDeferred,true,'막힌 정모는 사라지지 않고 2장 대기 상태로 남아야 한다');
  guildLife.faction={level:1};
  guildLife.seraHousing='reject';
  guildLife.outsideFearResolved=true;
  assert.equal(freedom.chapterTwoUnlocked(guildLife),true,'윤세라를 만난 뒤 광기 3인조를 명시적으로 거절하고 세력 설명을 마치면 2장이 열려야 한다');
  assert.equal(freedom.playGuild(guildLife),'offline_table');
  const meetupInvite=freedom.resolveGuild(guildLife,'offline_table','meetup');
  assert.equal(meetupInvite.reveal,false,'정모 약속만으로 실명과 초상화가 공개되면 안 된다');
  assert.equal(meetupInvite.meetupQueued,true,'연인이 없으면 네 사람 정모가 예약돼야 한다');
  assert.equal(freedom.nextCounselingEvent(guildLife),null,'첫 정모 전에 현실 고민 상담이 먼저 열리면 안 된다');
  assert.equal(freedom.queueFirstOuting(guildLife),true);
  freedom.deferFirstOuting(guildLife);
  assert.equal(freedom.ensure(guildLife).firstOuting,'pending','a dropped meetup must return to a retryable state');
  assert.equal(freedom.queueFirstOuting(guildLife),true,'a dropped first meetup must be queued again');
  const rescueResult=freedom.applyFirstOuting(guildLife);
  assert.equal(rescueResult.mode,'social','자유인 첫 정모는 1장 진입 판단이 끝난 뒤 2장 현실 친구 이야기로 시작해야 한다');
  assert.equal(rescueResult.reveal,true,'실명과 현실 초상화는 첫 정모를 실제로 마친 뒤에만 공개돼야 한다');
  assert.notEqual(guildLife.freedomRescueComplete,true,'자유인 정모가 윤세라 필수 조우를 건너뛰는 초반 탈출구가 되면 안 된다');
  freedom.NAMES.forEach(name=>guildLife.met.push({name,status:'friend',affection:80,trust:60,guildFriend:true}));
  assert.equal(freedom.canContact(guildLife,'채원'),true,'첫 정모 뒤에는 현실 연락처가 열려야 한다');
  assert.equal(freedom.canMeetOffline(guildLife,'채원'),true,'첫 정모 뒤에는 현실 친구로 만날 수 있어야 한다');
  assert.equal(freedom.queueCounseling(guildLife),null,'새 그룹 본편에서는 구버전 개인 상담이 별도 팝업으로 끼어들면 안 된다');
  assert.equal(freedom.nextPersonalEvent(guildLife),null,'첫 정모 뒤에는 공통 1장으로 네 사람의 현실 관계를 먼저 연결해야 한다');
  assert.equal(freedom.counselingComplete(guildLife),true,'새 그룹 본편은 단체방 장면 자체가 일상 연락을 포함해야 한다');
  assert.deepEqual(Array.from(freedom.GUILD_MEMBERS.map(member=>member.nickname)),['막차요정','무보정','쉼표']);
  const cohabitChapterLife={met:[],faction:{level:1},seraHousing:'cohabit'};
  const cohabitState=freedom.ensure(cohabitChapterLife);
  Object.assign(cohabitState,{guildStage:2,gameSessions:6,guildJoined:true});
  assert.equal(freedom.playGuild(cohabitChapterLife),null,'윤세라 동거를 택했다면 광기 3인조 본편 결말 전 정모를 앞질러 갈 수 없어야 한다');
  cohabitChapterLife.dangerousTrio={ending:{id:'friends'}};
  assert.equal(freedom.playGuild(cohabitChapterLife),'offline_table','광기 3인조 본편 결말 뒤에는 자유인 정모가 2장으로 이어져야 한다');
  const groupChat=context.QT_GROUP_CHAT;
  const hiddenChatLife={met:[],freedomTrio:{guildJoined:true,guildStage:1,identityState:'hidden',firstOuting:'locked'}};
  groupChat.sync(hiddenChatLife,3);
  assert.equal(groupChat.room(hiddenChatLife,'freedom').unlocked,true,'길드 가입과 동시에 다음 접속 단체방이 연락처에 생겨야 한다');
  assert.ok(groupChat.room(hiddenChatLife,'freedom').messages.some(message=>message.sender==='막차요정'),'정모 전 단체방에는 실명 대신 게임 닉네임만 보여야 한다');
  assert.equal(groupChat.list(hiddenChatLife,3).some(room=>room.id==='dangerous'),false,'광기 3인 공동생활 전에는 위험 단체방이 먼저 생기면 안 된다');

  const storyChatLife={
    met:freedom.NAMES.map(name=>({name,status:'friend',affection:35,trust:30})),
    freedomTrio:{guildJoined:true,guildStage:3,identityState:'revealed',firstOuting:'seen',guildWarmth:45},
  };
  const photoChapter=freedom.CHAPTERS.find(chapter=>chapter.id==='ordinary_photos');
  groupChat.sync(storyChatLife,7);
  groupChat.presentFreedomChapter(storyChatLife,photoChapter,7);
  const photoRoom=groupChat.room(storyChatLife,'freedom');
  assert.equal(photoRoom.messages.filter(message=>message.kind==='photo').length,3,'본편 사진 장은 채원·유나·소희의 새 사진 세 장을 지속형 단체방에 남겨야 한다');
  groupChat.recordFreedomChoice(storyChatLife,photoChapter,photoChapter.choices[0],7);
  assert.equal(groupChat.privateLeaksForChapter(storyChatLife,'ordinary_photos').length,3,'공개 사진 뒤에는 세 사람 모두 서로 다른 개인 DM으로 본심을 흘려야 한다');
  assert.equal(groupChat.privateLeaksForChapter(storyChatLife,'ordinary_photos').length,0,'개인 DM 후속은 새로 열 때마다 중복 생성되면 안 된다');
  storyChatLife.dangerousTrioBond={active:true};
  const firstTakeover=groupChat.queueNext(storyChatLife,8);
  groupChat.cancelQueued(storyChatLife,firstTakeover.id);
  const takeover=groupChat.queueNext(storyChatLife,8);
  assert.equal(takeover.id,'dangerous_phone_takeover','공동생활 중 자유인 사진 장을 마치면 휴대폰 대리 답장 사건이 열려야 한다');
  const takeoverResult=groupChat.resolveEvent(storyChatLife,takeover.id,'take_back',8);
  assert.ok(takeoverResult.room.messages.some(message=>/세라니/.test(message.text)),'유나는 세라가 대신 친 문장을 알아채고 역으로 물어야 한다');
  assert.equal(storyChatLife.freedomTrio.phoneBoundarySet,true,'플레이어가 휴대폰을 되찾으면 이후 직접 답장 경계를 저장해야 한다');

  const legacyOrderLife={met:freedom.NAMES.map(name=>({name,status:'friend',affection:70,trust:50})),freedomTrio:{groupArcVersion:2,active:true,encountered:true,stage:3,firstOuting:'seen',identityState:'revealed',history:[],personal:{}}};
  const migratedOrder=freedom.ensure(legacyOrderLife);
  assert.equal(migratedOrder.groupArcVersion,3);
  assert.equal(migratedOrder.active,true,'구버전에서 이미 시작한 공통 본편은 진행 기록을 잃지 않아야 한다');
  assert.equal(migratedOrder.stage,3,'구버전 공통 진행도는 유지하되 다음 장 전에 빠진 개인사를 삽입해야 한다');
  assert.equal(migratedOrder.reorderedFromStage,3,'이관 전 공통 진행도는 진단용으로 보존해야 한다');
  assert.equal(freedom.next(legacyOrderLife),null,'빠진 개인사를 마치기 전에는 구버전 공통 다음 장이 재생되면 안 된다');
  playFreedomPersonalCheckpoint(legacyOrderLife);
  assert.equal(freedom.individualStoriesComplete(legacyOrderLife),true);
  assert.ok(freedom.next(legacyOrderLife),'개인사를 보충한 뒤 저장된 공통 진행도에서 이어져야 한다');

  const onlineLife={met:[{name:'나래',status:'partner',affection:80,trust:70}],partner:{name:'나래'},faction:{level:1},seraHousing:'reject',outsideFearResolved:true};
  const onlineState=freedom.ensure(onlineLife);
  onlineState.guildStage=2;onlineState.gameSessions=6;onlineState.guildJoined=true;
  const onlineResult=freedom.resolveGuild(onlineLife,'offline_table','meetup');
  assert.equal(onlineResult.onlineOnly,true,'현재 연인이 정확히 한 명이면 정모를 눌러도 온라인 친구 결말로 정리돼야 한다');
  assert.equal(onlineResult.blockedReason,'exclusive_partner');
  assert.equal(onlineState.identityState,'hidden','온라인 친구 결말에서는 실명·직업·현실 초상화를 숨겨야 한다');
  assert.equal(onlineState.firstOuting,'blocked');
  assert.equal(freedom.storyComplete(onlineLife),true,'온라인 친구 유지는 실패가 아닌 정상적인 장 완료여야 한다');
  assert.equal(freedom.confessionReady(onlineLife),false,'온라인 친구 결말에서 개인·공동 고백이 열리면 안 된다');
  assert.equal(freedom.marketRumorAvailable(onlineLife),false,'정체를 모르는 온라인 친구가 현실 주식 소문 조력자로 바뀌면 안 된다');
  assert.equal(context.QT_ROMANCE_ROUTES.engaged(onlineLife,'freedom'),false,'온라인 친구 결말이 후속 그룹의 중심축을 계속 점유하면 안 된다');

  const changedLife={met:[],faction:{level:1},seraHousing:'reject',outsideFearResolved:true};
  const changedState=freedom.ensure(changedLife);
  changedState.guildStage=2;changedState.gameSessions=6;changedState.guildJoined=true;
  freedom.resolveGuild(changedLife,'offline_table','meetup');
  changedLife.met.push({name:'나래',status:'partner'});
  context.QT_RELATIONSHIPS.startRelationship(changedLife,changedLife.met[0]);
  const changedResult=freedom.applyFirstOuting(changedLife);
  assert.equal(changedResult.blocked,true,'정모 예약 뒤 단독 연인이 생기면 당일 정모가 강행되면 안 된다');
  assert.equal(changedState.identityState,'hidden');
  assert.equal(changedState.onlineOnlyComplete,true,'관계가 바뀐 경우에도 온라인 친구 정상 결말로 수렴해야 한다');

  const sharedLife={met:[],dangerousTrioBond:{active:true},faction:{level:1},seraHousing:'cohabit',outsideFearResolved:true};
  const sharedState=freedom.ensure(sharedLife);
  sharedState.guildStage=2;sharedState.gameSessions=6;sharedState.guildJoined=true;
  const sharedInvite=freedom.resolveGuild(sharedLife,'offline_table','meetup');
  assert.equal(sharedInvite.meetupQueued,true,'광기 3인 공동생활 중에는 자유인 3인 정모가 허용돼야 한다');
  assert.equal(freedom.applyFirstOuting(sharedLife).reveal,true);
  freedom.NAMES.forEach(name=>sharedLife.met.push({name,status:'friend',affection:40,trust:30}));
  assert.equal(freedom.dangerousDisclosureReady(sharedLife),true,'공동생활 사실은 개인 감정이 깊어지기 전에 첫 정모 직후 직접 공개해야 한다');
  assert.ok(freedom.applyDangerousDisclosure(sharedLife,'full'),'첫 정모 뒤 공개 선택이 실제 관계 공개 상태로 저장돼야 한다');
  assert.equal(sharedState.relationshipDisclosure,'full');

  const life={
    met:freedom.NAMES.map(name=>({name,status:'friend',affection:70,trust:45})),
    polycule:{members:[]},
  };
  const state=freedom.ensure(life);
  state.guildStage=freedom.GUILD_EVENTS.length;
  state.guildJoined=true;
  state.entryOutcome='offline';
  state.identityState='revealed';
  state.firstOuting='seen';
  assert.equal(freedom.eligibility(life).ok,true,'첫 정모 뒤에는 네 사람을 연결하는 공통 1장이 먼저 열려야 한다');
  const exclusiveLife=JSON.parse(JSON.stringify(life));
  exclusiveLife.met.push({name:'나래',status:'partner',affection:80,trust:70});
  context.QT_RELATIONSHIPS.startRelationship(exclusiveLife,exclusiveLife.met.at(-1));
  assert.equal(freedom.relationshipMode(exclusiveLife).exclusive,true,'단독 연인이 있으면 관계 상태를 독점 연애로 판정해야 한다');
  assert.equal(freedom.eligibility(exclusiveLife).ok,false,'단독 연인이 있을 때 자유인 3인조는 친구로만 남아야 한다');
  const dangerousPendingLife=JSON.parse(JSON.stringify(life));
  dangerousPendingLife.seraHousing='cohabit';
  dangerousPendingLife.dangerousTrio={badFriendsFormed:true};
  assert.equal(freedom.eligibility(dangerousPendingLife).dangerousPriority,true,'위험한 3인조의 중심 사건이 남아 있으면 자유인 공동 결말이 먼저 열리면 안 된다');
  dangerousPendingLife.dangerousTrioBond={active:true};
  assert.equal(freedom.relationshipMode(dangerousPendingLife).canAdvance,true,'위험한 3인조 공동생활이 성립하면 자유인 3인조가 아치에너미이자 다음 장으로 진전할 수 있어야 한다');
  assert.equal(freedom.start(life).ok,true);
  assert.ok(freedom.apply(life,'same_names'));
  assert.equal(freedom.next(life),null,'공통 1장 뒤에는 세 사람의 1차 개인사를 먼저 봐야 한다');
  playFreedomPersonalCheckpoint(life);
  assert.equal(freedom.personalCheckpointComplete(life,1),true);
  assert.ok(freedom.apply(life,'resume_later'));
  assert.equal(freedom.next(life),null,'공통 2장 뒤에는 세 사람의 2차 개인사를 먼저 봐야 한다');
  playFreedomPersonalCheckpoint(life);
  assert.equal(freedom.individualStoriesComplete(life),true);
  for(const choiceId of ['three_promises','no_pressure','ask_and_wait','hear_everyone','shared_party'])assert.ok(freedom.apply(life,choiceId),'개인사와 연결된 자유인 공통 결론을 처리할 수 있어야 한다');
  assert.equal(state.ending.tone,'good');
  assert.equal(freedom.storyComplete(life),true,'단체방·일상 공유·짧은 약속·이탈·최종 제안을 끝내야 자유인 장 완료로 판정해야 한다');
  assert.equal(freedom.confessionReady(life),true,'좋은 공동 결말 뒤에만 자유인 쪽 고백이 열려야 한다');
  assert.equal(freedom.marketRumorAvailable(life),true,'자유인과 친구 또는 연인으로 남으면 장 완료 뒤 주식 소문을 제공해야 한다');
  const closedLife={met:freedom.NAMES.map((name,index)=>({name,status:index===0?'ex':'friend',affection:70,trust:45}))};
  const closedState=freedom.ensure(closedLife);
  closedState.guildStage=freedom.GUILD_EVENTS.length;closedState.firstOuting='seen';closedState.identityState='revealed';closedState.entryOutcome='offline';
  Object.keys(freedom.PERSONAL_EVENTS).forEach(id=>{closedState.personal[id]='seen';});
  assert.equal(freedom.resolveUnavailable(closedLife),true,'한 사람이 인연을 정리해도 끝낸 개인사는 장 완료로 정리돼 다음 그룹을 막지 않아야 한다');
  assert.equal(freedom.storyComplete(closedLife),true);
  assert.equal(freedom.confessionReady(closedLife),false,'구성원이 떠난 그룹에서는 전원 고백이 오면 안 된다');
  assert.equal(state.ending.id,'same_party','공동 관계 결말은 동거가 아니라 각자의 집과 같은 파티를 유지해야 한다');
  assert.equal(state.finalRoute,'shared');
  life.freedomTrioBond={active:true,members:freedom.NAMES.slice()};
  assert.equal(freedom.nextAftermath(life).id,'same_party_night','공동 관계 엔딩 뒤에는 각자의 집에서 이어지는 전용 후일담이 시작돼야 한다');
  for(const expected of ['same_party_night','reply_gap','dawn_meal','four_addresses']){
    const aftermath=freedom.nextAftermath(life);
    assert.equal(aftermath.id,expected);
    assert.ok(freedom.applyAftermath(life,aftermath.choices[0].id),`${expected} 후일담 선택을 처리할 수 있어야 한다`);
  }
  assert.equal(freedom.nextAftermath(life),null,'일반 공동 관계에는 한집 동거가 아닌 네 개의 후일담만 순서대로 나와야 한다');
  const recovery=freedom.recovery(life);
  assert.equal(recovery.happy>0,true);
  assert.equal(recovery.stress<0,true,'서로 연락을 유지하는 공동 관계는 월마다 스트레스를 실제로 낮춰야 한다');
  assert.equal(recovery.income,0,'각자의 집에서 연락을 이어가는 관계가 이유 없는 공동생활 수입을 만들면 안 된다');
  const separateLife={relationship:'dating',partner:{name:'채원'},met:freedom.NAMES.map(name=>({name,status:'partner'})),freedomTrioBond:{active:true,members:freedom.NAMES.slice()}};
  assert.equal(context.QT_RELATIONSHIPS.ensure(separateLife).relationshipGroup.agreement.cohabiting,false,'자유인 3인 공동 관계는 성립해도 동거 상태로 저장되면 안 된다');

  sharedState.identityState='revealed';sharedState.firstOuting='seen';sharedState.entryOutcome='offline';
  assert.equal(freedom.start(sharedLife).ok,true,'광기 3인 공동생활 중에도 자유인 단체 본편이 시작돼야 한다');
  assert.ok(freedom.apply(sharedLife,'same_names'));playFreedomPersonalCheckpoint(sharedLife);
  assert.ok(freedom.apply(sharedLife,'home_busy'));playFreedomPersonalCheckpoint(sharedLife);
  for(const choiceId of ['three_promises','confirm_disclosure','ask_and_wait','hear_everyone'])assert.ok(freedom.apply(sharedLife,choiceId),`광기 공동생활 분기 ${choiceId} 선택을 처리해야 한다`);
  const publicFinalChoice=freedom.next(sharedLife).choices.find(choice=>choice.id==='dangerous_shared');
  assert.equal(publicFinalChoice.disabled,false,'이미 공개한 저장 상태에서 마지막 공동 선택에 공개 요구 잠금이 다시 걸리면 안 된다');
  assert.ok(freedom.apply(sharedLife,'dangerous_shared'));
  assert.equal(sharedState.dangerousDisclosureComplete,true,'첫 정모 뒤 공개 기록이 본편 4장과 마지막 공동 선택까지 유지돼야 한다');
  assert.equal(sharedState.extensionActive,true,'공개 협의 선택은 즉시 엔딩이 아니라 광기 3인의 심문으로 이어져야 한다');
  for(const choiceId of ['sit_down','truth_was_full','decide_together','ask_then_release','endure_month','accept_trial','return_and_tell','accept_six_rules']){
    assert.ok(freedom.apply(sharedLife,choiceId),`여섯 사람 확장장 ${choiceId} 선택을 처리해야 한다`);
  }
  assert.equal(sharedState.extensionCompleted,true);
  assert.equal(sharedState.ending.id,'six_people_online','두 번의 시험 한 달과 여섯 사람 합의 뒤에만 확장 엔딩이 나와야 한다');
  assert.equal(sharedState.finalRoute,'shared');
  sharedLife.freedomTrioBond={active:true,members:freedom.NAMES.slice()};
  const extensionAftermath=[];
  while(freedom.nextAftermath(sharedLife)){
    const aftermath=freedom.nextAftermath(sharedLife);extensionAftermath.push(aftermath.id);
    freedom.applyAftermath(sharedLife,aftermath.choices[0].id);
  }
  assert.deepEqual(extensionAftermath,['same_party_night','reply_gap','dawn_meal','four_addresses','six_people_channel'],'광기 3인 확장 관계에서는 자유인 후일담 뒤 두 집·여섯 사람 대칭 사건이 추가돼야 한다');
  assert.equal(freedom.confessionReady(sharedLife),true,'여섯 사람 합의 뒤에는 자유인 3인의 공개 공동 관계만 최종 확정할 수 있어야 한다');

  const betrayalLife={met:freedom.NAMES.map(name=>({name,status:'friend',affection:70,trust:45})),dangerousTrioBond:{active:true}};
  const betrayalState=freedom.ensure(betrayalLife);
  betrayalState.firstOuting='seen';betrayalState.identityState='revealed';betrayalState.entryOutcome='offline';
  betrayalState.dangerousDisclosurePending=true;
  assert.ok(freedom.applyDangerousDisclosure(betrayalLife,'full'));
  assert.equal(freedom.start(betrayalLife).ok,true);
  assert.ok(freedom.apply(betrayalLife,'same_names'));playFreedomPersonalCheckpoint(betrayalLife);
  assert.ok(freedom.apply(betrayalLife,'home_busy'));playFreedomPersonalCheckpoint(betrayalLife);
  for(const choiceId of ['three_promises','confirm_disclosure','ask_and_wait','hear_everyone'])assert.ok(freedom.apply(betrayalLife,choiceId));
  const betrayal=freedom.apply(betrayalLife,'dangerous_secret');
  assert.equal(betrayal.ending.id,'octopus_fall','공동생활을 숨기고 한 사람만 고르면 문어다리 배드엔딩으로 끝나야 한다');
}

{
  const retired=['하은','수아','다은','혜진','아린'];
  assert.equal(retired.some(name=>context.QT_CHARACTER_ROSTER.CHARACTERS.some(person=>person.name===name)),false,'미구현 세트 인물은 연애 조우 풀에서 빠져야 한다');
  assert.equal(context.QT_CHARACTER_ROSTER.SPECIAL_CHARACTERS.narae.name,'나래','나래는 독립 히로인으로 유지해야 한다');
  const crossEvents=context.QT_CHARACTER_CROSS_EVENTS.EVENTS;
  assert.equal(crossEvents.some(event=>event.people.some(name=>retired.includes(name))),false,'은퇴 히로인을 필터로 숨기지 말고 교차 연애 사건 데이터 자체에서 제거해야 한다');
  for(const id of ['narae_mirae_simulation','seoyeon_haniseul_credit','bora_ohyerin_care','yerin_chaewon_departure','mirae_sohee_voice']){
    assert.ok(crossEvents.some(event=>event.id===id),`${id} 활성 인물 교차 사건이 죽은 사건 자리를 대체해야 한다`);
  }
  const voiceSource=fs.readFileSync(path.join(root,'js/character_voices.js'),'utf8');
  retired.forEach(name=>{
    const npc=context.QT_CHARACTER_ROSTER.WORLD_FACTION_NPCS.find(person=>person.name===name);
    assert.equal(!!npc&&npc.recruitable,true,`${name} 초상화와 인물은 세력 네임드 직원으로 재사용해야 한다`);
    assert.equal(context.QT_CHARACTER_STORIES.get(name),null,`${name}의 연애 개인 사건은 비활성화돼야 한다`);
    assert.equal(Object.prototype.hasOwnProperty.call(context.QT_CHARACTER_STORIES.ARCS,name),false,`${name}의 죽은 연애 ARCS 데이터도 제거해야 한다`);
    assert.equal(Object.prototype.hasOwnProperty.call(context.QT_CHARACTER_TRAITS.SYSTEMS,name),false,`${name}의 죽은 연애 고유 수치도 제거해야 한다`);
    assert.doesNotMatch(voiceSource,new RegExp(`^\\s*${name}:\\s*\\{`,'m'),`${name}의 CHARACTER_VOICES 연애 말투도 제거해야 한다`);
  });
  const appSource=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
  assert.match(appSource,/name:'prologue-guild'/,'첫 장 마감 흐름에는 자유인 길드 독백 전용 단계가 있어야 한다');
  assert.match(appSource,/mainGameStarted/,'첫 피습을 프롤로그 종료와 본편 시작 상태로 기록해야 한다');
  assert.match(appSource,/mainUnlocked\?'<button data-life-window="power"/,'첫 공격 전 세력·사업 실행 창은 잠금 카드가 아니라 렌더링 자체를 생략해야 한다');
}

{
  const life={};
  const started=context.QT_BUSINESS.start(life,'commerce',1);
  const ref=started.business;
  context.QT_BUSINESS.expansionCost(life,'commerce');
  const expanded=context.QT_BUSINESS.expand(life,'commerce');
  assert.equal(expanded.ok,true);
  assert.equal(context.QT_BUSINESS.owned(life,'commerce').level,2,'사업 확장은 다시 읽은 뒤에도 2단계로 저장돼야 한다');
  assert.equal(ref,context.QT_BUSINESS.owned(life,'commerce'),'사업 상태 정규화가 화면의 객체 참조를 갈아끼우면 안 된다');
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
  assert.equal(business.TYPES.length,13,'담당자별 12개 업종과 소형 무인 판매망을 운영할 수 있어야 한다');
  for(const managerId of Object.keys(business.STAFF).filter(id=>id!=='internal')){
    assert.equal(business.TYPES.filter(type=>type.managerId===managerId&&type.specialManagerEligible!==false).length,3,`${managerId} 담당자는 세 전문 업종을 관리해야 한다`);
  }
  const vendingType=business.typeOf('vending');
  assert.equal(vendingType.cost,25000000,'기존 자판기 운영권 가치는 무인 판매망 설립비로 유지해야 한다');
  assert.equal(vendingType.specialManagerEligible,false,'소형 무인 판매망이 특별 책임자 로맨스 슬롯을 차지하면 안 된다');

  const opened = business.start(life, 'commerce', 3);
  assert.equal(opened.ok, true);
  assert.equal(opened.manager.name, '내부 운영팀','사업 설립만으로 특별 책임자가 자동 배치되면 안 된다');
  assert.equal(opened.business.specialManagerId,null);
  assert.equal(business.start(life, 'commerce', 3).ok, false, '같은 사업체를 중복 설립하면 안 된다');

  const month = business.monthly(life, { phaseId:'boom', day:3, random:()=>0 });
  assert.equal(month.reports.length, 1);
  assert.equal(month.reports[0].manager, '내부 운영팀');
  assert.equal(Number.isFinite(month.net), true);
  assert.equal(month.event.businessEvent, true);
  const view = business.eventView(life, month.event);
  assert.equal(view.portrait, './assets/characters/mob-faction-intel.png');
  const beforeReputation = view.item.reputation;
  const decision = business.resolveEvent(life, month.event, 'absorb');
  assert.equal(decision.ok, true);
  assert.equal(decision.cash, -1200000);
  assert.equal(decision.business.reputation > beforeReputation, true);
  assert.equal(business.assetValue(life) > 0, true, '사업체 매각가치는 총재산에 포함할 수 있어야 한다');

  const assignedPortraits = [...new Set(business.TYPES.map(type => business.staffOf(type.managerId).portrait))];
  assert.deepEqual(Array.from(assignedPortraits), [
    'mob-office-neutral.png','mob-creative-neutral.png','mob-corporate.png','mob-medical.png',
  ]);
  for (const portrait of assignedPortraits) {
    assert.equal(fs.existsSync(path.join(root, 'assets', 'characters', portrait)), true, `${portrait} 모브 이미지가 실제로 존재해야 한다`);
  }
  const currentBusiness=business.owned(life,'commerce');
  const staffBefore = currentBusiness.employees;
  const netBeforeHire = business.projected(currentBusiness,'boom').net;
  const hired = business.hire(life, 'commerce', 'commerce-junior');
  assert.equal(hired.ok, true, '사업체는 이력서 선택 뒤 직원을 추가 채용할 수 있어야 한다');
  assert.equal(business.owned(life, 'commerce').employees, staffBefore + 1);
  assert.equal(business.owned(life, 'commerce').hiredStaff.includes('commerce-junior'), true);
  assert.ok(business.projected(business.owned(life,'commerce'),'boom').net > netBeforeHire, '직원 한 명을 채용하면 인건비보다 매출 기여가 커야 한다');
  const growth=business.setStrategy(life,'commerce','growth');
  assert.equal(growth.ok,true);
  assert.equal(business.owned(life,'commerce').strategy,'growth','사업별 운영 방침은 저장 상태에 남아야 한다');
  const growthPlan=business.projected(business.owned(life,'commerce'),'boom');
  business.setStrategy(life,'commerce','balanced');
  const balancedPlan=business.projected(business.owned(life,'commerce'),'boom');
  assert.ok(growthPlan.sales>balancedPlan.sales&&growthPlan.cost>balancedPlan.cost,'성장 집중은 매출과 비용을 함께 늘려야 한다');
  const levelBefore=business.owned(life,'commerce').level,netBeforeExpand=balancedPlan.net;
  const heldReference=business.owned(life,'commerce');
  business.expansionCost(life,'commerce');
  const expanded=business.expand(life,'commerce');
  assert.equal(expanded.ok,true);
  assert.equal(expanded.business,heldReference,'사업 상태 정규화가 화면이 들고 있는 사업체 객체를 갈아끼우면 안 된다');
  assert.equal(business.owned(life,'commerce').level,levelBefore+1,'확장 비용을 내면 사업 단계가 실제 저장 상태에서 올라야 한다');
  assert.ok(business.projected(business.owned(life,'commerce'),'boom').net>netBeforeExpand,'사업 확장은 다음 달 예상 순익도 높여야 한다');
  assert.equal(business.assignSpecialManager(life,'commerce','office').ok,true,'소개·계약이 끝난 특별 책임자는 업종에 별도 배치할 수 있어야 한다');
  assert.equal(business.owned(life,'commerce').specialManagerId,'office');
  const legacyVendingLife={passiveAssets:[{id:'vending'},{id:'vending'}]};
  const vendingMigration=business.migrateLegacyPassive(legacyVendingLife,7);
  assert.equal(vendingMigration.converted,1,'첫 자판기 운영권은 무인 판매망 사업체로 전환해야 한다');
  assert.equal(vendingMigration.refund,18000000,'중복 운영권은 종전 매각가로 환급해야 한다');
  assert.equal(legacyVendingLife.passiveAssets.length,0);
  assert.equal(business.owned(legacyVendingLife,'vending').startedDay,7);
  assert.ok(business.projected(business.owned(legacyVendingLife,'vending'),'recovery').net>1500000,'무인 판매망은 기존 자동수입보다 체감되는 월 순익을 내야 한다');
  assert.equal(business.assignSpecialManager(legacyVendingLife,'vending','office').ok,false,'무인 판매망에는 특별 책임자를 배치할 수 없어야 한다');
  const applicantIds=['unit-junior','unit-field','unit-lead','mystery-office','mystery-creative','mystery-corporate','mystery-medical'];
  for(const type of business.TYPES){
    const staffedLife={};business.start(staffedLife,type.id,1);
    for(let level=1;level<5;level++)assert.equal(business.expand(staffedLife,type.id).ok,true);
    for(const applicantId of applicantIds){
      const before=business.projected(business.owned(staffedLife,type.id),'crisis').net;
      assert.equal(business.hire(staffedLife,type.id,applicantId).ok,true);
      const after=business.projected(business.owned(staffedLife,type.id),'crisis').net;
      assert.ok(after>before,`${type.name}은 불황에도 ${applicantId} 채용 뒤 예상 순익이 줄면 안 된다`);
    }
  }
}

{
  const socialLife={social:{contacts:[{id:'first-unit',name:'박도진',role:'schoolfriend',origin:'faction',factionMemberId:'mentor-intel',trust:55,favor:1}]}};
  const subordinate=context.QT_SOCIAL.ensure(socialLife).contacts[0];
  assert.equal(subordinate.role,'subordinate','기존 저장의 첫 부하는 학창 친구가 아니라 세력 부하로 마이그레이션돼야 한다');
  assert.equal(context.QT_SOCIAL.isSubordinate(subordinate),true);
  assert.doesNotMatch(context.QT_SOCIAL.contactLine(subordinate),/학교|분식집|졸업/,'부하가 친구의 추억 대사를 보내면 안 된다');
  assert.deepEqual(Array.from(context.QT_SOCIAL.contactReplyOptions(subordinate,'상황 보고입니다.'),option=>option.id),['ack','order','protect','question'],'부하 답장은 확인·명령·보호·추가보고로 분리돼야 한다');
}

{
  const rival=context.QT_RIVALS.createBots().find(bot=>bot.leader==='김도현');
  assert.equal(rival.contactUnlocked,false,'새 게임의 경쟁자는 시장에 존재해도 휴대폰 연락처에는 아직 없어야 한다');
  const message=context.QT_RIVALS.contactMessage(rival,{stock:{name:'노바플레이',change:6.6}});
  assert.match(message.text,/노바플레이 수급/,'적대 세력 연락은 실제 종목을 언급해야 한다');
  assert.doesNotMatch(message.text,/어떻게 봅니까|생각입니다|살 생각/,'적대 세력이 처음 보는 플레이어에게 친구처럼 투자 의견을 구하면 안 된다');
  const noTradeWarning=context.QT_RIVALS.contactMessage(rival,{contactReason:'rival_attack',trades:0,stock:{name:'노바플레이',change:6.6}});
  assert.match(noTradeWarning.text,/시장에 다시 접속한 시간대/,'무매매 플레이의 첫 공격 경고는 존재하지 않는 호가 주문을 언급하면 안 된다');
  const tradedWarning=context.QT_RIVALS.contactMessage(rival,{contactReason:'rival_attack',trades:2,stock:{name:'노바플레이',change:6.6}});
  assert.match(tradedWarning.text,/노바플레이 호가에도 당신 계좌 흔적/,'실제 거래가 있으면 호가 추적 경고를 사용할 수 있어야 한다');
  const choices=context.QT_RIVALS.contactReplyOptions(rival,message);
  assert.match(choices[0].text,/노바플레이를 통해 내 계좌를 추적한 경로/,'적대 세력 답장은 종목 추천이 아니라 추적 경로를 역으로 캐야 한다');
  const relationBefore=rival.playerRelation||0;
  const reply=context.QT_RIVALS.resolveContact(rival,'probe',message);
  assert.doesNotMatch(reply.reply,/거래량과 현금흐름을 같이 보세요|한쪽만 보면/,'적대 세력이 플레이어에게 친절한 투자 교육을 하면 안 된다');
  assert.match(reply.reply,/정보원|흔적/,'추적 경로를 캐면 적대적인 후속 답장이 와야 한다');
  assert.ok(rival.playerRelation<relationBefore,'경쟁자를 캐묻는 답장은 경쟁 관계에도 반영돼야 한다');
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
  const resting={health:70,stress:80,fitness:10,conditions:[]};
  context.QT_HEALTH.rest(resting);
  assert.equal(resting.stress,58,'집에서 푹 쉬면 윤세라 위험 이벤트 한두 번을 상쇄할 만큼 스트레스가 회복돼야 한다');
  const quiet={health:70,stress:80,fitness:10,conditions:[]};
  context.QT_HEALTH.decompress(quiet);
  assert.equal(quiet.stress,64,'무료 마음 정리 행동도 확실한 스트레스 회복 수단이어야 한다');
}

{
  const appSource = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
  const charactersSource = fs.readFileSync(path.join(root, 'js/characters.js'), 'utf8');
  const lifeActionViewSource = fs.readFileSync(path.join(root, 'js/ui/views/life-action-view.js'), 'utf8');
  const socialNetworkSource = fs.readFileSync(path.join(root, 'js/social_network.js'), 'utf8');
  const lifeEventsSource = fs.readFileSync(path.join(root, 'js/events_life.js'), 'utf8');
  assert.match(appSource, /const LIFE_ACTIONS_PER_MONTH = 4;/, '월 행동력은 4회여야 한다');
  assert.match(appSource, /monthActionCount\(group\) \+ 1/, '같은 행동군을 다시 선택하면 횟수가 누적돼야 한다');
  assert.doesNotMatch(appSource, /monthActionUsed\(group\)\|\|lifeActionExhausted\(\)/, '이미 한 행동군이라는 이유로 버튼을 막으면 안 된다');
  assert.match(appSource, /data-act="income-work"/, '행동 허브에는 즉시 현금을 버는 선택지가 있어야 한다');
  assert.match(appSource, /function resolveIncomeWork[\s\S]{0,420}S\.capital\+=option\.pay/, '수입 행동은 자유시간을 현금으로 바꿔야 한다');
  assert.match(appSource, /positionBias\(playerPosition,meta/, '플레이어가 보유한 종목의 우호 수급을 실제 틱에 반영해야 한다');
  assert.doesNotMatch(appSource, /data-act="career-train"/, '중복된 직무교육 버튼은 제거돼야 한다');
  assert.match(appSource, /id === 'study'[\s\S]{0,160}CAREER\.train/, '자기계발이 운영 역량 성장을 도와야 한다');
  assert.match(appSource, /allowShort:true,shortSellingPower:power/, '세력 자동 공매도는 실제 공매도 체결 경로를 사용해야 한다');
  assert.match(appSource, /class="life-action-money"/, '장 마감 행동 화면에서 보유 현금이 항상 보여야 한다');
  assert.match(lifeActionViewSource, /class="life-action-wallet"/, '행동 화면의 현금 표시줄은 스크롤 본문 밖에 고정돼야 한다');
  assert.match(lifeActionViewSource, /api\.wallet\(\)/, '행동 화면은 최신 현금과 총재산 표시를 렌더링해야 한다');
  assert.doesNotMatch(lifeActionViewSource, /포기하고 주요 사건/, '남은 월 행동을 건너뛰는 버튼이 다시 생기면 안 된다');
  assert.match(lifeActionViewSource, /remaining>0\?'disabled'/, '행동 4회를 채우기 전에는 사건 단계 진행 버튼이 비활성화돼야 한다');
  assert.match(appSource, /restoreRequiredLifeActionStep/, '사건 단계로 잘못 넘어간 저장은 행동 단계로 복구해야 한다');
  assert.match(appSource, /function lifeHubHTML\(\)[\s\S]{0,420}const career=CAREER\.ensure\(L\)/, '행동 허브는 운영 역량 창을 그리기 전에 호환 career 상태를 선언해야 한다');
  assert.match(appSource, /class="asset-portfolio-strip"/, '부동산·자동수입·사업체는 공통 자산 요약을 제공해야 한다');
  assert.match(appSource, /data-life-panel="assets"/, '분산된 자산 메뉴는 하나의 별도 자산·사업 관리 창으로 통합돼야 한다');
  assert.doesNotMatch(appSource, /<summary>🏪 사업체·직원/, '사업체 메뉴가 자산 운영 밖에 중복되면 안 된다');
  assert.match(appSource, /data-act="home-life"/, '일상 행동은 집에서 보내기와 외출하기를 구분해야 한다');
  assert.match(appSource, /function showClubNight/, '클럽 스트레스 해소는 일반 히로인 조우와 분리된 행동이어야 한다');
  assert.match(appSource, /관계·연락처 변화 없음/, '클럽에서 만난 일반 여성은 히로인이나 연락처로 남지 않아야 한다');
  assert.match(appSource, /다시 만날 생각은 없어요\. 좋은 하루 보내요/, '클럽 일반 여성의 후속 연락에는 잠수 대신 정중히 거절해야 한다');
  assert.match(appSource, /내가 왜 여기까지 왔지\?/, '클럽 입구에서는 플레이어도 자신의 행동을 이해하지 못하는 망설임이 보여야 한다');
  assert.doesNotMatch(appSource, /히로인이 아닌 처음 보는 여성과 가볍게 어울립니다/, '클럽 카드가 결과를 시스템 설명처럼 미리 적어두면 안 된다');
  assert.match(appSource, /function showFactionMentorPhoneStory/, '첫 세력 공격은 장태식의 스마트폰 연락으로 이어져야 한다');
  assert.match(appSource, /seraFirstAttackEncounter:true/, '첫 공격은 랜덤 일상 사건이 아니라 윤세라 폐작업실 조우를 필수 사건으로 예약해야 한다');
  assert.match(appSource, /function queueFactionMentorAfterSera/, '윤세라 거처 선택을 끝낸 뒤에만 장태식의 세력 설명이 이어져야 한다');
  assert.match(appSource, /prologue\.firstAttackSequence='complete'/, '장태식에게 첫 부하를 받은 뒤 프롤로그 공격 연쇄 완료를 기록해야 한다');
  assert.match(appSource, /function showFactionMentorFall/, '세력 창설 직후 장태식 사망과 태식 사채라인 해산 화면이 이어져야 한다');
  assert.match(appSource, /RIVALS\.collapseFaction\(/, '장태식 세력 해산은 일반 경쟁 세력 파산과 같은 상태 변경을 사용해야 한다');
  assert.match(appSource, /function showFactionResume/, '세력 지원자는 즉시 영입되지 않고 이력서를 먼저 보여줘야 한다');
  assert.match(appSource, /data-recruit-id[\s\S]{0,250}showFactionResume/, '모집 카드 클릭은 영입 확정이 아니라 이력서 열람으로 이어져야 한다');
  assert.match(appSource, /faction-resume-hire[\s\S]{0,180}doFactionRecruit/, '이력서에서 명시적으로 영입한 뒤에만 실제 합류가 실행돼야 한다');
  assert.match(appSource, /function monthlyFactionMemberMessages/, '첫 부하는 플레이어 상태에 맞춘 월간 보고 연락을 보내야 한다');
  assert.doesNotMatch(appSource, /showDateCompanyModal/, '데이트 진입 전에 별도 동행 선택 관문을 다시 만들면 안 된다');
  assert.doesNotMatch(appSource, /class="date-companion-strip"/, '외출에서 새 인연을 뽑는 동행 선택을 다시 노출하면 안 된다');
  assert.match(appSource, /data-solo-outing=/, '외출에는 관계와 무관한 혼자 하는 활동이 있어야 한다');
  assert.match(appSource, /class="date-person-grid"/, '데이트 대상은 설명 목록이 아니라 간결한 인물 카드로 보여야 한다');
  assert.match(appSource, /class="event-options date-choice-grid"/, '데이트 행동은 장면 아래의 짧은 전용 선택 영역에 모여야 한다');
  assert.match(appSource, /S\._dateApproaches\|\|D\.DATE_APPROACHES/, '화면에 고른 성격별 데이트 행동이 결과 판정에도 그대로 사용돼야 한다');
  assert.match(appSource, /Number\.isFinite\(Number\(c\.age\)\)/, '나이가 없는 인물에게 undefined세를 표시하면 안 된다');
  assert.doesNotMatch(appSource, /maybeActivityEncounter/, '취미나 외출이 무작위 히로인 조우로 이어지면 안 된다');
  assert.doesNotMatch(appSource, /class="pixel-home|data-luxury-buy|function buyLuxuryGood|lifestylePrestige/, '그림 없는 방 꾸미기·사치품 상점·데이트 보정이 일상 화면에 남으면 안 된다');
  assert.match(appSource, /HOUSING\.home\(L\)/, '월세·전세·매매와 자산 계산에 쓰이는 실제 주거 상태는 유지해야 한다');
  assert.match(appSource, /〈\$\{guild\.guildName\|\|FREEDOM_TRIO\.GUILD_NAME\}〉 길드원들과 게임하기/, '길드 가입 뒤 집의 게임 행동은 길드원들과 게임하기로 바뀌어야 한다');
  assert.match(appSource, /class="route-card place-card solo-outing-card"/, '혼자 하는 외출은 간결한 장소 카드로 보여야 한다');
  assert.doesNotMatch(appSource, /function makeCandidate/, '외출 화면이 전체 히로인 명부에서 새 사람을 추첨하면 안 된다');
  assert.match(appSource, /이번 주에는 누구를 만나기보다, 내가 갈 곳부터 정해 보기로 했습니다/, '외출 화면은 시스템 설명 대신 플레이어의 시점으로 말해야 한다');
  assert.match(appSource, /if\(!freeOutingUnlocked\(S\.life\)\)\{showOutsideFearModal\(\)/, '윤세라와 문밖으로 나가는 이야기 전 자발적 외출은 현관 공포 장면으로 막혀야 한다');
  assert.match(appSource, /L\.outsideFearResolved\|\|L\.freedomRescueComplete/, '구버전 저장의 자유인 구원 완료 기록도 외출 해금 호환값으로 인정해야 한다');
  assert.doesNotMatch(appSource, /L\.seraHousing==='reject'\|\|metRecord\(L,'윤세라'\)/, '윤세라를 거절했거나 얼굴만 본 사실만으로 자발적 외출이 즉시 열리면 안 된다');
  assert.match(appSource, /!\['game','study'\]\.includes\(id\)&&!freeOutingUnlocked\(S\.life\)/, '외부 취미로 초반 은둔 외출 관문을 우회하면 안 된다');
  assert.match(appSource, /아직은 밖에 나가기가 무섭다/, '초반 외출 팝업은 플레이어의 은둔 상태를 직접 보여줘야 한다');
  assert.match(appSource, /제가 1층에서 기다릴게요/, '투자 컨설팅은 집에 틀어박힌 플레이어를 나래가 직접 데리러 나와야 한다');
  assert.doesNotMatch(lifeEventsSource, /life_rainy_canvas[\s\S]{0,1800}outsideFearResolved/, '윤세라를 폐작업실에서 한 번 만난 사실만으로 자유 외출이 열리면 안 된다');
  assert.match(appSource, /title:'윤세라 · 문밖에서 기다린 사람'[\s\S]{0,1800}unlockOuting:'walk_together'/, '윤세라가 자기 공포를 먼저 밝히고 함께 걷는 별도 사건이 외출을 열어야 한다');
  assert.match(appSource, /S\.life\.outsideFearResolution=\{source:'sera_opened_door',day:S\.day,choice:choice\.unlockOuting\}/, '외출 해금은 윤세라 사건의 선택과 날짜를 서사 상태로 남겨야 한다');
  assert.match(appSource, /자발적인 외출 해금 · 서로 문을 열어 준 사람/, '외출 기능이 열린 이유를 사건 결과 화면에서 명확히 보여줘야 한다');
  assert.match(appSource, /function repairOutsideFearUnlock\(L=S\.life\)[\s\S]{0,500}sera\.dangerEvents\.sera_friend==='seen'[\s\S]{0,300}else L\.outsideFearResolved=false/, '구버전 저장은 세라 친구 사건을 실제로 봤을 때만 기존 외출 해금을 보존해야 한다');
  assert.match(appSource, /formerClubEx:true/, '옛 동아리 여성 다섯은 과거 연인 기록으로 시작해야 한다');
  assert.match(appSource, /former\.status='ex'/, '옛 동아리 여성 다섯은 현재 친구가 아니라 전 연인 상태여야 한다');
  assert.match(appSource, /function showOriginFriendReferral/, '은둔 프롤로그 뒤 고정 친구의 투자지원센터 소개 장면이 있어야 한다');
  assert.match(appSource, /function applyFixedSchoolHistory/, '새 게임은 선택 없이 고정 학교 과거를 적용해야 한다');
  assert.doesNotMatch(appSource, /function showSchoolLifeModal|data-school-life|function chooseSchoolLife/, '새 게임에 학창생활 선택 UI나 선택 핸들러가 남으면 안 된다');
  assert.match(appSource, /class="phone-shell prologue-phone"/, '은둔 이유를 보여준 뒤 친구의 휴대폰 알림이 떠야 한다');
  assert.match(appSource, /class="phone-shell origin-referral-phone"/, '투자지원센터 소개 대화는 일반 설명창이 아니라 휴대폰 대화로 진행돼야 한다');
  assert.doesNotMatch(appSource, /origin-referral-skip/, '친구 연락에서 나래 첫 만남을 건너뛰는 버튼이 있으면 안 된다');
  const careerAssignSource=appSource.slice(appSource.indexOf('function assignStartingCareer'),appSource.indexOf('function unlockPrologueCareer'));
  assert.match(careerAssignSource,/const job=\{id:'none',name:'무직'\}/,'새 인생은 직업 없이 은둔 상태로 시작해야 한다');
  assert.match(careerAssignSource,/L\.job='none'/,'플레이어의 직업 상태는 무직으로 고정돼야 한다');
  assert.match(careerAssignSource,/stage:'shut_in'/,'초기 프롤로그는 집에 틀어박힌 상태를 저장해야 한다');
  assert.doesNotMatch(careerAssignSource,/const id=pick\(pool\)/,'가정·학창 선택 직후 정규 직업을 무작위 확정하면 안 된다');
  assert.match(appSource,/prologue\.careerUnlocked=true/,'투자지원 등록 완료 상태는 구버전 프롤로그 필드에도 저장돼야 한다');
  assert.doesNotMatch(appSource,/data-act="changejob"/,'월 행동 UI에 이직 선택지가 남으면 안 된다');
  assert.match(appSource,/FATHER_MONTHLY_SUPPORT = 1000000/,'아버지의 월 생활비가 명시돼야 한다');
  assert.match(appSource,/FATHER_SUPPORT_WEALTH_LIMIT = 30000000/,'아버지 생활비는 세력의 시장 주목 자산 기준에서 끝나야 한다');
  assert.match(appSource,/function updateFatherSupport\(L\)[\s\S]{0,1400}fatherSupportEnded=true[\s\S]{0,1400}지원 영구 종료/,'자립 뒤에는 자산을 잃어도 아버지 생활비가 다시 시작되면 안 된다');
  assert.match(appSource,/b\.salary = updateFatherSupport\(L\) \? FATHER_MONTHLY_SUPPORT : 0/,'월 정산은 아버지 지원 종료 상태를 실제 입금에 반영해야 한다');
  assert.match(appSource,/아버지가 이번 달 생활비/,'월 정산에서 직업 월급 대신 아버지 생활비가 안내돼야 한다');
  assert.match(appSource,/S\.life\.familyBackground='father_home'/,'새 게임의 가족 배경은 아버지 한 명으로 고정돼야 한다');
  assert.match(appSource,/생활경제연구회 모의투자 대회의 계좌번호 일부/,'첫 공격 장면은 과거 조작 장부와 현재 경쟁 세력을 연결해야 한다');
  assert.match(appSource,/fatherFirstAttackReaction/,'첫 공격 뒤 아버지의 별도 연락이 한 번 발생해야 한다');
  const referralSource=appSource.slice(appSource.indexOf('function showOriginFriendReferral'),appSource.indexOf('function closeLifeModal'));
  assert.doesNotMatch(referralSource,/윤세라/,'시작 친구는 아직 만나지 않은 윤세라를 알고 있으면 안 된다');
  assert.match(referralSource,/옛날 대회 계정/,'시작 친구의 경고는 함께 겪어 알고 있는 학창 시절 사건까지만 언급해야 한다');
  assert.match(referralSource,/엄청 예쁘다는 후기/,'시우가 투자지원센터를 알아본 데에는 나래에 대한 가벼운 사심도 있어야 한다');
  assert.match(appSource, /freeRecruit:true/, '남성 시작 친구는 무료 조력자 영입 권한을 가져야 한다');
  assert.match(appSource, /data-act="origin-ally"/, '무료 조력자는 사업체나 세력 합류 UI를 제공해야 한다');
  assert.match(appSource, /data-life-panel="investment"/, '나래는 별도의 투자 컨설팅 창을 가져야 한다');
  assert.match(appSource, /state\.skill>=70.*이슈 조기 감지/, '투자 숙련이 높아지면 이슈 조기 감지가 해금돼야 한다');
  assert.match(appSource, /data-life-panel="wellbeing"/, '취미와 건강 행동은 별도의 생활·건강 창에 있어야 한다');
  assert.match(appSource, /data-life-panel="social"/, '가족과 인맥 행동은 별도의 창에 있어야 한다');
  assert.match(appSource, /data-life-panel="power"/, '세력과 법정 행동은 별도의 창에 있어야 한다');
  assert.doesNotMatch(appSource, /class="hub-more"/, '행동 화면에 다른 행동 보기 접이식 메뉴가 남으면 안 된다');
  assert.match(appSource, /Math\.min\(Math\.max\(0,S\.capital\),30000\)/, '집에서 쉬기 실제 비용은 3만원이어야 한다');
  assert.match(appSource, /생활비 30,000 · 스트레스 -22/, '집 화면은 휴식 비용과 실제 스트레스 회복량을 함께 표시해야 한다');
  assert.match(appSource, /data-act="decompress"/, '비용 없이 스트레스를 내릴 수 있는 마음 정리 행동이 있어야 한다');
  assert.match(appSource,/data-sera-home="late-morning"/,'윤세라와 동거하면 늦은 아침 전용 집 행동이 열려야 한다');
  assert.match(appSource,/data-sera-home="keys"/,'윤세라와 열쇠·귀가 약속을 정하는 동거 행동이 있어야 한다');
  assert.match(appSource,/function showSeraRestModal\(sera\)/,'윤세라 동거 중 일반 휴식도 전용 선택 장면으로 갈라져야 한다');
  const replyPersonSource=appSource.slice(appSource.indexOf('function replyToPerson'),appSource.indexOf('function relationshipDateLine'));
  assert.match(replyPersonSource,/L\.happy=clamp\(\(L\.happy\|\|0\)\+seraHappy/,'윤세라 집착 문자에 대한 대응은 플레이어 행복도를 바꿔야 한다');
  assert.doesNotMatch(replyPersonSource,/L\.stress/,'윤세라 집착 문자 답장이 플레이어 스트레스를 직접 바꾸면 안 된다');
  const seraIntrusionSource=appSource.slice(appSource.indexOf('function maybeSeraIntrusion'),appSource.indexOf('function dangerousTrioFollowsOuting'));
  assert.match(seraIntrusionSource,/L\.happy=clamp\(\(L\.happy\|\|0\)\+happyDelta/,'윤세라의 외출 개입도 대응에 따라 행복도로 처리해야 한다');
  assert.doesNotMatch(seraIntrusionSource,/L\.stress=clamp/,'윤세라의 외출 개입이 스트레스를 강제 가산하면 안 된다');
  assert.match(appSource, /data-chat-rival=/, '연락처에 연애 상대뿐 아니라 시장 경쟁자도 표시돼야 한다');
  assert.match(appSource, /\.filter\(\(\{bot\}\)=>\s*bot\.contactUnlocked/,'경쟁자는 첫 연락·공격·직접 작전 이후에만 휴대폰 목록에 나타나야 한다');
  assert.doesNotMatch(appSource, /unlockRivalContact\(entry\.bot,'first_message'\)/,'모르는 경쟁자가 먼저 친근한 연락을 보내며 연락처를 해금하면 안 된다');
  assert.doesNotMatch(appSource, /marketFootprint=.*S\.day>=3/,'3개월이 지났다는 이유만으로 모르는 적대 세력이 연락하면 안 된다');
  assert.match(appSource, /unlockRivalContact\(rival,'rival_attack'\)/,'경쟁자는 실제 공격을 한 뒤에 연락처가 드러나야 한다');
  assert.match(appSource, /if\(SOCIAL\.isSubordinate&&SOCIAL\.isSubordinate\(c\)\)return/,'부하는 일반 친구 월간 연락 추첨에서 제외돼야 한다');
  assert.match(appSource, /targetType:'subordinate'/,'부하 보고는 일반 인맥이 아니라 전용 연락 유형으로 큐에 들어가야 한다');
  assert.match(appSource, /const subordinateRows=subordinateContacts\.map\(contactRow\)/,'휴대폰 연락처에서 부하와 사적인 친구를 별도 그룹으로 나눠야 한다');
  assert.match(appSource, /social\.contacts\.filter\(c=>!SOCIAL\.isSubordinate/,'가족·인맥 행동창에 부하를 일반 친구처럼 만나거나 부탁하는 버튼으로 노출하면 안 된다');
  assert.match(socialNetworkSource, /ROLES\.filter\(r=>!r\.personal&&!r\.faction\)/,'일반 업계 인맥 추첨에서 세력 부하 역할을 뽑으면 안 된다');
  assert.match(appSource, /message:\$\{event\.targetType\}:\$\{event\.targetId!=null/,'같은 상대의 월말 연락이 문구만 달리해 두 번 큐에 쌓이면 안 된다');
  assert.match(appSource, /person\.name==='나래'\|\|person\.special==='tutorial'/,'나래는 일반 성향 판정으로 하렘에 편입되면 안 된다');
  assert.match(appSource, /function retryBusinessManagementEnding\(\)/,'사업관리 배드엔딩에도 직전 선택으로 돌아가는 경로가 있어야 한다');
  assert.match(appSource, /const CONTACT_RULES=\{affection:12,trust:6,interactions:2,months:1\}/, '일반 인물은 호감·신뢰·교류·기간을 채워야 연락처를 줘야 한다');
  assert.match(appSource, /const people=knownPeople\.filter\(r=>r\.status!=='ex'&&hasPersonalContact\(r\)\)/, '한 번 본 사람은 연락처 목록에 바로 나타나면 안 된다');
  assert.match(appSource, /내가 차단한 연락처 · 메시지 수신 안 함/, '전 연인은 플레이어가 차단한 연락처로 보여야 한다');
  assert.match(appSource, /if\(r\.status==='ex'\)\{ensureCourtship\(r\);return;\}/, '차단한 전 연인이 월말 선연락을 보내면 안 된다');
  assert.doesNotMatch(appSource, /CHAR_TRAITS\.action/, '일반 플레이어 행동이 관계없는 인물의 고유 신뢰 수치를 올리면 안 된다');
  assert.match(appSource, /r\.status==='friend'&&hasPersonalContact\(r\)/, '정체도 연락처도 모르는 인물에게 우연한 인연 상승 사건이 뜨면 안 된다');
  assert.match(appSource, /m\.status!=='ex'&&hasPersonalContact\(m\)/, '차단한 전 연인이나 연락처 없는 인물의 근황이 월말 뉴스로 뜨면 안 된다');
  assert.match(socialNetworkSource, /집에만 있지 말고 밖에도 나가 봐라/, '아버지는 과거 연인과 재회시키기보다 현재 생활을 살라고 조언해야 한다');
  assert.doesNotMatch(socialNetworkSource, /예린이네하고 다시 연락/, '아버지가 차단한 전 연인과 다시 연락하라고 말하면 안 된다');
  assert.match(lifeEventsSource, /새 연락처는 생기지 않았지만/, '일반 외출 사건이 자동으로 히로인 연락처를 만들면 안 된다');
  assert.match(appSource, /r\.name==='윤세라'\?\.72:earlyContact\?\.10:\.16/, '위험 히로인 중 윤세라만 초반 고빈도 연락 예외여야 한다');
  assert.match(appSource,/function showSpecialFollowupMeet\(id,c,rec\)/,'강유진은 첫 조우 뒤 별도의 후속 수사를 가져야 한다');
  assert.match(appSource,/canSpecialFollowup\(yujinRecord\)/,'강유진은 첫 사건 조건이 사라져도 후속 약속이 다시 떠야 한다');
  assert.doesNotMatch(appSource,/한채린의 비서실 약속에 응한다/,'한채린 후속 이야기를 행동창의 전용 버튼으로 진행하면 안 된다');
  assert.match(appSource,/function showNaraeChaerinLead\(gathering,introducedId\)/,'나래가 사교모임 인맥 수업 뒤 한채린이 있는 자리로 안내해야 한다');
  assert.match(appSource,/gathering\.tier>=1&&SOCIAL\.ensure\(S\.life\)\.industry\.meetings>=1/,'한채린은 난이도 조정상 첫 사교모임부터 나래의 안내로 만날 수 있어야 한다');
  assert.match(appSource,/function showChaerinIndustryEncounter\(gathering,introducedId\)/,'사교모임 안에 한채린 첫 조우 장면이 있어야 한다');
  assert.match(appSource,/data-chaerin-first="tear"/,'한채린의 계약서를 직접 찢는 선택지가 있어야 한다');
  assert.match(appSource,/if\(choice==='tear'\)\{\s*rec=rememberPerson/,'계약서를 찢은 경우에만 한채린을 실제 인연으로 기록해야 한다');
  assert.match(appSource,/function showChaerinGatheringFollowup\(c,rec,gathering\)/,'계약 파기 뒤 후속 동행은 다시 사교모임 안에서 이어져야 한다');
  assert.match(appSource,/손목을 뿌리치다 실수로 뺨을 때린다/,'세 번째 동행에는 떠나기·참기와 구분된 위험한 실수 분기가 있어야 한다');
  assert.match(appSource,/function showChaerinAwakening\(rec\)/,'뺨 사건 뒤 한채린의 독백과 위험한 각성 장면이 별도로 이어져야 한다');
  assert.doesNotMatch(appSource,/한채린의 비공개 회동 제안을 받는다/,'한채린 전용 비공개 회동 버튼이 다시 생기면 안 된다');
  assert.doesNotMatch(charactersSource,/key:'chaerin_scene'/,'데이트 경로에 중복 한채린 비공개 회동이 남으면 안 된다');
  assert.match(fs.readFileSync(path.join(root,'js/character_traits.js'),'utf8'),/name:'굴복 욕구'/,'한채린 고유 수치는 아첨이 아니라 사적인 굴복 성향을 표현해야 한다');
  const chaerinStorySource=fs.readFileSync(path.join(root,'js/character_stories.js'),'utf8');
  assert.match(chaerinStorySource,/계열사 이름이 적힌 계좌/,'한채린 개인 스토리는 강유진 수사와 윤세라 원본 장부에 연결돼야 한다');
  assert.match(chaerinStorySource,/C\('command','변명 말고 네 이름으로 공개하고 피해자부터 갚으라고 명령한다'/,'한채린은 명령과 거절에 가장 크게 반응해야 한다');
  assert.match(appSource,/S\.life\.seraHousing==='cohabit'/,'윤세라 동거 중 후속 만남에는 위험 3인조 악우 변형이 있어야 한다');
  assert.match(appSource,/dangerousBadFriendsEncounters/,'동거 중 강유진·한채린 후속 만남은 악우 관계 기록을 쌓아야 한다');
  assert.match(appSource,/function queueYujinInvestigation\(housing,attacker\)/,'첫 경쟁 세력 피해 뒤 강유진의 담당 수사를 자동 예약해야 한다');
  assert.match(appSource,/if\(!L\|\|!sera\|\|!\['cohabit','separate','reject'\]\.includes/,'윤세라를 실제로 만나고 거처 선택을 끝내기 전에는 강유진 수사가 예약되면 안 된다');
  assert.match(appSource,/queueImportantEvent\(\{yujinInvestigation:true/,'강유진 첫 조우는 플레이어가 숨은 버튼을 찾는 대신 주요 사건으로 떠야 한다');
  assert.match(appSource,/eff\.seraHousing==='reject'&&L\.seraRescueOrigin\)L\.seraRescueOrigin\.ready=false/,'윤세라를 떠나보낸 뒤 같은 폐작업실 구조 사건이 반복되면 안 된다');
  assert.match(appSource,/if \(event\.yujinInvestigation\) \{ showYujinInvestigation\(false\)/,'월말 주요 사건 큐가 강유진 방문 조사 화면으로 이어져야 한다');
  const yujinInvestigationSource=appSource.slice(appSource.indexOf('function showYujinInvestigation'),appSource.indexOf('function meetSpecialPerson'));
  assert.match(yujinInvestigationSource,/if\(!sera\)\{/,'구버전 큐가 남아 있어도 윤세라를 모르는 상태에서 강유진이 이름을 언급하면 안 된다');
  assert.match(yujinInvestigationSource,/동거인입니까\? 아니면… 애인입니까\?/,'윤세라 동거 중 강유진은 관계를 자연스럽게 확인해야 한다');
  assert.match(yujinInvestigationSource,/rec\.officialContact=true/,'첫 조사에서는 강유진의 업무용 연락만 열려야 한다');
  assert.doesNotMatch(yujinInvestigationSource,/unlockPersonalContact\(rec\)/,'강유진 첫 조사에서 개인 연락처를 바로 주면 안 된다');
  assert.match(appSource,/rec\.officialContact=false;rec\.personalContactReason='후속 수사 뒤 사적인 번호 교환'/,'후속 수사를 거친 뒤에만 강유진의 개인 번호로 전환돼야 한다');
  assert.match(fs.readFileSync(path.join(root,'js/character_stories.js'),'utf8'),/동거인 확인서의 빈칸/,'강유진 첫 개인 이야기는 윤세라 동거 확인 조사에서 자연스럽게 이어져야 한다');
  assert.doesNotMatch(appSource, /첫인사를 나누고 연락처를 저장했습니다/, '첫 조우가 자동 연락처 저장으로 처리되면 안 된다');
  assert.doesNotMatch(appSource, /data-ameet="casual"/, '활동 중 첫 만남에서 곧바로 가벼운 관계를 제안하면 안 된다');
  assert.match(appSource, /room\.lastIncomingDay=S\.day/, '상대가 실제로 먼저 연락한 날짜를 기록해야 한다');
  assert.match(appSource, /answeredDay>=unansweredDay/, '답장한 연락은 방치로 판정하면 안 된다');
  assert.match(appSource, /if \(m\.idleMonths < 2\) return;/, '실제 수신 연락을 두 달 이상 방치한 경우에만 관계 감소가 시작돼야 한다');
  assert.match(appSource, /function openMonthlyMessageScreen\(host\)/, '월말 연락 알림은 복원·재렌더 뒤에도 열 수 있는 공통 진입 함수를 써야 한다');
  assert.match(appSource, /host\.onclick=click=>\{[\s\S]*closest\('#monthly-message-open'\)/, '월말 연락 알림은 화면 교체에 끊기지 않는 위임 클릭을 사용해야 한다');
  assert.match(appSource, /closest\('\[data-chat-person\]'\)/, '연락처 행의 초상화나 메시지 미리보기를 눌러도 대화방으로 들어가야 한다');
  assert.equal((appSource.match(/room\.lastReplyDay===S\.day&&!options\.popup/g)||[]).length,3,'같은 달에 여러 연락이 와도 각 월말 팝업에는 답할 수 있어야 한다');
  const monthlyOpenSource=appSource.match(/function openMonthlyMessageScreen\(host\)\{[\s\S]*?\n\}/);
  assert.ok(monthlyOpenSource,'월말 연락 열기 함수를 테스트할 수 있어야 한다');
  const monthlyOpenContext={};
  vm.createContext(monthlyOpenContext);
  vm.runInContext(`${monthlyOpenSource[0]}\nthis.openMonthlyMessageScreen=openMonthlyMessageScreen;`,monthlyOpenContext);
  const openedClasses=new Set();
  const screen={hidden:true,classList:{add:value=>openedClasses.add(value)},querySelector:()=>({scrollTop:999})};
  const opener={setAttribute:(name,value)=>{opener[name]=value;}};
  const host={querySelector:selector=>selector==='.phone-chat-screen'?screen:selector==='#monthly-message-open'?opener:null};
  assert.equal(monthlyOpenContext.openMonthlyMessageScreen(host),true,'알림 카드를 누르면 대화 화면을 열어야 한다');
  assert.equal(screen.hidden,false,'휴대폰 대화 화면의 hidden 속성을 해제해야 한다');
  assert.equal(openedClasses.has('open'),true,'모바일에서도 프레임 대기 없이 대화 화면을 즉시 표시해야 한다');
  assert.equal(opener['aria-expanded'],'true','알림 카드의 펼침 상태를 접근성 속성에도 반영해야 한다');
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

  const skipped = flow.build({
    report:{}, lifeChanges:[], relationshipChanges:[], familyChanges:[], careerChanges:[],
  });
  skipped.currentIndex=2;
  skipped.completedSteps=['month-close-summary','life-action'];
  skipped.version=4;
  const repaired=flow.normalize(JSON.parse(JSON.stringify(skipped)));
  assert.equal(flow.current(repaired).name,'life-action','버전이 최신이어도 완료 확인 없는 사건 단계 저장은 행동 선택으로 돌아와야 한다');
  assert.equal(repaired.lifeActionConfirmed,false);
  assert.equal(repaired.completedSteps.includes('life-action'),false);

  skipped.lifeActionConfirmed=true;
  const confirmed=flow.normalize(JSON.parse(JSON.stringify(skipped)));
  assert.equal(flow.current(confirmed).name,'important-events','행동 완료를 명시적으로 확인한 저장만 사건 단계에 머물러야 한다');
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
  const foundedLife={};
  const founded=context.QT_FACTION_CAMPAIGN.foundWithMentor(foundedLife,'network',8);
  assert.equal(founded.faction.level,1,'장태식의 선택 직후 세력이 즉시 1단계로 창설돼야 한다');
  assert.equal(founded.faction.storyStage,'active');
  assert.equal(founded.faction.mentor,'장태식');
  assert.equal(founded.faction.members.length,1,'선택한 노선에 맞는 첫 부하 한 명이 즉시 합류해야 한다');
  assert.equal(founded.member.sourceId,'mentor-intel');
  assert.equal(founded.faction.mentorDeathPending,true,'새 창설 흐름은 장태식 피습 후속 사건을 예약해야 한다');
  founded.faction.firstAttacker='🦁 태양';
  const fall=context.QT_FACTION_CAMPAIGN.resolveMentorFall(foundedLife,'🦁 태양',8);
  assert.equal(fall.ok,true);
  assert.equal(foundedLife.worldDeaths['장태식'].source,'faction-prologue');
  assert.equal(founded.member.revengeTarget,'🦁 태양');
  assert.equal(founded.faction.personalMotives[0].source,'taesik-death');
  assert.match(founded.member.revengeVow,/장 선생님/);
  const resume=context.QT_RIVALS.recruitOptions(foundedLife).find(candidate=>candidate.id==='mob-field').resume;
  assert.equal(resume.referrer,'강도윤','창설 부하가 추가 지원자의 이력서를 추천해야 한다');
  assert.match(resume.enemyClue,/🦁 태양/);
  assert.match(resume.history,/치료비|급여/);
  const hired=context.QT_RIVALS.recruit(foundedLife,10000000,'mob-field');
  assert.equal(hired.ok,true);
  assert.equal(hired.member.name,resume.displayName,'이력서에서 본 지원자와 실제 합류자가 같아야 한다');
  assert.equal(hired.member.resume.referrer,'강도윤');
  assert.match(hired.member.joinReason,/조직|지휘관/);
  const taesikOnly=[{name:'🤜 장태식',leader:'장태식',aggression:1,jailMonths:0,bankrupt:false}];
  assert.equal(context.QT_RIVALS.attackPlayer(taesikOnly,10000000,8),null,'스승 장태식은 플레이어의 첫 공격자가 되면 안 된다');
  const protectedStatus = context.QT_CAMPAIGN.attackStatus({
    month:3, totalWealth:100000000, monthlyProfit:20000000, rank:1,
  });
  assert.equal(protectedStatus.unlocked, false, '초반 보호 기간에는 큰돈을 벌어도 공격이 잠겨야 한다');
  const unlocked = context.QT_CAMPAIGN.attackStatus({
    month:4, totalWealth:30000000, monthlyProfit:0, rank:5,
  });
  assert.equal(unlocked.unlocked, true);
  const tracedOrder = context.QT_CAMPAIGN.attackStatus({
    month:4, totalWealth:5000000, monthlyProfit:-1000000, rank:8,
  });
  assert.equal(tracedOrder.unlocked,true,'4개월차에는 수익이 낮아도 과거 장부와 연결된 시장 복귀 기록 때문에 첫 공격이 시작돼야 한다');
  assert.match(tracedOrder.reason,/시장 재접속.*원본 장부/);
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
  const faction={bankruptcies:[]};
  const taesik={
    name:'🦈 장태식',leader:'장태식',faction:'태식 사채라인',capital:5000000,
    assets:[{name:'사무실',value:1000000}],owned:{A:10},monthlyProfit:500000,
    settlementOffer:100000,pressure:0,credibility:100,reactionStage:'stable',bankrupt:false,
  };
  const collapsed=context.QT_RIVALS.collapseFaction(
    taesik,9,'수장 장태식 사망 · 강제 해산',faction,
    {leaderDeceased:true,killedBy:'🦁 태양'}
  );
  assert.equal(collapsed.bankrupt,true);
  assert.equal(collapsed.capital,0);
  assert.deepEqual(Object.keys(collapsed.owned),[]);
  assert.equal(collapsed.assets.length,0);
  assert.equal(collapsed.leaderDeceased,true);
  assert.equal(collapsed.killedBy,'🦁 태양');
  assert.deepEqual(Array.from(faction.bankruptcies),['🦈 장태식']);
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

{
  const appSource=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
  assert.doesNotMatch(appSource,/회귀 압력<\/span>|현재 신뢰<\/span>/,'소꿉친구 내부 판정값을 숫자 계기판으로 노출하면 안 된다');
  for(const file of [
    'pixel-event-market-v1.png','pixel-event-career-v1.png','pixel-event-debt-property-v1.png',
    'pixel-event-health-incident-v1.png','pixel-event-family-life-v1.png',
    'pixel-event-love-conflict-v1.png','pixel-event-business-v1.png','pixel-event-faction-court-v1.png',
    'pixel-event-childhood-reunion-v1.png','pixel-event-childhood-pact-v1.png',
    'pixel-event-childhood-graduation-v1.png','characters/yerin-childhood-pixel-v1.png',
  ]) assert.equal(fs.existsSync(path.join(root,'assets',file)),true,`${file} 도트 컷신이 누락되면 안 된다`);
  for(const file of ['event-trio-647.png','event-trio-bed-ending.png','event-trio-meeting-2.png','event-trio-meeting-3.png','event-trio-meeting-5.png','event-trio-meeting-5_2.png','event-trio-meeting-6.png','event-trio-meeting-7.png']){
    assert.equal(fs.existsSync(path.join(root,'assets',file)),true,`${file} 공동생활 컷신이 누락되면 안 된다`);
  }
  assert.equal(fs.existsSync(path.join(root,'assets','event-trio-first-meeting.png')),false,'화풍이 맞지 않는 기존 첫 만남 컷신은 남아 있으면 안 된다');
  assert.match(context.QT_CHILDHOOD_CIRCLE.event('reunion').scene,/pixel-event-childhood-reunion-v1/);
  const motelBoundary=context.QT_CHILDHOOD_CIRCLE.event('motel_boundary');
  assert.equal(motelBoundary.choices.find(choice=>choice.id==='stop').rivalMotive,true);
  assert.equal(motelBoundary.choices.find(choice=>choice.id==='past').trait,'rewind');
  const seraCollision=context.QT_CHILDHOOD_CIRCLE.event('sera_collision');
  assert.equal(seraCollision.choices.find(choice=>choice.id==='key').trait,'rewind');
  assert.match(context.QT_CHILDHOOD_CIRCLE.event('graduation').scene,/pixel-event-childhood-graduation-v1/);
  assert.match(appSource,/freedomCasualRefused=true/,'자유인 트리오는 가벼운 만남을 거절해야 한다');
  assert.match(appSource,/FREEDOM_TRIO\.playGuild\(S\.life\)/,'집에서 게임 행동이 자유인 길드 조우를 진행해야 한다');
  assert.match(appSource,/registerFactionMotive\(\s*'childhood_circle'/,'소꿉친구 조사 사건은 세력전 동기를 만들어야 한다');
  assert.doesNotMatch(appSource,/registerFactionMotive\(\s*'freedom_trio'/,'삭제된 스캔들 구버전이 자유인 단체 줄기에 세력전 동기를 끼워 넣으면 안 된다');
  for(const file of ['event-yuna-3.png','event-yuna-4.png','event-yuna-5.png','event-chaewon-7.png','event-chaewon-9.png','event-freedom-bad-octopus.png','event-freedom-bad-repeat.png']){
    assert.equal(fs.existsSync(path.join(root,'assets',file)),true,`${file} 자유인 3인 신규 컷신이 누락되면 안 된다`);
  }
  for(const file of ['event-freedom-chat-chaewon.png','event-freedom-chat-yuna.png','event-freedom-chat-sohee.png']){
    assert.equal(fs.existsSync(path.join(root,'assets',file)),true,`${file} 자유인 단체방 일상 사진이 누락되면 안 된다`);
  }
  assert.match(fs.readFileSync(path.join(root,'index.html'),'utf8'),/js\/group_chat\.js/,'지속형 단체방 모듈이 앱보다 먼저 로드돼야 한다');
  assert.match(appSource,/presentFreedomChapter\(S\.life,chapter,S\.day\)/,'자유인 본편은 별도 일회성 창이 아니라 지속형 단체방 기록에 통합돼야 한다');
  for(const file of ['event-freedom-trio-airport.png','event-freedom-trio-scandal.png','event-freedom-trio-departures.png','event-freedom-trio-home.png','event-freedom-trio-homecoming.png','event-freedom-trio-empty-gate-ending.png','event-freedom-trio-world-tour-ending.png','event-chaewon-airport.png','event-chaewon-transfer-offer.png','event-yuna-backstage.png','event-yuna-dating-contract.png','event-sohee-backstage.png','event-sohee-overseas-audition.png']){
    assert.equal(fs.existsSync(path.join(root,'assets',file)),false,`${file} 구버전 컷신은 새 외형 전환 뒤 남아 있으면 안 된다`);
  }
  assert.match(appSource,/개인적인 전쟁/,'세력 창에서 개인적인 공격 동기를 보여줘야 한다');
  assert.match(appSource,/L\.seraRescueOrigin=Object\.assign\(\{\},previous,\{[\s\S]{0,180}ready:true/,'윤세라 조우는 첫 경쟁 세력 피해에서 필수 사건 상태로 시작해야 한다');
  assert.match(appSource,/L\.seraIntelHelper=true/,'구조된 윤세라는 세력 정보 조력자가 되어야 한다');
  assert.match(appSource,/L\.seraHousing=eff\.seraHousing/,'윤세라 구조 선택은 동거 여부를 저장해야 한다');
  assert.match(appSource,/bond\.clubEscapeAttempts=Math\.max\(0,bond\.clubEscapeAttempts\|\|0\)\+1/,'공동생활 중 클럽 시도는 경고 횟수를 누적해야 한다');
  assert.match(appSource,/bond\.clubEscapeAttempts>=3[\s\S]*showDangerousTrioClubEnding/,'클럽은 두 번의 부하 경고 뒤 세 번째 시도에만 공동 감금엔딩이어야 한다');
  assert.match(appSource,/event-trio-bed-ending\.png/,'공동생활 실패와 반복 클럽 시도 엔딩은 새 잠금방 컷신을 사용해야 한다');
  assert.match(appSource,/sera_reverse_outing:\{[\s\S]*event-sera-8\.png/,'sera-8은 외출 중 역집착에 윤세라가 당황하는 사건으로 사용해야 한다');
  assert.match(appSource,/이 정도면 너무 풀어준 거 아니야\? 아까 세 번이나 날 놓쳤잖아/,'sera-8 사건에는 플레이어가 집착 수위를 되묻는 전용 선택지가 있어야 한다');
  assert.match(appSource,/function seraCaptivityVariant\(L,r,origin\)/,'윤세라 감금 결말은 일방·상호·공개기록·이탈 상처를 구분해야 한다');
  assert.match(appSource,/const mutualInProgress=storyState&&!storyState\.completed/,'상호감금 서사를 진행 중일 때 일방 감금이 먼저 터져 루트를 막으면 안 된다');
  assert.match(appSource,/mutual_salvation[\s\S]*event-sera-story\.png/,'상호구원 완결에는 윤세라 서사 몽타주 컷을 사용해야 한다');
  for(const file of ['event-sera-lip-confession.png','event-sera-shoulder-confession.png','event-sera-mutual-captivity.png','event-sera-8.png']){
    assert.ok(fs.existsSync(path.join(root,'assets',file)),`${file} 윤세라 사건 컷신이 있어야 한다`);
  }
  assert.match(appSource,/function advancedRelationshipGroup\(\)/,'진전된 다른 그룹은 소꿉친구 재발 배드엔딩에 개입해야 한다');
  assert.match(appSource,/data-sera-response="reverse"/,'윤세라에게 역으로 집착하는 대응이 있어야 한다');
  assert.match(appSource,/차라리 조직 생활할 때가 더 좋았습니다/,'첫 부하는 위험 관계 사이의 정상인 반응을 해야 한다');
  assert.match(appSource,/function firstSubordinateWitness\(\)/,'위험 3인조 사건은 임의 목격자가 아니라 실제 첫 부하를 찾아야 한다');
  assert.doesNotMatch(appSource,/applyDangerousTrioHazardPay/,'첫 부하의 월급 두 배 요구는 농담이므로 실제 급여 처리 함수가 있으면 안 된다');
  const trioSource=fs.readFileSync(path.join(root,'js/dangerous_trio.js'),'utf8');
  assert.match(trioSource,/가짜 불화와 진짜 공조/,'위험 3인조는 겉으로만 사이 나쁜 악우여야 한다');
  assert.match(trioSource,/진짜 미친년들 같습니다/,'악우 형성 사건에는 첫 부하의 솔직한 상황 보고가 있어야 한다');
  assert.match(trioSource,/월급 두 배는 받아야겠습니다/,'잘잘못 재판 뒤 첫 부하가 위험수당을 요구해야 한다');
  assert.match(trioSource,/두 배로 되겠냐\. 세 배는 받아야지/,'플레이어도 월급 요구를 농담으로 받아칠 수 있어야 한다');
  assert.doesNotMatch(trioSource,/payRate/,'월급 농담 선택이 실제 급여 배율을 저장하면 안 된다');
  assert.match(trioSource,/id:'preference_audit'/,'세 사람은 정식 공생 전에 서로의 취향을 폭로하는 사건을 겪어야 한다');
  assert.doesNotMatch(trioSource,/id:'fault_tribunal'/,'취향 폭로와 잘잘못 재판을 별도 사건으로 반복하면 안 된다');
  assert.doesNotMatch(context.QT_DANGEROUS_TRIO.PRELUDES[0].desc,/목걸이|목줄/,'악우 형성 사건은 아직 열리지 않았을 수 있는 한채린 후반 목걸이 서사를 앞당겨 쓰면 안 된다');
  assert.match(context.QT_DANGEROUS_TRIO.PRELUDES[0].desc,/찢긴 계약서[\s\S]*사건 뒤의 안전[\s\S]*편의점/,'첫 악우 대면은 세 사람의 실제 초반 진입 사건을 한자리에 모아야 한다');
  assert.match(trioSource,/chapter:chaptersFor\(life\)\[state\.stage\]/,'광기 3인 시작 장면은 순애·공동 관계의 실제 선택 경로를 따라야 한다');
  assert.equal(context.QT_DANGEROUS_TRIO.CHAPTERS.every(chapter=>typeof chapter.playerWound==='string'&&chapter.playerWound.length>=55),true,'광기 3인 공생 본편의 모든 장은 세 사람뿐 아니라 플레이어의 결핍도 다뤄야 한다');
  assert.match(context.QT_DANGEROUS_TRIO.CHAPTERS.find(chapter=>chapter.title==='사라진 37분').desc,/설명을 미룬 채 휴대전화를 껐습니다/,'37분 실종은 우연이 아니라 갈등 앞에서 연락을 끊는 플레이어의 습관 때문에 발생해야 한다');
  const playerArcLife={met:[]};
  context.QT_DANGEROUS_TRIO.recordPlayerChoice(playerArcLife,'강유진','boundary','경계');
  context.QT_DANGEROUS_TRIO.recordPlayerChoice(playerArcLife,'강유진','depend','의존');
  context.QT_DANGEROUS_TRIO.recordPlayerChoice(playerArcLife,'윤세라','depend','의존');
  assert.equal(context.QT_DANGEROUS_TRIO.playerArcSummary(playerArcLife).mode,'delegate','개인 선택은 플레이어가 직접 마주하는지 구조받는 자리에 숨는지 누적해서 보여줘야 한다');
  assert.equal(context.QT_DANGEROUS_TRIO.ensure(playerArcLife).playerArc.history.length,3,'플레이어 결핍 선택은 개인별 이력으로 보존돼야 한다');
  assert.match(appSource,/플레이어의 결핍 · \$\{playerReflection\.title\}/,'광기 3인 개인 서사 결과에서 플레이어 자신의 선택 경향을 보여줘야 한다');
  assert.match(appSource,/플레이어 개인 아크 · \$\{playerEnding\.title\}/,'공생 결말은 세 사람의 결말과 함께 플레이어의 변화도 정리해야 한다');
  assert.equal(context.QT_DANGEROUS_TRIO.CHAPTERS.every(chapter=>typeof chapter.bridge==='string'&&chapter.bridge.length>=45),true,'광기 3인 본편의 모든 장은 앞 장의 양보가 다음 갈등으로 이어지는 연결 서사를 가져야 한다');
  const continuityLife={met:[]},continuityState=context.QT_DANGEROUS_TRIO.ensure(continuityLife);
  continuityState.history=[{stage:0,choice:'compete',tag:'fracture'}];
  assert.equal(context.QT_DANGEROUS_TRIO.continuity(continuityLife,context.QT_DANGEROUS_TRIO.CHAPTERS[1]).previous,context.QT_DANGEROUS_TRIO.CHAPTERS[0].choices[1].result,'광기 3인 다음 장은 실제 직전 선택 결과를 이어받아야 한다');
  assert.match(appSource,/지난 선택이 만든 다음 과제/,'광기 3인 본편 화면은 장면 사이의 인과를 플레이어에게 보여줘야 한다');
  for(const removed of ['yujin_control','chaerin_control','sera_control','yujin_daily1','chaerin_daily1','sera_daily1','yujin_romance3','chaerin_romance3','sera_romance3']){
    assert.doesNotMatch(appSource,new RegExp(`${removed}:\\{`),`${removed} 중복 호감 컷씬은 정식 개인 아크와 병렬로 남으면 안 된다`);
  }
  assert.match(appSource,/개인 아크 ·/,'그룹 본편은 개인 결말을 단순 완료 조건이 아니라 현재 장의 감정 전제로 보여줘야 한다');
  assert.match(trioSource,/quiet_sickday/,'공동생활 후일담에는 감시가 돌봄으로 바뀌는 정서 장면이 있어야 한다');
  assert.match(trioSource,/separate_returns/,'공동생활 후일담에는 각자가 자발적으로 돌아오는 생활 장면이 있어야 한다');
  assert.match(trioSource,/life\.seraHousing==='cohabit'/,'위험 3인조는 윤세라와 실제 동거 중일 때만 열려야 한다');
  const lifeEventsSource=fs.readFileSync(path.join(root,'js/events_life.js'),'utf8');
  assert.match(lifeEventsSource,/seraHousing:'separate'/,'윤세라를 집에서 내보내는 선택지가 있어야 한다');
  assert.match(appSource,/MARKET_CIRCUIT:\s*-0\.10/,'시장 급락 보호선은 -10%여야 한다');
  assert.match(appSource,/downsideCircuitDay === S\.day/,'개별 종목 -10% 서킷은 남은 장을 정지해야 한다');
  assert.match(appSource,/importantEventPriority\(event\)/,'월말 주요 사건은 중요도 순서로 정렬돼야 한다');
  assert.match(appSource,/prepareLifeEventOverlay\(true\)/,'휴대폰 알림은 전용 최상위 레이어로 열려야 한다');
}

{
  const triggerAppSource=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
  assert.match(triggerAppSource,/function releaseImportantEventReservation\(event\)/,'dropped events must release their module reservation');
  assert.match(triggerAppSource,/return S\._importantEvents\.includes\(event\)/,'event queue callers must receive the actual insertion result');
  assert.doesNotMatch(triggerAppSource,/if\s*\(\s*!met\.length\s*\)\s*return/,'online and route triggers must run before any real-world contact exists');
  assert.match(triggerAppSource,/if\(event\.groupConfession\)return event\.groupId\|\|null/,'group confessions must obey their route lock');
  for(const key of [
    "if(event.dangerousTrioStart)return'dangerous:start'",
    "if(event.dangerousTrioChapter)return'dangerous:chapter'",
    "if(event.dangerousTrioAftermath)return'dangerous:aftermath'",
    "if(event.freedomTrioStart)return'freedom:start'",
    "if(event.freedomTrioChapter)return'freedom:chapter'",
    "if(event.freedomTrioAftermath)return'freedom:aftermath'",
    "if(event.childhoodCircleEvent)return`childhood:${event.childhoodCircleEvent}`",
    "if(event.businessRomanceEvent)return`business-romance:"
  ])assert.ok(triggerAppSource.includes(key),`${key} must have a stable queue deduplication key`);
  assert.match(triggerAppSource,/if\(event\.dangerousTrioPrelude\|\|event\.dangerousTrioStart\|\|event\.dangerousTrioChapter\)return 88/,'광기 3인 본편은 개별 호감 컷신보다 먼저 재생돼야 한다');
  assert.match(triggerAppSource,/if\(routeQueued\)return;[\s\S]{0,180}Object\.entries\(DANGEROUS_AFFECTION_EVENTS\)/,'광기 3인 본편이 예약된 달에는 개별 호감 컷신을 함께 쌓지 않아야 한다');
  assert.match(triggerAppSource,/function repairOpeningStoryQueue\(\)/,'legacy saves must repair the missing Sera opening encounter');
  assert.match(triggerAppSource,/origin\.ready\|\|attacker\|\|L\.yujinInvestigationSeen\|\|\(L\._attackedRecently\|\|0\)>0/,'opening repair must use persisted attack evidence instead of one transient faction stage');
  assert.match(triggerAppSource,/if\(repairOpeningStoryQueue\(\)\)return/,'faction progression must yield to the repaired Sera encounter');
  assert.match(triggerAppSource,/if\(hasQueuedImportant\|\|continuingMonthClose\)showNextImportantEvent\(\)/,'closing a recovered encounter must not leak into a random life event');
  assert.match(triggerAppSource,/trades:S\.trades\|\|0,hasLongPosition:Object\.values\(S\.owned\|\|\{\}\)\.some/,'life events must know whether the player actually traded and still owns stock');
  assert.match(triggerAppSource,/contactMessage\(entry\.bot,\{day:S\.day,trades:S\.trades\|\|0/,'rival warnings must know whether the player actually traded');
  assert.match(triggerAppSource,/'home-life':'휴식'/,'the home launcher must lock after all four monthly actions are spent');
  assert.match(triggerAppSource,/circle&&circle\.anchor&&L\.devChildhoodFinale===true/,'the postponed childhood finale must not be exposed in the normal early-game story list');
  const lifeEventSource=fs.readFileSync(path.join(root,'js/events_life.js'),'utf8');
  assert.match(lifeEventSource,/id: 'inv_windfall'[\s\S]{0,300}c\.day >= 3 && c\.trades > 0 && c\.hasLongPosition/,'the stock windfall must require an established real holding');
  ['job_promo','job_side','job_coin','job_sidehustle','job_blame','job_counteroffer','moral_blame'].forEach(id=>{
    assert.doesNotMatch(lifeEventSource,new RegExp(`id:\\s*['"]${id}['"]`),`${id} must be removed from the investment-only life event pool`);
  });
  assert.match(lifeEventSource,/id: 'life_moving'[\s\S]{0,500}housingMonths >= 12[\s\S]{0,200}lastHousingRenewalMonth/,'housing renewal must wait for a real lease renewal interval');
  assert.match(triggerAppSource,/housingTenure:housing\.tenure[\s\S]{0,300}lastHousingRenewalMonth:housing\.lastRenewalMonth/,'life event context must include lease timing');
  assert.match(triggerAppSource,/function dangerousTrioFatigueHTML\(\)[\s\S]{0,1200}공동생활 피로 · 체력 -/,'month-close life actions must explain dangerous trio cohabitation fatigue');
  const businessLife={};
  const businessState=context.QT_BUSINESS_ROMANCE.ensure(businessLife);
  businessState.retaliationSeen=true;
  businessState.lastEventDay=14;
  context.QT_BUSINESS_ROMANCE.releaseReservation(businessLife,{businessRomanceEvent:true,kind:'market-retaliation',day:14});
  assert.equal(businessState.retaliationSeen,false,'a dropped one-time business story must become eligible again');
  assert.equal(businessState.lastEventDay,13,'a dropped business story must not consume the monthly story slot');
}

console.log('core regression tests: ok');
})();
