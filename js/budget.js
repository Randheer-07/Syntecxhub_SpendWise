/* ==========================================================================
   budget.js — monthly limit, category limits and usage alerts.
   ========================================================================== */

(() => {
  const $ = sel => document.querySelector(sel);

  function renderOverview() {
    const b = Store.budgetState();
    const monthLabel = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    $('#budgetMonthLabel').textContent = `Limits for ${monthLabel}. Everything updates live.`;

    if (!b.total) {
      $('#budgetMainLabel').textContent = 'No budget set yet';
      $('#budgetRemaining').textContent = '—';
      $('#budgetRemaining').classList.remove('text-expense');
      $('#budgetSpentLine').textContent = 'Add a monthly budget to start tracking.';
      $('#budgetPercent').textContent = '0% used';
      $('#budgetPercent').className = 'badge badge-neutral';
      $('#budgetBar').style.width = '0%';
      $('#legendSpent').textContent = Store.formatMoney(b.spent);
      $('#legendLeft').textContent = '—';
      $('#legendTotal').textContent = '—';
      $('#budgetAlert').innerHTML = '';
      $('#budgetInput').value = '';
      return;
    }

    const over = b.remaining < 0;
    $('#budgetMainLabel').textContent = over ? 'Overspent this month' : 'Remaining this month';
    $('#budgetRemaining').textContent = Store.formatMoney(Math.abs(b.remaining));
    $('#budgetRemaining').classList.toggle('text-expense', over);
    $('#budgetSpentLine').textContent = over
      ? `You have spent ${Store.formatMoney(b.spent)} of ${Store.formatMoney(b.total)}`
      : `Spent ${Store.formatMoney(b.spent)} of ${Store.formatMoney(b.total)}`;

    const pct = Math.round(b.percent);
    const badge = $('#budgetPercent');
    badge.textContent = `${pct}% used`;
    badge.className = `badge ${b.percent > 100 ? 'badge-expense' : b.percent >= 80 ? 'badge-warn' : 'badge-teal'}`;

    const bar = $('#budgetBar');
    bar.style.width = `${Math.min(100, b.percent)}%`;
    bar.className = `progress-bar ${b.percent > 100 ? 'is-over' : b.percent >= 80 ? 'is-warn' : ''}`;
    bar.parentElement.setAttribute('aria-valuenow', String(pct));

    $('#legendSpent').textContent = Store.formatMoney(b.spent);
    $('#legendLeft').textContent = Store.formatMoney(b.remaining);
    $('#legendTotal').textContent = Store.formatMoney(b.total);

    $('#budgetInput').value = b.total;
    renderAlert();
  }

  function renderAlert() {
    const alert = Store.budgetAlert();
    const box = $('#budgetAlert');
    if (!alert) {
      box.innerHTML = '';
      return;
    }
    const iconName = alert.level === 'ok' ? 'circle-check' : 'triangle-alert';
    box.innerHTML = `
      <div class="alert ${alert.level === 'danger' ? 'danger' : alert.level === 'ok' ? 'ok' : ''}">
        ${App.icon(iconName)}
        <div>
          <strong>${alert.title}</strong>
          <span>${alert.message}</span>
        </div>
      </div>`;
  }

  function fillCategorySelect() {
    const sel = $('#catSelect');
    const current = sel.value;
    const options = Store.EXPENSE_CATEGORIES.filter(c => !Store.state.budget.categories[c]);
    const custom = Store.state.customCategories.filter(c => !Store.state.budget.categories[c]);
    const merged = [...options, ...custom];

    sel.innerHTML = merged.length
      ? merged.map(c => `<option value="${App.escapeHtml(c)}">${App.escapeHtml(c)}</option>`).join('')
      : '<option value="">All categories have a limit</option>';

    if (merged.includes(current)) sel.value = current;
    $('#catBudgetCount').textContent = `${Object.keys(Store.state.budget.categories).length} limit(s) active`;
  }

  function renderCategoryBudgets() {
    fillCategorySelect();

    const list = $('#catBudgetList');
    const b = Store.budgetState();

    if (!b.categoryBudgets.length) {
      list.innerHTML = `
        <div class="empty" style="padding:32px 16px">
          <span class="empty-icon">${App.icon('sliders-horizontal')}</span>
          <h3>No category budgets yet</h3>
          <p>Pick a category above and give it a monthly limit — e.g. Food → ₹5,000.</p>
        </div>`;
      return;
    }

    list.innerHTML = b.categoryBudgets.map(cb => {
      const meta = Store.meta(cb.category);
      const level = cb.percent > 100 ? 'is-over' : cb.percent >= 80 ? 'is-warn' : '';
      const tone = cb.percent > 100 ? 'badge-expense' : cb.percent >= 80 ? 'badge-warn' : 'badge-teal';
      return `
        <div class="cat-budget" data-cat="${App.escapeHtml(cb.category)}">
          <div class="cat-budget-top">
            <span class="txn-icon tone-${meta.tone}" style="width:30px;height:30px;border-radius:9px">
              ${App.icon(meta.icon, 'icon icon-sm')}
            </span>
            <b>${App.escapeHtml(cb.category)}</b>
            <span class="badge ${tone}">${Math.round(cb.percent)}%</span>
            <span class="amt num">${Store.formatMoney(cb.used)} / ${Store.formatMoney(cb.limit)}</span>
            <span class="pct num ${cb.remaining < 0 ? 'text-expense' : ''}">
              ${cb.remaining >= 0 ? Store.formatMoney(cb.remaining) + ' left' : 'over'}
            </span>
            <button class="icon-btn" type="button" data-remove="${App.escapeHtml(cb.category)}"
                    data-tip="Remove limit" aria-label="Remove ${App.escapeHtml(cb.category)} budget"
                    style="width:30px;height:30px">
              ${App.icon('trash-2', 'icon icon-sm')}
            </button>
          </div>
          <div class="progress">
            <div class="progress-bar ${level}" style="width:${Math.min(100, cb.percent)}%"></div>
          </div>
        </div>`;
    }).join('');

    list.querySelectorAll('[data-remove]').forEach(btn =>
      btn.addEventListener('click', () => {
        const cat = btn.dataset.remove;
        App.confirmAction({
          title: 'Remove category budget?',
          message: `The limit on ${cat} will be removed. Transactions stay untouched.`,
          confirmText: 'Remove'
        }, () => {
          Store.setCategoryBudget(cat, 0);
          App.toast('Category budget removed', `${cat} no longer has a limit.`);
          renderAll();
        });
      }));
  }

  function renderAll() {
    renderOverview();
    renderCategoryBudgets();
  }

  function init() {
    App.boot({ title: 'Budget', subtitle: 'Monthly and category limits' });

    $('#budgetForm').addEventListener('submit', e => {
      e.preventDefault();
      const raw = $('#budgetInput').value.trim();
      const amount = parseFloat(raw);
      const errSlot = $('[data-error="budget"]');
      errSlot.textContent = '';

      if (raw === '' || isNaN(amount) || amount < 0) {
        errSlot.textContent = 'Enter a valid amount.';
        return;
      }

      Store.setMonthlyBudget(amount);
      App.toast('Budget updated', `Monthly budget set to ${Store.formatMoney(amount)}.`);
      renderAll();
    });

    document.querySelectorAll('[data-quick]').forEach(btn =>
      btn.addEventListener('click', () => {
        $('#budgetInput').value = btn.dataset.quick;
        Store.setMonthlyBudget(Number(btn.dataset.quick));
        App.toast('Budget updated', `Monthly budget set to ${Store.formatMoney(Number(btn.dataset.quick))}.`);
        renderAll();
      }));

    $('#catBudgetForm').addEventListener('submit', e => {
      e.preventDefault();
      const cat = $('#catSelect').value;
      const limit = parseFloat($('#catLimit').value);
      if (!cat) return;
      if (!limit || limit <= 0) {
        App.toast('Enter a limit', 'Category budget must be greater than 0.', 'warn');
        return;
      }
      Store.setCategoryBudget(cat, limit);
      $('#catLimit').value = '';
      App.toast('Category budget saved', `${cat} capped at ${Store.formatMoney(limit)}.`);
      renderAll();
    });

    document.addEventListener('spendwise:updated', renderAll);
    Store.onChange(renderAll);
    renderAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
