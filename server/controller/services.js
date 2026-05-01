// File: server/controller/services.js
// server/controller/services.js - Complete Enhanced with Reward Integration
import { createError } from '../error.js'
import Category from '../models/Category.js'
import Location from '../models/Location.js'
import Booking from '../models/Booking.js'
import Reward from '../models/Reward.js'
import Service from '../models/Service.js'
import UserReward from '../models/UserReward.js'

// ===============================================
// SERVICE MANAGEMENT (ENHANCED WITH REWARDS)
// ===============================================

const getUserLocationId = (user) =>
  user?.selectedLocation?.locationId || user?.spaLocation?.locationId || ''

const getUserAccessibleLocationIds = (user) => {
  const ids = new Set()
  if (user?.selectedLocation?.locationId) ids.add(user.selectedLocation.locationId)
  if (user?.spaLocation?.locationId) ids.add(user.spaLocation.locationId)
  if (Array.isArray(user?.assignedLocations)) {
    user.assignedLocations.forEach((location) => {
      if (location?.locationId) ids.add(location.locationId)
    })
  }
  return [...ids]
}

const canAccessLocation = (user, locationId) => {
  if (!locationId) return false
  if (['super-admin', 'admin'].includes(user?.role)) return true
  return getUserAccessibleLocationIds(user).includes(locationId)
}

const resolveManagementLocationId = (user, requestedLocationId = '') => {
  const normalizedLocationId = `${requestedLocationId || ''}`.trim()
  if (normalizedLocationId && canAccessLocation(user, normalizedLocationId)) {
    return normalizedLocationId
  }
  return getUserLocationId(user)
}

const applyLocationFilter = (filter, locationId) => {
  if (locationId) {
    // Multi-location users must see only the explicitly selected spa's data.
    filter.locationId = locationId
  }
}

const normalizeMembershipPricing = (pricingInput = []) => {
  if (!Array.isArray(pricingInput)) return []

  return pricingInput
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null

      const membershipPlanName =
        typeof entry.membershipPlanName === 'string'
          ? entry.membershipPlanName.trim()
          : ''
      const parsedPrice = Number(entry.price)
      if (!membershipPlanName || !Number.isFinite(parsedPrice) || parsedPrice < 0) {
        return null
      }

      const appliesToRaw =
        typeof entry.appliesTo === 'string'
          ? entry.appliesTo.trim().toLowerCase()
          : ''
      const appliesToMap = {
        'single session': 'single_session',
        single_session: 'single_session',
        bundle: 'bundle',
        'add on': 'add_on',
        add_on: 'add_on',
      }
      const appliesTo = appliesToMap[appliesToRaw] || 'single_session'

      return {
        membershipPlanId:
          typeof entry.membershipPlanId === 'string' &&
          entry.membershipPlanId.trim()
            ? entry.membershipPlanId.trim()
            : null,
        membershipPlanName,
        price: parsedPrice,
        appliesTo,
        minimumPurchase:
          typeof entry.minimumPurchase === 'string'
            ? entry.minimumPurchase.trim() || 'none'
            : 'none',
        usageLimit:
          typeof entry.usageLimit === 'string'
            ? entry.usageLimit.trim() || 'None'
            : 'None',
        notes:
          typeof entry.notes === 'string' ? entry.notes.trim() : '',
        isActive: entry.isActive !== false,
      }
    })
    .filter(Boolean)
}

// Get all services with filtering, sorting, and searching (enhanced with reward data)
// Fixed getService function in server/controller/services.js
export const getService = async (req, res, next) => {
  try {
    const { id } = req.params
    const { includeRewards = 'false', userPoints = 0 } = req.query

    // Base query with proper linked services population
    let serviceQuery = Service.findById(id)
      .populate('categoryId', 'name color description')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .populate({
        path: 'linkedServices.serviceId',
        select: 'name description basePrice duration image categoryId status',
        populate: {
          path: 'categoryId',
          select: 'name color',
        },
      })

    // REMOVED: Invalid availableRewards population
    // The availableRewards field doesn't exist in the Service schema
    // If you need rewards functionality, it should be implemented differently

    const service = await serviceQuery

    if (!service || service.isDeleted) {
      return next(createError(404, 'Service not found'))
    }

    // Transform linkedServices to include both linking data and service details
    const transformedService = service.toObject()
    if (
      transformedService.linkedServices &&
      transformedService.linkedServices.length > 0
    ) {
      transformedService.linkedServices = transformedService.linkedServices
        .filter((link) => link.serviceId && !link.serviceId.isDeleted) // Filter out deleted services
        .map((link) => ({
          // Linking metadata
          _id: link._id,
          serviceId: link.serviceId._id,
          customPrice: link.customPrice,
          customDuration: link.customDuration,
          order: link.order,
          isActive: link.isActive,
          addedAt: link.addedAt,

          // Full service details for display
          name: link.serviceId.name,
          description: link.serviceId.description,
          basePrice: link.serviceId.basePrice,
          duration: link.serviceId.duration,
          image: link.serviceId.image,
          categoryId: link.serviceId.categoryId,
          status: link.serviceId.status,

          // Computed fields
          finalPrice: link.customPrice || link.serviceId.basePrice,
          finalDuration: link.customDuration || link.serviceId.duration,
        }))
        .sort((a, b) => a.order - b.order) // Sort by order
    }

    // Handle reward data if requested (simplified without population errors)
    let rewardData = null
    if (includeRewards === 'true') {
      // TODO: Implement proper reward functionality if needed
      // For now, we'll skip rewards to avoid population errors
      rewardData = {
        totalRewards: 0,
        affordableRewards: 0,
        rewards: [],
        rewardStats: {
          totalRedemptions: service.totalRewardRedemptions || 0,
          totalSavings: service.rewardValueSaved || 0,
          averageSaving: 0,
          popularType: service.popularRewardType || null,
        },
      }
    }

    const response = {
      status: 'success',
      data: {
        service: transformedService,
        ...(rewardData && { rewards: rewardData }),
      },
    }

    res.status(200).json(response)
  } catch (error) {
    console.error('Error fetching service:', error)
    next(createError(500, 'Failed to fetch service'))
  }
}

export const getServiceReviews = async (req, res, next) => {
  try {
    const { id } = req.params
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
    const requestedLimit = Number.parseInt(req.query.limit, 10)
    const limit = Math.min(50, Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 3))
    const skip = (page - 1) * limit

    const service = await Service.findById(id).select('_id isDeleted')
    if (!service || service.isDeleted) {
      return next(createError(404, 'Service not found'))
    }

    const query = {
      serviceId: id,
      rating: { $exists: true, $ne: null },
      paymentStatus: 'paid',
      status: { $nin: ['cancelled'] },
    }

    const [reviews, totalReviews] = await Promise.all([
      Booking.find(query)
        .select('rating review ratedAt updatedAt createdAt serviceName')
        .populate('userId', 'name')
        .sort({ ratedAt: -1, updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Booking.countDocuments(query),
    ])

    res.status(200).json({
      status: 'success',
      data: {
        reviews: reviews.map((entry) => ({
          id: entry._id,
          rating: Number(entry.rating) || 0,
          review: `${entry.review || ''}`.trim(),
          ratedAt: entry.ratedAt || entry.updatedAt || entry.createdAt || null,
          serviceName: entry.serviceName || '',
          userName: `${entry?.userId?.name || ''}`.trim() || 'Anonymous',
        })),
        totalReviews,
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(totalReviews / limit) || 1,
          hasNextPage: page * limit < totalReviews,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching service reviews:', error)
    next(createError(500, 'Failed to fetch service reviews'))
  }
}

// Also fix getServices function
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
      hasRewards = '',
      includeRewards = 'false',
    } = req.query

    // Build filter object
    const filter = { isDeleted: false }

    applyLocationFilter(
      filter,
      resolveManagementLocationId(req.user, locationId)
    )

    // Category filter
    if (category) {
      filter.categoryId = category
    }

    // Status filter
    if (status) {
      filter.status = status
    }

    // Has rewards filter (simplified - based on hasActiveRewards field)
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

    // Build sort object
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

    // Base query with linked services population
    let servicesQuery = Service.find(finalFilter)
      .populate('categoryId', 'name color')
      .populate('createdBy', 'name')
      .populate({
        path: 'linkedServices.serviceId',
        select: 'name basePrice duration image status',
      })
      .sort(sortObject)
      .skip(skip)
      .limit(limitNum)

    // REMOVED: Invalid availableRewards population

    const [services, totalServices] = await Promise.all([
      servicesQuery.lean(),
      Service.countDocuments(finalFilter),
    ])

    // Transform services to include linked services count and details
    const transformedServices = services.map((service) => ({
      ...service,
      linkedServicesCount: service.linkedServices
        ? service.linkedServices.filter(
            (link) => link.serviceId && !link.serviceId?.isDeleted
          ).length
        : 0,
      linkedServices: service.linkedServices
        ? service.linkedServices
            .filter((link) => link.serviceId && !link.serviceId?.isDeleted)
            .map((link) => ({
              _id: link._id,
              serviceId: link.serviceId._id,
              name: link.serviceId.name,
              description: link.serviceId.description,
              basePrice: link.serviceId.basePrice,
              duration: link.serviceId.duration,
              image: link.serviceId.image,
              categoryId: link.serviceId.categoryId,
              status: link.serviceId.status,
              customPrice: link.customPrice,
              customDuration: link.customDuration,
              finalPrice: link.customPrice || link.serviceId.basePrice,
              finalDuration: link.customDuration || link.serviceId.duration,
            }))
        : [],
    }))

    // Get services with active discounts
    const discountedServices = transformedServices.filter((service) => {
      if (!service.discount?.active) return false
      const now = new Date()
      const startDate = service.discount.startDate
        ? new Date(service.discount.startDate)
        : new Date()
      const endDate = service.discount.endDate
        ? new Date(service.discount.endDate)
        : new Date()
      return now >= startDate && now <= endDate
    })

    // Get services with rewards
    const servicesWithRewards = transformedServices.filter(
      (service) => service.hasActiveRewards
    )

    // Calculate pagination info
    const totalPages = Math.ceil(totalServices / limitNum)
    const hasNext = pageNum < totalPages
    const hasPrev = pageNum > 1

    res.status(200).json({
      status: 'success',
      data: {
        services: transformedServices,
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
          active: transformedServices.filter((s) => s.status === 'active')
            .length,
          discounted: discountedServices.length,
          withRewards: servicesWithRewards.length,
          withAddOns: transformedServices.filter(
            (s) => s.linkedServicesCount > 0
          ).length,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching services:', error)
    next(createError(500, 'Failed to fetch services'))
  }
}

// Super-admin only: cross-platform services database
export const getServicesDatabase = async (req, res, next) => {
  try {
    const {
      search = '',
      category = '',
      status = '',
      locationId = '',
      page = 1,
      limit = 50,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
    } = req.query

    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const limitNum = Math.min(200, Math.max(10, parseInt(limit, 10) || 50))
    const skip = (pageNum - 1) * limitNum

    const filter = { isDeleted: false }
    const andConditions = []

    if (category) {
      filter.categoryId = category
    }

    if (status) {
      filter.status = status
    }

    if (locationId) {
      filter.locationId = locationId
    }

    if (search) {
      andConditions.push({
        $or: [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { locationId: { $regex: search, $options: 'i' } },
        ],
      })
    }

    if (andConditions.length > 0) {
      filter.$and = andConditions
    }

    const allowedSortFields = new Set([
      'name',
      'basePrice',
      'duration',
      'status',
      'bookings',
      'rating',
      'createdAt',
      'updatedAt',
    ])
    const safeSortBy = allowedSortFields.has(sortBy) ? sortBy : 'updatedAt'
    const safeSortOrder = sortOrder === 'asc' ? 1 : -1
    const sortObject = { [safeSortBy]: safeSortOrder, _id: -1 }

    const [services, total] = await Promise.all([
      Service.find(filter)
        .populate('categoryId', 'name color')
        .select(
          'name description categoryId basePrice duration status locationId bookings rating createdAt updatedAt'
        )
        .sort(sortObject)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Service.countDocuments(filter),
    ])

    const locationIds = [
      ...new Set(
        services
          .map((service) => service.locationId)
          .filter((value) => typeof value === 'string' && value.length > 0)
      ),
    ]

    const locations = locationIds.length
      ? await Location.find({ locationId: { $in: locationIds } })
          .select('locationId name')
          .lean()
      : []

    const locationMap = new Map(
      locations.map((location) => [location.locationId, location.name])
    )

    const enrichedServices = services.map((service) => ({
      ...service,
      locationName: service.locationId
        ? locationMap.get(service.locationId) || 'Unknown Location'
        : 'Global',
    }))

    const totalPages = Math.max(1, Math.ceil(total / limitNum))

    res.status(200).json({
      status: 'success',
      data: {
        services: enrichedServices,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalServices: total,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
          limit: limitNum,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching services database:', error)
    next(createError(500, 'Failed to fetch services database'))
  }
}

// Create new service (enhanced with reward initialization)
export const createService = async (req, res, next) => {
  try {
    // Check permissions
    if (!['super-admin', 'admin', 'spa', 'spa'].includes(req.user.role)) {
      return next(
        createError(403, 'Access denied. Admin or spa rights required.')
      )
    }

    const {
      name,
      description,
      categoryId,
      basePrice,
      duration,
      image,
      imagePublicId,
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
      membershipPricing = [],
      creditValue = 0,
      showPriceRange = false,
      offerDiscountListPrice = false,
      ghlCalendar = {},
      ghlService = {},
      ghlBooking = {},
    } = req.body

    // Validate required fields
    if (
      !name ||
      !description ||
      !categoryId ||
      basePrice === undefined ||
      basePrice === null ||
      !duration
    ) {
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
      imagePublicId: imagePublicId || '',
      status,
      discount: {
        percentage: discount.percentage || 0,
        startDate: discount.startDate || null,
        endDate: discount.endDate || null,
        active: discount.active || false,
      },
      limit: parseInt(limit),
      subTreatments,
      showPriceRange: Boolean(showPriceRange),
      offerDiscountListPrice: Boolean(offerDiscountListPrice),
      membershipPricing: normalizeMembershipPricing(membershipPricing),
      creditValue: Math.max(
        0,
        Number.isFinite(Number(creditValue)) ? Number(creditValue) : 0
      ),
      ghlCalendar: {
        calendarId: `${ghlCalendar.calendarId || ''}`.trim(),
        name: `${ghlCalendar.name || ''}`.trim(),
        timeZone: `${ghlCalendar.timeZone || ''}`.trim(),
        userId: `${ghlCalendar.userId || ''}`.trim(),
        teamId: `${ghlCalendar.teamId || ''}`.trim(),
      },
      ghlService: {
        serviceId: `${ghlService.serviceId || ''}`.trim(),
        name: `${ghlService.name || ''}`.trim(),
      },
      ghlBooking: {
        schedulingLink: `${ghlBooking.schedulingLink || ''}`.trim(),
        permanentLink: `${ghlBooking.permanentLink || ''}`.trim(),
        embedCode: `${ghlBooking.embedCode || ''}`.trim(),
      },
      createdBy: req.user.id,
      // ✅ NEW: Initialize reward fields
      rewardCount: 0,
      totalRewardRedemptions: 0,
      rewardValueSaved: 0,
      hasActiveRewards: false,
    }

    const resolvedLocationId = resolveManagementLocationId(req.user, locationId)
    if (!resolvedLocationId) {
      return next(createError(400, 'Location ID is required'))
    }
    serviceData.locationId = resolvedLocationId

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
    if (!['super-admin', 'admin', 'spa', 'spa'].includes(req.user.role)) {
      return next(
        createError(403, 'Access denied. Admin or spa rights required.')
      )
    }

    const { id } = req.params
    const updateData = { ...req.body }

    // Find existing service
    const existingService = await Service.findById(id)
    if (!existingService || existingService.isDeleted) {
      return next(createError(404, 'Service not found'))
    }
    if (
      existingService.locationId &&
      !canAccessLocation(req.user, existingService.locationId)
    ) {
      return next(createError(403, 'You cannot manage services for this location'))
    }
    if (updateData.locationId) {
      updateData.locationId = resolveManagementLocationId(
        req.user,
        updateData.locationId
      )
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

    // Handle linkedServices if being updated
    if (updateData.linkedServices && Array.isArray(updateData.linkedServices)) {
      // Filter out any invalid linked services
      updateData.linkedServices = updateData.linkedServices
        .filter((service) => {
          return service._id || service.serviceId || service.id
        })
        .map((service) => {
          // Normalize the linked service data
          const serviceId = service._id || service.serviceId || service.id
          return {
            serviceId: serviceId,
            customPrice: service.customPrice || service.basePrice || null,
            customDuration: service.customDuration || service.duration || null,
            order: service.order || 0,
            isActive: service.isActive !== undefined ? service.isActive : true,
            addedAt: service.addedAt || new Date(),
          }
        })
    }

    // Add update tracking
    updateData.updatedBy = req.user.id

    // Handle numeric fields safely
    if (updateData.basePrice !== undefined) {
      updateData.basePrice = parseFloat(updateData.basePrice) || 0
    }
    if (updateData.imagePublicId !== undefined) {
      updateData.imagePublicId = updateData.imagePublicId || ''
    }
    if (updateData.duration !== undefined) {
      updateData.duration = parseInt(updateData.duration) || 0
    }
    if (updateData.limit !== undefined) {
      updateData.limit = parseInt(updateData.limit) || 1
    }
    if (updateData.membershipPricing !== undefined) {
      updateData.membershipPricing = normalizeMembershipPricing(
        updateData.membershipPricing
      )
    }
    if (updateData.creditValue !== undefined) {
      updateData.creditValue = Math.max(
        0,
        Number.isFinite(Number(updateData.creditValue))
          ? Number(updateData.creditValue)
          : 0
      )
    }
    if (updateData.showPriceRange !== undefined) {
      updateData.showPriceRange = Boolean(updateData.showPriceRange)
    }
    if (updateData.offerDiscountListPrice !== undefined) {
      updateData.offerDiscountListPrice = Boolean(updateData.offerDiscountListPrice)
    }
    if (updateData.ghlCalendar !== undefined) {
      updateData.ghlCalendar = {
        calendarId: `${updateData.ghlCalendar?.calendarId || ''}`.trim(),
        name: `${updateData.ghlCalendar?.name || ''}`.trim(),
        timeZone: `${updateData.ghlCalendar?.timeZone || ''}`.trim(),
        userId: `${updateData.ghlCalendar?.userId || ''}`.trim(),
        teamId: `${updateData.ghlCalendar?.teamId || ''}`.trim(),
      }
    }
    if (updateData.ghlService !== undefined) {
      updateData.ghlService = {
        serviceId: `${updateData.ghlService?.serviceId || ''}`.trim(),
        name: `${updateData.ghlService?.name || ''}`.trim(),
      }
    }
    if (updateData.ghlBooking !== undefined) {
      updateData.ghlBooking = {
        schedulingLink: `${updateData.ghlBooking?.schedulingLink || ''}`.trim(),
        permanentLink: `${updateData.ghlBooking?.permanentLink || ''}`.trim(),
        embedCode: `${updateData.ghlBooking?.embedCode || ''}`.trim(),
      }
    }

    // Handle discount data safely
    if (updateData.discount) {
      updateData.discount = {
        percentage: parseFloat(updateData.discount.percentage) || 0,
        startDate: updateData.discount.startDate || null,
        endDate: updateData.discount.endDate || null,
        active: Boolean(updateData.discount.active),
      }
    }

    // Update the service
    const updatedService = await Service.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('categoryId', 'name color')
      .populate({
        path: 'linkedServices.serviceId',
        select: 'name description basePrice duration image categoryId status',
        populate: {
          path: 'categoryId',
          select: 'name color',
        },
      })

    if (!updatedService) {
      return next(createError(404, 'Service not found after update'))
    }

    // Handle reward status update (simplified)
    try {
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
    } catch (rewardError) {
      console.error('Error updating reward status:', rewardError)
      // Continue without failing the service update
    }

    const transformedService = updatedService.toObject()
    if (
      transformedService.linkedServices &&
      transformedService.linkedServices.length > 0
    ) {
      transformedService.linkedServices = transformedService.linkedServices
        .filter((link) => link.serviceId && !link.serviceId.isDeleted)
        .map((link) => ({
          _id: link._id,
          serviceId: link.serviceId._id,
          customPrice: link.customPrice,
          customDuration: link.customDuration,
          order: link.order,
          isActive: link.isActive,
          addedAt: link.addedAt,
          name: link.serviceId.name,
          description: link.serviceId.description,
          basePrice: link.serviceId.basePrice,
          duration: link.serviceId.duration,
          image: link.serviceId.image,
          categoryId: link.serviceId.categoryId,
          status: link.serviceId.status,
          finalPrice: link.customPrice || link.serviceId.basePrice,
          finalDuration: link.customDuration || link.serviceId.duration,
        }))
        .sort((a, b) => a.order - b.order)
    }

    res.status(200).json({
      status: 'success',
      message: 'Service updated successfully',
      data: {
        service: transformedService,
      },
    })
  } catch (error) {
    console.error('Error updating service:', error)

    // Handle specific MongoDB validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => err.message)
      return next(createError(400, `Validation error: ${errors.join(', ')}`))
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return next(createError(400, 'Service with this name already exists'))
    }

    next(createError(500, 'Failed to update service'))
  }
}

// Delete service (soft delete with reward cleanup)
export const deleteService = async (req, res, next) => {
  try {
    // Check permissions
    if (!['super-admin', 'admin', 'spa', 'spa'].includes(req.user.role)) {
      return next(
        createError(403, 'Access denied. Admin or spa rights required.')
      )
    }

    const { id } = req.params

    const service = await Service.findById(id)
    if (!service || service.isDeleted) {
      return next(createError(404, 'Service not found'))
    }
    if (service.locationId && !canAccessLocation(req.user, service.locationId)) {
      return next(createError(403, 'You cannot manage services for this location'))
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
      const resolvedLocationId = resolveManagementLocationId(req.user, locationId)
      const locationMatch = resolvedLocationId
        ? {
            $or: [
              { locationId: resolvedLocationId },
              { locationId: { $exists: false } },
              { locationId: null },
            ],
          }
        : {}

      const pipeline = [
        {
          $match: {
            isActive: true,
            isDeleted: false,
            ...locationMatch,
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

      applyLocationFilter(
        filter,
        resolveManagementLocationId(req.user, locationId)
      )

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
    if (!['super-admin', 'admin', 'spa', 'spa'].includes(req.user.role)) {
      return next(
        createError(403, 'Access denied. Admin or spa rights required.')
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

    const resolvedLocationId = resolveManagementLocationId(req.user, locationId)
    if (!resolvedLocationId) {
      return next(createError(400, 'Location ID is required'))
    }
    categoryData.locationId = resolvedLocationId

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
    if (!['super-admin', 'admin', 'spa', 'spa'].includes(req.user.role)) {
      return next(
        createError(403, 'Access denied. Admin or spa rights required.')
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
    if (!['super-admin', 'admin', 'spa', 'spa'].includes(req.user.role)) {
      return next(
        createError(403, 'Access denied. Admin or spa rights required.')
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

    const filter = { isDeleted: false }
    applyLocationFilter(
      filter,
      resolveManagementLocationId(req.user, locationId)
    )

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

    applyLocationFilter(filter, resolveManagementLocationId(req.user))

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

export const linkServicesToService = async (req, res, next) => {
  try {
    // Check permissions
    if (!['super-admin', 'admin', 'spa', 'spa'].includes(req.user.role)) {
      return next(
        createError(403, 'Access denied. Admin or spa rights required.')
      )
    }

    const { id } = req.params // Main service ID
    const { serviceIds, customPrices = {}, customDurations = {} } = req.body

    if (!serviceIds || !Array.isArray(serviceIds) || serviceIds.length === 0) {
      return next(createError(400, 'Service IDs array is required'))
    }

    // Find the main service
    const mainService = await Service.findById(id)
    if (!mainService || mainService.isDeleted) {
      return next(createError(404, 'Service not found'))
    }

    // Validate that services to be linked exist and are active
    const servicesToLink = await Service.find({
      _id: { $in: serviceIds },
      status: 'active',
      isDeleted: false,
    })

    if (servicesToLink.length !== serviceIds.length) {
      return next(
        createError(400, 'One or more services not found or inactive')
      )
    }

    // Prevent linking a service to itself
    if (serviceIds.includes(id)) {
      return next(createError(400, 'Cannot link a service to itself'))
    }

    const linkedCount = serviceIds.length
    let addedCount = 0

    // Add each service as a linked service
    for (const serviceId of serviceIds) {
      try {
        // Check if already linked
        const existingLink = mainService.linkedServices.find(
          (link) => link.serviceId.toString() === serviceId.toString()
        )

        if (!existingLink) {
          mainService.linkedServices.push({
            serviceId,
            customPrice: customPrices[serviceId] || null,
            customDuration: customDurations[serviceId] || null,
            order: mainService.linkedServices.length,
            isActive: true,
          })
          addedCount++
        }
      } catch (error) {
        console.error(`Error linking service ${serviceId}:`, error)
      }
    }

    await mainService.save()

    res.status(200).json({
      status: 'success',
      message: `Successfully linked ${addedCount} service(s) as add-ons`,
      data: {
        mainService: mainService.name,
        linkedCount: addedCount,
        totalLinkedServices: mainService.linkedServices.length,
      },
    })
  } catch (error) {
    console.error('Error linking services:', error)
    next(createError(500, 'Failed to link services'))
  }
}

// ✅ NEW: Unlink service from add-ons
export const unlinkServiceFromService = async (req, res, next) => {
  try {
    // Check permissions
    if (!['super-admin', 'admin', 'spa', 'spa'].includes(req.user.role)) {
      return next(
        createError(403, 'Access denied. Admin or spa rights required.')
      )
    }

    const { id, linkedServiceId } = req.params

    // Find the main service
    const mainService = await Service.findById(id)
    if (!mainService || mainService.isDeleted) {
      return next(createError(404, 'Service not found'))
    }

    // Remove the linked service
    const initialLength = mainService.linkedServices.length
    mainService.linkedServices = mainService.linkedServices.filter(
      (link) => link.serviceId.toString() !== linkedServiceId.toString()
    )

    if (mainService.linkedServices.length === initialLength) {
      return next(createError(404, 'Linked service not found'))
    }

    await mainService.save()

    res.status(200).json({
      status: 'success',
      message: 'Successfully unlinked service',
      data: {
        mainService: mainService.name,
        remainingLinkedServices: mainService.linkedServices.length,
      },
    })
  } catch (error) {
    console.error('Error unlinking service:', error)
    next(createError(500, 'Failed to unlink service'))
  }
}

// ✅ NEW: Get available services for linking
export const getAvailableAddOnServices = async (req, res, next) => {
  try {
    const { id } = req.params // Service ID to exclude
    const { search = '', category = '', locationId } = req.query

    // Build filter
    const filter = {
      status: 'active',
      isDeleted: false,
      _id: { $ne: id }, // Exclude the current service
    }

    applyLocationFilter(
      filter,
      resolveManagementLocationId(req.user, locationId)
    )

    // Category filter
    if (category) {
      filter.categoryId = category
    }

    // Search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ]
    }

    const availableServices = await Service.find(filter)
      .select(
        'name description basePrice duration image categoryId bookings rating'
      )
      .populate('categoryId', 'name color')
      .sort({ name: 1 })

    res.status(200).json({
      status: 'success',
      data: {
        services: availableServices,
        count: availableServices.length,
      },
    })
  } catch (error) {
    console.error('Error fetching available add-on services:', error)
    next(createError(500, 'Failed to fetch available services'))
  }
}

// ✅ NEW: Get service with populated linked services
export const getServiceWithLinkedServices = async (req, res, next) => {
  try {
    const { id } = req.params

    const service = await Service.findById(id)
      .populate('categoryId', 'name color description')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')

    if (!service || service.isDeleted) {
      return next(createError(404, 'Service not found'))
    }

    // Get linked services with full details
    const linkedServicesWithDetails = await service.getActiveLinkedServices()

    res.status(200).json({
      status: 'success',
      data: {
        service: {
          ...service.toObject(),
          linkedServicesDetails: linkedServicesWithDetails,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching service with linked services:', error)
    next(createError(500, 'Failed to fetch service'))
  }
}
