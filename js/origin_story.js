/* QuickTrade Life — 아버지·학창생활·재기 서사 연결 데이터 */
(function(root){
  'use strict';

  const CORE_JOB_IDS = [
    'office','civil','teacher','nurse','flightattendant','chef','trainer',
    'designer','dev','pharmacist','researcher','police','webtoon','trader','sales',
  ];
  const PAST_CLUB={
    name:'생활경제연구회',
    incident:'졸업 직전 모의투자 대회 후원사가 차명계좌로 주문을 조작했다. 주인공은 원본 거래 장부를 따로 보관했지만 서로를 의심하는 사이 동아리와 관계가 무너졌고, 후원사는 경쟁 세력의 페이퍼컴퍼니로 사라졌다.',
    attackReason:'주인공이 다시 실전 거래를 시작하자 과거 장부와 같은 주문 습관이 시장에 찍혔다. 경쟁 세력은 조작 증거를 회수하고 혼자인 주인공을 침묵시키려 공격한다.',
    members:['예린','보라','서연','나영','미래'],
  };
  const FIXED_SCHOOL_LIFE_ID='collapsed_club';

  const FAMILY_BACKGROUNDS = [
    {
      id:'father_home',icon:'👨',name:'아버지와 남은 집',
      desc:'학교 사건 뒤에도 아버지는 연락을 끊지 않았다. 생활비는 보내되, 다시 밖으로 나가 네 삶을 만들라고 재촉한다.',
      result:'가족 연락처는 아버지 한 명으로 고정되며 매달 최소 생활비를 받는다.',
      cash:0,credit:0,reputation:0,charm:0,skill:0,
      aptitude:{diligence:4},monthlySupport:1000000,
      contacts:[{name:'아버지',role:'father'}],
    },
  ];

  const SCHOOL_LIVES = [
    {
      id:FIXED_SCHOOL_LIFE_ID,icon:'📉',name:'끝나 버린 생활경제연구회',
      desc:'졸업 직전 공동 연애와 모의투자 대회 사건이 함께 무너졌다.',
      result:'선택한 학창생활이 아니라, 플레이어가 자취방에 틀어박히게 된 고정된 과거다.',
      charm:4,reputation:2,skill:6,aptitude:{analysis:10,creative:6,social:4,diligence:4},
      friends:['시우'],friendTag:'학교 친구',
      childhood:{heroine:'예린',ally:'시우'},guideLine:'야, 살아 있냐? 돈 버는 법 알려 달라더니 답이 없네.',
    },
    {
      id:'student_council',icon:'📣',name:'학생회와 반장 일을 맡았다',
      desc:'행사와 갈등을 조율하며 얼굴이 넓어졌다.',
      result:'대인력·성실성이 높아 조직 운영과 교섭에 유리하다.',
      charm:6,reputation:7,skill:3,aptitude:{social:15,diligence:8},
      friends:['김지민','박서진','윤하린'],friendTag:'학생회 친구',
      childhood:{heroine:'예린',ally:'민준'},guideLine:'직업 좀 가져. 네가 계속 싫다고 해서 투자지원센터도 찾아봤다.',
    },
    {
      id:'study',icon:'📚',name:'도서관과 독서실에서 살았다',
      desc:'성적과 자격증을 우선하며 몇 명의 친구와 깊게 지냈다.',
      result:'분석력·성실성이 높아 회계와 사업 구조 파악에 유리하다.',
      charm:1,reputation:3,skill:9,aptitude:{analysis:16,diligence:12},
      friends:['이수현','정민서','최예원'],friendTag:'공부 친구',
      childhood:{heroine:'보라',ally:'도윤'},guideLine:'취업 원서라도 넣어. 싫으면 최소한 네 돈 굴리는 법부터 제대로 배워.',
    },
    {
      id:'arts',icon:'🎨',name:'예술동아리에 모든 걸 쏟았다',
      desc:'공연, 전시, 마감 때문에 늘 바빴지만 취향이 분명해졌다.',
      result:'창의력·매력이 높아 상품 기획과 평판 관리에 유리하다.',
      charm:10,reputation:2,skill:5,aptitude:{creative:18,social:6},
      friends:['한소라','임유림','오세린'],friendTag:'동아리 친구',
      childhood:{heroine:'서연',ally:'시우'},guideLine:'직업부터 가지라니까 또 싫다고 할 거지? 설명 잘하는 투자지원센터는 찾았다.',
    },
    {
      id:'sports',icon:'🏃',name:'운동부에서 끝까지 버텼다',
      desc:'훈련과 대회를 거치며 체력과 승부욕을 길렀다.',
      result:'체력·대담성이 높아 세력 현장 대응과 위기 수습에 유리하다.',
      charm:7,reputation:4,skill:4,fitness:12,aptitude:{stamina:18,daring:10},
      friends:['강민지','문태호','조나현'],friendTag:'운동부 친구',
      childhood:{heroine:'나영',ally:'건우'},guideLine:'언제까지 방에 있을래. 직업이 싫으면 돈 굴리는 법이라도 배우러 나와.',
    },
    {
      id:'computer_finance',icon:'💻',name:'컴퓨터·투자동아리를 만들었다',
      desc:'게임을 만들고 모의투자를 하며 밤을 새웠다.',
      result:'분석력·창의력이 높아 시장 분석과 운영 자동화에 유리하다.',
      charm:3,reputation:1,skill:8,aptitude:{analysis:14,creative:12,daring:5},
      friends:['배준호','신미래','서정우'],friendTag:'동아리 창립 친구',
      childhood:{heroine:'미래',ally:'시우'},guideLine:'취업은 또 싫다며. 그럼 모의투자 말고 진짜 시장부터 배울 곳은 찾았다.',
    },
  ];

  const WORKPLACE_HEROINE_JOBS = {
    office:['편집자','재벌가 전략실 이사','투자교육 매니저'],
    sales:['재벌가 전략실 이사','모델','승무원'],
    civil:['공무원','교사','경찰관'],
    teacher:['교사','공무원'],
    police:['경찰관','공무원'],
    nurse:['간호사','약사','연구원'],
    pharmacist:['약사','간호사','연구원'],
    researcher:['연구원','약사'],
    flightattendant:['승무원','모델'],
    chef:['파티시에'],
    trainer:['트레이너'],
    designer:['디자이너','프리랜서 일러스트레이터','게임 기획자'],
    webtoon:['프리랜서 일러스트레이터','디자이너','편집자'],
    dev:['게임 기획자','디자이너','프리랜서 일러스트레이터'],
    trader:['투자교육 매니저','재벌가 전략실 이사'],
  };

  const byId=(rows,id)=>rows.find(x=>x.id===id)||null;
  root.QT_ORIGIN={
    CORE_JOB_IDS,FAMILY_BACKGROUNDS,SCHOOL_LIVES,FIXED_SCHOOL_LIFE_ID,WORKPLACE_HEROINE_JOBS,PAST_CLUB,
    family:id=>byId(FAMILY_BACKGROUNDS,id),
    school:id=>byId(SCHOOL_LIVES,id),
    fixedSchool:()=>byId(SCHOOL_LIVES,FIXED_SCHOOL_LIFE_ID),
  };
})(window);
