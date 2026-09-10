import { format } from 'date-fns'
import { create } from 'zustand'
import { localStorageService } from '../lib/local-storage'
import type { Period } from '../types/domain'

export const DASHBOARD_BALANCE_ACCOUNT_FILTER_KEY = 'trosko:dashboard:balance-account-ids'

function isAccountIdList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((id) => typeof id === 'string')
}

function readSelectedBalanceAccountIds(): string[] | null {
  const stored = localStorageService.get<unknown>(DASHBOARD_BALANCE_ACCOUNT_FILTER_KEY, null)
  return isAccountIdList(stored) ? stored : null
}

function persistSelectedBalanceAccountIds(accountIds: string[] | null) {
  if (accountIds === null) {
    localStorageService.remove(DASHBOARD_BALANCE_ACCOUNT_FILTER_KEY)
    return
  }

  localStorageService.set(DASHBOARD_BALANCE_ACCOUNT_FILTER_KEY, accountIds)
}

interface DashboardState {
  period: Period
  expenseMonth: string
  isBalanceFilterOpen: boolean
  selectedBalanceAccountIds: string[] | null
  setPeriod: (period: Period) => void
  setExpenseMonth: (expenseMonth: string) => void
  toggleBalanceFilter: () => void
  closeBalanceFilter: () => void
  selectAllBalanceAccounts: () => void
  toggleBalanceAccount: (accountId: string, activeAccountIds: string[]) => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  period: '1M',
  expenseMonth: format(new Date(), 'yyyy-MM'),
  isBalanceFilterOpen: false,
  selectedBalanceAccountIds: readSelectedBalanceAccountIds(),
  setPeriod: (period) => set({ period }),
  setExpenseMonth: (expenseMonth) => set({ expenseMonth }),
  toggleBalanceFilter: () => set((state) => ({ isBalanceFilterOpen: !state.isBalanceFilterOpen })),
  closeBalanceFilter: () => set({ isBalanceFilterOpen: false }),
  selectAllBalanceAccounts: () => {
    persistSelectedBalanceAccountIds(null)
    set({ selectedBalanceAccountIds: null })
  },
  toggleBalanceAccount: (accountId, activeAccountIds) =>
    set((state) => {
      const selectedIds = state.selectedBalanceAccountIds ?? activeAccountIds
      const nextSelectedIds = selectedIds.includes(accountId)
        ? selectedIds.filter((id) => id !== accountId)
        : [...selectedIds, accountId]

      persistSelectedBalanceAccountIds(nextSelectedIds)
      return { selectedBalanceAccountIds: nextSelectedIds }
    }),
}))
