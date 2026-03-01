import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Essensgruppe – Abitur 2027',
        short_name: 'Essensgruppe',
        description: 'Community-Portal der Essensgruppe – Forum, Events, Games & mehr.',
        theme_color: '#0d1420',
        background_color: '#0a0e1a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff,woff2}'],
        runtimeCaching: [
          // Google Fonts CSS — stale-while-revalidate
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-css',
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          // Google Fonts binaries — cache-first, immutable
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 365, maxEntries: 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Uploaded files (avatars, photos)
          {
            urlPattern: /\/uploads\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'uploads',
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 7, maxEntries: 100 },
            },
          },
          // Forum posts — network-first, 5s timeout, 24h cache
          {
            urlPattern: /\/api\/posts.*/i,
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
              cacheName: 'api-posts',
              networkTimeoutSeconds: 5,
              expiration: { maxAgeSeconds: 60 * 60 * 24, maxEntries: 30 },
              cacheableResponse: { statuses: [200] },
            },
          },
          // Events — network-first, 4h cache
          {
            urlPattern: /\/api\/events.*/i,
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
              cacheName: 'api-events',
              networkTimeoutSeconds: 5,
              expiration: { maxAgeSeconds: 60 * 60 * 4, maxEntries: 5 },
              cacheableResponse: { statuses: [200] },
            },
          },
          // Predictions — network-first, 30min cache (live odds)
          {
            urlPattern: /\/api\/predictions.*/i,
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
              cacheName: 'api-predictions',
              networkTimeoutSeconds: 5,
              expiration: { maxAgeSeconds: 60 * 30, maxEntries: 5 },
              cacheableResponse: { statuses: [200] },
            },
          },
          // Current user profile — stale-while-revalidate
          {
            urlPattern: /\/api\/users\/me$/i,
            handler: 'StaleWhileRevalidate',
            method: 'GET',
            options: {
              cacheName: 'api-user-me',
              expiration: { maxAgeSeconds: 60 * 60 * 2, maxEntries: 3 },
              cacheableResponse: { statuses: [200] },
            },
          },
          // MC announcements — cache-first, 6h
          {
            urlPattern: /\/api\/announcements.*/i,
            handler: 'CacheFirst',
            method: 'GET',
            options: {
              cacheName: 'api-announcements',
              expiration: { maxAgeSeconds: 60 * 60 * 6, maxEntries: 5 },
              cacheableResponse: { statuses: [200] },
            },
          },
          // WebSocket — never cache
          {
            urlPattern: /\/socket\.io\/.*/i,
            handler: 'NetworkOnly',
          },
          // All other API routes (mutations, games, auth, admin, chat) — never cache
          {
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  build: {
    sourcemap: false,
  },
  server: {
    host: true,
    port: 3001,
    strictPort: true,
    allowedHosts: ['essensgruppe.de', 'www.essensgruppe.de'],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
