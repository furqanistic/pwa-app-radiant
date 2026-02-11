// File: client/src/components/Management/LocationForm.jsx
// client/src/components/Management/LocationForm.jsx
import { brandingService } from '@/services/brandingService'
import { locationService } from '@/services/locationService'
import { uploadService } from '@/services/uploadService'
import { buildSubdomainUrl, validateSubdomainFormat } from '@/utils/subdomain'
import { resolveImageUrl } from '@/lib/imageHelpers'
import { compressImage, IMAGE_SIZE_LIMIT_BYTES, isUnderSizeLimit } from '@/lib/imageCompression'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { AlertCircle, Clock, ExternalLink, Globe, Image as ImageIcon, Loader2, LocateFixed, MapPin, Palette, Plus, Search, Trash2, Upload } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet"
import { toast } from 'sonner'

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

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

const THEME_COLORS = [
  { name: 'Royal Blue', value: '#1d4ed8' },
  { name: 'Emerald', value: '#15803d' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Red', value: '#b91c1c' },
  { name: 'Yellow', value: '#ca8a04' },
  { name: 'Pink', value: '#be185d' },
  { name: 'Ocean Blue', value: '#1e3a8a' },
  { name: 'Brown', value: '#7c3f00' },
  { name: 'Black', value: '#0b0b0b' },
]

const clampChannel = (value) => Math.max(0, Math.min(255, value))

const hexToRgb = (hex) => {
  if (!hex) return { r: 12, g: 16, b: 32 }
  const cleaned = hex.replace('#', '')
  if (cleaned.length !== 6) return { r: 12, g: 16, b: 32 }
  const num = parseInt(cleaned, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

const adjustHex = (hex, amount) => {
  const { r, g, b } = hexToRgb(hex)
  const rr = clampChannel(r + amount)
  const gg = clampChannel(g + amount)
  const bb = clampChannel(b + amount)
  return `#${rr.toString(16).padStart(2, '0')}${gg
    .toString(16)
    .padStart(2, '0')}${bb.toString(16).padStart(2, '0')}`
}

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const MapPicker = ({ position, setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position ? (
    <Marker
      position={position}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          setPosition(e.target.getLatLng());
        },
      }}
    />
  ) : null;
};

const MapUpdater = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, 13);
    }
  }, [position, map]);
  return null;
};

const LocationForm = ({ isOpen, onClose, onSuccess, initialData = null }) => {
  const [formData, setFormData] = useState({
    locationId: '',
    name: '',
    description: '',
    address: '',
    phone: '',
    reviewLink: '',
    coordinates: {
      latitude: null,
      longitude: null,
    },
    hours: DAYS_OF_WEEK.map((day) => ({
      day,
      open: '09:00',
      close: '17:00',
      isClosed: false,
    })),
    logo: '',
    logoPublicId: '',
    subdomain: '',
    favicon: '',
    faviconPublicId: '',
    themeColor: '#ec4899',
  })

  const [isUploading, setIsUploading] = useState(false)
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false)
  const [subdomainValidation, setSubdomainValidation] = useState({ isValidating: false, error: null, available: null })

  const [position, setPosition] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const queryClient = useQueryClient()

  // Initialize form with initialData if editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        locationId: initialData.locationId || '',
        name: initialData.name || '',
        description: initialData.description || '',
        address: initialData.address || '',
        phone: initialData.phone || '',
        reviewLink: initialData.reviewLink || '',
        hours: initialData.hours?.length
          ? initialData.hours
          : DAYS_OF_WEEK.map((day) => ({
              day,
              open: '09:00',
              close: '17:00',
              isClosed: false,
            })),
        coordinates: initialData.coordinates || { latitude: null, longitude: null },
        logo: initialData.logo || '',
        logoPublicId: initialData.logoPublicId || '',
        subdomain: initialData.subdomain || '',
        favicon: initialData.favicon || '',
        faviconPublicId: initialData.faviconPublicId || '',
        themeColor: initialData.themeColor || '#ec4899',
      })
      if (initialData.coordinates?.latitude && initialData.coordinates?.longitude) {
        setPosition({ lat: initialData.coordinates.latitude, lng: initialData.coordinates.longitude });
      } else {
        setPosition(null);
      }
    } else {
      resetForm()
    }
  }, [initialData, isOpen])

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
      toast.error(error.response?.data?.message || 'Failed to create location')
    },
  })

  const updateLocationMutation = useMutation({
    mutationFn: ({ id, data }) => locationService.updateLocation(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['locations'])
      onSuccess?.(data)
      onClose()
      resetForm()
    },
    onError: (error) => {
      console.error('Update location error:', error)
      toast.error(error.response?.data?.message || 'Failed to update location')
    },
  })

  const resetForm = () => {
    setFormData({
      locationId: '',
      name: '',
      description: '',
      address: '',
      phone: '',
      reviewLink: '',
      hours: DAYS_OF_WEEK.map((day) => ({
        day,
        open: '09:00',
        close: '17:00',
        isClosed: false,
      })),
      coordinates: { latitude: null, longitude: null },
      logo: '',
      logoPublicId: '',
      subdomain: '',
      favicon: '',
      faviconPublicId: '',
      themeColor: '#ec4899',
    })
    setPosition(null);
    setSearchTerm("");
  }


  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleHourChange = (index, field, value) => {
    const newHours = [...formData.hours]
    newHours[index] = { ...newHours[index], [field]: value }
    setFormData((prev) => ({ ...prev, hours: newHours }))
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setIsUploading(true)
    try {
      if (file.size > IMAGE_SIZE_LIMIT_BYTES) {
        toast.info('Image is large, compressing...')
      }
      const compressed = await compressImage(file)
      if (!isUnderSizeLimit(compressed)) {
        toast.error('Logo image must be less than 1MB')
        return
      }
      if (formData.logoPublicId || formData.logo) {
        await uploadService.deleteImage({
          url: formData.logo,
          publicId: formData.logoPublicId,
        }).catch(console.error)
      }
      const resp = await uploadService.uploadImage(compressed)
      if (resp.success) {
        setFormData((prev) => ({
          ...prev,
          logo: resp.url,
          logoPublicId: resp.publicId || '',
        }))
        toast.success('Logo uploaded successfully')
      }
    } catch (err) {
      console.error('Logo upload error:', err)
      toast.error('Failed to upload logo')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveLogo = async () => {
    if (!formData.logo) return
    if (formData.logoPublicId || formData.logo) {
      await uploadService.deleteImage({
        url: formData.logo,
        publicId: formData.logoPublicId,
      }).catch(console.error)
    }
    setFormData((prev) => ({ ...prev, logo: '', logoPublicId: '' }))
  }

  const handleFaviconUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setIsUploadingFavicon(true)
    try {
      if (file.size > IMAGE_SIZE_LIMIT_BYTES) {
        toast.info('Image is large, compressing...')
      }
      const compressed = await compressImage(file)
      if (!isUnderSizeLimit(compressed)) {
        toast.error('Favicon image must be less than 1MB')
        return
      }
      if (formData.faviconPublicId || formData.favicon) {
        await uploadService.deleteImage({
          url: formData.favicon,
          publicId: formData.faviconPublicId,
        }).catch(console.error)
      }
      const resp = await uploadService.uploadImage(compressed)
      if (resp.success) {
        setFormData((prev) => ({
          ...prev,
          favicon: resp.url,
          faviconPublicId: resp.publicId || '',
        }))
        toast.success('Favicon uploaded successfully')
      }
    } catch (err) {
      console.error('Favicon upload error:', err)
      toast.error('Failed to upload favicon')
    } finally {
      setIsUploadingFavicon(false)
    }
  }

  const handleRemoveFavicon = async () => {
    if (!formData.favicon) return
    if (formData.faviconPublicId || formData.favicon) {
      await uploadService.deleteImage({
        url: formData.favicon,
        publicId: formData.faviconPublicId,
      }).catch(console.error)
    }
    setFormData((prev) => ({ ...prev, favicon: '', faviconPublicId: '' }))
  }

  const handleSubdomainChange = async (e) => {
    const value = e.target.value.toLowerCase()
    setFormData((prev) => ({ ...prev, subdomain: value }))

    // Clear previous validation
    setSubdomainValidation({ isValidating: false, error: null, available: null })

    if (!value) return

    // Client-side validation
    const formatValidation = validateSubdomainFormat(value)
    if (!formatValidation.valid) {
      setSubdomainValidation({ isValidating: false, error: formatValidation.error, available: false })
      return
    }

    // Server-side validation (debounced)
    setSubdomainValidation({ isValidating: true, error: null, available: null })
    
    try {
      const result = await brandingService.validateSubdomain(value, initialData?.locationId)
      setSubdomainValidation({ 
        isValidating: false, 
        error: null, 
        available: result.success 
      })
    } catch (err) {
      setSubdomainValidation({ 
        isValidating: false, 
        error: err.response?.data?.message || 'Validation failed', 
        available: false 
      })
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!formData.locationId) {
      toast.error('Location ID is required')
      return
    }

    if (!formData.name.trim()) {
      toast.error('Please enter a location name')
      return
    }

    // Prepare data for API
    const locationData = {
      locationId: formData.locationId,
      name: formData.name.trim(),
      description: formData.description.trim(),
      address: formData.address.trim(),
      phone: formData.phone.trim(),
      reviewLink: formData.reviewLink.trim(),
      hours: formData.hours,
      coordinates: position ? { latitude: position.lat, longitude: position.lng } : formData.coordinates,
      logo: formData.logo,
      logoPublicId: formData.logoPublicId,
      subdomain: formData.subdomain || null,
      favicon: formData.favicon || null,
      faviconPublicId: formData.faviconPublicId || null,
      themeColor: formData.themeColor || '#ec4899',
    }

    if (initialData?._id) {
      updateLocationMutation.mutate({ id: initialData._id, data: locationData })
    } else {
      createLocationMutation.mutate(locationData)
    }
  }

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchTerm)}`);
      const data = await resp.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setPosition({ lat: parseFloat(lat), lng: parseFloat(lon) });
        toast.success(`Found: ${data[0].display_name}`);
      } else {
        toast.error("Location not found.");
      }
    } catch (e) {
      toast.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) return toast.error("GPS not supported");
    setIsSearching(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSearchTerm("");
        toast.success("GPS Location found!");
        setIsSearching(false);
      },
      () => {
        toast.error("Could not get GPS location");
        setIsSearching(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const isPending =
    createLocationMutation.isPending || updateLocationMutation.isPending

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-2xl font-bold'>
            <MapPin className='w-6 h-6 text-pink-500' />
            {initialData ? 'Edit Location' : 'Create New Location'}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? 'Update details for this spa location'
              : 'Add a new spa location to the system using the account detail URL'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-8'>
          <div className='bg-gray-50 p-4 rounded-2xl space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='locationId' className='text-sm font-semibold text-gray-700'>
                Location ID *
              </Label>
              <Input
                id='locationId'
                name='locationId'
                value={formData.locationId}
                onChange={handleInputChange}
                placeholder='e.g., j3BAQnPNZywbuAE3QCCh'
                required
                className='bg-white rounded-xl'
              />
              <p className='text-xs text-gray-400 font-medium'>
                Enter the internal unique identifier for this clinic.
              </p>
            </div>
            
            {/* Logo Upload */}
            <div className='space-y-4 pt-2 border-t border-gray-100'>
              <Label className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
                <ImageIcon className='w-4 h-4 text-pink-500' />
                Location Logo
              </Label>
              <div className='flex items-center gap-4'>
                <div className='relative w-24 h-24 bg-white border border-gray-200 rounded-2xl overflow-hidden flex items-center justify-center shadow-sm group'>
                  {formData.logo ? (
                    <>
                      <img
                        src={resolveImageUrl(formData.logo, formData.logo, { width: 192, height: 192 })}
                        alt='Logo'
                        className='w-full h-full object-cover'
                        loading='lazy'
                        decoding='async'
                      />
                      <button
                        type='button'
                        onClick={handleRemoveLogo}
                        className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white'
                      >
                        <Trash2 className='w-6 h-6' />
                      </button>
                    </>
                  ) : (
                    <ImageIcon className='w-8 h-8 text-gray-300' />
                  )}
                  {isUploading && (
                    <div className='absolute inset-0 bg-white/80 flex items-center justify-center'>
                      <Loader2 className='w-6 h-6 animate-spin text-pink-500' />
                    </div>
                  )}
                </div>
                <div className='flex-1'>
                  <p className='text-xs text-gray-500 mb-2'>
                    Upload a high-quality logo for this spa. It will be used as the PWA icon for users. Keep it under 1MB for faster loading.
                  </p>
                  <div className='flex gap-2'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => document.getElementById('logo-upload').click()}
                      disabled={isUploading}
                      className='rounded-xl border-pink-100 text-pink-600 hover:bg-pink-50'
                    >
                      <Upload className='w-4 h-4 mr-2' />
                      {formData.logo ? 'Change' : 'Upload'}
                    </Button>
                    <input
                      id='logo-upload'
                      type='file'
                      accept='image/*'
                      className='hidden'
                      onChange={handleLogoUpload}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Subdomain Field */}
            <div className='space-y-4 pt-2 border-t border-gray-100'>
              <Label className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
                <Globe className='w-4 h-4 text-pink-500' />
                Custom Subdomain (Optional)
              </Label>
              <div className='space-y-2'>
                <div className='relative'>
                  <Input
                    id='subdomain'
                    name='subdomain'
                    value={formData.subdomain}
                    onChange={handleSubdomainChange}
                    placeholder='e.g., spark'
                    className={`bg-white rounded-xl pr-10 ${
                      subdomainValidation.error
                        ? 'border-red-300'
                        : subdomainValidation.available
                        ? 'border-green-300'
                        : ''
                    }`}
                  />
                  {subdomainValidation.isValidating && (
                    <Loader2 className='absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400' />
                  )}
                  {subdomainValidation.available && (
                    <span className='absolute right-3 top-1/2 -translate-y-1/2 text-green-500 text-xl'>✓</span>
                  )}
                </div>
                {subdomainValidation.error && (
                  <p className='text-xs text-red-500 flex items-center gap-1'>
                    <AlertCircle className='w-3 h-3' />
                    {subdomainValidation.error}
                  </p>
                )}
                {formData.subdomain && !subdomainValidation.error && (
                  <p className='text-xs text-blue-600 flex items-center gap-1'>
                    <ExternalLink className='w-3 h-3' />
                    Preview: {buildSubdomainUrl(formData.subdomain)}
                  </p>
                )}
                <p className='text-xs text-gray-400 font-medium'>
                  Create a custom subdomain for this spa (e.g., spark.cxrsystems.com). Leave blank to skip.
                </p>
              </div>
            </div>

            {/* Favicon Upload */}
            <div className='space-y-4 pt-2 border-t border-gray-100'>
              <Label className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
                <ImageIcon className='w-4 h-4 text-pink-500' />
                Custom Favicon (Optional)
              </Label>
              <div className='flex items-center gap-4'>
                <div className='relative w-16 h-16 bg-white border border-gray-200 rounded-xl overflow-hidden flex items-center justify-center shadow-sm group'>
                  {formData.favicon ? (
                    <>
                      <img
                        src={resolveImageUrl(formData.favicon, formData.favicon, { width: 128, height: 128 })}
                        alt='Favicon'
                        className='w-full h-full object-cover'
                        loading='lazy'
                        decoding='async'
                      />
                      <button
                        type='button'
                        onClick={handleRemoveFavicon}
                        className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white'
                      >
                        <Trash2 className='w-4 h-4' />
                      </button>
                    </>
                  ) : (
                    <ImageIcon className='w-6 h-6 text-gray-300' />
                  )}
                  {isUploadingFavicon && (
                    <div className='absolute inset-0 bg-white/80 flex items-center justify-center'>
                      <Loader2 className='w-4 h-4 animate-spin text-pink-500' />
                    </div>
                  )}
                </div>
                <div className='flex-1'>
                  <p className='text-xs text-gray-500 mb-2'>
                    Upload a favicon (square, 192x192px recommended). Keep it under 1MB for faster loading. Falls back to logo if not provided.
                  </p>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => document.getElementById('favicon-upload').click()}
                    disabled={isUploadingFavicon}
                    className='rounded-xl border-pink-100 text-pink-600 hover:bg-pink-50'
                  >
                    <Upload className='w-4 h-4 mr-2' />
                    {formData.favicon ? 'Change' : 'Upload'}
                  </Button>
                  <input
                    id='favicon-upload'
                    type='file'
                    accept='image/*'
                    className='hidden'
                    onChange={handleFaviconUpload}
                  />
                </div>
              </div>
            </div>

            {/* Theme Color */}
            <div className='space-y-4 pt-2 border-t border-gray-100'>
              <Label className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
                <Palette className='w-4 h-4 text-pink-500' />
                Theme Color
              </Label>
              <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
                {THEME_COLORS.map((color) => {
                  const isSelected = formData.themeColor === color.value
                  const gradientEnd = adjustHex(color.value, -22)
                  return (
                    <button
                      key={color.value}
                      type='button'
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, themeColor: color.value }))
                      }
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition-all ${
                        isSelected
                          ? 'border-gray-900 bg-gray-50 text-gray-900'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span
                        className='w-7 h-5 rounded-full border border-gray-200'
                        style={{
                          background: `linear-gradient(135deg, ${color.value}, ${gradientEnd})`,
                        }}
                      />
                      {color.name}
                    </button>
                  )
                })}
              </div>
              <div className='rounded-2xl border border-gray-200 overflow-hidden'>
                <div
                  className='px-4 py-3 text-white font-semibold text-sm'
                  style={{
                    background: `linear-gradient(135deg, ${formData.themeColor}, ${adjustHex(formData.themeColor, -22)})`,
                  }}
                >
                  Preview: App header style
                </div>
                <div className='p-4 bg-white'>
                  <div className='flex items-center gap-3'>
                    <div
                      className='w-10 h-10 rounded-xl'
                      style={{
                        background: `linear-gradient(135deg, ${formData.themeColor}, ${adjustHex(formData.themeColor, -22)})`,
                      }}
                    />
                    <div>
                      <div className='text-sm font-semibold text-gray-900'>Your Brand</div>
                      <div className='text-xs text-gray-500'>Dark gradient preview</div>
                    </div>
                  </div>
                </div>
              </div>
              <p className='text-xs text-gray-400 font-medium'>
                Choose a dark theme color. The gradient preview shows how it will look in the app.
              </p>
            </div>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {/* Location Name */}
            <div className='space-y-2'>
              <Label htmlFor='name' className='text-sm font-semibold text-gray-700'>
                Location Name *
              </Label>
              <Input
                id='name'
                name='name'
                value={formData.name}
                onChange={handleInputChange}
                placeholder='e.g., Avous Med Spa & Wellness'
                required
                className='rounded-xl'
              />
            </div>

            {/* Phone */}
            <div className='space-y-2'>
              <Label
                htmlFor='phone'
                className='text-sm font-semibold text-gray-700'
              >
                Phone Number
              </Label>
              <Input
                id='phone'
                name='phone'
                type='tel'
                value={formData.phone}
                onChange={handleInputChange}
                placeholder='e.g., (555) 123-4567'
                className='rounded-xl'
              />
            </div>
          </div>

          {/* Address */}
          <div className='space-y-2'>
            <Label htmlFor='address' className='text-sm font-semibold text-gray-700'>
              Street Address
            </Label>
            <Input
              id='address'
              name='address'
              value={formData.address}
              onChange={handleInputChange}
              placeholder='e.g., 10501 6 Mile Cypress Parkway Suite 110'
              className='rounded-xl'
            />
          </div>

          {/* Review Link */}
          <div className='space-y-2'>
            <Label htmlFor='reviewLink' className='text-sm font-semibold text-gray-700'>
              Review Link (Google, Yelp, etc.)
            </Label>
            <Input
              id='reviewLink'
              name='reviewLink'
              type='url'
              value={formData.reviewLink}
              onChange={handleInputChange}
              placeholder='https://g.page/your-spa/review'
              className='rounded-xl'
            />
            <p className='text-xs text-gray-400 font-medium'>
              This link is used for the "Leave Review" action on the user dashboard.
            </p>
          </div>

          {/* Map Section */}
          <div className='space-y-4 pt-2'>
            <div className='flex items-center gap-2 border-b pb-2'>
              <MapPin className='w-5 h-5 text-pink-500' />
              <h3 className='text-lg font-bold text-gray-900'>Map Location</h3>
            </div>

            <div className='flex gap-2'>
                <div className='relative flex-1'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
                    <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
                        placeholder='Search address for map...'
                        className='pl-10 rounded-xl'
                    />
                </div>
                <Button 
                    type='button' 
                    variant='outline'
                    onClick={handleGetLocation}
                    disabled={isSearching}
                    className='rounded-xl px-3 border-pink-100 text-pink-500 hover:bg-pink-50'
                >
                    <LocateFixed className={`w-4 h-4 ${isSearching ? 'animate-pulse' : ''}`} />
                </Button>
                <Button 
                    type='button' 
                    onClick={handleSearch}
                    disabled={isSearching}
                    className='bg-gray-900 text-white rounded-xl'
                >
                    {isSearching ? '...' : 'Find'}
                </Button>
            </div>

            <div className='h-64 rounded-2xl overflow-hidden border-2 border-gray-100 shadow-inner relative z-0'>
                <MapContainer
                    center={[51.505, -0.09]}
                    zoom={13}
                    style={{ height: "100%", width: "100%" }}
                >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapPicker position={position} setPosition={setPosition} />
                    <MapUpdater position={position} />
                </MapContainer>
            </div>
            <p className='text-[10px] text-center text-gray-400 font-medium'>
                Click on the map or drag the pin to set precise location
            </p>
          </div>

          {/* Business Hours Section */}
          <div className='space-y-4'>
            <div className='flex items-center gap-2 border-b pb-2'>
              <Clock className='w-5 h-5 text-pink-500' />
              <h3 className='text-lg font-bold text-gray-900'>Business Hours</h3>
            </div>

            <div className='space-y-3'>
              {formData.hours.map((hour, index) => (
                <div
                  key={hour.day}
                  className='grid grid-cols-12 gap-3 items-center bg-gray-50/50 p-2 rounded-xl transition-all hover:bg-gray-50'
                >
                  <div className='col-span-3'>
                    <span className='text-sm font-bold text-gray-700'>
                      {hour.day}
                    </span>
                  </div>
                  <div className='col-span-4'>
                    <Input
                      type='time'
                      value={hour.open}
                      disabled={hour.isClosed}
                      onChange={(e) =>
                        handleHourChange(index, 'open', e.target.value)
                      }
                      className='bg-white rounded-lg h-9 text-xs'
                    />
                  </div>
                  <div className='col-span-4'>
                    <Input
                      type='time'
                      value={hour.close}
                      disabled={hour.isClosed}
                      onChange={(e) =>
                        handleHourChange(index, 'close', e.target.value)
                      }
                      className='bg-white rounded-lg h-9 text-xs'
                    />
                  </div>
                  <div className='col-span-1 flex justify-end'>
                    <input
                      type='checkbox'
                      id={`closed-${hour.day}`}
                      checked={hour.isClosed}
                      onChange={(e) =>
                        handleHourChange(index, 'isClosed', e.target.checked)
                      }
                      className='w-4 h-4 rounded text-pink-500 focus:ring-pink-500 cursor-pointer'
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className='space-y-2'>
            <Label
              htmlFor='description'
              className='text-sm font-semibold text-gray-700'
            >
              Notes / Description
            </Label>
            <Textarea
              id='description'
              name='description'
              value={formData.description}
              onChange={handleInputChange}
              placeholder='Optional description or additional info...'
              rows={3}
              className='rounded-2xl resize-none'
            />
          </div>

          {/* Action Buttons */}
          <div className='flex gap-4 pt-4'>
            <Button
              type='button'
              variant='outline'
              onClick={onClose}
              className='flex-1 rounded-xl h-12 font-bold'
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type='submit'
              className='flex-1 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white rounded-xl h-12 font-bold shadow-lg shadow-pink-200'
              disabled={isPending || !formData.locationId || !formData.name.trim()}
            >
              {isPending ? (
                <>
                  <Loader2 className='w-5 h-5 mr-2 animate-spin' />
                  Saving...
                </>
              ) : (
                <>
                  {initialData ? 'Update Location' : 'Create Location'}
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
