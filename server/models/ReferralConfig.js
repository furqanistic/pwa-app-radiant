// File: server/models/ReferralConfig.js
import mongoose from 'mongoose'

const ReferralConfigSchema = new mongoose.Schema(
  {
    // Config name for identification
    name: {
      type: String,
      required: true,
      unique: true,
      default: 'default',
    },

    // Signup referral rewards
    signupReward: {
      enabled: { type: Boolean, default: true },
      referrerPoints: { type: Number, default: 200 },
      referredPoints: { type: Number, default: 100 },
      description: {
        type: String,
        default: 'Reward for successful signup through referral',
      },
    },

    // First purchase referral rewards
    firstPurchaseReward: {
      enabled: { type: Boolean, default: true },
      referrerPoints: { type: Number, default: 500 },
      referredPoints: { type: Number, default: 250 },
      description: {
        type: String,
        default: 'Reward for first purchase by referred user',
      },
    },

    // Milestone-based rewards
    milestoneRewards: [
      {
        milestone: { type: String, required: true }, // e.g., 'first_booking', 'loyalty_member'
        referrerPoints: { type: Number, default: 100 },
        referredPoints: { type: Number, default: 50 },
        description: { type: String },
        enabled: { type: Boolean, default: true },
      },
    ],

    // Tier-based rewards
    tierMultipliers: {
      bronze: { type: Number, default: 1.0 },
      gold: { type: Number, default: 1.5 },
      platinum: { type: Number, default: 2.0 },
    },

    // General settings
    settings: {
      // Referral code expiry in days
      codeExpiryDays: { type: Number, default: 30 },

      // Maximum referrals per user
      maxReferralsPerUser: { type: Number, default: 100 },

      // Minimum points to cash out
      minCashoutPoints: { type: Number, default: 1000 },

      // Auto-approve referrals
      autoApprove: { type: Boolean, default: true },

      // Allow self-referral
      allowSelfReferral: { type: Boolean, default: false },

      // Referral code length
      codeLength: { type: Number, default: 6 },

      // Enable email notifications
      emailNotifications: { type: Boolean, default: true },
    },

    // Promotional campaigns
    campaigns: [
      {
        name: { type: String, required: true },
        description: { type: String },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        multiplier: { type: Number, default: 1.5 }, // Bonus multiplier
        enabled: { type: Boolean, default: true },
        targetLocations: [{ type: String }], // Specific spa locations
        conditions: {
          minPurchase: { type: Number, default: 0 },
          userTypes: [
            { type: String, enum: ['new', 'existing', 'all'], default: 'all' },
          ],
        },
      },
    ],

    // Last updated info
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Active status
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// Method to get current active campaign
ReferralConfigSchema.methods.getActiveCampaign = function (locationId = null) {
  const now = new Date()

  return this.campaigns.find((campaign) => {
    if (!campaign.enabled) return false
    if (campaign.startDate > now || campaign.endDate < now) return false

    // Check location-specific campaigns
    if (locationId && campaign.targetLocations.length > 0) {
      return campaign.targetLocations.includes(locationId)
    }

    return campaign.targetLocations.length === 0 // General campaigns
  })
}

// Method to calculate reward points with tier and campaign multipliers
ReferralConfigSchema.methods.calculateReward = function (
  rewardType,
  userTier = 'bronze',
  locationId = null,
  purchaseAmount = 0
) {
  let baseReward = { referrerPoints: 0, referredPoints: 0 }

  // Get base reward based on type
  switch (rewardType) {
    case 'signup':
      if (this.signupReward.enabled) {
        baseReward = {
          referrerPoints: this.signupReward.referrerPoints,
          referredPoints: this.signupReward.referredPoints,
        }
      }
      break
    case 'first_purchase':
      if (this.firstPurchaseReward.enabled) {
        baseReward = {
          referrerPoints: this.firstPurchaseReward.referrerPoints,
          referredPoints: this.firstPurchaseReward.referredPoints,
        }
      }
      break
    default:
      // Check milestone rewards
      const milestone = this.milestoneRewards.find(
        (m) => m.milestone === rewardType && m.enabled
      )
      if (milestone) {
        baseReward = {
          referrerPoints: milestone.referrerPoints,
          referredPoints: milestone.referredPoints,
        }
      }
  }

  // Apply tier multiplier
  const tierMultiplier = this.tierMultipliers[userTier] || 1.0

  // Apply campaign multiplier if active
  const activeCampaign = this.getActiveCampaign(locationId)
  const campaignMultiplier = activeCampaign ? activeCampaign.multiplier : 1.0

  // Check campaign conditions
  let campaignApplies = true
  if (
    activeCampaign &&
    activeCampaign.conditions.minPurchase > purchaseAmount
  ) {
    campaignApplies = false
  }

  const finalMultiplier =
    tierMultiplier * (campaignApplies ? campaignMultiplier : 1.0)

  return {
    referrerPoints: Math.round(baseReward.referrerPoints * finalMultiplier),
    referredPoints: Math.round(baseReward.referredPoints * finalMultiplier),
    appliedMultipliers: {
      tier: tierMultiplier,
      campaign: campaignApplies ? campaignMultiplier : 1.0,
      final: finalMultiplier,
    },
    activeCampaign: campaignApplies ? activeCampaign : null,
  }
}

// Static method to get active config
ReferralConfigSchema.statics.getActiveConfig = async function () {
  let config = await this.findOne({ name: 'default', isActive: true })

  if (!config) {
    // Create default config if none exists
    config = await this.create({
      name: 'default',
      isActive: true,
    })
  }

  return config
}

export default mongoose.model('ReferralConfig', ReferralConfigSchema)
