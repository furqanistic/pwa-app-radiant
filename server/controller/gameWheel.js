// File: server/controller/gameWheel.js - COMPLETE VERSION WITH REWARD INTEGRATION
import { createError } from '../error.js'
import GameWheel from '../models/GameWheel.js'
import User from '../models/User.js'
import { createSystemNotification } from './notification.js'
// Import UserReward models for integration
import { PointTransaction, UserReward } from '../models/UserReward.js'

// =============================================================================
// HELPER FUNCTIONS - SIMPLIFIED
// =============================================================================

const getUserLocation = (user) => {
  if (user.role === 'admin') {
    return null // Admin needs to specify location
  }

  if (user.role === 'team') {
    // Team users are spa owners - use their ghlContactId as locationId
    if (!user.ghlContactId) {
      throw new Error(
        'Your spa location is not configured. Please contact support.'
      )
    }
    return {
      locationId: user.ghlContactId,
      locationName: `${user.name}'s Spa`, // Or you can store this in user profile
    }
  }

  // Regular users use their selected location
  if (!user.selectedLocation?.locationId) {
    throw new Error('Please select a spa/location first')
  }

  return {
    locationId: user.selectedLocation.locationId,
    locationName: user.selectedLocation.locationName,
  }
}

const buildLocationQuery = (user, requestLocationId = null) => {
  if (user.role === 'admin') {
    // Admin can see all games or filter by location
    if (requestLocationId) {
      return {
        locationId: { $regex: new RegExp(`^${requestLocationId}$`, 'i') },
      }
    }
    return {} // No location filter for admin
  }

  if (user.role === 'team') {
    // Team users see only games from their spa (using ghlContactId)
    if (!user.ghlContactId) {
      throw new Error(
        'Your spa location is not configured. Please contact support.'
      )
    }
    return { locationId: { $regex: new RegExp(`^${user.ghlContactId}$`, 'i') } }
  }

  // Regular users see games from their selected spa only
  if (!user.selectedLocation?.locationId) {
    throw new Error('Please select a spa/location first')
  }

  return {
    locationId: {
      $regex: new RegExp(`^${user.selectedLocation.locationId}$`, 'i'),
    },
  }
}

// =============================================================================
// CONTROLLER FUNCTIONS
// =============================================================================

// Create a new game - SIMPLIFIED
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

    // Get location info based on user role
    let gameLocation

    if (req.user.role === 'admin') {
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
      // Team and regular users get location automatically
      try {
        gameLocation = getUserLocation(req.user)
      } catch (error) {
        return next(createError(400, error.message))
      }
    }

    // Check if game of this type already exists for this location (each spa gets only one of each type)
    if (req.user.role === 'team') {
      const existingGame = await GameWheel.findOne({
        locationId: { $regex: new RegExp(`^${gameLocation.locationId}$`, 'i') },
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
      settings: {
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
      },
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

// Get all games (management view)
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

    // Build base query
    const query = {}

    // Apply filters
    if (type) query.type = type
    if (isActive !== undefined) query.isActive = isActive === 'true'
    if (isPublished !== undefined) query.isPublished = isPublished === 'true'
    if (category) query.category = category

    // Apply location/role-based filtering
    try {
      const locationQuery = buildLocationQuery(req.user, locationId)
      Object.assign(query, locationQuery)
    } catch (error) {
      return next(createError(400, error.message))
    }

    // Execute query
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const games = await GameWheel.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    const total = await GameWheel.countDocuments(query)

    res.status(200).json({
      status: 'success',
      results: games.length,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: { games },
    })
  } catch (error) {
    console.error('Error fetching games:', error)
    next(createError(500, 'Failed to fetch games'))
  }
}

// Get available games (for customers to play)
export const getAvailableGames = async (req, res, next) => {
  try {
    const { type } = req.query

    // Only regular users should access available games
    if (req.user.role === 'team') {
      return next(
        createError(403, 'Team users should use the management interface')
      )
    }

    // Get user's location
    let userLocation
    try {
      userLocation = getUserLocation(req.user)
    } catch (error) {
      return next(createError(400, error.message))
    }

    // Build query for active, published games from user's selected location
    const query = {
      locationId: { $regex: new RegExp(`^${userLocation.locationId}$`, 'i') },
      isActive: true,
      isPublished: true,
    }

    if (type) query.type = type

    // Add date filtering
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

    const games = await GameWheel.find(query).sort({ createdAt: -1 })

    res.status(200).json({
      status: 'success',
      results: games.length,
      data: { games },
    })
  } catch (error) {
    console.error('Error fetching available games:', error)
    next(createError(500, 'Failed to fetch available games'))
  }
}

// Get a specific game
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

    // Permission check
    if (req.user.role === 'admin') {
      // Admin can view any game
    } else if (req.user.role === 'team') {
      // Team users can only view games from their spa location
      if (!req.user.ghlContactId) {
        return next(createError(400, 'Your spa location is not configured'))
      }
      if (
        game.locationId.toLowerCase() !== req.user.ghlContactId.toLowerCase()
      ) {
        return next(createError(403, 'You can only view games from your spa'))
      }
    } else {
      // Regular users can only view games from their selected location
      if (!req.user.selectedLocation?.locationId) {
        return next(createError(400, 'Please select a spa/location first'))
      }
      if (
        game.locationId.toLowerCase() !==
        req.user.selectedLocation.locationId.toLowerCase()
      ) {
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

// Update a game
export const updateGame = async (req, res, next) => {
  try {
    const { gameId } = req.params
    const updateData = req.body

    const game = await GameWheel.findById(gameId)

    if (!game) {
      return next(createError(404, 'Game not found'))
    }

    // Permission check
    if (req.user.role === 'admin') {
      // Admin can update any game
    } else if (req.user.role === 'team') {
      // Team users can only update games from their spa location
      if (!req.user.ghlContactId) {
        return next(createError(400, 'Your spa location is not configured'))
      }
      if (
        game.locationId.toLowerCase() !== req.user.ghlContactId.toLowerCase()
      ) {
        return next(createError(403, 'You can only update games from your spa'))
      }
    } else {
      return next(
        createError(403, 'You do not have permission to update games')
      )
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

    const updatedGame = await GameWheel.findByIdAndUpdate(
      gameId,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    )

    res.status(200).json({
      status: 'success',
      message: 'Game updated successfully',
      data: { game: updatedGame },
    })
  } catch (error) {
    console.error('Error updating game:', error)
    next(createError(500, 'Failed to update game'))
  }
}

// Delete a game
export const deleteGame = async (req, res, next) => {
  try {
    const { gameId } = req.params

    const game = await GameWheel.findById(gameId)

    if (!game) {
      return next(createError(404, 'Game not found'))
    }

    // Permission check
    if (req.user.role === 'admin') {
      // Admin can delete any game
    } else if (req.user.role === 'team') {
      // Team users can only delete games from their spa location
      if (!req.user.ghlContactId) {
        return next(createError(400, 'Your spa location is not configured'))
      }
      if (
        game.locationId.toLowerCase() !== req.user.ghlContactId.toLowerCase()
      ) {
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

// ===============================================
// UPDATED: Play a game with Reward Integration
// ===============================================
export const playGame = async (req, res, next) => {
  try {
    const { gameId } = req.params
    const userId = req.user.id

    const game = await GameWheel.findById(gameId)
    if (!game) {
      return next(createError(404, 'Game not found'))
    }

    // Check if game is active
    if (!game.isCurrentlyActive()) {
      return next(createError(400, 'Game is not currently active'))
    }

    // Check if user's location matches game location
    let userLocation
    try {
      userLocation = getUserLocation(req.user)
    } catch (error) {
      return next(createError(400, error.message))
    }

    if (
      game.locationId.toLowerCase() !== userLocation.locationId.toLowerCase()
    ) {
      return next(
        createError(403, 'You can only play games from your selected location')
      )
    }

    // Check if user has enough points
    const user = await User.findById(userId)
    const requiredPoints =
      game.type === 'scratch'
        ? game.settings.scratchSettings?.requirePoints || 0
        : game.settings.spinSettings?.requirePoints || 0

    if (user.points < requiredPoints) {
      return next(
        createError(400, `You need ${requiredPoints} points to play this game`)
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

    // Deduct required points
    user.points -= requiredPoints

    // Award points if the winning item is points
    let pointsWon = 0
    if (winningItem.valueType === 'points') {
      pointsWon = parseInt(winningItem.value) || 0
      user.points += pointsWon
    }

    await user.save()

    // Update game statistics
    game.totalPlays += 1
    if (winningItem.valueType === 'points') {
      game.totalRewardsGiven += pointsWon
    }
    await game.save()

    // =========================================================
    // NEW: CREATE GAME REWARD ENTRY
    // =========================================================

    // Create a UserReward entry for the game win
    const gameRewardData = {
      userId,
      rewardId: null, // No specific reward ID for game wins
      rewardSnapshot: {
        name: `${game.type === 'scratch' ? 'Scratch Card' : 'Spin Wheel'} - ${
          winningItem.title
        }`,
        description: `Won ${winningItem.value} ${winningItem.valueType} from ${game.title}`,
        type: 'game_win', // New type for game wins
        pointCost: requiredPoints,
        value:
          winningItem.valueType === 'points'
            ? pointsWon
            : parseFloat(winningItem.value) || 0,
        validDays: winningItem.valueType === 'points' ? 0 : 30, // Points are instant, other prizes valid for 30 days
        gameId: game._id,
        gameType: game.type,
        winningItem: {
          title: winningItem.title,
          value: winningItem.value,
          valueType: winningItem.valueType,
          color: winningItem.color,
        },
      },
      status: winningItem.valueType === 'points' ? 'used' : 'active',
      locationId: userLocation.locationId,
    }

    // For points, mark as immediately used since they're added to balance
    if (winningItem.valueType === 'points') {
      gameRewardData.usedAt = new Date()
      gameRewardData.actualValue = pointsWon
    }

    const userReward = await UserReward.create(gameRewardData)

    // Create point transaction records for audit trail
    if (requiredPoints > 0) {
      await PointTransaction.create({
        userId,
        type: 'spent',
        amount: -requiredPoints,
        balance: user.points,
        reason: `Played ${
          game.type === 'scratch' ? 'scratch card' : 'spin wheel'
        }: ${game.title}`,
        referenceType: 'game_play',
        referenceId: game._id,
        locationId: userLocation.locationId,
      })
    }

    if (pointsWon > 0) {
      await PointTransaction.create({
        userId,
        type: 'earned',
        amount: pointsWon,
        balance: user.points,
        reason: `Won ${pointsWon} points from ${game.title}`,
        referenceType: 'game_win',
        referenceId: userReward._id,
        locationId: userLocation.locationId,
      })
    }

    // Send notification
    await createSystemNotification(
      userId,
      `🎉 ${game.type === 'scratch' ? 'Scratch Card' : 'Spin Wheel'} Result!`,
      `You won: ${winningItem.title}! ${
        pointsWon > 0 ? `You earned ${pointsWon} points.` : ''
      }`,
      {
        category: 'points',
        priority: 'normal',
        metadata: {
          gameId: game._id,
          gameTitle: game.title,
          gameType: game.type,
          userRewardId: userReward._id, // Link to the reward entry
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
            description: winningItem.description,
            value: winningItem.value,
            valueType: winningItem.valueType,
            icon: winningItem.icon,
            color: winningItem.color,
          },
          pointsSpent: requiredPoints,
          pointsWon,
          newPointsBalance: user.points,
          userRewardId: userReward._id, // Include the reward ID in response
        },
      },
    })
  } catch (error) {
    console.error('Error playing game:', error)
    next(createError(500, 'Failed to play game'))
  }
}

// =========================================================
// NEW: Get user's game history
// =========================================================
export const getUserGameHistory = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { page = 1, limit = 20, gameType } = req.query

    // Build filter for game rewards
    const filter = {
      userId,
      'rewardSnapshot.type': 'game_win',
    }

    if (gameType) {
      filter['rewardSnapshot.gameType'] = gameType
    }

    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const skip = (pageNum - 1) * limitNum

    const [gameHistory, totalGames] = await Promise.all([
      UserReward.find(filter)
        .sort({ claimedAt: -1 })
        .skip(skip)
        .limit(limitNum),
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
      .reduce((sum, g) => sum + (parseFloat(g.rewardSnapshot.value) || 0), 0)

    res.status(200).json({
      status: 'success',
      data: {
        gameHistory,
        stats: {
          totalGames: totalGames,
          scratchGames: scratchGames.length,
          spinGames: spinGames.length,
          totalPointsWon,
          activeRewards: gameHistory.filter((g) => g.status === 'active')
            .length,
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

// Toggle game active status
export const toggleGameStatus = async (req, res, next) => {
  try {
    const { gameId } = req.params

    const game = await GameWheel.findById(gameId)
    if (!game) {
      return next(createError(404, 'Game not found'))
    }

    // Permission check
    if (req.user.role === 'admin') {
      // Admin can toggle any game
    } else if (req.user.role === 'team') {
      // Team users can only toggle games from their spa location
      if (!req.user.ghlContactId) {
        return next(createError(400, 'Your spa location is not configured'))
      }
      if (
        game.locationId.toLowerCase() !== req.user.ghlContactId.toLowerCase()
      ) {
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

// Toggle game publication status
export const toggleGamePublication = async (req, res, next) => {
  try {
    const { gameId } = req.params

    const game = await GameWheel.findById(gameId)
    if (!game) {
      return next(createError(404, 'Game not found'))
    }

    // Permission check
    if (req.user.role === 'admin') {
      // Admin can toggle any game
    } else if (req.user.role === 'team') {
      // Team users can only toggle games from their spa location
      if (!req.user.ghlContactId) {
        return next(createError(400, 'Your spa location is not configured'))
      }
      if (
        game.locationId.toLowerCase() !== req.user.ghlContactId.toLowerCase()
      ) {
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

// Get game analytics
export const getGameAnalytics = async (req, res, next) => {
  try {
    const { gameId } = req.params

    const game = await GameWheel.findById(gameId)
    if (!game) {
      return next(createError(404, 'Game not found'))
    }

    // Permission check
    if (req.user.role === 'admin') {
      // Admin can view analytics for any game
    } else if (req.user.role === 'team') {
      // Team users can only view analytics for games from their spa location
      if (!req.user.ghlContactId) {
        return next(createError(400, 'Your spa location is not configured'))
      }
      if (
        game.locationId.toLowerCase() !== req.user.ghlContactId.toLowerCase()
      ) {
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
