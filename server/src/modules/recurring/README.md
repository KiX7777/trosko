# Recurring worker module

The recurring module exposes `POST /api/recurring/process` and schedules the same operation daily at 05:00 through `@nestjs/schedule`.

When `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are present, the service calls the `process_due_recurring_transactions` RPC. The SQL function handles due dates, catch-up occurrences, balance updates, row locking, end dates, and next-run advancement. Without worker credentials, the module returns a skipped response and logs a debug message.

The service role key is privileged. Keep this module server-only and protect the manual endpoint at the deployment boundary if it is exposed outside a trusted network.
