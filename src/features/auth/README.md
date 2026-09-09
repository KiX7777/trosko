# Authentication

`auth-page.tsx` renders sign-in and registration. When Supabase is configured it calls Supabase Auth; otherwise it creates a local demo session in `localStorage`. `auth-gate.tsx` listens for the Supabase session and redirects unauthenticated users to `/login`.

The demo branch intentionally keeps the product explorable without credentials. The authenticated branch relies on the repository's `currentUserId()` helper and the RLS policies in Supabase. Do not treat the demo session as a security boundary.
