// File: client/src/components/Referral/ReferralLeaderboard.jsx
import { useEnhancedLeaderboard } from '@/hooks/useReferral'
import { motion } from 'framer-motion'
import {
  Award,
  Calendar,
  Crown,
  Filter,
  Loader2,
  Medal,
  RefreshCw,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
import React, { useState } from 'react'

// Loading Component
const LoadingSpinner = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }

  return (
    <div className='flex items-center justify-center'>
      <Loader2
        className={`${sizeClasses[size]} animate-spin text-purple-500`}
      />
    </div>
  )
}

// Period Filter Component
const PeriodFilter = ({ value, onChange, disabled = false }) => {
  const periods = [
    { value: 'all', label: 'All Time' },
    { value: 'year', label: 'This Year' },
    { value: 'month', label: 'This Month' },
    { value: 'week', label: 'This Week' },
  ]

  return (
    <div className='flex items-center gap-2 bg-white/90 backdrop-blur-lg rounded-lg p-1 border border-white/50'>
      <Filter className='w-4 h-4 text-gray-500 ml-2' />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className='bg-transparent border-none outline-none text-sm font-medium text-gray-700 cursor-pointer disabled:cursor-not-allowed'
      >
        {periods.map((period) => (
          <option key={period.value} value={period.value}>
            {period.label}
          </option>
        ))}
      </select>
    </div>
  )
}

// Rank Badge Component
const RankBadge = ({ rank, className = '' }) => {
  const getRankConfig = (rank) => {
    switch (rank) {
      case 1:
        return {
          icon: Trophy,
          color: 'from-yellow-400 to-orange-500',
          textColor: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
        }
      case 2:
        return {
          icon: Medal,
          color: 'from-gray-400 to-gray-500',
          textColor: 'text-gray-600',
          bgColor: 'bg-gray-50',
        }
      case 3:
        return {
          icon: Award,
          color: 'from-orange-400 to-red-500',
          textColor: 'text-orange-600',
          bgColor: 'bg-orange-50',
        }
      default:
        return {
          icon: null,
          color: 'from-purple-400 to-purple-500',
          textColor: 'text-purple-600',
          bgColor: 'bg-purple-50',
        }
    }
  }

  const config = getRankConfig(rank)
  const Icon = config.icon

  if (rank <= 3 && Icon) {
    return (
      <div
        className={`w-10 h-10 bg-gradient-to-br ${config.color} rounded-full flex items-center justify-center ${className}`}
      >
        <Icon className='w-5 h-5 text-white' />
      </div>
    )
  }

  return (
    <div
      className={`w-10 h-10 ${config.bgColor} rounded-full flex items-center justify-center font-bold ${config.textColor} ${className}`}
    >
      #{rank}
    </div>
  )
}

// Tier Badge Component
const TierBadge = ({ tier, className = '' }) => {
  const tierConfig = {
    bronze: { color: 'from-gray-400 to-gray-500', text: 'Bronze' },
    gold: { color: 'from-yellow-400 to-orange-500', text: 'Gold' },
    platinum: { color: 'from-purple-500 to-pink-500', text: 'Platinum' },
    diamond: { color: 'from-blue-400 to-purple-600', text: 'Diamond' },
  }

  const config = tierConfig[tier] || tierConfig.bronze

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r ${config.color} text-white rounded-full text-xs font-medium ${className}`}
    >
      <Crown className='w-3 h-3' />
      {config.text}
    </div>
  )
}

// Leaderboard Entry Component
const LeaderboardEntry = ({ entry, index, isCurrentUser = false }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`flex items-center gap-4 p-4 md:p-6 bg-white/90 backdrop-blur-lg rounded-xl border border-white/50 hover:shadow-lg transition-all duration-300 ${
        isCurrentUser ? 'ring-2 ring-purple-500/50 bg-purple-50/50' : ''
      }`}
    >
      {/* Rank */}
      <RankBadge rank={entry.rank} />

      {/* User Info */}
      <div className='flex-1 min-w-0'>
        <div className='flex items-center gap-3 mb-1'>
          <h3
            className={`font-bold text-gray-900 truncate ${
              isCurrentUser ? 'text-purple-900' : ''
            }`}
          >
            {entry.name}
            {isCurrentUser && (
              <span className='text-purple-600 text-sm ml-2'>(You)</span>
            )}
          </h3>
          <TierBadge tier={entry.currentTier} />
        </div>
        <p className='text-sm text-gray-600 truncate'>{entry.email}</p>
        <div className='flex items-center gap-4 mt-2 text-xs text-gray-500'>
          <span className='flex items-center gap-1'>
            <Users className='w-3 h-3' />
            {entry.totalReferrals} referrals
          </span>
          {entry.lastReferralDate && (
            <span className='flex items-center gap-1'>
              <Calendar className='w-3 h-3' />
              {new Date(entry.lastReferralDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className='text-right'>
        <div className='text-lg md:text-xl font-bold text-gray-900 mb-1'>
          {entry.formattedEarnings}
        </div>
        <div className='text-xs text-gray-500'>Total Earned</div>
        <div className='text-sm font-medium text-purple-600 mt-1'>
          {entry.totalPointsEarned} points
        </div>
      </div>

      {/* Trend Indicator */}
      <div className='text-green-500'>
        <TrendingUp className='w-5 h-5' />
      </div>
    </motion.div>
  )
}

// Empty State Component
const EmptyState = ({ period }) => (
  <div className='text-center py-12'>
    <div className='w-16 h-16 bg-gradient-to-br from-gray-300 to-gray-400 rounded-2xl flex items-center justify-center mx-auto mb-4'>
      <Trophy className='w-8 h-8 text-white' />
    </div>
    <h3 className='text-lg font-bold text-gray-900 mb-2'>No Referrals Yet</h3>
    <p className='text-gray-600 max-w-md mx-auto'>
      {period === 'all'
        ? 'Be the first to start referring and climb to the top of the leaderboard!'
        : `No referrals found for ${period}. Start referring to see your name here!`}
    </p>
  </div>
)

// Main Leaderboard Component
const ReferralLeaderboard = ({
  className = '',
  showPeriodFilter = true,
  maxEntries = 10,
  currentUserId = null,
}) => {
  const [period, setPeriod] = useState('all')

  const {
    leaderboard,
    period: currentPeriod,
    generatedAt,
    isLoading,
    error,
    refetch,
  } = useEnhancedLeaderboard({ period, limit: maxEntries })

  const handleRefresh = () => {
    refetch()
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl md:text-3xl font-bold text-gray-900 mb-2'>
            Referral Leaderboard
          </h2>
          <p className='text-sm md:text-base text-gray-600'>
            Top performers in our referral program
          </p>
        </div>

        <div className='flex items-center gap-3'>
          {showPeriodFilter && (
            <PeriodFilter
              value={period}
              onChange={setPeriod}
              disabled={isLoading}
            />
          )}

          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className='p-2 bg-white/90 backdrop-blur-lg rounded-lg border border-white/50 hover:shadow-md transition-all disabled:opacity-50'
          >
            <RefreshCw
              className={`w-4 h-4 text-gray-600 ${
                isLoading ? 'animate-spin' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Stats Header */}
      {leaderboard && leaderboard.length > 0 && (
        <div className='grid grid-cols-3 gap-4'>
          <div className='bg-white/90 backdrop-blur-lg rounded-xl p-4 border border-white/50 text-center'>
            <div className='w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mx-auto mb-2'>
              <Users className='w-5 h-5 text-white' />
            </div>
            <div className='text-lg font-bold text-gray-900'>
              {leaderboard.length}
            </div>
            <div className='text-sm text-gray-600'>Total Leaders</div>
          </div>

          <div className='bg-white/90 backdrop-blur-lg rounded-xl p-4 border border-white/50 text-center'>
            <div className='w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mx-auto mb-2'>
              <Zap className='w-5 h-5 text-white' />
            </div>
            <div className='text-lg font-bold text-gray-900'>
              {leaderboard.reduce(
                (sum, entry) => sum + entry.totalReferrals,
                0
              )}
            </div>
            <div className='text-sm text-gray-600'>Total Referrals</div>
          </div>

          <div className='bg-white/90 backdrop-blur-lg rounded-xl p-4 border border-white/50 text-center'>
            <div className='w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center mx-auto mb-2'>
              <Trophy className='w-5 h-5 text-white' />
            </div>
            <div className='text-lg font-bold text-gray-900'>
              {leaderboard[0]?.totalReferrals || 0}
            </div>
            <div className='text-sm text-gray-600'>Top Score</div>
          </div>
        </div>
      )}

      {/* Leaderboard Content */}
      <div className='bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-white/50'>
        {isLoading ? (
          <div className='text-center py-12'>
            <LoadingSpinner size='lg' />
            <p className='mt-4 text-gray-600'>Loading leaderboard...</p>
          </div>
        ) : error ? (
          <div className='text-center py-12'>
            <div className='text-red-500 mb-4'>
              <p className='text-sm md:text-base'>Failed to load leaderboard</p>
              <p className='text-xs text-red-400 mt-1'>{error.message}</p>
            </div>
            <button
              onClick={handleRefresh}
              className='flex items-center gap-2 mx-auto px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors'
            >
              <RefreshCw className='w-4 h-4' />
              Try Again
            </button>
          </div>
        ) : leaderboard && leaderboard.length > 0 ? (
          <div className='space-y-3'>
            {leaderboard.map((entry, index) => (
              <LeaderboardEntry
                key={entry.userId || index}
                entry={entry}
                index={index}
                isCurrentUser={currentUserId && entry.userId === currentUserId}
              />
            ))}
          </div>
        ) : (
          <EmptyState period={currentPeriod} />
        )}
      </div>

      {/* Footer */}
      {generatedAt && (
        <div className='text-center text-xs text-gray-500'>
          Last updated: {new Date(generatedAt).toLocaleString()}
        </div>
      )}
    </div>
  )
}

export default ReferralLeaderboard
