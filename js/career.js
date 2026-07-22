/* QuickTrade Life — 경력·직급·승진·자격증 엔진 */
(function(root){'use strict';
const RANKS=['신입','주니어','선임','팀장','임원'];
const CERTS=[
 {id:'computer',name:'데이터 활용',icon:'💻',cost:800000,skill:8,salary:.03},
 {id:'language',name:'외국어',icon:'🌐',cost:1200000,skill:10,salary:.04},
 {id:'finance',name:'재무·회계',icon:'🧾',cost:1800000,skill:12,salary:.05},
 {id:'leadership',name:'리더십',icon:'🎯',cost:2500000,skill:15,salary:.06},
 {id:'coding',name:'소프트웨어 실무',icon:'⌨️',cost:2200000,skill:14,salary:.06,ability:'시장 데이터 해석'},
 {id:'realestate',name:'부동산 자산관리',icon:'🏙️',cost:3000000,skill:13,salary:.05,ability:'건물 유지비 절감'},
 {id:'law',name:'계약·법무',icon:'⚖️',cost:3500000,skill:14,salary:.06,ability:'세력전 법적 방어'},
 {id:'negotiation',name:'협상 전문가',icon:'🤝',cost:2800000,skill:12,salary:.05,ability:'인맥·세력 교섭'},
 {id:'security',name:'위기관리·보안',icon:'🛡️',cost:4000000,skill:16,salary:.07,ability:'공작 피해 경감'},
 {id:'media',name:'미디어 전략',icon:'📣',cost:2600000,skill:11,salary:.05,ability:'평판과 정치 속보 분석'},
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function ensure(life){if(!life.career)life.career={jobId:life.job||'none',months:0,level:0,skill:5,reputation:30,performance:50,certifications:[]};if(!Array.isArray(life.career.certifications))life.career.certifications=[];return life.career;}
function switchJob(life,jobId){const c=ensure(life);if(c.jobId===jobId)return c;const transferable=Math.floor(c.skill*.55);life.career={jobId,months:0,level:0,skill:Math.max(5,transferable),reputation:Math.max(15,Math.floor(c.reputation*.7)),performance:50,certifications:[...c.certifications]};return life.career;}
function rank(life){return RANKS[Math.min(RANKS.length-1,ensure(life).level)];}
function salary(job,life,rng=Math.random){const c=ensure(life),rankMul=1+c.level*.18,certMul=1+c.certifications.reduce((s,id)=>s+(CERTS.find(x=>x.id===id)||{}).salary||s,0);if(job.variable)return Math.round((job.variable[0]+rng()*(job.variable[1]-job.variable[0]))*rankMul*certMul);return Math.round((job.salary||0)*rankMul*certMul);}
function monthly(life,job,ctx){const c=ensure(life);if(c.jobId!==job.id)switchJob(life,job.id);c.months++;const health=(ctx.health||50)/100,stress=(ctx.stress||50)/100;c.performance=clamp(c.performance+(health-.5)*8-(stress-.5)*7+(Math.random()-.5)*10,0,100);c.skill=clamp(c.skill+.6+health*.5,0,100);c.reputation=clamp(c.reputation+(c.performance-50)/30,0,100);let promotion=null,bonus=0;const needMonths=10+c.level*5,needSkill=15+c.level*16;if(c.level<RANKS.length-1&&c.months>=needMonths&&c.skill>=needSkill&&c.performance>=58){const chance=clamp(.35+(c.performance-58)/100+c.reputation/300,.2,.85);if(Math.random()<chance){c.level++;c.months=0;promotion=RANKS[c.level];bonus=Math.round((job.salary||2500000)*(1+c.level*.5));}}
return{promotion,bonus,career:c};}
function train(life){const c=ensure(life);c.skill=clamp(c.skill+6,0,100);c.performance=clamp(c.performance+3,0,100);return c;}
function certify(life,id){const cert=CERTS.find(x=>x.id===id),c=ensure(life);if(!cert||c.certifications.includes(id))return null;c.certifications.push(id);c.skill=clamp(c.skill+cert.skill,0,100);c.reputation=clamp(c.reputation+4,0,100);return cert;}
function abilities(life){return ensure(life).certifications.map(id=>CERTS.find(x=>x.id===id)).filter(x=>x&&x.ability).map(x=>({icon:x.icon,name:x.ability}));}
root.QT_CAREER={RANKS,CERTS,ensure,switchJob,rank,salary,monthly,train,certify,abilities};
})(window);
