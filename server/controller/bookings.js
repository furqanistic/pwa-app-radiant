// File: server/controller/bookings.js
import mongoose from 'mongoose'
import { createError } from '../error.js'
import Booking from '../models/Booking.js'
import Service from '../models/Service.js'
import User from '../models/User.js'
import UserReward from '../models/UserReward.js'
import { getPointsMethodForLocation } from '../utils/pointsSettings.js'
import { awardPoints } from '../utils/rewardHelpers.js'
import {
  assertSlotAvailable,
  getServiceCalendarSelection,
} from '../utils/bookingScheduling.js'
import { cancelGhlAppointmentForBooking } from './ghl.js'
import { getCycleWeeksForService, calculateNextRecommendedDate, getCycleUrgency, formatDaysUntilDue } from '../utils/treatmentCycles.js'

const getRequestedLocationId = (req) => `${req.query?.locationId || req.body?.locationId || ''}`.trim()

const withLocationScope = (query, locationId) => {
  if (!locationId) return query
  return {
    ...query,
    locationId,
  }
}

const refreshServiceRatingStats = async (serviceId) => {
  if (!serviceId) return

  const [aggregate] = await Booking.aggregate([
    {
      $match: {
        serviceId: new mongoose.Types.ObjectId(serviceId),
        rating: { $exists: true, $ne: null },
      },
    },
    {
      $group: {
        _id: '$serviceId',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
      },
    },
  ])

  await Service.findByIdAndUpdate(serviceId, {
    rating: aggregate?.averageRating || 0,
    totalReviews: aggregate?.totalReviews || 0,
  })
}

// Get user's upcoming appointments
export const getUserUpcomingAppointments = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { limit = 10 } = req.query
    const locationId = getRequestedLocationId(req)

    const appointments = await Booking.find(withLocationScope({
      userId,
      date: { $gte: new Date() },
      status: { $in: ['scheduled', 'confirmed'] },
      paymentStatus: 'paid',
    }, locationId))
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
    const locationId = getRequestedLocationId(req)

    const skip = (parseInt(page) - 1) * parseInt(limit)

    const [visits, totalVisits] = await Promise.all([
      Booking.find(withLocationScope({
        userId,
        date: { $lt: new Date() },
        paymentStatus: 'paid',
        status: { $nin: ['cancelled'] },
      }, locationId))
        .populate('serviceId', 'name basePrice categoryId')
        .sort({ date: -1, time: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Booking.countDocuments(withLocationScope({
        userId,
        date: { $lt: new Date() },
        paymentStatus: 'paid',
        status: { $nin: ['cancelled'] },
      }, locationId)),
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
    const locationId = getRequestedLocationId(req)

    const [upcomingCount, pastCount, totalSpent, averageRating, lifetimePoints] =
      await Promise.all([
        Booking.countDocuments(withLocationScope({
          userId,
          date: { $gte: new Date() },
          status: { $in: ['scheduled', 'confirmed'] },
          paymentStatus: 'paid',
        }, locationId)),
        Booking.countDocuments(withLocationScope({
          userId,
          date: { $lt: new Date() },
          status: 'completed',
        }, locationId)),
        Booking.aggregate([
          {
            $match: withLocationScope({
              userId: new mongoose.Types.ObjectId(userId),
              status: 'completed',
            }, locationId),
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
            $match: withLocationScope({
              userId: new mongoose.Types.ObjectId(userId),
              rating: { $exists: true, $ne: null },
            }, locationId),
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
            $match: withLocationScope({
              userId: new mongoose.Types.ObjectId(userId),
              status: 'completed', // Only completed bookings count
              pointsEarned: { $exists: true, $gt: 0 } // Ensure field exists
            }, locationId)
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
          totalPointsEarned: lifetimePoints?.[0]?.totalPoints || 0,
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

    const effectiveLocationId =
      req.body.locationId ||
      req.user.selectedLocation?.locationId ||
      service.locationId

    if (!effectiveLocationId) {
      return next(createError(400, 'Location is required for this booking'))
    }

    const effectiveDuration = Number.parseInt(req.body.duration, 10) || service.duration

    const schedulingContext = await assertSlotAvailable({
      locationId: effectiveLocationId,
      date,
      time,
      duration: effectiveDuration,
      service,
    })

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

    const ghlCalendar = {
      ...getServiceCalendarSelection(service),
      ...(schedulingContext?.calendarSelection || {}),
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
      duration: effectiveDuration,
      providerId,
      providerName: providerName || 'Staff Member',
      locationId: effectiveLocationId,
      notes,
      status: 'scheduled',
      ghl: {
        calendarId: ghlCalendar.calendarId,
        calendarName: ghlCalendar.name,
        timeZone: ghlCalendar.timeZone,
        userId: ghlCalendar.userId,
        teamId: ghlCalendar.teamId,
      },
    })

    console.log('[Booking API] Booking created (pre-payment)', {
      bookingId: `${booking?._id || ''}`,
      userId: `${userId || ''}`,
      serviceId: `${serviceId || ''}`,
      locationId: effectiveLocationId,
      date,
      time,
      paymentStatus: booking?.paymentStatus || '',
      ghlCalendarId: booking?.ghl?.calendarId || '',
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

export const rescheduleBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params
    const { date, time } = req.body

    if (!date || !time) {
      return next(createError(400, 'New date and time are required'))
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      userId: req.user.id,
      status: { $in: ['scheduled', 'confirmed'] },
    })

    if (!booking) {
      return next(createError(404, 'Booking not found or cannot be rescheduled'))
    }

    const now = new Date()
    const existingBookingDate = new Date(booking.date)
    if ((existingBookingDate - now) / (1000 * 60 * 60) <= 24) {
      return next(createError(400, 'Bookings can only be rescheduled more than 24 hours in advance'))
    }

    const service = await Service.findById(booking.serviceId)
    if (!service || service.isDeleted) {
      return next(createError(404, 'Service not found for this booking'))
    }

    const normalizedDuration = Number.parseInt(booking.duration, 10) || service.duration
    await assertSlotAvailable({
      locationId: booking.locationId,
      date,
      time,
      duration: normalizedDuration,
      service,
    })

    booking.date = new Date(date)
    booking.time = time
    booking.duration = normalizedDuration
    await booking.save()

    res.status(200).json({
      status: 'success',
      message: 'Booking rescheduled successfully',
      data: { booking },
    })
  } catch (error) {
    console.error('Error rescheduling booking:', error)
    next(createError(500, 'Failed to reschedule booking'))
  }
}

export const cancelBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params
    const { reason = '' } = req.body || {}

    const booking = await Booking.findOne({
      _id: bookingId,
      userId: req.user.id,
      status: { $nin: ['cancelled', 'completed', 'no-show'] },
    })

    if (!booking) {
      return next(createError(404, 'Booking not found or cannot be cancelled'))
    }

    const now = new Date()
    const bookingDate = new Date(booking.date)
    if ((bookingDate - now) / (1000 * 60 * 60) <= 24) {
      return next(createError(400, 'Bookings can only be cancelled more than 24 hours in advance'))
    }

    const cancelReason = `${reason || ''}`.trim()

    // Keep source-of-truth in sync: paid bookings with linked GHL appointment
    // must be cancelled in GHL before local status is updated.
    if (`${booking.paymentStatus || ''}`.toLowerCase() === 'paid') {
      const appointmentId = `${booking?.ghl?.appointmentId || ''}`.trim()
      if (!appointmentId) {
        return next(
          createError(
            409,
            'This booking is paid but has no linked GoHighLevel appointment to cancel.'
          )
        )
      }

      try {
        const cancelResult = await cancelGhlAppointmentForBooking({
          booking,
          reason: cancelReason,
        })

        if (cancelResult?.skipped) {
          return next(
            createError(
              409,
              cancelResult.reason || 'Unable to cancel booking in GoHighLevel.'
            )
          )
        }

        if (!booking.ghl || typeof booking.ghl !== 'object') booking.ghl = {}
        booking.ghl.appointmentStatus = 'cancelled'
        booking.ghl.syncError = ''
        booking.ghl.syncedAt = new Date()
      } catch (ghlCancelError) {
        const rawMessage =
          ghlCancelError?.response?.data?.message ||
          ghlCancelError?.response?.data?.msg ||
          ghlCancelError?.message ||
          'Failed to cancel booking in GoHighLevel.'
        const normalizedMessage = Array.isArray(rawMessage)
          ? rawMessage.join(' ')
          : `${rawMessage || ''}`
        return next(
          createError(
            502,
            `Failed to cancel appointment in GoHighLevel: ${normalizedMessage}`
          )
        )
      }
    }

    booking.status = 'cancelled'
    booking.cancelledAt = new Date()
    booking.cancelReason = cancelReason || null
    await booking.save()

    res.status(200).json({
      status: 'success',
      message: 'Booking cancelled successfully',
      data: { booking },
    })
  } catch (error) {
    console.error('Error cancelling booking:', error)
    next(createError(500, 'Failed to cancel booking'))
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
      paymentStatus: 'paid',
      status: { $nin: ['cancelled', 'no-show'] },
    })

    if (!booking) {
      return next(createError(404, 'Booking not found or not eligible for review'))
    }

    if (booking.rating) {
      return next(createError(400, 'This visit has already been rated'))
    }

    const canRate = Booking.canRateBooking({
      date: booking.date,
      time: booking.time,
      rating: booking.rating,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
    })

    if (!canRate) {
      return next(
        createError(
          400,
          'You can submit a review around 2 hours after your appointment time.'
        )
      )
    }

    booking.rating = Number(rating)
    booking.review = `${review || ''}`.trim() || null
    booking.ratedAt = new Date()
    await booking.save()
    await refreshServiceRatingStats(booking.serviceId)

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

    const bookings = await Booking.find({
      serviceId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ["cancelled"] },
    }).select("time");

    const bookedTimes = bookings.map((b) => b.time);

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
    // Management views should only show fully paid bookings.
    query.paymentStatus = 'paid'
    const testEmailRegex = /@test\.com$/i

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
    if (status && status !== 'undefined' && status !== 'null') {
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

    // Exclude test accounts from management view.
    // Covers both denormalized booking email and referenced user email.
    const testUsers = await User.find({ email: testEmailRegex }).select('_id').lean()
    const testUserIds = testUsers.map((u) => u._id)
    query.$and = [
      ...(Array.isArray(query.$and) ? query.$and : []),
      { clientEmail: { $not: testEmailRegex } },
      { userId: { $nin: testUserIds } },
    ]

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
  /**
 * GET /bookings/my-cycles
 * Returns upcoming treatment cycle reminders for the logged-in user.
 * Shows services where a refresh is due within 30 days or overdue,
 * and the user has no upcoming booking for that service.
 */
export const getTreatmentCycles = async (req, res, next) => {
  try {
    const userId = req.user.id
    const now = new Date()

    // Look back up to 12 months for past paid bookings
    const twelveMonthsAgo = new Date(now)
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

    // Fetch past paid bookings, most recent first, with service populated
    const pastBookings = await Booking.find({
      userId,
      date: { $gte: twelveMonthsAgo, $lt: now },
      paymentStatus: 'paid',
      status: { $nin: ['cancelled'] },
    })
      .populate('serviceId', 'name recommendedCycleWeeks')
      .sort({ date: -1 })
      .lean()

    // Keep only the most recent booking per service
    const latestByService = new Map()
    for (const booking of pastBookings) {
      const sid = booking.serviceId?._id?.toString()
      if (sid && !latestByService.has(sid)) {
        latestByService.set(sid, booking)
      }
    }

    // Fetch upcoming paid bookings to know which services are already rebooked
    const upcomingBookings = await Booking.find({
      userId,
      date: { $gte: now },
      paymentStatus: 'paid',
      status: { $in: ['scheduled', 'confirmed'] },
    })
      .select('serviceId')
      .lean()

    const upcomingServiceIds = new Set(
      upcomingBookings.map((b) => b.serviceId?.toString()).filter(Boolean)
    )

    // Build cycles array — only include cycles due within 30 days or overdue
    const SHOW_WITHIN_DAYS = 30
    const cycles = []

    for (const [sid, booking] of latestByService) {
      // Skip if user already has an upcoming booking for this service
      if (upcomingServiceIds.has(sid)) continue

      const service = booking.serviceId
      if (!service) continue

      const cycleWeeks = getCycleWeeksForService(service)
      if (!cycleWeeks) continue // No cycle configured for this treatment type

      const nextRecommendedDate = calculateNextRecommendedDate(booking.date, cycleWeeks)
      const daysUntilDue = Math.floor(
        (nextRecommendedDate - now) / (1000 * 60 * 60 * 24)
      )

      // Only surface if overdue or coming up within the window
      if (daysUntilDue > SHOW_WITHIN_DAYS) continue

      cycles.push({
        bookingId: booking._id,
        serviceId: sid,
        serviceName: service.name,
        lastVisitDate: booking.date,
        nextRecommendedDate,
        cycleWeeks,
        daysUntilDue,
        isOverdue: daysUntilDue < 0,
        urgency: getCycleUrgency(daysUntilDue),
        dueDateLabel: formatDaysUntilDue(daysUntilDue),
      })
    }

    // Sort: overdue and most urgent first
    cycles.sort((a, b) => a.daysUntilDue - b.daysUntilDue)

    res.status(200).json({
      status: 'success',
      data: {
        cycles,
        total: cycles.length,
      },
    })
  } catch (error) {
    console.error('Error fetching treatment cycles:', error)
    next(createError(500, 'Failed to fetch treatment cycles'))
  }
}
