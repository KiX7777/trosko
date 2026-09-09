# Settings

Settings owns profile display name, primary currency, theme selection, and demo-data reset. Theme values are `system`, `light`, and `dark`; the provider resolves `system` against the browser preference and writes the resolved value to the root `data-theme` attribute.

The reset action is intended for local demo mode. Treat it as a destructive operation in any future cloud-backed settings flow and preserve the existing confirmation UX when extending it.
