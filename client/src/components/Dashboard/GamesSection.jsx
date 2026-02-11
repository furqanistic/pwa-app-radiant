// File: client/src/components/Dashboard/GamesSection.jsx
import SlideReveal from '@/components/Games/SlideReveal'
import SpinWheel from '@/components/Games/SpinWheel'
import { useBranding } from '@/context/BrandingContext'
import { useAvailableGames, usePlayGame } from '@/hooks/useGameWheel'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Clock,
  Coins,
  Dices,
  Gift,
  Loader2,
  PartyPopper,
  RefreshCw,
  Sparkles,
  Ticket,
  Trophy,
  Zap,
} from 'lucide-react'
import React, { useState } from 'react'
import { toast } from 'sonner'

// Compact Game Card for Dashboard
const CompactGameCard = ({ game, title, icon, onPlay, canPlay, brandColor, brandColorDark }) => {
  const playsRemaining = game.eligibility?.playsRemaining ?? 0
  const nextReset = game.eligibility?.nextReset

  const formatResetTime = (resetTime) => {
    if (!resetTime) return ''
    const now = new Date()
    const reset = new Date(resetTime)
    const diffHours = Math.ceil((reset - now) / (1000 * 60 * 60))

    if (diffHours <= 1) return '< 1h'
    if (diffHours < 24) return `${diffHours}h`
    const diffDays = Math.ceil(diffHours / 24)
    return `${diffDays}d`
  }

  return (
    <motion.div
      layout
      whileHover={canPlay ? { y: -3 } : {}}
      whileTap={canPlay ? { scale: 0.98 } : {}}
      onClick={canPlay ? onPlay : undefined}
      className={`relative group overflow-hidden rounded-[2rem] p-4 sm:p-5 transition-all duration-300 border ${
        canPlay
          ? 'bg-white border-gray-200/70 hover:border-[color:var(--brand-primary)/0.35] hover:shadow-xl hover:shadow-[color:var(--brand-primary)/0.12] cursor-pointer'
          : 'bg-gray-50 border-gray-200/60 opacity-70 cursor-not-allowed grayscale'
      }`}
      style={{
        ['--brand-primary']: brandColor,
        ['--brand-dark']: brandColorDark,
      }}
    >
      <div className='absolute inset-0 bg-[url("https://www.transparenttextures.com/patterns/cubes.png")] opacity-[0.03] mix-blend-overlay pointer-events-none' />
      {/* Background Glow */}
      <div
        className="absolute -right-4 -top-4 w-16 h-16 blur-2xl rounded-full opacity-20 pointer-events-none transition-transform duration-500 group-hover:scale-150"
        style={{
          background: game.type === 'spin' ? 'var(--brand-primary)' : 'var(--brand-dark)',
        }}
      />

      <div className='flex items-center gap-3'>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition-transform duration-300 bg-[radial-gradient(120%_120%_at_20%_0%,var(--brand-primary),var(--brand-dark))]"
        >
          {React.cloneElement(icon, { className: 'w-6 h-6 text-white' })}
        </div>
        
        <div className='flex-1 min-w-0'>
          <h3 className='text-base font-black text-gray-800 truncate tracking-tight leading-tight'>
            {title}
          </h3>
          <div className='flex items-center gap-2 mt-1'>
            {canPlay ? (
              <div className='flex items-center gap-1.5'>
                <div className='w-2 h-2 bg-[color:var(--brand-primary)] rounded-full animate-pulse shadow-[0_0_8px_rgba(0,0,0,0.15)]'></div>
                <span className='text-[10px] font-black uppercase tracking-widest text-[color:var(--brand-primary)]/80'>
                   {playsRemaining > 0 ? `${playsRemaining} Left` : 'Active'}
                </span>
              </div>
            ) : (
              <div className='flex items-center gap-1.5'>
                <Clock className='w-3 h-3 text-gray-400' />
                <span className='text-[10px] font-black uppercase tracking-widest text-gray-400'>
                   Ends in {formatResetTime(nextReset)}
                </span>
              </div>
            )}
          </div>
        </div>

        <motion.div
           initial={false}
           animate={canPlay ? { x: 0, opacity: 1 } : { x: 5, opacity: 0.5 }}
          className={`p-1.5 rounded-lg flex items-center justify-center ${
            canPlay ? 'bg-white/80 text-[color:var(--brand-primary)] shadow-sm' : 'bg-gray-100 text-gray-400'
           }`}
        >
          <Zap className={`w-3.5 h-3.5 ${canPlay ? 'text-[color:var(--brand-primary)] fill-[color:var(--brand-primary)]' : ''}`} />
        </motion.div>
      </div>

      {!canPlay && (
        <div className='absolute inset-0 bg-white/10 backdrop-blur-[1px] pointer-events-none'></div>
      )}
    </motion.div>
  )
}

// Game Result Modal
const GameResultModal = ({ result, onClose, brandColor, brandColorDark }) => {
  const winningItem = result.result.winningItem
  const isPointsPrize = winningItem.valueType === 'points'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className='fixed inset-0 bg-black/5 flex items-center justify-center z-[70] px-4'
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, y: 40, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.8, y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className='bg-white rounded-[40px] p-8 sm:p-10 max-w-sm w-full text-center border border-gray-200/70 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] relative overflow-hidden'
        onClick={(e) => e.stopPropagation()}
        style={{
          ['--brand-primary']: brandColor,
          ['--brand-dark']: brandColorDark,
        }}
      >
        {/* Animated Background Confetti */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
           {[...Array(15)].map((_, i) => (
             <motion.div
               key={i}
               initial={{ y: -20, x: Math.random() * 100 + '%', opacity: 0 }}
               animate={{ 
                 y: '120%', 
                 opacity: [0, 1, 0],
                 rotate: [0, 360],
               }}
               transition={{ 
                 duration: 3 + Math.random() * 2, 
                 repeat: Infinity,
                 delay: Math.random() * 2
               }}
               className="absolute w-2 h-2 rounded-full"
               style={{
                 backgroundColor: i % 2 === 0 ? 'var(--brand-primary)' : 'var(--brand-dark)',
               }}
             />
           ))}
        </div>

        <div className="relative z-10">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-[32px] flex items-center justify-center mx-auto mb-6 shadow-2xl bg-[radial-gradient(120%_120%_at_20%_0%,var(--brand-primary),var(--brand-dark))]"
          >
            {isPointsPrize ? (
              <Coins className='w-10 h-10 sm:w-12 sm:h-12 text-white' />
            ) : (
              <Trophy className='w-10 h-10 sm:w-12 sm:h-12 text-white' />
            )}
          </motion.div>

          <h2 className='text-3xl sm:text-4xl font-black text-slate-900 mb-2 tracking-tight'>
            BINGO! 🎁
          </h2>
          <p className='text-slate-400 mb-6 text-sm font-bold uppercase tracking-widest'>
            Your Mystery Prize
          </p>

          <div className='bg-gradient-to-br from-[color:var(--brand-primary)/0.08] via-white to-[color:var(--brand-primary)/0.04] rounded-[32px] p-6 sm:p-8 mb-8 border border-gray-200/70 relative overflow-hidden group'>
            <Sparkles className='absolute top-4 left-4 w-6 h-6 text-[color:var(--brand-primary)]/40 opacity-60 group-hover:scale-125 transition-transform' />
            <Sparkles className='absolute bottom-4 right-4 w-6 h-6 text-[color:var(--brand-primary)]/40 opacity-60 group-hover:scale-125 transition-transform' />
            
            <h3 className='text-xs sm:text-sm font-black text-[color:var(--brand-primary)] uppercase tracking-widest mb-2'>
              {winningItem.title}
            </h3>
            <div className='text-4xl sm:text-5xl font-black text-slate-900 tracking-tighter mb-1'>
              {winningItem.value}
            </div>
            {result.result.newPointsBalance !== undefined && (
              <div className='mt-4 pt-4 border-t border-slate-200 flex items-center justify-center gap-2'>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">New Balance:</span>
                <span className="text-sm font-black text-[color:var(--brand-primary)]">{result.result.newPointsBalance} pts</span>
              </div>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={(e) => {
              e.preventDefault()
              onClose()
            }}
            className='w-full py-5 text-white rounded-[28px] font-black shadow-xl shadow-slate-200 transition-all cursor-pointer relative z-20 bg-[radial-gradient(120%_120%_at_20%_0%,var(--brand-primary),var(--brand-dark))] hover:brightness-105'
          >
            Claim Reward
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Game Play Modal - Enhanced with new components
const GamePlayModal = ({
  game,
  onClose,
  onPlay,
  isPlaying,
  gameResult,
  showResult,
  setShowResult,
  brandColor,
  brandColorDark,
  onAnimationComplete,
}) => {
   const canPlay = game.eligibility?.canPlay ?? true
   const playsRemaining = game.eligibility?.playsRemaining ?? 0
   const resetPeriod = game.eligibility?.resetPeriod
   
   const formatResetPeriod = (period) => {
    switch (period) {
      case 'daily': return 'daily'
      case 'weekly': return 'weekly'
      case 'monthly': return 'monthly'
      case 'never': return 'unlimited'
      default: return period
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50 px-4 pb-4'
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          className='bg-white rounded-2xl w-full max-w-sm max-h-[90vh] overflow-hidden border border-gray-200/70'
          onClick={(e) => e.stopPropagation()}
          style={{
            ['--brand-primary']: brandColor,
            ['--brand-dark']: brandColorDark,
          }}
        >
          <div className='flex justify-center pt-3 pb-2'>
            <div className='w-12 h-1 bg-[color:var(--brand-primary)/0.25] rounded-full'></div>
          </div>

          <div className='px-6 py-5 border-b border-gray-200/70 flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='bg-[radial-gradient(120%_120%_at_20%_0%,var(--brand-primary),var(--brand-dark))] p-2.5 rounded-xl shadow-lg shadow-[color:var(--brand-primary)/0.2]'>
                {game.type === 'spin' ? <Zap className='w-5 h-5 text-white' /> : <Gift className='w-5 h-5 text-white' />}
              </div>
              <div>
                <h2 className='text-xl font-black text-gray-900 tracking-tight'>
                  {game.type === 'spin' ? 'Lucky Spin' : 'Scratch Cards'}
                </h2>
                <p className='text-[10px] font-bold text-gray-400 uppercase tracking-widest'>
                  {game.type === 'spin' ? 'Test your luck' : 'Scratch to reveal'}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className='p-2 hover:bg-[color:var(--brand-primary)/0.08] rounded-xl transition-colors'
            >
              <Loader2 className={`w-5 h-5 text-gray-400 ${isPlaying ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
           {/* Play Limit Display */}
            {canPlay && playsRemaining > 0 && (
              <div className='px-4 py-2 bg-[color:var(--brand-primary)/0.08] border-b border-[color:var(--brand-primary)/0.2]'>
                <div className='text-center text-[color:var(--brand-primary)] text-xs'>
                  {playsRemaining} plays remaining ({formatResetPeriod(resetPeriod)} limit)
                </div>
              </div>
            )}

          <div className='p-4'>
            {game.type === 'spin' ? (
              <SpinWheel
                game={game}
                onPlay={() => onPlay(game.id || game._id)}
                isPlaying={isPlaying}
                canPlay={canPlay}
                onComplete={onAnimationComplete}
              />
            ) : (
              <SlideReveal
                game={game}
                onPlay={() => onPlay(game.id || game._id)}
                isPlaying={isPlaying}
                canPlay={canPlay}
                result={gameResult}
                onComplete={onAnimationComplete}
              />
            )}
          </div>

          <div className='p-4 border-t border-gray-200/70'>
            <button
              onClick={onClose}
              className='w-full py-2 bg-[color:var(--brand-primary)/0.1] text-[color:var(--brand-primary)] rounded-lg font-semibold hover:bg-[color:var(--brand-primary)/0.16] transition-all'
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showResult && gameResult && (
          <GameResultModal
            result={gameResult}
            onClose={() => {
              setShowResult(false)
              onClose()
            }}
            brandColor={brandColor}
            brandColorDark={brandColorDark}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// Main Component
const GamesSection = () => {
  const [activeGame, setActiveGame] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [gameResult, setGameResult] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isAnimationComplete, setIsAnimationComplete] = useState(false)
  const { branding } = useBranding()
  const brandColor = branding?.themeColor || '#ec4899'
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
  const toastStyle = {
    style: {
      background: `linear-gradient(90deg, ${brandColor}, ${brandColorDark})`,
      color: '#fff',
      border: 'none',
    },
  }

  const { data: gamesData, isLoading, isFetching, error, refetch } =
    useAvailableGames()

  const playGameMutation = usePlayGame({
    onSuccess: (data) => {
      setGameResult(data.data)
      setIsPlaying(false)
      refetch()

      toast.success('Congratulations!', {
        description: `You won: ${data.data.result.winningItem.title}!`,
        duration: 4000,
        ...toastStyle,
      })

      // Only show result immediately if animation already finished (fallback)
      if (isAnimationComplete) {
        setShowResult(true)
      }
    },
    onError: (error) => {
      setIsPlaying(false)
      toast.error('Game Error', {
        description:
          error.response?.data?.message || 'Failed to play game. Try again.',
        duration: 4000,
        ...toastStyle,
      })
    },
  })

  const handlePlayGame = async (gameId) => {
    setIsPlaying(true)
    try {
      setGameResult(null)
      setShowResult(false)
      setIsAnimationComplete(false)
      await playGameMutation.mutateAsync(gameId)
    } catch (error) {
      setIsPlaying(false)
    }
  }

  const games = gamesData?.games || []
  const spinGame = games.find((game) => game.type === 'spin')
  const scratchGame = games.find((game) => game.type === 'scratch')

  const isInitialLoading = (isLoading || isFetching) && !gamesData

  if (isInitialLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className='bg-white rounded-2xl sm:rounded-3xl border border-gray-200/70 p-4 sm:p-6'
        style={{
          ['--brand-primary']: brandColor,
          ['--brand-dark']: brandColorDark,
        }}
      >
        <div className='animate-pulse'>
          <div className='h-6 bg-[color:var(--brand-primary)/0.2] rounded w-32 mb-4'></div>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4'>
            <div className='h-24 bg-[color:var(--brand-primary)/0.12] rounded-xl'></div>
            <div className='h-24 bg-[color:var(--brand-primary)/0.12] rounded-xl'></div>
          </div>
        </div>
      </motion.div>
    )
  }

  if (!spinGame && !scratchGame) {
    return null
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className='relative overflow-hidden bg-gradient-to-br from-[color:var(--brand-primary)/0.12] via-white to-[color:var(--brand-primary)/0.04] rounded-[2rem] border border-gray-200/70 p-5 sm:p-6 shadow-xl shadow-[color:var(--brand-primary)/0.12] group'
        style={{
          ['--brand-primary']: brandColor,
          ['--brand-dark']: brandColorDark,
        }}
      >
        <div className='absolute inset-0 bg-[url("https://www.transparenttextures.com/patterns/cubes.png")] opacity-[0.03] mix-blend-overlay pointer-events-none' />
        {/* Decorative elements */}
        <div className='absolute -right-20 -top-20 w-64 h-64 bg-[color:var(--brand-primary)/0.18] rounded-full blur-[100px] pointer-events-none group-hover:bg-[color:var(--brand-primary)/0.28] transition-colors duration-700'></div>
        <div className='absolute -left-20 -bottom-20 w-64 h-64 bg-[color:var(--brand-primary)/0.16] rounded-full blur-[100px] pointer-events-none group-hover:bg-[color:var(--brand-primary)/0.24] transition-colors duration-700'></div>

        <div className='relative z-10 flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3'>
          <div className='flex items-center gap-3'>
            <div className='bg-[radial-gradient(120%_120%_at_20%_0%,var(--brand-primary),var(--brand-dark))] p-3 rounded-xl shadow-lg shadow-[color:var(--brand-primary)/0.2]'>
              <Dices className='w-5 h-5 text-white' />
            </div>
            <div>
              <h2 className='text-xl sm:text-2xl font-black text-gray-800 tracking-tight'>
                Lucky Games
              </h2>
              <p className='text-[10px] text-gray-500 font-medium'>
                Win mystery prizes daily
              </p>
            </div>
          </div>
          <div className='flex items-center gap-2 self-end sm:self-auto'>
            <button
              onClick={() => refetch()}
              className={`text-[color:var(--brand-primary)] p-2 rounded-xl bg-white/50 backdrop-blur-sm border border-gray-200/70 hover:bg-[color:var(--brand-primary)/0.08] transition-all ${isFetching ? 'opacity-50' : ''}`}
            >
              <RefreshCw
                className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`}
              />
            </button>
            <button
              onClick={() => (window.location.href = '/spin')}
              className='bg-[radial-gradient(120%_120%_at_20%_0%,var(--brand-primary),var(--brand-dark))] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all hover:scale-105 flex items-center gap-2'
            >
              Full Games
              <Trophy className='w-3 h-3 text-white/80' />
            </button>
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10'>
          {spinGame && (
            <CompactGameCard
              game={spinGame}
              title='Lucky Spin'
              icon={<PartyPopper />}
              onPlay={() => setActiveGame(spinGame)}
              canPlay={spinGame.eligibility?.canPlay ?? true}
              brandColor={brandColor}
              brandColorDark={brandColorDark}
            />
          )}

          {scratchGame && (
            <CompactGameCard
              game={scratchGame}
              title='Scratch Cards'
              icon={<Ticket />}
              onPlay={() => setActiveGame(scratchGame)}
              canPlay={scratchGame.eligibility?.canPlay ?? true}
              brandColor={brandColor}
              brandColorDark={brandColorDark}
            />
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {activeGame && (
          <GamePlayModal
            game={activeGame}
            onClose={() => setActiveGame(null)}
            onPlay={handlePlayGame}
            isPlaying={isPlaying}
            gameResult={gameResult}
            showResult={showResult}
            setShowResult={setShowResult}
            brandColor={brandColor}
            brandColorDark={brandColorDark}
            onAnimationComplete={() => {
              setIsAnimationComplete(true)
              if (gameResult) {
                setShowResult(true)
              }
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}

export default GamesSection
