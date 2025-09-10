// File: server/controller/userRewards.js - NEW: For managing user rewards in profile
import { createError } from '../error.js'
import PointTransaction from '../models/PointTransaction.js'
import User from '../models/User.js'
import UserReward from '../models/UserReward.js'

// Get user's active rewards (for profile display)
export const getUserRewards = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { status = 'all', type = 'all', page = 1, limit = 20 } = req.query

    // Build filter
    const filter = { userId }

    if (status !== 'all') {
      filter.status = status
    }

    if (type !== 'all') {
      filter['rewardSnapshot.type'] = type
    }

    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const skip = (pageNum - 1) * limitNum

    // Get rewards with pagination
    const [rewards, totalRewards] = await Promise.all([
      UserReward.find(filter)
        .sort({ claimedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      UserReward.countDocuments(filter),
    ])

    // Separate different types of rewards
    const gameRewards = rewards.filter(
      (r) => r.rewardSnapshot.type === 'game_win'
    )
    const otherRewards = rewards.filter(
      (r) => r.rewardSnapshot.type !== 'game_win'
    )

    // Group game rewards by type
    const scratchRewards = gameRewards.filter(
      (r) => r.rewardSnapshot.gameType === 'scratch'
    )
    const spinRewards = gameRewards.filter(
      (r) => r.rewardSnapshot.gameType === 'spin'
    )

    // Calculate stats
    const stats = {
      total: totalRewards,
      active: rewards.filter((r) => r.status === 'active').length,
      used: rewards.filter((r) => r.status === 'used').length,
      expired: rewards.filter((r) => r.status === 'expired').length,
      gameWins: gameRewards.length,
      scratchWins: scratchRewards.length,
      spinWins: spinRewards.length,
      totalPointsEarned: gameRewards
        .filter((r) => r.rewardSnapshot.winningItem?.valueType === 'points')
        .reduce(
          (sum, r) => sum + (parseInt(r.rewardSnapshot.winningItem.value) || 0),
          0
        ),
      activeNonPointRewards: rewards.filter(
        (r) =>
          r.status === 'active' &&
          r.rewardSnapshot.winningItem?.valueType !== 'points'
      ).length,
    }

    res.status(200).json({
      status: 'success',
      data: {
        rewards,
        gameRewards: {
          scratch: scratchRewards,
          spin: spinRewards,
          other: otherRewards,
        },
        stats,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalRewards / limitNum),
          totalRewards,
          hasNext: pageNum < Math.ceil(totalRewards / limitNum),
          hasPrev: pageNum > 1,
          limit: limitNum,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching user rewards:', error)
    next(createError(500, 'Failed to fetch user rewards'))
  }
}

// Get user's point transaction history
export const getUserPointTransactions = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { type = 'all', page = 1, limit = 20 } = req.query

    // Build filter
    const filter = { user: userId }

    if (type !== 'all') {
      filter.type = type
    }

    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const skip = (pageNum - 1) * limitNum

    // Get transactions with pagination
    const [transactions, totalTransactions] = await Promise.all([
      PointTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('reference')
        .lean(),
      PointTransaction.countDocuments(filter),
    ])

    // Calculate stats
    const stats = {
      total: totalTransactions,
      totalEarned: transactions
        .filter((t) => t.points > 0)
        .reduce((sum, t) => sum + t.points, 0),
      totalSpent: Math.abs(
        transactions
          .filter((t) => t.points < 0)
          .reduce((sum, t) => sum + t.points, 0)
      ),
      gameTransactions: transactions.filter((t) =>
        ['spent', 'earned', 'game_play'].includes(t.type)
      ).length,
    }

    res.status(200).json({
      status: 'success',
      data: {
        transactions,
        stats,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalTransactions / limitNum),
          totalTransactions,
          hasNext: pageNum < Math.ceil(totalTransactions / limitNum),
          hasPrev: pageNum > 1,
          limit: limitNum,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching point transactions:', error)
    next(createError(500, 'Failed to fetch point transactions'))
  }
}

// Mark a reward as used (for spa owners when customer redeems)
export const markRewardAsUsed = async (req, res, next) => {
  try {
    const { rewardId } = req.params
    const { notes } = req.body

    // Check permissions - only spa owners or admins can mark rewards as used
    if (!['admin', 'team', 'super-admin'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    const reward = await UserReward.findById(rewardId).populate(
      'userId',
      'name email'
    )

    if (!reward) {
      return next(createError(404, 'Reward not found'))
    }

    // For team users, ensure the reward is from their spa
    if (req.user.role === 'team') {
      if (reward.locationId !== req.user.spaLocation?.locationId) {
        return next(
          createError(403, 'You can only manage rewards from your spa')
        )
      }
    }

    if (reward.status !== 'active') {
      return next(createError(400, 'Reward is not active'))
    }

    // Update reward status
    reward.status = 'used'
    reward.usedAt = new Date()
    reward.usedBy = req.user._id
    if (notes) {
      reward.notes = notes
    }

    await reward.save()

    res.status(200).json({
      status: 'success',
      message: 'Reward marked as used successfully',
      data: { reward },
    })
  } catch (error) {
    console.error('Error marking reward as used:', error)
    next(createError(500, 'Failed to mark reward as used'))
  }
}

// Get rewards that need to be redeemed at spa (for spa owners)
export const getSpaRedemptionQueue = async (req, res, next) => {
  try {
    // Only spa owners and admins can access this
    if (!['admin', 'team', 'super-admin'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    let locationId
    if (req.user.role === 'team') {
      locationId = req.user.spaLocation?.locationId
      if (!locationId) {
        return next(createError(400, 'Your spa location is not configured'))
      }
    } else {
      // Admin can specify location or see all
      locationId = req.query.locationId
    }

    const filter = {
      status: 'active',
      'rewardSnapshot.winningItem.valueType': { $ne: 'points' }, // Exclude point rewards
    }

    if (locationId) {
      filter.locationId = locationId
    }

    const rewardsToRedeem = await UserReward.find(filter)
      .populate('userId', 'name email phone')
      .sort({ claimedAt: -1 })
      .limit(50)

    // Group by reward type
    const grouped = {
      services: rewardsToRedeem.filter(
        (r) => r.rewardSnapshot.winningItem.valueType === 'service'
      ),
      discounts: rewardsToRedeem.filter(
        (r) => r.rewardSnapshot.winningItem.valueType === 'discount'
      ),
      prizes: rewardsToRedeem.filter(
        (r) => r.rewardSnapshot.winningItem.valueType === 'prize'
      ),
      other: rewardsToRedeem.filter(
        (r) =>
          !['service', 'discount', 'prize'].includes(
            r.rewardSnapshot.winningItem.valueType
          )
      ),
    }

    res.status(200).json({
      status: 'success',
      data: {
        rewardsToRedeem,
        grouped,
        stats: {
          total: rewardsToRedeem.length,
          services: grouped.services.length,
          discounts: grouped.discounts.length,
          prizes: grouped.prizes.length,
          other: grouped.other.length,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching spa redemption queue:', error)
    next(createError(500, 'Failed to fetch redemption queue'))
  }
}

// Get user's game statistics for profile
export const getUserGameStats = async (req, res, next) => {
  try {
    const userId = req.user.id

    // Get all game rewards for this user
    const gameRewards = await UserReward.find({
      userId,
      'rewardSnapshot.type': 'game_win',
    }).lean()

    // Get point transactions related to games
    const gameTransactions = await PointTransaction.find({
      user: userId,
      type: { $in: ['spent', 'earned'] },
      'gameMetadata.gameId': { $exists: true },
    }).lean()

    // Calculate comprehensive stats
    const stats = {
      totalGamesPlayed: gameRewards.length,
      scratchGames: gameRewards.filter(
        (r) => r.rewardSnapshot.gameType === 'scratch'
      ).length,
      spinGames: gameRewards.filter((r) => r.rewardSnapshot.gameType === 'spin')
        .length,
      totalPointsEarned: gameTransactions
        .filter((t) => t.type === 'earned')
        .reduce((sum, t) => sum + t.points, 0),
      totalPointsSpent: Math.abs(
        gameTransactions
          .filter((t) => t.type === 'spent')
          .reduce((sum, t) => sum + t.points, 0)
      ),
      activeRewards: gameRewards.filter((r) => r.status === 'active').length,
      redeemedRewards: gameRewards.filter((r) => r.status === 'used').length,
      favoriteGameType: null,
      recentGames: gameRewards.slice(0, 5).map((r) => ({
        gameTitle: r.rewardSnapshot.gameTitle,
        gameType: r.rewardSnapshot.gameType,
        winningItem: r.rewardSnapshot.winningItem,
        playedAt: r.claimedAt,
        status: r.status,
      })),
    }

    // Determine favorite game type
    if (stats.scratchGames > stats.spinGames) {
      stats.favoriteGameType = 'scratch'
    } else if (stats.spinGames > stats.scratchGames) {
      stats.favoriteGameType = 'spin'
    } else {
      stats.favoriteGameType = 'both'
    }

    res.status(200).json({
      status: 'success',
      data: { stats },
    })
  } catch (error) {
    console.error('Error fetching user game stats:', error)
    next(createError(500, 'Failed to fetch game statistics'))
  }
}
