/* QuickTrade Life — 장기 경제 사이클 엔진 */
(function(root){'use strict';
const PHASES={
 recovery:{name:'회복기',icon:'🌱',months:[5,10],market:.006,salary:1.03,layoff:.01,loan:.95,property:.008,living:1.01,desc:'금리 안정과 경기 반등'},
 boom:{name:'호황',icon:'📈',months:[6,12],market:.010,salary:1.10,layoff:.005,loan:1.0,property:.016,living:1.05,desc:'고용과 소비가 강한 확장 국면'},
 overheating:{name:'과열',icon:'🔥',months:[4,8],market:.007,salary:1.07,layoff:.01,loan:1.15,property:.022,living:1.12,desc:'자산과 물가가 빠르게 상승'},
 tightening:{name:'긴축',icon:'🏦',months:[4,9],market:-.006,salary:1.01,layoff:.035,loan:1.35,property:-.006,living:1.10,desc:'고금리로 투자와 소비가 위축'},
 recession:{name:'침체',icon:'📉',months:[5,11],market:-.010,salary:.92,layoff:.075,loan:1.20,property:-.012,living:1.04,desc:'실적 악화와 실업 위험 증가'},
 crisis:{name:'금융위기',icon:'💥',months:[2,5],market:-.020,salary:.82,layoff:.14,loan:1.55,property:-.025,living:1.02,desc:'신용 경색과 자산 가격 급락'},
 stimulus:{name:'부양 국면',icon:'💸',months:[3,7],market:.012,salary:.98,layoff:.035,loan:.82,property:.010,living:1.08,desc:'대규모 유동성과 재정 지원'},
};
const NEXT={recovery:['boom','boom','overheating'],boom:['boom','overheating','tightening'],overheating:['tightening','tightening','crisis'],tightening:['recession','recession','recovery'],recession:['stimulus','crisis','recovery'],crisis:['stimulus','stimulus'],stimulus:['recovery','recovery','boom']};
const SECTOR={recovery:{build:.006,finance:.004},boom:{auto:.005,game:.004,enter:.004},overheating:{crypto:.014,battery:.006},tightening:{finance:.004,build:-.008,crypto:-.010},recession:{food:.004,bio:.003,auto:-.007,air:-.006},crisis:{finance:-.012,build:-.012,crypto:-.018},stimulus:{build:.008,battery:.006,semi:.005}};
const pick=a=>a[Math.floor(Math.random()*a.length)],rand=(a,b)=>a+Math.random()*(b-a);
function duration(id){const p=PHASES[id];return Math.round(rand(p.months[0],p.months[1]));}
function create(){return{id:'recovery',monthsLeft:duration('recovery'),elapsed:0,history:[]};}
function ensure(e){if(!e||!PHASES[e.id])return create();if(!Number.isFinite(e.monthsLeft))e.monthsLeft=duration(e.id);if(!Array.isArray(e.history))e.history=[];return e;}
function phase(e){return PHASES[ensure(e).id];}
function monthly(e){e=ensure(e);e.monthsLeft--;e.elapsed++;let changed=null;if(e.monthsLeft<=0){const prev=e.id;e.id=pick(NEXT[prev]);e.monthsLeft=duration(e.id);e.history.unshift({from:prev,to:e.id,at:e.elapsed});e.history=e.history.slice(0,20);changed={from:PHASES[prev],to:PHASES[e.id]};}return{state:e,phase:PHASES[e.id],changed};}
function stockImpact(e,sector){const id=ensure(e).id;return PHASES[id].market+((SECTOR[id]||{})[sector]||0);}
function salaryMultiplier(e){return phase(e).salary;}
function loanMultiplier(e){return phase(e).loan;}
function propertyReturn(e){return phase(e).property+rand(-.006,.006);}
function livingMultiplier(e){return phase(e).living;}
function layoffRisk(e,jobRisk){return Math.min(.25,phase(e).layoff+(jobRisk||0)*.12);}
root.QT_ECONOMY={PHASES,create,ensure,phase,monthly,stockImpact,salaryMultiplier,loanMultiplier,propertyReturn,livingMultiplier,layoffRisk};
})(window);
