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
  createCheckoutSession: async (sessionData) => {
    const response = await axiosInstance.post(
      'stripe/payment/create-checkout-session',
      sessionData
    )
    return response.data
  },

  /**
   * Create a direct checkout session for membership plan purchase
   */
  createMembershipCheckoutSession: async (sessionData) => {
    const response = await axiosInstance.post(
      'stripe/payment/create-membership-checkout-session',
      sessionData
    )
    return response.data
  },

  getMembershipBillingSummary: async (locationId = null) => {
    const response = await axiosInstance.get(
      'stripe/payment/membership/billing-summary',
      {
        params: locationId ? { locationId } : {},
      }
    )
    return response.data
  },

  createMembershipSetupIntent: async (locationId) => {
    const response = await axiosInstance.post(
      'stripe/payment/membership/setup-intent',
      { locationId }
    )
    return response.data
  },

  createMembershipBillingPortalSession: async ({ locationId, returnUrl }) => {
    const response = await axiosInstance.post(
      'stripe/payment/membership/billing-portal',
      {
        locationId,
        returnUrl,
      }
    )
    return response.data
  },

  getMembershipPaymentMethods: async (locationId = null) => {
    const response = await axiosInstance.get(
      'stripe/payment/membership/payment-methods',
      {
        params: locationId ? { locationId } : {},
      }
    )
    return response.data
  },

  setMembershipDefaultPaymentMethod: async ({ locationId, paymentMethodId }) => {
    const response = await axiosInstance.post(
      'stripe/payment/membership/default-payment-method',
      {
        locationId,
        paymentMethodId,
      }
    )
    return response.data
  },

  removeMembershipPaymentMethod: async ({ locationId, paymentMethodId }) => {
    const response = await axiosInstance.post(
      'stripe/payment/membership/remove-payment-method',
      {
        locationId,
        paymentMethodId,
      }
    )
    return response.data
  },

  purchaseCredits: async ({ locationId, quantity }) => {
    const response = await axiosInstance.post(
      'stripe/payment/membership/credits/purchase',
      {
        locationId,
        quantity,
      }
    )
    return response.data
  },

  createCreditsCheckoutSession: async ({ locationId, quantity }) => {
    const response = await axiosInstance.post(
      'stripe/payment/membership/credits/checkout-session',
      {
        locationId,
        quantity,
      }
    )
    return response.data
  },

  createMembershipSubscription: async (payload) => {
    const response = await axiosInstance.post(
      'stripe/payment/membership/subscription',
      payload
    )
    return response.data
  },

  changeMembershipSubscriptionPlan: async (payload) => {
    const response = await axiosInstance.post(
      'stripe/payment/membership/subscription/change-plan',
      payload
    )
    return response.data
  },

  getMembershipInvoices: async (locationId = null) => {
    const response = await axiosInstance.get('stripe/payment/membership/invoices', {
      params: locationId ? { locationId } : {},
    })
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
