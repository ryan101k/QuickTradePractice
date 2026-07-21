/* QuickTrade Life — 인생 연대기·멀티 엔딩 판정 */
(function(root){'use strict';
const ENDINGS=[
 {id:'dynasty',icon:'👑',name:'세대를 잇는 재벌가',desc:'막대한 자산과 단단한 가족을 함께 남겼습니다.',test:x=>x.wealth>=1000000000&&x.children>0&&x.familyBond>=60},
 {id:'market_legend',icon:'📈',name:'시장의 전설',desc:'수많은 거래와 투자 성과로 이름을 남겼습니다.',test:x=>x.wealth>=300000000&&x.trades>=100&&x.realized>50000000},
 {id:'self_made',icon:'🏙️',name:'자수성가한 거인',desc:'작은 종잣돈에서 거대한 부를 일궜습니다.',test:x=>x.wealth>=500000000},
 {id:'family',icon:'🏡',name:'가족이 남긴 유산',desc:'돈보다 서로를 지키는 삶을 완성했습니다.',test:x=>x.children>0&&x.familyBond>=80&&x.happy>=65},
 {id:'career',icon:'🏆',name:'한 분야의 장인',desc:'오랜 경력과 전문성으로 존경받았습니다.',test:x=>x.careerMonths>=300&&x.skill>=80},
 {id:'network',icon:'🤝',name:'사람을 잇는 거물',desc:'신뢰와 인맥이 가장 큰 자산이 되었습니다.',test:x=>x.contacts>=5&&x.reputation>=60},
 {id:'redemption',icon:'🕊️',name:'두 번째 기회',desc:'과오를 겪고도 삶을 다시 세웠습니다.',test:x=>x.record>0&&x.rehab>=3&&x.wealth>0},
 {id:'quiet',icon:'🌿',name:'평온한 보통의 삶',desc:'큰 영광보다 건강과 일상의 행복을 지켰습니다.',test:x=>x.happy>=60&&x.health>=55&&x.debt<=0},
 {id:'lonely_rich',icon:'🥀',name:'화려하고 외로운 정상',desc:'부는 쌓았지만 가까운 관계는 멀어졌습니다.',test:x=>x.wealth>=200000000&&x.familyBond<35},
 {id:'survivor',icon:'🔥',name:'끝까지 살아남은 사람',desc:'부채와 실패 속에서도 마지막 장까지 버텼습니다.',test:x=>x.debt>0||x.wealth<0},
];
function ensure(l){if(!l.legacy)l.legacy={timeline:[],last:{},dynasty:[],ending:null};if(!Array.isArray(l.legacy.timeline))l.legacy.timeline=[];if(!Array.isArray(l.legacy.dynasty))l.legacy.dynasty=[];return l.legacy;}
function push(l,age,icon,text,kind='life'){const g=ensure(l);const key=`${age}:${text}`;if(g.timeline.some(e=>e.key===key))return;g.timeline.push({key,age,icon,text,kind});if(g.timeline.length>80)g.timeline=g.timeline.slice(-80);}
function monthly(l,ctx){const g=ensure(l),p=g.last||{},age=ctx.age;if(ctx.month===1)push(l,age,'🎂',`${age}세가 되었다`,'age');if(p.job&&p.job!==ctx.job)push(l,age,'💼',`${ctx.jobName}(으)로 새로운 경력을 시작했다`,'career');if((p.children||0)<ctx.children)push(l,age,'👶',`가족이 ${ctx.children}명의 자녀와 함께하게 됐다`,'family');if((p.record||0)<ctx.record)push(l,age,'⚖️',`형사 판결로 전과 기록이 남았다`,'justice');for(const m of [100000000,500000000,1000000000])if((p.wealth||0)<m&&ctx.wealth>=m)push(l,age,'💰',`순자산 ${Math.round(m/100000000)}억원을 돌파했다`,'wealth');if(p.relationship&&p.relationship!==ctx.relationship)push(l,age,ctx.relationship==='married'?'💍':'💔',ctx.relationship==='married'?'결혼해 새로운 가족을 꾸렸다':'관계에 큰 변화가 찾아왔다','family');g.last={job:ctx.job,children:ctx.children,record:ctx.record,wealth:ctx.wealth,relationship:ctx.relationship};}
function facts(l,ctx){const c=l.career||{},s=l.social||{},j=l.justice||{};return{...ctx,children:(l.children||[]).length,familyBond:l.familyBond||0,happy:l.happy||0,health:l.health||0,debt:l.loan||0,record:l.criminalRecord||0,careerMonths:c.months||0,skill:c.skill||0,contacts:(s.contacts||[]).length,reputation:s.reputation||0,rehab:j.rehab||0};}
function ending(l,ctx){const x=facts(l,ctx),e=ENDINGS.find(v=>v.test(x))||ENDINGS[ENDINGS.length-1];ensure(l).ending=e.id;return e;}
function archive(l,summary){const g=ensure(l);g.dynasty.push(summary);return g.dynasty.slice();}
root.QT_LEGACY={ENDINGS,ensure,push,monthly,facts,ending,archive};
})(window);
