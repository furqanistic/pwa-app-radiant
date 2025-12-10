// File: pwa-app-radiant/client/src/lib/bookingHelpers.js
// ================================================================
// File: client/src/utils/bookingHelpers.js
// JavaScript Version (NOT TypeScript)
// ================================================================

/**
 * Get price from booking object with fallback
 * Checks multiple possible field names for price
 */
export const getPrice = (booking) => {
  return (
    booking?.finalPrice ||
    booking?.totalPrice ||
    booking?.price ||
    0
  )
}

/**
 * Get location name from booking object
 */
export const getLocationName = (booking) => {
  return (
    booking?.locationName ||
    booking?.location?.name ||
    booking?.selectedLocation?.locationName ||
    'To be confirmed'
  )
}

/**
 * Get provider name from booking object
 */
export const getProviderName = (booking) => {
  return (
    booking?.providerName ||
    booking?.practitioner ||
    booking?.provider?.name ||
    'To be assigned'
  )
}

/**
 * Get duration from booking object
 */
export const getDuration = (booking) => {
  return (
    booking?.duration ||
    booking?.service?.duration ||
    0
  )
}

/**
 * Format date in readable format
 */
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Get image from booking object with fallback
 */
export const getImageUrl = (booking) => {
  return (
    booking?.image ||
    booking?.service?.image ||
    'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=500&h=300&fit=crop'
  )
}

/**
 * Get service name from booking object
 */
export const getServiceName = (booking) => {
  return (
    booking?.serviceName ||
    booking?.service?.name ||
    'Unknown Service'
  )
}

/**
 * Get treatment name from booking object
 */
export const getTreatmentName = (booking) => {
  return (
    booking?.treatmentName ||
    booking?.treatment?.name ||
    null
  )
}

/**
 * Normalize cart item to match booking structure
 * THIS IS THE MOST IMPORTANT FUNCTION - Use this!
 */
export const normalizeCartItem = (item) => ({
  // IDs
  id: item.id,
  _id: item.id,
  serviceId: item.serviceId,

  // Service Info
  serviceName: getServiceName(item),
  treatmentName: getTreatmentName(item),
  image: getImageUrl(item),

  // Booking Details
  date: item.date || new Date().toISOString(),
  time: item.time || '00:00',
  duration: getDuration(item),

  // ✅ CRITICAL - Price (use helper)
  price: getPrice(item),
  totalPrice: getPrice(item),
  finalPrice: getPrice(item),

  // Location
  locationName: getLocationName(item),
  location: item.location?.name || getLocationName(item),

  // Provider
  providerName: getProviderName(item),
  practitioner: getProviderName(item),

  // Add-ons
  addOns: item.addOns || [],

  // Status
  status: 'pending',
  isPending: true,
})

// ================================================================
// Export as object for easier access
// ================================================================

export const bookingHelpers = {
  getPrice,
  getLocationName,
  getProviderName,
  getDuration,
  formatDate,
  getImageUrl,
  getServiceName,
  getTreatmentName,
  normalizeCartItem,
}

// ================================================================
// USAGE EXAMPLES
// ================================================================

/*
// In your components:

// Option 1: Named imports
import { getPrice, getLocationName, normalizeCartItem } from '@/utils/bookingHelpers'

const price = getPrice(booking)
const location = getLocationName(booking)
const normalized = normalizeCartItem(cartItem)

// Option 2: Object import
import { bookingHelpers } from '@/utils/bookingHelpers'

const price = bookingHelpers.getPrice(booking)
const location = bookingHelpers.getLocationName(booking)
const normalized = bookingHelpers.normalizeCartItem(cartItem)

*/