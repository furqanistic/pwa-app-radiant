// server/controller/referral.js
import { createError } from '../error.js'
import Referral from '../models/Referral.js'
import User from '../models/User.js'
import { createSystemNotification } from './notification.js'

// Referral system configuration
const REFERRAL_REWARDS = {
  bronze: { min: 0, max: 4, reward: 40 },
  gold: { min: 5, max: 9, reward: 60 },
  platinum: { min: 10, max: Infinity, reward: 100 },
}

// Helper functions
const calculateTier = (referralCount) => {
  if (referralCount >= REFERRAL_REWARDS.platinum.min) return 'platinum'
  if (referralCount >= REFERRAL_REWARDS.gold.min) return 'gold'
  return 'bronze'
}

const getRewardAmount = (tier) => {
  return REFERRAL_REWARDS[tier].reward
}

// Get user's referral statistics
export const getReferralStats = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)

    if (!user) {
      return next(createError(404, 'User not found'))
    }

    // Get recent referrals
    const recentReferrals = await Referral.find({ referrer: req.user.id })
      .populate('referee', 'name email createdAt')
      .sort({ createdAt: -1 })
      .limit(10)

    const stats = {
      referralCode: user.referralCode,
      totalReferrals: user.referralStats.totalReferrals,
      activeReferrals: user.referralStats.activeReferrals,
      convertedReferrals: user.referralStats.convertedReferrals,
      totalEarnings: user.referralEarnings,
      currentTier: user.referralStats.currentTier,
      rewardPerReferral: getRewardAmount(user.referralStats.currentTier),
      shareUrl: `${process.env.CLIENT_URL}/signup?ref=${user.referralCode}`,
      recentReferrals,
      tierInfo: {
        current: user.referralStats.currentTier,
        nextTier:
          user.referralStats.currentTier === 'bronze'
            ? 'gold'
            : user.referralStats.currentTier === 'gold'
            ? 'platinum'
            : null,
        referralsToNext:
          user.referralStats.currentTier === 'bronze'
            ? 5 - user.referralStats.totalReferrals
            : user.referralStats.currentTier === 'gold'
            ? 10 - user.referralStats.totalReferrals
            : 0,
      },
    }

    res.status(200).json({
      status: 'success',
      data: { stats },
    })
  } catch (error) {
    next(error)
  }
}

// Validate referral code
export const validateReferralCode = async (req, res, next) => {
  try {
    const { code } = req.params

    const referrer = await User.findOne({ referralCode: code })

    if (!referrer) {
      return res.status(404).json({
        status: 'error',
        message: 'Invalid referral code',
      })
    }

    res.status(200).json({
      status: 'success',
      data: {
        valid: true,
        referrerName: referrer.name,
        referralCode: code,
        currentTier: referrer.referralStats.currentTier,
        rewardAmount: getRewardAmount(referrer.referralStats.currentTier),
      },
    })
  } catch (error) {
    next(error)
  }
}

// Process referral when new user signs up
export const processReferral = async (newUserId, referralCode) => {
  try {
    if (!referralCode)
      return { success: false, message: 'No referral code provided' }

    const referrer = await User.findOne({ referralCode })
    if (!referrer) {
      return { success: false, message: 'Invalid referral code' }
    }

    if (referrer._id.toString() === newUserId.toString()) {
      return { success: false, message: 'Cannot refer yourself' }
    }

    const newUser = await User.findById(newUserId)
    if (!newUser) {
      return { success: false, message: 'New user not found' }
    }

    if (newUser.referredBy) {
      return { success: false, message: 'User already referred by someone' }
    }

    // Check if referral already exists
    const existingReferral = await Referral.findOne({
      referee: newUserId,
      referrer: referrer._id,
    })

    if (existingReferral) {
      return { success: false, message: 'Referral already exists' }
    }

    const currentTier = calculateTier(referrer.referralStats.totalReferrals)
    const rewardAmount = getRewardAmount(currentTier)

    // Create referral record
    const referral = await Referral.create({
      referrer: referrer._id,
      referee: newUserId,
      referralCode,
      status: 'active',
      rewardAmount,
      tier: currentTier,
      metadata: {
        refereeEmail: newUser.email,
        refereeName: newUser.name,
        referrerTierAtTime: currentTier,
      },
    })

    // Update new user
    newUser.referredBy = referrer._id
    await newUser.save()

    // Update referrer stats
    referrer.referralStats.totalReferrals += 1
    referrer.referralStats.activeReferrals += 1

    // Check for tier upgrade
    const newTier = calculateTier(referrer.referralStats.totalReferrals)
    const tierUpgraded = newTier !== currentTier

    referrer.referralStats.currentTier = newTier
    referrer.referralEarnings += rewardAmount
    referrer.points = (referrer.points || 0) + rewardAmount

    await referrer.save()

    // Create notification
    let notificationMessage = `${newUser.name} joined using your referral code! You earned $${rewardAmount}.`
    if (tierUpgraded) {
      notificationMessage += ` 🎉 Congratulations! You've been upgraded to ${newTier.toUpperCase()} tier!`
    }

    await createSystemNotification(
      referrer._id,
      'New Referral Joined! 🎉',
      notificationMessage,
      {
        category: 'referral',
        priority: tierUpgraded ? 'high' : 'normal',
        metadata: {
          referredUser: newUser.name,
          rewardAmount,
          newTier,
          tierUpgraded,
          totalReferrals: referrer.referralStats.totalReferrals,
          referralId: referral._id,
        },
      }
    )

    return {
      success: true,
      message: 'Referral processed successfully',
      data: {
        rewardAmount,
        tierUpgraded,
        newTier,
        referralId: referral._id,
      },
    }
  } catch (error) {
    console.error('Error processing referral:', error)
    return { success: false, message: 'Failed to process referral' }
  }
}

// Get referral history
export const getReferralHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query

    const filter = { referrer: req.user.id }
    if (status) filter.status = status

    const referrals = await Referral.find(filter)
      .populate('referee', 'name email createdAt role')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Referral.countDocuments(filter)

    // Get user's referral info
    const user = await User.findById(req.user.id).populate(
      'referredBy',
      'name email referralCode'
    )

    res.status(200).json({
      status: 'success',
      data: {
        referrals,
        referredBy: user.referredBy,
        totalEarnings: user.referralEarnings,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalReferrals: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

// Update referral status (for admin)
export const updateReferralStatus = async (req, res, next) => {
  try {
    const { referralId } = req.params
    const { status, rewardPaid } = req.body

    if (!['pending', 'active', 'converted'].includes(status)) {
      return next(createError(400, 'Invalid status'))
    }

    const referral = await Referral.findById(referralId)
      .populate('referrer')
      .populate('referee')

    if (!referral) {
      return next(createError(404, 'Referral not found'))
    }

    // Check if user owns this referral or is admin
    if (
      req.user.id !== referral.referrer._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return next(createError(403, 'Access denied'))
    }

    const oldStatus = referral.status
    referral.status = status

    if (rewardPaid !== undefined) {
      referral.rewardPaid = rewardPaid
    }

    if (status === 'converted' && oldStatus !== 'converted') {
      referral.conversionDate = new Date()

      // Update referrer stats
      const referrer = referral.referrer
      referrer.referralStats.activeReferrals -= 1
      referrer.referralStats.convertedReferrals += 1
      await referrer.save()
    }

    await referral.save()

    res.status(200).json({
      status: 'success',
      message: 'Referral status updated successfully',
      data: { referral },
    })
  } catch (error) {
    next(error)
  }
}

// Get all referrals (admin only)
export const getAllReferrals = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return next(createError(403, 'Access denied. Admin rights required.'))
    }

    const { page = 1, limit = 20, status, tier } = req.query

    const filter = {}
    if (status) filter.status = status
    if (tier) filter.tier = tier

    const referrals = await Referral.find(filter)
      .populate('referrer', 'name email referralStats')
      .populate('referee', 'name email createdAt')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Referral.countDocuments(filter)

    // Get summary stats
    const stats = await Referral.aggregate([
      {
        $group: {
          _id: null,
          totalReferrals: { $sum: 1 },
          totalRewards: { $sum: '$rewardAmount' },
          activeReferrals: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
          },
          convertedReferrals: {
            $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] },
          },
        },
      },
    ])

    res.status(200).json({
      status: 'success',
      data: {
        referrals,
        stats: stats[0] || {
          totalReferrals: 0,
          totalRewards: 0,
          activeReferrals: 0,
          convertedReferrals: 0,
        },
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalReferrals: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get referral analytics (admin only)
export const getReferralAnalytics = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return next(createError(403, 'Access denied. Admin rights required.'))
    }

    const { period = '30d' } = req.query

    let dateFilter = {}
    const now = new Date()

    switch (period) {
      case '7d':
        dateFilter = {
          createdAt: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) },
        }
        break
      case '30d':
        dateFilter = {
          createdAt: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) },
        }
        break
      case '90d':
        dateFilter = {
          createdAt: { $gte: new Date(now - 90 * 24 * 60 * 60 * 1000) },
        }
        break
    }

    const analytics = await Referral.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            status: '$status',
          },
          count: { $sum: 1 },
          rewards: { $sum: '$rewardAmount' },
        },
      },
      { $sort: { '_id.date': 1 } },
    ])

    res.status(200).json({
      status: 'success',
      data: { analytics },
    })
  } catch (error) {
    next(error)
  }
}
