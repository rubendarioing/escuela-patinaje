import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // El Service Worker se registra a mano, desde PwaUpdatePrompt (paso 49)
      injectRegister: false,
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'offline.html'],
      manifest: {
        name: 'Escuela de Patinaje',
        short_name: 'Patinaje',
        description: 'Escuela de patinaje: programas, sedes, horarios e inscripciones.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#15803d',
        background_color: '#ffffff',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Cada navegación entre páginas: intenta la red primero,
            // y si falla y tampoco hay nada en caché, muestra offline.html
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-cache',
              networkTimeoutSeconds: 3,
              plugins: [
                {
                  // "caches" es global del Service Worker (navegador), no de Node;
                  // este archivo corre en Node al compilar, de ahí el "any".
                  handlerDidError: async () =>
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (await (globalThis as any).caches?.match('/offline.html')) ?? Response.error(),
                },
              ],
            },
          },
          {
            // Nunca cachear respuestas de Supabase (regla de seguridad del plan)
            urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co'),
            handler: 'NetworkOnly',
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
})
