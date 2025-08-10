// File: client/src/pages/Spin/ScratchSpinPage.jsx - PROFESSIONAL VERSION
import { useAvailableGames, usePlayGame } from '@/hooks/useGameWheel'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, RefreshCcw, Trophy } from 'lucide-react'
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
    setActiveGame(null)
  }

  if (isLoading) {
    return (
      <Layout>
        <div className='h-screen bg-gradient-to-br from-rose-50 to-purple-50 flex items-center justify-center'>
          <div className='text-center'>
            <div className='w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
            <p className='text-gray-600'>Loading games...</p>
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
      <div className='h-screen bg-gradient-to-br from-rose-50 to-purple-50 flex flex-col overflow-hidden'>
        {/* Header */}
        <div className='flex-shrink-0 px-6 pt-8 pb-6'>
          <div className='text-center'>
            <h1 className='text-3xl font-bold text-gray-900 mb-2'>
              Lucky Games
            </h1>
            <p className='text-gray-600'>
              Choose your game and win exciting prizes
            </p>
          </div>
        </div>

        {/* Games Selection */}
        <div className='flex-1 px-6 pb-6 min-h-0'>
          {games.length > 0 ? (
            <div className='max-w-2xl mx-auto h-full'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6 h-full'>
                {/* Spin Game */}
                {spinGame && (
                  <GameSelectionCard
                    game={spinGame}
                    title='Spin Wheel'
                    subtitle='Spin to Win'
                    description='Test your luck with our magical spinning wheel'
                    onPlay={() => setActiveGame(spinGame)}
                    gradient='from-purple-600 to-pink-600'
                  />
                )}

                {/* Scratch Game */}
                {scratchGame && (
                  <GameSelectionCard
                    game={scratchGame}
                    title='Reveal Cards'
                    subtitle='Slide to Reveal'
                    description='Uncover hidden treasures with our mystery cards'
                    onPlay={() => setActiveGame(scratchGame)}
                    gradient='from-pink-600 to-rose-600'
                  />
                )}
              </div>
            </div>
          ) : (
            <div className='h-full flex items-center justify-center'>
              <div className='text-center max-w-sm mx-auto'>
                <div className='w-20 h-20 bg-gray-200 rounded-full mx-auto mb-6 flex items-center justify-center'>
                  <div className='w-8 h-8 bg-gray-400 rounded'></div>
                </div>
                <h3 className='text-xl font-semibold text-gray-900 mb-3'>
                  No Games Available
                </h3>
                <p className='text-gray-600 mb-6'>
                  No games are currently available. Please check back later or
                  contact support.
                </p>
                <button
                  onClick={() => refetch()}
                  className='inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors'
                >
                  <RefreshCcw className='w-4 h-4' />
                  Refresh
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

// Professional Game Selection Card
const GameSelectionCard = ({
  game,
  title,
  subtitle,
  description,
  onPlay,
  gradient,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className='h-full bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group'
      onClick={onPlay}
    >
      <div className='h-full flex flex-col p-6'>
        {/* Header */}
        <div
          className={`h-24 bg-gradient-to-r ${gradient} rounded-xl mb-6 flex items-center justify-center relative overflow-hidden`}
        >
          <div className='absolute inset-0 bg-black/10'></div>
          <div className='relative text-center text-white'>
            <h3 className='text-xl font-bold'>{title}</h3>
            <p className='text-sm opacity-90'>{subtitle}</p>
          </div>
        </div>

        {/* Content */}
        <div className='flex-1 flex flex-col'>
          <p className='text-gray-600 text-center mb-6 leading-relaxed'>
            {description}
          </p>

          {/* Stats */}
          <div className='bg-gray-50 rounded-lg p-4 mb-6'>
            <div className='text-center'>
              <div className='text-2xl font-bold text-gray-900 mb-1'>
                {game.items?.length || 0}
              </div>
              <div className='text-sm text-gray-600'>Available Prizes</div>
            </div>
          </div>

          {/* Play Button */}
          <div className='mt-auto'>
            <button
              className={`w-full py-3 bg-gradient-to-r ${gradient} text-white rounded-lg font-semibold hover:opacity-90 transition-opacity group-hover:scale-[1.02] transition-transform`}
            >
              Play Now
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Professional Game Modal
const GameModal = ({ game, onClose, onPlay, isPlaying }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4'
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className='bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl'
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className='p-6 border-b border-gray-100'>
          <div className='text-center'>
            <h2 className='text-2xl font-bold text-gray-900 mb-2'>
              {game.type === 'spin' ? 'Spin Wheel' : 'Reveal Cards'}
            </h2>
            <p className='text-gray-600'>
              {game.type === 'spin'
                ? 'Spin the wheel to win prizes'
                : 'Slide to reveal your prize'}
            </p>
          </div>
        </div>

        {/* Game Area */}
        <div className='p-6'>
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

        {/* Prizes */}
        <div className='p-6 pt-0 border-t border-gray-100'>
          <h3 className='font-semibold text-gray-900 mb-3'>Available Prizes</h3>
          <div className='max-h-32 overflow-y-auto space-y-2'>
            {game.items?.map((item, index) => (
              <div
                key={index}
                className='flex items-center justify-between p-2 bg-gray-50 rounded-lg'
              >
                <div className='flex items-center gap-3'>
                  <div
                    className='w-4 h-4 rounded-full'
                    style={{ backgroundColor: item.color }}
                  />
                  <span className='text-gray-900 font-medium'>
                    {item.title}
                  </span>
                </div>
                <span className='text-gray-600 text-sm'>
                  {item.value} {item.valueType}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className='p-6 pt-0'>
          <button
            onClick={onClose}
            className='w-full py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Clean Spin Wheel
const SpinWheel = ({ game, onPlay, isPlaying }) => {
  const [rotation, setRotation] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)

  const items = game.items || []
  const segmentAngle = 360 / items.length
  const colors = [
    '#dc2626',
    '#ea580c',
    '#ca8a04',
    '#65a30d',
    '#059669',
    '#0891b2',
    '#2563eb',
    '#7c3aed',
    '#c026d3',
    '#e11d48',
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
    <div className='text-center'>
      {/* Wheel */}
      <div className='relative w-64 h-64 mx-auto mb-6'>
        {/* Pointer */}
        <div className='absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1 z-10'>
          <div className='w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-gray-800'></div>
        </div>

        {/* Wheel */}
        <div
          className='w-full h-full rounded-full border-4 border-gray-800 relative overflow-hidden shadow-lg transition-transform duration-[3000ms] ease-out'
          style={{ transform: `rotate(${rotation}deg)` }}
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
                <div>{item.title}</div>
                <div className='text-xs opacity-80'>{item.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Center */}
        <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center shadow-lg'>
          <div className='text-white font-bold text-xs'>SPIN</div>
        </div>
      </div>

      {/* Button */}
      <button
        onClick={handleSpin}
        disabled={isSpinning || isPlaying}
        className='px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all'
      >
        {isSpinning || isPlaying ? (
          <div className='flex items-center gap-2'>
            <Loader2 className='w-4 h-4 animate-spin' />
            Spinning...
          </div>
        ) : (
          'Spin Wheel'
        )}
      </button>
    </div>
  )
}

// Professional Slide Reveal
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
    <div className='text-center'>
      {/* Card */}
      <div className='relative w-80 h-48 mx-auto mb-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl overflow-hidden shadow-lg'>
        {/* Hidden Content */}
        <div className='absolute inset-0 flex items-center justify-center text-white'>
          <div className='text-center'>
            <div className='w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3'>
              <Trophy className='w-8 h-8 text-white' />
            </div>
            <h3 className='text-xl font-bold mb-1'>Mystery Prize</h3>
            <p className='text-sm opacity-90'>Your reward awaits!</p>
          </div>
        </div>

        {/* Sliding Overlay */}
        <div
          className='absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-white transition-transform duration-200'
          style={{
            transform: `translateX(${sliderValue - 100}%)`,
            clipPath: 'polygon(0 0, calc(100% - 30px) 0, 100% 100%, 30px 100%)',
          }}
        >
          <div className='text-center'>
            <div className='text-2xl font-bold mb-2'>Slide to Reveal</div>
            <div className='w-8 h-1 bg-white/60 rounded mx-auto'></div>
          </div>
        </div>
      </div>

      {/* Slider */}
      <div className='mb-6'>
        <input
          type='range'
          min='0'
          max='100'
          value={sliderValue}
          onChange={handleSliderChange}
          disabled={isPlaying}
          className='w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider'
        />
        <div className='flex justify-between text-sm text-gray-600 mt-2'>
          <span>Start</span>
          <span className='font-medium'>{sliderValue}%</span>
          <span>Reveal</span>
        </div>
      </div>

      {/* Status */}
      {isPlaying ? (
        <div className='flex items-center justify-center gap-2 text-purple-600'>
          <Loader2 className='w-4 h-4 animate-spin' />
          <span>Revealing your prize...</span>
        </div>
      ) : (
        <p className='text-gray-600'>
          Slide the control to reveal your mystery prize
        </p>
      )}
    </div>
  )
}

// Professional Result Modal
const ResultModal = ({ result, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4'
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className='bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl'
      >
        {/* Success Icon */}
        <div className='w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6'>
          <Trophy className='w-10 h-10 text-white' />
        </div>

        {/* Congratulations */}
        <h2 className='text-3xl font-bold text-gray-900 mb-2'>
          Congratulations!
        </h2>
        <p className='text-gray-600 mb-6'>You have successfully won a prize</p>

        {/* Prize Details */}
        <div className='bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 mb-6'>
          <div className='flex items-center justify-center gap-3 mb-4'>
            <div
              className='w-6 h-6 rounded-full border-2 border-white shadow-md'
              style={{ backgroundColor: result.result.winningItem.color }}
            />
            <h3 className='text-xl font-bold text-gray-900'>
              {result.result.winningItem.title}
            </h3>
          </div>

          <div className='text-3xl font-bold text-purple-600 mb-2'>
            {result.result.winningItem.value}
          </div>

          <div className='text-gray-600 capitalize'>
            {result.result.winningItem.valueType}
          </div>

          {result.result.winningItem.description && (
            <p className='text-gray-500 text-sm mt-3'>
              {result.result.winningItem.description}
            </p>
          )}
        </div>

        {/* Points Update */}
        {result.result.pointsWon > 0 && (
          <div className='bg-green-50 border border-green-200 rounded-lg p-4 mb-6'>
            <div className='text-green-800 font-semibold mb-1'>
              Points Earned: +{result.result.pointsWon}
            </div>
            <div className='text-green-600 text-sm'>
              Current Balance: {result.result.newPointsBalance} points
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={onClose}
          className='w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-pink-700 transition-colors'
        >
          Continue
        </button>
      </motion.div>
    </motion.div>
  )
}

export default ScratchSpinPage
