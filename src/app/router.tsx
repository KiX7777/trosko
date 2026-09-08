import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/app-shell'
import { AuthGate } from '../features/auth/auth-gate'

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
  return <div role="status">Loading…</div>
}

export function AppRouter() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
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
      </Routes>
    </Suspense>
  )
}
