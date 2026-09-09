# Recurring transactions

Recurring records are templates for income or expenses. Each record stores its account, optional category, amount, currency, frequency, interval, start date, next run date, optional end date, active state, and `autoLog` flag.

In demo mode, repository reads opportunistically process due auto-log items in `localStorage`. In Supabase mode, the NestJS worker calls `process_due_recurring_transactions`, which inserts all missed occurrences up to today, adjusts account balances, advances `next_run_at`, and deactivates ended schedules.

The processing operation is designed to be safe for concurrent workers with row locking in the SQL function. Verify the migration is applied before enabling the production worker.
