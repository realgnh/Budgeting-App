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
| `npm test` | Run the Vitest unit tests (FX, timeframes, budgets) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build:single` | Build a single self-contained HTML file to `dist-single/` |

Mizan targets desktop viewports of 1024px and wider.

## Features

- **Overview:** net balance, period income and expenses with change-vs-previous-period badges, net cash flow and savings rate. Also the current month's budget health (overall cap, per-category bars, safe-to-spend per day), a cash-flow chart, a spending donut and recent transactions.
- **Analytics:**
  - A cash-flow graph that toggles between income-vs-expense bars and a running balance line
  - Period highlights
  - Donuts for expenses by category (click a slice to see its transactions), income by source and currency mix
  - A monthly burn-rate chart against an ideal pace line
- **Transactions:** search over titles and notes, filters by type, category, currency and date range, live totals, sorting by date or converted amount, and inline edit and delete.
- **Timeframes:** 1D (hourly), 5D, 1M (daily), 1Y (monthly), and ALL TIME (daily, monthly or quarterly depending on the span).
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
