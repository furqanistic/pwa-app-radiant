// server/models/Notification.js
import mongoose from 'mongoose'

const NotificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // For system notifications
    },
    type: {
      type: String,
      enum: ['individual', 'broadcast', 'admin', 'enterprise', 'system'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },

    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    category: {
      type: String,
      enum: ['general', 'points', 'system', 'promotion', 'alert'],
      default: 'general',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed, // For additional data like points adjustment info
      default: {},
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
    read: {
      type: Boolean,
      default: false,
    },
    seenAt: {
      type: Date,
      default: null,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    // Auto-delete expired notifications
    expireAfterSeconds: 0,
    expireAfterSeconds: 'expiresAt',
  }
)

// Index for better query performance
NotificationSchema.index({ recipient: 1, read: 1, createdAt: -1 })
NotificationSchema.index({ recipient: 1, createdAt: -1 })
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.model('Notification', NotificationSchema)
