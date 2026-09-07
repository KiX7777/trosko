import {
  demoAccounts,
  demoCategories,
  demoLabels,
  demoProfile,
  demoRecurring,
  demoTransactions,
  demoUserId,
} from './mock-data'
import { supabase } from './supabase'
import type {
  Account,
  Category,
  CreateAccountInput,
  CreateTransactionInput,
  DashboardSummary,
  Label,
  Profile,
  RecurringTransaction,
  SavedView,
  Transaction,
  TransactionFilters,
} from '../types/domain'

const storagePrefix = 'trosko-db:'
type Row = Record<string, any>

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
function read<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(`${storagePrefix}${key}`)
    return stored ? (JSON.parse(stored) as T) : clone(fallback)
  } catch {
    return clone(fallback)
  }
}
function write<T>(key: string, value: T) {
  localStorage.setItem(`${storagePrefix}${key}`, JSON.stringify(value))
}
function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}
function delay<T>(value: T, milliseconds = 100) {
  return new Promise<T>((resolve) => window.setTimeout(() => resolve(clone(value)), milliseconds))
}
function client() {
  if (!supabase) throw new Error('Supabase nije konfiguriran.')
  return supabase
}

async function currentUserId() {
  const { data, error } = await client().auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('Za pristup podacima potrebno je prijaviti se.')
  return data.user.id
}

function mapProfile(row: Row): Profile {
  return {
    id: row.id,
    email: row.email ?? '',
    displayName: row.display_name ?? '',
    primaryCurrency: row.primary_currency ?? 'EUR',
    theme: row.theme ?? 'system',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
function mapAccount(row: Row): Account {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    type: row.type,
    currency: row.currency,
    initialBalance: Number(row.initial_balance ?? 0),
    balance: Number(row.balance ?? 0),
    archivedAt: row.archived_at ?? undefined,
    color: row.color ?? '#6bd8cb',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
function mapCategory(row: Row): Category {
  return {
    id: row.id,
    userId: row.user_id,
    parentId: row.parent_id ?? undefined,
    name: row.name,
    icon: row.icon ?? 'receipt',
    color: row.color ?? '#6bd8cb',
    type: row.type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
function mapLabel(row: Row): Label {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    color: row.color ?? '#6bd8cb',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
function mapTransaction(row: Row): Transaction {
  const labels = Array.isArray(row.transaction_labels)
    ? row.transaction_labels.map((item: Row) => item.label_id).filter(Boolean)
    : []
  return {
    id: row.id,
    userId: row.user_id,
    accountId: row.account_id,
    categoryId: row.category_id ?? undefined,
    type: row.type,
    amount: Number(row.amount ?? 0),
    currency: row.currency ?? 'EUR',
    exchangeRate: Number(row.exchange_rate ?? 1),
    amountBase: Number(row.amount_base ?? row.amount ?? 0),
    description: row.description,
    merchant: row.merchant ?? undefined,
    transactionDate: row.transaction_date,
    notes: row.notes ?? undefined,
    recurringTransactionId: row.recurring_transaction_id ?? undefined,
    transferGroupId: row.transfer_group_id ?? undefined,
    labelIds: labels,
    receiptId: row.receipt_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
function mapRecurring(row: Row): RecurringTransaction {
  return {
    id: row.id,
    userId: row.user_id,
    accountId: row.account_id,
    categoryId: row.category_id ?? undefined,
    type: row.type,
    amount: Number(row.amount ?? 0),
    currency: row.currency ?? 'EUR',
    frequency: row.frequency,
    interval: Number(row.interval ?? 1),
    startDate: row.start_date,
    nextRunAt: row.next_run_at,
    endDate: row.end_date ?? undefined,
    active: Boolean(row.active),
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
function mapSavedView(row: Row): SavedView {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    page: row.page,
    filters: row.filters ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function applyTransactionFilters(transactions: Transaction[], filters: TransactionFilters) {
  let result = transactions
  if (filters.types?.length) result = result.filter((tx) => filters.types?.includes(tx.type))
  if (filters.accounts?.length)
    result = result.filter((tx) => filters.accounts?.includes(tx.accountId))
  if (filters.categories?.length)
    result = result.filter((tx) => tx.categoryId && filters.categories?.includes(tx.categoryId))
  if (filters.labels?.length)
    result = result.filter((tx) => tx.labelIds.some((labelId) => filters.labels?.includes(labelId)))
  if (filters.currencies?.length)
    result = result.filter((tx) => filters.currencies?.includes(tx.currency))
  if (filters.dateFrom) result = result.filter((tx) => tx.transactionDate >= filters.dateFrom!)
  if (filters.dateTo) result = result.filter((tx) => tx.transactionDate <= filters.dateTo!)
  if (filters.amountMin !== undefined)
    result = result.filter((tx) => tx.amountBase >= filters.amountMin!)
  if (filters.amountMax !== undefined)
    result = result.filter((tx) => tx.amountBase <= filters.amountMax!)
  if (filters.recurring !== undefined)
    result = result.filter((tx) =>
      filters.recurring ? Boolean(tx.recurringTransactionId) : !tx.recurringTransactionId,
    )
  if (filters.hasReceipt !== undefined)
    result = result.filter((tx) => (filters.hasReceipt ? Boolean(tx.receiptId) : !tx.receiptId))
  if (filters.search?.trim()) {
    const needle = filters.search.trim().toLocaleLowerCase('hr')
    result = result.filter((tx) =>
      [tx.description, tx.merchant, tx.notes]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('hr')
        .includes(needle),
    )
  }
  return result.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))
}

function buildSummary(
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[],
): DashboardSummary {
  const expenses = transactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amountBase, 0)
  const income = transactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amountBase, 0)
  const categoryTotals = categories
    .filter((category) => category.type === 'expense' && !category.parentId)
    .map((category) => {
      const amount = transactions
        .filter(
          (tx) =>
            tx.type === 'expense' &&
            (tx.categoryId === category.id ||
              categories.some(
                (child) => child.id === tx.categoryId && child.parentId === category.id,
              )),
        )
        .reduce((sum, tx) => sum + tx.amountBase, 0)
      return {
        categoryId: category.id,
        name: category.name,
        amount,
        percentage: Math.round((amount / Math.max(expenses, 1)) * 100),
        color: category.color,
      }
    })
    .filter((item) => item.amount > 0)
  const merchants = new Map<string, { amount: number; count: number }>()
  transactions
    .filter((tx) => tx.type === 'expense' && tx.merchant)
    .forEach((tx) => {
      const current = merchants.get(tx.merchant!) ?? { amount: 0, count: 0 }
      merchants.set(tx.merchant!, {
        amount: current.amount + tx.amountBase,
        count: current.count + 1,
      })
    })
  const today = new Date()
  const cashFlow = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (6 - index))
    const iso = date.toISOString().slice(0, 10)
    const dayTransactions = transactions.filter((tx) => tx.transactionDate === iso)
    return {
      label: new Intl.DateTimeFormat('hr-HR', { weekday: 'short' }).format(date).replace('.', ''),
      income: dayTransactions
        .filter((tx) => tx.type === 'income')
        .reduce((sum, tx) => sum + tx.amountBase, 0),
      expenses: dayTransactions
        .filter((tx) => tx.type === 'expense')
        .reduce((sum, tx) => sum + tx.amountBase, 0),
    }
  })
  return {
    balance: accounts.reduce((sum, account) => sum + account.balance, 0),
    income,
    expenses,
    netCashFlow: income - expenses,
    previousNetCashFlow: 0,
    cashFlow,
    categoryBreakdown: categoryTotals,
    topMerchants: [...merchants.entries()]
      .map(([merchant, value]) => ({ merchant, ...value }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5),
    transactionCount: transactions.length,
  }
}

export async function getProfile(): Promise<Profile> {
  if (supabase) {
    const userId = await currentUserId()
    const { data, error } = await client()
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (error) throw error
    if (data) return mapProfile(data)
    const { data: userData } = await client().auth.getUser()
    const bootstrap = {
      id: userId,
      email: userData.user?.email ?? '',
      display_name: userData.user?.user_metadata?.display_name ?? '',
      primary_currency: 'EUR',
      theme: 'system',
    }
    const created = await client().from('profiles').insert(bootstrap).select('*').single()
    if (!created.error && created.data) return mapProfile(created.data)
    return {
      id: userId,
      email: bootstrap.email,
      displayName: bootstrap.display_name,
      primaryCurrency: 'EUR',
      theme: 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }
  return delay(read('profile', demoProfile))
}

export async function updateProfile(input: Partial<Profile>): Promise<Profile> {
  if (supabase) {
    const userId = await currentUserId()
    const payload: Row = {}
    if (input.displayName !== undefined) payload.display_name = input.displayName
    if (input.primaryCurrency !== undefined) payload.primary_currency = input.primaryCurrency
    if (input.theme !== undefined) payload.theme = input.theme
    const { data, error } = await client()
      .from('profiles')
      .update(payload)
      .eq('id', userId)
      .select('*')
      .single()
    if (error) throw error
    return mapProfile(data)
  }
  const profile = { ...read('profile', demoProfile), ...input, updatedAt: new Date().toISOString() }
  write('profile', profile)
  return delay(profile)
}

export async function getAccounts(includeArchived = false): Promise<Account[]> {
  if (supabase) {
    const userId = await currentUserId()
    let query = client()
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    if (!includeArchived) query = query.is('archived_at', null)
    const { data, error } = await query
    if (error) throw error
    return (data ?? []).map(mapAccount)
  }
  const accounts = read('accounts', demoAccounts)
  return delay(includeArchived ? accounts : accounts.filter((account) => !account.archivedAt))
}

export async function createAccount(input: CreateAccountInput): Promise<Account> {
  if (supabase) {
    const userId = await currentUserId()
    const { data, error } = await client()
      .from('accounts')
      .insert({
        user_id: userId,
        name: input.name,
        type: input.type,
        currency: input.currency,
        initial_balance: input.initialBalance,
        balance: input.initialBalance,
        color: input.color,
      })
      .select('*')
      .single()
    if (error) throw error
    return mapAccount(data)
  }
  const accounts = read('accounts', demoAccounts)
  const timestamp = new Date().toISOString()
  const account: Account = {
    ...input,
    id: id('account'),
    userId: demoUserId,
    balance: input.initialBalance,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  write('accounts', [...accounts, account])
  return delay(account)
}

export async function archiveAccount(accountId: string): Promise<void> {
  if (supabase) {
    const userId = await currentUserId()
    const { error } = await client()
      .from('accounts')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', accountId)
      .eq('user_id', userId)
    if (error) throw error
    return
  }
  const accounts = read('accounts', demoAccounts).map((account) =>
    account.id === accountId
      ? { ...account, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      : account,
  )
  write('accounts', accounts)
  return delay(undefined)
}

export async function getCategories(): Promise<Category[]> {
  if (supabase) {
    const userId = await currentUserId()
    const { data, error } = await client()
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('name')
    if (error) throw error
    return (data ?? []).map(mapCategory)
  }
  return delay(read('categories', demoCategories))
}

export async function createCategory(
  input: Pick<Category, 'name' | 'type' | 'icon' | 'color'> & { parentId?: string },
): Promise<Category> {
  if (supabase) {
    const userId = await currentUserId()
    const { data, error } = await client()
      .from('categories')
      .insert({
        user_id: userId,
        name: input.name,
        type: input.type,
        icon: input.icon,
        color: input.color,
        parent_id: input.parentId ?? null,
      })
      .select('*')
      .single()
    if (error) throw error
    return mapCategory(data)
  }
  const categories = read('categories', demoCategories)
  const timestamp = new Date().toISOString()
  const category: Category = {
    ...input,
    id: id('category'),
    userId: demoUserId,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  write('categories', [...categories, category])
  return delay(category)
}

export async function getLabels(): Promise<Label[]> {
  if (supabase) {
    const userId = await currentUserId()
    const { data, error } = await client()
      .from('labels')
      .select('*')
      .eq('user_id', userId)
      .order('name')
    if (error) throw error
    return (data ?? []).map(mapLabel)
  }
  return delay(read('labels', demoLabels))
}

export async function createLabel(input: Pick<Label, 'name' | 'color'>): Promise<Label> {
  if (supabase) {
    const userId = await currentUserId()
    const { data, error } = await client()
      .from('labels')
      .insert({ user_id: userId, name: input.name, color: input.color })
      .select('*')
      .single()
    if (error) throw error
    return mapLabel(data)
  }
  const labels = read('labels', demoLabels)
  const timestamp = new Date().toISOString()
  const label: Label = {
    ...input,
    id: id('label'),
    userId: demoUserId,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  write('labels', [...labels, label])
  return delay(label)
}

export async function getSavedViews(page = 'transactions'): Promise<SavedView[]> {
  if (supabase) {
    const userId = await currentUserId()
    const { data, error } = await client()
      .from('saved_views')
      .select('*')
      .eq('user_id', userId)
      .eq('page', page)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(mapSavedView)
  }
  return delay(read<SavedView[]>('saved-views', []).filter((view) => view.page === page))
}

export async function createSavedView(
  name: string,
  filters: TransactionFilters,
  page = 'transactions',
): Promise<SavedView> {
  if (supabase) {
    const userId = await currentUserId()
    const { data, error } = await client()
      .from('saved_views')
      .insert({ user_id: userId, name, page, filters })
      .select('*')
      .single()
    if (error) throw error
    return mapSavedView(data)
  }
  const savedViews = read<SavedView[]>('saved-views', [])
  const timestamp = new Date().toISOString()
  const view: SavedView = {
    id: id('view'),
    userId: demoUserId,
    name,
    page,
    filters,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  write('saved-views', [...savedViews, view])
  return delay(view)
}

export async function getTransactions(filters: TransactionFilters = {}): Promise<Transaction[]> {
  if (supabase) {
    const userId = await currentUserId()
    const { data, error } = await client()
      .from('transactions')
      .select('*, transaction_labels(label_id)')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false })
    if (error) throw error
    return applyTransactionFilters((data ?? []).map(mapTransaction), filters)
  }
  return delay(applyTransactionFilters(read('transactions', demoTransactions), filters))
}

async function updateAccountBalance(accountId: string, delta: number, userId: string) {
  const { data, error } = await client()
    .from('accounts')
    .select('balance')
    .eq('id', accountId)
    .eq('user_id', userId)
    .single()
  if (error) throw error
  const update = await client()
    .from('accounts')
    .update({ balance: Number(data.balance ?? 0) + delta })
    .eq('id', accountId)
    .eq('user_id', userId)
  if (update.error) throw update.error
}

export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  if (supabase) {
    const userId = await currentUserId()
    const groupId = input.type === 'transfer' ? crypto.randomUUID() : null
    const basePayload = {
      user_id: userId,
      account_id: input.accountId,
      category_id: input.categoryId ?? null,
      type: input.type,
      amount: input.amount,
      currency: input.currency,
      exchange_rate: 1,
      amount_base: input.amount,
      description: input.description,
      merchant: input.merchant ?? null,
      transaction_date: input.transactionDate,
      notes: input.notes ?? null,
      recurring_transaction_id: input.recurringTransactionId ?? null,
      transfer_group_id: groupId,
    }
    const { data, error } = await client()
      .from('transactions')
      .insert(basePayload)
      .select('*')
      .single()
    if (error) throw error
    await updateAccountBalance(
      input.accountId,
      input.type === 'income' ? input.amount : -input.amount,
      userId,
    )
    if (input.labelIds?.length) {
      const labelsInsert = await client()
        .from('transaction_labels')
        .insert(input.labelIds.map((labelId) => ({ transaction_id: data.id, label_id: labelId })))
      if (labelsInsert.error) throw labelsInsert.error
    }
    if (input.type === 'transfer' && input.transferAccountId) {
      const paired = await client()
        .from('transactions')
        .insert({ ...basePayload, account_id: input.transferAccountId, transfer_group_id: groupId })
        .select('*')
        .single()
      if (paired.error) throw paired.error
      await updateAccountBalance(input.transferAccountId, input.amount, userId)
    }
    return mapTransaction({
      ...data,
      transaction_labels: input.labelIds?.map((labelId) => ({ label_id: labelId })) ?? [],
    })
  }
  const transactions = read('transactions', demoTransactions)
  const accounts = read('accounts', demoAccounts)
  const timestamp = new Date().toISOString()
  const transaction: Transaction = {
    id: id('tx'),
    userId: demoUserId,
    accountId: input.accountId,
    categoryId: input.categoryId,
    type: input.type,
    amount: input.amount,
    currency: input.currency,
    exchangeRate: 1,
    amountBase: input.amount,
    description: input.description,
    merchant: input.merchant,
    transactionDate: input.transactionDate,
    notes: input.notes,
    labelIds: input.labelIds ?? [],
    recurringTransactionId: input.recurringTransactionId,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  const nextTransactions = [...transactions, transaction]
  write('transactions', nextTransactions)
  const accountDelta = input.type === 'income' ? input.amount : -input.amount
  write(
    'accounts',
    accounts.map((account) =>
      account.id === input.accountId
        ? { ...account, balance: account.balance + accountDelta, updatedAt: timestamp }
        : account,
    ),
  )
  if (input.type === 'transfer' && input.transferAccountId) {
    const transfer: Transaction = {
      ...transaction,
      id: id('tx'),
      accountId: input.transferAccountId,
      transferGroupId: transaction.id,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    write('transactions', [...nextTransactions, transfer])
    write(
      'accounts',
      read('accounts', demoAccounts).map((account) =>
        account.id === input.transferAccountId
          ? { ...account, balance: account.balance + input.amount, updatedAt: timestamp }
          : account,
      ),
    )
  }
  return delay(transaction)
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  if (supabase) {
    const userId = await currentUserId()
    const { data, error } = await client()
      .from('transactions')
      .select('transfer_group_id')
      .eq('id', transactionId)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    const result = data?.transfer_group_id
      ? await client()
          .from('transactions')
          .delete()
          .eq('transfer_group_id', data.transfer_group_id)
          .eq('user_id', userId)
      : await client().from('transactions').delete().eq('id', transactionId).eq('user_id', userId)
    if (result.error) throw result.error
    return
  }
  const transactions = read('transactions', demoTransactions)
  write(
    'transactions',
    transactions.filter((transaction) => transaction.id !== transactionId),
  )
  return delay(undefined)
}

export async function getRecurring(): Promise<RecurringTransaction[]> {
  if (supabase) {
    const userId = await currentUserId()
    const { data, error } = await client()
      .from('recurring_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('next_run_at')
    if (error) throw error
    return (data ?? []).map(mapRecurring)
  }
  return delay(read('recurring', demoRecurring))
}

export async function createRecurring(
  input: Omit<RecurringTransaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
): Promise<RecurringTransaction> {
  if (supabase) {
    const userId = await currentUserId()
    const { data, error } = await client()
      .from('recurring_transactions')
      .insert({
        user_id: userId,
        account_id: input.accountId,
        category_id: input.categoryId ?? null,
        type: input.type,
        amount: input.amount,
        currency: input.currency,
        frequency: input.frequency,
        interval: input.interval,
        start_date: input.startDate,
        next_run_at: input.nextRunAt,
        end_date: input.endDate ?? null,
        active: input.active,
        description: input.description,
      })
      .select('*')
      .single()
    if (error) throw error
    return mapRecurring(data)
  }
  const recurring = read('recurring', demoRecurring)
  const timestamp = new Date().toISOString()
  const template: RecurringTransaction = {
    ...input,
    id: id('rec'),
    userId: demoUserId,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  write('recurring', [...recurring, template])
  return delay(template)
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  if (supabase) {
    const [transactions, accounts, categories] = await Promise.all([
      getTransactions(),
      getAccounts(),
      getCategories(),
    ])
    return buildSummary(transactions, accounts, categories)
  }
  return delay(
    buildSummary(
      read('transactions', demoTransactions),
      read('accounts', demoAccounts),
      read('categories', demoCategories),
    ),
  )
}

export async function resetDemoData() {
  if (supabase) return
  ;[
    'profile',
    'accounts',
    'categories',
    'labels',
    'saved-views',
    'transactions',
    'recurring',
  ].forEach((key) => localStorage.removeItem(`${storagePrefix}${key}`))
}
