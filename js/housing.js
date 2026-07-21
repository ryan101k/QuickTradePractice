/* QuickTrade Life — 실거주·생활 수준 엔진 */
(function(root){'use strict';
const HOMES=[
 {id:'parents',icon:'🏡',name:'부모님 집',deposit:0,rent:200000,manage:100000,capacity:2,health:1,stress:-2,charm:-3,education:0,commute:5,desc:'저렴하지만 독립성과 사생활이 부족'},
 {id:'gosiwon',icon:'🚪',name:'고시원',deposit:1000000,rent:380000,manage:80000,capacity:1,health:-4,stress:7,charm:-8,education:-1,commute:2,desc:'매우 좁고 저렴한 도심 주거'},
 {id:'basement',icon:'🧱',name:'반지하 원룸',deposit:5000000,rent:520000,manage:120000,capacity:2,health:-3,stress:4,charm:-5,education:-1,commute:3,desc:'공간은 있지만 습기와 침수 위험'},
 {id:'studio',icon:'🏠',name:'신축 원룸',deposit:10000000,rent:750000,manage:180000,capacity:2,health:1,stress:0,charm:2,education:0,commute:2,desc:'혼자 또는 신혼부부에게 적당'},
 {id:'officetel',icon:'🏙️',name:'도심 오피스텔',deposit:30000000,rent:1200000,manage:350000,capacity:2,health:2,stress:-3,charm:5,education:1,commute:0,desc:'출퇴근이 편하고 생활 인프라 우수'},
 {id:'apartment',icon:'🏢',name:'가족형 아파트',deposit:80000000,rent:1800000,manage:450000,capacity:5,health:5,stress:-5,charm:7,education:6,commute:3,desc:'육아·교육·가족생활에 유리'},
 {id:'premium',icon:'🌇',name:'고급 주상복합',deposit:200000000,rent:3500000,manage:900000,capacity:5,health:7,stress:-7,charm:12,education:8,commute:0,desc:'최상급 편의시설과 사회적 체면'},
 {id:'mansion',icon:'🏰',name:'대저택',deposit:800000000,rent:8000000,manage:2500000,capacity:8,health:9,stress:-8,charm:20,education:10,commute:5,desc:'가문을 상징하는 최고급 주거'},
];
function ensure(life){if(!life.housing||!HOMES.some(h=>h.id===life.housing.id))life.housing={id:'parents',depositPaid:0,months:0};return life.housing;}
function home(life){return HOMES.find(h=>h.id===ensure(life).id)||HOMES[0];}
function move(life,id){const target=HOMES.find(h=>h.id===id);if(!target)return null;const current=ensure(life),refund=Math.round((current.depositPaid||0)*.97);life.housing={id,depositPaid:target.deposit,months:0};return{target,refund,cost:target.deposit};}
function monthly(life,livingMultiplier=1){const h=home(life);life.housing.months++;const expense=Math.round((h.rent+h.manage)*livingMultiplier);return{home:h,expense,health:h.health,stress:h.stress,charm:h.charm,education:h.education,commute:h.commute};}
function canAddChild(life){return (life.children||[]).length+(life.familyPlan?1:0)<home(life).capacity;}
root.QT_HOUSING={HOMES,ensure,home,move,monthly,canAddChild};
})(window);
