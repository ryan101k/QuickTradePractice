/* QuickTrade Life — 지속형 단체방과 공개 대화/개인 DM의 온도 차 */
(function(root){
'use strict';

const VERSION=1;
const MAX_MESSAGES=80;
const ROOMS={
  freedom:{
    id:'freedom',icon:'🎮',name:'다음 접속',
    members:['채원','유나','소희'],
    nicknames:{채원:'막차요정',유나:'무보정',소희:'쉼표'},
    description:'게임 길드 · 현실 정체 공개 전에는 닉네임만 표시',
  },
  dangerous:{
    id:'dangerous',icon:'🗝️',name:'(저장하지 않은 번호)',
    members:['강유진','한채린','윤세라'],
    description:'같은 집 · 확인과 견제가 동시에 올라오는 방',
  },
  business:{
    id:'business',icon:'🏢',name:'사업부 · 대표 보고',
    members:[],
    description:'사업 운영 공개 채널 · 사적인 대화와 분리',
  },
  faction:{
    id:'faction',icon:'🛡️',name:'상황실',
    members:[],
    description:'세력 작전과 보고를 남기는 채널',
  },
};

const EVENTS={
  chaewon_everyday:{
    id:'chaewon_everyday',roomId:'freedom',speaker:'채원',nickname:'막차요정',
    title:'막차요정 · 유니폼을 벗은 시간',scene:'./assets/event-freedom-chat-chaewon.png',
    group:[
      ['채원','오늘 비행 끝. 밖에서는 절대 못 올릴 사진 하나 투척하고 자러 갑니다.'],
      ['유나','막차요정 오늘 꽤 과감한데? 플레이어, 확대 금지.'],
      ['소희','이미 두 번 본 사람이 할 말은 아닌 것 같아요.'],
    ],
    privateText:'아까 사진… 너무 편한 모습이었죠. 저장했으면 지워 줘요. 아니, 그냥 내가 이런 말 했다는 것도 잊어요.',
    choices:[
      {id:'respect',text:'알겠어요. 사진도 이 말도 여기까지만 둘게요.',reply:'그렇게 바로 약속하면… 오히려 내가 다시 보내고 싶어지잖아요.',affection:3,trust:7,warmth:5},
      {id:'tease',text:'단체방에서 제일 먼저 놀린 사람이 누군데요?',reply:'그건 셋이 같이 있을 때의 나고요. 지금은… 그냥 채원이에요.',affection:6,trust:4,warmth:4},
      {id:'keep',text:'좋은 사진인데 굳이 지울 필요는 없죠.',reply:'내가 지워 달라고 한 이유보다 사진이 먼저였네요. 다음에는 안 보낼게요.',affection:-2,trust:-7,warmth:-5},
    ],
  },
  yuna_offcamera:{
    id:'yuna_offcamera',roomId:'freedom',speaker:'유나',nickname:'무보정',
    title:'무보정 · 렌즈가 꺼진 뒤',scene:'./assets/event-freedom-chat-yuna.png',
    group:[
      ['유나','오늘 촬영본보다 이게 낫지 않아요? 진짜 무보정 인증. 밖에는 못 올립니다.'],
      ['채원','말은 그렇게 해도 반응 제일 기다리는 사람.'],
      ['소희','플레이어가 입력 중이었다가 세 번 멈췄어요.'],
    ],
    privateText:'단체방 분위기에 휩쓸려서 올린 거예요. 이상하게 봤으면 지금 말해요. 답 없으면 사진부터 지울 거니까.',
    choices:[
      {id:'respect',text:'지우지 않아도 돼요. 보여 준 만큼만 보고 더 캐묻지 않을게요.',reply:'그 대답은 좀 반칙인데. 차단할 이유를 하나 줄여 달라고요.',affection:4,trust:7,warmth:5},
      {id:'tease',text:'무보정 닉네임값은 확실히 하네요.',reply:'그 말을 칭찬으로 받아들일지는 다음 접속 때 정할게요.',affection:6,trust:4,warmth:4},
      {id:'keep',text:'나한테만 따로 한 장 더 보내면 판단해 볼게요.',reply:'역시 사람은 확인해 봐야 안다니까. 방금 사진도 지울게요.',affection:-3,trust:-8,warmth:-6},
    ],
  },
  sohee_after_rehearsal:{
    id:'sohee_after_rehearsal',roomId:'freedom',speaker:'소희',nickname:'쉼표',
    title:'쉼표 · 공연 뒤의 한 장',scene:'./assets/event-freedom-chat-sohee.png',
    group:[
      ['소희','연습 끝. 오늘은 무대 사진 말고 아무도 못 보는 쪽으로 올릴게요.'],
      ['유나','쉼표가 제일 조용한 척하면서 제일 세다니까.'],
      ['채원','플레이어 숨 쉬고 있죠? 다음 레이드 전에 쓰러지면 안 돼요.'],
    ],
    privateText:'사진은 실수 아니었어요. 그런데 답을 기다리는 내가 좀 낯설어서요. 늦었으니까 그냥 잊어도 돼요.',
    choices:[
      {id:'respect',text:'안 잊을게요. 그렇다고 답을 재촉하지도 않을게요.',reply:'그럼 내일도 평소처럼 접속할게요. 사라지지는 않을게요.',affection:4,trust:8,warmth:6},
      {id:'tease',text:'쉼표가 아니라 느낌표였는데요.',reply:'…그 말은 단체방에는 쓰지 마세요. 내가 먼저 놀림받을 테니까.',affection:7,trust:4,warmth:4},
      {id:'keep',text:'이런 사진이면 다음에도 늦게 답할 이유가 없겠네요.',reply:'사진을 보내야만 자리가 생기는 건 싫어요. 오늘 대화는 여기까지 할게요.',affection:-3,trust:-8,warmth:-6},
    ],
  },
  dangerous_phone_takeover:{
    id:'dangerous_phone_takeover',roomId:'freedom',speaker:'윤세라',nickname:'플레이어의 휴대폰',
    title:'다음 접속 · 누가 답장을 쳤는지',scene:'./assets/event-trio-meeting-6.png',
    group:[
      ['나','오늘 약속은 안 돼요. 지금 세라랑 집에 있으니까요.'],
      ['강유진','윤세라 씨가 대신 입력했습니다. 본인은 무사해요. 귀가 일정부터 확인하겠습니다.'],
      ['한채린','문장 하나 정리하는 데 셋이나 붙는 꼴이라니. 어쨌든 오늘 일정은 취소야.'],
      ['유나','잠깐. 세라니? 지금 그 휴대폰 앞에 몇 명이 있는 거예요?'],
      ['채원','우리는 본인이 돌아오면 직접 답을 들을게요.'],
      ['소희','대신 정한 답은 답으로 세지 않을게요.'],
    ],
    privateText:null,
    choices:[
      {id:'take_back',text:'휴대폰을 돌려받아 “내 답은 내가 할게요”라고 쓴다.',reply:'유나: 좋아요. 그럼 지금부터는 본인 말만 들을게요.',affection:2,trust:8,warmth:6,boundary:true},
      {id:'explain',text:'같이 사는 세 사람이 있다는 사실부터 숨기지 않고 밝힌다.',reply:'채원: 당황한 건 맞지만, 남에게 듣기 전에 직접 말해 준 건 기억할게요.',affection:2,trust:7,warmth:5,disclosure:true},
      {id:'allow',text:'세 사람이 대신 답하도록 휴대폰을 그대로 둔다.',reply:'소희: 그럼 오늘 답은 없는 것으로 할게요. 당신이 돌아오면 다시 이야기해요.',affection:-3,trust:-10,warmth:-8,control:true},
    ],
  },
};

function finite(value,fallback=0){return Number.isFinite(Number(value))?Number(value):fallback;}
function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
function blankRoom(def){
  return{id:def.id,name:def.name,icon:def.icon,members:def.members.slice(),messages:[],unread:0,unlocked:false,seeded:false,lastReadDay:0};
}
function ensure(life){
  if(!life.groupChats||typeof life.groupChats!=='object')life.groupChats={};
  const state=life.groupChats;
  if(state.version!==VERSION)state.version=VERSION;
  if(!state.rooms||typeof state.rooms!=='object')state.rooms={};
  Object.values(ROOMS).forEach(def=>{
    if(!state.rooms[def.id]||typeof state.rooms[def.id]!=='object')state.rooms[def.id]=blankRoom(def);
    const room=state.rooms[def.id];
    room.id=def.id;room.name=def.name;room.icon=def.icon;
    if(!Array.isArray(room.members))room.members=def.members.slice();
    if(!Array.isArray(room.messages))room.messages=[];
    room.unread=Math.max(0,Math.floor(finite(room.unread,0)));
    room.unlocked=!!room.unlocked;room.seeded=!!room.seeded;
  });
  if(!state.completed||typeof state.completed!=='object')state.completed={};
  if(!state.queued||typeof state.queued!=='object')state.queued={};
  if(!state.presentedChapters||typeof state.presentedChapters!=='object')state.presentedChapters={};
  if(!state.chapterChoices||typeof state.chapterChoices!=='object')state.chapterChoices={};
  if(!state.privateLeaks||typeof state.privateLeaks!=='object')state.privateLeaks={};
  state.lastEventDay=Math.max(0,Math.floor(finite(state.lastEventDay,0)));
  return state;
}
function room(life,id){return ensure(life).rooms[id]||null;}
function senderLabel(life,roomId,name){
  if(name==='나')return'나';
  if(roomId==='freedom'){
    const freedom=life.freedomTrio||{};
    return freedom.identityState==='revealed'?name:(ROOMS.freedom.nicknames[name]||name);
  }
  return name;
}
function post(life,roomId,sender,text,options={}){
  const target=room(life,roomId);if(!target||!text)return null;
  const message={
    id:`${roomId}-${options.day||0}-${target.messages.length+1}`,
    day:Math.max(0,Math.floor(finite(options.day,0))),
    sender:senderLabel(life,roomId,sender),
    realSender:sender,
    text:String(text),
    mine:sender==='나',
    scene:options.scene||'',
    kind:options.kind||'text',
  };
  target.messages.push(message);
  if(target.messages.length>MAX_MESSAGES)target.messages.splice(0,target.messages.length-MAX_MESSAGES);
  if(!options.read)target.unread=(target.unread||0)+1;
  return message;
}
function seedFreedom(life,day){
  const target=room(life,'freedom');if(!target||target.seeded)return;
  target.seeded=true;
  post(life,'freedom','채원','다음 주도 이 시간 괜찮아요? 전멸해도 파티는 유지하는 걸로.',{day});
  post(life,'freedom','유나','얼굴 인증, 직업 질문 금지. 장비 자랑은 적당히.',{day});
  post(life,'freedom','소희','길드 이름은 ‘다음 접속’. 늦으면 늦는다고만 남겨요.',{day});
  post(life,'freedom','나','다음 접속 때 봐요.',{day});
}
function seedDangerous(life,day){
  const target=room(life,'dangerous');if(!target||target.seeded)return;
  target.seeded=true;
  post(life,'dangerous','강유진','귀가하면 한 줄만 남겨요. 확인하고 더 묻지는 않을게요.',{day});
  post(life,'dangerous','한채린','그 말을 경찰이 하니까 더 수상하네. 일정은 공유, 허가는 금지.',{day});
  post(life,'dangerous','윤세라','읽었어요. 지금 같은 집에 있는데 굳이 여기에도 써야 해요?',{day});
}
function seedBusiness(life,day){
  const target=room(life,'business');if(!target||target.seeded)return;
  target.seeded=true;
  post(life,'business','운영팀','이번 달 사업별 매출·비용 보고 채널을 열었습니다.',{day});
}
function seedFaction(life,day){
  const target=room(life,'faction');if(!target||target.seeded)return;
  target.seeded=true;
  post(life,'faction','상황 담당','작전·방어·인원 보고는 이 방에 기록하겠습니다.',{day});
}
function sync(life,day=0){
  const state=ensure(life),freedom=life.freedomTrio||{};
  if(freedom.guildJoined||freedom.guildStage>0){
    state.rooms.freedom.unlocked=true;seedFreedom(life,day);
  }
  if(life.dangerousTrioBond&&life.dangerousTrioBond.active){
    state.rooms.dangerous.unlocked=true;seedDangerous(life,day);
  }
  if(life.business&&Array.isArray(life.business.owned)&&life.business.owned.length){
    state.rooms.business.unlocked=true;
    state.rooms.business.members=life.business.owned.map(item=>item.managerName||item.managerId).filter(Boolean);
    seedBusiness(life,day);
  }
  if(life.faction&&finite(life.faction.level,0)>0){
    state.rooms.faction.unlocked=true;
    state.rooms.faction.members=(life.faction.members||[]).map(member=>member.name).filter(Boolean);
    seedFaction(life,day);
  }
  return state;
}
function list(life,day=0){return Object.values(sync(life,day).rooms).filter(item=>item.unlocked);}
function canShowFreedomPhotos(life){
  const freedom=life.freedomTrio||{};
  return freedom.identityState==='revealed'&&freedom.firstOuting==='seen'&&!freedom.onlineOnlyComplete;
}
function eventEligible(life,event){
  const state=ensure(life);
  if(state.completed[event.id]||state.queued[event.id])return false;
  if(event.id==='dangerous_phone_takeover'){
    return canShowFreedomPhotos(life)&&!!(life.dangerousTrioBond&&life.dangerousTrioBond.active)&&
      !!state.chapterChoices.ordinary_photos&&!(life.freedomTrio&&life.freedomTrio.dangerousDisclosureComplete);
  }
  return false;
}
function nextEvent(life,day=0){
  const state=sync(life,day);
  const pendingId=Object.keys(state.queued).find(id=>EVENTS[id]);
  if(pendingId)return EVENTS[pendingId];
  if(state.lastEventDay&&day-state.lastEventDay<1)return null;
  const order=['dangerous_phone_takeover'];
  return order.map(id=>EVENTS[id]).find(event=>eventEligible(life,event))||null;
}
function queueNext(life,day=0){
  const state=sync(life,day),event=nextEvent(life,day);if(!event)return null;
  state.queued[event.id]=day||true;
  return event;
}
function recordEventMessages(life,event,day){
  const target=room(life,event.roomId);
  (event.group||[]).forEach(([sender,text],index)=>post(life,event.roomId,sender,text,{day,scene:index===0?event.scene:'',kind:index===0&&event.scene?'photo':'text'}));
  target.unread=Math.max(target.unread,event.group.length);
}
function person(life,name){return (life.met||[]).find(item=>item.name===name)||null;}
function resolveEvent(life,eventId,choiceId,day=0){
  const state=sync(life,day),event=EVENTS[eventId],choice=event&&event.choices.find(item=>item.id===choiceId);
  if(!event||!choice||state.completed[event.id])return null;
  recordEventMessages(life,event,day);
  post(life,event.roomId,'나',choice.text,{day,read:true});
  const replyParts=choice.reply.split(':');
  const replySender=replyParts.length>1&&['채원','유나','소희'].includes(replyParts[0])?replyParts.shift():event.speaker;
  post(life,event.roomId,replySender,replyParts.join(':').trim(),{day});
  state.completed[event.id]=choice.id;
  delete state.queued[event.id];
  state.lastEventDay=day;
  const freedom=life.freedomTrio||{};
  freedom.guildWarmth=clamp(finite(freedom.guildWarmth,0)+(choice.warmth||0),0,100);
  ['채원','유나','소희'].forEach(name=>{
    const record=person(life,name);if(!record)return;
    record.trust=clamp(finite(record.trust,0)+(choice.trust||0),0,100);
    if(name===event.speaker)record.affection=clamp(finite(record.affection,0)+(choice.affection||0),0,100);
  });
  if(choice.disclosure)freedom.chatDisclosureStarted=true;
  if(choice.boundary)freedom.phoneBoundarySet=true;
  if(choice.control)freedom.privatePull=true;
  return{
    event,choice,room:room(life,event.roomId),
    privateMessage:event.privateText?{name:event.speaker,text:event.privateText}:null,
  };
}
function markRead(life,id,day=0){
  const target=room(life,id);if(!target)return null;
  target.unread=0;target.lastReadDay=day;return target;
}

function presentFreedomChapter(life,chapter,day=0){
  const state=sync(life,day),target=state.rooms.freedom;
  if(!chapter||!target.unlocked||state.presentedChapters[chapter.id])return target;
  state.presentedChapters[chapter.id]=true;
  post(life,'freedom','시스템',`${chapter.icon||'🎮'} ${chapter.title}`,{day,read:true,kind:'system'});
  if(chapter.id==='ordinary_photos'){
    ['chaewon_everyday','yuna_offcamera','sohee_after_rehearsal'].forEach(id=>{
      const event=EVENTS[id];
      (event.group||[]).forEach(([sender,text],index)=>{
        post(life,'freedom',sender,text,{day,read:true,scene:index===0?event.scene:'',kind:index===0?'photo':'text'});
      });
    });
    return target;
  }
  (chapter.speakers||[]).forEach(speaker=>{
    const scene=(chapter.scenes||[]).find(item=>item.name===speaker.name);
    post(life,'freedom',speaker.name,speaker.line,{day,read:true,scene:scene&&scene.src||'',kind:scene?'photo':'text'});
  });
  return target;
}
function recordFreedomChoice(life,chapter,choice,day=0){
  const state=sync(life,day);if(!chapter||!choice||state.chapterChoices[chapter.id])return null;
  state.chapterChoices[chapter.id]=choice.id;
  post(life,'freedom','나',choice.text,{day,read:true});
  post(life,'freedom','시스템',choice.result,{day,read:true,kind:'result'});
  return room(life,'freedom');
}
function privateLeaksForChapter(life,chapterId){
  const state=ensure(life);
  if(chapterId!=='ordinary_photos'||state.privateLeaks[chapterId])return[];
  state.privateLeaks[chapterId]=true;
  return['chaewon_everyday','yuna_offcamera','sohee_after_rehearsal'].map(id=>({
    name:EVENTS[id].speaker,text:EVENTS[id].privateText,
  }));
}

root.QT_GROUP_CHAT={
  VERSION,ROOMS,EVENTS,ensure,sync,list,room,post,nextEvent,queueNext,resolveEvent,markRead,senderLabel,
  presentFreedomChapter,recordFreedomChoice,privateLeaksForChapter,
};
})(window);
