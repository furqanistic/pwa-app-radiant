// server/controller/services.js - Complete Enhanced with Reward Integration
import { createError } from '../error.js'
import Category from '../models/Category.js'
import Reward from '../models/Reward.js'
import Service from '../models/Service.js'
import { UserReward } from '../models/UserReward.js'

// ===============================================
// SERVICE MANAGEMENT (ENHANCED WITH REWARDS)
// ===============================================

// Get all services with filtering, sorting, and searching (enhanced with reward data)
export const getServices = async (req, res, next) => {
  try {
    const {
      search = '',
      category = '',
      status = '',
      sortBy = 'name',
      page = 1,
      limit = 50,
      locationId = null,
      hasRewards = '', // New filter for services with rewards
      includeRewards = 'false', // Include reward data in response
    } = req.query

    // Build filter object
    const filter = { isDeleted: false }

    // Location filter (if user has selected location or admin specifies)
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

    // Category filter
    if (category) {
      filter.categoryId = category
    }

    // Status filter
    if (status) {
      filter.status = status
    }

    // ✅ NEW: Has rewards filter
    if (hasRewards === 'true') {
      filter.hasActiveRewards = true
    } else if (hasRewards === 'false') {
      filter.hasActiveRewards = false
    }

    // Search filter
    let searchFilter = {}
    if (search) {
      searchFilter = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { 'subTreatments.name': { $regex: search, $options: 'i' } },
          { 'subTreatments.description': { $regex: search, $options: 'i' } },
        ],
      }
    }

    // Combine filters
    const finalFilter = search ? { ...filter, ...searchFilter } : filter

    // Build sort object (enhanced with reward-related sorting)
    let sortObject = {}
    switch (sortBy) {
      case 'name':
        sortObject = { name: 1 }
        break
      case 'price-low':
        sortObject = { basePrice: 1 }
        break
      case 'price-high':
        sortObject = { basePrice: -1 }
        break
      case 'duration':
        sortObject = { duration: 1 }
        break
      case 'rating':
        sortObject = { rating: -1 }
        break
      case 'bookings':
        sortObject = { bookings: -1 }
        break
      case 'created':
        sortObject = { createdAt: -1 }
        break
      // ✅ NEW: Reward-related sorting
      case 'rewards-count':
        sortObject = { rewardCount: -1 }
        break
      case 'rewards-redemptions':
        sortObject = { totalRewardRedemptions: -1 }
        break
      case 'rewards-savings':
        sortObject = { rewardValueSaved: -1 }
        break
      default:
        sortObject = { name: 1 }
    }

    // Execute query with pagination
    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const skip = (pageNum - 1) * limitNum

    // Base query
    let servicesQuery = Service.find(finalFilter)
      .populate('categoryId', 'name color')
      .populate('createdBy', 'name')
      .sort(sortObject)
      .skip(skip)
      .limit(limitNum)

    // ✅ NEW: Include rewards if requested
    if (includeRewards === 'true') {
      servicesQuery = servicesQuery.populate({
        path: 'availableRewards',
        match: { status: 'active', isDeleted: false },
        select: 'name type pointCost value displayValue status limit',
      })
    }

    const [services, totalServices] = await Promise.all([
      servicesQuery.lean(),
      Service.countDocuments(finalFilter),
    ])

    // Get services with active discounts
    const discountedServices = services.filter((service) => {
      if (!service.discount.active) return false
      const now = new Date()
      const startDate = service.discount.startDate
        ? new Date(service.discount.startDate)
        : new Date()
      const endDate = service.discount.endDate
        ? new Date(service.discount.endDate)
        : new Date()
      return now >= startDate && now <= endDate
    })

    // ✅ NEW: Get services with rewards
    const servicesWithRewards = services.filter(
      (service) => service.hasActiveRewards
    )

    // Calculate pagination info
    const totalPages = Math.ceil(totalServices / limitNum)
    const hasNext = pageNum < totalPages
    const hasPrev = pageNum > 1

    res.status(200).json({
      status: 'success',
      data: {
        services,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalServices,
          hasNext,
          hasPrev,
          limit: limitNum,
        },
        stats: {
          total: totalServices,
          active: services.filter((s) => s.status === 'active').length,
          discounted: discountedServices.length,
          withRewards: servicesWithRewards.length, // ✅ NEW
        },
      },
    })
  } catch (error) {
    console.error('Error fetching services:', error)
    next(createError(500, 'Failed to fetch services'))
  }
}

// Get single service by ID (enhanced with reward data)
export const getService = async (req, res, next) => {
  try {
    const { id } = req.params
    const { includeRewards = 'true', userPoints = 0 } = req.query

    // Base query
    let serviceQuery = Service.findById(id)
      .populate('categoryId', 'name color description')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')

    // ✅ NEW: Include available rewards
    if (includeRewards === 'true') {
      serviceQuery = serviceQuery.populate({
        path: 'availableRewards',
        match: { status: 'active', isDeleted: false },
        select:
          'name description type pointCost value displayValue status limit validDays',
      })
    }

    const service = await serviceQuery

    if (!service || service.isDeleted) {
      return next(createError(404, 'Service not found'))
    }

    // ✅ NEW: Get additional reward information if requested
    let rewardData = null
    if (includeRewards === 'true') {
      // Get all applicable rewards (direct + category + general)
      const applicableRewards = await service.getApplicableRewards(
        parseInt(userPoints),
        req.user.selectedLocation?.locationId
      )

      // Get user's monthly claim counts if user is authenticated
      let claimCounts = []
      if (req.user?.id && applicableRewards.length > 0) {
        claimCounts = await Promise.all(
          applicableRewards.map((reward) =>
            UserReward.getUserMonthlyClaimCount(req.user.id, reward._id)
          )
        )
      }

      // Enhance rewards with pricing and availability info
      const enhancedRewards = applicableRewards.map((reward, index) => {
        const servicePrice = service.calculatePrice()
        const discountAmount = reward.calculateDiscountForService(servicePrice)
        const finalPrice = Math.max(0, servicePrice - discountAmount)
        const userClaimsThisMonth = claimCounts[index] || 0

        return {
          ...reward.toObject(),
          isAffordable: parseInt(userPoints) >= reward.pointCost,
          canClaim:
            parseInt(userPoints) >= reward.pointCost &&
            userClaimsThisMonth < reward.limit,
          userClaimsThisMonth,
          servicePrice,
          discountAmount,
          finalPrice,
          savingsPercentage:
            servicePrice > 0 ? (discountAmount / servicePrice) * 100 : 0,
        }
      })

      rewardData = {
        totalRewards: enhancedRewards.length,
        affordableRewards: enhancedRewards.filter((r) => r.canClaim).length,
        rewards: enhancedRewards,
        rewardStats: {
          totalRedemptions: service.totalRewardRedemptions,
          totalSavings: service.rewardValueSaved,
          averageSaving:
            service.totalRewardRedemptions > 0
              ? service.rewardValueSaved / service.totalRewardRedemptions
              : 0,
          popularType: service.popularRewardType,
        },
      }
    }

    const response = {
      status: 'success',
      data: {
        service,
        ...(rewardData && { rewards: rewardData }),
      },
    }

    res.status(200).json(response)
  } catch (error) {
    console.error('Error fetching service:', error)
    next(createError(500, 'Failed to fetch service'))
  }
}

// Create new service (enhanced with reward initialization)
export const createService = async (req, res, next) => {
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
      categoryId,
      basePrice,
      duration,
      image,
      status = 'active',
      discount = { percentage: 0, active: false },
      limit = 1,
      subTreatments = [],
      locationId,
      // ✅ NEW: Initial reward settings
      createDefaultReward = false,
      defaultRewardType = 'discount',
      defaultRewardValue = 10,
      defaultRewardPoints = 100,
    } = req.body

    // Validate required fields
    if (!name || !description || !categoryId || !basePrice || !duration) {
      return next(
        createError(
          400,
          'Please provide all required fields: name, description, categoryId, basePrice, duration'
        )
      )
    }

    // Validate category exists
    const category = await Category.findById(categoryId)
    if (!category || category.isDeleted) {
      return next(createError(404, 'Category not found'))
    }

    // Validate subTreatments
    if (subTreatments.length > 0) {
      const invalidSubTreatments = subTreatments.filter(
        (st) => !st.name || !st.price || !st.duration || !st.description
      )
      if (invalidSubTreatments.length > 0) {
        return next(
          createError(
            400,
            'All sub-treatments must have name, price, duration, and description'
          )
        )
      }
    }

    // Create service data
    const serviceData = {
      name: name.trim(),
      description: description.trim(),
      categoryId,
      basePrice: parseFloat(basePrice),
      duration: parseInt(duration),
      image: image || '',
      status,
      discount: {
        percentage: discount.percentage || 0,
        startDate: discount.startDate || null,
        endDate: discount.endDate || null,
        active: discount.active || false,
      },
      limit: parseInt(limit),
      subTreatments,
      createdBy: req.user.id,
      // ✅ NEW: Initialize reward fields
      rewardCount: 0,
      totalRewardRedemptions: 0,
      rewardValueSaved: 0,
      hasActiveRewards: false,
    }

    // Add location if provided or use user's location
    if (locationId) {
      serviceData.locationId = locationId
    } else if (req.user.selectedLocation?.locationId) {
      serviceData.locationId = req.user.selectedLocation.locationId
    }

    const service = await Service.create(serviceData)

    // ✅ NEW: Create default reward if requested
    if (createDefaultReward) {
      try {
        const rewardData = {
          name: `${defaultRewardValue}${
            defaultRewardType === 'discount' ? '%' : '$'
          } off ${service.name}`,
          description: `Get ${defaultRewardValue}${
            defaultRewardType === 'discount' ? '%' : '$'
          } discount on ${service.name}`,
          type: defaultRewardType,
          pointCost: parseInt(defaultRewardPoints),
          value: parseFloat(defaultRewardValue),
          serviceId: service._id,
          categoryId: service.categoryId,
          status: 'active',
          validDays: 30,
          limit: 2,
          createdBy: req.user.id,
          locationId: serviceData.locationId,
        }

        const reward = await Reward.create(rewardData)

        // Update service to reflect that it has rewards
        await service.updateRewardStats(0, defaultRewardType)

        console.log(`✅ Created default reward for service: ${service.name}`)
      } catch (rewardError) {
        console.error('Failed to create default reward:', rewardError)
        // Continue without failing the service creation
      }
    }

    // Populate category info for response
    await service.populate('categoryId', 'name color')

    res.status(201).json({
      status: 'success',
      message: 'Service created successfully',
      data: {
        service,
        defaultRewardCreated: createDefaultReward,
      },
    })
  } catch (error) {
    console.error('Error creating service:', error)
    if (error.code === 11000) {
      return next(createError(400, 'Service with this name already exists'))
    }
    next(createError(500, 'Failed to create service'))
  }
}

// Update service (enhanced with reward sync)
export const updateService = async (req, res, next) => {
  try {
    // Check permissions
    if (!['admin', 'team'].includes(req.user.role)) {
      return next(
        createError(403, 'Access denied. Admin or team rights required.')
      )
    }

    const { id } = req.params
    const updateData = { ...req.body }

    // Find existing service
    const existingService = await Service.findById(id)
    if (!existingService || existingService.isDeleted) {
      return next(createError(404, 'Service not found'))
    }

    // Validate category if being updated
    if (updateData.categoryId) {
      const category = await Category.findById(updateData.categoryId)
      if (!category || category.isDeleted) {
        return next(createError(404, 'Category not found'))
      }
    }

    // Validate subTreatments if being updated
    if (updateData.subTreatments && updateData.subTreatments.length > 0) {
      const invalidSubTreatments = updateData.subTreatments.filter(
        (st) => !st.name || !st.price || !st.duration || !st.description
      )
      if (invalidSubTreatments.length > 0) {
        return next(
          createError(
            400,
            'All sub-treatments must have name, price, duration, and description'
          )
        )
      }
    }

    // Add update tracking
    updateData.updatedBy = req.user.id

    // Handle numeric fields
    if (updateData.basePrice)
      updateData.basePrice = parseFloat(updateData.basePrice)
    if (updateData.duration) updateData.duration = parseInt(updateData.duration)
    if (updateData.limit) updateData.limit = parseInt(updateData.limit)

    const updatedService = await Service.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate('categoryId', 'name color')

    // ✅ NEW: Update reward statistics if service status changed
    if (
      updateData.status === 'inactive' &&
      existingService.status === 'active'
    ) {
      // Service was deactivated - deactivate associated rewards
      await Reward.updateMany(
        {
          $or: [{ serviceId: id }, { serviceIds: id }],
          status: 'active',
        },
        {
          status: 'inactive',
          updatedBy: req.user.id,
        }
      )

      // Update service reward status
      updatedService.hasActiveRewards = false
      await updatedService.save()
    } else if (
      updateData.status === 'active' &&
      existingService.status === 'inactive'
    ) {
      // Service was reactivated - check if it should have active rewards
      const activeRewardsCount = await Reward.countDocuments({
        $or: [
          { serviceId: id },
          { serviceIds: id },
          { categoryId: updatedService.categoryId, appliesToCategory: true },
        ],
        status: 'active',
        isDeleted: false,
      })

      updatedService.hasActiveRewards = activeRewardsCount > 0
      await updatedService.save()
    }

    res.status(200).json({
      status: 'success',
      message: 'Service updated successfully',
      data: {
        service: updatedService,
      },
    })
  } catch (error) {
    console.error('Error updating service:', error)
    next(createError(500, 'Failed to update service'))
  }
}

// Delete service (soft delete with reward cleanup)
export const deleteService = async (req, res, next) => {
  try {
    // Check permissions
    if (!['admin', 'team'].includes(req.user.role)) {
      return next(
        createError(403, 'Access denied. Admin or team rights required.')
      )
    }

    const { id } = req.params

    const service = await Service.findById(id)
    if (!service || service.isDeleted) {
      return next(createError(404, 'Service not found'))
    }

    // ✅ NEW: Handle associated rewards
    const associatedRewards = await Reward.find({
      $or: [{ serviceId: id }, { serviceIds: id }],
      isDeleted: false,
    })

    if (associatedRewards.length > 0) {
      // Check if any rewards have been claimed and are still active
      const activeClaimedRewards = await UserReward.countDocuments({
        rewardId: { $in: associatedRewards.map((r) => r._id) },
        status: 'active',
        expiresAt: { $gt: new Date() },
      })

      if (activeClaimedRewards > 0) {
        return next(
          createError(
            400,
            `Cannot delete service with ${activeClaimedRewards} active claimed rewards. Please wait for rewards to expire or contact users.`
          )
        )
      }

      // Soft delete associated rewards
      await Reward.updateMany(
        {
          $or: [{ serviceId: id }, { serviceIds: id }],
        },
        {
          isDeleted: true,
          status: 'inactive',
          updatedBy: req.user.id,
        }
      )
    }

    // Soft delete service
    service.isDeleted = true
    service.status = 'inactive'
    service.hasActiveRewards = false
    service.updatedBy = req.user.id
    await service.save()

    res.status(200).json({
      status: 'success',
      message: 'Service deleted successfully',
      data: {
        deletedRewards: associatedRewards.length,
      },
    })
  } catch (error) {
    console.error('Error deleting service:', error)
    next(createError(500, 'Failed to delete service'))
  }
}

// ===============================================
// CATEGORY MANAGEMENT (UNCHANGED)
// ===============================================

// Get all categories
export const getCategories = async (req, res, next) => {
  try {
    const {
      includeCount = 'false',
      locationId,
      includeRewardStats = 'false',
    } = req.query

    let categories
    if (includeCount === 'true') {
      // Get categories with service counts
      const pipeline = [
        {
          $match: {
            isActive: true,
            isDeleted: false,
            ...(locationId && {
              $or: [
                { locationId: locationId },
                { locationId: { $exists: false } },
                { locationId: null },
              ],
            }),
          },
        },
        {
          $lookup: {
            from: 'services',
            let: { categoryId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$categoryId', '$$categoryId'] },
                  status: 'active',
                  isDeleted: false,
                },
              },
            ],
            as: 'services',
          },
        },
        {
          $addFields: {
            count: { $size: '$services' },
          },
        },
        {
          $sort: { order: 1, name: 1 },
        },
      ]

      // ✅ NEW: Add reward statistics if requested
      if (includeRewardStats === 'true') {
        pipeline.push(
          {
            $lookup: {
              from: 'rewards',
              let: { categoryId: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ['$categoryId', '$$categoryId'] },
                    status: 'active',
                    isDeleted: false,
                    appliesToCategory: true,
                  },
                },
              ],
              as: 'categoryRewards',
            },
          },
          {
            $addFields: {
              rewardCount: { $size: '$categoryRewards' },
              servicesWithRewards: {
                $size: {
                  $filter: {
                    input: '$services',
                    cond: { $eq: ['$$this.hasActiveRewards', true] },
                  },
                },
              },
            },
          }
        )
      }

      pipeline.push({
        $project: {
          services: 0, // Remove the services array, keep only count
          ...(includeRewardStats === 'true' ? {} : { categoryRewards: 0 }),
        },
      })

      categories = await Category.aggregate(pipeline)
    } else {
      // Get categories without counts
      const filter = {
        isActive: true,
        isDeleted: false,
      }

      if (locationId) {
        filter.$or = [
          { locationId: locationId },
          { locationId: { $exists: false } },
          { locationId: null },
        ]
      }

      categories = await Category.find(filter).sort({ order: 1, name: 1 })
    }

    res.status(200).json({
      status: 'success',
      data: {
        categories,
      },
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    next(createError(500, 'Failed to fetch categories'))
  }
}

// Create new category
export const createCategory = async (req, res, next) => {
  try {
    // Check permissions
    if (!['admin', 'team'].includes(req.user.role)) {
      return next(
        createError(403, 'Access denied. Admin or team rights required.')
      )
    }

    const {
      name,
      description = '',
      icon = '',
      color = '#3B82F6',
      order = 0,
      locationId,
    } = req.body

    if (!name) {
      return next(createError(400, 'Category name is required'))
    }

    // Check if category with same name exists
    const existingCategory = await Category.findOne({
      name: name.trim(),
      isDeleted: false,
    })
    if (existingCategory) {
      return next(createError(400, 'Category with this name already exists'))
    }

    const categoryData = {
      name: name.trim(),
      description: description.trim(),
      icon,
      color,
      order: parseInt(order),
      createdBy: req.user.id,
    }

    // Add location if provided or use user's location
    if (locationId) {
      categoryData.locationId = locationId
    } else if (req.user.selectedLocation?.locationId) {
      categoryData.locationId = req.user.selectedLocation.locationId
    }

    const category = await Category.create(categoryData)

    res.status(201).json({
      status: 'success',
      message: 'Category created successfully',
      data: {
        category,
      },
    })
  } catch (error) {
    console.error('Error creating category:', error)
    if (error.code === 11000) {
      return next(createError(400, 'Category with this name already exists'))
    }
    next(createError(500, 'Failed to create category'))
  }
}

// Update category
export const updateCategory = async (req, res, next) => {
  try {
    // Check permissions
    if (!['admin', 'team'].includes(req.user.role)) {
      return next(
        createError(403, 'Access denied. Admin or team rights required.')
      )
    }

    const { id } = req.params
    const updateData = { ...req.body }

    const existingCategory = await Category.findById(id)
    if (!existingCategory || existingCategory.isDeleted) {
      return next(createError(404, 'Category not found'))
    }

    // Check if name is being changed and if new name already exists
    if (updateData.name && updateData.name !== existingCategory.name) {
      const nameExists = await Category.findOne({
        name: updateData.name.trim(),
        isDeleted: false,
        _id: { $ne: id },
      })
      if (nameExists) {
        return next(createError(400, 'Category with this name already exists'))
      }
    }

    // Add update tracking
    updateData.updatedBy = req.user.id
    if (updateData.order) updateData.order = parseInt(updateData.order)

    const updatedCategory = await Category.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })

    res.status(200).json({
      status: 'success',
      message: 'Category updated successfully',
      data: {
        category: updatedCategory,
      },
    })
  } catch (error) {
    console.error('Error updating category:', error)
    next(createError(500, 'Failed to update category'))
  }
}

// Delete category (enhanced with reward cleanup)
export const deleteCategory = async (req, res, next) => {
  try {
    // Check permissions
    if (!['admin', 'team'].includes(req.user.role)) {
      return next(
        createError(403, 'Access denied. Admin or team rights required.')
      )
    }

    const { id } = req.params

    const category = await Category.findById(id)
    if (!category || category.isDeleted) {
      return next(createError(404, 'Category not found'))
    }

    // Check if category has services
    const servicesCount = await Service.countDocuments({
      categoryId: id,
      isDeleted: false,
    })

    if (servicesCount > 0) {
      return next(
        createError(400, 'Cannot delete category with existing services')
      )
    }

    // ✅ NEW: Check for category-wide rewards
    const categoryRewards = await Reward.find({
      categoryId: id,
      appliesToCategory: true,
      isDeleted: false,
    })

    if (categoryRewards.length > 0) {
      // Check if any category rewards have been claimed and are still active
      const activeClaimedRewards = await UserReward.countDocuments({
        rewardId: { $in: categoryRewards.map((r) => r._id) },
        status: 'active',
        expiresAt: { $gt: new Date() },
      })

      if (activeClaimedRewards > 0) {
        return next(
          createError(
            400,
            `Cannot delete category with ${activeClaimedRewards} active claimed category rewards.`
          )
        )
      }

      // Soft delete category rewards
      await Reward.updateMany(
        {
          categoryId: id,
          appliesToCategory: true,
        },
        {
          isDeleted: true,
          status: 'inactive',
          updatedBy: req.user.id,
        }
      )
    }

    // Soft delete
    category.isDeleted = true
    category.isActive = false
    category.updatedBy = req.user.id
    await category.save()

    res.status(200).json({
      status: 'success',
      message: 'Category deleted successfully',
      data: {
        deletedCategoryRewards: categoryRewards.length,
      },
    })
  } catch (error) {
    console.error('Error deleting category:', error)
    next(createError(500, 'Failed to delete category'))
  }
}

// ===============================================
// SERVICE ANALYTICS/STATS (ENHANCED WITH REWARDS)
// ===============================================

// Get service analytics/stats (enhanced with reward data)
export const getServiceStats = async (req, res, next) => {
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

    // ✅ ENHANCED: Service stats with reward data
    const stats = await Service.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalServices: { $sum: 1 },
          activeServices: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
          },
          totalBookings: { $sum: '$bookings' },
          averageRating: { $avg: '$rating' },
          averagePrice: { $avg: '$basePrice' },
          servicesWithDiscounts: {
            $sum: { $cond: ['$discount.active', 1, 0] },
          },
          // ✅ NEW: Reward-related stats
          servicesWithRewards: {
            $sum: { $cond: ['$hasActiveRewards', 1, 0] },
          },
          totalRewardRedemptions: { $sum: '$totalRewardRedemptions' },
          totalRewardValueSaved: { $sum: '$rewardValueSaved' },
          averageRewardSaving: { $avg: '$rewardValueSaved' },
        },
      },
    ])

    const categoryStats = await Service.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$categoryId',
          count: { $sum: 1 },
          totalBookings: { $sum: '$bookings' },
          averageRating: { $avg: '$rating' },
          // ✅ NEW: Reward stats per category
          servicesWithRewards: { $sum: { $cond: ['$hasActiveRewards', 1, 0] } },
          totalRewardRedemptions: { $sum: '$totalRewardRedemptions' },
          totalRewardSavings: { $sum: '$rewardValueSaved' },
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category',
        },
      },
      {
        $unwind: '$category',
      },
      {
        $project: {
          categoryName: '$category.name',
          count: 1,
          totalBookings: 1,
          averageRating: { $round: ['$averageRating', 1] },
          servicesWithRewards: 1,
          totalRewardRedemptions: 1,
          totalRewardSavings: { $round: ['$totalRewardSavings', 2] },
          rewardAdoptionRate: {
            $round: [
              {
                $multiply: [
                  { $divide: ['$servicesWithRewards', '$count'] },
                  100,
                ],
              },
              1,
            ],
          },
        },
      },
      {
        $sort: { count: -1 },
      },
    ])

    // ✅ NEW: Get top performing services by rewards
    const topRewardServices = await Service.find(filter)
      .select('name totalRewardRedemptions rewardValueSaved hasActiveRewards')
      .populate('categoryId', 'name')
      .sort({ totalRewardRedemptions: -1 })
      .limit(5)

    const result = stats[0] || {
      totalServices: 0,
      activeServices: 0,
      totalBookings: 0,
      averageRating: 0,
      averagePrice: 0,
      servicesWithDiscounts: 0,
      servicesWithRewards: 0,
      totalRewardRedemptions: 0,
      totalRewardValueSaved: 0,
      averageRewardSaving: 0,
    }

    res.status(200).json({
      status: 'success',
      data: {
        overview: {
          ...result,
          averageRating: Math.round(result.averageRating * 10) / 10,
          averagePrice: Math.round(result.averagePrice * 100) / 100,
          totalRewardValueSaved:
            Math.round(result.totalRewardValueSaved * 100) / 100,
          averageRewardSaving:
            Math.round(result.averageRewardSaving * 100) / 100,
          // ✅ NEW: Calculated percentages
          rewardAdoptionRate:
            result.totalServices > 0
              ? Math.round(
                  (result.servicesWithRewards / result.totalServices) * 100 * 10
                ) / 10
              : 0,
        },
        categoryBreakdown: categoryStats,
        topRewardServices, // ✅ NEW
      },
    })
  } catch (error) {
    console.error('Error fetching service stats:', error)
    next(createError(500, 'Failed to fetch service statistics'))
  }
}

// ===============================================
// NEW SERVICE-REWARD INTEGRATION ENDPOINTS
// ===============================================

// Get services with their available rewards
export const getServicesWithRewards = async (req, res, next) => {
  try {
    const {
      categoryId = '',
      search = '',
      page = 1,
      limit = 20,
      hasRewards = 'true',
      userPoints = 0,
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
      filter.$and = filter.$and || []
      filter.$and.push({
        $or: [
          { locationId: req.user.selectedLocation.locationId },
          { locationId: { $exists: false } },
          { locationId: null },
        ],
      })
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
          select: 'name type pointCost value displayValue limit',
        })
        .sort({ name: 1 })
        .skip(skip)
        .limit(limitNum),
      Service.countDocuments(filter),
    ])

    // Enhance services with reward pricing info
    const enhancedServices = await Promise.all(
      services.map(async (service) => {
        const serviceObj = service.toObject()

        if (
          serviceObj.availableRewards &&
          serviceObj.availableRewards.length > 0
        ) {
          const currentPrice = service.calculatePrice()

          // Calculate best possible discount
          let bestDiscount = 0
          let affordableRewards = 0

          for (const reward of serviceObj.availableRewards) {
            const discountAmount =
              reward.type === 'discount' || reward.type === 'service_discount'
                ? (currentPrice * reward.value) / 100
                : reward.type === 'credit'
                ? Math.min(reward.value, currentPrice)
                : reward.type === 'service' || reward.type === 'free_service'
                ? currentPrice
                : 0

            if (discountAmount > bestDiscount) {
              bestDiscount = discountAmount
            }

            if (parseInt(userPoints) >= reward.pointCost) {
              affordableRewards++
            }
          }

          serviceObj.bestPossiblePrice = Math.max(
            0,
            currentPrice - bestDiscount
          )
          serviceObj.maxSavings = bestDiscount
          serviceObj.maxSavingsPercentage =
            currentPrice > 0 ? (bestDiscount / currentPrice) * 100 : 0
          serviceObj.affordableRewardsCount = affordableRewards
        }

        return serviceObj
      })
    )

    res.status(200).json({
      status: 'success',
      data: {
        services: enhancedServices,
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

// Get rewards available for a specific service
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
          hasActiveDiscounts: service.isDiscountActive(),
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
