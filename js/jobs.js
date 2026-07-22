/* =========================================================================
 *  QuickTrade Life — 직업(JOBS) 데이터
 *  salary   : 고정 월급 (variable 이 있으면 무시하고 그 범위에서 랜덤)
 *  variable : [최소, 최대] 월수입 랜덤 (음수 가능 = 적자)
 *  risk     : 매달 사고가 터질 확률 (고소득/고위험일수록 높게)
 *  incidents: 사고 풀 { text, cost:[최소,최대] } — 현금으로 먼저 내고 부족분만 사고채무가 됨
 *  dateBonus: 데이트 성공 판정에 더해지는 직업(능력) 보정치 (0~25)
 *  difficulty: 이직 난이도 (높을수록 합격 어려움)
 *  apt      : 이 직업이 요구하는 적성 축 [주, 부] — js/aptitude.js 의 AXES 키
 *             적성이 맞으면 성과·수입·합격률↑, 안 맞으면 스트레스·사고↑
 * ========================================================================= */
const JOBS = [
  {
    id: 'none', emoji: '🛋️', name: '백수', salary: 0, risk: 0.00, dateBonus: 0, difficulty: 0,
    apt: [], desc: '무직. 월급 없음 (투자로만 버티기)', incidents: [],
  },

  /* ---------------- 저위험 · 저소득 ---------------- */
  {
    id: 'parttime', emoji: '🏪', name: '편의점 알바', salary: 800000, risk: 0.03, dateBonus: 5, difficulty: 8,
    apt: ['diligence', 'social'], desc: '소소하지만 확실한 시급 · 리스크 낮음',
    incidents: [
      { text: '진상 손님과 시비, 합의금', cost: [200000, 800000] },
      { text: '실수로 시재 펑크', cost: [100000, 500000] },
    ],
  },
  {
    id: 'barista', emoji: '☕', name: '바리스타', salary: 1900000, risk: 0.03, dateBonus: 9, difficulty: 15,
    apt: ['creative', 'social'], desc: '손님과 커피 사이 · 안정적이고 낮은 위험',
    incidents: [
      { text: '에스프레소 머신 화상 치료', cost: [150000, 900000] },
      { text: '진상 리뷰 테러로 매출 급감', cost: [100000, 700000] },
    ],
  },
  {
    id: 'librarian', emoji: '📖', name: '사서', salary: 2300000, risk: 0.015, dateBonus: 11, difficulty: 48,
    apt: ['diligence', 'analysis'], desc: '가장 조용하고 안전한 직업 중 하나',
    incidents: [
      { text: '분실 도서 변상', cost: [100000, 600000] },
    ],
  },
  {
    id: 'translator', emoji: '🈯', name: '번역가', salary: 0, variable: [1200000, 5000000], risk: 0.03, dateBonus: 14, difficulty: 55,
    apt: ['analysis', 'creative'], desc: '재택 프리랜서 · 실력 따라 수입 변동',
    incidents: [
      { text: '오역 클레임으로 대금 환수', cost: [300000, 3000000] },
      { text: '외주 끊겨 수입 공백', cost: [500000, 2500000] },
    ],
  },
  {
    id: 'callcenter', emoji: '🎧', name: '콜센터 상담원', salary: 2200000, risk: 0.035, dateBonus: 7, difficulty: 12,
    apt: ['social', 'diligence'], desc: '감정노동의 대명사 · 안정적 급여',
    incidents: [
      { text: '악성 민원 스트레스로 병가', cost: [200000, 1200000] },
    ],
  },

  /* ---------------- 저·중위험 · 안정 직군 ---------------- */
  {
    id: 'office', emoji: '🏢', name: '회사원', salary: 2500000, risk: 0.05, dateBonus: 10, difficulty: 30,
    apt: ['diligence', 'social'], desc: '평범한 직장인의 삶',
    incidents: [
      { text: '회식 후 대리·병원비 폭탄', cost: [300000, 1500000] },
      { text: '프로젝트 실패 책임, 성과급 삭감', cost: [500000, 2500000] },
    ],
  },
  {
    id: 'civil', emoji: '🏛️', name: '공무원', salary: 2200000, risk: 0.02, dateBonus: 12, difficulty: 50,
    apt: ['diligence', 'analysis'], desc: '철밥통, 가장 안정적',
    incidents: [
      { text: '민원 스트레스로 병가·치료비', cost: [200000, 1000000] },
    ],
  },
  {
    id: 'teacher', emoji: '📚', name: '교사', salary: 3000000, risk: 0.035, dateBonus: 15, difficulty: 65,
    apt: ['social', 'diligence'], desc: '안정적이지만 민원과 업무 스트레스',
    incidents: [
      { text: '학부모 민원 대응 치료비', cost: [300000, 1500000] },
      { text: '교실 물품 파손 변상', cost: [100000, 700000] },
    ],
  },
  {
    id: 'factory', emoji: '🏭', name: '생산직', salary: 3200000, risk: 0.06, dateBonus: 8, difficulty: 25,
    apt: ['stamina', 'diligence'], desc: '교대근무 수당과 안정적인 현금흐름',
    incidents: [
      { text: '작업 중 부상과 치료비', cost: [500000, 6000000] },
      { text: '공장 감산으로 무급휴직', cost: [1000000, 4000000] },
    ],
  },
  {
    id: 'nurse', emoji: '🩺', name: '간호사', salary: 3600000, risk: 0.075, dateBonus: 16, difficulty: 55,
    apt: ['diligence', 'social'], desc: '전문직 수입과 고강도 교대근무',
    incidents: [
      { text: '허리 부상으로 치료·휴직', cost: [500000, 3000000] },
      { text: '감염 노출 후 자가격리', cost: [300000, 1500000] },
    ],
  },
  {
    id: 'flightattendant', emoji: '✈️', name: '승무원', salary: 3200000, risk: 0.06, dateBonus: 17, difficulty: 58,
    apt: ['social', 'stamina'], desc: '화려해 보이지만 시차와 체력 소모가 큼',
    incidents: [
      { text: '난기류 부상·치료', cost: [400000, 2500000] },
      { text: '스케줄 취소로 수당 삭감', cost: [300000, 1800000] },
    ],
  },
  {
    id: 'chef', emoji: '👨‍🍳', name: '요리사', salary: 3400000, risk: 0.07, dateBonus: 14, difficulty: 42,
    apt: ['creative', 'stamina'], desc: '창의와 체력을 함께 태우는 주방',
    incidents: [
      { text: '주방 화상·베임 치료', cost: [300000, 2500000] },
      { text: '식자재 폐기와 위생 벌금', cost: [500000, 4000000] },
    ],
  },
  {
    id: 'hairdresser', emoji: '💇', name: '미용사', salary: 0, variable: [1500000, 5500000], risk: 0.05, dateBonus: 16, difficulty: 30,
    apt: ['creative', 'social'], desc: '단골 따라 수입 결정 · 손기술 직업',
    incidents: [
      { text: '시술 불만 환불·배상', cost: [300000, 2000000] },
      { text: '손목 부상으로 휴업', cost: [400000, 2500000] },
    ],
  },
  {
    id: 'trainer', emoji: '🏋️', name: '헬스 트레이너', salary: 0, variable: [1500000, 6500000], risk: 0.06, dateBonus: 19, difficulty: 28,
    apt: ['stamina', 'social'], desc: '회원 수가 곧 수입 · 몸이 자산',
    incidents: [
      { text: '운동 중 부상 치료', cost: [400000, 3000000] },
      { text: '회원 이탈로 수입 급감', cost: [500000, 3000000] },
    ],
  },
  {
    id: 'designer', emoji: '🎨', name: '디자이너', salary: 3300000, risk: 0.06, dateBonus: 17, difficulty: 40,
    apt: ['creative', 'analysis'], desc: '감각과 마감 사이에서 버티는 직업',
    incidents: [
      { text: '프리랜스 외주대금 미수', cost: [500000, 5000000] },
      { text: '장비 고장과 교체 비용', cost: [1000000, 4000000] },
    ],
  },

  /* ---------------- 중·고소득 전문직 ---------------- */
  {
    id: 'dev', emoji: '💻', name: '개발자', salary: 4000000, risk: 0.09, dateBonus: 12, difficulty: 45,
    apt: ['analysis', 'creative'], desc: '야근과 맞바꾼 연봉 · 사고 잦음',
    incidents: [
      { text: '배포 사고로 서버 다운, 배상', cost: [1000000, 6000000] },
      { text: '번아웃 요양, 무급 휴직', cost: [500000, 3000000] },
      { text: '믿었던 스톡옵션 물거품', cost: [1000000, 5000000] },
    ],
  },
  {
    id: 'architect', emoji: '📐', name: '건축가', salary: 4600000, risk: 0.07, dateBonus: 18, difficulty: 72,
    apt: ['creative', 'analysis'], desc: '설계 책임이 큰 전문직',
    incidents: [
      { text: '설계 하자 손해배상', cost: [3000000, 15000000] },
      { text: '현장 감리 분쟁', cost: [1000000, 7000000] },
    ],
  },
  {
    id: 'pharmacist', emoji: '💊', name: '약사', salary: 5200000, risk: 0.04, dateBonus: 18, difficulty: 80,
    apt: ['analysis', 'diligence'], desc: '안정적 고소득 전문직',
    incidents: [
      { text: '조제 오류 분쟁·배상', cost: [1000000, 8000000] },
      { text: '약국 임대료·재고 부담', cost: [1500000, 6000000] },
    ],
  },
  {
    id: 'accountant', emoji: '🧾', name: '회계사', salary: 5800000, risk: 0.08, dateBonus: 20, difficulty: 78,
    apt: ['analysis', 'diligence'], desc: '높은 전문성과 바쁜 결산 시즌',
    incidents: [
      { text: '검토 오류 관련 손해배상', cost: [2000000, 12000000] },
      { text: '과로로 치료·휴직', cost: [800000, 5000000] },
    ],
  },
  {
    id: 'researcher', emoji: '🔬', name: '연구원', salary: 4200000, risk: 0.045, dateBonus: 19, difficulty: 70,
    apt: ['analysis', 'diligence'], desc: '안정적인 전문직과 긴 연구 기간',
    incidents: [
      { text: '연구비 정산 오류 변상', cost: [500000, 5000000] },
      { text: '프로젝트 종료 후 계약 공백', cost: [1000000, 6000000] },
    ],
  },
  {
    id: 'lawyer', emoji: '⚖️', name: '변호사', salary: 6500000, risk: 0.11, dateBonus: 23, difficulty: 88,
    apt: ['analysis', 'social'], desc: '고소득 전문직, 사건 수임 변동성',
    incidents: [
      { text: '수임 분쟁과 반환 소송', cost: [3000000, 20000000] },
      { text: '사무실 운영비 적자', cost: [2000000, 10000000] },
    ],
  },
  {
    id: 'doctor', emoji: '⚕️', name: '의사', salary: 7000000, risk: 0.12, dateBonus: 22, difficulty: 85,
    apt: ['analysis', 'diligence'], desc: '고소득이지만 사고 한 방이 큼',
    incidents: [
      { text: '의료사고 분쟁, 합의·법률비', cost: [5000000, 30000000] },
      { text: '개원 운영비와 대출이자 부담', cost: [3000000, 12000000] },
      { text: '세무조사 추징', cost: [3000000, 15000000] },
      { text: '대형 의료소송 패소', cost: [20000000, 60000000] },   // 파국급
    ],
  },
  {
    id: 'pilot', emoji: '🛫', name: '파일럿', salary: 9500000, risk: 0.09, dateBonus: 24, difficulty: 90,
    apt: ['analysis', 'stamina'], desc: '최고 수준의 급여 · 자격 유지 부담',
    incidents: [
      { text: '신체검사 부적합 판정으로 정직', cost: [5000000, 25000000] },
      { text: '비상 회항 책임 조사', cost: [3000000, 15000000] },
    ],
  },

  /* ---------------- 변동성·고위험 직군 ---------------- */
  {
    id: 'delivery', emoji: '🛵', name: '배달 라이더', salary: 0, variable: [1400000, 4200000], risk: 0.09, dateBonus: 6, difficulty: 5,
    apt: ['stamina', 'daring'], desc: '일한 만큼 벌지만 날씨와 사고 위험',
    incidents: [
      { text: '빗길 오토바이 사고', cost: [500000, 8000000] },
      { text: '오토바이 수리와 휴업', cost: [300000, 2500000] },
    ],
  },
  {
    id: 'construction', emoji: '🚧', name: '건설 현장직', salary: 3800000, risk: 0.14, dateBonus: 7, difficulty: 18,
    apt: ['stamina', 'diligence'], desc: '높은 일당, 그만큼 높은 산재 위험',
    incidents: [
      { text: '추락·낙하물 부상 치료', cost: [1000000, 12000000] },
      { text: '공사 중단으로 일당 손실', cost: [800000, 4000000] },
      { text: '중대재해로 장기 입원', cost: [10000000, 40000000] },   // 파국급
    ],
  },
  {
    id: 'firefighter', emoji: '🚒', name: '소방관', salary: 3600000, risk: 0.13, dateBonus: 21, difficulty: 60,
    apt: ['stamina', 'daring'], desc: '누군가를 구하지만 매번 위험을 안는다',
    incidents: [
      { text: '화재 진압 중 부상·화상', cost: [1000000, 10000000] },
      { text: '외상 후 스트레스 치료', cost: [500000, 4000000] },
    ],
  },
  {
    id: 'police', emoji: '👮', name: '경찰관', salary: 3500000, risk: 0.11, dateBonus: 20, difficulty: 62,
    apt: ['daring', 'diligence'], desc: '치안의 최전선 · 위험과 사명감',
    incidents: [
      { text: '검거 과정 부상 치료', cost: [800000, 7000000] },
      { text: '과잉진압 시비 소송', cost: [2000000, 12000000] },
    ],
  },
  {
    id: 'fisher', emoji: '🎣', name: '원양 어선원', salary: 0, variable: [2000000, 9000000], risk: 0.16, dateBonus: 8, difficulty: 20,
    apt: ['stamina', 'daring'], desc: '목돈을 벌지만 몇 달씩 바다 위, 사고 위험 큼',
    incidents: [
      { text: '조업 중 사고·부상', cost: [2000000, 15000000] },
      { text: '흉어와 장비 파손', cost: [1500000, 8000000] },
    ],
  },
  {
    id: 'stuntman', emoji: '🎬', name: '스턴트맨', salary: 0, variable: [2000000, 9000000], risk: 0.20, dateBonus: 19, difficulty: 35,
    apt: ['stamina', 'daring'], desc: '화면 뒤의 위험 · 부상 한 번이 치명적',
    incidents: [
      { text: '촬영 중 부상 치료', cost: [1500000, 12000000] },
      { text: '큰 사고로 장기 재활', cost: [15000000, 50000000] },   // 파국급
    ],
  },
  {
    id: 'progamer', emoji: '🎮', name: '프로게이머', salary: 0, variable: [0, 12000000], risk: 0.14, dateBonus: 15, difficulty: 40,
    apt: ['analysis', 'stamina'], desc: '짧고 굵은 전성기 · 성적이 곧 수입',
    incidents: [
      { text: '손목·목 부상으로 슬럼프', cost: [500000, 5000000] },
      { text: '팀 성적 부진으로 방출', cost: [1000000, 8000000] },
    ],
  },
  {
    id: 'webtoon', emoji: '🖌️', name: '웹툰 작가', salary: 0, variable: [0, 15000000], risk: 0.12, dateBonus: 16, difficulty: 44,
    apt: ['creative', 'diligence'], desc: '연재 성공하면 대박, 아니면 마감 지옥',
    incidents: [
      { text: '마감 과로로 손목 부상', cost: [500000, 4000000] },
      { text: '연재 중단으로 수입 끊김', cost: [1000000, 9000000] },
    ],
  },
  {
    id: 'sales', emoji: '🤝', name: '영업직', salary: 0, variable: [1800000, 7500000], risk: 0.10, dateBonus: 18, difficulty: 35,
    apt: ['social', 'daring'], desc: '성과급 대박 또는 실적 압박',
    incidents: [
      { text: '접대비를 개인 비용으로 처리', cost: [500000, 5000000] },
      { text: '계약 취소로 인센티브 환수', cost: [1000000, 10000000] },
    ],
  },
  {
    id: 'realtor', emoji: '🏠', name: '공인중개사', salary: 0, variable: [500000, 10000000], risk: 0.13, dateBonus: 14, difficulty: 45,
    apt: ['social', 'analysis'], desc: '부동산 경기에 따라 수입이 크게 변동',
    incidents: [
      { text: '중개사고 손해배상', cost: [3000000, 20000000] },
      { text: '거래절벽으로 사무실 적자', cost: [1500000, 8000000] },
    ],
  },
  {
    id: 'youtuber', emoji: '🎥', name: '유튜버', salary: 0, variable: [0, 8000000], risk: 0.15, dateBonus: 18, difficulty: 15,
    apt: ['creative', 'daring'], desc: '월수입 들쭉날쭉 · 한 방 아니면 폭망',
    incidents: [
      { text: '뒷광고 논란, 환불·수익 정지', cost: [2000000, 12000000] },
      { text: '저작권 분쟁과 합의', cost: [1000000, 8000000] },
      { text: '노이즈 마케팅 역풍, 법률비', cost: [1500000, 9000000] },
    ],
  },
  {
    id: 'trader', emoji: '📈', name: '전업 투자자', salary: 0, variable: [-10000000, 30000000], risk: 0.20, dateBonus: 16, difficulty: 30,
    apt: ['analysis', 'daring'], desc: '내 계좌가 곧 월급 · 초고위험 초고수익',
    incidents: [
      { text: '레버리지 반대매매로 큰 손실', cost: [5000000, 35000000] },
      { text: '몰빵 종목 상장폐지', cost: [8000000, 40000000] },
      { text: '세금 신고 누락 추징', cost: [2000000, 15000000] },
    ],
  },
  {
    id: 'ceo', emoji: '🕴️', name: '사업가', salary: 0, variable: [-5000000, 20000000], risk: 0.18, dateBonus: 20, difficulty: 25,
    apt: ['daring', 'social'], desc: '초고위험 초고수익 · 적자도 가능',
    incidents: [
      { text: '거래처 부도로 미수금 손실', cost: [5000000, 25000000] },
      { text: '운영자금 부족과 긴급 조달비', cost: [7000000, 30000000] },
      { text: '갑질 논란으로 환불·법률비', cost: [5000000, 20000000] },
      { text: '자금줄 막혀 부도 위기', cost: [20000000, 70000000] },   // 파국급
    ],
  },
];

/* 직업 리스크 등급 (UI 표시용) */
function jobRiskTier(job) {
  if (!job || !job.risk) return { icon: '🟢', label: '안전' };
  if (job.risk >= 0.16) return { icon: '💀', label: '초고위험' };
  if (job.risk >= 0.12) return { icon: '🔴', label: '고위험' };
  if (job.risk >= 0.06) return { icon: '🟠', label: '중위험' };
  return { icon: '🟢', label: '저위험' };
}
