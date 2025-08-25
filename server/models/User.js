// File: server/models/User.js - ENHANCED WITH BETTER SPA LOCATION SUPPORT
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        return this.authProvider === 'local'
      },
      select: false,
    },
    dateOfBirth: {
      type: Date,
      required: false,
    },
    role: {
      type: String,
      enum: ['admin', 'user', 'team', 'enterprise'],
      default: 'user',
    },
    points: {
      type: Number,
      default: 100,
    },
    lastLogin: {
      type: Date,
    },
    // Google OAuth fields
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    avatar: {
      type: String,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    // GHL Integration field
    ghlContactId: {
      type: String,
      sparse: true,
    },

    // For regular users - Selected Location/Spa
    selectedLocation: {
      locationId: {
        type: String,
        default: null,
      },
      locationName: {
        type: String,
        default: null,
      },
      locationAddress: {
        type: String,
        default: null,
      },
      locationPhone: {
        type: String,
        default: null,
      },
      selectedAt: {
        type: Date,
        default: null,
      },
    },

    // ENHANCED: For team users (spa owners) - Their Spa Location
    spaLocation: {
      locationId: {
        type: String,
        default: null,
        required: function () {
          return this.role === 'team'
        },
      },
      locationName: {
        type: String,
        default: null,
        required: function () {
          return this.role === 'team'
        },
      },
      locationAddress: {
        type: String,
        default: null,
      },
      locationPhone: {
        type: String,
        default: null,
      },
      locationEmail: {
        type: String,
        default: null,
      },
      // NEW: Additional spa owner fields
      businessHours: {
        monday: {
          open: String,
          close: String,
          closed: { type: Boolean, default: false },
        },
        tuesday: {
          open: String,
          close: String,
          closed: { type: Boolean, default: false },
        },
        wednesday: {
          open: String,
          close: String,
          closed: { type: Boolean, default: false },
        },
        thursday: {
          open: String,
          close: String,
          closed: { type: Boolean, default: false },
        },
        friday: {
          open: String,
          close: String,
          closed: { type: Boolean, default: false },
        },
        saturday: {
          open: String,
          close: String,
          closed: { type: Boolean, default: false },
        },
        sunday: {
          open: String,
          close: String,
          closed: { type: Boolean, default: false },
        },
      },
      timezone: {
        type: String,
        default: 'UTC',
      },
      setupAt: {
        type: Date,
        default: null,
      },
      setupCompleted: {
        type: Boolean,
        default: false,
      },
    },

    // Profile completion status
    profileCompleted: {
      type: Boolean,
      default: false,
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    referralEarnings: {
      type: Number,
      default: 0,
    },
    referralStats: {
      totalReferrals: { type: Number, default: 0 },
      activeReferrals: { type: Number, default: 0 },
      convertedReferrals: { type: Number, default: 0 },
      currentTier: {
        type: String,
        enum: ['bronze', 'gold', 'platinum'],
        default: 'bronze',
      },
    },
  },
  { timestamps: true }
)

// Add indexes for better performance
UserSchema.index({ 'selectedLocation.locationId': 1 })
UserSchema.index({ 'spaLocation.locationId': 1 })
UserSchema.index({ role: 1 })
UserSchema.index({ profileCompleted: 1 })
UserSchema.index({ email: 1, role: 1 })

// ENHANCED: Method to get user's relevant location based on role
UserSchema.methods.getRelevantLocation = function () {
  if (this.role === 'team') {
    return this.spaLocation
  } else if (this.role === 'user') {
    return this.selectedLocation
  } else if (this.role === 'admin') {
    return null // Admin can work with any location
  }
  return null
}

// ENHANCED: Method to check if user has location configured
UserSchema.methods.hasLocationConfigured = function () {
  if (this.role === 'team') {
    return !!(this.spaLocation?.locationId && this.spaLocation?.locationName)
  } else if (this.role === 'user') {
    return !!(
      this.selectedLocation?.locationId && this.selectedLocation?.locationName
    )
  } else if (this.role === 'admin') {
    return true // Admin doesn't need location
  }
  return false
}

// NEW: Method to setup spa location for team users
UserSchema.methods.setupSpaLocation = function (locationData) {
  if (this.role !== 'team') {
    throw new Error('Only team users can have spa locations')
  }

  this.spaLocation = {
    locationId: locationData.locationId,
    locationName: locationData.locationName,
    locationAddress: locationData.locationAddress,
    locationPhone: locationData.locationPhone,
    locationEmail: locationData.locationEmail,
    businessHours: locationData.businessHours || {},
    timezone: locationData.timezone || 'UTC',
    setupAt: new Date(),
    setupCompleted: true,
  }

  return this.save()
}

// NEW: Method to check if spa is open now
UserSchema.methods.isSpaOpenNow = function () {
  if (this.role !== 'team' || !this.spaLocation?.businessHours) {
    return true // Default to open if no hours configured
  }

  const now = new Date()
  const dayNames = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ]
  const currentDay = dayNames[now.getDay()]
  const todayHours = this.spaLocation.businessHours[currentDay]

  if (!todayHours || todayHours.closed) {
    return false
  }

  if (!todayHours.open || !todayHours.close) {
    return true // Default to open if hours not set
  }

  const currentTime = now.toTimeString().slice(0, 5) // HH:MM format
  return currentTime >= todayHours.open && currentTime <= todayHours.close
}

// NEW: Method to get spa business status
UserSchema.methods.getSpaBusinessStatus = function () {
  if (this.role !== 'team') {
    return null
  }

  return {
    locationId: this.spaLocation?.locationId,
    locationName: this.spaLocation?.locationName,
    isOpenNow: this.isSpaOpenNow(),
    businessHours: this.spaLocation?.businessHours,
    timezone: this.spaLocation?.timezone,
    setupCompleted: this.spaLocation?.setupCompleted,
  }
}

// Pre-save middleware to hash password
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next()
  try {
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Pre-save middleware to generate referral code
UserSchema.pre('save', async function (next) {
  if (this.isNew && !this.referralCode) {
    const generateCode = () => {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      const numbers = '0123456789'
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
    let codeExists = await this.constructor.findOne({ referralCode: code })

    // Ensure uniqueness
    while (codeExists) {
      code = generateCode()
      codeExists = await this.constructor.findOne({ referralCode: code })
    }

    this.referralCode = code
  }
  next()
})

// ENHANCED: Pre-save validation for team users
UserSchema.pre('save', function (next) {
  if (this.role === 'team') {
    // Team users must have spa location configured
    if (!this.spaLocation?.locationId || !this.spaLocation?.locationName) {
      const error = new Error('Team users must have spa location configured')
      error.statusCode = 400
      return next(error)
    }
  }
  next()
})

// Method to check if password is correct
UserSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  if (!userPassword) return false
  return await bcrypt.compare(candidatePassword, userPassword)
}

// Method to check if user can authenticate with password
UserSchema.methods.canAuthenticateWithPassword = function () {
  return this.authProvider === 'local' && this.password
}

// NEW: Static method to find team users by location
UserSchema.statics.findSpaOwnersByLocation = function (locationId) {
  return this.find({
    role: 'team',
    'spaLocation.locationId': locationId,
    isDeleted: false,
  })
}

// NEW: Static method to get spa owner dashboard data
UserSchema.statics.getSpaOwnerDashboardData = async function (userId) {
  const user = await this.findById(userId)
  if (!user || user.role !== 'team') {
    throw new Error('User not found or not a spa owner')
  }

  // You can add more dashboard data aggregation here
  const dashboardData = {
    spaInfo: user.getSpaBusinessStatus(),
    userInfo: {
      name: user.name,
      email: user.email,
      joinedAt: user.createdAt,
      lastLogin: user.lastLogin,
    },
    // Add more dashboard metrics as needed
  }

  return dashboardData
}

export default mongoose.model('User', UserSchema)
