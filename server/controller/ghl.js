// File: server/controller/ghl.js
import axios from 'axios'

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

const getTokenForLocation = (locationId) => {
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

const getStartAndEndISOForDate = (dateString) => {
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
  const startTime =
    event?.startTime || event?.start || event?.appointmentStartTime || null
  const endTime = event?.endTime || event?.end || event?.appointmentEndTime || null
  const status = (event?.status || event?.appointmentStatus || '').toLowerCase()

  return {
    id: event?.id || event?._id || event?.appointmentId || null,
    title: event?.title || event?.appointmentTitle || event?.contactName || 'Booked',
    status,
    startTime,
    endTime,
    calendarId: event?.calendarId || null,
    locationId: event?.locationId || null,
  }
}

export const fetchLocationCalendarEventsByDate = async (locationId, date) => {
  const { startIso, endIso } = getStartAndEndISOForDate(date)
  const token = getTokenForLocation(locationId)

  // First try v2 endpoint; if location JWT is rejected, fall back to v1 appointments.
  try {
    const response = await makeGHLV2Request('/calendars/events', {
      token,
      params: {
        locationId,
        startTime: startIso,
        endTime: endIso,
      },
    })

    const rawEvents = response?.events || response?.data?.events || []
    const normalizedEvents = rawEvents
      .map(normalizeCalendarEvent)
      .filter(
        (event) =>
          event.startTime &&
          event.endTime &&
          !['cancelled', 'canceled'].includes(event.status)
      )

    return {
      events: normalizedEvents,
      rawCount: rawEvents.length,
      total: normalizedEvents.length,
      source: 'ghl-v2',
    }
  } catch (error) {
    if (!isUnauthorizedGhlError(error)) {
      throw error
    }
  }

  const selector = await resolveV1Selector(locationId, token)
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
  if (selector.calendarId) params.set('calendarId', selector.calendarId)
  if (selector.userId) params.set('userId', selector.userId)
  if (selector.teamId) params.set('teamId', selector.teamId)

  const v1Endpoint = `/appointments/?${params.toString()}`
  const v1Response = await makeGHLRequest(v1Endpoint, 'GET', null, token)
  const rawAppointments =
    v1Response?.appointments || v1Response?.data?.appointments || []

  const normalizedEvents = rawAppointments
    .map((appt) =>
      normalizeCalendarEvent({
        id: appt?.id || appt?._id,
        title: appt?.title || appt?.appointmentTitle || appt?.contactName,
        status: appt?.appointmentStatus || appt?.status,
        startTime:
          appt?.startTime || appt?.appointmentStartTime || appt?.start,
        endTime: appt?.endTime || appt?.appointmentEndTime || appt?.end,
        locationId: appt?.locationId || locationId,
      })
    )
    .filter(
      (event) =>
        event.startTime &&
        event.endTime &&
        !['cancelled', 'canceled'].includes(event.status)
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
    const response = await makeGHLRequest('/calendars/')

    res.status(200).json({
      success: true,
      message: 'Calendars fetched successfully',
      data: response,
    })
  } catch (error) {
    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to fetch calendars',
      error: error.response?.data || error.message,
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
    const { locationId, date } = req.query

    if (!locationId || !date) {
      return res.status(400).json({
        success: false,
        message: 'locationId and date are required',
      })
    }

    const data = await fetchLocationCalendarEventsByDate(locationId, date)

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
