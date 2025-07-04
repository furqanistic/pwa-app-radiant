import jwt from 'jsonwebtoken'
import { createError } from '../error.js'
import User from '../models/User.js'

export const verifyToken = async (req, res, next) => {
  try {
    let token
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1]
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt
    }

    if (!token) {
      return next(createError(401, 'You are not logged in'))
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const currentUser = await User.findById(decoded.id)

    if (!currentUser) {
      return next(createError(401, 'User no longer exists'))
    }

    req.user = currentUser
    next()
  } catch (err) {
    next(createError(401, 'Invalid token'))
  }
}

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

export const checkPermission = (req, res, next) => {
  // Get the requested resource and action from the route
  const path = req.path
  const method = req.method

  // Define permission rules based on role
  const permissionRules = {
    Marketing: {
      all: true,
    },
    Logística: {
      canViewEvents: true,
      canExtendEvents: true,
      canViewNews: true,
      canViewDashboard: true,
    },
    Comercial: {
      canCreateEvents: true,
      canDeleteOwnEvents: true,
      canViewOwnEvents: true,
      canAccessRoomReservation: true,
      canAccessMerchandising: true,
      canViewNews: true,
      canViewDashboard: true,
    },
  }

  // Check if user has required permissions
  const userRole = req.user.role
  const permissions = permissionRules[userRole]

  if (!permissions) {
    return next(createError(403, 'Invalid role'))
  }

  // Marketing users have full access
  if (userRole === 'Marketing' || permissions.all) {
    return next()
  }

  // For other roles, check specific permissions
  let hasPermission = false

  // Add your permission logic here based on path and method
  if (path.includes('/events')) {
    if (method === 'GET') {
      // Logística can view all events, Comercial can only view their own
      if (userRole === 'Logística') {
        hasPermission = permissions.canViewEvents
      } else if (userRole === 'Comercial') {
        hasPermission =
          permissions.canViewOwnEvents &&
          (req.query.userId === req.user._id.toString() ||
            req.params.id === req.user._id.toString())
      }
    } else if (method === 'POST') {
      hasPermission = permissions.canCreateEvents
    } else if (method === 'DELETE') {
      // Comercial can only delete their own events
      hasPermission =
        userRole === 'Comercial' &&
        permissions.canDeleteOwnEvents &&
        req.params.userId === req.user._id.toString()
    } else if (method === 'PATCH' || method === 'PUT') {
      // Only Logística can extend events
      hasPermission = userRole === 'Logística' && permissions.canExtendEvents
    }
  }

  if (!hasPermission) {
    return next(
      createError(403, 'You do not have permission to perform this action')
    )
  }

  next()
}
