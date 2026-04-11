// File: server/controller/ghl.js
import axios from 'axios'
import Location from '../models/Location.js'

// GoHighLevel API v1 configuration for Location API Keys
const GHL_BASE_URL = 'https://rest.gohighlevel.com/v1'
const GHL_V2_BASE_URL = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = '2021-07-28'
const KNOWN_BOOKING_PATH_BY_LOCATION = {
  // Ageless Wellness Spa
  '6RL2MtUxqIc5fUgWRw1O': 'ageless-wellness-spa-fzvcfoccwov',
}

const resolveLocationIdFromRequest = (req) =>
  `${
    req?.query?.locationId ||
    req?.body?.locationId ||
    req?.params?.locationId ||
    req?.user?.selectedLocation?.locationId ||
    ''
  }`.trim()

const createPlainError = (message, statusCode = 400) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

const requireToken = (token, locationId = '') => {
  const normalizedToken = `${token || ''}`.trim()
  if (normalizedToken) return normalizedToken
  if (locationId) {
    throw createPlainError(`No GHL API key configured for location ${locationId}`, 400)
  }
  throw createPlainError('No GHL API key configured for this request', 400)
}

// Helper function to make GHL API requests
const makeGHLRequest = async (
  endpoint,
  method = 'GET',
  data = null,
  token = null
) => {
  try {
    const authToken = requireToken(token)
    const config = {
      method,
      url: `${GHL_BASE_URL}${endpoint}`,
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }

    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data
    }

    const response = await axios(config)
    return response.data
  } catch (error) {
    const apiMessage = `${error?.response?.data?.msg || error?.response?.data?.message || ''}`.toLowerCase()
    const isExpectedLegacyApiKeyFailure = apiMessage.includes('api key is invalid')
    if (!isExpectedLegacyApiKeyFailure) {
      console.error('GHL API Error:', error.response?.data || error.message)
    }
    throw error
  }
}

const makeGHLV2Request = async (
  endpoint,
  {
    method = 'GET',
    params = null,
    data = null,
    token = null,
    suppressErrorLog = false,
  } = {}
) => {
  try {
    const authToken = requireToken(token)
    const config = {
      method,
      url: `${GHL_V2_BASE_URL}${endpoint}`,
      headers: {
        Authorization: `Bearer ${authToken}`,
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
    if (!suppressErrorLog) {
      console.error('GHL v2 API Error:', error.response?.data || error.message)
    }
    throw error
  }
}

const getTokenForLocation = async (locationId) => {
  if (!locationId) return ''

  try {
    const location = await Location.findOne({ locationId }).select('ghlApiKey')
    const locationToken = location?.ghlApiKey?.trim()
    return locationToken || ''
  } catch (error) {
    console.warn(
      `Failed loading location API key for ${locationId}:`,
      error.message
    )
    return ''
  }
}

const getTokenContextFromRequest = async (req) => {
  const locationId = resolveLocationIdFromRequest(req)
  if (!locationId) {
    throw createPlainError('locationId is required', 400)
  }

  const token = await getTokenForLocation(locationId)
  if (!token) {
    throw createPlainError(`No GHL API key configured for location ${locationId}`, 400)
  }

  return { locationId, token }
}

const parseBookingPathFromUrl = (value = '') => {
  const raw = `${value || ''}`.trim()
  if (!raw) return ''
  const match = raw.match(/app\.spascheduler\.online\/booking\/([^/?#]+)/i)
  return match?.[1] ? decodeURIComponent(match[1]).trim().toLowerCase() : ''
}

const resolveBookingSubdomainForLocation = async (locationId) => {
  if (!locationId) return ''

  const mappedFromCode = `${KNOWN_BOOKING_PATH_BY_LOCATION[locationId] || ''}`.trim().toLowerCase()
  if (mappedFromCode) return mappedFromCode

  try {
    const location = await Location.findOne({ locationId })
      .select('subdomain reviewLink')
      .lean()

    const fromReviewLink = parseBookingPathFromUrl(location?.reviewLink)
    if (fromReviewLink) return fromReviewLink

    const rawSubdomain = `${location?.subdomain || ''}`.trim().toLowerCase()
    // Simple subdomains like "ageless" are often not the real booking path segment.
    if (rawSubdomain && rawSubdomain.includes('-')) return rawSubdomain
    return ''
  } catch (error) {
    console.warn(
      `Failed loading booking subdomain for location ${locationId}:`,
      error.message
    )
    return ''
  }
}

const buildSpaSchedulerBookingPayload = ({ subdomain = '', serviceId = '' } = {}) => {
  const normalizedSubdomain = `${subdomain || ''}`.trim().toLowerCase()
  const normalizedServiceId = `${serviceId || ''}`.trim()
  if (!normalizedSubdomain || !normalizedServiceId) {
    return {
      schedulingLink: '',
      permanentLink: '',
      embedCode: '',
      mCode: '',
    }
  }

  const baseUrl = `https://app.spascheduler.online/booking/${normalizedSubdomain}/sv/${normalizedServiceId}`
  const iframeSrc = `${baseUrl}?heightMode=fixed&showHeader=true`
  const embedCode = `<iframe src="${iframeSrc}" style="width: 100%;border:none;overflow: hidden;" scrolling="no" id="${normalizedServiceId}_auto"></iframe><br><script src="https://app.spascheduler.online/js/form_embed.js" type="text/javascript"></script>`

  return {
    schedulingLink: baseUrl,
    permanentLink: baseUrl,
    embedCode,
    mCode: embedCode,
  }
}

const applyBookingFallback = (service = null, bookingSubdomain = '') => {
  if (!service || typeof service !== 'object') return service
  if (!bookingSubdomain) return service

  const existingScheduling = `${service?.schedulingLink || ''}`.trim()
  const existingPermanent = `${service?.permanentLink || ''}`.trim()
  const existingEmbed = `${service?.embedCode || service?.mCode || ''}`.trim()
  if (existingScheduling || existingPermanent || existingEmbed) {
    return service
  }

  const resolvedServiceId = `${service?.serviceId || service?.id || service?._id || ''}`.trim()
  if (!resolvedServiceId) return service

  return {
    ...service,
    ...buildSpaSchedulerBookingPayload({
      subdomain: bookingSubdomain,
      serviceId: resolvedServiceId,
    }),
  }
}

const resolveV1Selector = async (locationId, token) => {
  try {
    const v2CalendarsResponse = await makeGHLV2Request('/calendars/', {
      method: 'GET',
      token,
      params: { locationId },
    })
    const v2Calendars = normalizeCalendarsPayload(v2CalendarsResponse)
    const firstV2Calendar = v2Calendars.find((calendar) => calendar?.id)
    if (firstV2Calendar?.id) {
      return {
        calendarId: `${firstV2Calendar.id}`,
        userId: '',
        teamId: '',
      }
    }
  } catch (error) {
    // Fall through to v1 lookup below.
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
    return {
      calendarId: '',
      userId: '',
      teamId: '',
    }
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

const isOffsetTimeZone = (timeZone = '') => /^[+-]\d{2}:\d{2}$/.test(`${timeZone}`)

const isValidIanaTimeZone = (timeZone = '') => {
  const normalized = `${timeZone || ''}`.trim()
  if (!normalized) return false
  try {
    Intl.DateTimeFormat('en-US', { timeZone: normalized })
    return true
  } catch (error) {
    return false
  }
}

const offsetToEtcGmtTimeZone = (offset = '') => {
  const normalized = `${offset || ''}`.trim()
  const match = normalized.match(/^([+-])(\d{2}):(\d{2})$/)
  if (!match) return ''
  const sign = match[1]
  const hour = Number.parseInt(match[2], 10)
  const minute = Number.parseInt(match[3], 10)
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || minute !== 0) return ''
  // Note: IANA Etc/GMT sign is inverted by convention.
  const invertedSign = sign === '+' ? '-' : '+'
  return `Etc/GMT${invertedSign}${hour}`
}

const normalizeTimeZoneForGhlPayload = (timeZone = '') => {
  const normalized = `${timeZone || ''}`.trim()
  if (!normalized) return 'UTC'
  if (normalized.toUpperCase() === 'Z') return 'UTC'
  if (isOffsetTimeZone(normalized)) {
    return offsetToEtcGmtTimeZone(normalized) || 'UTC'
  }
  if (isValidIanaTimeZone(normalized)) return normalized
  return 'UTC'
}

export const zonedDateTimeToUtc = (dateString, timeZone, endOfDay = false) => {
  const [datePart, timePart = ''] = `${dateString}`.split('T')
  const [year, month, day] = `${datePart}`.split('-').map(Number)
  if (!year || !month || !day) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD')
  }

  let hh = endOfDay ? 23 : 0
  let mm = endOfDay ? 59 : 0
  let ss = endOfDay ? 59 : 0
  const ms = endOfDay ? 999 : 0

  if (timePart && !endOfDay) {
    const [hourText = '0', minuteText = '0', secondText = '0'] = timePart.split(':')
    hh = Number(hourText)
    mm = Number(minuteText)
    ss = Number(secondText)
  }

  if (isOffsetTimeZone(timeZone)) {
    const sign = timeZone.startsWith('-') ? -1 : 1
    const [offsetHours, offsetMinutes] = timeZone.slice(1).split(':').map(Number)
    const offsetTotalMinutes = sign * (offsetHours * 60 + offsetMinutes)
    return new Date(
      Date.UTC(year, month - 1, day, hh, mm, ss, ms) - offsetTotalMinutes * 60000
    )
  }

  // Initial UTC guess for the desired wall-clock time in target timezone.
  let utcDate = new Date(Date.UTC(year, month - 1, day, hh, mm, ss, ms))
  let offset = getTzOffsetMs(utcDate, timeZone)
  utcDate = new Date(utcDate.getTime() - offset)

  // One extra pass handles DST transitions correctly.
  offset = getTzOffsetMs(utcDate, timeZone)
  return new Date(Date.UTC(year, month - 1, day, hh, mm, ss, ms) - offset)
}

const parseDateOnly = (dateString) => {
  const [year, month, day] = `${dateString}`.split('-').map(Number)
  if (!year || !month || !day) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD')
  }

  return new Date(year, month - 1, day)
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

  const start = parseDateOnly(dateString)
  const end = parseDateOnly(dateString)

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
    event?.calendarID ||
    event?.calendar_id ||
    event?.calendar?.id ||
    event?.calendar?._id ||
    event?.calendar?.calendarId ||
    event?.calendar?.calendarID ||
    event?.calendar?.calendar_id ||
    event?.calendarIdString ||
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
    payload.items ||
    payload.data?.calendars ||
    payload.data?.items ||
    payload.data ||
    []
  )
}

const normalizeCalendarServicesPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return []

  const candidates = [
    payload.services,
    payload.serviceCatalog,
    payload.catalog,
    payload.items,
    payload.data?.services,
    payload.data?.serviceCatalog,
    payload.data?.catalog,
    payload.data?.items,
    payload.data,
  ]

  for (const entry of candidates) {
    if (Array.isArray(entry)) return entry
  }

  return []
}

const normalizeWorkflowsPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return []

  const candidates = [
    payload.workflows,
    payload.items,
    payload.data?.workflows,
    payload.data?.items,
    payload.data,
  ]

  for (const entry of candidates) {
    if (Array.isArray(entry)) return entry
  }

  return []
}

const normalizeWorkflowEntity = (workflow, index = 0) => {
  const statusText = `${
    workflow?.status ||
    workflow?.workflowStatus ||
    workflow?.state ||
    ''
  }`
    .trim()
    .toLowerCase()

  const hasBooleanStatus = typeof workflow?.isActive === 'boolean'
  const isActive = hasBooleanStatus
    ? workflow.isActive
    : statusText
      ? ['active', 'published', 'enabled', 'on', 'live'].some((value) =>
          statusText.includes(value)
        )
      : false

  return {
    ...workflow,
    id:
      workflow?.id ||
      workflow?._id ||
      workflow?.workflowId ||
      workflow?.automationId ||
      `ghl-workflow-${index}`,
    name:
      workflow?.name ||
      workflow?.title ||
      workflow?.workflowName ||
      workflow?.automationName ||
      'Untitled Automation',
    status: statusText || (isActive ? 'active' : 'inactive'),
    isActive,
    triggerName: workflow?.triggerName || workflow?.trigger?.name || '',
    createdAt: workflow?.createdAt || workflow?.dateCreated || '',
    updatedAt: workflow?.updatedAt || workflow?.dateUpdated || '',
    description: workflow?.description || workflow?.notes || '',
  }
}

const parseServiceDurationMinutes = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value

  if (typeof value === 'string') {
    const numericMatch = value.match(/(\d+(?:\.\d+)?)/)
    if (numericMatch) {
      const numericValue = Number(numericMatch[1])
      if (Number.isFinite(numericValue)) {
        return /hour|hr/i.test(value) ? numericValue * 60 : numericValue
      }
    }
  }

  return 0
}

const parseNumberish = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.-]/g, '')
    if (!cleaned) return null
    const parsed = Number(cleaned)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const normalizeCurrencyCode = (value) => {
  const raw = `${value || ''}`.trim().toUpperCase()
  return /^[A-Z]{3}$/.test(raw) ? raw : ''
}

const decodeHtmlEntities = (value) => {
  let output = `${value || ''}`
  const replacements = [
    [/&amp;/gi, '&'],
    [/&lt;/gi, '<'],
    [/&gt;/gi, '>'],
    [/&quot;/gi, '"'],
    [/&#34;/gi, '"'],
    [/&apos;/gi, "'"],
    [/&#39;/gi, "'"],
  ]

  // Some payloads are doubly-encoded, so decode a few passes.
  for (let i = 0; i < 3; i += 1) {
    const previous = output
    replacements.forEach(([pattern, replacement]) => {
      output = output.replace(pattern, replacement)
    })
    if (output === previous) break
  }

  return output
}

const normalizeUrlLikeValue = (value) => {
  const raw = decodeHtmlEntities(`${value || ''}`).trim()
  if (!raw) return ''
  if (/<iframe/i.test(raw) || /<script/i.test(raw) || /form_embed\.js/i.test(raw)) {
    return raw
  }
  if (/^https?:\/\//i.test(raw)) return raw
  if (/^\/\//.test(raw)) return `https:${raw}`
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(raw)) return `https://${raw}`
  return ''
}

const normalizeHttpUrl = (value) => {
  const normalized = normalizeUrlLikeValue(value)
  if (!normalized || /<iframe/i.test(normalized) || /<script/i.test(normalized)) {
    return ''
  }
  return normalized
}

const isLikelyBookingUrl = (value = '') =>
  /(\/booking\/|\/sv\/|\/calendar|\/appointment|schedule|scheduler|slot|book)/i.test(
    `${value || ''}`
  ) && !/form_embed\.js/i.test(`${value || ''}`)

const extractIframeSrc = (value = '') => {
  const raw = decodeHtmlEntities(`${value || ''}`).trim()
  if (!raw) return ''

  const iframeMatch = raw.match(/src=(['"])(.*?)\1/i)
  if (iframeMatch?.[2]) {
    return normalizeHttpUrl(iframeMatch[2])
  }

  return ''
}

const findStringInObject = (input, matcher, depth = 0, seen = new Set()) => {
  if (depth > 5 || input == null) return ''

  if (typeof input === 'string') {
    return matcher(input) ? input : ''
  }

  if (typeof input !== 'object') return ''
  if (seen.has(input)) return ''
  seen.add(input)

  const values = Array.isArray(input) ? input : Object.values(input)
  for (const value of values) {
    const match = findStringInObject(value, matcher, depth + 1, seen)
    if (match) return match
  }

  return ''
}

const extractEmbedCode = (service = {}) => {
  const candidates = [
    service?.embedCode,
    service?.embed,
    service?.embedHtml,
    service?.mCode,
    service?.mcode,
    service?.shareBookingCode,
    service?.shareBookingMCode,
    service?.widgetMCode,
    service?.widgetCode,
    service?.iframeCode,
    service?.widget?.mCode,
    service?.widget?.mcode,
    service?.widget?.code,
    service?.widget?.embed,
    service?.widget?.embedHtml,
    service?.shareBooking?.embedCode,
    service?.shareBooking?.mCode,
    service?.shareBooking?.mcode,
    service?.shareBooking?.code,
    service?.booking?.embedCode,
    service?.booking?.mCode,
    service?.booking?.mcode,
    service?.booking?.code,
    service?.widget?.embedCode,
    service?.links?.mCode,
    service?.links?.mcode,
    service?.links?.embedCode,
  ]

  for (const candidate of candidates) {
    const normalized = normalizeUrlLikeValue(candidate)
    if (normalized) return normalized
  }

  const deepEmbed = findStringInObject(
    service,
    (value) => {
      const decoded = decodeHtmlEntities(value)
      return (
        /<iframe/i.test(decoded) ||
        /<script/i.test(decoded) ||
        /form_embed\.js/i.test(decoded)
      )
    }
  )
  if (deepEmbed) {
    return decodeHtmlEntities(`${deepEmbed}`).trim()
  }

  return ''
}

const extractSchedulingLink = (service = {}) => {
  const candidates = [
    service?.schedulingLink,
    service?.schedulingURL,
    service?.schedulingUrl,
    service?.bookingLink,
    service?.bookingUrl,
    service?.bookingURL,
    service?.shareBookingLink,
    service?.shareLink,
    service?.publicLink,
    service?.url,
    service?.shareBooking?.schedulingLink,
    service?.shareBooking?.schedulingURL,
    service?.shareBooking?.schedulingUrl,
    service?.shareBooking?.bookingLink,
    service?.shareBooking?.shareLink,
    service?.shareBooking?.url,
    service?.booking?.schedulingLink,
    service?.booking?.schedulingURL,
    service?.booking?.schedulingUrl,
    service?.booking?.bookingLink,
    service?.booking?.shareLink,
    service?.booking?.url,
    service?.links?.scheduling,
    service?.links?.schedulingLink,
    service?.links?.booking,
    service?.links?.bookingLink,
    service?.links?.public,
    service?.links?.publicLink,
  ]

  let firstUrl = ''
  for (const candidate of candidates) {
    const normalized = normalizeHttpUrl(candidate)
    if (!normalized) continue
    if (!firstUrl) firstUrl = normalized
    if (isLikelyBookingUrl(normalized)) return normalized
  }

  const deepUrl = findStringInObject(service, (value) => {
    const normalized = normalizeHttpUrl(value)
    return normalized ? isLikelyBookingUrl(normalized) : false
  })
  if (deepUrl) return normalizeHttpUrl(deepUrl)

  const embedSrc = extractIframeSrc(extractEmbedCode(service))
  if (embedSrc) return embedSrc

  if (firstUrl) return firstUrl

  return ''
}

const extractPermanentLink = (service = {}) => {
  const candidates = [
    service?.permanentLink,
    service?.permaLink,
    service?.permalink,
    service?.publicLink,
    service?.publicUrl,
    service?.shareBooking?.permanentLink,
    service?.shareBooking?.permaLink,
    service?.shareBooking?.permalink,
    service?.shareBooking?.publicLink,
    service?.shareBooking?.publicUrl,
    service?.booking?.permanentLink,
    service?.booking?.permaLink,
    service?.booking?.permalink,
    service?.booking?.publicLink,
    service?.booking?.publicUrl,
    service?.links?.permanent,
    service?.links?.permanentLink,
    service?.links?.public,
    service?.links?.publicLink,
  ]

  let firstUrl = ''
  for (const candidate of candidates) {
    const normalized = normalizeHttpUrl(candidate)
    if (!normalized) continue
    if (!firstUrl) firstUrl = normalized
    if (isLikelyBookingUrl(normalized)) return normalized
  }

  const deepUrl = findStringInObject(service, (value) => {
    const normalized = normalizeHttpUrl(value)
    return normalized ? isLikelyBookingUrl(normalized) : false
  })
  if (deepUrl) return normalizeHttpUrl(deepUrl)

  const embedSrc = extractIframeSrc(extractEmbedCode(service))
  if (embedSrc) return embedSrc

  if (firstUrl) return firstUrl

  return ''
}

const extractPriceAmount = (input, depth = 0) => {
  if (depth > 3 || input == null) return null

  const primitive = parseNumberish(input)
  if (primitive !== null) return primitive

  if (Array.isArray(input)) {
    for (const entry of input) {
      const extracted = extractPriceAmount(entry, depth + 1)
      if (extracted !== null) return extracted
    }
    return null
  }

  if (typeof input !== 'object') return null

  const centKeys = [
    'amountInCents',
    'amount_cents',
    'amountCents',
    'cents',
    'unitAmount',
    'unit_amount',
  ]
  for (const key of centKeys) {
    const cents = parseNumberish(input?.[key])
    if (cents !== null) return cents / 100
  }

  const valueKeys = [
    'amount',
    'value',
    'price',
    'servicePrice',
    'basePrice',
    'cost',
    'defaultPrice',
    'minPrice',
    'maxPrice',
  ]
  for (const key of valueKeys) {
    const direct = parseNumberish(input?.[key])
    if (direct !== null) return direct
  }

  const nestedKeys = [
    'price',
    'pricing',
    'prices',
    'rate',
    'cost',
    'default',
    'values',
    'amounts',
    'money',
  ]
  for (const key of nestedKeys) {
    if (input?.[key] == null) continue
    const nested = extractPriceAmount(input[key], depth + 1)
    if (nested !== null) return nested
  }

  for (const value of Object.values(input)) {
    const nested = extractPriceAmount(value, depth + 1)
    if (nested !== null) return nested
  }

  return null
}

const resolveServiceCurrency = (service = {}) => {
  const directCandidates = [
    service?.currency,
    service?.priceCurrency,
    service?.currencyCode,
    service?.pricing?.currency,
    service?.pricing?.currencyCode,
    service?.price?.currency,
    service?.price?.currencyCode,
    service?.servicePrice?.currency,
    service?.servicePrice?.currencyCode,
  ]

  for (const candidate of directCandidates) {
    const normalized = normalizeCurrencyCode(candidate)
    if (normalized) return normalized
  }

  return 'USD'
}

const resolveServicePrice = (service = {}) => {
  const candidates = [
    service?.price,
    service?.amount,
    service?.servicePrice,
    service?.basePrice,
    service?.cost,
    service?.priceValue,
    service?.priceAmount,
    service?.defaultPrice,
    service?.pricing,
    service?.prices,
    service?.rate,
  ]

  for (const candidate of candidates) {
    const extracted = extractPriceAmount(candidate)
    if (extracted !== null) {
      return extracted
    }
  }

  return ''
}

const normalizeSingleCalendarServicePayload = (payload) => {
  if (!payload || typeof payload !== 'object') return null

  const candidates = [
    payload.service,
    payload.serviceCatalog,
    payload.catalog,
    payload.data?.service,
    payload.data?.serviceCatalog,
    payload.data?.catalog,
    payload.data,
  ]

  return candidates.find(
    (entry) => entry && typeof entry === 'object' && !Array.isArray(entry)
  ) || null
}

const normalizeCalendarServiceEntity = (service, index = 0) => {
  const staffEntries = [
    ...(Array.isArray(service?.staff) ? service.staff : []),
    ...(Array.isArray(service?.users) ? service.users : []),
    ...(Array.isArray(service?.assignedUsers) ? service.assignedUsers : []),
    ...(Array.isArray(service?.teamMembers) ? service.teamMembers : []),
  ]

  const staffNames = staffEntries
    .map((entry) =>
      [
        entry?.name,
        entry?.fullName,
        [entry?.firstName, entry?.lastName].filter(Boolean).join(' ').trim(),
      ]
        .find(Boolean)
        ?.trim()
    )
    .filter(Boolean)

  return {
    ...service,
    id: service?.id || service?._id || service?.serviceId || `ghl-service-${index}`,
    serviceId: service?.id || service?._id || service?.serviceId || `ghl-service-${index}`,
    name: service?.name || service?.title || service?.serviceName || 'Untitled Service',
    description:
      service?.description || service?.details || service?.serviceDescription || '',
    category:
      service?.categoryName ||
      service?.category?.name ||
      service?.groupName ||
      service?.group ||
      '',
    duration:
      service?.duration ??
      service?.durationInMinutes ??
      service?.serviceDuration ??
      service?.slotDuration ??
      service?.durationMinutes ??
      '',
    durationMinutes: parseServiceDurationMinutes(
      service?.duration ??
        service?.durationInMinutes ??
        service?.serviceDuration ??
        service?.slotDuration ??
        service?.durationMinutes ??
        ''
    ),
    price: resolveServicePrice(service),
    currency: resolveServiceCurrency(service),
    calendarId:
      service?.calendarId ||
      service?.calendar?.id ||
      service?.calendar?._id ||
      '',
    calendarName:
      service?.calendarName || service?.calendar?.name || service?.calendar?.title || '',
    timeZone:
      service?.timeZone ||
      service?.timezone ||
      service?.calendarTimeZone ||
      service?.calendar?.timeZone ||
      service?.calendar?.timezone ||
      '',
    staff: staffEntries,
    staffNames,
    staffCount: staffNames.length || staffEntries.length,
    schedulingLink: extractSchedulingLink(service),
    permanentLink: extractPermanentLink(service),
    embedCode: extractEmbedCode(service),
    mCode: extractEmbedCode(service),
    isActive: service?.isActive ?? service?.active ?? true,
  }
}

const normalizeCalendarEntity = (calendar) => ({
  ...calendar,
  id:
    calendar?.id ||
    calendar?._id ||
    calendar?.calendarId ||
    calendar?.calendarID ||
    calendar?.calendar_id ||
    '',
  name: calendar?.name || calendar?.title || '',
  timeZone:
    calendar?.timeZone ||
    calendar?.timezone ||
    calendar?.calendarTimeZone ||
    calendar?.timezoneId ||
    calendar?.settings?.timeZone ||
    calendar?.settings?.timezone ||
    '',
  userId: calendar?.userId || calendar?.assignedUserId || '',
  teamId: calendar?.teamId || '',
})

const isCalendarMarkedInactive = (calendar = {}) => {
  const status = `${calendar?.status || calendar?.calendarStatus || ''}`
    .trim()
    .toLowerCase()

  if (status) {
    if (
      status.includes('inactive') ||
      status.includes('disabled') ||
      status.includes('archived') ||
      status.includes('deleted')
    ) {
      return true
    }
    if (status.includes('active')) {
      return false
    }
  }

  if (calendar?.isActive === false || calendar?.active === false) return true
  if (calendar?.isDeleted === true || calendar?.deleted === true) return true
  if (calendar?.archived === true || calendar?.disabled === true) return true

  return false
}

const loadCalendarsForLocation = async (locationId, token) => {
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

  return {
    source,
    calendars: calendars.map(normalizeCalendarEntity),
  }
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
  if (rawDatePrefix) {
    // Trust the original calendar date whenever the payload includes one.
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

const splitFullName = (fullName = '') => {
  const normalized = `${fullName || ''}`.trim()
  if (!normalized) {
    return { firstName: 'Guest', lastName: '' }
  }

  const parts = normalized.split(/\s+/)
  return {
    firstName: parts.shift() || 'Guest',
    lastName: parts.join(' '),
  }
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

const parseBookingDateTime = (
  dateInput,
  timeString,
  duration = 60,
  timeZone = ''
) => {
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

  let start
  if (timeZone) {
    const dateKey = getDateKeyFromInput(dateInput)
    const wallClock = `${dateKey}T${String(hour).padStart(2, '0')}:${String(
      minute
    ).padStart(2, '0')}:00`
    start = zonedDateTimeToUtc(wallClock, timeZone)
  } else {
    const date = new Date(dateInput)
    if (Number.isNaN(date.getTime())) {
      throw new Error('Invalid booking date')
    }
    date.setHours(hour, minute, 0, 0)
    start = date
  }

  return {
    start,
    end: new Date(start.getTime() + (Number.parseInt(duration, 10) || 60) * 60000),
  }
}

const extractContactId = (payload) =>
  payload?.contact?.id ||
  payload?.contact?._id ||
  payload?.contact?.contactId ||
  payload?.contacts?.[0]?.id ||
  payload?.contacts?.[0]?._id ||
  payload?.data?.contact?.id ||
  payload?.data?.contact?._id ||
  payload?.id ||
  payload?._id ||
  ''

const extractAppointmentId = (payload) =>
  payload?.appointment?.id ||
  payload?.appointment?._id ||
  payload?.event?.id ||
  payload?.event?._id ||
  payload?.id ||
  payload?._id ||
  ''

const to12HourLabelFrom24Hour = (hour24 = 0, minute = 0) => {
  const safeHour = Number.isFinite(hour24) ? hour24 : 0
  const safeMinute = Number.isFinite(minute) ? minute : 0
  const suffix = safeHour >= 12 ? 'PM' : 'AM'
  const hour12 = safeHour % 12 || 12
  return `${hour12}:${String(safeMinute).padStart(2, '0')} ${suffix}`
}

const extractTimeLabelFromIsoLikeSlot = (slotValue = '') => {
  const match = `${slotValue || ''}`.match(/T(\d{2}):(\d{2})/)
  if (!match) return ''
  const hour = Number.parseInt(match[1], 10)
  const minute = Number.parseInt(match[2], 10)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return ''
  return to12HourLabelFrom24Hour(hour, minute)
}

const extractOffsetFromIsoLikeSlot = (slotValue = '') => {
  const match = `${slotValue || ''}`.match(/([+-]\d{2}:\d{2}|Z)$/i)
  if (!match) return ''
  return match[1].toUpperCase() === 'Z' ? '+00:00' : match[1]
}

export const fetchCalendarFreeSlotsForDate = async (
  locationId,
  calendarId,
  date
) => {
  if (!locationId || !calendarId || !date) {
    return {
      slots: [],
      rawSlots: [],
      timeZone: '',
      source: 'ghl-v2-free-slots',
    }
  }

  const token = await getTokenForLocation(locationId)
  if (!token) {
    return {
      slots: [],
      rawSlots: [],
      timeZone: '',
      source: 'ghl-v2-free-slots',
      unavailable: true,
      reason: `No GHL API key configured for location ${locationId}`,
    }
  }

  const startMs = Date.parse(`${date}T00:00:00.000Z`)
  const endMs = Date.parse(`${date}T23:59:59.999Z`)

  const response = await makeGHLV2Request(`/calendars/${calendarId}/free-slots`, {
    token,
    params: {
      startDate: startMs,
      endDate: endMs,
    },
    suppressErrorLog: true,
  })

  const rawSlots = Object.values(response || {})
    .filter((entry) => entry && typeof entry === 'object' && Array.isArray(entry.slots))
    .flatMap((entry) => entry.slots || [])
    .map((entry) => `${entry || ''}`.trim())
    .filter(Boolean)

  const slots = rawSlots
    .map(extractTimeLabelFromIsoLikeSlot)
    .filter(Boolean)

  const timeZone =
    extractOffsetFromIsoLikeSlot(rawSlots[0]) ||
    ''

  return {
    slots,
    rawSlots,
    timeZone,
    source: 'ghl-v2-free-slots',
  }
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

  // First try v2 endpoints/param shapes. If all fail, fall back to v1 appointments.
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

  let hadV2Success = false
  let lastV2Error = null

  for (const attempt of v2Attempts) {
    try {
      const response = await makeGHLV2Request(attempt.endpoint, {
        token,
        params: attempt.params,
        suppressErrorLog: true,
      })
      hadV2Success = true

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
        effectiveTimeZone: timeZone || normalizedEvents[0]?.timeZone || '',
      }
    } catch (error) {
      lastV2Error = error
    }
  }

  // v2 reached successfully but returned no events across tested endpoints.
  if (hadV2Success) {
    return {
      events: [],
      rawCount: 0,
      total: 0,
      source: 'ghl-v2',
      effectiveTimeZone: timeZone || '',
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
  let v1Response
  try {
    v1Response = await makeGHLRequest(v1Endpoint, 'GET', null, token)
  } catch (v1Error) {
    if (lastV2Error) throw lastV2Error
    throw v1Error
  }
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
    effectiveTimeZone: timeZone || normalizedEvents[0]?.timeZone || '',
  }
}

export const resolveCalendarDetailsForLocation = async (locationId, calendarId) => {
  if (!locationId || !calendarId) return null

  const token = await getTokenForLocation(locationId)
  if (!token) return null

  const { calendars } = await loadCalendarsForLocation(locationId, token)
  const match = calendars.find((calendar) => `${calendar.id || ''}` === `${calendarId}`)

  return match || null
}

export const resolveUsableCalendarForLocation = async (
  locationId,
  {
    preferredCalendarId = '',
    preferredCalendarName = '',
  } = {}
) => {
  if (!locationId) return null

  const token = await getTokenForLocation(locationId)
  if (!token) return null

  const { calendars } = await loadCalendarsForLocation(locationId, token)
  if (!calendars.length) return null

  const preferred = preferredCalendarId
    ? calendars.find((calendar) => `${calendar.id || ''}` === `${preferredCalendarId}`)
    : null

  if (preferred && !isCalendarMarkedInactive(preferred)) {
    return preferred
  }

  const normalizedPreferredName = `${preferredCalendarName || ''}`.trim().toLowerCase()
  if (normalizedPreferredName) {
    const preferredByName = calendars.find((calendar) => {
      if (isCalendarMarkedInactive(calendar)) return false
      return `${calendar.name || ''}`.trim().toLowerCase() === normalizedPreferredName
    })
    if (preferredByName) return preferredByName
  }

  const firstActive = calendars.find((calendar) => !isCalendarMarkedInactive(calendar))
  return firstActive || preferred || null
}

export const ensureGhlContactForLocation = async (
  locationId,
  {
    email = '',
    phone = '',
    name = '',
  } = {}
) => {
  console.info('[GHL:Contact] Ensure contact start', {
    locationId: `${locationId || ''}`.trim(),
    email: `${email || ''}`.trim().toLowerCase(),
    hasPhone: Boolean(`${phone || ''}`.trim()),
    hasName: Boolean(`${name || ''}`.trim()),
  })

  const token = await getTokenForLocation(locationId)
  if (!token) {
    throw new Error(`No GHL API key configured for location ${locationId}`)
  }

  if (!email && !phone && !name) {
    throw new Error('Customer identity is required to sync a GHL contact')
  }

  const { firstName, lastName } = splitFullName(name)
  const baseContactPayload = {
    locationId,
    firstName,
    lastName,
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
  }

  // Prefer v2 contacts flow for Private Integration tokens.
  try {
    const upsertResponse = await makeGHLV2Request('/contacts/upsert', {
      method: 'POST',
      token,
      data: baseContactPayload,
    })
    const upsertedContactId = extractContactId(upsertResponse)
    if (upsertedContactId) {
      console.info('[GHL:Contact] Ensure contact success via v2 upsert', {
        locationId: `${locationId || ''}`.trim(),
        contactId: `${upsertedContactId || ''}`,
      })
      return { token, contactId: upsertedContactId, created: true }
    }
  } catch (error) {
    console.warn(
      `GHL v2 contact upsert failed for ${locationId}:`,
      error.response?.data || error.message
    )
  }

  let existing = null

  if (email || phone) {
    const query = new URLSearchParams()
    if (email) query.set('email', email)
    if (phone) query.set('phone', phone)

    try {
      const lookupResponse = await makeGHLRequest(
        `/contacts/lookup?${query.toString()}`,
        'GET',
        null,
        token
      )
      const contactId = extractContactId(lookupResponse)
      if (contactId) {
        console.info('[GHL:Contact] Found existing contact via lookup', {
          locationId: `${locationId || ''}`.trim(),
          contactId: `${contactId || ''}`,
        })
        return { token, contactId, created: false }
      }
      existing = lookupResponse
    } catch (error) {
      console.warn(
        `GHL contact lookup failed for ${locationId}:`,
        error.response?.data || error.message
      )
    }
  }

  const createPayload = {
    firstName,
    lastName,
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
  }

  const createResponse = await makeGHLRequest(
    '/contacts/',
    'POST',
    createPayload,
    token
  )

  const createdContactId = extractContactId(createResponse || existing)
  if (!createdContactId) {
    throw new Error('Failed to resolve GHL contact ID after contact creation')
  }

  console.info('[GHL:Contact] Created contact via v1 fallback', {
    locationId: `${locationId || ''}`.trim(),
    contactId: `${createdContactId || ''}`,
  })

  return {
    token,
    contactId: createdContactId,
    created: true,
  }
}

export const enrollContactInWorkflowForLocation = async (
  locationId,
  {
    workflowId = '',
    contactId = '',
    email = '',
    phone = '',
    name = '',
  } = {}
) => {
  const normalizedLocationId = `${locationId || ''}`.trim()
  const normalizedWorkflowId = `${workflowId || ''}`.trim()
  const normalizedContactId = `${contactId || ''}`.trim()

  if (!normalizedLocationId) {
    throw new Error('Location ID is required for workflow enrollment')
  }
  if (!normalizedWorkflowId) {
    throw new Error('Workflow ID is required for workflow enrollment')
  }

  const token = await getTokenForLocation(normalizedLocationId)
  if (!token) {
    throw new Error(`No GHL API key configured for location ${normalizedLocationId}`)
  }

  let finalContactId = normalizedContactId
  if (!finalContactId) {
    const ensured = await ensureGhlContactForLocation(normalizedLocationId, {
      email,
      phone,
      name,
    })
    finalContactId = `${ensured?.contactId || ''}`.trim()
  }

  if (!finalContactId) {
    throw new Error('Unable to resolve contact ID for workflow enrollment')
  }

  const response = await makeGHLV2Request(
    `/contacts/${finalContactId}/workflow/${normalizedWorkflowId}`,
    {
      method: 'POST',
      token,
      data: { locationId: normalizedLocationId },
      suppressErrorLog: true,
    }
  )

  return {
    locationId: normalizedLocationId,
    workflowId: normalizedWorkflowId,
    contactId: finalContactId,
    response,
  }
}

export const addTagsToContactForLocation = async (
  locationId,
  {
    contactId = '',
    tags = [],
    email = '',
    phone = '',
    name = '',
  } = {}
) => {
  const normalizedLocationId = `${locationId || ''}`.trim()
  const normalizedContactId = `${contactId || ''}`.trim()
  const normalizedTags = Array.from(
    new Set(
      (Array.isArray(tags) ? tags : [])
        .map((tag) => `${tag || ''}`.trim())
        .filter(Boolean)
    )
  )

  if (!normalizedLocationId) {
    throw new Error('Location ID is required to add contact tags')
  }
  if (!normalizedTags.length) {
    throw new Error('At least one tag is required')
  }

  const token = await getTokenForLocation(normalizedLocationId)
  if (!token) {
    throw new Error(`No GHL API key configured for location ${normalizedLocationId}`)
  }

  let finalContactId = normalizedContactId
  if (!finalContactId) {
    const ensured = await ensureGhlContactForLocation(normalizedLocationId, {
      email,
      phone,
      name,
    })
    finalContactId = `${ensured?.contactId || ''}`.trim()
  }

  if (!finalContactId) {
    throw new Error('Unable to resolve contact ID before adding tags')
  }

  console.info('[GHL:Tags] Add tags request', {
    locationId: normalizedLocationId,
    contactId: finalContactId,
    tags: normalizedTags,
  })

  const response = await makeGHLV2Request(`/contacts/${finalContactId}/tags`, {
    method: 'POST',
    token,
    data: { tags: normalizedTags },
    suppressErrorLog: true,
  })

  return {
    locationId: normalizedLocationId,
    contactId: finalContactId,
    tags: normalizedTags,
    response,
  }
}

export const createGhlAppointmentForBooking = async ({
  booking,
  service,
  customer,
}) => {
  const locationId = booking?.locationId || service?.locationId
  if (!locationId) {
    throw new Error('Booking location is required for GHL sync')
  }

  const preferredCalendarId = `${booking?.ghl?.calendarId || service?.ghlCalendar?.calendarId || ''}`.trim()
  if (!preferredCalendarId) {
    return { skipped: true, reason: 'No GHL calendar linked to service' }
  }

  let resolvedCalendar = null
  try {
    resolvedCalendar = await resolveUsableCalendarForLocation(
      locationId,
      {
        preferredCalendarId,
        preferredCalendarName:
          `${booking?.ghl?.calendarName || service?.ghlCalendar?.name || ''}`.trim(),
      }
    )
  } catch (calendarResolveError) {
    console.warn(
      `Unable to resolve usable calendar for location ${locationId}:`,
      calendarResolveError?.response?.data || calendarResolveError?.message
    )
  }

  const calendarId = `${resolvedCalendar?.id || preferredCalendarId}`.trim()
  const hasCalendarFallback = Boolean(
    resolvedCalendar?.id && `${resolvedCalendar.id}` !== preferredCalendarId
  )
  if (!calendarId) {
    return { skipped: true, reason: 'No usable GHL calendar found for location' }
  }

  const { token, contactId } = await ensureGhlContactForLocation(locationId, {
    email: customer?.email || '',
    phone: customer?.phone || '',
    name: customer?.name || booking?.clientName || 'Guest',
  })

  const timeZone =
    `${resolvedCalendar?.timeZone || booking?.ghl?.timeZone || service?.ghlCalendar?.timeZone || ''}`.trim() ||
    'UTC'
  const payloadTimeZone = normalizeTimeZoneForGhlPayload(timeZone)
  const window = parseBookingDateTime(
    booking.date,
    booking.time,
    booking.duration,
    timeZone
  )
  const assignedUserId =
    `${resolvedCalendar?.userId || booking?.ghl?.userId || service?.ghlCalendar?.userId || ''}`.trim()
  const teamId = `${resolvedCalendar?.teamId || booking?.ghl?.teamId || service?.ghlCalendar?.teamId || ''}`.trim()

  const basePayload = {
    locationId,
    calendarId,
    contactId,
    startTime: window.start.toISOString(),
    endTime: window.end.toISOString(),
    selectedSlot: window.start.toISOString(),
    selectedTimezone: payloadTimeZone,
    title: booking.serviceName || service?.name || 'Appointment',
    appointmentTitle: booking.serviceName || service?.name || 'Appointment',
    appointmentStatus: 'confirmed',
    notes: booking.notes || '',
    timeZone: payloadTimeZone,
    source: 'pwa-radiant',
    ...(assignedUserId ? { assignedUserId } : {}),
    ...(teamId ? { teamId } : {}),
  }

  if (booking && typeof booking === 'object') {
    if (!booking.ghl || typeof booking.ghl !== 'object') {
      booking.ghl = {}
    }
    booking.ghl.calendarId = calendarId
    booking.ghl.calendarName = `${resolvedCalendar?.name || booking?.ghl?.calendarName || service?.ghlCalendar?.name || ''}`.trim()
    booking.ghl.timeZone = timeZone
    booking.ghl.userId = assignedUserId
    booking.ghl.teamId = teamId
  }

  // Booking sync is v2-only. Do not fall back to legacy v1 for location API keys.
  const attempts = [
    {
      endpoint: '/calendars/events/appointments',
      method: 'POST',
      transport: 'v2',
      data: basePayload,
    },
  ]

  let lastError = null

  for (const attempt of attempts) {
    try {
      const response =
        attempt.transport === 'v2'
          ? await makeGHLV2Request(attempt.endpoint, {
              method: attempt.method,
              token,
              data: attempt.data,
            })
          : await makeGHLRequest(
              attempt.endpoint,
              attempt.method,
              attempt.data,
              token
            )

      return {
        skipped: false,
        appointmentId: extractAppointmentId(response),
        response,
      }
    } catch (error) {
      const message = `${error?.response?.data?.message || error?.message || ''}`.toLowerCase()
      const isV2SlotUnavailable =
        attempt.transport === 'v2' &&
        error?.response?.status === 400 &&
        message.includes('slot you have selected is no longer available')
      const isV2InactiveCalendar =
        attempt.transport === 'v2' &&
        error?.response?.status === 400 &&
        message.includes('calendar is inactive')

      // If v2 confirms a real business failure (slot no longer available),
      // fail fast so we don't retry blindly.
      if (isV2SlotUnavailable || isV2InactiveCalendar) {
        throw error
      }

      lastError = error
      console.warn('[GHL:SYNC] Appointment create failed', {
        bookingId: `${booking?._id || ''}`,
        transport: attempt.transport,
        endpoint: attempt.endpoint,
        statusCode: error?.response?.status || error?.response?.data?.statusCode || null,
        message: error?.response?.data?.message || error?.response?.data?.msg || error?.message,
      })
    }
  }

  throw lastError || new Error('Failed to create GHL appointment')
}

const normalizeErrorMessage = (value) => {
  if (Array.isArray(value)) return value.join(' ')
  return `${value || ''}`.trim()
}

export const cancelGhlAppointmentForBooking = async ({
  booking,
  reason = '',
}) => {
  const appointmentId = `${booking?.ghl?.appointmentId || ''}`.trim()
  if (!appointmentId) {
    return { skipped: true, reason: 'No GHL appointment linked to booking' }
  }

  const locationId = `${booking?.locationId || ''}`.trim()
  if (!locationId) {
    throw new Error('Booking location is required for GHL cancellation')
  }

  const token = await getTokenForLocation(locationId)
  if (!token) {
    throw new Error(`No GHL API key configured for location ${locationId}`)
  }

  const cancelNotes = `${reason || booking?.cancelReason || ''}`.trim()
  const attempts = [
    {
      endpoint: `/calendars/events/appointments/${appointmentId}`,
      method: 'PUT',
      data: {
        appointmentStatus: 'cancelled',
        ...(cancelNotes ? { notes: cancelNotes } : {}),
      },
      transport: 'v2',
    },
    {
      endpoint: `/calendars/events/appointments/${appointmentId}`,
      method: 'PUT',
      data: {
        appointmentStatus: 'canceled',
        ...(cancelNotes ? { notes: cancelNotes } : {}),
      },
      transport: 'v2',
    },
    {
      endpoint: `/calendars/events/appointments/${appointmentId}`,
      method: 'PUT',
      data: {
        status: 'cancelled',
        ...(cancelNotes ? { notes: cancelNotes } : {}),
      },
      transport: 'v2',
    },
    {
      endpoint: `/calendars/events/${appointmentId}`,
      method: 'DELETE',
      data: null,
      transport: 'v2',
    },
  ]

  let lastError = null
  for (const attempt of attempts) {
    try {
      const response = await makeGHLV2Request(attempt.endpoint, {
        method: attempt.method,
        token,
        ...(attempt.data ? { data: attempt.data } : {}),
      })
      return {
        skipped: false,
        appointmentId,
        response,
      }
    } catch (error) {
      lastError = error
      console.warn('[GHL:CANCEL] Appointment cancel attempt failed', {
        bookingId: `${booking?._id || ''}`,
        appointmentId,
        endpoint: attempt.endpoint,
        method: attempt.method,
        statusCode: error?.response?.status || error?.response?.data?.statusCode || null,
        message: normalizeErrorMessage(
          error?.response?.data?.message || error?.response?.data?.msg || error?.message
        ),
      })
    }
  }

  throw lastError || new Error('Failed to cancel GHL appointment')
}

// Test API connection
export const testConnection = async (req, res, next) => {
  try {
    const { locationId, token } = await getTokenContextFromRequest(req)
    const response = await makeGHLRequest('/contacts/', 'GET', null, token)

    res.status(200).json({
      success: true,
      message: 'GHL Location API connection successful',
      locationId,
      sampleData: response,
    })
  } catch (error) {
    res.status(error.response?.status || error.statusCode || 500).json({
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
    const { locationId, token } = await getTokenContextFromRequest(req)

    const endpoint = `/contacts/?limit=${limit}&skip=${skip}`
    const response = await makeGHLRequest(endpoint, 'GET', null, token)

    res.status(200).json({
      success: true,
      message: 'Contacts fetched successfully',
      locationId,
      data: response,
      pagination: {
        limit: parseInt(limit),
        skip: parseInt(skip),
        count: response.contacts?.length || 0,
        total: response.meta?.total || 0,
      },
    })
  } catch (error) {
    res.status(error.response?.status || error.statusCode || 500).json({
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
    const { locationId, token } = await getTokenContextFromRequest(req)
    let allContacts = []
    let skip = 0
    const limit = 100
    let hasMore = true

    while (hasMore && allContacts.length < maxContacts) {
      try {
        const response = await makeGHLRequest(
          `/contacts/?limit=${limit}&skip=${skip}`,
          'GET',
          null,
          token
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
      locationId,
      data: {
        contacts: allContacts,
        meta: {
          total: allContacts.length,
          requestedMax: maxContacts,
        },
      },
    })
  } catch (error) {
    res.status(error.response?.status || error.statusCode || 500).json({
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
    const { token } = await getTokenContextFromRequest(req)

    if (!contactId) {
      return res.status(400).json({
        success: false,
        message: 'Contact ID is required',
      })
    }

    const response = await makeGHLRequest(`/contacts/${contactId}`, 'GET', null, token)

    res.status(200).json({
      success: true,
      message: 'Contact fetched successfully',
      data: response,
    })
  } catch (error) {
    res.status(error.response?.status || error.statusCode || 500).json({
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
    const { token } = await getTokenContextFromRequest(req)

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Either email or phone parameter is required',
      })
    }

    let endpoint = '/contacts/lookup?'
    if (email) endpoint += `email=${encodeURIComponent(email)}&`
    if (phone) endpoint += `phone=${encodeURIComponent(phone)}&`

    const response = await makeGHLRequest(endpoint.slice(0, -1), 'GET', null, token)

    res.status(200).json({
      success: true,
      message: 'Contact lookup completed',
      data: response,
      searchCriteria: { email, phone },
    })
  } catch (error) {
    res.status(error.response?.status || error.statusCode || 500).json({
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
    const { token } = await getTokenContextFromRequest(req)

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

    const response = await makeGHLRequest('/contacts/', 'POST', contactData, token)

    res.status(201).json({
      success: true,
      message: 'Contact created successfully',
      data: response,
    })
  } catch (error) {
    res.status(error.response?.status || error.statusCode || 500).json({
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
    const { token } = await getTokenContextFromRequest(req)

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
      updateData,
      token
    )

    res.status(200).json({
      success: true,
      message: 'Contact updated successfully',
      data: response,
    })
  } catch (error) {
    res.status(error.response?.status || error.statusCode || 500).json({
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
    const { token } = await getTokenContextFromRequest(req)

    if (!contactId) {
      return res.status(400).json({
        success: false,
        message: 'Contact ID is required',
      })
    }

    const response = await makeGHLRequest(`/contacts/${contactId}`, 'DELETE', null, token)

    res.status(200).json({
      success: true,
      message: 'Contact deleted successfully',
      data: response,
    })
  } catch (error) {
    res.status(error.response?.status || error.statusCode || 500).json({
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
    const { token } = await getTokenContextFromRequest(req)

    const endpoint = `/opportunities/?limit=${limit}&skip=${skip}`
    const response = await makeGHLRequest(endpoint, 'GET', null, token)

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
    res.status(error.response?.status || error.statusCode || 500).json({
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
        calendars: calendars.map(normalizeCalendarEntity),
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

export const getCalendarServices = async (req, res, next) => {
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

    const attempts = [
      { endpoint: '/calendars/services/catalog', source: 'ghl-v2' },
      { endpoint: '/calendars/services/catalog/', source: 'ghl-v2' },
      { endpoint: '/calendars/services', source: 'ghl-v2-fallback' },
    ]

    let lastError = null
    const attemptErrors = []
    const bookingSubdomain = await resolveBookingSubdomainForLocation(locationId)

    for (const attempt of attempts) {
      try {
        const response = await makeGHLV2Request(attempt.endpoint, {
          token,
          params: { locationId },
        })

        const services = normalizeCalendarServicesPayload(response)
          .map(normalizeCalendarServiceEntity)
          .map((service) => applyBookingFallback(service, bookingSubdomain))

        return res.status(200).json({
          success: true,
          message: 'Calendar services fetched successfully',
          data: {
            services,
            total: services.length,
            source: attempt.source,
          },
        })
      } catch (error) {
        lastError = error
        attemptErrors.push({
          endpoint: attempt.endpoint,
          source: attempt.source,
          statusCode: error?.response?.status || error?.response?.data?.statusCode || null,
          message: error?.response?.data?.message || error?.response?.data?.msg || error?.message,
        })
      }
    }

    console.warn('[GHL:getCalendarServices] v2 attempts failed', {
      locationId,
      attemptErrors,
    })
    throw lastError || new Error('Failed to fetch GHL calendar services')
  } catch (error) {
    res.status(200).json({
      success: true,
      message: 'Calendar services unavailable, using fallback',
      data: {
        services: [],
        total: 0,
        source: 'ghl-v2',
        unavailable: true,
        error: error.response?.data || error.message,
      },
    })
  }
}

export const getWorkflows = async (req, res, next) => {
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

    const maskTokenForLogs = (value = '') => {
      const normalized = `${value || ''}`.trim()
      if (!normalized) return 'empty'
      if (normalized.length <= 10) return `${normalized.slice(0, 2)}***${normalized.slice(-1)}`
      return `${normalized.slice(0, 6)}...${normalized.slice(-4)}`
    }
    const summarizeError = (error) => ({
      statusCode: error?.response?.status || error?.response?.data?.statusCode || null,
      message: `${error?.response?.data?.message || error?.response?.data?.msg || error?.message || ''}`.trim(),
      data: error?.response?.data || null,
    })

    console.info('[GHL:getWorkflows] starting fetch', {
      locationId,
      tokenPreview: maskTokenForLogs(token),
      tokenLength: token.length,
    })

    const attempts = [
      { endpoint: '/workflows/', source: 'ghl-v2' },
      { endpoint: '/workflows', source: 'ghl-v2' },
    ]

    let lastError = null
    let hasScopeAuthorizationError = false
    let hasInvalidApiKeyError = false
    let hasNotFoundError = false
    const attemptErrors = []

    for (const attempt of attempts) {
      try {
        console.info('[GHL:getWorkflows] trying endpoint', {
          locationId,
          source: attempt.source,
          endpoint: attempt.endpoint,
        })
        const response = await makeGHLV2Request(attempt.endpoint, {
          token,
          params: { locationId },
          suppressErrorLog: true,
        })

        const workflows = normalizeWorkflowsPayload(response).map(
          normalizeWorkflowEntity
        )

        console.info('[GHL:getWorkflows] endpoint success', {
          locationId,
          source: attempt.source,
          endpoint: attempt.endpoint,
          total: workflows.length,
        })

        return res.status(200).json({
          success: true,
          message: 'Automations fetched successfully',
          data: {
            workflows,
            total: workflows.length,
            source: attempt.source,
          },
        })
      } catch (error) {
        lastError = error
        const summary = summarizeError(error)
        const responseMessage = summary.message
        const responseStatus = summary.statusCode
        if (
          responseStatus === 401 &&
          responseMessage.toLowerCase().includes('scope')
        ) {
          hasScopeAuthorizationError = true
        }
        if (responseStatus === 404) {
          hasNotFoundError = true
        }
        if (
          responseStatus === 401 &&
          responseMessage.toLowerCase().includes('api key is invalid')
        ) {
          hasInvalidApiKeyError = true
        }
        attemptErrors.push({
          endpoint: attempt.endpoint,
          source: attempt.source,
          statusCode: responseStatus,
          message: responseMessage,
        })
        console.warn('[GHL:getWorkflows] endpoint failed', {
          locationId,
          source: attempt.source,
          endpoint: attempt.endpoint,
          ...summary,
        })
      }
    }

    try {
      console.info('[GHL:getWorkflows] falling back to v1 endpoint', {
        locationId,
        endpoint: '/workflows/',
      })
      const v1Response = await makeGHLRequest('/workflows/', 'GET', null, token)
      const workflows = normalizeWorkflowsPayload(v1Response).map(
        normalizeWorkflowEntity
      )

      console.info('[GHL:getWorkflows] v1 fallback success', {
        locationId,
        source: 'ghl-v1',
        endpoint: '/workflows/',
        total: workflows.length,
      })

      return res.status(200).json({
        success: true,
        message: 'Automations fetched successfully',
        data: {
          workflows,
          total: workflows.length,
          source: 'ghl-v1',
        },
      })
    } catch (v1Error) {
      lastError = v1Error
      const summary = summarizeError(v1Error)
      if (
        summary.statusCode === 401 &&
        summary.message.toLowerCase().includes('api key is invalid')
      ) {
        hasInvalidApiKeyError = true
      }
      attemptErrors.push({
        endpoint: '/workflows/',
        source: 'ghl-v1',
        statusCode: summary.statusCode,
        message: summary.message,
      })
      console.warn('[GHL:getWorkflows] v1 fallback failed', {
        locationId,
        source: 'ghl-v1',
        endpoint: '/workflows/',
        ...summary,
      })
    }

    const diagnosis = {
      missingWorkflowScope: hasScopeAuthorizationError,
      invalidApiKeyForV1: hasInvalidApiKeyError,
      notFoundOnV2Route: hasNotFoundError,
      likelyCause:
        hasScopeAuthorizationError && hasInvalidApiKeyError
          ? 'Mixed token compatibility: v2 token lacks workflows scope and cannot be used as v1 API key.'
          : hasScopeAuthorizationError
            ? 'Token is valid but missing workflows.readonly scope.'
            : hasInvalidApiKeyError
              ? 'Configured credential is not valid for legacy v1 endpoint.'
              : hasNotFoundError
                ? 'Workflow route may be unavailable for this account/token type.'
                : 'Unknown error. See attemptErrors details.',
    }

    console.warn('[GHL:getWorkflows] all attempts failed', {
      locationId,
      diagnosis,
      attemptErrors,
    })

    if (hasScopeAuthorizationError) {
      throw createPlainError(
        'The configured GHL token is missing the workflows.readonly scope.',
        403
      )
    }

    throw lastError || new Error('Failed to fetch GHL automations')
  } catch (error) {
    const fallbackReason = error?.response?.data || error.message
    console.warn('[GHL:getWorkflows] returning fallback response', {
      locationId: `${req?.query?.locationId || ''}`.trim(),
      reason: fallbackReason,
    })
    res.status(200).json({
      success: true,
      message: 'Automations unavailable, using fallback',
      data: {
        workflows: [],
        total: 0,
        source: 'ghl-v2',
        unavailable: true,
        error: fallbackReason,
      },
    })
  }
}

export const getCalendarServiceById = async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    res.set('Pragma', 'no-cache')
    res.set('Expires', '0')
    res.set('Surrogate-Control', 'no-store')

    const { locationId } = req.query
    const { serviceId } = req.params

    if (!locationId || !serviceId) {
      return res.status(400).json({
        success: false,
        message: 'locationId and serviceId are required',
      })
    }

    const token = await getTokenForLocation(locationId)
    if (!token) {
      return res.status(400).json({
        success: false,
        message: `No GHL API key configured for location ${locationId}`,
      })
    }

    const attempts = [
      { endpoint: `/calendars/services/catalog/${serviceId}`, source: 'ghl-v2' },
      { endpoint: `/calendars/services/catalog/${serviceId}/`, source: 'ghl-v2' },
      { endpoint: `/calendars/services/${serviceId}`, source: 'ghl-v2-fallback' },
    ]

    let lastError = null
    const attemptErrors = []
    const bookingSubdomain = await resolveBookingSubdomainForLocation(locationId)

    for (const attempt of attempts) {
      try {
        const response = await makeGHLV2Request(attempt.endpoint, {
          token,
          params: { locationId },
        })

        const rawService = normalizeSingleCalendarServicePayload(response)
        if (!rawService) continue

        const service = applyBookingFallback(
          normalizeCalendarServiceEntity(rawService),
          bookingSubdomain
        )

        return res.status(200).json({
          success: true,
          message: 'Calendar service fetched successfully',
          data: {
            service,
            source: attempt.source,
          },
        })
      } catch (error) {
        lastError = error
        attemptErrors.push({
          endpoint: attempt.endpoint,
          source: attempt.source,
          statusCode: error?.response?.status || error?.response?.data?.statusCode || null,
          message: error?.response?.data?.message || error?.response?.data?.msg || error?.message,
        })
      }
    }

    console.warn('[GHL:getCalendarServiceById] v2 attempts failed', {
      locationId,
      serviceId,
      attemptErrors,
    })
    throw lastError || new Error('Failed to fetch GHL calendar service')
  } catch (error) {
    res.status(200).json({
      success: true,
      message: 'Calendar service unavailable, using fallback',
      data: {
        service: null,
        source: 'ghl-v2',
        unavailable: true,
        error: error.response?.data || error.message,
      },
    })
  }
}

// Get custom fields
export const getCustomFields = async (req, res, next) => {
  try {
    const { token } = await getTokenContextFromRequest(req)
    const response = await makeGHLRequest('/custom-fields/', 'GET', null, token)

    res.status(200).json({
      success: true,
      message: 'Custom fields fetched successfully',
      data: response,
    })
  } catch (error) {
    res.status(error.response?.status || error.statusCode || 500).json({
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
