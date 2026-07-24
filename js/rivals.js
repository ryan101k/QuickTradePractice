/* QuickTrade Life — AI 라이벌·경쟁·범죄 리스크 엔진 (게임용 추상 규칙) */
(function(root){
  'use strict';
  const PERSONAS=[
    {name:'🦁 태양',leader:'태양',faction:'태양캐피탈',portrait:'taeyang-v2-neutral.webp',style:'value',income:6500000,skill:1.16,aggression:.34},
    {name:'📹 수빈',leader:'수빈',faction:'수빈 라이브',portrait:'subin-v2-neutral.webp',style:'momentum',income:3800000,skill:1.08,aggression:.31},
    {name:'🕶️ 지우',leader:'지우',faction:'무명 브로커 연합',portrait:'jiwoo-v2-neutral.webp',style:'random',income:2300000,skill:.92,aggression:.42},
    {name:'📊 퀀트김',leader:'김도현',faction:'QK 시스템즈',portrait:'mob-faction-intel.png',style:'momentum',income:4500000,skill:1.15,aggression:.22},
    {name:'🏦 재벌최',leader:'최 회장',faction:'한성그룹',style:'value',income:7200000,skill:1.05,aggression:.28},
    {name:'🧪 바이오문',leader:'문 박사',faction:'문바이오 조합',style:'random',income:5200000,skill:1.10,aggression:.25},
    {name:'🦈 장태식',leader:'장태식',faction:'태식 사채라인',portrait:'taesik-v2-neutral.webp',style:'momentum',income:2500000,skill:1.25,aggression:.55},
  ];
  const REACTION_LINES={
    '태양':{
      wary:'“수익률이 아니라 자금의 출처부터 다시 보겠습니다.”',
      defensive:'“보유 지분을 정리하고 방어 자금을 확보합니다. 쉽게 흔들릴 회사가 아닙니다.”',
      desperate:'“조건을 말하시죠. 서로 다치기 전에 거래로 끝낼 수 있습니다.”',
      collapse:'“내가 쌓은 회사를 숫자 몇 줄로 끝낼 수는 없습니다.”',
      bankrupt:'“태양캐피탈의 이름은 오늘부로 내려갑니다.”'
    },
    '수빈':{
      wary:'“방송에서는 웃겠지만, 뒤에서는 누가 움직이는지 찾고 있어요.”',
      defensive:'“채널과 광고주를 지킬 겁니다. 여론전이라면 나도 물러서지 않아요.”',
      desperate:'“이게 공개되면 우리 둘 다 상처예요. 조용히 합의해요.”',
      collapse:'“카메라가 꺼져도 끝난 건 아니라고 믿었는데…”',
      bankrupt:'“수빈 라이브는 여기서 방송을 종료합니다.”'
    },
    '지우':{
      wary:'“내 뒤를 캐고 있군. 다음에는 흔적도 못 찾을 거야.”',
      defensive:'“정보원을 옮기고 장부를 닫았다. 이제부터는 서로 그림자만 보겠지.”',
      desperate:'“돈으로 끝낼 수 있을 때 끝내. 아니면 누가 먼저 사라질지 보자고.”',
      collapse:'“브로커는 이름이 없어도 다시 생겨. 하지만 이번 이름은 끝났군.”',
      bankrupt:'“무명 브로커 연합은 흔적을 지우고 해산했습니다.”'
    },
    '김도현':{
      wary:'“모델 밖 변수가 확인됐습니다. 당신을 위험요인으로 재분류합니다.”',
      defensive:'“현금 비중과 방어 알고리즘을 동시에 올렸습니다.”',
      desperate:'“파산 확률이 허용치를 넘었습니다. 합리적인 합의를 제안합니다.”',
      collapse:'“모델은 맞았습니다. 대응할 시간이 부족했을 뿐입니다.”',
      bankrupt:'“QK 시스템즈의 운용을 영구 중단합니다.”'
    },
    '최 회장':{
      wary:'“젊은 사람이 선을 넘는군. 거래처부터 단속하게.”',
      defensive:'“계열사와 은행을 묶어 방어해. 돈의 체급이 무엇인지 보여주지.”',
      desperate:'“원하는 계열사를 말해 보게. 그룹 전체를 태울 필요는 없지 않나.”',
      collapse:'“한성이라는 간판이 내 대에서 내려갈 줄은 몰랐군.”',
      bankrupt:'“한성그룹은 법정관리와 해체 절차에 들어갔습니다.”'
    },
    '문 박사':{
      wary:'“연구보다 투자자의 시선이 더 위험해졌군요.”',
      defensive:'“특허와 연구소를 분리해 핵심 자산부터 지키겠습니다.”',
      desperate:'“연구는 살려주십시오. 경영권과 자산은 협상할 수 있습니다.”',
      collapse:'“결과를 증명할 시간만 조금 더 있었다면…”',
      bankrupt:'“문바이오 조합의 연구와 운용이 중단됐습니다.”'
    },
    '장태식':{
      wary:'“이제야 내 장부를 들여다보는 눈이 생겼네.”',
      defensive:'“돈줄을 옮겼다. 네가 배운 수로 스승을 잡을 수 있을지 보자.”',
      desperate:'“받을 돈과 줄 돈을 정리하자. 이 바닥도 끝낼 때는 계산이 필요해.”',
      collapse:'“사람은 남았는데 돈줄이 끊겼군. 이게 세력의 마지막이야.”',
      bankrupt:'“태식 사채라인은 해산했습니다. 남은 채권은 법정 절차로 넘어갑니다.”'
    }
  };
  const ACTIONS=[
    {id:'research',label:'🔎 경쟁사 분석',cost:300000,success:.85,damage:.025,illegal:false,desc:'합법·저위험'},
    {id:'recruit',label:'🤝 경쟁사 인재 빼오기',cost:1200000,success:.70,damage:.05,illegal:false,desc:'상대 조직 타격'},
    {id:'smear',label:'🕶️ 음해 공작',cost:500000,success:.65,damage:.08,illegal:true,detect:.20,jail:[1,2],fine:[2000000,7000000],desc:'불법·적발 20%'},
    {id:'rig',label:'🚨 불법 시세공작',cost:2000000,success:.60,damage:.15,illegal:true,detect:.45,jail:[3,8],fine:[10000000,50000000],desc:'중범죄·적발 45%'},
    {id:'alliance',label:'🤝 공동사업 제안',cost:1500000,success:.72,damage:0,illegal:false,desc:'관계 개선·상호 방어'},
    {id:'poach',label:'🏢 건물 임차인 빼오기',cost:2500000,success:.58,damage:.065,illegal:false,desc:'사업자산 타격'},
    {id:'counterintel',label:'🛡️ 방첩망 구축',cost:1800000,success:1,damage:0,illegal:false,desc:'다음 공격 방어 강화'},
  ];
  const ASSETS=[{id:'office',icon:'🏢',name:'도심 사무실',value:30000000},{id:'store',icon:'🏬',name:'상가 지분',value:70000000},{id:'media',icon:'📡',name:'미디어 채널',value:45000000},{id:'fund',icon:'💼',name:'비공개 펀드',value:100000000}];
  const ROLE_LABELS={
    field:{icon:'🛡️',name:'현장·경호'}, intel:{icon:'🔎',name:'정보·분석'}, operations:{icon:'📦',name:'운영·물류'},
    legal:{icon:'⚖️',name:'법률'}, medical:{icon:'🩺',name:'의료'}, guardian:{icon:'🤜',name:'특별 호위'},
    broker:{icon:'🕶️',name:'브로커'}, media:{icon:'📹',name:'언론'}, leader:{icon:'🏢',name:'세력 수장'}
  };
  const MOB_RECRUITS=[
    {id:'mob-field',name:'현장 인력 모집',role:'field',portrait:'mob-faction-field.png',cost:1200000,upkeep:150000,loyalty:55,stats:{defense:.075,intel:.01,income:350000},names:['김성호','박기철','오민석','이현준','정우람'],desc:'거점 경비와 현장 대응을 맡으며 경호·회수 업무로 수입을 만든다.'},
    {id:'mob-intel',name:'정보 인력 모집',role:'intel',portrait:'mob-faction-intel.png',cost:1500000,upkeep:180000,loyalty:50,stats:{defense:.015,intel:.085,income:450000},names:['강도현','문재호','배준영','윤정민','최인호'],desc:'시세·언론·경쟁 세력을 추적하며 조사 의뢰와 정보 거래 수입을 만든다.'},
  ];
  const rand=(a,b)=>a+Math.random()*(b-a), pick=a=>a[Math.floor(Math.random()*a.length)];
  function createBots(){return PERSONAS.map((p,i)=>{
    const assets=i%3===0?[{...ASSETS[i%ASSETS.length]}]:[];
    const initial=1000000+assets.reduce((sum,a)=>sum+(a.value||0),0);
    return{...p,capital:1000000,owned:{},assets,relations:{},defense:.05,jailMonths:0,criminalRecord:0,monthlyProfit:0,
      initialWorth:initial,peakWorth:initial,pressure:0,credibility:100,reactionStage:'stable',reactionHistory:[],bankrupt:false,settlementOffer:null};
  });}
  const campaign=()=>root.QT_CAMPAIGN;
  function reactionLine(bot,stage){
    const lines=REACTION_LINES[bot&&bot.leader]||{};
    return lines[stage]||'상대 세력이 상황을 다시 계산하고 있습니다.';
  }
  function structuralWorth(bot){return campaign()?campaign().rivalWorth(bot):Math.max(0,(bot.capital||0)+(bot.assets||[]).reduce((s,a)=>s+(a.value||0),0));}
  function updateReaction(bot,month){
    if(!bot)return{changed:false,after:'stable',line:''};
    const c=campaign();if(!c)return{changed:false,after:bot.reactionStage||'stable',line:''};
    const result=c.updateRival(bot,structuralWorth(bot),month);
    result.line=reactionLine(bot,result.after);
    return result;
  }
  function applyPressure(bot,amount,credibilityLoss,month){
    if(!bot||bot.bankrupt)return updateReaction(bot,month);
    bot.pressure=Math.min(100,Math.max(0,(bot.pressure||0)+amount));
    bot.credibility=Math.min(100,Math.max(0,(bot.credibility==null?100:bot.credibility)-credibilityLoss));
    return updateReaction(bot,month);
  }
  function settleBots(bots){
    const news=[];
    bots.forEach(b=>{
      if(b.bankrupt){b.monthlyProfit=0;return;}
      const reaction=updateReaction(b);
      if(reaction.changed)news.push(`📣 ${b.name}의 대응 단계가 '${reaction.after}'(으)로 바뀌었습니다 · ${reaction.line}`);
      if(b.jailMonths>0){b.jailMonths--;b.monthlyProfit=0;news.push(`⛓️ ${b.name} 수감 중 (${b.jailMonths+1}개월째)`);return;}
      const stageMul={stable:1,wary:.94,defensive:.78,desperate:.55,collapse:.25}[reaction.after]||1;
      const salary=Math.round(b.income*stageMul*rand(.7,1.2));
      // 투자 성과 — 실력이 높으면 우상향 드리프트, 하지만 손실도 난다(쭉 오르기만 하지 않게)
      const drift=(b.skill-1)*0.02;
      const trade=Math.round(b.capital*(rand(-0.11,0.11)+drift));
      const profit=salary+trade; b.capital=Math.max(0,b.capital+profit); b.monthlyProfit=profit;
      if(trade<=-Math.max(300000,b.capital*0.07)) news.push(`📉 ${b.name} 투자 손실 ${trade.toLocaleString('ko-KR')}원`);
      else if(trade>=Math.max(300000,b.capital*0.09)) news.push(`📈 ${b.name} 투자 대박 +${trade.toLocaleString('ko-KR')}원`);
      if(Math.random()<.06){const windfall=Math.round(rand(-9000000,11000000)*b.skill);b.capital=Math.max(0,b.capital+windfall);news.push(`${windfall>=0?'💰':'💥'} ${b.name} ${windfall>=0?'뜻밖의 횡재 +':'사고로 손실 '}${windfall.toLocaleString('ko-KR')}원`);}
      if(reaction.after==='defensive'&&(b.assets||[]).length&&Math.random()<.18){
        const asset=b.assets.slice().sort((a,c)=>(a.value||0)-(c.value||0))[0];
        const recovered=Math.round((asset.value||0)*.68);b.assets=b.assets.filter(a=>a!==asset);b.capital+=recovered;
        news.push(`🏷️ ${b.name}이 방어 자금 확보를 위해 ${asset.name}을 급매했습니다 · ${reactionLine(b,'defensive')}`);
      }else if(b.capital>35000000&&reaction.after==='stable'&&Math.random()<.08){const a={...pick(ASSETS)};if(b.capital>a.value){b.capital-=a.value;b.assets=b.assets||[];b.assets.push(a);news.push(`${a.icon} ${b.name}이 ${a.name}을 확보해 세력을 넓혔습니다`);}}
      if(['desperate','collapse'].includes(reaction.after)&&!b.settlementOffer&&b.capital>1500000&&Math.random()<.30){
        b.settlementOffer=Math.min(5000000,Math.max(500000,Math.round(b.capital*.12)));
        news.push(`📞 ${b.name}이 휴전 협상을 요청했습니다 · ${reactionLine(b,'desperate')}`);
      }
      const afterReaction=updateReaction(b);
      if(afterReaction.changed)news.push(`📣 ${b.name}이 재무 악화를 인정했습니다 · ${afterReaction.line}`);
      const arc=root.QT_CHARACTER_STORIES&&root.QT_CHARACTER_STORIES.WORLD_ARCS&&root.QT_CHARACTER_STORIES.WORLD_ARCS[b.leader];
      if(arc&&Math.random()<.045)news.push(`🗞️ [${b.faction||b.name}] ${pick(arc.chapters)} · ${arc.theme}`);
    }); return news;
  }
  // 라이벌끼리 서로 공격 — 공격성에 비례, 불법이면 적발·수감 위험
  function botsFight(bots){
    const news=[], live=bots.filter(b=>!b.bankrupt&&b.jailMonths<=0);
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
    if(target.bankrupt)return{ok:false,message:'이미 파산·해산한 세력입니다.'};
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
    let reaction=null;
    if(success){target.capital-=damage;player.cash+=Math.round(damage*(a.illegal?.55:.20));reaction=applyPressure(target,a.damage>=.1?20:10,a.damage>=.1?14:7);}
    return{ok:true,success,cash:player.cash,damage,reaction,message:success?`${target.name}에 타격 ${damage.toLocaleString('ko-KR')}원${reaction&&reaction.changed?` · ${reaction.line}`:''}`:'공작이 실패했습니다.'};
  }
  function attackPlayer(bots,playerWorth,month){
    const candidates=bots.filter(b=>!b.bankrupt&&b.jailMonths<=0&&(!b.truceUntil||b.truceUntil<=(month||0))&&Math.random()<b.aggression*.30*(b.reactionStage==='desperate'?1.45:b.reactionStage==='collapse'?1.7:1));if(!candidates.length)return null;
    const attacker=pick(candidates),illegal=attacker.aggression>.4&&Math.random()<.55;
    if(illegal&&Math.random()<.30){attacker.jailMonths=Math.ceil(rand(2,6));attacker.criminalRecord++;return{attacker,caught:true,loss:0,message:`${attacker.name}의 불법 공작이 적발되어 수감됐습니다.`};}
    const loss=Math.round(Math.max(100000,playerWorth*rand(.01,illegal?.08:.035)));
    return{attacker,caught:false,illegal,loss,message:`${attacker.name}의 ${illegal?'불법 공작':'경쟁 견제'}로 ${loss.toLocaleString('ko-KR')}원 피해 · ${reactionLine(attacker,attacker.reactionStage||'wary')}`};
  }
  function ensureFaction(life){
    if(!life.faction)life.faction={name:'내 세력',level:0,xp:0,defense:0,intel:0,lastAttacker:null,wins:0,assets:[],diplomacy:[],members:[],mobCounter:0,fund:0};
    if(!Array.isArray(life.faction.assets))life.faction.assets=[];if(!Array.isArray(life.faction.diplomacy))life.faction.diplomacy=[];
    if(!Array.isArray(life.faction.members))life.faction.members=[];
    if(!Array.isArray(life.faction.bankruptcies))life.faction.bankruptcies=[];
    if(!Number.isFinite(life.faction.mobCounter))life.faction.mobCounter=life.faction.members.length;
    if(!Number.isFinite(life.faction.fund))life.faction.fund=0;
    if(!life.faction.storyStage)life.faction.storyStage=life.faction.level>0?'active':'locked';
    if(life.faction.level>0&&['locked','attacked','legal_wait','forming'].includes(life.faction.storyStage))life.faction.storyStage='active';
    // 구버전 세이브의 적자형 급여·수입도 최신 밸런스로 즉시 교체한다.
    const catalog=MOB_RECRUITS.concat(namedRecruits());
    life.faction.members.forEach(member=>{
      const base=catalog.find(item=>item.id===member.sourceId);if(!base)return;
      member.upkeep=base.upkeep||0;
      member.stats={...(member.stats||{}),...(base.stats||{})};
      if(base.desc)member.desc=base.desc;
    });
    return recalcFaction(life.faction);
  }
  function recalcFaction(f){
    const active=(f.members||[]).filter(m=>(m.injuredMonths||0)<=0),totals={defense:0,intel:0,legal:0,medical:0,income:0};
    active.forEach(m=>Object.keys(totals).forEach(k=>{totals[k]+=Number((m.stats||{})[k])||0;}));
    const operationFund=Math.max(0,f.fund||0);
    const operationBoost=Math.min(1.25,Math.sqrt(operationFund/20000000)*.35);
    const operationDefense=Math.min(.12,operationFund/100000000*.08);
    const operationIntel=Math.min(.10,operationFund/80000000*.06);
    f.capacity=Math.max(0,(f.level||0)*3+(f.trioCapacityBonus||0));
    const pathDefense=f.path==='legal'?.08:f.path==='underground'?.035:.045;
    const pathIntel=f.path==='network'?.09:f.path==='underground'?.055:.025;
    const pathIncome=f.path==='network'?1.16:f.path==='legal'?1.06:1.10;
    f.defense=Math.min(.88,(f.level||0)*.055+totals.defense+operationDefense+(f.level?pathDefense:0));
    f.intel=Math.min(.72,(f.level||0)*.035+totals.intel+operationIntel+(f.level?pathIntel:0));
    f.legal=totals.legal+(f.path==='legal'&&f.level?18:0);f.medical=totals.medical;f.monthlyIncome=totals.income;
    f.operationBoost=operationBoost;
    f.baseIncome=(f.level||0)*250000+(f.assets||[]).length*100000;
    f.projectedGross=Math.round((f.baseIncome+totals.income*(1+(f.level||0)*.08))*(1+operationBoost)*pathIncome);
    f.projectedUpkeep=(f.members||[]).reduce((sum,m)=>sum+(m.upkeep||0),0);
    f.projectedNet=f.projectedGross-f.projectedUpkeep;
    return f;
  }
  function namedRecruits(){
    const data=root.QT_DATA&&root.QT_DATA.WORLD_MALE_NPCS;
    return (data||[]).filter(n=>n.recruitable);
  }
  function recruitRequirement(life,npc){
    const f=ensureFaction(life);
    if((f.level||0)<(npc.minLevel||1))return `세력 ${npc.minLevel}단계 필요`;
    if((f.wins||0)<(npc.minWins||0))return `역공 성공 ${npc.minWins}회 필요`;
    if((f.members||[]).some(m=>m.sourceId===npc.id))return '이미 합류함';
    return '';
  }
  function recruitOptions(life){
    const f=ensureFaction(life);
    return MOB_RECRUITS.map(x=>({...x,locked:!f.level,reason:!f.level?'먼저 세력을 만들어야 함':''}))
      .concat(namedRecruits().map(n=>({...n,locked:!!recruitRequirement(life,n),reason:recruitRequirement(life,n)})));
  }
  function recruit(life,cash,candidateId){
    const f=ensureFaction(life);
    if(!f.level)return{ok:false,cash,message:'먼저 내 세력을 만들어야 합니다.'};
    if(f.members.length>=f.capacity)return{ok:false,cash,message:`현재 거점의 정원 ${f.capacity}명이 가득 찼습니다. 세력을 확장하세요.`};
    const mob=MOB_RECRUITS.find(x=>x.id===candidateId),named=namedRecruits().find(x=>x.id===candidateId),base=mob||named;
    if(!base)return{ok:false,cash,message:'영입 대상을 찾을 수 없습니다.'};
    if(named){const reason=recruitRequirement(life,named);if(reason)return{ok:false,cash,message:reason};}
    if(cash<base.cost)return{ok:false,cash,message:`영입 비용 ${base.cost.toLocaleString('ko-KR')}원이 필요합니다.`};
    f.mobCounter++;
    const used=new Set(f.members.map(m=>m.name));
    const mobName=mob&&(mob.names.find(n=>!used.has(n))||`${ROLE_LABELS[mob.role].name} 요원 ${f.mobCounter}`);
    const member={
      uid:`${base.id}-${f.mobCounter}`,sourceId:base.id,name:mobName||base.name,role:base.role,portrait:base.portrait,
      loyalty:base.loyalty==null?60:base.loyalty,upkeep:base.upkeep||0,stats:{...(base.stats||{})},named:!!named,
      desc:base.desc||'',injuredMonths:0
    };
    f.members.push(member);f.xp=(f.xp||0)+(named?15:5);recalcFaction(f);
    const arc=named&&root.QT_CHARACTER_STORIES&&root.QT_CHARACTER_STORIES.WORLD_ARCS&&root.QT_CHARACTER_STORIES.WORLD_ARCS[member.name];
    return{ok:true,cash:cash-base.cost,cost:base.cost,member,success:true,message:`${member.name}(${(ROLE_LABELS[member.role]||{}).name||member.role})이 ${f.name}에 합류했습니다. 현재 ${f.members.length}/${f.capacity}명${arc?` · 첫 사건 예고: ${arc.chapters[0]}`:''}`};
  }
  function settleFaction(life,cash){
    const f=ensureFaction(life),events=[];if(!f.level)return{cash,income:0,upkeep:0,events,left:null};
    f.members.forEach(m=>{if((m.injuredMonths||0)>0)m.injuredMonths--;});
    recalcFaction(f);
    const active=f.members.filter(m=>(m.injuredMonths||0)<=0);
    const income=f.projectedGross;
    const upkeep=f.members.reduce((s,m)=>s+(m.upkeep||0),0);
    const paid=Math.min(Math.max(0,cash),upkeep);cash=cash-paid+income;
    if(paid<upkeep){
      const gap=upkeep-paid;f.members.forEach(m=>m.loyalty=Math.max(0,(m.loyalty||50)-12));
      events.push(`급여·운영비 ${gap.toLocaleString('ko-KR')}원이 밀려 전원의 충성도가 떨어졌습니다.`);
    }else f.members.forEach(m=>m.loyalty=Math.min(100,(m.loyalty||50)+1));
    const activeSource=id=>active.some(m=>m.sourceId===id);
    if(activeSource('minjun')&&life.justice&&life.justice.case){
      life.legalShield=(life.legalShield||0)+1;
      events.push('민준이 진행 중인 사건 기록을 검토해 법적 방패 1회를 확보했습니다.');
    }
    if(activeSource('doyun')&&Number.isFinite(life.health)&&life.health<100){
      life.health=Math.min(100,life.health+2);life.stress=Math.max(0,(life.stress||0)-1);
      events.push('도윤의 정기 진료로 건강이 2 회복되고 스트레스가 1 줄었습니다.');
    }
    if(activeSource('hantaeseok')){
      if((life.jailMonths||0)>0){
        life.jailMonths=Math.max(0,life.jailMonths-1);
        events.push('한태석이 밖에서 뛰어 형 집행 문제를 정리했습니다. 남은 수감 기간이 1개월 줄었습니다.');
      }
      if((life.collectionLevel||0)>=2){
        life.collectionLevel=Math.max(1,life.collectionLevel-1);
        events.push('한태석이 추심 세력과 직접 담판을 지어 추심 단계가 내려갔습니다. 빚 자체는 남아 있습니다.');
      }
      const entangled=(life.met||[]).filter(p=>(p.obsession||0)>=65&&p.status!=='ex').sort((a,b)=>(b.obsession||0)-(a.obsession||0))[0];
      if(entangled){
        entangled.obsession=Math.max(0,entangled.obsession-8);
        events.push(`한태석이 ${entangled.name}과의 위험한 갈등에 개입해 집착을 8 낮췄습니다.`);
      }
    }
    let left=null;
    const deserter=f.members.find(m=>!m.named&&(m.loyalty||0)<25&&Math.random()<.35);
    if(deserter){f.members=f.members.filter(m=>m.uid!==deserter.uid);left=deserter;events.push(`${deserter.name}이 처우에 불만을 품고 세력을 떠났습니다.`);}
    const vulnerable=f.members.filter(m=>!m.named&&(m.injuredMonths||0)<=0);
    if(vulnerable.length&&Math.random()<.035){
      const injured=pick(vulnerable);injured.injuredMonths=Math.max(1,Math.ceil(rand(1,3))-(f.medical>=20?1:0));
      if(injured.injuredMonths>0)events.push(`${injured.name}이 현장 충돌로 다쳐 ${injured.injuredMonths}개월간 전력에서 빠집니다.`);
      else events.push(`${injured.name}이 다쳤지만 의료 지원으로 바로 복귀했습니다.`);
    }
    recalcFaction(f);return{cash,income,upkeep,events,left};
  }
  function buildFaction(life,cash){
    const f=ensureFaction(life);
    if(!f.level&&!['forming','active','victory'].includes(f.storyStage))return{ok:false,cash,message:'첫 피습 이후 나래와 장태식의 세력 창설 이야기를 먼저 진행해야 합니다.'};
    const baseCost=f.level?Math.round(1500000*(f.level+1)):1000000;
    const cost=Math.max(500000,baseCost-(f.foundingDiscount||0));
    if(f.level>=5)return{ok:false,cash,message:'이미 최종 단계 거점을 운영하고 있습니다.'};
    if(cash<cost)return{ok:false,cash,message:`세력 정비 비용 ${cost.toLocaleString('ko-KR')}원이 필요합니다.`};
    f.level=Math.min(5,f.level+1);
    if(f.level===1){f.storyStage='active';f.foundingDiscount=0;}
    const bases=[{icon:'🏚️',name:'골목 사무실'},{icon:'☕',name:'정보원 카페'},{icon:'🏢',name:'세력 본부'},{icon:'📡',name:'미디어 상황실'},{icon:'🏙️',name:'도심 연합타워'}];if(f.assets.length<f.level)f.assets.push(bases[f.level-1]);
    recalcFaction(f);
    return{ok:true,cash:cash-cost,cost,message:`${f.name}이 ${f.level}단계가 됐습니다. 정원 ${f.capacity}명 · 방어 ${Math.round(f.defense*100)}%`};
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
    if(target.bankrupt)return{ok:false,cash,message:'이미 파산·해산한 세력입니다.'};
    if(!f.level)return{ok:false,cash,message:'먼저 내 세력을 만들어야 합니다.'};
    const cost=500000+f.level*250000;if(cash<cost)return{ok:false,cash,message:`작전비 ${cost.toLocaleString('ko-KR')}원이 부족합니다.`};
    const active=f.members.filter(m=>(m.injuredMonths||0)<=0);
    if(!active.length)return{ok:false,cash,message:'작전을 수행할 조직원이 없습니다. 먼저 인원을 모집하세요.'};
    const chance=Math.min(.92,.40+f.level*.075+f.intel*.35+Math.min(.16,active.length*.025)),success=Math.random()<chance;
    const damage=success?Math.min(target.capital,Math.round(Math.max(400000,target.capital*(.08+f.level*.022+active.length*.01)))):0;
    let assetDamage=0;
    if(success&&target.assets&&target.assets.length){
      const asset=target.assets.slice().sort((a,b)=>(b.value||0)-(a.value||0))[0];
      assetDamage=Math.round((asset.value||0)*Math.min(.22,.09+f.level*.016+active.length*.007));
      asset.value=Math.max(0,(asset.value||0)-assetDamage);
    }
    const reward=success?Math.round((damage+assetDamage)*.12):0;
    if(success){target.capital-=damage;f.wins++;f.xp+=12;}else f.xp+=3;
    const reaction=success?applyPressure(target,18+f.level*2,12+Math.round((f.intel||0)*8)):updateReaction(target);
    const message=success
      ?`${f.name}의 역공 성공! ${target.name}에게 현금 ${damage.toLocaleString('ko-KR')}원${assetDamage?`·사업가치 ${assetDamage.toLocaleString('ko-KR')}원`:''} 타격 · 작전수익 ${reward.toLocaleString('ko-KR')}원${reaction.changed?` · ${reaction.line}`:''}`
      :`${target.name}이 역공을 눈치채 피해 갔습니다. ${reactionLine(target,target.reactionStage||'stable')}`;
    return{ok:true,success,cash:cash-cost+reward,cost,damage,assetDamage,reward,reaction,target,message};
  }
  function negotiate(life,bots,targetIndex,cash,month){
    const target=bots[targetIndex];if(!target||target.bankrupt)return{ok:false,cash,message:'협상할 세력을 찾을 수 없습니다.'};
    const offer=Math.min(target.capital,target.settlementOffer||0);
    if(offer<=0)return{ok:false,cash,message:'현재 도착한 휴전 제안이 없습니다.'};
    target.capital-=offer;target.pressure=Math.max(0,(target.pressure||0)-28);target.credibility=Math.min(100,(target.credibility||0)+14);
    target.truceUntil=(month||1)+3;target.settlementOffer=null;const reaction=updateReaction(target,month);
    return{ok:true,cash:cash+offer,offer,target,reaction,message:`${target.name}의 휴전금 ${offer.toLocaleString('ko-KR')}원을 받고 3개월 상호불가침에 합의했습니다. 상대는 그동안 재정비합니다.`};
  }
  function bankruptRival(life,bots,targetIndex,cash,currentWorth,month){
    const f=ensureFaction(life),target=bots[targetIndex],c=campaign();
    if(!target)return{ok:false,cash,message:'파산 압박 대상을 찾을 수 없습니다.'};
    const eligibility=c.bankruptcyEligibility(target,currentWorth,f);
    if(!eligibility.ready)return{ok:false,cash,message:eligibility.reason};
    const cost=3000000+f.level*1000000;if(cash<cost)return{ok:false,cash,message:`최종 작전비 ${cost.toLocaleString('ko-KR')}원이 부족합니다.`};
    const active=f.members.filter(m=>(m.injuredMonths||0)<=0);
    const pathBonus=f.path==='legal'?.08:f.path==='network'?.06:.03;
    const chance=Math.min(.94,.64+f.level*.045+(f.intel||0)*.22+Math.min(.10,active.length*.02)+pathBonus);
    const success=Math.random()<chance;
    if(!success){
      const counterLoss=Math.min(Math.max(0,cash-cost),Math.round(Math.max(500000,cash*.08)));
      target.pressure=Math.max(0,(target.pressure||0)-10);target.credibility=Math.min(100,(target.credibility||0)+8);updateReaction(target,month);
      return{ok:true,success:false,cash:cash-cost-counterLoss,cost,counterLoss,target,message:`${target.name}이 마지막 자금줄을 동원해 파산 신청을 막았습니다. 역공 피해 ${counterLoss.toLocaleString('ko-KR')}원 · ${reactionLine(target,target.reactionStage)}`};
    }
    const recovered=Math.min(10000000,Math.round(Math.max(0,currentWorth||structuralWorth(target))*.05));
    target.bankrupt=true;target.bankruptDay=month||1;target.bankruptcyReason=`${f.name}의 최종 자금·신용 압박`;
    target.capital=0;target.owned={};target.assets=[];target.monthlyProfit=0;target.settlementOffer=null;target.reactionStage='bankrupt';target.credibility=0;target.pressure=100;
    if(!f.bankruptcies.includes(target.name))f.bankruptcies.push(target.name);
    f.wins=(f.wins||0)+1;f.xp=(f.xp||0)+30;
    return{ok:true,success:true,cash:cash-cost+recovered,cost,recovered,target,message:`${target.name} 파산·해산 확정 · ${reactionLine(target,'bankrupt')}${recovered?` · 회수금 ${recovered.toLocaleString('ko-KR')}원`:''}`};
  }
  root.QT_RIVALS={PERSONAS,REACTION_LINES,ACTIONS,ASSETS,ROLE_LABELS,MOB_RECRUITS,createBots,settleBots,botsFight,act,attackPlayer,ensureFaction,recruitOptions,recruit,settleFaction,buildFaction,defendAttack,revenge,reactionLine,updateReaction,negotiate,bankruptRival};
})(window);
