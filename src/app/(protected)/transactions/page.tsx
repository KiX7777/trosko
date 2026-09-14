'use client'

import { Suspense } from 'react'
import { TransactionsPage } from '../../../features/transactions/transactions-page'

export default function Page() {
  return (
    <Suspense fallback={null}>
      <TransactionsPage />
    </Suspense>
  )
}
