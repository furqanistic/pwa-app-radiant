// File: server/routes/referral.js - UPDATED
import express from 'express'
import {
  awardMilestoneReward,
  completeReferral,
  getAllReferrals,
  getReferralConfig,
  getReferralLeaderboard,
  getSpaReferralStats,
  getUserReferralStats,
  updateReferralConfig,
} from '../controller/referral.js'
import { checkPermission, verifyToken } from '../middleware/authMiddleware.js'

const router = express.Router()

// All routes require authentication
router.use(verifyToken)

// User routes
router.get('/my-stats', getUserReferralStats)
router.get('/leaderboard', getReferralLeaderboard)

// Spa owner routes (spa role)
router.get('/spa-stats', getSpaReferralStats) // NEW: Get spa-specific stats
router.get('/config', getReferralConfig) // Modified: Now works for spa owners too
router.put('/config', updateReferralConfig) // Modified: Now works for spa owners too

// Admin and Spa owner routes
router.get('/all', getAllReferrals) // Modified: Spa owners see only their spa's referrals
router.post('/complete/:referralId', completeReferral) // Modified: Spa owners can complete referrals for their spa

// Admin only routes
router.use(checkPermission) // Admin only from here
router.post('/award-milestone', awardMilestoneReward)

export default router
