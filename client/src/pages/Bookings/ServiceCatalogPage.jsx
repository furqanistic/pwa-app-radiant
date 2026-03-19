// client/src/pages/Bookings/ServiceCatalogPage.jsx - HIGH-END PREMIUM DESIGN
import MembershipPlansGrid from '@/components/Membership/MembershipPlansGrid'
import { useBranding } from '@/context/BrandingContext'
import {
  useActiveServices,
  useCategories,
} from '@/hooks/useServices'
import { resolveImageUrl } from '@/lib/imageHelpers'
import { locationService } from '@/services/locationService'
import stripeService from '@/services/stripeService'
import { useQuery } from '@tanstack/react-query'
import {
  Clock,
  Crown,
  Droplets,
  Gem,
  Heart,
  Lock,
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
import { toast } from 'sonner'
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

const getServiceImageSource = (service) =>
  service?.image ||
  service?.imageUrl ||
  service?.serviceImage ||
  service?.service?.image ||
  service?.serviceId?.image ||
  service?.linkedService?.image ||
  service?.linkedServiceId?.image ||
  ''

const formatPrice = (value) => {
  if (!Number.isFinite(Number(value))) return '$0'
  const amount = Number(value)
  return `$${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)}`
}

const getBestMemberDealPrice = (service) => {
  if (!Array.isArray(service?.membershipPricing)) return null
  const activePrices = service.membershipPricing
    .filter((entry) => entry?.isActive !== false)
    .map((entry) => Number(entry.price))
    .filter((price) => Number.isFinite(price) && price >= 0)

  if (activePrices.length === 0) return null
  return Math.min(...activePrices)
}

const isMembershipEligible = (currentUser) => {
  if (!currentUser) return false
  if (['super-admin', 'admin', 'spa', 'enterprise'].includes(currentUser.role)) {
    return true
  }

  const candidateStatuses = [
    currentUser?.membership?.status,
    currentUser?.membershipStatus,
    currentUser?.activeMembership?.status,
    currentUser?.subscription?.status,
  ]
    .filter(Boolean)
    .map((status) => String(status).toLowerCase())

  if (currentUser?.membership?.isActive || currentUser?.activeMembership?.isActive) {
    return true
  }

  return candidateStatuses.some((status) =>
    ['active', 'trialing', 'paid', 'current'].includes(status)
  )
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
const ServiceCard = ({
  service,
  onSelect,
  isMembership = false,
  currentUser,
  locationMembershipPlans = [],
  onViewMembership,
}) => {
  const regularPrice = Number(service?.basePrice) || 0
  const memberDealPrice = getBestMemberDealPrice(service)
  const hasMemberDeal =
    Number.isFinite(memberDealPrice) &&
    memberDealPrice >= 0 &&
    memberDealPrice < regularPrice
  const isEligible = isMembershipEligible(currentUser)
  const savePercent =
    hasMemberDeal && regularPrice > 0
      ? Math.round(((regularPrice - memberDealPrice) / regularPrice) * 100)
      : 0
  const membershipJoinPrice = Number(locationMembershipPlans?.[0]?.price)
  const description = service?.description || 'Personalized treatment tailored to your wellness goals.'
  const categoryLabel = service.categoryId?.name || 'Service'
  const durationLabel = service?.duration ? `${service.duration} mins` : 'Flexible time'
  const bookLabel = regularPrice > 0 ? `Book for ${formatPrice(regularPrice)}` : 'Book now'
  const saveLabel =
    savePercent > 0 ? `Save ${savePercent}%` : 'Member deal'
  const cardStyle = isMembership
    ? {
        background:
          'linear-gradient(180deg, color-mix(in srgb, #f59e0b 4%, #ffffff) 0%, #ffffff 35%)',
        borderColor: 'color-mix(in srgb, #f59e0b 16%, #e5e7eb)',
      }
    : {
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--brand-primary) 4%, #ffffff) 0%, #ffffff 35%)',
        borderColor: 'color-mix(in srgb, var(--brand-primary) 14%, #e5e7eb)',
      }
  const regularPriceStyle = {
    borderColor: 'rgba(15, 23, 42, 0.08)',
    boxShadow: '0 10px 22px -24px rgba(15, 23, 42, 0.42)',
  }
  const memberPanelStyle = isMembership
    ? {
        background:
          'linear-gradient(135deg, color-mix(in srgb, #f59e0b 10%, #ffffff) 0%, #ffffff 65%)',
        borderColor: 'color-mix(in srgb, #f59e0b 18%, #d1d5db)',
        boxShadow: '0 18px 36px -30px rgba(245, 158, 11, 0.3)',
      }
    : {
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 12%, #ffffff) 0%, #ffffff 70%)',
        borderColor: 'color-mix(in srgb, var(--brand-primary) 18%, #d1d5db)',
        boxShadow: '0 18px 36px -30px color-mix(in srgb, var(--brand-primary) 26%, transparent)',
      }
  const memberBadgeStyle = isMembership
    ? {
        backgroundColor: 'color-mix(in srgb, #f59e0b 14%, #ffffff)',
        color: '#b45309',
      }
    : {
        backgroundColor: 'color-mix(in srgb, var(--brand-primary) 14%, #ffffff)',
        color: 'color-mix(in srgb, var(--brand-primary) 84%, #12372d)',
      }
  const memberButtonStyle = isMembership
    ? {
        background: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
        boxShadow: '0 16px 28px -22px rgba(180, 83, 9, 0.45)',
      }
    : {
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 88%, #0f172a) 0%, color-mix(in srgb, var(--brand-primary-dark) 82%, #052e2b) 100%)',
        boxShadow: '0 16px 28px -22px color-mix(in srgb, var(--brand-primary) 36%, transparent)',
      }

  return (
    <div
      onClick={() => onSelect(service)}
      className='group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[1.35rem] border p-2.5 shadow-[0_14px_34px_-28px_rgba(15,23,42,0.2)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_42px_-32px_rgba(15,23,42,0.24)] sm:rounded-[1.55rem] sm:p-3'
      style={cardStyle}
    >
      <div className='relative mb-3 overflow-hidden rounded-[1.05rem] bg-slate-100 shadow-[0_16px_30px_-28px_rgba(15,23,42,0.22)] sm:mb-3.5 sm:rounded-[1.15rem]'>
        <img
          src={resolveImageUrl(
            getServiceImageSource(service),
            'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=800&auto=format&fit=crop&q=60',
            { width: 800, height: 600 }
          )}
          alt={service.name}
          className='aspect-[16/9] w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]'
          loading='lazy'
          decoding='async'
        />
        <div className='absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950/18 via-slate-950/4 to-transparent opacity-70' />
        <div className='absolute left-3 top-3'>
          <div className='rounded-full border border-white/70 bg-white/92 px-2 py-1 shadow-sm backdrop-blur-md'>
            <span className='flex items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-slate-700 sm:text-[9px]'>
              {isMembership && <Crown size={12} />}
              {categoryLabel}
            </span>
          </div>
        </div>
      </div>

      <div className='flex flex-1 flex-col'>
        <div className='mb-2 px-1 sm:mb-2.5'>
          <h3 className='text-[1.08rem] font-semibold leading-[1.1] tracking-[-0.035em] text-slate-950 transition-colors group-hover:text-[color:var(--brand-primary)] sm:text-[1.18rem]'>
            {service.name}
          </h3>
          <p className='mt-1.5 line-clamp-3 text-[0.74rem] font-normal leading-[1.42] text-slate-500 sm:text-[0.78rem]'>
            {description}
          </p>
        </div>

        <div
          className='mb-2 rounded-[1.05rem] border bg-white px-3 py-2.5 sm:mb-2.5 sm:rounded-[1.15rem] sm:px-3.5 sm:py-3'
          style={regularPriceStyle}
        >
          <p className='text-[0.7rem] font-medium tracking-[-0.01em] text-slate-500 sm:text-[0.74rem]'>
            Regular Price
          </p>
          <p className='mt-1 text-[1.95rem] font-semibold leading-none tracking-[-0.05em] text-slate-950 sm:text-[2.15rem]'>
            {formatPrice(regularPrice)}
          </p>
        </div>

        {hasMemberDeal && (
          <div
            className='mb-2.5 rounded-[1.1rem] border px-3 py-2.5 sm:rounded-[1.2rem] sm:px-3.5 sm:py-3'
            style={memberPanelStyle}
          >
            <div className='mb-1.5 flex flex-wrap items-center gap-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.12em] sm:text-[0.7rem]'>
              <span className='inline-flex items-center gap-1.5' style={{ color: memberBadgeStyle.color }}>
                <Crown size={14} className='shrink-0' />
                Member Price
              </span>
            </div>
            <div className='mb-2.5 flex items-center justify-between gap-2 sm:mb-3'>
              <div className='min-w-0'>
                <p
                  className='text-[1.8rem] font-semibold leading-none tracking-[-0.05em] sm:text-[1.95rem]'
                  style={{ color: memberBadgeStyle.color }}
                >
                  {formatPrice(memberDealPrice)}
                </p>
              </div>
              <div
                className='inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[0.68rem] font-semibold tracking-[-0.02em] sm:text-[0.72rem]'
                style={memberBadgeStyle}
              >
                {saveLabel}
              </div>
            </div>
            {!isEligible && (
              <>
                <p className='mb-2 flex items-start gap-2 text-[0.72rem] font-normal leading-[1.38] text-slate-700 sm:text-[0.76rem]'>
                  <span
                    className='mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full'
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--brand-primary) 10%, #ffffff)',
                      color: 'color-mix(in srgb, var(--brand-primary) 88%, #0f172a)',
                    }}
                  >
                    <Lock size={12} />
                  </span>
                  {Number.isFinite(membershipJoinPrice)
                    ? `Join from ${formatPrice(membershipJoinPrice)}/month and unlock this deal instantly.`
                    : 'Join membership to unlock this member deal instantly.'}
                </p>
                <button
                  type='button'
                  onClick={(e) => {
                    e.stopPropagation()
                    onViewMembership?.()
                  }}
                  className='inline-flex min-h-[2.45rem] w-full items-center justify-center gap-2 rounded-full px-3 py-2 text-[0.76rem] font-semibold tracking-[-0.02em] text-white transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99] sm:text-[0.8rem]'
                  style={memberButtonStyle}
                >
                  <Crown size={14} className='fill-current' />
                  Join & Save {savePercent}%
                </button>
              </>
            )}
          </div>
        )}

        <div className='mt-auto flex items-center gap-2 pt-0.5'>
          <div className='inline-flex min-h-[2.35rem] shrink-0 items-center justify-center gap-1.5 self-start rounded-full border border-slate-200/80 bg-slate-100/85 px-2.5 text-[0.68rem] font-medium uppercase tracking-[0.08em] text-slate-500 sm:min-w-[7.25rem] sm:px-3 sm:text-[0.72rem]'>
            <Clock size={14} />
            {durationLabel}
          </div>
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation()
              onSelect(service)
            }}
            className='inline-flex min-h-[2.35rem] flex-1 items-center justify-center rounded-full bg-slate-950 px-3.5 text-[0.74rem] font-semibold tracking-[-0.02em] text-white transition-all duration-300 hover:bg-[color:var(--brand-primary)] active:scale-[0.99] sm:text-[0.78rem]'
          >
            {bookLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// 3. MAIN PAGE
// ==========================================

const ServiceCatalog = ({ onServiceSelect }) => {
  const [activeTab, setActiveTab] = useState('browse')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const { currentUser } = useSelector((state) => state.user)
  const { branding, locationId } = useBranding()
  const effectiveLocationId =
    locationId ||
    currentUser?.selectedLocation?.locationId ||
    currentUser?.spaLocation?.locationId ||
    ''
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

  const { data: categories = [] } = useCategories(true) // Enable counts
  const { services, isLoading, isFetching } = useActiveServices({
    search: debouncedSearchTerm,
    locationId: effectiveLocationId
  })

  // Fetch location data if needed (primarily for manager/admin to get latest edits)
  const { data: locationData } = useQuery({
    queryKey: ['my-location'],
    queryFn: () => locationService.getMyLocation(),
    enabled: !!(currentUser?.role === 'spa' || currentUser?.role === 'admin' || currentUser?.role === 'super-admin'),
  })

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
        s.categoryId?.name?.toLowerCase().includes('membership') ||
        s.description?.toLowerCase().includes('subscription') ||
        (Array.isArray(s.membershipPricing) &&
          s.membershipPricing.some((entry) => entry?.isActive !== false))
    )
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
                isLoading && (!services || services.length === 0) ? (
                    <div className='flex flex-col items-center justify-center min-h-[48vh]'>
                      <div className='w-12 h-12 rounded-full border-4 border-gray-200 border-t-[color:var(--brand-primary)] animate-spin' />
                      <span className='mt-4 text-base text-gray-700 font-medium'>Loading services...</span>
                    </div>
                ) : (
                <div className='animate-fadeIn'>
                    {renderCategories()}
                    {browseServices.length > 0 ? (
                        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity ${isFetching ? 'opacity-70' : 'opacity-100'}`}>
                            {browseServices.map(service => (
                                <ServiceCard
                                  key={service._id || service.serviceId || service.id || service.name}
                                  service={service}
                                  onSelect={onServiceSelect}
                                  currentUser={currentUser}
                                  locationMembershipPlans={locationMembershipPlans}
                                  onViewMembership={() => setActiveTab('membership')}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className='text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-gray-200/70'>
                            <p className='text-gray-400 font-bold'>No services found matching that criteria.</p>
                        </div>
                    )}
                </div>
                )
            )}

            {activeTab === 'membership' && (
                isLoading && (!services || services.length === 0) ? (
                    <div className='flex flex-col items-center justify-center min-h-[48vh]'>
                      <div className='w-12 h-12 rounded-full border-4 border-gray-200 border-t-[color:var(--brand-primary)] animate-spin' />
                      <span className='mt-4 text-base text-gray-700 font-medium'>Loading memberships...</span>
                    </div>
                ) : (
                <div className='animate-fadeIn'>
                    {
                        <MembershipPlansGrid
                          plans={locationMembershipPlans}
                          membershipServices={membershipServices}
                          onSelectService={onServiceSelect}
                          includeServiceMemberships={false}
                          className='grid grid-cols-1 gap-6 md:px-8'
                        />
                    }
                </div>
                )
            )}

            {activeTab === 'treatment' && (
                isLoading && (!services || services.length === 0) ? (
                    <div className='flex flex-col items-center justify-center min-h-[48vh]'>
                      <div className='w-12 h-12 rounded-full border-4 border-gray-200 border-t-[color:var(--brand-primary)] animate-spin' />
                      <span className='mt-4 text-base text-gray-700 font-medium'>Loading treatments...</span>
                    </div>
                ) : (
                <div className='animate-fadeIn'>
                     <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                        {services && services.length > 0 ? (
                            services.map(service => (
                                <ServiceCard
                                  key={service._id || service.serviceId || service.id || service.name}
                                  service={service}
                                  onSelect={onServiceSelect}
                                  currentUser={currentUser}
                                  locationMembershipPlans={locationMembershipPlans}
                                  onViewMembership={() => setActiveTab('membership')}
                                />
                            ))
                        ) : (
                             <div className='col-span-full text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-gray-200/70'>
                                <p className='text-gray-400 font-bold'>No treatments available.</p>
                            </div>
                        )}
                     </div>
                </div>
                )
            )}

        </div>
      </div>
    </Layout>
  )
}

const ServiceCatalogPage = () => {
  const navigate = useNavigate()
  const { currentUser } = useSelector((state) => state.user)
  const { locationId } = useBranding()
  const effectiveLocationId =
    locationId ||
    currentUser?.selectedLocation?.locationId ||
    currentUser?.spaLocation?.locationId ||
    ''
  const withSpaParam = (path) =>
    effectiveLocationId ? `${path}?spa=${encodeURIComponent(effectiveLocationId)}` : path

  const handleServiceSelect = async (service, plan) => {
    if (plan && service?._id) {
      const checkoutLocationId =
        effectiveLocationId ||
        currentUser?.selectedLocation?.locationId ||
        currentUser?.spaLocation?.locationId

      if (!checkoutLocationId) {
        toast.error('Please select a location first.')
        return
      }

      try {
        const response = await stripeService.createMembershipCheckoutSession({
          serviceId: service._id,
          locationId: checkoutLocationId,
          planId: plan?._id || plan?.planId || plan?.id || null,
          planName: plan?.name || null,
          planPrice: Number(plan?.price),
        })

        if (response?.success && response?.sessionUrl) {
          window.location.href = response.sessionUrl
          return
        }
      } catch (error) {
        toast.error(
          error?.response?.data?.message ||
            'Failed to start membership checkout.'
        )
      }
    }

    navigate(withSpaParam(`/services/${service._id}`))
  }

  return (
    <ServiceCatalog
      onServiceSelect={handleServiceSelect}
    />
  )
}

export default ServiceCatalogPage
