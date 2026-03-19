// File: server/models/ReferralConfig.js
import mongoose from 'mongoose'

const LEGACY_TO_CURRENT_POINTS = new Map([
  [4000, 400],
  [2000, 200],
  [6000, 600],
  [3000, 300],
])

const normalizeLegacyPointsValue = (value) => {
  if (typeof value !== 'number') return value
  return LEGACY_TO_CURRENT_POINTS.get(value) ?? value
}

const ReferralConfigSchema = new mongoose.Schema(
  {
    // Signup rewards
    signupReward: {
      enabled: { type: Boolean, default: true },
      referrerPoints: { type: Number, default: 400 },
      referredPoints: { type: Number, default: 200 },
      description: { type: String, default: 'Signup bonus' },
    },

    // First purchase rewards
    firstPurchaseReward: {
      enabled: { type: Boolean, default: true },
      referrerPoints: { type: Number, default: 600 },
      referredPoints: { type: Number, default: 300 },
      description: { type: String, default: 'First purchase bonus' },
    },

    // Milestone rewards
    milestoneRewards: [
      {
        name: { type: String },
        referralsRequired: { type: Number },
        bonusPoints: { type: Number },
        description: { type: String },
      },
    ],

    // Tier system configuration
    tierMultipliers: {
      bronze: { type: Number, default: 1.0 },
      gold: { type: Number, default: 1.5 },
      platinum: { type: Number, default: 2.5 },
    },

    // Tier thresholds
    tierThresholds: {
      gold: { type: Number, default: 5 },
      platinum: { type: Number, default: 10 },
    },

    // Spa-specific configurations
    spaConfigs: [
      {
        locationId: { type: String, required: true },
        locationName: { type: String },
        signupReward: {
          enabled: { type: Boolean, default: true },
          referrerPoints: { type: Number },
          referredPoints: { type: Number },
        },
        firstPurchaseReward: {
          enabled: { type: Boolean, default: true },
          referrerPoints: { type: Number },
          referredPoints: { type: Number },
        },
        tierMultipliers: {
          bronze: { type: Number },
          gold: { type: Number },
          platinum: { type: Number },
        },
        customSettings: { type: Map, of: mongoose.Schema.Types.Mixed },
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        updatedAt: { type: Date, default: Date.now },
      },
    ],

    // General settings
    settings: {
      codeExpiryDays: { type: Number, default: 30 },
      maxReferralsPerUser: { type: Number, default: 100 },
      minCashoutPoints: { type: Number, default: 1000 },
      autoApprove: { type: Boolean, default: true },
      allowSelfReferral: { type: Boolean, default: false },
      codeLength: { type: Number, default: 6 },
      emailNotifications: { type: Boolean, default: true },
    },

    // Tracking
    isActive: { type: Boolean, default: true },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
)

// Get or create active config
ReferralConfigSchema.statics.getActiveConfig = async function () {
  let config = await this.findOne({ isActive: true })

  if (!config) {
    config = await this.create({
      milestoneRewards: [
        {
          name: 'First 10 Referrals',
          referralsRequired: 10,
          bonusPoints: 500,
          description: 'Bonus for reaching 10 referrals',
        },
        {
          name: 'Super Referrer',
          referralsRequired: 25,
          bonusPoints: 1500,
          description: 'Bonus for reaching 25 referrals',
        },
      ],
    })
  }

  // One-time compatibility migration for old configs stored with inflated values
  // (e.g. 4000/2000 instead of 400/200).
  let hasChanges = false

  const normalizedSignupReferrer = normalizeLegacyPointsValue(
    config.signupReward?.referrerPoints
  )
  if (normalizedSignupReferrer !== config.signupReward?.referrerPoints) {
    config.signupReward.referrerPoints = normalizedSignupReferrer
    hasChanges = true
  }

  const normalizedSignupReferred = normalizeLegacyPointsValue(
    config.signupReward?.referredPoints
  )
  if (normalizedSignupReferred !== config.signupReward?.referredPoints) {
    config.signupReward.referredPoints = normalizedSignupReferred
    hasChanges = true
  }

  const normalizedFirstPurchaseReferrer = normalizeLegacyPointsValue(
    config.firstPurchaseReward?.referrerPoints
  )
  if (
    normalizedFirstPurchaseReferrer !== config.firstPurchaseReward?.referrerPoints
  ) {
    config.firstPurchaseReward.referrerPoints = normalizedFirstPurchaseReferrer
    hasChanges = true
  }

  const normalizedFirstPurchaseReferred = normalizeLegacyPointsValue(
    config.firstPurchaseReward?.referredPoints
  )
  if (
    normalizedFirstPurchaseReferred !== config.firstPurchaseReward?.referredPoints
  ) {
    config.firstPurchaseReward.referredPoints = normalizedFirstPurchaseReferred
    hasChanges = true
  }

  if (Array.isArray(config.spaConfigs) && config.spaConfigs.length > 0) {
    for (const spaConfig of config.spaConfigs) {
      if (!spaConfig) continue

      const normalizedSpaSignupReferrer = normalizeLegacyPointsValue(
        spaConfig.signupReward?.referrerPoints
      )
      if (
        normalizedSpaSignupReferrer !== spaConfig.signupReward?.referrerPoints
      ) {
        spaConfig.signupReward.referrerPoints = normalizedSpaSignupReferrer
        hasChanges = true
      }

      const normalizedSpaSignupReferred = normalizeLegacyPointsValue(
        spaConfig.signupReward?.referredPoints
      )
      if (
        normalizedSpaSignupReferred !== spaConfig.signupReward?.referredPoints
      ) {
        spaConfig.signupReward.referredPoints = normalizedSpaSignupReferred
        hasChanges = true
      }

      const normalizedSpaFirstPurchaseReferrer = normalizeLegacyPointsValue(
        spaConfig.firstPurchaseReward?.referrerPoints
      )
      if (
        normalizedSpaFirstPurchaseReferrer !==
        spaConfig.firstPurchaseReward?.referrerPoints
      ) {
        spaConfig.firstPurchaseReward.referrerPoints =
          normalizedSpaFirstPurchaseReferrer
        hasChanges = true
      }

      const normalizedSpaFirstPurchaseReferred = normalizeLegacyPointsValue(
        spaConfig.firstPurchaseReward?.referredPoints
      )
      if (
        normalizedSpaFirstPurchaseReferred !==
        spaConfig.firstPurchaseReward?.referredPoints
      ) {
        spaConfig.firstPurchaseReward.referredPoints =
          normalizedSpaFirstPurchaseReferred
        hasChanges = true
      }
    }
  }

  if (hasChanges) {
    await config.save()
  }

  return config
}

// Get spa-specific configuration
ReferralConfigSchema.methods.getSpaConfig = function (locationId) {
  const spaConfig = this.spaConfigs.find(
    (config) => config.locationId === locationId
  )

  if (spaConfig) {
    // Merge with global config
    return {
      locationId: spaConfig.locationId,
      locationName: spaConfig.locationName,
      signupReward: {
        ...this.signupReward.toObject(),
        ...spaConfig.signupReward,
      },
      firstPurchaseReward: {
        ...this.firstPurchaseReward.toObject(),
        ...spaConfig.firstPurchaseReward,
      },
      tierMultipliers: {
        ...this.tierMultipliers,
        ...spaConfig.tierMultipliers,
      },
      settings: this.settings,
    }
  }

  // Return global config if no spa-specific config
  return {
    locationId: 'global',
    locationName: 'Global Settings',
    signupReward: this.signupReward,
    firstPurchaseReward: this.firstPurchaseReward,
    tierMultipliers: this.tierMultipliers,
    settings: this.settings,
  }
}

// Calculate rewards with tier multiplier
ReferralConfigSchema.methods.calculateRewards = function (
  rewardType,
  tier = 'bronze',
  locationId = null
) {
  const config = locationId ? this.getSpaConfig(locationId) : this

  let baseReferrerPoints = 0
  let baseReferredPoints = 0

  if (rewardType === 'signup' && config.signupReward.enabled) {
    baseReferrerPoints = config.signupReward.referrerPoints
    baseReferredPoints = config.signupReward.referredPoints
  } else if (
    rewardType === 'first_purchase' &&
    config.firstPurchaseReward.enabled
  ) {
    baseReferrerPoints = config.firstPurchaseReward.referrerPoints
    baseReferredPoints = config.firstPurchaseReward.referredPoints
  }

  const multiplier = config.tierMultipliers[tier] || 1.0

  return {
    referrerPoints: Math.round(baseReferrerPoints * multiplier),
    referredPoints: Math.round(baseReferredPoints * multiplier),
    tier,
    multiplier,
  }
}

// Determine tier based on referral count
ReferralConfigSchema.methods.determineTier = function (totalReferrals) {
  if (totalReferrals >= this.tierThresholds.platinum) {
    return 'platinum'
  } else if (totalReferrals >= this.tierThresholds.gold) {
    return 'gold'
  }
  return 'bronze'
}

// Calculate spa-specific reward
ReferralConfigSchema.methods.calculateSpaReward = function (
  rewardType,
  locationId,
  tier = 'bronze',
  purchaseAmount = 0
) {
  const spaConfig = this.getSpaConfig(locationId)

  let baseReferrerPoints = 0
  let baseReferredPoints = 0

  if (rewardType === 'signup' && spaConfig.signupReward.enabled) {
    baseReferrerPoints = spaConfig.signupReward.referrerPoints || 400
    baseReferredPoints = spaConfig.signupReward.referredPoints || 200
  } else if (
    rewardType === 'first_purchase' &&
    spaConfig.firstPurchaseReward.enabled
  ) {
    baseReferrerPoints = spaConfig.firstPurchaseReward.referrerPoints || 600
    baseReferredPoints = spaConfig.firstPurchaseReward.referredPoints || 300
  } else if (rewardType === 'milestone') {
    // For milestone rewards, use purchase amount percentage
    baseReferrerPoints = Math.round(purchaseAmount * 0.1) // 10% of purchase
    baseReferredPoints = Math.round(purchaseAmount * 0.05) // 5% of purchase
  }

  const multiplier = spaConfig.tierMultipliers[tier] || 1.0

  return {
    referrerPoints: Math.round(baseReferrerPoints * multiplier),
    referredPoints: Math.round(baseReferredPoints * multiplier),
    tier,
    multiplier,
    spaConfig: {
      locationId: spaConfig.locationId,
      locationName: spaConfig.locationName,
    },
  }
}

// Set spa-specific configuration
ReferralConfigSchema.methods.setSpaConfig = function (
  locationId,
  locationName,
  userId,
  configData
) {
  const existingIndex = this.spaConfigs.findIndex(
    (config) => config.locationId === locationId
  )

  const spaConfig = {
    locationId,
    locationName,
    ...configData,
    updatedAt: new Date(),
    createdBy: userId,
  }

  if (existingIndex >= 0) {
    this.spaConfigs[existingIndex] = {
      ...this.spaConfigs[existingIndex].toObject(),
      ...spaConfig,
    }
  } else {
    this.spaConfigs.push(spaConfig)
  }

  return this.spaConfigs.find((config) => config.locationId === locationId)
}

export default mongoose.model('ReferralConfig', ReferralConfigSchema)
