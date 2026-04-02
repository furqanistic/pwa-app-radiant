// File: server/controller/ghl.js
import axios from 'axios'
import Location from '../models/Location.js'

// GoHighLevel API v1 configuration for Location API Keys
const GHL_BASE_URL = 'https://rest.gohighlevel.com/v1'
const GHL_V2_BASE_URL = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = process.env.GHL_API_VERSION || '2021-07-28'
const KNOWN_BOOKING_PATH_BY_LOCATION = {
  // Ageless Wellness Spa
  '6RL2MtUxqIc5fUgWRw1O': 'ageless-wellness-spa-fzvcfoccwov',
}

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
  {
    method = 'GET',
    params = null,
    data = null,
    token = null,
    suppressErrorLog = false,
  } = {}
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
    if (!suppressErrorLog) {
      console.error('GHL v2 API Error:', error.response?.data || error.message)
    }
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
    const rawMap = process.env.GHL_BOOKING_PATH_MAP
    if (rawMap) {
      const parsedMap = JSON.parse(rawMap)
      const mapped = `${parsedMap?.[locationId] || ''}`.trim().toLowerCase()
      if (mapped) return mapped
    }
  } catch (error) {
    console.warn('Invalid GHL_BOOKING_PATH_MAP JSON:', error.message)
  }

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

const isOffsetTimeZone = (timeZone = '') => /^[+-]\d{2}:\d{2}$/.test(`${timeZone}`)

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
      service?.id ||
      service?._id ||
      service?.serviceId ||
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

const parseBookingDateTime = (dateInput, timeString, duration = 60) => {
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

  return {
    start: date,
    end: new Date(date.getTime() + (Number.parseInt(duration, 10) || 60) * 60000),
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

  let calendars = []

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
      const v1Response = await makeGHLRequest('/calendars/', 'GET', null, token)
      calendars = normalizeCalendarsPayload(v1Response)
    }
  }

  const match = calendars
    .map(normalizeCalendarEntity)
    .find((calendar) => `${calendar.id || ''}` === `${calendarId}`)

  return match || null
}

export const ensureGhlContactForLocation = async (
  locationId,
  {
    email = '',
    phone = '',
    name = '',
  } = {}
) => {
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

  return {
    token,
    contactId: createdContactId,
    created: true,
  }
}

export const createGhlAppointmentForBooking = async ({
  booking,
  service,
  customer,
}) => {
  const calendarId = `${booking?.ghl?.calendarId || service?.ghlCalendar?.calendarId || ''}`.trim()
  if (!calendarId) {
    return { skipped: true, reason: 'No GHL calendar linked to service' }
  }

  const locationId = booking?.locationId || service?.locationId
  if (!locationId) {
    throw new Error('Booking location is required for GHL sync')
  }

  const { token, contactId } = await ensureGhlContactForLocation(locationId, {
    email: customer?.email || '',
    phone: customer?.phone || '',
    name: customer?.name || booking?.clientName || 'Guest',
  })

  const window = parseBookingDateTime(booking.date, booking.time, booking.duration)
  const timeZone =
    `${booking?.ghl?.timeZone || service?.ghlCalendar?.timeZone || ''}`.trim() ||
    'UTC'
  const assignedUserId =
    `${booking?.ghl?.userId || service?.ghlCalendar?.userId || ''}`.trim()
  const teamId = `${booking?.ghl?.teamId || service?.ghlCalendar?.teamId || ''}`.trim()

  const basePayload = {
    locationId,
    calendarId,
    contactId,
    startTime: window.start.toISOString(),
    endTime: window.end.toISOString(),
    selectedSlot: window.start.toISOString(),
    selectedTimezone: timeZone,
    title: booking.serviceName || service?.name || 'Appointment',
    appointmentTitle: booking.serviceName || service?.name || 'Appointment',
    appointmentStatus: 'confirmed',
    notes: booking.notes || '',
    timeZone,
    source: 'pwa-radiant',
    ...(assignedUserId ? { assignedUserId } : {}),
    ...(teamId ? { teamId } : {}),
  }

  const attempts = [
    {
      endpoint: '/calendars/events/appointments',
      method: 'POST',
      transport: 'v2',
      data: basePayload,
    },
    {
      endpoint: '/appointments/',
      method: 'POST',
      transport: 'v1',
        data: {
          locationId,
          calendarId,
          contactId,
          title: basePayload.title,
          selectedTimezone: timeZone,
          selectedSlot: basePayload.selectedSlot,
          startTime: basePayload.startTime,
          endTime: basePayload.endTime,
          appointmentStatus: 'confirmed',
          notes: basePayload.notes,
          ...(assignedUserId ? { assignedUserId } : {}),
          ...(teamId ? { teamId } : {}),
          address: '',
          ignoreDateRange: true,
          toNotify: false,
      },
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

      // If v2 confirms a real business failure (slot no longer available),
      // do not fall back to v1 because it produces misleading auth noise.
      if (isV2SlotUnavailable) {
        throw error
      }

      lastError = error
    }
  }

  throw lastError || new Error('Failed to create GHL appointment')
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
      }
    }

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
      }
    }

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
