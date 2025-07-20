// client/src/components/Management/AddUserForm.jsx
import { locationService } from '@/services/locationService'
import { useQuery } from '@tanstack/react-query'
import {
  Calendar,
  Check,
  ChevronsUpDown,
  Lock,
  Mail,
  MapPin,
  Plus,
  Search,
  User,
  Users,
} from 'lucide-react'
import React, { useState } from 'react'

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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

const AddUserForm = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    dateOfBirth: '',
    password: '',
    assignedLocation: '', // New field for location
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [locationOpen, setLocationOpen] = useState(false)

  // Fetch locations for dropdown
  const {
    data: locations = [],
    isLoading: isLoadingLocations,
    error: locationsError,
  } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationService.getAllLocations(),
    enabled: isOpen, // Only fetch when dialog is open
    select: (data) => data?.data?.locations || data?.locations || [],
  })

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePassword = (password) => {
    // At least 8 characters
    return password.length >= 8
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) newErrors.name = 'Full name is required'
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required'
    } else if (!validateEmail(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (!validatePassword(formData.password)) {
      newErrors.password = 'Password must be at least 8 characters long'
    }

    // Location assignment is optional
    // if (!formData.assignedLocation) {
    //   newErrors.assignedLocation = 'Please select a location'
    // }

    // DOB is optional, but validate format if provided
    if (formData.dateOfBirth && formData.dateOfBirth.trim()) {
      const dobDate = new Date(formData.dateOfBirth)
      const today = new Date()
      if (dobDate >= today) {
        newErrors.dateOfBirth = 'Date of birth must be in the past'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      // Prepare data for signup endpoint
      const signupData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: 'team', // Set role to team
        // Add location assignment if selected
        ...(formData.assignedLocation && {
          assignedLocation: formData.assignedLocation,
        }),
        // Note: You'll need to add dateOfBirth to your User schema if you want to store it
        ...(formData.dateOfBirth && { dateOfBirth: formData.dateOfBirth }),
      }

      // Call the onSubmit callback with form data
      if (onSubmit) {
        await onSubmit(signupData)
      }

      console.log('Creating new team user:', signupData)

      // Reset form
      setFormData({
        name: '',
        email: '',
        dateOfBirth: '',
        password: '',
        assignedLocation: '',
      })
      setErrors({})
      onClose()
    } catch (error) {
      console.error('Error creating user:', error)
      // Handle specific error cases
      if (error.response?.data?.message) {
        if (error.response.data.message.includes('email already exists')) {
          setErrors({ email: 'This email address is already registered' })
        } else {
          setErrors({ general: error.response.data.message })
        }
      } else {
        setErrors({
          general: 'An unexpected error occurred. Please try again.',
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        name: '',
        email: '',
        dateOfBirth: '',
        password: '',
        assignedLocation: '',
      })
      setErrors({})
      onClose()
    }
  }

  // Get selected location name for display
  const selectedLocation = locations.find(
    (loc) => loc._id === formData.assignedLocation
  )

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-lg max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-xl'>
            <div className='w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center justify-center'>
              <Plus className='w-4 h-4 text-white' />
            </div>
            Add New Team Member
          </DialogTitle>
          <DialogDescription>
            Create a new team user account with access to the platform
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-6 py-4'>
          {/* General Error */}
          {errors.general && (
            <div className='p-3 bg-red-50 border border-red-200 rounded-lg'>
              <p className='text-sm text-red-600'>{errors.general}</p>
            </div>
          )}

          {/* Full Name */}
          <div className='space-y-2'>
            <Label htmlFor='name' className='text-sm font-medium text-gray-700'>
              Full Name *
            </Label>
            <div className='relative'>
              <Input
                id='name'
                type='text'
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder='Enter full name...'
                className={`pl-10 transition-all ${
                  errors.name
                    ? 'border-red-300 focus:border-red-500'
                    : 'focus:border-purple-400'
                }`}
                disabled={isSubmitting}
              />
              <User className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
            </div>
            {errors.name && (
              <p className='text-sm text-red-600 flex items-center gap-1'>
                {errors.name}
              </p>
            )}
          </div>

          {/* Email Address */}
          <div className='space-y-2'>
            <Label
              htmlFor='email'
              className='text-sm font-medium text-gray-700'
            >
              Email Address *
            </Label>
            <div className='relative'>
              <Input
                id='email'
                type='email'
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder='Enter email address...'
                className={`pl-10 transition-all ${
                  errors.email
                    ? 'border-red-300 focus:border-red-500'
                    : 'focus:border-purple-400'
                }`}
                disabled={isSubmitting}
              />
              <Mail className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
            </div>
            {errors.email && (
              <p className='text-sm text-red-600 flex items-center gap-1'>
                {errors.email}
              </p>
            )}
          </div>

          {/* Assign Location */}
          <div className='space-y-2'>
            <Label className='text-sm font-medium text-gray-700'>
              Assign Location
            </Label>
            <Popover open={locationOpen} onOpenChange={setLocationOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant='outline'
                  role='combobox'
                  aria-expanded={locationOpen}
                  className={`w-full justify-between pl-10 ${
                    errors.assignedLocation
                      ? 'border-red-300 focus:border-red-500'
                      : 'focus:border-purple-400'
                  }`}
                  disabled={isSubmitting || isLoadingLocations}
                >
                  <div className='flex items-center gap-2 flex-1 text-left'>
                    <span className='ml-6'>
                      {selectedLocation
                        ? selectedLocation.name || selectedLocation.locationId
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
                  <CommandEmpty>
                    {locationsError
                      ? 'Error loading locations'
                      : 'No locations found.'}
                  </CommandEmpty>
                  <CommandGroup className='max-h-64 overflow-y-auto'>
                    {/* Clear selection option */}
                    <CommandItem
                      onSelect={() => {
                        handleInputChange('assignedLocation', '')
                        setLocationOpen(false)
                      }}
                      className='text-gray-500'
                    >
                      <div className='flex items-center gap-2 w-full'>
                        <div className='w-4 h-4'></div>
                        <span>No location assigned</span>
                      </div>
                    </CommandItem>

                    {/* Location options */}
                    {locations.map((location) => (
                      <CommandItem
                        key={location._id}
                        onSelect={() => {
                          handleInputChange('assignedLocation', location._id)
                          setLocationOpen(false)
                        }}
                      >
                        <div className='flex items-center gap-2 w-full'>
                          <Check
                            className={`h-4 w-4 ${
                              formData.assignedLocation === location._id
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
            {errors.assignedLocation && (
              <p className='text-sm text-red-600 flex items-center gap-1'>
                {errors.assignedLocation}
              </p>
            )}
            <p className='text-xs text-gray-500'>
              Optional - assign user to a specific spa location
            </p>
          </div>

          {/* Date of Birth */}
          <div className='space-y-2'>
            <Label
              htmlFor='dateOfBirth'
              className='text-sm font-medium text-gray-700'
            >
              Date of Birth
            </Label>
            <div className='relative'>
              <Input
                id='dateOfBirth'
                type='date'
                value={formData.dateOfBirth}
                onChange={(e) =>
                  handleInputChange('dateOfBirth', e.target.value)
                }
                className={`pl-10 transition-all ${
                  errors.dateOfBirth
                    ? 'border-red-300 focus:border-red-500'
                    : 'focus:border-purple-400'
                }`}
                disabled={isSubmitting}
                max={new Date().toISOString().split('T')[0]} // Prevent future dates
              />
              <Calendar className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
            </div>
            {errors.dateOfBirth && (
              <p className='text-sm text-red-600 flex items-center gap-1'>
                {errors.dateOfBirth}
              </p>
            )}
            <p className='text-xs text-gray-500'>
              Optional - used for age verification and personalization
            </p>
          </div>

          {/* Password */}
          <div className='space-y-2'>
            <Label
              htmlFor='password'
              className='text-sm font-medium text-gray-700'
            >
              Password *
            </Label>
            <div className='relative'>
              <Input
                id='password'
                type='password'
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder='Enter password...'
                className={`pl-10 transition-all ${
                  errors.password
                    ? 'border-red-300 focus:border-red-500'
                    : 'focus:border-purple-400'
                }`}
                disabled={isSubmitting}
              />
              <Lock className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
            </div>
            {errors.password && (
              <p className='text-sm text-red-600 flex items-center gap-1'>
                {errors.password}
              </p>
            )}
            <p className='text-xs text-gray-500'>
              Must be at least 8 characters long
            </p>
          </div>

          {/* Form Actions */}
          <div className='flex flex-col sm:flex-row gap-3 pt-4'>
            <Button
              type='button'
              variant='outline'
              onClick={handleClose}
              disabled={isSubmitting}
              className='flex-1 sm:flex-none border-gray-300 hover:border-gray-400'
            >
              Cancel
            </Button>
            <Button
              type='button'
              onClick={handleSubmit}
              disabled={isSubmitting}
              className='flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 shadow-lg hover:shadow-xl transition-all'
            >
              {isSubmitting ? (
                <div className='flex items-center gap-2'>
                  <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                  Creating...
                </div>
              ) : (
                <div className='flex items-center gap-2'>
                  <Plus className='w-4 h-4' />
                  Create Team Member
                </div>
              )}
            </Button>
          </div>
        </div>

        {/* Info Card */}
        <div className='mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100'>
          <div className='flex items-start gap-3'>
            <Users className='w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0' />
            <div>
              <h4 className='font-medium text-gray-900 mb-1'>
                Team Member Access
              </h4>
              <p className='text-sm text-gray-600'>
                This will create a new team member account with team-level
                permissions.{' '}
                {selectedLocation && (
                  <span className='font-medium'>
                    User will be assigned to{' '}
                    {selectedLocation.name || selectedLocation.locationId}.
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AddUserForm
