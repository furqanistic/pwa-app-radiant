// File: server/routes/rewards.js - ENHANCED ROUTES

import express from 'express'
import {
  adjustUserPoints,
  awardGoogleReviewPoints,
  bulkGiveRewards,
  claimReward,
  createReward,
  createServiceReward,
  deleteReward,
  getPendingSpaRewards,
  getPointHistory,
  getReward,
  getRewards,
  getRewardsCatalog,
  getRewardStats,
  getServiceRewards,
  getServicesWithRewards,
  getSpaRewardAnalytics,
  getSpaUserRewards,
  getUserManualRewards,
  getUserRewards,
  giveManualRewardToUser,
  linkRewardToServices,
  markRewardAsUsed,
  // NEW IMPORTS
  searchUsersForReward,
  updateReward,
} from '../controller/rewards.js'
import {
  checkPermission,
  requireStripeConnection,
  restrictTo,
  verifyToken,
} from '../middleware/authMiddleware.js'
import {
  checkRewardLocationAccess,
  sanitizeRewardData,
  validatePagination,
  validatePointAdjustment,
  validateRewardClaim,
  validateRewardData,
} from '../middleware/rewardValidation.js'

const router = express.Router()

// All routes require authentication
router.use(verifyToken)

// ===============================================
// PUBLIC ROUTES (all authenticated users)
// ===============================================

// Get rewards catalog for users
router.get('/catalog', validatePagination, getRewardsCatalog)

// Claim a reward
router.post('/claim/:rewardId', validateRewardClaim, claimReward)

// Get user's claimed rewards
router.get('/my-rewards', validatePagination, getUserRewards)

// NEW: Get user's manual rewards
router.get('/my-rewards/manual', validatePagination, getUserManualRewards)

// Get user's point transaction history
router.get('/my-points/history', validatePagination, getPointHistory)

// One-time Google review reward
router.post('/google-review', restrictTo('user'), awardGoogleReviewPoints)

// SERVICE-INTEGRATION ROUTES
router.get('/services/:serviceId/rewards', getServiceRewards)
router.get('/services-with-rewards', validatePagination, getServicesWithRewards)

// Get single reward details
router.get('/:id', getReward)

// ===============================================
// SPA OWNER/ADMIN ROUTES
// ===============================================

// Apply permission checking for spa management
router.use(restrictTo('admin', 'spa'))

// NEW: Search users for reward giving
router.get('/users/search', searchUsersForReward)

// Get all user rewards at spa owner's location
router.get('/spa/user-rewards', validatePagination, getSpaUserRewards)

// Get pending rewards
router.get('/spa/pending-rewards', getPendingSpaRewards)

// Get spa reward analytics
router.get('/spa/analytics', getSpaRewardAnalytics)

// Mark reward as used
router.patch(
  '/spa/mark-used/:userRewardId',
  sanitizeRewardData,
  markRewardAsUsed
)

// ENHANCED: Give manual reward (now uses email instead of userId)
router.post(
  '/spa/give-reward/email/:email',
  sanitizeRewardData,
  giveManualRewardToUser
)

// NEW: Bulk give rewards
router.post('/spa/give-rewards/bulk', sanitizeRewardData, bulkGiveRewards)

// Admin can get spa rewards for any location
router.get(
  '/spa/:locationId/user-rewards',
  restrictTo('admin'),
  validatePagination,
  getSpaUserRewards
)

router.get(
  '/spa/:locationId/analytics',
  restrictTo('admin'),
  getSpaRewardAnalytics
)

// ===============================================
// ADMIN/spa MANAGEMENT ROUTES
// ===============================================

// Get all rewards for management
router.get('/', validatePagination, getRewards)

// Get reward statistics
router.get('/stats/overview', getRewardStats)

// Create new reward
router.post(
  '/',
  requireStripeConnection,
  sanitizeRewardData,
  validateRewardData,
  checkRewardLocationAccess,
  createReward
)

// Create service-specific reward
router.post(
  '/services/:serviceId/create-reward',
  requireStripeConnection,
  sanitizeRewardData,
  validateRewardData,
  checkRewardLocationAccess,
  createServiceReward
)

// Link reward to services
router.post(
  '/:rewardId/link-services',
  sanitizeRewardData,
  linkRewardToServices
)

// Update existing reward
router.put(
  '/:id',
  sanitizeRewardData,
  validateRewardData,
  checkRewardLocationAccess,
  updateReward
)

// Delete reward
router.delete('/:id', deleteReward)

// Admin only: Adjust user points
router.post(
  '/admin/users/:userId/points',
  restrictTo('admin'),
  sanitizeRewardData,
  validatePointAdjustment,
  adjustUserPoints
)

export default router
