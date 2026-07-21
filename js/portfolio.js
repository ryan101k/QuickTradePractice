/* QuickTrade Life — DOM과 분리된 포트폴리오/회계 엔진 */
(function (root) {
  'use strict';
  function currentPrice(stocks, name) {
    const stock = stocks.find(item => item.name === name);
    return stock && stock.listed && stock.history.length ? stock.history[stock.history.length - 1].c : 0;
  }
  function positionValues(state) {
    let long = 0, short = 0;
    Object.entries(state.owned).forEach(([name, position]) => {
      const value = Math.abs(position.qty) * currentPrice(state.stocks, name);
      if (position.qty >= 0) long += value; else short += value;
    });
    return { long, short };
  }
  // 공매도 대금은 capital에 들어 있으므로 숏의 현재 상환가치 전체를 차감한다.
  function netWorth(state) {
    const { long, short } = positionValues(state);
    return state.capital + long - short - state.loan;
  }
  function longBuyingPower(state, leverage) {
    const { long } = positionValues(state);
    return Math.max(0, netWorth(state) * Math.max(1, leverage) - long);
  }
  function shortSellingPower(state, maxLeverage) {
    const { short } = positionValues(state);
    return Math.max(0, netWorth(state) * Math.max(0, maxLeverage) - short);
  }
  function marginState(state, longMaintenance, shortMaintenance) {
    const exposure = positionValues(state);
    const equity = netWorth(state);
    return {
      equity, ...exposure,
      longCall: state.loan > 0 && exposure.long > 0 && equity < exposure.long * longMaintenance,
      shortCall: exposure.short > 0 && equity < exposure.short * shortMaintenance,
    };
  }
  root.QT_PORTFOLIO = { currentPrice, positionValues, netWorth, longBuyingPower, shortSellingPower, marginState };
})(window);
