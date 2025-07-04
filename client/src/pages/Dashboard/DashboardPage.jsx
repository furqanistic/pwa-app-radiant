import { motion } from 'framer-motion'
import {
  Award,
  Calendar,
  ChevronRight,
  Clock,
  CreditCard,
  Gift,
  Heart,
  Lock,
  MapPin,
  Plus,
  Share2,
  ShoppingBag,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Unlock,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react'
import React, { useState } from 'react'
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import Layout from '../Layout/Layout'

// Mock data with enhanced rewards and points earning methods
const mockData = {
  upcomingAppointments: [
    {
      id: 1,
      service: 'HydraFacial Premium',
      date: '2025-06-08',
      time: '2:30 PM',
      provider: 'Dr. Sarah Chen',
    },
    {
      id: 2,
      service: 'Botox Consultation',
      date: '2025-06-15',
      time: '10:00 AM',
      provider: 'Dr. Maria Rodriguez',
    },
  ],
  pastVisits: [
    {
      id: 1,
      service: 'Laser Hair Removal',
      date: '2025-05-20',
      rating: 5,
    },
    {
      id: 2,
      service: 'Chemical Peel',
      date: '2025-05-05',
      rating: 5,
    },
    {
      id: 3,
      service: 'Microneedling',
      date: '2025-04-18',
      rating: 4,
    },
    {
      id: 4,
      service: 'Dermaplaning',
      date: '2025-04-02',
      rating: 5,
    },
  ],
  sessionProgress: {
    current: 3,
    total: 6,
    service: 'Laser Hair Removal Package',
    nextSession: '2025-06-22',
  },
  points: {
    current: 100,
    earned: 450,
    level: 'Gold',
    nextLevel: 'Platinum',
    nextLevelPoints: 3000,
  },
  referrals: {
    total: 8,
    thisMonth: 2,
    earnings: 240,
  },
  credits: {
    available: 3,
    gifts: 1,
    expiring: '2025-08-15',
  },
  rewards: [
    {
      id: 1,
      name: 'Signature HydraFacial',
      location: 'Beverly Hills, CA',
      pointsRequired: 1000,
      unlocked: true,
      discount: '15% Off',
      services: ['Facials', 'Massage', 'Aromatherapy'],
      image:
        'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=500&h=300&fit=crop',
    },

    {
      id: 3,
      name: 'Swedish Relaxation Massage',
      location: 'Miami, FL',
      pointsRequired: 3000,
      unlocked: false,
      discount: '25% Off',
      services: ['CoolSculpting', 'HydraFacial', 'RF Treatments'],
      image:
        'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=500&h=300&fit=crop',
    },
    {
      id: 4,
      name: 'LED Light Therapy Facial',
      location: 'Los Angeles, CA',
      pointsRequired: 5000,
      unlocked: false,
      discount: '30% Off',
      services: ['Thread Lifts', 'Plasma Pen', 'Luxury Treatments'],
      image:
        'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=500&h=300&fit=crop',
    },
  ],
  pointsEarningMethods: [
    {
      id: 1,
      title: 'Invite Friends',
      description: 'Earn 500 points per referral',
      icon: UserPlus,
      points: '+500',
      action: 'Share Now',
    },
    {
      id: 2,
      title: 'Book Appointments',
      description: 'Get 50 points per booking',
      icon: Calendar,
      points: '+50',
      action: 'Book Now',
    },
    {
      id: 3,
      title: 'Purchase Products',
      description: 'Earn 1 point per $1 spent',
      icon: ShoppingBag,
      points: '+1/$1',
      action: 'Shop Now',
    },
    {
      id: 4,
      title: 'Social Media Share',
      description: 'Share your experience',
      icon: Share2,
      points: '+25',
      action: 'Share',
    },
  ],
  pointsHistory: [
    { month: 'Jan', points: 1200 },
    { month: 'Feb', points: 1450 },
    { month: 'Mar', points: 1680 },
    { month: 'Apr', points: 1920 },
    { month: 'May', points: 2180 },
    { month: 'Jun', points: 2450 },
  ],
}

// Enhanced Card Component
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

const PointsCard = ({ points }) => {
  const progressToNext =
    ((points.current - 2000) / (points.nextLevelPoints - 2000)) * 100

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className='relative overflow-hidden w-full'
    >
      {/* Main Card */}
      <div className='relative bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600 rounded-2xl sm:rounded-3xl overflow-hidden'>
        {/* Background Pattern */}
        <div className='absolute top-0 right-0 w-32 h-32 sm:w-40 sm:h-40 bg-white/10 rounded-full -translate-y-16 sm:-translate-y-20 translate-x-16 sm:translate-x-20'></div>
        <div className='absolute bottom-0 left-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/5 rounded-full translate-y-12 sm:translate-y-16 -translate-x-12 sm:-translate-x-16'></div>

        {/* Holographic shimmer effect */}
        <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 translate-x-full animate-shimmer'></div>

        <div className='relative z-10 p-4 sm:p-6 lg:p-8 text-white'>
          {/* Card Header */}
          <div className='flex items-center justify-between mb-4 sm:mb-6'>
            <div className='flex items-center'>
              <CreditCard className='w-6 h-6 sm:w-8 sm:h-8 mr-2 sm:mr-3' />
              <span className='text-sm sm:text-lg font-semibold'>
                RadiantAI Points
              </span>
            </div>
            <Sparkles className='w-5 h-5 sm:w-6 sm:h-6' />
          </div>

          {/* Points Display */}
          <div className='mb-4 sm:mb-6'>
            <p className='text-white/80 text-xs sm:text-sm mb-1 sm:mb-2'>
              Available Points
            </p>
            <p className='text-3xl sm:text-4xl lg:text-5xl font-bold tracking-wide'>
              {points.current.toLocaleString()}
            </p>
          </div>

          {/* Level and Progress */}
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-white/80 text-xs sm:text-sm'>Member Level</p>
              <p className='text-base sm:text-lg font-semibold'>
                {points.level}
              </p>
            </div>
            <div className='text-right'>
              <p className='text-white/80 text-xs sm:text-sm'>Next Level</p>
              <p className='text-xs sm:text-sm font-semibold'>
                {points.nextLevel}
              </p>
              <div className='w-16 sm:w-24 bg-white/20 rounded-full h-1.5 sm:h-2 mt-1'>
                <motion.div
                  className='bg-white rounded-full h-1.5 sm:h-2 transition-all duration-700'
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progressToNext, 100)}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%) skewX(-12deg);
          }
          100% {
            transform: translateX(200%) skewX(-12deg);
          }
        }
        .animate-shimmer {
          animation: shimmer 4s infinite;
        }
      `}</style>
    </motion.div>
  )
}

// Rewards Section
const RewardsSection = ({ rewards, userPoints }) => {
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
            onClick={() => (window.location.href = '/loyalty')}
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
              onClick={() => (window.location.href = '/loyalty')}
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
            className={`relative overflow-hidden rounded-2xl transition-all transform hover:scale-105 ${
              reward.unlocked
                ? 'bg-white shadow-lg hover:shadow-xl'
                : 'bg-gray-50 shadow-md'
            }`}
          >
            {/* Spa Image */}
            <div className='relative h-32 sm:h-40 overflow-hidden'>
              {reward.image ? (
                <img
                  src={reward.image}
                  alt={reward.name}
                  className='w-full h-full object-cover'
                />
              ) : (
                <div className='w-full h-full bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center'>
                  <div className='text-4xl sm:text-5xl opacity-60'>
                    {reward.emoji || '🧖‍♀️'}
                  </div>
                </div>
              )}

              {/* Status Badge */}
              <div
                className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-sm ${
                  reward.unlocked ? 'bg-green-500/20' : 'bg-gray-500/20'
                }`}
              >
                {reward.unlocked ? (
                  <Unlock className='w-4 h-4 text-green-600' />
                ) : (
                  <Lock className='w-4 h-4 text-gray-600' />
                )}
              </div>

              {/* Discount Badge */}
              <div className='absolute bottom-3 left-3'>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-bold ${
                    reward.unlocked
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-500 text-white'
                  }`}
                >
                  {reward.discount}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className='p-4'>
              <h3
                className={`text-lg font-bold mb-2 ${
                  reward.unlocked ? 'text-gray-800' : 'text-gray-500'
                }`}
              >
                {reward.name}
              </h3>

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

              {/* Points & Action */}
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-xs text-gray-500'>Points needed</p>
                  <p
                    className={`text-sm font-bold ${
                      reward.unlocked ? 'text-green-600' : 'text-gray-500'
                    }`}
                  >
                    {reward.pointsRequired.toLocaleString()}
                  </p>
                </div>

                <button
                  className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                    reward.unlocked
                      ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 shadow-md hover:shadow-lg'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {reward.unlocked ? 'Book Now' : 'Locked'}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </DashboardCard>
  )
}

// Need More Points Section
const NeedMorePointsSection = ({ methods }) => {
  return (
    <DashboardCard gradient='purple'>
      <div className='flex items-center mb-4 sm:mb-6'>
        <div className='bg-gradient-to-r from-purple-500 to-indigo-500 p-2 sm:p-3 rounded-xl sm:rounded-2xl mr-3 sm:mr-4'>
          <Zap className='w-5 h-5 sm:w-6 sm:h-6 text-white' />
        </div>
        <h2 className='text-lg sm:text-xl lg:text-2xl font-bold text-gray-800'>
          Earn More Points
        </h2>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4'>
        {methods.map((method) => {
          const IconComponent = method.icon
          return (
            <motion.div
              key={method.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: method.id * 0.1 }}
              className='bg-white border-2 border-purple-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 hover:border-purple-300 transition-all'
            >
              <div className='flex items-start justify-between mb-3 sm:mb-4'>
                <div className='flex items-start flex-1 min-w-0'>
                  <div className='bg-gradient-to-r from-purple-100 to-purple-200 p-2 sm:p-3 rounded-lg sm:rounded-xl mr-3 flex-shrink-0'>
                    <IconComponent className='w-4 h-4 sm:w-6 sm:h-6 text-purple-600' />
                  </div>
                  <div className='min-w-0 flex-1'>
                    <h3 className='text-sm sm:text-lg font-bold text-gray-800 mb-1'>
                      {method.title}
                    </h3>
                    <p className='text-xs sm:text-sm text-gray-600'>
                      {method.description}
                    </p>
                  </div>
                </div>
                <div className='ml-2 flex-shrink-0'>
                  <span className='bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold'>
                    {method.points}
                  </span>
                </div>
              </div>

              <button className='w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold hover:from-purple-600 hover:to-pink-600 transition-all'>
                {method.action}
              </button>
            </motion.div>
          )
        })}
      </div>
    </DashboardCard>
  )
}

const DashboardPage = () => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const progressPercentage =
    (mockData.sessionProgress.current / mockData.sessionProgress.total) * 100

  return (
    <Layout>
      <div className='min-h-screen bg-gradient-to-br from-pink-25 via-purple-25 to-indigo-25 p-3 sm:p-4 lg:p-6'>
        <div className='max-w-7xl mx-auto'>
          {/* Points Card - Full Width at Top */}
          <div className='mb-4 sm:mb-6 lg:mb-8'>
            <PointsCard points={mockData.points} />
          </div>

          {/* Rewards Section - Full Width */}
          <div className='mb-4 sm:mb-6 lg:mb-8'>
            <RewardsSection
              rewards={mockData.rewards}
              userPoints={mockData.points.current}
            />
          </div>

          {/* Need More Points Section - Full Width */}
          <div className='mb-4 sm:mb-6 lg:mb-8'>
            <NeedMorePointsSection methods={mockData.pointsEarningMethods} />
          </div>

          {/* Rest of the Dashboard - Better Balanced Layout */}
          <div className='grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8'>
            {/* Left Column - Takes 7 columns on desktop */}
            <div className='lg:col-span-7 space-y-4 sm:space-y-6 lg:space-y-8'>
              {/* Upcoming Appointments */}
              <DashboardCard gradient='pink'>
                <div className='flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6'>
                  <div className='flex items-center mb-2 sm:mb-0'>
                    <div className='bg-gradient-to-r from-pink-500 to-pink-600 p-2 sm:p-3 rounded-xl sm:rounded-2xl mr-3 sm:mr-4'>
                      <Calendar className='w-5 h-5 sm:w-6 sm:h-6 text-white' />
                    </div>
                    <h2 className='text-lg sm:text-xl lg:text-2xl font-bold text-gray-800'>
                      Upcoming Appointments
                    </h2>
                  </div>
                  <span className='bg-pink-200 text-pink-800 px-3 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-semibold w-fit'>
                    {mockData.upcomingAppointments.length} scheduled
                  </span>
                </div>
                <div className='grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4'>
                  {mockData.upcomingAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className='bg-white border-2 border-pink-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 hover:border-pink-300 transition-colors'
                    >
                      <h3 className='text-sm sm:text-base lg:text-lg font-bold text-gray-800 mb-1 sm:mb-2'>
                        {appointment.service}
                      </h3>
                      <p className='text-xs sm:text-sm lg:text-base text-gray-600 mb-2 sm:mb-3'>
                        {appointment.provider}
                      </p>
                      <div className='flex items-center bg-pink-50 rounded-lg p-2 sm:p-3'>
                        <Clock className='w-4 h-4 sm:w-5 sm:h-5 text-pink-500 mr-2 sm:mr-3' />
                        <div>
                          <p className='text-xs sm:text-sm font-semibold text-pink-700'>
                            {formatDate(appointment.date)}
                          </p>
                          <p className='text-xs sm:text-sm text-pink-600'>
                            {appointment.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </DashboardCard>

              {/* Referral Program  2*/}
              <DashboardCard gradient='indigo'>
                <div className='flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6'>
                  <div className='flex items-center mb-2 sm:mb-0'>
                    <div className='bg-gradient-to-r from-indigo-500 to-indigo-600 p-2 sm:p-3 rounded-xl sm:rounded-2xl mr-2 sm:mr-3'>
                      <Users className='w-5 h-5 sm:w-6 sm:h-6 text-white' />
                    </div>
                    <h2 className='text-base sm:text-lg lg:text-xl font-bold text-gray-800'>
                      Referral Program
                    </h2>
                  </div>
                  <div className='flex items-center bg-green-100 border-2 border-green-200 rounded-full px-2 sm:px-3 py-1 w-fit'>
                    <TrendingUp className='w-3 h-3 sm:w-4 sm:h-4 text-green-600 mr-1 sm:mr-2' />
                    <span className='text-green-700 font-semibold text-xs sm:text-sm'>
                      Growing
                    </span>
                  </div>
                </div>
                <div className='grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6'>
                  <div className='bg-white border-2 border-indigo-200 rounded-lg sm:rounded-2xl p-2 sm:p-4 text-center hover:border-indigo-300 transition-colors'>
                    <div className='bg-gradient-to-r from-indigo-100 to-indigo-200 rounded-full w-8 h-8 sm:w-12 sm:h-12 lg:w-16 lg:h-16 flex items-center justify-center mx-auto mb-1 sm:mb-2'>
                      <Users className='w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-indigo-600' />
                    </div>
                    <p className='text-lg sm:text-2xl lg:text-4xl font-bold text-indigo-600 mb-1'>
                      {mockData.referrals.total}
                    </p>
                    <p className='text-xs sm:text-sm font-semibold text-gray-700'>
                      Total
                    </p>
                  </div>
                  <div className='bg-white border-2 border-green-200 rounded-lg sm:rounded-2xl p-2 sm:p-4 text-center hover:border-green-300 transition-colors'>
                    <div className='bg-gradient-to-r from-green-100 to-green-200 rounded-full w-8 h-8 sm:w-12 sm:h-12 lg:w-16 lg:h-16 flex items-center justify-center mx-auto mb-1 sm:mb-2'>
                      <Calendar className='w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-green-600' />
                    </div>
                    <p className='text-lg sm:text-2xl lg:text-4xl font-bold text-green-600 mb-1'>
                      {mockData.referrals.thisMonth}
                    </p>
                    <p className='text-xs sm:text-sm font-semibold text-gray-700'>
                      This Month
                    </p>
                  </div>
                  <div className='bg-white border-2 border-purple-200 rounded-lg sm:rounded-2xl p-2 sm:p-4 text-center hover:border-purple-300 transition-colors'>
                    <div className='bg-gradient-to-r from-purple-100 to-purple-200 rounded-full w-8 h-8 sm:w-12 sm:h-12 lg:w-16 lg:h-16 flex items-center justify-center mx-auto mb-1 sm:mb-2'>
                      <Gift className='w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-purple-600' />
                    </div>
                    <p className='text-lg sm:text-2xl lg:text-4xl font-bold text-purple-600 mb-1'>
                      ${mockData.referrals.earnings}
                    </p>
                    <p className='text-xs sm:text-sm font-semibold text-gray-700'>
                      Earned
                    </p>
                  </div>
                </div>
                <div className='bg-white border-2 border-indigo-200 rounded-xl sm:rounded-2xl p-3 sm:p-4'>
                  <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
                    <div>
                      <p className='text-sm sm:text-base lg:text-lg font-bold text-gray-800'>
                        Share & Earn More
                      </p>
                      <p className='text-xs sm:text-sm text-gray-600'>
                        Invite friends and earn $30 per referral
                      </p>
                    </div>
                    <button className='bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm hover:from-indigo-600 hover:to-purple-600 transition-colors w-full sm:w-auto'>
                      Share Now
                    </button>
                  </div>
                </div>
              </DashboardCard>
            </div>

            {/* Right Column - Takes 5 columns on desktop */}
            <div className='lg:col-span-5 space-y-4 sm:space-y-6 lg:space-y-8'>
              {/* Available Credits & Gifts */}
              <DashboardCard gradient='purple'>
                <div className='flex items-center justify-between mb-4 sm:mb-6'>
                  <div className='flex items-center'>
                    <div className='bg-gradient-to-r from-purple-500 to-purple-600 p-2 sm:p-3 rounded-xl sm:rounded-2xl mr-2 sm:mr-3'>
                      <Gift className='w-5 h-5 sm:w-6 sm:h-6 text-white' />
                    </div>
                    <h2 className='text-base sm:text-lg lg:text-xl font-bold text-gray-800'>
                      Credits & Gifts
                    </h2>
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-3 sm:gap-4 mb-4'>
                  {/* Available Credits */}
                  <div className='bg-white border-2 border-purple-200 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center hover:border-purple-300 transition-colors'>
                    <div className='bg-gradient-to-r from-purple-100 to-purple-200 rounded-full w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 flex items-center justify-center mx-auto mb-2 sm:mb-3'>
                      <CreditCard className='w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-purple-600' />
                    </div>
                    <p className='text-xl sm:text-2xl lg:text-3xl font-bold text-purple-600 mb-1'>
                      {mockData.credits.available}
                    </p>
                    <p className='text-xs sm:text-sm font-semibold text-gray-700'>
                      Available Credits
                    </p>
                  </div>

                  {/* Gift Cards */}
                  <div className='bg-white border-2 border-pink-200 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center hover:border-pink-300 transition-colors'>
                    <div className='bg-gradient-to-r from-pink-100 to-pink-200 rounded-full w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 flex items-center justify-center mx-auto mb-2 sm:mb-3'>
                      <Gift className='w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-pink-600' />
                    </div>
                    <p className='text-xl sm:text-2xl lg:text-3xl font-bold text-pink-600 mb-1'>
                      {mockData.credits.gifts}
                    </p>
                    <p className='text-xs sm:text-sm font-semibold text-gray-700'>
                      Gift Cards
                    </p>
                  </div>
                </div>

                {/* Expiration Warning */}
                <div className='bg-amber-50 border-2 border-amber-200 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4'>
                  <div className='flex items-center'>
                    <Clock className='w-4 h-4 sm:w-5 sm:h-5 text-amber-600 mr-2 sm:mr-3' />
                    <div>
                      <p className='text-xs sm:text-sm font-semibold text-amber-800'>
                        Credits Expiring Soon
                      </p>
                      <p className='text-xs sm:text-sm text-amber-700'>
                        Expires on {formatDate(mockData.credits.expiring)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Use Credits Button */}
                <button className='w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold hover:from-purple-600 hover:to-pink-600 transition-all'>
                  Use Credits
                </button>
              </DashboardCard>

              {/* Past Visits */}
              <DashboardCard gradient='pink'>
                <div className='flex items-center justify-between mb-4 sm:mb-6'>
                  <div className='flex items-center'>
                    <div className='bg-gradient-to-r from-pink-500 to-pink-600 p-2 sm:p-3 rounded-xl sm:rounded-2xl mr-2 sm:mr-3'>
                      <Heart className='w-5 h-5 sm:w-6 sm:h-6 text-white' />
                    </div>
                    <h2 className='text-base sm:text-lg lg:text-xl font-bold text-gray-800'>
                      Past Visits
                    </h2>
                  </div>
                </div>
                <div className='space-y-2 sm:space-y-3 max-h-64 sm:max-h-80 lg:max-h-96 overflow-y-auto'>
                  {mockData.pastVisits.map((visit) => (
                    <div
                      key={visit.id}
                      className='bg-white border-2 border-pink-200 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:border-pink-300 transition-colors'
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex-1 min-w-0'>
                          <p className='font-semibold text-gray-800 text-xs sm:text-sm lg:text-base truncate'>
                            {visit.service}
                          </p>
                          <p className='text-xs sm:text-sm text-gray-500'>
                            {formatDate(visit.date)}
                          </p>
                        </div>
                        <div className='flex items-center ml-2 sm:ml-3 flex-shrink-0'>
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 sm:w-4 sm:h-4 ${
                                i < visit.rating
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </DashboardCard>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
export default DashboardPage
