/* QuickTrade Life — 월 단위 게임 시간과 월말 금융 계산 */
(function (root) {
  'use strict';

  function monthInfo(monthIndex, startAge) {
    const elapsedMonth = Math.max(1, Math.floor(Number(monthIndex) || 1));
    const ageAtStart = Math.max(0, Math.floor(Number(startAge) || 0));
    const yearsPassed = Math.floor((elapsedMonth - 1) / 12);
    const age = ageAtStart + yearsPassed;
    const month = ((elapsedMonth - 1) % 12) + 1;
    return { age, year:yearsPassed + 1, month, elapsedMonth, label:`만 ${age}세 · ${month}월` };
  }

  function monthlyInterest(balance, monthlyRate) {
    const principal = Math.max(0, Number(balance) || 0);
    const rate = Math.max(0, Number(monthlyRate) || 0);
    return Math.round(principal * rate);
  }

  root.QT_TIME = { monthInfo, monthlyInterest };
})(window);
