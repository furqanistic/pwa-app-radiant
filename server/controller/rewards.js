// server/controller/rewards.js
import { createError } from '../error.js'
import Reward from '../models/Reward.js'
import User from '../models/User.js'
import {
  PointTransaction,
  UserReward,
  awardPoints,
  spendPoints,
} from '../models/UserReward.js'

// ===============================================
// REWARD MANAGEMENT (ADMIN/TEAM)
// ===============================================

// Get all rewards with filtering, sorting, and searching
export const getRewards = async (req, res, next) => {
  try {
    const {
      search = '',
      type = '',
      status = '',
      sortBy = 'pointCost',
      page = 1,
      limit = 50,
      locationId = null,
    } = req.query

    // Build filter object
    const filter = { isDeleted: false }

    // Location filter
    if (locationId) {
      filter.$or = [
        { locationId: locationId },
        { locationId: { $exists: false } },
        { locationId: null },
      ]
    } else if (req.user.selectedLocation?.locationId) {
      filter.$or = [
        { locationId: req.user.selectedLocation.locationId },
        { locationId: { $exists: false } },
        { locationId: null },
      ]
    }

    // Type filter
    if (type) {
      filter.type = type
    }

    // Status filter
    if (status) {
      filter.status = status
    }

    // Search filter
    let searchFilter = {}
    if (search) {
      searchFilter = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ],
      }
    }

    // Combine filters
    const finalFilter = search ? { ...filter, ...searchFilter } : filter

    // Build sort object
    let sortObject = {}
    switch (sortBy) {
      case 'name':
        sortObject = { name: 1 }
        break
      case 'pointCost-low':
        sortObject = { pointCost: 1 }
        break
      case 'pointCost-high':
        sortObject = { pointCost: -1 }
        break
      case 'value-high':
        sortObject = { value: -1 }
        break
      case 'redeemCount':
        sortObject = { redeemCount: -1 }
        break
      case 'created':
        sortObject = { createdAt: -1 }
        break
      default:
        sortObject = { pointCost: 1 }
    }

    // Execute query with pagination
    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const skip = (pageNum - 1) * limitNum

    const [rewards, totalRewards] = await Promise.all([
      Reward.find(finalFilter)
        .populate('createdBy', 'name')
        .populate('includeServices', 'name')
        .populate('excludeServices', 'name')
        .sort(sortObject)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Reward.countDocuments(finalFilter),
    ])

    // Calculate pagination info
    const totalPages = Math.ceil(totalRewards / limitNum)
    const hasNext = pageNum < totalPages
    const hasPrev = pageNum > 1

    res.status(200).json({
      status: 'success',
      data: {
        rewards,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalRewards,
          hasNext,
          hasPrev,
          limit: limitNum,
        },
        stats: {
          total: totalRewards,
          active: rewards.filter((r) => r.status === 'active').length,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching rewards:', error)
    next(createError(500, 'Failed to fetch rewards'))
  }
}

// Get single reward by ID
export const getReward = async (req, res, next) => {
  try {
    const { id } = req.params

    const reward = await Reward.findById(id)
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .populate('includeServices', 'name basePrice')
      .populate('excludeServices', 'name basePrice')

    if (!reward || reward.isDeleted) {
      return next(createError(404, 'Reward not found'))
    }

    res.status(200).json({
      status: 'success',
      data: {
        reward,
      },
    })
  } catch (error) {
    console.error('Error fetching reward:', error)
    next(createError(500, 'Failed to fetch reward'))
  }
}

// Create new reward
export const createReward = async (req, res, next) => {
  try {
    // Check permissions
    if (!['admin', 'team'].includes(req.user.role)) {
      return next(
        createError(403, 'Access denied. Admin or team rights required.')
      )
    }

    const {
      name,
      description,
      type,
      pointCost,
      value,
      image,
      status = 'active',
      limit = 1,
      validDays = 30,
      maxValue,
      minPurchase,
      excludeServices = [],
      includeServices = [],
      locationId,
    } = req.body

    // Validate required fields
    if (!name || !description || !type || !pointCost) {
      return next(
        createError(
          400,
          'Please provide all required fields: name, description, type, pointCost'
        )
      )
    }

    // Validate point cost
    if (pointCost <= 0) {
      return next(createError(400, 'Point cost must be greater than 0'))
    }

    // Validate value based on type
    if (
      type !== 'service' &&
      (value === undefined || value === null || value < 0)
    ) {
      return next(createError(400, 'Value is required for non-service rewards'))
    }

    // Create reward data
    const rewardData = {
      name: name.trim(),
      description: description.trim(),
      type,
      pointCost: parseInt(pointCost),
      value: type === 'service' ? 0 : parseFloat(value),
      image: image || '',
      status,
      limit: parseInt(limit),
      validDays: parseInt(validDays),
      createdBy: req.user.id,
    }

    // Add optional fields
    if (maxValue) rewardData.maxValue = parseFloat(maxValue)
    if (minPurchase) rewardData.minPurchase = parseFloat(minPurchase)
    if (excludeServices.length > 0) rewardData.excludeServices = excludeServices
    if (includeServices.length > 0) rewardData.includeServices = includeServices

    // Add location if provided or use user's location
    if (locationId) {
      rewardData.locationId = locationId
    } else if (req.user.selectedLocation?.locationId) {
      rewardData.locationId = req.user.selectedLocation.locationId
    }

    const reward = await Reward.create(rewardData)

    res.status(201).json({
      status: 'success',
      message: 'Reward created successfully',
      data: {
        reward,
      },
    })
  } catch (error) {
    console.error('Error creating reward:', error)
    next(createError(500, 'Failed to create reward'))
  }
}

// Update reward
export const updateReward = async (req, res, next) => {
  try {
    // Check permissions
    if (!['admin', 'team'].includes(req.user.role)) {
      return next(
        createError(403, 'Access denied. Admin or team rights required.')
      )
    }

    const { id } = req.params
    const updateData = { ...req.body }

    // Find existing reward
    const existingReward = await Reward.findById(id)
    if (!existingReward || existingReward.isDeleted) {
      return next(createError(404, 'Reward not found'))
    }

    // Add update tracking
    updateData.updatedBy = req.user.id

    // Handle numeric fields
    if (updateData.pointCost)
      updateData.pointCost = parseInt(updateData.pointCost)
    if (updateData.value !== undefined)
      updateData.value = parseFloat(updateData.value)
    if (updateData.limit) updateData.limit = parseInt(updateData.limit)
    if (updateData.validDays)
      updateData.validDays = parseInt(updateData.validDays)
    if (updateData.maxValue)
      updateData.maxValue = parseFloat(updateData.maxValue)
    if (updateData.minPurchase)
      updateData.minPurchase = parseFloat(updateData.minPurchase)

    const updatedReward = await Reward.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('includeServices', 'name')
      .populate('excludeServices', 'name')

    res.status(200).json({
      status: 'success',
      message: 'Reward updated successfully',
      data: {
        reward: updatedReward,
      },
    })
  } catch (error) {
    console.error('Error updating reward:', error)
    next(createError(500, 'Failed to update reward'))
  }
}

// Delete reward (soft delete)
export const deleteReward = async (req, res, next) => {
  try {
    // Check permissions
    if (!['admin', 'team'].includes(req.user.role)) {
      return next(
        createError(403, 'Access denied. Admin or team rights required.')
      )
    }

    const { id } = req.params

    const reward = await Reward.findById(id)
    if (!reward || reward.isDeleted) {
      return next(createError(404, 'Reward not found'))
    }

    // Soft delete
    reward.isDeleted = true
    reward.status = 'inactive'
    reward.updatedBy = req.user.id
    await reward.save()

    res.status(200).json({
      status: 'success',
      message: 'Reward deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting reward:', error)
    next(createError(500, 'Failed to delete reward'))
  }
}

// ===============================================
// SERVICE-REWARD INTEGRATION ENDPOINTS
// ===============================================

// Get rewards for a specific service
export const getServiceRewards = async (req, res, next) => {
  try {
    const { serviceId } = req.params
    const { userPoints = 0 } = req.query

    // Validate service exists
    const service = await Service.findById(serviceId).populate('categoryId')
    if (!service || service.isDeleted) {
      return next(createError(404, 'Service not found'))
    }

    // Get rewards applicable to this service
    const rewards = await Reward.getRewardsForService(
      serviceId,
      service.categoryId._id,
      parseInt(userPoints),
      req.user.selectedLocation?.locationId
    )

    // Get user's monthly claim counts for each reward
    const userId = req.user.id
    const claimCounts = await Promise.all(
      rewards.map((reward) =>
        UserReward.getUserMonthlyClaimCount(userId, reward._id)
      )
    )

    // Enhance rewards with user-specific data and service pricing
    const enhancedRewards = rewards.map((reward, index) => {
      const servicePrice = service.calculatePrice()
      const discountAmount = reward.calculateDiscountForService(servicePrice)
      const finalPrice = Math.max(0, servicePrice - discountAmount)

      return {
        ...reward.toObject(),
        isAffordable: parseInt(userPoints) >= reward.pointCost,
        canClaim:
          parseInt(userPoints) >= reward.pointCost &&
          claimCounts[index] < reward.limit,
        userClaimsThisMonth: claimCounts[index],
        servicePrice: servicePrice,
        discountAmount: discountAmount,
        finalPrice: finalPrice,
        savingsPercentage:
          servicePrice > 0 ? (discountAmount / servicePrice) * 100 : 0,
      }
    })

    res.status(200).json({
      status: 'success',
      data: {
        service: {
          id: service._id,
          name: service.name,
          basePrice: service.basePrice,
          currentPrice: service.calculatePrice(),
          category: service.categoryId.name,
        },
        rewards: enhancedRewards,
        totalRewards: enhancedRewards.length,
        affordableRewards: enhancedRewards.filter((r) => r.canClaim).length,
      },
    })
  } catch (error) {
    console.error('Error fetching service rewards:', error)
    next(createError(500, 'Failed to fetch service rewards'))
  }
}

// Create service-specific reward
export const createServiceReward = async (req, res, next) => {
  try {
    // Check permissions
    if (!['admin', 'team'].includes(req.user.role)) {
      return next(
        createError(403, 'Access denied. Admin or team rights required.')
      )
    }

    const { serviceId } = req.params
    const rewardData = req.body

    // Validate service exists
    const service = await Service.findById(serviceId).populate('categoryId')
    if (!service || service.isDeleted) {
      return next(createError(404, 'Service not found'))
    }

    // Enhance reward data with service information
    const enhancedRewardData = {
      ...rewardData,
      serviceId: service._id,
      categoryId: service.categoryId._id,
      // Auto-generate name and description if not provided
      name:
        rewardData.name ||
        `${rewardData.value}${rewardData.type === 'discount' ? '%' : '$'} ${
          rewardData.type
        } for ${service.name}`,
      description:
        rewardData.description ||
        `Get ${rewardData.value}${rewardData.type === 'discount' ? '%' : '$'} ${
          rewardData.type
        } on ${service.name}`,
      createdBy: req.user.id,
    }

    // Add location if provided or use user's location
    if (rewardData.locationId) {
      enhancedRewardData.locationId = rewardData.locationId
    } else if (req.user.selectedLocation?.locationId) {
      enhancedRewardData.locationId = req.user.selectedLocation.locationId
    }

    const reward = await Reward.create(enhancedRewardData)

    // Update service reward stats
    await service.updateRewardStats(0, reward.type)

    res.status(201).json({
      status: 'success',
      message: 'Service reward created successfully',
      data: {
        reward,
        service: {
          id: service._id,
          name: service.name,
          category: service.categoryId.name,
        },
      },
    })
  } catch (error) {
    console.error('Error creating service reward:', error)
    next(createError(500, 'Failed to create service reward'))
  }
}

// Link existing reward to service(s)
export const linkRewardToServices = async (req, res, next) => {
  try {
    // Check permissions
    if (!['admin', 'team'].includes(req.user.role)) {
      return next(
        createError(403, 'Access denied. Admin or team rights required.')
      )
    }

    const { rewardId } = req.params
    const { serviceIds, replaceExisting = false } = req.body

    // Validate reward exists
    const reward = await Reward.findById(rewardId)
    if (!reward || reward.isDeleted) {
      return next(createError(404, 'Reward not found'))
    }

    // Validate services exist
    const services = await Service.find({
      _id: { $in: serviceIds },
      isDeleted: false,
    })

    if (services.length !== serviceIds.length) {
      return next(createError(400, 'One or more services not found'))
    }

    // Update reward with service associations
    if (replaceExisting) {
      reward.serviceIds = serviceIds
    } else {
      // Add to existing serviceIds without duplicates
      const existingIds = reward.serviceIds.map((id) => id.toString())
      const newIds = serviceIds.filter(
        (id) => !existingIds.includes(id.toString())
      )
      reward.serviceIds.push(...newIds)
    }

    reward.updatedBy = req.user.id
    await reward.save()

    // Update each service's reward stats
    for (const service of services) {
      await service.updateRewardStats(0, reward.type)
    }

    res.status(200).json({
      status: 'success',
      message: 'Reward linked to services successfully',
      data: {
        reward,
        linkedServices: services.map((s) => ({ id: s._id, name: s.name })),
      },
    })
  } catch (error) {
    console.error('Error linking reward to services:', error)
    next(createError(500, 'Failed to link reward to services'))
  }
}

// Get services with their available rewards
export const getServicesWithRewards = async (req, res, next) => {
  try {
    const {
      categoryId = '',
      search = '',
      page = 1,
      limit = 20,
      hasRewards = 'true',
    } = req.query

    // Build filter
    const filter = {
      status: 'active',
      isDeleted: false,
    }

    if (categoryId) {
      filter.categoryId = categoryId
    }

    if (hasRewards === 'true') {
      filter.hasActiveRewards = true
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ]
    }

    // Add location filter
    if (req.user.selectedLocation?.locationId) {
      filter.$or = filter.$or || []
      const locationFilter = {
        $or: [
          { locationId: req.user.selectedLocation.locationId },
          { locationId: { $exists: false } },
          { locationId: null },
        ],
      }
      if (filter.$or.length > 0) {
        filter.$and = [{ $or: filter.$or }, locationFilter]
        delete filter.$or
      } else {
        Object.assign(filter, locationFilter)
      }
    }

    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const skip = (pageNum - 1) * limitNum

    const [services, totalServices] = await Promise.all([
      Service.find(filter)
        .populate('categoryId', 'name color')
        .populate({
          path: 'availableRewards',
          match: { status: 'active', isDeleted: false },
          select: 'name type pointCost value displayValue',
        })
        .sort({ name: 1 })
        .skip(skip)
        .limit(limitNum),
      Service.countDocuments(filter),
    ])

    res.status(200).json({
      status: 'success',
      data: {
        services,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalServices / limitNum),
          totalServices,
          hasNext: pageNum < Math.ceil(totalServices / limitNum),
          hasPrev: pageNum > 1,
          limit: limitNum,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching services with rewards:', error)
    next(createError(500, 'Failed to fetch services with rewards'))
  }
}

// ===============================================
// ENHANCED REWARD MANAGEMENT
// ===============================================

// Enhanced get rewards catalog with service integration
export const getRewardsCatalog = async (req, res, next) => {
  try {
    const {
      search = '',
      type = '',
      serviceId = '',
      categoryId = '',
      sortBy = 'pointCost-low',
      page = 1,
      limit = 50,
    } = req.query

    const userId = req.user.id
    const userPoints = req.user.points || 0

    // Build filter for active rewards
    const filter = {
      status: 'active',
      isDeleted: false,
    }

    // Add location filter
    if (req.user.selectedLocation?.locationId) {
      filter.$or = [
        { locationId: req.user.selectedLocation.locationId },
        { locationId: { $exists: false } },
        { locationId: null },
      ]
    }

    // Service filter
    if (serviceId) {
      filter.$or = [{ serviceId: serviceId }, { serviceIds: serviceId }]
    }

    // Category filter
    if (categoryId) {
      filter.$or = filter.$or || []
      filter.$or.push({ categoryId: categoryId, appliesToCategory: true })
    }

    // Type filter
    if (type && type !== 'all') {
      filter.type = type
    }

    // Search filter
    if (search) {
      filter.$text = { $search: search }
    }

    // Build sort object
    let sortObject = {}
    switch (sortBy) {
      case 'pointCost-low':
        sortObject = { pointCost: 1 }
        break
      case 'pointCost-high':
        sortObject = { pointCost: -1 }
        break
      case 'value-high':
        sortObject = { value: -1 }
        break
      case 'name':
        sortObject = { name: 1 }
        break
      default:
        sortObject = { pointCost: 1 }
    }

    // Execute query with pagination
    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const skip = (pageNum - 1) * limitNum

    const [rewards, totalRewards] = await Promise.all([
      Reward.find(filter)
        .populate('serviceId', 'name basePrice')
        .populate('serviceIds', 'name basePrice')
        .populate('categoryId', 'name color')
        .sort(sortObject)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Reward.countDocuments(filter),
    ])

    // Get user's claimed rewards this month for each reward
    const claimCounts = await Promise.all(
      rewards.map((reward) =>
        UserReward.getUserMonthlyClaimCount(userId, reward._id)
      )
    )

    // Enhance rewards with user-specific data
    const enhancedRewards = rewards.map((reward, index) => ({
      ...reward,
      isAffordable: userPoints >= reward.pointCost,
      canClaim:
        userPoints >= reward.pointCost && claimCounts[index] < reward.limit,
      userClaimsThisMonth: claimCounts[index],
      pointsNeeded: Math.max(0, reward.pointCost - userPoints),
      canClaimMoreThisMonth: claimCounts[index] < reward.limit,
    }))

    res.status(200).json({
      status: 'success',
      data: {
        rewards: enhancedRewards,
        userPoints,
        affordableCount: enhancedRewards.filter((r) => r.canClaim).length,
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
    console.error('Error fetching rewards catalog:', error)
    next(createError(500, 'Failed to fetch rewards catalog'))
  }
}

// Enhanced claim reward with service integration
export const claimReward = async (req, res, next) => {
  try {
    console.log('=== CLAIM REWARD START ===')
    const { rewardId } = req.params
    const userId = req.user.id

    console.log('Claim request:', {
      rewardId,
      userId,
      userPoints: req.user.points,
    })

    // Get reward with service information
    console.log('Fetching reward with service data...')
    const reward = await Reward.findById(rewardId)
      .populate('serviceId', 'name basePrice categoryId')
      .populate('serviceIds', 'name basePrice categoryId')
      .populate('categoryId', 'name')

    if (!reward || reward.isDeleted || reward.status !== 'active') {
      return next(createError(404, 'Reward not found or inactive'))
    }

    // Get user (fresh from DB to ensure latest points)
    const user = await User.findById(userId)
    if (!user) {
      return next(createError(404, 'User not found'))
    }

    const userPoints = user.points || 0

    // Check if user can afford the reward
    if (userPoints < reward.pointCost) {
      const pointsNeeded = reward.pointCost - userPoints
      return next(
        createError(
          400,
          `Insufficient points. Need ${pointsNeeded} more points.`
        )
      )
    }

    // Check monthly limit
    const monthlyClaimCount = await UserReward.getUserMonthlyClaimCount(
      userId,
      rewardId
    )
    if (monthlyClaimCount >= reward.limit) {
      return next(createError(400, 'Monthly limit reached for this reward'))
    }

    // Check location restrictions
    const userLocation = req.user.selectedLocation?.locationId
    if (reward.locationId && userLocation !== reward.locationId) {
      return next(
        createError(400, 'This reward is not available at your location')
      )
    }

    // Spend points
    const pointResult = await spendPoints(
      userId,
      reward.pointCost,
      `Claimed reward: ${reward.name}`,
      'reward_claim',
      rewardId,
      userLocation
    )

    if (!pointResult.success) {
      return next(createError(400, pointResult.error))
    }

    // Prepare enhanced reward snapshot with service data
    const rewardSnapshot = {
      name: reward.name,
      description: reward.description,
      type: reward.type,
      pointCost: reward.pointCost,
      value: reward.value,
      validDays: reward.validDays,
      serviceId: reward.serviceId?._id || null,
      serviceName: reward.serviceId?.name || null,
      categoryId: reward.categoryId?._id || null,
      categoryName: reward.categoryId?.name || null,
    }

    // Create user reward record using the enhanced static method
    const userRewardData = {
      userId,
      rewardId,
      rewardSnapshot,
      locationId: userLocation,
    }

    const userReward = await UserReward.createUserReward(userRewardData)

    // Update reward statistics
    await Reward.findByIdAndUpdate(rewardId, {
      $inc: {
        redeemCount: 1,
        totalValue: reward.value,
      },
    })

    // Update service statistics if this is a service-specific reward
    if (reward.serviceId) {
      await reward.serviceId.updateRewardStats(reward.value, reward.type)
    }

    // Populate user reward for response
    await userReward.populate('rewardId')

    console.log('=== CLAIM REWARD SUCCESS ===')

    res.status(200).json({
      status: 'success',
      message: 'Reward claimed successfully!',
      data: {
        userReward,
        newPointBalance: pointResult.newBalance,
        pointsSpent: reward.pointCost,
        serviceInfo: reward.serviceId
          ? {
              id: reward.serviceId._id,
              name: reward.serviceId.name,
              basePrice: reward.serviceId.basePrice,
            }
          : null,
      },
    })
  } catch (error) {
    console.error('=== CLAIM REWARD ERROR ===')
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      rewardId: req.params.rewardId,
      userId: req.user?.id,
    })

    // Auto-refund on UserReward creation failure
    if (
      error.name === 'ValidationError' ||
      error.message.includes('UserReward')
    ) {
      console.log('🔄 UserReward creation failed, attempting refund...')
      try {
        const user = await User.findById(req.user.id)
        const reward = await Reward.findById(req.params.rewardId)

        if (user && reward) {
          await refundPoints(
            req.user.id,
            reward.pointCost,
            `Refund for failed reward claim: ${reward.name}`,
            null,
            req.user.selectedLocation?.locationId
          )
          console.log('✅ Points refunded successfully')
        }
      } catch (refundError) {
        console.error('❌ Failed to refund points:', refundError)
      }
    }

    next(createError(500, 'Failed to claim reward: ' + error.message))
  }
}

// Get user's claimed rewards
export const getUserRewards = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { status = 'all', page = 1, limit = 20 } = req.query

    // Build filter
    const filter = { userId }
    if (status !== 'all') {
      filter.status = status
    }

    // Add expiry filter for active rewards
    if (status === 'active') {
      filter.expiresAt = { $gt: new Date() }
    }

    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const skip = (pageNum - 1) * limitNum

    const [userRewards, totalRewards] = await Promise.all([
      UserReward.find(filter)
        .populate('rewardId')
        .sort({ claimedAt: -1 })
        .skip(skip)
        .limit(limitNum),
      UserReward.countDocuments(filter),
    ])

    // Separate by status
    const activeRewards = userRewards.filter((ur) => ur.isValid())
    const expiredRewards = userRewards.filter(
      (ur) => !ur.isValid() && ur.status !== 'used'
    )
    const usedRewards = userRewards.filter((ur) => ur.status === 'used')

    res.status(200).json({
      status: 'success',
      data: {
        userRewards,
        stats: {
          total: totalRewards,
          active: activeRewards.length,
          expired: expiredRewards.length,
          used: usedRewards.length,
        },
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
export const getPointHistory = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { page = 1, limit = 20, type = 'all' } = req.query

    // Build filter
    const filter = { userId }
    if (type !== 'all') {
      filter.type = type
    }

    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const skip = (pageNum - 1) * limitNum

    const [transactions, totalTransactions] = await Promise.all([
      PointTransaction.find(filter)
        .populate('processedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      PointTransaction.countDocuments(filter),
    ])

    // Get summary stats
    const [earnedResult, spentResult] = await Promise.all([
      PointTransaction.aggregate([
        {
          $match: {
            userId: req.user._id,
            type: { $in: ['earned', 'bonus', 'refund'] },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      PointTransaction.aggregate([
        { $match: { userId: req.user._id, type: 'spent' } },
        { $group: { _id: null, total: { $sum: { $abs: '$amount' } } } },
      ]),
    ])

    const totalEarned = earnedResult[0]?.total || 0
    const totalSpent = spentResult[0]?.total || 0

    res.status(200).json({
      status: 'success',
      data: {
        transactions,
        currentBalance: req.user.points || 0,
        summary: {
          totalEarned,
          totalSpent,
          netBalance: totalEarned - totalSpent,
        },
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
    console.error('Error fetching point history:', error)
    next(createError(500, 'Failed to fetch point history'))
  }
}

// ===============================================
// ADMIN POINT MANAGEMENT
// ===============================================

// Manually adjust user points (admin only)
export const adjustUserPoints = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return next(createError(403, 'Access denied. Admin rights required.'))
    }

    const { userId } = req.params
    const { type, amount, reason } = req.body

    if (!['add', 'remove', 'set'].includes(type)) {
      return next(createError(400, 'Invalid adjustment type'))
    }

    if (!amount || amount < 0) {
      return next(createError(400, 'Valid amount required'))
    }

    if (!reason || reason.trim().length === 0) {
      return next(createError(400, 'Reason is required'))
    }

    const user = await User.findById(userId)
    if (!user) {
      return next(createError(404, 'User not found'))
    }

    const currentBalance = user.points || 0
    let newBalance

    switch (type) {
      case 'add':
        newBalance = currentBalance + amount
        break
      case 'remove':
        newBalance = Math.max(0, currentBalance - amount)
        break
      case 'set':
        newBalance = amount
        break
    }

    // Update user's points
    await User.findByIdAndUpdate(userId, { points: newBalance })

    // Create transaction record
    await PointTransaction.create({
      userId,
      type: 'admin_adjustment',
      amount: newBalance - currentBalance,
      balance: newBalance,
      reason: `Admin adjustment: ${reason}`,
      referenceType: 'admin',
      adminNote: reason,
      processedBy: req.user.id,
      locationId: req.user.selectedLocation?.locationId,
    })

    res.status(200).json({
      status: 'success',
      message: 'Points adjusted successfully',
      data: {
        user: {
          id: userId,
          name: user.name,
          previousBalance: currentBalance,
          newBalance,
          adjustment: newBalance - currentBalance,
        },
      },
    })
  } catch (error) {
    console.error('Error adjusting user points:', error)
    next(createError(500, 'Failed to adjust user points'))
  }
}

// Get reward analytics/stats
export const getRewardStats = async (req, res, next) => {
  try {
    const { locationId } = req.query

    // Build filter based on location
    const filter = { isDeleted: false }
    if (locationId) {
      filter.$or = [
        { locationId: locationId },
        { locationId: { $exists: false } },
        { locationId: null },
      ]
    } else if (req.user.selectedLocation?.locationId) {
      filter.$or = [
        { locationId: req.user.selectedLocation.locationId },
        { locationId: { $exists: false } },
        { locationId: null },
      ]
    }

    const stats = await Reward.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalRewards: { $sum: 1 },
          activeRewards: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
          },
          totalClaims: { $sum: '$redeemCount' },
          totalValueGiven: { $sum: '$totalValue' },
          averagePointCost: { $avg: '$pointCost' },
        },
      },
    ])

    const typeStats = await Reward.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalClaims: { $sum: '$redeemCount' },
          averagePointCost: { $avg: '$pointCost' },
        },
      },
      {
        $sort: { count: -1 },
      },
    ])

    const result = stats[0] || {
      totalRewards: 0,
      activeRewards: 0,
      totalClaims: 0,
      totalValueGiven: 0,
      averagePointCost: 0,
    }

    res.status(200).json({
      status: 'success',
      data: {
        overview: {
          ...result,
          averagePointCost: Math.round(result.averagePointCost || 0),
          totalValueGiven: Math.round(result.totalValueGiven * 100) / 100,
        },
        typeBreakdown: typeStats,
      },
    })
  } catch (error) {
    console.error('Error fetching reward stats:', error)
    next(createError(500, 'Failed to fetch reward statistics'))
  }
}
