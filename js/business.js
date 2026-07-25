/* QuickTrade Life — 독립 사업체·직원·월간 보고 엔진 */
(function(root){'use strict';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const finite=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;

const STAFF={
  internal:{
    id:'internal',name:'내부 운영팀',role:'사업 운영 담당',emoji:'🧑‍💼',
    portrait:'mob-faction-intel.png',
    intro:'사업 설립과 동시에 배치되는 일반 운영팀입니다. 특별 책임자는 사교 모임에서 소개받은 뒤 별도로 영입할 수 있습니다.',
  },
  corporate:{
    id:'corporate',name:'차서윤',role:'재무·계약 총괄',emoji:'📑',
    portrait:'mob-corporate.png',
    intro:'숫자와 계약서에서 먼저 위험을 찾아내는 총괄 실무자입니다.',
  },
  office:{
    id:'office',name:'박지수',role:'운영 매니저',emoji:'📋',
    portrait:'mob-office-neutral.png',portraitBase:'mob-office',
    intro:'재고와 고객 응대를 조용히 정리하는 운영 담당자입니다.',
  },
  creative:{
    id:'creative',name:'한이슬',role:'콘텐츠 제작 실장',emoji:'🎨',
    portrait:'mob-creative-neutral.png',portraitBase:'mob-creative',
    intro:'브랜드의 색과 제작 일정을 동시에 지키는 제작 책임자입니다.',
  },
  medical:{
    id:'medical',name:'오혜린',role:'현장 서비스 책임자',emoji:'🩺',
    portrait:'mob-medical.png',
    intro:'고객 안전과 근무표를 함께 책임지는 현장 관리자입니다.',
  },
};

const STRATEGIES={
  balanced:{id:'balanced',icon:'⚖️',name:'균형 운영',sales:1,cost:1,reputation:0,morale:0,desc:'담당자가 매출과 현장 상태를 고르게 관리'},
  growth:{id:'growth',icon:'🚀',name:'성장 집중',sales:1.18,cost:1.10,reputation:.25,morale:-.8,desc:'광고·영업을 늘려 매출을 키우지만 현장이 바빠짐'},
  quality:{id:'quality',icon:'✨',name:'품질 우선',sales:1.06,cost:1.14,reputation:1.1,morale:.7,desc:'비용을 더 써서 평판과 직원 상태를 함께 관리'},
  lean:{id:'lean',icon:'🧮',name:'비용 절감',sales:.94,cost:.82,reputation:-.7,morale:-1.3,desc:'당장 순익은 지키지만 평판과 사기가 서서히 하락'},
};

const TYPES=[
  {
    id:'commerce',name:'온라인 유통사',icon:'📦',managerId:'office',
    cost:18000000,resaleRate:.58,baseSales:4100000,fixedCost:2600000,variance:.22,
    desc:'재고를 들여 온라인으로 판매합니다. 호황에는 강하지만 재고와 공급가 변동을 감당해야 합니다.',
    phase:{boom:1.16,overheating:1.10,recovery:1.06,tightening:.93,recession:.82,crisis:.72,stimulus:1.02},
  },
  {
    id:'studio',name:'콘텐츠 스튜디오',icon:'🎬',managerId:'creative',
    cost:24000000,resaleRate:.52,baseSales:5400000,fixedCost:3400000,variance:.30,
    desc:'영상·디자인 프로젝트를 수주합니다. 변동성이 크지만 평판과 좋은 계약이 쌓이면 빠르게 성장합니다.',
    phase:{boom:1.12,overheating:1.08,recovery:1.04,tightening:.91,recession:.86,crisis:.76,stimulus:1.08},
  },
  {
    id:'advisory',name:'기업 자문사',icon:'🏢',managerId:'corporate',
    cost:45000000,resaleRate:.65,baseSales:8200000,fixedCost:5500000,variance:.18,
    desc:'재무·계약·운영 자문을 제공합니다. 초기비용이 높지만 장기계약을 확보하면 비교적 안정적입니다.',
    phase:{boom:1.10,overheating:1.05,recovery:1.06,tightening:1.02,recession:.96,crisis:.92,stimulus:1.04},
  },
  {
    id:'care',name:'돌봄·웰니스 센터',icon:'🌿',managerId:'medical',
    cost:32000000,resaleRate:.60,baseSales:6100000,fixedCost:4100000,variance:.16,
    desc:'예약 기반 돌봄·건강관리 서비스를 운영합니다. 경기 방어적이지만 인력과 안전 기준을 낮출 수 없습니다.',
    phase:{boom:1.04,overheating:1.02,recovery:1.05,tightening:.99,recession:1.01,crisis:.96,stimulus:1.08},
  },
  {
    id:'food',name:'동네 식음료 브랜드',icon:'☕',managerId:'office',
    cost:14000000,resaleRate:.48,baseSales:3600000,fixedCost:2450000,variance:.20,
    desc:'작은 매장에서 시작해 단골과 배달 매출을 쌓습니다. 평판과 직원 사기의 영향을 크게 받습니다.',
    phase:{boom:1.09,overheating:1.04,recovery:1.05,tightening:.94,recession:.88,crisis:.78,stimulus:1.05},
  },
  {
    id:'logistics',name:'도심 물류 대행사',icon:'🚚',managerId:'corporate',
    cost:38000000,resaleRate:.64,baseSales:7200000,fixedCost:4900000,variance:.17,
    desc:'기업 배송과 창고 운영 계약을 맡습니다. 초기 투자는 크지만 장기계약을 잡으면 안정적입니다.',
    phase:{boom:1.15,overheating:1.10,recovery:1.07,tightening:.96,recession:.90,crisis:.84,stimulus:1.03},
  },
  {
    id:'franchise',name:'생활 서비스 프랜차이즈',icon:'🏪',managerId:'office',
    cost:52000000,resaleRate:.60,baseSales:9200000,fixedCost:6200000,variance:.19,
    desc:'여러 지점의 근무표·재고·고객 응대를 표준화합니다. 직원 수와 운영 방침의 영향을 크게 받습니다.',
    phase:{boom:1.13,overheating:1.06,recovery:1.07,tightening:.94,recession:.89,crisis:.80,stimulus:1.08},
  },
  {
    id:'game_lab',name:'인디 게임 개발사',icon:'🎮',managerId:'creative',
    cost:36000000,resaleRate:.50,baseSales:7600000,fixedCost:5000000,variance:.34,
    desc:'작은 팀으로 게임을 개발하고 운영합니다. 흥행 편차가 크지만 좋은 제작진과 평판이 쌓이면 폭발적으로 성장합니다.',
    phase:{boom:1.13,overheating:1.09,recovery:1.05,tightening:.90,recession:.84,crisis:.72,stimulus:1.12},
  },
  {
    id:'brand_house',name:'브랜드·광고 에이전시',icon:'🪄',managerId:'creative',
    cost:30000000,resaleRate:.55,baseSales:6500000,fixedCost:4250000,variance:.26,
    desc:'기업의 캠페인과 브랜드를 제작합니다. 수주 평판과 직원 사기가 곧 매출로 이어집니다.',
    phase:{boom:1.16,overheating:1.12,recovery:1.06,tightening:.91,recession:.85,crisis:.75,stimulus:1.09},
  },
  {
    id:'fitness',name:'프리미엄 피트니스 센터',icon:'🏋️',managerId:'medical',
    cost:42000000,resaleRate:.59,baseSales:7300000,fixedCost:5000000,variance:.18,
    desc:'회원권과 개인 프로그램을 운영합니다. 안전·트레이너 교육·재등록률을 함께 관리해야 합니다.',
    phase:{boom:1.11,overheating:1.08,recovery:1.07,tightening:.96,recession:.91,crisis:.85,stimulus:1.05},
  },
  {
    id:'petcare',name:'반려동물 케어 네트워크',icon:'🐾',managerId:'medical',
    cost:28000000,resaleRate:.57,baseSales:5600000,fixedCost:3700000,variance:.17,
    desc:'미용·돌봄·건강관리 예약을 묶어 운영합니다. 신뢰와 안전 기준이 무너지면 빠르게 고객을 잃습니다.',
    phase:{boom:1.08,overheating:1.05,recovery:1.06,tightening:.99,recession:.98,crisis:.91,stimulus:1.07},
  },
  {
    id:'software',name:'업무 자동화 SaaS',icon:'💻',managerId:'corporate',
    cost:60000000,resaleRate:.68,baseSales:10500000,fixedCost:6900000,variance:.15,
    desc:'기업에 구독형 업무 도구를 판매합니다. 초기 투자는 크지만 계약과 고객 유지가 안정되면 높은 반복 매출을 냅니다.',
    phase:{boom:1.14,overheating:1.10,recovery:1.08,tightening:1.00,recession:.94,crisis:.88,stimulus:1.10},
  },
];

const EVENTS={
  commerce:[
    {
      id:'supplier_price',mood:'sad',title:'주요 공급처가 납품 단가를 올렸습니다',
      desc:'다음 달부터 원가가 크게 오릅니다. 기존 가격을 유지하면 마진이 줄고, 거래처를 바꾸면 품질 불만이 생길 수 있습니다.',
      line:'대표님, 숫자만 보면 거래처를 바꾸는 게 맞아요. 다만 단골들이 먼저 알아챌 겁니다.',
      choices:[
        {id:'negotiate',text:'직접 만나 장기계약으로 단가를 협상한다',preview:'비용 50만 · 평판과 성장에 소폭 도움',effects:{cash:-500000,reputation:3,morale:1,momentum:.06},outcome:'장기 물량을 약속하는 대신 급격한 인상은 막았습니다.'},
        {id:'switch',text:'더 싼 공급처로 빠르게 교체한다',preview:'비용 10만 · 단기 성장, 평판 위험',effects:{cash:-100000,reputation:-3,morale:-1,momentum:.11},outcome:'원가는 낮췄지만 품질 문의와 교환 요청이 늘었습니다.'},
        {id:'absorb',text:'이번 분기 가격을 유지하고 비용을 흡수한다',preview:'비용 120만 · 평판 크게 상승',effects:{cash:-1200000,reputation:6,morale:2,momentum:.08},outcome:'마진은 줄었지만 가격을 지킨 일이 단골들 사이에 알려졌습니다.'},
      ],
    },
  ],
  studio:[
    {
      id:'deadline',mood:'angry',title:'대형 의뢰가 들어왔지만 납기가 지나치게 짧습니다',
      desc:'계약을 따내면 이름을 알릴 수 있지만 현재 인원만으로 진행하면 제작진이 버티기 어렵습니다.',
      line:'할 수는 있어요. 그런데 “할 수 있다”와 “이렇게 해야 한다”는 같은 말이 아니에요.',
      choices:[
        {id:'outsource',text:'검증된 외주팀을 붙여 품질과 일정을 지킨다',preview:'비용 180만 · 사기와 성장 상승',effects:{cash:-1800000,reputation:5,morale:5,momentum:.16},outcome:'수익 일부를 포기했지만 결과물과 팀 모두를 지켰습니다.'},
        {id:'scope',text:'범위를 줄인 시험 프로젝트로 다시 제안한다',preview:'추가비용 없음 · 안정적인 선택',effects:{cash:0,reputation:2,morale:3,momentum:.05},outcome:'규모는 작아졌지만 다음 계약으로 이어질 발판을 만들었습니다.'},
        {id:'crunch',text:'전원이 밤샘해 원안 그대로 수주한다',preview:'추가비용 없음 · 성장 상승, 직원 사기 급락',effects:{cash:0,reputation:4,morale:-9,momentum:.12},outcome:'납품은 끝냈지만 회의실에 남은 사람들의 표정이 굳었습니다.'},
      ],
    },
  ],
  advisory:[
    {
      id:'exclusive_contract',mood:'neutral',title:'대형 고객이 장기 독점계약을 제안했습니다',
      desc:'선급금은 크지만 경쟁사와의 거래가 막히고, 계약 해석에 따라 책임 범위가 지나치게 넓어질 수 있습니다.',
      line:'좋은 계약은 서명하는 순간보다 빠져나올 때의 조건이 더 중요합니다.',
      choices:[
        {id:'review',text:'외부 법무 검토를 거쳐 책임 범위를 다시 협상한다',preview:'비용 250만 · 평판과 장기 성장 상승',effects:{cash:-2500000,reputation:7,morale:3,momentum:.17},outcome:'시간은 걸렸지만 독소조항을 걷어내고 장기 고객을 확보했습니다.'},
        {id:'accept',text:'선급금을 받고 원안대로 빠르게 서명한다',preview:'현금 +400만 · 장기 성장과 평판 위험',effects:{cash:4000000,reputation:-6,morale:-2,momentum:-.12},outcome:'계좌에는 돈이 들어왔지만 직원들은 계약서의 책임 조항을 걱정하기 시작했습니다.'},
        {id:'decline',text:'독점 없이 일할 수 있는 고객을 계속 찾는다',preview:'추가비용 없음 · 조직 안정',effects:{cash:0,reputation:2,morale:4,momentum:.02},outcome:'큰 계약은 놓쳤지만 회사의 선택권과 실무자들의 신뢰를 지켰습니다.'},
      ],
    },
  ],
  care:[
    {
      id:'overbooking',mood:'sad',title:'예약이 급증해 현장 인력이 부족합니다',
      desc:'예약을 모두 받으면 매출은 늘지만 돌봄의 질과 안전 확인 시간이 줄어듭니다.',
      line:'지금 더 받으면 숫자는 좋아집니다. 하지만 사고가 나면 그 숫자로 아무것도 되돌릴 수 없어요.',
      choices:[
        {id:'hire',text:'경력 인력을 추가 채용하고 교육한다',preview:'비용 200만 · 평판과 사기 크게 상승',effects:{cash:-2000000,reputation:7,morale:7,momentum:.13},outcome:'예약 대기시간이 줄고 현장 직원들도 다시 숨을 돌렸습니다.'},
        {id:'cap',text:'안전하게 감당할 수 있는 수만 예약받는다',preview:'추가비용 없음 · 안정성과 평판 상승',effects:{cash:0,reputation:4,morale:4,momentum:-.01},outcome:'당장의 매출보다 서비스 기준을 지켰고 소개 고객이 늘었습니다.'},
        {id:'overbook',text:'이번 달만 예약을 모두 받는다',preview:'현금 +150만 · 평판과 사기 급락',effects:{cash:1500000,reputation:-8,morale:-9,momentum:.06},outcome:'매출은 늘었지만 현장 실수와 불만 접수가 함께 쌓였습니다.'},
      ],
    },
  ],
};

const MANAGER_EVENTS={
  office:[{
    id:'shift_gap',mood:'sad',title:'근무표에 빈 시간이 생겼습니다',
    desc:'갑작스러운 결원으로 가장 바쁜 시간대를 맡을 사람이 없습니다. 박 매니저가 대체 인력과 영업시간 조정안을 함께 보내왔습니다.',
    line:'대표님이 직접 매장에 올 일은 아니에요. 제가 직원들과 굴릴 수 있게 기준만 정해 주세요.',
    choices:[
      {id:'temp',text:'단기 인력을 투입하고 기존 직원에게 교육을 맡긴다',preview:'비용 90만 · 사기와 운영 흐름 상승',effects:{cash:-900000,reputation:2,morale:5,momentum:.07},outcome:'직원들이 역할을 나눠 빈 근무표를 메웠고 박지수는 다음 달 매뉴얼까지 정리했습니다.'},
      {id:'shorten',text:'혼잡 시간만 운영하고 직원 휴식을 보장한다',preview:'매출 기회 감소 · 평판과 사기 상승',effects:{cash:0,reputation:4,morale:6,momentum:-.03},outcome:'당장 매출은 줄었지만 서비스 품질과 직원들의 신뢰가 남았습니다.'},
      {id:'overtime',text:'이번 달만 기존 인원에게 추가 근무를 맡긴다',preview:'현금 +80만 · 직원 사기 하락',effects:{cash:800000,reputation:-1,morale:-7,momentum:.05},outcome:'장부는 지켰지만 다음 근무표를 받은 직원들의 표정이 굳었습니다.'},
    ],
  }],
  creative:[{
    id:'creative_credit',mood:'angry',title:'성과의 이름을 두고 제작팀이 갈라졌습니다',
    desc:'큰 프로젝트가 성공했지만 고객사는 책임자 한 사람의 이름만 홍보하려 합니다. 한 실장이 팀 전체의 크레딧을 지킬지 묻습니다.',
    line:'돈은 나눌 수 있어요. 그런데 이름을 빼앗기면 다음 작품을 만들 사람이 사라져요.',
    choices:[
      {id:'team_credit',text:'계약을 다시 열어 전 제작진의 이름을 보장한다',preview:'비용 120만 · 평판과 사기 크게 상승',effects:{cash:-1200000,reputation:6,morale:7,momentum:.08},outcome:'발표는 늦어졌지만 팀의 이름이 모두 남았고 다음 지원자가 먼저 찾아왔습니다.'},
      {id:'bonus',text:'대외 크레딧은 유지하고 팀에 성과급을 지급한다',preview:'비용 180만 · 사기 상승',effects:{cash:-1800000,reputation:1,morale:5,momentum:.04},outcome:'불만은 누그러졌지만 한이슬은 이름을 돈으로 대신한 결정을 오래 기억했습니다.'},
      {id:'lead_only',text:'이번 홍보는 책임자 이름만 사용한다',preview:'현금 +150만 · 평판과 사기 하락',effects:{cash:1500000,reputation:-4,morale:-8,momentum:.09},outcome:'프로젝트는 더 크게 알려졌지만 다음 기획 회의의 빈자리가 늘었습니다.'},
    ],
  }],
  corporate:[{
    id:'contract_alert',mood:'neutral',title:'담당자가 계약 체결 직전 위험 조항을 발견했습니다',
    desc:'장기 고객을 얻을 수 있는 계약이지만 손해배상 범위가 모호합니다. 차 총괄이 서명을 멈추고 세 가지 대응안을 보냈습니다.',
    line:'제가 관리할 수 있는 위험과 대표님이 감수해야 할 위험을 구분해 두었습니다. 어느 쪽을 선택하시겠습니까?',
    choices:[
      {id:'renegotiate',text:'협상팀에 권한을 주고 책임 범위를 다시 정한다',preview:'비용 160만 · 장기 성장과 신뢰 상승',effects:{cash:-1600000,reputation:6,morale:4,momentum:.13},outcome:'차서윤과 직원들이 협상을 끝내고 안정적인 반복 계약을 가져왔습니다.'},
      {id:'insurance',text:'보험과 충당금을 마련한 뒤 계약한다',preview:'비용 240만 · 안정적인 성장',effects:{cash:-2400000,reputation:3,morale:3,momentum:.09},outcome:'수익은 얇아졌지만 직원들이 감당할 수 있는 범위 안에서 계약이 시작됐습니다.'},
      {id:'sign',text:'선점이 중요하니 원안대로 서명한다',preview:'현금 +300만 · 평판과 현장 안정 하락',effects:{cash:3000000,reputation:-5,morale:-5,momentum:.10},outcome:'선급금은 들어왔지만 직원들은 언제 터질지 모를 책임 조항을 떠안았습니다.'},
    ],
  }],
  medical:[{
    id:'safety_call',mood:'sad',title:'현장에서 안전 기준 중단 요청이 왔습니다',
    desc:'예약과 계약이 몰린 날 장비 점검 경고가 떴습니다. 오 책임자는 매출 손실을 알면서도 즉시 운영 중단을 요청했습니다.',
    line:'결정만 내려 주세요. 사람을 옮기고 현장을 수습하는 건 직원들과 제가 하겠습니다.',
    choices:[
      {id:'stop',text:'즉시 운영을 멈추고 전 장비를 점검한다',preview:'비용 170만 · 평판과 사기 크게 상승',effects:{cash:-1700000,reputation:7,morale:7,momentum:.04},outcome:'사고 없이 점검을 마쳤고 직원들은 매출보다 자신들을 먼저 지킨 결정을 기억했습니다.'},
      {id:'reroute',text:'협력 업체로 예약을 분산하고 핵심 설비만 점검한다',preview:'비용 90만 · 운영 흐름과 평판 상승',effects:{cash:-900000,reputation:4,morale:4,momentum:.08},outcome:'오혜린이 현장을 통제하고 직원들이 고객을 안전하게 분산했습니다.'},
      {id:'continue',text:'경고가 뜬 구역만 막고 나머지 예약은 진행한다',preview:'현금 +100만 · 평판과 사기 하락',effects:{cash:1000000,reputation:-6,morale:-7,momentum:.05},outcome:'이번에는 사고가 없었지만 직원들은 다음 경고도 무시될까 걱정하기 시작했습니다.'},
    ],
  }],
};

function typeOf(id){return TYPES.find(type=>type.id===id)||null;}
function staffOf(id){return STAFF[id]||null;}
function strategyOf(id){return STRATEGIES[id]||STRATEGIES.balanced;}
function portraitPath(staffId,mood){
  const person=staffOf(staffId);
  if(!person)return'';
  if(person.portraitBase&&['neutral','happy','sad','angry'].includes(mood)){
    return`./assets/characters/${person.portraitBase}-${mood}.png`;
  }
  return`./assets/characters/${person.portrait}`;
}
function ensure(life){
  if(!life.business||typeof life.business!=='object'){
    life.business={owned:[],reports:[],lastEventDay:0,sequence:0};
  }
  const state=life.business;
  if(!Array.isArray(state.owned))state.owned=[];
  if(!Array.isArray(state.reports))state.reports=[];
  state.lastEventDay=Math.max(0,Math.floor(finite(state.lastEventDay,0)));
  state.sequence=Math.max(0,Math.floor(finite(state.sequence,0)));
  state.lastNet=Math.round(finite(state.lastNet,0));
  state.owned=state.owned.filter(item=>item&&typeOf(item.typeId));
  state.owned.forEach(item=>{
    const type=typeOf(item.typeId);
    const explicitSpecial=item.specialManagerId&&STAFF[item.specialManagerId]&&item.specialManagerId!=='internal'
      ?item.specialManagerId:null;
    // 과거 저장은 사업 종류만으로 네 명을 자동 배치했다. 새 구조에서는 일반
    // 운영팀으로 이관하고, 사교 모임을 통해 실제 영입한 경우에만 특별 책임자를 둔다.
    const managerId=explicitSpecial||'internal';
    Object.assign(item,{
      id:item.id||item.typeId,
      typeId:item.typeId,
      sectorId:item.sectorId||type.managerId,
      managerId,
      specialManagerId:explicitSpecial,
      level:clamp(Math.floor(finite(item.level,1)),1,5),
      months:Math.max(0,Math.floor(finite(item.months,0))),
      reputation:clamp(finite(item.reputation,45),0,100),
      morale:clamp(finite(item.morale,65),0,100),
      momentum:clamp(finite(item.momentum,0),-.35,.50),
      strategy:strategyOf(item.strategy).id,
      employees:clamp(Math.floor(finite(item.employees,2)),2,22),
      hiredStaff:Array.isArray(item.hiredStaff)?item.hiredStaff.filter(Boolean).slice(0,20):[],
      totalProfit:Math.round(finite(item.totalProfit,0)),
      lastSales:Math.round(finite(item.lastSales,0)),
      lastCost:Math.round(finite(item.lastCost,0)),
      lastNet:Math.round(finite(item.lastNet,0)),
      startedDay:Math.max(1,Math.floor(finite(item.startedDay,1))),
    });
  });
  return state;
}
function owned(life,id){return ensure(life).owned.find(item=>item.id===id||item.typeId===id)||null;}
function start(life,typeId,day){
  const state=ensure(life),type=typeOf(typeId);
  if(!type)return{ok:false,message:'알 수 없는 사업입니다.'};
  if(owned(life,typeId))return{ok:false,message:'이미 운영 중인 사업입니다.'};
  const item={
    id:type.id,typeId:type.id,sectorId:type.managerId,managerId:'internal',specialManagerId:null,level:1,months:0,
    employees:2,hiredStaff:[],
    reputation:45,morale:65,momentum:0,strategy:'balanced',totalProfit:0,lastSales:0,lastCost:0,lastNet:0,
    startedDay:Math.max(1,Math.floor(finite(day,1))),
  };
  state.owned.push(item);
  return{ok:true,business:item,type,manager:staffOf(item.managerId),cost:type.cost};
}
function expansionCost(life,id){
  const item=owned(life,id),type=item&&typeOf(item.typeId);
  return item&&type?Math.round(type.cost*(.38+item.level*.12)):0;
}
function staffCapacity(item){return item?Math.min(22,2+item.level*4):0;}
function hireCost(item){return item?Math.round(450000+item.level*250000):0;}
function staffProfile(candidateId){
  const id=String(candidateId||'');
  if(id.includes('-lead')||id.startsWith('mystery-'))return{sales:.23,wage:300000,label:'숙련'};
  if(id.includes('-field'))return{sales:.18,wage:230000,label:'경력'};
  return{sales:.14,wage:180000,label:'신입'};
}
function staffEffect(item){
  if(!item)return{salesBonus:0,wages:0,tracked:0};
  const staffExtra=Math.max(0,(item.employees||2)-2);
  const hired=Array.isArray(item.hiredStaff)?item.hiredStaff.slice(0,staffExtra):[];
  let salesBonus=0,wages=0;
  hired.forEach(id=>{const profile=staffProfile(id);salesBonus+=profile.sales;wages+=profile.wage;});
  const untracked=Math.max(0,staffExtra-hired.length);
  salesBonus+=untracked*.14;wages+=untracked*180000;
  if(item.specialManagerId){salesBonus+=.10;wages+=900000;}
  // 이력서 후보 수와 사업 단계의 정원이 이미 증원을 제한한다. 여기서 다시 상한을
  // 씌우면 마지막 채용은 매출 기여가 사라지고 인건비만 늘어나는 역전이 생긴다.
  return{salesBonus,wages,tracked:hired.length};
}
function compatibleManager(item,staffId){
  const type=item&&typeOf(item.typeId);
  return !!(type&&STAFF[staffId]&&staffId!=='internal'&&type.managerId===staffId);
}
function assignSpecialManager(life,id,staffId){
  const state=ensure(life),item=state.owned.find(entry=>entry.id===id||entry.typeId===id);
  if(!item)return{ok:false,message:'운영 중인 사업을 찾지 못했습니다.'};
  if(!compatibleManager(item,staffId))return{ok:false,message:'이 책임자의 전문 업종과 맞지 않는 사업체입니다.'};
  const occupied=state.owned.find(entry=>entry.specialManagerId===staffId&&entry.id!==item.id);
  if(occupied)return{ok:false,message:'이 책임자는 이미 다른 사업체를 맡고 있습니다.'};
  item.managerId=staffId;item.specialManagerId=staffId;
  item.morale=clamp(item.morale+5,0,100);
  item.momentum=clamp(item.momentum+.04,-.35,.50);
  return{ok:true,business:item,manager:staffOf(staffId),type:typeOf(item.typeId)};
}
function hire(life,id,candidateId){
  const item=owned(life,id),type=item&&typeOf(item.typeId);
  if(!item||!type)return{ok:false,message:'운영 중인 사업을 찾지 못했습니다.'};
  if(item.employees>=staffCapacity(item))return{ok:false,message:'현재 규모의 직원 정원이 가득 찼습니다.'};
  const cost=hireCost(item);
  item.employees++;
  if(candidateId&&!item.hiredStaff.includes(candidateId))item.hiredStaff.push(candidateId);
  item.morale=clamp(item.morale+2,0,100);
  item.momentum=clamp(item.momentum+.025,-.35,.50);
  return{ok:true,business:item,type,cost};
}
function setStrategy(life,id,strategyId){
  const item=owned(life,id),strategy=STRATEGIES[strategyId];
  if(!item)return{ok:false,message:'운영 중인 사업을 찾지 못했습니다.'};
  if(!strategy)return{ok:false,message:'알 수 없는 운영 방침입니다.'};
  item.strategy=strategy.id;
  return{ok:true,business:item,strategy};
}
function expand(life,id){
  const item=owned(life,id),type=item&&typeOf(item.typeId);
  if(!item||!type)return{ok:false,message:'운영 중인 사업을 찾지 못했습니다.'};
  if(item.level>=5)return{ok:false,message:'이미 최대 규모입니다.'};
  // expansionCost()가 ensure()를 다시 거치면 owned 배열이 정규화되며 현재 item
  // 참조가 낡아진다. 같은 식을 현재 객체에 바로 적용해야 단계 상승이 저장된다.
  const cost=Math.round(type.cost*(.38+item.level*.12));
  item.level++;
  item.morale=clamp(item.morale+4,0,100);
  item.momentum=clamp(item.momentum+.08,-.35,.50);
  return{ok:true,business:item,type,cost};
}
function resaleValue(life,id){
  const item=owned(life,id),type=item&&typeOf(item.typeId);
  if(!item||!type)return 0;
  const expansionValue=type.cost*(item.level-1)*.34;
  const reputationMul=.82+item.reputation/500;
  return Math.max(0,Math.round((type.cost+expansionValue)*type.resaleRate*reputationMul));
}
function close(life,id){
  const state=ensure(life),index=state.owned.findIndex(item=>item.id===id||item.typeId===id);
  if(index<0)return{ok:false,message:'운영 중인 사업을 찾지 못했습니다.'};
  const item=state.owned[index],type=typeOf(item.typeId),value=resaleValue(life,item.id);
  state.owned.splice(index,1);
  return{ok:true,business:item,type,value};
}
function assetValue(life){
  return ensure(life).owned.reduce((sum,item)=>sum+resaleValue(life,item.id),0);
}
function projected(item,phaseId){
  const type=typeOf(item.typeId);if(!type)return{sales:0,cost:0,net:0};
  const strategy=strategyOf(item.strategy);
  const levelMul=1+(item.level-1)*.46;
  const phaseMul=(type.phase||{})[phaseId]||1;
  const qualityMul=.76+item.reputation*.004;
  const moraleMul=.86+item.morale*.0022;
  const staff=staffEffect(item);
  const staffSales=1+staff.salesBonus;
  const sales=Math.round(type.baseSales*levelMul*phaseMul*qualityMul*moraleMul*(1+item.momentum)*staffSales*strategy.sales);
  const cost=Math.round((type.fixedCost*(1+(item.level-1)*.37)+staff.wages)*strategy.cost);
  return{sales,cost,net:sales-cost,strategy};
}
function reportLine(item){
  const type=typeOf(item.typeId),manager=staffOf(item.managerId),net=item.lastNet;
  if(net>=Math.max(1000000,type.baseSales*.28))return`${manager.name}: “이번 달은 매출과 현장 모두 안정적입니다. 다음 확장을 검토해도 됩니다.”`;
  if(net>=0)return`${manager.name}: “흑자는 지켰습니다. 다만 비용 한두 군데만 놓치면 바로 얇아질 수준입니다.”`;
  return`${manager.name}: “이번 달은 적자입니다. 숫자를 숨기지 않겠습니다. 다음 판단이 중요합니다.”`;
}
function eventPayload(life,item,day,random){
  const pool=(EVENTS[item.typeId]||[]).concat(MANAGER_EVENTS[item.sectorId]||[]);
  if(!pool.length)return null;
  const event=pool[Math.floor(random()*pool.length)]||pool[0];
  return{businessEvent:true,businessId:item.id,eventId:event.id,day};
}
function monthly(life,context){
  const state=ensure(life),ctx=context||{},random=typeof ctx.random==='function'?ctx.random:Math.random;
  const phaseId=ctx.phaseId||'recovery',day=Math.max(1,Math.floor(finite(ctx.day,1)));
  const reports=[];
  let totalSales=0,totalCost=0,totalNet=0,pendingEvent=null;
  state.owned.forEach(item=>{
    item.months++;
    const type=typeOf(item.typeId);
    const plan=projected(item,phaseId);
    const swing=1+(random()*2-1)*type.variance;
    const sales=Math.max(0,Math.round(plan.sales*swing));
    const cost=plan.cost;
    const net=sales-cost;
    item.lastSales=sales;item.lastCost=cost;item.lastNet=net;item.totalProfit+=net;
    const strategy=strategyOf(item.strategy);
    item.reputation=clamp(item.reputation+(net>=0?.35:-.8)+strategy.reputation,0,100);
    item.morale=clamp(item.morale+(net>=0?.2:-.6)+strategy.morale,0,100);
    item.momentum=clamp(item.momentum*.55,-.35,.50);
    totalSales+=sales;totalCost+=cost;totalNet+=net;
    reports.push({
      businessId:item.id,typeId:item.typeId,name:type.name,icon:type.icon,managerId:item.managerId,
      manager:staffOf(item.managerId).name,sales,cost,net,strategy:strategy.name,line:reportLine(item),day,
    });
  });
  const eventReady=state.owned.length&&day-state.lastEventDay>=2;
  const eventChance=Math.min(.62,.18+state.owned.length*.11);
  if(eventReady&&random()<eventChance){
    const item=state.owned[Math.floor(random()*state.owned.length)]||state.owned[0];
    pendingEvent=eventPayload(life,item,day,random);
    if(pendingEvent)state.lastEventDay=day;
  }
  state.reports=reports.concat(state.reports||[]).slice(0,24);
  state.lastNet=totalNet;
  return{sales:totalSales,cost:totalCost,net:totalNet,reports,event:pendingEvent};
}
function findEvent(item,eventId){
  return(EVENTS[item.typeId]||[]).concat(MANAGER_EVENTS[item.sectorId]||[]).find(event=>event.id===eventId)||null;
}
function eventView(life,payload){
  const item=owned(life,payload&&payload.businessId);
  const type=item&&typeOf(item.typeId),event=type&&findEvent(item,payload.eventId);
  if(!item||!type||!event)return null;
  const manager=staffOf(item.managerId);
  return{
    payload,item,type,event,manager,
    portrait:portraitPath(manager.id,event.mood||'neutral'),
    choices:event.choices.map(choice=>({
      id:choice.id,text:choice.text,preview:choice.preview,cash:finite(choice.effects.cash,0),
    })),
  };
}
function resolveEvent(life,payload,choiceId){
  const view=eventView(life,payload);if(!view)return{ok:false,message:'사업 보고를 찾지 못했습니다.'};
  const choice=view.event.choices.find(item=>item.id===choiceId);
  if(!choice)return{ok:false,message:'선택지를 찾지 못했습니다.'};
  const effects=choice.effects||{},item=view.item;
  item.reputation=clamp(item.reputation+finite(effects.reputation,0),0,100);
  item.morale=clamp(item.morale+finite(effects.morale,0),0,100);
  item.momentum=clamp(item.momentum+finite(effects.momentum,0),-.35,.50);
  const mood=finite(effects.morale,0)<0||finite(effects.reputation,0)<0?'sad':finite(effects.morale,0)>=4?'happy':'neutral';
  return{
    ok:true,cash:Math.round(finite(effects.cash,0)),outcome:choice.outcome,
    mood,portrait:portraitPath(view.manager.id,mood),manager:view.manager,type:view.type,business:item,
    detail:`평판 ${Math.round(item.reputation)} · 직원 사기 ${Math.round(item.morale)} · 다음 달 흐름 ${item.momentum>=0?'+':''}${Math.round(item.momentum*100)}%`,
  };
}

root.QT_BUSINESS={
  STAFF,STRATEGIES,TYPES,EVENTS,MANAGER_EVENTS,ensure,typeOf,staffOf,strategyOf,portraitPath,owned,start,expand,expansionCost,
  resaleValue,close,assetValue,projected,monthly,eventView,resolveEvent,
  staffCapacity,hireCost,staffProfile,staffEffect,hire,setStrategy,
  compatibleManager,assignSpecialManager,
};
})(window);
