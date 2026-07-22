/* =========================================================================
 *  QuickTrade Life — 직업 적성(APTITUDE)
 *
 *  플레이어는 6개 적성 축에 타고난 점수(0~100)를 갖는다.
 *  직업마다 요구하는 적성 축(job.apt)이 있고, 그 축의 내 점수 평균이
 *  "직업 적합도(match)"가 된다. 적합도는:
 *    · 이직 합격률에 가감
 *    · 매달 성과·수입 성장에 가감
 *    · 직업 만족도(행복)에 반영
 *    · 사고 확률에 가감 (안 맞는 일은 실수·사고가 잦다)
 *  적성은 그 일을 계속하면 해당 축이 조금씩 자란다(경험 학습).
 * ========================================================================= */
(function (root) {
  'use strict';

  const AXES = [
    { key: 'analysis',  icon: '🧠', name: '분석력', desc: '데이터·논리·수리 판단' },
    { key: 'social',    icon: '🤝', name: '대인력', desc: '소통·설득·관계' },
    { key: 'stamina',   icon: '💪', name: '체력',   desc: '지구력·현장 대응' },
    { key: 'creative',  icon: '🎨', name: '창의력', desc: '기획·표현·감각' },
    { key: 'diligence', icon: '📋', name: '성실성', desc: '꼼꼼함·인내·규율' },
    { key: 'daring',    icon: '🦁', name: '대담성', desc: '위험 감수·결단' },
  ];
  const KEYS = AXES.map(a => a.key);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const axis = k => AXES.find(a => a.key === k);

  /* 적성 초기화 — 두어 개 축이 두드러지고 나머지는 평범한, 사람마다 다른 분포 */
  function roll() {
    const apt = {};
    KEYS.forEach(k => { apt[k] = 35 + Math.floor(Math.random() * 30); });   // 기본 35~64
    // 강점 축 2개를 끌어올린다
    const shuffled = KEYS.slice().sort(() => Math.random() - 0.5);
    apt[shuffled[0]] = clamp(apt[shuffled[0]] + 20 + Math.floor(Math.random() * 20), 0, 100);
    apt[shuffled[1]] = clamp(apt[shuffled[1]] + 12 + Math.floor(Math.random() * 16), 0, 100);
    // 약점 축 1개
    apt[shuffled[5]] = clamp(apt[shuffled[5]] - 15 - Math.floor(Math.random() * 15), 0, 100);
    return apt;
  }

  function ensure(life) {
    if (!life.aptitude || typeof life.aptitude !== 'object') life.aptitude = roll();
    KEYS.forEach(k => { if (typeof life.aptitude[k] !== 'number') life.aptitude[k] = 45; });
    return life.aptitude;
  }

  // 직업 적합도 0~100 — 그 직업이 쓰는 축들의 내 점수 평균
  function match(job, life) {
    const apt = ensure(life);
    const ax = (job && job.apt) || [];
    if (!ax.length) return 55;   // 백수 등 적성 무관 직업은 중립값
    const sum = ax.reduce((s, k) => s + (apt[k] || 0), 0);
    return Math.round(sum / ax.length);
  }

  // 적합도 등급 (UI 배지)
  function matchTier(pct) {
    if (pct >= 80) return { icon: '🌟', label: '천직', mood: 'up' };
    if (pct >= 65) return { icon: '👍', label: '잘 맞음', mood: 'up' };
    if (pct >= 45) return { icon: '➖', label: '보통', mood: '' };
    if (pct >= 30) return { icon: '⚠️', label: '안 맞음', mood: 'down' };
    return { icon: '💢', label: '적성 최악', mood: 'down' };
  }

  /* 매달 적성 성장 — 현재 직업이 쓰는 축은 경험으로 오르고,
   * 아주 가끔 다른 축도 조금 오른다(폭넓은 경험). */
  function grow(life, job) {
    const apt = ensure(life);
    const ax = (job && job.apt) || [];
    const grown = [];
    ax.forEach((k, i) => {
      const before = apt[k];
      const gain = (i === 0 ? 0.9 : 0.5) * (before < 70 ? 1 : 0.4);   // 높을수록 성장 둔화
      apt[k] = clamp(before + gain, 0, 100);
      if (Math.floor(apt[k]) > Math.floor(before) && Math.floor(apt[k]) % 10 === 0) grown.push(k);
    });
    if (Math.random() < 0.15) {
      const k = KEYS[Math.floor(Math.random() * KEYS.length)];
      apt[k] = clamp(apt[k] + 0.6, 0, 100);
    }
    return grown;   // 10단위를 갓 넘긴 축(알림용)
  }

  // 성과/수입에 곱할 적합도 계수 (0.82 ~ 1.18)
  function performanceMul(job, life) {
    return 1 + (match(job, life) - 55) / 300;
  }
  // 사고 확률에 곱할 계수 — 안 맞는 일은 사고가 잦다 (0.85 ~ 1.3)
  function riskMul(job, life) {
    return clamp(1 + (55 - match(job, life)) / 220, 0.85, 1.35);
  }

  // 정렬된 적성 목록 (강점순) — 라이프 패널 표시용
  function ranked(life) {
    const apt = ensure(life);
    return AXES.map(a => ({ key: a.key, icon: a.icon, name: a.name, value: Math.round(apt[a.key]) }))
      .sort((x, y) => y.value - x.value);
  }
  // 내 강점 축에 맞는 추천 직업 판단용 — 두 강점 키
  function strengths(life) {
    return ranked(life).slice(0, 2).map(r => r.key);
  }

  root.QT_APTITUDE = {
    AXES, KEYS, axis, ensure, roll, match, matchTier, grow,
    performanceMul, riskMul, ranked, strengths,
  };
})(window);
