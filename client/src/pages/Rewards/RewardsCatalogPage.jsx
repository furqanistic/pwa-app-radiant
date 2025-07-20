// client/src/pages/Rewards/RewardsCatalogPage.jsx
import { useClaimReward, useEnhancedRewardsCatalog } from '@/hooks/useRewards'
import {
  Award,
  Check,
  DollarSign,
  Gift,
  Percent,
  Search,
  Sparkles,
  Star,
  Users,
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

// Reward Card Component with real API integration
const RewardCard = ({ reward, onClaim, userPoints }) => {
  const [isClaiming, setIsClaiming] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  const canAfford = reward.canClaim
  const isAffordable = reward.isAffordable

  const getRewardIcon = (type) => {
    switch (type) {
      case 'credit':
        return <DollarSign className='w-5 h-5 text-green-600' />
      case 'discount':
        return <Percent className='w-5 h-5 text-red-600' />
      case 'service':
        return <Gift className='w-5 h-5 text-blue-600' />
      case 'combo':
        return <Star className='w-5 h-5 text-purple-600' />
      case 'referral':
        return <Users className='w-5 h-5 text-orange-600' />
      default:
        return <Award className='w-5 h-5 text-gray-600' />
    }
  }

  const getRewardColor = (type) => {
    switch (type) {
      case 'credit':
        return 'from-green-500 to-emerald-500'
      case 'discount':
        return 'from-red-500 to-pink-500'
      case 'service':
        return 'from-blue-500 to-cyan-500'
      case 'combo':
        return 'from-purple-500 to-indigo-500'
      case 'referral':
        return 'from-orange-500 to-amber-500'
      default:
        return 'from-gray-500 to-slate-500'
    }
  }

  const handleClaim = async () => {
    if (!canAfford || isClaiming) return

    setIsClaiming(true)
    setShowConfetti(true)

    try {
      await onClaim(reward._id)

      // Hide confetti after animation
      setTimeout(() => {
        setShowConfetti(false)
      }, 2000)
    } catch (error) {
      setShowConfetti(false)
      // Error handling is done in the parent component
    } finally {
      setIsClaiming(false)
    }
  }

  const getButtonText = () => {
    if (isClaiming) return 'Claiming...'
    if (canAfford) return 'Claim Reward'
    if (!reward.canClaimMoreThisMonth) return 'Monthly Limit Reached'
    return `Need ${reward.pointsNeeded} more points`
  }

  return (
    <div
      className={`relative bg-white rounded-lg shadow-sm overflow-hidden transition-all ${
        canAfford ? 'hover:shadow-md cursor-pointer group' : 'opacity-60'
      } ${isClaiming ? 'animate-pulse' : ''}`}
    >
      {/* Confetti Animation */}
      {showConfetti && (
        <div className='absolute inset-0 z-50 pointer-events-none overflow-hidden'>
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className='absolute w-2 h-2 bg-yellow-400 rounded-full animate-ping'
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${1 + Math.random()}s`,
              }}
            />
          ))}
          {[...Array(8)].map((_, i) => (
            <div
              key={`star-${i}`}
              className='absolute text-yellow-500 animate-bounce'
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.3}s`,
              }}
            >
              <Sparkles className='w-4 h-4' />
            </div>
          ))}
        </div>
      )}

      <div className='relative h-48 overflow-hidden'>
        <img
          src={
            reward.image ||
            'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=500&h=300&fit=crop'
          }
          alt={reward.name}
          className={`w-full h-full object-cover transition-transform duration-300 ${
            canAfford ? 'group-hover:scale-105' : ''
          }`}
        />

        {/* Badges */}
        <div className='absolute top-3 left-3 flex flex-col gap-2'>
          <span
            className={`bg-gradient-to-r ${getRewardColor(
              reward.type
            )} text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1`}
          >
            {getRewardIcon(reward.type)}
            {reward.typeDisplay ||
              rewardTypes.find((t) => t.id === reward.type)?.name ||
              reward.type}
          </span>
        </div>

        {/* Point Cost */}
        <div className='absolute top-3 right-3'>
          <span className='bg-black/70 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1'>
            <Zap className='w-3 h-3' />
            {reward.pointCost} pts
          </span>
        </div>

        {/* Status Badge */}
        <div className='absolute bottom-3 left-3'>
          <span
            className={`px-2 py-1 rounded-full text-xs font-bold ${
              reward.status === 'active'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-500 text-white'
            }`}
          >
            {reward.status}
          </span>
        </div>
      </div>

      <div className='p-4 md:p-6'>
        <h3 className='text-lg md:text-xl font-bold mb-2 text-gray-900'>
          {reward.name}
        </h3>

        <p className='text-sm mb-4 line-clamp-2 text-gray-600'>
          {reward.description}
        </p>

        {/* Reward Value */}
        <div className='bg-gray-50 p-3 rounded-lg mb-4'>
          <div className='flex items-center justify-between'>
            <span className='text-sm font-semibold text-gray-700'>
              Reward Value:
            </span>
            <span className='font-bold text-lg text-gray-900'>
              {reward.displayValue}
            </span>
          </div>
        </div>

        {/* Reward Details */}
        <div className='grid grid-cols-2 gap-3 mb-4'>
          <div className='text-center'>
            <div className='text-xs text-gray-500 mb-1'>Valid For</div>
            <div className='text-sm font-semibold text-gray-900'>
              {reward.validDays} days
            </div>
          </div>
          <div className='text-center'>
            <div className='text-xs text-gray-500 mb-1'>Monthly Limit</div>
            <div className='text-sm font-semibold text-gray-900'>
              {reward.limit} ({reward.userClaimsThisMonth || 0} used)
            </div>
          </div>
        </div>

        {/* Claim Button */}
        <button
          onClick={handleClaim}
          disabled={!canAfford || isClaiming}
          className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
            isClaiming
              ? 'bg-blue-400 text-white cursor-wait'
              : canAfford
              ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 transform'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          } ${isClaiming ? 'animate-pulse' : ''}`}
        >
          {isClaiming ? (
            <>
              <div className='w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin' />
              Claiming...
            </>
          ) : canAfford ? (
            'Claim Reward'
          ) : (
            getButtonText()
          )}
        </button>
      </div>
    </div>
  )
}

// Main Rewards Catalog Component
const RewardsCatalog = () => {
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
        `Reward claimed successfully! You now have ${data.data.newPointBalance} points.`
      )
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to claim reward')
    },
  })

  // Loading state
  if (isLoading) {
    return (
      <Layout>
        <div className='flex items-center justify-center min-h-[50vh]'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600'></div>
          <span className='ml-3 text-lg'>Loading rewards...</span>
        </div>
      </Layout>
    )
  }

  // Error state
  if (error) {
    return (
      <Layout>
        <div className='flex items-center justify-center min-h-[50vh]'>
          <div className='text-center'>
            <div className='text-red-500 text-xl mb-2'>⚠️</div>
            <h3 className='text-lg font-semibold text-gray-900 mb-2'>
              Error loading rewards
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
      <div className='px-3 py-4 md:px-4 md:py-6 max-w-7xl mx-auto'>
        {/* Mobile-Responsive Header */}
        <div className='bg-white rounded-lg p-4 md:p-6 shadow-sm mb-6'>
          {/* Points Display */}
          <div className='bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg p-4 mb-6'>
            <div className='flex items-center justify-between'>
              <div>
                <h3 className='text-lg md:text-xl font-bold'>Your Points</h3>
                <p className='text-blue-100 text-sm'>
                  Earn more points with every visit!
                </p>
              </div>
              <div className='text-right'>
                <div className='text-2xl md:text-3xl font-bold flex items-center gap-2'>
                  <Zap className='w-6 h-6 md:w-8 md:h-8' />
                  {userPoints}
                </div>
                <div className='text-blue-100 text-xs'>Available Points</div>
              </div>
            </div>
          </div>

          <div className='text-center mb-4 md:mb-6'>
            <h1 className='text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2'>
              Rewards Catalog
            </h1>
            <p className='text-sm md:text-base text-gray-600 max-w-2xl mx-auto'>
              Redeem your points for exclusive rewards, discounts, and special
              offers. The more you visit, the more you earn!
            </p>
          </div>

          {/* Mobile-Responsive Search and Filters */}
          <div className='space-y-3 md:space-y-0 md:flex md:gap-4'>
            {/* Search */}
            <div className='relative md:flex-1'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5' />
              <input
                type='text'
                placeholder='Search rewards...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='w-full pl-10 md:pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base'
              />
            </div>

            {/* Filters */}
            <div className='flex gap-2 md:gap-3'>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className='flex-1 md:flex-none px-3 md:px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base'
              >
                {rewardTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className='flex-1 md:flex-none px-3 md:px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base'
              >
                <option value='pointCost-low'>Points: Low to High</option>
                <option value='pointCost-high'>Points: High to Low</option>
                <option value='value-high'>Value: High to Low</option>
                <option value='name'>A-Z</option>
              </select>
            </div>
          </div>
        </div>

        {/* Affordable Rewards Section */}
        {searchTerm === '' &&
          selectedType === 'all' &&
          affordableRewards.length > 0 && (
            <div className='mb-6 md:mb-8'>
              <div className='flex items-center gap-2 mb-4'>
                <Zap className='w-4 h-4 md:w-5 md:h-5 text-green-500' />
                <h2 className='text-xl md:text-2xl font-bold text-gray-900'>
                  You Can Afford ({affordableRewards.length})
                </h2>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6'>
                {affordableRewards.slice(0, 3).map((reward) => (
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
        <div className='mb-4 md:mb-6'>
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
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6'>
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
          <div className='text-center py-12 md:py-16 bg-white rounded-lg shadow-sm'>
            <div className='text-4xl md:text-6xl mb-4'>🎁</div>
            <h3 className='text-xl md:text-2xl font-bold text-gray-800 mb-3'>
              No rewards found
            </h3>
            <p className='text-gray-600 mb-6 px-4'>
              {searchTerm || selectedType !== 'all'
                ? 'Try adjusting your search terms or filters.'
                : 'No rewards are currently available.'}
            </p>
            <button
              onClick={() => {
                setSearchTerm('')
                setSelectedType('all')
              }}
              className='bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700'
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* How to Earn Points */}
        <div className='mt-8 md:mt-12 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 md:p-8'>
          <h3 className='text-xl md:text-2xl font-bold text-gray-900 mb-4 text-center'>
            How to Earn Points
          </h3>
          <div className='grid md:grid-cols-3 gap-4 md:gap-6'>
            <div className='text-center'>
              <div className='bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3'>
                <Award className='w-6 h-6' />
              </div>
              <h4 className='font-semibold text-gray-900 mb-2'>Every Visit</h4>
              <p className='text-gray-600 text-sm'>
                Earn 10-50 points per appointment based on service value
              </p>
            </div>
            <div className='text-center'>
              <div className='bg-green-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3'>
                <Users className='w-6 h-6' />
              </div>
              <h4 className='font-semibold text-gray-900 mb-2'>Referrals</h4>
              <p className='text-gray-600 text-sm'>
                Get 100 points for each friend you refer to us
              </p>
            </div>
            <div className='text-center'>
              <div className='bg-purple-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3'>
                <Star className='w-6 h-6' />
              </div>
              <h4 className='font-semibold text-gray-900 mb-2'>Reviews</h4>
              <p className='text-gray-600 text-sm'>
                Leave a review and earn 25 bonus points
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default RewardsCatalog
