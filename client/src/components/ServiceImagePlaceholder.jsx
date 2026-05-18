import React from 'react'

const SIZE_STYLES = {
  sm: {
    fontSize: 'clamp(6px, 1.4vw, 8px)',
    lineClampClass: 'line-clamp-2',
    padding: 'px-1 py-0.5',
    stylish: false,
  },
  md: {
    fontSize: 'clamp(8px, 1.8vw, 11px)',
    lineClampClass: 'line-clamp-2',
    padding: 'px-2 py-1',
    stylish: true,
  },
  lg: {
    fontSize: 'clamp(10px, 2.2vw, 15px)',
    lineClampClass: 'line-clamp-2',
    padding: 'px-4 pt-3 pb-11',
    stylish: true,
  },
}

export const ServiceImagePlaceholder = ({
  serviceName = 'Service',
  brandColor,
  size = 'md',
  className = '',
  style = {},
}) => {
  const textColor = brandColor || 'var(--brand-primary)'
  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.md

  const bgStyle = brandColor
    ? {
        background: `linear-gradient(135deg, ${brandColor}15 0%, ${brandColor}08 100%)`,
      }
    : {
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 8%, #f8fafc) 0%, color-mix(in srgb, var(--brand-primary) 4%, #ffffff) 100%)',
      }

  return (
    <div
      className={`flex items-center justify-center w-full h-full relative overflow-hidden ${className}`}
      style={{ ...bgStyle, ...style }}
    >
      <div className='absolute inset-0 opacity-5 bg-[url("https://www.transparenttextures.com/patterns/cubes.png")]' />

      <div
        className={`relative flex items-center justify-center w-full h-full text-center pointer-events-none ${sizeStyle.padding}`}
      >
        <p
          className={`max-w-[90%] leading-tight ${sizeStyle.lineClampClass} ${
            sizeStyle.stylish ? 'font-black italic' : 'font-bold'
          }`}
          style={{
            fontFamily: sizeStyle.stylish ? "'Playfair Display', serif" : 'inherit',
            fontSize: sizeStyle.fontSize,
            color: textColor,
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
            hyphens: 'auto',
          }}
          title={serviceName}
        >
          {serviceName}
        </p>
      </div>
    </div>
  )
}

export default ServiceImagePlaceholder
