// File: client/src/hooks/useBookings.js
import { bookingService } from "@/services/bookingService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ===============================================
// QUERY KEYS
// ===============================================

export const bookingQueryKeys = {
  all: ["bookings"],
  upcoming: (userId, filters) => [...bookingQueryKeys.all, "upcoming", userId, filters],
  past: (userId, page, limit, filters) => [...bookingQueryKeys.all, "past", userId, page, limit, filters],
  stats: (userId, filters) => [...bookingQueryKeys.all, "stats", userId, filters],
  detail: (bookingId) => [...bookingQueryKeys.all, "detail", bookingId],
  bookedTimes: (serviceId, date) => [...bookingQueryKeys.all, "booked-times", serviceId, date],
};

// ===============================================
// QUERY HOOKS
// ===============================================

// Get upcoming bookings
export const useUpcomingBookings = (userId, filters = {}, options = {}) => {
  return useQuery({
    queryKey: bookingQueryKeys.upcoming(userId, filters),
    queryFn: () => bookingService.getClientBookings(filters),
    enabled: !!userId,
    // Default options that can be overridden
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    ...options,
  });
};

// Get past bookings
export const usePastBookings = (userId, page = 1, limit = 20, filters = {}, options = {}) => {
  return useQuery({
    queryKey: bookingQueryKeys.past(userId, page, limit, filters),
    queryFn: () => bookingService.getPastBookings(page, limit, filters),
    enabled: !!userId,
    staleTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    ...options,
  });
};

// Get booking stats
export const useBookingStats = (userId, filters = {}, options = {}) => {
  return useQuery({
    queryKey: bookingQueryKeys.stats(userId, filters),
    queryFn: () => bookingService.getBookingStats(filters),
    enabled: !!userId,
    staleTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
};

// Get booked times
export const useBookedTimes = (serviceId, date, options = {}) => {
  return useQuery({
    queryKey: bookingQueryKeys.bookedTimes(serviceId, date),
    queryFn: () => bookingService.getBookedTimes(serviceId, date),
    enabled: !!serviceId && !!date,
    select: (data) => data?.data?.bookedTimes || [],
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
  });
};

// ===============================================
// MUTATION HOOKS
// ===============================================

// Reschedule booking
export const useRescheduleBooking = (options = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookingId, date, time }) => 
      bookingService.rescheduleBooking(bookingId, date, time),
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: bookingQueryKeys.all });
      options.onSuccess?.(data);
    },
    onError: (error) => {
      console.error("Error rescheduling booking:", error);
      options.onError?.(error);
    },
  });
};

// Cancel booking
export const useCancelBooking = (options = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookingId, reason }) => 
      bookingService.cancelBooking(bookingId, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: bookingQueryKeys.all });
      options.onSuccess?.(data);
    },
    onError: (error) => {
      console.error("Error cancelling booking:", error);
      options.onError?.(error);
    },
  });
};

// Rate booking
export const useRateBooking = (options = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookingId, rating, review }) => 
      bookingService.rateBooking(bookingId, rating, review),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: bookingQueryKeys.all });
      options.onSuccess?.(data);
    },
    onError: (error) => {
      console.error("Error rating booking:", error);
      options.onError?.(error);
    },
  });
};
