/* QuickTrade Life — 인맥·호의·기회 네트워크 */
(function(root){'use strict';
const ROLES=[
 {id:'mentor',icon:'🧑‍🏫',name:'업계 선배',benefit:'경력·승진 조언'},
 {id:'banker',icon:'🏦',name:'은행원',benefit:'신용과 대출 조언'},
 {id:'founder',icon:'🚀',name:'창업가',benefit:'사업·투자 기회'},
 {id:'official',icon:'🏛️',name:'공무원',benefit:'행정·법률 조언'},
 {id:'reporter',icon:'📰',name:'기자',benefit:'시장 정보와 평판'},
 {id:'lawyer',icon:'⚖️',name:'변호사',benefit:'법적 위험 방어'},
];
const NAMES=['김현우','박서진','이도윤','최유나','정민석','한지수','윤태호','송하린','오세훈','임채원'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),pick=a=>a[Math.floor(Math.random()*a.length)];
function ensure(life){if(!life.social)life.social={contacts:[],reputation:20,favorsUsed:0};return life.social;}
function meet(life){const s=ensure(life),available=ROLES.filter(r=>!s.contacts.some(c=>c.role===r.id));if(!available.length)return null;const r=pick(available),c={id:'contact-'+Date.now()+'-'+Math.random(),name:pick(NAMES),role:r.id,trust:15,favor:0,months:0};s.contacts.push(c);return c;}
function role(c){return ROLES.find(r=>r.id===c.role)||ROLES[0];}
function nurture(life,id){const c=ensure(life).contacts.find(x=>x.id===id);if(!c)return null;c.trust=clamp(c.trust+12,0,100);c.favor=clamp(c.favor+1,0,5);return c;}
function ask(life,id){const s=ensure(life),c=s.contacts.find(x=>x.id===id);if(!c||c.trust<30||c.favor<1)return{ok:false,message:'신뢰 30과 호의 1이 필요합니다.'};c.favor--;c.trust=clamp(c.trust-5,0,100);s.favorsUsed++;const outcomes={mentor:{careerSkill:8,text:'📈 직무 능력 +8 (승진 확률이 올라갑니다)'},banker:{credit:35,text:'🏦 신용점수 +35 (대출 한도·금리가 좋아집니다)'},founder:{cash:3000000,text:'🚀 공동 프로젝트 수익 +3,000,000원'},official:{recordShield:1,text:'🏛️ 법적 방패 +1 (형사사건 방어에 유리)'},reporter:{reputation:10,text:'📰 평판 +10 (사회적 신뢰가 올라갑니다)'},lawyer:{recordShield:2,text:'⚖️ 법적 방패 +2 (재판 무죄·감형에 유리)'}};return{ok:true,contact:c,effect:outcomes[c.role]};}
function monthly(life){const s=ensure(life),news=[];s.contacts.forEach(c=>{c.months++;if(c.months%6===0)c.trust=clamp(c.trust-2,0,100);if(c.trust>=65&&Math.random()<.035){c.favor=clamp(c.favor+1,0,5);news.push(`${role(c).icon} ${c.name}에게서 새로운 도움 제안이 왔습니다.`);}});return{news};}
function legalShield(life){return ensure(life).contacts.filter(c=>['lawyer','official'].includes(c.role)&&c.trust>=50).reduce((s,c)=>s+(c.role==='lawyer'?.08:.04),0);}
root.QT_SOCIAL={ROLES,ensure,meet,role,nurture,ask,monthly,legalShield};
})(window);
