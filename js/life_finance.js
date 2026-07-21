/* QuickTrade Life — 보험·연금·세금 엔진 */
(function(root){'use strict';
const POLICIES=[
 {id:'health_basic',icon:'🩺',name:'기본 건강보험',premium:180000,type:'health',coverage:.45,desc:'치료비 45% 보장'},
 {id:'health_premium',icon:'🏥',name:'프리미엄 건강보험',premium:520000,type:'health',coverage:.80,desc:'치료비 80% 보장'},
 {id:'life_100',icon:'🕯️',name:'생명보험 1억',premium:260000,type:'life',benefit:100000000,desc:'사망 시 상속금 1억원'},
 {id:'life_500',icon:'🌳',name:'생명보험 5억',premium:950000,type:'life',benefit:500000000,desc:'사망 시 상속금 5억원'},
 {id:'home',icon:'🏠',name:'주택·화재보험',premium:130000,type:'home',coverage:.75,desc:'주거 사고 손실 75% 보장'},
 {id:'income',icon:'💼',name:'소득보장보험',premium:210000,type:'income',benefit:1800000,desc:'실직 시 월 180만원, 최대 6개월'},
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function ensure(life){if(!life.finance)life.finance={policies:[],pensionBalance:0,pensionRate:.09,taxesPaid:0,premiumsPaid:0,claims:0,unemploymentMonths:0};if(!Array.isArray(life.finance.policies))life.finance.policies=[];return life.finance;}
function subscribe(life,id){const f=ensure(life),p=POLICIES.find(x=>x.id===id);if(!p||f.policies.includes(id))return null;if(p.type==='health')f.policies=f.policies.filter(pid=>(POLICIES.find(x=>x.id===pid)||{}).type!=='health');if(p.type==='life')f.policies=f.policies.filter(pid=>(POLICIES.find(x=>x.id===pid)||{}).type!=='life');f.policies.push(id);return p;}
function cancel(life,id){const f=ensure(life);f.policies=f.policies.filter(x=>x!==id);}
function active(life){const f=ensure(life);return f.policies.map(id=>POLICIES.find(p=>p.id===id)).filter(Boolean);}
function incomeTax(income){const annual=Math.max(0,income)*12;const rate=annual<30000000?.04:annual<60000000?.09:annual<120000000?.15:annual<300000000?.23:.32;return Math.round(Math.max(0,income)*rate);}
function monthly(life,ctx){const f=ensure(life),plans=active(life);const premiums=plans.reduce((s,p)=>s+p.premium,0);const tax=incomeTax(ctx.income||0);const propertyTax=Math.round(Math.max(0,ctx.propertyValue||0)*.004/12);let pensionContribution=0,pensionPayout=0,incomeBenefit=0;
 if(ctx.age<65&&ctx.income>0){pensionContribution=Math.round(ctx.income*f.pensionRate);f.pensionBalance+=pensionContribution;}
 if(ctx.age>=65&&f.pensionBalance>0){pensionPayout=Math.min(f.pensionBalance,Math.round(f.pensionBalance/180)+500000);f.pensionBalance-=pensionPayout;}
 const incomePlan=plans.find(p=>p.type==='income');if(ctx.unemployed&&incomePlan&&f.unemploymentMonths<6){incomeBenefit=incomePlan.benefit;f.unemploymentMonths++;}else if(!ctx.unemployed)f.unemploymentMonths=0;
 f.taxesPaid+=tax+propertyTax;f.premiumsPaid+=premiums;return{premiums,tax,propertyTax,pensionContribution,pensionPayout,incomeBenefit,net:pensionPayout+incomeBenefit-premiums-tax-propertyTax-pensionContribution};}
function treatmentCost(life,cost){const plan=active(life).filter(p=>p.type==='health').sort((a,b)=>b.coverage-a.coverage)[0];const covered=plan?Math.round(cost*plan.coverage):0;if(covered>0){const f=ensure(life);f.claims+=covered;}return{original:cost,covered,pay:cost-covered,plan};}
function deathBenefit(life){return active(life).filter(p=>p.type==='life').reduce((s,p)=>s+(p.benefit||0),0);}
function setPensionRate(life,rate){ensure(life).pensionRate=clamp(rate,.03,.20);}
root.QT_LIFE_FINANCE={POLICIES,ensure,subscribe,cancel,active,monthly,treatmentCost,deathBenefit,setPensionRate,incomeTax};
})(window);
