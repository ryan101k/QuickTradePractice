/* QuickTrade Life — 독립 사업체·직원·월간 보고 엔진 */
(function(root){'use strict';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const finite=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;

const STAFF={
  corporate:{
    id:'corporate',name:'차서윤',role:'재무·계약 총괄',emoji:'📑',
    portrait:'mob-corporate.png',
    intro:'숫자와 계약서에서 먼저 위험을 찾아내는 총괄 실무자입니다.',
  },
  office:{
    id:'office',name:'박지수',role:'운영 매니저',emoji:'📋',
    portrait:'mob-office-neutral.png',portraitBase:'mob-office',
    intro:'재고와 고객 응대를 조용히 정리하는 운영 담당자입니다.',
  },
  creative:{
    id:'creative',name:'한이슬',role:'콘텐츠 제작 실장',emoji:'🎨',
    portrait:'mob-creative-neutral.png',portraitBase:'mob-creative',
    intro:'브랜드의 색과 제작 일정을 동시에 지키는 제작 책임자입니다.',
  },
  medical:{
    id:'medical',name:'오혜린',role:'현장 서비스 책임자',emoji:'🩺',
    portrait:'mob-medical.png',
    intro:'고객 안전과 근무표를 함께 책임지는 현장 관리자입니다.',
  },
};

const TYPES=[
  {
    id:'commerce',name:'온라인 유통사',icon:'📦',managerId:'office',
    cost:18000000,resaleRate:.58,baseSales:4100000,fixedCost:2600000,variance:.22,
    desc:'재고를 들여 온라인으로 판매합니다. 호황에는 강하지만 재고와 공급가 변동을 감당해야 합니다.',
    phase:{boom:1.16,overheating:1.10,recovery:1.06,tightening:.93,recession:.82,crisis:.72,stimulus:1.02},
  },
  {
    id:'studio',name:'콘텐츠 스튜디오',icon:'🎬',managerId:'creative',
    cost:24000000,resaleRate:.52,baseSales:5400000,fixedCost:3400000,variance:.30,
    desc:'영상·디자인 프로젝트를 수주합니다. 변동성이 크지만 평판과 좋은 계약이 쌓이면 빠르게 성장합니다.',
    phase:{boom:1.12,overheating:1.08,recovery:1.04,tightening:.91,recession:.86,crisis:.76,stimulus:1.08},
  },
  {
    id:'advisory',name:'기업 자문사',icon:'🏢',managerId:'corporate',
    cost:45000000,resaleRate:.65,baseSales:8200000,fixedCost:5500000,variance:.18,
    desc:'재무·계약·운영 자문을 제공합니다. 초기비용이 높지만 장기계약을 확보하면 비교적 안정적입니다.',
    phase:{boom:1.10,overheating:1.05,recovery:1.06,tightening:1.02,recession:.96,crisis:.92,stimulus:1.04},
  },
  {
    id:'care',name:'돌봄·웰니스 센터',icon:'🌿',managerId:'medical',
    cost:32000000,resaleRate:.60,baseSales:6100000,fixedCost:4100000,variance:.16,
    desc:'예약 기반 돌봄·건강관리 서비스를 운영합니다. 경기 방어적이지만 인력과 안전 기준을 낮출 수 없습니다.',
    phase:{boom:1.04,overheating:1.02,recovery:1.05,tightening:.99,recession:1.01,crisis:.96,stimulus:1.08},
  },
];

const EVENTS={
  commerce:[
    {
      id:'supplier_price',mood:'sad',title:'주요 공급처가 납품 단가를 올렸습니다',
      desc:'다음 달부터 원가가 크게 오릅니다. 기존 가격을 유지하면 마진이 줄고, 거래처를 바꾸면 품질 불만이 생길 수 있습니다.',
      line:'대표님, 숫자만 보면 거래처를 바꾸는 게 맞아요. 다만 단골들이 먼저 알아챌 겁니다.',
      choices:[
        {id:'negotiate',text:'직접 만나 장기계약으로 단가를 협상한다',preview:'비용 50만 · 평판과 성장에 소폭 도움',effects:{cash:-500000,reputation:3,morale:1,momentum:.06},outcome:'장기 물량을 약속하는 대신 급격한 인상은 막았습니다.'},
        {id:'switch',text:'더 싼 공급처로 빠르게 교체한다',preview:'비용 10만 · 단기 성장, 평판 위험',effects:{cash:-100000,reputation:-3,morale:-1,momentum:.11},outcome:'원가는 낮췄지만 품질 문의와 교환 요청이 늘었습니다.'},
        {id:'absorb',text:'이번 분기 가격을 유지하고 비용을 흡수한다',preview:'비용 120만 · 평판 크게 상승',effects:{cash:-1200000,reputation:6,morale:2,momentum:.08},outcome:'마진은 줄었지만 가격을 지킨 일이 단골들 사이에 알려졌습니다.'},
      ],
    },
  ],
  studio:[
    {
      id:'deadline',mood:'angry',title:'대형 의뢰가 들어왔지만 납기가 지나치게 짧습니다',
      desc:'계약을 따내면 이름을 알릴 수 있지만 현재 인원만으로 진행하면 제작진이 버티기 어렵습니다.',
      line:'할 수는 있어요. 그런데 “할 수 있다”와 “이렇게 해야 한다”는 같은 말이 아니에요.',
      choices:[
        {id:'outsource',text:'검증된 외주팀을 붙여 품질과 일정을 지킨다',preview:'비용 180만 · 사기와 성장 상승',effects:{cash:-1800000,reputation:5,morale:5,momentum:.16},outcome:'수익 일부를 포기했지만 결과물과 팀 모두를 지켰습니다.'},
        {id:'scope',text:'범위를 줄인 시험 프로젝트로 다시 제안한다',preview:'추가비용 없음 · 안정적인 선택',effects:{cash:0,reputation:2,morale:3,momentum:.05},outcome:'규모는 작아졌지만 다음 계약으로 이어질 발판을 만들었습니다.'},
        {id:'crunch',text:'전원이 밤샘해 원안 그대로 수주한다',preview:'추가비용 없음 · 성장 상승, 직원 사기 급락',effects:{cash:0,reputation:4,morale:-9,momentum:.12},outcome:'납품은 끝냈지만 회의실에 남은 사람들의 표정이 굳었습니다.'},
      ],
    },
  ],
  advisory:[
    {
      id:'exclusive_contract',mood:'neutral',title:'대형 고객이 장기 독점계약을 제안했습니다',
      desc:'선급금은 크지만 경쟁사와의 거래가 막히고, 계약 해석에 따라 책임 범위가 지나치게 넓어질 수 있습니다.',
      line:'좋은 계약은 서명하는 순간보다 빠져나올 때의 조건이 더 중요합니다.',
      choices:[
        {id:'review',text:'외부 법무 검토를 거쳐 책임 범위를 다시 협상한다',preview:'비용 250만 · 평판과 장기 성장 상승',effects:{cash:-2500000,reputation:7,morale:3,momentum:.17},outcome:'시간은 걸렸지만 독소조항을 걷어내고 장기 고객을 확보했습니다.'},
        {id:'accept',text:'선급금을 받고 원안대로 빠르게 서명한다',preview:'현금 +400만 · 장기 성장과 평판 위험',effects:{cash:4000000,reputation:-6,morale:-2,momentum:-.12},outcome:'계좌에는 돈이 들어왔지만 직원들은 계약서의 책임 조항을 걱정하기 시작했습니다.'},
        {id:'decline',text:'독점 없이 일할 수 있는 고객을 계속 찾는다',preview:'추가비용 없음 · 조직 안정',effects:{cash:0,reputation:2,morale:4,momentum:.02},outcome:'큰 계약은 놓쳤지만 회사의 선택권과 실무자들의 신뢰를 지켰습니다.'},
      ],
    },
  ],
  care:[
    {
      id:'overbooking',mood:'sad',title:'예약이 급증해 현장 인력이 부족합니다',
      desc:'예약을 모두 받으면 매출은 늘지만 돌봄의 질과 안전 확인 시간이 줄어듭니다.',
      line:'지금 더 받으면 숫자는 좋아집니다. 하지만 사고가 나면 그 숫자로 아무것도 되돌릴 수 없어요.',
      choices:[
        {id:'hire',text:'경력 인력을 추가 채용하고 교육한다',preview:'비용 200만 · 평판과 사기 크게 상승',effects:{cash:-2000000,reputation:7,morale:7,momentum:.13},outcome:'예약 대기시간이 줄고 현장 직원들도 다시 숨을 돌렸습니다.'},
        {id:'cap',text:'안전하게 감당할 수 있는 수만 예약받는다',preview:'추가비용 없음 · 안정성과 평판 상승',effects:{cash:0,reputation:4,morale:4,momentum:-.01},outcome:'당장의 매출보다 서비스 기준을 지켰고 소개 고객이 늘었습니다.'},
        {id:'overbook',text:'이번 달만 예약을 모두 받는다',preview:'현금 +150만 · 평판과 사기 급락',effects:{cash:1500000,reputation:-8,morale:-9,momentum:.06},outcome:'매출은 늘었지만 현장 실수와 불만 접수가 함께 쌓였습니다.'},
      ],
    },
  ],
};

function typeOf(id){return TYPES.find(type=>type.id===id)||null;}
function staffOf(id){return STAFF[id]||null;}
function portraitPath(staffId,mood){
  const person=staffOf(staffId);
  if(!person)return'';
  if(person.portraitBase&&['neutral','happy','sad','angry'].includes(mood)){
    return`./assets/characters/${person.portraitBase}-${mood}.png`;
  }
  return`./assets/characters/${person.portrait}`;
}
function ensure(life){
  if(!life.business||typeof life.business!=='object'){
    life.business={owned:[],reports:[],lastEventDay:0,sequence:0};
  }
  const state=life.business;
  if(!Array.isArray(state.owned))state.owned=[];
  if(!Array.isArray(state.reports))state.reports=[];
  state.lastEventDay=Math.max(0,Math.floor(finite(state.lastEventDay,0)));
  state.sequence=Math.max(0,Math.floor(finite(state.sequence,0)));
  state.lastNet=Math.round(finite(state.lastNet,0));
  state.owned=state.owned.filter(item=>item&&typeOf(item.typeId)).map(item=>({
    id:item.id||item.typeId,
    typeId:item.typeId,
    managerId:item.managerId||typeOf(item.typeId).managerId,
    level:clamp(Math.floor(finite(item.level,1)),1,5),
    months:Math.max(0,Math.floor(finite(item.months,0))),
    reputation:clamp(finite(item.reputation,45),0,100),
    morale:clamp(finite(item.morale,65),0,100),
    momentum:clamp(finite(item.momentum,0),-.35,.50),
    totalProfit:Math.round(finite(item.totalProfit,0)),
    lastSales:Math.round(finite(item.lastSales,0)),
    lastCost:Math.round(finite(item.lastCost,0)),
    lastNet:Math.round(finite(item.lastNet,0)),
    startedDay:Math.max(1,Math.floor(finite(item.startedDay,1))),
  }));
  return state;
}
function owned(life,id){return ensure(life).owned.find(item=>item.id===id||item.typeId===id)||null;}
function start(life,typeId,day){
  const state=ensure(life),type=typeOf(typeId);
  if(!type)return{ok:false,message:'알 수 없는 사업입니다.'};
  if(owned(life,typeId))return{ok:false,message:'이미 운영 중인 사업입니다.'};
  const item={
    id:type.id,typeId:type.id,managerId:type.managerId,level:1,months:0,
    reputation:45,morale:65,momentum:0,totalProfit:0,lastSales:0,lastCost:0,lastNet:0,
    startedDay:Math.max(1,Math.floor(finite(day,1))),
  };
  state.owned.push(item);
  return{ok:true,business:item,type,manager:staffOf(item.managerId),cost:type.cost};
}
function expansionCost(life,id){
  const item=owned(life,id),type=item&&typeOf(item.typeId);
  return item&&type?Math.round(type.cost*(.38+item.level*.12)):0;
}
function expand(life,id){
  const item=owned(life,id),type=item&&typeOf(item.typeId);
  if(!item||!type)return{ok:false,message:'운영 중인 사업을 찾지 못했습니다.'};
  if(item.level>=5)return{ok:false,message:'이미 최대 규모입니다.'};
  const cost=expansionCost(life,id);
  item.level++;
  item.morale=clamp(item.morale+4,0,100);
  item.momentum=clamp(item.momentum+.08,-.35,.50);
  return{ok:true,business:item,type,cost};
}
function resaleValue(life,id){
  const item=owned(life,id),type=item&&typeOf(item.typeId);
  if(!item||!type)return 0;
  const expansionValue=type.cost*(item.level-1)*.34;
  const reputationMul=.82+item.reputation/500;
  return Math.max(0,Math.round((type.cost+expansionValue)*type.resaleRate*reputationMul));
}
function close(life,id){
  const state=ensure(life),index=state.owned.findIndex(item=>item.id===id||item.typeId===id);
  if(index<0)return{ok:false,message:'운영 중인 사업을 찾지 못했습니다.'};
  const item=state.owned[index],type=typeOf(item.typeId),value=resaleValue(life,item.id);
  state.owned.splice(index,1);
  return{ok:true,business:item,type,value};
}
function assetValue(life){
  return ensure(life).owned.reduce((sum,item)=>sum+resaleValue(life,item.id),0);
}
function projected(item,phaseId){
  const type=typeOf(item.typeId);if(!type)return{sales:0,cost:0,net:0};
  const levelMul=1+(item.level-1)*.46;
  const phaseMul=(type.phase||{})[phaseId]||1;
  const qualityMul=.76+item.reputation*.004;
  const moraleMul=.86+item.morale*.0022;
  const sales=Math.round(type.baseSales*levelMul*phaseMul*qualityMul*moraleMul*(1+item.momentum));
  const cost=Math.round(type.fixedCost*(1+(item.level-1)*.37));
  return{sales,cost,net:sales-cost};
}
function reportLine(item){
  const type=typeOf(item.typeId),manager=staffOf(item.managerId),net=item.lastNet;
  if(net>=Math.max(1000000,type.baseSales*.28))return`${manager.name}: “이번 달은 매출과 현장 모두 안정적입니다. 다음 확장을 검토해도 됩니다.”`;
  if(net>=0)return`${manager.name}: “흑자는 지켰습니다. 다만 비용 한두 군데만 놓치면 바로 얇아질 수준입니다.”`;
  return`${manager.name}: “이번 달은 적자입니다. 숫자를 숨기지 않겠습니다. 다음 판단이 중요합니다.”`;
}
function eventPayload(life,item,day,random){
  const pool=EVENTS[item.typeId]||[];
  if(!pool.length)return null;
  const event=pool[Math.floor(random()*pool.length)]||pool[0];
  return{businessEvent:true,businessId:item.id,eventId:event.id,day};
}
function monthly(life,context){
  const state=ensure(life),ctx=context||{},random=typeof ctx.random==='function'?ctx.random:Math.random;
  const phaseId=ctx.phaseId||'recovery',day=Math.max(1,Math.floor(finite(ctx.day,1)));
  const reports=[];
  let totalSales=0,totalCost=0,totalNet=0,pendingEvent=null;
  state.owned.forEach(item=>{
    item.months++;
    const type=typeOf(item.typeId);
    const plan=projected(item,phaseId);
    const swing=1+(random()*2-1)*type.variance;
    const sales=Math.max(0,Math.round(plan.sales*swing));
    const cost=plan.cost;
    const net=sales-cost;
    item.lastSales=sales;item.lastCost=cost;item.lastNet=net;item.totalProfit+=net;
    item.reputation=clamp(item.reputation+(net>=0?.35:-.8),0,100);
    item.morale=clamp(item.morale+(net>=0?.2:-.6),0,100);
    item.momentum=clamp(item.momentum*.55,-.35,.50);
    totalSales+=sales;totalCost+=cost;totalNet+=net;
    reports.push({
      businessId:item.id,typeId:item.typeId,name:type.name,icon:type.icon,managerId:item.managerId,
      manager:staffOf(item.managerId).name,sales,cost,net,line:reportLine(item),day,
    });
  });
  const eventReady=state.owned.length&&day-state.lastEventDay>=2;
  const eventChance=Math.min(.62,.18+state.owned.length*.11);
  if(eventReady&&random()<eventChance){
    const item=state.owned[Math.floor(random()*state.owned.length)]||state.owned[0];
    pendingEvent=eventPayload(life,item,day,random);
    if(pendingEvent)state.lastEventDay=day;
  }
  state.reports=reports.concat(state.reports||[]).slice(0,24);
  state.lastNet=totalNet;
  return{sales:totalSales,cost:totalCost,net:totalNet,reports,event:pendingEvent};
}
function findEvent(typeId,eventId){return(EVENTS[typeId]||[]).find(event=>event.id===eventId)||null;}
function eventView(life,payload){
  const item=owned(life,payload&&payload.businessId);
  const type=item&&typeOf(item.typeId),event=type&&findEvent(type.id,payload.eventId);
  if(!item||!type||!event)return null;
  const manager=staffOf(item.managerId);
  return{
    payload,item,type,event,manager,
    portrait:portraitPath(manager.id,event.mood||'neutral'),
    choices:event.choices.map(choice=>({
      id:choice.id,text:choice.text,preview:choice.preview,cash:finite(choice.effects.cash,0),
    })),
  };
}
function resolveEvent(life,payload,choiceId){
  const view=eventView(life,payload);if(!view)return{ok:false,message:'사업 보고를 찾지 못했습니다.'};
  const choice=view.event.choices.find(item=>item.id===choiceId);
  if(!choice)return{ok:false,message:'선택지를 찾지 못했습니다.'};
  const effects=choice.effects||{},item=view.item;
  item.reputation=clamp(item.reputation+finite(effects.reputation,0),0,100);
  item.morale=clamp(item.morale+finite(effects.morale,0),0,100);
  item.momentum=clamp(item.momentum+finite(effects.momentum,0),-.35,.50);
  const mood=finite(effects.morale,0)<0||finite(effects.reputation,0)<0?'sad':finite(effects.morale,0)>=4?'happy':'neutral';
  return{
    ok:true,cash:Math.round(finite(effects.cash,0)),outcome:choice.outcome,
    mood,portrait:portraitPath(view.manager.id,mood),manager:view.manager,type:view.type,business:item,
    detail:`평판 ${Math.round(item.reputation)} · 직원 사기 ${Math.round(item.morale)} · 다음 달 흐름 ${item.momentum>=0?'+':''}${Math.round(item.momentum*100)}%`,
  };
}

root.QT_BUSINESS={
  STAFF,TYPES,EVENTS,ensure,typeOf,staffOf,portraitPath,owned,start,expand,expansionCost,
  resaleValue,close,assetValue,projected,monthly,eventView,resolveEvent,
};
})(window);
