// client/src/pages/Rewards/RewardsCatalogPage.jsx
import { useClaimReward, useEnhancedRewardsCatalog } from '@/hooks/useRewards'
import {
  Award,
  Check,
  ChevronDown,
  DollarSign,
  Filter,
  Gift,
  Heart,
  Percent,
  Search,
  SortAsc,
  Sparkles,
  Star,
  Users,
  X,
  Zap,
} from 'lucide-react'
import React, { useState } from 'react'
import { toast } from 'react-hot-toast'
import { useSelector } from 'react-redux'
import Layout from '../Layout/Layout'

const rewardTypes = [
  { id: 'all', name: 'All Rewards' },
  { id: 'credit', name: 'Service Credits' },
  { id: 'discount', name: 'Discounts' },
  { id: 'service', name: 'Free Services' },
  { id: 'combo', name: 'Combo Deals' },
  { id: 'referral', name: 'Referral Rewards' },
]

// Compact Dropdown Component
const CompactDropdown = ({
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
        onClick={() => setIsOpen(!isOpen)}
        className='w-full h-8 bg-white border border-pink-200 rounded-lg px-2 flex items-center justify-between hover:border-pink-300 focus:outline-none transition-all text-xs'
      >
        <div className='flex items-center gap-1'>
          {Icon && <Icon className='w-3 h-3 text-pink-500' />}
          <span className='text-gray-800 font-medium truncate'>
            {selectedOption?.label || placeholder}
          </span>
        </div>
        <ChevronDown
          className={`w-3 h-3 text-pink-400 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className='fixed inset-0 z-40'
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Menu */}
          <div className='absolute top-full left-0 right-0 mt-1 bg-white border border-pink-200 rounded-lg z-50 max-h-48 overflow-y-auto'>
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option)}
                className={`w-full px-2 py-2 text-left hover:bg-pink-50 transition-colors flex items-center gap-1 text-xs ${
                  selectedOption?.value === option.value
                    ? 'bg-pink-50 text-pink-700'
                    : 'text-gray-700'
                }`}
              >
                {option.icon && <option.icon className='w-3 h-3' />}
                <span className='font-medium truncate'>{option.label}</span>
                {selectedOption?.value === option.value && (
                  <Check className='w-3 h-3 ml-auto text-pink-600 flex-shrink-0' />
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
const RewardCard = ({ reward, onClaim, userPoints }) => {
  const [isClaiming, setIsClaiming] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  const canAfford = reward.canClaim
  const isAffordable = reward.isAffordable

  const getRewardIcon = (type) => {
    switch (type) {
      case 'credit':
        return <DollarSign className='w-4 h-4 text-green-500' />
      case 'discount':
        return <Percent className='w-4 h-4 text-pink-500' />
      case 'service':
        return <Gift className='w-4 h-4 text-purple-500' />
      case 'combo':
        return <Star className='w-4 h-4 text-yellow-500' />
      case 'referral':
        return <Users className='w-4 h-4 text-blue-500' />
      default:
        return <Award className='w-4 h-4 text-gray-500' />
    }
  }

  const getRewardColor = (type) => {
    switch (type) {
      case 'credit':
        return 'from-green-400 to-emerald-400'
      case 'discount':
        return 'from-pink-400 to-rose-400'
      case 'service':
        return 'from-purple-400 to-violet-400'
      case 'combo':
        return 'from-yellow-400 to-orange-400'
      case 'referral':
        return 'from-blue-400 to-cyan-400'
      default:
        return 'from-gray-400 to-slate-400'
    }
  }

  const handleClaim = async () => {
    if (!canAfford || isClaiming) return

    setIsClaiming(true)
    setShowConfetti(true)

    try {
      await onClaim(reward._id)
      setTimeout(() => setShowConfetti(false), 2000)
    } catch (error) {
      setShowConfetti(false)
    } finally {
      setIsClaiming(false)
    }
  }

  const getButtonText = () => {
    if (isClaiming) return 'Claiming...'
    if (canAfford) return 'Claim'
    if (!reward.canClaimMoreThisMonth) return 'Limit Reached'
    return `Need ${reward.pointsNeeded} more`
  }

  return (
    <div
      className={`relative bg-white rounded-2xl overflow-hidden transition-all border ${
        canAfford
          ? 'hover:border-pink-300 cursor-pointer group border-pink-100'
          : 'opacity-60 border-gray-100'
      } ${isClaiming ? 'animate-pulse' : ''}`}
    >
      {/* Confetti Animation */}
      {showConfetti && (
        <div className='absolute inset-0 z-50 pointer-events-none overflow-hidden'>
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className='absolute w-2 h-2 bg-pink-400 rounded-full animate-ping'
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
              className='absolute text-pink-500 animate-bounce'
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

      <div className='relative h-40 md:h-48 overflow-hidden'>
        <img
          src={
            reward.image ||
            'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop'
          }
          alt={reward.name}
          className={`w-full h-full object-cover transition-transform duration-300 ${
            canAfford ? 'group-hover:scale-105' : ''
          }`}
        />

        {/* Badges */}
        <div className='absolute top-3 left-3'>
          <span
            className={`bg-gradient-to-r ${getRewardColor(
              reward.type
            )} text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1`}
          >
            {getRewardIcon(reward.type)}
            <span className='hidden sm:inline'>
              {reward.typeDisplay ||
                rewardTypes.find((t) => t.id === reward.type)?.name ||
                reward.type}
            </span>
          </span>
        </div>

        {/* Point Cost */}
        <div className='absolute top-3 right-3'>
          <span className='bg-black/70 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1'>
            <Zap className='w-3 h-3' />
            {reward.pointCost}
          </span>
        </div>

        {/* Status Badge */}
        <div className='absolute bottom-3 left-3'>
          <span
            className={`px-2 py-1 rounded-full text-xs font-bold ${
              reward.status === 'active'
                ? 'bg-green-500 text-white'
                : 'bg-gray-500 text-white'
            }`}
          >
            {reward.status}
          </span>
        </div>
      </div>

      <div className='p-4 md:p-5'>
        <h3 className='text-base md:text-lg font-bold mb-2 text-gray-900 line-clamp-1'>
          {reward.name}
        </h3>

        <p className='text-sm mb-3 line-clamp-2 text-gray-600'>
          {reward.description}
        </p>

        {/* Reward Value */}
        <div className='bg-pink-50 p-3 rounded-xl mb-3'>
          <div className='flex items-center justify-between'>
            <span className='text-sm font-semibold text-gray-700'>Value:</span>
            <span className='font-bold text-base text-gray-900'>
              {reward.displayValue}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className='grid grid-cols-2 gap-3 mb-4'>
          <div className='text-center bg-gray-50 rounded-xl p-3'>
            <div className='text-xs text-gray-500 mb-1'>Valid For</div>
            <div className='font-semibold text-sm text-gray-900'>
              {reward.validDays} days
            </div>
          </div>
          <div className='text-center bg-gray-50 rounded-xl p-3'>
            <div className='text-xs text-gray-500 mb-1'>Monthly Limit</div>
            <div className='font-semibold text-sm text-gray-900'>
              {reward.limit} ({reward.userClaimsThisMonth || 0} used)
            </div>
          </div>
        </div>

        {/* Claim Button */}
        <button
          onClick={handleClaim}
          disabled={!canAfford || isClaiming}
          className={`w-full py-3 md:py-3.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
            isClaiming
              ? 'bg-pink-400 text-white cursor-wait'
              : canAfford
              ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600 hover:scale-105 transform'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          } ${isClaiming ? 'animate-pulse' : ''}`}
        >
          {isClaiming ? (
            <>
              <div className='w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin' />
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
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [sortBy, setSortBy] = useState('pointCost-low')

  const { currentUser } = useSelector((state) => state.user)

  // API calls using React Query hooks
  const {
    rewards = [],
    userPoints = 0,
    stats = {},
    isLoading,
    error,
  } = useEnhancedRewardsCatalog({
    search: searchTerm,
    type: selectedType === 'all' ? '' : selectedType,
    sortBy: sortBy,
  })

  const claimRewardMutation = useClaimReward({
    onSuccess: (data) => {
      toast.success(
        `🎉 Reward claimed! You now have ${data.data.newPointBalance} points.`
      )
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to claim reward')
    },
  })

  // Enhanced filter options with icons
  const rewardTypeOptions = [
    { value: 'all', label: 'All', icon: Award },
    { value: 'credit', label: 'Credits', icon: DollarSign },
    { value: 'discount', label: 'Discounts', icon: Percent },
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
  if (isLoading) {
    return (
      <Layout>
        <div className='flex flex-col items-center justify-center min-h-[50vh] px-4'>
          <div className='animate-spin rounded-full h-12 w-12 border-4 border-pink-200 border-t-pink-500 mb-4'></div>
          <span className='text-gray-600'>Loading rewards...</span>
        </div>
      </Layout>
    )
  }

  // Error state
  if (error) {
    return (
      <Layout>
        <div className='flex items-center justify-center min-h-[50vh] px-4'>
          <div className='text-center'>
            <div className='text-pink-500 text-3xl mb-3'>💔</div>
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
  const affordableRewards = filteredRewards.filter((r) => r.canClaim)

  const handleClaimReward = async (rewardId) => {
    claimRewardMutation.mutate(rewardId)
  }

  return (
    <Layout>
      <div className='px-4 py-4 max-w-sm mx-auto md:max-w-6xl lg:max-w-7xl md:px-6 lg:px-8 relative z-0'>
        {/* COMPACT HEADER */}
        <div className='bg-white rounded-2xl border border-pink-100 mb-4 relative'>
          {/* Points & Search Row */}
          <div className='bg-gradient-to-r from-pink-500 to-rose-500 text-white p-4 rounded-t-2xl'>
            <div className='flex items-center justify-between mb-3'>
              <div className='flex items-center gap-3'>
                <Zap className='w-5 h-5' />
                <div>
                  <div className='text-xl font-bold'>
                    {userPoints.toLocaleString()}
                  </div>
                  <div className='text-xs opacity-80'>points available</div>
                </div>
              </div>
              <div className='text-right'>
                <div className='text-sm font-medium'>
                  {affordableRewards.length} affordable
                </div>
                <div className='text-xs opacity-80'>rewards</div>
              </div>
            </div>

            {/* Integrated Search */}
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-pink-300 w-4 h-4' />
              <input
                type='text'
                placeholder='Search rewards...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='w-full pl-10 pr-3 py-2 bg-white/20 border border-white/30 rounded-lg focus:outline-none focus:bg-white/30 transition-all text-white placeholder-pink-200 text-sm'
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className='absolute right-3 top-1/2 transform -translate-y-1/2 text-pink-200 hover:text-white'
                >
                  <X className='w-4 h-4' />
                </button>
              )}
            </div>
          </div>

          {/* Compact Filters */}
          <div className='px-3 py-3 bg-pink-50 border-t border-pink-100 relative'>
            <div className='grid grid-cols-2 gap-3 relative z-10'>
              <CompactDropdown
                value={selectedType}
                onChange={setSelectedType}
                options={rewardTypeOptions}
                placeholder='Filter'
                icon={Filter}
                className='w-full'
              />
              <CompactDropdown
                value={sortBy}
                onChange={setSortBy}
                options={sortOptions}
                placeholder='Sort'
                icon={SortAsc}
                className='w-full'
              />
            </div>

            {/* Compact Active Filters */}
            {(searchTerm || selectedType !== 'all') && (
              <div className='flex items-center gap-1 mt-2'>
                {searchTerm && (
                  <span className='inline-flex items-center gap-1 bg-pink-200 text-pink-800 px-2 py-0.5 rounded-full text-xs'>
                    "{searchTerm.slice(0, 12)}
                    {searchTerm.length > 12 ? '...' : ''}"
                    <X
                      onClick={() => setSearchTerm('')}
                      className='w-3 h-3 cursor-pointer hover:text-pink-600'
                    />
                  </span>
                )}
                {selectedType !== 'all' && (
                  <span className='inline-flex items-center gap-1 bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full text-xs'>
                    {
                      rewardTypeOptions.find(
                        (opt) => opt.value === selectedType
                      )?.label
                    }
                    <X
                      onClick={() => setSelectedType('all')}
                      className='w-3 h-3 cursor-pointer hover:text-purple-600'
                    />
                  </span>
                )}
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setSelectedType('all')
                  }}
                  className='text-xs text-gray-500 hover:text-gray-700 underline ml-1'
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Affordable Rewards Section */}
        {searchTerm === '' &&
          selectedType === 'all' &&
          affordableRewards.length > 0 && (
            <div className='mb-8'>
              <div className='flex items-center gap-2 mb-4'>
                <Zap className='w-5 h-5 text-green-500' />
                <h2 className='text-xl md:text-2xl font-bold text-gray-900'>
                  You Can Afford ({affordableRewards.length})
                </h2>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6'>
                {affordableRewards.slice(0, 4).map((reward) => (
                  <RewardCard
                    key={reward._id}
                    reward={reward}
                    onClaim={handleClaimReward}
                    userPoints={userPoints}
                  />
                ))}
              </div>
            </div>
          )}

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
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 mb-8'>
            {filteredRewards.map((reward) => (
              <RewardCard
                key={reward._id}
                reward={reward}
                onClaim={handleClaimReward}
                userPoints={userPoints}
              />
            ))}
          </div>
        ) : (
          <div className='text-center py-12 md:py-16 bg-white rounded-2xl border border-pink-100 mb-8'>
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
              onClick={() => {
                setSearchTerm('')
                setSelectedType('all')
              }}
              className='bg-gradient-to-r from-pink-500 to-rose-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-rose-600'
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Compact How to Earn Points */}
        <div className='bg-gradient-to-br from-pink-50 via-purple-50 to-rose-50 rounded-2xl p-4 md:p-6 border border-pink-100'>
          <h3 className='text-lg md:text-xl font-bold text-gray-900 mb-4 text-center'>
            How to Earn Points
          </h3>
          <div className='grid grid-cols-3 md:grid-cols-3 gap-3 md:gap-6'>
            <div className='text-center'>
              <div className='bg-gradient-to-br from-pink-400 to-rose-500 text-white w-10 h-10 md:w-14 md:h-14 rounded-xl flex items-center justify-center mx-auto mb-2 md:mb-3'>
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
              <div className='bg-gradient-to-br from-purple-400 to-violet-500 text-white w-10 h-10 md:w-14 md:h-14 rounded-xl flex items-center justify-center mx-auto mb-2 md:mb-3'>
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
