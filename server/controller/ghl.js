// File: server/controller/ghl.js
import axios from 'axios'
import Location from '../models/Location.js'

// GoHighLevel API v1 configuration for Location API Keys
const GHL_BASE_URL = 'https://rest.gohighlevel.com/v1'
const GHL_V2_BASE_URL = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = process.env.GHL_API_VERSION || '2021-07-28'

// Helper function to make GHL API requests
const makeGHLRequest = async (
  endpoint,
  method = 'GET',
  data = null,
  token = null
) => {
  try {
    const config = {
      method,
      url: `${GHL_BASE_URL}${endpoint}`,
      headers: {
        Authorization: `Bearer ${token || process.env.GHL_LOCATION_API}`,
        'Content-Type': 'application/json',
      },
    }

    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data
    }

    const response = await axios(config)
    return response.data
  } catch (error) {
    console.error('GHL API Error:', error.response?.data || error.message)
    throw error
  }
}

const makeGHLV2Request = async (
  endpoint,
  { method = 'GET', params = null, data = null, token = null } = {}
) => {
  try {
    const config = {
      method,
      url: `${GHL_V2_BASE_URL}${endpoint}`,
      headers: {
        Authorization: `Bearer ${token || process.env.GHL_LOCATION_API}`,
        Version: GHL_API_VERSION,
        'Content-Type': 'application/json',
      },
      params: params || undefined,
    }

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.data = data
    }

    const response = await axios(config)
    return response.data
  } catch (error) {
    console.error('GHL v2 API Error:', error.response?.data || error.message)
    throw error
  }
}

const getTokenForLocationFromEnv = (locationId) => {
  const defaultToken = process.env.GHL_LOCATION_API || ''
  const rawTokenMap = process.env.GHL_LOCATION_API_MAP
  if (!rawTokenMap) return defaultToken

  try {
    const parsedMap = JSON.parse(rawTokenMap)
    return parsedMap?.[locationId] || defaultToken
  } catch (error) {
    console.warn('Invalid GHL_LOCATION_API_MAP JSON:', error.message)
    return defaultToken
  }
}

const getTokenForLocation = async (locationId) => {
  const envToken = getTokenForLocationFromEnv(locationId)
  if (!locationId) return envToken

  try {
    const location = await Location.findOne({ locationId }).select('ghlApiKey')
    const locationToken = location?.ghlApiKey?.trim()
    return locationToken || envToken
  } catch (error) {
    console.warn(
      `Failed loading location API key for ${locationId}:`,
      error.message
    )
    return envToken
  }
}

const getMappedEnvValue = (singleKey, mapKey, locationId) => {
  const defaultValue = process.env[singleKey] || ''
  const rawMap = process.env[mapKey]
  if (!rawMap) return defaultValue

  try {
    const parsed = JSON.parse(rawMap)
    return parsed?.[locationId] || defaultValue
  } catch (error) {
    console.warn(`Invalid ${mapKey} JSON:`, error.message)
    return defaultValue
  }
}

const resolveV1Selector = async (locationId, token) => {
  const fromEnv = {
    calendarId: getMappedEnvValue(
      'GHL_CALENDAR_ID',
      'GHL_CALENDAR_ID_MAP',
      locationId
    ),
    userId: getMappedEnvValue('GHL_USER_ID', 'GHL_USER_ID_MAP', locationId),
    teamId: getMappedEnvValue('GHL_TEAM_ID', 'GHL_TEAM_ID_MAP', locationId),
  }

  if (fromEnv.calendarId || fromEnv.userId || fromEnv.teamId) {
    return fromEnv
  }

  try {
    const calendarsResponse = await makeGHLRequest('/calendars/', 'GET', null, token)
    const calendars =
      calendarsResponse?.calendars || calendarsResponse?.data?.calendars || []
    const firstCalendar = calendars.find((c) => c?.id || c?._id)

    return {
      calendarId: firstCalendar?.id || firstCalendar?._id || '',
      userId: '',
      teamId: '',
    }
  } catch (error) {
    console.warn(
      `Failed to auto-resolve calendar for location ${locationId}:`,
      error.response?.data || error.message
    )
    return fromEnv
  }
}

const isUnauthorizedGhlError = (error) =>
  error?.response?.status === 401 ||
  error?.response?.data?.statusCode === 401 ||
  `${error?.response?.data?.message || ''}`.toLowerCase().includes('invalid jwt')

const getTzOffsetMs = (date, timeZone) => {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const parts = dtf.formatToParts(date)
  const values = {}
  parts.forEach(({ type, value }) => {
    if (type !== 'literal') values[type] = value
  })

  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  )

  return asUtc - date.getTime()
}

const zonedDateTimeToUtc = (dateString, timeZone, endOfDay = false) => {
  const [year, month, day] = `${dateString}`.split('-').map(Number)
  if (!year || !month || !day) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD')
  }

  const hh = endOfDay ? 23 : 0
  const mm = endOfDay ? 59 : 0
  const ss = endOfDay ? 59 : 0
  const ms = endOfDay ? 999 : 0

  // Initial UTC guess for the desired wall-clock time in target timezone.
  let utcDate = new Date(Date.UTC(year, month - 1, day, hh, mm, ss, ms))
  let offset = getTzOffsetMs(utcDate, timeZone)
  utcDate = new Date(utcDate.getTime() - offset)

  // One extra pass handles DST transitions correctly.
  offset = getTzOffsetMs(utcDate, timeZone)
  return new Date(Date.UTC(year, month - 1, day, hh, mm, ss, ms) - offset)
}

const getDateKeyInTimeZone = (value, timeZone) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const values = {}
  parts.forEach(({ type, value: partValue }) => {
    if (type !== 'literal') values[type] = partValue
  })

  return `${values.year}-${values.month}-${values.day}`
}

const getStartAndEndISOForDate = (dateString, timeZone = '') => {
  if (timeZone) {
    const start = zonedDateTimeToUtc(dateString, timeZone, false)
    const end = zonedDateTimeToUtc(dateString, timeZone, true)
    return {
      startIso: start.toISOString(),
      endIso: end.toISOString(),
    }
  }

  const start = new Date(dateString)
  const end = new Date(dateString)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD')
  }

  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  }
}

const normalizeCalendarEvent = (event) => {
  const rawStart =
    event?.startTime ||
    event?.start ||
    event?.startAt ||
    event?.appointmentStartTime ||
    null
  const rawEnd =
    event?.endTime ||
    event?.end ||
    event?.endAt ||
    event?.appointmentEndTime ||
    null
  const startTime =
    rawStart
  const endTime =
    rawEnd
  const status = (event?.status || event?.appointmentStatus || '').toLowerCase()
  const resolvedCalendarId =
    event?.calendarId ||
    event?.calendar?.id ||
    event?.calendar?._id ||
    null
  const resolvedTimeZone =
    event?.timeZone ||
    event?.timezone ||
    event?.appointmentTimeZone ||
    event?.calendar?.timeZone ||
    event?.calendar?.timezone ||
    event?.calendarSettings?.timeZone ||
    null

  return {
    id: event?.id || event?._id || event?.appointmentId || null,
    title: event?.title || event?.appointmentTitle || event?.contactName || 'Booked',
    status,
    startTime,
    endTime,
    startTimeRaw: rawStart,
    endTimeRaw: rawEnd,
    calendarId: resolvedCalendarId,
    locationId: event?.locationId || null,
    timeZone: resolvedTimeZone,
  }
}

const normalizeCalendarsPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return []
  return (
    payload.calendars ||
    payload.data?.calendars ||
    payload.data ||
    []
  )
}

const matchesCalendar = (eventCalendarId, selectedCalendarId) => {
  if (!selectedCalendarId) return true
  return `${eventCalendarId || ''}` === `${selectedCalendarId}`
}

const hasExplicitOffsetOrZulu = (value) =>
  /([+-]\d{2}:\d{2}|Z)$/i.test(`${value || ''}`)

const getDatePrefix = (value) => {
  const match = `${value || ''}`.match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : ''
}

const matchesRequestedDate = (event, requestedDate, requestedTimeZone = '') => {
  const rawDatePrefix = getDatePrefix(event?.startTimeRaw)
  if (rawDatePrefix && !hasExplicitOffsetOrZulu(event?.startTimeRaw)) {
    // If API returns wall-clock datetime without timezone, trust its date component.
    return rawDatePrefix === requestedDate
  }

  const tz = requestedTimeZone || event?.timeZone || ''
  if (!tz) return true
  return getDateKeyInTimeZone(event?.startTime, tz) === requestedDate
}

const extractRawEventsPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return []
  const candidates = [
    payload.events,
    payload.appointments,
    payload.bookings,
    payload.items,
    payload.data?.events,
    payload.data?.appointments,
    payload.data?.bookings,
    payload.data?.items,
  ]

  for (const entry of candidates) {
    if (Array.isArray(entry)) return entry
  }
  return []
}

export const fetchLocationCalendarEventsByDate = async (
  locationId,
  date,
  calendarId = '',
  timeZone = ''
) => {
  const { startIso, endIso } = getStartAndEndISOForDate(date, timeZone)
  const token = await getTokenForLocation(locationId)

  if (!token) {
    return {
      events: [],
      rawCount: 0,
      total: 0,
      source: 'ghl',
      unavailable: true,
      reason: `No GHL API key configured for location ${locationId}`,
    }
  }

  const startMs = Date.parse(startIso)
  const endMs = Date.parse(endIso)

  // First try v2 endpoints/param shapes; if location JWT is rejected, fall back to v1 appointments.
  try {
    const v2Attempts = [
      {
        endpoint: '/calendars/events',
        params: {
          locationId,
          startTime: startIso,
          endTime: endIso,
          ...(calendarId ? { calendarId } : {}),
        },
        source: 'ghl-v2-events-iso',
      },
      {
        endpoint: '/calendars/events',
        params: {
          locationId,
          startTime: startMs,
          endTime: endMs,
          ...(calendarId ? { calendarId } : {}),
        },
        source: 'ghl-v2-events-ms',
      },
      {
        endpoint: '/calendars/events/appointments',
        params: {
          locationId,
          startTime: startIso,
          endTime: endIso,
          ...(calendarId ? { calendarId } : {}),
        },
        source: 'ghl-v2-appointments-iso',
      },
      {
        endpoint: '/calendars/events/appointments',
        params: {
          locationId,
          startTime: startMs,
          endTime: endMs,
          ...(calendarId ? { calendarId } : {}),
        },
        source: 'ghl-v2-appointments-ms',
      },
    ]

    for (const attempt of v2Attempts) {
      const response = await makeGHLV2Request(attempt.endpoint, {
        token,
        params: attempt.params,
      })
      const rawEvents = extractRawEventsPayload(response)
      if (!Array.isArray(rawEvents) || rawEvents.length === 0) {
        continue
      }

      const normalizedEvents = rawEvents
        .map(normalizeCalendarEvent)
        .filter(
          (event) =>
            event.startTime &&
            !['cancelled', 'canceled'].includes(event.status) &&
            matchesCalendar(event.calendarId, calendarId) &&
            matchesRequestedDate(event, date, timeZone)
        )

      return {
        events: normalizedEvents,
        rawCount: rawEvents.length,
        total: normalizedEvents.length,
        source: attempt.source,
      }
    }

    return {
      events: [],
      rawCount: 0,
      total: 0,
      source: 'ghl-v2',
      unavailable: true,
      reason: 'No events returned from tested v2 calendar endpoints',
    }
  } catch (error) {
    if (!isUnauthorizedGhlError(error)) {
      throw error
    }
  }

  const selector = await resolveV1Selector(locationId, token)
  const effectiveCalendarId = calendarId || selector.calendarId
  if (!selector.calendarId && !selector.userId && !selector.teamId) {
    return {
      events: [],
      rawCount: 0,
      total: 0,
      source: 'ghl-v1',
      unavailable: true,
      reason: 'Missing calendar/user/team selector for v1 appointments',
    }
  }
  const params = new URLSearchParams({
    startDate: startIso,
    endDate: endIso,
  })
  if (effectiveCalendarId) params.set('calendarId', effectiveCalendarId)
  if (selector.userId) params.set('userId', selector.userId)
  if (selector.teamId) params.set('teamId', selector.teamId)

  const v1Endpoint = `/appointments/?${params.toString()}`
  const v1Response = await makeGHLRequest(v1Endpoint, 'GET', null, token)
  const rawAppointments =
    v1Response?.appointments || v1Response?.data?.appointments || []

  const normalizedEvents = rawAppointments
    .map(normalizeCalendarEvent)
    .filter(
      (event) =>
        event.startTime &&
        !['cancelled', 'canceled'].includes(event.status) &&
        matchesCalendar(event.calendarId, calendarId) &&
        matchesRequestedDate(event, date, timeZone)
    )

  return {
    events: normalizedEvents,
    rawCount: rawAppointments.length,
    total: normalizedEvents.length,
    source: 'ghl-v1',
  }
}

// Test API connection
export const testConnection = async (req, res, next) => {
  try {
    const response = await makeGHLRequest('/contacts/')

    res.status(200).json({
      success: true,
      message: 'GHL Location API connection successful',
      locationId: process.env.GHL_LOCATION_ID,
      sampleData: response,
    })
  } catch (error) {
    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to connect to GHL API',
      error: error.response?.data || error.message,
    })
  }
}

// Get contacts with pagination
export const getContacts = async (req, res, next) => {
  try {
    const { limit = 20, skip = 0 } = req.query

    const endpoint = `/contacts/?limit=${limit}&skip=${skip}`
    const response = await makeGHLRequest(endpoint)

    res.status(200).json({
      success: true,
      message: 'Contacts fetched successfully',
      locationId: process.env.GHL_LOCATION_ID,
      data: response,
      pagination: {
        limit: parseInt(limit),
        skip: parseInt(skip),
        count: response.contacts?.length || 0,
        total: response.meta?.total || 0,
      },
    })
  } catch (error) {
    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to fetch contacts',
      error: error.response?.data || error.message,
    })
  }
}

// Get all contacts (fetch all pages)
export const getAllContacts = async (req, res, next) => {
  try {
    const { maxContacts = 1000 } = req.query
    let allContacts = []
    let skip = 0
    const limit = 100
    let hasMore = true

    while (hasMore && allContacts.length < maxContacts) {
      try {
        const response = await makeGHLRequest(
          `/contacts/?limit=${limit}&skip=${skip}`
        )

        if (response.contacts && response.contacts.length > 0) {
          allContacts = allContacts.concat(response.contacts)
          skip += limit

          if (response.contacts.length < limit) {
            hasMore = false
          }
        } else {
          hasMore = false
        }

        // Add delay to respect rate limits
        await new Promise((resolve) => setTimeout(resolve, 200))
      } catch (pageError) {
        console.error(
          `Error fetching contacts at skip ${skip}:`,
          pageError.message
        )
        break
      }
    }

    res.status(200).json({
      success: true,
      message: 'All contacts fetched successfully',
      locationId: process.env.GHL_LOCATION_ID,
      data: {
        contacts: allContacts,
        meta: {
          total: allContacts.length,
          requestedMax: maxContacts,
        },
      },
    })
  } catch (error) {
    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to fetch all contacts',
      error: error.response?.data || error.message,
    })
  }
}

// Get specific contact by ID
export const getContactById = async (req, res, next) => {
  try {
    const { contactId } = req.params

    if (!contactId) {
      return res.status(400).json({
        success: false,
        message: 'Contact ID is required',
      })
    }

    const response = await makeGHLRequest(`/contacts/${contactId}`)

    res.status(200).json({
      success: true,
      message: 'Contact fetched successfully',
      data: response,
    })
  } catch (error) {
    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to fetch contact',
      error: error.response?.data || error.message,
    })
  }
}

// Search contacts by email or phone
export const lookupContact = async (req, res, next) => {
  try {
    const { email, phone } = req.query

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Either email or phone parameter is required',
      })
    }

    let endpoint = '/contacts/lookup?'
    if (email) endpoint += `email=${encodeURIComponent(email)}&`
    if (phone) endpoint += `phone=${encodeURIComponent(phone)}&`

    const response = await makeGHLRequest(endpoint.slice(0, -1))

    res.status(200).json({
      success: true,
      message: 'Contact lookup completed',
      data: response,
      searchCriteria: { email, phone },
    })
  } catch (error) {
    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to lookup contact',
      error: error.response?.data || error.message,
    })
  }
}

// Create new contact
export const createContact = async (req, res, next) => {
  try {
    const contactData = req.body

    if (
      !contactData.firstName &&
      !contactData.lastName &&
      !contactData.email &&
      !contactData.phone
    ) {
      return res.status(400).json({
        success: false,
        message:
          'At least one of firstName, lastName, email, or phone is required',
      })
    }

    const response = await makeGHLRequest('/contacts/', 'POST', contactData)

    res.status(201).json({
      success: true,
      message: 'Contact created successfully',
      data: response,
    })
  } catch (error) {
    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to create contact',
      error: error.response?.data || error.message,
    })
  }
}

// Update contact
export const updateContact = async (req, res, next) => {
  try {
    const { contactId } = req.params
    const updateData = req.body

    if (!contactId) {
      return res.status(400).json({
        success: false,
        message: 'Contact ID is required',
      })
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Update data is required',
      })
    }

    const response = await makeGHLRequest(
      `/contacts/${contactId}`,
      'PUT',
      updateData
    )

    res.status(200).json({
      success: true,
      message: 'Contact updated successfully',
      data: response,
    })
  } catch (error) {
    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to update contact',
      error: error.response?.data || error.message,
    })
  }
}

// Delete contact
export const deleteContact = async (req, res, next) => {
  try {
    const { contactId } = req.params

    if (!contactId) {
      return res.status(400).json({
        success: false,
        message: 'Contact ID is required',
      })
    }

    const response = await makeGHLRequest(`/contacts/${contactId}`, 'DELETE')

    res.status(200).json({
      success: true,
      message: 'Contact deleted successfully',
      data: response,
    })
  } catch (error) {
    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to delete contact',
      error: error.response?.data || error.message,
    })
  }
}

// Get opportunities
export const getOpportunities = async (req, res, next) => {
  try {
    const { limit = 20, skip = 0 } = req.query

    const endpoint = `/opportunities/?limit=${limit}&skip=${skip}`
    const response = await makeGHLRequest(endpoint)

    res.status(200).json({
      success: true,
      message: 'Opportunities fetched successfully',
      data: response,
      pagination: {
        limit: parseInt(limit),
        skip: parseInt(skip),
        count: response.opportunities?.length || 0,
      },
    })
  } catch (error) {
    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to fetch opportunities',
      error: error.response?.data || error.message,
    })
  }
}

// Get calendars
export const getCalendars = async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    res.set('Pragma', 'no-cache')
    res.set('Expires', '0')
    res.set('Surrogate-Control', 'no-store')

    const { locationId } = req.query
    if (!locationId) {
      return res.status(400).json({
        success: false,
        message: 'locationId is required',
      })
    }

    const token = await getTokenForLocation(locationId)
    if (!token) {
      return res.status(400).json({
        success: false,
        message: `No GHL API key configured for location ${locationId}`,
      })
    }

    let calendars = []
    let source = 'ghl-v2'

    try {
      const v2Response = await makeGHLV2Request('/calendars/', {
        token,
        params: { locationId },
      })
      calendars = normalizeCalendarsPayload(v2Response)
    } catch (v2Error) {
      try {
        const v2AltResponse = await makeGHLV2Request('/calendars', {
          token,
          params: { locationId },
        })
        calendars = normalizeCalendarsPayload(v2AltResponse)
      } catch (v2AltError) {
        source = 'ghl-v1'
        const v1Response = await makeGHLRequest('/calendars/', 'GET', null, token)
        calendars = normalizeCalendarsPayload(v1Response)
      }
    }

    res.status(200).json({
      success: true,
      message: 'Calendars fetched successfully',
      data: {
        calendars,
        total: calendars.length,
        source,
      },
    })
  } catch (error) {
    res.status(200).json({
      success: true,
      message: 'Calendars unavailable, using fallback',
      data: {
        calendars: [],
        total: 0,
        source: 'ghl',
        unavailable: true,
        error: error.response?.data || error.message,
      },
    })
  }
}

// Get custom fields
export const getCustomFields = async (req, res, next) => {
  try {
    const response = await makeGHLRequest('/custom-fields/')

    res.status(200).json({
      success: true,
      message: 'Custom fields fetched successfully',
      data: response,
    })
  } catch (error) {
    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to fetch custom fields',
      error: error.response?.data || error.message,
    })
  }
}

// Get bookings/events for a specific GHL location and date
export const getLocationBookingsByDate = async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    res.set('Pragma', 'no-cache')
    res.set('Expires', '0')
    res.set('Surrogate-Control', 'no-store')

    const { locationId, date, calendarId, timeZone } = req.query

    if (!locationId || !date) {
      return res.status(400).json({
        success: false,
        message: 'locationId and date are required',
      })
    }

    const data = await fetchLocationCalendarEventsByDate(
      locationId,
      date,
      calendarId,
      timeZone
    )

    res.status(200).json({
      success: true,
      message: 'GHL bookings fetched successfully',
      data,
    })
  } catch (error) {
    // Never bubble GHL auth failures as API auth failures for app users.
    // This endpoint is integration data only; degrade gracefully.
    res.status(200).json({
      success: true,
      message: 'GHL bookings unavailable, using fallback',
      data: {
        events: [],
        rawCount: 0,
        total: 0,
        source: 'ghl',
        unavailable: true,
        error: error.response?.data || error.message,
      },
    })
  }
}
