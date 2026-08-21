import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.svg', 'icons/*.png'],
      manifest: {
        name: 'PetShop Manager',
        short_name: 'PetShop',
        description: 'Gerencie seu petshop com agendamentos, relatórios e lembretes por WhatsApp',
        theme_color: '#791286',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        categories: ['business', 'productivity'],
        icons: [
          {
            src: '/icons/icon-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: '/icons/icon-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
        ],
        screenshots: [
          {
            src: '/screenshots/home.jpg',
            sizes: '1280x720',
            type: 'image/jpeg',
            form_factor: 'wide',
          },
          {
            src: '/screenshots/dashboard.jpg',
            sizes: '720x1280',
            type: 'image/jpeg',
            form_factor: 'narrow',
          },
        ],
        shortcuts: [
          {
            name: 'Novo Agendamento',
            description: 'Criar um novo agendamento rápido',
            url: '/appointments/new',
            icons: [{ src: '/icons/icon-192x192.svg', sizes: '192x192' }],
          },
          {
            name: 'Ver Hoje',
            description: 'Ver agendamentos de hoje',
            url: '/appointments/today',
            icons: [{ src: '/icons/icon-192x192.svg', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 24 * 60 * 60, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
        ],
      },
    }),
  ],
})