// client/src/pages/Bookings/ServiceCatalogPage.jsx
import {
  useActiveServices,
  useCategories,
  useDiscountedServices,
} from '@/hooks/useServices'
import { Clock, DollarSign, Percent, Search, Star } from 'lucide-react'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../Layout/Layout'

// Service Card Component - now using real data
const ServiceCard = ({ service, onSelect }) => {
  const calculateDiscountedPrice = (price) => {
    if (service.discount.active) {
      return price - (price * service.discount.percentage) / 100
    }
    return price
  }

  const isDiscountActive =
    service.discount.active &&
    new Date() >= new Date(service.discount.startDate || Date.now()) &&
    new Date() <= new Date(service.discount.endDate || Date.now())

  return (
    <div
      onClick={() => onSelect(service)}
      className='bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-all cursor-pointer group'
    >
      <div className='relative h-48 overflow-hidden'>
        <img
          src={
            service.image ||
            'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=500&h=300&fit=crop'
          }
          alt={service.name}
          className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
        />

        {/* Category Badge */}
        <div className='absolute top-3 left-3'>
          <span className='bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-bold'>
            {service.categoryId?.name || service.categoryName || 'Service'}
          </span>
        </div>

        {/* Discount Badge */}
        {isDiscountActive && (
          <div className='absolute top-3 right-3'>
            <span className='bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1'>
              <Percent className='w-3 h-3' />
              {service.discount.percentage}% OFF
            </span>
          </div>
        )}

        {/* Status Badge */}
        <div className='absolute bottom-3 left-3'>
          <span
            className={`px-2 py-1 rounded-full text-xs font-bold ${
              service.status === 'active'
                ? 'bg-green-500 text-white'
                : 'bg-gray-500 text-white'
            }`}
          >
            {service.status}
          </span>
        </div>
      </div>

      <div className='p-4 md:p-6'>
        <h3 className='text-lg md:text-xl font-bold text-gray-900 mb-2'>
          {service.name}
        </h3>

        <p className='text-gray-600 text-sm mb-4 line-clamp-2'>
          {service.description}
        </p>

        {/* Service stats */}
        <div className='grid grid-cols-2 gap-3 mb-4'>
          <div className='bg-green-50 p-3 rounded-lg'>
            <div className='flex items-center gap-2 mb-1'>
              <DollarSign className='w-4 h-4 text-green-600' />
              <span className='text-xs font-semibold text-green-700'>From</span>
            </div>
            <div>
              {isDiscountActive ? (
                <div className='flex flex-col'>
                  <span className='text-lg font-bold text-green-700'>
                    ${calculateDiscountedPrice(service.basePrice)}
                  </span>
                  <span className='text-xs text-gray-500 line-through'>
                    ${service.basePrice}
                  </span>
                </div>
              ) : (
                <span className='text-lg font-bold text-green-700'>
                  ${service.basePrice}
                </span>
              )}
            </div>
          </div>

          <div className='bg-blue-50 p-3 rounded-lg'>
            <div className='flex items-center gap-2 mb-1'>
              <Clock className='w-4 h-4 text-blue-600' />
              <span className='text-xs font-semibold text-blue-700'>
                Duration
              </span>
            </div>
            <span className='text-lg font-bold text-blue-700'>
              {service.duration}min
            </span>
          </div>
        </div>

        {/* Bottom info */}
        <div className='flex items-center justify-between pt-4 border-t border-gray-100'>
          <span className='text-sm text-gray-600'>
            Daily limit: {service.limit}
          </span>
          <span className='text-sm text-gray-600'>
            {service.subTreatments?.length || 0} options
          </span>
        </div>
      </div>
    </div>
  )
}

// Main Service Catalog Component
const ServiceCatalog = ({ onServiceSelect }) => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [sortBy, setSortBy] = useState('name')

  // API calls using React Query hooks
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useCategories(false)

  const {
    services,
    stats,
    pagination,
    isLoading: servicesLoading,
    error: servicesError,
  } = useActiveServices({
    search: searchTerm,
    category: selectedCategory,
    sortBy: sortBy,
  })

  const { services: discountedServices = [], isLoading: discountsLoading } =
    useDiscountedServices()

  // Loading state
  if (servicesLoading || categoriesLoading) {
    return (
      <Layout>
        <div className='flex items-center justify-center min-h-[50vh]'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
          <span className='ml-3 text-lg'>Loading services...</span>
        </div>
      </Layout>
    )
  }

  // Error state
  if (servicesError || categoriesError) {
    return (
      <Layout>
        <div className='flex items-center justify-center min-h-[50vh]'>
          <div className='text-center'>
            <div className='text-red-500 text-xl mb-2'>⚠️</div>
            <h3 className='text-lg font-semibold text-gray-900 mb-2'>
              Error loading services
            </h3>
            <p className='text-gray-600'>
              {servicesError?.message ||
                categoriesError?.message ||
                'Please try again later'}
            </p>
          </div>
        </div>
      </Layout>
    )
  }

  const filteredServices = services || []

  return (
    <Layout>
      <div className='px-3 py-4 md:px-4 md:py-6 max-w-7xl mx-auto'>
        {/* Mobile-Responsive Header */}
        <div className='bg-white rounded-lg p-4 md:p-6 shadow-sm mb-6'>
          <div className='text-center mb-4 md:mb-6'>
            <h1 className='text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2'>
              Our Services
            </h1>
            <p className='text-sm md:text-base text-gray-600 max-w-2xl mx-auto'>
              Discover our comprehensive range of beauty and wellness
              treatments. Book your appointment today and experience
              professional care.
            </p>
          </div>

          {/* Mobile-Responsive Search and Filters */}
          <div className='space-y-3 md:space-y-0 md:flex md:gap-4'>
            {/* Search */}
            <div className='relative md:flex-1'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5' />
              <input
                type='text'
                placeholder='Search services...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='w-full pl-10 md:pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base'
              />
            </div>

            {/* Filters */}
            <div className='flex gap-2 md:gap-3'>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className='flex-1 md:flex-none px-3 md:px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base'
                disabled={categoriesLoading}
              >
                <option value=''>All Categories</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className='flex-1 md:flex-none px-3 md:px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base'
              >
                <option value='name'>A-Z</option>
                <option value='price-low'>Price: Low to High</option>
                <option value='price-high'>Price: High to Low</option>
                <option value='duration'>Duration</option>
                <option value='rating'>Rating</option>
                <option value='bookings'>Popularity</option>
              </select>
            </div>
          </div>
        </div>

        {/* Special Offers Section */}
        {searchTerm === '' &&
          selectedCategory === '' &&
          !discountsLoading &&
          discountedServices.length > 0 && (
            <div className='mb-6 md:mb-8'>
              <div className='flex items-center gap-2 mb-4'>
                <Percent className='w-4 h-4 md:w-5 md:h-5 text-red-500' />
                <h2 className='text-xl md:text-2xl font-bold text-gray-900'>
                  Special Offers
                </h2>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6'>
                {discountedServices.slice(0, 3).map((service) => (
                  <ServiceCard
                    key={service._id}
                    service={service}
                    onSelect={onServiceSelect}
                  />
                ))}
              </div>
            </div>
          )}

        {/* All Services */}
        <div className='mb-4 md:mb-6'>
          <h2 className='text-xl md:text-2xl font-bold text-gray-900 mb-4'>
            {searchTerm || selectedCategory ? 'Search Results' : 'All Services'}
            <span className='text-base md:text-lg font-normal text-gray-600 ml-2'>
              ({filteredServices.length}{' '}
              {filteredServices.length === 1 ? 'service' : 'services'})
            </span>
          </h2>
        </div>

        {filteredServices.length > 0 ? (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6'>
            {filteredServices.map((service) => (
              <ServiceCard
                key={service._id}
                service={service}
                onSelect={onServiceSelect}
              />
            ))}
          </div>
        ) : (
          <div className='text-center py-12 md:py-16 bg-white rounded-lg shadow-sm'>
            <div className='text-4xl md:text-6xl mb-4'>🔍</div>
            <h3 className='text-xl md:text-2xl font-bold text-gray-800 mb-3'>
              No services found
            </h3>
            <p className='text-gray-600 mb-6 px-4'>
              {searchTerm || selectedCategory
                ? 'Try adjusting your search terms or filters.'
                : 'No services are currently available.'}
            </p>
            <button
              onClick={() => {
                setSearchTerm('')
                setSelectedCategory('')
              }}
              className='bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700'
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Bottom CTA */}
        <div className='mt-8 md:mt-12 bg-blue-50 rounded-lg p-6 md:p-8 text-center'>
          <h3 className='text-xl md:text-2xl font-bold text-gray-900 mb-3'>
            Can't find what you're looking for?
          </h3>
          <p className='text-gray-600 mb-6 text-sm md:text-base'>
            Contact our team for personalized treatment recommendations.
          </p>
          <button className='bg-blue-600 text-white px-6 md:px-8 py-3 rounded-lg font-semibold hover:bg-blue-700'>
            Contact Us
          </button>
        </div>
      </div>
    </Layout>
  )
}

// Main component that handles navigation
const ServiceCatalogPage = () => {
  const navigate = useNavigate()

  const handleServiceSelect = (service) => {
    navigate(`/bookings/${service._id}`)
  }

  return <ServiceCatalog onServiceSelect={handleServiceSelect} />
}

export default ServiceCatalogPage
