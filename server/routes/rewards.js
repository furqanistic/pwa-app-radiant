// File: server/routes/rewards.js
import express from 'express'
import {
  adjustUserPoints,
  claimReward,
  createReward,
  createServiceReward,
  deleteReward,
  getPointHistory,
  getReward,
  getRewards,
  getRewardsCatalog,
  getRewardStats,
  getServiceRewards,
  getServicesWithRewards,
  getUserRewards,
  linkRewardToServices,
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

// ✅ NEW SERVICE-INTEGRATION ROUTES (PUBLIC)
// Get rewards available for a specific service
router.get('/services/:serviceId/rewards', getServiceRewards)

// Get services that have rewards available
router.get('/services-with-rewards', validatePagination, getServicesWithRewards)

// Get single reward details (public view)
router.get('/:id', getReward)

// ===============================================
// ADMIN/TEAM ROUTES (management)
// ===============================================

// Apply permission checking middleware for management operations
router.use(restrictTo('admin', 'team'))

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

// ✅ NEW SERVICE-REWARD MANAGEMENT ROUTES
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

// ===============================================
// ADMIN-ONLY ROUTES
// ===============================================

// Manually adjust user points (admin only)
router.post(
  '/admin/users/:userId/points',
  restrictTo('admin'),
  sanitizeRewardData,
  validatePointAdjustment,
  adjustUserPoints
)

export default router
