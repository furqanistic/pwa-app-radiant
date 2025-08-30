// File: server/models/UserReward.js - ENHANCED VERSION

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
      default: null, // Can be null for manual rewards
      index: true,
    },
    rewardSnapshot: {
      // Store reward details at time of claiming
      name: String,
      description: String,
      type: String,
      pointCost: Number,
      value: Number,
      validDays: Number,
      serviceId: mongoose.Schema.Types.ObjectId,
      serviceName: String,
      categoryId: mongoose.Schema.Types.ObjectId,
      categoryName: String,

      // Manual reward specific fields
      isManual: { type: Boolean, default: false },
      givenBy: String,
      givenByRole: String,
      reason: String,
    },
    status: {
      type: String,
      enum: ['active', 'used', 'expired', 'cancelled'],
      default: 'active',
      index: true,
    },
    claimedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    usedValue: {
      type: Number,
      default: null,
    },
    locationId: {
      type: String,
      index: true,
    },

    // NEW: Manual reward tracking
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
    notificationSent: {
      type: Boolean,
      default: false,
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
UserRewardSchema.index({ userId: 1, isManualReward: 1 })
UserRewardSchema.index({ userId: 1, createdAt: -1 })
UserRewardSchema.index({ expiresAt: 1 })

// Virtual to check if reward is still valid
UserRewardSchema.virtual('isValid').get(function () {
  return (
    this.status === 'active' && this.expiresAt && new Date() < this.expiresAt
  )
})

// Virtual to check if expired
UserRewardSchema.virtual('isExpired').get(function () {
  return this.expiresAt && new Date() > this.expiresAt
})

// Virtual for days remaining
UserRewardSchema.virtual('daysRemaining').get(function () {
  if (!this.expiresAt || this.status !== 'active') return 0
  const msRemaining = this.expiresAt - new Date()
  return Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)))
})

// Enhanced method to create user reward
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

  // Calculate expiry date
  const validDays = rewardSnapshot.validDays || 30
  const expiresAt = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000)

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

// Method to mark reward as used
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
  this.usedValue = actualValue || this.rewardSnapshot.value

  await this.save()
  return this
}

// Static method to get user's monthly claim count
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

// Static method to get user's manual rewards count
UserRewardSchema.statics.getUserManualRewardsCount = async function (userId) {
  return await this.countDocuments({
    userId,
    isManualReward: true,
    status: 'active',
  })
}

// Update expired rewards (cron job)
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

export default mongoose.model('UserReward', UserRewardSchema)
