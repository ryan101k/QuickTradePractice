/* QuickTrade Life — 자녀 성장·부모 부양·세대 계승 엔진 */
(function(root){'use strict';
const NAMES=['하율','지안','도하','서아','이준','윤슬','시온','가온','주원','다온','예준','채아','로운','은우','소율','태린'];
const TRAITS=[
 {id:'curious',name:'호기심 많은',icon:'🔎',talent:'연구',study:1.2,happy:0},
 {id:'social',name:'사교적인',icon:'🤝',talent:'관계',study:.9,happy:2},
 {id:'artistic',name:'감성적인',icon:'🎨',talent:'예술',study:1,happy:1},
 {id:'driven',name:'야망 있는',icon:'🔥',talent:'사업',study:1.15,happy:-1},
 {id:'calm',name:'차분한',icon:'🌿',talent:'안정',study:1.05,happy:1},
 {id:'rebellious',name:'자유로운',icon:'⚡',talent:'창의',study:.8,happy:0},
];
const pick=a=>a[Math.floor(Math.random()*a.length)],clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function ensure(life){
 if(!Array.isArray(life.children))life.children=[];if(!life.familyPlan)life.familyPlan=null;
 if(!Number.isFinite(life.parentHealth))life.parentHealth=78;if(!Number.isFinite(life.parentAge))life.parentAge=58;
 if(!Number.isFinite(life.familyBond))life.familyBond=35;if(!life.playerName)life.playerName='나';return life;
}
function childAge(c){const y=Math.floor(c.ageMonths/12),m=c.ageMonths%12;return{years:y,months:m,label:y?`만 ${y}세`:`${m}개월`};}
function stage(c){const y=childAge(c).years;return y<3?'영유아':y<7?'유치원':y<13?'초등학생':y<16?'중학생':y<19?'고등학생':y<23?'대학생·사회초년생':'성인';}
function monthlyCost(c){const y=childAge(c).years;return y<3?800000:y<7?650000:y<13?850000:y<16?1050000:y<19?1400000:y<23?900000:0;}
function startPlan(life,method,meta){ensure(life);if(life.familyPlan)return{ok:false,message:'이미 가족 계획이 진행 중입니다.'};if(life.children.length>=4)return{ok:false,message:'현재는 자녀 4명까지 가능합니다.'};
 const adoption=method==='adopt',m=meta||{};life.familyPlan={method:adoption?'입양':'출산',months:adoption?6:9,cost:adoption?12000000:5000000,origin:m.origin||'marriage',otherParent:m.otherParent||null,secret:!!m.secret};return{ok:true,plan:life.familyPlan};}
function createChild(life){const plan=life.familyPlan||{},trait=pick(TRAITS),available=NAMES.filter(n=>!life.children.some(c=>c.name===n)),name=pick(available.length?available:NAMES);const c={id:'child-'+Date.now()+'-'+Math.random(),name,ageMonths:0,trait:trait.id,talent:trait.talent,education:0,bond:50,happy:70,health:90,origin:plan.origin||'marriage',otherParent:plan.otherParent||null,secret:!!plan.secret};life.children.push(c);return c;}
function monthly(life){ensure(life);const news=[];let cost=0,birth=null;
 if(life.familyPlan){life.familyPlan.months--;if(life.familyPlan.months<=0){birth=createChild(life);news.push(`👶 ${birth.name}이(가) 가족이 되었습니다`);life.familyPlan=null;life.familyBond=clamp(life.familyBond+15,0,100);}}
 life.children.forEach(c=>{c.ageMonths++;cost+=monthlyCost(c);const t=TRAITS.find(x=>x.id===c.trait)||TRAITS[0];c.happy=clamp(c.happy+(t.happy||0)+(c.bond>60?1:0)-1,0,100);if(c.ageMonths%12===0)news.push(`🎂 ${c.name} ${childAge(c).label} · ${stage(c)}`);});
 if(life.parentAge<100&&life.generation===1){life.parentAge+=1/12;const decay=life.parentAge>70?.8:.25;life.parentHealth=clamp(life.parentHealth-decay,0,100);if(life.parentHealth<35&&Math.random()<.12)news.push('👵 부모님의 건강이 좋지 않아 돌봄이 필요합니다.');}
 return{cost,news,birth};}
function educate(life,id,amount){const c=life.children.find(x=>x.id===id);if(!c)return null;const t=TRAITS.find(x=>x.id===c.trait)||TRAITS[0];c.education+=Math.round(amount/100000)*(t.study||1);c.bond=clamp(c.bond+2,0,100);return c;}
function bond(life,id){const c=life.children.find(x=>x.id===id);if(!c)return null;c.bond=clamp(c.bond+10,0,100);c.happy=clamp(c.happy+8,0,100);life.familyBond=clamp(life.familyBond+4,0,100);return c;}
function careParents(life){ensure(life);life.parentHealth=clamp(life.parentHealth+12,0,100);life.familyBond=clamp(life.familyBond+8,0,100);}
function heirs(life){ensure(life);return life.children.filter(c=>childAge(c).years>=18).sort((a,b)=>b.bond-a.bond||b.education-a.education);}
function bestHeir(life){return heirs(life)[0]||life.children.slice().sort((a,b)=>b.bond-a.bond)[0]||null;}
function traitOf(c){return TRAITS.find(t=>t.id===c.trait)||TRAITS[0];}
root.QT_FAMILY={NAMES,TRAITS,ensure,childAge,stage,monthlyCost,startPlan,monthly,educate,bond,careParents,heirs,bestHeir,traitOf};
})(window);
