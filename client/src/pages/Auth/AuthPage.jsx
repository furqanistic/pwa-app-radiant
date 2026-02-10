// File: client/src/pages/Auth/AuthPage.jsx
import { axiosInstance } from '@/config'
import { useBranding } from '@/context/BrandingContext'
import {
    loginFailure,
    loginStart,
    loginSuccess,
    selectIsLoading,
} from '@/redux/userSlice'
import { locationService } from '@/services/locationService'
import { useMutation, useQuery } from '@tanstack/react-query'
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
    MapPin,
    Phone,
    Search,
    Sparkles,
    User,
    Zap,
} from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
    useLocation,
    useNavigate,
    useSearchParams,
} from 'react-router-dom'

const signupUser = async (userData) => {
  const response = await axiosInstance.post('/auth/signup', userData)
  return response.data
}

const signinUser = async (credentials) => {
  const response = await axiosInstance.post('/auth/signin', credentials)
  return response.data
}

const clampChannel = (value) => Math.max(0, Math.min(255, value))

const hexToRgb = (hex) => {
  if (!hex) return { r: 236, g: 72, b: 153 }
  const cleaned = hex.replace('#', '')
  if (cleaned.length !== 6) return { r: 236, g: 72, b: 153 }
  const num = parseInt(cleaned, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

const rgbaFromHex = (hex, alpha) => {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const adjustHex = (hex, amount) => {
  const { r, g, b } = hexToRgb(hex)
  const rr = clampChannel(r + amount)
  const gg = clampChannel(g + amount)
  const bb = clampChannel(b + amount)
  return `#${rr.toString(16).padStart(2, '0')}${gg
    .toString(16)
    .padStart(2, '0')}${bb.toString(16).padStart(2, '0')}`
}

const FloatingElements = ({ brandColor }) => {
  const tintSoft = rgbaFromHex(brandColor, 0.2)
  const tintSoftAlt = rgbaFromHex(brandColor, 0.25)
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
            <Sparkles className='h-3 w-3' style={{ color: tintSoft }} />
          ) : i % 4 === 1 ? (
            <Bot className='h-3 w-3' style={{ color: tintSoftAlt }} />
          ) : i % 4 === 2 ? (
            <Heart className='h-2 w-2' style={{ color: tintSoft }} />
          ) : (
            <Zap className='h-3 w-3' style={{ color: tintSoftAlt }} />
          )}
        </div>
      ))}
    </div>
  )
}

const AnimatedBackground = ({ brandColor }) => {
  const mid = adjustHex(brandColor, -10)
  const dark = adjustHex(brandColor, -30)
  const blobA = rgbaFromHex(brandColor, 0.2)
  const blobB = rgbaFromHex(brandColor, 0.15)
  return (
    <div className='absolute inset-0 overflow-hidden z-0'>
      <div
        className='absolute inset-0'
        style={{
          background: `linear-gradient(135deg, ${brandColor} 0%, ${mid} 50%, ${dark} 100%)`,
        }}
      />
      <div className='absolute inset-0 bg-[linear-gradient(0deg,transparent_calc(100%-1px),rgba(255,255,255,0.05)_100%),linear-gradient(90deg,transparent_calc(100%-1px),rgba(255,255,255,0.05)_100%)] bg-[size:40px_40px]' />

      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className='absolute w-[500px] h-[500px] -top-40 -left-40 rounded-full blur-[100px]'
        style={{ backgroundColor: blobA }}
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
        className='absolute w-[400px] h-[400px] -bottom-20 -right-20 rounded-full blur-[100px]'
        style={{ backgroundColor: blobB }}
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
  const navigate = useNavigate()
  const { branding, locationId: contextLocationId, hasBranding } = useBranding()
  const [searchParams] = useSearchParams()
  const urlLocationId = searchParams.get('spa')
  const locationId = urlLocationId || null // Prioritize URL over context for UI state
  const isLoading = useSelector(selectIsLoading)
  const reduxError = useSelector((state) => state.user.error)
  
  // Get branding context
  // const { branding, loading: brandingLoading, hasBranding, locationId } = useBranding()

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

  const [searchTerm, setSearchTerm] = useState('')

  // Fetch active locations for the selector
  const {
    data: locationsData,
    isLoading: locationsLoading,
  } = useQuery({
    queryKey: ['active-locations'],
    queryFn: locationService.getActiveLocations,
    staleTime: 5 * 60 * 1000,
    enabled: !locationId, // Only fetch if we don't have a location selected
  })

  const spas = useMemo(() => {
    if (!locationsData?.data?.locations) return []
    return locationsData.data.locations
      .filter((location) => location.name?.trim())
      .map((location) => ({
        locationId: location.locationId,
        name: location.name,
        address: location.address || 'Address not available',
      }))
  }, [locationsData])

  const filteredSpas = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return spas
    return spas.filter(
      (spa) =>
        spa.name.toLowerCase().includes(term) ||
        spa.address.toLowerCase().includes(term)
    )
  }, [spas, searchTerm])

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

  const buildSpaPath = useMemo(() => {
    return (path) =>
      locationId ? `${path}?spa=${encodeURIComponent(locationId)}` : path
  }, [locationId])

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
        navigate(buildSpaPath('/welcome'))
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
        navigate(buildSpaPath('/dashboard'))
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
        assignedLocation: locationId,
        dateOfBirth: formData.birthdate,
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

  const brandColor = branding?.themeColor || '#ec4899'

  return (
    <div
      className='min-h-screen bg-white flex font-sans'
      style={{
        ['--brand-primary']: brandColor,
      }}
    >
      {!isMobile && (
        <div className='w-1/2 relative overflow-hidden flex items-center justify-center p-12'>
          <AnimatedBackground brandColor={brandColor} />
          <FloatingElements brandColor={brandColor} />

          <div className='relative z-20 w-full max-w-lg'>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className='flex flex-col items-center justify-center mb-12 w-full'>
                {hasBranding && branding?.logo ? (
                  <div className="flex flex-col items-center">
                    <img 
                      src={branding.logo} 
                      alt={branding.name} 
                      className="h-24 w-auto mb-4 object-contain shadow-2xl rounded-2xl p-2 bg-white/10 backdrop-blur-md"
                    />
                  <h1
                    className='text-4xl font-black text-white tracking-tighter uppercase text-center'
                    style={{ textShadow: `0 8px 40px ${brandColor}66` }}
                  >
                    {branding.name}
                  </h1>
                </div>
              ) : (
                  <h1 className='text-6xl font-black text-white tracking-tighter'>
                    Radiant<span style={{ color: 'var(--brand-primary)' }}>AI</span>
                  </h1>
                )}
              </div>

              <h2 className='text-6xl font-black text-white leading-[1.1] mb-8'>
                {view === 'signup' ? (
                  <>
                    REVEAL YOUR
                    <br />
                    <span className='text-white/95'>TRUE RADIANCE</span>
                  </>
                ) : (
                  <>
                    GLOWING
                    <br />
                    <span className='text-white/95'>RETURNS HERE</span>
                  </>
                )}
              </h2>

              <p className='text-xl text-white/80 font-light leading-relaxed max-w-md'>
                Experience the next generation of beauty management.
                Intelligent, elegant, and uniquely yours.
              </p>

              <div className='mt-12 flex gap-4'>
                <div className='px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 flex items-center gap-2'>
                  <Bot className='w-4 h-4 text-white/90' />
                  <span className='text-white text-sm font-medium'>
                    AI-Powered Insights
                  </span>
                </div>
                <div className='px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 flex items-center gap-2'>
                  <Zap className='w-4 h-4 text-white/90' />
                  <span className='text-white text-sm font-medium'>
                    Pro Features
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Decorative background for mobile/pwa feel */}
      <div className='absolute inset-0 z-0 opacity-[0.03] pointer-events-none overflow-hidden'>
        <div 
          className='absolute -top-[20%] -right-[20%] w-[80%] h-[80%] rounded-full blur-[120px]'
          style={{ background: 'var(--brand-primary)' }}
        />
        <div 
          className='absolute -bottom-[20%] -left-[20%] w-[80%] h-[80%] rounded-full blur-[120px]'
          style={{ background: 'var(--brand-primary)' }}
        />
      </div>

      <div
        className={`${
          isMobile ? 'w-full px-6' : 'w-1/2'
        } relative flex flex-col justify-center bg-white`}
      >
        <div className='max-w-md w-full mx-auto'>
          {/* Header */}
          <header className='mb-2'>
            {isMobile && (
              <div className='flex flex-col items-center justify-center mb-10'>
                {hasBranding && branding?.logo ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className='p-1 bg-white rounded-3xl shadow-xl shadow-[color:var(--brand-primary)]/5 border border-gray-50'>
                      <img 
                        src={branding.logo} 
                        alt={branding.name} 
                        className="h-20 w-20 object-contain rounded-2xl"
                      />
                    </div>
                    <span className="text-2xl font-black text-gray-900 tracking-tight uppercase">
                      {branding.name}
                    </span>
                  </div>
                ) : (
                  <div className='flex flex-col items-center'>
                    <div className='w-16 h-16 rounded-[24px] bg-[color:var(--brand-primary)] flex items-center justify-center mb-3 shadow-lg shadow-[color:var(--brand-primary)]/20 rotate-12'>
                      <Sparkles className='w-8 h-8 text-white' />
                    </div>
                    <h1 className='text-3xl font-black text-gray-900 tracking-tighter'>
                      Radiant<span style={{ color: 'var(--brand-primary)' }}>AI</span>
                    </h1>
                  </div>
                )}
              </div>
            )}
            <h3 className='text-3xl font-bold text-gray-900 mb-1'>
              {!locationId ? 'Choose your spa' : view === 'signup' ? 'Create Account' : 'Welcome back'}
            </h3>
            <p className='text-gray-500'>
              {!locationId 
                ? 'Select a location to continue to login.' 
                : view === 'signup'
                  ? 'Join our community of beauty enthusiasts.'
                  : 'Sign in to access your dashboard.'}
            </p>
          </header>

          {/* View Toggle - Only show if locationId is present */}
          {locationId ? (
            <div className='bg-gray-50 p-1.5 rounded-2xl mb-6 flex gap-1 border border-gray-100'>
              <button
                onClick={() => setView('signup')}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 text-sm ${
                  view === 'signup'
                    ? 'bg-white shadow-sm border border-gray-100'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
                style={view === 'signup' ? { color: 'var(--brand-primary)' } : undefined}
              >
                Join Us
              </button>
              <button
                onClick={() => setView('login')}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 text-sm ${
                  view === 'login'
                    ? 'bg-white shadow-sm border border-gray-100'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
                style={view === 'login' ? { color: 'var(--brand-primary)' } : undefined}
              >
                Sign In
              </button>
            </div>
          ) : (
            <div className='mb-8 px-2'>
              <div className='relative group'>
                <div className='absolute inset-0 bg-[color:var(--brand-primary)]/5 blur-xl group-focus-within:bg-[color:var(--brand-primary)]/10 transition-all rounded-full' />
                <div className='relative'>
                  <Search className='absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[color:var(--brand-primary)] transition-colors' />
                  <input
                    type='text'
                    placeholder='Find your favorite spa...'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className='w-full pl-14 pr-6 py-4 bg-white border border-gray-100 rounded-full shadow-lg shadow-gray-100/50 focus:border-[color:var(--brand-primary)] focus:ring-4 focus:ring-[color:var(--brand-primary)/0.08] outline-none transition-all placeholder:text-gray-400 text-base font-medium'
                  />
                </div>
              </div>
            </div>
          )}

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

          {/* Form Content or Location Selector */}
          <div className='relative overflow-hidden'>
            {!locationId ? (
              <div className='space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar'>
                {locationsLoading ? (
                  [1, 2, 3, 4].map((i) => (
                    <div key={i} className='h-20 bg-gray-50 rounded-2xl animate-pulse' />
                  ))
                ) : filteredSpas.length === 0 ? (
                  <div className='text-center py-10 text-sm text-gray-500'>
                    No locations match your search.
                  </div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className='grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 px-1'
                  >
                    {filteredSpas.map((spa, idx) => (
                      <motion.button
                        key={spa.locationId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => navigate(`/auth?spa=${encodeURIComponent(spa.locationId)}`)}
                        className='text-left p-5 rounded-3xl border border-gray-50 bg-white hover:border-[color:var(--brand-primary)]/30 hover:bg-gray-50/50 transition-all group shadow-sm hover:shadow-xl hover:-translate-y-1 relative overflow-hidden'
                      >
                        <div className='absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity'>
                          <div className='w-8 h-8 rounded-full bg-[color:var(--brand-primary)]/10 flex items-center justify-center'>
                            <ArrowRight className='w-4 h-4 text-[color:var(--brand-primary)]' />
                          </div>
                        </div>
                        <div className='font-bold text-gray-900 text-base mb-2 group-hover:text-[color:var(--brand-primary)] transition-colors'>
                          {spa.name}
                        </div>
                        <div className='flex items-start gap-2 text-xs text-gray-400 font-medium leading-relaxed'>
                          <MapPin className='w-3.5 h-3.5 mt-0.5 flex-shrink-0' />
                          <span className='line-clamp-2'>{spa.address}</span>
                        </div>
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className='space-y-6'>
                {view === 'signup' && (
                  <div className='mb-8 flex items-center gap-2'>
                    {[1, 2, 3].map((step) => (
                      <div
                        key={step}
                        className={`h-1.5 rounded-full flex-1 transition-all duration-500 ${
                          step <= signupStep ? 'w-full' : 'bg-gray-100 w-full'
                        }`}
                        style={step <= signupStep ? { background: 'var(--brand-primary)' } : undefined}
                      />
                    ))}
                  </div>
                )}

                <AnimatePresence mode='wait'>
                  {view === 'signup' ? (
                    <>
                      {/* ... existing signup steps ... */}
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
                            <label className='block text-sm font-semibold text-gray-700 mb-2 group-focus-within:text-[color:var(--brand-primary)] transition-colors'>
                              What's your name?
                            </label>
                            <div className='relative'>
                              <User className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[color:var(--brand-primary)] transition-colors' />
                              <input
                                type='text'
                                placeholder='Full Name'
                                value={formData.fullName}
                                onChange={(e) =>
                                  updateFormData('fullName', e.target.value)
                                }
                                className='w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-[20px] shadow-sm focus:border-[color:var(--brand-primary)] focus:ring-4 focus:ring-[color:var(--brand-primary)/0.08] outline-none transition-all placeholder:text-gray-400 text-base'
                                required
                                disabled={isLoading}
                              />
                            </div>
                          </div>

                          <div className='group'>
                            <label className='block text-sm font-semibold text-gray-700 mb-2 group-focus-within:text-[color:var(--brand-primary)] transition-colors'>
                              Phone Number
                            </label>
                            <div className='relative'>
                              <Phone className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[color:var(--brand-primary)] transition-colors' />
                              <input
                                type='tel'
                                placeholder='+1 (555) 000-0000'
                                value={formData.phone}
                                onChange={(e) =>
                                  updateFormData('phone', e.target.value)
                                }
                                className='w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-[20px] shadow-sm focus:border-[color:var(--brand-primary)] focus:ring-4 focus:ring-[color:var(--brand-primary)/0.08] outline-none transition-all placeholder:text-gray-400 text-base'
                                disabled={isLoading}
                                required
                              />
                            </div>
                          </div>

                          <button
                            type='button'
                            onClick={handleNextStep}
                            className='w-full py-4 px-6 text-white rounded-2xl font-bold flex items-center justify-center gap-2 group transition-all transform hover:scale-[1.01] active:scale-[0.99] mt-10 shadow-lg shadow-gray-200'
                            style={{ background: 'var(--brand-primary)' }}
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
                          {/* ... step 2 content ... */}
                          <div className='group'>
                            <label className='block text-sm font-semibold text-gray-700 mb-2 group-focus-within:text-[color:var(--brand-primary)] transition-colors'>
                              When's your birthday?
                            </label>
                            <p className='text-xs text-gray-400 mb-4'>
                              We'll send you something special on your big day!
                            </p>
                            <div className='relative'>
                              <Calendar className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[color:var(--brand-primary)] transition-colors' />
                              <input
                                type='date'
                                value={formData.birthdate}
                                onChange={(e) =>
                                  updateFormData('birthdate', e.target.value)
                                }
                                className='w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-[20px] shadow-sm focus:border-[color:var(--brand-primary)] focus:ring-4 focus:ring-[color:var(--brand-primary)/0.08] outline-none transition-all text-base'
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
                              className='flex-[2] py-4 px-6 text-white rounded-2xl font-bold flex items-center justify-center gap-2 group transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-gray-200'
                              style={{ background: 'var(--brand-primary)' }}
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
                          {/* ... step 3 content ... */}
                          <div className='group'>
                            <label className='block text-sm font-semibold text-gray-700 mb-2 group-focus-within:text-[color:var(--brand-primary)] transition-colors'>
                              Email Address
                            </label>
                            <div className='relative'>
                              <Mail className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[color:var(--brand-primary)] transition-colors' />
                              <input
                                type='email'
                                placeholder='hello@example.com'
                                value={formData.email}
                                onChange={(e) =>
                                  updateFormData('email', e.target.value)
                                }
                                className='w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-[20px] shadow-sm focus:border-[color:var(--brand-primary)] focus:ring-4 focus:ring-[color:var(--brand-primary)/0.08] outline-none transition-all text-base'
                                required
                                disabled={isLoading}
                              />
                            </div>
                          </div>

                          <div className='grid grid-cols-1 gap-5'>
                            <div className='group'>
                              <label className='block text-sm font-semibold text-gray-700 mb-2 group-focus-within:text-[color:var(--brand-primary)] transition-colors'>
                                Password
                              </label>
                              <div className='relative'>
                                <Lock className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[color:var(--brand-primary)] transition-colors' />
                                <input
                                  type={showPassword ? 'text' : 'password'}
                                  placeholder='••••••••'
                                  value={formData.password}
                                  onChange={(e) =>
                                    updateFormData('password', e.target.value)
                                  }
                                  className='w-full pl-12 pr-12 py-4 bg-white border border-gray-100 rounded-[20px] shadow-sm focus:border-[color:var(--brand-primary)] focus:ring-4 focus:ring-[color:var(--brand-primary)/0.08] outline-none transition-all text-base'
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
                              <label className='block text-sm font-semibold text-gray-700 mb-2 group-focus-within:text-[color:var(--brand-primary)] transition-colors'>
                                Confirm Password
                              </label>
                              <div className='relative'>
                                <Lock className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[color:var(--brand-primary)] transition-colors' />
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
                                  className='w-full pl-12 pr-12 py-4 bg-white border border-gray-100 rounded-[20px] shadow-sm focus:border-[color:var(--brand-primary)] focus:ring-4 focus:ring-[color:var(--brand-primary)/0.08] outline-none transition-all text-base'
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
                              className='mt-1 w-5 h-5 rounded-lg border-gray-200 focus:ring-[color:var(--brand-primary)/0.25] transition-all'
                              style={{ color: 'var(--brand-primary)' }}
                              disabled={isLoading}
                            />
                            <label className='text-sm text-gray-500 leading-snug'>
                              I agree to the{' '}
                              <button
                                type='button'
                                className='text-gray-900 border-b border-gray-900 hover:text-[color:var(--brand-primary)] hover:border-[color:var(--brand-primary)]'
                              >
                                Terms Service
                              </button>{' '}
                              and{' '}
                              <button
                                type='button'
                                className='text-gray-900 border-b border-gray-900 hover:text-[color:var(--brand-primary)] hover:border-[color:var(--brand-primary)]'
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
                              className={`flex-[4] py-4 px-6 rounded-2xl font-bold text-white shadow-xl transition-all flex items-center justify-center gap-3 transform hover:scale-[1.02] active:scale-[0.98] ${
                                isLoading ? 'bg-gray-300' : ''
                              }`}
                              style={
                                isLoading
                                  ? undefined
                                  : {
                                      background: 'var(--brand-primary)',
                                      boxShadow:
                                        '0 20px 45px rgba(0,0,0,0.12)',
                                    }
                              }
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
                        <label className='block text-sm font-semibold text-gray-700 mb-2 group-focus-within:text-[color:var(--brand-primary)] transition-colors'>
                          Email Address
                        </label>
                        <div className='relative'>
                          <Mail className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[color:var(--brand-primary)] transition-colors' />
                          <input
                            type='email'
                            placeholder='hello@example.com'
                            value={formData.email}
                            onChange={(e) =>
                              updateFormData('email', e.target.value)
                            }
                            className='w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-[20px] shadow-sm focus:border-[color:var(--brand-primary)] focus:ring-4 focus:ring-[color:var(--brand-primary)/0.08] outline-none transition-all text-base'
                            required
                            disabled={isLoading}
                          />
                        </div>
                      </div>

                      <div className='group'>
                        <div className='flex items-center justify-between mb-2'>
                          <label className='text-sm font-semibold text-gray-700 group-focus-within:text-[color:var(--brand-primary)] transition-colors'>
                            Password
                          </label>
                          <button
                            type='button'
                            className='text-xs font-bold hover:text-[color:var(--brand-primary)]'
                            style={{ color: 'var(--brand-primary)' }}
                          >
                            Forgot?
                          </button>
                        </div>
                        <div className='relative'>
                          <Lock className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[color:var(--brand-primary)] transition-colors' />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder='••••••••'
                            value={formData.password}
                            onChange={(e) =>
                              updateFormData('password', e.target.value)
                            }
                            className='w-full pl-12 pr-12 py-4 bg-white border border-gray-100 rounded-[20px] shadow-sm focus:border-[color:var(--brand-primary)] focus:ring-4 focus:ring-[color:var(--brand-primary)/0.08] outline-none transition-all text-base'
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
                        className={`w-full py-4 px-6 rounded-2xl font-bold text-white shadow-xl transition-all flex items-center justify-center gap-3 transform hover:scale-[1.02] active:scale-[0.98] mt-4 ${
                          isLoading ? 'bg-gray-300' : ''
                        }`}
                        style={
                          isLoading
                            ? undefined
                            : {
                                background: 'var(--brand-primary)',
                                boxShadow:
                                  '0 20px 45px rgba(0,0,0,0.12)',
                              }
                        }
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
            )}
          </div>

          <footer className='mt-12 text-center'>
            <p className='text-sm text-gray-400'>
              Need help?{' '}
              <button className='text-gray-900 font-bold hover:text-[color:var(--brand-primary)] transition-colors'>
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
