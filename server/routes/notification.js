// File: server/routes/notification.js - UPDATED WITH ELEVATED USER PERMISSIONS
import express from 'express'
import {
  deleteAllReadNotifications,
  deleteNotification,
  getUnreadCount,
  getUserNotifications,
  getVapidPublicKey,
  markAllNotificationsAsSeen,
  markNotificationAsRead,
  sendNotifications,
  subscribeToPush,
  testPushNotification,
  unsubscribeFromPush,
} from '../controller/notification.js'
import {
  checkManagementAccess,
  verifyToken,
} from '../middleware/authMiddleware.js'

const router = express.Router()

// Public routes (no auth required)
router.get('/vapid-public-key', getVapidPublicKey)

// All other notification routes require authentication
router.use(verifyToken)

// Push notification routes
router.post('/push/subscribe', subscribeToPush)
router.post('/push/unsubscribe', unsubscribeFromPush)
router.post('/push/test', testPushNotification)

// Get user's notifications
router.get('/', getUserNotifications)

// Get unread count
router.get('/unread-count', getUnreadCount)

// Mark notification as read
router.put('/:notificationId/read', markNotificationAsRead)

// Mark all notifications as read
router.put('/mark-all-seen', markAllNotificationsAsSeen)

// Delete specific notification
router.delete('/:notificationId', deleteNotification)

// Delete all read notifications
router.delete('/read/all', deleteAllReadNotifications)

// UPDATED: Send notifications (elevated users: admin, spa, enterprise, super-admin)
router.post('/send', checkManagementAccess, sendNotifications)

export default router
