// File: server/controller/gameWheel.js - FIXED WITH PROPER LOCATION FILTERING
import mongoose from 'mongoose'
import { createError } from '../error.js'
import GameWheel from '../models/GameWheel.js'
import PointTransaction from '../models/PointTransaction.js'
import User from '../models/User.js'
import UserReward from '../models/UserReward.js'
import { createSystemNotification } from './notification.js'

// =============================================================================
// HELPER FUNCTIONS - CLEANED UP AND OPTIMIZED
// =============================================================================

const getUserLocationInfo = (user) => {
  console.log('getUserLocationInfo called for user:', {
    id: user.id,
    email: user.email,
    role: user.role,
    selectedLocation: user.selectedLocation,
    spaLocation: user.spaLocation,
  })

  // Handle both admin and super-admin roles
  if (user.role === 'admin' || user.role === 'super-admin') {
    return { type: 'admin', locationId: null, locationName: null }
  }

  if (user.role === 'spa') {
    // spa users are spa owners - use their spa location
    if (!user.spaLocation?.locationId) {
      console.log('spa user missing spa location:', user.spaLocation)
      throw new Error(
        'Your spa location is not configured. Please contact support to set up your spa location.'
      )
    }
    return {
      type: 'spa_owner',
      locationId: user.spaLocation.locationId,
      locationName: user.spaLocation.locationName || `${user.name}'s Spa`,
    }
  }

  // Regular users use their selected location
  console.log('Checking regular user selected location:', user.selectedLocation)

  if (
    !user.selectedLocation?.locationId ||
    !user.selectedLocation?.locationName
  ) {
    console.log(
      'User missing proper location selection:',
      user.selectedLocation
    )
    throw new Error(
      'Please select a spa/location first to view and play games. Go to Profile > Select Spa to choose your preferred location.'
    )
  }

  return {
    type: 'customer',
    locationId: user.selectedLocation.locationId,
    locationName: user.selectedLocation.locationName,
  }
}

const buildLocationQuery = (userLocationInfo, requestLocationId = null) => {
  // Admin and super-admin can see all games or filter by specific location
  if (userLocationInfo.type === 'admin') {
    if (requestLocationId) {
      return { locationId: requestLocationId }
    }
    return {} // No location filter for admin viewing all
  }

  if (userLocationInfo.type === 'spa_owner') {
    // spa users can only see/manage games from their spa
    return { locationId: userLocationInfo.locationId }
  }

  // Regular users can only see games from their selected spa
  return { locationId: userLocationInfo.locationId }
}

// Helper function to check play eligibility based on reset period
const checkPlayEligibility = async (userId, gameId, game) => {
  console.log(
    `Checking play eligibility for user ${userId}, game ${gameId} (${game.type})`
  )

  // FIXED: Get settings based on game type with correct field names
  let settings
  if (game.type === 'scratch') {
    settings = game.settings?.scratchSettings || {
      maxPlaysPerUser: 1,
      resetPeriod: 'daily',
      requirePoints: 10,
    }
  } else if (game.type === 'spin') {
    settings = game.settings?.spinSettings || {
      maxSpinsPerUser: 1,
      resetPeriod: 'daily',
      requirePoints: 10,
      spinDuration: 3000,
    }
  }

  console.log('Game settings:', settings)

  // FIXED: Use correct field name based on game type
  const maxPlays =
    game.type === 'spin'
      ? settings.maxSpinsPerUser || settings.maxPlaysPerUser || 1
      : settings.maxPlaysPerUser || 1

  const resetPeriod = settings.resetPeriod || 'daily'

  console.log(`Max plays: ${maxPlays}, Reset period: ${resetPeriod}`)

  if (resetPeriod === 'never' && maxPlays === 0) {
    return { canPlay: true, playsRemaining: 999 }
  }

  // Calculate the period start based on reset period
  const now = new Date()
  let periodStart = new Date()

  switch (resetPeriod) {
    case 'daily':
      periodStart.setHours(0, 0, 0, 0)
      break
    case 'weekly':
      const dayOfWeek = now.getDay()
      periodStart.setDate(now.getDate() - dayOfWeek)
      periodStart.setHours(0, 0, 0, 0)
      break
    case 'monthly':
      periodStart.setDate(1)
      periodStart.setHours(0, 0, 0, 0)
      break
    case 'never':
      periodStart = new Date(0) // Beginning of time
      break
  }

  console.log('Period start:', periodStart)

  // FIXED: Count plays in current period using correct query structure
  const playsInPeriod = await UserReward.countDocuments({
    userId,
    'rewardSnapshot.gameId': gameId, // FIXED: Use correct nested field path
    'rewardSnapshot.type': 'game_win', // FIXED: Ensure we only count game wins
    claimedAt: { $gte: periodStart },
  })

  console.log(`Plays in current period: ${playsInPeriod}`)

  const playsRemaining = Math.max(0, maxPlays - playsInPeriod)
  const canPlay = playsRemaining > 0

  console.log(`Can play: ${canPlay}, Plays remaining: ${playsRemaining}`)

  // Calculate next reset time
  let nextReset = null
  if (!canPlay && resetPeriod !== 'never') {
    nextReset = new Date()
    switch (resetPeriod) {
      case 'daily':
        nextReset.setDate(nextReset.getDate() + 1)
        nextReset.setHours(0, 0, 0, 0)
        break
      case 'weekly':
        const daysUntilSunday = 7 - nextReset.getDay()
        nextReset.setDate(nextReset.getDate() + daysUntilSunday)
        nextReset.setHours(0, 0, 0, 0)
        break
      case 'monthly':
        nextReset.setMonth(nextReset.getMonth() + 1)
        nextReset.setDate(1)
        nextReset.setHours(0, 0, 0, 0)
        break
    }
  }

  return {
    canPlay,
    playsRemaining,
    maxPlays,
    resetPeriod,
    nextReset,
    playsInPeriod,
  }
}

// =============================================================================
// CONTROLLER FUNCTIONS
// =============================================================================

// Get available games for users to play - FIXED LOCATION FILTERING
export const getAvailableGames = async (req, res, next) => {
  try {
    const { type } = req.query

    console.log('getAvailableGames called by user:', {
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      selectedLocation: req.user.selectedLocation,
    })

    // Get user's location info
    let userLocationInfo
    try {
      userLocationInfo = getUserLocationInfo(req.user)
      console.log('User location info:', userLocationInfo)
    } catch (error) {
      console.log('Location error:', error.message)
      return next(createError(400, error.message))
    }

    // Only regular users should access available games
    if (userLocationInfo.type !== 'customer') {
      console.log(
        'Non-customer trying to access available games:',
        req.user.role
      )
      return next(
        createError(
          403,
          'This endpoint is for customers only. Use the management interface instead.'
        )
      )
    }

    // FIXED: Build query for games from user's selected location only
    const query = {
      locationId: userLocationInfo.locationId,
      isActive: true,
      isPublished: true,
    }

    if (type) query.type = type

    // Add date filtering for scheduled games
    const now = new Date()
    query.$and = [
      {
        $or: [
          { startDate: { $exists: false } },
          { startDate: null },
          { startDate: { $lte: now } },
        ],
      },
      {
        $or: [
          { endDate: { $exists: false } },
          { endDate: null },
          { endDate: { $gte: now } },
        ],
      },
    ]

    console.log('Available games query:', JSON.stringify(query, null, 2))

    const games = await GameWheel.find(query).sort({ createdAt: -1 })
    console.log(
      `Found ${games.length} games for location ${userLocationInfo.locationId}`
    )

    // For each game, check if user can play and add eligibility info
    const gamesWithEligibility = await Promise.all(
      games.map(async (game) => {
        console.log(
          `Checking eligibility for game: ${game.title} (${game.type})`
        )
        const eligibility = await checkPlayEligibility(
          req.user.id,
          game._id,
          game
        )
        console.log(`Eligibility for ${game.title}:`, eligibility)
        return {
          ...game.toObject(),
          eligibility,
        }
      })
    )

    console.log('Final games with eligibility:', gamesWithEligibility.length)

    res.status(200).json({
      status: 'success',
      results: gamesWithEligibility.length,
      data: {
        games: gamesWithEligibility,
        location: {
          locationId: userLocationInfo.locationId,
          locationName: userLocationInfo.locationName,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching available games:', error)
    next(createError(500, 'Failed to fetch available games'))
  }
}

// Create a new game - ENHANCED WITH LOCATION VALIDATION
export const createGame = async (req, res, next) => {
  try {
    const {
      title,
      description,
      type,
      items,
      settings = {},
      startDate,
      endDate,
      tags = [],
      category = 'general',
      // Only admins can specify custom location
      locationId: customLocationId,
      locationName: customLocationName,
    } = req.body

    // Basic validation
    if (!title?.trim()) {
      return next(createError(400, 'Title is required'))
    }

    if (!type || !['scratch', 'spin'].includes(type)) {
      return next(createError(400, 'Type must be either "scratch" or "spin"'))
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return next(createError(400, 'At least one item is required'))
    }

    // Get user's location info
    let userLocationInfo
    try {
      userLocationInfo = getUserLocationInfo(req.user)
    } catch (error) {
      return next(createError(400, error.message))
    }

    // Determine game location
    let gameLocation
    if (userLocationInfo.type === 'admin') {
      // Admin must specify location
      if (!customLocationId || !customLocationName) {
        return next(
          createError(
            400,
            'Admin users must specify locationId and locationName'
          )
        )
      }
      gameLocation = {
        locationId: customLocationId,
        locationName: customLocationName,
      }
    } else {
      // spa users create games for their spa
      gameLocation = {
        locationId: userLocationInfo.locationId,
        locationName: userLocationInfo.locationName,
      }
    }

    // Check if game of this type already exists for this location
    if (userLocationInfo.type === 'spa_owner') {
      const existingGame = await GameWheel.findOne({
        locationId: gameLocation.locationId,
        type,
      })

      if (existingGame) {
        return next(
          createError(
            400,
            `A ${type} game already exists for your spa. Please update the existing one instead.`
          )
        )
      }
    }

    // Validate scratch card probabilities
    if (type === 'scratch') {
      const totalProbability = items.reduce(
        (sum, item) => sum + (item.probability || 0),
        0
      )
      if (totalProbability > 100) {
        return next(createError(400, 'Total probability cannot exceed 100%'))
      }
    }

    // Enhanced default settings with better controls
    const defaultSettings = {
      ...(type === 'scratch'
        ? {
            scratchSettings: {
              maxPlaysPerUser: settings.scratchSettings?.maxPlaysPerUser || 1,
              resetPeriod: settings.scratchSettings?.resetPeriod || 'daily',
              requirePoints: settings.scratchSettings?.requirePoints || 10,
            },
          }
        : {
            spinSettings: {
              maxSpinsPerUser: settings.spinSettings?.maxSpinsPerUser || 1,
              resetPeriod: settings.spinSettings?.resetPeriod || 'daily',
              requirePoints: settings.spinSettings?.requirePoints || 10,
              spinDuration: settings.spinSettings?.spinDuration || 3000,
            },
          }),
    }

    // Prepare game data
    const gameData = {
      title: title.trim(),
      description: description?.trim() || '',
      type,
      locationId: gameLocation.locationId,
      locationName: gameLocation.locationName,
      items: items.map((item) => ({
        title: item.title?.trim() || '',
        description: item.description?.trim() || '',
        value: item.value?.toString() || '0',
        valueType: item.valueType || 'points',
        color: item.color || '#6366F1',
        icon: item.icon || '',
        isActive: item.isActive !== false,
        ...(type === 'scratch' && { probability: item.probability || 0 }),
      })),
      createdBy: req.user.id,
      creatorName: req.user.name,
      settings: defaultSettings,
      isActive: true,
      isPublished: true,
      totalPlays: 0,
      totalRewardsGiven: 0,
      tags,
      category,
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
    }

    const newGame = await GameWheel.create(gameData)

    res.status(201).json({
      status: 'success',
      message: `${
        type === 'scratch' ? 'Scratch card' : 'Spin wheel'
      } created successfully`,
      data: { game: newGame },
    })
  } catch (error) {
    console.error('Error creating game:', error)
    next(createError(500, 'Failed to create game'))
  }
}

// Get all games (management view) - FIXED LOCATION FILTERING
export const getAllGames = async (req, res, next) => {
  try {
    const {
      type,
      locationId,
      isActive,
      isPublished,
      category,
      page = 1,
      limit = 10,
    } = req.query

    console.log(
      'Getting all games for user:',
      req.user.email,
      'Role:',
      req.user.role
    )

    // Get user's location info
    let userLocationInfo
    try {
      userLocationInfo = getUserLocationInfo(req.user)
      console.log('User location info:', userLocationInfo)
    } catch (error) {
      console.log('Error getting user location info:', error.message)
      // For management interface, if location error occurs, still allow admin to proceed
      if (req.user.role === 'super-admin' || req.user.role === 'admin') {
        userLocationInfo = {
          type: 'admin',
          locationId: null,
          locationName: null,
        }
      } else {
        return next(createError(400, error.message))
      }
    }

    // Build base query with location filtering
    const query = buildLocationQuery(userLocationInfo, locationId)

    // Apply other filters
    if (type) query.type = type
    if (isActive !== undefined) query.isActive = isActive === 'true'
    if (isPublished !== undefined) query.isPublished = isPublished === 'true'
    if (category) query.category = category

    console.log('Games query:', JSON.stringify(query, null, 2))

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const games = await GameWheel.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    const total = await GameWheel.countDocuments(query)

    console.log(`Found ${games.length} games out of ${total} total`)

    res.status(200).json({
      status: 'success',
      results: games.length,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: {
        games,
        location:
          userLocationInfo.type !== 'admin'
            ? {
                locationId: userLocationInfo.locationId,
                locationName: userLocationInfo.locationName,
              }
            : null,
      },
    })
  } catch (error) {
    console.error('Error fetching games:', error)
    next(createError(500, 'Failed to fetch games'))
  }
}

// Play a game - FIXED WITH PROPER EXPIRY HANDLING
export const playGame = async (req, res, next) => {
  try {
    const { gameId } = req.params
    const userId = req.user.id

    console.log(`User ${userId} attempting to play game ${gameId}`)

    const game = await GameWheel.findById(gameId)
    if (!game) {
      return next(createError(404, 'Game not found'))
    }

    // Check if game is active
    if (!game.isCurrentlyActive()) {
      return next(createError(400, 'Game is not currently active'))
    }

    // Get user's location info
    let userLocationInfo
    try {
      userLocationInfo = getUserLocationInfo(req.user)
    } catch (error) {
      return next(createError(400, error.message))
    }

    // Verify user can only play games from their selected location
    if (
      userLocationInfo.type !== 'admin' &&
      game.locationId !== userLocationInfo.locationId
    ) {
      return next(
        createError(
          403,
          'You can only play games from your selected spa location'
        )
      )
    }

    // Check play eligibility (frequency limits)
    const eligibility = await checkPlayEligibility(userId, gameId, game)
    if (!eligibility.canPlay) {
      const resetTime = eligibility.nextReset
        ? eligibility.nextReset.toLocaleString()
        : 'unknown'
      return next(
        createError(
          429,
          `You've reached the play limit for this ${game.type}. ${
            eligibility.resetPeriod === 'never'
              ? 'No more plays available.'
              : `Try again after ${resetTime}`
          }`
        )
      )
    }

    // Get user and check points
    const user = await User.findById(userId)
    const requiredPoints =
      game.type === 'scratch'
        ? game.settings.scratchSettings?.requirePoints || 0
        : game.settings.spinSettings?.requirePoints || 0

    console.log(
      `Required points: ${requiredPoints}, User points: ${user.points}`
    )

    if (user.points < requiredPoints) {
      return next(
        createError(
          400,
          `You need ${requiredPoints} points to play this ${game.type}. You have ${user.points} points.`
        )
      )
    }

    // Determine winning item
    let winningItem
    if (game.type === 'scratch') {
      winningItem = game.getRandomItem()
    } else {
      // For spin wheel, return a random item from active items
      const activeItems = game.items.filter((item) => item.isActive)
      winningItem = activeItems[Math.floor(Math.random() * activeItems.length)]
    }

    if (!winningItem) {
      return next(createError(500, 'No active items found in this game'))
    }

    console.log('Winning item:', winningItem)

    // Start MongoDB transaction for atomic operations
    const session = await mongoose.startSession()
    let userRewardId = null

    // FIXED: Declare pointsWon outside transaction scope
    let pointsWon = 0

    try {
      await session.withTransaction(async () => {
        // Deduct required points from user
        if (requiredPoints > 0) {
          user.points -= requiredPoints
          console.log(
            `Deducted ${requiredPoints} points. New balance: ${user.points}`
          )
        }

        // Award points if the winning item is points
        if (winningItem.valueType === 'points') {
          pointsWon = parseInt(winningItem.value) || 0
          user.points += pointsWon
          console.log(
            `Awarded ${pointsWon} points. Final balance: ${user.points}`
          )
        }

        await user.save({ session })

        // Update game statistics
        game.totalPlays += 1
        if (winningItem.valueType === 'points') {
          game.totalRewardsGiven += pointsWon
        }
        await game.save({ session })

        // FIXED: Properly handle expiresAt based on reward type
        const isPointReward = winningItem.valueType === 'points'
        const rewardValidDays = isPointReward
          ? 0
          : Math.max(0, parseInt(winningItem.validDays || 30, 10) || 30)
        const expiresAt =
          isPointReward || rewardValidDays <= 0
            ? null // Point rewards or zero days don't expire
            : new Date(Date.now() + rewardValidDays * 24 * 60 * 60 * 1000)

        // Create UserReward entry with proper schema structure
        const gameRewardData = {
          userId,
          rewardId: null, // No specific reward, this is a game win
          rewardSnapshot: {
            name: `${
              game.type === 'scratch' ? 'Scratch Card' : 'Spin Wheel'
            } - ${winningItem.title}`,
            description: `Won ${winningItem.value} ${winningItem.valueType} from ${game.title}`,
            type: 'game_win',
            gameId: game._id,
            gameType: game.type,
            gameTitle: game.title,
            pointCost: requiredPoints,
            value: isPointReward
              ? pointsWon
              : parseFloat(winningItem.value) || 0,
            validDays: rewardValidDays,
            winningItem: {
              id: winningItem._id,
              title: winningItem.title,
              description: winningItem.description || '',
              value: winningItem.value,
              valueType: winningItem.valueType,
              validDays: rewardValidDays,
              color: winningItem.color,
              icon: winningItem.icon || '',
            },
          },
          // Set status based on prize type
          status: isPointReward ? 'used' : 'active',
          locationId: userLocationInfo.locationId,
          locationName: userLocationInfo.locationName,
          claimedAt: new Date(),
          // FIXED: Handle expiresAt properly
          expiresAt: expiresAt,
          // For point rewards, mark as immediately used
          ...(isPointReward && {
            usedAt: new Date(),
            actualValue: pointsWon,
          }),
        }

        console.log(
          'Creating UserReward with data:',
          JSON.stringify(gameRewardData, null, 2)
        )

        const userReward = await UserReward.create([gameRewardData], {
          session,
        })
        userRewardId = userReward[0]._id
        console.log('Created user reward:', userRewardId)

        // Create point transaction records with correct field names
        if (requiredPoints > 0) {
          await PointTransaction.create(
            [
              {
                user: userId,
                type: 'spent',
                points: -requiredPoints,
                balance: user.points - (isPointReward ? pointsWon : 0),
                description: `Played ${
                  game.type === 'scratch' ? 'scratch card' : 'spin wheel'
                }: ${game.title}`,
                reference: game._id,
                referenceModel: 'GameWheel',
                locationId: userLocationInfo.locationId,
                gameMetadata: {
                  gameId: game._id,
                  gameType: game.type,
                  gameTitle: game.title,
                  winningItem: {
                    title: winningItem.title,
                    value: winningItem.value,
                    valueType: winningItem.valueType,
                  },
                },
              },
            ],
            { session }
          )
          console.log(
            `Created point transaction for spending ${requiredPoints} points`
          )
        }

        if (pointsWon > 0) {
          await PointTransaction.create(
            [
              {
                user: userId,
                type: 'earned',
                points: pointsWon,
                balance: user.points,
                description: `Won ${pointsWon} points from ${game.title}`,
                reference: userRewardId,
                referenceModel: 'UserReward',
                locationId: userLocationInfo.locationId,
                gameMetadata: {
                  gameId: game._id,
                  gameType: game.type,
                  gameTitle: game.title,
                  winningItem: {
                    title: winningItem.title,
                    value: winningItem.value,
                    valueType: winningItem.valueType,
                  },
                },
              },
            ],
            { session }
          )
          console.log(
            `Created point transaction for earning ${pointsWon} points`
          )
        }
      })

      console.log('Transaction completed successfully')
    } catch (error) {
      console.error('Transaction failed:', error)
      throw error
    } finally {
      await session.endSession()
    }

    // Calculate eligibility after play (this will now show the updated play count)
    const eligibilityAfterPlay = await checkPlayEligibility(
      userId,
      gameId,
      game
    )

    // Send notification
    await createSystemNotification(
      userId,
      `🎉 ${game.type === 'scratch' ? 'Scratch Card' : 'Spin Wheel'} Result!`,
      `You won: ${winningItem.title}! ${
        pointsWon > 0
          ? `You earned ${pointsWon} points.`
          : winningItem.valueType !== 'points'
          ? rewardValidDays > 0
            ? `Redeem this at your spa within ${rewardValidDays} days.`
            : 'Redeem this at your spa anytime.'
          : ''
      }`,
      {
        category: 'points',
        priority: 'normal',
        metadata: {
          gameId: game._id,
          gameTitle: game.title,
          gameType: game.type,
          userRewardId,
          winningItem: {
            title: winningItem.title,
            value: winningItem.value,
            valueType: winningItem.valueType,
          },
          pointsSpent: requiredPoints,
          pointsWon,
          newPointsBalance: user.points,
        },
      }
    )

    console.log('Game play completed successfully')

    res.status(200).json({
      status: 'success',
      message: 'Game played successfully!',
      data: {
        game: {
          id: game._id,
          title: game.title,
          type: game.type,
        },
        result: {
          winningItem: {
            id: winningItem._id,
            title: winningItem.title,
            description: winningItem.description || '',
            value: winningItem.value,
            valueType: winningItem.valueType,
            icon: winningItem.icon,
            color: winningItem.color,
          },
          pointsSpent: requiredPoints,
          pointsWon: pointsWon,
          newPointsBalance: user.points,
          prizeType: winningItem.valueType,
          isInstantReward: winningItem.valueType === 'points',
          expiresAt:
            winningItem.valueType !== 'points' && rewardValidDays > 0
              ? new Date(Date.now() + rewardValidDays * 24 * 60 * 60 * 1000)
              : null,
          eligibilityAfterPlay: {
            playsRemaining: Math.max(0, eligibilityAfterPlay.playsRemaining),
            nextReset: eligibilityAfterPlay.nextReset,
            resetPeriod: eligibilityAfterPlay.resetPeriod,
            maxPlays: eligibilityAfterPlay.maxPlays,
          },
        },
      },
    })
  } catch (error) {
    console.error('Error playing game:', error)
    next(createError(500, 'Failed to play game'))
  }
}

export const getUserGameHistory = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { page = 1, limit = 20, gameType, status } = req.query

    console.log(`Fetching game history for user ${userId}`)

    // Build filter for game rewards
    const filter = {
      userId,
      'rewardSnapshot.type': 'game_win',
    }

    if (gameType) {
      filter['rewardSnapshot.gameType'] = gameType
    }

    if (status) {
      filter.status = status
    }

    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const skip = (pageNum - 1) * limitNum

    const [gameHistory, totalGames] = await Promise.all([
      UserReward.find(filter)
        .sort({ claimedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      UserReward.countDocuments(filter),
    ])

    // Calculate stats
    const scratchGames = gameHistory.filter(
      (g) => g.rewardSnapshot.gameType === 'scratch'
    )
    const spinGames = gameHistory.filter(
      (g) => g.rewardSnapshot.gameType === 'spin'
    )

    const totalPointsWon = gameHistory
      .filter((g) => g.rewardSnapshot.winningItem?.valueType === 'points')
      .reduce((sum, g) => {
        const points = parseInt(g.rewardSnapshot.winningItem?.value) || 0
        return sum + points
      }, 0)

    const totalValueWon = gameHistory
      .filter((g) => g.rewardSnapshot.winningItem?.valueType !== 'points')
      .reduce((sum, g) => {
        const value = parseFloat(g.rewardSnapshot.value) || 0
        return sum + value
      }, 0)

    res.status(200).json({
      status: 'success',
      data: {
        gameHistory,
        stats: {
          totalGames: totalGames,
          scratchGames: scratchGames.length,
          spinGames: spinGames.length,
          totalPointsWon,
          totalValueWon,
          activeRewards: gameHistory.filter((g) => g.status === 'active')
            .length,
          usedRewards: gameHistory.filter((g) => g.status === 'used').length,
        },
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalGames / limitNum),
          totalGames,
          hasNext: pageNum < Math.ceil(totalGames / limitNum),
          hasPrev: pageNum > 1,
          limit: limitNum,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching game history:', error)
    next(createError(500, 'Failed to fetch game history'))
  }
}

// Add admin endpoint to view any user's game history
export const getAnyUserGameHistory = async (req, res, next) => {
  try {
    const { userId } = req.params
    const { page = 1, limit = 20, gameType, status } = req.query

    // Check permissions
    if (!['admin', 'super-admin', 'spa'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    // If spa user, ensure they can only view users from their spa
    if (req.user.role === 'spa') {
      const targetUser = await User.findById(userId)
      if (!targetUser) {
        return next(createError(404, 'User not found'))
      }

      if (
        targetUser.selectedLocation?.locationId !==
        req.user.spaLocation?.locationId
      ) {
        return next(createError(403, 'Can only view users from your spa'))
      }
    }

    // Build filter
    const filter = {
      userId,
      'rewardSnapshot.type': 'game_win',
    }

    if (gameType) {
      filter['rewardSnapshot.gameType'] = gameType
    }

    if (status) {
      filter.status = status
    }

    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const skip = (pageNum - 1) * limitNum

    const [gameHistory, totalGames] = await Promise.all([
      UserReward.find(filter)
        .sort({ claimedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      UserReward.countDocuments(filter),
    ])

    // Calculate stats
    const stats = {
      totalGames: totalGames,
      scratchGames: gameHistory.filter(
        (g) => g.rewardSnapshot.gameType === 'scratch'
      ).length,
      spinGames: gameHistory.filter((g) => g.rewardSnapshot.gameType === 'spin')
        .length,
      totalPointsWon: gameHistory
        .filter((g) => g.rewardSnapshot.winningItem?.valueType === 'points')
        .reduce(
          (sum, g) =>
            sum + (parseInt(g.rewardSnapshot.winningItem?.value) || 0),
          0
        ),
      totalValueWon: gameHistory
        .filter((g) => g.rewardSnapshot.winningItem?.valueType !== 'points')
        .reduce((sum, g) => sum + (parseFloat(g.rewardSnapshot.value) || 0), 0),
      activeRewards: gameHistory.filter((g) => g.status === 'active').length,
    }

    res.status(200).json({
      status: 'success',
      data: {
        gameHistory,
        stats,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalGames / limitNum),
          totalGames,
          hasNext: pageNum < Math.ceil(totalGames / limitNum),
          hasPrev: pageNum > 1,
          limit: limitNum,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching user game history:', error)
    next(createError(500, 'Failed to fetch user game history'))
  }
}

// Get game rewards for spa owners
export const getGameRewardsForSpa = async (req, res, next) => {
  try {
    // Only spa owners and admins can access this
    if (!['admin', 'spa'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    let spaLocationId
    if (req.user.role === 'admin') {
      spaLocationId = req.query.locationId || req.params.locationId
      if (!spaLocationId) {
        return next(createError(400, 'Location ID required for admin'))
      }
    } else if (req.user.role === 'spa') {
      if (!req.user.spaLocation?.locationId) {
        return next(createError(400, 'Your spa location is not configured'))
      }
      spaLocationId = req.user.spaLocation.locationId
    }

    const { status = 'active', limit = 50 } = req.query

    // Get game rewards from this spa
    const gameRewards = await UserReward.find({
      locationId: spaLocationId,
      'rewardSnapshot.type': 'game_win',
      ...(status !== 'all' && { status }),
    })
      .populate('userId', 'name email avatar')
      .sort({ claimedAt: -1 })
      .limit(parseInt(limit))

    // Group by game type for better organization
    const scratchRewards = gameRewards.filter(
      (r) => r.rewardSnapshot.gameType === 'scratch'
    )
    const spinRewards = gameRewards.filter(
      (r) => r.rewardSnapshot.gameType === 'spin'
    )

    res.status(200).json({
      status: 'success',
      data: {
        gameRewards,
        breakdown: {
          scratch: scratchRewards,
          spin: spinRewards,
        },
        stats: {
          total: gameRewards.length,
          scratch: scratchRewards.length,
          spin: spinRewards.length,
          needsRedemption: gameRewards.filter(
            (r) =>
              r.status === 'active' &&
              r.rewardSnapshot.winningItem.valueType !== 'points'
          ).length,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching game rewards for spa:', error)
    next(createError(500, 'Failed to fetch game rewards'))
  }
}

// Keep other existing functions with location validation added...
export const updateGame = async (req, res, next) => {
  try {
    const { gameId } = req.params
    const updateData = req.body

    console.log('Updating game:', gameId, 'User role:', req.user.role)
    console.log('Update data received:', JSON.stringify(updateData, null, 2))

    const game = await GameWheel.findById(gameId)
    if (!game) {
      console.log('Game not found:', gameId)
      return next(createError(404, 'Game not found'))
    }

    console.log(
      'Found game:',
      game.title,
      'Type:',
      game.type,
      'Location:',
      game.locationId
    )

    // Get user's location info for permission check
    let userLocationInfo
    try {
      userLocationInfo = getUserLocationInfo(req.user)
      console.log('User location info:', userLocationInfo)
    } catch (error) {
      console.log('Error getting user location info:', error.message)
      return next(createError(400, error.message))
    }

    // Permission check with location validation
    if (userLocationInfo.type === 'admin') {
      console.log('Admin/Super-admin updating game')
    } else if (userLocationInfo.type === 'spa_owner') {
      if (game.locationId !== userLocationInfo.locationId) {
        return next(createError(403, 'You can only update games from your spa'))
      }
    } else {
      return next(
        createError(403, 'You do not have permission to update games')
      )
    }

    // FIXED: Properly handle settings updates with correct field names
    if (updateData.settings) {
      console.log('Settings update detected:', updateData.settings)

      // Merge with existing settings to preserve other settings
      const existingSettings = game.settings || {}
      let updatedSettings = { ...existingSettings }

      if (game.type === 'spin' && updateData.settings.spinSettings) {
        console.log('Updating spin settings:', updateData.settings.spinSettings)

        // FIXED: Ensure correct field mapping for spin wheel
        const spinSettings = updateData.settings.spinSettings
        updatedSettings.spinSettings = {
          maxSpinsPerUser:
            spinSettings.maxSpinsPerUser || spinSettings.maxPlaysPerUser || 1,
          resetPeriod: spinSettings.resetPeriod || 'daily',
          requirePoints: spinSettings.requirePoints || 10,
          spinDuration: spinSettings.spinDuration || 3000,
        }

        console.log('Final spin settings:', updatedSettings.spinSettings)
      }

      if (game.type === 'scratch' && updateData.settings.scratchSettings) {
        console.log(
          'Updating scratch settings:',
          updateData.settings.scratchSettings
        )

        updatedSettings.scratchSettings = {
          maxPlaysPerUser:
            updateData.settings.scratchSettings.maxPlaysPerUser || 1,
          resetPeriod:
            updateData.settings.scratchSettings.resetPeriod || 'daily',
          requirePoints:
            updateData.settings.scratchSettings.requirePoints || 10,
        }

        console.log('Final scratch settings:', updatedSettings.scratchSettings)
      }

      updateData.settings = updatedSettings
    }

    // Validate probability for scratch cards if items are being updated
    if (updateData.items && game.type === 'scratch') {
      const totalProbability = updateData.items.reduce(
        (total, item) => total + (item.probability || 0),
        0
      )
      if (totalProbability > 100) {
        return next(createError(400, 'Total probability cannot exceed 100%'))
      }
    }

    console.log('Final update data:', JSON.stringify(updateData, null, 2))

    const updatedGame = await GameWheel.findByIdAndUpdate(
      gameId,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    )

    console.log('Game updated successfully:', updatedGame.title)
    console.log(
      'Updated settings:',
      JSON.stringify(updatedGame.settings, null, 2)
    )

    res.status(200).json({
      status: 'success',
      message: 'Game updated successfully',
      data: { game: updatedGame },
    })
  } catch (error) {
    console.error('Error updating game:', error)
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      gameId: req.params.gameId,
      userRole: req.user?.role,
      updateData: req.body,
    })
    next(createError(500, 'Failed to update game'))
  }
}

export const deleteGame = async (req, res, next) => {
  try {
    const { gameId } = req.params

    const game = await GameWheel.findById(gameId)
    if (!game) {
      return next(createError(404, 'Game not found'))
    }

    // Get user's location info for permission check
    let userLocationInfo
    try {
      userLocationInfo = getUserLocationInfo(req.user)
    } catch (error) {
      return next(createError(400, error.message))
    }

    // Permission check with location validation
    if (userLocationInfo.type === 'admin') {
      // Admin can delete any game
    } else if (userLocationInfo.type === 'spa_owner') {
      // spa users can only delete games from their spa
      if (game.locationId !== userLocationInfo.locationId) {
        return next(createError(403, 'You can only delete games from your spa'))
      }
    } else {
      return next(
        createError(403, 'You do not have permission to delete games')
      )
    }

    await GameWheel.findByIdAndDelete(gameId)

    res.status(200).json({
      status: 'success',
      message: 'Game deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting game:', error)
    next(createError(500, 'Failed to delete game'))
  }
}

// Export other functions with similar location validation patterns...
export const getGame = async (req, res, next) => {
  try {
    const { gameId } = req.params

    const game = await GameWheel.findById(gameId).populate(
      'createdBy',
      'name email'
    )
    if (!game) {
      return next(createError(404, 'Game not found'))
    }

    // Get user's location info for permission check
    let userLocationInfo
    try {
      userLocationInfo = getUserLocationInfo(req.user)
    } catch (error) {
      return next(createError(400, error.message))
    }

    // Permission check with location validation
    if (userLocationInfo.type === 'admin') {
      // Admin can view any game
    } else if (userLocationInfo.type === 'spa_owner') {
      // spa users can only view games from their spa
      if (game.locationId !== userLocationInfo.locationId) {
        return next(createError(403, 'You can only view games from your spa'))
      }
    } else if (userLocationInfo.type === 'customer') {
      // Regular users can only view games from their selected location
      if (game.locationId !== userLocationInfo.locationId) {
        return next(
          createError(
            403,
            'You can only view games from your selected location'
          )
        )
      }
    }

    res.status(200).json({
      status: 'success',
      data: { game },
    })
  } catch (error) {
    console.error('Error fetching game:', error)
    next(createError(500, 'Failed to fetch game'))
  }
}

// Toggle game status with location validation
export const toggleGameStatus = async (req, res, next) => {
  try {
    const { gameId } = req.params

    const game = await GameWheel.findById(gameId)
    if (!game) {
      return next(createError(404, 'Game not found'))
    }

    // Get user's location info for permission check
    let userLocationInfo
    try {
      userLocationInfo = getUserLocationInfo(req.user)
    } catch (error) {
      return next(createError(400, error.message))
    }

    // Permission check with location validation
    if (userLocationInfo.type === 'admin') {
      // Admin can toggle any game
    } else if (userLocationInfo.type === 'spa_owner') {
      if (game.locationId !== userLocationInfo.locationId) {
        return next(createError(403, 'You can only modify games from your spa'))
      }
    } else {
      return next(
        createError(403, 'You do not have permission to modify games')
      )
    }

    game.isActive = !game.isActive
    await game.save()

    res.status(200).json({
      status: 'success',
      message: `Game ${
        game.isActive ? 'activated' : 'deactivated'
      } successfully`,
      data: {
        game: {
          id: game._id,
          title: game.title,
          isActive: game.isActive,
        },
      },
    })
  } catch (error) {
    console.error('Error toggling game status:', error)
    next(createError(500, 'Failed to toggle game status'))
  }
}

export const toggleGamePublication = async (req, res, next) => {
  try {
    const { gameId } = req.params

    const game = await GameWheel.findById(gameId)
    if (!game) {
      return next(createError(404, 'Game not found'))
    }

    // Get user's location info for permission check
    let userLocationInfo
    try {
      userLocationInfo = getUserLocationInfo(req.user)
    } catch (error) {
      return next(createError(400, error.message))
    }

    // Permission check with location validation
    if (userLocationInfo.type === 'admin') {
      // Admin can toggle any game
    } else if (userLocationInfo.type === 'spa_owner') {
      if (game.locationId !== userLocationInfo.locationId) {
        return next(createError(403, 'You can only modify games from your spa'))
      }
    } else {
      return next(
        createError(403, 'You do not have permission to modify games')
      )
    }

    game.isPublished = !game.isPublished
    await game.save()

    res.status(200).json({
      status: 'success',
      message: `Game ${
        game.isPublished ? 'published' : 'unpublished'
      } successfully`,
      data: {
        game: {
          id: game._id,
          title: game.title,
          isPublished: game.isPublished,
        },
      },
    })
  } catch (error) {
    console.error('Error toggling game publication:', error)
    next(createError(500, 'Failed to toggle game publication'))
  }
}

export const getGameAnalytics = async (req, res, next) => {
  try {
    const { gameId } = req.params

    const game = await GameWheel.findById(gameId)
    if (!game) {
      return next(createError(404, 'Game not found'))
    }

    // Get user's location info for permission check
    let userLocationInfo
    try {
      userLocationInfo = getUserLocationInfo(req.user)
    } catch (error) {
      return next(createError(400, error.message))
    }

    // Permission check with location validation
    if (userLocationInfo.type === 'admin') {
      // Admin can view analytics for any game
    } else if (userLocationInfo.type === 'spa_owner') {
      if (game.locationId !== userLocationInfo.locationId) {
        return next(
          createError(
            403,
            'You can only view analytics for games from your spa'
          )
        )
      }
    } else {
      return next(
        createError(403, 'You do not have permission to view game analytics')
      )
    }

    // Get game play history from UserReward
    const gameRewards = await UserReward.find({
      'rewardSnapshot.gameId': gameId,
    })
      .populate('userId', 'name email')
      .sort({ claimedAt: -1 })
      .limit(100)

    const analytics = {
      gameInfo: {
        id: game._id,
        title: game.title,
        type: game.type,
        locationId: game.locationId,
        locationName: game.locationName,
        createdAt: game.createdAt,
        isActive: game.isActive,
        isPublished: game.isPublished,
      },
      stats: {
        totalPlays: game.totalPlays,
        totalRewardsGiven: game.totalRewardsGiven,
        activeItems: game.items.filter((item) => item.isActive).length,
        totalItems: game.items.length,
        uniquePlayers: new Set(gameRewards.map((r) => r.userId?.toString()))
          .size,
      },
      items: game.items.map((item) => ({
        id: item._id,
        title: item.title,
        value: item.value,
        valueType: item.valueType,
        probability: item.probability,
        isActive: item.isActive,
        timesWon: gameRewards.filter(
          (r) => r.rewardSnapshot.winningItem?.title === item.title
        ).length,
      })),
      recentPlays: gameRewards.slice(0, 10).map((r) => ({
        user: r.userId?.name || 'Unknown',
        prize: r.rewardSnapshot.winningItem?.title,
        value: r.rewardSnapshot.winningItem?.value,
        valueType: r.rewardSnapshot.winningItem?.valueType,
        playedAt: r.claimedAt,
      })),
    }

    if (game.type === 'scratch') {
      const totalProbability = game.items
        .filter((item) => item.isActive)
        .reduce((sum, item) => sum + (item.probability || 0), 0)

      analytics.scratchSpecific = {
        totalProbability,
        probabilityDistribution: game.items
          .filter((item) => item.isActive)
          .map((item) => ({
            title: item.title,
            probability: item.probability,
          })),
      }
    }

    res.status(200).json({
      status: 'success',
      data: { analytics },
    })
  } catch (error) {
    console.error('Error fetching game analytics:', error)
    next(createError(500, 'Failed to fetch game analytics'))
  }
}
