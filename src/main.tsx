import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './styles.css'
import './styles/receipts.css'

registerSW({
  immediate: true,
  onNeedReload: () => {
    if (document.visibilityState === 'visible') {
      window.location.reload()
      return
    }

    window.addEventListener('visibilitychange', () => window.location.reload(), { once: true })
  },
  onRegisteredSW: (_swUrl, registration) => {
    if (!registration) return

    const checkForUpdates = () => {
      void registration.update().catch(() => undefined)
    }

    checkForUpdates()
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdates()
    })
    window.setInterval(checkForUpdates, 60_000)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
