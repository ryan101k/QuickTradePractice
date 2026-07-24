/* QuickTrade Life — DOM과 분리된 주문 체결/회계 엔진 */
(function (root) {
  'use strict';

  function positiveInt(value) {
    const number = Math.floor(Number(value));
    return Number.isFinite(number) && number > 0 ? number : 0;
  }

  function executeBuy(state, order, options) {
    const qty = positiveInt(order.qty);
    const price = Number(order.price);
    if (!qty || !(price > 0)) return { ok:false, reason:'invalid_order' };

    const feeRate = Number(options.feeRate) || 0;
    const position = state.owned[order.name];

    // 매수는 기존 공매도 포지션을 먼저 청산한다. 주문 수량이 더 커도
    // 한 번의 주문으로 롱 포지션까지 뒤집지 않는 기존 시장가 규칙을 유지한다.
    if (position && position.qty < 0) {
      const filledQty = Math.min(qty, Math.abs(position.qty));
      const gross = price * filledQty;
      const fee = Math.round(gross * feeRate);
      const cost = gross + fee;
      if (state.capital < cost) return { ok:false, reason:'insufficient_cash', kind:'cover' };

      state.capital -= cost;
      const realized = (position.avg - price) * filledQty - fee;
      state.realizedPnL += realized;
      position.qty += filledQty;
      if (position.qty === 0) delete state.owned[order.name];
      state.trades++;
      state.shortsClosed++;
      return { ok:true, kind:'cover', qty:filledQty, price, gross, fee, cost, realized };
    }

    const gross = price * qty;
    const fee = Math.round(gross * feeRate);
    const cost = gross + fee;
    const buyingPower = Number(options.buyingPower);
    if (!Number.isFinite(buyingPower) || cost > buyingPower) {
      return { ok:false, reason:'insufficient_buying_power', kind:'buy' };
    }

    const cashUsed = Math.min(cost, state.capital);
    const borrowed = cost - cashUsed;
    state.capital -= cashUsed;
    if (borrowed > 0) {
      state.loan += borrowed;
      state.usedLeverage = true;
    }
    if (position && position.qty > 0) {
      const totalQty = position.qty + qty;
      position.avg = (position.avg * position.qty + gross) / totalQty;
      position.qty = totalQty;
    } else {
      state.owned[order.name] = { qty, avg:price };
    }
    state.trades++;
    return { ok:true, kind:'buy', qty, price, gross, fee, cost, borrowed };
  }

  function executeSell(state, order, options) {
    const qty = positiveInt(order.qty);
    const price = Number(order.price);
    if (!qty || !(price > 0)) return { ok:false, reason:'invalid_order' };

    const feeRate = Number(options.feeRate) || 0;
    const taxRate = Number(options.taxRate) || 0;
    const position = state.owned[order.name];

    if (!position || position.qty <= 0) {
      if (!options.allowShort) return { ok:false, reason:'insufficient_position', kind:'sell' };
      const gross = price * qty;
      const fee = Math.round(gross * feeRate);
      const shortSellingPower = Number(options.shortSellingPower);
      if (!Number.isFinite(shortSellingPower) || gross + fee > shortSellingPower) {
        return { ok:false, reason:'short_limit', kind:'short' };
      }
      state.capital += gross - fee;
      if (position && position.qty < 0) {
        const totalQty = position.qty - qty;
        position.avg = (position.avg * Math.abs(position.qty) + gross) / Math.abs(totalQty);
        position.qty = totalQty;
      } else {
        state.owned[order.name] = { qty:-qty, avg:price };
      }
      state.trades++;
      return { ok:true, kind:'short', qty, price, gross, fee };
    }

    if (position.qty < qty) return { ok:false, reason:'insufficient_position', kind:'sell' };
    const gross = price * qty;
    const fee = Math.round(gross * feeRate);
    const tax = Math.round(gross * taxRate);
    const proceeds = gross - fee - tax;
    const repaid = Math.min(state.loan, proceeds);
    state.loan -= repaid;
    state.capital += proceeds - repaid;
    const realized = (price - position.avg) * qty - fee - tax;
    state.realizedPnL += realized;
    position.qty -= qty;
    if (position.qty === 0) delete state.owned[order.name];
    state.trades++;
    return { ok:true, kind:'sell', qty, price, gross, fee, tax, proceeds, repaid, realized };
  }

  function executeLimit(state, order, price, options) {
    const request = { name:order.name, qty:order.qty, price };
    return order.side === 'buy'
      ? executeBuy(state, request, options)
      : executeSell(state, request, Object.assign({}, options, { allowShort:false }));
  }

  root.QT_TRADING = { executeBuy, executeSell, executeLimit };
})(window);
