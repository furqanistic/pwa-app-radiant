import { Loader2, RefreshCcw, Sparkles } from 'lucide-react'
import React, { useMemo, useRef, useState } from 'react'

// Spin speed during the "wait for API" phase: 720 deg/s = 2 full rotations/sec
const CRUISE_SPEED_DEG_S = 720
// Linear transition buffer — long enough that the API always returns before this finishes
const CRUISE_BUFFER_MS   = 12000

const TAU = Math.PI * 2

const polarToCartesian = (cx, cy, r, angleRad) => ({
  x: cx + r * Math.cos(angleRad),
  y: cy + r * Math.sin(angleRad),
})

const arcPath = (cx, cy, r, startAngle, endAngle) => {
  const start = polarToCartesian(cx, cy, r, startAngle)
  const end = polarToCartesian(cx, cy, r, endAngle)
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0
  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`,
    'Z',
  ].join(' ')
}

const PALETTE = [
  '#ec4899', '#f472b6', '#fb923c', '#f59e0b',
  '#10b981', '#22c55e', '#38bdf8', '#a78bfa',
  '#e879f9', '#34d399', '#60a5fa', '#fbbf24',
]

const SpinWheel = ({ game, onPlay, isPlaying, canPlay, onComplete }) => {
  // spinState: 'idle' | 'spinning' | 'landing' | 'done'
  const [spinState, setSpinState] = useState('idle')

  const svgRef        = useRef(null)
  const rotationRef   = useRef(0)    // accumulated absolute degrees
  const spinStartRef  = useRef(null) // { time, rot } snapshot when linear spin started

  const items = game.items || []
  const segmentAngle = items.length ? TAU / items.length : 0

  const colors = useMemo(() => {
    const base = getComputedStyle(document.documentElement)
      .getPropertyValue('--brand-primary').trim() || '#ec4899'
    return [base, ...PALETTE]
  }, [])

  const haptic = (p) => { try { navigator?.vibrate?.(p) } catch {} }

  // Apply CSS linear spin — visually locks to CRUISE_SPEED_DEG_S
  const startLinearSpin = () => {
    if (!svgRef.current) return
    const totalDist = CRUISE_SPEED_DEG_S * CRUISE_BUFFER_MS / 1000
    const endRot    = rotationRef.current + totalDist
    spinStartRef.current = { time: performance.now(), startRot: rotationRef.current, totalDist }
    svgRef.current.style.transition = `transform ${CRUISE_BUFFER_MS}ms linear`
    svgRef.current.style.transform  = `rotate(${endRot}deg)`
  }

  // Calculate where the wheel is RIGHT NOW based on elapsed time (no DOMMatrix needed)
  const getCurrentRot = () => {
    const snap = spinStartRef.current
    if (!snap) return rotationRef.current
    const elapsed  = Math.min(performance.now() - snap.time, CRUISE_BUFFER_MS)
    return snap.startRot + (elapsed / CRUISE_BUFFER_MS) * snap.totalDist
  }

  // Snap DOM to a specific rotation with no transition, then start deceleration CSS transition
  const startDeceleration = (fromRot, toRot) => {
    if (!svgRef.current) return
    const dist = toRot - fromRot
    // Duration proportional to distance so initial speed feels consistent (~720 deg/s start).
    // cubic-bezier(0.37, 0, 0.63, 1) is a gentle symmetric s-curve but starting fast —
    // actually use a true ease-out: starts fast, only decelerates.
    // We use (0.22, 1, 0.36, 1) — immediately at high velocity, long smooth stop.
    const duration = Math.max(2800, Math.min(4200, dist / CRUISE_SPEED_DEG_S * 1000 * 2.2))
    svgRef.current.style.transition = 'none'
    svgRef.current.style.transform  = `rotate(${fromRot}deg)`
    void svgRef.current.offsetWidth // force reflow so transition starts fresh
    svgRef.current.style.transition = `transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1)`
    svgRef.current.style.transform  = `rotate(${toRot}deg)`
    return duration
  }

  const handleSpin = async () => {
    if (spinState !== 'idle' || isPlaying || !canPlay || items.length === 0) return

    haptic([10])
    setSpinState('spinning')

    // 1. Start LINEAR spin immediately — constant speed, no easing
    startLinearSpin()

    // 2. Call API in parallel
    let playResponse = null
    try {
      playResponse = await onPlay()
    } catch {
      // Reset on error
      const cur = getCurrentRot()
      if (svgRef.current) {
        svgRef.current.style.transition = 'none'
        svgRef.current.style.transform  = `rotate(${cur}deg)`
      }
      rotationRef.current = cur
      spinStartRef.current = null
      setSpinState('idle')
      return
    }

    // 3. Read exact current position mathematically (no DOMMatrix)
    const currentRot = getCurrentRot()
    spinStartRef.current = null

    // 4. Determine winning segment from server-provided index
    const result      = playResponse?.data?.result
    const serverIndex = result?.winningItemIndex
    const safeIndex   = (typeof serverIndex === 'number' && serverIndex >= 0 && serverIndex < items.length)
      ? serverIndex
      : Math.floor(Math.random() * items.length)

    // 5. Calculate final landing rotation
    const segMid    = safeIndex * segmentAngle + segmentAngle / 2
    const segMidDeg = (segMid * 180) / Math.PI
    const toTop     = (270 - segMidDeg + 360) % 360
    const curNorm   = currentRot % 360
    const extra     = (toTop - curNorm + 360) % 360
    const finalRot  = currentRot + extra + 5 * 360

    rotationRef.current = finalRot
    setSpinState('landing')

    // 6. Deceleration: starts at cruise speed, eases to 0. No S-curve.
    const duration = startDeceleration(currentRot, finalRot)

    setTimeout(() => {
      haptic([30, 20, 60])
      setSpinState('done')
      if (onComplete) onComplete()
    }, duration + 80)
  }

  const isSpinning = spinState === 'spinning' || spinState === 'landing'
  const size   = 316
  const radius = 146
  const lRadius = 94 // label radius
  const center = size / 2

  return (
    <div className='flex flex-col items-center py-4 select-none' style={{ WebkitUserSelect: 'none' }}>

      {/* Pointer arrow */}
      <div className='relative z-20' style={{ marginBottom: '-6px' }}>
        <div
          className='w-0 h-0'
          style={{
            borderLeft: '14px solid transparent',
            borderRight: '14px solid transparent',
            borderTop: '24px solid var(--brand-primary)',
            filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.3))',
          }}
        />
      </div>

      {/* Wheel */}
      <div
        className='rounded-full p-2 bg-white'
        style={{
          boxShadow: '0 0 0 4px color-mix(in srgb, var(--brand-primary) 20%, transparent), 0 12px 40px rgba(0,0,0,0.15)',
        }}
      >
        <div className='relative rounded-full' style={{ width: size, height: size }}>
          <svg
            ref={svgRef}
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className='block rounded-full'
            style={{
              willChange: 'transform',
              transformOrigin: 'center center',
              transform: 'rotate(0deg)',
            }}
          >
            <circle cx={center} cy={center} r={radius + 6} fill='#f8fafc' />

            {items.map((item, index) => {
              const start = index * segmentAngle
              const end   = start + segmentAngle
              const fill  = item.color || colors[index % colors.length]
              const mid   = start + segmentAngle / 2
              const lPos  = polarToCartesian(center, center, lRadius, mid)
              const lRot  = (mid * 180) / Math.PI + 90
              const maxT  = items.length <= 6 ? 11 : items.length <= 10 ? 8 : 6
              const fs    = items.length <= 6 ? 13 : items.length <= 10 ? 11 : 9

              return (
                <g key={item._id || item.id || index}>
                  <path d={arcPath(center, center, radius, start, end)} fill={fill} />
                  <line
                    x1={center} y1={center}
                    x2={polarToCartesian(center, center, radius, end).x}
                    y2={polarToCartesian(center, center, radius, end).y}
                    stroke='white' strokeWidth='2.5' strokeLinecap='round'
                  />
                  <text
                    x={lPos.x} y={lPos.y - 7}
                    textAnchor='middle' fontSize={fs} fontWeight='800' fill='white'
                    transform={`rotate(${lRot} ${lPos.x} ${lPos.y})`}
                    style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.2)', strokeWidth: 3 }}
                  >
                    {`${item.title}`.slice(0, maxT)}
                  </text>
                  <text
                    x={lPos.x} y={lPos.y + (fs + 2)}
                    textAnchor='middle' fontSize={fs - 1} fontWeight='700' fill='rgba(255,255,255,0.93)'
                    transform={`rotate(${lRot} ${lPos.x} ${lPos.y})`}
                    style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.15)', strokeWidth: 2 }}
                  >
                    {`${item.value}`.slice(0, fs <= 9 ? 5 : 7)}
                  </text>
                </g>
              )
            })}

            {/* Hub */}
            <circle cx={center} cy={center} r={24} fill='white' />
            <circle cx={center} cy={center} r={18} fill='var(--brand-primary)' />
          </svg>

          <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
            <Sparkles className='w-4 h-4 text-white drop-shadow' />
          </div>
        </div>
      </div>

      {/* Spin button */}
      <div className='mt-7 w-full max-w-xs px-4'>
        <button
          onClick={handleSpin}
          disabled={isSpinning || isPlaying || !canPlay}
          className='w-full py-[18px] relative overflow-hidden rounded-2xl text-white font-bold text-base tracking-wide uppercase transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95'
          style={{
            background: !canPlay
              ? '#94a3b8'
              : 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))',
            boxShadow: canPlay
              ? '0 6px 20px color-mix(in srgb, var(--brand-primary) 45%, transparent)'
              : 'none',
          }}
        >
          <div className='absolute inset-0 bg-white/20 -translate-y-full hover:translate-y-0 transition-transform duration-300' />
          <div className='relative flex items-center justify-center gap-2.5'>
            {isSpinning ? (
              <>
                <Loader2 className='w-5 h-5 animate-spin' />
                <span>Spinning...</span>
              </>
            ) : !canPlay ? (
              <span>Come Back Later!</span>
            ) : (
              <>
                <RefreshCcw className='w-5 h-5' />
                <span>Spin Now</span>
              </>
            )}
          </div>
        </button>

        {canPlay && spinState === 'idle' && (
          <p className='text-center text-xs text-slate-400 mt-3 font-medium'>
            Tap to reveal your prize 🍀
          </p>
        )}
      </div>
    </div>
  )
}

export default SpinWheel
