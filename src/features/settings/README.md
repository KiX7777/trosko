# Settings

Settings owns profile display name, primary currency, theme selection, data exports, and demo-data reset. Theme values are `system`, `light`, and `dark`; the provider resolves `system` against the browser preference and writes the resolved value to the root `data-theme` attribute.

The PDF action opens a range picker. It asks the backend for a styled report after the range is confirmed; in Supabase mode, the backend uses the authenticated user's token to select the report data itself.

The reset action is intended for local demo mode. Treat it as a destructive operation in any future cloud-backed settings flow and preserve the existing confirmation UX when extending it.
