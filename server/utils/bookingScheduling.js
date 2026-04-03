import Booking from '../models/Booking.js'
import { createError } from '../error.js'
import {
  fetchCalendarFreeSlotsForDate,
  fetchLocationCalendarEventsByDate,
  resolveCalendarDetailsForLocation,
  resolveUsableCalendarForLocation,
  zonedDateTimeToUtc,
} from '../controller/ghl.js'

const parseDateOnly = (dateString) => {
  const [year, month, day] = `${dateString}`.split('-').map(Number)
  if (!year || !month || !day) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD')
  }

  return new Date(year, month - 1, day)
}

export const getServiceCalendarSelection = (service = null) => {
  const calendar = service?.ghlCalendar || {}
  const linkedGhlServiceId = `${service?.ghlService?.serviceId || ''}`.trim()
  const rawCalendarId = `${calendar.calendarId || ''}`.trim()
  const looksLikeServiceIdStoredAsCalendarId =
    Boolean(rawCalendarId && linkedGhlServiceId && rawCalendarId === linkedGhlServiceId)

  return {
    calendarId: looksLikeServiceIdStoredAsCalendarId ? '' : rawCalendarId,
    name: `${calendar.name || ''}`.trim(),
    timeZone:
      `${calendar.timeZone || calendar.calendarTimeZone || calendar.timezone || ''}`.trim(),
    userId: `${calendar.userId || ''}`.trim(),
    teamId: `${calendar.teamId || ''}`.trim(),
  }
}

const extractOffsetFromDateTime = (value = '') => {
  const match = `${value || ''}`.match(/([+-]\d{2}:\d{2}|Z)$/i)
  if (!match) return ''
  return match[1].toUpperCase() === 'Z' ? '+00:00' : match[1]
}

const isExpectedGhlLookupFailure = (error) => {
  const status = error?.response?.status || error?.response?.data?.statusCode || 0
  const message = `${error?.response?.data?.message || error?.response?.data?.error || error?.message || ''}`.toLowerCase()
  return (
    status === 401 ||
    status === 404 ||
    message.includes('invalid jwt') ||
    message.includes('cannot get /calendars/events/appointments') ||
    message.includes('not found')
  )
}

const getDateKeyFromInput = (dateInput) => {
  if (typeof dateInput === 'string') {
    const trimmed = `${dateInput}`.trim()
    const datePrefixMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/)
    if (datePrefixMatch?.[1]) return datePrefixMatch[1]
  }

  const date = new Date(dateInput)
  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10)
  }

  throw new Error('Invalid booking date')
}

export const parseTimeStringOnDate = (dateInput, timeString, timeZone = '') => {
  const [rawTime = '', rawPeriod = ''] = `${timeString || ''}`.trim().split(' ')
  const [hourText = '0', minuteText = '0'] = rawTime.split(':')
  let hour = Number.parseInt(hourText, 10)
  const minute = Number.parseInt(minuteText, 10)
  const period = rawPeriod.toUpperCase()

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    throw new Error('Invalid booking time')
  }

  if (period === 'PM' && hour !== 12) hour += 12
  if (period === 'AM' && hour === 12) hour = 0

  if (timeZone) {
    const dateKey = getDateKeyFromInput(dateInput)
    const wallClock = `${dateKey}T${String(hour).padStart(2, '0')}:${String(
      minute
    ).padStart(2, '0')}:00`
    return zonedDateTimeToUtc(wallClock, timeZone)
  }

  const date = new Date(dateInput)
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid booking date')
  }
  date.setHours(hour, minute, 0, 0)
  return date
}

export const buildBookingWindow = (
  dateInput,
  timeString,
  duration = 60,
  timeZone = ''
) => {
  const start = parseTimeStringOnDate(dateInput, timeString, timeZone)
  const safeDuration = Number.parseInt(duration, 10) || 60
  const end = new Date(start.getTime() + safeDuration * 60000)

  return { start, end }
}

export const doesTimeRangeOverlap = (
  startA,
  endA,
  startB,
  endB
) => startA < endB && endA > startB

const getBookingServiceId = (booking) => {
  if (!booking?.serviceId) return ''
  if (typeof booking.serviceId === 'string') return booking.serviceId
  if (booking.serviceId?._id) return booking.serviceId._id.toString()
  return booking.serviceId.toString()
}

const getBookingCalendarId = (booking) =>
  `${booking?.ghl?.calendarId || booking?.serviceId?.ghlCalendar?.calendarId || ''}`.trim()

const PENDING_BOOKING_HOLD_MINUTES = 30

const shouldConsiderBookingConflict = (booking) => {
  if (!booking) return false

  const paymentStatus = `${booking.paymentStatus || ''}`.trim().toLowerCase()
  if (paymentStatus === 'paid') return true

  // Non-Stripe bookings (manual/internal flow) should block immediately.
  if (!booking.stripeSessionId) return true

  // Hold Stripe-pending checkout slots temporarily to prevent double-booking
  // while payment/webhook sync completes.
  if (paymentStatus === 'pending') {
    const createdAt = booking.createdAt ? new Date(booking.createdAt) : null
    if (!createdAt || Number.isNaN(createdAt.getTime())) return true
    const holdThreshold = Date.now() - PENDING_BOOKING_HOLD_MINUTES * 60 * 1000
    return createdAt.getTime() >= holdThreshold
  }

  return false
}

const isBookingRelevantForService = (booking, service) => {
  const targetServiceId = service?._id?.toString?.() || service?.id?.toString?.() || ''
  const targetCalendarId = getServiceCalendarSelection(service).calendarId
  const bookingServiceId = getBookingServiceId(booking)
  const bookingCalendarId = getBookingCalendarId(booking)

  if (targetCalendarId) {
    return bookingCalendarId === targetCalendarId || bookingServiceId === targetServiceId
  }

  return bookingServiceId === targetServiceId
}

export const getDailySchedulingContext = async ({
  locationId,
  date,
  service,
  excludeBookingId = null,
}) => {
  const startOfDay = parseDateOnly(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = parseDateOnly(date)
  endOfDay.setHours(23, 59, 59, 999)

  const query = {
    locationId,
    date: { $gte: startOfDay, $lte: endOfDay },
    status: { $nin: ['cancelled'] },
  }

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId }
  }

  const rawBookings = await Booking.find(query)
    .select('date time duration serviceId ghl status paymentStatus stripeSessionId createdAt')
    .populate('serviceId', 'ghlCalendar')

  const relevantBookings = rawBookings.filter(
    (booking) =>
      isBookingRelevantForService(booking, service) &&
      shouldConsiderBookingConflict(booking)
  )

  const calendarSelection = getServiceCalendarSelection(service)
  if (!calendarSelection.calendarId && (calendarSelection.name || service?.ghlCalendar?.calendarId)) {
    try {
      const resolvedCalendar = await resolveUsableCalendarForLocation(locationId, {
        preferredCalendarId: `${service?.ghlCalendar?.calendarId || ''}`.trim(),
        preferredCalendarName: calendarSelection.name,
      })
      if (resolvedCalendar?.id) {
        calendarSelection.calendarId = `${resolvedCalendar.id}`.trim()
      }
      if (resolvedCalendar?.name && !calendarSelection.name) {
        calendarSelection.name = `${resolvedCalendar.name}`.trim()
      }
      if (resolvedCalendar?.timeZone) {
        calendarSelection.timeZone = `${resolvedCalendar.timeZone}`.trim()
      }
      if (resolvedCalendar?.userId) {
        calendarSelection.userId = `${resolvedCalendar.userId}`.trim()
      }
      if (resolvedCalendar?.teamId) {
        calendarSelection.teamId = `${resolvedCalendar.teamId}`.trim()
      }
    } catch (error) {
      console.warn(
        `Failed resolving usable calendar for location ${locationId}:`,
        error.response?.data || error.message
      )
    }
  }

  if (calendarSelection.calendarId && !calendarSelection.timeZone) {
    try {
      const resolvedCalendar = await resolveCalendarDetailsForLocation(
        locationId,
        calendarSelection.calendarId
      )
      if (resolvedCalendar?.timeZone) {
        calendarSelection.timeZone = resolvedCalendar.timeZone
      }
      if (resolvedCalendar?.name && !calendarSelection.name) {
        calendarSelection.name = resolvedCalendar.name
      }
      if (resolvedCalendar?.userId && !calendarSelection.userId) {
        calendarSelection.userId = resolvedCalendar.userId
      }
      if (resolvedCalendar?.teamId && !calendarSelection.teamId) {
        calendarSelection.teamId = resolvedCalendar.teamId
      }
    } catch (error) {
      console.warn(
        `Failed resolving calendar details for ${calendarSelection.calendarId}:`,
        error.response?.data || error.message
      )
    }
  }

  let externalEvents = []
  let externalSourceUnavailable = false

  if (calendarSelection.calendarId) {
    try {
      const ghlData = await fetchLocationCalendarEventsByDate(
        locationId,
        date,
        calendarSelection.calendarId,
        calendarSelection.timeZone
      )
      externalEvents = ghlData.events || []
      externalSourceUnavailable = Boolean(ghlData.unavailable)
      if (!calendarSelection.timeZone && externalEvents.length > 0) {
        const inferredOffset =
          extractOffsetFromDateTime(externalEvents[0]?.startTimeRaw) ||
          extractOffsetFromDateTime(externalEvents[0]?.startTime)
        if (inferredOffset) {
          calendarSelection.timeZone = inferredOffset
        }
      }
    } catch (error) {
      externalSourceUnavailable = true
      if (!isExpectedGhlLookupFailure(error)) {
        console.warn(
          `GHL scheduling lookup failed for location ${locationId}:`,
          error.response?.data || error.message
        )
      }
    }
  }

  return {
    calendarSelection,
    localBookings: relevantBookings,
    externalEvents,
    externalSourceUnavailable,
    serviceDuration: Number.parseInt(service?.duration, 10) || 60,
  }
}

export const getConflictsForWindow = ({ windowStart, windowEnd, context }) => {
  const localConflicts = context.localBookings.filter((booking) => {
    const bookingWindow = buildBookingWindow(
      booking.date,
      booking.time,
      booking.duration,
      context.calendarSelection.timeZone || ''
    )

    return doesTimeRangeOverlap(
      windowStart,
      windowEnd,
      bookingWindow.start,
      bookingWindow.end
    )
  })

  const externalConflicts = context.externalEvents.filter((event) => {
    const externalStart = new Date(event.startTime)
    const hasExplicitEnd = Boolean(event.endTime)
    const externalEnd = hasExplicitEnd
      ? new Date(event.endTime)
      : new Date(
          externalStart.getTime() + (context.serviceDuration || 60) * 60000
        )

    if (
      Number.isNaN(externalStart.getTime()) ||
      Number.isNaN(externalEnd.getTime())
    ) {
      return false
    }

    return doesTimeRangeOverlap(windowStart, windowEnd, externalStart, externalEnd)
  })

  return { localConflicts, externalConflicts }
}

export const assertSlotAvailable = async ({
  locationId,
  date,
  time,
  duration,
  service,
  excludeBookingId = null,
}) => {
  const context = await getDailySchedulingContext({
    locationId,
    date,
    service,
    excludeBookingId,
  })

  if (context.calendarSelection.calendarId) {
    try {
      const freeSlots = await fetchCalendarFreeSlotsForDate(
        locationId,
        context.calendarSelection.calendarId,
        date
      )
      if (!context.calendarSelection.timeZone && freeSlots.timeZone) {
        context.calendarSelection.timeZone = freeSlots.timeZone
      }
      if (Array.isArray(freeSlots.slots) && freeSlots.slots.length > 0) {
        const selectedTimeNormalized = `${time || ''}`.trim().toUpperCase()
        const hasExactFreeSlot = freeSlots.slots.some(
          (slot) => `${slot || ''}`.trim().toUpperCase() === selectedTimeNormalized
        )
        if (!hasExactFreeSlot) {
          throw createError(409, 'Selected date and time are no longer available')
        }
      }
    } catch (error) {
      if (error?.status === 409 || error?.statusCode === 409) {
        throw error
      }
      console.warn(
        `Failed fetching GHL free slots for calendar ${context.calendarSelection.calendarId}:`,
        error.response?.data || error.message
      )
    }
  }

  const requestedWindow = buildBookingWindow(
    date,
    time,
    duration,
    context.calendarSelection.timeZone || ''
  )
  const conflicts = getConflictsForWindow({
    windowStart: requestedWindow.start,
    windowEnd: requestedWindow.end,
    context,
  })

  if (conflicts.localConflicts.length || conflicts.externalConflicts.length) {
    throw createError(409, 'Selected date and time are no longer available')
  }

  return context
}
