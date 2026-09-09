# Frontend source

The `src/` tree contains the browser application. `main.tsx` registers the PWA service worker and mounts React; `App.tsx` composes routing, providers, and the install prompt.

## Source map

| Directory     | Responsibility                                                            |
| ------------- | ------------------------------------------------------------------------- |
| `app/`        | Router and global providers.                                              |
| `components/` | App shell and reusable visual controls.                                   |
| `features/`   | Route-level product functionality.                                        |
| `hooks/`      | TanStack Query reads, mutations, keys, and cache invalidation.            |
| `lib/`        | Persistence boundary, formatting, integrations, constants, and demo data. |
| `locales/`    | Croatian translation resources.                                           |
| `stores/`     | Zustand state for UI-only concerns.                                       |
| `styles/`     | Additional feature CSS, currently receipt-specific styling.               |
| `types/`      | Shared TypeScript domain contracts.                                       |
| `test/`       | Vitest setup.                                                             |

The top-level `styles.css` is the main global stylesheet. It owns the design tokens, layout system, responsive behavior, and most component styles; `styles/` contains deliberately isolated additions.

## Data-flow rule

Feature pages should call hooks. Hooks should call repository functions. The repository decides between Supabase and the demo store. This keeps the UI testable and prevents persistence details from leaking into presentation code.

## Adding a feature

Create a route-level page under `features/<name>/`, add its route in `app/router.tsx`, add query hooks under `hooks/`, and add any durable domain changes to both `types/domain.ts` and the Supabase migration. Add Croatian strings before wiring the UI and document the new feature in `features/README.md`.
