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
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'

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
    keepPreviousData: true,
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

  const services = databaseData?.data?.services || []
  const pagination = databaseData?.data?.pagination || {
    currentPage: 1,
    totalPages: 1,
    totalServices: 0,
    hasNext: false,
    hasPrev: false,
  }

  const locations = locationsData?.data?.locations || []

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

  if (currentUser?.role !== 'super-admin') {
    return (
      <Layout>
        <div className='max-w-3xl mx-auto px-4 py-10'>
          <div className='bg-white border border-red-100 rounded-2xl p-6'>
            <h1 className='text-xl font-bold text-gray-900'>Access denied</h1>
            <p className='text-sm text-gray-600 mt-2'>
              Services Database is only available to super-admin users.
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
        <div className='rounded-3xl p-4 md:p-6 text-white shadow-xl'
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
                <h1 className='text-xl md:text-2xl font-black tracking-tight'>Services Database</h1>
                <p className='text-xs md:text-sm text-white/85'>
                  Cross-spa service management for super-admin
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
              <p className='text-[10px] uppercase tracking-wider text-white/80 font-bold'>Services</p>
              <p className='text-lg font-black'>{pagination.totalServices}</p>
            </div>
            <div className='rounded-xl bg-white/15 border border-white/20 p-2.5'>
              <p className='text-[10px] uppercase tracking-wider text-white/80 font-bold'>Page</p>
              <p className='text-lg font-black'>{pagination.currentPage}/{pagination.totalPages}</p>
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
                placeholder='Search services'
                className='w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary)]/20'
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
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value)
                setPage(1)
              }}
              className='h-10 rounded-xl border border-gray-200 px-3 text-sm font-medium'
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
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
              className='h-10 rounded-xl border border-gray-200 px-3 text-sm font-medium'
            >
              <option value=''>Any status</option>
              <option value='active'>Active</option>
              <option value='inactive'>Inactive</option>
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
              onClick={() => handleSort('updatedAt')}
              className='h-10 rounded-xl border border-gray-200 px-3 text-sm font-semibold text-gray-700'
            >
              Sort: Updated
            </button>

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
              Loading services...
            </div>
          ) : services.length === 0 ? (
            <div className='bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-500'>
              No services found.
            </div>
          ) : (
            services.map((service) => (
              <div key={service._id} className='bg-white rounded-2xl border border-gray-100 p-4 space-y-3'>
                <div className='flex items-start justify-between gap-2'>
                  <div>
                    <p className='text-sm font-black text-gray-900 leading-tight'>{service.name}</p>
                    <p className='text-xs text-gray-500 mt-1 line-clamp-2'>
                      {service.description || 'No description'}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-[10px] font-black uppercase border ${
                      service.status === 'active'
                        ? 'bg-green-50 text-green-700 border-green-100'
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}
                  >
                    {service.status}
                  </span>
                </div>

                <div className='grid grid-cols-2 gap-2 text-xs'>
                  <div className='rounded-xl bg-gray-50 border border-gray-100 p-2.5'>
                    <p className='text-gray-500 font-semibold'>Location</p>
                    <p className='text-gray-800 font-bold truncate mt-1'>
                      {service.locationName || 'Unknown'}
                    </p>
                  </div>
                  <div className='rounded-xl bg-gray-50 border border-gray-100 p-2.5'>
                    <p className='text-gray-500 font-semibold'>Category</p>
                    <p className='text-gray-800 font-bold truncate mt-1'>
                      {service.categoryId?.name || 'Uncategorized'}
                    </p>
                  </div>
                  <div className='rounded-xl bg-gray-50 border border-gray-100 p-2.5'>
                    <p className='text-gray-500 font-semibold'>Price</p>
                    <p className='text-gray-900 font-black mt-1'>${service.basePrice}</p>
                  </div>
                  <div className='rounded-xl bg-gray-50 border border-gray-100 p-2.5'>
                    <p className='text-gray-500 font-semibold'>Duration</p>
                    <p className='text-gray-900 font-black mt-1'>{service.duration} min</p>
                  </div>
                </div>

                <button
                  onClick={() => openEdit(service)}
                  className='w-full h-10 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 flex items-center justify-center gap-2'
                >
                  <Edit3 className='w-4 h-4' />
                  Edit Service
                </button>
              </div>
            ))
          )}
        </div>

        <div className='hidden md:block bg-white rounded-2xl border border-gray-100 overflow-hidden'>
          <div className='overflow-x-auto'>
            <table className='min-w-full'>
              <thead className='bg-gray-50 border-b border-gray-100'>
                <tr>
                  <th className='px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider'>Service</th>
                  <th className='px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider'>Location</th>
                  <th className='px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider'>Category</th>
                  <th className='px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer' onClick={() => handleSort('status')}>Status</th>
                  <th className='px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer' onClick={() => handleSort('basePrice')}>Price</th>
                  <th className='px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer' onClick={() => handleSort('duration')}>Duration</th>
                  <th className='px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider'>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className='px-4 py-10 text-center text-sm text-gray-500'>Loading services database...</td>
                  </tr>
                ) : services.length === 0 ? (
                  <tr>
                    <td colSpan={7} className='px-4 py-10 text-center text-sm text-gray-500'>No services found with current filters.</td>
                  </tr>
                ) : (
                  services.map((service) => (
                    <tr key={service._id} className='border-b border-gray-100 hover:bg-gray-50/70'>
                      <td className='px-4 py-4'>
                        <div className='min-w-[220px]'>
                          <p className='text-sm font-bold text-gray-900'>{service.name}</p>
                          <p className='text-xs text-gray-500 line-clamp-1'>{service.description || 'No description'}</p>
                        </div>
                      </td>
                      <td className='px-4 py-4'>
                        <p className='text-sm font-semibold text-gray-800'>{service.locationName || 'Unknown Location'}</p>
                        <p className='text-xs text-gray-500'>{service.locationId || 'N/A'}</p>
                      </td>
                      <td className='px-4 py-4'>
                        <span className='inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100'>{service.categoryId?.name || 'Uncategorized'}</span>
                      </td>
                      <td className='px-4 py-4'>
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${service.status === 'active' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>{service.status}</span>
                      </td>
                      <td className='px-4 py-4 text-right text-sm font-semibold text-gray-900'>${service.basePrice}</td>
                      <td className='px-4 py-4 text-right text-sm font-semibold text-gray-900'>{service.duration}m</td>
                      <td className='px-4 py-4 text-right'>
                        <button onClick={() => openEdit(service)} className='inline-flex items-center gap-1.5 px-3 h-8 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 hover:bg-white'>
                          <Edit3 className='w-3.5 h-3.5' /> Edit
                        </button>
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
              Page {pagination.currentPage} of {pagination.totalPages}
            </p>
            <div className='flex items-center gap-2'>
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={!pagination.hasPrev || isFetching}
                className='h-9 px-3 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 disabled:opacity-50 flex items-center gap-1'
              >
                <ChevronLeft className='w-4 h-4' /> Prev
              </button>
              <button
                onClick={() => setPage((prev) => prev + 1)}
                disabled={!pagination.hasNext || isFetching}
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

                <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1) }} className='w-full h-11 rounded-xl border border-gray-200 px-3 text-sm font-medium'>
                  <option value=''>All categories</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>{category.name}</option>
                  ))}
                </select>

                <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className='w-full h-11 rounded-xl border border-gray-200 px-3 text-sm font-medium'>
                  <option value=''>Any status</option>
                  <option value='active'>Active</option>
                  <option value='inactive'>Inactive</option>
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

        {editingService && (
          <div className='fixed inset-0 z-[120] bg-black/50 p-0 md:p-4 flex items-end md:items-center justify-center'>
            <div className='bg-white rounded-t-3xl md:rounded-2xl w-full max-w-2xl overflow-hidden max-h-[92vh] flex flex-col'>
              <div className='w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-3 mb-2 md:hidden' />
              <div className='px-5 py-4 border-b border-gray-100 flex items-center justify-between'>
                <h3 className='text-lg font-bold text-gray-900'>Edit Service</h3>
                <button onClick={closeEdit} disabled={updateServiceMutation.isPending} className='p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50'>
                  <X className='w-5 h-5 text-gray-500' />
                </button>
              </div>

              <div className='p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto'>
                <div className='md:col-span-2'>
                  <label className='text-xs font-bold uppercase tracking-wider text-gray-500'>Service Name</label>
                  <input value={editForm.name} onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))} className='mt-1 w-full h-11 rounded-xl border border-gray-200 px-3 text-sm font-medium' />
                </div>
                <div className='md:col-span-2'>
                  <label className='text-xs font-bold uppercase tracking-wider text-gray-500'>Description</label>
                  <textarea value={editForm.description} onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))} rows={3} className='mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium resize-none' />
                </div>
                <div>
                  <label className='text-xs font-bold uppercase tracking-wider text-gray-500'>Location</label>
                  <select value={editForm.locationId} onChange={(e) => setEditForm((prev) => ({ ...prev, locationId: e.target.value }))} className='mt-1 w-full h-11 rounded-xl border border-gray-200 px-3 text-sm font-medium'>
                    <option value=''>Select location</option>
                    {locations.map((location) => (
                      <option key={location._id} value={location.locationId}>{location.name || location.locationId}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='text-xs font-bold uppercase tracking-wider text-gray-500'>Category</label>
                  <select value={editForm.categoryId} onChange={(e) => setEditForm((prev) => ({ ...prev, categoryId: e.target.value }))} className='mt-1 w-full h-11 rounded-xl border border-gray-200 px-3 text-sm font-medium'>
                    <option value=''>Select category</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>{category.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='text-xs font-bold uppercase tracking-wider text-gray-500'>Price</label>
                  <input type='number' min='0' step='0.01' value={editForm.basePrice} onChange={(e) => setEditForm((prev) => ({ ...prev, basePrice: e.target.value }))} className='mt-1 w-full h-11 rounded-xl border border-gray-200 px-3 text-sm font-medium' />
                </div>
                <div>
                  <label className='text-xs font-bold uppercase tracking-wider text-gray-500'>Duration (min)</label>
                  <input type='number' min='1' value={editForm.duration} onChange={(e) => setEditForm((prev) => ({ ...prev, duration: e.target.value }))} className='mt-1 w-full h-11 rounded-xl border border-gray-200 px-3 text-sm font-medium' />
                </div>
                <div>
                  <label className='text-xs font-bold uppercase tracking-wider text-gray-500'>Status</label>
                  <select value={editForm.status} onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))} className='mt-1 w-full h-11 rounded-xl border border-gray-200 px-3 text-sm font-medium'>
                    <option value='active'>Active</option>
                    <option value='inactive'>Inactive</option>
                  </select>
                </div>
              </div>

              <div className='px-4 md:px-5 pb-4 md:pb-5 flex items-center justify-end gap-3 border-t border-gray-100 pt-4'>
                <button onClick={closeEdit} disabled={updateServiceMutation.isPending} className='h-11 px-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 disabled:opacity-50'>Cancel</button>
                <button onClick={handleSaveEdit} disabled={updateServiceMutation.isPending} className='h-11 px-5 rounded-xl text-white text-sm font-semibold disabled:opacity-50' style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))' }}>
                  {updateServiceMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default ServicesDatabasePage
