// File: client/src/services/squareService.js - Square API Service
import axiosInstance from '../config'

const squareService = {
  /**
   * Get Square OAuth authorization URL
   */
  getAuthorizationUrl: async (locationId = null) => {
    const response = await axiosInstance.get('square/connect/oauth-url', {
      params: locationId ? { locationId } : {},
    })
    return response.data
  },

  /**
   * Get Square account status
   */
  getAccountStatus: async (locationId = null) => {
    const response = await axiosInstance.get('square/connect/status', {
      params: locationId ? { locationId } : {},
    })
    return response.data
  },

  /**
   * Disconnect Square account
   */
  disconnectAccount: async (locationId = null) => {
    const response = await axiosInstance.delete('square/connect/disconnect', {
      params: locationId ? { locationId } : {},
    })
    return response.data
  },

  /**
   * Get Square dashboard URL
   */
  getAccountDashboard: async (locationId = null) => {
    const response = await axiosInstance.get('square/connect/dashboard', {
      params: locationId ? { locationId } : {},
    })
    return response.data
  },
}

export default squareService
