import { useBranding } from '@/context/BrandingContext'
import Layout from '@/pages/Layout/Layout'
import { locationService } from '@/services/locationService'
import { rewardsService } from '@/services/rewardsService'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  Gift,
  MapPin,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'

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

const rewardTypeOptions = [
  { value: 'add_on', label: 'Add-On' },
  { value: 'upgrade', label: 'Upgrade' },
  { value: 'experience', label: 'Experience' },
  { value: 'free_service', label: 'Free Service' },
  { value: 'discount', label: 'Discount' },
  { value: 'credit', label: 'Service Credit' },
  { value: 'service', label: 'Free Service' },
  { value: 'combo', label: 'Combo Deal' },
  { value: 'referral', label: 'Referral Reward' },
]

const getRewardTypeLabel = (type) => {
  const match = rewardTypeOptions.find((o) => o.value === type)
  return match?.label || type || 'Unknown'
}

const getRewardValueDisplay = (reward) => {
  if (!reward) return '—'
  if (reward.displayValue) return reward.displayValue
  const numericValue = Number(reward.value)
  if (!Number.isFinite(numericValue)) return '—'
  if (['service', 'free_service'].includes(reward.type)) return 'Free'
  if (['discount', 'experience', 'combo', 'service_discount'].includes(reward.type)) return `${numericValue}%`
  return `$${numericValue}`
}

const RewardsDatabasePage = () => {
  const { currentUser } = useSelector((state) => state.user)
  const { branding } = useBranding()
  const brandColor = branding?.themeColor || '#ec4899'
  const brandColorDark = adjustHex(brandColor, -24)

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [locationId, setLocationId] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
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
      locationId,
      type: type || undefined,
      status,
      sortBy,
      sortOrder,
    }),
    [page, limit, search, locationId, type, status, sortBy, sortOrder]
  )

  const {
    data: rewardsResponse,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['rewards-database', queryParams],
    queryFn: () => rewardsService.getRewards(queryParams),
    enabled: currentUser?.role === 'super-admin',
    placeholderData: (previousData) => previousData,
    select: (data) => ({
      rewards: data?.data?.rewards || [],
      pagination: data?.data?.pagination || {
        totalRewards: 0,
        currentPage: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    }),
  })

  const { data: locationsData } = useQuery({
    queryKey: ['locations', 'rewards-database'],
    queryFn: () => locationService.getAllLocations(),
    enabled: currentUser?.role === 'super-admin',
    staleTime: 5 * 60 * 1000,
  })

  const rewards = rewardsResponse?.rewards || []
  const pagination = rewardsResponse?.pagination || {
    totalRewards: 0,
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

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortBy(field)
    setSortOrder('desc')
  }

  const resetFilters = () => {
    setLocationId('')
    setType('')
    setStatus('')
    setSortBy('createdAt')
    setSortOrder('desc')
    setLimit(25)
    setPage(1)
  }

  if (currentUser?.role !== 'super-admin') {
    return (
      <Layout>
        <div className='max-w-3xl mx-auto px-4 py-10'>
          <div className='bg-white border border-slate-200 rounded-2xl p-6'>
            <h1 className='text-xl font-bold text-slate-900'>Access denied</h1>
            <p className='text-sm text-slate-600 mt-2'>
              Rewards Database is only available to super-admin users.
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
                    <Gift className='w-5 h-5 text-white' />
                  </div>
                  <div>
                    <h1 className='text-xl md:text-2xl font-semibold text-slate-900 tracking-tight'>
                      Rewards Database
                    </h1>
                    <p className='mt-1 text-sm text-slate-500'>
                      Browse all rewards across all locations
                    </p>
                    <div className='mt-1.5 flex items-center gap-2 text-xs text-slate-400'>
                      <span className='inline-flex items-center gap-1'>
                        <Star className='w-3.5 h-3.5' />
                        {pagination.totalRewards || 0} total
                      </span>
                      <span className='w-1 h-1 rounded-full bg-slate-200' />
                      <span>Page {pagination.currentPage || 1} / {pagination.totalPages || 1}</span>
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
                    placeholder='Search rewards...'
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
                    <option key={location._id || location.locationId} value={location.locationId}>
                      {location.name || location.locationId}
                    </option>
                  ))}
                </select>

                <select
                  value={type}
                  onChange={(e) => { setType(e.target.value); setPage(1) }}
                  className='hidden md:block h-9 text-sm rounded-lg border border-slate-200 bg-white px-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 transition-shadow text-slate-600'
                >
                  <option value=''>All types</option>
                  {rewardTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
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
            ) : rewards.length === 0 ? (
              <div className='rounded-2xl border border-slate-200 bg-white p-8 text-center'>
                <Gift className='w-10 h-10 text-slate-200 mx-auto mb-3' />
                <p className='text-sm font-medium text-slate-500'>
                  {search ? 'No rewards found matching your search' : 'No rewards found'}
                </p>
              </div>
            ) : (
              rewards.map((reward) => (
                <div key={reward._id} className='rounded-2xl border border-slate-200 bg-white p-4 space-y-3'>
                  <div className='flex items-start justify-between gap-2'>
                    <div className='min-w-0'>
                      <p className='text-sm font-medium text-slate-900 leading-tight'>{reward.name}</p>
                      <p className='text-xs text-slate-500 mt-0.5 line-clamp-2'>
                        {reward.description || 'No description'}
                      </p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      reward.status === 'active'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {reward.status}
                    </span>
                  </div>

                  <div className='grid grid-cols-2 gap-2 text-xs'>
                    <div className='rounded-lg bg-slate-50 border border-slate-100 p-2.5'>
                      <p className='text-slate-500 font-medium'>Type</p>
                      <p className='text-slate-800 font-semibold truncate mt-0.5'>{getRewardTypeLabel(reward.type)}</p>
                    </div>
                    <div className='rounded-lg bg-slate-50 border border-slate-100 p-2.5'>
                      <p className='text-slate-500 font-medium'>Points</p>
                      <p className='text-slate-800 font-semibold truncate mt-0.5'>{reward.pointCost || 0}</p>
                    </div>
                    <div className='rounded-lg bg-slate-50 border border-slate-100 p-2.5'>
                      <p className='text-slate-500 font-medium'>Value</p>
                      <p className='text-slate-900 font-semibold mt-0.5'>{getRewardValueDisplay(reward)}</p>
                    </div>
                    <div className='rounded-lg bg-slate-50 border border-slate-100 p-2.5'>
                      <p className='text-slate-500 font-medium'>Location</p>
                      <p className='text-slate-800 font-semibold truncate mt-0.5'>
                        {locationMap.get(reward.locationId) || reward.locationId || 'All'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ── Desktop table card ──────────────────────── */}
          <div className='hidden md:block rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden'>
            <div className='px-5 py-4 border-b border-slate-100'>
              <h2 className='text-sm font-semibold text-slate-900'>
                Rewards
                {pagination.totalRewards > 0 && (
                  <span className='text-slate-400 font-normal ml-1'>({pagination.totalRewards})</span>
                )}
              </h2>
            </div>

            <div className='overflow-x-auto'>
              <table className='min-w-full divide-y divide-slate-100'>
                <thead>
                  <tr>
                    <th className='px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider'>Reward</th>
                    <th className='px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider'>Type</th>
                    <th className='px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider'>Location</th>
                    <th className='px-5 py-3 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer' onClick={() => handleSort('pointCost')}>Points</th>
                    <th className='px-5 py-3 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider'>Value</th>
                    <th className='px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer' onClick={() => handleSort('status')}>Status</th>
                    <th className='px-5 py-3 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer' onClick={() => handleSort('createdAt')}>Created</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-50'>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className='px-5 py-10 text-center'>
                        <div className='flex items-center justify-center gap-2'>
                          <div className='w-4 h-4 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin' />
                          <span className='text-sm text-slate-400'>Loading rewards...</span>
                        </div>
                      </td>
                    </tr>
                  ) : rewards.length === 0 ? (
                    <tr>
                      <td colSpan={7} className='px-5 py-10 text-center text-sm text-slate-400'>No rewards found with current filters.</td>
                    </tr>
                  ) : (
                    rewards.map((reward) => (
                      <tr key={reward._id} className='transition-colors hover:bg-slate-50'>
                        <td className='px-5 py-3.5'>
                          <div className='min-w-[200px]'>
                            <p className='text-sm font-medium text-slate-900'>{reward.name}</p>
                            <p className='text-xs text-slate-500 line-clamp-1 mt-0.5'>{reward.description || 'No description'}</p>
                          </div>
                        </td>
                        <td className='px-5 py-3.5 whitespace-nowrap'>
                          <span className='inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-700'>
                            {getRewardTypeLabel(reward.type)}
                          </span>
                        </td>
                        <td className='px-5 py-3.5 whitespace-nowrap'>
                          <div className='flex items-center gap-1 text-sm text-slate-700'>
                            <MapPin className='w-3.5 h-3.5 text-slate-400 shrink-0' />
                            {locationMap.get(reward.locationId) || reward.locationId || 'All locations'}
                          </div>
                        </td>
                        <td className='px-5 py-3.5 whitespace-nowrap text-right text-sm font-medium text-slate-900 tabular-nums'>
                          {reward.pointCost || 0}
                        </td>
                        <td className='px-5 py-3.5 whitespace-nowrap text-right text-sm text-slate-700 tabular-nums'>
                          {getRewardValueDisplay(reward)}
                        </td>
                        <td className='px-5 py-3.5 whitespace-nowrap'>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            reward.status === 'active'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {reward.status}
                          </span>
                        </td>
                        <td className='px-5 py-3.5 whitespace-nowrap text-right text-xs text-slate-400 tabular-nums'>
                          {reward.createdAt
                            ? new Date(reward.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : '—'}
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
                  Page {pagination.currentPage || 1} of {pagination.totalPages || 1}
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
                    const current = pagination.currentPage || 1
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
                  Page {pagination.currentPage || 1} of {pagination.totalPages || 1}
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
                      <option key={location._id || location.locationId} value={location.locationId}>{location.name || location.locationId}</option>
                    ))}
                  </select>

                  <select value={type} onChange={(e) => { setType(e.target.value); setPage(1) }} className='w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700'>
                    <option value=''>All types</option>
                    {rewardTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
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
        </div>
      </div>
    </Layout>
  )
}

export default RewardsDatabasePage
