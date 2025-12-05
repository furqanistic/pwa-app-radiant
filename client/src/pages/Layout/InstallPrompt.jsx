// File: client/src/pages/Layout/InstallPrompt.jsx
// ENHANCED: Automatic app installation across all browsers
import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckCircle,
  Download,
  MoreVertical,
  Share,
  Smartphone,
  X,
  Zap,
} from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

const STORAGE_KEYS = {
  DISMISSED: 'radiant-install-dismissed',
  SUCCESS_SHOWN: 'radiant-install-success-shown',
  NEVER_SHOW: 'radiant-install-never-show',
}

const DISMISSAL_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)

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
    const { isIOS, isAndroid, isMobile } = browserInfo

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

      // 2. For iOS Safari - provide helpful instructions
      if (isIOS) {
        console.log('📱 Showing iOS installation instructions')
        const userConfirmed = await showIOSInstallation()
        if (userConfirmed) {
          showInstallSuccess()
        }
        setIsInstalling(false)
        return
      }

      // 3. For Android Firefox or other browsers
      if (isAndroid && !deferredPrompt) {
        console.log('🔧 Showing Android installation help')
        showAndroidInstallation()
        showInstallSuccess()
        setIsInstalling(false)
        return
      }

      // 4. Fallback
      console.log('💡 Showing general installation instructions')
      showGeneralInstructions()
      setIsInstalling(false)
    } catch (error) {
      console.error('Installation error:', error)
      setIsInstalling(false)
    }
  }

  // iOS Installation - Show user-friendly modal
  const showIOSInstallation = () => {
    return new Promise((resolve) => {
      const isSafari = browserInfo.isSafari

      const message = isSafari
        ? `📲 To install RadiantAI:\n\n1. Tap the Share button (⬆️) at the bottom\n2. Scroll and tap "Add to Home Screen"\n3. Tap "Add" to confirm\n\nThe app will appear on your home screen!`
        : `📲 To install RadiantAI:\n\n1. Open this page in Safari\n2. Tap the Share button (⬆️)\n3. Tap "Add to Home Screen"\n4. Tap "Add" to confirm`

      const shouldInstall = window.confirm(message)
      resolve(shouldInstall)

      if (shouldInstall) {
        localStorage.setItem(STORAGE_KEYS.SUCCESS_SHOWN, 'true')
      } else {
        localStorage.setItem(STORAGE_KEYS.DISMISSED, Date.now().toString())
      }
      setShowInstallPrompt(false)
    })
  }

  // Android Installation
  const showAndroidInstallation = () => {
    const message = browserInfo.isFirefox
      ? `🔧 For best experience, use Chrome:\n\n1. Open this site in Chrome\n2. Tap Menu (⋮) → "Add to Home Screen"\n3. Tap "Add" to confirm\n\nOr bookmark this page for quick access.`
      : `📲 To install RadiantAI:\n\n1. Tap Menu (⋮) at the top right\n2. Tap "Add to Home Screen" or "Install App"\n3. Tap "Add" to confirm\n\nThe app will appear on your home screen!`

    window.alert(message)
    localStorage.setItem(STORAGE_KEYS.SUCCESS_SHOWN, 'true')
    setShowInstallPrompt(false)
  }

  // General instructions
  const showGeneralInstructions = () => {
    const message =
      `🔧 To install RadiantAI:\n\n` +
      `For best experience, use:\n` +
      `• Chrome or Edge (Desktop)\n` +
      `• Safari (iOS)\n` +
      `• Chrome (Android)\n\n` +
      `Or bookmark this page for quick access.`

    window.alert(message)
    setShowInstallPrompt(false)
  }

  // Handle dismissal
  const handleDismiss = (permanent = false) => {
    setShowInstallPrompt(false)

    if (permanent) {
      localStorage.setItem(STORAGE_KEYS.NEVER_SHOW, 'true')
    } else {
      localStorage.setItem(STORAGE_KEYS.DISMISSED, Date.now().toString())
    }

    setTimeout(() => setDeferredPrompt(null), 1000)
  }

  // Get button text based on browser
  const getButtonText = () => {
    if (isInstalling) return 'Installing...'
    if (deferredPrompt) return 'Install Now'
    if (browserInfo.isIOS) return 'Install Now'
    if (browserInfo.isAndroid) return 'Install Now'
    return 'Install Now'
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
          className='fixed bottom-4 right-4 bg-green-50 border border-green-200 rounded-xl p-4 shadow-lg z-50 max-w-sm'
        >
          <div className='flex items-center space-x-3'>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 400 }}
            >
              <CheckCircle className='w-6 h-6 text-green-600' />
            </motion.div>
            <div>
              <h3 className='text-sm font-semibold text-green-800'>
                App Installed Successfully! 🎉
              </h3>
              <p className='text-xs text-green-600 mt-0.5'>
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
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className='fixed bottom-4 left-4 right-4 max-w-sm mx-auto lg:left-auto lg:right-4 lg:max-w-none lg:w-96 lg:mx-0 bg-white border border-gray-200/80 rounded-xl shadow-xl p-4 z-50 backdrop-blur-sm'
      >
        {/* Background decorations */}
        <div className='absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-pink-500/8 to-purple-600/8 rounded-full -translate-y-8 translate-x-8 blur-xl'></div>
        <div className='absolute bottom-0 left-0 w-12 h-12 bg-gradient-to-tr from-purple-500/8 to-pink-600/8 rounded-full translate-y-6 -translate-x-6 blur-xl'></div>

        <div className='relative'>
          <div className='flex items-start gap-3'>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 400 }}
              className='w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm'
            >
              {isInstalling ? (
                <div className='w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
              ) : (
                <Zap className='w-5 h-5 text-white' />
              )}
            </motion.div>

            <div className='flex-1 min-w-0'>
              <motion.h3
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className='font-semibold text-gray-900 text-sm mb-1'
              >
                Get the Full Experience
              </motion.h3>

              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className='text-xs text-gray-600 leading-relaxed mb-3'
              >
                Install RadiantAI for offline access, faster performance, and
                app-like experience
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className='flex items-center gap-2'
              >
                <button
                  onClick={handleAutoInstall}
                  disabled={isInstalling}
                  className='px-3 py-1.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-medium rounded-md hover:from-pink-600 hover:to-purple-700 disabled:from-pink-400 disabled:to-purple-500 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-1.5'
                >
                  {isInstalling ? (
                    <>
                      <div className='w-3 h-3 border border-white border-t-transparent rounded-full animate-spin'></div>
                      Installing...
                    </>
                  ) : (
                    <>
                      <Download className='w-3.5 h-3.5' />
                      {getButtonText()}
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleDismiss(false)}
                  disabled={isInstalling}
                  className='px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-md hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed transition-all duration-200'
                >
                  Later
                </button>

                <button
                  onClick={() => handleDismiss(true)}
                  disabled={isInstalling}
                  className='px-2 py-1.5 text-gray-400 hover:text-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors'
                >
                  Never
                </button>
              </motion.div>
            </div>

            <motion.button
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              onClick={() => handleDismiss(false)}
              disabled={isInstalling}
              className='p-1 hover:bg-gray-100 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded-md transition-colors flex-shrink-0 group'
            >
              <X className='w-4 h-4 text-gray-400 group-hover:text-gray-600' />
            </motion.button>
          </div>

          {/* Browser info and PWA status */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className='mt-3 pt-3 border-t border-gray-100'
          >
            <div className='flex items-center justify-between text-xs text-gray-500'>
              <span>Browser: {browserInfo.name}</span>
              {isPWAReady && (
                <div className='flex items-center gap-1'>
                  <div className='w-1.5 h-1.5 bg-green-500 rounded-full'></div>
                  <span className='text-green-600 font-medium'>Ready</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default InstallPrompt
