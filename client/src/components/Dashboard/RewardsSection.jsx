// client/src/components/Dashboard/RewardsSection.jsx
// Rewards Section with Premium Card Design
import { motion } from 'framer-motion'
import {
  Award,
  ChevronRight,
  Lock,
  MapPin,
  Sparkles,
  Unlock,
  Zap,
} from 'lucide-react'
import React from 'react'
import { useNavigate } from 'react-router-dom'

const DashboardCard = ({ children, className = '', gradient = 'default' }) => {
  const gradients = {
    default: 'bg-white border-2 border-pink-100',
    pink: 'bg-gradient-to-br from-pink-50 to-pink-100 border-2 border-pink-200',
    purple:
      'bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200',
    indigo:
      'bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`${gradients[gradient]} rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${className}`}
    >
      {children}
    </motion.div>
  )
}

const RewardsSection = ({ rewards, userPoints }) => {
  const navigate = useNavigate()
  const getRewardIcon = (unlocked) => {
    return unlocked ? (
      <Unlock className='w-4 h-4 text-green-600' />
    ) : (
      <Lock className='w-4 h-4 text-gray-600' />
    )
  }

  const getRewardGradient = (unlocked) => {
    return unlocked
      ? 'from-pink-500 to-purple-500'
      : 'from-gray-400 to-gray-500'
  }

  return (
    <DashboardCard gradient='pink'>
      <div className='mb-4 sm:mb-6'>
        {/* Mobile: Title and See More on same line */}
        <div className='flex items-center justify-between mb-3 sm:hidden'>
          <div className='flex items-center'>
            <div className='bg-gradient-to-r from-pink-500 to-purple-500 p-2 rounded-xl mr-3'>
              <Award className='w-5 h-5 text-white' />
            </div>
            <h2 className='text-lg font-bold text-gray-800'>Spa Rewards</h2>
          </div>
          <button
            onClick={() => navigate('/services')}
            className='flex items-center gap-1 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:shadow-lg'
          >
            See More
            <ChevronRight className='w-3 h-3' />
          </button>
        </div>
        {/* Mobile: Available badge centered */}
        <div className='flex justify-center mb-4 sm:hidden'>
          <span className='bg-pink-200 text-pink-800 px-4 py-2 rounded-full text-sm font-semibold'>
            {rewards.filter((r) => r.unlocked).length} Available
          </span>
        </div>

        {/* Desktop: Original layout */}
        <div className='hidden sm:flex sm:items-center justify-between'>
          <div className='flex items-center'>
            <div className='bg-gradient-to-r from-pink-500 to-purple-500 p-3 rounded-2xl mr-4'>
              <Award className='w-6 h-6 text-white' />
            </div>
            <h2 className='text-xl lg:text-2xl font-bold text-gray-800'>
              Spa Rewards
            </h2>
          </div>
          <div className='flex items-center gap-3'>
            <span className='bg-pink-200 text-pink-800 px-4 py-2 rounded-full text-sm font-semibold'>
              {rewards.filter((r) => r.unlocked).length} Available
            </span>
            <button
              onClick={() => navigate('/services')}
              className='flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:shadow-lg'
            >
              See More
              <ChevronRight className='w-4 h-4' />
            </button>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6'>
        {rewards.map((reward) => (
          <motion.div
            key={reward.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: reward.id * 0.1 }}
            className={`relative bg-white rounded-lg shadow-sm overflow-hidden transition-all ${
              reward.unlocked
                ? 'hover:shadow-md cursor-pointer group'
                : 'opacity-60'
            }`}
          >
            {/* Premium Image Section */}
            <div className='relative h-48 overflow-hidden'>
              {reward.image ? (
                <img
                  src={reward.image}
                  alt={reward.name}
                  className={`w-full h-full object-cover transition-transform duration-300 ${
                    reward.unlocked ? 'group-hover:scale-105' : 'grayscale'
                  }`}
                />
              ) : (
                <div className='w-full h-full bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center'>
                  <div className='text-4xl sm:text-5xl opacity-60'>
                    {reward.emoji || '🧖‍♀️'}
                  </div>
                </div>
              )}

              {/* Status Badge */}
              <div className='absolute top-3 left-3 flex flex-col gap-2'>
                <span
                  className={`bg-gradient-to-r ${getRewardGradient(
                    reward.unlocked
                  )} text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1`}
                >
                  {getRewardIcon(reward.unlocked)}
                  {reward.unlocked ? 'Available' : 'Locked'}
                </span>
              </div>

              {/* Point Cost */}
              <div className='absolute top-3 right-3'>
                <span className='bg-black/70 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1'>
                  <Zap className='w-3 h-3' />
                  {reward.pointsRequired} pts
                </span>
              </div>

              {/* Discount Badge */}
              <div className='absolute bottom-3 left-3'>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-bold ${
                    reward.unlocked
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-500 text-white'
                  }`}
                >
                  {reward.discount}
                </span>
              </div>
            </div>

            {/* Premium Content Section */}
            <div className='p-4 md:p-6'>
              <h3
                className={`text-lg md:text-xl font-bold mb-2 ${
                  reward.unlocked ? 'text-gray-900' : 'text-gray-500'
                }`}
              >
                {reward.name}
              </h3>

              {/* Location */}
              <div className='flex items-center text-sm text-gray-600 mb-3'>
                <MapPin className='w-4 h-4 mr-1' />
                <span className='truncate'>{reward.location}</span>
              </div>

              {/* Services */}
              <div className='flex flex-wrap gap-1 mb-4'>
                {reward.services.slice(0, 3).map((service, index) => (
                  <span
                    key={index}
                    className={`text-xs px-2 py-1 rounded-full ${
                      reward.unlocked
                        ? 'bg-pink-100 text-pink-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {service}
                  </span>
                ))}
                {reward.services.length > 3 && (
                  <span className='text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500'>
                    +{reward.services.length - 3}
                  </span>
                )}
              </div>

              {/* Reward Value */}
              <div
                className={`p-3 rounded-lg mb-4 ${
                  reward.unlocked ? 'bg-pink-50' : 'bg-gray-50'
                }`}
              >
                <div className='flex items-center justify-between'>
                  <span
                    className={`text-sm font-semibold ${
                      reward.unlocked ? 'text-pink-700' : 'text-gray-700'
                    }`}
                  >
                    Points Required:
                  </span>
                  <span
                    className={`font-bold text-lg ${
                      reward.unlocked ? 'text-pink-800' : 'text-gray-500'
                    }`}
                  >
                    {reward.pointsRequired.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button
                className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  reward.unlocked
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 hover:scale-105 transform shadow-md hover:shadow-lg'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
                disabled={!reward.unlocked}
              >
                {reward.unlocked ? (
                  <>
                    <Sparkles className='w-4 h-4' />
                    Book Now
                  </>
                ) : (
                  <>
                    <Lock className='w-4 h-4' />
                    Locked
                  </>
                )}
              </button>

              {/* Affordability Check */}
              {reward.unlocked && userPoints && (
                <div className='mt-3 text-center'>
                  <p
                    className={`text-xs ${
                      userPoints >= reward.pointsRequired
                        ? 'text-green-600'
                        : 'text-orange-600'
                    }`}
                  >
                    {userPoints >= reward.pointsRequired
                      ? 'You can afford this reward!'
                      : `Need ${
                          reward.pointsRequired - userPoints
                        } more points`}
                  </p>
                </div>
              )}
            </div>

            {/* Premium Hover Effect */}
            {reward.unlocked && (
              <div className='absolute inset-0 bg-gradient-to-r from-pink-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none'></div>
            )}
          </motion.div>
        ))}
      </div>
    </DashboardCard>
  )
}

export default RewardsSection
