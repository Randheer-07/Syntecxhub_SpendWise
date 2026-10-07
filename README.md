# SpendWise — Smart Personal Expense Tracker

A polished, fully client-side personal finance dashboard built as a web development project for the **Syntecxhub Web Development Internship**.

SpendWise tracks income and expenses, visualises spending with live charts, enforces monthly and category budgets, and keeps a savings goal in view — all persisted in your browser with LocalStorage. No backend, no account, no data leaves your machine.

---

## About

SpendWise is designed to feel like a real product rather than a class demo:

- **Dark-first design** with a layered midnight/indigo background, electric teal and lavender accents, plus a carefully designed light theme.
- **Theme toggle** remembered across sessions.
- **Responsive layout** — sidebar collapses into a drawer on mobile, tables become stacked cards, charts resize cleanly.
- **Data-driven insights** generated from your own transactions (never hardcoded).
- Everything is vanilla HTML, CSS and JavaScript with Chart.js for graphs.

---

## Features

| Area | What you get |
| --- | --- |
| Dashboard | Total balance, income, expenses, current-month spend, remaining budget, savings, transaction count, recent list, budget snapshot, expense trend chart |
| Transactions | Add / edit / delete with confirmation, search, type & category & month filters, four sort orders, pagination |
| Analytics | Expense-by-category doughnut, income vs expense bars, monthly expense line, top categories, biggest expenses, headline stats |
| Budget | Monthly limit with progress bar, per-category limits, 80% / 100% visual alerts |
| Savings goal | Target name, target amount, saved amount, animated progress ring, quick contributions, milestone insights |
| Insights | Dynamic statements such as highest category, month-over-month change, savings rate and budget status |
| Settings | Theme, currency (INR default, USD/EUR/GBP), display name, CSV export, JSON backup & restore, sample data, clear all data |
| Polish | Toast notifications, modal dialogs, keyboard support (`Ctrl + K` to add), subtle animations, `prefers-reduced-motion` support, ARIA labels |

---

## Tech Stack

- **HTML5** — semantic markup, accessible forms and tables
- **CSS3** — custom properties for theming, grid/flexbox, animations
- **JavaScript (ES6)** — modular IIFE components, no frameworks
- **Chart.js 4** — doughnut, bar and line charts (vendored locally in `vendor/`)
- **LocalStorage** — persistence for transactions, budgets, goals, theme and preferences
- **SVG sprite** — Lucide icons bundled as an inline symbol sprite
- **Git / GitHub** — version control and hosting

---

## Project Structure

```
SpendWise — Smart Personal Expense Tracker/
│
├── index.html            # Dashboard
├── transactions.html     # Transaction history, filters, sorting
├── analytics.html        # Charts and breakdowns
├── budget.html           # Monthly + category budgets
├── savings.html          # Savings goal tracker
├── settings.html         # Preferences, export, reset
│
├── css/
│   ├── style.css         # Design tokens, layout, shared components
│   ├── dashboard.css     # Page-level blocks (cards, charts, tables)
│   └── responsive.css    # Tablet & mobile behaviour
│
├── js/
│   ├── storage.js        # Data model, persistence, all calculations
│   ├── app.js            # Shell: theme, sidebar, toasts, modals, forms, CSV
│   ├── icons.js          # Injects the SVG icon sprite
│   ├── dashboard.js      # Summary cards, insights, trend chart
│   ├── transactions.js   # Search / filter / sort / CRUD
│   ├── analytics.js      # Chart rendering
│   ├── budget.js         # Budget rules and alerts
│   ├── savings.js        # Savings goal UI
│   └── settings.js       # Preferences, backup, wipe
│
├── assets/icons/sprite.svg
├── vendor/chart.umd.min.js
├── README.md
└── .gitignore
```

---

## How to Run

SpendWise is a static site — any way of serving the folder works.

### Option 1 — clone from GitHub

```bash
git clone https://github.com/Randheer-07/Syntecxhub_SpendWise.git
cd Syntecxhub_SpendWise
```

### Option 2 — local server (recommended)

```bash
# Python
python -m http.server 8080

# or Node
npx serve .
```

Then open <http://localhost:8080> in your browser.

> Opening `index.html` directly with `file://` also works in most browsers.

### First run

Sample transactions are loaded on the very first visit so the dashboard, charts and budgets have something to show. Clear them from **Settings → Clear all data** to start with your own numbers.

---

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl + K` | Open the add-transaction form |
| `Esc` | Close an open dialog |
| `Enter` | Submit the focused form |

---

## Screenshots

Screenshots can be added here after running the app locally.

---

## Internship

**Developed as part of Syntecxhub Web Development Internship.**

Author: [Randheer-07](https://github.com/Randheer-07)
