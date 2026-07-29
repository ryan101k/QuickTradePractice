/* QuickTrade Life — 전 캐릭터 개인 스토리 엔진 */
(function(root){'use strict';
const ARCS={
 '서연':['마감 뒤의 빈 작업실','표절 시비','둘만의 전시회','일과 사랑 사이에서 자기 이름을 지키려 한다.'],
 '예린':['정해진 하루','가족의 결혼 압박','둘만의 생활표','안정된 계획 속에 타인의 기대가 아닌 자기 삶을 넣는다.'],
 '채원':['엇갈린 비행','승객의 오해','돌아올 집','화려한 이동 생활 속에서 머물 곳과 사람을 선택한다.'],
 '유나':['화보 속 가짜 연인','외모 악플','렌즈 밖의 얼굴','보이는 이미지가 아닌 실제 자신을 사랑받고 싶어 한다.'],
 '보라':['정확한 하루','가족 약국의 빚','늦은 밤의 처방전','안정만 지키던 사람이 자신의 욕망을 말하기 시작한다.'],
 '소희':['빈 객석','해외 오디션','마지막 앙코르','자유로운 음악과 관계의 책임을 함께 지킬지 고민한다.'],
 '나영':['부상 숨기기','승부 조작 제안','함께 걷는 코스','강함을 증명하는 대신 약함을 공유하는 법을 배운다.'],
 '미래':['출시 전 크런치','기획 탈취','엔딩 크레딧','게임과 인생에서 누구의 선택을 존중할지 결정한다.'],
 '나래':['수강생의 손실','교육 원칙의 위기','나란히 보는 차트','가르치는 사람과 연인의 경계를 새롭게 합의한다.'],
 '강유진':['보호라는 감시','내부 비리 제보','반납한 위치추적기','지키고 싶은 마음이 통제가 되지 않도록 선을 배운다.'],
 '윤세라':['열두 통을 지운 밤','어깨 하나만큼의 거리','두 개의 열쇠','서로의 폐허를 알아본 두 사람이 열린 문으로 구원받을지, 같은 문을 안에서 잠글지 선택한다.'],
 '한채린':['남겨 둔 종잇조각','화가 나야 하는데','왕관을 내려놓는 방','신입을 장난감처럼 시험하던 상속녀가 통제할 수 없는 거절을 기억하고, 사적인 굴복과 대등함, 권력 공모 중 하나를 선택한다.'],
};
/* 남성 인물의 사건 개요. 연애 개인 스토리에서는 제외하고
 * 라이벌·세력·언론·특별 아군 이벤트가 이 개요를 소비한다. */
const WORLD_ARCS={
 '민준':{side:'ally',role:'legal',chapters:['첫 무료 변론','증거가 사라진 밤','세력의 고문 계약'],theme:'돈보다 의뢰인의 생존을 먼저 보는 법률 참모가 된다.'},
 '도윤':{side:'ally',role:'medical',chapters:['응급실의 익명 환자','조직원 의료 기록','도시 밖 비상 진료소'],theme:'세력의 폭력성을 낮추면서도 사람을 살리는 의료망을 만든다.'},
 '시우':{side:'ally',role:'intel',chapters:['이상 접속 로그','경쟁 세력의 백도어','꺼지지 않는 상황실'],theme:'감시와 방어의 선을 지키는 정보 책임자가 된다.'},
 '건우':{side:'ally',role:'operations',chapters:['막힌 물류 창고','납품업체의 배신','사람이 남는 장부'],theme:'돈이 아니라 신뢰로 거점과 구성원을 연결한다.'},
 '지우':{side:'neutral',role:'broker',chapters:['값싼 제보','두 군데에 판 정보','마지막 구매자'],theme:'돈 되는 편에 붙는 정보상이 거래와 배신 사이를 오간다.'},
 '수빈':{side:'rival',role:'media',chapters:['썸네일 속 내 이름','조작된 생방송','꺼지지 않는 카메라'],theme:'여론과 폭로를 무기로 세력의 약점을 파고든다.'},
 '태양':{side:'rival',role:'leader',chapters:['대규모 공개매수','내부 인재 사냥','태양캐피탈 포위전'],theme:'돈과 평판으로 경쟁 세력을 흡수하는 핵심 라이벌이다.'},
 '장태식':{side:'enemy',role:'collector',chapters:['목숨값 장부','비어 있는 수금 칸','찢어진 차용증'],theme:'빚과 공포로 움직이는 추심 세력의 수장이다.'},
 '한태석':{side:'special',role:'guardian',chapters:['세 번의 거절','감옥 문 앞의 약속','사람으로 갚는 빚'],theme:'친해지기는 어렵지만 인정한 사람은 끝까지 책임지는 대협형 특별 아군이다.'},
 '하은':{side:'ally',role:'medical',chapters:['응급 처치 교육','부상자 후송로','쉬어도 되는 의무실'],theme:'세력원이 무리해서 쓰러지지 않도록 현장 의료 체계를 만든다.'},
 '수아':{side:'ally',role:'operations',chapters:['신입 교육표','민원 조정 회의','사고 없는 거점'],theme:'사람을 소모품으로 쓰지 않는 교육과 조정 규칙을 만든다.'},
 '다은':{side:'ally',role:'operations',chapters:['비어 있는 보급창고','거점의 첫 식사','사람이 모이는 가게'],theme:'보급과 작은 매장을 통해 세력의 생활 기반을 지킨다.'},
 '혜진':{side:'ally',role:'intel',chapters:['조작된 자료','증거 보전실','반박할 수 없는 기록'],theme:'추측이 아닌 검증 가능한 증거로 정보전을 방어한다.'},
 '아린':{side:'ally',role:'intel',chapters:['흐린 보고서','왜곡된 보도자료','세력의 공식 기록'],theme:'말과 기록이 공격의 빌미가 되지 않도록 대외 문서를 책임진다.'}
};
const MIN=[18,42,68,78,88];
const C=(id,text,preview,affection,trust,obsession,tone,reaction,effects,trait)=>({id,text,preview,affection,trust,obsession,tone,reaction,effects,trait});
const SPECIAL={
 '나래':[
  {desc:'나래가 위험 고지를 충분히 이해하지 못한 수강생의 큰 손실을 알게 됐습니다. 환불 규정만 보면 책임은 없지만, 나래는 빈 강의실에 남아 같은 문장을 몇 번이나 고쳐 읽습니다.',speaker:'약관에는 다 써 있었어요. 그런데 그 사람이 정말 이해했다고 말할 수 있을까요?',choices:[
   C('support','수강생을 만나 손실 과정부터 함께 복기한다','책임을 대신 지기보다 다시 판단할 힘을 돌려준다',10,11,-3,'good','정답을 대신 말해주지 않아서 더 믿을 수 있었어요.',{cash:-500000,morality:4}),
   C('lead','환불하고 교육 규칙을 내가 다시 짠다','빠르게 수습하지만 나래의 전문 영역을 대신 결정한다',1,-5,4,'neutral','도와준 건 고맙지만, 내 수업을 나 없이 정하지는 말아줘요.',{cash:-2000000}),
   C('avoid','투자는 원래 본인 책임이라고 선을 긋는다','법적 책임은 피하지만 나래가 혼자 감당한다',-10,-9,6,'bad','맞는 말이라서 더 서운하네요. 나는 책임 이야기가 아니라 사람 이야기를 했는데.',{morality:-3,guilt:4})
  ]},
  {desc:'플랫폼이 나래에게 수익률을 과장한 강의를 제안했습니다. 계약금은 크지만 손실 사례를 빼고 성공담만 강조해야 합니다. 나래는 계약서를 당신 앞에 내려놓습니다.',speaker:'이 돈이면 교육팀을 오래 지킬 수 있어요. 대신 내가 가르쳐온 원칙은 못 지키겠죠.',choices:[
   C('support','실패 사례까지 공개하는 조건으로 다시 협상한다','수입은 줄어도 교육 원칙과 팀을 함께 지킨다',9,12,-2,'good','돈과 원칙 중 하나만 고르지 않아도 된다는 걸 처음 알았어요.',{cash:1500000,morality:5}),
   C('lead','계약을 받고 표현만 교묘하게 바꾸자고 한다','현실적 수입을 택하지만 신뢰에 금이 간다',-3,-7,5,'neutral','불법이 아니면 괜찮다는 말, 당신에게서는 듣고 싶지 않았어요.',{cash:5000000,morality:-7,guilt:3}),
   C('avoid','나래가 알아서 결정할 문제라며 빠진다','갈등을 피하는 동안 나래가 혼자 계약을 거절한다',-8,-6,4,'bad','내 선택을 존중한 게 아니라, 결과까지 보고 싶지 않았던 거죠.',{})
  ]},
  {desc:'장이 크게 흔들린 밤, 나래가 강사와 연인의 경계를 어떻게 나눌지 묻습니다. 서로의 계좌와 판단에 어디까지 관여할지 정하지 않으면 같은 갈등이 반복될 것 같습니다.',speaker:'당신이 손실 볼 때 나는 강사예요, 연인이에요? 둘 다 하려다 둘 다 망칠까 봐 겁나요.',choices:[
   C('support','서로의 계좌는 각자 책임지고 감정은 함께 나눈다','대등한 연인으로 구체적인 경계를 합의한다',12,14,-6,'good','그럼 차트는 나란히 보고, 주문 버튼은 각자 누르는 거예요.',{morality:2}),
   C('lead','앞으로 투자 판단은 전부 나래에게 맡긴다','의존은 편하지만 관계의 부담이 한쪽에 쏠린다',2,-5,9,'neutral','나를 믿는 것과 당신 몫까지 넘기는 건 다른 일이에요.',{}),
   C('avoid','투자 이야기는 관계에서 완전히 금지한다','갈등과 함께 중요한 대화도 닫아버린다',-9,-8,5,'bad','문제를 없앤 게 아니라 우리 대화에서 숨긴 것뿐이에요.',{})
  ]}
 ],
 '강유진':[
  {title:'조사실에서 무너진 어깨',min:18,scene:'event-yujin-5135.png',desc:'두 번의 방문 조사 동안 유진은 차명계좌와 공격 기록만 물었습니다. 마지막 진술을 끝낸 뒤 긴장이 풀린 당신이 잠시 품에 기대자, 유진은 등을 토닥이면서도 사건이 끝나면 자신을 부를 이유도 사라질까 봐 안도하는 표정을 숨기지 못합니다. 구원 강박이 처음 사적인 욕망으로 바뀌는 순간입니다.',speaker:'괜찮다고 하지 마요. 적어도 지금은 나한테 기대요. …미안해요. 당신이 힘든데, 나를 먼저 찾았다는 게 기뻐서.',choices:[
   C('depend','오늘만큼은 해결하지 말고 이렇게 안고 있어 달라고 한다','유진은 보호할 일이 없어도 자신이 필요하다는 말을 처음 보상처럼 받아들인다',14,9,11,'neutral','그 말 다시 해줘요. 내가 뭘 해줘서가 아니라, 그냥 필요하다고.',{},'depend'),
   C('boundary','도움을 청한 건 맞지만 언제 놓을지는 내가 말하겠다고 한다','기대는 순간에도 구조와 통제의 경계를 플레이어가 정한다',11,15,-7,'good','알겠어요. 안은 것도 당신이 부탁해서고, 놓는 것도 당신 말에 맞출게요.',{},'boundary'),
   C('complicity','앞으로 공식 기록에 못 남길 일은 유진에게만 맡기겠다고 한다','한 번의 위로를 둘만의 비공식 보호 계약으로 바꾼다',8,-3,15,'bad','그러면 나는 계속 필요하겠네요. 경찰로는 못 해도, 당신 사람으로는 전부 할게요.',{morality:-4},'complicity')
  ]},
  {title:'사건번호 없는 봉투',min:30,scene:'event-yujin-1.png',desc:'유진은 종결된 사건에 “추가 피해 예방”이라는 제목의 안부 확인표를 붙였습니다. 식사, 귀가, 빚 항목 옆에는 현금이 든 봉투와 장보기 목록까지 놓여 있습니다. 당신이 뭘 부탁하기 전에 먼저 다 해주면 틀린 선택을 할 일도, 자신에게서 멀어질 일도 없다고 믿기 시작했습니다.',speaker:'돈이 필요하면 말해요. 밥도, 병원도, 안전한 방도 내가 알아볼게요. 당신은 그냥… 나한테 먼저 부탁하면 돼요. 내가 해줄 일이 없어지는 것보다 그게 나아요.',choices:[
   C('depend','생활비가 부족하니 이번 한 번만 도와달라고 솔직히 부탁한다','유진은 돈보다 자신에게 먼저 부탁했다는 사실에 더 크게 안도한다',14,8,10,'neutral','갚는 날짜는 나중에 정해요. 다음에도 혼자 망가진 뒤 말하지 말고, 부족할 때 바로 불러요.',{cash:1200000},'depend'),
   C('boundary','사건기록은 덮고 비번 날에 다시 만나자고 한다','업무상 감시와 사적인 관심을 분리한다',10,14,-6,'good','그럼 다음에는 서류 없이 갈게요. 질문도 경찰이 아니라 내가 하고요.',{},'boundary'),
   C('complicity','새 라이벌 정보를 건네며 사건이 끝나지 않을 이유를 만든다','둘만 아는 비공식 수사로 유진의 역할을 계속 남긴다',6,-3,12,'bad','이걸 받으면 계속 당신 담당으로 남을 수 있겠네요. 그게 잘못된 이유인데도… 지금은 돌려주고 싶지 않아요.',{morality:-4},'complicity')
  ]},
  {title:'내부 비리 제보',min:42,scene:'event-yujin-night-call.png',desc:'빗소리가 큰 비상계단에서 유진이 동료의 증거 조작 정황을 털어놓습니다. 제보하면 조직에서 고립될 수 있고, 덮으면 승진은 지킬 수 있습니다. 공식 기록에 남기기 전 유진이 처음 건 전화는 감찰실이 아니라 당신에게였습니다.',speaker:'정의로운 척하고 싶어서가 아니에요. 내가 침묵하면 피해자는 평생 자기 말을 의심하게 될 거예요. 그런데 혼자 들어가기는… 조금 무서워요.',choices:[
   C('depend','통화가 끝날 때까지 곁에 있겠다며 모든 결정을 함께 하자고 한다','유진은 원칙보다 당신의 존재에 기대어 제보를 시작한다',12,10,7,'neutral','끊지 마요. 당신 목소리가 들리면 내가 틀리지 않았다는 생각이 드니까.',{morality:4},'depend'),
   C('boundary','증거를 복사하고 정식 감찰 절차와 보호 요청을 준비한다','유진의 판단을 존중하며 현실적인 안전망을 만든다',11,15,-5,'good','무작정 나서라고 하지 않고 살아남을 방법까지 찾아줘서 고마워요.',{morality:6},'boundary'),
   C('complicity','내 인맥으로 조작한 동료부터 조용히 밀어내겠다고 한다','비리를 다른 비공식 권력으로 덮는다',5,-6,13,'bad','싫다고 해야 하는데… 당신이 내 편을 드는 방식이 왜 이렇게 안심되는지 모르겠어요.',{morality:-7,guilt:3},'complicity')
  ]},
  {title:'사진 뒷면의 이름',min:54,scene:'event-yujin-night-3.png',desc:'연인이 된 뒤 처음 맡은 새 사건에서, 압수 사진 사이에 당신의 최근 동선이 찍힌 사진이 나왔습니다. 유진은 신고보다 먼저 당신에게 전화했고, 증거 봉투 뒷면에는 발견 시각보다 “내가 먼저 알았어야 했다”는 문장이 진하게 남았습니다.',speaker:'친구였을 때도 지나쳤는데, 연인이 되고 나니 더 먼저 알아야 한다고 생각했어요. 누가 당신을 본 것보다 내가 놓쳤다는 사실이 더 화나는 게… 정상은 아니죠.',choices:[
   C('depend','다음부터는 유진이 먼저 찾아내 달라고 부탁한다','위험을 막는 일과 당신을 지켜보는 일을 같은 권한으로 건넨다',13,8,11,'neutral','그러면 숨지 마요. 내가 못 찾는 곳으로 가는 일도 없게 해줘요.',{},'depend'),
   C('boundary','사진은 증거로 넘기고 귀가 후 안부만 주고받기로 한다','불안을 인정하되 일상을 수사 대상으로 만들지 않는다',10,15,-7,'good','확인하고 싶은 충동이 들면 먼저 물을게요. 대답하지 않을 권리도 당신한테 있고요.',{},'boundary'),
   C('complicity','사진 속 장소를 역추적해 둘이 먼저 상대를 잡자고 한다','공식 수사보다 빠른 사적인 추적을 택한다',8,-4,15,'bad','좋아요. 대신 오늘부터 당신 동선은 내가 전부 알아야 해요. 놓치면 계획이 무너지니까.',{morality:-8},'complicity')
  ]},
  {title:'제복을 정리하는 밤',min:64,scene:'event-yujin-2.png',desc:'감찰 조사를 마친 유진은 텅 빈 탈의실에서 제복을 벗어 사물함에 겁니다. 늘 구조하는 쪽에 서야만 사랑받을 수 있다고 믿었던 사람은, 오늘만큼은 당신에게 해줄 일이 없습니다. 쓸모가 없는 밤에도 연인으로 남을 수 있는지 처음 묻습니다.',speaker:'제복도 사건도 없으면 내가 당신한테 뭘 해줄 수 있죠? 지켜줄 수 없는 날에도 나를 찾을 거라는 확신이 없어요.',choices:[
   C('depend','오늘만큼은 내가 지킬 테니 아무것도 하지 말고 기대라고 한다','보호받는 쪽에 서는 안도감을 유진에게 알려준다',14,12,10,'neutral','지켜지는 게 이렇게 편하면… 나 자꾸 약해지고 싶어질지도 몰라요.',{},'depend'),
   C('boundary','해줄 일이 없어도 연인으로 만나면 된다고 말한다','구원자 역할 밖에서도 남는 애정을 확인한다',12,17,-7,'good','그럼 사건이 없는 날에도 연락할게요. 도와줄 일부터 찾지 않고, 그냥 보고 싶다고 말해볼게요.',{},'boundary'),
   C('complicity','경찰이 아니어도 내 세력의 방패가 되면 된다고 한다','공권력 대신 사적인 충성을 새 직업처럼 건넨다',9,-3,16,'bad','경찰이 아니어도 당신을 지킬 수 있다면 됐어요. 대신 이제 내 규칙은 당신 하나예요.',{morality:-8},'complicity')
  ]},
  {title:'병실의 밤샘',min:74,scene:'event-yujin-14.png',desc:'라이벌의 보복으로 병원에 실려 온 뒤 눈을 뜨자 유진이 침대 옆 의자에서 잠들어 있습니다. 근무 교대도 거부하고 밤새 맥박과 문을 번갈아 확인했습니다. 당신이 눈을 뜨고 자기 이름부터 부르자, 지친 얼굴에 죄책감보다 먼저 안도가 번집니다.',speaker:'다쳐서 다행이라는 뜻은 아니에요. 그런데 당신이 약해진 순간 제 이름을 먼저 부른 게… 기뻤어요. 이제는 내가 왜 사람을 구하려 드는지 무서워요.',choices:[
   C('depend','유진이 없으면 다시 잠들 수 없다고 손을 잡는다','당신이 무너질수록 유진이 머물 이유와 안도감이 선명해진다',15,10,12,'neutral','자요. 눈 뜨면 또 내가 있을게요. 나를 필요로 하는 동안은 절대 비우지 않을게요.',{},'depend'),
   C('boundary','고맙다고 말한 뒤 교대가 끝나면 반드시 쉬러 보내겠다고 한다','돌봄을 받으면서도 유진의 삶까지 소진시키지 않는다',12,17,-8,'good','쫓아내는 말인데 이상하게 안심되네요. 다음에는 쉬고 나서, 내 선택으로 올게요.',{},'boundary'),
   C('complicity','습격자의 병실 위치를 알아내 달라고 낮게 부탁한다','환자와 경찰이 같은 밤에 복수를 준비한다',9,-5,17,'bad','다친 채로 그런 말을 하면 거절할 수 없잖아요. 주소는 내가 알아올게요. 당신은 여기 있어요.',{morality:-10,guilt:4},'complicity')
  ]},
  {title:'사건 없는 약속',min:82,scene:'event-yujin-riverside-date.png',desc:'연인이 된 뒤에도 만남은 조사, 귀가 확인, 병원처럼 당신이 위험한 날에만 이어졌습니다. 아무 사건도 없는 강변에서 유진은 다음 일정을 적으려다 수첩을 덮습니다. 누군가를 구하지 않는 날에도 사랑하는 법을 배울 수 있는지 묻습니다.',speaker:'당신이 괜찮은 날에는 내가 필요 없어진 것 같아 불안했어요. 연인이라면 위험할 때만 나타나는 사람이 아니라는 걸 아는데도요.',choices:[
   C('depend','평온한 날에도 유진이 먼저 일정을 정해 달라고 한다','보호를 매일의 선택권까지 넓혀 서로가 필요한 이유를 유지한다',15,10,12,'neutral','그럼 내가 정할게요. 아픈 날도 괜찮은 날도, 당신 일정에 내가 빠지지 않게.',{},'depend'),
   C('boundary','오늘은 아무도 구하지 말고 연인으로만 걷자고 한다','보호가 아니라 선택으로 함께 있는 법을 연습한다',14,18,-8,'good','좋아요. 오늘은 확인 질문도 기록도 없이 걸을게요. 그냥 당신 옆이 좋아서.',{},'boundary'),
   C('complicity','사건이 없는 날에도 둘만의 비공식 보고를 계속하자고 한다','연애와 사적 감시를 하나의 생활 습관으로 묶는다',10,-3,16,'bad','그럼 매일 보고할 이유가 생기네요. 연인이라서인지 담당이라서인지 구분하지 않아도 되고요.',{morality:-8},'complicity')
  ]},
  {title:'기대도 되는 사람',min:88,scene:'event-yujin-5135.png',desc:'당신이 세력과 과거 이야기를 한꺼번에 털어놓다 말을 잇지 못하자 유진은 해결책부터 말하지 않고 품에 안습니다. 자신에게 완전히 기대는 순간을 기다려 온 안도와, 그걸 기뻐하는 자신에 대한 죄책감이 동시에 얼굴에 드러납니다.',speaker:'처음에는 시민을 지키는 일이라고 생각했어요. 그런데 당신이 나를 필요로 할 때마다… 내가 여기 있어야 할 이유가 생기는 게 좋았어요.',choices:[
   C('depend','유진이 필요하다는 말을 숨기지 않고 더 꽉 안는다','서로 번갈아 무너져도 놓지 않는 강한 의존을 받아들인다',17,12,15,'neutral','그 말 다시 해줘요. 내가 필요하다고. 오늘은 그게 잘못이어도 놓치고 싶지 않아요.',{},'depend'),
   C('boundary','안긴 채로도 내가 다시 설 때까지 기다려 달라고 한다','위로와 회복을 같은 관계 안에 남긴다',14,19,-9,'good','기대도 돼요. 다시 설 때 손을 놓는 것도 내가 배울게요.',{},'boundary'),
   C('complicity','둘만 남으면 아무도 진실을 증명하지 못한다고 속삭인다','위로를 서로의 퇴로를 없애는 약속으로 바꾼다',11,-4,19,'bad','그러면 내가 마지막 증인이네요. 당신을 고발할 사람도, 구할 사람도 나 하나뿐이에요.',{morality:-12},'complicity')
  ]},
  {title:'가장 먼저 부르는 이름',min:94,scene:'event-yujin-safehouse-ending.png',desc:'라이벌의 마지막 공격이 예고된 밤, 유진은 안전가옥의 CCTV를 전부 켜고 당신을 중앙 화면에 앉힙니다. 열쇠와 사직서와 증거 봉투가 나란히 놓였습니다. 보호, 감시, 사랑 중 무엇을 남길지 더는 직업 뒤에 숨길 수 없습니다.',speaker:'경찰인 나를 부르면 절차대로 지킬게요. 강유진을 부르면… 당신이 나를 필요로 하는 방식부터 먼저 택할 거예요. 어느 이름으로 남을까요?',choices:[
   C('depend','감시 화면을 끄고 오늘 밤은 서로밖에 필요 없다고 말한다','구조와 의존을 두 사람의 생활로 받아들인다',18,13,18,'neutral','좋아요. 당신이 무너질 때 내가 있고, 내가 흔들릴 때 당신이 있으면 돼요. 먼저 괜찮아지려고 하지 마요.',{},'depend'),
   C('boundary','열쇠는 나눠 갖고 각자의 자리에서 같은 싸움을 하자고 한다','도움과 자유를 함께 지키는 동등한 연인이 된다',16,20,-12,'good','부르면 갈게요. 하지만 이제 당신이 혼자 서 있는 모습도 사랑할 수 있을 것 같아요.',{},'boundary'),
   C('complicity','사직서를 내고 내 세력의 비밀 책임자가 되라고 한다','법보다 서로를 먼저 두는 완전한 공범을 택한다',14,-4,20,'bad','이제 영장도 보고서도 필요 없네요. 당신이 명령하면 내가 먼저 찾아갈게요.',{morality:-15,guilt:8},'complicity')
  ]}
 ],
 '윤세라':[
  {title:'열두 통을 지운 밤',min:18,scene:'event-sera-2.png',desc:'함께 편의점까지 걸었던 날과 몰래 찍은 사진을 지운 사건 뒤, 세라는 새벽 식탁에 휴대폰을 내려놓습니다. 답이 없던 두 시간 동안 통화 버튼을 열두 번 눌렀지만 실제로 건 전화는 한 통뿐입니다. 밖으로 한 번 나갔다고 두 사람의 공포가 사라진 것은 아니며, 기다림을 침입으로 바꾸지 않는 규칙이 필요하다고 세라가 먼저 말합니다.',speaker:'열두 번 다 걸고 싶었어요. 문을 열고 들어가면 더 빨랐고요. 그래도 계단에서 기다려 준 일을 없던 일로 만들기 싫어서 열한 통은 지웠어요. 한 통만 걸어도… 받아줄 수 있어요?',choices:[
   C('anchor','나도 다시 문 앞에서 멈출 수 있으니 한 통 뒤에는 서로 기다리자고 한다','한 번의 외출을 완치로 꾸미지 않고 두 사람의 불안을 반복 가능한 약속으로 바꾼다',10,13,-9,'good','그럼 한 번만 걸고 기다릴게요. 당신이 못 나오는 날에는 문밖에서 재촉하지 않고요.',{},'anchor'),
   C('fuse','한 통에도 답이 없으면 다음에는 직접 들어오라고 한다','세라의 절제를 칭찬하는 대신 침입할 권한을 보상으로 건넨다',12,3,12,'neutral','제가 참은 걸 알아준 건 좋은데… 보상이 열쇠라니, 당신도 나만큼 이상해요.',{},'fuse'),
   C('sever','기다린 일을 생색내지 말라며 앞으로 전화하지 말라고 한다','어렵게 시도한 절제까지 조작으로 단정해 대화의 출구를 닫는다',-9,-11,15,'bad','알겠어요. 전화는 안 할게요. 답을 기다리지 않는 다른 방법을 찾으면 되니까.',{},'sever')
  ]},
  {title:'비 오던 날의 파산 통지',min:32,scene:'event-sera-lip-confession.png',desc:'세라는 아래입술을 깨문 채 계약서가 휴지조각이 된 날을 처음부터 이야기합니다. 정산금을 빼돌린 세력, 전화를 받지 않은 사람들, 비를 피해 앉은 골목. 당신도 첫 공격으로 돈과 일상을 잃고 방 안에 틀어박혔던 시간을 꺼내 놓습니다.',speaker:'돈을 잃은 게 제일 무서웠던 건 아니에요. 내가 없어져도 아무도 확인하지 않을 것 같았어요. 당신은… 왜 나를 찾으러 왔어요?',choices:[
   C('anchor','나도 같은 세력에게 무너졌고 혼자 살아남기 싫었다고 답한다','구해준 사람과 구해진 사람의 자리를 서로 바꿔 앉는다',12,14,-10,'good','그럼 빚진 건 없네요. 그날은… 서로를 주운 거니까.',{morality:3},'anchor'),
   C('fuse','널 버린 사람들을 전부 기억해뒀다고 조용히 말한다','상처를 함께 복수할 공동 명분으로 바꾼다',13,5,13,'neutral','그 이름들, 나도 다 적어뒀어요. 이제 우리 둘이 같은 쪽이네요.',{morality:-2},'fuse'),
   C('sever','과거보다 세력이 가진 정보가 필요해서 데려왔다고 말한다','세라를 다시 쓸모로 평가받는 자리에 세운다',-12,-14,16,'bad','그럼 쓸모가 끝나는 날도 정해져 있겠네요. 그날이 오기 전에 제가 정할게요.',{},'sever')
  ]},
  {title:'잠긴 작업실',min:46,scene:'event-sera-three-chairs.png',desc:'세라의 작업실 문이 안에서 잠겼고, 당신 물건과 일정표가 벽 한쪽을 채우고 있습니다. 세라는 이것이 관계를 지키기 위한 기록이라고 말하지만, 손에는 문을 잠근 체인이 들려 있습니다.',speaker:'없어질까 봐 남겨둔 것뿐이에요. 기억만 믿었다가 또 혼자 남으면 어떡해요?',choices:[
   C('anchor','문을 함께 열고 상담과 생활 지원을 찾는다','세라를 버리지 않으면서 위험 행동에는 외부 도움을 연결한다',8,14,-15,'good','나를 버리려고 문을 여는 게 아니라는 걸… 믿어볼게요.',{cash:-700000},'anchor'),
   C('fuse','벽의 빈칸에 내 일정과 세라의 일정표를 나란히 붙인다','감시당하는 대신 서로를 같은 방식으로 감시한다',10,4,14,'neutral','제 것까지 알고 싶다고요? 그럼 어느 쪽도 먼저 사라질 수 없겠네요.',{},'fuse'),
   C('sever','무서워서 아무 말 없이 작업실을 떠난다','즉시 거리를 두지만 세라의 공포가 집착으로 굳어진다',-14,-12,19,'bad','또 문이 닫혔네요. 이번엔 내가 밖에 있을 차례인가 봐.',{},'sever')
  ]},
  {title:'어깨 하나만큼의 거리',min:58,scene:'event-sera-shoulder-confession.png',desc:'비가 그치지 않는 새벽, 세라는 처음으로 휴대폰을 내려놓고 당신 어깨에 머리를 기댑니다. 정상적으로 살라는 말만 들었던 과거와, 사람들에게 둘러싸여도 결국 모두 놓친 당신의 과거가 한 문장씩 오갑니다.',speaker:'당신 옆에서는 괜찮은 척하지 않아도 돼서 무서워요. 이대로 기대면… 나중에 혼자 앉는 법을 잊을 것 같아서.',choices:[
   C('anchor','혼자 설 수 있어도 돌아와 기대는 사이가 되자고 한다','의존을 숨기지 않되 서로의 출구는 남긴다',14,16,-13,'good','돌아올 곳이 있으면 나가는 것도 조금은 덜 무서울 것 같아요.',{},'anchor'),
   C('fuse','바깥이 우리를 망쳤으니 둘만 남아도 된다고 속삭인다','세라의 폐쇄 욕구를 플레이어도 함께 선택한다',16,8,17,'bad','그 말, 취소하면 안 돼요. 이번에는 제가 아니라 당신이 먼저 말했으니까.',{},'fuse'),
   C('sever','기대는 순간 사랑으로 착각하지 말라고 밀어낸다','오해는 막지만 고백까지 한꺼번에 거절한다',-15,-15,15,'bad','알아요. 기대도 되는 어깨라고 착각한 건 저니까.',{},'sever')
  ]},
  {title:'잠들지 않은 같은 밤',min:70,scene:'event-sera-bed.png',desc:'한집에 머문 밤, 세라는 눈을 감지 못한 채 당신이 잠들기를 기다립니다. 예전에는 상대가 잠든 뒤 휴대폰과 열쇠를 확인했지만, 오늘은 먼저 그 충동을 말합니다.',speaker:'잠들면 또 혼자 확인하고 싶어질 것 같아요. 숨기면 평범해 보일 수 있는데… 이번에는 말하고 싶었어요.',choices:[
   C('anchor','휴대폰은 각자 두고 불안하면 깨워 말하자고 정한다','숨은 감시 대신 불편한 대화를 선택한다',13,16,-14,'good','깨워도 화내지 않는다고 했죠? 그 약속부터 믿고 자볼게요.',{},'anchor'),
   C('fuse','내 휴대폰을 건네고 세라의 휴대폰도 받아 든다','서로의 비밀을 없애 안심을 만든다',15,6,16,'neutral','비밀번호도 같게 해요. 당신이 보면 나도 보고, 내가 보면 당신도 보게.',{},'fuse'),
   C('sever','세라가 잠든 뒤 말없이 집을 나간다','당장의 충돌을 피하는 대신 가장 오래된 공포를 재현한다',-18,-18,22,'bad','아침에 빈자리부터 봤어요. 이제는 잠들지 않으면 되겠네요.',{},'sever')
  ]},
  {title:'빌려 입은 생활',min:78,scene:'event-sera-5.png',desc:'아침에 세라가 당신의 검은 후드티를 입고 나옵니다. 냉장고에는 두 사람 몫의 장보기 목록이 붙었고, 현관에는 신발 두 켤레가 섞여 있습니다. 세라는 옷보다 “우리 생활처럼 보이는 흔적”을 빌리고 싶었다고 고백합니다.',speaker:'돌려달라고 하면 돌려줄게요. 옷도, 열쇠도… 여기서 살고 싶다는 마음까지도요. 아마 마지막 건 잘 안 되겠지만.',choices:[
   C('anchor','빌릴 때 묻고 돌아올 때 알려주는 생활 규칙을 함께 적는다','소유가 아닌 반복 가능한 공동생활을 만든다',13,15,-10,'good','규칙이 내보내기 위한 게 아니라 같이 살기 위한 거라면 좋아요.',{},'anchor'),
   C('fuse','내 옷만 입으라며 나도 세라 물건만 쓰겠다고 한다','서로의 흔적만 남기는 폐쇄적인 생활을 고른다',15,7,15,'neutral','그럼 누가 봐도 섞여 보이겠네요. 어디까지가 당신이고 나인지 모르게.',{},'fuse'),
   C('sever','내 물건과 흔적을 전부 분리해 오늘 안에 치우라고 한다','경계를 세우지만 동거 자체를 처벌처럼 끝낸다',-14,-14,14,'bad','네. 보이는 건 다 치울게요. 안 보이는 데 남아 있으면 되니까.',{},'sever')
  ]},
  {title:'세 개의 빈 의자',min:86,scene:'event-sera-three-chairs.png',desc:'세라의 작업실에는 당신 앞의 빈 의자가 세 개 놓여 있습니다. 세라는 혼자 감시하면 자신이 나쁜 사람이 되지만, 당신을 절대 놓치지 않을 다른 사람들이 함께라면 그것을 “보호”라고 부를 수 있지 않겠느냐고 묻습니다.',speaker:'나 혼자라서 무서운 거면… 나처럼 당신을 놓치기 싫은 사람이 더 있으면 괜찮아지는 거 아닌가요?',choices:[
   C('anchor','세 사람이 아니라 상담자와 친구를 연락망에 넣자고 한다','불안을 여러 안전한 관계에 분산한다',9,14,-9,'good','싫지만… 당신이 돌아오는 데 도움이 된다면 이름을 적을게요.',{},'anchor'),
   C('fuse','유진과 채린도 당신을 놓치지 못한다고 알려준다','위험한 세 사람의 결핍을 하나의 망으로 묶는다',13,5,12,'neutral','그 둘도 같은 눈을 한다는 거 알아요. 마음에는 안 들지만, 잃어버리지는 않겠네요.',{},'fuse'),
   C('sever','의자와 기록을 전부 버리라고 명령한다','표면은 치우지만 버림받을 공포를 다시 자극한다',-10,-12,14,'bad','알겠어요. 보이는 건 다 버릴게요. 안 보이는 데 기억하면 되니까.',{},'sever')
  ]}
  ,{title:'두 개의 열쇠',min:92,scene:'event-sera-mutual-captivity.png',desc:'동이 틀 무렵 세라가 두 개의 열쇠를 손바닥에 올립니다. 하나는 밖으로 나가는 열쇠고, 하나는 돌아오는 열쇠입니다. 어느 쪽도 세라 혼자 정하지 않겠다고 말한 순간, 선택은 오히려 당신에게 넘어옵니다.',speaker:'문을 열어둘까요, 같이 잠글까요? 이번에는 제가 가두는 척하면서 당신 뜻을 숨기게 하지 말아요. 당신이 진짜 원하는 걸 말해줘요.',choices:[
   C('anchor','각자 열쇠를 갖고 반드시 돌아온다는 약속만 나눈다','열린 문을 선택하면서도 서로의 귀환을 믿는다',16,18,-16,'good','나가도 된다는 말보다 돌아온다는 말이 더 좋아요. 그럼 문은 열어둘게요.',{},'anchor'),
   C('fuse','두 열쇠를 안쪽에 내려놓고 함께 잠금장치를 돌린다','누가 누구를 가뒀는지 구분할 수 없는 둘만의 세계를 택한다',18,10,20,'bad','이번에는 제가 먼저 잠근 게 아니에요. 그러니까… 우리 둘 다 피해자인 척하지 말아요.',{},'fuse'),
   C('sever','열쇠를 모두 두고 다시는 돌아오지 않겠다고 한다','관계와 집착을 한꺼번에 끊고 외부 보호를 요청한다',-20,-18,-8,'neutral','알겠어요. 이번에는 따라가지 않을게요. 대신 정말 끝인지 오래 확인하게 될 거예요.',{},'sever')
  ]}
 ],
 '한채린':[
  {title:'잠기지 않은 개인실',min:18,scene:'event-chaerin-private-command.png',desc:'공개된 자리의 충돌 뒤 채린은 나래와 수행원까지 내보내고 개인실에 당신만 다시 부릅니다. 문은 닫되 잠그지 말라고 명령한 뒤, 정작 자신이 어디에 앉아야 하는지 당신에게 묻습니다. 밖에서 타인의 선택지를 좁히던 사람이 자기 욕망을 명령문 뒤에 숨기기 시작한 첫 장면입니다.',speaker:'거기 서 있어. 사과는 하지 말고. 그리고… 내가 뭘 해야 하는지 네가 말해. 착각하지 마, 내가 원해서 묻는 건 아니니까.',choices:[
   C('command','상석에서 내려와 내 앞에 앉고, 먼저 잘못을 인정하라고 명령한다','채린의 욕망을 맞춰주되 공개 모욕의 책임까지 지우지는 않는다',15,10,10,'neutral','사과를 받아내면서 앉을 자리까지 정하네. 그래, 이 방에서는 네가 끝까지 말해.',{},'command'),
   C('equal','문을 열어두고 둘 다 사과한 뒤 다음 만남은 공개 시험 없이 정하자고 한다','욕망보다 안전과 대등한 선택을 먼저 합의한다',12,17,-8,'good','재미없을 만큼 정상적인 답인데… 네가 다시 온다면 한 번은 해볼게.',{},'equal'),
   C('conspire','밖에서는 오늘 일을 덮고 개인실 안에서만 역할을 뒤집자고 한다','공개 책임을 지우는 대신 둘만의 권력 게임으로 봉합한다',10,-4,17,'bad','밖에서는 내가 널 데리고, 문이 닫히면 네가 나를 다룬다… 이제야 숨길 가치가 생겼네.',{morality:-7,guilt:4},'conspire')
  ]},
  {title:'엘리베이터의 닫힘 버튼',min:28,scene:'event-chaerin-2.png',desc:'채린은 첫날 계약을 받아들였거나 정중히 돌려줬다면 그대로 끝났을 거라고 말합니다. 계약을 찢은 당신도 결국 자기가 설계한 시험에 반응했을 뿐이라는 말에, 엘리베이터 안의 공기가 다시 차가워집니다.',speaker:'너는 내 제안을 거절한 게 아니야. 내가 만든 선택지 중 제일 재미있는 걸 골랐지. 그것도 자유라고 생각해?',choices:[
   C('command','선택지를 만든 사람도 거절당할 수 있다는 걸 똑똑히 기억하라고 한다','채린의 연출 바깥에서 관계의 주도권을 되찾는다',14,10,9,'neutral','그래, 그 표정. 내가 통제 못 하는 대답을 할 때만 네가 진짜처럼 보여.',{},'command'),
   C('equal','처음부터 공정한 제안은 아니었다고 인정하면 다시 이야기하겠다고 한다','시험의 책임을 채린에게 돌리고 대화를 이어간다',12,16,-7,'good','사과까지 받아내려고? 비싼 사람이네. …그래도 이번에는 내가 먼저 잘못했다고 할게.',{},'equal'),
   C('conspire','다음에는 내가 선택지를 만들 테니 채린이 하나를 고르라고 한다','시험을 상호 권력 게임으로 받아들인다',10,-2,15,'bad','좋아. 대신 네 선택지가 시시하면 엘리베이터째 사버릴 거야.',{morality:-3},'conspire')
  ]},
  {title:'앉을 자리를 정하는 사람',min:38,scene:'event-chaerin-private-command.png',desc:'채린은 개인실에 상석 하나만 남겨두고 당신을 부릅니다. 고분고분 앉기를 기다리는 척하지만, 정작 자신은 문 앞에 선 채 당신이 그 자리를 치우라고 말하기만 기다립니다. 채린은 명령하는 목소리로 명령받을 이유를 만들고 있습니다.',speaker:'내 자리는 저기고 네 자리는 내 앞이야. 마음에 안 들면 바꿔봐. 지난번처럼 화만 내지 말고, 이번에는 끝까지 네 말로 정해.',choices:[
   C('command','상석을 치우고 채린에게 문 옆의 낮은 의자에 앉으라고 명령한다','채린이 만든 서열을 뒤집되 둘만의 공간에서 끝낸다',15,12,11,'neutral','남이 정한 낮은 자리는 질색인데… 네가 정하니까 왜 앉고 싶지.',{},'command'),
   C('equal','의자를 하나 더 가져와 같은 높이에 놓으라고 한다','굴복을 요구하지 않고 채린이 직접 자리를 고르게 한다',13,17,-8,'good','같은 높이가 더 어려운 선택이라는 걸 알고 그러는 거지? 좋아. 이번에는 도망치지 않을게.',{},'equal'),
   C('conspire','밖에서는 채린의 장식품, 안에서는 채린의 주인으로 행동하겠다고 한다','서로의 욕망을 비밀 서열로 굳힌다',11,-4,18,'bad','밖과 안이 완전히 반대라… 들키면 둘 다 끝나는 규칙이라 마음에 드네.',{morality:-6},'conspire')
  ]},
  {title:'화가 나야 하는데',min:48,scene:'event-chaerin-4.png',desc:'세 번째 동행에서 선을 넘었던 밤 이후 채린은 며칠 동안 연락하지 않았습니다. 다시 만난 채린은 그날 당신이 떠났어야 정상이라면서도, 자신이 먼저 모욕하고 붙잡았던 사실을 처음 인정합니다.',speaker:'네가 잘못한 부분은 없어지지 않아. 나도 잘못했고. 그런데 왜 화보다 네가 다시 안 올까 봐 겁난 게 먼저였을까?',choices:[
   C('command','잘못을 욕망으로 포장하지 말고 다시는 같은 시험을 만들지 말라고 한다','위험한 각성을 애정의 증명으로 미화하지 않는다',16,15,7,'neutral','알았어. 듣기 싫어도 네 말이 맞아. 다음에는 화나게 하지 말고 그냥 불러볼게.',{},'command'),
   C('equal','둘 다 넘은 선을 기록하고 공개적인 모욕과 신체적 충돌을 금지한다','관계를 이어가되 안전한 경계를 공동으로 만든다',13,19,-12,'good','계약서 싫다더니 규칙은 쓰네. 이번 문서는 내가 먼저 지킬게.',{},'equal'),
   C('conspire','서로의 약점을 묻어주는 대신 밖에서는 완벽한 편이 되자고 한다','상처와 책임을 둘만의 비밀로 봉합한다',11,-4,18,'bad','세상에는 흠 없는 얼굴만 보여주고, 망가진 건 우리 둘만 보자는 거지. 좋아.',{morality:-8,guilt:4},'conspire')
  ]},
  {title:'명령을 부탁하는 여자',min:56,scene:'event-chaerin-private-command.png',desc:'채린은 당신의 약속을 멋대로 취소하고 휴대폰을 빼앗은 뒤, 화를 내지 않자 오히려 초조해집니다. “앉아, 따라와, 연락 끊어”라고 명령을 늘어놓지만 그 모든 말은 당신이 자기 말을 끊고 반대로 명령해 주기를 기다리는 도발입니다.',speaker:'왜 가만히 있어? 내가 네 일정을 지웠고 연락도 막았어. 화내야 정상 아니야? …시키는 대로만 할 거면 그날은 왜 그랬는데.',choices:[
   C('command','휴대폰을 내려놓고 명령하지 말고 원하는 것을 부탁하라고 시킨다','도발로 반응을 훔치지 못하게 하고 직접 욕망을 말하게 한다',16,15,11,'neutral','부탁은 명령보다 훨씬 어려워. 그래도… 오늘 가지 말아 달라고 하면 남아줄 거야?',{},'command'),
   C('equal','불안할 때 쓸 짧은 질문과 대답을 함께 정한다','시험 대신 직접 확인하는 방법을 만든다',14,18,-10,'good','“남아 있어?”라고 물으면 “응”이라고 해줘. 그 정도면 다음 시험은 참아볼게.',{},'equal'),
   C('conspire','더 심하게 화나게 만들면 원하는 반응을 주겠다고 속삭인다','도발을 애정 확인 수단으로 강화한다',12,-5,20,'bad','그러면 다음에는 정말 못 참을 일을 만들어볼게. 그래도 버리지는 마.',{morality:-7,guilt:3},'conspire')
  ]},
  {title:'화내지 않는 사람',min:64,scene:'event-chaerin-private-command.png',desc:'채린은 당신을 자극하려고 집 앞에 사람을 세우고 약속 시간을 바꾸고 세라와 유진에게까지 자기 명령을 전달합니다. 하지만 당신은 손도 목소리도 높이지 않고 모든 지시를 취소한 뒤, 도발해서 얻은 반응은 채린이 선택받았다는 증거가 아니라고 말합니다.',speaker:'차라리 화를 내. 내가 잘못했다고 말하면 되잖아. 그렇게 조용히 전부 돌려놓으면… 내가 혼자 매달린 사람 같아지잖아.',choices:[
   C('command','원하는 반응을 얻으려고 사고 치지 말고 보고 싶으면 직접 찾아오라고 명령한다','채린의 욕망을 간파하되 약점으로 이용하지 않는다',17,17,10,'neutral','보고 싶어서 왔다고 말하는 게 맞는 것보다 더 굴욕적이네. …그래도 다음에는 그렇게 할게.',{},'command'),
   C('equal','화를 내지 않아도 떠나지 않는다는 사실을 행동으로 보여준다','도발과 처벌 없이 관계가 유지되는 경험을 준다',15,20,-12,'good','아무 일도 안 만들었는데 남아 있네. 이런 확인도 가능하다는 걸 이제야 알았어.',{},'equal'),
   C('conspire','채린의 욕망을 비밀로 지키는 대가로 자신의 명령에 복종하라고 한다','채린의 결핍을 협박 가능한 약점으로 바꾼다',13,-7,22,'bad','내 약점을 잡았으니 제대로 써. 어중간하게 착한 척하면 더 화날 것 같으니까.',{morality:-11,guilt:5},'conspire')
  ]},
  {title:'값이 없는 저녁',min:72,scene:'event-chaerin-private-dinner.png',desc:'후계자 발표 전날, 채린은 수행원도 예약 명단도 없는 작은 방에서 한 끼만 같이 먹어달라고 합니다. 돈도 자리도 주지 않으면 사람이 남을 이유가 없다고 믿었던 손이 테이블 위에서 갈 곳을 잃습니다.',speaker:'오늘은 아무것도 안 줄게. 그러면 네가 올 이유가 없다는 건 아는데… 이유 없이 와달라는 부탁도 한 번은 해보고 싶었어.',choices:[
   C('command','휴대폰을 끄고 오늘만큼은 이사도 후계자도 하지 말라고 한다','채린이 원한 안식처를 책임 있는 명령으로 만든다',17,15,11,'neutral','세상에서 제일 비싼 시간을 그렇게 쓰라고? …좋아. 오늘은 시키는 대로 낭비할게.',{},'command'),
   C('equal','서로 한 가지씩 솔직하게 말하는 평범한 저녁을 보낸다','거래가 없어도 남는 시간을 만든다',15,19,-10,'good','가격이 없는 시간이 아직 낯설어. 다음에도 내가 먼저 물어봐도 돼?',{},'equal'),
   C('conspire','식사 뒤 후계 경쟁자의 동선을 넘겨달라고 한다','다정한 부탁까지 거래의 입구로 사용한다',12,-4,19,'bad','역시 공짜는 없네. 오히려 안심돼. 필요한 자료는 차에 준비해뒀어.',{morality:-10},'conspire')
  ]},
  {title:'검은 목걸이',min:80,scene:'event-chaerin-black-collar.png',desc:'채린이 검은 목걸이를 테이블 위에 내려놓습니다. 밖에서 사람을 소유해온 자신이 안에서는 소유당하고 싶어졌다는 고백처럼 보이지만, 잠금장치와 열쇠는 자기 쪽에 둔 채 상징과 실제 통제를 구분할 규칙을 먼저 정해달라고 합니다.',speaker:'내가 찰 거라고 한 적 없어. 크기가 우연히 맞는 것뿐이야. 그래도… 내가 직접 차고, 내가 직접 풀 수 있게 하라고 네가 명령하면 생각은 해볼게.',choices:[
   C('command','열쇠는 채린이 갖고 착용과 해제도 직접 결정하라고 명령한다','굴복 욕구 속에서도 채린의 동의와 중단권을 지킨다',17,17,9,'neutral','내가 결정하라고 명령하네. 모순인데… 그래서 더 안전한 것 같아.',{},'command'),
   C('equal','목걸이 대신 같은 모양의 팔찌를 하나씩 나눠 낀다','서열의 상징을 상호 약속으로 바꾼다',16,20,-12,'good','한쪽만 내려가는 게 아니라 같이 묶이는 거네. 이건 남들 앞에서도 할 수 있겠다.',{},'equal'),
   C('conspire','둘만 있을 때의 명령과 밖에서의 권력 교환 조건을 문서화한다','욕망과 사업 권력을 하나의 비밀 계약으로 묶는다',14,-3,21,'bad','이제야 찢을 필요 없는 계약서가 생겼네. 위반하면 서로 전부 잃는 걸로 하자.',{cash:8000000,morality:-8},'conspire')
  ]},
  {title:'빌려 입힌 재킷',min:88,scene:'event-chaerin-9.png',desc:'가족 만찬에서 채린은 완벽한 후계자 얼굴을 유지했지만 차에 타자마자 재킷을 당신에게 다시 걸쳐줍니다. 사랑받으려면 더 유능하거나 더 복종해야 했던 어린 시절과, 공개적으로 약해질 수 없었던 이유를 처음 끝까지 말합니다.',speaker:'내가 지는 걸 좋아하는 게 아니라, 져도 버려지지 않는 걸 확인하고 싶은 거였어. 이제는 그 차이를 조금 알 것 같아.',choices:[
   C('command','오늘만은 설명을 멈추고 내 어깨에 기대라고 한다','채린의 결핍을 이용하지 않고 쉴 시간을 명령한다',18,17,13,'neutral','그런 명령이면 평생 들어도 될 것 같다는 말은… 오늘만 참을게.',{},'command'),
   C('equal','재킷을 반씩 덮고 상처를 증명하지 않아도 남겠다고 말한다','복종 없이도 버려지지 않는 관계를 보여준다',17,21,-13,'good','그 말을 믿는 게 계약서보다 어려워. 그래도 이번에는 믿어볼게.',{},'equal'),
   C('conspire','그 가족을 끌어내릴 명단을 함께 작성한다','상처를 공동의 권력과 복수로 바꾼다',15,-2,22,'bad','사랑은 못 배웠어도 승리는 배웠으니까, 우리 방식으로 가족을 다시 만들자.',{morality:-13,guilt:6},'conspire')
  ]},
  {title:'왕관을 내려놓는 방',min:94,scene:'event-chaerin-crown-down.png',desc:'늦은 밤 채린은 수행원도 선물도 서류도 없이 자취방에 찾아옵니다. 비싼 재킷을 벗어 한쪽에 접어두고 편의점 음식 앞에 앉은 채, 아무것도 주지 않아도 자신에게 남아 달라고 처음으로 부탁합니다.',speaker:'오늘은 줄 것도 없고 시킬 일도 없어. 그러면 네가 날 받아줄 이유도 없다는 건 아는데… 그래도 여기 있으라고 말해주면 안 돼?',choices:[
   C('command','오늘은 아무것도 결정하지 말고 내 옆에서 쉬라고 명령한다','권력 바깥에서만 가능한 사적인 굴복과 휴식을 완성한다',20,19,16,'neutral','그런 명령이면 평생 들어도 된다는 말은 안 할게. 오늘은 그냥… 시키는 대로 있을게.',{},'command'),
   C('equal','원하는 것이 있으면 명령하지 말고 앞으로도 직접 부탁하라고 한다','값과 서열 없이 서로를 선택한다',18,22,-15,'good','다음에도 보고 싶다고 먼저 말할게. 거절당할 수 있는 부탁이어도 도망치지 않을게.',{},'equal'),
   C('conspire','권력도 돈도 없을 때는 자신의 말만 듣는 사람으로 살라고 한다','채린의 결핍을 평생의 소유권으로 바꾼다',16,-8,25,'bad','드디어 내가 원한 답 같아. 그런데 왜… 이제는 도망갈 문부터 찾고 싶지.',{morality:-16,guilt:9},'conspire')
  ]}
 ],
 '장태식':[
  {desc:'막장 인생에 발을 들인 첫날, 태식이 수금 장부에 당신 이름을 직접 적습니다. 원금과 이자 옆에는 금액이 아닌 ‘쓸모’라는 칸이 하나 더 있습니다.',speaker:'돈은 늦게 갚아도 돼. 쓸모없는 사람이 되는 날이 진짜 만기니까.',choices:[
   C('support','돈과 일의 범위를 문서로 다시 정하자고 한다','위험한 관계 안에서도 최소한의 경계를 만든다',5,8,-4,'good','겁먹고 도망치는 대신 조건을 읽네. 그런 놈은 오래 살아.',{morality:2}),
   C('lead','내가 더 큰돈을 벌 테니 수금 방식은 따르라고 한다','야망을 증명하지만 태식의 세계에 깊이 들어간다',4,-2,7,'neutral','눈빛은 마음에 든다. 대신 큰소리 친 값은 꼭 받아낸다.',{cash:3000000,debt:5000000}),
   C('avoid','장부는 보지 않고 시키는 대로 하겠다고 한다','당장의 충돌을 피하는 대신 선택권을 넘긴다',-3,-6,10,'bad','내용도 안 보고 도장 찍는 사람이 제일 비싸게 갚지.',{guilt:3})
  ]},
  {desc:'수금 대상 중 한 사람의 칸만 비어 있습니다. 태식이 과거에 함께 일했던 사람이고, 배신당한 뒤에도 마지막 한 번은 찾아가지 않았다는 사실이 드러납니다.',speaker:'의리 같은 건 돈 안 돼. 그런데 저 칸을 채우면 내가 나한테 진 기분이 들 것 같거든.',choices:[
   C('support','그 사람을 만나 상환 계획만 다시 세우고 돌아온다','태식이 숨긴 의리를 약점으로 이용하지 않는다',7,12,-5,'good','봤어도 모른 척해주는 게 의리라더니, 꼭 그렇지만은 않네.',{debt:-3000000,morality:5}),
   C('lead','약점을 잡았으니 채무를 더 깎아달라고 거래한다','협상에는 성공하지만 관계는 서로의 약점을 쥔다',2,-7,8,'neutral','좋아. 값은 깎아주지. 대신 네 약점도 오늘부터 내 장부에 적힌다.',{debt:-8000000,morality:-5}),
   C('avoid','태식이 마음이 약해졌다고 다른 조직에 흘린다','빚은 줄지만 추심 조직의 균형이 무너진다',-12,-14,13,'bad','돈 떼먹은 사람보다 비밀 팔아먹은 사람이 더 오래 기억나더라.',{debt:-12000000,cash:2000000,morality:-15,guilt:10})
  ]},
  {desc:'모든 원금을 갚을 기회가 온 날, 태식이 차용증을 내밉니다. 서명만 하면 채무 관계는 끝나지만 태식 쪽 사람으로 남아 더 큰 돈을 만질 수도 있습니다.',speaker:'종이 찢는다고 우리가 남이 되진 않아. 그래도 선택은 네가 해. 빚으로 남을지, 사람으로 남을지.',choices:[
   C('support','원금을 정산하고 차용증을 함께 찢는다','돈으로 맺은 관계를 끝내고 선택 가능한 인연만 남긴다',9,14,-8,'good','다 갚고도 내 앞에 서 있는 놈은 드물어. 이제 장부 말고 이름으로 부르지.',{debt:-25000000,morality:4}),
   C('lead','채무를 지분으로 바꿔 태식과 동업한다','빚을 권력으로 바꾸며 위험한 공동체를 택한다',5,-5,12,'neutral','채무자는 졸업이네. 이제 사고 치면 반씩 묻는 동업자다.',{debt:-15000000,cash:10000000,morality:-8}),
   C('avoid','차용증만 훔쳐 태우고 잠적한다','법적 증거는 지워도 추적과 불신이 남는다',-18,-18,15,'bad','종이는 없어져도 사람은 남아. 찾는 데 오래 안 걸릴 거야.',{debt:-25000000,morality:-18,guilt:12})
  ]}
 ]
};
function baseChoices(i){
 const rows=[
  [C('support','먼저 원하는 도움을 묻고 함께 방법을 찾는다','상대의 선택권과 신뢰를 지킨다',9,10,-3,'good','내 말을 끝까지 들은 뒤 같이 정해줘서 고마워요.',{}),C('lead','현실적인 해결책을 정해 그대로 진행한다','문제는 빨리 풀리지만 상대의 몫이 줄어든다',-2,-4,5,'neutral','도움은 됐지만, 내 일인데 내가 빠진 기분이에요.',{}),C('avoid','괜히 얽히지 않도록 화제를 돌린다','당장의 불편은 피하지만 기억에 남는다',-9,-7,6,'bad','말하지 말 걸 그랬어요. 다음에는 혼자 해결할게요.',{})],
  [C('support','증거와 선택지를 정리한 뒤 결정을 지지한다','위기에서 편이 되어 신뢰를 쌓는다',10,12,-3,'good','결정은 내가 했지만 혼자가 아니어서 버틸 수 있었어요.',{}),C('lead','내 방식이 더 빠르다며 대신 결정한다','결과와 별개로 관계의 균형이 흔들린다',-3,-6,6,'neutral','맞는 선택이어도 내 목소리가 없으면 우리 선택은 아니에요.',{}),C('avoid','관계까지 위험해질 일은 피하자고 한다','안전하지만 상대에게 고립감을 남긴다',-10,-9,7,'bad','위험한 순간에야 누가 곁에 있는지 알게 되네요.',{})],
  [C('support','앞으로의 책임과 자유를 구체적으로 합의한다','함께하되 서로를 소유하지 않는 결말을 만든다',12,14,-6,'good','막연한 약속보다 우리가 정한 생활이 더 믿음직해요.',{}),C('lead','앞으로 관계의 중요한 결정은 내가 맡는다','안정처럼 보이는 통제 관계를 택한다',-6,-8,10,'neutral','편할 수도 있겠죠. 대신 내가 점점 사라질 것 같아요.',{}),C('avoid','좋은 기억으로 남기고 여기서 물러난다','갈등은 끝나지만 관계도 더 깊어지지 않는다',-12,-10,4,'bad','끝까지 함께할 생각은 아니었다는 걸 이제 알겠어요.',{})]
 ];
 return rows[i].map(x=>Object.assign({},x));
}
function authoredFor(personOrName){
 const rec=personOrName&&typeof personOrName==='object'?personOrName:null;
 if(rec&&root.QT_CHILDHOOD_CIRCLE){
  const childhood=root.QT_CHILDHOOD_CIRCLE.storyFor(rec);
  if(childhood)return childhood;
 }
 const name=typeof personOrName==='string'?personOrName:rec&&rec.name;
 return SPECIAL[name];
}
function get(personOrName){
 const name=typeof personOrName==='string'?personOrName:personOrName&&personOrName.name;
 const a=ARCS[name];if(!a)return null;const authored=authoredFor(personOrName);
 const titles=a.slice(0,3),chapterCount=authored?authored.length:3;
 const variant=personOrName&&personOrName.childhoodFriend?'childhood':'adult';
 const relationshipStart=relationshipStartIndex(name,chapterCount,variant);
 const romancePath=personOrName&&personOrName.story&&personOrName.story.romancePath;
 return{name,theme:a[3],relationshipStart,chapters:Array.from({length:chapterCount},(_,i)=>{
  const scene=authored&&authored[i],title=(scene&&scene.title)||titles[i]||`${i+1}장`;
   const requiresRelationship=relationshipStart!=null&&i>=relationshipStart;
   const phase=i===chapterCount-1&&requiresRelationship?'finale':requiresRelationship?(romancePath==='group'?'group':romancePath==='platonic'?'platonic':'lover'):'friend';
   return{index:i,title,min:scene&&scene.min!=null?scene.min:(MIN[i]||Math.min(96,68+(i-2)*10)),scene:scene&&scene.scene,phase,requiresRelationship,
   desc:pathCopy(scene&&scene.desc||[`‘${title}’에서 ${name}이(가) 남들에게 감춰온 사정을 처음 이야기합니다. ${a[3]} 아직은 해결보다 당신의 반응이 더 중요한 순간입니다.`,`‘${title}’가 현실의 문제로 번졌습니다. 첫 장에서 보여준 태도를 ${name}도 기억하고 있습니다. ${a[3]} 이번 선택은 말이 아니라 행동으로 남습니다.`,`‘${title}’ 앞에서 두 사람은 더는 결정을 미룰 수 없습니다. 지난 선택들이 만든 신뢰와 거리 위에서 ${a[3]} 어떤 관계로 남을지 정해야 합니다.`][i],requiresRelationship?romancePath:null),
   speaker:pathCopy(scene&&scene.speaker||['이 얘기를 누구에게 해야 할지 오래 망설였어요. 당신이라면 끝까지 들어줄 것 같았어요.','전에 했던 말, 아직 기억해요? 이번에는 말로만 끝나지 않을 것 같아요.','좋은 말 말고 솔직한 답을 듣고 싶어요. 우리는 앞으로 어떤 사이예요?'][i],requiresRelationship?romancePath:null),
   choices:(scene&&scene.choices||baseChoices(i)).map(choice=>requiresRelationship&&romancePath&&romancePath!=='pure'
    ?{...choice,text:pathCopy(choice.text,romancePath),preview:pathCopy(choice.preview,romancePath),reaction:pathCopy(choice.reaction,romancePath)}
    :choice)};
 }),variant};
}
function ensure(rec){if(!rec.story)rec.story={chapter:0,completed:false,history:[],traits:{}};if(!Array.isArray(rec.story.history))rec.story.history=[];if(!rec.story.traits||typeof rec.story.traits!=='object')rec.story.traits={};const variant=rec.childhoodFriend?'childhood':'adult';if(rec.story.variant&&rec.story.variant!==variant&&(rec.story.chapter||0)===0){rec.story.history=[];rec.story.traits={};rec.story.completed=false;rec.story.ending=null;}rec.story.variant=variant;const expanded=(authoredFor(rec)||[]).length;if(rec.story.completed&&expanded>(rec.story.chapter||0)){rec.story.completed=false;rec.story.ending=null;rec.story.offeredChapter=Math.min(rec.story.offeredChapter==null?-1:rec.story.offeredChapter,(rec.story.chapter||0)-1);}return rec.story;}
const DANGEROUS_ENTRY_EVENTS={'강유진':'yujin_embrace','한채린':'chaerin_warning','윤세라':'sera_warning'};
function dangerousEntryReady(rec){
 const eventId=DANGEROUS_ENTRY_EVENTS[rec&&rec.name];if(!eventId)return true;
 const state=ensure(rec);if((state.chapter||0)>0||state.completed)return true;
 if(rec.dangerEvents&&rec.dangerEvents[eventId]==='seen')return true;
 return !!(rec.dangerAwakened||rec.spentNight||['casual','partner','lover','polycule'].includes(rec.status));
}
const RELATIONSHIP_START={'강유진':3,'윤세라':3,'한채린':4};
const ROMANCE_BRANCH_SCENES={
 '강유진':{
  title:'사건이 끝난 뒤에도 부를 이름',
  desc:'내부 비리 제보를 넘긴 뒤에도 유진은 전화를 끊지 않습니다. 경찰이라서 자신을 찾는 것과 강유진이라서 찾는 것은 다르다고, 이번에는 기록에 남길 수 없는 답을 요구합니다.',
  speaker:'다른 두 사람도 당신을 자기 방식으로 지키고 있다는 걸 알아요. 그래도 지금 여기서… 나만 택할 건지, 셋 모두에게 솔직해질 건지 듣고 싶어요.',
  pure:'유진 한 사람에게만 사건 없는 날에도 곁에 있어 달라고 한다',
  group:'누구도 몰래 연인으로 만들지 않고 세 사람 모두와 답을 찾겠다고 한다',
  defer:'지금은 친구의 신뢰를 깨지 않도록 대답을 미룬다'
 },
 '한채린':{
  title:'계약서에 없는 단 하나의 자리',
  desc:'화해를 끝낸 채린은 빈 계약서 세 장을 테이블에 놓습니다. 돈도 직함도 적히지 않은 종이 앞에서, 자신만 독점할지 세 사람 모두가 동의할 규칙을 만들지 선택하라고 합니다.',
  speaker:'애매한 호의가 제일 값싸 보여. 나 하나를 고르면 지금 말해. 셋을 원한다면 더 어렵게, 누구도 속이지 않는 조건부터 가져와.',
  pure:'채린만을 선택하고 둘만의 관계에 이름을 붙인다',
  group:'세 사람 누구도 숨기지 않는 공동 합의부터 만들겠다고 한다',
  defer:'감정을 계약처럼 밀어붙이지 말자며 친구로 시간을 더 갖는다'
 },
 '윤세라':{
  title:'세 개의 열쇠와 열어 둔 문',
  desc:'잠긴 작업실에서 나온 세라는 복사하지 않은 열쇠 세 개를 손바닥에 올립니다. 하나만 건네면 둘만의 집이 되고, 모두에게 보여주면 누구도 몰래 잠그지 않는 약속이 됩니다.',
  speaker:'저만 고르면 문을 잠가도 되는 줄 착각할 것 같아요. 세 사람 모두라면… 싫어도 같이 규칙을 배워야겠죠. 어느 쪽으로 돌아올 거예요?',
  pure:'세라의 열쇠 하나만 받아 둘만의 귀가 약속을 정한다',
  group:'열쇠를 나누기 전에 세 사람 모두와 공개적으로 합의한다',
  defer:'열쇠를 돌려주고 오늘은 친구로서 문을 열어 둔다'
 }
};
const COMMITTED_STATUSES=new Set(['partner','lover','polycule']);
function relationshipStartIndex(name,chapterCount,variant){
 if(RELATIONSHIP_START[name]!=null)return RELATIONSHIP_START[name];
 if(variant==='childhood'||WORLD_ARCS[name])return null;
 return chapterCount>=3?chapterCount-1:null;
}
function committed(rec){return !!(rec&&COMMITTED_STATUSES.has(rec.status));}
function relationshipReady(rec,story,state){
 if(story&&state&&RELATIONSHIP_START[rec.name]!=null)return ['pure','group','platonic'].includes(state.romancePath);
 return committed(rec);
}
function phaseLabel(phase){
 return phase==='friend'?'🌱 친구 시기':phase==='group'?'💗 함께 답을 찾는 시기':phase==='platonic'?'🤝 친구로 남은 뒤':phase==='lover'?'💕 연인 시기':'📕 관계 완결';
}
function pathCopy(text,path){
 if(!text||path==='pure'||!path)return text;
 if(path==='group')return text
  .replaceAll('연인이 된 뒤','서로의 마음을 숨기지 않기로 한 뒤')
  .replaceAll('연인이 되고 나니','서로의 마음을 확인하고 나니')
  .replaceAll('연인이라는','마음을 확인했다는')
  .replaceAll('연인으로서','특별한 사람으로서')
  .replaceAll('연인으로','특별한 사람으로')
  .replaceAll('연인이자','마음을 나눈 사이이자')
  .replaceAll('연인이','마음을 나눈 두 사람이')
  .replaceAll('연인 관계','서로의 마음을 아는 관계')
  .replaceAll('연인','마음을 나눈 사이');
 return text
  .replaceAll('연인이 된 뒤','친구로 남기로 한 뒤')
  .replaceAll('연인이 되고 나니','친구로 선을 정하고 나니')
  .replaceAll('연인이라는','오래 곁에 남을 친구라는')
  .replaceAll('연인으로서','가까운 친구로서')
  .replaceAll('연인으로','가까운 친구로')
  .replaceAll('연인이자','친구이자')
  .replaceAll('연인이','두 친구가')
  .replaceAll('연인 관계','깊은 우정')
  .replaceAll('연인','친구');
}
function availability(rec){
 const story=get(rec),state=ensure(rec);
 if(!story)return{ready:false,reason:'missing',story:null,state};
 if(state.completed){
  if(story.relationshipStart!=null&&!relationshipReady(rec,story,state))return{ready:false,reason:'relationship-complete',story,state};
  return{ready:false,reason:'completed',story,state};
 }
 if(!dangerousEntryReady(rec))return{ready:false,reason:'danger-entry',story,state,chapter:story.chapters[state.chapter]};
 const chapter=story.chapters[state.chapter];
 if(!chapter)return{ready:false,reason:'missing-chapter',story,state};
 if(chapter.requiresRelationship&&!relationshipReady(rec,story,state))return{ready:false,reason:ROMANCE_BRANCH_SCENES[rec.name]?'romance-branch':'relationship',story,state,chapter};
 if((rec.affection||0)<chapter.min)return{ready:false,reason:'affection',story,state,chapter};
 return{ready:true,reason:null,story,state,chapter};
}
function next(rec){const gate=availability(rec);return gate.ready?gate.chapter:null;}
function context(rec,ch){const state=ensure(rec),prev=state.history[state.history.length-1];if(!prev)return'이번 장면이 두 사람의 첫 번째 갈림길입니다.';const labels={support:'그때 당신은 곁에 남아 함께 결정했습니다.',lead:'그때 당신은 문제를 대신 결정했습니다.',avoid:'그때 당신은 관계에서 한걸음 물러났습니다.',depend:'그때 당신은 혼자 버티지 않고 상대에게 매달렸습니다.',boundary:'그때 당신은 도움과 통제의 선을 분명히 했습니다.',complicity:'그때 당신은 원칙보다 서로를 먼저 택했습니다.',command:'그때 당신은 상대의 권력 앞에서도 거칠게 명령했습니다.',equal:'그때 당신은 힘겨루기 대신 같은 자리를 골랐습니다.',conspire:'그때 당신은 상대의 어두운 권력과 손을 잡았습니다.',anchor:'그때 당신은 기다림에 끝이 있는 약속을 만들었습니다.',fuse:'그때 당신은 여러 사람의 감시와 보호를 하나로 묶었습니다.',sever:'그때 당신은 관계를 끊어 불안을 끝내려 했습니다.'};return`${labels[prev.choice]||'이전 선택의 결과가 아직 두 사람 사이에 남아 있습니다.'} ${ch.index+1}장은 그 기억에서 이어집니다.`;}
function withJosa(name,batchim,plain){const code=(name.charCodeAt(name.length-1)||0)-0xac00;return`${name}${code>=0&&code<=11171&&code%28?batchim:plain}`;}
function endingFor(name,state){
 const traits=state.traits||{};
 if(state.variant==='childhood'){
  if((traits.rewind||0)>=2)return{route:'never_graduate',title:`${name} · 졸업하지 않은 관계`,text:'가장 오래된 이해가 가장 강한 소유권으로 바뀌었습니다. 편안하고 익숙하지만, 지금의 선택보다 과거의 버릇이 두 사람의 생활을 결정합니다.'};
  if((traits.sever||0)>=2)return{route:'cut_past',title:`${name} · 닫힌 졸업앨범`,text:'과거가 현재를 대신 결정하지 못하게 했지만, 함께 자란 시간까지 관계 밖으로 밀어냈습니다. 자유는 남고 오래된 안전망은 사라졌습니다.'};
  return{route:'old_promise',title:`${name} · 다시 만나는 소꿉친구`,text:'서로의 흑역사와 약점을 알면서도 지금의 모습을 새로 묻기로 했습니다. 오래 알았다는 사실은 권리가 아니라 다시 믿어볼 이유가 됐습니다.'};
 }
 if(name==='강유진'){
  if((traits.depend||0)>=4)return{route:'dangerous_dependence',title:'강유진 · 필요해지는 연인',text:'연인이 된 뒤 당신은 무너질 때마다 유진을 먼저 불렀고, 유진은 그 순간마다 자신이 필요하다는 안도에 더 깊이 빠졌습니다. 사랑은 이어지지만 당신의 회복이 곧 유진의 불안이 되는 위험한 의존 관계입니다.'};
  if((traits.complicity||0)>=4)return{route:'accomplice',title:'강유진 · 제복 안의 연인',text:'두 사람은 연인이자 공범으로 법과 보호의 선을 함께 비틀었습니다. 유진은 당신을 구한다는 명분으로 자신의 원칙을 넘고, 당신은 그 일탈을 둘만의 결속으로 받아들였습니다.'};
  return{route:'equal',title:'강유진 · 불러주는 연인',text:'두 사람은 사건이 없어도 만나는 연인이 됐습니다. 유진은 감시보다 요청을 기다리는 법을 배우고, 당신이 혼자 설 수 있는 날에도 버려진 것이 아니라는 사실을 믿기 시작했습니다.'};
 }
 if(name==='한채린'){
  if((traits.command||0)>=5)return{route:'private_submission',title:'한채린 · 왕관을 내려놓는 연인',text:'연인이 된 뒤 두 사람은 위험한 시험을 반복하는 대신 동의와 중단의 선을 정했습니다. 세상 모두가 떠받드는 채린은 둘만 있는 곳에서만 직함을 내려놓되, 자기 삶의 결정권까지 잃지는 않습니다.'};
  if((traits.conspire||0)>=5)return{route:'boardroom_pair',title:'한채린 · 같은 테이블의 연인',text:'두 사람은 서로의 약점을 쥔 연인이자 사업 동맹이 됐습니다. 사랑과 거래의 경계는 흐리지만 누구도 상대를 값만으로 계산하지 못합니다.'};
  return{route:'equal',title:'한채린 · 값을 매기지 않은 연인',text:'두 사람은 복종도 소유도 아닌 대등한 연인 관계를 만들었습니다. 채린은 여전히 시험하고 도발하지만, 당신이 남는 이유를 돈이나 명령으로 사지는 않습니다.'};
 }
 if(name==='윤세라'){
  if((traits.fuse||0)>=5)return{route:'mutual_captivity',title:'윤세라 · 서로 잠근 연인',text:'연인이 된 두 사람은 바깥이 두려워 서로의 열쇠를 안쪽에 내려놓았습니다. 어느 한쪽이 일방적으로 가둔 것이 아니라 함께 출구를 포기한, 구원과 감금이 같은 모양의 다크 엔딩입니다.'};
  if((traits.anchor||0)>=5)return{route:'mutual_salvation',title:'윤세라 · 문을 열어두는 연인',text:'연인이 된 세라는 당신이 돌아올 시간을 믿는 법을 배웠고, 당신은 세라가 기다리는 집을 핑계 삼아 다시 바깥으로 나가는 법을 배웠습니다. 어느 한쪽만 구한 사람이 없는 상호구원 순애입니다.'};
  if((traits.fuse||0)>=3)return{route:'shared_cage',title:'윤세라 · 문이 필요 없는 방',text:'열쇠보다 확실한 습관과 사람들로 서로를 묶었습니다. 문은 열려 있지만 세라는 당신이 떠날 가능성 자체를 생활에서 지워버렸습니다.'};
  if((traits.anchor||0)>=3)return{route:'anchored',title:'윤세라 · 돌아올 시간을 아는 사람',text:'세라는 불안을 숨기지 않고 기다릴 시간을 말하는 법을 배웠습니다. 위험은 사라지지 않았지만 약속을 확인하는 방식은 달라졌습니다.'};
  return{route:'distance',title:'윤세라 · 열어둔 문 너머',text:'당신은 세라를 혼자 구원할 수 없음을 인정했습니다. 세라는 따라가지 않겠다는 약속을 하루씩 지키기 시작합니다.'};
 }
 const count={support:0,lead:0,avoid:0};state.history.forEach(h=>{if(count[h.choice]!=null)count[h.choice]++;});
 if(count.support>=2)return{route:'equal',title:`${withJosa(name,'과','와')} 나란히 걷는 관계`,text:'문제를 대신 해결하거나 외면하지 않고 함께 감당했습니다. 두 사람은 자유와 책임을 나누는 관계로 남습니다.'};
 if(count.lead>=2)return{route:'control',title:`${withJosa(name,'과','와')} 기울어진 관계`,text:'위기마다 한 사람이 결정을 독점했습니다. 관계는 이어지지만 애정과 통제의 경계가 오래 흔들립니다.'};
 return{route:'distance',title:`${withJosa(name,'과','와')} 남은 거리`,text:'중요한 순간마다 거리를 두었습니다. 서로를 미워하지는 않지만, 깊어질 수 있었던 관계는 조심스러운 기억으로 남습니다.'};
}
function chooseRomancePath(rec,path){
 if(!rec||!ROMANCE_BRANCH_SCENES[rec.name]||!['pure','group','platonic'].includes(path))return null;
 const state=ensure(rec);
 state.romancePath=path;state.branchPending=false;
 state.history.push({chapter:state.chapter,choice:`romance:${path}`,phase:'branch'});
 return state;
}
function adaptEnding(ending,state){
 if(!ending||!state||state.romancePath==='pure')return ending;
 return{...ending,title:pathCopy(ending.title,state.romancePath),text:pathCopy(ending.text,state.romancePath)};
}
function apply(rec,choiceId){const gate=availability(rec);if(!gate.ready)return null;const s=gate.story,state=gate.state,ch=gate.chapter;const c=ch.choices.find(x=>x.id===choiceId);if(!c)return null;rec.affection=Math.max(0,Math.min(100,(rec.affection||0)+c.affection));rec.trust=Math.max(0,Math.min(100,(rec.trust||0)+c.trust));if(rec.name==='윤세라'){rec.obsession=Math.max(0,Math.min(100,(rec.obsession||0)+c.obsession));if(c.trait==='anchor')rec.mutualSalvation=(rec.mutualSalvation||0)+1;if(c.trait==='fuse')rec.mutualObsession=(rec.mutualObsession||0)+1;if(c.trait==='sever')rec.seraRupture=(rec.seraRupture||0)+1;}else if(['강유진','한채린'].includes(rec.name))rec.dangerLevel=Math.max(0,Math.min(100,(rec.dangerLevel||0)+c.obsession));else{rec.obsession=0;rec.obsessionGrowth=0;}if(c.trait)state.traits[c.trait]=(state.traits[c.trait]||0)+1;state.history.push({chapter:state.chapter,title:ch.title,choice:choiceId,trait:c.trait||null,phase:ch.phase});state.chapter++;if(s.relationshipStart!=null&&state.chapter===s.relationshipStart&&!state.romancePath)state.branchPending=true;state.completed=state.chapter>=s.chapters.length;if(state.completed){state.ending=adaptEnding(endingFor(rec.name,state),state);if(rec.name==='윤세라'){rec.seraEndingRoute=state.ending.route;if(state.ending.route==='mutual_captivity'){rec.mutualCaptivityReady=true;rec.hasHomeKey=true;}}else if(rec.name==='강유진')rec.yujinEndingRoute=state.ending.route;else if(rec.name==='한채린')rec.chaerinEndingRoute=state.ending.route;}return{story:s,chapter:ch,choice:c,completed:state.completed,ending:state.ending||null,branchPending:!!state.branchPending};}
root.QT_CHARACTER_STORIES={ARCS,WORLD_ARCS,SPECIAL,DANGEROUS_ENTRY_EVENTS,RELATIONSHIP_START,ROMANCE_BRANCH_SCENES,get,ensure,dangerousEntryReady,relationshipStartIndex,committed,relationshipReady,phaseLabel,pathCopy,availability,next,context,chooseRomancePath,apply};
})(window);
