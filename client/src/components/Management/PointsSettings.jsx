import { Button } from '@/components/ui/button'
import { useBranding } from '@/context/BrandingContext'
import { locationService } from '@/services/locationService'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { RefreshCw, Save, X } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

const Motion = motion

const cloneMethods = (methods = []) =>
  Array.isArray(methods) ? methods.map((method) => ({ ...method })) : []

const SPA_VISIBLE_METHOD_KEYS = [
  'referral',
  'share_referral_link',
  'booking',
  'purchase',
]

const buildLocalPointsLabel = (method, nextValue) => {
  const numericValue = Number(nextValue)
  if (!Number.isFinite(numericValue)) return method?.pointsLabel || ''
  if (method?.perDollar) return `${numericValue > 0 ? '+' : ''}${numericValue}/$1`
  return numericValue > 0 ? `+${numericValue}` : `${numericValue}`
}

const hexToRgba = (hex, alpha = 1) => {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return null
  const cleaned = hex.replace('#', '')
  if (cleaned.length !== 6) return null
  const num = Number.parseInt(cleaned, 16)
  if (!Number.isFinite(num)) return null
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const resolveInitialLocationId = (locations = [], currentUser = null) => {
  if (!locations.length) return null

  const preferredBusinessLocationId =
    currentUser?.selectedLocation?.locationId ||
    currentUser?.spaLocation?.locationId ||
    null

  if (preferredBusinessLocationId) {
    const preferredLocation = locations.find(
      (location) => location?.locationId === preferredBusinessLocationId
    )
    if (preferredLocation?._id) return preferredLocation._id
  }

  return locations[0]?._id || null
}

const PointsSettings = ({ isOpen, onClose, locations = [], currentUser }) => {
  const queryClient = useQueryClient()
  const { branding } = useBranding()
  const isSpaManager = currentUser?.role === 'spa'
  const isSuperAdmin = currentUser?.role === 'super-admin'
  const brandColor = branding?.themeColor || '#ec4899'
  const brandSoft = hexToRgba(brandColor, 0.18) || 'rgba(236,72,153,0.18)'
  const brandSofter = hexToRgba(brandColor, 0.1) || 'rgba(236,72,153,0.1)'
  const [methods, setMethods] = useState([])
  const [isDirty, setIsDirty] = useState(false)
  const [saveProgress, setSaveProgress] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLocationId, setSelectedLocationId] = useState(null)
  // Tracks whether the user has unsaved local changes so we don't
  // overwrite them when the query re-renders with stale data.
  const hasLocalChanges = React.useRef(false)

  const selectedLocation = useMemo(
    () =>
      locations.find((location) => location?._id === selectedLocationId) || null,
    [locations, selectedLocationId]
  )

  useEffect(() => {
    if (!isOpen) return
    const initialLocationId = resolveInitialLocationId(locations, currentUser)
    setSelectedLocationId(initialLocationId)
  }, [isOpen, locations, currentUser])

  useEffect(() => {
    const incomingMethods = selectedLocation?.pointsSettings?.methods
    if (!incomingMethods) return
    // Only skip if the user has unsaved local edits
    if (hasLocalChanges.current) return
    const scopedMethods = isSpaManager
      ? incomingMethods.filter((method) =>
          SPA_VISIBLE_METHOD_KEYS.includes(method.key)
        )
      : incomingMethods
    setMethods(cloneMethods(scopedMethods))
    setIsDirty(false)
  }, [selectedLocation, isSpaManager])

  const locationId = selectedLocation?._id
  const hasLocations = locations.length > 0
  const canSwitchLocation = locations.length > 1

  const updateLocationMutation = useMutation({
    mutationFn: (data) => locationService.updateLocation(locationId, data),
    onSuccess: () => {
      // Clear the local-changes guard BEFORE invalidating so the
      // incoming fresh data is allowed to update the methods list.
      hasLocalChanges.current = false
      setIsDirty(false)
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'data'] })
      toast.success('Points settings updated!')
      onClose?.()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update settings')
    },
  })

  const isSaving = updateLocationMutation.isPending

  useEffect(() => {
    if (!isSaving) {
      setSaveProgress(0)
      return
    }

    // Simulated optimistic progress while request is in-flight.
    setSaveProgress(12)
    const interval = setInterval(() => {
      setSaveProgress((prev) => {
        if (prev >= 92) return prev
        return prev + (prev < 60 ? 12 : 4)
      })
    }, 180)

    return () => clearInterval(interval)
  }, [isSaving])

  const handleToggle = (index) => {
    if (isSaving) return
    hasLocalChanges.current = true
    setMethods((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], isActive: !updated[index].isActive }
      return updated
    })
    setIsDirty(true)
  }

  const handleValueChange = (index, field, value) => {
    if (isSaving) return
    hasLocalChanges.current = true
    setMethods((prev) => {
      const updated = [...prev]
      const nextMethod = { ...updated[index], [field]: value }
      if (field === 'pointsValue') {
        nextMethod.pointsLabel = buildLocalPointsLabel(nextMethod, value)
      }
      updated[index] = nextMethod
      return updated
    })
    setIsDirty(true)
  }

  const handleSave = async () => {
    if (!locationId || isSaving) return
    await updateLocationMutation.mutateAsync({
      pointsSettings: { methods },
    })
    setSaveProgress(100)
    setTimeout(() => setSaveProgress(0), 500)
  }

  const handleSetAllEnabled = (enabled) => {
    if (isSaving) return
    hasLocalChanges.current = true
    setMethods((prev) =>
      prev.map((method) => ({
        ...method,
        isActive: enabled,
      }))
    )
    setIsDirty(true)
  }

  const activeCount = useMemo(
    () => methods.filter((method) => method.isActive).length,
    [methods]
  )

  const filteredMethods = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return methods
    return methods.filter((method) => {
      const haystack = [
        method.title,
        method.description,
        method.key,
        method.pointsLabel,
        method.frequency,
        method.verification,
        method.notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [methods, searchQuery])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className='fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]'
          />

          <Motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className='fixed inset-x-0 bottom-0 md:inset-x-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:bottom-auto w-full md:max-w-3xl bg-white md:rounded-[2.5rem] rounded-t-[2.5rem] shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[90vh]'
          >
            <div className='w-12 h-1.5 bg-gray-200 rounded-full mx-auto my-3 md:hidden shrink-0' />

            <div className='px-6 py-4 md:px-8 md:py-6 border-b border-gray-50 flex items-center justify-between shrink-0'>
              <div>
                <h2 className='text-xl md:text-2xl font-black text-gray-900 tracking-tight'>
                  Points Settings
                </h2>
                <p
                  className='text-xs md:text-sm font-bold uppercase tracking-widest mt-0.5'
                  style={{ color: brandColor }}
                >
                  {activeCount} enabled
                </p>
              </div>
              <div className='flex items-center gap-3'>
                <button
                  onClick={() => handleSetAllEnabled(true)}
                  disabled={isSaving || methods.length === 0}
                  className='px-3 py-2 bg-green-50 text-green-700 text-[10px] font-black uppercase rounded-xl border border-green-100 hover:bg-green-100 transition-colors'
                >
                  Enable All
                </button>
                <button
                  onClick={() => handleSetAllEnabled(false)}
                  disabled={isSaving || methods.length === 0}
                  className='px-3 py-2 bg-red-50 text-red-700 text-[10px] font-black uppercase rounded-xl border border-red-100 hover:bg-red-100 transition-colors'
                >
                  Disable All
                </button>
                <button
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['locations'] })}
                  disabled={isSaving || !hasLocations}
                  title='Reload'
                  className='p-2.5 bg-gray-100 text-gray-500 rounded-2xl hover:bg-blue-50 hover:text-blue-500 transition-all group'
                >
                  <RefreshCw className='w-5 h-5 group-hover:rotate-180 transition-transform duration-500' />
                </button>
                <button
                  onClick={onClose}
                  className='p-2.5 bg-gray-100 text-gray-500 rounded-2xl transition-all group'
                  onMouseEnter={(event) => {
                    event.currentTarget.style.backgroundColor = brandSofter
                    event.currentTarget.style.color = brandColor
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.backgroundColor = ''
                    event.currentTarget.style.color = ''
                  }}
                >
                  <X className='w-5 h-5 group-hover:rotate-90 transition-transform' />
                </button>
              </div>
            </div>

            <div className='flex-1 overflow-y-auto p-6 md:p-8'>
              <div className='mb-5'>
                <label className='block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2'>
                  Location
                </label>
                <select
                  value={selectedLocationId || ''}
                  onChange={(e) => {
                    hasLocalChanges.current = false
                    setSelectedLocationId(e.target.value || null)
                    setSearchQuery('')
                  }}
                  disabled={isSaving || !canSwitchLocation}
                  className='w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-500'
                  style={{ '--tw-ring-color': brandSoft }}
                >
                  {locations.map((location) => (
                    <option key={location._id} value={location._id}>
                      {location.name || location.locationId}
                    </option>
                  ))}
                </select>
                {isSpaManager && (
                  <p className='mt-2 text-[11px] font-semibold text-gray-500'>
                    You can edit only the rules used in the dashboard{" "}
                    <span className='text-gray-700'>"Earn More Points"</span> section.
                  </p>
                )}
                {isSuperAdmin && (
                  <p className='mt-2 text-[11px] font-semibold text-gray-500'>
                    Super admin can edit all point rules for the selected location.
                  </p>
                )}
              </div>

              <div className='mb-5'>
                <div className='relative'>
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder='Search rules...'
                    className='w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2'
                    style={{ '--tw-ring-color': brandSoft }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className='absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600'
                      aria-label='Clear search'
                    >
                      <X className='w-4 h-4' />
                    </button>
                  )}
                </div>
                {!!searchQuery && (
                  <p className='mt-2 text-[11px] font-bold uppercase tracking-widest text-gray-400'>
                    {filteredMethods.length} result{filteredMethods.length === 1 ? '' : 's'}
                  </p>
                )}
              </div>
              {!hasLocations ? (
                <div className='flex flex-col items-center justify-center py-20'>
                  <p className='text-sm font-bold text-gray-500 uppercase tracking-widest'>
                    No location found for this account.
                  </p>
                </div>
              ) : filteredMethods.length === 0 ? (
                <div className='text-center py-12 bg-gray-50 rounded-[2rem]'>
                  <p className='text-sm font-bold text-gray-500'>No points settings found.</p>
                </div>
              ) : (
                <div className='space-y-4'>
                  {filteredMethods.map((method) => {
                    const index = methods.findIndex((item) => item === method)
                    return (
                    <div
                      key={method.key || index}
                      className='flex flex-col gap-3 p-4 bg-white border border-gray-100 rounded-[2rem] shadow-sm'
                    >
                      <div className='flex items-center gap-4'>
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-center gap-2'>
                            <h4 className='text-sm font-black text-gray-900 truncate'>
                              {method.title}
                            </h4>
                            {method.pointsLabel && (
                              <span
                                className='px-2 py-0.5 text-[10px] font-black uppercase rounded-full border'
                                style={{
                                  backgroundColor: brandSofter,
                                  color: brandColor,
                                  borderColor: brandSoft,
                                }}
                              >
                                {method.pointsLabel} pts
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-full border ${
                                method.isActive
                                  ? 'bg-green-50 text-green-700 border-green-100'
                                  : 'bg-gray-100 text-gray-500 border-gray-200'
                              }`}
                            >
                              {method.isActive ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <p className='text-xs text-gray-500 mt-1'>
                            {method.description}
                          </p>
                          <p className='text-[11px] text-gray-700 mt-2'>
                            <span className='font-bold uppercase tracking-wide text-[10px] text-gray-500 mr-1'>
                              What this does:
                            </span>
                            {method.verification
                              ? `Awards ${method.pointsLabel || method.pointsValue} when ${method.verification.toLowerCase()}.`
                              : `Awards ${method.pointsLabel || method.pointsValue} when the action is completed.`}
                          </p>
                          <div className='mt-2 flex flex-wrap gap-2'>
                            {method.frequency && (
                              <span className='px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase rounded-full'>
                                {method.frequency}
                              </span>
                            )}
                            {method.verification && (
                              <span className='px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase rounded-full border border-blue-100'>
                                {method.verification}
                              </span>
                            )}
                          </div>
                          {method.notes && (
                            <p className='text-[11px] text-gray-400 mt-2'>
                              {method.notes}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleToggle(index)}
                          disabled={isSaving}
                          className={`w-12 h-6 rounded-full relative transition-colors ${
                            method.isActive ? 'bg-green-500' : 'bg-gray-300'
                          } ${isSaving ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <div
                              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                method.isActive ? 'translate-x-6' : ''
                              }`}
                          />
                        </button>
                      </div>

                      <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                        {typeof method.pointsValue === 'number' && (
                          <div className='flex items-center justify-between gap-2 rounded-2xl bg-gray-50 px-3 py-2'>
                            <span className='text-xs font-bold text-gray-600 uppercase tracking-wider'>
                              {method.perDollar ? 'Points Per $1' : 'Points Value'}
                            </span>
                            <input
                              type='number'
                              min='-1000'
                              value={method.pointsValue}
                              disabled={isSaving}
                              onChange={(e) =>
                                handleValueChange(
                                  index,
                                  'pointsValue',
                                  parseInt(e.target.value || '0', 10)
                                )
                              }
                              className='w-20 rounded-xl border border-gray-200 bg-white px-2 py-1 text-sm font-semibold text-gray-700 text-right'
                            />
                          </div>
                        )}

                        {method.key === 'on_time_arrival' && (
                          <div className='flex items-center justify-between gap-2 rounded-2xl bg-gray-50 px-3 py-2'>
                            <span className='text-xs font-bold text-gray-600 uppercase tracking-wider'>
                              On-Time Window (min)
                            </span>
                            <input
                              type='number'
                              min='0'
                              value={method.windowMinutes || 0}
                              disabled={isSaving}
                              onChange={(e) =>
                                handleValueChange(
                                  index,
                                  'windowMinutes',
                                  parseInt(e.target.value || '0', 10)
                                )
                              }
                              className='w-20 rounded-xl border border-gray-200 bg-white px-2 py-1 text-sm font-semibold text-gray-700 text-right'
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )})}
                </div>
              )}
            </div>

            <div className='px-6 md:px-8 pb-6'>
              {isSaving && (
                <div className='mb-3'>
                  <div className='flex items-center justify-between mb-1'>
                    <span
                      className='text-[10px] font-black uppercase tracking-wider'
                      style={{ color: brandColor }}
                    >
                      Saving settings...
                    </span>
                    <span className='text-[10px] font-bold text-gray-500'>
                      {Math.max(8, Math.min(100, saveProgress))}%
                    </span>
                  </div>
                  <div className='h-2 w-full rounded-full bg-gray-100 overflow-hidden'>
                    <div
                      className='h-full transition-all duration-200'
                      style={{
                        background: `linear-gradient(90deg, ${brandColor}, ${brandSoft})`,
                        width: `${Math.max(8, Math.min(100, saveProgress))}%`,
                      }}
                    />
                  </div>
                </div>
              )}
              <Button
                onClick={handleSave}
                disabled={!isDirty || isSaving || !locationId}
                className='w-full rounded-2xl h-12 text-white font-black uppercase tracking-widest text-xs'
                style={{ backgroundColor: brandColor }}
              >
                <Save className='w-4 h-4 mr-2' />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </Motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default PointsSettings
