/* QuickTrade Life — important-event queue policy and transitions */
(function (root) {
  'use strict';

  function priority(event) {
    if(event.seraFirstAttackEncounter)return 105;
    if(event.firstFactionAttack)return 104;
    if(event.factionStory==='first_attack'||event.factionStory==='attack_disclosure')return 102;
    if(event.factionStory==='legal_result')return 100;
    if(event.relationshipSocialEvent&&event.kind==='sera-victim-confrontation')return 92;
    if(event.factionVictory||event.captivity||event.type==='ending')return 95;
    if(event.dangerousTrioPrelude||event.dangerousTrioStart||event.dangerousTrioChapter)return 88;
    if(event.type==='debt'||event.type==='incident'||event.dangerousHeroineEvent)return 85;
    if(event.yujinInvestigation)return 96;
    if(event.factionStory==='mentor_defense')return 94;
    if(event.storyBridge)return 78;
    if(event.chemistryEventId&&event.urgent)return 79;
    if(event.groupConfession)return 76;
    if(event.groupChatEvent)return 72;
    if(event.relationshipSocialEvent)return 74;
    if(event.childhoodCircleEvent||event.dangerousTrioPrelude||event.dangerousTrioStart
      ||event.freedomTrioStart||event.freedomGuildEvent||event.freedomCounselingEvent
      ||event.freedomPersonalEvent||event.freedomFirstOuting||event.freedomDangerousDisclosure)return 75;
    if(event.crossEventId||event.chemistryEventId||event.story||event.bondEncounter)return 55;
    if(event.businessRomanceEvent)return 45;
    if(event.businessEvent)return 40;
    if(event.monthlyMessage)return event.targetType==='rival'?30:event.targetType==='subordinate'?25:20;
    return 50;
  }

  function key(event) {
    if(event.seraFirstAttackEncounter)return'sera:first-attack-encounter';
    if(event.firstFactionAttack)return'faction:first-attack-summary';
    if(event.factionStory)return`faction:${event.factionStory}`;
    if(event.relationshipSocialEvent)return`relationship-social:${event.kind}:${event.key||event.attackerName||event.day||''}`;
    if(event.yujinInvestigation)return'yujin:first-investigation';
    if(event.dangerousTrioPrelude)return`dangerous:prelude:${event.dangerousTrioPrelude}`;
    if(event.dangerousTrioStart)return'dangerous:start';
    if(event.dangerousTrioChapter)return'dangerous:chapter';
    if(event.dangerousTrioAftermath)return'dangerous:aftermath';
    if(event.freedomTrioStart)return'freedom:start';
    if(event.freedomGuildEvent)return`freedom:guild:${event.freedomGuildEvent}`;
    if(event.freedomTrioChapter)return'freedom:chapter';
    if(event.freedomTrioAftermath)return'freedom:aftermath';
    if(event.freedomCounselingEvent)return`freedom:counseling:${event.eventId}`;
    if(event.freedomPersonalEvent)return`freedom:personal:${event.eventId}`;
    if(event.freedomFirstOuting)return'freedom:first-outing';
    if(event.freedomDangerousDisclosure)return'freedom:dangerous-disclosure';
    if(event.groupConfession)return`group-confession:${event.groupId}`;
    if(event.groupChatEvent)return`group-chat:${event.eventId}`;
    if(event.chemistryEventId)return`chemistry:${event.chemistryEventId}`;
    if(event.crossEventId)return`cross:${event.crossEventId}`;
    if(event.monthlyMessage)return`message:${event.targetType}:${event.targetId!=null?event.targetId:event.personName||''}`;
    if(event.childhoodCircleEvent)return`childhood:${event.childhoodCircleEvent}`;
    if(event.businessRomanceEvent)return`business-romance:${event.kind||'event'}:${event.staffId||event.chapterId||event.rivalName||''}`;
    if(event.businessEvent)return`business:${event.businessId}:${event.eventId}`;
    if(event.story)return`story:${event.personName}`;
    return'';
  }

  function routeGroup(event) {
    if(!event)return null;
    if(event.childhoodCircleEvent)return'childhood';
    if(event.dangerousTrioPrelude||event.dangerousTrioStart||event.dangerousTrioChapter)return'dangerous';
    if(event.freedomTrioStart||event.freedomTrioChapter||event.freedomPersonalEvent
      ||event.freedomDangerousDisclosure||event.freedomFirstOuting
      ||event.freedomGuildEvent==='offline_table')return'freedom';
    if(event.groupConfession)return event.groupId||null;
    if(event.businessRomanceEvent&&['quartet-story','quartet-ending'].includes(event.kind))return'business';
    return null;
  }

  function enqueue(queue, event, options) {
    const settings=Object.assign({maxSize:12,allowed:()=>true,onDrop:()=>{}},options||{});
    if(!Array.isArray(queue)||!event)return false;
    if(!settings.allowed(event)){settings.onDrop(event,'blocked');return false;}
    const eventKey=key(event);
    if(eventKey&&queue.some(item=>key(item)===eventKey))return true;
    event._priority=priority(event);
    const insertAt=queue.findIndex(item=>(item._priority||priority(item))<event._priority);
    if(insertAt<0)queue.push(event);else queue.splice(insertAt,0,event);
    if(queue.length>settings.maxSize){
      queue.splice(settings.maxSize).forEach(item=>settings.onDrop(item,'capacity'));
    }
    return queue.includes(event);
  }

  function take(queue, options) {
    const settings=Object.assign({allowed:()=>true,onDrop:()=>{}},options||{});
    if(!Array.isArray(queue))return null;
    let event=queue.shift()||null;
    while(event&&!settings.allowed(event)){
      settings.onDrop(event,'blocked');
      event=queue.shift()||null;
    }
    return event;
  }

  root.QT_IMPORTANT_EVENT_FLOW=Object.freeze({
    priority,
    key,
    routeGroup,
    enqueue,
    take,
  });
})(window);
