// File: public/sw.js - CLIENT SIDE - Service Worker for Push Notifications
const CACHE_NAME = 'pwa-cache-v1'
const urlsToCache = [
  '/',
  '/offline.html',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/badge-72x72.png',
]

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => self.clients.claim())
  )
})

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request)
      })
      .catch(() => {
        // Show offline page for navigation requests
        if (event.request.destination === 'document') {
          return caches.match('/offline.html')
        }
      })
  )
})

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Push event received:', event)

  let notificationData = {
    title: 'New Notification',
    body: 'You have a new notification!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'default-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/view-icon.png',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss-icon.png',
      },
    ],
    data: {
      url: '/notifications',
      timestamp: Date.now(),
    },
    vibrate: [200, 100, 200],
  }

  if (event.data) {
    try {
      const payload = event.data.json()
      notificationData = { ...notificationData, ...payload }
    } catch (e) {
      console.error('Error parsing notification payload:', e)
      notificationData.body = event.data.text()
    }
  }

  // Show notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      actions: notificationData.actions,
      data: notificationData.data,
      vibrate: notificationData.vibrate,
      silent: notificationData.silent || false,
      timestamp: notificationData.data?.timestamp || Date.now(),
      image: notificationData.image, // Large image for rich notifications
      dir: 'ltr',
      lang: 'en',
    })
  )
})

// Notification click event - handle notification interactions
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event)

  const notification = event.notification
  const data = notification.data || {}

  notification.close()

  if (event.action === 'dismiss') {
    // Just close the notification
    return
  }

  // Handle view action or notification click
  const urlToOpen = data.url || '/'

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i]
          if (client.url === new URL(urlToOpen, self.location.origin).href) {
            // App is open, focus the window
            return client.focus()
          }
        }

        // Check if any app window is open
        if (clientList.length > 0) {
          const client = clientList[0]
          // Navigate existing window to the notification URL
          client.navigate(urlToOpen)
          return client.focus()
        }

        // No app window is open, open a new one
        return clients.openWindow(urlToOpen)
      })
      .then((windowClient) => {
        // Send message to the client about the notification click
        if (windowClient && data.notificationId) {
          windowClient.postMessage({
            type: 'NOTIFICATION_CLICKED',
            notificationId: data.notificationId,
            category: data.category,
            action: event.action || 'view',
          })
        }
      })
  )
})

// Notification close event - handle when user dismisses notification
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event)

  const data = event.notification.data || {}

  // Track notification dismissal if needed
  if (data.notificationId) {
    // Could send analytics event here
    console.log('Notification dismissed:', data.notificationId)
  }
})

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-notifications') {
    event.waitUntil(
      // Handle any offline notification actions
      handleBackgroundSync()
    )
  }
})

async function handleBackgroundSync() {
  try {
    // Get any pending notification actions from IndexedDB
    // and sync them when back online
    console.log('Handling background sync for notifications')
  } catch (error) {
    console.error('Background sync failed:', error)
  }
}

// Message event - handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('Service worker received message:', event.data)

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Periodically clean up old notifications (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'cleanup-notifications') {
    event.waitUntil(cleanupOldNotifications())
  }
})

async function cleanupOldNotifications() {
  try {
    const notifications = await self.registration.getNotifications()
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

    notifications.forEach((notification) => {
      const timestamp = notification.data?.timestamp || notification.timestamp
      if (timestamp && timestamp < oneWeekAgo) {
        notification.close()
      }
    })
  } catch (error) {
    console.error('Error cleaning up notifications:', error)
  }
}
