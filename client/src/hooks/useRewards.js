// File: client/src/hooks/useRewards.js
// client/src/hooks/useRewards.js
import { rewardsService } from '@/services/rewardsService'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Query Keys
export const rewardQueryKeys = {
  all: ['rewards'],
  lists: () => [...rewardQueryKeys.all, 'list'],
  list: (filters) => [...rewardQueryKeys.lists(), { filters }],
  details: () => [...rewardQueryKeys.all, 'detail'],
  detail: (id) => [...rewardQueryKeys.details(), id],
  catalog: ['rewardsCatalog'],
  catalogList: (filters) => [...rewardQueryKeys.catalog, 'list', { filters }],
  userRewards: ['userRewards'],
  userRewardsList: (filters) => [
    ...rewardQueryKeys.userRewards,
    'list',
    { filters },
  ],
  pointHistory: ['pointHistory'],
  pointHistoryList: (filters) => [
    ...rewardQueryKeys.pointHistory,
    'list',
    { filters },
  ],
  stats: ['rewardStats'],
  statsOverview: (locationId) => [
    ...rewardQueryKeys.stats,
    'overview',
    { locationId },
  ],
}

// =====================================
// USER REWARD QUERY HOOKS
// =====================================

// Get rewards catalog with affordability info
export const useRewardsCatalog = (filters = {}) => {
  return useQuery({
    queryKey: rewardQueryKeys.catalogList(filters),
    queryFn: () => rewardsService.getRewardsCatalog(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (data) => data.data,
  })
}

// Get user's claimed rewards
export const useUserRewards = (filters = {}) => {
  return useQuery({
    queryKey: rewardQueryKeys.userRewardsList(filters),
    queryFn: () => rewardsService.getUserRewards(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (data) => data.data,
  })
}

// Get user's point transaction history
export const usePointHistory = (filters = {}) => {
  return useQuery({
    queryKey: rewardQueryKeys.pointHistoryList(filters),
    queryFn: () => rewardsService.getPointHistory(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (data) => data.data,
  })
}

// =====================================
// ADMIN REWARD MANAGEMENT HOOKS
// =====================================

// Get all rewards for management
export const useRewards = (filters = {}) => {
  return useQuery({
    queryKey: rewardQueryKeys.list(filters),
    queryFn: () => rewardsService.getRewards(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (data) => data.data,
  })
}

// Get single reward
export const useReward = (id, options = {}) => {
  return useQuery({
    queryKey: rewardQueryKeys.detail(id),
    queryFn: () => rewardsService.getReward(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
    select: (data) => data.data.reward,
    ...options,
  })
}

// Get reward statistics
export const useRewardStats = (locationId = null) => {
  return useQuery({
    queryKey: rewardQueryKeys.statsOverview(locationId),
    queryFn: () => rewardsService.getRewardStats(locationId),
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (data) => data.data,
  })
}

// =====================================
// REWARD MUTATION HOOKS
// =====================================

// Claim a reward
export const useClaimReward = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: rewardsService.claimReward,
    onSuccess: (data, rewardId) => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: rewardQueryKeys.catalog })
      queryClient.invalidateQueries({ queryKey: rewardQueryKeys.userRewards })
      queryClient.invalidateQueries({ queryKey: rewardQueryKeys.pointHistory })

      // Update user points in any cached user data
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })

      // Run success callback with reward data
      options.onSuccess?.(data, rewardId)
    },
    onError: (error) => {
      console.error('Error claiming reward:', error)
      options.onError?.(error)
    },
  })
}

// Create reward
export const useCreateReward = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: rewardsService.createReward,
    onSuccess: (data) => {
      // Invalidate reward lists
      queryClient.invalidateQueries({ queryKey: rewardQueryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: rewardQueryKeys.catalog })
      queryClient.invalidateQueries({ queryKey: rewardQueryKeys.stats })

      options.onSuccess?.(data)
    },
    onError: (error) => {
      console.error('Error creating reward:', error)
      options.onError?.(error)
    },
  })
}

// Update reward
export const useUpdateReward = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...rewardData }) =>
      rewardsService.updateReward(id, rewardData),
    onSuccess: (data, variables) => {
      // Update the specific reward in cache
      queryClient.setQueryData(
        rewardQueryKeys.detail(variables.id),
        (oldData) =>
          oldData ? { ...oldData, data: { reward: data.data.reward } } : data
      )

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: rewardQueryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: rewardQueryKeys.catalog })
      queryClient.invalidateQueries({ queryKey: rewardQueryKeys.stats })

      options.onSuccess?.(data, variables)
    },
    onError: (error) => {
      console.error('Error updating reward:', error)
      options.onError?.(error)
    },
  })
}

// Delete reward
export const useDeleteReward = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: rewardsService.deleteReward,
    onSuccess: (data, rewardId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: rewardQueryKeys.detail(rewardId) })

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: rewardQueryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: rewardQueryKeys.catalog })
      queryClient.invalidateQueries({ queryKey: rewardQueryKeys.stats })

      options.onSuccess?.(data, rewardId)
    },
    onError: (error) => {
      console.error('Error deleting reward:', error)
      options.onError?.(error)
    },
  })
}

// Adjust user points (admin only)
export const useAdjustUserPoints = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, ...adjustmentData }) =>
      rewardsService.adjustUserPoints(userId, adjustmentData),
    onSuccess: (data, variables) => {
      // Invalidate user-related queries
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: rewardQueryKeys.pointHistory })

      options.onSuccess?.(data, variables)
    },
    onError: (error) => {
      console.error('Error adjusting user points:', error)
      options.onError?.(error)
    },
  })
}

// =====================================
// UTILITY HOOKS
// =====================================

// Get affordable rewards (rewards user can claim)
export const useAffordableRewards = (filters = {}) => {
  const { data: catalogData, ...queryResult } = useRewardsCatalog(filters)

  const affordableRewards =
    catalogData?.rewards?.filter((reward) => reward.canClaim) || []

  return {
    ...queryResult,
    affordableRewards,
    userPoints: catalogData?.userPoints || 0,
    affordableCount: catalogData?.affordableCount || 0,
  }
}

// Get user rewards by status
export const useUserRewardsByStatus = (status = 'active') => {
  return useUserRewards({ status })
}

// Get rewards catalog with computed properties
export const useEnhancedRewardsCatalog = (filters = {}) => {
  const { data: catalogData, ...queryResult } = useRewardsCatalog(filters)

  const rewards = catalogData?.rewards || []
  const userPoints = catalogData?.userPoints || 0

  // Add computed properties
  const enhancedRewards = rewards.map((reward) => ({
    ...reward,
    // Add display formatting
    displayValue: reward.displayValue || calculateDisplayValue(reward),
    // Check affordability
    isAffordable: reward.isAffordable || userPoints >= reward.pointCost,
    // Calculate points needed if can't afford
    pointsNeeded: Math.max(0, reward.pointCost - userPoints),
    // Check if at monthly limit
    canClaimMoreThisMonth: reward.userClaimsThisMonth < reward.limit,
  }))

  return {
    ...queryResult,
    rewards: enhancedRewards,
    userPoints,
    stats: {
      total: enhancedRewards.length,
      affordable: enhancedRewards.filter((r) => r.canClaim).length,
      almostAffordable: enhancedRewards.filter(
        (r) => !r.canClaim && r.pointsNeeded <= 50
      ).length,
    },
  }
}

// Helper function for display value calculation
function calculateDisplayValue(reward) {
  switch (reward.type) {
    case 'credit':
    case 'referral':
      return `$${reward.value}`
    case 'discount':
    case 'combo':
      return `${reward.value}%`
    case 'service':
      return 'Free'
    default:
      return `$${reward.value || 0}`
  }
}

// Get user's point summary
export const useUserPointSummary = () => {
  const { data: pointHistoryData } = usePointHistory({ limit: 1000 })
  const { data: userRewardsData } = useUserRewards({ limit: 1000 })

  return useQuery({
    queryKey: ['userPointSummary'],
    queryFn: () => {
      if (!pointHistoryData || !userRewardsData) return null

      const transactions = pointHistoryData.transactions || []
      const userRewards = userRewardsData.userRewards || []

      const summary = {
        currentBalance: pointHistoryData.currentBalance || 0,
        totalEarned: pointHistoryData.summary?.totalEarned || 0,
        totalSpent: pointHistoryData.summary?.totalSpent || 0,
        rewardsStats: {
          totalClaimed: userRewards.length,
          activeClaimed: userRewards.filter((ur) => ur.isActive).length,
          expiredRewards: userRewards.filter((ur) => ur.isExpired).length,
          usedRewards: userRewards.filter((ur) => ur.status === 'used').length,
        },
        recentActivity: transactions.slice(0, 5),
      }

      return summary
    },
    enabled: !!pointHistoryData && !!userRewardsData,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

// Prefetch reward details
export const usePrefetchReward = () => {
  const queryClient = useQueryClient()

  return (id) => {
    queryClient.prefetchQuery({
      queryKey: rewardQueryKeys.detail(id),
      queryFn: () => rewardsService.getReward(id),
      staleTime: 10 * 60 * 1000,
    })
  }
}

// Get filtered rewards (admin management)
export const useFilteredRewards = (filters = {}) => {
  const { data: rewardsData, ...queryResult } = useRewards(filters)

  const rewards = rewardsData?.rewards || []
  const stats = rewardsData?.stats || {}
  const pagination = rewardsData?.pagination || {}

  // Add computed properties for management
  const processedRewards = rewards.map((reward) => ({
    ...reward,
    displayValue: calculateDisplayValue(reward),
    isActive: reward.status === 'active',
    claimRate: reward.redeemCount > 0 ? reward.redeemCount / 100 : 0, // Placeholder calculation
  }))

  return {
    ...queryResult,
    rewards: processedRewards,
    stats,
    pagination,
  }
}
