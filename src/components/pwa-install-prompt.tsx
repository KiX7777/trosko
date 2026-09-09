import '@khmyznikov/pwa-install'

export function PwaInstallPrompt() {
  return (
    <pwa-install
      manual-how-to
      use-local-storage
      disable-screenshots
      manifest-url="/manifest.webmanifest"
      install-description="Dodaj Troško na početni zaslon za brži pristup i rad kao aplikacija."
      styles={{ '--tint-color': '#54cdb0' }}
    />
  )
}
