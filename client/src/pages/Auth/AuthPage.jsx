// File: client/src/pages/Auth/AuthPage.jsx
import { axiosInstance } from '@/config'
import {
  loginFailure,
  loginStart,
  loginSuccess,
  selectIsLoading,
} from '@/redux/userSlice'
import { useMutation } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowRight,
  Bot,
  Calendar,
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
  console.log(
    'Calling signin endpoint:',
    axiosInstance.defaults.baseURL + '/auth/signin'
  )
  console.log('Credentials being sent:', credentials)
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
      <div className='absolute inset-0 bg-gradient-to-r from-pink-500 to-rose-600' />
      <div className='absolute inset-0 bg-gradient-to-tl from-pink-900/60 via-transparent to-purple-900/60' />
      <div className='absolute inset-0 bg-[linear-gradient(0deg,transparent_calc(100%-1px),rgba(255,255,255,0.05)_100%),linear-gradient(90deg,transparent_calc(100%-1px),rgba(255,255,255,0.05)_100%)] bg-[size:60px_60px]' />

      <div
        className='absolute w-32 h-32 md:w-40 md:h-40 rounded-full bg-pink-500/15 blur-3xl animate-pulse'
        style={{ top: '10%', left: '5%', animationDuration: '6s' }}
      />
      <div
        className='absolute w-24 h-24 md:w-32 md:h-32 rounded-full bg-purple-400/12 blur-3xl animate-pulse'
        style={{
          top: '70%',
          right: '5%',
          animationDuration: '5s',
          animationDelay: '1s',
        }}
      />
      <div
        className='absolute w-20 h-20 md:w-28 md:h-28 rounded-full bg-pink-400/10 blur-3xl animate-pulse'
        style={{
          bottom: '15%',
          left: '10%',
          animationDuration: '7s',
          animationDelay: '2s',
        }}
      />
    </div>
  )
}

const ErrorAlert = ({ message, onDismiss }) => (
  <div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2'>
    <AlertCircle className='w-4 h-4 text-red-500 mt-0.5 flex-shrink-0' />
    <div className='flex-1'>
      <p className='text-sm text-red-800'>{message}</p>
    </div>
    <button
      onClick={onDismiss}
      className='text-red-400 hover:text-red-600 text-lg font-medium leading-none min-w-[20px] h-5 flex items-center justify-center'
      type='button'
    >
      ×
    </button>
  </div>
)

const SuccessAlert = ({ message }) => (
  <div className='mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2'>
    <div className='w-4 h-4 bg-green-500 rounded-full mt-0.5 flex-shrink-0' />
    <p className='text-sm text-green-800'>{message}</p>
  </div>
)

const AuthPage = () => {
  const dispatch = useDispatch()
  const isLoading = useSelector(selectIsLoading)
  const reduxError = useSelector((state) => state.user.error)

  const [view, setView] = useState('signup')
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

  const isMobile = windowWidth < 768

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    setLocalError(null)
    setSuccess(null)
    // Don't clear redux error here - only clear when view changes
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
      setSuccess('Account created successfully! Welcome aboard!')
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        birthdate: '',
        password: '',
        confirmPassword: '',
      })
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
      setSuccess('Welcome back! Signing you in...')
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError(null)
    setSuccess(null)

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

  const clearAllErrors = () => {
    setLocalError(null)
    if (reduxError) {
      dispatch(loginFailure(null))
    }
  }

  const displayError =
    localError || (typeof reduxError === 'string' ? reduxError : null)

  return (
    <div className='min-h-screen flex'>
      {!isMobile && (
        <div className='w-2/5 relative overflow-hidden'>
          <AnimatedBackground />
          <FloatingElements />

          <div className='relative z-20 h-full flex flex-col justify-center items-center text-center p-6 lg:p-8'>
            <div className='mb-8'>
              <h1 className='text-3xl font-bold text-white tracking-tight'>
                RadiantAI
              </h1>
            </div>

            <div className='space-y-6'>
              <h2 className='text-4xl lg:text-6xl font-black text-white leading-none'>
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
              </h2>

              <p className='text-lg lg:text-xl text-pink-100/80 font-light max-w-sm mx-auto'>
                {view === 'signup'
                  ? 'Transform your clinic with intelligent automation'
                  : 'Continue your AI-powered journey'}
              </p>
            </div>

            <div className='mt-12'>
              <div className='w-20 h-1 bg-gradient-to-r from-pink-500 to-rose-600 rounded-full mx-auto'></div>
            </div>
          </div>
        </div>
      )}

      <div
        className={`${
          isMobile ? 'w-full' : 'w-3/5'
        } bg-white flex flex-col h-screen overflow-hidden`}
      >
        <div className='flex-shrink-0 pt-4 pb-4 justify-center items-center text-center'>
          <h3 className='text-xl lg:text-2xl font-bold text-gray-900 mb-1'>
            {view === 'signup' ? 'Create Account' : 'Welcome Back'}
          </h3>
          <p className='text-gray-600 text-sm'>
            {view === 'signup'
              ? 'Start your AI journey today'
              : 'Sign in to your account'}
          </p>
        </div>

        <div className='flex-shrink-0 px-4 lg:px-6 mb-4'>
          <div className='w-full max-w-md mx-auto'>
            <div className='flex bg-gray-100 rounded-xl p-1'>
              <button
                onClick={() => setView('signup')}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-300 text-sm ${
                  view === 'signup'
                    ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }`}
              >
                Sign Up
              </button>
              <button
                onClick={() => setView('login')}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-300 text-sm ${
                  view === 'login'
                    ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }`}
              >
                Login
              </button>
            </div>
          </div>
        </div>

        <div className='flex-1 overflow-y-auto px-4 lg:px-6'>
          <div className='w-full max-w-md mx-auto pb-8'>
            {displayError && (
              <ErrorAlert message={displayError} onDismiss={clearAllErrors} />
            )}
            {success && <SuccessAlert message={success} />}

            <div className='relative'>
              <form onSubmit={handleSubmit} className='space-y-5'>
                {view === 'signup' ? (
                  <>
                    <div>
                      <label className='block text-xs font-medium text-gray-700 mb-1'>
                        Full Name *
                      </label>
                      <div className='relative'>
                        <User className='absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
                        <input
                          type='text'
                          value={formData.fullName}
                          onChange={(e) =>
                            updateFormData('fullName', e.target.value)
                          }
                          className='w-full pl-8 pr-3 py-2 border-b border-gray-200 focus:border-pink-500 outline-none transition-colors bg-transparent text-sm'
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div>
                      <label className='block text-xs font-medium text-gray-700 mb-1'>
                        Email Address *
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
                          disabled={isLoading}
                        />
                      </div>
                    </div>

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
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div>
                      <label className='block text-xs font-medium text-gray-700 mb-1'>
                        Date of Birth
                      </label>
                      <div className='relative'>
                        <Calendar className='absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
                        <input
                          type='date'
                          value={formData.birthdate}
                          onChange={(e) =>
                            updateFormData('birthdate', e.target.value)
                          }
                          className='w-full pl-8 pr-3 py-2 border-b border-gray-200 focus:border-pink-500 outline-none transition-colors bg-transparent text-sm'
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div>
                      <label className='block text-xs font-medium text-gray-700 mb-1'>
                        Password * (min. 8 characters)
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
                          minLength={8}
                          disabled={isLoading}
                        />
                        <button
                          type='button'
                          onClick={() => setShowPassword(!showPassword)}
                          className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
                          disabled={isLoading}
                        >
                          {showPassword ? (
                            <EyeOff className='h-4 w-4' />
                          ) : (
                            <Eye className='h-4 w-4' />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className='block text-xs font-medium text-gray-700 mb-1'>
                        Confirm Password *
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
                          disabled={isLoading}
                        />
                        <button
                          type='button'
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
                          disabled={isLoading}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className='h-4 w-4' />
                          ) : (
                            <Eye className='h-4 w-4' />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className='flex items-start gap-2'>
                      <input
                        type='checkbox'
                        required
                        className='mt-1 rounded border-pink-300 text-pink-500 focus:ring-pink-400'
                        disabled={isLoading}
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
                    <div>
                      <label className='block text-xs font-medium text-gray-700 mb-1'>
                        Email Address *
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
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div>
                      <label className='block text-xs font-medium text-gray-700 mb-1'>
                        Password *
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
                          disabled={isLoading}
                        />
                        <button
                          type='button'
                          onClick={() => setShowPassword(!showPassword)}
                          className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
                          disabled={isLoading}
                        >
                          {showPassword ? (
                            <EyeOff className='h-4 w-4' />
                          ) : (
                            <Eye className='h-4 w-4' />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className='flex items-center justify-between'>
                      <label className='flex items-center gap-2 text-xs text-gray-600'>
                        <input
                          type='checkbox'
                          className='rounded border-pink-300 text-pink-500 focus:ring-pink-400'
                          disabled={isLoading}
                        />
                        Remember me
                      </label>
                      <button
                        type='button'
                        className='text-xs text-pink-600 hover:text-pink-700 font-medium'
                        disabled={isLoading}
                      >
                        Forgot password?
                      </button>
                    </div>
                  </>
                )}

                <button
                  type='submit'
                  disabled={isLoading}
                  className={`w-full py-4 px-6 rounded-2xl font-bold text-base transition-all duration-300 flex items-center justify-center gap-3 mt-8 shadow-lg ${
                    isLoading
                      ? 'bg-gray-400 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-pink-500/25 hover:shadow-pink-500/40 hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className='w-5 h-5 animate-spin' />
                      <span>
                        {view === 'signup'
                          ? 'Creating Account...'
                          : 'Signing In...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        {view === 'signup' ? 'Create Account' : 'Sign In'}
                      </span>
                      <ArrowRight className='h-5 w-5 group-hover:translate-x-1 transition-transform' />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthPage
