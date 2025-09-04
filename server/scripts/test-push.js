// File: scripts/test-push.js
// Test script to send a push notification

import webpush from 'web-push'
import dotenv from 'dotenv'

dotenv.config()

webpush.setVapidDetails(
  process.env.VAPID_MAILTO,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

// Replace with actual subscription from your app
const subscription = {
  endpoint: 'YOUR_ENDPOINT_HERE',
  keys: {
    p256dh: 'YOUR_P256DH_KEY_HERE',
    auth: 'YOUR_AUTH_KEY_HERE'
  }
}

const payload = JSON.stringify({
  title: '🎉 Test Notification',
  body: 'Your push notifications are working!',
  icon: '/icons/icon-192x192.png',
  badge: '/icons/badge-72x72.png',
  tag: 'test',
  data: {
    url: '/notifications'
  }
})

webpush.sendNotification(subscription, payload)
  .then(() => console.log('✅ Test notification sent!'))
  .catch(err => console.error('❌ Error:', err))
