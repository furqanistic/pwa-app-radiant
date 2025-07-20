// client/src/services/referralService.js
import { axiosInstance } from '@/config'

export const referralService = {
  // Get user's referral statistics
  getReferralStats: async () => {
    const response = await axiosInstance.get('/referrals/stats')
    return response.data
  },

  // Get user's referral history with pagination
  getReferralHistory: async (params = {}) => {
    const response = await axiosInstance.get('/referrals/history', { params })
    return response.data
  },

  // Validate a referral code
  validateReferralCode: async (code) => {
    const response = await axiosInstance.get(`/referrals/validate/${code}`)
    return response.data
  },

  // Update referral status (for admin or own referrals)
  updateReferralStatus: async (referralId, data) => {
    const response = await axiosInstance.put(
      `/referrals/${referralId}/status`,
      data
    )
    return response.data
  },

  // Get all referrals (admin only)
  getAllReferrals: async (params = {}) => {
    const response = await axiosInstance.get('/referrals/admin/all', { params })
    return response.data
  },

  // Get referral analytics (admin only)
  getReferralAnalytics: async (period = '30d') => {
    const response = await axiosInstance.get('/referrals/admin/analytics', {
      params: { period },
    })
    return response.data
  },
}
