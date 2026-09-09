# UI store

`ui-store.ts` is a small Zustand store for transient client state that should not be persisted as domain data. It currently holds theme selection, quick-add visibility/type, and the transaction being edited.

Do not put accounts, transactions, profiles, or other server state here. Those belong in TanStack Query. Use the store for cross-component UI coordination where prop drilling would make the shell and modal unnecessarily coupled.
