import { AnimatePresence, motion } from 'framer-motion'
import { Clock, Gift, Loader2, Star } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

// Scratch Card — API is called FIRST (when user starts scratching),
// then the card auto-reveals once the result is ready.
const SlideReveal = ({ game, onPlay, isPlaying, canPlay, onComplete }) => {
  const [phase, setPhase] = useState('idle') // idle | loading | revealed
  const [result, setResult] = useState(null)
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const isScratching = useRef(false)
  const hasTriggered = useRef(false)

  // ─── Draw / re-draw scratch overlay ─────────────────────────────────────
  useEffect(() => {
    if (phase !== 'idle') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const container = containerRef.current

    const draw = () => {
      if (!container) return
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height

      // Overlay fill
      const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height)
      gradient.addColorStop(0, '#f8fafc')
      gradient.addColorStop(0.5, '#e2e8f0')
      gradient.addColorStop(1, '#f8fafc')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, rect.width, rect.height)

      // Grid pattern for scratch texture
      ctx.strokeStyle = 'rgba(148,163,184,0.25)'
      ctx.lineWidth = 1
      for (let x = 0; x < rect.width; x += 18) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, rect.height); ctx.stroke()
      }
      for (let y = 0; y < rect.height; y += 18) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(rect.width, y); ctx.stroke()
      }

      // "MYSTERY" text
      ctx.shadowBlur = 6
      ctx.shadowColor = 'rgba(0,0,0,0.08)'
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 2
      const brandColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--brand-primary').trim() || '#ec4899'
      ctx.fillStyle = brandColor
      ctx.font = '900 40px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('✦ MYSTERY ✦', rect.width / 2, rect.height / 2 - 14)

      ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0
      ctx.font = 'bold 11px Inter, sans-serif'
      ctx.fillStyle = '#94a3b8'
      ctx.fillText('SCRATCH TO REVEAL', rect.width / 2, rect.height / 2 + 22)
    }

    draw()
    const t = setTimeout(draw, 80)
    window.addEventListener('resize', draw)
    return () => { window.removeEventListener('resize', draw); clearTimeout(t) }
  }, [phase])

  // ─── Auto-reveal once result arrives ────────────────────────────────────
  useEffect(() => {
    if (phase === 'loading' && result) {
      autoReveal()
    }
  }, [phase, result])

  const autoReveal = () => {
    const canvas = canvasRef.current
    if (!canvas) { triggerComplete(); return }
    const ctx = canvas.getContext('2d')
    const { width, height } = canvas

    // Wipe canvas quickly
    let alpha = 1
    const wipe = () => {
      alpha -= 0.08
      if (alpha <= 0) {
        setPhase('revealed')
        setTimeout(triggerComplete, 600)
        return
      }
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = `rgba(0,0,0,0.15)`
      ctx.fillRect(0, 0, width, height)
      requestAnimationFrame(wipe)
    }
    requestAnimationFrame(wipe)
  }

  const triggerComplete = () => {
    if (onComplete) onComplete()
  }

  // ─── Scratch logic ───────────────────────────────────────────────────────
  const getCoords = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  const scratchAt = (x, y) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(x, y, 32, 0, Math.PI * 2)
    ctx.fill()
    checkThreshold()
  }

  const checkThreshold = () => {
    if (hasTriggered.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { width, height } = canvas
    const data = ctx.getImageData(0, 0, width, height).data
    let transparent = 0
    for (let i = 3; i < data.length; i += 64) {
      if (data[i] === 0) transparent++
    }
    const pct = (transparent / (data.length / 64)) * 100
    if (pct > 45) {
      hasTriggered.current = true
      triggerPlay()
    }
  }

  const triggerPlay = async () => {
    if (!canPlay || hasTriggered.current === false) return
    setPhase('loading')
    try {
      const response = await onPlay()
      setResult(response?.data || response)
    } catch {
      setPhase('idle')
      hasTriggered.current = false
    }
  }

  const onPointerDown = (e) => {
    if (!canPlay || phase !== 'idle' || hasTriggered.current) return
    isScratching.current = true
    const { x, y } = getCoords(e)
    scratchAt(x, y)
    if (e.cancelable) e.preventDefault()
  }

  const onPointerMove = (e) => {
    if (!isScratching.current || phase !== 'idle') return
    const { x, y } = getCoords(e)
    scratchAt(x, y)
    if (e.cancelable) e.preventDefault()
  }

  const onPointerUp = () => { isScratching.current = false }

  const winningItem = result?.result?.winningItem

  return (
    <div className='flex flex-col items-center py-4 select-none'>
      {/* ─── Card ─── */}
      <div
        ref={containerRef}
        className='relative w-full max-w-[320px] rounded-[36px] overflow-hidden shadow-2xl border-[5px] border-white'
        style={{
          aspectRatio: '4/3',
          boxShadow: '0 8px 32px color-mix(in srgb, var(--brand-primary) 30%, transparent)',
        }}
      >
        {/* Prize layer (underneath) */}
        <div
          className='absolute inset-0 flex flex-col items-center justify-center text-white z-0'
          style={{
            background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))',
          }}
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={phase === 'revealed' ? { scale: 1, opacity: 1 } : {}}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
            className='text-center px-6'
          >
            <div className='w-20 h-20 bg-white/20 backdrop-blur-xl rounded-[28px] flex items-center justify-center mx-auto mb-3 shadow-xl border border-white/40'>
              {winningItem ? (
                <Star className='w-10 h-10 text-yellow-300 fill-yellow-300' />
              ) : (
                <Gift className='w-10 h-10 text-white' />
              )}
            </div>
            {phase === 'loading' && !winningItem ? (
              <div className='flex items-center gap-2 justify-center'>
                <Loader2 className='w-5 h-5 animate-spin text-white/80' />
                <span className='text-white/80 font-bold text-sm uppercase tracking-widest'>
                  Calculating...
                </span>
              </div>
            ) : (
              <>
                <h3 className='text-3xl font-black mb-1'>
                  {winningItem ? winningItem.value : '?'}
                </h3>
                <p className='text-white/80 font-bold text-xs uppercase tracking-widest'>
                  {winningItem ? winningItem.title : 'Mystery luck awaits'}
                </p>
              </>
            )}
          </motion.div>

          {/* Celebration particles */}
          {phase === 'revealed' && (
            <div className='absolute inset-0 pointer-events-none overflow-hidden'>
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: '50%', x: '50%', scale: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    y: `${Math.random() * 120 - 10}%`,
                    x: `${Math.random() * 120 - 10}%`,
                    scale: [0, 1, 0],
                  }}
                  transition={{ duration: 1.5, delay: i * 0.08, ease: 'easeOut' }}
                  className='absolute w-3 h-3 rounded-full'
                  style={{
                    background: ['#fff', '#fbbf24', 'var(--brand-primary)', 'var(--brand-primary-dark)'][i % 4],
                    left: '50%', top: '50%',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Scratch canvas overlay */}
        <AnimatePresence>
          {phase === 'idle' && (
            <motion.canvas
              ref={canvasRef}
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.1, filter: 'blur(8px)', transition: { duration: 0.5 } }}
              className='absolute inset-0 z-10 cursor-crosshair touch-none'
              onMouseDown={onPointerDown}
              onMouseMove={onPointerMove}
              onMouseUp={onPointerUp}
              onMouseLeave={onPointerUp}
              onTouchStart={onPointerDown}
              onTouchMove={onPointerMove}
              onTouchEnd={onPointerUp}
            />
          )}
        </AnimatePresence>

        {/* Loading shimmer overlay */}
        {phase === 'loading' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className='absolute inset-0 z-10'
          >
            <motion.div
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
              className='absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent'
            />
          </motion.div>
        )}

        {/* Can't play overlay */}
        {!canPlay && phase === 'idle' && (
          <div className='absolute inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-20 pointer-events-none'>
            <div className='bg-white/10 backdrop-blur-xl rounded-[28px] p-6 text-white text-center border border-white/20'>
              <Clock className='w-10 h-10 mx-auto mb-3 text-white/80' />
              <p className='font-black text-xs uppercase tracking-widest'>Limit Reached</p>
              <p className='text-[10px] text-white/60 mt-1 uppercase'>Next chance soon</p>
            </div>
          </div>
        )}
      </div>

      {/* Status text */}
      <div className='mt-6 text-center'>
        {phase === 'loading' && (
          <div className='flex items-center gap-2 px-5 py-2.5 bg-white rounded-full border border-gray-100 shadow-sm'>
            <Loader2 className='w-4 h-4 animate-spin text-[color:var(--brand-primary)]' />
            <span className='text-[color:var(--brand-primary)] font-black text-xs uppercase tracking-widest'>
              Validating Win...
            </span>
          </div>
        )}
        {phase === 'idle' && canPlay && (
          <div className='space-y-1'>
            <p className='text-slate-900 font-black text-sm tracking-tight uppercase'>Scribble to Scratch</p>
            <p className='text-slate-400 font-medium text-xs'>Uncover your daily wellness prize</p>
          </div>
        )}
        {phase === 'idle' && !canPlay && (
          <p className='text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]'>Check back later!</p>
        )}
        {phase === 'revealed' && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className='text-[color:var(--brand-primary)] font-black text-sm uppercase tracking-widest'
          >
            🎉 You won!
          </motion.p>
        )}
      </div>
    </div>
  )
}

export default SlideReveal
