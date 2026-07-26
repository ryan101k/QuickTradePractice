/* QuickTrade Life — 강유진 × 한채린 × 윤세라 결핍 공생 루트 */
(function(root){
'use strict';
const NAMES=['강유진','한채린','윤세라'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rec=(life,name)=>(life.met||[]).find(person=>person.name===name);

const CHAPTERS=[
 {
  title:'한 방에 모인 세 개의 결핍',icon:'🗝️',scene:'./assets/event-trio-first-meeting.png',
  desc:'유진이 추적한 차명계좌는 채린의 계열 경호사에서 끊겼고, 세라는 그 회사가 피해자 주소를 사들인 원본 장부를 숨겨뒀습니다. 유진은 압수수색 기록을, 채린은 계열사를 잘라낼 자금과 거처를, 세라는 경쟁 세력의 송금책을 들고 같은 방에 들어옵니다. 셋은 서로를 비정상이라 부르면서도 설명 없이 수사·자금·정보 역할을 나눕니다.',
  speakers:[
   {name:'강유진',line:'세라 씨 방식은 불법이에요. 자료는 내가 증거로 바꿀 테니 원본은 건드리지 마요.'},
   {name:'한채린',line:'내 계열사라고 봐줄 생각은 없어. 압류 전에 돈줄부터 묶을게. 경찰관은 영장, 세라는 우회 계좌를 줘.'},
   {name:'윤세라',line:'사이 나쁜 사람치고 손발이 잘 맞네요. 그래도 이 사람 옆자리는 내 거예요.'}
  ],
  choices:[
   {id:'roles',tag:'balance',text:'말싸움은 두고 공격한 세력부터 함께 잡자고 한다',preview:'겉으로 으르렁대는 악우를 실제 팀으로 묶는다',stability:12,trust:5,result:'유진은 증거, 채린은 돈줄, 세라는 내부 동선을 맡았습니다. 회의가 끝날 때까지 서로를 한 번도 칭찬하지 않았지만 빈틈도 하나 남기지 않았습니다.'},
   {id:'compete',tag:'fracture',text:'누가 나를 가장 잘 지키는지 증명해보라고 한다',preview:'결핍을 경쟁으로 자극한다',stability:-9,obsession:6,result:'세 사람은 물러서지 않았습니다. 당신의 한 달 일정이 보호 실적 경쟁표로 변하기 시작했습니다.'},
   {id:'surrender',tag:'containment',text:'휴대전화·열쇠·일정을 셋에게 모두 맡긴다',preview:'세 개의 감시망이 하나로 이어진다',stability:7,obsession:10,result:'누구 하나가 선을 넘으면 나머지 둘이 막겠다는 명분으로, 세 사람 모두 당신의 생활에 들어왔습니다.'}
  ]
 },
 {
  title:'쟤보다는 내가 정상',icon:'🦂',scene:'./assets/event-trio-first-meeting.png',
  desc:'세 사람은 부하들 앞에서 누가 가장 정상인지 싸우지만, 서로의 약점은 외부인이 건드리지 못하게 막습니다. 유진과 채린이 세라의 스토킹을 욕하고 세라가 둘의 결핍을 찌르는 동안에도, 테이블 아래에서는 같은 적의 계좌 자료가 실시간으로 공유됩니다.',
  speakers:[
   {name:'강유진',line:'집 앞에서 기다리고 동선을 외우는 건 보호가 아니라 스토킹이에요.'},
   {name:'한채린',line:'사람 하나 붙잡겠다고 품위까지 버리는 건 이해하기 어렵네요.'},
   {name:'윤세라',line:'유진 씨는 일부러 이 사람을 망가뜨려서 자기한테만 의지하게 만들잖아요. 채린 씨는… 매 맞는 여자가 꿈이었어요? 막대해줄 사람 찾느라 돈도 많이 쓰네요.'},
   {name:'첫 부하',line:'저분들 진짜 사이 나쁜 거 맞습니까? 욕하면서 같은 문서 고치고 있는데요. 차라리 조직 생활할 때가 더 좋았습니다.'}
  ],
  choices:[
   {id:'same',tag:'balance',text:'“셋 다 똑같이 비정상인데 일은 잘하네”라고 말한다',preview:'가짜 불화와 진짜 공조를 인정한다',stability:14,trust:4,result:'세 사람은 동시에 당신을 노려본 뒤 각자 자기가 가장 유능했다고 주장했습니다. 그날 이후 “쟤보단 정상”은 서로의 공을 숨겨 주는 악우식 암호가 됐습니다.'},
   {id:'release',tag:'containment',text:'밖에서 사고 치지 말고 서로를 감시하라고 한다',preview:'목격자의 진심 어린 부탁을 받아들인다',stability:9,obsession:7,result:'셋은 모욕적이라며 반발했지만, 서로가 선을 넘는 순간 가장 먼저 지적하는 이상한 견제 관계가 생겼습니다.'},
   {id:'pickfight',tag:'fracture',text:'가장 정상인 사람이 누군지 계속 말해보라고 부추긴다',preview:'상처를 정확히 찌르는 싸움을 이어간다',stability:-14,obsession:5,result:'싸움은 새벽까지 이어졌고 각자는 당신을 자기 쪽으로 데려가려 했습니다. 셋의 결은 맞지만 아직 한 울타리에는 들어오지 못했습니다.'}
  ]
 },
 {
  title:'사라진 37분',icon:'🚨',scene:'./assets/event-trio-emergency.png',
  desc:'당신의 휴대전화가 꺼진 뒤 37분 동안 셋은 통화 한 번 없이 도시를 세 구역으로 나눴습니다. 유진은 신고 절차, 채린은 병원과 차량, 세라는 습관과 마지막 말을 맡았습니다. 평소의 싸움이 역할 확인이었다는 사실이 처음 드러납니다.',
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
  title:'열린 문, 닫힌 세계',icon:'🌅',scene:'./assets/event-trio-secure-home-ending.png',
  desc:'세 사람이 만든 집의 현관문은 열려 있습니다. 유진은 보호받는 당신의 안도한 표정을 좋아하고, 채린은 세상에서 유일하게 자기 지원을 걷어차고 명령하는 당신 앞에서만 왕관을 내려놓으며, 세라는 돌아올 곳을 얻었습니다. 셋의 광기는 서로가 선을 넘지 못하게 견제할 때만 위협이 아닌 방패가 됩니다.',
  speakers:[
   {name:'강유진',line:'나가도 돼요. 위험하면 가장 먼저 나를 부른다는 약속만 해요.'},
   {name:'한채린',line:'어디든 갈 수 있죠. 내가 준비한 곳 중에서 고른다면.'},
   {name:'윤세라',line:'문은 열려 있잖아요. 돌아오기만 하면 아무도 화내지 않아요.'}
  ],
  choices:[
   {id:'badfriends',tag:'balance',text:'계속 서로 욕하면서 같은 편으로 살라고 한다',preview:'가짜 불화·진짜 공조의 악우 공동생활',stability:18,trust:8,result:'세 사람은 끝내 친하다는 말을 하지 않았습니다. 대신 한 사람이 선을 넘으면 둘이 막고, 외부가 한 사람을 건드리면 셋이 동시에 움직였습니다.'},
   {id:'goldencage',tag:'containment',text:'세 사람이 만든 안전망 안에서만 살겠다고 약속한다',preview:'가장 안전하고 가장 빠져나오기 어려운 결말',stability:12,obsession:15,result:'문은 잠기지 않았습니다. 잠글 필요가 없어졌기 때문입니다. 당신이 갈 수 있는 모든 곳에는 이미 세 사람 중 하나가 기다리고 있습니다.'},
   {id:'chooseone',tag:'fracture',text:'오늘 여기서 한 사람만 선택하겠다고 선언한다',preview:'공생을 깨고 마지막 쟁탈전을 시작한다',stability:-25,obsession:10,result:'세 사람은 당신의 선택을 기다리지 않았습니다. 각자가 가진 권력과 기록과 기억으로, 나머지 둘을 먼저 밀어내기 시작했습니다.'}
  ]
 }
];
const AFTERMATH=[
 {
  id:'replaced_frames',title:'공동생활 1개월 · 사라진 단체사진',icon:'🖼️',scene:'./assets/event-sera-three-chairs.png',
  desc:'공동 거처의 액자 속 사진이 밤사이 전부 바뀌었습니다. 유진의 순찰 사진도, 채린의 이사회 사진도, 당신의 어린 시절 사진도 같은 구도의 세라 사진으로 덮여 있습니다.',
  speakers:[
   {name:'윤세라',line:'한 집에 사는데 사진도 같은 사람을 보면 덜 헷갈리잖아요.'},
   {name:'강유진',line:'남의 물건을 허락 없이 바꾸는 건 공동생활이 아니라 침입이에요.'},
   {name:'한채린',line:'취향은 최악인데 실행력은 인정할게. 원본은 내 보관실에 있어.'}
  ],
  choices:[
   {id:'restore',text:'네 사람의 사진을 새로 찍어 같은 크기로 건다',result:'세라는 자기 사진이 줄었다며 불평했지만, 누구도 지워지지 않는 첫 공동사진이 생겼습니다.',stability:8,obsession:-5},
   {id:'sera_wall',text:'세라 사진 한 장만 남기고 나머지는 원래대로 돌린다',result:'세라는 선택받은 한 장을 매일 닦았습니다. 유진과 채린은 그 정도가 피해를 줄이는 타협이라고 받아들였습니다.',stability:3,obsession:5},
   {id:'office',text:'사진들을 세력 사무실의 상황판으로 옮긴다',result:'채린은 액자를 정보판으로 바꾸고 유진은 비상연락망을 붙였습니다. 세라는 당신 사진 옆에 자기 사진을 다시 끼웠습니다.',stability:5,faction:6}
  ]
 },
 {
  id:'faction_table',title:'공동생활 2개월 · 세력 회의의 세 자리',icon:'🦂',scene:'./assets/life-faction-war.png',
  desc:'세력 회의실에 세 개의 의자가 새로 놓였습니다. 유진은 합법적인 방어선을, 채린은 자금과 거점을, 세라는 누구도 기록하지 못한 사람들의 습관을 보고합니다.',
  speakers:[
   {name:'강유진',line:'세력을 키우는 건 상관없어요. 증거와 절차를 지키면 내가 방패가 될게요.'},
   {name:'한채린',line:'작은 조직 흉내는 그만둬. 내가 돈을 대면 적어도 무너지진 않아.'},
   {name:'윤세라',line:'배신할 사람은 표정만 봐도 알아요. 가까이서 계속 보면 더 잘 알 수 있고.'}
  ],
  choices:[
   {id:'roles',text:'유진은 법무·채린은 운영·세라는 정보 담당으로 선을 정한다',result:'세 사람은 서로의 보고서를 검증하며 이상할 만큼 효율적인 간부진이 됐습니다.',stability:9,faction:10},
   {id:'competition',text:'이번 달 가장 성과가 큰 사람에게 내 일정을 맡긴다',result:'세력의 실적은 올랐지만 당신의 일정이 세 사람의 전리품처럼 취급되기 시작했습니다.',stability:-4,obsession:8,faction:8},
   {id:'separate',text:'연애와 세력 업무를 분리하고 회의석을 치운다',result:'유진은 안도했고 채린은 비효율적이라 평했으며 세라는 회의실 밖에서 모든 대화를 들었습니다.',stability:2,obsession:-3}
  ]
 },
 {
  id:'closed_world',title:'공동생활 3개월 · 문 밖의 약속',icon:'🌙',scene:'./assets/event-trio-secure-home-ending.png',
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
 }
];

function ensure(life){
 if(!life.dangerousTrio||typeof life.dangerousTrio!=='object')life.dangerousTrio={active:false,queued:false,encountered:false,stage:0,stability:50,axes:{balance:0,containment:0,fracture:0},history:[],ending:null};
 const s=life.dangerousTrio;if(!s.axes)s.axes={balance:0,containment:0,fracture:0};if(!Array.isArray(s.history))s.history=[];return s;
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
  return{name,met:!!r,active,chapter,total,route,ready:active&&!!state&&completed&&accepted,
   need:!r?'아직 만나지 못함':!active?`현재 관계: ${r.status||'지인'} · 관계가 끊김`:!state||!completed?`개인 스토리 ${chapter}/${total} 진행`:accepted?`전용 결핍 엔딩 · ${ending.title}`:`현재 엔딩(${ending&&ending.title||'미정'})은 결핍 공생 조건과 다름`};
 });
 return rows;
}
function eligibility(life){
 const state=ensure(life),rows=progress(life),partner=!!life.partner&&NAMES.includes(life.partner.name);
 const poly=life.polycule||{},outsiders=(poly.members||[]).filter(person=>!NAMES.includes(person.name));
 const clean=!outsiders.length;
 const sera=rec(life,'윤세라');
 const legacyHome=life.seraHousing==null&&sera&&sera.pickedUpAfterRuin;
 const seraHome=(life.seraHousing==='cohabit'||legacyHome)&&!state.lockedOut;
 const guard=root.QT_ROMANCE_ROUTES&&root.QT_ROMANCE_ROUTES.canStart(life,'dangerous');
 return{ok:(!guard||guard.ok)&&!state.encountered&&!state.active&&!state.ending&&partner&&clean&&seraHome&&rows.every(row=>row.ready),partner,clean,seraHome,outsiders,rows,guard};
}
function queue(life){
 const check=eligibility(life),state=ensure(life);
 if(!check.ok||state.queued)return false;
 state.queued=true;
 return true;
}
function start(life){
 const check=eligibility(life);if(!check.ok)return{ok:false,check};
 if(root.QT_ROMANCE_ROUTES&&!root.QT_ROMANCE_ROUTES.begin(life,'dangerous').ok)return{ok:false,check:eligibility(life)};
 const state=ensure(life);state.active=true;state.queued=false;state.encountered=true;state.friendRoute=true;state.stage=Math.max(0,state.stage||0);state.stability=Math.max(50,state.stability||0);state.ending=null;
 NAMES.forEach(name=>{const r=rec(life,name);if(r){r.status='friend';r.trust=clamp((r.trust||0)+4,0,100);}});
 return{ok:true,state,chapter:CHAPTERS[state.stage]};
}
function next(life){const state=ensure(life);return state.active&&!state.ending?CHAPTERS[state.stage]||null:null;}
function endingFor(state){
 const a=state.axes||{};
 if((a.fracture||0)>=(a.balance||0)&&a.fracture>(a.containment||0))return{id:'war',title:'깨져버린 악우의 규칙',tone:'bad',text:'플레이어가 거듭 서열 경쟁을 부추기자 가짜 불화가 처음으로 실제 적대가 됐습니다. 서로의 약점을 가장 잘 아는 세 사람이 그 지식을 공격에 쓰기 시작했습니다.'};
 if((a.containment||0)>(a.balance||0))return{id:'golden_cage',title:'잠글 필요 없는 문',tone:'bad',text:'유진의 기록, 채린의 자원, 세라의 기억이 빈틈을 없앴습니다. 세 사람은 만족했고 주인공에게는 혼자일 시간이 사라졌습니다.'};
 return{id:'bad_friends',title:'쟤보다는 내가 정상',tone:'good',text:'세 사람은 끝내 서로를 좋아하지 않았습니다. 하지만 서로의 비정상을 가장 정확히 알아보는 악우가 되어, 위험한 균형 안에서 주인공을 함께 지켰습니다.'};
}
function apply(life,choiceId){
 const state=ensure(life),chapter=next(life);if(!chapter)return null;const choice=chapter.choices.find(c=>c.id===choiceId);if(!choice)return null;
 state.stability=clamp((state.stability||0)+(choice.stability||0),0,100);state.axes[choice.tag]=(state.axes[choice.tag]||0)+1;state.history.push({stage:state.stage,choice:choice.id,tag:choice.tag});
 NAMES.forEach(name=>{const r=rec(life,name);if(!r)return;r.trust=clamp((r.trust||0)+(choice.trust||0),0,100);r.affection=clamp((r.affection||0)+(choice.tag==='fracture'?-2:3),0,100);if(choice.obsession)r.obsession=clamp((r.obsession||0)+choice.obsession,0,100);});
 state.stage++;if(state.stage>=CHAPTERS.length){state.ending=endingFor(state);state.active=false;if(root.QT_ROMANCE_ROUTES)root.QT_ROMANCE_ROUTES.complete(life,'dangerous',state.ending.id,state.ending.tone);}
 return{chapter,choice,state,ending:state.ending};
}
function monthly(life){
 const state=ensure(life);if(!state.active)return null;
 state.stability=clamp(state.stability+((state.axes.balance||0)>=(state.axes.fracture||0)?2:-4),0,100);
 return state.stability<=15?'세 사람의 신경전이 위험합니다. 누구도 먼저 물러설 생각이 없어 보입니다.':null;
}
function nextAftermath(life){
 const state=ensure(life);if(!state.ending)return null;
 if(!Number.isFinite(state.aftermathIndex))state.aftermathIndex=0;
 if(state.aftermathIndex>=AFTERMATH.length)return null;
 return AFTERMATH[state.aftermathIndex];
}
function applyAftermath(life,choiceId){
 const state=ensure(life),event=nextAftermath(life);if(!event)return null;
 const choice=event.choices.find(item=>item.id===choiceId);if(!choice)return null;
 state.stability=clamp((state.stability||0)+(choice.stability||0),0,100);
 NAMES.forEach(name=>{const r=rec(life,name);if(!r)return;r.trust=clamp((r.trust||0)+Math.sign(choice.stability||0)*2,0,100);if(choice.obsession)r.obsession=clamp((r.obsession||0)+choice.obsession,0,100);});
 state.aftermathIndex++;
 return{event,choice,state};
}
function compatibleCandidate(){return false;}

root.QT_DANGEROUS_TRIO={NAMES,CHAPTERS,AFTERMATH,ensure,progress,eligibility,queue,start,next,apply,monthly,nextAftermath,applyAftermath,compatibleCandidate};
})(window);
