// File: server/controller/location.js - OPTIMIZED
import { createError } from '../error.js'
import Location from '../models/Location.js'

// Create a new location
export const createLocation = async (req, res, next) => {
  try {
    const { locationId, name, description, address, phone } = req.body

    if (!locationId) {
      return next(createError(400, 'Location ID is required'))
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
      address: address?.trim() || '',
      phone: phone?.trim() || '',
      addedBy: req.user.id,
    })

    res.status(201).json({
      status: 'success',
      message: 'Location added successfully',
      data: { location: newLocation },
    })
  } catch (error) {
    console.error('Error creating location:', error)
    next(createError(500, 'Failed to create location'))
  }
}

// Update a location
export const updateLocation = async (req, res, next) => {
  try {
    const { id } = req.params
    const { locationId, name, description, address, phone, isActive } = req.body

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
    if (address !== undefined) updateData.address = address.trim()
    if (phone !== undefined) updateData.phone = phone.trim()
    if (isActive !== undefined) updateData.isActive = isActive

    const updatedLocation = await Location.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate('addedBy', 'name email')

    res.status(200).json({
      status: 'success',
      message: 'Location updated successfully',
      data: { location: updatedLocation },
    })
  } catch (error) {
    console.error('Error updating location:', error)
    next(createError(500, 'Failed to update location'))
  }
}

// Get all locations (admin only)
export const getAllLocations = async (req, res, next) => {
  try {
    const { isActive, page = 1, limit = 50 } = req.query

    const query = {}
    if (isActive !== undefined) {
      query.isActive = isActive === 'true'
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)

    const [locations, total] = await Promise.all([
      Location.find(query)
        .populate('addedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Location.countDocuments(query),
    ])

    res.status(200).json({
      status: 'success',
      results: locations.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: { locations },
    })
  } catch (error) {
    console.error('Error fetching locations:', error)
    next(createError(500, 'Failed to fetch locations'))
  }
}

// Get active locations for users (public to authenticated users)
export const getActiveLocationsForUsers = async (req, res, next) => {
  try {
    const locations = await Location.find({
      isActive: true,
      name: { $ne: '', $exists: true, $ne: null },
    })
      .select('locationId name address phone')
      .sort({ name: 1 })

    const validLocations = locations.filter(
      (location) => location.name && location.name.trim() !== ''
    )

    res.status(200).json({
      status: 'success',
      results: validLocations.length,
      data: { locations: validLocations },
    })
  } catch (error) {
    console.error('Error fetching active locations:', error)
    next(createError(500, 'Failed to fetch locations'))
  }
}

// Get current user's location (Team/Manager only)
export const getMyLocation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    // Find user to get location ID
    // We could also pass locationId in query but it's safer to trust the user profile
    // However, to avoid circular deps we can just query Location by addedBy if possible?
    // No, addedBy is good. 
    // OR fetch user first.
    
    // Simpler: Find Location where addedBy = userId OR assume user knows their locationId
    // Let's use the pattern from availability controller: fetch User
    // But to avoid importing User (circular dep risk?), let's import it or use mongoose.model
    // actually location.js doesn't import User.
    
    // Alternative: The authenticated user's ID is in req.user.id. 
    // The Location model has `addedBy` field.
    const location = await Location.findOne({ addedBy: userId });
    
    if (!location) {
        return next(createError(404, 'No location found for this user'));
    }

    res.status(200).json({
      status: 'success',
      data: { location },
    })
  } catch (error) {
    console.error('Error fetching my location:', error)
    next(createError(500, 'Failed to fetch my location'))
  }
}

// Get active location IDs only (admin only)
export const getActiveLocationIds = async (req, res, next) => {
  try {
    const locations = await Location.find({ isActive: true })
      .select('locationId name')
      .sort({ createdAt: -1 })

    const locationIds = locations.map((loc) => loc.locationId)

    res.status(200).json({
      status: 'success',
      count: locationIds.length,
      data: { locationIds, locations },
    })
  } catch (error) {
    console.error('Error fetching active location IDs:', error)
    next(createError(500, 'Failed to fetch active location IDs'))
  }
}

// Get a single location (admin only)
export const getLocation = async (req, res, next) => {
  try {
    const { id } = req.params

    const location = await Location.findById(id).populate(
      'addedBy',
      'name email'
    )

    if (!location) {
      return next(createError(404, 'Location not found'))
    }

    res.status(200).json({
      status: 'success',
      data: { location },
    })
  } catch (error) {
    console.error('Error fetching location:', error)
    next(createError(500, 'Failed to fetch location'))
  }
}

// Delete a location (admin only)
export const deleteLocation = async (req, res, next) => {
  try {
    const { id } = req.params

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

// Toggle location status (admin only)
export const toggleLocationStatus = async (req, res, next) => {
  try {
    const { id } = req.params

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
      data: { location },
    })
  } catch (error) {
    console.error('Error toggling location status:', error)
    next(createError(500, 'Failed to toggle location status'))
  }
}
