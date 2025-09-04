// File: client/vite.config.js - CLIENT SIDE - Updated with PWA Push Notification Configuration
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
      registerType: 'autoUpdate', // Keep your existing setting
      workbox: {
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,jpg,jpeg,gif,webp,woff,woff2}', // Your existing patterns
        ],
        cleanupOutdatedCaches: true, // Your existing setting
        skipWaiting: true, // Your existing setting

        // Additional runtime caching for better offline experience
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24,
              },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },

      includeAssets: [
        // Your existing assets
        'favicon_io/favicon.ico',
        'favicon_io/apple-touch-icon.png',
        'favicon_io/android-chrome-192x192.png',
        'favicon_io/android-chrome-512x512.png',
        // Additional notification icons
        'icons/badge-72x72.png',
      ],

      manifest: {
        name: 'RadiantAI - Beauty & Wellness AI', // Your existing name
        short_name: 'RadiantAI', // Your existing short name
        description:
          'AI-powered beauty and wellness management platform for med spas and beauty clinics', // Your existing description
        theme_color: '#6366f1', // Your existing theme color
        background_color: '#f8fafc', // Your existing background color
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait',

        // Your existing icons
        icons: [
          {
            src: 'favicon_io/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable any',
          },
          {
            src: 'favicon_io/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable any',
          },
          {
            src: 'favicon_io/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any',
          },
          // Additional badge icon for notifications
          {
            src: 'icons/badge-72x72.png',
            sizes: '72x72',
            type: 'image/png',
          },
        ],

        // Enhanced PWA features for better native app experience
        categories: ['productivity', 'health', 'beauty'],
        lang: 'en-US',
        dir: 'ltr',

        // iOS specific enhancements
        apple: {
          webAppCapable: true,
          webAppStatusBarStyle: 'default',
          webAppTitle: 'RadiantAI',
        },

        // Shortcuts for quick access
        shortcuts: [
          {
            name: 'Notifications',
            short_name: 'Notifications',
            description: 'View your notifications',
            url: '/notifications',
            icons: [
              {
                src: 'favicon_io/android-chrome-192x192.png',
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
                src: 'favicon_io/android-chrome-192x192.png',
                sizes: '192x192',
              },
            ],
          },
        ],

        // Share target capability
        share_target: {
          action: '/share-target/',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            title: 'title',
            text: 'text',
            url: 'url',
          },
        },

        // Display overrides for different form factors
        display_override: [
          'window-controls-overlay',
          'standalone',
          'minimal-ui',
        ],

        // Protocol handlers
        protocol_handlers: [
          {
            protocol: 'web+radiantai',
            url: '/?handler=%s',
          },
        ],
      },

      devOptions: {
        enabled: true, // Your existing setting
      },

      // Use injectManifest for custom service worker with push notifications
      strategies: 'injectManifest',
      injectManifest: {
        swSrc: 'public/sw.js',
        swDest: 'sw.js',
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,jpg,jpeg,gif,webp,woff,woff2}',
        ],
      },
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // Your existing alias
    },
  },

  build: {
    outDir: 'dist', // Your existing setting - fixes dev-dist folder issue
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['@tanstack/react-query'],
        },
      },
    },
  },

  server: {
    port: 5173, // Default Vite port
    host: true,
    https: false, // Set to true for local HTTPS development (required for push notifications)
  },

  preview: {
    port: 4173,
    host: true,
  },
})

// Environment variables needed in your .env file:
/*
# For push notifications (add these after implementing custom service worker):
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key-here

# Your existing environment variables
VITE_API_URL=http://localhost:5000/api
*/
