import { create } from 'zustand'
import { localStorageService } from '../lib/local-storage'
import type { Transaction } from '../types/domain'

type Theme = 'system' | 'light' | 'dark'

interface UIState {
  theme: Theme
  quickAddOpen: boolean
  quickAddType: 'expense' | 'income' | 'transfer' | 'receipt'
  editingTransaction: { transaction: Transaction; transferAccountId?: string } | null
  setTheme: (theme: Theme) => void
  openQuickAdd: (type?: UIState['quickAddType']) => void
  openEditTransaction: (transaction: Transaction, transferAccountId?: string) => void
  closeQuickAdd: () => void
}

const storedTheme = localStorageService.get<unknown>('trosko-theme', null)
const initialTheme: Theme =
  storedTheme === 'system' || storedTheme === 'light' || storedTheme === 'dark'
    ? storedTheme
    : 'dark'

export const useUIStore = create<UIState>((set) => ({
  theme: initialTheme,
  quickAddOpen: false,
  quickAddType: 'expense',
  editingTransaction: null,
  setTheme: (theme) => {
    localStorageService.set('trosko-theme', theme)
    set({ theme })
  },
  openQuickAdd: (quickAddType = 'expense') =>
    set({ quickAddOpen: true, quickAddType, editingTransaction: null }),
  openEditTransaction: (transaction, transferAccountId) =>
    set({
      quickAddOpen: true,
      quickAddType: transaction.type,
      editingTransaction: { transaction, transferAccountId },
    }),
  closeQuickAdd: () => set({ quickAddOpen: false, editingTransaction: null }),
}))
