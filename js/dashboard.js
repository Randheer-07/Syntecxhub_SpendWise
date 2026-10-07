/* ==========================================================================
   dashboard.js — summary cards, recent list, budget snapshot, insights and
   the six month expense trend.
   ========================================================================== */

(() => {
  const $ = sel => document.querySelector(sel);

  function renderGreeting() {
    const hour = new Date().getHours();
    const part = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const name = (Store.state.settings.name || 'there').split(' ')[0];
    $('#greeting').textContent = `${part}, ${name}`;

    const count = Store.listTransactions().length;
    $('#introLine').textContent = count
      ? `You have ${count} transaction${count === 1 ? '' : 's'} recorded. Keep it up.`
      : 'Add your first transaction to start tracking.';
  }

  function renderStats() {
    const all = Store.totals();
    const month = Store.monthTotals(Store.currentMonthKey());
    const prevKey = prevMonthKey();
    const prev = Store.monthTotals(prevKey);
    const budget = Store.budgetState();

    App.animateNumber($('#statBalance'), all.balance, v => Store.formatMoney(v));
    App.animateNumber($('#statIncome'), all.income, v => Store.formatMoney(v));
    App.animateNumber($('#statExpense'), all.expense, v => Store.formatMoney(v));
    App.animateNumber($('#statMonth'), month.expense, v => Store.formatMoney(v));

    const savings = all.balance;
    const rate = all.income > 0 ? Math.round((savings / all.income) * 100) : 0;
    App.animateNumber($('#statSavings'), savings, v => Store.formatMoney(v));
    $('#statSavingsMeta').textContent = all.income > 0
      ? `${rate}% savings rate overall`
      : 'Income kept after expenses';

    App.animateNumber($('#statCount'), all.count, v => Math.round(v).toString());
    $('#statCountMeta').textContent = `${month.count} this month`;

    // month-over-month change on the "this month" card
    const meta = $('#statMonthMeta');
    if (prev.expense > 0) {
      const diff = ((month.expense - prev.expense) / prev.expense) * 100;
      const dir = diff >= 0 ? 'up' : 'down';
      meta.className = `stat-meta ${dir}`;
      meta.innerHTML = `${App.icon('trending-up', 'icon')} ${Math.abs(diff).toFixed(0)}% ${
        diff >= 0 ? 'higher' : 'lower'} than last month`;
    } else {
      meta.className = 'stat-meta';
      meta.textContent = 'Expenses in current month';
    }

    // budget card
    const leftEl = $('#statBudgetLeft');
    if (budget.total > 0) {
      App.animateNumber(leftEl, budget.remaining, v => Store.formatMoney(v));
      leftEl.classList.toggle('text-expense', budget.remaining < 0);
      $('#statBudgetMeta').textContent = `${Math.round(budget.percent)}% of ${Store.formatMoney(budget.total)} used`;
    } else {
      leftEl.textContent = '—';
      leftEl.classList.remove('text-expense');
      $('#statBudgetMeta').textContent = 'Set a budget in the Budget page';
    }
  }

  function prevMonthKey() {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function renderRecent() {
    const list = $('#recentList');
    const recent = Store.listTransactions()
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt))
      .slice(0, 6);

    if (!recent.length) {
      list.innerHTML = `
        <div class="empty">
          <span class="empty-icon">${App.icon('receipt')}</span>
          <h3>No transactions yet</h3>
          <p>Start by adding your first income or expense — the dashboard will light up instantly.</p>
          <button class="btn btn-primary" type="button" data-add-txn>${App.icon('plus', 'icon icon-sm')} Add your first transaction</button>
        </div>`;
      list.querySelector('[data-add-txn]').addEventListener('click', () =>
        App.openTransactionForm(null, refresh));
      return;
    }

    list.innerHTML = recent.map(t => {
      const meta = Store.meta(t.category);
      const sign = t.type === 'income' ? '+' : '−';
      return `
        <div class="txn-row">
          <span class="txn-icon tone-${meta.tone}">${App.icon(meta.icon)}</span>
          <div class="txn-main">
            <p class="txn-desc">${App.escapeHtml(t.description)}</p>
            <div class="txn-sub">
              <span>${App.escapeHtml(t.category)}</span>
              <span>·</span>
              <span>${formatDate(t.date)}</span>
            </div>
          </div>
          <div class="txn-meta-cell">
            <span class="badge ${t.type === 'income' ? 'badge-income' : 'badge-expense'}">${t.type}</span>
          </div>
          <p class="txn-amount num ${t.type === 'income' ? 'text-income' : 'text-expense'}">
            ${sign}${Store.formatMoney(t.amount)}
          </p>
        </div>`;
    }).join('');
  }

  function formatDate(iso) {
    const d = new Date(iso + 'T00:00:00');
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const same = (a, b) => a.toDateString() === b.toDateString();
    if (same(d, today)) return 'Today';
    if (same(d, yesterday)) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  function renderBudgetSnapshot() {
    const box = $('#dashBudget');
    const b = Store.budgetState();

    if (!b.total) {
      box.innerHTML = `
        <p class="muted small" style="margin-bottom:12px">You have not set a monthly budget yet.</p>
        <a class="btn btn-primary btn-block" href="budget.html">${App.icon('plus', 'icon icon-sm')} Set monthly budget</a>`;
      return;
    }

    const level = b.percent > 100 ? 'is-over' : b.percent >= 80 ? 'is-warn' : '';
    box.innerHTML = `
      <div class="budget-hero">
        <div>
          <p class="budget-amount num ${b.remaining < 0 ? 'text-expense' : ''}">${Store.formatMoney(b.remaining)}</p>
          <p class="small muted">remaining of ${Store.formatMoney(b.total)}</p>
        </div>
        <span class="badge ${b.percent > 100 ? 'badge-expense' : b.percent >= 80 ? 'badge-warn' : 'badge-teal'}">
          ${Math.round(b.percent)}% used
        </span>
      </div>
      <div class="progress" style="margin-top:14px" role="progressbar"
           aria-valuenow="${Math.round(b.percent)}" aria-valuemin="0" aria-valuemax="100"
           aria-label="Monthly budget usage">
        <div class="progress-bar ${level}" style="width:${Math.min(100, b.percent)}%"></div>
      </div>
      <p class="small muted" style="margin-top:10px">Spent ${Store.formatMoney(b.spent)} so far this month</p>`;
  }

  function renderInsights() {
    const box = $('#insightList');
    const insights = buildInsights();

    if (!insights.length) {
      box.innerHTML = `<p class="muted small">Add a few transactions and SpendWise will generate insights for you.</p>`;
      return;
    }

    box.innerHTML = insights.slice(0, 5).map(i => `
      <div class="insight">
        <span class="insight-i tone-${i.tone}">${App.icon(i.icon)}</span>
        <div class="insight-body">
          <strong>${i.text}</strong>
          <span>${i.sub}</span>
        </div>
      </div>`).join('');
  }

  function buildInsights() {
    const out = [];
    const key = Store.currentMonthKey();
    const monthTxns = Store.listTransactions().filter(t => Store.monthKey(t.date) === key);
    const month = Store.monthTotals(key);
    const prev = Store.monthTotals(prevMonthKey());
    const cats = Store.expensesByCategory(monthTxns);
    const budget = Store.budgetState();
    const all = Store.totals();

    if (!monthTxns.length && !all.count) return out;

    if (cats.length) {
      const top = cats[0];
      out.push({
        icon: 'chart-pie', tone: 'accent',
        text: `You spent ${Store.formatMoney(top.amount)} on ${top.category} this month.`,
        sub: `${top.category} is your highest spending category.`
      });

      const monthCats = cats.slice(0, 4).map(c => `${c.category} ${Store.formatMoney(c.amount)}`).join(', ');
      out.push({
        icon: 'receipt', tone: 'teal',
        text: `Month-to-date spending is ${Store.formatMoney(month.expense)}.`,
        sub: monthCats
      });
    }

    if (prev.expense > 0) {
      const diff = Math.round(((month.expense - prev.expense) / prev.expense) * 100);
      out.push({
        icon: diff >= 0 ? 'trending-up' : 'arrow-down-left',
        tone: diff >= 0 ? 'warn' : 'income',
        text: `Your expenses are ${Math.abs(diff)}% ${diff >= 0 ? 'higher' : 'lower'} than last month.`,
        sub: `${Store.formatMoney(prev.expense)} spent last month vs ${Store.formatMoney(month.expense)} this month.`
      });
    }

    if (budget.total > 0) {
      out.push({
        icon: budget.remaining < 0 ? 'triangle-alert' : 'wallet',
        tone: budget.remaining < 0 ? 'expense' : 'teal',
        text: budget.remaining >= 0
          ? `You have ${Store.formatMoney(budget.remaining)} remaining from your monthly budget.`
          : `You have overshot the budget by ${Store.formatMoney(Math.abs(budget.remaining))}.`,
        sub: `${Math.round(budget.percent)}% of ${Store.formatMoney(budget.total)} used.`
      });
    }

    if (all.income > 0) {
      const rate = Math.round((all.balance / all.income) * 100);
      out.push({
        icon: 'piggy-bank', tone: rate >= 20 ? 'income' : 'warn',
        text: `Your savings rate is ${rate}%.`,
        sub: `You kept ${Store.formatMoney(all.balance)} of ${Store.formatMoney(all.income)} earned.`
      });
    }

    const busiest = mostFrequentDay();
    if (busiest) {
      out.push({
        icon: 'calendar', tone: 'accent',
        text: `You spend the most on ${busiest.day}s.`,
        sub: `${busiest.count} transactions recorded on that weekday.`
      });
    }

    return out;
  }

  function mostFrequentDay() {
    const counts = {};
    Store.listTransactions().filter(t => t.type === 'expense').forEach(t => {
      const day = new Date(t.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long' });
      counts[day] = (counts[day] || 0) + 1;
    });
    const entries = Object.entries(counts);
    if (!entries.length) return null;
    const [day, count] = entries.sort((a, b) => b[1] - a[1])[0];
    return { day, count };
  }

  /* ------------------------------------------------------------ chart --- */

  let trendChart = null;

  function renderTrend() {
    const canvas = $('#trendChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const series = Store.monthlySeries(6);
    const expenses = series.map(s => s.expense);
    const incomes = series.map(s => s.income);

    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue('--accent').trim();
    const teal = styles.getPropertyValue('--teal').trim();
    const dim = styles.getPropertyValue('--text-faint').trim();
    const border = styles.getPropertyValue('--border').trim();

    const up = series.length > 1 && series[5].expense > series[4].expense;
    const badge = $('#trendBadge');
    if (badge) {
      badge.textContent = up ? 'Spending rising' : 'Spending easing';
      badge.className = `badge right ${up ? 'badge-warn' : 'badge-teal'}`;
    }

    if (trendChart) trendChart.destroy();

    trendChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: series.map(s => s.label),
        datasets: [
          {
            label: 'Expenses',
            data: expenses,
            backgroundColor: (ctx) => {
              const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 260);
              g.addColorStop(0, accent);
              g.addColorStop(1, 'rgba(139,124,248,0.15)');
              return g;
            },
            borderRadius: 8,
            borderSkipped: false,
            maxBarThickness: 34
          },
          {
            label: 'Income',
            data: incomes,
            type: 'line',
            borderColor: teal,
            backgroundColor: teal,
            borderWidth: 2.5,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: teal,
            pointBorderColor: '#0b0c18',
            pointBorderWidth: 2
          }
        ]
      },
      options: {
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
            titleFont: { size: 12.5 },
            bodyFont: { size: 12.5 },
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ${Store.formatMoney(ctx.parsed.y)}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: dim, font: { size: 12 } },
            border: { color: border }
          },
          y: {
            grid: { color: border },
            ticks: {
              color: dim,
              font: { size: 11.5 },
              callback: v => Store.formatMoney(v)
            },
            border: { display: false }
          }
        }
      }
    });
  }

  /* ------------------------------------------------------------- boot --- */

  function refresh() {
    renderGreeting();
    renderStats();
    renderRecent();
    renderBudgetSnapshot();
    renderInsights();
    renderTrend();
  }

  function init() {
    App.boot({ title: 'Dashboard', subtitle: 'Your money at a glance' });

    const chartScript = document.createElement('script');
    chartScript.src = 'vendor/chart.umd.min.js';
    chartScript.onload = refresh;
    chartScript.onerror = () => {
      refresh();
      App.toast('Charts unavailable', 'Chart.js could not be loaded.', 'warn');
    };
    document.head.appendChild(chartScript);

    document.addEventListener('spendwise:updated', refresh);
    Store.onChange(refresh);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
