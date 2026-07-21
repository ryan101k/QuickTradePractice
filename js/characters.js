/* =========================================================================
 *  QuickTrade Life — 캐릭터(연애 상대) & 성격 데이터
 *  연애/결혼 상대의 직업·성격에 따라 매달 돈을 받거나 잃는다.
 *
 *  PERSONALITIES 각 항목:
 *    money  : 상대 소득 대비 매달 가계 가감 비율 (+면 돈 보탬, -면 지출)
 *    happy  : 매달 내 행복 가감
 *    charm  : 데이트 1회당 매력 보정
 *    breakup: (연애 중) 매달 이별할 확률 (없으면 0)
 * ========================================================================= */
const PERSONALITIES = {
  frugal:    { key: 'frugal',    name: '알뜰한',     emoji: '🪙', money: +0.15, happy: 0,  charm: 0,  desc: '생활비를 아껴 매달 돈을 보탬' },
  ambitious: { key: 'ambitious', name: '야망있는',   emoji: '🔥', money: +0.25, happy: -1, charm: 0,  desc: '맞벌이로 소득을 크게 보탬' },
  homebody:  { key: 'homebody',  name: '집순이',     emoji: '🏠', money: +0.05, happy: +1, charm: 0,  desc: '집에서 알뜰살뜰, 소소한 보탬' },
  caring:    { key: 'caring',    name: '다정한',     emoji: '🥰', money: 0,     happy: +4, charm: +2, desc: '함께 있으면 행복이 크게 오름' },
  cold:      { key: 'cold',      name: '무심한',     emoji: '🧊', money: 0,     happy: -3, charm: -1, desc: '데면데면, 행복이 잘 안 오름' },
  lavish:    { key: 'lavish',    name: '사치스러운', emoji: '💸', money: -0.35, happy: +2, charm: +1, desc: '씀씀이가 커서 매달 지출↑' },
  free:      { key: 'free',      name: '자유로운',   emoji: '💔', money: -0.10, happy: +3, charm: +3, breakup: 0.12, desc: '매력적이지만 이별 위험 있음' },
};

/* 연애 상대 로스터 — 연애가 시작되면 이 중 한 명이 랜덤 배정 */
const CHARACTERS = [
  { name: '서연', emoji: '👩', job: '디자이너', income: 2800000, personality: 'caring' },
  { name: '민준', emoji: '👨', job: '변호사',   income: 6000000, personality: 'ambitious' },
  { name: '지우', emoji: '🧑', job: '백수',     income: 0,       personality: 'lavish' },
  { name: '하은', emoji: '👩', job: '간호사',   income: 3200000, personality: 'frugal' },
  { name: '도윤', emoji: '👨', job: '의사',     income: 7000000, personality: 'cold' },
  { name: '수빈', emoji: '🧑', job: '유튜버',   income: 1500000, personality: 'free' },
  { name: '예린', emoji: '👩', job: '공무원',   income: 2200000, personality: 'homebody' },
  { name: '시우', emoji: '👨', job: '개발자',   income: 4000000, personality: 'ambitious' },
  { name: '채원', emoji: '👩', job: '승무원',   income: 3000000, personality: 'lavish' },
  { name: '건우', emoji: '👨', job: '자영업',   income: 2500000, personality: 'frugal' },
  { name: '유나', emoji: '👩', job: '모델',     income: 2000000, personality: 'free' },
  { name: '준서', emoji: '🧑', job: '교사',     income: 2600000, personality: 'caring' },
  { name: '태양', emoji: '👨', job: '사업가',   income: 5000000, personality: 'lavish' },
  { name: '보라', emoji: '👩', job: '약사',     income: 4500000, personality: 'homebody' },
];
