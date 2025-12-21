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
      className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] px-4'
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className='bg-white rounded-2xl p-5 sm:p-6 max-w-sm w-full text-center border border-pink-100'
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
            isPointsPrize
              ? 'bg-gradient-to-r from-blue-500 to-indigo-600'
              : 'bg-gradient-to-r from-green-500 to-emerald-600'
          }`}
        >
          {isPointsPrize ? (
            <Coins className='w-6 h-6 sm:w-8 sm:h-8 text-white' />
          ) : (
            <Trophy className='w-6 h-6 sm:w-8 sm:h-8 text-white' />
          )}
        </motion.div>

        <h2 className='text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2'>
          You Won! 🎉
        </h2>
        <p className='text-gray-600 mb-3 sm:mb-4 text-xs sm:text-sm'>
          {isPointsPrize ? 'Points added!' : 'Amazing prize!'}
        </p>

        <div className='bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl p-3 sm:p-4 mb-3 sm:mb-4 border border-pink-100'>
          <h3 className='text-base sm:text-lg font-bold text-gray-900 mb-2'>
            {winningItem.title}
          </h3>
          <div
            className={`text-2xl sm:text-3xl font-bold mb-1 ${
              isPointsPrize ? 'text-blue-600' : 'text-pink-600'
            }`}
          >
            {winningItem.value}
          </div>
          <div className='text-gray-600 text-xs sm:text-sm capitalize'>
            {winningItem.valueType}
          </div>
        </div>

        {result.result.newPointsBalance !== undefined && (
          <div className='bg-gray-50 rounded-lg p-3 mb-3 sm:mb-4'>
            <p className='text-xs text-gray-600 mb-1'>New Balance</p>
            <p className='text-xl sm:text-2xl font-bold text-blue-600'>
              {result.result.newPointsBalance}
            </p>
          </div>
        )}

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className='w-full py-2 sm:py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-semibold hover:from-pink-600 hover:to-rose-600 transition-all'
        >
          Continue
        </motion.button>
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
