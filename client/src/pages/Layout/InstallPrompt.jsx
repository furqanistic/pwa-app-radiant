import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, Chrome, Download, Smartphone, X, Zap } from 'lucide-react'
import React, { useEffect, useState } from 'react'

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [canInstall, setCanInstall] = useState(false)
  const [browserInfo, setBrowserInfo] = useState({})

  const [showSuccessMessage, setShowSuccessMessage] = useState(false)

  useEffect(() => {
    // Detect browser and device
    const detectBrowser = () => {
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
      }
    }

    const browser = detectBrowser()
    setBrowserInfo(browser)

    // Check if app is already installed
    const checkInstalled = () => {
      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://')
      )
    }

    if (checkInstalled()) {
      setIsInstalled(true)

      // Only show success message if we haven't shown it before for this installation
      const hasShownSuccess = localStorage.getItem(
        'radiant-install-success-shown'
      )
      if (!hasShownSuccess) {
        setShowSuccessMessage(true)
        localStorage.setItem('radiant-install-success-shown', 'true')

        // Hide success message after 3 seconds on initial load
        setTimeout(() => {
          setShowSuccessMessage(false)
        }, 3000)
      }

      return
    }

    // Check if PWA is installable
    const checkInstallability = () => {
      // Basic PWA criteria check
      const hasManifest = document.querySelector('link[rel="manifest"]')
      const hasServiceWorker = 'serviceWorker' in navigator
      const isSecure =
        location.protocol === 'https:' || location.hostname === 'localhost'

      return hasManifest && hasServiceWorker && isSecure
    }

    setCanInstall(checkInstallability())

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      console.log('✅ PWA is installable - beforeinstallprompt fired')
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallPrompt(true)
      setCanInstall(true)
    }

    // Listen for successful installation
    const handleAppInstalled = () => {
      console.log('✅ App was installed successfully')
      setIsInstalled(true)
      setShowInstallPrompt(false)
      setDeferredPrompt(null)
      setShowSuccessMessage(true)
      localStorage.setItem('radiant-install-success-shown', 'true')

      // Hide success message after 4 seconds
      setTimeout(() => {
        setShowSuccessMessage(false)
      }, 4000)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Intelligent prompt showing logic
    const showPromptTimer = setTimeout(() => {
      if (!isInstalled && !showInstallPrompt) {
        // Show if we can install OR if it's a supported browser OR if it's Firefox (to suggest better browser)
        if (
          canInstall ||
          browser.isChrome ||
          browser.isEdge ||
          browser.isSafari ||
          (browser.isFirefox && browser.isAndroid)
        ) {
          console.log(
            '🔄 Showing install prompt (PWA criteria met or supported browser)'
          )
          setShowInstallPrompt(true)
        }
      }
    }, 2000) // Show after 2 seconds

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      )
      window.removeEventListener('appinstalled', handleAppInstalled)
      clearTimeout(showPromptTimer)
    }
  }, [isInstalled, showInstallPrompt, canInstall])

  // Separate effect to detect when app becomes installed during session
  useEffect(() => {
    const checkIfInstalled = () => {
      const installed =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://')

      if (installed && !isInstalled) {
        setIsInstalled(true)
        setShowInstallPrompt(false)
        setShowSuccessMessage(true)
        localStorage.setItem('radiant-install-success-shown', 'true')

        setTimeout(() => {
          setShowSuccessMessage(false)
        }, 4000)
      }
    }

    // Check periodically for installation
    const interval = setInterval(checkIfInstalled, 1000)

    return () => clearInterval(interval)
  }, [isInstalled])

  const handleInstallClick = async () => {
    // If we have the native prompt, use it
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice

        console.log('Install prompt result:', outcome)
        setDeferredPrompt(null)
        setShowInstallPrompt(false)

        if (outcome === 'accepted') {
          // Show success message
          setIsInstalled(true)
          setShowSuccessMessage(true)
          localStorage.setItem('radiant-install-success-shown', 'true')

          setTimeout(() => {
            setShowSuccessMessage(false)
          }, 4000)
        } else if (outcome === 'dismissed') {
          // Don't show again for a while
          localStorage.setItem(
            'radiant-install-dismissed',
            Date.now().toString()
          )
        }
      } catch (error) {
        console.error('Error during installation:', error)
      }
    } else {
      // Manual installation based on browser
      handleManualInstall()
    }
  }

  const handleManualInstall = () => {
    const {
      isChrome,
      isSafari,
      isEdge,
      isAndroid,
      isIOS,
      isMobile,
      isFirefox,
    } = browserInfo

    if (isFirefox && isAndroid) {
      // Firefox Android - limited PWA support
      alert(
        'Firefox has limited app installation support.\n\nFor the best experience:\n\n1. Open this site in Chrome or Samsung Internet\n2. Then tap Menu (⋮) → "Add to Home Screen"\n\nOr bookmark this page in Firefox for quick access.'
      )
    } else if (isIOS && isSafari) {
      // iOS Safari - direct to share menu
      alert(
        'To install RadiantAI:\n\n1. Tap the Share button (square with arrow)\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" to confirm'
      )
    } else if (isAndroid && (isChrome || isEdge)) {
      // Android Chrome/Edge - check menu
      alert(
        'To install RadiantAI:\n\n1. Tap the menu (⋮) in the top right\n2. Select "Add to Home Screen" or "Install App"\n3. Tap "Add" to confirm'
      )
    } else if (!isMobile && (isChrome || isEdge)) {
      // Desktop Chrome/Edge - check address bar
      alert(
        'To install RadiantAI:\n\n1. Look for the install icon (⊕) in your address bar\n2. Click it and select "Install"\n\nOr go to Menu > More Tools > Create Shortcut'
      )
    } else if (isAndroid) {
      // Android other browsers
      alert(
        'To install RadiantAI:\n\nFor best results, open this site in:\n• Chrome\n• Samsung Internet\n• Edge\n\nThen look for "Add to Home Screen" in the browser menu.'
      )
    } else {
      // Generic fallback
      alert(
        'To install RadiantAI:\n\n• Bookmark this page for quick access\n• Or check your browser menu for "Add to Home Screen" option'
      )
    }
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
    // Remember dismissal to avoid being annoying
    localStorage.setItem('radiant-install-dismissed', Date.now().toString())

    // Clear the deferred prompt after dismissal
    setTimeout(() => {
      setDeferredPrompt(null)
    }, 1000)
  }

  // Show success message when installed
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

  // Don't show install prompt if already installed
  if (isInstalled) {
    return null
  }

  // Check if recently dismissed
  const dismissedTime = localStorage.getItem('radiant-install-dismissed')
  if (
    dismissedTime &&
    Date.now() - parseInt(dismissedTime) < 24 * 60 * 60 * 1000
  ) {
    return null // Don't show for 24 hours after dismissal
  }

  if (!showInstallPrompt) {
    return null
  }

  const getInstallText = () => {
    const { isIOS, isAndroid, isMobile, isFirefox } = browserInfo

    if (deferredPrompt) return 'Install RadiantAI'
    if (isFirefox && isAndroid) return 'Switch Browser for Install'
    if (isIOS) return 'Add to Home Screen'
    if (isAndroid) return 'Install App'
    if (isMobile) return 'Add to Home Screen'
    return 'Install RadiantAI'
  }

  const getInstructions = () => {
    const { isChrome, isSafari, isIOS, isAndroid, isMobile, isFirefox } =
      browserInfo

    if (deferredPrompt) return 'Get the full app experience with offline access'
    if (isFirefox && isAndroid)
      return 'Use Chrome or Samsung Internet for full app installation'
    if (isIOS && isSafari)
      return 'Tap Share → Add to Home Screen for full app experience'
    if (isAndroid && isChrome)
      return 'Tap menu (⋮) → Add to Home Screen for full app experience'
    if (!isMobile && isChrome)
      return 'Look for install icon in address bar for full app experience'
    return 'Add to your device for quick access and offline features'
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className='fixed bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:w-80 bg-white border border-pink-200/60 rounded-2xl shadow-2xl p-4 z-50 backdrop-blur-sm'
      >
        <div className='flex items-start space-x-3'>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 400 }}
            className='w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg'
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
              className='font-bold text-gray-900 text-sm'
            >
              <span>{getInstallText()}</span>
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className='text-xs text-gray-600 mt-1 leading-relaxed'
            >
              {getInstructions()}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className='flex space-x-2 mt-3'
            >
              <button
                onClick={handleInstallClick}
                className='min-w-20 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-semibold rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center space-x-1.5'
              >
                {deferredPrompt ? (
                  <Zap className='w-3.5 h-3.5' />
                ) : (
                  <Download className='w-3.5 h-3.5' />
                )}
                <span>
                  {browserInfo.isFirefox && browserInfo.isAndroid
                    ? 'Learn How'
                    : 'Install'}
                </span>
              </button>
              <button
                onClick={handleDismiss}
                className='min-w-20 px-4 py-2 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 transition-all duration-200 flex items-center justify-center'
              >
                Later
              </button>
            </motion.div>
          </div>

          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            onClick={handleDismiss}
            className='p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 group'
          >
            <X className='w-4 h-4 text-gray-400 group-hover:text-gray-600' />
          </motion.button>
        </div>

        {/* Browser indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className='mt-3 pt-3 border-t border-gray-100'
        >
          <div className='flex items-center justify-center text-xs text-gray-500'>
            <span>Browser: {browserInfo.name}</span>
          </div>
        </motion.div>

        {/* Decorative elements */}
        <div className='absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-pink-500/10 to-purple-600/10 rounded-full -translate-y-10 translate-x-10 blur-xl'></div>
        <div className='absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-purple-500/10 to-pink-600/10 rounded-full translate-y-8 -translate-x-8 blur-xl'></div>
      </motion.div>
    </AnimatePresence>
  )
}

export default InstallPrompt
