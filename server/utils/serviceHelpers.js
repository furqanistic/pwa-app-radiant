// File: server/utils/serviceHelpers.js
// server/utils/serviceHelpers.js
import Category from '../models/Category.js'
import Service from '../models/Service.js'

/**
 * Helper function to calculate discounted price
 */
export const calculateDiscountedPrice = (service) => {
  if (!service.discount.active || service.discount.percentage <= 0) {
    return service.basePrice
  }

  const now = new Date()
  const startDate = service.discount.startDate
    ? new Date(service.discount.startDate)
    : new Date()
  const endDate = service.discount.endDate
    ? new Date(service.discount.endDate)
    : new Date()

  if (now >= startDate && now <= endDate) {
    return (
      service.basePrice -
      (service.basePrice * service.discount.percentage) / 100
    )
  }

  return service.basePrice
}

/**
 * Helper function to check if discount is currently active
 */
export const isDiscountActive = (discount) => {
  if (!discount.active) return false

  const now = new Date()
  const startDate = discount.startDate
    ? new Date(discount.startDate)
    : new Date()
  const endDate = discount.endDate ? new Date(discount.endDate) : new Date()

  return now >= startDate && now <= endDate
}

/**
 * Helper function to format service data for frontend
 */
export const formatServiceForResponse = (service) => {
  const serviceObj = service.toObject ? service.toObject() : service

  return {
    ...serviceObj,
    discountedPrice: calculateDiscountedPrice(serviceObj),
    isDiscountActive: isDiscountActive(serviceObj.discount),
    categoryName: serviceObj.categoryId?.name || serviceObj.category?.name,
    subTreatmentCount: serviceObj.subTreatments?.length || 0,
  }
}

/**
 * Helper function to validate service availability
 */
export const checkServiceAvailability = async (
  serviceId,
  date,
  locationId = null
) => {
  try {
    const service = await Service.findById(serviceId)

    if (!service || service.status !== 'active' || service.isDeleted) {
      return { available: false, reason: 'Service not available' }
    }

    // Check if service is location-specific
    if (service.locationId && locationId && service.locationId !== locationId) {
      return {
        available: false,
        reason: 'Service not available at this location',
      }
    }

    // Here you could add more complex availability logic
    // For example, checking against bookings for the day
    // const bookingsForDay = await Booking.countDocuments({
    //   serviceId: serviceId,
    //   date: {
    //     $gte: startOfDay(date),
    //     $lte: endOfDay(date)
    //   },
    //   status: { $ne: 'cancelled' }
    // })

    // if (bookingsForDay >= service.limit) {
    //   return { available: false, reason: 'Service fully booked for this day' }
    // }

    return { available: true }
  } catch (error) {
    console.error('Error checking service availability:', error)
    return { available: false, reason: 'Error checking availability' }
  }
}

// ===============================================
// DATABASE SEEDING FUNCTIONS
// ===============================================

/**
 * Seed default categories
 */
export const seedCategories = async (adminUserId) => {
  try {
    const defaultCategories = [
      {
        name: 'Injectable',
        description:
          'Botox, dermal fillers, and other injectable treatments for anti-aging and enhancement',
        color: '#3B82F6',
        icon: 'syringe',
        order: 1,
      },
      {
        name: 'Facial',
        description:
          'Professional facial treatments, peels, and skincare services',
        color: '#10B981',
        icon: 'sparkles',
        order: 2,
      },
      {
        name: 'Laser',
        description:
          'Laser hair removal, skin resurfacing, and advanced laser treatments',
        color: '#F59E0B',
        icon: 'zap',
        order: 3,
      },
      {
        name: 'Massage',
        description:
          'Therapeutic massages, relaxation treatments, and body work',
        color: '#8B5CF6',
        icon: 'heart',
        order: 4,
      },
      {
        name: 'Body Treatment',
        description:
          'Body contouring, cellulite treatments, and body enhancement services',
        color: '#EF4444',
        icon: 'user',
        order: 5,
      },
    ]

    for (const categoryData of defaultCategories) {
      const existingCategory = await Category.findOne({
        name: categoryData.name,
        isDeleted: false,
      })

      if (!existingCategory) {
        await Category.create({
          ...categoryData,
          createdBy: adminUserId,
        })
        console.log(`✅ Created category: ${categoryData.name}`)
      } else {
        console.log(`ℹ️ Category already exists: ${categoryData.name}`)
      }
    }

    console.log('✅ Category seeding completed')
    return true
  } catch (error) {
    console.error('❌ Error seeding categories:', error)
    return false
  }
}

/**
 * Seed sample services
 */
export const seedSampleServices = async (adminUserId) => {
  try {
    // Get categories first
    const categories = await Category.find({ isDeleted: false })
    const categoryMap = {}
    categories.forEach((cat) => {
      categoryMap[cat.name] = cat._id
    })

    const sampleServices = [
      {
        name: 'Dermal Filler Treatment',
        description:
          'Professional dermal filler treatments for facial enhancement and anti-aging with natural-looking results.',
        categoryId: categoryMap['Injectable'],
        basePrice: 450,
        duration: 60,
        image:
          'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=500&h=300&fit=crop',
        status: 'active',
        discount: {
          percentage: 15,
          startDate: new Date('2024-12-01'),
          endDate: new Date('2024-12-31'),
          active: true,
        },
        limit: 5,
        subTreatments: [
          {
            name: 'Lip Filler',
            price: 350,
            duration: 45,
            description: 'Enhanced lip volume and definition',
          },
          {
            name: 'Jawline Filler',
            price: 550,
            duration: 60,
            description: 'Defined jawline and facial contouring',
          },
          {
            name: 'Cheek Filler',
            price: 450,
            duration: 50,
            description: 'Enhanced cheekbone definition',
          },
        ],
      },
      {
        name: 'HydraFacial Treatment',
        description:
          'Multi-step facial treatment that cleanses, extracts, and hydrates skin using patented technology.',
        categoryId: categoryMap['Facial'],
        basePrice: 180,
        duration: 90,
        image:
          'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=500&h=300&fit=crop',
        status: 'active',
        discount: {
          percentage: 20,
          startDate: new Date('2024-11-15'),
          endDate: new Date('2024-12-15'),
          active: true,
        },
        limit: 8,
        subTreatments: [
          {
            name: 'Classic HydraFacial',
            price: 150,
            duration: 60,
            description: 'Standard hydrating treatment',
          },
          {
            name: 'Deluxe HydraFacial',
            price: 200,
            duration: 75,
            description: 'Enhanced treatment with LED therapy',
          },
          {
            name: 'Platinum HydraFacial',
            price: 300,
            duration: 90,
            description: 'Premium treatment with lymphatic drainage',
          },
        ],
      },
      {
        name: 'Laser Hair Removal',
        description:
          'Permanent hair reduction using advanced laser technology for smooth, hair-free skin.',
        categoryId: categoryMap['Laser'],
        basePrice: 120,
        duration: 45,
        image:
          'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=500&h=300&fit=crop',
        status: 'active',
        limit: 6,
        subTreatments: [
          {
            name: 'Face Laser',
            price: 80,
            duration: 30,
            description: 'Facial hair removal',
          },
          {
            name: 'Legs Laser',
            price: 200,
            duration: 60,
            description: 'Full leg hair removal',
          },
          {
            name: 'Arms Laser',
            price: 120,
            duration: 45,
            description: 'Full arm hair removal',
          },
        ],
      },
    ]

    for (const serviceData of sampleServices) {
      const existingService = await Service.findOne({
        name: serviceData.name,
        isDeleted: false,
      })

      if (!existingService) {
        await Service.create({
          ...serviceData,
          createdBy: adminUserId,
          bookings: Math.floor(Math.random() * 50), // Random booking count
          rating: 4.5 + Math.random() * 0.5, // Random rating between 4.5-5.0
        })
        console.log(`✅ Created service: ${serviceData.name}`)
      } else {
        console.log(`ℹ️ Service already exists: ${serviceData.name}`)
      }
    }

    console.log('✅ Service seeding completed')
    return true
  } catch (error) {
    console.error('❌ Error seeding services:', error)
    return false
  }
}

/**
 * Main seeding function
 */
export const seedServiceData = async (adminUserId) => {
  console.log('🌱 Starting service data seeding...')

  try {
    await seedCategories(adminUserId)
    await seedSampleServices(adminUserId)

    console.log('🎉 Service data seeding completed successfully!')
    return true
  } catch (error) {
    console.error('💥 Service data seeding failed:', error)
    return false
  }
}

// ===============================================
// ANALYTICS HELPERS
// ===============================================

/**
 * Get popular services based on bookings
 */
export const getPopularServices = async (locationId = null, limit = 10) => {
  try {
    const filter = {
      status: 'active',
      isDeleted: false,
    }

    if (locationId) {
      filter.$or = [
        { locationId: locationId },
        { locationId: { $exists: false } },
        { locationId: null },
      ]
    }

    const popularServices = await Service.find(filter)
      .populate('categoryId', 'name color')
      .sort({ bookings: -1, rating: -1 })
      .limit(limit)
      .lean()

    return popularServices.map(formatServiceForResponse)
  } catch (error) {
    console.error('Error getting popular services:', error)
    return []
  }
}

/**
 * Get services on discount
 */
export const getDiscountedServices = async (locationId = null) => {
  try {
    const filter = {
      status: 'active',
      isDeleted: false,
      'discount.active': true,
    }

    if (locationId) {
      filter.$or = [
        { locationId: locationId },
        { locationId: { $exists: false } },
        { locationId: null },
      ]
    }

    const discountedServices = await Service.find(filter)
      .populate('categoryId', 'name color')
      .sort({ 'discount.percentage': -1 })
      .lean()

    // Filter for currently active discounts
    const now = new Date()
    return discountedServices
      .filter((service) => {
        const startDate = service.discount.startDate
          ? new Date(service.discount.startDate)
          : new Date()
        const endDate = service.discount.endDate
          ? new Date(service.discount.endDate)
          : new Date()
        return now >= startDate && now <= endDate
      })
      .map(formatServiceForResponse)
  } catch (error) {
    console.error('Error getting discounted services:', error)
    return []
  }
}
