// File: client/src/services/authService.js
// client/src/services/authService.js
import { axiosInstance } from '@/config'

export const authService = {
  // Select spa/location for user
  selectSpa: async (locationId, referralCode = null) => {
    const response = await axiosInstance.post('/auth/select-spa', {
      locationId,
      referralCode,
    })
    return response.data
  },

  // Update selected spa
  updateSelectedSpa: async (locationId) => {
    const response = await axiosInstance.put('/auth/update-spa', {
      locationId,
    })
    return response.data
  },

  // Get onboarding status
  getOnboardingStatus: async () => {
    const response = await axiosInstance.get('/auth/onboarding-status')
    return response.data
  },

  // Complete onboarding
  completeOnboarding: async () => {
    const response = await axiosInstance.post('/auth/complete-onboarding')
    return response.data
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await axiosInstance.get('/auth/me')
    return response.data
  },
}
