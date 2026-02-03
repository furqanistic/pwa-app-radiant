import { Button } from '@/components/ui/button'
import { locationService } from '@/services/locationService'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
    ChevronDown,
    ChevronUp,
    Clock,
    ExternalLink,
    Globe,
    MapPin,
    Navigation,
    Phone
} from 'lucide-react'
import React, { useState } from 'react'
import { useSelector } from 'react-redux'

const ClinicCard = ({ clinic }) => {
  const [showAllHours, setShowAllHours] = useState(false)
  
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const todayName = days[new Date().getDay()]
  const todayHours = clinic.hours?.find(h => h.day === todayName) || { isClosed: true }

  const getStatus = () => {
    if (todayHours.isClosed) return { text: 'Closed Today', color: 'text-red-500' }
    
    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()
    
    const [openH, openM] = todayHours.open.split(':').map(Number)
    const [closeH, closeM] = todayHours.close.split(':').map(Number)
    
    const openTime = openH * 60 + openM
    const closeTime = closeH * 60 + closeM
    
    if (currentTime < openTime) return { text: `Opens at ${todayHours.open}`, color: 'text-amber-500' }
    if (currentTime > closeTime) return { text: 'Closed', color: 'text-red-500' }
    
    return { text: 'Open Now', color: 'text-green-500' }
  }

  const status = getStatus()

  const handleDirections = () => {
    const query = encodeURIComponent(clinic.address)
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank')
  }

  // Google Maps Embed URL
  const searchParam = (clinic.coordinates?.latitude && clinic.coordinates?.longitude)
    ? `${clinic.coordinates.latitude},${clinic.coordinates.longitude}`
    : encodeURIComponent(clinic.address)

  const mapUrl = `https://maps.google.com/maps?q=${searchParam}&t=&z=15&ie=UTF8&iwloc=&output=embed`

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-3xl p-6 shadow-sm border border-pink-50 hover:shadow-md transition-shadow overflow-hidden"
    >
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-1">{clinic.name}</h3>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${status.color}`}>
                {status.text}
              </span>
              <span className="text-gray-300">•</span>
              <span className="text-xs text-gray-500">
                {todayHours.isClosed ? 'Closed' : `${todayHours.open} - ${todayHours.close}`}
              </span>
            </div>
          </div>
          <div className="bg-pink-50 p-2.5 rounded-2xl">
            <Globe className="w-5 h-5 text-pink-500" />
          </div>
        </div>

        {/* Google Map Embed */}
        <div className="w-full h-48 rounded-2xl overflow-hidden shadow-inner border border-gray-100">
          <iframe
            title={`${clinic.name} Map`}
            width="100%"
            height="100%"
            frameBorder="0"
            scrolling="no"
            marginHeight="0"
            marginWidth="0"
            src={mapUrl}
            className="filter grayscale-[0.2] contrast-[1.1]"
          ></iframe>
        </div>

        {/* Info Grid */}
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="bg-gray-50 p-2 rounded-xl mt-0.5">
              <MapPin className="w-4 h-4 text-gray-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700 leading-relaxed">
                {clinic.address || 'Address not listed'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-gray-50 p-2 rounded-xl">
              <Phone className="w-4 h-4 text-gray-600" />
            </div>
            <a 
              href={`tel:${clinic.phone}`} 
              className="text-sm font-bold text-pink-600 hover:text-pink-700 transition-colors"
            >
              {clinic.phone || 'Phone not listed'}
            </a>
          </div>

          {/* Hours Section */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <button 
              onClick={() => setShowAllHours(!showAllHours)}
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-700">Business Hours</span>
              </div>
              {showAllHours ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            <AnimatePresence>
              {showAllHours && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 space-y-2">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                      const dayHours = clinic.hours?.find(h => h.day === day) || { isClosed: true }
                      const isToday = day === todayName
                      return (
                        <div key={day} className={`flex justify-between text-xs py-1 ${isToday ? 'font-bold text-pink-600' : 'text-gray-600'}`}>
                          <span>{day}</span>
                          <span>{dayHours.isClosed ? 'Closed' : `${dayHours.open} - ${dayHours.close}`}</span>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button 
            onClick={handleDirections}
            className="flex-1 bg-gray-900 hover:bg-black text-white rounded-2xl h-12 font-bold gap-2"
          >
            <Navigation className="w-4 h-4" />
            Get Directions
          </Button>
          <Button 
            asChild
            variant="outline"
            className="flex-1 border-pink-200 text-pink-600 hover:bg-pink-50 rounded-2xl h-12 font-bold gap-2"
          >
            <a href={`tel:${clinic.phone}`}>
              <Phone className="w-4 h-4" />
              Call Now
            </a>
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

const ClinicLocations = () => {
  const { currentUser } = useSelector((state) => state.user)
  const { data: locationsData, isLoading } = useQuery({
    queryKey: ['active-locations'],
    queryFn: () => locationService.getActiveLocations(),
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map(i => (
          <div key={i} className="bg-white rounded-3xl p-8 h-80 animate-pulse border border-gray-100" />
        ))}
      </div>
    )
  }

  let locations = locationsData?.data?.locations || []

  // Enhanced Mapping: Prioritize the currentUser's saved location details (coordinates, address, etc.)
  // This ensures the dashboard shows exactly what the spa owner saved in their profile.
  locations = locations.map(loc => {
    // Check if this location belongs to the user's selected spa
    if (currentUser?.spaLocation?.locationId === loc.locationId) {
      const spaLoc = currentUser.spaLocation;
      return {
        ...loc,
        address: spaLoc.locationAddress || loc.address,
        phone: spaLoc.locationPhone || loc.phone,
        coordinates: spaLoc.coordinates || loc.coordinates,
        // Also sync hours if available in profile
        hours: spaLoc.businessHours ? Object.entries(spaLoc.businessHours).map(([day, config]) => ({
          day: day.charAt(0).toUpperCase() + day.slice(1),
          open: config.open,
          close: config.close,
          isClosed: config.closed
        })) : loc.hours
      };
    }
    return loc;
  });

  // Filter out incomplete locations (hide dummy/test data)
  locations = locations.filter(loc => loc.name && loc.address && loc.name !== 'Dummy Clinic' && loc.name !== 'Test Clinic')

  // Filter locations by the user's selected spa/location
  const userLocationId = currentUser?.selectedLocation?.locationId
  if (userLocationId) {
    locations = locations.filter(loc => loc.locationId === userLocationId)
  }

  if (locations.length === 0) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-3 rounded-2xl shadow-lg shadow-pink-200">
          <MapPin className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-gray-900">Our Clinics</h2>
          <p className="text-sm text-gray-500 font-medium">Find us and book your next visit</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
        {locations.map(clinic => (
          <ClinicCard key={clinic._id} clinic={clinic} />
        ))}
      </div>
    </div>
  )
}

export default ClinicLocations
