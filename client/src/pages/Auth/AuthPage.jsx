// File: client/src/pages/Auth/AuthPage.jsx
import { axiosInstance } from '@/config'
import {
  loginFailure,
  loginStart,
  loginSuccess,
  selectIsLoading,
} from '@/redux/userSlice'
import { useMutation } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bot,
  Calendar,
  ChevronRight,
  Eye,
  EyeOff,
  Heart,
  Loader2,
  Lock,
  Mail,
  Phone,
  Sparkles,
  User,
  Zap,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

const signupUser = async (userData) => {
  const response = await axiosInstance.post('/auth/signup', userData)
  return response.data
}

const signinUser = async (credentials) => {
  const response = await axiosInstance.post('/auth/signin', credentials)
  return response.data
}

const FloatingElements = () => {
  return (
    <div className='absolute inset-0 overflow-hidden pointer-events-none z-0'>
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className='absolute animate-pulse'
          style={{
            left: `${15 + ((i * 12) % 70)}%`,
            top: `${15 + ((i * 10) % 70)}%`,
            animationDelay: `${i * 0.6}s`,
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
        </div>
      ))}
    </div>
  )
}

const AnimatedBackground = () => {
  return (
    <div className='absolute inset-0 overflow-hidden z-0'>
      <div className='absolute inset-0 bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600' />
      <div className='absolute inset-0 bg-[linear-gradient(0deg,transparent_calc(100%-1px),rgba(255,255,255,0.05)_100%),linear-gradient(90deg,transparent_calc(100%-1px),rgba(255,255,255,0.05)_100%)] bg-[size:40px_40px]' />

      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className='absolute w-[500px] h-[500px] -top-40 -left-40 rounded-full bg-pink-300/20 blur-[100px]'
      />
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.1, 0.15, 0.1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1,
        }}
        className='absolute w-[400px] h-[400px] -bottom-20 -right-20 rounded-full bg-purple-400/20 blur-[100px]'
      />
    </div>
  )
}

const ErrorAlert = ({ message, onDismiss }) => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className='mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 shadow-sm'
  >
    <AlertCircle className='w-5 h-5 text-red-500 mt-0.5 flex-shrink-0' />
    <div className='flex-1'>
      <p className='text-sm font-medium text-red-800'>{message}</p>
    </div>
    <button
      onClick={onDismiss}
      className='text-red-400 hover:text-red-600 transition-colors'
      type='button'
    >
      ×
    </button>
  </motion.div>
)

const SuccessAlert = ({ message }) => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className='mb-6 p-4 bg-green-50 border border-green-100 rounded-2xl flex items-start gap-3 shadow-sm'
  >
    <div className='w-5 h-5 bg-green-500 rounded-full mt-0.5 flex-shrink-0 flex items-center justify-center'>
      <Zap className='w-3 h-3 text-white' />
    </div>
    <p className='text-sm font-medium text-green-800'>{message}</p>
  </motion.div>
)

const AuthPage = () => {
  const dispatch = useDispatch()
  const isLoading = useSelector(selectIsLoading)
  const reduxError = useSelector((state) => state.user.error)

  const [view, setView] = useState('signup') // 'signup' or 'login'
  const [signupStep, setSignupStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [localError, setLocalError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  )

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    birthdate: '',
    password: '',
    confirmPassword: '',
  })

  const isMobile = windowWidth < 1024

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    setLocalError(null)
    setSuccess(null)
    setSignupStep(1)
  }, [view])

  const signupMutation = useMutation({
    mutationFn: signupUser,
    onMutate: () => {
      dispatch(loginStart())
      setLocalError(null)
      setSuccess(null)
    },
    onSuccess: (data) => {
      dispatch(loginSuccess(data))
      setSuccess('Radiant account created! Transforming your experience...')
      setTimeout(() => {
        window.location.href = '/welcome'
      }, 1500)
    },
    onError: (error) => {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Signup failed. Please try again.'
      setLocalError(errorMessage)
      dispatch(loginFailure(errorMessage))
    },
  })

  const signinMutation = useMutation({
    mutationFn: signinUser,
    onMutate: () => {
      dispatch(loginStart())
      setLocalError(null)
      setSuccess(null)
    },
    onSuccess: (data) => {
      if (data.token) {
        localStorage.setItem('token', data.token)
      }
      dispatch(loginSuccess(data))
      setSuccess('Welcome back! Loading your dashboard...')
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 1000)
    },
    onError: (error) => {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Login failed. Please check your credentials.'
      setLocalError(errorMessage)
      dispatch(loginFailure(errorMessage))
    },
  })

  const handleNextStep = () => {
    if (signupStep === 1) {
      if (!formData.fullName || !formData.phone) {
        setLocalError('Please fill in your name and phone number.')
        return
      }
    } else if (signupStep === 2) {
      if (!formData.birthdate) {
        setLocalError('Please select your date of birth.')
        return
      }
    }
    setLocalError(null)
    setSignupStep((prev) => prev + 1)
  }

  const handleBackStep = () => {
    setSignupStep((prev) => prev - 1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError(null)

    if (view === 'signup') {
      if (formData.password !== formData.confirmPassword) {
        setLocalError('Passwords do not match!')
        return
      }
      if (formData.password.length < 8) {
        setLocalError('Password must be at least 8 characters long!')
        return
      }

      const signupData = {
        name: formData.fullName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
      }
      signupMutation.mutate(signupData)
    } else {
      const signinData = {
        email: formData.email,
        password: formData.password,
      }
      signinMutation.mutate(signinData)
    }
  }

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const stepVariants = {
    initial: { x: 20, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -20, opacity: 0 },
  }

  const displayError =
    localError || (typeof reduxError === 'string' ? reduxError : null)

  return (
    <div className='min-h-screen bg-white flex font-sans selection:bg-pink-100 selection:text-pink-600'>
      {!isMobile && (
        <div className='w-1/2 relative overflow-hidden flex items-center justify-center p-12'>
          <AnimatedBackground />
          <FloatingElements />

          <div className='relative z-20 w-full max-w-lg'>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className='flex flex-col items-center justify-center mb-12 w-full'>
                <h1 className='text-6xl font-black text-white tracking-tighter'>
                  Radiant<span className='text-pink-200'>AI</span>
                </h1>
              </div>

              <h2 className='text-6xl font-black text-white leading-[1.1] mb-8'>
                {view === 'signup' ? (
                  <>
                    REVEAL YOUR
                    <br />
                    <span className='text-pink-200'>TRUE RADIANCE</span>
                  </>
                ) : (
                  <>
                    GLOWING
                    <br />
                    <span className='text-pink-200'>RETURNS HERE</span>
                  </>
                )}
              </h2>

              <p className='text-xl text-pink-50/80 font-light leading-relaxed max-w-md'>
                Experience the next generation of beauty management.
                Intelligent, elegant, and uniquely yours.
              </p>

              <div className='mt-12 flex gap-4'>
                <div className='px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 flex items-center gap-2'>
                  <Bot className='w-4 h-4 text-pink-200' />
                  <span className='text-white text-sm font-medium'>
                    AI-Powered Insights
                  </span>
                </div>
                <div className='px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 flex items-center gap-2'>
                  <Zap className='w-4 h-4 text-pink-200' />
                  <span className='text-white text-sm font-medium'>
                    Pro Features
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      <div
        className={`${
          isMobile ? 'w-full px-6' : 'w-1/2'
        } relative flex flex-col justify-center bg-white`}
      >
        <div className='max-w-md w-full mx-auto'>
          {/* Header */}
          <header className='mb-2'>
            {isMobile && (
              <div className='flex flex-col items-center justify-center mb-8'>
                <h1 className='text-4xl font-black text-gray-900 tracking-tighter'>
                  Radiant<span className='text-pink-600'>AI</span>
                </h1>
              </div>
            )}
            <h3 className='text-3xl font-bold text-gray-900 mb-1'>
              {view === 'signup' ? 'Create Account' : 'Welcome back'}
            </h3>
            <p className='text-gray-500'>
              {view === 'signup'
                ? 'Join our community of beauty enthusiasts.'
                : 'Sign in to access your dashboard.'}
            </p>
          </header>

          {/* View Toggle */}
          <div className='bg-gray-50 p-1.5 rounded-2xl mb-6 flex gap-1 border border-gray-100'>
            <button
              onClick={() => setView('signup')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 text-sm ${
                view === 'signup'
                  ? 'bg-white text-pink-600 shadow-sm border border-gray-100'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Join Us
            </button>
            <button
              onClick={() => setView('login')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 text-sm ${
                view === 'login'
                  ? 'bg-white text-pink-600 shadow-sm border border-gray-100'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Sign In
            </button>
          </div>

          {displayError && (
            <ErrorAlert
              message={displayError}
              onDismiss={() => {
                setLocalError(null)
                dispatch(loginFailure(null))
              }}
            />
          )}
          {success && <SuccessAlert message={success} />}

          {/* Form Content */}
          <div className='relative overflow-hidden'>
            {view === 'signup' && (
              <div className='mb-8 flex items-center gap-2'>
                {[1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className={`h-1.5 rounded-full flex-1 transition-all duration-500 ${
                      step <= signupStep
                        ? 'bg-pink-500 w-full'
                        : 'bg-gray-100 w-full'
                    }`}
                  />
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} className='space-y-6'>
              <AnimatePresence mode='wait'>
                {view === 'signup' ? (
                  <>
                    {signupStep === 1 && (
                      <motion.div
                        key='signup-step-1'
                        variants={stepVariants}
                        initial='initial'
                        animate='animate'
                        exit='exit'
                        transition={{ duration: 0.3 }}
                        className='space-y-5'
                      >
                        <div className='group'>
                          <label className='block text-sm font-semibold text-gray-700 mb-2 group-focus-within:text-pink-600 transition-colors'>
                            What's your name?
                          </label>
                          <div className='relative'>
                            <User className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-pink-500 transition-colors' />
                            <input
                              type='text'
                              placeholder='Full Name'
                              value={formData.fullName}
                              onChange={(e) =>
                                updateFormData('fullName', e.target.value)
                              }
                              className='w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-pink-500 focus:ring-4 focus:ring-pink-50 outline-none transition-all placeholder:text-gray-400'
                              required
                              disabled={isLoading}
                            />
                          </div>
                        </div>

                        <div className='group'>
                          <label className='block text-sm font-semibold text-gray-700 mb-2 group-focus-within:text-pink-600 transition-colors'>
                            Phone Number
                          </label>
                          <div className='relative'>
                            <Phone className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-pink-500 transition-colors' />
                            <input
                              type='tel'
                              placeholder='+1 (555) 000-0000'
                              value={formData.phone}
                              onChange={(e) =>
                                updateFormData('phone', e.target.value)
                              }
                              className='w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-pink-500 focus:ring-4 focus:ring-pink-50 outline-none transition-all placeholder:text-gray-400'
                              disabled={isLoading}
                              required
                            />
                          </div>
                        </div>

                        <button
                          type='button'
                          onClick={handleNextStep}
                          className='w-full py-4 px-6 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-2 group transition-all transform hover:scale-[1.01] active:scale-[0.99] mt-10 shadow-lg shadow-gray-200'
                        >
                          Continue
                          <ChevronRight className='w-5 h-5 group-hover:translate-x-1 transition-transform' />
                        </button>
                      </motion.div>
                    )}

                    {signupStep === 2 && (
                      <motion.div
                        key='signup-step-2'
                        variants={stepVariants}
                        initial='initial'
                        animate='animate'
                        exit='exit'
                        transition={{ duration: 0.3 }}
                        className='space-y-5'
                      >
                        <div className='group'>
                          <label className='block text-sm font-semibold text-gray-700 mb-2 group-focus-within:text-pink-600 transition-colors'>
                            When's your birthday?
                          </label>
                          <p className='text-xs text-gray-400 mb-4'>
                            We'll send you something special on your big day!
                          </p>
                          <div className='relative'>
                            <Calendar className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-pink-500 transition-colors' />
                            <input
                              type='date'
                              value={formData.birthdate}
                              onChange={(e) =>
                                updateFormData('birthdate', e.target.value)
                              }
                              className='w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-pink-500 focus:ring-4 focus:ring-pink-50 outline-none transition-all'
                              disabled={isLoading}
                              required
                            />
                          </div>
                        </div>

                        <div className='flex gap-3 mt-10'>
                          <button
                            type='button'
                            onClick={handleBackStep}
                            className='flex-1 py-4 px-6 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all'
                          >
                            <ArrowLeft className='w-5 h-5' />
                            Back
                          </button>
                          <button
                            type='button'
                            onClick={handleNextStep}
                            className='flex-[2] py-4 px-6 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-2 group transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-gray-200'
                          >
                            Next Step
                            <ChevronRight className='w-5 h-5 group-hover:translate-x-1 transition-transform' />
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {signupStep === 3 && (
                      <motion.div
                        key='signup-step-3'
                        variants={stepVariants}
                        initial='initial'
                        animate='animate'
                        exit='exit'
                        transition={{ duration: 0.3 }}
                        className='space-y-5'
                      >
                        <div className='group'>
                          <label className='block text-sm font-semibold text-gray-700 mb-2 group-focus-within:text-pink-600 transition-colors'>
                            Email Address
                          </label>
                          <div className='relative'>
                            <Mail className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-pink-500 transition-colors' />
                            <input
                              type='email'
                              placeholder='hello@example.com'
                              value={formData.email}
                              onChange={(e) =>
                                updateFormData('email', e.target.value)
                              }
                              className='w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-pink-500 focus:ring-4 focus:ring-pink-50 outline-none transition-all'
                              required
                              disabled={isLoading}
                            />
                          </div>
                        </div>

                        <div className='grid grid-cols-1 gap-5'>
                          <div className='group'>
                            <label className='block text-sm font-semibold text-gray-700 mb-2 group-focus-within:text-pink-600 transition-colors'>
                              Password
                            </label>
                            <div className='relative'>
                              <Lock className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-pink-500 transition-colors' />
                              <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder='••••••••'
                                value={formData.password}
                                onChange={(e) =>
                                  updateFormData('password', e.target.value)
                                }
                                className='w-full pl-12 pr-12 py-3.5 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-pink-500 focus:ring-4 focus:ring-pink-50 outline-none transition-all'
                                required
                                minLength={8}
                                disabled={isLoading}
                              />
                              <button
                                type='button'
                                onClick={() => setShowPassword(!showPassword)}
                                className='absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
                              >
                                {showPassword ? (
                                  <EyeOff className='h-5 w-5' />
                                ) : (
                                  <Eye className='h-5 w-5' />
                                )}
                              </button>
                            </div>
                          </div>

                          <div className='group'>
                            <label className='block text-sm font-semibold text-gray-700 mb-2 group-focus-within:text-pink-600 transition-colors'>
                              Confirm Password
                            </label>
                            <div className='relative'>
                              <Lock className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-pink-500 transition-colors' />
                              <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                placeholder='••••••••'
                                value={formData.confirmPassword}
                                onChange={(e) =>
                                  updateFormData(
                                    'confirmPassword',
                                    e.target.value
                                  )
                                }
                                className='w-full pl-12 pr-12 py-3.5 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-pink-500 focus:ring-4 focus:ring-pink-50 outline-none transition-all'
                                required
                                disabled={isLoading}
                              />
                              <button
                                type='button'
                                onClick={() =>
                                  setShowConfirmPassword(!showConfirmPassword)
                                }
                                className='absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className='h-5 w-5' />
                                ) : (
                                  <Eye className='h-5 w-5' />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className='flex items-start gap-3 py-2'>
                          <input
                            type='checkbox'
                            required
                            className='mt-1 w-5 h-5 rounded-lg border-gray-200 text-pink-500 focus:ring-pink-200 transition-all'
                            disabled={isLoading}
                          />
                          <label className='text-sm text-gray-500 leading-snug'>
                            I agree to the{' '}
                            <button
                              type='button'
                              className='text-gray-900 border-b border-gray-900 hover:text-pink-600 hover:border-pink-600'
                            >
                              Terms Service
                            </button>{' '}
                            and{' '}
                            <button
                              type='button'
                              className='text-gray-900 border-b border-gray-900 hover:text-pink-600 hover:border-pink-600'
                            >
                              Privacy Policy
                            </button>
                          </label>
                        </div>

                        <div className='flex gap-3 mt-8'>
                          <button
                            type='button'
                            onClick={handleBackStep}
                            className='flex-1 py-4 px-6 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all'
                          >
                            <ArrowLeft className='w-5 h-5' />
                          </button>
                          <button
                            type='submit'
                            disabled={isLoading}
                            className={`flex-[4] py-4 px-6 rounded-2xl font-bold text-white shadow-xl shadow-pink-500/20 transition-all flex items-center justify-center gap-3 transform hover:scale-[1.02] active:scale-[0.98] ${
                              isLoading
                                ? 'bg-gray-300'
                                : 'bg-gradient-to-r from-pink-500 to-rose-600 hover:shadow-pink-500/40'
                            }`}
                          >
                            {isLoading ? (
                              <Loader2 className='w-6 h-6 animate-spin' />
                            ) : (
                              <>
                                Finish & Join
                              </>
                            )}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </>
                ) : (
                  <motion.div
                    key='login-form'
                    variants={stepVariants}
                    initial='initial'
                    animate='animate'
                    exit='exit'
                    transition={{ duration: 0.3 }}
                    className='space-y-6'
                  >
                    <div className='group'>
                      <label className='block text-sm font-semibold text-gray-700 mb-2 group-focus-within:text-pink-600 transition-colors'>
                        Email Address
                      </label>
                      <div className='relative'>
                        <Mail className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-pink-500 transition-colors' />
                        <input
                          type='email'
                          placeholder='hello@example.com'
                          value={formData.email}
                          onChange={(e) =>
                            updateFormData('email', e.target.value)
                          }
                          className='w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-pink-500 focus:ring-4 focus:ring-pink-50 outline-none transition-all'
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className='group'>
                      <div className='flex items-center justify-between mb-2'>
                        <label className='text-sm font-semibold text-gray-700 group-focus-within:text-pink-600 transition-colors'>
                          Password
                        </label>
                        <button
                          type='button'
                          className='text-xs font-bold text-pink-600 hover:text-pink-700'
                        >
                          Forgot?
                        </button>
                      </div>
                      <div className='relative'>
                        <Lock className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-pink-500 transition-colors' />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder='••••••••'
                          value={formData.password}
                          onChange={(e) =>
                            updateFormData('password', e.target.value)
                          }
                          className='w-full pl-12 pr-12 py-3.5 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-pink-500 focus:ring-4 focus:ring-pink-50 outline-none transition-all'
                          required
                          disabled={isLoading}
                        />
                        <button
                          type='button'
                          onClick={() => setShowPassword(!showPassword)}
                          className='absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
                        >
                          {showPassword ? (
                            <EyeOff className='h-5 w-5' />
                          ) : (
                            <Eye className='h-5 w-5' />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type='submit'
                      disabled={isLoading}
                      className={`w-full py-4 px-6 rounded-2xl font-bold text-white shadow-xl shadow-pink-500/20 transition-all flex items-center justify-center gap-3 transform hover:scale-[1.02] active:scale-[0.98] mt-4 ${
                        isLoading
                          ? 'bg-gray-300'
                          : 'bg-gradient-to-r from-pink-500 to-rose-600 hover:shadow-pink-500/40'
                      }`}
                    >
                      {isLoading ? (
                        <Loader2 className='w-6 h-6 animate-spin' />
                      ) : (
                        <>
                          Sign In
                          <ArrowRight className='h-5 w-5' />
                        </>
                      )}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>

          <footer className='mt-12 text-center'>
            <p className='text-sm text-gray-400'>
              Need help?{' '}
              <button className='text-gray-900 font-bold hover:text-pink-600 transition-colors'>
                Contact Support
              </button>
            </p>
          </footer>
        </div>
      </div>
    </div>
  )
}

export default AuthPage
