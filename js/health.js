/* QuickTrade Life — 건강·노화·질병·상속 엔진 */
(function(root){'use strict';
const CONDITIONS=[
 {id:'burnout',name:'번아웃',icon:'🫥',minAge:20,minStress:80,chance:.025,cooldown:12,health:-2,stress:6,cost:1200000},
 {id:'back',name:'허리디스크',icon:'🦴',minAge:25,minStress:45,chance:.045,health:-2,stress:2,cost:2500000},
 {id:'hypertension',name:'고혈압',icon:'🫀',minAge:35,minStress:55,chance:.045,health:-2,stress:1,cost:1800000},
 {id:'diabetes',name:'당뇨 전단계',icon:'🩸',minAge:40,minStress:35,chance:.035,health:-3,stress:1,cost:3000000},
 {id:'heart',name:'심혈관 질환',icon:'❤️‍🩹',minAge:55,minStress:60,chance:.025,health:-6,stress:3,cost:12000000},
 {id:'cancer',name:'중증 질환',icon:'🏥',minAge:60,minStress:30,chance:.018,health:-8,stress:5,cost:30000000},
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function ensure(life){
 if(!Number.isFinite(life.health))life.health=82;if(!Number.isFinite(life.stress))life.stress=22;
 if(!Number.isFinite(life.fitness))life.fitness=10;if(!Array.isArray(life.conditions))life.conditions=[];
 if(!Number.isFinite(life.generation))life.generation=1;if(!Number.isFinite(life.checkups))life.checkups=0;
 if(!Number.isFinite(life.healthMonths))life.healthMonths=0;
 if(!life.conditionHistory||typeof life.conditionHistory!=='object')life.conditionHistory={};
 return life;
}
function monthly(life,ctx){
 ensure(life);life.healthMonths++;const news=[];const age=ctx.age||25,rng=ctx.random||Math.random;
 let stressDelta=2+(ctx.jobRisk||0)*25+(ctx.debtRatio||0)*3+(ctx.jailed?8:0)-(life.fitness*.06)-(Math.max(0,ctx.happy-50)*.03);
 life.stress=clamp(life.stress+stressDelta,0,100);
 const ageDecay=age<40?0:age<55?.35:age<70?.8:1.5;
 const conditionDrain=life.conditions.reduce((s,id)=>s+Math.abs((CONDITIONS.find(c=>c.id===id)||{}).health||0),0);
 const recovery=life.stress<30?1:0;
 life.health=clamp(life.health-ageDecay-Math.max(0,(life.stress-65)/35)-conditionDrain+recovery,0,100);
 for(const c of CONDITIONS){
  const last=life.conditionHistory[c.id];
  if(life.conditions.includes(c.id)||age<c.minAge||life.stress<c.minStress||(last!=null&&life.healthMonths-last<(c.cooldown||0)))continue;
  const ageMul=c.id==='burnout'?1:1+Math.max(0,age-c.minAge)/35;
  const stressMul=c.id==='burnout'?clamp((life.stress-c.minStress+10)/20,.5,1.5):1;
  if(rng()<c.chance*ageMul*stressMul){life.conditions.push(c.id);life.conditionHistory[c.id]=life.healthMonths;news.push(`${c.icon} ${c.name} 진단`);break;}
 }
 const naturalRisk=age<70?0:Math.pow((age-69)/35,2)*.035;
 const criticalRisk=life.health<20?(20-life.health)*.008:0;
 const died=life.health<=0||rng()<naturalRisk+criticalRisk;
 return{died,news,health:life.health,stress:life.stress};
}
function exercise(life){ensure(life);life.fitness=clamp(life.fitness+4,0,100);life.health=clamp(life.health+3,0,100);life.stress=clamp(life.stress-6,0,100);}
function rest(life){ensure(life);life.health=clamp(life.health+2,0,100);life.stress=clamp(life.stress-12,0,100);}
function checkup(life){ensure(life);life.checkups++;life.stress=clamp(life.stress-3,0,100);return life.conditions.map(id=>CONDITIONS.find(c=>c.id===id)).filter(Boolean);}
function treatmentOffer(life){ensure(life);const c=life.conditions.map(id=>CONDITIONS.find(x=>x.id===id)).filter(Boolean).sort((a,b)=>b.cost-a.cost)[0];return c||null;}
function treat(life){const c=treatmentOffer(life);if(!c)return null;life.conditions=life.conditions.filter(id=>id!==c.id);life.conditionHistory[c.id]=life.healthMonths;life.health=clamp(life.health+12,0,100);life.stress=clamp(life.stress-8,0,100);return c;}
function conditionDetails(life){ensure(life);return life.conditions.map(id=>CONDITIONS.find(c=>c.id===id)).filter(Boolean);}
function inheritance(wealth){const gross=Math.max(0,wealth);const rate=gross<100000000?.10:gross<1000000000?.20:.30;const tax=Math.round(gross*rate);return{gross,rate,tax,net:Math.max(1000000,gross-tax)};}
root.QT_HEALTH={CONDITIONS,ensure,monthly,exercise,rest,checkup,treatmentOffer,treat,conditionDetails,inheritance};
})(window);
