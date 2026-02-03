// File: server/middleware/authMiddleware.js - FIXED WITH ENHANCED ROLE PERMISSIONS
import jwt from 'jsonwebtoken'
import { createError } from '../error.js'
import User from '../models/User.js'

// Verify JWT token and attach user to request
export const verifyToken = async (req, res, next) => {
  try {
    let token

    // Check Authorization header first
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1]
    }
    // Fallback to cookies
    else if (req.cookies?.jwt) {
      token = req.cookies.jwt
    }

    if (!token) {
      return next(createError(401, 'Authentication required'))
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const currentUser = await User.findById(decoded.id)

    if (!currentUser || currentUser.isDeleted) {
      return next(createError(401, 'User account not found or deactivated'))
    }

    req.user = currentUser
    next()
  } catch (error) {
    console.error('Token verification error:', error)
    return next(createError(401, 'Invalid or expired token'))
  }
}

// ENHANCED: Role-based access control with better game management permissions
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        createError(403, 'You do not have permission to perform this action')
      )
    }
    next()
  }
}

// Super-admin only access
export const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'super-admin') {
    return next(createError(403, 'Super-Admin access required'))
  }
  next()
}

// Admin or Super-admin access
export const requireAdminOrAbove = (req, res, next) => {
  if (!['admin', 'super-admin'].includes(req.user.role)) {
    return next(createError(403, 'Admin or Super-Admin access required'))
  }
  next()
}

// ENHANCED: Management access - includes all roles that can manage games
export const checkManagementAccess = (req, res, next) => {
  if (!['admin', 'spa', 'super-admin', 'enterprise'].includes(req.user.role)) {
    return next(createError(403, 'Management access required'))
  }
  next()
}

// NEW: Game management access - specifically for game operations
export const checkGameManagementAccess = (req, res, next) => {
  // Allow admin, super-admin, and team roles to manage games
  if (!['admin', 'spa', 'super-admin'].includes(req.user.role)) {
    return next(
      createError(
        403,
        'Game management access required. Only spa owners (spa), admins, and super-admins can manage games.'
      )
    )
  }
  next()
}

// ENHANCED: Check if user can manage another user
export const canManageUser = async (req, res, next) => {
  try {
    const targetUserId = req.params.userId || req.params.id
    const currentUser = req.user

    // Super-admin can manage anyone except themselves
    if (currentUser.role === 'super-admin') {
      if (targetUserId === currentUser._id.toString()) {
        return next(createError(400, 'Cannot manage your own account'))
      }
      return next()
    }

    // Admin can manage users below admin level
    if (currentUser.role === 'admin') {
      const targetUser = await User.findById(targetUserId)
      if (!targetUser) {
        return next(createError(404, 'Target user not found'))
      }

      if (['super-admin', 'admin'].includes(targetUser.role)) {
        return next(
          createError(403, 'Cannot manage admin or super-admin users')
        )
      }

      if (targetUserId === currentUser._id.toString()) {
        return next(createError(400, 'Cannot manage your own account'))
      }

      return next()
    }

    // Spa users can only manage users in their spa
    if (currentUser.role === 'spa') {
      const targetUser = await User.findById(targetUserId)
      if (!targetUser) {
        return next(createError(404, 'Target user not found'))
      }

      // Check if target user is in the same spa
      if (
        targetUser.selectedLocation?.locationId !==
        currentUser.spaLocation?.locationId
      ) {
        return next(createError(403, 'Can only manage users in your spa'))
      }

      // Spa users can only manage regular users
      if (targetUser.role !== 'user') {
        return next(createError(403, 'Can only manage regular users'))
      }

      return next()
    }

    return next(createError(403, 'Insufficient permissions'))
  } catch (error) {
    next(error)
  }
}

// ENHANCED: Check if user can view user list with filters
export const canViewUsers = (req, res, next) => {
  const userRole = req.user.role

  // Super-admin can see all users
  if (userRole === 'super-admin') {
    return next()
  }

  // Admin can see all users except super-admins
  if (userRole === 'admin') {
    if (!req.query.role || req.query.role === 'all') {
      req.userFilters = { role: { $ne: 'super-admin' } }
    } else if (req.query.role === 'super-admin') {
      return next(createError(403, 'Cannot view super-admin users'))
    }
    return next()
  }

  // Spa users can only see users in their spa
  if (userRole === 'spa') {
    if (!req.user.spaLocation?.locationId) {
      return next(
        createError(400, 'Spa user must have spa location configured')
      )
    }

    req.userFilters = {
      'selectedLocation.locationId': req.user.spaLocation.locationId,
      role: 'user',
    }
    return next()
  }

  return next(createError(403, 'Access denied'))
}

// Role change permission checker
export const canChangeRoles = async (req, res, next) => {
  try {
    const { userId } = req.params
    const { newRole } = req.body
    const currentUser = req.user

    const targetUser = await User.findById(userId)
    if (!targetUser) {
      return next(createError(404, 'Target user not found'))
    }

    // Use the model method to check permissions
    if (!currentUser.canChangeUserRole(targetUser, newRole)) {
      return next(
        createError(
          403,
          "You do not have permission to change this user's role"
        )
      )
    }

    next()
  } catch (error) {
    next(error)
  }
}

// Check if user can perform bulk operations
export const canPerformBulkOperations = (req, res, next) => {
  if (!['admin', 'super-admin'].includes(req.user.role)) {
    return next(
      createError(
        403,
        'Admin or Super-Admin access required for bulk operations'
      )
    )
  }
  next()
}

// Audit log middleware for sensitive operations
export const auditLog = (action) => {
  return (req, res, next) => {
    req.auditInfo = {
      action,
      performedBy: req.user._id,
      performedAt: new Date(),
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
    }
    next()
  }
}

// ENHANCED: Permission checker with game management support
export const checkPermission = (requiredLevel = 'admin') => {
  return (req, res, next) => {
    const userRole = req.user.role

    // Define role hierarchy
    const roleHierarchy = {
      'super-admin': 5,
      admin: 4,
      spa: 3,
      enterprise: 2,
      user: 1,
    }

    const requiredPermissionLevel = roleHierarchy[requiredLevel] || 0
    const userPermissionLevel = roleHierarchy[userRole] || 0

    if (userPermissionLevel < requiredPermissionLevel) {
      return next(
        createError(
          403,
          `Access denied. ${requiredLevel} rights or higher required.`
        )
      )
    }

    next()
  }
}

// NEW: Check if user can access game management routes
export const checkGameAccess = async (req, res, next) => {
  try {
    const currentUser = req.user
    const gameId = req.params.gameId

    // Super-admin and admin can access any game
    if (['super-admin', 'admin'].includes(currentUser.role)) {
      return next()
    }

    // Spa users can only access games from their spa
    if (currentUser.role === 'spa') {
      if (!currentUser.spaLocation?.locationId) {
        return next(
          createError(400, 'Spa user must have spa location configured')
        )
      }

      // If gameId is provided, check if game belongs to their spa
      if (gameId) {
        const GameWheel = (await import('../models/GameWheel.js')).default
        const game = await GameWheel.findById(gameId)

        if (!game) {
          return next(createError(404, 'Game not found'))
        }

        if (game.locationId !== currentUser.spaLocation.locationId) {
          return next(
            createError(403, 'You can only access games from your spa')
          )
        }
      }

      return next()
    }

    // Regular users shouldn't access management routes
    return next(createError(403, 'Access denied'))
  } catch (error) {
    next(error)
  }
}

// NEW: Location-based access control for games
export const checkLocationAccess = (req, res, next) => {
  const currentUser = req.user

  // Admin and super-admin can access all locations
  if (['admin', 'super-admin'].includes(currentUser.role)) {
    return next()
  }

  // Spa users can only access their spa location
  if (currentUser.role === 'spa') {
    if (!currentUser.spaLocation?.locationId) {
      return next(
        createError(400, 'Spa user must have spa location configured')
      )
    }
    // Add location filter to request
    req.locationFilter = currentUser.spaLocation.locationId
    return next()
  }

  // Regular users can only access their selected location
  if (currentUser.role === 'user') {
    if (!currentUser.selectedLocation?.locationId) {
      return next(createError(400, 'Please select a spa location first'))
    }
    req.locationFilter = currentUser.selectedLocation.locationId
    return next()
  }

  return next(createError(403, 'Access denied'))
}

// NEW: Check if spa user has connected Stripe account
export const requireStripeConnection = async (req, res, next) => {
  try {
    const currentUser = req.user

    // Only check for spa users
    if (currentUser.role !== 'spa') {
      return next()
    }

    // Check if user has Stripe account connected
    if (!currentUser.stripe?.accountId) {
      return next(
        createError(
          403,
          'You must connect your Stripe account before creating services or rewards. Please go to Management > Stripe Connect to set up your payment account.'
        )
      )
    }

    // Check if Stripe account is fully set up and can accept payments
    if (!currentUser.stripe?.chargesEnabled) {
      return next(
        createError(
          403,
          'Your Stripe account is not fully set up yet. Please complete the onboarding process to start accepting payments.'
        )
      )
    }

    next()
  } catch (error) {
    next(error)
  }
}

