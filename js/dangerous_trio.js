/* QuickTrade Life — 강유진 × 한채린 × 윤세라 결핍 공생 루트 */
(function(root){
'use strict';
const NAMES=['강유진','한채린','윤세라'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rec=(life,name)=>(life.met||[]).find(person=>person.name===name);

const CHAPTERS=[
 {
  title:'한 방에 모인 세 개의 결핍',icon:'🗝️',scene:'./assets/event-trio-first-meeting.png',
  desc:'유진은 출구와 신고 기록을, 채린은 건물의 소유권과 경호를, 세라는 당신의 휴대전화를 쥐고 있습니다. 누구도 상대를 좋아하지 않지만 셋 모두 당신이 사라지는 일만큼은 막고 싶어 합니다.',
  speakers:[
   {name:'강유진',line:'감시가 아니라 보호예요. 적어도 나는 법 안에서 움직여요.'},
   {name:'한채린',line:'법이 도착하기 전에 안전한 건 내 건물과 내 사람이죠.'},
   {name:'윤세라',line:'둘 다 늦어요. 나는 이 사람이 사라지기 전에 알아요.'}
  ],
  choices:[
   {id:'roles',tag:'balance',text:'각자 할 수 있는 일과 넘지 않을 선을 적게 한다',preview:'싫어하면서도 역할만은 인정하게 만든다',stability:12,trust:5,result:'유진은 공식 비상연락, 채린은 거처와 경호, 세라는 일상 이상 징후만 맡았습니다. 셋은 서로를 믿지 않기 때문에 오히려 기록을 더 철저히 남겼습니다.'},
   {id:'compete',tag:'fracture',text:'누가 나를 가장 잘 지키는지 증명해보라고 한다',preview:'결핍을 경쟁으로 자극한다',stability:-9,obsession:6,result:'세 사람은 물러서지 않았습니다. 당신의 한 달 일정이 보호 실적 경쟁표로 변하기 시작했습니다.'},
   {id:'surrender',tag:'containment',text:'휴대전화·열쇠·일정을 셋에게 모두 맡긴다',preview:'세 개의 감시망이 하나로 이어진다',stability:7,obsession:10,result:'누구 하나가 선을 넘으면 나머지 둘이 막겠다는 명분으로, 세 사람 모두 당신의 생활에 들어왔습니다.'}
  ]
 },
 {
  title:'쟤보다는 내가 정상',icon:'🦂',scene:'./assets/event-trio-first-meeting.png',
  desc:'결국 세 사람의 악우 같은 신경전이 폭발했습니다. 유진과 채린이 세라에게 스토킹을 그만두라고 몰아붙이자, 세라는 두 사람의 가장 아픈 결핍을 웃으며 그대로 되돌려줍니다.',
  speakers:[
   {name:'강유진',line:'집 앞에서 기다리고 동선을 외우는 건 보호가 아니라 스토킹이에요.'},
   {name:'한채린',line:'사람 하나 붙잡겠다고 품위까지 버리는 건 이해하기 어렵네요.'},
   {name:'윤세라',line:'유진 씨는 일부러 이 사람을 망가뜨려서 자기한테만 의지하게 만들잖아요. 채린 씨는… 매 맞는 여자가 꿈이었어요? 막대해줄 사람 찾느라 돈도 많이 쓰네요.'},
   {name:'목격자',line:'저 미친 여자들 제발 밖에 방생하지 말고 여기서 풀어. 셋이 서로 감시하면 남들은 좀 살겠다.'}
  ],
  choices:[
   {id:'same',tag:'balance',text:'“셋 다 똑같이 비정상이야”라고 잘라 말한다',preview:'누구의 편도 들지 않고 서로의 거울로 만든다',stability:14,trust:4,result:'세 사람은 동시에 당신을 노려봤다가, 처음으로 같은 이유로 침묵했습니다. 그날 이후 “쟤보단 정상”이라는 말은 셋만 아는 악우식 농담이 됐습니다.'},
   {id:'release',tag:'containment',text:'밖에서 사고 치지 말고 서로를 감시하라고 한다',preview:'목격자의 진심 어린 부탁을 받아들인다',stability:9,obsession:7,result:'셋은 모욕적이라며 반발했지만, 서로가 선을 넘는 순간 가장 먼저 지적하는 이상한 견제 관계가 생겼습니다.'},
   {id:'pickfight',tag:'fracture',text:'가장 정상인 사람이 누군지 계속 말해보라고 부추긴다',preview:'상처를 정확히 찌르는 싸움을 이어간다',stability:-14,obsession:5,result:'싸움은 새벽까지 이어졌고 각자는 당신을 자기 쪽으로 데려가려 했습니다. 셋의 결은 맞지만 아직 한 울타리에는 들어오지 못했습니다.'}
  ]
 },
 {
  title:'사라진 37분',icon:'🚨',scene:'./assets/event-trio-emergency.png',
  desc:'당신의 휴대전화가 꺼진 뒤 37분 동안 세 사람은 도시를 세 구역으로 나눴습니다. 유진은 사건 기록을 뒤졌고, 채린은 병원과 건물 출입망을 닫았으며, 세라는 당신이 마지막으로 남긴 말의 장소를 찾아냈습니다.',
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
  desc:'세 사람이 만든 집의 현관문은 열려 있습니다. 하지만 유진의 비상전화, 채린의 경호차량, 세라의 귀가표가 문 밖까지 이어집니다. 이것이 안전한 생활인지 공동 감금인지 마지막 이름을 붙여야 합니다.',
  speakers:[
   {name:'강유진',line:'나가도 돼요. 위험하면 가장 먼저 나를 부른다는 약속만 해요.'},
   {name:'한채린',line:'어디든 갈 수 있죠. 내가 준비한 곳 중에서 고른다면.'},
   {name:'윤세라',line:'문은 열려 있잖아요. 돌아오기만 하면 아무도 화내지 않아요.'}
  ],
  choices:[
   {id:'badfriends',tag:'balance',text:'서로가 선을 넘을 때 나머지 둘이 막는 관계로 산다',preview:'악우 같은 견제와 위험한 애정의 공존',stability:18,trust:8,result:'세 사람은 끝내 친해지지 않았습니다. 대신 누구 하나가 당신을 완전히 소유하려 하면 나머지 둘이 가장 잔인하게 그 모순을 지적했습니다.'},
   {id:'goldencage',tag:'containment',text:'세 사람이 만든 안전망 안에서만 살겠다고 약속한다',preview:'가장 안전하고 가장 빠져나오기 어려운 결말',stability:12,obsession:15,result:'문은 잠기지 않았습니다. 잠글 필요가 없어졌기 때문입니다. 당신이 갈 수 있는 모든 곳에는 이미 세 사람 중 하나가 기다리고 있습니다.'},
   {id:'chooseone',tag:'fracture',text:'오늘 여기서 한 사람만 선택하겠다고 선언한다',preview:'공생을 깨고 마지막 쟁탈전을 시작한다',stability:-25,obsession:10,result:'세 사람은 당신의 선택을 기다리지 않았습니다. 각자가 가진 권력과 기록과 기억으로, 나머지 둘을 먼저 밀어내기 시작했습니다.'}
  ]
 }
];

function ensure(life){
 if(!life.dangerousTrio||typeof life.dangerousTrio!=='object')life.dangerousTrio={active:false,queued:false,encountered:false,stage:0,stability:50,axes:{balance:0,containment:0,fracture:0},history:[],ending:null};
 const s=life.dangerousTrio;if(!s.axes)s.axes={balance:0,containment:0,fracture:0};if(!Array.isArray(s.history))s.history=[];return s;
}
function progress(life){
 const rows=NAMES.map(name=>{
  const r=rec(life,name);
  return{name,met:!!r,friend:!!r&&r.status==='friend',ready:!!r&&r.status==='friend',need:!r?'아직 만나지 못함':r.status!=='friend'?`현재 관계: ${r.status||'지인'} · 친구여야 함`:'친구로 연락 중'};
 });
 return rows;
}
function eligibility(life){
 const state=ensure(life),rows=progress(life),single=life.relationship==='single'&&!life.partner;
 const poly=life.polycule||{},clean=!poly.active&&!(poly.members||[]).length;
 const untouched=rows.every(row=>{const r=rec(life,row.name);return r&&!r.spentNight&&!r.dangerAwakened;});
 return{ok:!state.encountered&&!state.active&&!state.ending&&single&&clean&&untouched&&rows.every(row=>row.ready),single,clean,untouched,rows};
}
function queue(life){
 const check=eligibility(life),state=ensure(life);
 if(!check.ok||state.queued)return false;
 state.queued=true;
 return true;
}
function start(life){
 const check=eligibility(life);if(!check.ok)return{ok:false,check};
 const state=ensure(life);state.active=true;state.queued=false;state.encountered=true;state.friendRoute=true;state.stage=Math.max(0,state.stage||0);state.stability=Math.max(50,state.stability||0);state.ending=null;
 NAMES.forEach(name=>{const r=rec(life,name);if(r){r.status='friend';r.trust=clamp((r.trust||0)+4,0,100);}});
 return{ok:true,state,chapter:CHAPTERS[state.stage]};
}
function next(life){const state=ensure(life);return state.active&&!state.ending?CHAPTERS[state.stage]||null:null;}
function endingFor(state){
 const a=state.axes||{};
 if((a.fracture||0)>=(a.balance||0)&&a.fracture>(a.containment||0))return{id:'war',title:'세 개의 포위망',tone:'bad',text:'공생은 깨졌고 세 사람은 서로를 제거해야 당신을 가질 수 있다고 결론 내렸습니다. 주인공은 가장 위험한 쟁탈전의 중심이 됐습니다.'};
 if((a.containment||0)>(a.balance||0))return{id:'golden_cage',title:'잠글 필요 없는 문',tone:'bad',text:'유진의 기록, 채린의 자원, 세라의 기억이 빈틈을 없앴습니다. 세 사람은 만족했고 주인공에게는 혼자일 시간이 사라졌습니다.'};
 return{id:'bad_friends',title:'쟤보다는 내가 정상',tone:'good',text:'세 사람은 끝내 서로를 좋아하지 않았습니다. 하지만 서로의 비정상을 가장 정확히 알아보는 악우가 되어, 위험한 균형 안에서 주인공을 함께 지켰습니다.'};
}
function apply(life,choiceId){
 const state=ensure(life),chapter=next(life);if(!chapter)return null;const choice=chapter.choices.find(c=>c.id===choiceId);if(!choice)return null;
 state.stability=clamp((state.stability||0)+(choice.stability||0),0,100);state.axes[choice.tag]=(state.axes[choice.tag]||0)+1;state.history.push({stage:state.stage,choice:choice.id,tag:choice.tag});
 NAMES.forEach(name=>{const r=rec(life,name);if(!r)return;r.trust=clamp((r.trust||0)+(choice.trust||0),0,100);r.affection=clamp((r.affection||0)+(choice.tag==='fracture'?-2:3),0,100);if(choice.obsession)r.obsession=clamp((r.obsession||0)+choice.obsession,0,100);});
 state.stage++;if(state.stage>=CHAPTERS.length){state.ending=endingFor(state);state.active=false;}
 return{chapter,choice,state,ending:state.ending};
}
function monthly(life){
 const state=ensure(life);if(!state.active)return null;
 state.stability=clamp(state.stability+((state.axes.balance||0)>=(state.axes.fracture||0)?2:-4),0,100);
 return state.stability<=15?'세 사람의 신경전이 위험 단계입니다. 전용 이야기를 진행해 균형을 정해야 합니다.':null;
}
function compatibleCandidate(){return false;}

root.QT_DANGEROUS_TRIO={NAMES,CHAPTERS,ensure,progress,eligibility,queue,start,next,apply,monthly,compatibleCandidate};
})(window);
