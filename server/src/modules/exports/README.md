# Exports module

The exports module exposes `POST /api/export/pdf`. It accepts `dateFrom` and `dateTo` in the request body and returns a styled PDF report.

For signed-in Supabase users, the client sends its access token and the server verifies it with Supabase before querying that user's profile, accounts, categories, labels, and every transaction in the requested date range. The browser never chooses which cloud rows are exported. The report includes a financial summary, expense-category breakdown, and a paginated transaction ledger with merchant, notes, labels, receipt, recurring, account, category, and currency information.

Local demo mode sends its local data only to this endpoint; PDF construction still happens on the server so the export interaction behaves the same way without Supabase credentials.
