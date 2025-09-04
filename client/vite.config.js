// File: client/vite.config.js - UPDATED FOR PUSH NOTIFICATIONS
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // CRITICAL CHANGE: Use injectManifest for custom service worker
      strategies: 'generateSW',
      srcDir: 'public',
      filename: 'sw.js',
      injectManifest: {
        swSrc: 'public/sw.js',
        swDest: 'dist/sw.js',
        globDirectory: 'dist',
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,jpg,jpeg,gif,webp,woff,woff2}',
        ],
        // Don't precache these
        globIgnores: [
          'node_modules/**/*',
          'sw.js',
          'workbox-*.js',
          'manifest.json',
        ],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
      },
      includeAssets: [
        'favicon_io/favicon.ico',
        'favicon_io/apple-touch-icon.png',
        'favicon_io/android-chrome-192x192.png',
        'favicon_io/android-chrome-512x512.png',
      ],
      manifest: {
        name: 'RadiantAI - Beauty & Wellness AI',
        short_name: 'RadiantAI',
        description:
          'AI-powered beauty and wellness management platform for med spas and beauty clinics',
        theme_color: '#ec4899',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        id: '/',
        categories: ['beauty', 'wellness', 'productivity'],
        dir: 'ltr',
        lang: 'en-US',
        prefer_related_applications: false,
        icons: [
          {
            src: '/favicon_io/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/favicon_io/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/favicon_io/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any',
          },
        ],
        shortcuts: [
          {
            name: 'Dashboard',
            short_name: 'Dashboard',
            description: 'Go to dashboard',
            url: '/dashboard',
            icons: [
              {
                src: '/favicon_io/android-chrome-192x192.png',
                sizes: '192x192',
              },
            ],
          },
          {
            name: 'Profile',
            short_name: 'Profile',
            description: 'View your profile',
            url: '/profile',
            icons: [
              {
                src: '/favicon_io/android-chrome-192x192.png',
                sizes: '192x192',
              },
            ],
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
      // Workbox configuration for runtime caching
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: false, // Let service worker handle this
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
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
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
  },
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
})
