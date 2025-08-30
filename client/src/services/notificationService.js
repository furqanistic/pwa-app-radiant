// File: client/src/services/notificationService.js
// client/src/services/notificationService.js
import { axiosInstance } from '@/config'

export const notificationService = {
  // Send notifications
  sendNotification: async (data) => {
    const response = await axiosInstance.post('/notifications/send', data)
    return response.data
  },

  // Get user notifications
  getUserNotifications: async (params = {}) => {
    const response = await axiosInstance.get('/notifications', { params })
    return response.data
  },

  // Get unread count
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

  // Mark all as seen
  markAllAsSeen: async () => {
    const response = await axiosInstance.put('/notifications/mark-all-seen')
    return response.data
  },

  // Delete notification
  deleteNotification: async (notificationId) => {
    const response = await axiosInstance.delete(
      `/notifications/${notificationId}`
    )
    return response.data
  },
}
