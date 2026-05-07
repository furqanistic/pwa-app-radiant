// File: server/models/Referral.js
import mongoose from 'mongoose'

const ReferralSchema = new mongoose.Schema(
  {
    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    referred: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    referralCode: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'expired', 'cancelled'],
      default: 'pending',
    },
    rewardType: {
      type: String,
      enum: ['signup', 'first_purchase', 'milestone'],
      default: 'signup',
    },
    referrerReward: {
      points: { type: Number, default: 0 },
      awarded: { type: Boolean, default: false },
      awardedAt: { type: Date },
    },
    referredReward: {
      points: { type: Number, default: 0 },
      awarded: { type: Boolean, default: false },
      awardedAt: { type: Date },
    },
    metadata: {
      // Additional data like purchase amount, milestone achieved, etc.
      purchaseAmount: { type: Number },
      milestone: { type: String },
      notes: { type: String },
    },
    completedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      default: function () {
        // Default expiry: 30 days from creation
        return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// Indexes for better performance
ReferralSchema.index({ referrer: 1, status: 1 })
ReferralSchema.index({ referred: 1 })
ReferralSchema.index({ referralCode: 1 })
ReferralSchema.index({ expiresAt: 1 })
ReferralSchema.index({ createdAt: 1 })

// Virtual for total reward points
ReferralSchema.virtual('totalRewardPoints').get(function () {
  return this.referrerReward.points + this.referredReward.points
})

// Method to check if referral is expired
ReferralSchema.methods.isExpired = function () {
  return this.expiresAt && new Date() > this.expiresAt
}

// Method to complete referral and award points
ReferralSchema.methods.complete = async function () {
  if (this.status === 'completed') {
    throw new Error('Referral already completed')
  }

  if (this.isExpired()) {
    this.status = 'expired'
    await this.save()
    throw new Error('Referral has expired')
  }

  this.status = 'completed'
  this.completedAt = new Date()

  // Award points to both users
  if (!this.referrerReward.awarded && this.referrerReward.points > 0) {
    const referrer = await mongoose.model('User').findById(this.referrer)
    if (referrer) {
      referrer.points = (referrer.points || 0) + this.referrerReward.points
      referrer.referralEarnings =
        (referrer.referralEarnings || 0) + this.referrerReward.points
      referrer.referralStats.convertedReferrals += 1
      await referrer.save()
    }

    this.referrerReward.awarded = true
    this.referrerReward.awardedAt = new Date()
  }

  if (!this.referredReward.awarded && this.referredReward.points > 0) {
    const referred = await mongoose.model('User').findById(this.referred)
    if (referred) {
      referred.points = (referred.points || 0) + this.referredReward.points
      await referred.save()
    }

    this.referredReward.awarded = true
    this.referredReward.awardedAt = new Date()
  }

  await this.save()
  return this
}

// Static method to clean up expired referrals
ReferralSchema.statics.cleanupExpired = async function () {
  const expiredReferrals = await this.updateMany(
    {
      status: 'pending',
      expiresAt: { $lt: new Date() },
    },
    {
      status: 'expired',
    }
  )

  return expiredReferrals.modifiedCount
}

export default mongoose.model('Referral', ReferralSchema)
