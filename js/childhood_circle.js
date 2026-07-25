/* QuickTrade Life — 옛 동아리 전 연인 5인조 ‘한 번씩 헤어진 다섯’
 * 생활경제연구회에서 주인공과 각자 다른 시기에 사귀었고, 졸업 직전
 * 모의투자 계정 조작 사건으로 다섯 관계와 동아리가 한꺼번에 끝났다.
 * 다시 만난 뒤에는 “누가 진짜 배신했는가”와 과거 연애의 우선권이 위험도 역할을 한다.
 */
(function (root) {
  'use strict';

  const MEMBERS = ['예린', '보라', '서연', '나영', '미래'];
  const ACTIVE = new Set(['friend', 'casual', 'partner', 'lover', 'polycule']);
  const META = {
    예린: { role:'초대 회장·첫 연인', icon:'🗓️', danger:'동아리 규칙과 첫 연인이라는 순서를 근거로 다른 네 사람보다 우선권을 주장한다.' },
    보라: { role:'회계·두 번째 연인', icon:'💊', danger:'조작 사건 당시 장부와 주인공의 생활 기록을 함께 쥐고 있다.' },
    서연: { role:'홍보·세 번째 연인', icon:'📷', danger:'다섯 번의 연애가 겹쳐 보이는 사진을 작품과 증거 사이에 남겨 두었다.' },
    나영: { role:'대외협력·네 번째 연인', icon:'🏃‍♀️', danger:'사건 직후 도망친 주인공을 잡지 못한 일을 아직 패배로 여긴다.' },
    미래: { role:'전산·마지막 연인', icon:'💾', danger:'삭제된 대회 로그와 단체방 원본을 혼자 복구할 수 있다.' },
  };
  const C = (id, text, preview, affection, trust, pressure, tone, reaction, effects, trait) => ({
    id, text, preview, affection, trust, obsession:pressure, pressure, tone, reaction,
    effects:effects || {}, trait
  });

  const STORIES = {
    예린: [
      { title:'지워지지 않은 생활표', desc:'예린은 중학교 때 함께 쓰던 생활표를 아직 보관하고 있습니다. 지금의 출퇴근과 수면 시간까지 빈칸에 채워 넣었습니다.', speaker:'예전엔 네가 늦으면 내가 먼저 알았잖아. 지금도 그래도 되는지, 이번에는 물어볼게.', choices:[
        C('remember','추억 옆에 지금의 일정을 함께 적는다','과거를 공유하되 현재의 선택권을 지킨다',9,11,-5,'good','좋아. 예전 표는 참고만 하고, 지금 일정은 네가 정해.',{},'present'),
        C('rewind','예린이 예전처럼 하루를 관리하게 둔다','편안함과 함께 예전 생활 규칙이 돌아온다',12,4,11,'neutral','그럼 늦잠도 끼니도 내가 먼저 챙길게. 옛날처럼.',{},'rewind'),
        C('erase','표를 당장 버리라고 한다','경계는 세우지만 함께한 시간을 부정한다',-10,-9,3,'bad','종이는 버릴 수 있어. 네가 언제 도망치는지는 안 잊어.',{},'sever')
      ]},
      { title:'가족보다 먼저 아는 사람', desc:'가족 모임 날짜를 주인공보다 예린이 먼저 알고 있습니다. 부모님은 여전히 예린을 집안 사정을 가장 잘 아는 친구로 여깁니다.', speaker:'네가 성공하고 바뀌어도 가족한테는 여전히 그 애야. 그 틈까지 내가 맡아도 돼?', choices:[
        C('remember','가족에게 현재의 관계와 경계를 직접 설명한다','예린을 밀어내지 않으면서 역할을 다시 정한다',10,13,-6,'good','알겠어. 도울 때도 먼저 물어볼게. 가족 핑계로 네 삶에 들어가진 않을게.',{},'present'),
        C('rewind','가족 연락과 일정을 예린에게 맡긴다','사적인 생활의 열쇠를 넘긴다',12,5,13,'neutral','네가 놓치는 건 내가 기억할게. 네가 모르는 네 일정까지.',{},'rewind'),
        C('erase','가족에게도 예린과 연락하지 말라고 한다','연결을 끊는 대신 오래된 안전망도 잃는다',-12,-11,2,'bad','이제 가족도 새로 사귀나 봐. 그래도 네가 아플 때 부를 이름은 기억해.',{},'sever')
      ]},
      { title:'서로 쓰는 졸업 이후', desc:'예린이 비어 있는 성인 생활표를 내밉니다. 과거를 복원할지, 현재의 두 사람이 다시 합의할지 마지막으로 묻습니다.', speaker:'나는 네 원래 모습을 알아. 그래도 지금의 네가 다르다고 말하면, 이번에는 믿어볼게.', choices:[
        C('remember','각자의 일정을 존중하는 공동 달력을 만든다','오래된 약속을 현재의 합의로 바꾼다',15,17,-11,'good','좋아. 확인은 하되 허락을 받게 하진 않을게. 우리 이제 어른이니까.',{},'present'),
        C('rewind','학창 시절 생활표를 그대로 다시 시작한다','익숙함이 현재의 자유를 덮는다',17,7,18,'neutral','드디어 원래 자리로 돌아왔네. 빈칸은 내가 전부 채워둘게.',{},'rewind'),
        C('erase','표를 접고 각자 살자고 한다','현재는 지키지만 관계의 역사까지 닫는다',-17,-14,-3,'bad','이번에는 네가 정한 졸업이네. 알겠어. 따라가진 않을게.',{},'sever')
      ]}
    ],
    보라: [
      { title:'약봉지에 적힌 옛 별명', desc:'보라는 학창 시절 양호실 기록과 알레르기까지 기억합니다. 오랜만에 만난 날에도 말없이 약과 죽을 준비해 왔습니다.', speaker:'넌 아프면 괜찮다고 세 번 말하고 네 번째에 쓰러졌어. 지금도 그러는지 확인해도 돼?', choices:[
        C('remember','진료는 내가 받고 보라에게 회복만 부탁한다','돌봄과 통제의 선을 나눈다',10,12,-5,'good','좋아. 의사처럼 굴진 않을게. 대신 친구로서 네 말은 끝까지 들을게.',{},'present'),
        C('rewind','식사와 수면을 보라에게 맡긴다','몸은 편해지지만 결정권이 줄어든다',13,5,12,'neutral','그럼 내 말대로 먹고 자. 네 몸은 네 말보다 기록이 정확하니까.',{health:3},'rewind'),
        C('erase','과거 건강 이야기를 꺼내지 말라고 한다','간섭은 막지만 돌봄도 밀어낸다',-11,-10,3,'bad','그래. 쓰러진 다음에도 처음 보는 사람처럼 물어볼게.',{},'sever')
      ]},
      { title:'가족 약장 맨 위 칸', desc:'보라는 주인공 집 약장에 자기 이름이 붙은 칸이 있던 일을 기억합니다. 이제는 비상 연락처의 보호자 칸을 바라봅니다.', speaker:'같이 있는 것과 책임지는 건 달라. 네가 의식을 잃었을 때 내가 결정해도 되는지 묻는 거야.', choices:[
        C('remember','비상 연락처로 두되 평소 결정은 직접 한다','신뢰를 제도화하되 권리를 넘기지 않는다',12,14,-7,'good','그 정도면 충분해. 네가 못 말할 때만 내가 말할게.',{},'present'),
        C('rewind','보라를 모든 의료 결정의 보호자로 지정한다','보호가 생활 전체의 통제로 번진다',14,6,15,'neutral','이제 다른 사람한테 괜찮은 척해도 소용없어. 기록은 나한테 오니까.',{health:4},'rewind'),
        C('erase','비상 연락처에서 보라 이름을 지운다','독립은 지키지만 보라가 가장 두려워한 공백을 만든다',-14,-13,2,'bad','알겠어. 다음엔 네가 사라져도 병원부터 뒤지진 않을게.',{},'sever')
      ]},
      { title:'보호자의 이름', desc:'보라는 빈 동의서 한 장을 건넵니다. 평생의 보호자가 될지, 서로의 몸과 선택을 분리할지 정해야 합니다.', speaker:'네 몸을 제일 오래 본 사람이 나라는 게, 네 삶까지 가질 권리는 아니겠지. 네가 정해줘.', choices:[
        C('remember','필요할 때 부르되 선택은 서로에게 돌려준다','돌봄을 소유가 아닌 약속으로 만든다',16,18,-11,'good','응. 먼저 묻고, 대답 못 할 때만 붙잡을게.',{},'present'),
        C('rewind','건강과 생활 결정을 전부 보라에게 맡긴다','안전한 대신 혼자 설 이유가 사라진다',18,8,19,'neutral','이제 아프다고 숨겨도 돼. 숨긴 것까지 내가 찾아낼 테니까.',{health:5},'rewind'),
        C('erase','동의서를 찢고 보호받지 않겠다고 한다','관계와 위험을 함께 끊어낸다',-17,-15,-3,'bad','혼자 버티는 게 네 선택이면 존중할게. 그래도 약은 문 앞에 둘 거야.',{},'sever')
      ]}
    ],
    서연: [
      { title:'앨범에서 자란 얼굴', desc:'서연의 작업실에는 학창 시절 사진과 낙서가 날짜별로 정리되어 있습니다. 버렸다고 생각한 사진도 빠짐없이 남아 있습니다.', speaker:'사람들은 지금 네 얼굴만 알지. 나는 네가 되기 전부터 봤어. 그게 조금 자랑스러워.', choices:[
        C('remember','함께 볼 사진과 묻어둘 사진을 고른다','기억의 공개 범위를 지금 다시 합의한다',10,12,-5,'good','응. 기억은 내 거여도 네 얼굴은 네 거니까.',{},'present'),
        C('rewind','사진 사용을 전부 서연에게 맡긴다','과거 이미지가 현재의 주인공을 대신한다',13,4,12,'neutral','가장 너다웠던 때를 내가 골라줄게. 다른 모습은 잠깐 헤맨 거야.',{charm:2},'rewind'),
        C('erase','사진과 스케치를 전부 없애라고 한다','위험한 기록과 다정한 기억이 함께 사라진다',-12,-11,3,'bad','태우진 않을게. 네가 모르는 곳에 두는 것도 보관이니까.',{},'sever')
      ]},
      { title:'성공한 사람의 초상', desc:'서연의 새 전시 중심에는 지금의 주인공과 학창 시절 모습이 겹친 초상이 걸려 있습니다. 관객은 어느 쪽이 진짜인지 묻습니다.', speaker:'다들 네가 강해졌대. 난 강한 척하는 표정도 알아. 어느 얼굴을 남길까?', choices:[
        C('remember','지금의 변화까지 담은 공동 작업으로 고친다','과거와 현재가 한 사람 안에 공존한다',12,15,-7,'good','그래, 옛날 너를 지우지 않고도 지금 너를 그릴 수 있네.',{charm:2},'present'),
        C('rewind','서연이 기억하는 모습만 공개하게 둔다','대중에게도 과거의 인격이 진짜로 고정된다',15,5,15,'neutral','이제 다들 네 원래 얼굴을 보겠네. 나만 알던 걸 조금 나눠줄게.',{charm:4},'rewind'),
        C('erase','전시를 취소하고 작품을 사들인다','평판은 막지만 기억을 거래로 끝낸다',-14,-13,2,'bad','내 기억에도 가격을 붙일 수 있다고 생각했구나.',{cash:-1500000},'sever')
      ]},
      { title:'마지막 교복 스케치', desc:'서연은 완성하지 못한 교복 스케치 옆에 지금의 주인공을 그릴 빈 캔버스를 세웠습니다.', speaker:'그때의 너를 완성하면 편할 거야. 하지만 지금의 널 새로 그리는 건 더 오래 걸리겠지.', choices:[
        C('remember','과거 스케치 옆에 지금의 초상을 그리게 한다','변화를 인정하는 오래된 사랑을 택한다',16,18,-11,'good','둘 다 너야. 이제 한 장면만 진짜라고 우기지 않을게.',{},'present'),
        C('rewind','교복 스케치만 완성한다','관계가 가장 아름다웠던 시절에 멈춘다',18,7,19,'neutral','변한 건 잠깐이었어. 내가 기억한 네가 결국 돌아왔네.',{},'rewind'),
        C('erase','두 캔버스를 모두 찢는다','기억의 소유권을 되찾지만 서연도 떠난다',-18,-16,-4,'bad','빈 캔버스는 남겨둘게. 언젠가 네가 네 얼굴을 다시 고르면.',{},'sever')
      ]}
    ],
    나영: [
      { title:'도망치던 이동선', desc:'나영은 주인공이 힘들 때 숨던 장소를 아직 기억합니다. 연락이 끊긴 날, 대답을 기다리지 않고 그곳에 먼저 와 있습니다.', speaker:'여기일 줄 알았어. 옛날에도 끝까지 달리면 결국 이 벤치였잖아. 이번엔 잡아도 돼?', choices:[
        C('remember','숨은 이유를 말하고 함께 걸어서 돌아간다','추적을 구조가 아닌 동행으로 바꾼다',11,12,-5,'good','좋아. 끌고 가진 않을게. 대신 네 걸음으로 같이 돌아가.',{},'present'),
        C('rewind','말없이 나영의 손을 잡고 따라간다','안도와 함께 도망칠 선택지가 줄어든다',14,5,13,'neutral','이제 말 안 해도 돼. 네가 갈 만한 곳은 내가 다 아니까.',{fitness:3},'rewind'),
        C('erase','다시는 찾아오지 말라고 한다','추적은 끊지만 가장 빠른 구조자도 잃는다',-13,-11,4,'bad','알겠어. 다음엔 멀리서 네가 일어나는지만 보고 갈게.',{},'sever')
      ]},
      { title:'주장 완장의 주인', desc:'학창 시절 주인공 대신 벌을 받던 주장 완장을 나영이 보관하고 있습니다. 이번에는 현실의 위험까지 대신 맞으려 합니다.', speaker:'그때는 내가 앞에 서면 끝났어. 지금도 네 뒤를 노리는 건 내가 먼저 막을 수 있어.', choices:[
        C('remember','위험을 나누고 서로의 신호를 정한다','보호받던 관계가 대등한 팀으로 자란다',13,15,-7,'good','좋아. 내가 앞만 보지 않고 네 신호도 볼게. 같은 팀이니까.',{},'present'),
        C('rewind','완장을 돌려주고 모든 대응을 맡긴다','강한 보호가 결정권까지 가져간다',16,6,15,'neutral','이번에도 내 뒤에 있어. 네가 누구랑 싸울지는 내가 정해.',{stress:-5},'rewind'),
        C('erase','옛일을 핑계로 영웅처럼 굴지 말라고 한다','의존은 끊지만 나영의 자존심을 꺾는다',-15,-13,3,'bad','그래, 네 인생 경기에는 출전 안 할게. 관중석에도 있지 말라는 거지?',{},'sever')
      ]},
      { title:'끝나지 않은 계주', desc:'나영이 낡은 계주 바통을 내밉니다. 각자 뛰되 바통을 건넬지, 나영이 정한 코스만 달릴지 결정해야 합니다.', speaker:'네가 나 없이 다른 방향으로 달리는 게 싫었던 것 같아. 그래도 잡아오는 게 사랑은 아니겠지.', choices:[
        C('remember','서로 다른 코스를 달린 뒤 결승점에서 만나자고 한다','보호와 자유를 함께 남긴다',17,18,-12,'good','약속해. 네가 늦어도 찾으러 가진 않을게. 결승선에서 기다릴게.',{},'present'),
        C('rewind','바통을 나영에게 맡기고 정한 코스만 달린다','도망칠 이유와 길이 동시에 사라진다',19,8,20,'neutral','이제 코스 밖으로 한 발만 나가도 바로 잡을 거야. 넌 내 주자니까.',{fitness:5},'rewind'),
        C('erase','바통을 버리고 혼자 뛰겠다고 한다','완전한 독립과 완전한 단절을 택한다',-18,-16,-4,'bad','혼자 뛰어. 넘어져도 이번엔 네가 먼저 일어나.',{},'sever')
      ]}
    ],
    미래: [
      { title:'삭제되지 않은 채팅방', desc:'미래의 개인 서버에는 학창 시절 단체 채팅과 주인공이 지운 메시지까지 백업되어 있습니다.', speaker:'삭제 요청은 받았는데 실행은 안 했어. 그때 네가 나중에 필요할 거라고 했거든. 지금도 필요해?', choices:[
        C('remember','함께 볼 범위와 삭제할 기록을 정한다','기억과 개인정보의 권한을 다시 나눈다',10,13,-6,'good','권한 수정 완료. 추억도 공동 소유면 동의가 먼저지.',{},'present'),
        C('rewind','미래에게 모든 기록의 관리자 권한을 준다','편리함 속에서 과거가 현재를 감시한다',13,5,13,'neutral','관리자 승인. 네가 잊은 네 말까지 내가 복원해줄게.',{},'rewind'),
        C('erase','서버를 즉시 폐기하라고 한다','기록은 끊지만 미래의 신뢰도 초기화한다',-13,-12,3,'bad','폐기 예약. 다만 마지막 백업은 네가 아니라 그때의 나를 위한 거야.',{},'sever')
      ]},
      { title:'원래 버전의 너', desc:'미래는 최근 선택을 성격 변화가 아닌 오류로 분류합니다. 학창 시절 취향과 생활을 복구하는 개인 프로그램까지 만들었습니다.', speaker:'지금 버전도 작동은 해. 그런데 내가 좋아한 빌드는 이쪽이야. 롤백하면 편해질 텐데?', choices:[
        C('remember','옛 취향은 보관하고 현재 설정은 계속 갱신한다','변화를 오류가 아닌 업데이트로 인정시킨다',12,15,-7,'good','오케이. 원본은 추억이고 현재 버전이 정식 출시. 패치는 네가 결정해.',{},'present'),
        C('rewind','복구 프로그램을 실행한다','과거 습관과 관계가 현재를 덮어쓴다',16,6,16,'neutral','롤백 성공. 낯선 부분은 천천히 비활성화하면 돼.',{happy:4},'rewind'),
        C('erase','과거의 나는 죽었다고 선언한다','현재는 지키지만 미래가 사랑한 시간도 부정한다',-15,-14,3,'bad','종료된 서비스였구나. 나는 계속 접속 중이었는데.',{},'sever')
      ]},
      { title:'마지막 세이브 슬롯', desc:'미래가 과거와 현재 두 개의 세이브를 보여줍니다. 어느 쪽도 자동으로 불러오지 않고 주인공의 선택을 기다립니다.', speaker:'원본을 가진 사람은 나야. 그래도 플레이할 사람은 너니까, 이번엔 네가 눌러.', choices:[
        C('remember','새 슬롯에 과거와 현재를 함께 저장한다','추억을 보존하면서 계속 변할 권리를 지킨다',17,18,-12,'good','세 번째 슬롯 생성. 이름은 ‘우리, 계속 진행 중’.',{},'present'),
        C('rewind','학창 시절 세이브를 현재 위에 덮어쓴다','익숙한 세계가 다른 가능성을 지운다',19,8,20,'neutral','로드 완료. 이제 낯선 선택 버튼은 내가 숨겨둘게.',{},'rewind'),
        C('erase','모든 세이브를 영구 삭제한다','감시와 관계를 동시에 끝낸다',-19,-16,-4,'bad','복구 불가 확인. 이번에는 정말 로그아웃할게.',{},'sever')
      ]}
    ]
  };

  const LINES = {
    예린: {
      first:['친구라고 정리하기엔 우리 한 학기나 사귀었잖아. 이번에는 모르는 척 안 할 거지?'],
      incoming:['오늘도 아침 거른 거 아니지? 네 시간표상 지금 답장할 수 있어.','부모님께 연락 왔어. 이번에는 네가 먼저 설명할래, 내가 할까?'],
      warm:['오래 안다고 지금의 너까지 안다고 착각하지 않을게. 오늘 일부터 들려줘.'],
      brief:['응, 네가 늦게 답하는 시간까지 기억해. 급한 건 아니야.'],
      boundary:['알겠어. 예전 규칙을 지금 허락으로 착각하지 않을게.']
    },
    보라: {
      first:['헤어진 뒤에도 네 약은 내가 챙겼어. 그게 미련인지 습관인지 이번에는 확인할래.'],
      incoming:['식사는 했어? 사진 보내라는 말은 안 할게. 네 입으로 대답해.','그때 알레르기 아직 있어? 약부터 보내기 전에 물어보는 거야.'],
      warm:['네가 괜찮다고 말하면 일단 믿을게. 대신 정말 힘들면 나부터 불러.'],
      brief:['확인했어. 물 마시고 자. 잔소리는 여기까지.'],
      boundary:['걱정과 결정은 다르지. 네 몸의 결정은 네가 해.']
    },
    서연: {
      first:['우리 헤어질 때 찢은 사진, 사실 원본은 남아 있어. 네가 먼저 변명할래, 내가 먼저 보여줄까?'],
      incoming:['옛날 사진 정리하다가 네가 찢어달라던 걸 찾았어. 이번엔 먼저 물어볼게.','오늘 네 얼굴이 궁금해. 사진 말고 만나서 보고 싶다는 뜻이야.'],
      warm:['예전의 너도 좋아했지만, 지금의 널 새로 알아가는 쪽이 더 설레.'],
      brief:['응. 말 길어지기 전에 오늘 표정만 기억해둘게.'],
      boundary:['사진을 가진 것과 네 모습을 정할 권리는 다른 거 알아.']
    },
    나영: {
      first:['다섯 명한테 차례로 헤어지자고 하고 졸업식에서 도망쳤지. 이번에는 결승선까지 세워 둘 거야.'],
      incoming:['끝나고 운동장 한 바퀴. 안 나오면 네가 숨던 벤치부터 간다.','오늘 연락 짧네. 괜찮으면 괜찮다고, 아니면 위치만 보내.'],
      warm:['이번엔 네가 달리는 방향을 내가 정하진 않을게. 옆에서 뛸 수는 있지?'],
      brief:['오케이. 살아 있는 거 확인. 나머지는 만나서.'],
      boundary:['알았어. 찾으러 가기 전에 부를 때까지 기다릴게.']
    },
    미래: {
      first:['대회 계정 로그 복구했어.. 우리 다섯이 헤어진 날, 네가 몰랐던 접속 기록도 같이.'],
      incoming:['옛날 채팅방 백업 찾음. 열람 권한은 네 승인 대기 중.','오늘 상태 로그가 평소랑 달라. 간섭 말고 안부만 묻는 중.'],
      warm:['구버전도 좋아하지만 지금 네 업데이트 로그 읽는 게 더 재밌어.'],
      brief:['확인. 로그만 남기고 종료할게.'],
      boundary:['권한 회수 완료. 네 기록이라고 전부 내 추억은 아니니까.']
    }
  };

  const EVENTS = {
    reunion: {
      icon:'🏫', title:'한 번씩 헤어진 다섯 · 복구된 동아리방',
      scene:'./assets/pixel-event-childhood-reunion-v1.png',
      desc:'폐쇄됐던 생활경제연구회 단체방이 복구됐습니다. 다섯은 주인공과 각자 다른 시기에 사귀었고, 졸업 직전 모의투자 계정 조작 사건 뒤 누구도 제대로 헤어지지 못했습니다.',
      speakers:[
        ['예린','첫 연인은 나였어. 그 뒤에 넷이 줄줄이 생길 줄은 몰랐지만.'],
        ['보라','겹쳐 만난 건 아니라면서 왜 우리는 전부 같은 이유로 차였을까?'],
        ['서연','사진 날짜를 맞추면 누가 거짓말했는지 나올 거야. 보고 싶어?'],
        ['나영','졸업식에서 도망친 건 아직도 패배로 친다. 이번엔 못 가.'],
        ['미래','조작 로그 복구 완료. 범인은 이 방 안에 있을 확률 높음.']
      ],
      choices:[
        {id:'present',text:'다섯에게 그날 도망친 일을 사과하고 사건부터 다시 조사한다',preview:'전 연인에서 친구로 · 현재의 신뢰와 진실 추적 시작',trust:12,pressure:-8,affection:8,trait:'present'},
        {id:'rewind',text:'누구를 가장 사랑했는지는 아직 답할 수 없다고 한다',preview:'전원과 다시 가까워짐 · 과거 연애 경쟁이 재점화',trust:3,pressure:18,affection:13,trait:'rewind'},
        {id:'sever',text:'이미 끝난 연애라며 단체방을 다시 나간다',preview:'지인 상태 유지 · 사건의 진실과 관계를 함께 닫음',trust:-8,pressure:-12,affection:-7,trait:'sever'}
      ]
    },
    pact: {
      icon:'🧷', title:'한 번씩 헤어진 다섯 · 다섯 개의 알리바이',
      scene:'./assets/pixel-event-childhood-pact-v1.png',
      desc:'복구된 접속 기록에는 다섯 사람 모두에게 의심스러운 공백이 있습니다. 서로를 범인으로 몰면서도, 주인공이 다시 다른 사람과 사귀는 것만큼은 공동으로 견제합니다.',
      speakers:[
        ['예린','보라는 약부터 먹이고, 나영은 끌고 가잖아. 일정 묻는 내가 제일 정상이지.'],
        ['보라','사람 시간을 표로 만드는 애가 할 말은 아니야.'],
        ['서연','둘 다 현재 얼굴은 안 보네. 물론 미래는 아예 예전 버전으로 돌리려 하고.'],
        ['미래','서연의 앨범보다 내 백업이 객관적임. 나영은 물리적 강제 종료 담당.'],
        ['나영','말 많다. 적어도 난 숨어서 기록 안 해. 직접 잡아오지.']
      ],
      choices:[
        {id:'present',text:'과거를 증거가 아니라 서로를 이해하는 단서로만 쓰게 한다',preview:'오래된 약속 루트 강화 · 현재의 경계를 지킴',trust:16,pressure:-10,affection:9,trait:'present'},
        {id:'rewind',text:'다섯이 가진 기록을 합쳐 내 일상을 관리하게 한다',preview:'끝나지 않은 졸업식 루트 강화 · 다섯의 간섭이 촘촘해짐',trust:5,pressure:24,affection:14,trait:'rewind'},
        {id:'sever',text:'각자가 가진 기록을 전부 돌려달라고 한다',preview:'관계가 크게 멀어지고 세트 루트가 종료될 수 있음',trust:-14,pressure:-15,affection:-12,trait:'sever'}
      ]
    },
    motel_boundary: {
      icon:'🏨', title:'한 번씩 헤어진 다섯 · 방 하나와 여섯 개의 침묵',
      scene:'./assets/pixel-event-childhood-pact-v1.png',
      desc:'조작 사건의 원본 로그를 찾으러 지방 서버 보관소까지 내려온 여섯 사람은 막차를 놓쳤습니다. 남은 방은 하나뿐입니다. 다섯 사람은 이미 학창 시절 서로의 집, 술버릇, 이별 뒤의 추한 모습까지 전부 본 사이라 모텔에 들어가는 것 자체를 대수롭지 않게 여깁니다. 문제는 예전처럼 분위기에 떠밀려 관계까지 되돌릴 것인지입니다.',
      speakers:[
        ['예린','방 하나 잡자. 새삼스럽게 굴 사이도 아니잖아. 대신 오늘은 조사하러 온 거야.'],
        ['보라','우리끼리 모텔 갔다고 놀랄 사람도 없어. 다음 날 후회할 일만 안 만들면 돼.'],
        ['서연','사진도 기억도 이미 충분히 엉망이야. 오늘 장면까지 과거처럼 만들지는 말자.'],
        ['나영','도망갈 생각이면 지금 말해. 방에 들어간 다음 애매하게 구는 게 더 싫어.'],
        ['미래','로그 복호화 예상 여섯 시간. 침대 사용 권한은 추첨. 연애 권한은 잠금 상태.']
      ],
      choices:[
        {id:'stop',text:'방은 잡되 “오늘은 아무 일도 없다”고 먼저 선을 긋는다',preview:'주인공이 과거의 반복을 거부 · 신뢰와 현재의 경계 강화',trust:20,pressure:-18,affection:8,trait:'present',rivalMotive:true},
        {id:'lobby',text:'다섯 사람을 방에 들여보내고 자신은 로비에서 밤을 샌다',preview:'행동으로 경계를 증명 · 호감보다 신뢰를 선택',trust:16,pressure:-12,affection:3,trait:'present',rivalMotive:true},
        {id:'past',text:'예전에도 다 아는 사이였다며 분위기에 몸을 맡긴다',preview:'과거 관계 재현 · 집착과 회귀 압력 급증',trust:-5,pressure:28,affection:18,trait:'rewind'}
      ]
    },
    sera_collision: {
      icon:'🖤', title:'한 번씩 헤어진 다섯 · 주워 온 사람의 열쇠',
      scene:'./assets/event-sera-doorstep.png',
      desc:'윤세라가 주인공의 집 열쇠를 꺼내자 다섯은 놀라지 않았습니다. 예린은 열쇠 복사 날짜를, 보라는 세라가 머문 밤의 약 봉투를, 서연은 현관 사진을, 나영은 귀가 동선을, 미래는 도어록 기록을 이미 맞춰 본 뒤였습니다. 세라 한 사람의 집착보다 무서운 것은 다섯이 질투하는 순간 아무 말 없이 하나의 기록망이 된다는 사실입니다.',
      speakers:[
        ['윤세라','주워 왔다고 했죠? 버려진 사람을 데려왔으면 끝까지 책임지는 게 맞잖아요.'],
        ['예린','열쇠 받은 지 19일. 그런데 네 짐은 사흘째부터 늘었더라.'],
        ['보라','세라 씨가 챙긴 약은 틀렸어. 얘는 그 성분 먹으면 밤에 못 자.'],
        ['서연','현관 사진은 예쁘게 나왔네. 네가 없을 때 찍었다는 것만 빼면.'],
        ['나영','스토커 한 명 막는 건 쉬워. 문제는 얘가 우리보다 먼저 집에 있었다는 거야.'],
        ['미래','도어록 로그 공유 완료. 윤세라 계정은 손님이 아니라 경쟁 사용자로 분류.']
      ],
      choices:[
        {id:'separate',text:'세라의 열쇠와 다섯의 기록을 모두 회수한다',preview:'모두에게 같은 경계 적용 · 현재 신뢰 상승',trust:16,pressure:-12,affection:4,trait:'present'},
        {id:'key',text:'세라의 열쇠는 두고 다섯에게도 하나씩 준다',preview:'질투를 달래는 대신 여섯 명의 출입망 완성',trust:6,pressure:24,affection:15,trait:'rewind'},
        {id:'sera',text:'세라는 내가 데려온 사람이니 간섭하지 말라고 한다',preview:'윤세라를 감싸고 소꿉친구들의 질투 폭발',trust:-14,pressure:18,affection:-6,trait:'sever'}
      ]
    },
    graduation: {
      icon:'🎓', title:'한 번씩 헤어진 다섯 · 다시 열린 졸업식',
      scene:'./assets/pixel-event-childhood-graduation-v1.png',
      desc:'폐교를 앞둔 강당에 여섯 개 의자가 놓였습니다. 조작 사건의 진실과 다섯 번의 이별이 같은 날 다시 열립니다. 이번에는 누구도 도망친 채로 관계를 끝내지 않기로 합니다.',
      speakers:[
        ['서연','우리 중 누구 하나만 고르면 나머지 넷이 모를 거라고 생각해?'],
        ['예린','누굴 고르든 생활표에는 다섯 자리가 이미 있어.'],
        ['보라','망가지지만 않으면 자유롭게 둬. 망가지면 내가 데려가고.'],
        ['나영','싫으면 뛰어. 다섯 중 누구보다 멀리 갈 수 있으면 인정할게.'],
        ['미래','선택 버튼 생성 완료. 삭제 권한은 이번만 네 쪽에 있음.']
      ],
      choices:[
        {id:'present',text:'오래 알았다는 이유로 현재를 빼앗지 않는다고 약속한다',preview:'정상 세트 엔딩 ‘오래된 약속’ · 다섯과 합의형 관계 가능',trust:22,pressure:-18,affection:13,trait:'present',route:'old_promise'},
        {id:'rewind',text:'다섯이 기억하는 원래 자리로 돌아간다',preview:'위험 세트 엔딩 ‘끝나지 않은 졸업식’ · 다섯 전원 연인',trust:8,pressure:30,affection:18,trait:'rewind',route:'never_graduate'},
        {id:'sever',text:'오늘을 진짜 졸업식으로 만들고 혼자 나온다',preview:'단절 엔딩 ‘닫힌 졸업앨범’',trust:-22,pressure:-25,affection:-20,trait:'sever',route:'cut_past'}
      ]
    }
  };

  function ensure(life) {
    if (!life.childhoodCircle || typeof life.childhoodCircle !== 'object') {
      life.childhoodCircle = { anchor:null, schoolId:null, stage:'dormant', pressure:0, trust:0, seen:{}, traits:{}, route:null, pending:null };
    }
    const state = life.childhoodCircle;
    state.seen = state.seen || {};
    state.traits = state.traits || {};
    if (!Number.isFinite(state.pressure)) state.pressure = 0;
    if (!Number.isFinite(state.trust)) state.trust = 0;
    return state;
  }
  function register(life, person, schoolId) {
    const state = ensure(life);
    state.anchor = person.name;
    state.schoolId = schoolId;
    state.stage = 'former_club';
    state.pastIncident = 'mock_investment_account';
    person.childhoodFriend = true;
    person.formerClubEx = true;
    person.oldCircleRole = META[person.name] && META[person.name].role;
    return state;
  }
  function met(life, name) { return (life.met || []).find(person => person.name === name); }
  function activeCount(life) { return MEMBERS.filter(name => { const person=met(life,name); return person && ACTIVE.has(person.status); }).length; }
  function storyFor(person) { return person && person.childhoodFriend ? STORIES[person.name] || null : null; }
  function line(person, scene) {
    const rows = person && person.childhoodFriend && LINES[person.name] && LINES[person.name][scene];
    return rows && rows.length ? rows[Math.floor(Math.random() * rows.length)] : '';
  }
  function monthly(life) {
    const state = ensure(life);
    if (!state.anchor || state.pending || ['complete','fractured'].includes(state.stage) || state.route === 'cut_past') return state.pending;
    const anchor = met(life, state.anchor);
    if (!anchor) return null;
    let event = null;
    if (!state.seen.reunion && (anchor.affection || 0) >= 32) event = 'reunion';
    else if (!state.seen.pact && state.seen.reunion && activeCount(life) >= 5) event = 'pact';
    else if (!state.seen.motel_boundary && state.seen.pact && activeCount(life) >= 5) event = 'motel_boundary';
    else if (!state.seen.sera_collision && state.seen.motel_boundary && (function(){
      const sera=met(life,'윤세라');
      return !!sera&&!['ex','deceased'].includes(sera.status);
    })()) event = 'sera_collision';
    else if (!state.seen.graduation && state.seen.motel_boundary
      && (!(function(){const sera=met(life,'윤세라');return !!sera&&!['ex','deceased'].includes(sera.status);} )() || state.seen.sera_collision)
      && !(life.met || []).some(person => !MEMBERS.includes(person.name) && ['partner','lover','polycule'].includes(person.status))
      && MEMBERS.every(name => {
      const person=met(life,name);
      return person && (person.affection || 0) >= 48 && (person.trust || 0) >= 35;
    })) event = 'graduation';
    if (event && Math.random() < .55) state.pending = event;
    return state.pending;
  }
  function event(id) { return EVENTS[id] || null; }
  function resolve(life, id, choice) {
    const state = ensure(life);
    state.pressure = Math.max(0, Math.min(100, state.pressure + Number(choice.pressure || 0)));
    state.trust = Math.max(0, Math.min(100, state.trust + Number(choice.trust || 0)));
    if (choice.trait) state.traits[choice.trait] = (state.traits[choice.trait] || 0) + 1;
    state.seen[id] = true;
    state.pending = null;
    if (id === 'reunion') state.stage = choice.id === 'sever' ? 'dormant' : 'reunited';
    if (id === 'pact') {
      state.stage = choice.id === 'sever' ? 'fractured' : 'pact';
      if (choice.id === 'sever') state.route = 'cut_past';
    }
    if (id === 'motel_boundary') state.stage = choice.id === 'past' ? 'relapse' : 'boundary';
    if (id === 'graduation') {
      state.route = choice.route || (state.pressure >= 60 ? 'never_graduate' : 'old_promise');
      state.stage = 'complete';
    }
    return state;
  }

  root.QT_CHILDHOOD_CIRCLE = {
    MEMBERS, META, STORIES, LINES, EVENTS,
    ensure, register, storyFor, line, monthly, event, resolve, activeCount
  };
})(window);
