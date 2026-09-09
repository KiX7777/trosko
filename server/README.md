# NestJS server boundary

The `server/` tree contains optional backend capabilities that are not appropriate for the browser: OCR processing, PDF generation, exchange-rate lookup, and privileged recurring-transaction processing.

## Run and build

From the repository root:

```bash
npm run server:dev
npm run build:server
npm run server:start
```

The server listens on `PORT` (default `3001`), enables CORS, applies the global `/api` prefix, and uses Nest validation with transformation and whitelisting. Vite proxies `/api` to this port during development.

## Modules

- `ocr` — Tesseract-based image/PDF parsing and receipt field extraction.
- `exports` — PDF generation from transaction rows.
- `exchange-rates` — configurable provider with a deterministic fallback.
- `recurring` — scheduled and manual invocation of the Supabase recurring RPC.

The server does not replace the frontend repository. It supplies narrow capabilities that the client calls through HTTP. Server-only credentials belong in the process environment and must never be prefixed with `VITE_`.
