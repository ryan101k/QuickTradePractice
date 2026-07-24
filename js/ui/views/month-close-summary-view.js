/* QuickTrade Life — 월말 종합 정산 View */
(function (root) {
  'use strict';
  const views = root.QT_MONTH_CLOSE_VIEWS = root.QT_MONTH_CLOSE_VIEWS || {};
  const money = value => `${Math.round(Math.abs(value || 0)).toLocaleString('ko-KR')}원`;
  const signed = value => `${value >= 0 ? '+' : '-'}${money(value)}`;
  const row = (label, value, income) => {
    const amount = Number(value) || 0;
    if (!amount) return '';
    const shown = income ? Math.abs(amount) : -Math.abs(amount);
    return `<div class="month-close-ledger-row"><span>${label}</span><strong class="${shown >= 0 ? 'up' : 'down'}">${signed(shown)}</strong></div>`;
  };

  views['month-close-summary'] = {
    render(host, props, api) {
      const r = props.report || {};
      const news = (r.majorNews || []).slice(0, 6);
      host.innerHTML = `<div class="window close-window month-flow-window">
        <div class="title-bar close-bar"><div class="title-bar-text">📊 ${r.label || `${r.year || ''}년 ${r.month || ''}월`} · 월말 종합 정산</div></div>
        <div class="window-body month-flow-body">
          ${api.progress()}
          <div class="month-close-hero">
            <div><small>월초 순자산</small><strong>${money(r.startNetWorth)}</strong></div>
            <div class="month-close-arrow">→</div>
            <div><small>월말 순자산</small><strong>${money(r.endNetWorth)}</strong></div>
            <div class="${(r.netWorthChange || 0) >= 0 ? 'up' : 'down'}"><small>전월 대비</small><strong>${signed(r.netWorthChange || 0)}</strong></div>
          </div>
          <div class="month-close-grid">
            <section class="month-close-card">
              <h3>📈 투자·현금</h3>
              ${row('투자 평가·매매 손익', r.tradingPnL, true)}
              ${row('당월 실현손익', r.realizedPnL, true)}
              ${row('현금 변화', r.cashChange, (r.cashChange || 0) >= 0)}
            </section>
            <section class="month-close-card">
              <h3>💼 수입</h3>
              ${row('월급·직업소득', r.salary, true)}
              ${row('부동산 임대수익', r.propertyIncome, true)}
              ${row('자동수입', r.passiveIncome, true)}
              ${row('사업 손익', r.businessIncome, (r.businessIncome || 0) >= 0)}
              ${row('세력·공동생활 순액', r.sharedIncome, (r.sharedIncome || 0) >= 0)}
              ${!r.totalIncome ? '<div class="month-close-empty">이번 달 별도 수입 없음</div>' : ''}
            </section>
            <section class="month-close-card">
              <h3>🧾 지출·부채</h3>
              ${row('세금', r.tax)}
              ${row('보험료', r.insurance)}
              ${row('연금 적립', r.pension)}
              ${row('대출·신용이자', r.loanInterest)}
              ${row('주거·생활비', r.livingCost)}
              ${row('직업 사고비', r.incidentCost)}
              ${!r.totalExpense ? '<div class="month-close-empty">이번 달 별도 지출 없음</div>' : ''}
            </section>
          </div>
          <section class="month-close-news-panel">
            <h3>📰 이번 달 주요 시장 뉴스</h3>
            ${news.length ? `<ul>${news.map(item => `<li class="${(item.impact || 0) >= 0 ? 'good' : 'bad'}"><b>${item.headline}</b><small>${item.target || '시장'} · ${((item.impact || 0) * 100).toFixed(1)}%</small></li>`).join('')}</ul>` : '<p class="month-close-empty">특별히 기록할 시장 뉴스가 없었습니다.</p>'}
          </section>
          <div class="close-actions"><button class="session-btn opening" data-month-close-next>계속</button></div>
        </div>
      </div>`;
      host.querySelector('[data-month-close-next]').addEventListener('click', api.next);
    },
  };
})(window);
