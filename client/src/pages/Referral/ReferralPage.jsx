// File: client/src/pages/Referral/ReferralPage.jsx
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

// Loading Component
const LoadingState = () => (
  <Layout>
    <div className='min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50'>
      <div className='max-w-md lg:max-w-6xl mx-auto px-4 lg:px-6 py-4 lg:py-8'>
        <div className='flex items-center justify-center min-h-[60vh]'>
          <div className='text-center'>
            <div className='w-16 h-16 bg-gradient-to-r from-rose-300 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse'>
              <Sparkles className='w-8 h-8 text-white' />
            </div>
            <Loader2 className='w-5 h-5 text-rose-400 animate-spin mx-auto mb-2' />
            <p className='text-rose-600 font-medium text-sm'>
              Loading your magical space...
            </p>
          </div>
        </div>
      </div>
    </div>
  </Layout>
)

// Error Component
const ErrorState = ({ error, retry }) => (
  <Layout>
    <div className='min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50'>
      <div className='max-w-md lg:max-w-6xl mx-auto px-4 lg:px-6 py-4 lg:py-8'>
        <div className='flex items-center justify-center min-h-[60vh]'>
          <div className='text-center max-w-sm mx-auto'>
            <div className='w-16 h-16 bg-gradient-to-r from-rose-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-3'>
              <Target className='w-8 h-8 text-rose-400' />
            </div>
            <h2 className='text-lg font-semibold text-gray-700 mb-2'>
              Something went wrong ✨
            </h2>
            <p className='text-rose-500 mb-4 text-sm'>
              {error?.message || 'Failed to load your beautiful data'}
            </p>
            {retry && (
              <button
                onClick={retry}
                className='px-5 py-2.5 bg-gradient-to-r from-rose-400 to-pink-400 text-white rounded-full font-medium hover:from-rose-500 hover:to-pink-500 transition-all text-sm'
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
  if (statsLoading) return <LoadingState />
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
    const text =
      'Join me on RadiantAI and start your beauty transformation! ✨💖'
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
        'Join RadiantAI with me! 💖'
      )}&body=${encodeURIComponent(text + '\n\n' + shareUrl)}`,
    }

    if (urls[platform]) {
      window.open(urls[platform], '_blank', 'width=600,height=400')
    }
  }

  // Get tier display info
  const getTierInfo = (tier) => {
    const tiers = {
      bronze: {
        color: 'text-rose-600',
        bgColor: 'from-rose-50 to-pink-50',
        borderColor: 'border-rose-200',
        gradientBg: 'from-rose-400 to-pink-500',
        rewards: '$40',
        icon: Star,
      },
      gold: {
        color: 'text-amber-600',
        bgColor: 'from-amber-50 to-yellow-50',
        borderColor: 'border-amber-200',
        gradientBg: 'from-amber-400 to-yellow-500',
        rewards: '$60',
        icon: Crown,
      },
      platinum: {
        color: 'text-purple-600',
        bgColor: 'from-purple-50 to-indigo-50',
        borderColor: 'border-purple-200',
        gradientBg: 'from-purple-500 to-indigo-500',
        rewards: '$100',
        icon: Award,
      },
    }
    return tiers[tier] || tiers.bronze
  }

  const currentTierInfo = getTierInfo(currentTier)

  return (
    <Layout>
      <div className='min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 relative'>
        {/* Delicate Background Elements */}
        <div className='fixed inset-0 overflow-hidden pointer-events-none'>
          <div className='absolute top-10 left-5 w-20 h-20 lg:w-32 lg:h-32 bg-rose-200/20 rounded-full blur-2xl animate-pulse' />
          <div
            className='absolute bottom-10 right-5 w-24 h-24 lg:w-40 lg:h-40 bg-pink-200/15 rounded-full blur-2xl animate-pulse'
            style={{ animationDelay: '1s' }}
          />
          <div
            className='absolute top-1/3 right-1/4 w-16 h-16 lg:w-24 lg:h-24 bg-purple-200/20 rounded-full blur-xl animate-pulse'
            style={{ animationDelay: '2s' }}
          />
        </div>

        <div className='relative z-10 max-w-md lg:max-w-6xl mx-auto px-4 lg:px-6 py-4 lg:py-8 space-y-4 lg:space-y-6'>
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className='text-center space-y-2 lg:space-y-3'
          >
            <div className='flex items-center justify-center gap-2 lg:gap-3 mb-3'>
              <h1 className='text-2xl lg:text-4xl font-bold bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 bg-clip-text text-transparent'>
                Referral Program
              </h1>
            </div>
            <p className='text-purple-600 text-sm lg:text-lg font-medium max-w-xl mx-auto'>
              Share the magic and earn beautiful rewards ✨
            </p>
          </motion.div>

          <div className='lg:grid lg:grid-cols-12 lg:gap-6 space-y-4 lg:space-y-0'>
            {/* Left Column - Stats & Main Actions */}
            <div className='lg:col-span-8 space-y-4 lg:space-y-5'>
              {/* Stats Cards */}
              <div className='grid grid-cols-3 gap-2 lg:gap-4'>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className='bg-white/70 backdrop-blur-sm rounded-xl lg:rounded-2xl p-3 lg:p-5 text-center border border-white/60 hover:bg-white/80 transition-all duration-300'
                >
                  <div className='w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-r from-rose-400 to-pink-500 rounded-xl lg:rounded-2xl flex items-center justify-center mx-auto mb-2'>
                    <Users className='w-5 h-5 lg:w-6 lg:h-6 text-white' />
                  </div>
                  <div className='text-lg lg:text-2xl font-bold text-gray-700 mb-1'>
                    {totalReferrals || 0}
                  </div>
                  <div className='text-xs lg:text-sm text-purple-600 font-medium'>
                    Referrals
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className='bg-white/70 backdrop-blur-sm rounded-xl lg:rounded-2xl p-3 lg:p-5 text-center border border-white/60 hover:bg-white/80 transition-all duration-300'
                >
                  <div className='w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-xl lg:rounded-2xl flex items-center justify-center mx-auto mb-2'>
                    <Trophy className='w-5 h-5 lg:w-6 lg:h-6 text-white' />
                  </div>
                  <div className='text-lg lg:text-2xl font-bold text-gray-700 mb-1'>
                    ${totalEarnings || 0}
                  </div>
                  <div className='text-xs lg:text-sm text-purple-600 font-medium'>
                    Earned
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className='bg-white/70 backdrop-blur-sm rounded-xl lg:rounded-2xl p-3 lg:p-5 text-center border border-white/60 hover:bg-white/80 transition-all duration-300'
                >
                  <div
                    className={`w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-r ${currentTierInfo.gradientBg} rounded-xl lg:rounded-2xl flex items-center justify-center mx-auto mb-2`}
                  >
                    <currentTierInfo.icon className='w-5 h-5 lg:w-6 lg:h-6 text-white' />
                  </div>
                  <div className='text-lg lg:text-2xl font-bold text-gray-700 mb-1 capitalize'>
                    {currentTier || 'Bronze'}
                  </div>
                  <div className='text-xs lg:text-sm text-purple-600 font-medium'>
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
                  className='bg-white/70 backdrop-blur-sm rounded-xl lg:rounded-2xl p-4 lg:p-5 border border-white/60'
                >
                  <div className='flex items-center justify-between mb-3'>
                    <span className='text-base lg:text-lg font-semibold text-gray-700 flex items-center gap-2'>
                      <Sparkles className='w-4 h-4 lg:w-5 lg:h-5 text-pink-500' />
                      Next: {nextTierProgress.nextTier}
                    </span>
                    <span className='text-xs lg:text-sm text-purple-600 font-medium bg-purple-100 px-2 py-1 rounded-full'>
                      {nextTierProgress.referralsNeeded} more
                    </span>
                  </div>
                  <div className='w-full bg-purple-100 rounded-full h-2 lg:h-3'>
                    <div
                      className='bg-gradient-to-r from-rose-400 to-pink-500 h-2 lg:h-3 rounded-full transition-all duration-1000'
                      style={{ width: `${nextTierProgress.progress}%` }}
                    />
                  </div>
                  <div className='mt-2 text-xs lg:text-sm text-purple-600 text-center'>
                    {nextTierProgress.progress.toFixed(1)}% complete
                  </div>
                </motion.div>
              )}

              {/* Referral Code Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className='bg-white/70 backdrop-blur-sm rounded-xl lg:rounded-2xl p-4 lg:p-6 border border-white/60'
              >
                <div className='space-y-4 lg:space-y-5'>
                  <div className='text-center'>
                    <div className='flex items-center justify-center gap-2 mb-2'>
                      <Sparkles className='w-5 h-5 lg:w-6 lg:h-6 text-rose-500' />
                      <h2 className='text-lg lg:text-xl font-semibold text-gray-700'>
                        Your Magic Code
                      </h2>
                      <Sparkles className='w-5 h-5 lg:w-6 lg:h-6 text-pink-500' />
                    </div>
                    <p className='text-sm lg:text-base text-purple-600'>
                      Share this with your lovely friends
                    </p>
                  </div>

                  {referralCode ? (
                    <div className='space-y-4'>
                      <div className='bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl lg:rounded-2xl p-4 lg:p-5 border border-rose-200'>
                        <div className='text-2xl lg:text-3xl font-mono font-bold text-gray-700 tracking-wider text-center mb-2'>
                          {referralCode}
                        </div>
                        <div className='flex items-center justify-center gap-1 text-purple-600'>
                          <Heart className='w-3 h-3 lg:w-4 lg:h-4' />
                          <span className='text-xs lg:text-sm font-medium'>
                            Made with love
                          </span>
                          <Heart className='w-3 h-3 lg:w-4 lg:h-4' />
                        </div>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleCopyCode}
                        className='w-full flex items-center justify-center gap-2 py-3 lg:py-4 bg-gradient-to-r from-rose-400 to-pink-500 text-white rounded-xl lg:rounded-2xl font-semibold text-base lg:text-lg hover:from-rose-500 hover:to-pink-600 transition-all'
                      >
                        {copied ? (
                          <Check className='w-4 h-4 lg:w-5 lg:h-5' />
                        ) : (
                          <Copy className='w-4 h-4 lg:w-5 lg:h-5' />
                        )}
                        {copied ? 'Copied! ✨' : 'Copy Code ✨'}
                      </motion.button>
                    </div>
                  ) : (
                    <div className='space-y-4'>
                      <div className='bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl lg:rounded-2xl p-4 lg:p-5 border-2 border-dashed border-rose-300 text-center'>
                        <div className='text-purple-600 text-base lg:text-lg font-medium mb-1'>
                          ✨ Create your code ✨
                        </div>
                        <div className='text-gray-600 text-sm'>
                          Generate your unique referral code
                        </div>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => generateCodeMutation.mutate()}
                        disabled={generateCodeMutation.isPending}
                        className='w-full flex items-center justify-center gap-2 py-3 lg:py-4 bg-gradient-to-r from-rose-400 to-pink-500 text-white rounded-xl lg:rounded-2xl font-semibold text-base lg:text-lg hover:from-rose-500 hover:to-pink-600 transition-all disabled:opacity-70'
                      >
                        {generateCodeMutation.isPending ? (
                          <Loader2 className='w-4 h-4 lg:w-5 lg:h-5 animate-spin' />
                        ) : (
                          <Zap className='w-4 h-4 lg:w-5 lg:h-5' />
                        )}
                        {generateCodeMutation.isPending
                          ? 'Creating...'
                          : 'Generate Code ✨'}
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
                  className='bg-white/70 backdrop-blur-sm rounded-xl lg:rounded-2xl p-4 lg:p-6 border border-white/60'
                >
                  <div className='space-y-4'>
                    <div className='text-center'>
                      <h2 className='text-lg lg:text-xl font-semibold text-gray-700 mb-1'>
                        Share the Love
                      </h2>
                      <p className='text-sm lg:text-base text-purple-600'>
                        Spread your magic everywhere! 💖
                      </p>
                    </div>

                    <div className='bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-3 border border-purple-200'>
                      <div className='text-xs text-gray-600 break-all font-mono bg-white rounded-lg p-2 border'>
                        {shareUrl}
                      </div>
                    </div>

                    <div className='grid grid-cols-1 lg:grid-cols-2 gap-3'>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleCopyLink}
                        className='flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-400 to-indigo-500 text-white rounded-xl font-semibold hover:from-purple-500 hover:to-indigo-600 transition-all'
                      >
                        {copied ? (
                          <Check className='w-4 h-4' />
                        ) : (
                          <Link2 className='w-4 h-4' />
                        )}
                        {copied ? 'Copied! 💖' : 'Copy Link 💖'}
                      </motion.button>

                      <div className='grid grid-cols-4 gap-2'>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleShare('facebook')}
                          className='p-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all'
                          title='Share on Facebook'
                        >
                          <Facebook className='w-4 h-4 mx-auto' />
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleShare('twitter')}
                          className='p-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-all'
                          title='Share on X'
                        >
                          <span className='text-base font-bold mx-auto'>𝕏</span>
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleShare('whatsapp')}
                          className='p-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all'
                          title='Share on WhatsApp'
                        >
                          <MessageSquare className='w-4 h-4 mx-auto' />
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleShare('email')}
                          className='p-3 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-all'
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
            <div className='lg:col-span-4 space-y-4 lg:space-y-5'>
              {/* How It Works */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className='bg-white/70 backdrop-blur-sm rounded-xl lg:rounded-2xl p-4 lg:p-5 border border-white/60'
              >
                <div className='text-center mb-4'>
                  <h2 className='text-lg lg:text-xl font-semibold text-gray-700 mb-1 flex items-center justify-center gap-1'>
                    <Heart className='w-5 h-5 text-rose-500' />
                    How It Works
                    <Heart className='w-5 h-5 text-rose-500' />
                  </h2>
                  <p className='text-purple-600 text-sm'>Simple & sweet!</p>
                </div>
                <div className='space-y-3'>
                  <div className='flex items-start gap-3'>
                    <div className='w-7 h-7 lg:w-8 lg:h-8 bg-gradient-to-r from-rose-400 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0'>
                      <span className='text-xs font-bold text-white'>1</span>
                    </div>
                    <div>
                      <h3 className='font-semibold text-gray-700 text-sm lg:text-base mb-0.5'>
                        Share Your Code
                      </h3>
                      <p className='text-xs lg:text-sm text-purple-600'>
                        Send your code to friends
                      </p>
                    </div>
                  </div>
                  <div className='flex items-start gap-3'>
                    <div className='w-7 h-7 lg:w-8 lg:h-8 bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full flex items-center justify-center flex-shrink-0'>
                      <span className='text-xs font-bold text-white'>2</span>
                    </div>
                    <div>
                      <h3 className='font-semibold text-gray-700 text-sm lg:text-base mb-0.5'>
                        They Join & Love It
                      </h3>
                      <p className='text-xs lg:text-sm text-purple-600'>
                        Friends sign up and enjoy
                      </p>
                    </div>
                  </div>
                  <div className='flex items-start gap-3'>
                    <div className='w-7 h-7 lg:w-8 lg:h-8 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0'>
                      <span className='text-xs font-bold text-white'>3</span>
                    </div>
                    <div>
                      <h3 className='font-semibold text-gray-700 text-sm lg:text-base mb-0.5'>
                        Earn Rewards
                      </h3>
                      <p className='text-xs lg:text-sm text-purple-600'>
                        Get {currentTierInfo.rewards} per referral! ✨
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
                className='bg-white/70 backdrop-blur-sm rounded-xl lg:rounded-2xl p-4 lg:p-5 border border-white/60'
              >
                <div className='text-center mb-4'>
                  <h2 className='text-lg lg:text-xl font-semibold text-gray-700 mb-1 flex items-center justify-center gap-1'>
                    <Crown className='w-5 h-5 text-amber-500' />
                    Reward Tiers
                    <Crown className='w-5 h-5 text-amber-500' />
                  </h2>
                  <p className='text-purple-600 text-sm'>
                    Unlock bigger rewards!
                  </p>
                </div>
                <div className='space-y-3'>
                  {/* Bronze */}
                  <div
                    className={`p-3 lg:p-4 rounded-lg border-2 transition-all duration-300 ${
                      currentTier === 'bronze'
                        ? 'border-rose-300 bg-gradient-to-r from-rose-50 to-pink-50 transform scale-105'
                        : 'border-gray-200 bg-gray-50 hover:border-rose-200 hover:bg-rose-50'
                    }`}
                  >
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            currentTier === 'bronze'
                              ? 'bg-gradient-to-r from-rose-400 to-pink-500'
                              : 'bg-gray-400'
                          }`}
                        >
                          <Star className='w-4 h-4 text-white' />
                        </div>
                        <div>
                          <div className='font-semibold text-gray-700 text-sm lg:text-base'>
                            Bronze
                          </div>
                          <div className='text-xs text-purple-600'>
                            1-4 referrals
                          </div>
                        </div>
                      </div>
                      <div className='text-right'>
                        <div className='font-semibold text-gray-700 text-base'>
                          $40
                        </div>
                        <div className='text-xs text-purple-500'>
                          per referral
                        </div>
                      </div>
                    </div>
                    {currentTier === 'bronze' && (
                      <div className='mt-2 text-xs text-rose-700 font-semibold flex items-center gap-1'>
                        <Sparkles className='w-3 h-3' />
                        Current Tier
                      </div>
                    )}
                  </div>

                  {/* Gold */}
                  <div
                    className={`p-3 lg:p-4 rounded-lg border-2 transition-all duration-300 ${
                      currentTier === 'gold'
                        ? 'border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 transform scale-105'
                        : 'border-gray-200 bg-gray-50 hover:border-amber-200 hover:bg-amber-50'
                    }`}
                  >
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            currentTier === 'gold'
                              ? 'bg-gradient-to-r from-amber-400 to-yellow-500'
                              : 'bg-gray-400'
                          }`}
                        >
                          <Crown className='w-4 h-4 text-white' />
                        </div>
                        <div>
                          <div className='font-semibold text-gray-700 text-sm lg:text-base'>
                            Gold
                          </div>
                          <div className='text-xs text-purple-600'>
                            5-9 referrals
                          </div>
                        </div>
                      </div>
                      <div className='text-right'>
                        <div className='font-semibold text-gray-700 text-base'>
                          $60
                        </div>
                        <div className='text-xs text-purple-500'>
                          per referral
                        </div>
                      </div>
                    </div>
                    {currentTier === 'gold' && (
                      <div className='mt-2 text-xs text-amber-700 font-semibold flex items-center gap-1'>
                        <Sparkles className='w-3 h-3' />
                        Current Tier
                      </div>
                    )}
                  </div>

                  {/* Platinum */}
                  <div
                    className={`p-3 lg:p-4 rounded-lg border-2 transition-all duration-300 ${
                      currentTier === 'platinum'
                        ? 'border-purple-300 bg-gradient-to-r from-purple-50 to-indigo-50 transform scale-105'
                        : 'border-gray-200 bg-gray-50 hover:border-purple-200 hover:bg-purple-50'
                    }`}
                  >
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            currentTier === 'platinum'
                              ? 'bg-gradient-to-r from-purple-500 to-indigo-500'
                              : 'bg-gray-400'
                          }`}
                        >
                          <Award className='w-4 h-4 text-white' />
                        </div>
                        <div>
                          <div className='font-semibold text-gray-700 text-sm lg:text-base'>
                            Platinum
                          </div>
                          <div className='text-xs text-purple-600'>
                            10+ referrals
                          </div>
                        </div>
                      </div>
                      <div className='text-right'>
                        <div className='font-semibold text-gray-700 text-base'>
                          $100
                        </div>
                        <div className='text-xs text-purple-500'>
                          per referral
                        </div>
                      </div>
                    </div>
                    {currentTier === 'platinum' && (
                      <div className='mt-2 text-xs text-purple-700 font-semibold flex items-center gap-1'>
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
                className='bg-white/70 backdrop-blur-sm rounded-xl lg:rounded-2xl p-4 lg:p-6 border border-white/60'
              >
                <div className='text-center mb-5'>
                  <h2 className='text-lg lg:text-2xl font-semibold text-gray-700 mb-1 flex items-center justify-center gap-2'>
                    <Trophy className='w-6 h-6 lg:w-7 lg:h-7 text-amber-500' />
                    Top Referrers This Month
                    <Trophy className='w-6 h-6 lg:w-7 lg:h-7 text-amber-500' />
                  </h2>
                  <p className='text-sm lg:text-base text-purple-600'>
                    Our lovely community leaders ✨
                  </p>
                </div>
                <div className='grid gap-3 lg:gap-4 lg:grid-cols-2 xl:grid-cols-3'>
                  {leaderboardData.leaderboard
                    .slice(0, 6)
                    .map((user, index) => (
                      <motion.div
                        key={user.userId}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.9 + index * 0.1 }}
                        className='flex items-center justify-between p-3 lg:p-4 bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl border border-rose-200 hover:bg-gradient-to-r hover:from-rose-100 hover:to-pink-100 transition-all duration-300 hover:scale-105'
                      >
                        <div className='flex items-center gap-3'>
                          <div
                            className={`w-8 h-8 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white ${
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
                            <div className='font-semibold text-gray-700 text-sm lg:text-base'>
                              {user.name}
                            </div>
                            <div className='text-xs lg:text-sm text-purple-600 flex items-center gap-1'>
                              <Heart className='w-3 h-3' />
                              {user.totalReferrals} referrals
                            </div>
                          </div>
                        </div>
                        <div className='text-right'>
                          <div className='font-semibold text-gray-700 text-sm lg:text-base'>
                            ${user.totalPointsEarned}
                          </div>
                          <div className='text-xs text-purple-500'>earned</div>
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
