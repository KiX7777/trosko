# Application composition

This directory contains the frontend composition layer.

- `router.tsx` defines public and authenticated routes, lazy-loads feature pages, and provides the visual route-loading fallback.
- `providers.tsx` mounts TanStack Query, synchronizes the selected theme to `document.documentElement.dataset.theme`, and renders toast notifications.

`App.tsx` wraps the router in `BrowserRouter`, then mounts the providers and PWA install prompt. Keep this layer focused on composition. Feature behavior belongs under `src/features`, and data access belongs behind hooks and the repository.

All application routes except `/login` are nested under `AuthGate` and `AppShell`. The index route redirects to `/dashboard`; unknown authenticated paths also return to the dashboard.
