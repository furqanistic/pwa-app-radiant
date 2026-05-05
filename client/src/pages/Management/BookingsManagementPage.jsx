import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useBranding } from '@/context/BrandingContext'
import { cn } from '@/lib/utils'
import { resolveBrandingLogoUrl } from '@/lib/imageHelpers'
import Layout from '@/pages/Layout/Layout'
import ghlService from '@/services/ghlService'
import { locationService } from '@/services/locationService'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Copy,
  Eye,
  Mail,
  Phone,
  RefreshCw,
  Save,
  Search,
  SlidersHorizontal,
  User,
  X,
} from 'lucide-react'
import { addDays, compareAsc, format, isValid, parseISO } from 'date-fns'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'

const EMPTY_LOCATIONS = []
const EMPTY_SERVICES = []
const EMPTY_BOOKINGS = []
const BOOKING_STATUS_OPTIONS = [
  { value: 'booked', label: 'Booked' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no-show', label: 'No Show' },
]
const DATE_PRESETS = [
  { value: 'currentMonth', label: 'Current Month', getStartDate: () => getCurrentMonthRange().startDate, getEndDate: () => getCurrentMonthRange().endDate },
  { value: 'today', label: 'Today', startOffset: 0, endOffset: 0 },
  { value: 'tomorrow', label: 'Tomorrow', startOffset: 1, endOffset: 1 },
  { value: 'next7', label: 'Next 7 Days', startOffset: 0, endOffset: 7 },
  { value: 'next14', label: 'Next 14 Days', startOffset: 0, endOffset: 14 },
  { value: 'next30', label: 'Next 30 Days', startOffset: 0, endOffset: 30 },
  { value: 'next60', label: 'Next 60 Days', startOffset: 0, endOffset: 60 },
  { value: 'past7', label: 'Past 7 Days', startOffset: -7, endOffset: 0 },
  { value: 'past14', label: 'Past 14 Days', startOffset: -14, endOffset: 0 },
  { value: 'past30', label: 'Past 30 Days', startOffset: -30, endOffset: 0 },
  { value: 'past60', label: 'Past 60 Days', startOffset: -60, endOffset: 0 },
  { value: 'past90', label: 'Past 90 Days', startOffset: -90, endOffset: 0 },
  { value: 'yearToDate', label: 'Year to Date', getStartDate: () => `${new Date().getFullYear()}-01-01`, endOffset: 0 },
  { value: 'lifetime', label: 'Lifetime', startDate: '2020-01-01', endOffset: 365 },
]
const SORT_OPTIONS = [
  { value: 'startTime', label: 'Date & Time' },
  { value: 'title', label: 'Booking' },
  { value: 'customer', label: 'Customer' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'status', label: 'Status' },
]
/** Client-side only: narrows rows already returned for the From/To range (does not change the GHL request). */
const RELATIVE_START_OPTIONS = [
  { value: 'all', label: 'All in loaded range' },
  { value: 'after_now', label: 'Starts after now' },
]
const adjustHex = (hex, amount) => {
  const cleaned = `${hex || ''}`.replace('#', '')
  if (cleaned.length !== 6) return '#be185d'
  const num = parseInt(cleaned, 16)
  const clamp = (value) => Math.max(0, Math.min(255, value))
  const r = clamp((num >> 16) + amount)
  const g = clamp(((num >> 8) & 0xff) + amount)
  const b = clamp((num & 0xff) + amount)
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

const getPaginationPages = (current, total, windowSize = 1) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = [1]
  const start = Math.max(2, current - windowSize)
  const end = Math.min(total - 1, current + windowSize)
  if (start > 2) pages.push('ellipsis-left')
  for (let p = start; p <= end; p += 1) pages.push(p)
  if (end < total - 1) pages.push('ellipsis-right')
  pages.push(total)
  return pages
}

const STATUS_ORDER = {
  booked: 1,
  scheduled: 2,
  confirmed: 3,
  completed: 4,
  cancelled: 5,
  canceled: 5,
  'no-show': 6,
}

const parseBookingDate = (value) => {
  if (!value) return null
  if (typeof value !== 'string') {
    const parsed = new Date(value)
    return isValid(parsed) ? parsed : null
  }
  const parsedIso = parseISO(value)
  if (isValid(parsedIso)) return parsedIso
  const parsedFallback = new Date(value)
  return isValid(parsedFallback) ? parsedFallback : null
}

const getDateString = (offsetDays = 0) => {
  return format(addDays(new Date(), offsetDays), 'yyyy-MM-dd')
}

const getCurrentMonthRange = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    startDate: format(start, 'yyyy-MM-dd'),
    endDate: format(end, 'yyyy-MM-dd'),
  }
}

const formatDateTime = (value) => {
  if (!value) return { date: 'N/A', time: 'N/A' }
  const date = parseBookingDate(value)
  if (!date) return { date: 'N/A', time: 'N/A' }
  return {
    date: format(date, 'MMM d, yyyy'),
    time: format(date, 'h:mm a'),
  }
}

const normalizeStatus = (status = '') => {
  const normalized = `${status || ''}`.trim().toLowerCase()
  return normalized || 'booked'
}

const BookingsManagementPage = () => {
  const { currentUser } = useSelector((state) => state.user)
  const location = useLocation()
  const navigate = useNavigate()
  const {
    branding,
    locationId: brandedLocationId,
    hasBranding,
  } = useBranding()
  const brandColor = branding?.themeColor || '#ec4899'
  const brandColorDark = adjustHex(brandColor, -26)
  const brandLogoSrc =
    hasBranding && (branding?.logo || branding?.logoPublicId)
      ? resolveBrandingLogoUrl(branding, { width: 96, height: 96 })
      : null

  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [selectedCalendarServiceId, setSelectedCalendarServiceId] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [startDate, setStartDate] = useState(() => getCurrentMonthRange().startDate)
  const [endDate, setEndDate] = useState(() => getCurrentMonthRange().endDate)
  const [datePreset, setDatePreset] = useState('currentMonth')
  const [relativeStartFilter, setRelativeStartFilter] = useState('all')
  const [contactFilter, setContactFilter] = useState('all')
  const [sortField, setSortField] = useState('startTime')
  const [sortDirection, setSortDirection] = useState('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [selectedBookingStatus, setSelectedBookingStatus] = useState('booked')
  const [statusNotes, setStatusNotes] = useState('')
  const [copiedField, setCopiedField] = useState('')
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [advancedBookingsFiltersOpen, setAdvancedBookingsFiltersOpen] = useState(false)

  const spaParamLocationId = useMemo(
    () => `${new URLSearchParams(location.search).get('spa') || ''}`.trim(),
    [location.search]
  )
  const isTeamOrAbove = ['spa', 'admin', 'enterprise', 'super-admin'].includes(
    currentUser?.role
  )
  const isSpaUser = currentUser?.role === 'spa'
  const canSelectLocation = ['admin', 'enterprise', 'super-admin'].includes(
    currentUser?.role
  )
  const userProfileLocationId =
    currentUser?.selectedLocation?.locationId ||
    currentUser?.spaLocation?.locationId ||
    ''
  const currentUserLocationId = brandedLocationId || userProfileLocationId || ''

  const { data: locationsData, isLoading: isLoadingLocations } = useQuery({
    queryKey: ['locations', 'bookings-management'],
    queryFn: () => locationService.getAllLocations(),
    enabled: isTeamOrAbove && canSelectLocation,
  })

  const locations = locationsData?.data?.locations || EMPTY_LOCATIONS
  const effectiveLocationId = isSpaUser
    ? spaParamLocationId ||
      brandedLocationId ||
      selectedLocationId ||
      userProfileLocationId ||
      ''
    : selectedLocationId ||
      spaParamLocationId ||
      currentUserLocationId ||
      locations[0]?.locationId ||
      brandedLocationId ||
      ''
  const selectedLocation =
    locations.find((entry) => entry?.locationId === effectiveLocationId) || null

  useEffect(() => {
    const forcedLocationForContext = isSpaUser
      ? spaParamLocationId || brandedLocationId || userProfileLocationId
      : ''
    if (forcedLocationForContext) {
      if (selectedLocationId !== forcedLocationForContext) {
        setSelectedLocationId(forcedLocationForContext)
      }
      return
    }

    if (selectedLocationId) return
    if (spaParamLocationId) {
      setSelectedLocationId(spaParamLocationId)
      return
    }
    if (currentUserLocationId) {
      setSelectedLocationId(currentUserLocationId)
      return
    }
    if (locations[0]?.locationId) {
      setSelectedLocationId(locations[0].locationId)
    }
  }, [
    spaParamLocationId,
    isSpaUser,
    selectedLocationId,
    currentUserLocationId,
    userProfileLocationId,
    brandedLocationId,
    locations,
  ])

  const {
    data: calendarsData,
    isLoading: isLoadingCalendars,
    refetch: refetchCalendars,
  } = useQuery({
    queryKey: ['ghl-calendars', effectiveLocationId, 'bookings-management'],
    queryFn: () => ghlService.getCalendars(effectiveLocationId),
    enabled: Boolean(effectiveLocationId),
    retry: false,
  })

  const calendars = calendarsData?.data?.calendars || EMPTY_SERVICES
  const selectedCalendar = useMemo(
    () =>
      calendars.find(
        (calendar) => (calendar.id || calendar._id) === selectedCalendarServiceId
      ) || null,
    [calendars, selectedCalendarServiceId]
  )
  const selectedBookingType =
    selectedCalendarServiceId === 'services'
      ? 'service'
      : selectedCalendarServiceId === 'meetings'
        ? 'meeting'
        : 'all'
  const selectedBookingCalendarId =
    ['all', 'meetings', 'services'].includes(selectedCalendarServiceId)
      ? ''
      : `${selectedCalendar?.id || selectedCalendar?._id || ''}`.trim()
  const selectedCalendarTimeZone =
    selectedCalendar?.timeZone ||
    selectedCalendar?.timezone ||
    selectedCalendar?.calendarTimeZone ||
    ''
  const calendarNameById = useMemo(() => {
    const names = new Map()
    calendars.forEach((calendar) => {
      const name = calendar.name || calendar.title || 'Unnamed Calendar'
      const ids = [calendar.id, calendar._id, calendar.calendarId].filter(Boolean)
      ids.forEach((id) => names.set(`${id}`, name))
    })
    return names
  }, [calendars])

  const getCalendarNameForBooking = useCallback((booking) => {
    const bookingCalendarId = `${booking?.calendarId || ''}`.trim()
    if (booking?.bookingType === 'service') {
      return booking.serviceName || booking.calendarName || 'Services'
    }
    if (booking?.calendarName) return booking.calendarName
    if (bookingCalendarId && calendarNameById.has(bookingCalendarId)) {
      return calendarNameById.get(bookingCalendarId)
    }
    if (selectedCalendar?.name || selectedCalendar?.title) {
      return selectedCalendar.name || selectedCalendar.title
    }
    return selectedCalendarServiceId === 'all' ? 'All calendars' : 'GHL calendar'
  }, [calendarNameById, selectedCalendar, selectedCalendarServiceId])

  useEffect(() => {
    if (['all', 'meetings', 'services'].includes(selectedCalendarServiceId)) return
    const exists = calendars.some(
      (calendar) => (calendar.id || calendar._id) === selectedCalendarServiceId
    )
    if (!exists) setSelectedCalendarServiceId('all')
  }, [calendars, selectedCalendarServiceId])

  const {
    data: ghlBookingsData,
    isLoading: isLoadingBookings,
    refetch: refetchBookings,
  } = useQuery({
    queryKey: [
      'ghl-bookings-table',
      effectiveLocationId,
      startDate,
      endDate,
      selectedBookingCalendarId,
      selectedBookingType,
      selectedCalendarTimeZone,
    ],
    queryFn: () =>
      ghlService.getLocationBookings({
        locationId: effectiveLocationId,
        startDate,
        endDate,
        calendarId: selectedBookingCalendarId,
        bookingType: selectedBookingType,
        timeZone: selectedCalendarTimeZone,
      }),
    enabled: Boolean(effectiveLocationId && startDate && endDate),
    retry: false,
  })

  const updateBookingStatusMutation = useMutation({
    mutationFn: ghlService.updateBookingStatus,
    onSuccess: () => {
      refetchBookings()
      setStatusNotes('')
    },
  })

  const rawBookings = ghlBookingsData?.data?.events || EMPTY_BOOKINGS
  const isUnavailable = Boolean(ghlBookingsData?.data?.unavailable)
  const source = ghlBookingsData?.data?.source || 'ghl'
  const effectiveTimeZone =
    ghlBookingsData?.data?.effectiveTimeZone ||
    selectedCalendarTimeZone ||
    ''

  const getSortValue = useCallback((booking, field) => {
    if (field === 'startTime') {
      return parseBookingDate(booking.startTime) || new Date(0)
    }
    if (field === 'customer') {
      return `${booking.contactName || booking.contactEmail || booking.contactPhone || ''}`.toLowerCase()
    }
    if (field === 'calendar') {
      return getCalendarNameForBooking(booking).toLowerCase()
    }
    if (field === 'status') {
      return STATUS_ORDER[normalizeStatus(booking.status)] || 99
    }
    return `${booking.title || ''}`.toLowerCase()
  }, [getCalendarNameForBooking])

  const bookings = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    const now = new Date()
    return rawBookings
      .filter((booking) => {
        const status = normalizeStatus(booking.status)
        if (statusFilter !== 'all' && status !== statusFilter) return false

        if (relativeStartFilter === 'after_now') {
          const bookingStart = parseBookingDate(booking.startTime)
          if (!bookingStart || compareAsc(bookingStart, now) <= 0) return false
        }

        const hasEmail = Boolean(`${booking.contactEmail || ''}`.trim())
        const hasPhone = Boolean(`${booking.contactPhone || ''}`.trim())
        if (contactFilter === 'email' && !hasEmail) return false
        if (contactFilter === 'phone' && !hasPhone) return false
        if (contactFilter === 'missing' && (hasEmail || hasPhone)) return false

        if (!normalizedSearch) return true
        const haystack = [
          booking.title,
          booking.id,
          booking.contactName,
          booking.contactEmail,
          booking.contactPhone,
          getCalendarNameForBooking(booking),
          selectedLocation?.name,
          effectiveLocationId,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(normalizedSearch)
      })
      .sort((a, b) => {
        const left = getSortValue(a, sortField)
        const right = getSortValue(b, sortField)
        let result = 0

        if (left instanceof Date && right instanceof Date) {
          result = compareAsc(left, right)
        } else if (typeof left === 'number' && typeof right === 'number') {
          result = left - right
        } else {
          result = `${left}`.localeCompare(`${right}`)
        }

        return sortDirection === 'asc' ? result : result * -1
      })
  }, [
    rawBookings,
    searchTerm,
    statusFilter,
    relativeStartFilter,
    contactFilter,
    sortField,
    sortDirection,
    getSortValue,
    getCalendarNameForBooking,
    selectedLocation?.name,
    effectiveLocationId,
  ])

  const totalBookings = bookings.length
  const totalPages = Math.max(1, Math.ceil(totalBookings / pageSize))
  const paginatedBookings = bookings.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )
  const filterCount = [
    searchTerm.trim(),
    statusFilter !== 'all',
    relativeStartFilter !== 'all',
    contactFilter !== 'all',
    selectedCalendarServiceId && selectedCalendarServiceId !== 'all',
  ].filter(Boolean).length
  const selectedBookingStart = formatDateTime(selectedBooking?.startTime)
  const selectedBookingEnd = formatDateTime(selectedBooking?.endTime)
  const selectedBookingCalendarName = selectedBooking
    ? getCalendarNameForBooking(selectedBooking)
    : ''
  const selectedBookingCustomerText = [
    selectedBooking?.contactName,
    selectedBooking?.contactEmail,
    selectedBooking?.contactPhone,
  ]
    .filter(Boolean)
    .join(' | ')
  const statusUpdateError =
    updateBookingStatusMutation.error?.response?.data?.message ||
    updateBookingStatusMutation.error?.message ||
    ''

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  useEffect(() => {
    if (!selectedBooking) return
    setSelectedBookingStatus(normalizeStatus(selectedBooking.status))
    setStatusNotes('')
  }, [selectedBooking])

  const copyBookingText = async (value, field) => {
    const text = `${value || ''}`.trim()
    if (!text || !navigator?.clipboard) return
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    window.setTimeout(() => setCopiedField(''), 1600)
  }

  const handleStatusUpdate = async () => {
    if (!selectedBooking?.id || !effectiveLocationId) return
    await updateBookingStatusMutation.mutateAsync({
      locationId: effectiveLocationId,
      appointmentId: selectedBooking.id,
      status: selectedBookingStatus,
      notes: statusNotes,
    })
    setSelectedBooking((booking) =>
      booking ? { ...booking, status: selectedBookingStatus } : booking
    )
  }

  const applyDatePreset = (preset) => {
    setDatePreset(preset.value)
    setStartDate(
      preset.startDate || preset.getStartDate?.() || getDateString(preset.startOffset)
    )
    setEndDate(preset.getEndDate?.() || getDateString(preset.endOffset))
    setCurrentPage(1)
  }

  const handleSortChange = (field) => {
    setCurrentPage(1)
    if (sortField === field) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortField(field)
    setSortDirection(field === 'startTime' ? 'desc' : 'asc')
  }

  const resetFilters = () => {
    const defaultPreset = DATE_PRESETS.find((preset) => preset.value === 'currentMonth')
    setSearchTerm('')
    setStatusFilter('all')
    setRelativeStartFilter('all')
    setContactFilter('all')
    setSelectedCalendarServiceId(calendars.length ? 'all' : '')
    setSortField('startTime')
    setSortDirection('desc')
    setAdvancedBookingsFiltersOpen(false)
    if (defaultPreset) applyDatePreset(defaultPreset)
    setCurrentPage(1)
  }


  const renderSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown className='ml-1 h-3.5 w-3.5' />
    if (sortDirection === 'asc') return <ArrowUp className='ml-1 h-3.5 w-3.5' />
    return <ArrowDown className='ml-1 h-3.5 w-3.5' />
  }

  const handleLocationChange = (nextLocationId) => {
    setSelectedLocationId(nextLocationId)
    setSelectedBooking(null)
    setCurrentPage(1)
    if (!nextLocationId || isSpaUser) return
    navigate(`/management/bookings?spa=${encodeURIComponent(nextLocationId)}`, {
      replace: true,
    })
  }

  const getStatusBadgeClassName = (status) => {
    switch (normalizeStatus(status)) {
      case 'scheduled':
      case 'confirmed':
      case 'booked':
        return 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/35 dark:text-emerald-100 dark:border-emerald-900'
      case 'cancelled':
      case 'canceled':
        return 'border-red-200 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-100 dark:border-red-900'
      case 'completed':
        return 'border-sky-200 bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-100 dark:border-sky-900'
      case 'no-show':
        return 'border-amber-200 bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100 dark:border-amber-900'
      default:
        return 'bg-muted text-foreground border-border'
    }
  }

  const controlClass = cn(
    'border-input bg-background flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-sm shadow-xs',
    'text-foreground outline-none transition-[color,box-shadow]',
    'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'
  )

  const renderSortableHeader = (field, label) => (
    <button
      type='button'
      onClick={() => handleSortChange(field)}
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground',
        'hover:text-foreground transition-colors'
      )}
    >
      {label}
      {renderSortIcon(field)}
    </button>
  )

  const renderFilterBlock = ({
    includeSearchInline = true,
    showFooterReset = true,
    layout = 'full',
  } = {}) => {
    const isCompactToolbar = layout === 'desktopCompact'

    const calendarSelect = (
      <div
        className={cn(
          'space-y-2',
          isCompactToolbar ? 'min-w-[8.5rem] flex-1 sm:min-w-[10rem]' : 'md:col-span-2'
        )}
      >
        <Label className='text-muted-foreground text-xs'>Booking type</Label>
        <select
          value={selectedCalendarServiceId}
          onChange={(e) => {
            setSelectedCalendarServiceId(e.target.value)
            setCurrentPage(1)
          }}
          className={controlClass}
        >
          {isLoadingCalendars ? (
            <option value=''>Loading calendars...</option>
          ) : (
            <>
              <option value='all'>All bookings</option>
              <option value='meetings'>Meetings</option>
              <option value='services'>Services</option>
              {calendars.length === 0 ? (
                <option value='__no-calendars' disabled>
                  No meeting calendars loaded
                </option>
              ) : null}
              {calendars.map((calendar) => {
                const id = calendar.id || calendar._id || ''
                const name = calendar.name || calendar.title || 'Unnamed Calendar'
                return (
                  <option key={id} value={id}>
                    Meetings · {name}
                  </option>
                )
              })}
            </>
          )}
        </select>
      </div>
    )

    const quickRangeSelect = (
      <div
        className={cn(
          'space-y-2',
          isCompactToolbar ? 'min-w-[8.5rem] flex-1 sm:min-w-[10.5rem] xl:max-w-[14rem]' : 'md:col-span-2'
        )}
      >
        <Label className='text-muted-foreground text-xs'>
          {isCompactToolbar ? 'Quick range' : 'Quick date range'}
        </Label>
        <select
          value={datePreset}
          onChange={(e) => {
            const next = e.target.value
            if (next === 'custom') {
              setDatePreset('custom')
              setCurrentPage(1)
              if (isCompactToolbar) setAdvancedBookingsFiltersOpen(true)
              return
            }
            const preset = DATE_PRESETS.find((p) => p.value === next)
            if (preset) applyDatePreset(preset)
          }}
          className={controlClass}
        >
          <option value='custom'>
            {isCompactToolbar ? 'Custom (From / To)' : 'Custom — From / To only'}
          </option>
          {DATE_PRESETS.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>
    )

    const statusSelect = (
      <div
        className={cn(
          'space-y-2',
          isCompactToolbar ? 'min-w-[7rem] flex-1 sm:max-w-[13rem]' : ''
        )}
      >
        <Label className='text-muted-foreground text-xs'>Status</Label>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setCurrentPage(1)
          }}
          className={controlClass}
        >
          <option value='all'>All statuses</option>
          <option value='booked'>Booked</option>
          <option value='scheduled'>Scheduled</option>
          <option value='confirmed'>Confirmed</option>
          <option value='completed'>Completed</option>
          <option value='cancelled'>Cancelled</option>
          <option value='no-show'>No show</option>
        </select>
      </div>
    )

    const locationField = canSelectLocation ? (
      <div className='space-y-2 md:col-span-2 lg:max-w-md'>
        <Label className='text-muted-foreground text-xs'>Location</Label>
        <select
          value={selectedLocationId || effectiveLocationId}
          onChange={(e) => handleLocationChange(e.target.value)}
          className={controlClass}
        >
          {isLoadingLocations ? (
            <option value=''>Loading locations...</option>
          ) : locations.length === 0 ? (
            <option value={effectiveLocationId || ''}>
              {effectiveLocationId || 'No locations found'}
            </option>
          ) : (
            locations.map((entry) => (
              <option key={entry._id || entry.locationId} value={entry.locationId}>
                {entry.name || entry.locationId}
              </option>
            ))
          )}
        </select>
      </div>
    ) : null

    const fromToFields = (
      <div className='grid grid-cols-2 gap-3 md:col-span-2 lg:gap-4'>
        <div className='min-w-0 space-y-2'>
          <Label className='text-muted-foreground text-xs'>From</Label>
          <input
            type='date'
            value={startDate}
            onChange={(e) => {
              setDatePreset('custom')
              setStartDate(e.target.value)
              if (e.target.value > endDate) setEndDate(e.target.value)
              setCurrentPage(1)
            }}
            className={controlClass}
          />
        </div>
        <div className='min-w-0 space-y-2'>
          <Label className='text-muted-foreground text-xs'>To</Label>
          <input
            type='date'
            value={endDate}
            min={startDate}
            onChange={(e) => {
              setDatePreset('custom')
              setEndDate(e.target.value)
              setCurrentPage(1)
            }}
            className={controlClass}
          />
        </div>
      </div>
    )

    const loadIntro = (
      <div>
        <p className='text-card-foreground text-sm font-semibold'>Load from GoHighLevel</p>
        <p className='text-muted-foreground mt-0.5 text-xs leading-snug'>
          All bookings loads GoHighLevel Meetings and Services for the selected location. Adjust
          From/To for a custom span, or pick a quick range.
        </p>
      </div>
    )

    const refineIntro = (
      <div>
        <p className='text-card-foreground text-sm font-semibold'>Refine this list</p>
        <p className='text-muted-foreground mt-0.5 text-xs leading-snug'>
          Filters below apply after data loads.{' '}
          <span className='text-foreground/90'>Starts after now</span>{' '}
          hides appointments that already started (still inside your date range).
        </p>
      </div>
    )

    const searchField = includeSearchInline ? (
      <div className='relative max-w-2xl'>
        <Search className='pointer-events-none absolute left-2.5 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground' />
        <Input
          type='text'
          placeholder='Search booking or customer…'
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setCurrentPage(1)
          }}
          className='h-10 pl-9'
        />
      </div>
    ) : null

    const refineGrid = (
      <div
        className={cn(
          'grid grid-cols-1 gap-4 sm:grid-cols-2',
          isCompactToolbar ? '' : 'lg:grid-cols-3'
        )}
      >
        {!isCompactToolbar ? (
          <div className='space-y-2'>
            <Label className='text-muted-foreground text-xs'>Status</Label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
              className={controlClass}
            >
              <option value='all'>All statuses</option>
              <option value='booked'>Booked</option>
              <option value='scheduled'>Scheduled</option>
              <option value='confirmed'>Confirmed</option>
              <option value='completed'>Completed</option>
              <option value='cancelled'>Cancelled</option>
              <option value='no-show'>No show</option>
            </select>
          </div>
        ) : null}

        <div className='space-y-2'>
          <Label className='text-muted-foreground text-xs'>Start vs now</Label>
          <select
            value={relativeStartFilter}
            onChange={(e) => {
              setRelativeStartFilter(e.target.value)
              setCurrentPage(1)
            }}
            className={controlClass}
          >
            {RELATIVE_START_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className='space-y-2'>
          <Label className='text-muted-foreground text-xs'>Contact</Label>
          <select
            value={contactFilter}
            onChange={(e) => {
              setContactFilter(e.target.value)
              setCurrentPage(1)
            }}
            className={controlClass}
          >
            <option value='all'>Any contact</option>
            <option value='email'>Has email</option>
            <option value='phone'>Has phone</option>
            <option value='missing'>Missing info</option>
          </select>
        </div>
      </div>
    )

    const sortRow = (
      <div className='space-y-2'>
        <Label className='text-muted-foreground text-xs'>Sort by</Label>
        <div className='flex flex-wrap gap-1.5'>
          {SORT_OPTIONS.map((option) => {
            const active = sortField === option.value
            return (
              <Button
                key={option.value}
                type='button'
                variant={active ? 'default' : 'outline'}
                size='sm'
                className={cn(
                  'h-8 shrink-0 gap-1 rounded-md px-2.5 text-xs font-normal',
                  !active && 'text-muted-foreground'
                )}
                onClick={() => handleSortChange(option.value)}
              >
                {option.label}
                {active ? (
                  sortDirection === 'asc' ? (
                    <ArrowUp className='size-3.5 shrink-0 opacity-90' aria-hidden />
                  ) : (
                    <ArrowDown className='size-3.5 shrink-0 opacity-90' aria-hidden />
                  )
                ) : null}
              </Button>
            )
          })}
        </div>
      </div>
    )

    const filterSummaryFooter = (
      <div className='border-border flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-3'>
          <Badge variant='secondary' className='w-fit gap-1.5 px-2.5 py-1 font-normal'>
            <SlidersHorizontal className='size-3.5 opacity-70' />
            {filterCount} active
          </Badge>
          <span>
            Sorted by{' '}
            <span className='text-foreground font-medium'>
              {SORT_OPTIONS.find((option) => option.value === sortField)?.label}
            </span>{' '}
            · {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
          </span>
        </div>
        {showFooterReset ? (
          <Button type='button' variant='outline' className='shrink-0 sm:w-fit' onClick={resetFilters}>
            <X className='size-4' />
            Reset filters
          </Button>
        ) : null}
      </div>
    )

    if (isCompactToolbar) {
      return (
        <>
          <div className='flex flex-wrap items-end gap-3 md:gap-4'>
            {calendarSelect}
            {quickRangeSelect}
            {statusSelect}
            <div className='flex shrink-0 items-center gap-2 md:ml-auto'>
              {filterCount > 0 ? (
                <Badge variant='secondary' className='hidden gap-1.5 px-2 py-0.5 text-xs font-normal sm:inline-flex'>
                  <SlidersHorizontal className='size-3 opacity-70' />
                  {filterCount}
                </Badge>
              ) : null}
              <Button
                type='button'
                variant='outline'
                className='h-9 shrink-0 gap-1.5 px-3'
                onClick={() => setAdvancedBookingsFiltersOpen((open) => !open)}
              >
                Advanced
                {advancedBookingsFiltersOpen ? (
                  <ChevronUp className='size-4' />
                ) : (
                  <ChevronDown className='size-4' />
                )}
              </Button>
            </div>
          </div>

          {!advancedBookingsFiltersOpen && showFooterReset && filterCount > 0 ? (
            <div className='border-border mt-4 flex justify-end border-t pt-4'>
              <Button type='button' variant='ghost' size='sm' className='gap-2' onClick={resetFilters}>
                <X className='size-4' />
                Reset filters
              </Button>
            </div>
          ) : null}

          {advancedBookingsFiltersOpen ? (
            <div className='border-border mt-5 space-y-5 border-t pt-5'>
              <div className='space-y-4'>
                {loadIntro}
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5'>
                  {locationField}
                  {fromToFields}
                </div>
              </div>

              <div className='border-border space-y-4 border-t pt-6'>
                {refineIntro}
                {searchField}
                {refineGrid}
                {sortRow}
                {filterSummaryFooter}
              </div>
            </div>
          ) : null}
        </>
      )
    }

    return (
      <>
        <div className='space-y-4'>
          {loadIntro}
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5'>
            {locationField}
            {calendarSelect}
            {quickRangeSelect}
            {fromToFields}
          </div>
        </div>

        <div className='border-border space-y-4 border-t pt-6'>
          {refineIntro}
          {searchField}
          {refineGrid}
          {sortRow}
          {filterSummaryFooter}
        </div>
      </>
    )
  }
  const paginationPages = getPaginationPages(currentPage, totalPages)

  const renderBookingCard = (booking) => {
    const start = formatDateTime(booking.startTime)
    const end = formatDateTime(booking.endTime)
    const calendarName = getCalendarNameForBooking(booking)
    return (
      <Card key={booking.id || booking.startTime} className='py-5 shadow-sm gap-4'>
        <CardContent className='space-y-4 px-6'>
          <div className='flex items-start justify-between gap-3'>
            <div className='min-w-0 flex-1 space-y-1'>
              <p className='text-sm font-semibold leading-snug text-card-foreground'>
                {booking.title || 'Booked'}
              </p>
              <p className='text-xs text-muted-foreground'>
                {booking.assignedUserName
                  ? `Assigned · ${booking.assignedUserName}`
                  : 'GHL appointment'}
              </p>
            </div>
            <Badge
              variant='outline'
              className={cn('shrink-0 rounded-full capitalize shadow-none font-normal text-xs px-2.5', getStatusBadgeClassName(booking.status))}
            >
              {normalizeStatus(booking.status)}
            </Badge>
          </div>

          <div className='grid grid-cols-2 gap-2'>
            <div className='rounded-lg border bg-muted/40 p-3 min-w-0'>
              <p className='text-[10px] font-medium uppercase tracking-wide text-muted-foreground'>
                When
              </p>
              <p className='text-sm font-medium text-card-foreground mt-1 truncate'>{start.date}</p>
              <p className='text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate'>
                <Clock className='size-3 shrink-0 opacity-70' />
                <span className='truncate'>
                  {start.time}
                  {booking.endTime ? ` – ${end.time}` : ''}
                </span>
              </p>
            </div>
            <div className='rounded-lg border bg-muted/40 p-3 min-w-0'>
              <p className='text-[10px] font-medium uppercase tracking-wide text-muted-foreground'>
                Calendar
              </p>
              <p className='text-sm font-medium text-card-foreground mt-1 line-clamp-2'>{calendarName}</p>
            </div>
          </div>

          <div className='rounded-lg border bg-muted/20 p-3'>
            <p className='text-[10px] font-medium uppercase tracking-wide text-muted-foreground'>
              Guest
            </p>
            <p className='text-sm font-medium text-card-foreground mt-1 flex items-center gap-1.5'>
              <User className='size-4 shrink-0 text-muted-foreground' />
              <span className='truncate'>{booking.contactName || 'Guest'}</span>
            </p>
            <p className='text-xs text-muted-foreground mt-1 truncate'>
              {booking.contactEmail || booking.contactPhone || 'No contact info'}
            </p>
          </div>

          <Button
            type='button'
            variant='outline'
            className='w-full'
            onClick={() => setSelectedBooking(booking)}
          >
            <Eye className='size-4' />
            View details
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Layout>
      <div
        className='max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-8 space-y-4 md:space-y-6 pb-28 md:pb-10'
        style={{
          '--brand-primary': brandColor,
          '--brand-primary-dark': brandColorDark,
          '--primary': brandColor,
          '--ring': brandColor,
          '--primary-foreground': '#fafafa',
        }}
      >
        <Card className='gap-0 overflow-hidden rounded-xl py-0 shadow-sm'>
          <div
            className='h-1 w-full opacity-90'
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${brandColor} 40%, ${brandColorDark} 60%, transparent 100%)`,
            }}
          />
          <div className='flex flex-col gap-4 border-b border-border bg-muted/40 px-6 py-5 sm:flex-row sm:items-start sm:justify-between'>
            <div className='flex min-w-0 items-start gap-3'>
              <div className='flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted'>
                {brandLogoSrc ? (
                  <img
                    src={brandLogoSrc}
                    alt={branding?.name || ''}
                    className='max-h-full max-w-full object-contain'
                  />
                ) : (
                  <Calendar className='size-5 text-muted-foreground' />
                )}
              </div>
              <div className='min-w-0 space-y-1'>
                <h1 className='text-xl font-semibold tracking-tight text-card-foreground md:text-2xl'>
                  Bookings
                </h1>
                <p className='text-sm leading-snug text-muted-foreground'>
                  GoHighLevel schedule
                  {branding?.name ? ` · ${branding.name}` : ''}.{' '}
                  {selectedLocation?.name || effectiveLocationId
                    ? selectedLocation?.name || effectiveLocationId
                    : 'Choose a location to load appointments.'}
                </p>
                {effectiveLocationId ? (
                  <p className='truncate text-xs text-muted-foreground'>
                    {effectiveTimeZone ? `Timezone: ${effectiveTimeZone}` : 'Default timezone'}
                    {source ? ` · ${source}` : ''}
                  </p>
                ) : null}
              </div>
            </div>
            <Button
              variant='outline'
              size='sm'
              className='w-full shrink-0 sm:w-auto'
              onClick={() => {
                refetchCalendars()
                refetchBookings()
              }}
            >
              <RefreshCw className='size-4' />
              Refresh
            </Button>
          </div>

        </Card>

        <Card className='py-4 shadow-sm md:hidden'>
          <CardContent className='px-4'>
            <div className='flex gap-2'>
              <div className='relative min-w-0 flex-1'>
                <Search className='pointer-events-none absolute left-2.5 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  type='text'
                  placeholder='Search…'
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className='pl-9'
                />
              </div>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='shrink-0 gap-2'
                onClick={() => setShowMobileFilters(true)}
              >
                <SlidersHorizontal className='size-4' />
                Filters
                {filterCount > 0 ? (
                  <Badge variant='default' className='h-5 min-w-5 rounded-full px-1.5 text-[10px] font-medium'>
                    {filterCount}
                  </Badge>
                ) : null}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className='hidden py-0 shadow-sm md:block'>
          <CardHeader className='border-border space-y-1 border-b px-6 py-5'>
            <CardTitle className='text-lg'>Filters</CardTitle>
            <CardDescription>
              Load a date range from GoHighLevel first, then refine the table below.
            </CardDescription>
          </CardHeader>
          <CardContent className='px-6 py-6'>
            {renderFilterBlock({ includeSearchInline: true, layout: 'desktopCompact' })}
          </CardContent>
        </Card>

        {isUnavailable && (
          <div className='flex gap-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100'>
            <AlertCircle className='mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400' />
            <span>
              GoHighLevel bookings are unavailable for this location’s calendars. Check
              permissions in GHL, then refresh.
            </span>
          </div>
        )}

        <div className='md:hidden space-y-3'>
          {isLoadingBookings ? (
            <>
              {[0, 1, 2].map((key) => (
                <Card key={key} className='gap-0 py-0 shadow-sm'>
                  <CardContent className='space-y-4 px-6 py-5'>
                    <div className='flex items-start justify-between gap-3'>
                      <div className='min-w-0 flex-1 space-y-2'>
                        <Skeleton className='h-4 w-[70%]' />
                        <Skeleton className='h-3 w-[40%]' />
                      </div>
                      <Skeleton className='h-6 w-20 shrink-0 rounded-full' />
                    </div>
                    <Skeleton className='h-16 w-full rounded-lg' />
                    <Skeleton className='h-12 w-full rounded-lg' />
                    <Skeleton className='h-9 w-full rounded-md' />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : paginatedBookings.length === 0 ? (
            <Card className='shadow-sm'>
              <CardContent className='flex flex-col items-center px-6 py-14 text-center'>
                <Calendar className='size-14 text-muted-foreground/35' />
                <p className='mt-4 font-semibold text-card-foreground'>No bookings match</p>
                <p className='mt-1 text-sm text-muted-foreground'>
                  Adjust dates or filters and try again.
                </p>
              </CardContent>
            </Card>
          ) : (
            paginatedBookings.map((booking) => renderBookingCard(booking))
          )}
        </div>

        <Card className='hidden gap-0 overflow-hidden py-0 shadow-sm md:block'>
          <div className='overflow-x-auto'>
            {isLoadingBookings ? (
              <div className='flex flex-col items-center justify-center gap-4 py-16'>
                <div className='size-9 animate-spin rounded-full border-2 border-muted border-t-primary' />
                <p className='text-sm text-muted-foreground'>Loading bookings…</p>
              </div>
            ) : paginatedBookings.length === 0 ? (
              <div className='flex flex-col items-center px-4 py-14 text-center'>
                <Calendar className='size-14 text-muted-foreground/35' />
                <p className='mt-4 font-semibold text-card-foreground'>No bookings found</p>
                <p className='mt-1 text-sm text-muted-foreground'>
                  Relax filters or expand the date range.
                </p>
              </div>
            ) : (
              <>
                <table className='min-w-full text-sm'>
                  <thead className='border-b border-border bg-muted/40'>
                    <tr>
                      <th className='px-4 py-3 text-left lg:px-5'>
                        {renderSortableHeader('title', 'Booking')}
                      </th>
                      <th className='px-4 py-3 text-left lg:px-5'>
                        {renderSortableHeader('customer', 'Guest')}
                      </th>
                      <th className='px-4 py-3 text-left lg:px-5'>
                        {renderSortableHeader('calendar', 'Calendar')}
                      </th>
                      <th className='px-4 py-3 text-left lg:px-5'>
                        {renderSortableHeader('startTime', 'When')}
                      </th>
                      <th className='px-4 py-3 text-left lg:px-5'>
                        {renderSortableHeader('status', 'Status')}
                      </th>
                      <th className='px-4 py-3 text-right text-xs font-medium text-muted-foreground lg:px-5'>
                        View
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-border'>
                    {paginatedBookings.map((booking) => {
                      const start = formatDateTime(booking.startTime)
                      const end = formatDateTime(booking.endTime)
                      const calendarName = getCalendarNameForBooking(booking)
                      return (
                        <tr
                          key={booking.id || booking.startTime}
                          className='transition-colors hover:bg-muted/40'
                        >
                          <td className='align-top px-4 py-3 lg:px-5'>
                            <p className='font-semibold text-card-foreground'>
                              {booking.title || 'Booked'}
                            </p>
                            <p className='mt-0.5 text-xs text-muted-foreground'>
                              {booking.assignedUserName ? `${booking.assignedUserName}` : 'GHL'}
                            </p>
                          </td>
                          <td className='align-top px-4 py-3 lg:px-5'>
                            <div className='flex max-w-[12rem] items-center gap-1.5 font-medium text-card-foreground'>
                              <User className='size-4 shrink-0 text-muted-foreground' />
                              <span className='truncate'>{booking.contactName || 'Guest'}</span>
                            </div>
                            <p className='mt-1 max-w-[14rem] truncate text-xs text-muted-foreground'>
                              {booking.contactEmail || booking.contactPhone || '—'}
                            </p>
                          </td>
                          <td className='align-top px-4 py-3 lg:px-5'>
                            <p
                              className='max-w-[200px] truncate font-medium text-card-foreground'
                              title={calendarName}
                            >
                              {calendarName}
                            </p>
                          </td>
                          <td className='whitespace-nowrap px-4 py-3 align-top lg:px-5'>
                            <p className='font-medium text-card-foreground'>{start.date}</p>
                            <p className='mt-0.5 flex items-center gap-1 text-xs text-muted-foreground'>
                              <Clock className='size-3.5' />
                              {start.time}
                              {booking.endTime ? ` – ${end.time}` : ''}
                            </p>
                          </td>
                          <td className='align-top px-4 py-3 lg:px-5'>
                            <Badge
                              variant='outline'
                              className={cn(
                                'rounded-full px-2.5 font-normal capitalize shadow-none text-xs',
                                getStatusBadgeClassName(booking.status)
                              )}
                            >
                              {normalizeStatus(booking.status)}
                            </Badge>
                          </td>
                          <td className='px-4 py-3 text-right align-top lg:px-5'>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='size-9 text-muted-foreground hover:text-primary'
                              title='Details'
                              onClick={() => setSelectedBooking(booking)}
                            >
                              <Eye className='size-4' />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                {totalPages > 1 && (
                  <div className='flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-4 py-4 lg:px-5'>
                    <p className='text-muted-foreground text-sm'>
                      <span className='font-semibold text-foreground'>
                        {(currentPage - 1) * pageSize + 1}
                      </span>
                      –
                      <span className='font-semibold text-foreground'>
                        {Math.min(currentPage * pageSize, totalBookings)}
                      </span>{' '}
                      of <span className='font-semibold text-foreground'>{totalBookings}</span>
                    </p>
                    <div className='flex flex-wrap items-center gap-1'>
                      <Button
                        variant='outline'
                        size='icon'
                        className='shrink-0'
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className='size-4' />
                      </Button>
                      {paginationPages.map((page, idx) =>
                        typeof page === 'number' ? (
                          <Button
                            key={`p-${page}`}
                            variant={currentPage === page ? 'default' : 'outline'}
                            size='sm'
                            className='min-w-9 px-3'
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Button>
                        ) : (
                          <span
                            key={`e-${idx}`}
                            className='pointer-events-none px-2 text-muted-foreground text-sm select-none'
                            aria-hidden
                          >
                            …
                          </span>
                        )
                      )}
                      <Button
                        variant='outline'
                        size='icon'
                        className='shrink-0'
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className='size-4' />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        {totalPages > 1 ? (
          <div className='fixed bottom-[72px] left-3 right-3 z-40 md:hidden'>
            <Card className='border-border/80 bg-background/95 py-4 shadow-lg backdrop-blur'>
              <CardContent className='flex items-center justify-between gap-4 px-4'>
                <p className='text-muted-foreground text-xs font-medium'>
                  Page <span className='text-foreground'>{currentPage}</span> of{' '}
                  <span className='text-foreground'>{totalPages}</span>
                </p>
                <div className='flex gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={currentPage === 1 || isLoadingBookings}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className='size-4' />
                    Prev
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={currentPage === totalPages || isLoadingBookings}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                    <ChevronRight className='size-4' />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {showMobileFilters ? (
          <div className='fixed inset-0 z-[110] md:hidden'>
            <button
              type='button'
              className='absolute inset-0 w-full h-full bg-black/45 cursor-default border-0 p-0'
              aria-label='Close filters'
              onClick={() => setShowMobileFilters(false)}
            />
            <div className='absolute bottom-0 left-0 right-0 max-h-[88vh] overflow-y-auto rounded-t-xl border-border border-t bg-popover px-5 py-6 shadow-xl'>
              <div className='mx-auto mb-5 h-1.5 w-12 shrink-0 rounded-full bg-muted' />
              <div className='flex items-center justify-between border-border border-b pb-4'>
                <h3 className='text-base font-semibold tracking-tight text-foreground'>Filters</h3>
                <Button variant='ghost' size='icon' onClick={() => setShowMobileFilters(false)} aria-label='Close'>
                  <X className='size-5' />
                </Button>
              </div>
              <div className='space-y-5 pt-4'>
                {renderFilterBlock({ includeSearchInline: false, showFooterReset: false })}
              </div>
              <div className='mt-6 grid grid-cols-2 gap-3 border-border border-t pt-5'>
                <Button variant='outline' className='w-full' onClick={resetFilters}>
                  Reset filters
                </Button>
                <Button variant='default' className='w-full' onClick={() => setShowMobileFilters(false)}>
                  Done
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <Dialog
          open={Boolean(selectedBooking)}
          onOpenChange={(open) => {
            if (!open) setSelectedBooking(null)
          }}
        >
          <DialogContent className='max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-1.5rem)] gap-6 overflow-y-auto rounded-xl border-border p-5 sm:max-w-3xl sm:p-6'>
            <DialogHeader className='space-y-1.5 text-left'>
              <DialogTitle className='pr-10 text-xl font-semibold tracking-tight sm:text-2xl'>
                {selectedBooking?.title || 'Booking details'}
              </DialogTitle>
              <DialogDescription className='text-muted-foreground text-sm'>
                {selectedLocation?.name || effectiveLocationId || 'Location'} ·{' '}
                {selectedBooking?.bookingType === 'service'
                  ? 'GHL service booking'
                  : 'GHL appointment'}
              </DialogDescription>
            </DialogHeader>

            {selectedBooking ? (
              <div className='space-y-5'>
                <div className='grid gap-3 sm:grid-cols-3'>
                  <div className='space-y-2 rounded-lg border border-border bg-muted/30 px-4 py-3'>
                    <Label className='text-muted-foreground text-[11px] font-medium uppercase tracking-wide'>
                      Status
                    </Label>
                    <Badge
                      variant='outline'
                      className={cn(
                        'rounded-full px-3 font-normal capitalize shadow-none text-xs',
                        getStatusBadgeClassName(selectedBooking.status)
                      )}
                    >
                      {normalizeStatus(selectedBooking.status)}
                    </Badge>
                  </div>
                  <div className='space-y-2 rounded-lg border border-border bg-muted/30 px-4 py-3'>
                    <Label className='text-muted-foreground text-[11px] font-medium uppercase tracking-wide'>
                      Calendar
                    </Label>
                    <p className='text-card-foreground text-sm font-semibold leading-snug'>
                      {selectedBookingCalendarName}
                    </p>
                  </div>
                  <div className='space-y-2 rounded-lg border border-border bg-muted/30 px-4 py-3'>
                    <Label className='text-muted-foreground text-[11px] font-medium uppercase tracking-wide'>
                      Time
                    </Label>
                    <p className='text-card-foreground text-sm font-semibold'>
                      {selectedBookingStart.date}
                    </p>
                    <p className='text-muted-foreground text-xs'>
                      {selectedBookingStart.time}
                      {selectedBooking.endTime ? ` – ${selectedBookingEnd.time}` : ''}
                    </p>
                  </div>
                </div>

                <div className='grid gap-4 md:grid-cols-2'>
                  <div className='space-y-3 rounded-lg border border-border px-4 py-4'>
                    <Label className='text-muted-foreground text-[11px] font-medium uppercase tracking-wide'>
                      Customer
                    </Label>
                    <div className='text-muted-foreground space-y-2 text-sm'>
                      <p className='text-card-foreground flex items-center gap-2 font-semibold'>
                        <User className='text-muted-foreground size-4' />
                        {selectedBooking.contactName || 'Guest'}
                      </p>
                      <p className='flex items-center gap-2'>
                        <Mail className='text-muted-foreground size-4' />
                        {selectedBooking.contactEmail || 'No email'}
                      </p>
                      <p className='flex items-center gap-2'>
                        <Phone className='text-muted-foreground size-4' />
                        {selectedBooking.contactPhone || 'No phone'}
                      </p>
                    </div>
                    <Button
                      variant='outline'
                      size='sm'
                      className='mt-2'
                      disabled={!selectedBookingCustomerText}
                      onClick={() =>
                        copyBookingText(selectedBookingCustomerText, 'customer')
                      }
                    >
                      {copiedField === 'customer' ? (
                        <CheckCircle className='size-4' />
                      ) : (
                        <Copy className='size-4' />
                      )}
                      {copiedField === 'customer' ? 'Copied' : 'Copy guest'}
                    </Button>
                  </div>

                  <div className='space-y-3 rounded-lg border border-border px-4 py-4'>
                    <Label className='text-muted-foreground text-[11px] font-medium uppercase tracking-wide'>
                      Update status
                    </Label>
                    <select
                      value={selectedBookingStatus}
                      onChange={(e) => setSelectedBookingStatus(e.target.value)}
                      className={controlClass}
                    >
                      {BOOKING_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <Textarea
                      value={statusNotes}
                      onChange={(e) => setStatusNotes(e.target.value)}
                      rows={3}
                      placeholder='Optional note for GHL'
                    />
                    {statusUpdateError ? (
                      <p className='text-destructive text-xs font-medium'>{statusUpdateError}</p>
                    ) : null}
                    <div className='flex flex-wrap gap-2'>
                      <Button
                        variant='default'
                        size='sm'
                        disabled={
                          updateBookingStatusMutation.isPending ||
                          !selectedBooking?.id ||
                          selectedBookingStatus === normalizeStatus(selectedBooking.status)
                        }
                        onClick={handleStatusUpdate}
                      >
                        <Save className='size-4' />
                        {updateBookingStatusMutation.isPending ? 'Saving…' : 'Save status'}
                      </Button>
                      <Button variant='outline' size='sm' onClick={() => refetchBookings()}>
                        <RefreshCw className='size-4' />
                        Refresh
                      </Button>
                    </div>
                  </div>
                </div>

                <div className='rounded-lg border border-border px-4 py-4'>
                  <Label className='text-muted-foreground mb-3 block text-[11px] font-medium uppercase tracking-wide'>
                    Details
                  </Label>
                  <div className='text-muted-foreground grid gap-3 text-sm sm:grid-cols-2'>
                    <p>
                      <span className='text-card-foreground font-medium'>Location</span>{' '}
                      {selectedLocation?.name || effectiveLocationId || 'N/A'}
                    </p>
                    <p>
                      <span className='text-card-foreground font-medium'>Timezone</span>{' '}
                      {selectedBooking.timeZone || effectiveTimeZone || 'N/A'}
                    </p>
                    <p>
                      <span className='text-card-foreground font-medium'>Assigned</span>{' '}
                      {selectedBooking.assignedUserName || 'N/A'}
                    </p>
                    <p>
                      <span className='text-card-foreground font-medium'>Source</span>{' '}
                      {source || 'GHL'}
                    </p>
                  </div>
                  {selectedBooking.notes ? (
                    <p className='text-muted-foreground mt-4 text-sm'>
                      <span className='text-card-foreground font-medium'>Notes</span>{' '}
                      {selectedBooking.notes}
                    </p>
                  ) : null}
                  <div className='mt-4'>
                    <Button
                      variant='outline'
                      size='sm'
                      disabled={!selectedBooking.id}
                      onClick={() => copyBookingText(selectedBooking.id, 'booking-id')}
                    >
                      {copiedField === 'booking-id' ? (
                        <CheckCircle className='size-4' />
                      ) : (
                        <Copy className='size-4' />
                      )}
                      {copiedField === 'booking-id' ? 'Copied' : 'Copy booking ID'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  )
}

export default BookingsManagementPage
