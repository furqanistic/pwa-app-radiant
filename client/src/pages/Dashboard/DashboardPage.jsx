import { motion } from 'framer-motion'
import {
  Award,
  Calendar,
  Clock,
  Gift,
  Heart,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'
import React from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import Layout from '../Layout/Layout'

// Mock data with chart data
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
    current: 2450,
    earned: 450,
    level: 'Gold',
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
  pointsHistory: [
    { month: 'Jan', points: 1200 },
    { month: 'Feb', points: 1450 },
    { month: 'Mar', points: 1680 },
    { month: 'Apr', points: 1920 },
    { month: 'May', points: 2180 },
    { month: 'Jun', points: 2450 },
  ],
  referralTrends: [
    { month: 'Jan', referrals: 1 },
    { month: 'Feb', referrals: 2 },
    { month: 'Mar', referrals: 1 },
    { month: 'Apr', referrals: 2 },
    { month: 'May', referrals: 1 },
    { month: 'Jun', referrals: 1 },
  ],
}

// Enhanced Card Component without shadows
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
      className={`${gradients[gradient]} rounded-3xl p-6 ${className}`}
    >
      {children}
    </motion.div>
  )
}

// Enhanced Progress Bar
const ProgressBar = ({ progress, className = '' }) => (
  <div
    className={`w-full bg-pink-100 rounded-full h-4 overflow-hidden ${className}`}
  >
    <div
      className='h-4 bg-gradient-to-r from-pink-400 via-pink-500 to-purple-500 rounded-full transition-all duration-700 ease-out relative'
      style={{ width: `${progress}%` }}
    >
      <div className='absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-full'></div>
    </div>
  </div>
)

// Custom Chart Components
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className='bg-white border-2 border-pink-200 p-3 rounded-xl'>
        <p className='text-sm font-semibold text-gray-800'>{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className='text-sm' style={{ color: entry.color }}>
            {`${entry.name}: ${entry.value}`}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function RadiantAIDashboard() {
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
      <div className='min-h-screen bg-gradient-to-br from-pink-25 via-purple-25 to-indigo-25 p-3 md:p-6'>
        <div className='grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8'>
          {/* Left Column - Spans 2 columns */}
          <div className='xl:col-span-2 space-y-6 md:space-y-8'>
            {/* Upcoming Appointments */}
            <DashboardCard gradient='pink'>
              <div className='flex flex-col sm:flex-row sm:items-center justify-between mb-4 md:mb-6'>
                <div className='flex items-center mb-3 sm:mb-0'>
                  <div className='bg-gradient-to-r from-pink-500 to-pink-600 p-2 md:p-3 rounded-xl md:rounded-2xl mr-3 md:mr-4'>
                    <Calendar className='w-5 h-5 md:w-6 md:h-6 text-white' />
                  </div>
                  <h2 className='text-xl md:text-2xl font-bold text-gray-800'>
                    Upcoming Appointments
                  </h2>
                </div>
                <span className='hidden sm:inline-block bg-pink-200 text-pink-800 px-3 md:px-4 py-1 md:py-2 rounded-full text-xs md:text-sm font-semibold'>
                  {mockData.upcomingAppointments.length} scheduled
                </span>
              </div>
              <div className='grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4'>
                {mockData.upcomingAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className='bg-white border-2 border-pink-200 rounded-xl md:rounded-2xl p-4 md:p-5 hover:border-pink-300 transition-colors'
                  >
                    <h3 className='text-base md:text-lg font-bold text-gray-800 mb-1 md:mb-2'>
                      {appointment.service}
                    </h3>
                    <p className='text-sm md:text-base text-gray-600 mb-2 md:mb-3'>
                      {appointment.provider}
                    </p>
                    <div className='flex items-center bg-pink-50 rounded-lg p-2 md:p-3'>
                      <Clock className='w-4 h-4 md:w-5 md:h-5 text-pink-500 mr-2 md:mr-3' />
                      <div>
                        <p className='text-xs md:text-sm font-semibold text-pink-700'>
                          {formatDate(appointment.date)}
                        </p>
                        <p className='text-xs md:text-sm text-pink-600'>
                          {appointment.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </DashboardCard>

            {/* Points Earned with Chart */}
            <DashboardCard gradient='purple'>
              <div className='flex flex-col sm:flex-row sm:items-center justify-between mb-4 md:mb-6'>
                <div className='flex items-center mb-3 sm:mb-0'>
                  <div className='bg-gradient-to-r from-purple-500 to-purple-600 p-2 md:p-3 rounded-xl md:rounded-2xl mr-3 md:mr-4'>
                    <Award className='w-5 h-5 md:w-6 md:h-6 text-white' />
                  </div>
                  <h2 className='text-xl md:text-2xl font-bold text-gray-800'>
                    Points Journey
                  </h2>
                </div>
                <div className='text-left sm:text-right'>
                  <p className='text-2xl md:text-3xl font-bold text-purple-600'>
                    {mockData.points.current.toLocaleString()}
                  </p>
                  <p className='text-xs md:text-sm text-gray-600'>
                    {mockData.points.level} Member
                  </p>
                </div>
              </div>

              <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6'>
                <div className='bg-white border-2 border-purple-200 rounded-xl md:rounded-2xl p-3 md:p-4'>
                  <h3 className='text-base md:text-lg font-semibold text-gray-800 mb-3 md:mb-4'>
                    Points Growth
                  </h3>
                  <div className='h-32 md:h-40'>
                    <ResponsiveContainer width='100%' height='100%'>
                      <AreaChart data={mockData.pointsHistory}>
                        <defs>
                          <linearGradient
                            id='pointsGradient'
                            x1='0'
                            y1='0'
                            x2='0'
                            y2='1'
                          >
                            <stop
                              offset='5%'
                              stopColor='#a855f7'
                              stopOpacity={0.3}
                            />
                            <stop
                              offset='95%'
                              stopColor='#a855f7'
                              stopOpacity={0.1}
                            />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey='month' stroke='#9ca3af' fontSize={10} />
                        <YAxis stroke='#9ca3af' fontSize={10} />
                        <Area
                          type='monotone'
                          dataKey='points'
                          stroke='#a855f7'
                          strokeWidth={3}
                          fill='url(#pointsGradient)'
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className='space-y-3 md:space-y-4'>
                  <div className='bg-white border-2 border-purple-200 rounded-xl md:rounded-2xl p-3 md:p-4'>
                    <p className='text-xs md:text-sm text-gray-600 mb-1'>
                      Recent Earnings
                    </p>
                    <p className='text-xl md:text-2xl font-bold text-purple-600'>
                      +{mockData.points.earned}
                    </p>
                    <p className='text-xs text-gray-500'>This month</p>
                  </div>
                  <div className='bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl md:rounded-2xl p-3 md:p-4 text-white'>
                    <p className='text-xs md:text-sm opacity-90 mb-1'>
                      Member Status
                    </p>
                    <p className='text-lg md:text-xl font-bold'>
                      {mockData.points.level}
                    </p>
                    <p className='text-xs opacity-75'>
                      Premium Benefits Active
                    </p>
                  </div>
                </div>
              </div>
            </DashboardCard>

            {/* Referral Stats */}
            <DashboardCard gradient='indigo'>
              <div className='flex flex-col sm:flex-row sm:items-center justify-between mb-6 md:mb-8'>
                <div className='flex items-center mb-3 sm:mb-0'>
                  <div className='bg-gradient-to-r from-indigo-500 to-indigo-600 p-2 md:p-3 rounded-xl md:rounded-2xl mr-3 md:mr-4'>
                    <Users className='w-5 h-5 md:w-6 md:h-6 text-white' />
                  </div>
                  <h2 className='text-xl md:text-2xl font-bold text-gray-800'>
                    Referral Program
                  </h2>
                </div>
                <div className='hidden md:flex items-center bg-green-100 border-2 border-green-200 rounded-full px-3 md:px-4 py-1 md:py-2'>
                  <TrendingUp className='w-4 h-4 md:w-5 md:h-5 text-green-600 mr-1 md:mr-2' />
                  <span className='text-green-700 font-semibold text-xs md:text-sm'>
                    Growing
                  </span>
                </div>
              </div>

              <div className='grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-6'>
                <div className='bg-white border-2 border-indigo-200 rounded-lg md:rounded-2xl p-3 md:p-6 text-center hover:border-indigo-300 transition-colors'>
                  <div className='bg-gradient-to-r from-indigo-100 to-indigo-200 rounded-full w-8 h-8 md:w-16 md:h-16 flex items-center justify-center mx-auto mb-2 md:mb-4'>
                    <Users className='w-4 h-4 md:w-8 md:h-8 text-indigo-600' />
                  </div>
                  <p className='text-lg md:text-4xl font-bold text-indigo-600 mb-1 md:mb-2'>
                    {mockData.referrals.total}
                  </p>
                  <p className='text-xs md:text-sm font-semibold text-gray-700'>
                    Total
                  </p>
                  <p className='text-xs text-gray-500 mt-1 hidden md:block'>
                    All time
                  </p>
                </div>

                <div className='bg-white border-2 border-green-200 rounded-lg md:rounded-2xl p-3 md:p-6 text-center hover:border-green-300 transition-colors'>
                  <div className='bg-gradient-to-r from-green-100 to-green-200 rounded-full w-8 h-8 md:w-16 md:h-16 flex items-center justify-center mx-auto mb-2 md:mb-4'>
                    <Calendar className='w-4 h-4 md:w-8 md:h-8 text-green-600' />
                  </div>
                  <p className='text-lg md:text-4xl font-bold text-green-600 mb-1 md:mb-2'>
                    {mockData.referrals.thisMonth}
                  </p>
                  <p className='text-xs md:text-sm font-semibold text-gray-700'>
                    This Month
                  </p>
                  <p className='text-xs text-gray-500 mt-1 hidden md:block'>
                    June 2025
                  </p>
                </div>

                <div className='bg-white border-2 border-purple-200 rounded-lg md:rounded-2xl p-3 md:p-6 text-center hover:border-purple-300 transition-colors'>
                  <div className='bg-gradient-to-r from-purple-100 to-purple-200 rounded-full w-8 h-8 md:w-16 md:h-16 flex items-center justify-center mx-auto mb-2 md:mb-4'>
                    <Gift className='w-4 h-4 md:w-8 md:h-8 text-purple-600' />
                  </div>
                  <p className='text-lg md:text-4xl font-bold text-purple-600 mb-1 md:mb-2'>
                    ${mockData.referrals.earnings}
                  </p>
                  <p className='text-xs md:text-sm font-semibold text-gray-700'>
                    Earned
                  </p>
                  <p className='text-xs text-gray-500 mt-1 hidden md:block'>
                    Rewards
                  </p>
                </div>
              </div>

              <div className='mt-4 md:mt-6 bg-white border-2 border-indigo-200 rounded-xl md:rounded-2xl p-4 md:p-5'>
                <div className='flex flex-col sm:flex-row sm:items-center justify-between'>
                  <div className='mb-3 sm:mb-0'>
                    <p className='text-base md:text-lg font-bold text-gray-800'>
                      Share & Earn More
                    </p>
                    <p className='text-sm text-gray-600'>
                      Invite friends and earn $30 per referral
                    </p>
                  </div>
                  <div className='bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl font-semibold text-sm hover:from-indigo-600 hover:to-purple-600 transition-colors cursor-pointer text-center'>
                    Share Now
                  </div>
                </div>
              </div>
            </DashboardCard>
          </div>

          {/* Right Column */}
          <div className='space-y-6 md:space-y-8'>
            {/* Session/Package Progress */}
            <DashboardCard gradient='purple'>
              <div className='flex items-center justify-between mb-4 md:mb-6'>
                <div className='flex items-center'>
                  <div className='bg-gradient-to-r from-purple-500 to-purple-600 p-2 md:p-3 rounded-xl md:rounded-2xl mr-2 md:mr-3'>
                    <Target className='w-5 h-5 md:w-6 md:h-6 text-white' />
                  </div>
                  <h2 className='text-lg md:text-xl font-bold text-gray-800'>
                    Package Progress
                  </h2>
                </div>
              </div>

              <div className='text-center mb-4 md:mb-6'>
                <div className='relative w-24 h-24 md:w-32 md:h-32 mx-auto mb-3 md:mb-4'>
                  <svg
                    className='w-24 h-24 md:w-32 md:h-32 transform -rotate-90'
                    viewBox='0 0 100 100'
                  >
                    <circle
                      cx='50'
                      cy='50'
                      r='40'
                      stroke='#e5e7eb'
                      strokeWidth='8'
                      fill='none'
                    />
                    <circle
                      cx='50'
                      cy='50'
                      r='40'
                      stroke='url(#progressGradient)'
                      strokeWidth='8'
                      fill='none'
                      strokeDasharray={`${progressPercentage * 2.51} 251`}
                      strokeLinecap='round'
                    />
                    <defs>
                      <linearGradient
                        id='progressGradient'
                        x1='0%'
                        y1='0%'
                        x2='100%'
                        y2='0%'
                      >
                        <stop offset='0%' stopColor='#a855f7' />
                        <stop offset='100%' stopColor='#ec4899' />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className='absolute inset-0 flex items-center justify-center'>
                    <span className='text-lg md:text-2xl font-bold text-purple-600'>
                      {mockData.sessionProgress.current}/
                      {mockData.sessionProgress.total}
                    </span>
                  </div>
                </div>
                <p className='text-base md:text-lg font-semibold text-gray-800'>
                  {mockData.sessionProgress.service}
                </p>
                <p className='text-sm text-gray-600'>
                  {Math.round(progressPercentage)}% Complete
                </p>
              </div>

              <div className='bg-white border-2 border-purple-200 rounded-xl md:rounded-2xl p-3 md:p-4'>
                <p className='text-sm text-gray-600 mb-1'>Next Session</p>
                <p className='text-base md:text-lg font-bold text-purple-600'>
                  {formatDate(mockData.sessionProgress.nextSession)}
                </p>
              </div>
            </DashboardCard>

            {/* Past Visits */}
            <DashboardCard gradient='pink'>
              <div className='flex items-center justify-between mb-4 md:mb-6'>
                <div className='flex items-center'>
                  <div className='bg-gradient-to-r from-pink-500 to-pink-600 p-2 md:p-3 rounded-xl md:rounded-2xl mr-2 md:mr-3'>
                    <Heart className='w-5 h-5 md:w-6 md:h-6 text-white' />
                  </div>
                  <h2 className='text-lg md:text-xl font-bold text-gray-800'>
                    Past Visits
                  </h2>
                </div>
              </div>
              <div className='space-y-2 md:space-y-3 max-h-64 md:max-h-80 overflow-y-auto'>
                {mockData.pastVisits.map((visit) => (
                  <div
                    key={visit.id}
                    className='bg-white border-2 border-pink-200 rounded-lg md:rounded-xl p-3 md:p-4 hover:border-pink-300 transition-colors'
                  >
                    <div className='flex items-center justify-between'>
                      <div className='flex-1 min-w-0'>
                        <p className='font-semibold text-gray-800 text-sm md:text-base truncate'>
                          {visit.service}
                        </p>
                        <p className='text-xs md:text-sm text-gray-500'>
                          {formatDate(visit.date)}
                        </p>
                      </div>
                      <div className='flex items-center ml-2 md:ml-3 flex-shrink-0'>
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 md:w-4 md:h-4 ${
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

            {/* Credits & Gifts */}
            <DashboardCard gradient='indigo'>
              <div className='flex items-center mb-4 md:mb-6'>
                <div className='bg-gradient-to-r from-indigo-500 to-indigo-600 p-2 md:p-3 rounded-xl md:rounded-2xl mr-2 md:mr-3'>
                  <Gift className='w-5 h-5 md:w-6 md:h-6 text-white' />
                </div>
                <h2 className='text-lg md:text-xl font-bold text-gray-800'>
                  Credits & Gifts
                </h2>
              </div>
              <div className='space-y-3 md:space-y-4'>
                <div className='bg-white border-2 border-indigo-200 rounded-xl md:rounded-2xl p-4 md:p-5'>
                  <div className='flex items-center justify-between'>
                    <div className='min-w-0 flex-1'>
                      <p className='text-base md:text-lg font-bold text-gray-800'>
                        Service Credits
                      </p>
                      <p className='text-xs md:text-sm text-gray-500'>
                        Available to use anytime
                      </p>
                    </div>
                    <div className='text-right ml-3 flex-shrink-0'>
                      <span className='text-2xl md:text-3xl font-bold text-indigo-600'>
                        {mockData.credits.available}
                      </span>
                      <p className='text-xs md:text-sm text-gray-500'>
                        Credits
                      </p>
                    </div>
                  </div>
                </div>

                <div className='bg-white border-2 border-purple-200 rounded-xl md:rounded-2xl p-4 md:p-5'>
                  <div className='flex items-center justify-between'>
                    <div className='min-w-0 flex-1'>
                      <p className='text-base md:text-lg font-bold text-gray-800'>
                        Gift Cards
                      </p>
                      <p className='text-xs md:text-sm text-gray-500 truncate'>
                        Expires {formatDate(mockData.credits.expiring)}
                      </p>
                    </div>
                    <div className='text-right ml-3 flex-shrink-0'>
                      <span className='text-2xl md:text-3xl font-bold text-purple-600'>
                        {mockData.credits.gifts}
                      </span>
                      <p className='text-xs md:text-sm text-gray-500'>Active</p>
                    </div>
                  </div>
                </div>
              </div>
            </DashboardCard>
          </div>
        </div>
      </div>
    </Layout>
  )
}
