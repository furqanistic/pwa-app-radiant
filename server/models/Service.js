// server/models/Service.js - Enhanced with Reward Integration
import mongoose from 'mongoose'

const SubTreatmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    duration: {
      type: Number, // in minutes
      required: true,
      min: 1,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    // ✅ NEW: Track if this sub-treatment has rewards
    hasRewards: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
)

const ServiceSchema = new mongoose.Schema(
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
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    duration: {
      type: Number, // in minutes
      required: true,
      min: 1,
    },
    image: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    discount: {
      percentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      startDate: {
        type: Date,
        default: null,
      },
      endDate: {
        type: Date,
        default: null,
      },
      active: {
        type: Boolean,
        default: false,
      },
    },
    limit: {
      type: Number, // daily booking limit
      required: true,
      min: 1,
      default: 1,
    },
    subTreatments: [SubTreatmentSchema],

    // Analytics fields
    bookings: {
      type: Number,
      default: 0,
      min: 0,
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ✅ NEW REWARD-RELATED FIELDS
    rewardCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalRewardRedemptions: {
      type: Number,
      default: 0,
      min: 0,
    },
    rewardValueSaved: {
      type: Number,
      default: 0,
      min: 0,
    },
    hasActiveRewards: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Track most popular reward type for this service
    popularRewardType: {
      type: String,
      enum: [
        'credit',
        'discount',
        'service',
        'combo',
        'referral',
        'service_discount',
        'free_service',
      ],
      default: null,
    },

    // Location association
    locationId: {
      type: String,
      required: false, // Optional for global services
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
        // Calculate discounted price if discount is active
        if (ret.discount.active && ret.discount.percentage > 0) {
          const now = new Date()
          const startDate = ret.discount.startDate
            ? new Date(ret.discount.startDate)
            : new Date()
          const endDate = ret.discount.endDate
            ? new Date(ret.discount.endDate)
            : new Date()

          if (now >= startDate && now <= endDate) {
            ret.discountedPrice =
              ret.basePrice - (ret.basePrice * ret.discount.percentage) / 100
          }
        }

        // ✅ ADD REWARD-RELATED COMPUTED FIELDS
        ret.hasRewards = ret.rewardCount > 0
        ret.averageRewardSaving =
          ret.totalRewardRedemptions > 0
            ? ret.rewardValueSaved / ret.totalRewardRedemptions
            : 0

        return ret
      },
    },
  }
)

// Compound indexes for better performance
ServiceSchema.index({ status: 1, categoryId: 1 })
ServiceSchema.index({ locationId: 1, status: 1 })
ServiceSchema.index({ hasActiveRewards: 1, status: 1 })
ServiceSchema.index({ name: 'text', description: 'text' })
ServiceSchema.index({ createdAt: -1 })

// Virtual for category details
ServiceSchema.virtual('category', {
  ref: 'Category',
  localField: 'categoryId',
  foreignField: '_id',
  justOne: true,
})

// ✅ NEW VIRTUAL: Get available rewards for this service
ServiceSchema.virtual('availableRewards', {
  ref: 'Reward',
  localField: '_id',
  foreignField: 'serviceId',
  match: { status: 'active', isDeleted: false },
})

// Method to check if discount is currently active
ServiceSchema.methods.isDiscountActive = function () {
  if (!this.discount.active) return false

  const now = new Date()
  const startDate = this.discount.startDate
    ? new Date(this.discount.startDate)
    : new Date()
  const endDate = this.discount.endDate
    ? new Date(this.discount.endDate)
    : new Date()

  return now >= startDate && now <= endDate
}

// Method to calculate final price
ServiceSchema.methods.calculatePrice = function () {
  if (this.isDiscountActive()) {
    return this.basePrice - (this.basePrice * this.discount.percentage) / 100
  }
  return this.basePrice
}

// ✅ NEW METHOD: Get applicable rewards for this service
ServiceSchema.methods.getApplicableRewards = async function (
  userPoints = 0,
  locationId = null
) {
  const Reward = mongoose.model('Reward')
  return await Reward.getRewardsForService(
    this._id,
    this.categoryId,
    userPoints,
    locationId || this.locationId
  )
}

// ✅ NEW METHOD: Calculate price with reward applied
ServiceSchema.methods.calculatePriceWithReward = function (reward) {
  const basePrice = this.calculatePrice() // Get price with any active discounts
  const discountAmount = reward.calculateDiscountForService(basePrice)
  return Math.max(0, basePrice - discountAmount)
}

// ✅ NEW METHOD: Update reward statistics
ServiceSchema.methods.updateRewardStats = async function (
  rewardValue,
  rewardType
) {
  this.totalRewardRedemptions += 1
  this.rewardValueSaved += rewardValue
  this.popularRewardType = rewardType

  // Update hasActiveRewards flag
  const Reward = mongoose.model('Reward')
  const activeRewardsCount = await Reward.countDocuments({
    $or: [
      { serviceId: this._id },
      { serviceIds: this._id },
      { categoryId: this.categoryId, appliesToCategory: true },
    ],
    status: 'active',
    isDeleted: false,
  })

  this.hasActiveRewards = activeRewardsCount > 0
  return this.save()
}

// Static method to get active services
ServiceSchema.statics.getActiveServices = function (filter = {}) {
  return this.find({
    status: 'active',
    isDeleted: false,
    ...filter,
  }).populate('category')
}

// ✅ NEW STATIC METHOD: Get services with active rewards
ServiceSchema.statics.getServicesWithRewards = function (filter = {}) {
  return this.find({
    status: 'active',
    isDeleted: false,
    hasActiveRewards: true,
    ...filter,
  })
    .populate('category')
    .populate({
      path: 'availableRewards',
      match: { status: 'active', isDeleted: false },
    })
}

// ✅ NEW STATIC METHOD: Get services by category with reward info
ServiceSchema.statics.getServicesByCategory = function (
  categoryId,
  includeRewards = false
) {
  const query = this.find({
    categoryId,
    status: 'active',
    isDeleted: false,
  }).populate('category')

  if (includeRewards) {
    query.populate({
      path: 'availableRewards',
      match: { status: 'active', isDeleted: false },
    })
  }

  return query
}

// ✅ NEW STATIC METHOD: Get reward statistics for services
ServiceSchema.statics.getRewardStats = function (locationId = null) {
  const matchFilter = {
    isDeleted: false,
  }

  if (locationId) {
    matchFilter.$or = [
      { locationId: locationId },
      { locationId: { $exists: false } },
      { locationId: null },
    ]
  }

  return this.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: null,
        totalServices: { $sum: 1 },
        servicesWithRewards: { $sum: { $cond: ['$hasActiveRewards', 1, 0] } },
        totalRewardRedemptions: { $sum: '$totalRewardRedemptions' },
        totalRewardValueSaved: { $sum: '$rewardValueSaved' },
        averageRewardSaving: { $avg: '$rewardValueSaved' },
      },
    },
  ])
}

export default mongoose.model('Service', ServiceSchema)
