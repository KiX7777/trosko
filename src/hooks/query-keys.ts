import type { Period, TransactionFilters, TransactionSort } from '../types/domain'

export const queryKeys = {
  profile: () => ['profile'] as const,
  accounts: () => ['accounts'] as const,
  categories: () => ['categories'] as const,
  labels: () => ['labels'] as const,
  receipts: () => ['receipts'] as const,
  recurring: () => ['recurring'] as const,
  savedViews: () => ['saved-views'] as const,
  recentTransactions: () => ['transactions', { limit: 5 }] as const,
  dashboardRoot: () => ['dashboard'] as const,
  transactions: (filters?: TransactionFilters) =>
    filters === undefined ? (['transactions'] as const) : (['transactions', filters] as const),
  transactionPages: (filters: TransactionFilters, sort: TransactionSort) =>
    ['transactions', 'pages', filters, sort] as const,
  dashboard: (period: Period) => ['dashboard', period] as const,
  analytics: (dateFrom?: string, dateTo?: string) => ['analytics', dateFrom, dateTo] as const,
  dailyExpenses: (scope: 'transactions' | 'analytics', month: string) =>
    [scope, 'daily-expenses', month] as const,
}
