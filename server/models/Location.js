// File: server/models/Location.js
// server/models/Location.js
import mongoose from 'mongoose'

const LocationSchema = new mongoose.Schema(
  {
    locationId: {
      type: String,
      required: [true, 'Location ID is required'],
      unique: true, // This already creates an index
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
    address: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
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

// Only keep the isActive index since locationId already has a unique index
LocationSchema.index({ isActive: 1 })

// Optional: Compound index for better query performance
LocationSchema.index({ isActive: 1, locationId: 1 })

export default mongoose.model('Location', LocationSchema)
