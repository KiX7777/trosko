# Frontend test setup

`setup.ts` is loaded by Vitest before tests run. It provides the browser-like test environment and shared Testing Library setup used by component and utility tests.

Keep tests close to the code they exercise when practical (`*.test.ts` or `*.test.tsx`). Prefer pure repository/formatting tests for business rules and focused interaction tests for form controls. When a feature needs browser APIs, extend the shared setup rather than duplicating global mocks in individual test files.
