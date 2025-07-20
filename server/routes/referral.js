// server/routes/referral.js
import express from 'express'
import {
  getAllReferrals,
  getReferralAnalytics,
  getReferralHistory,
  getReferralStats,
  updateReferralStatus,
  validateReferralCode,
} from '../controller/referral.js'
import { restrictTo, verifyToken } from '../middleware/authMiddleware.js'

const router = express.Router()

// Public route for validating referral codes
router.get('/validate/:code', validateReferralCode)

// Protected routes
router.use(verifyToken)

// User referral routes
router.get('/stats', getReferralStats)
router.get('/history', getReferralHistory)
router.put('/:referralId/status', updateReferralStatus)

// Admin only routes
router.get('/admin/all', restrictTo('admin'), getAllReferrals)
router.get('/admin/analytics', restrictTo('admin'), getReferralAnalytics)

export default router
