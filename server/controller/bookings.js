// File: server/controller/bookings.js
import { createError } from '../error.js'
import Booking from '../models/Booking.js'
import Service from '../models/Service.js'
import User from '../models/User.js'
import UserReward from '../models/UserReward.js'

// Get user's upcoming appointments
export const getUserUpcomingAppointments = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { limit = 10 } = req.query

    const appointments = await Booking.find({
      userId,
      date: { $gte: new Date() },
      status: { $in: ['scheduled', 'confirmed'] },
    })
      .populate('serviceId', 'name basePrice duration categoryId')
      .populate('providerId', 'name')
      .sort({ date: 1, time: 1 })
      .limit(parseInt(limit))

    res.status(200).json({
      status: 'success',
      data: {
        appointments,
        total: appointments.length,
      },
    })
  } catch (error) {
    console.error('Error fetching upcoming appointments:', error)
    next(createError(500, 'Failed to fetch upcoming appointments'))
  }
}

// Get user's past visits
export const getUserPastVisits = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { limit = 20, page = 1 } = req.query

    const skip = (parseInt(page) - 1) * parseInt(limit)

    const [visits, totalVisits] = await Promise.all([
      Booking.find({
        userId,
        date: { $lt: new Date() },
        status: { $in: ['completed', 'no-show'] },
      })
        .populate('serviceId', 'name basePrice categoryId')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Booking.countDocuments({
        userId,
        date: { $lt: new Date() },
        status: { $in: ['completed', 'no-show'] },
      }),
    ])

    res.status(200).json({
      status: 'success',
      data: {
        visits,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalVisits / parseInt(limit)),
          totalVisits,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching past visits:', error)
    next(createError(500, 'Failed to fetch past visits'))
  }
}

// Get user's booking statistics
export const getUserBookingStats = async (req, res, next) => {
  try {
    const userId = req.user.id

    const [upcomingCount, pastCount, totalSpent, averageRating] =
      await Promise.all([
        Booking.countDocuments({
          userId,
          date: { $gte: new Date() },
          status: { $in: ['scheduled', 'confirmed'] },
        }),
        Booking.countDocuments({
          userId,
          date: { $lt: new Date() },
          status: 'completed',
        }),
        Booking.aggregate([
          {
            $match: {
              userId: new mongoose.Types.ObjectId(userId),
              status: 'completed',
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$finalPrice' },
              count: { $sum: 1 },
            },
          },
        ]),
        Booking.aggregate([
          {
            $match: {
              userId: new mongoose.Types.ObjectId(userId),
              rating: { $exists: true, $ne: null },
            },
          },
          {
            $group: {
              _id: null,
              average: { $avg: '$rating' },
              count: { $sum: 1 },
            },
          },
        ]),
      ])

    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          upcomingAppointments: upcomingCount,
          totalVisits: pastCount,
          totalSpent: totalSpent[0]?.total || 0,
          averageRating: averageRating[0]?.average || 0,
          totalRatings: averageRating[0]?.count || 0,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching booking stats:', error)
    next(createError(500, 'Failed to fetch booking statistics'))
  }
}

// Create a new booking
export const createBooking = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { serviceId, date, time, providerId, providerName, notes, rewardId } =
      req.body

    // Validate service exists
    const service = await Service.findById(serviceId)
    if (!service || service.isDeleted) {
      return next(createError(404, 'Service not found'))
    }

    // Calculate pricing
    let finalPrice = service.calculatePrice()
    let discountApplied = 0
    let rewardUsed = null

    // Apply reward if provided
    if (rewardId) {
      const userReward = await UserReward.findOne({
        _id: rewardId,
        userId,
        status: 'active',
        expiresAt: { $gt: new Date() },
      })

      if (userReward) {
        // Calculate discount based on reward type
        const discountAmount =
          userReward.rewardSnapshot.type === 'discount'
            ? (finalPrice * userReward.rewardSnapshot.value) / 100
            : userReward.rewardSnapshot.value

        discountApplied = Math.min(discountAmount, finalPrice)
        finalPrice -= discountApplied
        rewardUsed = rewardId

        // Mark reward as used
        await userReward.markAsUsed(discountApplied)
      }
    }

    const booking = await Booking.create({
      userId,
      serviceId,
      serviceName: service.name,
      servicePrice: service.basePrice,
      finalPrice,
      discountApplied,
      rewardUsed,
      date: new Date(date),
      time,
      duration: service.duration,
      providerId,
      providerName: providerName || 'Staff Member',
      locationId: req.user.selectedLocation?.locationId || service.locationId,
      notes,
      status: 'scheduled',
    })

    res.status(201).json({
      status: 'success',
      message: 'Booking created successfully',
      data: { booking },
    })
  } catch (error) {
    console.error('Error creating booking:', error)
    next(createError(500, 'Failed to create booking'))
  }
}

// Rate a past visit
export const rateVisit = async (req, res, next) => {
  try {
    const { bookingId } = req.params
    const { rating, review } = req.body

    if (!rating || rating < 1 || rating > 5) {
      return next(createError(400, 'Valid rating (1-5) is required'))
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      userId: req.user.id,
      status: 'completed',
    })

    if (!booking) {
      return next(createError(404, 'Booking not found or not completed'))
    }

    if (booking.rating) {
      return next(createError(400, 'This visit has already been rated'))
    }

    booking.rating = rating
    booking.review = review
    await booking.save()

    // Award points for leaving a review
    const reviewPoints = 10
    await awardPoints(
      req.user.id,
      reviewPoints,
      'Review reward',
      'review',
      booking._id,
      booking.locationId
    )

    res.status(200).json({
      status: 'success',
      message: 'Thank you for your review!',
      data: {
        booking,
        pointsEarned: reviewPoints,
      },
    })
  } catch (error) {
    console.error('Error rating visit:', error)
    next(createError(500, 'Failed to submit rating'))
  }
}

// ===========================
