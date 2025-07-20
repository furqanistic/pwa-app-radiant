// server/controller/spaUsers.js
import { createError } from '../error.js'
import User from '../models/User.js'

// Get users from the same spa as the logged-in user
export const getSpaUsers = async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.user.id)

    if (!currentUser) {
      return next(createError(404, 'User not found'))
    }

    // Check if user has selected a spa
    if (!currentUser.selectedLocation.locationId) {
      return next(createError(400, 'User has not selected a spa'))
    }

    const userLocationId = currentUser.selectedLocation.locationId

    // Find all users with the same locationId (INCLUDING current user for now)
    const allSpaUsers = await User.find({
      'selectedLocation.locationId': userLocationId,
      isDeleted: false,
    })
      .select(
        'name email points selectedLocation ghlContactId createdAt lastLogin referralStats'
      )
      .sort({ createdAt: -1 }) // Most recent first

    // For debugging, let's also check how many users have ANY selected location
    const usersWithLocation = await User.countDocuments({
      'selectedLocation.locationId': { $exists: true, $ne: null },
      isDeleted: false,
    })

    // Include current user for now (remove $ne filter)
    const spaUsers = allSpaUsers

    // Get stats
    const stats = {
      totalUsers: spaUsers.length,
      activeUsers: spaUsers.filter((user) => {
        const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        return user.lastLogin && user.lastLogin >= lastWeek
      }).length,
      newUsers: spaUsers.filter((user) => {
        const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        return user.createdAt >= lastMonth
      }).length,
    }

    res.status(200).json({
      status: 'success',
      data: {
        users: spaUsers,
        stats,
        currentUserSpa: {
          locationId: currentUser.selectedLocation.locationId,
          locationName: currentUser.selectedLocation.locationName,
          locationAddress: currentUser.selectedLocation.locationAddress,
        },
        debug: {
          searchedLocationId: userLocationId,
          totalUsersFound: allSpaUsers.length,
          usersWithAnyLocation: usersWithLocation,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching spa users:', error)
    next(createError(500, 'Failed to fetch spa users'))
  }
}

// Get user activity for the spa
export const getSpaUserActivity = async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.user.id)

    if (!currentUser || !currentUser.selectedLocation.locationId) {
      return next(createError(400, 'User has not selected a spa'))
    }

    const userLocationId = currentUser.selectedLocation.locationId

    // Get user activity data - join dates, points earned, etc.
    const activityData = await User.aggregate([
      {
        $match: {
          'selectedLocation.locationId': userLocationId,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
            },
          },
          newUsers: { $sum: 1 },
          totalPoints: { $sum: '$points' },
        },
      },
      {
        $sort: { _id: -1 },
      },
      {
        $limit: 30, // Last 30 days
      },
    ])

    res.status(200).json({
      status: 'success',
      data: {
        activity: activityData,
      },
    })
  } catch (error) {
    console.error('Error fetching spa user activity:', error)
    next(createError(500, 'Failed to fetch user activity'))
  }
}
