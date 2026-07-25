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
    life.romanceRoutes={version:1,active:null,completed:{},failed:{},crossSeen:{},history:[]};
  }
  const state=life.romanceRoutes;
  state.version=1;
  state.completed=state.completed||{};
  state.failed=state.failed||{};
  state.crossSeen=state.crossSeen||{};
  if(!Array.isArray(state.history))state.history=[];
  ORDER.forEach(id=>{if(bondActive(life,id))state.completed[id]=state.completed[id]||{ending:'legacy',day:life.day||0};});
  if(state.active&&(state.completed[state.active]||state.failed[state.active]))state.active=null;
  return state;
}
function begin(life,id){
  const state=ensure(life);
  if(!META[id]||state.completed[id]||state.failed[id])return{ok:false,reason:'resolved'};
  if(state.active&&state.active!==id)return{ok:false,reason:'another_route',active:state.active};
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
  state.history.push({type:tone==='bad'?'failed':'complete',id,ending:ending||null,day:life.day||0});
  return state;
}
function canStart(life,id){
  const state=ensure(life);
  if(!META[id])return{ok:false,reason:'unknown'};
  if(state.completed[id]||state.failed[id])return{ok:false,reason:'resolved'};
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

root.QT_ROMANCE_ROUTES={ORDER,META,ensure,begin,complete,canStart,markCross,activeGroups,memberGroup,preserveMembers};
})(window);
