import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  detectBrowserInstallEnvironment,
  getPwaInstallState,
  initPwaInstallManager,
  subscribePwaInstall,
  triggerNativeInstallPrompt,
} from '@/lib/pwaInstall'

export const usePwaInstall = () => {
  const [state, setState] = useState(() => getPwaInstallState())
  const browserInfo = useMemo(() => detectBrowserInstallEnvironment(), [])

  useEffect(() => {
    initPwaInstallManager()
    return subscribePwaInstall(setState)
  }, [])

  const triggerInstall = useCallback(async () => {
    return triggerNativeInstallPrompt()
  }, [])

  return {
    ...state,
    browserInfo,
    triggerInstall,
  }
}

export default usePwaInstall
