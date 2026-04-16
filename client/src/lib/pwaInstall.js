let initialized = false
let installPromptEvent = null
let installed = false

const subscribers = new Set()

const notify = () => {
  const snapshot = getPwaInstallState()
  subscribers.forEach((listener) => {
    try {
      listener(snapshot)
    } catch {
      // Ignore subscriber errors.
    }
  })
}

export const detectBrowserInstallEnvironment = () => {
  if (typeof window === 'undefined') {
    return {
      isChrome: false,
      isEdge: false,
      isFirefox: false,
      isSafari: false,
      isIOS: false,
      isAndroid: false,
      isMobile: false,
      name: 'Unknown',
    }
  }

  const ua = window.navigator.userAgent
  const vendor = window.navigator.vendor || ''
  const isEdge = /Edg\//.test(ua)
  const isFirefox = /Firefox\//.test(ua)
  const isIOS = /iPad|iPhone|iPod/.test(ua)
  const isAndroid = /Android/.test(ua)
  const isOpera = /OPR\//.test(ua)
  const isSamsung = /SamsungBrowser/.test(ua)
  const isChrome =
    !isEdge &&
    !isOpera &&
    !isFirefox &&
    /Chrome|Chromium/.test(ua) &&
    /Google Inc/.test(vendor)
  const isSafari =
    !isChrome &&
    !isEdge &&
    !isFirefox &&
    /Safari/.test(ua) &&
    /Apple Computer/.test(vendor)
  const isMobile =
    /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)

  let name = 'Unknown'
  if (isEdge) name = 'Edge'
  else if (isFirefox) name = 'Firefox'
  else if (isSafari) name = 'Safari'
  else if (isSamsung) name = 'Samsung Internet'
  else if (isOpera) name = 'Opera'
  else if (isChrome) name = 'Chrome'

  return {
    isChrome,
    isEdge,
    isFirefox,
    isSafari,
    isIOS,
    isAndroid,
    isMobile,
    name,
  }
}

export const isPwaInstalled = () => {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  )
}

export const getPwaInstallState = () => ({
  // Re-evaluate live display mode so UI doesn't rely on stale module state.
  isInstalled: installed || isPwaInstalled(),
  hasNativePrompt: Boolean(installPromptEvent),
})

export const subscribePwaInstall = (listener) => {
  subscribers.add(listener)
  return () => subscribers.delete(listener)
}

export const initPwaInstallManager = () => {
  if (typeof window === 'undefined') return
  if (initialized) return

  initialized = true
  installed = isPwaInstalled()

  const handleBeforeInstallPrompt = (event) => {
    event.preventDefault()
    installPromptEvent = event
    notify()
  }

  const handleAppInstalled = () => {
    installed = true
    installPromptEvent = null
    notify()
  }

  const handleDisplayModeChange = () => {
    const nextInstalled = isPwaInstalled()
    if (nextInstalled !== installed) {
      installed = nextInstalled
      if (installed) {
        installPromptEvent = null
      }
      notify()
    }
  }

  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.addEventListener('appinstalled', handleAppInstalled)
  window.addEventListener('focus', handleDisplayModeChange)
  document.addEventListener('visibilitychange', handleDisplayModeChange)

  const standaloneMediaQuery = window.matchMedia('(display-mode: standalone)')
  if (standaloneMediaQuery?.addEventListener) {
    standaloneMediaQuery.addEventListener('change', handleDisplayModeChange)
  } else if (standaloneMediaQuery?.addListener) {
    standaloneMediaQuery.addListener(handleDisplayModeChange)
  }

  notify()
}

export const triggerNativeInstallPrompt = async () => {
  if (!installPromptEvent) {
    return { status: 'unavailable' }
  }

  const promptEvent = installPromptEvent
  installPromptEvent = null
  notify()

  try {
    // Some browsers can stall these promises. Hand off prompt quickly and
    // track userChoice asynchronously so UI never gets stuck in loading.
    const promptResult = promptEvent.prompt?.()
    if (promptResult && typeof promptResult.then === 'function') {
      await Promise.race([
        promptResult,
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ])
    }

    const userChoicePromise = promptEvent.userChoice
    if (userChoicePromise && typeof userChoicePromise.then === 'function') {
      userChoicePromise
        .then((choice) => {
          if (choice?.outcome === 'accepted') {
            installed = true
          }
          notify()
        })
        .catch(() => {
          notify()
        })
    }

    return { status: 'prompted' }
  } catch (error) {
    return { status: 'error', error }
  }
}
