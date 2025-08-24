// File: server/models/ReferralConfig.js - ENHANCED FOR SPA-SPECIFIC REWARDS
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

    // ENHANCED: Spa-specific configurations
    spaConfigs: [
      {
        locationId: { type: String, required: true }, // GHL location ID
        locationName: { type: String, required: true },
        ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Team user who owns this spa

        // Spa-specific signup rewards
        signupReward: {
          enabled: { type: Boolean, default: true },
          referrerPoints: { type: Number, default: 200 },
          referredPoints: { type: Number, default: 100 },
          description: {
            type: String,
            default: 'Reward for successful signup through referral',
          },
        },

        // Spa-specific first purchase rewards
        firstPurchaseReward: {
          enabled: { type: Boolean, default: true },
          referrerPoints: { type: Number, default: 500 },
          referredPoints: { type: Number, default: 250 },
          description: {
            type: String,
            default: 'Reward for first purchase by referred user',
          },
        },

        // Spa-specific milestone rewards
        milestoneRewards: [
          {
            milestone: { type: String, required: true },
            referrerPoints: { type: Number, default: 100 },
            referredPoints: { type: Number, default: 50 },
            description: { type: String },
            enabled: { type: Boolean, default: true },
          },
        ],

        // Spa-specific settings
        settings: {
          codeExpiryDays: { type: Number, default: 30 },
          maxReferralsPerUser: { type: Number, default: 100 },
          autoApprove: { type: Boolean, default: true },
          allowSelfReferral: { type: Boolean, default: false },
          emailNotifications: { type: Boolean, default: true },
        },

        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],

    // Global/default signup referral rewards (fallback)
    signupReward: {
      enabled: { type: Boolean, default: true },
      referrerPoints: { type: Number, default: 150 },
      referredPoints: { type: Number, default: 75 },
      description: {
        type: String,
        default: 'Global reward for successful signup through referral',
      },
    },

    // Global/default first purchase referral rewards (fallback)
    firstPurchaseReward: {
      enabled: { type: Boolean, default: true },
      referrerPoints: { type: Number, default: 400 },
      referredPoints: { type: Number, default: 200 },
      description: {
        type: String,
        default: 'Global reward for first purchase by referred user',
      },
    },

    // Global milestone-based rewards (fallback)
    milestoneRewards: [
      {
        milestone: { type: String, required: true },
        referrerPoints: { type: Number, default: 100 },
        referredPoints: { type: Number, default: 50 },
        description: { type: String },
        enabled: { type: Boolean, default: true },
      },
    ],

    // Global tier-based rewards
    tierMultipliers: {
      bronze: { type: Number, default: 1.0 },
      gold: { type: Number, default: 1.5 },
      platinum: { type: Number, default: 2.0 },
    },

    // Global general settings (fallback)
    settings: {
      codeExpiryDays: { type: Number, default: 30 },
      maxReferralsPerUser: { type: Number, default: 100 },
      minCashoutPoints: { type: Number, default: 1000 },
      autoApprove: { type: Boolean, default: true },
      allowSelfReferral: { type: Boolean, default: false },
      codeLength: { type: Number, default: 6 },
      emailNotifications: { type: Boolean, default: true },
    },

    // Promotional campaigns
    campaigns: [
      {
        name: { type: String, required: true },
        description: { type: String },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        multiplier: { type: Number, default: 1.5 },
        enabled: { type: Boolean, default: true },
        targetLocations: [{ type: String }],
        conditions: {
          minPurchase: { type: Number, default: 0 },
          userTypes: [
            { type: String, enum: ['new', 'existing', 'all'], default: 'all' },
          ],
        },
      },
    ],

    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

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

// ENHANCED: Method to get spa-specific configuration with better fallback logic
ReferralConfigSchema.methods.getSpaConfig = function (locationId) {
  console.log('🔍 Looking for spa config for locationId:', locationId)
  console.log(
    '📋 Available spa configs:',
    this.spaConfigs.map((c) => ({
      locationId: c.locationId,
      name: c.locationName,
    }))
  )

  const spaConfig = this.spaConfigs.find(
    (config) => config.locationId === locationId
  )

  if (spaConfig) {
    console.log('✅ Found spa-specific config:', spaConfig.locationName)
    return spaConfig
  }

  console.log('⚠️ No spa-specific config found, using global defaults')
  // Return global config as fallback
  return {
    locationId: 'global',
    locationName: 'Global Default',
    signupReward: this.signupReward,
    firstPurchaseReward: this.firstPurchaseReward,
    milestoneRewards: this.milestoneRewards,
    settings: this.settings,
  }
}

// ENHANCED: Method to set spa-specific configuration
ReferralConfigSchema.methods.setSpaConfig = function (
  locationId,
  locationName,
  ownerId,
  configData
) {
  const existingIndex = this.spaConfigs.findIndex(
    (config) => config.locationId === locationId
  )

  const newConfig = {
    locationId,
    locationName,
    ownerId,
    ...configData,
    updatedAt: new Date(),
  }

  if (existingIndex >= 0) {
    this.spaConfigs[existingIndex] = newConfig
  } else {
    this.spaConfigs.push(newConfig)
  }

  return this.spaConfigs[
    existingIndex >= 0 ? existingIndex : this.spaConfigs.length - 1
  ]
}

// ENHANCED: Method to calculate reward points with spa-specific rules
ReferralConfigSchema.methods.calculateSpaReward = function (
  rewardType,
  locationId,
  userTier = 'bronze',
  purchaseAmount = 0
) {
  console.log('💰 Calculating spa reward:', {
    rewardType,
    locationId,
    userTier,
    purchaseAmount,
  })

  const spaConfig = this.getSpaConfig(locationId)
  let baseReward = { referrerPoints: 0, referredPoints: 0 }

  console.log('⚙️ Using spa config:', {
    locationId: spaConfig.locationId,
    locationName: spaConfig.locationName,
  })

  // Get base reward based on type from spa-specific config
  switch (rewardType) {
    case 'signup':
      if (spaConfig.signupReward?.enabled) {
        baseReward = {
          referrerPoints: spaConfig.signupReward.referrerPoints,
          referredPoints: spaConfig.signupReward.referredPoints,
        }
        console.log('🎯 Signup reward:', baseReward)
      }
      break
    case 'first_purchase':
      if (spaConfig.firstPurchaseReward?.enabled) {
        baseReward = {
          referrerPoints: spaConfig.firstPurchaseReward.referrerPoints,
          referredPoints: spaConfig.firstPurchaseReward.referredPoints,
        }
        console.log('🛍️ First purchase reward:', baseReward)
      }
      break
    default:
      // Check milestone rewards in spa config
      const milestone = spaConfig.milestoneRewards?.find(
        (m) => m.milestone === rewardType && m.enabled
      )
      if (milestone) {
        baseReward = {
          referrerPoints: milestone.referrerPoints,
          referredPoints: milestone.referredPoints,
        }
        console.log('🎖️ Milestone reward:', baseReward)
      }
  }

  // Apply tier multiplier (global)
  const tierMultiplier = this.tierMultipliers[userTier] || 1.0
  console.log('🥉 Tier multiplier:', userTier, '=', tierMultiplier)

  // Apply campaign multiplier if active
  const activeCampaign = this.getActiveCampaign(locationId)
  const campaignMultiplier = activeCampaign ? activeCampaign.multiplier : 1.0
  console.log('🎪 Campaign multiplier:', campaignMultiplier)

  // Check campaign conditions
  let campaignApplies = true
  if (
    activeCampaign &&
    activeCampaign.conditions.minPurchase > purchaseAmount
  ) {
    campaignApplies = false
    console.log('❌ Campaign conditions not met')
  }

  const finalMultiplier =
    tierMultiplier * (campaignApplies ? campaignMultiplier : 1.0)

  const finalReward = {
    referrerPoints: Math.round(baseReward.referrerPoints * finalMultiplier),
    referredPoints: Math.round(baseReward.referredPoints * finalMultiplier),
    appliedMultipliers: {
      tier: tierMultiplier,
      campaign: campaignApplies ? campaignMultiplier : 1.0,
      final: finalMultiplier,
    },
    activeCampaign: campaignApplies ? activeCampaign : null,
    spaConfig: {
      locationId: spaConfig.locationId,
      locationName: spaConfig.locationName,
    },
  }

  console.log('🎉 Final reward calculation:', finalReward)
  return finalReward
}

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

// ENHANCED: Static method to get active config with auto-initialization
ReferralConfigSchema.statics.getActiveConfig = async function () {
  let config = await this.findOne({ name: 'default', isActive: true })

  if (!config) {
    console.log('🏗️ Creating default referral config...')
    // Create default config if none exists
    config = await this.create({
      name: 'default',
      isActive: true,
      // Add some default milestone rewards
      milestoneRewards: [
        {
          milestone: 'first_booking',
          referrerPoints: 300,
          referredPoints: 150,
          description: 'Reward for first booking by referred user',
          enabled: true,
        },
        {
          milestone: 'loyalty_member',
          referrerPoints: 500,
          referredPoints: 250,
          description: 'Reward for loyalty program signup',
          enabled: true,
        },
        {
          milestone: 'premium_upgrade',
          referrerPoints: 1000,
          referredPoints: 500,
          description: 'Reward for premium service upgrade',
          enabled: true,
        },
      ],
    })
    console.log('✅ Default config created')
  }

  return config
}

// NEW: Static method to create or update spa config for a team user
ReferralConfigSchema.statics.createSpaConfig = async function (
  locationId,
  locationName,
  ownerId,
  customConfig = {}
) {
  console.log('🏢 Creating/updating spa config:', {
    locationId,
    locationName,
    ownerId,
  })

  const config = await this.getActiveConfig()

  // Default spa configuration
  const defaultSpaConfig = {
    signupReward: {
      enabled: true,
      referrerPoints: customConfig.signupReferrerPoints || 250,
      referredPoints: customConfig.signupReferredPoints || 125,
      description: 'Spa-specific signup reward',
    },
    firstPurchaseReward: {
      enabled: true,
      referrerPoints: customConfig.firstPurchaseReferrerPoints || 600,
      referredPoints: customConfig.firstPurchaseReferredPoints || 300,
      description: 'Spa-specific first purchase reward',
    },
    milestoneRewards: [
      {
        milestone: 'first_booking',
        referrerPoints: 400,
        referredPoints: 200,
        description: 'First booking at this spa',
        enabled: true,
      },
      {
        milestone: 'loyalty_member',
        referrerPoints: 600,
        referredPoints: 300,
        description: 'Loyalty program signup at this spa',
        enabled: true,
      },
      {
        milestone: 'premium_upgrade',
        referrerPoints: 1200,
        referredPoints: 600,
        description: 'Premium service upgrade at this spa',
        enabled: true,
      },
    ],
    settings: {
      codeExpiryDays: 30,
      maxReferralsPerUser: 100,
      autoApprove: true,
      allowSelfReferral: false,
      emailNotifications: true,
    },
    ...customConfig,
  }

  const spaConfig = config.setSpaConfig(
    locationId,
    locationName,
    ownerId,
    defaultSpaConfig
  )
  await config.save()

  console.log('✅ Spa config created/updated')
  return spaConfig
}

export default mongoose.model('ReferralConfig', ReferralConfigSchema)
