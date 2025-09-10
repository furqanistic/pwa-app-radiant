// File: client/src/pages/Profile/ClientProfile.jsx - SIMPLIFIED VERSION
import { axiosInstance } from '@/config'
import { authService } from '@/services/authService'
import {
  Calendar,
  CheckCircle,
  Clock,
  Coins,
  Gift,
  History,
  Loader2,
  Target,
  Trophy,
  User,
  XCircle,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'
import Layout from '../Layout/Layout'

const ClientProfile = () => {
  const { userId } = useParams()
  const { currentUser } = useSelector((state) => state.user)

  // State
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('games')
  const [gameHistory, setGameHistory] = useState([])
  const [rewards, setRewards] = useState([])
  const [pointHistory, setPointHistory] = useState([])
  const [stats, setStats] = useState({})

  // Check if viewing own profile
  const isOwnProfile = !userId || userId === currentUser?._id

  // Fetch user profile
  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (isOwnProfile) {
          setUser(currentUser)
        } else {
          const response = await authService.getUserProfile(userId)
          if (response.status === 'success') {
            setUser(response.data.user)
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error)
        toast.error('Failed to load user profile')
      }
    }

    if (currentUser) {
      fetchUser()
    }
  }, [userId, currentUser, isOwnProfile])

  // Fetch tab data
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      setLoading(true)
      try {
        const targetUserId = isOwnProfile ? null : userId

        if (activeTab === 'games') {
          await fetchGameHistory(targetUserId)
        } else if (activeTab === 'rewards') {
          await fetchRewards(targetUserId)
        } else if (activeTab === 'history') {
          await fetchPointHistory(targetUserId)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [activeTab, user, userId, isOwnProfile])

  const fetchGameHistory = async (targetUserId) => {
    try {
      let endpoint = '/games/my-history'
      if (targetUserId) {
        endpoint = `/games/user/${targetUserId}/history`
      }

      const response = await axiosInstance.get(endpoint)
      if (response.data.status === 'success') {
        setGameHistory(response.data.data.gameHistory || [])
        setStats(response.data.data.stats || {})
      }
    } catch (error) {
      console.error('Error fetching game history:', error)
      setGameHistory([])
      setStats({})
    }
  }

  const fetchRewards = async (targetUserId) => {
    try {
      let endpoint = '/rewards/my-rewards'
      if (targetUserId) {
        endpoint = `/rewards/user/${targetUserId}/rewards`
      }

      const response = await axiosInstance.get(endpoint)
      if (response.data.status === 'success') {
        setRewards(response.data.data.userRewards || [])
      }
    } catch (error) {
      console.error('Error fetching rewards:', error)
      setRewards([])
    }
  }

  const fetchPointHistory = async (targetUserId) => {
    try {
      let endpoint = '/rewards/my-points/history'
      if (targetUserId) {
        endpoint = `/rewards/user/${targetUserId}/points/history`
      }

      const response = await axiosInstance.get(endpoint)
      if (response.data.status === 'success') {
        setPointHistory(response.data.data.transactions || [])
      }
    } catch (error) {
      console.error('Error fetching point history:', error)
      setPointHistory([])
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className='w-4 h-4 text-green-500' />
      case 'used':
        return <CheckCircle className='w-4 h-4 text-blue-500' />
      case 'expired':
        return <XCircle className='w-4 h-4 text-gray-500' />
      default:
        return <Clock className='w-4 h-4 text-yellow-500' />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'used':
        return 'bg-blue-100 text-blue-800'
      case 'expired':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  if (!user) {
    return (
      <Layout>
        <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
          <Loader2 className='w-8 h-8 animate-spin text-blue-600' />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className='min-h-screen bg-gray-50 p-4'>
        <div className='max-w-6xl mx-auto space-y-6'>
          {/* Header */}
          <div className='bg-white rounded-lg border p-6'>
            <div className='flex items-center space-x-4'>
              <div className='w-16 h-16 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center'>
                <User className='w-8 h-8 text-white' />
              </div>
              <div>
                <h1 className='text-2xl font-bold text-gray-900'>
                  {user.name}
                </h1>
                <p className='text-gray-600'>{user.email}</p>
                <div className='flex items-center space-x-4 mt-2'>
                  <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-pink-500 to-rose-500 text-white'>
                    {user.role}
                  </span>
                  <span className='text-sm text-gray-500'>
                    <Coins className='w-4 h-4 inline mr-1' />
                    {user.points || 0} points
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className='bg-white rounded-lg border'>
            <div className='border-b border-gray-200'>
              <nav className='flex space-x-8 px-6'>
                {[
                  { id: 'games', label: 'Games', icon: Trophy },
                  { id: 'rewards', label: 'Rewards', icon: Gift },
                  { id: 'history', label: 'History', icon: History },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-pink-500 text-pink-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <tab.icon className='w-4 h-4' />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className='p-6'>
              {loading ? (
                <div className='flex items-center justify-center py-12'>
                  <Loader2 className='w-6 h-6 animate-spin text-pink-600 mr-2' />
                  <span className='text-gray-600'>Loading...</span>
                </div>
              ) : (
                <>
                  {/* Games Tab */}
                  {activeTab === 'games' && (
                    <div className='space-y-6'>
                      {/* Stats */}
                      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                        <div className='bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg p-4 text-center text-white'>
                          <p className='text-2xl font-bold'>
                            {stats.totalGames || 0}
                          </p>
                          <p className='text-sm opacity-90'>Total Games</p>
                        </div>
                        <div className='bg-gradient-to-r from-pink-400 to-rose-400 rounded-lg p-4 text-center text-white'>
                          <p className='text-2xl font-bold'>
                            {stats.scratchGames || 0}
                          </p>
                          <p className='text-sm opacity-90'>Scratch Cards</p>
                        </div>
                        <div className='bg-gradient-to-r from-pink-300 to-rose-300 rounded-lg p-4 text-center text-white'>
                          <p className='text-2xl font-bold'>
                            {stats.spinGames || 0}
                          </p>
                          <p className='text-sm opacity-90'>Spin Wheels</p>
                        </div>
                        <div className='bg-gradient-to-r from-pink-600 to-rose-600 rounded-lg p-4 text-center text-white'>
                          <p className='text-2xl font-bold'>
                            {stats.totalPointsWon || 0}
                          </p>
                          <p className='text-sm opacity-90'>Points Won</p>
                        </div>
                      </div>

                      {/* Game History */}
                      <div>
                        <h3 className='text-lg font-semibold text-gray-900 mb-4'>
                          Game History
                        </h3>
                        {gameHistory.length > 0 ? (
                          <div className='space-y-3'>
                            {gameHistory.map((game) => (
                              <div
                                key={game._id}
                                className='bg-gray-50 rounded-lg p-4 border border-gray-200'
                              >
                                <div className='flex items-center justify-between'>
                                  <div className='flex items-center space-x-3'>
                                    <Target className='w-5 h-5 text-pink-500' />
                                    <div>
                                      <p className='font-medium text-gray-900'>
                                        {game.rewardSnapshot?.gameTitle ||
                                          game.gameTitle ||
                                          'Game'}
                                      </p>
                                      {game.rewardSnapshot?.winningItem && (
                                        <p className='text-sm font-medium text-pink-600'>
                                          Won:{' '}
                                          {
                                            game.rewardSnapshot.winningItem
                                              .title
                                          }
                                          {game.rewardSnapshot.winningItem
                                            .value && (
                                            <span className='ml-1'>
                                              (
                                              {
                                                game.rewardSnapshot.winningItem
                                                  .value
                                              }{' '}
                                              {
                                                game.rewardSnapshot.winningItem
                                                  .valueType
                                              }
                                              )
                                            </span>
                                          )}
                                        </p>
                                      )}
                                      {game.rewardSnapshot?.winningItem
                                        ?.description && (
                                        <p className='text-xs text-gray-600'>
                                          {
                                            game.rewardSnapshot.winningItem
                                              .description
                                          }
                                        </p>
                                      )}
                                      <p className='text-sm text-gray-600'>
                                        {formatDate(
                                          game.playedAt || game.createdAt
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                  <div className='text-right'>
                                    <div className='flex items-center space-x-2'>
                                      {getStatusIcon(game.status)}
                                      <span
                                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                          game.status
                                        )}`}
                                      >
                                        {game.status}
                                      </span>
                                    </div>
                                    {game.pointsWon && (
                                      <p className='text-sm text-pink-600 mt-1'>
                                        +{game.pointsWon} points
                                      </p>
                                    )}
                                    {game.rewardSnapshot?.pointCost > 0 && (
                                      <p className='text-xs text-gray-500 mt-1'>
                                        Cost: {game.rewardSnapshot.pointCost}{' '}
                                        pts
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className='text-center py-8'>
                            <Trophy className='w-12 h-12 text-gray-300 mx-auto mb-3' />
                            <p className='text-gray-600'>No games played yet</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Rewards Tab */}
                  {activeTab === 'rewards' && (
                    <div>
                      <h3 className='text-lg font-semibold text-gray-900 mb-4'>
                        My Rewards
                      </h3>
                      {rewards.length > 0 ? (
                        <div className='space-y-3'>
                          {rewards.map((reward) => (
                            <div
                              key={reward._id}
                              className='bg-gray-50 rounded-lg p-4 border border-gray-200'
                            >
                              <div className='flex items-center justify-between'>
                                <div className='flex items-center space-x-3'>
                                  <Gift className='w-5 h-5 text-pink-500' />
                                  <div>
                                    <p className='font-medium text-gray-900'>
                                      {reward.title}
                                    </p>
                                    <p className='text-sm text-gray-600'>
                                      {reward.description}
                                    </p>
                                    <p className='text-xs text-gray-500'>
                                      Claimed: {formatDate(reward.claimedAt)}
                                    </p>
                                  </div>
                                </div>
                                <div className='text-right'>
                                  <div className='flex items-center space-x-2'>
                                    {getStatusIcon(reward.status)}
                                    <span
                                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                        reward.status
                                      )}`}
                                    >
                                      {reward.status}
                                    </span>
                                  </div>
                                  {reward.value && (
                                    <p className='text-sm text-pink-600 mt-1'>
                                      {reward.value}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className='text-center py-8'>
                          <Gift className='w-12 h-12 text-gray-300 mx-auto mb-3' />
                          <p className='text-gray-600'>
                            No rewards claimed yet
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* History Tab */}
                  {activeTab === 'history' && (
                    <div>
                      <h3 className='text-lg font-semibold text-gray-900 mb-4'>
                        Point History
                      </h3>
                      {pointHistory.length > 0 ? (
                        <div className='space-y-3'>
                          {pointHistory.map((transaction) => (
                            <div
                              key={transaction._id}
                              className='bg-gray-50 rounded-lg p-4 border border-gray-200'
                            >
                              <div className='flex items-center justify-between'>
                                <div className='flex items-center space-x-3'>
                                  <Coins className='w-5 h-5 text-pink-500' />
                                  <div>
                                    <p className='font-medium text-gray-900'>
                                      {transaction.description}
                                    </p>
                                    <p className='text-sm text-gray-600'>
                                      {transaction.type}
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
                                        ? 'text-pink-600'
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
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className='text-center py-8'>
                          <History className='w-12 h-12 text-gray-300 mx-auto mb-3' />
                          <p className='text-gray-600'>No point history yet</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default ClientProfile
