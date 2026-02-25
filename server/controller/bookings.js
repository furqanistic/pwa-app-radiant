// File: server/controller/bookings.js
import mongoose from 'mongoose'
import { createError } from '../error.js'
import Booking from '../models/Booking.js'
import Service from '../models/Service.js'
import User from '../models/User.js'
import UserReward from '../models/UserReward.js'
import { getPointsMethodForLocation } from '../utils/pointsSettings.js'
import { awardPoints } from '../utils/rewardHelpers.js'

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
        // NEW: Calculate total lifetime points earned
        Booking.aggregate([
          {
            $match: {
              userId: new mongoose.Types.ObjectId(userId),
              status: 'completed', // Only completed bookings count
              pointsEarned: { $exists: true, $gt: 0 } // Ensure field exists
            }
          },
          {
            $group: {
              _id: null,
              totalPoints: { $sum: '$pointsEarned' }
            }
          }
        ])
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
          totalPointsEarned: arguments[0][4]?.[0]?.totalPoints || 0 // Access the 5th result from Promise.all
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

    // Award points for leaving a review only when the method is active
    const reviewMethod = await getPointsMethodForLocation(
      booking.locationId,
      'review'
    )
    const reviewPoints =
      reviewMethod?.isActive && (reviewMethod?.pointsValue || 0) > 0
        ? reviewMethod.pointsValue
        : 0

    if (reviewPoints > 0) {
      await awardPoints(
        req.user.id,
        reviewPoints,
        'Review reward',
        'review',
        booking._id,
        booking.locationId
      )
    }

    res.status(200).json({
      status: 'success',
      message:
        reviewPoints > 0
          ? 'Thank you for your review!'
          : 'Review submitted successfully',
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

export const getBookedTimes = async (req, res, next) => {
  try {
    const { serviceId, date } = req.query;

    // Date validation
    if (!serviceId || !date) {
      return next(createError(400, "serviceId and date are required"));
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    console.log("🔍 DEBUG - Fetching booked times:", {
      serviceId,
      date,
      startOfDay,
      endOfDay,
    });

    const bookings = await Booking.find({
      serviceId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ["cancelled"] },
    }).select("time");

    console.log("📝 Found bookings:", bookings);

    const bookedTimes = bookings.map((b) => b.time);

    console.log("⏰ Booked times:", bookedTimes);

    // ✅ CORRECTED RESPONSE FORMAT
    res.status(200).json({
      success: true,
      data: {
        bookedTimes, // ← Nested inside data
      },
    });
  } catch (error) {
    console.error("❌ Error:", error);
    next(createError(500, "Failed to fetch booked times"));
  }
};

// Get all bookings for admin/spa
export const getAdminBookings = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status,
      locationId,
      sortBy = 'date',
      sortOrder = 'desc',
    } = req.query
    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const limitNum = Math.min(200, Math.max(10, parseInt(limit, 10) || 10))
    const skip = (pageNum - 1) * limitNum

    // Build query
    const query = {}

    // Role-based filtering
    if (req.user.role === 'spa' || req.user.role === 'admin') {
      // SPA/Admin can only see bookings for their location
      // Check both spaLocation (for spa owners) and selectedLocation (fallback/admin)
      const locationId = req.user.spaLocation?.locationId || req.user.selectedLocation?.locationId
      if (!locationId) {
        return next(createError(403, 'Location ID not found for administrator'))
      }
      query.locationId = locationId
    } else if (req.user.role !== 'super-admin') {
      return next(createError(403, 'Unauthorized access to admin bookings'))
    }

    // Status filter
    if (status) {
      query.status = status
    }

    // Location filter (super-admin only)
    if (req.user.role === 'super-admin' && locationId) {
      query.locationId = locationId
    }

    // Search filter (by client name, email, or service name)
    if (search) {
      query.$or = [
        { clientName: { $regex: search, $options: 'i' } },
        { clientEmail: { $regex: search, $options: 'i' } },
        { serviceName: { $regex: search, $options: 'i' } }
      ]
    }

    const allowedSortFields = new Set(['date', 'time', 'createdAt', 'finalPrice', 'status'])
    const safeSortBy = allowedSortFields.has(sortBy) ? sortBy : 'date'
    const safeSortOrder = sortOrder === 'asc' ? 1 : -1

    const [bookings, totalBookings] = await Promise.all([
      Booking.find(query)
        .sort({ [safeSortBy]: safeSortOrder, time: -1, _id: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('userId', 'name email'),
      Booking.countDocuments(query)
    ])

    // Format bookings for the frontend (Map userId name/email to clientName/Email if missing)
    const formattedBookings = bookings.map(booking => {
      const b = booking.toObject()
      return {
        ...b,
        clientName: b.clientName || b.userId?.name || 'Unknown',
        clientEmail: b.clientEmail || b.userId?.email || 'N/A'
      }
    })

    res.status(200).json({
      status: 'success',
      data: {
        bookings: formattedBookings,
        pagination: {
          totalBookings,
          currentPage: pageNum,
          totalPages: Math.ceil(totalBookings / limitNum),
          pageSize: limitNum
        }
      }
    })
  } catch (error) {
    console.error('Error fetching admin bookings:', error)
    next(createError(500, 'Failed to fetch admin bookings'))
  }
}
