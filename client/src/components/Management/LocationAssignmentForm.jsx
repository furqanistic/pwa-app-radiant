// File: client/src/components/Management/LocationAssignmentForm.jsx

import { useBranding } from '@/context/BrandingContext'
import { authService } from '@/services/authService'
import { locationService } from '@/services/locationService'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronsUpDown, Loader2, MapPin, UserCheck, X } from 'lucide-react'
import React, { useState } from 'react'
import { useSelector } from 'react-redux'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { toast } from 'sonner'

const PAGE_SIZE = 20

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

const getAssignedLocations = (user) => {
  const locations = Array.isArray(user?.assignedLocations)
    ? user.assignedLocations.filter((location) => location?.locationId)
    : []

  if (locations.length > 0) return locations

  const legacyLocation = user?.spaLocation?.locationId
    ? user.spaLocation
    : user?.selectedLocation

  return legacyLocation?.locationId ? [legacyLocation] : []
}

const getAssignedLocationNames = (user) =>
  getAssignedLocations(user)
    .map((location) => location?.locationName || location?.locationId)
    .filter(Boolean)

const getRoleBadgeClass = (role) => {
  if (role === 'admin') return 'bg-purple-100 text-purple-800'
  return 'bg-blue-100 text-blue-800'
}

const emptyPagination = {
  currentPage: 1,
  totalPages: 0,
  totalUsers: 0,
  hasNextPage: false,
  hasPreviousPage: false,
}

const LocationAssignmentForm = ({ isOpen, onClose, onSuccess }) => {
  const { currentUser } = useSelector((state) => state.user)
  const { branding } = useBranding()
  const queryClient = useQueryClient()

  const brandColor = branding?.themeColor || '#ec4899'
  const brandColorDark = adjustHex(brandColor, -24)

  const isAdmin = currentUser?.role === 'admin'
  const isSuperAdmin = currentUser?.role === 'super-admin'
  const roleScope = isAdmin ? 'spa' : 'assignable'

  const [mode, setMode] = useState('assign')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedUserSnapshot, setSelectedUserSnapshot] = useState(null)
  const [selectedLocationIds, setSelectedLocationIds] = useState([])
  const [locationOpen, setLocationOpen] = useState(false)

  const [assignSearch, setAssignSearch] = useState('')
  const [assignPage, setAssignPage] = useState(1)
  const [reassignSearch, setReassignSearch] = useState('')
  const [reassignPage, setReassignPage] = useState(1)

  const [errors, setErrors] = useState({})

  const { data: locationsData, isLoading: isLoadingLocations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationService.getAllLocations(),
    enabled: isOpen,
  })

  const { data: unassignedUsersData, isLoading: isLoadingUnassignedUsers } = useQuery({
    queryKey: ['unassigned-users', roleScope, assignPage, assignSearch],
    queryFn: () =>
      authService.getAllUsers({
        page: assignPage,
        limit: PAGE_SIZE,
        search: assignSearch,
        role: roleScope,
        unassignedOnly: true,
        sortBy: 'name',
        sortOrder: 'asc',
      }),
    enabled: isOpen,
  })

  const {
    data: assignedUsersData,
    isLoading: isLoadingAssignedUsers,
    isFetching: isFetchingAssignedUsers,
  } = useQuery({
    queryKey: ['assigned-users', roleScope, reassignPage, reassignSearch],
    queryFn: () =>
      authService.getAllUsers({
        page: reassignPage,
        limit: PAGE_SIZE,
        search: reassignSearch,
        role: roleScope,
        assignedOnly: true,
        sortBy: 'name',
        sortOrder: 'asc',
      }),
    enabled: isOpen,
  })

  const assignLocationMutation = useMutation({
    mutationFn: ({ userId, locationIds }) =>
      authService.assignLocationToUser(userId, locationIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] })
      queryClient.invalidateQueries({ queryKey: ['assignable-users'] })
      queryClient.invalidateQueries({ queryKey: ['assigned-users'] })
      queryClient.invalidateQueries({ queryKey: ['unassigned-users'] })
      onSuccess?.()
      handleClose()
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to save location'
      setErrors({ general: message })
    },
  })

  const unassignedUsers = unassignedUsersData?.data?.users || []
  const unassignedPagination =
    unassignedUsersData?.data?.pagination || emptyPagination

  const assignedUsers = assignedUsersData?.data?.users || []
  const assignedPagination = assignedUsersData?.data?.pagination || emptyPagination

  const locations = locationsData?.data?.locations || []

  const activeUsers = mode === 'assign' ? unassignedUsers : assignedUsers
  const activePagination =
    mode === 'assign' ? unassignedPagination : assignedPagination
  const activeLoading =
    mode === 'assign' ? isLoadingUnassignedUsers : isLoadingAssignedUsers
  const activeFetching = mode === 'reassign' ? isFetchingAssignedUsers : false

  const selectedUser =
    [...unassignedUsers, ...assignedUsers].find(
      (user) => user._id === selectedUserId
    ) || selectedUserSnapshot

  const selectedLocationsData = locations.filter((loc) =>
    selectedLocationIds.includes(loc._id)
  )
  const selectedLocationLabel =
    selectedLocationsData.length > 0
      ? selectedLocationsData
          .map((location) => location.name || location.locationId)
          .join(', ')
      : ''
  const selectedUserLocationNames =
    selectedUser?.currentLocationNames || getAssignedLocationNames(selectedUser)

  const clearSelection = () => {
    setSelectedUserId('')
    setSelectedUserSnapshot(null)
    setSelectedLocationIds([])
  }

  const handleModeChange = (nextMode) => {
    if (nextMode === mode) return
    setMode(nextMode)
    clearSelection()
    setErrors({})
  }

  const handleSelectUser = (user) => {
    setSelectedUserId(user._id)
    const currentLocations = getAssignedLocations(user)
    setSelectedUserSnapshot({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      currentLocationNames: getAssignedLocationNames(user),
    })
    const currentLocationIds = currentLocations
      .map((assignedLocation) => {
        const match = locations.find(
          (location) =>
            location.locationId === assignedLocation.locationId ||
            location.name === assignedLocation.locationName
        )
        return match?._id
      })
      .filter(Boolean)
    setSelectedLocationIds(currentLocationIds)
    setErrors((prev) => ({
      ...prev,
      selectedUser: '',
      selectedLocation: '',
      general: '',
    }))
    setLocationOpen(true)
  }

  const handleSave = async () => {
    const nextErrors = {}

    if (!selectedUserId) nextErrors.selectedUser = 'Select a user first'
    if (selectedLocationIds.length === 0) {
      nextErrors.selectedLocation = 'Select at least one location'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const toastId = toast.loading(
      selectedLocationIds.length > 1
        ? 'Assigning locations...'
        : 'Assigning location...'
    )

    try {
      await assignLocationMutation.mutateAsync({
        userId: selectedUserId,
        locationIds: selectedLocationIds,
      })
      toast.success(
        selectedLocationIds.length > 1
          ? 'Locations assigned successfully'
          : 'Location assigned successfully',
        { id: toastId }
      )
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to save location assignment',
        { id: toastId }
      )
    }
  }

  const handleClose = () => {
    if (assignLocationMutation.isPending) return

    setMode('assign')
    clearSelection()
    setAssignSearch('')
    setAssignPage(1)
    setReassignSearch('')
    setReassignPage(1)
    setLocationOpen(false)
    setErrors({})
    onClose()
  }

  const actionLabel = mode === 'reassign' ? 'Update Location' : 'Assign Location'
  const actionLoadingLabel = mode === 'reassign' ? 'Updating...' : 'Assigning...'

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        showCloseButton={false}
        className='p-0 overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh] w-full max-w-none sm:max-w-xl rounded-t-[2.5rem] sm:rounded-[2rem] fixed left-0 right-0 bottom-0 top-auto translate-x-0 translate-y-0 sm:top-1/2 sm:left-1/2 sm:right-auto sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2 border-0 shadow-2xl bg-white'
      >
        <div className='w-12 h-1.5 bg-gray-200 rounded-full mx-auto my-3 sm:hidden shrink-0' />
        <div className='flex flex-col min-h-0'>
          <div
            className='px-5 py-4 text-white flex items-center justify-between'
            style={{
              background: `linear-gradient(90deg, ${brandColor}, ${brandColorDark})`,
            }}
          >
            <div className='flex items-center gap-2'>
              <UserCheck className='w-5 h-5 text-white' />
              <DialogTitle className='text-lg font-semibold'>
                Manage Location Assignment
              </DialogTitle>
            </div>
            <button
              type='button'
              onClick={handleClose}
              className='p-2 rounded-lg hover:bg-white/15 transition-colors'
            >
              <X className='w-5 h-5 text-white' />
            </button>
          </div>

          <DialogDescription className='px-5 pt-3 text-sm text-gray-600'>
            Choose a mode, select a user, then choose a location and save.
          </DialogDescription>

          <div className='flex-1 overflow-y-auto px-5 py-4 space-y-4'>
            {errors.general && (
              <div className='p-3 bg-red-50 border border-red-200 rounded-lg'>
                <p className='text-sm text-red-700'>{errors.general}</p>
              </div>
            )}

            <div className='p-3 bg-blue-50 border border-blue-200 rounded-lg'>
              <p className='text-sm text-blue-800'>
                {isSuperAdmin
                  ? 'Super-admin: assign or update admin and spa users.'
                  : isAdmin
                  ? 'Admin: assign or update spa users only.'
                  : 'You do not have permission to manage assignments.'}
              </p>
            </div>

            <div className='space-y-2'>
              <Label className='text-sm font-medium text-gray-700'>Mode</Label>
              <div className='grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1'>
                <button
                  type='button'
                  onClick={() => handleModeChange('assign')}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    mode === 'assign'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Assign New ({unassignedPagination.totalUsers || 0})
                </button>
                <button
                  type='button'
                  onClick={() => handleModeChange('reassign')}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    mode === 'reassign'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Update Existing ({assignedPagination.totalUsers || 0})
                </button>
              </div>
            </div>

            <div className='space-y-2'>
              <Label className='text-sm font-medium text-gray-700'>
                {mode === 'assign' ? 'Select User To Assign' : 'Select User To Update'}
              </Label>
              <input
                type='text'
                value={mode === 'assign' ? assignSearch : reassignSearch}
                onChange={(e) => {
                  const value = e.target.value
                  if (mode === 'assign') {
                    setAssignSearch(value)
                    setAssignPage(1)
                  } else {
                    setReassignSearch(value)
                    setReassignPage(1)
                  }
                }}
                placeholder={
                  mode === 'assign'
                    ? 'Search users with no location...'
                    : 'Search users with existing location...'
                }
                className='w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300'
              />

              {activeLoading ? (
                <div className='p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 flex items-center gap-2'>
                  <Loader2 className='w-4 h-4 animate-spin' />
                  Loading users...
                </div>
              ) : activeUsers.length === 0 ? (
                <div className='p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500'>
                  {mode === 'assign'
                    ? 'No unassigned users found.'
                    : 'No assigned users found.'}
                </div>
              ) : (
                <div className='max-h-72 overflow-y-auto space-y-2 pr-1'>
                  {activeUsers.map((user) => {
                    const isSelected = selectedUserId === user._id
                    const currentLocationNames = getAssignedLocationNames(user)
                    const currentLocationLabel = currentLocationNames.join(', ')

                    return (
                      <div
                        key={`${mode}-${user._id}`}
                        className={`rounded-xl border p-3 transition-colors ${
                          isSelected
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className='flex items-start justify-between gap-3'>
                          <div className='min-w-0'>
                            <div className='flex items-center gap-2'>
                              <p className='text-sm font-semibold text-gray-900 truncate'>
                                {user.name}
                              </p>
                              <span
                                className={`text-[11px] px-2 py-0.5 rounded-full ${getRoleBadgeClass(
                                  user.role
                                )}`}
                              >
                                {user.role}
                              </span>
                            </div>
                            <p className='text-xs text-gray-500 truncate'>
                              {user.email}
                            </p>
                            <p
                              className={`text-xs mt-1 font-medium ${
                                currentLocationNames.length > 0
                                  ? 'text-amber-700'
                                  : 'text-emerald-700'
                              }`}
                            >
                              {currentLocationNames.length > 0
                                ? `Current: ${currentLocationLabel}`
                                : 'No location assigned'}
                            </p>
                          </div>

                          <Button
                            type='button'
                            size='sm'
                            variant={isSelected ? 'default' : 'outline'}
                            onClick={() => handleSelectUser(user)}
                            disabled={assignLocationMutation.isPending}
                            className={
                              isSelected
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'border-blue-200 text-blue-700 hover:bg-blue-50'
                            }
                          >
                            {isSelected
                              ? 'Selected'
                              : mode === 'assign'
                              ? 'Assign'
                              : 'Update'}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className='flex items-center justify-between gap-2'>
                <p className='text-xs text-gray-500'>
                  {activePagination.totalUsers || 0} users
                </p>
                <div className='flex items-center gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      if (mode === 'assign') {
                        setAssignPage((prev) => Math.max(prev - 1, 1))
                      } else {
                        setReassignPage((prev) => Math.max(prev - 1, 1))
                      }
                    }}
                    disabled={!activePagination.hasPreviousPage || activeFetching}
                  >
                    Prev
                  </Button>
                  <span className='text-xs text-gray-500 min-w-[88px] text-center'>
                    Page {activePagination.currentPage || 1} of{' '}
                    {Math.max(activePagination.totalPages || 1, 1)}
                  </span>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      if (mode === 'assign') {
                        setAssignPage((prev) => prev + 1)
                      } else {
                        setReassignPage((prev) => prev + 1)
                      }
                    }}
                    disabled={!activePagination.hasNextPage || activeFetching}
                  >
                    Next
                  </Button>
                </div>
              </div>
              {errors.selectedUser && (
                <p className='text-sm text-red-600'>{errors.selectedUser}</p>
              )}
            </div>

            <div className='space-y-2'>
              <Label className='text-sm font-medium text-gray-700'>
                Select Location(s) *
              </Label>
              <Popover open={locationOpen} onOpenChange={setLocationOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant='outline'
                    role='combobox'
                    aria-expanded={locationOpen}
                    className={`w-full justify-between ${
                      errors.selectedLocation
                        ? 'border-red-300 focus:border-red-500'
                        : 'focus:border-blue-400'
                    }`}
                    disabled={
                      assignLocationMutation.isPending ||
                      isLoadingLocations ||
                      !selectedUserId
                    }
                  >
                    <span className='truncate'>
                      {selectedLocationLabel
                        ? selectedLocationLabel
                        : !selectedUserId
                        ? 'Select a user first'
                        : isLoadingLocations
                        ? 'Loading locations...'
                        : 'Select one or more locations...'}
                    </span>
                    <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='w-full p-0'>
                  <Command>
                    <CommandInput placeholder='Search locations...' className='h-9' />
                    <CommandEmpty>No locations found.</CommandEmpty>
                    <CommandGroup className='max-h-64 overflow-y-auto'>
                      {locations.map((location) => (
                        <CommandItem
                          key={location._id}
                          onSelect={() => {
                            setSelectedLocationIds((prev) =>
                              prev.includes(location._id)
                                ? prev.filter((id) => id !== location._id)
                                : [...prev, location._id]
                            )
                            if (errors.selectedLocation) {
                              setErrors((prev) => ({
                                ...prev,
                                selectedLocation: '',
                              }))
                            }
                          }}
                        >
                          <div className='flex items-center gap-2 w-full'>
                            <Check
                              className={`h-4 w-4 ${
                                selectedLocationIds.includes(location._id)
                                  ? 'opacity-100'
                                  : 'opacity-0'
                              }`}
                            />
                            <div className='flex flex-col flex-1'>
                              <span className='font-medium'>
                                {location.name || 'Unnamed Location'}
                              </span>
                              <span className='text-xs text-gray-500'>
                                ID: {location.locationId}
                              </span>
                              {location.address && (
                                <span className='text-xs text-gray-400'>
                                  {location.address}
                                </span>
                              )}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              {errors.selectedLocation && (
                <p className='text-sm text-red-600'>{errors.selectedLocation}</p>
              )}
              {selectedLocationIds.length > 0 && (
                <p className='text-xs text-gray-500'>
                  {selectedLocationIds.length} location
                  {selectedLocationIds.length === 1 ? '' : 's'} selected. Click a
                  selected location again to remove it.
                </p>
              )}
            </div>

            {selectedUser && (
              <div className='p-4 bg-green-50 border border-green-200 rounded-lg'>
                <div className='flex items-center gap-2 text-green-700 mb-2'>
                  <MapPin className='w-4 h-4' />
                  <span className='text-sm font-medium'>Selection Summary</span>
                </div>
                <p className='text-sm text-green-800'>
                  <span className='font-semibold'>{selectedUser.name}</span> ({selectedUser.role})
                </p>
                {selectedUserLocationNames.length > 0 && (
                  <p className='text-xs text-green-700 mt-1'>
                    Current locations: {selectedUserLocationNames.join(', ')}
                  </p>
                )}
                {selectedLocationsData.length > 0 && (
                  <p className='text-xs text-green-700 mt-1'>
                    New locations:{' '}
                    {selectedLocationsData
                      .map((location) => location.name || location.locationId)
                      .join(', ')}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className='border-t bg-white px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]'>
            <div className='grid grid-cols-2 gap-3'>
              <Button
                type='button'
                variant='outline'
                onClick={handleClose}
                disabled={assignLocationMutation.isPending}
                className='h-11'
              >
                Cancel
              </Button>
              <Button
                type='button'
                onClick={handleSave}
                disabled={
                  assignLocationMutation.isPending ||
                  !selectedUserId ||
                  selectedLocationIds.length === 0
                }
                className='h-11 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold'
              >
                {assignLocationMutation.isPending ? (
                  <>
                    <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                    {actionLoadingLabel}
                  </>
                ) : (
                  <>
                    <UserCheck className='w-4 h-4 mr-2' />
                    {actionLabel}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default LocationAssignmentForm
