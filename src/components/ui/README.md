# UI primitives

This directory is Troško's small component system. It includes buttons, fields, currency inputs, selects, modals, metric cards, badges, status indicators, icons, category controls, and TanStack chart helpers.

## Conventions

- Components expose semantic variants instead of page-specific class combinations.
- Form controls integrate with `react-hook-form` through controlled wrappers where appropriate.
- Currency and number entry must preserve the domain's positive-amount rules and locale-aware display.
- Icons are selected through the shared `Icon` component and the project icon map.
- Modals and menus must support close actions, focusable controls, and clear accessible labels.

The primitives are styled by the global token system in `src/styles.css`. Add a new primitive here only when it is reusable across two or more feature areas; otherwise keep it close to the feature.
