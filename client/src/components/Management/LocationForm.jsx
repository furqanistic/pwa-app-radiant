// File: client/src/components/Management/LocationForm.jsx
// client/src/components/Management/LocationForm.jsx
import { locationService } from '@/services/locationService'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { AlertCircle, Clock, ExternalLink, Loader2, LocateFixed, MapPin, Plus, Search } from 'lucide-react'
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
  })

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
        hours: initialData.hours?.length
          ? initialData.hours
          : DAYS_OF_WEEK.map((day) => ({
              day,
              open: '09:00',
              close: '17:00',
              isClosed: false,
            })),
        coordinates: initialData.coordinates || { latitude: null, longitude: null }
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
      hours: DAYS_OF_WEEK.map((day) => ({
        day,
        open: '09:00',
        close: '17:00',
        isClosed: false,
      })),
      coordinates: { latitude: null, longitude: null }
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
      hours: formData.hours,
      coordinates: position ? { latitude: position.lat, longitude: position.lng } : formData.coordinates
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
