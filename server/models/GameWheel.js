// File: server/models/GameWheel.js - FIXED VERSION
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
  // FIXED: Simplified probability field - no complex validation
  probability: {
    type: Number,
    min: 0,
    max: 100,
    default: 0, // Default to 0, we'll handle this in the controller
  },
  color: {
    type: String,
    default: '#FF6B6B', // Default color for wheel segments
  },
  icon: {
    type: String, // Icon name or URL
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
    // Location/Spa association
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

    // Game settings
    settings: {
      // For scratch cards
      scratchSettings: {
        maxPlaysPerUser: {
          type: Number,
          default: 1, // How many times a user can play per day
        },
        resetPeriod: {
          type: String,
          enum: ['daily', 'weekly', 'monthly', 'never'],
          default: 'daily',
        },
        requirePoints: {
          type: Number,
          default: 0, // Points required to play
        },
      },

      // For spin wheel
      spinSettings: {
        maxSpinsPerUser: {
          type: Number,
          default: 1, // How many times a user can spin per day
        },
        resetPeriod: {
          type: String,
          enum: ['daily', 'weekly', 'monthly', 'never'],
          default: 'daily',
        },
        requirePoints: {
          type: Number,
          default: 0, // Points required to spin
        },
        spinDuration: {
          type: Number,
          default: 3000, // Spin animation duration in ms
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

    // Analytics
    totalPlays: {
      type: Number,
      default: 0,
    },
    totalRewardsGiven: {
      type: Number,
      default: 0,
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

// Indexes for better performance
GameWheelSchema.index({ locationId: 1, type: 1 })
GameWheelSchema.index({ createdBy: 1 })
GameWheelSchema.index({ isActive: 1, isPublished: 1 })
GameWheelSchema.index({ startDate: 1, endDate: 1 })

// FIXED: Simplified pre-save middleware - just validate totals
GameWheelSchema.pre('save', function (next) {
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

// Method to get random item based on probability (for scratch cards)
GameWheelSchema.methods.getRandomItem = function () {
  if (this.type !== 'scratch') return null

  const activeItems = this.items.filter((item) => item.isActive)
  if (activeItems.length === 0) return null

  const random = Math.random() * 100
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

// Static method to find games by location
GameWheelSchema.statics.findByLocation = function (locationId, type = null) {
  const query = {
    locationId,
    isActive: true,
    isPublished: true,
  }

  if (type) {
    query.type = type
  }

  const now = new Date()

  // Handle start date - game should have started or no start date
  const startDateQuery = {
    $or: [
      { startDate: { $exists: false } },
      { startDate: null },
      { startDate: { $lte: now } },
    ],
  }

  // Handle end date - game should not have ended or no end date
  const endDateQuery = {
    $or: [
      { endDate: { $exists: false } },
      { endDate: null },
      { endDate: { $gte: now } },
    ],
  }

  // Combine all conditions
  const finalQuery = {
    ...query,
    ...startDateQuery,
    ...endDateQuery,
  }

  console.log(
    'GameWheel.findByLocation query:',
    JSON.stringify(finalQuery, null, 2)
  )

  return this.find(finalQuery).sort({ createdAt: -1 })
}

export default mongoose.model('GameWheel', GameWheelSchema)
