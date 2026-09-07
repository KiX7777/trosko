# Supabase setup

The migration in `migrations/20260907000000_initial_expense_tracker.sql` creates the Troško schema, indexes, ownership policies, and receipt-storage policies.

Create a Storage bucket named `receipts` in the Supabase dashboard before enabling receipt uploads. The frontend uses the local demo repository when `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are not configured.

The Supabase CLI was not available in the local environment, so the migration is intentionally committed as a normal SQL migration for `supabase db push` or the SQL editor.
