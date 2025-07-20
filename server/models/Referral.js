// server/models/Referral.js
import mongoose from 'mongoose'

const ReferralSchema = new mongoose.Schema(
  {
    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    referee: {
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
      enum: ['pending', 'active', 'converted'],
      default: 'pending',
    },
    rewardAmount: {
      type: Number,
      default: 0,
    },
    rewardPaid: {
      type: Boolean,
      default: false,
    },
    tier: {
      type: String,
      enum: ['bronze', 'gold', 'platinum'],
      default: 'bronze',
    },
    conversionDate: {
      type: Date,
    },
    metadata: {
      refereeEmail: String,
      refereeName: String,
      referrerTierAtTime: String,
    },
  },
  { timestamps: true }
)

// Index for better query performance
ReferralSchema.index({ referrer: 1 })
ReferralSchema.index({ referee: 1 })
ReferralSchema.index({ referralCode: 1 })
ReferralSchema.index({ status: 1 })

export default mongoose.model('Referral', ReferralSchema)
