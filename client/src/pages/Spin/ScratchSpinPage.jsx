// File: client/src/pages/Spin/ScratchSpinPage.jsx - FULLY RESPONSIVE PREMIUM
import SlideReveal from '@/components/Games/SlideReveal'
import SpinWheel from '@/components/Games/SpinWheel'
import { useAvailableGames, usePlayGame } from '@/hooks/useGameWheel'
import { AnimatePresence, motion } from 'framer-motion'
import {
    ArrowRight,
    CheckCircle,
    ChevronRight,
    Clock,
    Coins,
    Crown,
    Gift,
    Heart,
    Loader2,
    MapPin,
    RefreshCcw,
    Sparkles,
    Star,
    Trophy,
    Trophy as TrophyIcon,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import Layout from '../Layout/Layout'
import { useBranding } from '@/context/BrandingContext'

const ScratchSpinPage = () => {
  const [activeGame, setActiveGame] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [gameResult, setGameResult] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  
  const { currentUser } = useSelector((state) => state.user)
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

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (user.role && user.role !== 'user') {
      window.location.href = '/scratch-spin-management'
    }
  }, [])

  const { data: gamesData, isLoading, error, refetch } = useAvailableGames()

  const playGameMutation = usePlayGame({
    onSuccess: (data) => {
      setGameResult(data.data)
      setShowResult(true)
      setIsPlaying(false)
      refetch()
    },
    onError: (error) => {
      setIsPlaying(false)
      toast.error('Game Error', {
        ...toastStyle,
        description: error.response?.data?.message || 'Failed to play game.',
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

  const closeResult = () => {
    console.log('Closing result modal')
    setShowResult(false)
    setGameResult(null)
    setActiveGame(null)
    setIsPlaying(false)
  }

  if (isLoading) {
    return (
      <Layout>
        <div className='min-h-screen bg-white flex items-center justify-center'>
          <div className='animate-bounce w-12 h-12 bg-[color:var(--brand-primary)] rounded-2xl flex items-center justify-center shadow-lg shadow-[color:var(--brand-primary)/0.25]'>
            <Heart className='w-6 h-6 text-white' />
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
      <div
        className='bg-[#fafbfc] relative overflow-hidden flex flex-col'
        style={{
          height: 'calc(100vh - 53px)',
          ['--brand-primary']: brandColor,
          ['--brand-primary-dark']: brandColorDark,
        }}
      >
        {/* Responsive Content Container - Scrollable */}
        <div className='flex-1 overflow-y-auto pb-24 md:pb-12'>
          <div className='max-w-6xl mx-auto'>
            
            {/* Header Area */}
            <header className='relative px-6 py-4 md:py-6 lg:py-10 bg-white md:bg-transparent border-b md:border-none border-gray-50 flex flex-row items-center justify-between gap-4'>
              <div className='relative z-10 flex-1 min-w-0'>
                <div className='flex items-center gap-1.5 mb-1'>
                  <Sparkles className='w-3 h-3 text-[color:var(--brand-primary)]' />
                  <span className='text-[9px] font-black text-[color:var(--brand-primary)] uppercase tracking-widest'>Arena Daily</span>
                  
                  {location && (
                    <div className='hidden md:flex items-center gap-1 px-2.5 py-1 bg-white shadow-sm rounded-full border border-gray-200/70 ml-3'>
                      <MapPin className='w-3 h-3 text-[color:var(--brand-primary)]' />
                      <span className='text-[10px] font-black text-slate-500 uppercase'>{location.locationName}</span>
                    </div>
                  )}
                </div>
                <h1 className='text-xl md:text-4xl font-black text-slate-900 tracking-tight truncate'>Lucky Rewards</h1>
                
                {location && (
                  <div className='flex md:hidden items-center gap-1 mt-1'>
                    <MapPin className='w-2.5 h-2.5 text-[color:var(--brand-primary)]' />
                    <span className='text-[8px] font-bold text-slate-400 uppercase tracking-wider truncate'>{location.locationName}</span>
                  </div>
                )}
              </div>
              
              <div className='flex-shrink-0'>
                {currentUser && (
                  <div className='flex items-center gap-2 md:gap-3 px-3 py-2 md:px-5 md:py-2.5 bg-slate-900 rounded-xl md:rounded-2xl shadow-lg'>
                    <Coins className='w-3.5 h-3.5 md:w-4 md:h-4 text-yellow-400' />
                    <div className='flex flex-col'>
                      <span className='text-[8px] md:text-[9px] font-black text-white/50 uppercase leading-none'>Points</span>
                      <span className='text-xs md:text-sm font-black text-white leading-tight'>{currentUser.points || 0}</span>
                    </div>
                  </div>
                )}
              </div>
            </header>

            {/* Main Content Layout */}
            <div className='grid grid-cols-1 lg:grid-cols-12 gap-6 px-4 md:px-6'>
               
               {/* Banner Section */}
               <div className='lg:col-span-5'>
                  <div className='bg-gradient-to-br from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] rounded-[32px] md:rounded-[40px] p-6 md:p-10 text-white shadow-2xl shadow-[color:var(--brand-primary)/0.25] relative overflow-hidden h-full min-h-[200px] flex flex-col justify-end'>
                     <div className='relative z-10'>
                        <div className='flex items-center gap-2 mb-2'>
                           <Crown className='w-5 h-5 text-yellow-300 fill-current' />
                           <span className='text-xs font-black uppercase tracking-[0.2em] opacity-80'>Premium Player</span>
                        </div>
                        <h2 className='text-2xl md:text-3xl font-black leading-tight mb-2'>Ready to Reveal Your Luck?</h2>
                        <p className='text-white/80 text-xs md:text-sm font-medium max-w-xs'>Spin or scratch to unlock exclusive spa treatments, credits, and bonus points.</p>
                     </div>
                     <TrophyIcon className='absolute right-[-20px] top-[-20px] w-48 h-48 text-white/10 -rotate-12 pointer-events-none' />
                     
                     <div className='absolute top-8 left-8 w-32 h-32 bg-white/10 rounded-full blur-3xl' />
                  </div>
               </div>

               {/* Games Grid Section */}
               <div className='lg:col-span-7'>
                  <div className='space-y-4 md:grid md:grid-cols-2 lg:grid-cols-1 md:gap-4 md:space-y-0'>
                    {games.length > 0 ? (
                      <>
                        {spinGame && (
                          <PremiumResponsiveCard
                            game={spinGame}
                            title='Spin Wheel'
                            subtitle='Spin to win daily rewards'
                            onPlay={() => setActiveGame(spinGame)}
                            color='pink'
                            icon='spin'
                          />
                        )}
                        {scratchGame && (
                          <PremiumResponsiveCard
                            game={scratchGame}
                            title='Scratch Card'
                            subtitle='Reveal secret mystery prizes'
                            onPlay={() => setActiveGame(scratchGame)}
                            color='indigo'
                            icon='scratch'
                          />
                        )}
                      </>
                    ) : (
                      <div className='bg-white rounded-3xl p-10 text-center border border-gray-200/70 col-span-2'>
                        <Heart className='w-12 h-12 text-gray-100 mx-auto mb-4' />
                        <h3 className='text-sm font-black text-slate-800 uppercase tracking-widest'>No Active Games</h3>
                        <p className='text-xs text-slate-400 mt-1 uppercase'>Check back tomorrow, sweetie!</p>
                      </div>
                    )}
                  </div>

                  {/* Desktop Footer info bit */}
                  <div className='mt-8 hidden md:flex items-center gap-6 text-slate-300'>
                     <div className='flex items-center gap-2'>
                        <CheckCircle className='w-3.5 h-3.5' />
                        <span className='text-[10px] font-black uppercase tracking-widest'>Encrypted Plays</span>
                     </div>
                     <div className='h-4 w-[1px] bg-slate-100' />
                     <div className='flex items-center gap-2'>
                        <RefreshCcw className='w-3.5 h-3.5' />
                        <span className='text-[10px] font-black uppercase tracking-widest'>Auto-Refresh</span>
                     </div>
                  </div>
               </div>
            </div>
        </div>
      </div>

        {/* Modal Overlays */}
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

        <AnimatePresence>
          {showResult && gameResult && (
            <ResultModal result={gameResult} onClose={closeResult} />
          )}
        </AnimatePresence>
      </div>
    </Layout>
  )
}

const PremiumResponsiveCard = ({ game, title, subtitle, onPlay, color, icon }) => {
  const eligibility = game.eligibility
  const canPlay = eligibility?.canPlay ?? true
  const playsRemaining = eligibility?.playsRemaining ?? 0

  return (
    <motion.div
      whileHover={canPlay ? { y: -4, shadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' } : {}}
      whileTap={canPlay ? { scale: 0.98 } : {}}
      onClick={canPlay ? onPlay : undefined}
      className={`relative group overflow-hidden rounded-[28px] md:rounded-[32px] border p-5 md:p-6 transition-all h-full ${
        canPlay 
          ? 'bg-white border-gray-200/70 shadow-sm active:border-gray-200/70 cursor-pointer' 
          : 'bg-gray-50 border-gray-200/70 opacity-60 grayscale'
      }`}
    >
      <div className='flex items-center gap-5 md:gap-6 relative z-10'>
        <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl md:rounded-[24px] flex items-center justify-center flex-shrink-0 ${
          color === 'pink' ? 'bg-[color:var(--brand-primary)/0.08] text-[color:var(--brand-primary)]' : 'bg-[color:var(--brand-primary)/0.12] text-[color:var(--brand-primary)]'
        } border border-white shadow-sm`}>
          {icon === 'spin' ? <RefreshCcw className='w-7 h-7 md:w-8 md:h-8' /> : <Star className='w-7 h-7 md:w-8 md:h-8 fill-current' />}
        </div>

        <div className='flex-1'>
          <h3 className='text-base md:text-lg font-black text-slate-900 mb-0.5'>{title}</h3>
          <p className='text-slate-400 text-[11px] md:text-xs font-bold'>{subtitle}</p>
        </div>

        <div className='flex flex-col items-end gap-2'>
           {canPlay ? (
              <>
                <div className='flex items-center gap-1.5 px-3 py-1 bg-green-50 rounded-full border border-green-100'>
                   <div className='w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse' />
                   <span className='text-[10px] font-black text-green-600 uppercase tracking-tighter'>{playsRemaining} Play</span>
                </div>
                 <div className='w-8 h-8 md:w-10 md:h-10 bg-slate-900 rounded-full flex items-center justify-center text-white shadow-lg transition-transform group-hover:translate-x-1'>
                    <ChevronRight className='w-5 h-5' />
                 </div>
              </>
           ) : (
              <div className='w-8 h-8 md:w-10 md:h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-300'>
                 <Clock className='w-5 h-5' />
              </div>
           )}
        </div>
      </div>
    </motion.div>
  )
}

const GameModal = ({ game, onClose, onPlay, isPlaying }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className='fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-end sm:items-center justify-center z-50 sm:p-4'
    onClick={onClose}
  >
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className='bg-white rounded-t-[40px] sm:rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl border-t border-slate-100 sm:border-none'
      onClick={(e) => e.stopPropagation()}
    >
      <div className='p-8 pb-10 sm:pb-8'>
        <div className='text-center mb-8'>
           <div className='w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-6' />
          <h2 className='text-2xl font-black text-slate-900 leading-none'>
            {game.type === 'spin' ? 'Spin Wheel' : 'Scratch Card'}
          </h2>
          <p className='text-xs text-slate-400 font-bold uppercase tracking-[0.2em] mt-2'>Win Amazing Rewards</p>
        </div>

        <div className='mb-8'>
          {game.type === 'spin' ? (
            <SpinWheel game={game} onPlay={() => onPlay(game.id)} isPlaying={isPlaying} canPlay={true} />
          ) : (
            <SlideReveal game={game} onPlay={() => onPlay(game.id)} isPlaying={isPlaying} canPlay={true} />
          )}
        </div>

        <button
          onClick={onClose}
          className='w-full py-4 text-slate-300 font-bold rounded-2xl transition-all'
        >
          Cancel
        </button>
      </div>
    </motion.div>
  </motion.div>
)

const ResultModal = ({ result, onClose }) => {
  const winningItem = result.result.winningItem
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className='fixed inset-0 bg-slate-900/90 backdrop-blur-xl flex items-end sm:items-center justify-center z-[70] sm:p-6'
      onClick={(e) => {
        // Allow clicking background to close if needed, but the button is primary
        onClose()
      }}
    >
      <motion.div
        initial={{ y: '100%', scale: 0.8 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: '100%', scale: 0.8 }}
        transition={{ type: 'spring', damping: 25, stiffness: 180 }}
        className='text-center w-full max-w-md bg-white rounded-t-[45px] sm:rounded-[45px] shadow-2xl p-10 mt-auto sm:mt-0 relative overflow-hidden'
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated Background Confetti/SPA Elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
           {[...Array(20)].map((_, i) => (
             <motion.div
               key={i}
               initial={{ y: -20, x: Math.random() * 100 + '%', opacity: 0 }}
               animate={{ 
                 y: '120%', 
                 opacity: [0, 1, 0],
                 rotate: [0, 360],
                 x: (Math.random() * 100) + '%'
               }}
               transition={{ 
                 duration: 2 + Math.random() * 2, 
                 repeat: Infinity,
                 delay: Math.random() * 2
               }}
               className={`absolute w-3 h-3 rounded-full ${['bg-[color:var(--brand-primary)]', 'bg-[color:var(--brand-primary-dark)]', 'bg-yellow-400', 'bg-blue-400'][i % 4]}`}
             />
           ))}
        </div>

        <div className='relative z-10'>
          <div className='w-24 h-24 md:w-32 md:h-32 rounded-[40px] bg-gradient-to-br from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-[color:var(--brand-primary)/0.25] animate-bounce'>
            <Trophy className='w-12 h-12 md:w-16 md:h-16 text-white' />
          </div>

          <h2 className='text-3xl md:text-5xl font-black text-slate-900 mb-2 tracking-tighter'>Congratulations!</h2>
          <p className='text-slate-400 text-xs md:text-sm font-bold uppercase tracking-[0.2em] mb-10'>Your daily prize is here</p>

          <div className='bg-slate-50 rounded-[40px] px-10 py-12 mb-10 border border-slate-100 relative overflow-hidden'>
            <Sparkles className='absolute top-6 left-6 w-8 h-8 text-[color:var(--brand-primary)/0.35] opacity-50' />
            <Sparkles className='absolute bottom-6 right-6 w-8 h-8 text-[color:var(--brand-primary)/0.35] opacity-50' />
            <h3 className='text-xs md:text-sm font-black text-[color:var(--brand-primary)] uppercase tracking-widest mb-3'>{winningItem.title}</h3>
            <div className='text-4xl md:text-6xl font-black text-slate-900 tracking-tighter'>{winningItem.value}</div>
          </div>

          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onClose()
            }}
            className='w-full py-5 md:py-6 bg-slate-900 text-white rounded-[32px] font-black shadow-xl shadow-slate-200 active:scale-95 hover:bg-slate-800 transition-all text-sm md:text-base cursor-pointer relative z-50'
          >
            Collect Reward
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default ScratchSpinPage
