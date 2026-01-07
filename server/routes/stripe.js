// File: server/routes/stripe.js - Stripe API Routes
import express from 'express';
import {
    confirmPayment,
    createAccountLink,
    createCheckoutSession,
    createConnectAccount,
    createPaymentIntent,
    disconnectAccount,
    getAccountDashboard,
    getAccountStatus,
    getClientRevenueAnalytics,
    getPaymentHistory,
    getRevenueAnalytics,
    handleWebhook,
    processRefund,
} from '../controller/stripeController.js';
import { checkManagementAccess, verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// ==================== STRIPE CONNECT ROUTES ====================

// Create Stripe Connect account (Team role only)
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

// Create payment intent (for customers)
router.post('/payment/create-intent', verifyToken, createPaymentIntent);

// Confirm payment
router.post('/payment/confirm', verifyToken, confirmPayment);

// Get payment history
router.get('/payment/history', verifyToken, getPaymentHistory);

// Get revenue analytics (Team role only)
router.get('/payment/analytics', verifyToken, checkManagementAccess, getRevenueAnalytics);

// Get client revenue tracking (Team role only)
router.get('/payment/clients-revenue', verifyToken, checkManagementAccess, getClientRevenueAnalytics);

// Process refund (Team role only)
router.post('/payment/refund/:paymentId', verifyToken, checkManagementAccess, processRefund);

// ==================== WEBHOOK ROUTE ====================

// Stripe webhook endpoint (NO AUTH - Stripe verification via signature)
// Note: Raw body parsing is handled in server/index.js
router.post('/webhook', handleWebhook);

export default router;
