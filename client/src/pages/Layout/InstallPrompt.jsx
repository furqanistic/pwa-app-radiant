// client/src/pages/Layout/InstallPrompt.jsx
import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckCircle,
  Chrome,
  Download,
  MoreVertical,
  Plus,
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

const DISMISSAL_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days instead of 1 day

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [showManualInstructions, setShowManualInstructions] = useState(false)

  // Improved browser detection with memoization
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
      supportsInstall: isChrome || isEdge || (isSafari && isIOS),
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

  // Check PWA installability criteria
  const isPWAReady = useMemo(() => {
    const hasManifest = document.querySelector('link[rel="manifest"]')
    const hasServiceWorker = 'serviceWorker' in navigator
    const isSecure =
      location.protocol === 'https:' || location.hostname === 'localhost'
    return Boolean(hasManifest && hasServiceWorker && isSecure)
  }, [])

  // Show success message
  const showInstallSuccess = useCallback(() => {
    setShowSuccessMessage(true)
    localStorage.setItem(STORAGE_KEYS.SUCCESS_SHOWN, 'true')

    const timer = setTimeout(() => {
      setShowSuccessMessage(false)
    }, 4000)

    return () => clearTimeout(timer)
  }, [])

  // Handle successful installation
  const handleInstallSuccess = useCallback(() => {
    console.log('✅ App installed successfully')
    setIsInstalled(true)
    setShowInstallPrompt(false)
    setDeferredPrompt(null)
    showInstallSuccess()
  }, [showInstallSuccess])

  // Main effect for installation logic
  useEffect(() => {
    // Check if already installed
    if (checkIfInstalled()) {
      setIsInstalled(true)

      // Show success message only once per installation
      const hasShownSuccess = localStorage.getItem(STORAGE_KEYS.SUCCESS_SHOWN)
      if (!hasShownSuccess) {
        showInstallSuccess()
      }
      return
    }

    // Check if user never wants to see this
    if (localStorage.getItem(STORAGE_KEYS.NEVER_SHOW) === 'true') {
      return
    }

    // Check if recently dismissed
    const dismissedTime = localStorage.getItem(STORAGE_KEYS.DISMISSED)
    if (
      dismissedTime &&
      Date.now() - parseInt(dismissedTime) < DISMISSAL_DURATION
    ) {
      return
    }

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      console.log('✅ PWA is installable - beforeinstallprompt fired')
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallPrompt(true)
    }

    // Listen for successful installation
    const handleAppInstalled = () => {
      handleInstallSuccess()
    }

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Show prompt after delay if criteria are met
    const timer = setTimeout(() => {
      if (!isInstalled && !showInstallPrompt) {
        if (
          isPWAReady &&
          (browserInfo.supportsInstall || browserInfo.isFirefox)
        ) {
          console.log(
            '🔄 Showing install prompt (PWA ready and supported browser)'
          )
          setShowInstallPrompt(true)
        }
      }
    }, 3000) // Increased to 3 seconds for better UX

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
    browserInfo,
    checkIfInstalled,
    handleInstallSuccess,
    showInstallSuccess,
  ])

  // Monitor installation status changes
  useEffect(() => {
    const checkInstallStatus = () => {
      if (checkIfInstalled() && !isInstalled) {
        handleInstallSuccess()
      }
    }

    const interval = setInterval(checkInstallStatus, 2000) // Check every 2 seconds
    return () => clearInterval(interval)
  }, [isInstalled, checkIfInstalled, handleInstallSuccess])

  // Handle native install
  const handleNativeInstall = async () => {
    if (!deferredPrompt) return false

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      console.log('Install prompt result:', outcome)
      setDeferredPrompt(null)

      if (outcome === 'accepted') {
        handleInstallSuccess()
        return true
      } else {
        // User dismissed - remember for longer period
        localStorage.setItem(STORAGE_KEYS.DISMISSED, Date.now().toString())
        setShowInstallPrompt(false)
        return false
      }
    } catch (error) {
      console.error('Error during installation:', error)
      return false
    }
  }

  // Handle install button click
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await handleNativeInstall()
    } else {
      setShowManualInstructions(true)
    }
  }

  // Handle dismissal
  const handleDismiss = (permanent = false) => {
    setShowInstallPrompt(false)
    setShowManualInstructions(false)

    if (permanent) {
      localStorage.setItem(STORAGE_KEYS.NEVER_SHOW, 'true')
    } else {
      localStorage.setItem(STORAGE_KEYS.DISMISSED, Date.now().toString())
    }

    // Clear deferred prompt
    setTimeout(() => setDeferredPrompt(null), 1000)
  }

  // Get context-aware text and instructions
  const getInstallContent = () => {
    const { isIOS, isAndroid, isMobile, isFirefox } = browserInfo

    if (deferredPrompt) {
      return {
        title: 'Install RadiantAI',
        subtitle:
          'Get the full app experience with offline access and native performance',
      }
    }

    if (isFirefox && isAndroid) {
      return {
        title: 'Switch Browser for Best Experience',
        subtitle:
          'Use Chrome or Samsung Internet for full app installation capabilities',
      }
    }

    if (isIOS) {
      return {
        title: 'Add to Home Screen',
        subtitle: 'Install RadiantAI for quick access and app-like experience',
      }
    }

    if (isAndroid) {
      return {
        title: 'Install App',
        subtitle: 'Add RadiantAI to your home screen for better performance',
      }
    }

    return {
      title: 'Install RadiantAI',
      subtitle: 'Add to your device for quick access and enhanced features',
    }
  }

  // Manual installation instructions component
  const ManualInstructions = () => {
    const { isChrome, isSafari, isIOS, isAndroid, isMobile, isFirefox } =
      browserInfo

    const getInstructions = () => {
      if (isFirefox && isAndroid) {
        return {
          title: 'For Better Experience',
          steps: [
            'Open this site in Chrome or Samsung Internet',
            'Look for "Add to Home Screen" in the menu',
            'Or bookmark this page for quick access',
          ],
        }
      }

      if (isIOS && isSafari) {
        return {
          title: 'Install on iOS',
          steps: [
            <>
              Tap the <Share className='inline w-3 h-3 mx-1' /> Share button
            </>,
            'Scroll down and tap "Add to Home Screen"',
            'Tap "Add" to confirm installation',
          ],
        }
      }

      if (isAndroid && (isChrome || browserInfo.isEdge)) {
        return {
          title: 'Install on Android',
          steps: [
            <>
              Tap the <MoreVertical className='inline w-3 h-3 mx-1' /> menu in
              the top right
            </>,
            'Select "Add to Home Screen" or "Install App"',
            'Tap "Add" to confirm',
          ],
        }
      }

      if (!isMobile && (isChrome || browserInfo.isEdge)) {
        return {
          title: 'Install on Desktop',
          steps: [
            <>
              Look for the <Plus className='inline w-3 h-3 mx-1' /> install icon
              in your address bar
            </>,
            'Click it and select "Install"',
            'Or go to Menu → More Tools → Create Shortcut',
          ],
        }
      }

      return {
        title: 'Add to Device',
        steps: [
          'Look for "Add to Home Screen" in your browser menu',
          'Or bookmark this page for quick access',
          'Check if your browser supports PWA installation',
        ],
      }
    }

    const instructions = getInstructions()

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className='mt-3 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200'
      >
        <h4 className='font-medium text-blue-900 text-sm mb-2'>
          {instructions.title}
        </h4>
        <ol className='space-y-1.5'>
          {instructions.steps.map((step, index) => (
            <li
              key={index}
              className='flex items-start space-x-2 text-xs text-blue-800'
            >
              <span className='flex-shrink-0 w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5'>
                {index + 1}
              </span>
              <span className='flex-1 leading-relaxed'>{step}</span>
            </li>
          ))}
        </ol>
        <div className='mt-3 pt-2 border-t border-blue-200'>
          <button
            onClick={() => setShowManualInstructions(false)}
            className='text-xs text-blue-600 hover:text-blue-800 font-medium'
          >
            Got it, thanks!
          </button>
        </div>
      </motion.div>
    )
  }

  // Success message component
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
                App Installed Successfully!
              </h3>
              <p className='text-xs text-green-600 mt-0.5'>
                You can now access RadiantAI from your home screen
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }

  // Don't show if installed or shouldn't show
  if (isInstalled || !showInstallPrompt) {
    return null
  }

  const { title, subtitle } = getInstallContent()

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
              {deferredPrompt ? (
                <Zap className='w-5 h-5 text-white' />
              ) : (
                <Smartphone className='w-5 h-5 text-white' />
              )}
            </motion.div>

            <div className='flex-1 min-w-0'>
              <motion.h3
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className='font-semibold text-gray-900 text-sm mb-1'
              >
                {title}
              </motion.h3>

              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className='text-xs text-gray-600 leading-relaxed mb-3'
              >
                {subtitle}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className='flex items-center gap-2'
              >
                <button
                  onClick={handleInstallClick}
                  className='px-3 py-1.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-medium rounded-md hover:from-pink-600 hover:to-purple-700 transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-1.5'
                >
                  {deferredPrompt ? (
                    <Zap className='w-3.5 h-3.5' />
                  ) : (
                    <Download className='w-3.5 h-3.5' />
                  )}
                  <span>
                    {deferredPrompt ? 'Install Now' : 'How to Install'}
                  </span>
                </button>

                <button
                  onClick={() => handleDismiss(false)}
                  className='px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-md hover:bg-gray-200 transition-all duration-200'
                >
                  Later
                </button>

                <button
                  onClick={() => handleDismiss(true)}
                  className='px-2 py-1.5 text-gray-400 text-xs hover:text-gray-600 transition-colors'
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
              className='p-1 hover:bg-gray-100 rounded-md transition-colors flex-shrink-0 group'
            >
              <X className='w-4 h-4 text-gray-400 group-hover:text-gray-600' />
            </motion.button>
          </div>

          {/* Manual instructions */}
          <AnimatePresence>
            {showManualInstructions && <ManualInstructions />}
          </AnimatePresence>

          {/* Browser info */}
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
                  <span className='text-green-600 font-medium'>PWA Ready</span>
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
