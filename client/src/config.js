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
    const errorCode = `${error?.code || ''}`.trim().toUpperCase()
    const errorName = `${error?.name || ''}`.trim().toLowerCase()
    const errorMessage = `${error?.message || ''}`.trim().toLowerCase()
    const isCanceledRequest =
      errorCode === 'ERR_CANCELED' ||
      errorName === 'cancelederror' ||
      errorMessage.includes('request aborted') ||
      errorMessage.includes('aborted') ||
      errorMessage.includes('canceled') ||
      errorMessage.includes('cancelled')

    if (isCanceledRequest) {
      return Promise.reject(error)
    }

    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export default axiosInstance
