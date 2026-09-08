import { beforeEach, describe, expect, it } from 'vitest'
import { getAccounts, getTransactions, resetDemoData, updateTransaction } from './repository'

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
