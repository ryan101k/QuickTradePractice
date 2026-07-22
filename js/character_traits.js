/* QuickTrade Life — 인물별 고유 관계 시스템 */
(function(root){'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const SYSTEMS={
 '나래':{key:'discipline',icon:'📉',name:'투자 원칙 신뢰',good:true,scene:'event-narae-market-crash.png',monthly:(l,c)=>c.marginCalled?-18:c.debtRatio<.5&&c.morality>=55?5:-1,actions:{경력:4,휴식:2,라이벌:-4}},
 '강유진':{key:'savior',icon:'🚨',name:'구원 강박',scene:'event-yujin-rain-rescue.png',monthly:(l,c)=>(c.crime*7)+(c.hasCase?8:0)+(c.debtRatio>1?5:0)+(c.morality<40?6:-3)+(c.job==='none'?3:0),actions:{라이벌:7,인맥:1,가족:-2}},
 '윤세라':{key:'obsession',icon:'🖤',name:'집착',scene:'event-sera-doorstep.png',external:true,monthly:()=>0,actions:{}},
 '한채린':{key:'submission',icon:'👑',name:'복종 만족',scene:'event-chaerin-contract.png',monthly:(l,c)=>c.prestige>=65?-5:c.prestige<=25?6:1,actions:{경력:-5,라이벌:4,인맥:3}},
 '서연':{key:'inspiration',icon:'🎨',name:'영감 교감',good:true,scene:'event-seoyeon-repair.png',monthly:(l,c)=>c.happy>=60?4:c.stress>70?-4:1,actions:{취미:8,휴식:3,경력:2}},
 '하은':{key:'careDebt',icon:'🩺',name:'돌봄 피로',scene:'event-haeun-hospital.png',monthly:(l,c)=>c.health<55?8:c.stress>65?5:-4,actions:{휴식:-6,가족:4,라이벌:5}},
 '예린':{key:'stability',icon:'📅',name:'생활 안정감',good:true,scene:'event-yerin-rain.png',monthly:(l,c)=>(c.debtRatio<.6?4:-6)+(c.job==='none'?-5:2),actions:{가족:6,경력:3,라이벌:-5}},
 '채원':{key:'returnHome',icon:'✈️',name:'돌아올 곳',good:true,scene:'event-chaewon-airport.png',monthly:(l,c)=>c.relationshipStable?4:-2,actions:{휴식:5,가족:5,경력:-1}},
 '유나':{key:'scandal',icon:'📸',name:'스캔들 열기',scene:'event-yuna-backstage.png',monthly:(l,c)=>c.lovers*7+(c.reputation>45?3:-1),actions:{데이트:7,인맥:4,휴식:-3}},
 '수아':{key:'burden',icon:'🏫',name:'책임 과부하',scene:'event-sua-classroom.png',monthly:(l,c)=>(c.stress>60?6:1)+(c.children>0?3:0),actions:{가족:5,휴식:-7,인맥:3}},
 '보라':{key:'routine',icon:'💊',name:'일상 신뢰',good:true,scene:'event-bora-pharmacy.png',monthly:(l,c)=>c.debtRatio<.8&&c.stress<65?5:-4,actions:{휴식:5,가족:4,데이트:2}},
 '다은':{key:'dream',icon:'🎂',name:'공동의 꿈',good:true,scene:'event-daeun-cake.png',monthly:(l,c)=>c.properties>0?4:1,actions:{경력:5,취미:5,가족:3}},
 '혜진':{key:'evidence',icon:'🔬',name:'검증된 신뢰',good:true,scene:'event-hyejin-blackout.png',monthly:(l,c)=>c.morality>=60?4:c.crime>0?-7:0,actions:{경력:7,인맥:2,라이벌:-6}},
 '소희':{key:'freedom',icon:'🎻',name:'자유의 여백',good:true,scene:'event-sohee-backstage.png',monthly:(l,c)=>c.relationshipStable?2:-1,actions:{취미:8,데이트:4,가족:-2}},
 '아린':{key:'confession',icon:'📚',name:'마음의 원고',good:true,scene:'event-arin-first-snow.png',monthly:(l,c)=>c.stress<55?3:-2,actions:{휴식:4,인맥:4,취미:5}},
 '나영':{key:'rivalry',icon:'🏋️',name:'승부욕',scene:'event-nayoung-wrist.png',monthly:(l,c)=>c.fitness>=45?5:-2,actions:{취미:6,경력:5,라이벌:7}},
 '미래':{key:'sync',icon:'🎮',name:'취향 싱크',good:true,scene:'event-mirae-launch.png',monthly:(l,c)=>c.hobbies>2?4:1,actions:{취미:8,휴식:3,경력:4}}
};
function system(name){return SYSTEMS[name]||null;}
function ensure(rec){const s=rec&&system(rec.name);if(!s)return null;if(!rec.signature||rec.signature.key!==s.key)rec.signature={key:s.key,value:s.good?35:10,stage:0};return rec.signature;}
function stageOf(s,v){if(!s)return 0;if(s.good)return v>=75?3:v>=50?2:v>=25?1:0;return v>=75?3:v>=45?2:v>=20?1:0;}
function label(rec){const s=rec&&system(rec.name),st=ensure(rec);return s&&st?`${s.icon} ${s.name} ${Math.round(st.value)}/100`:'';}
function context(life,extra){return Object.assign({crime:life.criminalRecord||0,hasCase:!!(life.justice&&life.justice.case),morality:life.morality==null?60:life.morality,job:life.job,stress:life.stress||0,health:life.health||0,children:(life.children||[]).length,lovers:(life.lovers||[]).length,properties:(life.properties||[]).length,fitness:life.fitness||0,hobbies:life.hobbiesDone||0,reputation:(life.social&&life.social.reputation)||0,prestige:0,debtRatio:0,relationshipStable:life.relationship!=='single'&&(life.affection||0)>=55},extra||{});}
function change(rec,delta){const s=system(rec.name),st=ensure(rec);if(!s||!st||s.external)return null;const beforeStage=stageOf(s,st.value);st.value=clamp(st.value+(delta||0),0,100);const afterStage=stageOf(s,st.value);return{spec:s,state:st,beforeStage,afterStage,changed:afterStage!==beforeStage};}
function action(rec,group,ctx){const s=system(rec&&rec.name);if(!s||s.external)return null;return change(rec,(s.actions&&s.actions[group])||0);}
function monthly(life,ctx){const out=[],c=context(life,ctx);(life.met||[]).forEach(rec=>{const s=system(rec.name);if(!s||s.external)return;const result=change(rec,s.monthly(life,c));if(result&&result.changed)out.push({rec,...result});});return out;}
function stageText(rec){const s=system(rec.name),st=ensure(rec),n=stageOf(s,st.value);if(rec.name==='강유진')return['원칙적 거리','걱정','구원 강박','공범적 보호'][n];if(rec.name==='한채린')return['무관심','흥미','복종 요구','완전한 소유'][n];if(rec.name==='유나')return['조용함','소문','스캔들','대중 폭발'][n];return s.good?['낯섦','관심','유대','고유 보너스'][n]:['안정','징후','갈등','위험'][n];}
root.QT_CHARACTER_TRAITS={SYSTEMS,system,ensure,label,stageOf,stageText,context,change,action,monthly};
})(window);
