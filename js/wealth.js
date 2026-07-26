/* QuickTrade Life — 총재산 구성 계산 */
(function(root){'use strict';
const number=value=>Number.isFinite(Number(value))?Number(value):0;
const asset=value=>Math.max(0,number(value));

function breakdown(parts){
  const source=parts||{};
  const result={
    liquid:number(source.liquid),
    property:asset(source.property),
    passive:asset(source.passive),
    business:asset(source.business),
    housing:asset(source.housing),
    personalDebt:asset(source.personalDebt),
  };
  result.physical=result.property+result.passive+result.business+result.housing;
  result.total=result.liquid+result.physical-result.personalDebt;
  return result;
}

root.QT_WEALTH={breakdown};
})(window);
