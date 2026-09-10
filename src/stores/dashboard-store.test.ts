import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DASHBOARD_BALANCE_ACCOUNT_FILTER_KEY, useDashboardStore } from './dashboard-store'

describe('dashboard store', () => {
  beforeEach(() => {
    localStorage.clear()
    useDashboardStore.setState({
      period: '1M',
      isBalanceFilterOpen: false,
      selectedBalanceAccountIds: null,
    })
  })

  it('persists the selected balance accounts and clears the saved filter for all accounts', () => {
    useDashboardStore
      .getState()
      .toggleBalanceAccount('account-current', ['account-current', 'account-cash'])

    expect(useDashboardStore.getState().selectedBalanceAccountIds).toEqual(['account-cash'])
    expect(localStorage.getItem(DASHBOARD_BALANCE_ACCOUNT_FILTER_KEY)).toBe(
      JSON.stringify(['account-cash']),
    )

    useDashboardStore.getState().selectAllBalanceAccounts()

    expect(useDashboardStore.getState().selectedBalanceAccountIds).toBeNull()
    expect(localStorage.getItem(DASHBOARD_BALANCE_ACCOUNT_FILTER_KEY)).toBeNull()
  })

  it('loads a saved balance filter when the store starts', async () => {
    localStorage.setItem(DASHBOARD_BALANCE_ACCOUNT_FILTER_KEY, JSON.stringify(['account-cash']))
    vi.resetModules()

    const { useDashboardStore: hydratedDashboardStore } = await import('./dashboard-store')

    expect(hydratedDashboardStore.getState().selectedBalanceAccountIds).toEqual(['account-cash'])
  })
})
