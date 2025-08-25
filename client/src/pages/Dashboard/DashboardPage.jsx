// File: client/src/pages/Dashboard/DashboardPage.jsx
import PointsCard from '@/components/Dashboard/PointsCard'
import { useClaimReward, useEnhancedRewardsCatalog } from '@/hooks/useRewards'
import { motion } from 'framer-motion'
import {
  Award,
  Calendar,
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
  Share2,
  ShoppingBag,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Unlock,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react'
import React, { useState } from 'react'
import { toast } from 'react-hot-toast'
import { useDispatch, useSelector } from 'react-redux'
import Layout from '../Layout/Layout'

// Mock data for non-reward sections (appointments, referrals, etc.)
const mockData = {
  upcomingAppointments: [
    {
      id: 1,
      service: 'HydraFacial Premium',
      date: '2025-06-08',
      time: '2:30 PM',
      provider: 'Dr. Sarah Chen',
    },
    {
      id: 2,
      service: 'Botox Consultation',
      date: '2025-06-15',
      time: '10:00 AM',
      provider: 'Dr. Maria Rodriguez',
    },
  ],
  pastVisits: [
    {
      id: 1,
      service: 'Laser Hair Removal',
      date: '2025-05-20',
      rating: 5,
    },
    {
      id: 2,
      service: 'Chemical Peel',
      date: '2025-05-05',
      rating: 5,
    },
    {
      id: 3,
      service: 'Microneedling',
      date: '2025-04-18',
      rating: 4,
    },
    {
      id: 4,
      service: 'Dermaplaning',
      date: '2025-04-02',
      rating: 5,
    },
  ],
  referrals: {
    total: 8,
    thisMonth: 2,
    earnings: 240,
  },
  credits: {
    available: 3,
    gifts: 1,
    expiring: '2025-08-15',
  },
  pointsEarningMethods: [
    {
      id: 1,
      title: 'Invite Friends',
      description: 'Earn 500 points per referral',
      icon: UserPlus,
      points: '+500',
      action: 'Share Now',
    },
    {
      id: 2,
      title: 'Book Appointments',
      description: 'Get 50 points per booking',
      icon: Calendar,
      points: '+50',
      action: 'Book Now',
    },
    {
      id: 3,
      title: 'Purchase Products',
      description: 'Earn 1 point per $1 spent',
      icon: ShoppingBag,
      points: '+1/$1',
      action: 'Shop Now',
    },
    {
      id: 4,
      title: 'Social Media Share',
      description: 'Share your experience',
      icon: Share2,
      points: '+25',
      action: 'Share',
    },
  ],
}

// Reward Card Component - Copied from RewardsCatalogPage
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
              {reward.typeDisplay || reward.type}
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

// Spa Rewards Section Component
const SpaRewardsSection = () => {
  // Fetch rewards data using the same hook as RewardsCatalogPage
  const {
    rewards = [],
    userPoints = 0,
    stats = {},
    isLoading,
    error,
  } = useEnhancedRewardsCatalog({
    // No filters to get all rewards, we'll slice them below
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

  const handleClaimReward = async (rewardId) => {
    claimRewardMutation.mutate(rewardId)
  }

  // Get last 3 rewards (most recent)
  const lastThreeRewards = rewards.slice(-3).reverse()

  // Loading state
  if (isLoading) {
    return (
      <div className='mb-4 sm:mb-6 lg:mb-8'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className='bg-white border-2 border-pink-100 rounded-2xl sm:rounded-3xl p-4 sm:p-6'
        >
          <div className='flex items-center mb-4 sm:mb-6'>
            <div className='bg-gradient-to-r from-pink-500 to-rose-500 p-2 sm:p-3 rounded-xl sm:rounded-2xl mr-3 sm:mr-4'>
              <Sparkles className='w-5 h-5 sm:w-6 sm:h-6 text-white' />
            </div>
            <div>
              <h2 className='text-lg sm:text-xl lg:text-2xl font-bold text-gray-800'>
                Spa Rewards
              </h2>
              <p className='text-xs sm:text-sm text-gray-600'>
                Loading your rewards...
              </p>
            </div>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6'>
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className='bg-gray-200 rounded-2xl h-80 animate-pulse'
              ></div>
            ))}
          </div>
        </motion.div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className='mb-4 sm:mb-6 lg:mb-8'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className='bg-white border-2 border-pink-100 rounded-2xl sm:rounded-3xl p-4 sm:p-6'
        >
          <div className='flex items-center mb-4'>
            <div className='bg-gradient-to-r from-pink-500 to-rose-500 p-2 sm:p-3 rounded-xl sm:rounded-2xl mr-3 sm:mr-4'>
              <Sparkles className='w-5 h-5 sm:w-6 sm:h-6 text-white' />
            </div>
            <div>
              <h2 className='text-lg sm:text-xl lg:text-2xl font-bold text-gray-800'>
                Spa Rewards
              </h2>
              <p className='text-xs sm:text-sm text-red-600'>
                {error?.message || 'Failed to load rewards'}
              </p>
            </div>
          </div>
          <div className='text-center py-8'>
            <div className='text-3xl mb-2'>💔</div>
            <p className='text-gray-600'>Unable to load rewards at this time</p>
          </div>
        </motion.div>
      </div>
    )
  }

  // Empty state
  if (rewards.length === 0) {
    return (
      <div className='mb-4 sm:mb-6 lg:mb-8'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className='bg-white border-2 border-pink-100 rounded-2xl sm:rounded-3xl p-4 sm:p-6'
        >
          <div className='flex items-center mb-4'>
            <div className='bg-gradient-to-r from-pink-500 to-rose-500 p-2 sm:p-3 rounded-xl sm:rounded-2xl mr-3 sm:mr-4'>
              <Sparkles className='w-5 h-5 sm:w-6 sm:h-6 text-white' />
            </div>
            <div>
              <h2 className='text-lg sm:text-xl lg:text-2xl font-bold text-gray-800'>
                Spa Rewards
              </h2>
              <p className='text-xs sm:text-sm text-gray-600'>
                No rewards available yet
              </p>
            </div>
          </div>
          <div className='text-center py-8'>
            <div className='text-4xl mb-3'>🎁</div>
            <p className='text-gray-600'>New rewards coming soon!</p>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className='mb-4 sm:mb-6 lg:mb-8'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className='bg-white border-2 border-pink-100 rounded-2xl sm:rounded-3xl p-4 sm:p-6'
      >
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
              {lastThreeRewards.filter((r) => r.canClaim).length} Available
            </span>
            <button className='text-pink-600 hover:text-pink-700 flex items-center gap-1 text-sm font-semibold'>
              View All
              <ChevronRight className='w-4 h-4' />
            </button>
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6'>
          {lastThreeRewards.map((reward) => (
            <RewardCard
              key={reward._id}
              reward={reward}
              onClaim={handleClaimReward}
              userPoints={userPoints}
            />
          ))}
        </div>
      </motion.div>
    </div>
  )
}

// Enhanced Card Component
const DashboardCard = ({ children, className = '', gradient = 'default' }) => {
  const gradients = {
    default: 'bg-white border-2 border-pink-100',
    pink: 'bg-gradient-to-br from-pink-50 to-pink-100 border-2 border-pink-200',
    purple:
      'bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200',
    indigo:
      'bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200',
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

// Need More Points Section
const NeedMorePointsSection = ({ methods }) => {
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
          const IconComponent = method.icon
          return (
            <motion.div
              key={method.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: method.id * 0.1 }}
              className='bg-white border-2 border-purple-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 hover:border-purple-300 transition-all'
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

              <button className='w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold hover:from-pink-600 hover:to-rose-60 transition-all'>
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
  const { currentUser } = useSelector((state) => state.user)

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

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

          {/* Need More Points Section - Full Width */}
          <div className='mb-4 sm:mb-6 lg:mb-8'>
            <NeedMorePointsSection methods={mockData.pointsEarningMethods} />
          </div>

          {/* Rest of the Dashboard - Better Balanced Layout */}
          <div className='grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8'>
            {/* Left Column - Takes 7 columns on desktop */}
            <div className='lg:col-span-7 space-y-4 sm:space-y-6 lg:space-y-8'>
              {/* Upcoming Appointments */}
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
                    {mockData.upcomingAppointments.length} scheduled
                  </span>
                </div>
                <div className='grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4'>
                  {mockData.upcomingAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className='bg-white border-2 border-pink-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 hover:border-pink-300 transition-colors'
                    >
                      <h3 className='text-sm sm:text-base lg:text-lg font-bold text-gray-800 mb-1 sm:mb-2'>
                        {appointment.service}
                      </h3>
                      <p className='text-xs sm:text-sm lg:text-base text-gray-600 mb-2 sm:mb-3'>
                        {appointment.provider}
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
                    </div>
                  ))}
                </div>
              </DashboardCard>

              {/* Referral Program */}
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
                      Growing
                    </span>
                  </div>
                </div>
                <div className='grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6'>
                  <div className='bg-white border-2 border-indigo-200 rounded-lg sm:rounded-2xl p-2 sm:p-4 text-center hover:border-indigo-300 transition-colors'>
                    <div className='bg-gradient-to-r from-indigo-100 to-indigo-200 rounded-full w-8 h-8 sm:w-12 sm:h-12 lg:w-16 lg:h-16 flex items-center justify-center mx-auto mb-1 sm:mb-2'>
                      <Users className='w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-indigo-600' />
                    </div>
                    <p className='text-lg sm:text-2xl lg:text-4xl font-bold text-indigo-600 mb-1'>
                      {mockData.referrals.total}
                    </p>
                    <p className='text-xs sm:text-sm font-semibold text-gray-700'>
                      Total
                    </p>
                  </div>
                  <div className='bg-white border-2 border-green-200 rounded-lg sm:rounded-2xl p-2 sm:p-4 text-center hover:border-green-300 transition-colors'>
                    <div className='bg-gradient-to-r from-green-100 to-green-200 rounded-full w-8 h-8 sm:w-12 sm:h-12 lg:w-16 lg:h-16 flex items-center justify-center mx-auto mb-1 sm:mb-2'>
                      <Calendar className='w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-green-600' />
                    </div>
                    <p className='text-lg sm:text-2xl lg:text-4xl font-bold text-green-600 mb-1'>
                      {mockData.referrals.thisMonth}
                    </p>
                    <p className='text-xs sm:text-sm font-semibold text-gray-700'>
                      This Month
                    </p>
                  </div>
                  <div className='bg-white border-2 border-purple-200 rounded-lg sm:rounded-2xl p-2 sm:p-4 text-center hover:border-purple-300 transition-colors'>
                    <div className='bg-gradient-to-r from-purple-100 to-purple-200 rounded-full w-8 h-8 sm:w-12 sm:h-12 lg:w-16 lg:h-16 flex items-center justify-center mx-auto mb-1 sm:mb-2'>
                      <Gift className='w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-purple-600' />
                    </div>
                    <p className='text-lg sm:text-2xl lg:text-4xl font-bold text-purple-600 mb-1'>
                      ${mockData.referrals.earnings}
                    </p>
                    <p className='text-xs sm:text-sm font-semibold text-gray-700'>
                      Earned
                    </p>
                  </div>
                </div>
                <div className='bg-white border-2 border-indigo-200 rounded-xl sm:rounded-2xl p-3 sm:p-4'>
                  <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
                    <div>
                      <p className='text-sm sm:text-base lg:text-lg font-bold text-gray-800'>
                        Share & Earn More
                      </p>
                      <p className='text-xs sm:text-sm text-gray-600'>
                        Invite friends and earn $30 per referral
                      </p>
                    </div>
                    <button className='bg-gradient-to-r from-pink-500 to-rose-500 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm hover:from-pink-600 hover:to-rose-600 transition-colors w-full sm:w-auto'>
                      Share Now
                    </button>
                  </div>
                </div>
              </DashboardCard>
            </div>

            {/* Right Column - Takes 5 columns on desktop */}
            <div className='lg:col-span-5 space-y-4 sm:space-y-6 lg:space-y-8'>
              {/* Available Credits & Gifts */}
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
                  <div className='bg-white border-2 border-purple-200 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center hover:border-purple-300 transition-colors'>
                    <div className='bg-gradient-to-r from-purple-100 to-purple-200 rounded-full w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 flex items-center justify-center mx-auto mb-2 sm:mb-3'>
                      <CreditCard className='w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-purple-600' />
                    </div>
                    <p className='text-xl sm:text-2xl lg:text-3xl font-bold text-purple-600 mb-1'>
                      {mockData.credits.available}
                    </p>
                    <p className='text-xs sm:text-sm font-semibold text-gray-700'>
                      Available Credits
                    </p>
                  </div>

                  {/* Gift Cards */}
                  <div className='bg-white border-2 border-pink-200 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center hover:border-pink-300 transition-colors'>
                    <div className='bg-gradient-to-r from-pink-100 to-pink-200 rounded-full w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 flex items-center justify-center mx-auto mb-2 sm:mb-3'>
                      <Gift className='w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-pink-600' />
                    </div>
                    <p className='text-xl sm:text-2xl lg:text-3xl font-bold text-pink-600 mb-1'>
                      {mockData.credits.gifts}
                    </p>
                    <p className='text-xs sm:text-sm font-semibold text-gray-700'>
                      Gift Cards
                    </p>
                  </div>
                </div>

                {/* Expiration Warning */}
                <div className='bg-amber-50 border-2 border-amber-200 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4'>
                  <div className='flex items-center'>
                    <Clock className='w-4 h-4 sm:w-5 sm:h-5 text-amber-600 mr-2 sm:mr-3' />
                    <div>
                      <p className='text-xs sm:text-sm font-semibold text-amber-800'>
                        Credits Expiring Soon
                      </p>
                      <p className='text-xs sm:text-sm text-amber-700'>
                        Expires on {formatDate(mockData.credits.expiring)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Use Credits Button */}
                <button className='w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold hover:from-pink-600 hover:to-rose-60 transition-all'>
                  Use Credits
                </button>
              </DashboardCard>

              {/* Past Visits */}
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
                  {mockData.pastVisits.map((visit) => (
                    <div
                      key={visit.id}
                      className='bg-white border-2 border-pink-200 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:border-pink-300 transition-colors'
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex-1 min-w-0'>
                          <p className='font-semibold text-gray-800 text-xs sm:text-sm lg:text-base truncate'>
                            {visit.service}
                          </p>
                          <p className='text-xs sm:text-sm text-gray-500'>
                            {formatDate(visit.date)}
                          </p>
                        </div>
                        <div className='flex items-center ml-2 sm:ml-3 flex-shrink-0'>
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 sm:w-4 sm:h-4 ${
                                i < visit.rating
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </DashboardCard>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default DashboardPage
