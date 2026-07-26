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
    life.romanceRoutes={version:2,active:null,center:null,centerSince:null,completed:{},failed:{},declined:{},crossSeen:{},history:[]};
  }
  const state=life.romanceRoutes;
  state.version=2;
  state.completed=state.completed||{};
  state.failed=state.failed||{};
  state.declined=state.declined||{};
  state.crossSeen=state.crossSeen||{};
  if(!Array.isArray(state.history))state.history=[];
  if(!Array.isArray(state.centerHistory))state.centerHistory=[];
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
    return (quartet.chapter||0)>0||Object.values(staff).some(person=>person&&(person.hired||person.revealed||person.romanticRival));
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

root.QT_ROMANCE_ROUTES={ORDER,META,ensure,engage,decline,engaged,fallbackReady,center,begin,complete,canStart,markCross,activeGroups,memberGroup,preserveMembers};
})(window);
