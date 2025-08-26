// File: server/controller/referral.js - COMPLETE WITH AUTO TIER PROGRESSION
import { createError } from '../error.js'
import Referral from '../models/Referral.js'
import ReferralConfig from '../models/ReferralConfig.js'
import User from '../models/User.js'
import { createSystemNotification } from './notification.js'

// Helper: Auto-update user tier based on total referrals
const updateUserTier = async (userId) => {
  try {
    const user = await User.findById(userId)
    if (!user) return null

    const config = await ReferralConfig.getActiveConfig()
    const totalReferrals = user.referralStats.totalReferrals || 0
    const currentTier = user.referralStats.currentTier || 'bronze'

    // Determine new tier based on thresholds
    let newTier = 'bronze'
    if (totalReferrals >= 10) {
      newTier = 'platinum'
    } else if (totalReferrals >= 5) {
      newTier = 'gold'
    }

    // If tier changed, update and notify
    if (currentTier !== newTier) {
      const oldTier = currentTier
      user.referralStats.currentTier = newTier
      await user.save()

      // Send notification
      await createSystemNotification(
        userId,
        `🎉 Tier Upgraded to ${newTier.toUpperCase()}!`,
        `Congratulations! You've been promoted from ${oldTier} to ${newTier} tier with ${totalReferrals} referrals. Enjoy ${config.tierMultipliers[newTier]}x rewards!`,
        {
          category: 'referral',
          priority: 'high',
          metadata: {
            type: 'tier_upgrade',
            oldTier,
            newTier,
            totalReferrals,
          },
        }
      )

      console.log(`✅ User ${user.name} promoted from ${oldTier} to ${newTier}`)
      return { oldTier, newTier, totalReferrals }
    }

    return null
  } catch (error) {
    console.error('Error updating user tier:', error)
    return null
  }
}

// Process referral (called from auth.js)
export const processReferral = async (referredUserId, referralCode) => {
  try {
    const referrer = await User.findOne({
      referralCode: referralCode.toUpperCase(),
      isDeleted: false,
    })

    if (!referrer) {
      return { success: false, message: 'Invalid referral code' }
    }

    const referredUser = await User.findById(referredUserId)
    if (!referredUser) {
      return { success: false, message: 'Referred user not found' }
    }

    if (referrer._id.toString() === referredUserId.toString()) {
      return { success: false, message: 'Cannot refer yourself' }
    }

    if (referredUser.referredBy) {
      return { success: false, message: 'User was already referred' }
    }

    const existingReferral = await Referral.findOne({
      referrer: referrer._id,
      referred: referredUserId,
    })

    if (existingReferral) {
      return { success: false, message: 'Referral already exists' }
    }

    // Create pending referral
    const referral = await Referral.create({
      referrer: referrer._id,
      referred: referredUserId,
      referralCode: referralCode.toUpperCase(),
      rewardType: 'signup',
      status: 'pending',
      referrerReward: { points: 0, awarded: false },
      referredReward: { points: 0, awarded: false },
      metadata: { notes: 'Waiting for spa selection' },
    })

    // Update users
    referredUser.referredBy = referrer._id
    await referredUser.save()

    // Update referrer stats
    referrer.referralStats.totalReferrals =
      (referrer.referralStats.totalReferrals || 0) + 1
    referrer.referralStats.activeReferrals =
      (referrer.referralStats.activeReferrals || 0) + 1
    await referrer.save()

    // Check for tier upgrade
    await updateUserTier(referrer._id)

    return {
      success: true,
      message: 'Referral created successfully',
      data: { referral },
    }
  } catch (error) {
    console.error('Error processing referral:', error)
    return { success: false, message: 'Failed to process referral' }
  }
}

// Process referral rewards when spa is selected
export const processReferralRewards = async (referredUser, locationId) => {
  try {
    const pendingReferral = await Referral.findOne({
      referred: referredUser._id,
      status: 'pending',
      rewardType: 'signup',
    }).populate('referrer', 'name email referralStats')

    if (!pendingReferral) {
      return { success: false, message: 'No pending referral found' }
    }

    const referrer = pendingReferral.referrer
    const config = await ReferralConfig.getActiveConfig()

    // Calculate rewards with tier multiplier
    const tierMultiplier =
      config.tierMultipliers[referrer.referralStats?.currentTier || 'bronze'] ||
      1.0
    const spaConfig = config.getSpaConfig(locationId)

    const referrerPoints = Math.round(
      spaConfig.signupReward.referrerPoints * tierMultiplier
    )
    const referredPoints = Math.round(
      spaConfig.signupReward.referredPoints * tierMultiplier
    )

    // Update referral with calculated points
    pendingReferral.referrerReward.points = referrerPoints
    pendingReferral.referredReward.points = referredPoints
    pendingReferral.metadata.locationId = locationId
    pendingReferral.metadata.tierMultiplier = tierMultiplier

    // Complete the referral
    await pendingReferral.complete()

    // Update conversion stats
    await User.findByIdAndUpdate(referrer._id, {
      $inc: { 'referralStats.convertedReferrals': 1 },
    })

    // Check for tier upgrade after conversion
    await updateUserTier(referrer._id)

    // Send notifications
    await createSystemNotification(
      referrer._id,
      'Referral Reward! 🎉',
      `${referredUser.name} joined! You earned ${referrerPoints} points (${tierMultiplier}x tier bonus).`,
      { category: 'referral', priority: 'high' }
    )

    await createSystemNotification(
      referredUser._id,
      'Welcome Bonus! 🎁',
      `You received ${referredPoints} points from ${referrer.name}'s referral.`,
      { category: 'referral', priority: 'high' }
    )

    return {
      success: true,
      message: 'Referral rewards processed',
      data: { referrerPoints, referredPoints },
    }
  } catch (error) {
    console.error('Error processing referral rewards:', error)
    return { success: false, message: 'Failed to process rewards' }
  }
}

// Get user's referral stats
export const getUserReferralStats = async (req, res, next) => {
  try {
    const userId = req.user.id
    const user = await User.findById(userId).populate(
      'referredBy',
      'name email'
    )

    if (!user) {
      return next(createError(404, 'User not found'))
    }

    const config = await ReferralConfig.getActiveConfig()

    // Get referrals
    const referralsMade = await Referral.find({ referrer: userId })
      .populate('referred', 'name email createdAt selectedLocation')
      .sort({ createdAt: -1 })

    const referralsReceived = await Referral.find({
      referred: userId,
    }).populate('referrer', 'name email')

    // Calculate tier info
    const currentTier = user.referralStats?.currentTier || 'bronze'
    const tierMultiplier = config.tierMultipliers[currentTier] || 1.0
    const totalReferrals = user.referralStats?.totalReferrals || 0

    // Calculate next tier progress
    let tierThresholds = { gold: 5, platinum: 10 }
    let nextTierProgress = null

    if (currentTier === 'bronze' && totalReferrals < 5) {
      nextTierProgress = {
        nextTier: 'Gold',
        referralsNeeded: 5 - totalReferrals,
        progress: (totalReferrals / 5) * 100,
        isMaxTier: false,
      }
    } else if (currentTier === 'gold' && totalReferrals < 10) {
      nextTierProgress = {
        nextTier: 'Platinum',
        referralsNeeded: 10 - totalReferrals,
        progress: ((totalReferrals - 5) / 5) * 100,
        isMaxTier: false,
      }
    } else if (currentTier === 'platinum') {
      nextTierProgress = {
        nextTier: 'Max Tier',
        referralsNeeded: 0,
        progress: 100,
        isMaxTier: true,
      }
    }

    const stats = {
      referralCode: user.referralCode,
      totalReferrals: totalReferrals,
      activeReferrals: user.referralStats?.activeReferrals || 0,
      convertedReferrals: user.referralStats?.convertedReferrals || 0,
      currentTier: currentTier,
      tierMultiplier: tierMultiplier,
      totalEarnings: user.referralEarnings || 0,
      referredBy: user.referredBy,
      tierThresholds: tierThresholds,
      nextTierProgress: nextTierProgress,

      referralBreakdown: {
        pending: referralsMade.filter((r) => r.status === 'pending').length,
        completed: referralsMade.filter((r) => r.status === 'completed').length,
        expired: referralsMade.filter((r) => r.status === 'expired').length,
      },

      recentReferrals: referralsMade.slice(0, 10),
      receivedReferrals: referralsReceived,
    }

    res.status(200).json({
      status: 'success',
      data: { stats },
    })
  } catch (error) {
    console.error('Error getting referral stats:', error)
    next(createError(500, 'Failed to get referral statistics'))
  }
}

// Get all referrals (admin/team)
export const getAllReferrals = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      rewardType,
      startDate,
      endDate,
    } = req.query
    const query = {}

    // Role-based filtering
    if (req.user.role === 'team') {
      const userLocation = req.user.spaLocation
      if (!userLocation?.locationId) {
        return next(createError(400, 'Spa location not configured'))
      }

      const usersInSpa = await User.find({
        'selectedLocation.locationId': userLocation.locationId,
      }).select('_id')

      query.referred = { $in: usersInSpa.map((u) => u._id) }
    } else if (req.user.role !== 'admin') {
      return next(createError(403, 'Access denied'))
    }

    // Apply filters
    if (status) query.status = status
    if (rewardType) query.rewardType = rewardType
    if (startDate || endDate) {
      query.createdAt = {}
      if (startDate) query.createdAt.$gte = new Date(startDate)
      if (endDate) query.createdAt.$lte = new Date(endDate)
    }

    const referrals = await Referral.find(query)
      .populate('referrer', 'name email referralCode referralStats')
      .populate('referred', 'name email createdAt selectedLocation')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const totalReferrals = await Referral.countDocuments(query)

    const stats = await Referral.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRewards: {
            $sum: {
              $add: ['$referrerReward.points', '$referredReward.points'],
            },
          },
        },
      },
    ])

    res.status(200).json({
      status: 'success',
      data: {
        referrals,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalReferrals / limit),
          totalItems: totalReferrals,
          itemsPerPage: parseInt(limit),
        },
        stats,
      },
    })
  } catch (error) {
    console.error('Error getting all referrals:', error)
    next(createError(500, 'Failed to get referrals'))
  }
}

// Complete referral manually
export const completeReferral = async (req, res, next) => {
  try {
    const { referralId } = req.params
    const { notes } = req.body

    const referral = await Referral.findById(referralId)
      .populate('referrer', 'name email referralStats')
      .populate('referred', 'name email selectedLocation')

    if (!referral) {
      return next(createError(404, 'Referral not found'))
    }

    // Permission check
    if (req.user.role === 'team') {
      const userLocation = req.user.spaLocation
      if (
        referral.referred.selectedLocation?.locationId !==
        userLocation?.locationId
      ) {
        return next(
          createError(403, 'You can only manage referrals for your spa')
        )
      }
    } else if (req.user.role !== 'admin') {
      return next(createError(403, 'Access denied'))
    }

    if (referral.status === 'completed') {
      return next(createError(400, 'Referral already completed'))
    }

    // Calculate rewards if not set
    if (!referral.referrerReward.points || !referral.referredReward.points) {
      const config = await ReferralConfig.getActiveConfig()
      const locationId =
        referral.referred.selectedLocation?.locationId || 'global'
      const spaConfig = config.getSpaConfig(locationId)
      const tierMultiplier =
        config.tierMultipliers[
          referral.referrer.referralStats?.currentTier || 'bronze'
        ] || 1.0

      referral.referrerReward.points = Math.round(
        spaConfig.signupReward.referrerPoints * tierMultiplier
      )
      referral.referredReward.points = Math.round(
        spaConfig.signupReward.referredPoints * tierMultiplier
      )
    }

    if (notes) referral.metadata.notes = notes

    // Complete the referral
    await referral.complete()

    // Update stats and check tier
    await User.findByIdAndUpdate(referral.referrer._id, {
      $inc: { 'referralStats.convertedReferrals': 1 },
    })

    await updateUserTier(referral.referrer._id)

    // Send notification
    await createSystemNotification(
      referral.referrer._id,
      'Referral Approved!',
      `Your referral for ${referral.referred.name} has been approved! You earned ${referral.referrerReward.points} points.`,
      { category: 'referral', priority: 'high' }
    )

    res.status(200).json({
      status: 'success',
      message: 'Referral completed successfully',
      data: { referral },
    })
  } catch (error) {
    console.error('Error completing referral:', error)
    next(createError(500, 'Failed to complete referral'))
  }
}

// Award milestone reward
export const awardMilestoneReward = async (req, res, next) => {
  try {
    const { userId, milestone, purchaseAmount = 0 } = req.body

    if (!['admin', 'team'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    const referredUser = await User.findById(userId).populate('referredBy')
    if (!referredUser || !referredUser.referredBy) {
      return res.status(200).json({
        status: 'success',
        message: 'User was not referred',
      })
    }

    const referrer = referredUser.referredBy
    const config = await ReferralConfig.getActiveConfig()
    const locationId = referredUser.selectedLocation?.locationId || 'global'
    const spaConfig = config.getSpaConfig(locationId)

    // Find milestone configuration
    const milestoneConfig = spaConfig.milestoneRewards?.find(
      (m) => m.milestone === milestone
    )
    if (!milestoneConfig || !milestoneConfig.enabled) {
      return next(createError(400, 'Invalid or disabled milestone'))
    }

    // Check if already exists
    const existing = await Referral.findOne({
      referrer: referrer._id,
      referred: userId,
      rewardType: milestone,
    })

    if (existing) {
      return next(createError(400, 'Milestone already awarded'))
    }

    // Calculate with tier multiplier
    const tierMultiplier =
      config.tierMultipliers[referrer.referralStats?.currentTier || 'bronze'] ||
      1.0
    const referrerPoints = Math.round(
      milestoneConfig.referrerPoints * tierMultiplier
    )
    const referredPoints = Math.round(
      milestoneConfig.referredPoints * tierMultiplier
    )

    // Create milestone referral
    const milestoneReferral = await Referral.create({
      referrer: referrer._id,
      referred: userId,
      referralCode: referrer.referralCode,
      rewardType: milestone,
      referrerReward: { points: referrerPoints, awarded: false },
      referredReward: { points: referredPoints, awarded: false },
      metadata: { milestone, purchaseAmount, locationId },
    })

    await milestoneReferral.complete()

    // Send notifications
    await createSystemNotification(
      referrer._id,
      'Milestone Reward!',
      `${referredUser.name} reached "${milestone}"! You earned ${referrerPoints} points.`,
      { category: 'referral', priority: 'high' }
    )

    res.status(200).json({
      status: 'success',
      message: 'Milestone awarded successfully',
      data: { milestoneReferral },
    })
  } catch (error) {
    console.error('Error awarding milestone:', error)
    next(createError(500, 'Failed to award milestone'))
  }
}

// Get referral leaderboard
export const getReferralLeaderboard = async (req, res, next) => {
  try {
    const { period = 'all', limit = 10 } = req.query
    let dateFilter = {}

    if (period !== 'all') {
      const now = new Date()
      const periodDays = { week: 7, month: 30, year: 365 }
      if (periodDays[period]) {
        dateFilter = {
          $gte: new Date(now - periodDays[period] * 24 * 60 * 60 * 1000),
        }
      }
    }

    const matchCondition = { status: 'completed' }
    if (Object.keys(dateFilter).length > 0) {
      matchCondition.completedAt = dateFilter
    }

    // Spa owner filtering
    if (req.user.role === 'team' && req.user.spaLocation?.locationId) {
      const spaUsers = await User.find({
        'selectedLocation.locationId': req.user.spaLocation.locationId,
      }).select('_id')
      matchCondition.referred = { $in: spaUsers.map((u) => u._id) }
    }

    const leaderboard = await Referral.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: '$referrer',
          totalReferrals: { $sum: 1 },
          totalPointsEarned: { $sum: '$referrerReward.points' },
          lastReferralDate: { $max: '$completedAt' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          name: '$user.name',
          email: '$user.email',
          referralCode: '$user.referralCode',
          currentTier: '$user.referralStats.currentTier',
          totalReferrals: 1,
          totalPointsEarned: 1,
          lastReferralDate: 1,
        },
      },
      { $sort: { totalReferrals: -1, totalPointsEarned: -1 } },
      { $limit: parseInt(limit) },
    ])

    res.status(200).json({
      status: 'success',
      data: { leaderboard, period, generatedAt: new Date() },
    })
  } catch (error) {
    console.error('Error getting leaderboard:', error)
    next(createError(500, 'Failed to get leaderboard'))
  }
}

// Get/Update referral configuration
export const getReferralConfig = async (req, res, next) => {
  try {
    const config = await ReferralConfig.getActiveConfig()

    if (req.user.role === 'team') {
      const spaConfig = config.getSpaConfig(req.user.spaLocation?.locationId)
      res.status(200).json({
        status: 'success',
        data: { config: spaConfig },
      })
    } else if (req.user.role === 'admin') {
      res.status(200).json({
        status: 'success',
        data: { config },
      })
    } else {
      return next(createError(403, 'Access denied'))
    }
  } catch (error) {
    console.error('Error getting config:', error)
    next(createError(500, 'Failed to get configuration'))
  }
}

export const updateReferralConfig = async (req, res, next) => {
  try {
    const config = await ReferralConfig.getActiveConfig()

    if (req.user.role === 'team') {
      const userLocation = req.user.spaLocation
      if (!userLocation?.locationId) {
        return next(createError(400, 'Spa location not configured'))
      }

      const spaConfig = config.setSpaConfig(
        userLocation.locationId,
        userLocation.locationName,
        req.user._id,
        req.body
      )

      config.lastUpdatedBy = req.user._id
      await config.save()

      res.status(200).json({
        status: 'success',
        message: 'Spa configuration updated',
        data: { config: spaConfig },
      })
    } else if (req.user.role === 'admin') {
      Object.keys(req.body).forEach((key) => {
        if (!['_id', 'createdAt', 'updatedAt'].includes(key)) {
          config[key] = req.body[key]
        }
      })

      config.lastUpdatedBy = req.user._id
      await config.save()

      res.status(200).json({
        status: 'success',
        message: 'Configuration updated',
        data: { config },
      })
    } else {
      return next(createError(403, 'Access denied'))
    }
  } catch (error) {
    console.error('Error updating config:', error)
    next(createError(500, 'Failed to update configuration'))
  }
}

// Get spa-specific referral stats (team role)
export const getSpaReferralStats = async (req, res, next) => {
  try {
    if (req.user.role !== 'team') {
      return next(createError(403, 'Spa owner access required'))
    }

    const userLocation = req.user.spaLocation
    if (!userLocation?.locationId) {
      return next(createError(400, 'Spa location not configured'))
    }

    const spaUsers = await User.find({
      'selectedLocation.locationId': userLocation.locationId,
    }).select('_id name email')

    const spaUserIds = spaUsers.map((u) => u._id)

    const spaReferrals = await Referral.find({
      referred: { $in: spaUserIds },
    })
      .populate('referrer', 'name email')
      .populate('referred', 'name email')

    const stats = {
      totalUsers: spaUsers.length,
      totalReferrals: spaReferrals.length,
      pendingReferrals: spaReferrals.filter((r) => r.status === 'pending')
        .length,
      completedReferrals: spaReferrals.filter((r) => r.status === 'completed')
        .length,
      totalPointsAwarded: spaReferrals.reduce((sum, r) => {
        return (
          sum +
          (r.referrerReward.awarded ? r.referrerReward.points : 0) +
          (r.referredReward.awarded ? r.referredReward.points : 0)
        )
      }, 0),
      recentReferrals: spaReferrals.slice(0, 10),
    }

    res.status(200).json({
      status: 'success',
      data: { stats, location: userLocation },
    })
  } catch (error) {
    console.error('Error getting spa stats:', error)
    next(createError(500, 'Failed to get spa statistics'))
  }
}
