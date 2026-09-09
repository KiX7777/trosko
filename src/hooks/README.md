# Query and mutation hooks

Hooks in this directory are the frontend's server-state boundary. They wrap repository functions in TanStack Query and centralize cache keys and invalidation behavior.

## Rules

- Use a stable key from `query-keys.ts` for every query.
- Put persistence functions in `src/lib/repository.ts`, not in the hook body.
- Invalidate the narrowest affected keys after a mutation, plus dashboard/analytics keys when aggregates change.
- Use `MutationCallbacks` for page-level success and error toasts without duplicating cache logic.
- Keep filters serializable so they can be stored in saved views or the URL.

The hooks are intentionally thin. If a hook starts transforming a large domain model or implementing business rules, move that logic to the repository or a dedicated pure helper.
