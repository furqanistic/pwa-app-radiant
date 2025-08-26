// File: server/controller/dashboard.js
import mongoose from 'mongoose'
import { createError } from '../error.js'
import Booking from '../models/Booking.js'
import Referral from '../models/Referral.js'
import User from '../models/User.js'
import { UserReward } from '../models/UserReward.js'

// Get all dashboard data in one request
export const getDashboardData = async (req, res, next) => {
  try {
    const userId = req.user.id
    const user = req.user

    // Get upcoming appointments
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
          user.referralStats?.currentTier === 'gold' ? 600 : 500
        } points per referral`,
        icon: 'UserPlus',
        points: user.referralStats?.currentTier === 'gold' ? '+600' : '+500',
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
        userPoints: user.points || 0,
      },
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    next(createError(500, 'Failed to fetch dashboard data'))
  }
}

// ===========================
