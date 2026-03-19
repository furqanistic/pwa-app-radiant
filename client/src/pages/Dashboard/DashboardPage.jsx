// File: client/src/pages/Dashboard/DashboardPage.jsx - COMPLETE ENHANCED VERSION
import ClinicLocations from '@/components/Dashboard/ClinicLocations'
import GamesSection from '@/components/Dashboard/GamesSection'
import PointsCard from '@/components/Dashboard/PointsCard'
import SpaDashboard from '@/components/Dashboard/SpaDashboard'
import { useBranding } from '@/context/BrandingContext'
import { dashboardQueryKeys, useDashboardData } from '@/hooks/useDashboard'
import { useAvailableGames } from '@/hooks/useGameWheel'
import { useClaimReward, useEnhancedRewardsCatalog } from '@/hooks/useRewards'
import { dashboardService } from '@/services/dashboardService'
import { rewardsService } from '@/services/rewardsService'
import { resolveImageUrl } from '@/lib/imageHelpers'
import { buildAutoApplyRewardState } from '@/utils/rewardFlow'
import { useQueryClient } from '@tanstack/react-query'
import confetti from 'canvas-confetti'
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
  Pause,
  Percent,
  Plus,
  RefreshCw,
  Share2,
  ShoppingBag,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  UserPlus,
  Users,
  Volume2,
  XCircle,
  Zap,
} from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import Layout from '../Layout/Layout'

const Motion = motion

// Icon mapping for string icon names from backend
const iconMap = {
  UserPlus: UserPlus,
  Calendar: Calendar,
  ShoppingBag: ShoppingBag,
  Star: Star,
  Share2: Share2,
  Clock: Clock,
  TrendingUp: TrendingUp,
  UserCheck: Users,
  Gift: Gift,
  Bell: AlertCircle,
  ClipboardList: Award,
  CheckCircle: CheckCircle,
  Plus: Plus,
  Package: Gift,
  Target: Target,
  Users: Users,
  RotateCcw: RefreshCw,
  Image: Sparkles,
  HeartPulse: Heart,
}

// Enhanced Reward Card Component with better UX
const RewardCard = ({
  reward,
  onClaim,
  isOptimisticUpdate = false,
}) => {
  const [isClaiming, setIsClaiming] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef(null)
  const brandGradient = 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))'

  const fireClaimConfetti = (targetElement) => {
    const rect = targetElement?.getBoundingClientRect?.()
    const origin = rect
      ? {
          x: (rect.left + rect.width / 2) / window.innerWidth,
          y: (rect.top + rect.height / 2) / window.innerHeight,
        }
      : { x: 0.5, y: 0.5 }

    confetti({
      particleCount: 70,
      spread: 65,
      startVelocity: 35,
      origin,
      scalar: 0.9,
      zIndex: 9999,
      ticks: 220,
    })
    confetti({
      particleCount: 35,
      spread: 100,
      startVelocity: 25,
      origin,
      scalar: 0.75,
      zIndex: 9999,
      ticks: 180,
    })
  }

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

  const canAfford = reward.canClaim && !isOptimisticUpdate

  const getRewardIcon = (type) => {
    const iconClassName = 'w-4 h-4 text-white drop-shadow-sm'
    switch (type) {
      case 'add_on':
        return <Plus className={iconClassName} />
      case 'upgrade':
        return <TrendingUp className={iconClassName} />
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

  const handleClaim = async (event) => {
    if (!canAfford || isClaiming) return

    setIsClaiming(true)

    try {
      const isSuccess = await onClaim(reward._id)
      if (isSuccess) {
        fireClaimConfetti(event?.currentTarget)
      }
    } catch {
      // Toast is handled by mutation hook
    } finally {
      setIsClaiming(false)
    }
  }

  const getButtonText = () => {
    if (isClaiming) return 'Claiming...'
    if (isOptimisticUpdate) return 'Processing...'
    if (canAfford) return 'Claim Reward'
    if (!(reward.canClaimMoreInWindow ?? reward.canClaimMoreThisMonth)) return 'Limit Reached'
    return `Need ${reward.pointsNeeded} more`
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: canAfford && !isOptimisticUpdate ? -2 : 0 }}
      className={`relative h-full bg-white rounded-[1.35rem] overflow-hidden transition-all border flex flex-col shadow-[0_12px_34px_-28px_rgba(15,23,42,0.28)] ${
        canAfford && !isOptimisticUpdate
          ? 'hover:border-[#f9f9fa] hover:-translate-y-0.5 cursor-pointer group border-[#f9f9fa]'
          : isOptimisticUpdate
          ? 'border-[#f9f9fa] opacity-75'
          : 'opacity-60 border-gray-100'
      } ${isClaiming ? 'animate-pulse' : ''}`}
    >
      <div className='relative h-32 sm:h-36 md:h-40 overflow-hidden'>
        <img
          src={resolveImageUrl(
            reward.image,
            'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop',
            { width: 500, height: 300 }
          )}
          alt={reward.name}
          className={`w-full h-full object-cover transition-transform duration-300 ${
            canAfford && !isOptimisticUpdate ? 'group-hover:scale-105' : ''
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
              {reward.typeDisplay || reward.type}
            </span>
          </span>
        </div>

        {/* Point Cost */}
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
              type='button'
              onClick={toggleVoiceNote}
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

        {/* Details Grid */}
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
        <motion.button
          type='button'
          onClick={handleClaim}
          disabled={!canAfford || isClaiming || isOptimisticUpdate}
          whileTap={{ scale: canAfford ? 0.98 : 1 }}
          style={canAfford && !isClaiming && !isOptimisticUpdate ? { background: brandGradient } : undefined}
          className={`mt-auto w-full min-h-[2.5rem] py-2.5 rounded-[0.9rem] font-medium text-[0.82rem] transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] focus-visible:ring-offset-2 ${
            isClaiming
              ? 'bg-[color:var(--brand-primary)] text-white cursor-wait'
              : isOptimisticUpdate
              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
              : canAfford
              ? 'text-white hover:brightness-105'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isClaiming ? (
            <>
              <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
              Claiming...
            </>
          ) : (
            getButtonText()
          )}
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
}) => {
  const gradients = {
    default: 'bg-white border border-gray-200/70 shadow-sm',
    pink: 'bg-white border border-pink-50/70 shadow-sm',
    purple: 'bg-white border border-purple-50/70 shadow-sm',
    indigo: 'bg-white border border-indigo-50/70 shadow-sm',
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
  const { locationId } = useBranding()
  const [optimisticRewards, setOptimisticRewards] = useState(new Set())
  const withSpaParam = (path) =>
    locationId ? `${path}?spa=${encodeURIComponent(locationId)}` : path
  const {
    rewards = [],
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

      const fallbackReward = rewards.find((reward) => reward._id === rewardId)
      const { linkedServiceId, autoApplyState } = buildAutoApplyRewardState({
        data,
        rewardId,
        fallbackReward,
      })
      if (linkedServiceId) {
        navigate(withSpaParam(`/services/${linkedServiceId}`), {
          state: autoApplyState,
        })
      }

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

    try {
      await claimRewardMutation.mutateAsync(rewardId)
      return true
    } catch {
      return false
    }
  }

  const recentRewards = rewards.slice(-4).reverse()

  // Pull to refresh handler for PWA
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await refetch()
      toast.success('Rewards refreshed!')
    } catch {
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
        <DashboardCard>
          <div className='mb-4 sm:mb-6'>
            <div className='h-8 w-44 rounded-xl bg-gray-100 animate-pulse' />
            <div className='mt-2 h-4 w-56 rounded-lg bg-gray-100 animate-pulse' />
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6'>
            {[...Array(4)].map((_, index) => (
              <div key={index} className={index === 3 ? 'hidden xl:block' : ''}>
                <div className='rounded-[1.35rem] border border-gray-100 bg-white p-3.5 shadow-[0_12px_34px_-28px_rgba(15,23,42,0.18)]'>
                  <div className='h-32 sm:h-36 md:h-40 rounded-[1rem] bg-gray-100 animate-pulse mb-3' />
                  <div className='h-4 w-3/4 rounded-lg bg-gray-100 animate-pulse mb-2' />
                  <div className='h-3 w-full rounded-lg bg-gray-100 animate-pulse mb-1.5' />
                  <div className='h-3 w-5/6 rounded-lg bg-gray-100 animate-pulse mb-3' />
                  <div className='h-10 rounded-[0.8rem] bg-gray-100 animate-pulse mb-3' />
                  <div className='grid grid-cols-2 gap-2 mb-3'>
                    <div className='h-14 rounded-[0.8rem] bg-gray-100 animate-pulse' />
                    <div className='h-14 rounded-[0.8rem] bg-gray-100 animate-pulse' />
                  </div>
                  <div className='h-10 rounded-[0.9rem] bg-gray-100 animate-pulse' />
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
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
              type='button'
              onClick={handleRefresh}
              className='bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] text-white px-4 py-2 rounded-lg hover:brightness-95 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] focus-visible:ring-offset-2'
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
              type='button'
              onClick={handleRefresh}
              className='bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] text-white px-4 py-2 rounded-lg hover:brightness-95 transition-colors flex items-center gap-2 mx-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] focus-visible:ring-offset-2'
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
            <div className='bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] p-2 sm:p-3 rounded-xl sm:rounded-2xl mr-3 sm:mr-4'>
              <Award className='w-5 h-5 sm:w-6 sm:h-6 text-white' />
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
            <span className='bg-[color:var(--brand-primary)/0.12] text-[color:var(--brand-primary)] px-3 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-semibold'>
              {
                recentRewards.filter(
                  (r) => r.canClaim && !optimisticRewards.has(r._id)
                ).length
              }{' '}
              Available
            </span>
            <button
              type='button'
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label='Refresh rewards'
              className='text-[color:var(--brand-primary)] hover:text-[color:var(--brand-primary)] p-2 rounded-lg hover:bg-[color:var(--brand-primary)/0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] focus-visible:ring-offset-2'
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </button>
            <button
              type='button'
              onClick={() => navigate(withSpaParam('/rewards'))}
              className='text-[color:var(--brand-primary)] hover:text-[color:var(--brand-primary)] flex items-center gap-1 text-sm font-semibold hover:bg-[color:var(--brand-primary)/0.06] px-3 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] focus-visible:ring-offset-2'
            >
              View All
              <ChevronRight className='w-4 h-4' />
            </button>
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6'>
          <AnimatePresence mode='wait'>
            {recentRewards.map((reward, index) => (
              <div
                key={reward._id}
                className={index === 3 ? 'hidden xl:block' : ''}
              >
                <RewardCard
                  reward={reward}
                  onClaim={handleClaimReward}
                  isOptimisticUpdate={optimisticRewards.has(reward._id)}
                />
              </div>
            ))}
          </AnimatePresence>
        </div>
      </DashboardCard>
    </div>
  )
}

// Automated Gifts Section for Clients
const AutomatedGiftsSection = ({ gifts = [] }) => {
  if (gifts.length === 0) return null

  return (
    <div className='mb-4 sm:mb-6 lg:mb-8'>
      <DashboardCard>
        <div className='flex items-center gap-3 mb-6'>
          <div className='bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] p-2 sm:p-3 rounded-xl sm:rounded-2xl'>
            <Gift className='w-5 h-5 sm:w-6 sm:h-6 text-white' />
          </div>
          <div>
            <h2 className='text-lg sm:text-xl lg:text-2xl font-bold text-gray-800'>
              Automated Gifts
            </h2>
            <p className='text-xs sm:text-sm text-gray-600'>
              Special gifts prepared just for you
            </p>
          </div>
        </div>

        <div className='flex overflow-x-auto gap-4 pb-4 no-scrollbar'>
          {gifts.map((gift, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -5 }}
              className='min-w-[280px] md:min-w-[320px] bg-gray-50/80 border border-gray-200/70 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md transition-all'
            >
              <div className='relative h-40'>
                {gift.image ? (
                  <img
                    src={gift.image}
                    alt={gift.name}
                    className='w-full h-full object-cover'
                  />
                ) : (
                  <div className='w-full h-full bg-[color:var(--brand-primary)/0.06] flex items-center justify-center'>
                    <Gift className='w-12 h-12 text-[color:var(--brand-primary)/0.55]' />
                  </div>
                )}
                <div className='absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm'>
                  <span className='text-xs font-black text-[color:var(--brand-primary)] uppercase tracking-widest'>
                    Active
                  </span>
                </div>
              </div>
              <div className='p-6'>
                <h3 className='text-lg font-black text-gray-900 mb-1 truncate'>
                  {gift.name}
                </h3>
                <p className='text-2xl font-black text-[color:var(--brand-primary)] mb-3'>
                  {gift.content}
                </p>
                <div className='flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-tighter'>
                  <Sparkles className='w-3 h-3 text-[color:var(--brand-primary)/0.6]' />
                  <span>Available at your location</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </DashboardCard>
    </div>
  )
}

// Need More Points Section
const NeedMorePointsSection = ({ methods = [] }) => {
  const navigate = useNavigate()
  const { locationId, branding } = useBranding()

  const withSpaParam = (path) => {
    if (!locationId) return path
    const separator = path.includes('?') ? '&' : '?'
    return `${path}${separator}spa=${encodeURIComponent(locationId)}`
  }

  const reviewLink = branding?.reviewLink || null

  const actionMap = {
    'Share Now': '/referrals',
    'Book Now': '/services',
    'Shop Now': '/services',
    Review: null,
  }

  const handleAction = (method) => {
    const path = actionMap[method.action] || method.path
    if (path) navigate(withSpaParam(path))
  }

  const handleExternalReview = async () => {
    if (!reviewLink) {
      toast.error('Review link not available')
      return
    }
    try {
      const response = await rewardsService.awardGoogleReview()
      if (response?.data?.pointsAwarded) {
        toast.success(`+${response.data.pointsAwarded} points added`)
      }
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Review reward already claimed'
      toast.message(message)
    } finally {
      window.open(reviewLink, '_blank', 'noopener,noreferrer')
    }
  }

  const handleInAppReview = () => {
    navigate(withSpaParam('/Booking?tab=history&review=1'))
  }

  return (
    <DashboardCard gradient='purple'>
      <div className='flex flex-wrap items-center justify-between gap-2 sm:gap-4 mb-3'>
        <div className='flex items-center gap-2'>
          <div className='rounded-xl bg-white p-2 shadow-sm'>
            <Zap className='w-5 h-5 text-[color:var(--brand-primary)]' />
          </div>
          <div>
            <h2 className='text-lg font-bold text-gray-900'>Earn More Points</h2>
            <p className='text-xs text-gray-500'>Small actions that boost your balance</p>
          </div>
        </div>
        <span className='text-xs uppercase tracking-[0.3em] text-[color:var(--brand-primary)]'>
          {methods.length} ideas
        </span>
      </div>
      <div className='grid grid-cols-2 gap-3'>
        {methods.slice(0, 4).map((method) => {
          const IconComponent = iconMap[method.icon] || Zap
          const isReview =
            method.actionType === 'review' || method.action === 'Review'
          const hasNavigateAction =
            method.actionType === 'navigate' &&
            Boolean(actionMap[method.action] || method.path)
          return (
            <div
              key={method.id}
              className='flex flex-col items-start gap-2 rounded-xl border border-gray-200 bg-white/80 p-3 text-left transition hover:border-[color:var(--brand-primary)] hover:shadow-lg'
            >
              <div className='flex items-center justify-center rounded-full bg-[color:var(--brand-primary)/0.12] w-9 h-9'>
                <IconComponent className='w-4 h-4 text-[color:var(--brand-primary)]' />
              </div>
              <div>
                <p className='text-sm font-semibold text-gray-900'>{method.title}</p>
                <p className='text-xs text-gray-500'>{method.description}</p>
              </div>
              {isReview ? (
                <div className='mt-auto flex flex-col gap-2 w-full'>
                  <button
                    type='button'
                    onClick={handleInAppReview}
                    className='w-full rounded-lg bg-[color:var(--brand-primary)]/10 text-[color:var(--brand-primary)] text-xs font-bold py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] focus-visible:ring-offset-2'
                  >
                    In-App Review
                  </button>
                  <button
                    type='button'
                    onClick={handleExternalReview}
                    disabled={!reviewLink}
                    className='w-full rounded-lg bg-gray-900 text-white text-xs font-bold py-2 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2'
                  >
                    Google Review
                  </button>
                  <span className='text-[10px] font-black text-[color:var(--brand-primary)]'>
                    {method.points} pts (in-app)
                  </span>
                </div>
              ) : (
                <>
                  {hasNavigateAction ? (
                    <button
                      type='button'
                      onClick={() => handleAction(method)}
                      className='mt-auto w-full rounded-lg bg-[color:var(--brand-primary)]/10 text-[color:var(--brand-primary)] text-xs font-bold py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] focus-visible:ring-offset-2'
                    >
                      {method.action}
                    </button>
                  ) : (
                    <span className='mt-auto inline-flex rounded-lg bg-gray-100 px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-600'>
                      Automatic when eligible
                    </span>
                  )}
                  <span className='text-xs font-black text-[color:var(--brand-primary)]'>
                    {method.points} pts
                  </span>
                </>
              )}
            </div>
          )
        })}
      </div>
    </DashboardCard>
  )
}

const DashboardPage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { locationId } = useBranding()
  const { currentUser } = useSelector((state) => state.user)

  const withSpaParam = (path) =>
    locationId ? `${path}?spa=${encodeURIComponent(locationId)}` : path

  const isSpaManagementView = ['spa', 'admin'].includes(currentUser?.role)

  // Fetch dashboard data
  const { data: dashboardData, isLoading, error, refetch } = useDashboardData({
    refetchInterval: false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })
  const refreshRecentCheckInsOnly = useCallback(async () => {
    const response = await dashboardService.getDashboardData()
    const latestData = response?.data?.data || {}

    queryClient.setQueryData(dashboardQueryKeys.data(), (current) => {
      if (!current?.data) {
        return response?.data || current
      }

      return {
        ...current,
        data: {
          ...current.data,
          recentQrClaims: Array.isArray(latestData.recentQrClaims)
            ? latestData.recentQrClaims
            : current.data.recentQrClaims || [],
          recentQrClaimsSummary:
            latestData.recentQrClaimsSummary ||
            current.data.recentQrClaimsSummary ||
            {},
        },
      }
    })
  }, [queryClient])
  // Prefetch games in parallel so GamesSection appears faster.
  useAvailableGames({}, { enabled: currentUser?.role === 'user' })

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
        <div className='min-h-screen bg-[color:var(--brand-primary)/0.06] p-3 sm:p-4 lg:p-6'>
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
        <div className='min-h-screen bg-[color:var(--brand-primary)/0.06] p-3 sm:p-4 lg:p-6'>
          <div className='max-w-7xl mx-auto'>
            <div className='text-center py-12'>
              <AlertCircle className='w-16 h-16 text-red-500 mx-auto mb-4' />
              <p className='text-red-600 mb-4 text-lg'>
                Failed to load dashboard data
              </p>
              <button
                type='button'
                onClick={() => refetch()}
                className='bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] text-white px-6 py-3 rounded-lg hover:brightness-95 transition-colors flex items-center gap-2 mx-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] focus-visible:ring-offset-2'
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
      <div className='min-h-screen bg-[color:var(--brand-primary)/0.06] p-3 sm:p-4 lg:p-6'>
        <div className='max-w-7xl mx-auto'>
          {['spa', 'admin'].includes(currentUser?.role || data.role) ? (
            <SpaDashboard
              data={data}
              refetch={refetch}
              refreshRecentCheckIns={refreshRecentCheckInsOnly}
            />
          ) : (
            <>
              {/* Points Card - Full Width at Top */}
              <div className='mb-4 sm:mb-6 lg:mb-8'>
                <PointsCard />
              </div>

              {/* Spa Rewards Section - Full Width */}
              <SpaRewardsSection />

              {/* Automated Gifts Section */}
              <AutomatedGiftsSection gifts={data.automatedGifts} />

              <div className='mb-4 sm:mb-6 lg:mb-8'>
                <GamesSection />
              </div>
              <div className='mb-4 sm:mb-6 lg:mb-8'>
                <ClinicLocations />
              </div>
              {/* Need More Points Section - Full Width */}
              {data.pointsEarningMethods?.length > 0 && (
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
                      <div className='flex items-center justify-between mb-3'>
                        <div className='flex items-center gap-2'>
                          <div className='rounded-full bg-white p-2 shadow-sm'>
                            <Calendar className='w-5 h-5 text-[color:var(--brand-primary)]' />
                          </div>
                          <div>
                            <h2 className='text-lg font-bold text-gray-800'>Upcoming Appointments</h2>
                            <p className='text-xs text-gray-500'>
                              {data.upcomingAppointments.length} scheduled
                            </p>
                          </div>
                        </div>
                        <button
                          type='button'
                          onClick={() => navigate(withSpaParam('/services'))}
                          className='text-xs font-semibold text-[color:var(--brand-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] focus-visible:ring-offset-2 rounded'
                        >
                          Book More
                        </button>
                      </div>
                      {data.upcomingAppointments.length > 0 ? (
                        <div className='space-y-3'>
                          {data.upcomingAppointments.map((appointment) => (
                            <motion.div
                              key={appointment._id}
                              whileHover={{ scale: 1.01 }}
                              className='flex items-center justify-between rounded-xl border border-gray-200/70 bg-white/70 px-4 py-3 shadow-sm'
                            >
                              <div className='flex-1 min-w-0'>
                                <p className='font-semibold text-sm text-gray-900 truncate'>
                                  {appointment.serviceName}
                                </p>
                                <p className='text-xs text-gray-500 truncate'>
                                  {appointment.providerName}
                                </p>
                              </div>
                              <div className='flex flex-col items-end text-right text-xs sm:text-sm text-[color:var(--brand-primary)] font-semibold'>
                                <span>{formatDate(appointment.date)}</span>
                                <span>{appointment.time}</span>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className='text-center py-8'>
                          <Calendar className='w-12 h-12 text-gray-400 mx-auto mb-4' />
                          <p className='text-gray-600 mb-4'>No upcoming appointments</p>
                          <button
                            type='button'
                            onClick={() => navigate(withSpaParam('/services'))}
                            className='bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] text-white px-6 py-3 rounded-xl hover:brightness-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] focus-visible:ring-offset-2'
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
                      <div className='flex items-center justify-between mb-4'>
                        <div className='flex items-center gap-2'>
                          <div className='rounded-lg bg-white p-2 shadow-sm'>
                            <Users className='w-5 h-5 text-[color:var(--brand-primary)]' />
                          </div>
                          <div>
                            <h2 className='text-lg font-bold text-gray-800'>Referral Program</h2>
                            <p className='text-xs text-gray-500'>
                              Share your code and earn points
                            </p>
                          </div>
                        </div>
                        <button
                          type='button'
                          onClick={() => navigate(withSpaParam('/referrals'))}
                          className='text-xs font-semibold text-[color:var(--brand-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] focus-visible:ring-offset-2 rounded'
                        >
                          Share Now
                        </button>
                      </div>
                      <div className='grid grid-cols-3 gap-3 text-center'>
                        {[
                          {
                            label: 'Total Referrals',
                            value: data.referralStats.total,
                            accent: 'text-[color:var(--brand-primary)]',
                          },
                          {
                            label: 'This Month',
                            value: data.referralStats.thisMonth,
                            accent: 'text-green-600',
                          },
                          {
                            label: 'Points Earned',
                            value: data.referralStats.earnings,
                            accent: 'text-[color:var(--brand-primary)]',
                          },
                        ].map((stat) => (
                          <div
                            key={stat.label}
                            className='rounded-xl border border-gray-200 bg-white p-3'
                          >
                            <p className={`text-2xl font-bold ${stat.accent}`}>
                              {stat.value}
                            </p>
                            <p className='text-xs text-gray-500'>{stat.label}</p>
                          </div>
                        ))}
                      </div>
                      <div className='mt-3 rounded-xl border border-dashed border-[color:var(--brand-primary)/40] bg-white/80 p-3 text-xs text-gray-600 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
                        <span>
                          Code: <span className='font-semibold text-gray-900'>{data.referralStats.referralCode || '—'}</span>
                        </span>
                        <span className='text-[0.65rem] uppercase tracking-[0.3em] text-[color:var(--brand-primary)]'>
                          Active
                        </span>
                      </div>
                    </DashboardCard>
                  )}
                </div>

                {/* Right Column - Takes 5 columns on desktop */}
                <div className='lg:col-span-5 space-y-4 sm:space-y-6 lg:space-y-8'>
                  {/* Available Credits & Gifts */}
                  {data.credits && (
                    <DashboardCard gradient='purple'>
                      <div className='flex items-center justify-between mb-4'>
                        <div className='flex items-center gap-2'>
                          <div className='rounded-lg bg-white p-2 shadow-sm'>
                            <Gift className='w-5 h-5 text-[color:var(--brand-primary)]' />
                          </div>
                          <div>
                            <h2 className='text-lg font-bold text-gray-800'>Credits & Gifts</h2>
                            <p className='text-xs text-gray-500'>
                              Quick view of available credits
                            </p>
                          </div>
                        </div>
                        <span className='text-xs font-semibold text-[color:var(--brand-primary)]'>
                          Updated {data.credits.lastUpdated || 'today'}
                        </span>
                      </div>

                      <div className='grid grid-cols-2 gap-3 mb-3'>
                        {[
                          {
                            label: 'Available Credits',
                            value: data.credits.available,
                            icon: CreditCard,
                          },
                          {
                            label: 'Gift Cards',
                            value: data.credits.gifts,
                            icon: Gift,
                          },
                        ].map((stat) => (
                          <div
                            key={stat.label}
                            className='flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3'
                          >
                            <stat.icon className='w-5 h-5 text-[color:var(--brand-primary)]' />
                            <div>
                              <p className='text-lg font-semibold text-gray-900'>{stat.value}</p>
                              <p className='text-xs text-gray-500'>{stat.label}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {data.credits.expiring && (
                        <div className='rounded-xl border border-amber-200 bg-amber-50 p-3 mb-3 text-xs text-amber-700 flex items-center gap-2'>
                          <Clock className='w-4 h-4 text-amber-600' />
                          Expires on {formatDate(data.credits.expiring)}
                        </div>
                      )}

                      <button
                        type='button'
                        onClick={() => navigate(withSpaParam('/rewards'))}
                        className='w-full rounded-lg bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] text-white py-2.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] focus-visible:ring-offset-2'
                      >
                        Redeem Credits
                      </button>
                    </DashboardCard>
                  )}

                  {/* Past Visits */}
                  {data.pastVisits && (
                    <DashboardCard gradient='pink'>
                      <div className='flex items-center justify-between mb-4'>
                        <div className='flex items-center gap-2'>
                          <div className='rounded-lg bg-white p-2 shadow-sm'>
                            <Heart className='w-5 h-5 text-[color:var(--brand-primary)]' />
                          </div>
                          <div>
                            <h2 className='text-lg font-bold text-gray-800'>Past Visits</h2>
                            <p className='text-xs text-gray-500'>
                              Recent treatments & ratings
                            </p>
                          </div>
                        </div>
                        <button
                          type='button'
                          onClick={() => navigate(withSpaParam('/Booking'))}
                          className='text-xs font-semibold text-[color:var(--brand-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] focus-visible:ring-offset-2 rounded'
                        >
                          See History
                        </button>
                      </div>
                      <div className='space-y-3 max-h-60 overflow-y-auto pr-1'>
                        {data.pastVisits.length > 0 ? (
                          data.pastVisits.slice(0, 5).map((visit) => (
                            <motion.div
                              key={visit._id}
                              whileHover={{ scale: 1.01 }}
                              className='flex items-center justify-between rounded-xl border border-gray-200 bg-white/80 px-3 py-2'
                            >
                              <div className='flex-1 min-w-0'>
                                <p className='text-sm font-semibold text-gray-900 truncate'>
                                  {visit.serviceName}
                                </p>
                                <p className='text-[0.65rem] text-gray-500'>
                                  {formatDate(visit.date)}
                                </p>
                              </div>
                              <div className='text-xs font-semibold text-[color:var(--brand-primary)] ml-3'>
                                {visit.rating ? `${visit.rating}★` : 'Rate'}
                              </div>
                            </motion.div>
                          ))
                        ) : (
                          <div className='text-center py-6 text-xs text-gray-500'>
                            No past visits yet
                          </div>
                        )}
                      </div>
                    </DashboardCard>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default DashboardPage
