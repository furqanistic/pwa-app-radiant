// File: server/models/GameWheel.js - ENHANCED WITH BETTER PLAY FREQUENCY CONTROLS
import mongoose from 'mongoose'

const GameWheelItemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  value: {
    type: String, // Could be points, discount, prize name, etc.
    required: true,
  },
  valueType: {
    type: String,
    enum: ['points', 'discount', 'prize', 'service', 'other'],
    default: 'points',
  },
  probability: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  color: {
    type: String,
    default: '#6366F1',
  },
  icon: {
    type: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
})

const GameWheelSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ['scratch', 'spin'],
      required: true,
    },
    // Location/Spa association - ENHANCED
    locationId: {
      type: String,
      required: true,
      index: true,
    },
    locationName: {
      type: String,
      required: true,
    },
    // Creator information
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    creatorName: {
      type: String,
      required: true,
    },
    // Game items/segments
    items: [GameWheelItemSchema],

    // ENHANCED: Game settings with better play frequency controls
    settings: {
      // For scratch cards
      scratchSettings: {
        maxPlaysPerUser: {
          type: Number,
          default: 1,
          min: 1,
          max: 10, // Reasonable limit to prevent abuse
        },
        resetPeriod: {
          type: String,
          enum: ['daily', 'weekly', 'monthly', 'never'],
          default: 'daily',
        },
        requirePoints: {
          type: Number,
          default: 10,
          min: 0,
          max: 1000, // Reasonable limit
        },
      },

      // For spin wheel
      spinSettings: {
        maxSpinsPerUser: {
          type: Number,
          default: 1,
          min: 1,
          max: 10, // Reasonable limit to prevent abuse
        },
        resetPeriod: {
          type: String,
          enum: ['daily', 'weekly', 'monthly', 'never'],
          default: 'daily',
        },
        requirePoints: {
          type: Number,
          default: 10,
          min: 0,
          max: 1000, // Reasonable limit
        },
        spinDuration: {
          type: Number,
          default: 3000,
          min: 1000,
          max: 10000, // 1-10 seconds
        },
      },
    },

    // Status and visibility
    isActive: {
      type: Boolean,
      default: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },

    // Analytics - ENHANCED
    totalPlays: {
      type: Number,
      default: 0,
    },
    totalRewardsGiven: {
      type: Number,
      default: 0,
    },

    // NEW: Play tracking for analytics
    playsByPeriod: {
      daily: { type: Number, default: 0 },
      weekly: { type: Number, default: 0 },
      monthly: { type: Number, default: 0 },
      lastResetDate: { type: Date, default: Date.now },
    },

    // Schedule (optional)
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },

    // Metadata
    tags: [String],
    category: {
      type: String,
      default: 'general',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// Virtual for active items count
GameWheelSchema.virtual('activeItemsCount').get(function () {
  return this.items.filter((item) => item.isActive).length
})

// Virtual for total probability (for scratch cards)
GameWheelSchema.virtual('totalProbability').get(function () {
  if (this.type !== 'scratch') return null
  return this.items
    .filter((item) => item.isActive)
    .reduce((total, item) => total + (item.probability || 0), 0)
})

// ENHANCED: Virtual for current play settings
GameWheelSchema.virtual('currentSettings').get(function () {
  if (this.type === 'scratch') {
    return (
      this.settings?.scratchSettings || {
        maxPlaysPerUser: 1,
        resetPeriod: 'daily',
        requirePoints: 10,
      }
    )
  } else {
    return (
      this.settings?.spinSettings || {
        maxSpinsPerUser: 1,
        resetPeriod: 'daily',
        requirePoints: 10,
        spinDuration: 3000,
      }
    )
  }
})

// Indexes for better performance - ENHANCED
GameWheelSchema.index({ locationId: 1, type: 1 })
GameWheelSchema.index({ locationId: 1, isActive: 1, isPublished: 1 })
GameWheelSchema.index({ createdBy: 1 })
GameWheelSchema.index({ isActive: 1, isPublished: 1 })
GameWheelSchema.index({ startDate: 1, endDate: 1 })

// ENHANCED: Pre-save middleware with better validation
GameWheelSchema.pre('save', function (next) {
  // Validate scratch card probabilities
  if (this.type === 'scratch' && this.items.length > 0) {
    const totalProbability = this.items
      .filter((item) => item.isActive)
      .reduce((total, item) => total + (item.probability || 0), 0)

    if (totalProbability > 100) {
      const error = new Error('Total probability cannot exceed 100%')
      error.statusCode = 400
      return next(error)
    }
  }

  // Ensure settings exist and have valid values
  if (!this.settings) {
    this.settings = {}
  }

  if (this.type === 'scratch') {
    if (!this.settings.scratchSettings) {
      this.settings.scratchSettings = {
        maxPlaysPerUser: 1,
        resetPeriod: 'daily',
        requirePoints: 10,
      }
    }
    // Validate scratch settings
    const s = this.settings.scratchSettings
    s.maxPlaysPerUser = Math.max(1, Math.min(10, s.maxPlaysPerUser || 1))
    s.requirePoints = Math.max(0, Math.min(1000, s.requirePoints || 10))
  } else if (this.type === 'spin') {
    if (!this.settings.spinSettings) {
      this.settings.spinSettings = {
        maxSpinsPerUser: 1,
        resetPeriod: 'daily',
        requirePoints: 10,
        spinDuration: 3000,
      }
    }
    // Validate spin settings
    const s = this.settings.spinSettings
    s.maxSpinsPerUser = Math.max(1, Math.min(10, s.maxSpinsPerUser || 1))
    s.requirePoints = Math.max(0, Math.min(1000, s.requirePoints || 10))
    s.spinDuration = Math.max(1000, Math.min(10000, s.spinDuration || 3000))
  }

  next()
})

// Method to check if game is currently active
GameWheelSchema.methods.isCurrentlyActive = function () {
  const now = new Date()

  if (!this.isActive || !this.isPublished) return false

  if (this.startDate && now < this.startDate) return false
  if (this.endDate && now > this.endDate) return false

  return true
}

// ENHANCED: Method to get random item based on probability (for scratch cards)
GameWheelSchema.methods.getRandomItem = function () {
  if (this.type !== 'scratch') return null

  const activeItems = this.items.filter((item) => item.isActive)
  if (activeItems.length === 0) return null

  // If no probabilities set, return random item
  const totalProbability = activeItems.reduce(
    (sum, item) => sum + (item.probability || 0),
    0
  )
  if (totalProbability === 0) {
    return activeItems[Math.floor(Math.random() * activeItems.length)]
  }

  const random = Math.random() * totalProbability
  let cumulativeProbability = 0

  for (const item of activeItems) {
    cumulativeProbability += item.probability || 0
    if (random <= cumulativeProbability) {
      return item
    }
  }

  // Fallback to first item if no match found
  return activeItems[0]
}

// NEW: Method to get play limits for a user
GameWheelSchema.methods.getPlayLimits = function () {
  const settings = this.currentSettings
  return {
    maxPlays:
      this.type === 'scratch'
        ? settings.maxPlaysPerUser
        : settings.maxSpinsPerUser,
    resetPeriod: settings.resetPeriod,
    requirePoints: settings.requirePoints,
    ...(this.type === 'spin' && { spinDuration: settings.spinDuration }),
  }
}

// NEW: Method to calculate next reset time based on period
GameWheelSchema.methods.getNextResetTime = function (resetPeriod = null) {
  const period = resetPeriod || this.currentSettings.resetPeriod
  const now = new Date()

  switch (period) {
    case 'daily':
      const nextDay = new Date(now)
      nextDay.setDate(nextDay.getDate() + 1)
      nextDay.setHours(0, 0, 0, 0)
      return nextDay

    case 'weekly':
      const nextWeek = new Date(now)
      const daysUntilSunday = 7 - nextWeek.getDay()
      nextWeek.setDate(nextWeek.getDate() + daysUntilSunday)
      nextWeek.setHours(0, 0, 0, 0)
      return nextWeek

    case 'monthly':
      const nextMonth = new Date(now)
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      nextMonth.setDate(1)
      nextMonth.setHours(0, 0, 0, 0)
      return nextMonth

    case 'never':
    default:
      return null
  }
}

// Static method to find games by location - ENHANCED
GameWheelSchema.statics.findByLocation = function (
  locationId,
  type = null,
  options = {}
) {
  const { includeInactive = false, includeUnpublished = false } = options

  const query = { locationId }

  if (type) query.type = type
  if (!includeInactive) query.isActive = true
  if (!includeUnpublished) query.isPublished = true

  const now = new Date()

  // Handle scheduled games
  const dateConditions = []

  // Game should have started or no start date
  dateConditions.push({
    $or: [
      { startDate: { $exists: false } },
      { startDate: null },
      { startDate: { $lte: now } },
    ],
  })

  // Game should not have ended or no end date
  dateConditions.push({
    $or: [
      { endDate: { $exists: false } },
      { endDate: null },
      { endDate: { $gte: now } },
    ],
  })

  const finalQuery = {
    ...query,
    $and: dateConditions,
  }

  console.log(
    'GameWheel.findByLocation query:',
    JSON.stringify(finalQuery, null, 2)
  )

  return this.find(finalQuery).sort({ createdAt: -1 })
}

// NEW: Static method to get games with play analytics
GameWheelSchema.statics.getGamesWithAnalytics = async function (locationId) {
  const games = await this.find({ locationId }).populate(
    'createdBy',
    'name email'
  )

  // You could add play count analytics here by querying UserReward collection
  return games.map((game) => ({
    ...game.toObject(),
    analytics: {
      totalPlays: game.totalPlays,
      totalRewards: game.totalRewardsGiven,
      avgPlaysPerUser: 0, // Calculate from UserReward if needed
    },
  }))
}

// NEW: Method to validate game settings
GameWheelSchema.methods.validateSettings = function () {
  const errors = []
  const settings = this.currentSettings

  if (settings.maxPlaysPerUser < 1 || settings.maxPlaysPerUser > 10) {
    errors.push('Max plays per user must be between 1 and 10')
  }

  if (settings.requirePoints < 0 || settings.requirePoints > 1000) {
    errors.push('Required points must be between 0 and 1000')
  }

  if (!['daily', 'weekly', 'monthly', 'never'].includes(settings.resetPeriod)) {
    errors.push('Reset period must be daily, weekly, monthly, or never')
  }

  if (this.type === 'spin' && settings.spinDuration) {
    if (settings.spinDuration < 1000 || settings.spinDuration > 10000) {
      errors.push('Spin duration must be between 1000 and 10000 milliseconds')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export default mongoose.model('GameWheel', GameWheelSchema)
