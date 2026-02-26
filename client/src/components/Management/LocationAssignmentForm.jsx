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

const getAssignedLocationName = (user) =>
  user?.selectedLocation?.locationName || user?.spaLocation?.locationName || ''

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
  const [selectedLocationId, setSelectedLocationId] = useState('')
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
    mutationFn: ({ userId, locationId }) =>
      authService.assignLocationToUser(userId, locationId),
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

  const selectedLocationData = locations.find((loc) => loc._id === selectedLocationId)

  const clearSelection = () => {
    setSelectedUserId('')
    setSelectedUserSnapshot(null)
    setSelectedLocationId('')
  }

  const handleModeChange = (nextMode) => {
    if (nextMode === mode) return
    setMode(nextMode)
    clearSelection()
    setErrors({})
  }

  const handleSelectUser = (user) => {
    setSelectedUserId(user._id)
    setSelectedUserSnapshot({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      currentLocationName: getAssignedLocationName(user),
    })
    setSelectedLocationId('')
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
    if (!selectedLocationId) nextErrors.selectedLocation = 'Select a location'

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    await assignLocationMutation.mutateAsync({
      userId: selectedUserId,
      locationId: selectedLocationId,
    })
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
                    const currentLocationName = getAssignedLocationName(user)

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
                                currentLocationName
                                  ? 'text-amber-700'
                                  : 'text-emerald-700'
                              }`}
                            >
                              {currentLocationName
                                ? `Current: ${currentLocationName}`
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
                Select Location *
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
                      {selectedLocationData
                        ? selectedLocationData.name || selectedLocationData.locationId
                        : !selectedUserId
                        ? 'Select a user first'
                        : isLoadingLocations
                        ? 'Loading locations...'
                        : 'Select location...'}
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
                            setSelectedLocationId(location._id)
                            setLocationOpen(false)
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
                                selectedLocationId === location._id
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
                {selectedUser.currentLocationName && (
                  <p className='text-xs text-green-700 mt-1'>
                    Current location: {selectedUser.currentLocationName}
                  </p>
                )}
                {selectedLocationData && (
                  <p className='text-xs text-green-700 mt-1'>
                    New location: {selectedLocationData.name}
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
                  !selectedLocationId
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
