import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  ChevronDown,
  Gift,
  Heart,
  MapPin,
  Search,
  Sparkles,
  Star,
  Users,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'

// Mock data for spas
const spaData = [
  { id: 1, name: 'Luxe Beauty Spa', location: 'Beverly Hills', rating: 4.9 },
  {
    id: 2,
    name: 'Radiant Wellness Center',
    location: 'Manhattan',
    rating: 4.8,
  },
  { id: 3, name: 'Serenity Med Spa', location: 'Miami Beach', rating: 4.9 },
  { id: 4, name: 'Elite Aesthetics', location: 'Los Angeles', rating: 4.7 },
  { id: 5, name: 'Bloom Beauty Studio', location: 'Chicago', rating: 4.8 },
  { id: 6, name: 'Pure Glow Clinic', location: 'Austin', rating: 4.9 },
  { id: 7, name: 'Rejuvenate Med Spa', location: 'Seattle', rating: 4.6 },
  { id: 8, name: 'Crystal Clear Aesthetics', location: 'Denver', rating: 4.8 },
]

const GradientText = ({ children, className = '' }) => (
  <span
    className={`bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent ${className}`}
  >
    {children}
  </span>
)

// Enhanced Confetti Particle Component
const ConfettiParticle = ({
  delay = 0,
  color = 'pink',
  shape = 'circle',
  size = 'normal',
  burstIndex = 0,
}) => {
  const colors = {
    pink: 'from-pink-400 to-pink-600',
    purple: 'from-purple-400 to-purple-600',
    yellow: 'from-yellow-300 to-yellow-500',
    blue: 'from-blue-400 to-blue-600',
    green: 'from-green-400 to-green-600',
    orange: 'from-orange-400 to-orange-600',
    red: 'from-red-400 to-red-600',
    indigo: 'from-indigo-400 to-indigo-600',
    cyan: 'from-cyan-400 to-cyan-600',
  }

  const sizes = {
    small: 'w-2 h-2',
    normal: 'w-3 h-3',
    large: 'w-4 h-4',
  }

  const shapes = {
    circle: 'rounded-full',
    square: 'rounded-sm',
    star: 'rounded-full',
  }

  // Different burst patterns
  const burstPatterns = [
    { x: 0, y: 0 }, // center
    { x: -150, y: -50 }, // top left
    { x: 150, y: -50 }, // top right
    { x: -100, y: 0 }, // left
    { x: 100, y: 0 }, // right
  ]

  const startPos = burstPatterns[burstIndex] || burstPatterns[0]
  const randomX = Math.random() * 600 - 300
  const randomY = Math.random() * 200 - 400

  return (
    <motion.div
      className={`absolute bg-gradient-to-br ${colors[color]} ${sizes[size]} ${shapes[shape]} shadow-lg`}
      initial={{
        opacity: 0,
        scale: 0,
        x: startPos.x,
        y: startPos.y,
        rotate: 0,
      }}
      animate={{
        opacity: [0, 1, 1, 1, 0],
        scale: [0, 1.2, 1, 0.8, 0],
        y: [startPos.y, randomY - 100, randomY - 200, randomY - 350],
        x: [startPos.x, randomX * 0.3, randomX * 0.7, randomX],
        rotate: [0, 180, 360, 540, 720],
      }}
      transition={{
        duration: 3.5,
        delay: delay,
        ease: [0.23, 1, 0.32, 1],
      }}
      style={{
        left: '50%',
        top: '50%',
      }}
    />
  )
}

// Sparkle Effect Component
const SparkleEffect = ({ delay = 0 }) => {
  return (
    <motion.div
      className='absolute w-1 h-1 bg-white rounded-full shadow-lg'
      initial={{
        opacity: 0,
        scale: 0,
        x: Math.random() * 400 - 200,
        y: Math.random() * 400 - 200,
      }}
      animate={{
        opacity: [0, 1, 0],
        scale: [0, 3, 0],
        rotate: [0, 180],
      }}
      transition={{
        duration: 1.5,
        delay: delay,
        ease: 'easeOut',
      }}
      style={{
        left: '50%',
        top: '50%',
        filter: 'blur(0.5px)',
      }}
    />
  )
}

// Emoji Confetti Component
const EmojiConfetti = ({ delay = 0, emoji = '🎉' }) => {
  const emojis = ['🎉', '🎊', '✨', '🌟', '💫', '🎁', '🏆', '💎', '🔥', '⭐']
  const selectedEmoji =
    emoji === 'random'
      ? emojis[Math.floor(Math.random() * emojis.length)]
      : emoji

  return (
    <motion.div
      className='absolute text-2xl select-none'
      initial={{
        opacity: 0,
        scale: 0,
        x: Math.random() * 300 - 150,
        y: 0,
        rotate: 0,
      }}
      animate={{
        opacity: [0, 1, 1, 0],
        scale: [0, 1.5, 1, 0.5],
        y: [-50, -150, -250, -400],
        x: Math.random() * 500 - 250,
        rotate: [0, 360, 720],
      }}
      transition={{
        duration: 4,
        delay: delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      style={{
        left: '50%',
        top: '50%',
      }}
    >
      {selectedEmoji}
    </motion.div>
  )
}

// Enhanced Celebration Effect Component
const CelebrationEffect = ({ show, onComplete }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onComplete, 5000)
      return () => clearTimeout(timer)
    }
  }, [show, onComplete])

  if (!show) return null

  const confettiColors = [
    'pink',
    'purple',
    'yellow',
    'blue',
    'green',
    'orange',
    'red',
    'indigo',
    'cyan',
    'emerald',
    'rose',
    'violet',
  ]
  const confettiShapes = ['circle', 'square', 'star', 'triangle']
  const confettiSizes = ['small', 'normal', 'large']

  return (
    <motion.div
      className='fixed inset-0 z-50 flex items-center justify-center pointer-events-none'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Animated background overlay */}
      <motion.div
        className='absolute inset-0 bg-black/20'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      />

      {/* Radial light burst effect */}
      <motion.div
        className='absolute inset-0 pointer-events-none'
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 4, opacity: [0, 0.8, 0] }}
        transition={{ duration: 1.2, delay: 0.5 }}
      >
        <div className='w-32 h-32 mx-auto mt-[50vh] -translate-y-16 rounded-full bg-gradient-radial from-yellow-400/30 via-pink-400/20 to-transparent' />
      </motion.div>

      {/* Screen shake effect with enhanced particles */}
      <motion.div
        className='absolute inset-0'
        animate={{
          x: [0, -3, 3, -2, 2, -1, 1, 0],
          y: [0, -2, 2, -1, 1, -1, 1, 0],
        }}
        transition={{
          duration: 0.8,
          delay: 0.3,
          ease: 'easeInOut',
        }}
      >
        {/* Enhanced confetti with more particles */}
        {[...Array(120)].map((_, i) => (
          <ConfettiParticle
            key={`confetti-${i}`}
            delay={Math.random() * 1.2}
            color={confettiColors[i % confettiColors.length]}
            shape={confettiShapes[i % confettiShapes.length]}
            size={confettiSizes[i % confettiSizes.length]}
            burstIndex={i % 8}
          />
        ))}

        {/* Enhanced sparkle effects */}
        {[...Array(45)].map((_, i) => (
          <SparkleEffect key={`sparkle-${i}`} delay={Math.random() * 2} />
        ))}

        {/* Floating orbs */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={`orb-${i}`}
            className='absolute w-3 h-3 rounded-full bg-gradient-to-r from-pink-400 to-purple-400 opacity-70'
            style={{
              left: `${20 + Math.random() * 60}%`,
              top: `${30 + Math.random() * 40}%`,
            }}
            animate={{
              y: [-20, -120],
              x: [0, Math.random() * 100 - 50],
              opacity: [0, 0.8, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              delay: Math.random() * 1.5,
              ease: 'easeOut',
            }}
          />
        ))}

        {/* More emoji confetti */}
        {[...Array(20)].map((_, i) => (
          <EmojiConfetti
            key={`emoji-${i}`}
            delay={Math.random() * 1.5}
            emoji='random'
          />
        ))}
      </motion.div>

      {/* Enhanced main card with glow effects */}
      <motion.div
        className='relative'
        initial={{ scale: 0, y: 100, rotate: -15 }}
        animate={{ scale: 1, y: 0, rotate: 0 }}
        transition={{
          type: 'spring',
          stiffness: 180,
          damping: 12,
          delay: 0.8,
        }}
      >
        {/* Outer glow */}
        <motion.div
          className='absolute inset-0 rounded-3xl bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 opacity-40 blur-xl scale-110'
          animate={{
            scale: [1.1, 1.3, 1.1],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Main card */}
        <motion.div
          className='relative bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border-2 border-white/60 text-center max-w-sm mx-4 overflow-hidden'
          animate={{
            boxShadow: [
              '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              '0 35px 70px -12px rgba(236, 72, 153, 0.4)',
              '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {/* Animated background gradient */}
          <motion.div
            className='absolute inset-0 rounded-3xl'
            animate={{
              background: [
                'linear-gradient(45deg, rgba(236, 72, 153, 0.15), rgba(168, 85, 247, 0.15), rgba(99, 102, 241, 0.15))',
                'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(16, 185, 129, 0.15), rgba(236, 72, 153, 0.15))',
                'linear-gradient(225deg, rgba(16, 185, 129, 0.15), rgba(236, 72, 153, 0.15), rgba(168, 85, 247, 0.15))',
                'linear-gradient(315deg, rgba(168, 85, 247, 0.15), rgba(99, 102, 241, 0.15), rgba(16, 185, 129, 0.15))',
                'linear-gradient(45deg, rgba(236, 72, 153, 0.15), rgba(168, 85, 247, 0.15), rgba(99, 102, 241, 0.15))',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          />

          {/* Floating sparkles inside card */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={`card-sparkle-${i}`}
              className='absolute w-1 h-1 bg-yellow-400 rounded-full'
              style={{
                left: `${10 + Math.random() * 80}%`,
                top: `${10 + Math.random() * 80}%`,
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 1.5,
                delay: Math.random() * 2 + 1,
                repeat: Infinity,
                repeatDelay: Math.random() * 3,
              }}
            />
          ))}

          <motion.div
            className='relative z-10'
            animate={{
              scale: [1, 1.02, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {/* Enhanced emoji with multiple animations */}
            <motion.div
              className='text-7xl mb-6 relative'
              animate={{
                scale: [1, 1.4, 1.1, 1.3, 1],
                rotate: [0, 20, -15, 10, 0],
                y: [0, -5, 0, -3, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: 4,
                delay: 1,
                ease: 'easeInOut',
              }}
            >
              🎉
              {/* Emoji shadow/glow */}
              <motion.div
                className='absolute inset-0 text-7xl opacity-30 blur-sm'
                animate={{
                  scale: [1.1, 1.5, 1.1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                🎉
              </motion.div>
            </motion.div>

            {/* Enhanced title with individual letter animations */}
            <motion.h3
              className='text-2xl font-bold text-gray-800 mb-4'
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.3, type: 'spring', stiffness: 200 }}
            >
              <motion.span
                animate={{
                  color: ['#1f2937', '#ec4899', '#8b5cf6', '#1f2937'],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                🎊 Congratulations! 🎊
              </motion.span>
            </motion.h3>

            {/* Enhanced points display */}
            <motion.div
              className='relative mb-6'
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.6, type: 'spring', stiffness: 300 }}
            >
              {/* Points glow effect */}
              <motion.div
                className='absolute inset-0 text-4xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent blur-sm opacity-50'
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                +100 Points!
              </motion.div>

              <motion.p
                className='relative text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500'
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  backgroundPosition: {
                    duration: 2,
                    repeat: Infinity,
                    ease: 'linear',
                  },
                  scale: {
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  },
                }}
                style={{
                  backgroundSize: '200% 200%',
                }}
              >
                +100 Points!
              </motion.p>

              {/* Enhanced emoji row */}
              <motion.div
                className='text-3xl mt-3 flex justify-center space-x-1'
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2, staggerChildren: 0.1 }}
              >
                {['🎁', '💎', '🏆', '⭐'].map((emoji, index) => (
                  <motion.span
                    key={index}
                    animate={{
                      scale: [1, 1.3, 1],
                      rotate: [0, 10, -10, 0],
                      y: [0, -5, 0],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: 2 + index * 0.2,
                      repeatDelay: 2,
                    }}
                  >
                    {emoji}
                  </motion.span>
                ))}
              </motion.div>
            </motion.div>

            {/* Enhanced welcome message */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.3, type: 'spring' }}
            >
              {/* Subtle pulsing underline */}
              <motion.div
                className='mt-2 h-0.5 bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 rounded-full'
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 2.5, duration: 0.8 }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

const SpaDropdown = ({ spas, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSpa, setSelectedSpa] = useState(null)

  const filteredSpas = spas.filter(
    (spa) =>
      spa.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      spa.location.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelect = (spa) => {
    setSelectedSpa(spa)
    setSearchTerm('')
    setIsOpen(false)
    onSelect(spa)
  }

  return (
    <div className='w-full relative'>
      <motion.button
        className='w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl shadow-sm flex items-center justify-between group hover:shadow-md transition-all active:scale-98'
        onClick={() => setIsOpen(!isOpen)}
        whileTap={{ scale: 0.98 }}
      >
        <div className='flex items-center space-x-3 flex-1 min-w-0'>
          <Search className='w-4 h-4 text-pink-500 flex-shrink-0' />
          <div className='flex-1 min-w-0 text-left'>
            <span className='text-gray-800 font-medium text-sm block truncate'>
              {selectedSpa ? selectedSpa.name : 'Select your spa'}
            </span>
            {selectedSpa && (
              <span className='text-xs text-gray-500 truncate block'>
                {selectedSpa.location}
              </span>
            )}
          </div>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className='w-4 h-4 text-gray-400' />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            className='absolute top-full mt-2 w-full z-50 bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl shadow-lg overflow-hidden'
          >
            <div className='p-3 border-b border-gray-100'>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
                <input
                  type='text'
                  placeholder='Search spas...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='w-full pl-10 pr-4 py-2 bg-gray-50/80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent text-sm'
                  autoFocus
                />
              </div>
            </div>

            <div className='max-h-48 overflow-y-auto'>
              {filteredSpas.length > 0 ? (
                filteredSpas.map((spa) => (
                  <button
                    key={spa.id}
                    onClick={() => handleSelect(spa)}
                    className='w-full p-3 text-left hover:bg-gray-50/80 active:bg-gray-100/80 transition-colors border-b border-gray-50 last:border-b-0'
                  >
                    <div className='flex items-center justify-between'>
                      <div className='flex-1 min-w-0'>
                        <div className='font-medium text-gray-800 text-sm truncate'>
                          {spa.name}
                        </div>
                        <div className='flex items-center space-x-3 mt-1'>
                          <div className='flex items-center space-x-1'>
                            <MapPin className='w-3 h-3 text-gray-400' />
                            <span className='text-xs text-gray-500 truncate'>
                              {spa.location}
                            </span>
                          </div>
                          <div className='flex items-center space-x-1'>
                            <Star className='w-3 h-3 text-yellow-500 fill-current' />
                            <span className='text-xs text-gray-500'>
                              {spa.rating}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ArrowRight className='w-4 h-4 text-gray-300 ml-2' />
                    </div>
                  </button>
                ))
              ) : (
                <div className='p-4 text-center'>
                  <p className='text-sm text-gray-500'>No spas found</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const ReferralInput = ({ onSubmit }) => {
  const [referralCode, setReferralCode] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)

  const handleSubmit = () => {
    if (referralCode.trim()) {
      onSubmit(referralCode.trim())
      setReferralCode('')
      setIsExpanded(false)
    }
  }

  return (
    <div className='mb-4'>
      <motion.button
        className='w-full px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl flex items-center justify-center space-x-2 text-indigo-700 hover:from-indigo-100 hover:to-purple-100 transition-all active:scale-98'
        onClick={() => setIsExpanded(!isExpanded)}
        whileTap={{ scale: 0.98 }}
      >
        <Users className='w-4 h-4' />
        <span className='text-sm font-medium'>Have a referral code?</span>
      </motion.button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className='mt-2 p-4 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl'
          >
            <div className='flex space-x-2'>
              <input
                type='text'
                placeholder='Enter referral code'
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                className='flex-1 px-3 py-2 bg-gray-50/80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent text-sm'
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
              />
              <button
                onClick={handleSubmit}
                disabled={!referralCode.trim()}
                className='px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all'
              >
                Apply
              </button>
            </div>
            <p className='text-xs text-gray-500 mt-2'>
              Get bonus points with a valid referral code!
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const WelcomePage = () => {
  const [selectedSpa, setSelectedSpa] = useState(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationComplete, setCelebrationComplete] = useState(false)

  const handleSpaSelect = (spa) => {
    setSelectedSpa(spa)
    setShowCelebration(true)
    setCelebrationComplete(false)
    console.log('Selected spa:', spa)
  }

  const handleCelebrationComplete = () => {
    setShowCelebration(false)
    setCelebrationComplete(true)
  }

  const handleReferralSubmit = (code) => {
    console.log('Referral code submitted:', code)
    // Add your referral code logic here
    alert(`Referral code "${code}" applied successfully! 🎉`)
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex flex-col'>
      {/* Background decoration */}
      <div className='absolute inset-0 overflow-hidden pointer-events-none'>
        <div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-200/20 to-transparent rounded-full blur-2xl' />
        <div className='absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-pink-200/20 to-transparent rounded-full blur-2xl' />
      </div>

      {/* Celebration Effect */}
      <AnimatePresence>
        <CelebrationEffect
          show={showCelebration}
          onComplete={handleCelebrationComplete}
        />
      </AnimatePresence>

      {/* Main Content */}
      <div className='relative z-10 flex-1 px-4 py-6'>
        <div className='max-w-md mx-auto'>
          {/* Header */}
          <div className='text-center mb-6'>
            <h1 className='text-2xl font-bold mb-2'>
              Welcome to <GradientText>RadiantAI</GradientText>
            </h1>
            <p className='text-sm text-gray-600 mb-3'>
              Intelligent automation for beauty clinics
            </p>
            <div className='flex items-center justify-center space-x-3 text-xs text-gray-500'>
              <div className='flex items-center space-x-1'>
                <div className='w-1.5 h-1.5 bg-green-500 rounded-full' />
                <span>AI-Powered</span>
              </div>
              <div className='flex items-center space-x-1'>
                <Heart className='w-3 h-3 text-pink-500' />
                <span>Human Touch</span>
              </div>
            </div>
          </div>

          {/* Referral Code Input */}
          <ReferralInput onSubmit={handleReferralSubmit} />

          {/* Spa Selection */}
          <div className='mb-6'>
            <h2 className='text-lg font-semibold text-gray-800 mb-3 text-center'>
              Choose Your <GradientText>Spa</GradientText>
            </h2>
            <SpaDropdown spas={spaData} onSelect={handleSpaSelect} />
          </div>

          {/* Selected Spa */}
          <AnimatePresence>
            {selectedSpa && celebrationComplete && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className='bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-4 text-center shadow-sm'
              >
                <div className='w-10 h-10 mx-auto mb-3 bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg flex items-center justify-center'>
                  <Gift className='w-5 h-5 text-white' />
                </div>
                <h3 className='font-semibold text-gray-800 mb-1'>
                  You earned 100 points! 🎉
                </h3>
                <p className='text-sm text-gray-600 mb-4'>
                  <span className='font-medium text-pink-600'>
                    {selectedSpa.name}
                  </span>
                  <br />
                  <span className='text-xs text-gray-500'>
                    {selectedSpa.location} • {selectedSpa.rating} ⭐
                  </span>
                </p>
                <button
                  className='w-full py-2.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium rounded-lg text-sm active:scale-95 transition-transform'
                  onClick={() => {
                    console.log('Continue with:', selectedSpa)
                    window.location.href = '/dashboard'
                  }}
                >
                  Continue to Dashboard
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Fixed Footer */}
      <div className='relative z-10 text-center py-4 px-4'>
        <p className='text-xs text-gray-400 flex items-center justify-center space-x-1'>
          <Sparkles className='w-3 h-3' />
          <span>AI technology meets human touch</span>
        </p>
      </div>
    </div>
  )
}

export default WelcomePage
