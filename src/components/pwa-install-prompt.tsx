import { useEffect, useState } from 'react'
import { t } from '../lib/i18n'
import { Icon } from './ui/icon'
import { Button } from './ui/button'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function isRunningStandalone() {
  const standaloneNavigator = navigator as Navigator & { standalone?: boolean }
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    standaloneNavigator.standalone === true
  )
}

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isRunningStandalone()) return

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
      setIsVisible(true)
    }

    function handleAppInstalled() {
      setInstallEvent(null)
      setIsVisible(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  if (!isVisible || !installEvent) return null

  async function handleInstall() {
    if (!installEvent) return
    const pendingInstall = installEvent
    try {
      await pendingInstall.prompt()
      await pendingInstall.userChoice
    } finally {
      setInstallEvent(null)
      setIsVisible(false)
    }
  }

  return (
    <aside className="pwa-install-prompt" role="status" aria-live="polite">
      <div className="pwa-install-prompt__icon">
        <Icon name="download" size={19} />
      </div>
      <div className="pwa-install-prompt__copy">
        <strong>{t('pwa.installTitle')}</strong>
        <p>{t('pwa.installDescription')}</p>
      </div>
      <div className="pwa-install-prompt__actions">
        <Button variant="primary" onClick={handleInstall}>
          {t('pwa.install')}
        </Button>
        <button
          type="button"
          className="pwa-install-prompt__dismiss"
          onClick={() => setIsVisible(false)}
        >
          {t('common.close')}
        </button>
      </div>
    </aside>
  )
}
