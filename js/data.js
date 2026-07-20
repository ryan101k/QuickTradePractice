/* =========================================================================
 *  QuickTrade Pro — 데이터 레이어
 *  - 회사(종목), 섹터, 이벤트(회사/섹터/시장), 업적 정의
 *  - 모든 impact 값은 "비율"입니다. 0.12 = +12%, -0.20 = -20%
 * ========================================================================= */

/* ---------------------------------------------------------------------------
 *  섹터 정의 (테마 색상 포함)
 * ------------------------------------------------------------------------- */
const SECTORS = {
  semi:    { name: '반도체',      color: '#3b82f6' },
  auto:    { name: '자동차',      color: '#ef4444' },
  bio:     { name: '바이오/제약', color: '#10b981' },
  game:    { name: '게임',        color: '#8b5cf6' },
  enter:   { name: '엔터/미디어', color: '#ec4899' },
  finance: { name: '금융',        color: '#f59e0b' },
  battery: { name: '2차전지',     color: '#14b8a6' },
  food:    { name: '식음료/유통', color: '#f97316' },
  build:   { name: '건설/중공업', color: '#6b7280' },
  air:     { name: '항공/여행',   color: '#06b6d4' },
  crypto:  { name: '코인/테마',   color: '#eab308' },
};

/* ---------------------------------------------------------------------------
 *  종목 마스터
 *  cap  : 'large'(우량주) | 'mid'(보통주) | 'small'(잡주)
 *  vol  : 기본 변동성 배수 (클수록 출렁임)
 *  div  : 분기 배당수익률(연 기준, 옵션) — 대형 우량주만 배당
 * ------------------------------------------------------------------------- */
const COMPANY_MASTER = [
  // 반도체
  { name: '사성전자',       sector: 'semi',    cap: 'large', price: 71000,  vol: 0.8, div: 0.02 },
  { name: '하이닉수',       sector: 'semi',    cap: 'large', price: 128000, vol: 0.9, div: 0.015 },
  { name: '뒷문반도체',     sector: 'semi',    cap: 'small', price: 3200,   vol: 1.8 },
  // 자동차
  { name: '몽자동차',       sector: 'auto',    cap: 'large', price: 210000, vol: 0.8, div: 0.03 },
  { name: '기위자동차',     sector: 'auto',    cap: 'mid',   price: 95000,  vol: 1.0, div: 0.025 },
  { name: '굴러가면차',     sector: 'auto',    cap: 'small', price: 2400,   vol: 1.9 },
  // 바이오
  { name: '삼바이오로직수', sector: 'bio',     cap: 'large', price: 780000, vol: 1.1 },
  { name: '셀트라온',       sector: 'bio',     cap: 'mid',   price: 178000, vol: 1.3 },
  { name: '개구리제약',     sector: 'bio',     cap: 'small', price: 6800,   vol: 2.2 },
  { name: '만병통치바이오', sector: 'bio',     cap: 'small', price: 4200,   vol: 2.5 },
  // 게임
  { name: '넥슨도리',       sector: 'game',    cap: 'mid',   price: 240000, vol: 1.2 },
  { name: '엔씨쏘프트',     sector: 'game',    cap: 'mid',   price: 185000, vol: 1.3 },
  { name: '크래프통',       sector: 'game',    cap: 'mid',   price: 320000, vol: 1.4 },
  { name: '지하실게임즈',   sector: 'game',    cap: 'small', price: 5100,   vol: 2.3 },
  // 엔터
  { name: '하이브드',       sector: 'enter',   cap: 'mid',   price: 205000, vol: 1.5 },
  { name: '와이지엔터',     sector: 'enter',   cap: 'mid',   price: 47000,  vol: 1.6 },
  { name: '방구석엔터',     sector: 'enter',   cap: 'small', price: 3900,   vol: 2.4 },
  // 금융
  { name: '국민은행나라',   sector: 'finance', cap: 'large', price: 88000,  vol: 0.6, div: 0.05 },
  { name: '카카오빼기뱅크', sector: 'finance', cap: 'mid',   price: 26000,  vol: 1.1 },
  // 2차전지
  { name: '엘지에너지쏠루션', sector: 'battery', cap: 'large', price: 410000, vol: 1.2 },
  { name: '에코푸로',       sector: 'battery', cap: 'mid',   price: 235000, vol: 1.8 },
  { name: '폭발일보직전',   sector: 'battery', cap: 'small', price: 7300,   vol: 2.6 },
  // 식음료/유통
  { name: '농심라면',       sector: 'food',    cap: 'mid',   price: 420000, vol: 0.7, div: 0.02 },
  { name: '배달의고수',     sector: 'food',    cap: 'mid',   price: 33000,  vol: 1.4 },
  { name: '치킨공화국',     sector: 'food',    cap: 'small', price: 5600,   vol: 1.7 },
  // 건설
  { name: '현다이건설',     sector: 'build',   cap: 'mid',   price: 34000,  vol: 1.1, div: 0.03 },
  { name: '무너지마건설',   sector: 'build',   cap: 'small', price: 2900,   vol: 2.1 },
  // 항공
  { name: '대한하늘길',     sector: 'air',     cap: 'mid',   price: 22000,  vol: 1.3 },
  { name: '저가항공버라이어티', sector: 'air', cap: 'small', price: 3100,   vol: 2.0 },
  // 코인/테마
  { name: '도지사랑코인전자', sector: 'crypto', cap: 'small', price: 1200,  vol: 3.5 },
  { name: '밈스톡홀딩스',   sector: 'crypto',  cap: 'small', price: 900,    vol: 3.8 },
];

/* ---------------------------------------------------------------------------
 *  이벤트 데이터
 *  각 이벤트: { text, impact(비율), type:'good'|'bad', weight, sector?(제한) }
 *  weight 가 클수록 자주 등장. sector 가 있으면 해당 섹터 종목에만 등장.
 * ------------------------------------------------------------------------- */

// (1) 회사 개별 이벤트 — 섹터 무관 (호재)
const EVENTS_COMPANY_GOOD = [
  { text: '깜짝 실적 발표', impact: 0.08, weight: 10 },
  { text: '자사주 매입 결정', impact: 0.05, weight: 12 },
  { text: '신제품 흥행 대박', impact: 0.14, weight: 8 },
  { text: '해외 대형 수주 성공', impact: 0.11, weight: 8 },
  { text: '정부 지원 사업 선정', impact: 0.09, weight: 7 },
  { text: '외국인 대량 순매수', impact: 0.07, weight: 10 },
  { text: '증권사 목표주가 상향', impact: 0.06, weight: 11 },
  { text: '유명 투자자 지분 취득', impact: 0.12, weight: 6 },
  { text: '특허 소송 승소', impact: 0.10, weight: 6 },
  { text: '경쟁사 몰락으로 반사이익', impact: 0.09, weight: 6 },
  { text: '깜짝 무상증자 발표', impact: 0.16, weight: 4 },
  { text: '원가 절감 신기술 도입', impact: 0.06, weight: 8 },
  { text: '흑자 전환 성공', impact: 0.13, weight: 6 },
  { text: '대규모 인수합병(M&A) 성사', impact: 0.15, weight: 4 },
  { text: '창사 이래 최대 영업이익', impact: 0.18, weight: 3 },
  { text: '노벨상 수상 연구진 영입', impact: 0.20, weight: 2 },
  { text: '전설의 CEO 복귀', impact: 0.17, weight: 2 },
  { text: '갑자기 밈으로 떠서 개미 폭주', impact: 0.28, weight: 2 },
];

// (2) 회사 개별 이벤트 — 섹터 무관 (악재)
const EVENTS_COMPANY_BAD = [
  { text: '실적 어닝 쇼크', impact: -0.10, weight: 10 },
  { text: '오너 리스크 부각', impact: -0.09, weight: 8 },
  { text: '회장 구속영장 청구', impact: -0.15, weight: 4 },
  { text: '분식회계 의혹', impact: -0.18, weight: 3 },
  { text: '대규모 리콜 사태', impact: -0.12, weight: 6 },
  { text: '핵심 인력 대거 이탈', impact: -0.08, weight: 8 },
  { text: '증권사 투자의견 하향', impact: -0.06, weight: 11 },
  { text: '외국인 대량 순매도', impact: -0.07, weight: 10 },
  { text: '노조 총파업 돌입', impact: -0.09, weight: 6 },
  { text: '유상증자로 물량 부담', impact: -0.11, weight: 6 },
  { text: '특허 소송 패소', impact: -0.10, weight: 5 },
  { text: '주요 고객사 이탈', impact: -0.12, weight: 6 },
  { text: '세금 추징 폭탄', impact: -0.08, weight: 6 },
  { text: '고객 데이터 유출 사고', impact: -0.11, weight: 5 },
  { text: '배임·횡령 혐의 수사', impact: -0.16, weight: 3 },
  { text: '공장 대형 화재', impact: -0.14, weight: 4 },
  { text: '상장폐지 실질심사 대상 소문', impact: -0.25, weight: 2 },
  { text: '오너 SNS 설화로 불매운동', impact: -0.19, weight: 2 },
];

// (3) 섹터 특화 이벤트 (호재/악재 혼합)
const EVENTS_SECTOR = [
  // 반도체
  { sector: 'semi', text: 'AI 반도체 슈퍼사이클 도래', impact: 0.16, weight: 6 },
  { sector: 'semi', text: 'D램 가격 급등', impact: 0.11, weight: 8 },
  { sector: 'semi', text: '반도체 수출 규제 완화', impact: 0.08, weight: 6 },
  { sector: 'semi', text: '반도체 재고 과잉·감산', impact: -0.12, weight: 7 },
  { sector: 'semi', text: '핵심 소재 수급 차질', impact: -0.09, weight: 6 },
  // 자동차
  { sector: 'auto', text: '전기차 판매 신기록', impact: 0.12, weight: 7 },
  { sector: 'auto', text: '자율주행 규제 통과', impact: 0.10, weight: 6 },
  { sector: 'auto', text: '차량용 반도체 대란', impact: -0.11, weight: 6 },
  { sector: 'auto', text: '완성차 노조 파업', impact: -0.09, weight: 6 },
  // 바이오
  { sector: 'bio', text: '신약 임상 3상 성공', impact: 0.24, weight: 5 },
  { sector: 'bio', text: 'FDA 승인 획득', impact: 0.22, weight: 4 },
  { sector: 'bio', text: '기술수출(라이선스 아웃) 대박', impact: 0.18, weight: 5 },
  { sector: 'bio', text: '임상 시험 실패', impact: -0.30, weight: 5 },
  { sector: 'bio', text: '신약 부작용 논란', impact: -0.20, weight: 5 },
  // 게임
  { sector: 'game', text: '신작 글로벌 흥행 1위', impact: 0.20, weight: 6 },
  { sector: 'game', text: '중국 판호 발급', impact: 0.16, weight: 5 },
  { sector: 'game', text: '기대작 출시 연기', impact: -0.13, weight: 6 },
  { sector: 'game', text: '확률형 아이템 규제', impact: -0.10, weight: 6 },
  // 엔터
  { sector: 'enter', text: '소속 아티스트 빌보드 1위', impact: 0.19, weight: 6 },
  { sector: 'enter', text: '월드투어 매진 행렬', impact: 0.14, weight: 6 },
  { sector: 'enter', text: '간판 그룹 활동 중단', impact: -0.18, weight: 5 },
  { sector: 'enter', text: '소속 연예인 논란', impact: -0.14, weight: 6 },
  // 금융
  { sector: 'finance', text: '기준금리 인상 수혜', impact: 0.07, weight: 7 },
  { sector: 'finance', text: '역대급 배당 확대', impact: 0.09, weight: 6 },
  { sector: 'finance', text: '대규모 부실채권 발생', impact: -0.10, weight: 6 },
  { sector: 'finance', text: '금융당국 제재', impact: -0.08, weight: 6 },
  // 2차전지
  { sector: 'battery', text: '북미 대형 배터리 수주', impact: 0.17, weight: 6 },
  { sector: 'battery', text: '리튬 가격 안정', impact: 0.09, weight: 6 },
  { sector: 'battery', text: '전기차 캐즘(수요 둔화)', impact: -0.15, weight: 7 },
  { sector: 'battery', text: '배터리 화재 리콜', impact: -0.16, weight: 5 },
  // 식음료
  { sector: 'food', text: 'K-푸드 수출 폭발', impact: 0.11, weight: 7 },
  { sector: 'food', text: '가격 인상 단행', impact: 0.06, weight: 7 },
  { sector: 'food', text: '식품 이물질 논란', impact: -0.13, weight: 6 },
  { sector: 'food', text: '원자재값 급등', impact: -0.08, weight: 7 },
  // 건설
  { sector: 'build', text: '대규모 재건축 수주', impact: 0.12, weight: 6 },
  { sector: 'build', text: 'SOC 예산 확대', impact: 0.08, weight: 6 },
  { sector: 'build', text: '부동산 PF 부실 공포', impact: -0.16, weight: 6 },
  { sector: 'build', text: '아파트 부실시공 논란', impact: -0.12, weight: 6 },
  // 항공
  { sector: 'air', text: '해외여행 수요 폭발', impact: 0.13, weight: 7 },
  { sector: 'air', text: '유가 하락 수혜', impact: 0.09, weight: 6 },
  { sector: 'air', text: '고유가에 연료비 부담', impact: -0.11, weight: 7 },
  { sector: 'air', text: '항공기 결함 운항 중단', impact: -0.14, weight: 5 },
  // 코인/테마
  { sector: 'crypto', text: '비트코인 신고가 랠리', impact: 0.30, weight: 6 },
  { sector: 'crypto', text: '대형 거래소 상장', impact: 0.25, weight: 5 },
  { sector: 'crypto', text: '유명인 코인 언급', impact: 0.22, weight: 5 },
  { sector: 'crypto', text: '코인 규제 강화 발표', impact: -0.28, weight: 6 },
  { sector: 'crypto', text: '거래소 해킹 사태', impact: -0.32, weight: 4 },
];

// (4) 시장 전체 이벤트 — 모든 종목에 곱연산으로 적용, 뉴스로 크게 표시
const EVENTS_MARKET = [
  { text: '📈 산타랠리! 시장 전체 훈풍', impact: 0.06, type: 'good', weight: 8 },
  { text: '📈 외국인 폭풍 매수, 지수 급등', impact: 0.05, type: 'good', weight: 9 },
  { text: '📈 금리 인하 기대감에 랠리', impact: 0.07, type: 'good', weight: 7 },
  { text: '📈 경기부양책 발표', impact: 0.05, type: 'good', weight: 8 },
  { text: '📉 인플레이션 쇼크, 지수 급락', impact: -0.07, type: 'bad', weight: 8 },
  { text: '📉 글로벌 금융위기 우려', impact: -0.10, type: 'bad', weight: 5 },
  { text: '📉 전쟁 리스크 부각', impact: -0.08, type: 'bad', weight: 5 },
  { text: '📉 대형 은행 파산설', impact: -0.09, type: 'bad', weight: 5 },
  { text: '🦠 신종 전염병 확산 공포', impact: -0.11, type: 'bad', weight: 4 },
  { text: '💥 블랙 먼데이! 서킷브레이커 발동', impact: -0.18, type: 'bad', weight: 2 },
  { text: '🚀 유동성 파티, 유례없는 활황장', impact: 0.14, type: 'good', weight: 2 },
];

// (5) 평범한 날 — 특별한 이슈 없음 (자주 등장시켜 노이즈 조절)
const EVENTS_NONE = [
  { text: '특별한 이슈 없음', impact: 0, weight: 45 },
  { text: '보합권 등락', impact: 0, weight: 30 },
  { text: '관망세 지속', impact: 0, weight: 25 },
];

/* ---------------------------------------------------------------------------
 *  업적 (도전과제) — localStorage 로 영구 저장
 *  check(ctx) => boolean.  ctx = { netWorth, capital, realizedPnL, trades,
 *    maxNetWorth, bankruptcies, shortsClosed, achievementsUnlocked, day }
 * ------------------------------------------------------------------------- */
const ACHIEVEMENTS = [
  { id: 'first_trade', icon: '🎬', name: '데뷔전',       desc: '첫 거래를 체결한다',                 check: c => c.trades >= 1 },
  { id: 'ten_trades',  icon: '🔁', name: '단타의 맛',     desc: '누적 10회 거래',                     check: c => c.trades >= 10 },
  { id: 'hundred',     icon: '🥋', name: '단타 고수',     desc: '누적 100회 거래',                    check: c => c.trades >= 100 },
  { id: 'double',      icon: '💰', name: '더블',          desc: '순자산 200만원 돌파',                check: c => c.maxNetWorth >= 2000000 },
  { id: 'ten_mil',     icon: '🏦', name: '천만장자',       desc: '순자산 1,000만원 돌파',              check: c => c.maxNetWorth >= 10000000 },
  { id: 'hundred_mil', icon: '👑', name: '억!',           desc: '순자산 1억원 돌파',                  check: c => c.maxNetWorth >= 100000000 },
  { id: 'rekt',        icon: '💀', name: '깡통계좌',       desc: '순자산이 10만원 밑으로',             check: c => c.netWorth < 100000 },
  { id: 'short_win',   icon: '🐻', name: '공매도 성공',    desc: '공매도로 수익 실현',                 check: c => c.shortsClosed >= 1 },
  { id: 'diamond',     icon: '💎', name: '다이아몬드 핸즈', desc: '10일차까지 생존',                    check: c => c.day >= 10 },
  { id: 'beat_bots',   icon: '🤖', name: 'AI 정복자',      desc: 'AI 라이벌을 모두 제치고 1위',        check: c => c.rank === 1 && c.day >= 3 },
];

/* 전역 노출 */
window.QT_DATA = {
  SECTORS, COMPANY_MASTER,
  EVENTS_COMPANY_GOOD, EVENTS_COMPANY_BAD, EVENTS_SECTOR,
  EVENTS_MARKET, EVENTS_NONE, ACHIEVEMENTS,
};
