// File: server/models/UserReward.js - FIXED VERSION with missing methods
import mongoose from 'mongoose'

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
      default: null, // Can be null for game wins
    },
    // FIXED: Changed from String to Mixed/Object type
    rewardSnapshot: {
      type: mongoose.Schema.Types.Mixed, // FIXED: This allows objects
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'used', 'expired', 'pending'],
      default: 'active',
    },
    locationId: {
      type: String,
      index: true,
    },
    locationName: {
      type: String,
    },
    claimedAt: {
      type: Date,
      default: Date.now,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    usedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // FIXED: Made expiresAt optional since point rewards don't expire
    expiresAt: {
      type: Date,
      default: null, // FIXED: Not required, defaults to null
    },
    actualValue: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // ADDED: Fields for manual rewards compatibility
    isManualReward: {
      type: Boolean,
      default: false,
      index: true,
    },
    givenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    givenReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// Indexes for better performance
UserRewardSchema.index({ userId: 1, status: 1 })
UserRewardSchema.index({ userId: 1, claimedAt: -1 })
UserRewardSchema.index({ locationId: 1, status: 1 })
UserRewardSchema.index({ status: 1, expiresAt: 1 })
UserRewardSchema.index({ 'rewardSnapshot.type': 1 })
UserRewardSchema.index({ 'rewardSnapshot.gameId': 1 })
UserRewardSchema.index({ userId: 1, isManualReward: 1 })
UserRewardSchema.index({ userId: 1, createdAt: -1 })

// Virtual for checking if reward is expired
UserRewardSchema.virtual('isExpired').get(function () {
  if (!this.expiresAt) return false // No expiry date means never expires
  return new Date() > this.expiresAt
})

// Virtual for time remaining until expiry
UserRewardSchema.virtual('timeUntilExpiry').get(function () {
  if (!this.expiresAt) return null
  const now = new Date()
  if (now > this.expiresAt) return 0
  return Math.max(0, this.expiresAt - now)
})

// ADDED: Virtual to check if reward is still valid (for backward compatibility)
UserRewardSchema.virtual('isValid').get(function () {
  return (
    this.status === 'active' && (!this.expiresAt || new Date() < this.expiresAt)
  )
})

// ADDED: Virtual for days remaining (for backward compatibility)
UserRewardSchema.virtual('daysRemaining').get(function () {
  if (!this.expiresAt || this.status !== 'active') return 0
  const msRemaining = this.expiresAt - new Date()
  return Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)))
})

// Pre-save middleware to handle expiration
UserRewardSchema.pre('save', function (next) {
  // Auto-expire rewards that are past their expiry date
  if (
    this.expiresAt &&
    new Date() > this.expiresAt &&
    this.status === 'active'
  ) {
    this.status = 'expired'
  }
  next()
})

// Method to check if reward can be used
UserRewardSchema.methods.canBeUsed = function () {
  return this.status === 'active' && !this.isExpired
}

// Method to mark as used
UserRewardSchema.methods.markAsUsed = function (usedBy = null, notes = '') {
  this.status = 'used'
  this.usedAt = new Date()
  if (usedBy) this.usedBy = usedBy
  if (notes) this.notes = notes
  return this.save()
}

// ADDED: Enhanced method to mark reward as used (for backward compatibility)
UserRewardSchema.methods.markAsUsed = async function (actualValue = null) {
  if (this.status === 'used') {
    throw new Error('Reward has already been used')
  }

  if (this.isExpired) {
    this.status = 'expired'
    await this.save()
    throw new Error('Reward has expired')
  }

  this.status = 'used'
  this.usedAt = new Date()
  this.actualValue = actualValue || this.rewardSnapshot.value || 0

  await this.save()
  return this
}

// Static method to find active rewards by user
UserRewardSchema.statics.findActiveByUser = function (userId, options = {}) {
  const query = {
    userId,
    status: 'active',
    $or: [
      { expiresAt: null }, // Never expires
      { expiresAt: { $gt: new Date() } }, // Not yet expired
    ],
  }

  if (options.type) {
    query['rewardSnapshot.type'] = options.type
  }

  if (options.locationId) {
    query.locationId = options.locationId
  }

  return this.find(query).sort({ claimedAt: -1 })
}

// Static method to find expired rewards that need cleanup
UserRewardSchema.statics.findExpiredRewards = function () {
  return this.find({
    status: 'active',
    expiresAt: { $lt: new Date() },
  })
}

// ADDED: Static method to get user's monthly claim count (CRITICAL for rewards to work)
UserRewardSchema.statics.getUserMonthlyClaimCount = async function (
  userId,
  rewardId
) {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const count = await this.countDocuments({
    userId,
    rewardId,
    claimedAt: { $gte: startOfMonth },
  })

  return count
}

// ADDED: Enhanced method to create user reward (CRITICAL for rewards to work)
UserRewardSchema.statics.createUserReward = async function (data) {
  const {
    userId,
    rewardId,
    rewardSnapshot,
    locationId,
    status = 'active',
    isManualReward = false,
    givenBy = null,
  } = data

  // Calculate expiry date based on reward snapshot
  let expiresAt = null
  if (rewardSnapshot.validDays && rewardSnapshot.validDays > 0) {
    expiresAt = new Date(
      Date.now() + rewardSnapshot.validDays * 24 * 60 * 60 * 1000
    )
  }

  const userReward = new this({
    userId,
    rewardId,
    rewardSnapshot,
    status,
    expiresAt,
    locationId,
    isManualReward,
    givenBy,
    givenReason: rewardSnapshot.reason,
  })

  await userReward.save()
  return userReward
}

// ADDED: Static method to get user's manual rewards count (for backward compatibility)
UserRewardSchema.statics.getUserManualRewardsCount = async function (userId) {
  return await this.countDocuments({
    userId,
    isManualReward: true,
    status: 'active',
  })
}

// ADDED: Update expired rewards (cron job compatibility)
UserRewardSchema.statics.updateExpiredRewards = async function () {
  const now = new Date()

  const result = await this.updateMany(
    {
      status: 'active',
      expiresAt: { $lt: now },
    },
    {
      status: 'expired',
    }
  )

  return result.modifiedCount
}

// Static method to get user's game statistics
UserRewardSchema.statics.getUserGameStats = async function (userId) {
  const gameRewards = await this.find({
    userId,
    'rewardSnapshot.type': 'game_win',
  }).lean()

  const stats = {
    totalGames: gameRewards.length,
    scratchGames: gameRewards.filter(
      (r) => r.rewardSnapshot.gameType === 'scratch'
    ).length,
    spinGames: gameRewards.filter((r) => r.rewardSnapshot.gameType === 'spin')
      .length,
    pointsEarned: 0,
    activeRewards: 0,
    usedRewards: 0,
    recentGames: [],
  }

  gameRewards.forEach((reward) => {
    if (reward.rewardSnapshot.winningItem?.valueType === 'points') {
      stats.pointsEarned +=
        parseInt(reward.rewardSnapshot.winningItem.value) || 0
    }

    if (reward.status === 'active') stats.activeRewards++
    if (reward.status === 'used') stats.usedRewards++
  })

  stats.recentGames = gameRewards.slice(0, 5).map((r) => ({
    gameTitle: r.rewardSnapshot.gameTitle,
    gameType: r.rewardSnapshot.gameType,
    winningItem: r.rewardSnapshot.winningItem,
    playedAt: r.claimedAt,
    status: r.status,
  }))

  return stats
}

export default mongoose.model('UserReward', UserRewardSchema)
