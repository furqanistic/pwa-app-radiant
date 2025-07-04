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
    role: {
      type: String,
      enum: ['admin', 'user', 'team', 'enterprise'],
      default: 'user',
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
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
)

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

export default mongoose.model('User', UserSchema)
