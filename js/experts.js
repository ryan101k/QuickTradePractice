/* QuickTrade Life — 성향별 애널리스트 리포트 */
(function(root){'use strict';
const PROFILES=[
 {name:'한서준',firm:'코리아밸류리서치',icon:'🧮',style:'가치투자',bias:-.08,horizon:'6~12개월',focus:['실적 대비 밸류에이션','현금흐름과 재무안정성','주주환원 여력']},
 {name:'윤채린',firm:'모멘텀랩',icon:'🚀',style:'모멘텀',bias:.12,horizon:'1~4주',focus:['거래량과 추세 강도','기관·외국인 수급','단기 가격 모멘텀']},
 {name:'박도현',firm:'매크로인사이트',icon:'🌐',style:'거시경제',bias:0,horizon:'3~6개월',focus:['금리·환율 환경','경기 민감도','정책과 유동성']},
 {name:'이지안',firm:'퀀트웨이브',icon:'📊',style:'퀀트',bias:.03,horizon:'1~3개월',focus:['변동성 대비 기대수익','추세 지속 확률','팩터 노출도']},
 {name:'최민석',firm:'콘트라리안캐피탈',icon:'🔄',style:'역발상',bias:-.02,horizon:'6개월+',focus:['시장 과잉반응 여부','악재의 가격 반영 수준','투자심리 쏠림']},
 {name:'서유리',firm:'차트시그널',icon:'📈',style:'기술적분석',bias:.06,horizon:'3~10거래일',focus:['지지·저항 구간','가격과 거래량 배열','추세 전환 신호']},
 {name:'김태오',firm:'리스크가드',icon:'🛡️',style:'리스크관리',bias:-.15,horizon:'상시',focus:['최대 손실 가능성','이벤트 불확실성','포지션 크기와 손절 기준']},
];
const pick=a=>a[Math.floor(Math.random()*a.length)],clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function reports(item,count=3){
 const impact=Number(item&&item.impact)||0, shuffled=[...PROFILES].sort(()=>Math.random()-.5).slice(0,count);
 return shuffled.map(p=>{
  const contrarian=p.style==='역발상'?-Math.sign(impact)*.18:0;
  const score=clamp(.5+impact*1.7+p.bias+contrarian+(Math.random()-.5)*.24,.05,.95);
  const bull=score>=.5, confidence=Math.round((bull?score:1-score)*100);
  const focus=pick(p.focus);
  const thesis=bull?`${focus} 측면에서 기대수익이 위험보다 우위에 있습니다.`:`${focus} 측면에서 아직 위험 프리미엄이 충분하지 않습니다.`;
  const catalyst=impact>0?'호재가 실제 실적과 수급으로 이어지는지 확인해야 합니다.':impact<0?'악재 소화와 매도 압력 둔화가 반전 조건입니다.':'새로운 실적·수급 촉매가 필요합니다.';
  const risk=p.style==='리스크관리'?'예상과 반대 방향으로 움직일 때 손실 한도를 먼저 정해야 합니다.':bull?'기대가 선반영됐다면 차익실현 매물이 나올 수 있습니다.':'악재가 이미 가격에 반영됐다면 급반등 가능성이 있습니다.';
  return{...p,bull,confidence,thesis,catalyst,risk};
 });
}
root.QT_EXPERTS={PROFILES,reports};
})(window);
