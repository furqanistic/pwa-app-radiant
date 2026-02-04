// client/src/pages/Bookings/ServiceCatalogPage.jsx - HIGH-END PREMIUM DESIGN
import {
  useActiveServices,
  useCategories,
} from '@/hooks/useServices'
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

// ==========================================
// 2. COMPONENTS
// ==========================================

// Premium Tab Navigation - Chunky Pills
const TabNavigation = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'browse', label: 'Browse' },
    { id: 'membership', label: 'Memberships' },
    { id: 'treatment', label: 'Treatments' },
  ]

  return (
    <div className='flex p-1.5 bg-white/60 backdrop-blur-xl border-2 border-pink-100 rounded-[2rem] mb-8 w-fit mx-auto shadow-sm'>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-8 py-3 rounded-[1.7rem] text-sm font-bold transition-all duration-300 ${
            activeTab === tab.id
              ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-200 scale-105'
              : 'text-gray-500 hover:text-pink-600 hover:bg-pink-50/50'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// Premium Membership Card - Dark "Black Card" Aesthetic
const MembershipCard = ({ service, onSelect }) => (
    <div 
        onClick={() => onSelect(service)}
        className="relative overflow-hidden rounded-[2.5rem] p-6 md:p-10 text-white cursor-pointer group transition-all duration-300 hover:scale-[1.01] bg-gray-900 border border-gray-800 shadow-2xl h-full flex flex-col justify-center"
    >
        {/* Background - Dark Premium Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-[#1A1A1A] to-black" />
        
        {/* Decorative Gold Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-500/5 blur-[60px] rounded-full pointer-events-none" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay" />
        
        {/* Shine Effect on Hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none bg-gradient-to-tr from-transparent via-white/5 to-transparent" />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 items-center h-full">
            {/* Left Side: Identity & Info */}
            <div className="md:col-span-7 flex flex-col h-full justify-between">
                <div>
                    <div className="flex justify-between items-start mb-6">
                        <div className="bg-gradient-to-br from-amber-200 to-yellow-600 p-3 rounded-2xl text-amber-900 shadow-lg shadow-amber-900/20">
                            <Crown size={28} strokeWidth={2} />
                        </div>
                        <div className="text-right md:text-left md:hidden">
                            <span className="block text-[10px] font-bold text-amber-500 tracking-[0.2em] uppercase mb-1">Monthly</span>
                            <span className="text-3xl font-black text-white tracking-tight">${service.basePrice}</span>
                        </div>
                    </div>

                    <h3 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-100 to-amber-200 mb-4 tracking-tight">
                        {service.name}
                    </h3>
                    <p className="text-gray-400 text-sm md:text-base font-medium leading-relaxed max-w-sm">
                        {service.description}
                    </p>
                </div>
                
                <div className="hidden md:block mt-8">
                     <span className="block text-[10px] font-bold text-amber-500 tracking-[0.2em] uppercase mb-1">Price</span>
                     <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-black text-white tracking-tighter">${service.basePrice}</span>
                        <span className="text-sm font-bold text-gray-500">/ month</span>
                     </div>
                </div>
            </div>

            {/* Divider (Mobile Only) */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-700 to-transparent md:hidden" />
            
            {/* Desktop Divider (Vertical) */}
            <div className="hidden md:block w-px h-full bg-gradient-to-b from-transparent via-gray-800 to-transparent absolute left-[60%]" />

            {/* Right Side: Perks & Action */}
            <div className="md:col-span-5 flex flex-col h-full justify-center md:pl-6">
                <ul className="space-y-4 mb-8">
                     <li className="flex items-center gap-3 text-sm md:text-base font-bold text-gray-300">
                        <div className="p-1.5 rounded-full bg-amber-500/20 text-amber-400">
                            <Zap size={12} fill="currentColor" />
                        </div>
                        <span>Priority Booking</span>
                     </li>
                     <li className="flex items-center gap-3 text-sm md:text-base font-bold text-gray-300">
                        <div className="p-1.5 rounded-full bg-amber-500/20 text-amber-400">
                             <Sparkles size={12} fill="currentColor" />
                        </div>
                        <span>Free Premium Facial</span>
                     </li>
                     <li className="flex items-center gap-3 text-sm md:text-base font-bold text-gray-300">
                        <div className="p-1.5 rounded-full bg-amber-500/20 text-amber-400">
                            <Crown size={12} fill="currentColor" />
                        </div>
                        <span>15% Product Discount</span>
                     </li>
                </ul>

                <button 
                    onClick={(e) => e.stopPropagation()} 
                    className="w-full bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 text-amber-950 font-black py-3.5 rounded-xl shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-all active:scale-95 flex items-center justify-center gap-2 tracking-wide uppercase text-xs md:text-sm whitespace-nowrap"
                >
                    Join Exclusive Club
                </button>
            </div>
        </div>
    </div>
)

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
    : 'border-pink-100 from-pink-50/50 to-white'
  
  const accentColor = isMembership ? 'text-amber-500' : 'text-pink-500'

  // DEMO LOGIC: Simulate Member Price if not explicitly in data (for visual demo)
  // In real app, check service.memberPrice
  const hasMemberPerk = !isMembership && (service.name.length % 2 === 0 || service.basePrice > 50); 
  const memberPrice = hasMemberPerk ? (service.basePrice > 100 ? 0 : Math.floor(service.basePrice * 0.8)) : null;

  return (
    <div
      onClick={() => onSelect(service)}
      className={`relative group cursor-pointer bg-gradient-to-br ${containerClasses} rounded-[2rem] border-2 p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-pink-100/50 hover:border-pink-200`}
    >
      {/* Image Container */}
      <div className='relative h-48 rounded-[1.5rem] overflow-hidden mb-4 shadow-sm bg-gray-100'>
        <img
          src={
            service.image ||
            'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=800&auto=format&fit=crop&q=60'
          }
          alt={service.name}
          className='w-full h-full object-cover transition-transform duration-700 group-hover:scale-110'
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
          <h3 className='text-xl font-black text-gray-900 leading-tight group-hover:text-pink-600 transition-colors'>
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
                           <span className='text-sm font-bold text-gray-400 line-through decoration-pink-300'>${service.basePrice}</span>
                       </>
                   ) : (
                       <span className='text-2xl font-black text-gray-900'>${service.basePrice}</span>
                   )}
               </div>
           </div>

           <button className='bg-gray-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-transform active:scale-95 group-hover:bg-pink-500'>
               Book
           </button>
        </div>
      </div>
    </div>
  )
}

// Clean Skeleton
const ServiceCardSkeleton = () => (
    <div className='bg-white rounded-[2rem] border-2 border-gray-100 p-4 h-[340px]'>
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

  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const { data: categories = [] } = useCategories(true) // Enable counts
  const { services, isLoading } = useActiveServices({
    search: debouncedSearchTerm,
  })

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
    <div className='relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-pink-600 via-rose-500 to-pink-700 text-white p-6 md:p-12 mb-8'>
        <div className='absolute inset-0 bg-[url("https://www.transparenttextures.com/patterns/cubes.png")] opacity-10 mix-blend-overlay' />
        
        <div className='relative z-10 flex flex-col md:flex-row items-center md:items-end justify-between gap-6'>
            <div className='text-center md:text-left space-y-4 max-w-2xl w-full'>
                <div className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-[10px] md:text-xs font-bold tracking-wider uppercase mx-auto md:mx-0'>
                    Premium Treatments
                </div>
                {/* Fixed: One line on mobile via text scaling */}
                <h1 className='text-[2.5rem] sm:text-4xl md:text-6xl font-black tracking-tighter leading-none whitespace-nowrap'>
                    Find Your <span className='text-pink-100'>Glow Up.</span>
                </h1>
                <p className='text-lg text-white/90 font-medium max-w-md hidden md:block'>
                    Browse our exclusive selection of beauty services and treatments designed just for you.
                </p>
            </div>
            
            {/* Search Input Integrated in Header */}
            <div className='w-full md:w-auto min-w-[300px]'>
               <div className='relative group'>
                  <div className='absolute inset-0 bg-white/20 blur-xl rounded-full group-hover:bg-white/30 transition-all' />
                  <div className='relative bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center p-2 transition-all group-hover:bg-white/20'>
                      <Search className='text-pink-100 ml-3 mr-2' size={20} />
                      <input 
                        type="text" 
                        placeholder="Search services..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className='bg-transparent border-none text-white placeholder-pink-100 focus:outline-none w-full font-medium py-2'
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
      // If remainder is 0 (e.g., 3 items), row full. Start new row. Span 3? Or just 1.
      // User specifically requested filling the "space of 2".
      const mobileSpanClass = remainder === 1 ? 'col-span-2' : 'col-span-1'
      const showPromo = true

      return (
        <div className='grid grid-cols-3 sm:grid-cols-4 gap-3 mb-8 md:flex md:flex-wrap md:justify-center md:gap-4'>
            <button
              onClick={() => setSelectedCategory('all')}
              className={`md:w-36 relative overflow-hidden aspect-square rounded-[1.5rem] p-3 flex flex-col justify-between transition-all duration-300 border-2 active:scale-95 ${
                selectedCategory === 'all'
                  ? 'bg-gray-900 text-white border-gray-900 scale-105 z-10 shadow-xl shadow-gray-200'
                  : 'bg-white text-gray-500 border-gray-100 hover:border-pink-200 hover:scale-105'
              }`}
            >
              <div className='absolute inset-0 opacity-10 bg-[url("https://www.transparenttextures.com/patterns/cubes.png")]' />
              
              <div className={`relative z-10 w-9 h-9 rounded-2xl flex items-center justify-center transition-colors ${selectedCategory === 'all' ? 'bg-white/20' : 'bg-gray-100 group-hover:bg-pink-50'}`}>
                  <Search size={18} className={selectedCategory === 'all' ? 'text-white' : 'text-gray-500'} />
              </div>
              <div className='relative z-10 text-left'>
                  <span className='block font-black text-xs sm:text-sm leading-tight tracking-tight'>All<br/>Services</span>
                  <span className='text-[10px] opacity-60 font-medium mt-1.5 block bg-white/10 w-fit px-1.5 py-0.5 rounded-md backdrop-blur-sm'>
                      {services?.length || 0} items
                  </span>
              </div>
            </button>
            
            {categories.map((cat) => {
              const isActive = selectedCategory === cat._id;
              const Icon = getCategoryIcon(cat.name);
              const count = categoryCounts[cat._id] || 0;
              
              return (
                <button
                  key={cat._id}
                  onClick={() => setSelectedCategory(cat._id)}
                  className={`md:w-36 group relative overflow-hidden aspect-square rounded-[1.5rem] p-3 flex flex-col justify-between transition-all duration-300 border-2 active:scale-95 ${
                    isActive
                      ? 'bg-gradient-to-br from-pink-500 to-rose-600 text-white border-pink-500 scale-105 z-10 shadow-xl shadow-pink-200'
                      : 'bg-white text-gray-600 border-gray-100 hover:border-pink-200 hover:scale-105'
                  }`}
                >
                  <div className='absolute inset-0 opacity-10 bg-[url("https://www.transparenttextures.com/patterns/cubes.png")]' />

                  <div className={`relative z-10 w-9 h-9 rounded-2xl flex items-center justify-center transition-colors ${isActive ? 'bg-white/20' : 'bg-pink-50 group-hover:bg-pink-100'}`}>
                      <Icon size={18} className={`transition-colors ${isActive ? 'text-white' : 'text-pink-500'}`} />
                  </div>
                  <div className='relative z-10 text-left w-full'>
                      <span className='block font-black text-xs sm:text-sm leading-tight line-clamp-1 break-words tracking-tight'>{cat.name}</span>
                      <span className={`text-[10px] font-bold mt-1.5 inline-block px-1.5 py-0.5 rounded-md backdrop-blur-sm ${isActive ? 'text-white bg-white/20' : 'text-pink-500 bg-pink-50'}`}>
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
                  className={`${mobileSpanClass} sm:col-span-1 md:w-36 relative overflow-hidden rounded-[1.5rem] p-3 flex flex-col justify-between transition-all duration-300 border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 hover:border-amber-300 active:scale-95 group`}
                >
                    <div className='absolute inset-0 opacity-20 bg-[url("https://www.transparenttextures.com/patterns/cubes.png")]' />
                    <div className='absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-amber-200 to-orange-200 opacity-20 rounded-bl-[2rem]' />

                    <div className='relative z-10 w-9 h-9 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform'>
                        <Crown size={18} />
                    </div>
                    
                    <div className='relative z-10 text-left w-full'>
                        <span className='block font-black text-xs sm:text-sm leading-tight text-amber-900 tracking-tight'>
                             Join<br/>Membership
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
      <div className='min-h-screen bg-[#FAFAFA] pb-20'>
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
                        <div className='text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100'>
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
                             {/* Demo Membership for visual verification */}
                             <MembershipCard 
                                service={{
                                    _id: 'demo-vip',
                                    name: 'Gold Glow Membership',
                                    description: 'Unlock the ultimate glow up with our exclusive VIP tier.',
                                    basePrice: 99,
                                    duration: 0,
                                    image: 'https://images.unsplash.com/photo-1596178065248-7241d9a05fec?auto=format&fit=crop&q=80&w=800', 
                                    categoryId: { name: 'Membership' }
                                }} 
                                onSelect={onServiceSelect} 
                             />
                             {/* Real Memberships */}
                             {membershipServices.map(service => (
                                <MembershipCard key={service._id} service={service} onSelect={onServiceSelect} />
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
                             <div className='col-span-full text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100'>
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
  return <ServiceCatalog onServiceSelect={(s) => navigate(`/services/${s._id}`)} />
}

export default ServiceCatalogPage
