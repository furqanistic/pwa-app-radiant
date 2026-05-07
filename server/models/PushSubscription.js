// File: server/models/PushSubscription.js
import mongoose from 'mongoose'

const PushSubscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    endpoint: {
      type: String,
      required: true,
    },
    p256dh: {
      type: String,
      required: true,
    },
    auth: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: false,
    },
    deviceInfo: {
      platform: String,
      browser: String,
      version: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastUsed: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
)

// Compound index to ensure one subscription per user per device
PushSubscriptionSchema.index({ user: 1, endpoint: 1 }, { unique: true })
PushSubscriptionSchema.index({ user: 1, isActive: 1 })
PushSubscriptionSchema.index({ endpoint: 1 })

export default mongoose.model('PushSubscription', PushSubscriptionSchema)
