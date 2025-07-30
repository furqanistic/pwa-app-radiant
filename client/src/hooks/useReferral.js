// File: client/src/hooks/useReferral.js
import { referralService } from '@/services/referralService'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Query Keys
export const referralQueryKeys = {
  all: ['referral'],
  stats: () => ['referral', 'stats'],
  myStats: () => ['referral', 'stats', 'my'],
  leaderboard: () => ['referral', 'leaderboard'],
  leaderboardList: (params) => ['referral', 'leaderboard', 'list', params],
  admin: () => ['referral', 'admin'],
  adminReferrals: (params) => ['referral', 'admin', 'referrals', params],
  config: () => ['referral', 'admin', 'config'],
}

// =====================================
// USER QUERY HOOKS
// =====================================

// Get user's referral stats
export const useMyReferralStats = (options = {}) => {
  return useQuery({
    queryKey: referralQueryKeys.myStats(),
    queryFn: referralService.getMyReferralStats,
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (data) => data.data.stats,
    ...options,
  })
}

// Get referral leaderboard
export const useReferralLeaderboard = (params = {}, options = {}) => {
  return useQuery({
    queryKey: referralQueryKeys.leaderboardList(params),
    queryFn: () => referralService.getLeaderboard(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (data) => data.data,
    ...options,
  })
}

// =====================================
// ADMIN QUERY HOOKS
// =====================================

// Get all referrals (admin)
export const useAllReferrals = (params = {}, options = {}) => {
  return useQuery({
    queryKey: referralQueryKeys.adminReferrals(params),
    queryFn: () => referralService.getAllReferrals(params),
    staleTime: 1 * 60 * 1000, // 1 minute
    select: (data) => data.data,
    enabled: options.enabled !== false, // Default to enabled
    ...options,
  })
}

// Get referral configuration (admin)
export const useReferralConfig = (options = {}) => {
  return useQuery({
    queryKey: referralQueryKeys.config(),
    queryFn: referralService.getReferralConfig,
    staleTime: 10 * 60 * 1000, // 10 minutes
    select: (data) => data.data.config,
    enabled: options.enabled !== false,
    ...options,
  })
}

// =====================================
// MUTATION HOOKS
// =====================================

// Complete referral (admin)
export const useCompleteReferral = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ referralId, notes }) =>
      referralService.completeReferral(referralId, notes),
    onSuccess: (data, variables) => {
      // Invalidate all referrals queries
      queryClient.invalidateQueries({ queryKey: referralQueryKeys.admin() })
      // Invalidate user stats
      queryClient.invalidateQueries({ queryKey: referralQueryKeys.stats() })
      // Invalidate leaderboard
      queryClient.invalidateQueries({ queryKey: referralQueryKeys.leaderboard })

      options.onSuccess?.(data, variables)
    },
    onError: (error) => {
      console.error('Error completing referral:', error)
      options.onError?.(error)
    },
  })
}

// Award milestone reward (admin)
export const useAwardMilestoneReward = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, milestone, purchaseAmount }) =>
      referralService.awardMilestoneReward(userId, milestone, purchaseAmount),
    onSuccess: (data, variables) => {
      // Invalidate all referrals queries
      queryClient.invalidateQueries({ queryKey: referralQueryKeys.admin() })
      // Invalidate user stats (might be the current user)
      queryClient.invalidateQueries({ queryKey: referralQueryKeys.stats() })
      // Invalidate leaderboard
      queryClient.invalidateQueries({ queryKey: referralQueryKeys.leaderboard })

      options.onSuccess?.(data, variables)
    },
    onError: (error) => {
      console.error('Error awarding milestone reward:', error)
      options.onError?.(error)
    },
  })
}

// Update referral configuration (admin)
export const useUpdateReferralConfig = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: referralService.updateReferralConfig,
    onSuccess: (data) => {
      // Update the config in cache
      queryClient.setQueryData(referralQueryKeys.config(), data.data.config)

      options.onSuccess?.(data)
    },
    onError: (error) => {
      console.error('Error updating referral config:', error)
      options.onError?.(error)
    },
  })
}

// Generate referral code for current user
export const useGenerateMyReferralCode = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: referralService.generateMyReferralCode,
    onSuccess: (data) => {
      // Update the cache immediately with the new referral code
      queryClient.setQueryData(referralQueryKeys.myStats(), (oldData) => {
        if (oldData && oldData.stats) {
          return {
            ...oldData,
            stats: {
              ...oldData.stats,
              referralCode: data.data.referralCode,
            },
          }
        }
        return oldData
      })

      // Also invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: referralQueryKeys.myStats() })

      options.onSuccess?.(data)
    },
    onError: (error) => {
      console.error('Error generating referral code:', error)
      options.onError?.(error)
    },
  })
}

// =====================================
// UTILITY HOOKS
// =====================================

// Get referral stats with computed properties
export const useReferralStatsWithComputedData = (options = {}) => {
  const { data: stats, ...queryResult } = useMyReferralStats(options)

  // Provide default stats if no data exists (new user)
  const defaultStats = {
    referralCode: null, // Don't show "LOADING..." for missing codes
    totalReferrals: 0,
    activeReferrals: 0,
    convertedReferrals: 0,
    currentTier: 'bronze',
    totalEarnings: 0,
    referredBy: null,
    referralBreakdown: {
      pending: 0,
      completed: 0,
      expired: 0,
    },
    recentReferrals: [],
    receivedReferrals: [],
  }

  const actualStats = stats || defaultStats

  // Calculate additional metrics
  const computedStats = {
    ...actualStats,
    conversionRate:
      actualStats.totalReferrals > 0
        ? (
            (actualStats.convertedReferrals / actualStats.totalReferrals) *
            100
          ).toFixed(1)
        : 0,
    pendingRewards: actualStats.totalReferrals - actualStats.convertedReferrals,
    averageEarningsPerReferral:
      actualStats.convertedReferrals > 0
        ? (actualStats.totalEarnings / actualStats.convertedReferrals).toFixed(
            2
          )
        : 0,
    nextTierProgress: calculateTierProgress(actualStats),
    shareUrl: actualStats.referralCode
      ? `${window.location.origin}/join?ref=${actualStats.referralCode}`
      : '',
  }

  return {
    ...queryResult,
    data: computedStats, // Return computedStats as 'data'
    stats: actualStats,
  }
}

// Get leaderboard with user ranking
export const useLeaderboardWithUserRank = (params = {}, options = {}) => {
  const { data: leaderboardData, ...queryResult } = useReferralLeaderboard(
    params,
    options
  )
  const { data: myStats } = useMyReferralStats({ enabled: !!leaderboardData })

  if (!leaderboardData || !myStats) {
    return { ...queryResult, leaderboard: null, userRank: null }
  }

  // Find user's position in leaderboard
  const userRank =
    leaderboardData.leaderboard.findIndex(
      (user) => user.userId === myStats.userId
    ) + 1

  return {
    ...queryResult,
    leaderboard: leaderboardData.leaderboard,
    userRank: userRank > 0 ? userRank : null,
    period: leaderboardData.period,
    generatedAt: leaderboardData.generatedAt,
  }
}

// Prefetch referral data (useful for navigation)
export const usePrefetchReferralData = () => {
  const queryClient = useQueryClient()

  return {
    prefetchStats: () => {
      queryClient.prefetchQuery({
        queryKey: referralQueryKeys.myStats(),
        queryFn: referralService.getMyReferralStats,
        staleTime: 2 * 60 * 1000,
      })
    },
    prefetchLeaderboard: (params = {}) => {
      queryClient.prefetchQuery({
        queryKey: referralQueryKeys.leaderboardList(params),
        queryFn: () => referralService.getLeaderboard(params),
        staleTime: 5 * 60 * 1000,
      })
    },
  }
}

// =====================================
// HELPER FUNCTIONS
// =====================================

// Calculate progress to next tier
function calculateTierProgress(stats) {
  const { currentTier, convertedReferrals } = stats

  const tierThresholds = {
    bronze: { min: 0, max: 4, next: 'gold' },
    gold: { min: 5, max: 9, next: 'platinum' },
    platinum: { min: 10, max: Infinity, next: null },
  }

  const currentTierInfo = tierThresholds[currentTier]
  if (!currentTierInfo || !currentTierInfo.next) {
    return {
      isMaxTier: true,
      progress: 100,
      nextTier: null,
      referralsNeeded: 0,
    }
  }

  const nextTierInfo = tierThresholds[currentTierInfo.next]
  const referralsNeeded = nextTierInfo.min - convertedReferrals
  const progress = Math.min(
    ((convertedReferrals - currentTierInfo.min) /
      (nextTierInfo.min - currentTierInfo.min)) *
      100,
    100
  )

  return {
    isMaxTier: false,
    progress: Math.max(0, progress),
    nextTier: currentTierInfo.next,
    referralsNeeded: Math.max(0, referralsNeeded),
  }
}
