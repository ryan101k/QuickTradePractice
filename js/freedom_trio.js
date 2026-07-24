/* QuickTrade Life — 채원 × 유나 × 소희 자유와 귀환 세트 */
(function(root){
'use strict';
const NAMES=['채원','유나','소희'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rec=(life,name)=>(life.met||[]).find(person=>person.name===name);

const PERSONAL_EVENTS={
 chaewon_layover:{name:'채원',min:20,scene:'./assets/event-chaewon-airport.png',icon:'✈️',title:'채원 · 마지막 비행 뒤의 빈 좌석',
  desc:'예정보다 늦게 끝난 비행 뒤, 채원이 승객이 모두 떠난 탑승구에 혼자 남아 있습니다. 화려한 여행 사진과 달리 돌아온 뒤 연락할 사람이 없다는 말을 농담처럼 흘립니다.',
  choices:[
   {id:'wait',text:'도착 시간이 바뀌어도 기다리겠다고 한다',preview:'직업의 불규칙함까지 관계의 일부로 받아들인다',affection:7,trust:8,tag:'freedom',result:'채원은 다음 비행편 번호 대신 도착 예정 시간만 보냈습니다. “기다리라는 말은 안 했어요. 그래도 오면 좋겠네.”'},
   {id:'upgrade',text:'비싼 공항 호텔에서 피로를 풀게 한다',preview:'채원이 좋아하는 화려한 휴식을 선물한다',affection:10,trust:2,cash:-1200000,tag:'career',result:'채원은 만족했지만, 당신이 기다린 시간보다 객실 등급을 먼저 확인한 자신을 조금 민망해했습니다.'},
   {id:'quit',text:'이렇게 힘들면 일을 그만두라고 한다',preview:'함께 있을 시간을 위해 비행을 포기시키려 한다',affection:-5,trust:-8,tag:'control',result:'채원의 표정이 굳었습니다. “내가 돌아오는 사람이 필요했지, 못 떠나게 하는 사람을 찾은 건 아니에요.”'}
  ]},
 chaewon_transfer:{name:'채원',min:45,after:'chaewon_layover',scene:'./assets/event-chaewon-transfer-offer.png',icon:'🛫',title:'채원 · 장거리 노선 발령',
  desc:'채원이 수입과 경력은 크게 오르지만 집을 비우는 기간도 길어지는 장거리 노선 발령서를 내밉니다. 축하를 받고 싶은 표정과 붙잡히고 싶은 표정이 동시에 보입니다.',
  choices:[
   {id:'calendar',text:'귀국일만 공유하고 서로의 생활은 각자 지킨다',preview:'약속은 만들되 이동을 통제하지 않는다',affection:8,trust:11,tag:'freedom',result:'두 사람은 매일 연락하는 대신 반드시 돌아올 날짜를 정했습니다. 채원은 처음으로 출국이 이별처럼 느껴지지 않는다고 했습니다.'},
   {id:'invest',text:'장거리 생활에 필요한 비용과 휴가를 지원한다',preview:'커리어 확장을 현실적으로 돕는다',affection:7,trust:7,cash:-3000000,tag:'career',result:'채원은 다음 달 휴가 항공권을 자기 돈으로 다시 끊었습니다. 지원을 빚이 아니라 함께 만든 선택으로 돌려주고 싶어 했습니다.'},
   {id:'refuse',text:'발령을 거절해야 관계를 계속하겠다고 한다',preview:'관계를 조건으로 이동을 막는다',affection:-10,trust:-12,tag:'control',result:'채원은 발령서보다 당신을 오래 바라봤습니다. 그리고 대답 대신 승무원 가방을 다시 잠갔습니다.'}
  ]},
 yuna_offcamera:{name:'유나',min:20,scene:'./assets/event-yuna-backstage.png',icon:'📸',title:'유나 · 렌즈가 꺼진 뒤의 얼굴',
  desc:'촬영이 끝난 뒤 유나는 화장을 지우지 못한 채 빈 대기실에 앉아 있습니다. 오늘도 모두가 원하는 표정은 만들었지만 자기 기분을 묻는 사람은 없었다고 말합니다.',
  choices:[
   {id:'quiet',text:'사진을 찍지 않고 늦은 저녁을 함께 먹는다',preview:'보여지는 모습이 아닌 실제 하루를 기억한다',affection:8,trust:9,tag:'freedom',result:'유나는 휴대전화를 뒤집어 놓고 천천히 식사했습니다. “이 얼굴을 기사로 안 쓰는 사람도 있네요.”'},
   {id:'campaign',text:'지금의 인지도를 개인 브랜드로 연결하자고 한다',preview:'이미지를 커리어 자산으로 확장한다',affection:6,trust:5,tag:'career',result:'유나는 현실적인 제안을 마음에 들어 했습니다. 대신 브랜드보다 자기 이름이 먼저 나오게 해달라고 조건을 걸었습니다.'},
   {id:'delete',text:'불안하면 SNS와 모델 일을 모두 쉬라고 한다',preview:'노출을 없애 관계를 안전하게 만들려 한다',affection:-7,trust:-9,tag:'control',result:'유나는 차갑게 웃었습니다. “세상이 보는 게 싫다고 나까지 없어져야 해요?”'}
  ]},
 yuna_contract:{name:'유나',min:45,after:'yuna_offcamera',scene:'./assets/event-yuna-dating-contract.png',icon:'📰',title:'유나 · 연애 금지 계약서',
  desc:'소속사가 재계약 조건으로 사생활 통제 조항을 내밀었습니다. 공개하면 광고가 끊길 수 있고 숨기면 당신은 계속 가짜 연인의 그림자에 남습니다.',
  choices:[
   {id:'truth',text:'공개 여부를 유나가 정하고 어떤 결과든 함께 감당한다',preview:'관계의 주도권을 당사자에게 돌려준다',affection:10,trust:10,tag:'freedom',result:'유나는 당장 공개하지 않았습니다. 대신 처음으로 “숨기는 것”과 “지키는 것”의 차이를 자기 말로 설명했습니다.'},
   {id:'studio',text:'위약금을 대비해 독립 스튜디오 자금을 마련한다',preview:'돈으로 선택지를 넓히되 결정을 대신하지 않는다',affection:8,trust:7,cash:-5000000,tag:'career',result:'유나는 계약서를 찢지 않고 변호사에게 넘겼습니다. 충동 대신 나갈 수 있는 문을 실제로 만들기 시작했습니다.'},
   {id:'secret',text:'경력에 방해되니 무조건 비밀로 하자고 한다',preview:'유나의 이미지와 관계를 동시에 관리하려 한다',affection:-8,trust:-11,tag:'control',result:'유나는 고개를 끄덕였지만 그날 이후 당신 앞에서도 카메라용 미소를 지었습니다.'}
  ]},
 sohee_emptyhall:{name:'소희',min:20,scene:'./assets/event-sohee-backstage.png',icon:'🎻',title:'소희 · 박수가 끝난 빈 객석',
  desc:'공연 뒤 모두가 떠난 객석에서 소희가 혼자 같은 마디를 반복합니다. 자유롭게 연주하고 싶다던 사람이 정작 한 번의 실수에 자신을 묶고 있습니다.',
  choices:[
   {id:'listen',text:'완벽한 연주보다 지금 듣고 싶은 곡을 부탁한다',preview:'평가가 아닌 감정을 나누는 청중이 된다',affection:8,trust:9,tag:'freedom',result:'소희는 악보를 덮고 처음 듣는 짧은 곡을 연주했습니다. 틀린 음이 있었지만 끝난 뒤 가장 편하게 웃었습니다.'},
   {id:'record',text:'연주 영상을 제작해 다음 공연 기회로 연결한다',preview:'실패를 다음 무대로 바꾼다',affection:6,trust:6,cash:-1000000,tag:'career',result:'소희는 편집본에서 실수한 마디를 지우지 않았습니다. 그날의 불안까지 자기 연주였다고 남겼습니다.'},
   {id:'practice',text:'관객을 실망시켰으니 더 연습해야 한다고 한다',preview:'성과를 위해 감정을 밀어붙인다',affection:-6,trust:-8,tag:'control',result:'소희는 다시 활을 들었지만, 이번에는 당신이 객석에 있는 동안 한 번도 눈을 마주치지 않았습니다.'}
  ]},
 sohee_overseas:{name:'소희',min:45,after:'sohee_emptyhall',scene:'./assets/event-sohee-overseas-audition.png',icon:'🎼',title:'소희 · 해외 오디션 합격 통지',
  desc:'소희에게 1년짜리 해외 오케스트라 객원 제안이 왔습니다. 평생 기다린 무대지만, 돌아왔을 때 관계가 같은 자리에 있을지는 누구도 장담할 수 없습니다.',
  choices:[
   {id:'return',text:'헤어짐을 약속하지 말고 돌아와 다시 선택하자고 한다',preview:'미래를 소유하지 않은 채 신뢰한다',affection:9,trust:12,tag:'freedom',result:'소희는 영원하다는 말 대신 귀국 공연의 첫 좌석을 비워두겠다고 약속했습니다.'},
   {id:'tour',text:'해외 활동을 도울 매니지먼트와 투자 계획을 세운다',preview:'사랑과 커리어를 같은 프로젝트로 확장한다',affection:8,trust:7,cash:-4000000,tag:'career',result:'소희는 계약서에 자기 결정권 조항을 직접 추가했습니다. 함께 가되 누구의 부속품도 되지 않기로 했습니다.'},
   {id:'stay',text:'관계를 지키려면 국내에 남아야 한다고 한다',preview:'떠나는 선택을 배신으로 취급한다',affection:-11,trust:-13,tag:'control',result:'소희는 합격 통지를 접어 가방에 넣었습니다. “나를 사랑하는 건지, 여기 있는 나만 필요한 건지 모르겠어요.”'}
  ]}
};

const CHAPTERS=[
 {title:'한 공항에 겹친 세 일정',icon:'🛫',scene:'./assets/event-freedom-trio-airport.png',
  desc:'채원의 귀국편, 유나의 해외 촬영, 소희의 객원 공연이 같은 탑승구에서 겹쳤습니다. 서로 다른 이유로 떠나는 세 사람은 당신이 각자에게 했던 “기다리겠다”는 말을 우연히 알게 됩니다.',
  speakers:[
   {name:'채원',line:'나한테만 돌아오면 된다고 한 줄 알았는데. 두 사람한테도 같은 말을 했어요?'},
   {name:'유나',line:'독점 인터뷰인 줄 알았더니 공동 기자회견이네. 숨긴 이유부터 들어볼까요?'},
   {name:'소희',line:'붙잡지 않겠다는 말과 아무것도 말하지 않은 건 다르잖아요.'}
  ],
  choices:[
   {id:'honest',tag:'freedom',text:'세 사람에게 각각 어떤 관계인지 솔직하게 말한다',preview:'떠날 자유만큼 알 권리도 인정한다',harmony:12,trust:7,result:'불편한 침묵이 길었지만 누구도 비행기를 놓치지는 않았습니다. 돌아온 뒤 셋이 함께 이야기할 날짜가 달력에 생겼습니다.'},
   {id:'crew',tag:'career',text:'감정 싸움보다 세 사람의 일정을 함께 관리하자고 제안한다',preview:'관계를 이동과 커리어의 공동 프로젝트로 만든다',harmony:8,trust:3,result:'유나는 계산적이라고 했고 채원은 편리하다고 했으며 소희는 조건을 직접 쓰겠다고 했습니다. 이상한 여행팀의 첫 일정표가 만들어졌습니다.'},
   {id:'choose',tag:'control',text:'오늘 가장 오래 남아줄 한 사람만 고른다',preview:'떠남의 불안을 서열로 해결한다',harmony:-12,trust:-6,result:'선택받은 사람도 웃지 못했습니다. 세 사람의 출국은 각자의 커리어가 아니라 당신에게 매긴 거리표가 됐습니다.'}
  ]},
 {title:'가짜 연인 기사, 진짜 세 사람',icon:'📸',scene:'./assets/event-freedom-trio-scandal.png',
  desc:'유나의 가짜 열애 기사가 터진 날 채원과 소희가 대기실에 함께 있는 사진까지 퍼졌습니다. 셋을 경쟁 상대로 포장한 기사는 실제 관계보다 훨씬 단순하고 자극적입니다.',
  speakers:[
   {name:'유나',line:'부정하면 광고는 지킬 수 있어요. 대신 두 사람은 내 실수처럼 지워지겠죠.'},
   {name:'채원',line:'회사에는 승객 사생활이라고 둘러댈 수 있어요. 그런데 우리끼리도 계속 모른 척할 건가요?'},
   {name:'소희',line:'공연보다 기사 제목이 먼저 기억되는 건 싫어요. 그렇다고 누군가를 부끄러워하고 싶지도 않고.'}
  ],
  choices:[
   {id:'boundaries',tag:'freedom',text:'공개 범위와 말하지 않을 사생활을 셋이 직접 정한다',preview:'진실과 노출 사이에 공동 경계를 만든다',harmony:14,trust:8,result:'세 사람은 관계를 상품처럼 설명하지 않았습니다. 대신 거짓말하지 않을 질문과 대답하지 않을 질문을 명확히 정했습니다.'},
   {id:'campaign',tag:'career',text:'논란을 세 사람의 세계 활동 프로젝트로 전환한다',preview:'관심을 공연·여행·브랜드 기회로 바꾼다',harmony:9,trust:4,result:'기사는 여전히 시끄러웠지만 채원의 여행 콘텐츠, 유나의 캠페인, 소희의 공연이 하나의 프로젝트로 묶였습니다.'},
   {id:'deny',tag:'control',text:'모두 친구일 뿐이라며 유나 혼자 해명하게 한다',preview:'내 평판을 지키기 위해 한 사람에게 거짓말을 맡긴다',harmony:-15,trust:-8,result:'유나는 완벽하게 웃으며 해명했습니다. 카메라가 꺼진 뒤에는 당신에게도 같은 표정만 남겼습니다.'}
  ]},
 {title:'같은 날 세 개의 출국표',icon:'🧳',scene:'./assets/event-freedom-trio-departures.png',
  desc:'채원은 장거리 노선, 유나는 해외 캠페인, 소희는 객원 공연으로 같은 날 떠나야 합니다. 세 사람 모두 당신이 와주길 바라지만, 누구도 자기 때문에 다른 두 사람의 길이 막히길 원하지 않습니다.',
  speakers:[
   {name:'채원',line:'배웅은 한 번뿐이잖아요. 그래도 누구 비행기를 취소시키진 마요.'},
   {name:'유나',line:'선택받는 장면은 익숙해요. 이번에는 선택받지 않아도 지워지지 않는지 보고 싶네.'},
   {name:'소희',line:'우리 셋 다 떠나도 관계가 남는다면, 그때야 돌아올 곳이라고 부를 수 있겠죠.'}
  ],
  choices:[
   {id:'threeletters',tag:'freedom',text:'각자에게 다른 편지를 건네고 모두 보내준다',preview:'같은 약속 대신 각자의 불안을 정확히 기억한다',harmony:15,trust:9,result:'세 사람은 서로 다른 탑승구로 걸어갔습니다. 누구도 뒤처지지 않았고, 세 통의 답장은 서로 다른 도시에서 같은 날 도착했습니다.'},
   {id:'follow',tag:'career',text:'세 일정을 잇는 세계 순회 계획에 함께 올라탄다',preview:'투자와 이동으로 세 커리어를 하나의 노선으로 묶는다',harmony:10,trust:5,cash:-15000000,result:'가장 비싼 선택이었지만 누구의 무대도 취소되지 않았습니다. 네 사람의 다음 도시는 매달 달라지기 시작했습니다.'},
   {id:'ground',tag:'control',text:'관계를 유지하려면 셋 모두 이번 일정을 포기하라고 한다',preview:'떠나는 가능성 자체를 없애려 한다',harmony:-22,trust:-12,result:'세 사람은 처음으로 같은 편이 됐습니다. 당신을 설득하기 위해서가 아니라, 각자의 표를 지키기 위해서였습니다.'}
  ]},
 {title:'붙잡지 않는 집',icon:'🌅',scene:'./assets/event-freedom-trio-home.png',
  desc:'세 사람이 오래 비우게 될 공동 거처가 완성됐습니다. 현관에는 여행가방, 옷걸이에는 촬영 의상, 창가에는 바이올린이 놓였습니다. 집을 약속으로 만들지 족쇄로 만들지 마지막 규칙을 정해야 합니다.',
  speakers:[
   {name:'채원',line:'귀국 시간이 늦어져도 문은 열려 있었으면 좋겠어요. 기다리느라 삶을 멈추진 말고.'},
   {name:'유나',line:'여기서는 카메라도 해명문도 없이 그냥 내 얼굴로 있고 싶어요.'},
   {name:'소희',line:'연주가 끝나고 돌아왔을 때, 누가 먼저였는지 묻지 않는 집이면 좋겠어요.'}
  ],
  choices:[
   {id:'home',tag:'freedom',text:'일정은 공유하되 허락받지 않고 떠나고 돌아오는 집으로 만든다',preview:'자유와 신뢰가 함께 남는 공동생활',harmony:18,trust:10,result:'세 사람은 같은 날 집에 있는 일이 드물었습니다. 그래도 돌아온 사람을 심문하지 않고, 떠나는 사람에게 죄책감을 주지 않는 생활이 시작됐습니다.'},
   {id:'worldstage',tag:'career',text:'집을 세계 활동의 베이스캠프이자 공동 스튜디오로 만든다',preview:'사랑과 커리어를 확장하는 세계 순회 결말',harmony:14,trust:7,cash:-25000000,result:'거실은 연습실과 촬영실과 여행 상황실이 됐습니다. 집은 머무는 장소보다 다음 무대로 함께 출발하는 곳이 됐습니다.'},
   {id:'rules',tag:'control',text:'외박·촬영·공연을 모두 허락제로 관리한다',preview:'돌아올 곳을 떠날 수 없는 곳으로 바꾼다',harmony:-28,trust:-15,result:'세 사람은 열쇠를 테이블에 내려놓았습니다. 붙잡으려고 만든 규칙이 누구도 돌아오지 않는 이유가 됐습니다.'}
  ]}
];

const AFTERMATH=[
 {id:'shared_calendar',title:'공동생활 1개월 · 비어 있는 날을 예약하는 법',icon:'🗓️',scene:'./assets/event-freedom-trio-home.png',
  desc:'세 사람의 일정표는 해외와 촬영과 공연으로 가득하지만, 함께 쉬는 날은 아무도 먼저 적지 못했습니다.',
  speakers:[
   {name:'채원',line:'빈칸이 생기면 알려줄게요. 그걸 꼭 누가 먼저 차지할 필요는 없잖아요.'},
   {name:'유나',line:'일정표에 연애라고 쓰지는 말죠. 그냥 아무것도 안 하는 날이면 돼.'},
   {name:'소희',line:'연습 없는 날이 아니라, 일부러 연습하지 않는 날도 필요하겠네요.'}
  ],
  choices:[
   {id:'blank',text:'한 달에 하루는 누구도 일정을 넣지 않는 빈칸으로 둔다',result:'세 사람은 그날 무엇을 할지 정하지 않았습니다. 함께 있다는 사실만 일정이 됐습니다.',harmony:8},
   {id:'rotate',text:'매달 한 사람이 하고 싶은 일을 돌아가며 정한다',result:'비행 체험, 촬영장 야식, 작은 실내악 공연이 차례로 공동생활의 추억이 됐습니다.',harmony:5,income:300000},
   {id:'sponsor',text:'쉬는 날에도 공동 콘텐츠를 촬영한다',result:'수익은 늘었지만 유나는 집에서까지 표정을 관리해야 하는지 물었습니다.',harmony:-4,income:1200000}
  ]},
 {id:'homecoming',title:'공동생활 2개월 · 가장 늦은 귀국',icon:'🏠',scene:'./assets/event-freedom-trio-homecoming.png',
  desc:'새벽 마지막 편으로 돌아온 채원, 해외 촬영을 마친 유나, 공연 투어에서 온 소희가 같은 날 현관에 도착했습니다. 모두 지쳤지만 서로 먼저 기대려 하지는 않습니다.',
  speakers:[
   {name:'채원',line:'세 명 다 돌아왔네요. 이런 날은 정말 드문데.'},
   {name:'유나',line:'사진 찍지 마요. 지금 얼굴은 여기 있는 사람들만 보는 거예요.'},
   {name:'소희',line:'말하지 않아도 되는 환영회면 좋겠어요. 오늘은 그냥 듣고 싶어요.'}
  ],
  choices:[
   {id:'soup',text:'따뜻한 식사만 준비하고 각자 쉴 시간을 준다',result:'대화는 짧았지만 다음 날 세 사람 모두 같은 거실에서 잠들어 있었습니다.',harmony:9},
   {id:'stories',text:'각자 여행에서 있었던 일을 하나씩 나눈다',result:'세 도시는 한 식탁에서 이어졌고 누구의 이야기도 경쟁이 되지 않았습니다.',harmony:7},
   {id:'ranking',text:'누가 가장 보고 싶었는지 한 명을 고른다',result:'농담으로 시작한 질문이 세 사람의 피로를 정확히 찔렀습니다.',harmony:-10}
  ]},
 {id:'world_offer',title:'공동생활 3개월 · 네 사람의 세계 노선',icon:'🌍',scene:'./assets/event-freedom-trio-world-tour-ending.png',
  desc:'항공사와 브랜드와 공연기획사가 세 사람의 활동을 하나의 세계 프로젝트로 묶자고 제안했습니다. 성공하면 큰돈과 긴 이동이, 실패하면 세 사람의 경력이 한꺼번에 흔들립니다.',
  speakers:[
   {name:'채원',line:'내가 이동을 맡을 수는 있어요. 하지만 관계까지 서비스처럼 보이게 하진 마요.'},
   {name:'유나',line:'팔리는 이야기는 알아요. 우리가 팔고 싶은 것만 고를 수 있다면 해볼 만해.'},
   {name:'소희',line:'음악이 배경으로만 쓰이지 않는다는 조건이면 참여할게요.'}
  ],
  choices:[
   {id:'terms',text:'세 사람의 거부권과 수익 배분을 계약서에 명시한다',result:'프로젝트는 작아졌지만 누구도 자기 이름을 잃지 않았습니다.',harmony:10,income:1800000},
   {id:'scale',text:'자금을 더 넣어 독립 세계 투어로 키운다',result:'위험한 투자였지만 네 사람은 고용된 이미지가 아니라 프로젝트의 주인이 됐습니다.',harmony:6,cash:-20000000,income:3500000},
   {id:'playerbrand',text:'모든 활동을 플레이어의 투자 브랜드 아래 둔다',result:'수익은 컸지만 세 사람은 다시 누군가의 홍보물로 돌아간 기분을 감추지 못했습니다.',harmony:-12,income:5000000}
  ]}
];

function ensure(life){
 if(!life.freedomTrio||typeof life.freedomTrio!=='object')life.freedomTrio={active:false,queued:false,encountered:false,stage:0,harmony:50,axes:{freedom:0,career:0,control:0},history:[],personal:{},ending:null,aftermathIndex:0};
 const s=life.freedomTrio;
 if(!s.axes)s.axes={freedom:0,career:0,control:0};
 if(!Array.isArray(s.history))s.history=[];
 if(!s.personal||typeof s.personal!=='object')s.personal={};
 return s;
}
function nextPersonalEvent(life){
 const state=ensure(life);
 return Object.entries(PERSONAL_EVENTS).map(([id,event])=>({id,event})).find(({id,event})=>{
  const r=rec(life,event.name);if(!r||['ex','deceased'].includes(r.status)||state.personal[id]==='seen')return false;
  if((r.affection||0)<event.min)return false;
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
 const state=ensure(life),event=PERSONAL_EVENTS[id],r=event&&rec(life,event.name);if(!event||!r)return null;
 const choice=event.choices.find(item=>item.id===choiceId);if(!choice)return null;
 r.affection=clamp((r.affection||0)+(choice.affection||0),0,100);
 r.trust=clamp((r.trust||0)+(choice.trust||0),0,100);
 state.personal[id]='seen';state.axes[choice.tag]=(state.axes[choice.tag]||0)+1;
 state.history.push({type:'personal',id,choice:choice.id,tag:choice.tag});
 return{event,choice,r,state};
}
function progress(life){
 return NAMES.map(name=>{
  const r=rec(life,name),ids=Object.entries(PERSONAL_EVENTS).filter(([,event])=>event.name===name).map(([id])=>id);
  const seen=ids.filter(id=>ensure(life).personal[id]==='seen').length;
  const active=!!r&&!['ex','deceased'].includes(r.status);
  const ready=active&&seen===ids.length&&(r.affection||0)>=45&&(r.trust||0)>=20;
  return{name,met:!!r,active,seen,total:ids.length,affection:r&&r.affection||0,trust:r&&r.trust||0,ready,
   need:!r?'아직 만나지 못함':!active?`현재 관계: ${r.status||'지인'} · 관계가 끊김`:seen<ids.length?`개별 이벤트 ${seen}/${ids.length}`:(r.affection||0)<45?`호감 ${Math.round(r.affection||0)}/45`:`신뢰 ${Math.round(r.trust||0)}/20`};
 });
}
function eligibility(life){
 const state=ensure(life),rows=progress(life),partner=!!life.partner&&NAMES.includes(life.partner.name);
 const poly=life.polycule||{},outsiders=(poly.members||[]).filter(person=>!NAMES.includes(person.name));
 const dangerous=!!(life.dangerousTrioBond&&life.dangerousTrioBond.active);
 return{ok:!state.encountered&&!state.active&&!state.ending&&partner&&!dangerous&&!outsiders.length&&rows.every(row=>row.ready),partner,dangerous,outsiders,rows};
}
function queue(life){
 const check=eligibility(life),state=ensure(life);if(!check.ok||state.queued)return false;state.queued=true;return true;
}
function start(life){
 const check=eligibility(life);if(!check.ok)return{ok:false,check};
 const state=ensure(life);state.active=true;state.queued=false;state.encountered=true;state.stage=Math.max(0,state.stage||0);state.harmony=Math.max(50,state.harmony||0);state.ending=null;
 NAMES.forEach(name=>{const r=rec(life,name);if(r){r.trust=clamp((r.trust||0)+3,0,100);if(r.status==='acquaintance')r.status='friend';}});
 return{ok:true,state,chapter:CHAPTERS[state.stage]};
}
function next(life){const state=ensure(life);return state.active&&!state.ending?CHAPTERS[state.stage]||null:null;}
function endingFor(state){
 const axes=state.axes||{};
 if((axes.control||0)>=2||(state.harmony||0)<25)return{id:'empty_gate',title:'한 사람만 남은 탑승구',tone:'bad',scene:'./assets/event-freedom-trio-empty-gate-ending.png',text:'떠남을 막기 위해 만든 규칙은 세 사람 모두에게 같은 대답을 주었습니다. 현관에는 열쇠만 남았고 공항의 세 탑승구에는 돌아오는 사람이 없었습니다.'};
 if((axes.career||0)>(axes.freedom||0))return{id:'world_tour',title:'네 사람의 세계 노선',tone:'good',scene:'./assets/event-freedom-trio-world-tour-ending.png',text:'채원의 노선, 유나의 촬영, 소희의 공연이 하나의 세계 프로젝트로 이어졌습니다. 누구도 커리어를 포기하지 않았고 네 사람의 집은 도시마다 잠시 생겼다가 다시 이동했습니다.'};
 return{id:'return_home',title:'돌아올 곳',tone:'good',scene:'./assets/event-freedom-trio-home.png',text:'세 사람은 서로를 붙잡지 않았습니다. 대신 떠나는 사람에게 죄책감을 주지 않고 돌아온 사람을 심문하지 않는 집을 만들었습니다.'};
}
function apply(life,choiceId){
 const state=ensure(life),chapter=next(life);if(!chapter)return null;
 const choice=chapter.choices.find(item=>item.id===choiceId);if(!choice)return null;
 state.harmony=clamp((state.harmony||0)+(choice.harmony||0),0,100);state.axes[choice.tag]=(state.axes[choice.tag]||0)+1;
 state.history.push({type:'set',stage:state.stage,choice:choice.id,tag:choice.tag});
 NAMES.forEach(name=>{const r=rec(life,name);if(!r)return;r.trust=clamp((r.trust||0)+(choice.trust||0),0,100);r.affection=clamp((r.affection||0)+(choice.tag==='control'?-3:3),0,100);});
 state.stage++;if(state.stage>=CHAPTERS.length){state.ending=endingFor(state);state.active=false;}
 return{chapter,choice,state,ending:state.ending};
}
function monthly(life){
 const state=ensure(life);if(!state.active)return null;
 state.harmony=clamp(state.harmony+((state.axes.freedom||0)>=(state.axes.control||0)?2:-4),0,100);
 return state.harmony<=20?'세 사람의 일정과 감정이 동시에 어긋나고 있습니다. 다음 세트 이야기를 진행해 관계의 방향을 정해야 합니다.':null;
}
function nextAftermath(life){
 const state=ensure(life);if(!state.ending||state.ending.tone!=='good')return null;
 if(!Number.isFinite(state.aftermathIndex))state.aftermathIndex=0;
 return AFTERMATH[state.aftermathIndex]||null;
}
function applyAftermath(life,choiceId){
 const state=ensure(life),event=nextAftermath(life);if(!event)return null;
 const choice=event.choices.find(item=>item.id===choiceId);if(!choice)return null;
 state.harmony=clamp((state.harmony||0)+(choice.harmony||0),0,100);state.aftermathIndex++;
 NAMES.forEach(name=>{const r=rec(life,name);if(r)r.trust=clamp((r.trust||0)+Math.sign(choice.harmony||0)*2,0,100);});
 return{event,choice,state};
}
function compatibleCandidate(name){return NAMES.includes(name);}

root.QT_FREEDOM_TRIO={NAMES,PERSONAL_EVENTS,CHAPTERS,AFTERMATH,ensure,nextPersonalEvent,queuePersonal,personalEvent,applyPersonal,progress,eligibility,queue,start,next,apply,monthly,nextAftermath,applyAftermath,compatibleCandidate};
})(window);
