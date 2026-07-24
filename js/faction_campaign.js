/* QuickTrade Life — 세력 해금 스토리·순자산 랭킹·메인 엔딩 진행 */
(function(root){
  'use strict';

  const PATHS={
    legal:{
      id:'legal',icon:'⚖️',name:'합법 투자연합',factionName:'청명 투자연합',
      mentor:'나래의 원칙과 장태식의 현장 조언을 함께 받아 투자조합과 법률 대응망을 세웁니다.',
      ending:{icon:'🕊️',name:'시장을 지킨 연합',desc:'공격받는 개인 투자자들을 보호하는 공개 연합을 만들고, 시장의 규칙을 바꾸는 쪽을 선택했습니다.'}
    },
    network:{
      id:'network',icon:'📡',name:'정보·사업 연합',factionName:'프론티어 연합',
      mentor:'합법 사업과 정보망을 엮어 상대보다 먼저 움직이는 실리적인 조직을 만듭니다.',
      ending:{icon:'🌐',name:'보이지 않는 조정자',desc:'사업과 정보의 흐름을 장악해, 싸우지 않고도 시장의 균형을 움직이는 조정자가 되었습니다.'}
    },
    underground:{
      id:'underground',icon:'🦈',name:'지하 세력',factionName:'야차 연대',
      mentor:'장태식의 방식대로 충성, 현장력, 두려움을 기반으로 빠르고 위험한 조직을 만듭니다.',
      ending:{icon:'👑',name:'새로운 시장의 왕',desc:'당신을 먹잇감으로 보던 세력을 차례로 무너뜨리고, 누구도 함부로 건드리지 못하는 새로운 지배자가 되었습니다.'}
    }
  };

  function ensure(life){
    const f=root.QT_RIVALS.ensureFaction(life);
    if(!f.storyStage)f.storyStage=f.level>0?'active':'locked';
    if(!Number.isFinite(f.storyDay))f.storyDay=0;
    if(f.level>0&&['locked','attacked','legal_wait','forming'].includes(f.storyStage))f.storyStage='active';
    return f;
  }

  function onAttack(life,attackerName,day){
    const f=ensure(life);
    f.lastAttacker=attackerName||f.lastAttacker;
    if(f.storyStage!=='locked')return{queued:false,stage:f.storyStage};
    f.storyStage='attacked';
    f.firstAttacker=attackerName||'정체불명의 세력';
    f.storyDay=day||1;
    return{queued:true,stage:'first_attack',attacker:f.firstAttacker};
  }

  function completeFirstAttack(life,day,response){
    const f=ensure(life);
    f.firstResponse=response||'report';
    f.storyStage='legal_wait';
    f.nextStoryDay=(day||1)+1;
    f.legalResultQueued=false;
    return f;
  }

  function takeDueStory(life,day){
    const f=ensure(life);
    if(f.storyStage==='legal_wait'&&!f.legalResultQueued&&(day||0)>=(f.nextStoryDay||0)){
      f.legalResultQueued=true;
      return'legal_result';
    }
    return null;
  }

  function choosePath(life,pathId){
    const f=ensure(life),path=PATHS[pathId]||PATHS.network;
    f.path=path.id;
    f.name=path.factionName;
    f.storyStage='forming';
    f.foundingDiscount=500000;
    f.xp=(f.xp||0)+10;
    return{faction:f,path};
  }

  function activateSpecial(life,pathId='underground'){
    const result=choosePath(life,pathId);
    result.faction.storyStage='active';
    return result;
  }

  function checkRankOne(life,playerWorth,rivals,day){
    const f=ensure(life);
    if(!['active','victory'].includes(f.storyStage)||f.endingSeen)return{ready:false};
    const ordered=(rivals||[]).slice().sort((a,b)=>b.value-a.value);
    const strongest=ordered[0]||{name:'경쟁 세력',value:0};
    const ready=playerWorth>strongest.value;
    if(ready){
      f.rankOneDay=day||1;
      f.rankOneWorth=playerWorth;
      f.lastOvertaken=strongest.name;
    }
    return{ready,strongest,playerWorth};
  }

  function progress(life,playerWorth,rivals){
    const f=ensure(life);
    const ordered=(rivals||[]).slice().sort((a,b)=>b.value-a.value);
    const strongest=ordered[0]||{name:'경쟁 세력',value:0};
    return{
      playerWorth:playerWorth||0,
      strongest,
      gap:Math.max(0,strongest.value-(playerWorth||0)),
      complete:!!f.campaignWon,
    };
  }

  function ending(life){
    const f=ensure(life);
    return(PATHS[f.path]||PATHS.network).ending;
  }

  function recordEnding(life){
    const f=ensure(life),result=ending(life);
    f.endingSeen=true;
    f.campaignWon=true;
    f.storyStage='victory';
    f.endingId=f.path||'network';
    return result;
  }

  function stageText(life){
    const f=ensure(life);
    const labels={
      locked:'아직 세력의 실체를 모릅니다. 첫 공격을 받으면 이야기가 시작됩니다.',
      attacked:`${f.firstAttacker||'경쟁 세력'}의 공격 뒤 나래와 대응책을 찾는 중입니다.`,
      legal_wait:'나래가 합법적인 조사와 신고를 진행하고 있습니다. 다음 달 결과가 도착합니다.',
      forming:'장태식에게 조직의 기본을 배웠습니다. 첫 거점을 마련하면 세력이 출범합니다.',
      active:`${(PATHS[f.path]||PATHS.network).name} 노선으로 순자산 랭킹 1위를 노리는 중입니다.`,
      victory:'세력전 메인 목표를 달성했습니다. 엔딩 이후에도 계속 플레이할 수 있습니다.',
    };
    return labels[f.storyStage]||labels.locked;
  }

  root.QT_FACTION_CAMPAIGN={
    PATHS,ensure,onAttack,completeFirstAttack,takeDueStory,choosePath,
    activateSpecial,checkRankOne,progress,ending,recordEnding,stageText
  };
})(window);
