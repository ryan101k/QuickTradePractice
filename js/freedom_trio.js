/* QuickTrade Life — 채원 × 유나 × 소희: 화려한 하루 뒤, 작은 집 */
(function(root){
'use strict';

const NAMES=['채원','유나','소희'];
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const rec=(life,name)=>(life.met||[]).find(person=>person.name===name);

/*
 * 세 사람의 직업은 화려하지만 이 루트의 보상은 더 큰 무대가 아니다.
 * 밖에서 쓰던 역할을 현관에 내려놓고, 아무 성과가 없어도 사랑받는 생활을 만든다.
 */
const PERSONAL_EVENTS={
  chaewon_layover:{
    name:'채원',min:20,scene:'./assets/event-chaewon-airport.png',icon:'✈️',
    title:'채원 · 마지막 비행 뒤의 편의점 죽',
    desc:'예정보다 늦게 끝난 비행 뒤, 채원이 승객이 모두 떠난 탑승구에 혼자 남아 있습니다. 수십 도시를 오가면서도 퇴근 뒤 따뜻한 밥을 함께 먹을 사람은 없었다는 말을 농담처럼 흘립니다.',
    choices:[
      {id:'wait',text:'편의점에서 죽과 우유를 사 와 나란히 먹는다',preview:'화려한 환영 대신 평범한 귀가를 함께한다',affection:8,trust:9,tag:'freedom',rest:7,happy:5,stress:-5,result:'채원은 모자를 벗고 종이컵을 두 손으로 감쌌습니다. “오늘 본 야경 중에는 이게 제일 좋네요.”'},
      {id:'upgrade',text:'택시를 불러 주고 집 앞까지 조용히 데려다준다',preview:'피곤한 사람에게 설명할 필요 없는 배려를 건넨다',affection:7,trust:7,cash:-300000,tag:'career',rest:4,happy:3,stress:-3,result:'채원은 차에서 잠깐 잠들었습니다. 도착 뒤에는 다음 귀국 날도 같은 길로 와 달라고 했습니다.'},
      {id:'quit',text:'이렇게 힘들면 비행을 그만두라고 한다',preview:'채원이 아니라 직업부터 없애려 한다',affection:-5,trust:-8,tag:'control',rest:-5,happy:-4,stress:6,result:'채원의 표정이 굳었습니다. “내가 돌아오는 사람이 필요했지, 못 떠나게 하는 사람을 찾은 건 아니에요.”'},
    ],
  },
  chaewon_transfer:{
    name:'채원',min:45,after:'chaewon_layover',scene:'./assets/event-chaewon-transfer-offer.png',icon:'🛫',
    title:'채원 · 비행 없는 아침 한 칸',
    desc:'장거리 노선표를 받아 든 채원은 빽빽한 일정 사이에 단 하루 비어 있는 아침을 가리킵니다. 멋진 여행보다 세탁기를 돌리고 늦잠을 자는 날을 같이 보내 보고 싶다고 합니다.',
    choices:[
      {id:'calendar',text:'알람을 끄고 빨래와 늦은 아침을 함께한다',preview:'아무것도 하지 않는 하루를 약속한다',affection:10,trust:11,tag:'freedom',rest:9,happy:6,stress:-6,result:'세탁기가 도는 동안 두 사람은 소파에서 다시 잠들었습니다. 채원은 처음으로 쉬는 날을 낭비했다고 생각하지 않았습니다.'},
      {id:'invest',text:'교통·청소 비용을 나눠 귀가 뒤의 짐을 줄인다',preview:'일을 키우기보다 생활의 피로를 덜어 준다',affection:7,trust:8,cash:-1500000,tag:'career',rest:6,happy:3,stress:-4,result:'채원은 지원보다 “집에 와서는 일하지 않아도 된다”는 규칙을 더 마음에 들어 했습니다.'},
      {id:'refuse',text:'발령을 거절해야 계속 만날 수 있다고 한다',preview:'편안한 집을 떠날 수 없는 조건으로 바꾼다',affection:-10,trust:-12,tag:'control',rest:-8,happy:-6,stress:9,result:'채원은 발령서보다 당신을 오래 바라봤습니다. 그리고 대답 대신 승무원 가방을 다시 잠갔습니다.'},
    ],
  },
  yuna_offcamera:{
    name:'유나',min:20,scene:'./assets/event-yuna-backstage.png',icon:'📸',
    title:'유나 · 렌즈가 꺼진 뒤의 국숫집',
    desc:'촬영이 끝난 뒤 유나는 화장을 지우지 못한 채 빈 대기실에 앉아 있습니다. 오늘도 모두가 원하는 표정은 만들었지만 자기 기분을 묻는 사람은 없었다고 말합니다.',
    choices:[
      {id:'quiet',text:'화장을 지운 얼굴로 동네 국숫집에 간다',preview:'보여지는 모습이 아닌 피곤한 하루를 함께한다',affection:9,trust:10,tag:'freedom',rest:8,happy:5,stress:-6,result:'유나는 휴대전화를 뒤집어 놓고 면을 천천히 먹었습니다. “예쁘게 먹으라는 사람 없으니까 진짜 맛있다.”'},
      {id:'campaign',text:'오늘 사진은 한 장도 남기지 않고 택시만 잡아준다',preview:'이미지를 관리하지 않아도 되는 귀가를 만든다',affection:7,trust:8,tag:'career',rest:5,happy:3,stress:-4,result:'유나는 창문에 기대며 내일도 사진 없는 저녁이면 좋겠다고 말했습니다.'},
      {id:'delete',text:'불안하면 SNS와 모델 일을 모두 그만두라고 한다',preview:'세상의 시선과 함께 유나의 일도 지운다',affection:-7,trust:-9,tag:'control',rest:-6,happy:-5,stress:8,result:'유나는 차갑게 웃었습니다. “세상이 보는 게 싫다고 나까지 없어져야 해요?”'},
    ],
  },
  yuna_contract:{
    name:'유나',min:45,after:'yuna_offcamera',scene:'./assets/event-yuna-dating-contract.png',icon:'📰',
    title:'유나 · 공개 일정이 없는 일요일',
    desc:'소속사가 내민 재계약서에는 유일하게 촬영과 게시 일정이 없는 일요일이 표시돼 있습니다. 유나는 그 하루만큼은 유명한 사람도, 관리받는 연인도 아닌 채 동네를 걷고 싶다고 합니다.',
    choices:[
      {id:'truth',text:'모자만 쓰고 재래시장과 작은 서점을 걷는다',preview:'유명하지 않아도 되는 하루를 함께 보낸다',affection:11,trust:11,tag:'freedom',rest:10,happy:7,stress:-7,result:'아무도 알아보지 못한 오후, 유나는 값싼 머리끈 하나를 가장 오래 고르며 웃었습니다.'},
      {id:'studio',text:'사생활을 지킬 법률 검토만 지원하고 결정은 맡긴다',preview:'선택지는 만들되 평범한 휴일은 지킨다',affection:8,trust:9,cash:-2000000,tag:'career',rest:5,happy:3,stress:-4,result:'유나는 계약서를 변호사에게 넘긴 뒤 휴대전화를 껐습니다. 남은 일요일은 온전히 두 사람의 것이었습니다.'},
      {id:'secret',text:'밖에서는 절대 아는 척하지 말자고 한다',preview:'휴식까지 이미지 관리의 연장으로 만든다',affection:-8,trust:-11,tag:'control',rest:-8,happy:-7,stress:10,result:'유나는 고개를 끄덕였지만 그날 이후 당신 앞에서도 카메라용 미소를 지었습니다.'},
    ],
  },
  sohee_emptyhall:{
    name:'소희',min:20,scene:'./assets/event-sohee-backstage.png',icon:'🎻',
    title:'소희 · 박수가 끝난 뒤의 따뜻한 차',
    desc:'공연 뒤 모두가 떠난 객석에서 소희가 혼자 같은 마디를 반복합니다. 자유롭게 연주하고 싶다던 사람이 정작 한 번의 실수에 자신을 묶고 있습니다.',
    choices:[
      {id:'listen',text:'악보를 덮고 둘만 아는 짧은 곡을 부탁한다',preview:'평가가 아닌 마음을 듣는 한 사람이 된다',affection:9,trust:10,tag:'freedom',rest:8,happy:5,stress:-6,result:'틀린 음 뒤에도 박수를 치지 않고 조용히 웃자, 소희도 활을 내려놓고 옆자리에 앉았습니다.'},
      {id:'record',text:'연습실 불을 끄고 따뜻한 차부터 건넨다',preview:'다음 무대보다 오늘의 손을 먼저 돌본다',affection:7,trust:8,cash:-100000,tag:'career',rest:6,happy:4,stress:-5,result:'소희는 굳은 손가락을 컵에 감쌌습니다. 음악 이야기를 하지 않았는데도 가장 오래 함께 있었습니다.'},
      {id:'practice',text:'관객을 실망시켰으니 더 연습해야 한다고 한다',preview:'성과를 위해 감정을 밀어붙인다',affection:-6,trust:-8,tag:'control',rest:-7,happy:-5,stress:9,result:'소희는 다시 활을 들었지만, 이번에는 당신이 객석에 있는 동안 한 번도 눈을 마주치지 않았습니다.'},
    ],
  },
  sohee_overseas:{
    name:'소희',min:45,after:'sohee_emptyhall',scene:'./assets/event-sohee-overseas-audition.png',icon:'🎼',
    title:'소희 · 떠나기 전의 작은 연주',
    desc:'해외 객원 공연을 앞둔 소희가 아무 관객도 없는 무대에서 당신에게 손을 내밉니다. 거창한 송별회보다 집에서 먹을 국과 돌아와 둘 작은 화분 이야기를 하고 싶다고 합니다.',
    choices:[
      {id:'return',text:'보온병과 집 열쇠를 건네며 천천히 다녀오라고 한다',preview:'떠남보다 돌아온 뒤의 평범한 저녁을 약속한다',affection:10,trust:12,tag:'freedom',rest:9,happy:6,stress:-6,result:'소희는 영원하다는 말 대신 돌아온 날 냉장고에 무엇을 채울지 적었습니다.'},
      {id:'tour',text:'해외 일정 동안 집을 돌보고 귀국 연주만 기다린다',preview:'커리어를 관계의 프로젝트로 만들지 않는다',affection:8,trust:9,cash:-500000,tag:'career',rest:6,happy:4,stress:-4,result:'소희는 첫 좌석보다 공연 뒤 함께 탈 막차 시간을 더 중요하게 달력에 표시했습니다.'},
      {id:'stay',text:'관계를 지키려면 국내에 남아야 한다고 한다',preview:'따뜻한 집을 떠날 수 없는 곳으로 만든다',affection:-11,trust:-13,tag:'control',rest:-9,happy:-7,stress:11,result:'소희는 합격 통지를 접어 가방에 넣었습니다. “나를 사랑하는 건지, 여기 있는 나만 필요한 건지 모르겠어요.”'},
    ],
  },
};

const CHAPTERS=[
  {
    title:'마지막 탑승구에서 집으로',icon:'🛫',scene:'./assets/event-freedom-trio-airport.png',
    desc:'채원의 귀국편, 유나의 해외 촬영 귀환, 소희의 객원 공연 도착이 같은 탑승구에서 겹쳤습니다. 세 사람 모두 화려한 차림이지만 너무 지쳐 누구도 먼저 웃지 못합니다. 당신이 준비한 것은 꽃다발이 아니라 보온병과 집으로 가는 차 한 대입니다.',
    speakers:[
      {name:'채원',line:'환영회 없어도 돼요. 구두부터 벗고 싶어요.'},
      {name:'유나',line:'지금 얼굴 찍으면 고소할 거예요. 대신 따뜻한 건 좀 줘요.'},
      {name:'소희',line:'오늘은 누구 무대가 더 컸는지 말하지 않아도 되죠?'},
    ],
    choices:[
      {id:'honest',tag:'freedom',text:'세 사람을 집으로 데려가 국을 데우고 먼저 재운다',preview:'설명보다 휴식이 먼저인 밤을 만든다',harmony:13,trust:8,rest:10,happy:7,stress:-8,result:'세 사람은 소파와 침대와 바닥에 제각각 쓰러졌습니다. 아침에 눈을 뜬 뒤에야 서로를 처음으로 편한 얼굴로 소개했습니다.'},
      {id:'crew',tag:'career',text:'짐과 이동만 정리하고 일정 이야기는 내일로 미룬다',preview:'유능함을 귀가를 돕는 데만 사용한다',harmony:9,trust:5,rest:7,happy:4,stress:-5,result:'가방은 현관에 가지런히 놓였고 업무 알림은 모두 꺼졌습니다. 아무도 대표나 모델이나 연주자가 아닌 밤이 됐습니다.'},
      {id:'choose',tag:'control',text:'오늘 가장 보고 싶었던 한 사람만 차에 태운다',preview:'지친 세 사람을 다시 비교한다',harmony:-13,trust:-7,rest:-8,happy:-7,stress:11,result:'선택받은 사람도 차에 타지 않았습니다. 셋은 각자 택시를 잡으며 처음으로 같은 표정을 지었습니다.'},
    ],
  },
  {
    title:'기사보다 작은 일요일',icon:'🧺',scene:'./assets/event-freedom-trio-scandal.png',
    desc:'유나의 열애설과 채원·소희의 목격 사진이 같은 날 퍼졌습니다. 밖에서는 세 사람을 경쟁자로 떠들지만, 정작 네 사람은 시장에서 살 감자와 세탁 세제 목록을 두고 더 오래 고민합니다.',
    speakers:[
      {name:'유나',line:'해명문보다 장바구니가 더 급해요. 집에 먹을 게 하나도 없잖아.'},
      {name:'채원',line:'모자 쓰면 알아보는 사람 없어요. 오늘만 평범하게 걸어요.'},
      {name:'소희',line:'감자 세 개면 충분한가요? 네 사람이니까 네 개가 맞나.'},
    ],
    choices:[
      {id:'boundaries',tag:'freedom',text:'휴대전화를 끄고 네 사람이 동네 장을 본다',preview:'세상의 설명보다 오늘 먹을 저녁을 고른다',harmony:15,trust:9,rest:11,happy:8,stress:-8,result:'기사는 하루 종일 갱신됐지만 네 사람은 처음 만든 감자국이 싱겁다는 문제로 더 오래 웃었습니다.'},
      {id:'campaign',tag:'career',text:'필요한 해명만 맡기고 집에서는 기사 이야기를 금지한다',preview:'직업을 처리하되 생활까지 침범하게 두지 않는다',harmony:10,trust:6,rest:7,happy:4,stress:-5,result:'유나는 짧은 입장만 남기고 돌아왔습니다. 현관을 닫는 순간부터 아무도 기사를 다시 열지 않았습니다.'},
      {id:'deny',tag:'control',text:'유나 혼자 모든 관계를 부정하게 한다',preview:'집에서도 한 사람에게 가면을 씌운다',harmony:-16,trust:-9,rest:-10,happy:-8,stress:12,result:'유나는 완벽하게 웃으며 해명했습니다. 카메라가 꺼진 뒤에는 당신에게도 같은 표정만 남겼습니다.'},
    ],
  },
  {
    title:'세 개의 도시에서 온 귀가 문자',icon:'💬',scene:'./assets/event-freedom-trio-departures.png',
    desc:'채원은 장거리 노선, 유나는 해외 촬영, 소희는 객원 공연으로 같은 날 떠납니다. 예전 같으면 누구를 따라갈지 골라야 했겠지만, 이제 중요한 것은 떠나는 장면보다 지친 뒤 돌아와 쉴 집입니다.',
    speakers:[
      {name:'채원',line:'배웅은 됐어요. 대신 냉장고에 우유는 남겨 둬요.'},
      {name:'유나',line:'영상 통화할 때 화장하라고 하지 마요. 진짜 피곤할 거니까.'},
      {name:'소희',line:'집 화분에 물만 주세요. 돌아오면 제가 저녁을 만들게요.'},
    ],
    choices:[
      {id:'threeletters',tag:'freedom',text:'각자 좋아하는 반찬을 작은 도시락에 담아 보낸다',preview:'같은 약속보다 사소한 취향을 기억한다',harmony:16,trust:10,rest:10,happy:7,stress:-7,result:'세 도시에 도착한 사진에는 풍경보다 반쯤 비운 도시락이 먼저 찍혀 있었습니다. 귀가 문자는 모두 “집에 가고 싶다”로 끝났습니다.'},
      {id:'follow',tag:'career',text:'따라가지 않고 집을 정리하며 귀가를 기다린다',preview:'모든 무대를 쫓지 않아도 사라지지 않는 관계',harmony:12,trust:8,rest:8,happy:5,stress:-6,result:'당신은 세 도시의 시간을 외우는 대신 현관 전구와 침구를 바꿨습니다. 돌아온 세 사람은 그 변화부터 알아봤습니다.'},
      {id:'ground',tag:'control',text:'관계를 유지하려면 셋 모두 일정을 포기하라고 한다',preview:'쉴 집을 떠날 수 없는 곳으로 만든다',harmony:-22,trust:-12,rest:-14,happy:-10,stress:15,result:'세 사람은 처음으로 같은 편이 됐습니다. 당신을 설득하기 위해서가 아니라, 각자의 표를 지키기 위해서였습니다.'},
    ],
  },
  {
    title:'화려한 하루가 끝나는 집',icon:'🏠',scene:'./assets/event-freedom-trio-home.png',
    desc:'현관에는 여행가방, 옷걸이에는 촬영 의상, 창가에는 바이올린이 놓였습니다. 밖에서 누구보다 화려한 세 사람이 이 집에서는 잘 보일 필요도, 잘할 필요도 없는 생활을 시작하려 합니다.',
    speakers:[
      {name:'채원',line:'늦게 돌아오면 밥만 남겨 둬요. 기다리다 지치지는 말고.'},
      {name:'유나',line:'여기서는 예쁘지 않아도 된다고 매일 말해 줘요.'},
      {name:'소희',line:'연주하지 않는 날에도 제가 쓸모 있는 사람인 것처럼 대해 주세요.'},
    ],
    choices:[
      {id:'home',tag:'freedom',text:'한 달에 하루는 네 사람 모두 아무 역할도 하지 않는다',preview:'성과 없이 함께 있는 것이 관계의 중심이 된다',harmony:20,trust:11,rest:16,happy:10,stress:-10,result:'그날은 배달 음식과 낮잠과 서툰 집안일만 남았습니다. 누구도 멋지지 않았지만 네 사람 모두 가장 편하게 웃었습니다.'},
      {id:'worldstage',tag:'career',text:'각자의 일은 밖에 두고 귀가 뒤에는 서로를 돌본다',preview:'화려한 직업과 소박한 생활을 분리한다',harmony:16,trust:9,rest:12,happy:8,stress:-8,result:'세 사람의 일정은 여전히 바빴지만 현관을 닫으면 직함도 기사도 박수도 끝났습니다. 집은 네 사람의 회복실이 됐습니다.'},
      {id:'rules',tag:'control',text:'외박·촬영·공연을 모두 허락제로 관리한다',preview:'돌아올 곳을 떠날 수 없는 곳으로 바꾼다',harmony:-28,trust:-15,rest:-18,happy:-12,stress:18,result:'세 사람은 열쇠를 테이블에 내려놓았습니다. 붙잡으려고 만든 규칙이 누구도 돌아오지 않는 이유가 됐습니다.'},
    ],
  },
];

const AFTERMATH=[
  {
    id:'shared_calendar',title:'공동생활 1개월 · 아무 일정도 없는 일요일',icon:'🗓️',scene:'./assets/event-freedom-trio-home.png',
    desc:'세 사람의 일정표는 비행과 촬영과 공연으로 가득하지만, 함께 쉬는 날은 아무도 먼저 적지 못했습니다. 쉬는 일에도 목적을 붙이던 습관을 내려놓을 차례입니다.',
    speakers:[
      {name:'채원',line:'빈칸이 생기면 알려줄게요. 그걸 꼭 누가 먼저 차지할 필요는 없잖아요.'},
      {name:'유나',line:'일정표에 연애라고 쓰지는 말죠. 그냥 아무것도 안 하는 날이면 돼.'},
      {name:'소희',line:'연습 없는 날이 아니라, 일부러 연습하지 않는 날도 필요하겠네요.'},
    ],
    choices:[
      {id:'blank',text:'한 달에 하루는 늦잠과 배달 음식만 허락한다',result:'세 사람은 그날 무엇을 할지 정하지 않았습니다. 함께 빈둥거린 시간이 처음으로 아깝지 않았습니다.',harmony:9,rest:10,happy:6,stress:-7},
      {id:'rotate',text:'매달 한 사람이 소박한 동네 데이트를 정한다',result:'시장 장보기, 강변 산책, 작은 서점이 차례로 공동생활의 추억이 됐습니다.',harmony:7,rest:8,happy:5,stress:-5,income:100000},
      {id:'sponsor',text:'쉬는 날에도 공동 콘텐츠를 촬영한다',result:'수익은 늘었지만 유나는 집에서까지 표정을 관리해야 하는지 물었습니다.',harmony:-5,rest:-6,happy:-3,stress:8,income:800000},
    ],
  },
  {
    id:'homecoming',title:'공동생활 2개월 · 가장 늦은 귀가',icon:'🏠',scene:'./assets/event-freedom-trio-homecoming.png',
    desc:'새벽 마지막 편으로 돌아온 채원, 해외 촬영을 마친 유나, 공연 투어에서 온 소희가 같은 날 현관에 도착했습니다. 모두 지쳤지만 서로 먼저 기대려 하지는 않습니다.',
    speakers:[
      {name:'채원',line:'세 명 다 돌아왔네요. 이런 날은 정말 드문데.'},
      {name:'유나',line:'사진 찍지 마요. 지금 얼굴은 여기 있는 사람들만 보는 거예요.'},
      {name:'소희',line:'말하지 않아도 되는 환영회면 좋겠어요. 오늘은 그냥 듣고 싶어요.'},
    ],
    choices:[
      {id:'soup',text:'따뜻한 식사만 준비하고 말없이 쉬게 한다',result:'대화는 짧았지만 다음 날 세 사람 모두 같은 거실에서 편하게 잠들어 있었습니다.',harmony:10,rest:11,happy:6,stress:-8},
      {id:'stories',text:'씻고 누운 뒤 각자 좋았던 일을 하나씩만 말한다',result:'세 도시는 한 이불 위에서 이어졌고 누구의 이야기도 경쟁이 되지 않았습니다.',harmony:8,rest:8,happy:6,stress:-5},
      {id:'ranking',text:'누가 가장 보고 싶었는지 한 명을 고른다',result:'농담으로 시작한 질문이 세 사람의 피로를 정확히 찔렀습니다.',harmony:-10,rest:-8,happy:-6,stress:10},
    ],
  },
  {
    id:'world_offer',title:'공동생활 3개월 · 동네 축제의 작은 무대',icon:'🏘️',scene:'./assets/event-freedom-trio-home.png',
    desc:'동네 축제에서 채원에게 안내를, 유나에게 사진을, 소희에게 짧은 연주를 부탁했습니다. 돈도 명성도 거의 없지만 네 사람이 집 근처에서 함께 보낼 수 있는 하루입니다.',
    speakers:[
      {name:'채원',line:'멀리 안 가는 일정은 오랜만이네요. 걸어서 집에 올 수 있겠어요.'},
      {name:'유나',line:'보정 없는 사진도 괜찮다면 찍어 줄게요. 이웃들이니까.'},
      {name:'소희',line:'앵콜 대신 끝나고 다 같이 저녁 먹는 조건이면 좋아요.'},
    ],
    choices:[
      {id:'terms',text:'무보수로 돕고 축제 뒤 이웃들과 국수를 먹는다',result:'박수는 작았지만 집까지 걸어오는 길에 네 사람은 오래 손을 잡았습니다.',harmony:11,rest:9,happy:8,stress:-6},
      {id:'scale',text:'필요한 장비만 빌려 주고 행사를 소박하게 지킨다',result:'무대는 작고 조명은 서툴렀지만 세 사람 모두 오랜만에 실패해도 괜찮은 일을 했습니다.',harmony:8,rest:7,happy:6,stress:-5,cash:-500000,income:300000},
      {id:'playerbrand',text:'행사를 홍보 콘텐츠로 키워 수익화한다',result:'수익은 생겼지만 세 사람은 다시 집 근처에서도 표정을 관리해야 하는지 물었습니다.',harmony:-9,rest:-7,happy:-4,stress:9,income:1500000},
    ],
  },
];

function ensure(life){
  if(!life.freedomTrio||typeof life.freedomTrio!=='object'){
    life.freedomTrio={active:false,queued:false,encountered:false,stage:0,harmony:50,rest:45,axes:{freedom:0,career:0,control:0},history:[],personal:{},ending:null,aftermathIndex:0};
  }
  const state=life.freedomTrio;
  if(!state.axes)state.axes={freedom:0,career:0,control:0};
  if(!Array.isArray(state.history))state.history=[];
  if(!state.personal||typeof state.personal!=='object')state.personal={};
  state.harmony=clamp(finite(state.harmony,50),0,100);
  state.rest=clamp(finite(state.rest,45),0,100);
  state.stage=clamp(Math.floor(finite(state.stage,0)),0,CHAPTERS.length);
  state.aftermathIndex=Math.max(0,Math.floor(finite(state.aftermathIndex,0)));
  return state;
}
function nextPersonalEvent(life){
  const state=ensure(life);
  return Object.entries(PERSONAL_EVENTS).map(([id,event])=>({id,event})).find(({id,event})=>{
    const person=rec(life,event.name);
    if(!person||['ex','deceased'].includes(person.status)||state.personal[id]==='seen')return false;
    if((person.affection||0)<event.min)return false;
    return !event.after||state.personal[event.after]==='seen';
  })||null;
}
function queuePersonal(life){
  const state=ensure(life),next=nextPersonalEvent(life);
  if(!next)return null;
  if(state.personal[next.id]==='queued')return next.id;
  state.personal[next.id]='queued';
  return next.id;
}
function personalEvent(id){return PERSONAL_EVENTS[id]||null;}
function applyPersonal(life,id,choiceId){
  const state=ensure(life),event=PERSONAL_EVENTS[id],person=event&&rec(life,event.name);
  if(!event||!person)return null;
  const choice=event.choices.find(item=>item.id===choiceId);if(!choice)return null;
  person.affection=clamp((person.affection||0)+(choice.affection||0),0,100);
  person.trust=clamp((person.trust||0)+(choice.trust||0),0,100);
  state.rest=clamp(state.rest+(choice.rest||0),0,100);
  state.personal[id]='seen';
  state.axes[choice.tag]=(state.axes[choice.tag]||0)+1;
  state.history.push({type:'personal',id,choice:choice.id,tag:choice.tag});
  return{event,choice,r:person,state};
}
function progress(life){
  return NAMES.map(name=>{
    const person=rec(life,name),ids=Object.entries(PERSONAL_EVENTS).filter(([,event])=>event.name===name).map(([id])=>id);
    const seen=ids.filter(id=>ensure(life).personal[id]==='seen').length;
    const active=!!person&&!['ex','deceased'].includes(person.status);
    const ready=active&&seen===ids.length&&(person.affection||0)>=45&&(person.trust||0)>=20;
    return{name,met:!!person,active,seen,total:ids.length,affection:person&&person.affection||0,trust:person&&person.trust||0,ready,
      need:!person?'아직 만나지 못함':!active?`현재 관계: ${person.status||'지인'} · 관계가 끊김`:seen<ids.length?`개별 이벤트 ${seen}/${ids.length}`:(person.affection||0)<45?`호감 ${Math.round(person.affection||0)}/45`:`신뢰 ${Math.round(person.trust||0)}/20`};
  });
}
function eligibility(life){
  const state=ensure(life),rows=progress(life),partner=!!life.partner&&NAMES.includes(life.partner.name);
  const poly=life.polycule||{},outsiders=(poly.members||[]).filter(person=>!NAMES.includes(person.name));
  const dangerous=!!(life.dangerousTrioBond&&life.dangerousTrioBond.active);
  return{ok:!state.encountered&&!state.active&&!state.ending&&partner&&!dangerous&&!outsiders.length&&rows.every(row=>row.ready),partner,dangerous,outsiders,rows};
}
function queue(life){
  const check=eligibility(life),state=ensure(life);
  if(!check.ok||state.queued)return false;
  state.queued=true;return true;
}
function start(life){
  const check=eligibility(life);if(!check.ok)return{ok:false,check};
  const state=ensure(life);
  state.active=true;state.queued=false;state.encountered=true;state.stage=Math.max(0,state.stage||0);state.harmony=Math.max(50,state.harmony||0);state.rest=Math.max(45,state.rest||0);state.ending=null;
  NAMES.forEach(name=>{const person=rec(life,name);if(person){person.trust=clamp((person.trust||0)+3,0,100);if(person.status==='acquaintance')person.status='friend';}});
  return{ok:true,state,chapter:CHAPTERS[state.stage]};
}
function next(life){
  const state=ensure(life);
  return state.active&&!state.ending?CHAPTERS[state.stage]||null:null;
}
function endingFor(state){
  const axes=state.axes||{};
  if((axes.control||0)>=2||state.harmony<25||state.rest<25){
    return{id:'empty_gate',title:'불이 꺼진 현관',tone:'bad',scene:'./assets/event-freedom-trio-empty-gate-ending.png',text:'쉴 곳에도 평가와 허락이 생기자 세 사람은 더 이상 돌아오지 않았습니다. 현관에는 열쇠만 남았고 네 사람의 저녁은 다시 각자의 일정표로 흩어졌습니다.'};
  }
  if((axes.career||0)>(axes.freedom||0)){
    return{id:'bright_home',title:'화려한 날 뒤의 불 켜진 집',tone:'good',scene:'./assets/event-freedom-trio-homecoming.png',text:'채원은 비행을, 유나는 촬영을, 소희는 공연을 계속했습니다. 그러나 현관을 닫은 뒤에는 누구도 직업으로 불리지 않았습니다. 네 사람은 성공을 나누는 대신 피로를 내려놓는 집을 만들었습니다.'};
  }
  return{id:'small_days',title:'네 사람의 작은 저녁',tone:'good',scene:'./assets/event-freedom-trio-home.png',text:'장보기와 설거지와 늦잠이 네 사람의 가장 중요한 일정이 됐습니다. 화려한 세상에서 돌아온 사람을 심문하지 않고 따뜻한 한 끼를 남겨 두는, 가장 소박하고 오래가는 연애가 시작됐습니다.'};
}
function apply(life,choiceId){
  const state=ensure(life),chapter=next(life);if(!chapter)return null;
  const choice=chapter.choices.find(item=>item.id===choiceId);if(!choice)return null;
  state.harmony=clamp(state.harmony+(choice.harmony||0),0,100);
  state.rest=clamp(state.rest+(choice.rest||0),0,100);
  state.axes[choice.tag]=(state.axes[choice.tag]||0)+1;
  state.history.push({type:'set',stage:state.stage,choice:choice.id,tag:choice.tag});
  NAMES.forEach(name=>{
    const person=rec(life,name);if(!person)return;
    person.trust=clamp((person.trust||0)+(choice.trust||0),0,100);
    person.affection=clamp((person.affection||0)+(choice.tag==='control'?-3:3),0,100);
  });
  state.stage++;
  if(state.stage>=CHAPTERS.length){state.ending=endingFor(state);state.active=false;}
  return{chapter,choice,state,ending:state.ending};
}
function monthly(life){
  const state=ensure(life);if(!state.active)return null;
  const safe=(state.axes.freedom||0)>=(state.axes.control||0);
  state.harmony=clamp(state.harmony+(safe?2:-4),0,100);
  state.rest=clamp(state.rest+(safe?1:-3),0,100);
  return state.harmony<=20||state.rest<=20?'네 사람이 쉬어야 할 집까지 긴장으로 가득해지고 있습니다. 다음 세트 이야기에서 편안함을 되찾아야 합니다.':null;
}
function nextAftermath(life){
  const state=ensure(life);
  if(!state.ending||state.ending.tone!=='good')return null;
  return AFTERMATH[state.aftermathIndex]||null;
}
function applyAftermath(life,choiceId){
  const state=ensure(life),event=nextAftermath(life);if(!event)return null;
  const choice=event.choices.find(item=>item.id===choiceId);if(!choice)return null;
  state.harmony=clamp(state.harmony+(choice.harmony||0),0,100);
  state.rest=clamp(state.rest+(choice.rest||0),0,100);
  state.aftermathIndex++;
  NAMES.forEach(name=>{const person=rec(life,name);if(person)person.trust=clamp((person.trust||0)+Math.sign(choice.harmony||0)*2,0,100);});
  return{event,choice,state};
}
function recovery(life){
  const state=ensure(life);
  if(!state.ending||state.ending.tone!=='good')return{happy:0,stress:0,health:0,income:0};
  const strength=state.rest>=75?2:state.rest>=50?1:0;
  return{happy:3+strength,stress:-(4+strength*2),health:strength,income:300000};
}
function compatibleCandidate(name){return NAMES.includes(name);}

root.QT_FREEDOM_TRIO={
  NAMES,PERSONAL_EVENTS,CHAPTERS,AFTERMATH,ensure,nextPersonalEvent,queuePersonal,personalEvent,
  applyPersonal,progress,eligibility,queue,start,next,apply,monthly,nextAftermath,applyAftermath,recovery,compatibleCandidate,
};
})(window);
