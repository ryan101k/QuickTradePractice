/* QuickTrade Life — 월말 진행 큐 (계산 결과를 다시 실행하지 않는 순수 상태 머신) */
(function (root) {
  'use strict';

  const VERSION = 1;

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
    ctx.version = VERSION;
    ctx.active = true;
    ctx.completedSteps = Array.isArray(ctx.completedSteps) ? ctx.completedSteps : [];
    ctx.steps = Array.isArray(ctx.steps) && ctx.steps.length ? ctx.steps : build(ctx).steps;
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
