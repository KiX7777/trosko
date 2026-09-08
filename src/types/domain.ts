export type TransactionType = 'expense' | 'income' | 'transfer'
export type AccountType = 'cash' | 'current' | 'credit_card' | 'savings' | 'wallet' | 'other'
export type CategoryType = 'expense' | 'income'
export type RecurrenceFrequency = 'weekly' | 'monthly' | 'yearly' | 'custom'
export type OcrStatus = 'pending' | 'processing' | 'needs_review' | 'completed' | 'failed'

export type TransactionFilters = {
  types?: TransactionType[]
  accounts?: string[]
  categories?: string[]
  labels?: string[]
  dateFrom?: string
  dateTo?: string
  amountMin?: number
  amountMax?: number
  currencies?: string[]
  search?: string
  recurring?: boolean
  hasReceipt?: boolean
}

export type Period = '7D' | '1M' | '3M' | '6M' | '1Y' | 'custom'

export interface Profile {
  id: string
  email: string
  displayName: string
  primaryCurrency: string
  theme: 'system' | 'light' | 'dark'
  createdAt: string
  updatedAt: string
}

export interface Account {
  id: string
  userId: string
  name: string
  type: AccountType
  currency: string
  initialBalance: number
  balance: number
  archivedAt?: string
  createdAt: string
  updatedAt: string
  color: string
}

export interface Category {
  id: string
  userId: string
  parentId?: string
  name: string
  icon: string
  color: string
  type: CategoryType
  createdAt: string
  updatedAt: string
}

export interface Label {
  id: string
  userId: string
  name: string
  color: string
  createdAt: string
  updatedAt: string
}

export interface Transaction {
  id: string
  userId: string
  accountId: string
  categoryId?: string
  type: TransactionType
  amount: number
  currency: string
  exchangeRate: number
  amountBase: number
  description: string
  merchant?: string
  transactionDate: string
  notes?: string
  recurringTransactionId?: string
  transferGroupId?: string
  labelIds: string[]
  receiptId?: string
  createdAt: string
  updatedAt: string
}

export interface RecurringTransaction {
  id: string
  userId: string
  accountId: string
  categoryId?: string
  type: 'expense' | 'income'
  amount: number
  currency: string
  frequency: RecurrenceFrequency
  interval: number
  startDate: string
  nextRunAt: string
  endDate?: string
  active: boolean
  autoLog: boolean
  description: string
  createdAt: string
  updatedAt: string
}

export type CreateRecurringInput = Omit<
  RecurringTransaction,
  'id' | 'userId' | 'createdAt' | 'updatedAt'
>

export interface UpdateRecurringInput extends CreateRecurringInput {
  id: string
}

export interface Receipt {
  id: string
  userId: string
  transactionId?: string
  filePath: string
  mimeType: string
  ocrStatus: OcrStatus
  ocrData?: {
    merchant?: string
    date?: string
    currency?: string
    total?: number
    suggestedCategory?: string
  }
  createdAt: string
}

export interface SavedView {
  id: string
  userId: string
  name: string
  page: string
  filters: TransactionFilters
  createdAt: string
  updatedAt: string
}

export interface DashboardSummary {
  balance: number
  income: number
  expenses: number
  netCashFlow: number
  previousNetCashFlow: number
  cashFlow: Array<{ date: string; income: number; expenses: number }>
  categoryBreakdown: Array<{
    categoryId: string
    name: string
    amount: number
    percentage: number
    color: string
  }>
  topMerchants: Array<{ merchant: string; amount: number; count: number }>
  transactionCount: number
}

export interface CreateTransactionInput {
  accountId: string
  categoryId?: string
  type: TransactionType
  amount: number
  currency: string
  description: string
  merchant?: string
  transactionDate: string
  notes?: string
  labelIds?: string[]
  recurringTransactionId?: string
  transferAccountId?: string
}

export interface UpdateTransactionInput extends CreateTransactionInput {
  id: string
}

export interface CreateAccountInput {
  name: string
  type: AccountType
  currency: string
  initialBalance: number
  color: string
}

export interface UpdateAccountInput extends CreateAccountInput {
  id: string
}
