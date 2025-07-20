// server/routes/services.js - Enhanced with Reward Integration
import express from 'express'
import {
  createCategory,
  createService,
  deleteCategory,
  deleteService,
  getCategories,
  getService,
  getServices,
  getServiceStats,
  updateCategory,
  updateService,
} from '../controller/services.js'
// ✅ IMPORT REWARD-RELATED CONTROLLERS
import {
  createServiceReward,
  getServiceRewards,
  linkRewardToServices,
} from '../controller/rewards.js'
import {
  checkPermission,
  restrictTo,
  verifyToken,
} from '../middleware/authMiddleware.js'
import {
  checkRewardLocationAccess,
  sanitizeRewardData,
  validateRewardData,
} from '../middleware/rewardValidation.js'
import {
  checkLocationAccess,
  sanitizeServiceData,
  validateCategoryData,
  validateServiceData,
} from '../middleware/serviceValidation.js'

const router = express.Router()

// All routes require authentication
router.use(verifyToken)

// ===============================================
// PUBLIC ROUTES (all authenticated users can access)
// ===============================================

// Get all services with filtering and search
router.get('/', getServices)

// Get single service
router.get('/:id', getService)

// ✅ NEW: Get rewards available for a specific service
router.get('/:serviceId/rewards', getServiceRewards)

// Get all categories
router.get('/categories/all', getCategories)

// Get service statistics
router.get('/stats/overview', getServiceStats)

// ===============================================
// ADMIN/TEAM ROUTES (management)
// ===============================================

// Apply permission checking middleware for write operations
router.use(restrictTo('admin', 'team'))

// Service management routes
router.post(
  '/',
  sanitizeServiceData,
  validateServiceData,
  checkLocationAccess,
  createService
)

router.put(
  '/:id',
  sanitizeServiceData,
  validateServiceData,
  checkLocationAccess,
  updateService
)

router.delete('/:id', deleteService)

// ✅ NEW SERVICE-REWARD MANAGEMENT ROUTES
// Create a reward specifically for a service
router.post(
  '/:serviceId/rewards',
  sanitizeRewardData,
  validateRewardData,
  checkRewardLocationAccess,
  createServiceReward
)

// Link existing reward to this service
router.post(
  '/:serviceId/link-reward/:rewardId',
  sanitizeRewardData,
  (req, res, next) => {
    // Add serviceId to body for linkRewardToServices function
    req.body.serviceIds = [req.params.serviceId]
    req.params.rewardId = req.params.rewardId
    next()
  },
  linkRewardToServices
)

// Category management routes
router.post(
  '/categories',
  validateCategoryData,
  checkLocationAccess,
  createCategory
)

router.put(
  '/categories/:id',
  validateCategoryData,
  checkLocationAccess,
  updateCategory
)

router.delete('/categories/:id', deleteCategory)

export default router
