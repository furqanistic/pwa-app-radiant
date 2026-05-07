import { useBranding } from '@/context/BrandingContext'
import Layout from '@/pages/Layout/Layout'
import { bookingService } from '@/services/bookingService'
import { locationService } from '@/services/locationService'
import { useQuery } from '@tanstack/react-query'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Database,
  MapPin,
  RefreshCw,
  Search,
  SlidersHorizontal,
  User,
  X,
} from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'

const adjustHex = (hex, amount) => {
  const cleaned = (hex || '').replace('#', '')
  if (cleaned.length !== 6) return '#be185d'
  const num = parseInt(cleaned, 16)
  const clamp = (value) => Math.max(0, Math.min(255, value))
  const r = clamp((num >> 16) + amount)
  const g = clamp(((num >> 8) & 0xff) + amount)
  const b = clamp((num & 0xff) + amount)
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

const BookingsDatabasePage = () => {
  const { currentUser } = useSelector((state) => state.user)
  const { branding } = useBranding()
  const brandColor = branding?.themeColor || '#ec4899'
  const brandColorDark = adjustHex(brandColor, -24)

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [locationId, setLocationId] = useState('')
  const [sortBy, setSortBy] = useState('date')
  const [sortOrder, setSortOrder] = useState('desc')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchInput])

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      search,
      status,
      locationId,
      sortBy,
      sortOrder,
    }),
    [page, limit, search, status, locationId, sortBy, sortOrder]
  )

  const {
    data: bookingsData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['bookings-database', queryParams],
    queryFn: () => bookingService.getAdminBookings(queryParams),
    enabled: currentUser?.role === 'super-admin',
    keepPreviousData: true,
  })

  const { data: locationsData } = useQuery({
    queryKey: ['locations', 'bookings-database'],
    queryFn: () => locationService.getAllLocations(),
    enabled: currentUser?.role === 'super-admin',
    staleTime: 5 * 60 * 1000,
  })

  const bookings = bookingsData?.data?.bookings || []
  const pagination = bookingsData?.data?.pagination || {
    totalBookings: 0,
    currentPage: 1,
    totalPages: 1,
  }
  const locations = locationsData?.data?.locations || []

  const locationMap = useMemo(() => {
    const map = new Map()
    locations.forEach((location) => {
      map.set(location.locationId, location.name || location.locationId)
    })
    return map
  }, [locations])

  const resetFilters = () => {
    setStatus('')
    setLocationId('')
    setSortBy('date')
    setSortOrder('desc')
    setLimit(25)
    setPage(1)
  }

  const getStatusChip = (value) => {
    if (['confirmed', 'scheduled'].includes(value)) {
      return 'bg-green-50 text-green-700 border-green-100'
    }
    if (value === 'completed') {
      return 'bg-blue-50 text-blue-700 border-blue-100'
    }
    if (value === 'cancelled') {
      return 'bg-red-50 text-red-700 border-red-100'
    }
    return 'bg-gray-100 text-gray-700 border-gray-200'
  }

  if (currentUser?.role !== 'super-admin') {
    return (
      <Layout>
        <div className='max-w-3xl mx-auto px-4 py-10'>
          <div className='bg-white border border-red-100 rounded-2xl p-6'>
            <h1 className='text-xl font-bold text-gray-900'>Access denied</h1>
            <p className='text-sm text-gray-600 mt-2'>
              Bookings Database is only available to super-admin users.
            </p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div
        className='max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-6 space-y-4 md:space-y-6 pb-28 md:pb-6'
        style={{
          ['--brand-primary']: brandColor,
          ['--brand-primary-dark']: brandColorDark,
        }}
      >
        <div
          className='rounded-3xl p-4 md:p-6 text-white shadow-xl'
          style={{
            background:
              'linear-gradient(140deg, var(--brand-primary), var(--brand-primary-dark))',
          }}
        >
          <div className='flex items-center justify-between gap-3'>
            <div className='flex items-center gap-3'>
              <div className='w-11 h-11 rounded-2xl bg-white/20 border border-white/25 flex items-center justify-center'>
                <Database className='w-5 h-5' />
              </div>
              <div>
                <h1 className='text-xl md:text-2xl font-black tracking-tight'>Bookings Database</h1>
                <p className='text-xs md:text-sm text-white/85'>
                  Platform-wide live bookings visibility
                </p>
              </div>
            </div>

            <button
              onClick={() => refetch()}
              className='h-10 px-3 md:px-4 rounded-xl text-xs md:text-sm font-bold bg-white/15 border border-white/30 hover:bg-white/20 flex items-center gap-2'
              disabled={isFetching}
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              Sync
            </button>
          </div>

          <div className='grid grid-cols-3 gap-2 mt-4'>
            <div className='rounded-xl bg-white/15 border border-white/20 p-2.5'>
              <p className='text-[10px] uppercase tracking-wider text-white/80 font-bold'>Bookings</p>
              <p className='text-lg font-black'>{pagination.totalBookings || 0}</p>
            </div>
            <div className='rounded-xl bg-white/15 border border-white/20 p-2.5'>
              <p className='text-[10px] uppercase tracking-wider text-white/80 font-bold'>Page</p>
              <p className='text-lg font-black'>
                {pagination.currentPage || 1}/{pagination.totalPages || 1}
              </p>
            </div>
            <div className='rounded-xl bg-white/15 border border-white/20 p-2.5'>
              <p className='text-[10px] uppercase tracking-wider text-white/80 font-bold'>Rows</p>
              <p className='text-lg font-black'>{limit}</p>
            </div>
          </div>
        </div>

        <div className='bg-white rounded-2xl border border-gray-100 p-3 md:p-4'>
          <div className='flex items-center gap-2'>
            <div className='relative flex-1'>
              <Search className='w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2' />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder='Search client, email, service'
                className='w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 text-sm font-medium'
              />
            </div>

            <button
              onClick={() => setShowMobileFilters(true)}
              className='md:hidden h-10 px-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 flex items-center gap-2'
            >
              <SlidersHorizontal className='w-4 h-4' />
              Filter
            </button>
          </div>

          <div className='hidden md:grid md:grid-cols-6 gap-3 mt-3'>
            <select
              value={locationId}
              onChange={(e) => {
                setLocationId(e.target.value)
                setPage(1)
              }}
              className='h-10 rounded-xl border border-gray-200 px-3 text-sm font-medium'
            >
              <option value=''>All locations</option>
              {locations.map((location) => (
                <option key={location._id} value={location.locationId}>
                  {location.name || location.locationId}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
              className='h-10 rounded-xl border border-gray-200 px-3 text-sm font-medium'
            >
              <option value=''>Any status</option>
              <option value='scheduled'>Scheduled</option>
              <option value='confirmed'>Confirmed</option>
              <option value='completed'>Completed</option>
              <option value='cancelled'>Cancelled</option>
              <option value='no-show'>No Show</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value)
                setPage(1)
              }}
              className='h-10 rounded-xl border border-gray-200 px-3 text-sm font-medium'
            >
              <option value='date'>Sort by Date</option>
              <option value='createdAt'>Sort by Created</option>
              <option value='finalPrice'>Sort by Price</option>
              <option value='status'>Sort by Status</option>
            </select>

            <select
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value)
                setPage(1)
              }}
              className='h-10 rounded-xl border border-gray-200 px-3 text-sm font-medium'
            >
              <option value='desc'>Desc</option>
              <option value='asc'>Asc</option>
            </select>

            <select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value, 10))
                setPage(1)
              }}
              className='h-10 rounded-xl border border-gray-200 px-3 text-sm font-medium'
            >
              <option value={25}>25 rows</option>
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
              <option value={150}>150 rows</option>
            </select>

            <button
              onClick={resetFilters}
              className='h-10 rounded-xl border border-gray-200 px-3 text-sm font-semibold text-gray-700'
            >
              Reset
            </button>
          </div>
        </div>

        <div className='md:hidden space-y-3'>
          {isLoading ? (
            <div className='bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-500'>
              Loading bookings...
            </div>
          ) : bookings.length === 0 ? (
            <div className='bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-500'>
              No bookings found.
            </div>
          ) : (
            bookings.map((booking) => (
              <div key={booking._id} className='bg-white rounded-2xl border border-gray-100 p-4 space-y-3'>
                <div className='flex items-start justify-between gap-2'>
                  <div>
                    <p className='text-sm font-black text-gray-900 leading-tight'>
                      {booking.serviceName || 'Unknown service'}
                    </p>
                    <p className='text-xs text-gray-500 mt-1'>
                      {booking.clientName || booking.userId?.name || 'Unknown client'}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusChip(booking.status)}`}>
                    {booking.status || 'unknown'}
                  </span>
                </div>

                <div className='grid grid-cols-2 gap-2 text-xs'>
                  <div className='rounded-xl bg-gray-50 border border-gray-100 p-2.5'>
                    <p className='text-gray-500 font-semibold'>Date</p>
                    <p className='text-gray-800 font-bold truncate mt-1'>
                      {booking.date ? new Date(booking.date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div className='rounded-xl bg-gray-50 border border-gray-100 p-2.5'>
                    <p className='text-gray-500 font-semibold'>Time</p>
                    <p className='text-gray-800 font-bold truncate mt-1'>{booking.time || 'N/A'}</p>
                  </div>
                  <div className='rounded-xl bg-gray-50 border border-gray-100 p-2.5'>
                    <p className='text-gray-500 font-semibold'>Location</p>
                    <p className='text-gray-800 font-bold truncate mt-1'>
                      {locationMap.get(booking.locationId) || booking.locationId || 'Unknown'}
                    </p>
                  </div>
                  <div className='rounded-xl bg-gray-50 border border-gray-100 p-2.5'>
                    <p className='text-gray-500 font-semibold'>Price</p>
                    <p className='text-gray-900 font-black mt-1'>${booking.finalPrice?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className='hidden md:block bg-white rounded-2xl border border-gray-100 overflow-hidden'>
          <div className='overflow-x-auto'>
            <table className='min-w-full'>
              <thead className='bg-gray-50 border-b border-gray-100'>
                <tr>
                  <th className='px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider'>Client</th>
                  <th className='px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider'>Service</th>
                  <th className='px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider'>Date</th>
                  <th className='px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider'>Location</th>
                  <th className='px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider'>Price</th>
                  <th className='px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider'>Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className='px-4 py-10 text-center text-sm text-gray-500'>Loading bookings database...</td>
                  </tr>
                ) : bookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className='px-4 py-10 text-center text-sm text-gray-500'>No bookings found with current filters.</td>
                  </tr>
                ) : (
                  bookings.map((booking) => (
                    <tr key={booking._id} className='border-b border-gray-100 hover:bg-gray-50/70'>
                      <td className='px-4 py-4'>
                        <div>
                          <p className='text-sm font-bold text-gray-900'>{booking.clientName || booking.userId?.name || 'Unknown'}</p>
                          <p className='text-xs text-gray-500'>{booking.clientEmail || booking.userId?.email || 'N/A'}</p>
                        </div>
                      </td>
                      <td className='px-4 py-4'>
                        <p className='text-sm font-semibold text-gray-800'>{booking.serviceName || 'N/A'}</p>
                        {booking.treatmentName && <p className='text-xs text-gray-500'>{booking.treatmentName}</p>}
                      </td>
                      <td className='px-4 py-4'>
                        <div className='text-sm text-gray-800'>
                          <div className='flex items-center gap-1'><Calendar className='w-3.5 h-3.5 text-gray-400' /> {booking.date ? new Date(booking.date).toLocaleDateString() : 'N/A'}</div>
                          <div className='flex items-center gap-1 text-gray-500'><Clock className='w-3.5 h-3.5 text-gray-400' /> {booking.time || 'N/A'}</div>
                        </div>
                      </td>
                      <td className='px-4 py-4'>
                        <div className='flex items-center gap-1 text-sm text-gray-800'>
                          <MapPin className='w-3.5 h-3.5 text-gray-400' />
                          {locationMap.get(booking.locationId) || booking.locationId || 'Unknown'}
                        </div>
                      </td>
                      <td className='px-4 py-4 text-right text-sm font-semibold text-gray-900'>${booking.finalPrice?.toFixed(2) || '0.00'}</td>
                      <td className='px-4 py-4'>
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusChip(booking.status)}`}>
                          {booking.status || 'unknown'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className='fixed bottom-[72px] md:bottom-4 left-0 right-0 z-40 px-3 md:px-6 lg:px-8'>
          <div className='max-w-7xl mx-auto bg-white/95 backdrop-blur border border-gray-200 rounded-2xl px-3 py-2.5 flex items-center justify-between shadow-lg'>
            <p className='text-xs font-semibold text-gray-700'>
              Page {pagination.currentPage || 1} of {pagination.totalPages || 1}
            </p>
            <div className='flex items-center gap-2'>
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={!pagination.currentPage || pagination.currentPage <= 1 || isFetching}
                className='h-9 px-3 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 disabled:opacity-50 flex items-center gap-1'
              >
                <ChevronLeft className='w-4 h-4' /> Prev
              </button>
              <button
                onClick={() => setPage((prev) => prev + 1)}
                disabled={!pagination.totalPages || pagination.currentPage >= pagination.totalPages || isFetching}
                className='h-9 px-3 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 disabled:opacity-50 flex items-center gap-1'
              >
                Next <ChevronRight className='w-4 h-4' />
              </button>
            </div>
          </div>
        </div>

        {showMobileFilters && (
          <div className='fixed inset-0 z-[110] md:hidden'>
            <div className='absolute inset-0 bg-black/45' onClick={() => setShowMobileFilters(false)} />
            <div className='absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-4 border-t border-gray-100 max-h-[82vh] overflow-y-auto'>
              <div className='w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4' />
              <div className='flex items-center justify-between mb-4'>
                <h3 className='text-base font-black text-gray-900'>Filters</h3>
                <button onClick={() => setShowMobileFilters(false)} className='p-2 rounded-lg hover:bg-gray-100'>
                  <X className='w-5 h-5 text-gray-500' />
                </button>
              </div>

              <div className='space-y-3'>
                <select value={locationId} onChange={(e) => { setLocationId(e.target.value); setPage(1) }} className='w-full h-11 rounded-xl border border-gray-200 px-3 text-sm font-medium'>
                  <option value=''>All locations</option>
                  {locations.map((location) => (
                    <option key={location._id} value={location.locationId}>{location.name || location.locationId}</option>
                  ))}
                </select>

                <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className='w-full h-11 rounded-xl border border-gray-200 px-3 text-sm font-medium'>
                  <option value=''>Any status</option>
                  <option value='scheduled'>Scheduled</option>
                  <option value='confirmed'>Confirmed</option>
                  <option value='completed'>Completed</option>
                  <option value='cancelled'>Cancelled</option>
                  <option value='no-show'>No Show</option>
                </select>

                <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1) }} className='w-full h-11 rounded-xl border border-gray-200 px-3 text-sm font-medium'>
                  <option value='date'>Sort by Date</option>
                  <option value='createdAt'>Sort by Created</option>
                  <option value='finalPrice'>Sort by Price</option>
                  <option value='status'>Sort by Status</option>
                </select>

                <select value={sortOrder} onChange={(e) => { setSortOrder(e.target.value); setPage(1) }} className='w-full h-11 rounded-xl border border-gray-200 px-3 text-sm font-medium'>
                  <option value='desc'>Desc</option>
                  <option value='asc'>Asc</option>
                </select>

                <select value={limit} onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(1) }} className='w-full h-11 rounded-xl border border-gray-200 px-3 text-sm font-medium'>
                  <option value={25}>25 rows</option>
                  <option value={50}>50 rows</option>
                  <option value={100}>100 rows</option>
                  <option value={150}>150 rows</option>
                </select>
              </div>

              <div className='grid grid-cols-2 gap-3 mt-5'>
                <button onClick={resetFilters} className='h-11 rounded-xl border border-gray-200 text-sm font-bold text-gray-700'>Reset</button>
                <button onClick={() => setShowMobileFilters(false)} className='h-11 rounded-xl text-white text-sm font-bold' style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))' }}>Apply</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default BookingsDatabasePage
