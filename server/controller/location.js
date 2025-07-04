import { createError } from '../error.js'
import Location from '../models/Location.js'

// Create a new location
export const createLocation = async (req, res, next) => {
  try {
    const { locationId, name, description } = req.body

    if (!locationId) {
      return next(createError(400, 'Location ID is required'))
    }

    // Check if user has admin permissions
    if (req.user.role !== 'admin') {
      return next(createError(403, 'Access denied. Admin rights required.'))
    }

    // Check if location ID already exists
    const existingLocation = await Location.findOne({ locationId })
    if (existingLocation) {
      return next(createError(400, 'Location ID already exists'))
    }

    const newLocation = await Location.create({
      locationId: locationId.trim(),
      name: name?.trim() || '',
      description: description?.trim() || '',
      addedBy: req.user.id,
    })

    res.status(201).json({
      status: 'success',
      message: 'Location added successfully',
      data: {
        location: newLocation,
      },
    })
  } catch (error) {
    console.error('Error creating location:', error)
    next(createError(500, 'Failed to create location'))
  }
}

// Get all locations
export const getAllLocations = async (req, res, next) => {
  try {
    // Check if user has admin permissions
    if (req.user.role !== 'admin') {
      return next(createError(403, 'Access denied. Admin rights required.'))
    }

    const { isActive, page = 1, limit = 50 } = req.query

    // Build query
    const query = {}
    if (isActive !== undefined) {
      query.isActive = isActive === 'true'
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const locations = await Location.find(query)
      .populate('addedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    const total = await Location.countDocuments(query)

    res.status(200).json({
      status: 'success',
      results: locations.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: {
        locations,
      },
    })
  } catch (error) {
    console.error('Error fetching locations:', error)
    next(createError(500, 'Failed to fetch locations'))
  }
}

// Get active location IDs only (for GHL API calls)
export const getActiveLocationIds = async (req, res, next) => {
  try {
    // Check if user has admin permissions
    if (req.user.role !== 'admin') {
      return next(createError(403, 'Access denied. Admin rights required.'))
    }

    const locations = await Location.find({ isActive: true })
      .select('locationId name')
      .sort({ createdAt: -1 })

    const locationIds = locations.map((loc) => loc.locationId)

    res.status(200).json({
      status: 'success',
      count: locationIds.length,
      data: {
        locationIds,
        locations,
      },
    })
  } catch (error) {
    console.error('Error fetching active location IDs:', error)
    next(createError(500, 'Failed to fetch active location IDs'))
  }
}

// Get a single location
export const getLocation = async (req, res, next) => {
  try {
    const { id } = req.params

    // Check if user has admin permissions
    if (req.user.role !== 'admin') {
      return next(createError(403, 'Access denied. Admin rights required.'))
    }

    const location = await Location.findById(id).populate(
      'addedBy',
      'name email'
    )

    if (!location) {
      return next(createError(404, 'Location not found'))
    }

    res.status(200).json({
      status: 'success',
      data: {
        location,
      },
    })
  } catch (error) {
    console.error('Error fetching location:', error)
    next(createError(500, 'Failed to fetch location'))
  }
}

// Update a location
export const updateLocation = async (req, res, next) => {
  try {
    const { id } = req.params
    const { locationId, name, description, isActive } = req.body

    // Check if user has admin permissions
    if (req.user.role !== 'admin') {
      return next(createError(403, 'Access denied. Admin rights required.'))
    }

    const location = await Location.findById(id)

    if (!location) {
      return next(createError(404, 'Location not found'))
    }

    // If updating locationId, check if new one already exists
    if (locationId && locationId.trim() !== location.locationId) {
      const existingLocation = await Location.findOne({
        locationId: locationId.trim(),
        _id: { $ne: id },
      })
      if (existingLocation) {
        return next(createError(400, 'Location ID already exists'))
      }
    }

    // Build update object
    const updateData = {}
    if (locationId) updateData.locationId = locationId.trim()
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description.trim()
    if (isActive !== undefined) updateData.isActive = isActive

    const updatedLocation = await Location.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate('addedBy', 'name email')

    res.status(200).json({
      status: 'success',
      message: 'Location updated successfully',
      data: {
        location: updatedLocation,
      },
    })
  } catch (error) {
    console.error('Error updating location:', error)
    next(createError(500, 'Failed to update location'))
  }
}

// Delete a location
export const deleteLocation = async (req, res, next) => {
  try {
    const { id } = req.params

    // Check if user has admin permissions
    if (req.user.role !== 'admin') {
      return next(createError(403, 'Access denied. Admin rights required.'))
    }

    const location = await Location.findById(id)

    if (!location) {
      return next(createError(404, 'Location not found'))
    }

    await Location.findByIdAndDelete(id)

    res.status(200).json({
      status: 'success',
      message: 'Location deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting location:', error)
    next(createError(500, 'Failed to delete location'))
  }
}

export const toggleLocationStatus = async (req, res, next) => {
  try {
    const { id } = req.params

    // Check if user has admin permissions
    if (req.user.role !== 'admin') {
      return next(createError(403, 'Access denied. Admin rights required.'))
    }

    const location = await Location.findById(id)

    if (!location) {
      return next(createError(404, 'Location not found'))
    }

    location.isActive = !location.isActive
    await location.save()

    res.status(200).json({
      status: 'success',
      message: `Location ${
        location.isActive ? 'activated' : 'deactivated'
      } successfully`,
      data: {
        location,
      },
    })
  } catch (error) {
    console.error('Error toggling location status:', error)
    next(createError(500, 'Failed to toggle location status'))
  }
}
