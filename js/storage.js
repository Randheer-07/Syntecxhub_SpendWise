/* ==========================================================================
   storage.js — all persistence and calculations live here.
   Everything is kept in one localStorage document so pages stay in sync.
   ========================================================================== */

const Store = (() => {
  const KEY = 'spendwise.v1';

  const DEFAULT_CATEGORIES = [
    'Food', 'Transport', 'Shopping', 'Bills', 'Entertainment',
    'Health', 'Education', 'Salary', 'Freelance', 'Other'
  ];

  const EXPENSE_CATEGORIES = [
    'Food', 'Transport', 'Shopping', 'Bills', 'Entertainment',
    'Health', 'Education', 'Other'
  ];

  const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Other'];

  const CURRENCIES = {
    INR: { symbol: '₹', locale: 'en-IN' },
    USD: { symbol: '$', locale: 'en-US' },
    EUR: { symbol: '€', locale: 'en-DE' },
    GBP: { symbol: '£', locale: 'en-GB' }
  };

  const CATEGORY_META = {
    Food:          { icon: 'utensils',      tone: 'expense' },
    Transport:     { icon: 'car',           tone: 'accent' },
    Shopping:      { icon: 'shopping-bag',  tone: 'warn' },
    Bills:         { icon: 'house',         tone: 'teal' },
    Entertainment: { icon: 'film',          tone: 'accent' },
    Health:        { icon: 'heart-pulse',   tone: 'income' },
    Education:     { icon: 'graduation-cap',tone: 'teal' },
    Salary:        { icon: 'briefcase',     tone: 'income' },
    Freelance:     { icon: 'zap',           tone: 'teal' },
    Other:         { icon: 'wallet',        tone: 'accent' }
  };

  let state = null;
  const listeners = [];

  function blankState() {
    return {
      transactions: [],
      budget: { monthly: 0, categories: {} },
      savingsGoal: { name: '', target: 0, saved: 0 },
      settings: { theme: 'dark', currency: 'INR', name: 'Randheer' },
      customCategories: []
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state = Object.assign(blankState(), parsed);
        state.settings = Object.assign(blankState().settings, parsed.settings || {});
        state.budget = Object.assign(blankState().budget, parsed.budget || {});
        state.savingsGoal = Object.assign(blankState().savingsGoal, parsed.savingsGoal || {});
      } else {
        state = blankState();
        seedSampleData();
        save();
      }
    } catch (err) {
      console.warn('SpendWise: could not read saved data, starting fresh.', err);
      state = blankState();
    }
    return state;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      console.error('SpendWise: failed to persist data.', err);
    }
    listeners.forEach(fn => fn(state));
  }

  function onChange(fn) {
    listeners.push(fn);
  }

  /* ------------------------------------------------------------ money --- */

  function currency() {
    return CURRENCIES[state.settings.currency] || CURRENCIES.INR;
  }

  function formatMoney(value, opts = {}) {
    const cur = currency();
    const abs = Math.abs(Number(value) || 0);
    const digits = opts.decimals || (abs % 1 === 0 ? 0 : 2);
    const body = abs.toLocaleString(cur.locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
    const sign = opts.signed && value > 0 ? '+' : value < 0 ? '-' : '';
    return `${sign}${cur.symbol}${body}`;
  }

  /* ----------------------------------------------------- transactions --- */

  function uid() {
    return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function listTransactions() {
    return state.transactions.slice();
  }

  function addTransaction(txn) {
    const entry = Object.assign({ id: uid(), createdAt: Date.now() }, txn);
    state.transactions.push(entry);
    save();
    return entry;
  }

  function updateTransaction(id, patch) {
    const idx = state.transactions.findIndex(t => t.id === id);
    if (idx === -1) return null;
    state.transactions[idx] = Object.assign({}, state.transactions[idx], patch);
    save();
    return state.transactions[idx];
  }

  function deleteTransaction(id) {
    const before = state.transactions.length;
    state.transactions = state.transactions.filter(t => t.id !== id);
    save();
    return state.transactions.length < before;
  }

  function getTransaction(id) {
    return state.transactions.find(t => t.id === id) || null;
  }

  /* ------------------------------------------------------- calculations -- */

  function monthKey(dateStr) {
    return String(dateStr).slice(0, 7); // YYYY-MM
  }

  function currentMonthKey() {
    return monthKey(new Date().toISOString().slice(0, 10));
  }

  function totals(txns = state.transactions) {
    let income = 0, expense = 0;
    txns.forEach(t => {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    });
    return {
      income,
      expense,
      balance: income - expense,
      count: txns.length
    };
  }

  function monthTotals(key) {
    return totals(state.transactions.filter(t => monthKey(t.date) === key));
  }

  function expensesByCategory(txns = state.transactions) {
    const map = {};
    txns.filter(t => t.type === 'expense').forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return Object.entries(map)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }

  function monthlySeries(monthCount = 6) {
    const out = [];
    const now = new Date();
    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const t = monthTotals(key);
      out.push({
        key,
        label: d.toLocaleDateString('en-IN', { month: 'short' }),
        fullLabel: d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
        income: t.income,
        expense: t.expense
      });
    }
    return out;
  }

  /* ----------------------------------------------------------- budget --- */

  function setMonthlyBudget(amount) {
    state.budget.monthly = Math.max(0, Number(amount) || 0);
    save();
  }

  function setCategoryBudget(category, amount) {
    if (!amount || Number(amount) <= 0) delete state.budget.categories[category];
    else state.budget.categories[category] = Number(amount);
    save();
  }

  function budgetState() {
    const month = monthTotals(currentMonthKey());
    const total = state.budget.monthly || 0;
    const spent = month.expense;
    const remaining = total - spent;
    const percent = total > 0 ? (spent / total) * 100 : 0;

    const cats = Object.entries(state.budget.categories).map(([category, limit]) => {
      const used = state.transactions
        .filter(t => t.type === 'expense' && t.category === category &&
          monthKey(t.date) === currentMonthKey())
        .reduce((sum, t) => sum + t.amount, 0);
      return {
        category,
        limit,
        used,
        remaining: limit - used,
        percent: limit > 0 ? (used / limit) * 100 : 0
      };
    });

    return { total, spent, remaining, percent, categoryBudgets: cats, income: month.income };
  }

  function budgetAlert() {
    const b = budgetState();
    if (b.total <= 0) return null;
    if (b.percent > 100) {
      return {
        level: 'danger',
        title: 'Monthly budget exceeded',
        message: `You are ${formatMoney(b.spent - b.total)} over your ${formatMoney(b.total)} budget.`
      };
    }
    if (b.percent >= 80) {
      return {
        level: 'warn',
        title: 'Close to your monthly budget',
        message: `Only ${formatMoney(b.remaining)} left — you have used ${Math.round(b.percent)}% of your budget.`
      };
    }
    return {
      level: 'ok',
      title: 'Budget on track',
      message: `${formatMoney(b.remaining)} still available this month.`
    };
  }

  /* ------------------------------------------------------ savings goal --- */

  function setSavingsGoal(goal) {
    state.savingsGoal = Object.assign({ name: '', target: 0, saved: 0 }, goal);
    save();
  }

  function adjustSavings(delta) {
    const g = state.savingsGoal;
    g.saved = Math.max(0, (g.saved || 0) + Number(delta || 0));
    save();
  }

  function savingsProgress() {
    const g = state.savingsGoal;
    const target = g.target || 0;
    const saved = g.saved || 0;
    return {
      name: g.name,
      target,
      saved,
      remaining: Math.max(0, target - saved),
      percent: target > 0 ? Math.min(100, (saved / target) * 100) : 0
    };
  }

  /* -------------------------------------------------------- settings ---- */

  function setSetting(key, value) {
    state.settings[key] = value;
    save();
  }

  function categories() {
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...state.customCategories]));
  }

  function addCustomCategory(name) {
    const clean = String(name || '').trim();
    if (!clean || DEFAULT_CATEGORIES.includes(clean)) return;
    if (!state.customCategories.includes(clean)) {
      state.customCategories.push(clean);
      save();
    }
  }

  function categoriesForType(type) {
    return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  }

  function meta(category) {
    return CATEGORY_META[category] || CATEGORY_META.Other;
  }

  /* ------------------------------------------------------ export / wipe -- */

  function exportRows() {
    return state.transactions
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .map(t => [t.date, t.description, t.category, t.type, t.amount]);
  }

  function clearAll() {
    const theme = state.settings.theme;
    state = blankState();
    state.settings.theme = theme;
    save();
  }

  /* --------------------------------------------------------- seed data --- */

  function seedSampleData() {
    const day = (offset) => {
      const d = new Date();
      d.setDate(d.getDate() - offset);
      return d.toISOString().slice(0, 10);
    };

    const samples = [
      ['income', 52000, 'Salary', 'Monthly salary', day(6)],
      ['income', 18500, 'Freelance', 'Website design project', day(14)],
      ['expense', 4200, 'Food', 'Groceries — weekly run', day(1)],
      ['expense', 1150, 'Food', 'Dinner with friends', day(3)],
      ['expense', 980, 'Transport', 'Uber rides', day(2)],
      ['expense', 2400, 'Bills', 'Electricity bill', day(8)],
      ['expense', 1499, 'Entertainment', 'Streaming subscription', day(10)],
      ['expense', 3200, 'Shopping', 'Running shoes', day(11)],
      ['expense', 750, 'Health', 'Pharmacy — vitamins', day(5)],
      ['expense', 1800, 'Education', 'Online course EMI', day(13)],
      ['expense', 640, 'Food', 'Coffee & snacks', day(4)],
      ['expense', 1120, 'Transport', 'Metro recharge', day(7)],
      ['expense', 2100, 'Bills', 'Mobile + internet', day(17)],
      ['expense', 990, 'Entertainment', 'Movie night', day(18)],
      ['expense', 1450, 'Food', 'Sunday brunch', day(20)],
      ['income', 52000, 'Salary', 'Monthly salary', day(36)],
      ['expense', 4000, 'Food', 'Groceries', day(33)],
      ['expense', 2350, 'Bills', 'Electricity bill', day(32)],
      ['expense', 2800, 'Shopping', 'Winter jacket', day(31)],
      ['expense', 1300, 'Transport', 'Cab to office', day(30)],
      ['expense', 1499, 'Entertainment', 'Streaming subscription', day(29)],
      ['income', 52000, 'Salary', 'Monthly salary', day(66)],
      ['expense', 4400, 'Food', 'Groceries', day(63)],
      ['expense', 2500, 'Bills', 'Electricity bill', day(61)],
      ['expense', 1900, 'Education', 'Workshop fee', day(59)],
      ['expense', 1650, 'Transport', 'Fuel', day(57)],
      ['income', 9000, 'Freelance', 'Logo design', day(70)],
      ['expense', 3100, 'Health', 'Doctor consultation', day(72)],
      ['expense', 1250, 'Entertainment', 'Concert ticket', day(74)],
      ['expense', 4800, 'Shopping', 'Headphones', day(76)]
    ];

    state.transactions = samples.map(([type, amount, category, description, date], i) => ({
      id: 'seed' + i,
      type, amount, category, description, date,
      createdAt: Date.now() - i * 1000
    }));

    state.budget = {
      monthly: 20000,
      categories: { Food: 5000, Transport: 3000, Shopping: 4000, Bills: 8000 }
    };

    state.savingsGoal = { name: 'Emergency Fund', target: 50000, saved: 32000 };
  }

  load();

  return {
    DEFAULT_CATEGORIES,
    EXPENSE_CATEGORIES,
    INCOME_CATEGORIES,
    CURRENCIES,
    get state() { return state; },
    load, save, onChange,
    currency, formatMoney,
    listTransactions, addTransaction, updateTransaction, deleteTransaction, getTransaction,
    totals, monthTotals, currentMonthKey, monthKey, expensesByCategory, monthlySeries,
    setMonthlyBudget, setCategoryBudget, budgetState, budgetAlert,
    setSavingsGoal, adjustSavings, savingsProgress,
    setSetting, categories, addCustomCategory, categoriesForType, meta,
    exportRows, clearAll
  };
})();
