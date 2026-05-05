import React from 'react'

export const ServiceImagePlaceholder = ({
  serviceName = 'Service',
  brandColor = '#ec4899',
  className = '',
  style = {},
}) => {
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

  return (
    <div
      className={`flex items-center justify-center w-full h-full relative overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(135deg, ${brandColor}15 0%, ${brandColor}08 100%)`,
        ...style,
      }}
    >
      <div className='absolute inset-0 opacity-5 bg-[url("https://www.transparenttextures.com/patterns/cubes.png")]' />

      <div className='relative z-10 text-center px-4 py-6 w-full h-full flex items-center justify-center'>
        <p
          className='font-black italic leading-snug'
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(14px, 5vw, 36px)',
            background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColorDark} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            maxWidth: '95%',
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            hyphens: 'auto',
          }}
        >
          {serviceName}
        </p>
      </div>
    </div>
  )
}

export default ServiceImagePlaceholder
