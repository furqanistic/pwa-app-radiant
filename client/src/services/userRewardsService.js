// File: client/src/services/userRewardsService.js
import { axiosInstance } from '@/config'

export const userRewardsService = {
  getUserRewards: async ({ userId, ...params } = {}) => {
    const url = userId
      ? `/user-rewards/user/${userId}/rewards`
      : '/user-rewards/my-rewards'
    const response = await axiosInstance.get(url, { params })
    return response.data
  },

  getUserTransactions: async ({ userId, ...params } = {}) => {
    const url = userId
      ? `/user-rewards/user/${userId}/transactions`
      : '/user-rewards/my-transactions'
    const response = await axiosInstance.get(url, { params })
    return response.data
  },

  getUserGameStats: async ({ userId } = {}) => {
    const url = userId
      ? `/user-rewards/user/${userId}/game-stats`
      : '/user-rewards/my-game-stats'
    const response = await axiosInstance.get(url)
    return response.data
  },
}
