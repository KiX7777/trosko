# Feature styles

The primary design system lives in `src/styles.css`. This directory holds styles that are meaningful enough to separate from the global stylesheet, currently the receipt workflow in `receipts.css`.

## Styling model

- CSS custom properties define the color, surface, border, typography, spacing, shadow, and radius tokens.
- Components use semantic block/element/modifier class names such as `sidebar__link` and `mobile-nav__quick-add`.
- The root `data-theme` attribute switches light and dark token values.
- Responsive layouts are implemented with CSS breakpoints and are complemented by compact UI decisions in feature components.
- Shared primitives should consume existing tokens before introducing new colors or arbitrary spacing.

When a style is used by more than one feature, move it to `src/styles.css`. Keep feature-only selectors here and make the filename match the feature. Verify both themes and mobile layouts when changing shared tokens.
