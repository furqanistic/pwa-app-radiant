// File: client/src/components/Management/LocationAssignmentForm.jsx

import { authService } from '@/services/authService'
import { locationService } from '@/services/locationService'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    Check,
    ChevronsUpDown,
    Loader2,
    MapPin,
    UserCheck,
    Users,
} from 'lucide-react'
import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'

// shadcn/ui components
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
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'

const LocationAssignmentForm = ({ isOpen, onClose, onSuccess }) => {
  const { currentUser } = useSelector((state) => state.user)
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('')
  const [userOpen, setUserOpen] = useState(false)
  const [locationOpen, setLocationOpen] = useState(false)
  const [errors, setErrors] = useState({})

  const queryClient = useQueryClient()

  const isAdmin = currentUser?.role === 'admin'
  const isSuperAdmin = currentUser?.role === 'super-admin'

  // Fetch users (admin/spa only)
  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['assignable-users'],
    queryFn: () =>
      authService.getAllUsers({
        page: 1,
        limit: 100, // Get more users for assignment
        role: 'all', // We'll filter on frontend
        sortBy: 'name',
        sortOrder: 'asc',
      }),
    enabled: isOpen,
  })

  // Fetch locations
  const { data: locationsData, isLoading: isLoadingLocations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationService.getAllLocations(),
    enabled: isOpen,
  })

  // Assignment mutation
  const assignLocationMutation = useMutation({
    mutationFn: ({ userId, locationId }) =>
      authService.assignLocationToUser(userId, locationId),
    onSuccess: () => {
      toast.success('Location assigned successfully!')
      queryClient.invalidateQueries(['all-users'])
      queryClient.invalidateQueries(['assignable-users'])
      onSuccess?.()
      handleClose()
    },
    onError: (error) => {
      const message =
        error.response?.data?.message || 'Failed to assign location'
      toast.error(message)
      setErrors({ general: message })
    },
  })

  // Filter users based on current user's permissions
  const getFilteredUsers = () => {
    if (!usersData?.data?.users) return []

    const users = usersData.data.users

    // Filter to only admin and team users
    let filteredUsers = users.filter((user) =>
      ['admin', 'spa'].includes(user.role)
    )

    // Additional filtering based on current user role
    if (isAdmin) {
      // Admin can only assign locations to team users
      filteredUsers = filteredUsers.filter((user) => user.role === 'spa')
    }
    // Super-admin can assign to both admin and team (no additional filtering needed)

    return filteredUsers
  }

  const users = getFilteredUsers()
  const locations = locationsData?.data?.locations || []

  const handleAssign = async () => {
    const newErrors = {}

    if (!selectedUser) newErrors.selectedUser = 'Please select a user'
    if (!selectedLocation)
      newErrors.selectedLocation = 'Please select a location'

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      await assignLocationMutation.mutateAsync({
        userId: selectedUser,
        locationId: selectedLocation,
      })
    }
  }

  const handleClose = () => {
    if (!assignLocationMutation.isPending) {
      setSelectedUser('')
      setSelectedLocation('')
      setErrors({})
      onClose()
    }
  }

  const selectedUserData = users.find((u) => u._id === selectedUser)
  const selectedLocationData = locations.find((l) => l._id === selectedLocation)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <UserCheck className='w-5 h-5 text-blue-500' />
            Assign Location to User
          </DialogTitle>
          <DialogDescription>
            Assign a spa location to an existing admin or spa member
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-6 py-4'>
          {/* General Error */}
          {errors.general && (
            <div className='p-3 bg-red-50 border border-red-200 rounded-lg'>
              <p className='text-sm text-red-600'>{errors.general}</p>
            </div>
          )}

          {/* Permission Info */}
          <div className='p-3 bg-blue-50 border border-blue-200 rounded-lg'>
            <p className='text-sm text-blue-800'>
              {isSuperAdmin
                ? 'As Super-Admin, you can assign locations to admin and spa users.'
                : isAdmin
                ? 'As Admin, you can assign locations to spa members only.'
                : 'You do not have permission to assign locations.'}
            </p>
          </div>

          {/* Select User */}
          <div className='space-y-2'>
            <Label className='text-sm font-medium text-gray-700'>
              Select User *
            </Label>
            <Popover open={userOpen} onOpenChange={setUserOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant='outline'
                  role='combobox'
                  aria-expanded={userOpen}
                  className={`w-full justify-between pl-10 ${
                    errors.selectedUser
                      ? 'border-red-300 focus:border-red-500'
                      : 'focus:border-blue-400'
                  }`}
                  disabled={assignLocationMutation.isPending || isLoadingUsers}
                >
                  <div className='flex items-center gap-2 flex-1 text-left'>
                    <span className='ml-6'>
                      {selectedUserData
                        ? `${selectedUserData.name} (${selectedUserData.role})`
                        : isLoadingUsers
                        ? 'Loading users...'
                        : 'Select user...'}
                    </span>
                  </div>
                  <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-full p-0'>
                <Command>
                  <CommandInput placeholder='Search users...' className='h-9' />
                  <CommandEmpty>No eligible users found.</CommandEmpty>
                  <CommandGroup className='max-h-64 overflow-y-auto'>
                    {users.map((user) => (
                      <CommandItem
                        key={user._id}
                        onSelect={() => {
                          setSelectedUser(user._id)
                          setUserOpen(false)
                          if (errors.selectedUser) {
                            setErrors((prev) => ({ ...prev, selectedUser: '' }))
                          }
                        }}
                      >
                        <div className='flex items-center gap-2 w-full'>
                          <Check
                            className={`h-4 w-4 ${
                              selectedUser === user._id
                                ? 'opacity-100'
                                : 'opacity-0'
                            }`}
                          />
                          <div className='flex flex-col flex-1'>
                            <div className='flex items-center gap-2'>
                              <span className='font-medium'>{user.name}</span>
                              <span
                                className={`text-xs px-2 py-1 rounded-full ${
                                  user.role === 'admin'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {user.role}
                              </span>
                            </div>
                            <span className='text-xs text-gray-500'>
                              {user.email}
                            </span>
                            {(user.selectedLocation?.locationName ||
                              user.spaLocation?.locationName) && (
                              <span className='text-xs text-gray-400'>
                                Current:{' '}
                                {user.selectedLocation?.locationName ||
                                  user.spaLocation?.locationName}
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
            {errors.selectedUser && (
              <p className='text-sm text-red-600'>{errors.selectedUser}</p>
            )}
            <p className='text-xs text-gray-500'>
              {users.length === 0
                ? 'No eligible users available for location assignment'
                : `${users.length} eligible user(s) available`}
            </p>
          </div>

          {/* Select Location */}
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
                  className={`w-full justify-between pl-10 ${
                    errors.selectedLocation
                      ? 'border-red-300 focus:border-red-500'
                      : 'focus:border-blue-400'
                  }`}
                  disabled={
                    assignLocationMutation.isPending || isLoadingLocations
                  }
                >
                  <div className='flex items-center gap-2 flex-1 text-left'>
                    <span className='ml-6'>
                      {selectedLocationData
                        ? selectedLocationData.name ||
                          selectedLocationData.locationId
                        : isLoadingLocations
                        ? 'Loading locations...'
                        : 'Select location...'}
                    </span>
                  </div>
                  <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-full p-0'>
                <Command>
                  <CommandInput
                    placeholder='Search locations...'
                    className='h-9'
                  />
                  <CommandEmpty>No locations found.</CommandEmpty>
                  <CommandGroup className='max-h-64 overflow-y-auto'>
                    {locations.map((location) => (
                      <CommandItem
                        key={location._id}
                        onSelect={() => {
                          setSelectedLocation(location._id)
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
                              selectedLocation === location._id
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

          {/* Assignment Preview */}
          {selectedUserData && selectedLocationData && (
            <div className='p-4 bg-green-50 border border-green-200 rounded-lg'>
              <div className='flex items-center gap-2 text-green-700 mb-2'>
                <MapPin className='w-4 h-4' />
                <span className='text-sm font-medium'>Assignment Preview</span>
              </div>
              <p className='text-sm text-green-800'>
                <span className='font-medium'>{selectedUserData.name}</span> (
                {selectedUserData.role}) will be assigned to{' '}
                <span className='font-medium'>{selectedLocationData.name}</span>
              </p>
              {selectedUserData.selectedLocation?.locationName && (
                <p className='text-xs text-green-600 mt-1'>
                  Current location:{' '}
                  {selectedUserData.selectedLocation.locationName} → Will be
                  updated
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className='flex gap-3 pt-4'>
            <Button
              type='button'
              variant='outline'
              onClick={handleClose}
              disabled={assignLocationMutation.isPending}
              className='flex-1'
            >
              Cancel
            </Button>
            <Button
              type='button'
              onClick={handleAssign}
              disabled={
                assignLocationMutation.isPending ||
                !selectedUser ||
                !selectedLocation
              }
              className='flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
            >
              {assignLocationMutation.isPending ? (
                <>
                  <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                  Assigning...
                </>
              ) : (
                <>
                  <UserCheck className='w-4 h-4 mr-2' />
                  Assign Location
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default LocationAssignmentForm
