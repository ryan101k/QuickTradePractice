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
  ];
  const rand=(a,b)=>a+Math.random()*(b-a), pick=a=>a[Math.floor(Math.random()*a.length)];
  function createBots(){return PERSONAS.map(p=>({...p,capital:1000000,owned:{},jailMonths:0,criminalRecord:0,monthlyProfit:0}));}
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
      if(Math.random()>0.6){news.push(`🛡️ ${target.name}가 ${att.name}의 견제를 막아냈습니다`);return;}
      const dmg=Math.round(Math.max(200000,target.capital*rand(0.02,illegal?0.09:0.045)));
      target.capital=Math.max(0,target.capital-dmg);att.capital+=Math.round(dmg*(illegal?0.5:0.2));
      news.push(`⚔️ ${att.name} → ${target.name} ${illegal?'불법 공작':'경쟁 견제'} 타격 ${dmg.toLocaleString('ko-KR')}원`);
    });
    return news;
  }
  function act(player,target,actionId){
    const a=ACTIONS.find(x=>x.id===actionId);if(!a||!target)return{ok:false,message:'대상을 찾을 수 없습니다.'};
    if(player.jailMonths>0)return{ok:false,message:'수감 중에는 경쟁 행동을 할 수 없습니다.'};
    if(player.cash<a.cost)return{ok:false,message:'행동 비용이 부족합니다.'};
    player.cash-=a.cost;
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
  root.QT_RIVALS={PERSONAS,ACTIONS,createBots,settleBots,botsFight,act,attackPlayer};
})(window);
