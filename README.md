# Mizan

A desktop, local-first budgeting app for people whose money moves between **Egyptian pounds (EGP)**, **Saudi riyals (SAR)** and **US dollars (USD)**. Everything stays in your browser: there is no server, no account and no cloud database.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check, then build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Run the Vitest unit tests (FX, UTC+2 periods, budgets, balance corrections) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build:single` | Build a single self-contained HTML file to `dist-single/` |

Mizan targets desktop viewports of 1024px and wider.

## Features

- **Overview:** balance, period income and expenses with the change vs. the previous period, net cash flow and savings rate. Also a budget panel for any month (pick the month and year), a cash-flow chart, a spending donut and recent activity.
- **Set balance:** type what you actually have and Mizan records the difference as a correction. Corrections change the balance but never count as income or spending, and you can remove them later.
- **Monthly budgets:** each month can have its own cap and category limits. A saved budget carries forward to later months until one of them gets its own. Past months show the final result; the current month shows safe-to-spend per day.
- **Analytics:**
  - A cash-flow graph that toggles between income-vs-expense bars and a running balance line
  - Period highlights
  - Donuts for expenses by category (click a slice to see its transactions), income by source and currency mix
  - A monthly burn-rate chart against an ideal pace line
- **Transactions:** search over titles and notes, filters by type, category, currency and date range, live totals, sorting by date or converted amount, and inline edit and delete.
- **Day / Month / Year:** choose how much time to show, then pick the exact day, month or year with the arrows, the date picker or the month and year lists. Day shows hourly bars, Month daily bars, Year monthly bars. Every tab follows the selection, including the transaction list.
- **Resets daily on UTC+2:** all dates use a fixed UTC+2 clock (no daylight saving), whatever the device's time zone. Left on today, the view starts fresh at 00:00 UTC+2. Times are shown and entered in UTC+2, and CSV exports label their date columns that way.
- **Base currency:** switch between EGP, SAR and USD at any time. Every figure converts instantly.
- **Settings & Data:**
  - Monthly budgets
  - Categories: add custom ones with a color and icon, rename or restyle any category, and delete one by moving its transactions to another category
  - Demo data
  - CSV export
  - JSON backup and restore (checked against the schema version before anything changes)
  - Reset
- Light and dark themes, keyboard shortcut **N** to add a transaction, and animations that respect reduced-motion settings.

## How money is converted

- Exchange rates come from `open.er-api.com` (no key needed). They are cached locally and refreshed on start-up when older than 6 hours, or when you press the refresh button.
- If the service can't be reached, Mizan keeps your last live rates. If it has never fetched live rates, it falls back to built-in defaults (1 USD = 50 EGP = 3.75 SAR) and shows an amber **Offline rates** pill.
- Every transaction stores the rates from when it was created (`fxSnapshot`) and is always converted with them, so past totals never shift when today's rates move.
- Budget limits are stored in the currency that was active when you saved them, and are converted to the current base currency using current rates.
- Data saved by older versions is upgraded automatically (the old 1D/5D/1M/1Y/ALL setting becomes Day, Month or Year), and older backups can still be restored.

## Project layout

```
src/
├── types/finance.ts        Domain types
├── lib/                    Pure logic with no React (fx, timeframes, budgets, analytics, format, io, seed)
├── store/                  Zustand stores (data persisted under localStorage key budget_app_state_v1)
├── components/             layout, overview, analytics, transactions, settings, common
└── tests/                  Vitest unit tests
```

`prototype/index.html` is the original clickable design mockup.
