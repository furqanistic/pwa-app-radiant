import { createError } from '../error.js';
import Location from '../models/Location.js';
import User from '../models/User.js';

// Helper to transform businessHours array from Location model to object for User model
const transformHoursFromModel = (hoursArray) => {
    const hoursObj = {};
    if (!hoursArray || !Array.isArray(hoursArray)) return hoursObj;
    
    hoursArray.forEach(item => {
        const dayKey = item.day.toLowerCase();
        hoursObj[dayKey] = {
            open: item.open || "09:00",
            close: item.close || "17:00",
            closed: item.isClosed || false
        };
    });
    return hoursObj;
}

// Create a new location
export const createLocation = async (req, res, next) => {
  try {
    const { locationId, name, description, address, phone, hours, coordinates, logo, subdomain, favicon, themeColor, membership } = req.body

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
      hours: hours || [],
      coordinates: coordinates || { latitude: null, longitude: null },
      logo: logo || '',
      subdomain: subdomain?.trim()?.toLowerCase() || null,
      favicon: favicon || '',
      themeColor: themeColor || '#ec4899',
      membership: membership || {
        isActive: false,
        price: 99,
        benefits: ['Priority Booking', 'Free Premium Facial', '15% Product Discount'],
        name: 'Gold Glow Membership',
        description: 'Unlock exclusive perks and premium benefits'
      },
      automatedGifts: req.body.automatedGifts || [
        { name: "New Years", content: "20% Off", isActive: false, type: "fixed-date", month: 1, day: 1 },
        { name: "St. Valentine's Day", content: "$30 Off", isActive: false, type: "fixed-date", month: 2, day: 14 },
        { name: "St. Patrick's Day", content: "25% Off", isActive: false, type: "fixed-date", month: 3, day: 17 },
        { name: "Easter Special", content: "10% Off", isActive: false, type: "fixed-date", month: 3, day: 31 },
        { name: "Halloween", content: "30% Off", isActive: false, type: "fixed-date", month: 10, day: 31 },
        { name: "Black Friday", content: "No Discount", isActive: false, type: "fixed-date", month: 11, day: 29 },
        { name: "Christmas", content: "10% Off", isActive: false, type: "fixed-date", month: 12, day: 25 },
        { name: "Birthday Special", content: "15% Off", isActive: false, type: "birthday" },
        { name: "Client Anniversary", content: "$50 Off", isActive: false, type: "anniversary" },
      ],
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
    const { locationId, name, description, address, phone, hours, isActive, coordinates, automatedGifts, logo, subdomain, favicon, themeColor, membership } = req.body

    const location = await Location.findById(id)
    if (!location) {
      return next(createError(404, 'Location not found'))
    }

    // RBAC: Spa owners can only update their own location
    if (req.user.role === 'spa') {
      const isOwnerByAddedBy = location.addedBy.toString() === req.user.id;
      const isOwnerByLocationId = location.locationId === req.user.spaLocation?.locationId;
      
      if (!isOwnerByAddedBy && !isOwnerByLocationId) {
        return next(createError(403, 'You can only update your own location'));
      }
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
    if (hours !== undefined) updateData.hours = hours
    if (isActive !== undefined) updateData.isActive = isActive
    if (coordinates !== undefined) updateData.coordinates = coordinates
    if (automatedGifts !== undefined) updateData.automatedGifts = automatedGifts
    if (logo !== undefined) updateData.logo = logo
    if (subdomain !== undefined) updateData.subdomain = subdomain ? subdomain.trim().toLowerCase() : null
    if (favicon !== undefined) updateData.favicon = favicon
    if (themeColor !== undefined) updateData.themeColor = themeColor
    if (membership !== undefined) updateData.membership = membership

    const updatedLocation = await Location.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate('addedBy', 'name email')

    // SYNC: Update associated spa users' profiles to match the new source of truth
    if (updatedLocation) {
        const spaUsers = await User.find({ 
            'spaLocation.locationId': updatedLocation.locationId,
            role: 'spa'
        });

        if (spaUsers.length > 0) {
            const syncData = {
                locationAddress: updatedLocation.address,
                locationPhone: updatedLocation.phone,
                coordinates: updatedLocation.coordinates,
                logo: updatedLocation.logo,
                subdomain: updatedLocation.subdomain,
                favicon: updatedLocation.favicon,
                themeColor: updatedLocation.themeColor,
                businessHours: transformHoursFromModel(updatedLocation.hours)
            };

            await Promise.all(spaUsers.map(async (user) => {
                user.spaLocation = {
                    ...user.spaLocation,
                    ...syncData
                };
                user.markModified('spaLocation');
                return user.save();
            }));
            console.log(`Synced ${spaUsers.length} spa user profiles for location ${updatedLocation.locationId}`);
        }

        // SYNC: Also update regular users who have this spa selected
        try {
            const regularUsersResult = await User.updateMany(
                { 
                    'selectedLocation.locationId': updatedLocation.locationId,
                    role: 'user'
                },
                { 
                    $set: { 
                        'selectedLocation.locationName': updatedLocation.name,
                        'selectedLocation.locationAddress': updatedLocation.address,
                        'selectedLocation.locationPhone': updatedLocation.phone,
                        'selectedLocation.logo': updatedLocation.logo,
                        'selectedLocation.subdomain': updatedLocation.subdomain,
                        'selectedLocation.favicon': updatedLocation.favicon,
                        'selectedLocation.themeColor': updatedLocation.themeColor
                    } 
                }
            );
            if (regularUsersResult.modifiedCount > 0) {
                console.log(`Synced ${regularUsersResult.modifiedCount} regular user profiles for location ${updatedLocation.locationId}`);
            }
        } catch (regularSyncError) {
            console.error('Error syncing regular users:', regularSyncError);
        }
    }

    res.status(200).json({
      status: 'success',
      message: 'Location updated successfully and synced with spa members',
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

    // RBAC: Spa owners only see their own locations
    if (req.user.role === 'spa') {
      query.addedBy = req.user.id
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
      .select('locationId name address phone hours coordinates logo subdomain favicon themeColor membership')
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
    const user = req.user;
    
    // Find location either by addedBy OR by the locationId in user's profile
    const location = await Location.findOne({ 
      $or: [
        { addedBy: userId },
        { locationId: user.spaLocation?.locationId }
      ]
    });
    
    if (!location) {
        console.log(`[getMyLocation] No location found for user ${userId}. SPA Location ID: ${user.spaLocation?.locationId}`);
        return next(createError(404, 'No location found for this user'));
    }

    // List of pre-defined template gifts
    const templateGifts = [
      { name: "New Years", content: "20% Off", isActive: false, type: "fixed-date", month: 1, day: 1 },
      { name: "St. Valentine's Day", content: "$30 Off", isActive: false, type: "fixed-date", month: 2, day: 14 },
      { name: "St. Patrick's Day", content: "25% Off", isActive: false, type: "fixed-date", month: 3, day: 17 },
      { name: "Easter Special", content: "10% Off", isActive: false, type: "fixed-date", month: 3, day: 31 },
      { name: "Halloween", content: "30% Off", isActive: false, type: "fixed-date", month: 10, day: 31 },
      { name: "Black Friday", content: "No Discount", isActive: false, type: "fixed-date", month: 11, day: 29 },
      { name: "Christmas", content: "10% Off", isActive: false, type: "fixed-date", month: 12, day: 25 },
      { name: "Birthday Special", content: "15% Off", isActive: false, type: "birthday" },
      { name: "Client Anniversary", content: "$50 Off", isActive: false, type: "anniversary" },
    ];

    // Ensure all templates exist in the location's automatedGifts
    let hasChanges = false;
    
    // If automatedGifts is empty or null, initialize it with all templates
    if (!location.automatedGifts || location.automatedGifts.length === 0) {
      location.automatedGifts = [...templateGifts];
      hasChanges = true;
    } else {
      // Otherwise, add any missing templates individually
      templateGifts.forEach(template => {
        const exists = location.automatedGifts.some(g => g.name === template.name);
        if (!exists) {
          location.automatedGifts.push(template);
          hasChanges = true;
        }
      });
    }

    if (hasChanges) {
      location.markModified('automatedGifts');
      await location.save();
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
