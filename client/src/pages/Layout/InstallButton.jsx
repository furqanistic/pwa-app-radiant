// File: client/src/pages/Layout/InstallButton.jsx
import { Download, Smartphone } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useBranding } from '@/context/BrandingContext'

const InstallButton = ({ className = '' }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)
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

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://') ||
        window.matchMedia('(display-mode: minimal-ui)').matches
      )
    }

    if (checkInstalled()) {
      setIsInstalled(true)
      return
    }

    // Check if user never wants to see install prompts
    if (localStorage.getItem('radiant-install-never-show') === 'true') {
      setIsInstalled(true) // Hide button if user said never show
      return
    }

    // Listen for install prompt (Chrome/Edge)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      )
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Native install for Chrome/Edge
      try {
        await deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice

        if (outcome === 'accepted') {
          setIsInstalled(true)
        }
        setDeferredPrompt(null)
      } catch (error) {
        console.error('Install prompt error:', error)
      }
    } else {
      // Manual install instructions for Firefox/Safari/etc
      showManualInstallInstructions()
    }
  }

  const showManualInstallInstructions = () => {
    const ua = navigator.userAgent
    const isFirefox = /Firefox/.test(ua)
    const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua)
    const isChrome = /Chrome/.test(ua) && !/Edg/.test(ua)
    const isEdge = /Edg/.test(ua)
    const isIOS = /iPad|iPhone|iPod/.test(ua)
    const isAndroid = /Android/.test(ua)
    const isMobile =
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)

    let instructions = ''

    if (isFirefox && isAndroid) {
      instructions = `Firefox has limited PWA support.\n\nFor the best experience:\n\n1. Open this site in Chrome or Samsung Internet\n2. Tap Menu (⋮) → "Add to Home Screen"\n3. Tap "Add" to confirm\n\nOr bookmark this page for quick access.`
    } else if (isFirefox && !isMobile) {
      instructions = `Firefox Desktop has limited PWA support.\n\nTo access RadiantAI easily:\n\n1. Bookmark this page (Ctrl+D)\n2. Or try opening in Chrome/Edge for full app installation\n3. Pin the bookmark to your bookmarks toolbar for quick access`
    } else if (isIOS && isSafari) {
      instructions = `To install RadiantAI on iOS:\n\n1. Tap the Share button (⬆️) at the bottom\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" to confirm\n\nYou'll find the app icon on your home screen!`
    } else if (isAndroid && (isChrome || isEdge)) {
      instructions = `To install RadiantAI:\n\n1. Tap the menu (⋮) in the top right\n2. Select "Add to Home Screen" or "Install App"\n3. Tap "Add" to confirm\n\nThe app will appear on your home screen!`
    } else if (!isMobile && (isChrome || isEdge)) {
      instructions = `To install RadiantAI:\n\n1. Look for the install icon (⊕) in your address bar\n2. Click it and select "Install"\n\nOr:\n1. Click Menu (⋮) → More Tools → Create Shortcut\n2. Check "Open as window" for app-like experience`
    } else {
      instructions = `To access RadiantAI easily:\n\n1. Bookmark this page for quick access\n2. Check your browser menu for "Add to Home Screen"\n3. For best experience, try Chrome or Edge\n\nBookmark now to never lose access!`
    }

    alert(instructions)
  }

  // Always show the button unless installed or user said never show
  if (isInstalled) {
    return null
  }

  return (
    <button
      onClick={handleInstall}
      className={`inline-flex items-center space-x-1.5 lg:space-x-2 px-2.5 lg:px-3 py-1.5 lg:py-2 text-white text-xs lg:text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md ${className}`}
      style={{
        background: `linear-gradient(90deg, ${brandColor}, ${brandColorDark})`,
      }}
    >
      <Download className='w-3.5 h-3.5 lg:w-4 lg:h-4' />
      <span className='hidden sm:inline'>Install App</span>
      <span className='sm:hidden'>Install</span>
    </button>
  )
}

export default InstallButton
