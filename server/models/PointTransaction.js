// File: server/models/PointTransaction.js - FIXED ENUM VALUES
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
        'spent', // ADDED: For spending points on games
        'earned', // ADDED: For earning points from games
        'game_play', // ADDED: For game-related transactions
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
      refPath: 'referenceModel', // FIXED: Use refPath for dynamic references
    },
    referenceModel: {
      type: String,
      enum: [
        'Referral',
        'Reward',
        'Withdrawal',
        'Booking',
        'GameWheel',
        'UserReward',
      ],
    },
    // NEW: Game-specific metadata
    gameMetadata: {
      gameId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GameWheel',
      },
      gameType: {
        type: String,
        enum: ['spin', 'scratch'],
      },
      gameTitle: String,
      winningItem: {
        title: String,
        value: String,
        valueType: String,
      },
    },
    // Location tracking
    locationId: {
      type: String,
      index: true,
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
PointTransactionSchema.index({ 'gameMetadata.gameId': 1 })
PointTransactionSchema.index({ locationId: 1 })

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
