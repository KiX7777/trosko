# Translations

`hr.json` is the current Croatian translation catalog. Keys are grouped by concern (`nav`, `common`, `validation`, `auth`, and feature-specific namespaces). `src/lib/i18n.ts` provides the typed `t()` function and interpolation support.

When adding UI copy, add a key here first and reference it from React. Use interpolation for dynamic values, for example `t('workspace.currency', { currency })`. Keep labels short enough for the mobile navigation and test missing-key behavior when changing the helper.
