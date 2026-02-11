// File: server/models/Reward.js
// server/models/Reward.js - Enhanced with Service Integration
import mongoose from 'mongoose'

const RewardSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'credit',
        'discount',
        'service',
        'combo',
        'referral',
        'service_discount',
        'free_service',
      ],
      index: true,
    },
    pointCost: {
      type: Number,
      required: true,
      min: 1,
      index: true,
    },
    value: {
      type: Number,
      required: function () {
        // Value is required for all types except 'free_service'
        return !['service', 'free_service'].includes(this.type)
      },
      min: 0,
    },

    // ✅ SERVICE INTEGRATION FIELDS
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      default: null,
      index: true,
    },
    serviceIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
      },
    ],
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
    },
    // Applies to all services in category if set
    appliesToCategory: {
      type: Boolean,
      default: false,
    },
    // Applies to specific sub-treatments
    subTreatmentIds: [
      {
        type: String, // Sub-treatment IDs from Service model
      },
    ],

    image: {
      type: String,
      default: '',
    },
    imagePublicId: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    limit: {
      type: Number, // monthly limit per user
      required: true,
      min: 1,
      default: 1,
    },
    validDays: {
      type: Number, // how many days the reward is valid after claiming
      required: true,
      min: 1,
      default: 30,
    },

    // Analytics fields
    redeemCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalValue: {
      type: Number, // total value given away through this reward
      default: 0,
      min: 0,
    },

    // Reward-specific settings
    maxValue: {
      type: Number, // max dollar amount for percentage-based rewards
      default: null,
      min: 0,
    },
    minPurchase: {
      type: Number, // minimum purchase required to use reward
      default: null,
      min: 0,
    },

    // ✅ ENHANCED SERVICE RESTRICTIONS
    excludeServices: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
      },
    ],
    includeServices: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
      },
    ],
    excludeCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],

    // Location association
    locationId: {
      type: String,
      required: false, // Optional for global rewards
      index: true,
    },

    // Admin tracking
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    voiceNoteUrl: {
      type: String,
      default: '',
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        // Add computed fields for frontend
        ret.displayValue = calculateDisplayValue(ret)
        ret.isServiceSpecific = !!(ret.serviceId || ret.serviceIds?.length > 0)
        ret.isCategorySpecific = !!(ret.categoryId && ret.appliesToCategory)
        ret.rewardScope = getRewardScope(ret)
        return ret
      },
    },
  }
)

// Compound indexes for better performance
RewardSchema.index({ status: 1, type: 1 })
RewardSchema.index({ locationId: 1, status: 1 })
RewardSchema.index({ serviceId: 1, status: 1 })
RewardSchema.index({ categoryId: 1, status: 1 })
RewardSchema.index({ pointCost: 1, status: 1 })
RewardSchema.index({ name: 'text', description: 'text' })
RewardSchema.index({ createdAt: -1 })

// Helper function to calculate display value
function calculateDisplayValue(reward) {
  switch (reward.type) {
    case 'credit':
    case 'referral':
      return `$${reward.value}`
    case 'discount':
    case 'service_discount':
    case 'combo':
      return `${reward.value}%`
    case 'service':
    case 'free_service':
      return 'Free'
    default:
      return `$${reward.value || 0}`
  }
}

// Helper function to determine reward scope
function getRewardScope(reward) {
  if (reward.serviceId || reward.serviceIds?.length > 0) {
    return 'service_specific'
  }
  if (reward.categoryId && reward.appliesToCategory) {
    return 'category_specific'
  }
  if (reward.includeServices?.length > 0) {
    return 'limited_services'
  }
  return 'general'
}

// Virtual for reward type display
RewardSchema.virtual('typeDisplay').get(function () {
  const typeMap = {
    credit: 'Service Credit',
    discount: 'General Discount',
    service: 'Free Service',
    combo: 'Combo Deal',
    referral: 'Referral Reward',
    service_discount: 'Service Discount',
    free_service: 'Free Specific Service',
  }
  return typeMap[this.type] || this.type
})

// ✅ ENHANCED METHOD: Check if user can afford this reward
RewardSchema.methods.canAfford = function (userPoints) {
  return (
    userPoints >= this.pointCost && this.status === 'active' && !this.isDeleted
  )
}

// ✅ ENHANCED METHOD: Check if reward applies to a specific service
RewardSchema.methods.canApplyToService = function (
  serviceId,
  categoryId = null
) {
  // If it's a service-specific reward
  if (this.serviceId && this.serviceId.toString() === serviceId.toString()) {
    return true
  }

  // If it applies to multiple specific services
  if (this.serviceIds && this.serviceIds.length > 0) {
    return this.serviceIds.some((id) => id.toString() === serviceId.toString())
  }

  // If it applies to a category and the service is in that category
  if (this.categoryId && this.appliesToCategory && categoryId) {
    return this.categoryId.toString() === categoryId.toString()
  }

  // If includeServices is specified, service must be in the list
  if (this.includeServices && this.includeServices.length > 0) {
    return this.includeServices.some(
      (id) => id.toString() === serviceId.toString()
    )
  }

  // If excludeServices is specified, service must not be in the list
  if (this.excludeServices && this.excludeServices.length > 0) {
    return !this.excludeServices.some(
      (id) => id.toString() === serviceId.toString()
    )
  }

  // If excludeCategories is specified and service is in excluded category
  if (
    this.excludeCategories &&
    this.excludeCategories.length > 0 &&
    categoryId
  ) {
    return !this.excludeCategories.some(
      (id) => id.toString() === categoryId.toString()
    )
  }

  // For general rewards, check if it's not service-specific
  return !this.serviceId && (!this.serviceIds || this.serviceIds.length === 0)
}

// ✅ NEW METHOD: Calculate discount amount for a service
RewardSchema.methods.calculateDiscountForService = function (servicePrice) {
  switch (this.type) {
    case 'discount':
    case 'service_discount':
    case 'combo':
      let discountAmount = (servicePrice * this.value) / 100
      if (this.maxValue && discountAmount > this.maxValue) {
        discountAmount = this.maxValue
      }
      return discountAmount
    case 'credit':
      return Math.min(this.value, servicePrice)
    case 'service':
    case 'free_service':
      return servicePrice
    default:
      return 0
  }
}

// ✅ ENHANCED STATIC METHOD: Get rewards for a specific service
RewardSchema.statics.getRewardsForService = function (
  serviceId,
  categoryId,
  userPoints = 0,
  locationId = null
) {
  const filter = {
    status: 'active',
    isDeleted: false,
    $or: [
      // Service-specific rewards
      { serviceId: serviceId },
      { serviceIds: serviceId },
      // Category-specific rewards
      { categoryId: categoryId, appliesToCategory: true },
      // General rewards that include this service
      { includeServices: serviceId },
      // General rewards that don't exclude this service
      {
        $and: [
          { serviceId: { $exists: false } },
          { serviceIds: { $size: 0 } },
          { excludeServices: { $ne: serviceId } },
          {
            $or: [
              { excludeCategories: { $size: 0 } },
              { excludeCategories: { $ne: categoryId } },
            ],
          },
        ],
      },
    ],
  }

  // Add location filter
  if (locationId) {
    filter.$and = filter.$and || []
    filter.$and.push({
      $or: [
        { locationId: locationId },
        { locationId: { $exists: false } },
        { locationId: null },
      ],
    })
  }

  return this.find(filter)
    .populate('serviceId', 'name basePrice')
    .populate('serviceIds', 'name basePrice')
    .populate('categoryId', 'name')
    .sort({ pointCost: 1 })
}

// Static method to get active rewards
RewardSchema.statics.getActiveRewards = function (filter = {}) {
  return this.find({
    status: 'active',
    isDeleted: false,
    ...filter,
  }).sort({ pointCost: 1 })
}

// Static method to get affordable rewards for user
RewardSchema.statics.getAffordableRewards = function (userPoints, filter = {}) {
  return this.find({
    status: 'active',
    isDeleted: false,
    pointCost: { $lte: userPoints },
    ...filter,
  }).sort({ pointCost: 1 })
}

// ✅ NEW STATIC METHOD: Create service-based reward
RewardSchema.statics.createServiceReward = function (rewardData, serviceData) {
  const enhancedData = {
    ...rewardData,
    // Auto-generate name if not provided
    name: rewardData.name || `${rewardData.value}% off ${serviceData.name}`,
    // Auto-generate description if not provided
    description:
      rewardData.description ||
      `Get ${rewardData.value}% discount on ${serviceData.name}`,
    // Set service reference
    serviceId: serviceData._id,
    categoryId: serviceData.categoryId,
  }

  return this.create(enhancedData)
}

// Pre-save middleware to handle updates
RewardSchema.pre('save', function (next) {
  if (this.isModified() && !this.isNew) {
    this.updatedBy = this._updatedBy || null
  }
  next()
})

// ✅ POST-SAVE: Update service reward counts
RewardSchema.post('save', async function (doc) {
  if (doc.serviceId) {
    try {
      const Service = mongoose.model('Service')
      await Service.findByIdAndUpdate(doc.serviceId, {
        $inc: { rewardCount: 1 },
      })
    } catch (error) {
      console.error('Error updating service reward count:', error)
    }
  }
})

export default mongoose.model('Reward', RewardSchema)
