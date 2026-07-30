(function(root){
  'use strict';

  const RULES={
    contactAffection:25,
    closeAffection:40,
    secureAffection:60,
    contactTrust:12,
    secureTrust:30,
    supportAffection:20,
    supportTrust:8,
  };

  function bondTier(person){
    const affection=Number(person&&person.affection)||0;
    const trust=Number(person&&person.trust)||0;
    if(affection>=RULES.secureAffection&&trust>=RULES.secureTrust)return 3;
    if(affection>=RULES.closeAffection&&trust>=RULES.contactTrust)return 2;
    if(affection>=RULES.contactAffection&&trust>=RULES.contactTrust)return 1;
    return 0;
  }

  function contactRelief(person,kind){
    const tier=bondTier(person);
    if(!tier||kind==='ignore')return 0;
    const scale=kind==='warm'?1:kind==='brief'?.6:kind==='boundary'?.45:0;
    return Math.round(([0,3,6,10][tier]||0)*scale);
  }

  function intrusionStress(person,risk,baseStress){
    const base=Math.max(0,Math.round(Number(baseStress)||0));
    const danger=Math.max(0,Number(risk)||0);
    const tier=bondTier(person);
    if(tier>=3&&danger<85)return 0;
    if(danger>=85)return Math.max(3,base-(tier*2));
    return Math.max(0,base-(tier*2));
  }

  function supportAvailable(person,hasContact){
    return !!(person&&hasContact&&(Number(person.affection)||0)>=RULES.supportAffection
      &&(Number(person.trust)||0)>=RULES.supportTrust);
  }

  function supportRelief(person,baseRelief){
    return Math.max(0,Math.round(Number(baseRelief)||0))+([0,0,2,5][bondTier(person)]||0);
  }

  root.QT_STRESS_BALANCE={RULES,bondTier,contactRelief,intrusionStress,supportAvailable,supportRelief};
})(typeof window!=='undefined'?window:globalThis);
