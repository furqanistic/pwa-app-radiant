// client/src/pages/Bookings/ServiceCatalogPage.jsx - HIGH-END PREMIUM DESIGN
import MembershipCard from '@/components/Bookings/MembershipCard'
import { useBranding } from '@/context/BrandingContext'
import {
  useActiveServices,
  useCategories,
} from '@/hooks/useServices'
import { resolveImageUrl } from '@/lib/imageHelpers'
import ghlService from '@/services/ghlService'
import { locationService } from '@/services/locationService'
import { useQuery } from '@tanstack/react-query'
import {
  Clock,
  Crown,
  Droplets,
  Gem,
  Heart,
  Palette,
  Scissors,
  Search,
  Smile,
  Sparkles,
  Sun,
  Zap,
} from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import Layout from '../Layout/Layout'

// ==========================================
// 1. UTILITY HOOKS & HELPERS
// ==========================================

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

// Helper to pick icons based on category name
const getCategoryIcon = (name) => {
  const n = name.toLowerCase()
  if (n.includes('hair') || n.includes('cut')) return Scissors
  if (n.includes('face') || n.includes('skin') || n.includes('peel')) return Smile
  if (n.includes('body') || n.includes('slim')) return Sun
  if (n.includes('laser') || n.includes('remove')) return Zap
  if (n.includes('massage') || n.includes('relax')) return Heart
  if (n.includes('nail') || n.includes('manicure')) return Palette
  if (n.includes('hydra') || n.includes('water')) return Droplets
  if (n.includes('premium') || n.includes('vip')) return Crown
  return Gem // Default premium fallback
}

const normalizeMembershipPlans = (membership) => {
  if (!membership) return []
  if (Array.isArray(membership.plans) && membership.plans.length > 0) {
    return membership.plans
  }
  if (membership.name || membership.description || membership.price !== undefined) {
    return [membership]
  }
  return []
}

// ==========================================
// 2. COMPONENTS
// ==========================================

// Premium Tab Navigation - Chunky Pills
const TabNavigation = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'browse', label: 'Browse' },
    { id: 'membership', label: 'Members' },
    { id: 'treatment', label: 'Treatments' },
  ]

  return (
    <div className='flex p-1 bg-white/60 backdrop-blur-xl border border-[color:var(--brand-primary)/0.2] rounded-2xl mb-8 w-full max-w-md mx-auto shadow-sm'>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 ${
            activeTab === tab.id
              ? 'bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] text-white shadow-md shadow-[color:var(--brand-primary)/0.25]'
              : 'text-gray-500 hover:text-[color:var(--brand-primary)] hover:bg-[color:var(--brand-primary)/0.08]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}



// "Sick" Service Card - Matches Dashboard/Referral Style
const ServiceCard = ({ service, onSelect, isMembership = false }) => {
  const calculateDiscountedPrice = (price) => {
    if (service.discount?.active) {
      return price - (price * service.discount.percentage) / 100
    }
    return price
  }

  const isDiscountActive =
    service.discount?.active &&
    new Date() >= new Date(service.discount.startDate || Date.now()) &&
    new Date() <= new Date(service.discount.endDate || Date.now())

  // Specific styles for membership vs standard service
  const containerClasses = isMembership
    ? 'border-amber-100 from-amber-50/50 to-white'
    : 'border-[color:var(--brand-primary)/0.2] from-[color:var(--brand-primary)/0.08] to-white'
  
  const accentColor = isMembership ? 'text-amber-500' : 'text-[color:var(--brand-primary)]'

  // DEMO LOGIC: Simulate Member Price if not explicitly in data (for visual demo)
  // In real app, check service.memberPrice
  const hasMemberPerk = !isMembership && (service.name.length % 2 === 0 || service.basePrice > 50); 
  const memberPrice = hasMemberPerk ? (service.basePrice > 100 ? 0 : Math.floor(service.basePrice * 0.8)) : null;

  return (
    <div
      onClick={() => onSelect(service)}
      className={`relative group cursor-pointer bg-gradient-to-br ${containerClasses} rounded-[2rem] border border-gray-200/70 p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-[color:var(--brand-primary)/0.18] hover:border-gray-200/70`}
    >
      {/* Image Container */}
      <div className='relative h-48 rounded-[1.5rem] overflow-hidden mb-4 shadow-sm bg-gray-100'>
        <img
          src={resolveImageUrl(
            service.image,
            'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=800&auto=format&fit=crop&q=60',
            { width: 800, height: 600 }
          )}
          alt={service.name}
          className='w-full h-full object-cover transition-transform duration-700 group-hover:scale-110'
          loading='lazy'
          decoding='async'
        />
        
        {/* Clean Top-Left Badge */}
        <div className='absolute top-3 left-3'>
           <div className='bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/50 shadow-sm'>
              <span className={`text-xs font-bold ${accentColor} uppercase tracking-wide flex items-center gap-1.5`}>
                 {isMembership && <Crown size={12} />}
                 {service.categoryId?.name || 'Service'}
              </span>
           </div>
        </div>
      </div>

      {/* Content */}
      <div className='px-2 pb-2'>
        <div className='flex justify-between items-start mb-2'>
          <h3 className='text-xl font-black text-gray-900 leading-tight group-hover:text-[color:var(--brand-primary)] transition-colors'>
            {service.name}
          </h3>
        </div>

        <p className='text-sm text-gray-500 font-medium mb-4 line-clamp-2 leading-relaxed'>
          {service.description}
        </p>

        {/* Member Perk Badge if applicable */}
        {hasMemberPerk && (
            <div className='mb-4 flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-xl p-2'>
                <div className='bg-amber-100 p-1.5 rounded-lg text-amber-600'>
                    <Crown size={14} fill="currentColor" />
                </div>
                <div className='flex flex-col leading-none'>
                    <span className='text-[10px] uppercase font-bold text-amber-500 tracking-wide'>Member Price</span>
                    <span className='text-sm font-black text-amber-700'>
                        {memberPrice === 0 ? 'FREE' : `$${memberPrice}`}
                    </span>
                </div>
            </div>
        )}

        {/* Bottom Action Row */}
        <div className='flex items-end justify-between mt-auto'>
           <div>
               <div className='flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider mb-1'>
                   <Clock size={12} />
                   {service.duration} mins
               </div>
               <div className='flex items-baseline gap-2'>
                   {isDiscountActive ? (
                       <>
                           <span className='text-2xl font-black text-gray-900'>${calculateDiscountedPrice(service.basePrice)}</span>
                           <span className='text-sm font-bold text-gray-400 line-through decoration-[color:var(--brand-primary)/0.5]'>${service.basePrice}</span>
                       </>
                   ) : (
                       <span className='text-2xl font-black text-gray-900'>${service.basePrice}</span>
                   )}
               </div>
           </div>

           <button className='bg-gray-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-transform active:scale-95 group-hover:bg-[color:var(--brand-primary)]'>
               Book
           </button>
        </div>
      </div>
    </div>
  )
}

// Clean Skeleton
const ServiceCardSkeleton = () => (
    <div className='bg-white rounded-[2rem] border border-gray-200/70 p-4 h-[340px]'>
        <div className='bg-gray-100 h-48 rounded-[1.5rem] w-full animate-pulse mb-4' />
        <div className='h-6 bg-gray-100 rounded-lg w-2/3 mb-3 animate-pulse' />
        <div className='h-4 bg-gray-100 rounded-lg w-full mb-2 animate-pulse' />
        <div className='h-4 bg-gray-100 rounded-lg w-1/2 animate-pulse' />
    </div>
)

// ==========================================
// 3. MAIN PAGE
// ==========================================

const ServiceCatalog = ({ onServiceSelect }) => {
  const [activeTab, setActiveTab] = useState('browse')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const { currentUser } = useSelector((state) => state.user)
  const { branding, locationId } = useBranding()
  const [selectedBookingsDate, setSelectedBookingsDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const brandColor = branding?.themeColor || '#ec4899'
  const brandColorDark = (() => {
    const cleaned = brandColor.replace('#', '')
    if (cleaned.length !== 6) return '#b0164e'
    const num = parseInt(cleaned, 16)
    const r = Math.max(0, ((num >> 16) & 255) - 24)
    const g = Math.max(0, ((num >> 8) & 255) - 24)
    const b = Math.max(0, (num & 255) - 24)
    return `#${r.toString(16).padStart(2, '0')}${g
      .toString(16)
      .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  })()

  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const activeLocationId =
    locationId ||
    currentUser?.selectedLocation?.locationId ||
    currentUser?.spaLocation?.locationId

  const { data: categories = [] } = useCategories(true) // Enable counts
  const { services, isLoading } = useActiveServices({
    search: debouncedSearchTerm,
    locationId
  })

  // Fetch location data if needed (primarily for manager/admin to get latest edits)
  const { data: locationData } = useQuery({
    queryKey: ['my-location'],
    queryFn: () => locationService.getMyLocation(),
    enabled: !!(currentUser?.role === 'spa' || currentUser?.role === 'admin' || currentUser?.role === 'super-admin'),
  })

  const { data: ghlBookingsData, isLoading: isLoadingGhlBookings } = useQuery({
    queryKey: ['ghl-bookings', activeLocationId, selectedBookingsDate],
    queryFn: () =>
      ghlService.getLocationBookingsByDate(activeLocationId, selectedBookingsDate),
    enabled: !!activeLocationId && !!selectedBookingsDate,
  })

  const ghlBookings = ghlBookingsData?.data?.events || []

  // Use branding membership as primary source for customers, or locationData for owners
  const locationMembership = branding?.membership || locationData?.data?.location?.membership
  const locationMembershipPlans = useMemo(
    () => normalizeMembershipPlans(locationMembership),
    [locationMembership]
  )

  // ---- FILTERING LOGIC ----
  const browseServices = useMemo(() => {
    let filtered = services || []
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((s) => s.categoryId?._id === selectedCategory)
    }
    return filtered
  }, [services, selectedCategory])

  const membershipServices = useMemo(() => {
    return (services || []).filter(
      (s) =>
        s.name.toLowerCase().includes('membership') ||
        s.categoryName?.toLowerCase().includes('membership') ||
        s.description?.toLowerCase().includes('subscription')
    )
  }, [services])

  const groupedServices = useMemo(() => {
    const groups = {}
    ;(services || []).forEach((service) => {
      const catName = service.categoryName || 'Other'
      if (!groups[catName]) groups[catName] = []
      groups[catName].push(service)
    })
    return groups
  }, [services])

  // ---- COMPUTED COUNTS ----
  const categoryCounts = useMemo(() => {
    const counts = {}
    if (services) {
      services.forEach((s) => {
        const catId = s.categoryId?._id || s.categoryId
        if (catId) {
          counts[catId] = (counts[catId] || 0) + 1
        }
      })
    }
    return counts
  }, [services])

  // ---- RENDERERS ----

  const renderHeader = () => (
    <div className='relative overflow-hidden rounded-[2rem] md:rounded-[2.5rem] bg-gradient-to-br from-[color:var(--brand-primary)] via-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] text-white p-6 md:p-12 mb-8'>
        <div className='absolute inset-0 bg-[url("https://www.transparenttextures.com/patterns/cubes.png")] opacity-10 mix-blend-overlay' />
        
        <div className='relative z-10 flex flex-col md:flex-row items-center md:items-end justify-between gap-6'>
            <div className='text-center md:text-left space-y-3 md:space-y-4 max-w-2xl w-full'>
                <div className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-[10px] md:text-xs font-bold tracking-wider uppercase mx-auto md:mx-0'>
                    Premium Treatments
                </div>
                <h1 className='text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter leading-none'>
                    Find Your <span className='text-white/90'>Glow Up.</span>
                </h1>
                <p className='text-base md:text-lg text-white/90 font-medium max-w-md hidden md:block'>
                    Browse our exclusive selection of beauty services and treatments designed just for you.
                </p>
            </div>
            
            {/* Search Input Integrated in Header */}
            <div className='w-full md:w-auto min-w-full md:min-w-[340px]'>
               <div className='relative group'>
                  <div className='absolute inset-0 bg-white/10 blur-xl rounded-2xl group-hover:bg-white/20 transition-all' />
                  <div className='relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center p-1.5 transition-all group-hover:bg-white/20'>
                      <div className='bg-white/10 p-2 rounded-xl ml-1'>
                        <Search className='text-white' size={18} />
                      </div>
                      <input 
                        type="text" 
                        placeholder="Search services..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className='bg-transparent border-none text-white placeholder-white/70 focus:outline-none w-full font-medium py-2 px-3 text-sm'
                      />
                  </div>
               </div>
            </div>
        </div>
    </div>
  )

  const renderCategories = () => {
      // Calculate layout fillers
      // Mobile grid is 3 columns.
      // Items = 1 (All) + categories.length
      const totalItems = 1 + categories.length
      const remainder = totalItems % 3
      // If remainder is 1 (e.g., 4 items), we have 1 item on last row -> 2 empty slots. Span 2.
      // If remainder is 2 (e.g., 5 items), we have 2 items on last row -> 1 empty slot. Span 1.
      const mobileSpanClass = remainder === 1 ? 'col-span-2' : remainder === 2 ? 'col-span-1' : 'hidden'
      const showPromo = remainder !== 0

      return (
        <div className='grid grid-cols-3 sm:grid-cols-4 gap-3 mb-8 md:flex md:flex-wrap md:justify-center md:gap-4'>
            <button
              onClick={() => setSelectedCategory('all')}
              className={`md:w-36 relative overflow-hidden aspect-square rounded-[1.5rem] p-3 flex flex-col justify-between transition-all duration-300 border border-gray-200/70 active:scale-95 ${
                selectedCategory === 'all'
                  ? 'bg-gray-900 text-white border-gray-200/70 scale-105 z-10 shadow-xl shadow-gray-200'
                  : 'bg-white text-gray-500 border-gray-200/70 hover:border-gray-200/70 hover:scale-105'
              }`}
            >
              <div className='absolute inset-0 opacity-10 bg-[url("https://www.transparenttextures.com/patterns/cubes.png")]' />
              
              <div className={`relative z-10 w-9 h-9 rounded-2xl flex items-center justify-center transition-colors ${selectedCategory === 'all' ? 'bg-white/20' : 'bg-gray-100'}`}>
                  <Search size={18} className={selectedCategory === 'all' ? 'text-white' : 'text-gray-500'} />
              </div>
              <div className='relative z-10 text-left'>
                  <span className='block font-black text-[10px] sm:text-xs leading-tight tracking-tighter uppercase'>All<br/>Services</span>
                  <span className='text-[8px] opacity-60 font-black mt-1 block uppercase tracking-tighter'>
                      {services?.length || 0} items
                  </span>
              </div>
            </button>
            
            {categories.map((cat) => {
              const isActive = selectedCategory === cat._id;
              const count = categoryCounts[cat._id] || 0;
              const initial = cat.name.charAt(0).toUpperCase();
              
              return (
                <button
                  key={cat._id}
                  onClick={() => setSelectedCategory(cat._id)}
                  className={`md:w-36 group relative overflow-hidden aspect-square rounded-[1.5rem] p-3 flex flex-col justify-between transition-all duration-300 border border-gray-200/70 active:scale-95 ${
                    isActive
                      ? 'bg-gradient-to-br from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] text-white border-gray-200/70 scale-105 z-10 shadow-xl shadow-[color:var(--brand-primary)/0.25]'
                      : 'bg-white text-gray-600 border-gray-200/70 hover:border-gray-200/70 hover:scale-105'
                  }`}
                >
                  <div className='absolute inset-0 opacity-10 bg-[url("https://www.transparenttextures.com/patterns/cubes.png")]' />

                  <div className={`relative z-10 w-9 h-9 rounded-2xl flex items-center justify-center transition-colors font-black text-lg ${isActive ? 'bg-white/20 text-white' : 'bg-[color:var(--brand-primary)/0.12] text-[color:var(--brand-primary)]'}`}>
                      {initial}
                  </div>
                  <div className='relative z-10 text-left w-full'>
                      <span className='block font-black text-[10px] sm:text-xs leading-tight line-clamp-1 break-words tracking-tighter uppercase'>{cat.name}</span>
                      <span className={`text-[8px] font-black mt-1 inline-block uppercase tracking-tighter ${isActive ? 'text-white/70' : 'text-[color:var(--brand-primary)]'}`}>
                          {count} items
                      </span>
                  </div>
                </button>
              )
            })}

            {/* Membership Promo Card to fill space */}
            {showPromo && (
               <button
                  onClick={() => setActiveTab('membership')}
                  className={`${mobileSpanClass} sm:col-span-1 md:w-36 relative overflow-hidden rounded-[1.5rem] p-3 flex flex-col justify-between transition-all duration-300 border border-gray-200/70 bg-gradient-to-br from-amber-50 to-orange-50 hover:border-gray-200/70 active:scale-95 group`}
                >
                    <div className='absolute inset-0 opacity-20 bg-[url("https://www.transparenttextures.com/patterns/cubes.png")]' />
                    <div className='absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-amber-200 to-orange-200 opacity-20 rounded-bl-[2rem]' />

                    <div className='relative z-10 w-9 h-9 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform'>
                        <Crown size={18} />
                    </div>
                    
                    <div className='relative z-10 text-left w-full'>
                        <span className='block font-black text-xs sm:text-sm leading-tight text-amber-900 tracking-tight uppercase'>
                             Join<br/>Members
                        </span>
                        <div className='mt-1.5 flex items-center text-[10px] font-bold text-amber-700 bg-amber-100 w-fit px-1.5 py-0.5 rounded-md'>
                            Get Perks <Zap size={8} className="ml-1 fill-current" />
                        </div>
                    </div>
               </button>
            )}
        </div>
      )
  }

  return (
    <Layout>
      <div
        className='min-h-screen bg-[#FAFAFA] pb-20'
        style={{
          ['--brand-primary']: brandColor,
          ['--brand-primary-dark']: brandColorDark,
        }}
      >
        <div className='max-w-7xl mx-auto px-3 py-4 md:px-6 md:py-8'>
            
            {renderHeader()}

          
            
            <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
            
            {activeTab === 'browse' && (
                <div className='animate-fadeIn'>
                    {renderCategories()}
                    
                    {isLoading ? (
                        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                            {[...Array(6)].map((_, i) => <ServiceCardSkeleton key={i} />)}
                        </div>
                    ) : browseServices.length > 0 ? (
                        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                            {browseServices.map(service => (
                                <ServiceCard key={service._id} service={service} onSelect={onServiceSelect} />
                            ))}
                        </div>
                    ) : (
                        <div className='text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-gray-200/70'>
                            <p className='text-gray-400 font-bold'>No services found matching that criteria.</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'membership' && (
                <div className='animate-fadeIn'>

                    {isLoading ? (
                        <div className='grid grid-cols-1 gap-6 md:px-8'>
                             {[...Array(3)].map((_, i) => <ServiceCardSkeleton key={i} />)}
                        </div>
                    ) : (
                        <div className='grid grid-cols-1 gap-6 md:px-8'>
                             {/* Location Membership Plans */}
                             {locationMembershipPlans.map((plan, index) => (
                                 <MembershipCard 
                                    service={{
                                        _id: `location-membership-${index}`,
                                        name: plan.name,
                                        description: plan.description,
                                        basePrice: plan.price,
                                        duration: 0,
                                        categoryId: { name: 'Membership' }
                                    }} 
                                    membership={plan}
                                    key={`location-membership-plan-${index}`}
                                 />
                             ))}
                             {/* Real Memberships from Services */}
                             {membershipServices.map(service => (
                                <MembershipCard 
                                    key={service._id} 
                                    service={service} 
                                    onSelect={onServiceSelect} 
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'treatment' && (
                <div className='animate-fadeIn'>
                     <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                        {services && services.length > 0 ? (
                            services.map(service => (
                                <ServiceCard key={service._id} service={service} onSelect={onServiceSelect} />
                            ))
                        ) : (
                             <div className='col-span-full text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-gray-200/70'>
                                <p className='text-gray-400 font-bold'>No treatments available.</p>
                            </div>
                        )}
                     </div>
                </div>
            )}

        </div>
      </div>
    </Layout>
  )
}

const ServiceCatalogPage = () => {
  const navigate = useNavigate()
  const { locationId } = useBranding()
  const withSpaParam = (path) =>
    locationId ? `${path}?spa=${encodeURIComponent(locationId)}` : path
  return (
    <ServiceCatalog
      onServiceSelect={(s) => navigate(withSpaParam(`/services/${s._id}`))}
    />
  )
}

export default ServiceCatalogPage
