/* QuickTrade Life — 동등한 관계 구성원·공동생활·공개 상태 엔진 */
(function (root) {
  'use strict';

  const VERSION = 2;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function nameOf(person) {
    return typeof person === 'string' ? person : person && person.name;
  }

  function sourceList(life) {
    const sources = [];
    if (life.relationship !== 'single' && life.partner) sources.push(life.partner);
    if (life.polycule && life.polycule.active && Array.isArray(life.polycule.members)) {
      sources.push(...life.polycule.members);
    }
    for (const bond of [life.dangerousTrioBond, life.freedomTrioBond]) {
      if (bond && bond.active && Array.isArray(bond.members)) sources.push(...bond.members);
    }
    return sources;
  }

  function normalizeMember(source, life) {
    const name = nameOf(source);
    if (!name) return null;
    const record = (life.met || []).find(person => person.name === name);
    return Object.assign({}, typeof source === 'object' ? source : {}, record || {}, { name });
  }

  function syncLegacy(life) {
    const group = life.relationshipGroup;
    const records = group.members.map(member => normalizeMember(member, life)).filter(Boolean);
    if (!records.length) {
      life.relationship = 'single';
      life.partner = null;
      life.affection = 0;
      return group;
    }

    // partner는 구버전 스토리 호환용 대표 캐시일 뿐 우선권을 갖지 않는다.
    const representative = records.find(person => person.name === group.spouseName) || records[0];
    life.partner = Object.assign({}, representative);
    life.relationship = group.status === 'committed' ? 'married' : 'dating';
    const affectionValues = records.map(person => Number(person.affection)).filter(Number.isFinite);
    life.affection = affectionValues.length
      ? Math.round(affectionValues.reduce((sum, value) => sum + value, 0) / affectionValues.length)
      : Number(life.affection) || 0;
    return group;
  }

  function ensure(life) {
    const target = life || {};
    if (!Array.isArray(target.met)) target.met = [];
    if (!Array.isArray(target.lovers)) target.lovers = [];
    if (!target.polycule || typeof target.polycule !== 'object') {
      target.polycule = { active:false, members:[], trust:0 };
    }
    if (!Array.isArray(target.polycule.members)) target.polycule.members = [];

    if (!target.relationshipGroup || typeof target.relationshipGroup !== 'object') {
      target.relationshipGroup = {
        version:VERSION,
        status:target.relationship === 'married' ? 'committed' : target.relationship === 'single' ? 'single' : 'dating',
        members:[],
        spouseName:target.relationship === 'married' && target.partner ? target.partner.name : null,
        stability:Number(target.polycule.trust) || 55,
        tension:0,
        exposure:0,
        agreement:{
          publicity:target.relationship === 'married' ? 'public' : 'private',
          cohabiting:target.relationship === 'married'
            || !!(target.dangerousTrioBond && target.dangerousTrioBond.active)
            || !!(target.freedomTrioBond && target.freedomTrioBond.active),
          sharedBudget:true,
          newMembers:'consensus',
        },
        history:[],
      };
    }

    const group = target.relationshipGroup;
    group.version = VERSION;
    if (!Array.isArray(group.members)) group.members = [];
    if (!Array.isArray(group.history)) group.history = [];
    if (!group.agreement || typeof group.agreement !== 'object') group.agreement = {};
    group.agreement.publicity = ['private','public','exposed'].includes(group.agreement.publicity)
      ? group.agreement.publicity : 'private';
    if (group.agreement.cohabiting == null) group.agreement.cohabiting = group.status === 'committed';
    if (group.agreement.sharedBudget == null) group.agreement.sharedBudget = true;
    if (!group.agreement.newMembers) group.agreement.newMembers = 'consensus';
    group.stability = clamp(Number(group.stability) || 55, 0, 100);
    group.tension = clamp(Number(group.tension) || 0, 0, 100);
    group.exposure = clamp(Number(group.exposure) || 0, 0, 100);

    // 새 엔진 도입 전 저장과 아직 구형 코드를 쓰는 전용 루트의 변경을 흡수한다.
    const merged = [...group.members, ...sourceList(target)];
    const seen = new Set();
    group.members = merged.map(source => {
      const member = normalizeMember(source, target);
      if (!member || seen.has(member.name)) return null;
      seen.add(member.name);
      return { name:member.name, joinedDay:member.joinedDay || 1 };
    }).filter(Boolean);
    if (!group.members.length) group.status = 'single';
    else if (!['dating','committed'].includes(group.status)) group.status = target.relationship === 'married' ? 'committed' : 'dating';
    if (group.spouseName && !seen.has(group.spouseName)) group.spouseName = null;
    syncLegacy(target);
    return target;
  }

  function consensualMembers(life) {
    const target = ensure(life);
    return target.relationshipGroup.members.map(member => normalizeMember(member, target)).filter(person => {
      const record = target.met.find(candidate => candidate.name === person.name);
      return !record || record.status !== 'deceased';
    });
  }

  function secretLovers(life) {
    const target = ensure(life);
    return target.lovers.map(source => normalizeMember(source, target)).filter(person => {
      const record = target.met.find(candidate => candidate.name === person.name);
      return person && (!record || !['ex','deceased'].includes(record.status));
    });
  }

  function isPartner(life, personOrName) {
    const name = nameOf(personOrName);
    return !!name && consensualMembers(life).some(person => person.name === name);
  }

  function representative(life) {
    const target = ensure(life);
    const members = consensualMembers(target);
    return members.find(person => person.name === target.relationshipGroup.spouseName) || members[0] || null;
  }

  function names(life) {
    return consensualMembers(life).map(person => person.name);
  }

  function joinNames(values) {
    const list = (values || []).map(nameOf).filter(Boolean);
    if (list.length < 2) return list[0] || '';
    if (list.length === 2) return `${list[0]}·${list[1]}`;
    return `${list.slice(0, -1).join('·')}·${list[list.length - 1]}`;
  }

  function summary(life) {
    return joinNames(names(life));
  }

  function label(life, personOrName) {
    const target = ensure(life);
    const name = nameOf(personOrName);
    if (!name) return '아는 사람';
    if (isPartner(target, name)) {
      if (target.dangerousTrioBond && target.dangerousTrioBond.active) return '위험한 결핍 공생';
      if (target.freedomTrioBond && target.freedomTrioBond.active) return '자유와 귀환';
      if (target.relationshipGroup.spouseName === name) return '배우자';
      return target.relationshipGroup.status === 'committed' ? '공동생활 가족' : '연인';
    }
    if (secretLovers(target).some(person => person.name === name)) return '몰래 만나는 중';
    return null;
  }

  function startRelationship(life, person, day) {
    const target = ensure(life);
    const member = normalizeMember(person, target);
    if (!member) return null;
    target.relationshipGroup.status = 'dating';
    target.relationshipGroup.members = [{ name:member.name, joinedDay:day || 1 }];
    target.relationshipGroup.spouseName = null;
    target.relationshipGroup.stability = Math.max(55, Number(member.trust) || 0);
    target.relationshipGroup.tension = 0;
    target.relationshipGroup.exposure = 0;
    target.relationshipGroup.agreement.publicity = 'private';
    target.relationshipGroup.agreement.cohabiting = false;
    target.relationshipGroup.history.push({ day:day || 1, type:'start', names:[member.name] });
    target.polycule.active = false;
    target.polycule.members = [];
    target.polycule.trust = 0;
    target.lovers = target.lovers.filter(candidate => nameOf(candidate) !== member.name);
    syncLegacy(target);
    return member;
  }

  function addMember(life, person, day) {
    const target = ensure(life);
    const member = normalizeMember(person, target);
    if (!member) return null;
    if (!target.relationshipGroup.members.some(candidate => candidate.name === member.name)) {
      target.relationshipGroup.members.push({ name:member.name, joinedDay:day || 1 });
      target.relationshipGroup.history.push({ day:day || 1, type:'join', names:[member.name] });
    }
    const record=target.met.find(candidate=>candidate.name===member.name);
    if(record)record.status=target.relationshipGroup.members.length>1?'polycule':'partner';
    target.relationshipGroup.status = target.relationshipGroup.status === 'single' ? 'dating' : target.relationshipGroup.status;
    target.polycule.active = target.relationshipGroup.members.length > 1 || target.polycule.active;
    syncLegacy(target);
    return member;
  }

  function commit(life, day) {
    const target = ensure(life);
    const members = consensualMembers(target);
    if (!members.length) return null;
    const group = target.relationshipGroup;
    group.status = 'committed';
    // 한 명과의 관계에서는 법적 배우자를 기록하고, 다인 관계에서는 누구도 주연인으로 올리지 않는다.
    group.spouseName = members.length === 1 ? members[0].name : null;
    group.agreement.cohabiting = true;
    group.agreement.publicity = 'public';
    group.stability = clamp(group.stability + 12, 0, 100);
    group.tension = clamp(group.tension - 8, 0, 100);
    group.history.push({ day:day || 1, type:'commit', names:members.map(person => person.name) });
    syncLegacy(target);
    return group;
  }

  function setPublicity(life, mode, day) {
    const target = ensure(life);
    const group = target.relationshipGroup;
    if (!['private','public'].includes(mode) || !group.members.length) return null;
    const previous = group.agreement.publicity;
    group.agreement.publicity = mode;
    if (mode === 'public') {
      group.stability = clamp(group.stability + 5, 0, 100);
      group.tension = clamp(group.tension - 6, 0, 100);
      group.exposure = 0;
    }
    group.history.push({ day:day || 1, type:'publicity', from:previous, to:mode });
    return { previous, mode, reputationDelta:mode === 'public' && previous === 'exposed' ? 2 : 0 };
  }

  function publicityLabel(life) {
    const mode = ensure(life).relationshipGroup.agreement.publicity;
    return mode === 'public' ? '공개 관계' : mode === 'exposed' ? '원치 않게 알려짐' : '비공개 합의';
  }

  function registerConflict(life, severity, reason, personName, day) {
    const target = ensure(life);
    const group = target.relationshipGroup;
    const amount = Math.max(1, Number(severity) || 1);
    group.tension = clamp(group.tension + amount, 0, 100);
    group.stability = clamp(group.stability - Math.ceil(amount * 0.45), 0, 100);
    group.history.push({ day:day || 1, type:'conflict', reason:reason || '갈등', personName:personName || null, severity:amount });
    const affected = personName
      ? target.met.filter(person => person.name === personName)
      : target.met.filter(person => group.members.some(member => member.name === person.name));
    affected.forEach(person => {
      person.trust = clamp((Number(person.trust) || 0) - Math.ceil(amount * 0.35), 0, 100);
      person.affection = clamp((Number(person.affection) || 0) - Math.ceil(amount * 0.2), 0, 100);
    });
    syncLegacy(target);
    return group;
  }

  function monthlyHousehold(life, options) {
    const target = ensure(life);
    const group = target.relationshipGroup;
    const members = consensualMembers(target);
    const opts = options || {};
    if (!members.length || !group.agreement.sharedBudget) {
      return { members:[], contribution:0, lifestyleCost:0, net:0, need:0, happiness:0, breakdown:[] };
    }
    const incomeOf = opts.incomeOf || (person => Number(person.income) || 0);
    const personalityOf = opts.personalityOf || (() => ({}));
    const householdSize = 1 + members.length + Math.max(0, Number(opts.children) || 0);
    const need = group.agreement.cohabiting
      ? Math.max(700000, Math.round((Number(opts.housingCost) || 0) + 700000 + Math.max(0, householdSize - 2) * 250000))
      : 500000;
    const breakdown = members.map(person => {
      const income = Math.max(0, incomeOf(person));
      const personality = personalityOf(person) || {};
      const spouse = group.spouseName === person.name;
      const rate = spouse
        ? (person.marriedShareRate == null ? 0.3 : Number(person.marriedShareRate) || 0)
        : Number(person.datingMoneyRate) || 0;
      const flat = spouse ? 0 : Number(person.datingMoneyFlat) || 0;
      const offered = Math.max(0, Math.round(income * rate + flat));
      const lifestyle = Math.max(0, Math.round(Math.max(0, -(Number(personality.money) || 0)) * Math.max(income, 1500000) * 0.25));
      return { name:person.name, offered, lifestyle, happy:Number(personality.happy) || 0 };
    });
    const offeredTotal = breakdown.reduce((sum, item) => sum + item.offered, 0);
    const contribution = Math.min(offeredTotal, need);
    // 생활 성향 비용은 인원수만큼 복제하지 않고 가구 평균으로 계산한다.
    const lifestyleCost = breakdown.length
      ? Math.round(breakdown.reduce((sum, item) => sum + item.lifestyle, 0) / breakdown.length)
      : 0;
    const happiness = breakdown.length
      ? Math.round(breakdown.reduce((sum, item) => sum + item.happy, 0) / breakdown.length)
      : 0;
    const result = { members:members.map(person => person.name), contribution, lifestyleCost, net:contribution-lifestyleCost, need, happiness, breakdown };
    group.lastBudget = result;
    return result;
  }

  function monthlyPublicity(life, options) {
    const target = ensure(life);
    const group = target.relationshipGroup;
    const opts = options || {};
    const members = consensualMembers(target);
    if (members.length < 2) return null;
    if (group.agreement.publicity === 'public') {
      group.exposure = 0;
      if ((Number(opts.month) || 0) > 0 && Number(opts.month) % 6 === 0) {
        return { type:'public_stable', reputationDelta:1, text:'관계를 숨기지 않고 합의한 경계를 지킨 덕분에 주변의 신뢰가 쌓였습니다.' };
      }
      return null;
    }
    if (group.agreement.publicity === 'exposed') return null;
    group.exposure = clamp(group.exposure + 7 + Math.max(0, members.length - 2) * 4, 0, 100);
    const random = typeof opts.random === 'function' ? opts.random : Math.random;
    const chance = 0.025 + group.exposure / 850;
    if (random() >= chance) return null;
    group.agreement.publicity = 'exposed';
    group.tension = clamp(group.tension + 10, 0, 100);
    group.stability = clamp(group.stability - 6, 0, 100);
    group.history.push({ day:opts.month || 1, type:'exposed', names:members.map(person => person.name) });
    return {
      type:'exposed',
      reputationDelta:-6,
      text:`${joinNames(members)}님과의 비공개 관계가 소문으로 먼저 알려졌습니다. 관계 자체보다 숨겨 온 과정이 신뢰에 타격을 줬습니다.`,
    };
  }

  function caregiverNames(life) {
    return names(life);
  }

  function removeMember(life, personOrName, nextStatus) {
    const target = ensure(life);
    const name = nameOf(personOrName);
    if (!name) return { removed:false, remaining:consensualMembers(target) };
    const group = target.relationshipGroup;
    const before = group.members.length;
    group.members = group.members.filter(member => member.name !== name);
    if (group.spouseName === name) group.spouseName = null;
    target.polycule.members = target.polycule.members.filter(person => nameOf(person) !== name);
    for (const key of ['dangerousTrioBond','freedomTrioBond']) {
      const bond = target[key];
      if (!bond || !Array.isArray(bond.members)) continue;
      bond.members = bond.members.filter(member => nameOf(member) !== name);
      if (bond.members.length < 2) bond.active = false;
    }
    const record = target.met.find(person => person.name === name);
    if (record && nextStatus) record.status = nextStatus;
    if (!group.members.length) {
      group.status = 'single';
      group.stability = 55;
      group.tension = 0;
      target.polycule.active = false;
      target.polycule.members = [];
      target.polycule.trust = 0;
    }
    syncLegacy(target);
    return { removed:before !== group.members.length, remaining:consensualMembers(target) };
  }

  root.QT_RELATIONSHIPS = {
    VERSION,
    ensure,
    consensualMembers,
    secretLovers,
    isPartner,
    representative,
    primary:representative,
    names,
    joinNames,
    summary,
    label,
    startRelationship,
    addMember,
    commit,
    setPublicity,
    publicityLabel,
    registerConflict,
    monthlyHousehold,
    monthlyPublicity,
    caregiverNames,
    removeMember,
  };
})(window);
