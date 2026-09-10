# Client libraries and integrations

This directory contains code that is shared across features but is not itself a visual component.

- `repository.ts` is the persistence abstraction. It maps Supabase rows to domain objects and provides a `localStorage` demo implementation, including receipt metadata and receipt-to-transaction links.
- `mock-data.ts` contains the initial demo profile, accounts, categories, labels, recurring records, transactions, and summary.
- `supabase.ts` creates a client only when the two Vite Supabase variables are present.
- `query-client.ts` configures the shared TanStack Query client.
- `format.ts` centralizes Croatian date, currency, and number display.
- `local-storage.ts` provides safe JSON read, write, and removal for browser-only UI preferences.
- `i18n.ts` loads `hr.json` and provides the typed `t()` helper.
- `ocr-api.ts` calls the browser-to-server OCR boundary; `use-receipt-queries.ts` orchestrates file persistence, OCR status updates, and query invalidation.
- `constants.ts` contains shared option lists and stable application values.

## Repository contract

The repository should expose domain-level functions, not raw database rows. Every cloud operation must scope data to the authenticated user, and every new operation must have a demo-mode equivalent unless the feature is explicitly server-only. Keep row mapping functions close to the repository so the rest of the app never depends on snake_case database fields.
