/* ==========================================================================
   transactions.js — history table: search, filters, sorting, edit, delete.
   ========================================================================== */

(() => {
  const $ = sel => document.querySelector(sel);

  const PAGE_SIZE = 12;
  let page = 1;
  let filtered = [];

  const filters = {
    search: '',
    type: 'all',
    category: 'all',
    month: 'all',
    sort: 'newest'
  };

  function fillFilterOptions() {
    const catSel = $('#categoryFilter');
    const monthSel = $('#monthFilter');
    const used = new Set(Store.listTransactions().map(t => t.category));

    const currentCat = catSel.value;
    catSel.innerHTML = '<option value="all">All categories</option>' +
      Array.from(used).sort().map(c => `<option value="${App.escapeHtml(c)}">${App.escapeHtml(c)}</option>`).join('');
    if (used.has(currentCat)) catSel.value = currentCat;

    const months = Array.from(new Set(Store.listTransactions().map(t => Store.monthKey(t.date))))
      .sort().reverse();
    const currentMonth = monthSel.value;
    monthSel.innerHTML = '<option value="all">All dates</option>' +
      months.map(m => {
        const [y, mm] = m.split('-');
        const label = new Date(Number(y), Number(mm) - 1, 1)
          .toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
        return `<option value="${m}">${label}</option>`;
      }).join('');
    if (months.includes(currentMonth)) monthSel.value = currentMonth;
  }

  function applyFilters() {
    let rows = Store.listTransactions();

    if (filters.search) {
      const q = filters.search.toLowerCase();
      rows = rows.filter(t =>
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q));
    }
    if (filters.type !== 'all') rows = rows.filter(t => t.type === filters.type);
    if (filters.category !== 'all') rows = rows.filter(t => t.category === filters.category);
    if (filters.month !== 'all') rows = rows.filter(t => Store.monthKey(t.date) === filters.month);

    rows.sort((a, b) => {
      switch (filters.sort) {
        case 'oldest': return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
        case 'high': return b.amount - a.amount;
        case 'low': return a.amount - b.amount;
        default: return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
      }
    });

    filtered = rows;
  }

  function render() {
    fillFilterOptions();
    applyFilters();

    const body = $('#txnBody');
    const empty = $('#txnEmpty');
    const foot = $('#txnFoot');
    const table = $('#txnTable');

    const total = filtered.length;
    const income = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    $('#txnCountLine').textContent = total
      ? `${total} transaction${total === 1 ? '' : 's'} · ${Store.formatMoney(income)} in · ${Store.formatMoney(expense)} out`
      : 'Everything you have recorded, in one place.';

    if (!Store.listTransactions().length) {
      table.style.display = 'none';
      foot.style.display = 'none';
      empty.innerHTML = `
        <div class="empty">
          <span class="empty-icon">${App.icon('receipt')}</span>
          <h3>No transactions yet</h3>
          <p>Start by adding your first transaction — income or expense, it takes a few seconds.</p>
          <button class="btn btn-primary" type="button" id="emptyAdd">${App.icon('plus', 'icon icon-sm')} Add your first transaction</button>
        </div>`;
      $('#emptyAdd').addEventListener('click', () => App.openTransactionForm(null, render));
      return;
    }

    if (!total) {
      table.style.display = 'none';
      foot.style.display = 'none';
      empty.innerHTML = `
        <div class="empty">
          <span class="empty-icon">${App.icon('search')}</span>
          <h3>Nothing matches those filters</h3>
          <p>Try a different search term, type or month.</p>
          <button class="btn" type="button" id="clearFilters">Clear filters</button>
        </div>`;
      $('#clearFilters').addEventListener('click', resetFilters);
      return;
    }

    empty.innerHTML = '';
    table.style.display = '';

    const start = (page - 1) * PAGE_SIZE;
    const rows = filtered.slice(start, start + PAGE_SIZE);

    body.innerHTML = rows.map(t => {
      const meta = Store.meta(t.category);
      const d = new Date(t.date + 'T00:00:00');
      return `
        <tr data-id="${t.id}">
          <td data-label="Date">${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
          <td data-label="Description">${App.escapeHtml(t.description)}</td>
          <td data-label="Category">
            <span class="badge badge-neutral">${App.icon(meta.icon, 'icon icon-sm')} ${App.escapeHtml(t.category)}</span>
          </td>
          <td data-label="Type">
            <span class="badge ${t.type === 'income' ? 'badge-income' : 'badge-expense'}">${t.type}</span>
          </td>
          <td data-label="Amount" class="amount num ${t.type === 'income' ? 'text-income' : 'text-expense'}">
            ${t.type === 'income' ? '+' : '−'}${Store.formatMoney(t.amount)}
          </td>
          <td data-label="Actions" class="actions">
            <span class="row-actions">
              <button class="icon-btn" type="button" data-edit="${t.id}"
                      data-tip="Edit" aria-label="Edit ${App.escapeHtml(t.description)}">
                ${App.icon('pencil')}
              </button>
              <button class="icon-btn danger" type="button" data-del="${t.id}"
                      data-tip="Delete" aria-label="Delete ${App.escapeHtml(t.description)}">
                ${App.icon('trash-2')}
              </button>
            </span>
          </td>
        </tr>`;
    }).join('');

    const showing = Math.min(start + PAGE_SIZE, total);
    const pages = Math.ceil(total / PAGE_SIZE);

    foot.style.display = 'flex';
    foot.innerHTML = `
      <span>Showing <b class="dim">${start + 1}–${showing}</b> of <b class="dim">${total}</b></span>
      <span class="right row" style="gap:8px">
        <button class="btn btn-sm" type="button" id="prevPage" ${page === 1 ? 'disabled' : ''}>Previous</button>
        <span class="muted small">Page ${page} / ${pages}</span>
        <button class="btn btn-sm" type="button" id="nextPage" ${showing >= total ? 'disabled' : ''}>Next</button>
      </span>`;

    $('#prevPage').addEventListener('click', () => { page--; render(); scrollToTable(); });
    $('#nextPage').addEventListener('click', () => { page++; render(); scrollToTable(); });

    body.querySelectorAll('[data-edit]').forEach(btn =>
      btn.addEventListener('click', () => {
        const txn = Store.getTransaction(btn.dataset.edit);
        if (txn) App.openTransactionForm(txn, render);
      }));

    body.querySelectorAll('[data-del]').forEach(btn =>
      btn.addEventListener('click', () => {
        const txn = Store.getTransaction(btn.dataset.del);
        if (!txn) return;
        App.confirmAction({
          title: 'Delete transaction?',
          message: `"${txn.description}" (${Store.formatMoney(txn.amount)}) will be removed permanently.`,
          confirmText: 'Delete'
        }, () => {
          Store.deleteTransaction(txn.id);
          App.toast('Transaction deleted', txn.description);
          render();
        });
      }));
  }

  function scrollToTable() {
    $('#txnTable').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function resetFilters() {
    filters.search = '';
    filters.type = 'all';
    filters.category = 'all';
    filters.month = 'all';
    filters.sort = 'newest';
    page = 1;

    $('#searchInput').value = '';
    $('#typeFilter').value = 'all';
    $('#categoryFilter').value = 'all';
    $('#monthFilter').value = 'all';
    $('#sortSelect').value = 'newest';
    render();
  }

  function init() {
    App.boot({ title: 'Transactions', subtitle: 'Search, filter and manage your history' });

    let debounce;
    $('#searchInput').addEventListener('input', e => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        filters.search = e.target.value.trim();
        page = 1;
        render();
      }, 180);
    });

    $('#typeFilter').addEventListener('change', e => { filters.type = e.target.value; page = 1; render(); });
    $('#categoryFilter').addEventListener('change', e => { filters.category = e.target.value; page = 1; render(); });
    $('#monthFilter').addEventListener('change', e => { filters.month = e.target.value; page = 1; render(); });
    $('#sortSelect').addEventListener('change', e => { filters.sort = e.target.value; page = 1; render(); });
    $('#resetFilters').addEventListener('click', resetFilters);

    document.addEventListener('spendwise:updated', render);
    Store.onChange(render);
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
