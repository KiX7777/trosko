'use client'

import type { PropsWithChildren } from 'react'
import { AppShell } from '../../components/app-shell'
import { AuthGate } from '../../features/auth/auth-gate'

export default function ProtectedLayout({ children }: PropsWithChildren) {
  return (
    <AuthGate>
      <AppShell>{children}</AppShell>
    </AuthGate>
  )
}
