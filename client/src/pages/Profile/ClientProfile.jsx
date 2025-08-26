// File: client/src/pages/Profile/ClientProfile.jsx
import { axiosInstance } from '@/config'
import { authService } from '@/services/authService'
import { motion } from 'framer-motion'
import {
  Award,
  Badge,
  Calendar,
  CheckCircle,
  Clock,
  Coins,
  Crown,
  Edit,
  Gift,
  Heart,
  History,
  Mail,
  MapPin,
  Minus,
  Phone,
  Plus,
  Settings,
  Star,
  Target,
  TrendingUp,
  Trophy,
  User,
  Users,
  Zap,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import Layout from '../Layout/Layout'

// Enhanced auth service methods using your existing axiosInstance
const extendedAuthService = {
  ...authService,

  // Get specific user's profile (admin/team can view others)
  getUserProfile: async (userId) => {
    try {
      const response = await axiosInstance.get(`/auth/profile/${userId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return { status: 'error', data: { user: null } }
    }
  },

  // Get user's reward history (can view others if authorized)
  getUserRewards: async (userId, page = 1, limit = 20, status = 'all') => {
    try {
      let endpoint = '/rewards/my-rewards'
      if (userId) {
        // If userId provided, this is for viewing someone else's rewards (spa owner view)
        endpoint = `/rewards/user/${userId}/rewards`
      }
      const response = await axiosInstance.get(
        `${endpoint}?page=${page}&limit=${limit}&status=${status}`
      )
      return response.data
    } catch (error) {
      console.error('Error fetching user rewards:', error)
      return { status: 'error', data: { userRewards: [] } }
    }
  },

  // Get user's point transaction history (can view others if authorized)
  getPointHistory: async (userId, page = 1, limit = 20, type = 'all') => {
    try {
      let endpoint = '/rewards/my-points/history'
      if (userId) {
        // If userId provided, this is for viewing someone else's history
        endpoint = `/rewards/user/${userId}/points/history`
      }
      const response = await axiosInstance.get(
        `${endpoint}?page=${page}&limit=${limit}&type=${type}`
      )
      return response.data
    } catch (error) {
      console.error('Error fetching point history:', error)
      return { status: 'error', data: { transactions: [] } }
    }
  },

  // Get game history (can view others if authorized)
  getGameHistory: async (userId, page = 1, limit = 20) => {
    try {
      let endpoint = '/gameWheel/my-history'
      if (userId) {
        // If userId provided, this is for viewing someone else's history
        endpoint = `/gameWheel/user/${userId}/history`
      }
      const response = await axiosInstance.get(
        `${endpoint}?page=${page}&limit=${limit}`
      )
      return response.data
    } catch (error) {
      console.error('Error fetching game history:', error)
      return { status: 'error', data: { gameHistory: [] } }
    }
  },

  // Mark reward as used (for spa owners)
  markRewardAsUsed: async (userRewardId, actualValue, notes) => {
    try {
      const response = await axiosInstance.patch(
        `/rewards/spa/mark-used/${userRewardId}`,
        {
          actualValue,
          notes,
        }
      )
      return response.data
    } catch (error) {
      console.error('Error marking reward as used:', error)
      throw error
    }
  },
}

// Reusable Components
const ProfileCard = ({ children, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className={`bg-white rounded-2xl p-6 border border-pink-100 ${className}`}
  >
    {children}
  </motion.div>
)

const IconBadge = ({ icon: Icon, gradient, size = 'w-12 h-12' }) => (
  <div
    className={`${size} rounded-2xl ${gradient} flex items-center justify-center`}
  >
    <Icon className='w-6 h-6 text-white' />
  </div>
)

const StatCard = ({ icon, title, value, subtitle, gradient }) => (
  <ProfileCard className='text-center'>
    <div className='flex flex-col items-center space-y-3'>
      <IconBadge icon={icon} gradient={gradient} />
      <div>
        <p className='text-2xl font-bold text-gray-800'>{value}</p>
        <p className='text-sm font-medium text-gray-600'>{title}</p>
        {subtitle && <p className='text-xs text-gray-500 mt-1'>{subtitle}</p>}
      </div>
    </div>
  </ProfileCard>
)

const InfoRow = ({ icon: Icon, label, value, action }) => (
  <div className='flex items-center justify-between py-3 border-b border-pink-50 last:border-b-0'>
    <div className='flex items-center space-x-3'>
      <Icon className='w-5 h-5 text-pink-500' />
      <span className='text-sm font-medium text-gray-700'>{label}</span>
    </div>
    <div className='flex items-center space-x-2'>
      <span className='text-sm text-gray-600'>{value}</span>
      {action}
    </div>
  </div>
)

const RoleBadge = ({ role }) => {
  const roleConfig = {
    admin: { color: 'bg-gradient-to-r from-pink-600 to-rose-700', icon: Crown },
    team: { color: 'bg-gradient-to-r from-pink-600 to-rose-700', icon: Badge },
    user: { color: 'bg-gradient-to-r from-pink-600 to-rose-700', icon: User },
    enterprise: {
      color: 'bg-gradient-to-r from-pink-600 to-rose-700',
      icon: Award,
    },
  }

  const config = roleConfig[role] || roleConfig.user
  const Icon = config.icon

  return (
    <div
      className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-white text-sm font-medium ${config.color}`}
    >
      <Icon className='w-4 h-4' />
      <span className='capitalize'>{role}</span>
    </div>
  )
}

const TransactionItem = ({
  transaction,
  type = 'point',
  canManage = false,
  onMarkAsUsed,
  isManaging = false,
}) => {
  const getTransactionIcon = () => {
    if (type === 'reward') {
      return <Gift className='w-5 h-5 text-pink-500' />
    }

    switch (transaction.type) {
      case 'earned':
      case 'referral':
      case 'bonus':
        return <Plus className='w-5 h-5 text-green-500' />
      case 'spent':
      case 'withdrawal':
        return <Minus className='w-5 h-5 text-red-500' />
      case 'game_win':
        return <Trophy className='w-5 h-5 text-yellow-500' />
      case 'refund':
        return <Zap className='w-5 h-5 text-blue-500' />
      default:
        return <Coins className='w-5 h-5 text-gray-500' />
    }
  }

  const getAmountColor = () => {
    if (type === 'reward') return 'text-pink-600'

    if (transaction.amount > 0) return 'text-green-600'
    if (transaction.amount < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700'
      case 'used':
        return 'bg-blue-100 text-blue-700'
      case 'expired':
        return 'bg-gray-100 text-gray-600'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  return (
    <div className='border-b border-pink-50 last:border-b-0'>
      <div className='flex items-center justify-between py-3'>
        <div className='flex items-center space-x-3'>
          {getTransactionIcon()}
          <div>
            <p className='text-sm font-medium text-gray-800'>
              {type === 'reward'
                ? transaction.rewardSnapshot?.name
                : transaction.reason}
            </p>
            <p className='text-xs text-gray-500'>
              {formatDate(
                type === 'reward'
                  ? transaction.claimedAt
                  : transaction.createdAt
              )}
            </p>
            {type === 'reward' && transaction.rewardSnapshot?.description && (
              <p className='text-xs text-gray-400 mt-1'>
                {transaction.rewardSnapshot.description}
              </p>
            )}
          </div>
        </div>
        <div className='text-right'>
          <p className={`text-sm font-semibold ${getAmountColor()}`}>
            {type === 'reward'
              ? `${transaction.rewardSnapshot?.pointCost || 0} pts`
              : `${transaction.amount > 0 ? '+' : ''}${transaction.amount} pts`}
          </p>
          {type === 'reward' && (
            <div className='flex items-center space-x-2 mt-1'>
              <div
                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                  transaction.status
                )}`}
              >
                {transaction.status}
              </div>
              {canManage && transaction.status === 'active' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onMarkAsUsed(transaction)}
                  disabled={isManaging}
                  className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                    isManaging
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  {isManaging ? 'Processing...' : 'Mark Used'}
                </motion.button>
              )}
            </div>
          )}
          {type === 'reward' && transaction.rewardSnapshot?.value && (
            <p className='text-xs text-gray-500 mt-1'>
              Value: ${transaction.rewardSnapshot.value}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

const ClientProfile = ({ userId: propUserId = null }) => {
  // Get userId from URL params if not provided as prop
  const urlUserId = window.location.pathname
    .split('/client/')[1]
    ?.split('?')[0]
    ?.split('/')[0]
  const userId = propUserId || urlUserId

  console.log('ClientProfile - URL:', window.location.pathname)
  console.log('ClientProfile - Extracted userId:', userId)
  console.log('ClientProfile - Prop userId:', propUserId)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [onboardingStatus, setOnboardingStatus] = useState(null)
  const [userRewards, setUserRewards] = useState([])
  const [pointHistory, setPointHistory] = useState([])
  const [gameHistory, setGameHistory] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [transactionFilter, setTransactionFilter] = useState('all')
  const [rewardFilter, setRewardFilter] = useState('all')
  const [rewardsLoading, setRewardsLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [apiErrors, setApiErrors] = useState({})
  const [currentUser, setCurrentUser] = useState(null) // Current logged-in user
  const [managingReward, setManagingReward] = useState(null)
  const [rewardNote, setRewardNote] = useState('')
  const [actualValue, setActualValue] = useState('')
  const [isViewingOwnProfile, setIsViewingOwnProfile] = useState(true)

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get current logged-in user info first
        const currentUserResponse = await extendedAuthService.getCurrentUser()
        setCurrentUser(currentUserResponse.data.user)

        // Determine which user profile to fetch
        const targetUserId = userId || currentUserResponse.data.user._id
        const isOwnProfile =
          !userId || userId === currentUserResponse.data.user._id
        setIsViewingOwnProfile(isOwnProfile)

        // Fetch target user's profile
        let userResponse
        let onboardingResponse = null

        if (isOwnProfile) {
          // If viewing own profile, use existing methods
          userResponse = await extendedAuthService.getCurrentUser()
          onboardingResponse = await extendedAuthService.getOnboardingStatus()
        } else {
          // If viewing someone else's profile, fetch their profile
          userResponse = await extendedAuthService.getUserProfile(targetUserId)
          // Don't fetch onboarding status for other users
        }

        if (userResponse.status === 'success') {
          setUser(userResponse.data.user)
        }

        if (onboardingResponse && onboardingResponse.status === 'success') {
          setOnboardingStatus(onboardingResponse.data.onboardingStatus)
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [userId])

  useEffect(() => {
    const fetchRewardsAndHistory = async () => {
      if (activeTab === 'rewards' || activeTab === 'history') {
        setRewardsLoading(true)
        setHistoryLoading(true)
        setApiErrors({})

        try {
          console.log('Fetching rewards and history data...')

          const targetUserId = isViewingOwnProfile ? null : userId || user?._id

          const [rewardsResponse, pointsResponse, gameResponse] =
            await Promise.all([
              extendedAuthService.getUserRewards(
                targetUserId,
                1,
                20,
                rewardFilter
              ),
              extendedAuthService.getPointHistory(
                targetUserId,
                1,
                20,
                transactionFilter
              ),
              extendedAuthService.getGameHistory(targetUserId, 1, 20),
            ])

          console.log('API Responses:', {
            rewardsResponse,
            pointsResponse,
            gameResponse,
          })

          if (rewardsResponse.status === 'success') {
            setUserRewards(rewardsResponse.data.userRewards || [])
          } else {
            setApiErrors((prev) => ({
              ...prev,
              rewards: 'Failed to load rewards',
            }))
          }

          if (pointsResponse.status === 'success') {
            setPointHistory(pointsResponse.data.transactions || [])
          } else {
            setApiErrors((prev) => ({
              ...prev,
              points: 'Failed to load point history',
            }))
          }

          if (gameResponse.status === 'success') {
            setGameHistory(gameResponse.data.gameHistory || [])
          } else {
            setApiErrors((prev) => ({
              ...prev,
              games: 'Failed to load game history',
            }))
          }
        } catch (error) {
          console.error('Error fetching rewards and history:', error)
          setApiErrors({
            rewards: 'API connection failed',
            points: 'API connection failed',
            games: 'API connection failed',
          })
        } finally {
          setRewardsLoading(false)
          setHistoryLoading(false)
        }
      }
    }

    fetchRewardsAndHistory()
  }, [
    activeTab,
    rewardFilter,
    transactionFilter,
    userId,
    isViewingOwnProfile,
    user,
  ])

  if (loading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center'>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className='w-12 h-12 border-4 border-pink-300 border-t-pink-600 rounded-full'
        />
      </div>
    )
  }

  if (!user) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center'>
        <ProfileCard className='text-center'>
          <p className='text-gray-600'>Unable to load profile data</p>
        </ProfileCard>
      </div>
    )
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getReferralTierColor = (tier) => {
    const colors = {
      bronze: 'text-amber-600',
      gold: 'text-yellow-500',
      platinum: 'text-purple-600',
    }
    return colors[tier] || colors.bronze
  }

  // Reward management functions for spa owners
  const handleMarkAsUsed = async (reward) => {
    try {
      setManagingReward(reward._id)

      const response = await extendedAuthService.markRewardAsUsed(
        reward._id,
        actualValue || reward.rewardSnapshot?.value,
        rewardNote || 'Redeemed at spa'
      )

      if (response.status === 'success') {
        // Update local state
        setUserRewards((prev) =>
          prev.map((r) =>
            r._id === reward._id
              ? { ...r, status: 'used', usedAt: new Date() }
              : r
          )
        )

        // Reset form
        setActualValue('')
        setRewardNote('')
        setManagingReward(null)

        alert('Reward marked as used successfully!')
      }
    } catch (error) {
      console.error('Error marking reward as used:', error)
      alert('Failed to mark reward as used. Please try again.')
    }
  }

  const isCurrentUserSpaOwner = () => {
    return currentUser?.role === 'team'
  }

  const canManageReward = (reward) => {
    return (
      isCurrentUserSpaOwner() &&
      reward.status === 'active' &&
      currentUser?.spaLocation?.locationId === reward.locationId
    )
  }

  return (
    <Layout>
      <div className='min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-4 pb-20'>
        <div className='max-w-7xl mx-auto space-y-6'>
          {/* Header Profile Card */}
          <ProfileCard className='relative overflow-hidden'>
            <div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-600 to-rose-700 opacity-10 rounded-full -mr-16 -mt-16' />

            {/* Profile Header */}
            {!isViewingOwnProfile && (
              <div className='mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg'>
                <div className='flex items-center space-x-2'>
                  <User className='w-5 h-5 text-blue-600' />
                  <div>
                    <p className='text-sm font-medium text-blue-800'>
                      {currentUser?.role === 'admin'
                        ? 'Admin View'
                        : 'Customer Profile'}
                    </p>
                    <p className='text-xs text-blue-600'>
                      {currentUser?.role === 'team' &&
                        "You can manage this customer's active rewards"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className='relative flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6'>
              {/* Avatar */}
              <div className='relative'>
                <div className='w-24 h-24 rounded-2xl bg-gradient-to-br from-pink-600 to-rose-700 flex items-center justify-center'>
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className='w-full h-full rounded-2xl object-cover'
                    />
                  ) : (
                    <User className='w-12 h-12 text-white' />
                  )}
                </div>
                {isViewingOwnProfile && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className='absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center border-2 border-pink-200'
                  >
                    <Edit className='w-4 h-4 text-pink-500' />
                  </motion.button>
                )}
              </div>

              {/* User Info */}
              <div className='flex-1 text-center sm:text-left'>
                <h1 className='text-2xl font-bold text-gray-800 mb-2'>
                  {user.name}
                </h1>
                <p className='text-gray-600 mb-3'>{user.email}</p>

                <div className='flex flex-wrap gap-2 justify-center sm:justify-start'>
                  <RoleBadge role={user.role} />
                  {user.onboardingCompleted && (
                    <div className='inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium'>
                      <CheckCircle className='w-4 h-4' />
                      <span>Verified</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Points */}
              <div className='text-center sm:text-right'>
                <div className='bg-gradient-to-r from-pink-600 to-rose-700 rounded-2xl p-4 text-white'>
                  <p className='text-3xl font-bold'>{user.points || 0}</p>
                  <p className='text-sm opacity-90'>Total Points</p>
                </div>
              </div>
            </div>
          </ProfileCard>

          {/* Stats Grid */}
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
            <StatCard
              icon={Star}
              title='Points'
              value={user.points || 0}
              subtitle='Total earned'
              gradient='bg-gradient-to-br from-pink-600 to-rose-700'
            />
            <StatCard
              icon={Users}
              title='Referrals'
              value={user.referralStats?.totalReferrals || 0}
              subtitle={`${user.referralStats?.activeReferrals || 0} active`}
              gradient='bg-gradient-to-br from-pink-600 to-rose-700'
            />
            <StatCard
              icon={Gift}
              title='Tier'
              value={user.referralStats?.currentTier || 'Bronze'}
              subtitle={`$${user.referralEarnings || 0} earned`}
              gradient='bg-gradient-to-br from-pink-600 to-rose-700'
            />
            <StatCard
              icon={Calendar}
              title='Member Since'
              value={new Date(user.createdAt).getFullYear()}
              subtitle={formatDate(user.createdAt).split(',')[0]}
              gradient='bg-gradient-to-br from-pink-600 to-rose-700'
            />
          </div>

          {/* Tab Navigation */}
          <div className='flex space-x-1 bg-white rounded-2xl p-1 border border-pink-100'>
            {['overview', 'location', 'referrals', 'rewards', 'history'].map(
              (tab) => (
                <motion.button
                  key={tab}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 px-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                    activeTab === tab
                      ? 'bg-gradient-to-r from-pink-600 to-rose-700 text-white'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </motion.button>
              )
            )}
          </div>

          {/* Tab Content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'overview' && (
              <div className='space-y-6'>
                {/* Account Status */}
                <ProfileCard>
                  <h3 className='text-lg font-semibold text-gray-800 mb-4 flex items-center'>
                    <CheckCircle className='w-5 h-5 text-green-500 mr-2' />
                    Account Status
                  </h3>

                  <div className='space-y-1'>
                    <InfoRow
                      icon={CheckCircle}
                      label='Profile Completed'
                      value={user.profileCompleted ? 'Yes' : 'No'}
                    />
                    <InfoRow
                      icon={Clock}
                      label='Onboarding'
                      value={user.onboardingCompleted ? 'Completed' : 'Pending'}
                    />
                    <InfoRow
                      icon={User}
                      label='Auth Provider'
                      value={
                        user.authProvider === 'google' ? 'Google' : 'Email'
                      }
                    />
                    <InfoRow
                      icon={Calendar}
                      label='Last Login'
                      value={formatDate(user.lastLogin)}
                    />
                  </div>
                </ProfileCard>

                {/* Personal Information */}
                <ProfileCard>
                  <h3 className='text-lg font-semibold text-gray-800 mb-4 flex items-center'>
                    <User className='w-5 h-5 text-pink-500 mr-2' />
                    Personal Information
                  </h3>

                  <div className='space-y-1'>
                    <InfoRow icon={User} label='Full Name' value={user.name} />
                    <InfoRow icon={Mail} label='Email' value={user.email} />
                    <InfoRow
                      icon={Calendar}
                      label='Date of Birth'
                      value={formatDate(user.dateOfBirth)}
                    />
                    <InfoRow
                      icon={Badge}
                      label='Role'
                      value={<RoleBadge role={user.role} />}
                    />
                  </div>
                </ProfileCard>
              </div>
            )}

            {activeTab === 'location' && (
              <div className='space-y-6'>
                {/* Selected Location (for users) */}
                {user.role === 'user' && (
                  <ProfileCard>
                    <h3 className='text-lg font-semibold text-gray-800 mb-4 flex items-center'>
                      <MapPin className='w-5 h-5 text-pink-500 mr-2' />
                      Selected Spa
                    </h3>

                    {user.selectedLocation?.locationId ? (
                      <div className='space-y-4'>
                        <div className='bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-4'>
                          <h4 className='font-semibold text-gray-800 mb-2'>
                            {user.selectedLocation.locationName}
                          </h4>
                          <p className='text-sm text-gray-600 mb-2'>
                            {user.selectedLocation.locationAddress}
                          </p>
                          <p className='text-sm text-gray-600'>
                            {user.selectedLocation.locationPhone}
                          </p>
                          <p className='text-xs text-gray-500 mt-2'>
                            Selected on{' '}
                            {formatDate(user.selectedLocation.selectedAt)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className='text-center py-6'>
                        <MapPin className='w-12 h-12 text-gray-300 mx-auto mb-3' />
                        <p className='text-gray-600 mb-4'>No spa selected</p>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className='bg-gradient-to-r from-pink-600 to-rose-700 text-white px-6 py-3 rounded-xl font-medium'
                        >
                          Select Your Spa
                        </motion.button>
                      </div>
                    )}
                  </ProfileCard>
                )}

                {/* Spa Location (for team members) */}
                {user.role === 'team' && (
                  <ProfileCard>
                    <h3 className='text-lg font-semibold text-gray-800 mb-4 flex items-center'>
                      <Badge className='w-5 h-5 text-purple-500 mr-2' />
                      My Spa Location
                    </h3>

                    {user.spaLocation?.locationId ? (
                      <div className='space-y-4'>
                        <div className='bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4'>
                          <h4 className='font-semibold text-gray-800 mb-2'>
                            {user.spaLocation.locationName}
                          </h4>
                          <p className='text-sm text-gray-600 mb-2'>
                            {user.spaLocation.locationAddress}
                          </p>
                          <div className='flex flex-wrap gap-4 text-sm text-gray-600'>
                            <span className='flex items-center'>
                              <Phone className='w-4 h-4 mr-1' />
                              {user.spaLocation.locationPhone}
                            </span>
                            <span className='flex items-center'>
                              <Mail className='w-4 h-4 mr-1' />
                              {user.spaLocation.locationEmail}
                            </span>
                          </div>
                          <p className='text-xs text-gray-500 mt-3'>
                            Setup completed:{' '}
                            {user.spaLocation.setupCompleted ? 'Yes' : 'No'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className='text-center py-6'>
                        <Badge className='w-12 h-12 text-gray-300 mx-auto mb-3' />
                        <p className='text-gray-600'>
                          Spa location not configured
                        </p>
                      </div>
                    )}
                  </ProfileCard>
                )}
              </div>
            )}

            {activeTab === 'referrals' && (
              <div className='space-y-6'>
                {/* Referral Stats */}
                <ProfileCard>
                  <h3 className='text-lg font-semibold text-gray-800 mb-4 flex items-center'>
                    <TrendingUp className='w-5 h-5 text-green-500 mr-2' />
                    Referral Performance
                  </h3>

                  <div className='grid grid-cols-2 gap-4'>
                    <div className='text-center bg-green-50 rounded-xl p-4'>
                      <p className='text-2xl font-bold text-green-600'>
                        {user.referralStats?.totalReferrals || 0}
                      </p>
                      <p className='text-sm text-gray-600'>Total Referrals</p>
                    </div>
                    <div className='text-center bg-blue-50 rounded-xl p-4'>
                      <p className='text-2xl font-bold text-blue-600'>
                        {user.referralStats?.activeReferrals || 0}
                      </p>
                      <p className='text-sm text-gray-600'>Active</p>
                    </div>
                    <div className='text-center bg-purple-50 rounded-xl p-4'>
                      <p className='text-2xl font-bold text-purple-600'>
                        ${user.referralEarnings || 0}
                      </p>
                      <p className='text-sm text-gray-600'>Earnings</p>
                    </div>
                    <div className='text-center bg-yellow-50 rounded-xl p-4'>
                      <p
                        className={`text-2xl font-bold capitalize ${getReferralTierColor(
                          user.referralStats?.currentTier
                        )}`}
                      >
                        {user.referralStats?.currentTier || 'Bronze'}
                      </p>
                      <p className='text-sm text-gray-600'>Tier</p>
                    </div>
                  </div>
                </ProfileCard>

                {/* Referral Code */}
                <ProfileCard>
                  <h3 className='text-lg font-semibold text-gray-800 mb-4 flex items-center'>
                    <Gift className='w-5 h-5 text-pink-500 mr-2' />
                    Your Referral Code
                  </h3>

                  {user.referralCode ? (
                    <div className='bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-4 text-center'>
                      <p className='text-3xl font-bold text-gray-800 mb-2'>
                        {user.referralCode}
                      </p>
                      <p className='text-sm text-gray-600 mb-4'>
                        Share this code with friends to earn rewards
                      </p>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className='bg-gradient-to-r from-pink-600 to-rose-700 text-white px-6 py-2 rounded-lg text-sm font-medium'
                      >
                        Share Code
                      </motion.button>
                    </div>
                  ) : (
                    <div className='text-center py-6'>
                      <Gift className='w-12 h-12 text-gray-300 mx-auto mb-3' />
                      <p className='text-gray-600 mb-4'>
                        No referral code generated
                      </p>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className='bg-gradient-to-r from-pink-600 to-rose-700 text-white px-6 py-3 rounded-xl font-medium'
                      >
                        Generate Referral Code
                      </motion.button>
                    </div>
                  )}
                </ProfileCard>
              </div>
            )}

            {activeTab === 'rewards' && (
              <div className='space-y-6'>
                {/* Reward Filter */}
                <ProfileCard>
                  <div className='flex items-center justify-between mb-4'>
                    <h3 className='text-lg font-semibold text-gray-800 flex items-center'>
                      <Gift className='w-5 h-5 text-pink-500 mr-2' />
                      My Rewards
                    </h3>
                    <select
                      value={rewardFilter}
                      onChange={(e) => setRewardFilter(e.target.value)}
                      className='px-3 py-1 text-sm border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500'
                    >
                      <option value='all'>All Rewards</option>
                      <option value='active'>Active</option>
                      <option value='used'>Used</option>
                      <option value='expired'>Expired</option>
                    </select>
                  </div>

                  {/* Loading State */}
                  {rewardsLoading && (
                    <div className='flex items-center justify-center py-8'>
                      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600'></div>
                      <span className='ml-2 text-gray-600'>
                        Loading rewards...
                      </span>
                    </div>
                  )}

                  {/* Error State */}
                  {apiErrors.rewards && (
                    <div className='text-center py-8'>
                      <div className='bg-red-50 border border-red-200 rounded-lg p-4'>
                        <p className='text-red-600 font-medium'>
                          Error loading rewards
                        </p>
                        <p className='text-red-500 text-sm mt-1'>
                          {apiErrors.rewards}
                        </p>
                        <p className='text-xs text-gray-500 mt-2'>
                          Check browser console for more details
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Rewards List */}
                  {!rewardsLoading && !apiErrors.rewards && (
                    <div>
                      {/* Spa Owner Instructions */}
                      {isCurrentUserSpaOwner() &&
                        userRewards.some((r) => canManageReward(r)) && (
                          <div className='mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg'>
                            <div className='flex items-start space-x-2'>
                              <AlertTriangle className='w-5 h-5 text-blue-600 mt-0.5' />
                              <div>
                                <p className='text-sm font-medium text-blue-800'>
                                  Spa Owner Mode
                                </p>
                                <p className='text-xs text-blue-600 mt-1'>
                                  You can mark active rewards as used when
                                  customers redeem them at your spa.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                      <div className='space-y-0'>
                        {userRewards.length > 0 ? (
                          userRewards.map((reward) => (
                            <TransactionItem
                              key={reward._id}
                              transaction={reward}
                              type='reward'
                              canManage={canManageReward(reward)}
                              onMarkAsUsed={handleMarkAsUsed}
                              isManaging={managingReward === reward._id}
                            />
                          ))
                        ) : (
                          <div className='text-center py-8'>
                            <Gift className='w-12 h-12 text-gray-300 mx-auto mb-3' />
                            <p className='text-gray-600'>
                              No rewards claimed yet
                            </p>
                            <p className='text-sm text-gray-500 mt-2'>
                              Start earning points to claim rewards
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Active Rewards Summary for Spa Owners */}
                      {isCurrentUserSpaOwner() && userRewards.length > 0 && (
                        <div className='mt-6 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl'>
                          <h4 className='font-semibold text-gray-800 mb-3 flex items-center'>
                            <Badge className='w-5 h-5 text-pink-600 mr-2' />
                            Reward Summary
                          </h4>
                          <div className='grid grid-cols-3 gap-4 text-center'>
                            <div>
                              <p className='text-2xl font-bold text-green-600'>
                                {
                                  userRewards.filter(
                                    (r) => r.status === 'active'
                                  ).length
                                }
                              </p>
                              <p className='text-sm text-gray-600'>Active</p>
                            </div>
                            <div>
                              <p className='text-2xl font-bold text-blue-600'>
                                {
                                  userRewards.filter((r) => r.status === 'used')
                                    .length
                                }
                              </p>
                              <p className='text-sm text-gray-600'>Redeemed</p>
                            </div>
                            <div>
                              <p className='text-2xl font-bold text-purple-600'>
                                $
                                {userRewards
                                  .filter((r) => r.status === 'active')
                                  .reduce(
                                    (sum, r) =>
                                      sum + (r.rewardSnapshot?.value || 0),
                                    0
                                  )}
                              </p>
                              <p className='text-sm text-gray-600'>
                                Total Value
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </ProfileCard>

                {/* Game Wins */}
                {!rewardsLoading &&
                  !apiErrors.games &&
                  gameHistory.length > 0 && (
                    <ProfileCard>
                      <h3 className='text-lg font-semibold text-gray-800 mb-4 flex items-center'>
                        <Trophy className='w-5 h-5 text-yellow-500 mr-2' />
                        Game Wins
                      </h3>

                      <div className='space-y-0'>
                        {gameHistory.slice(0, 5).map((game) => (
                          <div
                            key={game._id}
                            className='flex items-center justify-between py-3 border-b border-pink-50 last:border-b-0'
                          >
                            <div className='flex items-center space-x-3'>
                              <Trophy className='w-5 h-5 text-yellow-500' />
                              <div>
                                <p className='text-sm font-medium text-gray-800'>
                                  {game.rewardSnapshot.winningItem?.title}
                                </p>
                                <p className='text-xs text-gray-500'>
                                  {new Date(game.claimedAt).toLocaleDateString(
                                    'en-US',
                                    {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    }
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className='text-right'>
                              <p className='text-sm font-semibold text-yellow-600'>
                                {game.rewardSnapshot.winningItem?.value}{' '}
                                {game.rewardSnapshot.winningItem?.valueType}
                              </p>
                              <div
                                className={`px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                                  game.status === 'active'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {game.status}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ProfileCard>
                  )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className='space-y-6'>
                {/* Points History */}
                <ProfileCard>
                  <div className='flex items-center justify-between mb-4'>
                    <h3 className='text-lg font-semibold text-gray-800 flex items-center'>
                      <History className='w-5 h-5 text-blue-500 mr-2' />
                      Points History
                    </h3>
                    <select
                      value={transactionFilter}
                      onChange={(e) => setTransactionFilter(e.target.value)}
                      className='px-3 py-1 text-sm border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500'
                    >
                      <option value='all'>All Transactions</option>
                      <option value='earned'>Earned</option>
                      <option value='spent'>Spent</option>
                      <option value='bonus'>Bonus</option>
                      <option value='refund'>Refund</option>
                    </select>
                  </div>

                  {/* Loading State */}
                  {historyLoading && (
                    <div className='flex items-center justify-center py-8'>
                      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600'></div>
                      <span className='ml-2 text-gray-600'>
                        Loading transactions...
                      </span>
                    </div>
                  )}

                  {/* Error State */}
                  {apiErrors.points && (
                    <div className='text-center py-8'>
                      <div className='bg-red-50 border border-red-200 rounded-lg p-4'>
                        <p className='text-red-600 font-medium'>
                          Error loading point history
                        </p>
                        <p className='text-red-500 text-sm mt-1'>
                          {apiErrors.points}
                        </p>
                        <p className='text-xs text-gray-500 mt-2'>
                          Check browser console for more details
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Transaction History */}
                  {!historyLoading && !apiErrors.points && (
                    <div className='space-y-0'>
                      {pointHistory.length > 0 ? (
                        pointHistory.map((transaction) => (
                          <TransactionItem
                            key={transaction._id}
                            transaction={transaction}
                            type='point'
                          />
                        ))
                      ) : (
                        <div className='text-center py-8'>
                          <History className='w-12 h-12 text-gray-300 mx-auto mb-3' />
                          <p className='text-gray-600'>
                            No transaction history yet
                          </p>
                          <p className='text-sm text-gray-500 mt-2'>
                            Start earning and spending points to see your
                            history
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </ProfileCard>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </Layout>
  )
}

export default ClientProfile
