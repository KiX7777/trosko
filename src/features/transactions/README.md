# Transactions

This feature owns the main transaction table and the reusable quick-add modal. The table supports sorting, query-string-backed filter state, account/category/label/date/amount/currency filters, recurring and receipt flags, saved views, and deletion. The quick-add modal supports expenses, income, transfers, labels, and editing an existing record.

Transactions are persisted through `use-transaction-queries.ts`. Successful mutations invalidate transaction, dashboard, account, analytics, and related metadata queries as needed. Keep the form's display model separate from the normalized `CreateTransactionInput`/`UpdateTransactionInput` contracts.
