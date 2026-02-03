// File: client/src/components/Dashboard/GamesSection.jsx
import SlideReveal from '@/components/Games/SlideReveal'
import SpinWheel from '@/components/Games/SpinWheel'
import { useAvailableGames, usePlayGame } from '@/hooks/useGameWheel'
import { AnimatePresence, motion } from 'framer-motion'
import {
    Clock,
    Coins,
    Gift,
    Loader2,
    RefreshCw,
    Sparkles,
    Trophy,
    Zap,
} from 'lucide-react'
import React, { useState } from 'react'
import { toast } from 'sonner'

// Compact Game Card for Dashboard
const CompactGameCard = ({ game, title, icon, onPlay, canPlay }) => {
  const playsRemaining = game.eligibility?.playsRemaining ?? 0
  const nextReset = game.eligibility?.nextReset

  const formatResetTime = (resetTime) => {
    if (!resetTime) return ''
    const now = new Date()
    const reset = new Date(resetTime)
    const diffHours = Math.ceil((reset - now) / (1000 * 60 * 60))

    if (diffHours <= 1) return 'in < 1h'
    if (diffHours < 24) return `in ${diffHours}h`
    const diffDays = Math.ceil(diffHours / 24)
    return `in ${diffDays}d`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={canPlay ? { scale: 0.98 } : undefined}
      onClick={canPlay ? onPlay : undefined}
      className={`bg-white rounded-xl sm:rounded-2xl border-2 p-3 sm:p-4 cursor-pointer transition-all ${
        canPlay
          ? 'border-pink-200 hover:border-pink-300 hover:shadow-md'
          : 'border-gray-200 opacity-50 cursor-not-allowed'
      }`}
    >
      <div className='flex items-center justify-between mb-3'>
        <div className='flex items-center gap-3 flex-1 min-w-0'>
          <div
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ${
              game.type === 'spin'
                ? 'bg-gradient-to-br from-pink-400 to-rose-500'
                : 'bg-gradient-to-br from-purple-400 to-violet-500'
            }`}
          >
            {icon}
          </div>
          <div className='min-w-0 flex-1'>
            <h3 className='text-sm sm:text-base font-bold text-gray-900 truncate'>
              {title}
            </h3>
            <p className='text-xs text-gray-600 truncate'>
              {game.type === 'spin' ? 'Spin to win' : 'Slide to reveal'}
            </p>
          </div>
        </div>
      </div>

      {/* Play Status */}
      <div className='flex items-center justify-between pt-2 border-t border-gray-100'>
        {canPlay ? (
          <div className='flex items-center gap-1'>
            <div className='w-2 h-2 bg-green-500 rounded-full animate-pulse'></div>
            <span className='text-xs font-medium text-gray-700'>
              {playsRemaining > 0 ? `${playsRemaining} left` : 'Ready!'}
            </span>
          </div>
        ) : (
          <div className='flex items-center gap-1'>
            <Clock className='w-3 h-3 text-gray-400' />
            <span className='text-xs text-gray-500'>
              {formatResetTime(nextReset)}
            </span>
          </div>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation()
            if (canPlay) onPlay()
          }}
          disabled={!canPlay}
          className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
            canPlay
              ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600'
              : 'bg-gray-200 text-gray-500'
          }`}
        >
          Play
        </button>
      </div>
    </motion.div>
  )
}

// Game Result Modal
const GameResultModal = ({ result, onClose }) => {
  const winningItem = result.result.winningItem
  const isPointsPrize = winningItem.valueType === 'points'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className='fixed inset-0 bg-slate-900/95 backdrop-blur-xl flex items-center justify-center z-[70] px-4'
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, y: 40, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.8, y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className='bg-white rounded-[40px] p-8 sm:p-10 max-w-sm w-full text-center border-2 border-pink-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] relative overflow-hidden'
        onClick={(e) => e.stopPropagation()}
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
               className={`absolute w-2 h-2 rounded-full ${['bg-pink-400', 'bg-rose-500', 'bg-yellow-400', 'bg-blue-400'][i % 4]}`}
             />
           ))}
        </div>

        <div className="relative z-10">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-[32px] flex items-center justify-center mx-auto mb-6 shadow-2xl ${
              isPointsPrize
                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-200'
                : 'bg-gradient-to-br from-pink-500 to-rose-600 shadow-pink-200'
            }`}
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

          <div className='bg-slate-50 rounded-[32px] p-6 sm:p-8 mb-8 border border-slate-100 relative overflow-hidden group'>
            <Sparkles className='absolute top-4 left-4 w-6 h-6 text-pink-200 opacity-50 group-hover:scale-125 transition-transform' />
            <Sparkles className='absolute bottom-4 right-4 w-6 h-6 text-pink-200 opacity-50 group-hover:scale-125 transition-transform' />
            
            <h3 className='text-xs sm:text-sm font-black text-pink-500 uppercase tracking-widest mb-2'>
              {winningItem.title}
            </h3>
            <div className='text-4xl sm:text-5xl font-black text-slate-900 tracking-tighter mb-1'>
              {winningItem.value}
            </div>
            {result.result.newPointsBalance !== undefined && (
              <div className='mt-4 pt-4 border-t border-slate-200 flex items-center justify-center gap-2'>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">New Balance:</span>
                <span className="text-sm font-black text-indigo-600">{result.result.newPointsBalance} pts</span>
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
            className='w-full py-5 bg-slate-900 text-white rounded-[28px] font-black shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all cursor-pointer relative z-20'
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
          className='bg-white rounded-2xl w-full max-w-sm max-h-[90vh] overflow-hidden border border-pink-100'
          onClick={(e) => e.stopPropagation()}
        >
          <div className='flex justify-center pt-3 pb-2'>
            <div className='w-12 h-1 bg-pink-200 rounded-full'></div>
          </div>

          <div className='px-4 py-3 border-b border-pink-100'>
            <div className='text-center'>
              <h2 className='text-lg sm:text-xl font-bold text-gray-900'>
                {game.type === 'spin'
                  ? '🎯 Spin the Wheel'
                  : '🎫 Mystery Cards'}
              </h2>
            </div>
          </div>
          
           {/* Play Limit Display */}
            {canPlay && playsRemaining > 0 && (
              <div className='px-4 py-2 bg-green-50 border-b border-green-100'>
                <div className='text-center text-green-700 text-xs'>
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
              />
            ) : (
              <SlideReveal
                game={game}
                onPlay={() => onPlay(game.id || game._id)}
                isPlaying={isPlaying}
                canPlay={canPlay}
              />
            )}
          </div>

          <div className='p-4 border-t border-pink-100'>
            <button
              onClick={onClose}
              className='w-full py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all'
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

  const { data: gamesData, isLoading, error, refetch } = useAvailableGames()

  const playGameMutation = usePlayGame({
    onSuccess: (data) => {
      setGameResult(data.data)
      setShowResult(true)
      setIsPlaying(false)
      refetch()

      toast.success('Congratulations!', {
        description: `You won: ${data.data.result.winningItem.title}!`,
        duration: 4000,
      })
    },
    onError: (error) => {
      setIsPlaying(false)
      toast.error('Game Error', {
        description:
          error.response?.data?.message || 'Failed to play game. Try again.',
        duration: 4000,
      })
    },
  })

  const handlePlayGame = async (gameId) => {
    setIsPlaying(true)
    try {
      await playGameMutation.mutateAsync(gameId)
    } catch (error) {
      setIsPlaying(false)
    }
  }

  const games = gamesData?.games || []
  const spinGame = games.find((game) => game.type === 'spin')
  const scratchGame = games.find((game) => game.type === 'scratch')

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className='bg-white rounded-2xl sm:rounded-3xl border-2 border-pink-100 p-4 sm:p-6'
      >
        <div className='animate-pulse'>
          <div className='h-6 bg-pink-200 rounded w-32 mb-4'></div>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4'>
            <div className='h-24 bg-pink-100 rounded-xl'></div>
            <div className='h-24 bg-pink-100 rounded-xl'></div>
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
        className='bg-white rounded-2xl sm:rounded-3xl border-2 border-pink-100 p-4 sm:p-6'
      >
        <div className='flex items-center justify-between mb-4 sm:mb-6'>
          <div className='flex items-center gap-2 sm:gap-3'>
            <div className='bg-gradient-to-r from-pink-500 to-rose-500 p-2 sm:p-3 rounded-lg sm:rounded-xl'>
              <Sparkles className='w-5 h-5 sm:w-6 sm:h-6 text-white' />
            </div>
            <h2 className='text-lg sm:text-xl lg:text-2xl font-bold text-gray-900'>
              Lucky Games
            </h2>
          </div>
          <button
            onClick={() => refetch()}
            className='text-pink-600 hover:text-pink-700 p-1.5 sm:p-2 rounded-lg hover:bg-pink-50 transition-colors'
          >
            <RefreshCw className='w-4 h-4 sm:w-5 sm:h-5' />
          </button>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4'>
          {spinGame && (
            <CompactGameCard
              game={spinGame}
              title='Spin the Wheel'
              icon={<Zap className='w-5 h-5 sm:w-6 sm:h-6 text-white' />}
              onPlay={() => setActiveGame(spinGame)}
              canPlay={spinGame.eligibility?.canPlay ?? true}
            />
          )}

          {scratchGame && (
            <CompactGameCard
              game={scratchGame}
              title='Mystery Cards'
              icon={<Gift className='w-5 h-5 sm:w-6 sm:h-6 text-white' />}
              onPlay={() => setActiveGame(scratchGame)}
              canPlay={scratchGame.eligibility?.canPlay ?? true}
            />
          )}
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => (window.location.href = '/spin')}
          className='w-full mt-4 py-2 text-sm font-medium text-pink-600 hover:text-pink-700 hover:bg-pink-50 rounded-lg transition-colors'
        >
          Explore Full Games →
        </motion.button>
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
          />
        )}
      </AnimatePresence>
    </>
  )
}

export default GamesSection
