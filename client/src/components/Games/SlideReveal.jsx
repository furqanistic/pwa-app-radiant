import { AnimatePresence, motion } from 'framer-motion'
import { Clock, Gift, Loader2, Star } from 'lucide-react'
import React, { useState } from 'react'

// "Magic Reveal" Card Component
const SlideReveal = ({ game, onPlay, isPlaying, canPlay }) => {
  const [isRevealed, setIsRevealed] = useState(false)

  const handleReveal = () => {
    if (!canPlay || isRevealed || isPlaying) return

    setIsRevealed(true)
    // Wait for reveal animation then trigger play
    setTimeout(() => {
      onPlay()
    }, 800)
  }

  return (
    <div className='flex flex-col items-center py-4'>
      <div className='relative w-full max-w-[320px] aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl shadow-purple-500/20 border-4 border-white transform transition-transform duration-300 hover:scale-[1.01]'>
        
        {/* The Prize (Underneath) */}
        <div className='absolute inset-0 bg-gradient-to-br from-pink-500 to-rose-600 flex flex-col items-center justify-center text-white z-0'>
           <motion.div
             initial={{ scale: 0.5, opacity: 0 }}
             animate={isRevealed ? { scale: 1, opacity: 1 } : {}}
             transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
             className="text-center p-4"
           >
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                <Gift className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-1">You Won!</h3>
              <p className="text-white/90 font-medium">Check your prize below</p>
           </motion.div>
           
           {/* Particles effect (simulated with standard divs for performance) */}
           {isRevealed && (
             <>
               <motion.div 
                 initial={{ opacity: 0, scale: 0 }}
                 animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 2], x: -50, y: -50 }}
                 transition={{ duration: 0.8, delay: 0.1 }}
                 className="absolute top-1/2 left-1/2 w-4 h-4 bg-yellow-300 rounded-full"
               />
               <motion.div 
                 initial={{ opacity: 0, scale: 0 }}
                 animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 2], x: 50, y: -30 }}
                 transition={{ duration: 0.8, delay: 0.2 }}
                 className="absolute top-1/2 left-1/2 w-3 h-3 bg-white rounded-full"
               />
               <motion.div 
                 initial={{ opacity: 0, scale: 0 }}
                 animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 2], x: 0, y: 60 }}
                 transition={{ duration: 0.8, delay: 0.3 }}
                 className="absolute top-1/2 left-1/2 w-5 h-5 bg-pink-300 rounded-full"
               />
             </>
           )}
        </div>

        {/* The "Scratch" Overlay */}
        <AnimatePresence>
          {!isRevealed && (
            <motion.div
              initial={{ x: 0, opacity: 1 }}
              exit={{ 
                x: '100%', 
                opacity: 0,
                transition: { duration: 0.7, ease: "easeInOut" }
              }}
              className='absolute inset-0 z-10 cursor-pointer'
              onClick={handleReveal}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
               {/* Foil Texture Background */}
               <div className="w-full h-full bg-slate-800 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-slate-800 via-slate-700 to-slate-800"></div>
                  
                  {/* Holographic/Shine effect */}
                  <motion.div 
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
                  />
                  
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                     <div className="w-20 h-20 mb-4 relative">
                        <Star className="w-full h-full text-yellow-400 fill-yellow-400 drop-shadow-lg" />
                        <motion.div
                           animate={{ rotate: [0, 15, -15, 0] }}
                           transition={{ duration: 2, repeat: Infinity }}
                           className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md"
                        >
                           WIN
                        </motion.div>
                     </div>
                     <h3 className="text-2xl font-black uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200 drop-shadow-sm">
                        Mystery
                     </h3>
                     <p className="text-slate-400 text-sm mt-2 font-medium">Tap to Reveal</p>
                  </div>
               </div>
               
               {/* Disabled Overlay */}
               {!canPlay && (
                 <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-20">
                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 text-white text-center border border-white/20">
                       <Clock className="w-8 h-8 mx-auto mb-2 text-white/80" />
                       <p className="font-bold text-sm">Play limit reached</p>
                    </div>
                 </div>
               )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className='mt-6 text-center'>
         {isPlaying ? (
           <div className="flex items-center gap-2 text-pink-600 font-medium justify-center">
             <Loader2 className="w-4 h-4 animate-spin" />
             <span>Claiming prize...</span>
           </div>
         ) : !canPlay ? (
           <p className="text-gray-400 italic text-sm">Come back later for more chances!</p>
         ) : (
           <p className="text-gray-500 text-sm">Tap the card to scratch it!</p>
         )}
      </div>
    </div>
  )
}

export default SlideReveal
