// File: client/src/pages/Dashboard/DashboardPage.jsx - COMPLETE ENHANCED VERSION
import GamesSection from '@/components/Dashboard/GamesSection'
import PointsCard from '@/components/Dashboard/PointsCard'
import { useDashboardData } from '@/hooks/useDashboard'
import { useClaimReward, useEnhancedRewardsCatalog } from '@/hooks/useRewards'
import { AnimatePresence, motion } from 'framer-motion'
import {
    AlertCircle,
    Award,
    Calendar,
    CheckCircle,
    ChevronRight,
    Clock,
    CreditCard,
    DollarSign,
    Gift,
    Heart,
    Lock,
    MapPin,
    Percent,
    Plus,
    RefreshCw,
    Share2,
    ShoppingBag,
    Sparkles,
    Star,
    Target,
    TrendingUp,
    Unlock,
    UserPlus,
    Users,
    XCircle,
    Zap,
} from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import Layout from '../Layout/Layout'

// Icon mapping for string icon names from backend
const iconMap = {
  UserPlus: UserPlus,
  Calendar: Calendar,
  ShoppingBag: ShoppingBag,
  Star: Star,
  Share2: Share2,
}

// Enhanced Reward Card Component with better UX
const RewardCard = ({
  reward,
  onClaim,
  userPoints,
  isOptimisticUpdate = false,
}) => {
  const [isClaiming, setIsClaiming] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [claimStatus, setClaimStatus] = useState(null) // 'success', 'error', null

  const canAfford = reward.canClaim && !isOptimisticUpdate
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
    setClaimStatus(null)

    try {
      await onClaim(reward._id)
      setShowConfetti(true)
      setClaimStatus('success')

      // Auto-hide confetti
      setTimeout(() => {
        setShowConfetti(false)
        setClaimStatus(null)
      }, 3000)
    } catch (error) {
      setShowConfetti(false)
      setClaimStatus('error')

      // Auto-hide error status
      setTimeout(() => setClaimStatus(null), 3000)
    } finally {
      setIsClaiming(false)
    }
  }

  const getButtonText = () => {
    if (isClaiming) return 'Claiming...'
    if (claimStatus === 'success') return 'Claimed!'
    if (claimStatus === 'error') return 'Failed - Retry'
    if (isOptimisticUpdate) return 'Processing...'
    if (canAfford) return 'Claim'
    if (!reward.canClaimMoreThisMonth) return 'Limit Reached'
    return `Need ${reward.pointsNeeded} more`
  }

  const getButtonIcon = () => {
    if (isClaiming)
      return (
        <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
      )
    if (claimStatus === 'success') return <CheckCircle className='w-4 h-4' />
    if (claimStatus === 'error') return <XCircle className='w-4 h-4' />
    if (isOptimisticUpdate) return <Clock className='w-4 h-4' />
    return null
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: canAfford ? -2 : 0 }}
      className={`relative bg-white rounded-2xl overflow-hidden transition-all border-2 ${
        canAfford && !isOptimisticUpdate
          ? 'border-pink-200 hover:border-pink-300 cursor-pointer group hover:shadow-lg'
          : isOptimisticUpdate
          ? 'border-blue-200 opacity-75'
          : 'opacity-60 border-gray-100'
      } ${isClaiming ? 'animate-pulse' : ''}`}
    >
      {/* Confetti Animation */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='absolute inset-0 z-50 pointer-events-none overflow-hidden'
          >
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ y: -20, x: Math.random() * 100 + '%', rotate: 0 }}
                animate={{
                  y: '120%',
                  rotate: 360,
                  transition: {
                    duration: 2 + Math.random(),
                    delay: Math.random() * 0.5,
                  },
                }}
                className='absolute w-3 h-3 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full'
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Indicator */}
      {(claimStatus || isOptimisticUpdate) && (
        <div className='absolute top-2 right-2 z-40'>
          <div
            className={`p-2 rounded-full ${
              claimStatus === 'success'
                ? 'bg-green-500 text-white'
                : claimStatus === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-blue-500 text-white'
            }`}
          >
            {claimStatus === 'success' ? (
              <CheckCircle className='w-4 h-4' />
            ) : claimStatus === 'error' ? (
              <XCircle className='w-4 h-4' />
            ) : (
              <Clock className='w-4 h-4' />
            )}
          </div>
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
            canAfford && !isOptimisticUpdate ? 'group-hover:scale-105' : ''
          }`}
        />

        {/* Badges */}
        <div className='absolute top-3 left-3'>
          <span
            className={`bg-gradient-to-r ${getRewardColor(
              reward.type
            )} text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 backdrop-blur-sm`}
          >
            {getRewardIcon(reward.type)}
            <span className='hidden sm:inline'>
              {reward.typeDisplay || reward.type}
            </span>
          </span>
        </div>

        {/* Point Cost */}
        <div className='absolute top-3 right-3'>
          <span className='bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1'>
            <Zap className='w-3 h-3' />
            {reward.pointCost}
          </span>
        </div>

        {/* Status Badge */}
        <div className='absolute bottom-3 left-3'>
          <span
            className={`px-2 py-1 rounded-full text-xs font-bold backdrop-blur-sm ${
              reward.status === 'active'
                ? 'bg-green-500/90 text-white'
                : 'bg-gray-500/90 text-white'
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
        <div className='bg-gradient-to-r from-pink-50 to-purple-50 p-3 rounded-xl mb-3'>
          <div className='flex items-center justify-between'>
            <span className='text-sm font-semibold text-gray-700'>Value:</span>
            <span className='font-bold text-base text-gray-900'>
              {reward.displayValue}
            </span>
          </div>
        </div>

        {/* Details Grid */}
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
        <motion.button
          onClick={handleClaim}
          disabled={!canAfford || isClaiming || isOptimisticUpdate}
          whileTap={{ scale: canAfford ? 0.98 : 1 }}
          className={`w-full py-3 md:py-3.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
            isClaiming
              ? 'bg-pink-400 text-white cursor-wait'
              : claimStatus === 'success'
              ? 'bg-green-500 text-white'
              : claimStatus === 'error'
              ? 'bg-red-500 text-white hover:bg-red-600'
              : isOptimisticUpdate
              ? 'bg-blue-400 text-white cursor-not-allowed'
              : canAfford
              ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600 hover:scale-[1.02] transform'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          {getButtonIcon()}
          {getButtonText()}
        </motion.button>
      </div>
    </motion.div>
  )
}

// Enhanced Card Component with loading states
const DashboardCard = ({
  children,
  className = '',
  gradient = 'default',
  isLoading = false,
  title = '',
  description = '',
}) => {
  const gradients = {
    default: 'bg-white border-2 border-pink-100',
    pink: 'bg-gradient-to-br from-pink-50 to-pink-100 border-2 border-pink-200',
    purple:
      'bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200',
    indigo:
      'bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200',
  }

  if (isLoading) {
    return (
      <div
        className={`${gradients[gradient]} rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${className}`}
      >
        <div className='animate-pulse'>
          <div className='flex items-center mb-4'>
            <div className='w-12 h-12 bg-gray-300 rounded-xl mr-4'></div>
            <div>
              <div className='h-6 bg-gray-300 rounded w-32 mb-2'></div>
              <div className='h-4 bg-gray-300 rounded w-24'></div>
            </div>
          </div>
          <div className='space-y-3'>
            <div className='h-4 bg-gray-300 rounded'></div>
            <div className='h-4 bg-gray-300 rounded w-3/4'></div>
            <div className='h-4 bg-gray-300 rounded w-1/2'></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`${gradients[gradient]} rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${className}`}
    >
      {children}
    </motion.div>
  )
}

// Enhanced Spa Rewards Section with optimistic updates
const SpaRewardsSection = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { currentUser } = useSelector((state) => state.user)
  const [optimisticRewards, setOptimisticRewards] = useState(new Set())

  const {
    rewards = [],
    userPoints = 0,
    stats = {},
    isLoading,
    error,
    refetch,
  } = useEnhancedRewardsCatalog({})

  const claimRewardMutation = useClaimReward({
    onSuccess: (data, rewardId) => {
      // Remove from optimistic updates
      setOptimisticRewards((prev) => {
        const next = new Set(prev)
        next.delete(rewardId)
        return next
      })

      // Update user points in Redux store
      dispatch({
        type: 'user/setPoints',
        payload: data.data.newPointBalance,
      })

      // Sonner success notification
      toast.success('Reward claimed successfully!', {
        description: `You spent ${data.data.pointsSpent} points. New balance: ${data.data.newPointBalance}`,
        duration: 4000,
      })

      // Refresh rewards data
      refetch()
    },
    onError: (error, rewardId) => {
      // Remove from optimistic updates
      setOptimisticRewards((prev) => {
        const next = new Set(prev)
        next.delete(rewardId)
        return next
      })

      // Sonner error notification
      toast.error('Failed to claim reward', {
        description: error.response?.data?.message || 'Please try again later',
        duration: 5000,
      })
    },
  })

  const handleClaimReward = async (rewardId) => {
    // Add optimistic update
    setOptimisticRewards((prev) => new Set([...prev, rewardId]))

    // Optimistically update user points in Redux
    const reward = rewards.find((r) => r._id === rewardId)
    if (reward) {
      dispatch({
        type: 'user/subtractPoints',
        payload: reward.pointCost,
      })
    }

    claimRewardMutation.mutate(rewardId)
  }

  const lastThreeRewards = rewards.slice(-3).reverse()

  // Pull to refresh handler for PWA
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await refetch()
      toast.success('Rewards refreshed!')
    } catch (error) {
      toast.error('Failed to refresh')
    } finally {
      setIsRefreshing(false)
    }
  }, [refetch])

  // Add pull-to-refresh gesture
  useEffect(() => {
    let startY = 0
    let currentY = 0
    let pullDistance = 0

    const handleTouchStart = (e) => {
      startY = e.touches[0].clientY
    }

    const handleTouchMove = (e) => {
      currentY = e.touches[0].clientY
      pullDistance = currentY - startY

      if (pullDistance > 100 && window.scrollY === 0) {
        e.preventDefault()
      }
    }

    const handleTouchEnd = () => {
      if (pullDistance > 100 && window.scrollY === 0) {
        handleRefresh()
      }
      pullDistance = 0
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleRefresh])

  if (isLoading) {
    return (
      <div className='mb-4 sm:mb-6 lg:mb-8'>
        <DashboardCard isLoading={true} />
      </div>
    )
  }

  if (error) {
    return (
      <div className='mb-4 sm:mb-6 lg:mb-8'>
        <DashboardCard>
          <div className='text-center py-8'>
            <AlertCircle className='w-12 h-12 text-red-500 mx-auto mb-3' />
            <p className='text-gray-600 mb-4'>
              Unable to load rewards at this time
            </p>
            <button
              onClick={handleRefresh}
              className='bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 transition-colors'
            >
              Try Again
            </button>
          </div>
        </DashboardCard>
      </div>
    )
  }

  if (rewards.length === 0) {
    return (
      <div className='mb-4 sm:mb-6 lg:mb-8'>
        <DashboardCard>
          <div className='text-center py-8'>
            <Gift className='w-12 h-12 text-gray-400 mx-auto mb-3' />
            <p className='text-gray-600 mb-4'>New rewards coming soon!</p>
            <button
              onClick={handleRefresh}
              className='bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 transition-colors flex items-center gap-2 mx-auto'
            >
              <RefreshCw className='w-4 h-4' />
              Refresh
            </button>
          </div>
        </DashboardCard>
      </div>
    )
  }

  return (
    <div className='mb-4 sm:mb-6 lg:mb-8'>
      <DashboardCard>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6'>
          <div className='flex items-center mb-2 sm:mb-0'>
            <div className='bg-gradient-to-r from-pink-500 to-rose-500 p-2 sm:p-3 rounded-xl sm:rounded-2xl mr-3 sm:mr-4'>
              <Sparkles className='w-5 h-5 sm:w-6 sm:h-6 text-white' />
            </div>
            <div>
              <h2 className='text-lg sm:text-xl lg:text-2xl font-bold text-gray-800'>
                Spa Rewards
              </h2>
              <p className='text-xs sm:text-sm text-gray-600'>
                Latest rewards available for you
              </p>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <span className='bg-pink-100 text-pink-800 px-3 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-semibold'>
              {
                lastThreeRewards.filter(
                  (r) => r.canClaim && !optimisticRewards.has(r._id)
                ).length
              }{' '}
              Available
            </span>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className='text-pink-600 hover:text-pink-700 p-2 rounded-lg hover:bg-pink-50 transition-colors'
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </button>
            <button
              onClick={() => navigate('/rewards')}
              className='text-pink-600 hover:text-pink-700 flex items-center gap-1 text-sm font-semibold hover:bg-pink-50 px-3 py-2 rounded-lg transition-colors'
            >
              View All
              <ChevronRight className='w-4 h-4' />
            </button>
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6'>
          <AnimatePresence mode='wait'>
            {lastThreeRewards.map((reward) => (
              <RewardCard
                key={reward._id}
                reward={reward}
                onClaim={handleClaimReward}
                userPoints={currentUser?.points || userPoints}
                isOptimisticUpdate={optimisticRewards.has(reward._id)}
              />
            ))}
          </AnimatePresence>
        </div>
      </DashboardCard>
    </div>
  )
}

// Need More Points Section
const NeedMorePointsSection = ({ methods = [] }) => {
  const navigate = useNavigate()

  const handleAction = (method) => {
    switch (method.action) {
      case 'Share Now':
        navigate('/referrals')
        break
      case 'Book Now':
        navigate('/services')
        break
      case 'Shop Now':
        navigate('/services')
        break
      case 'Review':
        navigate('/Booking')
        break
      default:
        break
    }
  }

  return (
    <DashboardCard gradient='purple'>
      <div className='flex items-center mb-4 sm:mb-6'>
        <div className='bg-gradient-to-r from-pink-500 to-rose-500 p-2 sm:p-3 rounded-xl sm:rounded-2xl mr-3 sm:mr-4'>
          <Zap className='w-5 h-5 sm:w-6 sm:h-6 text-white' />
        </div>
        <h2 className='text-lg sm:text-xl lg:text-2xl font-bold text-gray-800'>
          Earn More Points
        </h2>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4'>
        {methods.map((method) => {
          const IconComponent = iconMap[method.icon] || Zap
          return (
            <motion.div
              key={method.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: method.id * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className='bg-white border-2 border-purple-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 hover:border-purple-300 transition-all cursor-pointer'
            >
              <div className='flex items-start justify-between mb-3 sm:mb-4'>
                <div className='flex items-start flex-1 min-w-0'>
                  <div className='bg-gradient-to-r from-purple-100 to-purple-200 p-2 sm:p-3 rounded-lg sm:rounded-xl mr-3 flex-shrink-0'>
                    <IconComponent className='w-4 h-4 sm:w-6 sm:h-6 text-purple-600' />
                  </div>
                  <div className='min-w-0 flex-1'>
                    <h3 className='text-sm sm:text-lg font-bold text-gray-800 mb-1'>
                      {method.title}
                    </h3>
                    <p className='text-xs sm:text-sm text-gray-600'>
                      {method.description}
                    </p>
                  </div>
                </div>
                <div className='ml-2 flex-shrink-0'>
                  <span className='bg-gradient-to-r from-pink-500 to-rose-500 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold'>
                    {method.points}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleAction(method)}
                className='w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold hover:from-pink-600 hover:to-rose-600 transition-all'
              >
                {method.action}
              </button>
            </motion.div>
          )
        })}
      </div>
    </DashboardCard>
  )
}

const DashboardPage = () => {
  const navigate = useNavigate()
  const { currentUser } = useSelector((state) => state.user)

  // Fetch dashboard data
  const { data: dashboardData, isLoading, error, refetch } = useDashboardData()

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <Layout>
        <div className='min-h-screen bg-gradient-to-br from-pink-25 via-purple-25 to-indigo-25 p-3 sm:p-4 lg:p-6'>
          <div className='max-w-7xl mx-auto space-y-6'>
            <DashboardCard isLoading={true} />
            <DashboardCard isLoading={true} />
            <div className='grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8'>
              <div className='lg:col-span-7'>
                <DashboardCard isLoading={true} />
              </div>
              <div className='lg:col-span-5'>
                <DashboardCard isLoading={true} />
              </div>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className='min-h-screen bg-gradient-to-br from-pink-25 via-purple-25 to-indigo-25 p-3 sm:p-4 lg:p-6'>
          <div className='max-w-7xl mx-auto'>
            <div className='text-center py-12'>
              <AlertCircle className='w-16 h-16 text-red-500 mx-auto mb-4' />
              <p className='text-red-600 mb-4 text-lg'>
                Failed to load dashboard data
              </p>
              <button
                onClick={() => refetch()}
                className='bg-pink-500 text-white px-6 py-3 rounded-lg hover:bg-pink-600 transition-colors flex items-center gap-2 mx-auto'
              >
                <RefreshCw className='w-4 h-4' />
                Retry
              </button>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  const data = dashboardData?.data || {}

  return (
    <Layout>
      <div className='min-h-screen bg-gradient-to-br from-pink-25 via-purple-25 to-indigo-25 p-3 sm:p-4 lg:p-6'>
        <div className='max-w-7xl mx-auto'>
          {/* Points Card - Full Width at Top */}
          <div className='mb-4 sm:mb-6 lg:mb-8'>
            <PointsCard />
          </div>

          {/* Spa Rewards Section - Full Width */}
          <SpaRewardsSection />
          <div className='mb-4 sm:mb-6 lg:mb-8'>
            <GamesSection />
          </div>
          {/* Need More Points Section - Full Width */}
          {data.pointsEarningMethods && (
            <div className='mb-4 sm:mb-6 lg:mb-8'>
              <NeedMorePointsSection methods={data.pointsEarningMethods} />
            </div>
          )}

          {/* Rest of the Dashboard - Better Balanced Layout */}
          <div className='grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8'>
            {/* Left Column - Takes 7 columns on desktop */}
            <div className='lg:col-span-7 space-y-4 sm:space-y-6 lg:space-y-8'>
              {/* Upcoming Appointments */}
              {data.upcomingAppointments && (
                <DashboardCard gradient='pink'>
                  <div className='flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6'>
                    <div className='flex items-center mb-2 sm:mb-0'>
                      <div className='bg-gradient-to-r from-pink-500 to-pink-600 p-2 sm:p-3 rounded-xl sm:rounded-2xl mr-3 sm:mr-4'>
                        <Calendar className='w-5 h-5 sm:w-6 sm:h-6 text-white' />
                      </div>
                      <h2 className='text-lg sm:text-xl lg:text-2xl font-bold text-gray-800'>
                        Upcoming Appointments
                      </h2>
                    </div>
                    <span className='bg-pink-200 text-pink-800 px-3 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-semibold w-fit'>
                      {data.upcomingAppointments.length} scheduled
                    </span>
                  </div>
                  {data.upcomingAppointments.length > 0 ? (
                    <div className='grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4'>
                      {data.upcomingAppointments.map((appointment) => (
                        <motion.div
                          key={appointment._id}
                          whileHover={{ scale: 1.02 }}
                          className='bg-white border-2 border-pink-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 hover:border-pink-300 transition-colors cursor-pointer'
                        >
                          <h3 className='text-sm sm:text-base lg:text-lg font-bold text-gray-800 mb-1 sm:mb-2'>
                            {appointment.serviceName}
                          </h3>
                          <p className='text-xs sm:text-sm lg:text-base text-gray-600 mb-2 sm:mb-3'>
                            {appointment.providerName}
                          </p>
                          <div className='flex items-center bg-pink-50 rounded-lg p-2 sm:p-3'>
                            <Clock className='w-4 h-4 sm:w-5 sm:h-5 text-pink-500 mr-2 sm:mr-3' />
                            <div>
                              <p className='text-xs sm:text-sm font-semibold text-pink-700'>
                                {formatDate(appointment.date)}
                              </p>
                              <p className='text-xs sm:text-sm text-pink-600'>
                                {appointment.time}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className='text-center py-8'>
                      <Calendar className='w-12 h-12 text-gray-400 mx-auto mb-4' />
                      <p className='text-gray-600 mb-4'>
                        No upcoming appointments
                      </p>
                      <button
                        onClick={() => navigate('/services')}
                        className='bg-gradient-to-r from-pink-500 to-rose-500 text-white px-6 py-3 rounded-xl hover:from-pink-600 hover:to-rose-600 transition-all'
                      >
                        Book Now
                      </button>
                    </div>
                  )}
                </DashboardCard>
              )}

              {/* Referral Program */}
              {data.referralStats && (
                <DashboardCard gradient='indigo'>
                  <div className='flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6'>
                    <div className='flex items-center mb-2 sm:mb-0'>
                      <div className='bg-gradient-to-r from-pink-500 to-rose-600 p-2 sm:p-3 rounded-xl sm:rounded-2xl mr-2 sm:mr-3'>
                        <Users className='w-5 h-5 sm:w-6 sm:h-6 text-white' />
                      </div>
                      <h2 className='text-base sm:text-lg lg:text-xl font-bold text-gray-800'>
                        Referral Program
                      </h2>
                    </div>
                    <div className='flex items-center bg-green-100 border-2 border-green-200 rounded-full px-2 sm:px-3 py-1 w-fit'>
                      <TrendingUp className='w-3 h-3 sm:w-4 sm:h-4 text-green-600 mr-1 sm:mr-2' />
                      <span className='text-green-700 font-semibold text-xs sm:text-sm'>
                        Active
                      </span>
                    </div>
                  </div>
                  <div className='grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6'>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className='bg-white border-2 border-indigo-200 rounded-lg sm:rounded-2xl p-2 sm:p-4 text-center hover:border-indigo-300 transition-colors cursor-pointer'
                    >
                      <div className='bg-gradient-to-r from-indigo-100 to-indigo-200 rounded-full w-8 h-8 sm:w-12 sm:h-12 lg:w-16 lg:h-16 flex items-center justify-center mx-auto mb-1 sm:mb-2'>
                        <Users className='w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-indigo-600' />
                      </div>
                      <p className='text-lg sm:text-2xl lg:text-4xl font-bold text-indigo-600 mb-1'>
                        {data.referralStats.total}
                      </p>
                      <p className='text-xs sm:text-sm font-semibold text-gray-700'>
                        Total
                      </p>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className='bg-white border-2 border-green-200 rounded-lg sm:rounded-2xl p-2 sm:p-4 text-center hover:border-green-300 transition-colors cursor-pointer'
                    >
                      <div className='bg-gradient-to-r from-green-100 to-green-200 rounded-full w-8 h-8 sm:w-12 sm:h-12 lg:w-16 lg:h-16 flex items-center justify-center mx-auto mb-1 sm:mb-2'>
                        <Calendar className='w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-green-600' />
                      </div>
                      <p className='text-lg sm:text-2xl lg:text-4xl font-bold text-green-600 mb-1'>
                        {data.referralStats.thisMonth}
                      </p>
                      <p className='text-xs sm:text-sm font-semibold text-gray-700'>
                        This Month
                      </p>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className='bg-white border-2 border-purple-200 rounded-lg sm:rounded-2xl p-2 sm:p-4 text-center hover:border-purple-300 transition-colors cursor-pointer'
                    >
                      <div className='bg-gradient-to-r from-purple-100 to-purple-200 rounded-full w-8 h-8 sm:w-12 sm:h-12 lg:w-16 lg:h-16 flex items-center justify-center mx-auto mb-1 sm:mb-2'>
                        <Gift className='w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-purple-600' />
                      </div>
                      <p className='text-lg sm:text-2xl lg:text-4xl font-bold text-purple-600 mb-1'>
                        {data.referralStats.earnings}
                      </p>
                      <p className='text-xs sm:text-sm font-semibold text-gray-700'>
                        Points
                      </p>
                    </motion.div>
                  </div>
                  <div className='bg-white border-2 border-indigo-200 rounded-xl sm:rounded-2xl p-3 sm:p-4'>
                    <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
                      <div>
                        <p className='text-sm sm:text-base lg:text-lg font-bold text-gray-800'>
                          Your Code:{' '}
                          {data.referralStats.referralCode || 'Generate Code'}
                        </p>
                        <p className='text-xs sm:text-sm text-gray-600'>
                          Share with friends and earn rewards
                        </p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate('/referrals')}
                        className='bg-gradient-to-r from-pink-500 to-rose-500 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm hover:from-pink-600 hover:to-rose-600 transition-colors w-full sm:w-auto'
                      >
                        Share Now
                      </motion.button>
                    </div>
                  </div>
                </DashboardCard>
              )}
            </div>

            {/* Right Column - Takes 5 columns on desktop */}
            <div className='lg:col-span-5 space-y-4 sm:space-y-6 lg:space-y-8'>
              {/* Available Credits & Gifts */}
              {data.credits && (
                <DashboardCard gradient='purple'>
                  <div className='flex items-center justify-between mb-4 sm:mb-6'>
                    <div className='flex items-center'>
                      <div className='bg-gradient-to-r from-purple-500 to-purple-600 p-2 sm:p-3 rounded-xl sm:rounded-2xl mr-2 sm:mr-3'>
                        <Gift className='w-5 h-5 sm:w-6 sm:h-6 text-white' />
                      </div>
                      <h2 className='text-base sm:text-lg lg:text-xl font-bold text-gray-800'>
                        Credits & Gifts
                      </h2>
                    </div>
                  </div>

                  <div className='grid grid-cols-2 gap-3 sm:gap-4 mb-4'>
                    {/* Available Credits */}
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className='bg-white border-2 border-purple-200 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center hover:border-purple-300 transition-colors cursor-pointer'
                    >
                      <div className='bg-gradient-to-r from-purple-100 to-purple-200 rounded-full w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 flex items-center justify-center mx-auto mb-2 sm:mb-3'>
                        <CreditCard className='w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-purple-600' />
                      </div>
                      <p className='text-xl sm:text-2xl lg:text-3xl font-bold text-purple-600 mb-1'>
                        {data.credits.available}
                      </p>
                      <p className='text-xs sm:text-sm font-semibold text-gray-700'>
                        Available Credits
                      </p>
                    </motion.div>

                    {/* Gift Cards */}
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className='bg-white border-2 border-pink-200 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center hover:border-pink-300 transition-colors cursor-pointer'
                    >
                      <div className='bg-gradient-to-r from-pink-100 to-pink-200 rounded-full w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 flex items-center justify-center mx-auto mb-2 sm:mb-3'>
                        <Gift className='w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-pink-600' />
                      </div>
                      <p className='text-xl sm:text-2xl lg:text-3xl font-bold text-pink-600 mb-1'>
                        {data.credits.gifts}
                      </p>
                      <p className='text-xs sm:text-sm font-semibold text-gray-700'>
                        Gift Cards
                      </p>
                    </motion.div>
                  </div>

                  {/* Expiration Warning */}
                  {data.credits.expiring && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className='bg-amber-50 border-2 border-amber-200 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4'
                    >
                      <div className='flex items-center'>
                        <Clock className='w-4 h-4 sm:w-5 sm:h-5 text-amber-600 mr-2 sm:mr-3' />
                        <div>
                          <p className='text-xs sm:text-sm font-semibold text-amber-800'>
                            Credits Expiring Soon
                          </p>
                          <p className='text-xs sm:text-sm text-amber-700'>
                            Expires on {formatDate(data.credits.expiring)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Use Credits Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/rewards')}
                    className='w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold hover:from-pink-600 hover:to-rose-600 transition-all'
                  >
                    Use Credits
                  </motion.button>
                </DashboardCard>
              )}

              {/* Past Visits */}
              {data.pastVisits && (
                <DashboardCard gradient='pink'>
                  <div className='flex items-center justify-between mb-4 sm:mb-6'>
                    <div className='flex items-center'>
                      <div className='bg-gradient-to-r from-pink-500 to-pink-600 p-2 sm:p-3 rounded-xl sm:rounded-2xl mr-2 sm:mr-3'>
                        <Heart className='w-5 h-5 sm:w-6 sm:h-6 text-white' />
                      </div>
                      <h2 className='text-base sm:text-lg lg:text-xl font-bold text-gray-800'>
                        Past Visits
                      </h2>
                    </div>
                  </div>
                  <div className='space-y-2 sm:space-y-3 max-h-64 sm:max-h-80 lg:max-h-96 overflow-y-auto'>
                    {data.pastVisits.length > 0 ? (
                      data.pastVisits.map((visit) => (
                        <motion.div
                          key={visit._id}
                          whileHover={{ scale: 1.02 }}
                          className='bg-white border-2 border-pink-200 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:border-pink-300 transition-colors cursor-pointer'
                        >
                          <div className='flex items-center justify-between'>
                            <div className='flex-1 min-w-0'>
                              <p className='font-semibold text-gray-800 text-xs sm:text-sm lg:text-base truncate'>
                                {visit.serviceName}
                              </p>
                              <p className='text-xs sm:text-sm text-gray-500'>
                                {formatDate(visit.date)}
                              </p>
                            </div>
                            <div className='flex items-center ml-2 sm:ml-3 flex-shrink-0'>
                              {visit.rating ? (
                                [...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-3 h-3 sm:w-4 sm:h-4 ${
                                      i < visit.rating
                                        ? 'text-yellow-400 fill-current'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))
                              ) : (
                                <button
                                  onClick={() => navigate('/Booking')}
                                  className='text-xs text-pink-600 hover:text-pink-700 bg-pink-50 px-2 py-1 rounded'
                                >
                                  Rate
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className='text-center py-8'>
                        <Heart className='w-12 h-12 text-gray-400 mx-auto mb-4' />
                        <p className='text-gray-600'>No past visits yet</p>
                      </div>
                    )}
                  </div>
                </DashboardCard>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default DashboardPage
