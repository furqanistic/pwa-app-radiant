// server/models/Category.js
import mongoose from 'mongoose'

const CategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    icon: {
      type: String,
      default: '', // For category icons if needed
    },
    color: {
      type: String,
      default: '#3B82F6', // Default blue color
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    order: {
      type: Number,
      default: 0, // For ordering categories in UI
    },

    // Location association (optional for global categories)
    locationId: {
      type: String,
      required: false,
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
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.__v
        return ret
      },
    },
  }
)

// Index for better performance
CategorySchema.index({ isActive: 1, isDeleted: 1 })
CategorySchema.index({ locationId: 1, isActive: 1 })
CategorySchema.index({ order: 1 })

// Virtual for service count
CategorySchema.virtual('serviceCount', {
  ref: 'Service',
  localField: '_id',
  foreignField: 'categoryId',
  count: true,
  match: { status: 'active', isDeleted: false },
})

// Static method to get active categories with service counts
CategorySchema.statics.getActiveCategories = function (locationId = null) {
  const filter = {
    isActive: true,
    isDeleted: false,
  }

  if (locationId) {
    filter.$or = [
      { locationId: locationId },
      { locationId: { $exists: false } }, // Global categories
      { locationId: null },
    ]
  }

  return this.find(filter).populate('serviceCount').sort({ order: 1, name: 1 })
}

// Pre-save middleware to handle category updates
CategorySchema.pre('save', function (next) {
  if (this.isModified() && !this.isNew) {
    this.updatedBy = this._updatedBy || null
  }
  next()
})

export default mongoose.model('Category', CategorySchema)
