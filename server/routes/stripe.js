// File: server/routes/stripe.js - Stripe API Routes
import express from 'express';
import {
    confirmPayment,
    createAccountLink,
    createCheckoutSession,
    createMembershipSetupIntent,
    createMembershipBillingPortalSession,
    createMembershipCheckoutSession,
    createCreditsCheckoutSession,
    purchaseCredits,
    createMembershipSubscription,
    createConnectAccount,
    createPaymentIntent,
    changeMembershipSubscriptionPlan,
    disconnectAccount,
    getAccountDashboard,
    getAccountStatus,
    getClientRevenueAnalytics,
    getMembershipBillingSummary,
    getMembershipInvoices,
    getMembershipPaymentMethods,
    getPaymentHistory,
    getRevenueAnalytics,
    handleWebhook,
    processRefund,
    removeMembershipPaymentMethod,
    setMembershipDefaultPaymentMethod,
} from '../controller/stripeController.js';
import { checkManagementAccess, verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// ==================== STRIPE CONNECT ROUTES ====================

// Create Stripe Connect account (spa role only)
router.post('/connect/create', verifyToken, checkManagementAccess, createConnectAccount);

// Create account link for onboarding
router.post('/connect/account-link', verifyToken, checkManagementAccess, createAccountLink);

// Get account status
router.get('/connect/status', verifyToken, getAccountStatus);

// Disconnect Stripe account
router.delete('/connect/disconnect', verifyToken, checkManagementAccess, disconnectAccount);

// Get Stripe dashboard link
router.get('/connect/dashboard', verifyToken, checkManagementAccess, getAccountDashboard);

// ==================== PAYMENT ROUTES ====================

// Create checkout session (for service booking with redirect)
router.post('/payment/create-checkout-session', verifyToken, createCheckoutSession);
// Backward-compatible alias for older frontend clients
router.post('/create-checkout-session', verifyToken, createCheckoutSession);
router.post(
  '/payment/create-membership-checkout-session',
  verifyToken,
  createMembershipCheckoutSession
);
router.get('/payment/membership/billing-summary', verifyToken, getMembershipBillingSummary);
router.post('/payment/membership/setup-intent', verifyToken, createMembershipSetupIntent);
router.post(
  '/payment/membership/billing-portal',
  verifyToken,
  createMembershipBillingPortalSession
);
router.get('/payment/membership/payment-methods', verifyToken, getMembershipPaymentMethods);
router.post(
  '/payment/membership/default-payment-method',
  verifyToken,
  setMembershipDefaultPaymentMethod
);
router.post(
  '/payment/membership/remove-payment-method',
  verifyToken,
  removeMembershipPaymentMethod
);
router.post('/payment/membership/credits/purchase', verifyToken, purchaseCredits);
router.post(
  '/payment/membership/credits/checkout-session',
  verifyToken,
  createCreditsCheckoutSession
);
router.post('/payment/membership/subscription', verifyToken, createMembershipSubscription);
router.post(
  '/payment/membership/subscription/change-plan',
  verifyToken,
  changeMembershipSubscriptionPlan
);
router.get('/payment/membership/invoices', verifyToken, getMembershipInvoices);

// Create payment intent (for customers)
router.post('/payment/create-intent', verifyToken, createPaymentIntent);

// Confirm payment
router.post('/payment/confirm', verifyToken, confirmPayment);

// Get payment history
router.get('/payment/history', verifyToken, getPaymentHistory);

// Get revenue analytics (spa role only)
router.get('/payment/analytics', verifyToken, checkManagementAccess, getRevenueAnalytics);

// Get client revenue tracking (spa role only)
router.get('/payment/clients-revenue', verifyToken, checkManagementAccess, getClientRevenueAnalytics);

// Process refund (spa role only)
router.post('/payment/refund/:paymentId', verifyToken, checkManagementAccess, processRefund);

// ==================== WEBHOOK ROUTE ====================

// Stripe webhook endpoint (NO AUTH - Stripe verification via signature)
// Note: Raw body parsing is handled in server/index.js
router.post('/webhook', handleWebhook);

export default router;
