import mongoose from 'mongoose'

const LocationSchema = new mongoose.Schema(
  {
    locationId: {
      type: String,
      required: [true, 'Location ID is required'],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

// Index for faster queries
LocationSchema.index({ locationId: 1 })
LocationSchema.index({ isActive: 1 })

export default mongoose.model('Location', LocationSchema)
