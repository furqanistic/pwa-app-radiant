// client/src/services/locationService.js
import { axiosInstance } from '@/config'

export const locationService = {
  // Create a new location
  createLocation: async (locationData) => {
    const response = await axiosInstance.post('/locations', locationData)
    return response.data
  },

  // Get all locations (admin only)
  getAllLocations: async (params = {}) => {
    const response = await axiosInstance.get('/locations', { params })
    return response.data
  },

  // Get active locations for users
  getActiveLocations: async () => {
    const response = await axiosInstance.get('/locations/active')
    return response.data
  },

  // Update location
  updateLocation: async (id, locationData) => {
    const response = await axiosInstance.put(`/locations/${id}`, locationData)
    return response.data
  },

  // Delete location
  deleteLocation: async (id) => {
    const response = await axiosInstance.delete(`/locations/${id}`)
    return response.data
  },

  // Toggle location status
  toggleLocationStatus: async (id) => {
    const response = await axiosInstance.patch(`/locations/${id}/toggle-status`)
    return response.data
  },
}
