/* QuickTrade Life — 관계의 사회적 파장·세력 인식 엔진 */
(function(root){
  'use strict';

  const VERSION=1;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const BUSINESS_NAMES=['박지수','한이슬','차서윤','오혜린'];
  const DANGEROUS_NAMES=['강유진','한채린','윤세라'];
  const FREEDOM_NAMES=['채원','유나','소희'];
  const CHARACTER_TAGS={
    '윤세라':{factionCore:true,previouslyAttacked:true,securityWeight:35},
    '강유진':{factionCore:true,legalWeight:30,securityWeight:25},
    '한채린':{factionCore:true,businessWeight:35,publicWeight:20},
    '채원':{aviation:true,scheduleWeight:30,securityWeight:20},
    '유나':{celebrity:true,model:true,mediaWeight:40,brandWeight:40},
    '소희':{celebrity:true,singer:true,mediaWeight:50,stalkerWeight:40,factionWeight:35},
    '박지수':{businessPartner:true,employeeRelationship:true,workplaceWeight:50,auditWeight:45},
    '한이슬':{businessPartner:true,employeeRelationship:true,workplaceWeight:50,auditWeight:45},
    '차서윤':{businessPartner:true,employeeRelationship:true,workplaceWeight:50,auditWeight:45},
    '오혜린':{businessPartner:true,employeeRelationship:true,workplaceWeight:50,auditWeight:45},
  };

  function ensure(life){
    if(!life.relationshipSocialState||typeof life.relationshipSocialState!=='object'){
      life.relationshipSocialState={
        version:VERSION,partnerCount:0,groupCount:0,cohabitingCount:0,
        familyAwareness:0,staffAwareness:0,factionAwareness:0,publicAwareness:0,
        honesty:70,consentStability:70,scheduleStability:70,privacyStability:70,securityStability:70,
        exposureRisk:0,scandalRisk:0,workplaceConflictRisk:0,factionTargetRisk:0,relationshipFatigue:0,
        celebrityPartnerCount:0,hasCelebrityPartner:false,hasBusinessPartner:false,
        hasFactionCorePartner:false,hasPreviouslyAttackedPartner:false,
        fatherAware:false,staffAware:false,rivalsAware:false,publicConfirmed:false,
        seen:{},lastThreatDay:0,
      };
    }
    const state=life.relationshipSocialState;
    state.version=VERSION;
    state.seen=state.seen||{};
    for(const key of ['familyAwareness','staffAwareness','factionAwareness','publicAwareness','honesty',
      'consentStability','scheduleStability','privacyStability','securityStability','exposureRisk',
      'scandalRisk','workplaceConflictRisk','factionTargetRisk','relationshipFatigue']){
      if(!Number.isFinite(state[key]))state[key]=key.endsWith('Stability')||key==='honesty'?70:0;
      state[key]=clamp(state[key],0,100);
    }
    if(!Number.isFinite(state.lastThreatDay))state.lastThreatDay=0;
    return state;
  }

  function nameOf(value){return typeof value==='string'?value:value&&value.name;}
  function activeNames(life){
    const names=[];
    const add=value=>{const name=nameOf(value);if(name&&!names.includes(name))names.push(name);};
    if(life.relationship!=='single'&&life.partner)add(life.partner);
    ((life.relationshipGroup&&life.relationshipGroup.members)||[]).forEach(add);
    if(life.polycule&&life.polycule.active)(life.polycule.members||[]).forEach(add);
    (life.met||[]).filter(person=>['partner','lover','polycule'].includes(person.status)).forEach(add);
    return names;
  }

  function groupCount(life,names){
    let count=0;
    if(life.dangerousTrioBond&&life.dangerousTrioBond.active)count++;
    if(life.freedomTrioBond&&life.freedomTrioBond.active)count++;
    if(life.businessQuartetBond&&life.businessQuartetBond.active)count++;
    if(!count&&names.length>1)count=1;
    return count;
  }

  function refresh(life,context){
    const state=ensure(life),ctx=context||{},names=activeNames(life);
    const faction=life.faction||{},relationship=life.relationshipGroup||{},agreement=relationship.agreement||{};
    const celebrityNames=names.filter(name=>CHARACTER_TAGS[name]&&CHARACTER_TAGS[name].celebrity);
    const businessNames=names.filter(name=>BUSINESS_NAMES.includes(name));
    const factionNames=names.filter(name=>CHARACTER_TAGS[name]&&CHARACTER_TAGS[name].factionCore);
    const secretCount=(life.lovers||[]).length+
      (life.businessRomance&&life.businessRomance.staff
        ?Object.values(life.businessRomance.staff).filter(staff=>staff&&staff.secretAffair).length:0);

    state.partnerCount=names.length;
    state.groupCount=groupCount(life,names);
    state.cohabitingCount=agreement.cohabiting?names.length:
      life.dangerousTrioBond&&life.dangerousTrioBond.active?DANGEROUS_NAMES.filter(name=>names.includes(name)).length:0;
    state.celebrityPartnerCount=celebrityNames.length;
    state.hasCelebrityPartner=celebrityNames.length>0;
    state.hasBusinessPartner=businessNames.length>0;
    state.hasFactionCorePartner=factionNames.length>0;
    state.hasPreviouslyAttackedPartner=names.includes('윤세라');

    const publicMode=agreement.publicity==='public'||agreement.publicity==='exposed';
    state.familyAwareness=clamp(Math.max(state.familyAwareness,names.length?18:0,state.groupCount>=2?65:0,state.partnerCount>=3?78:0),0,100);
    state.staffAwareness=clamp(Math.max(state.staffAwareness,faction.level?20+names.length*7:0,state.groupCount>=2?72:0),0,100);
    state.factionAwareness=clamp(Math.max(state.factionAwareness,(faction.firstAttacker||faction.lastAttacker)?20:0,
      (faction.level||0)*12+(ctx.businessCount||0)*4,state.hasFactionCorePartner?55:0,state.hasBusinessPartner?62:0),0,100);
    state.publicAwareness=clamp(Math.max(state.publicAwareness,publicMode?45+celebrityNames.length*20:0,agreement.publicity==='exposed'?85:0),0,100);
    state.honesty=clamp(82-secretCount*24-(agreement.publicity==='exposed'?8:0),0,100);
    state.consentStability=clamp(Number(relationship.stability)||70,0,100);
    state.scheduleStability=clamp(82-names.length*5-(names.includes('채원')?10:0)-state.groupCount*6,0,100);
    state.privacyStability=clamp(88-celebrityNames.length*20-businessNames.length*5-(publicMode?18:0),0,100);
    state.securityStability=clamp(82-(names.includes('소희')?18:0)-(names.includes('윤세라')?12:0)+(faction.defense||0)*45,0,100);
    state.exposureRisk=clamp(100-state.privacyStability+secretCount*12,0,100);
    state.scandalRisk=clamp(state.exposureRisk+celebrityNames.length*12+secretCount*16,0,100);
    state.workplaceConflictRisk=clamp(businessNames.length*14+secretCount*15-(life.businessQuartetBond&&life.businessQuartetBond.active?8:0),0,100);
    state.factionTargetRisk=clamp(state.factionAwareness+(names.includes('소희')?12:0)+(businessNames.length?14:0)+(names.includes('윤세라')?18:0),0,100);
    state.relationshipFatigue=clamp(names.length*6+state.groupCount*8+(100-state.scheduleStability)*.35,0,100);
    state.fatherAware=state.familyAwareness>=45;
    state.staffAware=state.staffAwareness>=45;
    state.rivalsAware=state.factionAwareness>=45;
    state.publicConfirmed=publicMode&&state.publicAwareness>=60;
    return state;
  }

  function fatherReaction(life){
    const state=refresh(life),seen=state.seen;
    let key='',text='';
    if(state.groupCount>=2||state.partnerCount>=4){
      key='father_multiple_groups';
      text='학교 때 그 다섯한테서 겨우 벗어난 줄 알았더니, 너는 여전히 혼자 감당할 수 없는 관계를 끌어안고 있구나. 누구를 만나든 네가 고른 일이면 존중한다. 대신 숨기거나 떠밀려서 또 네 생활 전체를 넘기지는 마라.';
    }else if(life.businessQuartetBond&&life.businessQuartetBond.active){
      key='father_business_quartet';
      text='사업을 같이하는 사람과 마음까지 얽혔다면 장부보다 먼저 서로의 권한을 분명히 해라. 학교 때처럼 보호라는 말로 네 선택권을 나눠 갖게 두지는 말고.';
    }else if(life.dangerousTrioBond&&life.dangerousTrioBond.active){
      key='father_dangerous_trio';
      text='학교 때 그 다섯한테서 겨우 벗어난 줄 알았더니 또 셋이 네 생활을 둘러싸고 있다니 걱정부터 되는구나. 다만 그때처럼 네 대답도 듣지 않고 계획을 짜는 관계인지, 네가 직접 선택한 관계인지는 끝까지 구분해라.';
    }else if(state.partnerCount>=1){
      key='father_first_partner';
      text='누굴 만나는 건 네 선택이다. 다만 학교 때 있었던 일 때문에 또 관계 안에서 네 뜻을 삼키지는 마라. 싫은 건 싫다고 말하고, 좋은 건 네가 먼저 붙잡아도 된다.';
    }
    if(!key||seen[key])return null;
    seen[key]=true;
    state.familyAwareness=clamp(state.familyAwareness+20,0,100);
    state.fatherAware=true;
    return{key,text};
  }

  function subordinateLine(life,member){
    const state=refresh(life),role=member&&member.role;
    if(state.hasCelebrityPartner&&state.factionTargetRisk>=70){
      return role==='intel'
        ?'형님, 연예 기사 댓글로 위장한 계정 셋이 같은 IP 대역입니다. 팬인지 경쟁 세력인지 확인할 때까지 이동 동선은 공개하지 마십시오.'
        :'유명인 연인 얘기가 퍼진 뒤 사무실 앞 낯선 차량이 늘었습니다. 연애 보고가 아니라 경호 보고입니다.';
    }
    if(state.hasBusinessPartner&&state.workplaceConflictRisk>=55){
      return role==='legal'
        ?'직원과 관계가 얽혔으면 인사권과 사적인 약속부터 분리해야 합니다. 나중에 감사가 들어오면 마음보다 결재 기록을 먼저 봅니다.'
        :'형님, 직원은 왜 전부 여자냐는 농담은 접겠습니다. 대신 누가 어느 사업 권한을 갖는지는 문서로 남겨 주십시오.';
    }
    if(state.groupCount>=2){
      return'학교 때 일은 보고서로만 봐도 숨이 막히는데, 지금 관계까지 겹쳤습니다. 제가 사람을 평가하진 않겠습니다. 다만 일정과 경호가 충돌하면 미리 말씀해 주십시오.';
    }
    if(state.hasPreviouslyAttackedPartner){
      return'윤세라 씨가 가져온 옛 송금 원장과 지금 공격자의 계좌가 겹칩니다. 상대는 아직 그 이름을 기억하지 못하는 것 같습니다.';
    }
    return null;
  }

  function rivalAwareness(life,bot,context){
    const state=refresh(life,context),faction=life.faction||{},businessCount=(context&&context.businessCount)||0;
    const chaerin=(life.met||[]).find(person=>person.name==='한채린');
    const closeChaerin=chaerin&&['friend','casual','partner','lover','polycule'].includes(chaerin.status);
    if((faction.level||0)<=0&&businessCount<2&&state.factionAwareness<30)return{stage:'ignored',label:'무시당하는 개인'};
    if(closeChaerin&&(faction.level||0)<2&&businessCount<3)return{stage:'chaerin_proxy',label:'한채린의 장난감·대리인'};
    if((faction.level||0)>=4||businessCount>=6||state.groupCount>=2||state.factionTargetRisk>=85)return{stage:'threat',label:'전면전 대상'};
    if((faction.level||0)>=2||businessCount>=3||state.factionAwareness>=55)return{stage:'independent',label:'독립 세력'};
    return{stage:'newcomer',label:'감시 중인 신참'};
  }

  function relationshipAttackText(life,bot,context){
    const state=refresh(life,context),leader=bot&&bot.leader||'경쟁 세력';
    if(state.hasCelebrityPartner)return `${leader} 측이 연예 기사·팬 계정·광고주 문의를 이용해 공개 관계와 이동 동선을 흔들었습니다.`;
    if(state.hasBusinessPartner)return `${leader} 측이 사업 감사·직원 영입·계약 유출을 한꺼번에 걸어 관계와 경영을 동시에 압박했습니다.`;
    if(state.hasPreviouslyAttackedPartner)return `${leader} 측 장부에는 윤세라가 이름도 기억하지 못할 만큼 많은 과거 피해자 중 하나로 남아 있었습니다.`;
    return null;
  }

  function seraConfrontation(life,attackerName){
    const state=refresh(life);
    const sera=(life.met||[]).find(person=>person.name==='윤세라');
    const faction=life.faction||{};
    const attacker=attackerName||faction.firstAttacker||faction.lastAttacker;
    if(!sera||!attacker||state.seen.sera_victim_confrontation==='resolved')return null;
    if(['ex','deceased'].includes(sera.status))return null;
    return{relationshipSocialEvent:true,kind:'sera-victim-confrontation',attackerName:typeof attacker==='string'?attacker:attacker.name,day:life.day||1};
  }

  function celebrityDisclosure(life){
    const state=refresh(life),names=activeNames(life).filter(name=>['유나','소희'].includes(name));
    if(!names.length||state.publicAwareness<55)return null;
    const key=`celebrity_disclosure_${names.slice().sort().join('_')}`;
    if(state.seen[key]==='resolved')return null;
    return{relationshipSocialEvent:true,kind:'celebrity-disclosure',names,key,day:life.day||1};
  }

  function unknownThreat(life,day,random){
    const state=refresh(life),now=Number(day)||1,roll=random||Math.random;
    if(state.factionTargetRisk<65||now-state.lastThreatDay<3||roll()>.22)return null;
    state.lastThreatDay=now;
    return{relationshipSocialEvent:true,kind:'unknown-threat',day:now};
  }

  function view(life,event){
    if(!event)return null;
    if(event.kind==='sera-victim-confrontation'){
      return{
        icon:'🧾',title:'기억에도 없던 피해자',scene:'./assets/pixel-event-faction-court-v1.png',
        desc:`${event.attackerName} 측에 윤세라의 이름을 대자 상대는 한참 침묵한 뒤 “윤세라? 누구였지.”라고 되묻습니다. 세라의 계약금과 정산금은 그들이 수없이 털어먹은 소액 계좌 중 하나였고, 플레이어가 날짜와 송금 원장을 들이밀고서야 직원이 오래된 장부를 찾기 시작합니다.`,
        line:'“아, 그때 그 일러스트레이터. 그 많은 피해자 이름을 우리가 어떻게 다 기억합니까?”',
        choices:[
          {id:'ledger',text:'세라가 보관한 원장과 계좌 번호를 한 줄씩 읽어 준다'},
          {id:'name',text:'“너희는 잊었어도 피해자는 그날 이후를 전부 기억한다”고 따진다'},
          {id:'declare',text:'기억할 필요 없다고 말하고, 세력을 무너뜨릴 이유만 확인한다'},
        ],
      };
    }
    if(event.kind==='celebrity-disclosure'){
      const both=event.names.length>1;
      return{
        icon:both?'🚨':'📸',title:both?'두 유명인의 같은 연인 · 장중 긴급 속보':'유명인의 비공개 연애 보도',
        scene:'./assets/pixel-event-love-conflict-v1.png',
        desc:`${event.names.join('·')}의 사진과 같은 시간대 이동 기록이 공개됐습니다. 사실을 숨길수록 팬과 광고주, 경쟁 세력이 빈칸을 대신 채우기 시작합니다.`,
        line:both?'“우리 셋이 같은 말을 해야 해요. 일부만 숨기면 그게 다음 약점이 돼요.”':'“부정할 수도 있어요. 하지만 그다음 사진까지 거짓말이 되겠죠.”',
        choices:[
          {id:'acknowledge',text:'관계를 인정하되 사생활과 안전을 지켜 달라고 공동 발표한다'},
          {id:'delay',text:'당사자들과 합의할 때까지 확인을 미룬다'},
          {id:'deny',text:'사실이 아니라고 부인한다'},
        ],
      };
    }
    if(event.kind==='unknown-threat'){
      return{
        icon:'📵',title:'저장하지 않은 번호의 사진',scene:'./assets/pixel-event-faction-court-v1.png',
        desc:'집과 사무실 사이에서 찍힌 사진 한 장이 도착했습니다. 열성 팬의 선 넘은 연락인지, 경쟁 세력이 팬 계정을 흉내 낸 것인지 아직 구분되지 않습니다.',
        line:'“다음에는 혼자 나오세요. 누구와 같이 사는지는 이미 압니다.”',
        choices:[
          {id:'preserve',text:'원본과 발신 기록을 보존해 정보 담당에게 넘긴다'},
          {id:'report',text:'경찰과 플랫폼에 동시에 신고한다'},
          {id:'bait',text:'가짜 일정을 흘려 뒤를 밟는 사람을 확인한다'},
          {id:'ignore',text:'대응하지 않고 번호만 차단한다'},
        ],
      };
    }
    return null;
  }

  function resolve(life,event,choiceId){
    const state=ensure(life);
    if(event.kind==='sera-victim-confrontation'){
      state.seen.sera_victim_confrontation='resolved';
      state.factionAwareness=clamp(state.factionAwareness+18,0,100);
      state.factionTargetRisk=clamp(state.factionTargetRisk+15,0,100);
      const texts={
        ledger:'날짜와 계좌가 불릴 때마다 상대의 태도가 바뀌었습니다. 끝내 폐기 장부에서 윤세라의 이름이 나왔고, 세력은 자신들이 그녀의 삶을 망가뜨렸다는 사실보다 플레이어가 그 기록을 되찾았다는 사실을 더 두려워했습니다.',
        name:'상대는 피해자를 기억할 의무가 없었다고 비웃었지만, 플레이어는 그 망각 자체가 이 세력을 무너뜨릴 이유라고 답했습니다. 윤세라는 아무 말 없이 원본 파일을 플레이어에게 넘겼습니다.',
        declare:'플레이어는 사과도 기억도 요구하지 않았습니다. 대신 세력이 피해자를 숫자로 지운 장부를 복사했고, 그날부터 복수는 손실 회복이 아니라 같은 방식의 공격을 끝내는 일이 됐습니다.',
      };
      return{ok:true,text:texts[choiceId]||texts.name,tone:'bad',factionIntel:choiceId==='ledger'?8:5,reputation:choiceId==='name'?2:0};
    }
    if(event.kind==='celebrity-disclosure'){
      state.seen[event.key]='resolved';
      if(choiceId==='acknowledge'){
        state.publicAwareness=100;state.publicConfirmed=true;state.honesty=clamp(state.honesty+10,0,100);
        return{ok:true,text:'당사자들은 같은 문장으로 관계를 확인하고, 사생활 침해와 투자 루머를 분리해 달라고 요구했습니다. 악성 반응도 남았지만 서로 다른 거짓말이 약점으로 남지는 않았습니다.',tone:'good',reputation:4,stress:3,market:{sector:'enter',impact:.08,text:'유명인 관계 공개와 공동 입장 발표'}};
      }
      if(choiceId==='deny'){
        state.scandalRisk=clamp(state.scandalRisk+22,0,100);state.honesty=clamp(state.honesty-20,0,100);
        return{ok:true,text:'부인 직후 더 선명한 사진이 공개됐습니다. 연애보다 거짓 해명이 더 큰 기사가 됐고, 광고주와 팬덤이 동시에 흔들렸습니다.',tone:'bad',reputation:-10,stress:12,market:{sector:'enter',impact:-.10,text:'유명인 열애 부인 번복 논란'}};
      }
      state.exposureRisk=clamp(state.exposureRisk+8,0,100);
      return{ok:true,text:'확답은 미뤘지만 세 사람은 다음 보도가 오기 전에 공개 범위와 안전 계획부터 맞추기로 했습니다.',tone:'neutral',reputation:0,stress:5};
    }
    if(event.kind==='unknown-threat'){
      const results={
        preserve:{text:'메타데이터와 발신 경로가 보존됐습니다. 정보 담당이 경쟁 세력의 홍보 대행 계정과 겹치는 흔적을 찾았습니다.',tone:'good',factionIntel:8,stress:2},
        report:{text:'신고 기록과 접근 금지 요청이 남았습니다. 즉시 정체를 밝히진 못했지만 다음 연락은 증거가 됩니다.',tone:'good',factionDefense:.04,stress:1},
        bait:{text:'가짜 일정에 나타난 차량을 확인했습니다. 단서는 얻었지만 상대도 플레이어가 역추적 중임을 알아챘습니다.',tone:'neutral',factionIntel:12,stress:8},
        ignore:{text:'번호는 조용해졌지만 사진을 찍은 사람이 사라졌는지는 알 수 없습니다.',tone:'bad',stress:6},
      };
      return{ok:true,...(results[choiceId]||results.ignore)};
    }
    return{ok:false,text:'처리할 수 없는 관계 사건입니다.',tone:'bad'};
  }

  root.QT_RELATIONSHIP_SOCIAL={
    VERSION,BUSINESS_NAMES,DANGEROUS_NAMES,FREEDOM_NAMES,CHARACTER_TAGS,
    ensure,activeNames,refresh,fatherReaction,subordinateLine,rivalAwareness,
    relationshipAttackText,seraConfrontation,celebrityDisclosure,unknownThreat,view,resolve,
  };
})(window);
