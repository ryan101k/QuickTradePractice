/* QuickTrade — 월간·긴급 뉴스를 말해 주는 가벼운 CSS 도트 앵커 */
(function(root){'use strict';

let host=null,timer=null,lastPayload=null;
const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[char]);

function sprite(){
  return`<div class="pixel-anchor-sprite" aria-hidden="true">
    <i class="pa-hair"></i><i class="pa-face"></i><i class="pa-eye pa-eye-l"></i><i class="pa-eye pa-eye-r"></i>
    <i class="pa-mouth"></i><i class="pa-body"></i><i class="pa-mic"></i>
  </div>`;
}
function mount(){
  if(host&&document.body.contains(host))return true;
  host=document.createElement('aside');
  host.id='news-anchor';
  host.className='news-anchor';
  host.setAttribute('aria-live','polite');
  host.innerHTML=`<button class="news-anchor-close" type="button" aria-label="뉴스 안내 닫기">×</button>${sprite()}<div class="news-anchor-copy"><b class="news-anchor-label">달월 뉴스</b><span class="news-anchor-text">이번 달 소식을 정리 중입니다.</span><small class="news-anchor-hint"></small></div>`;
  document.body.appendChild(host);
  host.querySelector('.news-anchor-close').addEventListener('click',hide);
  host.querySelector('.pixel-anchor-sprite').addEventListener('click',()=>{if(lastPayload)show(lastPayload);});
  return true;
}
function direction(impact){
  const value=Number(impact)||0;
  if(value>=.12)return'강한 상승 압력';
  if(value>=.035)return'완만한 상승 압력';
  if(value<=-.12)return'강한 하락 압력';
  if(value<=-.035)return'완만한 하락 압력';
  return'중립에 가까운 흐름';
}
function explain(payload){
  if(payload.kind==='monthly'){
    const sectors=[payload.strong&&`강세 ${payload.strong}`,payload.weak&&`약세 ${payload.weak}`].filter(Boolean).join(' · ');
    return{label:`📅 ${payload.date||'이번 달'} 달월 뉴스`,text:payload.text||'새로운 경제 전망이 나왔습니다.',hint:sectors||direction(payload.impact),tone:Number(payload.impact)<0?'bad':'good'};
  }
  const target=payload.target||'시장 전체';
  return{label:'🚨 긴급 뉴스 해설',text:payload.headline||'새로운 속보가 들어왔습니다.',hint:`${target} · ${direction(payload.impact)}`,tone:Number(payload.impact)<0?'bad':'good'};
}
function show(payload){
  if(!mount())return;
  lastPayload=payload;
  const copy=explain(payload||{});
  host.classList.remove('good','bad','show','speaking');
  host.classList.add(copy.tone);
  host.querySelector('.news-anchor-label').textContent=copy.label;
  host.querySelector('.news-anchor-text').innerHTML=esc(copy.text);
  host.querySelector('.news-anchor-hint').textContent=copy.hint;
  requestAnimationFrame(()=>host.classList.add('show','speaking'));
  if(timer)clearTimeout(timer);
  timer=setTimeout(()=>host.classList.remove('speaking'),2400);
  timer=setTimeout(hide,payload&&payload.kind==='breaking'?10500:7500);
}
function monthly(payload){show(Object.assign({kind:'monthly'},payload));}
function breaking(payload){show(Object.assign({kind:'breaking'},payload));}
function hide(){if(timer)clearTimeout(timer);timer=null;if(host)host.classList.remove('show','speaking');}

root.QT_NEWS_ANCHOR={mount,show,monthly,breaking,hide,direction};
})(window);
