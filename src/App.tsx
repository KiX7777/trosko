import { ErrorBoundary } from 'react-error-boundary'
import { ApplicationErrorPage } from './app/error-page'
import { AppProviders } from './app/providers'
import { AppRouter } from './app/router'
import { PwaInstallPrompt } from './components/pwa-install-prompt'

export default function App() {
  return (
    <ErrorBoundary FallbackComponent={ApplicationErrorPage}>
      <AppProviders>
        <AppRouter />
        <PwaInstallPrompt />
      </AppProviders>
    </ErrorBoundary>
  )
}
