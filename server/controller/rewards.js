// File: server/controller/rewards.js
// server/controller/rewards.js
import { createError } from '../error.js'
import PointTransaction from '../models/PointTransaction.js'
import Reward from '../models/Reward.js'
import User from '../models/User.js'
import UserReward from '../models/UserReward.js'
import { awardPoints } from '../utils/rewardHelpers.js'

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
// Create new reward
export const createReward = async (req, res, next) => {
  try {
    // Check permissions
    if (!['admin', 'spa'].includes(req.user.role)) {
      return next(
        createError(403, 'Access denied. Admin or spa rights required.')
      )
    }

    const {
      name,
      description,
      type,
      pointCost,
      value,
      image,
      imagePublicId,
      status = 'active',
      limit = 1,
      validDays = 30,
      maxValue,
      minPurchase,
      excludeServices = [],
      includeServices = [],
      locationId,
      voiceNoteUrl,
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
      imagePublicId: imagePublicId || '',
      status,
      limit: parseInt(limit),
      validDays: parseInt(validDays),
      createdBy: req.user.id,
      voiceNoteUrl: voiceNoteUrl || '',
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
    if (!['admin', 'spa'].includes(req.user.role)) {
      return next(
        createError(403, 'Access denied. Admin or spa rights required.')
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
    if (updateData.imagePublicId !== undefined)
      updateData.imagePublicId = updateData.imagePublicId || ''
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
    if (!['admin', 'spa'].includes(req.user.role)) {
      return next(
        createError(403, 'Access denied. Admin or spa rights required.')
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
    if (!['admin', 'spa'].includes(req.user.role)) {
      return next(
        createError(403, 'Access denied. Admin or spa rights required.')
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
    if (!['admin', 'spa'].includes(req.user.role)) {
      return next(
        createError(403, 'Access denied. Admin or spa rights required.')
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

// Enhanced get rewards catalog with service integration
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

// Replace your existing claimReward function with this:
// Replace your claimReward function with this inline version:
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

    // Get reward
    const reward = await Reward.findById(rewardId)
    if (!reward || reward.isDeleted || reward.status !== 'active') {
      return next(createError(404, 'Reward not found or inactive'))
    }

    // Get user (fresh from DB)
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

    // INLINE POINT DEDUCTION - No external function needed
    const newBalance = userPoints - reward.pointCost

    // Update user's points
    await User.findByIdAndUpdate(userId, { points: newBalance })

    // Create transaction record
    await PointTransaction.create({
      user: userId,
      type: 'reward',
      points: -reward.pointCost, // Negative for spending
      balance: newBalance,
      description: `Claimed reward: ${reward.name}`,
      reference: rewardId,
      referenceModel: 'UserReward',
      locationId: req.user.selectedLocation?.locationId,
      metadata: {
        previousBalance: userPoints,
        amountSpent: reward.pointCost,
        transactionType: 'debit',
      },
    })

    console.log('✅ Points deducted successfully:', {
      userId,
      amountSpent: reward.pointCost,
      previousBalance: userPoints,
      newBalance,
    })

    // Create reward snapshot
    const rewardSnapshot = {
      name: reward.name,
      description: reward.description,
      type: reward.type,
      pointCost: reward.pointCost,
      value: reward.value,
      validDays: reward.validDays,
    }

    // Create user reward record
    const userRewardData = {
      userId,
      rewardId,
      rewardSnapshot,
      locationId: req.user.selectedLocation?.locationId,
    }

    const userReward = await UserReward.createUserReward(userRewardData)

    // Update reward statistics
    await Reward.findByIdAndUpdate(rewardId, {
      $inc: {
        redeemCount: 1,
        totalValue: reward.value,
      },
    })

    console.log('=== CLAIM REWARD SUCCESS ===')

    res.status(200).json({
      status: 'success',
      message: 'Reward claimed successfully!',
      data: {
        userReward,
        newPointBalance: newBalance,
        pointsSpent: reward.pointCost,
        previousBalance: userPoints,
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

    // If UserReward creation failed, refund the points
    if (
      error.name === 'ValidationError' ||
      error.message.includes('UserReward')
    ) {
      console.log('🔄 UserReward creation failed, attempting refund...')
      try {
        const reward = await Reward.findById(req.params.rewardId)
        if (reward) {
          // Refund points by adding them back
          const user = await User.findById(req.user.id)
          const refundBalance = (user.points || 0) + reward.pointCost

          await User.findByIdAndUpdate(req.user.id, { points: refundBalance })

          // Create refund transaction
          await PointTransaction.create({
            user: req.user.id,
            type: 'refund',
            points: reward.pointCost,
            balance: refundBalance,
            description: `Refund for failed reward claim: ${reward.name}`,
            locationId: req.user.selectedLocation?.locationId,
          })

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
    const filter = { user: userId }
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
            user: req.user._id,
            type: { $in: ['earned', 'bonus', 'refund'] },
          },
        },
        { $group: { _id: null, total: { $sum: '$points' } } },
      ]),
      PointTransaction.aggregate([
        { $match: { user: req.user._id, type: 'spent' } },
        { $group: { _id: null, total: { $sum: { $abs: '$points' } } } },
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
    let result

    switch (type) {
      case 'add':
        result = await addPoints(
          userId,
          amount,
          `Admin adjustment: ${reason}`,
          'adjustment',
          null,
          req.user.selectedLocation?.locationId
        )
        break
      case 'remove':
        result = await spendPoints(
          userId,
          amount,
          `Admin adjustment: ${reason}`,
          'adjustment',
          null,
          req.user.selectedLocation?.locationId
        )
        break
      case 'set':
        const { setUserPoints } = await import('../utils/pointHelpers.js')
        result = await setUserPoints(
          userId,
          amount,
          `Admin adjustment: ${reason}`,
          req.user.id,
          req.user.selectedLocation?.locationId
        )
        break
    }

    if (!result.success) {
      return next(createError(400, result.error))
    }

    res.status(200).json({
      status: 'success',
      message: 'Points adjusted successfully',
      data: {
        user: {
          id: userId,
          name: user.name,
          previousBalance: result.previousBalance,
          newBalance: result.newBalance,
          adjustment: result.newBalance - result.previousBalance,
        },
      },
    })
  } catch (error) {
    console.error('Error adjusting user points:', error)
    next(createError(500, 'Failed to adjust user points'))
  }
}

// Get all rewards given to users at spa owner's location
export const getSpaUserRewards = async (req, res, next) => {
  try {
    const {
      status = 'all',
      type = 'all',
      page = 1,
      limit = 20,
      search = '',
      dateFrom,
      dateTo,
    } = req.query

    // Get spa owner's location
    let spaLocationId
    if (req.user.role === 'admin') {
      spaLocationId = req.query.locationId || req.params.locationId
      if (!spaLocationId) {
        return next(createError(400, 'Location ID required for admin'))
      }
    } else if (req.user.role === 'spa') {
      // spa users see rewards from their spa only
      if (!req.user.spaLocation?.locationId) {
        return next(createError(400, 'Your spa location is not configured'))
      }
      spaLocationId = req.user.spaLocation.locationId
    } else {
      return next(createError(403, 'Access denied'))
    }

    // Build filter
    const filter = { locationId: spaLocationId }

    // Status filter
    if (status !== 'all') {
      filter.status = status
    }

    // Type filter
    if (type !== 'all') {
      filter['rewardSnapshot.type'] = type
    }

    // Date range filter
    if (dateFrom || dateTo) {
      filter.claimedAt = {}
      if (dateFrom) filter.claimedAt.$gte = new Date(dateFrom)
      if (dateTo) filter.claimedAt.$lte = new Date(dateTo)
    }

    // Search filter (by user name or reward name)
    let searchQuery = {}
    if (search) {
      const searchUsers = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      }).select('_id')

      searchQuery = {
        $or: [
          { userId: { $in: searchUsers.map((u) => u._id) } },
          { 'rewardSnapshot.name': { $regex: search, $options: 'i' } },
        ],
      }
    }

    const finalFilter = search ? { ...filter, ...searchQuery } : filter

    // Pagination
    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const skip = (pageNum - 1) * limitNum

    const [userRewards, totalRewards] = await Promise.all([
      UserReward.find(finalFilter)
        .populate('userId', 'name email avatar')
        .populate('rewardId', 'name type')
        .populate('rewardSnapshot.gameId', 'title type')
        .sort({ claimedAt: -1 })
        .skip(skip)
        .limit(limitNum),
      UserReward.countDocuments(finalFilter),
    ])

    // Calculate stats
    const stats = {
      total: totalRewards,
      active: userRewards.filter((r) => r.status === 'active').length,
      used: userRewards.filter((r) => r.status === 'used').length,
      expired: userRewards.filter((r) => r.status === 'expired').length,
      gameRewards: userRewards.filter(
        (r) => r.rewardSnapshot.type === 'game_win'
      ).length,
      regularRewards: userRewards.filter(
        (r) => r.rewardSnapshot.type !== 'game_win'
      ).length,
    }

    res.status(200).json({
      status: 'success',
      data: {
        rewards: userRewards,
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
    console.error('Error fetching spa user rewards:', error)
    next(createError(500, 'Failed to fetch spa user rewards'))
  }
}

// Mark reward as used/redeemed (for spa owners when customer redeems)
export const markRewardAsUsed = async (req, res, next) => {
  try {
    const { userRewardId } = req.params
    const { actualValue, notes } = req.body

    const userReward = await UserReward.findById(userRewardId).populate(
      'userId',
      'name email'
    )

    if (!userReward) {
      return next(createError(404, 'User reward not found'))
    }

    // Check if user has permission to mark this reward as used
    if (req.user.role === 'admin') {
      // Admin can mark any reward as used
    } else if (req.user.role === 'spa') {
      // spa members can only mark rewards used at their spa
      if (!req.user.spaLocation?.locationId) {
        return next(createError(400, 'Your spa location is not configured'))
      }
      if (userReward.locationId !== req.user.spaLocation.locationId) {
        return next(
          createError(403, 'You can only manage rewards from your spa')
        )
      }
    } else {
      return next(createError(403, 'Access denied'))
    }

    // Check if reward is already used
    if (userReward.status === 'used') {
      return next(createError(400, 'Reward has already been used'))
    }

    // Check if reward is expired
    if (userReward.status === 'expired' || new Date() > userReward.expiresAt) {
      return next(createError(400, 'Reward has expired'))
    }

    // Mark as used
    const finalActualValue = actualValue || userReward.rewardSnapshot.value || 0
    await userReward.markAsUsed(finalActualValue)

    // Create point transaction for tracking (if applicable)
    if (userReward.rewardSnapshot.type === 'credit') {
      await PointTransaction.create({
        userId: userReward.userId,
        type: 'spent',
        amount: -finalActualValue,
        balance: (await User.findById(userReward.userId)).points,
        reason: `Used reward: ${userReward.rewardSnapshot.name}`,
        referenceType: 'reward_claim',
        referenceId: userReward._id,
        locationId: userReward.locationId,
      })
    }

    // Log the redemption
    console.log(`✅ Reward redeemed by spa staff:`, {
      userRewardId,
      userName: userReward.userId.name,
      rewardName: userReward.rewardSnapshot.name,
      actualValue: finalActualValue,
      redeemedBy: req.user.name,
      spaLocation: req.user.spaLocation?.locationName || 'Unknown',
    })

    res.status(200).json({
      status: 'success',
      message: 'Reward marked as used successfully',
      data: {
        userReward,
        redeemedBy: req.user.name,
        redeemedAt: new Date(),
        actualValue: finalActualValue,
        customer: {
          name: userReward.userId.name,
          email: userReward.userId.email,
        },
      },
    })
  } catch (error) {
    console.error('Error marking reward as used:', error)
    next(createError(500, 'Failed to mark reward as used'))
  }
}

// Get spa reward analytics
export const getSpaRewardAnalytics = async (req, res, next) => {
  try {
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
    } else {
      return next(createError(403, 'Access denied'))
    }

    const { dateFrom, dateTo } = req.query
    const dateFilter = {}
    if (dateFrom || dateTo) {
      dateFilter.claimedAt = {}
      if (dateFrom) dateFilter.claimedAt.$gte = new Date(dateFrom)
      if (dateTo) dateFilter.claimedAt.$lte = new Date(dateTo)
    }

    // Get all rewards for this spa
    const filter = { locationId: spaLocationId, ...dateFilter }

    const [totalStats, typeStats, statusStats, gameStats] = await Promise.all([
      // Total stats
      UserReward.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalRewards: { $sum: 1 },
            totalValue: { $sum: '$rewardSnapshot.value' },
            totalPointsSpent: { $sum: '$rewardSnapshot.pointCost' },
            avgRewardValue: { $avg: '$rewardSnapshot.value' },
            uniqueUsers: { $addToSet: '$userId' },
          },
        },
      ]),

      // Breakdown by reward type
      UserReward.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$rewardSnapshot.type',
            count: { $sum: 1 },
            totalValue: { $sum: '$rewardSnapshot.value' },
            totalPointsSpent: { $sum: '$rewardSnapshot.pointCost' },
          },
        },
        { $sort: { count: -1 } },
      ]),

      // Breakdown by status
      UserReward.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalValue: { $sum: '$rewardSnapshot.value' },
          },
        },
      ]),

      // Game-specific stats
      UserReward.aggregate([
        {
          $match: {
            ...filter,
            'rewardSnapshot.type': 'game_win',
          },
        },
        {
          $group: {
            _id: '$rewardSnapshot.gameType',
            count: { $sum: 1 },
            totalValue: { $sum: '$rewardSnapshot.value' },
            games: { $addToSet: '$rewardSnapshot.gameId' },
          },
        },
      ]),
    ])

    // Get active games for this spa
    const activeGames = await GameWheel.find({
      locationId: spaLocationId,
      isActive: true,
      isPublished: true,
    }).select('title type totalPlays totalRewardsGiven')

    const analytics = {
      overview: totalStats[0] || {
        totalRewards: 0,
        totalValue: 0,
        totalPointsSpent: 0,
        avgRewardValue: 0,
        uniqueUsers: [],
      },
      typeBreakdown: typeStats,
      statusBreakdown: statusStats,
      gameBreakdown: gameStats,
      activeGames,
      period: {
        from: dateFrom || null,
        to: dateTo || null,
      },
    }

    // Add unique users count
    analytics.overview.uniqueUsersCount =
      analytics.overview.uniqueUsers?.length || 0
    delete analytics.overview.uniqueUsers // Remove array, keep count

    res.status(200).json({
      status: 'success',
      data: { analytics },
    })
  } catch (error) {
    console.error('Error fetching spa reward analytics:', error)
    next(createError(500, 'Failed to fetch spa reward analytics'))
  }
}

// Give reward to user (spa owner can give manual rewards)
export const giveManulaRewardToUser = async (req, res, next) => {
  try {
    const { userId } = req.params
    const {
      rewardType = 'credit',
      value,
      description,
      pointCost = 0,
      validDays = 30,
    } = req.body

    // Check permissions
    if (!['admin', 'spa'].includes(req.user.role)) {
      return next(
        createError(403, 'Access denied. Admin or spa rights required.')
      )
    }

    // Get spa location
    let spaLocationId
    let spaLocationName
    if (req.user.role === 'admin') {
      spaLocationId = req.body.locationId
      spaLocationName = req.body.locationName || 'Admin Given'
    } else if (req.user.role === 'spa') {
      if (!req.user.spaLocation?.locationId) {
        return next(createError(400, 'Your spa location is not configured'))
      }
      spaLocationId = req.user.spaLocation.locationId
      spaLocationName = req.user.spaLocation.locationName
    }

    // Validate user exists
    const user = await User.findById(userId)
    if (!user) {
      return next(createError(404, 'User not found'))
    }

    // Validate required fields
    if (!value || value <= 0) {
      return next(createError(400, 'Valid reward value is required'))
    }

    if (!description || description.trim().length === 0) {
      return next(createError(400, 'Description is required'))
    }

    // Create manual reward
    const rewardSnapshot = {
      name: `Manual Reward - ${rewardType}`,
      description: description.trim(),
      type: rewardType,
      pointCost: pointCost,
      value: parseFloat(value),
      validDays: validDays,
    }

    const userRewardData = {
      userId,
      rewardId: null, // No specific reward ID for manual rewards
      rewardSnapshot,
      locationId: spaLocationId,
    }

    const userReward = await UserReward.createUserReward(userRewardData)

    // Log the manual reward
    console.log(`✅ Manual reward given:`, {
      userRewardId: userReward._id,
      userName: user.name,
      rewardType,
      value,
      givenBy: req.user.name,
      spaLocation: spaLocationName,
    })

    res.status(201).json({
      status: 'success',
      message: 'Manual reward given successfully',
      data: {
        userReward,
        recipient: {
          name: user.name,
          email: user.email,
        },
        givenBy: req.user.name,
        spaLocation: spaLocationName,
      },
    })
  } catch (error) {
    console.error('Error giving manual reward:', error)
    next(createError(500, 'Failed to give manual reward'))
  }
}

// Get pending rewards that need attention (active, about to expire)
export const getPendingSpaRewards = async (req, res, next) => {
  try {
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
    } else {
      return next(createError(403, 'Access denied'))
    }

    const now = new Date()
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)

    // Get active rewards that expire soon
    const expiringSoon = await UserReward.find({
      locationId: spaLocationId,
      status: 'active',
      expiresAt: { $lte: twoDaysFromNow, $gt: now },
    })
      .populate('userId', 'name email')
      .sort({ expiresAt: 1 })

    // Get all active rewards
    const activeRewards = await UserReward.find({
      locationId: spaLocationId,
      status: 'active',
      expiresAt: { $gt: now },
    })
      .populate('userId', 'name email')
      .sort({ expiresAt: 1 })

    // Get recent game wins (last 24 hours)
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const recentGameWins = await UserReward.find({
      locationId: spaLocationId,
      'rewardSnapshot.type': 'game_win',
      claimedAt: { $gte: yesterday },
    })
      .populate('userId', 'name email')
      .sort({ claimedAt: -1 })

    res.status(200).json({
      status: 'success',
      data: {
        expiringSoon: expiringSoon.slice(0, 10), // Top 10
        activeRewards: activeRewards.slice(0, 20), // Top 20
        recentGameWins: recentGameWins.slice(0, 10), // Last 10
        summary: {
          totalActive: activeRewards.length,
          expiringSoonCount: expiringSoon.length,
          recentWinsCount: recentGameWins.length,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching pending spa rewards:', error)
    next(createError(500, 'Failed to fetch pending rewards'))
  }
}

// File: server/controller/rewards.js - ENHANCED SECTIONS

// Search users for reward assignment
export const searchUsersForReward = async (req, res, next) => {
  try {
    const { search, locationId, limit = 10 } = req.query

    // Check permissions
    if (!['admin', 'spa'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    // Build search query
    const searchQuery = {
      isDeleted: false,
      role: 'user', // Only search regular users
    }

    // Add search filters
    if (search && search.trim()) {
      searchQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ]
    }

    // Location filter for spa members
    if (req.user.role === 'spa' && req.user.spaLocation?.locationId) {
      searchQuery['selectedLocation.locationId'] =
        req.user.spaLocation.locationId
    } else if (locationId) {
      searchQuery['selectedLocation.locationId'] = locationId
    }

    const users = await User.find(searchQuery)
      .select('name email phone avatar points selectedLocation createdAt')
      .limit(parseInt(limit))
      .sort({ name: 1 })

    res.status(200).json({
      status: 'success',
      data: {
        users,
        total: users.length,
      },
    })
  } catch (error) {
    console.error('Error searching users:', error)
    next(createError(500, 'Failed to search users'))
  }
}

// Enhanced give manual reward with notifications
export const giveManualRewardToUser = async (req, res, next) => {
  try {
    const { email } = req.params // Changed from userId to email
    const {
      rewardType = 'credit',
      value,
      description,
      reason,
      validDays = 30,
      notifyUser = true,
    } = req.body

    // Check permissions
    if (!['admin', 'spa'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    // Find user by email
    const user = await User.findOne({ email, isDeleted: false })
    if (!user) {
      return next(createError(404, 'User not found'))
    }

    // Get spa location
    let spaLocationId, spaLocationName
    if (req.user.role === 'admin') {
      spaLocationId = req.body.locationId || user.selectedLocation?.locationId
      spaLocationName =
        req.body.locationName || user.selectedLocation?.locationName || 'Admin'
    } else if (req.user.role === 'spa') {
      // spa members can only give rewards to users in their spa
      if (
        user.selectedLocation?.locationId !== req.user.spaLocation?.locationId
      ) {
        return next(
          createError(403, 'You can only give rewards to users in your spa')
        )
      }
      spaLocationId = req.user.spaLocation.locationId
      spaLocationName = req.user.spaLocation.locationName
    }

    // Validate required fields
    if (!value || value <= 0) {
      return next(createError(400, 'Valid reward value is required'))
    }

    if (!description || description.trim().length === 0) {
      return next(createError(400, 'Description is required'))
    }

    // Create manual reward snapshot
    const rewardSnapshot = {
      name: `Manual ${
        rewardType === 'credit'
          ? 'Credit'
          : rewardType === 'discount'
          ? 'Discount'
          : 'Reward'
      }`,
      description: description.trim(),
      type: rewardType,
      pointCost: 0, // Manual rewards are free
      value: parseFloat(value),
      validDays: validDays,
      isManual: true,
      givenBy: req.user.name,
      givenByRole: req.user.role,
      reason: reason || 'Manual reward',
    }

    // Create user reward
    const userRewardData = {
      userId: user._id,
      rewardId: null, // No specific reward ID for manual rewards
      rewardSnapshot,
      locationId: spaLocationId,
      status: 'active',
      isManualReward: true,
      givenBy: req.user._id,
    }

    const userReward = await UserReward.createUserReward(userRewardData)

    // Create point transaction record for tracking
    await PointTransaction.create({
      userId: user._id,
      type: 'bonus',
      amount: 0, // No points spent
      balance: user.points,
      reason: `Manual reward: ${description}`,
      referenceType: 'reward_manual',
      referenceId: userReward._id,
      metadata: {
        rewardType,
        value,
        givenBy: req.user.name,
        givenByRole: req.user.role,
      },
      locationId: spaLocationId,
      processedBy: req.user._id,
    })

    // Send notification to user
    if (notifyUser) {
      await createSystemNotification(
        user._id,
        '🎁 You received a reward!',
        `${spaLocationName} has given you a ${rewardType} reward worth ${
          rewardType === 'discount' ? `${value}%` : `$${value}`
        }. ${reason ? `Reason: ${reason}` : ''}`,
        {
          category: 'reward',
          priority: 'high',
          metadata: {
            type: 'manual_reward',
            rewardId: userReward._id,
            rewardType,
            value,
            givenBy: req.user.name,
            spaLocation: spaLocationName,
          },
        }
      )
    }

    // Log the manual reward
    console.log(`✅ Manual reward given:`, {
      userRewardId: userReward._id,
      userName: user.name,
      userEmail: user.email,
      rewardType,
      value,
      givenBy: req.user.name,
      spaLocation: spaLocationName,
    })

    res.status(201).json({
      status: 'success',
      message: 'Reward given successfully',
      data: {
        userReward,
        recipient: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
        },
        givenBy: req.user.name,
        spaLocation: spaLocationName,
      },
    })
  } catch (error) {
    console.error('Error giving manual reward:', error)
    next(createError(500, 'Failed to give manual reward'))
  }
}

// Bulk give rewards to multiple users
export const bulkGiveRewards = async (req, res, next) => {
  try {
    const {
      userEmails, // Array of emails
      rewardType = 'credit',
      value,
      description,
      reason,
      validDays = 30,
      notifyUsers = true,
    } = req.body

    if (!['admin', 'spa'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    if (!userEmails || !Array.isArray(userEmails) || userEmails.length === 0) {
      return next(createError(400, 'User emails are required'))
    }

    if (!value || value <= 0) {
      return next(createError(400, 'Valid reward value is required'))
    }

    // Find all users
    const users = await User.find({
      email: { $in: userEmails },
      isDeleted: false,
    })

    if (users.length === 0) {
      return next(createError(404, 'No valid users found'))
    }

    const results = []
    const errors = []

    // Process each user
    for (const user of users) {
      try {
        // Check spa location for spa members
        if (req.user.role === 'spa') {
          if (
            user.selectedLocation?.locationId !==
            req.user.spaLocation?.locationId
          ) {
            errors.push({
              email: user.email,
              error: 'User not in your spa',
            })
            continue
          }
        }

        // Create reward for user
        const rewardSnapshot = {
          name: `Bulk ${rewardType} Reward`,
          description: description || 'Bulk reward distribution',
          type: rewardType,
          pointCost: 0,
          value: parseFloat(value),
          validDays: validDays,
          isManual: true,
          givenBy: req.user.name,
          reason: reason || 'Bulk reward',
        }

        const userReward = await UserReward.createUserReward({
          userId: user._id,
          rewardId: null,
          rewardSnapshot,
          locationId:
            req.user.spaLocation?.locationId ||
            user.selectedLocation?.locationId,
          status: 'active',
          isManualReward: true,
          givenBy: req.user._id,
        })

        // Send notification
        if (notifyUsers) {
          await createSystemNotification(
            user._id,
            '🎁 You received a reward!',
            `You received a ${rewardType} reward worth ${
              rewardType === 'discount' ? `${value}%` : `$${value}`
            }. ${reason || ''}`,
            {
              category: 'reward',
              priority: 'high',
              metadata: {
                type: 'bulk_reward',
                rewardId: userReward._id,
                rewardType,
                value,
              },
            }
          )
        }

        results.push({
          email: user.email,
          name: user.name,
          success: true,
          rewardId: userReward._id,
        })
      } catch (error) {
        errors.push({
          email: user.email,
          error: error.message,
        })
      }
    }

    res.status(200).json({
      status: 'success',
      message: `Rewards given to ${results.length} users`,
      data: {
        successful: results,
        failed: errors,
        summary: {
          total: userEmails.length,
          succeeded: results.length,
          failed: errors.length,
        },
      },
    })
  } catch (error) {
    console.error('Error in bulk reward distribution:', error)
    next(createError(500, 'Failed to distribute bulk rewards'))
  }
}

// Get user's manual rewards
export const getUserManualRewards = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { page = 1, limit = 20 } = req.query

    const filter = {
      userId,
      isManualReward: true,
    }

    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const skip = (pageNum - 1) * limitNum

    const [manualRewards, totalRewards] = await Promise.all([
      UserReward.find(filter)
        .populate('givenBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      UserReward.countDocuments(filter),
    ])

    res.status(200).json({
      status: 'success',
      data: {
        rewards: manualRewards,
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
    console.error('Error fetching manual rewards:', error)
    next(createError(500, 'Failed to fetch manual rewards'))
  }
}

// Award one-time Google review points (lifetime)
export const awardGoogleReviewPoints = async (req, res, next) => {
  try {
    const userId = req.user.id
    const user = await User.findById(userId)

    if (!user) {
      return next(createError(404, 'User not found'))
    }

    if (user.reviewRewards?.googleReview?.awarded) {
      return next(createError(409, 'Google review reward already claimed'))
    }

    const locationId =
      user.selectedLocation?.locationId || user.spaLocation?.locationId || null

    if (!locationId) {
      return next(createError(400, 'No location selected for review reward'))
    }

    const reviewPoints = 10

    const awardResult = await awardPoints(
      userId,
      reviewPoints,
      'Google review reward',
      'bonus',
      null,
      locationId
    )

    if (!awardResult?.success) {
      return next(createError(500, 'Failed to award review points'))
    }

    user.reviewRewards = user.reviewRewards || {}
    user.reviewRewards.googleReview = {
      awarded: true,
      awardedAt: new Date(),
      locationId,
    }
    user.markModified('reviewRewards')
    await user.save()

    res.status(200).json({
      status: 'success',
      message: 'Google review points awarded',
      data: {
        pointsAwarded: reviewPoints,
        totalPoints: awardResult.totalPoints,
      },
    })
  } catch (error) {
    console.error('Error awarding Google review points:', error)
    next(createError(500, 'Failed to award Google review points'))
  }
}
