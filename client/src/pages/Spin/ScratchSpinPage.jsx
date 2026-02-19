// File: client/src/pages/Spin/ScratchSpinPage.jsx  — PWA-Native Edition
import SlideReveal from '@/components/Games/SlideReveal'
import SpinWheel from '@/components/Games/SpinWheel'
import { useBranding } from '@/context/BrandingContext'
import { useAvailableGames, usePlayGame } from '@/hooks/useGameWheel'
import confetti from 'canvas-confetti'
import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion'
import {
    ChevronRight, Clock, Coins, Crown, Gift,
    Heart, MapPin, RefreshCcw, Sparkles, Star, Trophy,
} from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import Layout from '../Layout/Layout'

// ─── Haptic helper ──────────────────────────────────────────────────────────
const haptic = (pattern = [10]) => {
  try { navigator?.vibrate?.(pattern) } catch {}
}

const ScratchSpinPage = () => {
  const [activeGame, setActiveGame] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [gameResult, setGameResult] = useState(null)

  const { currentUser } = useSelector((state) => state.user)
  const { branding } = useBranding()
  const brandColor = branding?.themeColor || '#ec4899'
  const brandColorDark = (() => {
    const c = brandColor.replace('#', '')
    if (c.length !== 6) return '#b0164e'
    const n = parseInt(c, 16)
    const r = Math.max(0, ((n >> 16) & 255) - 30)
    const g = Math.max(0, ((n >> 8) & 255) - 30)
    const b = Math.max(0, (n & 255) - 30)
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  })()

  useEffect(() => {
    if (!currentUser) return
    if (currentUser.role && currentUser.role !== 'user') {
      window.location.href = '/management/spin'
    }
  }, [currentUser])

  const { data: gamesData, isLoading, refetch } = useAvailableGames()

  const playGameMutation = usePlayGame({
    onSuccess: () => { refetch() },
    onError: (error) => {
      toast.error('Game Error', {
        description: error.response?.data?.message || 'Failed to play game.',
      })
    },
  })

  const handlePlayGame = useCallback(async (gameId) => {
    return await playGameMutation.mutateAsync(gameId)
  }, [playGameMutation])

  const handleAnimationComplete = useCallback((result) => {
    setGameResult(result)
    setShowResult(true)
  }, [])

  const closeResult = () => {
    haptic([15])
    setShowResult(false)
    setGameResult(null)
    setActiveGame(null)
  }

  if (isLoading) {
    return (
      <Layout>
        <div className='min-h-screen bg-[#fafbfc] flex items-center justify-center'>
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
            className='w-14 h-14 rounded-[20px] flex items-center justify-center shadow-lg'
            style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColorDark})` }}
          >
            <Heart className='w-7 h-7 text-white fill-white' />
          </motion.div>
        </div>
      </Layout>
    )
  }

  const games = gamesData?.games || []
  const location = gamesData?.location
  const spinGame = games.find((g) => g.type === 'spin')
  const scratchGame = games.find((g) => g.type === 'scratch')

  return (
    <Layout>
      <div
        className='relative flex flex-col overflow-hidden'
        style={{
          height: 'calc(100vh - 53px)',
          ['--brand']: brandColor,
          ['--brand-dark']: brandColorDark,
          ['--brand-primary']: brandColor,
          ['--brand-primary-dark']: brandColorDark,
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Subtle ambient gradient */}
        <div
          className='absolute inset-0 pointer-events-none'
          style={{
            background: `radial-gradient(ellipse 80% 50% at 50% -10%, color-mix(in srgb, ${brandColor} 12%, transparent), transparent 70%)`,
          }}
        />

        <div className='flex-1 overflow-y-auto overscroll-contain' style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className='max-w-lg mx-auto px-4 pt-5 pb-28 flex flex-col gap-5'>

            {/* ── Top bar ─────────────────────────────────── */}
            <div className='flex items-center justify-between'>
              <div>
                <div className='flex items-center gap-1.5'>
                  <Sparkles className='w-3 h-3' style={{ color: brandColor }} />
                  <span className='text-[9px] font-black uppercase tracking-[0.25em]' style={{ color: brandColor }}>
                    Daily Arena
                  </span>
                </div>
                <h1 className='text-2xl font-black text-slate-900 tracking-tight leading-none mt-0.5'>
                  Lucky Rewards
                </h1>
                {location && (
                  <div className='flex items-center gap-1 mt-1'>
                    <MapPin className='w-2.5 h-2.5 text-slate-400' />
                    <span className='text-[10px] font-semibold text-slate-400 uppercase tracking-wider'>
                      {location.locationName}
                    </span>
                  </div>
                )}
              </div>

              {currentUser && (
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  className='flex items-center gap-2 px-4 py-2.5 rounded-2xl'
                  style={{ background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(12px)' }}
                >
                  <Coins className='w-4 h-4 text-yellow-400' />
                  <div>
                    <div className='text-[8px] font-black text-white/40 uppercase leading-none'>Points</div>
                    <motion.div
                      key={currentUser.points}
                      initial={{ y: -8, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className='text-sm font-black text-white leading-tight'
                    >
                      {(currentUser.points || 0).toLocaleString()}
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* ── Hero Banner ──────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className='relative rounded-[28px] overflow-hidden p-6 text-white'
              style={{
                background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColorDark} 100%)`,
                boxShadow: `0 12px 40px color-mix(in srgb, ${brandColor} 35%, transparent)`,
              }}
            >
              {/* Background glow blobs */}
              <div className='absolute -top-8 -right-8 w-40 h-40 rounded-full blur-3xl bg-white/15' />
              <div className='absolute -bottom-6 -left-6 w-32 h-32 rounded-full blur-2xl bg-white/10' />

              <div className='relative z-10'>
                <div className='flex items-center gap-2 mb-2'>
                  <Crown className='w-5 h-5 text-yellow-300 fill-yellow-300' />
                  <span className='text-[10px] font-black uppercase tracking-[0.2em] opacity-80'>Premium Player</span>
                </div>
                <h2 className='text-2xl font-black leading-snug mb-2'>Ready to Reveal<br />Your Luck?</h2>
                <p className='text-white/75 text-xs font-medium leading-relaxed max-w-[240px]'>
                  Spin or scratch to unlock spa treatments, credits, and bonus points daily.
                </p>
              </div>
            </motion.div>

            {/* ── Game Cards ───────────────────────────────── */}
            {games.length === 0 ? (
              <div className='bg-white rounded-[24px] p-10 text-center border border-slate-100 shadow-sm'>
                <Heart className='w-10 h-10 text-slate-100 mx-auto mb-3' />
                <h3 className='text-sm font-black text-slate-700 uppercase tracking-widest'>No Active Games</h3>
                <p className='text-xs text-slate-400 mt-1'>Check back tomorrow!</p>
              </div>
            ) : (
              <div className='flex flex-col gap-3'>
                {spinGame && (
                  <GameCard
                    game={spinGame}
                    title='Spin Wheel'
                    subtitle='Spin to win daily rewards'
                    icon='spin'
                    brandColor={brandColor}
                    onPlay={() => { haptic([8]); setActiveGame(spinGame) }}
                  />
                )}
                {scratchGame && (
                  <GameCard
                    game={scratchGame}
                    title='Scratch Card'
                    subtitle='Reveal secret mystery prizes'
                    icon='scratch'
                    brandColor={brandColor}
                    onPlay={() => { haptic([8]); setActiveGame(scratchGame) }}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Game / Result Modals ─────────────────────────────────────────── */}
        <AnimatePresence>
          {activeGame && !showResult && (
            <NativeBottomSheet
              key='game-sheet'
              onClose={() => { haptic([15]); setActiveGame(null); setGameResult(null) }}
            >
              <GameContent
                game={activeGame}
                onPlay={handlePlayGame}
                onAnimationComplete={handleAnimationComplete}
              />
            </NativeBottomSheet>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showResult && gameResult && (
            <NativeBottomSheet
              key='result-sheet'
              onClose={closeResult}
              tall
            >
              <ResultContent
                result={gameResult}
                brandColor={brandColor}
                brandColorDark={brandColorDark}
                onClose={closeResult}
              />
            </NativeBottomSheet>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  )
}

// ─── Game Card ─────────────────────────────────────────────────────────────
const GameCard = ({ game, title, subtitle, icon, brandColor, onPlay }) => {
  const canPlay = game.eligibility?.canPlay ?? true
  const playsLeft = game.eligibility?.playsRemaining ?? 0

  return (
    <motion.button
      whileTap={canPlay ? { scale: 0.97 } : {}}
      onClick={canPlay ? onPlay : undefined}
      className='w-full text-left relative overflow-hidden rounded-[24px] border bg-white p-5 transition-all duration-200'
      style={{
        opacity: canPlay ? 1 : 0.55,
        cursor: canPlay ? 'pointer' : 'default',
        borderColor: canPlay ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.06)',
        boxShadow: canPlay
          ? '0 4px 20px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)'
          : 'none',
      }}
    >
      <div className='flex items-center gap-4'>
        {/* Icon */}
        <div
          className='w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0'
          style={{
            background: `color-mix(in srgb, ${brandColor} 10%, transparent)`,
            color: brandColor,
          }}
        >
          {icon === 'spin'
            ? <RefreshCcw className='w-7 h-7' />
            : <Star className='w-7 h-7 fill-current' />
          }
        </div>

        {/* Text */}
        <div className='flex-1 min-w-0'>
          <div className='font-black text-slate-900 text-[15px] leading-tight'>{title}</div>
          <div className='text-slate-400 text-xs font-medium mt-0.5 truncate'>{subtitle}</div>
        </div>

        {/* Status */}
        {canPlay ? (
          <div className='flex flex-col items-end gap-2 flex-shrink-0'>
            <div className='flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-full'>
              <div className='w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse' />
              <span className='text-[10px] font-black text-emerald-600 uppercase'>
                {playsLeft} left
              </span>
            </div>
            <div
              className='w-9 h-9 rounded-full flex items-center justify-center shadow-md'
              style={{ background: 'rgb(15,23,42)' }}
            >
              <ChevronRight className='w-5 h-5 text-white' />
            </div>
          </div>
        ) : (
          <div className='w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0'>
            <Clock className='w-5 h-5 text-slate-300' />
          </div>
        )}
      </div>
    </motion.button>
  )
}

// ─── Native Bottom Sheet ───────────────────────────────────────────────────
const NativeBottomSheet = ({ children, onClose, tall }) => {
  const y = useMotionValue(0)
  const opacity = useTransform(y, [0, 300], [1, 0])
  const bgOpacity = useTransform(y, [0, 200], [0.6, 0])

  const handleDragEnd = (_, info) => {
    if (info.offset.y > 80 || info.velocity.y > 400) {
      haptic([15])
      onClose()
    }
  }

  return (
    <div className='fixed inset-0 z-50 flex items-end justify-center'>
      {/* Backdrop */}
      <motion.div
        className='absolute inset-0 bg-slate-900'
        style={{ opacity: bgOpacity }}
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      />

      {/* Sheet */}
      <motion.div
        drag='y'
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        onDragEnd={handleDragEnd}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
        className={`relative w-full bg-white rounded-t-[32px] shadow-2xl overflow-hidden ${tall ? 'max-h-[92vh]' : 'max-h-[88vh]'}`}
        style={{ y, opacity, touchAction: 'none', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Drag handle */}
        <div className='flex justify-center pt-3 pb-1'>
          <div className='w-10 h-1 bg-slate-200 rounded-full' />
        </div>

        <div className='overflow-y-auto' style={{ maxHeight: tall ? '88vh' : '85vh', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
          {children}
        </div>
      </motion.div>
    </div>
  )
}

// ─── Game Content (inside bottom sheet) ────────────────────────────────────
const GameContent = ({ game, onPlay, onAnimationComplete }) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const resultRef = useRef(null)

  const handlePlay = async (gameId) => {
    setIsPlaying(true)
    try {
      const response = await onPlay(gameId)
      resultRef.current = response?.data || response
      return response
    } catch (err) {
      setIsPlaying(false)
      throw err
    }
  }

  const handleComplete = () => {
    setIsPlaying(false)
    if (resultRef.current) {
      onAnimationComplete(resultRef.current)
    }
  }

  return (
    <div className='px-6 pb-8 pt-2'>
      <div className='text-center mb-6'>
        <h2 className='text-xl font-black text-slate-900'>
          {game.type === 'spin' ? '🎡 Spin Wheel' : '🎴 Scratch Card'}
        </h2>
        <p className='text-xs text-slate-400 font-bold uppercase tracking-[0.2em] mt-1'>Win Amazing Rewards</p>
      </div>

      {game.type === 'spin' ? (
        <SpinWheel
          game={game}
          onPlay={() => handlePlay(game.id || game._id)}
          isPlaying={isPlaying}
          canPlay={true}
          onComplete={handleComplete}
        />
      ) : (
        <SlideReveal
          game={game}
          onPlay={() => handlePlay(game.id || game._id)}
          isPlaying={isPlaying}
          canPlay={true}
          onComplete={handleComplete}
        />
      )}
    </div>
  )
}

// ─── Result Content (inside bottom sheet) ──────────────────────────────────
const ResultContent = ({ result, brandColor, brandColorDark, onClose }) => {
  const winningItem = result?.result?.winningItem
  const expiresAt = result?.result?.expiresAt
  const newBalance = result?.result?.newPointsBalance

  const expiryLabel = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  // 🎉 Confetti burst on mount
  useEffect(() => {
    haptic([20, 30, 50, 30, 20])
    const colors = [brandColor, brandColorDark, '#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#fff']
    const end = Date.now() + 2200

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 60,
        startVelocity: 58,
        origin: { x: 0.05, y: 0.7 },
        colors,
        ticks: 220,
        scalar: 1.15,
        gravity: 0.85,
        shapes: ['circle', 'square'],
      })
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 60,
        startVelocity: 58,
        origin: { x: 0.95, y: 0.7 },
        colors,
        ticks: 220,
        scalar: 1.15,
        gravity: 0.85,
        shapes: ['circle', 'square'],
      })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
  }, [brandColor, brandColorDark])

  return (
    <div className='px-6 pb-10 pt-3 text-center'>
      {/* Trophy */}
      <motion.div
        initial={{ scale: 0, rotate: -15 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
        className='w-24 h-24 rounded-[32px] flex items-center justify-center mx-auto mb-5 shadow-2xl'
        style={{
          background: `linear-gradient(135deg, ${brandColor}, ${brandColorDark})`,
          boxShadow: `0 16px 40px color-mix(in srgb, ${brandColor} 40%, transparent)`,
        }}
      >
        <Trophy className='w-12 h-12 text-white' />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h2 className='text-3xl font-black text-slate-900 tracking-tighter'>You Won!</h2>
        <p className='text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mt-1 mb-6'>Your daily prize 🎁</p>
      </motion.div>

      {/* Prize box */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.28, type: 'spring', stiffness: 220, damping: 20 }}
        className='rounded-[28px] px-8 py-9 mb-5 relative overflow-hidden'
        style={{ background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', border: '1.5px solid rgba(0,0,0,0.05)' }}
      >
        <Sparkles className='absolute top-3 left-4 w-5 h-5 opacity-15' style={{ color: brandColor }} />
        <Sparkles className='absolute bottom-3 right-4 w-5 h-5 opacity-15' style={{ color: brandColor }} />

        {winningItem ? (
          <>
            <div
              className='text-xs font-black uppercase tracking-widest mb-2'
              style={{ color: brandColor }}
            >
              {winningItem.title}
            </div>
            <div className='text-5xl font-black text-slate-900 tracking-tighter'>
              {winningItem.value}
            </div>
            <div className='mt-2 text-xs font-bold text-slate-400 uppercase tracking-[0.2em]'>
              {winningItem.valueType}
            </div>
            {expiryLabel && (
              <div className='mt-2 text-[11px] text-slate-400 font-semibold'>
                Expires {expiryLabel}
              </div>
            )}
          </>
        ) : (
          <div className='text-slate-400 text-sm font-bold'>Loading reward...</div>
        )}
      </motion.div>

      {/* Balance */}
      {typeof newBalance === 'number' && (
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
          className='text-xs text-slate-400 font-semibold mb-5'
        >
          New balance: <span className='font-black text-slate-700'>{newBalance.toLocaleString()} pts</span>
        </motion.p>
      )}

      {/* CTA */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.38 }}
        whileTap={{ scale: 0.97 }}
        onClick={onClose}
        className='w-full py-5 text-white rounded-[24px] font-black text-base shadow-xl transition-all cursor-pointer'
        style={{
          background: `linear-gradient(135deg, ${brandColor}, ${brandColorDark})`,
          boxShadow: `0 8px 24px color-mix(in srgb, ${brandColor} 40%, transparent)`,
        }}
      >
        Collect Reward 🎉
      </motion.button>
    </div>
  )
}

export default ScratchSpinPage
