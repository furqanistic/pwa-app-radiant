import Booking from '../models/Booking.js'
import { createError } from '../error.js'
import {
  fetchLocationCalendarEventsByDate,
  resolveCalendarDetailsForLocation,
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

  return {
    calendarId: `${calendar.calendarId || ''}`.trim(),
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

export const parseTimeStringOnDate = (dateInput, timeString) => {
  const date = new Date(dateInput)
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid booking date')
  }

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

  date.setHours(hour, minute, 0, 0)
  return date
}

export const buildBookingWindow = (dateInput, timeString, duration = 60) => {
  const start = parseTimeStringOnDate(dateInput, timeString)
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
      console.warn(
        `GHL scheduling lookup failed for location ${locationId}:`,
        error.response?.data || error.message
      )
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
      booking.duration
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
  const requestedWindow = buildBookingWindow(date, time, duration)
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
