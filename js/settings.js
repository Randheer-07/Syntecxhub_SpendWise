/* ==========================================================================
   settings.js — theme, currency, name, backups and data reset.
   ========================================================================== */

(() => {
  const $ = sel => document.querySelector(sel);

  function syncControls() {
    const s = Store.state.settings;

    document.querySelectorAll('[data-theme-value]').forEach(btn =>
      btn.setAttribute('aria-pressed', String(btn.dataset.themeValue === s.theme)));

    $('#currencySelect').value = s.currency;
    $('#nameInput').value = s.name || '';
  }

  function bindThemeSegment() {
    $('#themeSegment').addEventListener('click', e => {
      const btn = e.target.closest('[data-theme-value]');
      if (!btn) return;
      const theme = btn.dataset.themeValue;
      Store.setSetting('theme', theme);
      document.documentElement.setAttribute('data-theme', theme);

      const toggle = document.getElementById('themeToggle');
      if (toggle) {
        const use = toggle.querySelector('use');
        if (use) use.setAttribute('href', theme === 'dark' ? '#i-sun' : '#i-moon');
      }

      syncControls();
      App.toast('Theme changed', `${theme === 'dark' ? 'Dark' : 'Light'} mode is now active.`);
    });
  }

  function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function init() {
    App.boot({ title: 'Settings', subtitle: 'Preferences and data control' });
    syncControls();
    bindThemeSegment();

    $('#currencySelect').addEventListener('change', e => {
      Store.setSetting('currency', e.target.value);
      App.toast('Currency updated', `Amounts now display in ${e.target.value}.`);
    });

    $('#saveName').addEventListener('click', () => {
      const name = $('#nameInput').value.trim();
      if (!name) {
        App.toast('Name required', 'Enter a name before saving.', 'warn');
        return;
      }
      Store.setSetting('name', name);
      App.toast('Name saved', `Dashboard will greet you as ${name.split(' ')[0]}.`);
    });

    $('#nameInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') $('#saveName').click();
    });

    $('#backupJson').addEventListener('click', () => {
      downloadFile(
        JSON.stringify(Store.state, null, 2),
        `spendwise-backup-${new Date().toISOString().slice(0, 10)}.json`,
        'application/json');
      App.toast('Backup downloaded', 'Keep the JSON file somewhere safe.');
    });

    $('#restoreJson').addEventListener('click', () => $('#restoreInput').click());

    $('#restoreInput').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (!Array.isArray(data.transactions)) throw new Error('bad shape');
          localStorage.setItem('spendwise.v1', JSON.stringify(data));
          Store.load();
          syncControls();
          App.toast('Backup restored', `${data.transactions.length} transactions imported.`);
        } catch (err) {
          App.toast('Restore failed', 'That file does not look like a SpendWise backup.', 'error');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });

    $('#loadSample').addEventListener('click', () => {
      App.confirmAction({
        title: 'Replace with sample data?',
        message: 'Your current transactions will be swapped for the bundled demo set.',
        confirmText: 'Load samples',
        danger: false
      }, () => {
        Store.clearAll();
        Store.save();
        location.reload();
      });
    });

    $('#clearData').addEventListener('click', () => {
      App.confirmAction({
        title: 'Clear all data?',
        message: 'Every transaction, budget and savings goal in this browser will be deleted. This cannot be undone.',
        confirmText: 'Delete everything'
      }, () => {
        Store.clearAll();
        App.toast('Data cleared', 'SpendWise is now empty. Refresh to start over.');
        syncControls();
      });
    });

    Store.onChange(syncControls);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
