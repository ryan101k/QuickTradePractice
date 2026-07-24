/* QuickTrade Life — 세력전 해금·재무 압박·파산 규칙 */
(function (root) {
  'use strict';

  const RULES = {
    attackMinMonth: 4,
    attackWealth: 30000000,
    attackMonthlyProfit: 10000000,
    attackTopRank: 3,
    bankruptcyFactionLevel: 2,
    bankruptcyMembers: 2,
    bankruptcyPressure: 70,
    bankruptcyCredibility: 30,
    playerInsolventMonths: 2,
  };

  function finite(value, fallback) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function attackStatus(context) {
    const month = Math.max(1, Math.floor(finite(context.month, 1)));
    const wealth = finite(context.totalWealth, 0);
    const monthlyProfit = finite(context.monthlyProfit, 0);
    const rank = Math.max(1, Math.floor(finite(context.rank, 99)));
    const oldEnough = month >= RULES.attackMinMonth;
    const notable = wealth >= RULES.attackWealth
      || monthlyProfit >= RULES.attackMonthlyProfit
      || rank <= RULES.attackTopRank;
    let reason = '아직 시장의 표적이 될 만큼 알려지지 않았습니다.';
    if (!oldEnough) reason = `${RULES.attackMinMonth}개월차부터 경쟁 세력이 움직입니다.`;
    else if (!notable) reason = `총자산 3천만·월 수익 1천만·랭킹 3위 중 하나를 달성하면 세력전이 시작됩니다.`;
    else reason = wealth >= RULES.attackWealth ? '큰 자산이 시장에 알려졌습니다.'
      : monthlyProfit >= RULES.attackMonthlyProfit ? '한 달의 큰 수익으로 주목받았습니다.'
      : '상위권 진입으로 경쟁 세력의 표적이 됐습니다.';
    return { unlocked:oldEnough && notable, oldEnough, notable, month, wealth, monthlyProfit, rank, reason };
  }

  function rivalWorth(bot) {
    if (!bot || bot.bankrupt) return 0;
    const assetValue = (bot.assets || []).reduce((sum, asset) => sum + Math.max(0, finite(asset.value, 0)), 0);
    return Math.max(0, finite(bot.capital, 0) + assetValue + Math.max(0, finite(bot.marketHoldingsValue, 0)));
  }

  function ensureRival(bot, currentWorth) {
    if (!bot) return null;
    const worth = Math.max(0, finite(currentWorth, rivalWorth(bot)));
    if (!Number.isFinite(bot.initialWorth)) bot.initialWorth = Math.max(1, worth);
    if (!Number.isFinite(bot.peakWorth)) bot.peakWorth = Math.max(bot.initialWorth, worth);
    bot.peakWorth = Math.max(bot.peakWorth, worth);
    if (!Number.isFinite(bot.pressure)) bot.pressure = 0;
    if (!Number.isFinite(bot.credibility)) bot.credibility = 100;
    if (!bot.reactionStage) bot.reactionStage = 'stable';
    if (!Array.isArray(bot.reactionHistory)) bot.reactionHistory = [];
    return bot;
  }

  function reactionStage(bot, currentWorth) {
    ensureRival(bot, currentWorth);
    if (bot.bankrupt) return 'bankrupt';
    const worth = Math.max(0, finite(currentWorth, rivalWorth(bot)));
    const ratio = worth / Math.max(1, bot.peakWorth);
    if (ratio <= 0.22 || bot.pressure >= 90 || bot.credibility <= 12) return 'collapse';
    if (ratio <= 0.40 || bot.pressure >= 70 || bot.credibility <= 30) return 'desperate';
    if (ratio <= 0.58 || bot.pressure >= 45 || bot.credibility <= 50) return 'defensive';
    if (ratio <= 0.78 || bot.pressure >= 20 || bot.credibility <= 75) return 'wary';
    return 'stable';
  }

  function updateRival(bot, currentWorth, month) {
    ensureRival(bot, currentWorth);
    const before = bot.reactionStage;
    const after = reactionStage(bot, currentWorth);
    bot.reactionStage = after;
    if (before !== after) {
      bot.reactionHistory.unshift({ month:month || 1, from:before, to:after });
      if (bot.reactionHistory.length > 12) bot.reactionHistory.length = 12;
    }
    return { changed:before !== after, before, after };
  }

  function bankruptcyEligibility(bot, currentWorth, faction) {
    if (!bot) return { ready:false, reason:'대상을 찾을 수 없습니다.' };
    if (bot.bankrupt) return { ready:false, reason:'이미 파산·해산한 세력입니다.' };
    ensureRival(bot, currentWorth);
    const activeMembers = ((faction && faction.members) || []).filter(member => (member.injuredMonths || 0) <= 0).length;
    if (!faction || (faction.level || 0) < RULES.bankruptcyFactionLevel) {
      return { ready:false, reason:`세력 ${RULES.bankruptcyFactionLevel}단계가 필요합니다.` };
    }
    if (activeMembers < RULES.bankruptcyMembers) {
      return { ready:false, reason:`활동 가능한 조직원 ${RULES.bankruptcyMembers}명이 필요합니다.` };
    }
    const worth = Math.max(0, finite(currentWorth, rivalWorth(bot)));
    const weakByWorth = worth <= Math.max(5000000, bot.peakWorth * 0.55);
    const weakByTrust = bot.pressure >= RULES.bankruptcyPressure && bot.credibility <= RULES.bankruptcyCredibility;
    if (!weakByWorth && !weakByTrust) {
      return {
        ready:false,
        reason:`추가 압박 필요 · 압박 ${Math.round(bot.pressure)}/${RULES.bankruptcyPressure}, 신용 ${Math.round(bot.credibility)}/${RULES.bankruptcyCredibility} 이하`,
      };
    }
    return { ready:true, reason:'최종 파산 작전을 실행할 수 있습니다.', worth, activeMembers };
  }

  function campaignProgress(bots) {
    const list = bots || [];
    const bankrupt = list.filter(bot => bot.bankrupt);
    const active = list.filter(bot => !bot.bankrupt);
    return {
      total:list.length,
      defeated:bankrupt.length,
      remaining:active.length,
      complete:list.length > 0 && active.length === 0,
      active,
      bankrupt,
    };
  }

  function updatePlayerSolvency(life, context) {
    const wealth = finite(context.totalWealth, 0);
    const debt = Math.max(0, finite(context.debt, 0));
    const liquid = finite(context.liquidWorth, 0);
    const insolvent = wealth <= 0 && debt > 0 && liquid <= 0;
    life.campaignSolvency = life.campaignSolvency || { insolventMonths:0, bankrupt:false };
    life.campaignSolvency.insolventMonths = insolvent
      ? life.campaignSolvency.insolventMonths + 1
      : 0;
    if (life.campaignSolvency.insolventMonths >= RULES.playerInsolventMonths) {
      life.campaignSolvency.bankrupt = true;
      life.campaignSolvency.reason = context.reason || '자산을 모두 처분해도 부채와 의무지출을 감당할 수 없었습니다.';
    }
    return {
      insolvent,
      months:life.campaignSolvency.insolventMonths,
      bankrupt:!!life.campaignSolvency.bankrupt,
      reason:life.campaignSolvency.reason || '',
    };
  }

  root.QT_CAMPAIGN = {
    RULES,
    attackStatus,
    rivalWorth,
    ensureRival,
    reactionStage,
    updateRival,
    bankruptcyEligibility,
    campaignProgress,
    updatePlayerSolvency,
  };
})(window);
