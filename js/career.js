/* QuickTrade Life — 사업·세력 운영 역량 엔진
 * 이전 저장의 career 필드와 자격증 id는 유지하되, 직장·월급 시스템에는 사용하지 않는다.
 */
(function(root){'use strict';
const RANKS=['혼자 버티기','실무 운영','조직 책임','전략 총괄','시장 설계'];
const CERTS=[
 {id:'computer',name:'운영 데이터 정리',icon:'💻',cost:800000,skill:8,businessSales:.015,ability:'사업 보고서 정확도'},
 {id:'language',name:'해외 거래 소통',icon:'🌐',cost:1200000,skill:10,businessSales:.02,ability:'해외 거래 교섭'},
 {id:'finance',name:'사업 회계',icon:'🧾',cost:1800000,skill:12,businessCost:.025,ability:'사업 비용 절감'},
 {id:'leadership',name:'조직 지휘',icon:'🎯',cost:2500000,skill:15,factionIncome:.04,ability:'조직원 수익 지휘'},
 {id:'coding',name:'시장·업무 자동화',icon:'⌨️',cost:2200000,skill:14,businessSales:.03,ability:'시장 데이터 해석'},
 {id:'realestate',name:'거점·부동산 관리',icon:'🏙️',cost:3000000,skill:13,businessCost:.03,ability:'건물 유지비 절감'},
 {id:'law',name:'계약·법무',icon:'⚖️',cost:3500000,skill:14,factionDefense:.06,ability:'세력전 법적 방어'},
 {id:'negotiation',name:'교섭·협상',icon:'🤝',cost:2800000,skill:12,factionIncome:.03,ability:'인맥·세력 교섭'},
 {id:'security',name:'위기관리·보안',icon:'🛡️',cost:4000000,skill:16,factionDefense:.12,ability:'공작 피해 경감'},
 {id:'media',name:'여론·평판 대응',icon:'📣',cost:2600000,skill:11,factionDefense:.04,ability:'평판과 정치 속보 분석'},
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function ensure(life){
 if(!life.career)life.career={jobId:'none',months:0,level:0,skill:5,reputation:30,performance:50,certifications:[]};
 const c=life.career;
 c.jobId='none';
 if(!Array.isArray(c.certifications))c.certifications=[];
 if(!Number.isFinite(c.months))c.months=0;
 if(!Number.isFinite(c.level))c.level=0;
 if(!Number.isFinite(c.skill))c.skill=5;
 if(!Number.isFinite(c.reputation))c.reputation=30;
 if(!Number.isFinite(c.performance))c.performance=50;
 return c;
}
// 구버전 호출 호환. 직업은 바뀌지 않고 기존 운영 경험도 깎지 않는다.
function switchJob(life){life.job='none';return ensure(life);}
function rank(life){return RANKS[Math.min(RANKS.length-1,ensure(life).level)];}
function salary(){return 0;}
function monthly(life,contextOrLegacy,legacyContext){
 const c=ensure(life),ctx=legacyContext||contextOrLegacy||{};
 const businesses=Number(ctx.businesses||0),factionLevel=Number(ctx.factionLevel||0),members=Number(ctx.factionMembers||0);
 const active=businesses>0||factionLevel>0||members>0;
 c.months++;
 const health=(ctx.health||50)/100,stress=(ctx.stress||50)/100;
 const experience=(businesses*.5+factionLevel*.7+Math.min(5,members)*.16);
 c.performance=clamp(c.performance+(active?1.2:-.25)+(health-.5)*3-(stress-.5)*2+(Math.random()-.5)*4,0,100);
 c.skill=clamp(c.skill+(active?.45:.12)+experience*.12,0,100);
 c.reputation=clamp(c.reputation+(c.performance-50)/80+(factionLevel?0.15:0),0,100);
 let promotion=null;
 const needMonths=8+c.level*4,needSkill=14+c.level*16;
 if(c.level<RANKS.length-1&&active&&c.months>=needMonths&&c.skill>=needSkill&&c.performance>=55){
   c.level++;c.months=0;promotion=RANKS[c.level];
 }
 return{promotion,bonus:0,career:c};
}
function train(life){const c=ensure(life);c.skill=clamp(c.skill+6,0,100);c.performance=clamp(c.performance+3,0,100);return c;}
function certify(life,id){const cert=CERTS.find(x=>x.id===id),c=ensure(life);if(!cert||c.certifications.includes(id))return null;c.certifications.push(id);c.skill=clamp(c.skill+cert.skill,0,100);c.reputation=clamp(c.reputation+4,0,100);return cert;}
function ownedCerts(life){const ids=ensure(life).certifications;return ids.map(id=>CERTS.find(x=>x.id===id)).filter(Boolean);}
function businessEffects(life){
 const c=ensure(life),certs=ownedCerts(life);
 return{
  salesMultiplier:1+Math.min(.2,c.skill*.0012+c.level*.012)+certs.reduce((sum,cert)=>sum+(cert.businessSales||0),0),
  costMultiplier:Math.max(.72,1-Math.min(.12,c.performance*.0007+c.level*.008)-certs.reduce((sum,cert)=>sum+(cert.businessCost||0),0)),
 };
}
function factionEffects(life){
 const c=ensure(life),certs=ownedCerts(life);
 return{
  incomeMultiplier:1+Math.min(.18,c.skill*.001+c.level*.015)+certs.reduce((sum,cert)=>sum+(cert.factionIncome||0),0),
  defenseBonus:Math.min(.32,c.performance*.0008+c.level*.015+certs.reduce((sum,cert)=>sum+(cert.factionDefense||0),0)),
 };
}
function abilities(life){return ownedCerts(life).filter(x=>x.ability).map(x=>({icon:x.icon,name:x.ability}));}
root.QT_CAREER={RANKS,CERTS,ensure,switchJob,rank,salary,monthly,train,certify,abilities,businessEffects,factionEffects};
})(window);
