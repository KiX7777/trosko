import { AppProviders } from './app/providers'
import { AppRouter } from './app/router'
import { PwaInstallPrompt } from './components/pwa-install-prompt'

export default function App() {
  return (
    <AppProviders>
      <AppRouter />
      <PwaInstallPrompt />
    </AppProviders>
  )
}
