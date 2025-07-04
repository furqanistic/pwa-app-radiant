import SpinWheel from '@/components/Spin/SpinWheel'
import { Button } from '@/components/ui/button'
import {
  Award,
  Calendar,
  Crown,
  Gift,
  Heart,
  RefreshCw,
  Sparkles,
  Star,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
import { default as React, useState } from 'react'
import Layout from '../Layout/Layout'

// Enhanced Card Component matching your design
const DashboardCard = ({ children, className = '', gradient = 'default' }) => {
  const gradients = {
    default: ' ',
    pink: 'bg-gradient-to-br from-pink-50 to-pink-100 border-2 border-pink-200',
    purple:
      'bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200',
    indigo:
      'bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200',
  }

  return (
    <div
      className={`${gradients[gradient]} rounded-2xl sm:rounded-3xl p-4 sm:p-6 transition-all duration-400 ${className}`}
    >
      {children}
    </div>
  )
}

// Professional Scratch Card
const ScratchCard = ({ onReveal, revealed, prize }) => {
  const [isScratching, setIsScratching] = useState(false)

  const handleScratch = () => {
    if (!revealed) {
      setIsScratching(true)
      setTimeout(() => {
        onReveal()
        setIsScratching(false)
      }, 800)
    }
  }

  return (
    <div className='w-full h-64'>
      <div
        className='relative w-full h-full bg-white border-2 border-pink-200 rounded-2xl  overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-105'
        onClick={handleScratch}
      >
        {/* Prize Content */}
        <div className='absolute inset-0 bg-gradient-to-br from-pink-50 to-purple-50 flex flex-col items-center justify-center p-6'>
          <div
            className={`text-center transition-all duration-500 ${
              revealed ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
            }`}
            style={{ transitionDelay: revealed ? '100ms' : '0ms' }}
          >
            <div className='bg-gradient-to-r from-pink-500 to-purple-500 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 mx-auto '>
              <Award className='text-white' size={28} />
            </div>
            <h3 className='text-lg font-bold text-gray-800 mb-2 leading-tight px-2'>
              {prize}
            </h3>
            <p className='text-gray-600 text-sm'>Congratulations! 🎉</p>
          </div>
        </div>

        {/* Scratch Overlay */}
        <div
          className={`absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center transition-opacity duration-800 ${
            revealed ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <div className='text-center text-white'>
            <div
              className={`transition-transform duration-400 ${
                isScratching ? 'animate-pulse scale-110' : ''
              }`}
            >
              <Sparkles size={36} className='mb-3 mx-auto' />
            </div>
            <h4 className='text-lg font-semibold mb-2'>
              {isScratching ? 'Revealing...' : 'Tap to Scratch'}
            </h4>
            <p className='text-sm text-pink-100'>Your reward awaits ✨</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Auto-select occasion
const getRandomOccasion = () => {
  const occasions = [
    'birthday',
    'holiday',
    'referral',
    'seasonal',
    'anniversary',
    'welcome',
  ]
  return occasions[Math.floor(Math.random() * occasions.length)]
}

// Main Component
const ScratchSpinPage = () => {
  const [mode, setMode] = useState('select')
  const [revealed, setRevealed] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const [trigger] = useState(() => getRandomOccasion())
  const [fadeIn, setFadeIn] = useState(true)

  const prizes = {
    birthday: 'Birthday Special: Free Facial Treatment',
    holiday: 'Holiday Bonus: 30% OFF All Services',
    referral: 'Referral Reward: $75 Beauty Credit',
    seasonal: 'Spring Special: Renewal Package',
    anniversary: 'Anniversary Gift: $100 Credit',
    welcome: 'Welcome Back: 25% OFF Package',
  }

  const triggerIcons = {
    birthday: Calendar,
    holiday: Star,
    referral: Users,
    seasonal: Sparkles,
    anniversary: Heart,
    welcome: Gift,
  }

  const triggerMessages = {
    birthday: '🎂 Happy Birthday! We have something special for you...',
    holiday: '🎄 Happy Holidays! Your seasonal surprise awaits...',
    referral: "👥 Thank you for the referral! Here's your reward...",
    seasonal: '🌸 Spring is here! Time for your seasonal treat...',
    anniversary: '💝 Celebrating your anniversary with us...',
    welcome: '💕 We miss you! Welcome back with this special offer...',
  }

  const handleReveal = () => setRevealed(true)
  const handleSpin = () => {
    setSpinning(true)
    setTimeout(() => {
      setSpinning(false)
      setRevealed(true)
    }, 4000)
  }

  const resetGame = () => {
    setFadeIn(false)
    setTimeout(() => {
      setMode('select')
      setRevealed(false)
      setSpinning(false)
      setFadeIn(true)
    }, 300)
  }

  const TriggerIcon = triggerIcons[trigger]

  return (
    <Layout>
      <div className='min-h-screen bg-gradient-to-br from-pink-25 via-purple-25 to-indigo-25 p-3 sm:p-4 lg:p-6'>
        <div className='max-w-4xl mx-auto'>
          {/* Header */}
          <div
            className={`text-center mb-6 sm:mb-8 transition-all duration-500 ${
              fadeIn ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
            }`}
          >
            <div className='inline-flex items-center gap-2 bg-white border-2 border-pink-200 rounded-full px-4 py-2 mb-4'>
              <Sparkles className='text-pink-500' size={20} />
              <span className='text-gray-700 font-semibold text-sm'>
                RadiantAI Rewards
              </span>
            </div>
            <h1 className='text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-4'>
              Your Special Reward
            </h1>
            <p className='text-gray-600 text-lg max-w-xl mx-auto'>
              Choose your preferred way to reveal your exclusive beauty reward
            </p>
          </div>

          {/* Occasion Display */}
          <div
            className={`mb-6 sm:mb-8 transition-all duration-500 ${
              fadeIn ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
          >
            <DashboardCard className='max-w-md mx-auto'>
              <div className='flex items-center gap-4'>
                <div className='bg-gradient-to-r from-pink-500 to-purple-500 rounded-2xl p-3 flex-shrink-0'>
                  <TriggerIcon className='text-white' size={24} />
                </div>
                <div className='min-w-0 flex-1'>
                  <h3 className='text-lg font-bold text-gray-800 capitalize'>
                    {trigger === 'welcome' ? 'Welcome Back' : trigger} Reward
                  </h3>
                  <p className='text-gray-600 text-sm'>
                    {triggerMessages[trigger]}
                  </p>
                </div>
              </div>
            </DashboardCard>
          </div>

          {/* Content with transitions */}
          <div className='relative'>
            {mode === 'select' && (
              <div
                className={`space-y-6 sm:space-y-8 transition-all duration-500 ${
                  mode === 'select' && fadeIn
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-4'
                }`}
              >
                {/* Selection Cards */}
                <div className='grid md:grid-cols-2 gap-6'>
                  <div
                    onClick={() => {
                      setFadeIn(false)
                      setTimeout(() => {
                        setMode('scratch')
                        setFadeIn(true)
                      }, 300)
                    }}
                    className='cursor-pointer transition-transform duration-300 hover:scale-102 active:scale-98'
                  >
                    <DashboardCard gradient='pink' className='h-80'>
                      <div className='h-full flex flex-col'>
                        <div className='bg-gradient-to-r from-pink-500 to-purple-500 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-6 flex-shrink-0'>
                          <Gift className='text-white' size={32} />
                        </div>
                        <h3 className='text-2xl font-bold text-gray-800 text-center mb-4 flex-shrink-0'>
                          Scratch Card
                        </h3>
                        <p className='text-gray-600 text-center flex-1 flex items-center justify-center mb-6'>
                          Tap to reveal your exclusive beauty reward hidden
                          beneath the surface
                        </p>
                        <Button className='w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold py-4 text-lg rounded-xl flex-shrink-0 hover:from-pink-600 hover:to-purple-600 transition-all'>
                          Choose Scratch Card
                        </Button>
                      </div>
                    </DashboardCard>
                  </div>

                  <div
                    onClick={() => {
                      setFadeIn(false)
                      setTimeout(() => {
                        setMode('spin')
                        setFadeIn(true)
                      }, 300)
                    }}
                    className='cursor-pointer transition-transform duration-300 hover:scale-102 active:scale-98'
                  >
                    <DashboardCard gradient='purple' className='h-80'>
                      <div className='h-full flex flex-col'>
                        <div className='bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-6 flex-shrink-0'>
                          <Trophy className='text-white' size={32} />
                        </div>
                        <h3 className='text-2xl font-bold text-gray-800 text-center mb-4 flex-shrink-0'>
                          Spin to Win
                        </h3>
                        <p className='text-gray-600 text-center flex-1 flex items-center justify-center mb-6'>
                          Spin the wheel of fortune for your chance at amazing
                          beauty prizes
                        </p>
                        <Button className='w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold py-4 text-lg rounded-xl flex-shrink-0 hover:from-purple-600 hover:to-indigo-600 transition-all'>
                          Choose Spin Wheel
                        </Button>
                      </div>
                    </DashboardCard>
                  </div>
                </div>

                {/* Rewards Preview */}
                <DashboardCard gradient='indigo'>
                  <div className='text-center mb-6'>
                    <h3 className='text-2xl font-bold text-gray-800 mb-2'>
                      Possible Rewards 💝
                    </h3>
                    <p className='text-gray-600'>
                      Discover what amazing prizes await you
                    </p>
                  </div>
                  <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                    <div className='bg-white border-2 border-pink-200 rounded-2xl p-6 text-center hover:border-pink-300 transition-colors'>
                      <div className='bg-gradient-to-r from-pink-100 to-pink-200 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4'>
                        <Star className='text-pink-600' size={24} />
                      </div>
                      <span className='font-bold text-gray-800'>
                        Up to 40% OFF Services
                      </span>
                    </div>
                    <div className='bg-white border-2 border-purple-200 rounded-2xl p-6 text-center hover:border-purple-300 transition-colors'>
                      <div className='bg-gradient-to-r from-purple-100 to-purple-200 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4'>
                        <Heart className='text-purple-600' size={24} />
                      </div>
                      <span className='font-bold text-gray-800'>
                        Complimentary Treatments
                      </span>
                    </div>
                    <div className='bg-white border-2 border-indigo-200 rounded-2xl p-6 text-center hover:border-indigo-300 transition-colors'>
                      <div className='bg-gradient-to-r from-indigo-100 to-indigo-200 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4'>
                        <Crown className='text-indigo-600' size={24} />
                      </div>
                      <span className='font-bold text-gray-800'>
                        Premium Beauty Kits
                      </span>
                    </div>
                  </div>
                </DashboardCard>
              </div>
            )}

            {mode === 'scratch' && (
              <div
                className={`transition-all duration-500 ${
                  mode === 'scratch' && fadeIn
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-4'
                }`}
              >
                <DashboardCard className='max-w-lg mx-auto'>
                  <h2 className='text-2xl font-bold text-gray-800 text-center mb-8'>
                    Your {trigger.charAt(0).toUpperCase() + trigger.slice(1)}{' '}
                    Surprise! 🎁
                  </h2>

                  <ScratchCard
                    onReveal={handleReveal}
                    revealed={revealed}
                    prize={prizes[trigger]}
                  />

                  {revealed && (
                    <div
                      className={`mt-8 space-y-4 transition-all duration-500 ${
                        revealed
                          ? 'opacity-100 translate-y-0'
                          : 'opacity-0 translate-y-4'
                      }`}
                    >
                      <div className='flex gap-4'>
                        <Button
                          onClick={resetGame}
                          variant='outline'
                          className='flex-1 border-2 border-pink-300 text-pink-700 hover:bg-pink-50 py-3 rounded-xl font-semibold'
                        >
                          Try Again
                        </Button>
                        <Button className='flex-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-600 transition-all'>
                          Claim Reward
                        </Button>
                      </div>
                    </div>
                  )}
                </DashboardCard>
              </div>
            )}

            {mode === 'spin' && (
              <div
                className={`transition-all duration-500 ${
                  mode === 'spin' && fadeIn
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-4'
                }`}
              >
                <DashboardCard className='max-w-2xl mx-auto'>
                  <h2 className='text-2xl font-bold text-gray-800 text-center mb-4'>
                    Spin for Your{' '}
                    {trigger.charAt(0).toUpperCase() + trigger.slice(1)} Prize!
                    🎯
                  </h2>

                  <SpinWheel
                    onSpin={handleSpin}
                    spinning={spinning}
                    result={revealed}
                  />

                  <div className='text-center mt-4'>
                    {spinning ? (
                      <div className='space-y-2'>
                        <p className='text-lg font-semibold text-purple-600 animate-pulse'>
                          🎯 Spinning the wheel of fortune...
                        </p>
                        <p className='text-gray-500 text-sm'>Good luck! ✨</p>
                      </div>
                    ) : (
                      <p className='text-gray-600 text-lg'>
                        Tap the center button to spin! 🌟
                      </p>
                    )}
                  </div>

                  {revealed && (
                    <div
                      className={`mt-8 space-y-6 transition-all duration-500 ${
                        revealed
                          ? 'opacity-100 translate-y-0'
                          : 'opacity-0 translate-y-4'
                      }`}
                    >
                      <div className='bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-200 rounded-2xl p-6 text-center'>
                        <h3 className='text-xl font-bold text-gray-800 mb-2'>
                          🎉 Congratulations!
                        </h3>
                        <p className='text-gray-700 text-lg'>
                          {prizes[trigger]}
                        </p>
                      </div>

                      <div className='flex gap-4'>
                        <Button
                          onClick={resetGame}
                          variant='outline'
                          className='flex-1 border-2 border-purple-300 text-purple-700 hover:bg-purple-50 py-3 rounded-xl font-semibold'
                        >
                          Play Again
                        </Button>
                        <Button className='flex-1 bg-gradient-to-r from-purple-500 to-indigo-500 text-white py-3 rounded-xl font-semibold hover:from-purple-600 hover:to-indigo-600 transition-all'>
                          Claim Reward
                        </Button>
                      </div>
                    </div>
                  )}
                </DashboardCard>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default ScratchSpinPage
