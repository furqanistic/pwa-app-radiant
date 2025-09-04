// File: server/utils/rewardHelpers.js
// server/utils/rewardHelpers.js
import Reward from '../models/Reward.js'
import User from '../models/User.js'
import {
  PointTransaction,
  UserReward,
  awardPoints,
} from '../models/UserReward.js'

/**
 * Helper function to calculate reward value display
 */
export const calculateRewardDisplay = (reward) => {
  switch (reward.type) {
    case 'credit':
    case 'referral':
      return `$${reward.value}`
    case 'discount':
    case 'combo':
      return `${reward.value}%`
    case 'service':
      return 'Free'
    default:
      return `$${reward.value || 0}`
  }
}

/**
 * Helper function to calculate actual discount amount
 */
export const calculateDiscountAmount = (reward, servicePrice) => {
  if (reward.type === 'credit' || reward.type === 'referral') {
    return Math.min(reward.value, servicePrice)
  }

  if (reward.type === 'discount' || reward.type === 'combo') {
    const discountAmount = (servicePrice * reward.value) / 100
    return reward.maxValue
      ? Math.min(discountAmount, reward.maxValue)
      : discountAmount
  }

  return 0
}

/**
 * Helper function to check if reward can be applied to a service
 */
export const canApplyRewardToService = (reward, service) => {
  // Check minimum purchase requirement
  if (reward.minPurchase && service.basePrice < reward.minPurchase) {
    return {
      canApply: false,
      reason: `Minimum purchase of $${reward.minPurchase} required`,
    }
  }

  // Check include/exclude services
  if (reward.includeServices && reward.includeServices.length > 0) {
    const isIncluded = reward.includeServices.some(
      (id) => id.toString() === service._id.toString()
    )
    if (!isIncluded) {
      return {
        canApply: false,
        reason: 'This reward is not applicable to this service',
      }
    }
  }

  if (reward.excludeServices && reward.excludeServices.length > 0) {
    const isExcluded = reward.excludeServices.some(
      (id) => id.toString() === service._id.toString()
    )
    if (isExcluded) {
      return {
        canApply: false,
        reason: 'This reward cannot be used with this service',
      }
    }
  }

  return { canApply: true }
}

/**
 * Helper function to get user's available rewards for a service
 */
export const getUserAvailableRewardsForService = async (userId, serviceId) => {
  try {
    // Get user's active rewards
    const userRewards = await UserReward.getUserActiveRewards(userId)

    // Filter rewards that can be applied to this service
    const applicableRewards = []

    for (const userReward of userRewards) {
      if (userReward.rewardId) {
        const canApply = canApplyRewardToService(userReward.rewardId, {
          _id: serviceId,
        })
        if (canApply.canApply) {
          applicableRewards.push({
            ...userReward.toObject(),
            displayValue: calculateRewardDisplay(userReward.rewardSnapshot),
          })
        }
      }
    }

    return applicableRewards
  } catch (error) {
    console.error('Error getting user available rewards:', error)
    return []
  }
}

/**
 * Helper function to apply reward to a booking
 */
export const applyRewardToBooking = async (
  userRewardId,
  bookingAmount,
  bookingId = null
) => {
  try {
    const userReward = await UserReward.findById(userRewardId).populate(
      'rewardId'
    )

    if (!userReward || !userReward.isValid()) {
      return { success: false, error: 'Invalid or expired reward' }
    }

    const reward = userReward.rewardId
    let discountAmount = 0

    switch (reward.type) {
      case 'credit':
      case 'referral':
        discountAmount = Math.min(reward.value, bookingAmount)
        break
      case 'discount':
      case 'combo':
        discountAmount = (bookingAmount * reward.value) / 100
        if (reward.maxValue) {
          discountAmount = Math.min(discountAmount, reward.maxValue)
        }
        break
      case 'service':
        discountAmount = bookingAmount // Full service value for free services
        break
      default:
        discountAmount = 0
    }

    // Mark reward as used
    await userReward.markAsUsed(discountAmount, bookingId)

    return {
      success: true,
      discountAmount,
      finalAmount: Math.max(0, bookingAmount - discountAmount),
      rewardUsed: {
        name: userReward.rewardSnapshot.name,
        type: userReward.rewardSnapshot.type,
        value: discountAmount,
      },
    }
  } catch (error) {
    console.error('Error applying reward to booking:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Helper function to expire old rewards
 */
export const expireOldRewards = async () => {
  try {
    const result = await UserReward.updateMany(
      {
        status: 'active',
        expiresAt: { $lt: new Date() },
      },
      {
        $set: { status: 'expired' },
      }
    )

    console.log(`Expired ${result.modifiedCount} old rewards`)
    return result.modifiedCount
  } catch (error) {
    console.error('Error expiring old rewards:', error)
    return 0
  }
}

// ===============================================
// POINT EARNING HELPERS
// ===============================================

/**
 * Award points for service booking
 */
export const awardBookingPoints = async (
  userId,
  serviceAmount,
  bookingId,
  locationId = null
) => {
  // Calculate points: 1 point per $10 spent, minimum 5 points
  const pointsEarned = Math.max(5, Math.floor(serviceAmount / 10))

  return await awardPoints(
    userId,
    pointsEarned,
    `Earned points from service booking ($${serviceAmount})`,
    'booking',
    bookingId,
    locationId
  )
}

/**
 * Award points for referral
 */
export const awardReferralPoints = async (
  referrerId,
  referredUserId,
  locationId = null
) => {
  const referralPoints = 100 // Standard referral bonus

  return await awardPoints(
    referrerId,
    referralPoints,
    'Referral bonus - friend signed up',
    'referral',
    referredUserId,
    locationId
  )
}

/**
 * Award points for review
 */
export const awardReviewPoints = async (
  userId,
  reviewId,
  locationId = null
) => {
  const reviewPoints = 25 // Standard review bonus

  return await awardPoints(
    userId,
    reviewPoints,
    'Bonus for leaving a review',
    'review',
    reviewId,
    locationId
  )
}

/**
 * Award signup bonus points
 */
export const awardSignupBonus = async (userId, locationId = null) => {
  const signupBonus = 100 // Welcome bonus

  return await awardPoints(
    userId,
    signupBonus,
    'Welcome bonus for joining',
    'signup_bonus',
    null,
    locationId
  )
}

// ===============================================
// DATABASE SEEDING FUNCTIONS
// ===============================================

/**
 * Seed default rewards
 */
export const seedRewards = async (adminUserId) => {
  try {
    const defaultRewards = [
      {
        name: '$25 Service Credit',
        description:
          'Apply $25 credit towards any service at your next appointment. Cannot be combined with other offers.',
        type: 'credit',
        pointCost: 100,
        value: 25,
        image:
          'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=500&h=300&fit=crop',
        status: 'active',
        limit: 5,
        validDays: 30,
      },
      {
        name: '20% Off Next Service',
        description:
          'Get 20% discount on your next service booking. Valid for services up to $300.',
        type: 'discount',
        pointCost: 150,
        value: 20,
        maxValue: 60, // 20% of $300
        image:
          'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&h=300&fit=crop',
        status: 'active',
        limit: 2,
        validDays: 45,
      },
      {
        name: 'Free Consultation',
        description:
          'Complimentary 30-minute consultation with our expert practitioners to discuss your treatment goals.',
        type: 'service',
        pointCost: 50,
        value: 0,
        image:
          'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=500&h=300&fit=crop',
        status: 'active',
        limit: 1,
        validDays: 60,
      },
      {
        name: '15% Off + Free Add-on',
        description:
          'Get 15% off your service plus a complimentary add-on treatment. Perfect for trying something new!',
        type: 'combo',
        pointCost: 200,
        value: 15,
        maxValue: 75,
        image:
          'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=500&h=300&fit=crop',
        status: 'active',
        limit: 1,
        validDays: 30,
      },
      {
        name: 'Referral Reward',
        description:
          'Earn this reward when you successfully refer a friend who books their first appointment.',
        type: 'referral',
        pointCost: 0, // Earned, not purchased
        value: 50,
        image:
          'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&h=300&fit=crop',
        status: 'active',
        limit: 10,
        validDays: 90,
      },
    ]

    for (const rewardData of defaultRewards) {
      const existingReward = await Reward.findOne({
        name: rewardData.name,
        isDeleted: false,
      })

      if (!existingReward) {
        await Reward.create({
          ...rewardData,
          createdBy: adminUserId,
        })
        console.log(`✅ Created reward: ${rewardData.name}`)
      } else {
        console.log(`ℹ️ Reward already exists: ${rewardData.name}`)
      }
    }

    console.log('✅ Reward seeding completed')
    return true
  } catch (error) {
    console.error('❌ Error seeding rewards:', error)
    return false
  }
}

/**
 * Main seeding function for rewards
 */
export const seedRewardData = async (adminUserId) => {
  console.log('🎁 Starting reward data seeding...')

  try {
    await seedRewards(adminUserId)

    console.log('🎉 Reward data seeding completed successfully!')
    return true
  } catch (error) {
    console.error('💥 Reward data seeding failed:', error)
    return false
  }
}

// ===============================================
// ANALYTICS HELPERS
// ===============================================

/**
 * Get popular rewards based on claim count
 */
export const getPopularRewards = async (locationId = null, limit = 10) => {
  try {
    const filter = {
      status: 'active',
      isDeleted: false,
    }

    if (locationId) {
      filter.$or = [
        { locationId: locationId },
        { locationId: { $exists: false } },
        { locationId: null },
      ]
    }

    const popularRewards = await Reward.find(filter)
      .sort({ redeemCount: -1, pointCost: 1 })
      .limit(limit)
      .lean()

    return popularRewards.map((reward) => ({
      ...reward,
      displayValue: calculateRewardDisplay(reward),
    }))
  } catch (error) {
    console.error('Error getting popular rewards:', error)
    return []
  }
}

/**
 * Get user reward statistics
 */
export const getUserRewardStats = async (userId) => {
  try {
    const [userRewards, pointTransactions] = await Promise.all([
      UserReward.find({ userId }),
      PointTransaction.find({ userId }),
    ])

    const totalClaimed = userRewards.length
    const activeClaimed = userRewards.filter((ur) => ur.isValid()).length
    const usedRewards = userRewards.filter((ur) => ur.status === 'used').length
    const expiredRewards = userRewards.filter(
      (ur) => ur.status === 'expired'
    ).length

    const totalEarned = pointTransactions
      .filter((pt) => pt.amount > 0)
      .reduce((sum, pt) => sum + pt.amount, 0)

    const totalSpent = pointTransactions
      .filter((pt) => pt.amount < 0)
      .reduce((sum, pt) => sum + Math.abs(pt.amount), 0)

    const totalSaved = userRewards
      .filter((ur) => ur.status === 'used')
      .reduce((sum, ur) => sum + (ur.actualValue || 0), 0)

    return {
      rewards: {
        totalClaimed,
        activeClaimed,
        usedRewards,
        expiredRewards,
      },
      points: {
        totalEarned,
        totalSpent,
        currentBalance: totalEarned - totalSpent,
      },
      savings: {
        totalSaved: Math.round(totalSaved * 100) / 100,
      },
    }
  } catch (error) {
    console.error('Error getting user reward stats:', error)
    return null
  }
}

/**
 * Get reward performance analytics
 */
export const getRewardPerformanceAnalytics = async (
  locationId = null,
  days = 30
) => {
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const filter = { isDeleted: false }
    if (locationId) {
      filter.$or = [
        { locationId: locationId },
        { locationId: { $exists: false } },
        { locationId: null },
      ]
    }

    // Get reward claim analytics
    const rewardAnalytics = await UserReward.aggregate([
      {
        $match: {
          claimedAt: { $gte: startDate },
        },
      },
      {
        $lookup: {
          from: 'rewards',
          localField: 'rewardId',
          foreignField: '_id',
          as: 'reward',
        },
      },
      {
        $unwind: '$reward',
      },
      {
        $match: filter,
      },
      {
        $group: {
          _id: {
            rewardId: '$rewardId',
            rewardName: '$reward.name',
            rewardType: '$reward.type',
          },
          claimCount: { $sum: 1 },
          totalPointsSpent: { $sum: '$rewardSnapshot.pointCost' },
          totalValueGiven: { $sum: '$actualValue' },
        },
      },
      {
        $sort: { claimCount: -1 },
      },
      {
        $limit: 10,
      },
    ])

    return rewardAnalytics
  } catch (error) {
    console.error('Error getting reward performance analytics:', error)
    return []
  }
}
// server/utils/rewardHelpers.js
import Reward from '../models/Reward.js'
import User from '../models/User.js'
import {
  PointTransaction,
  UserReward,
  awardPoints,
} from '../models/UserReward.js'

/**
 * Helper function to calculate reward value display
 */
export const calculateRewardDisplay = (reward) => {
  switch (reward.type) {
    case 'credit':
    case 'referral':
      return `$${reward.value}`
    case 'discount':
    case 'combo':
      return `${reward.value}%`
    case 'service':
      return 'Free'
    default:
      return `$${reward.value || 0}`
  }
}

/**
 * Helper function to calculate actual discount amount
 */
export const calculateDiscountAmount = (reward, servicePrice) => {
  if (reward.type === 'credit' || reward.type === 'referral') {
    return Math.min(reward.value, servicePrice)
  }

  if (reward.type === 'discount' || reward.type === 'combo') {
    const discountAmount = (servicePrice * reward.value) / 100
    return reward.maxValue
      ? Math.min(discountAmount, reward.maxValue)
      : discountAmount
  }

  return 0
}

/**
 * Helper function to check if reward can be applied to a service
 */
export const canApplyRewardToService = (reward, service) => {
  // Check minimum purchase requirement
  if (reward.minPurchase && service.basePrice < reward.minPurchase) {
    return {
      canApply: false,
      reason: `Minimum purchase of $${reward.minPurchase} required`,
    }
  }

  // Check include/exclude services
  if (reward.includeServices && reward.includeServices.length > 0) {
    const isIncluded = reward.includeServices.some(
      (id) => id.toString() === service._id.toString()
    )
    if (!isIncluded) {
      return {
        canApply: false,
        reason: 'This reward is not applicable to this service',
      }
    }
  }

  if (reward.excludeServices && reward.excludeServices.length > 0) {
    const isExcluded = reward.excludeServices.some(
      (id) => id.toString() === service._id.toString()
    )
    if (isExcluded) {
      return {
        canApply: false,
        reason: 'This reward cannot be used with this service',
      }
    }
  }

  return { canApply: true }
}

/**
 * Helper function to get user's available rewards for a service
 */
export const getUserAvailableRewardsForService = async (userId, serviceId) => {
  try {
    // Get user's active rewards
    const userRewards = await UserReward.getUserActiveRewards(userId)

    // Filter rewards that can be applied to this service
    const applicableRewards = []

    for (const userReward of userRewards) {
      if (userReward.rewardId) {
        const canApply = canApplyRewardToService(userReward.rewardId, {
          _id: serviceId,
        })
        if (canApply.canApply) {
          applicableRewards.push({
            ...userReward.toObject(),
            displayValue: calculateRewardDisplay(userReward.rewardSnapshot),
          })
        }
      }
    }

    return applicableRewards
  } catch (error) {
    console.error('Error getting user available rewards:', error)
    return []
  }
}

/**
 * Helper function to apply reward to a booking
 */
export const applyRewardToBooking = async (
  userRewardId,
  bookingAmount,
  bookingId = null
) => {
  try {
    const userReward = await UserReward.findById(userRewardId).populate(
      'rewardId'
    )

    if (!userReward || !userReward.isValid()) {
      return { success: false, error: 'Invalid or expired reward' }
    }

    const reward = userReward.rewardId
    let discountAmount = 0

    switch (reward.type) {
      case 'credit':
      case 'referral':
        discountAmount = Math.min(reward.value, bookingAmount)
        break
      case 'discount':
      case 'combo':
        discountAmount = (bookingAmount * reward.value) / 100
        if (reward.maxValue) {
          discountAmount = Math.min(discountAmount, reward.maxValue)
        }
        break
      case 'service':
        discountAmount = bookingAmount // Full service value for free services
        break
      default:
        discountAmount = 0
    }

    // Mark reward as used
    await userReward.markAsUsed(discountAmount, bookingId)

    return {
      success: true,
      discountAmount,
      finalAmount: Math.max(0, bookingAmount - discountAmount),
      rewardUsed: {
        name: userReward.rewardSnapshot.name,
        type: userReward.rewardSnapshot.type,
        value: discountAmount,
      },
    }
  } catch (error) {
    console.error('Error applying reward to booking:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Helper function to expire old rewards
 */
export const expireOldRewards = async () => {
  try {
    const result = await UserReward.updateMany(
      {
        status: 'active',
        expiresAt: { $lt: new Date() },
      },
      {
        $set: { status: 'expired' },
      }
    )

    console.log(`Expired ${result.modifiedCount} old rewards`)
    return result.modifiedCount
  } catch (error) {
    console.error('Error expiring old rewards:', error)
    return 0
  }
}

// ===============================================
// POINT EARNING HELPERS
// ===============================================

/**
 * Award points for service booking
 */
export const awardBookingPoints = async (
  userId,
  serviceAmount,
  bookingId,
  locationId = null
) => {
  // Calculate points: 1 point per $10 spent, minimum 5 points
  const pointsEarned = Math.max(5, Math.floor(serviceAmount / 10))

  return await awardPoints(
    userId,
    pointsEarned,
    `Earned points from service booking ($${serviceAmount})`,
    'booking',
    bookingId,
    locationId
  )
}

/**
 * Award points for referral
 */
export const awardReferralPoints = async (
  referrerId,
  referredUserId,
  locationId = null
) => {
  const referralPoints = 100 // Standard referral bonus

  return await awardPoints(
    referrerId,
    referralPoints,
    'Referral bonus - friend signed up',
    'referral',
    referredUserId,
    locationId
  )
}

/**
 * Award points for review
 */
export const awardReviewPoints = async (
  userId,
  reviewId,
  locationId = null
) => {
  const reviewPoints = 25 // Standard review bonus

  return await awardPoints(
    userId,
    reviewPoints,
    'Bonus for leaving a review',
    'review',
    reviewId,
    locationId
  )
}

/**
 * Award signup bonus points
 */
export const awardSignupBonus = async (userId, locationId = null) => {
  const signupBonus = 100 // Welcome bonus

  return await awardPoints(
    userId,
    signupBonus,
    'Welcome bonus for joining',
    'signup_bonus',
    null,
    locationId
  )
}

// ===============================================
// DATABASE SEEDING FUNCTIONS
// ===============================================

/**
 * Seed default rewards
 */
export const seedRewards = async (adminUserId) => {
  try {
    const defaultRewards = [
      {
        name: '$25 Service Credit',
        description:
          'Apply $25 credit towards any service at your next appointment. Cannot be combined with other offers.',
        type: 'credit',
        pointCost: 100,
        value: 25,
        image:
          'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=500&h=300&fit=crop',
        status: 'active',
        limit: 5,
        validDays: 30,
      },
      {
        name: '20% Off Next Service',
        description:
          'Get 20% discount on your next service booking. Valid for services up to $300.',
        type: 'discount',
        pointCost: 150,
        value: 20,
        maxValue: 60, // 20% of $300
        image:
          'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&h=300&fit=crop',
        status: 'active',
        limit: 2,
        validDays: 45,
      },
      {
        name: 'Free Consultation',
        description:
          'Complimentary 30-minute consultation with our expert practitioners to discuss your treatment goals.',
        type: 'service',
        pointCost: 50,
        value: 0,
        image:
          'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=500&h=300&fit=crop',
        status: 'active',
        limit: 1,
        validDays: 60,
      },
      {
        name: '15% Off + Free Add-on',
        description:
          'Get 15% off your service plus a complimentary add-on treatment. Perfect for trying something new!',
        type: 'combo',
        pointCost: 200,
        value: 15,
        maxValue: 75,
        image:
          'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=500&h=300&fit=crop',
        status: 'active',
        limit: 1,
        validDays: 30,
      },
      {
        name: 'Referral Reward',
        description:
          'Earn this reward when you successfully refer a friend who books their first appointment.',
        type: 'referral',
        pointCost: 0, // Earned, not purchased
        value: 50,
        image:
          'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&h=300&fit=crop',
        status: 'active',
        limit: 10,
        validDays: 90,
      },
    ]

    for (const rewardData of defaultRewards) {
      const existingReward = await Reward.findOne({
        name: rewardData.name,
        isDeleted: false,
      })

      if (!existingReward) {
        await Reward.create({
          ...rewardData,
          createdBy: adminUserId,
        })
        console.log(`✅ Created reward: ${rewardData.name}`)
      } else {
        console.log(`ℹ️ Reward already exists: ${rewardData.name}`)
      }
    }

    console.log('✅ Reward seeding completed')
    return true
  } catch (error) {
    console.error('❌ Error seeding rewards:', error)
    return false
  }
}

/**
 * Main seeding function for rewards
 */
export const seedRewardData = async (adminUserId) => {
  console.log('🎁 Starting reward data seeding...')

  try {
    await seedRewards(adminUserId)

    console.log('🎉 Reward data seeding completed successfully!')
    return true
  } catch (error) {
    console.error('💥 Reward data seeding failed:', error)
    return false
  }
}

// ===============================================
// ANALYTICS HELPERS
// ===============================================

/**
 * Get popular rewards based on claim count
 */
export const getPopularRewards = async (locationId = null, limit = 10) => {
  try {
    const filter = {
      status: 'active',
      isDeleted: false,
    }

    if (locationId) {
      filter.$or = [
        { locationId: locationId },
        { locationId: { $exists: false } },
        { locationId: null },
      ]
    }

    const popularRewards = await Reward.find(filter)
      .sort({ redeemCount: -1, pointCost: 1 })
      .limit(limit)
      .lean()

    return popularRewards.map((reward) => ({
      ...reward,
      displayValue: calculateRewardDisplay(reward),
    }))
  } catch (error) {
    console.error('Error getting popular rewards:', error)
    return []
  }
}

/**
 * Get user reward statistics
 */
export const getUserRewardStats = async (userId) => {
  try {
    const [userRewards, pointTransactions] = await Promise.all([
      UserReward.find({ userId }),
      PointTransaction.find({ userId }),
    ])

    const totalClaimed = userRewards.length
    const activeClaimed = userRewards.filter((ur) => ur.isValid()).length
    const usedRewards = userRewards.filter((ur) => ur.status === 'used').length
    const expiredRewards = userRewards.filter(
      (ur) => ur.status === 'expired'
    ).length

    const totalEarned = pointTransactions
      .filter((pt) => pt.amount > 0)
      .reduce((sum, pt) => sum + pt.amount, 0)

    const totalSpent = pointTransactions
      .filter((pt) => pt.amount < 0)
      .reduce((sum, pt) => sum + Math.abs(pt.amount), 0)

    const totalSaved = userRewards
      .filter((ur) => ur.status === 'used')
      .reduce((sum, ur) => sum + (ur.actualValue || 0), 0)

    return {
      rewards: {
        totalClaimed,
        activeClaimed,
        usedRewards,
        expiredRewards,
      },
      points: {
        totalEarned,
        totalSpent,
        currentBalance: totalEarned - totalSpent,
      },
      savings: {
        totalSaved: Math.round(totalSaved * 100) / 100,
      },
    }
  } catch (error) {
    console.error('Error getting user reward stats:', error)
    return null
  }
}

/**
 * Get reward performance analytics
 */
export const getRewardPerformanceAnalytics = async (
  locationId = null,
  days = 30
) => {
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const filter = { isDeleted: false }
    if (locationId) {
      filter.$or = [
        { locationId: locationId },
        { locationId: { $exists: false } },
        { locationId: null },
      ]
    }

    // Get reward claim analytics
    const rewardAnalytics = await UserReward.aggregate([
      {
        $match: {
          claimedAt: { $gte: startDate },
        },
      },
      {
        $lookup: {
          from: 'rewards',
          localField: 'rewardId',
          foreignField: '_id',
          as: 'reward',
        },
      },
      {
        $unwind: '$reward',
      },
      {
        $match: filter,
      },
      {
        $group: {
          _id: {
            rewardId: '$rewardId',
            rewardName: '$reward.name',
            rewardType: '$reward.type',
          },
          claimCount: { $sum: 1 },
          totalPointsSpent: { $sum: '$rewardSnapshot.pointCost' },
          totalValueGiven: { $sum: '$actualValue' },
        },
      },
      {
        $sort: { claimCount: -1 },
      },
      {
        $limit: 10,
      },
    ])

    return rewardAnalytics
  } catch (error) {
    console.error('Error getting reward performance analytics:', error)
    return []
  }
}
