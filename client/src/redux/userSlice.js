// File: client/src/redux/userSlice.js - Enhanced with Point Management
import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  currentUser: null,
  token: null,
  loading: false,
  error: false,
  previousPoints: null, // For rollback functionality
}

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true
      state.error = false
    },
    loginSuccess: (state, action) => {
      state.loading = false
      state.error = false
      // Handle different payload structures with defensive checks
      if (action.payload?.data?.user) {
        state.currentUser = action.payload.data.user
        state.token = action.payload.token || action.payload.data.token
      } else if (action.payload?.user) {
        state.currentUser = action.payload.user
        state.token = action.payload.token
      } else if (action.payload?.data) {
        state.currentUser = action.payload.data
        state.token = action.payload.token
      } else {
        state.currentUser = action.payload
        state.token = action.payload?.token || null
      }
      // Reset previous points on login
      state.previousPoints = null
    },
    loginFailure: (state, action) => {
      state.loading = false
      state.error = action.payload?.message || action.payload || true
      state.currentUser = null
      state.token = null
      state.previousPoints = null
    },
    updateProfile: (state, action) => {
      // Update the current user with new profile data
      if (state.currentUser) {
        state.currentUser = {
          ...state.currentUser,
          ...action.payload,
        }
      }
    },
    logout: (state) => {
      localStorage.removeItem('token')
      return initialState
    },

    // NEW: Point management actions
    updatePoints: (state, action) => {
      if (state.currentUser) {
        // Store previous points for potential rollback
        state.previousPoints = state.currentUser.points
        // Update current points
        state.currentUser = {
          ...state.currentUser,
          points: action.payload,
        }
      }
    },

    // Optimistic point update (before API call)
    updatePointsOptimistic: (state, action) => {
      if (state.currentUser) {
        state.previousPoints = state.currentUser.points
        state.currentUser = {
          ...state.currentUser,
          points: Math.max(0, (state.currentUser.points || 0) + action.payload), // Ensure non-negative
        }
      }
    },

    // Rollback points on error
    rollbackPoints: (state) => {
      if (state.currentUser && state.previousPoints !== null) {
        state.currentUser = {
          ...state.currentUser,
          points: state.previousPoints,
        }
        state.previousPoints = null
      }
    },

    // Set points to exact value (from server response)
    setPoints: (state, action) => {
      if (state.currentUser) {
        state.currentUser = {
          ...state.currentUser,
          points: action.payload,
        }
        state.previousPoints = null // Clear rollback data
      }
    },

    // Add points (for earning points)
    addPoints: (state, action) => {
      if (state.currentUser) {
        state.previousPoints = state.currentUser.points
        state.currentUser = {
          ...state.currentUser,
          points: (state.currentUser.points || 0) + action.payload,
        }
      }
    },

    // Subtract points (for spending points)
    subtractPoints: (state, action) => {
      if (state.currentUser) {
        state.previousPoints = state.currentUser.points
        state.currentUser = {
          ...state.currentUser,
          points: Math.max(0, (state.currentUser.points || 0) - action.payload),
        }
      }
    },

    // Update location
    updateLocation: (state, action) => {
      if (state.currentUser) {
        state.currentUser = {
          ...state.currentUser,
          selectedLocation: action.payload,
        }
      }
    },

    // Clear error
    clearError: (state) => {
      state.error = false
    },
  },
})

// Export actions - keeping your existing ones plus new point actions
export const {
  loginStart,
  loginSuccess,
  loginFailure,
  updateProfile,
  logout,
  // New point management actions
  updatePoints,
  updatePointsOptimistic,
  rollbackPoints,
  setPoints,
  addPoints,
  subtractPoints,
  updateLocation,
  clearError,
} = userSlice.actions

// Your existing selectors
export const selectCurrentUser = (state) => state.user.currentUser
export const selectUserRole = (state) => state.user.currentUser?.role
export const selectIsAuthenticated = (state) => !!state.user.currentUser
export const selectToken = (state) => state.user.token
export const selectIsLoading = (state) => state.user.loading

// Role-based selectors
export const selectIsSuperAdmin = (state) =>
  state.user.currentUser?.role === 'super-admin'
export const selectIsAdmin = (state) => {
  const role = state.user.currentUser?.role
  return ['admin', 'team', 'enterprise'].includes(role)
}
export const selectIsElevatedUser = (state) => {
  const role = state.user.currentUser?.role
  return ['super-admin', 'admin', 'team', 'enterprise'].includes(role)
}
export const selectIsUser = (state) => state.user.currentUser?.role === 'user'

// NEW: Point-specific selectors
export const selectUserPoints = (state) => state.user.currentUser?.points || 0
export const selectPreviousPoints = (state) => state.user.previousPoints
export const selectCanRollbackPoints = (state) =>
  state.user.previousPoints !== null

export default userSlice.reducer
