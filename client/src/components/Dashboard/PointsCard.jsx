// client/src/components/Dashboard/PointsCard.jsx
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { useSelector } from 'react-redux'

const PointsCard = () => {
  const { currentUser } = useSelector((state) => state.user)

  // Format the join date from createdAt
  const formatJoinDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className='relative overflow-hidden w-full'
    >
      {/* Premium Card Container */}
      <div className='relative bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 rounded-[24px] overflow-hidden shadow-2xl shadow-pink-500/30 border border-white/20'>
        {/* Luxury Background Elements */}
        <div className='absolute inset-0 bg-gradient-to-br from-pink-300/20 via-transparent to-purple-300/15'></div>
        <div className='absolute top-0 right-0 w-64 h-64 bg-gradient-radial from-white/15 to-transparent rounded-full -translate-y-32 translate-x-32'></div>
        <div className='absolute bottom-0 left-0 w-48 h-48 bg-gradient-radial from-pink-400/20 to-transparent rounded-full translate-y-24 -translate-x-24'></div>

        {/* Premium Mesh Pattern */}
        <div className='absolute inset-0 opacity-20'>
          <div className='absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.3)_1px,transparent_0)] bg-[length:20px_20px]'></div>
        </div>

        {/* Holographic Shimmer */}
        <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transform -skew-x-12 translate-x-full animate-shimmer-slow opacity-70'></div>

        {/* Premium Border Accent */}
        <div className='absolute inset-0 rounded-[24px] bg-gradient-to-r from-pink-300/30 via-white/20 to-purple-300/30 p-[1px]'>
          <div className='w-full h-full bg-transparent rounded-[23px]'></div>
        </div>

        <div className='relative z-10 p-8 text-white'>
          {/* Header */}
          <div className='flex items-center justify-between mb-8'>
            <div className='flex items-center space-x-3'>
              <div>
                <h3 className='text-sm font-bold text-white tracking-wider uppercase drop-shadow-lg'>
                  Loyalty Rewards
                </h3>
                <p className='text-xs text-white font-medium drop-shadow-md'>
                  Exclusive Member
                </p>
              </div>
            </div>
            <div className='text-right'></div>
          </div>

          {/* Points Display - Premium Style */}
          <div className='mb-8'>
            <div className='flex items-baseline space-x-2 mb-2'>
              <span className='text-6xl font-light text-white tracking-tight drop-shadow-xl'>
                {currentUser?.points?.toLocaleString() || '0'}
              </span>
              <span className='text-lg text-white font-bold drop-shadow-lg'>
                PTS
              </span>
            </div>
            <p className='text-white font-semibold text-sm tracking-wide drop-shadow-md'>
              Available Balance
            </p>
          </div>

          {/* User Info - Elegant Layout */}
          <div className='bg-black/20 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-lg'>
            <div className='grid grid-cols-2 gap-6'>
              <div>
                <p className='text-white/90 text-xs font-bold tracking-wide uppercase mb-2 drop-shadow-md'>
                  Cardholder
                </p>
                <p className='text-white font-bold text-lg tracking-wide drop-shadow-lg'>
                  {currentUser?.name || 'Guest'}
                </p>
              </div>
              <div className='text-right'>
                <p className='text-white/90 text-xs font-bold tracking-wide uppercase mb-2 drop-shadow-md'>
                  Member Since
                </p>
                <p className='text-white font-bold text-lg drop-shadow-lg'>
                  {currentUser?.createdAt
                    ? formatJoinDate(currentUser.createdAt)
                    : '---'}
                </p>
              </div>
            </div>

            {/* Premium Status Indicator */}
            <div className='mt-4 pt-4 border-t border-white/30'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-2'>
                  <div className='w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-pink-400/50'></div>
                  <span className='text-white font-semibold text-sm drop-shadow-md'>
                    Active Status
                  </span>
                </div>
                <div className='flex space-x-1'>
                  <div className='w-1 h-4 bg-gradient-to-t from-green-400 to-green-300 rounded-full shadow-sm'></div>
                  <div className='w-1 h-4 bg-gradient-to-t from-green-400 to-green-300 rounded-full shadow-sm'></div>
                  <div className='w-1 h-4 bg-gradient-to-t from-green-400 to-green-300 rounded-full shadow-sm'></div>
                  <div className='w-1 h-4 bg-gradient-to-t from-green-400 to-green-300 rounded-full'></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Corner Accents */}
        <div className='absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-white/20 rounded-tr-lg'></div>
        <div className='absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-white/20 rounded-bl-lg'></div>
      </div>

      <style jsx>{`
        @keyframes shimmer-slow {
          0% {
            transform: translateX(-100%) skewX(-12deg);
          }
          100% {
            transform: translateX(200%) skewX(-12deg);
          }
        }
        .animate-shimmer-slow {
          animation: shimmer-slow 8s infinite;
        }
        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-stops));
        }
      `}</style>
    </motion.div>
  )
}

export default PointsCard
