import { Button } from '@/components/ui/button'
import { useBranding } from '@/context/BrandingContext'
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
import React, { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'

const Motion = motion

const hexToRgba = (hex, alpha) => {
  if (!hex) return `rgba(236, 72, 153, ${alpha})`
  const cleaned = hex.replace('#', '')
  const num = parseInt(cleaned, 16)
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

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

  const { branding } = useBranding()
  const brandColor = branding?.themeColor || '#ec4899'
  
  const brandStyles = useMemo(() => {
    return {
      primary: brandColor,
      rgba10: hexToRgba(brandColor, 0.1),
      rgba05: hexToRgba(brandColor, 0.05),
      rgba20: hexToRgba(brandColor, 0.2),
    }
  }, [brandColor])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <Motion.div 
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="lg:col-span-7 xl:col-span-8 relative bg-white rounded-[2rem] p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all overflow-hidden group flex flex-col"
      >
        <div className="relative z-10 flex flex-col gap-4 flex-1">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-0.5">{clinic.name}</h3>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${status.color}`}>
                  {status.text}
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-[10px] text-gray-500 font-medium">
                  {todayHours.isClosed ? 'Closed' : `${todayHours.open} - ${todayHours.close}`}
                </span>
              </div>
            </div>
            <div 
              className="p-2.5 rounded-[1rem] shadow-sm"
              style={{ backgroundColor: brandStyles.rgba10 }}
            >
              <Globe className="w-4 h-4" style={{ color: brandColor }} />
            </div>
          </div>

          {/* Google Map Embed */}
          <div className="w-full h-36 rounded-[1.25rem] overflow-hidden shadow-inner border border-gray-100">
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
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="bg-gray-50/80 border border-gray-100 p-2 rounded-[0.85rem] mt-0.5">
                <MapPin className="w-4 h-4 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-medium text-gray-600 leading-relaxed pt-0.5">
                  {clinic.address || 'Address not listed'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-gray-50/80 border border-gray-100 p-2 rounded-[0.85rem]">
                <Phone className="w-4 h-4 text-gray-600" />
              </div>
              <a 
                href={`tel:${clinic.phone}`} 
                className="text-[13px] font-bold hover:opacity-80 transition-opacity"
                style={{ color: brandColor }}
              >
                {clinic.phone || 'Phone not listed'}
              </a>
            </div>

            {/* Hours Section - Mobile Only */}
            <div className="bg-gray-50/80 border border-gray-100 rounded-xl p-3 lg:hidden">
              <button 
                type="button"
                onClick={() => setShowAllHours(!showAllHours)}
                className="flex items-center justify-between w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] focus-visible:ring-offset-2 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-[13px] font-semibold text-gray-700">Business Hours</span>
                </div>
                {showAllHours ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              <AnimatePresence>
                {showAllHours && (
                  <Motion.div 
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
                          <div 
                            key={day} 
                            className={`flex justify-between text-xs py-1 ${isToday ? 'font-bold' : 'text-gray-600'}`}
                            style={isToday ? { color: brandColor } : {}}
                          >
                            <span>{day}</span>
                            <span>{dayHours.isClosed ? 'Closed' : `${dayHours.open} - ${dayHours.close}`}</span>
                          </div>
                        )
                      })}
                    </div>
                  </Motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="mt-auto pt-2" />

          {/* Actions */}
          <div className="flex gap-3">
            <Button 
              onClick={handleDirections}
              className="flex-1 text-white rounded-[1rem] h-12 text-[13px] font-black gap-2 uppercase tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] focus-visible:ring-offset-2 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
              style={{ backgroundColor: brandColor, shadowColor: brandStyles.rgba20 }}
            >
              <Navigation className="w-4 h-4" />
              Directions
            </Button>
            <Button 
              asChild
              variant="outline"
              className="flex-1 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-[1rem] h-12 text-[13px] font-black gap-2 uppercase tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-700 focus-visible:ring-offset-2 shadow-sm hover:shadow transition-all hover:-translate-y-0.5"
            >
              <a href={`tel:${clinic.phone}`}>
                <Phone className="w-4 h-4" />
                Call
              </a>
            </Button>
          </div>
        </div>
      </Motion.div>

      {/* Desktop Hours Card */}
      <Motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="hidden lg:flex lg:col-span-5 xl:col-span-4 bg-white rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all flex-col"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-[1rem] shadow-sm border border-[color:var(--brand-primary)]/10" style={{ backgroundColor: brandStyles.rgba10 }}>
            <Clock className="w-5 h-5" style={{ color: brandColor }} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 leading-tight">Business Hours</h3>
            <p className="text-[13px] text-gray-500 font-medium mt-0.5">{todayHours.isClosed ? 'Closed Today' : 'Open Today'}</p>
          </div>
        </div>

        <div className="flex flex-col space-y-1.5 flex-1 justify-center">
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
            const dayHours = clinic.hours?.find(h => h.day === day) || { isClosed: true }
            const isToday = day === todayName
            return (
              <div 
                key={day} 
                className={`flex justify-between items-center text-[13.5px] py-2.5 px-4 rounded-[0.85rem] transition-colors ${isToday ? 'font-bold bg-[color:var(--brand-primary)]/5 shadow-sm border border-[color:var(--brand-primary)]/10' : 'text-gray-600 hover:bg-gray-50/80'}`}
                style={isToday ? { color: brandColor } : {}}
              >
                <span>{day}</span>
                <span className={isToday ? 'font-bold' : 'text-gray-500 font-medium'}>
                  {dayHours.isClosed ? 'Closed' : `${dayHours.open} - ${dayHours.close}`}
                </span>
              </div>
            )
          })}
        </div>
      </Motion.div>
    </div>
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
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Our Clinics</h2>
          <p className="text-[10px] text-gray-500 font-medium">Find us and book your next visit</p>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {locations.map(clinic => (
          <ClinicCard key={clinic._id} clinic={clinic} />
        ))}
      </div>
    </div>
  )
}

export default ClinicLocations
