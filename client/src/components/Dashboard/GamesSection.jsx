// File: client/src/components/Dashboard/GamesSection.jsx
// client/src/components/Dashboard/GamesSection.jsx

import { useAvailableGames, usePlayGame } from '@/hooks/useGameWheel'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Clock,
  Coins,
  Gift,
  Loader2,
  RefreshCcw,
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

// Simplified Spin Wheel
const SimplifiedSpinWheel = ({ game, onPlay, isPlaying }) => {
  const [rotation, setRotation] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)

  const items = game.items || []
  const segmentAngle = 360 / items.length
  const colors = [
    '#ec4899',
    '#f43f5e',
    '#8b5cf6',
    '#06b6d4',
    '#10b981',
    '#f59e0b',
  ]

  const handleSpin = () => {
    if (isSpinning || isPlaying) return

    setIsSpinning(true)
    const finalRotation = rotation + 1800 + Math.random() * 360
    setRotation(finalRotation)

    setTimeout(() => {
      setIsSpinning(false)
      onPlay()
    }, 3000)
  }

  return (
    <div className='text-center py-2'>
      <div className='relative w-48 h-48 sm:w-56 sm:h-56 mx-auto mb-4'>
        <div className='absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1 z-10'>
          <div className='w-0 h-0 border-l-2 border-r-2 border-b-4 border-l-transparent border-r-transparent border-b-gray-900'></div>
        </div>

        <div
          className='w-full h-full rounded-full border-4 border-gray-900 relative overflow-hidden'
          style={{
            transform: `rotate(${rotation}deg)`,
            transitionDuration: isSpinning ? '3000ms' : '0ms',
          }}
        >
          {items.map((item, index) => (
            <div
              key={index}
              className='absolute w-1/2 h-1/2 origin-bottom-right flex items-center justify-center'
              style={{
                transform: `rotate(${index * segmentAngle}deg)`,
                backgroundColor: item.color || colors[index % colors.length],
              }}
            >
              <div
                className='text-white font-bold text-xs text-center px-1'
                style={{ transform: `rotate(${segmentAngle / 2}deg)` }}
              >
                <div className='truncate'>{item.title}</div>
              </div>
            </div>
          ))}
        </div>

        <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 sm:w-14 sm:h-14 bg-gray-900 rounded-full flex items-center justify-center border-4 border-white'>
          <div className='text-white font-bold text-xs'>GO</div>
        </div>
      </div>

      <button
        onClick={handleSpin}
        disabled={isSpinning || isPlaying}
        className='w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg font-semibold hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all'
      >
        {isSpinning || isPlaying ? (
          <div className='flex items-center justify-center gap-2'>
            <Loader2 className='w-4 h-4 animate-spin' />
            <span>Spinning...</span>
          </div>
        ) : (
          'Spin Now'
        )}
      </button>
    </div>
  )
}

// Simplified Slide Reveal
const SimplifiedSlideReveal = ({ game, onPlay, isPlaying }) => {
  const [sliderValue, setSliderValue] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false)

  const handleSliderChange = (e) => {
    const value = parseInt(e.target.value)
    setSliderValue(value)

    if (value >= 85 && !isRevealed) {
      setIsRevealed(true)
      setTimeout(() => onPlay(), 300)
    }
  }

  return (
    <div className='text-center py-2'>
      <div className='relative w-full h-32 sm:h-40 mx-auto mb-4 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl sm:rounded-2xl overflow-hidden border border-pink-200'>
        <div className='absolute inset-0 flex items-center justify-center text-white'>
          <div className='text-center'>
            <Trophy className='w-8 h-8 sm:w-10 sm:h-10 text-white mx-auto mb-2' />
            <h3 className='text-base sm:text-lg font-bold mb-1'>Prize!</h3>
          </div>
        </div>

        <div
          className='absolute inset-0 bg-gradient-to-r from-gray-800 to-gray-900 flex items-center justify-center text-white transition-transform duration-200'
          style={{
            transform: `translateX(${sliderValue - 100}%)`,
          }}
        >
          <div className='text-center'>
            <Sparkles className='w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1' />
            <div className='text-sm sm:text-base font-bold'>Slide ✨</div>
          </div>
        </div>
      </div>

      <div className='mb-4'>
        <input
          type='range'
          min='0'
          max='100'
          value={sliderValue}
          onChange={handleSliderChange}
          disabled={isPlaying}
          className='w-full h-2 bg-pink-100 rounded-lg appearance-none cursor-pointer'
          style={{
            background: `linear-gradient(to right, #ec4899 0%, #ec4899 ${sliderValue}%, #fce7f3 ${sliderValue}%, #fce7f3 100%)`,
          }}
        />
        <div className='flex justify-between text-gray-600 mt-2 text-xs'>
          <span>Start</span>
          <span className='text-pink-600 font-semibold'>{sliderValue}%</span>
          <span>Reveal</span>
        </div>
      </div>

      {isPlaying ? (
        <div className='flex items-center justify-center gap-2 text-pink-600 text-sm'>
          <Loader2 className='w-4 h-4 animate-spin' />
          <span>Revealing...</span>
        </div>
      ) : (
        <p className='text-gray-600 text-xs sm:text-sm'>
          Slide all the way to reveal your prize!
        </p>
      )}
    </div>
  )
}

// Game Play Modal
const GamePlayModal = ({
  game,
  onClose,
  onPlay,
  isPlaying,
  gameResult,
  showResult,
  setShowResult,
}) => {
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
          className='bg-white rounded-2xl w-full max-w-sm max-h-[80vh] overflow-hidden border border-pink-100'
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

          <div className='p-4'>
            {game.type === 'spin' ? (
              <SimplifiedSpinWheel
                game={game}
                onPlay={onPlay}
                isPlaying={isPlaying}
              />
            ) : (
              <SimplifiedSlideReveal
                game={game}
                onPlay={onPlay}
                isPlaying={isPlaying}
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
            onPlay={() => handlePlayGame(activeGame.id || activeGame._id)}
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
