// File: client/src/services/bookingService.js

const API_URL = "/api/bookings";

export const bookingService = {
  // CLIENT ENDPOINTS
  getClientBookings: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${API_URL}/upcoming?${params}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    if (!response.ok) throw new Error("Failed to fetch bookings");
    return response.json();
  },

  getPastBookings: async (page = 1, limit = 10) => {
    const response = await fetch(
      `${API_URL}/past?page=${page}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    if (!response.ok) throw new Error("Failed to fetch past bookings");
    return response.json();
  },

  getBookingStats: async () => {
    const response = await fetch(`${API_URL}/stats`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    if (!response.ok) throw new Error("Failed to fetch stats");
    return response.json();
  },

  rescheduleBooking: async (bookingId, newDate, newTime) => {
    const response = await fetch(`${API_URL}/${bookingId}/reschedule`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ date: newDate, time: newTime }),
    });
    if (!response.ok) throw new Error("Failed to reschedule booking");
    return response.json();
  },

  cancelBooking: async (bookingId, reason = "") => {
    const response = await fetch(`${API_URL}/${bookingId}/cancel`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ reason }),
    });
    if (!response.ok) throw new Error("Failed to cancel booking");
    return response.json();
  },

  rateBooking: async (bookingId, rating, review = "") => {
    const response = await fetch(`${API_URL}/rate/${bookingId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ rating, review }),
    });
    if (!response.ok) throw new Error("Failed to submit rating");
    return response.json();
  },

  getBookedTimes: async (serviceId, date) => {
    const response = await fetch(
      `${API_URL}/booked-times?serviceId=${serviceId}&date=${date}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    if (!response.ok) throw new Error("Failed to fetch booked times");
    return response.json();
  },

  // ADMIN ENDPOINTS
  getAdminBookings: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${API_URL}/admin/all?${params}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    if (!response.ok) throw new Error("Failed to fetch bookings");
    return response.json();
  },

  getBookingDetail: async (bookingId) => {
    const response = await fetch(`${API_URL}/${bookingId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    if (!response.ok) throw new Error("Failed to fetch booking");
    return response.json();
  },

  updateBookingStatus: async (bookingId, status) => {
    const response = await fetch(`${API_URL}/${bookingId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) throw new Error("Failed to update booking");
    return response.json();
  },
};
