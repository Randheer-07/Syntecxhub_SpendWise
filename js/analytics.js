/* ==========================================================================
   analytics.js — charts, category breakdown and headline stats.
   ========================================================================== */

(() => {
  const $ = sel => document.querySelector(sel);

  const PALETTE = ['#8b7cf8', '#2fe0c4', '#ff6b8a', '#ffb454', '#5fa8ff',
    '#c4b5fd', '#3ddc97', '#f472b6', '#facc15', '#94a3b8'];

  let charts = [];
  let range = 6;

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function monthsInScope() {
    const keys = new Set(Store.listTransactions().map(t => Store.monthKey(t.date)));
    const now = new Date();
    const out = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      out.push({
        key,
        label: d.toLocaleDateString('en-IN', { month: 'short' }),
        full: d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
        hasData: keys.has(key)
      });
    }
    return out;
  }

  function renderMiniStats() {
    const months = monthsInScope();
    const keys = new Set(months.map(m => m.key));
    const txns = Store.listTransactions().filter(t => keys.has(Store.monthKey(t.date)));

    const totals = Store.totals(txns);
    const avg = months.length ? totals.expense / months.length : 0;
    const best = txns.filter(t => t.type === 'income')
      .sort((a, b) => b.amount - a.amount)[0];
    const rate = totals.income > 0 ? Math.round(((totals.income - totals.expense) / totals.income) * 100) : 0;

    const cards = [
      { label: 'Total spent', value: Store.formatMoney(totals.expense), note: `Last ${range} months` },
      { label: 'Avg / month', value: Store.formatMoney(avg), note: 'Average monthly expense' },
      { label: 'Total income', value: Store.formatMoney(totals.income), note: `${txns.filter(t => t.type === 'income').length} income entries` },
      { label: 'Savings rate', value: `${rate}%`, note: rate >= 20 ? 'Healthy saving pace' : 'Room to improve' }
    ];

    $('#miniStats').innerHTML = cards.map(c => `
      <div class="mini-stat">
        <span>${c.label}</span>
        <b class="num">${c.value}</b>
        <em>${c.note}${best && c.label === 'Total income' ? '' : ''}</em>
      </div>`).join('');
  }

  function renderCategoryChart() {
    const monthTxns = Store.listTransactions().filter(t =>
      t.type === 'expense' && Store.monthKey(t.date) === Store.currentMonthKey());

    const cats = Store.expensesByCategory(monthTxns);
    $('#catChartSub').textContent = new Date()
      .toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    const legend = $('#catLegend');
    if (!cats.length) {
      legend.innerHTML = '<span class="muted">No expenses recorded this month yet.</span>';
      destroyOne('categoryChart');
      return;
    }

    legend.innerHTML = cats.map((c, i) => `
      <span><i class="legend-dot" style="background:${PALETTE[i % PALETTE.length]}"></i>
      ${App.escapeHtml(c.category)} · <b class="dim">${Store.formatMoney(c.amount)}</b></span>`).join('');

    drawChart('categoryChart', {
      type: 'doughnut',
      data: {
        labels: cats.map(c => c.category),
        datasets: [{
          data: cats.map(c => c.amount),
          backgroundColor: cats.map((_, i) => PALETTE[i % PALETTE.length]),
          borderColor: cssVar('--bg'),
          borderWidth: 3,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '66%',
        animation: { animateRotate: true, duration: 800 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#101226',
            padding: 11,
            cornerRadius: 9,
            callbacks: { label: ctx => ` ${ctx.label}: ${Store.formatMoney(ctx.parsed)}` }
          }
        }
      }
    });
  }

  function renderCompareChart() {
    const months = monthsInScope();

    drawChart('compareChart', {
      type: 'bar',
      data: {
        labels: months.map(m => m.label),
        datasets: [
          {
            label: 'Income',
            data: months.map(m => Store.monthTotals(m.key).income),
            backgroundColor: cssVar('--income'),
            borderRadius: 7,
            maxBarThickness: 20
          },
          {
            label: 'Expense',
            data: months.map(m => Store.monthTotals(m.key).expense),
            backgroundColor: cssVar('--expense'),
            borderRadius: 7,
            maxBarThickness: 20
          }
        ]
      },
      options: barOptions()
    });
  }

  function renderMonthlyChart() {
    const months = monthsInScope();
    const values = months.map(m => Store.monthTotals(m.key).expense);

    drawChart('monthlyChart', {
      type: 'line',
      data: {
        labels: months.map(m => m.full),
        datasets: [{
          label: 'Expenses',
          data: values,
          borderColor: cssVar('--accent'),
          borderWidth: 3,
          tension: 0.38,
          fill: true,
          backgroundColor: ctx => {
            const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);
            g.addColorStop(0, 'rgba(139,124,248,0.34)');
            g.addColorStop(1, 'rgba(139,124,248,0)');
            return g;
          },
          pointRadius: 5,
          pointHoverRadius: 8,
          pointBackgroundColor: cssVar('--accent'),
          pointBorderColor: cssVar('--bg'),
          pointBorderWidth: 2
        }]
      },
      options: barOptions()
    });
  }

  function barOptions() {
    const dim = cssVar('--text-faint');
    const border = cssVar('--border');
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 750, easing: 'easeOutQuart' },
      plugins: {
        legend: {
          labels: { color: dim, usePointStyle: true, boxWidth: 8, font: { size: 12 } }
        },
        tooltip: {
          backgroundColor: '#101226',
          padding: 11,
          cornerRadius: 9,
          callbacks: { label: ctx => ` ${ctx.dataset.label}: ${Store.formatMoney(ctx.parsed.y ?? ctx.parsed)}` }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: dim, font: { size: 12 } }, border: { color: border } },
        y: {
          grid: { color: border },
          ticks: { color: dim, font: { size: 11.5 }, callback: v => Store.formatMoney(v) },
          border: { display: false }
        }
      }
    };
  }

  function drawChart(id, config) {
    destroyOne(id);
    const canvas = document.getElementById(id);
    if (!canvas || typeof Chart === 'undefined') return;
    const chart = new Chart(canvas, config);
    charts.push({ id, chart });
  }

  function destroyOne(id) {
    const idx = charts.findIndex(c => c.id === id);
    if (idx > -1) {
      charts[idx].chart.destroy();
      charts.splice(idx, 1);
    }
  }

  function renderRankings() {
    const months = new Set(monthsInScope().map(m => m.key));
    const txns = Store.listTransactions().filter(t => months.has(Store.monthKey(t.date)));

    const cats = Store.expensesByCategory(txns);
    const max = cats.length ? cats[0].amount : 1;

    $('#topCats').innerHTML = cats.length ? cats.slice(0, 6).map(c => `
      <div class="cat-budget" style="padding:10px 0">
        <div class="cat-budget-top">
          <b>${App.escapeHtml(c.category)}</b>
          <span class="amt num">${Store.formatMoney(c.amount)}</span>
          <span class="pct num">${Math.round((c.amount / max) * 100)}%</span>
        </div>
        <div class="progress">
          <div class="progress-bar" style="width:${(c.amount / max) * 100}%"></div>
        </div>
      </div>`).join('') : '<p class="muted small">No expenses in this period.</p>';

    const big = txns.filter(t => t.type === 'expense')
      .sort((a, b) => b.amount - a.amount).slice(0, 6);

    $('#bigExpenses').innerHTML = big.length ? big.map(t => `
      <div class="row" style="padding:10px 0; border-top:1px solid var(--border)">
        <span class="txn-icon tone-${Store.meta(t.category).tone}" style="width:36px;height:36px">
          ${App.icon(Store.meta(t.category).icon)}
        </span>
        <div style="min-width:0">
          <p class="txn-desc">${App.escapeHtml(t.description)}</p>
          <p class="small muted">${App.escapeHtml(t.category)} · ${new Date(t.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
        </div>
        <b class="right num">${Store.formatMoney(t.amount)}</b>
      </div>`).join('') : '<p class="muted small">No expenses in this period.</p>';
  }

  function renderAll() {
    renderMiniStats();
    renderCategoryChart();
    renderCompareChart();
    renderMonthlyChart();
    renderRankings();
  }

  function init() {
    App.boot({ title: 'Analytics', subtitle: 'Charts built from your real transactions' });

    const script = document.createElement('script');
    script.src = 'vendor/chart.umd.min.js';
    script.onload = renderAll;
    script.onerror = () => App.toast('Charts unavailable', 'Chart.js could not be loaded.', 'warn');
    document.head.appendChild(script);

    $('#rangeSelect').addEventListener('change', e => {
      range = Number(e.target.value);
      renderAll();
    });

    document.addEventListener('spendwise:updated', renderAll);
    Store.onChange(renderAll);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
