/* QuickTrade Life — 승패와 관계·가족·자산을 조합하는 메인 엔딩 */
(function (root) {
  'use strict';

  function relationshipContext(life) {
    const partner = life && life.partner;
    const children = life && Array.isArray(life.children) ? life.children : [];
    const affection = Math.max(
      Number(life && life.affection) || 0,
      Number(partner && partner.affection) || 0,
      Number(partner && partner.charm) || 0,
    );
    const familyBond = Number(life && life.familyBond) || 0;
    const supported = !!partner && affection >= 60 || children.length > 0 && familyBond >= 50;
    return { partner, children, affection, familyBond, supported };
  }

  function pathLine(path) {
    if (path === 'legal') return '당신의 연합은 기록과 법, 공개된 자금으로 시장의 규칙을 바꿨습니다.';
    if (path === 'underground') return '당신의 이름은 공시보다 낮은 목소리로 먼저 전달되는 경고가 됐습니다.';
    return '정보와 사업망은 싸움이 시작되기 전에 자금의 방향을 바꾸는 힘이 됐습니다.';
  }

  function topic(name) {
    const text=String(name||'');
    const code=text.charCodeAt(text.length-1);
    const hasBatchim=code>=0xAC00&&code<=0xD7A3&&(code-0xAC00)%28!==0;
    return `${text}${hasBatchim?'은':'는'}`;
  }

  function familyLines(rel) {
    const lines = [];
    if (rel.partner) {
      lines.push(`${topic(rel.partner.name)} 마지막 순위표보다 당신이 무사히 돌아온 것을 먼저 확인했습니다.`);
    } else {
      lines.push('긴 싸움이 끝난 뒤, 당신을 기다리는 집은 조용했습니다.');
    }
    if (rel.children.length) {
      const names = rel.children.slice(0, 2).map(child => child.name).join('과 ');
      lines.push(`${names || '아이'}에게 당신은 승리보다 실패를 견디고 다시 일어나는 법을 남겼습니다.`);
    } else if (rel.partner) {
      lines.push('두 사람은 다음 목표를 더 큰 숫자가 아니라 함께 보낼 시간으로 정했습니다.');
    }
    return lines;
  }

  function assetLine(wealth, debt, outcome) {
    if (outcome === 'bankruptcy') return debt > 0
      ? `남은 부채 ${Math.round(debt).toLocaleString('ko-KR')}원은 재기 절차로 넘어갔습니다.`
      : '계좌는 비었지만 더는 숨겨진 빚이 남지 않았습니다.';
    if (wealth >= 500000000) return '당신은 승리 뒤에도 흔들리지 않을 거대한 자산 기반을 남겼습니다.';
    if (wealth >= 100000000) return '충분한 자산과 현금흐름이 다음 삶을 지탱했습니다.';
    return '승리는 거대했지만 자산 기반은 아직 불안했습니다. 왕좌를 지키는 일은 이제부터입니다.';
  }

  function build(outcome, life, context) {
    const rel = relationshipContext(life || {});
    const wealth = Number(context.totalWealth) || 0;
    const debt = Number(context.debt) || 0;
    const morality = Number(life && life.morality);
    const criminal = Number(life && life.criminalRecord) || 0;
    const healthy = (Number(life && life.health) || 0) >= 35;
    const stableVictory = wealth >= 100000000 && debt <= Math.max(10000000, wealth * 0.25) && healthy;
    const cleanEnough = !Number.isFinite(morality) || morality >= 30;
    const happy = rel.supported && (outcome === 'bankruptcy' || stableVictory && cleanEnough && criminal < 3);
    const path = context.path || 'network';

    let icon, title, summary;
    if (outcome === 'victory' && happy) {
      icon = '🌅'; title = '정상에서 돌아온 사람';
      summary = '모든 경쟁 세력이 무너진 뒤에도 당신에게는 돌아갈 사람과 지켜야 할 삶이 남아 있었습니다.';
    } else if (outcome === 'victory') {
      icon = path === 'underground' ? '👑' : '🏆'; title = '마지막으로 남은 이름';
      summary = '경쟁자들의 이름은 모두 순위표에서 사라졌습니다. 정상에는 당신의 이름만 남았습니다.';
    } else if (happy) {
      icon = '🏠'; title = '계좌 밖에 남은 것';
      summary = '자산과 세력은 무너졌지만, 당신을 기다리는 사람들은 떠나지 않았습니다.';
    } else {
      icon = '🌧️'; title = '빈 계좌의 아침';
      summary = '자산도 세력도 연락처도 하나씩 사라졌습니다. 이제 처음부터 다시 시작해야 합니다.';
    }

    const lines = outcome === 'victory' ? [pathLine(path)] : [];
    lines.push(...familyLines(rel));
    lines.push(assetLine(wealth, debt, outcome));
    if (outcome === 'bankruptcy' && context.reason) lines.unshift(context.reason);
    return {
      id:`${outcome}_${happy ? 'happy' : 'normal'}`,
      outcome,
      happy,
      icon,
      title,
      summary,
      lines,
      partnerName:rel.partner && rel.partner.name,
      children:rel.children.length,
      wealth,
      debt,
    };
  }

  function record(life, ending, month) {
    life.campaignEndings = Array.isArray(life.campaignEndings) ? life.campaignEndings : [];
    if (!life.campaignEndings.some(item => item.id === ending.id && item.outcome === ending.outcome)) {
      life.campaignEndings.push({ id:ending.id, outcome:ending.outcome, month:month || 1, title:ending.title });
    }
    life.lastCampaignEnding = { id:ending.id, outcome:ending.outcome, month:month || 1 };
    return ending;
  }

  root.QT_CAMPAIGN_ENDINGS = { relationshipContext, build, record };
})(window);
