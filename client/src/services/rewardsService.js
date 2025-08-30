// File: client/src/services/rewardsService.js
// client/src/services/rewardsService.js - Enhanced with Service Integration
import { axiosInstance } from '@/config'

export const rewardsService = {
  // ===============================================
  // USER REWARD OPERATIONS (Enhanced)
  // ===============================================

  // Get rewards catalog with service filtering
  getRewardsCatalog: async (params = {}) => {
    const response = await axiosInstance.get('/rewards/catalog', { params })
    return response.data
  },

  // Claim a reward using points
  claimReward: async (rewardId) => {
    const response = await axiosInstance.post(`/rewards/claim/${rewardId}`)
    return response.data
  },

  // Get user's claimed rewards
  getUserRewards: async (params = {}) => {
    const response = await axiosInstance.get('/rewards/my-rewards', { params })
    return response.data
  },

  // Get user's point transaction history
  getPointHistory: async (params = {}) => {
    const response = await axiosInstance.get('/rewards/my-points/history', {
      params,
    })
    return response.data
  },
  // Search users for reward giving
  searchUsersForReward: async (params = {}) => {
    const response = await axiosInstance.get('/rewards/users/search', {
      params,
    })
    return response.data
  },

  // Give manual reward to user by email
  giveManualReward: async (email, rewardData) => {
    const response = await axiosInstance.post(
      `/rewards/spa/give-reward/email/${email}`,
      rewardData
    )
    return response.data
  },

  // Bulk give rewards to multiple users
  bulkGiveRewards: async (data) => {
    const response = await axiosInstance.post(
      '/rewards/spa/give-rewards/bulk',
      data
    )
    return response.data
  },

  // Get user's manual rewards
  getUserManualRewards: async (params = {}) => {
    const response = await axiosInstance.get('/rewards/my-rewards/manual', {
      params,
    })
    return response.data
  },

  // ===============================================
  // SERVICE-REWARD INTEGRATION (New)
  // ===============================================

  // Get rewards available for a specific service
  getServiceRewards: async (serviceId, params = {}) => {
    const response = await axiosInstance.get(
      `/rewards/services/${serviceId}/rewards`,
      { params }
    )
    return response.data
  },

  // Get services that have rewards available
  getServicesWithRewards: async (params = {}) => {
    const response = await axiosInstance.get('/rewards/services-with-rewards', {
      params,
    })
    return response.data
  },

  // ===============================================
  // REWARD MANAGEMENT (Admin/Team) - Enhanced
  // ===============================================

  // Get all rewards for management
  getRewards: async (params = {}) => {
    const response = await axiosInstance.get('/rewards', { params })
    return response.data
  },

  // Get single reward by ID
  getReward: async (id) => {
    const response = await axiosInstance.get(`/rewards/${id}`)
    return response.data
  },

  // Create new reward (general)
  createReward: async (rewardData) => {
    const response = await axiosInstance.post('/rewards', rewardData)
    return response.data
  },

  // Create service-specific reward
  createServiceReward: async (serviceId, rewardData) => {
    const response = await axiosInstance.post(
      `/rewards/services/${serviceId}/create-reward`,
      rewardData
    )
    return response.data
  },

  // Link existing reward to multiple services
  linkRewardToServices: async (rewardId, serviceData) => {
    const response = await axiosInstance.post(
      `/rewards/${rewardId}/link-services`,
      serviceData
    )
    return response.data
  },

  // Update existing reward
  updateReward: async (id, rewardData) => {
    const response = await axiosInstance.put(`/rewards/${id}`, rewardData)
    return response.data
  },

  // Delete reward
  deleteReward: async (id) => {
    const response = await axiosInstance.delete(`/rewards/${id}`)
    return response.data
  },

  // Get reward statistics
  getRewardStats: async (locationId = null) => {
    const response = await axiosInstance.get('/rewards/stats/overview', {
      params: locationId ? { locationId } : {},
    })
    return response.data
  },

  // ===============================================
  // ADMIN POINT MANAGEMENT
  // ===============================================

  // Manually adjust user points
  adjustUserPoints: async (userId, adjustmentData) => {
    const response = await axiosInstance.post(
      `/rewards/admin/users/${userId}/points`,
      adjustmentData
    )
    return response.data
  },

  // ===============================================
  // HELPER METHODS FOR SERVICE INTEGRATION
  // ===============================================

  // Get rewards filtered by service or category
  getRewardsByService: async (serviceId, userPoints = 0) => {
    const response = await axiosInstance.get(
      `/rewards/services/${serviceId}/rewards`,
      {
        params: { userPoints },
      }
    )
    return response.data
  },

  // Get rewards filtered by category
  getRewardsByCategory: async (categoryId, params = {}) => {
    const response = await axiosInstance.get('/rewards/catalog', {
      params: { ...params, categoryId },
    })
    return response.data
  },

  // Bulk create rewards for multiple services
  bulkCreateServiceRewards: async (rewardTemplate, serviceIds) => {
    const promises = serviceIds.map((serviceId) =>
      rewardsService.createServiceReward(serviceId, rewardTemplate)
    )
    return Promise.all(promises)
  },

  // Get reward analytics by service
  getServiceRewardAnalytics: async (serviceId) => {
    const response = await axiosInstance.get(
      `/rewards/analytics/service/${serviceId}`
    )
    return response.data
  },
}
