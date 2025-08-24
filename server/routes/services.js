// File: server/routes/services.js
import express from 'express'
import {
  createServiceReward,
  getServiceRewards,
  linkRewardToServices,
} from '../controller/rewards.js'
import {
  createCategory,
  createService,
  deleteCategory,
  deleteService,
  getAvailableAddOnServices,
  getCategories,
  getService,
  getServices,
  getServiceStats,
  getServiceWithLinkedServices,
  linkServicesToService,
  unlinkServiceFromService,
  updateCategory,
  updateService,
} from '../controller/services.js'
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

// Get all services with filtering and search
router.get('/', getServices)

// Get single service by ID
router.get('/:id', getService)

// Get rewards available for a specific service
router.get('/:serviceId/rewards', getServiceRewards)

// Get available services for linking as add-ons
router.get('/:id/available-addons', getAvailableAddOnServices)

// Get service with linked services details
router.get('/:id/with-linked-services', getServiceWithLinkedServices)

// Get all categories
router.get('/categories/all', getCategories)

// Get service statistics and analytics
router.get('/stats/overview', getServiceStats)

// Apply admin/team permission checking for management routes
router.use(restrictTo('admin', 'team'))

// Create new service
router.post(
  '/',
  sanitizeServiceData,
  validateServiceData,
  checkLocationAccess,
  createService
)

// Update existing service
router.put(
  '/:id',
  sanitizeServiceData,
  validateServiceData,
  checkLocationAccess,
  updateService
)

// Delete service (soft delete)
router.delete('/:id', deleteService)

// Link multiple services as add-ons to a service
router.post('/:id/link-services', linkServicesToService)

// Unlink a service from add-ons
router.delete('/:id/unlink/:linkedServiceId', unlinkServiceFromService)

// Create a reward specifically for a service
router.post(
  '/:serviceId/rewards',
  sanitizeRewardData,
  validateRewardData,
  checkRewardLocationAccess,
  createServiceReward
)

// Link existing reward to a service
router.post(
  '/:serviceId/link-reward/:rewardId',
  sanitizeRewardData,
  (req, res, next) => {
    req.body.serviceIds = [req.params.serviceId]
    req.params.rewardId = req.params.rewardId
    next()
  },
  linkRewardToServices
)

// Create new category
router.post(
  '/categories',
  validateCategoryData,
  checkLocationAccess,
  createCategory
)

// Update existing category
router.put(
  '/categories/:id',
  validateCategoryData,
  checkLocationAccess,
  updateCategory
)

// Delete category (soft delete)
router.delete('/categories/:id', deleteCategory)

export default router
