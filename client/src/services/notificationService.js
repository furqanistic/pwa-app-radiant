// File: client/src/services/notificationService.js

import axiosInstance from '@/config'

export const notificationService = {
  // Get user notifications with pagination
  getUserNotifications: async (params = {}) => {
    const { page = 1, limit = 20, unreadOnly = false } = params
    const response = await axiosInstance.get('/notifications', {
      params: { page, limit, unreadOnly },
    })
    return response.data
  },

  // Get unread notification count
  getUnreadCount: async () => {
    const response = await axiosInstance.get('/notifications/unread-count')
    return response.data
  },

  // Mark notification as read
  markAsRead: async (notificationId) => {
    const response = await axiosInstance.put(
      `/notifications/${notificationId}/read`
    )
    return response.data
  },

  // Mark all notifications as seen
  markAllAsSeen: async () => {
    const response = await axiosInstance.put('/notifications/mark-all-seen')
    return response.data
  },

  // Delete specific notification
  deleteNotification: async (notificationId) => {
    const response = await axiosInstance.delete(
      `/notifications/${notificationId}`
    )
    return response.data
  },

  // Delete all read notifications
  deleteAllRead: async () => {
    const response = await axiosInstance.delete('/notifications/read/all')
    return response.data
  },

  // Send notification (admin/elevated users only)
  sendNotification: async (notificationData) => {
    const response = await axiosInstance.post(
      '/notifications/send',
      notificationData
    )
    return response.data
  },

  // Push notification methods
  subscribeToPush: async (subscription) => {
    const response = await axiosInstance.post('/notifications/push/subscribe', {
      subscription,
    })
    return response.data
  },

  unsubscribeFromPush: async (endpoint) => {
    const response = await axiosInstance.post(
      '/notifications/push/unsubscribe',
      {
        endpoint,
      }
    )
    return response.data
  },

  testPushNotification: async () => {
    const response = await axiosInstance.post('/notifications/push/test')
    return response.data
  },

  // Get VAPID public key for push notifications
  getVapidPublicKey: async () => {
    const response = await axiosInstance.get('/notifications/vapid-public-key')
    return response.data
  },
}
