import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/app-shell'
import { AnalyticsPage } from '../features/analytics/analytics-page'
import { AccountsPage } from '../features/accounts/accounts-page'
import { CategoriesPage } from '../features/categories/categories-page'
import { DashboardPage } from '../features/dashboard/dashboard-page'
import { LabelsPage } from '../features/labels/labels-page'
import { RecurringPage } from '../features/recurring/recurring-page'
import { ReceiptsPage } from '../features/receipts/receipts-page'
import { SettingsPage } from '../features/settings/settings-page'
import { TransactionsPage } from '../features/transactions/transactions-page'
import { AuthPage } from '../features/auth/auth-page'
import { AuthGate } from '../features/auth/auth-gate'

export function AppRouter() {
  return (
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
  )
}
