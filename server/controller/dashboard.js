// File: server/controller/dashboard.js
import mongoose from 'mongoose'
import { createError } from '../error.js'
import Booking from '../models/Booking.js'
import Location from '../models/Location.js'
import QRCodeScan from '../models/QRCodeScan.js'
import Referral from '../models/Referral.js'
import User from '../models/User.js'
import UserReward from '../models/UserReward.js'
import {
  buildPointsLabel,
  EARN_MORE_POINTS_METHOD_KEYS,
  mergePointsMethodsWithDefaults,
} from '../utils/pointsSettings.js'

const RECENT_QR_CLAIMS_WINDOW_DAYS = 3
const RECENT_QR_CLAIMS_LIMIT = 250
const TEST_EMAIL_REGEX = /@test\.com$/i

const getRewardPreviewLabel = (reward) => {
  const snapshot = reward?.rewardSnapshot || {}
  const rewardType = snapshot?.type
  const rewardValue = snapshot?.value
  const winningItem = snapshot?.winningItem || {}

  if (rewardType === 'discount' && rewardValue) {
    return `${rewardValue}% off`
  }

  if (winningItem?.valueType === 'discount' && winningItem?.value) {
    return `${winningItem.value}% off`
  }

  return (
    snapshot?.name ||
    winningItem?.title ||
    winningItem?.value ||
    rewardType ||
    'Active reward'
  )
}

const buildRewardSummary = (rewards = []) => {
  if (!Array.isArray(rewards) || rewards.length === 0) {
    return {
      totalActiveRewards: 0,
      labels: [],
      nextExpiryAt: null,
    }
  }

  const nextExpiryAt =
    rewards
      .map((reward) => reward?.expiresAt)
      .filter(Boolean)
      .sort((a, b) => new Date(a) - new Date(b))[0] || null

  const labels = [
    ...new Set(
      rewards
        .map((reward) => getRewardPreviewLabel(reward))
        .filter((label) => typeof label === 'string' && label.trim())
    ),
  ].slice(0, 3)

  return {
    totalActiveRewards: rewards.length,
    labels,
    nextExpiryAt,
  }
}

const getDashboardLocationId = (user) => {
  if (user?.role === 'spa') {
    return user.spaLocation?.locationId
  }

  if (['admin', 'super-admin'].includes(user?.role)) {
    return user.selectedLocation?.locationId || user.spaLocation?.locationId
  }

  return null
}

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

    // Get automated gifts from user's relevant location
    let automatedGifts = []
    let pointsMethods = mergePointsMethodsWithDefaults([])
    const targetLocationId = user.role === 'spa' 
      ? user.spaLocation?.locationId 
      : user.selectedLocation?.locationId

    if (targetLocationId) {
      const location = await Location.findOne({
        locationId: targetLocationId,
      })
      if (location) {
        pointsMethods = mergePointsMethodsWithDefaults(
          location.pointsSettings?.methods || []
        )

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
    if (['spa', 'admin'].includes(user.role)) {
      const locationId = getDashboardLocationId(user)
      
      if (!locationId) {
        return next(
          createError(400, 'Spa location not configured for this account')
        )
      }

      const dashboardLocation = await Location.findOne({ locationId })
        .select('qrCode.lastResetAt checkInQrCode.lastResetAt')
        .lean()

      // 1. Build test-account scope once.
      // Any dashboard metric derived from users/bookings should ignore *@test.com.
      const testUsers = await User.find({
        email: TEST_EMAIL_REGEX,
      })
        .select('_id')
        .lean()

      const testUserIds = testUsers.map((entry) => entry._id)
      const productionBookingsScope = { locationId, userId: { $nin: testUserIds } }

      // 2. Get stats
      const totalClients = await User.countDocuments({
        'selectedLocation.locationId': locationId,
        role: 'user',
        isDeleted: false,
        email: { $not: TEST_EMAIL_REGEX },
      })

      // Total Visits: completed bookings for this spa
      const totalVisits = await Booking.countDocuments({
        ...productionBookingsScope,
        status: 'completed',
        paymentStatus: 'paid',
      })

      // Active Memberships: bookings for 'membership' services (simplified)
      // Or users with 'membership' rewards? Let's go with users who have booked a service containing 'membership' in the last 30 days
      // or simply count users who have a reward with type that could be membership (if we knew)
      // For now, let's count completed bookings for services with 'membership' in the name
      const activeMemberships = await Booking.countDocuments({
        ...productionBookingsScope,
        status: 'completed',
        paymentStatus: 'paid',
        serviceName: { $regex: /membership/i },
      })

      // 3. Get Live Activity: Only paid bookings with a linked payment record
      const liveActivity = await Booking.find({
        ...productionBookingsScope,
        paymentStatus: 'paid',
        paymentId: { $ne: null },
        status: 'completed',
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('userId', 'name email avatar')
        .populate('paymentId', 'livemode')
        .lean()

      const filteredLiveActivity = liveActivity.filter((activity) => {
        const payment = activity?.paymentId
        return !(payment && payment.livemode === false)
      })

      const recentClaimsStart = new Date()
      recentClaimsStart.setDate(
        recentClaimsStart.getDate() - RECENT_QR_CLAIMS_WINDOW_DAYS
      )

      const recentQrScans = await QRCodeScan.find({
        locationId,
        scanType: 'checkin',
        status: 'verified',
        scannedByUser: { $nin: testUserIds, $ne: null },
        createdAt: { $gte: recentClaimsStart },
      })
        .sort({ createdAt: -1 })
        .limit(RECENT_QR_CLAIMS_LIMIT)
        .populate('scannedByUser', 'name email avatar points')
        .lean()

      const scannedUserIds = [
        ...new Set(
          recentQrScans
            .map((scan) => scan?.scannedByUser?._id?.toString())
            .filter(Boolean)
        ),
      ]

      const activeRewardsByUser = new Map()

      if (scannedUserIds.length > 0) {
        const activeRewards = await UserReward.find({
          userId: { $in: scannedUserIds },
          locationId,
          status: 'active',
          $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
        })
          .select('userId rewardSnapshot expiresAt')
          .sort({ claimedAt: -1 })
          .lean()

        activeRewards.forEach((reward) => {
          const rewardUserId = reward?.userId?.toString()
          if (!rewardUserId) return

          if (!activeRewardsByUser.has(rewardUserId)) {
            activeRewardsByUser.set(rewardUserId, [])
          }

          activeRewardsByUser.get(rewardUserId).push(reward)
        })
      }

      const recentQrClaims = recentQrScans.map((scan) => {
        const scannedByUser = scan?.scannedByUser
        const scannedByUserId = scannedByUser?._id?.toString()
        const rewardSummary = buildRewardSummary(
          scannedByUserId ? activeRewardsByUser.get(scannedByUserId) || [] : []
        )

        return {
          _id: scan._id,
          claimedAt: scan.createdAt,
          pointsAwarded: scan.pointsAwarded || 0,
          scannedByEmail: scan.scannedByEmail,
          customer: scannedByUser
            ? {
                _id: scannedByUser._id,
                name: scannedByUser.name,
                email: scannedByUser.email,
                avatar: scannedByUser.avatar,
                points: scannedByUser.points || 0,
              }
            : null,
          activeRewardSummary: rewardSummary,
        }
      })

      const [recentQrClaimsTotal, recentQrClaimVisitorRows] = await Promise.all([
        QRCodeScan.countDocuments({
          locationId,
          scanType: 'checkin',
          status: 'verified',
          scannedByUser: { $nin: testUserIds, $ne: null },
          createdAt: { $gte: recentClaimsStart },
        }),
        QRCodeScan.aggregate([
          {
            $match: {
              locationId,
              scanType: 'checkin',
              status: 'verified',
              scannedByUser: { $nin: testUserIds, $ne: null },
              createdAt: { $gte: recentClaimsStart },
            },
          },
          {
            $group: {
              _id: '$scannedByUser',
            },
          },
        ]),
      ])

      // 4. Get Upcoming Bookings
      const currentBookings = await Booking.find({
        ...productionBookingsScope,
        date: { $gte: new Date().setHours(0, 0, 0, 0) },
        status: { $in: ['scheduled', 'confirmed'] },
        paymentStatus: 'paid',
      })
        .sort({ date: 1, time: 1 })
        .limit(10)
        .populate('userId', 'name email avatar')
        .lean()

      // 5. Get Analytics (Real data for charts)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      // Bookings and Revenue Trend
      const trendData = await Booking.aggregate([
        {
          $match: {
            ...productionBookingsScope,
            createdAt: { $gte: thirtyDaysAgo },
            status: 'completed',
            paymentStatus: 'paid',
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
            ...productionBookingsScope,
            status: 'completed',
            paymentStatus: 'paid',
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
        const currentCount = await model.countDocuments({
          ...query,
          [dateField]: { $gte: thirtyDaysAgo },
        })
        const prevCount = await model.countDocuments({
          ...query,
          [dateField]: { $gte: prevMonthStart, $lt: thirtyDaysAgo },
        })
        if (prevCount === 0) return currentCount > 0 ? 100 : 0
        return Math.round(((currentCount - prevCount) / prevCount) * 100)
      }

      const clientGrowth = await getGrowth(User, {
        'selectedLocation.locationId': locationId,
        role: 'user',
        isDeleted: false,
        email: { $not: TEST_EMAIL_REGEX },
      })
      const visitGrowth = await getGrowth(Booking, {
        ...productionBookingsScope,
        status: 'completed',
        paymentStatus: 'paid',
      })
      const membershipGrowth = await getGrowth(Booking, {
        ...productionBookingsScope,
        status: 'completed',
        paymentStatus: 'paid',
        serviceName: { $regex: /membership/i },
      })
      const revenueGrowth = await getGrowth(
        Booking,
        {
          ...productionBookingsScope,
          status: 'completed',
          paymentStatus: 'paid',
        },
        'createdAt'
      )

      return res.status(200).json({
        status: 'success',
        data: {
          role: user.role,
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
          liveActivity: filteredLiveActivity,
          recentQrClaims,
          recentQrClaimsSummary: {
            days: RECENT_QR_CLAIMS_WINDOW_DAYS,
            totalClaims: recentQrClaimsTotal,
            uniqueVisitors: recentQrClaimVisitorRows.length,
            latestClaimAt: recentQrClaims[0]?.claimedAt || null,
            lastResetAt:
              dashboardLocation?.checkInQrCode?.lastResetAt ||
              dashboardLocation?.qrCode?.lastResetAt ||
              null,
          },
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
      paymentStatus: 'paid',
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

    // Get point earning methods based on location configuration
    const pointsEarningMethods = pointsMethods
      .filter(
        (method) =>
          EARN_MORE_POINTS_METHOD_KEYS.includes(method.key) &&
          method.isActive &&
          (typeof method.pointsValue !== 'number' || method.pointsValue > 0)
      )
      .sort(
        (a, b) =>
          EARN_MORE_POINTS_METHOD_KEYS.indexOf(a.key) -
          EARN_MORE_POINTS_METHOD_KEYS.indexOf(b.key)
      )
      .map((method, index) => {
        const pointsLabel = buildPointsLabel(method)

        return {
          id: index + 1,
          key: method.key,
          title: method.title,
          description: method.description,
          icon: method.icon || 'Zap',
          points: pointsLabel,
          action: method.action || 'Learn More',
          actionType: method.actionType || 'passive',
          path: method.path || null,
        }
      })


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

export const resetRecentCheckIns = async (req, res, next) => {
  try {
    const user = req.user

    if (!['spa', 'admin', 'super-admin'].includes(user?.role)) {
      return next(createError(403, 'Management access required'))
    }

    const locationId = getDashboardLocationId(user)

    if (!locationId) {
      return next(createError(400, 'Spa location not configured for this account'))
    }

    const resetWindowStart = new Date()
    resetWindowStart.setDate(
      resetWindowStart.getDate() - RECENT_QR_CLAIMS_WINDOW_DAYS
    )

    const lastResetAt = new Date()
    const location = await Location.findOne({ locationId })

    const deletedScansResult = await QRCodeScan.deleteMany({
      locationId,
      scanType: 'checkin',
      createdAt: { $gte: resetWindowStart },
    })

    if (location) {
      location.qrCode = {
        ...(location.qrCode || {}),
        lastResetAt,
      }
      location.checkInQrCode = {
        ...(location.checkInQrCode || {}),
        lastResetAt,
      }
      await location.save()
    }

    res.status(200).json({
      status: 'success',
      message: 'Recent check-ins were cleared successfully.',
      data: {
        days: RECENT_QR_CLAIMS_WINDOW_DAYS,
        deletedScans: deletedScansResult.deletedCount || 0,
        reversedUserCount: 0,
        reversedUserPoints: 0,
        reversedSpaPoints: 0,
        lastResetAt,
      },
    })
  } catch (error) {
    console.error('Error resetting recent check-ins:', error)
    next(createError(500, 'Failed to reset recent check-ins'))
  }
}

// ===========================
