# UI store

`ui-store.ts` is a small Zustand store for transient client state that should not be persisted as domain data. It currently holds theme selection, quick-add visibility/type, and the transaction being edited. `dashboard-store.ts` owns dashboard-specific UI state and the persisted balance-account filter.

Do not put accounts, transactions, profiles, or other server state here. Those belong in TanStack Query. Use the store for cross-component UI coordination where prop drilling would make the shell and modal unnecessarily coupled.

For a cohesive UI workflow with several related values—such as modal visibility, form drafts, and an attached dropdown—create a small, feature-specific Zustand store instead of adding several `useState` calls to the page component. Keep isolated concerns, such as table sorting or a single selected item, in local `useState`. Feature-specific stores should reset their transient state when the owning page unmounts.
