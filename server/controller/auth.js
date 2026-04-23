// File: server/controller/auth.js - COMPLETE VERSION WITH ALL FUNCTIONS
import axios from 'axios'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { createError } from '../error.js'
import Location from '../models/Location.js'
import PointTransaction from '../models/PointTransaction.js'
import Referral from '../models/Referral.js'
import ReferralConfig from '../models/ReferralConfig.js'
import User from '../models/User.js'
import { processPendingQrClaimsForUser } from '../utils/qrPendingClaims.js'
import { sendPasswordResetEmail } from '../utils/resendMailer.js'
import { getPointsMethodForLocation } from '../utils/pointsSettings.js'
import {
  addTagsToContactForLocation,
  enrollContactInWorkflowForLocation,
} from './ghl.js'
import { createSystemNotification } from './notification.js'
import { updateUserTier } from './referral.js'

const isVerboseServerLogsEnabled =
  String(process.env.VERBOSE_SERVER_LOGS || '').toLowerCase() === 'true'
const debugLog = (...args) => {
  if (isVerboseServerLogsEnabled) console.log(...args)
}
const debugInfo = (...args) => {
  if (isVerboseServerLogsEnabled) console.info(...args)
}
const debugWarn = (...args) => {
  if (isVerboseServerLogsEnabled) console.warn(...args)
}

const signToken = (id) => {
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined in the environment variables')
  }

  const useExpiringSessions =
    String(process.env.JWT_USE_EXPIRY || '').toLowerCase() === 'true'
  if (!useExpiringSessions) {
    return jwt.sign({ id }, jwtSecret)
  }

  return jwt.sign({ id }, jwtSecret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  })
}

const PASSWORD_RESET_TOKEN_TTL_MINUTES = Number(
  process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES || 30
)

const DEFAULT_APP_ROOT_DOMAIN = `${process.env.APP_ROOT_DOMAIN || 'cxrsystems.com'}`
  .trim()
  .toLowerCase()

const isValidSubdomain = (value = '') =>
  /^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$/.test(`${value}`.trim().toLowerCase())

const buildPasswordResetUrl = ({
  token,
  locationId,
  subdomain = '',
} = {}) => {
  const normalizedSubdomain = `${subdomain || ''}`.trim().toLowerCase()
  const hasValidSubdomain = isValidSubdomain(normalizedSubdomain)
  const subdomainBaseUrl =
    hasValidSubdomain && DEFAULT_APP_ROOT_DOMAIN
      ? `https://${normalizedSubdomain}.${DEFAULT_APP_ROOT_DOMAIN}`
      : ''

  const baseUrl =
    subdomainBaseUrl ||
    `${process.env.PASSWORD_RESET_URL || process.env.CLIENT_URL || ''}`.trim() ||
    'http://localhost:5173'
  const resetUrl = new URL('/auth', baseUrl)
  resetUrl.searchParams.set('resetToken', token)
  if (`${locationId || ''}`.trim()) {
    resetUrl.searchParams.set('spa', `${locationId}`.trim())
  }
  return resetUrl.toString()
}

const resolvePasswordResetBranding = async ({
  user,
  locationId = '',
  requestSubdomain = '',
} = {}) => {
  const normalizedLocationId = `${locationId || ''}`.trim()
  const normalizedRequestSubdomain = `${requestSubdomain || ''}`
    .trim()
    .toLowerCase()

  const candidateQueries = []

  if (normalizedLocationId) {
    candidateQueries.push({ locationId: normalizedLocationId, isActive: true })
  }
  if (isValidSubdomain(normalizedRequestSubdomain)) {
    candidateQueries.push({
      subdomain: normalizedRequestSubdomain,
      isActive: true,
    })
  }
  if (`${user?.selectedLocation?.locationId || ''}`.trim()) {
    candidateQueries.push({
      locationId: `${user.selectedLocation.locationId}`.trim(),
      isActive: true,
    })
  }
  if (`${user?.spaLocation?.locationId || ''}`.trim()) {
    candidateQueries.push({
      locationId: `${user.spaLocation.locationId}`.trim(),
      isActive: true,
    })
  }

  let resolvedLocation = null
  for (const query of candidateQueries) {
    resolvedLocation = await Location.findOne(query).select(
      'locationId name subdomain themeColor logo logoPublicId'
    )
    if (resolvedLocation) break
  }

  const resolvedSubdomain =
    `${resolvedLocation?.subdomain || normalizedRequestSubdomain || ''}`
      .trim()
      .toLowerCase() || ''
  const resolvedLocationId =
    `${resolvedLocation?.locationId || normalizedLocationId || ''}`.trim() || ''

  return {
    location: resolvedLocation,
    locationId: resolvedLocationId,
    subdomain: isValidSubdomain(resolvedSubdomain) ? resolvedSubdomain : '',
    brandName:
      `${resolvedLocation?.name || process.env.BRAND_APP_NAME || 'CXR Systems'}`.trim(),
    brandColor: `${resolvedLocation?.themeColor || '#0f172a'}`.trim(),
    logoUrl:
      `${resolvedLocation?.logo || resolvedLocation?.logoPublicId || ''}`.trim(),
  }
}

const createSendToken = (user, statusCode, res, extraData = null) => {
  try {
    const token = signToken(user._id)
    const useExpiringSessions =
      String(process.env.JWT_USE_EXPIRY || '').toLowerCase() === 'true'
    const cookieExpiryDays = useExpiringSessions
      ? parseInt(process.env.JWT_COOKIE_EXPIRES_IN, 10) || 1
      : 36500 // ~100 years to behave like "stay logged in"

    const cookieOptions = {
      expires: new Date(Date.now() + cookieExpiryDays * 24 * 60 * 60 * 1000),
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
        ...(extraData && typeof extraData === 'object' ? extraData : {}),
      },
    })
  } catch (error) {
    console.error('Error in createSendToken:', error)
    throw error
  }
}

const generateUniqueReferralCode = async () => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  const generateCode = () => {
    let code = ''
    for (let i = 0; i < 2; i++) {
      code += letters.charAt(Math.floor(Math.random() * letters.length))
    }
    for (let i = 0; i < 4; i++) {
      code += numbers.charAt(Math.floor(Math.random() * numbers.length))
    }
    return code
  }

  let code = generateCode()
  let codeExists = await User.findOne({ referralCode: code })

  while (codeExists) {
    code = generateCode()
    codeExists = await User.findOne({ referralCode: code })
  }

  return code
}

const parseCsvEnv = (value = '') =>
  `${value || ''}`
    .split(',')
    .map((entry) => `${entry || ''}`.trim())
    .filter(Boolean)

const SIGNUP_WORKFLOW_PRIMARY_ID =
  `${process.env.GHL_SIGNUP_WORKFLOW_ID || ''}`.trim()
const SIGNUP_WORKFLOW_FALLBACK_ID =
  `${process.env.GHL_SIGNUP_WORKFLOW_FALLBACK_ID || ''}`.trim()
const SIGNUP_TRIGGER_TAG_PRIMARY =
  `${process.env.GHL_SIGNUP_TRIGGER_TAG || ''}`.trim()
const SIGNUP_WORKFLOW_IDS = Array.from(
  new Set(
    [
      ...parseCsvEnv(process.env.GHL_SIGNUP_WORKFLOW_IDS),
      SIGNUP_WORKFLOW_PRIMARY_ID,
      SIGNUP_WORKFLOW_FALLBACK_ID,
    ].filter(Boolean)
  )
)
const SIGNUP_TRIGGER_TAGS = Array.from(
  new Set(
    [
      ...parseCsvEnv(process.env.GHL_SIGNUP_TRIGGER_TAGS),
      SIGNUP_TRIGGER_TAG_PRIMARY,
      'app_signup',
    ].filter(Boolean)
  )
)

const summarizeGhlError = (error) => {
  const statusCode = error?.response?.status || error?.response?.data?.statusCode || null
  const message = `${error?.response?.data?.message || error?.response?.data?.msg || error?.message || ''}`.trim()
  return {
    statusCode,
    message,
  }
}

const attemptSignupWorkflowEnrollment = async ({
  user = null,
  locationId = '',
} = {}) => {
  const normalizedLocationId = `${locationId || ''}`.trim()
  const normalizedEmail = `${user?.email || ''}`.trim().toLowerCase()
  const normalizedPhone = `${user?.phone || ''}`.trim()

  if (
    !user?._id ||
    !normalizedLocationId ||
    (!normalizedPhone && !normalizedEmail)
  ) {
    const skipInfo = {
      userId: `${user?._id || ''}`,
      locationId: normalizedLocationId,
      hasEmail: Boolean(normalizedEmail),
      hasPhone: Boolean(normalizedPhone),
      reason: 'Missing user, location, or contact identity (email/phone)',
    }
    debugInfo('[Auth:SignupWorkflow] Enrollment skipped', skipInfo)
    console.warn('[Auth:SignupWorkflow] Enrollment skipped', skipInfo)
    return {
      attempted: false,
      success: false,
      reason: 'Missing user, location, or contact identity (email/phone)',
    }
  }

  debugInfo('[Auth:SignupWorkflow] Enrollment start', {
    userId: `${user?._id || ''}`,
    locationId: normalizedLocationId,
    hasEmail: Boolean(normalizedEmail),
    hasPhone: Boolean(normalizedPhone),
    tags: SIGNUP_TRIGGER_TAGS,
    workflowIds: SIGNUP_WORKFLOW_IDS,
  })

  const attemptErrors = []

  console.info('[Auth:SignupWorkflow] Trigger attempt started', {
    userId: `${user?._id || ''}`,
    locationId: normalizedLocationId,
    email: normalizedEmail || '',
    hasPhone: Boolean(normalizedPhone),
    tags: SIGNUP_TRIGGER_TAGS,
    workflowIds: SIGNUP_WORKFLOW_IDS,
  })

  if (SIGNUP_TRIGGER_TAGS.length) {
    try {
      const tagResult = await addTagsToContactForLocation(normalizedLocationId, {
        tags: SIGNUP_TRIGGER_TAGS,
        email: normalizedEmail,
        phone: normalizedPhone,
        name: user.name,
      })

      debugInfo('[Auth:SignupWorkflow] Signup tag trigger success', {
        userId: `${user._id}`,
        locationId: normalizedLocationId,
        contactId: tagResult?.contactId || '',
        tags: tagResult?.tags || [],
      })
      console.info('[Auth:SignupWorkflow] Tag trigger success', {
        userId: `${user._id}`,
        locationId: normalizedLocationId,
        contactId: tagResult?.contactId || '',
        tags: tagResult?.tags || [],
      })

      return {
        attempted: true,
        success: true,
        mode: 'tag',
        tags: tagResult?.tags || [],
        contactId: tagResult?.contactId || '',
      }
    } catch (error) {
      const summary = summarizeGhlError(error)
      attemptErrors.push({
        mode: 'tag',
        tags: SIGNUP_TRIGGER_TAGS,
        ...summary,
      })
      const failureInfo = {
        userId: `${user._id}`,
        locationId: normalizedLocationId,
        tags: SIGNUP_TRIGGER_TAGS,
        ...summary,
      }
      debugWarn('[Auth:SignupWorkflow] Signup tag trigger failed', failureInfo)
      console.warn('[Auth:SignupWorkflow] Signup tag trigger failed', failureInfo)
    }
  }

  if (!SIGNUP_WORKFLOW_IDS.length) {
    return {
      attempted: attemptErrors.length > 0,
      success: false,
      reason: attemptErrors.length
        ? 'Signup tag trigger failed'
        : 'No signup workflow IDs configured',
      errors: attemptErrors,
    }
  }

  for (const workflowId of SIGNUP_WORKFLOW_IDS) {
    try {
      const result = await enrollContactInWorkflowForLocation(normalizedLocationId, {
        workflowId,
        email: normalizedEmail,
        phone: normalizedPhone,
        name: user.name,
      })

      debugInfo('[Auth:SignupWorkflow] Enrollment success', {
        userId: `${user._id}`,
        locationId: normalizedLocationId,
        workflowId,
        contactId: result?.contactId || '',
      })
      console.info('[Auth:SignupWorkflow] Workflow fallback success', {
        userId: `${user._id}`,
        locationId: normalizedLocationId,
        workflowId,
        contactId: result?.contactId || '',
      })

      return {
        attempted: true,
        success: true,
        mode: 'workflow',
        workflowId,
        contactId: result?.contactId || '',
      }
    } catch (error) {
      const summary = summarizeGhlError(error)
      attemptErrors.push({
        workflowId,
        ...summary,
      })
      const failureInfo = {
        userId: `${user._id}`,
        locationId: normalizedLocationId,
        workflowId,
        ...summary,
      }
      debugWarn('[Auth:SignupWorkflow] Enrollment failed', failureInfo)
      console.warn('[Auth:SignupWorkflow] Enrollment failed', failureInfo)
    }
  }

  return {
    attempted: true,
    success: false,
    reason: 'All configured signup workflows failed',
    errors: attemptErrors,
  }
}

const USERS_LIST_CACHE_TTL_MS = 60 * 1000
const USERS_LIST_CACHE_MAX_KEYS = 500
const usersListCache = new Map()

const getUsersListCacheKey = ({
  userId,
  role,
  page,
  limit,
  search,
  roleFilter,
  assignedOnly,
  unassignedOnly,
  locationId,
  sortBy,
  sortOrder,
}) =>
  JSON.stringify({
    userId,
    role,
    page,
    limit,
    search,
    roleFilter,
    assignedOnly,
    unassignedOnly,
    locationId,
    sortBy,
    sortOrder,
  })

const getCachedUsersList = (key) => {
  const cached = usersListCache.get(key)
  if (!cached) return null
  if (cached.expiresAt <= Date.now()) {
    usersListCache.delete(key)
    return null
  }
  return cached.payload
}

const setCachedUsersList = (key, payload) => {
  if (usersListCache.size >= USERS_LIST_CACHE_MAX_KEYS) {
    const oldestKey = usersListCache.keys().next().value
    if (oldestKey) usersListCache.delete(oldestKey)
  }
  usersListCache.set(key, {
    payload,
    expiresAt: Date.now() + USERS_LIST_CACHE_TTL_MS,
  })
}

const clearUsersListCache = () => {
  usersListCache.clear()
}

const getUserAccessibleLocationIds = (user) => {
  const ids = new Set()
  if (user?.selectedLocation?.locationId) ids.add(user.selectedLocation.locationId)
  if (user?.spaLocation?.locationId) ids.add(user.spaLocation.locationId)
  if (Array.isArray(user?.assignedLocations)) {
    user.assignedLocations.forEach((location) => {
      if (location?.locationId) ids.add(location.locationId)
    })
  }
  return [...ids]
}

const getPrimaryUserLocationId = (user) =>
  user?.selectedLocation?.locationId || user?.spaLocation?.locationId || ''

const canAccessLocation = (user, locationId) => {
  if (!locationId) return false
  if (user?.role === 'super-admin') return true
  return getUserAccessibleLocationIds(user).includes(locationId)
}

const resolveManagementLocationId = (user, requestedLocationId = '') => {
  const normalizedLocationId = `${requestedLocationId || ''}`.trim()
  if (normalizedLocationId && canAccessLocation(user, normalizedLocationId)) {
    return normalizedLocationId
  }
  return getPrimaryUserLocationId(user)
}

const buildUserLocationMembershipFilter = (locationId) => ({
  $or: [
    { 'selectedLocation.locationId': locationId },
    { 'spaLocation.locationId': locationId },
    { 'assignedLocations.locationId': locationId },
  ],
})

const getLocationScopedPointBalance = async (userId, locationId) => {
  if (!userId || !locationId) return 0

  const [result] = await PointTransaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        locationId,
      },
    },
    {
      $group: {
        _id: null,
        balance: { $sum: '$points' },
      },
    },
  ])

  return result?.balance || 0
}

const ensureLegacyPointsAreScoped = async (user) => {
  const currentLocationId = `${user?.selectedLocation?.locationId || ''}`.trim()
  const currentPoints = Number(user?.points || 0)

  if (!user?._id || !currentLocationId || currentPoints <= 0) return

  const existingLocationTransactions = await PointTransaction.exists({
    user: user._id,
    locationId: currentLocationId,
  })

  if (existingLocationTransactions) return

  await PointTransaction.create({
    user: user._id,
    type: 'adjustment',
    points: currentPoints,
    balance: currentPoints,
    description: 'Legacy points balance linked to selected location',
    locationId: currentLocationId,
    metadata: {
      rewardKey: 'legacy_location_balance',
      transactionType: 'credit',
      source: 'select_spa_location_switch',
    },
  })
}

const upsertAssignedLocation = (user, locationData) => {
  if (!locationData?.locationId) return

  const existingLocations = Array.isArray(user.assignedLocations)
    ? user.assignedLocations.filter((location) => location?.locationId)
    : []
  const existingIndex = existingLocations.findIndex(
    (location) => location.locationId === locationData.locationId
  )
  const assignmentData = {
    ...locationData,
    assignedAt: new Date(),
  }

  if (existingIndex >= 0) {
    existingLocations[existingIndex] = {
      ...existingLocations[existingIndex],
      ...assignmentData,
    }
  } else {
    existingLocations.push(assignmentData)
  }

  user.assignedLocations = existingLocations
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
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100)
    const search = (req.query.search || '').trim()
    const role = (req.query.role || '').trim()
    const assignedOnly = req.query.assignedOnly === 'true'
    const unassignedOnly = req.query.unassignedOnly === 'true'
    const requestedLocationId = `${req.query.locationId || ''}`.trim()
    const activeLocationId = resolveManagementLocationId(
      req.user,
      requestedLocationId
    )
    const locationId = requestedLocationId
    const sortBy = req.query.sortBy || 'createdAt'
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1

    const cacheKey = getUsersListCacheKey({
      userId: req.user._id?.toString(),
      role: req.user.role,
      page,
      limit,
      search,
      roleFilter: role,
      assignedOnly,
      unassignedOnly,
      locationId,
      sortBy,
      sortOrder: req.query.sortOrder === 'asc' ? 'asc' : 'desc',
    })
    const cachedPayload = getCachedUsersList(cacheKey)
    if (cachedPayload) {
      return res.status(200).json(cachedPayload)
    }

    // Build filters using AND conditions so search/location/role filters can all apply.
    const andFilters = [{ isDeleted: false }]

    // Add filters from middleware if any
    if (req.userFilters) {
      andFilters.push(req.userFilters)
    }

    // Search filter (name or email)
    if (search) {
      andFilters.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      })
    }

    // Role filter
    if (role && role !== 'all') {
      if (role === 'assignable') {
        andFilters.push({ role: { $in: ['admin', 'spa'] } })
      } else {
        andFilters.push({ role })
      }
    }

    if (assignedOnly && unassignedOnly) {
      return next(
        createError(400, 'assignedOnly and unassignedOnly cannot both be true')
      )
    }

    if (assignedOnly) {
      andFilters.push({
        $or: [
          {
            'selectedLocation.locationId': {
              $exists: true,
              $nin: [null, ''],
            },
          },
          {
            'spaLocation.locationId': {
              $exists: true,
              $nin: [null, ''],
            },
          },
          {
            'assignedLocations.locationId': {
              $exists: true,
              $nin: [null, ''],
            },
          },
        ],
      })
    }

    if (unassignedOnly) {
      andFilters.push({
        $and: [
          {
            $or: [
              { 'selectedLocation.locationId': { $exists: false } },
              { 'selectedLocation.locationId': { $in: [null, ''] } },
            ],
          },
          {
            $or: [
              { 'spaLocation.locationId': { $exists: false } },
              { 'spaLocation.locationId': { $in: [null, ''] } },
            ],
          },
          {
            $or: [
              { assignedLocations: { $exists: false } },
              { assignedLocations: { $size: 0 } },
              { 'assignedLocations.locationId': { $in: [null, ''] } },
            ],
          },
        ],
      })
    }

    if (requestedLocationId && !activeLocationId) {
      return next(createError(403, 'You cannot view users for this location'))
    }

    if (requestedLocationId && req.user.role !== 'super-admin') {
      andFilters.push(buildUserLocationMembershipFilter(activeLocationId))
    }

    // Role-based access control
    if (req.user.role === 'spa') {
      // Spa users can only see users in their spa location
      const spaLocationId = activeLocationId
      if (spaLocationId) {
        andFilters.push(buildUserLocationMembershipFilter(spaLocationId))
        andFilters.push({ role: 'user' }) // Spa users can only see regular users
      } else {
        // If spa user doesn't have spa location, return empty result
        const emptyPayload = {
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
              assignedOnly,
              unassignedOnly,
              sortBy,
              sortOrder: req.query.sortOrder || 'desc',
            },
          },
        }
        setCachedUsersList(cacheKey, emptyPayload)
        return res.status(200).json(emptyPayload)
      }
    } else if (req.user.role === 'admin') {
      // Admins cannot see super-admins.
      andFilters.push({ role: { $ne: 'super-admin' } })

      // If admin has an assigned location, scope contacts to that spa's users.
      const adminLocationId = activeLocationId
      if (adminLocationId) {
        andFilters.push(buildUserLocationMembershipFilter(adminLocationId))
      }
    }
    // Super-admins can see all users unless they explicitly pass locationId.
    if (requestedLocationId && req.user.role === 'super-admin') {
      andFilters.push(buildUserLocationMembershipFilter(requestedLocationId))
    }

    const filters = andFilters.length === 1 ? andFilters[0] : { $and: andFilters }

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
      .lean()

    const pointsLocationId = activeLocationId || requestedLocationId
    if (pointsLocationId && users.length > 0) {
      const userIds = users.map((user) => user._id).filter(Boolean)
      const pointBalances = await PointTransaction.aggregate([
        {
          $match: {
            user: { $in: userIds },
            locationId: pointsLocationId,
          },
        },
        {
          $group: {
            _id: '$user',
            balance: { $sum: '$points' },
          },
        },
      ])
      const pointsByUserId = new Map(
        pointBalances.map((entry) => [String(entry._id), entry.balance || 0])
      )
      users.forEach((user) => {
        user.locationPoints = pointsByUserId.get(String(user._id)) || 0
        user.points = user.locationPoints
      })
    }

    const pagination = {
      currentPage: page,
      totalPages,
      totalUsers: total,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      limit,
    }

    const payload = {
      status: 'success',
      results: users.length,
      data: {
        users,
        pagination,
        filters: {
          search,
          role,
          assignedOnly,
          unassignedOnly,
          locationId,
          sortBy,
          sortOrder: req.query.sortOrder || 'desc',
        },
      },
    }
    setCachedUsersList(cacheKey, payload)

    res.status(200).json(payload)
  } catch (error) {
    console.error('Error in getAllUsers:', error)
    next(error)
  }
}

export const getAssignableUsers = async (req, res, next) => {
  try {
    // Check permissions
    if (!['spa', 'admin', 'super-admin'].includes(req.user.role)) {
      return next(
        createError(
          403,
          'Access denied. Spa, Admin, or Super-Admin rights required.'
        )
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
    debugLog(
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

    console.info('[Auth:Signup] Incoming signup request', {
      email: `${email || ''}`.trim().toLowerCase(),
      hasPhone: Boolean(`${phone || ''}`.trim()),
      assignedLocation: `${assignedLocation || ''}`.trim(),
    })

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
    if (locationData) userData.assignedLocations = [locationData]

    const newUser = await User.create(userData)
    debugInfo('[Auth:Signup] User created', {
      userId: `${newUser?._id || ''}`,
      email: newUser?.email || '',
      hasPhone: Boolean(`${newUser?.phone || ''}`.trim()),
      assignedLocation: locationData?.locationId || '',
    })

    // If this email scanned a QR before account creation, auto-claim those
    // pending rewards immediately after signup.
    await processPendingQrClaimsForUser(newUser)

    // Process referral if provided
    let referralResult = { success: false }
    if (referralCode && referralCode.trim()) {
      referralResult = await processInitialReferral(
        newUser._id,
        referralCode.trim()
      )
    }

    const signupWorkflowResult = await attemptSignupWorkflowEnrollment({
      user: newUser,
      locationId: locationData?.locationId || '',
    })
    console.info('[Auth:Signup] Signup automation result', {
      userId: `${newUser?._id || ''}`,
      locationId: locationData?.locationId || '',
      attempted: Boolean(signupWorkflowResult?.attempted),
      success: Boolean(signupWorkflowResult?.success),
      mode: signupWorkflowResult?.mode || '',
      contactId: `${signupWorkflowResult?.contactId || ''}`,
      reason: `${signupWorkflowResult?.reason || ''}`,
      errors: signupWorkflowResult?.errors || [],
    })

    if (
      signupWorkflowResult?.success &&
      `${signupWorkflowResult?.contactId || ''}`.trim() &&
      `${newUser?.ghlContactId || ''}`.trim() !==
        `${signupWorkflowResult.contactId}`.trim()
    ) {
      try {
        newUser.ghlContactId = `${signupWorkflowResult.contactId}`.trim()
        await newUser.save()
      } catch (contactSaveError) {
        debugWarn('[Auth:SignupWorkflow] Failed saving ghlContactId', {
          userId: `${newUser?._id || ''}`,
          contactId: `${signupWorkflowResult.contactId || ''}`,
          error: contactSaveError?.message || 'Unknown error',
        })
      }
    }

    if (!signupWorkflowResult?.success && signupWorkflowResult?.attempted) {
      const incompleteInfo = {
        userId: `${newUser?._id || ''}`,
        locationId: locationData?.locationId || '',
        reason: signupWorkflowResult?.reason || 'Unknown',
        errors: signupWorkflowResult?.errors || [],
      }
      debugWarn('[Auth:SignupWorkflow] Enrollment not completed after signup', incompleteInfo)
      console.warn('[Auth:SignupWorkflow] Enrollment not completed after signup', incompleteInfo)
    }

    const responseUser = {
      ...newUser.toObject(),
      password: undefined,
      referralProcessed: referralResult.success,
      referralMessage: referralResult.message,
    }

    createSendToken(responseUser, 201, res, {
      signupWorkflow: signupWorkflowResult,
    })
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
    if (locationData || spaLocationData) {
      userData.assignedLocations = [locationData || spaLocationData]
    }

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
    const { userId, locationId, locationIds } = req.body

    // Check permissions
    if (!['admin', 'super-admin'].includes(req.user.role)) {
      return next(
        createError(403, 'Access denied. Admin or Super-Admin rights required.')
      )
    }

    const requestedLocationIds = Array.isArray(locationIds)
      ? locationIds
      : [locationId]
    const normalizedLocationIds = [
      ...new Set(
        requestedLocationIds
          .map((value) => `${value || ''}`.trim())
          .filter(Boolean)
      ),
    ]

    if (!userId || normalizedLocationIds.length === 0) {
      return next(createError(400, 'User ID and at least one Location ID are required'))
    }

    if (
      normalizedLocationIds.some(
        (id) => !mongoose.Types.ObjectId.isValid(id)
      )
    ) {
      return next(createError(400, 'Invalid location ID'))
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

    // Find the requested locations. Incoming ids are Mongo document ids from the UI.
    const locations = await Location.find({ _id: { $in: normalizedLocationIds } })
    if (locations.length !== normalizedLocationIds.length) {
      return next(createError(404, 'One or more locations were not found'))
    }

    if (locations.some((location) => !location.isActive)) {
      return next(createError(400, 'Cannot assign inactive location'))
    }

    // Prepare location data based on user role
    const toLocationData = (location) => ({
      locationId: location.locationId,
      locationName: location.name,
      locationAddress: location.address,
      locationPhone: location.phone,
      reviewLink: location.reviewLink,
      logo: location.logo,
      subdomain: location.subdomain,
      favicon: location.favicon,
      themeColor: location.themeColor,
    })

    const assignedLocations = locations.map((location) => ({
      ...toLocationData(location),
      assignedAt: new Date(),
    }))
    const primaryLocation = assignedLocations[0]

    if (user.role === 'spa') {
      // spa users keep a primary spaLocation for legacy app flows.
      user.spaLocation = {
        ...primaryLocation,
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
      // Other roles keep a primary selectedLocation for legacy app flows.
      user.selectedLocation = {
        ...primaryLocation,
        selectedAt: new Date(),
      }
    }

    user.assignedLocations = assignedLocations
    await user.save()
    clearUsersListCache()

    res.status(200).json({
      status: 'success',
      message:
        assignedLocations.length > 1
          ? 'Locations assigned successfully'
          : 'Location assigned successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          selectedLocation: user.selectedLocation,
          spaLocation: user.spaLocation,
          assignedLocations: user.assignedLocations,
        },
        assignedLocation: locations[0],
        assignedLocations: locations,
      },
    })
  } catch (error) {
    console.error('Error assigning location:', error)
    next(createError(500, 'Failed to assign location'))
  }
}

export const unassignLocationFromUser = async (req, res, next) => {
  try {
    const { userId } = req.body

    if (!['admin', 'super-admin'].includes(req.user.role)) {
      return next(
        createError(403, 'Access denied. Admin or Super-Admin rights required.')
      )
    }

    if (!userId) {
      return next(createError(400, 'User ID is required'))
    }

    const user = await User.findById(userId)
    if (!user) {
      return next(createError(404, 'User not found'))
    }

    const canUnassign =
      req.user.role === 'super-admin' ||
      (req.user.role === 'admin' && user.role === 'spa')

    if (!canUnassign) {
      return next(
        createError(403, 'You can only unassign locations from eligible users')
      )
    }

    // Spa users require spaLocation by schema, so they cannot be fully unassigned.
    if (user.role === 'spa') {
      return next(
        createError(
          400,
          'Spa users must remain assigned to a location. Reassign them instead.'
        )
      )
    }

    user.selectedLocation = {
      locationId: null,
      locationName: null,
      locationAddress: null,
      locationPhone: null,
      logo: null,
      selectedAt: null,
    }

    await user.save()

    res.status(200).json({
      status: 'success',
      message: 'Location unassigned successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          selectedLocation: user.selectedLocation,
          spaLocation: user.spaLocation,
        },
      },
    })
  } catch (error) {
    console.error('Error unassigning location:', error)
    next(createError(500, 'Failed to unassign location'))
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
    debugLog('Onboarding Status Debug:', {
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
            debugLog(`Auto-synced logo for user ${user.email}`);
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
      spaLocation: user.spaLocation, // For spa users
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

    // AUTO-SYNC: only fetch location when active location is missing logo
    if (hasSelectedSpa) {
      try {
        const activeLoc =
          user.role === 'spa' ? user.spaLocation : user.selectedLocation
        const shouldSyncLogo = !!(activeLoc?.locationId && !activeLoc?.logo)

        if (shouldSyncLogo) {
          const location = await Location.findOne({
            locationId: activeLoc.locationId,
          })
          if (location && location.logo && activeLoc.logo !== location.logo) {
            if (user.role === 'spa') {
              user.spaLocation.logo = location.logo
              user.markModified('spaLocation')
            } else {
              user.selectedLocation.logo = location.logo
              user.markModified('selectedLocation')
            }
            await user.save({ validateBeforeSave: false })
          }
        }
      } catch (syncError) {
        console.error('Auto-sync failed in getCurrentUser:', syncError)
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
    const { type, amount, reason, locationId = '' } = req.body

    if (!['spa', 'admin', 'super-admin'].includes(req.user.role)) {
      return next(
        createError(403, 'Access denied. Spa, Admin, or Super-Admin rights required.')
      )
    }

    if (!reason || !`${reason}`.trim()) {
      return next(createError(400, 'Reason is required for point adjustments'))
    }
    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      return next(createError(400, 'Amount must be a valid non-negative number'))
    }

    const user = await User.findById(userId)
    if (!user) {
      return next(createError(404, 'User not found'))
    }

    const activeLocationId = resolveManagementLocationId(req.user, locationId)
    if (!activeLocationId) {
      return next(createError(400, 'Location ID is required for point adjustments'))
    }
    if (!canAccessLocation(user, activeLocationId)) {
      return next(createError(403, 'User is not assigned to this location'))
    }

    const oldPoints = await getLocationScopedPointBalance(user._id, activeLocationId)
    let newPoints = oldPoints

    switch (type) {
      case 'add':
        newPoints += numericAmount
        break
      case 'remove':
        newPoints = Math.max(0, newPoints - numericAmount)
        break
      case 'set':
        newPoints = numericAmount
        break
      default:
        return next(createError(400, 'Invalid adjustment type'))
    }

    user.points = newPoints
    await user.save()

    const pointDelta = newPoints - oldPoints
    await PointTransaction.create({
      user: user._id,
      type: 'adjustment',
      points: pointDelta,
      balance: newPoints,
      description: `${type} points: ${reason}`,
      locationId: activeLocationId,
      metadata: {
        transactionType: pointDelta >= 0 ? 'credit' : 'debit',
        adjustmentType: type,
        adjustedBy: req.user._id?.toString(),
      },
    })

    let notificationTitle = 'Points Updated'
    let notificationMessage = ''

    switch (type) {
      case 'add':
        notificationMessage = `You received ${numericAmount} points! Your balance is now ${newPoints} points.`
        break
      case 'remove':
        notificationMessage = `${numericAmount} points were deducted from your account. Your balance is now ${newPoints} points.`
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
          adjustment: numericAmount,
          type,
          reason,
          adjustedBy: req.user.name,
          locationId: activeLocationId,
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

export const adjustUserCredits = async (req, res, next) => {
  try {
    const { userId } = req.params
    const { type, amount, reason } = req.body

    if (!['spa', 'admin', 'super-admin'].includes(req.user.role)) {
      return next(
        createError(403, 'Access denied. Spa, Admin, or Super-Admin rights required.')
      )
    }

    if (!reason || !`${reason}`.trim()) {
      return next(createError(400, 'Reason is required for credit adjustments'))
    }

    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      return next(createError(400, 'Amount must be a valid non-negative number'))
    }

    const user = await User.findById(userId)
    if (!user) {
      return next(createError(404, 'User not found'))
    }

    const oldCredits = Math.max(0, Number(user.credits || 0))
    let newCredits = oldCredits

    switch (type) {
      case 'add':
        newCredits += numericAmount
        break
      case 'remove':
        newCredits = Math.max(0, oldCredits - numericAmount)
        break
      case 'set':
        newCredits = numericAmount
        break
      default:
        return next(createError(400, 'Invalid adjustment type'))
    }

    user.credits = newCredits
    await user.save()

    let notificationTitle = 'Credits Updated'
    let notificationMessage = ''

    switch (type) {
      case 'add':
        notificationMessage = `You received ${numericAmount} credits. Your balance is now ${newCredits} credits.`
        break
      case 'remove':
        notificationMessage = `${numericAmount} credits were deducted from your account. Your balance is now ${newCredits} credits.`
        break
      case 'set':
        notificationMessage = `Your credits balance has been set to ${newCredits} credits.`
        break
    }

    notificationMessage += ` Reason: ${`${reason}`.trim()}`

    await createSystemNotification(
      userId,
      notificationTitle,
      notificationMessage,
      {
        category: 'credits',
        priority: 'normal',
        metadata: {
          oldCredits,
          newCredits,
          adjustment: numericAmount,
          type,
          reason: `${reason}`.trim(),
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

// Regenerate referral code for a user without touching stats
export const regenerateReferralCode = async (req, res, next) => {
  try {
    const { userId } = req.params

    if (!['admin', 'super-admin'].includes(req.user.role)) {
      return next(
        createError(403, 'Access denied. Admin or Super-Admin rights required.')
      )
    }

    const targetUser = await User.findById(userId)
    if (!targetUser) {
      return next(createError(404, 'User not found'))
    }

    if (req.user.role === 'admin') {
      if (['admin', 'super-admin'].includes(targetUser.role)) {
        return next(createError(403, 'Cannot update admin or super-admin users'))
      }
      if (req.user._id.toString() === targetUser._id.toString()) {
        return next(createError(400, 'Cannot update your own referral code'))
      }
    }

    const newCode = await generateUniqueReferralCode()
    targetUser.referralCode = newCode
    await targetUser.save()

    await Referral.updateMany(
      { referrer: targetUser._id },
      { $set: { referralCode: newCode } }
    )

    res.status(200).json({
      status: 'success',
      data: { referralCode: newCode, userId: targetUser._id },
    })
  } catch (error) {
    console.error('Error regenerating referral code:', error)
    next(createError(500, 'Failed to regenerate referral code'))
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

    if (req.user.role !== 'super-admin') {
      return next(createError(403, 'Super-Admin access required'))
    }

    // Prevent deleting yourself
    if (req.user.id === userId) {
      return next(createError(400, 'Cannot delete your own account'))
    }

    const targetUser = await User.findById(userId)
    if (!targetUser) {
      return next(createError(404, 'No user found with that ID'))
    }

    // Keep super-admin accounts protected from deletion.
    if (targetUser.role === 'super-admin') {
      return next(createError(403, 'Cannot delete super-admin user'))
    }

    await User.findByIdAndDelete(userId)

    res.status(200).json({
      status: 'success',
      message: 'User permanently deleted successfully',
    })
  } catch (error) {
    next(error)
  }
}

export const getUserProfile = async (req, res, next) => {
  try {
    const userId = req.params.id
    const user = await User.findById(userId)

    if (!user || user.isDeleted) {
      return next(createError(404, 'No user found with that ID'))
    }

    const isOwnProfile = req.user.id === userId
    const isAdminOrAbove = ['admin', 'super-admin'].includes(req.user.role)
    const requestedLocationId = `${req.query?.locationId || ''}`.trim()
    const activeLocationId = resolveManagementLocationId(req.user, requestedLocationId)
    const isSpaViewingOwnClient =
      req.user.role === 'spa' &&
      user.role === 'user' &&
      !!activeLocationId &&
      getUserAccessibleLocationIds(user).includes(activeLocationId)

    if (!isOwnProfile && !isAdminOrAbove && !isSpaViewingOwnClient) {
      return next(createError(403, 'You can only view allowed client profiles'))
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

export const forgotPassword = async (req, res, next) => {
  try {
    const email = `${req.body?.email || ''}`.trim().toLowerCase()
    const locationId = `${req.body?.locationId || ''}`.trim()
    const requestSubdomain = `${req.subdomain || ''}`.trim().toLowerCase()

    if (!email) {
      return next(createError(400, 'Please provide your email address'))
    }

    const user = await User.findOne({
      email,
      isDeleted: { $ne: true },
    }).select('+password')

    // Always return the same message to prevent account enumeration.
    const successMessage =
      'If an account exists with this email, a password reset link has been sent.'

    if (!user || !user.password) {
      return res.status(200).json({
        status: 'success',
        message: successMessage,
      })
    }

    const resetToken = crypto.randomBytes(32).toString('hex')
    const hashedResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex')

    user.passwordResetToken = hashedResetToken
    user.passwordResetExpires = new Date(
      Date.now() + PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000
    )
    await user.save({ validateBeforeSave: false })

    const brandingContext = await resolvePasswordResetBranding({
      user,
      locationId,
      requestSubdomain,
    })

    const resetUrl = buildPasswordResetUrl({
      token: resetToken,
      locationId: brandingContext.locationId,
      subdomain: brandingContext.subdomain,
    })

    try {
      await sendPasswordResetEmail({
        to: user.email,
        resetUrl,
        appName: brandingContext.brandName,
        brandColor: brandingContext.brandColor,
        logoUrl: brandingContext.logoUrl,
        subdomain: brandingContext.subdomain,
        rootDomain: DEFAULT_APP_ROOT_DOMAIN,
      })
    } catch (mailError) {
      console.error('Failed to send password reset email:', mailError)
      user.passwordResetToken = undefined
      user.passwordResetExpires = undefined
      await user.save({ validateBeforeSave: false })
      return next(
        createError(
          500,
          'Unable to send password reset email right now. Please try again.'
        )
      )
    }

    res.status(200).json({
      status: 'success',
      message: successMessage,
    })
  } catch (error) {
    next(error)
  }
}

export const resetPassword = async (req, res, next) => {
  try {
    const token = `${req.body?.token || ''}`.trim()
    const newPassword = `${req.body?.newPassword || ''}`

    if (!token || !newPassword) {
      return next(createError(400, 'Token and new password are required'))
    }

    if (newPassword.length < 8) {
      return next(createError(400, 'Password must be at least 8 characters long'))
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
      isDeleted: { $ne: true },
    }).select('+passwordResetToken +passwordResetExpires +password')

    if (!user) {
      return next(createError(400, 'Reset link is invalid or has expired'))
    }

    user.password = newPassword
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined
    await user.save()

    res.status(200).json({
      status: 'success',
      message: 'Your password has been reset successfully. Please sign in.',
    })
  } catch (error) {
    next(error)
  }
}

export const selectSpa = async (req, res, next) => {
  try {
    const { locationId, referralCode } = req.body
    const userId = req.user.id

    debugLog('selectSpa called with:', { locationId, referralCode, userId })

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

    debugLog('Found location:', location)

    await ensureLegacyPointsAreScoped(user)

    // Update user's selected location with actual data
    const locationData = {
      locationId: location.locationId,
      locationName: location.name,
      locationAddress: location.address,
      locationPhone: location.phone,
      reviewLink: location.reviewLink,
      logo: location.logo,
      subdomain: location.subdomain,
      favicon: location.favicon,
      themeColor: location.themeColor,
      selectedAt: new Date(),
    }

    user.selectedLocation = locationData
    upsertAssignedLocation(user, locationData)

    // Mark profile as completed since they selected a spa
    user.profileCompleted = true

    debugLog('User updated with location:', user.selectedLocation)

    let locationScopedBalance = await getLocationScopedPointBalance(
      user._id,
      location.locationId
    )

    const profileCompletionMethod = await getPointsMethodForLocation(
      location.locationId,
      'profile_completion'
    )
    const profileCompletionPoints =
      profileCompletionMethod?.isActive &&
      (profileCompletionMethod?.pointsValue || 0) > 0
        ? profileCompletionMethod.pointsValue
        : 0

    // Initialize rewards response
    let rewardResponse = {
      profileCompletion: profileCompletionPoints,
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
        const referredPoints = Number(referralResult?.data?.referredPoints || 0)
        if (referralResult?.success && referredPoints > 0) {
          locationScopedBalance += referredPoints
          await PointTransaction.create({
            user: user._id,
            type: 'referral',
            points: referredPoints,
            balance: locationScopedBalance,
            description: `Referral bonus for joining ${location.name}`,
            locationId: location.locationId,
            metadata: {
              rewardKey: 'referral',
              transactionType: 'credit',
              referralCode: referralCode.trim().toUpperCase(),
              locationName: location.name,
            },
          })
        }
        debugLog('Referral processing result:', referralResult)
      } catch (error) {
        console.error('Referral processing error:', error)
        // Don't fail the entire request if referral fails
      }
    }

    const alreadyAwardedProfileCompletionForLocation = Boolean(
      await PointTransaction.exists({
        user: user._id,
        locationId: location.locationId,
        type: 'signup_bonus',
        'metadata.rewardKey': 'profile_completion',
      })
    )
    const legacyProfileCompletionForThisLocation = Boolean(
      user.onboardingRewards?.profileCompletion?.awarded &&
        user.onboardingRewards?.profileCompletion?.locationId === location.locationId
    )

    const shouldAwardProfileCompletion =
      rewardResponse.profileCompletion > 0 &&
      !alreadyAwardedProfileCompletionForLocation &&
      !legacyProfileCompletionForThisLocation

    // Award profile completion points once per selected location.
    if (shouldAwardProfileCompletion) {
      locationScopedBalance += rewardResponse.profileCompletion
      user.onboardingRewards = user.onboardingRewards || {}
      user.onboardingRewards.profileCompletion = {
        awarded: true,
        awardedAt: new Date(),
        pointsAwarded: rewardResponse.profileCompletion,
        locationId: location.locationId,
      }

      await PointTransaction.create({
        user: user._id,
        type: 'signup_bonus',
        points: rewardResponse.profileCompletion,
        balance: locationScopedBalance,
        description: `Profile completion bonus for ${location.name}`,
        locationId: location.locationId,
        metadata: {
          rewardKey: 'profile_completion',
          transactionType: 'credit',
          locationName: location.name,
        },
      })
    } else {
      rewardResponse.profileCompletion = 0
    }

    user.points = locationScopedBalance
    await user.save()

    res.status(200).json({
      status: 'success',
      message: 'Spa selected successfully',
      data: {
        user: {
          id: user._id,
          selectedLocation: user.selectedLocation,
          assignedLocations: user.assignedLocations,
          profileCompleted: user.profileCompleted,
          points: user.points,
          locationPoints: locationScopedBalance,
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

    const locationIdForReferral =
      referredUser.selectedLocation?.locationId ||
      referrer.selectedLocation?.locationId ||
      null
    if (locationIdForReferral) {
      const referralMethod = await getPointsMethodForLocation(
        locationIdForReferral,
        'referral'
      )
      if (!referralMethod?.isActive) {
        referralRewards.referrerPoints = 0
        referralRewards.referredPoints = 0
      }
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
