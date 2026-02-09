import { AnimatePresence, motion } from 'framer-motion'
import { Clock, Gift, Loader2, Star } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

// "Magic Reveal" Canvas Scratch Card Component
const SlideReveal = ({ game, onPlay, isPlaying, canPlay, result, onComplete }) => {
  const [isRevealed, setIsRevealed] = useState(false)
  const [isScratching, setIsScratching] = useState(false)
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false)
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const revealingRef = useRef(false)

  useEffect(() => {
    if (isRevealed) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const container = containerRef.current
    
    // Set canvas dimensions to match container
    const resizeCanvas = () => {
      if (!container) return
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
      
      const getCssVar = (name, fallback) => {
        if (typeof window === 'undefined') return fallback
        const value = getComputedStyle(document.documentElement)
          .getPropertyValue(name)
          .trim()
        return value || fallback
      }

      const base = '#ffffff'
      const dark = '#f8fafc' // slate-50

      // Initial fill - Premium white/light-gray gradient
      const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height)
      gradient.addColorStop(0, base)
      gradient.addColorStop(0.5, dark)
      gradient.addColorStop(1, base)
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, rect.width, rect.height)

      // Add "Mystery" text with embossed premium effect
      ctx.shadowBlur = 4
      ctx.shadowColor = 'rgba(0,0,0,0.1)'
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 2
      ctx.fillStyle = getCssVar('--brand-primary', '#ec4899')
      ctx.font = '900 42px Outfit, Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('MYSTERY', rect.width / 2, rect.height / 2)
      
      // Add hint text
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
      ctx.font = 'bold 12px Inter, sans-serif'
      ctx.fillStyle = '#94a3b8' // slate-400
      ctx.fillText('SCRATCH TO REVEAL', rect.width / 2, rect.height / 2 + 45)
    }

    resizeCanvas()
    const timer = setTimeout(resizeCanvas, 100) // Double check after initial render
    window.addEventListener('resize', resizeCanvas)
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      clearTimeout(timer)
    }
  }, [isRevealed])

  const getCoordinates = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
  }

  const scratch = (x, y) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(x, y, 30, 0, Math.PI * 2)
    ctx.fill()
    
    checkScratchedPercentage()
  }

  const checkScratchedPercentage = () => {
    if (isRevealed || revealingRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const { width, height } = canvas
    const imageData = ctx.getImageData(0, 0, width, height)
    const pixels = imageData.data
    let transparentPixels = 0

    // Sample pixels for performance: check every 16th pixel (RGBA = 4 bytes)
    for (let i = 0; i < pixels.length; i += 64) {
      if (pixels[i + 3] === 0) {
        transparentPixels++
      }
    }

    const totalSampledPixels = (width * height) / 16
    const percentage = (transparentPixels / totalSampledPixels) * 100
    
    // If more than 35% scratched, auto reveal
    if (percentage > 35 && !isRevealed && !revealingRef.current) {
      handleReveal()
    }
  }

  const handleReveal = () => {
    if (!canPlay || isRevealed || isPlaying || revealingRef.current) return
    
    revealingRef.current = true
    setIsRevealed(true)
    
    // Trigger onPlay after local animation
    setTimeout(() => {
      onPlay()
      // Wait a bit more for the "Revealing..." state to be seen then complete
      setTimeout(() => {
        if (onComplete) onComplete()
      }, 1500)
    }, 800)
  }

  const handleMouseDown = (e) => {
    if (!canPlay || isRevealed || isPlaying || revealingRef.current) return
    setIsScratching(true)
    const { x, y } = getCoordinates(e)
    scratch(x, y)
    
    // Trigger onPlay as soon as user starts scratching
    if (!hasStartedPlaying) {
      setHasStartedPlaying(true)
      onPlay()
    }
    
    // Prevent default to avoid scrolling on touch
    if (e.cancelable) e.preventDefault()
  }

  const handleMouseMove = (e) => {
    if (!isScratching) return
    const { x, y } = getCoordinates(e)
    scratch(x, y)
    
    if (e.cancelable) e.preventDefault()
  }

  const handleMouseUp = () => {
    setIsScratching(false)
  }

  return (
    <div className='flex flex-col items-center py-4'>
      <div 
        ref={containerRef}
        className='relative w-full max-w-[320px] aspect-[4/3] rounded-[42px] overflow-hidden shadow-2xl shadow-[color:var(--brand-primary)/0.25] border-[6px] border-white transform transition-transform duration-300'
      >
        
        {/* The Prize (Underneath) */}
        <div className='absolute inset-0 bg-gradient-to-br from-[color:var(--brand-primary)] via-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] flex flex-col items-center justify-center text-white z-0'>
           <motion.div
             initial={{ scale: 0.5, opacity: 0 }}
             animate={isRevealed ? { scale: 1, opacity: 1 } : {}}
             transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 20 }}
             className="text-center p-4"
           >
              <div className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-[32px] flex items-center justify-center mx-auto mb-4 shadow-2xl border border-white/40">
                 {result ? (
                   <Star className="w-10 h-10 text-yellow-300 fill-yellow-300" />
                 ) : (
                   <Gift className="w-10 h-10 text-white" />
                 )}
              </div>
              <h3 className="text-3xl font-black mb-1">
                {result ? result.result.winningItem.value : 'Revealing...'}
              </h3>
              <p className="text-white/80 font-bold text-xs uppercase tracking-widest">
                {result ? result.result.winningItem.title : 'Mystery luck awaits'}
              </p>
           </motion.div>
           
           {isRevealed && (
             <div className="absolute inset-0 pointer-events-none overflow-hidden">
               {[...Array(20)].map((_, i) => (
                 <motion.div 
                   key={i}
                   initial={{ opacity: 0, scale: 0, x: '50%', y: '50%' }}
                   animate={{ 
                     opacity: [0, 1, 0], 
                     scale: [0, 1, 2], 
                     x: (Math.random() * 200 - 100) + '%',
                     y: (Math.random() * 200 - 100) + '%'
                   }}
                   transition={{ 
                     duration: 2, 
                     delay: Math.random() * 0.5,
                     repeat: Infinity
                   }}
                   className={`absolute w-4 h-4 rounded-full ${['bg-yellow-300', 'bg-white', 'bg-[color:var(--brand-primary)/0.5]', 'bg-[color:var(--brand-primary-dark)]'][i % 4]} blur-md`}
                 />
               ))}
             </div>
           )}
        </div>

        {/* The Canvas Scratch Overlay */}
        <AnimatePresence>
          {!isRevealed && (
            <motion.canvas
              ref={canvasRef}
              initial={{ opacity: 1 }}
              exit={{ 
                opacity: 0,
                scale: 1.2,
                filter: 'blur(10px)',
                transition: { duration: 0.8, ease: "anticipate" }
              }}
              className='absolute inset-0 z-10 cursor-crosshair'
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
              style={{ touchAction: 'none' }}
            />
          )}
        </AnimatePresence>

        {/* Disabled Overlay */}
        {!canPlay && !isRevealed && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-20 pointer-events-none">
             <div className="bg-white/10 backdrop-blur-xl rounded-[32px] p-6 text-white text-center border border-white/20 shadow-2xl">
                <Clock className="w-10 h-10 mx-auto mb-3 text-white/80" />
                <p className="font-black text-xs uppercase tracking-widest">Limit Reached</p>
                <p className="text-[10px] text-white/60 mt-1 uppercase">Next chance soon</p>
             </div>
          </div>
        )}
      </div>

      <div className='mt-8 text-center'>
         {isPlaying ? (
           <div className="flex flex-col items-center gap-3">
             <div className="flex items-center gap-2 px-5 py-2.5 bg-[color:var(--brand-primary)/0.08] rounded-full border border-gray-200/70 shadow-sm animate-pulse">
               <Loader2 className="w-4 h-4 animate-spin text-[color:var(--brand-primary)]" />
               <span className="text-[color:var(--brand-primary)] font-black text-xs uppercase tracking-widest">Validating Win...</span>
             </div>
           </div>
         ) : !canPlay ? (
           <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">Check back later, sweetie!</p>
         ) : (
           <div className="space-y-1">
             <p className="text-slate-900 font-black text-sm tracking-tight uppercase">Scribble to Scratch</p>
             <p className="text-slate-400 font-medium text-xs">Uncover your daily wellness prize</p>
           </div>
         )}
      </div>
    </div>
  )
}


export default SlideReveal
