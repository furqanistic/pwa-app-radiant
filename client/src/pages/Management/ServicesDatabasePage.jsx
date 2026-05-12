import { useBranding } from '@/context/BrandingContext'
import { useCategories } from '@/hooks/useServices'
import Layout from '@/pages/Layout/Layout'
import { locationService } from '@/services/locationService'
import { servicesService } from '@/services/servicesService'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  Database,
  Edit3,
  MapPin,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'

const clampChannel = (value) => Math.max(0, Math.min(255, value))

const adjustHex = (hex, amount) => {
  if (!hex) return '#be185d'
  const cleaned = hex.replace('#', '')
  if (cleaned.length !== 6) return '#be185d'
  const num = parseInt(cleaned, 16)
  const r = clampChannel(((num >> 16) & 255) + amount)
  const g = clampChannel(((num >> 8) & 255) + amount)
  const b = clampChannel((num & 255) + amount)
  return `#${r.toString(16).padStart(2, '0')}${g
    .toString(16)
    .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

const buildInitialForm = (service) => ({
  name: service?.name || '',
  description: service?.description || '',
  categoryId:
    typeof service?.categoryId === 'object'
      ? service?.categoryId?._id || ''
      : service?.categoryId || '',
  basePrice: service?.basePrice ?? '',
  duration: service?.duration ?? '',
  status: service?.status || 'active',
  locationId: service?.locationId || '',
})

const ServicesDatabasePage = () => {
  const { currentUser } = useSelector((state) => state.user)
  const { branding } = useBranding()
  const queryClient = useQueryClient()
  const brandColor = branding?.themeColor || '#ec4899'
  const brandColorDark = adjustHex(brandColor, -24)

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [locationId, setLocationId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [sortBy, setSortBy] = useState('updatedAt')
  const [sortOrder, setSortOrder] = useState('desc')

  const [showMobileFilters, setShowMobileFilters] = useState(false)

  const [editingService, setEditingService] = useState(null)
  const [editForm, setEditForm] = useState(buildInitialForm(null))
  const [movingService, setMovingService] = useState(null)
  const [moveForm, setMoveForm] = useState({ locationId: '', categoryId: '' })

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
      locationId,
      category: categoryId,
      status,
      sortBy,
      sortOrder,
    }),
    [page, limit, search, locationId, categoryId, status, sortBy, sortOrder]
  )

  const {
    data: databaseData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['services-database', queryParams],
    queryFn: () => servicesService.getServicesDatabase(queryParams),
    enabled: currentUser?.role === 'super-admin',
    placeholderData: (previousData) => previousData,
  })

  const { data: locationsData } = useQuery({
    queryKey: ['locations', 'services-database'],
    queryFn: () => locationService.getAllLocations(),
    enabled: currentUser?.role === 'super-admin',
    staleTime: 5 * 60 * 1000,
  })

  const { data: categories = [] } = useCategories(false)

  const updateServiceMutation = useMutation({
    mutationFn: ({ id, payload }) => servicesService.updateService(id, payload),
    onSuccess: () => {
      toast.success('Service updated successfully')
      setEditingService(null)
      queryClient.invalidateQueries({ queryKey: ['services-database'] })
      queryClient.invalidateQueries({ queryKey: ['services'] })
      refetch()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update service')
    },
  })

  const moveServiceMutation = useMutation({
    mutationFn: ({ id, payload }) => servicesService.updateService(id, payload),
    onSuccess: () => {
      toast.success('Service location updated')
      setMovingService(null)
      queryClient.invalidateQueries({ queryKey: ['services-database'] })
      queryClient.invalidateQueries({ queryKey: ['services'] })
      refetch()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update location')
    },
  })

  const services = databaseData?.data?.services || []
  const pagination = databaseData?.data?.pagination || {
    currentPage: 1,
    totalPages: 1,
    totalServices: 0,
    hasNext: false,
    hasPrev: false,
  }

  const locations = locationsData?.data?.locations || []

  const getLocationLabel = (targetLocationId) => {
    if (!targetLocationId) return 'Unassigned'
    const location = locations.find((item) => item.locationId === targetLocationId)
    return location?.name || targetLocationId
  }

  const getCategoriesForLocation = (targetLocationId) => {
    if (!targetLocationId) return []
    return categories.filter((category) => category.locationId === targetLocationId)
  }

  const findMatchingCategoryId = (service, targetLocationId) => {
    const sourceName = service?.categoryId?.name || ''
    if (!sourceName || !targetLocationId) return ''

    const match = categories.find(
      (category) =>
        category.locationId === targetLocationId &&
        category.name?.trim().toLowerCase() === sourceName.trim().toLowerCase()
    )

    return match?._id || ''
  }

  const editCategoryOptions = getCategoriesForLocation(editForm.locationId)
  const moveCategoryOptions = getCategoriesForLocation(moveForm.locationId)

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortBy(field)
    setSortOrder('desc')
  }

  const openEdit = (service) => {
    setEditingService(service)
    setEditForm(buildInitialForm(service))
  }

  const closeEdit = () => {
    if (updateServiceMutation.isPending) return
    setEditingService(null)
  }

  const openMove = (service) => {
    const nextLocationId = service.locationId || ''
    setMovingService(service)
    setMoveForm({
      locationId: nextLocationId,
      categoryId: findMatchingCategoryId(service, nextLocationId) || buildInitialForm(service).categoryId,
    })
  }

  const closeMove = () => {
    if (moveServiceMutation.isPending) return
    setMovingService(null)
  }

  const handleMoveLocationChange = (nextLocationId) => {
    setMoveForm({
      locationId: nextLocationId,
      categoryId: findMatchingCategoryId(movingService, nextLocationId),
    })
  }

  const handleEditLocationChange = (nextLocationId) => {
    setEditForm((prev) => ({
      ...prev,
      locationId: nextLocationId,
      categoryId: findMatchingCategoryId(editingService, nextLocationId),
    }))
  }

  const resetFilters = () => {
    setLocationId('')
    setCategoryId('')
    setStatus('')
    setSortBy('updatedAt')
    setSortOrder('desc')
    setLimit(25)
    setPage(1)
  }

  const handleSaveEdit = () => {
    if (!editingService?._id) return

    if (!editForm.name.trim()) return toast.error('Service name is required')
    if (!editForm.description.trim()) return toast.error('Description is required')
    if (!editForm.categoryId) return toast.error('Category is required')
    if (!editForm.locationId) return toast.error('Location is required')

    const basePriceNum = parseFloat(editForm.basePrice)
    const durationNum = parseInt(editForm.duration, 10)

    if (!Number.isFinite(basePriceNum) || basePriceNum <= 0) {
      return toast.error('Valid price is required')
    }

    if (!Number.isFinite(durationNum) || durationNum <= 0) {
      return toast.error('Valid duration is required')
    }

    updateServiceMutation.mutate({
      id: editingService._id,
      payload: {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        categoryId: editForm.categoryId,
        basePrice: basePriceNum,
        duration: durationNum,
        status: editForm.status,
        locationId: editForm.locationId,
      },
    })
  }

  const handleSaveMove = () => {
    if (!movingService?._id) return
    if (!moveForm.locationId) return toast.error('Location is required')
    if (!moveForm.categoryId) {
      return toast.error('Choose a category for the target location')
    }

    moveServiceMutation.mutate({
      id: movingService._id,
      payload: {
        locationId: moveForm.locationId,
        categoryId: moveForm.categoryId,
      },
    })
  }

  if (currentUser?.role !== 'super-admin') {
    return (
      <Layout>
        <div className='max-w-3xl mx-auto px-4 py-10'>
          <div className='bg-white border border-slate-200 rounded-2xl p-6'>
            <h1 className='text-xl font-bold text-slate-900'>Access denied</h1>
            <p className='text-sm text-slate-600 mt-2'>
              Services Database is only available to super-admin users.
            </p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className='min-h-screen bg-white'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-5 md:space-y-6 pb-28 md:pb-6'>

          {/* ── Header card ─────────────────────────────── */}
          <div className='rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden'>
            <div className='h-0.5 w-full' style={{ background: brandColor }} />
            <div className='px-6 py-5 md:px-8 md:py-6'>
              <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
                <div className='flex items-start gap-4'>
                  <div
                    className='hidden sm:flex w-10 h-10 rounded-xl items-center justify-center shrink-0'
                    style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColorDark})` }}
                  >
                    <Database className='w-5 h-5 text-white' />
                  </div>
                  <div>
                    <h1 className='text-xl md:text-2xl font-semibold text-slate-900 tracking-tight'>
                      Services Database
                    </h1>
                    <p className='mt-1 text-sm text-slate-500'>
                      Cross-spa service management for super-admin
                    </p>
                    <div className='mt-1.5 flex items-center gap-2 text-xs text-slate-400'>
                      <span className='inline-flex items-center gap-1'>
                        <Database className='w-3.5 h-3.5' />
                        {pagination.totalServices} total
                      </span>
                      <span className='w-1 h-1 rounded-full bg-slate-200' />
                      <span>Page {pagination.currentPage} / {pagination.totalPages}</span>
                      <span className='w-1 h-1 rounded-full bg-slate-200' />
                      <span>{limit} per page</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className='inline-flex items-center gap-1.5 h-9 px-4 rounded-xl text-sm font-medium border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50'
                >
                  <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* ── Filters card ────────────────────────────── */}
          <div className='rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden'>
            <div className='p-4 md:p-5'>
              <div className='flex flex-col sm:flex-row gap-3'>
                <div className='relative flex-1'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none' />
                  <input
                    type='text'
                    placeholder='Search services...'
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className='w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 focus:border-slate-300 transition-shadow placeholder:text-slate-400'
                  />
                </div>

                <select
                  value={locationId}
                  onChange={(e) => { setLocationId(e.target.value); setPage(1) }}
                  className='hidden md:block h-9 text-sm rounded-lg border border-slate-200 bg-white px-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 transition-shadow text-slate-600'
                >
                  <option value=''>All locations</option>
                  {locations.map((location) => (
                    <option key={location._id} value={location.locationId}>
                      {location.name || location.locationId}
                    </option>
                  ))}
                </select>

                <select
                  value={categoryId}
                  onChange={(e) => { setCategoryId(e.target.value); setPage(1) }}
                  className='hidden md:block h-9 text-sm rounded-lg border border-slate-200 bg-white px-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 transition-shadow text-slate-600'
                >
                  <option value=''>All categories</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>

                <select
                  value={status}
                  onChange={(e) => { setStatus(e.target.value); setPage(1) }}
                  className='hidden md:block h-9 text-sm rounded-lg border border-slate-200 bg-white px-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 transition-shadow text-slate-600'
                >
                  <option value=''>Any status</option>
                  <option value='active'>Active</option>
                  <option value='inactive'>Inactive</option>
                </select>

                <select
                  value={limit}
                  onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(1) }}
                  className='hidden md:block h-9 text-sm rounded-lg border border-slate-200 bg-white px-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 transition-shadow text-slate-600'
                >
                  <option value={25}>25 rows</option>
                  <option value={50}>50 rows</option>
                  <option value={100}>100 rows</option>
                  <option value={150}>150 rows</option>
                </select>

                <button
                  onClick={() => setShowMobileFilters(true)}
                  className='md:hidden h-9 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 flex items-center gap-2'
                >
                  <SlidersHorizontal className='w-4 h-4' />
                  Filters
                </button>

                <button
                  onClick={resetFilters}
                  className='h-9 px-3 rounded-lg text-xs font-medium border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors shrink-0'
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* ── Mobile cards ────────────────────────────── */}
          <div className='md:hidden space-y-3'>
            {isLoading ? (
              <div className='flex items-center justify-center py-16'>
                <div className='w-5 h-5 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin' />
              </div>
            ) : services.length === 0 ? (
              <div className='rounded-2xl border border-slate-200 bg-white p-8 text-center'>
                <Database className='w-10 h-10 text-slate-200 mx-auto mb-3' />
                <p className='text-sm font-medium text-slate-500'>
                  {search ? 'No services found matching your search' : 'No services found'}
                </p>
              </div>
            ) : (
              services.map((service) => (
                <div key={service._id} className='rounded-2xl border border-slate-200 bg-white p-4 space-y-3'>
                  <div className='flex items-start justify-between gap-2'>
                    <div className='min-w-0'>
                      <p className='text-sm font-medium text-slate-900 leading-tight'>{service.name}</p>
                      <p className='text-xs text-slate-500 mt-0.5 line-clamp-2'>
                        {service.description || 'No description'}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        service.status === 'active'
                          ? 'bg-green-50 text-green-700 border border-green-100'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {service.status}
                    </span>
                  </div>

                  <div className='grid grid-cols-2 gap-2 text-xs'>
                    <div className='rounded-lg bg-slate-50 border border-slate-100 p-2.5'>
                      <p className='text-slate-500 font-medium'>Location</p>
                      <p className='text-slate-800 font-semibold truncate mt-0.5'>
                        {service.locationName || 'Unknown'}
                      </p>
                    </div>
                    <div className='rounded-lg bg-slate-50 border border-slate-100 p-2.5'>
                      <p className='text-slate-500 font-medium'>Category</p>
                      <p className='text-slate-800 font-semibold truncate mt-0.5'>
                        {service.categoryId?.name || 'Uncategorized'}
                      </p>
                    </div>
                    <div className='rounded-lg bg-slate-50 border border-slate-100 p-2.5'>
                      <p className='text-slate-500 font-medium'>Price</p>
                      <p className='text-slate-900 font-semibold mt-0.5'>${service.basePrice}</p>
                    </div>
                    <div className='rounded-lg bg-slate-50 border border-slate-100 p-2.5'>
                      <p className='text-slate-500 font-medium'>Duration</p>
                      <p className='text-slate-900 font-semibold mt-0.5'>{service.duration} min</p>
                    </div>
                  </div>

                  <div className='flex gap-2'>
                    <button
                      onClick={() => openEdit(service)}
                      className='flex-1 h-9 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 flex items-center justify-center gap-1.5 hover:bg-slate-50 transition-colors'
                    >
                      <Edit3 className='w-3.5 h-3.5' />
                      Edit
                    </button>
                    <button
                      onClick={() => openMove(service)}
                      className='flex-1 h-9 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 flex items-center justify-center gap-1.5 hover:bg-slate-50 transition-colors'
                    >
                      <MapPin className='w-3.5 h-3.5' />
                      Move
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ── Desktop table card ──────────────────────── */}
          <div className='hidden md:block rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden'>
            <div className='px-5 py-4 border-b border-slate-100'>
              <h2 className='text-sm font-semibold text-slate-900'>
                Services
                {pagination.totalServices > 0 && (
                  <span className='text-slate-400 font-normal ml-1'>({pagination.totalServices})</span>
                )}
              </h2>
            </div>

            <div className='overflow-x-auto'>
              <table className='min-w-full divide-y divide-slate-100'>
                <thead>
                  <tr>
                    <th className='px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider'>Service</th>
                    <th className='px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider'>Location</th>
                    <th className='px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider'>Category</th>
                    <th className='px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer' onClick={() => handleSort('status')}>Status</th>
                    <th className='px-5 py-3 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer' onClick={() => handleSort('basePrice')}>Price</th>
                    <th className='px-5 py-3 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer' onClick={() => handleSort('duration')}>Duration</th>
                    <th className='px-5 py-3 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider'>Actions</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-50'>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className='px-5 py-10 text-center'>
                        <div className='flex items-center justify-center gap-2'>
                          <div className='w-4 h-4 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin' />
                          <span className='text-sm text-slate-400'>Loading services...</span>
                        </div>
                      </td>
                    </tr>
                  ) : services.length === 0 ? (
                    <tr>
                      <td colSpan={7} className='px-5 py-10 text-center text-sm text-slate-400'>No services found with current filters.</td>
                    </tr>
                  ) : (
                    services.map((service) => (
                      <tr key={service._id} className='transition-colors hover:bg-slate-50'>
                        <td className='px-5 py-3.5'>
                          <div className='min-w-[200px]'>
                            <p className='text-sm font-medium text-slate-900'>{service.name}</p>
                            <p className='text-xs text-slate-500 line-clamp-1 mt-0.5'>{service.description || 'No description'}</p>
                          </div>
                        </td>
                        <td className='px-5 py-3.5 whitespace-nowrap'>
                          <p className='text-sm text-slate-700'>{service.locationName || 'Unknown Location'}</p>
                          <p className='text-xs text-slate-400'>{service.locationId || 'N/A'}</p>
                        </td>
                        <td className='px-5 py-3.5 whitespace-nowrap'>
                          <span className='inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-700'>
                            {service.categoryId?.name || 'Uncategorized'}
                          </span>
                        </td>
                        <td className='px-5 py-3.5 whitespace-nowrap'>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            service.status === 'active'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {service.status}
                          </span>
                        </td>
                        <td className='px-5 py-3.5 whitespace-nowrap text-right text-sm font-medium text-slate-900 tabular-nums'>
                          ${service.basePrice}
                        </td>
                        <td className='px-5 py-3.5 whitespace-nowrap text-right text-sm text-slate-700 tabular-nums'>
                          {service.duration}m
                        </td>
                        <td className='px-5 py-3.5 whitespace-nowrap text-right'>
                          <div className='flex items-center justify-end gap-1.5'>
                            <button
                              onClick={() => openMove(service)}
                              className='inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all'
                            >
                              <MapPin className='w-3.5 h-3.5' />
                              Move
                            </button>
                            <button
                              onClick={() => openEdit(service)}
                              className='inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all'
                            >
                              <Edit3 className='w-3.5 h-3.5' />
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Desktop pagination ────────────────────────── */}
            {pagination.totalPages > 1 && (
              <div className='flex items-center justify-between px-5 py-3 border-t border-slate-100'>
                <p className='text-xs text-slate-400'>
                  Page {pagination.currentPage} of {pagination.totalPages}
                </p>
                <div className='flex items-center gap-1'>
                  <button
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={!pagination.hasPrev || isFetching}
                    className='h-8 w-8 p-0 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-30 flex items-center justify-center text-xs'
                  >
                    &lt;
                  </button>
                  {(() => {
                    const total = pagination.totalPages
                    const current = pagination.currentPage
                    const maxVisible = 5
                    const pages = []

                    if (total <= maxVisible) {
                      for (let i = 1; i <= total; i++) pages.push(i)
                    } else {
                      let start = Math.max(1, current - 2)
                      let end = Math.min(total, start + maxVisible - 1)
                      if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1)
                      if (start > 1) { pages.push(1); if (start > 2) pages.push('...') }
                      for (let i = start; i <= end; i++) pages.push(i)
                      if (end < total) { if (end < total - 1) pages.push('...'); pages.push(total) }
                    }

                    return pages.map((p, i) =>
                      p === '...' ? (
                        <span key={`e-${i}`} className='px-1 text-xs text-slate-300'>...</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`h-8 w-8 p-0 rounded-lg text-xs font-medium flex items-center justify-center ${
                            p === current
                              ? 'bg-slate-900 text-white'
                              : 'border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )
                  })()}
                  <button
                    onClick={() => setPage((prev) => prev + 1)}
                    disabled={!pagination.hasNext || isFetching}
                    className='h-8 w-8 p-0 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-30 flex items-center justify-center text-xs'
                  >
                    &gt;
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Mobile pagination bar ──────────────────────── */}
          {pagination.totalPages > 1 && (
            <div className='fixed bottom-[72px] left-3 right-3 z-40 md:hidden'>
              <div className='bg-white/95 backdrop-blur border border-slate-200 rounded-2xl px-3 py-2.5 flex items-center justify-between shadow-lg'>
                <p className='text-xs font-medium text-slate-500'>
                  Page {pagination.currentPage} of {pagination.totalPages}
                </p>
                <div className='flex items-center gap-2'>
                  <button
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={!pagination.hasPrev || isFetching}
                    className='h-8 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 disabled:opacity-50 flex items-center gap-1'
                  >
                    <ChevronLeft className='w-3.5 h-3.5' /> Prev
                  </button>
                  <button
                    onClick={() => setPage((prev) => prev + 1)}
                    disabled={!pagination.hasNext || isFetching}
                    className='h-8 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 disabled:opacity-50 flex items-center gap-1'
                  >
                    Next <ChevronRight className='w-3.5 h-3.5' />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Mobile filter sheet ────────────────────────── */}
          {showMobileFilters && (
            <div className='fixed inset-0 z-[110] md:hidden'>
              <div className='absolute inset-0 bg-black/45' onClick={() => setShowMobileFilters(false)} />
              <div className='absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-4 border-t border-slate-100 max-h-[82vh] overflow-y-auto'>
                <div className='w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4' />
                <div className='flex items-center justify-between mb-4'>
                  <h3 className='text-base font-semibold text-slate-900'>Filters</h3>
                  <button onClick={() => setShowMobileFilters(false)} className='p-2 rounded-lg hover:bg-slate-100 transition-colors'>
                    <X className='w-5 h-5 text-slate-400' />
                  </button>
                </div>

                <div className='space-y-3'>
                  <select value={locationId} onChange={(e) => { setLocationId(e.target.value); setPage(1) }} className='w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700'>
                    <option value=''>All locations</option>
                    {locations.map((location) => (
                      <option key={location._id} value={location.locationId}>{location.name || location.locationId}</option>
                    ))}
                  </select>

                  <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1) }} className='w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700'>
                    <option value=''>All categories</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>{category.name}</option>
                    ))}
                  </select>

                  <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className='w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700'>
                    <option value=''>Any status</option>
                    <option value='active'>Active</option>
                    <option value='inactive'>Inactive</option>
                  </select>

                  <select value={limit} onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(1) }} className='w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700'>
                    <option value={25}>25 rows</option>
                    <option value={50}>50 rows</option>
                    <option value={100}>100 rows</option>
                    <option value={150}>150 rows</option>
                  </select>
                </div>

                <div className='grid grid-cols-2 gap-3 mt-5'>
                  <button onClick={resetFilters} className='h-11 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors'>Reset</button>
                  <button onClick={() => setShowMobileFilters(false)} className='h-11 rounded-xl text-white text-sm font-semibold' style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColorDark})` }}>Apply</button>
                </div>
              </div>
            </div>
          )}

          {/* ── Edit Service modal ──────────────────────────── */}
          {editingService && (
            <div className='fixed inset-0 z-[120] bg-black/50 p-0 md:p-4 flex items-end md:items-center justify-center'>
              <div className='bg-white rounded-t-3xl md:rounded-2xl w-full max-w-2xl overflow-hidden max-h-[92vh] flex flex-col'>
                <div className='w-10 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-2 md:hidden' />
                <div className='px-5 py-4 border-b border-slate-100 flex items-center justify-between'>
                  <h3 className='text-lg font-semibold text-slate-900'>Edit Service</h3>
                  <button onClick={closeEdit} disabled={updateServiceMutation.isPending} className='p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-colors'>
                    <X className='w-5 h-5 text-slate-400' />
                  </button>
                </div>

                <div className='p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto'>
                  <div className='md:col-span-2'>
                    <label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>Service Name</label>
                    <input value={editForm.name} onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))} className='mt-1 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200' />
                  </div>
                  <div className='md:col-span-2'>
                    <label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>Description</label>
                    <textarea value={editForm.description} onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))} rows={3} className='mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200' />
                  </div>
                  <div>
                    <label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>Location</label>
                    <select value={editForm.locationId} onChange={(e) => handleEditLocationChange(e.target.value)} className='mt-1 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200'>
                      <option value=''>Select location</option>
                      {locations.map((location) => (
                        <option key={location._id} value={location.locationId}>{location.name || location.locationId}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>Category</label>
                    <select value={editForm.categoryId} onChange={(e) => setEditForm((prev) => ({ ...prev, categoryId: e.target.value }))} className='mt-1 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200'>
                      <option value=''>{editForm.locationId ? 'Select category' : 'Select location first'}</option>
                      {editCategoryOptions.map((category) => (
                        <option key={category._id} value={category._id}>{category.name}</option>
                      ))}
                    </select>
                    {editForm.locationId && editCategoryOptions.length === 0 && (
                      <p className='mt-1 text-xs font-medium text-red-500'>No categories exist for this location yet.</p>
                    )}
                  </div>
                  <div>
                    <label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>Price</label>
                    <input type='number' min='0' step='0.01' value={editForm.basePrice} onChange={(e) => setEditForm((prev) => ({ ...prev, basePrice: e.target.value }))} className='mt-1 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200' />
                  </div>
                  <div>
                    <label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>Duration (min)</label>
                    <input type='number' min='1' value={editForm.duration} onChange={(e) => setEditForm((prev) => ({ ...prev, duration: e.target.value }))} className='mt-1 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200' />
                  </div>
                  <div>
                    <label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>Status</label>
                    <select value={editForm.status} onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))} className='mt-1 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200'>
                      <option value='active'>Active</option>
                      <option value='inactive'>Inactive</option>
                    </select>
                  </div>
                </div>

                <div className='px-4 md:px-5 pb-4 md:pb-5 flex items-center justify-end gap-3 border-t border-slate-100 pt-4'>
                  <button onClick={closeEdit} disabled={updateServiceMutation.isPending} className='h-11 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors'>Cancel</button>
                  <button onClick={handleSaveEdit} disabled={updateServiceMutation.isPending} className='h-11 px-5 rounded-xl text-white text-sm font-semibold disabled:opacity-50' style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColorDark})` }}>
                    {updateServiceMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Move Service modal ──────────────────────────── */}
          {movingService && (
            <div className='fixed inset-0 z-[130] bg-black/50 p-0 md:p-4 flex items-end md:items-center justify-center'>
              <div className='bg-white rounded-t-3xl md:rounded-2xl w-full max-w-lg overflow-hidden'>
                <div className='w-10 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-2 md:hidden' />
                <div className='px-5 py-4 border-b border-slate-100 flex items-center justify-between'>
                  <div>
                    <h3 className='text-lg font-semibold text-slate-900'>Change Location</h3>
                    <p className='mt-0.5 text-sm text-slate-500'>{movingService.name}</p>
                  </div>
                  <button onClick={closeMove} disabled={moveServiceMutation.isPending} className='p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-colors'>
                    <X className='w-5 h-5 text-slate-400' />
                  </button>
                </div>

                <div className='p-4 md:p-5 space-y-4'>
                  <div className='rounded-2xl border border-slate-100 bg-slate-50 p-3'>
                    <p className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>Current Location</p>
                    <p className='mt-1 text-sm font-semibold text-slate-900'>{movingService.locationName || getLocationLabel(movingService.locationId)}</p>
                    <p className='text-xs text-slate-400'>{movingService.locationId || 'N/A'}</p>
                  </div>

                  <div>
                    <label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>New Location</label>
                    <select value={moveForm.locationId} onChange={(e) => handleMoveLocationChange(e.target.value)} className='mt-1 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200'>
                      <option value=''>Select location</option>
                      {locations.map((location) => (
                        <option key={location._id} value={location.locationId}>{location.name || location.locationId}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>Category In New Location</label>
                    <select value={moveForm.categoryId} onChange={(e) => setMoveForm((prev) => ({ ...prev, categoryId: e.target.value }))} className='mt-1 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200'>
                      <option value=''>{moveForm.locationId ? 'Select category' : 'Select location first'}</option>
                      {moveCategoryOptions.map((category) => (
                        <option key={category._id} value={category._id}>{category.name}</option>
                      ))}
                    </select>
                    {moveForm.locationId && moveCategoryOptions.length === 0 && (
                      <p className='mt-1 text-xs font-medium text-red-500'>No categories exist for this location yet.</p>
                    )}
                  </div>
                </div>

                <div className='px-4 md:px-5 pb-4 md:pb-5 flex items-center justify-end gap-3 border-t border-slate-100 pt-4'>
                  <button onClick={closeMove} disabled={moveServiceMutation.isPending} className='h-11 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors'>Cancel</button>
                  <button onClick={handleSaveMove} disabled={moveServiceMutation.isPending} className='h-11 px-5 rounded-xl text-white text-sm font-semibold disabled:opacity-50' style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColorDark})` }}>
                    {moveServiceMutation.isPending ? 'Moving...' : 'Update Location'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default ServicesDatabasePage
