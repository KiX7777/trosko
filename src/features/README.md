# Product features

Each subdirectory is a route-level slice of the product. Pages coordinate user interaction and compose hooks plus shared UI; they should not contain raw Supabase queries.

| Feature        | Route           | Responsibility                                                               |
| -------------- | --------------- | ---------------------------------------------------------------------------- |
| `auth`         | `/login`        | Demo session or Supabase sign-in/registration and route protection.          |
| `dashboard`    | `/dashboard`    | Snapshot of balances, cash flow, categories, merchants, and recent activity. |
| `transactions` | `/transactions` | Transaction table, filtering, saved views, quick add, edit, and delete.      |
| `accounts`     | `/accounts`     | Account lifecycle and manual balance reconciliation.                         |
| `analytics`    | `/analytics`    | Range-based reporting and daily expense exploration.                         |
| `recurring`    | `/recurring`    | Scheduled income/expense templates and auto-log configuration.               |
| `receipts`     | `/receipts`     | File drop, OCR request, and review of extracted receipt fields.              |
| `categories`   | `/categories`   | Income/expense category management.                                          |
| `labels`       | `/labels`       | Label creation and transaction label usage.                                  |
| `settings`     | `/settings`     | Profile, theme, currency, and demo reset controls.                           |

Feature READMEs in each subdirectory describe the main workflow and its data dependencies.
