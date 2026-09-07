import { useEffect, type PropsWithChildren } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ToastContainer } from 'react-toastify'
import { queryClient } from '../lib/query-client'
import { useUIStore } from '../stores/ui-store'
import 'react-toastify/dist/ReactToastify.css'

export function AppProviders({ children }: PropsWithChildren) {
  const theme = useUIStore((state) => state.theme)

  useEffect(() => {
    const root = document.documentElement
    const resolvedTheme =
      theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: light)').matches
          ? 'light'
          : 'dark'
        : theme
    root.dataset.theme = resolvedTheme
  }, [theme])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ToastContainer position="bottom-center" autoClose={2400} theme="dark" hideProgressBar />
    </QueryClientProvider>
  )
}
