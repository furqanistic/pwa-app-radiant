// File: client/src/components/Dashboard/PointsCard.jsx
import { motion, useAnimation } from 'framer-motion'
import { Sparkles, Star } from 'lucide-react'
import { useSelector } from 'react-redux'
import { useBranding } from '@/context/BrandingContext'
import { useSpaSync } from '@/context/SpaSyncContext'
import { useEnhancedRewardsCatalog } from '@/hooks/useRewards'
import { useEffect } from 'react'

const Motion = motion

const clampChannel = (value) => Math.max(0, Math.min(255, value))

const hexToRgb = (hex) => {
  if (!hex) return { r: 236, g: 72, b: 153 } // default pink
  const cleaned = hex.replace('#', '')
  if (cleaned.length !== 6) return { r: 236, g: 72, b: 153 }
  const num = parseInt(cleaned, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

const PointsCard = () => {
  const { currentUser } = useSelector((state) => state.user)
  const { branding, locationId } = useBranding()
  const { isSyncingSelectedSpa } = useSpaSync()
  const catalogFilters = locationId ? { locationId } : {}
  const { userPoints, isLoading: catalogLoading } =
    useEnhancedRewardsCatalog(catalogFilters)

  const reduxPoints = Number(currentUser?.points ?? 0)
  const catalogPts = Number(userPoints ?? 0)
  const displayPoints =
    locationId && !catalogLoading && !isSyncingSelectedSpa
      ? catalogPts
      : reduxPoints

  const brandColor = branding?.themeColor || '#ec4899'
  const brandRgb = hexToRgb(brandColor)
  
  // Create richer gradient shades based on brand color for a premium depth effect
  const darkShade = `rgba(${clampChannel(brandRgb.r - 40)}, ${clampChannel(brandRgb.g - 40)}, ${clampChannel(brandRgb.b - 40)}, 1)`
  const lightShade = `rgba(${clampChannel(brandRgb.r + 40)}, ${clampChannel(brandRgb.g + 40)}, ${clampChannel(brandRgb.b + 40)}, 1)`

  const formatJoinDate = (dateString) => {
    if (!dateString) return '12/29'
    const date = new Date(dateString)
    // Show like a credit card expiry: MM/YY
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = (date.getFullYear() + 5).toString().slice(-2) // Valid Thru (5 years from join)
    return `${month}/${year}`
  }

  const controls = useAnimation()
  
  useEffect(() => {
    controls.start({
      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
      transition: { duration: 15, ease: 'linear', repeat: Infinity }
    })
  }, [controls])

  return (
    <Motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className='relative group cursor-pointer w-full'
    >
      {/* Outer ambient glow */}
      <div 
        className='absolute -inset-1 blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-700 rounded-[2.5rem]'
        style={{ backgroundImage: `linear-gradient(to right, ${brandColor}, ${darkShade}, ${lightShade})` }}
      />

      <Motion.div
        whileHover={{ scale: 1.02, rotateX: 2, rotateY: -2 }}
        className='relative overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] w-full min-h-[200px] sm:min-h-[220px] md:min-h-[260px] p-5 sm:p-6 md:p-8 flex flex-col justify-between shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] border border-white/20'
        style={{ backgroundColor: darkShade }}
      >
        {/* Animated Background Layers */}
        <div className='absolute inset-0 z-0 overflow-hidden pointer-events-none'>
          {/* Main shifting liquid gradient */}
          <Motion.div 
            animate={controls}
            className='absolute inset-0 opacity-90'
            style={{
              background: `linear-gradient(120deg, ${darkShade} 0%, ${brandColor} 50%, ${darkShade} 100%)`,
              backgroundSize: '200% 200%'
            }}
          />
          
          {/* Subtle geometric/glass texture */}
          <div className='absolute inset-0 opacity-20 mix-blend-overlay' style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }} />
          
          {/* Dynamic Elegant Orbs */}
          <Motion.div 
            animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className='absolute -top-32 -right-32 w-96 h-96 rounded-full blur-[80px]'
            style={{ backgroundColor: lightShade }}
          />
          <Motion.div 
            animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            className='absolute -bottom-32 -left-32 w-80 h-80 rounded-full blur-[60px]'
            style={{ backgroundColor: brandColor }}
          />

          {/* Vignette overlay for depth */}
          <div className='absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent' />
        </div>

        {/* Refined Shimmer Effect (Sweep) */}
        <Motion.div
          animate={{ x: ['-200%', '200%'] }}
          transition={{ duration: 5, repeat: Infinity, repeatDelay: 6, ease: 'easeInOut' }}
          className='absolute inset-0 z-[1] w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-30deg] pointer-events-none'
        />

        {/* Card Content Elements (Z-10) */}
        <div className='relative z-10 flex flex-col h-full justify-between'>
          {/* TOP ROW: Status and Chip */}
          <div className='flex justify-between items-start'>
            {/* Status Tier Badge */}
            <div className='flex flex-col gap-1'>
              <div className='inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-sm'>
                <Sparkles size={14} className='text-white animate-pulse' />
                <span className='text-[10px] sm:text-xs font-bold text-white tracking-[0.2em] uppercase'>
                  {currentUser?.referralStats?.currentTier || 'Radiant'} Tier
                </span>
              </div>
            </div>
            
            {/* Premium Metallic Chip Replica */}
            <div className='relative w-12 h-8 sm:w-16 sm:h-10 rounded-md sm:rounded-lg bg-gradient-to-br from-white/30 to-white/5 border border-white/40 shadow-inner flex items-center justify-center overflow-hidden backdrop-blur-lg group-hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all duration-500'>
               <div className='absolute inset-0 bg-white/10 mix-blend-overlay' style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/micro-carbon.png")' }} />
               <Star size={18} className='text-white/80 z-10 drop-shadow-md' />
            </div>
          </div>

          {/* MIDDLE ROW: Points Value */}
          <div className='flex flex-col mt-4 sm:mt-2'>
            <p className='text-[10px] sm:text-xs font-semibold text-white/70 uppercase tracking-widest mb-1.5 drop-shadow-sm'>
              Available Balance
            </p>
            <div className='flex items-baseline gap-2 sm:gap-3'>
              <Motion.span 
                key={`${displayPoints}-${locationId || 'default'}`}
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className={`text-4xl sm:text-5xl md:text-6xl leading-none font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/60 drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)] tracking-tighter tabular-nums ${
                  isSyncingSelectedSpa ? 'animate-pulse' : ''
                }`}
              >
                {displayPoints.toLocaleString()}
              </Motion.span>
              <span className='text-xs sm:text-sm font-bold text-white/80 tracking-widest'>PTS</span>
            </div>
          </div>

          {/* BOTTOM ROW: Name and Valid Details */}
          <div className='flex justify-between items-end mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-white/15'>
            <div className='flex flex-col gap-1'>
              <span className='text-[8px] sm:text-[10px] font-semibold text-white/60 uppercase tracking-[0.3em]'>Member Name</span>
              <span className='text-sm sm:text-lg md:text-xl font-bold text-white tracking-widest drop-shadow-md uppercase'>
                {currentUser?.name || 'Valued Guest'}
              </span>
            </div>

            <div className='flex flex-col items-end gap-1'>
              <span className='text-[8px] sm:text-[10px] font-semibold text-white/60 uppercase tracking-[0.3em]'>Valid Thru</span>
              <span className='text-xs sm:text-lg font-semibold text-white tracking-widest font-mono drop-shadow-md'>
                {formatJoinDate(currentUser?.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </Motion.div>
    </Motion.div>
  )
}

export default PointsCard
