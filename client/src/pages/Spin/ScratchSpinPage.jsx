// File: client/src/pages/Spin/ScratchSpinPage.jsx - FIXED VERSION
import { useAvailableGames, usePlayGame } from '@/hooks/useGameWheel'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Heart,
  Loader2,
  RefreshCcw,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react'
import React, { useState } from 'react'
import Layout from '../Layout/Layout'

const ScratchSpinPage = () => {
  const [activeGame, setActiveGame] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [gameResult, setGameResult] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const { data: gamesData, isLoading, refetch } = useAvailableGames()

  const playGameMutation = usePlayGame({
    onSuccess: (data) => {
      setGameResult(data.data)
      setShowResult(true)
      setIsPlaying(false)
      // ✅ Don't close game modal here - let result modal appear on top
      refetch()
    },
    onError: () => setIsPlaying(false),
  })

  const handlePlayGame = async (gameId) => {
    setIsPlaying(true)
    try {
      await playGameMutation.mutateAsync(gameId)
    } catch (error) {
      setIsPlaying(false)
    }
  }

  const closeResult = () => {
    setShowResult(false)
    setGameResult(null)
    setActiveGame(null) // ✅ Close game modal when result modal is closed
  }

  if (isLoading) {
    return (
      <Layout>
        <div className='min-h-screen bg-gradient-to-br from-pink-50 to-rose-50 flex items-center justify-center px-4'>
          <div className='text-center max-w-sm mx-auto'>
            <div className='w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
            <h3 className='text-lg font-semibold text-gray-900 mb-2'>
              Loading your games, sweetie!
            </h3>
            <p className='text-gray-600 text-sm'>
              Getting everything ready for you...
            </p>
          </div>
        </div>
      </Layout>
    )
  }

  const games = gamesData?.games || []
  const spinGame = games.find((game) => game.type === 'spin')
  const scratchGame = games.find((game) => game.type === 'scratch')

  return (
    <Layout>
      <div className='min-h-screen bg-gradient-to-br from-pink-50 to-rose-50'>
        {/* Header */}
        <div className='px-4 pt-6 pb-4'>
          <div className='max-w-sm mx-auto text-center'>
            <div className='flex items-center justify-center gap-2 mb-3'>
              <Heart className='w-6 h-6 text-pink-500' />
              <h1 className='text-2xl md:text-3xl font-bold text-gray-900'>
                Lucky Games
              </h1>
              <Sparkles className='w-6 h-6 text-rose-500' />
            </div>
            <p className='text-gray-600 text-sm'>
              Choose your favorite game and win amazing prizes! ✨
            </p>
          </div>
        </div>

        {/* Games Grid */}
        <div className='px-4 pb-8'>
          {games.length > 0 ? (
            <div className='max-w-sm mx-auto space-y-4'>
              {/* Spin Game */}
              {spinGame && (
                <GameCard
                  game={spinGame}
                  title='Spin the Wheel'
                  description='Spin for instant amazing prizes!'
                  onPlay={() => setActiveGame(spinGame)}
                  gradient='from-pink-500 to-rose-500'
                  icon='spin'
                />
              )}

              {/* Scratch Game */}
              {scratchGame && (
                <GameCard
                  game={scratchGame}
                  title='Mystery Cards'
                  description='Slide to reveal hidden treasures!'
                  onPlay={() => setActiveGame(scratchGame)}
                  gradient='from-rose-500 to-pink-500'
                  icon='scratch'
                />
              )}
            </div>
          ) : (
            <div className='max-w-sm mx-auto text-center px-4'>
              <div className='bg-white rounded-2xl border border-pink-100 p-8 mb-6'>
                <div className='w-16 h-16 bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl mx-auto mb-4 flex items-center justify-center'>
                  <Heart className='w-8 h-8 text-white' />
                </div>
                <h3 className='text-xl font-semibold text-gray-900 mb-2'>
                  No Games Right Now
                </h3>
                <p className='text-gray-600 mb-6 text-sm'>
                  Don't worry sweetie! Check back in a bit for new exciting
                  games 💕
                </p>
                <button
                  onClick={() => refetch()}
                  className='inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-semibold hover:from-pink-600 hover:to-rose-600 hover:scale-105 transform transition-all duration-200'
                >
                  <RefreshCcw className='w-4 h-4' />
                  Check Again
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Game Modal */}
        <AnimatePresence>
          {activeGame && (
            <GameModal
              game={activeGame}
              onClose={() => setActiveGame(null)}
              onPlay={handlePlayGame}
              isPlaying={isPlaying}
            />
          )}
        </AnimatePresence>

        {/* Result Modal */}
        <AnimatePresence>
          {showResult && gameResult && (
            <ResultModal result={gameResult} onClose={closeResult} />
          )}
        </AnimatePresence>
      </div>
    </Layout>
  )
}

// Enhanced Game Card with PWA Design
const GameCard = ({ game, title, description, onPlay, gradient, icon }) => {
  const renderIcon = () => {
    if (icon === 'spin') {
      return (
        <svg
          className='w-6 h-6 text-white'
          fill='currentColor'
          viewBox='0 0 24 24'
        >
          <path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z' />
          <path d='M12 6v6l4 2-1 1.73-5-3V6z' />
        </svg>
      )
    } else if (icon === 'scratch') {
      return <Star className='w-6 h-6 text-white' />
    }
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      className='bg-white rounded-2xl border border-pink-100 overflow-hidden transition-all duration-200 cursor-pointer hover:border-pink-300 hover:scale-105 transform'
      onClick={onPlay}
    >
      <div className='p-4'>
        <div className='flex items-center gap-4'>
          {/* Icon Section */}
          <div
            className={`w-14 h-14 bg-gradient-to-r ${gradient} rounded-xl flex items-center justify-center flex-shrink-0`}
          >
            {renderIcon()}
          </div>

          {/* Content */}
          <div className='flex-1 min-w-0'>
            <h3 className='text-lg font-bold text-gray-900 mb-1 truncate'>
              {title}
            </h3>
            <p className='text-gray-600 text-sm mb-3 line-clamp-2'>
              {description}
            </p>

            {/* Play Button */}
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <div className='w-2 h-2 bg-green-500 rounded-full animate-pulse'></div>
                <span className='text-gray-700 text-xs font-medium'>
                  Ready to play!
                </span>
              </div>

              <div className='w-8 h-8 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center'>
                <svg
                  className='w-4 h-4 text-white'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 5l7 7-7 7'
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Enhanced Game Modal
const GameModal = ({ game, onClose, onPlay, isPlaying }) => {
  return (
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
        {/* Handle */}
        <div className='flex justify-center pt-3 pb-2'>
          <div className='w-12 h-1 bg-pink-200 rounded-full'></div>
        </div>

        {/* Header */}
        <div className='px-4 py-3 border-b border-pink-100'>
          <div className='text-center'>
            <h2 className='text-xl font-bold text-gray-900 mb-1'>
              {game.type === 'spin' ? ' Spin the Wheel' : 'Mystery Cards'}
            </h2>
            <p className='text-gray-600 text-sm'>
              {game.type === 'spin'
                ? 'Spin to win amazing prizes, sweetie!'
                : 'Slide to reveal your special reward!'}
            </p>
          </div>
        </div>

        {/* Game Area */}
        <div className='p-4'>
          {game.type === 'spin' ? (
            <SpinWheel
              game={game}
              onPlay={() => onPlay(game.id)}
              isPlaying={isPlaying}
            />
          ) : (
            <SlideReveal
              game={game}
              onPlay={() => onPlay(game.id)}
              isPlaying={isPlaying}
            />
          )}
        </div>

        {/* Prizes List */}
        <div className='px-4 py-3 border-t border-pink-100 max-h-40 overflow-y-auto'>
          <h3 className='font-semibold text-gray-900 mb-3 text-sm'>
            Available Prizes
          </h3>
          <div className='space-y-2'>
            {game.items?.slice(0, 5).map((item, index) => (
              <div
                key={index}
                className='flex items-center justify-between p-2 bg-pink-50 rounded-lg border border-pink-100'
              >
                <div className='flex items-center gap-2'>
                  <div
                    className='w-3 h-3 rounded-full border border-pink-200'
                    style={{ backgroundColor: item.color }}
                  />
                  <span className='text-gray-900 font-medium text-sm truncate'>
                    {item.title}
                  </span>
                </div>
                <span className='text-gray-600 text-xs'>
                  {item.value} {item.valueType}
                </span>
              </div>
            ))}
            {game.items?.length > 5 && (
              <div className='text-gray-500 text-center py-2 text-xs'>
                +{game.items.length - 5} more amazing prizes! ✨
              </div>
            )}
          </div>
        </div>

        {/* Close Button */}
        <div className='p-4 pt-3'>
          <button
            onClick={onClose}
            className='w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-200'
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Enhanced Spin Wheel
const SpinWheel = ({ game, onPlay, isPlaying }) => {
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
    '#ef4444',
    '#84cc16',
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
    <div className='text-center py-3'>
      {/* Wheel */}
      <div className='relative w-64 h-64 mx-auto mb-6'>
        {/* Pointer */}
        <div className='absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1 z-10'>
          <div className='w-0 h-0 border-l-3 border-r-3 border-b-6 border-l-transparent border-r-transparent border-b-gray-900'></div>
        </div>

        {/* Wheel */}
        <div
          className='w-full h-full rounded-full border-4 border-gray-900 relative overflow-hidden transition-transform ease-out'
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
                <div className='truncate mb-1'>{item.title}</div>
                <div className='text-xs opacity-90'>{item.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Center Button */}
        <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center border-4 border-white'>
          <div className='text-white font-bold text-xs'>SPIN</div>
        </div>
      </div>

      {/* Spin Button */}
      <button
        onClick={handleSpin}
        disabled={isSpinning || isPlaying}
        className='w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-semibold hover:from-pink-600 hover:to-rose-600 hover:scale-105 transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200'
      >
        {isSpinning || isPlaying ? (
          <div className='flex items-center justify-center gap-2'>
            <Loader2 className='w-4 h-4 animate-spin' />
            <span>Spinning...</span>
          </div>
        ) : (
          'Spin the Wheel!'
        )}
      </button>
    </div>
  )
}

// Enhanced Slide Reveal
const SlideReveal = ({ game, onPlay, isPlaying }) => {
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
    <div className='text-center py-3'>
      {/* Card */}
      <div className='relative w-full h-40 mx-auto mb-6 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl overflow-hidden border border-pink-200'>
        {/* Hidden Content */}
        <div className='absolute inset-0 flex items-center justify-center text-white'>
          <div className='text-center'>
            <div className='w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-white/30'>
              <Trophy className='w-6 h-6 text-white' />
            </div>
            <h3 className='text-lg font-bold mb-1'>Mystery Prize</h3>
            <p className='text-white/90 text-sm'>
              Your reward awaits, sweetie!
            </p>
          </div>
        </div>

        {/* Sliding Overlay */}
        <div
          className='absolute inset-0 bg-gradient-to-r from-gray-800 to-gray-900 flex items-center justify-center text-white transition-transform duration-200 border-r-4 border-pink-200'
          style={{
            transform: `translateX(${sliderValue - 100}%)`,
          }}
        >
          <div className='text-center'>
            <Sparkles className='w-8 h-8 mx-auto mb-2' />
            <div className='text-lg font-bold mb-2'>Slide to Reveal ✨</div>
            <div className='w-8 h-1 bg-white/60 rounded mx-auto'></div>
          </div>
        </div>
      </div>

      {/* Slider */}
      <div className='mb-4'>
        <div className='relative'>
          <input
            type='range'
            min='0'
            max='100'
            value={sliderValue}
            onChange={handleSliderChange}
            disabled={isPlaying}
            className='w-full h-3 bg-pink-100 rounded-lg appearance-none cursor-pointer border border-pink-200'
            style={{
              background: `linear-gradient(to right, #ec4899 0%, #ec4899 ${sliderValue}%, #fce7f3 ${sliderValue}%, #fce7f3 100%)`,
            }}
          />
          <div className='flex justify-between text-gray-600 mt-2'>
            <span className='text-xs'>Start</span>
            <span className='text-xs font-semibold text-pink-600'>
              {sliderValue}%
            </span>
            <span className='text-xs'>Reveal</span>
          </div>
        </div>
      </div>

      {/* Status */}
      {isPlaying ? (
        <div className='flex items-center justify-center gap-2 text-pink-600'>
          <Loader2 className='w-4 h-4 animate-spin' />
          <span className='text-sm font-medium'>Revealing your prize...</span>
        </div>
      ) : (
        <p className='text-gray-600 text-sm'>
          Slide the control to reveal your mystery prize!
        </p>
      )}
    </div>
  )
}

// Enhanced Result Modal
const ResultModal = ({ result, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] px-4'
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className='bg-white rounded-2xl p-6 max-w-sm w-full text-center border border-pink-100'
      >
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
          className='w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4'
        >
          <Trophy className='w-8 h-8 text-white' />
        </motion.div>

        {/* Title */}
        <h2 className='text-2xl font-bold text-gray-900 mb-2'>
          Congratulations! 🎉
        </h2>
        <p className='text-gray-600 mb-4 text-sm'>
          You won an amazing prize, sweetie!
        </p>

        {/* Prize Details */}
        <div className='bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl p-4 mb-4 border border-pink-100'>
          <div className='flex items-center justify-center gap-2 mb-3'>
            <div
              className='w-4 h-4 rounded-full border-2 border-white'
              style={{ backgroundColor: result.result.winningItem.color }}
            />
            <h3 className='text-lg font-bold text-gray-900'>
              {result.result.winningItem.title}
            </h3>
          </div>

          <div className='text-2xl font-bold text-pink-600 mb-1'>
            {result.result.winningItem.value}
          </div>

          <div className='text-gray-600 text-sm capitalize'>
            {result.result.winningItem.valueType}
          </div>

          {result.result.winningItem.description && (
            <p className='text-gray-500 mt-2 text-sm'>
              {result.result.winningItem.description}
            </p>
          )}
        </div>

        {/* Points Update */}
        {result.result.pointsWon > 0 && (
          <div className='bg-green-50 border border-green-200 rounded-lg p-3 mb-4'>
            <div className='text-green-800 font-semibold text-sm mb-1'>
              Points Earned: +{result.result.pointsWon} ✨
            </div>
            <div className='text-green-600 text-xs'>
              Current Balance: {result.result.newPointsBalance} points
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={onClose}
          className='w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-semibold hover:from-pink-600 hover:to-rose-600 hover:scale-105 transform transition-all duration-200'
        >
          Continue Playing!
        </button>
      </motion.div>
    </motion.div>
  )
}

export default ScratchSpinPage
