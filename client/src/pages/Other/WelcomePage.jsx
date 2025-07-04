import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  ChevronDown,
  Gift,
  Heart,
  MapPin,
  Phone,
  Search,
  Sparkles,
  Users,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'

// Updated spa data object as provided
const spaData = [
  {
    id: 1,
    name: 'Avous Med Spa & Wellness',
    location: '10501 6 Mile Cypress Parkway Suite 110',
    phone: '+12393554769',
    link: 'https://avousmedspa.com',
  },
  {
    id: 2,
    name: 'Body Smoking Spa',
    location: '15020 14st NW',
    phone: '+12345678900',
    link: 'https://bodysmokingspa.com',
  },
  {
    id: 3,
    name: 'Derma Lesions Medispa',
    location: '3333 8 St SE Calgary',
    phone: '+15874334726',
    link: 'https://dermalesionsmedispa.com',
  },
  {
    id: 4,
    name: 'Joy Core Connection',
    location: '20 Kingswood Drive',
    phone: '+12899287292',
    link: 'https://joycoreconnection.com',
  },
  {
    id: 5,
    name: 'Lux Solaris Per Aquam',
    location: '7446 Oakmont Boulevard',
    phone: '+16823069099',
    link: 'https://luxsolaris.com',
  },
  {
    id: 6,
    name: 'Nano Beauty Star',
    location: '555 6th St #130',
    phone: '+17788193977',
    link: 'https://nanobeautystar.com',
  },
  {
    id: 7,
    name: 'Nisa Medi Spa',
    location: '2059 98 St NW',
    phone: '+15874025774',
    link: 'https://nisamedispa.com',
  },
  {
    id: 8,
    name: 'RadiantMD',
    location: '13035 164 Ave',
    phone: '+17097055747',
    link: 'https://radiantmd.com',
  },
  {
    id: 9,
    name: "Relax N' Glow Spa",
    location: '54 Marchwood Crescent',
    phone: '+19055502604',
    link: 'https://relaxnglowspa.com',
  },
  {
    id: 10,
    name: 'SKNN Medical Aesthetics',
    location: '1029 17 Ave SW Suite 201, Calgary, AB T2T 0A9',
    phone: '+14036881485',
    link: 'https://sknnmedical.com',
  },
  {
    id: 11,
    name: 'The Beauty Rezort',
    location: '102 Lakeshore Road East',
    phone: '+16478382562',
    link: 'https://thebeautyrezort.com',
  },
  {
    id: 12,
    name: 'Urban Touch Halo Wellness',
    location: '323 McLeod Avenue Unit #204',
    phone: '+15875708865',
    link: 'https://urbantouchhalo.com',
  },
  {
    id: 13,
    name: 'Why Knot! Massage & Wellness',
    location: '2212 4th Street SW',
    phone: '+14032700854',
    link: 'https://whyknot-wellness.com',
  },
]

const GradientText = ({ children, className = '' }) => (
  <span
    className={`bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent ${className}`}
  >
    {children}
  </span>
)

// Enhanced Mobile-First Confetti Particle Component
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
    small: 'w-1.5 h-1.5',
    normal: 'w-2.5 h-2.5',
    large: 'w-3.5 h-3.5',
  }

  const shapes = {
    circle: 'rounded-full',
    square: 'rounded-sm',
    star: 'rounded-full',
  }

  // Mobile-optimized burst patterns
  const burstPatterns = [
    { x: 0, y: 0 }, // center
    { x: -120, y: -40 }, // top left
    { x: 120, y: -40 }, // top right
    { x: -80, y: 0 }, // left
    { x: 80, y: 0 }, // right
    { x: -60, y: 40 }, // bottom left
    { x: 60, y: 40 }, // bottom right
    { x: 0, y: 50 }, // bottom
  ]

  const startPos = burstPatterns[burstIndex] || burstPatterns[0]
  const randomX = Math.random() * 400 - 200 // Reduced for mobile
  const randomY = Math.random() * 150 - 300 // Reduced for mobile

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
        y: [startPos.y, randomY - 80, randomY - 160, randomY - 280],
        x: [startPos.x, randomX * 0.3, randomX * 0.6, randomX * 0.8],
        rotate: [0, 180, 360, 540, 720],
      }}
      transition={{
        duration: 3,
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

// Mobile-optimized Sparkle Effect Component
const SparkleEffect = ({ delay = 0 }) => {
  return (
    <motion.div
      className='absolute w-1 h-1 bg-white rounded-full shadow-lg'
      initial={{
        opacity: 0,
        scale: 0,
        x: Math.random() * 300 - 150, // Reduced for mobile
        y: Math.random() * 300 - 150, // Reduced for mobile
      }}
      animate={{
        opacity: [0, 1, 0],
        scale: [0, 2.5, 0],
        rotate: [0, 180],
      }}
      transition={{
        duration: 1.2,
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

// Mobile-optimized Emoji Confetti Component
const EmojiConfetti = ({ delay = 0, emoji = '🎉' }) => {
  const emojis = ['🎉', '🎊', '✨', '🌟', '💫', '🎁', '🏆', '💎', '🔥', '⭐']
  const selectedEmoji =
    emoji === 'random'
      ? emojis[Math.floor(Math.random() * emojis.length)]
      : emoji

  return (
    <motion.div
      className='absolute text-xl select-none' // Smaller emoji for mobile
      initial={{
        opacity: 0,
        scale: 0,
        x: Math.random() * 200 - 100, // Reduced range for mobile
        y: 0,
        rotate: 0,
      }}
      animate={{
        opacity: [0, 1, 1, 0],
        scale: [0, 1.3, 1, 0.4],
        y: [-40, -120, -200, -320],
        x: Math.random() * 300 - 150,
        rotate: [0, 360, 720],
      }}
      transition={{
        duration: 3.5,
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

// Enhanced Mobile-First Celebration Effect Component
const CelebrationEffect = ({ show, onComplete }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onComplete, 4500) // Slightly shorter for mobile
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
  ]
  const confettiShapes = ['circle', 'square', 'star']
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
        className='absolute inset-0 bg-black/15' // Lighter for mobile
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      />

      {/* Mobile-optimized radial light burst effect */}
      <motion.div
        className='absolute inset-0 pointer-events-none'
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 3, opacity: [0, 0.6, 0] }}
        transition={{ duration: 1, delay: 0.4 }}
      >
        <div className='w-24 h-24 mx-auto mt-[50vh] -translate-y-12 rounded-full bg-gradient-radial from-yellow-400/25 via-pink-400/15 to-transparent' />
      </motion.div>

      {/* Screen shake effect with mobile-optimized particles */}
      <motion.div
        className='absolute inset-0'
        animate={{
          x: [0, -2, 2, -1, 1, 0],
          y: [0, -1, 1, -1, 1, 0],
        }}
        transition={{
          duration: 0.6,
          delay: 0.2,
          ease: 'easeInOut',
        }}
      >
        {/* Reduced confetti count for mobile performance */}
        {[...Array(80)].map((_, i) => (
          <ConfettiParticle
            key={`confetti-${i}`}
            delay={Math.random() * 1}
            color={confettiColors[i % confettiColors.length]}
            shape={confettiShapes[i % confettiShapes.length]}
            size={confettiSizes[i % confettiSizes.length]}
            burstIndex={i % 8}
          />
        ))}

        {/* Reduced sparkle effects for mobile */}
        {[...Array(25)].map((_, i) => (
          <SparkleEffect key={`sparkle-${i}`} delay={Math.random() * 1.5} />
        ))}

        {/* Reduced floating orbs for mobile */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={`orb-${i}`}
            className='absolute w-2.5 h-2.5 rounded-full bg-gradient-to-r from-pink-400 to-purple-400 opacity-60'
            style={{
              left: `${25 + Math.random() * 50}%`,
              top: `${35 + Math.random() * 30}%`,
            }}
            animate={{
              y: [-15, -100],
              x: [0, Math.random() * 80 - 40],
              opacity: [0, 0.7, 0],
              scale: [0, 1.2, 0],
            }}
            transition={{
              duration: 2.5 + Math.random() * 1.5,
              delay: Math.random() * 1,
              ease: 'easeOut',
            }}
          />
        ))}

        {/* Reduced emoji confetti for mobile */}
        {[...Array(12)].map((_, i) => (
          <EmojiConfetti
            key={`emoji-${i}`}
            delay={Math.random() * 1.2}
            emoji='random'
          />
        ))}
      </motion.div>

      {/* Mobile-optimized main card */}
      <motion.div
        className='relative mx-6' // Increased margin for mobile
        initial={{ scale: 0, y: 80, rotate: -12 }}
        animate={{ scale: 1, y: 0, rotate: 0 }}
        transition={{
          type: 'spring',
          stiffness: 160,
          damping: 12,
          delay: 0.7,
        }}
      >
        {/* Outer glow - optimized for mobile */}
        <motion.div
          className='absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 opacity-30 blur-lg scale-105'
          animate={{
            scale: [1.05, 1.15, 1.05],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Main card - mobile-first sizing */}
        <motion.div
          className='relative bg-white/95 backdrop-blur-xl rounded-2xl p-5 shadow-xl border border-white/40 text-center max-w-xs mx-auto overflow-hidden'
          animate={{
            boxShadow: [
              '0 20px 40px -12px rgba(0, 0, 0, 0.2)',
              '0 25px 50px -12px rgba(236, 72, 153, 0.3)',
              '0 20px 40px -12px rgba(0, 0, 0, 0.2)',
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {/* Mobile-optimized animated background gradient */}
          <motion.div
            className='absolute inset-0 rounded-2xl'
            animate={{
              background: [
                'linear-gradient(45deg, rgba(236, 72, 153, 0.1), rgba(168, 85, 247, 0.1), rgba(99, 102, 241, 0.1))',
                'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(16, 185, 129, 0.1), rgba(236, 72, 153, 0.1))',
                'linear-gradient(225deg, rgba(16, 185, 129, 0.1), rgba(236, 72, 153, 0.1), rgba(168, 85, 247, 0.1))',
                'linear-gradient(315deg, rgba(168, 85, 247, 0.1), rgba(99, 102, 241, 0.1), rgba(16, 185, 129, 0.1))',
                'linear-gradient(45deg, rgba(236, 72, 153, 0.1), rgba(168, 85, 247, 0.1), rgba(99, 102, 241, 0.1))',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          />

          {/* Mobile-optimized floating sparkles inside card */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={`card-sparkle-${i}`}
              className='absolute w-0.5 h-0.5 bg-yellow-400 rounded-full'
              style={{
                left: `${15 + Math.random() * 70}%`,
                top: `${15 + Math.random() * 70}%`,
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 1.2,
                delay: Math.random() * 2 + 0.8,
                repeat: Infinity,
                repeatDelay: Math.random() * 2.5,
              }}
            />
          ))}

          <motion.div
            className='relative z-10'
            animate={{
              scale: [1, 1.01, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {/* Mobile-optimized emoji */}
            <motion.div
              className='text-4xl mb-4 relative' // Smaller for mobile
              animate={{
                scale: [1, 1.3, 1.1, 1.25, 1],
                rotate: [0, 15, -12, 8, 0],
                y: [0, -3, 0, -2, 0],
              }}
              transition={{
                duration: 1.3,
                repeat: 3,
                delay: 0.8,
                ease: 'easeInOut',
              }}
            >
              🎉
              {/* Emoji shadow/glow */}
              <motion.div
                className='absolute inset-0 text-4xl opacity-25 blur-sm'
                animate={{
                  scale: [1.1, 1.4, 1.1],
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

            {/* Mobile-optimized title */}
            <motion.h3
              className='text-lg font-bold text-gray-800 mb-3' // Smaller for mobile
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, type: 'spring', stiffness: 200 }}
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

            {/* Mobile-optimized points display */}
            <motion.div
              className='relative mb-4'
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.4, type: 'spring', stiffness: 300 }}
            >
              {/* Points glow effect */}
              <motion.div
                className='absolute inset-0 text-2xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent blur-sm opacity-40'
                animate={{
                  scale: [1, 1.08, 1],
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
                className='relative text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500'
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                  scale: [1, 1.03, 1],
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

              {/* Mobile-optimized emoji row */}
              <motion.div
                className='text-lg mt-2 flex justify-center space-x-1' // Smaller emojis
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.7, staggerChildren: 0.1 }}
              >
                {['🎁', '💎', '🏆', '⭐'].map((emoji, index) => (
                  <motion.span
                    key={index}
                    animate={{
                      scale: [1, 1.2, 1],
                      rotate: [0, 8, -8, 0],
                      y: [0, -3, 0],
                    }}
                    transition={{
                      duration: 0.7,
                      repeat: Infinity,
                      delay: 1.7 + index * 0.15,
                      repeatDelay: 1.8,
                    }}
                  >
                    {emoji}
                  </motion.span>
                ))}
              </motion.div>
            </motion.div>

            {/* Mobile-optimized welcome message */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2, type: 'spring' }}
            >
              {/* Subtle pulsing underline */}
              <motion.div
                className='mt-2 h-0.5 bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 rounded-full'
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 2.2, duration: 0.7 }}
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
        className='w-full px-4 py-4 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl shadow-sm flex items-center justify-between group hover:shadow-md transition-all active:scale-[0.98] min-h-[56px]'
        onClick={() => setIsOpen(!isOpen)}
        whileTap={{ scale: 0.98 }}
      >
        <div className='flex items-center space-x-3 flex-1 min-w-0'>
          <Search className='w-5 h-5 text-pink-500 flex-shrink-0' />
          <div className='flex-1 min-w-0 text-left'>
            <span className='text-gray-800 font-medium text-base block truncate leading-tight'>
              {selectedSpa ? selectedSpa.name : 'Select your spa'}
            </span>
            {selectedSpa && (
              <span className='text-sm text-gray-500 truncate block mt-1 leading-tight'>
                {selectedSpa.location}
              </span>
            )}
          </div>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className='w-5 h-5 text-gray-400' />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
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
                  className='w-full pl-10 pr-3 py-3 bg-gray-50/80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent text-sm'
                  autoFocus
                />
              </div>
            </div>

            <div className='max-h-64 overflow-y-auto overscroll-contain'>
              {filteredSpas.length > 0 ? (
                filteredSpas.map((spa) => (
                  <button
                    key={spa.id}
                    onClick={() => handleSelect(spa)}
                    className='w-full p-3 border-b border-gray-50 last:border-b-0 hover:bg-gray-50/80 active:bg-gray-100/80 transition-colors text-left min-h-[48px] flex items-center justify-between'
                  >
                    <div className='flex-1 min-w-0 pr-3'>
                      <div className='font-medium text-gray-800 text-sm truncate mb-1 leading-tight'>
                        {spa.name}
                      </div>
                      <div className='flex items-start space-x-1'>
                        <MapPin className='w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0' />
                        <span className='text-xs text-gray-500 leading-relaxed'>
                          {spa.location}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className='w-4 h-4 text-gray-300 flex-shrink-0' />
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
    <div className='mb-6'>
      <motion.button
        className='w-full px-4 py-5 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl flex items-center justify-center space-x-3 text-indigo-700 hover:from-indigo-100 hover:to-purple-100 transition-all active:scale-[0.98] min-h-[56px]' // Minimum 56px touch target
        onClick={() => setIsExpanded(!isExpanded)}
        whileTap={{ scale: 0.98 }}
      >
        <Users className='w-5 h-5' />
        <span className='text-base font-medium'>Have a referral code?</span>
      </motion.button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className='mt-3 p-4 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl'
          >
            <div className='flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3'>
              {' '}
              {/* Stack on mobile, row on larger screens */}
              <input
                type='text'
                placeholder='Enter referral code'
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                className='flex-1 px-4 py-4 bg-gray-50/80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent text-base min-h-[48px]' // Minimum 48px touch target
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
              />
              <button
                onClick={handleSubmit}
                disabled={!referralCode.trim()}
                className='px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all min-h-[48px] sm:min-w-[100px]' // Minimum touch target with min width on larger screens
              >
                Apply
              </button>
            </div>
            <p className='text-sm text-gray-500 mt-3 leading-relaxed'>
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
      {/* Background decoration - optimized for mobile */}
      <div className='absolute inset-0 overflow-hidden pointer-events-none'>
        <div className='absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-purple-200/15 to-transparent rounded-full blur-xl' />
        <div className='absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-pink-200/15 to-transparent rounded-full blur-xl' />
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
        <div className='max-w-sm mx-auto'>
          {' '}
          {/* Narrower max width for mobile */}
          {/* Header - mobile-optimized */}
          <div className='text-center mb-8'>
            <h1 className='text-2xl font-bold mb-3 leading-tight'>
              {' '}
              {/* Smaller on mobile */}
              Welcome to <GradientText>RadiantAI</GradientText>
            </h1>
            <p className='text-base text-gray-600 mb-4 leading-relaxed'>
              Intelligent automation for beauty clinics
            </p>
            <div className='flex items-center justify-center space-x-4 text-sm text-gray-500'>
              <div className='flex items-center space-x-2'>
                <div className='w-2 h-2 bg-green-500 rounded-full' />
                <span>AI-Powered</span>
              </div>
              <div className='flex items-center space-x-2'>
                <Heart className='w-4 h-4 text-pink-500' />
                <span>Human Touch</span>
              </div>
            </div>
          </div>
          {/* Referral Code Input */}
          <ReferralInput onSubmit={handleReferralSubmit} />
          {/* Spa Selection */}
          <div className='mb-8'>
            <h2 className='text-xl font-semibold text-gray-800 mb-4 text-center leading-tight'>
              Choose Your <GradientText>Spa</GradientText>
            </h2>
            <SpaDropdown spas={spaData} onSelect={handleSpaSelect} />
          </div>
          {/* Selected Spa - mobile-optimized */}
          <AnimatePresence>
            {selectedSpa && celebrationComplete && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className='bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl p-5 text-center shadow-sm'
              >
                <div className='w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg flex items-center justify-center'>
                  <Gift className='w-6 h-6 text-white' />
                </div>
                <h3 className='text-xl font-semibold text-gray-800 mb-2 leading-tight'>
                  You earned 100 points! 🎉
                </h3>
                <p className='text-base text-gray-600 mb-2 leading-tight'>
                  <span className='font-medium text-pink-600'>
                    {selectedSpa.name}
                  </span>
                </p>
                <p className='text-sm text-gray-500 mb-6 leading-relaxed'>
                  {selectedSpa.location}
                </p>

                <button
                  className='w-full py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium rounded-lg text-base active:scale-[0.98] transition-transform min-h-[48px]' // Minimum 48px touch target
                  onClick={() => {
                    window.location.href = '/dashboard' // Redirect to dashboard
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
      <div className='relative z-10 text-center py-6 px-4'>
        <p className='text-sm text-gray-400 flex items-center justify-center space-x-2'>
          <Sparkles className='w-4 h-4' />
          <span>AI technology meets human touch</span>
        </p>
      </div>
    </div>
  )
}

export default WelcomePage
