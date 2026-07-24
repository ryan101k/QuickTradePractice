# QuickTrade Life 프로젝트 기준 문서

> 기준 코드: `ec64a4c` · 문서 작성일: 2026-07-24  
> 이 문서는 코드를 매번 처음부터 다시 훑지 않기 위한 **구조 지도이자 작업 인계서**다.

## 1. 이 문서를 사용하는 규칙

1. 새 작업을 시작할 때 `README.md`보다 이 문서를 먼저 읽는다.
2. 아래의 **수정 위치 빠른 찾기**에서 관련 파일을 찾고, 그 파일과 직접 연결된 모듈만 먼저 읽는다.
3. 실제 동작의 최종 기준은 코드다. 코드와 이 문서가 다르면 코드를 따른 뒤, 같은 작업에서 이 문서도 갱신한다.
4. 새 모듈을 추가하면 `index.html`의 로딩 순서, `app.js`의 허브 연결, 저장 데이터, 테스트 영향을 함께 확인한다.
5. 캐릭터를 수정할 때는 캐릭터 원본만 보지 말고 대사·개별 스토리·개성 수치·교차 이벤트·이미지까지 함께 확인한다.

## 2. 한눈에 보는 실행 구조

이 프로젝트는 React/Vue 번들 프로젝트가 아니라, 브라우저 전역 객체를 모듈 경계로 사용하는 바닐라 JavaScript 앱이다.

```text
index.html
  ├─ 데이터 원본
  │    jobs / characters / companies / events_*
  ├─ 기능 모듈
  │    QT_TRADING / QT_TIME / QT_RELATIONSHIPS / QT_BUSINESS / ...
  ├─ 통합 데이터 허브
  │    window.QT_DATA
  └─ 화면·게임 진행 허브
       js/app.js
         ├─ 전역 게임 상태 S
         ├─ 월간 인생 상태 S.life
         ├─ 모듈 호출과 이벤트 큐
         ├─ DOM 렌더링
         └─ 입력·저장·부팅 연결
```

핵심 원칙은 다음과 같다.

- `app.js`는 모든 규칙을 소유하는 파일이 아니라 **상태와 모듈을 이어 주는 공유 허브**다.
- 계산과 독립 규칙은 `js/core`, `js/services`, 기능별 파일에 둔다.
- `jobs.js`, `characters.js`, `events_*.js`처럼 전역 상수를 선언하는 파일은 `data.js`보다 먼저 로드한다.
- `data.js`가 흩어진 정적 데이터를 `window.QT_DATA`로 묶는다.
- 각 기능 모듈은 `window.QT_*`로 공개되고 `app.js`가 이를 참조한다.
- 현재 `js/index.js`는 `index.html`에서 로드하지 않는다. 현행 런타임을 수정할 때 이 파일을 진입점으로 착각하지 않는다.

## 3. 실제 스크립트 로딩 순서

전역 객체 방식이라 순서가 의존성이다. `index.html`의 현재 순서는 아래와 같다.

```text
jobs.js
characters.js
character_voices.js
character_dialogue.js
chat_lines.js
voice.js
Tone.js 15.1.22 (CDN)
sam-js 0.3.1 (CDN)
bgm.js
events_life.js
romance_events.js
character_stories.js
character_traits.js
character_cross_events.js
dangerous_trio.js
freedom_trio.js
origin_story.js
career_events.js
companies.js
company_reports.js
events_market.js
data.js
portfolio.js
core/trading.js
core/time.js
core/campaign.js
relationship_group.js
services/save.js
loan.js
rivals.js
faction_campaign.js
campaign_endings.js
experts.js
health.js
family.js
child_events.js
social_network.js
justice.js
legacy.js
aptitude.js
career.js
economy.js
business.js
business_romance.js
housing.js
life_finance.js
ui/page-lifecycle.js
ui/news-anchor.js
ui/market-workspace.js
ui/info-market-panel.js
ui/month-close-flow.js
ui/views/month-close-summary-view.js
ui/views/life-status-view.js
ui/views/relationship-monthly-view.js
ui/views/family-monthly-view.js
ui/views/career-business-view.js
ui/views/life-action-view.js
ui/views/major-event-view.js
ui/views/return-market-view.js
app.js
```

새 파일이 다른 `QT_*` 객체를 읽는다면 반드시 그 객체를 만드는 파일보다 뒤에 놓는다. `app.js`는 항상 기능 모듈 뒤에 둔다.

## 4. `app.js`의 책임

`app.js`는 약 7천 줄 규모의 조립 허브다. 현재 맡고 있는 책임은 다음과 같다.

| 대략적 구간 | 책임 |
|---|---|
| 1–218 | 모듈 연결, 설정값, 시장 상태 `S`, 새 인생 상태 생성 |
| 219–496 | 종목·AI 생성, 이슈 배정, 틱별 가격 변화 |
| 497–824 | 배당·상폐·신규상장·마진콜·속보·장중 도움·자동 정지 |
| 825–1095 | 개장·마감·진행률·장 마감 보고 |
| 1101–1623 | 월간 인생 결산, 시작 배경·학교생활·첫 직업 구성 |
| 1624–1960 | 게임 오버, 튜토리얼, 사망·세대 계승 |
| 1960–2576 | 이벤트 큐, 월간 메시지, 교차/세트/생활 이벤트, 장후 행동 |
| 2577–3408 | 인물 기억, 조우, 외출, 부탁, 스토리, 채팅, 월간 관계 처리 |
| 3409–4493 | 관계 UI, 데이트, 연애, 결혼, 다자 관계, 두 3인 세트 |
| 4494–5045 | 주거·수익 자산·사업·대출·라이벌·세력전·공동 거래 |
| 5046–5402 | 월간 행동 제한, 윤세라 개입, 인생 패널·허브 |
| 5403–5827 | AI 라이벌·습격, 포트폴리오, 주문 처리 |
| 5828–6479 | 기업 정보·뉴스·차트 등 화면 렌더링 |
| 6480–6623 | 알림음, BGM, TTS, 업적 |
| 6624–6963 | 저장·불러오기·결과 공유, 컨트롤 연결, 부팅 |

### `app.js`에 남겨도 되는 것

- 여러 기능을 한 순서로 호출하는 오케스트레이션
- DOM 조회, 모달, 토스트, 탭 전환, 차트 갱신
- 장중/장후 이벤트 큐의 실행 순서
- 모듈 결과를 `S`와 `S.life`에 반영하는 얇은 접착 코드

### 별도 모듈로 빼야 하는 것

- DOM 없이 입력값만으로 결과를 낼 수 있는 계산
- 특정 기능의 규칙표, 밸런스 상수, 월간 정산 공식
- 캐릭터별 대사·스토리·조우 조건·수치 변화
- 저장 마이그레이션과 호환성 규칙
- 재사용되는 시장·관계·세력 판정

## 5. 중심 상태

### 시장 상태 `S`

`app.js` 상단에서 만들며 다음 범주를 가진다.

- 자금과 거래: `capital`, `owned`, `loan`, `leverage`, `realizedPnL`, `trades`
- 종목과 선택: `stocks`, `selected`, `watchlist`, `chartMode`
- 장 진행: `phase`, `day`, `tick`, `sessionTick`, `paused`, `speed`
- 월말 진행: `dayStartNW`, `dayStartCapital`, `dayStartRealizedPnL`, `monthCloseContext`
- 주문: `pendingOrders`, `limitOrders`
- 뉴스: `news`, `sessionNews`, `companyNews`, `breaking`, `marketEvent`
- 안전장치: `circuitBreakerTicks`, `circuitBreakerTriggered`, `marginCalled`
- AI와 인생: `bots`, `life`, `economy`
- 오디오: `soundOn`, `bgmOn`, `ttsOn`

### 인생 상태 `S.life`

`newLife()`가 기본 구조를 만든다.

- 시작 배경: `familyBackground`, `schoolLife`, `firstCareerPool`
- 직업과 성장: `job`, `career`, 적성·자격증 관련 하위 상태
- 감정과 건강: `happy`, `charm`, `health`, `stress`, `fitness`, `conditions`
- 관계: `relationship`, `partner`, `relationshipGroup`, `lovers`, `polycule`, `met`
- 캐릭터 세트: `dangerousTrio`, `freedomTrio`
- 연락: `chats`
- 생활 경제: `properties`, `passiveAssets`, `loans`, `housing`, `finance`, `business`
- 가족과 계승: `children`, `familyPlan`, `parentAge`, `parentHealth`, `familyBond`, `generation`
- 세력과 사회: `faction`, `social`, `justice`, `legacy`
- 이벤트 기억: `memories`, `crossEvents`, `seraLoop`, `monthActions`

`relationship`, `partner`, `polycule`은 구버전 호환용 표현도 겸한다. 새 관계 로직은 `relationshipGroup`을 우선하고 `QT_RELATIONSHIPS`를 통해 동기화한다.

## 6. 기능별 지도

### 6.1 주식·시장

| 영역 | 주 파일 | 공개 API/역할 |
|---|---|---|
| 종목·섹터 원본 | `companies.js` | 회사, 섹터, ETF 데이터 |
| 시장 이벤트 | `events_market.js` | 회사·섹터·시장 이슈 데이터 |
| 통합 데이터 | `data.js` | `QT_DATA`로 정적 데이터 병합 |
| 주문 계산 | `core/trading.js` | `executeBuy`, `executeSell`, `executeLimit` |
| 평가 계산 | `portfolio.js` | 현재가, 포지션 가치, 순자산, 매수/공매도 가능액, 증거금 |
| 틱·장 운영 | `app.js` | 가격 틱, VI/서킷브레이커, 개장·마감, 주문 큐 |
| 기업 분석 | `company_reports.js` | 프로필, 재무, 게시판, 투자심리 |
| 전문가 | `experts.js` | 전문가 프로필과 보고서 |

시장 변동성은 `app.js`의 `CFG`, `CAP_META`, 가격 틱 함수와 `events_market.js`의 이슈 강도가 함께 결정한다. 대형·중형·소형주의 틱 한도와 세션 한도는 `CAP_META`에 있다. 뉴스는 단순 장식이 아니라 가격 반영·기업 보고서·장 마감 보고에 연결된다.

수정 시 같이 볼 것:

- 변동폭: `app.js`의 `CAP_META`, `CFG`, 이슈 반영 함수
- 뉴스 빈도/강도: `events_market.js` + `app.js`
- 매수·매도·공매도: `core/trading.js` + `portfolio.js`
- 모바일 수익률 표시: `app.js`의 포트폴리오 렌더 + `style.css`

#### 내 정보 & 시장 패널

`ui/info-market-panel.js`가 우측의 **보유·인생·연락·이슈·뉴스·랭킹·업적** 패널을 마운트하고 탭 전환을 관리한다. `index.html`에는 `#info-market-panel` 호스트만 둔다.

역할 경계:

- `info-market-panel.js`: 탭·필터 이벤트, 패널 DOM, 보유·이슈·뉴스·랭킹·업적 표시
- `app.js`: 현재 게임 상태에서 각 View에 넘길 데이터 모델 생성
- `renderLifePanel`, `renderChatPanel`: 관계·가족·세력 등 도메인 의존성이 큰 인생·연락 내용 생성
- 차트 함수: Chart.js 인스턴스의 생성·업데이트

패널의 `크게 보기`는 데스크톱에서는 화면 여백을 둔 작업 창, 모바일에서는 전체 화면으로 열린다. 제목과 탭은 고정되고 활성 탭 본문만 스크롤된다. 닫기·`Escape`·다른 작업 창 열기로 원래 크기에 복귀한다.

새 탭을 추가할 때는 `QT_INFO_MARKET_PANEL.TABS`, 모듈의 pane 마크업, `renderInfoMarketTab()` 연결을 함께 수정한다. 탭 클릭을 위한 인라인 스크립트를 `index.html`에 다시 만들지 않는다.

#### 종목 탐색기·호가창

`ui/market-workspace.js`가 좌측 종목 탐색기와 호가창의 UI 상태를 관리한다.

- 종목명·업종 검색, 업종 선택, 전체·관심·보유 필터
- 데스크톱 대형 작업 창과 모바일 전체 화면
- 호가창 접기·펼치기
- 필터 모드와 호가창 접힘 상태를 `qt_market_workspace_ui`에 저장
- 종목 데이터와 선택 상태는 계속 `app.js`가 소유하며, 모듈은 필터 조건과 레이아웃 변경만 콜백으로 알린다.

반응형 레이아웃에서는 종목 행의 테마 기본 버튼 최소폭을 반드시 덮어써야 한다. 그렇지 않으면 목록 안에 가로 스크롤이 생긴다. 모바일 정보 탭은 7칸 균등 격자, 상단 컨트롤은 4칸 압축 격자를 사용하며 가로 스크롤에 의존하지 않는다.

#### 페이지 이탈 자동 정지

`ui/page-lifecycle.js`가 `visibilitychange`, `pagehide`, `blur`를 감지해 `app.js`에 알린다. 장중에 다른 탭·앱·창으로 이동하면 즉시 일시정지하며, 복귀했다고 자동 재개하지 않는다. 사용자가 `재개` 버튼이나 Space를 눌러야 시간이 다시 흐른다. 긴급속보 등 팝업의 자동 정지 상태에서 이탈한 경우에도 백그라운드 정지가 우선하여 팝업 종료가 장을 재개하지 못하게 한다.

### 6.2 시간과 월간 진행

| 파일 | 역할 |
|---|---|
| `core/time.js` | 경과 월로 나이·연도·월 계산, 월 이자 계산 |
| `app.js` | 한 장 마감 = 한 달 경과, 월말 결과 컨텍스트 생성과 기존 사건 연결 |
| `ui/month-close-flow.js` | 표시할 월말 View 목록, 현재 단계, 완료 단계 관리 |
| `ui/views/*-view.js` | 정산·생활·관계·가족·직업·행동·주요 사건·복귀 화면 |
| `events_life.js` | 생활 이벤트 |
| `career_events.js` | 직업 이벤트 |

현재 시간 단위는 **월**이다. 12개월마다 한 살 증가한다. 직업·대출·월세·가족·건강·경제 국면 정산은 모두 장 마감 뒤 월간 결산과 연결된다.

월말 자유시간은 **서로 다른 행동군 최대 4회**다. 동일 행동군을 한 달에 반복할 수는 없다. 별도 직무교육은 없으며 취미의 `자기계발`이 행복·매력과 함께 `CAREER.train()`을 호출해 직무 능력도 올린다. 경력 행동군에는 이직과 자격증이 남는다.

월말 처리의 핵심 불변식은 **계산 1회, 표시 여러 단계**다.

```text
장 마감 계산
  → monthCloseContext 저장
  → 월말 종합 정산
  → 실제 변화가 있을 때만 생활·관계·가족·직업 View
  → 인생 행동
  → 중요 사건/랜덤 사건
  → 사망·파산·감금 등 전용 결말 또는 다음 달 복귀
```

`monthCloseContext`에는 금전 보고서, 마감 전후 상태, 각 조건부 View 데이터, 중요 사건 진행 위치, 랜덤 사건, 결말 판정과 `completedSteps`가 저장된다. View는 저장된 결과를 읽기만 하며 월급·이자·관계·사건 판정을 다시 실행하지 않는다. 새로고침하면 현재 단계와 현재 사건을 복원한다.

월말 View를 추가할 때는 다음 순서를 따른다.

1. 계산 결과를 `createMonthCloseContext()`에 넣는다.
2. `ui/month-close-flow.js`에서 조건부 단계를 등록한다.
3. `QT_MONTH_CLOSE_VIEWS`에 View를 추가하고 `index.html`에서 `app.js`보다 먼저 로드한다.
4. `services/save.js` 스냅샷과 회귀 테스트를 확인한다.
5. View의 계속 버튼은 `api.next`만 호출하며 정산 함수를 직접 부르지 않는다.

### 6.3 시작 배경·학창생활·첫 직업

| 파일 | 역할 |
|---|---|
| `origin_story.js` | 부모/가정 배경, 학창생활, 직업 후보와 시작 인맥 |
| `jobs.js` | 직업 정의, 급여, 위험도, 관련 정보 |
| `aptitude.js` | 적성 축, 직무 적합도, 성장과 성과·위험 배율 |
| `career.js` | 직급, 자기계발 성장, 자격증, 이직, 능력 |
| `career_events.js` | 직업별 월간 사건 |
| `app.js` | 시작 선택 화면과 최종 첫 직업 확정 |

가정 배경:

- 맞벌이 직장인 부모
- 공무원·교사 부모
- 의료계 부모
- 자영업 부모
- 한부모·보호자 가정

학창생활:

- 학생회와 반장
- 도서관과 독서실
- 예술동아리
- 운동부
- 컴퓨터·투자동아리

두 선택의 직업 후보 교집합과 보정으로 첫 직업 풀이 만들어진다. 직장을 바꿀 때는 `QT_CAREER.switchJob()` 경로를 우선한다.

자격증:

- 데이터 활용, 외국어, 재무·회계, 리더십, 소프트웨어 실무
- 부동산 자산관리, 계약·법무, 협상 전문가, 위기관리·보안, 미디어 전략

### 6.4 경제 국면

`economy.js`가 `QT_ECONOMY`를 제공한다.

국면은 회복기 → 호황 → 과열 → 긴축 → 침체 → 금융위기 → 부양 국면으로 구성된다. 국면은 다음에 영향을 준다.

- 종목 영향과 시장 전망
- 급여 배율과 해고 위험
- 대출 조건
- 주거·부동산 수익률
- 생활비
- 사업 실적

경제 관련 밸런스를 바꿀 때 주식 틱만 수정하지 말고 `economy.js`의 급여·대출·자산·생활비 배율까지 확인한다.

### 6.5 주거·부동산·지속 수익

| 파일 | 역할 |
|---|---|
| `housing.js` | 실제 거주 주택, 월세·전세·매매, 월간 비용, 자녀 수용 |
| `data.js` | 투자용 `PROPERTIES`, `PASSIVE_ASSETS` 원본 |
| `app.js` | 구입·판매 UI와 월간 반영 |
| `economy.js` | 국면별 부동산 수익률 |

거주지는 부모님 집, 고시원, 반지하 원룸, 신축 원룸, 도심 오피스텔, 가족형 아파트, 고급 주상복합, 대저택이다.

계약 형태는 다음 셋이다.

- `monthly`: 월세
- `jeonse`: 전세
- `owned`: 매매

매매 주택은 월세가 나가지 않아야 한다. 투자용 부동산과 수익 자산은 거주 주택과 별개다. 순자산 계산을 고칠 때 `housing.assetValue()`, 투자용 부동산, 사업 매각가를 모두 포함하는지 확인한다.

### 6.6 대출·보험·연금

| 파일 | 역할 |
|---|---|
| `loan.js` | 금융기관, 신용등급, 대출 제안·차입·상환·월 정산 |
| `life_finance.js` | 보험, 연금, 소득세, 치료비·사망 보험금 |
| `core/time.js` | 월 이자 계산 보조 |
| `app.js` | UI와 장 마감 정산 연결 |

주식 레버리지 대출 `S.loan`과 인생 대출 `S.life.loans`/`S.life.loan`은 목적이 다르다. 둘을 합치거나 상환 로직을 바꿀 때 저장 호환성과 순자산 계산을 같이 확인한다.

### 6.7 사업

`business.js`가 사업 상태와 계산을 소유하고, `business_romance.js`가 네 담당자의 익명 신원·업무 신뢰·유혹 함정·얼굴 공개·연애 엔딩을 소유한다.

사업 종류:

- 온라인 유통사
- 콘텐츠 스튜디오
- 기업 자문사
- 돌봄·웰니스 센터

`business.js` 핵심 API는 `start`, `expand`, `close`, `assetValue`, `projected`, `monthly`, `eventView`, `resolveEvent`다. 각 사업에는 여성 담당자 한 명이 배정되고 월간 보고와 선택형 사건이 있다.

담당자는 공개 전 `박 매니저`, `한 실장`, `차 총괄`, `오 책임자`처럼 직함으로만 표시한다. 사업 선택과 흑자로 숨은 신뢰가 오르며, 솔로 상태에서 네 사업을 모두 운영하고 3개월 연속 전체 흑자를 내면 한 명씩 얼굴·실명 공개 사건이 자연 발생한다. 공개 후에는 일반 연락·외출·데이트 대상이 된다.

각 담당자의 사업 장면은 `event-business-<id>-masked.png`와 `event-business-<id>-night.png`가 한 쌍이다. 일반 보고·유혹 단계는 눈을 가린 `masked`, 공개·순애 단계는 얼굴이 보이는 `night`를 사용한다.

연인이 있는 동안 아직 공개되지 않은 담당자의 유혹을 받아 선을 넘으면 확정 함정이다. 박지수·오혜린은 폭로로 기존 관계가 파탄 나고, 한이슬·차서윤은 비밀유지·협박 합의금을 요구한다. 선을 지키면 숨은 신뢰가 크게 오른다. 각 담당자 순애 엔딩과 네 명의 합의형 세트 엔딩은 `business_romance.js` 조건을 따른다.

공개 뒤 네 담당자는 각각 2장의 개인 업무 이야기를 가진다. 개인 장면은 오피스 로맨스의 성숙한 긴장감을 유지하되, 각자의 업무 윤리와 관계 방식이 먼저 드러나도록 구성한다.

| 담당자 | 개인 이야기 | 컷씬 |
|---|---|---|
| 박지수 | 물류실의 야근, 근무표에 만든 생활의 빈칸 | `event-business-office-ledger.png`, `event-business-office-schedule.png` |
| 한이슬 | 크레딧에서 빠진 이름, 뮤즈와 공동 제작자의 경계 | `event-business-creative-credit.png`, `event-business-creative-muse.png` |
| 차서윤 | 독소조항을 이용한 신뢰 시험, 서명하지 않은 장기계약 | `event-business-corporate-clause.png`, `event-business-corporate-unsigned.png` |
| 오혜린 | 매출보다 안전을 먼저 긋는 선, 돌보는 사람의 휴진일 | `event-business-medical-redline.png`, `event-business-medical-rest.png` |

개인 선택 결과에는 공통 설명만 쓰지 않고 담당자별 `reply`를 함께 반환해 서로 다른 말투가 결과창과 연락으로 이어지게 한다.

4인 세트는 위험 3인조의 감금·의존이나 힐링 3인조의 소박한 공동생활과 구별되는 **이사회 로맨스**다. 네 사업을 모두 운영하고 전원 개인 이야기 1장 이상을 본 뒤 아래 공동 이야기가 차례로 자연 발생한다.

1. `호칭을 정하는 이사회`: 권한과 책임 배분
2. `네 개 부서를 노린 적대적 인수`: 부서 간 공조와 직원 보호
3. `퇴근 뒤에는 누가 대표인가`: 고용 관계와 사적 동의의 경계

공동 선택은 `업무 시너지`, `공동 의사결정`, `공과 사 경계`를 바꾼다. 3장을 완료하고 세 지표와 전원 관계 조건을 충족해야 `네 개의 명함` 세트 엔딩이 열린다. 공동 컷씬은 `event-business-quartet-boardroom.png`, `event-business-quartet-crisis.png`, `event-business-quartet-afterhours.png`다.

사업을 추가할 때 필요한 것:

1. `TYPES` 사업 정의
2. 담당 `STAFF`와 `assets/characters` 초상화
3. 월간 `EVENTS`와 선택 결과
4. 사업 자산가치와 순자산 반영
5. 저장/복원 및 회귀 테스트

### 6.8 라이벌·세력·공격과 방어

| 파일 | 역할 |
|---|---|
| `rivals.js` | AI 페르소나, 공격, 방어, 복수, 협상, 파산, 세력원 모집 |
| `core/campaign.js` | 라이벌 가치·반응 단계·파산 판정·캠페인 진행 |
| `faction_campaign.js` | 첫 공격 이후 노선, 특수 기능, 승리 조건과 엔딩 |
| `campaign_endings.js` | 관계 맥락을 포함한 캠페인 엔딩 기록 |
| `app.js` | 장중 습격, 세력 UI, 공동 거래, 운영 투자 |

세력에 넣은 돈은 돌려받는 예치금이 아니라 **조직 운영 투자비**다. 세력 정산은 수익률만 보지 말고 유지비, 규모, 세력원 역할, 공동 매매와 방어력을 함께 본다.

세력 관련 주요 흐름:

```text
AI/라이벌의 공격
  → 방어 또는 피해
  → 첫 공격 스토리와 노선 선택
  → 세력원 모집·시설/규모 강화·운영 투자
  → 공동 매매·역공·협상
  → 라이벌 파산 또는 캠페인 엔딩
```

남성 캐릭터 대부분은 연애 대상이 아니라 세력원·경쟁자·언론·브로커 역할이다.

하락 공동작전은 `공동 공매도`로 표시한다. 플레이어가 대상 종목을 보유하면 25% 자동 매도하고, 보유하지 않았거나 이미 숏 포지션이면 공매도 한도의 10%(최대 500만 원)를 `QT_TRADING.executeSell(... allowShort:true)` 경로로 실제 체결한다.

### 6.9 관계·데이트·결혼·다자 관계

| 파일 | 역할 |
|---|---|
| `relationship_group.js` | 현재 관계 구성원, 합의, 공개 상태, 갈등, 공동생활 |
| `romance_events.js` | 연애·직업·가족 선택형 사건 |
| `characters.js` | 인물과 기본 조우 경로 |
| `app.js` | 외출, 데이트, 고백, 이별, 결혼, 관계 UI |

`QT_RELATIONSHIPS`가 관계의 정본이다.

- `startRelationship`, `addMember`: 관계 시작·구성원 추가
- `commit`: 결혼/공동생활 약속
- `registerConflict`: 갈등 기록
- `monthlyHousehold`: 공동생활 비용
- `setPublicity`, `monthlyPublicity`: 비공개·공개·노출
- `removeMember`: 이별과 대표 파트너 재선정

비밀 연인(`lovers`)과 합의된 구성원(`relationshipGroup.members`)을 혼동하지 않는다. 갈등 수치만으로 구성원을 자동 삭제하지 않으며, 실제 이별은 명시적인 선택이나 캐릭터 사건을 거친다.

### 6.10 연락·인맥

| 파일 | 역할 |
|---|---|
| `social_network.js` | 가족·친구·직업 인맥, 친분, 부탁, 월간 연락 |
| `chat_lines.js` | 관계 단계·성격·집착도별 채팅 문장 |
| `character_dialogue.js` | 캐릭터별 말투와 상황별 반응 |
| `character_voices.js` | 데이트·장면용 캐릭터 보이스 데이터 |
| `voice.js` | 브라우저 TTS 재생 |
| `app.js` | 채팅 기록, 읽지 않음, 먼저 오는 연락, 답장 UI |

연락처는 연인만이 아니라 시작 배경에서 생긴 부모·친구·직업 인맥도 포함한다. 캐릭터 대사를 추가할 때 범용 `chat_lines.js`만 늘리지 말고 `character_dialogue.js`의 해당 인물 말투를 우선한다.

월간 관계 감소는 시장만 보거나 연락 탭을 열지 않았다는 이유로 발생하지 않는다. `pushPersonMessage`가 기록한 실제 상대 수신 메시지가 있고, `lastReplyDay`가 그보다 오래됐으며, 이를 2개월 이상 답하지 않았을 때만 `idleMonths`와 소원해짐 감소를 적용한다. 선택지에서 명시적으로 `무시`를 누르는 경우의 즉시 감소는 별도다.

### 6.11 건강·가족·자녀·세대 계승

| 파일 | 역할 |
|---|---|
| `health.js` | 질환, 운동, 휴식, 검진, 치료, 유전 |
| `family.js` | 임신·출산·입양, 자녀 성장, 양육자, 부모 돌봄, 후계자 |
| `child_events.js` | 자녀 사건 |
| `legacy.js` | 인생 기록, 유산, 세대 엔딩과 보관 |
| `romance_events.js` | 혼전임신·혼외자 사건 |
| `app.js` | 사망·후계자 선택·새 세대 부팅 |

고위험 직업 사건에서 질환과 부채가 생길 때는 `career_events.js`, `health.js`, `loan.js`를 함께 본다. 치료비가 곧바로 비정상적인 대출로 변환되지 않는지 확인한다.

질환 데이터의 발생 조건은 `minStress`, 진단 후 스트레스 증가는 `stress`로 분리한다. 같은 키로 합치면 뒤 값이 앞 값을 덮어써 낮은 스트레스에서도 질환이 추첨되는 버그가 재발한다. 번아웃 진단은 스트레스 80 이상부터 낮은 확률로 열리고, 치료 뒤 12개월 동안 재발하지 않는다. 생활·직업 번아웃 사건도 각각 고스트레스에서만 열리며 발생 후 6개월 간격을 둔다.

### 6.12 정의·법적 사건

`justice.js`는 사건 개시, 법률가 고용, 선택, 월간 진행을 담당한다. 경찰 강유진의 조우와 구원 성향, 법률 인맥, 한태석의 특수 구제와 연결될 수 있으므로 관련 이벤트 수정 시 `characters.js`, `character_stories.js`, `social_network.js`도 확인한다.

### 6.13 저장·불러오기·결과 공유

`services/save.js`가 `QT_SAVE`를 제공한다.

현재 저장 버전은 **v4**다. v4에서 월초 기준 자금·실현손익과 `monthCloseContext`가 추가되어 월말 화면 중간 새로고침을 복원한다.

- `createSnapshot`: 실행 상태를 저장 가능한 형태로 변환
- `normalizeSnapshot`: 구버전·누락 필드를 현행 구조로 복원
- `encodeResult`, `decodeResult`: 결과 공유용 해시

장중 저장은 복원 시 안전을 위해 일시정지 상태가 된다. 타이머 같은 런타임 전용 값은 저장하지 않는다. 새 상태 필드를 추가하면 다음을 확인한다.

1. 스냅샷 포함 여부
2. 구버전 기본값
3. 배열/객체 정규화
4. DOM/타이머 참조 제거
5. `tests/core_regression.test.cjs` 회귀 테스트

### 6.14 BGM·효과음·TTS

| 파일 | 역할 |
|---|---|
| `bgm.js` | 자체 WebAudio 반주, SAM 음절 보컬, 포먼트·자음 합성, 캐릭터 보이스, Tone.js 보컬 효과, 트랙·복구 상태 |
| `voice.js` | TTS 음성 선택과 발화 |
| `app.js` | 옵션, 사용자 입력 뒤 재생 시작, 장면 변화 전달 |

`index.html`은 `bgm.js`보다 먼저 Tone.js 15.1.22와 sam-js 0.3.1의 고정 버전을 불러온다. 두 CDN 라이브러리를 불러오지 못해도 자체 WebAudio 반주로 폴백한다.

현재 고급 BGM은 **자연스러운 사람 목소리보다 음정이 분명한 기계 가수**를 목표로 한다.

- 음절 악보: `{ text, note, step, beats, vowel, onset }` 데이터로 발음·음정·시작점·길이를 지정
- SAM: `HEL`, `LO`, `RISE`, `NEWS`처럼 짧게 나눈 발음 PCM 생성
- 음정: SAM 원음을 C4로 보고 `playbackRate = 2^(반음 차이/12)`로 정확히 이조
- 지속 모음: A/E/I/O/U별 핵심 F1·F2 band-pass 포먼트 위에 음표 주파수의 오실레이터를 통과시킴
- 자음: S/SH/CH/F는 고주파 노이즈, K/T/P/B/D/G는 짧은 파열음, M/N은 저음 공명, H는 숨소리
- 보이스 스타일: 파형, SAM/포먼트 비율, 자음 세기, 비브라토, 글라이드, 포먼트 스케일, 속삭임, 글리치를 조합
- Tone.js: 샘플 예약, 포먼트 보이스, 제한된 더블 트래킹, 패닝, 짧은 코러스와 리버브
- 자체 WebAudio: 기존 멜로디·아르페지오·베이스·패드·드럼
- 선곡: 시작 화면, 장 마감 월별 순환, 데이트/관계, 위험 사건, 속보, 장중 상승·하락

보컬 프리셋은 `arcade`, `ticker`, `turbo`, `hollow`, `broadcast`, `broken`, `stadium`, `dream`으로 나뉘지만, 모든 장면에서 동시에 사용하지 않는다. 자동 보컬은 타이틀 훅에만 나오고 장중·뉴스·급등락은 악기 중심으로 재생한다. 캐릭터 보이스는 현재 나래(`guide`), 강유진(`guardian`), 한채린(`velvetKnife`), 윤세라(`stalker`)가 있으며, 해당 인물의 이벤트·데이트 창이 보일 때만 `app.js`가 캐릭터 보컬을 선택한다.

개발 중 직접 시험:

```js
QT_BGM.playCharacter('sera');
QT_BGM.playCharacter('narae', 'dreamy');
QT_BGM.clearCharacterVoice();
```

캐릭터 BGM을 추가하려면 `CHARACTER_VOCALS`에 기본 반주, SAM 프로필, 보이스 스타일, 음절 악보를 추가한다. 완전히 새로운 성질이 필요할 때만 `VOICE_STYLES`에 스타일을 하나 더 만든다.

삼성 인터넷과 iOS Safari 대응이 중요하다.

- 음악 버튼의 실제 클릭/터치 안에서 `QT_BGM.unlock()`을 기다린 뒤 재생한다.
- Tone과 자체 반주가 하나의 `AudioContext`를 공유한다.
- 컨텍스트가 잠긴 상태에서는 음표를 미리 예약하지 않는다.
- 스케줄러에서 `resume()`을 반복하지 않는다. 동시 복구 요청은 하나의 Promise로 합친다.
- 백그라운드 복귀와 다음 `pointerdown`/`touchend`/`keydown`에서 한 번만 재개를 시도한다.
- 복구 뒤에는 편곡을 처음부터 중복 시작하지 않고 진행 위치와 다음 예약 시각을 유지한다.
- 잠금 해제가 실패하면 버튼을 OFF로 되돌려 “켜졌지만 무음” 상태를 남기지 않는다.

트랙이 나오지 않으면 `#bgm-toggle`의 `data-engine`, `data-audio-state`, 툴팁을 먼저 확인한다. `sam+tone / running`이 고급 엔진의 정상 상태이며, `webaudio / running`은 CDN 폴백이 정상 재생 중인 상태다.

## 7. 캐릭터 데이터 구조

캐릭터 한 명의 정보는 한 파일에만 있지 않다.

| 정보 | 파일 |
|---|---|
| 이름·직업·성격·초상화·기본 조우 | `characters.js` |
| 인물별 4장 스토리와 결말 | `character_stories.js` |
| 개성 수치와 행동 반응 | `character_traits.js` |
| 고유 말투 | `character_dialogue.js` |
| 데이트/장면 대사 | `character_voices.js` |
| 일반 채팅 조합 | `chat_lines.js` |
| 둘 이상의 인물 사건 | `character_cross_events.js` |
| 위험한 3인 세트 | `dangerous_trio.js` |
| 자유로운 3인 세트 | `freedom_trio.js` |
| 초상화 | `assets/characters/` |
| 이벤트 컷신 | `assets/event-*.png` 등 |

캐릭터를 추가하거나 크게 수정할 때 위 표를 체크리스트로 사용한다.

## 8. 히로인별 기준

### 일반 히로인

모든 일반 히로인은 `character_stories.js`에 4장 개인 스토리가 있다.

| 인물 | 직업 | 성격 | 생활 방식 | 개별 시스템 | 대표 컷신 |
|---|---|---|---|---|---|
| 서연 | 디자이너 | 다정함 | 독립 | 영감 교감 | `event-seoyeon-repair.png` |
| 하은 | 간호사 | 절약형 | 지원 | 돌봄 피로 | `event-haeun-hospital.png` |
| 예린 | 공무원 | 집순이 | 독립 | 생활 안정감 | `event-yerin-rain.png` |
| 채원 | 승무원 | 사치형 | 의존 | 돌아올 곳 | `event-chaewon-airport.png` |
| 유나 | 모델 | 자유형 | 의존 | 스캔들 열기 | `event-yuna-backstage.png` |
| 수아 | 교사 | 다정함 | 독립 | 책임 과부하 | `event-sua-classroom.png` |
| 보라 | 약사 | 집순이 | 지원 | 일상 신뢰 | `event-bora-pharmacy.png` |
| 다은 | 파티시에 | 다정함 | 독립 | 공동의 꿈 | `event-daeun-cake.png` |
| 혜진 | 연구원 | 냉정함 | 독립 | 검증된 신뢰 | `event-hyejin-blackout.png` |
| 소희 | 음악가 | 자유형 | 의존 | 자유의 여백 | `event-sohee-backstage.png` |
| 아린 | 편집자 | 집순이 | 독립 | 마음의 원고 | `event-arin-first-snow.png` |
| 나영 | 트레이너 | 야망형 | 지원 | 승부욕 | `event-nayoung-wrist.png` |
| 미래 | 게임 기획자 | 절약형 | 지원 | 취향 싱크 | `event-mirae-launch.png` |

개별 수치의 변화는 `character_traits.js`의 `actions`가 기준이다. 예를 들어 서연은 취미, 예린은 가족·경력, 소희와 미래는 취미 행동에 크게 반응한다. 수치의 단계 문구와 월간 변화는 `QT_CHARACTER_TRAITS`를 통해 계산한다.

### 특별·중심 히로인

#### 나래

- 역할: 시작 튜토리얼과 투자 교육의 기준 인물
- 성격: 냉정함
- 개별 시스템: **투자 원칙 신뢰**
- 긍정 요인: 경력 관리, 휴식, 원칙 있는 투자
- 부정 요인: 무리한 라이벌 행동, 마진콜과 반복되는 투기적 실패
- 스토리: 개인 4장 + 투자 교육 관련 연애 이벤트
- 대표 컷신: `event-narae-market-crash.png`
- 수정 시: `origin_story.js`, 튜토리얼 구간, `character_stories.js`, `character_traits.js`, `romance_events.js`

#### 강유진

- 역할: 경찰, 구조·법적 사건·공권력 축
- 기본 조우: 정의 사건, 전과, 최근 공격 등 경찰 장면 조건
- 개별 시스템: **구원 강박**
- 핵심 성향: 주인공이 무너지고 의존할수록 구조자 역할에 끌린다.
- 세력/정의 사건과 연결되며 위험한 3인 세트의 구성원이다.
- 대표 컷신: `event-yujin-rain-rescue.png`

#### 윤세라

- 역할: 멘헤라·얀데레, 추적과 반복 개입
- 기본 조우: 직접 데이트 목록이 아니라 일상 도움 이벤트에서 자연스럽게 연결
- 개별 시스템: **집착**. 외부 집착 수치와 `seraLoop`가 핵심이다.
- 친구일 때는 연락이 잦은 좋은 친구처럼 보이지만, 연인·하룻밤·고집착 조건부터 감금/개입 트리거가 강해진다.
- 특정 상태에서 병원·외출·다른 행동에 끼어드는 연출이 `app.js`와 연결된다.
- 대표 컷신: `event-sera-doorstep.png`, 기존 `sera*.png` 계열
- 수정 시: `events_life.js`, `character_stories.js`, `character_traits.js`, `app.js`의 Sera intrusion/loop

#### 한채린

- 역할: 재벌가·권력·사설 경호·기업/세력 축
- 기본 조우: 특정 주식 1주가 아니라 **세력 레벨 2 이상, 세력원 3명 이상** 조건
- 개별 시스템: **복종 만족**
- 핵심 성향: 주인공의 좋은 직업·정상적인 성공보다 자신에게 휘둘리거나 거칠게 대하는 관계에 더 강하게 반응한다.
- 위험한 3인 세트의 구성원이며 강유진과 공권력/사설 경호 교차 사건이 있다.
- 대표 컷신: `event-chaerin-contract.png`

## 9. 세계 인물·남성 NPC

이들은 기본적으로 히로인이 아니라 세력·경쟁·정보·구제 역할이다. `character_stories.js`의 `WORLD_ARCS`에 각 3장 스토리가 있다.

| 인물 | 역할 |
|---|---|
| 민준 | 법률형 세력원 |
| 도윤 | 의료형 세력원 |
| 시우 | 정보형 세력원 |
| 건우 | 현장 운영형 세력원 |
| 지우 | 브로커·거래 연결 |
| 수빈 | 언론·미디어 경쟁 인물 |
| 태양 | 적대 세력 리더 |
| 장태식 | 채권 추심·암시장/위험 사건 |
| 한태석 | 매우 어려운 특별 아군·대협형 구제자 |

한태석은 친해지기 매우 어렵지만 관계를 쌓으면 감옥, 부채, 여성 캐릭터 관련 위기에서 큰 도움을 주는 특별 아군이다. 다른 남성 NPC를 연애 대상으로 되돌리지 않는다.

## 10. 캐릭터 교차 이벤트

`character_cross_events.js`에 현재 다음 조합이 있다.

| ID | 인물 | 사건 |
|---|---|---|
| `narae_hyejin_model` | 나래 + 혜진 | 검증되지 않은 확신 |
| `yujin_chaerin_rescue` | 강유진 + 한채린 | 공권력과 사설 경호 |
| `yerin_sera_schedule` | 예린 + 윤세라 | 달력에 없던 사람 |
| `seoyeon_arin_credit` | 서연 + 아린 | 누구의 문장이었나 |
| `haeun_bora_care` | 하은 + 보라 | 돌보는 사람을 돌보는 법 |
| `chaewon_yuna_photo` | 채원 + 유나 | 도착 게이트의 사진 한 장 |
| `sua_daeun_children` | 수아 + 다은 | 아이들을 위한 하루 |
| `sohee_nayoung_wrist` | 소희 + 나영 | 무대보다 먼저인 손목 |
| `mirae_daeun_launch` | 미래 + 다은 | 게임 속 빵집, 현실의 가게 |
| `chaerin_yuna_contract` | 한채린 + 유나 | 사람을 계약서에 넣는 법 |
| `yujin_sera_intervention` | 강유진 + 윤세라 | 문 밖의 발소리 |

교차 이벤트는 월간 쿨다운과 `seen` 기록으로 중복을 막는다. 조건을 바꿀 때 `ensure`, `monthly`, `resolved` 흐름을 확인한다.

## 11. 세트 히로인 루트

### 위험한 결핍 3인 세트

구성원: **강유진 + 한채린 + 윤세라**

파일: `dangerous_trio.js`

핵심 분위기는 서로를 악우처럼 보면서 “저 사람보다는 내가 정상”이라고 믿는 위험한 공생이다.

현재 구조:

- 세 사람 각각의 개인 스토리와 허용 결말이 필요하다.
- 이미 관계가 완전히 끝난 인물은 참가할 수 없다.
- 외부 다자 관계 구성원이 있으면 세트 시작을 막는다.
- 4장 세트 스토리: 한 방에 모인 세 개의 결핍 → 서로가 더 정상이라는 싸움 → 사라진 시간 → 열린 문/닫힌 세계
- 축: `balance`, `containment`, `fracture`
- 결과: 위험한 악우 공생, 황금 감금, 파국 등
- 결말 뒤 후일담과 세력 테이블 사건이 이어진다.

조건의 최종 판정은 `QT_DANGEROUS_TRIO.eligibility()`다. UI에서 조건을 복제하지 말고 이 함수를 사용한다.

### 힐링 3인 세트 — 화려한 하루 뒤, 작은 집

구성원: **채원 + 유나 + 소희**

파일: `freedom_trio.js`

세 사람의 직업은 승무원·모델·연주자처럼 화려하지만, 이 루트의 보상은 더 큰 무대가 아니다. 현관을 닫은 뒤에는 누구도 직함이나 성과로 평가하지 않고, 피곤한 사람이 평범하게 돌아와 쉴 수 있는 집을 만드는 것이 핵심이다.

개인 선행 사건:

- 채원: 마지막 비행 뒤의 편의점 죽 → 비행 없는 아침과 빨래
- 유나: 렌즈가 꺼진 뒤의 국숫집 → 공개 일정이 없는 시장·서점의 일요일
- 소희: 박수가 끝난 뒤의 따뜻한 차 → 보온병과 집 열쇠를 건네는 작은 연주

세트 축:

- `harmony`: 네 사람이 비교받지 않고 함께 지내는 관계 조화
- `rest`: 집에서 실제로 회복되는 안식감
- `axes.freedom`: 서로의 일을 인정하면서 평범한 생활을 지키는 선택
- `axes.career`: 직업을 처리하되 집까지 무대로 만들지 않는 선택
- `axes.control`: 따뜻한 집을 허락과 평가가 필요한 장소로 바꾸는 선택

네 장은 공항 귀가, 열애설이 난 일요일 장보기, 세 도시에서 온 귀가 문자, 아무 역할도 하지 않는 공동생활로 이어진다. 좋은 결말은 `화려한 날 뒤의 불 켜진 집` 또는 `네 사람의 작은 저녁`, 통제 선택이 누적된 나쁜 결말은 `불이 꺼진 현관`이다.

좋은 결말 뒤 `recovery()`는 매달 행복 증가, 스트레스 감소, 안식감에 따른 건강 회복과 소액 생활수입 30만 원을 반환한다. 후일담도 공동 콘텐츠나 세계 순회가 아니라 일정 없는 일요일, 늦은 귀가, 동네 축제처럼 소박한 생활을 중심으로 한다. 조건의 최종 판정은 `QT_FREEDOM_TRIO.eligibility()`다.

## 12. 이미지 자산 규칙

현재 자산은 대략 다음 규모다.

- `assets/` 바로 아래 이벤트·UI 이미지: 83개
- `assets/characters/` 초상화·표정 이미지: 220개

기본 규칙:

- 인물 초상화: `assets/characters/`
- 사건 컷신: `assets/event-<인물 또는 세트>-<장면>.png`
- 캐릭터 기본 초상화는 `characters.js`의 `portrait`가 기준
- 감정별 초상화가 있으면 `neutral`, `happy`, `sad` 등 같은 stem을 유지
- 얼굴이 이미 보이는 기존 히로인은 불필요하게 새로 만들지 않는다.
- 얼굴이 가려졌거나 스타일이 심하게 어긋난 인물만 새 초상화 대상으로 잡는다.
- 윤세라 계열 실사풍 컷신은 위험한 분위기의 기준 레퍼런스로 사용하되, 일반 히로인까지 전부 같은 공포 톤으로 만들지 않는다.

이미지를 추가한 뒤에는 파일명만 만들지 말고 실제 이벤트/캐릭터 데이터의 `scene` 또는 `portrait` 경로에 연결한다.

## 13. 수정 위치 빠른 찾기

| 하고 싶은 수정 | 먼저 볼 파일 | 같이 확인할 파일 |
|---|---|---|
| 주가 변동폭·서킷브레이커 | `app.js` | `events_market.js`, `core/trading.js` |
| 종목·회사 추가 | `companies.js` | `company_reports.js`, `data.js` |
| 뉴스·이슈 추가 | `events_market.js` | `app.js` 장 마감 보고 |
| 월간·긴급 뉴스 도트 안내원 | `ui/news-anchor.js` | `app.js`의 `openMarket`, `showBreaking`, `style.css` |
| 종목 검색·필터·호가창 접기 | `ui/market-workspace.js` | `app.js`의 `renderStockList`, `style.css` |
| 내 정보·시장 탭 | `ui/info-market-panel.js` | `app.js`의 `renderInfoMarketPanel`, 해당 데이터 모델 |
| 탭·앱 전환 시 장 정지 | `ui/page-lifecycle.js` | `app.js`의 `pauseForPageLeave`, `togglePause` |
| 월 진행·나이 | `core/time.js` | `app.js` 월 결산 |
| 장 마감 화면·순서 | `ui/month-close-flow.js`, `ui/views/` | `app.js`의 `createMonthCloseContext`, `settleMonth` |
| 월말 저장·새로고침 | `services/save.js` | `monthCloseContext`, 회귀 테스트 |
| 직업 추가 | `jobs.js` | `career_events.js`, `origin_story.js`, `career.js` |
| 직업 사고·치료비 | `career_events.js` | `health.js`, `loan.js` |
| 시작 선택지 | `origin_story.js` | `app.js`, `jobs.js`, `social_network.js` |
| 주거 비용 | `housing.js` | `economy.js`, `app.js` |
| 부동산·배당형 자산 | `data.js` | `app.js`, `economy.js` |
| 사업 추가·밸런스 | `business.js` | `assets/characters`, 저장 테스트 |
| 사업 담당자 익명·유혹·공개·연애 | `business_romance.js` | `business.js`, `app.js`, 사업 이벤트 컷신 |
| 세력 수익·유지비 | `rivals.js` | `faction_campaign.js`, `app.js` |
| 공격·방어·복수 | `rivals.js` | `core/campaign.js`, `faction_campaign.js` |
| 관계 판정·이별 | `relationship_group.js` | `app.js`, `romance_events.js` |
| 채팅·말투 | `character_dialogue.js` | `chat_lines.js`, `character_voices.js` |
| 특정 캐릭터 조우 | `characters.js` | `app.js`, 관련 생활 이벤트 |
| 개인 스토리 | `character_stories.js` | `character_traits.js`, 컷신 |
| 캐릭터 개성 수치 | `character_traits.js` | `app.js` 월간 행동 |
| 캐릭터 교차 사건 | `character_cross_events.js` | 각 인물 스토리와 관계 상태 |
| 위험한 3인 세트 | `dangerous_trio.js` | 강유진·한채린·윤세라 개인 스토리 |
| 자유로운 3인 세트 | `freedom_trio.js` | 채원·유나·소희 개인 사건 |
| 임신·혼외자 | `romance_events.js` | `family.js`, 관계 그룹 |
| 부모·자녀·계승 | `family.js` | `child_events.js`, `legacy.js` |
| 저장 오류 | `services/save.js` | `newLife()`, 회귀 테스트 |
| BGM 선곡 | `bgm.js` | `app.js` 오디오 연결, 실제 음원 파일 |
| 모바일 UI | `style.css` | `index.html`, 해당 렌더 함수 |

## 14. 테스트와 검증

기본 회귀 테스트:

```powershell
node tests/core_regression.test.cjs
```

현재 회귀 테스트가 다루는 주요 불변식:

- 사업 시작·월간 사건·매각 가치·담당 모브 초상화
- 지정가 매수와 공매도 상환
- 장중 저장 복원 시 일시정지
- 월말 View 순서와 조건부 단계 생성
- 월말 진행 위치·현재 컨텍스트 저장 및 복원
- 세션·뉴스·서킷브레이커·사업 데이터 저장
- 구버전 저장 기본값
- 결과 공유의 다중 파트너
- 관계 그룹의 구성원 제거·대표 파트너 재선정
- 공개 관계와 갈등 처리
- 다중 양육자
- 월/나이 계산과 월 이자
- 캠페인 공격·파산 관련 규칙

UI나 이미지가 바뀌면 테스트만으로 충분하지 않다. 로컬 서버에서 다음 흐름을 직접 확인한다.

1. 새 게임 시작
2. 가정 배경과 학창생활 선택
3. 첫 직업 확정
4. 개장 → 거래 → 마감
5. 월간 직업/생활/관계 이벤트
6. 저장 → 새로고침 → 불러오기
7. 모바일 폭에서 포트폴리오와 주문창

## 15. 문서 유지 체크리스트

다음 중 하나라도 바뀌면 이 문서를 같은 커밋에서 갱신한다.

- `index.html`의 스크립트 로딩 순서
- Tone.js·sam-js CDN 버전 또는 BGM 모바일 잠금 해제 방식
- 새 `QT_*` 모듈 또는 제거된 모듈
- `S`나 `newLife()`의 핵심 상태 구조
- 캐릭터 추가·삭제·역할 전환
- 조우 조건, 개인 스토리, 세트 멤버
- 신규 사업·경제 국면·주거 계약
- 저장 버전과 마이그레이션
- 이미지 파일명 규칙
- 테스트 명령이나 핵심 불변식

마지막 원칙: **기능 데이터는 기능 파일에, 캐릭터 개성은 캐릭터 파일에, `app.js`에는 연결과 화면만 남긴다.**
