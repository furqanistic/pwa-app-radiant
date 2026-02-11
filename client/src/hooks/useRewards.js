// File: client/src/hooks/useRewards.js - Complete rewards hooks with Redux integration
import { rewardsService } from '@/services/rewardsService'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'
import { toast } from 'sonner'
// Import from your existing userSlice
import {
    rollbackPoints,
    setPoints,
    subtractPoints,
    updatePoints,
} from '@/redux/userSlice'

// ===============================================
// QUERY KEYS - Centralized cache key management
// ===============================================
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
  services: ['serviceRewards'],
  serviceRewards: (serviceId) => [...rewardQueryKeys.services, serviceId],
  spaRewards: ['spaRewards'],
  spaRewardsList: (filters) => [
    ...rewardQueryKeys.spaRewards,
    'list',
    { filters },
  ],
}

// ===============================================
// USER REWARD HOOKS - For regular users
// ===============================================

// Get rewards catalog with affordability info (for users to browse and claim)
export const useRewardsCatalog = (filters = {}) => {
  return useQuery({
    queryKey: rewardQueryKeys.catalogList(filters),
    queryFn: () => rewardsService.getRewardsCatalog(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
    select: (data) => {
      if (!data?.data) return { rewards: [], userPoints: 0 }

      return {
        rewards: data.data.rewards || [],
        userPoints: data.data.userPoints || 0,
        affordableCount: data.data.affordableCount || 0,
        pagination: data.data.pagination || {},
      }
    },
  })
}

// Enhanced rewards catalog hook with computed properties
export const useEnhancedRewardsCatalog = (filters = {}) => {
  const { data: catalogData, ...queryResult } = useQuery({
    queryKey: rewardQueryKeys.catalogList(filters),
    queryFn: () => rewardsService.getRewardsCatalog(filters),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    select: (data) => {
      if (!data?.data) return { rewards: [], userPoints: 0 }

      return {
        rewards: data.data.rewards || [],
        userPoints: data.data.userPoints || 0,
        affordableCount: data.data.affordableCount || 0,
        pagination: data.data.pagination || {},
      }
    },
  })

  const rewards = catalogData?.rewards || []
  const userPoints = catalogData?.userPoints || 0

  // Add computed properties
  const enhancedRewards = rewards.map((reward) => ({
    ...reward,
    displayValue: reward.displayValue || calculateDisplayValue(reward),
    isAffordable: reward.isAffordable || userPoints >= reward.pointCost,
    pointsNeeded: Math.max(0, reward.pointCost - userPoints),
    canClaimMoreThisMonth: (reward.userClaimsThisMonth || 0) < reward.limit,
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
    refetch: queryResult.refetch,
  }
}

// Claim reward with Redux integration and optimistic updates
export const useClaimReward = (options = {}) => {
  const queryClient = useQueryClient()
  const dispatch = useDispatch()

  return useMutation({
    mutationFn: rewardsService.claimReward,
    onMutate: async (rewardId) => {
      // Find the reward to get point cost
      const rewardsData = queryClient.getQueryData(
        rewardQueryKeys.catalogList({})
      )
      const reward = rewardsData?.rewards?.find((r) => r._id === rewardId)

      if (reward) {
        // Optimistically subtract points
        dispatch(subtractPoints(reward.pointCost))
      }

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: rewardQueryKeys.catalog })

      // Snapshot the previous values
      const previousRewards = queryClient.getQueryData(
        rewardQueryKeys.catalogList({})
      )
      const previousUser = queryClient.getQueryData(['auth', 'me'])

      return { previousRewards, previousUser, rewardId, reward }
    },
    onSuccess: (data, rewardId, context) => {
      console.log('✅ Reward claim successful:', data)

      // Update user points with exact server response
      if (data.data?.newPointBalance !== undefined) {
        dispatch(setPoints(data.data.newPointBalance))
      }

      // Update auth cache with new points
      queryClient.setQueryData(['auth', 'me'], (old) => {
        if (old?.data?.user) {
          return {
            ...old,
            data: {
              ...old.data,
              user: {
                ...old.data.user,
                points: data.data.newPointBalance,
              },
            },
          }
        }
        return old
      })

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: rewardQueryKeys.catalog })
      queryClient.invalidateQueries({ queryKey: rewardQueryKeys.userRewards })
      queryClient.invalidateQueries({ queryKey: rewardQueryKeys.pointHistory })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })

      // Show success toast
      const pointsSpent =
        data.data?.pointsSpent || context.reward?.pointCost || 0
      const newBalance = data.data?.newPointBalance || 0

      toast.success(
        `Reward claimed! Spent ${pointsSpent} points. New balance: ${newBalance}`,
        {
          duration: 4000,
        }
      )

      options.onSuccess?.(data, rewardId)
    },
    onError: (error, rewardId, context) => {
      console.error('❌ Reward claim failed:', error)

      // Rollback Redux state
      dispatch(rollbackPoints())

      // Rollback React Query cache
      if (context?.previousRewards) {
        queryClient.setQueryData(
          rewardQueryKeys.catalogList({}),
          context.previousRewards
        )
      }
      if (context?.previousUser) {
        queryClient.setQueryData(['auth', 'me'], context.previousUser)
      }

      // Show error toast
      const errorMessage =
        error.response?.data?.message || 'Failed to claim reward'
      toast.error(errorMessage, {
        duration: 5000,
      })

      options.onError?.(error, rewardId)
    },
    onSettled: () => {
      // Always refetch after delay to ensure consistency
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: rewardQueryKeys.catalog })
        queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      }, 2000)
    },
  })
}

// Get user's claimed rewards
export const useUserRewards = (filters = {}) => {
  return useQuery({
    queryKey: rewardQueryKeys.userRewardsList(filters),
    queryFn: () => rewardsService.getUserRewards(filters),
    staleTime: 2 * 60 * 1000,
    select: (data) => data.data,
  })
}

// Get user's manual rewards
export const useUserManualRewards = (filters = {}) => {
  return useQuery({
    queryKey: [...rewardQueryKeys.userRewards, 'manual', { filters }],
    queryFn: () => rewardsService.getUserManualRewards(filters),
    staleTime: 2 * 60 * 1000,
    select: (data) => data.data,
  })
}

// Get user's point transaction history
export const usePointHistory = (filters = {}) => {
  return useQuery({
    queryKey: rewardQueryKeys.pointHistoryList(filters),
    queryFn: () => rewardsService.getPointHistory(filters),
    staleTime: 2 * 60 * 1000,
    select: (data) => data.data,
  })
}

// ===============================================
// MANAGEMENT HOOKS - For admin/spa reward management
// ===============================================

// Get filtered rewards for management (admin/spa view)
export const useFilteredRewards = (filters = {}) => {
  return useQuery({
    queryKey: rewardQueryKeys.list(filters),
    queryFn: () => rewardsService.getRewards(filters),
    staleTime: 2 * 60 * 1000,
    select: (data) => {
      if (!data?.data) {
        return {
          rewards: [],
          stats: { total: 0, active: 0 },
          pagination: {},
        }
      }

      return {
        rewards: data.data.rewards || [],
        stats: data.data.stats || { total: 0, active: 0 },
        pagination: data.data.pagination || {},
      }
    },
  })
}

// Get single reward for editing
export const useReward = (id) => {
  return useQuery({
    queryKey: rewardQueryKeys.detail(id),
    queryFn: () => rewardsService.getReward(id),
    staleTime: 2 * 60 * 1000,
    select: (data) => data.data.reward,
    enabled: !!id,
  })
}

// Create reward mutation
export const useCreateReward = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: rewardsService.createReward,
    onSuccess: (data) => {
      // Invalidate and refetch rewards list
      queryClient.invalidateQueries({ queryKey: rewardQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: rewardQueryKeys.catalog })
      queryClient.invalidateQueries({ queryKey: rewardQueryKeys.stats })

      toast.success('Reward created successfully!')
      options.onSuccess?.(data)
    },
    onError: (error) => {
      const errorMessage =
        error.response?.data?.message || 'Failed to create reward'
      toast.error(errorMessage)
      options.onError?.(error)
    },
  })
}

// Update reward mutation
export const useUpdateReward = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...data }) => rewardsService.updateReward(id, data),
    onSuccess: (data, variables) => {
      // Invalidate and refetch rewards list
      queryClient.invalidateQueries({ queryKey: rewardQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: rewardQueryKeys.catalog })
      queryClient.invalidateQueries({ queryKey: rewardQueryKeys.stats })

      // Update specific reward in cache
      queryClient.setQueryData(rewardQueryKeys.detail(variables.id), data)

      toast.success('Reward updated successfully!')
      options.onSuccess?.(data, variables)
    },
    onError: (error) => {
      const errorMessage =
        error.response?.data?.message || 'Failed to update reward'
      toast.error(errorMessage)
      options.onError?.(error)
    },
  })
}

// Delete reward mutation
export const useDeleteReward = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: rewardsService.deleteReward,
    onSuccess: (data, rewardId) => {
      // Invalidate and refetch rewards list
      queryClient.invalidateQueries({ queryKey: rewardQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: rewardQueryKeys.catalog })
      queryClient.invalidateQueries({ queryKey: rewardQueryKeys.stats })

      toast.success('Reward deleted successfully!')
      options.onSuccess?.(data, rewardId)
    },
    onError: (error) => {
      const errorMessage =
        error.response?.data?.message || 'Failed to delete reward'
      toast.error(errorMessage)
      options.onError?.(error)
    },
  })
}

// Get reward statistics
export const useRewardStats = (locationId = null) => {
  return useQuery({
    queryKey: rewardQueryKeys.statsOverview(locationId),
    queryFn: () => rewardsService.getRewardStats(locationId),
    staleTime: 5 * 60 * 1000,
    select: (data) => data.data,
  })
}

// ===============================================
// SERVICE INTEGRATION HOOKS
// ===============================================

// Get rewards for a specific service
export const useServiceRewards = (serviceId, userPoints = 0) => {
  return useQuery({
    queryKey: rewardQueryKeys.serviceRewards(serviceId),
    queryFn: () => rewardsService.getServiceRewards(serviceId, { userPoints }),
    staleTime: 2 * 60 * 1000,
    select: (data) => data.data,
    enabled: !!serviceId,
  })
}

// Get services with rewards
export const useServicesWithRewards = (filters = {}) => {
  return useQuery({
    queryKey: [...rewardQueryKeys.services, 'with-rewards', { filters }],
    queryFn: () => rewardsService.getServicesWithRewards(filters),
    staleTime: 5 * 60 * 1000,
    select: (data) => data.data,
  })
}

// Create service-specific reward
export const useCreateServiceReward = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ serviceId, ...rewardData }) =>
      rewardsService.createServiceReward(serviceId, rewardData),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: rewardQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: rewardQueryKeys.services })

      toast.success('Service reward created successfully!')
      options.onSuccess?.(data, variables)
    },
    onError: (error) => {
      const errorMessage =
        error.response?.data?.message || 'Failed to create service reward'
      toast.error(errorMessage)
      options.onError?.(error)
    },
  })
}

// Link reward to services
export const useLinkRewardToServices = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ rewardId, ...serviceData }) =>
      rewardsService.linkRewardToServices(rewardId, serviceData),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: rewardQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: rewardQueryKeys.services })

      toast.success('Reward linked to services successfully!')
      options.onSuccess?.(data, variables)
    },
    onError: (error) => {
      const errorMessage =
        error.response?.data?.message || 'Failed to link reward to services'
      toast.error(errorMessage)
      options.onError?.(error)
    },
  })
}

// ===============================================
// SPA MANAGEMENT HOOKS
// ===============================================

// Search users for reward giving
export const useSearchUsersForReward = (searchParams) => {
  return useQuery({
    queryKey: ['users', 'search', searchParams],
    queryFn: () => rewardsService.searchUsersForReward(searchParams),
    staleTime: 30 * 1000, // 30 seconds
    select: (data) => data.data,
    enabled: !!searchParams.search && searchParams.search.length > 2,
  })
}

// Give manual reward to user
export const useGiveManualReward = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ email, ...rewardData }) =>
      rewardsService.giveManualReward(email, rewardData),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: rewardQueryKeys.spaRewards })
      queryClient.invalidateQueries({ queryKey: rewardQueryKeys.userRewards })

      toast.success(`Manual reward given to ${variables.email}!`)
      options.onSuccess?.(data, variables)
    },
    onError: (error) => {
      const errorMessage =
        error.response?.data?.message || 'Failed to give manual reward'
      toast.error(errorMessage)
      options.onError?.(error)
    },
  })
}

// Bulk give rewards
export const useBulkGiveRewards = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: rewardsService.bulkGiveRewards,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: rewardQueryKeys.spaRewards })
      queryClient.invalidateQueries({ queryKey: rewardQueryKeys.userRewards })

      const successCount = data.data?.successful?.length || 0
      toast.success(`Bulk rewards distributed to ${successCount} users!`)
      options.onSuccess?.(data)
    },
    onError: (error) => {
      const errorMessage =
        error.response?.data?.message || 'Failed to distribute bulk rewards'
      toast.error(errorMessage)
      options.onError?.(error)
    },
  })
}

// ===============================================
// ADMIN HOOKS
// ===============================================

// Adjust user points (admin only)
export const useAdjustUserPoints = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, ...adjustmentData }) =>
      rewardsService.adjustUserPoints(userId, adjustmentData),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: rewardQueryKeys.pointHistory })

      toast.success('User points adjusted successfully!')
      options.onSuccess?.(data, variables)
    },
    onError: (error) => {
      const errorMessage =
        error.response?.data?.message || 'Failed to adjust user points'
      toast.error(errorMessage)
      options.onError?.(error)
    },
  })
}

// ===============================================
// UTILITY HOOKS
// ===============================================

// Hook to refresh all reward-related data
export const useRefreshRewards = () => {
  const queryClient = useQueryClient()

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: rewardQueryKeys.catalog }),
      queryClient.invalidateQueries({ queryKey: rewardQueryKeys.userRewards }),
      queryClient.invalidateQueries({ queryKey: rewardQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ])
  }
}

// Prefetch rewards for performance
export const usePrefetchRewards = () => {
  const queryClient = useQueryClient()

  const prefetchCatalog = (filters = {}) => {
    queryClient.prefetchQuery({
      queryKey: rewardQueryKeys.catalogList(filters),
      queryFn: () => rewardsService.getRewardsCatalog(filters),
      staleTime: 2 * 60 * 1000,
    })
  }

  const prefetchUserRewards = (filters = {}) => {
    queryClient.prefetchQuery({
      queryKey: rewardQueryKeys.userRewardsList(filters),
      queryFn: () => rewardsService.getUserRewards(filters),
      staleTime: 2 * 60 * 1000,
    })
  }

  return { prefetchCatalog, prefetchUserRewards }
}

// ===============================================
// HELPER FUNCTIONS
// ===============================================

// Helper function to calculate display value
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

// Helper to format reward type for display
export const formatRewardType = (type) => {
  const typeMap = {
    credit: 'Service Credit',
    discount: 'Discount %',
    service: 'Free Service',
    combo: 'Combo Deal',
    referral: 'Referral Reward',
    service_discount: 'Service Discount',
    free_service: 'Free Specific Service',
  }
  return typeMap[type] || type
}

// Helper to check if reward is affordable
export const isRewardAffordable = (reward, userPoints) => {
  return userPoints >= reward.pointCost && reward.status === 'active'
}

// Helper to calculate points needed
export const calculatePointsNeeded = (reward, userPoints) => {
  return Math.max(0, reward.pointCost - userPoints)
}
