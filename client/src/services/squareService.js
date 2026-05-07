// File: client/src/services/squareService.js - Square API Service
import axiosInstance from '../config'

const squareService = {
  /**
   * Get Square OAuth authorization URL
   */
  getAuthorizationUrl: async () => {
    const response = await axiosInstance.get('square/connect/oauth-url')
    return response.data
  },

  /**
   * Get Square account status
   */
  getAccountStatus: async () => {
    const response = await axiosInstance.get('square/connect/status')
    return response.data
  },

  /**
   * Disconnect Square account
   */
  disconnectAccount: async () => {
    const response = await axiosInstance.delete('square/connect/disconnect')
    return response.data
  },

  /**
   * Get Square dashboard URL
   */
  getAccountDashboard: async () => {
    const response = await axiosInstance.get('square/connect/dashboard')
    return response.data
  },
}

export default squareService
