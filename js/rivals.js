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
      if(b.jailMonths>0){b.jailMonths--;b.monthlyProfit=0;return;}
      const profit=Math.round(b.income*rand(.65,1.75)*b.skill); b.capital+=profit;b.monthlyProfit=profit;
      if(Math.random()<.10){const windfall=Math.round(rand(-3000000,12000000)*b.skill);b.capital+=windfall;news.push(`${b.name} 부업·사업 손익 ${windfall>=0?'+':''}${windfall.toLocaleString('ko-KR')}원`);}
    }); return news;
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
    const candidates=bots.filter(b=>b.jailMonths<=0&&Math.random()<b.aggression*.12);if(!candidates.length)return null;
    const attacker=pick(candidates),illegal=attacker.aggression>.4&&Math.random()<.55;
    if(illegal&&Math.random()<.30){attacker.jailMonths=Math.ceil(rand(2,6));attacker.criminalRecord++;return{attacker,caught:true,loss:0,message:`${attacker.name}의 불법 공작이 적발되어 수감됐습니다.`};}
    const loss=Math.round(Math.max(100000,playerWorth*rand(.01,illegal?.08:.035)));
    return{attacker,caught:false,illegal,loss,message:`${attacker.name}의 ${illegal?'불법 공작':'경쟁 견제'}로 ${loss.toLocaleString('ko-KR')}원 피해`};
  }
  root.QT_RIVALS={PERSONAS,ACTIONS,createBots,settleBots,act,attackPlayer};
})(window);
