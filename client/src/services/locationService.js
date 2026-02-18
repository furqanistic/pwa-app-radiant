// File: client/src/services/locationService.js - OPTIMIZED
import { axiosInstance } from '@/config'

export const locationService = {
  // Get active locations for users (most commonly used)
  getActiveLocations: async () => {
    const response = await axiosInstance.get('/locations/active')
    console.log(response.data)
    return response.data
  },

  // Get my location (spa/Manager)
  getMyLocation: async () => {
    const response = await axiosInstance.get('/locations/my-location', {
      params: { _ts: Date.now() },
    })
    return response.data;
  },

  // Admin only functions
  getAllLocations: async (params = {}) => {
    const response = await axiosInstance.get('/locations', { params })
    return response.data
  },

  createLocation: async (locationData) => {
    const response = await axiosInstance.post('/locations', locationData)
    return response.data
  },

  updateLocation: async (id, locationData) => {
    const response = await axiosInstance.put(`/locations/${id}`, locationData)
    return response.data
  },

  deleteLocation: async (id) => {
    const response = await axiosInstance.delete(`/locations/${id}`)
    return response.data
  },

  toggleLocationStatus: async (id) => {
    const response = await axiosInstance.patch(`/locations/${id}/toggle-status`)
    return response.data
  },
}
