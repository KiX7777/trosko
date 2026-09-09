import { useQuery } from '@tanstack/react-query'
import { getDashboardSummary } from '../lib/repository'
import type { Period } from '../types/domain'
import { useAccountsQuery } from './use-account-queries'
import { useProfileQuery } from './use-profile-queries'
import { queryKeys } from './query-keys'
import {
  useDailyExpenseTransactionsQuery,
  useRecentTransactionsQuery,
} from './use-transaction-queries'
import { useRecurringQuery } from './use-recurring-queries'

export function useDashboardSummaryQuery(period: Period) {
  return useQuery({
    queryKey: queryKeys.dashboard(period),
    queryFn: () => getDashboardSummary(period),
  })
}

export function useDashboardQueries(
  expenseMonth: string,
  dateFrom: string,
  dateTo: string,
  period: Period,
) {
  return {
    summary: useDashboardSummaryQuery(period),
    accounts: useAccountsQuery(),
    transactions: useRecentTransactionsQuery(),
    dailyExpenseTransactions: useDailyExpenseTransactionsQuery(
      'transactions',
      expenseMonth,
      dateFrom,
      dateTo,
    ),
    recurring: useRecurringQuery(),
    profile: useProfileQuery(),
  }
}

export function useAnalyticsQueries(
  dateFrom: string | undefined,
  dateTo: string | undefined,
  expenseMonth: string,
  expenseMonthStart: string,
  expenseMonthEnd: string,
) {
  const summary = useQuery({
    queryKey: queryKeys.analytics(dateFrom, dateTo),
    queryFn: () => getDashboardSummary({ dateFrom, dateTo }),
  })
  const dailyExpenseTransactions = useDailyExpenseTransactionsQuery(
    'analytics',
    expenseMonth,
    expenseMonthStart,
    expenseMonthEnd,
  )
  return { summary, dailyExpenseTransactions }
}
