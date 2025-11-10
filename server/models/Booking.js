// File: server/models/Booking.js
import mongoose from 'mongoose'

const BookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    providerName: {
      type: String,
      default: 'Staff Member',
    },
    serviceName: {
      type: String,
      required: true,
    },
    servicePrice: {
      type: Number,
      required: true,
    },
    finalPrice: {
      type: Number,
      required: true,
    },
    discountApplied: {
      type: Number,
      default: 0,
    },
    rewardUsed: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserReward',
      default: null,
    },
    pointsUsed: {
      type: Number,
      default: 0,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    time: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      default: 60,
    },
    status: {
      type: String,
      enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show'],
      default: 'scheduled',
      index: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    review: {
      type: String,
      default: null,
    },
    locationId: {
      type: String,
      required: true,
      index: true,
    },
    notes: {
      type: String,
      default: '',
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelReason: {
      type: String,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    pointsEarned: {
      type: Number,
      default: 0,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    stripeSessionId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        ret.isPast = new Date() > new Date(ret.date)
        ret.isUpcoming = new Date() <= new Date(ret.date)
        ret.canRate = ret.status === 'completed' && !ret.rating
        return ret
      },
    },
  }
)

// Indexes for performance
BookingSchema.index({ userId: 1, date: -1 })
BookingSchema.index({ userId: 1, status: 1 })
BookingSchema.index({ locationId: 1, date: -1 })
BookingSchema.index({ providerId: 1, date: 1 })

// Method to calculate points earned for booking
BookingSchema.methods.calculatePointsEarned = function () {
  if (this.status === 'completed') {
    // 1 point per dollar spent
    return Math.floor(this.finalPrice)
  }
  return 0
}

// Static method to get user's upcoming bookings
BookingSchema.statics.getUserUpcomingBookings = function (userId, limit = 10) {
  return this.find({
    userId,
    date: { $gte: new Date() },
    status: { $in: ['scheduled', 'confirmed'] },
  })
    .sort({ date: 1 })
    .limit(limit)
}

// Static method to get user's past visits
BookingSchema.statics.getUserPastVisits = function (userId, limit = 10) {
  return this.find({
    userId,
    date: { $lt: new Date() },
    status: { $in: ['completed', 'no-show'] },
  })
    .sort({ date: -1 })
    .limit(limit)
}

export default mongoose.model('Booking', BookingSchema)
