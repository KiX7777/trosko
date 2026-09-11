import {
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { endOfMonth, format, startOfMonth } from 'date-fns'
import {
  createSavedView,
  createTransaction,
  deleteTransaction,
  getSavedViews,
  getTransactions,
  getTransactionsPage,
  updateTransaction,
} from '../lib/repository'
import type { Transaction, TransactionFilters, TransactionSort } from '../types/domain'
import type { MutationCallbacks } from './mutation-callbacks'
import { queryKeys } from './query-keys'

export function useTransactionsQuery(filters: TransactionFilters = {}) {
  return useQuery({
    queryKey: queryKeys.transactions(filters),
    queryFn: () => getTransactions(filters),
  })
}

export const TRANSACTION_PAGE_SIZE = 50

export function useInfiniteTransactionsQuery(
  filters: TransactionFilters = {},
  sort: TransactionSort = { id: 'transactionDate', desc: true },
) {
  return useInfiniteQuery({
    queryKey: queryKeys.transactionPages(filters, sort),
    queryFn: ({ pageParam }) =>
      getTransactionsPage(filters, pageParam, TRANSACTION_PAGE_SIZE, sort),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
  })
}

export function useAllTransactionsQuery() {
  return useQuery({ queryKey: queryKeys.transactions(), queryFn: () => getTransactions() })
}

export function useRecentTransactionsQuery() {
  return useQuery({
    queryKey: queryKeys.recentTransactions(),
    queryFn: () => getTransactions(),
  })
}

export function useDailyExpenseTransactionsQuery(
  scope: 'transactions' | 'analytics',
  month: string,
  dateFrom: string,
  dateTo: string,
) {
  return useQuery({
    queryKey: queryKeys.dailyExpenses(scope, month),
    queryFn: () => getTransactions({ types: ['expense'], dateFrom, dateTo }),
  })
}

export function useDailyExpenseTransactionsQueries(
  scope: 'transactions' | 'analytics',
  months: readonly string[],
) {
  return useQueries({
    queries: months.map((month) => {
      const monthDate = new Date(`${month}-01T12:00:00`)
      const dateFrom = format(startOfMonth(monthDate), 'yyyy-MM-dd')
      const dateTo = format(endOfMonth(monthDate), 'yyyy-MM-dd')

      return {
        queryKey: queryKeys.dailyExpenses(scope, month),
        queryFn: () => getTransactions({ types: ['expense'], dateFrom, dateTo }),
      }
    }),
  })
}

export type SaveTransactionInput = {
  accountId: string
  categoryId?: string
  type: Transaction['type']
  amount: number
  description: string
  merchant?: string
  transactionDate: string
  transferAccountId?: string
  labelId?: string
  currency?: string
  receiptId?: string
}

export function useSaveTransactionMutation(
  transaction: Transaction | undefined,
  callbacks: MutationCallbacks<SaveTransactionInput> = {},
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ labelId, ...values }: SaveTransactionInput) =>
      transaction
        ? updateTransaction({
            ...values,
            id: transaction.id,
            currency: values.currency ?? transaction.currency,
            labelIds: labelId ? [labelId] : [],
            notes: transaction.notes,
            recurringTransactionId: transaction.recurringTransactionId,
            receiptId: values.receiptId ?? transaction.receiptId,
          })
        : createTransaction({
            ...values,
            currency: values.currency ?? 'EUR',
            labelIds: labelId ? [labelId] : [],
          }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.transactions() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboardRoot() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.receipts() })
      callbacks.onSuccess?.(variables)
    },
    onError: callbacks.onError,
  })
}

export function useDeleteTransactionMutation(callbacks: MutationCallbacks<string> = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteTransaction,
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.transactions() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboardRoot() })
      callbacks.onSuccess?.(variables)
    },
    onError: callbacks.onError,
  })
}

export function useSavedViewsQuery(page = 'transactions') {
  return useQuery({ queryKey: queryKeys.savedViews(), queryFn: () => getSavedViews(page) })
}

export function useCreateSavedViewMutation(
  filters: TransactionFilters,
  callbacks: MutationCallbacks<string> = {},
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => createSavedView(name, filters),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.savedViews() })
      callbacks.onSuccess?.(variables)
    },
    onError: callbacks.onError,
  })
}
