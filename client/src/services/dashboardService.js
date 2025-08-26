// File: client/src/services/dashboardService.js
import { axiosInstance } from '@/config'

export const dashboardService = {
  // Get complete dashboard data
  getDashboardData: () => axiosInstance.get('/dashboard/data'),

  // Bookings endpoints
  getUpcomingAppointments: (limit = 10) =>
    axiosInstance.get(`/bookings/upcoming?limit=${limit}`),

  getPastVisits: (limit = 20, page = 1) =>
    axiosInstance.get(`/bookings/past?limit=${limit}&page=${page}`),

  getBookingStats: () => axiosInstance.get('/bookings/stats'),

  createBooking: (bookingData) =>
    axiosInstance.post('/bookings/create', bookingData),

  rateVisit: (bookingId, rating, review) =>
    axiosInstance.post(`/bookings/rate/${bookingId}`, { rating, review }),

  // Referral endpoints
  getReferralStats: () => axiosInstance.get('/referral/my-stats'),

  getReferralLeaderboard: (period = 'month') =>
    axiosInstance.get(`/referral/leaderboard?period=${period}`),

  // User credits/rewards
  getUserRewards: () => axiosInstance.get('/rewards/my-rewards'),
}
