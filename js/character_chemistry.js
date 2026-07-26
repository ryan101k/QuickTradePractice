/* QuickTrade Life — 다중 관계 생활 피로와 캐릭터별 캐미 사건
 * 관계·장소·수치·쿨다운을 먼저 검사하고, 본편 장을 건드리지 않는
 * 짧은 생활 사건만 월말 중요 사건 큐에 넘긴다. */
(function(root){
'use strict';

const VERSION=1;
const DANGEROUS=['강유진','한채린','윤세라'];
const FREEDOM=['채원','유나','소희'];
const BUSINESS=['박지수','한이슬','차서윤','오혜린'];
const BLOCKED=new Set(['ex','deceased','dead']);
const PARTNER=new Set(['partner','lover','polycule']);
const CONTACT=new Set(['acquaintance','friend','casual','partner','lover','polycule']);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const record=(life,name)=>(life.met||[]).find(person=>person.name===name)||null;

function relationshipNames(life){
  if(root.QT_RELATIONSHIPS&&typeof root.QT_RELATIONSHIPS.names==='function')return root.QT_RELATIONSHIPS.names(life);
  const names=[];
  const add=name=>{if(name&&!names.includes(name))names.push(name);};
  if(life.partner)add(life.partner.name);
  (life.met||[]).filter(person=>PARTNER.has(person.status)).forEach(person=>add(person.name));
  ((life.relationshipGroup&&life.relationshipGroup.members)||[]).forEach(member=>add(typeof member==='string'?member:member&&member.name));
  return names;
}
function isPartner(life,name){
  if(root.QT_RELATIONSHIPS&&typeof root.QT_RELATIONSHIPS.isPartner==='function')return root.QT_RELATIONSHIPS.isPartner(life,name);
  const person=record(life,name);
  return relationshipNames(life).includes(name)||!!(person&&PARTNER.has(person.status));
}
function available(life,name){
  const person=record(life,name);
  return !!person&&!BLOCKED.has(person.status)&&CONTACT.has(person.status);
}
function groupActive(life,id){
  if(id==='dangerous')return !!(life.dangerousTrioBond&&life.dangerousTrioBond.active);
  if(id==='freedom')return !!(life.freedomTrioBond&&life.freedomTrioBond.active);
  if(id==='freedom_known'){
    const state=life.freedomTrio||{};
    return state.identityState==='revealed'&&FREEDOM.every(name=>available(life,name));
  }
  if(id==='business')return !!(life.businessQuartetBond&&life.businessQuartetBond.active);
  if(id==='six')return groupActive(life,'dangerous')&&groupActive(life,'freedom');
  if(id==='two_groups')return activeGroups(life).length>=2;
  if(id==='multi')return activeGroups(life).length>0&&relationshipNames(life).length>=2;
  return true;
}
function activeGroups(life){
  const groups=['dangerous','freedom','business'].filter(id=>groupActive(life,id));
  if(!groups.length&&life.polycule&&life.polycule.active&&relationshipNames(life).length>=2)groups.push('general');
  return groups;
}
function placeReady(life,place){
  if(!place||place==='any')return true;
  if(place==='cohabit')return groupActive(life,'dangerous')||
    !!(life.relationshipGroup&&life.relationshipGroup.agreement&&life.relationshipGroup.agreement.cohabiting);
  if(place==='chat')return groupActive(life,'freedom_known');
  if(place==='business')return groupActive(life,'business');
  if(place==='cross')return true;
  return true;
}
function ensure(life){
  if(!life.relationshipChemistry||typeof life.relationshipChemistry!=='object')life.relationshipChemistry={};
  const state=life.relationshipChemistry;
  state.version=VERSION;
  if(!state.seen||typeof state.seen!=='object')state.seen={};
  if(!Array.isArray(state.history))state.history=[];
  state.pending=typeof state.pending==='string'?state.pending:null;
  state.cooldown=Math.max(0,Math.floor(finite(state.cooldown,0)));
  state.totalDrain=Math.max(0,finite(state.totalDrain,0));
  state.actionCount=Math.max(0,Math.floor(finite(state.actionCount,0)));
  return state;
}
function eligible(life,event,day=0){
  if(!event)return false;
  const state=ensure(life),seen=state.seen[event.id];
  if(seen&&!event.repeatable)return false;
  if(event.repeatable&&seen&&day-finite(seen,day)<finite(event.repeatCooldown,6))return false;
  const needs=event.needs||{};
  if((event.people||[]).some(name=>!available(life,name)))return false;
  if(needs.route&&!groupActive(life,needs.route))return false;
  if(!placeReady(life,needs.place))return false;
  if((needs.partners||[]).some(name=>!isPartner(life,name)))return false;
  if(needs.partnerCount&&relationshipNames(life).length<needs.partnerCount)return false;
  if(needs.partnerAmong){
    const count=needs.partnerAmong.filter(name=>isPartner(life,name)).length;
    if(count<finite(needs.partnerAmongMin,1))return false;
    if(needs.partnerAmongMax!=null&&count>needs.partnerAmongMax)return false;
  }
  if(needs.healthMax!=null&&finite(life.health,100)>needs.healthMax)return false;
  if(needs.healthMin!=null&&finite(life.health,0)<needs.healthMin)return false;
  if(needs.factionMin!=null&&finite(life.faction&&life.faction.level,0)<needs.factionMin)return false;
  if(needs.obsession){
    const person=record(life,needs.obsession.name);
    if(!person||finite(person.obsession,0)<needs.obsession.min)return false;
  }
  if(needs.harmonyMin!=null&&finite(life.freedomTrio&&life.freedomTrio.harmony,0)<needs.harmonyMin)return false;
  if(needs.drainMin!=null&&state.totalDrain<needs.drainMin)return false;
  return !event.condition||event.condition(life,state);
}

const EVENTS=[
  {
    id:'dangerous_handcuff_theft',icon:'🔗',title:'수갑은 소품이 아닙니다',people:DANGEROUS,
    needs:{route:'dangerous',place:'cohabit',partners:['강유진','한채린']},
    desc:'채린이 “당신이 원할 것 같아서”라며 반짝이는 수갑을 식탁에 올렸습니다. 유진은 장난감이 아니라 경찰 장비라며 압수하려 했고, 세라는 열쇠가 하나뿐인지부터 확인했습니다.',
    lines:{'한채린':'당신이 저런 걸 찬 모습을 상상한 사람이 나뿐일 리 없잖아.','강유진':'그 정신 나간 여자가 또 제 수갑을 가져갔네요. 그리고 윤세라 씨는 열쇠에서 손 떼요.','윤세라':'잠그겠다는 말은 안 했어요. 아직은.'},
    choices:[
      {text:'수갑을 유진에게 돌려주고 채린에게 영수증만 남긴다',outcome:'유진은 장비 번호를 다시 확인했고 채린은 다음에는 개인 주문을 하겠다며 웃었습니다. 세라는 열쇠 사진만 지웠습니다.',people:{'강유진':{trust:6},'한채린':{affection:4},'윤세라':{obsession:-2}},stamina:-2},
      {text:'누가 가져왔든 오늘 식탁에서는 치우라고 한다',outcome:'셋은 동시에 불만을 말했지만 물건은 사라졌습니다. 그날만큼은 식사가 식기 전에 끝났습니다.',people:{'강유진':{trust:4},'한채린':{trust:3},'윤세라':{trust:3}},stamina:2},
      {text:'열쇠가 몇 개인지만 물어본다',outcome:'세 사람의 시선이 동시에 밝아졌습니다. 질문 하나로 잠들 시간이 두 시간 늦어졌습니다.',people:{'강유진':{affection:3},'한채린':{affection:6},'윤세라':{obsession:6}},stamina:-6}
    ]
  },
  {
    id:'dangerous_missing_laundry',icon:'🧺',title:'세탁기에는 없던 것',people:DANGEROUS,
    needs:{route:'dangerous',place:'cohabit',obsession:{name:'윤세라',min:55}},
    desc:'속옷이 자꾸 한 장씩 사라진다고 말하자 세라가 아무 말 없이 방을 나갔습니다. 유진은 분실 목록을 적기 시작했고, 채린은 같은 제품을 한 상자 주문했습니다.',
    lines:{'강유진':'웃을 일이 아니에요. 마지막으로 본 시각부터 적어 봐요.','한채린':'급 떨어지게 훔치지 말고 필요하면 내가 사주면 되잖아.','윤세라':'산 건 의미 없어요. …아무 말도 안 했는데 왜 다들 나를 봐요?'},
    choices:[
      {text:'세라 방에서 나온 것만 조용히 돌려받는다',outcome:'세라는 돌려주면서도 어떤 것이 가장 오래 입은 것인지 정확히 알고 있었습니다.',people:{'윤세라':{affection:3,obsession:-4},'강유진':{trust:4}},stamina:-2},
      {text:'개인 물건은 허락 없이 가져가지 않는다고 다시 정한다',outcome:'유진은 규칙을 냉장고에 붙였고 채린은 구매도 먼저 묻겠다고 덧붙였습니다. 세라는 가장 작은 글씨로 “물어보기”를 적었습니다.',people:{'강유진':{trust:6},'한채린':{trust:5},'윤세라':{trust:7,obsession:-7}},stamina:3},
      {text:'새 상자가 왔으니 당분간 모른 척한다',outcome:'수량은 넉넉해졌지만 세탁일마다 세 사람의 재고 조사가 시작됐습니다.',people:{'한채린':{affection:5},'윤세라':{obsession:7}},stamina:-5}
    ]
  },
  {
    id:'dangerous_evidence_bag',icon:'📁',title:'증거 봉투 속 연애',people:['강유진','윤세라'],
    needs:{route:'dangerous',place:'cohabit',partners:['강유진','윤세라']},
    desc:'유진이 세라의 수집 상자에서 영수증, 머리카락, 오래된 메모를 발견했습니다. 증거 봉투를 꺼냈다가 연인 사이의 물건이라는 세라의 말에 손이 멈췄습니다.',
    lines:{'강유진':'연애 중이라고 무단 수집이 합법이 되는 건 아니에요.','윤세라':'버린 걸 주운 것도 압수해요? 그럼 당신이 보관하면 나중에 돌려줘요.'},
    choices:[
      {text:'보관과 폐기 기준을 셋이 함께 정한다',outcome:'봉투는 증거가 아니라 반환 목록이 됐습니다. 세라는 처음으로 물건마다 돌려줄 날짜를 적었습니다.',people:{'강유진':{trust:7},'윤세라':{trust:7,obsession:-6}},stamina:2},
      {text:'유진에게 전부 맡긴다',outcome:'상자는 정리됐지만 세라는 유진의 보관함 열쇠 위치를 외우기 시작했습니다.',people:{'강유진':{affection:5},'윤세라':{trust:-3,obsession:4}},stamina:-2},
      {text:'둘이 알아서 하라며 침실로 피한다',outcome:'한 시간 뒤 증거물 인수인계 서류에 당신 서명이 필요하다는 호출이 왔습니다.',people:{'강유진':{trust:-2},'윤세라':{affection:2}},stamina:-4}
    ]
  },
  {
    id:'dangerous_sickbed_three_methods',icon:'🩺',title:'한 사람의 감기, 세 가지 보호',people:DANGEROUS,
    needs:{route:'dangerous',place:'cohabit',healthMax:68},
    desc:'몸살로 누운 당신 앞에서 유진은 체온과 복용 시각을 적고, 채린은 특실을 예약하고, 세라는 침대 옆 의자를 현관 쪽으로 돌려놓았습니다. 누구도 자신이 과하다고 생각하지 않았습니다.',
    lines:{'강유진':'해열제는 네 시간 간격. 다른 약 가져오는 사람은 먼저 나한테 보여요.','한채린':'집에서 버티지 말고 병원 한 층을 비우면 되잖아.','윤세라':'잠들어도 괜찮아요. 내가 계속 보고 있을 테니까.'},
    choices:[
      {text:'약·병원·밤 간호를 한 사람씩 맡긴다',outcome:'세 사람은 자기 역할 밖에서는 한 걸음 물러났습니다. 처음으로 간호받고도 잠을 잘 수 있었습니다.',people:{'강유진':{trust:5},'한채린':{trust:5},'윤세라':{trust:5,obsession:-3}},stamina:8},
      {text:'오늘은 아무도 방에 들어오지 말라고 한다',outcome:'문밖에 약봉지와 죽과 접이식 의자가 나란히 놓였습니다. 혼자 쉬었지만 세 그림자는 밤새 움직였습니다.',people:{'강유진':{trust:3},'한채린':{affection:2},'윤세라':{obsession:2}},stamina:5},
      {text:'가장 걱정하는 사람이 곁에 남으라고 한다',outcome:'세 사람 모두 자기가 지목됐다고 생각했습니다. 침대보다 옆자리 다툼이 더 뜨거웠습니다.',people:{'강유진':{affection:3},'한채린':{affection:3},'윤세라':{affection:3,obsession:4}},stamina:-3}
    ]
  },
  {
    id:'dangerous_fridge_vote',icon:'🍱',title:'냉장고의 세 칸',people:DANGEROUS,
    needs:{route:'dangerous',place:'cohabit'},
    desc:'냉장고에는 유진의 저염 도시락, 채린이 호텔에서 보낸 반찬, 세라가 직접 만든 국이 같은 수만큼 놓였습니다. 무엇을 먼저 꺼내는지 세 사람이 말없이 보고 있었습니다.',
    lines:{'강유진':'유통기한 순서대로 먹으면 돼요. 다른 의미는 없습니다.','한채린':'그래, 가격표는 떼었으니 공평하겠네.','윤세라':'어제는 채린 씨 걸 먹었어요.'},
    choices:[
      {text:'전부 조금씩 꺼내 네 사람 몫으로 섞는다',outcome:'정체불명의 한 상이 됐지만 누구도 자기 접시만 남기지는 않았습니다.',people:{'강유진':{trust:4},'한채린':{trust:4},'윤세라':{trust:4}},stamina:-1},
      {text:'유통기한이 가장 가까운 것부터 먹는다',outcome:'합리적인 선택이었지만 세 사람은 자기 음식의 유통기한을 바꾸는 방법을 생각하기 시작했습니다.',people:{'강유진':{affection:3},'한채린':{affection:2},'윤세라':{obsession:2}},stamina:-3},
      {text:'먹는 것까지 시험하지 말라고 숟가락을 내려놓는다',outcome:'세 사람은 잠깐 조용해졌고, 다음 끼니는 배달 하나만 시키기로 했습니다.',people:{'강유진':{trust:5},'한채린':{trust:5},'윤세라':{trust:5}},stamina:3}
    ]
  },
  {
    id:'freedom_camera_hide',icon:'📸',title:'찍으려는 사람과 숨는 사람',people:['유나','소희'],
    needs:{route:'freedom_known',place:'chat'},
    desc:'유나가 통화 중인 소희의 무심한 표정을 캡처하려 하자 소희는 머리와 마이크 뒤로 숨었습니다. 몇 초 뒤 소희가 직접 고른 사진 한 장이 단체방에 올라왔습니다.',
    lines:{'유나':'숨는 얼굴이 제일 잘 나오는데 왜 매번 가려요? 올리기 전에는 물을게.','소희':'찍히는 게 싫은 게 아니라, 내가 못 고르는 게 싫어요.'},
    choices:[
      {text:'소희가 고른 사진만 네 사람 방에 남긴다',outcome:'유나는 보정하지 않았고 소희도 사진을 지우지 않았습니다.',people:{'유나':{trust:6},'소희':{trust:7}},stamina:1},
      {text:'사진 대신 소희의 짧은 허밍만 저장한다',outcome:'화면은 비었지만 통화가 끝난 뒤에도 짧은 음이 방에 남았습니다.',people:{'유나':{affection:3},'소희':{affection:5,trust:4}},stamina:1},
      {text:'친한 사이인데 사진 한 장쯤 괜찮다고 한다',outcome:'유나는 카메라를 내렸고 소희는 다음 통화부터 화면을 켜지 않았습니다.',people:{'유나':{trust:-4},'소희':{trust:-7}},stamina:-2}
    ]
  },
  {
    id:'freedom_dutyfree_cosmetics',icon:'🛍️',title:'안 쓴다던 면세점 화장품',people:['채원','유나'],
    needs:{route:'freedom_known',place:'chat'},
    desc:'채원이 유나에게 어울릴 것 같다며 면세점 화장품을 건넸습니다. 유나는 광고 계약 때문에 못 쓴다고 했지만, 다음 주 개인 사진마다 같은 색이 조금씩 보였습니다.',
    lines:{'채원':'안 쓰면 다른 사람 줘도 돼요. 그냥 보자마자 생각나서 산 거예요.','유나':'안 쓴다고 했지 싫다고는 안 했거든요. 확대해서 보지는 마요.'},
    choices:[
      {text:'알아봤지만 모른 척 다음 사진만 기다린다',outcome:'유나는 끝까지 제품명을 말하지 않았고 채원은 같은 색의 다른 제품을 더 사 오지 않았습니다.',people:{'채원':{trust:5},'유나':{affection:5,trust:4}},stamina:0},
      {text:'단체방에서 오늘 색이 잘 어울린다고 말한다',outcome:'유나는 한동안 입력 중이었다가 “그 정도면 됐어요”라고 답했습니다.',people:{'채원':{affection:3},'유나':{affection:6}},stamina:-1},
      {text:'채원에게 다음에도 사 오라고 부탁한다',outcome:'배려는 정기 주문이 되었고 유나는 선물이 관계의 의무가 됐다며 사진을 줄였습니다.',people:{'채원':{trust:-4},'유나':{trust:-5}},stamina:-2}
    ]
  },
  {
    id:'freedom_exit_deadlock',icon:'🗓️',title:'괜찮다는 말의 교착',people:['채원','소희'],
    needs:{route:'freedom_known',place:'chat'},
    desc:'채원과 소희가 서로 편한 시간에 맞추겠다고 양보한 끝에 약속 후보가 전부 사라졌습니다. 두 사람 모두 상대를 배려했다고 생각했지만 아무도 만나자는 말을 하지 않았습니다.',
    lines:{'채원':'소희 씨 공연 끝나고 피곤할 테니까 다음에 봐도 돼요.','소희':'채원 씨 비행 전에는 쉬어야죠. 나는 언제든 괜찮아요.'},
    choices:[
      {text:'둘 다 보고 싶으니 한 시간만 만나자고 직접 정한다',outcome:'짧은 약속은 누구의 희생도 아니었습니다. 두 사람은 다음에는 먼저 자기 가능한 시간을 말하기로 했습니다.',people:{'채원':{trust:7},'소희':{trust:7}},stamina:-1},
      {text:'각자 정말 원하는 시간을 하나씩 말하게 한다',outcome:'처음으로 “나는 이날이 좋아요”라는 문장이 두 개 도착했습니다.',people:{'채원':{affection:4,trust:6},'소희':{affection:4,trust:6}},stamina:0},
      {text:'다들 괜찮다니 이번 약속은 없던 일로 한다',outcome:'누구도 항의하지 않았고 단체방은 사흘 동안 조용해졌습니다.',people:{'채원':{trust:-6},'소희':{trust:-6}},stamina:2}
    ]
  },
  {
    id:'freedom_timezone_dm',icon:'🌙',title:'시차가 새어 나온 새벽',people:FREEDOM,
    needs:{route:'freedom',place:'chat'},
    desc:'단체방에서는 셋 모두 바쁘면 다음에 보자고 쿨하게 인사했습니다. 그런데 몇 분 뒤 채원은 도착 시간을, 유나는 답이 늦은 이유를, 소희는 지웠던 음성 메시지를 각자 개인 연락으로 보냈습니다.',
    lines:{'채원':'방금 괜찮다고 한 건 진짜예요. 그래도 도착하면 한 줄은 남겨줘요.','유나':'신경 안 쓰는 척한 건 맞아요. 그렇다고 계속 안 쓰면 진짜 안 쓰는 줄 알잖아.','소희':'보낼 말을 지우는 것도 사라지는 거랑 비슷하다는 생각이 들어서요.'},
    choices:[
      {text:'세 사람에게 같은 말로 오늘은 여기까지라고 답한다',outcome:'세 개인 대화가 같은 시간에 끝났고 누구도 자기만 밀려났다고 느끼지 않았습니다.',people:{'채원':{trust:5},'유나':{trust:5},'소희':{trust:5}},stamina:2},
      {text:'잠들 때까지 세 대화를 모두 이어간다',outcome:'세 사람은 만족했지만 해가 뜰 때까지 휴대폰이 쉬지 않았습니다.',people:{'채원':{affection:4},'유나':{affection:4},'소희':{affection:4}},stamina:-6},
      {text:'단체방에서 한 번에 말하자고 다시 부른다',outcome:'개인 불안은 공개된 농담으로 바뀌었습니다. 소희도 지운 말을 다시 올렸습니다.',people:{'채원':{trust:6},'유나':{trust:6},'소희':{trust:6}},stamina:-1}
    ]
  },
  {
    id:'freedom_chaewon_tonic_bag',icon:'🧳',title:'도망친 곳의 보양식',people:FREEDOM,
    needs:{route:'freedom',place:'chat',drainMin:8},
    desc:'겨우 일정을 비워 자유인 셋과 쉬러 왔습니다. 여행에서 돌아온 채원의 가방에는 각종 보양식과 영양제가 가득했고, 유나와 소희는 당신의 눈을 피했습니다. 도망친 곳에 낙원은 없었습니다.',
    lines:{'채원':'비행하면서 좋은 것만 골랐어요. 요즘 많이 야위었잖아요.','유나':'나는 말렸어요. 종류를 세 개로 줄이라고.','소희':'먹는 시간표는 내가 만들었어요. 겹치면 힘드니까.'},
    choices:[
      {text:'누가 이런 계획을 세웠는지 순서대로 묻는다',outcome:'셋은 서로를 가리켰습니다. 가방은 채원이 가져왔고, 유나가 성분을 골랐고, 소희가 복용표를 만들었습니다.',people:{'채원':{affection:4},'유나':{affection:4},'소희':{affection:4}},stamina:-4},
      {text:'오늘은 아무것도 먹이지 말고 같이 낮잠만 자자고 한다',outcome:'세 사람은 실망했지만 알람을 모두 껐습니다. 보양식보다 먼저 네 사람이 두 시간을 잤습니다.',people:{'채원':{trust:7},'유나':{trust:7},'소희':{trust:7}},stamina:8},
      {text:'전부 먹으면 정말 쉬게 해줄 거냐고 묻는다',outcome:'셋은 대답하지 않고 새 봉지를 뜯었습니다. 낙원은 없었고 물만 세 잔 놓였습니다.',people:{'채원':{affection:5},'유나':{affection:5},'소희':{affection:5}},stamina:-8}
    ]
  },
  {
    id:'freedom_fourway_collab',icon:'🎧',title:'넷이 만든 쓸모없는 명작',people:FREEDOM,
    needs:{route:'freedom',place:'chat',harmonyMin:60},
    desc:'소희가 짧은 길드 음악을 만들고, 유나가 표지를 찍고, 채원이 비행 영상 조각을 편집했습니다. 돈도 홍보도 되지 않는 영상 하나를 두고 셋은 자기 취향이 가장 덜 과하다고 싸웠습니다.',
    lines:{'채원':'구름 장면은 세 초만 더 있어야 돌아오는 느낌이 나요.','유나':'그럼 내 얼굴보다 구름이 길잖아. 그게 더 낫긴 하네.','소희':'둘 다 조용히 해요. 박자가 영상보다 먼저예요.'},
    choices:[
      {text:'완성본을 네 사람만 보는 길드 화면으로 남긴다',outcome:'조회 수는 넷에서 멈췄지만 누구도 지우자고 하지 않았습니다.',people:{'채원':{trust:6},'유나':{trust:6},'소희':{trust:6}},stamina:-2},
      {text:'각자 버전을 하나씩 완성해 밤새 비교한다',outcome:'영상은 네 개가 됐고 수면 시간은 사라졌습니다.',people:{'채원':{affection:4},'유나':{affection:4},'소희':{affection:4}},stamina:-7},
      {text:'다음 접속 시작 화면으로 무단 설정한다',outcome:'셋은 화를 내면서도 접속할 때마다 끝까지 영상을 봤습니다.',people:{'채원':{affection:3,trust:-2},'유나':{affection:3,trust:-2},'소희':{affection:3,trust:-2}},stamina:-3}
    ]
  },
  {
    id:'business_risky_pitch_contract',icon:'🎬',title:'찍기 전에 책임부터',people:['한이슬','차서윤'],
    needs:{route:'business',place:'business'},
    desc:'이슬은 오늘 밤 바로 찍으면 화제가 된다며 생방송 기획을 가져왔고, 서윤은 사고가 날 경우의 책임자가 비어 있다며 계약서를 덮었습니다.',
    lines:{'한이슬':'재밌잖아요. 사고 안 나면 대박이고 나면 그것도 화제고.','차서윤':'대표가 밤새 수습하는 경우를 성공 항목에 넣지 마세요.'},
    choices:[
      {text:'안전 담당과 중단 권한을 적은 뒤 촬영한다',outcome:'방송은 조금 덜 과감했지만 다음 날 누구도 병원이나 법무실에 가지 않았습니다.',people:{'한이슬':{trust:5},'차서윤':{trust:7}},stamina:-2},
      {text:'오늘의 화제를 잡기 위해 바로 시작한다',outcome:'조회 수는 폭발했고 당신의 휴대폰도 새벽까지 폭발했습니다.',people:{'한이슬':{affection:7},'차서윤':{trust:-7}},stamina:-8},
      {text:'둘이 합의할 때까지 대표 결재를 보류한다',outcome:'두 사람은 새벽 두 시에 합의본을 보냈습니다. 대표는 그때까지 깨어 있었습니다.',people:{'한이슬':{trust:4},'차서윤':{trust:5}},stamina:-4}
    ]
  },
  {
    id:'business_care_competition',icon:'🍜',title:'돌봄도 결재가 필요합니까',people:['박지수','오혜린'],
    needs:{route:'business',place:'business'},
    desc:'지수는 야식 재고표를 들고 왔고 혜린은 야근을 중단시키러 왔습니다. 한 사람은 먹고 계속하라고, 다른 사람은 당장 쉬라고 말하며 서로가 더 위험한 돌봄이라고 따졌습니다.',
    lines:{'박지수':'빈속으로 보내는 게 더 위험해요. 이것만 먹고 가요.','오혜린':'그 “이것만”이 벌써 세 번째예요. 사장님, 이건 업무 중지 요청입니다.'},
    choices:[
      {text:'야식은 포장하고 오늘 회의를 끝낸다',outcome:'지수의 음식과 혜린의 휴식이 처음으로 같은 방향을 봤습니다.',people:{'박지수':{trust:6},'오혜린':{trust:7}},stamina:6},
      {text:'먹으면서 회의를 계속한다',outcome:'배는 불렀지만 회의가 끝날 때는 아침 식사가 도착했습니다.',people:{'박지수':{affection:6},'오혜린':{trust:-4}},stamina:-6},
      {text:'둘이 정한 결론에 따르겠다고 한다',outcome:'두 사람은 당신 없는 별도 회의를 열었습니다. 돌봄을 받기 위한 회의가 하나 더 늘었습니다.',people:{'박지수':{affection:3},'오혜린':{affection:3}},stamina:-3}
    ]
  },
  {
    id:'business_seven_meals',icon:'🍱',title:'대표님의 일곱 번째 식사',people:BUSINESS,
    needs:{route:'business',place:'business',drainMin:8},
    desc:'지수의 야식, 이슬의 촬영 도시락, 서윤의 투자자 오찬, 혜린의 현장 국밥이 하루에 겹쳤습니다. 직원은 사장님이 하루에 일곱 끼를 드시는데도 점점 야윈다며 심각하게 보고했습니다.',
    lines:{'박지수':'굶긴 적은 없는데 왜 살이 빠지죠?','한이슬':'먹는 장면도 콘텐츠로 쓰면 되잖아요. 농담이에요, 표정 풀어요.','차서윤':'식사 시간이 전부 업무 시간이었던 것이 문제입니다.','오혜린':'이제부터 한 끼라도 회의 붙이면 제가 취소합니다.'},
    choices:[
      {text:'식사 시간에는 업무 보고를 금지한다',outcome:'네 사람은 식탁에서 직함을 내려놓았습니다. 다섯 번째 끼니부터는 다음 날로 미뤘습니다.',people:{'박지수':{trust:7},'한이슬':{trust:5},'차서윤':{trust:7},'오혜린':{trust:8}},stamina:7},
      {text:'일곱 끼를 다 먹고 오늘 일정을 끝낸다',outcome:'일정은 끝났지만 소화는 끝나지 않았습니다. 다음 날 건강검진 항목이 하나 늘었습니다.',people:{'박지수':{affection:4},'한이슬':{affection:4},'차서윤':{affection:4},'오혜린':{affection:4}},stamina:-7},
      {text:'직원에게 대신 회의를 받아 달라고 한다',outcome:'첫 부하는 조직 생활보다 대표 연애 일정이 더 위험하다는 보고를 남기고 도망쳤습니다.',people:{'박지수':{trust:3},'한이슬':{trust:3},'차서윤':{trust:3},'오혜린':{trust:3}},stamina:3}
    ]
  },
  {
    id:'business_report_omission',icon:'📑',title:'보고서에서 뺀 항목',people:BUSINESS,
    needs:{route:'business',place:'business'},
    desc:'지수가 대표의 사적인 일정 하나를 보고서에서 빼자 이슬이 회의 화면에 그대로 띄웠습니다. 서윤은 삭제 이력을 확인했고 혜린은 애초에 기록할 일이 아니었다며 노트북을 닫았습니다.',
    lines:{'박지수':'이건 매출도 위험도 아니니까 빼는 게 맞아요.','한이슬':'왜 빼요? 제일 재밌는 항목인데.','차서윤':'삭제보다 수집 목적부터 설명하세요.','오혜린':'사장님 사생활은 업무가 아닙니다.'},
    choices:[
      {text:'사적인 내용은 수집하지 않는 규칙을 만든다',outcome:'보고서는 짧아졌고 퇴근 뒤의 당신은 처음으로 보고 대상이 아니게 됐습니다.',people:{'박지수':{trust:6},'한이슬':{trust:4},'차서윤':{trust:7},'오혜린':{trust:7}},stamina:3},
      {text:'재미있는 항목만 익명으로 남긴다',outcome:'익명 보고서는 누가 봐도 당신 이야기였습니다. 다음 회의 참석자가 두 배로 늘었습니다.',people:{'한이슬':{affection:6},'차서윤':{trust:-4},'오혜린':{trust:-4}},stamina:-5},
      {text:'네 사람이 서로의 사생활도 같은 기준으로 공개하게 한다',outcome:'회의는 즉시 중단됐습니다. 공평했지만 누구도 다시 하자고 하지 않았습니다.',people:{'박지수':{trust:4},'한이슬':{trust:4},'차서윤':{trust:4},'오혜린':{trust:4}},stamina:2}
    ]
  },
  {
    id:'cross_chaerin_yuna_rights',icon:'👑',title:'팔 수 없는 사람',people:['한채린','유나'],
    needs:{place:'cross',partnerAmong:['한채린','유나'],partnerAmongMax:1},
    desc:'채린이 유나의 이미지 판권을 사면 악성 기사도 함께 통제할 수 있다고 제안했습니다. 유나는 보호를 이유로 자기 선택권을 넘길 생각은 없다며 계약서를 밀어냈습니다.',
    lines:{'한채린':'안 팔린다는 말은 가격을 아직 못 들었다는 뜻일 때가 많죠.','유나':'난 상품처럼 보이는 일은 해도, 사람까지 팔 생각은 없어.'},
    choices:[
      {text:'유나에게 계약 거절과 별도 보호를 선택하게 한다',outcome:'채린은 비효율적이라면서도 계약서를 거뒀고 유나는 자기 이름으로 법률 대리인을 골랐습니다.',people:{'한채린':{trust:4},'유나':{trust:8}},stamina:-2},
      {text:'채린의 자원만 빌리고 판권 조항은 찢는다',outcome:'둘 다 당신의 절충을 마음에 들어 하지는 않았지만 유나의 선택권은 남았습니다.',people:{'한채린':{affection:4},'유나':{trust:6}},stamina:-3},
      {text:'둘이 정할 문제라며 자리를 피한다',outcome:'다음 날 서로 다른 계약서 두 부가 당신 앞으로 도착했습니다.',people:{'한채린':{trust:-3},'유나':{trust:-4}},stamina:-5}
    ]
  },
  {
    id:'cross_yujin_ohyerin_ethics',icon:'⚖️',title:'절차와 현장의 같은 선',people:['강유진','오혜린'],
    needs:{place:'cross',partnerAmong:['강유진','오혜린'],partnerAmongMax:1},
    desc:'현장 사고 은폐를 제안받은 혜린이 유진에게 기록을 넘겼습니다. 유진은 법적 절차를 설명했고 혜린은 그 절차가 끝날 때까지 일하는 사람을 누가 지키는지 되물었습니다.',
    lines:{'강유진':'기록이 남아야 다음 피해를 막을 수 있습니다.','오혜린':'맞아요. 대신 기록이 완성될 때까지 현장을 멈출 권한도 같이 주세요.'},
    choices:[
      {text:'신고와 현장 중단을 동시에 승인한다',outcome:'두 사람은 처음부터 같은 선을 보고 있었다는 걸 인정했습니다.',people:{'강유진':{trust:7},'오혜린':{trust:8}},stamina:-2},
      {text:'증거를 더 모을 때까지 조용히 운영한다',outcome:'증거는 늘었지만 위험한 작업도 하루 더 이어졌습니다.',people:{'강유진':{trust:3},'오혜린':{trust:-7}},stamina:-5},
      {text:'혜린에게 전권을 주고 유진은 사후 처리만 맡긴다',outcome:'현장은 멈췄지만 유진은 증거 보전이 늦었다며 밤새 보완 작업을 요구했습니다.',people:{'강유진':{trust:-3},'오혜린':{affection:5}},stamina:-4}
    ]
  },
  {
    id:'cross_sera_sohee_disappearing',icon:'🫥',title:'붙잡는 사람과 지워지는 사람',people:['윤세라','소희'],
    needs:{place:'cross',partnerAmong:['윤세라','소희'],partnerAmongMax:1,obsession:{name:'윤세라',min:45}},
    desc:'세라는 답이 늦은 소희의 작업실 위치를 이미 찾아냈고, 소희는 모두를 방해할 바에는 단체방을 나가는 편이 낫다고 말했습니다. 두 사람은 상대가 왜 대답을 듣기도 전에 결론을 내리는지 섬뜩할 만큼 빨리 알아봤습니다.',
    lines:{'윤세라':'사라지면 찾으면 되잖아요. 왜 자기 자리를 먼저 없애요?','소희':'찾을 거라고 믿고 사라지는 사람과, 못 찾게 사라지는 사람은 달라요. 그래도 둘 다 먼저 묻지는 않았네요.'},
    choices:[
      {text:'찾기 전에 묻고 나가기 전에 말하는 규칙을 제안한다',outcome:'세라는 위치 화면을 닫았고 소희는 단체방 나가기 버튼에서 손을 뗐습니다.',people:{'윤세라':{trust:7,obsession:-6},'소희':{trust:8}},stamina:1},
      {text:'세라에게 소희를 데려오라고 한다',outcome:'소희는 돌아왔지만 자신의 선택으로 돌아온 것은 아니었습니다.',people:{'윤세라':{affection:6,obsession:7},'소희':{trust:-9}},stamina:-5},
      {text:'소희가 혼자 있고 싶다면 존중하자고 한다',outcome:'세라는 존중이라는 말이 방치와 어떻게 다른지 물었고, 소희는 답을 듣지 못한 채 접속을 끊었습니다.',people:{'윤세라':{trust:-3},'소희':{trust:-5}},stamina:-2}
    ]
  },
  {
    id:'cross_chaerin_seoyun_contract',icon:'🖋️',title:'값을 매기는 사람과 빈칸을 읽는 사람',people:['한채린','차서윤'],
    needs:{place:'cross',partnerAmong:['한채린','차서윤'],partnerAmongMax:1},
    desc:'채린은 원하는 조건을 먼저 적으면 사람도 따라온다고 했고, 서윤은 사람이 빠져나갈 빈칸이 없는 계약은 거래가 아니라 포획이라고 답했습니다.',
    lines:{'한채린':'싫다면 더 좋은 조건을 쓰면 돼. 선택지는 돈으로 넓히는 거야.','차서윤':'거절했을 때 잃는 것이 너무 많으면 그건 선택지가 아닙니다.'},
    choices:[
      {text:'거절해도 불이익이 없는 조항을 먼저 넣는다',outcome:'채린은 재미없는 계약이라 투덜댔지만 서윤은 그제야 검토 도장을 찍었습니다.',people:{'한채린':{trust:5},'차서윤':{trust:8}},stamina:-2},
      {text:'채린의 조건을 받고 서윤에게 사후 감사를 맡긴다',outcome:'계약은 체결됐고 감사도 시작됐습니다. 당신은 두 사람의 수정안을 밤새 중계했습니다.',people:{'한채린':{affection:6},'차서윤':{trust:4}},stamina:-7},
      {text:'누가 더 좋은 조건인지 경쟁하게 한다',outcome:'조건은 좋아졌지만 두 사람 모두 당신을 계약의 당사자보다 심사위원처럼 다뤘습니다.',people:{'한채린':{affection:4},'차서윤':{affection:3,trust:-3}},stamina:-5}
    ]
  },
  {
    id:'cross_yuna_haniseul_camera',icon:'🎥',title:'찍고 싶은 사람과 찍힐 사람',people:['유나','한이슬'],
    needs:{place:'cross',partnerAmong:['유나','한이슬'],partnerAmongMax:1},
    desc:'이슬은 유나가 카메라를 의식하지 않는 순간을 찍고 싶다며 테스트 촬영을 제안했습니다. 유나는 솔직한 얼굴이라는 말로 동의 없는 장면을 팔 생각은 없다고 잘랐습니다.',
    lines:{'유나':'자연스러운 얼굴은 카메라가 없는 얼굴이지 몰래 켠 카메라 앞 얼굴이 아니야.','한이슬':'그래서 미리 묻는 거예요. 대신 허락하면 진짜 재미있게 찍을 수 있어요.'},
    choices:[
      {text:'촬영 시작과 삭제 권한을 유나가 직접 정하게 한다',outcome:'이슬은 촬영 전에 삭제 버튼부터 보여 줬고 유나는 테스트 컷 한 장을 직접 남겼습니다.',people:{'유나':{trust:8},'한이슬':{trust:7}},stamina:-2},
      {text:'현장 분위기를 위해 일단 카메라를 돌린다',outcome:'좋은 장면은 나왔지만 유나는 그날 촬영본 전체를 폐기했습니다.',people:{'유나':{trust:-9},'한이슬':{affection:5,trust:-3}},stamina:-6},
      {text:'두 사람의 촬영 계약을 직접 밤새 검토한다',outcome:'합의서는 완벽해졌고 당신의 눈 밑은 촬영 전보다 짙어졌습니다.',people:{'유나':{trust:5},'한이슬':{trust:5}},stamina:-7}
    ]
  },
  {
    id:'six_chat_summons',icon:'📱',title:'두 단체방의 동시 호출',people:[...DANGEROUS,...FREEDOM],
    needs:{route:'six',place:'chat',partnerCount:6},
    desc:'`다음 접속`에서는 오늘 게임을 하자고 했고, 저장하지 않은 번호 방에서는 귀가 시간을 묻고 있었습니다. 같은 시각 두 방에서 입력 중 표시가 여섯 개 켜졌습니다.',
    lines:{'강유진':'일정 공유는 허가가 아니에요. 다만 귀가 시각은 남겨요.','한채린':'게임 한 판이 몇 시간인지부터 제출해.','윤세라':'음성 채팅은 켜 두면 안 돼요? 듣기만 할게요.','채원':'끝나는 시간부터 정하면 기다릴 수 있어요.','유나':'허락받으라는 게 아니라 본인이 정해서 말하라는 거야.','소희':'두 방에 다른 답은 쓰지 마요.'},
    choices:[
      {text:'게임 종료와 귀가 시간을 한 번에 공개한다',outcome:'두 방은 불만스럽게 같은 시간을 확인했습니다. 여섯 사람의 알림이 동시에 꺼졌습니다.',people:Object.fromEntries([...DANGEROUS,...FREEDOM].map(name=>[name,{trust:5}])),stamina:-3},
      {text:'두 방에 각자 듣고 싶어 하는 답을 보낸다',outcome:'스크린샷 두 장이 같은 시각 공유됐습니다. 밤새 해명했지만 어느 방에서도 게임은 시작되지 않았습니다.',people:Object.fromEntries([...DANGEROUS,...FREEDOM].map(name=>[name,{trust:-6}])),stamina:-10},
      {text:'휴대폰을 끄고 한 시간만 혼자 걷는다',outcome:'돌아왔을 때 메시지는 많았지만, 당신은 처음으로 누구의 시간표도 아닌 한 시간을 가졌습니다.',people:Object.fromEntries([...DANGEROUS,...FREEDOM].map(name=>[name,{trust:2}])),stamina:4}
    ]
  },
  {
    id:'fatigue_faction_observer',icon:'🛡️',title:'조직보다 위험한 연애',people:[],
    needs:{route:'multi',factionMin:1,drainMin:10,healthMax:62},
    desc:'첫 부하가 보고서를 읽다 말고 당신의 핼쑥한 얼굴을 바라봤습니다. 세력전 때보다 지금이 더 위험해 보인다며 누구 때문인지 물었다가, 떠오르는 이름들을 세고 바로 질문을 취소했습니다.',
    lines:{},
    choices:[
      {text:'조직 일정부터 줄여 달라고 한다',outcome:'부하는 고개를 끄덕이다가 연애 일정도 조직에서 관리해야 하는지 진지하게 고민했습니다.',stamina:5},
      {text:'아무 문제 없다고 웃는다',outcome:'부하는 “그 대답을 하는 사람이 제일 위험합니다”라고 적고 비상 연락망을 갱신했습니다.',stamina:-3},
      {text:'혹시 누가 오면 오늘은 없다고 해 달라고 한다',outcome:'부하는 문밖의 인기척을 듣고 “이미 늦은 것 같습니다”라고 속삭였습니다.',stamina:-5}
    ]
  },
  {
    id:'fatigue_group_hospital',icon:'🏥',title:'다들 제정신입니까',people:[],
    urgent:true,repeatable:true,repeatCooldown:6,
    needs:{route:'multi',healthMax:30,drainMin:8},
    variant:hospitalVariant,
    desc:'결국 일정 한가운데에서 쓰러졌습니다. 호출받은 사람들은 서로를 가리키며 누가 당신을 가장 많이 지치게 했는지 따지기 시작했습니다.',
    lines:{},
    choices:[
      {text:'모든 그룹 일정에 회복일을 먼저 배정한다',outcome:'처음으로 빈칸이 약속보다 먼저 달력에 들어갔습니다. 누구도 회복일을 자기 몫으로 주장하지 못했습니다.',stamina:18,flags:{relationshipRecoveryRule:true}},
      {text:'내 몸과 일정은 내가 정한다고 못 박는다',outcome:'각자의 보호 계획과 업무표가 침대 옆에서 접혔습니다. 불만은 남았지만 결정권은 돌아왔습니다.',stamina:12,flags:{relationshipBodyBoundary:true}},
      {text:'괜찮다며 퇴원하자마자 밀린 약속부터 잡는다',outcome:'전원은 당신 탓이라고 입을 모으면서도 가장 빠른 빈 시간을 차지하기 시작했습니다.',stamina:-8}
    ]
  },
  {
    id:'fatigue_leader_rationing',icon:'📆',title:'아껴 쓰자는 협상',people:[],
    needs:{route:'two_groups',partnerCount:5,drainMin:12,healthMax:55},
    variant:leaderVariant,
    desc:'각 그룹에서 가장 계산이 빠른 사람들이 한 테이블에 모였습니다. “이러다 죽는다”는 결론만은 만장일치였고, 곧 당신의 일주일을 배급표처럼 나누기 시작했습니다.',
    lines:{},
    choices:[
      {text:'한 사람당 횟수가 아니라 혼자 있는 날부터 정한다',outcome:'배급표 맨 위에 누구의 몫도 아닌 날이 생겼습니다.',stamina:10,flags:{relationshipSoloDay:true}},
      {text:'그룹마다 주 2회로 합의한다',outcome:'합계가 일주일을 넘는다는 사실을 뒤늦게 발견하고 협상이 다시 시작됐습니다.',stamina:-5},
      {text:'공평하게 매일 모두 만나겠다고 한다',outcome:'회의는 즉시 끝났습니다. 참석자들은 당신이 제일 위험한 사람이라는 데 합의했습니다.',stamina:-12}
    ]
  }
];

function hospitalVariant(life){
  if(groupActive(life,'dangerous'))return{
    title:'응급실에서도 서로를 탓하는 세 사람',people:DANGEROUS,
    desc:'쓰러진 당신 앞에서 유진은 복용 기록을, 채린은 영양제 상자를, 세라는 밤샘 감시표를 들고 서로를 탓했습니다. 셋 모두 자기는 돌봤고 당신이 전부 상대하려 해서 쓰러졌다고 주장했습니다.',
    lines:{'강유진':'약속을 전부 받아준 본인 책임도 있어요. 그렇다고 두 사람이 무죄라는 뜻은 아닙니다.','한채린':'영양제로 될 일이 아니었네. 일정표를 누가 이따위로 짰어?','윤세라':'이제 내가 스물네 시간 재우면 돼요. 아무도 못 깨우게.'}
  };
  if(groupActive(life,'business'))return{
    title:'회의실의 걔는 누구야',people:BUSINESS,
    desc:'검사 결과는 과로였습니다. 네 사람은 대표를 마지막으로 붙잡은 회의가 누구 것이었는지 감사하듯 따졌고, 담당 직원은 회의실 예약 기록을 조용히 삭제하고 싶어 했습니다.',
    lines:{'박지수':'먹이는 것만 챙기고 쉬는 건 못 챙겼네요.','한이슬':'내 촬영은 두 시간뿐이었어요. 편집 회의는 별개고.','차서윤':'별개라고 분리한 일정의 합이 과로입니다.','오혜린':'전부 업무 중지입니다. 연애도 포함해서요.'}
  };
  if(!groupActive(life,'freedom'))return{
    title:'모두가 챙겼는데 쓰러진 사람',people:relationshipNames(life),
    desc:'각자는 자기 약속 하나만 생각했지만, 모두의 약속을 합치자 당신의 빈 시간이 사라져 있었습니다. 병실에 모인 사람들은 서로를 탓하다가 달력의 주인이 누구였는지 뒤늦게 물었습니다.',
    lines:{}
  };
  return{
    title:'오랜만에 만났을 뿐이라는 세 사람',people:FREEDOM,
    desc:'당신이 쓰러지자 세 사람은 다들 제정신이냐고 서로를 보다가 동시에 말을 멈췄습니다. 채원은 귀국한 지 얼마 안 됐고, 유나는 촬영이 끝났고, 소희는 공연 뒤 잠깐이었을 뿐이라고 각자 변명했습니다.',
    lines:{'채원':'우리는… 정말 오랜만에 만난 거였어요. 그래서 오늘 아니면 안 될 것 같아서.','유나':'다들 제정신이니? 뭐… 나도 밤 촬영 끝나고 바로 부른 건 맞지만.','소희':'끝나는 시간을 정했는데, 다음 약속이 바로 이어졌네요.'}
  };
}
function leaderVariant(life){
  const people=[];
  if(groupActive(life,'dangerous'))people.push('한채린');
  if(groupActive(life,'freedom'))people.push('유나');
  if(groupActive(life,'business'))people.push('차서윤');
  return{
    people,
    lines:{
      '한채린':'이러다 죽어. 한 사람당 주 2회. 초과분은 벌금으로 처리해.',
      '유나':'사람을 시간표로 나누는 게 싫어서 왔는데, 최소한 혼자 있는 날은 있어야 해.',
      '차서윤':'횟수보다 총 소요 시간과 회복 시간을 먼저 계산하겠습니다.'
    }
  };
}
function materialize(life,event){
  if(!event||typeof event.variant!=='function')return event;
  const variant=event.variant(life)||{};
  return{...event,...variant,needs:event.needs};
}
function get(id,life){
  return materialize(life,EVENTS.find(event=>event.id===id)||null);
}
function monthly(life,day=0,random=Math.random){
  const state=ensure(life);
  if(state.pending)return get(state.pending,life);
  const availableEvents=EVENTS.filter(event=>eligible(life,event,day));
  const urgent=availableEvents.find(event=>event.urgent);
  if(urgent){
    state.pending=urgent.id;
    return materialize(life,urgent);
  }
  if(state.cooldown>0){state.cooldown--;return null;}
  if(!availableEvents.length||random()>.68)return null;
  const event=availableEvents[Math.floor(random()*availableEvents.length)];
  state.pending=event.id;
  state.cooldown=1;
  return materialize(life,event);
}
function resolved(life,eventId,choiceText,day=0){
  const state=ensure(life);
  state.seen[eventId]=day||1;
  if(state.pending===eventId)state.pending=null;
  state.history.unshift({id:eventId,choice:choiceText,day});
  state.history=state.history.slice(0,40);
}
function clearPending(life,eventId){
  const state=ensure(life);
  if(!eventId||state.pending===eventId)state.pending=null;
}
function noteStamina(life,delta){
  const state=ensure(life),amount=finite(delta,0);
  life.health=clamp(finite(life.health,50)+amount,0,100);
  if(amount<0)state.totalDrain+=Math.abs(amount);
  else state.totalDrain=Math.max(0,state.totalDrain-amount*.35);
  return amount;
}
function applyActionFatigue(life,actionGroup,day=0){
  const state=ensure(life),outside=['데이트','취미','경력','인맥','사업','라이벌'].includes(actionGroup);
  if(!actionGroup)return{drain:0,sources:[],state};
  let drain=0;const sources=[];
  if(groupActive(life,'dangerous')){
    const amount=outside?4:actionGroup==='휴식'?1:2;
    drain+=amount;sources.push('공동생활');
  }
  if(groupActive(life,'freedom')){
    const amount=actionGroup==='휴식'?0:['데이트','취미','인맥'].includes(actionGroup)?2:1;
    drain+=amount;if(amount)sources.push('세 사람의 엇갈린 일정');
  }
  if(groupActive(life,'business')){
    const amount=actionGroup==='휴식'?0:['사업','경력','인맥'].includes(actionGroup)?2:1;
    drain+=amount;if(amount)sources.push('네 책임자의 보고와 약속');
  }
  if(activeGroups(life).includes('general')){
    const amount=actionGroup==='휴식'?0:outside?2:1;
    drain+=amount;if(amount)sources.push('여러 사람의 겹친 약속');
  }
  drain=Math.min(7,drain);
  if(!drain)return{drain:0,sources:[],state};
  noteStamina(life,-drain);
  state.actionCount++;
  state.lastActionDay=day;
  return{drain,sources,state};
}

root.QT_CHARACTER_CHEMISTRY={
  VERSION,DANGEROUS,FREEDOM,BUSINESS,EVENTS,ensure,get,monthly,resolved,clearPending,eligible,
  relationshipNames,isPartner,activeGroups,noteStamina,applyActionFatigue,
};
})(window);
