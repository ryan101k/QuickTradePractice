/* QuickTrade Life — 가정환경·학창생활·첫 직업 연결 데이터 */
(function(root){
  'use strict';

  const CORE_JOB_IDS = [
    'office','civil','teacher','nurse','flightattendant','chef','trainer',
    'designer','dev','pharmacist','researcher','police','webtoon','trader','sales',
  ];

  const FAMILY_BACKGROUNDS = [
    {
      id:'dual_income',icon:'🏢',name:'맞벌이 직장인 부모',
      desc:'늘 바쁜 부모님 대신 스스로 일정을 챙겼다. 회사 생활의 현실을 일찍 배웠다.',
      result:'성실성과 생활 감각이 높고, 엄마·아빠 두 사람의 연락처가 남는다.',
      cash:500000,credit:25,reputation:3,charm:2,skill:2,
      aptitude:{diligence:12,social:5},jobs:['office','sales','flightattendant','designer'],
      contacts:[{name:'엄마',role:'mother'},{name:'아빠',role:'father'}],
    },
    {
      id:'public_family',icon:'🏛️',name:'공무원·교사 부모',
      desc:'규칙과 책임을 중시하는 집에서 자랐다. 안정적인 진로에 익숙하다.',
      result:'신용과 평판이 높고 공공·교육 직군에 강하다.',
      cash:200000,credit:45,reputation:8,charm:0,skill:4,
      aptitude:{diligence:14,analysis:7},jobs:['civil','teacher','police','office'],
      contacts:[{name:'엄마',role:'mother'},{name:'아빠',role:'father'}],
    },
    {
      id:'medical_family',icon:'🩺',name:'의료계 부모',
      desc:'교대근무와 시험 이야기가 익숙했다. 사람을 돌보는 일의 무게도 알고 있다.',
      result:'분석력과 직무 기초가 높고 의료·연구 직군에 강하다.',
      cash:0,credit:35,reputation:5,charm:1,skill:7,
      aptitude:{analysis:13,diligence:10},jobs:['nurse','pharmacist','researcher'],
      contacts:[{name:'엄마',role:'mother'},{name:'아빠',role:'father'}],
    },
    {
      id:'self_employed',icon:'🏪',name:'자영업 부모',
      desc:'가게 일을 거들며 손님, 매출, 재료비를 생활 속에서 배웠다.',
      result:'대인력과 실전 감각이 높고 서비스·창작 직군에 강하다.',
      cash:800000,credit:-20,reputation:4,charm:5,skill:3,
      aptitude:{social:13,daring:7},jobs:['chef','trainer','designer','sales'],
      contacts:[{name:'엄마',role:'mother'},{name:'아빠',role:'father'}],
    },
    {
      id:'single_guardian',icon:'🫶',name:'한부모·보호자 가정',
      desc:'한 사람과 서로 의지하며 컸다. 도움을 기다리기보다 먼저 움직이는 법을 배웠다.',
      result:'독립성과 대담성이 높지만 초기 자금과 신용은 조금 낮다.',
      cash:-200000,credit:-35,reputation:0,charm:7,skill:5,
      aptitude:{daring:14,stamina:7},jobs:['office','dev','police','trainer'],
      contacts:[{name:'보호자',role:'guardian'}],
    },
  ];

  const SCHOOL_LIVES = [
    {
      id:'student_council',icon:'📣',name:'학생회와 반장 일을 맡았다',
      desc:'행사와 갈등을 조율하며 얼굴이 넓어졌다.',
      result:'대인력·성실성, 학교 친구 신뢰가 높다.',
      charm:6,reputation:7,skill:3,aptitude:{social:15,diligence:8},
      jobs:['civil','teacher','police','flightattendant','office'],
      friends:['김지민','박서진','윤하린'],friendTag:'학생회 친구',
    },
    {
      id:'study',icon:'📚',name:'도서관과 독서실에서 살았다',
      desc:'성적과 자격증을 우선하며 몇 명의 친구와 깊게 지냈다.',
      result:'분석력·성실성, 전문직 진입 가능성이 높다.',
      charm:1,reputation:3,skill:9,aptitude:{analysis:16,diligence:12},
      jobs:['pharmacist','researcher','nurse','civil','dev'],
      friends:['이수현','정민서','최예원'],friendTag:'공부 친구',
    },
    {
      id:'arts',icon:'🎨',name:'예술동아리에 모든 걸 쏟았다',
      desc:'공연, 전시, 마감 때문에 늘 바빴지만 취향이 분명해졌다.',
      result:'창의력·매력, 창작 업계 인연이 높다.',
      charm:10,reputation:2,skill:5,aptitude:{creative:18,social:6},
      jobs:['designer','chef','webtoon','dev'],
      friends:['한소라','임유림','오세린'],friendTag:'동아리 친구',
    },
    {
      id:'sports',icon:'🏃',name:'운동부에서 끝까지 버텼다',
      desc:'훈련과 대회를 거치며 체력과 승부욕을 길렀다.',
      result:'체력·대담성, 현장 대응 직군에 강하다.',
      charm:7,reputation:4,skill:4,fitness:12,aptitude:{stamina:18,daring:10},
      jobs:['trainer','police','flightattendant','nurse'],
      friends:['강민지','문태호','조나현'],friendTag:'운동부 친구',
    },
    {
      id:'computer_finance',icon:'💻',name:'컴퓨터·투자동아리를 만들었다',
      desc:'게임을 만들고 모의투자를 하며 밤을 새웠다.',
      result:'분석력·창의력과 투자 감각이 높지만 조금 외골수다.',
      charm:3,reputation:1,skill:8,aptitude:{analysis:14,creative:12,daring:5},
      jobs:['dev','trader','designer','office','sales'],
      friends:['배준호','신미래','서정우'],friendTag:'동아리 창립 친구',
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
    CORE_JOB_IDS,FAMILY_BACKGROUNDS,SCHOOL_LIVES,WORKPLACE_HEROINE_JOBS,
    family:id=>byId(FAMILY_BACKGROUNDS,id),
    school:id=>byId(SCHOOL_LIVES,id),
  };
})(window);
