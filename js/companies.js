/* QuickTrade Life — 시장/종목 마스터 */
const SECTORS = {
  semi: { name: '반도체', color: '#3b82f6' }, auto: { name: '자동차', color: '#ef4444' },
  bio: { name: '바이오/제약', color: '#10b981' }, game: { name: '게임', color: '#8b5cf6' },
  enter: { name: '엔터/미디어', color: '#ec4899' }, finance: { name: '금융', color: '#f59e0b' },
  battery: { name: '2차전지', color: '#14b8a6' }, food: { name: '식음료/유통', color: '#f97316' },
  build: { name: '건설/중공업', color: '#6b7280' }, air: { name: '항공/여행', color: '#06b6d4' },
  crypto: { name: '디지털자산/테마', color: '#eab308' }, etf: { name: 'ETF/지수', color: '#0ea5e9' },
  macro: { name: '금·채권·달러', color: '#8b6f20' },
};

const ETFS = [
  { name: 'QX 코리아200', price: 38000, lev: 1 },
  { name: 'QX 코리아200 레버리지', price: 21000, lev: 2 },
  { name: 'QX 코리아200 인버스', price: 5200, lev: -1 },
  { name: 'QX 코리아200 선물인버스2X', price: 3100, lev: -2 },
  { name: 'QX 금현물', price: 15800, type: 'macro', sector: 'macro', asset: 'gold', icon: '🥇', desc: '물가·위기에는 강해질 수 있고 높은 금리에는 약해질 수 있는 안전자산' },
  { name: 'QX 국채10년', price: 11200, type: 'macro', sector: 'macro', asset: 'bond', icon: '📜', desc: '시장금리가 내려가면 기존 채권 가격이 오르고 금리가 오르면 내려가는 장기채' },
  { name: 'QX 달러선물', price: 13600, type: 'macro', sector: 'macro', asset: 'usd', icon: '💵', desc: '긴축·위기 때 안전자산 선호로 강해질 수 있는 달러 자산' },
];

// 모두 가상의 회사입니다. 실존 상장사와의 혼동을 피하면서 산업·규모별 인상을 살렸습니다.
const COMPANY_MASTER = [
  { name: '한결전자', sector: 'semi', cap: 'large', price: 71000, vol: 0.8, div: 0.02 },
  { name: '세림메모리', sector: 'semi', cap: 'large', price: 128000, vol: 0.9, div: 0.015 },
  { name: '파인칩스', sector: 'semi', cap: 'small', price: 3200, vol: 1.8 },
  { name: '대한모터스', sector: 'auto', cap: 'large', price: 210000, vol: 0.8, div: 0.03 },
  { name: '아진오토텍', sector: 'auto', cap: 'mid', price: 95000, vol: 1.0, div: 0.025 },
  { name: '모빌리온', sector: 'auto', cap: 'small', price: 2400, vol: 1.9 },
  { name: '네오젠바이오', sector: 'bio', cap: 'large', price: 780000, vol: 1.1 },
  { name: '한빛셀테라퓨틱스', sector: 'bio', cap: 'mid', price: 178000, vol: 1.3 },
  { name: '유진제약', sector: 'bio', cap: 'small', price: 6800, vol: 2.2 },
  { name: '오리진바이오랩', sector: 'bio', cap: 'small', price: 4200, vol: 2.5 },
  { name: '아크게임즈', sector: 'game', cap: 'mid', price: 240000, vol: 1.2 },
  { name: '블루포지', sector: 'game', cap: 'mid', price: 185000, vol: 1.3 },
  { name: '레드코어스튜디오', sector: 'game', cap: 'mid', price: 320000, vol: 1.4 },
  { name: '노바플레이', sector: 'game', cap: 'small', price: 5100, vol: 2.3 },
  { name: '루미너스엔터', sector: 'enter', cap: 'mid', price: 205000, vol: 1.5 },
  { name: '웨이브미디어', sector: 'enter', cap: 'mid', price: 47000, vol: 1.6 },
  { name: '스텔라콘텐츠', sector: 'enter', cap: 'small', price: 3900, vol: 2.4 },
  { name: '한민국금융지주', sector: 'finance', cap: 'large', price: 88000, vol: 0.6, div: 0.05 },
  { name: '브릿지뱅크', sector: 'finance', cap: 'mid', price: 26000, vol: 1.1 },
  { name: '그린셀에너지', sector: 'battery', cap: 'large', price: 410000, vol: 1.2 },
  { name: '에코베이머티리얼즈', sector: 'battery', cap: 'mid', price: 235000, vol: 1.8 },
  { name: '볼트온테크', sector: 'battery', cap: 'small', price: 7300, vol: 2.6 },
  { name: '해든푸드', sector: 'food', cap: 'mid', price: 420000, vol: 0.7, div: 0.02 },
  { name: '마켓온리테일', sector: 'food', cap: 'mid', price: 33000, vol: 1.4 },
  { name: '다온에프앤비', sector: 'food', cap: 'small', price: 5600, vol: 1.7 },
  { name: '태성건설', sector: 'build', cap: 'mid', price: 34000, vol: 1.1, div: 0.03 },
  { name: '우림인프라', sector: 'build', cap: 'small', price: 2900, vol: 2.1 },
  { name: '코리아에어라인', sector: 'air', cap: 'mid', price: 22000, vol: 1.3 },
  { name: '스카이링크항공', sector: 'air', cap: 'small', price: 3100, vol: 2.0 },
  { name: '블록웨이브홀딩스', sector: 'crypto', cap: 'small', price: 1200, vol: 3.5 },
  { name: '넥스트체인', sector: 'crypto', cap: 'small', price: 900, vol: 3.8 },
];

// v3.0 이전 저장 데이터의 종목명을 새 가상 상장사명으로 변환할 때 사용합니다.
const COMPANY_NAME_MIGRATIONS = Object.fromEntries([
  '사성전자','하이닉수','뒷문반도체','몽자동차','기위자동차','굴러가면차','삼바이오로직수','셀트라온',
  '개구리제약','만병통치바이오','넥슨도리','엔씨쏘프트','크래프통','지하실게임즈','하이브드','와이지엔터',
  '방구석엔터','국민은행나라','카카오빼기뱅크','엘지에너지쏠루션','에코푸로','폭발일보직전','농심라면',
  '배달의고수','치킨공화국','현다이건설','무너지마건설','대한하늘길','저가항공버라이어티',
  '도지사랑코인전자','밈스톡홀딩스'
].map((oldName, i) => [oldName, COMPANY_MASTER[i].name]));
