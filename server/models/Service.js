// File: server/models/Service.js
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
    hasRewards: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
)

// ✅ NEW: Schema for linked services (add-ons)
const LinkedServiceSchema = new mongoose.Schema(
  {
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    // Optional: Custom pricing for this service when used as add-on
    customPrice: {
      type: Number,
      min: 0,
      default: null, // If null, use original service price
    },
    // Optional: Custom duration when used as add-on
    customDuration: {
      type: Number,
      min: 1,
      default: null, // If null, use original service duration
    },
    // Display order for add-ons
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
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

    // ✅ NEW: Linked services as add-ons
    linkedServices: [LinkedServiceSchema],

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

    // Reward-related fields
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
      required: false,
      index: true,
    },

    // Stripe integration (optional)
    stripe: {
      productId: {
        type: String,
        default: null,
        sparse: true,
      },
      priceId: {
        type: String,
        default: null,
        sparse: true,
      },
      syncedAt: {
        type: Date,
        default: null,
      },
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

// ✅ NEW VIRTUAL: Get populated linked services
ServiceSchema.virtual('populatedLinkedServices', {
  ref: 'Service',
  localField: 'linkedServices.serviceId',
  foreignField: '_id',
})

// ✅ NEW METHOD: Add linked service
ServiceSchema.methods.addLinkedService = function (serviceId, options = {}) {
  // Check if service is already linked
  const existingLink = this.linkedServices.find(
    (link) => link.serviceId.toString() === serviceId.toString()
  )

  if (existingLink) {
    throw new Error('Service is already linked as an add-on')
  }

  this.linkedServices.push({
    serviceId,
    customPrice: options.customPrice || null,
    customDuration: options.customDuration || null,
    order: options.order || this.linkedServices.length,
    isActive: options.isActive !== undefined ? options.isActive : true,
  })

  return this.save()
}

// ✅ NEW METHOD: Remove linked service
ServiceSchema.methods.removeLinkedService = function (serviceId) {
  this.linkedServices = this.linkedServices.filter(
    (link) => link.serviceId.toString() !== serviceId.toString()
  )
  return this.save()
}

// ✅ NEW METHOD: Update linked service
ServiceSchema.methods.updateLinkedService = function (serviceId, updates) {
  const linkedService = this.linkedServices.find(
    (link) => link.serviceId.toString() === serviceId.toString()
  )

  if (!linkedService) {
    throw new Error('Linked service not found')
  }

  Object.assign(linkedService, updates)
  return this.save()
}

// ✅ NEW METHOD: Get active linked services with details
ServiceSchema.methods.getActiveLinkedServices = async function () {
  const activeLinkedServices = this.linkedServices.filter(
    (link) => link.isActive
  )

  if (activeLinkedServices.length === 0) {
    return []
  }

  const serviceIds = activeLinkedServices.map((link) => link.serviceId)
  const services = await mongoose
    .model('Service')
    .find({
      _id: { $in: serviceIds },
      status: 'active',
      isDeleted: false,
    })
    .populate('categoryId', 'name color')

  // Combine service details with link information
  return activeLinkedServices
    .map((link) => {
      const service = services.find(
        (s) => s._id.toString() === link.serviceId.toString()
      )
      if (!service) return null

      return {
        ...service.toObject(),
        linkedServiceInfo: {
          customPrice: link.customPrice,
          customDuration: link.customDuration,
          order: link.order,
          addedAt: link.addedAt,
        },
        // Calculate final price (custom or original)
        finalPrice: link.customPrice || service.basePrice,
        finalDuration: link.customDuration || service.duration,
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.linkedServiceInfo.order - b.linkedServiceInfo.order)
}

// ✅ NEW STATIC METHOD: Get services that can be used as add-ons
ServiceSchema.statics.getAvailableAddOns = function (
  excludeServiceId,
  locationId = null
) {
  const filter = {
    status: 'active',
    isDeleted: false,
    _id: { $ne: excludeServiceId }, // Exclude the current service
  }

  if (locationId) {
    filter.$or = [
      { locationId: locationId },
      { locationId: { $exists: false } },
      { locationId: null },
    ]
  }

  return this.find(filter)
    .select('name description basePrice duration image categoryId')
    .populate('categoryId', 'name color')
    .sort({ name: 1 })
}

// ✅ NEW STATIC METHOD: Get services with their linked services
ServiceSchema.statics.getServicesWithLinkedServices = function (filter = {}) {
  return this.find({
    status: 'active',
    isDeleted: false,
    ...filter,
  })
    .populate('categoryId', 'name color')
    .populate({
      path: 'linkedServices.serviceId',
      select: 'name description basePrice duration image categoryId',
      populate: {
        path: 'categoryId',
        select: 'name color',
      },
    })
}

export default mongoose.model('Service', ServiceSchema)
