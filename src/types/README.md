# Domain types

`domain.ts` is the shared vocabulary for the client. It defines transaction, account, category, label, recurring, receipt, saved-view, profile, filter, period, and dashboard-summary contracts.

Types use camelCase because they are consumed by React. Supabase rows use snake_case and are converted in `src/lib/repository.ts`. Keep that boundary explicit. A schema change normally requires updates to the TypeScript domain type, row mapping, repository CRUD, query hook, feature form, translation keys, migration, and tests.
