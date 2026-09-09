# Shared components

Shared components are cross-feature building blocks. `app-shell.tsx` owns the authenticated navigation frame, desktop sidebar, mobile navigation, profile menu, quick-add entry point, and page outlet. `pwa-install-prompt.tsx` owns the browser install affordance.

The `ui/` subdirectory contains presentational primitives. A component belongs here when it has stable behavior and can be reused by multiple features. Keep feature-specific orchestration in the corresponding feature directory.

When adding a shared component:

1. Give interactive elements semantic labels and keyboard behavior.
2. Reuse translation keys and existing variants before adding new CSS.
3. Keep data fetching out of low-level UI primitives.
4. Add a nearby test for non-trivial interaction or formatting behavior.
