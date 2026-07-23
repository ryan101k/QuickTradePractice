/* QuickTrade Life — 전 캐릭터 개인 스토리 엔진 */
(function(root){'use strict';
const ARCS={
 '서연':['마감 뒤의 빈 작업실','표절 시비','둘만의 전시회','일과 사랑 사이에서 자기 이름을 지키려 한다.'],
 '민준':['승소 뒤의 침묵','양심과 의뢰인','사무실의 공동 열쇠','성공만 좇던 변호사가 관계와 원칙 사이를 선택한다.'],
 '지우':['밀린 공과금','마지막 허세','처음 번 월급','의존과 허세를 내려놓고 스스로 서는 법을 배운다.'],
 '하은':['끝나지 않는 야간근무','병동의 민원','쉬어도 되는 날','모두를 돌보느라 자신을 잊은 사람이 도움을 받는 법을 배운다.'],
 '도윤':['수술실 밖의 얼굴','의료 분쟁','처음 꺼낸 약한 말','완벽한 의사라는 가면 뒤의 두려움을 인정한다.'],
 '수빈':['조회수 0의 밤','악성 폭로 영상','카메라를 끈 여행','관계까지 콘텐츠로 만들 것인지 진짜 자신으로 남을지 선택한다.'],
 '예린':['정해진 하루','가족의 결혼 압박','둘만의 생활표','안정된 계획 속에 타인의 기대가 아닌 자기 삶을 넣는다.'],
 '시우':['새벽 배포','창업 제안','로그아웃한 주말','성과와 번아웃 사이에서 함께 사는 리듬을 찾는다.'],
 '채원':['엇갈린 비행','승객의 오해','돌아올 집','화려한 이동 생활 속에서 머물 곳과 사람을 선택한다.'],
 '건우':['비어가는 가게','동업자의 배신','다시 켠 간판','실패를 숨기지 않고 삶과 사업을 다시 세운다.'],
 '유나':['화보 속 가짜 연인','외모 악플','렌즈 밖의 얼굴','보이는 이미지가 아닌 실제 자신을 사랑받고 싶어 한다.'],
 '수아':['교실의 소문','학부모 민원','졸업식의 약속','다정함 때문에 모든 책임을 떠안지 않는 법을 배운다.'],
 '태양':['화려한 투자 발표','현금흐름 위기','작은 회사의 새 출발','과시와 확장 대신 신뢰할 수 있는 성공을 선택한다.'],
 '보라':['정확한 하루','가족 약국의 빚','늦은 밤의 처방전','안정만 지키던 사람이 자신의 욕망을 말하기 시작한다.'],
 '다은':['무너진 케이크','가게 독립 제안','두 사람의 첫 메뉴','남을 위한 달콤함 뒤에 숨긴 자기 꿈을 꺼낸다.'],
 '혜진':['사라진 연구 데이터','성과 가로채기','공동 저자','감정을 배제하던 연구원이 신뢰와 연대를 실험한다.'],
 '소희':['빈 객석','해외 오디션','마지막 앙코르','자유로운 음악과 관계의 책임을 함께 지킬지 고민한다.'],
 '아린':['반려된 원고','작가와의 충돌','첫 헌사','타인의 문장을 다듬던 사람이 자기 이야기를 시작한다.'],
 '나영':['부상 숨기기','승부 조작 제안','함께 걷는 코스','강함을 증명하는 대신 약함을 공유하는 법을 배운다.'],
 '미래':['출시 전 크런치','기획 탈취','엔딩 크레딧','게임과 인생에서 누구의 선택을 존중할지 결정한다.'],
 '나래':['수강생의 손실','교육 원칙의 위기','나란히 보는 차트','가르치는 사람과 연인의 경계를 새롭게 합의한다.'],
 '강유진':['보호라는 감시','내부 비리 제보','반납한 위치추적기','지키고 싶은 마음이 통제가 되지 않도록 선을 배운다.'],
 '윤세라':['새벽의 부재중 전화','잠긴 작업실','열어둔 문','버림받을 공포를 사랑으로 포장하지 않는 결말을 찾는다.'],
 '한채린':['낮춰진 의자','후계 경쟁','계약서 없는 관계','복종을 애정으로 여기던 상속녀가 대등함 또는 완전한 지배를 선택한다.']
};
const MIN=[18,42,68];
function get(name){const a=ARCS[name];if(!a)return null;return{name,theme:a[3],chapters:a.slice(0,3).map((title,i)=>({index:i,title,min:MIN[i],desc:[
  `‘${title}’ — 관계가 알아가는 사이로 접어들자, ${name}이(가) 평소엔 보이지 않던 얼굴을 당신에게만 꺼냈습니다. ${a[3]} 그 시작을 당신과 나눕니다. 여기서 어떻게 반응하느냐가 두 사람의 결을 정합니다.`,
  `‘${title}’ — 사이가 깊어지자 그동안 미뤄둔 문제가 결국 두 사람 앞에 드러났습니다. ${name}은(는) 당신이 어느 편에 설지 지켜보고 있습니다. ${a[3]} 이번 선택은 쌓아온 신뢰를 시험합니다.`,
  `‘${title}’ — 지금까지의 선택들이 모여 마지막 장면을 만듭니다. ${name}이(가) 정면으로 당신에게 결말을 묻습니다. ${a[3]} 여기서의 답이 두 사람이 어떤 사이로 남을지를 결정합니다.`
][i],choices:[
  {id:'support',text:'상대의 선택을 존중하며 함께 해결한다',affection:9,trust:10,obsession:-3,tone:'good'},
  {id:'lead',text:'내가 해결책을 정하고 따라오라고 한다',affection:i===2?-8:-3,trust:-5,obsession:5,tone:'neutral'},
  {id:'avoid',text:'지금은 관여하지 않고 거리를 둔다',affection:-9,trust:-7,obsession:7,tone:'bad'}
]}))};}
function ensure(rec){if(!rec.story)rec.story={chapter:0,completed:false,history:[]};return rec.story;}
function next(rec){const s=get(rec.name),state=ensure(rec);if(!s||state.completed)return null;const ch=s.chapters[state.chapter];return ch&&(rec.affection||0)>=ch.min?ch:null;}
function apply(rec,choiceId){const s=get(rec.name),state=ensure(rec),ch=s&&s.chapters[state.chapter];if(!ch)return null;const c=ch.choices.find(x=>x.id===choiceId);if(!c)return null;rec.affection=Math.max(0,Math.min(100,(rec.affection||0)+c.affection));rec.trust=Math.max(0,Math.min(100,(rec.trust||0)+c.trust));rec.obsession=Math.max(0,Math.min(100,(rec.obsession||0)+c.obsession));state.history.push({chapter:state.chapter,choice:choiceId});state.chapter++;state.completed=state.chapter>=s.chapters.length;return{story:s,chapter:ch,choice:c,completed:state.completed};}
root.QT_CHARACTER_STORIES={ARCS,get,ensure,next,apply};
})(window);
