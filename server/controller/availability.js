import { createError } from '../error.js'
import Booking from '../models/Booking.js'
import Service from '../models/Service.js'
import User from '../models/User.js'

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

    // 2. Get Location Business Hours (from Team User)
    // We need to find the user who OWNS this location (role=team)
    // Or if multiple, just take the first one found (assuming one owner per location)
    const teamUser = await User.findOne({
      'spaLocation.locationId': locationId,
      role: 'team',
    })

    if (!teamUser || !teamUser.spaLocation?.businessHours) {
      // Fallback or error?
      // If no hours set, maybe return empty availability or default 9-5?
      // Let's return empty with a clear message or just empty
      return res.status(200).json({
        status: 'success',
        data: { slots: [], reason: 'No business hours configured' },
      })
    }

    const queryDate = new Date(date)
    const days = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ]
    const dayName = days[queryDate.getDay()]
    const hours = teamUser.spaLocation.businessHours[dayName]

    if (!hours || hours.closed || !hours.open || !hours.close) {
      return res.status(200).json({
        status: 'success',
        data: { slots: [], reason: 'Closed on this day' },
      })
    }

    // 3. Generate All Possible Slots
    const potentialSlots = generateSlots(
      hours.open,
      hours.close,
      duration,
      queryDate
    )

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

    // 5. Filter Conflicts
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

        return !hasConflict
      })
      .map((s) => s.time)

    res.status(200).json({
      status: 'success',
      data: {
        slots: availableSlots,
        day: dayName,
        hours: { open: hours.open, close: hours.close },
      },
    })
  } catch (error) {
    console.error('Error fetching availability:', error)
    next(createError(500, 'Failed to fetch availability'))
  }
}

export const updateAvailability = async (req, res, next) => {
  try {
    const { businessHours } = req.body
    
    // Only team members can update their location hours
    if (req.user.role !== 'team') {
        return next(createError(403, 'Only team members can update availability'))
    }

    const user = await User.findById(req.user.id)
    if (!user.spaLocation) {
         return next(createError(400, 'No spa location configured'))
    }

    user.spaLocation.businessHours = {
        ...user.spaLocation.businessHours,
        ...businessHours
    }

    await user.save()

    res.status(200).json({
        status: 'success',
        data: {
            businessHours: user.spaLocation.businessHours
        }
    })

  } catch (error) {
    console.error('Error updating availability:', error)
    next(createError(500, 'Failed to update availability'))
  }
}
