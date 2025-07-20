// client/src/config.js
import axios from 'axios'
import { store } from './redux/store'

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // This ensures cookies are sent
})

// Add a request interceptor to automatically add auth token from Redux
axiosInstance.interceptors.request.use(
  (config) => {
    // Get token from Redux store
    const token = store.getState().user.token

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Optional: Add response interceptor for handling auth errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle token expiration - you can dispatch logout action here
      // store.dispatch(logout())
      console.error('Authentication failed:', error.response?.data?.message)
    }
    return Promise.reject(error)
  }
)
