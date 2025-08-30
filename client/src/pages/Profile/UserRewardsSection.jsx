// File: client/src/components/Profile/UserRewardsSection.jsx

import {
  useUserManualRewards,
  useUserRewards,
  useUserRewardStats,
} from '@/hooks/useRewards'
import { motion } from 'framer-motion'
import {
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  DollarSign,
  Filter,
  Gift,
  Heart,
  Loader2,
  Percent,
  Sparkles,
  Tag,
  Trophy,
  User,
  XCircle,
} from 'lucide-react'
import React, { useState } from 'react'

const UserRewardsSection = ({ userId }) => {
  const [activeTab, setActiveTab] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')

  // Fetch rewards data
  const { data: regularRewards, isLoading: regularLoading } = useUserRewards({
    status: selectedStatus === 'all' ? undefined : selectedStatus,
  })
  const { data: manualRewards, isLoading: manualLoading } =
    useUserManualRewards({
      status: selectedStatus === 'all' ? undefined : selectedStatus,
    })
  const stats = useUserRewardStats()

  const isLoading = regularLoading || manualLoading

  // Combine and filter rewards based on active tab
  const getDisplayRewards = () => {
    const regular = regularRewards?.userRewards || []
    const manual = manualRewards?.rewards || []

    if (activeTab === 'all') {
      return [...regular, ...manual].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      )
    } else if (activeTab === 'regular') {
      return regular
    } else if (activeTab === 'manual') {
      return manual
    }
    return []
  }

  const displayRewards = getDisplayRewards()

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100 border-green-200'
      case 'used':
        return 'text-blue-600 bg-blue-100 border-blue-200'
      case 'expired':
        return 'text-red-600 bg-red-100 border-red-200'
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200'
    }
  }

  // Get reward type icon
  const getRewardIcon = (type, isManual) => {
    if (isManual) return <Heart className='w-5 h-5' />

    switch (type) {
      case 'credit':
        return <DollarSign className='w-5 h-5' />
      case 'discount':
        return <Percent className='w-5 h-5' />
      case 'service':
      case 'free_service':
        return <Sparkles className='w-5 h-5' />
      default:
        return <Gift className='w-5 h-5' />
    }
  }

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Calculate days remaining
  const getDaysRemaining = (expiresAt) => {
    const now = new Date()
    const expires = new Date(expiresAt)
    const diffTime = expires - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : 0
  }

  return (
    <div className='space-y-6'>
      {/* Stats Overview */}
      <div className='grid grid-cols-2 lg:grid-cols-5 gap-4'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className='bg-gradient-to-r from-purple-100 to-pink-100 p-4 rounded-xl'
        >
          <div className='flex items-center justify-between'>
            <div>
              <div className='text-2xl font-bold text-gray-800'>
                {stats.combined.total}
              </div>
              <div className='text-xs text-purple-600'>Total Rewards</div>
            </div>
            <Trophy className='w-8 h-8 text-purple-500' />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className='bg-gradient-to-r from-green-100 to-emerald-100 p-4 rounded-xl'
        >
          <div className='flex items-center justify-between'>
            <div>
              <div className='text-2xl font-bold text-gray-800'>
                {stats.combined.active}
              </div>
              <div className='text-xs text-green-600'>Active</div>
            </div>
            <CheckCircle className='w-8 h-8 text-green-500' />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className='bg-gradient-to-r from-blue-100 to-indigo-100 p-4 rounded-xl'
        >
          <div className='flex items-center justify-between'>
            <div>
              <div className='text-2xl font-bold text-gray-800'>
                {stats.combined.used}
              </div>
              <div className='text-xs text-blue-600'>Used</div>
            </div>
            <Tag className='w-8 h-8 text-blue-500' />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className='bg-gradient-to-r from-rose-100 to-pink-100 p-4 rounded-xl'
        >
          <div className='flex items-center justify-between'>
            <div>
              <div className='text-2xl font-bold text-gray-800'>
                {stats.manual.total}
              </div>
              <div className='text-xs text-rose-600'>Given by Spa</div>
            </div>
            <Heart className='w-8 h-8 text-rose-500' />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className='bg-gradient-to-r from-orange-100 to-red-100 p-4 rounded-xl'
        >
          <div className='flex items-center justify-between'>
            <div>
              <div className='text-2xl font-bold text-gray-800'>
                {stats.regular.total}
              </div>
              <div className='text-xs text-orange-600'>Earned</div>
            </div>
            <Gift className='w-8 h-8 text-orange-500' />
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className='flex flex-wrap gap-4 items-center justify-between'>
        <div className='flex gap-2'>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              activeTab === 'all'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            All Rewards
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
              activeTab === 'manual'
                ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Heart className='w-4 h-4' />
            From Spa
            {stats.manual.total > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === 'manual'
                    ? 'bg-white/20'
                    : 'bg-rose-100 text-rose-600'
                }`}
              >
                {stats.manual.total}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('regular')}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              activeTab === 'regular'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Earned
          </button>
        </div>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className='px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500'
        >
          <option value='all'>All Status</option>
          <option value='active'>Active</option>
          <option value='used'>Used</option>
          <option value='expired'>Expired</option>
        </select>
      </div>

      {/* Rewards List */}
      <div className='space-y-4'>
        {isLoading ? (
          <div className='flex items-center justify-center py-12'>
            <Loader2 className='w-8 h-8 text-purple-500 animate-spin' />
          </div>
        ) : displayRewards.length === 0 ? (
          <div className='bg-gray-50 rounded-xl p-12 text-center'>
            <Gift className='w-16 h-16 text-gray-300 mx-auto mb-4' />
            <p className='text-gray-500'>No rewards found</p>
          </div>
        ) : (
          displayRewards.map((reward) => (
            <motion.div
              key={reward._id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className='bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all overflow-hidden'
            >
              <div className='p-6'>
                <div className='flex items-start justify-between mb-4'>
                  <div className='flex items-start gap-4'>
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        reward.isManualReward || reward.rewardSnapshot?.isManual
                          ? 'bg-gradient-to-r from-rose-400 to-pink-400'
                          : 'bg-gradient-to-r from-purple-400 to-pink-400'
                      }`}
                    >
                      {getRewardIcon(
                        reward.rewardSnapshot?.type || reward.type,
                        reward.isManualReward || reward.rewardSnapshot?.isManual
                      )}
                    </div>

                    <div className='flex-1'>
                      <h3 className='font-semibold text-gray-900 mb-1'>
                        {reward.rewardSnapshot?.name || 'Reward'}
                      </h3>
                      <p className='text-sm text-gray-600 mb-2'>
                        {reward.rewardSnapshot?.description || 'No description'}
                      </p>

                      {/* Manual Reward Info */}
                      {(reward.isManualReward ||
                        reward.rewardSnapshot?.isManual) && (
                        <div className='flex items-center gap-2 text-xs text-rose-600 bg-rose-50 px-3 py-1 rounded-full inline-flex'>
                          <Heart className='w-3 h-3' />
                          Given by {reward.rewardSnapshot?.givenBy || 'Spa'}
                          {reward.rewardSnapshot?.reason &&
                            ` • ${reward.rewardSnapshot.reason}`}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className='text-right'>
                    <div className='text-2xl font-bold text-gray-900'>
                      {reward.rewardSnapshot?.type === 'discount'
                        ? `${reward.rewardSnapshot?.value || 0}%`
                        : `$${reward.rewardSnapshot?.value || 0}`}
                    </div>
                    <div
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                        reward.status
                      )}`}
                    >
                      {reward.status === 'active' && (
                        <CheckCircle className='w-3 h-3' />
                      )}
                      {reward.status === 'used' && <Tag className='w-3 h-3' />}
                      {reward.status === 'expired' && (
                        <XCircle className='w-3 h-3' />
                      )}
                      {reward.status}
                    </div>
                  </div>
                </div>

                {/* Footer Info */}
                <div className='flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-100'>
                  <div className='flex items-center gap-4'>
                    <span className='flex items-center gap-1'>
                      <Calendar className='w-3 h-3' />
                      Received{' '}
                      {formatDate(reward.claimedAt || reward.createdAt)}
                    </span>

                    {reward.status === 'active' && reward.expiresAt && (
                      <span className='flex items-center gap-1 text-orange-600'>
                        <Clock className='w-3 h-3' />
                        {getDaysRemaining(reward.expiresAt)} days left
                      </span>
                    )}

                    {reward.usedAt && (
                      <span className='flex items-center gap-1'>
                        <CheckCircle className='w-3 h-3' />
                        Used {formatDate(reward.usedAt)}
                      </span>
                    )}
                  </div>

                  {reward.locationId && (
                    <span className='text-purple-600'>
                      {reward.locationName || reward.locationId}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}

export default UserRewardsSection
