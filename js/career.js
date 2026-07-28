/* QuickTrade Life — 사업·세력 운영 경험 엔진
 * 운영력은 유료 공부나 자격증 구매가 아니라 실제 사업·세력 운영으로만 성장한다.
 */
(function(root){'use strict';
const RANKS=['혼자 버티기','실무 운영','조직 책임','전략 총괄','시장 설계'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function ensure(life){
 if(!life.career)life.career={months:0,level:0,skill:5,reputation:30,performance:50};
 const c=life.career;
 if(Object.prototype.hasOwnProperty.call(c,'jobId'))delete c.jobId;
 if(Object.prototype.hasOwnProperty.call(c,'certifications'))delete c.certifications;
 if(!Number.isFinite(c.months))c.months=0;
 if(!Number.isFinite(c.level))c.level=0;
 if(!Number.isFinite(c.skill))c.skill=5;
 if(!Number.isFinite(c.reputation))c.reputation=30;
 if(!Number.isFinite(c.performance))c.performance=50;
 return c;
}
function rank(life){return RANKS[Math.min(RANKS.length-1,ensure(life).level)];}
function monthly(life,contextOrLegacy,legacyContext){
 const c=ensure(life),ctx=legacyContext||contextOrLegacy||{};
 const businesses=Number(ctx.businesses||0),factionLevel=Number(ctx.factionLevel||0),members=Number(ctx.factionMembers||0);
 const active=businesses>0||factionLevel>0||members>0;
 c.months++;
 const health=(ctx.health||50)/100,stress=(ctx.stress||50)/100;
 const experience=businesses*.5+factionLevel*.7+Math.min(5,members)*.16;
 c.performance=clamp(c.performance+(active?1.2:-.25)+(health-.5)*3-(stress-.5)*2+(Math.random()-.5)*4,0,100);
 c.skill=clamp(c.skill+(active?.45:.12)+experience*.12,0,100);
 c.reputation=clamp(c.reputation+(c.performance-50)/80+(factionLevel?.15:0),0,100);
 let promotion=null;
 const needMonths=8+c.level*4,needSkill=14+c.level*16;
 if(c.level<RANKS.length-1&&active&&c.months>=needMonths&&c.skill>=needSkill&&c.performance>=55){
   c.level++;c.months=0;promotion=RANKS[c.level];
 }
 return{promotion,bonus:0,career:c};
}
function businessEffects(life){
 const c=ensure(life);
 return{
  salesMultiplier:1+Math.min(.2,c.skill*.0012+c.level*.012),
  costMultiplier:Math.max(.72,1-Math.min(.12,c.performance*.0007+c.level*.008)),
 };
}
function factionEffects(life){
 const c=ensure(life);
 return{
  incomeMultiplier:1+Math.min(.18,c.skill*.001+c.level*.015),
  defenseBonus:Math.min(.32,c.performance*.0008+c.level*.015),
 };
}
root.QT_CAREER={RANKS,ensure,rank,monthly,businessEffects,factionEffects};
})(window);
