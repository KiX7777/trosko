import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3001',
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['assets/context/*.svg'],
      manifest: {
        name: 'Troško — osobne financije',
        short_name: 'Troško',
        description: 'Preglednik osobnih financija i troškova.',
        theme_color: '#0b1326',
        background_color: '#0b1326',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/assets/context/context-icon-33.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: { cacheName: 'trosko-api', networkTimeoutSeconds: 5 },
          },
        ],
      },
    }),
  ],
})
