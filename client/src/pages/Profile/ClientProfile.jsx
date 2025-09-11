// File: client/src/pages/Profile/ClientProfile.jsx - COMPLETELY REDESIGNED
import { axiosInstance } from '@/config'
import { authService } from '@/services/authService'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  Award,
  Calendar,
  CheckCircle,
  Clock,
  Coins,
  Eye,
  EyeOff,
  Gift,
  History,
  Loader2,
  MapPin,
  RefreshCw,
  Shield,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
  User,
  XCircle,
  Zap,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import Layout from '../Layout/Layout'

const ClientProfile = () => {
  const { userId } = useParams()
  const { currentUser } = useSelector((state) => state.user)

  // State
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeRewards, setActiveRewards] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [gameStats, setGameStats] = useState({})
  const [pointsSummary, setPointsSummary] = useState({})

  // Check if viewing own profile
  const isOwnProfile = !userId || userId === currentUser?._id

  // Fetch all profile data
  const fetchProfileData = async () => {
    if (!currentUser) return

    try {
      setLoading(true)
      const targetUserId = isOwnProfile ? currentUser._id : userId

      // Fetch user info
      if (isOwnProfile) {
        setUser(currentUser)
      } else {
        const userResponse = await authService.getUserProfile(userId)
        if (userResponse.status === 'success') {
          setUser(userResponse.data.user)
        }
      }

      // Fetch profile data in parallel
      const [activeRewardsRes, recentActivityRes, gameStatsRes] =
        await Promise.allSettled([
          // Active rewards only
          axiosInstance.get(
            isOwnProfile
              ? '/rewards/my-rewards?status=active'
              : `/rewards/user/${targetUserId}/rewards?status=active`
          ),
          // Recent activity (points + rewards combined)
          axiosInstance.get(
            isOwnProfile
              ? '/rewards/my-points/history?limit=10'
              : `/rewards/user/${targetUserId}/points/history?limit=10`
          ),
          // Game statistics
          axiosInstance.get(
            isOwnProfile
              ? '/games/my-stats'
              : `/games/user/${targetUserId}/stats`
          ),
        ])

      // Process active rewards
      if (
        activeRewardsRes.status === 'fulfilled' &&
        activeRewardsRes.value.data.status === 'success'
      ) {
        setActiveRewards(activeRewardsRes.value.data.data.userRewards || [])
      }

      // Process recent activity
      if (
        recentActivityRes.status === 'fulfilled' &&
        recentActivityRes.value.data.status === 'success'
      ) {
        const transactions =
          recentActivityRes.value.data.data.transactions || []
        setRecentActivity(transactions)
        setPointsSummary(recentActivityRes.value.data.data.summary || {})
      }

      // Process game stats
      if (
        gameStatsRes.status === 'fulfilled' &&
        gameStatsRes.value.data.status === 'success'
      ) {
        setGameStats(gameStatsRes.value.data.data.stats || {})
      }
    } catch (error) {
      console.error('Error fetching profile data:', error)
      toast.error('Failed to load profile data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchProfileData()
  }, [userId, currentUser, isOwnProfile])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchProfileData()
    toast.success('Profile refreshed!')
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case 'reward':
      case 'spent':
        return <Gift className='w-4 h-4 text-pink-500' />
      case 'earned':
      case 'bonus':
        return <Zap className='w-4 h-4 text-green-500' />
      case 'game_play':
        return <Target className='w-4 h-4 text-purple-500' />
      case 'referral':
        return <Award className='w-4 h-4 text-blue-500' />
      default:
        return <Coins className='w-4 h-4 text-gray-500' />
    }
  }

  const getActivityColor = (type, points) => {
    if (points > 0) return 'text-green-600 bg-green-50 border-green-200'
    if (points < 0) return 'text-red-600 bg-red-50 border-red-200'
    return 'text-gray-600 bg-gray-50 border-gray-200'
  }

  if (loading) {
    return (
      <Layout>
        <div className='min-h-screen bg-gradient-to-br from-pink-25 via-purple-25 to-indigo-25 flex items-center justify-center p-4'>
          <div className='text-center'>
            <Loader2 className='w-8 h-8 animate-spin text-pink-600 mx-auto mb-4' />
            <p className='text-gray-600'>Loading profile...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (!user) {
    return (
      <Layout>
        <div className='min-h-screen bg-gradient-to-br from-pink-25 via-purple-25 to-indigo-25 flex items-center justify-center p-4'>
          <div className='text-center'>
            <User className='w-16 h-16 text-gray-400 mx-auto mb-4' />
            <p className='text-gray-600'>User not found</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className='min-h-screen bg-gradient-to-br from-pink-25 via-purple-25 to-indigo-25 p-3 sm:p-4 lg:p-6'>
        <div className='max-w-6xl mx-auto space-y-6'>
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className='bg-white rounded-2xl border-2 border-pink-100 p-6 lg:p-8'
          >
            <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-6'>
              <div className='flex items-center space-x-6'>
                <div className='relative'>
                  <div className='w-20 h-20 lg:w-24 lg:h-24 bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center shadow-lg'>
                    <User className='w-10 h-10 lg:w-12 lg:h-12 text-white' />
                  </div>
                  {user.role !== 'user' && (
                    <div className='absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white p-1.5 rounded-lg'>
                      <Shield className='w-3 h-3' />
                    </div>
                  )}
                </div>
                <div>
                  <h1 className='text-2xl lg:text-3xl font-bold text-gray-900 mb-2'>
                    {user.name}
                  </h1>
                  <p className='text-gray-600 mb-3'>{user.email}</p>
                  <div className='flex flex-wrap items-center gap-3'>
                    <span className='inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-pink-500 to-rose-500 text-white'>
                      {user.role}
                    </span>
                    {user.selectedLocation?.locationName && (
                      <span className='inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800'>
                        <MapPin className='w-3 h-3 mr-1' />
                        {user.selectedLocation.locationName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className='flex items-center gap-3'>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className='p-3 rounded-xl border-2 border-gray-200 hover:border-pink-200 transition-colors'
                >
                  <RefreshCw
                    className={`w-5 h-5 text-gray-600 ${
                      refreshing ? 'animate-spin' : ''
                    }`}
                  />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Stats Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className='grid grid-cols-2 lg:grid-cols-4 gap-4'
          >
            {/* Current Points */}
            <div className='bg-gradient-to-br from-pink-50 to-pink-100 border-2 border-pink-200 rounded-2xl p-4 lg:p-6 text-center'>
              <div className='bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl w-12 h-12 lg:w-16 lg:h-16 flex items-center justify-center mx-auto mb-3'>
                <Coins className='w-6 h-6 lg:w-8 lg:h-8 text-white' />
              </div>
              <p className='text-2xl lg:text-3xl font-bold text-pink-600 mb-1'>
                {user.points || 0}
              </p>
              <p className='text-sm font-semibold text-gray-700'>
                Current Points
              </p>
            </div>

            {/* Active Rewards */}
            <div className='bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-2xl p-4 lg:p-6 text-center'>
              <div className='bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl w-12 h-12 lg:w-16 lg:h-16 flex items-center justify-center mx-auto mb-3'>
                <Gift className='w-6 h-6 lg:w-8 lg:h-8 text-white' />
              </div>
              <p className='text-2xl lg:text-3xl font-bold text-purple-600 mb-1'>
                {activeRewards.length}
              </p>
              <p className='text-sm font-semibold text-gray-700'>
                Active Rewards
              </p>
            </div>

            {/* Games Played */}
            <div className='bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 rounded-2xl p-4 lg:p-6 text-center'>
              <div className='bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl w-12 h-12 lg:w-16 lg:h-16 flex items-center justify-center mx-auto mb-3'>
                <Target className='w-6 h-6 lg:w-8 lg:h-8 text-white' />
              </div>
              <p className='text-2xl lg:text-3xl font-bold text-indigo-600 mb-1'>
                {gameStats.totalGames || 0}
              </p>
              <p className='text-sm font-semibold text-gray-700'>
                Games Played
              </p>
            </div>

            {/* Total Earned */}
            <div className='bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-2xl p-4 lg:p-6 text-center'>
              <div className='bg-gradient-to-r from-green-500 to-green-600 rounded-xl w-12 h-12 lg:w-16 lg:h-16 flex items-center justify-center mx-auto mb-3'>
                <TrendingUp className='w-6 h-6 lg:w-8 lg:h-8 text-white' />
              </div>
              <p className='text-2xl lg:text-3xl font-bold text-green-600 mb-1'>
                {pointsSummary.totalEarned || 0}
              </p>
              <p className='text-sm font-semibold text-gray-700'>
                Total Earned
              </p>
            </div>
          </motion.div>

          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {/* Active Rewards Section */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className='bg-white rounded-2xl border-2 border-pink-100 p-6'
            >
              <div className='flex items-center justify-between mb-6'>
                <div className='flex items-center space-x-3'>
                  <div className='bg-gradient-to-r from-pink-500 to-rose-500 p-3 rounded-xl'>
                    <Gift className='w-6 h-6 text-white' />
                  </div>
                  <div>
                    <h2 className='text-xl font-bold text-gray-900'>
                      Active Rewards
                    </h2>
                    <p className='text-sm text-gray-600'>Ready to use</p>
                  </div>
                </div>
                <span className='bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-sm font-semibold'>
                  {activeRewards.length}
                </span>
              </div>

              <div className='space-y-3 max-h-96 overflow-y-auto'>
                {activeRewards.length > 0 ? (
                  activeRewards.map((reward) => (
                    <motion.div
                      key={reward._id}
                      whileHover={{ scale: 1.02 }}
                      className='bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-200 rounded-xl p-4 hover:border-pink-300 transition-colors'
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center space-x-3'>
                          <div className='bg-gradient-to-r from-pink-500 to-rose-500 p-2 rounded-lg'>
                            <Gift className='w-4 h-4 text-white' />
                          </div>
                          <div>
                            <p className='font-semibold text-gray-900'>
                              {reward.rewardSnapshot?.name || reward.title}
                            </p>
                            <p className='text-sm text-gray-600'>
                              {reward.rewardSnapshot?.description ||
                                reward.description}
                            </p>
                            <p className='text-xs text-gray-500'>
                              Claimed: {formatDate(reward.claimedAt)}
                            </p>
                          </div>
                        </div>
                        <div className='text-right'>
                          <div className='flex items-center space-x-2 mb-1'>
                            <CheckCircle className='w-4 h-4 text-green-500' />
                            <span className='px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800'>
                              Active
                            </span>
                          </div>
                          {reward.rewardSnapshot?.value && (
                            <p className='text-sm font-semibold text-pink-600'>
                              {reward.rewardSnapshot.type === 'discount'
                                ? `${reward.rewardSnapshot.value}%`
                                : `$${reward.rewardSnapshot.value}`}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className='text-center py-8'>
                    <Gift className='w-12 h-12 text-gray-300 mx-auto mb-3' />
                    <p className='text-gray-600'>No active rewards</p>
                    <p className='text-sm text-gray-500 mt-1'>
                      Claim some rewards to see them here
                    </p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Recent Activity Section */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className='bg-white rounded-2xl border-2 border-purple-100 p-6'
            >
              <div className='flex items-center justify-between mb-6'>
                <div className='flex items-center space-x-3'>
                  <div className='bg-gradient-to-r from-purple-500 to-purple-600 p-3 rounded-xl'>
                    <Activity className='w-6 h-6 text-white' />
                  </div>
                  <div>
                    <h2 className='text-xl font-bold text-gray-900'>
                      Recent Activity
                    </h2>
                    <p className='text-sm text-gray-600'>
                      Latest point transactions
                    </p>
                  </div>
                </div>
              </div>

              <div className='space-y-3 max-h-96 overflow-y-auto'>
                {recentActivity.length > 0 ? (
                  recentActivity.map((transaction) => (
                    <motion.div
                      key={transaction._id}
                      whileHover={{ scale: 1.02 }}
                      className={`border-2 rounded-xl p-4 transition-colors ${getActivityColor(
                        transaction.type,
                        transaction.points
                      )}`}
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center space-x-3'>
                          {getActivityIcon(transaction.type)}
                          <div>
                            <p className='font-semibold text-gray-900'>
                              {transaction.description}
                            </p>
                            <p className='text-sm text-gray-600 capitalize'>
                              {transaction.type.replace('_', ' ')}
                            </p>
                            <p className='text-xs text-gray-500'>
                              {formatDate(transaction.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className='text-right'>
                          <p
                            className={`text-lg font-bold ${
                              transaction.points > 0
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}
                          >
                            {transaction.points > 0 ? '+' : ''}
                            {transaction.points}
                          </p>
                          <p className='text-sm text-gray-500'>
                            Balance: {transaction.balance || 0}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className='text-center py-8'>
                    <Activity className='w-12 h-12 text-gray-300 mx-auto mb-3' />
                    <p className='text-gray-600'>No recent activity</p>
                    <p className='text-sm text-gray-500 mt-1'>
                      Start earning and spending points
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Game Statistics */}
          {gameStats.totalGames > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className='bg-white rounded-2xl border-2 border-indigo-100 p-6'
            >
              <div className='flex items-center space-x-3 mb-6'>
                <div className='bg-gradient-to-r from-indigo-500 to-indigo-600 p-3 rounded-xl'>
                  <Trophy className='w-6 h-6 text-white' />
                </div>
                <div>
                  <h2 className='text-xl font-bold text-gray-900'>
                    Game Statistics
                  </h2>
                  <p className='text-sm text-gray-600'>
                    Your gaming achievements
                  </p>
                </div>
              </div>

              <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
                <div className='bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 text-center'>
                  <Trophy className='w-8 h-8 text-indigo-600 mx-auto mb-2' />
                  <p className='text-2xl font-bold text-indigo-600'>
                    {gameStats.totalGames}
                  </p>
                  <p className='text-sm text-gray-600'>Total Games</p>
                </div>
                <div className='bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-4 text-center'>
                  <Sparkles className='w-8 h-8 text-pink-600 mx-auto mb-2' />
                  <p className='text-2xl font-bold text-pink-600'>
                    {gameStats.scratchGames || 0}
                  </p>
                  <p className='text-sm text-gray-600'>Scratch Cards</p>
                </div>
                <div className='bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center'>
                  <Target className='w-8 h-8 text-purple-600 mx-auto mb-2' />
                  <p className='text-2xl font-bold text-purple-600'>
                    {gameStats.spinGames || 0}
                  </p>
                  <p className='text-sm text-gray-600'>Spin Wheels</p>
                </div>
                <div className='bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center'>
                  <Zap className='w-8 h-8 text-green-600 mx-auto mb-2' />
                  <p className='text-2xl font-bold text-green-600'>
                    {gameStats.totalPointsWon || 0}
                  </p>
                  <p className='text-sm text-gray-600'>Points Won</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default ClientProfile
