/* QuickTrade Life — 사업 담당자 4인 익명·유혹·공개·엔딩 루트 */
(function(root){'use strict';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const finite=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;

const PROFILES={
  office:{
    id:'office',businessId:'commerce',hiddenName:'박○○',alias:'박 매니저',name:'박지수',
    role:'운영 매니저',emoji:'📋',gender:'f',age:30,job:'온라인 유통사 운영 매니저',
    personality:'caring',moneyStyle:'support',portrait:'business-office-reveal.png',scene:'./assets/event-business-office-night.png',maskedScene:'./assets/event-business-office-masked.png',
    style:'말보다 먼저 재고표와 식사를 챙기는 생활형 실무자',
    revealLine:'대표님이 사람보다 숫자를 먼저 보는 분은 아니라는 걸 확인하고 싶었어요. 이제는 박 매니저 말고, 지수라고 불러요.',
    temptation:'오늘 보고는 메신저로 끝내도 되는데요. 굳이 둘만 남아서 정리하면… 대표님 애인은 싫어하겠죠?',
    boundary:'선을 먼저 말해줘서 다행이에요. 적어도 대표님을 잘못 보진 않았네요.',
    trap:'exposure',
    trapTitle:'남겨진 업무 메신저',
    trapText:'회사 메신저의 심야 대화와 출입 기록이 연인에게 그대로 전달됐습니다. 지수는 변명하지 않았고, 기존 관계는 신뢰를 잃었습니다.',
    pureTitle:'두 사람의 생활 장부',
    pureText:'지수와 함께 매장을 하나씩 늘려 갔습니다. 장부 끝에는 늘 퇴근 뒤 먹을 저녁과 함께 살 집의 메모가 남았습니다.',
  },
  creative:{
    id:'creative',businessId:'studio',hiddenName:'한○○',alias:'한 실장',name:'한이슬',
    role:'콘텐츠 제작 실장',emoji:'🎨',gender:'f',age:29,job:'콘텐츠 스튜디오 제작 실장',
    personality:'free',moneyStyle:'independent',portrait:'business-creative-reveal.png',scene:'./assets/event-business-creative-night.png',maskedScene:'./assets/event-business-creative-masked.png',
    style:'위험한 아이디어를 웃으며 현실로 만드는 자유로운 제작자',
    revealLine:'가린 얼굴이 콘셉트인 줄 알았어요? 대표님이 끝까지 팀을 팔지 않는지 본 거예요. 한이슬. 이제 이름으로 불러요.',
    temptation:'애인 있는 사람은 영감이 더 복잡해서 재밌던데. 오늘 밤, 촬영 답사라는 핑계 어때요?',
    boundary:'재미없는 답인데… 그래서 좀 마음에 드네요. 작품 밖에서는 선을 지키는 사람.',
    trap:'blackmail',blackmailRate:.10,blackmailMin:6000000,blackmailMax:40000000,
    trapTitle:'편집되지 않은 원본',
    trapText:'둘만의 촬영 원본과 출입 기록이 익명의 발신자 손에 들어갔습니다. 공개를 막는 대가로 거액의 합의금을 요구받았습니다.',
    pureTitle:'마지막 컷 뒤의 사람',
    pureText:'이슬은 가장 화려한 장면보다 촬영이 끝난 뒤 당신과 걷는 시간을 남겼습니다. 두 사람이 만든 스튜디오는 업계의 이름이 됐습니다.',
  },
  corporate:{
    id:'corporate',businessId:'advisory',hiddenName:'차○○',alias:'차 총괄',name:'차서윤',
    role:'재무·계약 총괄',emoji:'📑',gender:'f',age:33,job:'기업 자문사 재무·계약 총괄',
    personality:'cold',moneyStyle:'independent',portrait:'business-corporate-reveal.png',scene:'./assets/event-business-corporate-night.png',maskedScene:'./assets/event-business-corporate-masked.png',
    style:'감정보다 계약의 빈칸을 먼저 읽는 냉정한 협상가',
    revealLine:'실명은 계약 상대에게만 공개합니다. 차서윤. 오늘부터 대표님을 단순한 고용주가 아니라 제 선택의 상대로 보겠습니다.',
    temptation:'연인에게 보고할 의무가 없는 계약도 있습니다. 서명은 둘만 있는 곳에서 받죠.',
    boundary:'충동보다 손실을 먼저 계산하는군요. 좋아요. 신뢰할 수 있는 대표라는 뜻이니까.',
    trap:'blackmail',blackmailRate:.16,blackmailMin:10000000,blackmailMax:70000000,
    trapTitle:'독점계약의 숨은 조항',
    trapText:'서윤이 내민 비밀유지 계약에는 관계 폭로를 막는 위약 조항이 숨어 있었습니다. 서명한 순간부터 침묵에도 가격이 붙었습니다.',
    pureTitle:'서명하지 않은 약속',
    pureText:'모든 계약을 문장으로 남기던 서윤이 처음으로 빈 종이를 내밀었습니다. 두 사람은 회사를 키우되 서로의 삶은 소유하지 않기로 약속했습니다.',
  },
  medical:{
    id:'medical',businessId:'care',hiddenName:'오○○',alias:'오 책임자',name:'오혜린',
    role:'현장 서비스 책임자',emoji:'🩺',gender:'f',age:31,job:'웰니스 센터 현장 책임자',
    personality:'frugal',moneyStyle:'support',portrait:'business-medical-reveal.png',scene:'./assets/event-business-medical-night.png',maskedScene:'./assets/event-business-medical-masked.png',
    style:'안전과 양심을 타협하지 않는 차분한 현장 책임자',
    revealLine:'끝까지 사람을 비용으로만 보지 않으셨네요. 오혜린이에요. 이제 업무 밖의 제 얼굴도 기억해 주세요.',
    temptation:'좋은 사람이 늘 좋은 선택만 하는 건 아니잖아요. 오늘은 센터 밖에서, 아무도 모르게 만날래요?',
    boundary:'거절해 줘서 고마워요. 흔들린 건 저였고, 멈춰야 할 사람도 저였어요.',
    trap:'exposure',
    trapTitle:'감출 수 없었던 양심',
    trapText:'혜린은 관계를 숨긴 채 계속 일할 수 없었습니다. 먼저 사실을 털어놓았고, 연인은 배신을 받아들이지 못했습니다.',
    pureTitle:'문을 닫은 뒤의 안부',
    pureText:'혜린과 운영한 센터에는 누구도 무리하지 않는 규칙이 생겼습니다. 마지막 환자가 돌아간 뒤 두 사람은 서로의 하루부터 돌봤습니다.',
  },
};

const IDS=Object.keys(PROFILES);

const PERSONAL_STORIES={
  office:[
    {id:'ledger_after_dark',minAffection:28,minTrust:12,title:'불이 꺼지지 않은 물류실',icon:'📦',scene:'./assets/event-business-office-ledger.png',
      desc:'전산 재고와 실제 수량이 맞지 않는 밤, 지수는 직원들을 먼저 퇴근시키고 혼자 남았습니다. 대표인 당신이 숫자보다 사람을 먼저 볼 수 있는지 지켜보는 듯합니다.',
      line:'손실은 제가 밤새 맞출 수 있어요. 그런데 대표님까지 남는 이유는… 장부 때문이에요, 저 때문이에요?',
      choices:[
        {id:'share',text:'같이 재고를 세고 아침 식사를 산다',preview:'현금 -20만 · 호감·신뢰 상승',effects:{cash:-200000,affection:8,trust:9,bond:8},outcome:'지수는 마지막 상자를 닫으며 처음으로 업무가 아닌 저녁 약속을 먼저 잡았습니다.',reply:'대표님 손에 먼지 묻은 건 처음 보네요. 오늘만큼은 제가 챙겨 드릴게요.'},
        {id:'delegate',text:'추가 인력을 부르고 지수를 먼저 돌려보낸다',preview:'현금 -80만 · 신뢰 크게 상승',effects:{cash:-800000,affection:4,trust:13,bond:7},outcome:'혼자 견디게 두지 않는 방식이 야근보다 오래 지수의 기억에 남았습니다.',reply:'일을 대신해 준 것보다, 저를 먼저 집에 보낸 게 더 기억날 것 같아요.'},
      ]},
    {id:'home_in_the_schedule',minAffection:52,minTrust:28,title:'근무표 끝의 빈칸',icon:'🏠',scene:'./assets/event-business-office-schedule.png',
      desc:'지수가 만든 다음 분기 근무표 마지막에는 아무 업무도 없는 두 사람의 휴일이 표시돼 있습니다. 회사 안에서 시작한 관계를 생활로 옮길지 묻는 조용한 제안입니다.',
      line:'계속 대표님 일정만 챙기다 보니까요. 이제 제 일정에도 대표님 한 칸쯤 있어도 되나 해서요.',
      choices:[
        {id:'routine',text:'매달 하루는 둘만의 생활일로 비운다',preview:'호감·신뢰 상승 · 공사 경계 안정',effects:{affection:10,trust:9,bond:10,boundary:5},outcome:'두 사람은 거창한 휴가보다 장보기와 저녁을 함께하는 날부터 만들었습니다.',reply:'그날은 대표님 말고 그냥 당신으로 와요. 제가 좋아하는 건 그쪽이니까.'},
        {id:'work_first',text:'일과 관계를 천천히 분리하자고 합의한다',preview:'신뢰 크게 상승',effects:{affection:5,trust:13,bond:8,boundary:8},outcome:'지수는 서운함보다 안도감을 보였습니다. 오래 가려면 지킬 선도 필요하다는 걸 알고 있었습니다.',reply:'좋아요. 대신 퇴근한 뒤에는 제 눈 보고 말해요. 결재하듯 대답하지 말고.'},
      ]},
  ],
  creative:[
    {id:'uncredited_frame',minAffection:28,minTrust:12,title:'크레딧에서 빠진 이름',icon:'🎬',scene:'./assets/event-business-creative-credit.png',
      desc:'대형 고객이 이슬의 콘셉트를 대표 개인의 성과로 발표하겠다고 제안했습니다. 계약에는 유리하지만, 그녀가 만든 색은 기록에서 사라집니다.',
      line:'제 이름 하나 빼면 계약금이 오른대요. 대표님은 작품을 살 거예요, 만든 사람을 살 거예요?',
      choices:[
        {id:'credit',text:'계약을 고쳐 이슬과 팀의 이름을 남긴다',preview:'현금 -100만 · 호감·신뢰 크게 상승',effects:{cash:-1000000,affection:9,trust:11,bond:10},outcome:'계약금은 줄었지만 이슬은 엔딩 크레딧 가장 마지막에 당신 이름을 자기 이름과 나란히 넣었습니다.',reply:'내 이름을 남겨 줬으니, 마지막 장면에는 당신을 남겨도 되죠?'},
        {id:'walk',text:'그 고객을 버리고 둘만의 파일럿을 만든다',preview:'현금 -180만 · 호감 크게 상승',effects:{cash:-1800000,affection:13,trust:7,bond:11},outcome:'새벽까지 만든 짧은 영상은 돈보다 먼저 두 사람만 알아보는 암호가 됐습니다.',reply:'망해도 둘이 같이 망하는 작품이라니. 이상하게 이런 게 더 흥분되네.'},
      ]},
    {id:'muse_or_partner',minAffection:52,minTrust:28,title:'뮤즈가 아니라 공동 제작자',icon:'🎞️',scene:'./assets/event-business-creative-muse.png',
      desc:'이슬은 당신을 주제로 한 작품을 준비하다 멈췄습니다. 사랑을 소재로 써버릴지, 함께 만드는 관계로 바꿀지 결정하지 못한 얼굴입니다.',
      line:'당신을 찍으면 멋진 작품은 나와요. 그런데 작품이 끝난 뒤에도 당신이 남아 있었으면 좋겠어.',
      choices:[
        {id:'coauthor',text:'서로의 동의가 있는 공동 프로젝트로 바꾼다',preview:'호감·신뢰 상승 · 공동 의사결정 상승',effects:{affection:10,trust:10,bond:9,governance:6},outcome:'카메라 앞과 뒤를 번갈아 맡으며 두 사람은 연인인 동시에 동등한 제작자가 됐습니다.',reply:'좋아. 그럼 컷을 외칠 권리도 반반. 가까이 오라는 연출도 반반.'},
        {id:'private',text:'이번 이야기는 둘만 알고 작품으로 만들지 않는다',preview:'신뢰 크게 상승 · 공사 경계 상승',effects:{affection:7,trust:13,bond:8,boundary:7},outcome:'이슬은 처음으로 공개하지 않을 장면을 선택했습니다. 대신 그 밤을 오래 기억했습니다.',reply:'세상에 안 보여 줄 장면이 생겼네. 그건 당신만 기억해요.'},
      ]},
  ],
  corporate:[
    {id:'poisoned_clause',minAffection:28,minTrust:12,title:'대표에게 숨긴 독소조항',icon:'📑',scene:'./assets/event-business-corporate-clause.png',
      desc:'서윤은 회사를 살릴 계약의 독소조항을 이미 발견했지만 보고하지 않았습니다. 당신이 계약서가 아니라 자신을 얼마나 믿는지 시험한 것입니다.',
      line:'제가 숨겼다는 사실이 더 화나요, 아니면 제 판단이 대표님보다 빨랐다는 게 더 화나요?',
      choices:[
        {id:'equal',text:'책임을 묻되 다음 협상은 동등하게 맡긴다',preview:'신뢰·업무 시너지 상승',effects:{affection:6,trust:12,bond:9,synergy:6},outcome:'서윤은 처음으로 결재선이 아니라 당신 옆자리에 앉아 계약서를 다시 썼습니다.',reply:'벌을 주지 않고 권한을 더 준다… 대표님은 꽤 위험한 방식으로 사람을 묶는군요.'},
        {id:'challenge',text:'내 앞에서 직접 더 좋은 조건을 따내라고 한다',preview:'호감 크게 상승 · 신뢰 상승',effects:{affection:12,trust:7,bond:10},outcome:'정면으로 맞선 당신을 보며 서윤은 불쾌함 대신 드문 웃음을 보였습니다.',reply:'그 표정 유지하세요. 협상이 끝난 뒤에는 제가 어디까지 양보할지 궁금해지니까.'},
      ]},
    {id:'unsigned_future',minAffection:52,minTrust:28,title:'서명하지 않은 장기계약',icon:'🖋️',scene:'./assets/event-business-corporate-unsigned.png',
      desc:'서윤이 준비한 장기 동업 계약서의 마지막 장만 비어 있습니다. 회사와 관계를 한 문서에 묶지 않겠다는 그녀다운 망설임입니다.',
      line:'영구 계약은 믿지 않습니다. 그래도 갱신할 이유를 매년 함께 만들 수는 있겠죠.',
      choices:[
        {id:'renew',text:'소유 조항 없이 매년 함께 갱신한다',preview:'호감·신뢰 상승 · 공사 경계 상승',effects:{affection:10,trust:11,bond:9,boundary:6},outcome:'두 사람은 서로를 담보로 잡지 않는 계약에 처음으로 함께 서명했습니다.',reply:'갱신일에는 제가 먼저 연락하죠. 대표님이 아직 제 조건을 감당할 수 있는지 확인하러.'},
        {id:'blank',text:'마지막 장은 빈 채로 두고 말로 약속한다',preview:'호감 크게 상승',effects:{affection:13,trust:7,bond:10},outcome:'서윤은 비어 있는 종이를 보관했습니다. 증명할 수 없어서 더 특별한 약속이었습니다.',reply:'증거가 없으니 배신하면 끝이군요. 그래서 더 오래 믿어 보고 싶어졌습니다.'},
      ]},
  ],
  medical:[
    {id:'red_line',minAffection:28,minTrust:12,title:'매출보다 먼저 그은 빨간 선',icon:'🩺',scene:'./assets/event-business-medical-redline.png',
      desc:'예약을 더 받으면 큰 계약을 지킬 수 있지만 혜린은 안전 기준을 넘는 순간 센터 문을 닫겠다고 합니다.',
      line:'대표님을 좋아하는 마음이 생겨도, 여기서 사람을 위험하게 만들면 저는 대표님 편을 들 수 없어요.',
      choices:[
        {id:'close',text:'예약을 닫고 혜린의 기준을 전 직원 규칙으로 만든다',preview:'현금 -120만 · 신뢰 크게 상승',effects:{cash:-1200000,affection:7,trust:13,bond:10,governance:5},outcome:'손실은 남았지만 혜린은 당신을 사랑해도 원칙을 잃지 않아도 된다는 사실에 안도했습니다.',reply:'제 편을 들어 달라는 뜻은 아니었어요. 그런데 이렇게 서 주면… 조금 기대고 싶어져요.'},
        {id:'transfer',text:'다른 기관과 연계해 환자를 안전하게 분산한다',preview:'현금 -60만 · 업무 시너지 상승',effects:{cash:-600000,affection:8,trust:10,bond:9,synergy:6},outcome:'혜린의 기준과 당신의 해결책이 처음으로 완벽하게 맞물렸습니다.',reply:'제가 멈추라고 말하면 길을 만들어 주네요. 그래서 자꾸 대표님을 믿게 돼요.'},
      ]},
    {id:'care_for_carer',minAffection:52,minTrust:28,title:'돌보는 사람의 휴진일',icon:'🌿',scene:'./assets/event-business-medical-rest.png',
      desc:'혜린이 과로로 쓰러질 뻔했지만 자신은 괜찮다며 다음 예약표를 펼칩니다. 늘 남을 돌보던 사람에게 처음으로 쉬어도 된다고 말할 순간입니다.',
      line:'제가 쉬면 누군가 불편해져요. 그런데… 대표님이 곁에 있으면 잠깐 쉬어도 괜찮을 것 같기도 해요.',
      choices:[
        {id:'rest',text:'센터를 하루 닫고 혜린과 조용히 쉰다',preview:'현금 -100만 · 호감·신뢰 크게 상승',effects:{cash:-1000000,affection:11,trust:10,bond:10,boundary:5},outcome:'아무도 돌보지 않는 하루에 혜린은 처음으로 당신에게 기대어 잠들었습니다.',reply:'잠들면 깨우지 말아 주세요. 오늘은 제가 먼저 기대도 되는 날이니까.'},
        {id:'system',text:'교대 책임자를 세워 누구도 희생하지 않게 한다',preview:'현금 -160만 · 신뢰·공동 의사결정 상승',effects:{cash:-1600000,affection:6,trust:14,bond:9,governance:7},outcome:'혜린은 개인의 선의보다 오래 가는 제도를 만든 당신을 새로운 눈으로 보았습니다.',reply:'이제 쉬는 날에 대표님을 만나도 환자 생각부터 하진 않아도 되겠네요.'},
      ]},
  ],
};

const QUARTET_CHAPTERS=[
  {id:'boardroom_pact',title:'제1장 · 호칭을 정하는 이사회',icon:'🏢',scene:'./assets/event-business-quartet-boardroom.png',
    desc:'얼굴과 이름을 모두 공개한 네 사람이 처음으로 한 회의실에 모였습니다. 서로를 경쟁자로 볼지, 하나의 경영진으로 묶을지 정해야 합니다.',
    dialogues:[
      ['박지수','대표님 한 사람 일정에 네 부서가 전부 매달리면 오래 못 가요.'],
      ['한이슬','그럼 재미없게 순번표라도 만들까? 감정도 회의 안건으로 올리고?'],
      ['차서윤','농담으로 넘길 일이 아닙니다. 권한과 책임이 모호하면 반드시 누군가 이용합니다.'],
      ['오혜린','적어도 누구도 몰래 희생하지 않는 규칙은 있었으면 해요.'],
    ],
    choices:[
      {id:'equal_board',text:'네 사람을 동등한 공동 경영진으로 세운다',preview:'공동 의사결정·업무 시너지 상승',effects:{synergy:10,governance:14,boundary:5,affectionEach:3,trustEach:6},outcome:'직함은 달라도 발언권은 같아졌습니다. 네 사람은 처음으로 서로를 대표의 사람이 아니라 동료로 바라봤습니다.'},
      {id:'founder_rule',text:'최종 결정권은 대표가 갖고 각자 영역을 보장한다',preview:'업무 시너지 상승 · 공사 경계 소폭 하락',effects:{synergy:8,governance:5,boundary:-3,affectionEach:5,trustEach:2},outcome:'결정은 빨라졌지만, 네 사람은 대표의 관심이 권한 배분에 영향을 주지 않는지 더 예민하게 지켜보기 시작했습니다.'},
    ]},
  {id:'hostile_takeover',title:'제2장 · 네 개 부서를 노린 적대적 인수',icon:'⚠️',scene:'./assets/event-business-quartet-crisis.png',
    desc:'경쟁 세력이 네 사업의 거래처와 핵심 인력을 동시에 흔들었습니다. 평소 서로를 견제하던 네 담당자가 처음으로 한 팀처럼 움직입니다.',
    dialogues:[
      ['차서윤','계약과 자금줄은 제가 잠급니다. 이슬 씨는 여론을 돌려요.'],
      ['한이슬','명령은 싫지만 이번 편집은 마음에 드네. 지수 씨, 고객 데이터 부탁해.'],
      ['박지수','이미 분류했어요. 혜린 씨 쪽 현장 인력부터 보호해 주세요.'],
      ['오혜린','다치거나 버려지는 사람 없이 끝내요. 그게 우리 쪽 승리예요.'],
    ],
    choices:[
      {id:'protect_all',text:'수익을 포기하고 직원·거래처를 모두 지킨다',preview:'현금 -500만 · 전 지표 크게 상승',effects:{cash:-5000000,synergy:16,governance:9,boundary:4,affectionEach:5,trustEach:8},outcome:'단기 손실은 컸지만 어느 부서도 버려지지 않았습니다. 네 사람은 당신이 자신들을 소모품으로 쓰지 않는다는 걸 확인했습니다.'},
      {id:'counterdeal',text:'서윤의 역인수안과 이슬의 여론전을 승인한다',preview:'현금 +300만 · 시너지 상승, 경계 하락',effects:{cash:3000000,synergy:13,governance:6,boundary:-5,affectionEach:6,trustEach:3},outcome:'상대의 계약과 평판을 동시에 무너뜨렸습니다. 완벽한 승리였지만 네 사람과 당신 사이의 결탁은 더 짙어졌습니다.'},
    ]},
  {id:'after_hours_rules',title:'제3장 · 퇴근 뒤에는 누가 대표인가',icon:'🌃',scene:'./assets/event-business-quartet-afterhours.png',
    desc:'위기를 넘긴 밤, 다섯 사람만 남은 사무실에서 업무 보고가 사적인 고백으로 바뀌었습니다. 이제 회사와 관계의 경계를 정해야 합니다.',
    dialogues:[
      ['한이슬','회사에서는 대표님. 여기서는 그냥 이름으로 부르면 안 돼?'],
      ['박지수','좋아요. 대신 서운한 일을 인사평가처럼 쌓아두지는 않기.'],
      ['오혜린','싫다고 말해도 회사에서 불이익이 없다는 약속도 필요해요.'],
      ['차서윤','그 조항에는 동의합니다. 사랑을 지분처럼 독점하지 않는다는 조건도 추가하죠.'],
    ],
    choices:[
      {id:'clear_rules',text:'업무권한·사적 동의·질투의 선을 명확히 합의한다',preview:'공동 의사결정·공사 경계 크게 상승',effects:{synergy:7,governance:15,boundary:16,affectionEach:6,trustEach:10},outcome:'낭만적이지 않은 규칙들이 오히려 다섯 사람을 안심시켰습니다. 누구도 고용과 사랑을 거래하지 않기로 했습니다.'},
      {id:'trust_feeling',text:'규칙보다 서로의 마음을 믿고 자연스럽게 둔다',preview:'호감 크게 상승 · 공사 경계 하락',effects:{synergy:5,governance:-3,boundary:-10,affectionEach:11,trustEach:3},outcome:'그날 밤은 따뜻했지만 다음 날부터 사소한 배려와 업무 지시의 뜻을 두 번씩 해석해야 했습니다.'},
    ]},
];

function freshStaff(){
  return{bond:0,trust:0,revealed:false,revealDay:0,temptationSeen:false,trapTriggered:false,
    boundaryKept:false,ending:null,lastContactDay:0,eventsSeen:[],storyChapter:0};
}
function ensure(life){
  if(!life.businessRomance||typeof life.businessRomance!=='object'){
    life.businessRomance={staff:{},profitableStreak:0,lastEventDay:0,quartetEnding:null};
  }
  const state=life.businessRomance;
  if(!state.staff||typeof state.staff!=='object')state.staff={};
  IDS.forEach(id=>{
    const old=state.staff[id]||{};
    state.staff[id]=Object.assign(freshStaff(),old,{
      bond:clamp(finite(old.bond,0),0,100),
      trust:clamp(finite(old.trust,0),0,100),
      revealed:!!old.revealed,
      temptationSeen:!!old.temptationSeen,
      trapTriggered:!!old.trapTriggered,
      boundaryKept:!!old.boundaryKept,
      eventsSeen:Array.isArray(old.eventsSeen)?old.eventsSeen:[],
      storyChapter:clamp(Math.floor(finite(old.storyChapter,0)),0,(PERSONAL_STORIES[id]||[]).length),
    });
  });
  state.profitableStreak=Math.max(0,Math.floor(finite(state.profitableStreak,0)));
  state.lastEventDay=Math.max(0,Math.floor(finite(state.lastEventDay,0)));
  if(!state.quartet||typeof state.quartet!=='object')state.quartet={chapter:0,synergy:40,governance:40,boundary:45,lastStoryDay:0};
  state.quartet.chapter=clamp(Math.floor(finite(state.quartet.chapter,0)),0,QUARTET_CHAPTERS.length);
  state.quartet.synergy=clamp(finite(state.quartet.synergy,40),0,100);
  state.quartet.governance=clamp(finite(state.quartet.governance,40),0,100);
  state.quartet.boundary=clamp(finite(state.quartet.boundary,45),0,100);
  return state;
}
function profile(id){return PROFILES[id]||null;}
function staffState(life,id){return ensure(life).staff[id]||null;}
function identity(life,id){
  const p=profile(id),s=p&&staffState(life,id);
  if(!p)return null;
  return{
    ...p,revealed:!!s.revealed,
    displayName:s.revealed?p.name:p.alias,
    listName:s.revealed?p.name:p.hiddenName,
    portrait:s.revealed?`./assets/characters/${p.portrait}`:null,
    bond:Math.round(s.bond),trust:Math.round(s.trust),
  };
}
function asCharacter(id){
  const p=profile(id);if(!p)return null;
  return{name:p.name,gender:p.gender,emoji:p.emoji,job:p.job,age:p.age,income:0,
    personality:p.personality,portrait:p.portrait,special:'business',moneyStyle:p.moneyStyle};
}
function ownedIds(businessState){
  return new Set(((businessState&&businessState.owned)||[]).map(item=>item.managerId));
}
function applyDecision(life,id,effects){
  const s=staffState(life,id);if(!s)return null;
  const e=effects||{};
  const care=Math.max(0,finite(e.morale,0))+Math.max(0,finite(e.reputation,0))*.7;
  const harm=Math.max(0,-finite(e.morale,0))+Math.max(0,-finite(e.reputation,0))*.6;
  s.bond=clamp(s.bond+Math.round(2+care*.65-harm*.45),0,100);
  s.trust=clamp(s.trust+Math.round(care*.35-harm*.55),0,100);
  return{bond:s.bond,trust:s.trust};
}
function event(type,id,day){return{businessRomanceEvent:true,kind:type,staffId:id,day};}
function nextPersonal(life,ctx){
  const state=ensure(life);
  for(const id of IDS){
    const s=state.staff[id],rec=(ctx.met||[]).find(person=>person.name===PROFILES[id].name);
    const story=(PERSONAL_STORIES[id]||[])[s.storyChapter||0];
    if(!story||!s.revealed||!rec||rec.status==='ex')continue;
    if((rec.affection||0)>=story.minAffection&&(rec.trust||0)>=story.minTrust){
      return{businessRomanceEvent:true,kind:'personal-story',staffId:id,eventId:story.id,day:ctx.day};
    }
  }
  return null;
}
function nextQuartetChapter(life,ctx,allOwned){
  const state=ensure(life),index=state.quartet.chapter||0,chapter=QUARTET_CHAPTERS[index];
  if(!chapter||!allOwned||!IDS.every(id=>state.staff[id].revealed&&state.staff[id].storyChapter>=1))return null;
  const records=IDS.map(id=>(ctx.met||[]).find(person=>person.name===PROFILES[id].name));
  if(records.some(rec=>!rec||rec.status==='ex'))return null;
  const totalProfit=((ctx.businessState&&ctx.businessState.owned)||[]).reduce((sum,item)=>sum+(item.totalProfit||0),0);
  if(index===1&&totalProfit<25000000)return null;
  if(index===2&&records.some(rec=>(rec.affection||0)<42||(rec.trust||0)<20))return null;
  return{businessRomanceEvent:true,kind:'quartet-story',chapterId:chapter.id,day:ctx.day};
}
function monthly(life,context){
  const state=ensure(life),ctx=context||{},day=Math.max(1,Math.floor(finite(ctx.day,1)));
  const owned=ownedIds(ctx.businessState),allOwned=IDS.every(id=>owned.has(id));
  IDS.forEach(id=>{
    if(!owned.has(id))return;
    const s=state.staff[id],item=((ctx.businessState&&ctx.businessState.owned)||[]).find(x=>x.managerId===id);
    if(item&&item.lastNet>0){
      s.bond=clamp(s.bond+2+Math.min(3,Math.max(0,item.level-1)),0,100);
      s.trust=clamp(s.trust+(item.reputation>=60?1:0),0,100);
    }else if(item&&item.lastNet<0)s.bond=clamp(s.bond-1,0,100);
  });
  state.profitableStreak=allOwned&&finite(ctx.totalNet,0)>0?state.profitableStreak+1:0;
  if(day-state.lastEventDay<1)return null;

  if(ctx.hasPartner){
    const target=IDS.find(id=>{
      const item=((ctx.businessState&&ctx.businessState.owned)||[]).find(x=>x.managerId===id);
      const s=state.staff[id];
      return owned.has(id)&&item&&item.months>=2&&item.lastNet>0&&!s.revealed&&!s.temptationSeen;
    });
    if(target){
      state.staff[target].temptationSeen=true;
      state.staff[target].lastContactDay=day;
      state.lastEventDay=day;
      return event('temptation',target,day);
    }
  }

  if(!ctx.hasPartner&&allOwned&&state.profitableStreak>=3){
    const target=IDS.find(id=>!state.staff[id].revealed&&state.staff[id].bond>=6);
    if(target){
      state.lastEventDay=day;
      return event('reveal',target,day);
    }
  }

  const personalEvent=nextPersonal(life,{...ctx,day});
  if(personalEvent){state.lastEventDay=day;return personalEvent;}
  const quartetChapter=nextQuartetChapter(life,{...ctx,day},allOwned);
  if(quartetChapter){state.lastEventDay=day;return quartetChapter;}

  const solo=IDS.find(id=>{
    const s=state.staff[id],rec=(ctx.met||[]).find(person=>person.name===PROFILES[id].name);
    const item=((ctx.businessState&&ctx.businessState.owned)||[]).find(x=>x.managerId===id);
    return s.revealed&&!s.ending&&rec&&['partner','polycule'].includes(rec.status)&&
      rec.affection>=80&&rec.trust>=45&&item&&item.level>=4&&item.totalProfit>=20000000;
  });
  if(solo){
    state.lastEventDay=day;
    return event('solo-ending',solo,day);
  }

  const quartetReady=allOwned&&!state.quartetEnding&&state.quartet.chapter>=QUARTET_CHAPTERS.length&&
    state.quartet.synergy>=65&&state.quartet.governance>=58&&state.quartet.boundary>=55&&IDS.every(id=>{
    const s=state.staff[id],rec=(ctx.met||[]).find(person=>person.name===PROFILES[id].name);
    return s.revealed&&rec&&rec.affection>=55&&rec.trust>=25;
  })&&!(ctx.partnerNames||[]).some(name=>!IDS.some(id=>PROFILES[id].name===name));
  if(quartetReady){
    state.lastEventDay=day;
    return{businessRomanceEvent:true,kind:'quartet-ending',day};
  }
  return null;
}
function view(life,payload,capital){
  if(!payload||!payload.businessRomanceEvent)return null;
  const state=ensure(life);
  if(payload.kind==='quartet-story'){
    const chapter=QUARTET_CHAPTERS.find(item=>item.id===payload.chapterId);
    if(!chapter)return null;
    return{kind:payload.kind,icon:chapter.icon,title:chapter.title,desc:chapter.desc,line:'네 사람의 이해관계가 하나의 안건 위에서 충돌합니다.',
      portrait:chapter.scene,dialogues:chapter.dialogues,choices:chapter.choices.map(choice=>({id:choice.id,text:choice.text,preview:choice.preview})),
      meta:`업무 시너지 ${Math.round(state.quartet.synergy)} · 공동 의사결정 ${Math.round(state.quartet.governance)} · 공과 사 경계 ${Math.round(state.quartet.boundary)}`};
  }
  if(payload.kind==='quartet-ending'){
    return{
      kind:payload.kind,icon:'🏢',title:'네 개의 명함, 하나의 동업',
      desc:'네 사업의 담당자들이 같은 회의실에 앉았습니다. 서로의 방식은 다르지만, 당신과 함께 일하며 쌓은 신뢰만큼은 같습니다.',
      line:'“대표 한 사람을 두고 경쟁하기보다, 다섯 명이 함께 키울 회사를 정하죠.”',
      portrait:'./assets/event-business-quartet-afterhours.png',
      meta:`업무 시너지 ${Math.round(state.quartet.synergy)} · 공동 의사결정 ${Math.round(state.quartet.governance)} · 공과 사 경계 ${Math.round(state.quartet.boundary)}`,
      choices:[
        {id:'accept',text:'🤝 네 사람과 공동대표이자 연인이 된다',preview:'4인 세트 엔딩 · 전원 합의형 연인'},
        {id:'wait',text:'📋 지금은 동업 관계를 지킨다',preview:'조건이 유지되면 나중에 다시 제안받을 수 있음'},
      ],
    };
  }
  const p=profile(payload.staffId),s=p&&staffState(life,payload.staffId),who=p&&identity(life,payload.staffId);
  if(!p||!s)return null;
  if(payload.kind==='personal-story'){
    const story=(PERSONAL_STORIES[p.id]||[]).find(item=>item.id===payload.eventId);
    if(!story)return null;
    return{kind:payload.kind,profile:p,identity:who,icon:story.icon,title:`${p.name} · ${story.title}`,desc:story.desc,line:story.line,
      portrait:story.scene||p.scene,choices:story.choices.map(choice=>({id:choice.id,text:choice.text,preview:choice.preview})),
      meta:`개인 업무 이야기 ${(s.storyChapter||0)+1}/2 · 업무 신뢰 ${Math.round(s.bond)} · 개인 신뢰 ${Math.round(s.trust)}`};
  }
  if(payload.kind==='temptation')return{
    kind:payload.kind,profile:p,identity:who,icon:'📱',title:`${p.alias}의 심야 업무 연락`,
    desc:'업무 이야기로 시작한 메시지가 노골적인 개인 약속으로 바뀌었습니다. 지금 선을 넘으면 우연한 만남으로 끝나지 않습니다.',
    line:p.temptation,portrait:p.maskedScene,
    choices:[
      {id:'boundary',text:'🧱 연인이 있다고 분명히 말하고 업무만 답한다',preview:'함정을 피하고 숨은 신뢰 상승'},
      {id:'meet',text:'🌙 아무도 모르게 둘만 만나러 간다',preview:'확정 불륜 함정 · 관계 파탄 또는 금전 협박'},
    ],
  };
  if(payload.kind==='reveal')return{
    kind:payload.kind,profile:p,identity:who,icon:'🎭',title:`${p.alias}의 비공개 사업 미팅`,
    desc:'네 사업이 연속 흑자를 내자 담당자가 업무 시간 밖의 회의를 요청했습니다. 늘 얼굴을 가리던 머리카락을 걷어내고 실명을 밝힙니다.',
    line:p.revealLine,
    portrait:p.scene,
    choices:[
      {id:'meet',text:'☕ 이름을 저장하고 업무 밖에서도 만나 본다',preview:'얼굴·이름 공개 · 친구와 연락처에 추가'},
      {id:'postpone',text:'📅 오늘은 사업 이야기만 하고 돌아간다',preview:'공개를 미룸 · 2개월 뒤 다시 가능'},
    ],
  };
  if(payload.kind==='solo-ending')return{
    kind:payload.kind,profile:p,identity:who,icon:'💍',title:`${p.name} · ${p.pureTitle}`,
    desc:p.pureText,line:'“일 때문에 만난 건 맞아요. 그래도 이제는 일이 끝나도 옆에 있고 싶어요.”',
    portrait:p.scene,
    choices:[
      {id:'accept',text:'💗 함께 사업과 삶을 이어간다',preview:'개별 순애 엔딩 기록'},
      {id:'wait',text:'아직 엔딩으로 남기지 않는다',preview:'관계는 그대로 유지'},
    ],
  };
  return null;
}
function resolve(life,payload,choiceId,capital){
  const state=ensure(life),p=payload&&profile(payload.staffId),s=p&&state.staff[p.id];
  if(payload.kind==='quartet-story'){
    const chapter=QUARTET_CHAPTERS.find(item=>item.id===payload.chapterId),choice=chapter&&chapter.choices.find(item=>item.id===choiceId);
    if(!chapter||!choice)return{ok:false,message:'이사회 이야기를 찾지 못했습니다.'};
    const e=choice.effects||{},q=state.quartet;
    q.synergy=clamp(q.synergy+finite(e.synergy,0),0,100);
    q.governance=clamp(q.governance+finite(e.governance,0),0,100);
    q.boundary=clamp(q.boundary+finite(e.boundary,0),0,100);
    q.chapter=Math.max(q.chapter,QUARTET_CHAPTERS.indexOf(chapter)+1);q.lastStoryDay=payload.day||1;
    return{ok:true,done:true,groupStory:true,title:chapter.title,text:choice.outcome,cash:Math.round(finite(e.cash,0)),
      affectionEach:finite(e.affectionEach,0),trustEach:finite(e.trustEach,0),tone:'good',
      meta:`업무 시너지 ${Math.round(q.synergy)} · 공동 의사결정 ${Math.round(q.governance)} · 공과 사 경계 ${Math.round(q.boundary)}`};
  }
  if(payload.kind==='quartet-ending'){
    if(choiceId==='accept'){
      state.quartetEnding={id:'four_directors',day:payload.day||1};
      return{ok:true,done:true,quartet:true,title:'네 개의 명함',text:'네 사람은 서로의 약점을 견제하고 강점을 나눴습니다. 다섯 명의 공동대표이자 연인으로 만든 회사는 어느 한 사람의 소유가 아닌 공동의 삶이 됐습니다.'};
    }
    state.lastEventDay=Math.max(0,(payload.day||1)-2);
    return{ok:true,done:true,text:'네 사람과 동업 관계를 유지했습니다. 마음이 같다면 다음 흑자 보고 뒤에 다시 이야기가 나올 수 있습니다.'};
  }
  if(!p||!s)return{ok:false,message:'담당자 이벤트를 찾지 못했습니다.'};
  if(payload.kind==='personal-story'){
    const story=(PERSONAL_STORIES[p.id]||[]).find(item=>item.id===payload.eventId),choice=story&&story.choices.find(item=>item.id===choiceId);
    if(!story||!choice)return{ok:false,message:'개인 업무 이야기를 찾지 못했습니다.'};
    const e=choice.effects||{},q=state.quartet;
    s.storyChapter=Math.max(s.storyChapter||0,(PERSONAL_STORIES[p.id]||[]).indexOf(story)+1);
    s.bond=clamp(s.bond+finite(e.bond,0),0,100);s.trust=clamp(s.trust+finite(e.trust,0),0,100);
    q.synergy=clamp(q.synergy+finite(e.synergy,0),0,100);
    q.governance=clamp(q.governance+finite(e.governance,0),0,100);
    q.boundary=clamp(q.boundary+finite(e.boundary,0),0,100);
    return{ok:true,done:true,personalStory:true,staffId:p.id,title:story.title,text:choice.outcome,
      cash:Math.round(finite(e.cash,0)),affection:finite(e.affection,0),trust:finite(e.trust,0),reply:choice.reply||'',tone:'good',
      meta:`${p.name} 개인 이야기 ${s.storyChapter}/2 · 업무 신뢰 ${Math.round(s.bond)}`};
  }
  if(payload.kind==='temptation'){
    if(choiceId==='boundary'){
      s.boundaryKept=true;s.bond=clamp(s.bond+10,0,100);s.trust=clamp(s.trust+14,0,100);
      return{ok:true,done:true,text:p.boundary,tone:'good'};
    }
    if(choiceId==='meet'){
      s.trapTriggered=true;s.bond=clamp(s.bond+6,0,100);s.trust=0;
      if(p.trap==='blackmail'){
        const loss=Math.max(p.blackmailMin,Math.min(p.blackmailMax,Math.round(Math.max(0,finite(capital,0))*p.blackmailRate)));
        return{ok:true,done:true,badEnding:true,blackmail:true,cash:-loss,title:p.trapTitle,text:p.trapText,tone:'bad'};
      }
      return{ok:true,done:true,badEnding:true,breakupAll:true,title:p.trapTitle,text:p.trapText,tone:'bad'};
    }
  }
  if(payload.kind==='reveal'){
    if(choiceId==='meet'){
      s.revealed=true;s.revealDay=payload.day||1;s.bond=clamp(s.bond+12,0,100);s.trust=clamp(s.trust+10,0,100);
      return{ok:true,done:true,revealed:true,character:asCharacter(p.id),affection:Math.max(24,Math.round(s.bond*.55)),trust:Math.max(12,Math.round(s.trust)),text:`${p.name}의 얼굴과 이름이 연락처에 저장됐습니다. 이제 업무 밖의 외출과 데이트가 열립니다.`,tone:'good'};
    }
    state.profitableStreak=Math.max(0,state.profitableStreak-2);
    return{ok:true,done:true,text:`${p.alias}와 사업 이야기만 나눴습니다. 흑자를 이어가면 다시 개인 연락이 올 수 있습니다.`,tone:'neutral'};
  }
  if(payload.kind==='solo-ending'){
    if(choiceId==='accept'){
      s.ending={id:`${p.id}_pure`,day:payload.day||1};
      return{ok:true,done:true,soloEnding:true,title:p.pureTitle,text:p.pureText,tone:'good'};
    }
    state.lastEventDay=Math.max(0,(payload.day||1)-2);
    return{ok:true,done:true,text:'둘은 서두르지 않고 지금의 관계와 사업을 더 이어가기로 했습니다.',tone:'neutral'};
  }
  return{ok:false,message:'선택을 처리하지 못했습니다.'};
}
function endingSummary(life){
  const state=ensure(life);
  if(state.quartetEnding)return'🏢 사업 담당자 4인 세트 엔딩 · 네 개의 명함';
  return IDS.map(id=>state.staff[id].ending&&`${PROFILES[id].emoji} ${PROFILES[id].name} 순애 엔딩`).filter(Boolean).join(' · ');
}
function progressSummary(life){
  const state=ensure(life),q=state.quartet;
  const personal=IDS.reduce((sum,id)=>sum+(state.staff[id].storyChapter||0),0);
  return{personal,total:IDS.length*2,chapter:q.chapter,chapters:QUARTET_CHAPTERS.length,
    synergy:Math.round(q.synergy),governance:Math.round(q.governance),boundary:Math.round(q.boundary)};
}

root.QT_BUSINESS_ROMANCE={PROFILES,PERSONAL_STORIES,QUARTET_CHAPTERS,IDS,ensure,profile,staffState,identity,asCharacter,applyDecision,monthly,view,resolve,endingSummary,progressSummary};
})(window);
