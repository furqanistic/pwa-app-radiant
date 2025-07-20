// server/middleware/serviceValidation.js
import { createError } from '../error.js'
import Category from '../models/Category.js'

// Validation middleware for service creation/update
export const validateServiceData = async (req, res, next) => {
  try {
    const {
      name,
      description,
      categoryId,
      basePrice,
      duration,
      limit,
      discount,
      subTreatments,
    } = req.body

    const errors = []

    // Required field validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      errors.push('Service name is required and must be a non-empty string')
    }

    if (
      !description ||
      typeof description !== 'string' ||
      description.trim().length === 0
    ) {
      errors.push(
        'Service description is required and must be a non-empty string'
      )
    }

    if (!categoryId) {
      errors.push('Category ID is required')
    }

    // Numeric field validation
    if (basePrice === undefined || basePrice === null) {
      errors.push('Base price is required')
    } else {
      const price = parseFloat(basePrice)
      if (isNaN(price) || price < 0) {
        errors.push('Base price must be a valid positive number')
      }
    }

    if (duration === undefined || duration === null) {
      errors.push('Duration is required')
    } else {
      const dur = parseInt(duration)
      if (isNaN(dur) || dur < 1) {
        errors.push('Duration must be a valid positive integer (minutes)')
      }
    }

    if (limit !== undefined && limit !== null) {
      const lim = parseInt(limit)
      if (isNaN(lim) || lim < 1) {
        errors.push('Limit must be a valid positive integer')
      }
    }

    // Discount validation
    if (discount && typeof discount === 'object') {
      if (discount.percentage !== undefined) {
        const pct = parseFloat(discount.percentage)
        if (isNaN(pct) || pct < 0 || pct > 100) {
          errors.push('Discount percentage must be between 0 and 100')
        }
      }

      if (discount.active && discount.startDate && discount.endDate) {
        const startDate = new Date(discount.startDate)
        const endDate = new Date(discount.endDate)

        if (isNaN(startDate.getTime())) {
          errors.push('Discount start date must be a valid date')
        }

        if (isNaN(endDate.getTime())) {
          errors.push('Discount end date must be a valid date')
        }

        if (startDate.getTime() >= endDate.getTime()) {
          errors.push('Discount end date must be after start date')
        }
      }
    }

    // Sub-treatments validation
    if (subTreatments && Array.isArray(subTreatments)) {
      subTreatments.forEach((treatment, index) => {
        if (!treatment.name || typeof treatment.name !== 'string') {
          errors.push(`Sub-treatment ${index + 1}: Name is required`)
        }

        if (treatment.price === undefined || treatment.price === null) {
          errors.push(`Sub-treatment ${index + 1}: Price is required`)
        } else {
          const price = parseFloat(treatment.price)
          if (isNaN(price) || price < 0) {
            errors.push(
              `Sub-treatment ${
                index + 1
              }: Price must be a valid positive number`
            )
          }
        }

        if (treatment.duration === undefined || treatment.duration === null) {
          errors.push(`Sub-treatment ${index + 1}: Duration is required`)
        } else {
          const dur = parseInt(treatment.duration)
          if (isNaN(dur) || dur < 1) {
            errors.push(
              `Sub-treatment ${
                index + 1
              }: Duration must be a valid positive integer`
            )
          }
        }

        if (
          !treatment.description ||
          typeof treatment.description !== 'string'
        ) {
          errors.push(`Sub-treatment ${index + 1}: Description is required`)
        }
      })
    }

    // If there are validation errors, return them
    if (errors.length > 0) {
      return next(createError(400, `Validation failed: ${errors.join(', ')}`))
    }

    // Validate category exists (if categoryId provided)
    if (categoryId) {
      const category = await Category.findById(categoryId)
      if (!category || category.isDeleted || !category.isActive) {
        return next(createError(404, 'Selected category not found or inactive'))
      }
    }

    next()
  } catch (error) {
    console.error('Error in service validation:', error)
    next(createError(500, 'Validation error occurred'))
  }
}

// Validation middleware for category creation/update
export const validateCategoryData = (req, res, next) => {
  try {
    const { name, description, color, order } = req.body

    const errors = []

    // Required field validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      errors.push('Category name is required and must be a non-empty string')
    }

    if (name && name.length > 50) {
      errors.push('Category name must be 50 characters or less')
    }

    // Optional field validation
    if (description && typeof description !== 'string') {
      errors.push('Description must be a string')
    }

    if (description && description.length > 200) {
      errors.push('Description must be 200 characters or less')
    }

    if (color && typeof color !== 'string') {
      errors.push('Color must be a string')
    }

    if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
      errors.push('Color must be a valid hex color code (e.g., #3B82F6)')
    }

    if (order !== undefined && order !== null) {
      const orderNum = parseInt(order)
      if (isNaN(orderNum)) {
        errors.push('Order must be a valid integer')
      }
    }

    // If there are validation errors, return them
    if (errors.length > 0) {
      return next(createError(400, `Validation failed: ${errors.join(', ')}`))
    }

    next()
  } catch (error) {
    console.error('Error in category validation:', error)
    next(createError(500, 'Validation error occurred'))
  }
}

// Middleware to sanitize service data
export const sanitizeServiceData = (req, res, next) => {
  try {
    if (req.body.name) {
      req.body.name = req.body.name.trim()
    }

    if (req.body.description) {
      req.body.description = req.body.description.trim()
    }

    if (req.body.basePrice) {
      req.body.basePrice = parseFloat(req.body.basePrice)
    }

    if (req.body.duration) {
      req.body.duration = parseInt(req.body.duration)
    }

    if (req.body.limit) {
      req.body.limit = parseInt(req.body.limit)
    }

    // Sanitize sub-treatments
    if (req.body.subTreatments && Array.isArray(req.body.subTreatments)) {
      req.body.subTreatments = req.body.subTreatments.map((treatment) => ({
        ...treatment,
        name: treatment.name ? treatment.name.trim() : '',
        description: treatment.description ? treatment.description.trim() : '',
        price: treatment.price ? parseFloat(treatment.price) : 0,
        duration: treatment.duration ? parseInt(treatment.duration) : 0,
      }))
    }

    next()
  } catch (error) {
    console.error('Error sanitizing service data:', error)
    next(createError(500, 'Data sanitization error'))
  }
}

// Middleware to check if user can manage services in this location
export const checkLocationAccess = async (req, res, next) => {
  try {
    const { locationId } = req.body
    const userRole = req.user.role
    const userLocationId = req.user.selectedLocation?.locationId

    // Admins can manage all services
    if (userRole === 'admin') {
      return next()
    }

    // Team members can only manage services in their assigned location
    if (userRole === 'team') {
      if (!userLocationId) {
        return next(
          createError(
            403,
            'Team members must be assigned to a location to manage services'
          )
        )
      }

      // If locationId is provided in request, it must match user's location
      if (locationId && locationId !== userLocationId) {
        return next(
          createError(
            403,
            'You can only manage services for your assigned location'
          )
        )
      }

      return next()
    }

    // Regular users cannot manage services
    return next(
      createError(403, 'Access denied. Admin or team rights required.')
    )
  } catch (error) {
    console.error('Error checking location access:', error)
    next(createError(500, 'Access check error'))
  }
}
