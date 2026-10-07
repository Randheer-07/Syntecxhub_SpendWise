/* ==========================================================================
   savings.js — goal ring, contributions and milestone feedback.
   ========================================================================== */

(() => {
  const $ = sel => document.querySelector(sel);
  const CIRCUMFERENCE = 2 * Math.PI * 52;

  function renderGoal() {
    const g = Store.savingsProgress();
    const ring = $('#goalRing');

    const pct = g.target > 0 ? g.percent : 0;
    ring.style.strokeDashoffset = String(CIRCUMFERENCE - (CIRCUMFERENCE * pct) / 100);

    $('#goalPercent').textContent = `${Math.round(pct)}%`;
    $('#goalName').textContent = g.name || 'No goal yet';

    $('#goalTarget').textContent = g.target ? Store.formatMoney(g.target) : '—';
    $('#goalSaved').textContent = Store.formatMoney(g.saved);
    $('#goalRemaining').textContent = g.target ? Store.formatMoney(g.remaining) : '—';

    const status = $('#goalStatus');
    if (!g.target) {
      status.textContent = 'Set a goal';
      status.className = 'muted';
    } else if (pct >= 100) {
      status.textContent = 'Completed!';
      status.className = 'text-income';
    } else if (pct >= 60) {
      status.textContent = 'Nearly there';
      status.className = 'text-teal';
    } else if (pct > 0) {
      status.textContent = 'In progress';
      status.className = 'dim';
    } else {
      status.textContent = 'Not started';
      status.className = 'muted';
    }
  }

  function renderInsights() {
    const box = $('#goalInsights');
    const g = Store.savingsProgress();

    if (!g.target) {
      box.innerHTML = `
        <div class="empty" style="padding:26px 10px">
          <span class="empty-icon">${App.icon('target')}</span>
          <h3>No savings goal yet</h3>
          <p>Click “Edit goal” to name a target like an Emergency Fund of ₹50,000.</p>
        </div>`;
      return;
    }

    const items = [];

    items.push({
      icon: 'wallet', tone: 'teal',
      title: `${Math.round(g.percent)}% of the way there`,
      sub: `${Store.formatMoney(g.saved)} saved of ${Store.formatMoney(g.target)}.`
    });

    if (g.remaining > 0) {
      const monthly = Store.monthTotals(Store.currentMonthKey());
      const surplus = monthly.income - monthly.expense;
      if (surplus > 0) {
        const months = Math.ceil(g.remaining / surplus);
        items.push({
          icon: 'calendar', tone: 'accent',
          title: `You could finish in about ${months} month${months === 1 ? '' : 's'}`,
          sub: `At your current pace of saving ${Store.formatMoney(surplus)} per month.`
        });
      } else {
        items.push({
          icon: 'triangle-alert', tone: 'warn',
          title: `You need ${Store.formatMoney(g.remaining)} more`,
          sub: 'This month you are spending more than you earn — trim expenses first.'
        });
      }
    } else {
      items.push({
        icon: 'circle-check', tone: 'income',
        title: 'Goal reached — well done',
        sub: 'Consider starting a new goal or raising this target.'
      });
    }

    items.push({
      icon: 'piggy-bank', tone: 'accent',
      title: `Daily target: ${Store.formatMoney(Math.ceil(g.remaining / 30))}`,
      sub: 'Set aside this much each day to hit the goal within a month.'
    });

    box.innerHTML = items.map(i => `
      <div class="insight">
        <span class="insight-i tone-${i.tone}">${App.icon(i.icon)}</span>
        <div class="insight-body">
          <strong>${i.title}</strong>
          <span>${i.sub}</span>
        </div>
      </div>`).join('');
  }

  function render() {
    renderGoal();
    renderInsights();
  }

  function bump(delta) {
    if (!delta) return;
    const g = Store.savingsProgress();
    if (!g.target) {
      App.toast('Set a goal first', 'A savings goal needs a target amount.', 'warn');
      return;
    }
    Store.adjustSavings(delta);
    App.toast(
      delta > 0 ? 'Savings updated' : 'Amount withdrawn',
      `${delta > 0 ? '+' : '−'}${Store.formatMoney(Math.abs(delta))} — total ${Store.formatMoney(Store.savingsProgress().saved)}.`
    );
    render();
  }

  function openGoalEditor() {
    const g = Store.savingsProgress();

    const root = document.createElement('div');
    root.className = 'modal-root is-open';
    root.id = 'goalModal';
    root.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="goalModalTitle">
        <div class="modal-head">
          <h2 id="goalModalTitle">Edit savings goal</h2>
          <button class="icon-btn" type="button" data-close aria-label="Close dialog">
            ${App.icon('x')}
          </button>
        </div>
        <div class="modal-body">
          <form id="goalForm" class="stack" novalidate>
            <div class="field">
              <label for="goalNameInput">Goal name</label>
              <input class="input" id="goalNameInput" type="text" maxlength="40"
                     placeholder="e.g. Emergency Fund" value="${App.escapeHtml(g.name || '')}" />
              <span class="error-text" data-error="name"></span>
            </div>
            <div class="form-grid">
              <div class="field">
                <label for="goalTargetInput">Target amount</label>
                <input class="input" id="goalTargetInput" type="number" min="0" step="100"
                       inputmode="numeric" value="${g.target || ''}" />
                <span class="error-text" data-error="target"></span>
              </div>
              <div class="field">
                <label for="goalSavedInput">Currently saved</label>
                <input class="input" id="goalSavedInput" type="number" min="0" step="100"
                       inputmode="numeric" value="${g.saved || ''}" />
                <span class="error-text" data-error="saved"></span>
              </div>
            </div>
          </form>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" type="button" data-close>Cancel</button>
          <button class="btn btn-primary" type="submit" form="goalForm">Save goal</button>
        </div>
      </div>`;
    document.body.appendChild(root);

    const close = () => {
      root.remove();
      document.body.style.overflow = '';
    };

    root.addEventListener('click', e => {
      if (e.target === root || e.target.closest('[data-close]')) close();
    });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape' && document.body.contains(root)) {
        close();
        document.removeEventListener('keydown', esc);
      }
    });

    const form = root.querySelector('#goalForm');
    form.addEventListener('submit', e => {
      e.preventDefault();
      form.querySelectorAll('.error-text').forEach(el => el.textContent = '');

      const name = root.querySelector('#goalNameInput').value.trim();
      const target = parseFloat(root.querySelector('#goalTargetInput').value);
      const saved = parseFloat(root.querySelector('#goalSavedInput').value);
      let ok = true;

      if (!name) {
        form.querySelector('[data-error="name"]').textContent = 'Give your goal a name.';
        ok = false;
      }
      if (!target || target <= 0) {
        form.querySelector('[data-error="target"]').textContent = 'Target must be greater than 0.';
        ok = false;
      }
      if (isNaN(saved) || saved < 0) {
        form.querySelector('[data-error="saved"]').textContent = 'Enter 0 or more.';
        ok = false;
      }
      if (!ok) return;

      Store.setSavingsGoal({ name, target, saved });
      App.toast('Savings goal saved', `${name} — ${Store.formatMoney(saved)} of ${Store.formatMoney(target)}.`);
      close();
      render();
    });

    setTimeout(() => root.querySelector('#goalNameInput').focus(), 60);
  }

  function init() {
    App.boot({ title: 'Savings Goal', subtitle: 'Work towards your target' });

    $('#editGoal').addEventListener('click', openGoalEditor);

    $('#addSaved').addEventListener('click', () => {
      const value = parseFloat($('#customBump').value);
      if (value > 0) {
        bump(value);
        $('#customBump').value = '';
      } else {
        bump(1000);
      }
    });

    $('#removeSaved').addEventListener('click', () => {
      const value = parseFloat($('#customBump').value);
      bump(value > 0 ? -value : -500);
      $('#customBump').value = '';
    });

    $('#applyBump').addEventListener('click', () => {
      const value = parseFloat($('#customBump').value);
      if (!value || value <= 0) {
        App.toast('Enter an amount', 'Type a positive number to add.', 'warn');
        return;
      }
      bump(value);
      $('#customBump').value = '';
    });

    $('#customBump').addEventListener('keydown', e => {
      if (e.key === 'Enter') $('#applyBump').click();
    });

    document.querySelectorAll('[data-bump]').forEach(btn =>
      btn.addEventListener('click', () => bump(Number(btn.dataset.bump))));

    $('#resetGoal').addEventListener('click', () => {
      App.confirmAction({
        title: 'Reset savings goal?',
        message: 'The goal name, target and saved amount will all be cleared.',
        confirmText: 'Reset goal'
      }, () => {
        Store.setSavingsGoal({ name: '', target: 0, saved: 0 });
        App.toast('Goal reset', 'Set a new target whenever you are ready.');
        render();
      });
    });

    Store.onChange(render);
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
