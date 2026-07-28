/* QuickTrade Life — 세금·치료비 상한 엔진 */
(function(root){'use strict';
const POLICIES=[];
function ensure(life){if(!life.finance)life.finance={taxesPaid:0};const f=life.finance;f.policies=[];['taxesPaid'].forEach(key=>{if(!Number.isFinite(Number(f[key])))f[key]=0;});return f;}
function incomeTax(income){const annual=Math.max(0,income)*12;const rate=annual<30000000?.04:annual<60000000?.09:annual<120000000?.15:annual<300000000?.23:.32;return Math.round(Math.max(0,income)*rate);}
function monthly(life,ctx){const f=ensure(life),tax=incomeTax(ctx.income||0);f.taxesPaid+=tax;return{premiums:0,tax,propertyTax:0,incomeBenefit:0,net:-tax};}
function treatmentCost(life,cost){ensure(life);const pay=Math.min(Math.max(0,Math.round(cost||0)),3000000);return{original:cost,covered:Math.max(0,cost-pay),pay,plan:null};}
function deathBenefit(){return 0;}
function removeLegacyPension(life){
 const f=ensure(life);
 const refund=f.pensionRemoved?0:Math.max(0,Math.round(Number(f.pensionBalance)||0));
 delete f.pensionBalance;delete f.pensionRate;f.pensionRemoved=true;
 return refund;
}
root.QT_LIFE_FINANCE={POLICIES,ensure,monthly,treatmentCost,deathBenefit,removeLegacyPension,incomeTax};
})(window);
