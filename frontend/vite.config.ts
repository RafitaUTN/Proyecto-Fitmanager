import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { validatePublicApiUrl } from './src/config/api-url-policy.js'

export default defineConfig(({ command, mode }) => {
    if (command === 'build') {
      const fileEnv = loadEnv(mode, __dirname, '')
      validatePublicApiUrl(process.env.VITE_API_URL || fileEnv.VITE_API_URL, mode === 'production', {
        allowAndroidEmulatorLocal:
          process.env.VITE_ALLOW_ANDROID_EMULATOR_API === 'true' || fileEnv.VITE_ALLOW_ANDROID_EMULATOR_API === 'true',
      })
    }
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'favicon.png', 'assets/logo-completo.png', 'assets/logo-minimalista.png'],
        manifest: {
          name: 'FitManager',
          short_name: 'FitManager',
          description: 'Plataforma SaaS para gestionar clientes, membresías, pagos, asistencias, rutinas y reportes de gimnasios.',
          theme_color: '#090909',
          background_color: '#090909',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          categories: ['business', 'productivity', 'health', 'fitness'],
          icons: [
            { src: '/pwa/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/pwa/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallback: '/index.html',
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.destination === 'image' || request.destination === 'font',
              handler: 'CacheFirst',
              options: {
                cacheName: 'fitmanager-static-assets',
                expiration: {
                  maxEntries: 80,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/assets/'),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'fitmanager-build-assets',
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
