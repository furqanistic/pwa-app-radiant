// File: client/src/services/authService.js
import { axiosInstance } from '@/config'

export const authService = {
  getCurrentUser: async () => {
    const response = await axiosInstance.get('/auth/me')
    return response.data
  },

  login: async (email, password) => {
    const response = await axiosInstance.post('/auth/signin', {
      email,
      password,
    })
    return response.data
  },

  register: async (userData) => {
    const response = await axiosInstance.post('/auth/signup', userData)
    return response.data
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await axiosInstance.put('/auth/change-password', {
      currentPassword,
      newPassword,
    })
    return response.data
  },

  getAllUsers: async (params = {}) => {
    const queryParams = new URLSearchParams({
      page: params.page || 1,
      limit: params.limit || 10,
      search: params.search || '',
      role: params.role || 'all',
      locationId: params.locationId || '', // Filter by location
      sortBy: params.sortBy || 'createdAt',
      sortOrder: params.sortOrder || 'desc',
    }).toString()

    const response = await axiosInstance.get(`/auth/all-users?${queryParams}`)
    return response.data
  },

  getUserProfile: async (userId) => {
    const response = await axiosInstance.get(`/auth/profile/${userId}`)
    return response.data
  },

  updateUser: async (userId, userData) => {
    const response = await axiosInstance.put(
      `/auth/profile/${userId}`,
      userData
    )
    return response.data
  },

  deleteUser: async (userId) => {
    const response = await axiosInstance.delete(`/auth/delete/${userId}`)
    return response.data
  },

  changeUserRole: async (userId, newRole, reason = '') => {
    const response = await axiosInstance.put(`/auth/users/${userId}/role`, {
      newRole,
      reason,
    })
    return response.data
  },

  adjustUserPoints: async (userId, type, amount, reason = '') => {
    const response = await axiosInstance.post(`/auth/users/${userId}/points`, {
      type,
      amount: parseInt(amount),
      reason,
    })
    return response.data
  },

  bulkUpdateUsers: async (userIds, action, data) => {
    const response = await axiosInstance.post('/auth/bulk-operations', {
      userIds,
      action,
      data,
    })
    return response.data
  },

  createSpaMember: async (userData) => {
    const response = await axiosInstance.post(
      '/auth/create-spa-member',
      userData
    )
    return response.data
  },

  selectSpa: async (locationId, referralCode = null) => {
    const response = await axiosInstance.post('/auth/select-spa', {
      locationId,
      referralCode,
    })
    return response.data
  },

  updateSelectedSpa: async (locationId) => {
    const response = await axiosInstance.put('/auth/update-spa', {
      locationId,
    })
    return response.data
  },

  getOnboardingStatus: async () => {
    const response = await axiosInstance.get('/auth/onboarding-status')
    return response.data
  },

  completeOnboarding: async () => {
    const response = await axiosInstance.post('/auth/complete-onboarding')
    return response.data
  },

  generateReferralCode: async () => {
    const response = await axiosInstance.post('/auth/generate-referral-code')
    return response.data
  },

  linkGoogleAccount: async (googleData) => {
    const response = await axiosInstance.post('/auth/link-google', googleData)
    return response.data
  },

  unlinkGoogleAccount: async () => {
    const response = await axiosInstance.delete('/auth/unlink-google')
    return response.data
  },

  canPerformAction: (currentUserRole, targetUserRole, action) => {
    const roleHierarchy = {
      'super-admin': 5,
      admin: 4,
      spa: 3,
      enterprise: 2,
      user: 1,
    }

    const currentLevel = roleHierarchy[currentUserRole] || 0
    const targetLevel = roleHierarchy[targetUserRole] || 0

    switch (action) {
      case 'view':
        return currentLevel >= 3
      case 'edit':
        return currentLevel > targetLevel
      case 'delete':
        return currentLevel > targetLevel && currentLevel >= 4
      case 'changeRole':
        return currentLevel > targetLevel && currentLevel >= 4
      case 'adjustPoints':
        return currentLevel >= 4
      default:
        return false
    }
  },

  getAvailableRoles: (currentUserRole) => {
    const allRoles = [
      { value: 'user', label: 'User', level: 1 },
      { value: 'enterprise', label: 'Enterprise', level: 2 },
      { value: 'spa', label: 'Spa', level: 3 },
      { value: 'admin', label: 'Admin', level: 4 },
      { value: 'super-admin', label: 'Super Admin', level: 5 },
    ]

    const roleHierarchy = {
      'super-admin': 5,
      admin: 4,
      spa: 3,
      enterprise: 2,
      user: 1,
    }

    const currentLevel = roleHierarchy[currentUserRole] || 0

    return allRoles.filter((role) => {
      if (currentUserRole === 'super-admin') {
        return role.value !== 'super-admin'
      }
      if (currentUserRole === 'admin') {
        return role.level < 4
      }
      return false
    })
  },
  assignLocationToUser: async (userId, locationId) => {
    const response = await axiosInstance.post('/auth/assign-location', {
      userId,
      locationId,
    })
    return response.data
  },

  getAssignableUsers: async () => {
    const response = await axiosInstance.get('/auth/assignable-users')
    return response.data
  },

  formatRoleName: (role) => {
    const roleMap = {
      'super-admin': 'Super Admin',
      admin: 'Admin',
      spa: 'Spa',
      enterprise: 'Enterprise',
      user: 'User',
    }
    return roleMap[role] || role
  },

  getRoleColorClass: (role) => {
    const colorMap = {
      'super-admin': 'bg-gradient-to-r from-pink-500 to-rose-600 text-white',
      admin: 'bg-gradient-to-r from-pink-500 to-rose-600 text-white',
      spa: 'bg-gradient-to-r from-pink-500 to-rose-600 text-white',
      enterprise: 'bg-gradient-to-r from-pink-500 to-rose-600 text-white',
      user: 'bg-gray-100 text-gray-800 border border-gray-200',
    }
    return colorMap[role] || 'bg-gray-100 text-gray-800'
  },

  handleApiError: (error) => {
    if (!navigator.onLine) {
      return {
        type: 'network',
        message: 'You appear to be offline. Please check your connection.',
      }
    }

    if (error.response) {
      const { status, data } = error.response

      switch (status) {
        case 401:
          return {
            type: 'authentication',
            message: data.message || 'Authentication failed',
          }
        case 403:
          return {
            type: 'authorization',
            message: data.message || 'Access denied',
          }
        case 404:
          return {
            type: 'not_found',
            message: data.message || 'Resource not found',
          }
        case 400:
          return {
            type: 'validation',
            message: data.message || 'Invalid request',
          }
        case 500:
          return {
            type: 'server',
            message: 'Internal server error',
          }
        default:
          return {
            type: 'unknown',
            message: data.message || 'An unexpected error occurred',
          }
      }
    }

    return {
      type: 'network',
      message: 'Network error - please check your connection',
    }
  },
}

export default authService
