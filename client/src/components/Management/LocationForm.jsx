// File: client/src/components/Management/LocationForm.jsx
// client/src/components/Management/LocationForm.jsx
import { brandingService } from '@/services/brandingService'
import { useBranding } from '@/context/BrandingContext'
import { locationService } from '@/services/locationService'
import { uploadService } from '@/services/uploadService'
import { buildSubdomainUrl, validateSubdomainFormat } from '@/utils/subdomain'
import { resolveBrandingFaviconUrl, resolveBrandingLogoUrl } from '@/lib/imageHelpers'
import { compressImage, IMAGE_SIZE_LIMIT_BYTES, isUnderSizeLimit } from '@/lib/imageCompression'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { AlertCircle, Clock, ExternalLink, Globe, Image as ImageIcon, Loader2, LocateFixed, MapPin, Palette, Plus, Search, Trash2, Upload, X } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import Cropper from 'react-easy-crop'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet"
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
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

const getDialogSheetClasses =
  'p-0 overflow-hidden flex flex-col max-h-[100dvh] sm:max-h-[90vh] !w-screen max-w-none sm:!w-full sm:max-w-4xl rounded-t-[2.5rem] sm:rounded-[2rem] fixed !left-0 !right-0 !bottom-0 !top-auto !translate-x-0 !translate-y-0 sm:!top-1/2 sm:!left-1/2 sm:!right-auto sm:!bottom-auto sm:!-translate-x-1/2 sm:!-translate-y-1/2 border-0 shadow-2xl bg-white'

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

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.src = url
  })

const getCroppedImage = async (imageSrc, pixelCrop) => {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  const ctx = canvas.getContext('2d')

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png')
  })
}

const LocationForm = ({ isOpen, onClose, onSuccess, initialData = null }) => {
  const { branding } = useBranding()
  const brandColor = branding?.themeColor || '#ec4899'
  const brandColorDark = adjustHex(brandColor, -24)
  const [formData, setFormData] = useState({
    locationId: '',
    name: '',
    subtitle: '',
    description: '',
    address: '',
    phone: '',
    reviewLink: '',
    ghlApiKey: '',
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

  const [cropperState, setCropperState] = useState({
    isOpen: false,
    src: '',
    type: null,
    fileName: '',
  })
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)

  const queryClient = useQueryClient()

  const extractLocationFromResponse = (payload) => {
    if (!payload || typeof payload !== 'object') return null
    return (
      payload.location ||
      payload.data?.location ||
      payload.data ||
      null
    )
  }

  const syncLocationsCache = (payload, mode = 'update') => {
    const location = extractLocationFromResponse(payload)
    if (!location?._id && !location?.locationId) return

    queryClient.setQueryData(['locations'], (previous) => {
      const existing = previous?.data?.locations || []
      const matchIndex = existing.findIndex(
        (item) =>
          item?._id === location._id ||
          item?.locationId === location.locationId
      )

      let nextLocations = existing
      if (matchIndex >= 0) {
        nextLocations = [...existing]
        nextLocations[matchIndex] = { ...nextLocations[matchIndex], ...location }
      } else if (mode === 'create') {
        nextLocations = [location, ...existing]
      }

      return {
        ...(previous || {}),
        data: {
          ...(previous?.data || {}),
          locations: nextLocations,
        },
      }
    })
  }

  // Initialize form with initialData if editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        locationId: initialData.locationId || '',
        name: initialData.name || '',
        subtitle: initialData.subtitle || '',
        description: initialData.description || '',
        address: initialData.address || '',
        phone: initialData.phone || '',
        reviewLink: initialData.reviewLink || '',
        ghlApiKey: initialData.ghlApiKey || '',
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
    onMutate: () => {
      const toastId = toast.loading('Creating location...')
      return { toastId }
    },
    onSuccess: (data) => {
      syncLocationsCache(data, 'create')
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      queryClient.refetchQueries({ queryKey: ['locations'], type: 'active' })
      onClose()
      onSuccess?.(data)
      resetForm()
    },
    onError: (error, _variables, context) => {
      console.error('Create location error:', error)
      toast.error(error.response?.data?.message || 'Failed to create location', {
        id: context?.toastId,
      })
    },
    onSettled: (_data, error, _variables, context) => {
      if (!error && context?.toastId) toast.dismiss(context.toastId)
    },
  })

  const updateLocationMutation = useMutation({
    mutationFn: ({ id, data }) => locationService.updateLocation(id, data),
    onMutate: () => {
      const toastId = toast.loading('Updating location...')
      return { toastId }
    },
    onSuccess: (data) => {
      syncLocationsCache(data, 'update')
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      queryClient.refetchQueries({ queryKey: ['locations'], type: 'active' })
      onClose()
      onSuccess?.(data)
      resetForm()
    },
    onError: (error, _variables, context) => {
      console.error('Update location error:', error)
      toast.error(error.response?.data?.message || 'Failed to update location', {
        id: context?.toastId,
      })
    },
    onSettled: (_data, error, _variables, context) => {
      if (!error && context?.toastId) toast.dismiss(context.toastId)
    },
  })

  const resetForm = () => {
    setFormData({
      locationId: '',
      name: '',
      subtitle: '',
      description: '',
      address: '',
      phone: '',
      reviewLink: '',
      ghlApiKey: '',
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

  const setUploadingForType = (type, value) => {
    if (type === 'logo') {
      setIsUploading(value)
    } else {
      setIsUploadingFavicon(value)
    }
  }

  const getImageFields = (type) => {
    if (type === 'logo') {
      return {
        url: formData.logo,
        publicId: formData.logoPublicId,
        update: (url, publicId) =>
          setFormData((prev) => ({ ...prev, logo: url, logoPublicId: publicId || '' })),
      }
    }
    return {
      url: formData.favicon,
      publicId: formData.faviconPublicId,
      update: (url, publicId) =>
        setFormData((prev) => ({ ...prev, favicon: url, faviconPublicId: publicId || '' })),
    }
  }

  const openCropper = (file, type) => {
    const reader = new FileReader()
    reader.onload = () => {
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setCroppedAreaPixels(null)
      setCropperState({
        isOpen: true,
        src: reader.result,
        type,
        fileName: file.name || `${type}.png`,
      })
    }
    reader.readAsDataURL(file)
  }

  const uploadImageForType = async (fileOrBlob, type) => {
    setUploadingForType(type, true)
    try {
      if (fileOrBlob.size > IMAGE_SIZE_LIMIT_BYTES) {
        toast.info('Image is large, compressing...')
      }
      const compressed = await compressImage(fileOrBlob)
      if (!isUnderSizeLimit(compressed)) {
        toast.error(`${type === 'logo' ? 'Logo' : 'Favicon'} image must be less than 1MB`)
        return
      }
      const { url, publicId, update } = getImageFields(type)
      if (publicId || url) {
        await uploadService
          .deleteImage({
            url,
            publicId,
          })
          .catch(console.error)
      }
      const resp = await uploadService.uploadImage(compressed)
      if (resp.success) {
        update(resp.url, resp.publicId)
        toast.success(`${type === 'logo' ? 'Logo' : 'Favicon'} uploaded successfully`)
      }
    } catch (err) {
      console.error(`${type} upload error:`, err)
      toast.error(`Failed to upload ${type === 'logo' ? 'logo' : 'favicon'}`)
    } finally {
      setUploadingForType(type, false)
    }
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
    openCropper(file, 'logo')
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
    openCropper(file, 'favicon')
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

  const handleCropConfirm = async () => {
    if (!cropperState.src || !croppedAreaPixels || !cropperState.type) return
    const croppedBlob = await getCroppedImage(cropperState.src, croppedAreaPixels)
    if (!croppedBlob) {
      toast.error('Failed to crop image')
      return
    }
    const file = new File([croppedBlob], cropperState.fileName || `${cropperState.type}.png`, {
      type: croppedBlob.type || 'image/png',
    })
    setCropperState({ isOpen: false, src: '', type: null, fileName: '' })
    await uploadImageForType(file, cropperState.type)
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
      subtitle: formData.subtitle.trim(),
      description: formData.description.trim(),
      address: formData.address.trim(),
      phone: formData.phone.trim(),
      reviewLink: formData.reviewLink.trim(),
      ghlApiKey: formData.ghlApiKey.trim(),
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
    } catch (error) {
      console.error("Search failed:", error)
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

  const sectionAccent = (label) => (
    <div className='flex items-center gap-2.5 mb-4'>
      <div className='w-0.5 h-4 rounded-full shrink-0' style={{ background: brandColor }} />
      <h2 className='text-xs font-semibold text-slate-800 uppercase tracking-wider'>{label}</h2>
    </div>
  )

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className={getDialogSheetClasses}>
        {/* Mobile drag handle */}
        <div className='w-10 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0' />

        {/* Brand accent bar */}
        <div className='h-0.5 w-full shrink-0' style={{ background: brandColor }} />

        {/* Header */}
        <div className='flex items-start justify-between px-6 pt-5 pb-4 shrink-0'>
          <div>
            <DialogTitle className='text-lg font-semibold text-slate-900 tracking-tight'>
              {initialData ? 'Edit location' : 'New location'}
            </DialogTitle>
            <p className='text-sm text-slate-500 mt-0.5'>
              {initialData
                ? 'Update the details for this spa location'
                : 'Add a new spa location to the platform'}
            </p>
          </div>
          <button
            onClick={onClose}
            className='p-2 rounded-xl hover:bg-slate-100 active:bg-slate-200 transition-colors'
            type='button'
          >
            <X className='w-4 h-4 text-slate-400' />
          </button>
        </div>

        <div className='border-t border-slate-100 mx-6' />

        <form onSubmit={handleSubmit} className='flex flex-1 min-h-0 flex-col'>
          {/* Loading state */}
          {isPending && (
            <div className='mx-6 mt-4 rounded-xl border border-blue-100 bg-blue-50/80 px-4 py-3'>
              <div className='flex items-center gap-2.5 text-sm font-medium text-blue-700'>
                <Loader2 className='h-4 w-4 animate-spin' />
                {initialData ? 'Updating location...' : 'Creating location...'}
              </div>
              <div className='mt-2.5 h-1 w-full overflow-hidden rounded-full bg-blue-100'>
                <div className='h-full w-1/2 animate-pulse rounded-full bg-blue-500' />
              </div>
            </div>
          )}

          {/* Scrollable content */}
          <div className='flex-1 overflow-y-auto px-6 py-5 space-y-7'>

            {/* ===== Basic Information ===== */}
            <section>
              {sectionAccent('Basic Information')}
              <div className='space-y-4'>
                <div className='space-y-1.5'>
                  <Label htmlFor='locationId' className='text-xs font-medium text-slate-700'>
                    Location ID <span className='text-red-400'>*</span>
                  </Label>
                  <Input
                    id='locationId'
                    name='locationId'
                    value={formData.locationId}
                    onChange={handleInputChange}
                    placeholder='e.g., j3BAQnPNZywbuAE3QCCh'
                    required
                    className='h-10 text-sm rounded-xl border-slate-200 focus:border-slate-300 focus:ring-0 focus-visible:ring-2 focus-visible:ring-slate-200 transition-shadow'
                  />
                  <p className='text-xs text-slate-400'>Internal unique identifier for this clinic.</p>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                  <div className='space-y-1.5'>
                    <Label htmlFor='name' className='text-xs font-medium text-slate-700'>
                      Location Name <span className='text-red-400'>*</span>
                    </Label>
                    <Input
                      id='name'
                      name='name'
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder='e.g., Avous Med Spa'
                      required
                      className='h-10 text-sm rounded-xl border-slate-200 focus:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-200 transition-shadow'
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <Label htmlFor='subtitle' className='text-xs font-medium text-slate-700'>
                      Tagline
                    </Label>
                    <Input
                      id='subtitle'
                      name='subtitle'
                      value={formData.subtitle}
                      onChange={handleInputChange}
                      placeholder='e.g., PEMF Therapy'
                      className='h-10 text-sm rounded-xl border-slate-200 focus:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-200 transition-shadow'
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <Label htmlFor='phone' className='text-xs font-medium text-slate-700'>
                      Phone
                    </Label>
                    <Input
                      id='phone'
                      name='phone'
                      type='tel'
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder='(555) 123-4567'
                      className='h-10 text-sm rounded-xl border-slate-200 focus:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-200 transition-shadow'
                    />
                  </div>
                </div>

                <div className='space-y-1.5'>
                  <Label htmlFor='address' className='text-xs font-medium text-slate-700'>
                    Street Address
                  </Label>
                  <Input
                    id='address'
                    name='address'
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder='e.g., 10501 6 Mile Cypress Parkway Suite 110'
                    className='h-10 text-sm rounded-xl border-slate-200 focus:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-200 transition-shadow'
                  />
                </div>
              </div>
            </section>

            {/* ===== Branding ===== */}
            <section>
              {sectionAccent('Branding')}
              <div className='space-y-4'>
                {/* Logo + Favicon grid */}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  {/* Logo card */}
                  <div className='rounded-xl border border-slate-200 p-4 transition-shadow hover:shadow-sm'>
                    <Label className='text-xs font-medium text-slate-700 flex items-center gap-1.5 mb-3'>
                      <ImageIcon className='w-3.5 h-3.5 text-slate-400' />
                      Logo
                    </Label>
                    <div className='flex items-center gap-4'>
                      <div className='relative w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center group shrink-0'>
                        {formData.logo ? (
                          <>
                            <img
                              src={resolveBrandingLogoUrl(
                                { logo: formData.logo, logoPublicId: formData.logoPublicId },
                                { width: 128, height: 128 },
                              )}
                              alt='Logo'
                              className='w-full h-full object-cover'
                              loading='lazy'
                              decoding='async'
                            />
                            <button
                              type='button'
                              onClick={handleRemoveLogo}
                              className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center'
                            >
                              <Trash2 className='w-4 h-4 text-white' />
                            </button>
                          </>
                        ) : (
                          <ImageIcon className='w-6 h-6 text-slate-300' />
                        )}
                        {isUploading && (
                          <div className='absolute inset-0 bg-white/80 flex items-center justify-center'>
                            <Loader2 className='w-4 h-4 animate-spin' style={{ color: brandColor }} />
                          </div>
                        )}
                      </div>
                      <div>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() => document.getElementById('logo-upload').click()}
                          disabled={isUploading}
                          className='rounded-lg h-8 text-xs border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors'
                        >
                          <Upload className='w-3.5 h-3.5 mr-1.5' />
                          {formData.logo ? 'Change' : 'Upload'}
                        </Button>
                        <p className='text-[11px] text-slate-400 mt-1.5'>Square format, under 1MB</p>
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

                  {/* Favicon card */}
                  <div className='rounded-xl border border-slate-200 p-4 transition-shadow hover:shadow-sm'>
                    <Label className='text-xs font-medium text-slate-700 flex items-center gap-1.5 mb-3'>
                      <ImageIcon className='w-3.5 h-3.5 text-slate-400' />
                      Favicon
                    </Label>
                    <div className='flex items-center gap-4'>
                      <div className='relative w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center group shrink-0'>
                        {formData.favicon ? (
                          <>
                            <img
                              src={resolveBrandingFaviconUrl(
                                {
                                  favicon: formData.favicon,
                                  faviconPublicId: formData.faviconPublicId,
                                  logo: formData.logo,
                                  logoPublicId: formData.logoPublicId,
                                },
                                { width: 96, height: 96 },
                              )}
                              alt='Favicon'
                              className='w-full h-full object-cover'
                              loading='lazy'
                              decoding='async'
                            />
                            <button
                              type='button'
                              onClick={handleRemoveFavicon}
                              className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center'
                            >
                              <Trash2 className='w-3.5 h-3.5 text-white' />
                            </button>
                          </>
                        ) : (
                          <ImageIcon className='w-5 h-5 text-slate-300' />
                        )}
                        {isUploadingFavicon && (
                          <div className='absolute inset-0 bg-white/80 flex items-center justify-center'>
                            <Loader2 className='w-3.5 h-3.5 animate-spin' style={{ color: brandColor }} />
                          </div>
                        )}
                      </div>
                      <div>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() => document.getElementById('favicon-upload').click()}
                          disabled={isUploadingFavicon}
                          className='rounded-lg h-8 text-xs border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors'
                        >
                          <Upload className='w-3.5 h-3.5 mr-1.5' />
                          {formData.favicon ? 'Change' : 'Upload'}
                        </Button>
                        <p className='text-[11px] text-slate-400 mt-1.5'>192×192px. Falls back to logo</p>
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
                </div>

                {/* Theme Color */}
                <div className='rounded-xl border border-slate-200 p-4 transition-shadow hover:shadow-sm'>
                  <Label className='text-xs font-medium text-slate-700 flex items-center gap-1.5 mb-3'>
                    <Palette className='w-3.5 h-3.5 text-slate-400' />
                    Theme Color
                  </Label>
                  <div className='flex flex-wrap gap-2'>
                    {THEME_COLORS.map((color) => {
                      const isSelected = formData.themeColor === color.value
                      return (
                        <button
                          key={color.value}
                          type='button'
                          onClick={() => setFormData((prev) => ({ ...prev, themeColor: color.value }))}
                          className={`relative w-9 h-9 rounded-xl border-2 transition-all ${
                            isSelected
                              ? 'border-slate-900 scale-110 shadow-sm'
                              : 'border-transparent hover:scale-105 hover:shadow-sm'
                          }`}
                          style={{ background: color.value }}
                          title={color.name}
                        >
                          {isSelected && (
                            <span className='absolute inset-0 flex items-center justify-center'>
                              <span className='w-2 h-2 rounded-full bg-white' />
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  <div className='mt-3 flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5'>
                    <div
                      className='w-7 h-7 rounded-lg shrink-0'
                      style={{
                        background: `linear-gradient(135deg, ${formData.themeColor}, ${adjustHex(formData.themeColor, -22)})`,
                      }}
                    />
                    <div className='text-xs'>
                      <span className='font-medium text-slate-700'>{THEME_COLORS.find(c => c.value === formData.themeColor)?.name || 'Custom'}</span>
                      <span className='text-slate-400 ml-2'>{formData.themeColor}</span>
                    </div>
                  </div>
                </div>

                {/* Subdomain */}
                <div className='space-y-1.5'>
                  <Label htmlFor='subdomain' className='text-xs font-medium text-slate-700 flex items-center gap-1.5'>
                    <Globe className='w-3.5 h-3.5 text-slate-400' />
                    Custom Subdomain
                  </Label>
                  <div className='relative'>
                    <Input
                      id='subdomain'
                      name='subdomain'
                      value={formData.subdomain}
                      onChange={handleSubdomainChange}
                      placeholder='e.g., spark'
                      className={`h-10 text-sm rounded-xl border-slate-200 pr-10 transition-shadow focus:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-200 ${
                        subdomainValidation.error
                          ? 'border-red-300 focus-visible:ring-red-200'
                          : subdomainValidation.available
                          ? 'border-green-300 focus-visible:ring-green-200'
                          : ''
                      }`}
                    />
                    {subdomainValidation.isValidating && (
                      <Loader2 className='absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-slate-400' />
                    )}
                    {subdomainValidation.available && (
                      <span className='absolute right-3.5 top-1/2 -translate-y-1/2 text-green-500 text-xs font-bold'>✓</span>
                    )}
                  </div>
                  {subdomainValidation.error && (
                    <p className='text-xs text-red-500 flex items-center gap-1 mt-1'>
                      <AlertCircle className='w-3 h-3' />
                      {subdomainValidation.error}
                    </p>
                  )}
                  {formData.subdomain && !subdomainValidation.error && !subdomainValidation.isValidating && (
                    <p className='text-xs text-slate-400 flex items-center gap-1 mt-1'>
                      <ExternalLink className='w-3 h-3' />
                      {buildSubdomainUrl(formData.subdomain)}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* ===== Location & Hours ===== */}
            <section>
              {sectionAccent('Location & Hours')}
              <div className='space-y-4'>
                {/* Map card */}
                <div className='rounded-xl border border-slate-200 overflow-hidden'>
                  <div className='flex gap-2 p-3 border-b border-slate-100 bg-slate-50/50'>
                    <div className='relative flex-1'>
                      <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none' />
                      <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
                        placeholder='Search place or address...'
                        className='pl-9 h-9 text-sm rounded-lg border-slate-200 focus:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-200 transition-shadow'
                      />
                    </div>
                    <Button
                      type='button'
                      variant='outline'
                      onClick={handleGetLocation}
                      disabled={isSearching}
                      className='h-9 w-9 p-0 rounded-lg border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    >
                      <LocateFixed className={`w-4 h-4 ${isSearching ? 'animate-pulse' : ''}`} />
                    </Button>
                    <Button
                      type='button'
                      onClick={handleSearch}
                      disabled={isSearching}
                      className='h-9 text-sm px-4 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors'
                    >
                      {isSearching ? (
                        <Loader2 className='w-3.5 h-3.5 animate-spin' />
                      ) : (
                        'Search'
                      )}
                    </Button>
                  </div>
                  <div className='h-48 relative z-0'>
                    <MapContainer
                      center={[51.505, -0.09]}
                      zoom={13}
                      style={{ height: '100%', width: '100%' }}
                      zoomControl={false}
                    >
                      <TileLayer url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />
                      <MapPicker position={position} setPosition={setPosition} />
                      <MapUpdater position={position} />
                    </MapContainer>
                  </div>
                </div>

                {/* Business Hours */}
                <div className='rounded-xl border border-slate-200 divide-y divide-slate-100'>
                  {formData.hours.map((hour, index) => {
                    const isLast = index === formData.hours.length - 1
                    return (
                      <div
                        key={hour.day}
                        className={`flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-slate-50/50 ${hour.isClosed ? 'opacity-50' : ''}`}
                      >
                        <div className='w-14 shrink-0'>
                          <span className='text-xs font-medium text-slate-700'>
                            {hour.day.slice(0, 3)}
                          </span>
                        </div>
                        <div className='flex items-center gap-2 flex-1'>
                          <Input
                            type='time'
                            value={hour.open}
                            disabled={hour.isClosed}
                            onChange={(e) => handleHourChange(index, 'open', e.target.value)}
                            className='h-8 text-xs rounded-lg border-slate-200 bg-white disabled:bg-slate-50 disabled:opacity-50 focus:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-200 transition-shadow'
                          />
                          <span className='text-xs text-slate-300'>—</span>
                          <Input
                            type='time'
                            value={hour.close}
                            disabled={hour.isClosed}
                            onChange={(e) => handleHourChange(index, 'close', e.target.value)}
                            className='h-8 text-xs rounded-lg border-slate-200 bg-white disabled:bg-slate-50 disabled:opacity-50 focus:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-200 transition-shadow'
                          />
                        </div>
                        <label className='flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer shrink-0 select-none'>
                          <input
                            type='checkbox'
                            checked={hour.isClosed}
                            onChange={(e) => handleHourChange(index, 'isClosed', e.target.checked)}
                            className='w-3.5 h-3.5 rounded border-slate-300 text-slate-600 focus:ring-slate-300 cursor-pointer'
                          />
                          Closed
                        </label>
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>

            {/* ===== Integrations ===== */}
            <section>
              {sectionAccent('Integrations')}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-1.5'>
                  <Label htmlFor='reviewLink' className='text-xs font-medium text-slate-700'>
                    Review Link
                  </Label>
                  <Input
                    id='reviewLink'
                    name='reviewLink'
                    type='url'
                    value={formData.reviewLink}
                    onChange={handleInputChange}
                    placeholder='https://g.page/your-spa/review'
                    className='h-10 text-sm rounded-xl border-slate-200 focus:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-200 transition-shadow'
                  />
                  <p className='text-xs text-slate-400'>Opened from member dashboard for review rewards.</p>
                </div>
                <div className='space-y-1.5'>
                  <Label htmlFor='ghlApiKey' className='text-xs font-medium text-slate-700'>
                    GHL API Key
                  </Label>
                  <Input
                    id='ghlApiKey'
                    name='ghlApiKey'
                    type='password'
                    value={formData.ghlApiKey}
                    onChange={handleInputChange}
                    placeholder='Paste sub-account API key'
                    className='h-10 text-sm rounded-xl border-slate-200 focus:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-200 transition-shadow'
                    autoComplete='new-password'
                  />
                  <p className='text-xs text-slate-400'>Per-location GHL sub-account key.</p>
                </div>
              </div>
            </section>

            {/* ===== Notes ===== */}
            <section>
              {sectionAccent('Notes')}
              <Textarea
                id='description'
                name='description'
                value={formData.description}
                onChange={handleInputChange}
                placeholder='Optional notes about this location...'
                rows={2}
                className='rounded-xl text-sm border-slate-200 resize-none focus:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-200 transition-shadow'
              />
            </section>

          </div>

          {/* Footer */}
          <div className='flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-white shrink-0'>
            <Button
              type='button'
              variant='outline'
              onClick={onClose}
              className='rounded-xl h-10 text-sm font-medium px-5 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors'
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type='submit'
              className='rounded-xl h-10 text-sm font-medium px-5 text-white transition-all hover:opacity-90 active:scale-[0.98]'
              style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColorDark})` }}
              disabled={isPending || !formData.locationId || !formData.name.trim()}
            >
              {isPending ? (
                <>
                  <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                  Saving...
                </>
              ) : (
                initialData ? 'Save changes' : 'Create location'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    {/* Cropper dialog */}
    <Dialog
      open={cropperState.isOpen}
      onOpenChange={(open) =>
        !open && setCropperState({ isOpen: false, src: '', type: null, fileName: '' })
      }
    >
      <DialogContent showCloseButton={false} className='sm:max-w-md w-[95vw] p-0 overflow-hidden rounded-2xl shadow-xl'>
        <div className='flex items-center justify-between px-5 py-4 border-b border-slate-100'>
          <DialogTitle className='text-sm font-semibold text-slate-900'>
            Crop {cropperState.type === 'favicon' ? 'Favicon' : 'Logo'}
          </DialogTitle>
          <button
            type='button'
            className='p-1.5 rounded-lg hover:bg-slate-100 transition-colors'
            onClick={() => setCropperState({ isOpen: false, src: '', type: null, fileName: '' })}
          >
            <X className='w-3.5 h-3.5 text-slate-400' />
          </button>
        </div>
        <div className='relative w-full h-64 bg-slate-100'>
          {cropperState.src && (
            <Cropper
              image={cropperState.src}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
            />
          )}
        </div>
        <div className='px-5 py-4 space-y-4'>
          <div className='flex items-center gap-3'>
            <span className='text-xs font-medium text-slate-600 shrink-0'>Zoom</span>
            <input
              type='range'
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className='w-full h-1.5 accent-slate-900 rounded-full'
            />
          </div>
          <div className='flex justify-end gap-2.5'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => setCropperState({ isOpen: false, src: '', type: null, fileName: '' })}
              className='rounded-lg h-9 text-xs px-4 border-slate-200 text-slate-600 hover:text-slate-900'
            >
              Cancel
            </Button>
            <Button
              type='button'
              size='sm'
              onClick={handleCropConfirm}
              className='rounded-lg h-9 text-xs px-4 bg-slate-900 text-white hover:bg-slate-800 transition-colors'
            >
              Use crop
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}

export default LocationForm
