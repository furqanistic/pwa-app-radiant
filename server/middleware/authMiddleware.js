// server/middleware/authMiddleware.js - Updated version

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
  // Simplified permission checking - admin has access to everything
  const userRole = req.user.role

  // Admin users have full access to all protected routes
  if (userRole === 'admin') {
    return next()
  }

  // For non-admin users, deny access to admin-only routes
  return next(
    createError(
      403,
      'You do not have permission to perform this action. Admin access required.'
    )
  )
}
