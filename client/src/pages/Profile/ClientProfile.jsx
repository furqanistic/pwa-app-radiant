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
import { useBranding } from '@/context/BrandingContext'

const ClientProfile = () => {
  const { userId } = useParams()
  const location = useLocation()
  const { currentUser } = useSelector((state) => state.user)
  const preloadedUser = location.state?.user || null
  const { branding } = useBranding()
  const brandColor = branding?.themeColor || '#ec4899'

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
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '' })
  const [isSaving, setIsSaving] = useState(false)

  // Check if viewing own profile
  const isOwnProfile = !userId || userId === currentUser?._id
  const isSuperAdmin = currentUser?.role === 'super-admin'
  const canEditRole = isSuperAdmin && !isOwnProfile

  useEffect(() => {
    if (preloadedUser && !isOwnProfile) {
      setUser(preloadedUser)
      setEditForm({
        name: preloadedUser.name || '',
        email: preloadedUser.email || '',
        role: preloadedUser.role || 'user',
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
        setEditForm({
          name: currentUser.name || '',
          email: currentUser.email || '',
          role: currentUser.role || 'user',
        })
      } else {
        if (!targetUserId) {
          throw new Error('Missing target user id')
        }
        try {
          const userResponse = await authService.getUserProfile(targetUserId)
          if (userResponse.status === 'success') {
            const fetchedUser = userResponse.data.user
            setUser(fetchedUser)
            setEditForm({
              name: fetchedUser.name || '',
              email: fetchedUser.email || '',
              role: fetchedUser.role || 'user',
            })
          }
        } catch (profileError) {
          if (preloadedUser) {
            setUser(preloadedUser)
            setEditForm({
              name: preloadedUser.name || '',
              email: preloadedUser.email || '',
              role: preloadedUser.role || 'user',
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
            limit: 100,
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
      const selectedRole = (editForm.role || '').trim()
      const normalizedRole = ['user', 'spa', 'admin'].includes(selectedRole)
        ? selectedRole
        : 'user'
      const payload = {
        name: editForm.name,
        email: editForm.email,
      }
      const response = await authService.updateUser(user._id, payload)

      if (
        canEditRole &&
        normalizedRole &&
        user?.role !== normalizedRole
      ) {
        await authService.changeUserRole(user._id, normalizedRole)
      }

      if (response.status === 'success') {
        setUser((prev) => ({
          ...(response.data.user || prev || {}),
          ...(canEditRole ? { role: normalizedRole } : {}),
        }))
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
    if (points > 0) return 'text-green-600 bg-white border-slate-100'
    if (points < 0) return 'text-red-600 bg-white border-slate-100'
    return 'text-gray-600 bg-white border-slate-100'
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
        <div className='min-h-screen flex items-center justify-center p-4 bg-slate-50'>
          <div className='text-center'>
            <Loader2
              className='w-8 h-8 animate-spin mx-auto mb-4'
              style={{ color: brandColor }}
            />
            <p className='text-slate-500 text-sm'>Loading profile...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (!user) {
    return (
      <Layout>
        <div className='min-h-screen flex items-center justify-center p-4 bg-slate-50'>
          <div className='text-center'>
            <User className='w-14 h-14 text-slate-300 mx-auto mb-4' />
            <p className='text-slate-500 text-sm'>User not found</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className='min-h-screen bg-slate-50 p-3 sm:p-4 lg:p-6'>
        <div className='max-w-6xl mx-auto space-y-5'>
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className='bg-white rounded-2xl border border-slate-200 p-5'
          >
            <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-5'>
              <div className='flex items-center gap-4'>
                <div className='relative shrink-0'>
                  <div
                    className='w-16 h-16 lg:w-20 lg:h-20 rounded-xl flex items-center justify-center'
                    style={{ backgroundColor: brandColor }}
                  >
                    <User className='w-8 h-8 lg:w-10 lg:h-10 text-white' />
                  </div>
                  {user.role !== 'user' && (
                    <div
                      className='absolute -top-1.5 -right-1.5 text-white p-1 rounded-lg'
                      style={{ backgroundColor: brandColor }}
                    >
                      <Shield className='w-2.5 h-2.5' />
                    </div>
                  )}
                </div>
                <div className='min-w-0 flex-1'>
                  {isEditing ? (
                    <div className='space-y-3 mb-3 max-w-sm'>
                      <div className='relative'>
                        <User className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
                        <input
                          type='text'
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm({ ...editForm, name: e.target.value })
                          }
                          className='w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none transition-colors text-sm focus:border-slate-300'
                          placeholder='Full Name'
                        />
                      </div>
                      <div className='relative'>
                        <X className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
                        <input
                          type='email'
                          value={editForm.email}
                          onChange={(e) =>
                            setEditForm({ ...editForm, email: e.target.value })
                          }
                          className='w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none transition-colors text-sm focus:border-slate-300'
                          placeholder='Email Address'
                        />
                      </div>
                      {canEditRole && (
                        <div className='relative'>
                          <Shield className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
                          <select
                            value={editForm.role}
                            onChange={(e) =>
                              setEditForm({ ...editForm, role: e.target.value })
                            }
                            className='w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none transition-colors bg-white text-sm focus:border-slate-300'
                          >
                            <option value='user'>user</option>
                            <option value='spa'>spa</option>
                            <option value='admin'>admin</option>
                          </select>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <h1 className='text-xl lg:text-2xl font-semibold text-slate-900'>
                        {user.name}
                      </h1>
                      <p className='text-sm text-slate-500 mt-0.5'>{user.email}</p>
                    </>
                  )}
                  <div className='flex flex-wrap items-center gap-2 mt-3'>
                    <span
                      className='inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium text-white'
                      style={{ backgroundColor: brandColor }}
                    >
                      {user.role}
                    </span>
                    {user.selectedLocation?.locationName && (
                      <span className='inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200'>
                        <MapPin className='w-3 h-3 mr-1' />
                        {user.selectedLocation.locationName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className='flex items-center gap-2'>
                {isSuperAdmin && !isOwnProfile && (
                  <>
                    {isEditing ? (
                      <div className='flex items-center gap-2'>
                        <button
                          onClick={() => setIsEditing(false)}
                          className='px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors'
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={isSaving}
                          className='px-4 py-2 rounded-lg text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-all hover:brightness-110 active:brightness-90'
                          style={{ backgroundColor: brandColor }}
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
                        className='px-3 py-2 rounded-lg border border-slate-200 transition-colors flex items-center gap-2 text-sm font-medium text-slate-600 hover:bg-slate-50'
                      >
                        <Edit className='w-4 h-4' style={{ color: brandColor }} />
                        <span className='hidden sm:inline'>Edit Profile</span>
                      </button>
                    )}
                  </>
                )}
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className='p-2 rounded-lg border border-slate-200 transition-colors hover:bg-slate-50'
                >
                  <RefreshCw
                    className={`w-4 h-4 text-slate-500 ${
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
            <div className='bg-white rounded-2xl border border-slate-200 p-5'>
              <div className='flex flex-col items-center text-center gap-3'>
                <div
                  className='rounded-lg w-10 h-10 flex items-center justify-center'
                  style={{ backgroundColor: brandColor }}
                >
                  <Coins className='w-5 h-5 text-white' />
                </div>
                <div>
                  <p
                    className='text-2xl font-semibold'
                    style={{ color: brandColor }}
                  >
                    {user.points || 0}
                  </p>
                  <p className='text-xs font-medium text-slate-500 mt-0.5'>
                    Current Points
                  </p>
                </div>
              </div>
            </div>

            {/* Active Rewards */}
            <div className='bg-white rounded-2xl border border-slate-200 p-5'>
              <div className='flex flex-col items-center text-center gap-3'>
                <div
                  className='rounded-lg w-10 h-10 flex items-center justify-center'
                  style={{ backgroundColor: brandColor }}
                >
                  <Gift className='w-5 h-5 text-white' />
                </div>
                <div>
                  <p
                    className='text-2xl font-semibold'
                    style={{ color: brandColor }}
                  >
                    {activeRewards.length}
                  </p>
                  <p className='text-xs font-medium text-slate-500 mt-0.5'>
                    Active Rewards
                  </p>
                </div>
              </div>
            </div>

            {/* Games Played */}
            <div className='bg-white rounded-2xl border border-slate-200 p-5'>
              <div className='flex flex-col items-center text-center gap-3'>
                <div
                  className='rounded-lg w-10 h-10 flex items-center justify-center'
                  style={{ backgroundColor: brandColor }}
                >
                  <Target className='w-5 h-5 text-white' />
                </div>
                <div>
                  <p
                    className='text-2xl font-semibold'
                    style={{ color: brandColor }}
                  >
                    {gameStats.totalGamesPlayed || gameStats.totalGames || 0}
                  </p>
                  <p className='text-xs font-medium text-slate-500 mt-0.5'>
                    Games Played
                  </p>
                </div>
              </div>
            </div>

            {/* Total Earned */}
            <div className='bg-white rounded-2xl border border-slate-200 p-5'>
              <div className='flex flex-col items-center text-center gap-3'>
                <div
                  className='rounded-lg w-10 h-10 flex items-center justify-center'
                  style={{ backgroundColor: brandColor }}
                >
                  <TrendingUp className='w-5 h-5 text-white' />
                </div>
                <div>
                  <p
                    className='text-2xl font-semibold'
                    style={{ color: brandColor }}
                  >
                    {pointsSummary.totalEarned || 0}
                  </p>
                  <p className='text-xs font-medium text-slate-500 mt-0.5'>
                    Total Earned
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <div className='grid grid-cols-1 lg:grid-cols-2 gap-5'>
            {/* Claimed Rewards Section */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className='bg-white rounded-2xl border border-slate-200 p-5'
            >
              <div className='flex items-center justify-between mb-5'>
                <div className='flex items-center gap-3'>
                  <div
                    className='p-2 rounded-lg'
                    style={{ backgroundColor: brandColor }}
                  >
                    <Gift className='w-4 h-4 text-white' />
                  </div>
                  <div>
                    <h2 className='text-base font-semibold text-slate-900'>
                      Claimed Rewards
                    </h2>
                    <p className='text-xs text-slate-500'>
                      Active, used, and recent expired
                    </p>
                  </div>
                </div>
                <span
                  className='px-2.5 py-0.5 rounded-md text-xs font-medium'
                  style={{ backgroundColor: brandColor + '14', color: brandColor }}
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
                      className='border border-slate-100 rounded-lg p-4 bg-white transition-colors'
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-3 min-w-0'>
                          <div
                            className='p-1.5 rounded-lg shrink-0'
                            style={{ backgroundColor: brandColor }}
                          >
                            <Gift className='w-3.5 h-3.5 text-white' />
                          </div>
                          <div className='min-w-0'>
                            <p className='text-sm font-medium text-slate-900 truncate'>
                              {reward.rewardSnapshot?.name ||
                                reward.rewardSnapshot?.winningItem?.title ||
                                reward.title}
                            </p>
                            <p className='text-xs text-slate-500 truncate'>
                              {reward.rewardSnapshot?.description ||
                                reward.rewardSnapshot?.winningItem?.description ||
                                reward.description}
                            </p>
                            <p className='text-xs text-slate-400 mt-0.5'>
                              Claimed: {formatDate(reward.claimedAt)}
                            </p>
                            {reward.expiresAt && (
                              <p className='text-xs text-slate-400'>
                                Expires: {formatDate(reward.expiresAt)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className='text-right shrink-0 ml-3'>
                          <div className='flex items-center gap-2 mb-1'>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${
                                statusLabel === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : statusLabel === 'Used'
                                  ? 'bg-slate-100 text-slate-600'
                                  : statusLabel === 'Pending'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-red-50 text-red-600'
                              }`}
                            >
                              {statusLabel}
                            </span>
                          </div>
                          <p
                            className='text-xs font-semibold'
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
                    <Gift className='w-10 h-10 text-slate-300 mx-auto mb-3' />
                    <p className='text-sm text-slate-500'>No claimed rewards yet</p>
                    <p className='text-xs text-slate-400 mt-1'>
                      Claim some rewards to see them here
                    </p>
                  </div>
                )}
              </div>

              {expiredRewards.length > 0 && (
                <div className='mt-5 pt-4 border-t border-slate-100'>
                  <h3 className='text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3'>
                    Recently Expired
                  </h3>
                  <div className='space-y-2'>
                    {expiredRewards.map((reward) => (
                      <div
                        key={reward._id}
                        className='flex items-center justify-between text-sm text-slate-500'
                      >
                        <span className='truncate text-xs'>
                          {reward.rewardSnapshot?.name ||
                            reward.rewardSnapshot?.winningItem?.title ||
                            reward.title}
                        </span>
                        <span className='text-xs text-slate-400 shrink-0 ml-2'>
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
              className='bg-white rounded-2xl border border-slate-200 p-5'
            >
              <div className='flex items-center justify-between mb-5'>
                <div className='flex items-center gap-3'>
                  <div
                    className='p-2 rounded-lg'
                    style={{ backgroundColor: brandColor }}
                  >
                    <Activity className='w-4 h-4 text-white' />
                  </div>
                  <div>
                    <h2 className='text-base font-semibold text-slate-900'>
                      Recent Activity
                    </h2>
                    <p className='text-xs text-slate-500'>
                      Latest point transactions
                    </p>
                  </div>
                </div>
              </div>

              <div className='space-y-2 max-h-96 overflow-y-auto'>
                {recentActivity.length > 0 ? (
                  recentActivity.map((transaction) => (
                    <motion.div
                      key={transaction._id}
                      whileHover={{ scale: 1.02 }}
                      className={`border rounded-lg p-4 transition-colors ${getActivityColor(
                        transaction.type,
                        transaction.points
                      )}`}
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-3 min-w-0'>
                          <div className='shrink-0'>
                            {getActivityIcon(transaction.type)}
                          </div>
                          <div className='min-w-0'>
                            <p className='text-sm font-medium text-slate-900 truncate'>
                              {transaction.description}
                            </p>
                            <p className='text-xs text-slate-500 capitalize'>
                              {transaction.type.replace('_', ' ')}
                            </p>
                            <p className='text-xs text-slate-400'>
                              {formatDate(transaction.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className='text-right shrink-0 ml-3'>
                          <p
                            className={`text-base font-semibold ${
                              transaction.points > 0
                                ? 'text-emerald-600'
                                : 'text-red-500'
                            }`}
                          >
                            {transaction.points > 0 ? '+' : ''}
                            {transaction.points}
                          </p>
                          <p className='text-xs text-slate-400'>
                            Bal: {transaction.balance || 0}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className='text-center py-8'>
                    <Activity className='w-10 h-10 text-slate-300 mx-auto mb-3' />
                    <p className='text-sm text-slate-500'>No recent activity</p>
                    <p className='text-xs text-slate-400 mt-1'>
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
              className='bg-white rounded-2xl border border-slate-200 p-5'
            >
              <div className='flex items-center gap-3 mb-5'>
                <div
                  className='p-2 rounded-lg'
                  style={{ backgroundColor: brandColor }}
                >
                  <Trophy className='w-4 h-4 text-white' />
                </div>
                <div>
                  <h2 className='text-base font-semibold text-slate-900'>
                    Game Statistics
                  </h2>
                  <p className='text-xs text-slate-500'>
                    Your gaming achievements
                  </p>
                </div>
              </div>

              <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
            <div
              className='rounded-lg p-4 text-center border border-slate-100 bg-white'
            >
              <Trophy
                className='w-6 h-6 mx-auto mb-2'
                style={{ color: brandColor }}
              />
              <p className='text-xl font-semibold' style={{ color: brandColor }}>
                {gameStats.totalGamesPlayed || gameStats.totalGames || 0}
              </p>
              <p className='text-xs text-slate-500 mt-0.5'>Total Games</p>
            </div>
                <div
                  className='rounded-lg p-4 text-center border border-slate-100 bg-white'
                >
                  <Sparkles
                    className='w-6 h-6 mx-auto mb-2'
                    style={{ color: brandColor }}
                  />
              <p className='text-xl font-semibold' style={{ color: brandColor }}>
                {gameStats.scratchGames || 0}
              </p>
                  <p className='text-xs text-slate-500 mt-0.5'>Scratch Cards</p>
                </div>
                <div
                  className='rounded-lg p-4 text-center border border-slate-100 bg-white'
                >
                  <Target
                    className='w-6 h-6 mx-auto mb-2'
                    style={{ color: brandColor }}
                  />
              <p className='text-xl font-semibold' style={{ color: brandColor }}>
                {gameStats.spinGames || 0}
              </p>
                  <p className='text-xs text-slate-500 mt-0.5'>Spin Wheels</p>
                </div>
                <div
                  className='rounded-lg p-4 text-center border border-slate-100 bg-white'
                >
                  <Zap
                    className='w-6 h-6 mx-auto mb-2'
                    style={{ color: brandColor }}
                  />
              <p className='text-xl font-semibold' style={{ color: brandColor }}>
                {gameStats.totalPointsEarned || gameStats.totalPointsWon || 0}
              </p>
                  <p className='text-xs text-slate-500 mt-0.5'>Points Won</p>
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
