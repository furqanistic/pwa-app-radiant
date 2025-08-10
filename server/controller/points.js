// File: server/controller/points.js
import mongoose from 'mongoose'
import PointTransaction from '../models/PointTransaction.js'
import User from '../models/User.js'
import Withdrawal from '../models/Withdrawal.js'
import { createError } from '../utils/error.js'
import { createSystemNotification } from './notification.js'

// Get user's points balance and history
export const getUserPointsBalance = async (req, res, next) => {
  try {
    const userId = req.user.id

    const user = await User.findById(userId).select('points referralEarnings')

    if (!user) {
      return next(createError(404, 'User not found'))
    }

    // Get recent transactions
    const recentTransactions = await PointTransaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(20)

    // Get withdrawal history
    const withdrawals = await Withdrawal.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(10)

    // Calculate points value in dollars (100 points = $1)
    const pointsValue = (user.points / 100).toFixed(2)
    const totalEarnedValue = (user.referralEarnings / 100).toFixed(2)
    const totalWithdrawn = withdrawals
      .filter((w) => w.status === 'completed')
      .reduce((sum, w) => sum + w.amount, 0)

    res.status(200).json({
      success: true,
      data: {
        currentPoints: user.points,
        currentValue: pointsValue,
        totalEarned: user.referralEarnings,
        totalEarnedValue,
        totalWithdrawn,
        availableToWithdraw: Math.max(0, user.points - 1000), // Min 1000 points to withdraw
        recentTransactions,
        withdrawals,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Request withdrawal
export const requestWithdrawal = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { points, method, details } = req.body

    // Validate withdrawal amount
    if (!points || points < 1000) {
      return next(createError(400, 'Minimum withdrawal is 1000 points ($10)'))
    }

    const user = await User.findById(userId)
    if (!user) {
      return next(createError(404, 'User not found'))
    }

    if (user.points < points) {
      return next(createError(400, 'Insufficient points balance'))
    }

    // Check for pending withdrawals
    const pendingWithdrawal = await Withdrawal.findOne({
      user: userId,
      status: 'pending',
    })

    if (pendingWithdrawal) {
      return next(createError(400, 'You have a pending withdrawal request'))
    }

    // Create withdrawal request
    const amount = points / 100 // Convert to dollars
    const withdrawal = new Withdrawal({
      user: userId,
      points,
      amount,
      method,
      details,
      status: 'pending',
    })

    await withdrawal.save()

    // Deduct points
    user.points -= points
    await user.save()

    // Create transaction record
    await PointTransaction.create({
      user: userId,
      type: 'withdrawal',
      points: -points,
      description: `Withdrawal request for $${amount}`,
      reference: withdrawal._id,
      referenceModel: 'Withdrawal',
    })

    // Send notification
    await createSystemNotification(
      userId,
      'Withdrawal Request Received',
      `Your withdrawal request for ${points} points ($${amount}) has been received. We'll process it within 3-5 business days.`,
      {
        category: 'withdrawal',
        priority: 'high',
        metadata: {
          withdrawalId: withdrawal._id,
          amount,
          points,
        },
      }
    )

    res.status(200).json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      data: { withdrawal },
    })
  } catch (error) {
    next(error)
  }
}

// Admin: Process withdrawal
export const processWithdrawal = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return next(createError(403, 'Access denied'))
    }

    const { withdrawalId } = req.params
    const { status, notes, transactionId } = req.body

    const withdrawal = await Withdrawal.findById(withdrawalId).populate('user')
    if (!withdrawal) {
      return next(createError(404, 'Withdrawal not found'))
    }

    if (withdrawal.status !== 'pending') {
      return next(createError(400, 'Withdrawal already processed'))
    }

    withdrawal.status = status
    withdrawal.processedAt = new Date()
    withdrawal.processedBy = req.user.id
    if (notes) withdrawal.notes = notes
    if (transactionId) withdrawal.transactionId = transactionId

    // If rejected, refund points
    if (status === 'rejected') {
      const user = await User.findById(withdrawal.user._id)
      user.points += withdrawal.points
      await user.save()

      // Create refund transaction
      await PointTransaction.create({
        user: withdrawal.user._id,
        type: 'refund',
        points: withdrawal.points,
        description: `Withdrawal refund - ${notes || 'Request rejected'}`,
        reference: withdrawal._id,
        referenceModel: 'Withdrawal',
      })
    }

    await withdrawal.save()

    // Send notification to user
    const notificationTitle =
      status === 'completed' ? 'Withdrawal Completed!' : 'Withdrawal Update'

    const notificationMessage =
      status === 'completed'
        ? `Your withdrawal of $${
            withdrawal.amount
          } has been completed! Transaction ID: ${transactionId || 'N/A'}`
        : `Your withdrawal request has been ${status}. ${notes || ''}`

    await createSystemNotification(
      withdrawal.user._id,
      notificationTitle,
      notificationMessage,
      {
        category: 'withdrawal',
        priority: 'high',
        metadata: {
          withdrawalId: withdrawal._id,
          status,
          amount: withdrawal.amount,
        },
      }
    )

    res.status(200).json({
      success: true,
      message: `Withdrawal ${status} successfully`,
      data: { withdrawal },
    })
  } catch (error) {
    next(error)
  }
}

// Get all withdrawals (admin)
export const getAllWithdrawals = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return next(createError(403, 'Access denied'))
    }

    const { status, page = 1, limit = 20 } = req.query
    const query = {}
    if (status) query.status = status

    const withdrawals = await Withdrawal.find(query)
      .populate('user', 'name email')
      .populate('processedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Withdrawal.countDocuments(query)

    res.status(200).json({
      success: true,
      data: {
        withdrawals,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
        },
      },
    })
  } catch (error) {
    next(error)
  }
}
