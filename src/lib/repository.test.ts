import { beforeEach, describe, expect, it } from 'vitest'
import {
  createRecurring,
  getAccounts,
  getRecurring,
  getTransactions,
  resetDemoData,
  updateTransaction,
} from './repository'

describe('updateTransaction', () => {
  beforeEach(() => {
    localStorage.clear()
    resetDemoData()
  })

  it('updates transaction fields and moves the balance between accounts', async () => {
    const updated = await updateTransaction({
      id: 'tx-konzum',
      accountId: 'account-current',
      categoryId: 'category-food',
      type: 'expense',
      amount: 100,
      currency: 'EUR',
      description: 'Nova kupnja',
      merchant: 'Nova trgovina',
      transactionDate: '2026-09-08',
      labelIds: ['label-business'],
    })

    expect(updated).toMatchObject({
      id: 'tx-konzum',
      accountId: 'account-current',
      amount: 100,
      description: 'Nova kupnja',
      transactionDate: '2026-09-08',
    })
    expect((await getTransactions()).find((transaction) => transaction.id === 'tx-konzum')).toEqual(
      expect.objectContaining({ labelIds: ['label-business'] }),
    )

    const accounts = await getAccounts()
    expect(accounts.find((account) => account.id === 'account-current')?.balance).toBe(6740)
    expect(accounts.find((account) => account.id === 'account-visa')?.balance).toBe(1363)
  })

  it('creates the paired entry when a transaction becomes a transfer', async () => {
    await updateTransaction({
      id: 'tx-konzum',
      accountId: 'account-current',
      type: 'transfer',
      amount: 50,
      currency: 'EUR',
      description: 'Prijenos u štednju',
      transactionDate: '2026-09-08',
      transferAccountId: 'account-savings',
    })

    const transactions = await getTransactions()
    const transferEntries = transactions.filter((transaction) => transaction.amount === 50)
    expect(transferEntries).toHaveLength(2)
    expect(transferEntries.map((transaction) => transaction.accountId)).toEqual(
      expect.arrayContaining(['account-current', 'account-savings']),
    )
  })
})

describe('recurring auto-log', () => {
  beforeEach(() => {
    localStorage.clear()
    resetDemoData()
  })

  it('creates due transactions and advances an auto-log template', async () => {
    await createRecurring({
      accountId: 'account-current',
      categoryId: 'category-subscriptions',
      type: 'expense',
      amount: 20,
      currency: 'EUR',
      frequency: 'monthly',
      interval: 1,
      startDate: '2020-01-01',
      nextRunAt: '2020-01-01',
      endDate: '2020-03-01',
      active: true,
      autoLog: true,
      description: 'Test subscription',
    })

    const recurring = await getRecurring()
    const created = (await getTransactions()).filter(
      (transaction) => transaction.description === 'Test subscription',
    )

    expect(created).toHaveLength(3)
    expect(created.map((transaction) => transaction.transactionDate)).toEqual([
      '2020-01-01',
      '2020-02-01',
      '2020-03-01',
    ])
    expect(recurring.find((item) => item.description === 'Test subscription')).toMatchObject({
      active: false,
      autoLog: true,
      nextRunAt: '2020-04-01',
    })
  })

  it('keeps due templates manual when auto-log is disabled', async () => {
    await createRecurring({
      accountId: 'account-current',
      type: 'expense',
      amount: 20,
      currency: 'EUR',
      frequency: 'monthly',
      interval: 1,
      startDate: '2020-01-01',
      nextRunAt: '2020-01-01',
      active: true,
      autoLog: false,
      description: 'Manual subscription',
    })

    await getRecurring()

    expect(
      (await getTransactions()).some((item) => item.description === 'Manual subscription'),
    ).toBe(false)
    expect(
      (await getRecurring()).find((item) => item.description === 'Manual subscription'),
    ).toMatchObject({
      active: true,
      autoLog: false,
      nextRunAt: '2020-01-01',
    })
  })
})
