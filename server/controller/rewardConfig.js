// File: server/controller/rewardConfig.js
// server/controller/rewardConfig.js
import { createError } from '../error.js'
import RewardConfig from '../models/RewardConfig.js'
import User from '../models/User.js'

// Get reward configs for a specific spa
export const getSpaRewardConfigs = async (req, res, next) => {
  try {
    const user = req.user
    let locationId = req.params.locationId

    // If not admin, use user's selected location
    if (user.role !== 'admin') {
      if (!user.selectedLocation?.locationId) {
        return next(createError(400, 'User has no selected spa'))
      }
      locationId = user.selectedLocation.locationId
    }

    // If no locationId provided and user is admin, return error
    if (!locationId) {
      return next(createError(400, 'Location ID is required'))
    }

    const configs = await RewardConfig.find({
      'spa.locationId': locationId,
      isActive: true,
    }).populate('createdBy', 'name email')

    res.status(200).json({
      status: 'success',
      data: {
        configs,
        locationId,
      },
    })
  } catch (error) {
    console.error('Error getting spa reward configs:', error)
    next(createError(500, 'Failed to get reward configurations'))
  }
}

// Create or update reward config
export const createOrUpdateRewardConfig = async (req, res, next) => {
  try {
    const user = req.user

    // Ensure req.body exists and has required fields
    if (!req.body || typeof req.body !== 'object') {
      return next(createError(400, 'Request body is required'))
    }

    const {
      gameType,
      difficulty,
      scratchConfig,
      spinSegments,
      scratchRewards,
    } = req.body

    // Validate required fields
    if (!gameType || !difficulty) {
      return next(createError(400, 'gameType and difficulty are required'))
    }

    // Validate game type and difficulty
    if (!['scratch', 'spin'].includes(gameType)) {
      return next(createError(400, 'Invalid game type'))
    }
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      return next(createError(400, 'Invalid difficulty'))
    }

    let locationId = req.params.locationId
    let spa
    console.log(locationId)
    // Get spa information
    if (user.role !== 'admin') {
      // For team members, use their selected location
      if (!user.selectedLocation?.locationId) {
        return next(createError(400, 'User has no selected spa'))
      }
      locationId = user.selectedLocation.locationId
      spa = {
        locationId: user.selectedLocation.locationId,
        locationName: user.selectedLocation.locationName,
      }
    } else {
      // For admin users
      if (locationId) {
        // Use provided locationId from params
        spa = {
          locationId: locationId,
          locationName: req.body.locationName || 'Unknown Spa',
        }
      } else if (req.body.spa) {
        // Use spa from body
        locationId = req.body.spa.locationId
        spa = req.body.spa
      } else {
        return next(createError(400, 'Spa information is required'))
      }
    }

    // Validate spin segments probabilities if it's a spin game
    if (gameType === 'spin' && spinSegments && Array.isArray(spinSegments)) {
      const activeSegments = spinSegments.filter(
        (segment) => segment.isActive !== false
      )
      const totalProbability = activeSegments.reduce(
        (sum, segment) => sum + (parseFloat(segment.probability) || 0),
        0
      )

      if (Math.abs(totalProbability - 1) > 0.01) {
        return next(
          createError(400, 'Spin segment probabilities must sum to 1.0')
        )
      }
    }

    // Find existing config or create new one
    let config = await RewardConfig.findOne({
      'spa.locationId': locationId,
      gameType,
      difficulty,
    })

    const updateData = {
      spa,
      gameType,
      difficulty,
      lastModifiedBy: user._id,
      lastModifiedAt: new Date(),
      isActive: true,
    }

    if (gameType === 'scratch') {
      if (scratchConfig) updateData.scratchConfig = scratchConfig
      if (scratchRewards) updateData.scratchRewards = scratchRewards
    } else if (gameType === 'spin') {
      if (spinSegments) updateData.spinSegments = spinSegments
    }

    if (config) {
      // Update existing config
      Object.assign(config, updateData)
      await config.save()
    } else {
      // Create new config
      updateData.createdBy = user._id
      config = await RewardConfig.create(updateData)
    }

    await config.populate('createdBy', 'name email')
    if (config.lastModifiedBy) {
      await config.populate('lastModifiedBy', 'name email')
    }

    res.status(config.isNew ? 201 : 200).json({
      status: 'success',
      message: `Reward configuration ${
        config.isNew ? 'created' : 'updated'
      } successfully`,
      data: {
        config,
      },
    })
  } catch (error) {
    console.error('Error creating/updating reward config:', error)
    if (error.message.includes('probabilities must sum')) {
      return next(createError(400, error.message))
    }
    next(createError(500, 'Failed to save reward configuration'))
  }
}

// Get specific config
export const getRewardConfig = async (req, res, next) => {
  try {
    const { configId } = req.params
    const user = req.user

    const config = await RewardConfig.findById(configId)
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email')

    if (!config) {
      return next(createError(404, 'Reward configuration not found'))
    }

    // Check permissions
    if (
      user.role !== 'admin' &&
      config.spa.locationId !== user.selectedLocation?.locationId
    ) {
      return next(createError(403, 'Access denied to this configuration'))
    }

    res.status(200).json({
      status: 'success',
      data: {
        config,
      },
    })
  } catch (error) {
    console.error('Error getting reward config:', error)
    next(createError(500, 'Failed to get reward configuration'))
  }
}

// Delete/deactivate config
export const deleteRewardConfig = async (req, res, next) => {
  try {
    const { configId } = req.params
    const user = req.user

    const config = await RewardConfig.findById(configId)

    if (!config) {
      return next(createError(404, 'Reward configuration not found'))
    }

    // Check permissions
    if (
      user.role !== 'admin' &&
      config.spa.locationId !== user.selectedLocation?.locationId
    ) {
      return next(createError(403, 'Access denied to this configuration'))
    }

    // Soft delete by setting isActive to false
    config.isActive = false
    config.lastModifiedBy = user._id
    config.lastModifiedAt = new Date()
    await config.save()

    res.status(200).json({
      status: 'success',
      message: 'Reward configuration deactivated successfully',
    })
  } catch (error) {
    console.error('Error deleting reward config:', error)
    next(createError(500, 'Failed to delete reward configuration'))
  }
}

// Create default configs for a spa
export const createDefaultConfigs = async (req, res, next) => {
  try {
    const user = req.user
    let locationId = req.params.locationId
    let spa

    // Get spa info
    if (user.role === 'admin') {
      if (locationId) {
        // Admin specified locationId in params
        spa = {
          locationId: locationId,
          locationName: (req.body && req.body.locationName) || 'Unknown Spa',
        }
      } else if (req.body && req.body.spa) {
        // Admin provided spa in body
        locationId = req.body.spa.locationId
        spa = req.body.spa
      } else {
        return next(createError(400, 'Spa information is required for admin'))
      }
    } else {
      // Team member - use their selected location
      if (!user.selectedLocation?.locationId) {
        return next(createError(400, 'User has no selected spa'))
      }
      locationId = user.selectedLocation.locationId
      spa = {
        locationId: user.selectedLocation.locationId,
        locationName: user.selectedLocation.locationName,
      }
    }

    const gameTypes = ['scratch', 'spin']
    const difficulties = ['easy', 'medium', 'hard']
    const createdConfigs = []

    for (const gameType of gameTypes) {
      for (const difficulty of difficulties) {
        // Check if config already exists
        const existingConfig = await RewardConfig.findOne({
          'spa.locationId': locationId,
          gameType,
          difficulty,
        })

        if (!existingConfig) {
          try {
            const config = await RewardConfig.createDefaultConfig(
              spa,
              gameType,
              difficulty,
              user._id
            )
            createdConfigs.push(config)
          } catch (error) {
            console.error(
              `Error creating default config for ${gameType} ${difficulty}:`,
              error
            )
          }
        }
      }
    }

    res.status(201).json({
      status: 'success',
      message: `Created ${createdConfigs.length} default configurations`,
      data: {
        configs: createdConfigs,
      },
    })
  } catch (error) {
    console.error('Error creating default configs:', error)
    next(createError(500, 'Failed to create default configurations'))
  }
}

// Get game config for playing (used by game controller)
export const getGameConfig = async (req, res, next) => {
  try {
    const { locationId, gameType, difficulty } = req.params

    const config = await RewardConfig.getConfigForSpa(
      locationId,
      gameType,
      difficulty
    )

    if (!config) {
      return next(
        createError(
          404,
          'No reward configuration found for this spa and game type'
        )
      )
    }

    const activeRewards = config.getActiveRewards()

    res.status(200).json({
      status: 'success',
      data: {
        config: {
          gameType: config.gameType,
          difficulty: config.difficulty,
          scratchConfig: config.scratchConfig,
          spinSegments: config.spinSegments,
          scratchRewards: config.scratchRewards,
          activeRewards,
        },
      },
    })
  } catch (error) {
    console.error('Error getting game config:', error)
    next(createError(500, 'Failed to get game configuration'))
  }
}

// Admin: Get all configs across all spas
export const getAllRewardConfigs = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return next(createError(403, 'Access denied. Admin rights required.'))
    }

    const { page = 1, limit = 20, gameType, difficulty, locationId } = req.query

    const filter = { isActive: true }
    if (gameType) filter.gameType = gameType
    if (difficulty) filter.difficulty = difficulty
    if (locationId) filter['spa.locationId'] = locationId

    const configs = await RewardConfig.find(filter)
      .sort({ 'spa.locationName': 1, gameType: 1, difficulty: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email')

    const total = await RewardConfig.countDocuments(filter)

    res.status(200).json({
      status: 'success',
      data: {
        configs,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
        },
      },
    })
  } catch (error) {
    console.error('Error getting all reward configs:', error)
    next(createError(500, 'Failed to get reward configurations'))
  }
}
