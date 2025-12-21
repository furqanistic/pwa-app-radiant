// File: client/src/pages/Referral/ReferralPage.jsx - ENHANCED PWA VERSION
import {
    useGenerateMyReferralCode,
    useReferralLeaderboard,
    useReferralStatsWithComputedData,
} from '@/hooks/useReferral'
import { motion } from 'framer-motion'
import {
    Award,
    BarChart3,
    Check,
    ChevronRight,
    Copy,
    Crown,
    Facebook,
    Gift,
    Heart,
    Link2,
    Loader2,
    Mail,
    MessageSquare,
    Share2,
    Sparkles,
    Star,
    Target,
    TrendingUp,
    Trophy,
    Twitter,
    Users,
    Zap,
} from 'lucide-react'
import React, { useState } from 'react'
import Layout from '../Layout/Layout'

// Skeleton Loading Component
const ReferralSkeleton = () => (
  <Layout>
    <div className='min-h-screen bg-gradient-to-br from-pink-50 to-rose-50'>
      <div className='max-w-sm mx-auto md:max-w-6xl lg:max-w-7xl px-4 md:px-6 lg:px-8 py-4 md:py-8 space-y-4 md:space-y-6'>
        {/* Header Skeleton */}
        <div className='text-center space-y-3 animate-pulse'>
          <div className='h-8 md:h-12 bg-gray-200 rounded-xl w-3/4 md:w-1/2 mx-auto'></div>
          <div className='h-4 bg-gray-200 rounded-lg w-2/3 md:w-1/3 mx-auto'></div>
        </div>

        <div className='md:grid md:grid-cols-12 md:gap-6 space-y-4 md:space-y-0'>
          {/* Left Column Skeleton */}
          <div className='md:col-span-8 space-y-4'>
            {/* Stats Cards Skeleton */}
            <div className='grid grid-cols-3 gap-3 md:gap-4'>
              {[1, 2, 3].map((i) => (
                <div key={i} className='bg-white rounded-2xl p-3 md:p-4 text-center border border-pink-100 animate-pulse'>
                  <div className='w-10 h-10 md:w-12 md:h-12 bg-gray-200 rounded-xl mx-auto mb-2'></div>
                  <div className='h-6 bg-gray-200 rounded w-1/2 mx-auto mb-1'></div>
                  <div className='h-3 bg-gray-200 rounded w-2/3 mx-auto'></div>
                </div>
              ))}
            </div>

            {/* Progress Skeleton */}
            <div className='bg-white rounded-2xl p-4 md:p-5 border border-pink-100 animate-pulse'>
              <div className='flex items-center justify-between mb-3'>
                <div className='h-5 bg-gray-200 rounded w-1/3'></div>
                <div className='h-5 bg-gray-200 rounded-full w-1/4'></div>
              </div>
              <div className='h-3 bg-gray-200 rounded-full w-full'></div>
            </div>

            {/* Magic Code Skeleton */}
            <div className='bg-white rounded-2xl p-4 md:p-6 border border-pink-100 animate-pulse'>
              <div className='h-6 bg-gray-200 rounded w-1/2 mx-auto mb-4'></div>
              <div className='h-16 bg-gray-200 rounded-2xl w-full mb-4'></div>
              <div className='h-12 bg-gray-200 rounded-xl w-full'></div>
            </div>
          </div>

          {/* Right Column Skeleton */}
          <div className='md:col-span-4 space-y-4'>
            {[1, 2].map((i) => (
              <div key={i} className='bg-white rounded-2xl p-4 md:p-5 border border-pink-100 animate-pulse space-y-3'>
                <div className='h-6 bg-gray-200 rounded w-1/2 mx-auto'></div>
                <div className='space-y-2'>
                  <div className='h-4 bg-gray-200 rounded w-full'></div>
                  <div className='h-4 bg-gray-200 rounded w-5/6'></div>
                  <div className='h-4 bg-gray-200 rounded w-4/6'></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </Layout>
)

// Error Component
const ErrorState = ({ error, retry }) => (
  <Layout>
    <div className='min-h-screen bg-gradient-to-br from-pink-50 to-rose-50'>
      <div className='max-w-sm mx-auto md:max-w-6xl lg:max-w-7xl px-4 md:px-6 lg:px-8 py-4'>
        <div className='flex items-center justify-center min-h-[60vh]'>
          <div className='text-center max-w-sm mx-auto'>
            <div className='w-16 h-16 bg-gradient-to-r from-pink-100 to-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-pink-200'>
              <Target className='w-8 h-8 text-pink-500' />
            </div>
            <h2 className='text-lg font-bold text-gray-900 mb-2'>
              Something went wrong
            </h2>
            <p className='text-gray-600 mb-4 text-sm'>
              {error?.message || 'Failed to load your data'}
            </p>
            {retry && (
              <button
                onClick={retry}
                className='px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-semibold hover:from-pink-600 hover:to-rose-600 hover:scale-105 transform transition-all duration-200'
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  </Layout>
)

// Main Referral Component
const ReferralPage = () => {
  const [copied, setCopied] = useState(false)

  // Fetch referral data
  const {
    data: computedStats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useReferralStatsWithComputedData()

  const { data: leaderboardData, isLoading: leaderboardLoading } =
    useReferralLeaderboard({ period: 'month', limit: 5 })

  // Generate referral code mutation
  const generateCodeMutation = useGenerateMyReferralCode({
    onSuccess: (data) => {
      console.log('Referral code generated:', data.data.referralCode)
      // Force refetch stats to get the updated data
      refetchStats()
    },
    onError: (error) => {
      console.error('Failed to generate referral code:', error)
    },
  })

  // Handle loading and error states
  if (statsLoading) return <ReferralSkeleton />
  if (statsError) return <ErrorState error={statsError} retry={refetchStats} />

  const {
    referralCode,
    totalReferrals,
    totalEarnings,
    currentTier,
    shareUrl,
    conversionRate,
    nextTierProgress,
  } = computedStats || {}

  const handleCopyCode = async () => {
    if (!referralCode) return
    try {
      await navigator.clipboard.writeText(referralCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleCopyLink = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleShare = (platform) => {
    if (!shareUrl) return
    const text = 'Join me on RadiantAI and start your beauty transformation!'
    const urls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        shareUrl
      )}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        text
      )}&url=${encodeURIComponent(shareUrl)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(
        text + ' ' + shareUrl
      )}`,
      email: `mailto:?subject=${encodeURIComponent(
        'Join RadiantAI with me!'
      )}&body=${encodeURIComponent(text + '\n\n' + shareUrl)}`,
    }

    if (urls[platform]) {
      window.open(urls[platform], '_blank', 'width=600,height=400')
    }
  }

  // Get tier display info
  const getTierInfo = (tier) => {
    const rewards = computedStats?.tierRewards || {}
    const tiers = {
      bronze: {
        color: 'text-pink-600',
        bgColor: 'from-pink-50 to-rose-50',
        borderColor: 'border-pink-200',
        gradientBg: 'from-pink-500 to-rose-500',
        rewards: `$${rewards.bronze?.value || '40'}`,
        icon: Star,
      },
      gold: {
        color: 'text-amber-600',
        bgColor: 'from-amber-50 to-yellow-50',
        borderColor: 'border-amber-200',
        gradientBg: 'from-amber-500 to-yellow-500',
        rewards: `$${rewards.gold?.value || '60'}`,
        icon: Crown,
      },
      platinum: {
        color: 'text-purple-600',
        bgColor: 'from-purple-50 to-indigo-50',
        borderColor: 'border-purple-200',
        gradientBg: 'from-purple-500 to-indigo-500',
        rewards: `$${rewards.platinum?.value || '100'}`,
        icon: Award,
      },
    }
    return tiers[tier?.toLowerCase()] || tiers.bronze
  }

  const currentTierInfo = getTierInfo(currentTier)

  return (
    <Layout>
      <div className='min-h-screen bg-gradient-to-br from-pink-50 to-rose-50'>
        <div className='max-w-sm mx-auto md:max-w-6xl lg:max-w-7xl px-4 md:px-6 lg:px-8 py-4 md:py-8 space-y-4 md:space-y-6'>
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className='text-center space-y-3'
          >
            <div className='flex items-center justify-center gap-2 mb-3'>
              <Heart className='w-6 h-6 text-pink-500' />
              <h1 className='text-2xl md:text-4xl font-bold text-gray-900'>
                Referral Program
              </h1>
              <Sparkles className='w-6 h-6 text-rose-500' />
            </div>
            <p className='text-gray-600 text-sm md:text-lg max-w-xl mx-auto'>
              Share the magic and earn beautiful rewards
            </p>
          </motion.div>

          <div className='md:grid md:grid-cols-12 md:gap-6 space-y-4 md:space-y-0'>
            {/* Left Column - Stats & Main Actions */}
            <div className='md:col-span-8 space-y-4'>
              {/* Stats Cards */}
              <div className='grid grid-cols-3 gap-3 md:gap-4'>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className='bg-white rounded-2xl p-3 md:p-4 text-center border border-pink-100 hover:border-pink-300 transition-all duration-200'
                >
                  <div className='w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl flex items-center justify-center mx-auto mb-2'>
                    <Users className='w-5 h-5 md:w-6 md:h-6 text-white' />
                  </div>
                  <div className='text-lg md:text-2xl font-bold text-gray-900 mb-1'>
                    {totalReferrals || 0}
                  </div>
                  <div className='text-xs md:text-sm text-gray-600 font-medium'>
                    Referrals
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className='bg-white rounded-2xl p-3 md:p-4 text-center border border-pink-100 hover:border-pink-300 transition-all duration-200'
                >
                  <div className='w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-2'>
                    <Trophy className='w-5 h-5 md:w-6 md:h-6 text-white' />
                  </div>
                  <div className='text-lg md:text-2xl font-bold text-gray-900 mb-1'>
                    ${computedStats?.totalEarningsValue || 0}
                  </div>
                  <div className='text-xs md:text-sm text-gray-600 font-medium'>
                    Commission Earned
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className='bg-white rounded-2xl p-3 md:p-4 text-center border border-pink-100 hover:border-pink-300 transition-all duration-200'
                >
                  <div
                    className={`w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r ${currentTierInfo.gradientBg} rounded-xl flex items-center justify-center mx-auto mb-2`}
                  >
                    <currentTierInfo.icon className='w-5 h-5 md:w-6 md:h-6 text-white' />
                  </div>
                  <div className='text-lg md:text-2xl font-bold text-gray-900 mb-1 capitalize'>
                    {currentTier || 'Bronze'}
                  </div>
                  <div className='text-xs md:text-sm text-gray-600 font-medium'>
                    Tier
                  </div>
                </motion.div>
              </div>

              {/* Progress to Next Tier */}
              {nextTierProgress && !nextTierProgress.isMaxTier && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className='bg-white rounded-2xl p-4 md:p-5 border border-pink-100'
                >
                  <div className='flex items-center justify-between mb-3'>
                    <span className='text-base md:text-lg font-bold text-gray-900 flex items-center gap-2'>
                      <Sparkles className='w-4 h-4 md:w-5 md:h-5 text-pink-500' />
                      Next: {nextTierProgress.nextTier}
                    </span>
                    <span className='text-xs md:text-sm text-pink-600 font-semibold bg-pink-100 px-3 py-1 rounded-full border border-pink-200'>
                      {nextTierProgress.referralsNeeded} more
                    </span>
                  </div>
                  <div className='w-full bg-pink-100 rounded-full h-3 border border-pink-200'>
                    <div
                      className='bg-gradient-to-r from-pink-500 to-rose-500 h-3 rounded-full transition-all duration-1000'
                      style={{ width: `${nextTierProgress.progress}%` }}
                    />
                  </div>
                  <div className='mt-2 text-xs md:text-sm text-gray-600 text-center font-medium'>
                    {nextTierProgress.progress.toFixed(1)}% complete
                  </div>
                </motion.div>
              )}

              {/* Referral Code Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className='bg-white rounded-2xl p-4 md:p-6 border border-pink-100'
              >
                <div className='space-y-4'>
                  <div className='text-center'>
                    <div className='flex items-center justify-center gap-2 mb-2'>
                      <Sparkles className='w-5 h-5 md:w-6 md:h-6 text-pink-500' />
                      <h2 className='text-lg md:text-xl font-bold text-gray-900'>
                        Your Magic Code
                      </h2>
                      <Sparkles className='w-5 h-5 md:w-6 md:h-6 text-rose-500' />
                    </div>
                    <p className='text-sm md:text-base text-gray-600'>
                      Share this with your lovely friends
                    </p>
                  </div>

                  {referralCode ? (
                    <div className='space-y-4'>
                      <div className='bg-gradient-to-r from-pink-50 to-rose-50 rounded-2xl p-4 md:p-5 border border-pink-200'>
                        <div className='text-2xl md:text-3xl font-mono font-bold text-gray-900 tracking-wider text-center mb-2'>
                          {referralCode}
                        </div>
                        <div className='flex items-center justify-center gap-2 text-gray-600'>
                          <Heart className='w-3 h-3 md:w-4 md:h-4 text-pink-500' />
                          <span className='text-xs md:text-sm font-medium'>
                            Made with love
                          </span>
                          <Heart className='w-3 h-3 md:w-4 md:h-4 text-pink-500' />
                        </div>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleCopyCode}
                        className='w-full flex items-center justify-center gap-2 py-3 md:py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-semibold text-base md:text-lg hover:from-pink-600 hover:to-rose-600 hover:scale-105 transform transition-all duration-200'
                      >
                        {copied ? (
                          <Check className='w-4 h-4 md:w-5 md:h-5' />
                        ) : (
                          <Copy className='w-4 h-4 md:w-5 md:h-5' />
                        )}
                        {copied ? 'Copied!' : 'Copy Code'}
                      </motion.button>
                    </div>
                  ) : (
                    <div className='space-y-4'>
                      <div className='bg-gradient-to-r from-pink-50 to-rose-50 rounded-2xl p-4 md:p-5 border-2 border-dashed border-pink-300 text-center'>
                        <div className='text-gray-900 text-base md:text-lg font-bold mb-1'>
                          Create your code
                        </div>
                        <div className='text-gray-600 text-sm'>
                          Generate your unique referral code
                        </div>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => generateCodeMutation.mutate()}
                        disabled={generateCodeMutation.isPending}
                        className='w-full flex items-center justify-center gap-2 py-3 md:py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-semibold text-base md:text-lg hover:from-pink-600 hover:to-rose-600 hover:scale-105 transform disabled:opacity-50 disabled:hover:scale-100 transition-all duration-200'
                      >
                        {generateCodeMutation.isPending ? (
                          <Loader2 className='w-4 h-4 md:w-5 md:h-5 animate-spin' />
                        ) : (
                          <Zap className='w-4 h-4 md:w-5 md:h-5' />
                        )}
                        {generateCodeMutation.isPending
                          ? 'Creating...'
                          : 'Generate Code'}
                      </motion.button>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Share Link Section */}
              {shareUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className='bg-white rounded-2xl p-4 md:p-6 border border-pink-100'
                >
                  <div className='space-y-4'>
                    <div className='text-center'>
                      <h2 className='text-lg md:text-xl font-bold text-gray-900 mb-1'>
                        Share the Love
                      </h2>
                      <p className='text-sm md:text-base text-gray-600'>
                        Spread your magic everywhere!
                      </p>
                    </div>

                    <div className='bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl p-3 border border-pink-200'>
                      <div className='text-xs text-gray-700 break-all font-mono bg-white rounded-lg p-3 border border-pink-100'>
                        {shareUrl}
                      </div>
                    </div>

                    <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleCopyLink}
                        className='flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-semibold hover:from-pink-600 hover:to-rose-600 hover:scale-105 transform transition-all duration-200'
                      >
                        {copied ? (
                          <Check className='w-4 h-4' />
                        ) : (
                          <Link2 className='w-4 h-4' />
                        )}
                        {copied ? 'Copied!' : 'Copy Link'}
                      </motion.button>

                      <div className='grid grid-cols-4 gap-2'>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleShare('facebook')}
                          className='p-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 hover:scale-105 transform transition-all duration-200'
                          title='Share on Facebook'
                        >
                          <Facebook className='w-4 h-4 mx-auto' />
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleShare('twitter')}
                          className='p-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 hover:scale-105 transform transition-all duration-200'
                          title='Share on X'
                        >
                          <span className='text-base font-bold mx-auto'>𝕏</span>
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleShare('whatsapp')}
                          className='p-3 bg-green-500 text-white rounded-xl hover:bg-green-600 hover:scale-105 transform transition-all duration-200'
                          title='Share on WhatsApp'
                        >
                          <MessageSquare className='w-4 h-4 mx-auto' />
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleShare('email')}
                          className='p-3 bg-rose-500 text-white rounded-xl hover:bg-rose-600 hover:scale-105 transform transition-all duration-200'
                          title='Share via Email'
                        >
                          <Mail className='w-4 h-4 mx-auto' />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Right Column - How it works & Tiers */}
            <div className='md:col-span-4 space-y-4'>
              {/* How It Works */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className='bg-white rounded-2xl p-4 md:p-5 border border-pink-100'
              >
                <div className='text-center mb-4'>
                  <h2 className='text-lg md:text-xl font-bold text-gray-900 mb-1 flex items-center justify-center gap-2'>
                    <Heart className='w-5 h-5 text-pink-500' />
                    How It Works
                    <Heart className='w-5 h-5 text-pink-500' />
                  </h2>
                  <p className='text-gray-600 text-sm'>Simple & sweet!</p>
                </div>
                <div className='space-y-3'>
                  <div className='flex items-start gap-3'>
                    <div className='w-8 h-8 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center flex-shrink-0'>
                      <span className='text-xs font-bold text-white'>1</span>
                    </div>
                    <div>
                      <h3 className='font-bold text-gray-900 text-sm md:text-base mb-1'>
                        Share Your Code
                      </h3>
                      <p className='text-xs md:text-sm text-gray-600'>
                        Send your code to friends
                      </p>
                    </div>
                  </div>
                  <div className='flex items-start gap-3'>
                    <div className='w-8 h-8 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center flex-shrink-0'>
                      <span className='text-xs font-bold text-white'>2</span>
                    </div>
                    <div>
                      <h3 className='font-bold text-gray-900 text-sm md:text-base mb-1'>
                        They Join & Love It
                      </h3>
                      <p className='text-xs md:text-sm text-gray-600'>
                        Friends sign up and enjoy
                      </p>
                    </div>
                  </div>
                  <div className='flex items-start gap-3'>
                    <div className='w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0'>
                      <span className='text-xs font-bold text-white'>3</span>
                    </div>
                    <div>
                      <h3 className='font-bold text-gray-900 text-sm md:text-base mb-1'>
                        Earn Rewards
                      </h3>
                      <p className='text-xs md:text-sm text-gray-600'>
                        Get {currentTierInfo.rewards} per referral!
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Reward Tiers */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className='bg-white rounded-2xl p-4 md:p-5 border border-pink-100'
              >
                <div className='text-center mb-4'>
                  <h2 className='text-lg md:text-xl font-bold text-gray-900 mb-1 flex items-center justify-center gap-2'>
                    <Crown className='w-5 h-5 text-amber-500' />
                    Reward Tiers
                    <Crown className='w-5 h-5 text-amber-500' />
                  </h2>
                  <p className='text-gray-600 text-sm'>
                    Unlock bigger rewards!
                  </p>
                </div>
                <div className='space-y-3'>
                  {/* Bronze */}
                  <div
                    className={`p-3 md:p-4 rounded-xl border-2 transition-all duration-200 ${
                      currentTier === 'bronze'
                        ? 'border-pink-300 bg-gradient-to-r from-pink-50 to-rose-50 scale-105 transform'
                        : 'border-pink-100 bg-white hover:border-pink-300 hover:bg-pink-50 hover:scale-105 transform'
                    }`}
                  >
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-3'>
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                            currentTier === 'bronze'
                              ? 'bg-gradient-to-r from-pink-500 to-rose-500'
                              : 'bg-gray-400'
                          }`}
                        >
                          <Star className='w-4 h-4 text-white' />
                        </div>
                        <div>
                          <div className='font-bold text-gray-900 text-sm md:text-base'>
                            Bronze
                          </div>
                          <div className='text-xs text-gray-600'>
                            1-4 referrals
                          </div>
                        </div>
                      </div>
                      <div className='text-right'>
                        <div className='font-bold text-gray-900 text-base'>
                          $40
                        </div>
                        <div className='text-xs text-gray-600'>
                          per referral
                        </div>
                      </div>
                    </div>
                    {currentTier === 'bronze' && (
                      <div className='mt-2 text-xs text-pink-700 font-bold flex items-center gap-1'>
                        <Sparkles className='w-3 h-3' />
                        Current Tier
                      </div>
                    )}
                  </div>

                  {/* Gold */}
                  <div
                    className={`p-3 md:p-4 rounded-xl border-2 transition-all duration-200 ${
                      currentTier === 'gold'
                        ? 'border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 scale-105 transform'
                        : 'border-pink-100 bg-white hover:border-amber-300 hover:bg-amber-50 hover:scale-105 transform'
                    }`}
                  >
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-3'>
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                            currentTier === 'gold'
                              ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
                              : 'bg-gray-400'
                          }`}
                        >
                          <Crown className='w-4 h-4 text-white' />
                        </div>
                        <div>
                          <div className='font-bold text-gray-900 text-sm md:text-base'>
                            Gold
                          </div>
                          <div className='text-xs text-gray-600'>
                            5-9 referrals
                          </div>
                        </div>
                      </div>
                      <div className='text-right'>
                        <div className='font-bold text-gray-900 text-base'>
                          $60
                        </div>
                        <div className='text-xs text-gray-600'>
                          per referral
                        </div>
                      </div>
                    </div>
                    {currentTier === 'gold' && (
                      <div className='mt-2 text-xs text-amber-700 font-bold flex items-center gap-1'>
                        <Sparkles className='w-3 h-3' />
                        Current Tier
                      </div>
                    )}
                  </div>

                  {/* Platinum */}
                  <div
                    className={`p-3 md:p-4 rounded-xl border-2 transition-all duration-200 ${
                      currentTier === 'platinum'
                        ? 'border-purple-300 bg-gradient-to-r from-purple-50 to-indigo-50 scale-105 transform'
                        : 'border-pink-100 bg-white hover:border-purple-300 hover:bg-purple-50 hover:scale-105 transform'
                    }`}
                  >
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-3'>
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                            currentTier === 'platinum'
                              ? 'bg-gradient-to-r from-pink-500 to-rose-500'
                              : 'bg-gray-400'
                          }`}
                        >
                          <Award className='w-4 h-4 text-white' />
                        </div>
                        <div>
                          <div className='font-bold text-gray-900 text-sm md:text-base'>
                            Platinum
                          </div>
                          <div className='text-xs text-gray-600'>
                            10+ referrals
                          </div>
                        </div>
                      </div>
                      <div className='text-right'>
                        <div className='font-bold text-gray-900 text-base'>
                          $100
                        </div>
                        <div className='text-xs text-gray-600'>
                          per referral
                        </div>
                      </div>
                    </div>
                    {currentTier === 'platinum' && (
                      <div className='mt-2 text-xs text-purple-700 font-bold flex items-center gap-1'>
                        <Sparkles className='w-3 h-3' />
                        Current Tier
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Leaderboard - Full Width */}
          {leaderboardData &&
            leaderboardData.leaderboard &&
            leaderboardData.leaderboard.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className='bg-white rounded-2xl p-4 md:p-6 border border-pink-100'
              >
                <div className='text-center mb-5'>
                  <h2 className='text-lg md:text-2xl font-bold text-gray-900 mb-1 flex items-center justify-center gap-2'>
                    <Trophy className='w-6 h-6 md:w-7 md:h-7 text-amber-500' />
                    Top Referrers This Month
                    <Trophy className='w-6 h-6 md:w-7 md:h-7 text-amber-500' />
                  </h2>
                  <p className='text-sm md:text-base text-gray-600'>
                    Our lovely community leaders
                  </p>
                </div>
                <div className='grid gap-3 md:gap-4 md:grid-cols-2 xl:grid-cols-3'>
                  {leaderboardData.leaderboard
                    .slice(0, 6)
                    .map((user, index) => (
                      <motion.div
                        key={user.userId}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.9 + index * 0.1 }}
                        className='flex items-center justify-between p-3 md:p-4 bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl border border-pink-200 hover:bg-gradient-to-r hover:from-pink-100 hover:to-rose-100 hover:scale-105 transform transition-all duration-200'
                      >
                        <div className='flex items-center gap-3'>
                          <div
                            className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white ${
                              index === 0
                                ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
                                : index === 1
                                ? 'bg-gradient-to-r from-gray-400 to-gray-500'
                                : index === 2
                                ? 'bg-gradient-to-r from-orange-400 to-red-500'
                                : 'bg-gradient-to-r from-pink-500 to-rose-500'
                            }`}
                          >
                            {index + 1}
                          </div>
                          <div>
                            <div className='font-bold text-gray-900 text-sm md:text-base'>
                              {user.name}
                            </div>
                            <div className='text-xs md:text-sm text-gray-600 flex items-center gap-1'>
                              <Heart className='w-3 h-3 text-pink-500' />
                              {user.totalReferrals} referrals
                            </div>
                          </div>
                        </div>
                        <div className='text-right'>
                          <div className='font-bold text-gray-900 text-sm md:text-base'>
                            ${user.totalPointsEarned}
                          </div>
                          <div className='text-xs text-gray-600'>earned</div>
                        </div>
                      </motion.div>
                    ))}
                </div>
              </motion.div>
            )}
        </div>
      </div>
    </Layout>
  )
}

export default ReferralPage
