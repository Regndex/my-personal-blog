import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'مدونتي',
        short_name: 'مدونتي',
        description: 'مدونة شخصية لمشاركة الأفكار والمقالات والقصص.',
        lang: 'ar',
        dir: 'rtl',
        theme_color: '#2C6E5E',
        background_color: '#F8F6F2',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell (HTML/CSS/JS) is precached automatically by the plugin.
        // Supabase's REST API for posts is cached at runtime too, so a post
        // already opened once stays readable offline afterward.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/rest/v1/posts'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'posts-api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/storage/v1/object/public/blog-images'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'post-images-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
})
