// File: client/src/components/Management/AddUserForm.jsx - UPDATED WITH FIXES

import { locationService } from '@/services/locationService'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  Building,
  Calendar,
  Check,
  ChevronsUpDown,
  Crown,
  Heart,
  Lock,
  Mail,
  MapPin,
  Plus,
  Search,
  Shield,
  User,
  Users,
} from 'lucide-react'
import React, { useState } from 'react'
import { useSelector } from 'react-redux'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const AddUserForm = ({ isOpen, onClose, onSubmit }) => {
  const { currentUser } = useSelector((state) => state.user)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    dateOfBirth: '',
    password: '',
    role: 'user', // Default role
    assignedLocation: '', // For location assignment
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [locationOpen, setLocationOpen] = useState(false)

  const isAdmin = currentUser?.role === 'admin'
  const isSuperAdmin = currentUser?.role === 'super-admin'

  // Available roles based on current user
  const getAvailableRoles = () => {
    if (isSuperAdmin) {
      return [
        { value: 'user', label: 'User' },
        { value: 'team', label: 'Spa' },
        { value: 'admin', label: 'Admin' },
      ]
    } else if (isAdmin) {
      return [
        { value: 'user', label: 'User' },
        { value: 'team', label: 'Spa' },
      ]
    } else {
      return [{ value: 'user', label: 'User' }]
    }
  }

  // Get permission notice based on current user role
  const getPermissionNotice = () => {
    if (isSuperAdmin) {
      return {
        icon: Crown,
        bgColor: 'bg-gradient-to-r from-yellow-50 to-orange-50',
        borderColor: 'border-yellow-200',
        textColor: 'text-yellow-800',
        title: 'Super Admin Powers',
        description:
          'You can create Users, Spa managers, and Admins. You have full control over the platform!',
      }
    } else if (isAdmin) {
      return {
        icon: Building,
        bgColor: 'bg-gradient-to-r from-blue-50 to-indigo-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-800',
        title: 'Admin Rights',
        description:
          'You can create Users and Spa managers. Spa managers must be assigned to locations.',
      }
    } else {
      return {
        icon: Heart,
        bgColor: 'bg-gradient-to-r from-pink-50 to-rose-50',
        borderColor: 'border-pink-200',
        textColor: 'text-pink-800',
        title: 'Team Member',
        description: 'You can create User accounts for your spa location.',
      }
    }
  }

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

  // Fixed date handling to prevent freezing
  const handleDateChange = (e) => {
    e.stopPropagation() // Prevent event bubbling
    const value = e.target.value
    handleInputChange('dateOfBirth', value)
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

    if (!formData.role) {
      newErrors.role = 'Please select a role'
    }

    // Location assignment validation
    if (isAdmin && formData.role === 'team' && !formData.assignedLocation) {
      newErrors.assignedLocation = 'Location is required for Spa managers'
    }

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
    e.stopPropagation() // Prevent any event bubbling

    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      // Prepare data for creation endpoint
      const userData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
        // Add location assignment if selected
        ...(formData.assignedLocation && {
          assignedLocation: formData.assignedLocation,
        }),
        // Add dateOfBirth if provided
        ...(formData.dateOfBirth && { dateOfBirth: formData.dateOfBirth }),
      }

      // Call the onSubmit callback with form data
      if (onSubmit) {
        await onSubmit(userData)
      }

      console.log('Creating new user:', userData)

      // Reset form
      setFormData({
        name: '',
        email: '',
        dateOfBirth: '',
        password: '',
        role: 'user',
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
        role: 'user',
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

  // Check if location assignment should be shown - hide for regular users
  const shouldShowLocationAssignment = () => {
    // Don't show location assignment for regular users
    if (formData.role === 'user') return false

    if (isSuperAdmin) return true // Super admin can assign location to anyone
    if (isAdmin && formData.role === 'team') return true // Admin can assign location to spa
    return false
  }

  const availableRoles = getAvailableRoles()
  const permissionNotice = getPermissionNotice()

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-lg max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-xl'>
            <div className='w-8 h-8 bg-gradient-to-r from-pink-500 to-rose-600 rounded-lg flex items-center justify-center'>
              <Plus className='w-4 h-4 text-white' />
            </div>
            Add New User
          </DialogTitle>
          <DialogDescription>
            Create a new user account with specified role and permissions
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-6 py-4'>
          {/* Permission Notice */}
          <div
            className={`p-4 ${permissionNotice.bgColor} border ${permissionNotice.borderColor} rounded-xl`}
          >
            <div className='flex items-start gap-3'>
              <permissionNotice.icon
                className={`w-5 h-5 ${permissionNotice.textColor} mt-0.5 flex-shrink-0`}
              />
              <div>
                <h4
                  className={`font-medium ${permissionNotice.textColor} mb-1`}
                >
                  {permissionNotice.title}
                </h4>
                <p
                  className={`text-sm ${permissionNotice.textColor} opacity-90`}
                >
                  {permissionNotice.description}
                </p>
              </div>
            </div>
          </div>

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

          {/* Role Selection */}
          <div className='space-y-2'>
            <Label className='text-sm font-medium text-gray-700'>Role *</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => {
                handleInputChange('role', value)
                // Clear location if role changed and it's not eligible for location assignment
                if (value === 'user') {
                  handleInputChange('assignedLocation', '')
                }
              }}
            >
              <SelectTrigger
                className={`${
                  errors.role
                    ? 'border-red-300 focus:border-red-500'
                    : 'focus:border-purple-400'
                }`}
              >
                <div className='flex items-center gap-2'>
                  <Shield className='w-4 h-4 text-gray-400' />
                  <SelectValue placeholder='Select role...' />
                </div>
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    <div className='flex items-center gap-2'>
                      <span>{role.label}</span>
                      {role.value === 'team' && (
                        <span className='text-xs text-gray-500'>
                          (Spa Manager)
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && (
              <p className='text-sm text-red-600 flex items-center gap-1'>
                {errors.role}
              </p>
            )}

            {/* Role descriptions */}
            <div className='text-xs text-gray-500 space-y-1'>
              {formData.role === 'user' && (
                <p>
                  • Regular users can access basic features and book services
                </p>
              )}
              {formData.role === 'team' && (
                <p>
                  • Spa managers can manage users and services in their assigned
                  location
                </p>
              )}
              {formData.role === 'admin' && (
                <p>• Admins can manage locations, users, and system settings</p>
              )}
            </div>
          </div>

          {/* Location Assignment - Only show when needed */}
          {shouldShowLocationAssignment() && (
            <div className='space-y-2'>
              <Label className='text-sm font-medium text-gray-700'>
                Assign Location {isAdmin && formData.role === 'team' && '*'}
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
                    type='button' // Prevent form submission
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
                      {/* Clear selection option - only for super-admin */}
                      {isSuperAdmin && (
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
                      )}

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
                {isAdmin && formData.role === 'team'
                  ? 'Required - Spa managers must be assigned to a location'
                  : 'Optional - assign user to a specific spa location'}
              </p>
            </div>
          )}

          {/* Date of Birth - Fixed */}
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
                onChange={handleDateChange}
                onClick={(e) => e.stopPropagation()} // Prevent click from bubbling
                onFocus={(e) => e.stopPropagation()} // Prevent focus from bubbling
                className={`pl-10 transition-all ${
                  errors.dateOfBirth
                    ? 'border-red-300 focus:border-red-500'
                    : 'focus:border-purple-400'
                }`}
                disabled={isSubmitting}
                max={new Date().toISOString().split('T')[0]} // Prevent future dates
              />
              <Calendar className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none' />
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
              type='submit'
              onClick={handleSubmit}
              disabled={isSubmitting}
              className='flex-1 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 disabled:opacity-50 transition-all'
            >
              {isSubmitting ? (
                <div className='flex items-center gap-2'>
                  <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                  Creating...
                </div>
              ) : (
                <div className='flex items-center gap-2'>
                  <Plus className='w-4 h-4' />
                  Create User
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
                Creating:{' '}
                {formData.role === 'team'
                  ? 'Spa Manager'
                  : formData.role.charAt(0).toUpperCase() +
                    formData.role.slice(1)}{' '}
                User
              </h4>
              <p className='text-sm text-gray-600'>
                {formData.role === 'admin' &&
                  'Admin users can manage locations and spa managers.'}
                {formData.role === 'team' &&
                  'Spa managers can manage users and services in their assigned location.'}
                {formData.role === 'user' &&
                  'Regular users can access basic features and book services.'}
                {selectedLocation && formData.role === 'team' && (
                  <span className='block mt-1 font-medium'>
                    Will be assigned to:{' '}
                    {selectedLocation.name || selectedLocation.locationId}
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
