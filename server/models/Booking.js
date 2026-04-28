// File: server/models/Booking.js
import mongoose from 'mongoose'

const buildBookingStartDateTime = (dateValue, timeValue) => {
  const baseDate = new Date(dateValue)
  if (Number.isNaN(baseDate.getTime())) return null

  const rawTime = `${timeValue || ''}`.trim()
  if (!rawTime) return baseDate

  let hours = null
  let minutes = 0

  const ampmMatch = rawTime.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i)
  if (ampmMatch) {
    hours = Number(ampmMatch[1])
    minutes = Number(ampmMatch[2] || '0')
    const meridiem = ampmMatch[3].toUpperCase()
    if (meridiem === 'PM' && hours < 12) hours += 12
    if (meridiem === 'AM' && hours === 12) hours = 0
  } else {
    const twentyFourHourMatch = rawTime.match(/^(\d{1,2})(?::(\d{2}))?$/)
    if (twentyFourHourMatch) {
      hours = Number(twentyFourHourMatch[1])
      minutes = Number(twentyFourHourMatch[2] || '0')
    }
  }

  if (!Number.isFinite(hours) || hours < 0 || hours > 23) {
    return baseDate
  }

  if (!Number.isFinite(minutes) || minutes < 0 || minutes > 59) {
    minutes = 0
  }

  const startDate = new Date(baseDate)
  startDate.setHours(hours, minutes, 0, 0)
  return startDate
}

const getReviewEligibilityDate = (dateValue, timeValue) => {
  const start = buildBookingStartDateTime(dateValue, timeValue)
  if (!start) return null
  return new Date(start.getTime() + 2 * 60 * 60 * 1000)
}

const canRateBooking = (bookingLike = {}) => {
  if (bookingLike.rating) return false
  const normalizedStatus = `${bookingLike.status || ''}`.toLowerCase()
  if (normalizedStatus === 'cancelled' || normalizedStatus === 'no-show') return false
  if (`${bookingLike.paymentStatus || ''}`.toLowerCase() !== 'paid') return false
  const eligibleAt = getReviewEligibilityDate(bookingLike.date, bookingLike.time)
  if (!eligibleAt) return false
  return Date.now() >= eligibleAt.getTime()
}

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
    ratedAt: {
      type: Date,
      default: null,
    },
    reviewReminderSentAt: {
      type: Date,
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
    paymentProvider: {
      type: String,
      enum: ['stripe', 'square', 'manual'],
      default: 'stripe',
      index: true,
    },
    stripeSessionId: {
      type: String,
      default: null,
    },
    squarePaymentLinkId: {
      type: String,
      default: null,
      index: true,
    },
    squareOrderId: {
      type: String,
      default: null,
      index: true,
    },
    ghl: {
      calendarId: {
        type: String,
        default: '',
        trim: true,
      },
      calendarName: {
        type: String,
        default: '',
        trim: true,
      },
      timeZone: {
        type: String,
        default: '',
        trim: true,
      },
      userId: {
        type: String,
        default: '',
        trim: true,
      },
      teamId: {
        type: String,
        default: '',
        trim: true,
      },
      appointmentId: {
        type: String,
        default: '',
        trim: true,
      },
      appointmentStatus: {
        type: String,
        default: '',
        trim: true,
      },
      syncedAt: {
        type: Date,
        default: null,
      },
      syncError: {
        type: String,
        default: '',
        trim: true,
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        ret.isPast = new Date() > new Date(ret.date)
        ret.isUpcoming = new Date() <= new Date(ret.date)
        ret.reviewEligibleAt = getReviewEligibilityDate(ret.date, ret.time)
        ret.canRate = canRateBooking(ret)
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

BookingSchema.statics.getReviewEligibilityDate = getReviewEligibilityDate
BookingSchema.statics.canRateBooking = canRateBooking

export default mongoose.model('Booking', BookingSchema)
