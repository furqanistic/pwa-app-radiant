import { createError } from '../error.js'
import Service from '../models/Service.js'
import User from '../models/User.js'
import {
  getConflictsForWindow,
  getDailySchedulingContext,
  buildBookingWindow,
} from '../utils/bookingScheduling.js'
import { fetchCalendarFreeSlotsForDate, zonedDateTimeToUtc } from './ghl.js'

// Helper to calculate slots
const formatMinutesAsTime = (totalMinutes) => {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60)
  const hour24 = Math.floor(normalized / 60)
  const minutes = normalized % 60
  const suffix = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 || 12
  return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`
}

const getSlotInstant = (dateString, totalMinutes, timeZone = '') => {
  const hour = Math.floor(totalMinutes / 60)
  const minute = totalMinutes % 60
  const wallClock = `${dateString}T${String(hour).padStart(2, '0')}:${String(
    minute
  ).padStart(2, '0')}:00`

  if (timeZone) {
    return zonedDateTimeToUtc(wallClock, timeZone)
  }

  const date = parseDateOnly(dateString)
  date.setHours(hour, minute, 0, 0)
  return date
}

const generateSlots = (openTime, closeTime, duration, dateString, timeZone = '') => {
  const slots = []
  const [openHour, openMinute] = openTime.split(':').map(Number)
  const [closeHour, closeMinute] = closeTime.split(':').map(Number)
  const openMinutes = openHour * 60 + openMinute
  const closeMinutes = closeHour * 60 + closeMinute
  let currentMinutes = openMinutes

  // Safety break to prevent infinite loops
  let safety = 0
  const MAX_SLOTS = 100

  while (currentMinutes < closeMinutes && safety < MAX_SLOTS) {
    const slotStart = getSlotInstant(dateString, currentMinutes, timeZone)
    const slotEnd = new Date(slotStart.getTime() + duration * 60000)
    const closingTime = getSlotInstant(dateString, closeMinutes, timeZone)

    if (slotEnd <= closingTime) {
      slots.push({
        time: formatMinutesAsTime(currentMinutes),
        timestamp: slotStart,
        endTime: slotEnd,
      })
    }

    // Interval - typically same as duration, or could be 30min fixed
    // For now using 30 min intervals if duration > 30, else duration
    // Actually, usually slots are offered at specific intervals (e.g. every 30 mins) regardless of duration
    // Let's stick to 30 min intervals for start times, unless duration is smaller?
    // User request: "time is random shifts" -> implies they want structured slots.
    // Let's default to 15 or 30 minute start intervals. Let's do 30m for now.
    currentMinutes += 30
    safety++
  }

  return slots
}

const parseDateOnly = (dateString) => {
  const [year, month, day] = `${dateString}`.split('-').map(Number)
  if (!year || !month || !day) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD')
  }

  return new Date(year, month - 1, day)
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

    // 2. Ensure location exists, but do not apply location working-hours settings
    // to service availability. Service booking availability is intentionally
    // decoupled from location hours/timezone configuration.
    const Location = (await import('../models/Location.js')).default;
    const location = await Location.findOne({ locationId });

    if (!location) {
        return next(createError(404, 'Location not found'));
    }
    const queryDate = parseDateOnly(date)
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

    // 3. Generate All Possible Slots
    const schedulingContext = await getDailySchedulingContext({
      locationId,
      date,
      service,
    })

    const effectiveTimeZone = schedulingContext.calendarSelection.timeZone || ''

    let potentialSlots = []
    let ghlFreeSlotsUnavailable = false
    let ghlFreeSlotsReason = ''
    let ghlFreeSlotsSource = ''
    const ghlCalendarMissing = !schedulingContext.calendarSelection.calendarId

    if (schedulingContext.calendarSelection.calendarId) {
      try {
        const freeSlots = await fetchCalendarFreeSlotsForDate(
          locationId,
          schedulingContext.calendarSelection.calendarId,
          date
        )
        ghlFreeSlotsUnavailable = Boolean(freeSlots.unavailable)
        ghlFreeSlotsReason = freeSlots.reason || ''
        ghlFreeSlotsSource = freeSlots.source || ''

        if (!schedulingContext.calendarSelection.timeZone && freeSlots.timeZone) {
          schedulingContext.calendarSelection.timeZone = freeSlots.timeZone
        }

        if (!freeSlots.unavailable && Array.isArray(freeSlots.slots)) {
          potentialSlots = freeSlots.slots.map((slotLabel) => {
            const window = buildBookingWindow(
              date,
              slotLabel,
              duration,
              schedulingContext.calendarSelection.timeZone || ''
            )
            return {
              time: slotLabel,
              timestamp: window.start,
              endTime: window.end,
            }
          })
        }
      } catch (slotError) {
        ghlFreeSlotsUnavailable = true
        ghlFreeSlotsReason =
          slotError.response?.data?.message ||
          slotError.response?.data?.msg ||
          slotError.message ||
          'Failed loading GoHighLevel free slots'
        console.warn(
          `Failed loading free slots for ${schedulingContext.calendarSelection.calendarId}:`,
          slotError.response?.data || slotError.message
        )
      }
    }
    const hours = { open: '00:00', close: '23:59' }

    // 4. Filter conflicts
    const availableSlots = potentialSlots
      .filter((slot) => {
        const conflicts = getConflictsForWindow({
          windowStart: slot.timestamp,
          windowEnd: slot.endTime,
          context: schedulingContext,
        })

        return (
          conflicts.localConflicts.length === 0 &&
          conflicts.externalConflicts.length === 0
        )
      })
      .map((s) => s.time)

    res.status(200).json({
      status: 'success',
      data: {
        requestedDate: date,
        slots: availableSlots,
        day: dayName,
        hours: { open: hours.open, close: hours.close },
        metadata: {
          localBookingsCount: schedulingContext.localBookings.length,
          externalBookingsCount: schedulingContext.externalEvents.length,
          externalSourceUnavailable:
            schedulingContext.externalSourceUnavailable || ghlFreeSlotsUnavailable,
          ghlFreeSlotsUnavailable,
          ghlFreeSlotsReason,
          ghlFreeSlotsSource,
          ghlFreeSlotsCount: potentialSlots.length,
          ghlCalendarMissing,
          ghlCalendar: schedulingContext.calendarSelection,
          effectiveTimeZone,
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
