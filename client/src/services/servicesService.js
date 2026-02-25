// File: client/src/services/servicesService.js
import { axiosInstance } from '@/config'

export const servicesService = {
  // ===============================================
  // CORE SERVICE OPERATIONS
  // ===============================================

  // Get all services with filtering and search
  getServices: async (params = {}) => {
    const response = await axiosInstance.get('/services', { params })
    return response.data
  },

  // Super-admin: Get platform-wide services database
  getServicesDatabase: async (params = {}) => {
    const response = await axiosInstance.get('/services/database/all', {
      params,
    })
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
  // SERVICE LINKING OPERATIONS
  // ===============================================

  // Get available services for linking as add-ons
  getAvailableAddOnServices: async (serviceId, params = {}) => {
    const response = await axiosInstance.get(
      `/services/${serviceId}/available-addons`,
      {
        params,
      }
    )
    return response.data
  },

  // Get service with linked services details
  getServiceWithLinkedServices: async (serviceId) => {
    const response = await axiosInstance.get(
      `/services/${serviceId}/with-linked-services`
    )
    return response.data
  },

  // Link multiple services as add-ons
  linkServicesToService: async (serviceId, serviceIds, options = {}) => {
    const response = await axiosInstance.post(
      `/services/${serviceId}/link-services`,
      {
        serviceIds,
        customPrices: options.customPrices || {},
        customDurations: options.customDurations || {},
      }
    )
    return response.data
  },

  // Unlink a service from add-ons
  unlinkServiceFromService: async (serviceId, linkedServiceId) => {
    const response = await axiosInstance.delete(
      `/services/${serviceId}/unlink/${linkedServiceId}`
    )
    return response.data
  },

  // ===============================================
  // CATEGORY OPERATIONS
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
  // SERVICE-REWARD INTEGRATION
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
  // SEARCH AND FILTER OPERATIONS
  // ===============================================

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

  // Get services in a price range
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

  // ===============================================
  // UTILITY OPERATIONS
  // ===============================================

  // Get popular services (by bookings and reward redemptions)
  getPopularServices: async (params = {}) => {
    const response = await axiosInstance.get('/services', {
      params: { ...params, sortBy: 'bookings' },
    })
    return response.data
  },

  // Get service analytics including reward usage
  getServiceAnalytics: async (serviceId) => {
    const response = await axiosInstance.get(`/services/${serviceId}/analytics`)
    return response.data
  },

  // Get service recommendations based on user's reward history
  getRecommendedServices: async (userId) => {
    const response = await axiosInstance.get(
      `/services/recommendations/${userId}`
    )
    return response.data
  },

  // Bulk update services
  bulkUpdateServices: async (serviceIds, updateData) => {
    const promises = serviceIds.map((id) =>
      servicesService.updateService(id, updateData)
    )
    return Promise.all(promises)
  },
}
