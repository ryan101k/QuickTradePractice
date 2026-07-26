/* QuickTrade Life — 히로인 교차 사건
 * 두 인물의 성격·직업·관계 상태가 동시에 맞을 때만 월말 사건 큐에 들어간다.
 * 선택의 결과는 app.js가 적용하며, 이 파일은 이야기와 조건을 데이터로 보관한다. */
(function (root) {
'use strict';

const ACTIVE = new Set(['friend', 'casual', 'partner', 'lover', 'polycule']);
const RETIRED_HEROINES = new Set(['하은','수아','다은','혜진','아린']);
const met = (life, name) => (life.met || []).find(person => person.name === name);
const active = (life, name) => {
  const person = met(life, name);
  return !!person && (ACTIVE.has(person.status) || (life.partner && life.partner.name === name));
};
const knows = (life, names) => names.every(name => active(life, name));
const DANGEROUS_NAMES=['강유진','한채린','윤세라'];
const FREEDOM_NAMES=['채원','유나','소희'];
function dangerousRelationshipMode(life){
  if(life.dangerousTrioBond&&life.dangerousTrioBond.active)return'harem';
  const state=life.dangerousTrio;
  return state&&state.badFriendsFormed&&knows(life,DANGEROUS_NAMES)?'friends':null;
}
function freedomRevealed(life){
  const freedom=root.QT_FREEDOM_TRIO;
  return !!(freedom&&freedom.revealed(life)&&knows(life,FREEDOM_NAMES));
}

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

EVENTS.push(
  {
    id:'group_dangerous_freedom_first_table',people:[...DANGEROUS_NAMES,...FREEDOM_NAMES],icon:'🥣',title:'두 번째 게임 모임 · 처음 마주친 여섯',
    storyBridge:true,
    scene:'./assets/event-freedom-trio-home.png',
    condition:life=>!!dangerousRelationshipMode(life)&&freedomRevealed(life)&&!(life.freedomTrioBond&&life.freedomTrioBond.active),
    variant:life=>dangerousRelationshipMode(life)==='harem'?{
      title:'다음 저녁, 여섯 개의 신발',
      desc:'첫 오프라인 모임 날 세라는 약속대로 따라오지 않았고 유진과 채린도 자리를 막지 않았습니다. 대신 귀가 뒤 세 사람은 게임 친구들을 직접 만나겠다고 했습니다. 다음 저녁, 정식으로 초대받은 여섯 사람의 신발이 작은 집 현관에 나란히 놓입니다.',
      lines:{
        '강유진':'이번에는 초대받고 왔어요. 신원 조회도 안 했고요. 연인으로서 궁금한 것만 직접 물어볼게요.',
        '한채린':'유명인이 셋이나 아무 대가 없이 저녁을 차렸다고요? 선의가 제일 비싼 계약일 때가 있죠.',
        '윤세라':'그날은 안 따라왔어요. 잘했죠? 그래서 오늘은 옆에 앉아도 되는 거예요.',
        '채원':'오늘은 막차요정으로 초대한 거예요. 연인이 몇 명인지 검사받으려고 부른 건 아니고요.',
        '유나':'걱정되면 같이 먹어요. 대신 누가 더 가까운지 재는 순간 식사는 끝이에요.',
        '소희':'국은 여섯 사람 몫도 있어요. 질문은 한 사람씩, 대답하고 싶지 않은 건 넘기기.'
      }
    }:{
      title:'친구라기엔 너무 많이 아는 초대 손님',
      desc:'게임 친구들의 정체가 공개된 첫 저녁은 아무 방해 없이 끝났습니다. 며칠 뒤 유진·채린·세라는 친구로서 새 인연에게 인사만 하겠다며 다음 식사에 초대해 달라고 했습니다. 셋은 당신과 친구일 뿐이라고 강조하면서도 귀가 시각과 앉았던 자리까지 이미 전부 알고 있습니다.',
      lines:{
        '강유진':'친구가 새 친구를 궁금해할 수도 있죠. 오늘은 정식 초대도 받았습니다. 세라 씨가 지난번 주소를 알아낸 과정은 따로 조사하고 있고요.',
        '한채린':'저 둘만 보내면 회의가 아니라 사건이 돼요. 나는 감독하러 온 겁니다. 당신 사생활에는 관심 없고.',
        '윤세라':'지난번에는 안 따라갔어요. 친구니까 다음 저녁에는 같이 먹을 수 있잖아요.',
        '채원':'친구 셋이 전부 귀가 시간과 주소를 아는 건 조금 화려한 우정이네요.',
        '유나':'우리도 아직 현실에서는 처음이에요. 누가 더 오래 알았는지로 자리를 정하진 않을게요.',
        '소희':'일단 들어와요. 문 앞에서 정상인 척 경쟁하면 이웃이 더 무서워해요.'
      }
    },
    choices:[
      {text:'아무도 누구의 자리를 정하러 온 게 아니라고 말하고 모두 식탁에 앉힌다',outcome:'유진은 출입구가 보이는 자리를, 채린은 계산서를 확인할 수 있는 자리를, 세라는 당신 옆을 골랐습니다. 자유인 셋은 그 선택을 평가하지 않고 식은 국부터 나눴습니다.',people:{'강유진':{trust:5},'한채린':{trust:5},'윤세라':{trust:5,obsession:-2},'채원':{trust:7},'유나':{trust:7},'소희':{trust:7}},life:{stress:-6},flags:{dangerousFreedomIntroduced:true}},
      {text:'게임에서 지킨 익명과 거절 규칙을 위험한 세 사람에게도 지켜 달라고 한다',outcome:'질문은 세 개에서 멈췄고 답하고 싶지 않은 내용은 넘어갔습니다. 위험한 세 사람은 불만을 삼켰지만, 자유인 셋은 당신이 관계마다 같은 경계를 세우는 사람이라는 것을 기억했습니다.',people:{'강유진':{trust:6},'한채린':{affection:3},'윤세라':{trust:4,obsession:-5},'채원':{trust:8},'유나':{trust:8},'소희':{trust:8}},life:{happy:4},flags:{dangerousFreedomBoundary:true}},
      {text:'여섯 사람에게 누가 가장 정상인지 직접 정해 보라고 한다',outcome:'자유인 셋은 동시에 당신을 가리켰다가 고개를 저었습니다. 위험한 셋은 서로를 가리키며 언성을 높였고, 첫 저녁은 관계 회의 대신 여섯 사람이 당신을 놀리는 자리로 끝났습니다.',people:{'강유진':{affection:3},'한채린':{affection:3},'윤세라':{obsession:3},'채원':{affection:2},'유나':{affection:2},'소희':{affection:2}},life:{happy:6,stress:3}}
    ]
  },
  {
    id:'group_dangerous_freedom_table',people:[...DANGEROUS_NAMES,...FREEDOM_NAMES],icon:'🍲',title:'잠그는 사람과 기다리는 사람',
    scene:'./assets/event-freedom-trio-home.png',
    condition:life=>!!dangerousRelationshipMode(life)&&!!(life.freedomTrioBond&&life.freedomTrioBond.active),
    variant:life=>dangerousRelationshipMode(life)==='harem'?null:{
      title:'친구가 정한 귀가 시각',
      desc:'자유인 세 사람과 함께 지내기 시작한 뒤에도 유진·채린·세라는 친구라는 이름으로 귀가 보고서를 보내 옵니다. 따뜻한 국이 놓인 식탁에서, 걱정하는 친구가 어디까지 기다리고 어디서부터 추적을 멈춰야 하는지 처음 따집니다.',
      lines:{'강유진':'신고할 수 있는 시각과 친구가 불안해하는 시각은 다르죠. 그래서 기준이 필요해요.','한채린':'친구라고 경호를 못 붙일 이유는 없어요. 다만 본인이 싫다고 하면 철수시키죠.','윤세라':'연인은 아니어도 연락이 끊기면 찾을 수 있잖아요. 친구가 사라졌는데 기다리기만 해요?','채원':'친구라면 더더욱 돌아온 뒤 설명할 기회를 먼저 줘야죠.','유나':'걱정과 소유를 구분 못 하면 이름만 친구인 거야.','소희':'약속한 시간까지는 우리랑 기다려요. 그 뒤에는 함께 찾으면 돼요.'}
    },
    desc:'윤세라는 귀가 시각을 묻고, 자유인 세 사람은 식지만 않는 국 한 그릇만 남겨 둡니다. 위험한 세 사람이 만든 안전망과 자유인 세 사람이 만든 귀가할 곳이 처음으로 같은 식탁에서 충돌합니다.',
    lines:{'강유진':'연락 두절과 단순한 늦은 귀가는 구분해야 해요. 기준 없이 찾기 시작하면 보호도 침입이 됩니다.','한채린':'기다리다 사고가 나면 누가 책임지죠? 최소한 차량과 사람은 준비해 둬야 해요.','윤세라':'기다리기만 하다 안 돌아오면 어떡해요?','채원':'그래도 돌아올 이유와 돌아오지 못할 이유는 본인이 말해야죠.','유나':'문을 잠그면 귀가는 하지만 집은 아니게 돼.','소희':'정 걱정되면 우리랑 같이 기다려요. 찾으러 가는 건 약속한 시간이 지난 뒤에.'},
    choices:[
      {text:'연락 없는 추적 금지 시각을 함께 정한다',outcome:'세라는 불만스럽게 타이머를 켰고, 세 사람은 기다리는 동안 국을 다시 데웠습니다.',people:{'윤세라':{trust:7,obsession:-6},'채원':{trust:6},'유나':{trust:6},'소희':{trust:6}},life:{stress:-8},flags:{groupBoundaryClock:true}},
      {text:'세라가 불안하면 자유인 셋에게 먼저 연락하게 한다',outcome:'세라의 추적은 세 사람의 확인 전화로 바뀌었습니다. 감시는 줄고 서로의 역할은 선명해졌습니다.',people:{'윤세라':{affection:5,obsession:-3},'채원':{trust:5},'유나':{trust:5},'소희':{trust:5}},life:{happy:4},flags:{groupMediation:true}},
      {text:'가장 먼저 찾아낸 사람이 옳다고 한다',outcome:'기다림은 다시 구조 경쟁이 됐습니다. 따뜻한 집에도 순찰표가 붙었습니다.',people:{'윤세라':{obsession:10},'채원':{trust:-7},'유나':{trust:-7},'소희':{trust:-7}},life:{stress:12}}
    ]
  },
  {
    id:'group_freedom_business_contract',people:['유나','차서윤','박지수'],icon:'📋',title:'집에는 직함을 들이지 않는다',
    scene:'./assets/event-freedom-trio-homecoming.png',
    condition:life=>!!(life.freedomTrioBond&&life.freedomTrioBond.active)&&!!(life.businessQuartetBond&&life.businessQuartetBond.active),
    desc:'사업 4인조가 공동생활의 일정과 비용을 최적화하려 하자 자유인 세 사람은 집까지 성과표가 들어오면 쉴 곳이 사라진다고 막습니다.',
    lines:{'차서윤':'공동생활도 운영입니다. 책임 소재가 없으면 결국 누군가 손해를 봐요.','박지수':'적어도 고장 난 보일러와 장보기 담당은 정해야죠.','유나':'분담은 좋아. 그런데 퇴근한 사람한테 업무 평가표를 붙이지는 마.'},
    choices:[
      {text:'생활 분담만 적고 성과 평가는 금지한다',outcome:'계약서는 한 장짜리 냉장고 메모가 됐습니다. 책임과 휴식이 같은 집에 남았습니다.',people:{'차서윤':{trust:6},'박지수':{trust:7},'유나':{trust:7}},life:{stress:-7},flags:{homeWorkBoundary:true}},
      {text:'사업 문제는 사무실에서만 네 책임자에게 맡긴다',outcome:'네 사람은 집에서 직함을 내려놓았고, 자유인 셋은 업무 시간의 전문성을 건드리지 않았습니다.',people:{'차서윤':{affection:5},'박지수':{affection:5},'유나':{trust:5}},life:{happy:5}},
      {text:'집도 가장 효율적인 사람이 관리하게 한다',outcome:'집은 깔끔해졌지만 귀가 뒤에도 결재 알림이 울렸습니다.',people:{'차서윤':{affection:6},'박지수':{trust:3},'유나':{trust:-9}},life:{stress:10}}
    ]
  },
  {
    id:'group_business_childhood_audit',people:['차서윤','미래','예린'],icon:'🔐',title:'관리 권한은 사랑의 증명이 아니다',
    scene:'./assets/pixel-event-childhood-pact-v1.png',
    condition:life=>!!(life.businessQuartetBond&&life.businessQuartetBond.active)&&!!(life.childhoodCircleBond&&life.childhoodCircleBond.active),
    desc:'사업 4인조가 회사 접근 권한을 감사하다 소꿉친구 다섯의 옛 관리자 흔적을 발견했습니다. 유능한 관리와 공동 통제는 결과가 좋아 보일수록 더 구분하기 어렵습니다.',
    lines:{'차서윤':'대표의 동의 없는 최고 권한은 연애가 아니라 내부통제 사고입니다.','미래':'인정. 과거 버전의 우리는 해고 사유 충분함.','예린':'일정을 잘 안다는 말로 허락까지 대신할 수는 없어. 이번에는 우리가 증명해야 해.'},
    choices:[
      {text:'모든 권한을 최소 권한 원칙으로 다시 발급한다',outcome:'사랑과 업무 어느 쪽도 백지 위임을 요구하지 못하게 됐습니다.',people:{'차서윤':{trust:8},'미래':{trust:9},'예린':{trust:9}},life:{stress:-5},flags:{relationshipAccessAudit:true}},
      {text:'사업 4인조에게 소꿉친구 기록 감사를 맡긴다',outcome:'다섯은 불쾌해했지만 처음으로 자신들의 선의를 외부 기준 앞에 세웠습니다.',people:{'차서윤':{affection:6},'미래':{trust:5},'예린':{trust:4}},life:{stress:3}},
      {text:'연인끼리 권한을 나누는 건 문제없다고 덮는다',outcome:'두 그룹 모두 자기 방식의 관리가 더 안전하다고 경쟁하기 시작했습니다.',people:{'차서윤':{trust:-7},'미래':{trust:-8},'예린':{trust:-8}},life:{stress:13}}
    ]
  },
  {
    id:'group_childhood_dangerous_truth',people:['윤세라','예린','보라','미래'],icon:'🖤',title:'윤세라가 선녀였던 날',
    scene:'./assets/event-sera-doorstep.png',
    condition:life=>!!(life.childhoodCircleBond&&life.childhoodCircleBond.active)&&!!(life.dangerousTrioBond&&life.dangerousTrioBond.active),
    desc:'소꿉친구 다섯이 윤세라의 열쇠를 문제 삼자, 세라는 보호 계획 원본을 식탁에 펼쳤습니다. 단독 침입과 분산형 생활 탈취 중 무엇이 더 위험했는지 누구도 외면할 수 없습니다.',
    lines:{'윤세라':'전 적어도 혼자 미쳤어요. 다섯이 계좌랑 약이랑 가족을 역할처럼 나누진 않았고.','예린':'그 말이 맞아서 더 화나네.','보라':'세라 씨가 정상인 게 아니라, 그때 우리가 비교도 안 되게 잘못한 거야.','미래':'판정 동의. 윤세라 선녀설이 아니라 우리 최악설이 정확함.'},
    choices:[
      {text:'다섯에게 윤세라를 비난하기 전에 자기 기록부터 공개하게 한다',outcome:'다섯은 보호 계획의 모든 원본을 현재 관계 구성원에게 공개했습니다.',people:{'윤세라':{trust:6,obsession:-3},'예린':{trust:8},'보라':{trust:8},'미래':{trust:8}},life:{stress:-6},flags:{childhoodAccountabilityPublic:true}},
      {text:'세라에게도 열쇠를 돌려주고 같은 경계를 적용한다',outcome:'누구도 과거의 잘못을 이유로 현재의 침입을 허가받지는 못했습니다.',people:{'윤세라':{affection:-3,trust:8,obsession:-8},'예린':{trust:7},'보라':{trust:7},'미래':{trust:7}},life:{stress:-8},flags:{equalRelationshipBoundary:true}},
      {text:'서로 감시하면 안전하다며 기록을 합치게 한다',outcome:'한 사람의 집착과 다섯의 통제망이 합쳐졌습니다. 문을 잠글 이유조차 사라졌습니다.',people:{'윤세라':{obsession:15},'예린':{trust:-9},'보라':{trust:-9},'미래':{trust:-9}},life:{stress:18}}
    ]
  }
);

function ensure(life) {
  if (!life.crossEvents || typeof life.crossEvents !== 'object') life.crossEvents = { seen:{}, cooldown:0, history:[], pending:null };
  if (!life.crossEvents.seen) life.crossEvents.seen = {};
  if (!Array.isArray(life.crossEvents.history)) life.crossEvents.history = [];
  if (!Number.isFinite(life.crossEvents.cooldown)) life.crossEvents.cooldown = 0;
  return life.crossEvents;
}
function materialize(life,event){
  if(!event||!life||typeof event.variant!=='function')return event;
  const variant=event.variant(life);
  return variant?{...event,...variant}:event;
}
function get(id,life) {
  const event=EVENTS.find(item => item.id === id&&!item.people.some(name=>RETIRED_HEROINES.has(name))) || null;
  return materialize(life,event);
}
function monthly(life) {
  const state = ensure(life);
  if (state.pending) return get(state.pending,life);
  const available=event=>!event.people.some(name=>RETIRED_HEROINES.has(name))&&
    (!root.QT_FREEDOM_TRIO||!event.people.some(name=>FREEDOM_NAMES.includes(name))||root.QT_FREEDOM_TRIO.revealed(life))&&
    !state.seen[event.id]&&event.condition(life);
  const bridge=EVENTS.find(event=>event.storyBridge&&available(event));
  if(bridge){
    state.pending=bridge.id;
    state.cooldown=1;
    return materialize(life,bridge);
  }
  if (state.cooldown > 0) { state.cooldown--; return null; }
  const eligible=EVENTS.filter(available);
  if (!eligible.length || Math.random() > .42) return null;
  const event = eligible[Math.floor(Math.random() * eligible.length)];
  state.pending = event.id;
  state.cooldown = 2;
  return materialize(life,event);
}
function resolved(life, eventId, choiceText) {
  const state = ensure(life);
  state.seen[eventId] = true;
  if (state.pending === eventId) state.pending = null;
  state.history.unshift({ id:eventId, choice:choiceText, day:life.day || 0 });
  state.history = state.history.slice(0, 20);
}

root.QT_CHARACTER_CROSS_EVENTS = { EVENTS, ensure, get, monthly, resolved, dangerousRelationshipMode };
})(window);
