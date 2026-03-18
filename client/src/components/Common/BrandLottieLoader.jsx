import React, { useEffect, useRef } from 'react'
import { useBranding } from '@/context/BrandingContext'
import { motion, useReducedMotion } from 'framer-motion'

const Motion = motion

const BrandLottieLoader = ({
  compact = false,
  className = '',
}) => {
  const lottieRef = useRef(null)
  const reduceMotion = useReducedMotion()
  const { branding } = useBranding()
  const spaName = branding?.name?.trim()
  const spaSubtitle = branding?.subtitle?.trim() || branding?.tagline?.trim() || ''
  const showSpaMeta = Boolean(spaName && spaName.toLowerCase() !== 'radiantai')

  useEffect(() => {
    const container = lottieRef.current
    if (!container || typeof window === 'undefined' || !window.lottie) return

    const animation = window.lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: '/Dermatologist.json',
    })

    return () => {
      animation.destroy()
    }
  }, [])

  const reveal = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.45, ease: [0.25, 1, 0.5, 1] },
      }

  return (
    <Motion.div
      {...reveal}
      className={`relative flex h-full w-full flex-col items-center justify-center overflow-hidden ${compact ? 'min-h-[32vh]' : 'min-h-[56vh]'} ${className}`}
    >
      <div className='pointer-events-none absolute -top-24 h-56 w-56 rounded-full bg-[color:var(--brand-primary)/0.12] blur-3xl' />
      <div className='pointer-events-none absolute -bottom-24 h-56 w-56 rounded-full bg-[color:var(--brand-primary)/0.09] blur-3xl' />

      <Motion.div
        {...(reduceMotion
          ? {}
          : {
              initial: { opacity: 0, scale: 0.95 },
              animate: { opacity: 1, scale: 1 },
              transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
            })}
        ref={lottieRef}
        className={compact ? 'h-36 w-36 sm:h-40 sm:w-40' : 'h-52 w-52 sm:h-64 sm:w-64'}
      />

      {showSpaMeta && (
        <Motion.div
          {...(reduceMotion
            ? {}
            : {
                initial: { opacity: 0, y: 8 },
                animate: { opacity: 1, y: 0 },
                transition: { duration: 0.4, delay: 0.08, ease: [0.25, 1, 0.5, 1] },
              })}
          className='mt-1.5 text-center'
        >
          <h3 className='text-[clamp(1rem,1.2vw,1.35rem)] font-medium tracking-[-0.012em] text-slate-900'>
            {spaName}
          </h3>
          {spaSubtitle && (
            <p className='mt-1 text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500'>
              {spaSubtitle}
            </p>
          )}
        </Motion.div>
      )}

      <Motion.div
        {...(reduceMotion
          ? {}
          : {
              initial: { opacity: 0, y: 6 },
              animate: { opacity: 1, y: 0 },
              transition: { duration: 0.35, delay: 0.14, ease: [0.22, 1, 0.36, 1] },
            })}
        className='mt-3 w-[min(92vw,22rem)] px-1'
      >
        <div className='mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500'>
          Preparing your experience
        </div>

        <div className='mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100'>
          <Motion.div
            {...(reduceMotion
              ? { initial: false, animate: { width: '45%' } }
              : {
                  initial: { x: '-120%' },
                  animate: { x: '230%' },
                  transition: { duration: 1.7, repeat: Infinity, ease: [0.22, 1, 0.36, 1] },
                })}
            className='h-full w-[42%] rounded-full bg-[color:var(--brand-primary)]'
          />
        </div>
      </Motion.div>
    </Motion.div>
  )
}

export default BrandLottieLoader
