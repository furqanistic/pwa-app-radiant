// File: client/src/hooks/useDashboard.js
import { dashboardService } from '@/services/dashboardService'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Dashboard query keys
export const dashboardQueryKeys = {
  all: ['dashboard'],
  data: () => [...dashboardQueryKeys.all, 'data'],
  appointments: () => [...dashboardQueryKeys.all, 'appointments'],
  visits: () => [...dashboardQueryKeys.all, 'visits'],
  stats: () => [...dashboardQueryKeys.all, 'stats'],
  referralStats: () => [...dashboardQueryKeys.all, 'referral-stats'],
}

// Get complete dashboard data
export const useDashboardData = () => {
  return useQuery({
    queryKey: dashboardQueryKeys.data(),
    queryFn: async () => {
      const response = await dashboardService.getDashboardData()
      return response.data
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Get upcoming appointments
export const useUpcomingAppointments = (limit = 10) => {
  return useQuery({
    queryKey: [...dashboardQueryKeys.appointments(), { limit }],
    queryFn: async () => {
      const response = await dashboardService.getUpcomingAppointments(limit)
      return response.data
    },
    staleTime: 2 * 60 * 1000,
  })
}

// Get past visits
export const usePastVisits = (limit = 20, page = 1) => {
  return useQuery({
    queryKey: [...dashboardQueryKeys.visits(), { limit, page }],
    queryFn: async () => {
      const response = await dashboardService.getPastVisits(limit, page)
      return response.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Get booking statistics
export const useBookingStats = () => {
  return useQuery({
    queryKey: dashboardQueryKeys.stats(),
    queryFn: async () => {
      const response = await dashboardService.getBookingStats()
      return response.data
    },
    staleTime: 10 * 60 * 1000,
  })
}

// Get referral statistics
export const useReferralStats = () => {
  return useQuery({
    queryKey: dashboardQueryKeys.referralStats(),
    queryFn: async () => {
      const response = await dashboardService.getReferralStats()
      return response.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Create booking mutation
export const useCreateBooking = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: dashboardService.createBooking,
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.appointments(),
      })
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.stats() })
      options.onSuccess?.(data)
    },
    onError: (error) => {
      console.error('Error creating booking:', error)
      options.onError?.(error)
    },
  })
}

// Rate visit mutation
export const useRateVisit = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ bookingId, rating, review }) =>
      dashboardService.rateVisit(bookingId, rating, review),
    onSuccess: (data) => {
      // Invalidate visits query
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.visits() })
      // Update user points
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      options.onSuccess?.(data)
    },
    onError: (error) => {
      console.error('Error rating visit:', error)
      options.onError?.(error)
    },
  })
}
