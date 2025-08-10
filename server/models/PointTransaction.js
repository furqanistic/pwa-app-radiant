// File: server/models/PointTransaction.js
import mongoose from 'mongoose'

const PointTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'referral',
        'reward',
        'redemption',
        'withdrawal',
        'refund',
        'bonus',
        'adjustment',
      ],
      required: true,
    },
    points: {
      type: Number,
      required: true, // Positive for credit, negative for debit
    },
    balance: {
      type: Number, // Balance after transaction
      default: 0,
    },
    description: {
      type: String,
      required: true,
    },
    reference: {
      type: mongoose.Schema.Types.ObjectId,
      refId: true, // Can reference different models
    },
    referenceModel: {
      type: String,
      enum: ['Referral', 'Reward', 'Withdrawal', 'Booking'],
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes for performance
PointTransactionSchema.index({ user: 1, createdAt: -1 })
PointTransactionSchema.index({ type: 1, createdAt: -1 })
PointTransactionSchema.index({ reference: 1 })

// Pre-save middleware to calculate balance
PointTransactionSchema.pre('save', async function (next) {
  if (this.isNew) {
    // Get user's current balance
    const User = mongoose.model('User')
    const user = await User.findById(this.user)
    if (user) {
      this.balance = user.points + this.points
    }
  }
  next()
})

export default mongoose.model('PointTransaction', PointTransactionSchema)
