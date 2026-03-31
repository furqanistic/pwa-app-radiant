// File: client/src/pages/Layout/InstallButton.jsx
import { Download } from 'lucide-react'
import React from 'react'
import { useBranding } from '@/context/BrandingContext'
import { usePwaInstall } from '@/hooks/usePwaInstall'

const InstallButton = ({ className = '' }) => {
  const { isInstalled, triggerInstall } = usePwaInstall()
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

  const handleInstall = async () => {
    try {
      const result = await triggerInstall()
      if (result.status === 'unavailable') {
        window.dispatchEvent(
          new CustomEvent('radiant:open-install-prompt', {
            detail: { source: 'topbar-install-button' },
          })
        )
      }
    } catch (error) {
      console.error('Install action failed:', error)
    }
  }

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
