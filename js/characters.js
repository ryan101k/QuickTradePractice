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
  frugal:    { key: 'frugal',    name: '알뜰한',     emoji: '🪙', money: +0.15, happy: 0,  charm: 0,  forgive: 0.10, desc: '생활비를 아껴 매달 돈을 보탬' },
  ambitious: { key: 'ambitious', name: '야망있는',   emoji: '🔥', money: +0.25, happy: -1, charm: 0,  forgive: 0.05, desc: '맞벌이로 소득을 크게 보탬' },
  homebody:  { key: 'homebody',  name: '집순이',     emoji: '🏠', money: +0.05, happy: +1, charm: 0,  forgive: 0.15, desc: '집에서 알뜰살뜰, 소소한 보탬' },
  caring:    { key: 'caring',    name: '다정한',     emoji: '🥰', money: 0,     happy: +4, charm: +2, forgive: 0.30, desc: '함께 있으면 행복이 크게 오름' },
  cold:      { key: 'cold',      name: '무심한',     emoji: '🧊', money: 0,     happy: -3, charm: -1, forgive: 0.35, desc: '데면데면, 행복이 잘 안 오름' },
  lavish:    { key: 'lavish',    name: '사치스러운', emoji: '💸', money: -0.35, happy: +2, charm: +1, forgive: 0.25, desc: '씀씀이가 커서 매달 지출↑' },
  free:      { key: 'free',      name: '자유로운',   emoji: '💔', money: -0.10, happy: +3, charm: +3, breakup: 0.12, forgive: 0.55, desc: '매력적이지만 이별 위험 있음' },
};

/* 연애 상대 로스터 — 연애가 시작되면 이 중 한 명이 랜덤 배정
 * gender 는 초상화(assets/characters)의 그림과 반드시 일치시킨다.
 * portrait 의 '-neutral' 부분은 표정에 따라 교체된다(characterPortrait 참고).
 * '-v2-' 는 표정별로 새로 그린 640px 버전이 있는 인물. */
const CHARACTERS = [
  { name: '서연', gender: 'f', emoji: '👩', job: '디자이너', income: 2800000, personality: 'caring', portrait: 'seoyeon-v2-neutral.webp' },
  { name: '민준', gender: 'm', emoji: '👨', job: '변호사', income: 6000000, personality: 'ambitious', portrait: 'minjun-v2-neutral.webp' },
  { name: '지우', gender: 'm', emoji: '👨', job: '백수', income: 0, personality: 'lavish', portrait: 'jiwoo-v2-neutral.webp' },
  { name: '하은', gender: 'f', emoji: '👩', job: '간호사', income: 3200000, personality: 'frugal', portrait: 'haeun-v2-neutral.webp' },
  { name: '도윤', gender: 'm', emoji: '👨', job: '의사', income: 7000000, personality: 'cold', portrait: 'doyun-v2-neutral.webp' },
  { name: '수빈', gender: 'm', emoji: '👨', job: '유튜버', income: 1500000, personality: 'free', portrait: 'subin-v2-neutral.webp' },
  { name: '예린', gender: 'f', emoji: '👩', job: '공무원', income: 2200000, personality: 'homebody', portrait: 'yerin-v2-neutral.webp' },
  { name: '시우', gender: 'm', emoji: '👨', job: '개발자', income: 4000000, personality: 'ambitious', portrait: 'siwoo-v2-neutral.webp' },
  { name: '채원', gender: 'f', emoji: '👩', job: '승무원', income: 3000000, personality: 'lavish', portrait: 'chaewon-v2-neutral.webp' },
  { name: '건우', gender: 'm', emoji: '👨', job: '자영업', income: 2500000, personality: 'frugal', portrait: 'geonwoo-v2-neutral.webp' },
  { name: '유나', gender: 'f', emoji: '👩', job: '모델', income: 2000000, personality: 'free', portrait: 'yuna-v2-neutral.webp' },
  { name: '수아', gender: 'f', emoji: '👩', job: '교사', income: 2600000, personality: 'caring', portrait: 'sua-v2-neutral.webp' },
  { name: '태양', gender: 'm', emoji: '👨', job: '사업가', income: 5000000, personality: 'lavish', portrait: 'taeyang-v2-neutral.webp' },
  { name: '보라', gender: 'f', emoji: '👩', job: '약사', income: 4500000, personality: 'homebody', portrait: 'bora-v2-neutral.webp' },
];

/* 구버전 세이브 호환 — 이름이 바뀐 인물(초상화 성별과 맞추느라 교체) */
const CHARACTER_NAME_MIGRATIONS = { '준서': '수아' };

const GENDER_LABEL = { m: '남성', f: '여성' };

/* 스토리 전용 인물 — 일반 랜덤 소개팅 풀에는 들어가지 않는다. */
const SPECIAL_CHARACTERS = {
  narae: { id:'narae', name:'나래', gender:'f', emoji:'👩', age:28, job:'투자교육 매니저', income:4200000, personality:'cold', portrait:'narae-v2-neutral.webp', romanceDifficulty:-25, special:'tutorial' },
  taesik: { id:'taesik', name:'장태식', gender:'m', emoji:'🦈', age:39, job:'사채 추심 책임자', income:0, personality:'cold', portrait:'taesik-v2-neutral.webp', special:'collector' },
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
  { key:'narae', emoji:'☕', name:'나래와 커피', desc:'일과 사생활을 분명히 구분하는 사람', pool:[], fixed:'narae', cost:350000, scoreMod:0 },
  { key: 'app',    emoji: '📱', name: '소개팅 앱', desc: '다양한 사람',           pool: 'any',                              cost: 200000,  scoreMod: 0 },
  { key: 'office', emoji: '🏢', name: '사내연애', desc: '같은 회사 동료',         pool: 'any',                              cost: 100000,  scoreMod: 4,  needsJob: true, office: true },
  { key: 'intro',  emoji: '🤝', name: '지인 소개', desc: '안정적·진중한 사람',    pool: ['frugal', 'homebody', 'caring'],    cost: 300000,  scoreMod: 6 },
  { key: 'hobby',  emoji: '🎨', name: '취미 모임', desc: '취향이 잘 맞는 사람',   pool: ['caring', 'homebody', 'ambitious'], cost: 400000,  scoreMod: 8 },
  { key: 'club',   emoji: '🍸', name: '클럽/헌팅', desc: '화려하지만 위험한 사람', pool: ['free', 'lavish'],                 cost: 800000,  scoreMod: -6 },
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
