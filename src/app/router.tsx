import { lazy, Suspense } from 'react'
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Route,
  RouterProvider,
} from 'react-router-dom'
import { AppShell } from '../components/app-shell'
import { AuthGate } from '../features/auth/auth-gate'
import { RouteErrorPage } from './error-page'

const AnalyticsPage = lazy(() =>
  import('../features/analytics/analytics-page').then(({ AnalyticsPage }) => ({
    default: AnalyticsPage,
  })),
)
const AccountsPage = lazy(() =>
  import('../features/accounts/accounts-page').then(({ AccountsPage }) => ({
    default: AccountsPage,
  })),
)
const CategoriesPage = lazy(() =>
  import('../features/categories/categories-page').then(({ CategoriesPage }) => ({
    default: CategoriesPage,
  })),
)
const DashboardPage = lazy(() =>
  import('../features/dashboard/dashboard-page').then(({ DashboardPage }) => ({
    default: DashboardPage,
  })),
)
const LabelsPage = lazy(() =>
  import('../features/labels/labels-page').then(({ LabelsPage }) => ({ default: LabelsPage })),
)
const RecurringPage = lazy(() =>
  import('../features/recurring/recurring-page').then(({ RecurringPage }) => ({
    default: RecurringPage,
  })),
)
const ReceiptsPage = lazy(() =>
  import('../features/receipts/receipts-page').then(({ ReceiptsPage }) => ({
    default: ReceiptsPage,
  })),
)
const SettingsPage = lazy(() =>
  import('../features/settings/settings-page').then(({ SettingsPage }) => ({
    default: SettingsPage,
  })),
)
const TransactionsPage = lazy(() =>
  import('../features/transactions/transactions-page').then(({ TransactionsPage }) => ({
    default: TransactionsPage,
  })),
)
const AuthPage = lazy(() =>
  import('../features/auth/auth-page').then(({ AuthPage }) => ({ default: AuthPage })),
)

function RouteLoading() {
  return (
    <main className="route-loading" role="status" aria-label="Učitavanje aplikacije">
      <div className="route-loading__ambient" aria-hidden="true" />
      <div className="route-loading__shell" aria-hidden="true">
        <aside className="route-loading__sidebar">
          <div className="route-loading__brand">
            <span className="route-loading__mark">
              <img src="/icons/icon-192.svg" alt="" aria-hidden="true" />
            </span>
            <strong>Troško</strong>
          </div>
          <div className="route-loading__nav">
            <span className="route-loading__nav-item route-loading__nav-item--active">
              <i />
              <i />
            </span>
            <span className="route-loading__nav-item">
              <i />
              <i />
            </span>
            <span className="route-loading__nav-item">
              <i />
              <i />
            </span>
            <span className="route-loading__nav-item">
              <i />
              <i />
            </span>
          </div>
          <span className="route-loading__sidebar-footer" />
        </aside>

        <section className="route-loading__workspace">
          <header className="route-loading__header">
            <div>
              <span className="route-loading__line route-loading__line--kicker" />
              <span className="route-loading__line route-loading__line--title" />
            </div>
            <div className="route-loading__header-actions">
              <span className="route-loading__circle route-loading__circle--small" />
              <span className="route-loading__circle" />
            </div>
          </header>
          <div className="route-loading__content">
            <div className="route-loading__intro">
              <div>
                <span className="route-loading__line route-loading__line--eyebrow" />
                <span className="route-loading__line route-loading__line--heading" />
                <span className="route-loading__line route-loading__line--description" />
              </div>
              <span className="route-loading__button" />
            </div>
            <div className="route-loading__cards">
              <span className="route-loading__card route-loading__card--wide" />
              <span className="route-loading__card" />
              <span className="route-loading__card" />
            </div>
            <div className="route-loading__lower-grid">
              <span className="route-loading__chart">
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </span>
              <span className="route-loading__side-card" />
            </div>
          </div>
        </section>
      </div>
      <div className="route-loading__message">
        <span className="route-loading__spinner" />
      </div>
      <span className="route-loading__sr-only">Učitavam…</span>
    </main>
  )
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route errorElement={<RouteErrorPage />}>
      <Route path="/login" element={<AuthPage />} />
      <Route
        path="/"
        element={
          <AuthGate>
            <AppShell />
          </AuthGate>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="recurring" element={<RecurringPage />} />
        <Route path="receipts" element={<ReceiptsPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="labels" element={<LabelsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Route>,
  ),
)

export function AppRouter() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <RouterProvider router={router} />
    </Suspense>
  )
}
