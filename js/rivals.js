/* QuickTrade Life — AI 라이벌·경쟁·범죄 리스크 엔진 (게임용 추상 규칙) */
(function(root){
  'use strict';
  const PERSONAS=[
    {name:'🤖 개미봇',style:'random',income:1800000,skill:.75,aggression:.15},
    {name:'📊 퀀트김',style:'momentum',income:4500000,skill:1.15,aggression:.22},
    {name:'🐢 존버박',style:'value',income:3200000,skill:.95,aggression:.08},
    {name:'🏦 재벌최',style:'value',income:6500000,skill:1.05,aggression:.28},
    {name:'⚡ 스캘퍼윤',style:'momentum',income:3800000,skill:1.30,aggression:.35},
    {name:'🧪 바이오문',style:'random',income:5200000,skill:1.10,aggression:.25},
    {name:'🦈 작전왕',style:'momentum',income:2500000,skill:1.25,aggression:.55},
  ];
  const ACTIONS=[
    {id:'research',label:'🔎 경쟁사 분석',cost:300000,success:.85,damage:.025,illegal:false,desc:'합법·저위험'},
    {id:'recruit',label:'🤝 핵심인재 영입',cost:1200000,success:.70,damage:.05,illegal:false,desc:'합법·고비용'},
    {id:'smear',label:'🕶️ 음해 공작',cost:500000,success:.65,damage:.08,illegal:true,detect:.20,jail:[1,2],fine:[2000000,7000000],desc:'불법·적발 20%'},
    {id:'rig',label:'🚨 불법 시세공작',cost:2000000,success:.60,damage:.15,illegal:true,detect:.45,jail:[3,8],fine:[10000000,50000000],desc:'중범죄·적발 45%'},
    {id:'alliance',label:'🤝 공동사업 제안',cost:1500000,success:.72,damage:0,illegal:false,desc:'관계 개선·상호 방어'},
    {id:'poach',label:'🏢 건물 임차인 빼오기',cost:2500000,success:.58,damage:.065,illegal:false,desc:'사업자산 타격'},
    {id:'counterintel',label:'🛡️ 방첩망 구축',cost:1800000,success:1,damage:0,illegal:false,desc:'다음 공격 방어 강화'},
  ];
  const ASSETS=[{id:'office',icon:'🏢',name:'도심 사무실',value:30000000},{id:'store',icon:'🏬',name:'상가 지분',value:70000000},{id:'media',icon:'📡',name:'미디어 채널',value:45000000},{id:'fund',icon:'💼',name:'비공개 펀드',value:100000000}];
  const rand=(a,b)=>a+Math.random()*(b-a), pick=a=>a[Math.floor(Math.random()*a.length)];
  function createBots(){return PERSONAS.map((p,i)=>({...p,capital:1000000,owned:{},assets:i%3===0?[{...ASSETS[i%ASSETS.length]}]:[],relations:{},defense:.05,jailMonths:0,criminalRecord:0,monthlyProfit:0}));}
  function settleBots(bots){
    const news=[];
    bots.forEach(b=>{
      if(b.jailMonths>0){b.jailMonths--;b.monthlyProfit=0;news.push(`⛓️ ${b.name} 수감 중 (${b.jailMonths+1}개월째)`);return;}
      const salary=Math.round(b.income*rand(.7,1.2));
      // 투자 성과 — 실력이 높으면 우상향 드리프트, 하지만 손실도 난다(쭉 오르기만 하지 않게)
      const drift=(b.skill-1)*0.02;
      const trade=Math.round(b.capital*(rand(-0.11,0.11)+drift));
      const profit=salary+trade; b.capital=Math.max(0,b.capital+profit); b.monthlyProfit=profit;
      if(trade<=-Math.max(300000,b.capital*0.07)) news.push(`📉 ${b.name} 투자 손실 ${trade.toLocaleString('ko-KR')}원`);
      else if(trade>=Math.max(300000,b.capital*0.09)) news.push(`📈 ${b.name} 투자 대박 +${trade.toLocaleString('ko-KR')}원`);
      if(Math.random()<.06){const windfall=Math.round(rand(-9000000,11000000)*b.skill);b.capital=Math.max(0,b.capital+windfall);news.push(`${windfall>=0?'💰':'💥'} ${b.name} ${windfall>=0?'뜻밖의 횡재 +':'사고로 손실 '}${windfall.toLocaleString('ko-KR')}원`);}
      if(b.capital>35000000&&Math.random()<.08){const a={...pick(ASSETS)};if(b.capital>a.value){b.capital-=a.value;b.assets=b.assets||[];b.assets.push(a);news.push(`${a.icon} ${b.name}이 ${a.name}을 확보해 세력을 넓혔습니다`);}}
    }); return news;
  }
  // 라이벌끼리 서로 공격 — 공격성에 비례, 불법이면 적발·수감 위험
  function botsFight(bots){
    const news=[], live=bots.filter(b=>b.jailMonths<=0);
    live.forEach(att=>{
      if(Math.random()>att.aggression*0.55)return;
      const targets=live.filter(t=>t!==att&&t.jailMonths<=0);if(!targets.length)return;
      const target=pick(targets), illegal=att.aggression>0.4&&Math.random()<0.5;
      if(illegal&&Math.random()<0.28){att.jailMonths=Math.ceil(rand(2,6));att.criminalRecord=(att.criminalRecord||0)+1;news.push(`🚨 ${att.name}의 ${target.name} 대상 불법 공작이 적발돼 수감됐습니다`);return;}
      const relation=(att.relations&&att.relations[target.name])||0;
      if(relation>35&&Math.random()<.55){news.push(`🤝 ${att.name}: “지금은 ${target.name}와 싸울 때가 아닙니다.” · 양측이 공동 방어를 확인했습니다`);return;}
      if(Math.random()>(.6-(target.defense||0))){news.push(`🛡️ ${target.name}: “그 정도 수는 이미 읽었습니다.” · ${att.name}의 견제를 막아냈습니다`);return;}
      const dmg=Math.round(Math.max(200000,target.capital*rand(0.02,illegal?0.09:0.045)));
      target.capital=Math.max(0,target.capital-dmg);att.capital+=Math.round(dmg*(illegal?0.5:0.2));
      att.relations=att.relations||{};target.relations=target.relations||{};att.relations[target.name]=(att.relations[target.name]||0)-12;target.relations[att.name]=(target.relations[att.name]||0)-18;
      news.push(`⚔️ ${att.name} → ${target.name} ${illegal?'불법 공작':'경쟁 견제'} 타격 ${dmg.toLocaleString('ko-KR')}원`);
    });
    return news;
  }
  function act(player,target,actionId){
    const a=ACTIONS.find(x=>x.id===actionId);if(!a||!target)return{ok:false,message:'대상을 찾을 수 없습니다.'};
    if(player.jailMonths>0)return{ok:false,message:'수감 중에는 경쟁 행동을 할 수 없습니다.'};
    if(player.cash<a.cost)return{ok:false,message:'행동 비용이 부족합니다.'};
    player.cash-=a.cost;
    if(a.id==='counterintel'){player.tempDefense=(player.tempDefense||0)+.22;return{ok:true,success:true,cash:player.cash,damage:0,message:'방첩망을 구축했습니다. 다음 공격 방어율이 크게 오릅니다.'};}
    if(a.id==='alliance'){const success=Math.random()<a.success;target.playerRelation=(target.playerRelation||0)+(success?22:-6);if(success)target.defense=Math.min(.55,(target.defense||0)+.04);return{ok:true,success,cash:player.cash,damage:0,message:success?`${target.name}와 공동사업·상호불가침에 합의했습니다.`:`${target.name}이 제안을 의심하며 거절했습니다.`};}
    if(a.illegal&&Math.random()<a.detect){
      const jail=Math.ceil(rand(a.jail[0],a.jail[1])),fine=Math.round(rand(a.fine[0],a.fine[1]));
      player.cash-=fine;player.jailMonths=jail;player.criminalRecord=(player.criminalRecord||0)+1;
      return{ok:true,detected:true,cash:player.cash,jail,fine,message:`수사기관에 적발! 벌금 ${fine.toLocaleString('ko-KR')}원·징역 ${jail}개월`};
    }
    const success=Math.random()<a.success;
    const damage=success?Math.min(target.capital,Math.max(100000,Math.round(target.capital*a.damage))):0;
    if(success){target.capital-=damage;player.cash+=Math.round(damage*(a.illegal?.55:.20));}
    return{ok:true,success,cash:player.cash,damage,message:success?`${target.name}에 타격 ${damage.toLocaleString('ko-KR')}원`:'공작이 실패했습니다.'};
  }
  function attackPlayer(bots,playerWorth){
    const candidates=bots.filter(b=>b.jailMonths<=0&&Math.random()<b.aggression*.30);if(!candidates.length)return null;
    const attacker=pick(candidates),illegal=attacker.aggression>.4&&Math.random()<.55;
    if(illegal&&Math.random()<.30){attacker.jailMonths=Math.ceil(rand(2,6));attacker.criminalRecord++;return{attacker,caught:true,loss:0,message:`${attacker.name}의 불법 공작이 적발되어 수감됐습니다.`};}
    const loss=Math.round(Math.max(100000,playerWorth*rand(.01,illegal?.08:.035)));
    return{attacker,caught:false,illegal,loss,message:`${attacker.name}의 ${illegal?'불법 공작':'경쟁 견제'}로 ${loss.toLocaleString('ko-KR')}원 피해`};
  }
  function ensureFaction(life){
    if(!life.faction)life.faction={name:'내 세력',level:0,xp:0,defense:0,intel:0,lastAttacker:null,wins:0,assets:[],diplomacy:[]};
    if(!Array.isArray(life.faction.assets))life.faction.assets=[];if(!Array.isArray(life.faction.diplomacy))life.faction.diplomacy=[];
    return life.faction;
  }
  function buildFaction(life,cash){
    const f=ensureFaction(life),cost=f.level?Math.round(1500000*(f.level+1)):2000000;
    if(cash<cost)return{ok:false,cash,message:`세력 정비 비용 ${cost.toLocaleString('ko-KR')}원이 필요합니다.`};
    f.level=Math.min(5,f.level+1);f.defense=Math.min(.68,.12+f.level*.1);f.intel=Math.min(.55,.08+f.level*.08);
    const bases=[{icon:'🏚️',name:'골목 사무실'},{icon:'☕',name:'정보원 카페'},{icon:'🏢',name:'세력 본부'},{icon:'📡',name:'미디어 상황실'},{icon:'🏙️',name:'도심 연합타워'}];if(f.assets.length<f.level)f.assets.push(bases[f.level-1]);
    return{ok:true,cash:cash-cost,cost,message:`${f.name}이 ${f.level}단계가 됐습니다. 방어율 ${Math.round(f.defense*100)}%`};
  }
  function defendAttack(life,attack){
    const f=ensureFaction(life);if(!attack||attack.caught)return attack;
    f.lastAttacker=attack.attacker&&attack.attacker.name;
    const certBonus=((life.career&&life.career.certifications)||[]).includes('security')?.12:0,temporary=f.tempDefense||0;f.tempDefense=0;
    if(!f.level&&!certBonus&&!temporary)return attack;
    if(Math.random()<Math.min(.9,f.defense+certBonus+temporary)){attack.blocked=true;attack.originalLoss=attack.loss;attack.loss=0;attack.message=`🛡️ ${f.name}이 ${f.lastAttacker}의 공작을 막아냈습니다.`;return attack;}
    const cut=Math.round(attack.loss*f.defense*.65);attack.loss=Math.max(0,attack.loss-cut);attack.mitigated=cut;
    attack.message+=` · 세력 방어로 ${cut.toLocaleString('ko-KR')}원 경감`;
    return attack;
  }
  function revenge(life,bots,targetIndex,cash){
    const f=ensureFaction(life),target=bots[targetIndex];
    if(!target)return{ok:false,cash,message:'복수할 대상을 찾을 수 없습니다.'};
    if(!f.level)return{ok:false,cash,message:'먼저 내 세력을 만들어야 합니다.'};
    const cost=500000+f.level*250000;if(cash<cost)return{ok:false,cash,message:`작전비 ${cost.toLocaleString('ko-KR')}원이 부족합니다.`};
    const chance=Math.min(.88,.42+f.level*.09+f.intel*.25),success=Math.random()<chance;
    const damage=success?Math.min(target.capital,Math.round(Math.max(300000,target.capital*(.035+f.level*.018)))):0;
    if(success){target.capital-=damage;f.wins++;f.xp+=12;}else f.xp+=3;
    return{ok:true,success,cash:cash-cost,cost,damage,message:success?`${f.name}의 역공 성공! ${target.name}에게 ${damage.toLocaleString('ko-KR')}원 타격`:`${target.name}이 역공을 눈치채 피해 갔습니다.`};
  }
  root.QT_RIVALS={PERSONAS,ACTIONS,ASSETS,createBots,settleBots,botsFight,act,attackPlayer,ensureFaction,buildFaction,defendAttack,revenge};
})(window);
