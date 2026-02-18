import { createError } from '../error.js'
import Booking from '../models/Booking.js'
import Service from '../models/Service.js'
import User from '../models/User.js'
import { fetchLocationCalendarEventsByDate } from './ghl.js'

// Helper to calculate slots
const generateSlots = (openTime, closeTime, duration, date) => {
  const slots = []
  const [openHour, openMinute] = openTime.split(':').map(Number)
  const [closeHour, closeMinute] = closeTime.split(':').map(Number)

  let current = new Date(date)
  current.setHours(openHour, openMinute, 0, 0)

  const end = new Date(date)
  end.setHours(closeHour, closeMinute, 0, 0)

  // Safety break to prevent infinite loops
  let safety = 0
  const MAX_SLOTS = 100

  while (current < end && safety < MAX_SLOTS) {
    const slotTime = current.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })

    // Calculate end time of this slot
    const slotEnd = new Date(current.getTime() + duration * 60000)

    if (slotEnd <= end) {
      slots.push({
        time: slotTime, // "9:00 AM"
        timestamp: new Date(current), // Date object for comparison
        endTime: new Date(slotEnd),
      })
    }

    // Interval - typically same as duration, or could be 30min fixed
    // For now using 30 min intervals if duration > 30, else duration
    // Actually, usually slots are offered at specific intervals (e.g. every 30 mins) regardless of duration
    // Let's stick to 30 min intervals for start times, unless duration is smaller?
    // User request: "time is random shifts" -> implies they want structured slots.
    // Let's default to 15 or 30 minute start intervals. Let's do 30m for now.
    current.setMinutes(current.getMinutes() + 30)
    safety++
  }

  return slots
}

export const getAvailability = async (req, res, next) => {
  try {
    const { locationId, date, serviceId } = req.query

    if (!locationId || !date || !serviceId) {
      return next(
        createError(400, 'Missing required parameters: locationId, date, serviceId')
      )
    }

    // 1. Get Service Duration
    const service = await Service.findById(serviceId)
    if (!service) {
      return next(createError(404, 'Service not found'))
    }
    const duration = service.duration || 60

    // 2. Get Location Business Hours (from Location Model)
    // We should query the Location model directly as it is the source of truth
    const Location = (await import('../models/Location.js')).default;
    const location = await Location.findOne({ locationId });

    if (!location) {
        return next(createError(404, 'Location not found'));
    }

    if (!location.hours || location.hours.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: { slots: [], reason: 'No business hours configured' },
      })
    }

    const queryDate = new Date(date)
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ]
    const dayName = days[queryDate.getDay()]
    const dayConfig = location.hours.find(h => h.day === dayName);

    if (!dayConfig || dayConfig.isClosed || !dayConfig.open || !dayConfig.close) {
      return res.status(200).json({
        status: 'success',
        data: { slots: [], reason: 'Closed on this day' },
      })
    }

    // 3. Generate All Possible Slots
    const potentialSlots = generateSlots(
      dayConfig.open,
      dayConfig.close,
      duration,
      queryDate
    )

    const hours = { open: dayConfig.open, close: dayConfig.close }; // For response consistency


    // 4. Fetch Existing Bookings
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const existingBookings = await Booking.find({
      locationId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ['cancelled', 'refused'] }, // Check status enum
    }).select('date time duration')

    // 5. Fetch GHL bookings for this location/date (optional fallback-safe integration)
    let externalEvents = []
    let externalSourceUnavailable = false
    if (process.env.GHL_LOCATION_API) {
      try {
        const ghlData = await fetchLocationCalendarEventsByDate(locationId, date)
        externalEvents = ghlData.events || []
      } catch (ghlError) {
        externalSourceUnavailable = true
        console.warn(
          `GHL availability fallback for location ${locationId}:`,
          ghlError.response?.data || ghlError.message
        )
      }
    }

    // 6. Filter Conflicts
    const availableSlots = potentialSlots
      .filter((slot) => {
        const slotStart = slot.timestamp
        const slotEnd = slot.endTime

        // Check against every existing booking
        const hasConflict = existingBookings.some((booking) => {
          // Parse booking time
          // Booking stores "time" string "10:00 AM" and "date" Date object
          // We need to reconstruct the full date range for the booking
          const bookingStart = new Date(booking.date)
          // The booking.date might be 00:00:00Z + time string?
          // Looking at model: date is Date, time is String.
          // Usually booking.date is accurate for the day.
          const [bTime, bPeriod] = booking.time.split(' ')
          const [bHourStr, bMinStr] = bTime.split(':')
          let bHour = parseInt(bHourStr)
          if (bPeriod === 'PM' && bHour !== 12) bHour += 12
          if (bPeriod === 'AM' && bHour === 12) bHour = 0
          
          bookingStart.setHours(bHour, parseInt(bMinStr), 0, 0)
          
          const bookingEnd = new Date(
            bookingStart.getTime() + booking.duration * 60000
          )

          // Conflict Logic:
          // New Slot Start < Existing Booking End AND New Slot End > Existing Booking Start
          return slotStart < bookingEnd && slotEnd > bookingStart
        })

        const hasExternalConflict = externalEvents.some((event) => {
          const externalStart = new Date(event.startTime)
          const externalEnd = new Date(event.endTime)

          if (
            Number.isNaN(externalStart.getTime()) ||
            Number.isNaN(externalEnd.getTime())
          ) {
            return false
          }

          return slotStart < externalEnd && slotEnd > externalStart
        })

        return !hasConflict && !hasExternalConflict
      })
      .map((s) => s.time)

    res.status(200).json({
      status: 'success',
      data: {
        slots: availableSlots,
        day: dayName,
        hours: { open: hours.open, close: hours.close },
        metadata: {
          localBookingsCount: existingBookings.length,
          externalBookingsCount: externalEvents.length,
          externalSourceUnavailable,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching availability:', error)
    next(createError(500, 'Failed to fetch availability'))
  }
}

export const updateAvailability = async (req, res, next) => {
  try {
    const { businessHours, birthdayGift, address, phone, reviewLink, latitude, longitude } = req.body
    
    // Permitted roles for managing their own location
    if (!['spa', 'spa'].includes(req.user.role)) {
        return next(createError(403, 'Only spa owners can update location details'))
    }

    const user = await User.findById(req.user.id)
    if (!user.spaLocation || !user.spaLocation.locationId) {
         return next(createError(400, 'No spa location configured'))
    }

    // 1. Update User Model
    if (businessHours) {
        user.spaLocation.businessHours = {
            ...user.spaLocation.businessHours,
            ...businessHours
        }
    }
    
    if (address !== undefined) user.spaLocation.locationAddress = address;
    if (phone !== undefined) user.spaLocation.locationPhone = phone;
    if (reviewLink !== undefined) user.spaLocation.reviewLink = reviewLink;
    
    // CRITICAL: Save coordinates to User model too
    if (latitude !== undefined || longitude !== undefined) {
        if (!user.spaLocation.coordinates) user.spaLocation.coordinates = {};
        if (latitude !== undefined) user.spaLocation.coordinates.latitude = latitude;
        if (longitude !== undefined) user.spaLocation.coordinates.longitude = longitude;
    }
    
    user.markModified('spaLocation');
    await user.save()

    // 2. Update Location model (Source of Truth)
    await import('../models/Location.js').then(async ({ default: Location }) => {
         const location = await Location.findOne({ locationId: user.spaLocation.locationId });
         if (location) {
             if (businessHours) location.hours = transformHoursForModel(businessHours);
             if (address !== undefined) location.address = address;
             if (phone !== undefined) location.phone = phone;
             if (reviewLink !== undefined) location.reviewLink = reviewLink;
             
             if (latitude !== undefined || longitude !== undefined) {
                 if (!location.coordinates) location.coordinates = {};
                 if (latitude !== undefined) location.coordinates.latitude = latitude;
                 if (longitude !== undefined) location.coordinates.longitude = longitude;
             }
             
             if (birthdayGift) {
                 if (!location.birthdayGift) location.birthdayGift = {};
                 if (birthdayGift.isActive !== undefined) location.birthdayGift.isActive = birthdayGift.isActive;
                 if (birthdayGift.giftType !== undefined) location.birthdayGift.giftType = birthdayGift.giftType;
                 if (birthdayGift.value !== undefined) location.birthdayGift.value = birthdayGift.value;
                 if (birthdayGift.serviceId !== undefined) location.birthdayGift.serviceId = birthdayGift.serviceId;
                 if (birthdayGift.message !== undefined) location.birthdayGift.message = birthdayGift.message;
                 if (birthdayGift.voiceNoteUrl !== undefined) location.birthdayGift.voiceNoteUrl = birthdayGift.voiceNoteUrl;
             }
             
             location.markModified('coordinates');
             location.markModified('birthdayGift');
             location.markModified('hours');
             await location.save();
         } else {
             console.warn(`Location not found for ID: ${user.spaLocation.locationId}`);
         }
    });

    res.status(200).json({
        status: 'success',
        data: {
            businessHours: user.spaLocation.businessHours,
            location: user.spaLocation,
            message: "Location and time settings updated successfully"
        }
    })

  } catch (error) {
    console.error('Error updating availability:', error)
    next(createError(500, 'Failed to update location details'))
  }
}

// Helper to transform businessHours object from User model to Hours array for Location model
const transformHoursForModel = (hoursObj) => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayMap = {
        'monday': 'Monday',
        'tuesday': 'Tuesday',
        'wednesday': 'Wednesday',
        'thursday': 'Thursday',
        'friday': 'Friday',
        'saturday': 'Saturday',
        'sunday': 'Sunday'
    };
    
    return days.map(day => ({
        day: dayMap[day],
        open: hoursObj[day]?.open || "09:00",
        close: hoursObj[day]?.close || "17:00",
        isClosed: hoursObj[day]?.closed || false
    }));
}
