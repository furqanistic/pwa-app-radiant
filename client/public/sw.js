// File: public/sw.js - SIMPLIFIED SERVICE WORKER FOR MOBILE
// Minimal service worker that won't interfere with mobile performance

/* eslint-env serviceworker */
/* global clients, caches, self */

// REQUIRED: Workbox will inject the manifest here
self.__WB_MANIFEST

const CACHE_NAME = 'radiantai-v1'
const OFFLINE_URL = './offline.html'

// Essential files to cache
const urlsToCache = [
  '/',
  './offline.html',
  '/manifest.json',
  '/favicon_io/android-chrome-192x192.png',
  '/favicon_io/android-chrome-512x512.png',
]

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install')

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching essential files')
        return cache.addAll(urlsToCache)
      })
      .catch((error) => {
        console.error('[Service Worker] Cache installation failed:', error)
      })
  )

  // Force the waiting service worker to become the active service worker
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate')

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )

  // Claim all clients immediately
  return self.clients.claim()
})

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return

  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith('http')) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If request is successful, clone and cache it (for future offline use)
        if (response.status === 200) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
        }
        return response
      })
      .catch(() => {
        // Network failed, try to serve from cache
        return caches.match(event.request).then((response) => {
          if (response) {
            return response
          }

          // If it's a navigation request and not cached, serve offline page
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL)
          }

          // For other requests, just fail gracefully
          return new Response('Offline', {
            status: 408,
            statusText: 'Offline',
          })
        })
      })
  )
})

// Handle messages from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Optional: Basic push notification handler (simplified)
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received')

  const options = {
    title: 'RadiantAI',
    body: event.data ? event.data.text() : 'New notification',
    icon: '/favicon_io/android-chrome-192x192.png',
    badge: '/favicon_io/android-chrome-192x192.png',
    tag: 'radiantai-notification',
    data: {
      url: '/dashboard',
    },
  }

  event.waitUntil(self.registration.showNotification(options.title, options))
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked')

  event.notification.close()

  const urlToOpen = event.notification.data?.url || '/dashboard'

  event.waitUntil(clients.openWindow(urlToOpen))
})

console.log(
  '[Service Worker] Loaded - Simplified version for mobile compatibility'
)
