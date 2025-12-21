// File: client/src/services/bookingService.js
import { axiosInstance } from "@/config";

export const bookingService = {
  // CLIENT ENDPOINTS
  getClientBookings: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    const response = await axiosInstance.get(`/bookings/upcoming?${params}`);
    return response.data;
  },

  getPastBookings: async (page = 1, limit = 10) => {
    const response = await axiosInstance.get(
      `/bookings/past?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  getBookingStats: async () => {
    const response = await axiosInstance.get("/bookings/stats");
    return response.data;
  },

  rescheduleBooking: async (bookingId, newDate, newTime) => {
    const response = await axiosInstance.put(
      `/bookings/${bookingId}/reschedule`,
      {
        date: newDate,
        time: newTime,
      }
    );
    return response.data;
  },

  cancelBooking: async (bookingId, reason = "") => {
    const response = await axiosInstance.delete(`/bookings/${bookingId}/cancel`, {
      data: { reason },
    });
    return response.data;
  },

  rateBooking: async (bookingId, rating, review = "") => {
    const response = await axiosInstance.post(`/bookings/rate/${bookingId}`, {
      rating,
      review,
    });
    return response.data;
  },

  getBookedTimes: async (serviceId, date) => {
    const response = await axiosInstance.get(
      `/bookings/booked-times?serviceId=${serviceId}&date=${date}`
    );
    return response.data;
  },

  // ADMIN ENDPOINTS
  getAdminBookings: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    const response = await axiosInstance.get(`/bookings/admin/all?${params}`);
    return response.data;
  },

  getBookingDetail: async (bookingId) => {
    const response = await axiosInstance.get(`/bookings/${bookingId}`);
    return response.data;
  },

  updateBookingStatus: async (bookingId, status) => {
    const response = await axiosInstance.put(`/bookings/${bookingId}/status`, {
      status,
    });
    return response.data;
  },
};
