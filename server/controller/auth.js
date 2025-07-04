import axios from 'axios'
import jwt from 'jsonwebtoken'
import { createError } from '../error.js'
import User from '../models/User.js'

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

// GHL Integration Functions
const createGHLContact = async (userData) => {
  try {
    if (!process.env.GHL_API_KEY) {
      console.log('GHL_API_KEY not found, skipping GHL contact creation')
      return { success: false, error: 'GHL not configured' }
    }

    const response = await axios.post(
      'https://rest.gohighlevel.com/v1/contacts/',
      {
        firstName: userData.name?.split(' ')[0] || '',
        lastName: userData.name?.split(' ').slice(1).join(' ') || '',
        email: userData.email,
        phone: userData.phone || '',
        tags: ['app-signup'],
        customField: [
          {
            key: 'signup_date',
            value: new Date().toISOString(),
          },
          {
            key: 'user_role',
            value: userData.role || 'user',
          },
          {
            key: 'auth_provider',
            value: userData.authProvider || 'local',
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GHL_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )

    console.log('✅ GHL contact created:', response.data.contact.id)
    return { success: true, contact: response.data.contact }
  } catch (error) {
    console.log(
      '❌ GHL contact creation failed:',
      error.response?.data || error.message
    )
    return { success: false, error: error.message }
  }
}

// Your location IDs - you can also store these in environment variables
const LOCATION_IDS = [
  'j3BAQnPNZywbuAE3QCCh',
  '1bVLUidpHGoOWAuh9iZ9',
  'cZENg6Hg9c94tkUzWTcX',
  // Add more location IDs as needed
]

// Helper function to get location IDs from environment or constant
const getLocationIds = () => {
  // Check if location IDs are in environment variables (comma-separated)
  if (process.env.GHL_LOCATION_IDS) {
    return process.env.GHL_LOCATION_IDS.split(',').map((id) => id.trim())
  }
  // Fall back to constant array
  return LOCATION_IDS
}

// NEW: Get all GHL subaccounts/locations using individual location calls
export const getGHLSubaccounts = async (req, res, next) => {
  try {
    if (!process.env.GHL_API_KEY) {
      return next(createError(500, 'GHL API key not configured'))
    }

    // Check if user has admin permissions to view subaccounts
    if (req.user.role !== 'admin') {
      return next(createError(403, 'Access denied. Admin rights required.'))
    }

    const locationIds = getLocationIds()

    if (locationIds.length === 0) {
      return next(
        createError(
          400,
          'No location IDs configured. Please add GHL_LOCATION_IDS to environment variables.'
        )
      )
    }

    console.log(`📍 Fetching details for ${locationIds.length} locations...`)

    // Fetch details for each location
    const locationPromises = locationIds.map(async (locationId) => {
      try {
        const response = await axios.get(
          `https://rest.gohighlevel.com/v1/locations/${locationId}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.GHL_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        )

        const location = response.data.location
        return {
          id: location.id,
          name: location.name,
          address: location.address,
          city: location.city,
          state: location.state,
          country: location.country,
          phone: location.phone,
          email: location.email,
          website: location.website,
          timezone: location.timezone,
          status: location.status || 'active',
          createdAt: location.dateAdded,
          updatedAt: location.dateUpdated,
          success: true,
        }
      } catch (locationError) {
        console.error(
          `❌ Failed to fetch location ${locationId}:`,
          locationError.response?.data || locationError.message
        )
        return {
          id: locationId,
          name: 'Unknown Location',
          error:
            locationError.response?.data?.message ||
            'Failed to fetch location details',
          success: false,
        }
      }
    })

    // Wait for all location requests to complete
    const locationResults = await Promise.all(locationPromises)

    // Separate successful and failed results
    const successfulLocations = locationResults.filter((loc) => loc.success)
    const failedLocations = locationResults.filter((loc) => !loc.success)

    console.log(
      `✅ Successfully fetched ${successfulLocations.length} locations`
    )
    if (failedLocations.length > 0) {
      console.log(`⚠️  Failed to fetch ${failedLocations.length} locations`)
    }

    res.status(200).json({
      status: 'success',
      results: successfulLocations.length,
      totalConfigured: locationIds.length,
      failed: failedLocations.length,
      data: {
        locations: successfulLocations,
        failed: failedLocations.length > 0 ? failedLocations : undefined,
      },
    })
  } catch (error) {
    console.error(
      'Error fetching GHL subaccounts:',
      error.response?.data || error.message
    )

    if (error.response?.status === 401) {
      return next(
        createError(401, 'Invalid GHL API key or unauthorized access')
      )
    }

    if (error.response?.status === 403) {
      return next(
        createError(
          403,
          'GHL API access forbidden. Check your API key permissions.'
        )
      )
    }

    next(createError(500, 'Failed to fetch GHL subaccounts'))
  }
}

// NEW: Add a new location ID to track
export const addLocationId = async (req, res, next) => {
  try {
    const { locationId, locationName } = req.body

    if (!locationId) {
      return next(createError(400, 'Location ID is required'))
    }

    // Check if user has admin permissions
    if (req.user.role !== 'admin') {
      return next(createError(403, 'Access denied. Admin rights required.'))
    }

    // Test if the location ID is valid by fetching it
    try {
      const response = await axios.get(
        `https://rest.gohighlevel.com/v1/locations/${locationId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.GHL_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      )
      console.log(response)
      const location = response.data.location

      res.status(200).json({
        status: 'success',
        message: `Location ID ${locationId} is valid and can be added to your configuration`,
        data: {
          locationId: location.id,
          name: location.name,
          city: location.city,
          state: location.state,
          instructions: {
            method1: `Add '${locationId}' to the LOCATION_IDS array in your auth controller`,
            method2: `Add to environment variable: GHL_LOCATION_IDS="${locationId},existing_ids..."`,
          },
        },
      })
    } catch (locationError) {
      if (locationError.response?.status === 404) {
        return next(
          createError(
            404,
            `Location ID ${locationId} not found or not accessible`
          )
        )
      }

      return next(
        createError(
          400,
          `Invalid location ID: ${
            locationError.response?.data?.message || locationError.message
          }`
        )
      )
    }
  } catch (error) {
    console.error('Error validating location ID:', error)
    next(createError(500, 'Failed to validate location ID'))
  }
}

// NEW: Get current configured location IDs
export const getConfiguredLocationIds = async (req, res, next) => {
  try {
    // Check if user has admin permissions
    if (req.user.role !== 'admin') {
      return next(createError(403, 'Access denied. Admin rights required.'))
    }

    const locationIds = getLocationIds()

    res.status(200).json({
      status: 'success',
      data: {
        locationIds,
        count: locationIds.length,
        source: process.env.GHL_LOCATION_IDS
          ? 'environment_variable'
          : 'hardcoded_array',
        instructions: {
          addMore:
            'Use POST /auth/ghl/add-location to validate and get instructions for adding new location IDs',
          environmentVariable:
            'Set GHL_LOCATION_IDS="id1,id2,id3" in your .env file to override hardcoded list',
        },
      },
    })
  } catch (error) {
    console.error('Error getting configured location IDs:', error)
    next(createError(500, 'Failed to get configured location IDs'))
  }
}
export const getGHLLocation = async (req, res, next) => {
  try {
    const { locationId } = req.params

    if (!process.env.GHL_API_KEY) {
      return next(createError(500, 'GHL API key not configured'))
    }

    if (!locationId) {
      return next(createError(400, 'Location ID is required'))
    }

    const response = await axios.get(
      `https://rest.gohighlevel.com/v1/locations/${locationId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GHL_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )

    const location = response.data.location

    res.status(200).json({
      status: 'success',
      data: {
        location: {
          id: location.id,
          name: location.name,
          address: location.address,
          city: location.city,
          state: location.state,
          country: location.country,
          phone: location.phone,
          email: location.email,
          website: location.website,
          timezone: location.timezone,
          status: location.status,
          settings: location.settings,
          createdAt: location.dateAdded,
          updatedAt: location.dateUpdated,
        },
      },
    })
  } catch (error) {
    console.error(
      'Error fetching GHL location:',
      error.response?.data || error.message
    )

    if (error.response?.status === 404) {
      return next(createError(404, 'Location not found'))
    }

    if (error.response?.status === 401) {
      return next(
        createError(401, 'Invalid GHL API key or unauthorized access')
      )
    }

    next(createError(500, 'Failed to fetch GHL location details'))
  }
}

export const signup = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body

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

    // Create new user (password will be hashed by the pre-save middleware)
    const newUser = await User.create({
      name,
      email,
      password,
      role: userRole,
    })

    // Create contact in GHL
    const ghlResult = await createGHLContact({
      name,
      email,
      phone,
      role: userRole,
      authProvider: 'local',
    })

    // If GHL contact creation was successful, save the contact ID
    if (ghlResult.success) {
      newUser.ghlContactId = ghlResult.contact.id
      await newUser.save()
      console.log('✅ User linked to GHL contact:', ghlResult.contact.id)
    }

    // Send token to the new user
    createSendToken(newUser, 201, res)
  } catch (err) {
    console.error('Error in signup:', err)
    next(createError(500, 'An unexpected error occurred during signup'))
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
    if (req.user.role !== 'admin') {
      return next(createError(403, 'Access denied. Admin rights required.'))
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
