// client/src/pages/Rewards/RewardsCatalogPage.jsx
import PointsCard from '@/components/Dashboard/PointsCard'
import BrandLottieLoader from '@/components/Common/BrandLottieLoader'
import { useClaimReward, useEnhancedRewardsCatalog } from '@/hooks/useRewards'
import {
    Award,
    Check,
    ChevronDown,
    DollarSign,
    Filter,
    Gift,
    Heart,
    ArrowUpRight,
    Pause,
    Percent,
    Search,
    SortAsc,
    Star,
    Plus,
    Users,
    Volume2,
    X,
    Zap,
} from 'lucide-react'
import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../Layout/Layout'
import { resolveImageUrl } from '@/lib/imageHelpers'
import { useBranding } from '@/context/BrandingContext'

const rewardTypes = [
  { id: 'all', name: 'All Rewards' },
  { id: 'add_on', name: 'Add-On' },
  { id: 'upgrade', name: 'Upgrade' },
  { id: 'credit', name: 'Service Credits' },
  { id: 'discount', name: 'Discounts' },
  { id: 'experience', name: 'Experiences' },
  { id: 'free_service', name: 'Free Services' },
  { id: 'service', name: 'Free Services' },
  { id: 'combo', name: 'Combo Deals' },
  { id: 'referral', name: 'Referral Rewards' },
]

// Premium Glass Dropdown Component
const PremiumDropdown = ({
  value,
  onChange,
  options,
  placeholder,
  icon: Icon,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedOption, setSelectedOption] = useState(
    options.find((opt) => opt.value === value) || options[0]
  )

  const handleSelect = (option) => {
    setSelectedOption(option)
    onChange(option.value)
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type='button'
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-10 bg-white border transition-all duration-200 rounded-[0.9rem] px-3 flex items-center justify-between group
        ${
          isOpen
            ? 'border-[color:var(--brand-primary)/0.3] shadow-[0_8px_24px_-18px_color-mix(in_srgb,var(--brand-primary)_45%,transparent)]'
            : 'border-[#ececef] hover:border-[color:var(--brand-primary)/0.22]'
        }
        `}
      >
        <div className='flex items-center gap-2 min-w-0'>
          {Icon && (
            <div
              className={`p-1.5 rounded-lg transition-colors ${
                isOpen
                  ? 'bg-[color:var(--brand-primary)/0.12] text-[color:var(--brand-primary)]'
                  : 'bg-[#f5f5f7] text-gray-500 group-hover:text-[color:var(--brand-primary)]'
              }`}
            >
              <Icon className='w-3.5 h-3.5' />
            </div>
          )}
          <span className='text-gray-700 font-medium text-[0.82rem] truncate'>
            {selectedOption?.label || placeholder}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
            isOpen
              ? 'rotate-180 text-[color:var(--brand-primary)]'
              : 'group-hover:text-[color:var(--brand-primary)]'
          }`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className='fixed inset-0 z-40 cursor-default'
            onClick={() => setIsOpen(false)}
          />
          <div className='absolute top-full left-0 right-0 mt-2 bg-white border border-[#ececef] rounded-2xl z-50 max-h-60 overflow-y-auto shadow-[0_12px_32px_-24px_rgba(0,0,0,0.25)] p-1.5 animate-in fade-in zoom-in-95 duration-200'>
            {options.map((option) => (
              <button
                type='button'
                key={option.value}
                onClick={() => handleSelect(option)}
                className={`w-full px-3 py-2 text-left rounded-xl transition-all flex items-center gap-2.5 text-[0.82rem] mb-0.5 last:mb-0 ${
                  selectedOption?.value === option.value
                    ? 'bg-[color:var(--brand-primary)/0.08] text-[color:var(--brand-primary)] font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {option.icon && (
                  <option.icon
                    className={`w-4 h-4 ${
                      selectedOption?.value === option.value
                        ? 'text-[color:var(--brand-primary)]'
                        : 'text-gray-400'
                    }`}
                  />
                )}
                <span className='truncate flex-1'>{option.label}</span>
                {selectedOption?.value === option.value && (
                  <Check className='w-4 h-4 text-[color:var(--brand-primary)]' />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Reward Card Component
const RewardCard = ({ reward, onClaim }) => {
  const [isClaiming, setIsClaiming] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const audioRef = useRef(null)
  const brandGradient = 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))'
  const fallbackImage =
    'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop'

  const toggleVoiceNote = (e) => {
    e.stopPropagation()
    if (!audioRef.current) return
    
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch(() => {
        setIsPlaying(false)
      })
    }
    setIsPlaying((prev) => !prev)
  }

  const canAfford = reward.canClaim

  const getRewardIcon = (type) => {
    const iconClassName = 'w-4 h-4 text-white drop-shadow-sm'
    switch (type) {
      case 'add_on':
        return <Plus className={iconClassName} />
      case 'upgrade':
        return <ArrowUpRight className={iconClassName} />
      case 'credit':
        return <DollarSign className={iconClassName} />
      case 'discount':
        return <Percent className={iconClassName} />
      case 'experience':
        return <Star className={iconClassName} />
      case 'free_service':
      case 'service':
        return <Gift className={iconClassName} />
      case 'combo':
        return <Star className={iconClassName} />
      case 'referral':
        return <Users className={iconClassName} />
      default:
        return <Award className={iconClassName} />
    }
  }

  const handleClaim = async () => {
    if (!canAfford || isClaiming) return

    setIsClaiming(true)
    setShowConfetti(true)

    try {
      await onClaim(reward._id)
      setTimeout(() => setShowConfetti(false), 2000)
    } catch {
      setShowConfetti(false)
    } finally {
      setIsClaiming(false)
    }
  }

  const getButtonText = () => {
    if (isClaiming) return 'Claiming...'
    if (canAfford) return 'Claim Reward'
    if (!reward.canClaimMoreInWindow) return 'Limit Reached'
    return `Need ${reward.pointsNeeded} more`
  }

  return (
    <div
      onClick={handleClaim}
      className={`relative h-full bg-white rounded-[1.35rem] overflow-hidden transition-all border flex flex-col shadow-[0_12px_34px_-28px_rgba(15,23,42,0.28)] ${
        canAfford
          ? 'hover:border-[#f9f9fa] hover:-translate-y-0.5 cursor-pointer group border-[#f9f9fa]'
          : 'opacity-60 grayscale border-[#f9f9fa] cursor-not-allowed'
      } ${isClaiming ? 'animate-pulse' : ''}`}
    >
      {/* Confetti Animation */}
      {showConfetti && (
        <div className='absolute inset-0 z-50 pointer-events-none overflow-hidden'>
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className='absolute w-2 h-2 bg-[color:var(--brand-primary)] rounded-full animate-ping'
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${1 + Math.random()}s`,
              }}
            />
          ))}
          {[...Array(6)].map((_, i) => (
            <div
              key={`heart-${i}`}
              className='absolute text-[color:var(--brand-primary)] animate-bounce'
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.3}s`,
              }}
            >
              <Heart className='w-3 h-3' />
            </div>
          ))}
        </div>
      )}

      <div className='relative h-32 sm:h-36 md:h-40 overflow-hidden'>
        <img
          src={resolveImageUrl(reward.image, fallbackImage, { width: 500, height: 300 })}
          alt={reward.name}
          className={`w-full h-full object-cover transition-transform duration-300 ${
            canAfford ? 'group-hover:scale-105' : ''
          }`}
          loading='lazy'
          decoding='async'
        />

        {/* Badges */}
        <div className='absolute top-2.5 left-2.5'>
          <span
            className='text-white px-2 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1 border border-white/25 shadow-sm'
            style={{ background: brandGradient }}
          >
            {getRewardIcon(reward.type)}
            <span className='hidden sm:inline'>
              {reward.typeDisplay ||
                rewardTypes.find((t) => t.id === reward.type)?.name ||
                reward.type}
            </span>
          </span>
        </div>

        <div className='absolute top-2.5 right-2.5'>
          <span className='bg-black/70 text-white px-2 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1'>
            <Zap className='w-3 h-3' />
            {reward.pointCost}
          </span>
        </div>

        {/* Voice Note Button */}
        {reward.voiceNoteUrl && (
          <div className='absolute bottom-2.5 right-2.5 z-30'>
            <button
              onClick={toggleVoiceNote}
              type='button'
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-lg ${
                isPlaying 
                  ? 'text-white animate-pulse' 
                  : 'bg-white/90 text-[color:var(--brand-primary)] hover:bg-white hover:scale-110'
              }`}
              style={isPlaying ? { background: brandGradient } : undefined}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <audio 
              ref={audioRef} 
              src={reward.voiceNoteUrl} 
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          </div>
        )}

        {/* Status Badge */}
        <div className='absolute bottom-2.5 left-2.5'>
          <span
            className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
              reward.status === 'active'
                ? 'bg-green-500 text-white'
                : 'bg-gray-500 text-white'
            }`}
          >
            {reward.status}
          </span>
        </div>
      </div>

      <div className='p-3.5 md:p-4 flex flex-1 flex-col'>
        <h3 className='text-[0.95rem] md:text-[1rem] font-semibold mb-1.5 text-gray-900 line-clamp-1 tracking-[-0.015em]'>
          {reward.name}
        </h3>

        <p className='text-[0.78rem] md:text-[0.82rem] mb-2.5 line-clamp-2 text-gray-600 leading-[1.4]'>
          {reward.description}
        </p>

        {/* Reward Value */}
        <div className='bg-[#fafafb] p-2.5 rounded-[0.8rem] mb-2.5 border border-[#f1f1f3]'>
          <div className='flex items-center justify-between'>
            <span className='text-[0.72rem] font-medium text-gray-700'>Value</span>
            <span className='font-semibold text-[0.9rem] text-gray-900'>
              {reward.displayValue}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className='grid grid-cols-2 gap-2 mb-3'>
          <div className='text-center bg-gray-50 rounded-[0.8rem] p-2.5 border border-[#f3f3f5]'>
            <div className='text-[0.64rem] text-gray-500 mb-1 uppercase tracking-[0.08em]'>Valid For</div>
            <div className='font-medium text-[0.75rem] text-gray-900 leading-tight'>
              {reward.validDays && reward.validDays > 0
                ? `${reward.validDays} days`
                : 'No expiry'}
            </div>
          </div>
          <div className='text-center bg-gray-50 rounded-[0.8rem] p-2.5 border border-[#f3f3f5]'>
            <div className='text-[0.64rem] text-gray-500 mb-1 uppercase tracking-[0.08em]'>Claim Limit</div>
            <div className='font-medium text-[0.75rem] text-gray-900 leading-tight'>
              {(reward.limitCount || reward.limit || 1)} per {(reward.limitDays || 30)} days
            </div>
          </div>
        </div>

        {/* Claim Button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleClaim()
          }}
          type='button'
          disabled={!canAfford || isClaiming}
          style={canAfford && !isClaiming ? { background: brandGradient } : undefined}
          className={`mt-auto w-full min-h-[2.5rem] py-2.5 rounded-[0.9rem] font-medium text-[0.82rem] transition-all flex items-center justify-center gap-2 ${
            isClaiming
              ? 'bg-[color:var(--brand-primary)] text-white cursor-wait'
              : canAfford
              ? 'text-white hover:brightness-105'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          } ${isClaiming ? 'animate-pulse' : ''}`}
        >
          {isClaiming ? (
            <>
              <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
              Claiming...
            </>
          ) : (
            getButtonText()
          )}
        </button>
      </div>
    </div>
  )
}

// Main Rewards Catalog Component
const RewardsCatalogPage = () => {
  const navigate = useNavigate()
  const { locationId } = useBranding()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [sortBy, setSortBy] = useState('pointCost-low')

  const withSpaParam = (path) => {
    if (!locationId) return path
    const separator = path.includes('?') ? '&' : '?'
    return `${path}${separator}spa=${encodeURIComponent(locationId)}`
  }
  const pageBrandGradient = 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))'

  const getLinkedServiceId = (reward) => {
    if (!reward) return null
    const linkedServices = Array.isArray(reward.linkedServices)
      ? reward.linkedServices
      : []
    const firstLinkedService = linkedServices[0] || null
    const value =
      reward.serviceId?._id ||
      reward.serviceId ||
      reward.linkedServiceId?._id ||
      reward.linkedServiceId ||
      reward.service?._id ||
      reward.linkedService?._id ||
      reward.linkedService?.serviceId ||
      firstLinkedService?.serviceId?._id ||
      firstLinkedService?.serviceId ||
      firstLinkedService?._id
    return value ? String(value) : null
  }

  // API calls using React Query hooks
  const {
    rewards = [],
    isLoading,
    isFetching,
    error,
  } = useEnhancedRewardsCatalog({
    search: searchTerm,
    type: selectedType === 'all' ? '' : selectedType,
    sortBy: sortBy,
  })

  const claimRewardMutation = useClaimReward({
    onSuccess: (data, rewardId) => {
      // Toast handled by hook
      const claimedReward = rewards.find((reward) => reward._id === rewardId)
      const claimedPayload =
        data?.data?.claimedReward ||
        data?.data?.reward ||
        data?.data?.userReward ||
        data?.claimedReward ||
        data?.reward ||
        null
      const linkedServiceId =
        getLinkedServiceId(claimedPayload) || getLinkedServiceId(claimedReward)
      if (linkedServiceId) {
        navigate(withSpaParam(`/services/${linkedServiceId}`), {
          state: {
            autoApplyRewardId: rewardId,
            autoApplyRewardName:
              claimedPayload?.name || claimedReward?.name || 'Reward',
          },
        })
      }
    },
    onError: () => {
      // Toast handled by hook
    },
  })

  // Enhanced filter options with icons
  const rewardTypeOptions = [
    { value: 'all', label: 'All', icon: Award },
    { value: 'add_on', label: 'Add-On', icon: Plus },
    { value: 'upgrade', label: 'Upgrade', icon: ArrowUpRight },
    { value: 'credit', label: 'Credits', icon: DollarSign },
    { value: 'discount', label: 'Discounts', icon: Percent },
    { value: 'experience', label: 'Experiences', icon: Star },
    { value: 'free_service', label: 'Free Service', icon: Gift },
    { value: 'service', label: 'Services', icon: Gift },
    { value: 'combo', label: 'Combos', icon: Star },
    { value: 'referral', label: 'Referrals', icon: Users },
  ]

  const sortOptions = [
    { value: 'pointCost-low', label: 'Low to High', icon: SortAsc },
    { value: 'pointCost-high', label: 'High to Low', icon: SortAsc },
    { value: 'value-high', label: 'Best Value', icon: DollarSign },
    { value: 'name', label: 'A-Z', icon: SortAsc },
  ]

  // Loading state
  if (isLoading && rewards.length === 0) {
    return (
      <Layout>
        <BrandLottieLoader label='Loading rewards...' className='min-h-[55vh] px-4' />
      </Layout>
    )
  }

  // Error state
  if (error) {
    return (
      <Layout>
        <div className='flex items-center justify-center min-h-[50vh] px-4'>
          <div className='text-center'>
            <div className='text-[color:var(--brand-primary)] text-3xl mb-3'>💔</div>
            <h3 className='text-xl font-semibold text-gray-900 mb-2'>
              Oops! Something went wrong
            </h3>
            <p className='text-gray-600'>
              {error?.message || 'Please try again later'}
            </p>
          </div>
        </div>
      </Layout>
    )
  }

  const filteredRewards = rewards || []
  const handleClaimReward = async (rewardId) => {
    claimRewardMutation.mutate(rewardId)
  }

  return (
    <Layout>
      <div className='px-4 py-4 mx-auto max-w-7xl md:px-6 lg:px-8 relative z-0'>
        {/* COMPACT HEADER */}
        {/* Points Card */}
        <div className='mb-6'>
          <PointsCard />
        </div>

        {/* Premium Search & Filter Bar */}
        <div className='bg-white/70 backdrop-blur-xl border border-[#ececef] rounded-[1.35rem] p-3.5 md:p-4 shadow-[0_8px_28px_-22px_rgba(0,0,0,0.24)] mb-8 transition-all relative z-20'>
          <div className='flex flex-col lg:flex-row gap-4'>
            {/* Search Input */}
            <div className='relative flex-1 group'>
              <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                <Search className='h-4 w-4 text-gray-400 group-focus-within:text-[color:var(--brand-primary)] transition-colors duration-200' />
              </div>
              <input
                type='text'
                placeholder='Search rewards...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='block w-full h-10 pl-10 pr-10 bg-white border border-[#ececef] rounded-[0.9rem] text-[0.84rem] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary)/0.2] focus:border-[color:var(--brand-primary)/0.25] transition-all duration-200'
              />
              {searchTerm && (
                <div className='absolute inset-y-0 right-0 pr-3 flex items-center'>
                  <button
                    onClick={() => setSearchTerm('')}
                    className='p-1 bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-all'
                  >
                    <X className='h-3.5 w-3.5' />
                  </button>
                </div>
              )}
            </div>

            {/* Filters */}
            <div className='flex gap-3 lg:w-1/3'>
              <PremiumDropdown
                value={selectedType}
                onChange={setSelectedType}
                options={rewardTypeOptions}
                placeholder='Filter'
                icon={Filter}
                className='flex-1'
              />
              <PremiumDropdown
                value={sortBy}
                onChange={setSortBy}
                options={sortOptions}
                placeholder='Sort'
                icon={SortAsc}
                className='flex-1'
              />
            </div>
          </div>

          {isFetching && (
            <div className='mt-3 flex items-center gap-2 text-[0.72rem] font-medium text-gray-500'>
              <span className='inline-flex h-3.5 w-3.5 animate-spin rounded-full border-2 border-[color:var(--brand-primary)/0.25] border-t-[color:var(--brand-primary)]' />
              Updating rewards...
            </div>
          )}

          {/* Active Filter Chips */}
          {(searchTerm || selectedType !== 'all') && (
            <div className='flex items-center gap-3 mt-4 flex-wrap animate-in fade-in slide-in-from-top-2 duration-300'>
              <div className='text-xs font-semibold uppercase tracking-wider text-gray-400'>
                Active filters:
              </div>
              
              {searchTerm && (
                <span className='inline-flex items-center gap-1.5 bg-[#fafafb] border border-[#f9f9fa] text-[color:var(--brand-primary)] px-3 py-1.5 rounded-full text-xs font-medium shadow-sm cursor-default hover:bg-[#f3f3f5] transition-colors'>
                  <Search className="w-3 h-3" />
                  "{searchTerm}"
                  <button 
                    onClick={() => setSearchTerm('')}
                    className='ml-1 p-0.5 hover:bg-[#f3f3f5] rounded-full transition-colors'
                  >
                    <X className='w-3 h-3' />
                  </button>
                </span>
              )}

              {selectedType !== 'all' && (
                <span className='inline-flex items-center gap-1.5 bg-[#fafafb] border border-[#f9f9fa] text-[color:var(--brand-primary)] px-3 py-1.5 rounded-full text-xs font-medium shadow-sm cursor-default hover:bg-[#f3f3f5] transition-colors'>
                  <Filter className="w-3 h-3" />
                  {rewardTypeOptions.find((opt) => opt.value === selectedType)?.label}
                  <button 
                    onClick={() => setSelectedType('all')}
                    className='ml-1 p-0.5 hover:bg-[#f3f3f5] rounded-full transition-colors'
                  >
                    <X className='w-3 h-3' />
                  </button>
                </span>
              )}

              <button
                onClick={() => {
                  setSearchTerm('')
                  setSelectedType('all')
                }}
                className='text-xs text-gray-500 hover:text-[color:var(--brand-primary)] font-semibold underline decoration-[color:var(--brand-primary)] hover:decoration-[color:var(--brand-primary)] decoration-2 transition-all ml-auto'
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>


        {/* All Rewards */}
        <div className='mb-6'>
          <h2 className='text-xl md:text-2xl font-bold text-gray-900 mb-4'>
            {searchTerm || selectedType !== 'all'
              ? 'Search Results'
              : 'All Rewards'}
            <span className='text-base md:text-lg font-normal text-gray-600 ml-2'>
              ({filteredRewards.length}{' '}
              {filteredRewards.length === 1 ? 'reward' : 'rewards'})
            </span>
          </h2>
        </div>

        {filteredRewards.length > 0 ? (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 md:gap-4.5 mb-8'>
            {filteredRewards.map((reward) => (
              <RewardCard
                key={reward._id}
                reward={reward}
                onClaim={handleClaimReward}
              />
            ))}
          </div>
        ) : (
          <div className='text-center py-12 md:py-16 bg-white rounded-2xl border border-[#f9f9fa] mb-8'>
            <div className='text-4xl md:text-6xl mb-4'>💝</div>
            <h3 className='text-xl md:text-2xl font-bold text-gray-800 mb-3'>
              No rewards found
            </h3>
            <p className='text-gray-600 mb-6 px-4'>
              {searchTerm || selectedType !== 'all'
                ? 'Try different filters sweetie! 💕'
                : 'No rewards available right now'}
            </p>
            <button
              type='button'
              onClick={() => {
                setSearchTerm('')
                setSelectedType('all')
              }}
              style={{ background: pageBrandGradient }}
              className='text-white px-6 py-3 rounded-xl font-semibold hover:brightness-110'
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Compact How to Earn Points */}
        <div className='bg-[#fafafb] rounded-2xl p-4 md:p-6 border border-[#f9f9fa]'>
          <h3 className='text-lg md:text-xl font-bold text-gray-900 mb-4 text-center'>
            How to Earn Points
          </h3>
          <div className='grid grid-cols-3 md:grid-cols-3 gap-3 md:gap-6'>
            <div className='text-center'>
              <div style={{ background: pageBrandGradient }} className='text-white w-10 h-10 md:w-14 md:h-14 rounded-xl flex items-center justify-center mx-auto mb-2 md:mb-3'>
                <Award className='w-5 h-5 md:w-7 md:h-7' />
              </div>
              <h4 className='font-bold text-gray-900 mb-1 text-xs md:text-base'>
                Every Visit
              </h4>
              <p className='text-gray-600 text-xs md:text-sm leading-tight'>
                10-50 points per visit
              </p>
            </div>
            <div className='text-center'>
              <div style={{ background: pageBrandGradient }} className='text-white w-10 h-10 md:w-14 md:h-14 rounded-xl flex items-center justify-center mx-auto mb-2 md:mb-3'>
                <Users className='w-5 h-5 md:w-7 md:h-7' />
              </div>
              <h4 className='font-bold text-gray-900 mb-1 text-xs md:text-base'>
                Referrals
              </h4>
              <p className='text-gray-600 text-xs md:text-sm leading-tight'>
                100 points per friend
              </p>
            </div>
            <div className='text-center'>
              <div className='bg-gradient-to-br from-yellow-400 to-orange-500 text-white w-10 h-10 md:w-14 md:h-14 rounded-xl flex items-center justify-center mx-auto mb-2 md:mb-3'>
                <Star className='w-5 h-5 md:w-7 md:h-7' />
              </div>
              <h4 className='font-bold text-gray-900 mb-1 text-xs md:text-base'>
                Reviews
              </h4>
              <p className='text-gray-600 text-xs md:text-sm leading-tight'>
                25 bonus points
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default RewardsCatalogPage
