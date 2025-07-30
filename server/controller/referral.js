// File: server/controller/referral.js
import { createError } from '../error.js'
import Referral from '../models/Referral.js'
import ReferralConfig from '../models/ReferralConfig.js'
import User from '../models/User.js'
import { createSystemNotification } from './notification.js'

// Helper function to process referral - used in auth.js
export const processReferral = async (referredUserId, referralCode) => {
  try {
    // Find the referrer by referral code
    const referrer = await User.findOne({
      referralCode: referralCode.toUpperCase(),
      isDeleted: false,
    })

    if (!referrer) {
      return {
        success: false,
        message: 'Invalid referral code',
      }
    }

    // Get referred user
    const referredUser = await User.findById(referredUserId)
    if (!referredUser) {
      return {
        success: false,
        message: 'Referred user not found',
      }
    }

    // Check if user is trying to refer themselves
    if (referrer._id.toString() === referredUserId.toString()) {
      return {
        success: false,
        message: 'Cannot refer yourself',
      }
    }

    // Check if user was already referred
    if (referredUser.referredBy) {
      return {
        success: false,
        message: 'User was already referred by someone else',
      }
    }

    // Check if referral already exists
    const existingReferral = await Referral.findOne({
      referrer: referrer._id,
      referred: referredUserId,
    })

    if (existingReferral) {
      return {
        success: false,
        message: 'Referral already exists',
      }
    }

    // Get active referral config
    const config = await ReferralConfig.getActiveConfig()

    // Calculate reward points
    const rewardCalculation = config.calculateReward(
      'signup',
      referrer.referralStats?.currentTier || 'bronze',
      referredUser.selectedLocation?.locationId
    )

    // Create referral record
    const referral = await Referral.create({
      referrer: referrer._id,
      referred: referredUserId,
      referralCode: referralCode.toUpperCase(),
      rewardType: 'signup',
      referrerReward: {
        points: rewardCalculation.referrerPoints,
        awarded: false,
      },
      referredReward: {
        points: rewardCalculation.referredPoints,
        awarded: false,
      },
    })

    // Update referred user
    referredUser.referredBy = referrer._id
    await referredUser.save()

    // Update referrer stats
    referrer.referralStats.totalReferrals += 1
    referrer.referralStats.activeReferrals += 1
    await referrer.save()

    // Complete the referral immediately for signup rewards (if auto-approve is enabled)
    if (config.settings.autoApprove) {
      await referral.complete()

      // Send notifications
      await createSystemNotification(
        referrer._id,
        'Referral Reward!',
        `You earned ${rewardCalculation.referrerPoints} points for referring ${referredUser.name}!`,
        {
          category: 'referral',
          priority: 'high',
          metadata: {
            type: 'referrer_reward',
            points: rewardCalculation.referrerPoints,
            referredUserName: referredUser.name,
          },
        }
      )

      await createSystemNotification(
        referredUserId,
        'Welcome Bonus!',
        `You received ${rewardCalculation.referredPoints} points for joining through ${referrer.name}'s referral!`,
        {
          category: 'referral',
          priority: 'high',
          metadata: {
            type: 'referred_reward',
            points: rewardCalculation.referredPoints,
            referrerName: referrer.name,
          },
        }
      )
    }

    return {
      success: true,
      message: 'Referral processed successfully',
      data: {
        referral,
        rewardAmount: rewardCalculation.referredPoints,
        referrerReward: rewardCalculation.referrerPoints,
      },
    }
  } catch (error) {
    console.error('Error processing referral:', error)
    return {
      success: false,
      message: 'Failed to process referral',
    }
  }
}

// Get user's referral stats and history
export const getUserReferralStats = async (req, res, next) => {
  try {
    const userId = req.user.id

    // Get user with referral stats
    const user = await User.findById(userId).populate(
      'referredBy',
      'name email'
    )

    // Get referrals made by this user
    const referralsMade = await Referral.find({ referrer: userId })
      .populate('referred', 'name email createdAt')
      .sort({ createdAt: -1 })

    // Get referrals where this user was referred
    const referralsReceived = await Referral.find({ referred: userId })
      .populate('referrer', 'name email')
      .sort({ createdAt: -1 })

    // Calculate stats
    const stats = {
      referralCode: user.referralCode,
      totalReferrals: user.referralStats.totalReferrals,
      activeReferrals: user.referralStats.activeReferrals,
      convertedReferrals: user.referralStats.convertedReferrals,
      currentTier: user.referralStats.currentTier,
      totalEarnings: user.referralEarnings,
      referredBy: user.referredBy,

      // Detailed breakdown
      referralBreakdown: {
        pending: referralsMade.filter((r) => r.status === 'pending').length,
        completed: referralsMade.filter((r) => r.status === 'completed').length,
        expired: referralsMade.filter((r) => r.status === 'expired').length,
      },

      // Recent activity
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

// Get all referrals for admin
export const getAllReferrals = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return next(createError(403, 'Access denied. Admin rights required.'))
    }

    const {
      page = 1,
      limit = 20,
      status,
      rewardType,
      startDate,
      endDate,
    } = req.query

    // Build query
    const query = {}
    if (status) query.status = status
    if (rewardType) query.rewardType = rewardType
    if (startDate || endDate) {
      query.createdAt = {}
      if (startDate) query.createdAt.$gte = new Date(startDate)
      if (endDate) query.createdAt.$lte = new Date(endDate)
    }

    // Get referrals with pagination
    const referrals = await Referral.find(query)
      .populate('referrer', 'name email referralCode')
      .populate('referred', 'name email createdAt')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const totalReferrals = await Referral.countDocuments(query)

    // Get summary stats
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

// Complete referral manually (admin)
export const completeReferral = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return next(createError(403, 'Access denied. Admin rights required.'))
    }

    const { referralId } = req.params
    const { notes } = req.body

    const referral = await Referral.findById(referralId)
      .populate('referrer', 'name email')
      .populate('referred', 'name email')

    if (!referral) {
      return next(createError(404, 'Referral not found'))
    }

    if (referral.status === 'completed') {
      return next(createError(400, 'Referral already completed'))
    }

    // Add notes if provided
    if (notes) {
      referral.metadata.notes = notes
    }

    // Complete the referral
    await referral.complete()

    // Send notifications
    await createSystemNotification(
      referral.referrer._id,
      'Referral Approved!',
      `Your referral for ${referral.referred.name} has been approved! You earned ${referral.referrerReward.points} points.`,
      {
        category: 'referral',
        priority: 'high',
        metadata: {
          type: 'manual_approval',
          referralId: referral._id,
          points: referral.referrerReward.points,
        },
      }
    )

    res.status(200).json({
      status: 'success',
      message: 'Referral completed successfully',
      data: { referral },
    })
  } catch (error) {
    console.error('Error completing referral:', error)
    next(createError(500, error.message || 'Failed to complete referral'))
  }
}

// Award milestone reward
export const awardMilestoneReward = async (req, res, next) => {
  try {
    const { userId, milestone, purchaseAmount = 0 } = req.body

    // Find if user was referred
    const referredUser = await User.findById(userId).populate('referredBy')
    if (!referredUser || !referredUser.referredBy) {
      return res.status(200).json({
        status: 'success',
        message: 'User was not referred, no milestone reward to award',
      })
    }

    const referrer = referredUser.referredBy

    // Get active config
    const config = await ReferralConfig.getActiveConfig()

    // Calculate milestone reward
    const rewardCalculation = config.calculateReward(
      milestone,
      referrer.referralStats?.currentTier || 'bronze',
      referredUser.selectedLocation?.locationId,
      purchaseAmount
    )

    if (
      rewardCalculation.referrerPoints === 0 &&
      rewardCalculation.referredPoints === 0
    ) {
      return res.status(200).json({
        status: 'success',
        message: 'No reward configured for this milestone',
      })
    }

    // Check if milestone reward already exists
    const existingMilestone = await Referral.findOne({
      referrer: referrer._id,
      referred: userId,
      rewardType: milestone,
    })

    if (existingMilestone) {
      return next(createError(400, 'Milestone reward already awarded'))
    }

    // Create milestone referral record
    const milestoneReferral = await Referral.create({
      referrer: referrer._id,
      referred: userId,
      referralCode: referrer.referralCode,
      rewardType: milestone,
      referrerReward: {
        points: rewardCalculation.referrerPoints,
        awarded: false,
      },
      referredReward: {
        points: rewardCalculation.referredPoints,
        awarded: false,
      },
      metadata: {
        milestone,
        purchaseAmount,
      },
    })

    // Complete immediately
    await milestoneReferral.complete()

    // Send notifications
    if (rewardCalculation.referrerPoints > 0) {
      await createSystemNotification(
        referrer._id,
        'Milestone Reward!',
        `${referredUser.name} reached the "${milestone}" milestone! You earned ${rewardCalculation.referrerPoints} points.`,
        {
          category: 'referral',
          priority: 'high',
          metadata: {
            type: 'milestone_reward',
            milestone,
            points: rewardCalculation.referrerPoints,
            referredUserName: referredUser.name,
          },
        }
      )
    }

    if (rewardCalculation.referredPoints > 0) {
      await createSystemNotification(
        userId,
        'Milestone Bonus!',
        `Congratulations on reaching "${milestone}"! You earned ${rewardCalculation.referredPoints} bonus points.`,
        {
          category: 'referral',
          priority: 'high',
          metadata: {
            type: 'milestone_bonus',
            milestone,
            points: rewardCalculation.referredPoints,
          },
        }
      )
    }

    res.status(200).json({
      status: 'success',
      message: 'Milestone reward awarded successfully',
      data: {
        milestoneReferral,
        rewardCalculation,
      },
    })
  } catch (error) {
    console.error('Error awarding milestone reward:', error)
    next(createError(500, 'Failed to award milestone reward'))
  }
}

// Get referral leaderboard
export const getReferralLeaderboard = async (req, res, next) => {
  try {
    const { period = 'all', limit = 10 } = req.query

    // Build date filter
    let dateFilter = {}
    if (period !== 'all') {
      const now = new Date()
      switch (period) {
        case 'week':
          dateFilter = { $gte: new Date(now.setDate(now.getDate() - 7)) }
          break
        case 'month':
          dateFilter = { $gte: new Date(now.setMonth(now.getMonth() - 1)) }
          break
        case 'year':
          dateFilter = {
            $gte: new Date(now.setFullYear(now.getFullYear() - 1)),
          }
          break
      }
    }

    const matchCondition = { status: 'completed' }
    if (Object.keys(dateFilter).length > 0) {
      matchCondition.completedAt = dateFilter
    }

    // Get top referrers
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
      data: {
        leaderboard,
        period,
        generatedAt: new Date(),
      },
    })
  } catch (error) {
    console.error('Error getting referral leaderboard:', error)
    next(createError(500, 'Failed to get leaderboard'))
  }
}

// Admin: Get referral configuration
export const getReferralConfig = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return next(createError(403, 'Access denied. Admin rights required.'))
    }

    const config = await ReferralConfig.getActiveConfig()

    res.status(200).json({
      status: 'success',
      data: { config },
    })
  } catch (error) {
    console.error('Error getting referral config:', error)
    next(createError(500, 'Failed to get referral configuration'))
  }
}

// Admin: Update referral configuration
export const updateReferralConfig = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return next(createError(403, 'Access denied. Admin rights required.'))
    }

    const config = await ReferralConfig.getActiveConfig()

    // Update fields
    Object.keys(req.body).forEach((key) => {
      if (key !== '_id' && key !== 'createdAt' && key !== 'updatedAt') {
        config[key] = req.body[key]
      }
    })

    config.lastUpdatedBy = req.user._id
    await config.save()

    res.status(200).json({
      status: 'success',
      message: 'Referral configuration updated successfully',
      data: { config },
    })
  } catch (error) {
    console.error('Error updating referral config:', error)
    next(createError(500, 'Failed to update referral configuration'))
  }
}
