// File: server/middleware/authMiddleware.js - OPTIMIZED
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

// Role-based access control
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

// Management access (admin, team, super-admin)
export const checkManagementAccess = (req, res, next) => {
  if (!['admin', 'team', 'super-admin'].includes(req.user.role)) {
    return next(createError(403, 'Management access required'))
  }
  next()
}

// Check if user can manage another user
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

    // Team users can only manage users in their spa
    if (currentUser.role === 'team') {
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

      // Team users can only manage regular users
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

// Check if user can view user list with filters
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

  // Team users can only see users in their spa
  if (userRole === 'team') {
    if (!req.user.spaLocation?.locationId) {
      return next(
        createError(400, 'Team user must have spa location configured')
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

// Add the missing checkPermission export for backward compatibility
export const checkPermission = (requiredLevel = 'admin') => {
  return (req, res, next) => {
    const userRole = req.user.role

    // Define role hierarchy
    const roleHierarchy = {
      'super-admin': 5,
      admin: 4,
      team: 3,
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
