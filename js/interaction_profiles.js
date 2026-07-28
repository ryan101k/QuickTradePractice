/* =========================================================================
 * QuickTrade Life — 성향별 외출·부탁 프로필
 * 화면에 보이는 선택지부터 인물의 성격과 현재 관계 단계에 맞춘다.
 * ========================================================================= */
(function (root) {
'use strict';

const DATE_PROFILES = {
  frugal: [
    {approach:'sincere',emoji:'🌳',label:'동네를 걸으며 요즘 생활 이야기를 나눈다',desc:'돈을 쓰기보다 서로의 일상을 천천히 확인합니다.',cost:0},
    {approach:'listen',emoji:'🥟',label:'시장 간식을 나눠 먹으며 상대 이야기를 듣는다',desc:'소박한 자리에서 부담 없이 대화를 이어갑니다.',cost:30000},
    {approach:'plan',emoji:'🗓️',label:'다음에 함께할 작은 계획을 세운다',desc:'지킬 수 있는 약속 하나만 구체적으로 정합니다.',cost:0},
    {approach:'humor',emoji:'🪙',label:'서로의 절약 실패담을 가볍게 털어놓는다',desc:'검소함을 시험하지 않고 웃을 만한 경험을 나눕니다.',cost:0},
  ],
  ambitious: [
    {approach:'plan',emoji:'📈',label:'서로의 다음 목표를 구체적으로 이야기한다',desc:'성과보다 그 목표를 택한 이유까지 묻습니다.',cost:0},
    {approach:'sincere',emoji:'🖼️',label:'전시를 보며 각자의 기준을 솔직히 말한다',desc:'의견이 달라도 근거를 존중하며 대화합니다.',cost:120000},
    {approach:'direct',emoji:'🔥',label:'상대의 실력과 노력에서 좋았던 점을 말한다',desc:'외모가 아니라 성취와 태도에 분명한 호감을 보입니다.',cost:0},
    {approach:'listen',emoji:'☕',label:'바쁜 일정에서 포기한 것들을 묻고 듣는다',desc:'조언부터 하지 않고 선택의 무게를 이해합니다.',cost:70000},
  ],
  homebody: [
    {approach:'listen',emoji:'🎬',label:'조용한 곳에서 영화 한 편을 같이 본다',desc:'말을 채우려 애쓰지 않고 편안한 시간을 보냅니다.',cost:80000},
    {approach:'sincere',emoji:'🍲',label:'익숙한 식당에서 평범한 하루를 나눈다',desc:'새로운 자극보다 반복해도 편한 일상을 확인합니다.',cost:60000},
    {approach:'humor',emoji:'🎲',label:'둘이 할 수 있는 가벼운 게임을 고른다',desc:'경쟁보다 함께 웃는 데 초점을 둡니다.',cost:50000},
    {approach:'plan',emoji:'🏠',label:'다음에는 각자 편한 방식으로 쉬자고 약속한다',desc:'만나는 날과 혼자 쉬는 날을 함께 존중합니다.',cost:0},
  ],
  caring: [
    {approach:'listen',emoji:'☕',label:'차를 마시며 상대의 한 주를 끝까지 듣는다',desc:'해결책보다 먼저 감정을 받아 줍니다.',cost:70000},
    {approach:'sincere',emoji:'🍚',label:'식사를 챙기며 내 근황도 솔직히 나눈다',desc:'한쪽만 돌보지 않도록 서로의 상태를 확인합니다.',cost:100000},
    {approach:'vulnerable',emoji:'🌙',label:'요즘 힘든 일을 과장 없이 털어놓는다',desc:'상대에게 책임을 넘기지 않고 위로를 청합니다.',cost:0,minTrust:12},
    {approach:'plan',emoji:'🤝',label:'다음에는 서로 한 가지씩 하고 싶은 일을 고른다',desc:'배려가 일방적인 희생이 되지 않게 약속합니다.',cost:0},
  ],
  cold: [
    {approach:'listen',emoji:'📚',label:'각자 책을 보다 마음에 든 문장만 나눈다',desc:'침묵을 어색함으로 취급하지 않습니다.',cost:60000},
    {approach:'sincere',emoji:'🖼️',label:'전시를 따로 본 뒤 감상만 짧게 비교한다',desc:'상대의 공간과 해석을 존중합니다.',cost:100000},
    {approach:'humor',emoji:'🥤',label:'사적인 질문 대신 가벼운 농담을 건넨다',desc:'선을 넘지 않는 대화로 긴장을 풉니다.',cost:30000},
    {approach:'plan',emoji:'🕰️',label:'헤어질 시간을 먼저 정하고 천천히 걷는다',desc:'끝이 정해진 약속으로 부담을 줄입니다.',cost:0},
  ],
  lavish: [
    {approach:'flex',emoji:'✨',label:'기억에 남을 공연과 식사를 준비한다',desc:'가격 자랑이 아니라 상대 취향에 맞춘 경험을 고릅니다.',cost:1600000},
    {approach:'humor',emoji:'📸',label:'사진이 잘 나오는 거리를 즉흥적으로 돌아본다',desc:'분위기를 즐기되 상대를 보여주기용으로 다루지 않습니다.',cost:200000},
    {approach:'direct',emoji:'🥂',label:'오늘 특별히 멋진 점을 솔직하게 칭찬한다',desc:'모호한 밀당보다 분명한 관심을 표현합니다.',cost:150000},
    {approach:'sincere',emoji:'🎭',label:'공연 뒤 좋았던 장면을 오래 이야기한다',desc:'화려한 자리 안에서도 상대의 생각을 듣습니다.',cost:300000},
  ],
  free: [
    {approach:'humor',emoji:'🎪',label:'근처 행사에 즉흥적으로 들러 본다',desc:'계획을 강요하지 않고 재미있는 쪽으로 움직입니다.',cost:120000},
    {approach:'direct',emoji:'🚉',label:'다음 목적지는 상대가 고르게 한다',desc:'결정권을 나누고 선택을 평가하지 않습니다.',cost:80000},
    {approach:'sincere',emoji:'🌆',label:'걷다가 각자 싫어하는 구속을 이야기한다',desc:'관계를 규정하기보다 필요한 자유의 범위를 확인합니다.',cost:0},
    {approach:'listen',emoji:'🎧',label:'서로의 플레이리스트를 바꿔 듣는다',desc:'취향을 고치려 하지 않고 새로운 면을 발견합니다.',cost:30000},
  ],
  obsessive: [
    {approach:'listen',emoji:'🎨',label:'조용한 자리에서 작업 이야기를 듣는다',desc:'침묵이나 불안을 재촉하지 않습니다.',cost:50000},
    {approach:'sincere',emoji:'🫖',label:'연락이 늦을 때의 불안을 차분히 이야기한다',desc:'영원한 약속 대신 지킬 수 있는 연락 기준을 나눕니다.',cost:40000},
    {approach:'plan',emoji:'🗓️',label:'다음 약속 날짜 하나만 함께 정한다',desc:'모든 시간을 묶지 않고 확실한 약속 하나로 안심시킵니다.',cost:0},
    {approach:'vulnerable',emoji:'🖼️',label:'서로 보여주기 어려웠던 것을 하나씩 꺼낸다',desc:'비밀을 강요하지 않고 같은 만큼만 마음을 엽니다.',cost:0,minTrust:15},
  ],
};

const SPECIAL_DATE_PROFILES = {
  '강유진': [
    {approach:'listen',emoji:'🍜',label:'근무가 끝난 뒤 늦은 식사를 함께한다',desc:'사건 이야기를 캐묻지 않고 오늘 힘들었던 점만 듣습니다.',cost:70000},
    {approach:'sincere',emoji:'🚶',label:'밝은 큰길을 걸으며 서로의 안전 기준을 말한다',desc:'보호와 간섭의 차이를 차분히 확인합니다.',cost:0},
    {approach:'plan',emoji:'📅',label:'교대 일정에 무리 없는 다음 약속을 잡는다',desc:'근무를 바꾸라고 요구하지 않고 가능한 시간을 맞춥니다.',cost:0},
    {approach:'vulnerable',emoji:'☕',label:'도움을 요구하기보다 최근의 불안을 솔직히 말한다',desc:'유진에게 해결 책임을 떠넘기지 않고 마음만 나눕니다.',cost:30000,minTrust:15},
  ],
  '한채린': [
    {approach:'sincere',emoji:'🏙️',label:'채린이 고른 장소를 함께 평가한다',desc:'비위를 맞추지 않고 좋고 싫은 이유를 분명히 말합니다.',cost:200000},
    {approach:'listen',emoji:'🥃',label:'일 이야기를 듣되 결론은 채린이 정하게 둔다',desc:'능력을 존중하면서 통제권을 대신 가져가지 않습니다.',cost:180000},
    {approach:'humor',emoji:'♟️',label:'서로 한 번씩 상대의 허점을 지적한다',desc:'모욕이나 복종이 아닌 대등한 긴장감을 즐깁니다.',cost:0},
    {approach:'plan',emoji:'🗓️',label:'다음 일정은 한 곳씩 번갈아 고르자고 한다',desc:'한 사람이 모든 결정을 넘기지 않도록 규칙을 세웁니다.',cost:0},
  ],
  '윤세라': [
    {approach:'listen',emoji:'🎨',label:'작업실에서 그림 이야기를 조용히 듣는다',desc:'밖으로 끌어내거나 말을 재촉하지 않습니다.',cost:50000},
    {approach:'sincere',emoji:'🖌️',label:'익숙한 화방에서 필요한 재료를 함께 고른다',desc:'세라가 직접 고르고 거절할 시간을 줍니다.',cost:90000},
    {approach:'plan',emoji:'🗓️',label:'다음에 만날 날짜와 귀가 시간을 함께 정한다',desc:'갑작스러운 확인 대신 예측 가능한 약속을 만듭니다.',cost:0},
    {approach:'vulnerable',emoji:'📓',label:'서로 보여줘도 괜찮은 작업 하나만 꺼낸다',desc:'휴대폰이나 사생활을 확인하지 않고 자발적으로 공유합니다.',cost:0,minTrust:15},
  ],
};

/* 각성 전에는 직업·생활 성격을, 각성 뒤에는 개인 스토리에서 선택한
 * 위험한 욕구를 드러낸다. 단순 연애 시작만으로는 각성으로 보지 않는다. */
const AWAKENED_DATE_PROFILES = {
  '강유진': [
    {approach:'listen',emoji:'🚨',label:'유진이 정한 안전 동선만 따라 걷는다',desc:'보호가 일상의 이동 경로까지 들어온 뒤의 약속입니다.',cost:0},
    {approach:'sincere',emoji:'📍',label:'서로의 위치 공유를 켠 채 불안을 말한다',desc:'확인할 권한을 주고받으며 안도와 감시의 경계를 시험합니다.',cost:0},
    {approach:'plan',emoji:'🔑',label:'비상 연락과 안전가옥 규칙을 함께 정한다',desc:'유진의 구원 강박을 생활 규칙으로 받아들입니다.',cost:0},
    {approach:'vulnerable',emoji:'🫂',label:'오늘은 혼자 버티지 않겠다고 유진에게 기대어 쉰다',desc:'필요로 하는 사람을 지켜야 안심하는 유진의 욕구를 받아줍니다.',cost:50000},
  ],
  '한채린': [
    {approach:'direct',emoji:'👑',label:'오늘 일정은 내가 정하겠다고 명령한다',desc:'채린이 자발적으로 넘긴 결정권을 둘만 있는 자리에서 받습니다.',cost:0},
    {approach:'listen',emoji:'🗝️',label:'채린이 내려놓고 싶은 책임을 하나씩 듣는다',desc:'권력자가 아니라 복종하고 싶은 개인의 욕구를 확인합니다.',cost:150000},
    {approach:'plan',emoji:'📋',label:'허락할 일과 반드시 스스로 정할 일을 나눈다',desc:'자기 예속이 일상을 삼키지 않도록 중단선까지 합의합니다.',cost:0},
    {approach:'humor',emoji:'♟️',label:'밖에서는 이사, 둘만 있을 때는 내 규칙을 따르게 한다',desc:'공적 권력과 사적 굴복을 분리하는 위험한 역할 놀이입니다.',cost:200000},
  ],
  '윤세라': [
    {approach:'listen',emoji:'🖤',label:'문을 잠그고 둘만의 작업실에서 하루를 보낸다',desc:'바깥보다 서로 안쪽을 택한 뒤의 조용한 외출입니다.',cost:50000},
    {approach:'sincere',emoji:'📱',label:'서로의 동선과 귀가 시간을 전부 공유한다',desc:'불안을 줄이는 약속과 감시가 같은 모양이 되기 시작합니다.',cost:0},
    {approach:'plan',emoji:'🔑',label:'서로의 집 열쇠와 다음 주 일정을 맡긴다',desc:'다시 혼자 남지 않기 위해 생활 전체를 맞춥니다.',cost:0},
    {approach:'vulnerable',emoji:'🫀',label:'사라질까 두려웠던 순간을 숨김없이 확인한다',desc:'확답을 반복해서 요구하는 세라의 각성된 애착을 받아줍니다.',cost:0},
  ],
};

const REQUEST_LABELS = {
  frugal:{celebrate:'🍲 소박하게 좋은 일을 나눈다',gift:'🧺 오래 쓸 실용적인 선물을 건넨다',advice:'📒 생활과 돈에 관한 고민을 상의한다',help:'🧭 현실적인 정보나 경험을 부탁한다',money:'💵 급한 생활비의 상환 계획을 먼저 보여준다',secret:'🔐 오래 묵힌 걱정 하나를 털어놓는다'},
  ambitious:{celebrate:'🏆 최근 성과를 함께 돌아본다',gift:'🖋️ 일에 도움이 될 선물을 건넨다',advice:'📈 다음 목표에 대한 의견을 묻는다',help:'🤝 직업상 조언이나 소개를 부탁한다',money:'📑 필요한 자금과 갚을 계획을 설명한다',secret:'🔐 실패가 두려웠던 일을 솔직히 말한다'},
  homebody:{celebrate:'🍰 익숙한 곳에서 조용히 축하한다',gift:'🏠 집에서 편하게 쓸 선물을 건넨다',advice:'☕ 요즘 지친 마음을 천천히 털어놓는다',help:'🧩 부담 없는 범위의 도움을 부탁한다',money:'📒 급한 사정과 갚을 날짜를 차분히 말한다',secret:'🔐 밖에서는 말하기 어려운 고민을 나눈다'},
  caring:{celebrate:'🎉 서로의 좋은 일을 함께 기뻐한다',gift:'🎁 상대를 생각하며 고른 작은 선물을 건넨다',advice:'☕ 해결보다 위로가 필요한 고민을 말한다',help:'🤝 혼자 해결하기 어려운 일을 상의한다',money:'💵 급한 사정을 숨김없이 설명한다',secret:'🔐 쉽게 말하지 못한 걱정을 털어놓는다'},
  cold:{celebrate:'🥂 짧고 담백하게 좋은 소식을 전한다',gift:'📚 취향을 존중한 선물을 조용히 건넨다',advice:'🧊 판단이 필요한 문제에 의견을 묻는다',help:'📎 필요한 범위를 분명히 정해 도움을 청한다',money:'📑 금액과 상환 조건부터 명확히 제시한다',secret:'🔐 답을 요구하지 않고 사실만 털어놓는다'},
  lavish:{celebrate:'✨ 기억에 남을 방식으로 함께 축하한다',gift:'🎁 취향을 살린 특별한 선물을 건넨다',advice:'🥂 답답했던 일을 분위기 바꿔 이야기한다',help:'🎟️ 사람과 장소에 관한 센스를 빌린다',money:'💳 필요한 금액과 이유를 솔직히 말한다',secret:'🔐 화려한 모습 뒤의 고민을 털어놓는다'},
  free:{celebrate:'🎪 즉흥적으로 좋은 일을 기념한다',gift:'🎧 함께 고른 가벼운 선물을 건넨다',advice:'🌆 산책하며 답답했던 일을 말한다',help:'🛵 색다른 해결 방법을 함께 찾아 달라고 한다',money:'💵 구속 없는 단기 차용 조건을 제안한다',secret:'🔐 판단하지 말고 한 번만 들어 달라고 한다'},
  obsessive:{celebrate:'🫖 둘만의 조용한 방식으로 축하한다',gift:'🎨 작업과 취향에 맞는 선물을 건넨다',advice:'🌙 불안했던 일을 숨기지 않고 말한다',help:'🧩 혼자 막힌 일을 함께 봐 달라고 한다',money:'📒 급한 사정과 상환 약속을 분명히 말한다',secret:'🔐 서로 감당할 수 있는 비밀 하나를 나눈다'},
};

const SPECIAL_REQUEST_LABELS = {
  '강유진':{celebrate:'🍜 근무가 끝난 뒤 좋은 소식을 전한다',gift:'☕ 야간근무에 부담 없는 간식을 건넨다',advice:'🛟 안전과 불안에 관한 고민을 상담한다',help:'📋 공식 절차와 신고 방법을 물어본다',secret:'🔐 사건과 무관한 개인 고민을 털어놓는다'},
  '한채린':{celebrate:'🥂 성과를 자랑하지 않고 함께 평가한다',gift:'♟️ 가격보다 취향을 고민한 선물을 건넨다',advice:'📊 채린의 냉정한 판단을 부탁한다',help:'🏢 업계 정보와 사업 조언을 구한다',money:'📑 투자와 구분된 단기 자금 조건을 제시한다',secret:'🔐 약점이 될 수 있는 고민을 솔직히 말한다'},
  '윤세라':{celebrate:'🫖 작업실에서 조용히 좋은 일을 나눈다',gift:'🖌️ 세라가 직접 고른 작업용품을 건넨다',advice:'🌙 불안할 때 어떻게 연락할지 함께 정한다',help:'🎨 막힌 작업을 같이 봐 달라고 한다',secret:'🔐 서로 말해도 되는 비밀 하나만 나눈다'},
};

const AWAKENED_REQUEST_LABELS = {
  '강유진':{celebrate:'🚨 유진이 안전하다고 정한 곳에서 둘만 축하한다',gift:'📍 비상 연락과 위치 공유에 쓸 물건을 건넨다',advice:'🫂 이번 판단은 유진에게 기대고 싶다고 말한다',help:'🛡️ 공식 절차가 끝나도 계속 지켜 달라고 부탁한다',secret:'🔐 숨기려 했던 위험까지 전부 알려준다',boundary:'🧭 보호와 감시의 마지막 선을 다시 정한다'},
  '한채린':{celebrate:'👑 오늘만큼은 내가 정한 방식으로 축하하게 한다',gift:'🗝️ 선물 대신 하루의 선택권을 건네받는다',advice:'♟️ 결론을 대신 내려 줄 테니 전부 말하라고 한다',help:'🏢 채린이 넘긴 권한을 내 판단대로 사용한다',money:'💳 조건을 숨기지 말고 필요한 자금을 요구한다',secret:'🔐 누구에게도 보이지 않는 약점을 내 앞에 내려놓게 한다',boundary:'🧭 복종을 멈출 말과 반드시 지킬 선을 정한다'},
  '윤세라':{celebrate:'🖤 문을 잠그고 둘만 아는 기념을 만든다',gift:'🔑 언제든 돌아올 수 있다는 뜻으로 내 물건을 맡긴다',advice:'📱 불안할 때 서로 어디까지 확인할지 정한다',help:'🗓️ 내 일정과 세라의 일정을 함께 관리한다',secret:'🔐 서로 숨기지 않기로 한 이야기를 전부 꺼낸다',boundary:'🧭 잠긴 문을 열어야 할 때의 규칙을 정한다'},
};

const REQUEST_REACTIONS = {
  frugal:{celebrate:'큰돈을 쓰지 않아도 충분하다며 차분히 기뻐했습니다.',gift:'필요한 물건인지 먼저 확인한 뒤 오래 쓰겠다며 받았습니다.',advice:'감정과 현실 문제를 나눠 하나씩 정리해 줬습니다.'},
  ambitious:{celebrate:'결과보다 여기까지 온 과정을 물으며 진심으로 인정했습니다.',gift:'실제로 도움이 되는지 살펴본 뒤 만족한 표정을 보였습니다.',advice:'목표와 위험을 나눠 보고 선택지는 당신이 정하게 두었습니다.'},
  homebody:{celebrate:'익숙한 자리에서 오래 머물며 편안하게 기뻐했습니다.',gift:'집에서 자주 쓸 수 있겠다며 부담 없이 받았습니다.',advice:'말을 재촉하지 않고 같은 자리에 있어 줬습니다.'},
  caring:{celebrate:'당신의 좋은 일을 자기 일처럼 기뻐하면서도 자신의 소식도 나눴습니다.',gift:'선물보다 고르는 동안 자신을 생각했다는 마음을 고마워했습니다.',advice:'대신 해결하려 들지 않고 끝까지 들어 줬습니다.'},
  cold:{celebrate:'축하는 짧았지만 자리를 먼저 뜨지 않았습니다.',gift:'고맙다는 말 뒤에 취향을 기억한 점은 높이 평가했습니다.',advice:'필요한 의견만 말한 뒤 최종 판단은 당신에게 남겼습니다.'},
  lavish:{celebrate:'분위기를 살리면서도 오늘의 주인공은 당신이라며 즐거워했습니다.',gift:'가격보다 자기 취향을 제대로 읽은 점을 마음에 들어 했습니다.',advice:'장소를 바꿔 기분을 풀어 준 뒤 현실적인 선택도 함께 봤습니다.'},
  free:{celebrate:'계획에 없던 작은 기념을 만들며 부담 없이 즐겼습니다.',gift:'소유보다 함께 고른 시간이 좋았다며 가볍게 받았습니다.',advice:'정답을 정하지 않고 새로운 방법을 몇 가지 던져 줬습니다.'},
  obsessive:{celebrate:'둘만 아는 작은 기념으로 남기자며 조용히 웃었습니다.',gift:'받아도 되는지 확인한 뒤 작업대에서 잘 보이는 곳에 두었습니다.',advice:'불안을 키우는 확답 대신 지킬 수 있는 약속을 함께 정했습니다.'},
};

const SPECIAL_REQUEST_REACTIONS = {
  '강유진':{celebrate:'교대가 끝난 뒤 잠깐 시간을 내어 축하했습니다.',gift:'과한 선물은 받지 않겠다며 간식만 고맙게 챙겼습니다.',advice:'위험 신호와 단순한 불안을 구분해 주고, 필요한 경우 공식 도움을 권했습니다.',help:'규정을 넘지 않는 신고 절차와 담당 기관을 정확히 알려 줬습니다.',secret:'사건과 무관한 개인 이야기임을 확인한 뒤 조용히 들어 줬습니다.'},
  '한채린':{celebrate:'과장된 찬사 대신 결과를 냉정하게 평가한 뒤 짧게 축하했습니다.',gift:'가격표보다 자신을 어떻게 봤는지가 드러나는 선물이라며 받아 들었습니다.',advice:'듣기 좋은 말은 빼고 선택마다 생길 손익을 정확히 짚었습니다.',help:'자기 이름을 빌려주지는 않았지만 업계의 구조와 위험 인물은 알려 줬습니다.',money:'계좌부터 열지 않고 금액·기한·책임을 적은 계약부터 검토했습니다.',secret:'약점을 이용하지 않겠다고 약속하는 대신 숨길 범위를 분명히 정했습니다.'},
  '윤세라':{celebrate:'밖으로 나가자고 재촉하지 않자 작업실에서 조용히 기뻐했습니다.',gift:'직접 고른 재료라 부담 없이 받아 바로 작업대에 올려뒀습니다.',advice:'확답을 요구하지 않고 연락할 시간과 혼자 있을 시간을 함께 정했습니다.',help:'대신 완성하려 하지 않고 막힌 부분만 같이 살펴봤습니다.',secret:'더 말하라고 재촉하지 않고 자신도 비슷한 크기의 이야기 하나를 꺼냈습니다.'},
};

const AWAKENED_REQUEST_REACTIONS = {
  '강유진':{celebrate:'유진은 출입구와 귀가 시간을 먼저 확인한 뒤에야 긴장을 풀고 축하했습니다.',gift:'위치 공유가 켜지는 것을 확인하고 비상 상황에는 자신부터 부르라고 했습니다.',advice:'당신이 판단을 맡기자 안도하면서도, 스스로 설 수 있을 때까지 곁을 떠나지 않겠다고 했습니다.',help:'사건이 끝난 뒤에도 보호를 멈추지 않겠다며 개인 일정에 당신의 안전 확인을 넣었습니다.',secret:'숨긴 위험까지 알게 된 유진은 이제 모르는 시간이 생기지 않게 하겠다고 했습니다.',boundary:'반발은 컸지만 요청할 때만 개입한다는 마지막 선을 다시 확인했습니다.'},
  '한채린':{celebrate:'채린은 지시받은 방식대로 움직이는 동안 세상에서 가장 편한 표정을 지었습니다.',gift:'물건보다 결정권을 건넨 사실에 만족하며 다음 지시를 기다렸습니다.',advice:'자기 결론을 내리지 않고 당신의 판단을 그대로 따르겠다고 답했습니다.',help:'채린은 권한과 사람을 내어 주면서도 사용 중단 신호만은 분명히 확인했습니다.',money:'금액을 묻기 전에 계좌를 열려 했지만, 당신이 정한 기한과 한도를 계약서에 남겼습니다.',secret:'누구에게도 보이지 않던 약점을 꺼내 놓고, 그것을 어떻게 다룰지도 당신에게 물었습니다.',boundary:'굴복을 거절로 오해하지 않도록 중단어와 일상에서 지킬 자율 영역을 함께 적었습니다.'},
  '윤세라':{celebrate:'세라는 문을 잠그고 오늘을 둘만 아는 기념일로 기록했습니다.',gift:'당신 물건을 작업대 가장 잘 보이는 곳에 두고 돌아올 이유가 생겼다고 안도했습니다.',advice:'서로의 위치를 확인할 시간과 확인하지 않을 시간을 정하면서도 화면을 오래 놓지 못했습니다.',help:'두 사람의 일정표를 한 장에 겹쳐 붙이고 빈 시간을 먼저 맞췄습니다.',secret:'당신의 이야기만 요구하지 않고 자기 기록도 같은 만큼 전부 보여 줬습니다.',boundary:'문을 잠그더라도 요청하면 열고, 답이 없어도 직접 찾아가기 전 한 번은 기다리기로 했습니다.'},
};

function awakeningState(person) {
  if (!person) return {awakened:false,key:null};
  const traits=person.story&&person.story.traits||{};
  const committed=['partner','lover','polycule'].includes(person.status);
  if(person.name==='강유진'){
    const savior=person.signature&&person.signature.key==='savior'?Number(person.signature.value)||0:0;
    const awakened=committed&&((traits.depend||0)>=2||(traits.complicity||0)>=2||savior>=45||
      ['dangerous_dependence','accomplice'].includes(person.yujinEndingRoute));
    return{awakened,key:awakened?'savior':null};
  }
  if(person.name==='한채린'){
    const awakened=committed&&(!!person.chaerinSubmissionAwakened||(traits.command||0)>=2||
      person.chaerinEndingRoute==='private_submission');
    return{awakened,key:awakened?'submission':null};
  }
  if(person.name==='윤세라'){
    const awakened=!!person.spentNight||(traits.fuse||0)>=2||
      ['mutual_captivity','shared_cage'].includes(person.seraEndingRoute);
    return{awakened,key:awakened?'obsession':null};
  }
  return{awakened:false,key:null};
}

function dateProfile(person) {
  const awakening=awakeningState(person);
  if(awakening.awakened&&AWAKENED_DATE_PROFILES[person.name])return AWAKENED_DATE_PROFILES[person.name];
  return SPECIAL_DATE_PROFILES[person && person.name] || DATE_PROFILES[person && person.personality] || DATE_PROFILES.caring;
}

function dateChoices(person, mode, approaches, context) {
  const byKey = new Map((approaches || []).map(item => [item.key, item]));
  const trust = Number(context && context.trust) || 0;
  return dateProfile(person).map(item => {
    let selected = item;
    if (item.minTrust && trust < item.minTrust) {
      selected = {
        ...item,
        approach:'plan',
        emoji:'🕰️',
        label:mode === 'date' ? '무리하지 않고 다음 약속 하나만 정한다' : '오늘은 짧게 만나고 다음 인사를 기약한다',
        desc:'아직 깊은 이야기를 요구하지 않고 지킬 수 있는 약속만 남깁니다.',
        cost:0,
      };
    }
    const base = byKey.get(selected.approach) || byKey.get('sincere') || {};
    return {...base,...selected,key:selected.approach,profileFit:true};
  });
}

function requestOptions(person, context) {
  const ctx = context || {};
  const awakening=awakeningState(person);
  const labels = awakening.awakened&&AWAKENED_REQUEST_LABELS[person && person.name] ||
    SPECIAL_REQUEST_LABELS[person && person.name] || REQUEST_LABELS[person && person.personality] || REQUEST_LABELS.caring;
  const kinds = ['celebrate','gift','advice'];
  if ((ctx.closeness || 0) >= 28) kinds.push('help');
  if ((ctx.trust || 0) >= 20) kinds.push('secret');
  const supportsMoney = person && (person.moneyStyle === 'support' || person.special === 'heiress');
  if (supportsMoney && (ctx.closeness || 0) >= 35) kinds.push('money');
  if (ctx.risk) kinds.push('boundary');
  if ((ctx.morality == null ? 60 : ctx.morality) < 35 && (ctx.trust || 0) >= 55 && person && person.special !== 'police') kinds.push('alibi');
  return kinds.map(kind => ({
    kind,
    label:labels[kind] || {
      help:'🤝 직업상 도움을 부탁한다',
      secret:'🔐 개인적인 고민을 털어놓는다',
      money:'💵 급한 자금 사정을 상의한다',
      boundary:'🧭 관계의 선과 연락 빈도를 함께 정한다',
      alibi:'⚠️ 위험한 거짓말을 부탁한다',
    }[kind] || kind,
  }));
}

function requestReaction(person, kind) {
  const awakening=awakeningState(person);
  const awakened=awakening.awakened&&AWAKENED_REQUEST_REACTIONS[person && person.name];
  const special = SPECIAL_REQUEST_REACTIONS[person && person.name];
  const normal = REQUEST_REACTIONS[person && person.personality] || REQUEST_REACTIONS.caring;
  return awakened&&awakened[kind] || special && special[kind] || normal[kind] || '';
}

const api = Object.freeze({
  dateChoices,
  requestOptions,
  requestReaction,
  awakeningState,
  profiles:Object.freeze({dates:DATE_PROFILES,specialDates:SPECIAL_DATE_PROFILES,awakenedDates:AWAKENED_DATE_PROFILES}),
});
root.QT_INTERACTION_PROFILES = api;
if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
