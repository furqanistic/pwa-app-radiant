// client/src/services/servicesService.js - Enhanced with Reward Integration
import { axiosInstance } from '@/config'

export const servicesService = {
  // ===============================================
  // CORE SERVICE OPERATIONS (Existing + Enhanced)
  // ===============================================

  // Get all services with filtering and search
  getServices: async (params = {}) => {
    const response = await axiosInstance.get('/services', { params })
    return response.data
  },

  // Get single service by ID
  getService: async (id) => {
    const response = await axiosInstance.get(`/services/${id}`)
    return response.data
  },

  // Create new service
  createService: async (serviceData) => {
    const response = await axiosInstance.post('/services', serviceData)
    return response.data
  },

  // Update existing service
  updateService: async (id, serviceData) => {
    const response = await axiosInstance.put(`/services/${id}`, serviceData)
    return response.data
  },

  // Delete service
  deleteService: async (id) => {
    const response = await axiosInstance.delete(`/services/${id}`)
    return response.data
  },

  // Get service statistics
  getServiceStats: async (locationId = null) => {
    const response = await axiosInstance.get('/services/stats/overview', {
      params: locationId ? { locationId } : {},
    })
    return response.data
  },

  // ===============================================
  // CATEGORY OPERATIONS (Existing)
  // ===============================================

  // Get all categories
  getCategories: async (params = {}) => {
    const response = await axiosInstance.get('/services/categories/all', {
      params,
    })
    return response.data
  },

  // Create new category
  createCategory: async (categoryData) => {
    const response = await axiosInstance.post(
      '/services/categories',
      categoryData
    )
    return response.data
  },

  // Update category
  updateCategory: async (id, categoryData) => {
    const response = await axiosInstance.put(
      `/services/categories/${id}`,
      categoryData
    )
    return response.data
  },

  // Delete category
  deleteCategory: async (id) => {
    const response = await axiosInstance.delete(`/services/categories/${id}`)
    return response.data
  },

  // ===============================================
  // SERVICE-REWARD INTEGRATION (New)
  // ===============================================

  // Get rewards available for a specific service
  getServiceRewards: async (serviceId, params = {}) => {
    const response = await axiosInstance.get(`/services/${serviceId}/rewards`, {
      params,
    })
    return response.data
  },

  // Create reward specifically for a service
  createServiceReward: async (serviceId, rewardData) => {
    const response = await axiosInstance.post(
      `/services/${serviceId}/rewards`,
      rewardData
    )
    return response.data
  },

  // Link existing reward to a service
  linkRewardToService: async (serviceId, rewardId) => {
    const response = await axiosInstance.post(
      `/services/${serviceId}/link-reward/${rewardId}`
    )
    return response.data
  },

  // ===============================================
  // HELPER METHODS FOR REWARD INTEGRATION
  // ===============================================

  // Get services by category with reward information
  getServicesByCategory: async (categoryId, includeRewards = false) => {
    const response = await axiosInstance.get('/services', {
      params: {
        category: categoryId,
        includeRewards: includeRewards.toString(),
      },
    })
    return response.data
  },

  // Get services that have active rewards
  getServicesWithRewards: async (params = {}) => {
    const response = await axiosInstance.get('/services', {
      params: { ...params, hasRewards: 'true' },
    })
    return response.data
  },

  // Calculate service price with potential reward discount
  calculateServicePriceWithReward: async (serviceId, rewardId) => {
    // This would typically be handled on the frontend, but could be an API call
    // for complex calculations or to ensure accuracy
    const [serviceData, rewardData] = await Promise.all([
      servicesService.getService(serviceId),
      // Note: This would require importing rewardsService, but to keep separation,
      // we'll return the calculation logic to be handled by the frontend
    ])
    return { serviceData }
  },

  // Get service analytics including reward usage
  getServiceAnalytics: async (serviceId) => {
    const response = await axiosInstance.get(`/services/${serviceId}/analytics`)
    return response.data
  },

  // Get popular services (by bookings and reward redemptions)
  getPopularServices: async (params = {}) => {
    const response = await axiosInstance.get('/services', {
      params: { ...params, sortBy: 'bookings' },
    })
    return response.data
  },

  // Search services with reward filtering
  searchServicesWithRewards: async (query, filters = {}) => {
    const response = await axiosInstance.get('/services', {
      params: {
        search: query,
        hasRewards: filters.hasRewards,
        category: filters.category,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        ...filters,
      },
    })
    return response.data
  },

  // Get services in a price range (useful for reward targeting)
  getServicesByPriceRange: async (minPrice, maxPrice, params = {}) => {
    const response = await axiosInstance.get('/services', {
      params: {
        ...params,
        minPrice,
        maxPrice,
        sortBy: 'price-low',
      },
    })
    return response.data
  },

  // Bulk operations for services
  bulkUpdateServices: async (serviceIds, updateData) => {
    const promises = serviceIds.map((id) =>
      servicesService.updateService(id, updateData)
    )
    return Promise.all(promises)
  },

  // Get service recommendations based on user's reward history
  getRecommendedServices: async (userId) => {
    const response = await axiosInstance.get(
      `/services/recommendations/${userId}`
    )
    return response.data
  },
}
