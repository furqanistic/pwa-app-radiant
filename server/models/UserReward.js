// File: server/models/UserReward.js
// server/models/UserReward.js - UPDATED VERSION WITH GAME INTEGRATION
import mongoose from 'mongoose'

// Schema for tracking claimed rewards AND game wins
const UserRewardSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    rewardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reward',
      required: false, // Made optional for game wins
      index: true,
    },
    // Snapshot of reward data at time of claiming (in case reward gets modified later)
    rewardSnapshot: {
      name: { type: String, required: true },
      description: { type: String, required: true },
      type: {
        type: String,
        required: true,
        // UPDATED: Added 'game_win' to enum
        enum: [
          'credit',
          'discount',
          'service',
          'combo',
          'referral',
          'service_discount',
          'free_service',
          'game_win',
        ],
      },
      pointCost: { type: Number, required: true },
      value: { type: Number, required: true },
      validDays: { type: Number, required: true, default: 30 },
      // NEW: Game-specific fields
      gameId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GameWheel',
        required: false,
      },
      gameType: {
        type: String,
        enum: ['scratch', 'spin'],
        required: false,
      },
      winningItem: {
        title: String,
        value: String,
        valueType: String,
        color: String,
      },
    },
    status: {
      type: String,
      enum: ['active', 'used', 'expired'],
      default: 'active',
      index: true,
    },
    claimedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
      // DEFAULT VALUE - calculates based on validDays
      default: function () {
        const validDays = this.rewardSnapshot?.validDays || 30
        const expiryDate = new Date(
          Date.now() + validDays * 24 * 60 * 60 * 1000
        )
        return expiryDate
      },
    },
    usedAt: {
      type: Date,
      default: null,
    },
    usedForBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking', // When booking system is implemented
      default: null,
    },
    // For discount/credit rewards, track the actual amount saved/used
    actualValue: {
      type: Number,
      default: 0,
    },

    // Location where reward was claimed
    locationId: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        // Add computed fields
        ret.isExpired = new Date() > ret.expiresAt
        ret.isActive = ret.status === 'active' && !ret.isExpired
        ret.daysUntilExpiry = Math.ceil(
          (ret.expiresAt - new Date()) / (1000 * 60 * 60 * 24)
        )
        // NEW: Add game-specific display info
        if (ret.rewardSnapshot?.type === 'game_win') {
          ret.isGameReward = true
          ret.gameType = ret.rewardSnapshot.gameType
        }
        return ret
      },
    },
  }
)

// Compound indexes
UserRewardSchema.index({ userId: 1, status: 1 })
UserRewardSchema.index({ userId: 1, expiresAt: 1 })
UserRewardSchema.index({ expiresAt: 1, status: 1 }) // For cleanup jobs
// NEW: Index for game rewards
UserRewardSchema.index({ 'rewardSnapshot.type': 1, userId: 1 })
UserRewardSchema.index({ 'rewardSnapshot.gameId': 1 })

// Pre-validate middleware (runs before validation)
UserRewardSchema.pre('validate', function (next) {
  // Ensure expiresAt is set before validation
  if (!this.expiresAt) {
    const validDays = this.rewardSnapshot?.validDays || 30
    // For game wins that are points, no expiry needed
    if (
      this.rewardSnapshot?.type === 'game_win' &&
      this.rewardSnapshot?.winningItem?.valueType === 'points'
    ) {
      this.expiresAt = new Date() // Expires immediately as points are instant
    } else {
      this.expiresAt = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000)
    }
  }

  next()
})

// Pre-save middleware (runs before saving)
UserRewardSchema.pre('save', function (next) {
  // Set expiry date for new documents if not already set
  if (this.isNew && !this.expiresAt && this.rewardSnapshot?.validDays) {
    this.expiresAt = new Date(
      Date.now() + this.rewardSnapshot.validDays * 24 * 60 * 60 * 1000
    )
  }

  // Final fallback - set default 30 days if still not set
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  }

  next()
})

// Error handling middleware
UserRewardSchema.post('save', function (error, doc, next) {
  if (error) {
    console.error('❌ UserReward save error:', {
      error: error.message,
      docId: doc?._id,
      expiresAt: doc?.expiresAt,
    })
  }
  next(error)
})

// Method to check if reward is still valid
UserRewardSchema.methods.isValid = function () {
  return this.status === 'active' && new Date() <= this.expiresAt
}

// Method to mark reward as used
UserRewardSchema.methods.markAsUsed = function (
  actualValue = 0,
  bookingId = null
) {
  this.status = 'used'
  this.usedAt = new Date()
  this.actualValue = actualValue
  if (bookingId) {
    this.usedForBooking = bookingId
  }
  return this.save()
}

// Static method to create UserReward with explicit expiresAt
UserRewardSchema.statics.createUserReward = function (rewardData) {
  // Calculate expiresAt before creating
  const validDays = rewardData.rewardSnapshot?.validDays || 30
  const expiresAt = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000)

  const dataWithExpiry = {
    ...rewardData,
    expiresAt: expiresAt,
  }

  return this.create(dataWithExpiry)
}

// Static method to get user's active rewards (including game rewards)
UserRewardSchema.statics.getUserActiveRewards = function (userId) {
  return this.find({
    userId,
    status: 'active',
    expiresAt: { $gt: new Date() },
  })
    .populate('rewardId')
    .sort({ expiresAt: 1 })
}

// NEW: Static method to get user's game rewards
UserRewardSchema.statics.getUserGameRewards = function (
  userId,
  gameType = null
) {
  const filter = {
    userId,
    'rewardSnapshot.type': 'game_win',
  }

  if (gameType) {
    filter['rewardSnapshot.gameType'] = gameType
  }

  return this.find(filter).sort({ claimedAt: -1 })
}

// Static method to count user's claims for a specific reward this month
UserRewardSchema.statics.getUserMonthlyClaimCount = function (
  userId,
  rewardId
) {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const endOfMonth = new Date(startOfMonth)
  endOfMonth.setMonth(endOfMonth.getMonth() + 1)

  return this.countDocuments({
    userId,
    rewardId,
    claimedAt: {
      $gte: startOfMonth,
      $lt: endOfMonth,
    },
  })
}

export const UserReward = mongoose.model('UserReward', UserRewardSchema)

// ===============================================
// POINT TRANSACTION MODEL
// ===============================================

const PointTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['earned', 'spent', 'bonus', 'refund', 'admin_adjustment'],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    balance: {
      type: Number, // user's balance after this transaction
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    // Reference to what caused this transaction
    referenceType: {
      type: String,
      // UPDATED: Added 'game_play' and 'game_win'
      enum: [
        'booking',
        'reward_claim',
        'referral',
        'review',
        'admin',
        'signup_bonus',
        'profile_completion',
        'game_play', // NEW: For playing games
        'game_win', // NEW: For winning game prizes
      ],
      required: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null, // ID of booking, reward, game, etc.
    },

    // Admin tracking for manual adjustments
    adminNote: {
      type: String,
      default: null,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // Admin who made the adjustment
    },

    // Location context
    locationId: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        ret.isPositive = ret.amount > 0
        ret.displayAmount = ret.isPositive
          ? `+${ret.amount}`
          : ret.amount.toString()
        return ret
      },
    },
  }
)

// Indexes for performance
PointTransactionSchema.index({ userId: 1, createdAt: -1 })
PointTransactionSchema.index({ type: 1, createdAt: -1 })
PointTransactionSchema.index({ referenceType: 1, referenceId: 1 })

// Static method to get user's transaction history
PointTransactionSchema.statics.getUserTransactions = function (
  userId,
  limit = 50
) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('processedBy', 'name')
}

// Static method to calculate user's total earned points
PointTransactionSchema.statics.getUserTotalEarned = function (userId) {
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        amount: { $gt: 0 },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])
}

// NEW: Static method to get game-related transactions
PointTransactionSchema.statics.getUserGameTransactions = function (userId) {
  return this.find({
    userId,
    referenceType: { $in: ['game_play', 'game_win'] },
  }).sort({ createdAt: -1 })
}

// Static method to create a point transaction
PointTransactionSchema.statics.createTransaction = function (transactionData) {
  return this.create(transactionData)
}

export const PointTransaction = mongoose.model(
  'PointTransaction',
  PointTransactionSchema
)

// ===============================================
// HELPER FUNCTIONS FOR POINT MANAGEMENT
// ===============================================

// Helper function to award points to a user
export const awardPoints = async (
  userId,
  amount,
  reason,
  referenceType,
  referenceId = null,
  locationId = null
) => {
  const User = mongoose.model('User')

  try {
    // Get current user
    const user = await User.findById(userId)
    if (!user) throw new Error('User not found')

    // Calculate new balance
    const newBalance = (user.points || 0) + amount

    // Update user's points
    await User.findByIdAndUpdate(userId, { points: newBalance })

    // Create transaction record
    await PointTransaction.create({
      userId,
      type: 'earned',
      amount,
      balance: newBalance,
      reason,
      referenceType,
      referenceId,
      locationId,
    })

    return { success: true, newBalance, amount }
  } catch (error) {
    console.error('Error awarding points:', error)
    return { success: false, error: error.message }
  }
}

// Helper function to spend points
export const spendPoints = async (
  userId,
  amount,
  reason,
  referenceType,
  referenceId = null,
  locationId = null
) => {
  const User = mongoose.model('User')

  try {
    // Get current user
    const user = await User.findById(userId)
    if (!user) throw new Error('User not found')

    const currentBalance = user.points || 0
    if (currentBalance < amount) {
      throw new Error('Insufficient points')
    }

    // Calculate new balance
    const newBalance = currentBalance - amount

    // Update user's points
    await User.findByIdAndUpdate(userId, { points: newBalance })

    // Create transaction record
    await PointTransaction.create({
      userId,
      type: 'spent',
      amount: -amount, // Negative amount for spending
      balance: newBalance,
      reason,
      referenceType,
      referenceId,
      locationId,
    })

    return { success: true, newBalance, amount }
  } catch (error) {
    console.error('Error spending points:', error)
    return { success: false, error: error.message }
  }
}

// Helper function to refund points
export const refundPoints = async (
  userId,
  amount,
  reason,
  originalTransactionId = null,
  locationId = null
) => {
  const User = mongoose.model('User')

  try {
    // Get current user
    const user = await User.findById(userId)
    if (!user) throw new Error('User not found')

    // Calculate new balance
    const newBalance = (user.points || 0) + amount

    // Update user's points
    await User.findByIdAndUpdate(userId, { points: newBalance })

    // Create transaction record
    await PointTransaction.create({
      userId,
      type: 'refund',
      amount,
      balance: newBalance,
      reason,
      referenceType: 'admin',
      referenceId: originalTransactionId,
      locationId,
    })

    return { success: true, newBalance, amount }
  } catch (error) {
    console.error('Error refunding points:', error)
    return { success: false, error: error.message }
  }
}
