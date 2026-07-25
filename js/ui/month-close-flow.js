/* QuickTrade Life — 월말 진행 큐 (계산 결과를 다시 실행하지 않는 순수 상태 머신) */
(function (root) {
  'use strict';

  const VERSION = 4;

  function makeStep(name, props) {
    return { type: 'view', name, props: props || {} };
  }

  function build(context) {
    const ctx = Object.assign({
      version: VERSION,
      active: true,
      currentIndex: 0,
      completedSteps: [],
      report: {},
      lifeChanges: [],
      relationshipChanges: [],
      familyChanges: [],
      careerChanges: [],
      forcedEvents: [],
      terminal: null,
      lifeActionConfirmed: false,
    }, context || {});

    const steps = [makeStep('month-close-summary', { report: ctx.report })];
    if (ctx.lifeChanges.length) steps.push(makeStep('life-status', { changes: ctx.lifeChanges }));
    if (ctx.relationshipChanges.length) {
      steps.push(makeStep('relationship-monthly', { changes: ctx.relationshipChanges }));
    }
    if (ctx.familyChanges.length) {
      steps.push(makeStep('family-monthly', { changes: ctx.familyChanges }));
    }
    if (ctx.careerChanges.length) {
      steps.push(makeStep('career-business', { changes: ctx.careerChanges }));
    }
    steps.push(makeStep('life-action'));
    steps.push(makeStep('important-events'));
    if (ctx.terminal) steps.push(makeStep('terminal', { terminal: ctx.terminal }));
    else steps.push(makeStep('return-market'));
    ctx.steps = steps;
    return ctx;
  }

  function normalize(raw) {
    if (!raw || typeof raw !== 'object' || raw.active === false) return null;
    const ctx = Object.assign({}, raw);
    ctx.active = true;
    ctx.completedSteps = Array.isArray(ctx.completedSteps) ? ctx.completedSteps : [];
    ctx.steps = Array.isArray(ctx.steps) && ctx.steps.length ? ctx.steps : build(ctx).steps;
    ctx.lifeActionConfirmed = ctx.lifeActionConfirmed === true;
    // v1 저장본에는 인생 행동 단계가 없거나, 업데이트 도중 해당 단계가
    // 빠진 채 저장된 경우가 있다. 현재 보고 있던 단계는 유지하면서
    // 주요 사건 직전에 행동 선택을 복원한다.
    if (!ctx.steps.some(step => step && step.name === 'life-action')) {
      const insertAt = ctx.steps.findIndex(step => step && (
        step.name === 'important-events' ||
        step.name === 'terminal' ||
        step.name === 'return-market'
      ));
      const target = insertAt >= 0 ? insertAt : ctx.steps.length;
      ctx.steps.splice(target, 0, makeStep('life-action'));
      if (ctx.currentIndex >= target) ctx.currentIndex = target;
    }
    // 과거 저장본은 새 버전 번호로 저장됐어도 life-action View가 누락된
    // 시점에 사건 단계까지 진행됐을 수 있다. 실제 행동 완료 확인값이
    // 없으면 버전과 관계없이 행동 단계로 되돌린다.
    const lifeIndex = ctx.steps.findIndex(step => step && step.name === 'life-action');
    const currentName = ctx.steps[ctx.currentIndex] && ctx.steps[ctx.currentIndex].name;
    if (!ctx.lifeActionConfirmed && lifeIndex >= 0 && ctx.currentIndex >= lifeIndex && currentName !== 'life-action') {
      ctx.currentIndex = lifeIndex;
      ctx.completedSteps = ctx.completedSteps.filter(name => name !== 'life-action');
    }
    ctx.version = VERSION;
    ctx.currentIndex = Math.max(0, Math.min(
      Number.isFinite(ctx.currentIndex) ? Math.floor(ctx.currentIndex) : 0,
      Math.max(0, ctx.steps.length - 1)
    ));
    return ctx;
  }

  function current(context) {
    return context && context.active && context.steps
      ? context.steps[context.currentIndex] || null : null;
  }

  function advance(context) {
    const step = current(context);
    if (!step) return null;
    if (!context.completedSteps.includes(step.name)) context.completedSteps.push(step.name);
    context.currentIndex += 1;
    if (context.currentIndex >= context.steps.length) {
      context.active = false;
      return null;
    }
    return current(context);
  }

  root.QT_MONTH_CLOSE_FLOW = { VERSION, build, normalize, current, advance };
})(window);
