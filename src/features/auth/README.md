# Authentication

`auth-page.tsx` renders sign-in and registration. When Supabase is configured it calls Supabase Auth; otherwise it creates a local demo session in `localStorage`. `auth-gate.tsx` listens for the Supabase session and redirects unauthenticated users to `/login`.

Supabase mode also supports passkey sign-in through WebAuthn. A signed-in, confirmed user first registers a passkey from Settings; subsequent sign-ins can use the passkey button without entering an email. The Supabase client opts into the experimental passkey API, and the project must separately enable Passkeys and configure its relying-party ID and allowed origins in the Supabase Dashboard.

The demo branch intentionally keeps the product explorable without credentials. The authenticated branch relies on the repository's `currentUserId()` helper and the RLS policies in Supabase. Do not treat the demo session as a security boundary.
