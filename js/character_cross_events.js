/* QuickTrade Life — 히로인 교차 사건
 * 두 인물의 성격·직업·관계 상태가 동시에 맞을 때만 월말 사건 큐에 들어간다.
 * 선택의 결과는 app.js가 적용하며, 이 파일은 이야기와 조건을 데이터로 보관한다. */
(function (root) {
'use strict';

const ACTIVE = new Set(['friend', 'casual', 'partner', 'lover', 'polycule']);
const met = (life, name) => (life.met || []).find(person => person.name === name);
const active = (life, name) => {
  const person = met(life, name);
  return !!person && (ACTIVE.has(person.status) || (life.partner && life.partner.name === name));
};
const knows = (life, names) => names.every(name => active(life, name));

const EVENTS = [
  {
    id:'narae_hyejin_model', people:['나래','혜진'], icon:'📊', title:'검증되지 않은 확신',
    scene:'./assets/event-narae-market-crash.png',
    condition:life=>knows(life,['나래','혜진']),
    desc:'나래가 교육 자료에 넣으려는 투자 모델을 혜진이 “표본이 부족하다”며 막았습니다. 두 사람 모두 당신에게 최종 판단을 맡깁니다.',
    lines:{'나래':'실전에서는 완벽한 자료를 기다리다 기회를 놓쳐요.','혜진':'틀릴 수 있다는 표시조차 없는 자료는 교육이 아니라 선동이에요.'},
    choices:[
      {text:'혜진과 재검증한 뒤 공개한다',outcome:'며칠 늦어졌지만 반례까지 적힌 자료가 완성됐습니다. 나래도 결과를 보고 고집을 거뒀습니다.',people:{'나래':{trust:3},'혜진':{affection:5,trust:7}},life:{stress:2},flags:{marketModelVerified:true}},
      {text:'나래의 실전 감각을 믿고 바로 쓴다',outcome:'반응은 뜨거웠지만 혜진은 오류가 나면 자신은 이름을 빼겠다고 선을 그었습니다.',people:{'나래':{affection:6,trust:5},'혜진':{affection:-4,trust:-7}},life:{charm:1}},
      {text:'두 버전을 함께 공개한다',outcome:'결론과 반론을 한 화면에 둔 자료가 오히려 큰 호평을 받았습니다.',people:{'나래':{affection:4,trust:5},'혜진':{affection:4,trust:5}},life:{happy:3},cash:600000}
    ]
  },
  {
    id:'yujin_chaerin_rescue', people:['강유진','한채린'], icon:'🚨', title:'공권력과 사설 경호',
    scene:'./assets/event-yujin-rain-rescue.png',
    condition:life=>knows(life,['강유진','한채린']),
    desc:'최근 위협을 두고 유진은 정식 신고를, 채린은 흔적 없는 사설 경호를 주장합니다. 서로의 방식이 당신을 더 위험하게 만든다며 맞섭니다.',
    lines:{'강유진':'보호에도 절차가 있어요. 기록이 없으면 다음에도 못 막아요.','한채린':'절차가 끝날 때까지 다치지 않을 거라는 보증부터 가져오시죠.'},
    choices:[
      {text:'유진에게 증거와 동선을 맡긴다',outcome:'사건 기록과 비상 연락망이 생겼습니다. 채린은 못마땅해하면서도 경찰이 놓친 CCTV를 넘겼습니다.',people:{'강유진':{affection:6,trust:8},'한채린':{trust:2}},life:{stress:-4},flags:{seraEvidence:true,policeSafetyPlan:true}},
      {text:'채린의 경호팀을 받아들인다',outcome:'당신의 일정은 안전해졌지만, 채린은 경호 보고서까지 직접 읽기 시작했습니다.',people:{'강유진':{trust:-4},'한채린':{affection:7,trust:6}},life:{stress:-6},flags:{privateSecurity:true}},
      {text:'둘이 정보를 공유하게 설득한다',outcome:'유진의 절차와 채린의 자원이 합쳐져 가장 촘촘한 보호망이 만들어졌습니다.',people:{'강유진':{trust:6},'한채린':{trust:6}},life:{stress:-8},flags:{seraEvidence:true,privateSecurity:true,alliedRescue:true}}
    ]
  },
  {
    id:'yerin_sera_schedule', people:['예린','윤세라'], icon:'🗓️', title:'달력에 없던 사람',
    scene:'./assets/event-sera-doorstep.png',
    condition:life=>knows(life,['예린','윤세라']),
    desc:'예린이 정리한 생활표에서 설명되지 않는 반복 동선을 찾아냈습니다. 같은 시각, 세라는 당신이 말하지 않은 카페에서 기다리고 있었습니다.',
    lines:{'예린':'우연은 같은 요일, 같은 시간에 네 번 반복되지 않아.','윤세라':'걱정돼서 확인한 것뿐인데… 그게 그렇게 이상해요?'},
    choices:[
      {text:'예린과 출입·연락 기록을 남긴다',outcome:'예린은 감정 대신 날짜와 증거를 모았습니다. 세라는 한동안 모습을 감췄지만 메시지는 더 길어졌습니다.',people:{'예린':{affection:5,trust:7},'윤세라':{obsession:7,trust:-5}},life:{stress:5},flags:{seraEvidence:true}},
      {text:'세라에게 다음부터 먼저 말하라고 한다',outcome:'세라는 허락받았다고 받아들였습니다. 예린은 그 말이 경계를 세운 것이 아니라 문을 열어준 것이라고 경고했습니다.',people:{'예린':{trust:-6},'윤세라':{affection:6,obsession:12}},life:{happy:2}},
      {text:'두 사람 앞에서 분명히 거절한다',outcome:'세라의 표정은 굳었지만, 당신의 경계는 기록으로 남았습니다.',people:{'예린':{trust:8},'윤세라':{affection:-8,obsession:-12}},life:{stress:3},flags:{seraBoundary:true,seraEvidence:true}}
    ]
  },
  {
    id:'seoyeon_arin_credit', people:['서연','아린'], icon:'🎨', title:'누구의 문장이었나',
    scene:'./assets/event-seoyeon-repair.png',
    condition:life=>knows(life,['서연','아린']),
    desc:'서연의 전시 포스터 핵심 문구가 아린의 미발표 원고와 닮았습니다. 영감을 주고받은 두 사람 사이에서 창작의 경계가 흐려졌습니다.',
    lines:{'서연':'훔친 게 아니라, 우리 셋이 나눈 밤의 감정을 그린 거야.','아린':'내가 아직 세상에 내놓지 않은 문장을 먼저 꺼내 쓰면… 나는 어디에 남아?'},
    choices:[
      {text:'아린을 공동 창작자로 올린다',outcome:'전시는 공동 작업으로 다시 소개됐고, 아린은 처음으로 자신의 이름을 크게 걸었습니다.',people:{'서연':{trust:3},'아린':{affection:7,trust:8}},life:{charm:2},cash:500000},
      {text:'서연의 독립 작품이라고 정리한다',outcome:'전시는 예정대로 열렸지만 아린은 다음 원고부터 당신에게도 보여주지 않았습니다.',people:{'서연':{affection:7},'아린':{affection:-7,trust:-8}},life:{stress:3}},
      {text:'문구를 버리고 셋이 새로 만든다',outcome:'밤을 새운 끝에 누구의 것도 아니면서 셋 모두가 납득하는 문장이 나왔습니다.',people:{'서연':{affection:5,trust:5},'아린':{affection:5,trust:6}},life:{happy:4,stress:2}}
    ]
  },
  {
    id:'haeun_bora_care', people:['하은','보라'], icon:'💊', title:'돌보는 사람을 돌보는 법',
    scene:'./assets/event-haeun-hospital.png',
    condition:life=>knows(life,['하은','보라']),
    desc:'야간 근무를 마친 하은이 쓰러질 듯 약국에 기대 섰습니다. 보라는 약보다 휴식이 먼저라며 하은의 부탁을 단호히 거절합니다.',
    lines:{'하은':'오늘만 버티면 돼요. 병동에 사람이 없어요.','보라':'그 말을 매주 하는 사람에게 약을 더 주는 건 치료가 아니에요.'},
    choices:[
      {text:'하은의 대타를 구하고 쉬게 한다',outcome:'하은은 미안해했지만 열두 시간 만에 깊이 잠들었습니다. 보라는 당신이 말이 아닌 행동을 했다고 기억했습니다.',people:{'하은':{affection:7,trust:6},'보라':{affection:5,trust:6}},life:{health:3,stress:-7},cash:-400000},
      {text:'하은의 선택을 존중해 병원에 데려다준다',outcome:'근무는 버텼지만 하은의 손이 계속 떨렸습니다. 보라는 다음에는 자신이 직접 막겠다고 했습니다.',people:{'하은':{trust:3},'보라':{affection:-3}},life:{stress:6}},
      {text:'보라와 장기 교대표를 만든다',outcome:'한 번의 영웅적인 희생보다 지속 가능한 도움을 택했습니다.',people:{'하은':{trust:7},'보라':{trust:8}},life:{happy:3,stress:-4},flags:{careNetwork:true}}
    ]
  },
  {
    id:'chaewon_yuna_photo', people:['채원','유나'], icon:'📸', title:'도착 게이트의 사진 한 장',
    scene:'./assets/event-yuna-backstage.png',
    condition:life=>knows(life,['채원','유나']),
    desc:'채원이 귀국한 날 유나와 함께 있던 사진이 찍혔습니다. 유나는 선제 공개를, 채원은 회사와 동료를 위해 침묵을 원합니다.',
    lines:{'채원':'내가 설명하면 끝나는 일이 아니야. 같이 비행한 사람들까지 불려가.','유나':'숨으면 남들이 이야기를 완성해. 그게 더 잔인해.'},
    choices:[
      {text:'관계의 범위만 솔직히 공개한다',outcome:'추측은 줄었지만 세 사람의 관계가 공개적인 평가 대상이 됐습니다.',people:{'채원':{trust:2},'유나':{affection:6,trust:5}},life:{charm:3,stress:5},socialRep:5},
      {text:'채원의 직장 보호를 우선한다',outcome:'유나는 자신이 또 숨겨지는 사람이 됐다며 돌아섰고, 채원은 조용히 고맙다고 했습니다.',people:{'채원':{affection:7,trust:7},'유나':{affection:-6,trust:-5}},socialRep:-2},
      {text:'사진의 유통 경로부터 추적한다',outcome:'사진을 판 사람이 경쟁 세력과 연결돼 있다는 사실을 찾아냈습니다.',people:{'채원':{trust:6},'유나':{trust:7}},life:{stress:-2},flags:{mediaLeakTraced:true}}
    ]
  },
  {
    id:'sua_daeun_children', people:['수아','다은'], icon:'🏫', title:'아이들을 위한 하루',
    scene:'./assets/event-sua-classroom.png',
    condition:life=>knows(life,['수아','다은']),
    desc:'수아의 학생들을 위한 작은 진로 행사가 예산 부족으로 취소될 위기에 놓였습니다. 다은은 자신의 가게 준비를 미루고 디저트를 맡겠다고 합니다.',
    lines:{'수아':'도와달라고 말하면 또 누군가의 시간을 빼앗는 것 같아.','다은':'꿈은 나중으로 미룬다고 없어지지 않아요. 대신 혼자 미루게 하진 마요.'},
    choices:[
      {text:'행사 비용과 인력을 함께 댄다',outcome:'교실은 하루짜리 직업 박람회가 됐고 다은의 작은 디저트 부스가 가장 오래 기억됐습니다.',people:{'수아':{affection:7,trust:7},'다은':{affection:6,trust:6}},life:{happy:7},cash:-1200000,socialRep:7},
      {text:'수아에게 이번에는 거절하는 법을 가르친다',outcome:'행사는 축소됐지만 수아는 모든 책임이 자신의 몫은 아니라는 말을 처음 받아들였습니다.',people:{'수아':{trust:8},'다은':{trust:2}},life:{stress:-5}},
      {text:'다은의 가게에서 소규모로 연다',outcome:'학생 행사가 다은의 가게 시험 운영까지 겸하게 됐습니다.',people:{'수아':{affection:5},'다은':{affection:8,trust:5}},life:{happy:5},cash:700000,flags:{daeunPopUp:true}}
    ]
  },
  {
    id:'sohee_nayoung_wrist', people:['소희','나영'], icon:'🎻', title:'무대보다 먼저인 손목',
    scene:'./assets/event-nayoung-wrist.png',
    condition:life=>knows(life,['소희','나영']),
    desc:'소희가 손목 통증을 숨긴 채 공연을 강행하려 합니다. 나영은 지금 멈추지 않으면 연주 생활 전체를 잃는다고 경고합니다.',
    lines:{'소희':'오늘 무대는 오늘밖에 없어. 다음 기회 같은 말은 위로가 안 돼.','나영':'몸을 망가뜨리는 건 투지가 아니라 계산 실패야.'},
    choices:[
      {text:'공연을 취소하고 치료를 잡는다',outcome:'소희는 며칠간 연락하지 않았지만, 재활 첫날 가장 먼저 당신을 불렀습니다.',people:{'소희':{affection:-3,trust:8},'나영':{affection:6,trust:7}},life:{health:4,stress:3}},
      {text:'곡 수를 줄이고 무대에 오른다',outcome:'공연과 회복 사이의 타협점을 찾았습니다. 나영은 끝까지 무대 옆에서 손목 상태를 확인했습니다.',people:{'소희':{affection:6,trust:5},'나영':{trust:4}},life:{happy:5,health:-2}},
      {text:'소희의 결정을 그대로 따른다',outcome:'공연은 성공했지만 통증은 더 심해졌습니다. 나영은 당신에게 크게 실망했습니다.',people:{'소희':{affection:5},'나영':{affection:-6,trust:-7}},life:{happy:3,health:-6}}
    ]
  },
  {
    id:'mirae_daeun_launch', people:['미래','다은'], icon:'🎮', title:'게임 속 빵집, 현실의 가게',
    scene:'./assets/event-mirae-launch.png',
    condition:life=>knows(life,['미래','다은']),
    desc:'미래가 다은의 디저트를 소재로 작은 경영 게임을 만들자고 제안했습니다. 다은은 자신의 꿈이 숫자로만 평가될까 두렵습니다.',
    lines:{'미래':'실패해도 데이터가 남아. 다음 빌드가 더 좋아지는 거지.','다은':'내 가게는 업데이트로 고치면 되는 맵이 아니잖아요.'},
    choices:[
      {text:'다은의 이야기를 중심에 둔다',outcome:'매출 최적화보다 손님의 기억을 모으는 게임이 됐고, 예상 밖의 팬층이 생겼습니다.',people:{'미래':{affection:6,trust:5},'다은':{affection:7,trust:7}},life:{happy:5},cash:1200000},
      {text:'수익 모델을 먼저 검증한다',outcome:'지표는 좋았지만 다은은 자신의 꿈이 광고 단가표가 됐다고 느꼈습니다.',people:{'미래':{affection:7},'다은':{affection:-5,trust:-5}},cash:2200000},
      {text:'아주 작은 체험판만 만든다',outcome:'둘 다 감당할 수 있는 크기로 시작했고 다음 선택을 위한 실제 반응을 얻었습니다.',people:{'미래':{trust:7},'다은':{trust:7}},cash:500000,flags:{bakeryGameDemo:true}}
    ]
  },
  {
    id:'chaerin_yuna_contract', people:['한채린','유나'], icon:'👑', title:'사람을 계약서에 넣는 법',
    scene:'./assets/event-chaerin-contract.png',
    condition:life=>knows(life,['한채린','유나']),
    desc:'채린이 유나의 악성 루머를 막아주는 대신 전속 계약과 사생활 조항을 요구했습니다. 유나는 보호와 소유는 다르다며 계약서를 당신 앞에 내려놓습니다.',
    lines:{'한채린':'대가 없는 보호를 믿는 쪽이 더 위험하지 않나요?','유나':'내 사진을 지워주는 대신 내 인생을 갖겠다는 거잖아.'},
    choices:[
      {text:'사생활 조항을 삭제하게 한다',outcome:'채린은 양보를 빚으로 기록했지만, 유나는 처음으로 당신이 자신의 편이라고 느꼈습니다.',people:{'한채린':{affection:-3,trust:3},'유나':{affection:8,trust:8}},socialRep:3},
      {text:'채린의 보호 계약을 받아들인다',outcome:'루머는 빠르게 사라졌고 유나의 일정은 채린의 승인 아래 놓였습니다.',people:{'한채린':{affection:7,trust:5},'유나':{affection:-6,trust:-7}},life:{stress:-3},flags:{privateSecurity:true}},
      {text:'별도 법률 대리인을 세운다',outcome:'두 사람 모두 완전히 만족하지는 않았지만 누구도 상대를 소유하지 못하는 계약이 됐습니다.',people:{'한채린':{trust:5},'유나':{trust:7}},cash:-1000000,flags:{independentCounsel:true}}
    ]
  },
  {
    id:'yujin_sera_intervention', people:['강유진','윤세라'], icon:'🖤', title:'문 밖의 발소리',
    scene:'./assets/event-sera-doorstep.png',
    condition:life=>knows(life,['강유진','윤세라'])&&((met(life,'윤세라')||{}).obsession||0)>=70,
    desc:'유진이 당신의 집 앞에서 세라와 마주쳤습니다. 세라는 연인을 기다렸을 뿐이라 말하고, 유진은 이미 확보한 이동 기록을 보여줍니다.',
    lines:{'강유진':'좋아한다는 말은 상대의 거절을 지우는 허가증이 아니에요.','윤세라':'경찰이라서 우리 사이까지 결정할 수 있다고 생각해요?'},
    choices:[
      {text:'유진에게 정식으로 도움을 요청한다',outcome:'순찰 요청과 증거 보전 절차가 시작됐습니다. 세라는 웃으며 물러났지만 마지막 시선은 당신에게만 머물렀습니다.',people:{'강유진':{affection:7,trust:9},'윤세라':{affection:-8,obsession:-10}},life:{stress:-4},flags:{seraEvidence:true,policeSafetyPlan:true}},
      {text:'연인 사이의 일이라며 세라를 감싼다',outcome:'유진은 강제로 개입할 수 없다며 명함만 남겼습니다. 세라는 그 선택을 영원한 약속처럼 받아들였습니다.',people:{'강유진':{affection:-7,trust:-8},'윤세라':{affection:8,obsession:15}},life:{happy:3}},
      {text:'둘 다 돌아가 달라고 한다',outcome:'그날 밤은 조용해졌지만 누구에게도 확실한 도움을 요청하지 못했습니다.',people:{'강유진':{trust:-2},'윤세라':{obsession:-3}},life:{stress:5}}
    ]
  }
];

function ensure(life) {
  if (!life.crossEvents || typeof life.crossEvents !== 'object') life.crossEvents = { seen:{}, cooldown:0, history:[], pending:null };
  if (!life.crossEvents.seen) life.crossEvents.seen = {};
  if (!Array.isArray(life.crossEvents.history)) life.crossEvents.history = [];
  if (!Number.isFinite(life.crossEvents.cooldown)) life.crossEvents.cooldown = 0;
  return life.crossEvents;
}
function get(id) { return EVENTS.find(event => event.id === id) || null; }
function monthly(life) {
  const state = ensure(life);
  if (state.pending) return get(state.pending);
  if (state.cooldown > 0) { state.cooldown--; return null; }
  const eligible = EVENTS.filter(event => !state.seen[event.id] && event.condition(life));
  if (!eligible.length || Math.random() > .42) return null;
  const event = eligible[Math.floor(Math.random() * eligible.length)];
  state.pending = event.id;
  state.cooldown = 2;
  return event;
}
function resolved(life, eventId, choiceText) {
  const state = ensure(life);
  state.seen[eventId] = true;
  if (state.pending === eventId) state.pending = null;
  state.history.unshift({ id:eventId, choice:choiceText, day:life.day || 0 });
  state.history = state.history.slice(0, 20);
}

root.QT_CHARACTER_CROSS_EVENTS = { EVENTS, ensure, get, monthly, resolved };
})(window);
