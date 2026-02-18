import { axiosInstance } from '@/config'

export const ghlService = {
  getLocationBookingsByDate: async (locationId, date) => {
    const response = await axiosInstance.get('/ghl/bookings', {
      params: { locationId, date },
    })
    return response.data
  },
}

export default ghlService
