// server/controller/notification.js
import { createError } from '../error.js'
import Notification from '../models/Notification.js'
import User from '../models/User.js'

// Send notifications (updated from your existing function)
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
        recipients = await User.find({
          role: 'admin',
          isDeleted: false,
        })
        break

      case 'enterprise':
        recipients = await User.find({
          role: 'enterprise',
          isDeleted: false,
        })
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
        channels: channels || ['app'],
      },
    }))

    const createdNotifications = await Notification.insertMany(notifications)

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

// Get user's notifications
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
      data: {
        notifications,
      },
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    next(createError(500, 'Failed to fetch notifications'))
  }
}

// Get unread count
export const getUnreadCount = async (req, res, next) => {
  try {
    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      read: false,
    })

    res.status(200).json({
      status: 'success',
      data: {
        unreadCount,
      },
    })
  } catch (error) {
    console.error('Error fetching unread count:', error)
    next(createError(500, 'Failed to fetch unread count'))
  }
}

// Mark notification as read
export const markNotificationAsRead = async (req, res, next) => {
  try {
    const { notificationId } = req.params

    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        recipient: req.user.id,
      },
      { read: true },
      { new: true }
    ).populate('sender', 'name avatar')

    if (!notification) {
      return next(createError(404, 'Notification not found'))
    }

    res.status(200).json({
      status: 'success',
      data: {
        notification,
      },
    })
  } catch (error) {
    console.error('Error marking notification as read:', error)
    next(createError(500, 'Failed to mark notification as read'))
  }
}

// Mark all notifications as read
export const markAllNotificationsAsSeen = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      {
        recipient: req.user.id,
        read: false, // Only update unread notifications
      },
      {
        read: true,
        seenAt: new Date(), // Track when user saw the notifications
      }
    )

    res.status(200).json({
      status: 'success',
      message: `Marked ${result.modifiedCount} notifications as seen`,
      data: {
        modifiedCount: result.modifiedCount,
      },
    })
  } catch (error) {
    console.error('Error marking all notifications as seen:', error)
    next(createError(500, 'Failed to mark all notifications as seen'))
  }
}

// Delete notification
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

// Delete all read notifications
export const deleteAllReadNotifications = async (req, res, next) => {
  try {
    const result = await Notification.deleteMany({
      recipient: req.user.id,
      read: true,
    })

    res.status(200).json({
      status: 'success',
      message: `Deleted ${result.deletedCount} read notifications`,
      data: {
        deletedCount: result.deletedCount,
      },
    })
  } catch (error) {
    console.error('Error deleting read notifications:', error)
    next(createError(500, 'Failed to delete read notifications'))
  }
}

// Create system notification (for internal use)
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
    return notification
  } catch (error) {
    console.error('Error creating system notification:', error)
    throw error
  }
}
