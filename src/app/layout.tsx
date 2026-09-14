import type { Metadata, Viewport } from 'next'
import { AppProviders } from './providers'
import { Application } from './application'
import '../styles.css'
import '../styles/receipts.css'

export const metadata: Metadata = {
  title: 'Troško — osobne financije',
  description: 'Preglednik osobnih financija i troškova.',
  applicationName: 'Troško',
  manifest: '/manifest.webmanifest',
}

export const viewport: Viewport = {
  themeColor: '#0b1326',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hr">
      <body>
        <div id="root">
          <AppProviders>
            <Application>{children}</Application>
          </AppProviders>
        </div>
      </body>
    </html>
  )
}
