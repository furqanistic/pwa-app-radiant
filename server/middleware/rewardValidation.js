// server/middleware/rewardValidation.js - Enhanced with Service Integration
import mongoose from 'mongoose'
import { createError } from '../error.js'
import Category from '../models/Category.js'
import Service from '../models/Service.js'

// Validate reward claim request
export const validateRewardClaim = (req, res, next) => {
  try {
    const { rewardId } = req.params

    // Check if rewardId is provided
    if (!rewardId) {
      return next(createError(400, 'Reward ID is required'))
    }

    // Check if rewardId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(rewardId)) {
      return next(createError(400, 'Invalid reward ID format'))
    }

    // Check if user exists
    if (!req.user || !req.user.id) {
      return next(createError(401, 'User authentication required'))
    }

    next()
  } catch (error) {
    console.error('Reward claim validation error:', error)
    next(createError(500, 'Validation error'))
  }
}

// Validate pagination parameters
export const validatePagination = (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query

    // Convert to numbers and validate
    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)

    if (isNaN(pageNum) || pageNum < 1) {
      return next(createError(400, 'Invalid page number'))
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return next(createError(400, 'Invalid limit (must be 1-100)'))
    }

    // Add validated values to request
    req.query.page = pageNum
    req.query.limit = limitNum

    next()
  } catch (error) {
    console.error('Pagination validation error:', error)
    next(createError(500, 'Validation error'))
  }
}

// Sanitize reward data
export const sanitizeRewardData = (req, res, next) => {
  try {
    if (req.body.name) {
      req.body.name = req.body.name.trim()
    }
    if (req.body.description) {
      req.body.description = req.body.description.trim()
    }
    if (req.body.reason) {
      req.body.reason = req.body.reason.trim()
    }

    // ✅ SANITIZE SERVICE-RELATED FIELDS
    if (req.body.serviceIds && Array.isArray(req.body.serviceIds)) {
      req.body.serviceIds = req.body.serviceIds.filter((id) =>
        mongoose.Types.ObjectId.isValid(id)
      )
    }

    if (req.body.excludeServices && Array.isArray(req.body.excludeServices)) {
      req.body.excludeServices = req.body.excludeServices.filter((id) =>
        mongoose.Types.ObjectId.isValid(id)
      )
    }

    if (req.body.includeServices && Array.isArray(req.body.includeServices)) {
      req.body.includeServices = req.body.includeServices.filter((id) =>
        mongoose.Types.ObjectId.isValid(id)
      )
    }

    next()
  } catch (error) {
    console.error('Data sanitization error:', error)
    next(createError(500, 'Data processing error'))
  }
}

// ✅ ENHANCED: Validate reward creation/update data with service integration
export const validateRewardData = async (req, res, next) => {
  try {
    const {
      name,
      description,
      type,
      pointCost,
      value,
      serviceId,
      serviceIds,
      categoryId,
      appliesToCategory,
      excludeServices,
      includeServices,
    } = req.body

    // For creation, check required fields
    if (req.method === 'POST') {
      if (!name || name.trim().length === 0) {
        return next(createError(400, 'Reward name is required'))
      }
      if (!description || description.trim().length === 0) {
        return next(createError(400, 'Reward description is required'))
      }
      if (!type) {
        return next(createError(400, 'Reward type is required'))
      }
      if (!pointCost || pointCost <= 0) {
        return next(createError(400, 'Valid point cost is required'))
      }
    }

    // Validate types
    const validTypes = [
      'credit',
      'discount',
      'service',
      'combo',
      'referral',
      'service_discount',
      'free_service',
    ]
    if (type && !validTypes.includes(type)) {
      return next(createError(400, 'Invalid reward type'))
    }

    // Validate value for non-service rewards
    if (
      type &&
      !['service', 'free_service'].includes(type) &&
      value !== undefined &&
      value < 0
    ) {
      return next(createError(400, 'Reward value cannot be negative'))
    }

    // ✅ VALIDATE SERVICE-SPECIFIC FIELDS
    // If serviceId is provided, validate it exists
    if (serviceId) {
      if (!mongoose.Types.ObjectId.isValid(serviceId)) {
        return next(createError(400, 'Invalid service ID format'))
      }

      const service = await Service.findById(serviceId)
      if (!service || service.isDeleted || service.status !== 'active') {
        return next(createError(404, 'Service not found or inactive'))
      }

      // Auto-set categoryId if not provided
      if (!categoryId) {
        req.body.categoryId = service.categoryId
      }
    }

    // If serviceIds array is provided, validate all services exist
    if (serviceIds && Array.isArray(serviceIds) && serviceIds.length > 0) {
      for (const id of serviceIds) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return next(createError(400, `Invalid service ID format: ${id}`))
        }
      }

      const services = await Service.find({
        _id: { $in: serviceIds },
        isDeleted: false,
        status: 'active',
      })

      if (services.length !== serviceIds.length) {
        return next(
          createError(400, 'One or more services not found or inactive')
        )
      }
    }

    // If categoryId is provided, validate it exists
    if (categoryId) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return next(createError(400, 'Invalid category ID format'))
      }

      const category = await Category.findById(categoryId)
      if (!category || category.isDeleted || !category.isActive) {
        return next(createError(404, 'Category not found or inactive'))
      }
    }

    // Validate service list fields
    const validateServiceList = async (serviceList, fieldName) => {
      if (serviceList && Array.isArray(serviceList) && serviceList.length > 0) {
        for (const id of serviceList) {
          if (!mongoose.Types.ObjectId.isValid(id)) {
            return next(
              createError(400, `Invalid service ID in ${fieldName}: ${id}`)
            )
          }
        }

        const services = await Service.find({
          _id: { $in: serviceList },
          isDeleted: false,
        })

        if (services.length !== serviceList.length) {
          return next(
            createError(400, `One or more services in ${fieldName} not found`)
          )
        }
      }
    }

    // Validate exclude and include service lists
    if (excludeServices) {
      await validateServiceList(excludeServices, 'excludeServices')
    }

    if (includeServices) {
      await validateServiceList(includeServices, 'includeServices')
    }

    // ✅ BUSINESS LOGIC VALIDATION
    // Check for conflicting service specifications
    if (serviceId && serviceIds && serviceIds.length > 0) {
      return next(
        createError(400, 'Cannot specify both serviceId and serviceIds')
      )
    }

    if (includeServices && excludeServices) {
      const intersection = includeServices.filter((id) =>
        excludeServices.includes(id)
      )
      if (intersection.length > 0) {
        return next(
          createError(400, 'Service cannot be both included and excluded')
        )
      }
    }

    // Validate service-specific reward types
    if (['service_discount', 'free_service'].includes(type)) {
      if (!serviceId && (!serviceIds || serviceIds.length === 0)) {
        return next(createError(400, `${type} rewards must specify a service`))
      }
    }

    next()
  } catch (error) {
    console.error('Reward data validation error:', error)
    next(createError(500, 'Validation error'))
  }
}

// Check reward location access
export const checkRewardLocationAccess = (req, res, next) => {
  try {
    const { locationId } = req.body
    const userRole = req.user.role
    const userLocationId = req.user.selectedLocation?.locationId

    // Admins can manage all rewards
    if (userRole === 'admin') {
      return next()
    }

    // Team members can only manage rewards in their assigned location
    if (userRole === 'team') {
      if (!userLocationId) {
        return next(
          createError(
            403,
            'Team members must be assigned to a location to manage rewards'
          )
        )
      }

      // If locationId is provided in request, it must match user's location
      if (locationId && locationId !== userLocationId) {
        return next(
          createError(
            403,
            'You can only manage rewards for your assigned location'
          )
        )
      }

      return next()
    }

    // Regular users cannot manage rewards
    return next(
      createError(403, 'Access denied. Admin or team rights required.')
    )
  } catch (error) {
    console.error('Location access check error:', error)
    next(createError(500, 'Access check error'))
  }
}

// Validate point adjustment data
export const validatePointAdjustment = (req, res, next) => {
  try {
    const { type, amount, reason } = req.body

    if (!type || !['add', 'remove', 'set'].includes(type)) {
      return next(createError(400, 'Invalid adjustment type'))
    }

    if (!amount || amount < 0) {
      return next(createError(400, 'Valid amount is required'))
    }

    if (!reason || reason.trim().length === 0) {
      return next(createError(400, 'Reason is required'))
    }

    next()
  } catch (error) {
    console.error('Point adjustment validation error:', error)
    next(createError(500, 'Validation error'))
  }
}

// ✅ NEW: Validate service-reward linking
export const validateServiceRewardLink = async (req, res, next) => {
  try {
    const { serviceIds, replaceExisting = false } = req.body
    const { rewardId } = req.params

    // Validate reward exists
    if (!mongoose.Types.ObjectId.isValid(rewardId)) {
      return next(createError(400, 'Invalid reward ID format'))
    }

    // Validate serviceIds array
    if (!serviceIds || !Array.isArray(serviceIds) || serviceIds.length === 0) {
      return next(createError(400, 'Service IDs array is required'))
    }

    // Validate each service ID
    for (const serviceId of serviceIds) {
      if (!mongoose.Types.ObjectId.isValid(serviceId)) {
        return next(createError(400, `Invalid service ID format: ${serviceId}`))
      }
    }

    // Validate services exist and are active
    const services = await Service.find({
      _id: { $in: serviceIds },
      isDeleted: false,
      status: 'active',
    })

    if (services.length !== serviceIds.length) {
      return next(
        createError(400, 'One or more services not found or inactive')
      )
    }

    // Add services to request for use in controller
    req.validatedServices = services

    next()
  } catch (error) {
    console.error('Service-reward link validation error:', error)
    next(createError(500, 'Validation error'))
  }
}
