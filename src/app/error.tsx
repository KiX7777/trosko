'use client'

import { ApplicationErrorPage } from './error-page'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ApplicationErrorPage error={error} resetErrorBoundary={reset} />
}
