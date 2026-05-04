// File: server/controller/dashboard.js
import mongoose from 'mongoose'
import { createError } from '../error.js'
import Booking from '../models/Booking.js'
import Location from '../models/Location.js'
import Payment from '../models/Payment.js'
import QRCodeScan from '../models/QRCodeScan.js'
import Referral from '../models/Referral.js'
import User from '../models/User.js'
import UserReward from '../models/UserReward.js'
import {
  assertViewerCanSeeLocationStripeCharges,
  resolveManagementStripeConnectContext,
  sumStripeConnectChargesNetCentsUtcRange,
} from './stripeController.js'
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

const getUserAccessibleLocationIds = (user) => {
  const ids = new Set()
  if (user?.selectedLocation?.locationId) ids.add(user.selectedLocation.locationId)
  if (user?.spaLocation?.locationId) ids.add(user.spaLocation.locationId)
  if (Array.isArray(user?.assignedLocations)) {
    user.assignedLocations.forEach((location) => {
      if (location?.locationId) ids.add(location.locationId)
    })
  }
  return [...ids]
}

const canAccessLocation = (user, locationId) => {
  if (!locationId) return false
  if (['super-admin', 'admin'].includes(user?.role)) return true
  return getUserAccessibleLocationIds(user).includes(locationId)
}

const getDashboardLocationId = (user, requestedLocationId = '') => {
  const normalizedRequestedLocationId = `${requestedLocationId || ''}`.trim()
  if (normalizedRequestedLocationId) {
    return canAccessLocation(user, normalizedRequestedLocationId)
      ? normalizedRequestedLocationId
      : null
  }

  if (user?.role === 'spa') {
    return user.spaLocation?.locationId
  }

  if (['admin', 'super-admin'].includes(user?.role)) {
    return user.selectedLocation?.locationId || user.spaLocation?.locationId
  }

  return user?.selectedLocation?.locationId || user?.spaLocation?.locationId || null
}

const mergeRevenueTrendData = (bookingTrendRows = [], paymentTrendRows = []) => {
  const trendMap = new Map()

  bookingTrendRows.forEach((row) => {
    const key = `${row?._id || ''}`
    if (!key) return
    trendMap.set(key, {
      _id: key,
      bookings: Number(row?.bookings || 0),
      revenue: Number(row?.revenue || 0),
    })
  })

  paymentTrendRows.forEach((row) => {
    const key = `${row?._id || ''}`
    if (!key) return

    const current = trendMap.get(key) || {
      _id: key,
      bookings: 0,
      revenue: 0,
    }

    current.revenue =
      Number(current.revenue || 0) + Number(row?.revenue || 0)
    trendMap.set(key, current)
  })

  return [...trendMap.values()].sort((a, b) => `${a._id}`.localeCompare(`${b._id}`))
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
    const requestedLocationId = `${req.query?.locationId || ''}`.trim()
    const targetLocationId = getDashboardLocationId(user, requestedLocationId)

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
    if (['spa', 'admin', 'super-admin'].includes(user.role)) {
      const locationId = getDashboardLocationId(user, requestedLocationId)
      
      if (!locationId) {
        return next(
          createError(400, 'Spa location not configured for this account')
        )
      }

      const dashboardLocation = await Location.findOne({ locationId })
        .select(
          'qrCode.lastResetAt checkInQrCode.lastResetAt addedBy dashboardCheckInStats'
        )
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

      /** Users tied to this location who receive Connect payouts — matches Payment.spaOwner. */
      const spaOwnerDocs = await User.find({
        isDeleted: false,
        $or: [
          { 'spaLocation.locationId': locationId },
          { assignedLocations: { $elemMatch: { locationId } } },
        ],
      })
        .select('_id')
        .lean()

      let spaOwnerObjectIdsForPayments = spaOwnerDocs.map((doc) => doc._id)

      const addedById = dashboardLocation?.addedBy

      const ensureOwnerIdIncluded = () => {
        if (addedById && !spaOwnerObjectIdsForPayments.some(
          (id) => `${id}` === `${addedById}`
        )) {
          spaOwnerObjectIdsForPayments = [...spaOwnerObjectIdsForPayments, addedById]
        }
      }
      ensureOwnerIdIncluded()

      if (spaOwnerObjectIdsForPayments.length === 0) {
        spaOwnerObjectIdsForPayments = userId ? [userId] : []
      }

      const productionPaymentsScope = {
        spaOwner: {
          $in: spaOwnerObjectIdsForPayments,
        },
        customer: { $nin: testUserIds },
        status: 'succeeded',
      }

      const utcRef = new Date()
      const utcY = utcRef.getUTCFullYear()
      const utcMo = utcRef.getUTCMonth()
      const utcMonthStartDate = new Date(Date.UTC(utcY, utcMo, 1))
      const utcMonthEndExclusiveDate = new Date(Date.UTC(utcY, utcMo + 1, 1))
      const prevUtcMonthStartDate = new Date(Date.UTC(utcY, utcMo - 1, 1))

      /** Same people set as Contacts (/contacts): End users tied to this location. */
      const contactsAtLocationFilter = {
        isDeleted: false,
        role: 'user',
        email: { $not: TEST_EMAIL_REGEX },
        $or: [
          { 'selectedLocation.locationId': locationId },
          { 'spaLocation.locationId': locationId },
          { 'assignedLocations.locationId': locationId },
        ],
      }

      const dashboardActor =
        userId &&
        (await User.findById(userId)
          .select('role stripe selectedLocation spaLocation')
          .lean())

      const signupThisMonthQuery = {
        ...contactsAtLocationFilter,
        createdAt: {
          $gte: utcMonthStartDate,
          $lt: utcMonthEndExclusiveDate,
        },
      }
      const signupPrevMonthQuery = {
        ...contactsAtLocationFilter,
        createdAt: {
          $gte: prevUtcMonthStartDate,
          $lt: utcMonthStartDate,
        },
      }

      const ROLLING_MS_30 = 30 * 24 * 60 * 60 * 1000
      const nowMsForRolling = utcRef.getTime()
      const thirtyDaysAgoRolling = new Date(nowMsForRolling - ROLLING_MS_30)
      const sixtyDaysAgoRolling = new Date(nowMsForRolling - 2 * ROLLING_MS_30)
      const rollingEndInclusive = new Date(nowMsForRolling)

      const checkInQrScanRollingBase = {
        locationId,
        scanType: 'checkin',
        status: 'verified',
        scannedByUser: { $nin: testUserIds, $ne: null },
      }

      const countDistinctMembershipCustomersInRollingRange = async (
        startInclusive,
        endBound,
        { inclusiveUpperBound = false } = {},
      ) => {
        const createdAt = inclusiveUpperBound
          ? { $gte: startInclusive, $lte: endBound }
          : { $gte: startInclusive, $lt: endBound }

        const rows = await Payment.aggregate([
          {
            $match: {
              ...productionPaymentsScope,
              paymentCategory: 'membership',
              livemode: { $ne: false },
              createdAt,
            },
          },
          { $group: { _id: '$customer' } },
          { $count: 'n' },
        ])
        return Number(rows[0]?.n || 0)
      }

      const [
        totalClients,
        signupThisMonthCount,
        signupPrevMonthCount,
        qrCheckInsLast30,
        qrCheckInsPrior30,
        membershipPayersLast30,
        membershipPayersPrior30,
      ] = await Promise.all([
        User.countDocuments(contactsAtLocationFilter),
        User.countDocuments(signupThisMonthQuery),
        User.countDocuments(signupPrevMonthQuery),
        QRCodeScan.countDocuments({
          ...checkInQrScanRollingBase,
          createdAt: {
            $gte: thirtyDaysAgoRolling,
            $lte: rollingEndInclusive,
          },
        }),
        QRCodeScan.countDocuments({
          ...checkInQrScanRollingBase,
          createdAt: {
            $gte: sixtyDaysAgoRolling,
            $lt: thirtyDaysAgoRolling,
          },
        }),
        countDistinctMembershipCustomersInRollingRange(
          thirtyDaysAgoRolling,
          rollingEndInclusive,
          { inclusiveUpperBound: true }
        ),
        countDistinctMembershipCustomersInRollingRange(
          sixtyDaysAgoRolling,
          thirtyDaysAgoRolling
        ),
      ])

      /** Distinct customers with a succeeded membership payment in trailing 30d (`stats.activeMemberships`). */
      const activeMemberships = membershipPayersLast30

      const clientGrowth =
        signupPrevMonthCount === 0
          ? signupThisMonthCount > 0
            ? 100
            : 0
          : Math.round(
              ((signupThisMonthCount - signupPrevMonthCount) /
                signupPrevMonthCount) *
                100
            )

      const membershipGrowth =
        membershipPayersPrior30 === 0
          ? membershipPayersLast30 > 0
            ? 100
            : 0
          : Math.round(
              ((membershipPayersLast30 - membershipPayersPrior30) /
                membershipPayersPrior30) *
                100
            )

      const visitsLast30 = Number(qrCheckInsLast30 || 0)
      const visitsPrior30 = Number(qrCheckInsPrior30 || 0)

      const visitGrowth =
        visitsPrior30 === 0
          ? visitsLast30 > 0
            ? 100
            : 0
          : Math.round(
              ((visitsLast30 - visitsPrior30) / visitsPrior30) * 100
            )

      /** Verified QR check-ins in the trailing 30-day window vs the prior 30 days. */
      const totalVisits = visitsLast30

      const mongoPaymentSumCentsForRange = async (
        startDate,
        endBound,
        { inclusiveEnd = false } = {},
      ) => {
        const createdAt = inclusiveEnd
          ? { $gte: startDate, $lte: endBound }
          : { $gte: startDate, $lt: endBound }

        const rows = await Payment.aggregate([
          {
            $match: {
              ...productionPaymentsScope,
              createdAt,
              livemode: { $ne: false },
              status: 'succeeded',
            },
          },
          { $group: { _id: null, sum: { $sum: '$amount' } } },
        ])
        return Number(rows[0]?.sum || 0)
      }

      const last30StripeGteUnix = Math.floor(thirtyDaysAgoRolling.getTime() / 1000)
      const last30StripeLteUnix = Math.floor(nowMsForRolling / 1000)
      const prev30StripeGteUnix = Math.floor(sixtyDaysAgoRolling.getTime() / 1000)
      const prev30StripeLteUnix = last30StripeGteUnix - 1

      let stripeRevenueLast30Cents = 0
      let stripeRevenuePrior30Cents = 0
      let resolvedStripeAccountId = null

      try {
        if (dashboardActor) {
          const ctx = await resolveManagementStripeConnectContext(
            dashboardActor,
            locationId
          )
          resolvedStripeAccountId = ctx.stripeAccountId || null
          if (resolvedStripeAccountId) {
            assertViewerCanSeeLocationStripeCharges(user, {
              locationScopeId: locationId,
              stripeHolderUser: ctx.stripeHolderUser,
            })
            ;[stripeRevenueLast30Cents, stripeRevenuePrior30Cents] =
              await Promise.all([
                sumStripeConnectChargesNetCentsUtcRange(
                  resolvedStripeAccountId,
                  last30StripeGteUnix,
                  last30StripeLteUnix
                ),
                sumStripeConnectChargesNetCentsUtcRange(
                  resolvedStripeAccountId,
                  prev30StripeGteUnix,
                  prev30StripeLteUnix
                ),
              ])
          }
        }
      } catch (revErr) {
        console.error('Dashboard rolling 30-day Stripe volume:', revErr)
        resolvedStripeAccountId = null
      }

      if (!resolvedStripeAccountId) {
        ;[stripeRevenueLast30Cents, stripeRevenuePrior30Cents] =
          await Promise.all([
            mongoPaymentSumCentsForRange(thirtyDaysAgoRolling, rollingEndInclusive, {
              inclusiveEnd: true,
            }),
            mongoPaymentSumCentsForRange(
              sixtyDaysAgoRolling,
              thirtyDaysAgoRolling
            ),
          ])
      }

      /** Net Stripe Connect charge volume (or Payment fallback) over trailing vs prior 30 days. */
      const totalRevenue = Number((stripeRevenueLast30Cents / 100).toFixed(2))
      const revenueGrowth =
        stripeRevenuePrior30Cents === 0
          ? stripeRevenueLast30Cents > 0
            ? 100
            : 0
          : Math.round(
              ((stripeRevenueLast30Cents - stripeRevenuePrior30Cents) /
                stripeRevenuePrior30Cents) *
                100
            )

      // 3. Get Live Activity: Only paid bookings with a linked payment record
      const [liveBookingActivity, livePaymentActivity] = await Promise.all([
        Booking.find({
          ...productionBookingsScope,
          paymentStatus: 'paid',
          paymentId: { $ne: null },
          status: 'completed',
        })
          .sort({ createdAt: -1 })
          .limit(10)
          .populate('userId', 'name email avatar')
          .populate('paymentId', 'livemode')
          .lean(),
        Payment.find({
          ...productionPaymentsScope,
          paymentCategory: { $in: ['credits', 'membership'] },
          livemode: { $ne: false },
        })
          .sort({ createdAt: -1 })
          .limit(10)
          .populate('customer', 'name email avatar')
          .lean(),
      ])

      const filteredLiveBookingActivity = liveBookingActivity.filter((activity) => {
        const payment = activity?.paymentId
        return !(payment && payment.livemode === false)
      })

      const normalizedPaymentActivity = livePaymentActivity.map((payment) => {
        const isCreditsPurchase = payment?.paymentCategory === 'credits'
        const quantity = Number(payment?.creditDetails?.quantity || 0)
        const planName = payment?.membershipDetails?.planName || 'Membership plan'

        return {
          _id: `payment-${payment?._id}`,
          createdAt: payment?.createdAt,
          userId: payment?.customer
            ? {
                _id: payment.customer._id,
                name: payment.customer.name,
                email: payment.customer.email,
                avatar: payment.customer.avatar,
              }
            : null,
          serviceName: isCreditsPurchase
            ? `${quantity || ''} credit${quantity === 1 ? '' : 's'} purchased`.trim()
            : planName,
          finalPrice: Number(payment?.amount || 0) / 100,
          status: 'completed',
          paymentStatus: 'paid',
          activityType: payment?.paymentCategory || 'payment',
          activityLabel: isCreditsPurchase ? 'Credit Purchase' : 'Membership Payment',
          displayStatus: isCreditsPurchase ? 'paid' : 'paid',
          paymentId: { livemode: payment?.livemode },
        }
      })

      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date()
      todayEnd.setHours(23, 59, 59, 999)

      const liveBookingSeenIds = new Set(
        filteredLiveBookingActivity.map((b) => b?._id?.toString?.()).filter(Boolean)
      )

      const todaysAppointmentBookings = await Booking.find({
        ...productionBookingsScope,
        date: { $gte: todayStart, $lte: todayEnd },
        status: { $in: ['scheduled', 'confirmed', 'completed', 'no-show'] },
      })
        .sort({ date: 1, time: 1 })
        .limit(24)
        .populate('userId', 'name email avatar')
        .populate('paymentId', 'livemode')
        .lean()

      const filteredTodaysAppointmentActivity = todaysAppointmentBookings
        .filter((b) => {
          if (!b?._id) return false
          if (liveBookingSeenIds.has(b._id.toString())) return false
          const payment = b.paymentId
          return !(payment && typeof payment === 'object' && payment.livemode === false)
        })
        .map((b) => {
          const startDt =
            Booking.buildBookingStartDateTime(b.date, b.time) || new Date(b.date)
          const paid = `${b.paymentStatus || ''}`.toLowerCase() === 'paid'
          const displayStatus = paid ? `${b.status}` : `${b.status} · unpaid`
          return {
            ...b,
            _id: b._id,
            createdAt: startDt,
            activityKind: 'todaysAppointment',
            activityLabel: b.time ? `${b.serviceName} · ${b.time}` : b.serviceName,
            displayStatus,
          }
        })

      const filteredLiveActivity = [
        ...filteredLiveBookingActivity,
        ...normalizedPaymentActivity,
        ...filteredTodaysAppointmentActivity,
      ]
        .sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0))
        .slice(0, 20)

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
        .populate('scannedByUser', 'name email avatar points credits')
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
                credits: Number(scannedByUser.credits || 0),
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
      const [bookingTrendData, paymentRevenueTrendData] = await Promise.all([
        Booking.aggregate([
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
        ]),
        Payment.aggregate([
          {
            $match: {
              ...productionPaymentsScope,
              createdAt: { $gte: thirtyDaysAgo },
              livemode: { $ne: false },
              // Avoid double-counting with booking-driven service revenue below.
              paymentCategory: { $in: ['membership', 'credits'] },
            },
          },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              revenue: { $sum: { $divide: ['$amount', 100] } },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ])
      const trendData = mergeRevenueTrendData(
        bookingTrendData,
        paymentRevenueTrendData
      )

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

      return res.status(200).json({
        status: 'success',
        data: {
          role: user.role,
          stats: {
            totalClients,
            totalVisits,
            activeMemberships,
            totalRevenue,
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

    const userReviewMeta = await User.findById(userId).select('reviewRewards').lean()
    const reviewLinkBonusClaimed = Boolean(
      userReviewMeta?.reviewRewards?.googleReview?.awarded
    )
    const pointsEarningMethodsPayload = pointsEarningMethods.filter(
      (row) => !(reviewLinkBonusClaimed && row.key === 'review')
    )

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
          available: Math.max(0, Number(user.credits || 0)),
          gifts: giftCards,
          expiring: nearestExpiring ? nearestExpiring.expiresAt : null,
          expiringReward: nearestExpiring,
        },
        pointsEarningMethods: pointsEarningMethodsPayload,
        reviewLinkBonusClaimed,
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

    const locationId = getDashboardLocationId(
      user,
      `${req.query?.locationId || ''}`.trim()
    )

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
