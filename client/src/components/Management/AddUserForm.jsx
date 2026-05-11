// File: client/src/components/Management/AddUserForm.jsx - UPDATED WITH FIXES

import { useBranding } from '@/context/BrandingContext'
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
    X,
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

const AddUserForm = ({ isOpen, onClose, onSubmit }) => {
  const { currentUser } = useSelector((state) => state.user)
  const { branding } = useBranding()
  const brandColor = branding?.themeColor || '#ec4899'
  const brandColorDark = adjustHex(brandColor, -24)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    dateOfBirth: '',
    password: '',
    role: 'spa', // Default role changed from 'user'
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
        { value: 'spa', label: 'Spa' },
        { value: 'admin', label: 'Admin' },
      ]
    } else if (isAdmin) {
      return [
        { value: 'spa', label: 'Spa' },
      ]
    } else {
      return []
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
          'You can create Spa managers and Admins. You have full control over the platform!',
      }
    } else if (isAdmin) {
      return {
        icon: Building,
        bgColor: 'bg-gradient-to-r from-blue-50 to-indigo-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-800',
        title: 'Admin Rights',
        description:
          'You can create Spa managers. They must be assigned to locations.',
      }
    } else {
      return {
        icon: Heart,
        bgColor: 'bg-gradient-to-r from-pink-50 to-rose-50',
        borderColor: 'border-pink-200',
        textColor: 'text-pink-800',
        title: 'Spa Member',
        description: 'You can manage settings for your assigned location.',
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
    if (isAdmin && formData.role === 'spa' && !formData.assignedLocation) {
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
    if (isAdmin && formData.role === 'spa') return true // Admin can assign location to spa
    return false
  }

  const availableRoles = getAvailableRoles()
  const permissionNotice = getPermissionNotice()

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        showCloseButton={false}
        className='p-0 overflow-hidden max-h-[92vh] w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl fixed left-0 right-0 bottom-0 top-auto translate-x-0 translate-y-0 sm:top-1/2 sm:left-1/2 sm:right-auto sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2 flex flex-col border-0'
      >
        <div className='h-0.5 w-full shrink-0' style={{ background: brandColor }} />

        <div className='flex items-center justify-between px-5 pt-4 pb-3 shrink-0'>
          <div className='flex items-center gap-2.5'>
            <div className='w-8 h-8 rounded-lg flex items-center justify-center' style={{ backgroundColor: `${brandColor}14` }}>
              <Plus className='w-4 h-4' style={{ color: brandColor }} />
            </div>
            <DialogTitle className='text-sm font-semibold text-slate-900'>
              Add New User
            </DialogTitle>
          </div>
          <button
            onClick={handleClose}
            className='p-1.5 rounded-lg hover:bg-slate-100 transition-colors'
            type='button'
          >
            <X className='w-4 h-4 text-slate-400' />
          </button>
        </div>

        <div className='px-5 pb-3 text-xs text-slate-500 border-b border-slate-100 shrink-0'>
          Create a new user account with specified role and permissions
        </div>

        <div className='flex-1 overflow-y-auto px-5 py-4 space-y-5'>
          {/* Permission Notice */}
          <div className={`p-3.5 rounded-xl border ${permissionNotice.borderColor}`} style={{ backgroundColor: `${brandColor}08` }}>
            <div className='flex items-start gap-2.5'>
              <permissionNotice.icon className='w-4 h-4 mt-0.5 shrink-0' style={{ color: brandColor }} />
              <div>
                <h4 className='text-xs font-semibold text-slate-900 mb-0.5'>{permissionNotice.title}</h4>
                <p className='text-xs text-slate-500'>{permissionNotice.description}</p>
              </div>
            </div>
          </div>

          {errors.general && (
            <div className='rounded-xl border border-red-200 bg-red-50 p-3'>
              <p className='text-xs font-medium text-red-600'>{errors.general}</p>
            </div>
          )}

          {/* Full Name */}
          <div className='space-y-1.5'>
            <Label htmlFor='name' className='text-xs font-medium text-slate-700'>Full Name <span className='text-red-400'>*</span></Label>
            <div className='relative'>
              <Input
                id='name'
                type='text'
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder='Enter full name...'
                className={`h-10 pl-10 text-sm rounded-xl border-slate-200 transition-shadow focus-visible:ring-2 focus-visible:ring-slate-200 focus:border-slate-300 ${
                  errors.name ? 'border-red-300 focus-visible:ring-red-200' : ''
                }`}
                disabled={isSubmitting}
              />
              <User className='absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
            </div>
            {errors.name && <p className='text-xs text-red-500'>{errors.name}</p>}
          </div>

          {/* Email */}
          <div className='space-y-1.5'>
            <Label htmlFor='email' className='text-xs font-medium text-slate-700'>Email <span className='text-red-400'>*</span></Label>
            <div className='relative'>
              <Input
                id='email'
                type='email'
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder='Enter email address...'
                className={`h-10 pl-10 text-sm rounded-xl border-slate-200 transition-shadow focus-visible:ring-2 focus-visible:ring-slate-200 focus:border-slate-300 ${
                  errors.email ? 'border-red-300 focus-visible:ring-red-200' : ''
                }`}
                disabled={isSubmitting}
              />
              <Mail className='absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
            </div>
            {errors.email && <p className='text-xs text-red-500'>{errors.email}</p>}
          </div>

          {/* Role Selection */}
          <div className='space-y-1.5'>
            <Label className='text-xs font-medium text-slate-700'>Role <span className='text-red-400'>*</span></Label>
            <Select
              value={formData.role}
              onValueChange={(value) => {
                handleInputChange('role', value)
                if (value === 'user') handleInputChange('assignedLocation', '')
              }}
            >
              <SelectTrigger className={`h-10 rounded-xl border-slate-200 text-sm transition-shadow focus-visible:ring-2 focus-visible:ring-slate-200 ${errors.role ? 'border-red-300' : ''}`}>
                <div className='flex items-center gap-2'>
                  <Shield className='w-4 h-4 text-slate-400' />
                  <SelectValue placeholder='Select role...' />
                </div>
              </SelectTrigger>
              <SelectContent className='rounded-xl border-slate-200'>
                {availableRoles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    <div className='flex items-center gap-2'>
                      <span>{role.label}</span>
                      {role.value === 'spa' && <span className='text-xs text-slate-400'>(Spa Manager)</span>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && <p className='text-xs text-red-500'>{errors.role}</p>}
            <div className='text-xs text-slate-400 space-y-0.5'>
              {formData.role === 'spa' && <p>• Spa managers can manage users and services in their assigned location</p>}
              {formData.role === 'admin' && <p>• Admins can manage locations, users, and system settings</p>}
            </div>
          </div>

          {/* Location Assignment */}
          {shouldShowLocationAssignment() && (
            <div className='space-y-1.5'>
              <Label className='text-xs font-medium text-slate-700'>
                Assign Location {isAdmin && formData.role === 'spa' && <span className='text-red-400'>*</span>}
              </Label>
              <Popover open={locationOpen} onOpenChange={setLocationOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant='outline'
                    role='combobox'
                    aria-expanded={locationOpen}
                    className={`w-full h-10 justify-between rounded-xl border-slate-200 text-sm font-normal text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors ${
                      errors.assignedLocation ? 'border-red-300' : ''
                    }`}
                    disabled={isSubmitting || isLoadingLocations}
                    type='button'
                  >
                    <div className='flex items-center gap-2'>
                      <MapPin className='w-4 h-4 text-slate-400' />
                      {selectedLocation
                        ? selectedLocation.name || selectedLocation.locationId
                        : isLoadingLocations
                        ? 'Loading locations...'
                        : 'Select location...'}
                    </div>
                    <ChevronsUpDown className='h-4 w-4 opacity-50' />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='w-full p-0 rounded-xl border-slate-200'>
                  <Command className='rounded-xl'>
                    <CommandInput placeholder='Search locations...' className='h-9 text-sm' />
                    <CommandEmpty className='text-xs text-slate-400 py-4'>No locations found.</CommandEmpty>
                    <CommandGroup className='max-h-56 overflow-y-auto'>
                      {isSuperAdmin && (
                        <CommandItem
                          onSelect={() => { handleInputChange('assignedLocation', ''); setLocationOpen(false) }}
                          className='text-xs text-slate-500'
                        >
                          <div className='flex items-center gap-2'>No location assigned</div>
                        </CommandItem>
                      )}
                      {locations.map((location) => (
                        <CommandItem
                          key={location._id}
                          onSelect={() => { handleInputChange('assignedLocation', location._id); setLocationOpen(false) }}
                          className='text-sm'
                        >
                          <div className='flex items-center gap-2 w-full'>
                            <Check className={`h-3.5 w-3.5 ${formData.assignedLocation === location._id ? 'opacity-100' : 'opacity-0'}`} />
                            <div className='flex flex-col flex-1 min-w-0'>
                              <span className='font-medium text-slate-900 truncate'>{location.name || 'Unnamed Location'}</span>
                              {location.address && <span className='text-xs text-slate-400 truncate'>{location.address}</span>}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              {errors.assignedLocation && <p className='text-xs text-red-500'>{errors.assignedLocation}</p>}
              <p className='text-xs text-slate-400'>
                {isAdmin && formData.role === 'spa'
                  ? 'Required — Spa managers must be assigned to a location'
                  : 'Optional — assign user to a specific spa location'}
              </p>
            </div>
          )}

          {/* Date of Birth */}
          <div className='space-y-1.5'>
            <Label htmlFor='dateOfBirth' className='text-xs font-medium text-slate-700'>Date of Birth</Label>
            <div className='relative'>
              <Input
                id='dateOfBirth'
                type='date'
                value={formData.dateOfBirth}
                onChange={handleDateChange}
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
                className={`h-10 pl-10 text-sm rounded-xl border-slate-200 transition-shadow focus-visible:ring-2 focus-visible:ring-slate-200 focus:border-slate-300 ${
                  errors.dateOfBirth ? 'border-red-300' : ''
                }`}
                disabled={isSubmitting}
                max={new Date().toISOString().split('T')[0]}
              />
              <Calendar className='absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none' />
            </div>
            {errors.dateOfBirth && <p className='text-xs text-red-500'>{errors.dateOfBirth}</p>}
          </div>

          {/* Password */}
          <div className='space-y-1.5'>
            <Label htmlFor='password' className='text-xs font-medium text-slate-700'>Password <span className='text-red-400'>*</span></Label>
            <div className='relative'>
              <Input
                id='password'
                type='password'
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder='At least 8 characters...'
                className={`h-10 pl-10 text-sm rounded-xl border-slate-200 transition-shadow focus-visible:ring-2 focus-visible:ring-slate-200 focus:border-slate-300 ${
                  errors.password ? 'border-red-300 focus-visible:ring-red-200' : ''
                }`}
                disabled={isSubmitting}
              />
              <Lock className='absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
            </div>
            {errors.password && <p className='text-xs text-red-500'>{errors.password}</p>}
          </div>

          {/* Form Actions */}
          <div className='flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100'>
            <Button
              type='button'
              variant='outline'
              onClick={handleClose}
              disabled={isSubmitting}
              className='rounded-xl h-10 text-sm font-medium px-5 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors'
            >
              Cancel
            </Button>
            <Button
              type='submit'
              onClick={handleSubmit}
              disabled={isSubmitting}
              className='rounded-xl h-10 text-sm font-medium px-5 text-white transition-all hover:opacity-90 active:scale-[0.98]'
              style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColorDark})` }}
            >
              {isSubmitting ? (
                <div className='flex items-center gap-2'>
                  <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
                  Creating...
                </div>
              ) : (
                <div className='flex items-center gap-1.5'>
                  <Plus className='w-4 h-4' />
                  Create User
                </div>
              )}
            </Button>
          </div>

          {/* Info Card */}
          <div className='rounded-xl border border-slate-200 p-3.5' style={{ backgroundColor: `${brandColor}08` }}>
            <div className='flex items-start gap-2.5'>
              <Users className='w-4 h-4 mt-0.5 shrink-0' style={{ color: brandColor }} />
              <div>
                <h4 className='text-xs font-semibold text-slate-900 mb-0.5'>
                  Creating: {formData.role === 'spa' ? 'Spa Manager' : formData.role.charAt(0).toUpperCase() + formData.role.slice(1)} User
                </h4>
                <p className='text-xs text-slate-500'>
                  {formData.role === 'admin' && 'Admin users can manage locations and spa managers.'}
                  {formData.role === 'spa' && 'Spa managers can manage users and services in their assigned location.'}
                  {selectedLocation && formData.role === 'spa' && (
                    <span className='block mt-0.5 font-medium text-slate-700'>
                      Assigned to: {selectedLocation.name || selectedLocation.locationId}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AddUserForm
