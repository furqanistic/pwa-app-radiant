// File: client/src/pages/Spin/ScratchSpinPage.jsx - FIXED WITH ENHANCED LOCATION-BASED ACCESS
import SlideReveal from '@/components/Games/SlideReveal'
import SpinWheel from '@/components/Games/SpinWheel'
import { useAvailableGames, usePlayGame } from '@/hooks/useGameWheel'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckCircle,
  Clock,
  Coins,
  Gift,
  Heart,
  Loader2,
  MapPin,
  RefreshCcw,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import Layout from '../Layout/Layout'

const ScratchSpinPage = () => {
  const [activeGame, setActiveGame] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [gameResult, setGameResult] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [userRole, setUserRole] = useState(null)

  // Check user role and permissions
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    setUserRole(user.role)

    // Only allow regular users to access this page
    if (user.role && user.role !== 'user') {
      // Redirect management users to their appropriate interface
      window.location.href = '/scratch-spin-management'
      return
    }
  }, [])

  const { data: gamesData, isLoading, error, refetch } = useAvailableGames()

  const playGameMutation = usePlayGame({
    onSuccess: (data) => {
      setGameResult(data.data)
      setShowResult(true)
      setIsPlaying(false)
      refetch() // Refresh to get updated play limits

      // Show success notification
      toast.success('Congratulations!', {
        description: `You won: ${data.data.result.winningItem.title}!`,
        duration: 4000,
      })
    },
    onError: (error) => {
      setIsPlaying(false)

      // Show error notification
      toast.error('Game Error', {
        description:
          error.response?.data?.message ||
          'Failed to play game. Please try again.',
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
      console.error('Play game error:', error)
    }
  }

  const closeResult = () => {
    setShowResult(false)
    setGameResult(null)
    setActiveGame(null)
  }

  // Show loading state
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

  // Enhanced error handling with specific messages
  if (error) {
    const errorStatus = error.response?.status
    const errorMessage = error.response?.data?.message || error.message

    return (
      <Layout>
        <div className='min-h-screen bg-gradient-to-br from-pink-50 to-rose-50 flex items-center justify-center px-4'>
          <div className='text-center max-w-sm mx-auto'>
            <div className='w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl mx-auto mb-4 flex items-center justify-center'>
              <MapPin className='w-8 h-8 text-white' />
            </div>

            {errorStatus === 400 && errorMessage.includes('select a spa') ? (
              // User hasn't selected a spa
              <>
                <h3 className='text-xl font-semibold text-gray-900 mb-2'>
                  Please Select Your Spa First
                </h3>
                <p className='text-gray-600 mb-6 text-sm'>
                  You need to select your spa location before you can play
                  games. Once you do, you'll see all the exciting games from
                  your spa! 💕
                </p>
                <button
                  onClick={() => (window.location.href = '/onboarding')}
                  className='inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-semibold hover:from-pink-600 hover:to-rose-600 hover:scale-105 transform transition-all duration-200'
                >
                  <MapPin className='w-4 h-4' />
                  Select Your Spa
                </button>
              </>
            ) : errorStatus === 403 ? (
              // Access denied - wrong role
              <>
                <h3 className='text-xl font-semibold text-gray-900 mb-2'>
                  Access Not Allowed
                </h3>
                <p className='text-gray-600 mb-6 text-sm'>
                  This page is for spa customers only. If you're a spa owner or
                  admin, please use the management interface.
                </p>
                <div className='space-y-3'>
                  <button
                    onClick={() =>
                      (window.location.href = '/scratch-spin-management')
                    }
                    className='w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-600 transform transition-all duration-200'
                  >
                    Go to Management Interface
                  </button>
                  <button
                    onClick={() => (window.location.href = '/dashboard')}
                    className='w-full px-6 py-3 bg-gray-500 text-white rounded-xl font-semibold hover:bg-gray-600 transform transition-all duration-200'
                  >
                    Go to Dashboard
                  </button>
                </div>
              </>
            ) : (
              // Generic error
              <>
                <h3 className='text-xl font-semibold text-gray-900 mb-2'>
                  Unable to Load Games
                </h3>
                <p className='text-gray-600 mb-6 text-sm'>
                  {errorMessage ||
                    'There was an issue loading your games. Please try again.'}
                </p>
                <div className='space-y-3'>
                  <button
                    onClick={() => refetch()}
                    className='w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-semibold hover:from-pink-600 hover:to-rose-600 transform transition-all duration-200'
                  >
                    <RefreshCcw className='w-4 h-4 inline mr-2' />
                    Try Again
                  </button>
                  <button
                    onClick={() => (window.location.href = '/dashboard')}
                    className='w-full px-6 py-3 bg-gray-500 text-white rounded-xl font-semibold hover:bg-gray-600 transform transition-all duration-200'
                  >
                    Go to Dashboard
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </Layout>
    )
  }

  const games = gamesData?.games || []
  const location = gamesData?.location
  const spinGame = games.find((game) => game.type === 'spin')
  const scratchGame = games.find((game) => game.type === 'scratch')

  return (
    <Layout>
      <div className='min-h-screen bg-gradient-to-br from-pink-50 to-rose-50'>
        {/* Header with Location Info */}
        <div className='px-4 pt-6 pb-4'>
          <div className='max-w-sm mx-auto text-center'>
            <div className='flex items-center justify-center gap-2 mb-3'>
              <Heart className='w-6 h-6 text-pink-500' />
              <h1 className='text-2xl md:text-3xl font-bold text-gray-900'>
                Lucky Games
              </h1>
              <Sparkles className='w-6 h-6 text-rose-500' />
            </div>

            {/* Location Display */}
            {location && (
              <div className='flex items-center justify-center gap-2 mb-3 px-3 py-1 bg-white/70 backdrop-blur-sm rounded-full border border-pink-200'>
                <MapPin className='w-4 h-4 text-pink-600' />
                <span className='text-sm font-medium text-gray-700'>
                  {location.locationName}
                </span>
              </div>
            )}

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
                  eligibility={spinGame.eligibility}
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
                  eligibility={scratchGame.eligibility}
                />
              )}
            </div>
          ) : (
            <NoGamesMessage location={location} onRefresh={refetch} />
          )}
        </div>

        {/* Game Modal */}
        <AnimatePresence>
          {activeGame && !showResult && (
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

// Enhanced Game Card with Play Eligibility
const GameCard = ({
  game,
  title,
  description,
  onPlay,
  gradient,
  icon,
  eligibility,
}) => {
  const canPlay = eligibility?.canPlay ?? true
  const playsRemaining = eligibility?.playsRemaining ?? 0
  const nextReset = eligibility?.nextReset

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

  const formatResetTime = (resetTime) => {
    if (!resetTime) return ''
    const now = new Date()
    const reset = new Date(resetTime)
    const diffHours = Math.ceil((reset - now) / (1000 * 60 * 60))

    if (diffHours <= 1) return 'in less than 1 hour'
    if (diffHours < 24) return `in ${diffHours} hours`

    const diffDays = Math.ceil(diffHours / 24)
    return `in ${diffDays} ${diffDays === 1 ? 'day' : 'days'}`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={canPlay ? { scale: 0.98 } : undefined}
      className={`bg-white rounded-2xl border overflow-hidden transition-all duration-200 ${
        canPlay
          ? 'border-pink-100 cursor-pointer hover:border-pink-300 hover:scale-105 transform'
          : 'border-gray-200 opacity-60'
      }`}
      onClick={canPlay ? onPlay : undefined}
    >
      <div className='p-4'>
        <div className='flex items-center gap-4'>
          {/* Icon Section */}
          <div
            className={`w-14 h-14 bg-gradient-to-r ${gradient} rounded-xl flex items-center justify-center flex-shrink-0 ${
              !canPlay ? 'opacity-50' : ''
            }`}
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

            {/* Play Status */}
            <div className='flex items-center justify-between'>
              {canPlay ? (
                <div className='flex items-center gap-2'>
                  <div className='w-2 h-2 bg-green-500 rounded-full animate-pulse'></div>
                  <span className='text-gray-700 text-xs font-medium'>
                    {playsRemaining > 0
                      ? `${playsRemaining} plays left`
                      : 'Ready to play!'}
                  </span>
                </div>
              ) : (
                <div className='flex items-center gap-2'>
                  <Clock className='w-3 h-3 text-gray-400' />
                  <span className='text-gray-500 text-xs'>
                    Next play {formatResetTime(nextReset)}
                  </span>
                </div>
              )}

              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  canPlay
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500'
                    : 'bg-gray-300'
                }`}
              >
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

// No Games Message Component
const NoGamesMessage = ({ location, onRefresh }) => {
  return (
    <div className='max-w-sm mx-auto text-center px-4'>
      <div className='bg-white rounded-2xl border border-pink-100 p-8 mb-6'>
        <div className='w-16 h-16 bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl mx-auto mb-4 flex items-center justify-center'>
          <Heart className='w-8 h-8 text-white' />
        </div>
        <h3 className='text-xl font-semibold text-gray-900 mb-2'>
          No Games Available
        </h3>

        {location && (
          <div className='flex items-center justify-center gap-2 mb-3 px-3 py-1 bg-pink-50 rounded-full'>
            <MapPin className='w-4 h-4 text-pink-600' />
            <span className='text-sm text-pink-700 font-medium'>
              {location.locationName}
            </span>
          </div>
        )}

        <p className='text-gray-600 mb-6 text-sm'>
          Your spa hasn't set up any games yet, sweetie!
          {location
            ? ` Contact ${location.locationName} `
            : ' Contact your spa '}
          to ask about spin wheels and scratch cards, or check back later! 💕
        </p>

        <button
          onClick={onRefresh}
          className='inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-semibold hover:from-pink-600 hover:to-rose-600 hover:scale-105 transform transition-all duration-200'
        >
          <RefreshCcw className='w-4 h-4' />
          Check Again
        </button>
      </div>
    </div>
  )
}

// Enhanced Game Modal with Play Eligibility Check
const GameModal = ({ game, onClose, onPlay, isPlaying }) => {
  const canPlay = game.eligibility?.canPlay ?? true
  const playsRemaining = game.eligibility?.playsRemaining ?? 0
  const nextReset = game.eligibility?.nextReset
  const resetPeriod = game.eligibility?.resetPeriod

  const formatResetPeriod = (period) => {
    switch (period) {
      case 'daily':
        return 'daily'
      case 'weekly':
        return 'weekly'
      case 'monthly':
        return 'monthly'
      case 'never':
        return 'unlimited'
      default:
        return period
    }
  }

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
              {game.type === 'spin' ? '🎯 Spin the Wheel' : '🎫 Mystery Cards'}
            </h2>
            <p className='text-gray-600 text-sm'>
              {game.type === 'spin'
                ? 'Spin to win amazing prizes, sweetie!'
                : 'Slide to reveal your special reward!'}
            </p>
          </div>
        </div>

        {/* Play Limit Info */}
        {!canPlay && (
          <div className='px-4 py-3 bg-yellow-50 border-b border-yellow-100'>
            <div className='flex items-center gap-2 text-yellow-800 text-sm'>
              <Clock className='w-4 h-4' />
              <span>
                You've used all your plays for this{' '}
                {formatResetPeriod(resetPeriod)} period.
                {nextReset &&
                  ` Next reset: ${new Date(nextReset).toLocaleString()}`}
              </span>
            </div>
          </div>
        )}

        {/* Game Area */}
        <div className='p-4'>
          {game.type === 'spin' ? (
            <SpinWheel
              game={game}
              onPlay={() => onPlay(game.id)}
              isPlaying={isPlaying}
              canPlay={canPlay}
            />
          ) : (
            <SlideReveal
              game={game}
              onPlay={() => onPlay(game.id)}
              isPlaying={isPlaying}
              canPlay={canPlay}
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

        {/* Play Limit Display */}
        {canPlay && playsRemaining > 0 && (
          <div className='px-4 py-2 bg-green-50 border-t border-green-100'>
            <div className='text-center text-green-700 text-sm'>
              {playsRemaining} plays remaining ({formatResetPeriod(resetPeriod)}{' '}
              limit)
            </div>
          </div>
        )}

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

// Enhanced Result Modal with Complete Prize Information
const ResultModal = ({ result, onClose }) => {
  const eligibility = result.result.eligibilityAfterPlay
  const winningItem = result.result.winningItem
  const isPointsPrize = winningItem.valueType === 'points'
  const isServicePrize = ['service', 'discount', 'prize'].includes(
    winningItem.valueType
  )

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
        className='bg-white rounded-2xl p-6 max-w-sm w-full text-center border border-pink-100 max-h-[90vh] overflow-y-auto'
      >
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
          className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
            isPointsPrize
              ? 'bg-gradient-to-r from-blue-500 to-indigo-600'
              : 'bg-gradient-to-r from-green-500 to-emerald-600'
          }`}
        >
          {isPointsPrize ? (
            <Coins className='w-8 h-8 text-white' />
          ) : (
            <Trophy className='w-8 h-8 text-white' />
          )}
        </motion.div>

        {/* Title */}
        <h2 className='text-2xl font-bold text-gray-900 mb-2'>
          {isPointsPrize ? 'Points Earned! 🎉' : 'Congratulations! 🎉'}
        </h2>
        <p className='text-gray-600 mb-4 text-sm'>
          {isPointsPrize
            ? 'Your points have been added to your account!'
            : 'You won an amazing prize, sweetie!'}
        </p>

        {/* Prize Details */}
        <div className='bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl p-4 mb-4 border border-pink-100'>
          <div className='flex items-center justify-center gap-2 mb-3'>
            {winningItem.color && (
              <div
                className='w-4 h-4 rounded-full border-2 border-white'
                style={{ backgroundColor: winningItem.color }}
              />
            )}
            <h3 className='text-lg font-bold text-gray-900'>
              {winningItem.title}
            </h3>
          </div>

          <div
            className={`text-3xl font-bold mb-2 ${
              isPointsPrize ? 'text-blue-600' : 'text-pink-600'
            }`}
          >
            {winningItem.value}
          </div>

          <div className='text-gray-600 text-sm capitalize mb-2'>
            {winningItem.valueType}
          </div>

          {winningItem.description && (
            <p className='text-gray-500 text-sm'>{winningItem.description}</p>
          )}
        </div>

        {/* Transaction Summary */}
        <div className='bg-gray-50 rounded-xl p-4 mb-4'>
          <h4 className='font-semibold text-gray-800 mb-3 text-sm'>
            Transaction Summary
          </h4>

          {result.result.pointsSpent > 0 && (
            <div className='flex justify-between items-center mb-2'>
              <span className='text-sm text-gray-600'>Points Spent:</span>
              <span className='text-sm font-medium text-red-600'>
                -{result.result.pointsSpent}
              </span>
            </div>
          )}

          {result.result.pointsWon > 0 && (
            <div className='flex justify-between items-center mb-2'>
              <span className='text-sm text-gray-600'>Points Earned:</span>
              <span className='text-sm font-medium text-green-600'>
                +{result.result.pointsWon}
              </span>
            </div>
          )}

          <div className='border-t border-gray-200 pt-2 mt-2'>
            <div className='flex justify-between items-center'>
              <span className='text-sm font-semibold text-gray-700'>
                New Balance:
              </span>
              <span className='text-lg font-bold text-blue-600'>
                {result.result.newPointsBalance} points
              </span>
            </div>
          </div>
        </div>

        {/* Service Prize Instructions */}
        {isServicePrize && (
          <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4'>
            <div className='flex items-start space-x-2'>
              <Gift className='w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0' />
              <div className='text-left'>
                <p className='text-sm font-medium text-blue-800 mb-1'>
                  How to Redeem
                </p>
                <p className='text-xs text-blue-600'>
                  Visit your spa and show this reward to redeem your{' '}
                  {winningItem.valueType}.
                  {result.result.expiresAt && (
                    <span className='block mt-1'>
                      Valid until:{' '}
                      {new Date(result.result.expiresAt).toLocaleDateString()}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className='space-y-3'>
          <button
            onClick={onClose}
            className='w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-semibold hover:from-pink-600 hover:to-rose-600 hover:scale-105 transform transition-all duration-200'
          >
            {eligibility?.playsRemaining > 0 ? 'Continue Playing!' : 'Done'}
          </button>

          {isServicePrize && (
            <button
            onClick={() => (window.location.href = '/rewards')} 
            className='w-full py-2 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all duration-200'
          >
            Use Now
          </button>
          )}
        </div>

        {/* Prize Added to Profile Notice */}
        <div className='mt-4 p-3 bg-green-50 border border-green-200 rounded-lg'>
          <div className='flex items-center justify-center space-x-2'>
            <CheckCircle className='w-4 h-4 text-green-600' />
            <p className='text-xs text-green-700'>
              {isPointsPrize
                ? 'Points added to your account'
                : 'Prize added to your profile rewards'}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default ScratchSpinPage
