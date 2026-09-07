# Troško

Troško is a responsive personal-finance PWA based on the supplied design, development plan, and technical specification. The client includes a local demo repository so the product is usable immediately, while the Supabase and NestJS integration boundaries are ready for a production environment.

## Run locally

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173/`. Without environment variables the app runs in local demo mode and persists changes in browser `localStorage`.

For Supabase Auth and data, create `.env.local`:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Apply `supabase/migrations/20260907000000_initial_expense_tracker.sql` and create the `receipts` Storage bucket. The migration contains ownership RLS policies for every user-owned table and receipt path.

## Server boundary

```bash
npm run server:dev
```

The NestJS service exposes `/api/ocr/parse`, `/api/export/pdf`, `/api/exchange-rates`, and `/api/recurring/process`. Configure `PORT` and optionally `EXCHANGE_RATES_ENDPOINT`. OCR intentionally returns a review item until a provider is configured; it never silently creates a transaction from an unverified receipt.

## Verification

```bash
npm run test
npm run build:all
npm run lint
npm run format:check
```

## Prijevodi i formatiranje

Korisnički tekstovi nalaze se u `src/locales/hr.json` i koriste se kroz `t()` helper iz `src/lib/i18n.ts`. Novi tekst dodaj prvo u taj JSON, a zatim ga koristi kroz `t('ključ')`.

```bash
npm run format
```
