# Supabase persistence

Supabase is the optional production persistence and authentication layer. The browser uses the publishable key, while the NestJS recurring worker uses a server-only service-role key.

## Migrations

- `20260907000000_initial_expense_tracker.sql` creates enums, profiles, accounts, categories, labels, recurring transactions, receipts, transactions, transaction labels, and saved views. It also adds indexes, grants, ownership RLS policies, and policies for the `receipts` Storage bucket.
- `20260908000000_recurring_auto_log.sql` adds the `auto_log` column and the `process_due_recurring_transactions` RPC.

Apply the migrations with the Supabase CLI or SQL editor, then create a private Storage bucket named `receipts`. Receipt object paths start with the authenticated user's ID, for example `{user_id}/{receipt_id}/receipt.ext`.

## Security model

Every user-owned table has RLS enabled. Policies compare `user_id` to `auth.uid()`; profiles compare the row ID to the authenticated user. Transaction-label policies verify ownership through both related tables. Storage policies restrict access to the first path segment, which must be the user ID.

The browser repository scopes queries to the current user as an additional application-level guard. RLS remains the authoritative database boundary.

## Local/demo behavior

If `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY` is absent, the frontend does not initialize Supabase and uses `src/lib/repository.ts`'s local implementation. This is useful for design review and development but is not multi-user storage.
