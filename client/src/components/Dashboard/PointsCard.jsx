import { motion } from 'framer-motion'
import { Heart, Sparkles } from 'lucide-react'
import { useSelector } from 'react-redux'

const PointsCard = () => {
  const { currentUser } = useSelector((state) => state.user)

  const formatJoinDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      whileHover={{ y: -5 }}
      className='relative bg-gradient-to-br from-pink-500 via-rose-500 to-pink-600 rounded-3xl overflow-hidden shadow-2xl hover:shadow-pink-500/25 transition-all duration-500'
    >
      {/* Animated background pattern */}
      <div className='absolute inset-0 opacity-10'>
        <div className='absolute top-0 left-0 w-72 h-72 bg-white rounded-full -translate-x-36 -translate-y-36 blur-3xl'></div>
        <div className='absolute bottom-0 right-0 w-64 h-64 bg-rose-300 rounded-full translate-x-32 translate-y-32 blur-3xl'></div>
      </div>

      <div className='relative p-8 text-white'>
        {/* Header */}
        <div className='flex items-center justify-between mb-8'>
          <div className='flex items-center gap-3'>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className='w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full shadow-lg'
            ></motion.div>
            <div>
              <h3 className='text-sm font-bold tracking-wide uppercase bg-gradient-to-r from-white to-pink-200 bg-clip-text text-transparent'>
                Loyalty Rewards
              </h3>
              <p className='text-xs opacity-90 font-medium'>Exclusive Member</p>
            </div>
          </div>
        </div>

        {/* Points Display */}
        <div className='mb-8'>
          <motion.div
            className='flex items-baseline gap-3 mb-3'
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <span className='text-6xl md:text-7xl font-black tracking-tighter bg-gradient-to-b from-white to-pink-200 bg-clip-text text-transparent drop-shadow-lg'>
              {currentUser?.points?.toLocaleString() || '0'}
            </span>
            <span className='text-xl font-black bg-gradient-to-b from-white to-pink-200 bg-clip-text text-transparent drop-shadow-lg'>
              PTS
            </span>
          </motion.div>
          <p className='text-white/90 font-medium text-sm'>Available Balance</p>
        </div>

        {/* User Info */}
        <motion.div
          className='bg-white/15 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-2xl'
          whileHover={{
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
          }}
          transition={{ duration: 0.3 }}
        >
          <div className='grid grid-cols-2 gap-6'>
            <div>
              <p className='text-white/70 text-xs font-bold uppercase mb-2 tracking-wide'>
                Cardholder
              </p>
              <p className='text-white font-bold text-lg'>
                {currentUser?.name || 'Guest'}
              </p>
            </div>
            <div className='text-right'>
              <p className='text-white/70 text-xs font-bold uppercase mb-2 tracking-wide'>
                Member Since
              </p>
              <p className='text-white font-bold text-lg'>
                {currentUser?.createdAt
                  ? formatJoinDate(currentUser.createdAt)
                  : 'Recent'}
              </p>
            </div>
          </div>

          {/* Status */}
          <div className='mt-6 pt-6 border-t border-white/20'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className='w-3 h-3 bg-emerald-400 rounded-full shadow-lg shadow-emerald-400/50'
                ></motion.div>
                <span className='text-white font-semibold text-sm'>
                  Active Status
                </span>
              </div>
              <div className='flex gap-1.5'>
                {[...Array(4)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      height: [12, 16, 12],
                    }}
                    transition={{
                      duration: 0.5,
                      delay: i * 0.1,
                      height: {
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.2,
                      },
                    }}
                    className='w-1.5 bg-gradient-to-t from-emerald-400 to-emerald-300 rounded-full shadow-sm'
                  ></motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Decorative corner element */}
        <div className='absolute bottom-0 right-0 w-32 h-32 opacity-10'>
          <div className='absolute bottom-0 right-0 w-full h-full bg-gradient-to-tl from-white/30 to-transparent rounded-tl-full'></div>
        </div>
      </div>
    </motion.div>
  )
}

export default PointsCard
