import stripe from '../config/stripe.js';
import { createError } from '../error.js';
import Location from '../models/Location.js';
import User from '../models/User.js';
import {
    DEFAULT_POINTS_METHODS,
    ensureLocationPointsSettings,
    mergePointsMethodsWithDefaults,
} from '../utils/pointsSettings.js';

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

const DEFAULT_MEMBERSHIP_PLAN = {
  name: 'Gold Glow Membership',
  description: 'Unlock exclusive perks and premium benefits',
  price: 99,
  benefits: ['Priority Booking', 'Free Premium Facial', '15% Product Discount'],
  currency: 'usd',
};

const toPlainObject = (value) =>
  value && typeof value.toObject === 'function' ? value.toObject() : value;

const normalizePlan = (planInput = {}, fallbackPlan = DEFAULT_MEMBERSHIP_PLAN) => {
  const base = toPlainObject(planInput) || {};
  const fallback = toPlainObject(fallbackPlan) || DEFAULT_MEMBERSHIP_PLAN;
  const normalizedBenefits = Array.isArray(base.benefits)
    ? base.benefits
        .map((item) => `${item || ''}`.trim())
        .filter(Boolean)
    : [];

  return {
    name: `${base.name || fallback.name || DEFAULT_MEMBERSHIP_PLAN.name}`.trim(),
    description: `${base.description || fallback.description || DEFAULT_MEMBERSHIP_PLAN.description}`.trim(),
    price: Math.max(
      0,
      Number.isFinite(Number(base.price)) ? Number(base.price) : Number(fallback.price || DEFAULT_MEMBERSHIP_PLAN.price)
    ),
    benefits: normalizedBenefits.length
      ? normalizedBenefits
      : [...(fallback.benefits || DEFAULT_MEMBERSHIP_PLAN.benefits)],
    currency: `${base.currency || fallback.currency || 'usd'}`.trim().toLowerCase(),
    stripeProductId: base.stripeProductId || fallback.stripeProductId || null,
    stripePriceId: base.stripePriceId || fallback.stripePriceId || null,
    syncedAt: base.syncedAt || fallback.syncedAt || null,
  };
};

const normalizeMembershipInput = (membershipInput, existingMembershipInput = {}) => {
  const incoming = toPlainObject(membershipInput) || {};
  const existing = toPlainObject(existingMembershipInput) || {};

  let plans = Array.isArray(incoming.plans) && incoming.plans.length > 0
    ? incoming.plans
    : null;

  if (!plans && (incoming.name || incoming.description || incoming.price !== undefined)) {
    plans = [incoming];
  }

  if (!plans && Array.isArray(existing.plans) && existing.plans.length > 0) {
    plans = existing.plans;
  }

  if (!plans && (existing.name || existing.description || existing.price !== undefined)) {
    plans = [existing];
  }

  if (!plans || plans.length === 0) {
    plans = [DEFAULT_MEMBERSHIP_PLAN];
  }

  const existingPlans = Array.isArray(existing.plans) ? existing.plans : [];
  const normalizedPlans = plans
    .slice(0, 3)
    .map((plan, index) => normalizePlan(plan, existingPlans[index] || existing || DEFAULT_MEMBERSHIP_PLAN));

  const firstPlan = normalizedPlans[0] || normalizePlan(DEFAULT_MEMBERSHIP_PLAN);

  return {
    isActive:
      incoming.isActive !== undefined
        ? Boolean(incoming.isActive)
        : Boolean(existing.isActive),
    plans: normalizedPlans,
    name: firstPlan.name,
    description: firstPlan.description,
    price: firstPlan.price,
    benefits: firstPlan.benefits,
    currency: firstPlan.currency || 'usd',
    stripeProductId: firstPlan.stripeProductId || null,
    stripePriceId: firstPlan.stripePriceId || null,
    syncedAt: firstPlan.syncedAt || null,
  };
};

const resolveSpaOwnerForLocation = async (location, currentUser) => {
  if (currentUser?.role === 'spa') {
    return (await User.findById(currentUser.id)) || currentUser;
  }

  return User.findOne({
    role: 'spa',
    'spaLocation.locationId': location.locationId,
  });
};

const syncMembershipWithStripe = async ({ membership, location, currentUser }) => {
  if (!membership) return membership;

  const normalizedMembership = normalizeMembershipInput(membership, location.membership);

  const spaOwner = await resolveSpaOwnerForLocation(location, currentUser);
  if (!spaOwner || !spaOwner.stripe?.accountId || !spaOwner.stripe?.chargesEnabled) {
    return normalizedMembership;
  }

  const stripeAccount = spaOwner.stripe.accountId;

  const existingPlans = Array.isArray(location.membership?.plans)
    ? location.membership.plans.map((plan) => toPlainObject(plan))
    : [];

  const syncedPlans = [];
  for (let index = 0; index < normalizedMembership.plans.length; index += 1) {
    const plan = normalizePlan(normalizedMembership.plans[index], normalizedMembership.plans[index]);
    const existingPlan = normalizePlan(
      existingPlans[index] || location.membership || DEFAULT_MEMBERSHIP_PLAN,
      DEFAULT_MEMBERSHIP_PLAN
    );
    const resolvedName = plan.name;
    const resolvedDescription = plan.description || '';
    const resolvedPrice = plan.price;
    const currency = plan.currency || 'usd';
    const nameChanged = resolvedName !== existingPlan.name;
    const descriptionChanged = resolvedDescription !== existingPlan.description;
    const priceChanged = resolvedPrice !== existingPlan.price;

    let stripeProductId = plan.stripeProductId || existingPlan.stripeProductId || null;
    let stripePriceId = plan.stripePriceId || existingPlan.stripePriceId || null;

    if (!stripeProductId) {
      const product = await stripe.products.create(
        {
          name: resolvedName,
          description: resolvedDescription,
          metadata: {
            type: 'membership',
            locationId: location.locationId,
            planIndex: `${index}`,
          },
        },
        { stripeAccount }
      );
      stripeProductId = product.id;
    } else if (nameChanged || descriptionChanged) {
      await stripe.products.update(
        stripeProductId,
        {
          name: resolvedName,
          description: resolvedDescription,
        },
        { stripeAccount }
      );
    }

    if (!stripePriceId || priceChanged) {
      const price = await stripe.prices.create(
        {
          product: stripeProductId,
          unit_amount: Math.round(resolvedPrice * 100),
          currency,
          recurring: { interval: 'month' },
        },
        { stripeAccount }
      );
      stripePriceId = price.id;
    }

    syncedPlans.push({
      ...plan,
      stripeProductId,
      stripePriceId,
      currency,
      syncedAt: new Date(),
    });
  }

  const firstPlan = syncedPlans[0] || normalizePlan(DEFAULT_MEMBERSHIP_PLAN);

  return {
    ...normalizedMembership,
    plans: syncedPlans,
    name: firstPlan.name,
    description: firstPlan.description,
    price: firstPlan.price,
    benefits: firstPlan.benefits,
    currency: firstPlan.currency || 'usd',
    stripeProductId: firstPlan.stripeProductId || null,
    stripePriceId: firstPlan.stripePriceId || null,
    syncedAt: firstPlan.syncedAt || null,
  };
};

// Create a new location
export const createLocation = async (req, res, next) => {
  try {
    const {
      locationId,
      name,
      description,
      address,
      phone,
      reviewLink,
      hours,
      coordinates,
      logo,
      logoPublicId,
      subdomain,
      favicon,
      faviconPublicId,
      themeColor,
      membership,
      pointsSettings,
    } = req.body

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
      reviewLink: reviewLink?.trim() || '',
      hours: hours || [],
      coordinates: coordinates || { latitude: null, longitude: null },
      logo: logo || '',
      logoPublicId: logoPublicId || '',
      subdomain: subdomain?.trim()?.toLowerCase() || null,
      favicon: favicon || '',
      faviconPublicId: faviconPublicId || '',
      themeColor: themeColor || '#ec4899',
      membership: normalizeMembershipInput(membership, {}),
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
      pointsSettings: {
        allMethodsBootstrapped: true,
        methods: mergePointsMethodsWithDefaults(pointsSettings?.methods || []),
      },
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
    const {
      locationId,
      name,
      description,
      address,
      phone,
      reviewLink,
      hours,
      isActive,
      coordinates,
      automatedGifts,
      pointsSettings,
      logo,
      logoPublicId,
      subdomain,
      favicon,
      faviconPublicId,
      themeColor,
      membership,
    } = req.body

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
    if (reviewLink !== undefined) updateData.reviewLink = reviewLink.trim()
    if (hours !== undefined) updateData.hours = hours
    if (isActive !== undefined) updateData.isActive = isActive
    if (coordinates !== undefined) updateData.coordinates = coordinates
    if (automatedGifts !== undefined) updateData.automatedGifts = automatedGifts
    if (pointsSettings !== undefined) {
      const incomingMethods = Array.isArray(pointsSettings?.methods)
        ? pointsSettings.methods.filter(Boolean)
        : null

      let finalMethods

      if (incomingMethods) {
        // The frontend always sends the full list of methods it rendered.
        // Trust it as the source of truth for isActive and pointsValue.
        const incomingByKey = new Map(
          incomingMethods
            .filter((m) => m?.key)
            .map((m) => [m.key, m])
        )

        // Append any brand-new default methods not in the payload as disabled.
        DEFAULT_POINTS_METHODS.forEach((def) => {
          if (!incomingByKey.has(def.key)) {
            incomingByKey.set(def.key, { ...def, isActive: false })
          }
        })

        finalMethods = Array.from(incomingByKey.values())
      } else {
        // No methods in payload — preserve existing
        finalMethods = Array.isArray(location.pointsSettings?.methods)
          ? location.pointsSettings.methods.map((m) =>
              typeof m?.toObject === 'function' ? m.toObject() : m
            )
          : []
      }

      console.log('[pointsSettings] Saving methods. Sample isActive values:',
        finalMethods.slice(0, 3).map(m => ({ key: m.key, isActive: m.isActive }))
      )

      // Use direct nested paths to avoid subdocument spread edge-cases.
      updateData['pointsSettings.methods'] = finalMethods
      updateData['pointsSettings.allMethodsBootstrapped'] = true
    }
    if (logo !== undefined) updateData.logo = logo
    if (logoPublicId !== undefined) updateData.logoPublicId = logoPublicId
    if (subdomain !== undefined) updateData.subdomain = subdomain ? subdomain.trim().toLowerCase() : null
    if (favicon !== undefined) updateData.favicon = favicon
    if (faviconPublicId !== undefined) updateData.faviconPublicId = faviconPublicId
    if (themeColor !== undefined) updateData.themeColor = themeColor
    if (membership !== undefined) {
      updateData.membership = await syncMembershipWithStripe({
        membership,
        location,
        currentUser: req.user,
      })
    }

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
                reviewLink: updatedLocation.reviewLink,
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
                        'selectedLocation.reviewLink': updatedLocation.reviewLink,
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

    const locationIds = locations.map((location) => location.locationId).filter(Boolean)
    const spaOwners = await User.find({
      role: 'spa',
      'spaLocation.locationId': { $in: locationIds },
    }).select('spaLocation.locationId stripe.accountId stripe.chargesEnabled stripe.detailsSubmitted')

    const spaOwnerByLocationId = new Map()
    spaOwners.forEach((owner) => {
      const locId = owner?.spaLocation?.locationId
      if (locId && !spaOwnerByLocationId.has(locId)) {
        spaOwnerByLocationId.set(locId, owner)
      }
    })

    const locationsWithStripeStatus = locations.map((locationDoc) => {
      const location = typeof locationDoc.toObject === 'function'
        ? locationDoc.toObject()
        : locationDoc
      const spaOwner = spaOwnerByLocationId.get(location.locationId)
      const stripeConnected = Boolean(
        spaOwner?.stripe?.accountId && spaOwner?.stripe?.chargesEnabled
      )

      let membershipStripeMessage = 'Stripe connected.'
      if (!spaOwner) {
        membershipStripeMessage = 'No spa account is linked to this location.'
      } else if (!spaOwner?.stripe?.accountId) {
        membershipStripeMessage = 'Spa user has not connected Stripe.'
      } else if (!spaOwner?.stripe?.chargesEnabled) {
        membershipStripeMessage = 'Stripe is connected but charges are not enabled yet.'
      }

      return {
        ...location,
        membershipStripeConnected: stripeConnected,
        membershipStripeMessage,
      }
    })

    res.status(200).json({
      status: 'success',
      results: locationsWithStripeStatus.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: { locations: locationsWithStripeStatus },
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
      .select('locationId name address phone reviewLink hours coordinates logo subdomain favicon themeColor membership')
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

// Get current user's location (spa/Manager only)
export const getMyLocation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = req.user;

    let location = null

    // Prefer the spa's configured location for spa users to avoid ambiguous matches.
    if (user.role === 'spa' && user.spaLocation?.locationId) {
      location = await Location.findOne({ locationId: user.spaLocation.locationId })
    }

    // For users/admin flows, prefer explicitly selected location when available.
    if (!location && user.selectedLocation?.locationId) {
      location = await Location.findOne({ locationId: user.selectedLocation.locationId })
    }

    // Fallback for management accounts with created locations.
    if (!location) {
      location = await Location.findOne({ addedBy: userId }).sort({ createdAt: -1 })
    }
    
    if (!location) {
        console.log(`[getMyLocation] No location found for user ${userId}. SPA Location ID: ${user.spaLocation?.locationId}`);
        return next(createError(404, 'No location found for this user'));
    }

    await ensureLocationPointsSettings(location)

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

    // Prevent stale reads from browser/proxy caches for this settings-heavy payload.
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    res.set('Pragma', 'no-cache')
    res.set('Expires', '0')
    res.set('Surrogate-Control', 'no-store')

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
