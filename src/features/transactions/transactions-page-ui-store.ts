import { create } from 'zustand'

export type TransactionFilterDraft = {
  dateFrom: string
  dateTo: string
  accountId: string
  categoryId: string
  labelId: string
  amountMin: string
  amountMax: string
  recurring: string
  hasReceipt: string
}

type TransactionsPageUIState = {
  filtersOpen: boolean
  filterDraft: TransactionFilterDraft
  saveViewOpen: boolean
  saveViewName: string
  savedViewsOpen: boolean
  openFilters: (filterDraft: TransactionFilterDraft) => void
  closeFilters: () => void
  updateFilterDraft: (filterDraft: Partial<TransactionFilterDraft>) => void
  openSaveView: (name: string) => void
  closeSaveView: () => void
  setSaveViewName: (name: string) => void
  toggleSavedViews: () => void
  closeSavedViews: () => void
  reset: () => void
}

function createInitialState() {
  return {
    filtersOpen: false,
    filterDraft: {
      dateFrom: '',
      dateTo: '',
      accountId: '',
      categoryId: '',
      labelId: '',
      amountMin: '',
      amountMax: '',
      recurring: '',
      hasReceipt: '',
    },
    saveViewOpen: false,
    saveViewName: '',
    savedViewsOpen: false,
  }
}

export const useTransactionsPageUIStore = create<TransactionsPageUIState>((set) => ({
  ...createInitialState(),
  openFilters: (filterDraft) => set({ filtersOpen: true, filterDraft }),
  closeFilters: () => set({ filtersOpen: false }),
  updateFilterDraft: (filterDraft) =>
    set((state) => ({ filterDraft: { ...state.filterDraft, ...filterDraft } })),
  openSaveView: (name) => set({ saveViewOpen: true, saveViewName: name }),
  closeSaveView: () => set({ saveViewOpen: false, saveViewName: '' }),
  setSaveViewName: (saveViewName) => set({ saveViewName }),
  toggleSavedViews: () => set((state) => ({ savedViewsOpen: !state.savedViewsOpen })),
  closeSavedViews: () => set({ savedViewsOpen: false }),
  reset: () => set(createInitialState()),
}))
