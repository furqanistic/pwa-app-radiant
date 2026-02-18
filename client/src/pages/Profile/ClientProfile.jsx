// File: client/src/pages/Profile/ClientProfile.jsx - COMPLETELY REDESIGNED
import { authService } from '@/services/authService'
import { userRewardsService } from '@/services/userRewardsService'
import { AnimatePresence, motion } from 'framer-motion'
import {
    Activity,
    Award,
    Calendar,
    CheckCircle,
    Clock,
    Coins,
    Edit,
    Eye,
    EyeOff,
    Gift,
    History,
    Loader2,
    MapPin,
    RefreshCw,
    Save,
    Shield,
    Sparkles,
    Star,
    Target,
    TrendingUp,
    Trophy,
    User,
    X,
    XCircle,
    Zap,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useLocation, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import Layout from '../Layout/Layout'

const ClientProfile = () => {
  const { userId } = useParams()
  const location = useLocation()
  const { currentUser } = useSelector((state) => state.user)
  const preloadedUser = location.state?.user || null

  // State
  const [user, setUser] = useState(preloadedUser)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeRewards, setActiveRewards] = useState([])
  const [claimedRewards, setClaimedRewards] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [gameStats, setGameStats] = useState({})
   const [pointsSummary, setPointsSummary] = useState({})
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', email: '' })
  const [isSaving, setIsSaving] = useState(false)
  const brandColor = 'var(--brand-primary)'
  const brandTint = 'color-mix(in srgb, var(--brand-primary) 12%, #ffffff)'
  const brandTintStrong = 'color-mix(in srgb, var(--brand-primary) 20%, #ffffff)'
  const brandBorder = 'color-mix(in srgb, var(--brand-primary) 35%, #ffffff)'

  // Check if viewing own profile
  const isOwnProfile = !userId || userId === currentUser?._id

  useEffect(() => {
    if (preloadedUser && !isOwnProfile) {
      setUser(preloadedUser)
      setEditForm({
        name: preloadedUser.name || '',
        email: preloadedUser.email || '',
      })
    }
  }, [preloadedUser, isOwnProfile])

  // Fetch all profile data
  const fetchProfileData = async () => {
    if (!currentUser) return

    try {
      setLoading(true)
      const targetUserId =
        (isOwnProfile && currentUser._id) ||
        userId ||
        preloadedUser?._id ||
        preloadedUser?.userId ||
        preloadedUser?.id

      // Fetch user info
       if (isOwnProfile) {
        setUser(currentUser)
        setEditForm({ name: currentUser.name, email: currentUser.email })
      } else {
        if (!targetUserId) {
          throw new Error('Missing target user id')
        }
        try {
          const userResponse = await authService.getUserProfile(targetUserId)
          if (userResponse.status === 'success') {
            const fetchedUser = userResponse.data.user
            setUser(fetchedUser)
            setEditForm({ name: fetchedUser.name, email: fetchedUser.email })
          }
        } catch (profileError) {
          if (preloadedUser) {
            setUser(preloadedUser)
            setEditForm({
              name: preloadedUser.name || '',
              email: preloadedUser.email || '',
            })
          } else {
            throw profileError
          }
        }
      }

      // Fetch profile data in parallel
      if (!targetUserId) {
        setLoading(false)
        setRefreshing(false)
        return
      }

      const [rewardsRes, transactionsRes, gameStatsRes] =
        await Promise.allSettled([
          userRewardsService.getUserRewards({
            userId: isOwnProfile ? null : targetUserId,
            status: 'all',
            limit: 200,
          }),
          userRewardsService.getUserTransactions({
            userId: isOwnProfile ? null : targetUserId,
            limit: 20,
          }),
          userRewardsService.getUserGameStats({
            userId: isOwnProfile ? null : targetUserId,
          }),
        ])

      // Process claimed rewards
      if (
        rewardsRes.status === 'fulfilled' &&
        rewardsRes.value.status === 'success'
      ) {
        const rewards = rewardsRes.value.data.rewards || []
        setClaimedRewards(rewards)
        const now = new Date()
        const active = rewards.filter(
          (reward) =>
            reward.status === 'active' &&
            (!reward.expiresAt || new Date(reward.expiresAt) > now)
        )
        setActiveRewards(active)
      }

      // Process recent activity
      if (
        transactionsRes.status === 'fulfilled' &&
        transactionsRes.value.status === 'success'
      ) {
        const transactions = transactionsRes.value.data.transactions || []
        setRecentActivity(transactions)
        setPointsSummary(
          transactionsRes.value.data.summary ||
            transactionsRes.value.data.stats ||
            {}
        )
      }

      // Process game stats
      if (
        gameStatsRes.status === 'fulfilled' &&
        gameStatsRes.value.status === 'success'
      ) {
        setGameStats(gameStatsRes.value.data.stats || {})
      }
    } catch (error) {
      console.error('Error fetching profile data:', error)
      if (!user && !preloadedUser && !isOwnProfile) {
        toast.error('Failed to load profile data')
      }
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

  const handleSave = async () => {
    if (!editForm.name.trim() || !editForm.email.trim()) {
      toast.error('Name and email are required')
      return
    }

    try {
      setIsSaving(true)
      const response = await authService.updateUser(user._id, editForm)
      if (response.status === 'success') {
        setUser(response.data.user)
        setIsEditing(false)
        toast.success('User updated successfully')
      }
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error(error.response?.data?.message || 'Failed to update user')
    } finally {
      setIsSaving(false)
    }
  }

  const isSuperAdmin = currentUser?.role === 'super-admin'

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
        return <Gift className='w-4 h-4' style={{ color: brandColor }} />
      case 'earned':
      case 'bonus':
        return <Zap className='w-4 h-4 text-green-500' />
      case 'game_play':
        return <Target className='w-4 h-4' style={{ color: brandColor }} />
      case 'referral':
        return <Award className='w-4 h-4 text-gray-500' />
      default:
        return <Coins className='w-4 h-4 text-gray-500' />
    }
  }

  const getActivityColor = (type, points) => {
    if (points > 0) return 'text-green-600 bg-gray-50 border-gray-200/70'
    if (points < 0) return 'text-red-600 bg-gray-50 border-gray-200/70'
    return 'text-gray-600 bg-gray-50 border-gray-200/70'
  }

  const now = new Date()
  const isRewardExpired = (reward) =>
    reward.status === 'expired' ||
    (reward.expiresAt && new Date(reward.expiresAt) <= now)

  const visibleRewards = claimedRewards.filter((reward) => !isRewardExpired(reward))
  const expiredRewards = claimedRewards
    .filter(isRewardExpired)
    .sort((a, b) => {
      const aDate = new Date(a.expiresAt || a.claimedAt || 0).getTime()
      const bDate = new Date(b.expiresAt || b.claimedAt || 0).getTime()
      return bDate - aDate
    })
    .slice(0, 3)

  const formatRewardValue = (reward) => {
    const snapshot = reward?.rewardSnapshot || {}
    if (snapshot.type === 'game_win' && snapshot.winningItem) {
      const { value, valueType } = snapshot.winningItem
      if (valueType === 'points') return `${value} points`
      return `${value} ${valueType}`
    }
    if (snapshot.type === 'discount') return `${snapshot.value}%`
    if (snapshot.type === 'credit') return `$${snapshot.value}`
    return snapshot.value != null ? `${snapshot.value}` : ''
  }

  if (loading) {
    return (
      <Layout>
        <div
          className='min-h-screen flex items-center justify-center p-4'
          style={{
            background: `linear-gradient(135deg, ${brandTintStrong} 0%, #ffffff 70%)`,
          }}
        >
          <div className='text-center'>
            <Loader2
              className='w-8 h-8 animate-spin mx-auto mb-4'
              style={{ color: brandColor }}
            />
            <p className='text-gray-600'>Loading profile...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (!user) {
    return (
      <Layout>
        <div
          className='min-h-screen flex items-center justify-center p-4'
          style={{
            background: `linear-gradient(135deg, ${brandTintStrong} 0%, #ffffff 70%)`,
          }}
        >
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
      <div
        className='min-h-screen p-3 sm:p-4 lg:p-6'
        style={{
          background: `linear-gradient(135deg, ${brandTint} 0%, #ffffff 60%)`,
        }}
      >
        <div className='max-w-6xl mx-auto space-y-6'>
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className='bg-white rounded-2xl border-2 border-gray-200/70 p-6 lg:p-8'
          >
            <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-6'>
              <div className='flex items-center space-x-6'>
                <div className='relative'>
                  <div
                    className='w-20 h-20 lg:w-24 lg:h-24 rounded-2xl flex items-center justify-center shadow-lg'
                    style={{ backgroundColor: brandColor }}
                  >
                    <User className='w-10 h-10 lg:w-12 lg:h-12 text-white' />
                  </div>
                  {user.role !== 'user' && (
                    <div
                      className='absolute -top-2 -right-2 text-white p-1.5 rounded-lg'
                      style={{ backgroundColor: brandColor }}
                    >
                      <Shield className='w-3 h-3' />
                    </div>
                  )}
                </div>
                <div>
                  {isEditing ? (
                    <div className='space-y-3 mb-3'>
                      <div className='relative'>
                        <User className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
                        <input
                          type='text'
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm({ ...editForm, name: e.target.value })
                          }
                          className='w-full pl-10 pr-4 py-2 border-2 rounded-xl outline-none transition-colors'
                          style={{ borderColor: brandBorder }}
                          placeholder='Full Name'
                        />
                      </div>
                      <div className='relative'>
                        <X className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
                        <input
                          type='email'
                          value={editForm.email}
                          onChange={(e) =>
                            setEditForm({ ...editForm, email: e.target.value })
                          }
                          className='w-full pl-10 pr-4 py-2 border-2 rounded-xl outline-none transition-colors'
                          style={{ borderColor: brandBorder }}
                          placeholder='Email Address'
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <h1 className='text-2xl lg:text-3xl font-bold text-gray-900 mb-2'>
                        {user.name}
                      </h1>
                      <p className='text-gray-600 mb-3'>{user.email}</p>
                    </>
                  )}
                  <div className='flex flex-wrap items-center gap-3'>
                    <span
                      className='inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white'
                      style={{ backgroundColor: brandColor }}
                    >
                      {user.role}
                    </span>
                    {user.selectedLocation?.locationName && (
                      <span className='inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 border border-gray-200'>
                        <MapPin className='w-3 h-3 mr-1' />
                        {user.selectedLocation.locationName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className='flex items-center gap-3'>
                {isSuperAdmin && !isOwnProfile && (
                  <>
                    {isEditing ? (
                      <div className='flex items-center gap-2'>
                        <button
                          onClick={() => setIsEditing(false)}
                          className='px-4 py-2 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors'
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={isSaving}
                        className='px-4 py-2 rounded-xl text-white font-semibold flex items-center gap-2 shadow-lg disabled:opacity-50 transition-all hover:scale-105 active:scale-95'
                        style={{
                          backgroundColor: brandColor,
                          boxShadow: `0 10px 20px ${brandBorder}`,
                        }}
                      >
                          {isSaving ? (
                            <Loader2 className='w-4 h-4 animate-spin' />
                          ) : (
                            <Save className='w-4 h-4' />
                          )}
                          Save Changes
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        className='p-3 rounded-xl border-2 transition-colors flex items-center gap-2'
                        style={{ borderColor: brandBorder, color: brandColor }}
                      >
                        <Edit className='w-5 h-5' />
                        <span className='font-semibold hidden sm:inline'>
                          Edit Profile
                        </span>
                      </button>
                    )}
                  </>
                )}
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className='p-3 rounded-xl border-2 transition-colors'
                  style={{ borderColor: brandBorder }}
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
            <div
              className='border-2 border-gray-200/70 rounded-2xl p-4 lg:p-6 text-center'
              style={{ backgroundColor: brandTint }}
            >
              <div
                className='rounded-xl w-12 h-12 lg:w-16 lg:h-16 flex items-center justify-center mx-auto mb-3'
                style={{ backgroundColor: brandColor }}
              >
                <Coins className='w-6 h-6 lg:w-8 lg:h-8 text-white' />
              </div>
              <p
                className='text-2xl lg:text-3xl font-bold mb-1'
                style={{ color: brandColor }}
              >
                {user.points || 0}
              </p>
              <p className='text-sm font-semibold text-gray-700'>
                Current Points
              </p>
            </div>

            {/* Active Rewards */}
            <div
              className='border-2 border-gray-200/70 rounded-2xl p-4 lg:p-6 text-center'
              style={{ backgroundColor: brandTint }}
            >
              <div
                className='rounded-xl w-12 h-12 lg:w-16 lg:h-16 flex items-center justify-center mx-auto mb-3'
                style={{ backgroundColor: brandColor }}
              >
                <Gift className='w-6 h-6 lg:w-8 lg:h-8 text-white' />
              </div>
              <p
                className='text-2xl lg:text-3xl font-bold mb-1'
                style={{ color: brandColor }}
              >
                {activeRewards.length}
              </p>
              <p className='text-sm font-semibold text-gray-700'>
                Active Rewards
              </p>
            </div>

            {/* Games Played */}
            <div
              className='border-2 border-gray-200/70 rounded-2xl p-4 lg:p-6 text-center'
              style={{ backgroundColor: brandTint }}
            >
              <div
                className='rounded-xl w-12 h-12 lg:w-16 lg:h-16 flex items-center justify-center mx-auto mb-3'
                style={{ backgroundColor: brandColor }}
              >
                <Target className='w-6 h-6 lg:w-8 lg:h-8 text-white' />
              </div>
              <p
                className='text-2xl lg:text-3xl font-bold mb-1'
                style={{ color: brandColor }}
              >
                {gameStats.totalGamesPlayed || gameStats.totalGames || 0}
              </p>
              <p className='text-sm font-semibold text-gray-700'>
                Games Played
              </p>
            </div>

            {/* Total Earned */}
            <div
              className='border-2 border-gray-200/70 rounded-2xl p-4 lg:p-6 text-center'
              style={{ backgroundColor: brandTint }}
            >
              <div
                className='rounded-xl w-12 h-12 lg:w-16 lg:h-16 flex items-center justify-center mx-auto mb-3'
                style={{ backgroundColor: brandColor }}
              >
                <TrendingUp className='w-6 h-6 lg:w-8 lg:h-8 text-white' />
              </div>
              <p
                className='text-2xl lg:text-3xl font-bold mb-1'
                style={{ color: brandColor }}
              >
                {pointsSummary.totalEarned || 0}
              </p>
              <p className='text-sm font-semibold text-gray-700'>
                Total Earned
              </p>
            </div>
          </motion.div>

          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {/* Claimed Rewards Section */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className='bg-white rounded-2xl border-2 border-gray-200/70 p-6'
            >
              <div className='flex items-center justify-between mb-6'>
                <div className='flex items-center space-x-3'>
                  <div
                    className='p-3 rounded-xl'
                    style={{ backgroundColor: brandColor }}
                  >
                    <Gift className='w-6 h-6 text-white' />
                  </div>
                  <div>
                    <h2 className='text-xl font-bold text-gray-900'>
                      Claimed Rewards
                    </h2>
                    <p className='text-sm text-gray-600'>
                      Active, used, and recent expired
                    </p>
                  </div>
                </div>
                <span
                  className='px-3 py-1 rounded-full text-sm font-semibold'
                  style={{ backgroundColor: brandTintStrong, color: brandColor }}
                >
                  {visibleRewards.length}
                </span>
              </div>

              <div className='space-y-3 max-h-96 overflow-y-auto'>
                {visibleRewards.length > 0 ? (
                  visibleRewards.map((reward) => {
                    const expired = isRewardExpired(reward)
                    const statusLabel = expired
                      ? 'Expired'
                      : reward.status === 'used'
                      ? 'Used'
                      : reward.status === 'pending'
                      ? 'Pending'
                      : 'Active'
                    return (
                    <motion.div
                      key={reward._id}
                      whileHover={{ scale: 1.02 }}
                      className='border-2 border-gray-200/70 rounded-xl p-4 transition-colors'
                      style={{ backgroundColor: brandTint }}
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center space-x-3'>
                          <div
                            className='p-2 rounded-lg'
                            style={{ backgroundColor: brandColor }}
                          >
                            <Gift className='w-4 h-4 text-white' />
                          </div>
                          <div>
                            <p className='font-semibold text-gray-900'>
                              {reward.rewardSnapshot?.name ||
                                reward.rewardSnapshot?.winningItem?.title ||
                                reward.title}
                            </p>
                            <p className='text-sm text-gray-600'>
                              {reward.rewardSnapshot?.description ||
                                reward.rewardSnapshot?.winningItem?.description ||
                                reward.description}
                            </p>
                            <p className='text-xs text-gray-500'>
                              Claimed: {formatDate(reward.claimedAt)}
                            </p>
                            {reward.expiresAt && (
                              <p className='text-xs text-gray-500'>
                                Expires: {formatDate(reward.expiresAt)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className='text-right'>
                          <div className='flex items-center space-x-2 mb-1'>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                statusLabel === 'Active'
                                  ? 'bg-green-100 text-green-800'
                                  : statusLabel === 'Used'
                                  ? 'bg-gray-100 text-gray-700'
                                  : statusLabel === 'Pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {statusLabel}
                            </span>
                          </div>
                          <p
                            className='text-sm font-semibold'
                            style={{ color: brandColor }}
                          >
                            {formatRewardValue(reward)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )
                  })
                ) : (
                  <div className='text-center py-8'>
                    <Gift className='w-12 h-12 text-gray-300 mx-auto mb-3' />
                    <p className='text-gray-600'>No claimed rewards yet</p>
                    <p className='text-sm text-gray-500 mt-1'>
                      Claim some rewards to see them here
                    </p>
                  </div>
                )}
              </div>

              {expiredRewards.length > 0 && (
                <div className='mt-6 pt-4 border-t border-gray-200/70'>
                  <h3 className='text-sm font-semibold text-gray-900 mb-3'>
                    Recently Expired
                  </h3>
                  <div className='space-y-2'>
                    {expiredRewards.map((reward) => (
                      <div
                        key={reward._id}
                        className='flex items-center justify-between text-sm text-gray-600'
                      >
                        <span className='truncate'>
                          {reward.rewardSnapshot?.name ||
                            reward.rewardSnapshot?.winningItem?.title ||
                            reward.title}
                        </span>
                        <span className='text-xs text-gray-500'>
                          {formatDate(reward.expiresAt || reward.claimedAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Recent Activity Section */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className='bg-white rounded-2xl border-2 border-gray-200/70 p-6'
            >
              <div className='flex items-center justify-between mb-6'>
                <div className='flex items-center space-x-3'>
                  <div
                    className='p-3 rounded-xl'
                    style={{ backgroundColor: brandColor }}
                  >
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
              className='bg-white rounded-2xl border-2 border-gray-200/70 p-6'
            >
              <div className='flex items-center space-x-3 mb-6'>
                <div
                  className='p-3 rounded-xl'
                  style={{ backgroundColor: brandColor }}
                >
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
            <div
              className='rounded-xl p-4 text-center border-2 border-gray-200/70'
              style={{ backgroundColor: brandTint }}
            >
              <Trophy
                className='w-8 h-8 mx-auto mb-2'
                style={{ color: brandColor }}
              />
              <p className='text-2xl font-bold' style={{ color: brandColor }}>
                {gameStats.totalGamesPlayed || gameStats.totalGames || 0}
              </p>
              <p className='text-sm text-gray-600'>Total Games</p>
            </div>
                <div
                  className='rounded-xl p-4 text-center border-2 border-gray-200/70'
                  style={{ backgroundColor: brandTint }}
                >
                  <Sparkles
                    className='w-8 h-8 mx-auto mb-2'
                    style={{ color: brandColor }}
                  />
              <p className='text-2xl font-bold' style={{ color: brandColor }}>
                {gameStats.scratchGames || 0}
              </p>
                  <p className='text-sm text-gray-600'>Scratch Cards</p>
                </div>
                <div
                  className='rounded-xl p-4 text-center border-2 border-gray-200/70'
                  style={{ backgroundColor: brandTint }}
                >
                  <Target
                    className='w-8 h-8 mx-auto mb-2'
                    style={{ color: brandColor }}
                  />
              <p className='text-2xl font-bold' style={{ color: brandColor }}>
                {gameStats.spinGames || 0}
              </p>
                  <p className='text-sm text-gray-600'>Spin Wheels</p>
                </div>
                <div
                  className='rounded-xl p-4 text-center border-2 border-gray-200/70'
                  style={{ backgroundColor: brandTint }}
                >
                  <Zap
                    className='w-8 h-8 mx-auto mb-2'
                    style={{ color: brandColor }}
                  />
              <p className='text-2xl font-bold' style={{ color: brandColor }}>
                {gameStats.totalPointsEarned || gameStats.totalPointsWon || 0}
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
