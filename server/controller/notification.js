// File: server/controller/notification.js - UPDATED WITH PUSH NOTIFICATIONS
import webpush from 'web-push'
import { createError } from '../error.js'
import Notification from '../models/Notification.js'
import PushSubscription from '../models/PushSubscription.js'
import User from '../models/User.js'

// Configure web-push (Add these to your environment variables)
webpush.setVapidDetails(
  `mailto:${process.env.VAPID_MAILTO || 'your-email@example.com'}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

// Helper function to send push notification
const sendPushNotification = async (subscription, payload) => {
  try {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    }

    await webpush.sendNotification(pushSubscription, JSON.stringify(payload))

    // Update last used timestamp
    await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      { lastUsed: new Date() }
    )

    return true
  } catch (error) {
    console.error('Push notification failed:', error)

    // Handle expired/invalid subscriptions
    if (error.statusCode === 410 || error.statusCode === 404) {
      await PushSubscription.findOneAndUpdate(
        { endpoint: subscription.endpoint },
        { isActive: false }
      )
    }

    return false
  }
}

// Subscribe to push notifications
export const subscribeToPush = async (req, res, next) => {
  try {
    const { subscription } = req.body
    const userId = req.user.id

    if (!subscription || !subscription.endpoint) {
      return next(createError(400, 'Invalid subscription data'))
    }

    // Extract user agent info
    const userAgent = req.get('User-Agent') || ''
    const deviceInfo = {
      platform: userAgent.includes('Mobile') ? 'mobile' : 'desktop',
      browser: userAgent.includes('Chrome')
        ? 'Chrome'
        : userAgent.includes('Firefox')
        ? 'Firefox'
        : userAgent.includes('Safari')
        ? 'Safari'
        : 'Unknown',
    }

    // Create or update subscription
    const pushSubscription = await PushSubscription.findOneAndUpdate(
      { user: userId, endpoint: subscription.endpoint },
      {
        user: userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent,
        deviceInfo,
        isActive: true,
        lastUsed: new Date(),
      },
      { upsert: true, new: true }
    )

    res.status(200).json({
      status: 'success',
      message: 'Push notification subscription successful',
      data: { subscriptionId: pushSubscription._id },
    })
  } catch (error) {
    console.error('Error subscribing to push:', error)
    next(createError(500, 'Failed to subscribe to push notifications'))
  }
}

// Unsubscribe from push notifications
export const unsubscribeFromPush = async (req, res, next) => {
  try {
    const { endpoint } = req.body
    const userId = req.user.id

    await PushSubscription.findOneAndUpdate(
      { user: userId, endpoint },
      { isActive: false }
    )

    res.status(200).json({
      status: 'success',
      message: 'Unsubscribed from push notifications',
    })
  } catch (error) {
    console.error('Error unsubscribing from push:', error)
    next(createError(500, 'Failed to unsubscribe from push notifications'))
  }
}

// Get VAPID public key
export const getVapidPublicKey = async (req, res, next) => {
  try {
    res.status(200).json({
      status: 'success',
      data: {
        publicKey: process.env.VAPID_PUBLIC_KEY,
      },
    })
  } catch (error) {
    next(createError(500, 'Failed to get VAPID public key'))
  }
}

// Send notifications (updated with push support)
export const sendNotifications = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return next(createError(403, 'Access denied. Admin rights required.'))
    }

    const { userIds, type, message, subject, channels, priority, category } =
      req.body

    if (!message || !subject) {
      return next(createError(400, 'Message and subject are required'))
    }

    let recipients = []

    // Determine recipients based on notification type
    switch (type) {
      case 'individual':
        if (!userIds || userIds.length === 0) {
          return next(
            createError(
              400,
              'User IDs are required for individual notifications'
            )
          )
        }
        recipients = await User.find({
          _id: { $in: userIds },
          isDeleted: false,
        })
        break

      case 'broadcast':
        recipients = await User.find({ isDeleted: false })
        break

      case 'admin':
        recipients = await User.find({ role: 'admin', isDeleted: false })
        break

      case 'enterprise':
        recipients = await User.find({ role: 'enterprise', isDeleted: false })
        break

      default:
        return next(createError(400, 'Invalid notification type'))
    }

    if (recipients.length === 0) {
      return next(createError(400, 'No valid recipients found'))
    }

    // Create notifications for all recipients
    const notifications = recipients.map((recipient) => ({
      recipient: recipient._id,
      sender: req.user.id,
      type,
      title: subject,
      message,
      priority: priority || 'normal',
      category: category || 'general',
      metadata: {
        sentBy: req.user.name,
        sentAt: new Date(),
        channels: channels || ['app', 'push'],
      },
    }))

    const createdNotifications = await Notification.insertMany(notifications)

    // Send push notifications if enabled
    if (channels?.includes('push') || !channels) {
      const recipientIds = recipients.map((r) => r._id)
      const pushSubscriptions = await PushSubscription.find({
        user: { $in: recipientIds },
        isActive: true,
      })

      const pushPayload = {
        title: subject,
        body: message,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'notification',
        requireInteraction: priority === 'high' || priority === 'urgent',
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
          notificationId: createdNotifications[0]._id,
          category,
          url: '/notifications',
          timestamp: Date.now(),
        },
        vibrate: [200, 100, 200],
        silent: priority === 'low',
      }

      // Send push notifications concurrently
      const pushResults = await Promise.allSettled(
        pushSubscriptions.map((sub) => sendPushNotification(sub, pushPayload))
      )

      const successfulPushes = pushResults.filter(
        (result) => result.status === 'fulfilled' && result.value
      ).length

      console.log(
        `Sent ${successfulPushes}/${pushSubscriptions.length} push notifications`
      )
    }

    res.status(200).json({
      status: 'success',
      message: `Notifications sent to ${recipients.length} user(s)`,
      data: {
        recipientCount: recipients.length,
        notificationIds: createdNotifications.map((n) => n._id),
      },
    })
  } catch (error) {
    console.error('Error sending notifications:', error)
    next(createError(500, 'Failed to send notifications'))
  }
}

// Test push notification
export const testPushNotification = async (req, res, next) => {
  try {
    const userId = req.user.id

    const subscriptions = await PushSubscription.find({
      user: userId,
      isActive: true,
    })

    if (subscriptions.length === 0) {
      return next(createError(404, 'No active push subscriptions found'))
    }

    const testPayload = {
      title: '🎉 Test Notification',
      body: 'Your push notifications are working perfectly!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'test-notification',
      data: {
        url: '/notifications',
        test: true,
      },
    }

    const results = await Promise.allSettled(
      subscriptions.map((sub) => sendPushNotification(sub, testPayload))
    )

    const successful = results.filter(
      (r) => r.status === 'fulfilled' && r.value
    ).length

    res.status(200).json({
      status: 'success',
      message: `Test notification sent to ${successful}/${subscriptions.length} devices`,
      data: { successful, total: subscriptions.length },
    })
  } catch (error) {
    console.error('Error sending test notification:', error)
    next(createError(500, 'Failed to send test notification'))
  }
}

// Original functions (unchanged)
export const getUserNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query
    const userId = req.user.id

    const query = { recipient: userId }
    if (unreadOnly === 'true') {
      query.read = false
    }

    const notifications = await Notification.find(query)
      .populate('sender', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Notification.countDocuments(query)
    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      read: false,
    })

    res.status(200).json({
      status: 'success',
      results: notifications.length,
      totalNotifications: total,
      unreadCount,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: { notifications },
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    next(createError(500, 'Failed to fetch notifications'))
  }
}

export const getUnreadCount = async (req, res, next) => {
  try {
    // Add defensive check
    if (!req.user) {
      return next(createError(401, 'User not authenticated'))
    }

    // Use _id with fallback to id
    const userId = req.user._id || req.user.id

    if (!userId) {
      return next(createError(401, 'User ID not found'))
    }

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      read: false,
    })

    res.status(200).json({
      status: 'success',
      data: { unreadCount },
    })
  } catch (error) {
    console.error('Error fetching unread count:', error)
    next(createError(500, 'Failed to fetch unread count'))
  }
}

export const markNotificationAsRead = async (req, res, next) => {
  try {
    const { notificationId } = req.params

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: req.user.id },
      { read: true, readAt: new Date() },
      { new: true }
    ).populate('sender', 'name avatar')

    if (!notification) {
      return next(createError(404, 'Notification not found'))
    }

    res.status(200).json({
      status: 'success',
      data: { notification },
    })
  } catch (error) {
    console.error('Error marking notification as read:', error)
    next(createError(500, 'Failed to mark notification as read'))
  }
}

export const markAllNotificationsAsSeen = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user.id, read: false },
      { read: true, seenAt: new Date(), readAt: new Date() }
    )

    res.status(200).json({
      status: 'success',
      message: `Marked ${result.modifiedCount} notifications as seen`,
      data: { modifiedCount: result.modifiedCount },
    })
  } catch (error) {
    console.error('Error marking all notifications as seen:', error)
    next(createError(500, 'Failed to mark all notifications as seen'))
  }
}

export const deleteNotification = async (req, res, next) => {
  try {
    const { notificationId } = req.params

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: req.user.id,
    })

    if (!notification) {
      return next(createError(404, 'Notification not found'))
    }

    res.status(200).json({
      status: 'success',
      message: 'Notification deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting notification:', error)
    next(createError(500, 'Failed to delete notification'))
  }
}

export const deleteAllReadNotifications = async (req, res, next) => {
  try {
    const result = await Notification.deleteMany({
      recipient: req.user.id,
      read: true,
    })

    res.status(200).json({
      status: 'success',
      message: `Deleted ${result.deletedCount} read notifications`,
      data: { deletedCount: result.deletedCount },
    })
  } catch (error) {
    console.error('Error deleting read notifications:', error)
    next(createError(500, 'Failed to delete read notifications'))
  }
}

export const createSystemNotification = async (
  recipientId,
  title,
  message,
  options = {}
) => {
  try {
    const notification = new Notification({
      recipient: recipientId,
      type: 'system',
      title,
      message,
      priority: options.priority || 'normal',
      category: options.category || 'system',
      metadata: options.metadata || {},
    })

    await notification.save()

    // Send push notification if enabled
    if (options.sendPush !== false) {
      const subscriptions = await PushSubscription.find({
        user: recipientId,
        isActive: true,
      })

      if (subscriptions.length > 0) {
        const pushPayload = {
          title,
          body: message,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
          tag: 'system-notification',
          data: {
            notificationId: notification._id,
            category: options.category || 'system',
            url: '/notifications',
          },
        }

        await Promise.allSettled(
          subscriptions.map((sub) => sendPushNotification(sub, pushPayload))
        )
      }
    }

    return notification
  } catch (error) {
    console.error('Error creating system notification:', error)
    throw error
  }
}
