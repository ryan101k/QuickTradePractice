/* QuickTrade Life — 채원 × 유나 × 소희: 화려한 하루 뒤, 작은 집 */
(function(root){
'use strict';

const NAMES=['채원','유나','소희'];
const ROMANCE_ENDINGS={
  cohabitation_refusal:{
    icon:'🌙',title:'공동 관계 배드엔딩 · 마지막 접속',scene:'./assets/event-freedom-bad-repeat.png',
    quote:'“싫다는 말은 들었어요. 이제 우리도 돌아오지 않을게요.”',
    text:'세 사람은 붙잡거나 따지지 않았습니다. 길드 친구 목록과 주식 소문을 전하던 단체방, 정해 둔 다음 접속 시간까지 조용히 정리했습니다.',
    detail:'자유인 3인조 공동 관계 제안 거절 · 게임과 휴대폰 연결 완전 단절'
  },
  pure_affair:{
    icon:'🏠',title:'순애 배드엔딩 · 불이 꺼진 작은 집',scene:'./assets/event-freedom-bad-octopus.png',
    quote:'“한 사람만 고르겠다는 말도 당신이 먼저 했잖아요.”',
    text:'한 사람과 평범한 저녁을 택한 뒤 다른 사람을 유혹하려 했다는 사실을 세 사람 모두 알게 됐습니다. 누구도 복수하지 않았지만, 다시 접속해도 파티에는 당신 자리만 비어 있었습니다.',
    detail:'개인 순애 약속 위반 · 세 사람 전원 연락 단절'
  }
};
function romanceEnding(kind){return ROMANCE_ENDINGS[kind]||null;}
const GUILD_MEMBERS=[
  {name:'채원',nickname:'막차요정',job:'국제선 객실승무원',avatar:'⚔️',role:'돌진형 근접 딜러',line:'한 번 들어가 볼게요. 전멸하면… 다음 판에 덜 무리하면 되죠.'},
  {name:'유나',nickname:'무보정',job:'패션모델·광고모델',avatar:'🛡️',role:'얼굴을 가린 중갑 탱커',line:'사진 인증은 금지. 공격은 내가 막을 테니까 위치만 지켜요.'},
  {name:'소희',nickname:'쉼표',job:'바이올리니스트',avatar:'🎧',role:'지원형 컨트롤러·공대장',line:'세 걸음 뒤. 지금 멈추고, 다음 신호에 같이 들어가요.'},
];
const GUILD_NAME='다음 접속';
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const rec=(life,name)=>(life.met||[]).find(person=>person.name===name);

/*
 * 세 사람의 직업은 화려하지만 이 루트의 보상은 더 큰 무대가 아니다.
 * 밖에서 쓰던 역할을 현관에 내려놓고, 아무 성과가 없어도 사랑받는 생활을 만든다.
 */
const PERSONAL_EVENTS={
  chaewon_layover:{
    name:'채원',min:20,scene:'./assets/event-chaewon-7.png',icon:'✈️',
    title:'채원 · 마지막 비행 뒤의 편의점 죽',
    desc:'예정보다 늦게 끝난 비행 뒤, 채원이 승객이 모두 떠난 탑승구에 혼자 남아 있습니다. 수십 도시를 오가면서도 퇴근 뒤 따뜻한 밥을 함께 먹을 사람은 없었다는 말을 농담처럼 흘립니다.',
    choices:[
      {id:'wait',text:'편의점에서 죽과 우유를 사 와 나란히 먹는다',preview:'화려한 환영 대신 평범한 귀가를 함께한다',affection:8,trust:9,tag:'freedom',rest:7,happy:5,stress:-5,result:'채원은 모자를 벗고 종이컵을 두 손으로 감쌌습니다. “오늘 본 야경 중에는 이게 제일 좋네요.”'},
      {id:'upgrade',text:'택시를 불러 주고 집 앞까지 조용히 데려다준다',preview:'피곤한 사람에게 설명할 필요 없는 배려를 건넨다',affection:7,trust:7,cash:-300000,tag:'career',rest:4,happy:3,stress:-3,result:'채원은 차에서 잠깐 잠들었습니다. 도착 뒤에는 다음 귀국 날도 같은 길로 와 달라고 했습니다.'},
      {id:'quit',text:'이렇게 힘들면 비행을 그만두라고 한다',preview:'채원이 아니라 직업부터 없애려 한다',affection:-5,trust:-8,tag:'control',rest:-5,happy:-4,stress:6,result:'채원의 표정이 굳었습니다. “내가 돌아오는 사람이 필요했지, 못 떠나게 하는 사람을 찾은 건 아니에요.”'},
    ],
  },
  chaewon_transfer:{
    name:'채원',min:45,after:'chaewon_layover',scene:'./assets/event-chaewon-9.png',icon:'🛫',
    title:'채원 · 비행 없는 아침 한 칸',
    desc:'장거리 노선표를 받아 든 채원은 빽빽한 일정 사이에 단 하루 비어 있는 아침을 가리킵니다. 멋진 여행보다 세탁기를 돌리고 늦잠을 자는 날을 같이 보내 보고 싶다고 합니다.',
    choices:[
      {id:'calendar',text:'알람을 끄고 빨래와 늦은 아침을 함께한다',preview:'아무것도 하지 않는 하루를 약속한다',affection:10,trust:11,tag:'freedom',rest:9,happy:6,stress:-6,result:'세탁기가 도는 동안 두 사람은 소파에서 다시 잠들었습니다. 채원은 처음으로 쉬는 날을 낭비했다고 생각하지 않았습니다.'},
      {id:'invest',text:'교통·청소 비용을 나눠 귀가 뒤의 짐을 줄인다',preview:'일을 키우기보다 생활의 피로를 덜어 준다',affection:7,trust:8,cash:-1500000,tag:'career',rest:6,happy:3,stress:-4,result:'채원은 지원보다 “집에 와서는 일하지 않아도 된다”는 규칙을 더 마음에 들어 했습니다.'},
      {id:'refuse',text:'발령을 거절해야 계속 만날 수 있다고 한다',preview:'편안한 집을 떠날 수 없는 조건으로 바꾼다',affection:-10,trust:-12,tag:'control',rest:-8,happy:-6,stress:9,result:'채원은 발령서보다 당신을 오래 바라봤습니다. 그리고 대답 대신 승무원 가방을 다시 잠갔습니다.'},
    ],
  },
  yuna_offcamera:{
    name:'유나',min:20,scene:'./assets/event-yuna-2.png',icon:'📸',
    title:'유나 · 렌즈가 꺼진 뒤의 국숫집',
    desc:'촬영이 끝난 뒤 유나는 화장을 지우지 못한 채 빈 대기실에 앉아 있습니다. 오늘도 모두가 원하는 표정은 만들었지만 자기 기분을 묻는 사람은 없었다고 말합니다.',
    choices:[
      {id:'quiet',text:'화장을 지운 얼굴로 동네 국숫집에 간다',preview:'보여지는 모습이 아닌 피곤한 하루를 함께한다',affection:9,trust:10,tag:'freedom',rest:8,happy:5,stress:-6,result:'유나는 휴대전화를 뒤집어 놓고 면을 천천히 먹었습니다. “예쁘게 먹으라는 사람 없으니까 진짜 맛있다.”'},
      {id:'campaign',text:'오늘 사진은 한 장도 남기지 않고 택시만 잡아준다',preview:'이미지를 관리하지 않아도 되는 귀가를 만든다',affection:7,trust:8,tag:'career',rest:5,happy:3,stress:-4,result:'유나는 창문에 기대며 내일도 사진 없는 저녁이면 좋겠다고 말했습니다.'},
      {id:'delete',text:'불안하면 SNS와 모델 일을 모두 그만두라고 한다',preview:'세상의 시선과 함께 유나의 일도 지운다',affection:-7,trust:-9,tag:'control',rest:-6,happy:-5,stress:8,result:'유나는 차갑게 웃었습니다. “세상이 보는 게 싫다고 나까지 없어져야 해요?”'},
    ],
  },
  yuna_contract:{
    name:'유나',min:45,after:'yuna_offcamera',scene:'./assets/event-yuna-5.png',icon:'📰',
    title:'유나 · 공개 일정이 없는 일요일',
    desc:'소속사가 내민 재계약서에는 유일하게 촬영과 게시 일정이 없는 일요일이 표시돼 있습니다. 유나는 그 하루만큼은 유명인도, 관리되는 이미지도 아닌 자기 모습으로 동네를 걷고 싶다고 합니다.',
    choices:[
      {id:'truth',text:'모자만 쓰고 재래시장과 작은 서점을 걷는다',preview:'유명하지 않아도 되는 하루를 함께 보낸다',affection:11,trust:11,tag:'freedom',rest:10,happy:7,stress:-7,result:'아무도 알아보지 못한 오후, 유나는 값싼 머리끈 하나를 가장 오래 고르며 웃었습니다.'},
      {id:'studio',text:'사생활을 지킬 법률 검토만 지원하고 결정은 맡긴다',preview:'선택지는 만들되 평범한 휴일은 지킨다',affection:8,trust:9,cash:-2000000,tag:'career',rest:5,happy:3,stress:-4,result:'유나는 계약서를 변호사에게 넘긴 뒤 휴대전화를 껐습니다. 남은 일요일은 온전히 두 사람의 것이었습니다.'},
      {id:'secret',text:'밖에서는 절대 아는 척하지 말자고 한다',preview:'휴식까지 이미지 관리의 연장으로 만든다',affection:-8,trust:-11,tag:'control',rest:-8,happy:-7,stress:10,result:'유나는 고개를 끄덕였지만 그날 이후 당신 앞에서도 카메라용 미소를 지었습니다.'},
    ],
  },
  sohee_emptyhall:{
    name:'소희',min:20,scene:'./assets/sohee-evnet-2.png',icon:'🎤',
    title:'소희 · 박수가 끝난 뒤의 따뜻한 차',
    desc:'공연 뒤 모두가 떠난 객석에서 소희가 혼자 같은 마디를 반복합니다. 자유롭게 연주하고 싶다던 사람이 정작 한 번의 실수에 자신을 묶고 있습니다.',
    choices:[
      {id:'listen',text:'악보를 덮고 둘만 아는 짧은 곡을 부탁한다',preview:'평가가 아닌 마음을 듣는 한 사람이 된다',affection:9,trust:10,tag:'freedom',rest:8,happy:5,stress:-6,result:'틀린 음 뒤에도 박수를 치지 않고 조용히 웃자, 소희도 활을 내려놓고 옆자리에 앉았습니다.'},
      {id:'record',text:'연습실 불을 끄고 따뜻한 차부터 건넨다',preview:'다음 무대보다 오늘의 손을 먼저 돌본다',affection:7,trust:8,cash:-100000,tag:'career',rest:6,happy:4,stress:-5,result:'소희는 굳은 손가락을 컵에 감쌌습니다. 음악 이야기를 하지 않았는데도 가장 오래 함께 있었습니다.'},
      {id:'practice',text:'관객을 실망시켰으니 더 연습해야 한다고 한다',preview:'성과를 위해 감정을 밀어붙인다',affection:-6,trust:-8,tag:'control',rest:-7,happy:-5,stress:9,result:'소희는 다시 활을 들었지만, 이번에는 당신이 객석에 있는 동안 한 번도 눈을 마주치지 않았습니다.'},
    ],
  },
  sohee_overseas:{
    name:'소희',min:45,after:'sohee_emptyhall',scene:'./assets/sohee-evnet-5.png',icon:'🎼',
    title:'소희 · 떠나기 전의 작은 연주',
    desc:'해외 객원 공연을 앞둔 소희가 아무 관객도 없는 무대에서 당신에게 손을 내밉니다. 거창한 송별회보다 집에서 먹을 국과 돌아와 둘 작은 화분 이야기를 하고 싶다고 합니다.',
    choices:[
      {id:'return',text:'보온병과 집 열쇠를 건네며 천천히 다녀오라고 한다',preview:'떠남보다 돌아온 뒤의 평범한 저녁을 약속한다',affection:10,trust:12,tag:'freedom',rest:9,happy:6,stress:-6,result:'소희는 영원하다는 말 대신 돌아온 날 냉장고에 무엇을 채울지 적었습니다.'},
      {id:'tour',text:'해외 일정 동안 집을 돌보고 귀국 연주만 기다린다',preview:'커리어를 관계의 프로젝트로 만들지 않는다',affection:8,trust:9,cash:-500000,tag:'career',rest:6,happy:4,stress:-4,result:'소희는 첫 좌석보다 공연 뒤 함께 탈 막차 시간을 더 중요하게 달력에 표시했습니다.'},
      {id:'stay',text:'관계를 지키려면 국내에 남아야 한다고 한다',preview:'따뜻한 집을 떠날 수 없는 곳으로 만든다',affection:-11,trust:-13,tag:'control',rest:-9,happy:-7,stress:11,result:'소희는 합격 통지를 접어 가방에 넣었습니다. “나를 사랑하는 건지, 여기 있는 나만 필요한 건지 모르겠어요.”'},
    ],
  },
};

const AFTERMATH=[
  {
    id:'same_party_night',title:'공동 관계 1개월 · 세 집의 같은 밤',icon:'🎧',scene:'./assets/event-freedom-shared-voice-night.png',
    desc:'함께 살지는 않습니다. 채원은 출장을 마친 원룸에서, 유나는 촬영 뒤 자기 방에서, 소희는 작업실에서 같은 길드 음성 채널에 접속했습니다. 네 사람은 연인이 된 뒤에도 상대의 빈 시간을 자기 몫으로 요구하지 않기로 했습니다.',
    speakers:[
      {name:'채원',line:'피곤하면 먼저 나가도 돼요. …그래도 다음 접속 시간은 알려 줬으면 좋겠어요.'},
      {name:'유나',line:'연애 시작했다고 출석 검사하면 바로 차단이에요. 대신 잠수도 금지.'},
      {name:'소희',line:'말없이 사라지는 건 배려가 아니었어요. 오늘은 제가 먼저, 더 있고 싶다고 말할게요.'},
    ],
    choices:[
      {id:'next_login',text:'오늘 끝내기 전에 다음 접속 시간을 네 사람이 함께 정한다',result:'누구도 매일을 약속하지 않았습니다. 대신 헤어질 때마다 다음 만남을 직접 정했고, 빈 화면은 더 이상 이별처럼 보이지 않았습니다.',harmony:10,rest:8,happy:6,stress:-7},
      {id:'open_channel',text:'말이 없는 날도 들어와 있을 수 있는 조용한 채널을 만든다',result:'소희는 작업하며, 채원은 짐을 풀며, 유나는 화장을 지우며 접속해 있었습니다. 침묵도 상대를 지우지 않는 방식이 됐습니다.',harmony:8,rest:11,happy:5,stress:-8},
      {id:'attendance',text:'연인이 됐으니 매일 정해진 시간에 접속하자고 한다',result:'채원은 웃으며 일정을 피했고, 유나는 규칙 이름부터 지웠습니다. 자유를 확인하던 자리가 출석 검사가 되자 세 사람은 다시 거리를 쟀습니다.',harmony:-10,rest:-8,happy:-5,stress:9},
    ],
  },
  {
    id:'reply_gap',title:'공동 관계 2개월 · 사흘 동안 멈춘 단체방',icon:'📱',scene:'./assets/event-freedom-shared-voice-night.png',
    desc:'채원의 비행은 지연되고, 유나는 휴대폰을 맡긴 채 촬영에 들어갔고, 소희는 공연 전 연락을 줄였습니다. 세 사람 모두 상대를 방해하지 않겠다며 단체방에서 한발씩 물러난 결과, 사흘 동안 아무도 먼저 말을 걸지 않았습니다.',
    speakers:[
      {name:'채원',line:'다들 바쁜 줄 알았어요. 제가 굳이 이유를 물으면 부담일까 봐.'},
      {name:'유나',line:'이렇게 전부 배려만 하다가 단체방 장례식 치르겠네.'},
      {name:'소희',line:'보낼 말을 적었다가 지웠어요. 또 제 자리를 먼저 없애고 있었네요.'},
    ],
    choices:[
      {id:'ask_reason',text:'답을 재촉하지 않되 사라진 이유는 서로 묻기로 한다',result:'“괜찮아?” 대신 “무슨 일이 있었어?”라는 문장이 남았습니다. 대답할 자유와 질문받을 자리가 함께 생겼습니다.',harmony:12,rest:8,happy:6,stress:-7},
      {id:'one_signal',text:'바쁜 날에는 이모티콘 하나만 남기는 구조 신호를 정한다',result:'짧은 신호는 감시가 아니라 귀환 예고가 됐습니다. 세 사람은 말할 힘이 없는 날에도 자기 자리를 지웠다고 착각하지 않았습니다.',harmony:9,rest:10,happy:5,stress:-8},
      {id:'let_go',text:'연락하지 않는 것도 자유라며 그대로 기다린다',result:'누구도 잘못하지 않았지만 단체방은 다시 조용해졌습니다. 붙잡지 않는다는 말이 또 한 번 외면의 핑계가 됐습니다.',harmony:-12,rest:-5,happy:-6,stress:8},
    ],
  },
  {
    id:'dawn_meal',title:'공동 관계 3개월 · 한 시간짜리 아침',icon:'🍲',scene:'./assets/event-freedom-shared-dawn-meal.png',
    desc:'채원의 첫차와 유나의 밤 촬영, 소희의 새벽 리허설 사이에 딱 한 시간이 겹쳤습니다. 세 사람은 각자의 집으로 돌아가기 전에 24시간 식당에 모였고, 당신의 빈자리에도 뜨거운 국을 주문해 두었습니다.',
    speakers:[
      {name:'채원',line:'오래 못 봐도 이렇게 만나면 되네요. 완벽한 하루를 기다릴 필요는 없었어요.'},
      {name:'유나',line:'한 시간 보자고 세 사람 다 온 게 제일 웃겨. 아무도 안 매달리는 척하더니.'},
      {name:'소희',line:'짧아서 아쉬운 약속도 약속이에요. 다음을 말할 수 있으니까.'},
    ],
    choices:[
      {id:'empty_seat',text:'늦더라도 빈자리에 앉아 네 사람이 함께 식사를 끝낸다',result:'국은 조금 불었지만 누구도 먼저 계산하고 사라지지 않았습니다. 한 시간짜리 만남은 다음 약속을 만드는 데 충분했습니다.',harmony:12,rest:10,happy:8,stress:-8},
      {id:'voice_breakfast',text:'갈 수 없다고 솔직히 말하고 영상 통화로 아침을 함께한다',result:'당신의 자리는 작은 화면이 됐습니다. 실망을 숨기지 않고도 관계를 끝내지 않는 첫 아침이었습니다.',harmony:9,rest:9,happy:5,stress:-6},
      {id:'choose_one',text:'셋을 다 맞추기 어려우니 앞으로 한 사람만 따로 만나자고 한다',result:'유나는 휴대폰을 뒤집었고, 채원은 괜찮다고 말했으며, 소희는 자기 그릇을 치웠습니다. 비밀 선택은 아니었지만 네 사람이 만든 합의를 편의대로 줄인 말이었습니다.',harmony:-18,rest:-10,happy:-9,stress:13},
    ],
  },
  {
    id:'four_addresses',title:'공동 관계 4개월 · 돌아갈 집이 네 곳',icon:'🏠',scene:'./assets/event-freedom-shared-voice-night.png',
    desc:'네 사람은 합칠 집을 알아보지 않았습니다. 대신 각자의 현관 비밀번호를 맡기지 않고, 찾아가기 전에는 묻고, 혼자 있고 싶은 날에도 다음 연락을 남기는 규칙을 다시 읽었습니다. 같은 주소가 없어도 관계는 계속되고 있습니다.',
    speakers:[
      {name:'채원',line:'붙잡지 않아도 기다린다고 말할 수 있네요. 이제야 그 차이를 알겠어요.'},
      {name:'유나',line:'문을 열어 줄지는 내가 정해요. 그래도 문 앞까지 온 이유는 듣고.'},
      {name:'소희',line:'제 자리를 없애지 않을게요. 돌아갈 집이 따로 있어도, 네 사람 사이에는 계속 있을게요.'},
    ],
    choices:[
      {id:'keep_addresses',text:'각자의 집을 지키며 계절마다 네 사람이 머물 장소만 정한다',result:'동거 계약서 대신 다음 계절의 약속이 달력에 남았습니다. 자유는 헤어질 준비가 아니라 다시 만날 여백이 됐습니다.',harmony:14,rest:12,happy:9,stress:-10},
      {id:'shared_keybox',text:'비상시에만 여는 공동 열쇠함과 연락 규칙을 만든다',result:'열쇠는 소유권이 아니라 구조 신호가 됐습니다. 누구도 허락 없이 문을 열지 않았고, 누구도 위급할 때 혼자 사라지지 않았습니다.',harmony:11,rest:10,happy:7,stress:-8},
      {id:'one_home',text:'이제 충분히 가까워졌으니 모두 한집으로 합치자고 밀어붙인다',result:'세 사람은 같은 대답을 했습니다. “우리가 선택한 건 함께 사라지지 않는 관계지, 서로의 생활을 없애는 집이 아니에요.”',harmony:-14,rest:-12,happy:-7,stress:11},
    ],
  },
  {
    id:'six_people_channel',title:'확장 관계 · 두 집, 하나의 길드 채널',icon:'🪞',scene:'./assets/event-trio-meeting-6.png',requiresExtension:true,
    desc:'광기 3인과 자유인 3인은 같은 집으로 합치지 않았습니다. 자유인들은 각자의 집에서 접속하고, 광기 3인은 플레이어의 거실에 모였습니다. 여섯 사람은 서로의 정반대인 관계 방식을 고치기 위해 한 달에 한 번 같은 음성 채널을 엽니다.',
    speakers:[
      {name:'채원',line:'걱정된다고 전부 대신 결정하지 말기. 대신 걱정한 이유는 말하기.'},
      {name:'유나',line:'선택권을 준다면서 먼저 차단하지 않기. 이건 나도 지킬 거예요.'},
      {name:'소희',line:'붙잡기 전에 묻고, 사라지기 전에 말해요. 양쪽 다 상대 대답을 먼저 듣는 거예요.'},
    ],
    choices:[
      {id:'mirror_rules',text:'서로의 정반대인 실수를 발견하면 바로 알려 주기로 한다',result:'여섯 사람은 상대를 정상으로 만들지 못했습니다. 대신 추적과 잠수, 통제와 차단이 시작될 때 그것을 이름 붙여 멈출 사람은 생겼습니다.',harmony:14,rest:9,happy:7,stress:-9},
      {id:'separate_channels',text:'부딪히는 날에는 채널을 나누되 다음 합류 시간을 정한다',result:'도망도 감금도 아닌 임시 퇴장이 처음으로 가능해졌습니다. 나간 사람은 약속한 시간에 다시 접속했습니다.',harmony:12,rest:11,happy:6,stress:-10},
      {id:'winner_rules',text:'더 건강한 쪽의 규칙만 따르자고 한다',result:'누가 더 정상인지 따지는 순간 채널은 전쟁터가 됐습니다. 여섯 사람은 문제의 모양만 다를 뿐이라는 사실부터 다시 인정해야 했습니다.',harmony:-16,rest:-10,happy:-8,stress:13},
    ],
  },
];

/*
 * v2 그룹 본편
 * - 첫 정모 뒤 현실 연락처가 열린 시점부터 시작한다.
 * - 개인 상담/공항/촬영/공연 중심의 구버전 사건을 선행 조건으로 쓰지 않는다.
 * - 4장은 현재 관계를 공개하는 장이며, 광기 3인 공동생활은 그 전까지
 *   휴대폰 검열이 아니라 답장 시간과 귀가 제약으로만 암시한다.
 */
const STORY_CHAPTERS=[
  {
    id:'real_names_chat',title:'1장 · “우리 진짜 못 알아봤어요?”',icon:'📱',
    scene:'./assets/event-freedom-tro-meeting.png',
    scenes:[
      {name:'채원',src:'./assets/event-chaewon-1.png',caption:'막차요정은 승무원 채원이었다.'},
      {name:'유나',src:'./assets/event-yuna-1.png',caption:'무보정은 화면 밖에서도 유명한 모델 유나였다.'},
      {name:'소희',src:'./assets/sohee-evnet-1.png',caption:'쉼표의 목소리는 무대 위에서 노래하던 소희의 것이었다.'},
    ],
    desc:'첫 정모가 끝난 밤, 유나가 새 단체방을 만들었습니다. 세 사람은 게임에서 쓰던 닉네임 옆에 실명과 오늘의 사진을 하나씩 올립니다. 직업을 숨기던 사람들답게 설명은 짧았고, 첫 질문만 똑같았습니다. “진짜 우리를 몰라봤어요?”',
    speakers:[
      {name:'유나',line:'단체방은 내가 만들었어요. 이제 와서 검색해 보고 아는 척하면 바로 티 나니까 솔직히 말해요. 나 정말 몰랐죠?'},
      {name:'채원',line:'막차요정이 실제 막차를 자주 놓치는 직업일 줄은 몰랐죠? 게임에서는 계속 그 이름으로 불러도 돼요.'},
      {name:'소희',line:'목소리는 이미 오래 들었잖아요. 얼굴과 직업이 붙었다고 갑자기 어렵게 대하지 않았으면 해요.'},
    ],
    choices:[
      {id:'same_names',tag:'freedom',text:'사진보다 게임에서 겪은 세 사람이 더 익숙하다고 답한다',harmony:12,trust:9,rest:5,happy:5,stress:-4,result:'유나는 검색창을 닫으라고 농담했고, 채원은 다음 비행 사진을 약속했으며, 소희는 처음으로 무대 뒤 사진을 보내도 되겠다고 답했습니다.'},
      {id:'ask_today',tag:'career',text:'유명세보다 오늘 하루가 어땠는지부터 묻는다',harmony:10,trust:8,rest:5,happy:4,stress:-3,result:'세 사람의 답은 기사나 프로필이 아니라 지연된 비행, 식은 도시락, 끝나지 않은 리허설 이야기로 이어졌습니다.'},
      {id:'search_all',tag:'control',text:'세 사람의 이름을 전부 검색하고 본 내용을 확인하려 든다',harmony:-10,trust:-8,rest:-4,happy:-4,stress:6,result:'대화방은 잠시 조용해졌습니다. 유나가 “우리가 말하기 전에 남이 쓴 설명부터 믿을 거예요?”라고 물었습니다.'},
    ],
  },
  {
    id:'ordinary_photos',title:'2장 · 사진이 쌓이는 밤',icon:'🌙',
    scene:'./assets/event-freedom-chat-yuna.png',
    scenes:[
      {name:'채원',src:'./assets/event-freedom-chat-chaewon.png',caption:'채원은 유니폼을 벗고 창가에 앉은, 밖에는 올리지 못할 퇴근 사진을 보냈다.'},
      {name:'유나',src:'./assets/event-freedom-chat-yuna.png',caption:'유나는 촬영용 표정을 지운 채 진짜 무보정 사진을 올렸다.'},
      {name:'소희',src:'./assets/event-freedom-chat-sohee.png',caption:'소희는 연습이 끝난 작업실에서 가장 사적인 얼굴을 남겼다.'},
    ],
    desc:'단체방에는 밖에서는 보여 주지 못할 편한 차림과 흐트러진 퇴근 사진이 쌓였습니다. 셋은 플레이어를 놀리며 대담하게 사진을 올렸지만, 잠시 뒤 개인 DM에서는 지워 달라거나 방금 말을 잊어 달라고 부탁했습니다. 공개된 장난과 혼자 남았을 때의 불안이 처음으로 갈라집니다.',
    speakers:[
      {name:'채원',line:'바쁜가 보네요. 나중에 봐요. 답장은 안 해도 괜찮아요. 내일 또 보내면 되니까.'},
      {name:'소희',line:'방해한 것 같아서요. 사진은 지웠어요. 다음 게임에서는 평소처럼 할게요.'},
      {name:'유나',line:'요즘 밤마다 왜 갑자기 사라져요? …뭐, 말하기 싫으면 됐어요. 그래도 이상한 건 기억해 둘 거예요.'},
    ],
    choices:[
      {id:'resume_later',tag:'freedom',text:'늦을 때는 늦는다고만 말하고, 다음 날 먼저 대화를 이어 간다',harmony:14,trust:10,rest:7,happy:6,stress:-5,result:'답장이 끊겨도 대화가 끝난 것은 아니라는 리듬이 생겼습니다. 채원은 다음 날 먼저 사진을 보냈고, 소희도 지웠던 작업실 사진을 다시 올렸습니다.'},
      {id:'home_busy',tag:'career',text:'“집에 일이 있어요”라고 알리고 통화와 답장을 다음으로 미룬다',harmony:7,trust:5,rest:5,happy:2,stress:-2,shadowClue:1,result:'유나는 같은 문장이 반복된 횟수를 세었고, 소희는 메시지 수를 줄였으며, 채원은 이유를 묻지 않은 채 다음 날 대화를 이어 갔습니다.'},
      {id:'vanish',tag:'control',text:'설명 없이 매번 대화를 끊고 게임에서만 평소처럼 대한다',harmony:-14,trust:-11,rest:-5,happy:-5,stress:7,shadowClue:2,result:'채원은 괜찮다고 했고, 소희는 자기 자리를 줄였고, 유나는 더 묻지 않았습니다. 셋의 침묵이 배려처럼 보여서 더 불편했습니다.'},
    ],
  },
  {
    id:'short_promises',title:'3장 · 게임이 없는 날의 짧은 약속',icon:'☕',
    scene:'./assets/event-chaewon-7.png',
    scenes:[
      {name:'채원',src:'./assets/event-chaewon-7.png',caption:'채원은 다음 비행 전 공항 복도를 십 분만 함께 걸었다.'},
      {name:'유나',src:'./assets/event-yuna-2.png',caption:'유나는 촬영 차에서 내려 편의점 커피 한 잔만 마셨다.'},
      {name:'소희',src:'./assets/sohee-evnet-4.png',caption:'소희는 모자와 마스크를 쓰고 공연장 근처 카페에 잠깐 나타났다.'},
    ],
    desc:'긴 데이트 대신 세 사람은 각자의 일정 사이에 짧은 약속을 하나씩 만들었습니다. 십 분 산책, 편의점 커피, 공연 전 창가 자리. 게임이 없어도 만날 이유가 생기자 온라인 친구라는 안전한 이름이 조금씩 좁아졌습니다.',
    speakers:[
      {name:'채원',line:'배웅하러 온 건 아니죠? 그럼 탑승구 전까지만 같이 걸어요. 다음에도 보고 싶다는 말은… 돌아와서 할게요.'},
      {name:'유나',line:'사진 찍지 말고 십오 분만. 유명한 사람 만나러 온 얼굴 하지도 말고요.'},
      {name:'소희',line:'짧아서 좋아요. 끝나는 시간이 있으면 시작하는 것도 덜 무서우니까.'},
    ],
    choices:[
      {id:'three_promises',tag:'freedom',text:'세 약속을 비교하지 않고 각자 다음 만남을 직접 정하게 한다',harmony:15,trust:11,rest:8,happy:7,stress:-6,result:'세 사람은 누구의 시간이 더 특별했는지 묻지 않았습니다. 대신 각자 다음 약속을 취소하지 않고 말로 남겼습니다.'},
      {id:'fix_schedule',tag:'career',text:'바쁜 일정을 정리해 주되, 만날지 말지는 각자에게 맡긴다',harmony:9,trust:7,rest:6,happy:4,stress:-3,result:'시간은 조금 길어졌지만 약속의 주인은 그대로였습니다. 유나는 도움을 빚처럼 세지 않았고, 채원과 소희도 다음 시간을 직접 골랐습니다.'},
      {id:'pick_best',tag:'control',text:'가장 즐거웠던 한 사람에게만 다음 약속을 잡자고 한다',harmony:-16,trust:-12,rest:-6,happy:-6,stress:9,result:'선택받은 사람까지 답을 미뤘습니다. 세 사람 모두 특별 취급이 아니라 자신들의 관계를 몰래 갈라놓으려는 방식부터 보았습니다.'},
    ],
  },
  {
    id:'relationship_reveal',title:'4장 · 대답이 늦었던 이유',icon:'🔔',
    scene:'./assets/event-yuna-3.png',
    desc:'첫 외출 뒤, 유나가 단체방에 같은 질문을 다시 올렸습니다. 밤마다 답장이 끊기고 약속을 바로 정하지 못했던 이유를 이제는 모른 척할 수 없습니다.',
    speakers:[
      {name:'유나',line:'가족이나 룸메이트가 있다고 생각했어요. 그런데 일정 확인한다는 말이, 매번 허락을 받는 사람처럼 들렸거든.'},
      {name:'채원',line:'말하기 싫은 사정이면 기다릴 수 있어요. 하지만 우리가 알아야 선택할 수 있는 일까지 괜찮다고 넘기지는 않을게요.'},
      {name:'소희',line:'불편해도 바로 나가지는 않을게요. 먼저 들을게요. 이번에는 우리 대신 결론 내리지 말아 주세요.'},
    ],
    choices:[],
  },
  {
    id:'yuna_left',title:'5장 · 유나 님이 대화방을 나갔습니다',icon:'🚪',
    scene:'./assets/event-yuna-4.png',
    desc:'관계의 이름이 생길 듯한 순간, 유나가 가장 먼저 단체방을 나갔습니다. 화를 낸 것도, 작별을 고한 것도 아닙니다. 버림받을 이유가 생기기 전에 자기가 먼저 끊어 낸 것입니다.',
    speakers:[
      {name:'채원',line:'붙잡으면 더 부담스러울 거예요. …그런데 이렇게 또 이유를 묻지 않는 게 맞는지도 모르겠네요.'},
      {name:'소희',line:'유나가 나갔으니까 저도 조용히 있는 게 낫겠죠. 사람이 줄면 남은 사람은 편해질 테니까.'},
      {name:'유나',line:'누가 잘못했다는 얘기 아니에요. 복잡해질 것 같아서 먼저 정리한 것뿐이야.'},
    ],
    choices:[
      {id:'ask_and_wait',tag:'freedom',text:'단체방에 이유를 묻고, 답할 때까지 자리를 비워 둔다',harmony:16,trust:12,rest:7,happy:5,stress:-5,result:'채원은 처음으로 기다리자고 말했고, 소희는 나가지 않았습니다. 유나의 빈 자리는 대체 인원 모집란이 아니라 답을 기다리는 자리로 남았습니다.'},
      {id:'dm_only',tag:'career',text:'유나에게만 개인 메시지를 보내 조용히 돌아오라고 설득한다',harmony:-6,trust:-5,rest:-2,happy:-2,stress:4,privatePull:true,result:'유나는 답을 읽었지만 돌아오지 않았습니다. 나머지 두 사람을 빼고 자신만 고르려는 연락인지부터 의심했습니다.'},
      {id:'respect_exit',tag:'control',text:'떠날 자유를 존중한다며 길드에서 유나의 자리를 바로 비운다',harmony:-18,trust:-14,rest:-7,happy:-7,stress:9,result:'채원과 소희도 곧 접속을 줄였습니다. 누구도 붙잡지 않았지만, 존중이라는 말 아래 네 사람 모두가 상대의 대답을 듣지 않았습니다.'},
    ],
  },
  {
    id:'three_withdrawals',title:'6장 · 세 사람이 접어 둔 말',icon:'💬',
    scene:'./assets/sohee-evnet-6.png',
    scenes:[
      {name:'채원',src:'./assets/event-chaewon-5.png',caption:'채원은 원래 응원하는 쪽이 더 익숙하다고 마음을 접었다.'},
      {name:'유나',src:'./assets/event-yuna-4.png',caption:'유나는 선택받지 못하기 전에 선택지를 닫았다.'},
      {name:'소희',src:'./assets/sohee-evnet-6.png',caption:'소희는 행복하길 바란다는 말로 자기 자리를 없앴다.'},
    ],
    desc:'세 사람은 서로가 누구를 좋아하는지 이미 알고 있었습니다. 그래서 더 쉽게 물러났습니다. 채원은 응원하는 사람이 되려 했고, 유나는 선택지를 닫았고, 소희는 자기 자리를 없앴습니다. 모두 상대를 위한 결정이라고 믿었습니다.',
    speakers:[
      {name:'채원',line:'나는 원래 누군가를 응원하는 쪽이 더 익숙해요. 외로운 건 잘 숨기면 되니까.'},
      {name:'유나',line:'결국 한 명을 고를 거면 지금 끊는 게 낫잖아. 나중에 버려지는 표정까지 보여 줄 생각은 없어요.'},
      {name:'소희',line:'당신이 행복하면 충분하다고 생각했어요. 그런데 그 말로 당신의 대답까지 없애 버렸네요.'},
    ],
    choices:[
      {id:'hear_everyone',tag:'freedom',text:'누구도 대신 포기하지 말고, 네 사람의 마음을 전부 말하자고 한다',harmony:18,trust:14,rest:8,happy:7,stress:-7,result:'세 사람은 바로 대답하지 않았지만 단체방을 떠나지도 않았습니다. 처음으로 자유가 침묵이 아니라 대화할 시간이라는 뜻이 됐습니다.'},
      {id:'choose_privately',tag:'career',text:'한 사람에게만 따로 연락해 다른 둘은 정리하자고 한다',harmony:-14,trust:-12,rest:-5,happy:-5,stress:8,privatePull:true,result:'개인 메시지는 곧 세 사람 모두가 알게 됐습니다. 누군가를 좋아한 일이 아니라, 나머지 사람의 선택권을 지운 방식이 상처가 됐습니다.'},
      {id:'let_all_go',tag:'control',text:'세 사람이 이미 결정했다면 그대로 친구 관계도 끝낸다',harmony:-20,trust:-16,rest:-8,happy:-8,stress:10,result:'길드 목록에는 네 개의 마지막 접속 시간만 남았습니다. 누구도 정말 끝내고 싶었는지는 끝내 묻지 못했습니다.'},
    ],
  },
  {
    id:'final_choice',title:'7장 · 로그아웃하기 전에 묻는 말',icon:'🎮',
    scene:'./assets/event-yuna-5.png',
    scenes:[
      {name:'채원',src:'./assets/event-chaewon-9.png',caption:'채원은 처음으로 다음에도 만나고 싶다고 먼저 보냈다.'},
      {name:'유나',src:'./assets/event-yuna-5.png',caption:'유나는 차단 대신 헤드셋을 다시 썼다.'},
      {name:'소희',src:'./assets/sohee-evnet-8.png',caption:'소희는 오늘은 못 가도 다음에는 가고 싶다고 답했다.'},
    ],
    desc:'유나가 다시 단체방에 들어왔고, 소희도 음성 채팅을 켰습니다. 채원은 “괜찮으면”이라는 말을 지운 뒤 다음에도 만나고 싶다고 적었습니다. 이제 네 사람은 붙잡지 않는다는 핑계 없이 관계의 이름을 직접 고릅니다.',
    speakers:[
      {name:'채원',line:'떠나도 괜찮다는 말은 할 수 있어요. 그래도 나는 다음에도 만나고 싶어요.'},
      {name:'유나',line:'이번에는 먼저 차단하지 않을게요. 대신 숨기는 관계가 생기면 우리 셋 다 듣는 데서 말해요.'},
      {name:'소희',line:'오늘은 못 가도 다음에는 가고 싶다고 말할게요. 제 자리를 없애는 건 이제 그만할래요.'},
    ],
    choices:[],
  },
];

const DANGEROUS_EXTENSION=[
  {
    id:'dangerous_already_knew',title:'확장 1장 · 이미 알고 있었던 사람들',icon:'🏠',scene:'./assets/event-trio-meeting-7.png',
    desc:'집으로 돌아온 플레이어가 입을 열기도 전에 강유진·한채린·윤세라는 이미 알고 있었다고 말했습니다. 휴대폰을 본 사람은 없습니다. 늘어난 외출, 달라진 연락 시간, 게임 뒤 표정과 일정표의 빈칸이 먼저 말했을 뿐입니다.',
    speakers:[
      {name:'강유진',line:'언제 말하나 기다리고 있었어. 이번에도 모두를 잃기 싫어서 아무 말도 안 할 생각이었어?'},
      {name:'한채린',line:'세 사람을 더 만나는 게 문제라는 뜻은 아니에요. 당신이 여섯 사람의 선택과 생활을 책임질 수 있느냐가 문제죠.'},
      {name:'윤세라',line:'그 사람들이 생기면… 나한테 돌아오는 시간이 줄어들겠네요.'},
    ],
    choices:[
      {id:'sit_down',tag:'freedom',text:'변명하지 않고 세 사람 앞에 앉아 질문을 전부 듣는다',harmony:5,trust:4,rest:-3,happy:-1,stress:5,result:'셋은 화를 내기보다 출구를 막듯 질문의 순서를 정했습니다. 이번에는 사랑한다는 말보다 무엇을 말했고 무엇을 숨겼는지가 먼저였습니다.'},
    ],
  },
  {
    id:'question_truth',title:'확장 2장 · 무엇을 숨겼는가',icon:'📋',scene:'./assets/event-chaerin-9.png',
    desc:'첫 질문은 자유인 세 사람에게 기존 공동생활을 어떻게 설명했는지였습니다.',
    speakers:[
      {name:'한채린',line:'룸메이트라고만 했나요, 관계없는 사람처럼 말했나요, 아니면 사람마다 다른 말을 했나요?'},
      {name:'강유진',line:'아직 못 말했다면 지금 당장 사실대로 말하면 돼. 거짓말을 더 얹지만 마.'},
      {name:'윤세라',line:'우리 이름을 지우고 그 사람들한테 갔던 건 아니죠?'},
    ],
    choices:[
      {id:'truth_was_full',tag:'freedom',text:'공동생활 관계와 합의 내용을 이미 전부 밝혔다고 답한다',harmony:9,trust:8,rest:-1,happy:1,stress:2,result:'채린은 자유인 3인이 같은 정보를 받았는지 다시 확인한 뒤 다음 질문으로 넘어갔습니다.'},
      {id:'truth_now',tag:'career',text:'아직 부족하게 말했다면 지금 즉시 전원에게 같은 사실을 밝히겠다고 한다',harmony:5,trust:4,rest:-2,happy:0,stress:4,result:'유진이 통화를 연결했고, 플레이어는 여섯 사람 모두가 듣는 자리에서 같은 문장으로 관계를 설명했습니다.'},
      {id:'different_promises',tag:'control',text:'사람마다 받아들이기 쉬운 말로 조금씩 다르게 설명했다고 한다',harmony:-30,trust:-30,rest:-15,happy:-12,stress:20,badEnding:'octopus',result:'‘조금씩 다른 설명’은 여섯 사람 앞에서 서로 다른 약속으로 드러났습니다.'},
    ],
  },
  {
    id:'question_choice',title:'확장 3장 · 결국 한 사람만 고르라면',icon:'⚖️',scene:'./assets/event-yujin-night-3.png',
    desc:'두 번째 질문은 사랑의 크기가 아니라 결정 방식에 관한 것이었습니다. 누군가를 몰래 가장 중요하다고 말할 것인지, 모두를 사랑한다는 말 뒤에 책임을 숨길 것인지 확인하는 질문입니다.',
    speakers:[
      {name:'강유진',line:'여섯 명이 다 듣고 있어. 여기서도 사람마다 다른 답을 할 생각은 아니지?'},
      {name:'한채린',line:'전부 사랑한다는 문장만 반복하지 마세요. 시간과 생활과 위기 때의 결정권을 어떻게 나눌지 말해요.'},
      {name:'윤세라',line:'나를 고르라고 하고 싶지만… 몰래 듣고 싶은 대답은 아니에요.'},
    ],
    choices:[
      {id:'decide_together',tag:'freedom',text:'특정 인물을 몰래 고르지 않고 참여자 전원이 알고 함께 결정한다고 답한다',harmony:10,trust:9,rest:-1,happy:1,stress:2,result:'세 사람은 만족해서가 아니라, 적어도 자신들의 선택권이 남아 있다는 이유로 마지막 질문을 허락했습니다.'},
      {id:'pick_secretly',tag:'control',text:'상황에 따라 가장 상처받을 한 사람을 따로 달래겠다고 한다',harmony:-30,trust:-30,rest:-15,happy:-12,stress:20,badEnding:'octopus',result:'달래기 위한 비밀은 곧 가장 중요한 사람이라는 서로 다른 약속이 되었습니다.'},
      {id:'love_all_only',tag:'career',text:'구체적인 규칙 없이 모두 사랑한다는 말만 반복한다',harmony:-20,trust:-22,rest:-12,happy:-10,stress:16,badEnding:'past_repeat',result:'누구의 시간과 선택을 어떻게 지킬지는 끝내 말하지 않았습니다. 침묵이 합의인 것처럼 여섯 사람에게 떠넘겨졌습니다.'},
    ],
  },
  {
    id:'question_departure',title:'확장 4장 · 누군가 떠나겠다면',icon:'🚪',scene:'./assets/event-sera-three-chairs.png',
    desc:'마지막 질문은 두 그룹의 결함 사이에 있었습니다. 붙잡아 선택을 없애지도, 자유라는 말로 이유조차 묻지 않고 보내지도 않아야 합니다.',
    speakers:[
      {name:'윤세라',line:'떠나겠다고 하면 정말 보내 줄 거예요? 아무것도 안 묻고?'},
      {name:'강유진',line:'못 가게 막는 것도 답은 아니야. 그 사람이 혼자 결론내리게 두는 것도 아니고.'},
      {name:'한채린',line:'떠날 자유는 보장하되, 이유와 마음을 말할 자리까지 포기하지 않는다고 답하세요.'},
    ],
    choices:[
      {id:'ask_then_release',tag:'freedom',text:'떠날 자유는 인정하되 이유와 마음을 끝까지 듣고 함께 결론을 확인한다',harmony:12,trust:11,rest:1,happy:2,stress:1,result:'세 사람은 서로 다른 이유로 침묵했습니다. 붙잡음과 방관 사이에 처음으로 여섯 사람이 함께 설 수 있는 문장이 생겼습니다.'},
      {id:'never_leave',tag:'control',text:'사랑한다면 절대 떠나지 못하게 해야 한다고 답한다',harmony:-22,trust:-24,rest:-12,happy:-10,stress:18,badEnding:'past_repeat',result:'광기 3인의 가장 나쁜 답을 그대로 되풀이하자, 자유인 세 사람은 자신들의 자리가 감옥이 될 수 있음을 보았습니다.'},
      {id:'leave_silently',tag:'career',text:'떠나고 싶다면 아무것도 묻지 않고 보내 주겠다고 답한다',harmony:-22,trust:-24,rest:-12,happy:-10,stress:18,badEnding:'past_repeat',result:'자유인 3인의 가장 나쁜 답을 그대로 되풀이하자, 누구도 다음 갈등을 말로 풀 책임을 맡지 않았습니다.'},
    ],
  },
  {
    id:'dangerous_month',title:'확장 5장 · 아무것도 할 수 없었던 한 달',icon:'🗓️',scene:'./assets/event-trio-secure-home-ending.png',
    desc:'광기 3인은 즉시 허락하지 않았습니다. 한 달 동안 게임과 외출은 멈추고, 사업과 세력 업무는 부하가 대행했습니다. 유진은 건강과 외출을, 채린은 업무와 시간표를, 세라는 남은 개인 시간을 차례로 채웠습니다. 휴대폰을 빼앗은 사람은 없었지만 답장을 보낼 정신과 시간이 사라졌습니다.',
    speakers:[
      {name:'강유진',line:'한 달 동안은 다른 데 정신 팔 생각 하지 마. 네가 버틸 수 있는 상태인지부터 볼 거야.'},
      {name:'한채린',line:'한 달 뒤에도 같은 대답을 할 수 있다면 보내드리죠. 그동안 밀리는 일은 제가 정리하겠습니다.'},
      {name:'윤세라',line:'그 한 달이 끝났을 때도… 나한테 돌아오고 싶어야 해요.'},
    ],
    choices:[
      {id:'endure_month',tag:'career',text:'검은 달력과 끊긴 알림 속에서 한 달을 보낸다',harmony:3,trust:5,rest:-18,happy:-5,stress:18,montage:'dangerous',result:'처음 며칠은 벌이라고 생각했습니다. 두 번째 주부터 날짜를 세지 못했고, 마지막 주에는 한 달 뒤 무엇을 하기로 했는지도 흐릿해졌습니다.'},
    ],
  },
  {
    id:'delivered',title:'확장 6장 · 배송 완료',icon:'🧳',scene:'./assets/event-freedom-tro-meeting.png',
    desc:'정확히 한 달 뒤, 플레이어는 교외 펜션에서 캐리어와 게임 장비 옆에 깨어났습니다. 유진의 구급함, 채린의 생활비 카드, 세라의 열쇠고리가 남아 있었습니다. 문을 열자 채원·유나·소희가 기다리고 있었습니다.',
    speakers:[
      {name:'채원',line:'얼굴 보니까 안 묻는 게 낫겠네요. …아니, 이번에는 물어볼게요. 괜찮아요?'},
      {name:'유나',line:'진짜 사람을 택배처럼 보냈네. 반품은 한 달 동안 금지래요. 일단 물부터 마셔요.'},
      {name:'소희',line:'연락이 없어서 이번에는 그냥 기다리지만은 않았어요. 세 분에게 몇 번이나 확인했어요.'},
    ],
    choices:[
      {id:'accept_trial',tag:'freedom',text:'아무도 혼자 빠지지 않는 자유인 3인의 한 달을 시작한다',harmony:10,trust:9,rest:12,happy:7,stress:-10,result:'소희가 게임기를 연결했고, 채원은 따뜻한 죽을 내왔으며, 유나는 담요를 덮어 주었습니다. 이번 한 달은 아무것도 증명하지 않아도 되는 시간으로 시작했습니다.'},
    ],
  },
  {
    id:'freedom_month',title:'확장 7장 · 두 번째로 사라진 한 달',icon:'🌤️',scene:'./assets/event-yuna-5.png',
    scenes:[
      {name:'채원',src:'./assets/event-chaewon-9.png',caption:'돌아올 시간은 물었지만 따라가지는 않았다.'},
      {name:'유나',src:'./assets/event-yuna-5.png',caption:'늦으면 연락하라고 말하고 자기 일상으로 돌아갔다.'},
      {name:'소희',src:'./assets/sohee-evnet-8.png',caption:'기다릴 거라고 숨기지 않고 직접 말했다.'},
    ],
    desc:'첫째 주에는 세 사람이 플레이어를 쉬게 했고, 둘째 주 게임 중 잠든 플레이어에게 조용히 담요를 덮었습니다. 셋째 주 혼자 산책하겠다는 말에 아무도 따라오지 않았습니다. 넷째 주 늦은 귀가에는 위치 추적 대신 세 사람이 깨어 기다리고 있었습니다.',
    speakers:[
      {name:'채원',line:'붙잡지는 않을게요. 그래도 무슨 일이 있었는지는 말해 줘요.'},
      {name:'유나',line:'늦으면 연락해요. 허락받으라는 게 아니라, 우리 마음대로 끝났다고 결론내리지 않게.'},
      {name:'소희',line:'기다릴게요. 이번에는 기다리는 것도, 보고 싶은 것도 숨기지 않을게요.'},
    ],
    choices:[
      {id:'return_and_tell',tag:'freedom',text:'늦은 이유와 돌아오고 싶었던 마음을 세 사람에게 직접 말한다',harmony:14,trust:12,rest:12,happy:9,stress:-12,montage:'freedom',result:'아무도 따라오지 않았고 아무도 사라지지 않았습니다. 두 번째 한 달은 자유가 방관이 아니라 다시 돌아올 말을 남기는 일임을 보여 주었습니다.'},
      {id:'let_them_manage',tag:'career',text:'다음 일정과 연락 규칙을 세 사람에게 전부 맡긴다',harmony:-18,trust:-20,rest:-10,happy:-8,stress:15,badEnding:'past_repeat',result:'광기 3인에게서 벗어난 뒤에도 플레이어는 결정 책임을 다시 다른 세 사람에게 넘겼습니다.'},
    ],
  },
  {
    id:'six_person_pact',title:'확장 8장 · 귀환일, 여섯 사람의 합의',icon:'🤝',scene:'./assets/event-trio-meeting-6.png',
    desc:'귀환일에 광기 3인이 펜션으로 찾아왔습니다. 유진은 건강부터, 채린은 생활 기록부터 확인했고, 세라는 플레이어 옆에 붙었습니다. 자유인 3인도 물러나지 않았습니다. 두 생활권과 여섯 사람의 선택을 한 번에 지킬 규칙을 정할 시간입니다.',
    speakers:[
      {name:'한채린',line:'기존 집은 유지하고 이곳도 유지하죠. 일정은 공유하되 허가제로 만들지 않습니다.'},
      {name:'유나',line:'연락이 없으면 한 번만 확인해요. 추적도 잠수도 금지. 특정 사람하고 몰래 규칙 바꾸는 것도 금지.'},
      {name:'소희',line:'떠나고 싶으면 먼저 이유를 말해요. 붙잡지는 않아도, 아무도 대신 결론내리지 않게.'},
    ],
    choices:[
      {id:'accept_six_rules',tag:'freedom',text:'두 집과 여섯 사람의 선택을 지키는 공동 규칙에 동의한다',harmony:20,trust:16,rest:8,happy:10,stress:-8,finalRoute:'shared',extensionEnding:true,result:'완전히 건강한 합의는 아니었습니다. 그래도 위치 추적과 잠수, 비밀 선택과 허가제를 모두 금지한 채 여섯 사람은 처음으로 같은 게임 파티에 앉았습니다.'},
      {id:'avoid_rules',tag:'control',text:'상황에 따라 알아서 맞추자며 구체적인 합의를 피한다',harmony:-30,trust:-30,rest:-15,happy:-12,stress:20,badEnding:'past_repeat',result:'사람은 달라졌지만 모두를 잃기 싫어 침묵하던 플레이어는 달라지지 않았습니다.'},
    ],
  },
];

function ensure(life){
  if(!life.freedomTrio||typeof life.freedomTrio!=='object'){
    life.freedomTrio={active:false,queued:false,encountered:false,stage:0,harmony:50,rest:45,axes:{freedom:0,career:0,control:0},history:[],personal:{},counseling:{},firstOuting:'locked',ending:null,aftermathIndex:0,gameSessions:0,guildStage:0,guildWarmth:0,guildJoined:false,guildName:GUILD_NAME,identityState:'hidden',entryOutcome:null,onlineOnlyComplete:false};
  }
  const state=life.freedomTrio;
  if(state.groupArcVersion!==3){
    const settled=!!(life.freedomTrioBond&&life.freedomTrioBond.active);
    const previousStage=Math.max(0,Math.floor(finite(state.stage,0)));
    state.groupArcVersion=3;
    if(!settled&&!state.onlineOnlyComplete&&!state.ending&&previousStage>0){
      state.reorderedFromStage=previousStage;
      state.history=Array.isArray(state.history)?state.history:[];
      state.history.push({type:'migration',id:'interleave-personal-with-group',fromStage:previousStage});
    }
  }
  if(state.aftermathVersion!==2){
    state.aftermathVersion=2;
    state.aftermathIndex=0;
  }
  if(!state.axes)state.axes={freedom:0,career:0,control:0};
  if(!Array.isArray(state.history))state.history=[];
  if(!state.personal||typeof state.personal!=='object')state.personal={};
  if(!state.counseling||typeof state.counseling!=='object')state.counseling={};
  if(!['locked','pending','queued','seen','blocked'].includes(state.firstOuting))state.firstOuting='locked';
  state.guildName=GUILD_NAME;
  state.guildJoined=!!state.guildJoined;
  if(!['hidden','revealed'].includes(state.identityState))state.identityState=state.firstOuting==='seen'?'revealed':'hidden';
  if(state.firstOuting==='seen')state.identityState='revealed';
  if(state.entryOutcome!=='offline'&&state.entryOutcome!=='online_only')state.entryOutcome=null;
  state.onlineOnlyComplete=!!state.onlineOnlyComplete;
  state.dangerousDisclosurePending=!!state.dangerousDisclosurePending;
  state.dangerousDisclosureComplete=!!state.dangerousDisclosureComplete;
  if(!state.relationshipDisclosure&&state.dangerousDisclosureComplete)state.relationshipDisclosure='boundary';
  if(['full','boundary','none'].includes(state.relationshipDisclosure)){
    state.dangerousDisclosureComplete=true;
    state.dangerousDisclosurePending=false;
    state.privatePull=false;
  }
  state.harmony=clamp(finite(state.harmony,50),0,100);
  state.rest=clamp(finite(state.rest,45),0,100);
  state.stage=clamp(Math.floor(finite(state.stage,0)),0,STORY_CHAPTERS.length);
  state.aftermathIndex=Math.max(0,Math.floor(finite(state.aftermathIndex,0)));
  state.gameSessions=Math.max(0,Math.floor(finite(state.gameSessions,0)));
  state.guildStage=clamp(Math.floor(finite(state.guildStage,0)),0,3);
  state.guildWarmth=clamp(finite(state.guildWarmth,0),0,100);
  return state;
}
const GUILD_EVENTS=[
  {id:'first_party',title:'새벽 파티 · 닉네임 세 개',scene:'./assets/pixel-event-family-life-v1.png',
    desc:'시우가 알려 준 게임에서 몇 번 같은 파티가 된 세 사람이 장 마감 뒤에도 접속해 있었습니다. 알게 된 지 얼마 되지 않았고 얼굴도 직업도 모르지만, 지금 당신이 일상적인 말을 주고받는 사람은 이 닉네임 셋뿐입니다.',
    choices:[
      {id:'pace',text:'전멸한 파티를 버리지 않고 다음 접속 시간을 남긴다',warmth:12,joinGuild:true,result:'세 사람은 당신을 ‘다음 접속’의 네 번째 정규 인원으로 초대했습니다. 오늘 실패해도 돌아올 자리가 생겼습니다.'},
      {id:'flirt',text:'목소리가 좋다며 개인 연락처부터 묻는다',warmth:-8,result:'세 사람의 목소리가 동시에 차가워졌습니다. “게임 친구를 만나자마자 그렇게 보는 사람이면 다음 파티는 어렵겠네요.”'},
    ]},
  {id:'quiet_guild',title:'다음 접속 · 아무것도 증명하지 않는 길드',scene:'./assets/pixel-event-family-life-v1.png',
    desc:'네 사람은 ‘다음 접속’에서 주말마다 같은 파티를 꾸렸습니다. 현실의 직업과 재산을 묻지 않고, 늦으면 기다리고 지치면 쉰다고 말하는 것이 규칙입니다.',
    choices:[
      {id:'soup',text:'아픈 파티원에게 게임 대신 죽 배달 쿠폰을 보낸다',warmth:16,result:'다음 접속 날 세 사람 모두 같은 값싼 이모티콘으로 고맙다고 답했습니다.'},
      {id:'brag',text:'현실에서 성공한 사람임을 은근히 과시한다',warmth:-7,result:'무보정이 짧게 말했습니다. “여기서는 장비 말고 사람 자랑도 금지예요.”'},
    ]},
  {id:'offline_table',title:'정모 제안 · 화면 밖으로 갈 것인가',scene:'./assets/pixel-event-family-life-v1.png',
    desc:'여섯 번째 게임 밤, 막차요정이 농담처럼 정모를 꺼냈습니다. 누구도 카메라를 켜지 않았고 실명과 직업도 여전히 모릅니다. 네 사람은 현실로 건너가기 전에 지금 지켜야 할 관계부터 확인합니다.',
    choices:[
      {id:'meetup',text:'지금 관계에 숨길 것이 없다면 네 사람이 함께 정모한다',warmth:20,meetup:true,result:'실명은 만나서 말하기로 했습니다. 장소와 시간만 길드 공지에 올라왔습니다.'},
      {id:'online',text:'현실을 캐지 않고 다음 레이드 약속만 잡는다',warmth:8,onlineOnly:true,result:'누구도 실패했다고 말하지 않았습니다. 네 아바타는 다음 레이드 준비 화면에 그대로 남았습니다.'},
    ]},
];

const COUNSELING_EVENTS=[
  {
    id:'chaewon_last_train',name:'채원',icon:'🌙',title:'막차요정 · 도착하지 못한 밤',
    desc:'심야 비행을 마친 채원이 공항 대기실에서 전화를 걸었습니다. 늘 사람을 목적지까지 데려다주면서도 정작 자기 집 현관 앞에서는 한참 서 있게 된다는 고민을 털어놓습니다.',
    lines:[
      '채원: “웃기죠. 남들은 매일 다른 도시까지 데려다주면서, 나는 집 문 하나 여는 게 버거운 날이 있어요.”',
      '당신: “안 웃겨요. 나도 밖으로 나가는 문 앞에서 멈추니까.”',
      '채원: “그럼 누가 먼저 괜찮아지라고 하지 말고, 문 앞에 선 시간부터 서로 보고해요.”'
    ],
    choices:[
      {id:'admit',text:'밖이 무섭다는 말을 숨기지 않고 서로의 현관 시간을 공유한다',affection:4,trust:10,warmth:8,result:'채원은 도착 보고 대신 ‘문 앞’이라는 짧은 메시지를 보내기 시작했습니다. 당신도 답장할 이유가 생겼습니다.'},
      {id:'listen',text:'해결책을 말하지 않고 채원이 집에 들어갈 때까지 통화를 이어 간다',affection:3,trust:8,warmth:7,result:'통화 끝에 문 닫히는 소리가 들렸습니다. 다음에는 채원이 당신 차례를 기다리겠다고 했습니다.'}
    ]
  },
  {
    id:'yuna_camera_off',name:'유나',icon:'📷',title:'무보정 · 카메라를 끈 사람',
    desc:'촬영을 마친 유나가 영상 없이 메시지만 보냈습니다. 밖에 나가면 늘 누군가의 시선과 평가가 따라와, 쉬는 날에는 세상에서 지워지고 싶다는 이야기였습니다.',
    lines:[
      '유나: “사람들이 날 보는 건 익숙한데, 아무도 안 볼 때 내가 누군지는 아직 모르겠어요.”',
      '당신: “나는 반대예요. 아무도 안 보는데도 밖에 나가면 모두가 보는 것 같아요.”',
      '유나: “그럼 첫 외출은 사진도 인증도 없이 해요. 성공했다는 보고도 필요 없게.”'
    ],
    choices:[
      {id:'no_proof',text:'서로에게도 인증을 요구하지 않는 산책 약속을 적어 둔다',affection:4,trust:10,warmth:8,result:'유나는 위치 공유 대신 동네의 조용한 길 하나를 보내 왔습니다. 그 길은 보여 주기 위한 장소가 아니었습니다.'},
      {id:'ordinary',text:'화려한 직업 이야기를 묻지 않고 오늘 먹은 것만 이야기한다',affection:3,trust:8,warmth:7,result:'대화창은 식은 도시락과 편의점 우유 이야기로 채워졌습니다. 유나는 처음으로 카메라 없는 연락을 오래 이어 갔습니다.'}
    ]
  },
  {
    id:'sohee_five_minutes',name:'소희',icon:'🎻',title:'쉼표 · 침묵을 견디는 통화',
    desc:'공연을 앞둔 소희가 아무 말 없이 전화를 걸었습니다. 무대에 오르기 전 숨이 막힐 때 누군가 해결하려 들면 더 힘들어진다며, 딱 다섯 분만 조용히 있어 달라고 합니다.',
    lines:[
      '소희: “말 안 해도 끊지 않을 수 있어요?”',
      '당신: “응. 나도 문밖에 나갈 때는 누가 재촉하지 않았으면 하니까.”',
      '소희: “그럼 다음에는 내가 당신의 다섯 분을 지킬게요. 현관에서 벤치까지만.”'
    ],
    choices:[
      {id:'silence',text:'아무 충고 없이 호흡이 가라앉을 때까지 통화를 지킨다',affection:4,trust:11,warmth:9,result:'다섯 분 뒤 소희가 짧게 웃었습니다. 세 사람의 고민이 모두 당신의 현관 앞과 연결되기 시작했습니다.'},
      {id:'hum',text:'게임에서 들었던 짧은 회복 음악만 낮게 흥얼거린다',affection:5,trust:8,warmth:8,result:'소희는 다음 공연 전에도 그 소리를 부탁했습니다. 대신 당신이 나가는 날에는 자신이 전화를 걸겠다고 했습니다.'}
    ]
  }
];

const FIRST_OUTING={
  id:'first_offline_table',icon:'🎮',title:'첫 정모 · 네 개의 표식, 처음 보는 얼굴',scene:'./assets/pixel-event-family-life-v1.png',
  desc:'조용한 게임 카페 독립실에서 길드 표식이 달린 네 개의 키링이 처음 한 테이블에 놓였습니다. 이 자리에서야 막차요정은 채원, 무보정은 유나, 쉼표는 소희라는 이름과 서로의 현실 직업을 처음 알게 됩니다.'
};
const DANGEROUS_DISCLOSURE={
  id:'dangerous_shared_disclosure',icon:'📱',title:'다음 접속 · 말하지 않았던 세 사람',
  desc:'정모 뒤에도 네 사람의 게임과 연락은 이어졌습니다. 이제 플레이어는 광기 3인조와 공동생활 중이라는 사실을, 누군가에게 들키기 전에 직접 말해야 합니다.',
  choices:[
    {id:'full',text:'세 사람과 합의한 관계와 공동생활 사실을 전부 말한다',warmth:10,trust:7,result:'채원은 왜 이제 말했는지 물었고, 유나는 잠깐 단체방을 나갔다 돌아왔으며, 소희는 대답을 재촉하지 않았습니다. 그래도 누구도 차단하지 않았습니다.'},
    {id:'boundary',text:'사생활의 세부 내용은 숨기되 공동생활과 합의된 관계라는 점은 분명히 밝힌다',warmth:6,trust:4,result:'세 사람은 알고 싶은 것보다 반드시 알아야 했던 경계부터 확인했습니다. 불편함은 남았지만 숨겨진 관계는 더 없었습니다.'},
  ],
};
function chapterTwoUnlocked(life){
  const faction=life&&life.faction||{},trio=life&&life.dangerousTrio||{};
  if((faction.level||0)<1)return false;
  const legacySera=rec(life,'윤세라'),housing=life.seraHousing||(legacySera&&legacySera.pickedUpAfterRuin?'cohabit':null);
  if(['separate','reject'].includes(housing))return true;
  if(housing!=='cohabit')return false;
  return !!(trio.ending||(life.dangerousTrioBond&&life.dangerousTrioBond.active));
}
function playGuild(life){
  const state=ensure(life),needs=[2,4,6],index=state.guildStage;
  state.gameSessions++;
  if(index===2&&!chapterTwoUnlocked(life)){
    state.meetupDeferred=true;
    return null;
  }
  state.meetupDeferred=false;
  return index<GUILD_EVENTS.length&&state.gameSessions>=needs[index]?GUILD_EVENTS[index].id:null;
}
function guildEvent(id){return GUILD_EVENTS.find(event=>event.id===id)||null;}
function resolveGuild(life,id,choiceId){
  const state=ensure(life),event=guildEvent(id),choice=event&&event.choices.find(item=>item.id===choiceId);
  if(!event||!choice)return null;
  if(id==='offline_table'&&!chapterTwoUnlocked(life)){
    state.meetupDeferred=true;
    return{event,choice:null,state,reveal:false,onlineOnly:false,meetupQueued:false,blockedReason:'chapter_order'};
  }
  state.guildWarmth=clamp(state.guildWarmth+(choice.warmth||0),0,100);
  if(choice.warmth>=0)state.guildStage=Math.max(state.guildStage,GUILD_EVENTS.indexOf(event)+1);
  else state.gameSessions=Math.max(0,state.gameSessions-1);
  if(choice.joinGuild)state.guildJoined=true;
  let onlineOnly=false,meetupQueued=false,blockedReason=null;
  if(event.id==='offline_table'&&choice.warmth>=0){
    const mode=relationshipMode(life);
    const fullEntry=mode.none||mode.dangerousShared;
    if(choice.onlineOnly||!fullEntry){
      onlineOnly=true;
      blockedReason=mode.exclusive?'exclusive_partner':!mode.none&&!mode.dangerousShared?'unsupported_group':'player_choice';
      state.entryOutcome='online_only';
      state.onlineOnlyComplete=true;
      state.firstOuting='blocked';
      state.identityState='hidden';
    }else if(choice.meetup){
      meetupQueued=true;
      state.entryOutcome='offline';
      state.onlineOnlyComplete=false;
      state.firstOuting='queued';
      state.identityState='hidden';
    }
  }
  state.history.push({type:'guild',id,choice:choice.id});
  return{event,choice,state,reveal:false,onlineOnly,meetupQueued,blockedReason};
}
function revealed(life){
  const state=ensure(life);
  return state.identityState==='revealed'&&state.firstOuting==='seen';
}
function canContact(life,name){
  return !NAMES.includes(name)||revealed(life);
}
function canMeetOffline(life,name){
  return !NAMES.includes(name)||(revealed(life)&&ensure(life).firstOuting==='seen');
}
function relationshipNames(life){
  if(root.QT_RELATIONSHIPS&&typeof root.QT_RELATIONSHIPS.names==='function'){
    return root.QT_RELATIONSHIPS.names(life).slice();
  }
  const names=[];
  const add=name=>{if(name&&!names.includes(name))names.push(name);};
  if(life.partner)add(life.partner.name);
  ((life.relationshipGroup&&life.relationshipGroup.members)||[]).forEach(person=>add(typeof person==='string'?person:person.name));
  ((life.polycule&&life.polycule.members)||[]).forEach(person=>add(typeof person==='string'?person:person.name));
  return names;
}
function relationshipMode(life){
  const names=relationshipNames(life);
  const dangerousShared=!!(life.dangerousTrioBond&&life.dangerousTrioBond.active);
  const groupActive=!!(dangerousShared||(life.businessQuartetBond&&life.businessQuartetBond.active)||(life.childhoodCircleBond&&life.childhoodCircleBond.active)||(life.polycule&&life.polycule.active&&names.length>1));
  return{names,none:names.length===0,poly:groupActive||names.length>1,exclusive:names.length===1&&!groupActive,dangerousShared,canAdvance:names.length===0||dangerousShared};
}
function disclosureComplete(state){
  return !!(state&&['full','boundary','none'].includes(state.relationshipDisclosure)&&!state.privatePull);
}
function storyMode(life){
  if((life.dangerousTrioBond&&life.dangerousTrioBond.active)||(life.dangerousTrio&&life.dangerousTrio.badFriendsFormed))return'guarded';
  if(!life.outsideFearResolved&&!life.freedomRescueComplete)return'rescue';
  return'social';
}
function nextCounselingEvent(life){
  const state=ensure(life);
  if(state.groupArcVersion>=2)return null;
  if(!revealed(life)||state.firstOuting!=='seen'||state.onlineOnlyComplete)return null;
  return COUNSELING_EVENTS.find(event=>state.counseling[event.id]!=='seen')||null;
}
function queueCounseling(life){
  const state=ensure(life),event=nextCounselingEvent(life);
  if(!event)return null;
  if(state.counseling[event.id]==='queued')return event.id;
  state.counseling[event.id]='queued';
  return event.id;
}
function counselingEvent(id){return COUNSELING_EVENTS.find(event=>event.id===id)||null;}
function applyCounseling(life,id,choiceId){
  const state=ensure(life),event=counselingEvent(id),person=event&&rec(life,event.name);
  if(!event||!person)return null;
  const choice=event.choices.find(item=>item.id===choiceId);if(!choice)return null;
  person.affection=clamp((person.affection||0)+(choice.affection||0),0,100);
  person.trust=clamp((person.trust||0)+(choice.trust||0),0,100);
  state.guildWarmth=clamp(state.guildWarmth+(choice.warmth||0),0,100);
  state.counseling[id]='seen';
  state.history.push({type:'counseling',id,choice:choice.id,mode:storyMode(life)});
  return{event,choice,r:person,state,complete:COUNSELING_EVENTS.every(item=>state.counseling[item.id]==='seen')};
}
function counselingComplete(life){
  const state=ensure(life);
  if(state.groupArcVersion>=2)return true;
  return COUNSELING_EVENTS.every(event=>state.counseling[event.id]==='seen');
}
function queueFirstOuting(life){
  const state=ensure(life);
  if(!chapterTwoUnlocked(life)){state.meetupDeferred=true;return false;}
  if(state.entryOutcome!=='offline'||state.onlineOnlyComplete||state.firstOuting==='seen'||state.firstOuting==='blocked')return false;
  const mode=relationshipMode(life);
  if(!mode.canAdvance){
    state.entryOutcome='online_only';
    state.onlineOnlyComplete=true;
    state.firstOuting='blocked';
    return false;
  }
  if(state.firstOuting==='queued')return true;
  state.firstOuting='queued';
  return true;
}
function deferFirstOuting(life){
  const state=ensure(life);
  if(state.firstOuting==='queued')state.firstOuting='pending';
  return state;
}
function applyFirstOuting(life){
  const state=ensure(life);
  if(state.entryOutcome!=='offline'||state.firstOuting!=='queued')return null;
  const relation=relationshipMode(life);
  if(!relation.canAdvance){
    state.entryOutcome='online_only';
    state.onlineOnlyComplete=true;
    state.firstOuting='blocked';
    state.identityState='hidden';
    return{state,mode:storyMode(life),event:FIRST_OUTING,blocked:true,reason:relation.exclusive?'exclusive_partner':'relationship_changed'};
  }
  const mode=storyMode(life);
  state.firstOuting='seen';
  state.identityState='revealed';
  state.dangerousDisclosurePending=!!relation.dangerousShared;
  state.history.push({type:'first-outing',mode});
  if(mode==='rescue'){
    life.freedomRescueComplete=true;
    life.outsideFearResolved=true;
  }
  if(root.QT_ROMANCE_ROUTES)root.QT_ROMANCE_ROUTES.engage(life,'freedom',mode==='rescue'?'shut_in_rescue':'first_outing');
  NAMES.forEach(name=>{const person=rec(life,name);if(person){person.affection=clamp((person.affection||0)+4,0,100);person.trust=clamp((person.trust||0)+6,0,100);}});
  return{state,mode,event:FIRST_OUTING,reveal:true};
}
function dangerousDisclosureReady(life){
  const state=ensure(life);
  return !!(state.dangerousDisclosurePending&&!state.dangerousDisclosureComplete&&revealed(life)&&counselingComplete(life));
}
function applyDangerousDisclosure(life,choiceId){
  const state=ensure(life),choice=DANGEROUS_DISCLOSURE.choices.find(item=>item.id===choiceId);
  if(!choice||!dangerousDisclosureReady(life))return null;
  state.dangerousDisclosurePending=false;
  state.dangerousDisclosureComplete=true;
  state.relationshipDisclosure=choice.id==='full'?'full':'boundary';
  state.privatePull=false;
  state.guildWarmth=clamp(state.guildWarmth+(choice.warmth||0),0,100);
  NAMES.forEach(name=>{const person=rec(life,name);if(person)person.trust=clamp((person.trust||0)+(choice.trust||0),0,100);});
  state.history.push({type:'dangerous-disclosure',choice:choice.id});
  return{event:DANGEROUS_DISCLOSURE,choice,state};
}
function nextPersonalEvent(life){
  const state=ensure(life);
  if(!state.active||!revealed(life)||state.firstOuting!=='seen')return null;
  if(state.dangerousDisclosurePending&&!state.dangerousDisclosureComplete)return null;
  const firstRound=['chaewon_layover','yuna_offcamera','sohee_emptyhall'];
  const secondRound=['chaewon_transfer','yuna_contract','sohee_overseas'];
  const available=state.stage===1?firstRound:state.stage>=2?[...firstRound,...secondRound]:[];
  return available.map(id=>({id,event:PERSONAL_EVENTS[id]})).find(({id,event})=>{
    const person=rec(life,event.name);
    if(!person||['ex','deceased'].includes(person.status)||state.personal[id]==='seen')return false;
    if((person.affection||0)<event.min)return false;
    return !event.after||state.personal[event.after]==='seen';
  })||null;
}
function personalCheckpointComplete(life,stage=ensure(life).stage){
  const state=ensure(life);
  if(stage<=0)return true;
  const required=stage===1
    ?['chaewon_layover','yuna_offcamera','sohee_emptyhall']
    :Object.keys(PERSONAL_EVENTS);
  return required.every(id=>state.personal[id]==='seen');
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
  return{event,choice,r:person,state,checkpointComplete:personalCheckpointComplete(life,state.stage),resumeStage:state.stage};
}
function progress(life){
  const isRevealed=revealed(life);
  return NAMES.map(name=>{
    const person=isRevealed?rec(life,name):null,ids=Object.entries(PERSONAL_EVENTS).filter(([,event])=>event.name===name).map(([id])=>id);
    const seen=ids.filter(id=>ensure(life).personal[id]==='seen').length;
    const active=!!person&&!['ex','deceased'].includes(person.status);
    const ready=active&&seen===ids.length&&(person.affection||0)>=45&&(person.trust||0)>=20;
    return{name,met:!!person,active,seen,total:ids.length,affection:person&&person.affection||0,trust:person&&person.trust||0,ready,
      need:!person?'아직 만나지 못함':!active?`현재 관계: ${person.status||'지인'} · 관계가 끊김`:seen<ids.length?`개별 이벤트 ${seen}/${ids.length}`:(person.affection||0)<45?`호감 ${Math.round(person.affection||0)}/45`:`신뢰 ${Math.round(person.trust||0)}/20`};
  });
}
function individualStoriesComplete(life){
  const state=ensure(life);
  return NAMES.every(name=>{
    const person=rec(life,name);
    if(!person)return false;
    if(['ex','deceased'].includes(person.status))return true;
    const ids=Object.entries(PERSONAL_EVENTS).filter(([,event])=>event.name===name).map(([id])=>id);
    return ids.every(id=>state.personal[id]==='seen');
  });
}
function storyComplete(life){
  const state=ensure(life);
  if(state.onlineOnlyComplete)return true;
  return revealed(life)&&counselingComplete(life)&&state.firstOuting==='seen'&&individualStoriesComplete(life)&&!!state.ending;
}
function resolveUnavailable(life){
  const state=ensure(life),people=NAMES.map(name=>rec(life,name));
  if(state.ending||!revealed(life)||!counselingComplete(life)||state.firstOuting!=='seen'||!individualStoriesComplete(life)||
    !people.some(person=>person&&['ex','deceased'].includes(person.status)))return false;
  state.active=false;state.queued=false;state.encountered=true;
  state.ending={id:'friends_departed',title:'비어 있는 게임 파티',tone:'neutral',scene:'./assets/event-freedom-bad-repeat.png',text:'세 사람의 고민과 개인 이야기는 모두 끝났지만 누군가는 현실의 인연을 정리했습니다. 남은 사람들은 게임 친구로 안부를 나누고, 공동 관계 제안은 오지 않습니다.'};
  if(root.QT_ROMANCE_ROUTES)root.QT_ROMANCE_ROUTES.complete(life,'freedom',state.ending.id,'good');
  return true;
}
function confessionReady(life){
  const state=ensure(life),routes=root.QT_ROMANCE_ROUTES;
  return !!(!state.onlineOnlyComplete&&state.finalRoute==='shared'&&state.ending&&relationshipMode(life).canAdvance&&storyComplete(life)&&state.ending.tone==='good'&&(!routes||routes.romanceAvailable(life,'freedom')));
}
function marketRumorAvailable(life){
  const state=ensure(life);
  return !state.onlineOnlyComplete&&revealed(life)&&storyComplete(life)&&NAMES.some(name=>{
    const person=rec(life,name);
    return person&&!['ex','deceased'].includes(person.status)&&['friend','partner','polycule','lover'].includes(person.status);
  });
}
function eligibility(life){
  const state=ensure(life),rows=progress(life),mode=relationshipMode(life),integratedDangerous=!!(life.dangerousTrioBond&&life.dangerousTrioBond.active);
  const guard=root.QT_ROMANCE_ROUTES&&root.QT_ROMANCE_ROUTES.canStart(life,'freedom');
  const routeState=root.QT_ROMANCE_ROUTES&&root.QT_ROMANCE_ROUTES.ensure(life);
  const dangerousPriority=!!(root.QT_ROMANCE_ROUTES&&root.QT_ROMANCE_ROUTES.engaged(life,'dangerous')&&
    !integratedDangerous&&!routeState.completed.dangerous&&!routeState.failed.dangerous&&!routeState.declined.dangerous);
  const storyReady=revealed(life);
  return{ok:(!guard||guard.ok)&&!dangerousPriority&&!state.encountered&&!state.active&&!state.ending&&state.firstOuting==='seen'&&mode.canAdvance&&storyReady,partner:mode.names.length>0,friendOnly:mode.exclusive,relationshipMode:mode,dangerous:integratedDangerous,integratedDangerous,dangerousPriority,outsiders:[],rows,guard};
}
function queue(life){
  const check=eligibility(life),state=ensure(life);
  if(!check.ok||state.queued)return false;
  state.queued=true;return true;
}
function cancelQueue(life){
  const state=ensure(life);
  state.queued=false;
  return state;
}
function start(life){
  const check=eligibility(life);if(!check.ok)return{ok:false,check};
  if(root.QT_ROMANCE_ROUTES&&!root.QT_ROMANCE_ROUTES.begin(life,'freedom').ok)return{ok:false,check:eligibility(life)};
  const state=ensure(life);
  state.active=true;state.queued=false;state.encountered=true;state.stage=Math.max(0,state.stage||0);state.harmony=Math.max(50,state.harmony||0);state.rest=Math.max(45,state.rest||0);state.ending=null;
  NAMES.forEach(name=>{const person=rec(life,name);if(person){person.trust=clamp((person.trust||0)+3,0,100);if(person.status==='acquaintance')person.status='friend';}});
  return{ok:true,state,chapter:chapterFor(life,state.stage)};
}
function next(life){
  const state=ensure(life);
  if(state.active&&!state.ending&&state.extensionActive)return extensionChapterFor(life,state.extensionStage||0);
  if(!state.active||state.ending||!personalCheckpointComplete(life,state.stage))return null;
  return chapterFor(life,state.stage);
}
function extensionChapterFor(life,index){
  const base=DANGEROUS_EXTENSION[index];if(!base)return null;
  return Object.assign({},base,{speakers:(base.speakers||[]).slice(),choices:(base.choices||[]).slice(),scenes:(base.scenes||[]).slice()});
}
function chapterFor(life,index){
  const base=STORY_CHAPTERS[index];if(!base)return null;
  const mode=relationshipMode(life),state=ensure(life);
  const chapter=Object.assign({},base,{speakers:(base.speakers||[]).slice(),choices:(base.choices||[]).slice(),scenes:(base.scenes||[]).slice()});
  if(base.id==='ordinary_photos'&&mode.dangerousShared){
    chapter.desc+=' 저녁에는 함께 식사하느라 답장이 늦고, 음성 채팅 뒤에서 누군가 부르는 소리가 들렸습니다. 누구도 휴대폰을 빼앗거나 메시지를 읽지는 않았지만 플레이어의 밤은 온전히 자유롭지 않았습니다.';
    chapter.afterText='화면을 끄고 거실로 돌아가자 유진은 식는 저녁을 불렀고, 채린은 내일 일정만 물었으며, 세라는 소파 옆자리를 비워 두었습니다. 셋은 휴대폰 내용을 묻지 않았습니다. 적어도 아직은.';
  }
  if(base.id==='relationship_reveal'){
    if(mode.dangerousShared){
      if(disclosureComplete(state)){
        chapter.desc='첫 정모 직후 기존 공동생활과 관계를 이미 공개했습니다. 유나가 다시 묻는 것은 공개 여부가 아니라, 그 사실을 안 뒤에도 세 사람이 같은 선택권을 갖고 있는지 확인하기 위해서입니다.';
        chapter.choices=[
          {id:'confirm_disclosure',tag:'freedom',text:'이미 밝힌 관계와 생활 규칙을 바꾸지 않고 다시 확인한다',harmony:12,trust:10,rest:3,happy:2,stress:0,disclosure:state.relationshipDisclosure,result:'세 사람은 같은 설명을 다시 들은 뒤 더는 공개를 선행 조건처럼 요구하지 않았습니다. 이제 남은 것은 정보를 가진 상태에서 각자가 관계를 선택하는 일입니다.'},
          {id:'clarify_boundaries',tag:'career',text:'공개한 사실 위에 각자의 연락·외출·거절권을 구체적으로 덧붙인다',harmony:10,trust:9,rest:4,happy:2,stress:-1,disclosure:state.relationshipDisclosure,result:'이미 공개된 관계를 반복 고백하는 대신, 네 사람이 앞으로 지킬 실제 규칙이 단체방에 남았습니다.'},
        ];
      }else{
        chapter.desc='첫 외출 뒤, 플레이어는 강유진·한채린·윤세라와 합의된 공동생활 중이라는 사실을 직접 밝혔습니다. 세 사람은 이상했던 밤의 공백을 이제야 이해했지만, 이해와 동의는 같은 말이 아니었습니다.';
        chapter.choices=[
          {id:'disclose_all',tag:'freedom',text:'기존 관계와 공동생활 규칙을 숨김없이 설명한다',harmony:13,trust:11,rest:3,happy:1,stress:2,disclosure:'full',result:'채원은 왜 이제 말했는지 물었고, 유나는 한동안 입력 중인 채 멈췄으며, 소희는 끝까지 들었습니다. 충격은 남았지만 세 사람의 선택권은 돌아왔습니다.'},
          {id:'disclose_boundary',tag:'career',text:'사적인 세부는 남기되 합의된 관계와 생활 제약은 분명히 말한다',harmony:8,trust:7,rest:3,happy:1,stress:1,disclosure:'boundary',result:'세 사람은 묻지 말아야 할 부분과 반드시 알아야 했던 부분을 나눴습니다. 유나는 “적어도 우리가 뭘 선택하는지는 알게 됐네요”라고 답했습니다.'},
          {id:'conceal',tag:'control',text:'룸메이트일 뿐이라며 관계의 성격을 계속 숨긴다',harmony:-18,trust:-15,rest:-4,happy:-5,stress:9,disclosure:'concealed',privatePull:true,result:'유나는 설명보다 문장의 빈틈을 먼저 보았습니다. 채원은 더 묻지 않았고, 소희는 메시지를 줄였습니다. 세 사람은 아직 진실을 모르지만 이미 신뢰가 꺾였습니다.'},
        ];
      }
    }else{
      chapter.scene='./assets/event-freedom-tro-meeting.png';
      chapter.desc='첫 외출 뒤, 유나가 단체방에 플레이어의 현재 관계를 직접 물었습니다. 숨겨 둔 연인도 공동생활도 없다는 답에 세 사람은 잠깐 조용해졌다가, 생각보다 담담하게 다음 게임 이야기를 꺼냈습니다.';
      chapter.speakers=[
        {name:'유나',line:'그냥 확인한 거예요. 아무도 없다고 갑자기 우리 중 누굴 고르라는 뜻은 아니고.'},
        {name:'채원',line:'그렇구나. 그럼 서두를 이유도 없네요. 다음 약속도 지금처럼 짧게 잡아요.'},
        {name:'소희',line:'다행이라고 말하면 이상하겠죠. 그냥… 알겠어요. 다음 레이드 시간은 그대로죠?'},
      ];
      chapter.choices=[
        {id:'no_pressure',tag:'freedom',text:'누구도 고르지 않고 지금의 네 사람을 더 알아가자고 한다',harmony:13,trust:10,rest:6,happy:5,stress:-4,disclosure:'none',result:'세 사람은 안도한 티를 숨기며 다음 약속을 잡았습니다. 관계의 가능성은 생겼지만 누구도 그것을 빚처럼 요구하지 않았습니다.'},
        {id:'honest_interest',tag:'career',text:'마음은 생기고 있지만 아직 결론을 대신 내리지 않겠다고 말한다',harmony:10,trust:9,rest:4,happy:4,stress:-2,disclosure:'none',result:'유나는 솔직한 건 마음에 든다고 했고, 채원과 소희도 각자의 답을 서두르지 않기로 했습니다.'},
        {id:'tease_choice',tag:'control',text:'세 사람 중 누가 가장 가능성 있어 보이냐고 되묻는다',harmony:-10,trust:-8,rest:-3,happy:-3,stress:6,disclosure:'none',result:'농담은 웃음으로 끝나지 않았습니다. 세 사람은 자신들의 우정이 선택 대기표가 되는 순간을 경계했습니다.'},
      ];
    }
  }
  if(base.id==='final_choice'){
    if(mode.exclusive){
      chapter.desc='원래 이 관계 상태에서는 정모가 열리지 않습니다. 이전 저장이나 외부 고백으로 이 장면까지 도달했다면, 기존 연인을 존중해 세 사람과 현실 관계를 정리하는 것이 정상 결과입니다.';
      chapter.choices=[
        {id:'exclusive_fade',tag:'freedom',text:'기존 연인을 존중하고 세 사람과는 온라인 친구로 조용히 돌아간다',harmony:8,trust:8,rest:5,happy:3,stress:-4,finalRoute:'friends',exclusiveFade:true,result:'세 사람은 이유를 캐묻지 않았고 현실 연락을 천천히 줄였습니다. 게임 안에서는 닉네임으로만 안부를 나누는 정상적인 거리로 돌아갔습니다.'},
        {id:'exclusive_confess',tag:'control',text:'기존 연인을 숨긴 채 자유인 3인에게 고백을 강행한다',harmony:-30,trust:-30,rest:-15,happy:-12,stress:20,badEnding:'other_promises',result:'기존 연인과 자유인 세 사람 모두가 다른 약속을 동시에 확인했습니다. 어느 관계에도 다시 설명할 기회가 남지 않았습니다.'},
      ];
    }else if(mode.dangerousShared){
      const canNegotiate=disclosureComplete(state);
      chapter.desc='광기 3인과의 공동생활은 그대로입니다. 자유인 세 사람은 그 집으로 들어가지 않습니다. 기존 생활을 숨기지 않고 각자의 집에서 연락을 이어 갈지, 한 사람만 몰래 빼내 관계를 다시 무너뜨릴지 마지막 선택이 남았습니다.';
      chapter.choices=[
        {id:'dangerous_shared',tag:'freedom',text:'세 사람의 제안을 받아들이되, 먼저 두 그룹 모두에게 공개하고 함께 결정하겠다고 답한다',harmony:12,trust:10,rest:2,happy:3,stress:2,startExtension:true,requiresDisclosure:true,disabled:!canNegotiate,result:canNegotiate?'자유인 세 사람은 플레이어 혼자 광기 3인에게 먼저 설명할 시간을 주었습니다. 집에 돌아가자 세 사람은 이미 생활의 변화를 눈치채고 기다리고 있었습니다.':'숨긴 관계와 개인 접촉이 남아 있어 공개 협의를 시작할 수 없습니다.'},
        {id:'dangerous_secret',tag:'control',text:'자유인 중 한 사람만 선택해 기존 관계와 나머지에게 숨긴다',harmony:-30,trust:-25,rest:-12,happy:-10,stress:18,badEnding:'octopus',result:'비밀 메시지는 두 단체방 모두에 알려졌습니다. 기존 합의와 자유인 세 사람의 신뢰를 동시에 지운 선택이었습니다.'},
        {id:'dangerous_friends',tag:'career',text:'세 사람 모두와 현실 친구로 남고 현재 공동생활을 지킨다',harmony:10,trust:9,rest:7,happy:5,stress:-5,finalRoute:'friends',result:'누구도 패배했다고 말하지 않았습니다. 세 사람은 연애가 아닌 다음 게임 날짜를 남겼고, 각자의 집에서 연락을 이어 갔습니다.'},
      ];
    }else{
      chapter.choices=[
        {id:'choose_chaewon',tag:'career',text:'채원의 둘만의 다음 약속 제안을 받아들인다',harmony:8,trust:8,rest:6,happy:7,stress:-4,finalRoute:'individual',target:'채원',result:'채원은 나머지 두 사람에게 숨기지 않고 마음을 밝혔습니다. 유나와 소희는 길드 친구로 남았고, 채원은 처음으로 자신도 기다려 달라고 부탁했습니다.'},
        {id:'choose_yuna',tag:'career',text:'유나가 먼저 내민 둘만의 약속을 받아들인다',harmony:8,trust:8,rest:6,happy:7,stress:-4,finalRoute:'individual',target:'유나',result:'유나는 차단하지 않고 자기 마음을 먼저 말했습니다. 채원과 소희를 지우지 않은 채, 둘의 개인 연락이 새로운 순애 루트로 이어졌습니다.'},
        {id:'choose_sohee',tag:'career',text:'소희가 어렵게 말한 다음 약속을 받아들인다',harmony:8,trust:8,rest:6,happy:7,stress:-4,finalRoute:'individual',target:'소희',result:'소희는 오늘은 어렵지만 다음 주에는 만나고 싶다고 직접 말했습니다. 채원과 유나는 게임 친구로 그 자리를 지켰습니다.'},
        {id:'shared_party',tag:'freedom',text:'세 사람이 먼저 제안한 “각자의 집, 같은 파티” 관계를 받아들인다',harmony:18,trust:14,rest:10,happy:9,stress:-7,finalRoute:'shared',result:'네 사람은 동거도 위치 공유도 약속하지 않았습니다. 대신 쉬면 쉰다고, 끝내고 싶으면 직접 말한다고, 한 사람만 몰래 빼내지 않는다고 합의했습니다.'},
        {id:'friends_only',tag:'freedom',text:'누구도 선택하지 않고 네 사람의 현실 친구 관계를 지킨다',harmony:12,trust:11,rest:8,happy:6,stress:-6,finalRoute:'friends',result:'고백하지 않았다고 관계가 실패한 것은 아니었습니다. 네 사람은 얼굴과 직업을 아는 현실 친구이자 다음 접속을 기다리는 길드원으로 남았습니다.'},
      ];
    }
  }
  return chapter;
}
function finalEnding(life,state,choice){
  const scene=choice.target==='채원'?'./assets/event-chaewon-9.png':choice.target==='유나'?'./assets/event-yuna-5.png':choice.target==='소희'?'./assets/sohee-evnet-8.png':'./assets/event-yuna-5.png';
  if(choice.badEnding==='octopus')return{id:'octopus_fall',title:'배드엔딩 · 문어다리의 최후',tone:'bad',scene:'./assets/event-freedom-bad-octopus.png',text:'모두를 놓치지 않으려고 서로 다른 약속을 했습니다. 약속들이 한자리에 모인 날 유나는 차단했고, 소희는 기록을 지웠으며, 채원은 웃지 않고 떠났습니다. 광기 3인도 같은 거짓말을 확인했고 공동생활 집의 문까지 닫혔습니다.'};
  if(choice.badEnding==='past_repeat')return{id:'past_repeated',title:'배드엔딩 · 또다시 과거가 반복되었다',tone:'bad',scene:'./assets/event-freedom-bad-repeat.png',text:'사람은 달라졌습니다. 하지만 모두를 잃기 싫어 구체적인 책임을 말하지 않던 플레이어는 달라지지 않았습니다. 연락 우선권과 일정, 생활비와 공개 관계가 충돌한 뒤 여섯 사람은 서로를 경쟁자로 남겨 둔 채 떠났습니다.'};
  if(choice.badEnding==='other_promises')return{id:'other_promises',title:'배드엔딩 · 모두에게 다른 약속',tone:'bad',scene:'./assets/event-freedom-bad-octopus.png',text:'기존 연인과 자유인 세 사람에게 서로 다른 미래를 약속했습니다. 숨긴 고백이 한자리에 모이자 기존 연인도, 세 사람의 현실 우정도 함께 끝났습니다.'};
  if(choice.finalRoute==='secret_bad')return{id:'secret_choice',title:'비밀 메시지가 도착한 두 단체방',tone:'bad',scene:'./assets/event-yuna-4.png',text:'한 사람을 좋아한 것이 문제가 아니었습니다. 기존 공동생활과 자유인 세 사람 모두에게 필요한 사실을 숨기고, 두 관계의 선택권을 자기 편의대로 잘라 낸 순간 누구도 답장을 보내지 않았습니다.'};
  if(choice.finalRoute==='individual')return{id:`${choice.target}_personal_open`,title:`${choice.target} 개인 순애 · 다음 약속`,tone:'good',scene,text:`${choice.target}과의 개인 순애 이야기가 열렸습니다. 나머지 두 사람은 사라지지 않고 게임 친구 또는 현실 친구로 남습니다.`};
  if(choice.finalRoute==='friends')return{id:'four_friends',title:'연애가 아니어도 다음 접속',tone:'neutral',scene:'./assets/event-freedom-tro-meeting.png',text:'네 사람은 누구도 선택하지 않았습니다. 그래도 실명과 일상을 아는 현실 친구로 남아, 게임이 없는 날에도 먼저 안부를 묻습니다.'};
  if(choice.finalRoute==='shared'&&(state.harmony<30||state.privatePull||state.relationshipDisclosure==='concealed'))return{id:'broken_trust',title:'공개되지 못한 파티',tone:'bad',scene:'./assets/event-yuna-4.png',text:'공동 관계를 말했지만 이미 숨긴 관계와 개인 접촉이 남아 있었습니다. 자유를 말하면서 선택권을 빼앗은 모순 때문에 세 사람은 다시 접속하지 않았습니다.'};
  if(state.extensionCompleted)return{id:'six_people_online',title:'로그아웃할 수 없는 인생',tone:'good',scene:'./assets/event-yuna-5.png',text:'한 달은 아무것도 하지 못한 채 사라졌고, 그다음 한 달은 아무것도 증명하지 않아도 지나갔습니다. 돌아갈 집은 하나 더 늘고 기다리는 사람은 세 명 더 많아졌지만, 이번에는 누구도 말없이 사라지지 않았습니다.'};
  return{id:'same_party',title:'각자의 집, 같은 파티',tone:'good',scene:'./assets/event-yuna-5.png',text:'네 사람은 함께 살지 않습니다. 대신 답장이 늦으면 늦는다고 말하고, 떠나고 싶을 때도 상대의 대답을 듣습니다. 누구도 붙잡히지 않았지만 누구도 설명 없이 지워지지 않았습니다.'};
}
function apply(life,choiceId){
  const state=ensure(life),extension=!!state.extensionActive,chapter=next(life);if(!chapter)return null;
  const choice=chapter.choices.find(item=>item.id===choiceId);if(!choice)return null;
  if(choice.disabled||choice.requiresDisclosure&&!disclosureComplete(state))return null;
  state.harmony=clamp(state.harmony+(choice.harmony||0),0,100);
  state.rest=clamp(state.rest+(choice.rest||0),0,100);
  state.axes[choice.tag]=(state.axes[choice.tag]||0)+1;
  state.shadowClues=(state.shadowClues||0)+(choice.shadowClue||0);
  if(choice.privatePull)state.privatePull=true;
  if(choice.disclosure){
    state.relationshipDisclosure=choice.disclosure;
    state.dangerousDisclosurePending=false;
    state.dangerousDisclosureComplete=choice.disclosure==='full'||choice.disclosure==='boundary';
    if(state.dangerousDisclosureComplete||choice.disclosure==='none')state.privatePull=false;
  }
  if(choice.finalRoute){
    state.finalRoute=choice.finalRoute;
    state.finalTarget=choice.target||null;
  }
  state.history.push({type:extension?'freedom-extension':'set',stage:extension?state.extensionStage:state.stage,choice:choice.id,tag:choice.tag});
  NAMES.forEach(name=>{
    const person=rec(life,name);if(!person)return;
    person.trust=clamp((person.trust||0)+(choice.trust||0),0,100);
    person.affection=clamp((person.affection||0)+(choice.tag==='control'?-3:3),0,100);
  });
  if(choice.badEnding){
    state.ending=finalEnding(life,state,choice);state.active=false;state.extensionActive=false;
    if(root.QT_ROMANCE_ROUTES)root.QT_ROMANCE_ROUTES.complete(life,'freedom',state.ending.id,'bad');
  }else if(choice.startExtension){
    state.stage=STORY_CHAPTERS.length;
    state.extensionActive=true;
    state.extensionStage=0;
    state.finalRoute=null;
  }else if(extension){
    state.extensionStage=(state.extensionStage||0)+1;
    if(choice.montage==='dangerous'){
      state.dangerousMonthPassed=true;
      life.freedomDangerousMonthSkipped=(life.freedomDangerousMonthSkipped||0)+1;
    }
    if(choice.montage==='freedom'){
      state.freedomMonthPassed=true;
      life.freedomHealingMonthSkipped=(life.freedomHealingMonthSkipped||0)+1;
    }
    if(choice.extensionEnding||state.extensionStage>=DANGEROUS_EXTENSION.length){
      state.extensionActive=false;state.extensionCompleted=true;state.finalRoute='shared';
      state.ending=finalEnding(life,state,choice);state.active=false;
      if(root.QT_ROMANCE_ROUTES)root.QT_ROMANCE_ROUTES.complete(life,'freedom',state.ending.id,state.ending.tone);
    }
  }else{
    state.stage++;
  }
  if(!extension&&!choice.startExtension&&!choice.badEnding&&state.stage>=STORY_CHAPTERS.length){
    state.ending=finalEnding(life,state,choice);state.active=false;
    if(choice.finalRoute==='individual'&&choice.target&&root.QT_ROMANCE_ROUTES&&typeof root.QT_ROMANCE_ROUTES.beginDevotion==='function'){
      root.QT_ROMANCE_ROUTES.beginDevotion(life,'freedom',choice.target,'freedom-trio-final-choice');
    }
    if(root.QT_ROMANCE_ROUTES)root.QT_ROMANCE_ROUTES.complete(life,'freedom',state.ending.id,state.ending.tone);
  }
  return{chapter,choice,state,ending:state.ending};
}
function monthly(life){
  const state=ensure(life);if(!state.active)return null;
  const safe=(state.axes.freedom||0)>=(state.axes.control||0);
  state.harmony=clamp(state.harmony+(safe?2:-4),0,100);
  state.rest=clamp(state.rest+(safe?1:-3),0,100);
  return state.harmony<=20||state.rest<=20?'길드와 단체방까지 대답을 재촉하는 긴장으로 가득해지고 있습니다. 다음 이야기에서 각자의 거리를 다시 합의해야 합니다.':null;
}
function nextAftermath(life){
  const state=ensure(life),bond=life.freedomTrioBond;
  if(!bond||!bond.active||!state.ending||state.ending.tone!=='good'||state.finalRoute!=='shared')return null;
  const events=AFTERMATH.filter(event=>!event.requiresExtension||state.extensionCompleted);
  return events[state.aftermathIndex]||null;
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
  return{happy:2+strength,stress:-(3+strength*2),health:0,income:0};
}
function compatibleCandidate(name){return NAMES.includes(name);}

root.QT_FREEDOM_TRIO={
  NAMES,GUILD_NAME,ROMANCE_ENDINGS,romanceEnding,GUILD_MEMBERS,GUILD_EVENTS,COUNSELING_EVENTS,FIRST_OUTING,DANGEROUS_DISCLOSURE,PERSONAL_EVENTS,CHAPTERS:STORY_CHAPTERS,AFTERMATH,ensure,playGuild,guildEvent,resolveGuild,
  chapterTwoUnlocked,revealed,canContact,canMeetOffline,relationshipMode,storyMode,nextCounselingEvent,queueCounseling,counselingEvent,applyCounseling,counselingComplete,queueFirstOuting,deferFirstOuting,applyFirstOuting,dangerousDisclosureReady,applyDangerousDisclosure,
  disclosureComplete,nextPersonalEvent,personalCheckpointComplete,queuePersonal,personalEvent,applyPersonal,progress,individualStoriesComplete,storyComplete,resolveUnavailable,confessionReady,marketRumorAvailable,eligibility,queue,cancelQueue,start,next,apply,monthly,nextAftermath,applyAftermath,recovery,compatibleCandidate,
};
})(window);
