// File: client/src/hooks/useReferral.js

import { axiosInstance } from '@/config'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// Get user's referral stats with computed data
export const useReferralStatsWithComputedData = () => {
  return useQuery({
    queryKey: ['referral', 'stats', 'computed'],
    queryFn: async () => {
      const response = await axiosInstance.get('/referral/my-stats')
      const stats = response.data.data.stats

      // Generate share URL
      const baseUrl = window.location.origin
      const shareUrl = stats.referralCode
        ? `${baseUrl}/signup?ref=${stats.referralCode}`
        : null

      // Calculate conversion rate
      const conversionRate =
        stats.totalReferrals > 0
          ? ((stats.convertedReferrals / stats.totalReferrals) * 100).toFixed(1)
          : 0

      // Calculate next tier progress
      let nextTierProgress = null
      const currentTier = stats.currentTier || 'bronze'

      if (currentTier === 'bronze') {
        nextTierProgress = {
          nextTier: 'Gold',
          referralsNeeded: Math.max(0, 5 - stats.totalReferrals),
          progress: Math.min(100, (stats.totalReferrals / 5) * 100),
          isMaxTier: false,
        }
      } else if (currentTier === 'gold') {
        nextTierProgress = {
          nextTier: 'Platinum',
          referralsNeeded: Math.max(0, 10 - stats.totalReferrals),
          progress: Math.min(100, ((stats.totalReferrals - 5) / 5) * 100),
          isMaxTier: false,
        }
      } else {
        nextTierProgress = {
          nextTier: 'Max Tier',
          referralsNeeded: 0,
          progress: 100,
          isMaxTier: true,
        }
      }

      return {
        ...stats,
        shareUrl,
        conversionRate,
        nextTierProgress,
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Generate referral code
export const useGenerateMyReferralCode = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await axiosInstance.post('/auth/generate-referral-code')
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['referral'])
      toast.success('Referral code generated!')
      options.onSuccess?.(data)
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to generate code')
      options.onError?.(error)
    },
  })
}

// Get referral leaderboard
export const useReferralLeaderboard = ({ period = 'month', limit = 10 }) => {
  return useQuery({
    queryKey: ['referral', 'leaderboard', period, limit],
    queryFn: async () => {
      const response = await axiosInstance.get('/referral/leaderboard', {
        params: { period, limit },
      })
      return response.data.data
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

// Get all referrals (admin/spa)
export const useAllReferrals = (filters) => {
  return useQuery({
    queryKey: ['referral', 'all', filters],
    queryFn: async () => {
      const response = await axiosInstance.get('/referral/all', {
        params: filters,
      })
      return response.data.data
    },
    staleTime: 1000 * 60 * 2,
  })
}

// Get referral analytics grouped by users (admin/spa/super-admin)
export const useReferralUsersAnalytics = (filters) => {
  return useQuery({
    queryKey: ['referral', 'users-analytics', filters],
    queryFn: async () => {
      const response = await axiosInstance.get('/referral/users-analytics', {
        params: filters,
      })
      return response.data.data
    },
    staleTime: 1000 * 60 * 2,
  })
}

// Regenerate referral code for a user (admin/super-admin)
export const useRegenerateReferralCode = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId }) => {
      const response = await axiosInstance.post(
        `/auth/users/${userId}/referral-code/regenerate`
      )
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['referral', 'users-analytics'])
      toast.success('Referral code regenerated')
      options.onSuccess?.(data)
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message || 'Failed to regenerate referral code'
      )
      options.onError?.(error)
    },
  })
}

// Complete referral manually
export const useCompleteReferral = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ referralId, notes }) => {
      const response = await axiosInstance.post(
        `/referral/complete/${referralId}`,
        {
          notes,
        }
      )
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['referral'])
      toast.success('Referral completed successfully!')
      options.onSuccess?.(data)
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message || 'Failed to complete referral'
      )
      options.onError?.(error)
    },
  })
}

// Award milestone reward
export const useAwardMilestoneReward = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data) => {
      const response = await axiosInstance.post(
        '/referral/award-milestone',
        data
      )
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['referral'])
      toast.success('Milestone reward awarded!')
      options.onSuccess?.(data)
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to award milestone')
      options.onError?.(error)
    },
  })
}

// Get referral configuration
export const useReferralConfig = () => {
  return useQuery({
    queryKey: ['referral', 'config'],
    queryFn: async () => {
      const response = await axiosInstance.get('/referral/config')
      return response.data.data.config
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  })
}

// Update referral configuration
export const useUpdateReferralConfig = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (configData) => {
      const response = await axiosInstance.put('/referral/config', configData)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['referral', 'config'])
      toast.success('Configuration updated successfully!')
      options.onSuccess?.(data)
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message || 'Failed to update configuration'
      )
      options.onError?.(error)
    },
  })
}

// Get spa-specific referral stats
export const useSpaReferralStats = () => {
  return useQuery({
    queryKey: ['referral', 'spa-stats'],
    queryFn: async () => {
      const response = await axiosInstance.get('/referral/spa-stats')
      return response.data.data
    },
    staleTime: 1000 * 60 * 5,
  })
}
