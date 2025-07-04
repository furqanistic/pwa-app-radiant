import { AnimatePresence, motion } from 'framer-motion'
import {
  Award,
  Calendar,
  ChevronRight,
  Clock,
  Crown,
  Filter,
  Gift,
  Heart,
  Lock,
  Search,
  Sparkles,
  Star,
  Unlock,
  Users,
  Zap,
} from 'lucide-react'
import React, { useState } from 'react'
import Layout from '../Layout/Layout'

// Improved Reusable Service Card Component
const ServiceCard = ({ service, userPoints, onBook }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className={`group relative overflow-hidden rounded-2xl transition-all active:scale-95 flex flex-col h-full ${
      service.unlocked
        ? 'bg-white shadow-lg hover:shadow-xl'
        : 'bg-gray-50 shadow-sm'
    }`}
  >
    {/* Premium Badge */}
    {service.premium && (
      <div className='absolute top-3 left-3 z-10'>
        <div className='bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md'>
          <Crown className='w-3 h-3' />
          <span>Premium</span>
        </div>
      </div>
    )}

    {/* Service Image - Fixed height */}
    <div className='relative h-48 overflow-hidden flex-shrink-0'>
      <img
        src={service.image}
        alt={service.name}
        className='w-full h-full object-cover'
      />

      {/* Status Badge */}
      <div
        className={`absolute top-3 right-3 p-1.5 rounded-full backdrop-blur-sm shadow-md ${
          service.unlocked ? 'bg-green-500/20' : 'bg-gray-500/20'
        }`}
      >
        {service.unlocked ? (
          <Unlock className='w-3.5 h-3.5 text-green-600' />
        ) : (
          <Lock className='w-3.5 h-3.5 text-gray-600' />
        )}
      </div>

      {/* Discount Badge */}
      <div className='absolute bottom-3 left-3'>
        <span
          className={`px-3 py-1.5 rounded-full text-sm font-bold shadow-lg ${
            service.unlocked
              ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
              : 'bg-gray-500 text-white'
          }`}
        >
          {service.discount}
        </span>
      </div>

      {/* Duration */}
      <div className='absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1 shadow-md'>
        <Clock className='w-3 h-3 text-gray-600' />
        <span className='text-sm font-semibold text-gray-800'>
          {service.duration}
        </span>
      </div>
    </div>

    {/* Content - Flexible grow area */}
    <div className='p-4 flex flex-col flex-grow'>
      <div className='flex items-start justify-between mb-3'>
        <h3
          className={`text-base font-bold leading-tight max-w-[70%] ${
            service.unlocked ? 'text-gray-900' : 'text-gray-500'
          }`}
        >
          {service.name}
        </h3>
        {service.popular && (
          <div className='bg-gradient-to-r from-pink-500 to-purple-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-md flex-shrink-0'>
            <Sparkles className='w-3 h-3' />
            <span>Hot</span>
          </div>
        )}
      </div>

      {/* Description */}
      <p className='text-sm text-gray-600 mb-3 leading-relaxed'>
        {service.description}
      </p>

      {/* Benefits - Professional list format */}
      <div className='mb-4 flex-grow'>
        <ul className='space-y-1'>
          {service.benefits.slice(0, 3).map((benefit, index) => (
            <li key={index} className='flex items-center text-sm'>
              <div
                className={`w-1.5 h-1.5 rounded-full mr-3 flex-shrink-0 ${
                  service.unlocked ? 'bg-green-500' : 'bg-gray-400'
                }`}
              />
              <span
                className={service.unlocked ? 'text-gray-700' : 'text-gray-500'}
              >
                {benefit}
              </span>
            </li>
          ))}
          {service.benefits.length > 3 && (
            <li className='flex items-center text-sm'>
              <div className='w-1.5 h-1.5 rounded-full bg-gray-300 mr-3 flex-shrink-0' />
              <span className='text-gray-500 font-medium'>
                +{service.benefits.length - 3} more benefits
              </span>
            </li>
          )}
        </ul>
      </div>

      {/* Points & Action - Always at bottom */}
      <div className='flex items-center justify-between pt-2 border-t border-gray-100 mt-auto'>
        <div>
          <p className='text-xs text-gray-500 mb-0.5'>Points Required</p>
          <p
            className={`text-lg font-bold ${
              service.unlocked ? 'text-green-600' : 'text-gray-500'
            }`}
          >
            {service.pointsRequired >= 1000
              ? `${(service.pointsRequired / 1000).toFixed(0)}K`
              : service.pointsRequired}
          </p>
        </div>

        <button
          onClick={() => service.unlocked && onBook(service)}
          className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all min-w-[80px] ${
            service.unlocked
              ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 shadow-md hover:shadow-lg'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          {service.unlocked ? 'Redeem' : 'Locked'}
        </button>
      </div>
    </div>
  </motion.div>
)

// Filter Component
const FilterSection = ({
  activeFilter,
  setActiveFilter,
  searchTerm,
  setSearchTerm,
}) => (
  <div className='bg-white rounded-2xl p-5 shadow-lg mb-6'>
    {/* Search */}
    <div className='relative mb-5'>
      <Search className='absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
      <input
        type='text'
        placeholder='Search services...'
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className='w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-base placeholder-gray-500'
      />
    </div>

    {/* Filters */}
    <div className='flex gap-3 overflow-x-auto pb-2 scrollbar-hide'>
      {[
        'All',
        'Available',
        'Premium',
        'Popular',
        'Facial',
        'Massage',
        'Body',
      ].map((filter) => (
        <button
          key={filter}
          onClick={() => setActiveFilter(filter)}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
            activeFilter === filter
              ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {filter}
        </button>
      ))}
    </div>
  </div>
)

// Points Display Component
const PointsDisplay = ({ userPoints }) => (
  <motion.div
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    className='bg-gradient-to-r from-pink-500 to-purple-500 rounded-2xl p-5 text-white mb-6 shadow-lg'
  >
    <div className='flex items-center justify-between'>
      <div>
        <h3 className='text-sm font-semibold mb-2 text-pink-100'>
          Your Points
        </h3>
        <p className='text-3xl font-bold'>{userPoints.toLocaleString()}</p>
      </div>
      <div className='bg-white/20 p-3 rounded-xl'>
        <Sparkles className='w-7 h-7' />
      </div>
    </div>
    <div className='mt-4 flex items-center gap-2 text-pink-100'>
      <Gift className='w-4 h-4' />
      <span className='text-sm'>Earn more with every appointment!</span>
    </div>
  </motion.div>
)

// Main Component
const SpaRewardsPage = () => {
  const [activeFilter, setActiveFilter] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')

  const userPoints = 12750

  const services = [
    {
      id: 1,
      name: 'Signature HydraFacial',
      description: 'Deep cleansing facial with hydration boost',
      discount: '30% OFF',
      pointsRequired: 5000,
      unlocked: true,
      benefits: ['Deep Cleansing', 'Hydration', 'Instant Glow', 'Anti-aging'],
      duration: '60 min',
      category: 'Facial',
      image:
        'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=500&h=300&fit=crop',
      premium: true,
      popular: true,
    },
    {
      id: 2,
      name: 'Swedish Relaxation Massage',
      description: 'Full body massage for ultimate relaxation',
      discount: '25% OFF',
      pointsRequired: 3500,
      unlocked: true,
      benefits: ['Stress Relief', 'Muscle Relaxation', 'Improved Circulation'],
      duration: '90 min',
      category: 'Massage',
      image:
        'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=500&h=300&fit=crop',
    },
    {
      id: 3,
      name: 'LED Light Therapy Facial',
      description: 'Advanced anti-aging treatment with LED technology',
      discount: '40% OFF',
      pointsRequired: 8000,
      unlocked: true,
      benefits: [
        'Anti-aging',
        'Collagen Boost',
        'Acne Treatment',
        'Skin Repair',
      ],
      duration: '45 min',
      category: 'Facial',
      image:
        'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=500&h=300&fit=crop',
      premium: true,
    },
    {
      id: 4,
      name: 'Hot Stone Therapy',
      description: 'Therapeutic massage with heated volcanic stones',
      discount: '50% OFF',
      pointsRequired: 15000,
      unlocked: false,
      benefits: ['Deep Muscle Relief', 'Stress Reduction', 'Energy Balance'],
      duration: '120 min',
      category: 'Massage',
      image:
        'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=500&h=300&fit=crop',
      premium: true,
      popular: true,
    },
    {
      id: 5,
      name: 'Express Brow & Lash Treatment',
      description: 'Quick beauty enhancement for eyes',
      discount: '20% OFF',
      pointsRequired: 2500,
      unlocked: true,
      benefits: ['Brow Shaping', 'Lash Tinting', 'Quick Service'],
      duration: '30 min',
      category: 'Beauty',
      image:
        'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=500&h=300&fit=crop',
    },
    {
      id: 6,
      name: 'Detoxifying Body Wrap',
      description: 'Full body detox and skin tightening treatment',
      discount: '35% OFF',
      pointsRequired: 20000,
      unlocked: false,
      benefits: ['Detoxification', 'Skin Tightening', 'Cellulite Reduction'],
      duration: '75 min',
      category: 'Body',
      image:
        'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?w=500&h=300&fit=crop',
      premium: true,
    },
    {
      id: 7,
      name: 'Aromatherapy Massage',
      description: 'Relaxing massage with essential oils',
      discount: '25% OFF',
      pointsRequired: 4000,
      unlocked: true,
      benefits: ['Aromatherapy', 'Stress Relief', 'Mood Enhancement'],
      duration: '60 min',
      category: 'Massage',
      image:
        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500&h=300&fit=crop',
      popular: true,
    },
    {
      id: 8,
      name: 'Microdermabrasion Facial',
      description: 'Exfoliating treatment for smooth, radiant skin',
      discount: '30% OFF',
      pointsRequired: 6000,
      unlocked: true,
      benefits: ['Exfoliation', 'Smooth Skin', 'Pore Minimizing'],
      duration: '50 min',
      category: 'Facial',
      image:
        'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=500&h=300&fit=crop',
    },
  ]

  const filteredServices = services.filter((service) => {
    const matchesSearch =
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description.toLowerCase().includes(searchTerm.toLowerCase())

    switch (activeFilter) {
      case 'Available':
        return matchesSearch && service.unlocked
      case 'Premium':
        return matchesSearch && service.premium
      case 'Popular':
        return matchesSearch && service.popular
      case 'Facial':
      case 'Massage':
      case 'Body':
      case 'Beauty':
        return matchesSearch && service.category === activeFilter
      default:
        return matchesSearch
    }
  })

  const handleBook = (service) => {
    alert(`Redeeming ${service.name}! This would navigate to booking page.`)
  }

  return (
    <Layout>
      <div className='min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50'>
        <div className='px-4 py-6'>
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className='text-center mb-6'
          >
            <div className='flex items-center justify-center mb-4'>
              <div className='bg-gradient-to-r from-pink-500 to-purple-500 p-3 rounded-xl mr-3 shadow-lg'>
                <Award className='w-6 h-6 text-white' />
              </div>
              <h1 className='text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent'>
                Rewards Center
              </h1>
            </div>
            <p className='text-gray-600 text-base px-4'>
              Redeem your points for exclusive spa services
            </p>
          </motion.div>

          {/* Points Display */}
          <PointsDisplay userPoints={userPoints} />

          {/* Filters */}
          <FilterSection
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />

          {/* Services Grid - Fixed height cards */}
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 auto-rows-fr'>
            <AnimatePresence>
              {filteredServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  userPoints={userPoints}
                  onBook={handleBook}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Empty State */}
          {filteredServices.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className='text-center py-12'
            >
              <div className='text-6xl mb-4'>🔍</div>
              <h3 className='text-xl font-bold text-gray-800 mb-3'>
                No services found
              </h3>
              <p className='text-gray-600 text-base'>
                Try adjusting your search or filters
              </p>
            </motion.div>
          )}

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className='bg-gradient-to-r from-pink-500 to-purple-500 rounded-2xl p-6 text-center text-white mt-8 shadow-lg'
          >
            <Zap className='w-10 h-10 mx-auto mb-4' />
            <h3 className='text-xl font-bold mb-3'>Need More Points?</h3>
            <p className='text-pink-100 mb-5 text-base'>
              Book your next appointment and earn more points!
            </p>
            <button className='bg-white text-pink-600 px-8 py-3 rounded-xl font-semibold hover:bg-pink-50 transition-all text-base shadow-md'>
              Book Appointment
            </button>
          </motion.div>
        </div>
      </div>
    </Layout>
  )
}

export default SpaRewardsPage
