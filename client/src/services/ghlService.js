import { axiosInstance } from '@/config'

export const ghlService = {
  getCalendars: async (locationId) => {
    const response = await axiosInstance.get('/ghl/calendars', {
      params: { locationId },
    })
    return response.data
  },

  getCalendarServices: async (locationId) => {
    const response = await axiosInstance.get('/ghl/calendar-services', {
      params: { locationId },
    })
    return response.data
  },

  getCalendarServiceById: async (locationId, serviceId) => {
    const response = await axiosInstance.get(`/ghl/calendar-services/${serviceId}`, {
      params: { locationId },
    })
    return response.data
  },

  getLocationBookingsByDate: async (locationId, date, calendarId, timeZone) => {
    const response = await axiosInstance.get('/ghl/bookings', {
      params: {
        locationId,
        date,
        ...(calendarId ? { calendarId } : {}),
        ...(timeZone ? { timeZone } : {}),
      },
    })
    return response.data
  },
}

export default ghlService
