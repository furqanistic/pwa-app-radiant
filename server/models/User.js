// File: server/models/User.js
// server/models/User.js
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
      sparse: true, // Allows null values
    },
    // NEW: Selected Location/Spa
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
UserSchema.index({ createdBy: 1 })
UserSchema.index({ profileCompleted: 1 })

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

UserSchema.pre('save', async function (next) {
  // Generate referral code for new users OR existing users without a code
  if (!this.referralCode) {
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

export default mongoose.model('User', UserSchema)
