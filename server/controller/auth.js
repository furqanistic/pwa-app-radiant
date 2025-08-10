// File: server/controller/auth.js
// server/controller/auth.js
import axios from 'axios'
import jwt from 'jsonwebtoken'
import { createError } from '../error.js'
import Location from '../models/Location.js'
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

    // Process referral if provided
    let referralResult = { success: false }
    if (referralCode && referralCode.trim()) {
      referralResult = await processReferral(newUser._id, referralCode.trim())
      if (referralResult.success) {
        console.log('✅ Referral processed:', referralResult.message)
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

// NEW: Admin function to create team members
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
    if (locationData) userData.selectedLocation = locationData

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

// NEW: Select Spa/Location for user
export const selectSpa = async (req, res, next) => {
  try {
    const { locationId, referralCode } = req.body
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

    // Check if user already has a selected location
    if (user.selectedLocation.locationId) {
      return next(createError(400, 'User has already selected a spa'))
    }

    // Update user with selected location
    user.selectedLocation = {
      locationId: location.locationId,
      locationName: location.name,
      locationAddress: location.address,
      locationPhone: location.phone,
      selectedAt: new Date(),
    }

    // Mark profile as completed after spa selection
    user.profileCompleted = true

    // Award bonus points for completing profile
    const profileCompletionBonus = 100
    user.points = (user.points || 0) + profileCompletionBonus

    await user.save()

    // Process referral if provided
    let referralResult = { success: false }
    if (referralCode && referralCode.trim()) {
      referralResult = await processReferral(userId, referralCode.trim())
      if (referralResult.success) {
        console.log('✅ Referral processed:', referralResult.message)
      } else {
        console.log('⚠️ Referral failed:', referralResult.message)
      }
    }

    // Send success response
    res.status(200).json({
      status: 'success',
      message: 'Spa selected successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          points: user.points,
          selectedLocation: user.selectedLocation,
          profileCompleted: user.profileCompleted,
        },
        bonusPoints: profileCompletionBonus,
        referral: referralResult.success
          ? {
              processed: true,
              rewardAmount: referralResult.data?.rewardAmount || 0,
              referrerReward: referralResult.data?.referrerReward || 0,
              message: referralResult.message,
            }
          : {
              processed: false,
              message: referralResult.message || 'No referral code provided',
            },
      },
    })
  } catch (error) {
    console.error('Error selecting spa:', error)
    next(createError(500, 'Failed to select spa'))
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
      hasSelectedSpa: !!user.selectedLocation.locationId,
      profileCompleted: user.profileCompleted,
      onboardingCompleted: user.onboardingCompleted,
      selectedLocation: user.selectedLocation.locationId
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

    if (!user.selectedLocation.locationId) {
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
