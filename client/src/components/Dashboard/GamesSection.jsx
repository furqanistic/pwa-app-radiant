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
      className={`relative group overflow-hidden rounded-[2rem] p-4 sm:p-5 transition-all duration-300 border-2 ${
        canPlay
          ? 'bg-white border-pink-100/50 hover:border-pink-200 hover:shadow-xl hover:shadow-pink-100/20 cursor-pointer'
          : 'bg-gray-50 border-gray-100 opacity-70 cursor-not-allowed grayscale'
      }`}
    >
      <div className='absolute inset-0 bg-[url("https://www.transparenttextures.com/patterns/cubes.png")] opacity-[0.03] mix-blend-overlay pointer-events-none' />
      {/* Background Glow */}
      <div className={`absolute -right-4 -top-4 w-16 h-16 blur-2xl rounded-full opacity-20 pointer-events-none transition-transform duration-500 group-hover:scale-150 ${
        game.type === 'spin' ? 'bg-pink-400' : 'bg-rose-400'
      }`}></div>

      <div className='flex items-center gap-3'>
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition-transform duration-300 ${
            game.type === 'spin'
              ? 'bg-gradient-to-br from-pink-500 to-rose-600 shadow-pink-100'
              : 'bg-gradient-to-br from-rose-500 to-pink-500 shadow-rose-100'
          }`}
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
                <div className='w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]'></div>
                <span className='text-[10px] font-black uppercase tracking-widest text-emerald-600/80'>
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
            canPlay ? 'bg-white/80 text-gray-800 shadow-sm' : 'bg-gray-100 text-gray-400'
           }`}
        >
          <Zap className={`w-3.5 h-3.5 ${canPlay ? 'text-yellow-500 fill-yellow-500' : ''}`} />
        </motion.div>
      </div>

      {!canPlay && (
        <div className='absolute inset-0 bg-white/10 backdrop-blur-[1px] pointer-events-none'></div>
      )}
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
               className={`absolute w-2 h-2 rounded-full ${['bg-pink-400', 'bg-rose-500', 'bg-orange-300', 'bg-rose-300'][i % 4]}`}
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
                ? 'bg-gradient-to-br from-pink-500 to-rose-600 shadow-pink-200'
                : 'bg-gradient-to-br from-rose-500 to-orange-500 shadow-rose-200'
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
                <span className="text-sm font-black text-pink-600">{result.result.newPointsBalance} pts</span>
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

          <div className='px-6 py-5 border-b border-pink-100/30 flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='bg-gradient-to-br from-pink-500 to-rose-600 p-2.5 rounded-xl shadow-lg shadow-pink-200'>
                {game.type === 'spin' ? <Zap className='w-5 h-5 text-white' /> : <Gift className='w-5 h-5 text-white' />}
              </div>
              <div>
                <h2 className='text-xl font-black text-gray-900 tracking-tight'>
                  {game.type === 'spin' ? 'Lucky Spin' : 'Wonder Boxes'}
                </h2>
                <p className='text-[10px] font-bold text-gray-400 uppercase tracking-widest'>
                  {game.type === 'spin' ? 'Test your luck' : 'Pick a card'}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className='p-2 hover:bg-gray-100 rounded-xl transition-colors'
            >
              <Loader2 className={`w-5 h-5 text-gray-400 ${isPlaying ? 'animate-spin' : ''}`} />
            </button>
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
        className='relative overflow-hidden bg-gradient-to-br from-pink-50/20 to-white rounded-[2rem] border-2 border-pink-100/50 p-5 sm:p-6 shadow-xl shadow-pink-100/20 group'
      >
        <div className='absolute inset-0 bg-[url("https://www.transparenttextures.com/patterns/cubes.png")] opacity-[0.03] mix-blend-overlay pointer-events-none' />
        {/* Decorative elements */}
        <div className='absolute -right-20 -top-20 w-64 h-64 bg-pink-100/40 rounded-full blur-[100px] pointer-events-none group-hover:bg-pink-200/40 transition-colors duration-700'></div>
        <div className='absolute -left-20 -bottom-20 w-64 h-64 bg-rose-100/40 rounded-full blur-[100px] pointer-events-none group-hover:bg-rose-200/40 transition-colors duration-700'></div>

        <div className='relative z-10 flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3'>
          <div className='flex items-center gap-3'>
            <div className='bg-gradient-to-br from-pink-500 via-rose-500 to-pink-600 p-3 rounded-xl shadow-lg shadow-pink-100'>
              <Sparkles className='w-5 h-5 text-white' />
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
              className={`text-pink-600 p-2 rounded-xl bg-white/50 backdrop-blur-sm border border-pink-100 hover:bg-pink-50 transition-all ${isLoading ? 'opacity-50' : ''}`}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => (window.location.href = '/spin')}
              className='bg-gradient-to-r from-gray-800 to-gray-900 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all hover:scale-105 flex items-center gap-2'
            >
              Full Games
              <Trophy className='w-3 h-3 text-yellow-400' />
            </button>
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10'>
          {spinGame && (
            <CompactGameCard
              game={spinGame}
              title='Lucky Spin'
              icon={<Zap />}
              onPlay={() => setActiveGame(spinGame)}
              canPlay={spinGame.eligibility?.canPlay ?? true}
            />
          )}

          {scratchGame && (
            <CompactGameCard
              game={scratchGame}
              title='Wonder Boxes'
              icon={<Gift />}
              onPlay={() => setActiveGame(scratchGame)}
              canPlay={scratchGame.eligibility?.canPlay ?? true}
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
          />
        )}
      </AnimatePresence>
    </>
  )
}

export default GamesSection
