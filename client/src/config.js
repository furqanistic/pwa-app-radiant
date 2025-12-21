// File: client/src/config.js
import axios from 'axios'

// Create axios instance with proper base URL for development
export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const FRONTEND_URL = import.meta.env.VITE_APP_URL || window.location.origin

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem('token') || sessionStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message)
    // Handle auth errors, but skip for signin endpoint
    if (error.response?.status === 401 && error.config.url !== '/auth/signin') {
      localStorage.removeItem('token')
      sessionStorage.removeItem('token')
      window.location.href = '/auth'
    }
    return Promise.reject(error)
  }
)

export default axiosInstance
