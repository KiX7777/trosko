# Application styles

`src/styles.css` is the only application stylesheet imported by `main.tsx`. It is intentionally kept small and imports the files in this directory in cascade order.

## File organization

- `foundation.css` contains tokens, reset rules, and document defaults.
- `app-shell.css`, `route-states.css`, and `responsive.css` own application-level layout and states.
- `ui-components.css`, `modals-date-picker.css`, and `charts.css` contain reusable UI surfaces.
- Feature files such as `dashboard.css`, `transactions.css`, and `receipts.css` own selectors specific to those workflows.
- `compact-dashboard.css` preserves the compact dashboard presentation that predates the product shell.

Add new modules to `src/styles.css`; do not import them directly from React components. Import order is significant because later modules may refine shared selectors.

## Styling model

- CSS custom properties define the color, surface, border, typography, spacing, shadow, and radius tokens.
- Components use semantic block/element/modifier class names such as `sidebar__link` and `mobile-nav__quick-add`.
- The root `data-theme` attribute switches light and dark token values.
- Responsive layouts are implemented with CSS breakpoints and are complemented by compact UI decisions in feature components.
- Shared primitives should consume existing tokens before introducing new colors or arbitrary spacing.

When a style is used by more than one feature, move it to the relevant shared module. Keep feature-only selectors in a file named after the feature. Verify both themes and mobile layouts when changing shared tokens.
