/* ==========================================================================
   app.js — shared shell: theme, sidebar, header, toasts, modals and the
   transaction form used by every page.
   ========================================================================== */

const App = (() => {
  let txnModal = null;
  let confirmModal = null;
  let editingId = null;
  let onTxnSaved = null;

  /* ------------------------------------------------------------ theme --- */

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('themeToggle');
    if (btn) {
      btn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
      btn.setAttribute('data-tip', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
      const icon = btn.querySelector('use');
      if (icon) icon.setAttribute('href', theme === 'dark' ? '#i-sun' : '#i-moon');
    }
  }

  function initTheme() {
    applyTheme(Store.state.settings.theme);
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const next = Store.state.settings.theme === 'dark' ? 'light' : 'dark';
      Store.setSetting('theme', next);
      applyTheme(next);
      toast('Theme changed', `${next === 'dark' ? 'Dark' : 'Light'} mode is now active.`);
    });
  }

  /* ---------------------------------------------------------- sidebar --- */

  function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const openBtn = document.getElementById('menuBtn');
    const scrim = document.getElementById('scrim');
    if (!sidebar) return;

    const close = () => {
      sidebar.classList.remove('is-open');
      scrim && scrim.classList.remove('is-open');
      openBtn && openBtn.setAttribute('aria-expanded', 'false');
    };

    const open = () => {
      sidebar.classList.add('is-open');
      scrim && scrim.classList.add('is-open');
      openBtn && openBtn.setAttribute('aria-expanded', 'true');
    };

    openBtn && openBtn.addEventListener('click', () => {
      sidebar.classList.contains('is-open') ? close() : open();
    });
    scrim && scrim.addEventListener('click', close);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') close();
    });
    sidebar.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
  }

  /* ------------------------------------------------------------ toasts -- */

  function toast(title, message, kind = 'success') {
    let stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      stack.setAttribute('role', 'status');
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }

    const el = document.createElement('div');
    el.className = `toast ${kind === 'success' ? '' : kind}`.trim();
    const icon = kind === 'error' ? 'triangle-alert' : kind === 'warn' ? 'info' : 'circle-check';
    el.innerHTML = `
      <svg class="icon t-icon" aria-hidden="true"><use href="#i-${icon}"></use></svg>
      <div><strong>${escapeHtml(title)}</strong>${message ? `<span>${escapeHtml(message)}</span>` : ''}</div>`;
    stack.appendChild(el);

    setTimeout(() => {
      el.classList.add('is-out');
      setTimeout(() => el.remove(), 320);
    }, 3200);
  }

  /* ----------------------------------------------------------- modals --- */

  function buildModal(id, title, bodyHtml, footHtml) {
    const root = document.createElement('div');
    root.className = 'modal-root';
    root.id = id;
    root.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="${id}-title">
        <div class="modal-head">
          <h2 id="${id}-title">${title}</h2>
          <button class="icon-btn" data-close type="button" aria-label="Close dialog">
            <svg class="icon" aria-hidden="true"><use href="#i-x"></use></svg>
          </button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
        <div class="modal-foot">${footHtml}</div>
      </div>`;
    document.body.appendChild(root);

    root.addEventListener('click', e => {
      if (e.target === root || e.target.closest('[data-close]')) closeModal(root.id);
    });
    root.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeModal(root.id);
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
        const primary = root.querySelector('.modal-foot .btn-primary, .modal-foot .btn-danger');
        if (primary && root.contains(document.activeElement)) {
          e.preventDefault();
          primary.click();
        }
      }
    });
    return root;
  }

  function openModal(id) {
    const root = document.getElementById(id);
    if (!root) return;
    root.classList.add('is-open');
    const focusable = root.querySelector('input, select, textarea, button:not([data-close])');
    setTimeout(() => focusable && focusable.focus(), 60);
    document.body.style.overflow = 'hidden';
  }

  function closeModal(id) {
    const root = document.getElementById(id);
    if (!root) return;
    root.classList.remove('is-open');
    if (!document.querySelector('.modal-root.is-open')) document.body.style.overflow = '';
  }

  /* ----------------------------------------------- transaction form ----- */

  function transactionFormHtml() {
    return `
      <form id="txnForm" novalidate>
        <div class="form-grid">
          <div class="field span-2">
            <label>Type</label>
            <div class="segmented" id="txnType" role="group" aria-label="Transaction type">
              <button type="button" data-value="expense" aria-pressed="true">
                <svg class="icon icon-sm" aria-hidden="true"><use href="#i-arrow-down-left"></use></svg>
                Expense
              </button>
              <button type="button" data-value="income" aria-pressed="false">
                <svg class="icon icon-sm" aria-hidden="true"><use href="#i-arrow-up-right"></use></svg>
                Income
              </button>
            </div>
          </div>

          <div class="field">
            <label for="txnAmount">Amount</label>
            <input class="input" id="txnAmount" name="amount" type="number" min="0" step="0.01"
                   inputmode="decimal" placeholder="0" required />
            <span class="error-text" data-error="amount"></span>
          </div>

          <div class="field">
            <label for="txnDate">Date</label>
            <input class="input" id="txnDate" name="date" type="date" required />
            <span class="error-text" data-error="date"></span>
          </div>

          <div class="field">
            <label for="txnCategory">Category</label>
            <select class="select" id="txnCategory" name="category"></select>
            <span class="error-text" data-error="category"></span>
          </div>

          <div class="field">
            <label for="txnCustom">Custom category</label>
            <input class="input" id="txnCustom" name="custom" type="text"
                   placeholder="e.g. Pets, Gifts" list="catList" />
            <datalist id="catList"></datalist>
            <span class="option-hint">Leave blank to use the selected category</span>
          </div>

          <div class="field span-2">
            <label for="txnDesc">Description</label>
            <textarea class="textarea" id="txnDesc" name="description"
                      placeholder="What was this for?" required></textarea>
            <span class="error-text" data-error="description"></span>
          </div>
        </div>
      </form>`;
  }

  function initTransactionModal() {
    if (txnModal) return;

    txnModal = buildModal(
      'txnModal',
      'Add transaction',
      transactionFormHtml(),
      `<button class="btn btn-ghost" type="button" data-close>Cancel</button>
       <button class="btn btn-primary" type="submit" form="txnForm" id="txnSubmit">Save transaction</button>`
    );

    const form = txnModal.querySelector('#txnForm');
    const typeGroup = txnModal.querySelector('#txnType');
    const categorySel = txnModal.querySelector('#txnCategory');
    const customInput = txnModal.querySelector('#txnCustom');
    const datalist = txnModal.querySelector('#catList');

    typeGroup.addEventListener('click', e => {
      const btn = e.target.closest('button[data-value]');
      if (!btn) return;
      typeGroup.querySelectorAll('button').forEach(b =>
        b.setAttribute('aria-pressed', String(b === btn)));
      fillCategories(categorySel, btn.dataset.value);
      clearErrors(form);
    });

    customInput.addEventListener('input', () => {
      const val = customInput.value.trim();
      if (val && !Array.from(categorySel.options).some(o => o.value === val)) {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val + ' (custom)';
        categorySel.appendChild(opt);
      }
      if (val) categorySel.value = val;
    });

    form.addEventListener('submit', e => {
      e.preventDefault();
      submitTransaction(form, typeGroup);
    });
  }

  function fillCategories(select, type) {
    const current = select.value;
    const list = Store.categoriesForType(type);
    const custom = Store.state.customCategories;
    const merged = Array.from(new Set([...list, ...custom]));
    select.innerHTML = merged.map(c => `<option value="${c}">${c}</option>`).join('');
    if (merged.includes(current)) select.value = current;

    const datalist = document.getElementById('catList');
    if (datalist) {
      datalist.innerHTML = Store.categories().map(c => `<option value="${c}">`).join('');
    }
  }

  function clearErrors(form) {
    form.querySelectorAll('.error-text').forEach(el => el.textContent = '');
  }

  function submitTransaction(form, typeGroup) {
    clearErrors(form);

    const type = typeGroup.querySelector('[aria-pressed="true"]').dataset.value;
    const amount = parseFloat(form.amount.value);
    const date = form.date.value;
    const description = form.description.value.trim();
    let category = form.category.value;
    const custom = form.custom.value.trim();

    if (custom) category = custom;

    let ok = true;
    const fail = (name, msg) => {
      const slot = form.querySelector(`[data-error="${name}"]`);
      if (slot) slot.textContent = msg;
      ok = false;
    };

    if (!amount || amount <= 0) fail('amount', 'Enter an amount greater than 0.');
    if (!date) fail('date', 'Pick a date.');
    if (!category) fail('category', 'Choose a category.');
    if (!description) fail('description', 'Add a short description.');

    if (!ok) {
      toast('Check the form', 'Some fields need your attention.', 'warn');
      return;
    }

    if (custom) Store.addCustomCategory(custom);

    const payload = { type, amount, date, category, description };

    if (editingId) {
      Store.updateTransaction(editingId, payload);
      toast('Transaction updated', `${description} — ${Store.formatMoney(amount)}`);
    } else {
      Store.addTransaction(payload);
      toast('Transaction added', `${description} — ${Store.formatMoney(amount)}`);
    }

    closeModal('txnModal');
    if (onTxnSaved) onTxnSaved();
  }

  function openTransactionForm(txn, afterSave) {
    initTransactionModal();
    onTxnSaved = afterSave;
    editingId = txn ? txn.id : null;

    const modal = document.getElementById('txnModal');
    const form = modal.querySelector('#txnForm');
    const typeGroup = modal.querySelector('#txnType');
    const type = txn ? txn.type : 'expense';

    modal.querySelector('#txnModal-title').textContent = txn ? 'Edit transaction' : 'Add transaction';
    modal.querySelector('#txnSubmit').textContent = txn ? 'Save changes' : 'Save transaction';

    typeGroup.querySelectorAll('button').forEach(b =>
      b.setAttribute('aria-pressed', String(b.dataset.value === type)));

    fillCategories(modal.querySelector('#txnCategory'), type);
    clearErrors(form);

    form.amount.value = txn ? txn.amount : '';
    form.date.value = txn ? txn.date : new Date().toISOString().slice(0, 10);
    form.description.value = txn ? txn.description : '';
    form.custom.value = '';
    if (txn) {
      form.category.value = txn.category;
      if (!Array.from(form.category.options).some(o => o.value === txn.category)) {
        const opt = document.createElement('option');
        opt.value = txn.category;
        opt.textContent = txn.category;
        form.category.appendChild(opt);
        form.category.value = txn.category;
      }
    }

    openModal('txnModal');
    setTimeout(() => form.amount.focus(), 80);
  }

  /* ------------------------------------------------------ confirm box ---- */

  function confirmAction({ title, message, confirmText = 'Delete', danger = true }, onYes) {
    if (!confirmModal) {
      confirmModal = buildModal(
        'confirmModal',
        'Are you sure?',
        `<p id="confirmMsg" class="dim" style="font-size:14.5px"></p>`,
        `<button class="btn btn-ghost" type="button" data-close>Cancel</button>
         <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" type="button" id="confirmYes">Confirm</button>`
      );
      confirmModal.querySelector('#confirmYes').addEventListener('click', () => {
        const cb = confirmModal._cb;
        closeModal('confirmModal');
        if (cb) cb();
      });
    }

    confirmModal.querySelector('#confirmModal-title').textContent = title;
    confirmModal.querySelector('#confirmMsg').textContent = message;
    const yes = confirmModal.querySelector('#confirmYes');
    yes.textContent = confirmText;
    yes.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
    confirmModal._cb = onYes;
    openModal('confirmModal');
  }

  /* ------------------------------------------------------------ CSV ----- */

  function exportCSV() {
    const rows = Store.exportRows();
    if (!rows.length) {
      toast('Nothing to export', 'Add a transaction first.', 'warn');
      return;
    }

    const header = ['Date', 'Description', 'Category', 'Type', 'Amount'];
    const escape = v => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [header, ...rows].map(r => r.map(escape).join(',')).join('\r\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spendwise-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);

    toast('CSV exported', `${rows.length} transactions saved to your downloads.`);
  }

  /* --------------------------------------------------- page wiring ------ */

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function animateNumber(el, to, format) {
    const from = Number(el.dataset.value || 0);
    if (from === to) {
      el.textContent = format(to);
      return;
    }
    el.dataset.value = to;
    const start = performance.now();
    const dur = 650;

    const step = now => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = format(from + (to - from) * eased);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function icon(name, cls = 'icon') {
    return `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  }

  function bindGlobalShortcuts() {
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openTransactionForm(null, () => document.dispatchEvent(new CustomEvent('spendwise:updated')));
      }
    });
  }

  let booted = false;

  function boot({ title, subtitle } = {}) {
    if (booted) {
      if (title) document.getElementById('pageTitle').textContent = title;
      if (subtitle) document.getElementById('pageSub').textContent = subtitle;
      return;
    }
    booted = true;

    initTheme();
    initSidebar();
    bindGlobalShortcuts();

    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle && title) pageTitle.textContent = title;
    const pageSub = document.getElementById('pageSub');
    if (pageSub && subtitle) pageSub.textContent = subtitle;

    const userBtn = document.getElementById('userAvatar');
    if (userBtn) {
      const name = Store.state.settings.name || 'User';
      const initials = name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
      userBtn.textContent = initials;
      userBtn.setAttribute('aria-label', `Profile of ${name}`);
    }

    document.querySelectorAll('[data-export-csv]').forEach(btn =>
      btn.addEventListener('click', exportCSV));

    document.querySelectorAll('[data-add-txn]').forEach(btn =>
      btn.addEventListener('click', () =>
        openTransactionForm(null, () => document.dispatchEvent(new CustomEvent('spendwise:updated')))));
  }

  return {
    boot, toast, icon, escapeHtml,
    openTransactionForm, confirmAction, exportCSV,
    animateNumber, openModal, closeModal
  };
})();

document.addEventListener('DOMContentLoaded', () => App.boot());
