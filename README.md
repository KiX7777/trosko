# Troško

Troško is a responsive personal-finance progressive web app (PWA) for recording spending, monitoring cash flow, and understanding where money goes. The interface is Croatian-first, uses EUR-oriented demo data, and is designed to work immediately in a browser without a backend. When Supabase is configured, the same repository layer switches to authenticated, cloud-backed data.

The project includes:

- a React + TypeScript browser application built with Vite;
- a local demo mode backed by browser `localStorage`;
- optional Supabase Auth, Postgres, Row Level Security, and Storage integration;
- an optional NestJS service for receipt OCR, PDF exports, exchange rates, and recurring-transaction processing;
- a PWA manifest, install prompt, service worker, and API runtime caching;
- unit and component tests with Vitest and Testing Library.

## What the app does

Troško is organized around a simple loop:

1. Set up accounts, categories, and optional labels.
2. Add income, expenses, or transfers from the quick-add action or the transactions page.
3. Review the dashboard for balance, income, expenses, net cash flow, category distribution, and recent activity.
4. Use analytics for a selected period and daily expense detail.
5. Define recurring items such as rent, subscriptions, or salary. Items with auto-log enabled can create transactions when they become due.
6. Upload a receipt or scanned PDF for OCR. The original file and OCR result are retained in Supabase mode; extracted fields stay editable and OCR never silently creates a transaction.
7. Export transaction rows to PDF through the server boundary when that service is running.

The main routes are:

| Route           | Purpose                                                                             |
| --------------- | ----------------------------------------------------------------------------------- |
| `/login`        | Sign in or register with Supabase, or enter the local demo session.                 |
| `/dashboard`    | High-level balance, cash-flow, category, merchant, and recent-transaction view.     |
| `/transactions` | Filterable and sortable transaction table, saved views, create/edit/delete actions. |
| `/accounts`     | Create, edit, archive, and manually reconcile accounts.                             |
| `/analytics`    | Period-based reporting and daily expense exploration.                               |
| `/recurring`    | Manage recurring income and expenses, scheduling, and auto-log behavior.            |
| `/receipts`     | Upload receipt images/PDFs and review OCR suggestions.                              |
| `/categories`   | Manage income and expense categories, icons, colors, and parent categories.         |
| `/labels`       | Create labels used to classify transactions.                                        |
| `/settings`     | Profile, primary currency, theme, and demo-data reset.                              |

## Architecture at a glance

```text
Browser
  ├─ React routes and feature pages
  ├─ TanStack Query hooks
  ├─ Repository boundary
  │    ├─ Supabase Auth/Postgres/Storage when configured
  │    └─ localStorage demo repository otherwise
  └─ PWA service worker and install prompt

Optional NestJS server (`:3001`)
  ├─ POST /api/ocr/parse
  ├─ GET  /api/export/pdf
  ├─ GET  /api/exchange-rates
  └─ POST /api/recurring/process

Supabase
  ├─ Auth users and profiles
  ├─ accounts, categories, labels, transactions
  ├─ recurring_transactions, receipts, saved_views
  └─ RLS policies and the recurring-processing function
```

The frontend is deliberately insulated from the persistence choice. UI code calls functions such as `getTransactions`, `createAccount`, and `getDashboardSummary` from `src/lib/repository.ts`; it does not need to know whether data came from Supabase or `localStorage`.

## Getting started

### Prerequisites

- Node.js with npm.
- A modern browser. Chrome, Edge, Firefox, and Safari are suitable for the client; receipt OCR and the NestJS service are server-side concerns.

### Install and run the client

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173/`. With no environment variables, the app starts in demo mode. Demo records are initialized from `src/lib/mock-data.ts` and subsequent changes are persisted under the `trosko-db:` `localStorage` namespace.

### Run the optional API server

In a second terminal:

```bash
npm run server:dev
```

The Vite development server proxies `/api` requests to `http://127.0.0.1:3001`. Run the production-shaped server with:

```bash
npm run build:server
npm run server:start
```

The OCR service may download Croatian and English Tesseract language data on first use. For an offline deployment, set `OCR_LANG_PATH` to a local tessdata directory.

## Supabase mode

Create `.env.local` from `.env.example`:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Apply both migrations in `supabase/migrations/` and create a Storage bucket named `receipts`. The initial migration creates the application schema, indexes, grants, ownership RLS policies, and receipt-storage policies. The second migration adds automatic recurring-transaction processing.

When both frontend Supabase values are present, `src/lib/supabase.ts` creates the client and the auth gate protects application routes. The repository uses the current authenticated user for reads and writes. When the values are absent, the auth page offers a local demo session instead.

For the server-side recurring worker, configure server-only values in the process environment:

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` to the Vite client or commit it to the repository.

More database-specific notes are in [`supabase/README.md`](supabase/README.md).

## Server API

The NestJS application has a global `/api` prefix.

### `POST /api/ocr/parse`

Accepts a multipart `file` containing an image or PDF up to 10 MB, or a text body for parser testing. PDF input is rendered page-by-page and OCR is limited to 10 pages. The response contains a status, source file, confidence where available, and suggested fields such as merchant, date, currency, total, and category. The client records the result against a receipt and requires the user to review those values before explicitly creating the linked transaction.

### `GET /api/export/pdf`

Accepts a `title` and JSON-encoded `rows` query parameter and returns a PDF attachment named `trosko-izvoz.pdf`. Rows contain `date`, `description`, `amount`, `currency`, and `type`.

### `GET /api/exchange-rates?base=EUR`

Uses `EXCHANGE_RATES_ENDPOINT` when configured. If the provider is unavailable or unset, the service returns a clearly marked fallback response with a small EUR/USD/GBP/CHF rate set.

### `POST /api/recurring/process`

Runs the Supabase RPC that creates due auto-log transactions and advances the next run date. The same operation is scheduled by NestJS at 05:00 every day. If worker credentials are missing, the endpoint returns a skipped result rather than failing startup.

## Data and business rules

- Amounts are positive values; transaction `type` determines whether they affect income, expenses, or transfers.
- `amountBase` stores the normalized amount used for summaries; `exchangeRate` records the conversion used.
- Account balances are updated when transactions are created or recurring transactions are processed.
- Archived accounts remain in storage but are excluded from the default account list.
- Transaction filters cover type, account, category, labels, currency, dates, amount range, recurring status, receipt presence, and text search.
- Dashboard and analytics summaries aggregate base-currency amounts and derive category and merchant rankings.
- Recurring records support weekly, monthly, yearly, and custom day intervals, optional end dates, and optional automatic logging.
- Receipt OCR is advisory. A failed or low-confidence parse is a review state, not a financial write.

The canonical client-side domain types live in [`src/types/domain.ts`](src/types/domain.ts), while the database schema and RLS policy source lives in [`supabase/migrations/20260907000000_initial_expense_tracker.sql`](supabase/migrations/20260907000000_initial_expense_tracker.sql).

## PWA behavior

`vite-plugin-pwa` generates the service worker and manifest. The app is installable in standalone mode, uses the Croatian document language, and prompts users when the browser exposes an install opportunity. API requests use a network-first runtime cache with a five-second network timeout. The client also checks for service-worker updates when the page becomes visible and on a one-minute interval.

## Internationalization and formatting

Visible UI copy is Croatian-first and stored in [`src/locales/hr.json`](src/locales/hr.json). Use `t('key')` from [`src/lib/i18n.ts`](src/lib/i18n.ts) instead of adding literal UI strings. Date and currency formatting helpers are in [`src/lib/format.ts`](src/lib/format.ts). Keep new translation keys grouped by domain and add tests when interpolation or fallback behavior changes.

## Development workflow

1. Find the feature page in `src/features/`.
2. Add or reuse a domain type in `src/types/domain.ts`.
3. Put persistence and mapping logic in `src/lib/repository.ts`.
4. Expose reads and writes through a focused hook in `src/hooks/` and invalidate the relevant query keys.
5. Build UI from shared controls in `src/components/ui/`.
6. Add Croatian copy to `src/locales/hr.json`.
7. Add or update tests near the affected utility or component.
8. Run the full verification commands before opening a review.

Avoid placing Supabase calls directly inside feature pages. Avoid putting feature-specific business rules into generic UI components. If a behavior needs both demo and Supabase support, implement both branches behind the repository boundary.

## Verification

```bash
npm run typecheck
npm run test
npm run lint
npm run format:check
npm run build:all
```

`npm run build:all` builds both the Vite client and the NestJS server. The test suite includes formatting/i18n helpers, repository behavior, currency input behavior, and OCR parser coverage.

## Documentation map

Each major source area has its own local guide:

- [`src/README.md`](src/README.md) — frontend source map.
- [`src/app/README.md`](src/app/README.md) — providers, routing, and app bootstrapping.
- [`src/components/README.md`](src/components/README.md) — shell and cross-feature components.
- [`src/components/ui/README.md`](src/components/ui/README.md) — reusable UI primitives.
- [`src/features/README.md`](src/features/README.md) — feature boundaries and route ownership.
- [`src/hooks/README.md`](src/hooks/README.md) — query and mutation conventions.
- [`src/lib/README.md`](src/lib/README.md) — repository, formatting, i18n, and integrations.
- [`src/locales/README.md`](src/locales/README.md) — translation workflow.
- [`src/stores/README.md`](src/stores/README.md) — client-only UI state.
- [`src/styles/README.md`](src/styles/README.md) — design tokens, layout, and CSS ownership.
- [`src/types/README.md`](src/types/README.md) — shared domain contracts.
- [`server/README.md`](server/README.md) — NestJS boundary and deployment notes.
- [`supabase/README.md`](supabase/README.md) — migrations, RLS, Storage, and worker setup.

## License and product status

This repository does not currently declare a license. Treat it as an internal or experimental application unless a separate project policy says otherwise. The local demo path is complete enough for exploration; production deployment still requires Supabase project setup, server secrets, operational logging, and a deployment strategy for the API worker.
