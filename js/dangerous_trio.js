/* QuickTrade Life — 강유진 × 한채린 × 윤세라 결핍 공생 루트 */
(function(root){
'use strict';
const VERSION=3;
const NAMES=['강유진','한채린','윤세라'];
const ROMANCE_ENDINGS={
 cohabitation_refusal:{
  icon:'🔒',title:'공동생활 배드엔딩 · 세 개의 열쇠와 닫힌 문',scene:'./assets/event-trio-bed-ending.png',
  quote:'“같이 살 수 없다는 대답도 셋이서 들었으니, 해결도 셋이서 할게요.”',
  text:'네 번째 열쇠를 돌려준 순간 유진의 보호 절차, 채린의 계약, 세라의 복사 열쇠가 한꺼번에 움직였습니다. 서로를 가장 불신하던 세 사람은 당신을 놓아주는 일만큼은 누구에게도 맡기지 않았습니다.',
  detail:'위험한 3인조 공동생활 제안 거절 · 세 사람 공동 감금 배드엔딩'
 },
 pure_affair:{
  icon:'🦂',title:'순애 배드엔딩 · 한 사람을 고른 대가',scene:'./assets/event-trio-emergency.png',
  quote:'“우리 셋을 거절한 건 괜찮아요. 그런데 그 사람까지 속인 건 다른 문제죠.”',
  text:'한 사람에게 먼저 고백해 순애를 약속한 뒤 다른 관계를 시작하려 한 기록이 세 사람의 수사망·계약망·정보망에 동시에 남았습니다. 선택받지 못한 둘까지 그 약속의 증인이 되어 도망칠 틈을 지웠습니다.',
  detail:'개인 순애 약속 위반 · 불륜 시도 발각'
 }
};
function romanceEnding(kind){return ROMANCE_ENDINGS[kind]||null;}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rec=(life,name)=>(life.met||[]).find(person=>person.name===name);
const PLAYER_ARC_MODES={
 boundary:'face',equal:'face',anchor:'face',balance:'face',
 depend:'delegate',containment:'delegate',
 command:'control',
 complicity:'enclose',conspire:'enclose',fuse:'enclose',
 sever:'avoid',fracture:'deflect'
};
const PLAYER_ARC_COPY={
 face:{title:'말하고 선택하는 사람',text:'불편한 설명을 끝까지 하고, 도움을 받으면서도 자기 선택의 책임은 남겼습니다.'},
 delegate:{title:'구조받는 자리에 숨는 사람',text:'안전해지는 대신 결정권까지 넘겨, 다시 틀릴 가능성 자체를 다른 사람에게 맡겼습니다.'},
 control:{title:'명령으로 불안을 없애는 사람',text:'관계가 어긋날 시간을 견디기보다 상대의 행동을 정해 불확실성을 줄였습니다.'},
 enclose:{title:'관계 안에 세상을 가두는 사람',text:'바깥의 문제를 함께 해결하기보다 둘만의 비밀과 공모 안으로 가져와 출구를 줄였습니다.'},
 avoid:{title:'먼저 사라지는 사람',text:'상처받기 전에 밀어내고 대화를 끝내, 학창 시절처럼 설명하지 않은 이탈을 반복했습니다.'},
 deflect:{title:'선택을 경쟁으로 미루는 사람',text:'자기 답을 말하는 대신 상대들이 자리를 다투게 만들어 선택의 책임을 피했습니다.'},
 opening:{title:'닫힌 방문 앞의 사람',text:'학창 시절 관계가 무너졌을 때 누구와도 끝까지 말하지 않고 연락을 끊었습니다. 지금도 틀린 선택을 하느니 혼자 버티는 편이 익숙합니다.'}
};
const PERSONAL_ARC_LESSONS={
 '강유진':{
  dangerous_dependence:{title:'필요해지는 사람',text:'유진은 보호받는 사람이 자신만 찾도록 만드는 데 익숙해졌습니다. 셋이 함께라면 먼저 불리려는 경쟁부터 내려놓아야 합니다.'},
  accomplice:{title:'제복 안의 공범',text:'유진은 규칙을 비틀어서라도 한 사람을 지키는 선택을 해왔습니다. 이제는 자기 판단보다 네 사람의 합의를 먼저 두어야 합니다.'},
  equal:{title:'불러주는 사람',text:'유진은 요청받기 전까지 문밖에서 기다리는 법을 배웠습니다. 그 기다림을 채린과 세라에게도 허락할 수 있는지가 남았습니다.'}
 },
 '한채린':{
  private_submission:{title:'왕관을 내려놓는 방',text:'채린은 피학 충동을 도발과 공개적 사고로 훔치지 않고, 둘만의 합의와 중단 규칙 안에서 부탁하는 법을 배웠습니다. 셋이 함께라면 그 취향을 특별대우의 증거로 만들지 않아야 합니다.'},
  boardroom_pair:{title:'같은 테이블의 포식자',text:'채린은 사랑과 거래를 한 테이블에 올려놓았습니다. 이제 돈과 지분으로 자기 자리만 더 크게 만들지 않아야 합니다.'},
  equal:{title:'값을 매기지 않은 자리',text:'채린은 값을 매기지 않고도 사람이 남을 수 있음을 배웠습니다. 그 자리를 다른 두 사람과 같은 크기로 나눌 차례입니다.'}
 },
 '윤세라':{
  mutual_captivity:{title:'서로 잠근 문',text:'세라는 둘이 함께 잠그는 문을 사랑의 모양으로 받아들였습니다. 셋이 함께라면 문이 아니라 돌아오겠다는 대답을 믿어야 합니다.'},
  mutual_salvation:{title:'문을 열어두는 사람',text:'세라는 열린 문과 정해진 귀환을 견디는 법을 배웠습니다. 이제 유진과 채린이 곁에 있어도 자기 자리가 사라지지 않는다고 믿어야 합니다.'},
  shared_cage:{title:'문이 필요 없는 방',text:'세라는 생활 전체를 묶어 떠날 가능성을 없앴습니다. 공동생활에서는 습관을 감옥으로 만들지 않는 선을 받아들여야 합니다.'},
  anchored:{title:'돌아올 시간을 아는 사람',text:'세라는 기다림에 끝을 정하는 법을 배웠습니다. 그 약속이 자신만의 것이 아니라 네 사람 모두의 것임을 받아들일 차례입니다.'},
  distance:{title:'열어둔 문 너머',text:'세라는 따라가지 않는 하루를 쌓기 시작했습니다. 셋이 함께라면 사라지는 대신 불안을 직접 말해야 합니다.'}
 }
};
function personalCarry(life,name){
 const state=ensure(life),person=rec(life,name);
 const currentRoute=person&&person.story&&person.story.ending&&person.story.ending.route
  ||person&&(name==='강유진'?person.yujinEndingRoute:name==='한채린'?person.chaerinEndingRoute:person.seraEndingRoute);
 const savedRoute=state.individualRoutes&&state.individualRoutes[name];
 const route=currentRoute||(savedRoute&&savedRoute!=='unknown'?savedRoute:null);
 if(currentRoute){state.individualRoutes=state.individualRoutes||{};state.individualRoutes[name]=currentRoute;}
 const unfinished={
  '강유진':{title:'먼저 불리고 싶은 사람',text:'유진은 사건이 끝난 뒤에도 자신이 필요한 사람으로 남고 싶어 합니다. 다른 두 사람의 도움을 인정하는 순간, 그 욕망이 보호인지 독점인지 선명해집니다.'},
  '한채린':{title:'도발로 반응을 훔치는 사람',text:'채린은 원하는 말을 직접 부탁하는 대신 상대를 화나게 만들어 반응을 끌어냅니다. 세 사람 앞에서는 약점을 무기로 쓰지 않고 자기 욕망을 말해야 합니다.'},
  '윤세라':{title:'열린 문을 견디는 사람',text:'세라는 곁에 없는 시간을 버림받았다는 증거로 받아들입니다. 유진과 채린이 옆에 있어도 돌아온다는 대답을 기다릴 수 있는지가 남았습니다.'}
 };
 const lesson=(PERSONAL_ARC_LESSONS[name]||{})[route]||unfinished[name];
 return{name,route:route||'unknown',title:lesson.title,text:lesson.text};
}

const PRELUDES=[
 {
  id:'three_ends_one_ledger',title:'악우 형성 1 · 우연히 겹친 세 사람',icon:'🚪',scene:'./assets/event-trio-first-crossing.webp',
  desc:'세 사람은 협력하러 온 게 아닙니다. 각자 당신을 자기 방식대로 만나러 왔다가 같은 자리에서 정면으로 마주쳤을 뿐입니다. 채린은 찢긴 계약서의 남은 조각을 돌려주러, 유진은 사건 뒤의 안전을 확인하러, 세라는 약속한 편의점 물건을 건네러 왔습니다. 서로 다른 이유가 모두 당신 한 사람에게 향한다는 사실을 알아챈 셋은 인사보다 먼저 “쟤는 대체 뭐지”부터 눈으로 잽니다.',
  speakers:[
   {name:'한채린',line:'계약서 조각 돌려주러 왔어. 경찰이랑 스토커가 낄 자리 아니야. …왜 둘 다 내가 못 버린 걸 아는 표정인데.'},
   {name:'강유진',line:'사건 확인은 끝났습니다. 두 분이 수사와 상관없이 여기 있는 이유부터 설명해 주세요. 나도 같은 질문을 받을 테니까.'},
   {name:'윤세라',line:'둘 다 오늘 처음 보는데… 이 사람 옆은 원래 제 자리예요. 확인은 제가 더 오래 했고요.'},
   {name:'첫 부하',line:'보고드립니다. 한 분은 찢어진 계약서를 보관했고, 한 분은 끝난 사건을 계속 확인하고, 한 분은 약속 장소보다 먼저 와 있었습니다. …세 분 다 방식만 다른 것 같습니다.'}
  ],
  choices:[
   {id:'divide_roles',text:'각자 온 이유만 확인하고 오늘은 따로 돌려보낸다',stability:8,trust:3,result:'셋은 각자 방식대로 흩어졌지만, 돌아가는 길 내내 서로가 당신에게 뭘 원하는지를 곱씹었습니다. 이해는 전혀 못 했어도, 상대의 취향만은 잊지 못했습니다.'},
   {id:'ask_fault',text:'셋이 서로 뭘 원하는지 앞에서 설명해 보라고 한다',stability:-3,trust:1,result:'채린은 복종을, 유진은 보호를, 세라는 곁을 원한다고 딱딱하게 실토했습니다. 셋 다 서로를 “제정신이 아니다”라고 여기면서도, 상대가 무엇에 약한지를 정확히 외워 버렸습니다.'},
   {id:'confiscate',text:'이런 식으로 다 같이 몰려오지 말라고 셋 다 나무란다',stability:5,trust:2,result:'세 사람은 잔소리를 듣고도 물러서지 않았습니다. 취향은 못 바꿔도, 다음엔 누가 먼저 오느냐가 중요하다는 것만은 셋 다 알아 버렸습니다.'}
  ]
 },
 {
  id:'preference_audit',title:'악우 형성 2 · 들켜버린 취향과 잘잘못',icon:'🦂',scene:'./assets/event-trio-meeting-2.png',
  desc:'처음 어색하게 마주친 뒤에도 서로가 자꾸 신경 쓰인 세 사람이 다시 모였습니다. 이번엔 서로의 잘못과 당신을 대하는 방식을 한 표에 올립니다. 불법 추적과 사적 경호, 계열사 압박을 따지다가도 외부 세력의 이름이 나오면 상대의 약점부터 가립니다. 싸울 권리는 자기들에게만 있다는 듯한 이상한 편들기입니다.',
  speakers:[
   {name:'강유진',line:'한채린 씨는 자기 돈에도 안 눌리는 사람 앞에서만 편해지고, 세라 씨는 솔직하다는 말로 무단침입을 덮어요.'},
   {name:'한채린',line:'당신은 이 사람이 무너질 때까지 보호를 늘려 자기 번호부터 누르게 만들잖아. 윤세라는 열쇠를 훔치고도 우리보다 솔직한 척하고.'},
   {name:'윤세라',line:'그래도 채린 씨 계열사 흔적은 내가 지웠고, 유진 씨 순찰기록은 채린 씨가 막았네요. 둘 다 나 싫다면서 왜 내 흔적을 치워줘요?'},
   {name:'첫 부하',line:'이런 말씀 드리긴 죄송하지만 세 분 다 평범한 방식으로 사람을 좋아하시는 것 같지는 않습니다. 서로 잘못은 정확히 짚으면서 외부 기록은 지워 주고 계십니다. 이 회의를 계속 경호하려면 수당은 조금 올려 주셨으면 합니다.'}
  ],
  choices:[
   {id:'triple_joke',text:'“두 배로 되겠냐. 세 배는 받아야지.”라고 받아친다',stability:10,trust:5,result:'첫 부하는 진담인지 확인하듯 당신을 보다가 웃었습니다. 채린이 급여명세서를 달라고 손을 내밀자 당신과 부하는 동시에 농담이라고 정정했습니다. 셋은 서로를 신고하겠다는 말을 멈추지 않으면서도 외부에 넘길 자료부터 함께 지웠습니다.'},
   {id:'all_correct',text:'셋 다 맞는 말이니 서로 선을 넘을 때 먼저 막으라고 한다',stability:9,trust:4,result:'셋은 당신에게 화를 내는 대신 상대가 다음에 어떤 방식으로 선을 넘을지 감시하기 시작했습니다. 폭로는 흉이 아니라 경고가 됐고, 잘못 목록은 외부가 악용하지 못하게 공동 봉인됐습니다.'},
   {id:'most_normal',text:'누가 가장 정상인지 직접 투표해 보라고 한다',stability:-5,trust:1,result:'세 표가 전부 자기 이름에 들어갔습니다. 결론은 없었지만 셋은 상대의 필체와 거짓말할 때의 표정까지 외웠습니다.'}
  ]
 }
];

const CHAPTERS=[
 {
  title:'악우가 같은 편이 된 날',icon:'🗝️',scene:'./assets/event-trio-647.png',
  desc:'장부 사건 뒤에도 서로 연락을 끊지 못한 세 사람이 이번에는 당신을 공격한 세력을 함께 치기 위해 모였습니다. 이미 서로의 결핍과 취향까지 알아버린 셋은 친해서 온 것이 아니라고 강조하면서도, 설명 없이 수사·자금·정보 역할을 나눕니다.',
  bridge:'두 번의 우연한 대면에서 서로의 약점과 잘못을 외운 결과, 세 사람은 상대를 믿어서가 아니라 상대가 어디서 선을 넘을지 알기 때문에 등을 맡깁니다. 이 작전은 호감 경쟁이 팀의 규칙으로 바뀔 수 있는 첫 시험입니다.',
  playerWound:'과거에는 관계가 복잡해지자 단체방을 차단하고 원본 장부만 들고 사라졌습니다. 이번에는 세 사람의 충돌을 구경하거나 경쟁시키지 않고, 같은 테이블에서 역할과 책임을 직접 정해야 합니다.',
  speakers:[
   {name:'강유진',line:'세라 씨 방식은 불법이에요. 자료는 내가 증거로 바꿀 테니 원본은 건드리지 마요.'},
   {name:'한채린',line:'내 계열사라고 봐줄 생각은 없어. 압류 전에 돈줄부터 묶을게. 경찰관은 영장, 세라는 우회 계좌를 줘.'},
   {name:'윤세라',line:'사이 나쁜 사람치고 손발이 잘 맞네요. 그래도 이 사람 옆자리는 내 거예요.'}
  ],
  choices:[
   {id:'roles',tag:'balance',text:'말싸움은 두고 공격한 세력부터 함께 잡자고 한다',preview:'가짜 불화와 진짜 공조를 실제 팀으로 묶는다',stability:12,trust:5,result:'유진은 증거, 채린은 돈줄, 세라는 내부 동선을 맡았습니다. 회의가 끝날 때까지 서로를 한 번도 칭찬하지 않았지만 빈틈도 하나 남기지 않았습니다.'},
   {id:'compete',tag:'fracture',text:'누가 나를 가장 잘 지키는지 증명해보라고 한다',preview:'결핍을 경쟁으로 자극한다',stability:-9,obsession:6,result:'세 사람은 물러서지 않았습니다. 당신의 한 달 일정이 보호 실적 경쟁표로 변하기 시작했습니다.'},
   {id:'surrender',tag:'containment',text:'휴대전화·열쇠·일정을 셋에게 모두 맡긴다',preview:'세 개의 감시망이 하나로 이어진다',stability:7,obsession:10,result:'누구 하나가 선을 넘으면 나머지 둘이 막겠다는 명분으로, 세 사람 모두 당신의 생활에 들어왔습니다.'}
  ]
 },
 {
  title:'유진 · 가장 먼저 부르지 않은 밤',icon:'📵',scene:'./assets/event-trio-yujin-shared-signal.png',focus:'강유진',
  desc:'유진은 세 사람의 비상 연락망을 완성하고도 자기 이름을 첫 칸에서 지우지 못합니다. 병원과 끝난 사건을 계속 챙기며 드러난 마음은 단순한 책임감이 아니었습니다. 위험을 먼저 발견한 자신이 아니라 도움을 요청한 당신이 누구를 부를지 정해야 합니다.',
  bridge:'첫 공동작전에서 유진은 누구보다 빨리 움직였지만, 세라의 정보와 채린의 자금이 없었다면 합법적인 구조까지 끝내지 못했음을 압니다. 이제 보호를 독점하는 대신 다른 두 사람의 도움을 인정해야 합니다.',
  playerWound:'당신에게도 “유진이 알아서 구해 주면 내가 틀린 선택을 하지 않아도 된다”는 유혹이 있습니다. 도움을 청하는 것과 판단 자체를 맡기는 것이 다르다는 사실을 말로 정해야 합니다.',
  speakers:[
   {name:'강유진',line:'내가 가장 빨리 갈 수 있어도, 항상 나를 먼저 불러야 하는 건 아니겠죠. 그걸 인정하는 게 생각보다 어렵네요.'},
   {name:'한채린',line:'순번표라도 만들어? 네 보호 본능이 사랑인 척 독점하지 않으면 나야 상관없어.'},
   {name:'윤세라',line:'먼저 부르는 이름이 매번 달라도… 결국 집으로 돌아오면 되는 거죠?'}
  ],
  choices:[
   {id:'shared_signal',tag:'balance',text:'위험 종류에 따라 연락할 사람을 내가 직접 고르겠다고 한다',preview:'유진의 보호를 독점권이 아닌 선택 가능한 안전망으로 바꾼다',stability:12,trust:6,result:'유진은 자기 번호 옆의 1순위 표시를 지웠습니다. 대신 세 사람 모두가 볼 수 있는 “본인이 도움을 요청했는가” 칸을 가장 위에 만들었습니다.'},
   {id:'always_yujin',tag:'containment',text:'어떤 일이든 유진을 가장 먼저 부르겠다고 약속한다',preview:'유진의 불안을 세 사람 사이의 서열로 굳힌다',stability:-5,obsession:9,result:'유진은 안도했지만 채린과 세라는 그 약속을 자신들이 넘어야 할 새 경계선으로 받아들였습니다.'},
   {id:'no_help',tag:'fracture',text:'누구에게도 도움을 청하지 않겠다고 한다',preview:'보호와 통제를 구분하는 대신 세 사람 모두를 밀어낸다',stability:-13,trust:-5,result:'유진은 물러났지만 기다리지는 않았습니다. 세 사람은 당신 몰래 각자의 감시망을 다시 켰습니다.'}
  ]
 },
 {
  title:'채린 · 도발하지 않고 부탁한 밤',icon:'🖤',scene:'./assets/event-trio-chaerin-direct-request.png',focus:'한채린',
  desc:'채린은 검은 목걸이를 테이블 위에 놓고도 누구에게도 차 달라고 말하지 못합니다. 둘만 있을 때는 도발로 가혹한 반응을 끌어냈지만, 세라와 유진이 보는 앞에서는 원하는 것을 직접 부탁해야 합니다. 세 사람 모두 채린의 피학 취향을 이미 알아챘고, 채린만 끝까지 아니라고 우깁니다.',
  bridge:'유진이 가장 먼저 불릴 권리를 내려놓은 뒤, 이번에는 채린이 상대를 화나게 만들어 원하는 가학적 반응을 훔치는 습관을 내려놓아야 합니다. 피학 욕망보다 중요한 것은 거절과 중단이 가능한 부탁으로 바꾸는 일입니다.',
  playerWound:'당신은 채린의 도발에 반응할수록 자기가 관계를 움직인다고 착각하기 쉽습니다. 이번에는 채린의 결핍을 이용해 공개적으로 굴복시키지 않고, 원하는 말을 직접 하게 기다려야 합니다.',
  speakers:[
   {name:'한채린',line:'이걸 차겠다는 뜻은 아니야. 그냥… 내가 직접 결정하고 직접 풀 수 있게 하라고 누가 명령하면 생각은 해볼 수 있다는 거지.'},
   {name:'강유진',line:'매 맞는 여자가 꿈이었냐고 묻고 싶지만 참을게요. 도발해서 얻은 대답은 동의가 아니니까, 이번에는 직접 부탁하세요.'},
   {name:'윤세라',line:'결국 혼나고 싶은 게 아니라, 혼나도 버려지지 않는지 확인하고 싶었던 거네요. 저보다는 복잡하게 집착하네요.'}
  ],
  choices:[
   {id:'equal_chairs',tag:'balance',text:'원하는 것이 있으면 도발하지 말고 직접 부탁하라고 명령한다',preview:'채린이 거절 가능한 말로 자기 욕망을 밝힌다',stability:13,trust:6,result:'채린은 한참 버티다가 “오늘은 가지 말아 달라”고 처음으로 부탁했습니다. 목걸이의 열쇠는 끝까지 자기 손에 두었고, 세라와 유진도 더는 놀리지 않았습니다.'},
   {id:'buy_priority',tag:'containment',text:'앞으로 원하는 반응은 자신이 전부 정해주겠다고 한다',preview:'채린의 욕망을 플레이어의 소유권으로 바꾼다',stability:-7,obsession:10,result:'채린은 웃으며 목걸이를 집었지만, 그 순간부터 모든 도발은 더 강한 명령을 받아내기 위한 경쟁이 되었습니다. 유진과 세라도 플레이어의 결정권이 아니라 채린의 안전부터 감시하기 시작했습니다.'},
   {id:'humiliate',tag:'fracture',text:'세라와 유진 앞에서 직접 차고 무릎을 꿇으라고 한다',preview:'사적인 욕망을 공개 굴욕으로 바꾼다',stability:-14,obsession:7,result:'채린은 웃는 얼굴로 목걸이를 치웠습니다. “역시 내 취향을 안 게 아니라 약점을 잡은 거였네.” 둘만의 안전한 규칙은 그 자리에서 끝났습니다.'}
  ]
 },
 {
  title:'세라 · 열쇠를 복사하지 않은 하루',icon:'🚪',scene:'./assets/event-trio-sera-single-key.png',focus:'윤세라',
  desc:'세라는 유진과 채린이 당신과 외출한 동안 처음으로 열쇠를 복사하지도, 동선을 따라가지도 않았습니다. 대신 단체방에 “언제 돌아와요?”라고 묻고 답을 기다립니다. 사라지지 않고 기다리는 일이 세라의 가장 큰 양보입니다.',
  bridge:'첫 연락의 우선권과 돈으로 만든 우선권을 차례로 시험한 뒤, 세라의 “먼저 확인할 권리”가 테이블에 오릅니다. 다른 두 사람이 곁에 있을 때도 대답을 기다릴 수 있는지가 세라에게는 가장 어려운 문제입니다.',
  playerWound:'세라가 기다리는 집은 따뜻하지만, 당신에게는 다시 세상과 연락을 끊어도 이해받을 수 있는 은신처이기도 합니다. 돌아올 곳을 갖는 것과 그곳을 핑계로 밖을 포기하는 일을 구분해야 합니다.',
  speakers:[
   {name:'윤세라',line:'두 사람이랑 있는 건 싫어요. 그래도 제가 따라가면, 돌아온다는 대답을 듣기도 전에 결론 내리는 거잖아요.'},
   {name:'강유진',line:'기다린 건 잘했어요. 확인할 시간이 지나기 전에는 나도 조회하지 않았고요.'},
   {name:'한채린',line:'귀가 시각을 돈으로 당길 생각도 안 했어. 우리 셋 다 꽤 많이 참았네.'}
  ],
  choices:[
   {id:'answer_return',tag:'balance',text:'늦어진 이유와 돌아올 시간을 셋 모두에게 답한다',preview:'세라의 기다림을 공동 약속으로 돌려준다',stability:14,trust:7,result:'세라는 메시지를 몇 번 다시 읽고도 추가 질문을 보내지 않았습니다. 당신이 돌아왔을 때 세 사람은 문을 잠그는 대신 늦은 저녁을 다시 데웠습니다.'},
   {id:'live_location',tag:'containment',text:'불안하지 않게 앞으로 위치를 항상 공유한다',preview:'기다림 대신 더 정교한 감시를 준다',stability:1,obsession:12,result:'세라는 안심했지만 유진과 채린도 같은 권한을 요구했습니다. 단체방은 대화보다 이동 기록이 더 많은 관제 화면이 됐습니다.'},
   {id:'mock_waiting',tag:'fracture',text:'그 정도 기다린 걸 대단한 일처럼 말하지 말라고 한다',preview:'세라가 어렵게 만든 빈자리를 조롱한다',stability:-16,trust:-7,result:'세라는 답장을 지우고 사라졌습니다. 그날 밤에는 단체방 대신 현관 잠금장치의 접속 기록만 세 번 남았습니다.'}
  ]
 },
 {
  title:'사라진 37분',icon:'🚨',scene:'./assets/event-trio-emergency.png',
  desc:'공격 세력의 경고와 세 사람의 질문이 한꺼번에 도착하자, 당신은 예전처럼 설명을 미룬 채 휴대전화를 껐습니다. 그 뒤 사라진 37분 동안 셋은 통화 한 번 없이 도시를 세 구역으로 나눴습니다. 유진은 신고 절차, 채린은 병원과 차량, 세라는 습관과 마지막 말을 맡았습니다. 평소의 싸움이 역할 확인이었다는 사실과, 당신의 침묵이 세 사람의 공포를 동시에 움직였다는 사실이 함께 드러납니다.',
  bridge:'보호·돈·확인을 둘러싼 세 번의 선택은 아직 말과 생활 규칙에 머물러 있습니다. 연락이 끊긴 37분은 세 개의 통제망이 서로를 방해할지, 하나의 안전망으로 맞물릴지를 가르는 실전입니다.',
  playerWound:'이번 위기는 우연한 통신 장애가 아니라, 갈등이 커지면 먼저 연락을 끊는 당신의 오래된 습관에서 시작됐습니다. 구조받은 뒤에도 이유를 숨기면 세 사람의 통제만 더 강해집니다.',
  speakers:[
   {name:'강유진',line:'찾았으면 됐어요. 누가 먼저였는지는 나중에 따져요.'},
   {name:'한채린',line:'병원 한 층을 비웠어요. 이제 허가 없이 접근할 사람은 없어요.'},
   {name:'윤세라',line:'나는 처음부터 여기일 줄 알았어요. 둘이 늦은 거예요.'}
  ],
  choices:[
   {id:'thank',tag:'balance',text:'세 사람 모두에게 고맙다고 하고 혼자 있던 이유를 설명한다',preview:'구조 뒤에도 자신의 목소리를 지킨다',stability:13,trust:7,result:'누구도 완전히 납득하지는 못했지만, 다음에는 연락이 끊겨도 정해진 시간까지 기다리기로 했습니다.'},
   {id:'need',tag:'containment',text:'다시는 혼자 두지 말아달라고 매달린다',preview:'세 사람의 결핍을 동시에 만족시킨다',stability:10,obsession:12,result:'유진은 비상 전화를, 채린은 상시 경호를, 세라는 수면 시간까지 포함한 생활표를 준비했습니다.'},
   {id:'blame',tag:'fracture',text:'가장 늦게 온 사람을 탓한다',preview:'구조를 서열 경쟁으로 바꾼다',stability:-16,obsession:8,result:'안도는 즉시 적대로 바뀌었습니다. 당신을 찾아낸 사건은 세 사람에게 끝나지 않는 점수표가 됐습니다.'}
  ]
 },
 {
  title:'네 번째 열쇠가 놓인 방',icon:'🌅',scene:'./assets/event-trio-meeting-3.png',
   desc:'세 사람은 각자 더 넓고 안전한 집을 준비했지만, 누구의 집으로 들어가도 그 사람에게 열쇠와 생활의 주도권이 쏠린다는 사실을 인정합니다. 긴 말다툼 끝에 유진·채린·세라는 누구의 소유도 아닌 기존 자취방을 공동생활의 중립 거점으로 남겨 달라고 먼저 요청했습니다. 이 요청을 받아들이는 동안에는 네 사람 중 누구도 단독으로 이사를 결정하지 않으며, 관계를 끝낼 때만 거점 합의도 함께 해제됩니다.',
  bridge:'37분의 구조가 협력이었는지 새 경쟁이었는지는 직전 선택에 따라 달라졌습니다. 이제 공동생활의 결론도 가장 좋은 집을 고르는 일이 아니라, 누가 주인이 되고 누가 통제받을지를 끝까지 합의하는 일이 됩니다.',
  playerWound:'예전의 당신은 누구도 선택하지 않으면 누구도 배신하지 않는다고 믿고 사라졌습니다. 이번에는 세 사람의 요청 뒤에 숨지 않고, 함께 살 이유와 끝낼 조건까지 자기 입으로 말해야 합니다.',
  speakers:[
    {name:'강유진',line:'나가도 돼요. 위험하면 혼자 버티지 말고, 우리가 정한 연락망에서 필요한 사람을 직접 골라 불러요.'},
    {name:'한채린',line:'내 집으로 가면 결국 내가 주인이 되겠지. 그건 싫어. 여기 그대로 살아. 대신 생활비로 소유권을 사려는 짓도 안 할게.'},
    {name:'윤세라',line:'여기는 누구의 집도 아니어서 좋아요. 이사를 생각하면 우리 셋한테 먼저 말해 주세요. 세 사람 모두 놓아줄 때만 옮겨요.'}
  ],
  choices:[
    {id:'badfriends',tag:'balance',text:'세 사람의 중립 거점 요청을 받아들이고 누구도 단독으로 집을 바꾸지 않기로 합의한다',preview:'세 사람의 요청으로 유지되는 악우 공동생활 거점',stability:18,trust:8,result:'당신은 세 사람이 먼저 내민 중립 거점 합의에 서명했습니다. 채린은 새 집과 생활비 제안을 거두고, 유진은 조직 밖에서 법과 절차를 맡으며, 세라만 정보원으로 세력에 들어왔습니다. 자취방을 고정한 것은 플레이어의 고집이 아니라 세 사람이 서로에게 요구한 안전장치가 됐습니다.'},
   {id:'goldencage',tag:'containment',text:'열쇠와 계좌와 일정을 세 사람에게 전부 맡긴다',preview:'공동생활이 아니라 세 겹의 감금이 된다',stability:-18,obsession:15,result:'합의할 규칙이 사라지자 세 사람은 당신을 지키는 방식만 놓고 충돌했습니다. 문은 열려 있었지만 누구의 허락으로 나가야 하는지조차 정할 수 없었습니다.'},
   {id:'chooseone',tag:'fracture',text:'오늘 여기서 한 사람만 선택하겠다고 선언한다',preview:'공동생활을 깨고 마지막 쟁탈전을 시작한다',stability:-25,obsession:10,result:'세 사람은 당신의 선택을 기다리지 않았습니다. 각자가 가진 권력과 기록과 기억으로, 나머지 둘을 먼저 밀어내기 시작했습니다.'}
  ]
 }
];
function pureChapters(life){
 const path=root.QT_ROMANCE_ROUTES&&root.QT_ROMANCE_ROUTES.path(life,'dangerous');
 const chosen=path&&path.name||'선택한 사람',friends=NAMES.filter(name=>name!==chosen);
 return[
  {
   title:'한 사람을 고른 뒤의 첫 회의',icon:'💍',scene:'./assets/event-trio-647.png',
   desc:`${chosen}과의 연애를 숨기지 않고 ${friends.join('과 ')}에게 직접 알렸습니다. 두 사람은 선택받지 못한 경쟁자처럼 남는 대신, 각자의 개인사를 끝까지 함께 정리한 친구로서 같은 자리에 앉았습니다.`,
   playerWound:'학창 시절에는 관계가 무너질 때 아무에게도 결론을 설명하지 않았습니다. 이번 순애는 한 사람만 고르는 일이 아니라, 선택받지 않은 두 사람에게도 숨거나 여지를 남기지 않고 직접 답하는 데서 시작합니다.',
   speakers:[
    {name:chosen,line:'우리 관계를 숨겨서 두 사람을 더 우습게 만들고 싶진 않아요. 연애와 동맹의 선은 여기서 분명히 해요.'},
    {name:friends[0],line:'기분이 좋을 리는 없지. 그래도 네 선택을 뒤집으려고 도운 건 아니야.'},
    {name:friends[1],line:'친구로 남는다고 마음까지 없던 일이 되진 않아요. 대신 몰래 문을 잠그지는 않을게요.'}
   ],
   choices:[
    {id:'declare_boundaries',tag:'balance',text:'연인은 한 명이지만 세 사람 모두의 거절권과 비밀을 지키겠다고 한다',preview:'순애와 우정을 공개된 규칙으로 분리한다',stability:14,trust:7,result:'누구도 만족한 척하지 않았지만 관계를 숨기거나 시험하지 않겠다는 첫 규칙에는 모두 동의했습니다.'},
    {id:'ask_silence',tag:'containment',text:'밖에서는 셋 모두와 애매한 사이인 척해 달라고 한다',preview:'순애를 지키기 위해 다시 비밀을 만든다',stability:-7,obsession:7,result:'선택한 연인은 불안해했고 두 친구는 자신들이 체면을 위한 가림막이 됐다고 느꼈습니다.'},
    {id:'compare_feelings',tag:'fracture',text:'누가 더 오래 좋아했는지 지금 따져 보자고 한다',preview:'정리된 감정을 다시 경쟁으로 돌린다',stability:-12,obsession:9,result:'연애의 확정은 끝이 아니라 새 점수표가 됐고, 세 사람은 과거의 장면을 증거처럼 꺼내기 시작했습니다.'}
   ]
  },
  {
   title:'연인 한 명과 친구 둘의 공동작전',icon:'🦂',scene:'./assets/event-trio-emergency.png',
   desc:'당신을 공격한 세력의 장부가 발견되자 세 사람은 다시 모였습니다. 선택한 연인의 보호는 사적인 약속으로, 두 친구의 도움은 빚이나 미련이 아닌 각자의 판단으로 분리해야 합니다.',
   playerWound:'연인에게 모든 판단을 맡기면 다시 선택할 필요가 없어지고, 두 친구를 경쟁시키면 자기 책임을 피할 수 있습니다. 사랑과 작전의 지휘권을 분리해야 같은 실패를 반복하지 않습니다.',
   speakers:[
    {name:'강유진',line:'연인 여부와 증거 절차는 별개예요. 내가 맡은 선을 넘으면 두 사람이 먼저 막아줘요.'},
    {name:'한채린',line:'돈을 대가로 자리를 사지 않겠다고 했지. 대신 끊어야 할 자금줄은 정확히 말해.'},
    {name:'윤세라',line:'친구도 돌아오지 않는 사람을 찾을 수 있잖아요. 이번에는 먼저 물어보고 움직일게요.'}
   ],
   choices:[
    {id:'separate_roles',tag:'balance',text:'수사·자금·정보 역할을 나누고 연인에게만 지휘권을 주지 않는다',preview:'사랑과 협력을 같은 서열표에 올리지 않는다',stability:15,trust:8,result:'세 사람은 각자 맡은 일만 보고했고, 선택한 연인도 사적인 걱정을 작전 명령으로 바꾸지 않았습니다.'},
    {id:'lover_commands',tag:'containment',text:`${chosen}에게 두 친구를 지휘하게 한다`,preview:'연애 관계를 작전의 상하관계로 확대한다',stability:-6,obsession:8,result:'명확한 지휘선은 생겼지만 두 친구는 도움을 호의가 아니라 복종 시험처럼 느끼기 시작했습니다.'},
    {id:'use_jealousy',tag:'fracture',text:'가장 큰 성과를 낸 사람과 더 가까워지겠다고 자극한다',preview:'끝난 관계 분기를 다시 경쟁으로 만든다',stability:-15,obsession:12,result:'공동작전은 즉시 구애 경쟁으로 무너졌고 공격한 세력보다 서로의 실수를 먼저 찾기 시작했습니다.'}
   ]
  },
  {
   title:'둘만의 열쇠와 세 사람의 출입증',icon:'🗝️',scene:'./assets/event-trio-meeting-5.png',
   desc:`${chosen}에게는 둘만의 귀가 약속을, ${friends.join('과 ')}에게는 필요할 때 찾아올 수 있는 친구의 출입증을 건넬 차례입니다. 같은 열쇠를 나눠 갖지 않아도 서로를 버린 것이 아니라는 결론이 필요합니다.`,
   playerWound:'당신은 문을 완전히 닫거나 모두에게 가능성을 남기는 방식으로 갈등을 미뤄 왔습니다. 이번에는 연인과 친구의 자리를 다르게 부르면서도 어느 관계도 거짓말로 유지하지 않아야 합니다.',
   speakers:[
    {name:chosen,line:'내가 연인이라는 이유로 두 사람의 삶까지 결정하진 않을게요. 대신 우리 약속은 애매하게 숨기지 말아요.'},
    {name:friends[0],line:'특별대우를 못 받은 게 아니라 다른 자리를 고른 거라고 해. 그래야 나도 미련을 거래로 바꾸지 않지.'},
    {name:friends[1],line:'문 밖에 있어도 부르면 올 수 있죠. 그 정도 거리는… 친구라면 견뎌볼게요.'}
   ],
   choices:[
    {id:'pure_alliance',tag:'balance',text:`${chosen}과의 순애를 지키며 두 사람에게는 동등한 친구의 자리를 약속한다`,preview:'연애와 악우 동맹을 함께 유지한다',stability:18,trust:10,result:'둘만의 열쇠 하나와 친구용 출입증 두 장이 서로 다른 고리에 걸렸습니다. 누구의 자리도 다른 이름으로 속이지 않았습니다.'},
    {id:'keep_backup',tag:'containment',text:'두 친구에게 언젠가 연인이 바뀔 수도 있다고 여지를 남긴다',preview:'순애 뒤에 예비 선택지를 숨긴다',stability:-13,obsession:13,result:'아무도 떠나지는 않았지만 친구라는 말은 대기 순번처럼 변했고 선택한 연인도 열쇠를 믿지 못했습니다.'},
    {id:'close_door',tag:'fracture',text:'연인을 제외한 두 사람에게 이제 찾아오지 말라고 한다',preview:'순애를 고립으로 증명한다',stability:-18,trust:-8,result:'문은 조용해졌지만 공격에 맞서 함께 만든 신뢰도 문밖에 남았습니다. 연애는 이어져도 악우 동맹은 끝났습니다.'}
   ]
  }
 ];
}
function chaptersFor(life){
 const path=root.QT_ROMANCE_ROUTES&&root.QT_ROMANCE_ROUTES.path(life,'dangerous');
 const state=life&&life.dangerousTrio;
 if(path&&path.path==='pure'&&state&&state.storyMode==='interwoven'){
  return[...CHAPTERS.slice(0,5),pureChapters(life)[2]];
 }
 return path&&path.path==='pure'?pureChapters(life):CHAPTERS;
}
const AFTERMATH=[
 {
  id:'replaced_frames',title:'공동생활 1개월 · 너무 좁은 첫 아침',icon:'☀️',scene:'./assets/event-trio-meeting-5.png',
  desc:'자취방의 첫 아침, 네 사람 몫의 컵과 옷과 충전기가 작은 탁자 하나를 점령했습니다. 더 좋은 집을 준비하겠다는 채린과 이 방에서 약속부터 지키자는 유진, 이미 자기 물건을 전부 들인 세라가 동시에 입을 엽니다.',
  speakers:[
   {name:'윤세라',line:'좁으면 더 잘 보이잖아요. 누가 언제 나가는지도, 언제 돌아오는지도.'},
   {name:'강유진',line:'그래서 더 규칙이 필요해요. 쉬는 사람한테 보고서를 읽어 주는 건 금지예요.'},
   {name:'한채린',line:'내가 집을 사 주겠다는 것도 싫다니 취향 한번 고약하네. 그래도 네가 거절한 건 네 결정으로 기록해 둘게.'}
  ],
  choices:[
   {id:'restore',text:'돈 대신 네 사람 몫의 생활 규칙부터 같이 적는다',result:'채린은 돈으로 해결하지 못하는 일이 가장 비효율적이라 투덜댔지만 끝까지 자리에 남았습니다. 네 사람 모두의 거절권이 첫 줄에 적혔습니다.',stability:8,obsession:-5},
   {id:'sera_wall',text:'오늘 하루만큼은 아무도 밖에 나가지 말자고 한다',result:'세라는 만족했고 유진과 채린도 휴대전화를 뒤집어 두었습니다. 편안한 휴식이었지만 세라는 이것을 새 규칙으로 기억했습니다.',stability:3,obsession:5},
   {id:'office',text:'유진은 외부 법률 대응, 세라는 세력 정보만 맡는다고 다시 확인한다',result:'유진은 세력 명단 대신 비상연락망에 이름을 올렸고, 세라는 정보 담당으로 정식 보고를 시작했습니다. 채린의 송금은 다시 반환됐습니다.',stability:5,faction:6}
  ]
 },
 {
  id:'faction_table',title:'공동생활 2개월 · 소파 위의 역할 회의',icon:'🦂',scene:'./assets/event-trio-meeting-6.png',
  desc:'늦은 밤, 세력 보고가 텔레비전 화면을 대신합니다. 유진은 경찰 신분으로 조직에 들어갈 수 없다고 선을 긋고, 채린은 지원금 계약서를 내밀며, 세라는 이미 세력원의 귀가 습관을 표로 정리해 왔습니다.',
  speakers:[
   {name:'강유진',line:'세력을 키우는 건 상관없어요. 증거와 절차를 지키면 내가 방패가 될게요.'},
   {name:'한채린',line:'작은 조직 흉내는 그만둬. 내가 돈을 대면 적어도 무너지진 않아. 거절할 거면 눈 보고 말해.'},
   {name:'윤세라',line:'배신할 사람은 표정만 봐도 알아요. 가까이서 계속 보면 더 잘 알 수 있고.'}
  ],
  choices:[
   {id:'roles',text:'유진의 법적 방어는 받되 채린의 자금은 다시 정중히 거절한다',result:'유진은 조직 밖의 비상 연락처로 남았고 채린은 거절 확인서를 받아 갔습니다. 세라만 세력 정보원 자리에 앉았습니다.',stability:9,faction:10},
   {id:'competition',text:'세 사람 중 가장 도움이 큰 사람에게 내 일정을 맡긴다',result:'지원 경쟁이 다시 시작됐고 당신의 일정은 세 사람의 전리품처럼 취급되기 시작했습니다.',stability:-4,obsession:8,faction:8},
   {id:'separate',text:'연애와 세력 업무를 분리하고 오늘은 텔레비전만 켠다',result:'유진은 안도했고 채린은 비효율적이라 평했으며 세라는 리모컨을 당신 손에 쥐여 주고 옆에 붙어 앉았습니다.',stability:2,obsession:-3}
  ]
 },
 {
  id:'closed_world',title:'공동생활 3개월 · 늦은 귀가',icon:'🌙',scene:'./assets/event-trio-meeting-7.png',
  desc:'늦은 귀가 한 번으로 세 사람의 규칙이 충돌했습니다. 유진은 신고 시각을, 채린은 경호차량을, 세라는 귀가하지 않는 선택 자체를 문제 삼습니다.',
  speakers:[
   {name:'강유진',line:'연락이 늦은 건 화낼 일이 아니라 확인할 일이에요. 그 뒤에는 기다려야 해요.'},
   {name:'한채린',line:'차와 사람을 붙였으면 이런 낭비는 없었어. 자유도 관리할 능력이 있을 때 자유지.'},
   {name:'윤세라',line:'기다리게 하지 않으면 아무도 화낼 필요가 없잖아요. 그냥 항상 같이 가요.'}
  ],
  choices:[
   {id:'deadline',text:'연락이 없어도 정해진 시각까지는 누구도 추적하지 않는다',result:'세 사람 모두 불만이었지만 처음으로 기다림에 명확한 끝과 시작이 생겼습니다.',stability:10,obsession:-6},
   {id:'escort',text:'외출할 때 세 사람 중 한 명과 반드시 동행한다',result:'혼자일 시간은 줄었지만 세 사람의 경쟁은 당번표 안에서만 움직이기 시작했습니다.',stability:6,obsession:7},
   {id:'vanish',text:'규칙을 시험하려 하루 동안 일부러 연락을 끊는다',result:'도시는 다시 세 구역으로 나뉘었습니다. 구조 경쟁은 끝났지만 포위망은 더 촘촘해졌습니다.',stability:-12,obsession:12}
  ]
 },
 {
  id:'quiet_sickday',title:'공동생활 4개월 · 아무것도 보고하지 않은 병실',icon:'🫖',scene:'./assets/event-trio-meeting-5.png',
  desc:'가벼운 몸살로 하루 종일 누운 날, 유진은 체온을 기록하려 했고 채린은 전담 의료진을 부르려 했으며 세라는 침대 옆에서 한 발도 움직이지 않으려 했습니다. 그러나 당신이 오늘은 관리보다 조용한 곁이 필요하다고 말하자 세 사람은 처음으로 아무 일도 해결하지 않고 같은 방에 남습니다.',
  speakers:[
   {name:'강유진',line:'수치가 필요 없는 상태도 있네요. 아프다고 말했고, 우리가 들었으니까 그걸로 충분한 날.'},
   {name:'한채린',line:'돈을 안 쓰고 해결하는 건 여전히 답답해. 그래도 네가 잠들 때까지 앉아 있는 건 할 수 있어.'},
   {name:'윤세라',line:'깨어날 때 제가 보이면 되는 거죠? 안 깨워도, 계속 확인하지 않아도.'}
  ],
  choices:[
   {id:'stay_quiet',text:'세 사람 손을 한 번씩 잡고 그냥 곁에 있어 달라고 한다',result:'유진은 기록지를 접었고 채린은 전화를 끊었으며 세라는 당신의 호흡을 세는 대신 눈을 감았습니다. 감시는 그날 처음으로 아무 대가 없는 돌봄이 됐습니다.',stability:10,obsession:-6},
   {id:'rotate_care',text:'각자 한 시간씩 간병 당번을 정한다',result:'효율적인 표가 생겼지만 세 사람은 자기 시간이 끝나도 방문 밖을 떠나지 않았습니다. 규칙보다 남고 싶은 마음이 먼저 드러났습니다.',stability:7,obsession:-2},
   {id:'test_devotion',text:'누가 가장 오래 버티는지 보겠다고 한다',result:'휴식은 다시 경쟁이 됐습니다. 세 사람은 밤을 새웠고 당신도 누구 하나를 돌려보내지 못했습니다.',stability:-8,obsession:9}
  ]
 },
 {
  id:'separate_returns',title:'공동생활 5개월 · 각자 돌아온 밤',icon:'🏠',scene:'./assets/event-trio-meeting-7.png',
  desc:'유진은 야간근무, 채린은 이사회, 세라는 정보 수집을 마치고 서로 다른 시간에 자취방으로 돌아옵니다. 누구도 당신을 따라간 날이 아니고, 누구의 지시로 모인 밤도 아닙니다. 좁은 현관에 신발 네 켤레가 놓이자 공동생활이 감시 계획이 아니라 각자 돌아오기로 고른 일상이었음이 드러납니다.',
  speakers:[
   {name:'강유진',line:'오늘은 당신이 어디 있었는지 몰라요. 그래도 내가 돌아왔을 때 여기 있을 거라고 생각했어요.'},
   {name:'한채린',line:'이 좁은 방에 내 발로 다시 올 이유를 아직 가격으로 설명 못 하겠네. 그래서 그냥 왔어.'},
   {name:'윤세라',line:'세 사람 다 밖에 있었는데도 아무도 사라지지 않았네요. 이런 날이 계속되면… 열쇠를 확인하지 않아도 될 것 같아요.'}
  ],
  choices:[
   {id:'welcome_home',text:'한 사람씩 이름을 부르며 돌아와서 다행이라고 말한다',result:'누가 먼저인지 따지지 않는 인사가 네 번 오갔습니다. 세 사람은 서로를 좋아한다고 인정하지 않았지만, 상대가 돌아오지 않는 집은 이제 원하지 않았습니다.',stability:12,obsession:-8},
   {id:'shared_meal',text:'늦은 저녁을 다시 데우고 각자의 하루를 듣는다',result:'수사와 계약과 위치 기록이 아닌 사소한 이야기가 식탁을 채웠습니다. 네 사람은 처음으로 사건이 없어도 같은 장면에 남았습니다.',stability:10,obsession:-5},
   {id:'attendance_check',text:'앞으로도 귀가 여부만큼은 반드시 보고하라고 한다',result:'세 사람은 익숙하게 동의했지만, 편안했던 밤은 다시 확인 절차가 됐습니다. 함께 있고 싶은 마음과 사라짐을 막는 규칙이 아직 완전히 분리되지는 않았습니다.',stability:3,obsession:5}
  ]
 }
];

function ensure(life){
 if(!life.dangerousTrio||typeof life.dangerousTrio!=='object')life.dangerousTrio={version:VERSION,active:false,queued:false,encountered:false,stage:0,stability:50,axes:{balance:0,containment:0,fracture:0},history:[],ending:null};
 const s=life.dangerousTrio;
 if(!s.axes)s.axes={balance:0,containment:0,fracture:0};
 if(!Array.isArray(s.history))s.history=[];
 if(!s.playerArc||typeof s.playerArc!=='object')s.playerArc={axes:{face:0,delegate:0,control:0,enclose:0,avoid:0,deflect:0},history:[]};
 const playerAxes=s.playerArc.axes||(s.playerArc.axes={});
 ['face','delegate','control','enclose','avoid','deflect'].forEach(key=>{if(!Number.isFinite(playerAxes[key]))playerAxes[key]=0;});
 if(!Array.isArray(s.playerArc.history))s.playerArc.history=[];
 const previousVersion=Number(s.version)||0;
 if(previousVersion<2){
  // 4장 구버전 진행 중 저장은 공조 1장까지만 보존하고 새 인물별 양보 장부터 잇는다.
  if(s.active&&!s.ending&&(s.stage||0)>=1){
   s.history=s.history.filter(item=>(item.stage||0)===0);
   s.axes={balance:0,containment:0,fracture:0};
   s.history.forEach(item=>{if(item.tag)s.axes[item.tag]=(s.axes[item.tag]||0)+1;});
   const first=s.history[0]&&CHAPTERS[0].choices.find(choice=>choice.id===s.history[0].choice);
   s.stability=clamp(50+(first&&first.stability||0),0,100);
   s.stage=1;
  }
  if(Number.isFinite(s.preludeStage))s.preludeStage=Math.min(s.preludeStage,PRELUDES.length);
 }
 if(!s.individualRoutes||typeof s.individualRoutes!=='object')s.individualRoutes={};
 if(!s.personalConcessions||typeof s.personalConcessions!=='object')s.personalConcessions={};
 if(!s.storyMode&&(s.active||s.encountered)){
  const path=root.QT_ROMANCE_ROUTES&&root.QT_ROMANCE_ROUTES.path(life,'dangerous');
  s.storyMode=path&&path.path==='pure'?'pure':'interwoven';
 }
 s.version=VERSION;
 if(!Number.isFinite(s.preludeStage))s.preludeStage=0;
 if(!Array.isArray(s.preludeHistory))s.preludeHistory=[];
 if(s.active||s.encountered||s.ending){
  s.preludeStage=PRELUDES.length;
  s.badFriendsFormed=true;
 }
 return s;
}
function recordPlayerChoice(life,source,trait,title){
 const state=ensure(life),arc=state.playerArc,mode=PLAYER_ARC_MODES[trait]||null;
 if(!mode)return null;
 arc.axes[mode]=(arc.axes[mode]||0)+1;
 const reflection=PLAYER_ARC_COPY[mode];
 arc.history.push({source:source||'unknown',trait,mode,title:title||null,day:life.day||0});
 arc.last={...reflection,mode,source:source||'unknown'};
 return arc.last;
}
function playerArcSummary(life){
 const arc=ensure(life).playerArc,entries=Object.entries(arc.axes||{}).sort((a,b)=>b[1]-a[1]);
 const [mode,count]=entries[0]||['opening',0],copy=count>0?PLAYER_ARC_COPY[mode]:PLAYER_ARC_COPY.opening;
 return{...copy,mode,count,axes:{...arc.axes},historyCount:arc.history.length};
}
const PRELUDE_AFFECTION=45;
const FIRST_PRELUDE_AFFECTION=20;
const FOCUS_CHAPTERS={'강유진':2,'한채린':2,'윤세라':2};
function storyState(person){
 const stories=root.QT_CHARACTER_STORIES;
 return person&&stories?stories.ensure(person):person&&person.story||null;
}
function awakeningReady(life,name){
 const person=rec(life,name),state=storyState(person);
 if(!person)return false;
 if((state&&state.chapter||0)>0)return true;
 if(name==='강유진')return !!(person.yujinRescueCompulsionAwakened||life.yujinInvestigationSeen||person.officialContact||person.dangerEvents&&person.dangerEvents.yujin_embrace==='seen');
 if(name==='한채린')return !!(person.chaerinSubmissionAwakened||person.dangerEvents&&person.dangerEvents.chaerin_warning==='seen');
 return !!(person.seraObsessionAwakened||person.pickedUpAfterRuin||['temporary','cohabit','separate','reject'].includes(life.seraHousing)||person.dangerEvents&&person.dangerEvents.sera_warning==='seen');
}
function focusReady(life,name){
 const state=storyState(rec(life,name));
 return !!(state&&(state.completed||(state.chapter||0)>=(FOCUS_CHAPTERS[name]||1)));
}
function directionFixed(life,name){
 const person=rec(life,name),stories=root.QT_CHARACTER_STORIES;
 if(!person||!stories)return false;
 if(person.story&&person.story.ending)return true;
 const state=stories.ensure(person),start=stories.relationshipStartIndex(name);
 return !!((state.completed&&state.ending)||(['pure','group','platonic'].includes(state.romancePath)&&(state.chapter||0)>=start));
}
function preludeEligibility(life){
 const state=ensure(life),people=NAMES.map(name=>rec(life,name));
 const allKnown=people.every(person=>person&&!['ex','deceased','parted'].includes(person.status));
 const affections=people.map(person=>person?person.affection||0:0);
 const allHighAffection=people.every(person=>person&&(person.affection||0)>=PRELUDE_AFFECTION);
 const firstAffectionReady=people.every(person=>person&&(person.affection||0)>=FIRST_PRELUDE_AFFECTION);
 const allAwakened=NAMES.every(name=>awakeningReady(life,name));
 const firstPersonalStep=NAMES.every(name=>{const personal=storyState(rec(life,name));return personal&&(personal.chapter||0)>=1;});
 const stageReady=state.preludeStage===0
  ?firstAffectionReady&&allAwakened
  :allHighAffection&&firstPersonalStep;
 const sera=rec(life,'윤세라'),legacyHome=life.seraHousing==null&&sera&&sera.pickedUpAfterRuin;
 const seraHome=(life.seraHousing==='cohabit'||legacyHome)&&!state.lockedOut;
 const faction=life.faction||{},subordinateReady=(faction.level||0)>0&&Array.isArray(faction.members)&&faction.members.length>0;
 const caseLinked=!!life.yujinInvestigationSeen||!!(rec(life,'강유진')||{}).officialContact;
 const guard=root.QT_ROMANCE_ROUTES&&root.QT_ROMANCE_ROUTES.canStart(life,'dangerous');
 return{ok:(!guard||guard.ok)&&!state.active&&!state.encountered&&!state.ending&&!state.badFriendsFormed&&allKnown&&stageReady&&subordinateReady&&caseLinked,allKnown,allHighAffection,firstAffectionReady,allAwakened,firstPersonalStep,stageReady,minAffection:Math.min(...affections),seraHome,subordinateReady,caseLinked,guard};
}
function nextPrelude(life){
 const state=ensure(life);
 return !state.badFriendsFormed?PRELUDES[state.preludeStage]||null:null;
}
function queuePrelude(life,day){
 const state=ensure(life),event=nextPrelude(life);
 if(!event||!preludeEligibility(life).ok||state.preludeQueued||state.lastPreludeDay===(day||0))return null;
 state.preludeQueued=true;
 return event;
}
function deferPrelude(life,day){
 const state=ensure(life);state.preludeQueued=false;state.lastPreludeDay=day||state.lastPreludeDay||0;return state;
}
function applyPrelude(life,choiceId){
 const state=ensure(life),event=nextPrelude(life);if(!event)return null;
 const choice=event.choices.find(item=>item.id===choiceId);if(!choice)return null;
 state.preludeQueued=false;
 state.stability=clamp((state.stability||50)+(choice.stability||0),0,100);
 state.preludeHistory.push({eventId:event.id,choiceId:choice.id});
 NAMES.forEach(name=>{
  const person=rec(life,name);if(!person)return;
  person.trust=clamp((person.trust||0)+(choice.trust||0),0,100);
  person.dangerousBadFriend=true;
 });
 state.preludeStage++;
 if(state.preludeStage>=PRELUDES.length){
  state.preludeStage=PRELUDES.length;
  state.badFriendsFormed=true;
  state.badFriendsDay=life.day||0;
 }
 return{event,choice,state,complete:state.badFriendsFormed};
}
function progress(life){
 const rows=NAMES.map(name=>{
  const r=rec(life,name),stories=root.QT_CHARACTER_STORIES;
  const legacyCompleted=!!(r&&r.story&&r.story.completed&&r.story.ending);
  const legacyEnding=legacyCompleted?r.story.ending:null;
  const state=legacyCompleted?r.story:r&&stories&&stories.ensure(r),story=r&&stories&&stories.get(r.name);
  const route=legacyEnding&&legacyEnding.route||state&&state.ending&&state.ending.route;
  const accepted=name==='강유진'?['dangerous_dependence','accomplice'].includes(route)
   :name==='한채린'?['private_submission','boardroom_pair'].includes(route)
   :name==='윤세라'?['shared_cage','anchored'].includes(route):false;
  const active=!!r&&!['ex','deceased'].includes(r.status);
  const chapter=state?state.chapter:0,total=story?story.chapters.length:0;
  const completed=legacyCompleted||!!(state&&state.completed),ending=legacyEnding||state&&state.ending;
   const lesson=(PERSONAL_ARC_LESSONS[name]||{})[route]||null;
   const awakened=awakeningReady(life,name),focused=focusReady(life,name),direction=directionFixed(life,name);
   const startNeed=!r?'아직 만나지 못함':!awakened?'서로에게 숨기던 결핍이 아직 드러나지 않음':focused?'세 사람이 있는 자리에서도 물러서지 않음':'둘만 있을 때조차 꺼내지 못한 말이 남아 있음';
   return{name,met:!!r,active,chapter,total,route,accepted,lesson,awakened,focusReady:focused,directionFixed:direction,startNeed,resolved:!!r&&(!active||completed),ready:!!r&&(!active||completed),
   need:!r?'아직 만나지 못함':!active?`현재 관계: ${r.status||'지인'} · 개인 인연 종료`:!state||!completed?`${name}에게 아직 끝내지 못한 이야기가 있음`:`${ending&&ending.title||'서로의 대답을 확인함'}`};
 });
 return rows;
}
function relationshipNames(life){
 const names=[];const add=name=>{if(name&&!names.includes(name))names.push(name);};
 if(life.partner)add(life.partner.name);
 ((life.relationshipGroup&&life.relationshipGroup.members)||[]).forEach(person=>add(typeof person==='string'?person:person.name));
 ((life.polycule&&life.polycule.members)||[]).forEach(person=>add(typeof person==='string'?person:person.name));
 return names;
}
function storyComplete(life){return !!ensure(life).ending;}
function resolveUnavailable(life){
 const state=ensure(life),rows=progress(life);
 if(state.ending||!rows.every(row=>row.resolved)||!rows.some(row=>!row.active))return false;
 state.active=false;state.queued=false;state.encountered=true;
 state.ending={id:'members_parted',title:'같은 방에 모이지 않은 세 사람',tone:'neutral',scene:'./assets/event-trio-647.png',text:'각자의 개인 이야기는 끝났지만 한 사람 이상이 인연을 끊었습니다. 남은 사람들은 친구와 악우로 각자의 자리에서 살고, 공동생활 고백은 오지 않습니다.'};
 if(root.QT_ROMANCE_ROUTES)root.QT_ROMANCE_ROUTES.complete(life,'dangerous',state.ending.id,'good');
 return true;
}
function confessionReady(life){
 const state=ensure(life),routes=root.QT_ROMANCE_ROUTES;
 const names=relationshipNames(life),relationshipOpen=names.length===0||names.every(name=>NAMES.includes(name));
 const individualComplete=progress(life).every(row=>row.ready);
 return !!(individualComplete&&relationshipOpen&&state.ending&&state.ending.tone==='good'&&(!routes||routes.romanceAvailable(life,'dangerous')));
}
function eligibility(life){
 const state=ensure(life),rows=progress(life),relationshipNamesNow=relationshipNames(life);
 const partner=relationshipNamesNow.some(name=>NAMES.includes(name));
 const relationshipOpen=relationshipNamesNow.length===0||relationshipNamesNow.every(name=>NAMES.includes(name));
 const poly=life.polycule||{},outsiders=(poly.members||[]).filter(person=>!NAMES.includes(person.name));
 const clean=!outsiders.length;
 const sera=rec(life,'윤세라');
 const legacyHome=life.seraHousing==null&&sera&&sera.pickedUpAfterRuin;
 const seraHome=(life.seraHousing==='cohabit'||legacyHome)&&!state.lockedOut;
 const allAwakened=NAMES.every(name=>awakeningReady(life,name));
 const guard=root.QT_ROMANCE_ROUTES&&root.QT_ROMANCE_ROUTES.canStart(life,'dangerous');
 return{ok:!!((!guard||guard.ok)&&!state.encountered&&!state.active&&!state.ending&&state.badFriendsFormed&&relationshipOpen&&clean&&seraHome&&allAwakened),partner,relationshipOpen,clean,seraHome,allAwakened,individualDirectionFixed:NAMES.every(name=>directionFixed(life,name)),badFriendsFormed:!!state.badFriendsFormed,outsiders,rows,guard};
}
function queue(life){
 const check=eligibility(life),state=ensure(life);
 if(!check.ok||state.queued)return false;
 state.queued=true;
 return true;
}
function cancelQueue(life){
 const state=ensure(life);
 state.queued=false;
 return state;
}
function start(life){
 const check=eligibility(life);if(!check.ok)return{ok:false,check};
 if(root.QT_ROMANCE_ROUTES&&!root.QT_ROMANCE_ROUTES.begin(life,'dangerous').ok)return{ok:false,check:eligibility(life)};
 const routePath=root.QT_ROMANCE_ROUTES&&root.QT_ROMANCE_ROUTES.path(life,'dangerous');
 const state=ensure(life),rows=progress(life);state.active=true;state.queued=false;state.encountered=true;state.friendRoute=!!(routePath&&routePath.path==='pure');state.storyMode=state.friendRoute?'pure':'interwoven';state.stage=Math.max(0,state.stage||0);state.stability=Math.max(50,state.stability||0);state.ending=null;
 state.individualRoutes=Object.fromEntries(rows.map(row=>[row.name,row.route||null]));
 state.personalConcessions={};
 NAMES.forEach(name=>{const r=rec(life,name);if(r)r.trust=clamp((r.trust||0)+4,0,100);});
 return{ok:true,state,chapter:chaptersFor(life)[state.stage]};
}
function eventDay(life,day){
 if(day!=null&&Number.isFinite(Number(day)))return Number(day);
 if(life&&life.day!=null&&Number.isFinite(Number(life.day)))return Number(life.day);
 return null;
}
function waiting(life,day){
 const state=ensure(life);
 if(!state.active||state.ending)return null;
 const rows=progress(life),today=eventDay(life,day);
 if(Number.isFinite(state.lastResolvedChapterDay)&&Number.isFinite(today)&&today<=state.lastResolvedChapterDay+1){
  return{kind:'cooldown',title:'지난 대화가 가라앉는 중',text:'세 사람은 각자의 생활로 돌아가 지난 선택을 곱씹고 있습니다. 다음 달이 되면 새로운 이야기가 이어집니다.'};
 }
 if(state.storyMode==='pure'){
  if(state.stage===1&&!rows.every(row=>row.directionFixed))return{kind:'direction',title:'각자의 대답을 기다리는 중',text:'세 사람의 개인 이야기에서 관계에 붙일 이름을 먼저 확인해야 합니다.'};
  if(state.stage>=2&&!rows.every(row=>row.ready))return{kind:'completion',title:'끝내지 못한 개인 이야기',text:'세 사람 모두 자기 이야기를 마무리해야 동맹의 마지막 약속을 정할 수 있습니다.'};
 }else{
  if(state.stage===1&&!focusReady(life,'강유진'))return{kind:'personal',name:'강유진',title:'강유진의 병원 이야기를 기다리는 중',text:'유진은 병원과 끝난 사건 사이에서 아직 자기 마음을 말하지 못했습니다. 유진의 개인 이야기를 조금 더 이어가세요.'};
  if(state.stage===2&&!focusReady(life,'한채린'))return{kind:'personal',name:'한채린',title:'한채린의 사교모임 이야기를 기다리는 중',text:'채린은 도발 없이 부탁하는 법을 아직 꺼내지 못했습니다. 채린의 개인 이야기를 조금 더 이어가세요.'};
  if(state.stage===3&&!focusReady(life,'윤세라'))return{kind:'personal',name:'윤세라',title:'윤세라의 집 이야기를 기다리는 중',text:'세라는 열린 문 앞에서 기다리는 법을 아직 보여 주지 못했습니다. 세라의 개인 이야기를 조금 더 이어가세요.'};
  if(state.stage===4&&!rows.every(row=>row.directionFixed))return{kind:'direction',title:'각자의 대답을 기다리는 중',text:'세 사람의 개인 이야기에서 관계에 붙일 이름을 먼저 확인해야 합니다.'};
  if(state.stage>=5&&!rows.every(row=>row.ready))return{kind:'completion',title:'끝내지 못한 개인 이야기',text:'공동생활을 정하기 전에 세 사람 모두 자기 이야기를 마무리해야 합니다.'};
 }
 return null;
}
function next(life,day){
 const state=ensure(life);
 if(!state.active||state.ending||waiting(life,day))return null;
 return chaptersFor(life)[state.stage]||null;
}
function continuity(life,chapter){
 const state=ensure(life),last=state.history&&state.history[state.history.length-1];
 if(!last)return chapter&&chapter.bridge?{previous:null,next:chapter.bridge,tag:'opening'}:null;
 const prior=chaptersFor(life)[last.stage],choice=prior&&prior.choices.find(item=>item.id===last.choice);
 return{
  previous:choice?choice.result:null,
  next:chapter&&chapter.bridge||null,
  tag:last.tag||'balance'
 };
}
function endingFor(state,finalChoice,life){
 const path=root.QT_ROMANCE_ROUTES&&root.QT_ROMANCE_ROUTES.path(life,'dangerous');
 if(path&&path.path==='pure'){
  if(finalChoice&&finalChoice.id==='pure_alliance')return{id:'pure_alliance',title:`${path.name}과의 순애, 세 사람과의 악우 동맹`,tone:'good',scene:'./assets/event-trio-meeting-5.png',text:`${path.name}과는 둘만의 연애를 이어가고, 나머지 두 사람과는 감정을 숨기지 않은 친구로 남았습니다. 사랑과 협력을 같은 서열로 만들지 않았기에 세 사람은 공격 앞에서 다시 모일 수 있습니다.`};
  if(finalChoice&&finalChoice.id==='close_door')return{id:'pure_isolation',title:`${path.name}과 닫은 문`,tone:'neutral',scene:'./assets/event-trio-meeting-5.png',text:`${path.name}과의 연애는 지켰지만 다른 두 사람과 만든 악우 동맹은 끝났습니다. 이별은 없었으나 둘만의 안전을 택한 만큼 세력전에서 빌릴 수 있는 손도 줄었습니다.`};
  return{id:'pure_unsettled',title:'순애 뒤에 남겨 둔 대기표',tone:'neutral',scene:'./assets/event-trio-meeting-5.png',text:`${path.name}과의 연애는 이어지지만 다른 두 사람에게 남긴 여지가 관계를 계속 흔듭니다. 누구도 이별하지 않았으나 친구와 예비 연인의 경계는 아직 정리되지 않았습니다.`};
 }
 const a=state.axes||{};
 const concessions=state.personalConcessions||{};
 const formed=finalChoice&&finalChoice.id==='badfriends'
   &&state.stability>=55
   &&(a.balance||0)>=(a.fracture||0)
   &&NAMES.every(name=>!!concessions[name]);
 if(!formed){
  const fracture=finalChoice&&finalChoice.tag==='fracture'||(a.fracture||0)>(a.balance||0);
  return{id:'shared_home_failed',title:fracture?'한 사람을 고르려 한 밤':'합의가 사라진 방',tone:'bad',scene:'./assets/event-trio-bed-ending.png',
   text:fracture
    ?'공동생활을 시작하기도 전에 한 사람만 고르겠다는 말이 세 사람의 마지막 규칙을 깨뜨렸습니다. 눈을 뜬 방에는 누가 이겼는지 알려 주는 이름조차 없고, 세 겹의 잠금장치만 남았습니다.'
    :'열쇠와 계좌와 일정을 전부 넘기는 순간 공동생활은 합의가 아니라 세 겹의 감금이 됐습니다. 세 사람은 서로를 믿지 못해 교대로 문을 지켰고, 당신에게는 다시 선택할 시간이 남지 않았습니다.'};
 }
 return{id:'bad_friends',title:'네 번째 열쇠를 두고 간 밤',tone:'good',scene:'./assets/event-trio-meeting-5.png',text:'세 사람은 각자의 권한과 거절선을 인정하는 악우가 됐습니다. 누구도 관계를 기정사실로 만들지 않고, 좁은 자취방에 네 번째 열쇠만 두고 돌아갔습니다. 이제 먼저 대답을 요구할 사람은 세 사람 쪽입니다.'};
}
function apply(life,choiceId,day){
 const state=ensure(life),chapter=next(life,day);if(!chapter)return null;const choice=chapter.choices.find(c=>c.id===choiceId);if(!choice)return null;
 state.stability=clamp((state.stability||0)+(choice.stability||0),0,100);state.axes[choice.tag]=(state.axes[choice.tag]||0)+1;state.history.push({stage:state.stage,choice:choice.id,tag:choice.tag,focus:chapter.focus||null});
 recordPlayerChoice(life,'dangerous-group',choice.tag,chapter.title);
 NAMES.forEach(name=>{const r=rec(life,name);if(!r)return;r.trust=clamp((r.trust||0)+(choice.trust||0),0,100);r.affection=clamp((r.affection||0)+(choice.tag==='fracture'?-2:3),0,100);if(choice.obsession){const key=name==='윤세라'?'obsession':'dangerLevel';r[key]=clamp((r[key]||0)+choice.obsession,0,100);}});
 if(chapter.focus)state.personalConcessions[chapter.focus]={choice:choice.id,tag:choice.tag,route:personalCarry(life,chapter.focus).route};
 const today=eventDay(life,day);state.lastResolvedChapterDay=Number.isFinite(today)?today:null;
 state.stage++;if(state.stage>=chaptersFor(life).length){state.ending=endingFor(state,choice,life);state.active=false;if(root.QT_ROMANCE_ROUTES)root.QT_ROMANCE_ROUTES.complete(life,'dangerous',state.ending.id,state.ending.tone);}
 return{chapter,choice,state,ending:state.ending};
}
function monthly(life){
 const state=ensure(life);if(!state.active)return null;
 state.stability=clamp(state.stability+((state.axes.balance||0)>=(state.axes.fracture||0)?2:-4),0,100);
 return state.stability<=15?'세 사람의 신경전이 위험합니다. 누구도 먼저 물러설 생각이 없어 보입니다.':null;
}
function nextAftermath(life){
 const state=ensure(life);if(!state.ending)return null;
 if(state.ending.tone!=='good'||!(life.dangerousTrioBond&&life.dangerousTrioBond.active))return null;
 if(!Number.isFinite(state.aftermathIndex))state.aftermathIndex=0;
 if(state.aftermathIndex>=AFTERMATH.length)return null;
 return AFTERMATH[state.aftermathIndex];
}
function applyAftermath(life,choiceId){
 const state=ensure(life),event=nextAftermath(life);if(!event)return null;
 const choice=event.choices.find(item=>item.id===choiceId);if(!choice)return null;
 state.stability=clamp((state.stability||0)+(choice.stability||0),0,100);
 NAMES.forEach(name=>{const r=rec(life,name);if(!r)return;r.trust=clamp((r.trust||0)+Math.sign(choice.stability||0)*2,0,100);if(choice.obsession){const key=name==='윤세라'?'obsession':'dangerLevel';r[key]=clamp((r[key]||0)+choice.obsession,0,100);}});
 state.aftermathIndex++;
 return{event,choice,state};
}
function compatibleCandidate(){return false;}

root.QT_DANGEROUS_TRIO={VERSION,NAMES,ROMANCE_ENDINGS,romanceEnding,PRELUDES,CHAPTERS,pureChapters,chaptersFor,AFTERMATH,PERSONAL_ARC_LESSONS,PLAYER_ARC_MODES,PLAYER_ARC_COPY,personalCarry,continuity,recordPlayerChoice,playerArcSummary,ensure,awakeningReady,focusReady,directionFixed,preludeEligibility,nextPrelude,queuePrelude,deferPrelude,applyPrelude,progress,storyComplete,resolveUnavailable,confessionReady,eligibility,queue,cancelQueue,start,waiting,next,apply,monthly,nextAftermath,applyAftermath,compatibleCandidate};
})(window);
