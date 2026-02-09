// File: client/src/components/Dashboard/PointsCard.jsx
import { motion } from 'framer-motion'
import { Crown, Sparkles } from 'lucide-react'
import { useSelector } from 'react-redux'
import { useBranding } from '@/context/BrandingContext'

const clampChannel = (value) => Math.max(0, Math.min(255, value))

const hexToRgb = (hex) => {
  if (!hex) return { r: 236, g: 72, b: 153 }
  const cleaned = hex.replace('#', '')
  if (cleaned.length !== 6) return { r: 236, g: 72, b: 153 }
  const num = parseInt(cleaned, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

const rgbaFromHex = (hex, alpha) => {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const adjustHex = (hex, amount) => {
  const { r, g, b } = hexToRgb(hex)
  const rr = clampChannel(r + amount)
  const gg = clampChannel(g + amount)
  const bb = clampChannel(b + amount)
  return `#${rr.toString(16).padStart(2, '0')}${gg
    .toString(16)
    .padStart(2, '0')}${bb.toString(16).padStart(2, '0')}`
}

const PointsCard = () => {
  const { currentUser } = useSelector((state) => state.user)
  const { branding } = useBranding()
  const brandColor = branding?.themeColor || '#ec4899'
  const brandDark = adjustHex(brandColor, -24)
  const brandSoft = rgbaFromHex(brandColor, 0.35)
  const brandSoftAlt = rgbaFromHex(brandColor, 0.25)

  const formatJoinDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className='relative group cursor-pointer'
    >
      {/* Glow Effect behind the card */}
      <div
        className='absolute inset-0 sm:-inset-2 rounded-[2.5rem] blur-2xl opacity-30 group-hover:opacity-50 transition-all duration-700'
        style={{
          background: `linear-gradient(90deg, ${brandColor}, ${brandDark})`,
        }}
      ></div>

      <motion.div
        whileHover={{ y: -8, rotateX: 2, rotateY: -2 }}
        className='relative aspect-video sm:aspect-[1.6/1] md:aspect-auto md:min-h-64 rounded-[2rem] overflow-hidden border border-white/30 shadow-2xl'
        style={{
          background: `linear-gradient(135deg, ${brandColor}, ${brandDark})`,
        }}
      >
        {/* Premium Vibrant Pink Mesh Background */}
        <div className='absolute inset-0 overflow-hidden'>
          <div
            className='absolute inset-0'
            style={{
              background: `linear-gradient(135deg, ${brandColor}, ${brandDark})`,
            }}
          ></div>
          
          {/* Animated Mesh Blobs */}
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              x: [0, 50, 0],
              y: [0, -20, 0],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            className='absolute -top-1/4 -left-1/4 w-[120%] h-[120%]'
            style={{
              background: `radial-gradient(circle, ${brandSoft} 0%, transparent 60%)`,
            }}
          />
          <motion.div
            animate={{
              scale: [1.3, 1, 1.3],
              x: [0, -50, 0],
              y: [0, 20, 0],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
            className='absolute -bottom-1/4 -right-1/4 w-[120%] h-[120%]'
            style={{
              background: `radial-gradient(circle, ${brandSoftAlt} 0%, transparent 60%)`,
            }}
          />
          <motion.div
            animate={{
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{ duration: 8, repeat: Infinity }}
            className='absolute inset-0 bg-[url("https://www.transparenttextures.com/patterns/carbon-fibre.png")] opacity-10 mix-blend-overlay'
          />
        </div>

        {/* Reflective Shine Effect */}
        <motion.div
          initial={{ x: '-150%' }}
          animate={{ x: '150%' }}
          transition={{
            duration: 4,
            repeat: Infinity,
            repeatDelay: 3,
            ease: 'easeInOut',
          }}
          className='absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-25 pointer-events-none'
        />

        {/* Card Content */}
        <div className='relative h-full p-5 sm:p-8 flex flex-col justify-between z-10'>
          {/* Header Area */}
          <div className='flex justify-between items-start'>
            <div className='space-y-0.5 sm:space-y-1 text-white'>
              <div className='flex items-center gap-2'>
                <div className='w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,1)] animate-pulse' />
                <span className='text-[8px] sm:text-[10px] font-black tracking-[0.2em] sm:tracking-[0.25em] text-white/90 uppercase drop-shadow-sm'>
                   {currentUser?.referralStats?.currentTier || 'Radiant'} Member
                </span>
              </div>
              <h3 className='text-base sm:text-lg md:text-xl font-bold text-white tracking-tight flex items-center gap-2 drop-shadow-md capitalize'>
                {currentUser?.referralStats?.currentTier || 'Bronze'} Status
                <Crown
                  size={16}
                  className='sm:w-[18px] sm:h-[18px]'
                  style={{
                    color: rgbaFromHex(brandColor, 0.2),
                    fill: rgbaFromHex(brandColor, 0.18),
                  }}
                />
              </h3>
            </div>
            
            {/* Digital Chip - Styled for Light theme */}
            <div className='relative w-11 h-8 sm:w-14 sm:h-10 rounded-md sm:rounded-lg bg-white/20 border border-white/40 backdrop-blur-md shadow-inner overflow-hidden'>
              <div className='absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0.5 p-1 sm:p-1.5 opacity-40'>
                {[...Array(9)].map((_, i) => (
                  <div key={i} className='border-[1px] border-white rounded-[1px] sm:rounded-[2px]' />
                ))}
              </div>
            </div>
          </div>

          {/* Points Display */}
          <div className='flex flex-col relative mt-2'>

            <div className='flex items-baseline gap-1.5 sm:gap-2'>
              <motion.span 
                key={currentUser?.points}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className='text-3xl sm:text-5xl md:text-6xl font-black text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.1)] tracking-tighter'
              >
                {currentUser?.points?.toLocaleString() || '0'}
              </motion.span>
              <span className='text-[10px] sm:text-sm font-bold text-white/90 tracking-[0.15em] sm:tracking-[0.2em] uppercase drop-shadow-sm'>Points</span>
            </div>
            <div className='flex items-center gap-3 mt-1'>
              <div className='h-[2px] flex-1 bg-gradient-to-r from-white to-transparent opacity-60' />
              <p className='text-[11px] font-black text-white uppercase tracking-[0.3em] leading-none drop-shadow-sm'>Available Balance</p>
            </div>
          </div>

          {/* Bottom Info Section */}
          <div className='flex justify-between items-end mt-4'>
            <div className='flex flex-col gap-0.5 sm:gap-1'>
              <span className='text-[7px] sm:text-[9px] font-black text-white/70 uppercase tracking-[0.2em]'>Cardholder</span>
              <span className='text-sm sm:text-lg font-bold text-white tracking-wide drop-shadow-sm'>
                {currentUser?.name || 'Radiant Member'}
              </span>
            </div>

            <div className='flex items-center gap-3 sm:gap-5 bg-white/20 backdrop-blur-3xl rounded-xl sm:rounded-2xl px-3 py-2 sm:px-5 sm:py-3 border border-white/30 shadow-xl'>
              <div className='flex flex-col items-end'>
                <span className='text-[7px] sm:text-[8px] font-black text-white/70 uppercase tracking-[0.2em] sm:tracking-[0.3em]'>Joined</span>
                <span className='text-[10px] sm:text-[13px] font-black text-white'>
                   {currentUser?.createdAt ? formatJoinDate(currentUser.createdAt) : 'Est. 2024'}
                </span>
              </div>
              <div className='w-[1px] h-6 sm:h-8 bg-white/20' />
              <div className='flex gap-1 sm:gap-1.5'>
                {[...Array(3)].map((_, i) => (
                  <motion.div 
                    key={i} 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
                    className='w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' 
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Decorative corner accent */}
        <div className='absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 blur-[80px] rounded-full' />
      </motion.div>
    </motion.div>
  )
}

export default PointsCard
