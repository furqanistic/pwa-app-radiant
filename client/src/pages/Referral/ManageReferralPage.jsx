// File: client/src/pages/Referral/ManageReferralPage.jsx
import {
  useAllReferrals,
  useAwardMilestoneReward,
  useCompleteReferral,
  useReferralConfig,
  useReferralLeaderboard,
  useUpdateReferralConfig,
} from '@/hooks/useReferral'
import { motion } from 'framer-motion'
import {
  Award,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crown,
  Edit3,
  Eye,
  Filter,
  Gift,
  Heart,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  Star,
  Target,
  Trophy,
  Users,
  X,
  Zap,
} from 'lucide-react'
import React, { useState } from 'react'
import Layout from '../Layout/Layout'

// Loading Component
const LoadingState = () => (
  <Layout>
    <div className='min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50'>
      <div className='max-w-7xl mx-auto px-4 lg:px-6 py-4 lg:py-8'>
        <div className='flex items-center justify-center min-h-[60vh]'>
          <div className='text-center'>
            <div className='w-16 h-16 bg-gradient-to-r from-rose-300 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse'>
              <Settings className='w-8 h-8 text-white' />
            </div>
            <Loader2 className='w-5 h-5 text-rose-400 animate-spin mx-auto mb-2' />
            <p className='text-rose-600 font-medium text-sm'>
              Loading management dashboard...
            </p>
          </div>
        </div>
      </div>
    </div>
  </Layout>
)

// Main Management Component
const ManageReferralPage = () => {
  // State management
  const [activeTab, setActiveTab] = useState('overview')
  const [referralFilters, setReferralFilters] = useState({
    page: 1,
    limit: 20,
    status: '',
    rewardType: '',
    startDate: '',
    endDate: '',
  })
  const [selectedReferral, setSelectedReferral] = useState(null)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [showMilestoneModal, setShowMilestoneModal] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [completionNotes, setCompletionNotes] = useState('')
  const [milestoneData, setMilestoneData] = useState({
    userId: '',
    milestone: '',
    purchaseAmount: 0,
  })

  // Fetch data
  const {
    data: referralsData,
    isLoading: referralsLoading,
    refetch: refetchReferrals,
  } = useAllReferrals(referralFilters)

  const { data: leaderboardData, isLoading: leaderboardLoading } =
    useReferralLeaderboard({ period: 'month', limit: 10 })

  const { data: configData, isLoading: configLoading } = useReferralConfig()

  // Mutations
  const completeReferralMutation = useCompleteReferral({
    onSuccess: () => {
      setShowCompleteModal(false)
      setSelectedReferral(null)
      setCompletionNotes('')
      refetchReferrals()
    },
  })

  const awardMilestoneMutation = useAwardMilestoneReward({
    onSuccess: () => {
      setShowMilestoneModal(false)
      setMilestoneData({ userId: '', milestone: '', purchaseAmount: 0 })
      refetchReferrals()
    },
  })

  const updateConfigMutation = useUpdateReferralConfig({
    onSuccess: () => {
      setShowConfigModal(false)
    },
  })

  // Loading state
  if (referralsLoading || leaderboardLoading || configLoading) {
    return <LoadingState />
  }

  // Helper functions
  const handleCompleteReferral = (referral) => {
    setSelectedReferral(referral)
    setShowCompleteModal(true)
  }

  const handleConfirmComplete = () => {
    if (selectedReferral) {
      completeReferralMutation.mutate({
        referralId: selectedReferral._id,
        notes: completionNotes,
      })
    }
  }

  const handleAwardMilestone = () => {
    awardMilestoneMutation.mutate(milestoneData)
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      completed: 'bg-green-100 text-green-700 border-green-200',
      expired: 'bg-red-100 text-red-700 border-red-200',
      cancelled: 'bg-gray-100 text-gray-700 border-gray-200',
    }
    return colors[status] || colors.pending
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Calculate overview stats
  const overviewStats = referralsData?.stats || []
  const totalReferrals = overviewStats.reduce(
    (sum, stat) => sum + stat.count,
    0
  )
  const totalRewards = overviewStats.reduce(
    (sum, stat) => sum + stat.totalRewards,
    0
  )

  return (
    <Layout>
      <div className='min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50'>
        {/* Background Elements */}
        <div className='fixed inset-0 overflow-hidden pointer-events-none'>
          <div className='absolute top-10 left-5 w-20 h-20 lg:w-32 lg:h-32 bg-rose-200/20 rounded-full blur-2xl animate-pulse' />
          <div
            className='absolute bottom-10 right-5 w-24 h-24 lg:w-40 lg:h-40 bg-pink-200/15 rounded-full blur-2xl animate-pulse'
            style={{ animationDelay: '1s' }}
          />
        </div>

        <div className='relative z-10 max-w-7xl mx-auto px-4 lg:px-6 py-4 lg:py-8 space-y-6'>
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className='text-center space-y-3'
          >
            <div className='flex items-center justify-center gap-3 mb-4'>
              <h1 className='text-2xl lg:text-4xl font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 bg-clip-text text-transparent'>
                Referral Management
              </h1>
            </div>
            <p className='text-purple-600 text-sm lg:text-lg font-medium max-w-2xl mx-auto'>
              Manage all referrals, rewards, and configuration ✨
            </p>
          </motion.div>

          {/* Tabs */}
          <div className='flex flex-wrap gap-2 justify-center'>
            {[
              { id: 'overview', label: 'Overview', icon: Target },
              { id: 'referrals', label: 'All Referrals', icon: Users },
              { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
              { id: 'config', label: 'Configuration', icon: Settings },
            ].map((tab) => (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-rose-400 to-pink-500 text-white'
                    : 'bg-white/70 text-gray-700 hover:bg-white/90'
                }`}
              >
                <tab.icon className='w-4 h-4' />
                <span className='text-sm lg:text-base'>{tab.label}</span>
              </motion.button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className='space-y-6'
            >
              {/* Quick Stats */}
              <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
                <div className='bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/60'>
                  <div className='flex items-center gap-3 mb-2'>
                    <div className='w-10 h-10 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center'>
                      <Users className='w-5 h-5 text-white' />
                    </div>
                    <div>
                      <div className='text-2xl font-bold text-gray-800'>
                        {totalReferrals}
                      </div>
                      <div className='text-xs text-purple-600'>
                        Total Referrals
                      </div>
                    </div>
                  </div>
                </div>

                <div className='bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/60'>
                  <div className='flex items-center gap-3 mb-2'>
                    <div className='w-10 h-10 bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl flex items-center justify-center'>
                      <Trophy className='w-5 h-5 text-white' />
                    </div>
                    <div>
                      <div className='text-2xl font-bold text-gray-800'>
                        ${totalRewards}
                      </div>
                      <div className='text-xs text-purple-600'>
                        Total Rewards
                      </div>
                    </div>
                  </div>
                </div>

                <div className='bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/60'>
                  <div className='flex items-center gap-3 mb-2'>
                    <div className='w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center'>
                      <Clock className='w-5 h-5 text-white' />
                    </div>
                    <div>
                      <div className='text-2xl font-bold text-gray-800'>
                        {overviewStats.find((s) => s._id === 'pending')
                          ?.count || 0}
                      </div>
                      <div className='text-xs text-purple-600'>Pending</div>
                    </div>
                  </div>
                </div>

                <div className='bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/60'>
                  <div className='flex items-center gap-3 mb-2'>
                    <div className='w-10 h-10 bg-gradient-to-r from-rose-400 to-pink-500 rounded-xl flex items-center justify-center'>
                      <Check className='w-5 h-5 text-white' />
                    </div>
                    <div>
                      <div className='text-2xl font-bold text-gray-800'>
                        {overviewStats.find((s) => s._id === 'completed')
                          ?.count || 0}
                      </div>
                      <div className='text-xs text-purple-600'>Completed</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className='bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/60'>
                <h3 className='text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2'>
                  <Zap className='w-5 h-5 text-pink-500' />
                  Quick Actions
                </h3>
                <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowMilestoneModal(true)}
                    className='flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 hover:from-purple-100 hover:to-pink-100 transition-all'
                  >
                    <Gift className='w-6 h-6 text-purple-500' />
                    <div className='text-left'>
                      <div className='font-semibold text-gray-800'>
                        Award Milestone
                      </div>
                      <div className='text-sm text-purple-600'>
                        Give milestone rewards to users
                      </div>
                    </div>
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowConfigModal(true)}
                    className='flex items-center gap-3 p-4 bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl border border-rose-200 hover:from-rose-100 hover:to-pink-100 transition-all'
                  >
                    <Settings className='w-6 h-6 text-rose-500' />
                    <div className='text-left'>
                      <div className='font-semibold text-gray-800'>
                        Edit Configuration
                      </div>
                      <div className='text-sm text-purple-600'>
                        Modify referral settings
                      </div>
                    </div>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Referrals Tab */}
          {activeTab === 'referrals' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className='space-y-6'
            >
              {/* Filters */}
              <div className='bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/60'>
                <div className='grid grid-cols-1 lg:grid-cols-5 gap-4'>
                  <select
                    value={referralFilters.status}
                    onChange={(e) =>
                      setReferralFilters((prev) => ({
                        ...prev,
                        status: e.target.value,
                        page: 1,
                      }))
                    }
                    className='px-3 py-2 bg-white rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300'
                  >
                    <option value=''>All Status</option>
                    <option value='pending'>Pending</option>
                    <option value='completed'>Completed</option>
                    <option value='expired'>Expired</option>
                    <option value='cancelled'>Cancelled</option>
                  </select>

                  <select
                    value={referralFilters.rewardType}
                    onChange={(e) =>
                      setReferralFilters((prev) => ({
                        ...prev,
                        rewardType: e.target.value,
                        page: 1,
                      }))
                    }
                    className='px-3 py-2 bg-white rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300'
                  >
                    <option value=''>All Types</option>
                    <option value='signup'>Signup</option>
                    <option value='first_purchase'>First Purchase</option>
                    <option value='milestone'>Milestone</option>
                  </select>

                  <input
                    type='date'
                    value={referralFilters.startDate}
                    onChange={(e) =>
                      setReferralFilters((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                        page: 1,
                      }))
                    }
                    className='px-3 py-2 bg-white rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300'
                    placeholder='Start Date'
                  />

                  <input
                    type='date'
                    value={referralFilters.endDate}
                    onChange={(e) =>
                      setReferralFilters((prev) => ({
                        ...prev,
                        endDate: e.target.value,
                        page: 1,
                      }))
                    }
                    className='px-3 py-2 bg-white rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300'
                    placeholder='End Date'
                  />

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => refetchReferrals()}
                    className='flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-400 to-pink-500 text-white rounded-lg font-medium hover:from-rose-500 hover:to-pink-600 transition-all'
                  >
                    <RefreshCw className='w-4 h-4' />
                    Refresh
                  </motion.button>
                </div>
              </div>

              {/* Referrals Table */}
              <div className='bg-white/70 backdrop-blur-sm rounded-xl border border-white/60 overflow-hidden'>
                <div className='overflow-x-auto'>
                  <table className='w-full'>
                    <thead className='bg-gradient-to-r from-purple-50 to-pink-50'>
                      <tr>
                        <th className='px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider'>
                          Referrer
                        </th>
                        <th className='px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider'>
                          Referred
                        </th>
                        <th className='px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider'>
                          Type
                        </th>
                        <th className='px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider'>
                          Status
                        </th>
                        <th className='px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider'>
                          Rewards
                        </th>
                        <th className='px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider'>
                          Date
                        </th>
                        <th className='px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider'>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-100'>
                      {referralsData?.referrals?.map((referral) => (
                        <tr key={referral._id} className='hover:bg-rose-50/50'>
                          <td className='px-4 py-3'>
                            <div>
                              <div className='font-medium text-gray-800'>
                                {referral.referrer?.name}
                              </div>
                              <div className='text-sm text-gray-500'>
                                {referral.referrer?.email}
                              </div>
                            </div>
                          </td>
                          <td className='px-4 py-3'>
                            <div>
                              <div className='font-medium text-gray-800'>
                                {referral.referred?.name}
                              </div>
                              <div className='text-sm text-gray-500'>
                                {referral.referred?.email}
                              </div>
                            </div>
                          </td>
                          <td className='px-4 py-3'>
                            <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700'>
                              {referral.rewardType}
                            </span>
                          </td>
                          <td className='px-4 py-3'>
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                referral.status
                              )}`}
                            >
                              {referral.status}
                            </span>
                          </td>
                          <td className='px-4 py-3'>
                            <div className='text-sm'>
                              <div className='text-green-600 font-medium'>
                                Referrer: $
                                {referral.referrerReward?.points || 0}
                              </div>
                              <div className='text-blue-600'>
                                Referred: $
                                {referral.referredReward?.points || 0}
                              </div>
                            </div>
                          </td>
                          <td className='px-4 py-3 text-sm text-gray-500'>
                            {formatDate(referral.createdAt)}
                          </td>
                          <td className='px-4 py-3'>
                            {referral.status === 'pending' && (
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleCompleteReferral(referral)}
                                className='inline-flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition-all'
                                disabled={completeReferralMutation.isPending}
                              >
                                <Check className='w-3 h-3' />
                                Complete
                              </motion.button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {referralsData?.pagination && (
                  <div className='px-4 py-3 border-t border-gray-100 flex items-center justify-between'>
                    <div className='text-sm text-gray-500'>
                      Showing {referralsData.pagination.currentPage} of{' '}
                      {referralsData.pagination.totalPages} pages
                    </div>
                    <div className='flex items-center gap-2'>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          setReferralFilters((prev) => ({
                            ...prev,
                            page: Math.max(1, prev.page - 1),
                          }))
                        }
                        disabled={referralsData.pagination.currentPage === 1}
                        className='p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed'
                      >
                        <ChevronLeft className='w-4 h-4' />
                      </motion.button>
                      <span className='px-3 py-1 bg-gradient-to-r from-rose-100 to-pink-100 rounded-lg text-sm font-medium text-gray-700'>
                        {referralsData.pagination.currentPage}
                      </span>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          setReferralFilters((prev) => ({
                            ...prev,
                            page: Math.min(
                              referralsData.pagination.totalPages,
                              prev.page + 1
                            ),
                          }))
                        }
                        disabled={
                          referralsData.pagination.currentPage ===
                          referralsData.pagination.totalPages
                        }
                        className='p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed'
                      >
                        <ChevronRight className='w-4 h-4' />
                      </motion.button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Leaderboard Tab */}
          {activeTab === 'leaderboard' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className='space-y-6'
            >
              <div className='bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/60'>
                <h3 className='text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2'>
                  <Trophy className='w-6 h-6 text-amber-500' />
                  Top Referrers - This Month
                </h3>
                <div className='grid gap-4'>
                  {leaderboardData?.leaderboard?.map((user, index) => (
                    <div
                      key={user.userId}
                      className='flex items-center justify-between p-4 bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl border border-rose-200'
                    >
                      <div className='flex items-center gap-4'>
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white ${
                            index === 0
                              ? 'bg-gradient-to-r from-amber-400 to-yellow-500'
                              : index === 1
                              ? 'bg-gradient-to-r from-gray-400 to-gray-500'
                              : index === 2
                              ? 'bg-gradient-to-r from-orange-400 to-red-500'
                              : 'bg-gradient-to-r from-purple-400 to-pink-500'
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div>
                          <div className='font-semibold text-gray-800'>
                            {user.name}
                          </div>
                          <div className='text-sm text-purple-600'>
                            {user.email}
                          </div>
                          <div className='text-xs text-gray-500'>
                            Code: {user.referralCode}
                          </div>
                        </div>
                      </div>
                      <div className='text-right'>
                        <div className='font-semibold text-gray-800'>
                          {user.totalReferrals} referrals
                        </div>
                        <div className='text-sm text-green-600'>
                          ${user.totalPointsEarned} earned
                        </div>
                        <div className='text-xs text-purple-500 capitalize'>
                          {user.currentTier} tier
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Configuration Tab */}
          {activeTab === 'config' && configData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className='space-y-6'
            >
              <div className='bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/60'>
                <div className='flex items-center justify-between mb-6'>
                  <h3 className='text-xl font-semibold text-gray-800 flex items-center gap-2'>
                    <Settings className='w-6 h-6 text-purple-500' />
                    Referral Configuration
                  </h3>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowConfigModal(true)}
                    className='flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all'
                  >
                    <Edit3 className='w-4 h-4' />
                    Edit Config
                  </motion.button>
                </div>

                <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                  {/* Signup Rewards */}
                  <div className='p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200'>
                    <h4 className='font-semibold text-gray-800 mb-3 flex items-center gap-2'>
                      <Users className='w-5 h-5 text-blue-500' />
                      Signup Rewards
                    </h4>
                    <div className='space-y-2 text-sm'>
                      <div className='flex justify-between'>
                        <span>Status:</span>
                        <span
                          className={`font-medium ${
                            configData.signupReward?.enabled
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {configData.signupReward?.enabled
                            ? 'Enabled'
                            : 'Disabled'}
                        </span>
                      </div>
                      <div className='flex justify-between'>
                        <span>Referrer Points:</span>
                        <span className='font-medium'>
                          {configData.signupReward?.referrerPoints || 0}
                        </span>
                      </div>
                      <div className='flex justify-between'>
                        <span>Referred Points:</span>
                        <span className='font-medium'>
                          {configData.signupReward?.referredPoints || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* First Purchase Rewards */}
                  <div className='p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200'>
                    <h4 className='font-semibold text-gray-800 mb-3 flex items-center gap-2'>
                      <Gift className='w-5 h-5 text-green-500' />
                      First Purchase Rewards
                    </h4>
                    <div className='space-y-2 text-sm'>
                      <div className='flex justify-between'>
                        <span>Status:</span>
                        <span
                          className={`font-medium ${
                            configData.firstPurchaseReward?.enabled
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {configData.firstPurchaseReward?.enabled
                            ? 'Enabled'
                            : 'Disabled'}
                        </span>
                      </div>
                      <div className='flex justify-between'>
                        <span>Referrer Points:</span>
                        <span className='font-medium'>
                          {configData.firstPurchaseReward?.referrerPoints || 0}
                        </span>
                      </div>
                      <div className='flex justify-between'>
                        <span>Referred Points:</span>
                        <span className='font-medium'>
                          {configData.firstPurchaseReward?.referredPoints || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tier Multipliers */}
                  <div className='p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border border-yellow-200'>
                    <h4 className='font-semibold text-gray-800 mb-3 flex items-center gap-2'>
                      <Crown className='w-5 h-5 text-yellow-500' />
                      Tier Multipliers
                    </h4>
                    <div className='space-y-2 text-sm'>
                      <div className='flex justify-between items-center'>
                        <span className='flex items-center gap-2'>
                          <Star className='w-4 h-4 text-rose-500' />
                          Bronze:
                        </span>
                        <span className='font-medium'>
                          {configData.tierMultipliers?.bronze || 1.0}x
                        </span>
                      </div>
                      <div className='flex justify-between items-center'>
                        <span className='flex items-center gap-2'>
                          <Crown className='w-4 h-4 text-yellow-500' />
                          Gold:
                        </span>
                        <span className='font-medium'>
                          {configData.tierMultipliers?.gold || 1.5}x
                        </span>
                      </div>
                      <div className='flex justify-between items-center'>
                        <span className='flex items-center gap-2'>
                          <Award className='w-4 h-4 text-purple-500' />
                          Platinum:
                        </span>
                        <span className='font-medium'>
                          {configData.tierMultipliers?.platinum || 2.0}x
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* General Settings */}
                  <div className='p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200'>
                    <h4 className='font-semibold text-gray-800 mb-3 flex items-center gap-2'>
                      <Settings className='w-5 h-5 text-purple-500' />
                      General Settings
                    </h4>
                    <div className='space-y-2 text-sm'>
                      <div className='flex justify-between'>
                        <span>Code Expiry:</span>
                        <span className='font-medium'>
                          {configData.settings?.codeExpiryDays || 30} days
                        </span>
                      </div>
                      <div className='flex justify-between'>
                        <span>Max Referrals:</span>
                        <span className='font-medium'>
                          {configData.settings?.maxReferralsPerUser || 100}
                        </span>
                      </div>
                      <div className='flex justify-between'>
                        <span>Auto Approve:</span>
                        <span
                          className={`font-medium ${
                            configData.settings?.autoApprove
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {configData.settings?.autoApprove ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Complete Referral Modal */}
        {showCompleteModal && selectedReferral && (
          <div className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50'>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className='bg-white rounded-2xl p-6 max-w-md w-full'
            >
              <div className='flex items-center justify-between mb-4'>
                <h3 className='text-lg font-semibold text-gray-800'>
                  Complete Referral
                </h3>
                <button
                  onClick={() => setShowCompleteModal(false)}
                  className='p-2 hover:bg-gray-100 rounded-lg'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>

              <div className='space-y-4'>
                <div className='p-4 bg-gray-50 rounded-lg'>
                  <div className='text-sm'>
                    <div>
                      <strong>Referrer:</strong>{' '}
                      {selectedReferral.referrer?.name}
                    </div>
                    <div>
                      <strong>Referred:</strong>{' '}
                      {selectedReferral.referred?.name}
                    </div>
                    <div>
                      <strong>Rewards:</strong> $
                      {selectedReferral.referrerReward?.points || 0} / $
                      {selectedReferral.referredReward?.points || 0}
                    </div>
                  </div>
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Notes (Optional)
                  </label>
                  <textarea
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300'
                    rows='3'
                    placeholder='Add any completion notes...'
                  />
                </div>

                <div className='flex gap-3'>
                  <button
                    onClick={() => setShowCompleteModal(false)}
                    className='flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50'
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleConfirmComplete}
                    disabled={completeReferralMutation.isPending}
                    className='flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 flex items-center justify-center gap-2'
                  >
                    {completeReferralMutation.isPending ? (
                      <Loader2 className='w-4 h-4 animate-spin' />
                    ) : (
                      <Check className='w-4 h-4' />
                    )}
                    Complete
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Award Milestone Modal */}
        {showMilestoneModal && (
          <div className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50'>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className='bg-white rounded-2xl p-6 max-w-md w-full'
            >
              <div className='flex items-center justify-between mb-4'>
                <h3 className='text-lg font-semibold text-gray-800'>
                  Award Milestone Reward
                </h3>
                <button
                  onClick={() => setShowMilestoneModal(false)}
                  className='p-2 hover:bg-gray-100 rounded-lg'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>

              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    User ID
                  </label>
                  <input
                    type='text'
                    value={milestoneData.userId}
                    onChange={(e) =>
                      setMilestoneData((prev) => ({
                        ...prev,
                        userId: e.target.value,
                      }))
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300'
                    placeholder='Enter user ID'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Milestone
                  </label>
                  <select
                    value={milestoneData.milestone}
                    onChange={(e) =>
                      setMilestoneData((prev) => ({
                        ...prev,
                        milestone: e.target.value,
                      }))
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300'
                  >
                    <option value=''>Select milestone</option>
                    <option value='first_booking'>First Booking</option>
                    <option value='loyalty_member'>Loyalty Member</option>
                    <option value='premium_upgrade'>Premium Upgrade</option>
                  </select>
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Purchase Amount (Optional)
                  </label>
                  <input
                    type='number'
                    value={milestoneData.purchaseAmount}
                    onChange={(e) =>
                      setMilestoneData((prev) => ({
                        ...prev,
                        purchaseAmount: Number(e.target.value),
                      }))
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300'
                    placeholder='0'
                    min='0'
                  />
                </div>

                <div className='flex gap-3'>
                  <button
                    onClick={() => setShowMilestoneModal(false)}
                    className='flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50'
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAwardMilestone}
                    disabled={
                      awardMilestoneMutation.isPending ||
                      !milestoneData.userId ||
                      !milestoneData.milestone
                    }
                    className='flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 flex items-center justify-center gap-2'
                  >
                    {awardMilestoneMutation.isPending ? (
                      <Loader2 className='w-4 h-4 animate-spin' />
                    ) : (
                      <Gift className='w-4 h-4' />
                    )}
                    Award
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Configuration Edit Modal */}
        {showConfigModal && configData && (
          <div className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50'>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className='bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto'
            >
              <div className='flex items-center justify-between mb-6'>
                <h3 className='text-xl font-semibold text-gray-800 flex items-center gap-2'>
                  <Settings className='w-6 h-6 text-purple-500' />
                  Edit Referral Configuration
                </h3>
                <button
                  onClick={() => setShowConfigModal(false)}
                  className='p-2 hover:bg-gray-100 rounded-lg'
                >
                  <X className='w-6 h-6' />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const formData = new FormData(e.target)
                  const configUpdate = {
                    signupReward: {
                      enabled: formData.get('signupEnabled') === 'on',
                      referrerPoints:
                        parseInt(formData.get('signupReferrerPoints')) || 0,
                      referredPoints:
                        parseInt(formData.get('signupReferredPoints')) || 0,
                      description: formData.get('signupDescription') || '',
                    },
                    firstPurchaseReward: {
                      enabled: formData.get('purchaseEnabled') === 'on',
                      referrerPoints:
                        parseInt(formData.get('purchaseReferrerPoints')) || 0,
                      referredPoints:
                        parseInt(formData.get('purchaseReferredPoints')) || 0,
                      description: formData.get('purchaseDescription') || '',
                    },
                    tierMultipliers: {
                      bronze:
                        parseFloat(formData.get('bronzeMultiplier')) || 1.0,
                      gold: parseFloat(formData.get('goldMultiplier')) || 1.5,
                      platinum:
                        parseFloat(formData.get('platinumMultiplier')) || 2.0,
                    },
                    settings: {
                      codeExpiryDays:
                        parseInt(formData.get('codeExpiryDays')) || 30,
                      maxReferralsPerUser:
                        parseInt(formData.get('maxReferralsPerUser')) || 100,
                      minCashoutPoints:
                        parseInt(formData.get('minCashoutPoints')) || 1000,
                      autoApprove: formData.get('autoApprove') === 'on',
                      allowSelfReferral:
                        formData.get('allowSelfReferral') === 'on',
                      codeLength: parseInt(formData.get('codeLength')) || 6,
                      emailNotifications:
                        formData.get('emailNotifications') === 'on',
                    },
                  }
                  updateConfigMutation.mutate(configUpdate)
                }}
                className='space-y-6'
              >
                {/* Signup Rewards Section */}
                <div className='p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200'>
                  <h4 className='text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2'>
                    <Users className='w-5 h-5 text-blue-500' />
                    Signup Rewards
                  </h4>
                  <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
                    <div className='flex items-center gap-3'>
                      <input
                        type='checkbox'
                        name='signupEnabled'
                        defaultChecked={configData.signupReward?.enabled}
                        className='w-4 h-4 text-blue-600 rounded focus:ring-blue-500'
                      />
                      <label className='text-sm font-medium text-gray-700'>
                        Enable Signup Rewards
                      </label>
                    </div>
                    <div></div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>
                        Referrer Points
                      </label>
                      <input
                        type='number'
                        name='signupReferrerPoints'
                        defaultValue={
                          configData.signupReward?.referrerPoints || 0
                        }
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300'
                        min='0'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>
                        Referred Points
                      </label>
                      <input
                        type='number'
                        name='signupReferredPoints'
                        defaultValue={
                          configData.signupReward?.referredPoints || 0
                        }
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300'
                        min='0'
                      />
                    </div>
                    <div className='lg:col-span-2'>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>
                        Description
                      </label>
                      <input
                        type='text'
                        name='signupDescription'
                        defaultValue={
                          configData.signupReward?.description || ''
                        }
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300'
                        placeholder='Reward description'
                      />
                    </div>
                  </div>
                </div>

                {/* First Purchase Rewards Section */}
                <div className='p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200'>
                  <h4 className='text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2'>
                    <Gift className='w-5 h-5 text-green-500' />
                    First Purchase Rewards
                  </h4>
                  <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
                    <div className='flex items-center gap-3'>
                      <input
                        type='checkbox'
                        name='purchaseEnabled'
                        defaultChecked={configData.firstPurchaseReward?.enabled}
                        className='w-4 h-4 text-green-600 rounded focus:ring-green-500'
                      />
                      <label className='text-sm font-medium text-gray-700'>
                        Enable Purchase Rewards
                      </label>
                    </div>
                    <div></div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>
                        Referrer Points
                      </label>
                      <input
                        type='number'
                        name='purchaseReferrerPoints'
                        defaultValue={
                          configData.firstPurchaseReward?.referrerPoints || 0
                        }
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300'
                        min='0'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>
                        Referred Points
                      </label>
                      <input
                        type='number'
                        name='purchaseReferredPoints'
                        defaultValue={
                          configData.firstPurchaseReward?.referredPoints || 0
                        }
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300'
                        min='0'
                      />
                    </div>
                    <div className='lg:col-span-2'>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>
                        Description
                      </label>
                      <input
                        type='text'
                        name='purchaseDescription'
                        defaultValue={
                          configData.firstPurchaseReward?.description || ''
                        }
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300'
                        placeholder='Reward description'
                      />
                    </div>
                  </div>
                </div>

                {/* Tier Multipliers Section */}
                <div className='p-6 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border border-yellow-200'>
                  <h4 className='text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2'>
                    <Crown className='w-5 h-5 text-yellow-500' />
                    Tier Multipliers
                  </h4>
                  <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2'>
                        <Star className='w-4 h-4 text-rose-500' />
                        Bronze Multiplier
                      </label>
                      <input
                        type='number'
                        name='bronzeMultiplier'
                        defaultValue={configData.tierMultipliers?.bronze || 1.0}
                        step='0.1'
                        min='0.1'
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-300'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2'>
                        <Crown className='w-4 h-4 text-yellow-500' />
                        Gold Multiplier
                      </label>
                      <input
                        type='number'
                        name='goldMultiplier'
                        defaultValue={configData.tierMultipliers?.gold || 1.5}
                        step='0.1'
                        min='0.1'
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-300'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2'>
                        <Award className='w-4 h-4 text-purple-500' />
                        Platinum Multiplier
                      </label>
                      <input
                        type='number'
                        name='platinumMultiplier'
                        defaultValue={
                          configData.tierMultipliers?.platinum || 2.0
                        }
                        step='0.1'
                        min='0.1'
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-300'
                      />
                    </div>
                  </div>
                </div>

                {/* General Settings Section */}
                <div className='p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200'>
                  <h4 className='text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2'>
                    <Settings className='w-5 h-5 text-purple-500' />
                    General Settings
                  </h4>
                  <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>
                        Code Expiry (Days)
                      </label>
                      <input
                        type='number'
                        name='codeExpiryDays'
                        defaultValue={configData.settings?.codeExpiryDays || 30}
                        min='1'
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>
                        Max Referrals per User
                      </label>
                      <input
                        type='number'
                        name='maxReferralsPerUser'
                        defaultValue={
                          configData.settings?.maxReferralsPerUser || 100
                        }
                        min='1'
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>
                        Min Cashout Points
                      </label>
                      <input
                        type='number'
                        name='minCashoutPoints'
                        defaultValue={
                          configData.settings?.minCashoutPoints || 1000
                        }
                        min='0'
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>
                        Referral Code Length
                      </label>
                      <input
                        type='number'
                        name='codeLength'
                        defaultValue={configData.settings?.codeLength || 6}
                        min='4'
                        max='12'
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300'
                      />
                    </div>

                    {/* Checkboxes for boolean settings */}
                    <div className='lg:col-span-2 grid grid-cols-1 lg:grid-cols-3 gap-4 pt-4 border-t border-purple-200'>
                      <div className='flex items-center gap-3'>
                        <input
                          type='checkbox'
                          name='autoApprove'
                          defaultChecked={configData.settings?.autoApprove}
                          className='w-4 h-4 text-purple-600 rounded focus:ring-purple-500'
                        />
                        <label className='text-sm font-medium text-gray-700'>
                          Auto Approve Referrals
                        </label>
                      </div>
                      <div className='flex items-center gap-3'>
                        <input
                          type='checkbox'
                          name='allowSelfReferral'
                          defaultChecked={
                            configData.settings?.allowSelfReferral
                          }
                          className='w-4 h-4 text-purple-600 rounded focus:ring-purple-500'
                        />
                        <label className='text-sm font-medium text-gray-700'>
                          Allow Self Referral
                        </label>
                      </div>
                      <div className='flex items-center gap-3'>
                        <input
                          type='checkbox'
                          name='emailNotifications'
                          defaultChecked={
                            configData.settings?.emailNotifications
                          }
                          className='w-4 h-4 text-purple-600 rounded focus:ring-purple-500'
                        />
                        <label className='text-sm font-medium text-gray-700'>
                          Email Notifications
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className='flex gap-4 pt-6 border-t border-gray-200'>
                  <button
                    type='button'
                    onClick={() => setShowConfigModal(false)}
                    className='flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium'
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    type='submit'
                    disabled={updateConfigMutation.isPending}
                    className='flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 flex items-center justify-center gap-2 font-medium'
                  >
                    {updateConfigMutation.isPending ? (
                      <Loader2 className='w-5 h-5 animate-spin' />
                    ) : (
                      <Save className='w-5 h-5' />
                    )}
                    Save Configuration
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default ManageReferralPage
