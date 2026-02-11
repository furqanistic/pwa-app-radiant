// File: server/routes/userRewards.js - NEW: Routes for user rewards management
import express from 'express'
import {
  getSpaRedemptionQueue,
  getUserGameStats,
  getUserPointTransactions,
  getUserRewards,
  markRewardAsUsed,
} from '../controller/userRewards.js'
import {
  checkManagementAccess,
  restrictTo,
  verifyToken,
} from '../middleware/authMiddleware.js'

const router = express.Router()

// All routes require authentication
router.use(verifyToken)

// ===============================================
// USER ROUTES - for profile display
// ===============================================

// Get user's rewards (for profile display)
router.get('/my-rewards', restrictTo('user'), getUserRewards)

// Get user's point transaction history
router.get('/my-transactions', restrictTo('user'), getUserPointTransactions)

// Get user's game statistics for profile
router.get('/my-game-stats', restrictTo('user'), getUserGameStats)

// ===============================================
// SPA MANAGEMENT ROUTES
// ===============================================

// Get rewards that need redemption at spa (for spa owners)
router.get(
  '/spa/redemption-queue',
  checkManagementAccess,
  getSpaRedemptionQueue
)

// Mark a reward as used/redeemed (for spa owners)
router.patch(
  '/spa/:rewardId/mark-used',
  checkManagementAccess,
  markRewardAsUsed
)

// ===============================================
// ADMIN ROUTES - view any user's data
// ===============================================

// Get any user's rewards (admin/spa access)
router.get(
  '/user/:userId/rewards',
  checkManagementAccess,
  async (req, res, next) => {
    // Temporarily set req.user.id to the target user ID for the controller
    const originalUserId = req.user.id
    req.user.id = req.params.userId

    try {
      await getUserRewards(req, res, next)
    } finally {
      // Restore original user ID
      req.user.id = originalUserId
    }
  }
)

// Get any user's transactions (admin/spa access)
router.get(
  '/user/:userId/transactions',
  checkManagementAccess,
  async (req, res, next) => {
    const originalUserId = req.user.id
    req.user.id = req.params.userId

    try {
      await getUserPointTransactions(req, res, next)
    } finally {
      req.user.id = originalUserId
    }
  }
)

// Get any user's game stats (admin/spa access)
router.get(
  '/user/:userId/game-stats',
  checkManagementAccess,
  async (req, res, next) => {
    const originalUserId = req.user.id
    req.user.id = req.params.userId

    try {
      await getUserGameStats(req, res, next)
    } finally {
      req.user.id = originalUserId
    }
  }
)

export default router
