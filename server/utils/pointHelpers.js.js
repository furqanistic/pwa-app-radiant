// File: server/utils/pointHelpers.js
import PointTransaction from '../models/PointTransaction.js'
import User from '../models/User.js'

// Spend points from user account
export const spendPoints = async (
  userId,
  amount,
  reason,
  type = 'spent',
  referenceId = null,
  locationId = null
) => {
  try {
    console.log('💳 Spending points:', { userId, amount, reason, type })

    // Get user's current points
    const user = await User.findById(userId)
    if (!user) {
      return { success: false, error: 'User not found' }
    }

    const currentBalance = user.points || 0

    // Check if user has enough points
    if (currentBalance < amount) {
      return {
        success: false,
        error: `Insufficient points. Current: ${currentBalance}, Required: ${amount}`,
      }
    }

    // Calculate new balance
    const newBalance = currentBalance - amount

    // Update user's points
    await User.findByIdAndUpdate(userId, { points: newBalance })

    // Create transaction record
    const transaction = await PointTransaction.create({
      user: userId,
      type: type,
      points: -amount, // Negative for spending
      balance: newBalance,
      description: reason,
      reference: referenceId,
      referenceModel: 'UserReward',
      locationId: locationId,
      metadata: {
        previousBalance: currentBalance,
        amountSpent: amount,
        transactionType: 'debit',
      },
    })

    console.log('✅ Points spent successfully:', {
      userId,
      amountSpent: amount,
      previousBalance: currentBalance,
      newBalance,
    })

    return {
      success: true,
      newBalance,
      previousBalance: currentBalance,
      amountSpent: amount,
      transaction,
    }
  } catch (error) {
    console.error('❌ Error spending points:', error)
    return { success: false, error: error.message }
  }
}

// Add points to user account
export const addPoints = async (
  userId,
  amount,
  reason,
  type = 'earned',
  referenceId = null,
  locationId = null
) => {
  try {
    console.log('💰 Adding points:', { userId, amount, reason, type })

    // Get user's current points
    const user = await User.findById(userId)
    if (!user) {
      return { success: false, error: 'User not found' }
    }

    const currentBalance = user.points || 0
    const newBalance = currentBalance + amount

    // Update user's points
    await User.findByIdAndUpdate(userId, { points: newBalance })

    // Create transaction record
    const transaction = await PointTransaction.create({
      user: userId,
      type: type,
      points: amount, // Positive for earning
      balance: newBalance,
      description: reason,
      reference: referenceId,
      referenceModel: 'UserReward',
      locationId: locationId,
      metadata: {
        previousBalance: currentBalance,
        amountEarned: amount,
        transactionType: 'credit',
      },
    })

    console.log('✅ Points added successfully:', {
      userId,
      amountEarned: amount,
      previousBalance: currentBalance,
      newBalance,
    })

    return {
      success: true,
      newBalance,
      previousBalance: currentBalance,
      amountEarned: amount,
      transaction,
    }
  } catch (error) {
    console.error('❌ Error adding points:', error)
    return { success: false, error: error.message }
  }
}

// Refund points to user account
export const refundPoints = async (
  userId,
  amount,
  reason,
  referenceId = null,
  locationId = null
) => {
  try {
    console.log('🔄 Refunding points:', { userId, amount, reason })
    return await addPoints(
      userId,
      amount,
      reason,
      'refund',
      referenceId,
      locationId
    )
  } catch (error) {
    console.error('❌ Error refunding points:', error)
    return { success: false, error: error.message }
  }
}

// Set user points to specific amount (admin function)
export const setUserPoints = async (
  userId,
  amount,
  reason,
  adminId = null,
  locationId = null
) => {
  try {
    console.log('⚙️ Setting user points:', { userId, amount, reason })

    // Get user's current points
    const user = await User.findById(userId)
    if (!user) {
      return { success: false, error: 'User not found' }
    }

    const currentBalance = user.points || 0
    const difference = amount - currentBalance

    // Update user's points
    await User.findByIdAndUpdate(userId, { points: amount })

    // Create transaction record
    const transaction = await PointTransaction.create({
      user: userId,
      type: 'adjustment',
      points: difference,
      balance: amount,
      description: reason,
      processedBy: adminId,
      locationId: locationId,
      metadata: {
        previousBalance: currentBalance,
        newBalance: amount,
        adjustment: difference,
        transactionType: difference >= 0 ? 'credit' : 'debit',
      },
    })

    console.log('✅ User points set successfully:', {
      userId,
      previousBalance: currentBalance,
      newBalance: amount,
      adjustment: difference,
    })

    return {
      success: true,
      newBalance: amount,
      previousBalance: currentBalance,
      adjustment: difference,
      transaction,
    }
  } catch (error) {
    console.error('❌ Error setting user points:', error)
    return { success: false, error: error.message }
  }
}

// Get user's point balance
export const getUserPointBalance = async (userId) => {
  try {
    const user = await User.findById(userId).select('points')
    if (!user) {
      return { success: false, error: 'User not found' }
    }

    return {
      success: true,
      balance: user.points || 0,
    }
  } catch (error) {
    console.error('❌ Error getting user point balance:', error)
    return { success: false, error: error.message }
  }
}
