import { create } from 'zustand'

type Theme = 'system' | 'light' | 'dark'

interface UIState {
  theme: Theme
  quickAddOpen: boolean
  quickAddType: 'expense' | 'income' | 'transfer' | 'receipt'
  setTheme: (theme: Theme) => void
  openQuickAdd: (type?: UIState['quickAddType']) => void
  closeQuickAdd: () => void
}

const initialTheme = (localStorage.getItem('trosko-theme') as Theme | null) ?? 'dark'

export const useUIStore = create<UIState>((set) => ({
  theme: initialTheme,
  quickAddOpen: false,
  quickAddType: 'expense',
  setTheme: (theme) => {
    localStorage.setItem('trosko-theme', theme)
    set({ theme })
  },
  openQuickAdd: (quickAddType = 'expense') => set({ quickAddOpen: true, quickAddType }),
  closeQuickAdd: () => set({ quickAddOpen: false }),
}))
