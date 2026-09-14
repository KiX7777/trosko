import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Troško — osobne financije',
    short_name: 'Troško',
    description: 'Preglednik osobnih financija i troškova.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0b1326',
    theme_color: '#0b1326',
    lang: 'hr',
    icons: [
      { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'maskable' },
      { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  }
}
