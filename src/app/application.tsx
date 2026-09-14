'use client'

import { ErrorBoundary } from 'react-error-boundary'
import type { PropsWithChildren } from 'react'
import { ApplicationErrorPage } from './error-page'

export function Application({ children }: PropsWithChildren) {
  return <ErrorBoundary FallbackComponent={ApplicationErrorPage}>{children}</ErrorBoundary>
}
