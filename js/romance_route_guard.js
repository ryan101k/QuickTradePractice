/* QuickTrade Life — 그룹 연애 루트 진행·충돌 방지 장부 */
(function(root){
'use strict';

const ORDER=['dangerous','freedom','business','childhood'];
const META={
  dangerous:{name:'위험한 3인조',members:['강유진','한채린','윤세라']},
  freedom:{name:'자유인 3인조',members:['채원','유나','소희']},
  business:{name:'사업 4인조',members:['차서윤','박지수','한이슬','오혜린']},
  childhood:{name:'소꿉친구 5인조',members:['예린','보라','서연','나영','미래']}
};
const bondActive=(life,id)=>{
  const key={dangerous:'dangerousTrioBond',freedom:'freedomTrioBond',business:'businessQuartetBond',childhood:'childhoodCircleBond'}[id];
  return !!(key&&life[key]&&life[key].active);
};
function ensure(life){
  if(!life.romanceRoutes||typeof life.romanceRoutes!=='object'){
    life.romanceRoutes={version:5,active:null,center:null,centerSince:null,completed:{},failed:{},declined:{},romanceLocked:{},confessions:{},devotions:{},paths:{},crossSeen:{},history:[]};
  }
  const state=life.romanceRoutes;
  const previousVersion=Number(state.version)||1;
  state.version=5;
  state.completed=state.completed||{};
  state.failed=state.failed||{};
  state.declined=state.declined||{};
  state.romanceLocked=state.romanceLocked||{};
  state.confessions=state.confessions||{};
  state.devotions=state.devotions||{};
  state.paths=state.paths||{};
  state.crossSeen=state.crossSeen||{};
  if(!Array.isArray(state.history))state.history=[];
  if(!Array.isArray(state.centerHistory))state.centerHistory=[];
  const freedomFriendEnding=!!(life.freedomTrio&&life.freedomTrio.onlineOnlyComplete);
  if(freedomFriendEnding){
    if(state.active==='freedom')state.active=null;
    if(state.center==='freedom'){state.center=null;state.centerSince=null;}
  }
  if(previousVersion<4){
    Object.entries(state.romanceLocked).forEach(([id,row])=>{
      if(row&&row.reason==='player_confessed_before_group_story_complete'){
        delete state.romanceLocked[id];
        if(state.confessions[id]&&state.confessions[id].reason===row.reason)delete state.confessions[id];
        state.history.push({type:'migration-unlock',id,reason:'player_confession_now_starts_pure_route',day:life.day||0});
      }
    });
  }
  if(previousVersion<5&&!state.paths.dangerous){
    const devotion=state.devotions.dangerous;
    const trioNames=META.dangerous.members;
    const completed=trioNames.every(name=>{
      const person=(life.met||[]).find(row=>row.name===name);
      return !!(person&&person.story&&person.story.completed);
    });
    if(devotion&&devotion.active)state.paths.dangerous={path:'pure',name:devotion.name,since:devotion.since||life.day||0,reason:'legacy_devotion'};
    else if(completed)state.paths.dangerous={path:'group',name:null,since:life.day||0,reason:'legacy_personal_stories'};
  }
  ORDER.forEach(id=>{if(bondActive(life,id))state.completed[id]=state.completed[id]||{ending:'legacy',day:life.day||0};});
  if(state.active&&(state.completed[state.active]||state.failed[state.active]))state.active=null;
  if(state.center&&(!META[state.center]||state.declined[state.center]))state.center=null;
  if(!state.center){
    const inferred=ORDER.find(id=>bondActive(life,id))||ORDER.find(id=>state.completed[id]&&!state.failed[id])||state.active;
    if(inferred){state.center=inferred;state.centerSince=life.day||0;}
  }
  return state;
}
function engage(life,id,reason){
  const state=ensure(life);
  if(!META[id]||state.declined[id])return{ok:false,reason:state.declined[id]?'declined':'unknown',state};
  const previous=state.center;
  const promote=!previous||ORDER.indexOf(id)<ORDER.indexOf(previous);
  if(promote){
    state.center=id;
    state.centerSince=life.day||0;
    const row={type:previous?'center-promote':'center-select',id,from:previous||null,reason:reason||'route',day:life.day||0};
    state.centerHistory.push(row);
    state.history.push(row);
  }
  return{ok:true,changed:promote,center:state.center,previous,state};
}
function decline(life,id,reason){
  const state=ensure(life);
  if(!META[id])return{ok:false,reason:'unknown',state};
  state.declined[id]={reason:reason||'declined',day:life.day||0};
  const wasCenter=state.center===id;
  if(wasCenter){state.center=null;state.centerSince=null;}
  const row={type:'decline',id,wasCenter,reason:reason||'declined',day:life.day||0};
  state.centerHistory.push(row);
  state.history.push(row);
  if(wasCenter){
    const fallback=ORDER.find(group=>group!==id&&engaged(life,group));
    if(fallback)engage(life,fallback,`fallback_after_${id}`);
  }
  return{ok:true,wasCenter,state};
}
function engaged(life,id){
  const state=ensure(life);
  if(state.declined[id])return false;
  if(id==='freedom'&&life.freedomTrio&&life.freedomTrio.onlineOnlyComplete)return false;
  if(state.center===id||state.active===id||state.completed[id]||bondActive(life,id))return true;
  if(id==='dangerous'){
    const trio=life.dangerousTrio||{};
    return !trio.lockedOut&&(life.seraHousing==='cohabit'||trio.badFriendsFormed||trio.active);
  }
  if(id==='freedom'){
    const trio=life.freedomTrio||{};
    return trio.guildStage>0||trio.firstOuting==='seen';
  }
  if(id==='business'){
    const romance=life.businessRomance||{},staff=romance.staff||{},quartet=romance.quartet||{};
    return (quartet.chapter||0)>0||!!quartet.ending||!!life.businessQuartetBond||
      Object.values(staff).some(person=>person&&(person.secretAffair||person.turncoatResolved));
  }
  return id==='childhood'&&!!(life.childhoodCircle&&life.childhoodCircle.seen&&life.childhoodCircle.seen.reunion);
}
function fallbackReady(life,id){
  const state=ensure(life),index=ORDER.indexOf(id);
  if(index<0||state.declined[id])return false;
  if(state.center)return state.center===id;
  return ORDER.slice(0,index).every(group=>!engaged(life,group));
}
function center(life){return ensure(life).center||null;}
function begin(life,id){
  const state=ensure(life);
  if(!META[id]||state.completed[id]||state.failed[id])return{ok:false,reason:'resolved'};
  if(state.declined[id])return{ok:false,reason:'declined'};
  if(state.active&&state.active!==id)return{ok:false,reason:'another_route',active:state.active};
  engage(life,id,'route_begin');
  state.active=id;
  state.history.push({type:'begin',id,day:life.day||0});
  return{ok:true,state};
}
function complete(life,id,ending,tone){
  const state=ensure(life);
  if(!META[id])return state;
  const target=tone==='bad'?state.failed:state.completed;
  target[id]={ending:ending||'complete',day:life.day||0};
  if(state.active===id)state.active=null;
  if(tone==='bad')decline(life,id,ending||'bad_ending');
  else engage(life,id,'route_complete');
  state.history.push({type:tone==='bad'?'failed':'complete',id,ending:ending||null,day:life.day||0});
  return state;
}
function canStart(life,id){
  const state=ensure(life);
  if(!META[id])return{ok:false,reason:'unknown'};
  if(life.familyRouteLock&&life.familyRouteLock!==id)return{ok:false,reason:'family_route_locked',active:life.familyRouteLock};
  if(state.completed[id]||state.failed[id])return{ok:false,reason:'resolved'};
  if(state.declined[id])return{ok:false,reason:'declined'};
  if(state.active&&state.active!==id)return{ok:false,reason:'another_route',active:state.active};
  return{ok:true};
}
function markCross(life,id){
  const state=ensure(life);
  if(state.crossSeen[id])return false;
  state.crossSeen[id]=true;
  state.history.push({type:'cross',id,day:life.day||0});
  return true;
}
function activeGroups(life){return ORDER.filter(id=>bondActive(life,id));}
function memberGroup(name){return ORDER.find(id=>META[id].members.includes(name))||null;}
function lockRomance(life,id,reason){
  const state=ensure(life);
  if(!META[id])return{ok:false,reason:'unknown',state};
  if(!state.romanceLocked[id]){
    state.romanceLocked[id]={reason:reason||'romance_declined',day:life.day||0};
    state.history.push({type:'romance-lock',id,reason:reason||'romance_declined',day:life.day||0});
  }
  state.confessions[id]={status:'rejected',reason:reason||'romance_declined',day:life.day||0};
  return{ok:true,state,locked:state.romanceLocked[id]};
}
function romanceAvailable(life,id){
  const state=ensure(life);
  return !!META[id]&&!state.romanceLocked[id];
}
function setConfession(life,id,status){
  const state=ensure(life);
  if(!META[id])return null;
  state.confessions[id]={status:status||'queued',day:life.day||0};
  state.history.push({type:'confession',id,status:status||'queued',day:life.day||0});
  return state.confessions[id];
}
function confession(life,id){return ensure(life).confessions[id]||null;}
function beginDevotion(life,id,name,reason){
  const state=ensure(life);
  if(!META[id]||!META[id].members.includes(name))return{ok:false,reason:'unknown_member',state};
  const row={groupId:id,name,since:life.day||0,reason:reason||'player_confession',active:true};
  state.devotions[id]=row;
  state.confessions[id]={status:'blocked_by_pure_route',name,reason:row.reason,day:life.day||0};
  state.history.push({type:'devotion',id,name,reason:row.reason,day:life.day||0});
  return{ok:true,devotion:row,state};
}
function devotion(life,id){
  const state=ensure(life);
  if(id)return state.devotions[id]||null;
  return ORDER.map(groupId=>state.devotions[groupId]).find(row=>row&&row.active)||null;
}
function setPath(life,id,path,name,reason){
  const state=ensure(life);
  if(!META[id]||!['pure','group'].includes(path))return{ok:false,reason:'invalid_path',state};
  const existing=state.paths[id];
  if(existing&&existing.path!==path)return{ok:false,reason:'path_locked',path:existing,state};
  if(existing&&path==='pure'&&existing.name!==name)return{ok:false,reason:'pure_partner_locked',path:existing,state};
  if(path==='pure'&&(!name||!META[id].members.includes(name)))return{ok:false,reason:'unknown_member',state};
  const row=existing||{path,name:path==='pure'?name:null,since:life.day||0,reason:reason||'personal_story_branch'};
  state.paths[id]=row;
  engage(life,id,reason||'personal_story_branch');
  if(!existing)state.history.push({type:'path-select',id,path,name:row.name,reason:row.reason,day:life.day||0});
  return{ok:true,path:row,state};
}
function path(life,id){return ensure(life).paths[id]||null;}
function groupConfessionAvailable(life,id){
  const state=ensure(life);
  return romanceAvailable(life,id)&&!state.devotions[id]&&(!state.active||state.active===id);
}
function clearQueuedConfession(life,id){
  const state=ensure(life),row=state.confessions[id];
  if(row&&row.status==='queued')delete state.confessions[id];
  return state;
}
function endDevotion(life,id,reason){
  const state=ensure(life),row=state.devotions[id];
  if(!row)return null;
  row.active=false;row.ended=life.day||0;row.endReason=reason||'relationship_ended';
  state.history.push({type:'devotion-end',id,name:row.name,reason:row.endReason,day:life.day||0});
  return row;
}
function preserveMembers(life,names){
  const poly=life.polycule||(life.polycule={active:false,members:[],trust:0});
  const existing=[life.partner,...(poly.members||[])].filter(Boolean);
  const byName=new Map(existing.map(person=>[typeof person==='string'?person:person.name,person]));
  (names||[]).forEach(person=>byName.set(typeof person==='string'?person:person.name,person));
  const primary=life.partner&&life.partner.name;
  poly.members=[...byName.entries()].filter(([name])=>name&&name!==primary).map(([,person])=>person);
  poly.active=poly.members.length>0;
  return poly;
}

root.QT_ROMANCE_ROUTES={ORDER,META,ensure,engage,decline,engaged,fallbackReady,center,begin,complete,canStart,markCross,activeGroups,memberGroup,lockRomance,romanceAvailable,setConfession,confession,beginDevotion,devotion,setPath,path,groupConfessionAvailable,clearQueuedConfession,endDevotion,preserveMembers};
})(window);
