/* QuickTrade Life — 사업 담당자 4인 익명·유혹·공개·엔딩 루트 */
(function(root){'use strict';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const finite=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
const ROMANCE_ENDINGS={
  cohabitation_refusal:{
    icon:'📑',title:'감사의견 거절',scene:'./assets/event-business-quartet-full-disclosure.png',
    quote:'“사실은 공개했지만, 책임은 아직 누구에게도 도착하지 않았네요.”',
    text:'플레이어는 모두가 자신을 좋아했으니 어쩔 수 없었다고 답했습니다. 네 사람은 유혹한 책임을 인정했지만 대표의 책임 회피까지 대신 서명하지 않았습니다. 기존 연인들은 떠났고, 마지막 감사보고서에서 대표 권한도 회수됐습니다.',
    detail:'공개 뒤 책임 인정 거부 · 기존 관계와 경영권 동시 상실'
  },
  pure_affair:{
    icon:'🏢',title:'이중장부',scene:'./assets/event-business-quartet-secret-audit.png',
    quote:'“같은 날짜에 서로 다른 약속이 네 장입니다. 이제 원장과 사본을 맞춰 보죠.”',
    text:'한 사람에게는 곧 기존 관계를 끝낸다고 했고, 다른 사람에게는 업무일 뿐이라고 했습니다. 네 책임자는 사적 기록과 회사 일정을 한 장의 감사표로 합쳤고, 모든 관계자에게 같은 원본을 전달했습니다.',
    detail:'서로 다른 거짓말의 대조 · 관계 폭로와 대표 해임'
  },
  secret_consortium:{
    icon:'🗂️',title:'비공개 컨소시엄',scene:'./assets/event-business-quartet-afterhours.png',
    quote:'“사랑을 순번표로 만들면, 인사와 예산도 결국 같은 표에 들어갑니다.”',
    text:'비밀 만남의 순번은 사업 배정과 성과급, 출장 일정에 스며들었습니다. 회사 비용으로 거짓 출장을 만들고 별도 휴대전화를 돌린 끝에 연애와 인사가 동시에 감사 대상이 됐습니다.',
    detail:'비밀 순환 관계 유지 · 회사와 모든 관계 동시 붕괴'
  },
  hostile_buyout:{
    icon:'💸',title:'적대적 인수',scene:'./assets/event-business-quartet-crisis.png',
    quote:'“사람을 정리하는 비용까지 사업 혜택으로 계산했군요.”',
    text:'플레이어는 기존 연인에게 집과 돈을 제시하고 사업 4인조를 선택하려 했습니다. 네 사람조차 관계를 거래 대상으로 본 대표에게 환멸을 느꼈고, 기존 연인과 함께 협상장을 떠났습니다.',
    detail:'기존 관계를 돈으로 회유 · 전원 이탈과 세력 안정도 붕괴'
  }
};
function romanceEnding(kind){return ROMANCE_ENDINGS[kind]||null;}

const PROFILES={
  office:{
    id:'office',businessId:'commerce',hiddenName:'박○○',alias:'박 매니저',name:'박지수',
    role:'유통 운영 책임자',emoji:'📋',gender:'f',age:30,job:'한빛리테일 운영 책임자',rivalFirm:'한빛리테일',
    personality:'caring',moneyStyle:'support',portrait:'business-office-reveal.png',scene:'./assets/event-business-office-night.png',maskedScene:'./assets/event-business-office-masked.png',
    style:'말보다 먼저 재고표와 식사를 챙기는 생활형 실무자',
    revealLine:'세 달 동안 보고 방식은 충분히 봤어요. 개인 연락망을 열어두죠. 다만 업무와 사적인 약속은 천천히 구분해요.',
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
    role:'콘텐츠 제작 실장',emoji:'🎨',gender:'f',age:29,job:'프리즘스튜디오 제작 실장',rivalFirm:'프리즘스튜디오',
    personality:'free',moneyStyle:'independent',portrait:'business-creative-reveal.png',scene:'./assets/event-business-creative-night.png',maskedScene:'./assets/event-business-creative-masked.png',
    style:'위험한 아이디어를 웃으며 현실로 만드는 자유로운 제작자',
    revealLine:'회의실 밖에서도 아이디어를 주고받을 정도의 신뢰는 생겼네요. 번호는 줄게요. 재미없는 선부터 지켜 봐요.',
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
    role:'재무·계약 총괄',emoji:'📑',gender:'f',age:33,job:'서린파트너스 계약 총괄',rivalFirm:'서린파트너스',
    personality:'cold',moneyStyle:'independent',portrait:'business-corporate-reveal.png',scene:'./assets/event-business-corporate-night.png',maskedScene:'./assets/event-business-corporate-masked.png',
    style:'감정보다 계약의 빈칸을 먼저 읽는 냉정한 협상가',
    revealLine:'업무 연락은 여기까지예요. 다음부터는 이 번호로 직접 연락하세요. 오해는 금물이고요.',
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
    role:'현장 서비스 책임자',emoji:'🩺',gender:'f',age:31,job:'온케어네트워크 현장 책임자',rivalFirm:'온케어네트워크',
    personality:'frugal',moneyStyle:'support',portrait:'business-medical-reveal.png',scene:'./assets/event-business-medical-night.png',maskedScene:'./assets/event-business-medical-masked.png',
    style:'안전과 양심을 타협하지 않는 차분한 현장 책임자',
    revealLine:'현장을 무리시키지 않는다는 건 확인했어요. 급한 일이 생기면 개인 번호로 연락하세요. 안부는 그다음이고요.',
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
    {id:'rain_shift',minAffection:68,minTrust:42,title:'비 오는 날의 대체 근무',icon:'☔',scene:'./assets/event-business-office-rain-shift-pixel-v1.png',
      desc:'폭우로 배송과 출근이 모두 꼬인 날, 지수는 대표를 부르지 않고 직원들과 현장을 수습했습니다. 일이 끝난 뒤에야 젖은 우산 하나를 들고 당신에게 연락합니다.',
      line:'오늘은 제가 대표님 사업을 지켰어요. 그러니까 지금부터는… 대표님이 제 퇴근을 좀 챙겨 줄래요?',
      choices:[
        {id:'late_meal',text:'문 닫은 식당 대신 편의점 앞에서 늦은 저녁을 먹는다',preview:'호감 크게 상승 · 생활형 추억',effects:{cash:-50000,affection:13,trust:9,bond:10,boundary:4},outcome:'화려한 식사는 아니었지만 지수는 그날을 처음으로 “우리 둘의 퇴근”이라고 불렀습니다.',reply:'이런 거 좋아요. 회사가 잘된 날보다, 같이 집에 가는 날.'},
        {id:'ride_home',text:'직원들의 귀가부터 확인하고 마지막으로 지수를 데려다준다',preview:'신뢰 크게 상승 · 업무 시너지 상승',effects:{cash:-300000,affection:8,trust:14,bond:11,synergy:5},outcome:'지수는 자신과 직원들을 같은 기준으로 챙긴 당신에게 말없이 젖은 어깨를 기댔습니다.',reply:'대표님이 마지막 순서라서 좋아요. 다 챙기고도 제 자리가 남아 있다는 뜻이니까.'},
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
    {id:'rooftop_preview',minAffection:68,minTrust:42,title:'옥상에서 보는 무음 시사회',icon:'🌌',scene:'./assets/event-business-creative-rooftop-pixel-v1.png',
      desc:'이슬은 완성된 광고보다 폐기된 장면들만 이어 붙인 영상을 옥상 벽에 틀었습니다. 화면 속에는 직원들의 웃음과 당신을 바라보던 자신의 시선이 남아 있습니다.',
      line:'팔 수 없는 장면만 모았어요. 이상하지? 내가 제일 갖고 싶은 건 늘 상품이 안 되더라.',
      choices:[
        {id:'archive',text:'둘만 보는 비공개 아카이브를 함께 만든다',preview:'호감·신뢰 크게 상승',effects:{affection:12,trust:12,bond:10,boundary:6},outcome:'두 사람은 공개하지 않아도 사라지지 않는 장면들을 매달 한 편씩 남기기로 했습니다.',reply:'좋아. 세상에는 안 팔고, 우리만 계속 업데이트하는 거야.'},
        {id:'team_film',text:'직원 모두가 주인공인 사내 영화로 다시 편집한다',preview:'사기·업무 시너지 상승',effects:{affection:8,trust:10,bond:11,synergy:8},outcome:'이슬은 사랑을 독점하는 대신 함께 일한 사람들의 시간을 작품으로 돌려주었습니다.',reply:'당신 옆에 있으면 욕심을 나눠도 장면이 작아지지 않네.'},
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
    {id:'elevator_pause',minAffection:68,minTrust:42,title:'멈춘 엘리베이터의 11분',icon:'🛗',scene:'./assets/event-business-corporate-elevator-pixel-v1.png',
      desc:'대형 협상을 끝낸 밤 엘리베이터가 잠시 멈췄습니다. 통신도 계약서도 없는 좁은 공간에서 서윤은 처음으로 계산하지 못한 불안을 드러냅니다.',
      line:'지금은 해결책을 말하지 마세요. 대표님이 옆에 있다는 사실만 확인하겠습니다.',
      choices:[
        {id:'quiet',text:'아무 약속도 하지 않고 손만 잡는다',preview:'호감·신뢰 크게 상승 · 공사 경계 안정',effects:{affection:11,trust:13,bond:10,boundary:7},outcome:'11분 동안 아무 조건도 교환하지 않았고, 서윤은 그 침묵을 가장 확실한 합의로 기억했습니다.',reply:'문서가 없는데도 이행됐군요. 이런 신뢰는 처음입니다.'},
        {id:'contingency',text:'나간 뒤 전 직원 비상 대응 체계를 함께 만든다',preview:'신뢰·공동 의사결정 크게 상승',effects:{affection:7,trust:15,bond:11,governance:8},outcome:'개인의 공포는 조직의 안전 규칙이 됐고 서윤은 약점을 숨기지 않아도 권한을 잃지 않았습니다.',reply:'제 약점을 비용으로 보지 않았군요. 그 판단에는 오래 투자할 가치가 있습니다.'},
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
    {id:'dawn_round',minAffection:68,minTrust:42,title:'첫 예약 전의 새벽 순찰',icon:'🌅',scene:'./assets/event-business-medical-dawn-pixel-v1.png',
      desc:'혜린은 확장한 여러 지점을 직접 돌다가 첫차 시간의 빈 센터에서 당신과 마주쳤습니다. 직원들이 스스로 운영할 수 있게 된 뒤에도 혼자 확인하던 습관이 남아 있습니다.',
      line:'이제 제가 없어도 잘 돌아가는데, 자꾸 확인하러 오게 돼요. 사람도… 좋아하면 그렇게 되나 봐요.',
      choices:[
        {id:'breakfast',text:'점검표를 덮고 첫 예약 전까지 함께 아침을 먹는다',preview:'호감 크게 상승 · 안식감',effects:{cash:-80000,affection:13,trust:9,bond:10,boundary:5},outcome:'센터는 직원들에게 맡겨 둔 채 두 사람은 처음으로 아무도 돌보지 않는 아침을 보냈습니다.',reply:'다음에는 점검 핑계 없이 부를게요. 그냥 보고 싶다고.'},
        {id:'rotation',text:'지점 책임자 순환 점검으로 혜린의 새벽 근무를 없앤다',preview:'신뢰·공동 의사결정 크게 상승',effects:{cash:-700000,affection:8,trust:14,bond:11,governance:8},outcome:'혜린의 책임감은 직원들에게 권한으로 나뉘었고, 그녀의 새벽은 비로소 개인의 시간이 됐습니다.',reply:'이제 새벽에 만나면 일 때문이 아니겠네요. 그게 조금 설레요.'},
      ]},
  ],
};

const QUARTET_CHAPTERS=[
  {id:'secret_audit',title:'제1장 · 네 사람이 발견한 같은 밤',icon:'🗂️',scene:'./assets/event-business-quartet-secret-audit.png',
    desc:'지수의 야식, 이슬의 촬영 원본, 서윤의 비밀계약, 혜린의 휴식 기록이 같은 날짜의 대표 일정과 겹쳤습니다. 네 사람은 자신만 예외라고 믿었던 흔적을 한 테이블 위에 놓고, 감정보다 먼저 사실관계를 맞추기 시작합니다.',
    dialogues:[
      ['차서윤','우선 확인하죠. 대표님이 네 사람에게 같은 약속을 했는지.'],
      ['한이슬','기분은 최악인데 장면은 웃기네. 다들 자기가 비밀 주인공인 줄 알았잖아.'],
      ['박지수','웃을 일이 아니에요. 기존 연인들도 모르는 거잖아요.'],
      ['오혜린','그만해야 해요. 우리 모두요. 적어도 더 숨기기 전에.'],
    ],
    choices:[
      {id:'open_records',text:'네 사람에게 했던 말과 일정을 전부 보여준다',preview:'사실 확인 · 책임 협의 시작',effects:{synergy:4,governance:10,boundary:8,affectionEach:-2,trustEach:5,accountability:12},outcome:'좋은 의도로 포장한 말까지 전부 대조됐습니다. 네 사람은 상처받았지만, 최소한 다섯 번째 거짓말은 생기지 않았습니다.'},
      {id:'deny_records',text:'업무 기록을 오해했다며 각자의 착각으로 돌린다',preview:'이중장부 배드엔딩',badEnding:'double_ledger',outcome:'네 사람은 더 묻지 않고 서버 기록과 출입 내역을 원본 그대로 합쳤습니다.'},
    ]},
  {id:'disclosure_vote',title:'제2장 · 비밀관계 감사위원회',icon:'📑',scene:'./assets/event-business-quartet-full-disclosure.png',
    desc:'네 사람은 자신들도 유혹과 은폐의 공범이었다고 인정했습니다. 이제 플레이어에게 기존 관계를 어떻게 처리할지 묻습니다. 문제는 사람 수가 아니라, 당사자들에게 선택권을 주지 않았다는 사실입니다.',
    dialogues:[
      ['박지수','우리가 먼저 다가간 건 맞아요. 그렇다고 대표님 선택이 사라지는 건 아니에요.'],
      ['한이슬','비밀이 재미있었던 건 인정할게. 하지만 남의 대답까지 편집한 건 선을 넘었지.'],
      ['차서윤','사적 관계와 고용은 분리합니다. 누구도 회사 권한으로 회유하지 않겠습니다.'],
      ['오혜린','기존 연인이 거부하면 받아들여야 해요. 우리도 떠날 가능성까지 포함해서요.'],
    ],
    choices:[
      {id:'secret_consortium',text:'기존 관계도 네 사람도 모르게 계속 유지하자고 한다',preview:'비공개 컨소시엄 배드엔딩',badEnding:'secret_consortium',outcome:'만남 순번과 사업 일정이 같은 장부에 들어가는 순간, 관계는 비밀 컨소시엄으로 전락했습니다.'},
      {id:'buyout_old',text:'기존 연인에게 집과 돈을 주고 조용히 정리한다',preview:'적대적 인수 배드엔딩',badEnding:'hostile_buyout',outcome:'사람을 퇴직 보상처럼 정리하려는 제안에 네 사람까지 자리에서 일어났습니다.'},
      {id:'choose_quartet',text:'외도 사실을 인정하고 기존 관계를 직접 끝낸 뒤 네 사람을 선택한다',preview:'큰 관계 손실 · 사업 4인조 독립 관계 후보',route:'quartet_only',effects:{governance:8,boundary:7,affectionEach:5,trustEach:4,accountability:14},outcome:'플레이어는 기존 관계가 깨지는 손실을 감수하겠다고 밝혔습니다. 네 사람은 승리라고 부르지 않고, 모든 정리가 끝난 뒤 다시 대답하기로 했습니다.'},
      {id:'disclose_everyone',text:'모든 관계자에게 사실을 공개하고 편입 가능성부터 다시 협의한다',preview:'3개월 보호관찰형 확장 루트',route:'disclosure',effects:{governance:12,boundary:12,affectionEach:2,trustEach:7,accountability:18},outcome:'기존 관계자 전원에게 같은 기록이 전달됐습니다. 누구도 즉시 용서하지 않았고, 네 사람은 업무 관계만 남는 결론까지 받아들이기로 했습니다.'},
    ]},
  {id:'probation_one',title:'제3장 · 보호관찰 첫 달, 업무만 남긴 거리',icon:'📵',scene:'./assets/event-business-quartet-boardroom.png',requiresRoute:'disclosure',
    desc:'첫 달에는 공식 업무 외 연락과 사적 만남을 중단했습니다. 네 책임자는 대표 없이 사업을 운영했고, 플레이어는 기존 관계에 변명 대신 사실과 일정을 보고했습니다.',
    dialogues:[
      ['박지수','챙기는 척하면서 사적으로 붙잡지 않을게요. 이번 달은 보고서로만 봐요.'],
      ['한이슬','연락 안 하는 것도 선택이네. 도망치려고 끊는 건 아니니까 기다릴 수 있어.'],
      ['차서윤','대표 부재 운영 기록을 남깁니다. 고용과 감정이 실제로 분리되는지 확인하죠.'],
      ['오혜린','미안하다는 연락도 상대가 받아줄 준비가 됐을 때만 해야 해요.'],
    ],
    choices:[
      {id:'work_only',text:'한 달 동안 업무 연락만 지키고 기존 관계의 질문에 답한다',preview:'1개월차 통과 · 신뢰 회복',effects:{governance:10,boundary:14,trustEach:7,accountability:8},outcome:'네 사업은 대표의 사적 관심 없이도 굴러갔고, 기존 연인들은 처음으로 숨겨진 일정이 없는 한 달을 확인했습니다.'},
      {id:'hidden_ping',text:'업무용 메신저로 네 사람에게 개인 안부를 몰래 보낸다',preview:'비공개 컨소시엄 배드엔딩',badEnding:'secret_consortium',outcome:'짧은 안부 한 줄이었지만 보호관찰의 유일한 조건을 다시 비밀로 바꿨습니다.'},
    ]},
  {id:'probation_two',title:'제4장 · 보호관찰 둘째 달, 공개된 단독 약속',icon:'📆',scene:'./assets/event-business-quartet-afterhours.png',requiresRoute:'disclosure',
    desc:'둘째 달에는 누구와 만나는지 전부 공개한 상태에서만 단독 약속이 허용됐습니다. 기존 그룹은 만남을 금지할 수 없지만, 다시 숨긴 연락이 발견되면 협의는 즉시 끝납니다.',
    dialogues:[
      ['한이슬','허락받는 데이트는 아니야. 대신 누구도 없는 사람 취급하지 않는 약속이지.'],
      ['박지수','집에 돌아갈 시간까지 제가 정하지 않을게요. 다만 늦으면 직접 말해요.'],
      ['오혜린','죄책감 때문에 누구 한 사람만 몰래 더 챙기는 것도 그만해야 해요.'],
      ['차서윤','공개된 선택은 통제가 아닙니다. 각 당사자가 거절하거나 남을 수 있는 자료예요.'],
    ],
    choices:[
      {id:'public_dates',text:'모든 약속을 공개하고 누구도 업무상 우선하지 않는다',preview:'2개월차 통과 · 공사 경계 상승',effects:{synergy:6,governance:8,boundary:14,affectionEach:5,trustEach:8,accountability:8},outcome:'질투는 사라지지 않았지만 예산과 인사로 번지지 않았습니다. 누구도 뒤늦게 자기 관계를 통보받지 않았습니다.'},
      {id:'performance_priority',text:'실적이 높은 사람에게 더 많은 만남과 사업권을 준다',preview:'비공개 컨소시엄 배드엔딩',badEnding:'secret_consortium',outcome:'애정 보상과 인사평가가 합쳐지자 네 사람은 즉시 모든 사적 약속을 중단했습니다.'},
    ]},
  {id:'third_base_trial',title:'제5장 · 보호관찰 셋째 달, 회사 밖의 제3거점',icon:'🔑',scene:'./assets/event-business-quartet-third-base.png',requiresRoute:'disclosure',
    desc:'셋째 달에는 회사 자금과 기존 그룹의 집을 쓰지 않는 별도 거점을 시험합니다. 직급·지분과 생활 관계를 분리하고, 기존 그룹도 방문할 수 있으며, 플레이어에게는 혼자 있을 방과 거절권이 보장됩니다.',
    dialogues:[
      ['차서윤','회사 비용은 0원입니다. 이 공간이 사업 보상으로 보이면 시험은 실패예요.'],
      ['박지수','누구 집을 빼앗아 만든 곳도 아니고, 매일 와야 하는 곳도 아니에요.'],
      ['한이슬','비밀 아지트는 졸업. 문 닫고 싶은 날은 그냥 닫는 거야.'],
      ['오혜린','아픈 사람을 붙잡아 두는 공간이 되면 안 돼요. 돌아갈 곳은 모두 남겨 둬요.'],
    ],
    choices:[
      {id:'separate_funds',text:'사비로만 거점을 열고 열쇠·방문·혼자 있을 권리를 문서화한다',preview:'3개월차 통과 · 제3거점 후보',effects:{cash:-6000000,governance:12,boundary:16,affectionEach:6,trustEach:9,accountability:10},outcome:'제3거점은 어느 회사와 어느 집에도 속하지 않았습니다. 처음으로 비밀이 아니라 독립공간이라는 설명이 가능해졌습니다.'},
      {id:'company_house',text:'회사 복지시설로 처리하고 담당자만 상시 거주하게 한다',preview:'적대적 인수 배드엔딩',badEnding:'hostile_buyout',outcome:'관계의 대가를 회사 자산으로 지급하려는 순간, 거점은 또 다른 거래가 됐습니다.'},
    ]},
  {id:'final_audit',title:'최종장 · 사랑과 지분을 분리한 다섯 번째 열쇠',icon:'🔐',scene:'./assets/event-business-quartet-third-base.png',
    desc:'네 사람은 마지막 감사표와 다섯 번째 열쇠를 내놓았습니다. 기존 관계를 정리하고 네 사람만 선택했든, 모든 관계자와 세 달을 다시 협의했든, 이제 누구도 비밀 경쟁 후보로 남지 않습니다.',
    dialogues:[
      ['박지수','사랑을 얻었다고 말하기 전에, 누가 무엇을 잃었는지 계속 기억해요.'],
      ['한이슬','비밀일 때보다 덜 짜릿해도 좋아. 이번엔 장면 밖 사람까지 진짜니까.'],
      ['차서윤','고용·지분·거주·동의는 별도 조항입니다. 하나를 거절해도 나머지가 불이익이 되지 않습니다.'],
      ['오혜린','깨끗하게 시작하진 못했어요. 그래서 앞으로는 더 숨기지 않는 쪽을 선택해요.'],
    ],
    choices:[
      {id:'sign_final_audit',text:'과거의 배신을 인정한 채 공개된 관계와 분리된 권한에 서명한다',preview:'사업 4인조 최종 공동 제안 대기',effects:{synergy:10,governance:14,boundary:16,affectionEach:8,trustEach:10,accountability:10},complete:true,outcome:'네 사람은 승리자가 아니라 공범이자 새 관계의 당사자로 남았습니다. 다음 연락에서는 고용이 아닌 관계 자체에 대한 대답을 요구할 것입니다.'},
      {id:'blame_them',text:'네 사람이 먼저 유혹했으니 책임도 네 사람에게 있다고 말한다',preview:'감사의견 거절 배드엔딩',badEnding:'audit_refusal',outcome:'사실은 모두 공개됐지만 플레이어의 책임만 끝내 장부에 올라오지 않았습니다.'},
    ]},
];

function freshStaff(){
  return{bond:0,trust:0,revealed:false,revealDay:0,temptationSeen:false,trapTriggered:false,
    introduced:false,hired:false,assignedBusinessId:null,rival:false,profitStreak:0,
    boundaryKept:false,loyaltyTestPassed:false,supportOnly:false,romanticRival:false,
    secretAffair:false,affairRefused:false,turncoatResolved:false,
    ending:null,lastContactDay:0,eventsSeen:[],storyChapter:0,humanFirstCount:0};
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
      introduced:!!old.introduced,
      hired:!!old.hired,
      assignedBusinessId:old.assignedBusinessId||null,
      rival:!!old.rival,
      profitStreak:Math.max(0,Math.floor(finite(old.profitStreak,0))),
      revealed:!!old.revealed,
      temptationSeen:!!old.temptationSeen,
      trapTriggered:!!old.trapTriggered,
      boundaryKept:!!old.boundaryKept,
      loyaltyTestPassed:!!old.loyaltyTestPassed,
      supportOnly:!!old.supportOnly,
      romanticRival:!!old.romanticRival,
      secretAffair:!!old.secretAffair,
      affairRefused:!!old.affairRefused,
      turncoatResolved:!!old.turncoatResolved,
      eventsSeen:Array.isArray(old.eventsSeen)?old.eventsSeen:[],
      storyChapter:clamp(Math.floor(finite(old.storyChapter,0)),0,(PERSONAL_STORIES[id]||[]).length),
      humanFirstCount:Math.max(0,Math.floor(finite(old.humanFirstCount,0))),
    });
  });
  state.profitableStreak=Math.max(0,Math.floor(finite(state.profitableStreak,0)));
  state.selectedId=IDS.includes(state.selectedId)?state.selectedId:null;
  state.rivalChapter=clamp(Math.floor(finite(state.rivalChapter,0)),0,3);
  state.lastEventDay=Math.max(0,Math.floor(finite(state.lastEventDay,0)));
  state.retaliationSeen=!!state.retaliationSeen;
  state.chaerinBoardSeen=!!state.chaerinBoardSeen;
  state.managementRisk=clamp(finite(state.managementRisk,0),0,100);
  state.managementCollapseSeen=!!state.managementCollapseSeen;
  if(!state.quartet||typeof state.quartet!=='object')state.quartet={chapter:0,synergy:40,governance:40,boundary:45,lastStoryDay:0};
  if(state.affairArcVersion!==2){
    state.affairArcVersion=2;
    state.quartet.chapter=0;
    state.quartet.route=null;
    state.quartet.ending=null;
    state.quartet.closed=null;
    state.quartet.accountability=0;
    IDS.forEach(id=>Object.assign(state.staff[id],{
      temptationSeen:false,boundaryKept:false,loyaltyTestPassed:false,supportOnly:false,romanticRival:false,
      secretAffair:false,affairRefused:false,turncoatResolved:false,ending:null,
    }));
  }
  state.quartet.chapter=clamp(Math.floor(finite(state.quartet.chapter,0)),0,QUARTET_CHAPTERS.length);
  state.quartet.synergy=clamp(finite(state.quartet.synergy,40),0,100);
  state.quartet.governance=clamp(finite(state.quartet.governance,40),0,100);
  state.quartet.boundary=clamp(finite(state.quartet.boundary,45),0,100);
  state.quartet.accountability=clamp(finite(state.quartet.accountability,0),0,100);
  state.quartet.route=['quartet_only','disclosure'].includes(state.quartet.route)?state.quartet.route:null;
  state.quartet.ending=state.quartet.ending&&typeof state.quartet.ending==='object'?state.quartet.ending:null;
  return state;
}
function profile(id){return PROFILES[id]||null;}
function staffState(life,id){return ensure(life).staff[id]||null;}
function prerequisiteComplete(life){
  const freedom=root.QT_FREEDOM_TRIO;
  return !!(freedom&&typeof freedom.storyComplete==='function'&&freedom.storyComplete(life));
}
function identity(life,id){
  const p=profile(id),s=p&&staffState(life,id);
  if(!p)return null;
  const revealAllowed=prerequisiteComplete(life)&&!!s.revealed;
  return{
    ...p,revealed:revealAllowed,introduced:!!s.introduced,hired:!!s.hired,rival:!!s.rival,
    displayName:revealAllowed?p.name:p.alias,
    listName:revealAllowed?p.name:p.hiddenName,
    portrait:revealAllowed?`./assets/characters/${p.portrait}`:null,
    bond:Math.round(s.bond),trust:Math.round(s.trust),
  };
}
function asCharacter(id){
  const p=profile(id);if(!p)return null;
  return{name:p.name,gender:p.gender,emoji:p.emoji,job:p.job,age:p.age,income:0,
    personality:p.personality,portrait:p.portrait,special:'business',moneyStyle:p.moneyStyle};
}
function ownedIds(businessState){
  return new Set(((businessState&&businessState.owned)||[]).map(item=>item.specialManagerId||item.managerId).filter(id=>IDS.includes(id)));
}
function chaerinAccess(life){
  const chaerin=(life.met||[]).find(person=>person.name==='한채린');
  const close=chaerin&&['friend','casual','partner','lover','polycule'].includes(chaerin.status);
  const shared=!!(life.dangerousTrioBond&&life.dangerousTrioBond.active)
    ||!!(life.relationshipGroup&&Array.isArray(life.relationshipGroup.members)&&life.relationshipGroup.members.some(member=>(typeof member==='string'?member:member&&member.name)==='한채린'));
  const faction=life.faction||{},businessCount=life.business&&Array.isArray(life.business.owned)?life.business.owned.length:0;
  const socialState=life.relationshipSocialState||{};
  // 한채린은 가장 빠른 소개 경로지만 유일한 문은 아니다. 독립 세력과
  // 여러 사업을 직접 키운 플레이어라면 업계가 먼저 책임자 후보를 보낸다.
  const independent=(faction.level||0)>=3
    ||businessCount>=4
    ||((faction.level||0)>=2&&businessCount>=2)
    ||socialState.factionAwareness>=65;
  return !!(close||shared||independent);
}
function introduce(life,id){
  const state=ensure(life),s=state.staff[id],p=profile(id);if(!s||!p)return null;
  if(!chaerinAccess(life)&&!s.introduced)return null;
  s.introduced=true;
  if(state.selectedId&&state.selectedId!==id)s.rival=true;
  return identity(life,id);
}
function recruit(life,id,businessId){
  const state=ensure(life),s=state.staff[id],p=profile(id);
  if(!s||!p)return{ok:false,message:'소개받지 못한 책임자입니다.'};
  if(!s.introduced)return{ok:false,message:'관련 사업·인물 사건에서 먼저 연결되어야 합니다.'};
  s.hired=true;s.assignedBusinessId=businessId||null;s.rival=true;
  return{ok:true,staffId:id,profile:p};
}
function activePartnerNames(life){
  const names=[];
  const add=name=>{if(name&&!names.includes(name))names.push(name);};
  if(life.partner)add(life.partner.name);
  (life.met||[]).filter(rec=>['partner','polycule','lover'].includes(rec.status)).forEach(rec=>add(rec.name));
  ((life.relationshipGroup&&life.relationshipGroup.members)||[]).forEach(member=>add(typeof member==='string'?member:member&&member.name));
  return names;
}
function canRomance(life,nameOrId){
  const state=ensure(life);
  const id=IDS.includes(nameOrId)?nameOrId:IDS.find(key=>PROFILES[key].name===nameOrId);
  const staff=id&&state.staff[id];
  const outside=activePartnerNames(life).some(name=>!IDS.some(key=>PROFILES[key].name===name));
  return !!(prerequisiteComplete(life)&&outside&&staff&&staff.hired&&staff.revealed&&staff.storyChapter>=3&&staff.secretAffair&&!staff.affairRefused);
}
function applyDecision(life,id,effects){
  const s=staffState(life,id);if(!s)return null;
  if(!s.hired)return null;
  const e=effects||{};
  const care=Math.max(0,finite(e.morale,0))+Math.max(0,finite(e.reputation,0))*.7;
  const harm=Math.max(0,-finite(e.morale,0))+Math.max(0,-finite(e.reputation,0))*.6;
  s.bond=clamp(s.bond+Math.round(2+care*.65-harm*.45),0,100);
  s.trust=clamp(s.trust+Math.round(care*.35-harm*.55),0,100);
  if(care>=3)s.humanFirstCount=(s.humanFirstCount||0)+1;
  return{bond:s.bond,trust:s.trust};
}
function event(type,id,day){return{businessRomanceEvent:true,kind:type,staffId:id,day};}
function nextPersonal(life,ctx){
  const state=ensure(life);
  for(const id of IDS){
    const s=state.staff[id],rec=(ctx.met||[]).find(person=>person.name===PROFILES[id].name);
    const story=(PERSONAL_STORIES[id]||[])[s.storyChapter||0];
    if(!story||!s.hired||!s.revealed||!rec||rec.status==='ex')continue;
    const index=s.storyChapter||0,affectionGate=[40,58,72][index]||story.minAffection,trustGate=[20,35,50][index]||story.minTrust;
    if((rec.affection||0)>=Math.max(story.minAffection,affectionGate)&&(rec.trust||0)>=Math.max(story.minTrust,trustGate)){
      return{businessRomanceEvent:true,kind:'personal-story',staffId:id,eventId:story.id,day:ctx.day};
    }
  }
  return null;
}
function relationshipContext(life,partnerNames){
  const names=(Array.isArray(partnerNames)&&partnerNames.length?partnerNames:activePartnerNames(life)).filter(Boolean);
  const outsideNames=names.filter(name=>!IDS.some(id=>PROFILES[id].name===name));
  return{
    names,
    outsideNames,
    hasExisting:outsideNames.length>0,
    dangerousShared:!!(life.dangerousTrioBond&&life.dangerousTrioBond.active),
    freedomShared:!!(life.freedomTrioBond&&life.freedomTrioBond.active),
  };
}
function nextTurncoatOffer(life,ctx){
  const state=ensure(life),relations=relationshipContext(life,ctx.partnerNames);
  if(!relations.hasExisting)return null;
  const secret=IDS.filter(id=>state.staff[id].secretAffair&&!state.staff[id].affairRefused&&!state.staff[id].turncoatResolved);
  if(secret.length!==1)return null;
  const id=secret[0],staff=state.staff[id],record=(ctx.met||[]).find(person=>person.name===PROFILES[id].name);
  const item=((ctx.businessState&&ctx.businessState.owned)||[]).find(row=>(row.specialManagerId||row.managerId)===id);
  if(!record||['ex','deceased'].includes(record.status)||!item||staff.storyChapter<3||item.level<3||
    (item.totalProfit||0)<15000000||(record.affection||0)<72||(record.trust||0)<42)return null;
  return{businessRomanceEvent:true,kind:'turncoat-offer',staffId:id,currentPartners:relations.outsideNames,day:ctx.day};
}
function nextQuartetChapter(life,ctx,allOwned){
  const state=ensure(life),q=state.quartet,relations=relationshipContext(life,ctx.partnerNames);
  const owned=(ctx.businessState&&ctx.businessState.owned)||[];
  const totalProfit=owned.reduce((sum,item)=>sum+(item.totalProfit||0),0);
  const profitable=owned.filter(item=>(item.lastNet||0)>0).length;
  const stable=owned.length>=4&&owned.filter(item=>(item.level||1)>=2).length>=3&&profitable>=3&&totalProfit>=15000000;
  if((!relations.hasExisting&&!q.route)||!stable||!allOwned||!IDS.every(id=>{
    const staff=state.staff[id];
    return staff.revealed&&staff.storyChapter>=1&&staff.secretAffair&&!staff.affairRefused;
  }))return null;
  const records=IDS.map(id=>(ctx.met||[]).find(person=>person.name===PROFILES[id].name));
  if(records.some(rec=>!rec||['ex','deceased'].includes(rec.status)))return null;
  let index=q.chapter||0;
  let chapter=QUARTET_CHAPTERS[index];
  if(q.route==='quartet_only'&&chapter&&chapter.requiresRoute==='disclosure'){
    index=QUARTET_CHAPTERS.findIndex(item=>item.id==='final_audit');
    q.chapter=index;
    chapter=QUARTET_CHAPTERS[index];
  }
  if(!chapter||chapter.requiresRoute&&chapter.requiresRoute!==q.route)return null;
  if(index===1&&totalProfit<25000000)return null;
  if(index===2&&records.some(rec=>(rec.affection||0)<42||(rec.trust||0)<20))return null;
  if(index===3&&IDS.some(id=>state.staff[id].storyChapter<2))return null;
  if(index===4&&(((ctx.businessState&&ctx.businessState.owned)||[]).length<8||IDS.some(id=>state.staff[id].storyChapter<3)))return null;
  return{businessRomanceEvent:true,kind:'quartet-story',chapterId:chapter.id,day:ctx.day};
}
function monthly(life,context){
  const state=ensure(life),ctx=context||{},day=Math.max(1,Math.floor(finite(ctx.day,1)));
  const owned=ownedIds(ctx.businessState);
  IDS.forEach(id=>{
    if(!owned.has(id))return;
    const s=state.staff[id],item=((ctx.businessState&&ctx.businessState.owned)||[]).find(x=>x.managerId===id);
    if(item&&item.lastNet>0){
      s.bond=clamp(s.bond+2+Math.min(3,Math.max(0,finite(item.level,1)-1)),0,100);
      s.trust=clamp(s.trust+(item.reputation>=60?1:0),0,100);
    }else if(item&&item.lastNet<0)s.bond=clamp(s.bond-1,0,100);
  });
  IDS.forEach(id=>{
    const s=state.staff[id],item=((ctx.businessState&&ctx.businessState.owned)||[]).find(x=>(x.specialManagerId||x.managerId)===id);
    s.profitStreak=item&&item.lastNet>0?Math.max(0,finite(s.profitStreak,0))+1:0;
  });
  if(!prerequisiteComplete(life))return null;
  resolveUnavailable(life);
  if(day-state.lastEventDay<1)return null;
  const hiredCount=IDS.filter(id=>state.staff[id].hired).length;
  const revealedCount=IDS.filter(id=>state.staff[id].revealed).length;
  if(hiredCount>=3&&!state.retaliationSeen&&ctx.rivalName){
    state.retaliationSeen=true;state.lastEventDay=day;
    return{businessRomanceEvent:true,kind:'market-retaliation',rivalName:ctx.rivalName,day};
  }
  if(revealedCount>=2&&!state.chaerinBoardSeen&&!(ctx.partnerNames||[]).length){
    state.chaerinBoardSeen=true;state.lastEventDay=day;
    return{businessRomanceEvent:true,kind:'chaerin-board',day};
  }

  const relations=relationshipContext(life,ctx.partnerNames);
  const partnerNames=relations.names,businessPartners=partnerNames.filter(name=>IDS.some(id=>PROFILES[id].name===name));
  const romanticRivals=IDS.filter(id=>state.staff[id].secretAffair).length;
  const struggling=((ctx.businessState&&ctx.businessState.owned)||[]).filter(item=>item.lastNet<0||item.reputation<32||item.morale<32);
  if(!state.managementCollapseSeen&&romanticRivals>=2&&(state.managementRisk>=45||struggling.length>=2)){
    state.managementCollapseSeen=true;state.lastEventDay=day;
    return{businessRomanceEvent:true,kind:'management-collapse',day,struggling:struggling.map(item=>item.id)};
  }
  if(relations.hasExisting){
    const target=IDS.find(id=>{
      const s=state.staff[id],item=((ctx.businessState&&ctx.businessState.owned)||[]).find(x=>(x.specialManagerId||x.managerId)===id);
      return !businessPartners.includes(PROFILES[id].name)&&item&&item.months>=4&&s.hired&&s.revealed&&
        s.storyChapter>=1&&s.bond>=20&&!s.temptationSeen&&!s.affairRefused;
    });
    if(target){
      state.staff[target].temptationSeen=true;
      state.staff[target].lastContactDay=day;
      state.lastEventDay=day;
      return{...event('temptation',target,day),currentPartner:relations.outsideNames[0],currentPartners:relations.outsideNames,
        existingGroup:relations.outsideNames.length>1||relations.dangerousShared||relations.freedomShared};
    }
  }

  const revealTarget=IDS.find(id=>{
    const s=state.staff[id],item=((ctx.businessState&&ctx.businessState.owned)||[]).find(x=>(x.specialManagerId||x.managerId)===id);
    return item&&s.hired&&!s.revealed&&!s.supportOnly&&(s.profitStreak||0)>=2&&s.bond>=12&&(s.humanFirstCount||0)>=1;
  });
  if(revealTarget){
      state.lastEventDay=day;
      return event('reveal',revealTarget,day);
  }

  const personalEvent=nextPersonal(life,{...ctx,day});
  if(personalEvent){state.lastEventDay=day;return personalEvent;}

  const turncoatEvent=nextTurncoatOffer(life,{...ctx,day});
  if(turncoatEvent){state.lastEventDay=day;return turncoatEvent;}

  const quartetEvent=nextQuartetChapter(life,{...ctx,day},IDS.every(id=>owned.has(id)));
  if(quartetEvent){state.lastEventDay=day;return quartetEvent;}

  return null;
}
function releaseReservation(life,payload){
  if(!payload||!payload.businessRomanceEvent)return ensure(life);
  const state=ensure(life),staff=payload.staffId&&state.staff[payload.staffId];
  if(payload.kind==='market-retaliation')state.retaliationSeen=false;
  if(payload.kind==='chaerin-board')state.chaerinBoardSeen=false;
  if(payload.kind==='management-collapse')state.managementCollapseSeen=false;
  if(payload.kind==='temptation'&&staff){
    staff.temptationSeen=false;
    if(staff.lastContactDay===payload.day)staff.lastContactDay=0;
  }
  if(state.lastEventDay===payload.day)state.lastEventDay=Math.max(0,(payload.day||1)-1);
  return state;
}
function view(life,payload,capital){
  if(!payload||!payload.businessRomanceEvent)return null;
  const state=ensure(life);
  if(payload.kind==='market-retaliation')return{
    kind:payload.kind,icon:'📉',title:`${payload.rivalName} · 네 사람을 향한 경제 보복`,
    desc:'경쟁 세력은 네 책임자를 정면으로 이길 수 없다고 판단했습니다. 유통에는 덤핑, 콘텐츠에는 악성 여론, 계약에는 허위 감사, 현장에는 인력 스카우트를 동시에 걸었습니다. 네 사람은 공격받은 부서만 살릴지, 상대의 자금줄까지 끊을지 결정을 기다립니다.',
    line:'“대표님, 이건 사업 보고가 아니라 선전포고예요. 어느 수준까지 되갚을지만 정해 주세요.”',
    portrait:'./assets/event-business-quartet-crisis.png',
    choices:[
      {id:'shield',text:'직원과 거래처를 먼저 보호한다',preview:'현금 -400만 · 신뢰·경계 상승 · 공격 피해 차단'},
      {id:'counter',text:'네 사업의 자료를 합쳐 상대 자금줄을 역공한다',preview:'현금 -200만 · 시너지 상승 · 경쟁 세력 압박'},
    ],
  };
  if(payload.kind==='chaerin-board')return{
    kind:payload.kind,icon:'👑',title:'한채린 · 사람을 사는 방식',
    desc:'한채린 쪽 투자회사가 네 책임자에게 차례로 거액의 스카우트 계약을 보냈습니다. 채린은 이사회에 직접 모습을 드러내지 않고 화면과 비서실만으로 답을 기다립니다. 아직 서로 모르는 사이라면 여기서는 이름과 방식만 확인할 뿐, 개인적인 인연은 생기지 않습니다.',
    line:'“유능한 사람 넷을 고용해 놓고 아무도 소유하지 않았네. 그래서 더 마음에 안 들어. 저 사람들은 돈이 아니라 너 때문에 남았잖아.”',
    portrait:'./assets/event-chaerin-contract.png',
    dialogues:[
      ['박지수','연봉은 감사하지만 대표를 바꿀 생각은 없습니다.'],
      ['한이슬','사람을 작품처럼 수집하는 취미면 난 사양할게.'],
      ['차서윤','제 계약에는 소유권 이전 조항이 없습니다.'],
      ['오혜린','대표님이 아니라 직원들을 두고 갈 수 없어요.'],
      ['한채린','…넷 다 정말 비효율적으로 충성하네.'],
    ],
    choices:[
      {id:'seat',text:'채린에게 투자자 자리는 주되 인사권은 주지 않는다',preview:'자금 협력 · 네 사람의 독립성 보장'},
      {id:'refuse',text:'“사람 값도 구분 못 하면 투자하지 마”라며 계약서를 돌려준다',preview:'네 사람의 신뢰 크게 상승 · 채린의 호감과 경쟁심 상승'},
    ],
  };
  if(payload.kind==='quartet-story'){
    const chapter=QUARTET_CHAPTERS.find(item=>item.id===payload.chapterId);
    if(!chapter)return null;
    return{kind:payload.kind,icon:chapter.icon,title:chapter.title,desc:chapter.desc,line:'네 사람의 이해관계가 하나의 안건 위에서 충돌합니다.',
      portrait:chapter.scene,dialogues:chapter.dialogues,choices:chapter.choices.map(choice=>({id:choice.id,text:choice.text,preview:choice.preview})),
      meta:`업무 시너지 ${Math.round(state.quartet.synergy)} · 공동 의사결정 ${Math.round(state.quartet.governance)} · 공과 사 경계 ${Math.round(state.quartet.boundary)} · 책임 인정 ${Math.round(state.quartet.accountability)}`};
  }
  if(payload.kind==='quartet-ending'){
    return{
      kind:payload.kind,icon:'🏢',title:'네 개의 명함, 경쟁 협약',
      desc:'이전 저장에서 대기 중이던 공동 이사회 사건입니다. 연애 합류 대신 네 회사의 경쟁 규칙을 정하는 업계 협약으로 전환됩니다.',
      line:'“사적인 경쟁은 끝내지 않아요. 대신 직원과 회사를 볼모로 삼지는 말죠.”',
      portrait:'./assets/event-business-quartet-afterhours.png',
      meta:`업무 시너지 ${Math.round(state.quartet.synergy)} · 공동 의사결정 ${Math.round(state.quartet.governance)} · 공과 사 경계 ${Math.round(state.quartet.boundary)}`,
      choices:[
        {id:'accept',text:'🤝 공정 경쟁 협약을 맺는다',preview:'연애 관계 변화 없음 · 업계 경쟁 사건으로 전환'},
        {id:'wait',text:'📋 각자 경쟁하게 둔다',preview:'연애 관계 변화 없음'},
      ],
    };
  }
  if(payload.kind==='management-collapse')return{
    kind:payload.kind,icon:'📉',title:'BAD END 분기 · 대표가 비운 결재석',
    desc:'네 책임자와의 사적인 경쟁에 정신이 팔린 사이 적자 사업의 보고, 직원 이탈, 계약 갱신이 한꺼번에 밀렸습니다. 네 사람은 플레이어의 여성편력을 문제 삼지 않습니다. 대신 대표가 사업을 방치한 책임만큼은 대신 져주지 않습니다.',
    line:'“누구와 만나든 대표님 사생활이죠. 하지만 결재하지 않은 손실까지 우리 사랑 탓으로 돌리지는 마세요.”',
    portrait:'./assets/event-business-quartet-crisis.png',
    dialogues:[
      ['박지수','재고 손실 보고가 세 번 밀렸어요. 누구와 잤는지는 관심 없지만 이 결재는 대표님 일입니다.'],
      ['한이슬','나랑 놀 시간은 있었으면서 납품 일정은 안 봤네. 재미와 무책임은 다른 거야.'],
      ['차서윤','사생활은 계약 대상이 아닙니다. 방치한 손해와 대표 권한은 정확히 정산하죠.'],
      ['오혜린','직원들이 쓰러지기 전에 멈춰 달라고 했어요. 이번에는 우리가 사람부터 데리고 나갈게요.'],
    ],
    meta:`경영 위험 ${Math.round(state.managementRisk)}/100 · 위험 사업 ${(payload.struggling||[]).length}곳`,
    choices:[
      {id:'restructure',text:'💰 사재를 투입하고 네 사람에게 구조조정 권한을 맡긴다',preview:'큰 비용 · 경영권 유지 · 사업관리 실패 회피'},
      {id:'romance_first',text:'🥀 누군가 알아서 수습할 거라며 사적인 경쟁을 계속한다',preview:'사업관리 실패 배드엔딩 · 공동 경영권 상실'},
    ],
  };
  const p=profile(payload.staffId),s=p&&staffState(life,payload.staffId),who=p&&identity(life,payload.staffId);
  if(!p||!s)return null;
  if(payload.kind==='personal-story'){
    const story=(PERSONAL_STORIES[p.id]||[]).find(item=>item.id===payload.eventId);
    if(!story)return null;
    return{kind:payload.kind,profile:p,identity:who,icon:story.icon,title:`${p.name} · ${story.title}`,desc:story.desc,line:story.line,
      portrait:story.scene||p.scene,choices:story.choices.map(choice=>({id:choice.id,text:choice.text,preview:choice.preview})),
      meta:`개인 업무 이야기 ${(s.storyChapter||0)+1}/${(PERSONAL_STORIES[p.id]||[]).length} · 업무 신뢰 ${Math.round(s.bond)} · 개인 신뢰 ${Math.round(s.trust)}`};
  }
  if(payload.kind==='temptation')return{
    kind:payload.kind,profile:p,identity:who,icon:'🌒',title:`${who.displayName}의 선을 넘는 제안`,
    desc:`${(payload.currentPartners||[payload.currentPartner]).filter(Boolean).join(' · ')||'현재 연인'}과의 관계를 알면서도, ${who.displayName}은 헤어지라는 말 없이 자기만 아는 시간을 만들자고 합니다. 거절해도 담당 사업과 전문적인 관계는 유지되지만, 받아들이는 순간부터 이것은 검증이 아니라 실제 비밀 관계가 됩니다.`,
    line:p.temptation,portrait:p.scene,
    choices:[
      {id:'boundary',text:'🧱 사적인 제안을 거절하고 업무 관계만 남긴다',preview:'현재 관계 유지 · 이 인물과 연애 분기 종료 · 매니저 역할 유지'},
      {id:'meet',text:`🌒 ${who.displayName}과 비밀 약속을 잡는다`,preview:'기존 관계에 알리지 않음 · 비밀 관계 시작 · 경영 위험 상승'},
    ],
  };
  if(payload.kind==='turncoat-offer'){
    const variants={
      office:{title:'박지수 · 집으로 돌아가기 전의 고백',line:'“오늘은 여기서 자지 마요. 먼저 돌아가서 전부 말하고, 끝낼 관계를 당신 입으로 끝낸 뒤에 다시 와요.”'},
      creative:{title:'한이슬 · 도망칠 수 없는 다음 장면',line:'“비밀일 땐 재밌었어. 근데 진짜 나를 고를 거면, 카메라 꺼진 뒤 사람들한테도 같은 말을 해야 해.”'},
      corporate:{title:'차서윤 · 공개 조항이 붙은 전향 계약',line:'“기존 관계 해소와 외도 사실 고지는 선행 조건입니다. 숨긴 채 저를 선택하는 계약에는 서명하지 않겠습니다.”'},
      medical:{title:'오혜린 · 죄책감을 돌려주는 밤',line:'“제가 대신 말해 주면 또 누군가를 보호한다는 핑계가 돼요. 직접 사과하고 돌아오면, 그때 제 대답을 드릴게요.”'},
    };
    const variant=variants[p.id];
    return{
      kind:payload.kind,profile:p,identity:who,icon:'🪪',title:variant.title,
      desc:`비밀 관계가 깊어지자 ${p.name}은 더는 숨겨진 두 번째 자리를 받아들이지 않겠다고 말합니다. ${payload.currentPartners.join(' · ')}에게 외도 사실을 직접 인정하고 관계를 끝낸 뒤 자신을 공개적으로 선택할지, 비밀을 계속할지, 지금 여기서 관계를 접을지 정해야 합니다.`,
      line:variant.line,portrait:p.scene,
      choices:[
        {id:'confess_and_leave',text:`기존 관계에 전부 고백하고 헤어진 뒤 ${p.name}을 선택한다`,preview:'기존 관계 전원 종료 · 한 사람과 공개 연애 시작'},
        {id:'keep_secret',text:'아무에게도 말하지 않고 지금처럼 만나자고 한다',preview:'이중장부 배드엔딩'},
        {id:'end_affair',text:'비밀 관계를 끝내고 다시 업무 동료로 남는다',preview:'현재 관계 유지 · 이 인물의 연애 분기 종료'},
      ],
    };
  }
  if(payload.kind==='reveal')return{
    kind:payload.kind,profile:p,identity:who,icon:'📇',title:`${p.name}의 개인 연락망`,
    desc:'사업 위기에서 당신은 실적보다 책임자와 직원의 안전을 먼저 지켰고, 그 뒤에도 흑자를 이어 냈습니다. 늘 카메라 밖과 가린 얼굴로 보고하던 책임자가 처음으로 직급표를 내려놓고 본명과 얼굴을 보여 줍니다.',
    line:p.revealLine,
    portrait:p.scene,
    choices:[
      {id:'meet',text:'📱 개인 연락처를 교환하되 업무와 사생활의 선을 정한다',preview:'친구와 연락처에 추가 · 연애는 아직 열리지 않음'},
      {id:'postpone',text:'📅 아직은 업무용 연락만 유지한다',preview:'개인 연락을 미룸 · 흑자를 이어가면 다시 가능'},
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
  if(payload.kind==='market-retaliation'){
    if(choiceId==='shield'){
      state.quartet.governance=clamp(state.quartet.governance+10,0,100);state.quartet.boundary=clamp(state.quartet.boundary+8,0,100);
      return{ok:true,done:true,groupStory:true,rivalCounter:true,rivalName:payload.rivalName,cash:-4000000,affectionEach:3,trustEach:8,text:'네 사람은 핵심 직원과 거래처를 분산 보호했습니다. 상대는 사람을 빼내지 못했고 공격 비용만 떠안았습니다.',tone:'good'};
    }
    if(choiceId==='counter'){
      state.quartet.synergy=clamp(state.quartet.synergy+14,0,100);state.quartet.governance=clamp(state.quartet.governance+5,0,100);
      return{ok:true,done:true,groupStory:true,rivalCounter:true,rivalName:payload.rivalName,cash:-2000000,affectionEach:5,trustEach:5,text:'네 사업의 계약·고객·현장 자료가 하나의 역공 보고서가 됐습니다. 상대의 차명 자금줄과 허위 여론 계정이 동시에 드러났습니다.',tone:'good'};
    }
  }
  if(payload.kind==='chaerin-board'){
    if(choiceId==='seat'){
      state.quartet.synergy=clamp(state.quartet.synergy+8,0,100);state.quartet.governance=clamp(state.quartet.governance+10,0,100);
      return{ok:true,done:true,groupStory:true,chaerinCross:true,cash:5000000,affectionEach:3,trustEach:7,text:'채린은 인사권 없는 투자 계약에 서명했습니다. 네 책임자는 자리를 지켰고, 채린은 처음으로 돈을 대고도 사람을 명령하지 못했습니다.',tone:'good'};
    }
    if(choiceId==='refuse'){
      state.quartet.boundary=clamp(state.quartet.boundary+14,0,100);
      return{ok:true,done:true,groupStory:true,chaerinCross:true,affectionEach:5,trustEach:10,text:'네 사람은 아무 말 없이 사직서를 찢었습니다. 채린은 모욕당한 얼굴로 웃으며 “그 충성, 얼마까지 가는지 보자”고 다음 경쟁을 예고했습니다.',tone:'good'};
    }
  }
  if(payload.kind==='quartet-story'){
    const chapter=QUARTET_CHAPTERS.find(item=>item.id===payload.chapterId),choice=chapter&&chapter.choices.find(item=>item.id===choiceId);
    if(!chapter||!choice)return{ok:false,message:'이사회 이야기를 찾지 못했습니다.'};
    const e=choice.effects||{},q=state.quartet;
    q.synergy=clamp(q.synergy+finite(e.synergy,0),0,100);
    q.governance=clamp(q.governance+finite(e.governance,0),0,100);
    q.boundary=clamp(q.boundary+finite(e.boundary,0),0,100);
    q.accountability=clamp(q.accountability+finite(e.accountability,0),0,100);
    if(choice.badEnding){
      const endingKey={double_ledger:'pure_affair',secret_consortium:'secret_consortium',hostile_buyout:'hostile_buyout',audit_refusal:'cohabitation_refusal'}[choice.badEnding];
      const ending=romanceEnding(endingKey);
      q.ending={id:choice.badEnding,day:payload.day||1,bad:true};
      if(root.QT_ROMANCE_ROUTES)root.QT_ROMANCE_ROUTES.complete(life,'business',choice.badEnding,'bad');
      return{ok:true,done:true,badEnding:true,businessRouteBadEnding:true,businessCollapse:true,title:ending.title,
        text:`${choice.outcome} ${ending.text}`,tone:'bad',meta:ending.detail};
    }
    if(choice.route)q.route=choice.route;
    if(root.QT_ROMANCE_ROUTES&&q.chapter===0)root.QT_ROMANCE_ROUTES.engage(life,'business','affair_audit_opened');
    q.chapter=Math.max(q.chapter,QUARTET_CHAPTERS.indexOf(chapter)+1);q.lastStoryDay=payload.day||1;
    const quartetComplete=!!choice.complete;
    if(quartetComplete){
      q.chapter=QUARTET_CHAPTERS.length;
      q.ending={id:'affair_audit_complete',day:payload.day||1,route:q.route};
      if(root.QT_ROMANCE_ROUTES)root.QT_ROMANCE_ROUTES.complete(life,'business','affair_audit_complete','good');
    }
    return{ok:true,done:true,groupStory:true,quartet:quartetComplete,title:chapter.title,text:choice.outcome,cash:Math.round(finite(e.cash,0)),
      affectionEach:finite(e.affectionEach,0),trustEach:finite(e.trustEach,0),breakupAll:choice.route==='quartet_only',tone:'good',
      meta:`업무 시너지 ${Math.round(q.synergy)} · 공동 의사결정 ${Math.round(q.governance)} · 공과 사 경계 ${Math.round(q.boundary)} · 책임 인정 ${Math.round(q.accountability)}`};
  }
  if(payload.kind==='quartet-ending'){
    if(choiceId==='accept'){
      state.quartetEnding={id:'industry_competition_pact',day:payload.day||1};
      return{ok:true,done:true,industryAlliance:true,title:'네 개의 명함',text:'네 사람은 연애 경쟁을 멈추지 않았지만 직원과 사업체를 공격 수단으로 쓰지 않는다는 협약에는 서명했습니다.'};
    }
    state.lastEventDay=Math.max(0,(payload.day||1)-2);
    return{ok:true,done:true,text:'네 사람과 동업 관계를 유지했습니다. 마음이 같다면 다음 흑자 보고 뒤에 다시 이야기가 나올 수 있습니다.'};
  }
  if(payload.kind==='management-collapse'){
    if(choiceId==='restructure'){
      const cost=12000000+Math.max(0,(payload.struggling||[]).length-1)*4000000;
      state.managementRisk=clamp(state.managementRisk-32,0,100);
      state.quartet.governance=clamp(state.quartet.governance+14,0,100);
      state.quartet.boundary=clamp(state.quartet.boundary+10,0,100);
      return{ok:true,done:true,managementRescue:true,cash:-cost,text:'네 사람은 각자 유통·제작·계약·현장을 나눠 수습했습니다. 플레이어는 사재를 투입하고 밀린 결재를 직접 처리해 대표 자리를 지켰습니다.',tone:'good',
        meta:`경영 위험 ${Math.round(state.managementRisk)}/100 · 공동 의사결정 ${Math.round(state.quartet.governance)}`};
    }
    if(choiceId==='romance_first'){
      state.quartetEnding={id:'management_failure',day:payload.day||1};
      state.managementRisk=100;
      if(root.QT_ROMANCE_ROUTES)root.QT_ROMANCE_ROUTES.complete(life,'business','management_failure','bad');
      return{ok:true,done:true,badEnding:true,managementBadEnding:true,businessCollapse:true,title:'네 개의 사직서와 빈 대표실',
        text:'네 사람은 서로를 탓하지 않고 각자 담당 사업의 직원과 거래처부터 살렸습니다. 마지막 공동 결재는 플레이어의 대표 권한을 회수하는 안건이었습니다. 여성편력이 아니라, 누구도 사업을 관리하지 않은 결과로 모든 공동 경영권을 잃었습니다.',tone:'bad'};
    }
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
      meta:`${p.name} 개인 이야기 ${s.storyChapter}/${(PERSONAL_STORIES[p.id]||[]).length} · 업무 신뢰 ${Math.round(s.bond)}`};
  }
  if(payload.kind==='temptation'){
    if(choiceId==='boundary'){
      s.boundaryKept=true;s.loyaltyTestPassed=false;s.supportOnly=true;s.affairRefused=true;s.secretAffair=false;s.romanticRival=false;
      s.bond=clamp(s.bond+10,0,100);s.trust=clamp(s.trust+14,0,100);
      state.managementRisk=clamp(state.managementRisk-6,0,100);
      return{ok:true,done:true,rivalRefused:true,loyaltyTest:false,staffId:p.id,currentPartner:payload.currentPartner,
        text:`${p.boundary} ${p.name}은 거절을 시험으로 포장하지 않았습니다. 사적인 연락은 여기서 끝내고, 담당 사업의 권한과 책임은 그대로 지킵니다.`,tone:'good'};
    }
    if(choiceId==='meet'){
      s.bond=clamp(s.bond+12,0,100);s.trust=clamp(s.trust+8,0,100);s.romanticRival=true;s.secretAffair=true;s.affairRefused=false;s.supportOnly=false;
      s.revealed=true;s.revealDay=payload.day||1;
      if(root.QT_ROMANCE_ROUTES&&IDS.every(id=>state.staff[id].revealed)&&relationshipContext(life).hasExisting)root.QT_ROMANCE_ROUTES.engage(life,'business','affair_candidate_revealed');
      state.managementRisk=clamp(state.managementRisk+18,0,100);
      return{ok:true,done:true,businessSuitor:true,secretAffair:true,revealed:true,staffId:p.id,currentPartner:payload.currentPartner,
        character:asCharacter(p.id),affection:36,trust:Math.max(18,s.trust),title:'대표실 밖의 경쟁 후보',
        text:`${p.name}은 기존 연인과 헤어지라고 요구하지 않았습니다. 대신 이 약속을 당분간 누구에게도 말하지 말자고 했습니다. 두 사람 모두 이것이 실수나 검증이 아닌 비밀 관계라는 사실을 알고 있습니다.`,tone:'neutral',
        meta:`경영 위험 ${Math.round(state.managementRisk)}/100 · 비밀 관계 1건`};
    }
  }
  if(payload.kind==='turncoat-offer'){
    if(choiceId==='confess_and_leave'){
      s.turncoatResolved=true;s.secretAffair=false;s.romanticRival=false;
      s.ending={id:`${p.id}_turncoat`,day:payload.day||1};
      return{ok:true,done:true,turncoat:true,breakupAll:true,staffId:p.id,character:asCharacter(p.id),
        affection:82,trust:58,title:`${p.name} · 숨기지 않는 두 번째 시작`,
        text:`플레이어는 ${payload.currentPartners.join(' · ')}에게 외도 사실을 인정하고 관계를 끝냈습니다. ${p.name}은 그 상처를 승리처럼 여기지 않았고, 모든 정리가 끝난 뒤에야 공개된 연인이 되었습니다.`,tone:'neutral'};
    }
    if(choiceId==='keep_secret'){
      const ending=romanceEnding('pure_affair');
      s.turncoatResolved=true;
      return{ok:true,done:true,badEnding:true,businessRouteBadEnding:true,businessCollapse:true,title:ending.title,text:ending.text,tone:'bad',meta:ending.detail};
    }
    if(choiceId==='end_affair'){
      s.turncoatResolved=true;s.secretAffair=false;s.romanticRival=false;s.affairRefused=true;s.supportOnly=true;s.boundaryKept=true;
      state.managementRisk=clamp(state.managementRisk-10,0,100);
      return{ok:true,done:true,rivalRefused:true,loyaltyTest:false,staffId:p.id,currentPartner:payload.currentPartners[0],
        text:`${p.name}과의 비밀 관계는 끝났습니다. 두 사람은 감정을 인사평가나 사업권에 섞지 않고 다시 공개된 업무 동료로 남았습니다.`,tone:'neutral'};
    }
  }
  if(payload.kind==='reveal'){
    if(choiceId==='meet'){
      s.revealed=true;s.revealDay=payload.day||1;s.bond=clamp(s.bond+12,0,100);s.trust=clamp(s.trust+10,0,100);
      if(root.QT_ROMANCE_ROUTES&&IDS.every(id=>state.staff[id].revealed)&&relationshipContext(life).hasExisting)root.QT_ROMANCE_ROUTES.engage(life,'business','affair_candidate_revealed');
      return{ok:true,done:true,revealed:true,character:asCharacter(p.id),affection:Math.max(10,Math.round(s.bond*.28)),trust:Math.max(12,Math.round(s.trust)),text:`${p.name}의 개인 연락처가 저장됐습니다. 당분간은 친구로 만나며 세 번의 개인 업무 이야기를 거쳐야 연애 가능성이 열립니다.`,tone:'good'};
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
  return IDS.map(id=>state.staff[id].ending&&`${PROFILES[id].emoji} ${PROFILES[id].name} 순애 엔딩`).filter(Boolean).join(' · ');
}
function progressSummary(life){
  const state=ensure(life),q=state.quartet;
  const personal=IDS.reduce((sum,id)=>sum+(state.staff[id].storyChapter||0),0);
  return{personal,total:IDS.length*3,chapter:state.rivalChapter,chapters:3,
    synergy:Math.round(q.synergy),governance:Math.round(q.governance),boundary:Math.round(q.boundary)};
}
function storyComplete(life){
  const state=ensure(life);
  return !!state.quartet.closed||!!state.quartet.ending;
}
function resolveUnavailable(life){
  const state=ensure(life);
  if(state.quartet.closed||state.quartet.ending)return false;
  const relations=relationshipContext(life);
  const rows=IDS.map(id=>{
    const staff=state.staff[id],person=(life.met||[]).find(rec=>rec.name===PROFILES[id].name);
    const unavailable=!!staff.supportOnly||!!(person&&['ex','deceased'].includes(person.status));
    const resolved=unavailable||(staff.storyChapter||0)>=(PERSONAL_STORIES[id]||[]).length;
    return{staff,person,unavailable,resolved};
  });
  if(!rows.every(row=>row.staff.introduced&&row.staff.hired&&row.resolved))return false;
  if(IDS.some(id=>state.staff[id].secretAffair))return false;
  if(relations.hasExisting&&!IDS.every(id=>state.staff[id].temptationSeen||state.staff[id].affairRefused))return false;
  state.quartet.closed={id:'professional_alliance',day:life.day||0};
  return true;
}
function confessionReady(life){
  const routes=root.QT_ROMANCE_ROUTES;
  const state=ensure(life);
  return !!(state.quartet.ending&&state.quartet.ending.id==='affair_audit_complete')&&
    ['quartet_only','disclosure'].includes(state.quartet.route)&&(!routes||routes.romanceAvailable(life,'business'));
}

root.QT_BUSINESS_ROMANCE={PROFILES,ROMANCE_ENDINGS,romanceEnding,PERSONAL_STORIES,QUARTET_CHAPTERS,IDS,ensure,profile,staffState,identity,asCharacter,ownedIds,prerequisiteComplete,chaerinAccess,introduce,recruit,canRomance,applyDecision,monthly,releaseReservation,view,resolve,endingSummary,progressSummary,storyComplete,resolveUnavailable,confessionReady,activePartnerNames};
})(window);
