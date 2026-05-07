// File: scripts/setup-push-notifications.js - SETUP SCRIPT
// Run this script to set up push notifications: node scripts/setup-push-notifications.js

import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import webpush from 'web-push'

console.log('🔥 Setting up Push Notifications for PWA...\n')

// Generate VAPID keys
console.log('📱 Generating VAPID keys...')
const vapidKeys = webpush.generateVAPIDKeys()

console.log('✅ VAPID keys generated successfully!')
console.log(`Public Key: ${vapidKeys.publicKey}`)
console.log(`Private Key: ${vapidKeys.privateKey}\n`)

// Create or update .env file
const envPath = '.env'
let envContent = ''

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8')
  console.log('📝 Updating existing .env file...')
} else {
  console.log('📝 Creating new .env file...')
}

// Remove existing VAPID keys if present
envContent = envContent.replace(/^VAPID_PUBLIC_KEY=.*$/m, '')
envContent = envContent.replace(/^VAPID_PRIVATE_KEY=.*$/m, '')
envContent = envContent.replace(/^VAPID_MAILTO=.*$/m, '')

// Add new VAPID keys
const vapidConfig = `
# Push Notification VAPID Keys
VAPID_PUBLIC_KEY=${vapidKeys.publicKey}
VAPID_PRIVATE_KEY=${vapidKeys.privateKey}
VAPID_MAILTO=your-email@example.com
`

envContent += vapidConfig.trim() + '\n'

fs.writeFileSync(envPath, envContent.trim() + '\n')

// Create icons directory and placeholder files
const iconsDir = 'public/icons'
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
  console.log('📁 Created public/icons directory')
}

// Create placeholder files for required icons
const requiredIcons = [
  'icon-72x72.png',
  'icon-96x96.png',
  'icon-128x128.png',
  'icon-144x144.png',
  'icon-152x152.png',
  'icon-192x192.png',
  'icon-384x384.png',
  'icon-512x512.png',
  'badge-72x72.png',
  'apple-touch-icon.png',
]

console.log('📱 Checking for required icon files...')
for (const icon of requiredIcons) {
  const iconPath = path.join(iconsDir, icon)
  if (!fs.existsSync(iconPath)) {
    console.log(`⚠️  Missing: ${icon} - Please add this icon file`)
  } else {
    console.log(`✅ Found: ${icon}`)
  }
}

// Create offline.html if it doesn't exist
const offlineHtmlPath = '../public/offline.html'
if (!fs.existsSync(offlineHtmlPath)) {
  const offlineHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Offline - PWA App</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #ec4899, #f43f5e);
            color: white;
            text-align: center;
        }
        .container {
            max-width: 400px;
            padding: 2rem;
        }
        .icon {
            font-size: 4rem;
            margin-bottom: 1rem;
        }
        h1 {
            margin-bottom: 1rem;
            font-size: 2rem;
        }
        p {
            margin-bottom: 2rem;
            opacity: 0.9;
            line-height: 1.5;
        }
        button {
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            cursor: pointer;
            font-size: 1rem;
            transition: background 0.2s;
        }
        button:hover {
            background: rgba(255, 255, 255, 0.3);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">📡</div>
        <h1>You're Offline</h1>
        <p>Don't worry! The app works offline too. Check your connection and try again.</p>
        <button onclick="window.location.reload()">Try Again</button>
    </div>
</body>
</html>`

  fs.writeFileSync(offlineHtmlPath, offlineHtml)
  console.log('📄 Created offline.html fallback page')
}

// Create service worker if using custom one
const swPath = 'public/sw.js'
if (!fs.existsSync(swPath)) {
  // The service worker content is already provided in the main artifacts
  console.log('⚠️  Remember to add the custom service worker at public/sw.js')
}

console.log('\n🎉 Push notification setup completed!')
console.log('\n📋 Next steps:')
console.log('1. Update VAPID_MAILTO in .env with your actual email')
console.log('2. Add all required icon files to public/icons/')
console.log('3. Install dependencies: npm install web-push vite-plugin-pwa')
console.log('4. Test push notifications in your app')
console.log('5. Deploy with HTTPS for push notifications to work')

console.log('\n⚠️  Important notes:')
console.log('- Push notifications only work over HTTPS (except localhost)')
console.log('- iOS has limited PWA push notification support')
console.log('- Users must grant permission for push notifications')
console.log('- Test thoroughly on different devices and browsers')

// Create a simple test script
const testScriptContent = `// File: scripts/test-push.js
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
`

const scriptsDir = 'scripts'
if (!fs.existsSync(scriptsDir)) {
  fs.mkdirSync(scriptsDir, { recursive: true })
}

fs.writeFileSync(path.join(scriptsDir, 'test-push.js'), testScriptContent)
console.log('🧪 Created test-push.js for testing notifications')

console.log('\n🚀 Ready to implement push notifications!')
