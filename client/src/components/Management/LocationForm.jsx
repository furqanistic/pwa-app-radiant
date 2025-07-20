// client/src/components/Management/LocationForm.jsx
import { locationService } from '@/services/locationService'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ExternalLink, Loader2, MapPin, Plus } from 'lucide-react'
import React, { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const LocationForm = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    url: '',
    locationId: '',
    name: '',
    description: '',
    address: '',
    phone: '',
  })
  const [urlError, setUrlError] = useState('')

  const queryClient = useQueryClient()

  const createLocationMutation = useMutation({
    mutationFn: locationService.createLocation,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['locations'])
      onSuccess?.(data)
      onClose()
      resetForm()
    },
    onError: (error) => {
      console.error('Create location error:', error)
      alert(error.response?.data?.message || 'Failed to create location')
    },
  })

  const resetForm = () => {
    setFormData({
      url: '',
      locationId: '',
      name: '',
      description: '',
      address: '',
      phone: '',
    })
    setUrlError('')
  }

  const extractLocationId = (url) => {
    try {
      // Remove any trailing slashes and whitespace
      const cleanUrl = url.trim().replace(/\/$/, '')

      // Pattern to match the expected URL format
      const pattern =
        /https:\/\/ai\.radiantmdconsulting\.com\/accounts\/detail\/([a-zA-Z0-9_-]+)/
      const match = cleanUrl.match(pattern)

      if (match && match[1]) {
        return match[1]
      }

      // Alternative: try to extract the last part of the URL path
      const urlParts = cleanUrl.split('/')
      const lastPart = urlParts[urlParts.length - 1]

      if (lastPart && lastPart.length > 10) {
        // Basic validation for GHL location ID
        return lastPart
      }

      return null
    } catch (error) {
      console.error('Error extracting location ID:', error)
      return null
    }
  }

  const handleUrlChange = (e) => {
    const url = e.target.value
    setFormData((prev) => ({ ...prev, url }))
    setUrlError('')

    if (url.trim()) {
      const extractedId = extractLocationId(url)
      if (extractedId) {
        setFormData((prev) => ({ ...prev, locationId: extractedId }))
        setUrlError('')
      } else {
        setFormData((prev) => ({ ...prev, locationId: '' }))
        setUrlError(
          'Invalid URL format. Please use: https://ai.radiantmdconsulting.com/accounts/detail/LOCATION_ID'
        )
      }
    } else {
      setFormData((prev) => ({ ...prev, locationId: '' }))
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!formData.locationId) {
      setUrlError('Please enter a valid URL to extract the location ID')
      return
    }

    if (!formData.name.trim()) {
      alert('Please enter a location name')
      return
    }

    // Prepare data for API
    const locationData = {
      locationId: formData.locationId,
      name: formData.name.trim(),
      description: formData.description.trim(),
      address: formData.address.trim(),
      phone: formData.phone.trim(),
    }

    createLocationMutation.mutate(locationData)
  }

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      resetForm()
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-lg max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <MapPin className='w-5 h-5 text-blue-500' />
            Create New Location
          </DialogTitle>
          <DialogDescription>
            Add a new spa location to the system using the account detail URL
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-6'>
          {/* URL Input */}
          <div className='space-y-2'>
            <Label htmlFor='url' className='text-sm font-medium'>
              Location URL *
            </Label>
            <div className='space-y-2'>
              <Input
                id='url'
                name='url'
                type='url'
                value={formData.url}
                onChange={handleUrlChange}
                placeholder='https://ai.radiantmdconsulting.com/accounts/detail/j3BAQnPNZywbuAE3QCCh'
                className={urlError ? 'border-red-500 focus:ring-red-500' : ''}
              />
              {urlError && (
                <div className='flex items-center gap-2 text-red-600 text-sm'>
                  <AlertCircle className='w-4 h-4' />
                  <span>{urlError}</span>
                </div>
              )}
              <p className='text-xs text-gray-500'>
                Paste the full URL from the account detail page
              </p>
            </div>
          </div>

          {/* Extracted Location ID Display */}
          {formData.locationId && (
            <div className='p-3 bg-green-50 border border-green-200 rounded-lg'>
              <div className='flex items-center gap-2 text-green-700'>
                <ExternalLink className='w-4 h-4' />
                <span className='text-sm font-medium'>
                  Location ID Extracted:
                </span>
              </div>
              <p className='text-green-800 font-mono text-sm mt-1'>
                {formData.locationId}
              </p>
            </div>
          )}

          {/* Location Name */}
          <div className='space-y-2'>
            <Label htmlFor='name' className='text-sm font-medium'>
              Location Name *
            </Label>
            <Input
              id='name'
              name='name'
              value={formData.name}
              onChange={handleInputChange}
              placeholder='e.g., Avous Med Spa & Wellness'
              required
            />
          </div>

          {/* Address */}
          <div className='space-y-2'>
            <Label htmlFor='address' className='text-sm font-medium'>
              Street Address
            </Label>
            <Input
              id='address'
              name='address'
              value={formData.address}
              onChange={handleInputChange}
              placeholder='e.g., 10501 6 Mile Cypress Parkway Suite 110'
            />
          </div>

          {/* Phone */}
          <div className='space-y-2'>
            <Label htmlFor='phone' className='text-sm font-medium'>
              Phone Number
            </Label>
            <Input
              id='phone'
              name='phone'
              type='tel'
              value={formData.phone}
              onChange={handleInputChange}
              placeholder='e.g., (555) 123-4567'
            />
          </div>

          {/* Description */}
          <div className='space-y-2'>
            <Label htmlFor='description' className='text-sm font-medium'>
              Notes
            </Label>
            <Textarea
              id='description'
              name='description'
              value={formData.description}
              onChange={handleInputChange}
              placeholder='Optional description of the location...'
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className='flex gap-3 pt-4'>
            <Button
              type='button'
              variant='outline'
              onClick={onClose}
              className='flex-1'
              disabled={createLocationMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type='submit'
              className='flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
              disabled={
                createLocationMutation.isPending ||
                !formData.locationId ||
                !formData.name.trim()
              }
            >
              {createLocationMutation.isPending ? (
                <>
                  <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className='w-4 h-4 mr-2' />
                  Create Location
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default LocationForm
