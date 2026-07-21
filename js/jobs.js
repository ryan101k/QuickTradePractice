/* =========================================================================
 *  QuickTrade Life — 직업(JOBS) 데이터
 *  salary   : 고정 월급 (variable 이 있으면 무시하고 그 범위에서 랜덤)
 *  variable : [최소, 최대] 월수입 랜덤 (음수 가능 = 적자)
 *  risk     : 매달 사고가 터질 확률 (고소득일수록 높게 = 하이리스크 하이리턴)
 *  incidents: 사고 풀 { text, cost:[최소,최대] } — 터지면 그 금액만큼 '빚'이 생김
 *  dateBonus: 데이트 성공 판정에 더해지는 직업(능력) 보정치 (0~25)
 * ========================================================================= */
const JOBS = [
  {
    id: 'none', emoji: '🛋️', name: '백수', salary: 0, risk: 0.00, dateBonus: 0, difficulty: 0,
    desc: '무직. 월급 없음 (투자로만 버티기)', incidents: [],
  },
  {
    id: 'parttime', emoji: '🏪', name: '편의점 알바', salary: 800000, risk: 0.03, dateBonus: 5, difficulty: 8,
    desc: '소소하지만 확실한 시급 · 리스크 낮음',
    incidents: [
      { text: '진상 손님과 시비, 합의금', cost: [200000, 800000] },
      { text: '실수로 시재 펑크', cost: [100000, 500000] },
    ],
  },
  {
    id: 'office', emoji: '🏢', name: '회사원', salary: 2500000, risk: 0.05, dateBonus: 10, difficulty: 30,
    desc: '평범한 직장인의 삶',
    incidents: [
      { text: '회식 후 대리·병원비 폭탄', cost: [300000, 1500000] },
      { text: '프로젝트 실패 책임, 성과급 삭감', cost: [500000, 2500000] },
    ],
  },
  {
    id: 'civil', emoji: '🏛️', name: '공무원', salary: 2200000, risk: 0.02, dateBonus: 12, difficulty: 50,
    desc: '철밥통, 가장 안정적',
    incidents: [
      { text: '민원 스트레스로 병가·치료비', cost: [200000, 1000000] },
    ],
  },
  {
    id: 'dev', emoji: '💻', name: '개발자', salary: 4000000, risk: 0.09, dateBonus: 12, difficulty: 45,
    desc: '야근과 맞바꾼 연봉 · 사고 잦음',
    incidents: [
      { text: '배포 사고로 서버 다운, 배상', cost: [2000000, 15000000] },
      { text: '번아웃 요양, 무급 휴직', cost: [1000000, 6000000] },
      { text: '믿었던 스톡옵션 물거품', cost: [3000000, 10000000] },
    ],
  },
  {
    id: 'doctor', emoji: '⚕️', name: '의사', salary: 7000000, risk: 0.12, dateBonus: 22, difficulty: 85,
    desc: '고소득이지만 사고 한 방이 큼',
    incidents: [
      { text: '의료사고 소송, 배상금', cost: [30000000, 200000000] },
      { text: '개원 대출 이자 폭탄', cost: [5000000, 30000000] },
      { text: '세무조사 추징', cost: [10000000, 50000000] },
    ],
  },
  {
    id: 'youtuber', emoji: '🎥', name: '유튜버', salary: 0, variable: [0, 8000000], risk: 0.15, dateBonus: 18, difficulty: 15,
    desc: '월수입 들쭉날쭉 · 한 방 아니면 폭망',
    incidents: [
      { text: '뒷광고 논란, 손배+수익 정지', cost: [5000000, 40000000] },
      { text: '저작권 소송', cost: [2000000, 20000000] },
      { text: '노이즈 마케팅 역풍, 고소', cost: [3000000, 25000000] },
    ],
  },
  {
    id: 'ceo', emoji: '🕴️', name: '사업가', salary: 0, variable: [-5000000, 20000000], risk: 0.18, dateBonus: 20, difficulty: 25,
    desc: '초고위험 초고수익 · 적자도 가능',
    incidents: [
      { text: '거래처 부도로 미수금 증발', cost: [10000000, 80000000] },
      { text: '운영자금 급해 고리 대출', cost: [20000000, 100000000] },
      { text: '갑질 논란으로 불매·소송', cost: [15000000, 60000000] },
    ],
  },
];

/* 직업 리스크 등급 (UI 표시용) */
function jobRiskTier(job) {
  if (!job || !job.risk) return { icon: '🟢', label: '안전' };
  if (job.risk >= 0.12) return { icon: '🔴', label: '고위험' };
  if (job.risk >= 0.06) return { icon: '🟠', label: '중위험' };
  return { icon: '🟢', label: '저위험' };
}
