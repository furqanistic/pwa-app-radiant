// File: server/controller/auth.js - COMPLETE VERSION WITH ALL FUNCTIONS
import axios from 'axios'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { createError } from '../error.js'
import Location from '../models/Location.js'
import Referral from '../models/Referral.js'
import ReferralConfig from '../models/ReferralConfig.js'
import User from '../models/User.js'
import { createSystemNotification } from './notification.js'
import { updateUserTier } from './referral.js'

const signToken = (id) => {
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined in the environment variables')
  }
  return jwt.sign({ id }, jwtSecret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  })
}

const createSendToken = (user, statusCode, res) => {
  try {
    const token = signToken(user._id)
    const cookieOptions = {
      expires: new Date(
        Date.now() +
          (parseInt(process.env.JWT_COOKIE_EXPIRES_IN) || 1) *
            24 *
            60 *
            60 *
            1000
      ),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    }

    res.cookie('jwt', token, cookieOptions)
    user.password = undefined

    res.status(statusCode).json({
      status: 'success',
      token,
      data: {
        user,
      },
    })
  } catch (error) {
    console.error('Error in createSendToken:', error)
    throw error
  }
}

// ENHANCED: Get all users with pagination and filtering
export const getAllUsers = async (req, res, next) => {
  try {
    // Check permissions - allow admin, spa, and super-admin
    if (!['admin', 'spa', 'super-admin'].includes(req.user.role)) {
      return next(
        createError(
          403,
          'Access denied. Admin, Spa, or Super-Admin rights required.'
        )
      )
    }

    // Get pagination parameters
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const search = req.query.search || ''
    const role = req.query.role || ''
    const locationId = req.query.locationId || '' // NEW: Location filtering
    const sortBy = req.query.sortBy || 'createdAt'
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1

    // Build filters
    const filters = { isDeleted: false }

    // Add filters from middleware if any
    if (req.userFilters) {
      Object.assign(filters, req.userFilters)
    }

    // Search filter (name or email)
    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ]
    }

    // Role filter
    if (role && role !== 'all') {
      if (filters.role && typeof filters.role === 'object') {
        // Combine with existing role filter
        filters.role = { ...filters.role, $eq: role }
      } else {
        filters.role = role
      }
    }

    // NEW: Location filter for users in same location
    if (locationId) {
      filters.$or = [
        { 'selectedLocation.locationId': locationId },
        { 'spaLocation.locationId': locationId },
      ]
    }

    // Role-based access control
    if (req.user.role === 'spa') {
      // Spa users can only see users in their spa location
      if (req.user.spaLocation?.locationId) {
        filters['selectedLocation.locationId'] = req.user.spaLocation.locationId
        filters.role = 'user' // Spa users can only see regular users
      } else {
        // If spa user doesn't have spa location, return empty result
        return res.status(200).json({
          status: 'success',
          results: 0,
          data: {
            users: [],
            pagination: {
              currentPage: page,
              totalPages: 0,
              totalUsers: 0,
              hasNextPage: false,
              hasPreviousPage: false,
              limit,
            },
            filters: {
              search,
              role,
              sortBy,
              sortOrder: req.query.sortOrder || 'desc',
            },
          },
        })
      }
    } else if (req.user.role === 'admin') {
      // Admins cannot see super-admins (unless overridden by middleware)
      if (!filters.role || typeof filters.role === 'string') {
        filters.role = { $ne: 'super-admin' }
      }
    }
    // Super-admins can see all users (no additional filters)

    // Get total count for pagination info
    const total = await User.countDocuments(filters)

    // Calculate pagination
    const totalPages = Math.ceil(total / limit)
    const skip = (page - 1) * limit

    // Get users with pagination and sorting
    const sortOptions = {}
    sortOptions[sortBy] = sortOrder

    const users = await User.find(filters)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .select('-password')

    const pagination = {
      currentPage: page,
      totalPages,
      totalUsers: total,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      limit,
    }

    res.status(200).json({
      status: 'success',
      results: users.length,
      data: {
        users,
        pagination,
        filters: {
          search,
          role,
          locationId,
          sortBy,
          sortOrder: req.query.sortOrder || 'desc',
        },
      },
    })
  } catch (error) {
    console.error('Error in getAllUsers:', error)
    next(error)
  }
}

export const getAssignableUsers = async (req, res, next) => {
  try {
    // Check permissions
    if (!['admin', 'super-admin'].includes(req.user.role)) {
      return next(
        createError(403, 'Access denied. Admin or Super-Admin rights required.')
      )
    }

    // Build filters for assignable users
    const filters = {
      isDeleted: false,
      role: { $in: ['admin', 'spa'] }, // Only admin and spa users
    }

    // Additional role-based filtering
    if (req.user.role === 'admin') {
      // Admin can only assign locations to spa users
      filters.role = 'spa'
    }
    // Super-admin can assign to both admin and spa (no additional filter needed)

    const users = await User.find(filters)
      .sort({ name: 1 })
      .select('-password')
      .limit(100) // Reasonable limit

    res.status(200).json({
      status: 'success',
      results: users.length,
      data: {
        users,
      },
    })
  } catch (error) {
    console.error('Error getting assignable users:', error)
    next(createError(500, 'Failed to get assignable users'))
  }
}

// NEW: Change user role
export const changeUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params
    const { newRole, reason } = req.body

    // Validate inputs
    if (!newRole) {
      return next(createError(400, 'New role is required'))
    }

    if (
      !['super-admin', 'admin', 'spa', 'enterprise', 'user'].includes(newRole)
    ) {
      return next(createError(400, 'Invalid role specified'))
    }

    // Get target user
    const targetUser = await User.findById(userId)
    if (!targetUser) {
      return next(createError(404, 'User not found'))
    }

    // Get current user for permission checking
    const currentUser = await User.findById(req.user.id)
    if (!currentUser) {
      return next(createError(404, 'Current user not found'))
    }

    // Check permissions using model method
    if (!currentUser.canChangeUserRole(targetUser, newRole)) {
      return next(
        createError(
          403,
          "You do not have permission to change this user's role"
        )
      )
    }

    // Prevent changing own role
    if (currentUser._id.toString() === targetUser._id.toString()) {
      return next(createError(400, 'You cannot change your own role'))
    }

    // Special handling for super-admin role
    if (newRole === 'super-admin' && currentUser.role !== 'super-admin') {
      return next(
        createError(403, 'Only super-admins can assign super-admin role')
      )
    }

    // Store previous role
    const previousRole = targetUser.role

    // Update user role
    targetUser.previousRole = previousRole
    targetUser.role = newRole
    targetUser.roleChangedBy = currentUser._id
    targetUser.roleChangedAt = new Date()

    await targetUser.save()

    // Create notification for target user
    await createSystemNotification(
      targetUser._id,
      'Role Updated',
      `Your role has been changed from ${previousRole} to ${newRole}${
        reason ? `. Reason: ${reason}` : '.'
      }`,
      {
        category: 'admin',
        priority: 'high',
        metadata: {
          type: 'role_change',
          previousRole,
          newRole,
          changedBy: currentUser.name,
          reason,
        },
      }
    )

    // Log the role change
    console.log(
      `Role change: ${targetUser.email} (${previousRole} → ${newRole}) by ${currentUser.email}`
    )

    res.status(200).json({
      status: 'success',
      message: 'User role updated successfully',
      data: {
        user: {
          id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
          previousRole,
          roleChangedBy: currentUser.name,
          roleChangedAt: targetUser.roleChangedAt,
        },
      },
    })
  } catch (error) {
    console.error('Error changing user role:', error)
    next(error)
  }
}

// ENHANCED: Bulk operations for users
export const bulkUpdateUsers = async (req, res, next) => {
  try {
    const { userIds, action, data } = req.body

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return next(createError(400, 'User IDs array is required'))
    }

    if (!action) {
      return next(createError(400, 'Action is required'))
    }

    // Check permissions
    if (!['admin', 'super-admin'].includes(req.user.role)) {
      return next(
        createError(403, 'Access denied. Admin or Super-Admin rights required.')
      )
    }

    let result = {}

    switch (action) {
      case 'adjustPoints':
        result = await bulkAdjustPoints(userIds, data, req.user)
        break
      case 'changeRole':
        result = await bulkChangeRoles(userIds, data, req.user)
        break
      case 'delete':
        result = await bulkDeleteUsers(userIds, req.user)
        break
      default:
        return next(createError(400, 'Invalid action specified'))
    }

    res.status(200).json({
      status: 'success',
      message: `Bulk ${action} completed`,
      data: result,
    })
  } catch (error) {
    console.error('Error in bulk update:', error)
    next(error)
  }
}

// Helper function for bulk points adjustment
const bulkAdjustPoints = async (userIds, data, currentUser) => {
  const { type, amount, reason } = data
  const results = []

  for (const userId of userIds) {
    try {
      const user = await User.findById(userId)
      if (!user) {
        results.push({ userId, success: false, error: 'User not found' })
        continue
      }

      const oldPoints = user.points || 0
      let newPoints = oldPoints

      switch (type) {
        case 'add':
          newPoints += amount
          break
        case 'remove':
          newPoints = Math.max(0, newPoints - amount)
          break
        case 'set':
          newPoints = amount
          break
      }

      user.points = newPoints
      await user.save()

      // Create notification
      let notificationMessage = ''
      switch (type) {
        case 'add':
          notificationMessage = `You received ${amount} points! Your balance is now ${newPoints} points.`
          break
        case 'remove':
          notificationMessage = `${amount} points were deducted. Your balance is now ${newPoints} points.`
          break
        case 'set':
          notificationMessage = `Your points balance has been set to ${newPoints} points.`
          break
      }

      if (reason) {
        notificationMessage += ` Reason: ${reason}`
      }

      await createSystemNotification(
        userId,
        'Points Updated',
        notificationMessage,
        {
          category: 'points',
          priority: 'normal',
          metadata: {
            oldPoints,
            newPoints,
            adjustment: amount,
            type,
            reason,
            adjustedBy: currentUser.name,
          },
        }
      )

      results.push({ userId, success: true, oldPoints, newPoints })
    } catch (error) {
      results.push({ userId, success: false, error: error.message })
    }
  }

  return results
}

// Helper function for bulk role changes
const bulkChangeRoles = async (userIds, data, currentUser) => {
  const { newRole, reason } = data
  const results = []

  for (const userId of userIds) {
    try {
      const targetUser = await User.findById(userId)
      if (!targetUser) {
        results.push({ userId, success: false, error: 'User not found' })
        continue
      }

      if (!currentUser.canChangeUserRole(targetUser, newRole)) {
        results.push({ userId, success: false, error: 'Permission denied' })
        continue
      }

      if (currentUser._id.toString() === userId) {
        results.push({
          userId,
          success: false,
          error: 'Cannot change own role',
        })
        continue
      }

      const previousRole = targetUser.role
      targetUser.previousRole = previousRole
      targetUser.role = newRole
      targetUser.roleChangedBy = currentUser._id
      targetUser.roleChangedAt = new Date()

      await targetUser.save()

      // Create notification
      await createSystemNotification(
        userId,
        'Role Updated',
        `Your role has been changed from ${previousRole} to ${newRole}${
          reason ? `. Reason: ${reason}` : '.'
        }`,
        {
          category: 'admin',
          priority: 'high',
          metadata: {
            type: 'role_change',
            previousRole,
            newRole,
            changedBy: currentUser.name,
            reason,
          },
        }
      )

      results.push({ userId, success: true, previousRole, newRole })
    } catch (error) {
      results.push({ userId, success: false, error: error.message })
    }
  }

  return results
}

// Helper function for bulk delete users
const bulkDeleteUsers = async (userIds, currentUser) => {
  const results = []

  for (const userId of userIds) {
    try {
      // Don't allow deleting super-admins unless current user is super-admin
      const targetUser = await User.findById(userId)
      if (!targetUser) {
        results.push({ userId, success: false, error: 'User not found' })
        continue
      }

      if (
        targetUser.role === 'super-admin' &&
        currentUser.role !== 'super-admin'
      ) {
        results.push({
          userId,
          success: false,
          error: 'Cannot delete super-admin',
        })
        continue
      }

      if (currentUser._id.toString() === userId) {
        results.push({
          userId,
          success: false,
          error: 'Cannot delete yourself',
        })
        continue
      }

      await User.findByIdAndUpdate(userId, { isDeleted: true })
      results.push({ userId, success: true })
    } catch (error) {
      results.push({ userId, success: false, error: error.message })
    }
  }

  return results
}

// Keep existing functions with minimal changes...
export const signup = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      role,
      phone,
      referralCode,
      assignedLocation,
      dateOfBirth,
    } = req.body

    if (!name || !email || !password) {
      return next(createError(400, 'Please provide name, email and password'))
    }

    // Validate role - prevent creating super-admin through signup
    const userRole = role || 'user'
    if (userRole === 'super-admin') {
      return next(createError(400, 'Cannot create super-admin through signup'))
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return next(createError(400, 'User with this email already exists'))
    }

    let locationData = null
    if (assignedLocation) {
      const location = await Location.findOne({
        $or: [
          { locationId: assignedLocation },
          ...(mongoose.Types.ObjectId.isValid(assignedLocation)
            ? [{ _id: assignedLocation }]
            : []),
        ],
        isActive: true,
      })

      if (!location) {
        return next(createError(404, 'Selected location not found or inactive'))
      }

      locationData = {
        locationId: location.locationId,
        locationName: location.name,
        locationAddress: location.address,
        locationPhone: location.phone,
        logo: location.logo,
        selectedAt: new Date(),
      }
    }

    const userData = {
      name,
      email,
      password,
      role: userRole,
    }

    if (phone) userData.phone = phone
    if (dateOfBirth) userData.dateOfBirth = dateOfBirth
    if (locationData) userData.selectedLocation = locationData

    const newUser = await User.create(userData)

    // Process referral if provided
    let referralResult = { success: false }
    if (referralCode && referralCode.trim()) {
      referralResult = await processInitialReferral(
        newUser._id,
        referralCode.trim()
      )
    }

    const responseUser = {
      ...newUser.toObject(),
      password: undefined,
      referralProcessed: referralResult.success,
      referralMessage: referralResult.message,
    }

    createSendToken(responseUser, 201, res)
  } catch (err) {
    console.error('Error in signup:', err)
    next(createError(500, 'An unexpected error occurred during signup'))
  }
}

export const createSpaMember = async (req, res, next) => {
  try {
    const { name, email, password, assignedLocation, dateOfBirth, role } =
      req.body

    // Check permissions
    if (!['admin', 'super-admin'].includes(req.user.role)) {
      return next(
        createError(403, 'Access denied. Admin or Super-Admin rights required.')
      )
    }

    if (!name || !email || !password) {
      return next(createError(400, 'Please provide name, email and password'))
    }

    // Validate role assignment based on current user's role
    let userRole = role || 'user'
    if (req.user.role === 'admin') {
      // Admin can only create user and spa roles
      if (!['user', 'spa'].includes(userRole)) {
        return next(
          createError(403, 'Admin can only create user and spa roles')
        )
      }
    } else if (req.user.role === 'super-admin') {
      // Super-admin can create user, spa, and admin roles
      if (!['user', 'spa', 'admin'].includes(userRole)) {
        return next(createError(400, 'Invalid role specified'))
      }
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return next(createError(400, 'User with this email already exists'))
    }

    // Handle location assignment
    let locationData = null
    let spaLocationData = null

    if (assignedLocation) {
      const location = await Location.findOne({
        $or: [
          { locationId: assignedLocation },
          ...(mongoose.Types.ObjectId.isValid(assignedLocation)
            ? [{ _id: assignedLocation }]
            : []),
        ],
        isActive: true,
      })

      if (!location) {
        return next(createError(404, 'Selected location not found or inactive'))
      }

      // Prepare location data based on role
      if (userRole === 'spa') {
        // Spa users get spaLocation
        spaLocationData = {
          locationId: location.locationId,
          locationName: location.name,
          locationAddress: location.address,
          locationPhone: location.phone,
          logo: location.logo,
          setupAt: new Date(),
          setupCompleted: true,
        }
      } else {
        // Other roles get selectedLocation
        locationData = {
          locationId: location.locationId,
          locationName: location.name,
          locationAddress: location.address,
          locationPhone: location.phone,
          logo: location.logo,
          selectedAt: new Date(),
        }
      }
    } else if (userRole === 'spa' && req.user.role === 'admin') {
      // Admin creating spa member must provide location
      return next(createError(400, 'Location is required for spa members'))
    }

    // Create user data
    const userData = {
      name,
      email,
      password,
      role: userRole,
      createdBy: req.user._id,
    }

    if (dateOfBirth) userData.dateOfBirth = dateOfBirth
    if (locationData) userData.selectedLocation = locationData
    if (spaLocationData) userData.spaLocation = spaLocationData

    const newUser = await User.create(userData)
    newUser.password = undefined

    res.status(201).json({
      status: 'success',
      message: `${
        userRole.charAt(0).toUpperCase() + userRole.slice(1)
      } user created successfully`,
      data: {
        user: newUser,
      },
    })
  } catch (err) {
    console.error('Error in createTeamMember:', err)
    if (err.code === 11000) {
      return next(createError(400, 'User with this email already exists'))
    }
    next(createError(500, 'An unexpected error occurred while creating user'))
  }
}

export const assignLocationToUser = async (req, res, next) => {
  try {
    const { userId, locationId } = req.body

    // Check permissions
    if (!['admin', 'super-admin'].includes(req.user.role)) {
      return next(
        createError(403, 'Access denied. Admin or Super-Admin rights required.')
      )
    }

    if (!userId || !locationId) {
      return next(createError(400, 'User ID and Location ID are required'))
    }

    // Find the user
    const user = await User.findById(userId)
    if (!user) {
      return next(createError(404, 'User not found'))
    }

    // Check if current user can assign location to this user
    const canAssign =
      req.user.role === 'super-admin' ||
      (req.user.role === 'admin' && user.role === 'spa')

    if (!canAssign) {
      return next(
        createError(403, 'You can only assign locations to eligible users')
      )
    }

    // Find the location
    const location = await Location.findById(locationId)
    if (!location) {
      return next(createError(404, 'Location not found'))
    }

    if (!location.isActive) {
      return next(createError(400, 'Cannot assign inactive location'))
    }

    // Prepare location data based on user role
    const locationData = {
      locationId: location.locationId,
      locationName: location.name,
      locationAddress: location.address,
      locationPhone: location.phone,
      logo: location.logo,
    }

    if (user.role === 'spa' || user.role === 'team') {
      // Team users get spaLocation
      user.spaLocation = {
        ...locationData,
        setupAt: new Date(),
        setupCompleted: true,
      }
      // Clear selectedLocation if it exists
      user.selectedLocation = {
        locationId: null,
        locationName: null,
        locationAddress: null,
        locationPhone: null,
        logo: null,
        selectedAt: null,
      }
    } else {
      // Other roles get selectedLocation
      user.selectedLocation = {
        ...locationData,
        selectedAt: new Date(),
      }
    }

    await user.save()

    res.status(200).json({
      status: 'success',
      message: 'Location assigned successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          selectedLocation: user.selectedLocation,
          spaLocation: user.spaLocation,
        },
        assignedLocation: location,
      },
    })
  } catch (error) {
    console.error('Error assigning location:', error)
    next(createError(500, 'Failed to assign location'))
  }
}

export const signin = async (req, res, next) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide email and password',
      })
    }

    const user = await User.findOne({ email }).select('+password')

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Incorrect email or password',
      })
    }

    if (user.isDeleted) {
      return res.status(401).json({
        status: 'error',
        message: 'This account has been deactivated',
      })
    }

    if (user.authProvider === 'google' && !user.password) {
      return res.status(400).json({
        status: 'error',
        message:
          'This account uses Google Sign-In. Please use "Continue with Google" button.',
      })
    }

    if (!(await user.correctPassword(password, user.password))) {
      return res.status(401).json({
        status: 'error',
        message: 'Incorrect email or password',
      })
    }

    user.lastLogin = new Date()
    await user.save({ validateBeforeSave: false })
    createSendToken(user, 200, res)
  } catch (err) {
    console.error('Error in signin:', err)
    res.status(500).json({
      status: 'error',
      message: 'An unexpected error occurred',
    })
  }
}

// File: server/controller/auth.js - FIXED ONBOARDING STATUS FUNCTION

export const getOnboardingStatus = async (req, res, next) => {
  try {
    const user = req.user

    if (!user) {
      return next(createError(401, 'User not found'))
    }

    // IMPROVED: Check if user has actually selected a spa with real data
    let hasSelectedSpa = false

    if (user.role === 'spa') {
      // For spa owners, check spaLocation
      hasSelectedSpa = !!(
        user.spaLocation &&
        user.spaLocation.locationId &&
        user.spaLocation.locationId.trim() !== '' &&
        user.spaLocation.locationName &&
        user.spaLocation.locationName.trim() !== ''
      )
    } else if (['admin', 'super-admin'].includes(user.role)) {
      // Admins and super-admins don't need to select a spa
      hasSelectedSpa = true
    } else {
      // For regular users, check selectedLocation
      hasSelectedSpa = !!(
        user.selectedLocation &&
        user.selectedLocation.locationId &&
        user.selectedLocation.locationId.trim() !== '' &&
        user.selectedLocation.locationName &&
        user.selectedLocation.locationName.trim() !== ''
      )
    }

    // Debug logging to see what we're checking
    console.log('Onboarding Status Debug:', {
      userId: user._id,
      hasSelectedLocation: !!user.selectedLocation,
      locationId: user.selectedLocation?.locationId,
      locationName: user.selectedLocation?.locationName,
      locationAddress: user.selectedLocation?.locationAddress,
      hasSelectedSpa,
      selectedLocationObject: user.selectedLocation,
    })

    const profileCompleted = user.profileCompleted || false
    const onboardingCompleted = user.onboardingCompleted || false

    // AUTO-SYNC: Ensure logo and name are up to date if hasSelectedSpa is true
    if (hasSelectedSpa) {
      try {
        const activeLoc = user.role === 'spa' ? user.spaLocation : user.selectedLocation;
        if (activeLoc?.locationId) {
          const location = await Location.findOne({ locationId: activeLoc.locationId });
          if (location && location.logo && activeLoc.logo !== location.logo) {
            if (user.role === 'spa') {
              user.spaLocation.logo = location.logo;
              user.markModified('spaLocation');
            } else {
              user.selectedLocation.logo = location.logo;
              user.markModified('selectedLocation');
            }
            await user.save({ validateBeforeSave: false });
            console.log(`Auto-synced logo for user ${user.email}`);
          }
        }
      } catch (syncError) {
        console.error('Auto-sync failed in getOnboardingStatus:', syncError);
      }
    }

    const onboardingStatus = {
      hasSelectedSpa,
      profileCompleted,
      onboardingCompleted,
      selectedLocation: user.selectedLocation,
      spaLocation: user.spaLocation, // For team users
      userRole: user.role,
    }

    res.status(200).json({
      status: 'success',
      data: {
        onboardingStatus,
      },
    })
  } catch (error) {
    console.error('Error getting onboarding status:', error)
    next(createError(500, 'Failed to get onboarding status'))
  }
}

// Also update getCurrentUser to have consistent logic
export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password')

    if (!user) {
      return next(createError(404, 'User not found'))
    }

    // SAME improved logic as onboarding status
    let hasSelectedSpa = false

    if (user.role === 'spa') {
      hasSelectedSpa = !!(
        user.spaLocation &&
        user.spaLocation.locationId &&
        user.spaLocation.locationId.trim() !== '' &&
        user.spaLocation.locationName &&
        user.spaLocation.locationName.trim() !== ''
      )
    } else if (['admin', 'super-admin'].includes(user.role)) {
      hasSelectedSpa = true
    } else {
      hasSelectedSpa = !!(
        user.selectedLocation &&
        user.selectedLocation.locationId &&
        user.selectedLocation.locationId.trim() !== '' &&
        user.selectedLocation.locationName &&
        user.selectedLocation.locationName.trim() !== ''
      )
    }

    console.log('getCurrentUser Debug:', {
      userId: user._id,
      hasSelectedSpa,
      selectedLocation: user.selectedLocation,
    })

    // AUTO-SYNC: Ensure logo and name are up to date if hasSelectedSpa is true
    if (hasSelectedSpa) {
      try {
        const activeLoc = user.role === 'spa' ? user.spaLocation : user.selectedLocation;
        if (activeLoc?.locationId) {
          const location = await Location.findOne({ locationId: activeLoc.locationId });
          if (location && location.logo && activeLoc.logo !== location.logo) {
            if (user.role === 'spa') {
              user.spaLocation.logo = location.logo;
              user.markModified('spaLocation');
            } else {
              user.selectedLocation.logo = location.logo;
              user.markModified('selectedLocation');
            }
            await user.save({ validateBeforeSave: false });
            console.log(`Auto-synced logo for user ${user.email} in getCurrentUser`);
          }
        }
      } catch (syncError) {
        console.error('Auto-sync failed in getCurrentUser:', syncError);
      }
    }

    // Add hasSelectedSpa to user object for frontend
    const userWithStatus = {
      ...user.toObject(),
      hasSelectedSpa,
    }

    res.status(200).json({
      status: 'success',
      data: {
        user: userWithStatus,
      },
    })
  } catch (error) {
    console.error('Error getting current user:', error)
    next(createError(500, 'Failed to get user data'))
  }
}

export const adjustUserPoints = async (req, res, next) => {
  try {
    const { userId } = req.params
    const { type, amount, reason } = req.body

    if (!['admin', 'super-admin'].includes(req.user.role)) {
      return next(
        createError(403, 'Access denied. Admin or Super-Admin rights required.')
      )
    }

    const user = await User.findById(userId)
    if (!user) {
      return next(createError(404, 'User not found'))
    }

    const oldPoints = user.points || 0
    let newPoints = oldPoints

    switch (type) {
      case 'add':
        newPoints += amount
        break
      case 'remove':
        newPoints = Math.max(0, newPoints - amount)
        break
      case 'set':
        newPoints = amount
        break
      default:
        return next(createError(400, 'Invalid adjustment type'))
    }

    user.points = newPoints
    await user.save()

    let notificationTitle = 'Points Updated'
    let notificationMessage = ''

    switch (type) {
      case 'add':
        notificationMessage = `You received ${amount} points! Your balance is now ${newPoints} points.`
        break
      case 'remove':
        notificationMessage = `${amount} points were deducted from your account. Your balance is now ${newPoints} points.`
        break
      case 'set':
        notificationMessage = `Your points balance has been set to ${newPoints} points.`
        break
    }

    if (reason) {
      notificationMessage += ` Reason: ${reason}`
    }

    await createSystemNotification(
      userId,
      notificationTitle,
      notificationMessage,
      {
        category: 'points',
        priority: 'normal',
        metadata: {
          oldPoints,
          newPoints,
          adjustment: amount,
          type,
          reason,
          adjustedBy: req.user.name,
        },
      }
    )

    res.status(200).json({
      status: 'success',
      data: { user },
    })
  } catch (error) {
    next(error)
  }
}

// Helper function for referral processing
const processInitialReferral = async (referredUserId, referralCode) => {
  try {
    const referrer = await User.findOne({
      referralCode: referralCode.toUpperCase(),
      isDeleted: false,
    })

    if (!referrer) {
      return {
        success: false,
        message: 'Invalid referral code',
      }
    }

    const referredUser = await User.findById(referredUserId)
    if (!referredUser) {
      return {
        success: false,
        message: 'Referred user not found',
      }
    }

    if (referrer._id.toString() === referredUserId.toString()) {
      return {
        success: false,
        message: 'Cannot refer yourself',
      }
    }

    if (referredUser.referredBy) {
      return {
        success: false,
        message: 'User was already referred by someone else',
      }
    }

    const existingReferral = await Referral.findOne({
      referrer: referrer._id,
      referred: referredUserId,
    })

    if (existingReferral) {
      return {
        success: false,
        message: 'Referral already exists',
      }
    }

    const referral = await Referral.create({
      referrer: referrer._id,
      referred: referredUserId,
      referralCode: referralCode.toUpperCase(),
      rewardType: 'signup',
      status: 'pending',
      referrerReward: {
        points: 0,
        awarded: false,
      },
      referredReward: {
        points: 0,
        awarded: false,
      },
      metadata: {
        notes: 'Waiting for spa selection to apply rewards',
      },
    })

    referredUser.referredBy = referrer._id
    await referredUser.save()

    referrer.referralStats.totalReferrals += 1
    referrer.referralStats.activeReferrals += 1
    await referrer.save()

    // Check for tier upgrade
    await updateUserTier(referrer._id)

    return {
      success: true,
      message:
        'Referral record created successfully. Points will be awarded when spa is selected.',
      data: {
        referral,
        awaitingSpaSelection: true,
      },
    }
  } catch (error) {
    console.error('Error processing initial referral:', error)
    return {
      success: false,
      message: 'Failed to process referral',
    }
  }
}

// Export other existing functions...
export const updateUser = async (req, res, next) => {
  try {
    const userId = req.params.id
    const { name, email } = req.body // Removed role from here - use changeUserRole instead

    const existingUser = await User.findById(userId)

    if (!existingUser) {
      return next(createError(404, 'No user found with that ID'))
    }

    if (
      req.user._id.toString() !== userId &&
      !['admin', 'super-admin'].includes(req.user.role)
    ) {
      return next(createError(403, 'You can only update your own profile'))
    }

    if (email && email !== existingUser.email) {
      const emailExists = await User.findOne({ email })
      if (emailExists) {
        return next(createError(400, 'Email is already in use'))
      }
    }

    const updateData = {}
    if (name) updateData.name = name
    if (email) updateData.email = email

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    })

    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const deleteUser = async (req, res, next) => {
  try {
    const userId = req.params.id

    if (
      req.user.id !== userId &&
      !['admin', 'super-admin'].includes(req.user.role)
    ) {
      return next(createError(403, 'You can only delete your own account'))
    }

    const targetUser = await User.findById(userId)
    if (!targetUser) {
      return next(createError(404, 'No user found with that ID'))
    }

    // Prevent non-super-admins from deleting super-admins
    if (targetUser.role === 'super-admin' && req.user.role !== 'super-admin') {
      return next(createError(403, 'Cannot delete super-admin user'))
    }

    // Prevent deleting yourself
    if (req.user.id === userId) {
      return next(createError(400, 'Cannot delete your own account'))
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { isDeleted: true },
      { new: true }
    )

    res.status(200).json({
      status: 'success',
      message: 'User deleted successfully',
    })
  } catch (error) {
    next(error)
  }
}

export const getUserProfile = async (req, res, next) => {
  try {
    const userId = req.params.id

    if (
      req.user.id !== userId &&
      !['admin', 'super-admin'].includes(req.user.role)
    ) {
      return next(createError(403, 'You can only view your own profile'))
    }

    const user = await User.findById(userId)

    if (!user || user.isDeleted) {
      return next(createError(404, 'No user found with that ID'))
    }

    res.status(200).json({
      status: 'success',
      data: {
        user,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return next(createError(400, 'Please provide current and new password'))
    }

    if (newPassword.length < 8) {
      return next(
        createError(400, 'New password must be at least 8 characters long')
      )
    }

    const user = await User.findById(req.user.id).select('+password')

    if (!user) {
      return next(createError(404, 'User not found'))
    }

    if (!user.password) {
      return next(
        createError(
          400,
          'Cannot change password for Google authenticated users'
        )
      )
    }

    if (!(await user.correctPassword(currentPassword, user.password))) {
      return next(createError(401, 'Your current password is wrong'))
    }

    user.password = newPassword
    await user.save()

    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully',
    })
  } catch (error) {
    next(error)
  }
}

export const selectSpa = async (req, res, next) => {
  try {
    const { locationId, referralCode } = req.body
    const userId = req.user.id

    console.log('selectSpa called with:', { locationId, referralCode, userId })

    if (!locationId) {
      return next(createError(400, 'Location ID is required'))
    }

    // Find the user
    const user = await User.findById(userId)
    if (!user) {
      return next(createError(404, 'User not found'))
    }

    // Find the location data
    const location = await Location.findOne({
      locationId: locationId,
      isActive: true,
    })

    if (!location) {
      return next(createError(404, 'Location not found or inactive'))
    }

    console.log('Found location:', location)

    // Update user's selected location with actual data
    const locationData = {
      locationId: location.locationId,
      locationName: location.name,
      locationAddress: location.address,
      locationPhone: location.phone,
      logo: location.logo,
      selectedAt: new Date(),
    }

    user.selectedLocation = locationData

    // Mark profile as completed since they selected a spa
    user.profileCompleted = true

    await user.save()

    console.log('User updated with location:', user.selectedLocation)

    // Initialize rewards response
    let rewardResponse = {
      profileCompletion: 50, // Base points for completing profile
      referral: { success: false },
    }

    // Process referral if provided
    if (referralCode && referralCode.trim()) {
      try {
        const referralResult = await processReferralOnSpaSelection(
          userId,
          referralCode.trim()
        )
        rewardResponse.referral = referralResult
        console.log('Referral processing result:', referralResult)
      } catch (error) {
        console.error('Referral processing error:', error)
        // Don't fail the entire request if referral fails
      }
    }

    // Award profile completion points
    user.points = (user.points || 0) + rewardResponse.profileCompletion
    await user.save()

    res.status(200).json({
      status: 'success',
      message: 'Spa selected successfully',
      data: {
        user: {
          id: user._id,
          selectedLocation: user.selectedLocation,
          profileCompleted: user.profileCompleted,
          points: user.points,
        },
        rewards: rewardResponse,
      },
    })
  } catch (error) {
    console.error('Error in selectSpa:', error)
    next(createError(500, 'Failed to select spa'))
  }
}

// Helper function for referral processing when spa is selected
const processReferralOnSpaSelection = async (referredUserId, referralCode) => {
  try {
    // Find the referrer
    const referrer = await User.findOne({
      referralCode: referralCode.toUpperCase(),
      isDeleted: false,
    })

    if (!referrer) {
      return {
        success: false,
        message: 'Invalid referral code',
      }
    }

    const referredUser = await User.findById(referredUserId)
    if (!referredUser) {
      return {
        success: false,
        message: 'Referred user not found',
      }
    }

    // Check if already referred
    if (referredUser.referredBy) {
      return {
        success: false,
        message: 'User was already referred by someone else',
      }
    }

    // Get referral config
    const config = await ReferralConfig.getActiveConfig()
    
    // Calculate tier multiplier
    const currentTier = referrer.referralStats?.currentTier || 'bronze'
    const tierMultiplier = config.tierMultipliers[currentTier] || 1.0
    
    // Get spa specific config if available, otherwise global defaults
    // Note: In a real scenario, we'd use getSpaConfig similar to referral.js
    // For now using global signupReward but scaling with tier
    
    const referralRewards = {
      referrerPoints: Math.round(config.signupReward.referrerPoints * tierMultiplier),
      referredPoints: Math.round(config.signupReward.referredPoints * tierMultiplier),
    }

    // Create or update referral record
    let referral = await Referral.findOne({
      referrer: referrer._id,
      referred: referredUserId,
    })

    if (!referral) {
      referral = await Referral.create({
        referrer: referrer._id,
        referred: referredUserId,
        referralCode: referralCode.toUpperCase(),
        rewardType: 'spa_selection',
        status: 'completed',
        referrerReward: {
          points: referralRewards.referrerPoints,
          awarded: true,
          awardedAt: new Date(),
        },
        referredReward: {
          points: referralRewards.referredPoints,
          awarded: true,
          awardedAt: new Date(),
        },
      })
    } else {
      // Update existing referral
      referral.status = 'completed'
      referral.referrerReward.points = referralRewards.referrerPoints
      referral.referrerReward.awarded = true
      referral.referrerReward.awardedAt = new Date()
      referral.referredReward.points = referralRewards.referredPoints
      referral.referredReward.awarded = true
      referral.referredReward.awardedAt = new Date()
      await referral.save()
    }

    // Award points to both users
    referrer.points = (referrer.points || 0) + referralRewards.referrerPoints
    referredUser.points =
      (referredUser.points || 0) + referralRewards.referredPoints
    referredUser.referredBy = referrer._id

    await Promise.all([referrer.save(), referredUser.save()])

    // Check for tier upgrade (conversion might count too)
    await updateUserTier(referrer._id)

    // Create notifications
    await createSystemNotification(
      referrer._id,
      'Referral Bonus!',
      `${referredUser.name} joined your spa! You earned ${referralRewards.referrerPoints} bonus points.`,
      {
        category: 'referral',
        priority: 'normal',
        metadata: {
          type: 'referral_reward',
          referredUser: referredUser.name,
          points: referralRewards.referrerPoints,
        },
      }
    )

    return {
      success: true,
      message: 'Referral bonus applied successfully',
      data: {
        referrerName: referrer.name,
        referrerPoints: referralRewards.referrerPoints,
        referredPoints: referralRewards.referredPoints,
      },
    }
  } catch (error) {
    console.error('Error processing referral:', error)
    return {
      success: false,
      message: 'Failed to process referral bonus',
    }
  }
}
