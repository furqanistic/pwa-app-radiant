// File: client/src/services/spaUsersService.js
// client/src/services/spaUsersService.js
import { axiosInstance } from '@/config'

export const spaUsersService = {
  // Get users from the same spa as current user
  getSpaUsers: async () => {
    const response = await axiosInstance.get('/spa-users')
    return response.data
  },

  // Get spa user activity data
  getSpaUserActivity: async () => {
    const response = await axiosInstance.get('/spa-users/activity')
    return response.data
  },
}
