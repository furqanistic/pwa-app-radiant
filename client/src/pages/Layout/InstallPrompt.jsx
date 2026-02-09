// File: client/src/pages/Layout/InstallPrompt.jsx
// ENHANCED: Automatic app installation across all browsers with premium UI
import { AnimatePresence, motion } from 'framer-motion'
import {
    ArrowUp,
    CheckCircle,
    ChevronRight,
    Download,
    Info,
    MoreVertical,
    PlusSquare,
    Share,
    Smartphone,
    X,
    Zap,
} from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useBranding } from '@/context/BrandingContext'

const STORAGE_KEYS = {
  DISMISSED: 'radiant-install-dismissed',
  SUCCESS_SHOWN: 'radiant-install-success-shown',
  NEVER_SHOW: 'radiant-install-never-show',
}

const DISMISSAL_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

const PROMPT_STATES = {
  INITIAL: 'initial',
  IOS_INSTRUCTIONS: 'ios_instructions',
  ANDROID_INSTRUCTIONS: 'android_instructions',
  GENERAL_INSTRUCTIONS: 'general_instructions',
  SUCCESS: 'success',
}

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [promptState, setPromptState] = useState(PROMPT_STATES.INITIAL)
  const { branding } = useBranding()
  const brandColor = branding?.themeColor || '#ec4899'
  const brandColorDark = (() => {
    const cleaned = brandColor.replace('#', '')
    if (cleaned.length !== 6) return '#b0164e'
    const num = parseInt(cleaned, 16)
    const r = Math.max(0, ((num >> 16) & 255) - 24)
    const g = Math.max(0, ((num >> 8) & 255) - 24)
    const b = Math.max(0, (num & 255) - 24)
    return `#${r.toString(16).padStart(2, '0')}${g
      .toString(16)
      .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  })()

  // Improved browser detection
  const browserInfo = useMemo(() => {
    const ua = navigator.userAgent
    const isChrome =
      /Chrome/.test(ua) &&
      /Google Inc/.test(navigator.vendor) &&
      !/Edg/.test(ua)
    const isSafari =
      /Safari/.test(ua) &&
      /Apple Computer/.test(navigator.vendor) &&
      !/Chrome/.test(ua)
    const isEdge = /Edg/.test(ua)
    const isFirefox = /Firefox/.test(ua)
    const isMobile =
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
    const isIOS = /iPad|iPhone|iPod/.test(ua)
    const isAndroid = /Android/.test(ua)

    return {
      isChrome,
      isSafari,
      isEdge,
      isFirefox,
      isMobile,
      isIOS,
      isAndroid,
      name: isChrome
        ? 'Chrome'
        : isSafari
        ? 'Safari'
        : isEdge
        ? 'Edge'
        : isFirefox
        ? 'Firefox'
        : 'Unknown',
      supportsNativeInstall: isChrome || isEdge || (isSafari && isIOS),
    }
  }, [])

  // Check if app is installed
  const checkIfInstalled = useCallback(() => {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://') ||
      window.matchMedia('(display-mode: minimal-ui)').matches
    )
  }, [])

  const isPWAReady = useMemo(() => {
    const hasManifest = document.querySelector('link[rel="manifest"]')
    const hasServiceWorker = 'serviceWorker' in navigator
    const isSecure =
      location.protocol === 'https:' || location.hostname === 'localhost'
    return Boolean(hasManifest && hasServiceWorker && isSecure)
  }, [])

  const showInstallSuccess = useCallback(() => {
    setShowSuccessMessage(true)
    localStorage.setItem(STORAGE_KEYS.SUCCESS_SHOWN, 'true')

    const timer = setTimeout(() => {
      setShowSuccessMessage(false)
    }, 4000)

    return () => clearTimeout(timer)
  }, [])

  const handleInstallSuccess = useCallback(() => {
    console.log('✅ App installed successfully')
    setIsInstalled(true)
    setShowInstallPrompt(false)
    setDeferredPrompt(null)
    setIsInstalling(false)
    setPromptState(PROMPT_STATES.INITIAL)
    showInstallSuccess()
  }, [showInstallSuccess])

  // Main installation effect
  useEffect(() => {
    if (checkIfInstalled()) {
      setIsInstalled(true)
      const hasShownSuccess = localStorage.getItem(STORAGE_KEYS.SUCCESS_SHOWN)
      if (!hasShownSuccess) {
        showInstallSuccess()
      }
      return
    }

    if (localStorage.getItem(STORAGE_KEYS.NEVER_SHOW) === 'true') {
      return
    }

    const dismissedTime = localStorage.getItem(STORAGE_KEYS.DISMISSED)
    if (
      dismissedTime &&
      Date.now() - parseInt(dismissedTime) < DISMISSAL_DURATION
    ) {
      return
    }

    const handleBeforeInstallPrompt = (e) => {
      console.log('✅ beforeinstallprompt event fired')
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallPrompt(true)
    }

    const handleAppInstalled = () => {
      handleInstallSuccess()
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    const timer = setTimeout(() => {
      if (!isInstalled && !showInstallPrompt && isPWAReady) {
        console.log('🔄 Showing install prompt')
        setShowInstallPrompt(true)
      }
    }, 3000)

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      )
      window.removeEventListener('appinstalled', handleAppInstalled)
      clearTimeout(timer)
    }
  }, [
    isInstalled,
    showInstallPrompt,
    isPWAReady,
    checkIfInstalled,
    handleInstallSuccess,
    showInstallSuccess,
  ])

  // Monitor installation status
  useEffect(() => {
    const checkInstallStatus = () => {
      if (checkIfInstalled() && !isInstalled) {
        handleInstallSuccess()
      }
    }

    const interval = setInterval(checkInstallStatus, 2000)
    return () => clearInterval(interval)
  }, [isInstalled, checkIfInstalled, handleInstallSuccess])

  // MAIN INSTALL HANDLER - Automatically installs based on browser
  const handleAutoInstall = async () => {
    setIsInstalling(true)
    const { isIOS, isAndroid } = browserInfo

    try {
      // 1. Try native install (Chrome, Edge, Android)
      if (deferredPrompt) {
        console.log('🚀 Triggering native install prompt')
        await deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice

        if (outcome === 'accepted') {
          console.log('✅ User accepted installation')
          handleInstallSuccess()
        } else {
          console.log('❌ User rejected installation')
          localStorage.setItem(STORAGE_KEYS.DISMISSED, Date.now().toString())
          setShowInstallPrompt(false)
          setIsInstalling(false)
        }
        setDeferredPrompt(null)
        return
      }

      // 2. For iOS Safari
      if (isIOS) {
        setPromptState(PROMPT_STATES.IOS_INSTRUCTIONS)
        setIsInstalling(false)
        return
      }

      // 3. For Android non-native
      if (isAndroid) {
        setPromptState(PROMPT_STATES.ANDROID_INSTRUCTIONS)
        setIsInstalling(false)
        return
      }

      // 4. Fallback
      setPromptState(PROMPT_STATES.GENERAL_INSTRUCTIONS)
      setIsInstalling(false)
    } catch (error) {
      console.error('Installation error:', error)
      setIsInstalling(false)
    }
  }

  // Handle dismissal
  const handleDismiss = (permanent = false) => {
    setShowInstallPrompt(false)

    if (permanent) {
      localStorage.setItem(STORAGE_KEYS.NEVER_SHOW, 'true')
    } else {
      localStorage.setItem(STORAGE_KEYS.DISMISSED, Date.now().toString())
    }

    setTimeout(() => {
      setDeferredPrompt(null)
      setPromptState(PROMPT_STATES.INITIAL)
    }, 1000)
  }

  // Success message
  if (isInstalled && showSuccessMessage) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 50 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className='fixed bottom-4 right-4 bg-green-50 border border-green-200 rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-[100] max-w-sm'
        >
          <div className='flex items-center space-x-3'>
            <div className='w-10 h-10 bg-green-100 rounded-full flex items-center justify-center'>
              <CheckCircle className='w-6 h-6 text-green-600' />
            </div>
            <div>
              <h3 className='text-sm font-bold text-green-800'>
                App Installed Successfully! 🎉
              </h3>
              <p className='text-xs text-green-600 mt-0.5 font-medium'>
                Launch RadiantAI from your home screen
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }

  // Don't show if installed
  if (isInstalled || !showInstallPrompt) {
    return null
  }

  return (
    <AnimatePresence mode='wait'>
      <motion.div
        key={promptState}
        initial={{ opacity: 0, y: 100, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className='fixed bottom-6 left-4 right-4 max-w-sm mx-auto lg:left-auto lg:right-6 lg:max-w-none lg:w-96 lg:mx-0 bg-white border border-gray-100/50 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-5 z-[100] overflow-hidden'
        style={{
          ['--brand-primary']: brandColor,
          ['--brand-primary-dark']: brandColorDark,
        }}
      >
        {/* Background Blur Elements */}
        <div className='absolute top-0 right-0 w-32 h-32 bg-[color:var(--brand-primary)/0.08] rounded-full -translate-y-16 translate-x-16 blur-2xl'></div>
        <div className='absolute bottom-0 left-0 w-24 h-24 bg-[color:var(--brand-primary)/0.06] rounded-full translate-y-12 -translate-x-12 blur-2xl'></div>

        <div className='relative'>
          {/* Header */}
          <div className='flex items-start justify-between mb-4'>
            <div className='w-12 h-12 bg-gradient-to-br from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] rounded-2xl flex items-center justify-center shadow-lg shadow-[color:var(--brand-primary)/0.25]'>
              <Zap className='w-6 h-6 text-white' />
            </div>
            <button
              onClick={() => handleDismiss(false)}
              className='p-2 hover:bg-gray-50 rounded-xl transition-colors text-gray-400 hover:text-gray-900'
            >
              <X className='w-5 h-5' />
            </button>
          </div>

          {/* Content based on state */}
          {promptState === PROMPT_STATES.INITIAL && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className='space-y-4'
            >
              <div>
                <h3 className='text-lg font-bold text-gray-900'>
                  Install RadiantAI
                </h3>
                <p className='text-sm text-gray-500 leading-relaxed mt-1'>
                  Add the app to your home screen for the full experience, offline access, and faster loading.
                </p>
              </div>

              <div className='flex flex-col gap-2'>
                <button
                  onClick={handleAutoInstall}
                  disabled={isInstalling}
                  className='w-full py-3 bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] text-white font-bold rounded-2xl shadow-lg shadow-[color:var(--brand-primary)/0.25] hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group'
                >
                  {isInstalling ? (
                    <div className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin'></div>
                  ) : (
                    <>
                      <Download className='w-5 h-5 group-hover:animate-bounce' />
                      {deferredPrompt ? 'Install Now' : 'Get Started'}
                    </>
                  )}
                </button>
                <div className='flex gap-2 text-center'>
                  <button
                    onClick={() => handleDismiss(false)}
                    className='flex-1 py-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors bg-gray-50 rounded-xl'
                  >
                    Maybe Later
                  </button>
                  <button
                    onClick={() => handleDismiss(true)}
                    className='px-3 py-2 text-sm font-semibold text-gray-400 hover:text-red-500 transition-colors'
                  >
                    Don't show again
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {promptState === PROMPT_STATES.IOS_INSTRUCTIONS && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className='space-y-4'
            >
              <div>
                <h3 className='text-lg font-bold text-gray-900'>Install on iOS</h3>
                <p className='text-sm text-gray-500 mt-1'>
                  Follow these simple steps:
                </p>
              </div>

              <div className='space-y-3'>
                <div className='flex items-center gap-4 p-3 bg-gray-50 rounded-2xl'>
                  <div className='w-8 h-8 flex-shrink-0 bg-white shadow-sm rounded-lg flex items-center justify-center text-blue-500'>
                    <Share className='w-5 h-5' />
                  </div>
                  <p className='text-sm font-semibold text-gray-700'>
                    1. Tap the <span className='text-blue-500 font-bold'>Share</span> button
                  </p>
                </div>
                <div className='flex items-center gap-4 p-3 bg-gray-50 rounded-2xl'>
                  <div className='w-8 h-8 flex-shrink-0 bg-white shadow-sm rounded-lg flex items-center justify-center text-gray-700'>
                    <PlusSquare className='w-5 h-5' />
                  </div>
                  <p className='text-sm font-semibold text-gray-700'>
                    2. Scroll down & tap <span className='font-bold'>'Add to Home Screen'</span>
                  </p>
                </div>
                <div className='flex items-center gap-4 p-3 bg-gray-50 rounded-2xl'>
                  <div className='w-8 h-8 flex-shrink-0 bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] shadow-sm rounded-lg flex items-center justify-center text-white'>
                    <ChevronRight className='w-5 h-5' />
                  </div>
                  <p className='text-sm font-semibold text-gray-700'>
                    3. Tap <span className='text-[color:var(--brand-primary)] font-bold'>'Add'</span> in the top right
                  </p>
                </div>
              </div>

              <div className='flex flex-col gap-2 pt-2'>
                <div className='flex items-center justify-center gap-2 text-xs text-gray-400'>
                  <Info className='w-3 h-3' />
                  <span>Only works in Safari browser</span>
                </div>
                <button
                  onClick={() => handleDismiss(false)}
                  className='w-full py-3 bg-gray-900 text-white font-bold rounded-2xl hover:bg-gray-800 transition-colors'
                >
                  Got It
                </button>
              </div>

              {/* Indicator pointing to share button on mobile */}
              <motion.div 
                animate={{ y: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className='fixed bottom-[80px] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-[101] lg:hidden'
              >
                <div className='bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg'>
                  Tap here!
                </div>
                <ArrowUp className='w-6 h-6 text-blue-500 rotate-180 drop-shadow-lg' />
              </motion.div>
            </motion.div>
          )}

          {promptState === PROMPT_STATES.ANDROID_INSTRUCTIONS && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className='space-y-4'
            >
              <div>
                <h3 className='text-lg font-bold text-gray-900'>Install on Android</h3>
                <p className='text-sm text-gray-500 mt-1'>
                  Follow these steps:
                </p>
              </div>

              <div className='space-y-3'>
                <div className='flex items-center gap-4 p-3 bg-gray-50 rounded-2xl'>
                  <div className='w-8 h-8 flex-shrink-0 bg-white shadow-sm rounded-lg flex items-center justify-center text-gray-700'>
                    <MoreVertical className='w-5 h-5' />
                  </div>
                  <p className='text-sm font-semibold text-gray-700'>
                    1. Tap the <span className='font-bold'>Menu (⋮)</span> button
                  </p>
                </div>
                <div className='flex items-center gap-4 p-3 bg-gray-50 rounded-2xl'>
                  <div className='w-8 h-8 flex-shrink-0 bg-white shadow-sm rounded-lg flex items-center justify-center text-gray-700'>
                    <Download className='w-5 h-5' />
                  </div>
                  <p className='text-sm font-semibold text-gray-700'>
                    2. Tap <span className='font-bold'>'Install App'</span> or <span className='font-bold'>'Add to Home screen'</span>
                  </p>
                </div>
              </div>

              <div className='flex flex-col gap-2 pt-2'>
                <div className='flex items-center justify-center gap-2 text-xs text-gray-400'>
                  <Info className='w-3 h-3' />
                  <span>Works best in Chrome browser</span>
                </div>
                <button
                  onClick={() => handleDismiss(false)}
                  className='w-full py-3 bg-gray-900 text-white font-bold rounded-2xl hover:bg-gray-800 transition-colors'
                >
                  Got It
                </button>
              </div>
            </motion.div>
          )}

          {promptState === PROMPT_STATES.GENERAL_INSTRUCTIONS && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className='space-y-4'
            >
              <div>
                <h3 className='text-lg font-bold text-gray-900'>How to Install</h3>
                <p className='text-sm text-gray-500 mt-1'>
                  To get the best experience:
                </p>
              </div>

              <div className='space-y-3'>
                <div className='flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100'>
                  <Smartphone className='w-10 h-10 text-[color:var(--brand-primary)]' />
                  <div>
                    <h4 className='text-sm font-bold text-gray-900'>Mobile</h4>
                    <p className='text-xs text-gray-500'>Use 'Add to Home Screen' in your browser menu.</p>
                  </div>
                </div>
                <div className='flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100'>
                  <div className='w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center'>
                    <Zap className='w-6 h-6 text-[color:var(--brand-primary)]' />
                  </div>
                  <div>
                    <h4 className='text-sm font-bold text-gray-900'>Desktop</h4>
                    <p className='text-xs text-gray-500'>Look for the install icon in your address bar.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDismiss(false)}
                className='w-full py-3 bg-gray-900 text-white font-bold rounded-2xl hover:bg-gray-800 transition-colors'
              >
                Understood
              </button>
            </motion.div>
          )}

          {/* Browser Info Footer */}
          <div className='mt-5 pt-4 border-t border-gray-50 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400'>
            <span>Using {browserInfo.name}</span>
            {isPWAReady && (
              <div className='flex items-center gap-1.5'>
                <div className='w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse'></div>
                <span className='text-green-600'>System Ready</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default InstallPrompt
