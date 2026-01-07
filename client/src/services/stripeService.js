// File: client/src/services/stripeService.js - Stripe API Service
import axiosInstance from '../config'

const stripeService = {
  // ==================== STRIPE CONNECT ====================

  /**
   * Create a Stripe Connect account
   */
  createConnectAccount: async () => {
    const response = await axiosInstance.post('stripe/connect/create')
    return response.data
  },

  /**
   * Create account link for onboarding
   */
  createAccountLink: async (returnUrl, refreshUrl) => {
    const response = await axiosInstance.post('stripe/connect/account-link', {
      returnUrl,
      refreshUrl,
    })
    return response.data
  },

  /**
   * Get Stripe Connect account status
   */
  getAccountStatus: async () => {
    const response = await axiosInstance.get('stripe/connect/status')
    return response.data
  },

  /**
   * Disconnect Stripe account
   */
  disconnectAccount: async () => {
    const response = await axiosInstance.delete('stripe/connect/disconnect')
    return response.data
  },

  /**
   * Get Stripe dashboard link
   */
  getAccountDashboard: async () => {
    const response = await axiosInstance.get('stripe/connect/dashboard')
    return response.data
  },

  /**
   * Get clients revenue (for spa owners)
   */
  getClientsRevenue: async () => {
    const response = await axiosInstance.get('stripe/payment/clients-revenue')
    return response.data
  },

  // ==================== PAYMENTS ====================

  /**
   * Create a checkout session for booking with payment
   */
  createCheckoutSession: async (bookingData) => {
    const response = await axiosInstance.post(
      'stripe/payment/create-checkout-session',
      bookingData
    )
    return response.data
  },

  /**
   * Create a payment intent
   */
  createPaymentIntent: async (
    serviceId,
    bookingId = null,
    discountCode = null
  ) => {
    const response = await axiosInstance.post('stripe/payment/create-intent', {
      serviceId,
      bookingId,
      discountCode,
    })
    return response.data
  },

  /**
   * Confirm payment
   */
  confirmPayment: async (paymentIntentId) => {
    const response = await axiosInstance.post('stripe/payment/confirm', {
      paymentIntentId,
    })
    return response.data
  },

  /**
   * Get payment history
   */
  getPaymentHistory: async (page = 1, limit = 10) => {
    const response = await axiosInstance.get('stripe/payment/history', {
      params: { page, limit },
    })
    return response.data
  },

  /**
   * Get revenue analytics (for spa owners)
   */
  getRevenueAnalytics: async (startDate = null, endDate = null) => {
    const response = await axiosInstance.get('stripe/payment/analytics', {
      params: { startDate, endDate },
    })
    return response.data
  },

  /**
   * Process refund
   */
  processRefund: async (paymentId, amount = null, reason = null) => {
    const response = await axiosInstance.post(
      `stripe/payment/refund/${paymentId}`,
      {
        amount,
        reason,
      }
    )
    return response.data
  },
}

export default stripeService
