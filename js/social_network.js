/* QuickTrade Life — 인맥·호의·기회 네트워크 */
(function(root){'use strict';
const ROLES=[
 {id:'mother',icon:'👩',name:'엄마',benefit:'생활 조언·가족 도움',personal:true},
 {id:'father',icon:'👨',name:'아빠',benefit:'생활 조언·가족 도움',personal:true},
 {id:'guardian',icon:'🫶',name:'보호자',benefit:'가족의 응원',personal:true},
 {id:'schoolfriend',icon:'🎒',name:'학창시절 친구',benefit:'옛 친구의 도움',personal:true},
 {id:'subordinate',icon:'🛡️',name:'세력 부하',benefit:'작전 보고·세력 지원',faction:true},
 {id:'mentor',icon:'🧑‍🏫',name:'업계 선배',benefit:'경력·승진 조언'},
 {id:'banker',icon:'🏦',name:'은행원',benefit:'신용과 대출 조언'},
 {id:'founder',icon:'🚀',name:'창업가',benefit:'사업·투자 기회'},
 {id:'official',icon:'🏛️',name:'공무원',benefit:'행정·법률 조언'},
 {id:'reporter',icon:'📰',name:'기자',benefit:'시장 정보와 평판'},
 {id:'lawyer',icon:'⚖️',name:'변호사',benefit:'법적 위험 방어'},
];
const NAMES=['김현우','박서진','이도윤','최유나','정민석','한지수','윤태호','송하린','오세훈','임채원'];
const INDUSTRY_GATHERINGS=[
 {id:'open',tier:0,icon:'☕',name:'공개 네트워킹',cost:300000,minReputation:0,minStanding:0,
  desc:'작은 명함 교환회입니다. 평판과 사교 실적을 쌓는 출발점입니다.',candidates:[]},
 {id:'lounge',tier:1,icon:'🥂',name:'업계 라운지',cost:800000,minReputation:22,minStanding:1,
  desc:'현장 운영자들이 모이는 초청 라운지입니다.',candidates:['office']},
 {id:'forum',tier:2,icon:'🏛️',name:'비공개 포럼',cost:1800000,minReputation:30,minStanding:3,
  desc:'제작·서비스 분야의 실력자들이 계약 전 서로를 살피는 자리입니다.',candidates:['creative','medical']},
 {id:'salon',tier:3,icon:'💎',name:'대표자 살롱',cost:3500000,minReputation:38,minStanding:6,
  desc:'기업 대표와 자문 책임자만 초대받는 최상위 사교 모임입니다.',candidates:['corporate']},
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),pick=a=>a[Math.floor(Math.random()*a.length)];
function ensure(life){
 if(!life.social)life.social={contacts:[],reputation:20,favorsUsed:0};
 const s=life.social;
 if(!Array.isArray(s.contacts))s.contacts=[];
 s.reputation=clamp(Number(s.reputation)||20,0,100);
 if(!s.industry||typeof s.industry!=='object')s.industry={standing:0,meetings:0,introduced:[]};
 s.industry.standing=Math.max(0,Math.floor(Number(s.industry.standing)||0));
 s.industry.meetings=Math.max(0,Math.floor(Number(s.industry.meetings)||0));
 if(!Array.isArray(s.industry.introduced))s.industry.introduced=[];
 s.contacts.forEach(c=>{
  if(c&&(c.origin==='faction'||c.factionMemberId)){
   c.role='subordinate';
   c.relationLabel=c.relationLabel||'세력 부하 · 상황 보고';
  }
 });
 return s;
}
function gatheringStatus(life,gatheringId){
 const s=ensure(life),g=INDUSTRY_GATHERINGS.find(item=>item.id===gatheringId);
 if(!g)return{available:false,reason:'알 수 없는 모임입니다.'};
 if(s.reputation<g.minReputation)return{available:false,gathering:g,reason:`사회 평판 ${g.minReputation} 필요`};
 if(s.industry.standing<g.minStanding)return{available:false,gathering:g,reason:`사교 실적 ${g.minStanding} 필요`};
 return{available:true,gathering:g,reason:''};
}
function attendIndustry(life,gatheringId,random){
 const status=gatheringStatus(life,gatheringId);if(!status.available)return{ok:false,message:status.reason};
 const s=ensure(life),g=status.gathering,rng=typeof random==='function'?random:Math.random;
 s.industry.meetings++;s.industry.standing+=1+g.tier;s.reputation=clamp(s.reputation+2+g.tier,0,100);
 const candidates=g.candidates.filter(id=>!s.industry.introduced.includes(id));
 const introduced=candidates.length?candidates[Math.floor(rng()*candidates.length)]:null;
 if(introduced)s.industry.introduced.push(introduced);
 return{ok:true,gathering:g,introduced,standing:s.industry.standing,reputation:s.reputation};
}
function addContact(life,spec){const s=ensure(life),same=s.contacts.find(c=>(spec.originKey&&c.originKey===spec.originKey)||(c.name===spec.name&&c.role===spec.role));if(same){Object.assign(same,spec||{});if(same.origin==='faction'||same.factionMemberId)same.role='subordinate';return same;}const c=Object.assign({id:'contact-'+Date.now()+'-'+Math.random(),name:'연락처',role:'schoolfriend',trust:15,favor:0,months:0},spec||{});if(c.origin==='faction'||c.factionMemberId)c.role='subordinate';s.contacts.push(c);return c;}
function meet(life){const s=ensure(life),networkRoles=ROLES.filter(r=>!r.personal&&!r.faction),available=networkRoles.filter(r=>!s.contacts.some(c=>c.role===r.id));if(!available.length)return null;const r=pick(available),c={id:'contact-'+Date.now()+'-'+Math.random(),name:pick(NAMES),role:r.id,trust:15,favor:0,months:0};s.contacts.push(c);return c;}
function role(c){return ROLES.find(r=>r.id===c.role)||ROLES[0];}
function isSubordinate(c){return!!(c&&(c.role==='subordinate'||c.origin==='faction'||c.factionMemberId));}
function nurture(life,id){const c=ensure(life).contacts.find(x=>x.id===id);if(!c)return null;c.trust=clamp(c.trust+12,0,100);c.favor=clamp(c.favor+1,0,5);return c;}
function ask(life,id){const s=ensure(life),c=s.contacts.find(x=>x.id===id);if(!c||c.trust<30||c.favor<1)return{ok:false,message:'신뢰 30과 호의 1이 필요합니다.'};c.favor--;c.trust=clamp(c.trust-5,0,100);s.favorsUsed++;const outcomes={mother:{cash:700000,familyBond:6,text:'🏠 엄마가 생활비와 반찬을 챙겨줬습니다'},father:{cash:700000,familyBond:6,text:'🏠 아빠가 급한 생활비를 보태줬습니다'},guardian:{cash:900000,familyBond:8,text:'🫶 보호자가 어려울 때 쓰라며 돈을 보내줬습니다'},schoolfriend:{careerSkill:4,reputation:3,text:'🎒 학창 친구가 채용 정보와 업계 사람을 소개했습니다'},mentor:{careerSkill:8,text:'📈 직무 능력 +8 (승진 확률이 올라갑니다)'},banker:{credit:35,text:'🏦 신용점수 +35 (대출 한도·금리가 좋아집니다)'},founder:{cash:3000000,text:'🚀 공동 프로젝트 수익 +3,000,000원'},official:{recordShield:1,text:'🏛️ 법적 방패 +1 (형사사건 방어에 유리)'},reporter:{reputation:10,text:'📰 평판 +10 (사회적 신뢰가 올라갑니다)'},lawyer:{recordShield:2,text:'⚖️ 법적 방패 +2 (재판 무죄·감형에 유리)'}};return{ok:true,contact:c,effect:outcomes[c.role]||{reputation:3,text:'🤝 도움을 받아 평판이 조금 올랐습니다'}};}
function monthly(life){const s=ensure(life),news=[];s.contacts.forEach(c=>{c.months++;if(isSubordinate(c))return;if(c.months%6===0)c.trust=clamp(c.trust-2,0,100);if(c.trust>=65&&Math.random()<.035){c.favor=clamp(c.favor+1,0,5);news.push(`${role(c).icon} ${c.name}에게서 새로운 도움 제안이 왔습니다.`);}});return{news};}
function legalShield(life){return ensure(life).contacts.filter(c=>['lawyer','official'].includes(c.role)&&c.trust>=50).reduce((s,c)=>s+(c.role==='lawyer'?.08:.04),0);}
const CONTACT_LINES={
 mother:['밥은 먹었니? 돈 아낀다고 끼니 거르지는 마.','요즘 목소리를 못 들었네. 별일 없는 거지?','집에 올 때 필요한 거 있으면 말해. 반찬 해 둘게.'],
 father:['학교 때 일은 이제 놓고 살아라. 지나간 사람들 소식까지 붙들고 있을 필요 없다.','집에만 있지 말고 밖에도 나가 봐라. 과거가 아니라 지금 네 생활을 만들어야지.','돈 잃은 건 다시 벌면 된다. 네 인생까지 멈춰 세우지만 마라.','이번 달은 어떠냐. 일 끝나면 바람도 쐬고 밥도 제대로 챙겨 먹어라.'],
 guardian:['잘하고 있는지보다 잘 지내는지가 더 궁금해.','힘들면 돌아와도 돼. 네 자리는 그대로 있으니까.','먼저 연락하기 어려울까 봐 내가 했어. 밥은 챙겼지?'],
 schoolfriend:['야, 졸업하고도 이렇게 바쁠 줄 누가 알았냐. 잘 지내?','우리 학교 앞 분식집 아직 있대. 언제 한번 갈래?','네 업계 쪽 공고 하나 봤는데 생각나서 보냈어.'],
 subordinate:['형님, 이번 달 상황 정리했습니다. 지시만 주시면 바로 움직이겠습니다.','경쟁 세력 동향과 우리 쪽 현금흐름을 확인했습니다. 우선순위를 정해주십시오.','작전 중 이상 징후가 하나 잡혔습니다. 확실해질 때까지 제가 더 파보겠습니다.'],
 mentor:['요즘 일은 좀 익숙해졌습니까? 막히는 부분이 있으면 말해요.'],
 banker:['신용점수 변동이 있길래 생각나서 연락했습니다. 무리한 대출은 피하세요.'],
 founder:['재미있는 프로젝트가 하나 있는데, 나중에 시간 되면 이야기하죠.'],
 official:['필요한 행정 절차가 있으면 미리 물어보세요. 기한 지나면 복잡해집니다.'],
 reporter:['당신 업계에서 재미있는 소문이 있던데, 사실 확인부터 하려고요.'],
 lawyer:['계약서에 서명하기 전에는 짧게라도 보여 주세요. 나중보다 지금이 싸요.'],
};
function contactLine(c){return pick(CONTACT_LINES[isSubordinate(c)?'subordinate':c.role]||['오랜만이에요. 별일 없이 지내고 있죠?']);}
function contactIntent(text){const line=String(text||'');if(/밥|끼니|먹|반찬/.test(line))return'food';if(/얼굴|보자|갈래|만나|집에 올|분식집/.test(line))return'meet';if(/공고|프로젝트|계약|투자|대출|신용|행정|업계|소문/.test(line))return'work';if(/힘들|무리|몸|잘 지내|별일|괜찮/.test(line))return'wellbeing';return'general';}
function contactAnswer(c,kind,incomingText){if(isSubordinate(c)){const lines={ack:'보고 확인했다. 계획대로 대기해.',order:'정보 수집을 우선하고 내 지시 전에는 움직이지 마.',protect:'무리하지 마. 위험하면 작전보다 네 안전을 먼저 챙겨.',question:'근거와 예상되는 다음 수를 더 자세히 보고해.'};return lines[kind]||lines.ack;}const family=['mother','father','guardian'].includes(c.role),intent=contactIntent(incomingText);const contextual={
 food:{warm:family?'응, 오늘은 제대로 챙겨 먹었어. 걱정해줘서 고마워.':'네, 식사는 챙겼어요. 먼저 물어봐 주셔서 고마워요.',brief:'응, 밥은 먹었어.',advice:'요즘 끼니가 자꾸 불규칙해져. 생활 리듬 잡는 방법을 같이 생각해줄래?',meet:family?'이번 달에 집에 가서 같이 밥 먹자.':'이번 달에 식사하면서 이야기 나눠요.'},
 meet:{warm:family?'좋아. 이번 달에는 꼭 시간 내서 얼굴 보러 갈게.':'좋아요. 이번에는 말로만 하지 말고 날짜를 잡아요.',brief:'좋아. 일정 보고 다시 말할게.',advice:'만나면 요즘 고민하던 일도 같이 이야기하고 싶어.',meet:family?'이번 달에 집에 갈게. 같이 밥 먹자.':'이번 달에 직접 만나요. 가능한 날을 알려주세요.'},
 work:{warm:'정보 고마워. 지금 확인해 보고 궁금한 건 다시 물어볼게.',brief:'확인했어. 정리되면 다시 연락할게.',advice:'이 내용에서 내가 특히 조심해야 할 부분이 뭔지 알려줄래?',meet:'자료를 같이 보면서 이야기하고 싶어. 이번 달에 만날 수 있을까?'},
 wellbeing:{warm:family?'조금 바빴지만 괜찮아. 이렇게 물어봐줘서 마음이 놓여.':'잘 지내고 있어요. 챙겨 물어봐 주셔서 고마워요.',brief:'응, 별일 없어. 잘 지내.',advice:'요즘 조금 버거운 일이 있어. 잠깐 이야기 들어줄래?',meet:family?'이번 달에는 얼굴 보러 갈게. 직접 보면 안심될 거야.':'이번 달에 만나서 천천히 이야기해요.'},
 };if(contextual[intent]&&contextual[intent][kind])return contextual[intent][kind];const lines={
 warm:family?['응, 잘 지내고 있어. 이번 달엔 꼭 얼굴 보러 갈게.','먼저 연락해줘서 고마워. 나도 많이 생각했어.']:c.role==='schoolfriend'?['그러게, 우리 진짜 오래됐다. 이번엔 꼭 보자.','네 연락 보니까 학창시절 생각난다. 잘 지냈어?']:['연락 고마워요. 조만간 직접 만나서 이야기해요.'],
 brief:family?['응, 별일 없어. 끝나고 다시 연락할게.']:['확인했어. 조금 있다가 다시 연락할게.'],
 advice:family?['요즘 일이 좀 버거워. 잠깐 이야기 들어줄래?']:c.role==='schoolfriend'?['네가 보기엔 내가 지금 하는 일, 계속해도 될 것 같아?']:['지금 고민이 하나 있는데 조언을 구해도 될까요?'],
 meet:family?['이번 달에는 시간 내서 집에 갈게. 같이 밥 먹자.']:c.role==='schoolfriend'?['우리 학교 앞에서 한번 보자. 내가 밥 살게.']:['이번 달에 시간 괜찮으면 직접 뵙고 싶어요.'],
};return pick(lines[kind]||lines.brief);}
function contactReplyOptions(c,incomingText){const ids=isSubordinate(c)?['ack','order','protect','question']:['warm','advice','meet','brief'];return ids.map(id=>({id,text:contactAnswer(c,id,incomingText)}));}
root.QT_SOCIAL={ROLES,INDUSTRY_GATHERINGS,ensure,addContact,meet,gatheringStatus,attendIndustry,role,isSubordinate,nurture,ask,monthly,legalShield,contactLine,contactAnswer,contactReplyOptions};
})(window);
