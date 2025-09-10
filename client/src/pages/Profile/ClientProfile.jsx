// File: client/src/pages/Profile/ClientProfile.jsx - ENHANCED WITH GAME WINS
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
  RotateCcw,
  Settings,
  Star,
  Target,
  Ticket,
  TrendingUp,
  Trophy,
  User,
  Users,
  Zap,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import Layout from '../Layout/Layout'

// Enhanced auth service methods
const extendedAuthService = {
  ...authService,

  getUserProfile: async (userId) => {
    try {
      const response = await axiosInstance.get(`/auth/profile/${userId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return { status: 'error', data: { user: null } }
    }
  },

  getUserRewards: async (userId, page = 1, limit = 20, status = 'all') => {
    try {
      let endpoint = '/rewards/my-rewards'
      if (userId) {
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

  getPointHistory: async (userId, page = 1, limit = 20, type = 'all') => {
    try {
      let endpoint = '/rewards/my-points/history'
      if (userId) {
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

  // ENHANCED: Get game history with proper endpoint
  getGameHistory: async (
    userId,
    page = 1,
    limit = 20,
    gameType = '',
    status = ''
  ) => {
    try {
      let endpoint = '/gameWheel/my-history'
      if (userId) {
        endpoint = `/gameWheel/user/${userId}/history`
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })

      if (gameType) params.append('gameType', gameType)
      if (status) params.append('status', status)

      const response = await axiosInstance.get(`${endpoint}?${params}`)
      return response.data
    } catch (error) {
      console.error('Error fetching game history:', error)
      return { status: 'error', data: { gameHistory: [], stats: {} } }
    }
  },

  markRewardAsUsed: async (userRewardId, actualValue, notes) => {
    try {
      const response = await axiosInstance.patch(
        `/rewards/spa/mark-used/${userRewardId}`,
        { actualValue, notes }
      )
      return response.data
    } catch (error) {
      console.error('Error marking reward as used:', error)
      throw error
    }
  },
}

// Enhanced Game Win Item Component
const GameWinItem = ({ gameWin, canManage = false, onMarkAsUsed }) => {
  const winningItem = gameWin.rewardSnapshot?.winningItem || {}
  const gameType = gameWin.rewardSnapshot?.gameType

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getGameIcon = () => {
    if (gameType === 'spin') {
      return <RotateCcw className='w-5 h-5 text-purple-500' />
    } else if (gameType === 'scratch') {
      return <Ticket className='w-5 h-5 text-pink-500' />
    }
    return <Trophy className='w-5 h-5 text-yellow-500' />
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'used':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'expired':
        return 'bg-gray-100 text-gray-600 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  const getValueColor = (valueType) => {
    switch (valueType) {
      case 'points':
        return 'text-blue-600'
      case 'discount':
        return 'text-green-600'
      case 'service':
        return 'text-purple-600'
      case 'prize':
        return 'text-pink-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className='border-b border-pink-50 last:border-b-0'>
      <div className='flex items-start justify-between py-4'>
        <div className='flex items-start space-x-3'>
          {getGameIcon()}
          <div className='flex-1'>
            <div className='flex items-center space-x-2 mb-1'>
              <h4 className='text-sm font-semibold text-gray-800'>
                {winningItem.title}
              </h4>
              {winningItem.color && (
                <div
                  className='w-3 h-3 rounded-full border border-gray-200'
                  style={{ backgroundColor: winningItem.color }}
                />
              )}
            </div>

            <p className='text-xs text-gray-600 mb-2'>
              {gameWin.rewardSnapshot?.gameTitle} •{' '}
              {formatDate(gameWin.claimedAt)}
            </p>

            {winningItem.description && (
              <p className='text-xs text-gray-500 mb-2'>
                {winningItem.description}
              </p>
            )}

            <div className='flex items-center space-x-3'>
              <span
                className={`text-sm font-bold ${getValueColor(
                  winningItem.valueType
                )}`}
              >
                {winningItem.value} {winningItem.valueType}
              </span>

              <div
                className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                  gameWin.status
                )}`}
              >
                {gameWin.status}
              </div>

              {gameWin.rewardSnapshot?.pointCost > 0 && (
                <span className='text-xs text-gray-500'>
                  Cost: {gameWin.rewardSnapshot.pointCost} pts
                </span>
              )}
            </div>

            {gameWin.status === 'active' && gameWin.expiresAt && (
              <p className='text-xs text-orange-600 mt-1'>
                Expires: {formatDate(gameWin.expiresAt)}
              </p>
            )}
          </div>
        </div>

        <div className='text-right'>
          {canManage &&
            gameWin.status === 'active' &&
            winningItem.valueType !== 'points' && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onMarkAsUsed(gameWin)}
                className='px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors'
              >
                Mark Used
              </motion.button>
            )}

          {gameWin.actualValue && gameWin.status === 'used' && (
            <p className='text-xs text-green-600 mt-1'>
              Redeemed: ${gameWin.actualValue}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// Enhanced Stats Card for Game Wins
const GameStatsCard = ({ stats }) => {
  if (!stats) return null

  return (
    <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
      <div className='text-center bg-purple-50 rounded-xl p-4'>
        <p className='text-2xl font-bold text-purple-600'>
          {stats.totalGames || 0}
        </p>
        <p className='text-sm text-gray-600'>Total Games</p>
      </div>

      <div className='text-center bg-pink-50 rounded-xl p-4'>
        <p className='text-2xl font-bold text-pink-600'>
          {stats.scratchGames || 0}
        </p>
        <p className='text-sm text-gray-600'>Scratch Cards</p>
      </div>

      <div className='text-center bg-blue-50 rounded-xl p-4'>
        <p className='text-2xl font-bold text-blue-600'>
          {stats.spinGames || 0}
        </p>
        <p className='text-sm text-gray-600'>Spin Wheels</p>
      </div>

      <div className='text-center bg-green-50 rounded-xl p-4'>
        <p className='text-2xl font-bold text-green-600'>
          {stats.totalPointsWon || 0}
        </p>
        <p className='text-sm text-gray-600'>Points Won</p>
      </div>
    </div>
  )
}

// Main ClientProfile component with enhanced game wins display
const ClientProfile = ({ userId: propUserId = null }) => {
  const urlUserId = window.location.pathname
    .split('/client/')[1]
    ?.split('?')[0]
    ?.split('/')[0]
  const userId = propUserId || urlUserId

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [onboardingStatus, setOnboardingStatus] = useState(null)
  const [userRewards, setUserRewards] = useState([])
  const [pointHistory, setPointHistory] = useState([])
  const [gameHistory, setGameHistory] = useState([])
  const [gameStats, setGameStats] = useState({})
  const [activeTab, setActiveTab] = useState('overview')
  const [transactionFilter, setTransactionFilter] = useState('all')
  const [rewardFilter, setRewardFilter] = useState('all')
  const [gameFilter, setGameFilter] = useState('')
  const [gameStatusFilter, setGameStatusFilter] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [isViewingOwnProfile, setIsViewingOwnProfile] = useState(true)

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const currentUserResponse = await extendedAuthService.getCurrentUser()
        setCurrentUser(currentUserResponse.data.user)

        const targetUserId = userId || currentUserResponse.data.user._id
        const isOwnProfile =
          !userId || userId === currentUserResponse.data.user._id
        setIsViewingOwnProfile(isOwnProfile)

        let userResponse
        let onboardingResponse = null

        if (isOwnProfile) {
          userResponse = await extendedAuthService.getCurrentUser()
          onboardingResponse = await extendedAuthService.getOnboardingStatus()
        } else {
          userResponse = await extendedAuthService.getUserProfile(targetUserId)
        }

        if (userResponse.status === 'success') {
          setUser(userResponse.data.user)
        }

        if (onboardingResponse && onboardingResponse.status === 'success') {
          setOnboardingStatus(onboardingResponse.data.onboardingStatus)
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
        toast.error('Failed to load profile data')
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [userId])

  useEffect(() => {
    const fetchData = async () => {
      if (
        activeTab === 'rewards' ||
        activeTab === 'history' ||
        activeTab === 'games'
      ) {
        setLoading(true)

        try {
          const targetUserId = isViewingOwnProfile ? null : userId || user?._id

          const promises = []

          if (activeTab === 'rewards' || activeTab === 'history') {
            promises.push(
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
              )
            )
          }

          if (
            activeTab === 'rewards' ||
            activeTab === 'games' ||
            activeTab === 'history'
          ) {
            promises.push(
              extendedAuthService.getGameHistory(
                targetUserId,
                1,
                50,
                gameFilter,
                gameStatusFilter
              )
            )
          }

          const responses = await Promise.all(promises)

          let responseIndex = 0

          if (activeTab === 'rewards' || activeTab === 'history') {
            const [rewardsResponse, pointsResponse] = responses.slice(
              responseIndex,
              responseIndex + 2
            )
            responseIndex += 2

            if (rewardsResponse.status === 'success') {
              setUserRewards(rewardsResponse.data.userRewards || [])
            }

            if (pointsResponse.status === 'success') {
              setPointHistory(pointsResponse.data.transactions || [])
            }
          }

          if (
            activeTab === 'rewards' ||
            activeTab === 'games' ||
            activeTab === 'history'
          ) {
            const gameResponse = responses[responseIndex]

            if (gameResponse.status === 'success') {
              setGameHistory(gameResponse.data.gameHistory || [])
              setGameStats(gameResponse.data.stats || {})
            }
          }
        } catch (error) {
          console.error('Error fetching data:', error)
          toast.error('Failed to load data')
        } finally {
          setLoading(false)
        }
      }
    }

    fetchData()
  }, [
    activeTab,
    rewardFilter,
    transactionFilter,
    gameFilter,
    gameStatusFilter,
    userId,
    isViewingOwnProfile,
    user,
  ])

  const handleMarkAsUsed = async (reward) => {
    try {
      await extendedAuthService.markRewardAsUsed(
        reward._id,
        reward.rewardSnapshot?.value || 0,
        'Redeemed at spa'
      )

      // Update local state
      setUserRewards((prev) =>
        prev.map((r) =>
          r._id === reward._id
            ? { ...r, status: 'used', usedAt: new Date() }
            : r
        )
      )

      setGameHistory((prev) =>
        prev.map((g) =>
          g._id === reward._id
            ? { ...g, status: 'used', usedAt: new Date() }
            : g
        )
      )

      toast.success('Reward marked as used successfully!')
    } catch (error) {
      console.error('Error marking reward as used:', error)
      toast.error('Failed to mark reward as used')
    }
  }

  const canManageReward = (reward) => {
    return (
      currentUser?.role === 'team' &&
      reward.status === 'active' &&
      currentUser?.spaLocation?.locationId === reward.locationId
    )
  }

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
      <Layout>
        <div className='min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center'>
          <div className='bg-white rounded-2xl p-8 border border-pink-100 text-center'>
            <p className='text-gray-600'>Unable to load profile data</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className='min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-4 pb-20'>
        <div className='max-w-7xl mx-auto space-y-6'>
          {/* Header Profile Card - Keep existing */}
          {/* Stats Grid - Keep existing */}

          {/* Enhanced Tab Navigation */}
          <div className='flex space-x-1 bg-white rounded-2xl p-1 border border-pink-100'>
            {['overview', 'location', 'games', 'rewards', 'history'].map(
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
            {/* Overview and Location tabs - keep existing code */}

            {/* NEW: Games Tab */}
            {activeTab === 'games' && (
              <div className='space-y-6'>
                {/* Game Stats */}
                <div className='bg-white rounded-2xl p-6 border border-pink-100'>
                  <h3 className='text-lg font-semibold text-gray-800 mb-4 flex items-center'>
                    <Trophy className='w-5 h-5 text-yellow-500 mr-2' />
                    Game Statistics
                  </h3>
                  <GameStatsCard stats={gameStats} />
                </div>

                {/* Game Filters */}
                <div className='bg-white rounded-2xl p-6 border border-pink-100'>
                  <div className='flex items-center justify-between mb-4'>
                    <h3 className='text-lg font-semibold text-gray-800 flex items-center'>
                      <Target className='w-5 h-5 text-pink-500 mr-2' />
                      Game History
                    </h3>
                    <div className='flex space-x-2'>
                      <select
                        value={gameFilter}
                        onChange={(e) => setGameFilter(e.target.value)}
                        className='px-3 py-1 text-sm border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500'
                      >
                        <option value=''>All Games</option>
                        <option value='spin'>Spin Wheel</option>
                        <option value='scratch'>Scratch Card</option>
                      </select>
                      <select
                        value={gameStatusFilter}
                        onChange={(e) => setGameStatusFilter(e.target.value)}
                        className='px-3 py-1 text-sm border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500'
                      >
                        <option value=''>All Status</option>
                        <option value='active'>Active</option>
                        <option value='used'>Used</option>
                        <option value='expired'>Expired</option>
                      </select>
                    </div>
                  </div>

                  {/* Game History List */}
                  {loading ? (
                    <div className='flex items-center justify-center py-8'>
                      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600'></div>
                      <span className='ml-2 text-gray-600'>
                        Loading game history...
                      </span>
                    </div>
                  ) : gameHistory.length > 0 ? (
                    <div className='space-y-0'>
                      {gameHistory.map((gameWin) => (
                        <GameWinItem
                          key={gameWin._id}
                          gameWin={gameWin}
                          canManage={canManageReward(gameWin)}
                          onMarkAsUsed={handleMarkAsUsed}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className='text-center py-8'>
                      <Trophy className='w-12 h-12 text-gray-300 mx-auto mb-3' />
                      <p className='text-gray-600'>No game history yet</p>
                      <p className='text-sm text-gray-500 mt-2'>
                        Start playing games to see your wins here
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Enhanced Rewards Tab */}
            {activeTab === 'rewards' && (
              <div className='space-y-6'>
                {/* Game Wins Section */}
                {gameHistory.length > 0 && (
                  <div className='bg-white rounded-2xl p-6 border border-pink-100'>
                    <h3 className='text-lg font-semibold text-gray-800 mb-4 flex items-center'>
                      <Trophy className='w-5 h-5 text-yellow-500 mr-2' />
                      Recent Game Wins
                    </h3>

                    <div className='space-y-0'>
                      {gameHistory.slice(0, 5).map((gameWin) => (
                        <GameWinItem
                          key={gameWin._id}
                          gameWin={gameWin}
                          canManage={canManageReward(gameWin)}
                          onMarkAsUsed={handleMarkAsUsed}
                        />
                      ))}
                    </div>

                    {gameHistory.length > 5 && (
                      <div className='text-center mt-4'>
                        <button
                          onClick={() => setActiveTab('games')}
                          className='text-pink-600 hover:text-pink-700 text-sm font-medium'
                        >
                          View All Game History →
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Keep existing rewards code */}
              </div>
            )}

            {/* History tab - keep existing code */}
          </motion.div>
        </div>
      </div>
    </Layout>
  )
}

export default ClientProfile
