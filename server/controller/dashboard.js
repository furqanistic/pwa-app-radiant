// File: server/controller/dashboard.js
import mongoose from 'mongoose'
import { createError } from '../error.js'
import Booking from '../models/Booking.js'
import Location from '../models/Location.js'
import Referral from '../models/Referral.js'
import ReferralConfig from '../models/ReferralConfig.js'
import User from '../models/User.js'
import UserReward from '../models/UserReward.js'

// Get all dashboard data in one request
export const getDashboardData = async (req, res, next) => {
  try {
    // Add defensive check
    if (!req.user) {
      return next(createError(401, 'User not authenticated'))
    }

    // Use _id with fallback to id (Mongoose virtual)
    const userId = req.user._id || req.user.id
    const user = req.user

    if (!userId) {
      return next(createError(401, 'User ID not found'))
    }

    const config = await ReferralConfig.getActiveConfig()

    // Get automated gifts from user's relevant location
    let automatedGifts = []
    const targetLocationId = user.role === 'spa' 
      ? user.spaLocation?.locationId 
      : user.selectedLocation?.locationId

    if (targetLocationId) {
      const location = await Location.findOne({
        locationId: targetLocationId,
      })
      if (location) {
        const now = new Date()
        const currentMonth = now.getUTCMonth() + 1
        const currentDay = now.getUTCDate()

        automatedGifts = (location.automatedGifts || []).filter((gift) => {
          if (!gift.isActive) return false

          switch (gift.type) {
            case 'fixed-date':
              return gift.month === currentMonth && gift.day === currentDay
            case 'birthday':
              if (!user.dateOfBirth) return false
              const dob = new Date(user.dateOfBirth)
              return (
                dob.getUTCMonth() + 1 === currentMonth &&
                dob.getUTCDate() === currentDay
              )
            case 'anniversary':
              const signup = new Date(user.createdAt)
              return (
                signup.getUTCMonth() + 1 === currentMonth &&
                signup.getUTCDate() === currentDay
              )
            case 'custom':
              return true
            default:
              return false
          }
        })
      }
    }

    // Branch based on user role
    if (user.role === 'spa') {
      const locationId = user.spaLocation?.locationId
      
      if (!locationId) {
        return next(createError(400, 'Spa location not configured for this account'))
      }

      // 1. Get stats
      // Total Clients: users who have selected this spa
      const totalClients = await User.countDocuments({
        'selectedLocation.locationId': locationId,
        role: 'user',
        isDeleted: false
      })

      // Total Visits: completed bookings for this spa
      const totalVisits = await Booking.countDocuments({
        locationId,
        status: 'completed'
      })

      // Active Memberships: bookings for 'membership' services (simplified)
      // Or users with 'membership' rewards? Let's go with users who have booked a service containing 'membership' in the last 30 days
      // or simply count users who have a reward with type that could be membership (if we knew)
      // For now, let's count completed bookings for services with 'membership' in the name
      const activeMemberships = await Booking.countDocuments({
        locationId,
        status: 'completed',
        serviceName: { $regex: /membership/i }
      })

      // 2. Get Live Activity: Recently created bookings
      const liveActivity = await Booking.find({ locationId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('userId', 'name email avatar')
        .lean()

      // 3. Get Upcoming Bookings
      const currentBookings = await Booking.find({
        locationId,
        date: { $gte: new Date().setHours(0, 0, 0, 0) },
        status: { $in: ['scheduled', 'confirmed'] }
      })
        .sort({ date: 1, time: 1 })
        .limit(10)
        .populate('userId', 'name email avatar')
        .lean()

      // 4. Get Analytics (Real data for charts)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      // Bookings and Revenue Trend
      const trendData = await Booking.aggregate([
        {
          $match: {
            locationId,
            createdAt: { $gte: thirtyDaysAgo },
            status: { $ne: 'cancelled' }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            bookings: { $sum: 1 },
            revenue: { $sum: "$finalPrice" }
          }
        },
        { $sort: { _id: 1 } }
      ])

      // Top Services
      const topServices = await Booking.aggregate([
        {
          $match: {
            locationId,
            status: 'completed'
          }
        },
        {
          $group: {
            _id: "$serviceName",
            count: { $sum: 1 },
            revenue: { $sum: "$finalPrice" }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])

      // Calculate growth (comparison with previous 30-day period)
      const prevMonthStart = new Date()
      prevMonthStart.setDate(prevMonthStart.getDate() - 60)
      
      const getGrowth = async (model, query, dateField = 'createdAt') => {
        const currentCount = await model.countDocuments({ ...query, [dateField]: { $gte: thirtyDaysAgo } })
        const prevCount = await model.countDocuments({ ...query, [dateField]: { $gte: prevMonthStart, [dateField]: { $lt: thirtyDaysAgo } } })
        if (prevCount === 0) return currentCount > 0 ? 100 : 0
        return Math.round(((currentCount - prevCount) / prevCount) * 100)
      }

      const clientGrowth = await getGrowth(User, { 'selectedLocation.locationId': locationId, role: 'user', isDeleted: false })
      const visitGrowth = await getGrowth(Booking, { locationId, status: 'completed' })
      const membershipGrowth = await getGrowth(Booking, { locationId, status: 'completed', serviceName: { $regex: /membership/i } })
      const revenueGrowth = await getGrowth(Booking, { locationId, status: { $ne: 'cancelled' } }, 'createdAt') // This might need a custom aggregator but let's stick to counts for now or sum

      return res.status(200).json({
        status: 'success',
        data: {
          role: 'spa',
          stats: {
            totalClients,
            totalVisits,
            activeMemberships,
            clientGrowth,
            visitGrowth,
            membershipGrowth,
            revenueGrowth // Note: simplified to count growth for now
          },
          analytics: {
            trendData,
            topServices
          },
          liveActivity,
          currentBookings,
          spaLocation: user.spaLocation,
          automatedGifts
        }
      })
    }

    // Default: Regular User Dashboard data (existing logic)
    const upcomingAppointments = await Booking.find({
      userId,
      date: { $gte: new Date() },
      status: { $in: ['scheduled', 'confirmed'] },
    })
      .select('serviceName date time duration providerName status')
      .sort({ date: 1 })
      .limit(5)

    // Get past visits
    const pastVisits = await Booking.find({
      userId,
      date: { $lt: new Date() },
      status: { $in: ['completed'] },
    })
      .select('serviceName date rating status')
      .sort({ date: -1 })
      .limit(10)

    // Get referral stats
    const [totalReferrals, monthlyReferrals, referralEarnings] =
      await Promise.all([
        Referral.countDocuments({
          referrer: userId,
          status: 'completed',
        }),
        Referral.countDocuments({
          referrer: userId,
          status: 'completed',
          completedAt: {
            $gte: new Date(new Date().setDate(new Date().getDate() - 30)),
          },
        }),
        Referral.aggregate([
          {
            $match: {
              referrer: new mongoose.Types.ObjectId(userId),
              status: 'completed',
            },
          },
          {
            $group: {
              _id: null,
              totalEarnings: { $sum: '$referrerReward.points' },
            },
          },
        ]),
      ])

    // Get active credits & gifts (user rewards)
    const activeCredits = await UserReward.find({
      userId,
      status: 'active',
      expiresAt: { $gt: new Date() },
      'rewardSnapshot.type': { $in: ['credit', 'discount', 'service'] },
    })
      .select('rewardSnapshot expiresAt status')
      .sort({ expiresAt: 1 })

    // Find the nearest expiring credit
    const nearestExpiring = activeCredits.length > 0 ? activeCredits[0] : null

    // Count gift cards (rewards that were gifted or special rewards)
    const giftCards = await UserReward.countDocuments({
      userId,
      status: 'active',
      expiresAt: { $gt: new Date() },
      'rewardSnapshot.type': { $in: ['gift', 'referral', 'bonus'] },
    })

    // Get point earning methods based on current configuration
    const pointsEarningMethods = [
      {
        id: 1,
        title: 'Invite Friends',
        description: `Earn ${
          Math.round(config.signupReward.referrerPoints * (config.tierMultipliers[user.referralStats?.currentTier || 'bronze'] || 1.0))
        } points per referral`,
        icon: 'UserPlus',
        points: `+${Math.round(config.signupReward.referrerPoints * (config.tierMultipliers[user.referralStats?.currentTier || 'bronze'] || 1.0))}`,
        action: 'Share Now',
      },
      {
        id: 2,
        title: 'Book Appointments',
        description: 'Get 50 points per booking',
        icon: 'Calendar',
        points: '+50',
        action: 'Book Now',
      },
      {
        id: 3,
        title: 'Purchase Products',
        description: 'Earn 1 point per $1 spent',
        icon: 'ShoppingBag',
        points: '+1/$1',
        action: 'Shop Now',
      },
      {
        id: 4,
        title: 'Leave Reviews',
        description: 'Get 10 points for each review',
        icon: 'Star',
        points: '+10',
        action: 'Review',
      },
    ]


    res.status(200).json({
      status: 'success',
      data: {
        role: 'user',
        upcomingAppointments,
        pastVisits,
        referralStats: {
          total: totalReferrals,
          thisMonth: monthlyReferrals,
          earnings: referralEarnings[0]?.totalEarnings || 0,
          referralCode: user.referralCode,
        },
        credits: {
          available: activeCredits.length,
          gifts: giftCards,
          expiring: nearestExpiring ? nearestExpiring.expiresAt : null,
          expiringReward: nearestExpiring,
        },
        pointsEarningMethods,
        automatedGifts,
        userPoints: user.points || 0,
      },
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    next(createError(500, 'Failed to fetch dashboard data'))
  }
}

// ===========================
