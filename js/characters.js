/* =========================================================================
 *  QuickTrade Life — 캐릭터(연애 상대) & 성격 데이터
 *  연애/결혼 상대의 직업·성격에 따라 매달 돈을 받거나 잃는다.
 *
 *  PERSONALITIES 각 항목:
 *    money  : 상대 소득 대비 매달 가계 가감 비율 (+면 돈 보탬, -면 지출)
 *    happy  : 매달 내 행복 가감
 *    charm  : 데이트 1회당 매력 보정
 *    breakup: (연애 중) 매달 이별할 확률 (없으면 0)
 *    forgive: 양다리·불륜이 들통났을 때 용서하고 관계를 이어갈 확률
 * ========================================================================= */
const PERSONALITIES = {
  frugal:    { key: 'frugal',    name: '알뜰한',     emoji: '🪙', money: +0.15, happy: 0,  charm: 0,  forgive: 0.10, confess: 0.62, breakupResist: 0.18, incident: 0.08, chastity:78, desc: '생활비를 아끼고 신뢰를 천천히 쌓음' },
  ambitious: { key: 'ambitious', name: '야망있는',   emoji: '🔥', money: +0.25, happy: -1, charm: 0,  forgive: 0.05, confess: 0.48, breakupResist: 0.32, incident: 0.20, chastity:70, desc: '성장과 성취를 중시해 관계에도 기준이 높음' },
  homebody:  { key: 'homebody',  name: '집순이',     emoji: '🏠', money: +0.05, happy: +1, charm: 0,  forgive: 0.15, confess: 0.68, breakupResist: 0.42, incident: 0.10, chastity:88, desc: '안정적인 일상과 꾸준한 연락을 중시함' },
  caring:    { key: 'caring',    name: '다정한',     emoji: '🥰', money: 0,     happy: +4, charm: +2, forgive: 0.30, confess: 0.78, breakupResist: 0.48, incident: 0.08, chastity:82, desc: '배려가 깊지만 배신에는 크게 상처받음' },
  cold:      { key: 'cold',      name: '무심한',     emoji: '🧊', money: 0,     happy: -3, charm: -1, forgive: 0.35, confess: 0.38, breakupResist: 0.12, incident: 0.18, chastity:48, desc: '독립적이고 감정 표현이 적어 가까워지기 어려움' },
  lavish:    { key: 'lavish',    name: '사치스러운', emoji: '💸', money: -0.35, happy: +2, charm: +1, forgive: 0.25, confess: 0.58, breakupResist: 0.28, incident: 0.24, chastity:32, desc: '특별한 경험을 원하고 충동적인 사고가 잦음' },
  free:      { key: 'free',      name: '자유로운',   emoji: '💔', money: -0.10, happy: +3, charm: +3, breakup: 0.12, forgive: 0.55, confess: 0.52, breakupResist: 0.08, incident: 0.30, chastity:24, desc: '매력적이지만 구속을 싫어하고 관계 변동이 큼' },
  obsessive: { key: 'obsessive', name: '불안정 애착', emoji: '🫀', money: -0.08, happy: +2, charm: +3, forgive: 0.70, confess: 0.88, breakupResist: 0.75, incident: 0.38, chastity:68, desc: '버림받는 것을 두려워해 애정과 통제가 함께 커짐' },
};

/* 연애 상대 로스터 — 연애가 시작되면 이 중 한 명이 랜덤 배정
 * gender 는 초상화(assets/characters)의 그림과 반드시 일치시킨다.
 * portrait 의 '-neutral' 부분은 표정에 따라 교체된다(characterPortrait 참고).
 * '-v2-' 는 표정별로 새로 그린 640px 버전이 있는 인물. */
const CHARACTERS = [
  { name: '서연', gender: 'f', emoji: '👩', job: '디자이너', income: 8000000, personality: 'caring', moneyStyle:'separate', datingMoneyRate:0, marriedShareRate:.30, portrait: 'seoyeon-v2-neutral.webp' },
  { name: '하은', gender: 'f', emoji: '👩', job: '간호사', income: 9000000, personality: 'frugal', moneyStyle:'support', datingMoneyRate:.04, marriedShareRate:.38, portrait: 'haeun-v2-neutral.webp' },
  { name: '예린', gender: 'f', emoji: '👩', job: '공무원', income: 7000000, personality: 'homebody', moneyStyle:'separate', datingMoneyRate:0, marriedShareRate:.34, portrait: 'yerin-v2-neutral.webp' },
  { name: '채원', gender: 'f', emoji: '👩', job: '승무원', income: 10000000, personality: 'lavish', moneyStyle:'dependent', datingMoneyRate:-.08, marriedShareRate:.20, portrait: 'chaewon-v2-neutral.webp' },
  { name: '유나', gender: 'f', emoji: '👩', job: '모델', income: 11000000, personality: 'free', moneyStyle:'dependent', datingMoneyRate:-.12, marriedShareRate:.15, portrait: 'yuna-v2-neutral.webp' },
  { name: '수아', gender: 'f', emoji: '👩', job: '교사', income: 7500000, personality: 'caring', moneyStyle:'separate', datingMoneyRate:0, marriedShareRate:.33, portrait: 'sua-v2-neutral.webp' },
  { name: '보라', gender: 'f', emoji: '👩', job: '약사', income: 13000000, personality: 'homebody', moneyStyle:'support', datingMoneyRate:.05, marriedShareRate:.40, portrait: 'bora-v2-neutral.webp' },
  { name:'다은', gender:'f', emoji:'👩‍🍳', job:'파티시에', income:8000000, personality:'caring', moneyStyle:'separate', datingMoneyRate:0, marriedShareRate:.32, portrait:'daeun-portrait.png' },
  { name:'혜진', gender:'f', emoji:'👩‍🔬', job:'연구원', income:12000000, personality:'cold', moneyStyle:'separate', datingMoneyRate:0, marriedShareRate:.38, portrait:'hyejin-portrait.png' },
  { name:'소희', gender:'f', emoji:'🎻', job:'연주자', income:8500000, personality:'free', moneyStyle:'dependent', datingMoneyRate:-.05, marriedShareRate:.20, portrait:'sohee-portrait.png' },
  { name:'아린', gender:'f', emoji:'📚', job:'편집자', income:9000000, personality:'homebody', moneyStyle:'separate', datingMoneyRate:0, marriedShareRate:.35, portrait:'arin-portrait.png' },
  { name:'나영', gender:'f', emoji:'🏋️‍♀️', job:'트레이너', income:10000000, personality:'ambitious', moneyStyle:'support', datingMoneyRate:.03, marriedShareRate:.36, portrait:'nayoung-portrait.png' },
  { name:'미래', gender:'f', emoji:'🎮', job:'게임 기획자', income:11000000, personality:'frugal', moneyStyle:'support', datingMoneyRate:.03, marriedShareRate:.37, portrait:'mirae-portrait.png' },
];

/* 남성 인물은 연애 로스터와 분리한다.
 * 경쟁 세력·언론·정보원·특별 아군으로만 등장하며 세력 영입 조건도 서로 다르다. */
const WORLD_MALE_NPCS = [
  { id:'minjun', name:'민준', gender:'m', emoji:'⚖️', job:'기업·형사 전문 변호사', portrait:'minjun-v2-neutral.webp', role:'legal', side:'ally', recruitable:true, minLevel:2, cost:7000000, upkeep:450000, loyalty:70, stats:{defense:.03,intel:.02,legal:24,income:650000}, desc:'수사와 계약 분쟁을 막아 주는 법률 참모. 외부 자문 수입도 세력에 보탠다.' },
  { id:'doyun', name:'도윤', gender:'m', emoji:'🩺', job:'응급의학과 의사', portrait:'doyun-v2-neutral.webp', role:'medical', side:'ally', recruitable:true, minLevel:2, cost:8500000, upkeep:500000, loyalty:68, stats:{defense:.02,medical:26,income:700000}, desc:'다친 조직원을 복귀시키고 건강 사고의 손실을 줄이며 협력 병원 수입을 만든다.' },
  { id:'siwoo', name:'시우', gender:'m', emoji:'💻', job:'보안 개발자', portrait:'siwoo-v2-neutral.webp', role:'intel', side:'ally', recruitable:true, minLevel:2, cost:6500000, upkeep:400000, loyalty:62, stats:{defense:.04,intel:.14,income:800000}, desc:'공격 징후와 자금 흐름을 추적하고 보안 외주 수익을 만든다.' },
  { id:'geonwoo', name:'건우', gender:'m', emoji:'📦', job:'물류업 운영자', portrait:'geonwoo-v2-neutral.webp', role:'operations', side:'ally', recruitable:true, minLevel:1, cost:4500000, upkeep:350000, loyalty:74, stats:{defense:.05,intel:.02,income:1100000}, desc:'거점과 사람을 묶어 실제 조직으로 굴러가게 만들며 가장 안정적인 사업 수입을 담당한다.' },
  { id:'jiwoo', name:'지우', gender:'m', emoji:'🕶️', job:'브로커·정보상', portrait:'jiwoo-v2-neutral.webp', role:'broker', side:'neutral', recruitable:false, stats:{intel:.10}, desc:'돈 되는 편에 붙는 회색지대 정보상. 사건에 따라 제보자나 배신자로 등장한다.' },
  { id:'subin', name:'수빈', gender:'m', emoji:'📹', job:'탐사 유튜버', portrait:'subin-v2-neutral.webp', role:'media', side:'rival', recruitable:false, stats:{intel:.08}, desc:'세력과 기업의 약점을 생방송 소재로 삼는 언론형 경쟁자.' },
  { id:'taeyang', name:'태양', gender:'m', emoji:'🦁', job:'태양캐피탈 대표', portrait:'taeyang-v2-neutral.webp', role:'leader', side:'rival', recruitable:false, stats:{defense:.12,intel:.08}, desc:'돈과 사람을 함께 사들이는 공격적인 경쟁 세력 수장.' },
  { id:'hantaeseok', name:'한태석', gender:'m', emoji:'🤜', job:'의리파 해결사', portrait:'hantaeseok-neutral.png', role:'guardian', side:'special', recruitable:true, minLevel:4, minWins:3, cost:15000000, upkeep:250000, loyalty:95, stats:{defense:.22,intel:.05,legal:8,medical:5,income:300000}, desc:'쉽게 마음을 열지 않지만 한번 사람으로 인정하면 감옥·빚·위기에서 끝까지 책임지는 특별 아군.' },
];

/* 구버전 세이브 호환 — 이름이 바뀐 인물(초상화 성별과 맞추느라 교체) */
const CHARACTER_NAME_MIGRATIONS = { '준서': '수아' };

const GENDER_LABEL = { m: '남성', f: '여성' };

/* 스토리 전용 인물 — 일반 랜덤 소개팅 풀에는 들어가지 않는다. */
const SPECIAL_CHARACTERS = {
  narae: { id:'narae', name:'나래', gender:'f', emoji:'👩', age:28, job:'투자교육 매니저', income:12000000, personality:'cold', portrait:'narae-v2-neutral.webp', romanceDifficulty:-25, special:'tutorial' },
  taesik: { id:'taesik', name:'장태식', gender:'m', emoji:'🦈', age:39, job:'사채 추심 책임자', income:0, personality:'cold', portrait:'taesik-v2-neutral.webp', special:'collector' },
  yujin: { id:'yujin', name:'강유진', gender:'f', emoji:'👮‍♀️', age:29, job:'경찰관', income:10500000, personality:'caring', moneyStyle:'separate', datingMoneyRate:0, marriedShareRate:.36, special:'police', actionOnly:true, obsession:0, obsessionGrowth:0, portrait:'yujin-neutral.png' },
  sera: { id:'sera', name:'윤세라', gender:'f', emoji:'🖤', age:25, job:'프리랜서 일러스트레이터', income:7500000, personality:'obsessive', moneyStyle:'dependent', datingMoneyRate:-.06, marriedShareRate:.18, special:'obsessive', actionOnly:true, obsession:55, obsessionGrowth:8, portrait:'sera-neutral.png' },
  chaerin: { id:'chaerin', name:'한채린', gender:'f', emoji:'👑', age:27, job:'재벌가 전략실 이사', income:60000000, personality:'ambitious', moneyStyle:'support', datingMoneyRate:.10, marriedShareRate:.50, special:'heiress', actionOnly:true, obsession:0, obsessionGrowth:0, portrait:'chaerin-neutral.png' },
};

/* 데이트 접근 방식(선택지) — 성공 판정에 mod/보정이 다르게 들어감
 *   mod       : 점수 고정 보정
 *   cost      : 추가 비용 (기본 데이트 비용에 더해짐)
 *   flexReward: 이 비용을 감당할 현금이 있으면 큰 보정(+), 없으면 역효과(-)
 *   variance  : 점수에 ±범위 랜덤 (고위험 고수익) */
const DATE_APPROACHES = [
  { key:'sincere',emoji:'💬',label:'진솔하게 가치관을 묻는다',mod:12,cost:0,desc:'신뢰를 중시하는 상대에게 효과적' },
  { key:'listen',emoji:'👂',label:'상대 이야기를 끝까지 들어준다',mod:10,cost:0,desc:'배려형·내향형에게 효과적' },
  { key:'humor',emoji:'😄',label:'가벼운 농담으로 분위기를 푼다',mod:7,cost:0,variance:12,desc:'잘 통하면 빠르게 가까워짐' },
  { key:'plan',emoji:'🗓️',label:'다음 데이트를 구체적으로 제안한다',mod:8,cost:100000,desc:'계획적이고 야망 있는 상대 선호' },
  { key:'vulnerable',emoji:'🌙',label:'요즘 힘든 고민을 솔직히 나눈다',mod:6,cost:0,variance:15,desc:'정서적 친밀감 또는 부담' },
  { key:'direct',emoji:'❤️',label:'호감을 분명하게 표현한다',mod:9,cost:0,variance:18,desc:'빠르고 솔직하지만 부담 가능' },
  { key:'flex',emoji:'💳',label:'특별한 코스를 준비한다',mod:0,cost:2000000,flexReward:28,desc:'경험과 이벤트를 중시하는 상대 선호' },
  { key:'push',emoji:'🎭',label:'일부러 여유 있는 척 밀당한다',mod:4,cost:0,variance:35,desc:'자유로운 상대 외에는 역효과 위험' },
];

/* 소개팅 경로(선택지) — 경로마다 만나는 사람의 성향 풀(pool)이 다르다.
 *   pool: 'any' 또는 성격키 배열 → 그 성향의 상대가 등장
 *   scoreMod: 그 경로에서의 데이트 성공 난이도 보정 */
const DATE_ROUTES = [
  { key:'narae', emoji:'☕', name:'나래와 커피', desc:'일과 사생활을 분명히 구분하는 사람', pool:[], fixed:'narae', cost:350000, scoreMod:0,scene:'./assets/event-narae-market-crash.png' },
  { key: 'street', emoji: '🚶', name: '번화가 산책', desc: '우연히 마주치는 다양한 사람', pool:'any', cost:120000, scoreMod:-2 },
  { key: 'office', emoji: '🏢', name: '사내연애', desc: '같은 회사 동료',         pool: 'any',                              cost: 100000,  scoreMod: 4,  needsJob: true, office: true },
  { key: 'intro',  emoji: '🤝', name: '지인 소개', desc: '안정적·진중한 사람',    pool: ['frugal', 'homebody', 'caring'],    cost: 300000,  scoreMod: 6 },
  { key: 'hobby',  emoji: '🎨', name: '취미 모임', desc: '취향이 잘 맞는 사람',   pool: ['caring', 'homebody', 'ambitious'], cost: 400000,  scoreMod: 8 },
  { key: 'club',   emoji: '🍸', name: '클럽/헌팅', desc: '화려하지만 위험한 사람', pool: ['free', 'lavish'],                 cost: 800000,  scoreMod: -6 },
  { key:'police_scene',emoji:'👮‍♀️',name:'경찰서·사건 현장',desc:'공격을 당했거나 사건·전과가 있을 때 강유진과 마주치는 특별 장면',pool:[],fixed:'yujin',cost:0,scoreMod:-5,scene:'./assets/event-yujin-rain-rescue.png',condition:(l,ctx)=>!!((l.justice&&l.justice.case)||l.criminalRecord||(ctx&&ctx.attacked))},
  { key:'chaerin_scene',emoji:'🥂',name:'세력 대표자 비공개 회동',desc:'내 세력이 2단계·조직원 3명 이상이 되면 한채린 쪽에서 먼저 접촉합니다',pool:[],fixed:'chaerin',cost:250000,scoreMod:-5,scene:'./assets/event-chaerin-contract.png',condition:(l,ctx)=>!!(ctx&&ctx.factionLevel>=2&&ctx.factionMembers>=3)},
];

/* 데이트 결과 대사(현실적) — 성공/보통/실패 티어별 랜덤 */
const DATE_LINES = {
  '성공': [
    '대화가 술술 통했다. "다음에 또 봐요"라며 환하게 웃었다.',
    '취향이 잘 맞아 시간 가는 줄 몰랐다. 2차까지 이어졌다.',
    '헤어지기 아쉬워 밤늦게까지 이야기를 나눴다.',
    '자연스럽게 연락처를 주고받았고, 벌써 답장이 왔다.',
  ],
  '보통': [
    '나쁘진 않았지만 특별한 설렘은 없었다.',
    '무난하게 밥만 먹고 헤어졌다.',
    '어색하진 않았지만 다음 약속은 못 잡았다.',
    '"오늘 즐거웠어요" 정도의 인사로 마무리했다.',
  ],
  '실패': [
    '어색한 침묵이 계속 흘렀다.',
    '대화 주제가 자꾸 끊겨서 진땀을 뺐다.',
    '"오늘 좀 피곤하네요"라며 일찍 일어섰다.',
    '연락처도 못 물어보고 그대로 헤어졌다.',
    '계산할 때 분위기가 급격히 식었다.',
  ],
};
