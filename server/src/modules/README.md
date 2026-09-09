# Server modules

Each child directory is a self-contained NestJS capability registered by `server/src/app.module.ts`.

| Module           | HTTP surface                                 | External dependency                        |
| ---------------- | -------------------------------------------- | ------------------------------------------ |
| `ocr`            | `POST /api/ocr/parse`                        | Tesseract language data, PDF.js, canvas.   |
| `exports`        | `GET /api/export/pdf`                        | PDFKit.                                    |
| `exchange-rates` | `GET /api/exchange-rates`                    | Optional configured rate provider.         |
| `recurring`      | `POST /api/recurring/process` and daily cron | Supabase RPC and service-role credentials. |

Keep controllers thin and put reusable logic in services or pure helpers. Document any new module here and add it to `app.module.ts`.
