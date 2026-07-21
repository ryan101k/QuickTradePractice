/* =========================================================================
 *  QuickTrade Life — 선택지 이벤트(LIFE_EVENTS)
 *  장 마감 때 확률로 하나가 팝업 → 플레이어가 선택 → 결과(effects) 반영
 *
 *  event: { id, cat:'job'|'love'|'debt'|'life', emoji, title, desc,
 *           cond?(ctx),  ctx = { job, loan, rel, happy, charm }
 *           options: [ { text, outcome, effects } ] }
 *  effects 키(모두 선택):
 *    cash   : 현금 증감 (숫자 또는 [min,max] 랜덤 · 음수 가능)
 *    debt   : 빚 증감 (숫자 또는 [min,max])
 *    happy  : 행복 증감
 *    charm  : 매력 증감
 *    endRelationshipChance : 이 확률로 이별
 * ========================================================================= */
const LIFE_EVENTS = [
  /* ---------------- 직업(job) ---------------- */
  {
    id: 'job_promo', cat: 'job', emoji: '📈', title: '승진 제안',
    desc: '상사가 승진을 제안합니다. 책임은 커지지만 보너스가 붙습니다.',
    cond: c => c.job !== 'none',
    options: [
      { text: '수락한다 (보너스+, 스트레스)', effects: { cash: [2000000, 8000000], happy: -6 }, outcome: '두둑한 보너스를 받았지만 업무가 늘었다.' },
      { text: '거절한다 (마음의 평화)', effects: { happy: 5 }, outcome: '워라밸을 택했다.' },
    ],
  },
  {
    id: 'job_side', cat: 'job', emoji: '💡', title: '주말 부업 제안',
    desc: '지인이 짭짤한 주말 부업을 소개합니다.',
    options: [
      { text: '한다 (돈+, 행복-)', effects: { cash: [500000, 2500000], happy: -6 }, outcome: '주말을 반납하고 돈을 벌었다.' },
      { text: '쉰다', effects: { happy: 5 }, outcome: '푹 쉬며 재충전했다.' },
    ],
  },
  {
    id: 'job_coin', cat: 'job', emoji: '🪙', title: '동료의 "확실한" 코인',
    desc: '동료가 무조건 오른다며 코인을 추천합니다.',
    options: [
      { text: '크게 넣는다 (복불복)', effects: { cash: [-6000000, 20000000] }, outcome: '결과는 하늘에 맡겼다...' },
      { text: '무시한다', effects: {}, outcome: '평정심을 지켰다.' },
    ],
  },

  /* ---------------- 빚(debt) ---------------- */
  {
    id: 'debt_call', cat: 'debt', emoji: '📵', title: '대출 상환 독촉',
    desc: '금융사에서 상환을 독촉하는 전화가 왔습니다.',
    cond: c => c.loan > 0,
    options: [
      { text: '일부 갚는다', effects: { cash: -3000000, debt: -3000000 }, outcome: '빚을 조금 줄였다.' },
      { text: '버틴다 (연체이자)', effects: { debt: [1000000, 5000000], happy: -5 }, outcome: '연체이자가 붙어 빚이 늘었다.' },
    ],
  },
  {
    id: 'debt_consolidate', cat: 'debt', emoji: '🏦', title: '대환대출 제안',
    desc: '더 낮은 금리로 갈아탈 기회가 왔습니다.',
    cond: c => c.loan >= 10000000,
    options: [
      { text: '갈아탄다 (빚 경감)', effects: { debt: [-8000000, -3000000], happy: 4 }, outcome: '이자 부담이 줄었다.' },
      { text: '그냥 둔다', effects: {}, outcome: '귀찮아서 넘겼다.' },
    ],
  },
  {
    id: 'debt_family', cat: 'debt', emoji: '👨‍👩‍👧', title: '가족의 부탁',
    desc: '가족이 급하다며 돈을 빌려달라 합니다.',
    options: [
      { text: '빌려준다', effects: { cash: -5000000, happy: 6 }, outcome: '가족을 도왔다. 돌려받을 수 있을까?' },
      { text: '거절한다', effects: { happy: -8 }, outcome: '마음이 영 불편하다.' },
    ],
  },
  {
    id: 'debt_loanshark', cat: 'debt', emoji: '🦈', title: '사채업자의 유혹',
    desc: '급전이 필요하면 바로 빌려준다는 제안이 왔습니다.',
    cond: c => c.loan > 30000000,
    options: [
      { text: '당장 빌린다 (고리)', effects: { cash: 10000000, debt: 15000000, happy: -8 }, outcome: '급한 불은 껐지만 이자가 무섭다...' },
      { text: '거절한다', effects: { happy: 3 }, outcome: '위험을 피했다.' },
    ],
  },

  /* ---------------- 연애(love) ---------------- */
  {
    id: 'love_anniv', cat: 'love', emoji: '🎁', title: '기념일',
    desc: '연인과의 기념일입니다. 선물을 어떻게 할까요?',
    cond: c => c.rel !== 'single',
    options: [
      { text: '비싼 선물 (매력↑↑)', effects: { cash: -2000000, charm: 15, happy: 5 }, outcome: '연인이 크게 감동했다.' },
      { text: '소소한 선물', effects: { cash: -300000, charm: 4 }, outcome: '마음은 전해졌다.' },
      { text: '깜빡한다', effects: { charm: -12, happy: -5 }, outcome: '연인이 단단히 서운해한다...' },
    ],
  },
  {
    id: 'love_fight', cat: 'love', emoji: '⚡', title: '연인과 다툼',
    desc: '사소한 일로 크게 다퉜습니다.',
    cond: c => c.rel !== 'single',
    options: [
      { text: '먼저 사과한다', effects: { charm: 8, happy: 2 }, outcome: '금세 화해했다.' },
      { text: '고집부린다', effects: { charm: -12, happy: -4, endRelationshipChance: 0.3 }, outcome: '분위기가 싸늘하다...' },
    ],
  },
  {
    id: 'love_ex', cat: 'love', emoji: '💌', title: '전 애인의 연락',
    desc: '전 애인에게서 갑자기 연락이 왔습니다.',
    cond: c => c.rel !== 'single',
    options: [
      { text: '무시한다', effects: { charm: 5 }, outcome: '현재의 사랑에 충실하기로 했다.' },
      { text: '몰래 만난다', effects: { happy: -3, endRelationshipChance: 0.5 }, outcome: '현 연인이 알면 큰일인데...' },
    ],
  },
  {
    id: 'love_blind', cat: 'love', emoji: '☕', title: '소개팅 제안',
    desc: '친구가 괜찮은 사람이 있다며 소개팅을 주선합니다.',
    cond: c => c.rel === 'single',
    options: [
      { text: '나간다', effects: { cash: -200000, charm: [6, 20] }, outcome: '좋은 인연이 될지도?' },
      { text: '안 나간다', effects: { happy: 3 }, outcome: '집이 최고다.' },
    ],
  },

  /* ---------------- 일상(life) ---------------- */
  {
    id: 'life_lotto', cat: 'life', emoji: '🎰', title: '복권',
    desc: '문득 로또를 사고 싶어집니다.',
    options: [
      { text: '산다 (인생 한 방?)', effects: { cash: [-10000, 50000000] }, outcome: '두근두근... 결과를 확인했다.' },
      { text: '안 산다', effects: {}, outcome: '현실적인 선택.' },
    ],
  },
  {
    id: 'life_health', cat: 'life', emoji: '🤒', title: '건강 이상 신호',
    desc: '몸이 계속 안 좋습니다. 병원에 갈까요?',
    options: [
      { text: '제대로 치료받는다', effects: { cash: -1500000, happy: 8 }, outcome: '건강을 되찾았다.' },
      { text: '참고 버틴다', effects: { happy: -10 }, outcome: '몸이 더 안 좋아졌다...' },
    ],
  },
  {
    id: 'life_voice', cat: 'life', emoji: '🎣', title: '수상한 전화',
    desc: '"○○검찰청입니다. 당신 계좌가 범죄에 연루됐습니다."',
    options: [
      { text: '시키는 대로 한다', effects: { cash: -8000000, happy: -15 }, outcome: '당했다! 보이스피싱이었다.' },
      { text: '바로 끊는다', effects: { happy: 3 }, outcome: '현명하게 대처했다.' },
    ],
  },
  {
    id: 'life_charity', cat: 'life', emoji: '🤝', title: '기부 요청',
    desc: '어려운 이웃을 돕는 모금 캠페인을 마주쳤습니다.',
    options: [
      { text: '기부한다', effects: { cash: -1000000, happy: 12 }, outcome: '마음이 뿌듯하다.' },
      { text: '그냥 지나친다', effects: {}, outcome: '다음 기회에...' },
    ],
  },
];
