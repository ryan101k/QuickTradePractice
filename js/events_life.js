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

/* =========================================================================
 *  추가 이벤트 — 투자자로 사는 일상의 압박, 돈과 사람 사이의 선택
 * ========================================================================= */
LIFE_EVENTS.push(
  /* ---------------- 투자자의 일상 ---------------- */
  {
    id: 'inv_hotlist', cat: 'life', emoji: '📱', title: '단톡방 성지글',
    desc: '주식 단톡방에 "이번 주 안에 두 배 간다"는 종목 하나가 계속 올라옵니다. 이미 몇 명은 샀다고 인증했습니다.',
    options: [
      { text: '직접 재무제표부터 열어본다', effects: { happy: -2 }, outcome: '적자에 부채비율 400%였다. 조용히 창을 닫았다.' },
      { text: '소액만 따라 들어간다', effects: { cash: [-3000000, 4000000] }, outcome: '결과는 반반이었다. 다만 하루 종일 호가창만 봤다.' },
      { text: '단톡방을 나간다', effects: { happy: 8 }, outcome: '알림이 사라지자 머리가 맑아졌다.' },
    ],
  },
  {
    id: 'inv_lossnight', cat: 'life', emoji: '🌙', title: '잠 못 드는 밤',
    desc: '계좌가 크게 물렸습니다. 새벽 세 시, 미국 선물 지수를 열 번째 새로고침하고 있습니다.',
    cond: c => c.loan > 0 || c.happy < 60,
    options: [
      { text: '휴대폰을 끄고 눕는다', effects: { happy: 6 }, outcome: '아침에 보니 그새 반등해 있었다. 밤새 봐도 달라질 건 없었다.' },
      { text: '손실 원인을 노트에 정리한다', effects: { happy: 3, charm: 2 }, outcome: '"진입 근거 없음"이라고 쓰고 나니 부끄러웠지만, 기록이 남았다.' },
      { text: '물타기 할 돈을 계산한다', effects: { cash: -2000000, happy: -8 }, outcome: '평단은 낮아졌지만 잠은 더 안 왔다.' },
    ],
  },
  {
    id: 'inv_friendtip', cat: 'life', emoji: '🤫', title: '친구의 내부 정보',
    desc: '대기업에 다니는 친구가 "다음 주 공시 나기 전에 사둬"라며 종목을 알려줍니다.',
    options: [
      { text: '정중히 거절하고 화제를 돌린다', effects: { happy: 4 }, outcome: '"조심하는 게 맞지." 친구도 머쓱해하며 웃었다.' },
      { text: '친구에게 위험하다고 말려준다', effects: { happy: 6, charm: 3 }, outcome: '며칠 뒤 친구가 고맙다고 연락이 왔다. 실제로 조사가 있었다고 한다.' },
      { text: '조용히 사둔다', effects: { cash: [-8000000, 15000000], happy: -5 }, outcome: '수익은 났지만, 공시 뜨는 날까지 심장이 내려앉았다.' },
    ],
  },
  {
    id: 'inv_youtube', cat: 'life', emoji: '📺', title: '유료 리딩방 광고',
    desc: '"월 수익률 40% 보장"이라는 리딩방 광고가 계속 따라다닙니다. 첫 달은 반값이라고 합니다.',
    options: [
      { text: '무시한다', effects: {}, outcome: '보장이라는 단어가 이미 답이었다.' },
      { text: '한 달만 결제해본다', effects: { cash: -1500000, happy: -6 }, outcome: '"지금 들어가세요"만 반복했다. 환불은 안 된다고 한다.' },
      { text: '금융감독원에 신고한다', effects: { happy: 7 }, outcome: '며칠 뒤 그 계정이 사라졌다.' },
    ],
  },
  {
    id: 'inv_windfall', cat: 'life', emoji: '🎯', title: '뜻밖의 수익',
    desc: '오래전 잊고 있던 종목이 급등해 계좌에 큰 수익이 찍혔습니다. 손이 떨립니다.',
    cond: c => c.happy >= 40,
    options: [
      { text: '절반만 익절하고 나머지는 둔다', effects: { cash: [3000000, 9000000], happy: 8 }, outcome: '욕심과 두려움을 반반씩 인정한 선택이었다.' },
      { text: '전부 팔고 한동안 쉰다', effects: { cash: [5000000, 12000000], happy: 5 }, outcome: '계좌를 닫고 오랜만에 푹 잤다.' },
      { text: '수익금 전부를 몰빵한다', effects: { cash: [-15000000, 30000000], happy: -4 }, outcome: '결과가 어떻든, 이 습관은 언젠가 대가를 치른다.' },
    ],
  },

  /* ---------------- 사람과 돈 사이 ---------------- */
  {
    id: 'life_lendfriend', cat: 'life', emoji: '🙏', title: '친구의 돈 부탁',
    desc: '오래된 친구가 "석 달만"이라며 목돈을 빌려달라고 합니다. 눈을 잘 못 마주칩니다.',
    options: [
      { text: '빌려주되 차용증을 쓴다', effects: { cash: -5000000, happy: 2 }, outcome: '"이렇게 하는 게 서로 편하지." 친구도 고개를 끄덕였다.' },
      { text: '못 갚아도 될 만큼만 준다', effects: { cash: -1500000, happy: 6 }, outcome: '돌려받을 생각을 접자 관계가 편해졌다.' },
      { text: '거절한다', effects: { happy: -5 }, outcome: '그날 이후 연락이 뜸해졌다.' },
    ],
  },
  {
    id: 'life_familyask', cat: 'life', emoji: '🏠', title: '가족의 사업 자금',
    desc: '가족이 사업을 해보겠다며 투자를 부탁합니다. 계획서는 두 장짜리입니다.',
    options: [
      { text: '사업계획을 같이 다시 짠다', effects: { happy: 5, cash: -500000 }, outcome: '숫자를 채워 넣다 보니 가족도 스스로 무리라는 걸 알았다.' },
      { text: '잃어도 되는 돈만 투자한다', effects: { cash: [-10000000, 20000000] }, outcome: '결과는 하늘에 맡겼다. 관계는 지켰다.' },
      { text: '단호히 거절한다', effects: { happy: -8 }, outcome: '명절 밥상이 조용해졌다.' },
    ],
  },
  {
    id: 'life_flexpost', cat: 'life', emoji: '📸', title: '수익 인증의 유혹',
    desc: '수익 캡처를 SNS에 올릴까 고민 중입니다. 손가락이 업로드 버튼 위에 멈춰 있습니다.',
    options: [
      { text: '올리지 않는다', effects: { happy: 3 }, outcome: '조용히 버는 게 오래 버는 길이라고 되뇌었다.' },
      { text: '올린다', effects: { charm: 5, happy: -3 }, outcome: '좋아요는 늘었지만, 돈 빌려달라는 DM도 세 통 왔다.' },
      { text: '손실 캡처를 같이 올린다', effects: { charm: 8, happy: 5 }, outcome: '"이 사람은 솔직하네"라는 댓글이 달렸다.' },
    ],
  },
  {
    id: 'life_oldfriend', cat: 'life', emoji: '☎️', title: '10년 만의 연락',
    desc: '10년 만에 연락 온 동창이 커피를 사겠다고 합니다. 어쩐지 보험 이야기가 나올 것 같습니다.',
    options: [
      { text: '나가서 옛날 얘기만 하고 온다', effects: { happy: 7, cash: -30000 }, outcome: '정말 옛날 얘기만 했다. 괜히 의심한 게 미안했다.' },
      { text: '용건을 먼저 물어본다', effects: { happy: 2 }, outcome: '"사실은…" 예상대로였지만, 솔직해서 오히려 덜 불편했다.' },
      { text: '바쁘다고 미룬다', effects: { happy: -2 }, outcome: '두 번 다시 연락은 오지 않았다.' },
    ],
  },

  /* ---------------- 몸과 마음 ---------------- */
  {
    id: 'life_backpain', cat: 'life', emoji: '🪑', title: '굳어버린 어깨',
    desc: '하루 종일 차트를 보다 보니 목과 어깨가 돌처럼 굳었습니다.',
    options: [
      { text: '정형외과에 간다', effects: { cash: -300000, happy: 6 }, outcome: '자세 교정 처방을 받았다. 확실히 낫다.' },
      { text: '스트레칭 습관을 만든다', effects: { happy: 8 }, outcome: '한 시간에 한 번 알람을 맞췄다. 돈도 안 들었다.' },
      { text: '진통제로 버틴다', effects: { cash: -50000, happy: -4 }, outcome: '당장은 괜찮지만 점점 잦아진다.' },
    ],
  },
  {
    id: 'life_burnout', cat: 'life', emoji: '🕯️', title: '아무것도 하기 싫은 날',
    desc: '아침에 눈을 떴는데 아무것도 하고 싶지 않습니다. 계좌를 열 마음도 안 납니다.',
    cond: c => c.happy < 50,
    options: [
      { text: '하루 완전히 쉰다', effects: { happy: 14 }, outcome: '알림을 다 끄고 잤다. 세상은 아무 일 없이 돌아갔다.' },
      { text: '가까운 사람에게 털어놓는다', effects: { happy: 10, charm: 2 }, outcome: '"나도 그래." 그 한마디가 컸다.' },
      { text: '억지로 평소처럼 지낸다', effects: { happy: -6 }, outcome: '버티긴 했지만, 다음 주에 더 크게 왔다.' },
    ],
  },
  {
    id: 'life_moving', cat: 'life', emoji: '📦', title: '전세 만기 통보',
    desc: '집주인이 만기에 맞춰 보증금을 올리겠다고 연락했습니다.',
    options: [
      { text: '주변 시세를 조사해 협상한다', effects: { cash: -1000000, happy: 5 }, outcome: '근거를 들이대자 인상폭이 절반으로 줄었다.' },
      { text: '요구를 받아들인다', effects: { cash: -8000000, happy: -3 }, outcome: '이사 비용보다는 싸다고 스스로를 설득했다.' },
      { text: '더 싼 곳으로 이사한다', effects: { cash: -3000000, happy: -6 }, outcome: '출퇴근이 40분 늘었다. 통장은 조금 편해졌다.' },
    ],
  },
  {
    id: 'life_parenthealth', cat: 'life', emoji: '🏥', title: '부모님의 검진 결과',
    desc: '부모님 건강검진에서 재검사가 필요하다는 연락이 왔습니다.',
    options: [
      { text: '휴가를 내고 같이 병원에 간다', effects: { cash: -500000, happy: 10 }, outcome: '다행히 큰 문제는 아니었다. 같이 간 게 더 오래 기억에 남았다.' },
      { text: '검사비를 보내드린다', effects: { cash: -1500000, happy: 4 }, outcome: '"바쁜데 뭐하러." 목소리는 서운함 반, 고마움 반이었다.' },
      { text: '결과 나오면 알려달라고 한다', effects: { happy: -7 }, outcome: '결과는 괜찮았다. 다만 그 통화가 계속 마음에 걸렸다.' },
    ],
  },

  /* ---------------- 직장 ---------------- */
  {
    id: 'job_sidehustle', cat: 'job', emoji: '🌙', title: '부업 제안',
    desc: '주말에만 하면 되는 부업 제안이 들어왔습니다. 회사 규정상 겸업은 애매합니다.',
    cond: c => c.job !== 'none',
    options: [
      { text: '회사에 먼저 확인한다', effects: { happy: 3 }, outcome: '신고 후 승인받았다. 마음 편히 시작했다.' },
      { text: '몰래 시작한다', effects: { cash: [1000000, 4000000], happy: -5 }, outcome: '돈은 들어오지만 들킬까 봐 계속 신경이 쓰인다.' },
      { text: '거절하고 본업에 집중한다', effects: { happy: 5 }, outcome: '한 우물을 파기로 했다.' },
    ],
  },
  {
    id: 'job_blame', cat: 'job', emoji: '🫥', title: '남의 실수, 내 이름',
    desc: '동료의 실수로 생긴 문제인데 회의에서 내 이름이 거론됐습니다.',
    cond: c => c.job !== 'none',
    options: [
      { text: '기록을 정리해 조용히 해명한다', effects: { happy: 4, charm: 3 }, outcome: '감정 없이 사실만 정리해 보내자 정정됐다.' },
      { text: '회의 자리에서 바로 반박한다', effects: { happy: -3 }, outcome: '사실은 밝혀졌지만 분위기는 오래 껄끄러웠다.' },
      { text: '그냥 뒤집어쓴다', effects: { happy: -10 }, outcome: '한 번 넘어가자 다음에도 같은 일이 생겼다.' },
    ],
  },
  {
    id: 'job_counteroffer', cat: 'job', emoji: '💼', title: '역제안',
    desc: '이직 의사를 밝히자 회사가 연봉 인상을 제안합니다.',
    cond: c => c.job !== 'none',
    options: [
      { text: '조건을 문서로 남기고 남는다', effects: { cash: [2000000, 6000000], happy: 4 }, outcome: '구두 약속은 사라진다는 걸 알고 있었다.' },
      { text: '그래도 나간다', effects: { happy: 6 }, outcome: '돈 때문에 나가는 게 아니었다.' },
      { text: '구두 약속만 믿고 남는다', effects: { happy: -6 }, outcome: '반년 뒤, 그런 얘기 한 적 없다는 답이 돌아왔다.' },
    ],
  },

  /* ---------------- 빚 ---------------- */
  {
    id: 'debt_bundle', cat: 'debt', emoji: '🧮', title: '빚 정리 상담',
    desc: '여러 곳에 흩어진 빚을 한 곳으로 묶어주겠다는 안내를 받았습니다.',
    cond: c => c.loan > 5000000,
    options: [
      { text: '금리를 비교해 갈아탄다', effects: { debt: -3000000, happy: 6 }, outcome: '이자 부담이 눈에 띄게 줄었다.' },
      { text: '수수료가 아까워 그냥 둔다', effects: {}, outcome: '아무것도 달라지지 않았다.' },
      { text: '한도를 더 받아 생활비로 쓴다', effects: { cash: 3000000, debt: 5000000, happy: -4 }, outcome: '당장은 숨통이 트였지만 원금은 늘었다.' },
    ],
  },
  {
    id: 'debt_collector_calls', cat: 'debt', emoji: '📞', title: '하루 열 통의 전화',
    desc: '모르는 번호로 하루에 열 통씩 전화가 옵니다.',
    cond: c => c.loan > 10000000,
    options: [
      { text: '직접 연락해 상환 계획을 협의한다', effects: { happy: 5, debt: -1000000 }, outcome: '분할 상환으로 조정됐다. 피하는 것보다 나았다.' },
      { text: '신용회복위원회에 상담을 신청한다', effects: { happy: 8 }, outcome: '혼자 감당할 문제가 아니라는 걸 알게 됐다.' },
      { text: '번호를 계속 차단한다', effects: { happy: -8, debt: 1000000 }, outcome: '연체 가산금만 늘었다.' },
    ],
  },

  /* ---------------- 도덕성과 죄책감 ---------------- */
  {
    id:'moral_wallet',cat:'social',emoji:'👛',title:'주인 없는 지갑',desc:'현금과 신분증이 든 지갑을 발견했습니다. 주변에는 보는 사람이 없습니다.',
    options:[
      {text:'경찰서에 그대로 맡긴다',effects:{morality:8,guilt:-5,happy:3},outcome:'며칠 뒤 주인에게서 감사 연락이 왔다.'},
      {text:'현금만 챙기고 지갑은 둔다',effects:{cash:600000,morality:-12,guilt:10},outcome:'당장은 이득이었지만 신분증 사진이 자꾸 떠올랐다.'},
      {text:'못 본 척 지나간다',effects:{morality:-2},outcome:'관여하지 않았지만 마음 한편이 불편했다.'}
    ]
  },
  {
    id:'moral_blame',cat:'job',emoji:'📎',title:'동료에게 책임 넘기기',desc:'내 실수로 생긴 문제가 아직 누구 책임인지 밝혀지지 않았습니다.',
    cond:c=>c.job!=='none',options:[
      {text:'내 실수라고 먼저 말한다',effects:{morality:9,guilt:-12,happy:-2},outcome:'질책은 받았지만 동료의 신뢰는 지켰다.'},
      {text:'말없이 수습부터 한다',effects:{morality:3,guilt:-4},outcome:'밤늦게까지 일해 문제를 겨우 막았다.'},
      {text:'신입의 실수처럼 꾸민다',effects:{morality:-16,guilt:18,happy:2},outcome:'나는 빠져나왔지만 신입이 대신 고개를 숙였다.'}
    ]
  },
  {
    id:'moral_tip',cat:'market',emoji:'🤫',title:'공개 전 정보',desc:'지인이 아직 발표되지 않은 회사 내부 정보를 조용히 알려줬습니다.',
    options:[
      {text:'거래하지 않고 대화를 끝낸다',effects:{morality:10,guilt:-6},outcome:'놓친 수익보다 지킨 원칙이 오래 남았다.'},
      {text:'소액만 몰래 거래한다',effects:{cash:1800000,morality:-12,guilt:12},outcome:'수익은 났지만 알림이 울릴 때마다 가슴이 철렁했다.'},
      {text:'정보를 다른 사람에게도 판다',effects:{cash:5000000,morality:-24,guilt:22},outcome:'돈과 함께 위험한 공범 관계도 생겼다.'}
    ]
  },
  {
    id:'moral_confession',cat:'love',emoji:'🌫️',title:'잠들지 못한 밤',desc:'최근 했던 거짓말과 선택이 계속 떠오릅니다. 가까운 사람에게 말할지 고민됩니다.',
    cond:c=>c.guilt>=35,options:[
      {text:'사실과 책임을 모두 인정한다',effects:{morality:7,guilt:-22,affection:-3},outcome:'관계는 흔들렸지만 더 큰 거짓말은 멈췄다.'},
      {text:'좋은 일로 만회하려 한다',effects:{cash:-500000,morality:4,guilt:-10},outcome:'선행은 도움이 됐지만 사과를 대신할 수는 없었다.'},
      {text:'상대가 예민한 탓으로 돌린다',effects:{morality:-10,guilt:8,affection:-12},outcome:'죄책감을 피하려다 다툼만 더 커졌다.'}
    ]
  },
  {
    id:'moral_low_offer',cat:'social',emoji:'🌓',title:'쉬운 돈의 제안',desc:'누군가 책임질 사람은 따로 있다며 서류에 이름만 빌려달라고 합니다.',
    cond:c=>c.morality<40,options:[
      {text:'이제라도 선을 긋고 거절한다',effects:{morality:12,guilt:-8},outcome:'늦었지만 반복되는 선택을 끊었다.'},
      {text:'조건을 더 올려 받는다',effects:{cash:4000000,morality:-15,guilt:10},outcome:'쉽게 번 돈만큼 빠져나오기 어려워졌다.'},
      {text:'연인이나 친구에게 대신 부탁한다',effects:{morality:-18,guilt:16,affection:-10},outcome:'내 위험을 가까운 사람에게 떠넘겼다.'}
    ]
  },
  {
    id:'narae_review',cat:'market',emoji:'🧭',title:'나래의 거래 복기',desc:'나래가 최근 거래 기록을 펼쳐 놓고 묻습니다. “왜 샀는지 한 문장으로 설명할 수 있어요?”',cond:c=>c.naraeKnown,
    options:[
      {text:'손실 거래까지 전부 복기한다',effects:{happy:-2,morality:4},outcome:'아픈 기록을 피하지 않자 반복되는 실수가 보이기 시작했다.'},
      {text:'매수 기준과 손절 기준을 새로 적는다',effects:{happy:4},outcome:'다음 거래에서 확인할 짧은 원칙표가 생겼다.'},
      {text:'운이 나빴을 뿐이라고 넘긴다',effects:{guilt:4},outcome:'나래는 차트를 덮으며 같은 실수는 운이 아니라고 말했다.'}
    ]
  },
  {
    id:'narae_sponsor',cat:'social',emoji:'📚',title:'무료 교육 후원',desc:'나래가 빚투 피해자를 위한 무료 투자교육을 열자고 제안합니다.',cond:c=>c.naraeKnown,
    options:[
      {text:'교육비를 후원한다',effects:{cash:-1500000,morality:10,guilt:-8,happy:5},outcome:'누군가가 같은 실수를 피했다는 후기가 도착했다.'},
      {text:'내 실패 사례만 제공한다',effects:{morality:6,guilt:-4},outcome:'돈 대신 솔직한 경험이 좋은 교재가 됐다.'},
      {text:'수익이 안 된다며 거절한다',effects:{morality:-3},outcome:'나래는 짧게 알겠다며 혼자 준비를 이어갔다.'}
    ]
  },
  {
    id:'taesik_collection_job',cat:'debt',emoji:'🦈',title:'장태식의 수금 동행',desc:'장태식이 채무 일부를 깎아주는 대신 다른 채무자를 찾아가는 길에 동행하라고 합니다.',cond:c=>c.hasShark||c.makjang,
    options:[
      {text:'거절하고 정식 상환계획을 요구한다',effects:{debt:-500000,morality:8,guilt:-5,happy:-3},outcome:'태식은 비웃었지만 협상 내용을 문서로 남겼다.'},
      {text:'말만 전달하고 위협에는 가담하지 않는다',effects:{debt:-2000000,morality:-8,guilt:10},outcome:'직접 손대진 않았지만 상대의 겁먹은 표정이 남았다.'},
      {text:'적극적으로 수금을 돕는다',effects:{debt:-6000000,cash:2000000,morality:-22,guilt:20},outcome:'빚은 줄었지만 이제 장태식 쪽 사람이라는 소문이 돌기 시작했다.'}
    ]
  },
  {
    id:'taesik_loyalty',cat:'debt',emoji:'🔥',title:'장태식의 충성 시험',desc:'장태식이 위험한 돈가방을 하룻밤만 맡아달라고 합니다. 이유는 알려주지 않습니다.',cond:c=>c.makjang,
    options:[
      {text:'가방을 열지 않고 돌려준다',effects:{cash:3000000,morality:-6,guilt:5},outcome:'태식은 약속을 지킨 값이라며 돈을 던졌다.'},
      {text:'경찰에 신고한다',effects:{morality:16,guilt:-12,happy:-5},outcome:'위험한 관계를 끊을 기회가 생겼지만 보복 가능성도 남았다.'},
      {text:'일부를 빼돌린다',effects:{cash:12000000,morality:-18,guilt:15,happy:-8},outcome:'당장은 들키지 않았지만 태식의 의심이 시작됐다.'}
    ]
  }
);
