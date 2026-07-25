/* QuickTrade Life — 소꿉친구 5인조 ‘실패한 첫 하렘’
 * 생활경제연구회 여섯 명은 서로 알고 동의한 채 연애했지만, 다섯은 각자 자신이
 * 마지막에 선택될 사람이라 믿었다. 졸업 직전 ‘보호 계획’이라는 이름으로
 * 일정·약·평판·동선·계정을 나눠 통제했고, 주인공은 모든 것을 잃고 도망쳤다.
 * 현재 루트의 질문은 용서가 아니라 다섯이 자기 잘못을 인정하고 선택권을 돌려주는가다.
 */
(function (root) {
  'use strict';

  const MEMBERS = ['예린', '보라', '서연', '나영', '미래'];
  const ACTIVE = new Set(['friend', 'casual', 'partner', 'lover', 'polycule']);
  const META = {
    예린: { role:'회장·생활 통제', icon:'🗓️', danger:'주인공의 동의 없이 면접과 가족 약속을 취소하고 대신 답장했다.' },
    보라: { role:'회계·신체 통제', icon:'💊', danger:'돌봄을 명분으로 식사·수면·약을 관리해 떠날 힘까지 빼앗았다.' },
    서연: { role:'홍보·평판 통제', icon:'📷', danger:'사진을 잘라 붙이고 공개해 주인공이 자발적으로 남은 것처럼 여론을 만들었다.' },
    나영: { role:'대외협력·동선 통제', icon:'🏃‍♀️', danger:'출구를 막고 기차표와 가방을 빼앗아 졸업식까지 붙들었다.' },
    미래: { role:'전산·연락 통제', icon:'💾', danger:'휴대전화와 계정을 복제해 연락과 투자 주문을 다섯이 함께 관리하게 했다.' },
  };
  const C = (id, text, preview, affection, trust, pressure, tone, reaction, effects, trait) => ({
    id, text, preview, affection, trust, obsession:pressure, pressure, tone, reaction,
    effects:effects || {}, trait
  });

  const STORIES = {
    예린: [
      { title:'지워지지 않은 생활표', desc:'첫 연인이었던 예린은 동아리를 만들던 중학교 시절, 둘이 처음 사귄 날부터 주인공이 약속을 어기며 헤어진 날까지 적힌 생활표를 아직 보관하고 있습니다. 이제 그 빈칸에 지금의 출퇴근과 수면 시간을 채워 넣었습니다.', speaker:'예전엔 네가 늦으면 내가 먼저 알았잖아. 지금도 그래도 되는지, 이번에는 물어볼게.', choices:[
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
      { title:'약봉지에 적힌 옛 별명', desc:'두 번째 연인이었던 보라는 시험 기간마다 양호실에서 주인공을 돌봤습니다. 돌봄을 사랑이 아니라 습관이라고 밀어냈던 이별날의 약봉지와 알레르기 기록까지 그대로 남아 있습니다.', speaker:'넌 아프면 괜찮다고 세 번 말하고 네 번째에 쓰러졌어. 지금도 그러는지 확인해도 돼?', choices:[
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
      { title:'앨범에서 자란 얼굴', desc:'세 번째 연인이었던 서연의 작업실에는 여름 전시를 함께 준비하며 가까워진 날부터, 이별하며 둘이 찢어 나눠 가진 사진까지 날짜별로 정리돼 있습니다. 주인공이 버렸다고 믿은 절반도 원본과 함께 남아 있습니다.', speaker:'사람들은 지금 네 얼굴만 알지. 나는 네가 되기 전부터 봤어. 그게 조금 자랑스러워.', choices:[
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
      { title:'도망치던 이동선', desc:'네 번째 연인이었던 나영은 주인공이 대회에서 진 뒤 함께 숨었던 운동장 벤치와, 이별을 말하고 도망친 마지막 이동선까지 기억합니다. 연락이 끊긴 오늘도 대답을 기다리지 않고 그곳에 먼저 와 있습니다.', speaker:'여기일 줄 알았어. 옛날에도 끝까지 달리면 결국 이 벤치였잖아. 이번엔 잡아도 돼?', choices:[
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
      { title:'삭제되지 않은 채팅방', desc:'마지막 연인이었던 미래의 개인 서버에는 밤새 대회 서버를 복구하며 사귀기 시작한 대화와, 주인공이 메시지 하나로 관계를 끝낸 날의 삭제 기록까지 백업되어 있습니다.', speaker:'삭제 요청은 받았는데 실행은 안 했어. 그때 네가 나중에 필요할 거라고 했거든. 지금도 필요해?', choices:[
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

  const STORY_RETCON = {
    예린:[
      ['취소된 면접의 생활표','예린은 졸업 전날 주인공의 외부 인턴 면접을 취소하고 생활표에 ‘동아리 잔류’라고 적었습니다. 모두를 위한 일정 조정이었다는 말은, 정작 당사자에게 한 번도 묻지 않았다는 사실 앞에서 무너집니다.','네가 떠나면 여섯이 끝날까 봐 무서웠어. 그래서 네 대답을 듣기 전에 없애 버렸어.'],
      ['가족에게 보낸 대리 답장','가족은 주인공이 스스로 진로를 포기한 줄 알았습니다. 예린이 주인공의 휴대전화로 괜찮다는 답장을 보냈고, 나머지 넷은 그것을 알고도 침묵했습니다.','널 지키려 했다는 말로 네 가족까지 속였어. 이번엔 변명하지 않을게.'],
      ['허락받는 달력','예린이 빈 공동 달력을 내밉니다. 일정 공유와 일정 소유는 다르다는 것을 인정하고, 관리자 권한을 주인공에게 돌려줄 차례입니다.','네 시간을 잘 아는 게 네 시간을 가질 권리는 아니었어. 이제 네가 초대할 때만 들어갈게.']
    ],
    보라:[
      ['잠들게 한 감기약','보라는 주인공이 야간 버스를 타지 못하도록 졸음을 유발하는 감기약을 건넸습니다. 위험하지 않은 양이었다는 해명은, 목적을 숨겼다는 잘못을 지우지 못합니다.','아프지 않게 하려던 게 아니야. 그날만 못 떠나게 하려던 거였어. 내가 잘못했어.'],
      ['보호자 서명의 주인','동아리 장부 뒤에서 주인공 대신 작성된 진료·결석 서류가 발견됩니다. 보라는 가장 잘 돌보는 사람이 대신 정해도 된다고 믿었습니다.','네 상태를 안다는 이유로 네 서명까지 내 것으로 만들었어. 돌봄이 아니라 통제였어.'],
      ['돌봄이 아니었던 것','보라는 약 봉투와 생활 기록 원본을 돌려줍니다. 다시 곁에 설 수 있다면 치료자가 아니라, 거절을 들을 줄 아는 친구로 남겠다고 합니다.','이번에는 네가 싫다고 하면 멈출게. 쓰러질 것 같아도 먼저 묻고 기다릴게.']
    ],
    서연:[
      ['잘라 붙인 단체사진','서연은 다섯의 불안을 잠재우려고 서로 다른 날의 사진을 한 장처럼 편집했습니다. 그 사진은 주인공이 모든 계획에 동의했다는 거짓 증거가 됐습니다.','예쁘게 만들면 진실도 따라올 줄 알았어. 결국 네 표정부터 잘라 냈더라.'],
      ['전시된 알리바이','서연이 공개한 졸업 전시는 주인공을 행복한 중심 인물로 보이게 했습니다. 학교와 가족은 그 이미지 때문에 구조 요청을 장난으로 여겼습니다.','사람들이 내 사진을 믿게 만든 건 나야. 네가 아니라고 말할 자리까지 내가 없앴어.'],
      ['원본을 돌려주는 날','서연은 보정하지 않은 사진과 원본 파일을 내밉니다. 무엇을 남기고 지울지는 찍은 사람이 아니라 찍힌 사람이 정해야 한다고 인정합니다.','이번 전시는 네가 고르는 것만 걸게. 아무것도 고르지 않아도 그게 네 대답이야.']
    ],
    나영:[
      ['찢어진 기차표','졸업식 날 나영은 주인공의 가방을 빼앗고 기차표를 찢었습니다. 붙잡으면 대화할 수 있을 거라 믿었지만, 그 순간 주인공에게 남은 선택은 도망뿐이었습니다.','그때 널 잡은 게 아니라 출구를 막았어. 내가 졌다는 말로 네 공포를 경기처럼 만들었고.'],
      ['출구 앞의 주장 완장','나영은 다섯이 대화할 시간을 번다며 동아리방과 강당의 문을 지켰습니다. 다른 넷은 그 물리적인 벽 뒤에서 보호 계획을 완성했습니다.','다들 작은 부탁 하나씩이라고 했어. 합치면 감금이 된다는 걸 나만 몰랐다고는 안 할게.'],
      ['잡지 않는 계주','나영은 결승선에서 기다리되 더는 뒤쫓지 않겠다고 합니다. 돌아오는 선택까지 빼앗는 보호는 사랑이 아니라는 것을 이제야 배웠습니다.','이번엔 뛰어가도 안 잡아. 돌아오면 네가 고른 속도로 같이 걷자.']
    ],
    미래:[
      ['복제된 휴대전화','미래는 분실 대비라는 명목으로 주인공의 휴대전화와 메신저를 복제했습니다. 다섯은 떠나겠다는 연락을 먼저 읽고 지웠고, 답장까지 역할별로 나눴습니다.','백업이라고 부르면 침입이 아닌 줄 알았어. 네 침묵까지 우리가 만들어 놓고 널 탓했어.'],
      ['다섯 개의 관리자 권한','모의투자 계정에는 다섯 개의 관리자 권한이 남아 있습니다. 각자는 주문 하나만 고쳤지만, 합쳐진 거래는 손실과 조작 의혹을 만들었고 외부 세력이 그 틈을 이용했습니다.','외부 세력이 마지막 주문을 넣었어도 문을 만든 건 우리야. 범인을 밖에서만 찾을 수는 없어.'],
      ['복구하지 않을 세이브','미래가 단체방·계정·위치 기록의 최고 관리자 권한을 주인공에게 넘깁니다. 가장 완벽한 복구는 과거 상태로 되돌리는 것이 아닐 수 있습니다.','복구 버튼은 안 누를게. 이번 버전은 네가 허락한 데이터만 남기는 걸로 시작하자.']
    ]
  };
  Object.entries(STORY_RETCON).forEach(([name,chapters])=>chapters.forEach((copy,index)=>{
    if(!STORIES[name]||!STORIES[name][index]) return;
    STORIES[name][index].title=copy[0];
    STORIES[name][index].desc=copy[1];
    STORIES[name][index].speaker=copy[2];
  }));

  const LINES = {
    예린: {
      first:['우리 여섯이 연애였다는 건 다 알고 있었어. 네 면접을 취소한 것까지 합의였다고 우기진 않을게.'],
      incoming:['오늘도 아침 거른 거 아니지? 네 시간표상 지금 답장할 수 있어.','부모님께 연락 왔어. 이번에는 네가 먼저 설명할래, 내가 할까?'],
      warm:['오래 안다고 지금의 너까지 안다고 착각하지 않을게. 오늘 일부터 들려줘.'],
      brief:['응, 네가 늦게 답하는 시간까지 기억해. 급한 건 아니야.'],
      boundary:['알겠어. 예전 규칙을 지금 허락으로 착각하지 않을게.']
    },
    보라: {
      first:['돌본다는 핑계로 네가 떠날 힘까지 빼앗았어. 사과부터 하고 다시 물어볼게.'],
      incoming:['식사는 했어? 사진 보내라는 말은 안 할게. 네 입으로 대답해.','그때 알레르기 아직 있어? 약부터 보내기 전에 물어보는 거야.'],
      warm:['네가 괜찮다고 말하면 일단 믿을게. 대신 정말 힘들면 나부터 불러.'],
      brief:['확인했어. 물 마시고 자. 잔소리는 여기까지.'],
      boundary:['걱정과 결정은 다르지. 네 몸의 결정은 네가 해.']
    },
    서연: {
      first:['네가 자발적으로 남은 것처럼 만든 사진 원본이 있어. 변명 말고 내가 먼저 보여줄게.'],
      incoming:['옛날 사진 정리하다가 네가 찢어달라던 걸 찾았어. 이번엔 먼저 물어볼게.','오늘 네 얼굴이 궁금해. 사진 말고 만나서 보고 싶다는 뜻이야.'],
      warm:['예전의 너도 좋아했지만, 지금의 널 새로 알아가는 쪽이 더 설레.'],
      brief:['응. 말 길어지기 전에 오늘 표정만 기억해둘게.'],
      boundary:['사진을 가진 것과 네 모습을 정할 권리는 다른 거 알아.']
    },
    나영: {
      first:['졸업식에서 네가 도망친 게 아니라 우리가 도망치게 만든 거야. 이번에는 출구부터 열어 둘게.'],
      incoming:['끝나고 운동장 한 바퀴. 안 나오면 네가 숨던 벤치부터 간다.','오늘 연락 짧네. 괜찮으면 괜찮다고, 아니면 위치만 보내.'],
      warm:['이번엔 네가 달리는 방향을 내가 정하진 않을게. 옆에서 뛸 수는 있지?'],
      brief:['오케이. 살아 있는 거 확인. 나머지는 만나서.'],
      boundary:['알았어. 찾으러 가기 전에 부를 때까지 기다릴게.']
    },
    미래: {
      first:['대회 계정 로그 복구했어. 외부 세력보다 먼저 네 권한을 나눠 가진 다섯 명 기록도 같이.'],
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
        {id:'sever',text:'이미 끝난 연애라며 단체방을 다시 나간다',preview:'다섯 전원 영구 이탈 · 연락처·만남·개인 및 세트 사건 제거',trust:-8,pressure:-12,affection:-7,trait:'sever'}
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

  Object.assign(EVENTS.reunion,{
    title:'실패한 첫 하렘 · 복구된 동아리방',
    desc:'폐쇄됐던 생활경제연구회 단체방이 복구됐습니다. 여섯은 서로 알고 동의한 채 연애했지만, 다섯은 각자 자신이 마지막에 선택될 사람이라 믿었습니다. 주인공이 관계를 숨기거나 순서를 속인 적은 없습니다. 끝을 만든 것은 졸업 직전 다섯이 함께 실행한 ‘보호 계획’이었습니다.',
    speakers:[
      ['예린','우린 전부 알고 시작했어. 네가 속인 게 아니라, 끝내겠다는 네 말을 우리가 합의에서 빼 버렸지.'],
      ['보라','한 사람씩 한 건 사소하다고 생각했어. 약, 일정, 사진, 출구, 계정이 합쳐지기 전까진.'],
      ['서연','네가 행복해 보이는 사진만 남겨서 아무도 구조 요청을 믿지 않게 만든 건 나야.'],
      ['나영','졸업식에서 넌 도망친 게 맞아. 하지만 도망쳐야 했던 이유는 우리였어.'],
      ['미래','보호 계획 원본 복구 완료. 피해자 권한은 네 것, 관리자 권한은 우리 다섯 것이었음.']
    ],
    choices:[
      {id:'present',text:'내 사과보다 다섯이 한 일을 먼저 전부 말하게 한다',preview:'책임 인정 시작 · 현재의 신뢰를 다시 쌓음',trust:14,pressure:-10,affection:7,trait:'present'},
      {id:'rewind',text:'그래도 가장 행복했던 때는 여섯이 함께였다고 한다',preview:'잘못을 덮고 익숙한 공동 연애로 회귀',trust:2,pressure:20,affection:14,trait:'rewind'},
      {id:'sever',text:'사과를 듣지 않고 단체방을 다시 나간다',preview:'다섯 전원 영구 이탈 · 모든 후속 사건 제거',trust:-8,pressure:-12,affection:-7,trait:'sever'}
    ]
  });
  Object.assign(EVENTS.pact,{
    title:'실패한 첫 하렘 · 보호 계획서',
    desc:'복구된 문서에는 다섯의 역할이 적혀 있습니다. 예린은 일정을, 보라는 몸을, 서연은 평판을, 나영은 출구를, 미래는 연락과 계정을 맡았습니다. 외부 세력이 투자 주문을 악용했지만, 침입할 문과 공동 권한을 만든 것은 다섯이었습니다.',
    speakers:[
      ['예린','면접만 취소하면 대화할 시간이 생길 줄 알았어. 가족에게 네 대신 답장한 것도 내 선택이야.'],
      ['보라','약은 위험한 양이 아니었다는 말로 빠져나가지 않을게. 목적을 숨긴 순간 돌봄이 아니었어.'],
      ['서연','사진으로 학교와 가족의 눈을 가렸어. 네 말을 거짓말처럼 만든 사람은 나야.'],
      ['나영','문을 지킨 건 나야. 나머지 계획을 몰랐어도 네가 나갈 수 없게 만든 책임은 남아.'],
      ['미래','외부 세력이 마지막 주문을 넣었음. 하지만 계정을 복제하고 권한을 나눈 최초 원인은 우리.']
    ],
    choices:[
      {id:'present',text:'증거를 모두 돌려받고 각자 책임을 자기 이름으로 남기게 한다',preview:'공동 변명 해체 · 선택권과 책임 회복',trust:18,pressure:-14,affection:8,trait:'present'},
      {id:'rewind',text:'보호 계획을 더 안전한 방식으로 다시 운영하게 한다',preview:'이름만 바뀐 공동 통제 · 회귀 압력 급증',trust:4,pressure:26,affection:15,trait:'rewind'},
      {id:'sever',text:'원본을 넘겨받고 다섯과의 관계를 끝낸다',preview:'증거 확보 · 세트 루트 단절',trust:-14,pressure:-15,affection:-12,trait:'sever'}
    ]
  });
  Object.assign(EVENTS.motel_boundary,{
    title:'실패한 첫 하렘 · 방 하나와 여섯 개의 책임',
    desc:'외부 세력이 악용한 주문 원본을 찾으러 지방 서버 보관소까지 내려온 여섯은 막차를 놓쳤습니다. 학창 시절 이미 서로의 관계를 모두 알았기에 방 하나는 낯설지 않습니다. 그러나 편안함을 합의로 착각했던 과거를 반복하지 않으려면, 이번에는 주인공의 거절이 설명 없이도 끝이어야 합니다.'
  });
  Object.assign(EVENTS.sera_collision,{
    title:'실패한 첫 하렘 · 차라리 솔직한 스토커',
    desc:'윤세라의 열쇠를 발견한 다섯은 그녀를 비난하려다 멈춥니다. 한 사람의 노골적인 집착과 달리, 다섯은 일정·약·가족·평판·출구·계정을 역할처럼 나눠 주인공의 삶 전체를 감췄습니다. 비교가 성립하는 순간 윤세라조차 정직하고 단순한 사람처럼 보입니다.',
    speakers:[
      ['윤세라','적어도 전 혼자 했고, 이 사람 계좌·약·가족·진로를 나눠 가진 적은 없어요. 싫다고 하면 왜 싫은지 직접 물었고요.'],
      ['예린','스토커에게 상식 지적을 들을 줄은 몰랐네. 그런데 반박할 말이 없어.'],
      ['보라','세라 씨 약이 틀렸다는 말부터 하려 했는데… 몰래 먹인 내가 할 말은 아니지.'],
      ['서연','한 명의 광기는 사진에 잡혀. 다섯 명의 선의는 정상적인 일상처럼 보여서 더 숨기기 쉬웠고.'],
      ['나영','쟤보다 우리가 무섭다는 표정 지어도 돼. 이번엔 안 막을게.'],
      ['미래','비교 결과: 윤세라의 침입은 단일 사용자. 우리 사건은 분산형 관리자 탈취. 후자가 더 악질.']
    ]
  });
  Object.assign(EVENTS.graduation,{
    title:'실패한 첫 하렘 · 두 번째 졸업식',
    desc:'폐교를 앞둔 강당에 여섯 개 의자가 놓였습니다. 다섯은 각자의 잘못을 자기 이름으로 인정했고, 주인공은 관계가 망가지기 전 맞서지 못하고 도망만 준비했던 책임까지만 인정합니다. 사랑했던 사실은 통제에 대한 동의가 아니었습니다.',
    speakers:[
      ['서연','우리가 널 사랑했다는 건 사실이야. 그래서 용서받는다는 결론은 이제 사진에서 잘라 낼게.'],
      ['예린','다섯 자리를 먼저 그리지 않을게. 네가 빈 의자를 둘 때만 앉을 거야.'],
      ['보라','망가질까 봐 선택권을 뺏는 대신, 망가져도 네가 부를 때까지 기다릴게.'],
      ['나영','싫으면 뛰라는 말도 협박이었어. 싫다는 한마디면 경기는 끝이야.'],
      ['미래','관리자 권한 전부 반환. 다음 관계는 자동 복구가 아니라 여섯 명의 신규 동의로 생성.']
    ],
    choices:[
      {id:'present',text:'과거가 아닌 오늘의 동의로 여섯의 첫날을 시작한다',preview:'정상 세트 엔딩 ‘처음이 아닌 첫날’ · 책임을 인정한 합의형 관계',trust:24,pressure:-22,affection:13,trait:'present',route:'old_promise'},
      {id:'rewind',text:'잘못까지 사랑의 일부였다며 원래 자리로 돌아간다',preview:'위험 세트 엔딩 ‘끝나지 않은 졸업식’ · 보호 계획 재가동',trust:6,pressure:34,affection:19,trait:'rewind',route:'never_graduate'},
      {id:'sever',text:'사과를 받은 뒤 혼자 강당을 나선다',preview:'단절 엔딩 ‘닫힌 졸업앨범’ · 피해자의 졸업',trust:-18,pressure:-28,affection:-18,trait:'sever',route:'cut_past'}
    ]
  });

  function ensure(life) {
    if (!life.childhoodCircle || typeof life.childhoodCircle !== 'object') {
      life.childhoodCircle = { anchor:null, schoolId:null, stage:'dormant', pressure:0, trust:0, accountability:0, refusals:0, pastStructure:'failed_shared_harem', collectiveFault:'protective_plan', playerFault:'conflict_avoidance', seen:{}, traits:{}, route:null, pending:null };
    }
    const state = life.childhoodCircle;
    state.seen = state.seen || {};
    state.traits = state.traits || {};
    if (!Number.isFinite(state.pressure)) state.pressure = 0;
    if (!Number.isFinite(state.trust)) state.trust = 0;
    if (!Number.isFinite(state.accountability)) state.accountability = 0;
    if (!Number.isFinite(state.refusals)) state.refusals = 0;
    state.pastStructure = 'failed_shared_harem';
    state.collectiveFault = 'protective_plan';
    state.playerFault = 'conflict_avoidance';
    return state;
  }
  function register(life, person, schoolId) {
    const state = ensure(life);
    state.anchor = person.name;
    state.schoolId = schoolId;
    state.stage = 'former_club';
    state.pastIncident = 'mock_investment_account';
    state.pastStructure = 'failed_shared_harem';
    state.collectiveFault = 'protective_plan';
    state.playerFault = 'conflict_avoidance';
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
    if (!state.anchor || state.removed || state.pending || ['complete','fractured','removed'].includes(state.stage) || state.route === 'cut_past') return state.pending;
    const routeGuard=root.QT_ROMANCE_ROUTES&&root.QT_ROMANCE_ROUTES.canStart(life,'childhood');
    if(!state.seen.reunion&&routeGuard&&!routeGuard.ok)return null;
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
      && !(life.met || []).some(person => {
        if(MEMBERS.includes(person.name)||!['partner','lover','polycule'].includes(person.status))return false;
        if(!root.QT_ROMANCE_ROUTES)return true;
        const groupId=root.QT_ROMANCE_ROUTES.memberGroup(person.name),routes=root.QT_ROMANCE_ROUTES.ensure(life);
        return !groupId||!routes.completed[groupId];
      })
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
    if (choice.trait === 'present') state.accountability = Math.min(100, state.accountability + 12);
    if (choice.trait === 'rewind') state.accountability = Math.max(0, state.accountability - 7);
    if (choice.trait === 'sever') state.refusals += 1;
    if (choice.trait) state.traits[choice.trait] = (state.traits[choice.trait] || 0) + 1;
    state.seen[id] = true;
    state.pending = null;
    if (id === 'reunion') {
      state.stage = choice.id === 'sever' ? 'removed' : 'reunited';
      if(choice.id === 'sever'){ state.removed=true; state.route='cut_past'; }
      if(root.QT_ROMANCE_ROUTES){
        if(choice.id==='sever')root.QT_ROMANCE_ROUTES.complete(life,'childhood','cut_past','bad');
        else root.QT_ROMANCE_ROUTES.begin(life,'childhood');
      }
    }
    if (id === 'pact') {
      state.stage = choice.id === 'sever' ? 'fractured' : 'pact';
      if (choice.id === 'sever') state.route = 'cut_past';
    }
    if (id === 'motel_boundary') state.stage = choice.id === 'past' ? 'relapse' : 'boundary';
    if (id === 'graduation') {
      state.route = choice.route || (state.pressure >= 60 ? 'never_graduate' : 'old_promise');
      state.stage = 'complete';
      if(root.QT_ROMANCE_ROUTES)root.QT_ROMANCE_ROUTES.complete(life,'childhood',state.route,state.route==='never_graduate'?'bad':'good');
    }
    return state;
  }

  root.QT_CHILDHOOD_CIRCLE = {
    MEMBERS, META, STORIES, LINES, EVENTS,
    ensure, register, storyFor, line, monthly, event, resolve, activeCount
  };
})(window);
