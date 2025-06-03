import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  Bot,
  Building2,
  Eye,
  EyeOff,
  Heart,
  Lock,
  Mail,
  Phone,
  Sparkles,
  User,
  Zap,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'

// Enhanced Floating Elements Component
const FloatingElements = () => {
  return (
    <div className='absolute inset-0 overflow-hidden pointer-events-none z-0'>
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className='absolute'
          animate={{
            y: [-10, 10, -10],
            x: [-5, 5, -5],
            rotate: [0, 180, 360],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: 4 + i * 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.6,
          }}
          style={{
            left: `${15 + ((i * 12) % 70)}%`,
            top: `${15 + ((i * 10) % 70)}%`,
          }}
        >
          {i % 4 === 0 ? (
            <Sparkles className='h-3 w-3 text-pink-300/20' />
          ) : i % 4 === 1 ? (
            <Bot className='h-3 w-3 text-purple-300/20' />
          ) : i % 4 === 2 ? (
            <Heart className='h-2 w-2 text-pink-400/20' />
          ) : (
            <Zap className='h-3 w-3 text-purple-400/20' />
          )}
        </motion.div>
      ))}
    </div>
  )
}

// Enhanced Animated Background Component
const AnimatedBackground = ({ view }) => {
  return (
    <div className='absolute inset-0 overflow-hidden z-0'>
      {/* Multi-layer gradient */}
      <div className='absolute inset-0 bg-gradient-to-br from-purple-900 via-pink-800 to-purple-900' />
      <div className='absolute inset-0 bg-gradient-to-tl from-pink-900/60 via-transparent to-purple-900/60' />

      {/* Refined grid */}
      <div className='absolute inset-0 bg-[linear-gradient(0deg,transparent_calc(100%-1px),rgba(255,255,255,0.05)_100%),linear-gradient(90deg,transparent_calc(100%-1px),rgba(255,255,255,0.05)_100%)] bg-[size:60px_60px]' />

      {/* Multiple animated orbs - reduced opacity and moved away from center */}
      <motion.div
        className='absolute w-32 h-32 md:w-40 md:h-40 rounded-full bg-pink-500/15 blur-3xl'
        animate={{
          opacity: [0.1, 0.3, 0.1],
          scale: [1, 1.2, 1],
          x: [0, 20, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: 6,
          ease: 'easeInOut',
        }}
        style={{ top: '10%', left: '5%' }}
      />

      <motion.div
        className='absolute w-24 h-24 md:w-32 md:h-32 rounded-full bg-purple-400/12 blur-3xl'
        animate={{
          opacity: [0.2, 0.4, 0.2],
          scale: [1.1, 1, 1.1],
          x: [0, -15, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: 5,
          ease: 'easeInOut',
          delay: 1,
        }}
        style={{ top: '70%', right: '5%' }}
      />

      <motion.div
        className='absolute w-20 h-20 md:w-28 md:h-28 rounded-full bg-pink-400/10 blur-3xl'
        animate={{
          opacity: [0.3, 0.5, 0.3],
          scale: [1, 1.3, 1],
          y: [0, -10, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: 7,
          ease: 'easeInOut',
          delay: 2,
        }}
        style={{ bottom: '15%', left: '10%' }}
      />
    </div>
  )
}

// Main Auth Page Component
const AuthPage = () => {
  const [view, setView] = useState('signup')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    businessName: '',
    password: '',
    confirmPassword: '',
  })

  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  )

  const isMobile = windowWidth < 768

  // Update window width on resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault()

    if (view === 'signup' && formData.password !== formData.confirmPassword) {
      alert('Passwords do not match!')
      return
    }

    setIsSubmitting(true)

    // Simulate API call
    setTimeout(() => {
      console.log('Form submitted:', { view, ...formData })
      setIsSubmitting(false)
    }, 2000)
  }

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className='min-h-screen flex'>
      {/* Left Panel - Desktop Only */}
      {!isMobile && (
        <div className='w-2/5 relative overflow-hidden'>
          <AnimatedBackground view={view} />
          <FloatingElements />

          {/* Content overlay - Clean & Minimal */}
          <div className='relative z-20 h-full flex flex-col justify-center items-center text-center p-6 lg:p-8'>
            {/* Logo */}
            <motion.div
              className='mb-8'
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              <h1 className='text-3xl font-bold text-white tracking-tight'>
                RadiantAI
              </h1>
            </motion.div>

            {/* Big Typography */}
            <motion.div
              className='space-y-6'
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <motion.h2
                className='text-4xl lg:text-6xl font-black text-white leading-none'
                key={view}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                {view === 'signup' ? (
                  <>
                    <span className='block'>BEAUTY</span>
                    <span className='block bg-gradient-to-r from-pink-300 to-purple-300 bg-clip-text text-transparent'>
                      MEETS AI
                    </span>
                  </>
                ) : (
                  <>
                    <span className='block'>WELCOME</span>
                    <span className='block bg-gradient-to-r from-pink-300 to-purple-300 bg-clip-text text-transparent'>
                      BACK
                    </span>
                  </>
                )}
              </motion.h2>

              <motion.p
                className='text-lg lg:text-xl text-pink-100/80 font-light max-w-sm mx-auto'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                {view === 'signup'
                  ? 'Transform your clinic with intelligent automation'
                  : 'Continue your AI-powered journey'}
              </motion.p>
            </motion.div>

            {/* Simple Accent */}
            <motion.div
              className='mt-12'
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <div className='w-20 h-1 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full mx-auto'></div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Right Panel - Auth Form */}
      <div
        className={`${
          isMobile ? 'w-full' : 'w-3/5'
        } bg-white flex flex-col p-4 lg:p-6`}
      >
        {/* Fixed Header */}
        <motion.div
          className='flex-shrink-0 pt-4 pb-6 justify-center items-center text-center'
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h3 className='text-xl lg:text-2xl font-bold text-gray-900 mb-1'>
            {view === 'signup' ? 'Create Account' : 'Welcome Back'}
          </h3>
          <p className='text-gray-600 text-sm'>
            {view === 'signup'
              ? 'Start your AI journey today'
              : 'Sign in to your account'}
          </p>
        </motion.div>

        {/* Fixed Content Area with consistent positioning */}
        <div
          className={`flex-1 ${
            isMobile ? 'flex flex-col' : 'flex justify-center pt-1'
          } overflow-y-auto`}
        >
          <div className='w-full max-w-md mx-auto'>
            {/* Fixed Toggle Buttons */}
            <div className='flex bg-gray-100 rounded-xl p-1 mb-8'>
              <button
                onClick={() => setView('signup')}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-300 text-sm ${
                  view === 'signup'
                    ? 'bg-gradient-to-r from-pink-700 to-pink-500 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }`}
              >
                Sign Up
              </button>
              <button
                onClick={() => setView('login')}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-300 text-sm ${
                  view === 'login'
                    ? 'bg-gradient-to-r from-pink-700 to-pink-500 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }`}
              >
                Login
              </button>
            </div>

            {/* Fixed height container for consistent form positioning */}
            <div className='min-h-[600px] relative'>
              <AnimatePresence mode='wait'>
                <motion.form
                  key={view}
                  onSubmit={handleSubmit}
                  className='space-y-4 absolute w-full top-0'
                  initial={{ opacity: 0, x: view === 'signup' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: view === 'signup' ? -20 : 20 }}
                  transition={{ duration: 0.3 }}
                >
                  {view === 'signup' ? (
                    <>
                      {/* Compact Name Fields */}
                      <div className='grid grid-cols-2 gap-3'>
                        <div>
                          <label className='block text-xs font-medium text-gray-700 mb-1'>
                            First Name
                          </label>
                          <div className='relative'>
                            <User className='absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
                            <input
                              type='text'
                              value={formData.firstName}
                              onChange={(e) =>
                                updateFormData('firstName', e.target.value)
                              }
                              className='w-full pl-8 pr-3 py-2 border-b border-gray-200 focus:border-pink-500 outline-none transition-colors bg-transparent text-sm'
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <label className='block text-xs font-medium text-gray-700 mb-1'>
                            Last Name
                          </label>
                          <div className='relative'>
                            <User className='absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
                            <input
                              type='text'
                              value={formData.lastName}
                              onChange={(e) =>
                                updateFormData('lastName', e.target.value)
                              }
                              className='w-full pl-8 pr-3 py-2 border-b border-gray-200 focus:border-pink-500 outline-none transition-colors bg-transparent text-sm'
                              required
                            />
                          </div>
                        </div>
                      </div>

                      {/* Email */}
                      <div>
                        <label className='block text-xs font-medium text-gray-700 mb-1'>
                          Email Address
                        </label>
                        <div className='relative'>
                          <Mail className='absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
                          <input
                            type='email'
                            value={formData.email}
                            onChange={(e) =>
                              updateFormData('email', e.target.value)
                            }
                            className='w-full pl-8 pr-3 py-2 border-b border-gray-200 focus:border-pink-500 outline-none transition-colors bg-transparent text-sm'
                            required
                          />
                        </div>
                      </div>

                      {/* Phone */}
                      <div>
                        <label className='block text-xs font-medium text-gray-700 mb-1'>
                          Phone Number
                        </label>
                        <div className='relative'>
                          <Phone className='absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
                          <input
                            type='tel'
                            value={formData.phone}
                            onChange={(e) =>
                              updateFormData('phone', e.target.value)
                            }
                            className='w-full pl-8 pr-3 py-2 border-b border-gray-200 focus:border-pink-500 outline-none transition-colors bg-transparent text-sm'
                            required
                          />
                        </div>
                      </div>

                      {/* Business Name */}
                      <div>
                        <label className='block text-xs font-medium text-gray-700 mb-1'>
                          Business/Clinic Name
                        </label>
                        <div className='relative'>
                          <Building2 className='absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
                          <input
                            type='text'
                            value={formData.businessName}
                            onChange={(e) =>
                              updateFormData('businessName', e.target.value)
                            }
                            className='w-full pl-8 pr-3 py-2 border-b border-gray-200 focus:border-pink-500 outline-none transition-colors bg-transparent text-sm'
                            required
                          />
                        </div>
                      </div>

                      {/* Password */}
                      <div>
                        <label className='block text-xs font-medium text-gray-700 mb-1'>
                          Password
                        </label>
                        <div className='relative'>
                          <Lock className='absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={formData.password}
                            onChange={(e) =>
                              updateFormData('password', e.target.value)
                            }
                            className='w-full pl-8 pr-9 py-2 border-b border-gray-200 focus:border-pink-500 outline-none transition-colors bg-transparent text-sm'
                            required
                          />
                          <button
                            type='button'
                            onClick={() => setShowPassword(!showPassword)}
                            className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
                          >
                            {showPassword ? (
                              <EyeOff className='h-4 w-4' />
                            ) : (
                              <Eye className='h-4 w-4' />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Confirm Password */}
                      <div>
                        <label className='block text-xs font-medium text-gray-700 mb-1'>
                          Confirm Password
                        </label>
                        <div className='relative'>
                          <Lock className='absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={formData.confirmPassword}
                            onChange={(e) =>
                              updateFormData('confirmPassword', e.target.value)
                            }
                            className='w-full pl-8 pr-9 py-2 border-b border-gray-200 focus:border-pink-500 outline-none transition-colors bg-transparent text-sm'
                            required
                          />
                          <button
                            type='button'
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                            className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
                          >
                            {showConfirmPassword ? (
                              <EyeOff className='h-4 w-4' />
                            ) : (
                              <Eye className='h-4 w-4' />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Compact Terms */}
                      <div className='flex items-start gap-2'>
                        <input
                          type='checkbox'
                          required
                          className='mt-1 rounded border-pink-300 text-pink-500 focus:ring-pink-400'
                        />
                        <label className='text-xs text-gray-600 leading-relaxed'>
                          I agree to the{' '}
                          <button
                            type='button'
                            className='text-pink-600 hover:text-pink-700 font-medium'
                          >
                            Terms
                          </button>{' '}
                          and{' '}
                          <button
                            type='button'
                            className='text-pink-600 hover:text-pink-700 font-medium'
                          >
                            Privacy Policy
                          </button>
                        </label>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Login Email */}
                      <div>
                        <label className='block text-xs font-medium text-gray-700 mb-1'>
                          Email Address
                        </label>
                        <div className='relative'>
                          <Mail className='absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
                          <input
                            type='email'
                            value={formData.email}
                            onChange={(e) =>
                              updateFormData('email', e.target.value)
                            }
                            className='w-full pl-8 pr-3 py-2 border-b border-gray-200 focus:border-pink-500 outline-none transition-colors bg-transparent text-sm'
                            required
                          />
                        </div>
                      </div>

                      {/* Login Password */}
                      <div>
                        <label className='block text-xs font-medium text-gray-700 mb-1'>
                          Password
                        </label>
                        <div className='relative'>
                          <Lock className='absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={formData.password}
                            onChange={(e) =>
                              updateFormData('password', e.target.value)
                            }
                            className='w-full pl-8 pr-9 py-2 border-b border-gray-200 focus:border-pink-500 outline-none transition-colors bg-transparent text-sm'
                            required
                          />
                          <button
                            type='button'
                            onClick={() => setShowPassword(!showPassword)}
                            className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
                          >
                            {showPassword ? (
                              <EyeOff className='h-4 w-4' />
                            ) : (
                              <Eye className='h-4 w-4' />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Compact Remember me and Forgot password */}
                      <div className='flex items-center justify-between'>
                        <label className='flex items-center gap-2 text-xs text-gray-600'>
                          <input
                            type='checkbox'
                            className='rounded border-pink-300 text-pink-500 focus:ring-pink-400'
                          />
                          Remember me
                        </label>
                        <button
                          type='button'
                          className='text-xs text-pink-600 hover:text-pink-700 font-medium'
                        >
                          Forgot password?
                        </button>
                      </div>
                    </>
                  )}

                  {/* Enhanced Submit Button */}
                  <motion.button
                    type='submit'
                    disabled={isSubmitting}
                    className={`w-full py-4 px-6 rounded-2xl font-bold text-base transition-all duration-300 flex items-center justify-center gap-3 mt-8 shadow-lg ${
                      isSubmitting
                        ? 'bg-gray-400 cursor-not-allowed shadow-none'
                        : 'bg-gradient-to-r from-pink-700 to-pink-500 text-white shadow-pink-500/25 hover:shadow-pink-500/40 hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                    whileHover={
                      !isSubmitting
                        ? {
                            scale: 1.02,
                            boxShadow:
                              '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                          }
                        : {}
                    }
                    whileTap={!isSubmitting ? { scale: 0.98 } : {}}
                  >
                    {isSubmitting ? (
                      <>
                        <div className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <span>
                          {view === 'signup' ? 'Create Account' : 'Sign In'}
                        </span>
                        <motion.div
                          whileHover={{ x: 5 }}
                          transition={{
                            type: 'spring',
                            stiffness: 400,
                            damping: 10,
                          }}
                        >
                          <ArrowRight className='h-5 w-5' />
                        </motion.div>
                      </>
                    )}
                  </motion.button>
                </motion.form>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthPage
