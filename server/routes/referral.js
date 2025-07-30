// File: server/routes/referral.js
import express from 'express'
import {
  awardMilestoneReward,
  completeReferral,
  getAllReferrals,
  getReferralConfig,
  getReferralLeaderboard,
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

// Admin routes
router.use(checkPermission) // Admin only from here

// Admin referral management
router.get('/all', getAllReferrals)
router.post('/complete/:referralId', completeReferral)
router.post('/award-milestone', awardMilestoneReward)

// Admin configuration management
router.get('/config', getReferralConfig)
router.put('/config', updateReferralConfig)

export default router
