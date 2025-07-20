// server/routes/notification.js
import express from 'express'
import {
  deleteAllReadNotifications,
  deleteNotification,
  getUnreadCount,
  getUserNotifications,
  markAllNotificationsAsSeen,
  markNotificationAsRead,
  sendNotifications,
} from '../controller/notification.js'
import { verifyToken } from '../middleware/authMiddleware.js'

const router = express.Router()

// All notification routes require authentication
router.use(verifyToken)

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

// Send notifications (admin only) - moved from auth routes
router.post('/send', sendNotifications)

export default router
