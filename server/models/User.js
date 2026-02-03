// File: server/models/User.js - ENHANCED WITH SUPER-ADMIN ROLE
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
      enum: ['super-admin', 'admin', 'spa', 'enterprise', 'user'], // Added super-admin as highest role
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

    // For spa users (spa owners) - Their Spa Location
    spaLocation: {
      locationId: {
        type: String,
        default: null,
        required: function () {
          return this.role === 'spa'
        },
      },
      locationName: {
        type: String,
        default: null,
        required: function () {
          return this.role === 'spa'
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
      coordinates: {
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null },
      },
    },

    // Stripe Connect Integration (for spa role - spa owners)
    stripe: {
      accountId: {
        type: String,
        default: null,
        sparse: true,
      },
      accountStatus: {
        type: String,
        enum: ['pending', 'active', 'restricted', 'inactive'],
        default: null,
      },
      onboardingCompleted: {
        type: Boolean,
        default: false,
      },
      chargesEnabled: {
        type: Boolean,
        default: false,
      },
      payoutsEnabled: {
        type: Boolean,
        default: false,
      },
      detailsSubmitted: {
        type: Boolean,
        default: false,
      },
      connectedAt: {
        type: Date,
        default: null,
      },
      lastUpdated: {
        type: Date,
        default: null,
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
    // NEW: Role management metadata
    roleChangedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    roleChangedAt: {
      type: Date,
      default: null,
    },
    previousRole: {
      type: String,
      default: null,
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
UserSchema.index({ createdAt: -1 }) // For pagination
UserSchema.index({ isDeleted: 1, role: 1 }) // For filtered queries

// NEW: Method to check role hierarchy
UserSchema.methods.canManageRole = function (targetRole) {
  const roleHierarchy = {
    'super-admin': 5,
    admin: 4,
    spa: 3,
    enterprise: 2,
    user: 1,
  }

  const currentLevel = roleHierarchy[this.role] || 0
  const targetLevel = roleHierarchy[targetRole] || 0

  return currentLevel > targetLevel
}

// NEW: Method to check if user can change another user's role
UserSchema.methods.canChangeUserRole = function (targetUser, newRole) {
  // Super-admin can change anyone's role (except other super-admins to super-admin)
  if (this.role === 'super-admin') {
    if (newRole === 'super-admin' && targetUser.role !== 'super-admin') {
      return false // Only existing super-admins can create new super-admins
    }
    return this._id.toString() !== targetUser._id.toString() // Can't change own role
  }

  // Admin can change roles below admin level
  if (this.role === 'admin') {
    return (
      this.canManageRole(targetUser.role) &&
      this.canManageRole(newRole) &&
      newRole !== 'super-admin' &&
      newRole !== 'admin' &&
      this._id.toString() !== targetUser._id.toString()
    )
  }

  return false
}

// Method to get user's relevant location based on role
UserSchema.methods.getRelevantLocation = function () {
  if (this.role === 'spa') {
    return this.spaLocation
  } else if (this.role === 'user') {
    return this.selectedLocation
  } else if (['admin', 'super-admin'].includes(this.role)) {
    return null // Admin can work with any location
  }
  return null
}

// Method to check if user has location configured
UserSchema.methods.hasLocationConfigured = function () {
  if (this.role === 'spa') {
    return !!(this.spaLocation?.locationId && this.spaLocation?.locationName)
  } else if (this.role === 'user') {
    return !!(
      this.selectedLocation?.locationId && this.selectedLocation?.locationName
    )
  } else if (['admin', 'super-admin'].includes(this.role)) {
    return true // Admin doesn't need location
  }
  return false
}

// Rest of the methods remain the same...
UserSchema.methods.setupSpaLocation = function (locationData) {
  if (this.role !== 'spa') {
    throw new Error('Only spa users can have spa locations')
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

    while (codeExists) {
      code = generateCode()
      codeExists = await this.constructor.findOne({ referralCode: code })
    }

    this.referralCode = code
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

// Static method to get paginated users
UserSchema.statics.getPaginatedUsers = async function (
  page = 1,
  limit = 10,
  filters = {}
) {
  const skip = (page - 1) * limit

  // Build query
  const query = { isDeleted: false, ...filters }

  // Get total count for pagination info
  const total = await this.countDocuments(query)

  // Get users with pagination
  const users = await this.find(query)
    .sort({ createdAt: -1 }) // Most recent first
    .skip(skip)
    .limit(limit)
    .select('-password') // Exclude password field

  return {
    users,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalUsers: total,
      hasNextPage: page < Math.ceil(total / limit),
      hasPreviousPage: page > 1,
    },
  }
}

export default mongoose.model('User', UserSchema)
