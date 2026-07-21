/* QuickTrade Life — 신용등급·대출·추심 엔진 */
(function (root) {
  'use strict';
  const PROVIDERS = [
    { id:'bank1', tier:'1금융', name:'한민국은행', icon:'🏦', minScore:700, monthlyRate:.004, max:100000000 },
    { id:'bank2', tier:'2금융', name:'새봄저축은행', icon:'🏛️', minScore:600, monthlyRate:.009, max:50000000 },
    { id:'capital', tier:'캐피탈', name:'브릿지캐피탈', icon:'💳', minScore:500, monthlyRate:.015, max:30000000 },
    { id:'private', tier:'대부업', name:'스피드머니', icon:'⚠️', minScore:350, monthlyRate:.035, max:20000000 },
    { id:'shark', tier:'불법 사채', name:'블랙캐시', icon:'🦈', minScore:0, monthlyRate:.10, max:50000000, illegal:true },
  ];
  const AMOUNTS = [5000000, 10000000, 30000000, 50000000, 100000000];
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  function ensure(life) {
    if (!Number.isFinite(life.creditScore)) life.creditScore = 720;
    if (!Array.isArray(life.loans)) life.loans = [];
    if (!Number.isFinite(life.collectionLevel)) life.collectionLevel = 0;
    if (!Number.isFinite(life.sharkMonths)) life.sharkMonths = 0;
    if (life.loan > 0 && life.loans.length === 0) {
      life.loans.push({ id:'legacy-'+Date.now(), providerId:'bank2', name:'기존 개인대출', tier:'2금융', balance:life.loan, monthlyRate:.009, illegal:false });
    }
    sync(life); return life;
  }
  function sync(life) { life.loan = Math.round((life.loans||[]).reduce((s,l)=>s+Math.max(0,l.balance),0)); return life.loan; }
  function grade(score) {
    if(score>=900)return '1등급'; if(score>=800)return '2등급'; if(score>=700)return '3등급';
    if(score>=600)return '4등급'; if(score>=500)return '5등급'; if(score>=400)return '6등급'; return '위험';
  }
  function offers(life, monthlyIncome) {
    ensure(life); const annualIncome=Math.max(0,monthlyIncome)*12, debt=sync(life);
    return PROVIDERS.map(p=>{
      const incomeLimit=p.illegal?p.max:Math.max(5000000,annualIncome*(p.id==='bank1'?1.2:p.id==='bank2'?.8:.5));
      const available=Math.max(0,Math.min(p.max,incomeLimit)-debt);
      return {...p,available,approved:life.creditScore>=p.minScore&&available>=1000000};
    });
  }
  function borrow(life, providerId, amount, monthlyIncome) {
    ensure(life); const offer=offers(life,monthlyIncome).find(x=>x.id===providerId); amount=Math.floor(amount);
    if(!offer||!offer.approved)return {ok:false,message:'신용점수 또는 부채 한도로 대출이 거절됐습니다.'};
    if(amount<1||amount>offer.available)return {ok:false,message:`가능 한도는 ${Math.floor(offer.available).toLocaleString('ko-KR')}원입니다.`};
    life.loans.push({id:providerId+'-'+Date.now(),providerId,name:offer.name,tier:offer.tier,balance:amount,monthlyRate:offer.monthlyRate,illegal:!!offer.illegal});
    life.creditScore=clamp(life.creditScore-(offer.illegal?100:offer.id==='private'?45:15),0,1000); sync(life);
    return {ok:true,amount,offer};
  }
  function addDebt(life, amount, reason) {
    ensure(life); amount=Math.round(amount); if(!amount)return;
    if(amount<0){ repay(life,-amount); return; }
    life.loans.push({id:'incident-'+Date.now()+Math.random(),providerId:'incident',name:reason||'생활비 채무',tier:'기타채무',balance:amount,monthlyRate:.02,illegal:false});
    life.creditScore=clamp(life.creditScore-20,0,1000); sync(life);
  }
  function repay(life, amount) {
    ensure(life); let remain=Math.max(0,Math.floor(amount)), paid=0;
    life.loans.sort((a,b)=>(b.monthlyRate-a.monthlyRate)||(b.illegal-a.illegal));
    life.loans.forEach(l=>{const p=Math.min(l.balance,remain);l.balance-=p;remain-=p;paid+=p;});
    life.loans=life.loans.filter(l=>l.balance>0); if(paid>0)life.creditScore=clamp(life.creditScore+Math.min(25,Math.ceil(paid/5000000)),0,1000); sync(life); return paid;
  }
  function settleMonth(life, monthlyIncome, assets, rateMultiplier=1) {
    ensure(life); let interest=0;
    life.loans.forEach(l=>{const i=Math.round(l.balance*l.monthlyRate*rateMultiplier);l.balance+=i;interest+=i;});
    const debt=sync(life), annualIncome=Math.max(1,monthlyIncome*12), ratio=debt/Math.max(annualIncome,assets*.25,1);
    const hasShark=life.loans.some(l=>l.illegal);
    life.sharkMonths=hasShark?life.sharkMonths+1:0;
    life.collectionLevel=debt<=0?0:ratio>4||hasShark?3:ratio>2?2:ratio>1?1:0;
    life.creditScore=clamp(life.creditScore+(debt===0?8:-(life.collectionLevel*8+(hasShark?20:0))),0,1000);
    const messages=['','📞 금융사에서 상환 일정을 확인하는 전화가 왔습니다.','🚪 추심 담당자가 직장과 집으로 연락하기 시작했습니다.','🦈 거친 추심업자들이 집 앞까지 찾아왔습니다.'];
    const gameOver=hasShark&&life.sharkMonths>=3&&(debt>=30000000||life.creditScore<150);
    return {interest,debt,ratio,collectionLevel:life.collectionLevel,message:messages[life.collectionLevel],gameOver};
  }
  root.QT_LOAN={PROVIDERS,AMOUNTS,ensure,sync,grade,offers,borrow,addDebt,repay,settleMonth};
})(window);
