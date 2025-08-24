// File: server/controller/auth.js - FIXED REFERRAL SYSTEM
import axios from 'axios'
import jwt from 'jsonwebtoken'
import { createError } from '../error.js'
import Location from '../models/Location.js'
import Referral from '../models/Referral.js'
import ReferralConfig from '../models/ReferralConfig.js'
import User from '../models/User.js'
import { createSystemNotification } from './notification.js'

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

    // Check if all required fields are provided
    if (!name || !email || !password) {
      return next(createError(400, 'Please provide name, email and password'))
    }

    // Set default role to user if not provided
    const userRole = role || 'user'

    // Check if user with this email already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return next(createError(400, 'User with this email already exists'))
    }

    // Validate assignedLocation if provided
    let locationData = null
    if (assignedLocation) {
      const location = await Location.findOne({
        _id: assignedLocation,
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
        selectedAt: new Date(),
      }
    }

    // Prepare user data
    const userData = {
      name,
      email,
      password,
      role: userRole,
    }

    // Add optional fields if provided
    if (phone) userData.phone = phone
    if (dateOfBirth) userData.dateOfBirth = dateOfBirth
    if (locationData) userData.selectedLocation = locationData

    // Create new user (password will be hashed by the pre-save middleware)
    const newUser = await User.create(userData)

    // Process referral if provided - but keep it PENDING until spa selection
    let referralResult = { success: false }
    if (referralCode && referralCode.trim()) {
      referralResult = await processInitialReferral(
        newUser._id,
        referralCode.trim()
      )
      if (referralResult.success) {
        console.log(
          '✅ Referral created (pending spa selection):',
          referralResult.message
        )
      } else {
        console.log('⚠️ Referral failed:', referralResult.message)
      }
    }

    // Create response user object (remove sensitive data)
    const responseUser = {
      ...newUser.toObject(),
      password: undefined,
      referralProcessed: referralResult.success,
      referralMessage: referralResult.message,
    }

    // Send token to the new user
    createSendToken(responseUser, 201, res)
  } catch (err) {
    console.error('Error in signup:', err)
    next(createError(500, 'An unexpected error occurred during signup'))
  }
}

// UPDATED: Create initial referral record (pending until spa selection)
const processInitialReferral = async (referredUserId, referralCode) => {
  try {
    // Find the referrer by referral code
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

    // Get referred user
    const referredUser = await User.findById(referredUserId)
    if (!referredUser) {
      return {
        success: false,
        message: 'Referred user not found',
      }
    }

    // Check if user is trying to refer themselves
    if (referrer._id.toString() === referredUserId.toString()) {
      return {
        success: false,
        message: 'Cannot refer yourself',
      }
    }

    // Check if user was already referred
    if (referredUser.referredBy) {
      return {
        success: false,
        message: 'User was already referred by someone else',
      }
    }

    // Check if referral already exists
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

    // Create referral record but DON'T award points yet - wait for spa selection
    const referral = await Referral.create({
      referrer: referrer._id,
      referred: referredUserId,
      referralCode: referralCode.toUpperCase(),
      rewardType: 'signup',
      status: 'pending', // Keep as pending until spa is selected
      referrerReward: {
        points: 0, // Will be calculated when spa is selected
        awarded: false,
      },
      referredReward: {
        points: 0, // Will be calculated when spa is selected
        awarded: false,
      },
      metadata: {
        notes: 'Waiting for spa selection to apply rewards',
      },
    })

    // Update referred user
    referredUser.referredBy = referrer._id
    await referredUser.save()

    // Update referrer stats
    referrer.referralStats.totalReferrals += 1
    referrer.referralStats.activeReferrals += 1
    await referrer.save()

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

// NEW: Helper function to get location details
const getLocationDetails = async (locationId) => {
  try {
    // First try to find in our Location collection
    const location = await Location.findOne({
      $or: [{ locationId: locationId }, { _id: locationId }],
      isActive: true,
    })

    if (location) {
      return {
        locationId: location.locationId,
        name: location.name,
        address: location.address,
        phone: location.phone,
      }
    }

    // If not found, you might want to fetch from external API
    // For now, return null
    return null
  } catch (error) {
    console.error('Error getting location details:', error)
    return null
  }
}

// UPDATED: Select Spa/Location for user with proper referral reward processing
export const selectSpa = async (req, res, next) => {
  try {
    const { locationId, referralCode } = req.body
    const userId = req.user._id

    console.log('🏢 Spa selection started:', {
      userId,
      locationId,
      referralCode,
    })

    // Get user
    const user = await User.findById(userId)
    if (!user) {
      return next(createError(404, 'User not found'))
    }

    // Check if user already selected a spa
    if (user.selectedLocation?.locationId) {
      return next(createError(400, 'You have already selected a spa'))
    }

    // Get location details
    const location = await getLocationDetails(locationId)
    if (!location) {
      return next(createError(404, 'Location not found'))
    }

    console.log('📍 Location found:', location)

    // Update user's selected location
    user.selectedLocation = {
      locationId: location.locationId || locationId,
      locationName: location.name,
      locationAddress: location.address,
      locationPhone: location.phone,
      selectedAt: new Date(),
    }

    // Award profile completion points
    const profileCompletionPoints = 100
    user.points = (user.points || 0) + profileCompletionPoints
    user.profileCompleted = true
    user.onboardingCompleted = true

    await user.save()

    console.log(
      '✅ User updated with spa selection and profile completion points'
    )

    // Process referral rewards if user was referred
    let referralRewardResult = null
    if (user.referredBy) {
      console.log('🎁 Processing referral rewards for existing referral')
      referralRewardResult = await processReferralRewards(user, locationId)
    }

    // Process new referral code if provided during spa selection
    let newReferralResult = null
    if (referralCode && !user.referredBy) {
      console.log('🆕 Processing new referral code during spa selection')
      newReferralResult = await processInitialReferral(userId, referralCode)
      if (newReferralResult.success) {
        // Reload user to get updated referredBy field
        const updatedUser = await User.findById(userId)
        // Immediately process the rewards since spa is being selected
        referralRewardResult = await processReferralRewards(
          updatedUser,
          locationId
        )
      }
    }

    // Get final user state
    const finalUser = await User.findById(userId)

    res.status(200).json({
      status: 'success',
      message: 'Spa selected successfully',
      data: {
        user: {
          id: finalUser._id,
          name: finalUser.name,
          email: finalUser.email,
          selectedLocation: finalUser.selectedLocation,
          points: finalUser.points,
          profileCompleted: finalUser.profileCompleted,
          onboardingCompleted: finalUser.onboardingCompleted,
        },
        rewards: {
          profileCompletion: profileCompletionPoints,
          referral: referralRewardResult,
          newReferral: newReferralResult,
        },
      },
    })
  } catch (error) {
    console.error('❌ Error selecting spa:', error)
    next(createError(500, error.message || 'Failed to select spa'))
  }
}

// UPDATED: Process referral rewards with spa-specific configuration
const processReferralRewards = async (referredUser, locationId) => {
  try {
    console.log('🎯 Processing referral rewards:', {
      referredUserId: referredUser._id,
      locationId,
    })

    // Find pending referral for this user
    const pendingReferral = await Referral.findOne({
      referred: referredUser._id,
      status: 'pending',
      rewardType: 'signup',
    }).populate('referrer', 'name email referralStats')

    if (!pendingReferral) {
      console.log('⚠️ No pending referral found')
      return { success: false, message: 'No pending referral found' }
    }

    const referrer = pendingReferral.referrer
    console.log('👤 Referrer found:', {
      referrerId: referrer._id,
      referrerName: referrer.name,
    })

    // Get active referral config
    const config = await ReferralConfig.getActiveConfig()
    console.log('⚙️ Got referral config')

    // Calculate spa-specific reward points
    const rewardCalculation = config.calculateSpaReward(
      'signup',
      locationId,
      referrer.referralStats?.currentTier || 'bronze'
    )

    console.log('💰 Reward calculation result:', rewardCalculation)

    // Update referral with calculated points
    pendingReferral.referrerReward.points = rewardCalculation.referrerPoints
    pendingReferral.referredReward.points = rewardCalculation.referredPoints
    pendingReferral.metadata.notes = `Spa-specific rewards applied for ${rewardCalculation.spaConfig.locationName}`
    pendingReferral.metadata.locationId = locationId
    pendingReferral.metadata.spaConfig = rewardCalculation.spaConfig

    // Complete the referral and award points
    await pendingReferral.complete()

    console.log('✅ Referral completed and points awarded')

    // Send notifications
    if (rewardCalculation.referrerPoints > 0) {
      await createSystemNotification(
        referrer._id,
        'Referral Reward! 🎉',
        `${referredUser.name} joined ${rewardCalculation.spaConfig.locationName}! You earned ${rewardCalculation.referrerPoints} points.`,
        {
          category: 'referral',
          priority: 'high',
          metadata: {
            type: 'referrer_reward',
            points: rewardCalculation.referrerPoints,
            referredUserName: referredUser.name,
            spaName: rewardCalculation.spaConfig.locationName,
          },
        }
      )
    }

    if (rewardCalculation.referredPoints > 0) {
      await createSystemNotification(
        referredUser._id,
        'Referral Bonus! 🎁',
        `Welcome to ${rewardCalculation.spaConfig.locationName}! You received ${rewardCalculation.referredPoints} bonus points from ${referrer.name}'s referral.`,
        {
          category: 'referral',
          priority: 'high',
          metadata: {
            type: 'referred_reward',
            points: rewardCalculation.referredPoints,
            referrerName: referrer.name,
            spaName: rewardCalculation.spaConfig.locationName,
          },
        }
      )
    }

    return {
      success: true,
      message: 'Referral rewards processed successfully',
      data: {
        referrerPoints: rewardCalculation.referrerPoints,
        referredPoints: rewardCalculation.referredPoints,
        spaConfig: rewardCalculation.spaConfig,
        referrerName: referrer.name,
      },
    }
  } catch (error) {
    console.error('❌ Error processing referral rewards:', error)
    return {
      success: false,
      message: 'Failed to process referral rewards',
      error: error.message,
    }
  }
}

// Keep all other existing functions unchanged...
export const createTeamMember = async (req, res, next) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return next(createError(403, 'Access denied. Admin rights required.'))
    }

    const { name, email, password, assignedLocation, dateOfBirth } = req.body

    // Check if all required fields are provided
    if (!name || !email || !password) {
      return next(createError(400, 'Please provide name, email and password'))
    }

    // Check if user with this email already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return next(createError(400, 'User with this email already exists'))
    }

    // Validate assignedLocation if provided
    let locationData = null
    if (assignedLocation) {
      const location = await Location.findOne({
        _id: assignedLocation,
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
        selectedAt: new Date(),
      }
    }

    // Prepare user data
    const userData = {
      name,
      email,
      password,
      role: 'team', // Always create as team member
      createdBy: req.user._id, // Track who created this user
    }

    // Add optional fields if provided
    if (dateOfBirth) userData.dateOfBirth = dateOfBirth

    // For team members, set spaLocation instead of selectedLocation
    if (locationData)
      userData.spaLocation = {
        ...locationData,
        setupAt: new Date(),
      }

    // Create new team member
    const newUser = await User.create(userData)

    // Remove password from response
    newUser.password = undefined

    // Send success response (don't send token since admin is creating for someone else)
    res.status(201).json({
      status: 'success',
      message: 'Team member created successfully',
      data: {
        user: newUser,
      },
    })
  } catch (err) {
    console.error('Error in createTeamMember:', err)
    if (err.code === 11000) {
      return next(createError(400, 'User with this email already exists'))
    }
    next(
      createError(
        500,
        'An unexpected error occurred while creating team member'
      )
    )
  }
}

export const signin = async (req, res, next) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return next(createError(400, 'Please provide email and password'))
    }

    const user = await User.findOne({ email }).select('+password')

    if (!user) {
      return next(createError(401, 'Incorrect email or password'))
    }

    // Check if user is a Google user trying to sign in with password
    if (user.authProvider === 'google' && !user.password) {
      return next(
        createError(
          400,
          'This account uses Google Sign-In. Please use "Continue with Google" button.'
        )
      )
    }

    if (!(await user.correctPassword(password, user.password))) {
      return next(createError(401, 'Incorrect email or password'))
    }

    user.lastLogin = new Date()
    await user.save({ validateBeforeSave: false })
    createSendToken(user, 200, res)
  } catch (err) {
    console.error('Error in signin:', err)
    next(createError(500, 'An unexpected error occurred'))
  }
}

export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)

    if (!user) {
      return next(createError(404, 'User not found'))
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

export const updateUser = async (req, res, next) => {
  try {
    const userId = req.params.id
    const { name, email, role } = req.body

    const existingUser = await User.findById(userId)

    if (!existingUser) {
      return next(createError(404, 'No user found with that ID'))
    }

    if (req.user.id !== userId && req.user.role !== 'admin') {
      return next(createError(403, 'You can only update your own profile'))
    }

    if (email && email !== existingUser.email) {
      const emailExists = await User.findOne({ email })
      if (emailExists) {
        return next(createError(400, 'Email is already in use'))
      }
    }

    if (role) {
      if (!['admin', 'user', 'team', 'enterprise'].includes(role)) {
        return next(createError(400, 'Invalid role provided'))
      }
      if (req.user.role !== 'admin') {
        return next(createError(403, 'Only admins can change user roles'))
      }
    }

    const updateData = {}
    if (name) updateData.name = name
    if (email) updateData.email = email
    if (role && req.user.role === 'admin') updateData.role = role

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

export const deleteUser = async (req, res, next) => {
  try {
    const userId = req.params.id

    if (req.user.id !== userId && req.user.role !== 'admin') {
      return next(createError(403, 'You can only delete your own account'))
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { isDeleted: true },
      { new: true }
    )

    if (!user) {
      return next(createError(404, 'No user found with that ID'))
    }

    res.status(200).json({
      status: 'success',
      message: 'User deleted successfully',
    })
  } catch (error) {
    next(error)
  }
}

export const getAllUsers = async (req, res, next) => {
  try {
    // Allow both admin and team roles to access all users
    if (!['admin', 'team'].includes(req.user.role)) {
      return next(
        createError(403, 'Access denied. Admin or Team rights required.')
      )
    }

    const users = await User.find({ isDeleted: false })

    res.status(200).json({
      status: 'success',
      results: users.length,
      data: {
        users,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const adjustUserPoints = async (req, res, next) => {
  try {
    const { userId } = req.params
    const { type, amount, reason } = req.body

    if (req.user.role !== 'admin') {
      return next(createError(403, 'Access denied. Admin rights required.'))
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

    // Send notification to user about points adjustment
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

    // Create system notification
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

// Add notification sending
export const sendNotifications = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return next(createError(403, 'Access denied. Admin rights required.'))
    }

    const { userIds, type, message, subject, channels } = req.body

    // Your notification logic here
    console.log('Sending notifications:', {
      userIds,
      type,
      message,
      subject,
      channels,
    })

    res.status(200).json({
      status: 'success',
      message: 'Notifications sent successfully',
    })
  } catch (error) {
    next(error)
  }
}

export const getUserProfile = async (req, res, next) => {
  try {
    const userId = req.params.id

    if (req.user.id !== userId && req.user.role !== 'admin') {
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

// Google OAuth Controllers
export const googleAuth = (req, res, next) => {
  // This will redirect to Google OAuth
}

export const googleCallback = async (req, res, next) => {
  try {
    const user = req.user

    if (!user) {
      console.error('No user in Google callback')
      return res.redirect(
        `${process.env.CLIENT_URL}?error=authentication_failed`
      )
    }

    // Create GHL contact for Google users if not already created
    if (!user.ghlContactId) {
      const ghlResult = await createGHLContact({
        name: user.name,
        email: user.email,
        role: user.role,
        authProvider: 'google',
      })

      if (ghlResult.success) {
        user.ghlContactId = ghlResult.contact.id
        await user.save()
      }
    }

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
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    }

    res.cookie('jwt', token, cookieOptions)

    const redirectUrl =
      req.query.redirect || req.query.state || process.env.CLIENT_URL

    const separator = redirectUrl.includes('?') ? '&' : '?'
    const finalRedirectUrl = `${redirectUrl}${separator}success=true&token=${token}`

    res.redirect(finalRedirectUrl)
  } catch (error) {
    console.error('Error in Google callback:', error)
    const redirectUrl =
      req.query.redirect || req.query.state || process.env.CLIENT_URL
    const separator = redirectUrl.includes('?') ? '&' : '?'
    res.redirect(`${redirectUrl}${separator}error=server_error`)
  }
}

export const linkGoogleAccount = async (req, res, next) => {
  try {
    const { googleId, googleEmail, googleName, googleAvatar } = req.body
    const userId = req.user.id

    if (!googleId || !googleEmail) {
      return next(createError(400, 'Google account information is required'))
    }

    const existingGoogleUser = await User.findOne({ googleId })
    if (existingGoogleUser && existingGoogleUser._id.toString() !== userId) {
      return next(
        createError(
          400,
          'This Google account is already linked to another user'
        )
      )
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        googleId,
        avatar: googleAvatar || updatedUser.avatar,
      },
      { new: true, runValidators: true }
    )

    res.status(200).json({
      status: 'success',
      message: 'Google account linked successfully',
      data: {
        user: updatedUser,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const unlinkGoogleAccount = async (req, res, next) => {
  try {
    const userId = req.user.id
    const user = await User.findById(userId).select('+password')

    if (!user) {
      return next(createError(404, 'User not found'))
    }

    if (!user.password && user.authProvider === 'google') {
      return next(
        createError(
          400,
          'Cannot unlink Google account. Please set a password first.'
        )
      )
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $unset: {
          googleId: 1,
          avatar: 1,
        },
      },
      { new: true, runValidators: true }
    )

    res.status(200).json({
      status: 'success',
      message: 'Google account unlinked successfully',
      data: {
        user: updatedUser,
      },
    })
  } catch (error) {
    next(error)
  }
}

// NEW: Get user's onboarding status
export const getOnboardingStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)

    if (!user) {
      return next(createError(404, 'User not found'))
    }

    const onboardingStatus = {
      hasSelectedSpa: !!user.selectedLocation?.locationId,
      profileCompleted: user.profileCompleted,
      onboardingCompleted: user.onboardingCompleted,
      selectedLocation: user.selectedLocation?.locationId
        ? user.selectedLocation
        : null,
      totalPoints: user.points || 0,
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

// NEW: Complete onboarding
export const completeOnboarding = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)

    if (!user) {
      return next(createError(404, 'User not found'))
    }

    if (!user.selectedLocation?.locationId) {
      return next(createError(400, 'Please select a spa first'))
    }

    if (user.onboardingCompleted) {
      return next(createError(400, 'Onboarding already completed'))
    }

    // Mark onboarding as completed
    user.onboardingCompleted = true

    // Award completion bonus
    const onboardingBonus = 50
    user.points = (user.points || 0) + onboardingBonus

    await user.save()

    res.status(200).json({
      status: 'success',
      message: 'Onboarding completed successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          points: user.points,
          onboardingCompleted: user.onboardingCompleted,
          selectedLocation: user.selectedLocation,
        },
        bonusPoints: onboardingBonus,
      },
    })
  } catch (error) {
    console.error('Error completing onboarding:', error)
    next(createError(500, 'Failed to complete onboarding'))
  }
}

// NEW: Update selected spa (allow one-time change)
export const updateSelectedSpa = async (req, res, next) => {
  try {
    const { locationId } = req.body
    const userId = req.user.id

    if (!locationId) {
      return next(createError(400, 'Location ID is required'))
    }

    // Verify the location exists and is active
    const location = await Location.findOne({
      locationId: locationId,
      isActive: true,
    })

    if (!location) {
      return next(createError(404, 'Location not found or inactive'))
    }

    // Find the user
    const user = await User.findById(userId)
    if (!user) {
      return next(createError(404, 'User not found'))
    }

    // Update user with new selected location
    user.selectedLocation = {
      locationId: location.locationId,
      locationName: location.name,
      locationAddress: location.address,
      locationPhone: location.phone,
      selectedAt: new Date(),
    }

    await user.save()

    res.status(200).json({
      status: 'success',
      message: 'Spa updated successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          selectedLocation: user.selectedLocation,
        },
      },
    })
  } catch (error) {
    console.error('Error updating spa:', error)
    next(createError(500, 'Failed to update spa'))
  }
}

export const generateReferralCode = async (req, res, next) => {
  try {
    const userId = req.user.id

    // Get current user
    const user = await User.findById(userId)
    if (!user) {
      return next(createError(404, 'User not found'))
    }

    // Check if user already has a referral code
    if (user.referralCode) {
      return res.status(200).json({
        status: 'success',
        message: 'User already has a referral code',
        data: {
          referralCode: user.referralCode,
        },
      })
    }

    // Generate new referral code (the pre-save middleware will handle this)
    user.referralCode = undefined // Clear it so middleware generates a new one
    await user.save()

    res.status(200).json({
      status: 'success',
      message: 'Referral code generated successfully',
      data: {
        referralCode: user.referralCode,
      },
    })
  } catch (error) {
    console.error('Error generating referral code:', error)
    next(createError(500, 'Failed to generate referral code'))
  }
}
