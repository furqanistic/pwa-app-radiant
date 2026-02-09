import { motion } from 'framer-motion'
import { Loader2, RefreshCcw, Sparkles, Star } from 'lucide-react'
import React, { useMemo, useState } from 'react'

// Enhanced Spin Wheel using Framer Motion
const SpinWheel = ({ game, onPlay, isPlaying, canPlay, onComplete }) => {
  const [rotation, setRotation] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)

  const items = game.items || []
  const segmentAngle = 360 / items.length
  
  const getCssVar = (name, fallback) => {
    if (typeof window === 'undefined') return fallback
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim()
    return value || fallback
  }

  const adjustHex = (hex, amount) => {
    const cleaned = hex.replace('#', '')
    if (cleaned.length !== 6) return hex
    const num = parseInt(cleaned, 16)
    const r = Math.max(0, Math.min(255, ((num >> 16) & 255) + amount))
    const g = Math.max(0, Math.min(255, ((num >> 8) & 255) + amount))
    const b = Math.max(0, Math.min(255, (num & 255) + amount))
    return `#${r.toString(16).padStart(2, '0')}${g
      .toString(16)
      .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }

  const colors = useMemo(() => {
    const base = getCssVar('--brand-primary', '#ec4899')
    return [
      base,
      adjustHex(base, -10),
      adjustHex(base, -20),
      adjustHex(base, 12),
      adjustHex(base, 24),
      adjustHex(base, -32),
      '#10b981',
      '#f59e0b',
    ]
  }, [])

  const handleSpin = () => {
    if (isSpinning || isPlaying || !canPlay) return

    setIsSpinning(true)
    // Random rotations: at least 5 full spins + random segment
    const randomOffset = Math.random() * 360
    const spins = 1800 // 5 full rotations
    const newRotation = rotation + spins + randomOffset
    
    setRotation(newRotation)

    // Wait for animation to finish
    setTimeout(() => {
      setIsSpinning(false)
      onPlay()
      if (onComplete) onComplete()
    }, 4000) // Match the duration in transition
  }

  return (
    <div className='flex flex-col items-center py-4'>
      {/* Pointer/Marker */}
      <div className='relative z-20 translate-y-4 filter drop-shadow-lg'>
        <div className='w-8 h-8 bg-white rotate-45 transform origin-center border-4 border-[color:var(--brand-primary)] rounded-sm shadow-md'></div>
      </div>

      {/* Wheel Container with Shadow/Depth */}
      <div className='relative w-72 h-72 md:w-80 md:h-80 rounded-full bg-white p-2 shadow-2xl shadow-[color:var(--brand-primary)/0.25]'>
        <div className='w-full h-full rounded-full overflow-hidden relative border-4 border-[color:var(--brand-primary)/0.2]'>
          <motion.div
            className='w-full h-full relative'
            animate={{ rotate: rotation }}
            transition={{
              duration: 4,
              ease: [0.15, 0.25, 0.15, 1], // Cubic bezier for realistic "spin down" physics
            }}
          >
            {/* Re-implementing wheel segments using a cleaner DOM structure for the fan effect */}
            {items.map((item, index) => {
               const angle = index * segmentAngle;
               return (
                 <React.Fragment key={index}>
                   {/* Segment Slice Background */}
                   <div
                     className="absolute top-0 right-0 w-1/2 h-1/2 origin-bottom-left"
                     style={{
                       transform: `rotate(${angle}deg) skewY(${90 - segmentAngle}deg)`,
                       background: item.color || colors[index % colors.length],
                       transformOrigin: '0% 100%',
                     }}
                   />
                   {/* Content (needs to be un-skewed) */}
                   <div
                      className="absolute top-0 left-1/2 w-1/2 h-1/2 -translate-x-1/2 origin-bottom"
                      style={{
                        transform: `rotate(${angle + segmentAngle/2}deg)`,
                        paddingTop: '20px',
                        transformOrigin: '50% 100%'
                      }}
                   >
                      <div className="flex flex-col items-center justify-start h-full pt-4 text-white">
                        <span className="font-bold text-xs uppercase tracking-wider drop-shadow-md max-w-[60px] truncate">{item.title}</span>
                        <span className="text-[10px] opacity-90 drop-shadow-sm font-medium">{item.value}</span>
                        <div className="mt-1">
                          <Star className="w-3 h-3 text-yellow-300 fill-yellow-300" />
                        </div>
                      </div>
                   </div>
                 </React.Fragment>
               )
            })}
          </motion.div>
        </div>

        {/* Center Cap */}
        <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-[color:var(--brand-primary)/0.2] z-10'>
           <motion.div 
             animate={isSpinning ? { scale: [1, 1.1, 1] } : {}}
             transition={{ duration: 0.5, repeat: Infinity }}
             className="w-10 h-10 rounded-full bg-gradient-to-br from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] flex items-center justify-center"
           >
              <Sparkles className="w-5 h-5 text-white" />
           </motion.div>
        </div>
      </div>

      <div className='mt-8 w-full max-w-xs'>
        <button
          onClick={handleSpin}
          disabled={isSpinning || isPlaying || !canPlay}
          className='w-full py-4 relative group overflow-hidden rounded-2xl bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] text-white shadow-xl shadow-[color:var(--brand-primary)/0.3] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          <div className="relative flex items-center justify-center gap-2 font-bold text-lg tracking-wide uppercase">
            {isSpinning || isPlaying ? (
              <>
                 <Loader2 className='w-5 h-5 animate-spin' />
                 <span>Spinning...</span>
              </>
            ) : !canPlay ? (
              <span>Come back later!</span>
            ) : (
              <>
                <RefreshCcw className="w-5 h-5" />
                <span>Spin Now</span>
              </>
            )}
          </div>
        </button>
        {canPlay && (
           <p className="text-center text-xs text-gray-400 mt-3 font-medium">Test your luck today!</p>
        )}
      </div>
    </div>
  )
}

export default SpinWheel
