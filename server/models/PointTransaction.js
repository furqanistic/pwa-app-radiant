// File: server/models/PointTransaction.js - FIXED VERSION
import mongoose from 'mongoose'

const PointTransactionSchema = new mongoose.Schema(
  {
    user: {
      // CHANGED: Make sure this field is 'user' not 'userId'
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "referral",
        "reward", // For reward claims
        "redemption",
        "withdrawal",
        "refund",
        "bonus",
        "adjustment",
        "spent", // For spending points on rewards/games
        "earned", // For earning points from activities
        "game_play", // For game-related transactions
        "qr_scan", // For user scanning QR code
        "qr_scan_reward", // For spa owner reward
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
      refPath: "referenceModel",
    },
    referenceModel: {
      type: String,
      enum: [
        "Referral",
        "Reward",
        "Withdrawal",
        "Booking",
        "GameWheel",
        "UserReward",
      ],
    },
    // Game-specific metadata
    gameMetadata: {
      gameId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "GameWheel",
      },
      gameType: {
        type: String,
        enum: ["spin", "scratch"],
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
    // Admin who processed this transaction (for adjustments)
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
PointTransactionSchema.index({ user: 1, createdAt: -1 })
PointTransactionSchema.index({ type: 1, createdAt: -1 })
PointTransactionSchema.index({ reference: 1 })
PointTransactionSchema.index({ 'gameMetadata.gameId': 1 })
PointTransactionSchema.index({ locationId: 1 })

// REMOVED: Pre-save middleware that was causing issues
// The balance will be calculated by the helper functions

export default mongoose.model('PointTransaction', PointTransactionSchema)
