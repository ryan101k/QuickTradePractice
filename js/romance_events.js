/* QuickTrade Life — 성격별 연애 대화·관계 이벤트 */
(function(root){'use strict';
const VOICES={
 frugal:{good:['“비싼 곳보다 이렇게 편하게 이야기하는 게 더 좋아요.”','“우리 소비 습관이 비슷해서 마음이 놓여요.”','“작은 약속도 지켜주는 사람이 좋더라고요.”'],mid:['“좋은 사람 같긴 한데, 조금 더 천천히 알아가고 싶어요.”','“다음에는 돈 많이 안 드는 곳에서 봐요.”'],bad:['“계획 없이 쓰는 모습은 솔직히 조금 불안했어요.”','“말보다 꾸준한 행동을 보고 싶어요.”']},
 ambitious:{good:['“서로 목표를 응원해주는 관계라면 오래 갈 것 같아요.”','“당신과 이야기하면 나도 더 열심히 살고 싶어져요.”','“다음에는 서로의 5년 계획도 이야기해봐요.”'],mid:['“호감은 있지만, 우리 속도가 같은지는 더 봐야겠어요.”','“요즘 일이 중요해서 자주 만나기는 어려울 수도 있어요.”'],bad:['“제 커리어를 가볍게 보는 말은 듣기 불편했어요.”','“서로 성장할 수 없는 관계는 원하지 않아요.”']},
 homebody:{good:['“같이 있어도 애써 말하지 않아도 편해서 좋았어요.”','“다음엔 집에서 영화 보면서 배달시켜 먹어요.”','“연락이 없어도 불안하지 않은 관계면 좋겠어요.”'],mid:['“사람 많은 곳은 조금 지쳤지만 대화는 좋았어요.”','“다음엔 좀 더 조용한 곳으로 가요.”'],bad:['“계속 밖으로만 돌자고 하면 저랑은 안 맞을 것 같아요.”','“혼자 있을 시간도 존중해줬으면 해요.”']},
 caring:{good:['“오늘 제 말을 기억해준 게 정말 고마웠어요.”','“힘든 이야기도 편하게 할 수 있을 것 같아요.”','“당신이 웃으니까 저도 기분이 좋아졌어요.”'],mid:['“조금 어색했지만 진심은 느껴졌어요.”','“다음에는 서로 이야기를 더 많이 들어줘요.”'],bad:['“제가 말할 때 자꾸 휴대폰을 보는 게 서운했어요.”','“다정함은 말보다 행동에서 보이는 것 같아요.”']},
 cold:{good:['“과하게 다가오지 않아서 오히려 편했어요.”','“생각보다 대화가 잘 통하네요. 다음에도 봐요.”','“서로의 경계를 지켜주는 점이 마음에 들었어요.”'],mid:['“나쁘진 않았어요. 판단은 조금 더 해볼게요.”','“연락이 느려도 오해하지 않았으면 좋겠어요.”'],bad:['“사적인 질문을 계속 받는 건 부담스러웠어요.”','“감정을 확인하려고 몰아붙이지 말아주세요.”']},
 lavish:{good:['“오늘 정말 특별했어요. 사진도 너무 잘 나왔어요.”','“가끔은 이렇게 기억에 남는 데이트가 필요하죠.”','“센스 있게 준비한 게 마음에 들었어요.”'],mid:['“즐겁긴 했는데 조금 평범하긴 했어요.”','“다음에는 제가 좋아하는 곳도 가봐요.”'],bad:['“계속 가격 이야기만 하니까 분위기가 깨졌어요.”','“취향을 존중하지 않는 느낌이라 아쉬웠어요.”']},
 free:{good:['“계획에 없던 일이 생겨서 더 재밌었어요!”','“당신이랑 있으면 새로운 일이 생길 것 같아요.”','“우리 다음 주말에 그냥 기차부터 타볼래요?”'],mid:['“재미는 있었는데 너무 진지해지진 말아요.”','“연락에 의미를 너무 많이 두지는 않았으면 해요.”'],bad:['“벌써부터 관계를 규정하려는 건 부담스러워요.”','“질투로 제 인간관계를 통제하지 말아주세요.”']},
};
const APPROACH_REACTIONS={sincere:'진솔한 대화',flex:'화려한 이벤트',push:'밀고 당기기',listen:'경청',humor:'유머',plan:'꼼꼼한 계획',vulnerable:'솔직한 고민 공유',direct:'분명한 호감 표현'};
const pick=a=>a[Math.floor(Math.random()*a.length)];
const CV=()=> (window.QT_VOICES||{}).CHARACTER_VOICES||{};

/* 인물의 목소리 묶음 — 이름으로 찾고, 없으면 성격 기반 기본 목소리로 떨어진다 */
function voiceOf(person){
  const name=typeof person==='string'?person:(person&&person.name);
  return CV()[name]||null;
}

/* 데이트 결과 대사.
 *   person   : 상대 객체(또는 성격 문자열 — 구버전 호출 호환)
 *   opts     : { first: 첫 만남인가, affection: 지금까지 쌓인 호감도 }
 * 인물 전용 대사가 있으면 그걸 쓰고, 없으면 성격별 기본 대사를 쓴다. */
function dateLine(person,tier,approach,nameArg,opts){
  const o=opts||{};
  const cv=voiceOf(person);
  const name=(typeof person==='object'&&person&&person.name)||nameArg||'상대';
  const personality=(typeof person==='object'&&person&&person.personality)||person;
  const key=tier==='성공'?'good':tier==='보통'?'mid':'bad';
  let line;
  if(cv){
    // 첫 만남이면 인사부터, 사이가 깊고 잘 풀렸으면 속 얘기가 나온다
    if(o.first&&cv.first&&tier!=='실패') line=cv.first;
    else if(tier==='성공'&&(o.affection||0)>=60&&cv.deep&&Math.random()<0.6) line=pick(cv.deep);
    else line=pick(cv[key]||cv.mid||['...']);
  }else{
    const v=VOICES[personality]||VOICES.caring;
    line=pick(v[key]);
  }
  return `${name}: ${line} (${APPROACH_REACTIONS[approach]||'대화'}에 대한 반응)`;
}

/* 상황별 한 줄 — 고백 / 이별 / 근황 */
function momentLine(person,kind){
  const cv=voiceOf(person);
  if(!cv||!cv[kind]) return '';
  const v=cv[kind];
  return Array.isArray(v)?pick(v):v;
}

/* 프로필에 붙는 말투·사연 */
function profileOf(person){
  const cv=voiceOf(person);
  return cv?{style:cv.style,background:cv.background}:null;
}
const E=(id,title,desc,pers,options)=>({id:'rom_'+id,cat:'love',emoji:'💬',title,desc,cond:c=>c.rel!=='single'&&(!pers||pers.includes(c.pers)),options});
const ROMANCE_EVENTS=[
 E('money','데이트 비용 정산','연인이 앞으로 데이트 비용을 어떻게 나눌지 묻습니다.',['frugal','lavish'],[
  {text:'소득에 비례해 부담하자',effects:{affection:8},outcome:'현실적이고 공평한 기준을 함께 정했다.'},{text:'내가 전부 낼게',effects:{cash:-1500000,affection:4},outcome:'고마워했지만 계속 가능한 방식인지 걱정했다.'},{text:'무조건 반반이 공평해',effects:{affection:-5},outcome:'계산은 명확했지만 말투 때문에 분위기가 식었다.'}]),
 E('reply','답장이 늦은 밤','연인이 하루 종일 답장이 없었습니다.',['free','cold'],[
  {text:'바빴겠지 하고 기다린다',effects:{affection:7,happy:1},outcome:'늦은 밤 미안하다는 연락이 왔다.'},{text:'무슨 일인지 차분히 묻는다',effects:{affection:4},outcome:'서로 원하는 연락 빈도를 이야기했다.'},{text:'계속 전화한다',effects:{affection:-12,happy:-4},outcome:'연인은 감시받는 기분이라며 불편해했다.'}]),
 E('career','멀리 온 이직 제안','연인이 좋은 조건의 타지역 이직 제안을 받았습니다.',['ambitious'],[
  {text:'커리어를 응원한다',effects:{affection:14,happy:-3},outcome:'장거리 연애가 되더라도 함께 방법을 찾기로 했다.'},{text:'우리 관계도 함께 계획하자',effects:{affection:9},outcome:'현실적인 일정과 거주 계획을 세웠다.'},{text:'나를 두고 가지 말라고 한다',effects:{affection:-14,endRelationshipChance:.2},outcome:'연인은 자신의 꿈을 존중받지 못한다고 느꼈다.'}]),
 E('weekend','서로 다른 주말','나는 외출하고 싶지만 연인은 집에서 쉬고 싶어 합니다.',['homebody','free'],[
  {text:'오전엔 외출, 저녁엔 집',effects:{affection:9,happy:4},outcome:'둘 다 조금씩 원하는 주말을 보냈다.'},{text:'이번 주는 연인에게 맞춘다',effects:{affection:6,happy:-2},outcome:'연인은 배려를 고마워했다.'},{text:'각자 따로 보낸다',effects:{affection:2,happy:5},outcome:'각자의 시간을 보내고 편하게 다시 만났다.'}]),
 E('comfort','힘들었던 하루','연인이 직장에서 크게 지친 얼굴로 돌아왔습니다.',['caring','cold'],[
  {text:'해결책보다 먼저 들어준다',effects:{affection:12,happy:4},outcome:'연인은 판단하지 않고 들어줘서 고맙다고 했다.'},{text:'구체적인 해결책을 제안한다',effects:{affection:3},outcome:'도움은 됐지만 지금은 위로가 먼저였다고 했다.'},{text:'나도 힘들었다고 말을 돌린다',effects:{affection:-10,happy:-3},outcome:'연인은 더 말하지 않고 입을 닫았다.'}]),
 E('luxury','기념일 장소','연인이 유명한 고급 레스토랑을 가보고 싶어 합니다.',['lavish'],[
  {text:'이번만 특별하게 예약한다',effects:{cash:-2500000,affection:13,happy:7},outcome:'사진도 추억도 오래 남는 밤이 됐다.'},{text:'예산 안의 다른 특별한 곳을 찾는다',effects:{cash:-600000,affection:7},outcome:'가격보다 준비한 정성이 더 좋았다고 했다.'},{text:'허영이라며 비난한다',effects:{affection:-16},outcome:'취향 자체를 무시당했다고 느꼈다.'}]),
 E('savings','공동 저축 제안','연인이 장래를 위해 함께 저축 목표를 만들자고 합니다.',['frugal','ambitious'],[
  {text:'매달 자동이체를 약속한다',effects:{cash:-1000000,affection:12},outcome:'둘만의 미래 계좌를 시작했다.'},{text:'재정 상황부터 솔직히 공개한다',effects:{affection:10},outcome:'빚과 투자까지 숨김없이 이야기했다.'},{text:'돈 관리는 각자 하자고 선을 긋는다',effects:{affection:-4},outcome:'독립성은 지켰지만 장래 계획은 흐려졌다.'}]),
 E('friends','이성 친구 문제','연인의 오래된 이성 친구가 자주 연락합니다.',['free','caring'],[
  {text:'불편함을 비난 없이 말한다',effects:{affection:8},outcome:'서로 지킬 경계와 예의를 합의했다.'},{text:'친구를 직접 만나본다',effects:{affection:5,happy:2},outcome:'막연한 오해가 조금 풀렸다.'},{text:'연락처를 지우라고 요구한다',effects:{affection:-15,endRelationshipChance:.15},outcome:'통제받는다는 말과 함께 큰 다툼이 났다.'}]),
 E('family','가족 소개','연인이 이번 명절에 가족을 만나보겠냐고 묻습니다.',null,[
  {text:'긴장되지만 만나겠다',effects:{affection:14,cash:-500000},outcome:'작은 선물을 준비해 진지한 마음을 보였다.'},{text:'우리 관계를 조금 더 쌓은 뒤 만나자',effects:{affection:3},outcome:'이유를 솔직히 설명하자 이해해주었다.'},{text:'부담스럽다며 피한다',effects:{affection:-10},outcome:'연인은 관계의 미래가 불분명하다고 느꼈다.'}]),
 E('privacy','휴대폰 비밀번호','연인이 서로 휴대폰 비밀번호를 공유하자고 합니다.',['cold','free','caring'],[
  {text:'신뢰와 사생활은 별개라고 말한다',effects:{affection:7},outcome:'서로의 경계를 존중하기로 했다.'},{text:'기꺼이 공유한다',effects:{affection:4},outcome:'안심은 했지만 조금 어색한 규칙이 생겼다.'},{text:'몰래 연인의 휴대폰을 본다',effects:{affection:-18,endRelationshipChance:.25},outcome:'행동이 들켜 신뢰가 크게 무너졌다.'}]),
 E('burnout','데이트 번아웃','최근 너무 자주 만나 둘 다 지쳐 있습니다.',null,[
  {text:'일주일 각자 시간을 갖는다',effects:{affection:5,happy:8},outcome:'그리움과 여유를 되찾았다.'},{text:'짧고 편한 동네 데이트로 바꾼다',effects:{cash:-100000,affection:7,happy:5},outcome:'부담 없이 얼굴만 봐도 충분했다.'},{text:'마음이 식었다고 단정한다',effects:{affection:-12,happy:-8},outcome:'불필요한 불안이 큰 싸움으로 번졌다.'}]),
 E('future','결혼과 아이 이야기','연인이 조심스럽게 결혼과 가족 계획을 꺼냅니다.',null,[
  {text:'내 생각과 걱정을 솔직히 말한다',effects:{affection:12},outcome:'완전히 같진 않아도 중요한 기준을 확인했다.'},{text:'아직 모르지만 함께 고민하자',effects:{affection:6},outcome:'성급히 약속하지 않되 대화를 이어가기로 했다.'},{text:'농담으로 넘긴다',effects:{affection:-9},outcome:'연인은 진지한 이야기를 피한다고 느꼈다.'}]),
];
ROMANCE_EVENTS.push(
 E('chores','집안일 분담','함께 보내는 시간이 늘면서 설거지와 청소 문제로 작은 불만이 생겼습니다.',null,[{text:'잘하는 일을 기준으로 나눈다',effects:{affection:8},outcome:'역할을 구체적으로 정하니 다툴 일이 줄었다.'},{text:'이번에는 내가 더 맡는다',effects:{affection:5,happy:-2},outcome:'고마워했지만 지속 가능한 분담도 이야기했다.'},{text:'보이는 사람이 하면 된다고 한다',effects:{affection:-9},outcome:'결국 한 사람에게 일이 몰리기 시작했다.'}]),
 E('social','SNS 공개 여부','연인이 우리 사진을 SNS에 올려도 되는지 묻습니다.',null,[{text:'서로 동의한 사진만 올리자',effects:{affection:8},outcome:'공개 범위를 함께 정했다.'},{text:'기쁜 마음으로 공개한다',effects:{affection:5},outcome:'공식 커플이 된 기분을 즐겼다.'},{text:'절대 싫다고 화낸다',effects:{affection:-8},outcome:'거절보다 날카로운 태도에 상처받았다.'}]),
 E('debttruth','숨겨둔 빚','내 개인 대출 규모를 연인에게 말해야 할 순간이 왔습니다.',null,[{text:'금액과 상환계획을 모두 공개한다',effects:{affection:10,happy:-3},outcome:'놀랐지만 솔직함과 계획은 신뢰할 수 있다고 했다.'},{text:'일부만 말한다',effects:{affection:-3},outcome:'당장은 넘어갔지만 찜찜한 비밀이 남았다.'},{text:'끝까지 숨긴다',effects:{affection:-12,endRelationshipChance:.12},outcome:'우연히 명세서를 본다면 더 큰 문제가 될 것이다.'}]),
 E('loss','큰 투자 손실','주식 손실 때문에 예민해진 나를 연인이 걱정합니다.',null,[{text:'손실과 감정을 솔직히 공유한다',effects:{affection:9,happy:4},outcome:'돈 문제와 관계를 분리하는 방법을 함께 찾았다.'},{text:'혼자 정리할 시간을 부탁한다',effects:{affection:3,happy:2},outcome:'연인은 기다리되 필요하면 말해달라고 했다.'},{text:'연인 탓을 한다',effects:{affection:-18,happy:-5},outcome:'근거 없는 원망으로 깊은 상처를 남겼다.'}]),
 E('birthday','연인의 생일','연인의 생일이 다가왔지만 원하는 선물을 직접 묻기 애매합니다.',null,[{text:'평소 했던 말을 기억해 준비한다',effects:{cash:-800000,affection:14,happy:6},outcome:'자신의 말을 기억했다는 사실에 가장 감동했다.'},{text:'원하는 것을 직접 물어본다',effects:{cash:-500000,affection:8},outcome:'놀라움은 적어도 만족스러운 선물이 됐다.'},{text:'현금만 보낸다',effects:{cash:-300000,affection:-2},outcome:'실용적이지만 조금 성의 없다는 표정이었다.'}]),
 E('sick','아픈 연인','연인이 심한 감기에 걸려 약속을 취소했습니다.',null,[{text:'죽과 약을 문 앞에 두고 온다',effects:{cash:-150000,affection:13},outcome:'부담을 주지 않는 세심한 배려에 감동했다.'},{text:'영상통화로 상태를 확인한다',effects:{affection:7},outcome:'짧은 통화가 큰 위로가 됐다.'},{text:'약속 취소에 짜증낸다',effects:{affection:-15},outcome:'아플 때 본 태도는 오래 기억에 남았다.'}]),
 E('exboundary','전 연인의 흔적','연인의 집에서 전 연인과의 사진과 선물을 발견했습니다.',null,[{text:'정리할 준비가 됐는지 차분히 묻는다',effects:{affection:8},outcome:'과거와 현재를 솔직하게 이야기했다.'},{text:'신경 쓰이지만 시간을 준다',effects:{affection:4,happy:-2},outcome:'연인은 배려를 고마워했다.'},{text:'당장 전부 버리라고 한다',effects:{affection:-13},outcome:'물건보다 통제하려는 태도가 문제가 됐다.'}]),
 E('cohabit','동거 제안','연인이 생활비를 아끼고 더 자주 보기 위해 동거를 제안합니다.',null,[{text:'생활비·집안일·개인시간부터 합의한다',effects:{affection:15,cash:500000},outcome:'낭만보다 규칙부터 정한 것이 오히려 든든했다.'},{text:'한 달 시험 동거를 해본다',effects:{affection:9,happy:5},outcome:'서로의 생활 습관을 현실적으로 확인했다.'},{text:'사랑하면 규칙은 필요 없다고 한다',effects:{affection:-5},outcome:'곧 사소한 생활 습관이 갈등이 됐다.'}])
);

/* 인간관계가 쌓인 뒤에야 열리는 이야기들 — 말수와 감정선을 조금 더 길게 잡았다 */
ROMANCE_EVENTS.push(
 E('silence','말없는 저녁','“오늘은 그냥 말 안 해도 돼요?” 연인이 소파에 기대 눈을 감습니다. 이런 침묵이 편한 건지 불안한 건지 아직 잘 모르겠습니다.',null,[
  {text:'옆에 앉아 같이 아무 말도 안 한다',effects:{affection:11,happy:5},outcome:'30분쯤 지나 연인이 먼저 웃으며 말했다. "이래서 좋아요, 우리."'},
  {text:'무슨 일 있었냐고 조심스럽게 묻는다',effects:{affection:7},outcome:'별일 아니라고 했지만, 물어봐 줘서 고맙다는 말을 덧붙였다.'},
  {text:'분위기가 어색해 TV를 크게 켠다',effects:{affection:-7,happy:-2},outcome:'침묵을 견디지 못한 쪽은 나였다. 연인은 아무 말 없이 방으로 들어갔다.'}]),
 E('meetfriends','친구들에게 소개','연인이 “내 친구들 한번 볼래요?”라고 묻습니다. 다들 오래된 사이라 평가가 꽤 매섭다고 합니다.',null,[
  {text:'긴장을 숨기지 않고 솔직하게 간다',effects:{affection:13,cash:-400000},outcome:'"긴장했다"고 먼저 말한 게 오히려 좋게 보였다. 친구들이 합격점을 줬다.'},
  {text:'잘 보이려고 완벽하게 준비한다',effects:{affection:6,cash:-1200000},outcome:'무난했지만, 애쓰는 게 보였다는 후기가 돌아왔다.'},
  {text:'둘만 만나는 게 좋다며 거절한다',effects:{affection:-11},outcome:'연인은 자기 세계에 들일 생각이 없는 거냐고 물었다.'}]),
 E('exback','전 연인의 연락','새벽에 전 연인에게서 “잘 지내?”라는 메시지가 왔습니다. 지금 사람이 있는데도 손이 잠깐 멈췄습니다.',null,[
  {text:'읽고 답하지 않는다',effects:{affection:6,happy:-2},outcome:'답하지 않는 것도 하나의 대답이었다.'},
  {text:'지금 연인에게 먼저 이야기한다',effects:{affection:14},outcome:'"말해줘서 고마워요." 숨기지 않은 것이 오히려 신뢰가 됐다.'},
  {text:'그냥 안부만 주고받는다',effects:{affection:-9,endRelationshipChance:.1},outcome:'대화는 안부로 시작해 새벽 세 시까지 이어졌다.'}]),
 E('moneyfight','통장을 본 날','연인이 우연히 내 투자 잔고를 봤습니다. 얼굴이 굳는 게 보입니다.',null,[
  {text:'전략과 손실 한도를 차분히 설명한다',effects:{affection:10},outcome:'"무모한 게 아니라 계획이 있는 거였네요." 표정이 조금 풀렸다.'},
  {text:'같이 가계부를 열어 보여준다',effects:{affection:13,happy:-3},outcome:'부끄러웠지만 숨길 게 없다는 게 가장 큰 설득이었다.'},
  {text:'내 돈인데 무슨 상관이냐고 한다',effects:{affection:-16,endRelationshipChance:.12},outcome:'연인은 "같이 살 생각은 없는 거네요"라고 조용히 말했다.'}]),
 E('tired','지친 연인의 새벽 전화','새벽 두 시, 연인에게서 전화가 옵니다. 목소리가 잠겨 있습니다.',null,[
  {text:'택시를 타고 지금 만나러 간다',effects:{cash:-200000,affection:16,happy:-4},outcome:'문 앞에서 마주친 순간 연인이 울음을 터뜨렸다. 아무 말도 필요 없었다.'},
  {text:'끊지 않고 아침까지 통화한다',effects:{affection:11,happy:-2},outcome:'해가 뜰 때쯤 "이제 잘 수 있을 것 같아요"라는 말이 들렸다.'},
  {text:'내일 얘기하자고 하고 끊는다',effects:{affection:-13},outcome:'다음 날, 연인은 그 얘기를 다시 꺼내지 않았다.'}]),
 E('anniversary','기념일을 잊었다','연인이 아무 말도 안 하는 걸 보니, 오늘이 그날이었다는 걸 뒤늦게 알았습니다.',null,[
  {text:'변명 없이 바로 인정하고 사과한다',effects:{affection:7,happy:-3},outcome:'"화가 난 게 아니라 서운했던 거예요." 대화가 오히려 깊어졌다.'},
  {text:'당장 오늘 밤 계획을 다시 짠다',effects:{cash:-900000,affection:10},outcome:'급하게 준비한 티는 났지만, 애쓰는 마음은 전해졌다.'},
  {text:'그런 걸 꼭 챙겨야 하냐고 한다',effects:{affection:-17},outcome:'연인은 달력을 조용히 덮었다.'}]),
 E('parentmeet','부모님의 반대','연인의 부모님이 내 직업과 재산을 듣고 표정이 굳었다는 이야기를 전해 들었습니다.',null,[
  {text:'시간을 두고 직접 찾아뵙겠다고 한다',effects:{affection:12,happy:-4},outcome:'연인은 "혼자 싸우게 두지 않아서 고맙다"고 했다.'},
  {text:'우리 둘의 문제로만 두자고 한다',effects:{affection:4},outcome:'당장은 편했지만, 문제는 그대로 남았다.'},
  {text:'부모님을 험담한다',effects:{affection:-15},outcome:'연인 앞에서 연인의 가족을 깎아내린 순간, 공기가 얼어붙었다.'}])
);
root.QT_ROMANCE={VOICES,ROMANCE_EVENTS,dateLine,momentLine,profileOf,voiceOf};
})(window);
