// File: client/src/services/referralService.js - COMPLETE
import { axiosInstance } from '@/config'

export const referralService = {
  // Get user's referral stats and history
  getMyReferralStats: async () => {
    const response = await axiosInstance.get('/referral/my-stats')
    return response.data
  },

  // Get referral leaderboard
  getLeaderboard: async (params = {}) => {
    const { period = 'all', limit = 10 } = params
    const response = await axiosInstance.get('/referral/leaderboard', {
      params: { period, limit },
    })
    return response.data
  },

  // Admin: Get all referrals
  getAllReferrals: async (params = {}) => {
    const {
      page = 1,
      limit = 20,
      status,
      rewardType,
      startDate,
      endDate,
    } = params
    const response = await axiosInstance.get('/referral/all', {
      params: { page, limit, status, rewardType, startDate, endDate },
    })
    return response.data
  },

  // Admin: Complete referral manually
  completeReferral: async (referralId, notes = '') => {
    const response = await axiosInstance.post(
      `/referral/complete/${referralId}`,
      { notes }
    )
    return response.data
  },

  // Admin: Award milestone reward
  awardMilestoneReward: async (userId, milestone, purchaseAmount = 0) => {
    const response = await axiosInstance.post('/referral/award-milestone', {
      userId,
      milestone,
      purchaseAmount,
    })
    return response.data
  },

  // Admin: Get referral configuration
  getReferralConfig: async () => {
    const response = await axiosInstance.get('/referral/config')
    return response.data
  },

  // Admin: Update referral configuration
  updateReferralConfig: async (configData) => {
    const response = await axiosInstance.put('/referral/config', configData)
    return response.data
  },

  // Generate referral code for current user
  generateMyReferralCode: async () => {
    const response = await axiosInstance.post('/auth/generate-referral-code')
    return response.data
  },

  // NEW: Get spa-specific referral stats (for spa owners)
  getSpaReferralStats: async () => {
    const response = await axiosInstance.get('/referral/spa-stats')
    return response.data
  },
}
