// File: server/routes/rewards.js - ENHANCED WITH SPA OWNER MANAGEMENT
import express from 'express'
import {
  adjustUserPoints,
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
  // NEW: Spa owner management functions
  getSpaUserRewards,
  getUserRewards,
  giveManulaRewardToUser,
  linkRewardToServices,
  markRewardAsUsed,
  updateReward,
} from '../controller/rewards.js'
import {
  checkPermission,
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

// Get rewards catalog for users (with affordability info)
router.get('/catalog', validatePagination, getRewardsCatalog)

// Claim a reward
router.post('/claim/:rewardId', validateRewardClaim, claimReward)

// Get user's claimed rewards
router.get('/my-rewards', validatePagination, getUserRewards)

// Get user's point transaction history
router.get('/my-points/history', validatePagination, getPointHistory)

// SERVICE-INTEGRATION ROUTES (PUBLIC)
// Get rewards available for a specific service
router.get('/services/:serviceId/rewards', getServiceRewards)

// Get services that have rewards available
router.get('/services-with-rewards', validatePagination, getServicesWithRewards)

// Get single reward details (public view)
router.get('/:id', getReward)

// ===============================================
// SPA OWNER ROUTES (NEW - for team role users)
// ===============================================

// Apply permission checking for spa management
router.use(restrictTo('admin', 'team'))

// Get all user rewards at spa owner's location
router.get('/spa/user-rewards', validatePagination, getSpaUserRewards)

// Get pending rewards that need attention
router.get('/spa/pending-rewards', getPendingSpaRewards)

// Get spa reward analytics
router.get('/spa/analytics', getSpaRewardAnalytics)

// Mark a user's reward as used/redeemed
router.patch(
  '/spa/mark-used/:userRewardId',
  sanitizeRewardData,
  markRewardAsUsed
)

// Give manual reward to a user
router.post(
  '/spa/give-reward/:userId',
  sanitizeRewardData,
  giveManulaRewardToUser
)

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
// ADMIN/TEAM ROUTES (management)
// ===============================================

// Get all rewards for management
router.get('/', validatePagination, getRewards)

// Get reward statistics - MOVED BEFORE the wildcard route
router.get('/stats/overview', getRewardStats)

// Create new reward
router.post(
  '/',
  sanitizeRewardData,
  validateRewardData,
  checkRewardLocationAccess,
  createReward
)

// SERVICE-REWARD MANAGEMENT ROUTES
// Create a reward specifically for a service
router.post(
  '/services/:serviceId/create-reward',
  sanitizeRewardData,
  validateRewardData,
  checkRewardLocationAccess,
  createServiceReward
)

// Link existing reward to multiple services
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

// Delete reward (soft delete)
router.delete('/:id', deleteReward)

// Manually adjust user points (admin only)
router.post(
  '/admin/users/:userId/points',
  restrictTo('admin'),
  sanitizeRewardData,
  validatePointAdjustment,
  adjustUserPoints
)

export default router
