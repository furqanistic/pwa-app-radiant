import { motion } from 'framer-motion'
import {
  Check,
  Copy,
  Crown,
  Facebook,
  Gift,
  Heart,
  Link2,
  Mail,
  MessageCircle,
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

// Reusable Components
const GradientCard = ({ children, className = '', delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.6 }}
    className={`bg-white/90 backdrop-blur-lg rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-xl border border-white/50 ${className}`}
  >
    {children}
  </motion.div>
)

const IconCard = ({ icon: Icon, title, description, gradient, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay, duration: 0.5 }}
    whileHover={{ scale: 1.02 }}
    className='group cursor-pointer'
  >
    <div className='bg-white/90 backdrop-blur-lg rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border border-white/50 hover:shadow-xl transition-all duration-300'>
      <div
        className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl ${gradient} flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform duration-300`}
      >
        <Icon className='w-6 h-6 md:w-8 md:h-8 text-white' />
      </div>
      <h3 className='text-sm md:text-lg font-bold text-gray-900 mb-1 md:mb-2'>
        {title}
      </h3>
      <p className='text-xs md:text-sm text-gray-600 leading-relaxed'>
        {description}
      </p>
    </div>
  </motion.div>
)

const StatCard = ({ icon: Icon, value, label, gradient, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    className='text-center'
  >
    <div
      className={`w-12 h-12 md:w-16 md:h-16 ${gradient} rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-2 md:mb-3`}
    >
      <Icon className='w-6 h-6 md:w-8 md:h-8 text-white' />
    </div>
    <div className='text-lg md:text-2xl font-bold text-gray-900 mb-1'>
      {value}
    </div>
    <div className='text-xs md:text-sm text-gray-600'>{label}</div>
  </motion.div>
)

const ShareButton = ({ icon: Icon, platform, color, onClick }) => (
  <motion.button
    whileTap={{ scale: 0.95 }}
    whileHover={{ scale: 1.05 }}
    onClick={onClick}
    className={`p-3 md:p-4 ${color} rounded-xl md:rounded-2xl text-white shadow-lg hover:shadow-xl transition-all duration-300`}
  >
    <Icon className='w-4 h-4 md:w-5 md:h-5' />
  </motion.button>
)

// Main Referral System Component
const ReferralSystem = () => {
  const [referralCode, setReferralCode] = useState('RADIANT-SARAH-2024')
  const [copied, setCopied] = useState(false)
  const [shareUrl] = useState(`https://radiantai.com/join?ref=${referralCode}`)

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleShare = (platform) => {
    const text =
      'Transform your beauty business with RadiantAI! Join me and get exclusive rewards 💫'
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

  return (
    <Layout>
      <div className='min-h-screen bg-gradient-to-br from-gray-50 to-purple-50/40 overflow-x-hidden'>
        {/* Background Elements */}
        <div className='fixed inset-0 overflow-hidden pointer-events-none'>
          <div className='absolute top-20 left-4 md:left-1/4 w-32 h-32 md:w-64 md:h-64 bg-pink-200/20 md:bg-pink-200/30 rounded-full blur-2xl md:blur-3xl animate-pulse' />
          <div
            className='absolute bottom-20 right-4 md:right-1/4 w-40 h-40 md:w-80 md:h-80 bg-purple-200/15 md:bg-purple-200/20 rounded-full blur-2xl md:blur-3xl animate-pulse'
            style={{ animationDelay: '1s' }}
          />
        </div>

        <div className='relative z-10 w-full max-w-md md:max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-12'>
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className='text-center mb-8 md:mb-16'
          >
            <div className='flex items-center justify-center gap-2 md:gap-3 mb-4 md:mb-6'>
              <div className='w-8 h-8 md:w-12 md:h-12 bg-gradient-to-br from-pink-500 to-purple-500 rounded-xl md:rounded-2xl flex items-center justify-center'>
                <Gift className='w-4 h-4 md:w-6 md:h-6 text-white' />
              </div>
              <h1 className='text-3xl md:text-5xl lg:text-6xl font-black bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent'>
                Referral System
              </h1>
            </div>
            <p className='text-sm md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed'>
              <span className='md:hidden'>Share RadiantAI & earn rewards</span>
              <span className='hidden md:block'>
                Earn exclusive rewards for every successful referral
              </span>
            </p>
          </motion.div>

          {/* Stats Overview */}
          <GradientCard className='mb-8 md:mb-12' delay={0.1}>
            <div className='grid grid-cols-3 gap-4 md:gap-8'>
              <StatCard
                icon={Users}
                value='12'
                label='Total Referrals'
                gradient='bg-gradient-to-br from-pink-500 to-purple-500'
                delay={0.2}
              />
              <StatCard
                icon={Trophy}
                value='$480'
                label='Earned Rewards'
                gradient='bg-gradient-to-br from-purple-500 to-indigo-500'
                delay={0.3}
              />
              <StatCard
                icon={Crown}
                value='Gold'
                label='Status Level'
                gradient='bg-gradient-to-br from-yellow-500 to-orange-500'
                delay={0.4}
              />
            </div>
          </GradientCard>

          {/* Main Content Grid */}
          <div className='grid md:grid-cols-2 gap-6 md:gap-8 mb-8 md:mb-12'>
            {/* Referral Code Section */}
            <GradientCard delay={0.2}>
              <div className='text-center'>
                <div className='w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-pink-500 to-purple-500 rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto mb-4 md:mb-6'>
                  <Sparkles className='w-8 h-8 md:w-10 md:h-10 text-white' />
                </div>

                <h2 className='text-xl md:text-2xl font-bold text-gray-900 mb-2 md:mb-3'>
                  Your Referral Code
                </h2>
                <p className='text-sm md:text-base text-gray-600 mb-6 md:mb-8'>
                  Share this code with friends and colleagues
                </p>

                <div className='bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl md:rounded-2xl p-4 md:p-6 mb-4 md:mb-6'>
                  <div className='text-2xl md:text-3xl font-mono font-bold text-gray-900 mb-3 md:mb-4 tracking-wider'>
                    {referralCode}
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCopyCode}
                    className='w-full flex items-center justify-center gap-2 py-3 md:py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg md:rounded-xl font-medium hover:shadow-lg transition-all'
                  >
                    {copied ? (
                      <Check className='w-4 h-4 md:w-5 md:h-5' />
                    ) : (
                      <Copy className='w-4 h-4 md:w-5 md:h-5' />
                    )}
                    {copied ? 'Copied!' : 'Copy Code'}
                  </motion.button>
                </div>
              </div>
            </GradientCard>

            {/* Share Links Section */}
            <GradientCard delay={0.3}>
              <div className='text-center'>
                <div className='w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto mb-4 md:mb-6'>
                  <Share2 className='w-8 h-8 md:w-10 md:h-10 text-white' />
                </div>

                <h2 className='text-xl md:text-2xl font-bold text-gray-900 mb-2 md:mb-3'>
                  Share Your Link
                </h2>
                <p className='text-sm md:text-base text-gray-600 mb-6 md:mb-8'>
                  Spread the word on social media
                </p>

                <div className='bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl md:rounded-2xl p-4 md:p-6 mb-4 md:mb-6'>
                  <div className='text-xs md:text-sm text-gray-600 mb-2 md:mb-3 break-all'>
                    {shareUrl}
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCopyLink}
                    className='w-full flex items-center justify-center gap-2 py-3 md:py-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg md:rounded-xl font-medium hover:shadow-lg transition-all'
                  >
                    {copied ? (
                      <Check className='w-4 h-4 md:w-5 md:h-5' />
                    ) : (
                      <Link2 className='w-4 h-4 md:w-5 md:h-5' />
                    )}
                    {copied ? 'Copied!' : 'Copy Link'}
                  </motion.button>
                </div>

                <div className='grid grid-cols-4 gap-3 md:gap-4'>
                  <ShareButton
                    icon={Facebook}
                    platform='facebook'
                    color='bg-blue-600'
                    onClick={() => handleShare('facebook')}
                  />
                  <ShareButton
                    icon={Twitter}
                    platform='twitter'
                    color='bg-sky-500'
                    onClick={() => handleShare('twitter')}
                  />
                  <ShareButton
                    icon={MessageCircle}
                    platform='whatsapp'
                    color='bg-green-500'
                    onClick={() => handleShare('whatsapp')}
                  />
                  <ShareButton
                    icon={Mail}
                    platform='email'
                    color='bg-gray-600'
                    onClick={() => handleShare('email')}
                  />
                </div>
              </div>
            </GradientCard>
          </div>

          {/* How It Works */}
          <GradientCard className='mb-8 md:mb-12' delay={0.4}>
            <div className='text-center mb-6 md:mb-8'>
              <h2 className='text-2xl md:text-3xl font-bold text-gray-900 mb-2 md:mb-3'>
                How It Works
              </h2>
              <p className='text-sm md:text-base text-gray-600'>
                Simple steps to start earning rewards
              </p>
            </div>

            <div className='grid md:grid-cols-3 gap-4 md:gap-6'>
              <IconCard
                icon={Share2}
                title='Share Your Code'
                description='Send your unique referral code or link to friends and colleagues'
                gradient='bg-gradient-to-br from-pink-500 to-purple-500'
                delay={0.5}
              />
              <IconCard
                icon={Heart}
                title='They Join & Love It'
                description='Your referrals sign up and experience the power of RadiantAI'
                gradient='bg-gradient-to-br from-purple-500 to-indigo-500'
                delay={0.6}
              />
              <IconCard
                icon={Zap}
                title='You Earn Rewards'
                description='Get $40 credit for each successful referral that becomes a paying customer'
                gradient='bg-gradient-to-br from-indigo-500 to-pink-500'
                delay={0.7}
              />
            </div>
          </GradientCard>

          {/* Reward Tiers */}
          <GradientCard delay={0.5}>
            <div className='text-center mb-6 md:mb-8'>
              <h2 className='text-2xl md:text-3xl font-bold text-gray-900 mb-2 md:mb-3'>
                Reward Tiers
              </h2>
              <p className='text-sm md:text-base text-gray-600'>
                Unlock bigger rewards as you refer more
              </p>
            </div>

            <div className='grid md:grid-cols-3 gap-4 md:gap-6'>
              <div className='bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl md:rounded-2xl p-4 md:p-6 text-center border-2 border-gray-200'>
                <div className='w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-4'>
                  <Star className='w-6 h-6 md:w-8 md:h-8 text-white' />
                </div>
                <h3 className='text-lg md:text-xl font-bold text-gray-900 mb-2'>
                  Bronze
                </h3>
                <p className='text-sm md:text-base text-gray-600 mb-3 md:mb-4'>
                  1-4 Referrals
                </p>
                <p className='text-xl md:text-2xl font-bold text-gray-900'>
                  $40
                </p>
                <p className='text-xs md:text-sm text-gray-500'>per referral</p>
              </div>

              <div className='bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl md:rounded-2xl p-4 md:p-6 text-center border-2 border-yellow-200 relative overflow-hidden'>
                <div className='absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-medium'>
                  Current
                </div>
                <div className='w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-4'>
                  <Crown className='w-6 h-6 md:w-8 md:h-8 text-white' />
                </div>
                <h3 className='text-lg md:text-xl font-bold text-gray-900 mb-2'>
                  Gold
                </h3>
                <p className='text-sm md:text-base text-gray-600 mb-3 md:mb-4'>
                  5-9 Referrals
                </p>
                <p className='text-xl md:text-2xl font-bold text-gray-900'>
                  $60
                </p>
                <p className='text-xs md:text-sm text-gray-500'>per referral</p>
              </div>

              <div className='bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl md:rounded-2xl p-4 md:p-6 text-center border-2 border-purple-200'>
                <div className='w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-4'>
                  <TrendingUp className='w-6 h-6 md:w-8 md:h-8 text-white' />
                </div>
                <h3 className='text-lg md:text-xl font-bold text-gray-900 mb-2'>
                  Platinum
                </h3>
                <p className='text-sm md:text-base text-gray-600 mb-3 md:mb-4'>
                  10+ Referrals
                </p>
                <p className='text-xl md:text-2xl font-bold text-gray-900'>
                  $100
                </p>
                <p className='text-xs md:text-sm text-gray-500'>per referral</p>
              </div>
            </div>
          </GradientCard>
        </div>
      </div>
    </Layout>
  )
}

export default ReferralSystem
